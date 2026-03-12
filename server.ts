import 'dotenv/config';
import express from 'express';
import { db } from './server/db.js';
import { SolarCalculator, DEFAULT_LOSSES, computeLossFactor, calculateTempDerating, type SystemType, convertAmperageToLoad } from './server/solar_engine.js';
import { AmperCalculator, type ABPESettings } from './server/amper_engine.js';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { configureSecurity, amperQuoteLimiter } from './server/middleware/security.js';
import { requireAuth, requireRole } from './server/middleware/auth.js';
import { validateSchema } from './server/middleware/validation.js';
import { errorHandler } from './server/middleware/errorHandler.js';
import {
  QuoteRequestSchema, GlobalSettingsSchema, ComponentSchema, LoginRequestSchema,
  MaintenanceLogSchema, AIChatSchema, AIKnowledgeSourceSchema, AISettingsSchema,
  ClientSchema, CableLossSchema, ROISchema, WorkspaceCalculateRequestSchema
} from './server/schemas/apiSchemas.js';
import { auditLogger } from './server/services/auditLogger.js';
import { authService } from './server/services/authService.js';
import {
  createQuote, createQuoteFromABPE, getQuotes, getQuoteById, deleteQuote,
  convertQuoteToProject, expireQuote, updateQuoteStatus, getCostComponents, updateCostComponent
} from './server/services/quoteService.js';

import {
  getPricingSettings, getExchangeRate, getDefaultMargin, enrichProductsWithPricing,
  calculateSellPrice, calculateQuoteTotal,
  getPricingTiers, upsertPricingTier, deletePricingTier,
  getClientPricingOverrides, upsertClientPricingOverride, deleteClientPricingOverride
} from './server/services/pricingEngine.js';
import { AIService, PERSONAS, embeddingCache } from './server/services/aiService.js';
import { WorkspaceService } from './server/services/workspaceService.js';
import { v4 as uuidv4 } from 'uuid';

const app = express();
configureSecurity(app);
app.use(cookieParser());

// P1.4: Request logging — structured format for production, dev-friendly for local
app.use(morgan(process.env.NODE_ENV === 'production'
  ? ':remote-addr :method :url :status :res[content-length] - :response-time ms'
  : 'dev'
));
// express.json() is already configured in security middleware with size limit

const calculator = new SolarCalculator();
const amperCalculator = new AmperCalculator();

// ── Trust proxy for rate-limiting behind reverse proxy ──
app.set('trust proxy', 1);

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATION ENDPOINTS (public — no requireAuth)
// ═══════════════════════════════════════════════════════════════

app.post('/api/auth/login', validateSchema(LoginRequestSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await authService.comparePassword(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken = authService.generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = await authService.rotateRefreshToken(user.id);

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken, userId } = req.body;
    if (!refreshToken || !userId) {
      return res.status(400).json({ error: 'refreshToken and userId are required' });
    }

    const valid = await authService.verifyRefreshToken(userId, refreshToken);
    if (!valid) return res.status(401).json({ error: 'Invalid or expired refresh token' });

    const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId) as any;
    if (!user) return res.status(401).json({ error: 'User not found' });

    const newAccessToken = authService.generateAccessToken({ id: user.id, role: user.role });
    const newRefreshToken = await authService.rotateRefreshToken(userId);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  try {
    await authService.invalidateRefreshToken((req as any).user.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Apply authentication to all /api/* routes below this point ──
// Public endpoints (regions, appliances, components, products, calculate-recommendation)
// are declared ABOVE this middleware. Everything below requires auth.



app.get('/api/regions', (req, res) => {
  try {
    const regions = db.prepare('SELECT * FROM regions ORDER BY name').all();
    res.json(regions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/appliances', (req, res) => {
  try {
    const appliances = db.prepare('SELECT * FROM appliances ORDER BY name').all();
    res.json(appliances);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/components', (req, res) => {
  try {
    const components = db.prepare('SELECT * FROM components').all();
    res.json(components);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects', requireAuth, (req, res) => {
  try {
    const projects = db.prepare('SELECT * FROM projects').all();
    res.json(projects);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

  app.post('/api/calculate-recommendation', requireAuth, (req, res) => {
  try {
    const { appliances, region, systemType, gridHoursOff, advancedSettings, systemVoltage = 48 } = req.body;

    // Parse loads — ensure usage_period is set
    const loads = (appliances || []).map((a: any) => ({
      ...a,
      qty: a.qty || 1,
      surge_factor: a.surge_factor || 1,
      usage_period: a.usage_period || 'both'
    }));

    const dod = advancedSettings?.dod || 0.8;
    const efficiency = advancedSettings?.efficiency || 0.95;
    const temp_correction = advancedSettings?.temp_correction || 1.1;
    const future_expansion = advancedSettings?.future_expansion || 1.2;
    const sun_hours = region?.sun_hours || 5.0;
    
    // Map systemType to engine system_type and gridHoursOff to autonomy_hours
    // ABPE uses strings: 'off_grid', 'hybrid', 'solar_direct'
    let engine_system_type: import('./server/solar_engine').SystemType = 'OFF_GRID';
    if (systemType === 'hybrid') engine_system_type = 'HYBRID';
    if (systemType === 'solar_direct') engine_system_type = 'ON_GRID';
    if (systemType === 'OFF_GRID' || systemType === 'HYBRID' || systemType === 'ON_GRID') {
      engine_system_type = systemType;
    }

    const autonomy_hr = gridHoursOff !== undefined ? Number(gridHoursOff) : 12;

    // Build engine config
    const config: import('./server/solar_engine').SolarEngineConfig = {
      system_type: engine_system_type,
      system_voltage: systemVoltage,
      sun_hours,
      autonomy_hours: autonomy_hr,
      dod,
      battery_efficiency: efficiency,
      temp_correction,
      future_expansion,
      losses: advancedSettings?.losses || DEFAULT_LOSSES
    };

    // Run full system calculation
    const result = calculator.calculateFullSystem(loads, config);
    const { load_profile: eng, battery: batCalc, solar: solarCalc } = result;

    // Get Components to recommend
    const panels = db.prepare("SELECT * FROM components WHERE category = 'panel' ORDER BY cost_price ASC").all() as any[];
    const batteries = db.prepare("SELECT * FROM components WHERE category = 'battery' AND COALESCE(json_extract(spec, '$.V'), json_extract(spec, '$.v')) = ? ORDER BY cost_price ASC").all(systemVoltage) as any[];
    if (batteries.length === 0) {
      batteries.push(...(db.prepare("SELECT * FROM components WHERE category = 'battery' ORDER BY cost_price ASC").all() as any[]));
    }
    const inverters = db.prepare("SELECT * FROM components WHERE category = 'inverter' AND COALESCE(json_extract(spec, '$.W'), json_extract(spec, '$.w'), 0) >= ? ORDER BY cost_price ASC").all(eng.peak_surge_w) as any[];

    // Select best matches
    const selectedPanel = panels[0] || { model: 'Generic Panel 550W', cost_price: 110, spec: '{"w": 550}' };
    const selectedBattery = batteries[0] || { model: 'Generic Battery 200Ah', cost_price: 800, spec: '{"Ah": 200, "V": 48}', battery_chemistry: 'LEAD_ACID' };
    const selectedInverter = inverters[0] || { model: 'Generic Inverter 5kW', cost_price: 400, spec: '{"W": 5000}' };

    // Calculate quantities
    const panelW = JSON.parse(selectedPanel.spec || '{}').w || JSON.parse(selectedPanel.spec || '{}').W || 550;
    const batAh = JSON.parse(selectedBattery.spec || '{}').Ah || 200;
    const batV = JSON.parse(selectedBattery.spec || '{}').V || 48;

    const panelCount = Math.ceil(solarCalc.required_power_w / panelW);
    
    // 1) Battery Bank Correctness Check
    const batteryBank = batCalc.needed 
      ? calculator.calculateBatteryBank(batCalc.required_energy_wh, batAh, batV, systemVoltage)
      : { batteries_per_string: 0, parallel_strings: 0, total_battery_count: 0, total_nominal_capacity_ah: 0, total_usable_capacity_wh: 0, warnings: [] };
    const batteryCount = batteryBank.total_battery_count;

    // 2) Energy Balance & Recharge Feasibility Check
    const systemBalance = calculator.calculateSystemBalance(
      panelCount * panelW, 
      sun_hours, 
      computeLossFactor(config.losses), 
      eng.day_wh, 
      batteryCount * (batAh * batV) * config.dod, 
      engine_system_type
    );

    // 3) Collect all warnings
    const allWarnings = [
      ...(result.warnings || []),
      ...batteryBank.warnings,
      ...systemBalance.warnings
    ];

    // Calculate alternatives for batteries using the exact engine logic
    const alternativeBatteries = batteries.map(b => {
      const bAh = JSON.parse(b.spec || '{}').Ah || 200;
      const bV = JSON.parse(b.spec || '{}').V || 48;
      const bBank = batCalc.needed ? calculator.calculateBatteryBank(batCalc.required_energy_wh, bAh, bV, systemVoltage) : { total_battery_count: 0 };
      const bCount = bBank.total_battery_count;
      return {
        item: b,
        count: bCount,
        total_cost: bCount * (b.cost_price || 0),
        total_sale: bCount * (b.sale_price || b.cost_price || 0)
      };
    });

    // ── Detailed Pricing Breakdown ──
    const rate = getExchangeRate();
    const defaultMargin = getDefaultMargin();
    const marginMultiplier = 1 + (defaultMargin / 100);

    const pPanelCost = selectedPanel.cost_price || 0;
    const pPanelSale = selectedPanel.sale_price || Math.round(pPanelCost * marginMultiplier);
    const pBatCost = selectedBattery.cost_price || 0;
    const pBatSale = selectedBattery.sale_price || Math.round(pBatCost * marginMultiplier);
    const pInvCost = selectedInverter.cost_price || 0;
    const pInvSale = selectedInverter.sale_price || Math.round(pInvCost * marginMultiplier);

    const panels_cost = panelCount * pPanelSale;
    const batteries_cost = batteryCount * pBatSale;
    const inverter_cost_total = pInvSale;
    const accessories_cost = 0;
    const installation_cost = 0;
    const subtotal_items_cost = panels_cost + batteries_cost + inverter_cost_total + accessories_cost + installation_cost;

    const material_cost_total = (panelCount * pPanelCost) + (batteryCount * pBatCost) + pInvCost;
    const sale_price_usd = subtotal_items_cost;
    const sale_price_iqd = Math.round(sale_price_usd * rate);

    // ── Payment Options ──
    const cash_discount_percent = 3;
    const cash_total_usd = Math.round(sale_price_usd * (1 - cash_discount_percent / 100));
    const cash_total_iqd = Math.round(cash_total_usd * rate);

    const installment_months = 12;
    const down_payment_percent = 30;
    const admin_fee_percent = 5;
    const interest_percent = 0;
    const down_payment_usd = Math.round(sale_price_usd * (down_payment_percent / 100));
    const down_payment_iqd = Math.round(down_payment_usd * rate);
    const financed_amount_usd = sale_price_usd - down_payment_usd;
    const financed_amount_iqd = Math.round(financed_amount_usd * rate);
    const admin_fee_iqd = Math.round(financed_amount_iqd * (admin_fee_percent / 100));
    const total_financed_iqd = financed_amount_iqd + admin_fee_iqd;
    const monthly_payment_iqd = Math.round(total_financed_iqd / installment_months);
    const installment_total_iqd = down_payment_iqd + total_financed_iqd;

    const recommendation = {
      engineering: {
        total_wh: eng.total_wh,
        day_wh: eng.day_wh,
        night_wh: eng.night_wh,
        loss_factor: eng.loss_factor,
        total_wh_after_losses: eng.total_wh_after_losses,
        peak_continuous_w: eng.peak_continuous_w,
        peak_surge_w: eng.peak_surge_w,
        required_ah: batCalc.required_ah,
        required_panel_w: solarCalc.required_power_w,
        system_voltage: systemVoltage,
        system_type: engine_system_type,
        autonomy_hours: autonomy_hr,
        safety_margin: advancedSettings?.safety_margin || 1.25,
        dod,
        efficiency,
        temp_correction,
        future_expansion,
        warnings: allWarnings,
        battery_bank: batteryBank,
        system_balance: {
          solar_generation_wh: systemBalance.daily_solar_harvest_wh,
          load_demand_wh: eng.total_wh,
          battery_storage_wh: batteryBank.total_usable_capacity_wh,
          solar_coverage_percent: eng.total_wh > 0 ? Math.min(100, Math.round((systemBalance.daily_solar_harvest_wh / eng.total_wh) * 100)) : 100,
          recharge_feasibility: systemBalance.is_feasible,
          recharge_time_days: systemBalance.recharge_time_days,
          warnings: systemBalance.warnings
        }
      },
      recommendation: {
        material_cost: material_cost_total,
        sale_price: sale_price_usd,
        panels: { count: panelCount, item: selectedPanel },
        batteries: { count: batteryCount, item: selectedBattery, needed: batCalc.needed, alternatives: alternativeBatteries },
        inverter: { item: selectedInverter }
      },
      pricing: {
        panels_cost,
        batteries_cost,
        inverter_cost: inverter_cost_total,
        accessories_cost,
        installation_cost,
        subtotal_items_cost,
        material_cost_usd: material_cost_total,
        exchange_rate: rate,
        default_margin: defaultMargin,
        sale_price_usd,
        sale_price_iqd
      },
      payment_options: {
        cash: {
          cash_discount_percent,
          final_total_usd: cash_total_usd,
          final_total_iqd: cash_total_iqd
        },
        installments: {
          enabled: true,
          months: installment_months,
          down_payment_percent,
          down_payment_usd,
          down_payment_iqd,
          financed_amount_iqd,
          admin_fee_percent,
          admin_fee_iqd,
          interest_percent,
          monthly_payment_iqd,
          final_total_iqd: installment_total_iqd
        }
      }
    };

    res.json(recommendation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/global-settings', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const rows = db.prepare('SELECT key_name, value_json FROM global_settings').all() as any[];
    const settings: any = {};
    rows.forEach(r => { settings[r.key_name] = JSON.parse(r.value_json); });
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════════════════════════════════
app.get('/api/dashboard/stats', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    // Counts
    const projectCount = (db.prepare('SELECT COUNT(*) as c FROM projects').get() as any).c;
    const quoteCount = (db.prepare('SELECT COUNT(*) as c FROM quotes').get() as any).c;
    const clientCount = (db.prepare('SELECT COUNT(*) as c FROM clients').get() as any).c;
    const componentCount = (db.prepare('SELECT COUNT(*) as c FROM components').get() as any).c;

    // Financial KPIs from quotes
    const financial = db.prepare(`
      SELECT 
        COALESCE(SUM(total_selling_price), 0) as total_revenue,
        COALESCE(SUM(total_material_cost), 0) as total_cost,
        COALESCE(SUM(total_profit), 0) as total_profit,
        COUNT(*) as quote_count,
        COALESCE(AVG(CASE WHEN total_material_cost > 0 THEN (total_profit * 100.0 / total_material_cost) END), 0) as avg_margin_pct
      FROM quotes
    `).get() as any;

    // Quotes by status
    const quotesByStatus = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM quotes GROUP BY status
    `).all();

    // Recent quotes (last 5)
    const recentQuotes = db.prepare(`
      SELECT id, quote_number, customer_name, total_selling_price, total_profit, status, created_at
      FROM quotes ORDER BY created_at DESC LIMIT 5
    `).all();

    // Recent clients (last 5)
    const recentClients = db.prepare(`
      SELECT c.id, c.name, c.phone, c.city, c.created_at,
        (SELECT COUNT(*) FROM quotes WHERE client_id = c.id) as quotes_count
      FROM clients c ORDER BY c.created_at DESC LIMIT 5
    `).all();

    // Monthly revenue trend (last 6 months)
    const monthlyRevenue = db.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        SUM(total_selling_price) as revenue,
        SUM(total_profit) as profit,
        COUNT(*) as count
      FROM quotes 
      WHERE created_at >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month ASC
    `).all();

    // Exchange rate
    const exchangeRate = getExchangeRate();
    const defaultMargin = getDefaultMargin();

    res.json({
      counts: { projects: projectCount, quotes: quoteCount, clients: clientCount, components: componentCount },
      financial: {
        total_revenue: financial.total_revenue,
        total_cost: financial.total_cost,
        total_profit: financial.total_profit,
        avg_margin_pct: Math.round(financial.avg_margin_pct * 10) / 10,
        exchange_rate: exchangeRate,
        default_margin: defaultMargin
      },
      quotesByStatus,
      recentQuotes,
      recentClients,
      monthlyRevenue
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/global-settings', requireAuth, requireRole(['admin']), validateSchema(GlobalSettingsSchema), (req, res) => {
  try {
    const stmt = db.prepare('UPDATE global_settings SET value_json = ? WHERE key_name = ?');
    const insertStmt = db.prepare('INSERT OR IGNORE INTO global_settings (id, key_name, value_json) VALUES (?, ?, ?)');

    // Get old settings for audit
    const oldSettingsRows = db.prepare('SELECT key_name, value_json FROM global_settings').all() as any[];
    const oldSettings: any = {};
    oldSettingsRows.forEach(r => { oldSettings[r.key_name] = JSON.parse(r.value_json); });

    for (const [key, val] of Object.entries(req.body)) {
      const jsonVal = JSON.stringify(val);
      const result = stmt.run(jsonVal, key);
      if (result.changes === 0) {
        insertStmt.run(require('uuid').v4(), key, jsonVal);
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Dynamic Pricing API ─────────────────────────────────────

// Get current pricing settings
app.get('/api/settings/pricing', requireAuth, (req, res) => {
  try {
    const settings = getPricingSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update exchange rate
app.patch('/api/settings/exchange-rate', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const { rate } = req.body;
    if (!rate || typeof rate !== 'number' || rate <= 0) {
      return res.status(400).json({ error: 'Invalid exchange rate. Must be a positive number.' });
    }

    const oldRate = getExchangeRate();

    // Update setting
    db.prepare("UPDATE global_settings SET value_json = ? WHERE key_name = 'usd_to_iqd'").run(JSON.stringify(rate));

    // Log history
    db.prepare('INSERT INTO exchange_rate_history (id, rate, changed_by) VALUES (?, ?, ?)').run(
      crypto.randomUUID(), rate, 'admin'
    );

    // Audit log
    const user = (req as any).user;
    auditLogger.log(
      user?.id || 'admin', 'EXCHANGE_RATE_UPDATE', 'exchange_rate',
      { rate: oldRate }, { rate },
      req.ip, req.headers['user-agent'] || null
    );

    res.json({ success: true, old_rate: oldRate, new_rate: rate });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update default margin
app.patch('/api/settings/default-margin', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const { margin_percent } = req.body;
    if (margin_percent === undefined || typeof margin_percent !== 'number' || margin_percent < 0) {
      return res.status(400).json({ error: 'Invalid margin. Must be a non-negative number.' });
    }

    const oldMargin = getDefaultMargin();
    db.prepare("UPDATE global_settings SET value_json = ? WHERE key_name = 'default_margin_percent'").run(
      JSON.stringify(margin_percent)
    );

    // Audit log
    const user = (req as any).user;
    auditLogger.log(
      user?.id || 'admin', 'DEFAULT_MARGIN_UPDATE', 'settings',
      { margin_percent: oldMargin }, { margin_percent },
      req.ip, req.headers['user-agent'] || null
    );

    res.json({ success: true, margin_percent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Exchange rate history
app.get('/api/settings/exchange-rate-history', requireAuth, (req, res) => {
  try {
    const history = db.prepare('SELECT * FROM exchange_rate_history ORDER BY created_at DESC LIMIT 50').all();
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Products with dynamic pricing
app.get('/api/products', requireAuth, (req, res) => {
  try {
    const category = req.query.category as string;
    let query = 'SELECT * FROM components WHERE is_active = 1';
    const params: any[] = [];
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    query += ' ORDER BY category, brand, model';
    const components = params.length > 0 ? db.prepare(query).all(...params) : db.prepare(query).all();

    // Parse specs and enrich with computed pricing
    const enriched = enrichProductsWithPricing(components.map((c: any) => ({
      ...c,
      spec: typeof c.spec === 'string' ? JSON.parse(c.spec || '{}') : c.spec
    })));

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper Function for Generating a Quote
function generateQuoteHelper(requestedAmps: number, abpeSettings: any, regionSunHours: number, overrideVoltage?: number) {
  const eng = amperCalculator.calculateProfile(requestedAmps, abpeSettings);

  // Use override voltage, or determine from load (>3kW→48V, >1kW→24V, else 12V)
  const systemVoltage = overrideVoltage || (eng.peak_continuous_w > 3000 ? 48 : eng.peak_continuous_w > 1000 ? 24 : 12);
  const systemType: SystemType = abpeSettings.system_type || 'OFF_GRID';

  // Use new engine API with system type awareness
  const batCalc = amperCalculator.calculateBattery(
    eng, systemVoltage, abpeSettings.abpe_dod, abpeSettings.abpe_eff, systemType
  );
  const solarCalc = amperCalculator.calculateSolar(
    eng, regionSunHours, abpeSettings.abpe_eff
  );

  // Component selection from DB
  const panels = db.prepare("SELECT * FROM components WHERE category = 'panel' ORDER BY cost_price ASC").all() as any[];
  const batteries = db.prepare("SELECT * FROM components WHERE category = 'battery' AND COALESCE(json_extract(spec, '$.V'), json_extract(spec, '$.v')) = ? ORDER BY cost_price ASC").all(systemVoltage) as any[];
  const inverters = db.prepare("SELECT * FROM components WHERE category = 'inverter' AND COALESCE(json_extract(spec, '$.W'), json_extract(spec, '$.w'), 0) >= ? ORDER BY cost_price ASC").all(eng.peak_surge_w) as any[];

  // Fallbacks
  const selectedPanel = panels.length > 0 ? panels[0] : { model: 'Generic Panel 550W', cost_price: 110, spec: '{"w": 550}', currency: 'USD' };
  const selectedBattery = batteries.length > 0 ? batteries[0] : { model: 'Generic Battery 200Ah', cost_price: 800, spec: '{"Ah": 200, "V": 48}', currency: 'USD' };
  const selectedInverter = inverters.length > 0 ? inverters[0] : { model: 'Generic Inverter 5kW', cost_price: 400, spec: '{"W": 5000}', currency: 'USD' };

  const parsedPanel = typeof selectedPanel.spec === 'string' ? JSON.parse(selectedPanel.spec) : selectedPanel.spec || {};
  const parsedBat = typeof selectedBattery.spec === 'string' ? JSON.parse(selectedBattery.spec) : selectedBattery.spec || {};

  const panelW = parsedPanel.w || parsedPanel.W || 550;
  const batAh = parsedBat.Ah || parsedBat.ah || 200;
  const batV = parsedBat.V || parsedBat.v || 48;

  const panelCount = Math.ceil(solarCalc.required_power_w / panelW);
  const singleBatWh = batAh * batV;
  const batteryCount = batCalc.needed ? Math.ceil(batCalc.required_energy_wh / singleBatWh) : 0;

  // Dynamic pricing via pricingEngine
  const rate = getExchangeRate();
  const defaultMargin = getDefaultMargin();

  const pricePanel = calculateSellPrice(
    { id: selectedPanel.id || 'panel', cost_price: selectedPanel.cost_price, currency: selectedPanel.currency || 'USD', margin_percent: selectedPanel.margin_percent ?? null },
    rate, defaultMargin
  );
  const priceBat = calculateSellPrice(
    { id: selectedBattery.id || 'battery', cost_price: selectedBattery.cost_price, currency: selectedBattery.currency || 'USD', margin_percent: selectedBattery.margin_percent ?? null },
    rate, defaultMargin
  );
  const priceInv = calculateSellPrice(
    { id: selectedInverter.id || 'inverter', cost_price: selectedInverter.cost_price, currency: selectedInverter.currency || 'USD', margin_percent: selectedInverter.margin_percent ?? null },
    rate, defaultMargin
  );

  const total_cost_iqd = (panelCount * pricePanel.cost_price_iqd) + (batteryCount * priceBat.cost_price_iqd) + priceInv.cost_price_iqd;
  const total_sell_iqd = (panelCount * pricePanel.sell_price_iqd) + (batteryCount * priceBat.sell_price_iqd) + priceInv.sell_price_iqd;
  const total_profit_iqd = total_sell_iqd - total_cost_iqd;

  // Legacy fields for backward compat
  const pPanel = selectedPanel.purchase_price ?? selectedPanel.cost_price;
  const wPanel = selectedPanel.wholesale_price ?? (pPanel * (abpeSettings.wholesale_margin || 1.15));
  const rPanel = selectedPanel.retail_price ?? selectedPanel.sale_price ?? (pPanel * (abpeSettings.retail_margin || 1.30));
  const pBat = selectedBattery.purchase_price ?? selectedBattery.cost_price;
  const wBat = selectedBattery.wholesale_price ?? (pBat * (abpeSettings.wholesale_margin || 1.15));
  const rBat = selectedBattery.retail_price ?? selectedBattery.sale_price ?? (pBat * (abpeSettings.retail_margin || 1.30));
  const pInv = selectedInverter.purchase_price ?? selectedInverter.cost_price;
  const wInv = selectedInverter.wholesale_price ?? (pInv * (abpeSettings.wholesale_margin || 1.15));
  const rInv = selectedInverter.retail_price ?? selectedInverter.sale_price ?? (pInv * (abpeSettings.retail_margin || 1.30));
  const material_cost = (panelCount * pPanel) + (batteryCount * pBat) + pInv;
  const wholesale_total = (panelCount * wPanel) + (batteryCount * wBat) + wInv;
  const retail_total = (panelCount * rPanel) + (batteryCount * rBat) + rInv;

  return {
    success: true,
    system_type: systemType,
    engineering: {
      ...eng,
      // New fields from enhanced engine
      loss_factor: eng.loss_factor,
      day_wh: eng.day_wh,
      night_wh: eng.night_wh,
      total_wh_after_losses: eng.total_wh_after_losses
    },
    requirements: { panelWh: solarCalc.required_power_w, batteryWh: batCalc.required_energy_wh },
    recommendation: {
      panels: { count: panelCount, item: selectedPanel },
      batteries: { count: batteryCount, item: selectedBattery, needed: batCalc.needed },
      inverter: { item: selectedInverter }
    },
    pricing: {
      material_cost,
      wholesale_total,
      retail_total,
      profit: retail_total - material_cost,
      totalCost: material_cost,
      wholesalePrice: wholesale_total,
      retailPrice: retail_total,
      currency: selectedInverter.currency || 'USD',
      // New dynamic pricing (IQD)
      dynamic: {
        exchange_rate: rate,
        total_cost_iqd,
        total_sell_iqd,
        total_profit_iqd,
        panels: { unit_sell_iqd: pricePanel.sell_price_iqd, count: panelCount },
        batteries: { unit_sell_iqd: priceBat.sell_price_iqd, count: batteryCount },
        inverter: { unit_sell_iqd: priceInv.sell_price_iqd, count: 1 }
      }
    },
    settingsRef: abpeSettings
  };
}

function getAbpeSettings() {
  const rows = db.prepare('SELECT key_name, value_json FROM global_settings').all() as any[];
  const settings: any = {};
  rows.forEach(r => { settings[r.key_name] = JSON.parse(r.value_json); });

  return {
    abpe_voltage: settings.abpe_voltage || 220,
    abpe_phase: settings.abpe_phase || 'single',
    abpe_hours: settings.abpe_hours || 3,
    abpe_dod: settings.abpe_dod || 0.8,
    abpe_eff: settings.abpe_eff || 0.95,
    abpe_surge: settings.abpe_surge || 1.2,
    abpe_exp_margin: settings.abpe_exp_margin || 1.2,
    abpe_pf: settings.abpe_pf || 0.8, // Default PF 0.8
    wholesale_margin: settings.wholesale_margin || 1.15,
    retail_margin: settings.retail_margin || 1.30
  };
}

app.post('/api/amper-quote', amperQuoteLimiter, validateSchema(QuoteRequestSchema), (req, res) => {
  res.setHeader('X-Deprecated', 'true');
  res.setHeader('Warning', '299 - "Legacy endpoint: use /api/workspace/calculate instead"');
  try {
    const requestedAmps = req.body.amps;
    if (!requestedAmps) return res.status(400).json({ error: "Missing amps" });

    const abpeSettings: any = getAbpeSettings();
    if (req.body.day_hours !== undefined) {
      abpeSettings.day_hours = req.body.day_hours;
    }
    const regionSunHours = req.body.sun_hours || 5.0;
    const systemVoltage = req.body.system_voltage;

    const result = generateQuoteHelper(requestedAmps, abpeSettings, regionSunHours, systemVoltage);
    res.json(result);

  } catch (err: any) {
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal calculation error' : err.message });
  }
});

app.post('/api/amper-packages', (req, res) => {
  res.setHeader('X-Deprecated', 'true');
  res.setHeader('Warning', '299 - "Legacy endpoint: use /api/workspace/calculate instead"');
  try {
    const abpeSettings: any = getAbpeSettings();
    if (req.body.day_hours !== undefined) {
      abpeSettings.day_hours = req.body.day_hours;
    }
    const regionSunHours = req.body.sun_hours || 5.0;

    // Generate packages from 10A to 60A dynamically
    const ampsList = [10, 20, 30, 40, 50, 60];
    const packages = ampsList.map(amps => {
      const q = generateQuoteHelper(amps, abpeSettings, regionSunHours);
      return { amps, pricing: q.pricing, engineering: q.engineering };
    });

    res.json({ success: true, packages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// NEW ADVANCED WORKSPACE API (Phase 1)
// ═══════════════════════════════════════════════════════════════

app.post('/api/workspace/calculate', amperQuoteLimiter, validateSchema(WorkspaceCalculateRequestSchema), (req, res) => {
  try {
    const data = req.body;
    let loads = data.loads || [];

    // 1. Adapter Layer: If legacy amperage is provided instead of loads, map it.
    if (data.system_type === 'amperage_based' && data.amperage_settings) {
      if (!data.amperage_settings.amps) {
        return res.status(400).json({ error: 'Amperage required for amperage-based calculation' });
      }
      loads = convertAmperageToLoad(
        data.amperage_settings.amps,
        data.system_voltage || 220, // assuming 220v load voltage usually
        data.amperage_settings.day_hours || getAbpeSettings().abpe_hours || 3,
        data.amperage_settings.surge_factor || 1.2
      );
    }

    const dod = data.advanced_settings?.dod || 0.8;
    const efficiency = data.advanced_settings?.efficiency || 0.95;
    const temp_correction = data.advanced_settings?.temp_correction || 1.1;
    const future_expansion = data.advanced_settings?.future_expansion || 1.2;

    const config: import('./server/solar_engine').SolarEngineConfig = {
      system_type: data.system_type === 'amperage_based' ? 'OFF_GRID' : data.system_type,
      system_voltage: data.system_voltage,
      sun_hours: data.sun_hours,
      autonomy_hours: data.advanced_settings?.autonomy_days ? data.advanced_settings.autonomy_days * 24 : 24,
      dod,
      battery_efficiency: efficiency,
      temp_correction,
      future_expansion,
      losses: DEFAULT_LOSSES
    };

    // Calculate baseline system
    const result = calculator.calculateFullSystem(loads, config);
    const { load_profile: eng, battery: batCalc, solar: solarCalc } = result;

    // Component Resolution based on user constraints or automatic selection
    let selectedPanel: any = null;
    let selectedBattery: any = null;
    let selectedInverter: any = null;

    if (data.selected_components) {
      if (data.selected_components.panel_id) {
        selectedPanel = db.prepare("SELECT * FROM components WHERE id = ?").get(data.selected_components.panel_id);
      }
      if (data.selected_components.battery_id) {
        selectedBattery = db.prepare("SELECT * FROM components WHERE id = ?").get(data.selected_components.battery_id);
      }
      if (data.selected_components.inverter_id) {
        selectedInverter = db.prepare("SELECT * FROM components WHERE id = ?").get(data.selected_components.inverter_id);
      }
    }

    if (!selectedPanel) {
      selectedPanel = db.prepare("SELECT * FROM components WHERE category = 'panel' ORDER BY cost_price ASC LIMIT 1").get() as any;
    }
    if (!selectedBattery) {
      const batQ = db.prepare("SELECT * FROM components WHERE category = 'battery' AND COALESCE(json_extract(spec, '$.V'), json_extract(spec, '$.v')) = ? ORDER BY cost_price ASC LIMIT 1").get(data.system_voltage) as any;
      selectedBattery = batQ || db.prepare("SELECT * FROM components WHERE category = 'battery' ORDER BY cost_price ASC LIMIT 1").get() as any;
    }
    if (!selectedInverter) {
      const invQ = db.prepare("SELECT * FROM components WHERE category = 'inverter' AND COALESCE(json_extract(spec, '$.W'), json_extract(spec, '$.w'), 0) >= ? ORDER BY cost_price ASC LIMIT 1").get(eng.peak_surge_w) as any;
      selectedInverter = invQ || db.prepare("SELECT * FROM components WHERE category = 'inverter' ORDER BY cost_price ASC LIMIT 1").get() as any;
    }

    const panelW = JSON.parse(selectedPanel?.spec || '{}').w || JSON.parse(selectedPanel?.spec || '{}').W || 550;
    const batAh = JSON.parse(selectedBattery?.spec || '{}').Ah || 200;
    const batV = JSON.parse(selectedBattery?.spec || '{}').V || data.system_voltage;

    const panelCount = Math.ceil(solarCalc.required_power_w / panelW);

    // ── Unified Battery Bank Calculation (same as calculate-recommendation) ──
    const batteryBank = batCalc.needed
      ? calculator.calculateBatteryBank(batCalc.required_energy_wh, batAh, batV, data.system_voltage)
      : { batteries_per_string: 0, parallel_strings: 0, total_battery_count: 0, total_nominal_capacity_ah: 0, total_usable_capacity_wh: 0, warnings: [] as string[] };
    const batteryCount = batteryBank.total_battery_count;

    // ── System Energy Balance & Recharge Feasibility ──
    const systemBalance = calculator.calculateSystemBalance(
      panelCount * panelW,
      data.sun_hours,
      computeLossFactor(DEFAULT_LOSSES),
      eng.day_wh,
      batteryCount * (batAh * batV) * dod,
      (data.system_type === 'amperage_based' ? 'OFF_GRID' : data.system_type) as import('./server/solar_engine').SystemType
    );

    // ── Collect All Warnings ──
    const allWarnings = [
      ...(result.warnings || []),
      ...batteryBank.warnings,
      ...systemBalance.warnings
    ];

    // ── Detailed Pricing Breakdown ──
    const rate = getExchangeRate();
    const defaultMargin = getDefaultMargin();
    const marginMultiplier = 1 + (defaultMargin / 100);

    const pPanelCost = selectedPanel?.cost_price || 0;
    const pPanelSale = selectedPanel?.sale_price || Math.round(pPanelCost * marginMultiplier);
    const pBatCost = selectedBattery?.cost_price || 0;
    const pBatSale = selectedBattery?.sale_price || Math.round(pBatCost * marginMultiplier);
    const pInvCost = selectedInverter?.cost_price || 0;
    const pInvSale = selectedInverter?.sale_price || Math.round(pInvCost * marginMultiplier);

    const panels_cost = panelCount * pPanelSale;
    const batteries_cost = batteryCount * pBatSale;
    const inverter_cost = pInvSale;
    const accessories_cost = 0; // Placeholder for future accessories
    const installation_cost = 0; // Placeholder for future installation fee
    const subtotal_items_cost = panels_cost + batteries_cost + inverter_cost + accessories_cost + installation_cost;

    const material_cost_usd = (panelCount * pPanelCost) + (batteryCount * pBatCost) + pInvCost;
    const sale_price_usd = subtotal_items_cost;
    const sale_price_iqd = Math.round(sale_price_usd * rate);

    // ── Payment Options ──
    const cash_discount_percent = 3; // 3% cash discount
    const cash_total_usd = Math.round(sale_price_usd * (1 - cash_discount_percent / 100));
    const cash_total_iqd = Math.round(cash_total_usd * rate);

    const installment_months = 12;
    const down_payment_percent = 30;
    const admin_fee_percent = 5;
    const interest_percent = 0; // No interest for now
    const down_payment_usd = Math.round(sale_price_usd * (down_payment_percent / 100));
    const down_payment_iqd = Math.round(down_payment_usd * rate);
    const financed_amount_usd = sale_price_usd - down_payment_usd;
    const financed_amount_iqd = Math.round(financed_amount_usd * rate);
    const admin_fee_iqd = Math.round(financed_amount_iqd * (admin_fee_percent / 100));
    const total_financed_iqd = financed_amount_iqd + admin_fee_iqd;
    const monthly_payment_iqd = Math.round(total_financed_iqd / installment_months);
    const installment_total_iqd = down_payment_iqd + total_financed_iqd;

    // ── Calculate battery alternatives ──
    const allBatteries = db.prepare("SELECT * FROM components WHERE category = 'battery' ORDER BY cost_price ASC").all() as any[];
    const alternativeBatteries = allBatteries.map(b => {
      const bAh = JSON.parse(b.spec || '{}').Ah || 200;
      const bV = JSON.parse(b.spec || '{}').V || data.system_voltage;
      const bBank = batCalc.needed ? calculator.calculateBatteryBank(batCalc.required_energy_wh, bAh, bV, data.system_voltage) : { total_battery_count: 0 };
      const bCount = bBank.total_battery_count;
      return {
        item: b,
        count: bCount,
        total_cost: bCount * (b.cost_price || 0),
        total_sale: bCount * (b.sale_price || b.cost_price || 0)
      };
    });

    res.json({
      success: true,
      engineering: {
        total_wh: eng.total_wh,
        day_wh: eng.day_wh,
        night_wh: eng.night_wh,
        loss_factor: eng.loss_factor,
        total_wh_after_losses: eng.total_wh_after_losses,
        peak_continuous_w: eng.peak_continuous_w,
        peak_surge_w: eng.peak_surge_w,
        required_ah: batCalc.required_ah,
        required_panel_w: solarCalc.required_power_w,
        system_voltage: data.system_voltage,
        system_type: data.system_type,
        dod,
        efficiency,
        temp_correction,
        future_expansion,
        warnings: allWarnings,
        battery_bank: batteryBank,
        system_balance: {
          solar_generation_wh: systemBalance.daily_solar_harvest_wh,
          load_demand_wh: eng.total_wh,
          battery_storage_wh: batteryBank.total_usable_capacity_wh,
          solar_coverage_percent: eng.total_wh > 0 ? Math.min(100, Math.round((systemBalance.daily_solar_harvest_wh / eng.total_wh) * 100)) : 100,
          recharge_feasibility: systemBalance.is_feasible,
          recharge_time_days: systemBalance.recharge_time_days,
          warnings: systemBalance.warnings
        }
      },
      recommendation: {
        material_cost: material_cost_usd,
        sale_price: sale_price_usd,
        panels: { count: panelCount, item: selectedPanel },
        batteries: { count: batteryCount, item: selectedBattery, needed: batCalc.needed, alternatives: alternativeBatteries },
        inverter: { count: 1, item: selectedInverter }
      },
      pricing: {
        panels_cost,
        batteries_cost,
        inverter_cost,
        accessories_cost,
        installation_cost,
        subtotal_items_cost,
        material_cost_usd,
        exchange_rate: rate,
        default_margin: defaultMargin,
        sale_price_usd,
        sale_price_iqd
      },
      payment_options: {
        cash: {
          cash_discount_percent,
          final_total_usd: cash_total_usd,
          final_total_iqd: cash_total_iqd
        },
        installments: {
          enabled: true,
          months: installment_months,
          down_payment_percent,
          down_payment_usd,
          down_payment_iqd,
          financed_amount_iqd,
          admin_fee_percent,
          admin_fee_iqd,
          interest_percent,
          monthly_payment_iqd,
          final_total_iqd: installment_total_iqd
        }
      }
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workspace/presets', requireAuth, (req, res) => {
  try {
    const { name, state_json, description } = req.body;
    const user = (req as any).user;
    const preset = WorkspaceService.savePreset(name, state_json, description, user?.id);
    res.json({ success: true, preset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/workspace/presets', requireAuth, (req, res) => {
  try {
    const presets = WorkspaceService.getAllPresets();
    res.json(presets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/workspace/presets/:id', requireAuth, (req, res) => {
  try {
    const success = WorkspaceService.deletePreset(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin API

app.get('/api/admin/dashboard', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const projectCount = db.prepare('SELECT COUNT(*) as c FROM projects').get() as any;
    const componentCount = db.prepare('SELECT COUNT(*) as c FROM components').get() as any;
    const stockValue = db.prepare('SELECT SUM(cost_price * stock_qty) as v FROM components').get() as any;
    const recentProjects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC LIMIT 5').all();
    const byCategory = db.prepare('SELECT category, COUNT(*) as count FROM components GROUP BY category').all();
    const lowStock = db.prepare('SELECT * FROM components WHERE stock_qty <= 5 LIMIT 10').all();

    res.json({
      projectCount: projectCount.c,
      componentCount: componentCount.c,
      stockValue: stockValue.v || 0,
      recentProjects,
      byCategory,
      lowStock
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/settings', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const company = db.prepare('SELECT name as company_name, base_currency FROM companies LIMIT 1').get() || {};
    res.json({ ...company });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/settings', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const { company_name, base_currency } = req.body;
    db.prepare('UPDATE companies SET name = ?, base_currency = ?').run(company_name, base_currency || 'USD');
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/components', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const category = req.query.category as string;
    let query = 'SELECT * FROM components';
    if (category) query += ' WHERE category = ?';
    const components = category ? db.prepare(query).all(category) : db.prepare(query).all();

    // Parse specs and enrich with dynamic pricing
    const parsed = components.map((c: any) => ({
      ...c,
      spec: typeof c.spec === 'string' ? JSON.parse(c.spec || '{}') : c.spec
    }));
    const enriched = enrichProductsWithPricing(parsed);
    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/components', requireAuth, requireRole(['admin']), validateSchema(ComponentSchema), (req, res) => {
  try {
    const { category, brand, model, spec, cost_price, currency, stock_qty, sku, is_active, margin_percent, battery_chemistry } = req.body;
    if (!category || !brand || !model) return res.status(400).json({ error: 'category, brand, model required' });
    const id = crypto.randomUUID();
    const company = db.prepare('SELECT id FROM companies LIMIT 1').get() as any;
    db.prepare(`
      INSERT INTO components 
      (id, company_id, sku, category, brand, model, spec, cost_price, currency, stock_qty, is_active, margin_percent, battery_chemistry) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, company?.id, sku || '', category, brand, model, JSON.stringify(spec || {}),
      cost_price || 0, currency || 'USD', stock_qty || 0, is_active ?? 1, margin_percent ?? null, battery_chemistry || null
    );

    // Audit log
    const user = (req as any).user;
    auditLogger.log(
      user?.id || 'admin', 'COMPONENT_CREATE', 'component',
      null, { id, category, brand, model, cost_price, margin_percent },
      req.ip, req.headers['user-agent'] || null
    );

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/components/:id', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const { category, brand, model, spec, cost_price, currency, stock_qty, sku, is_active, margin_percent, battery_chemistry } = req.body;

    // Fetch old values for audit + price_history
    const old = db.prepare('SELECT cost_price, margin_percent, brand, model FROM components WHERE id = ?').get(req.params.id) as any;

    db.prepare(`
      UPDATE components 
      SET sku = ?, category = ?, brand = ?, model = ?, spec = ?, 
          cost_price = ?, currency = ?, stock_qty = ?, is_active = ?, margin_percent = ?, battery_chemistry = ?
      WHERE id = ?
    `).run(
      sku || '', category, brand, model, JSON.stringify(spec || {}),
      cost_price || 0, currency || 'USD', stock_qty || 0, is_active ?? 1,
      margin_percent ?? null, battery_chemistry || null, req.params.id
    );

    // Record price change in price_history if cost or margin changed
    if (old && (old.cost_price !== (cost_price || 0) || old.margin_percent !== (margin_percent ?? null))) {
      db.prepare(`
        INSERT INTO price_history (id, component_id, old_cost_price, new_cost_price, old_margin, new_margin, changed_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(), req.params.id,
        old.cost_price, cost_price || 0,
        old.margin_percent, margin_percent ?? null,
        ((req as any).user)?.id || 'admin'
      );
    }

    // Audit log
    const user = (req as any).user;
    auditLogger.log(
      user?.id || 'admin', 'COMPONENT_UPDATE', 'component',
      old ? { cost_price: old.cost_price, margin_percent: old.margin_percent } : null,
      { id: req.params.id, cost_price, margin_percent, brand, model },
      req.ip, req.headers['user-agent'] || null
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/components/:id', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    // Check if component is linked to any active quotes
    const linkedQuotes = db.prepare(`
      SELECT q.id, c.name as client_name, q.created_at
      FROM quote_items qi
      JOIN quotes q ON qi.quote_id = q.id
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE qi.component_id = ?
      GROUP BY q.id
      LIMIT 10
    `).all(req.params.id) as any[];

    if (linkedQuotes.length > 0) {
      return res.status(400).json({
        error: 'LINKED_QUOTES',
        quotes: linkedQuotes.map((q: any) => ({
          id: q.id,
          client_name: q.client_name || 'عميل غير مسجل',
          date: new Date(q.created_at).toLocaleDateString('ar-IQ')
        }))
      });
    }

    const old = db.prepare('SELECT brand, model, cost_price FROM components WHERE id = ?').get(req.params.id) as any;

    db.transaction(() => {
      db.prepare('DELETE FROM price_history WHERE component_id = ?').run(req.params.id);
      db.prepare('DELETE FROM components WHERE id = ?').run(req.params.id);
    })();

    // Audit log
    const user = (req as any).user;
    auditLogger.log(
      user?.id || 'admin', 'COMPONENT_DELETE', 'component',
      old || { id: req.params.id }, null,
      req.ip, req.headers['user-agent'] || null
    );

    res.json({ success: true });
  } catch (err: any) {
    console.error("COMPONENT DELETE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Appliances
app.post('/api/admin/appliances', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const { name, name_en, icon, default_watts, surge_factor, type } = req.body;
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO appliances (id, name, name_en, icon, default_watts, surge_factor, type) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, name, name_en, icon, default_watts, surge_factor, type);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/appliances/:id', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const { name, name_en, icon, default_watts, surge_factor, type } = req.body;
    db.prepare('UPDATE appliances SET name = ?, name_en = ?, icon = ?, default_watts = ?, surge_factor = ?, type = ? WHERE id = ?')
      .run(name, name_en, icon, default_watts, surge_factor, type, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/appliances/:id', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    db.prepare('DELETE FROM appliances WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Regions
app.post('/api/admin/regions', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const { name, name_en, sun_hours } = req.body;
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO regions (id, name, name_en, sun_hours) VALUES (?, ?, ?, ?)')
      .run(id, name, name_en, sun_hours);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/regions/:id', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const { name, name_en, sun_hours } = req.body;
    db.prepare('UPDATE regions SET name = ?, name_en = ?, sun_hours = ? WHERE id = ?')
      .run(name, name_en, sun_hours, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/regions/:id', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    db.prepare('DELETE FROM regions WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// CLIENTS
// ═══════════════════════════════════════════════════════════════
app.get('/api/clients', requireAuth, (req, res) => {
  try {
    const clients = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM quotes WHERE client_id = c.id) as quotes_count,
        (SELECT COUNT(*) FROM projects WHERE client_id = c.id) as projects_count,
        (SELECT COALESCE(SUM(total_selling_price), 0) FROM quotes WHERE client_id = c.id) as total_revenue
      FROM clients c ORDER BY c.created_at DESC
    `).all();
    res.json(clients);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/clients/:id', requireAuth, (req, res) => {
  try {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const quotes = db.prepare('SELECT id, quote_number, total_selling_price, total_profit, status, created_at FROM quotes WHERE client_id = ? ORDER BY created_at DESC').all(req.params.id);
    const projects = db.prepare('SELECT id, name, status, created_at FROM projects WHERE client_id = ? ORDER BY created_at DESC').all(req.params.id);
    res.json({ ...client, quotes, projects });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clients', requireAuth, validateSchema(ClientSchema), (req, res) => {
  try {
    const { name, phone, email, address, city, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const id = crypto.randomUUID();
    const company = db.prepare('SELECT id FROM companies LIMIT 1').get() as any;
    db.prepare(`
      INSERT INTO clients (id, company_id, name, phone, email, address, city, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, company?.id, name, phone || null, email || null, address || null, city || null, notes || null);

    auditLogger.log(
      ((req as any).user)?.id || 'admin', 'CLIENT_CREATE', 'client',
      null, { id, name, phone },
      req.ip, req.headers['user-agent'] || null
    );

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clients/:id', requireAuth, validateSchema(ClientSchema), (req, res) => {
  try {
    const { name, phone, email, address, city, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    db.prepare(`
      UPDATE clients SET name = ?, phone = ?, email = ?, address = ?, city = ?, notes = ?
      WHERE id = ?
    `).run(name, phone || null, email || null, address || null, city || null, notes || null, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/clients/:id', requireAuth, (req, res) => {
  try {
    const old = db.prepare('SELECT name, phone FROM clients WHERE id = ?').get(req.params.id) as any;
    db.transaction(() => {
      db.prepare('UPDATE quotes SET client_id = NULL WHERE client_id = ?').run(req.params.id);
      db.prepare('UPDATE projects SET client_id = NULL WHERE client_id = ?').run(req.params.id);
      db.prepare('UPDATE maintenance_logs SET client_id = NULL WHERE client_id = ?').run(req.params.id);
      db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
    })();
    const user = (req as any).user;
    auditLogger.log(
      user?.id, 'CLIENT_DELETE', 'client',
      old || { id: req.params.id }, null,
      req.ip, req.headers['user-agent'] as string
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// QUOTES — Dynamic Pricing (NEW)
// ═══════════════════════════════════════════════════════════════
app.post('/api/quotes', requireAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const result = createQuote(req.body, user);
    // Audit log
    auditLogger.log(
      user.id, 'QUOTE_CREATE', 'quote',
      null,
      { quote_id: result.id, quote_number: result.quote_number, total_sell_iqd: result.total_sell_iqd, exchange_rate: result.exchange_rate },
      req.ip, req.headers['user-agent'] || null
    );
    res.json({ success: true, quote: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Legacy endpoint (backward compat with old ABPE flow)
app.post('/api/quotes/from-abpe', requireAuth, (req, res) => {
  try {
    const quote = createQuoteFromABPE(req.body, (req as any).user);
    res.json({ success: true, quote });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/quotes', requireAuth, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    const filters = {
      status: req.query.status as string,
      customer_name: req.query.customer_name as string,
      from_date: req.query.from_date as string,
      to_date: req.query.to_date as string,
      min_total: parseFloat(req.query.min_total as string) || undefined,
      max_total: parseFloat(req.query.max_total as string) || undefined,
      sort_by: req.query.sort_by as string,
      order: req.query.order as string,
    };

    const result = getQuotes(limit, offset, filters);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/quotes/:id', requireAuth, (req, res) => {
  try {
    const quote = getQuoteById(req.params.id);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    res.json(quote);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/quotes/:id/convert', requireAuth, (req, res) => {
  try {
    const projectId = convertQuoteToProject(req.params.id, (req as any).user);
    res.json({ success: true, projectId });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/quotes/:id/expire', requireAuth, (req, res) => {
  try {
    expireQuote(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/quotes/:id/status', requireAuth, (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const user = (req as any).user;
    const result = updateQuoteStatus(req.params.id, status, user);
    auditLogger.log(
      user.id, 'QUOTE_STATUS_UPDATE', 'quote',
      { status: result.oldStatus },
      { status: result.newStatus },
      req.ip, req.headers['user-agent'] || null
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/quotes/:id', requireAuth, (req, res) => {
  try {
    const old = getQuoteById(req.params.id);
    deleteQuote(req.params.id);
    const user = (req as any).user;
    auditLogger.log(
      user?.id, 'QUOTE_DELETE', 'quote',
      old ? { quote_number: (old as any).quote_number, customer_name: (old as any).customer_name } : { id: req.params.id },
      null, req.ip, req.headers['user-agent'] as string
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// COMPONENT SEARCH (Phase 1.1)
// ═══════════════════════════════════════════════════════════════

app.get('/api/components/search', requireAuth, (req, res) => {
  try {
    const q = (req.query.q as string || '').trim().toLowerCase();
    const category = req.query.category as string;
    const brand = req.query.brand as string;
    const minPrice = parseFloat(req.query.min_price as string) || 0;
    const maxPrice = parseFloat(req.query.max_price as string) || Infinity;
    const stockStatus = req.query.stock as string; // 'in_stock', 'low_stock', 'out_of_stock'
    const sortBy = req.query.sort_by as string || 'brand'; // 'brand', 'price_asc', 'price_desc', 'stock'
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    let conditions: string[] = ['is_active = 1'];
    let params: any[] = [];

    if (q) {
      conditions.push("(LOWER(brand || ' ' || model) LIKE ? OR LOWER(sku) LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (brand) {
      conditions.push('brand = ?');
      params.push(brand);
    }
    if (minPrice > 0) {
      conditions.push('cost_price >= ?');
      params.push(minPrice);
    }
    if (maxPrice < Infinity) {
      conditions.push('cost_price <= ?');
      params.push(maxPrice);
    }
    if (stockStatus === 'in_stock') {
      conditions.push('stock_qty > 5');
    } else if (stockStatus === 'low_stock') {
      conditions.push('stock_qty > 0 AND stock_qty <= 5');
    } else if (stockStatus === 'out_of_stock') {
      conditions.push('stock_qty = 0');
    }

    let orderBy = 'brand ASC, model ASC';
    if (sortBy === 'price_asc') orderBy = 'cost_price ASC';
    else if (sortBy === 'price_desc') orderBy = 'cost_price DESC';
    else if (sortBy === 'stock') orderBy = 'stock_qty DESC';

    const query = `SELECT * FROM components WHERE ${conditions.join(' AND ')} ORDER BY ${orderBy} LIMIT ?`;
    params.push(limit);

    const components = db.prepare(query).all(...params);
    const parsed = components.map((c: any) => ({
      ...c,
      spec: typeof c.spec === 'string' ? JSON.parse(c.spec || '{}') : c.spec
    }));
    const enriched = enrichProductsWithPricing(parsed);

    // Get unique brands for filter dropdown
    const brands = db.prepare('SELECT DISTINCT brand FROM components WHERE is_active = 1 ORDER BY brand').all();

    // Get popular components (most used in quotes)
    const popular = db.prepare(`
      SELECT c.id, c.brand, c.model, c.category, COUNT(qi.id) as usage_count
      FROM components c
      JOIN quote_items qi ON qi.component_id = c.id
      WHERE c.is_active = 1
      GROUP BY c.id
      ORDER BY usage_count DESC
      LIMIT 5
    `).all();

    res.json({
      results: enriched,
      total: enriched.length,
      brands: brands.map((b: any) => b.brand),
      popular
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// PRICING TIERS (Phase 1.3)
// ═══════════════════════════════════════════════════════════════

app.get('/api/admin/pricing-tiers/:componentId', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const tiers = getPricingTiers(req.params.componentId);
    res.json(tiers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/pricing-tiers', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const { component_id, min_qty, max_qty, discount_percent, valid_from, valid_to } = req.body;
    if (!component_id || min_qty == null || max_qty == null || discount_percent == null) {
      return res.status(400).json({ error: 'component_id, min_qty, max_qty, discount_percent required' });
    }
    if (discount_percent < 0 || discount_percent > 50) {
      return res.status(400).json({ error: 'Discount must be 0-50%' });
    }
    const id = upsertPricingTier({ component_id, min_qty, max_qty, discount_percent, valid_from, valid_to });

    const user = (req as any).user;
    auditLogger.log(user?.id || 'admin', 'PRICING_TIER_CREATE', 'pricing_tier',
      null, { component_id, min_qty, max_qty, discount_percent },
      req.ip, req.headers['user-agent'] || null
    );

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/pricing-tiers/:id', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const { component_id, min_qty, max_qty, discount_percent, valid_from, valid_to } = req.body;
    upsertPricingTier({ id: req.params.id, component_id, min_qty, max_qty, discount_percent, valid_from, valid_to });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/pricing-tiers/:id', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    deletePricingTier(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// CLIENT PRICING OVERRIDES (Phase 1.4)
// ═══════════════════════════════════════════════════════════════

app.get('/api/clients/:clientId/pricing', requireAuth, (req, res) => {
  try {
    const overrides = getClientPricingOverrides(req.params.clientId);
    res.json(overrides);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clients/:clientId/pricing', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const { component_id, category, discount_percent, valid_from, valid_to } = req.body;
    if (discount_percent == null || discount_percent < 0 || discount_percent > 50) {
      return res.status(400).json({ error: 'discount_percent required (0-50)' });
    }
    const id = upsertClientPricingOverride({
      client_id: req.params.clientId, component_id, category,
      discount_percent, valid_from, valid_to
    });

    const user = (req as any).user;
    auditLogger.log(user?.id || 'admin', 'CLIENT_PRICING_CREATE', 'client_pricing',
      null, { client_id: req.params.clientId, component_id, category, discount_percent },
      req.ip, req.headers['user-agent'] || null
    );

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clients/:clientId/pricing/:id', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const { component_id, category, discount_percent, valid_from, valid_to } = req.body;
    upsertClientPricingOverride({
      id: req.params.id, client_id: req.params.clientId,
      component_id, category, discount_percent, valid_from, valid_to
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/clients/:clientId/pricing/:id', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    deleteClientPricingOverride(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ANALYTICS (Phase 2)
// ═══════════════════════════════════════════════════════════════

// 2.1 Profitability Analytics
app.get('/api/admin/analytics/profitability', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const fromDate = req.query.from_date as string;
    const toDate = req.query.to_date as string;
    const groupBy = req.query.group_by as string || 'category';

    let dateCondition = '';
    const params: any[] = [];
    if (fromDate) { dateCondition += ' AND q.created_at >= ?'; params.push(fromDate); }
    if (toDate) { dateCondition += ' AND q.created_at <= ?'; params.push(toDate); }

    // Profitability by category
    const byCategory = db.prepare(`
      SELECT c.category,
        COUNT(DISTINCT qi.id) as items_sold,
        SUM(qi.total_price) as total_revenue,
        SUM(qi.cost_price_snapshot * qi.quantity * qi.exchange_rate_snapshot) as total_cost,
        SUM(qi.total_price - (qi.cost_price_snapshot * qi.quantity * qi.exchange_rate_snapshot)) as total_profit,
        ROUND(AVG(qi.margin_percent_snapshot), 1) as avg_margin
      FROM quote_items qi
      JOIN components c ON qi.component_id = c.id
      JOIN quotes q ON qi.quote_id = q.id
      WHERE q.status != 'expired' ${dateCondition}
      GROUP BY c.category
      ORDER BY total_profit DESC
    `).all(...params);

    // Top 10 most profitable components
    const topComponents = db.prepare(`
      SELECT c.brand, c.model, c.category,
        COUNT(qi.id) as times_sold,
        SUM(qi.total_price) as total_revenue,
        SUM(qi.total_price - (qi.cost_price_snapshot * qi.quantity * qi.exchange_rate_snapshot)) as total_profit,
        ROUND(AVG(qi.margin_percent_snapshot), 1) as avg_margin
      FROM quote_items qi
      JOIN components c ON qi.component_id = c.id
      JOIN quotes q ON qi.quote_id = q.id
      WHERE q.status != 'expired' ${dateCondition}
      GROUP BY c.id
      ORDER BY total_profit DESC
      LIMIT 10
    `).all(...params);

    // Low margin alerts (< 5%)
    const lowMarginProducts = db.prepare(`
      SELECT c.brand, c.model, c.category, c.margin_percent, c.cost_price
      FROM components c
      WHERE c.is_active = 1
        AND (c.margin_percent IS NOT NULL AND c.margin_percent < 5)
      ORDER BY c.margin_percent ASC
    `).all();

    // Overall summary
    const summary = db.prepare(`
      SELECT
        SUM(total_selling_price) as total_revenue,
        SUM(total_material_cost) as total_cost,
        SUM(total_profit) as total_profit,
        ROUND(AVG(CASE WHEN total_material_cost > 0 THEN (total_profit * 100.0 / total_material_cost) ELSE 0 END), 1) as avg_margin_pct,
        COUNT(*) as total_quotes
      FROM quotes
      WHERE status != 'expired' ${dateCondition}
    `).get(...params);

    res.json({ summary, byCategory, topComponents, lowMarginProducts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2.2 Team Performance
app.get('/api/admin/analytics/team-performance', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const fromDate = req.query.from_date as string;
    const toDate = req.query.to_date as string;

    let dateCondition = '';
    const params: any[] = [];
    if (fromDate) { dateCondition += ' AND q.created_at >= ?'; params.push(fromDate); }
    if (toDate) { dateCondition += ' AND q.created_at <= ?'; params.push(toDate); }

    const performance = db.prepare(`
      SELECT u.name as user_name, u.id as user_id,
        COUNT(q.id) as total_quotes,
        SUM(CASE WHEN q.status = 'converted' THEN 1 ELSE 0 END) as converted,
        SUM(CASE WHEN q.status = 'expired' THEN 1 ELSE 0 END) as expired,
        ROUND(AVG(q.total_selling_price), 0) as avg_deal_size,
        SUM(q.total_selling_price) as total_revenue,
        SUM(q.total_profit) as total_profit,
        MAX(q.created_at) as last_quote_date
      FROM quotes q
      JOIN users u ON q.created_by = u.id
      WHERE 1=1 ${dateCondition}
      GROUP BY u.id
      ORDER BY total_revenue DESC
    `).all(...params);

    // Add conversion rate
    const result = performance.map((p: any) => ({
      ...p,
      conversion_rate: p.total_quotes > 0
        ? Math.round((p.converted / p.total_quotes) * 100)
        : 0
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2.3 Quote Conversion Funnel
app.get('/api/admin/analytics/quote-funnel', (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 90;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const funnel = db.prepare(`
      SELECT status, COUNT(*) as count,
        ROUND(SUM(total_selling_price), 0) as total_value
      FROM quotes
      WHERE created_at >= ?
      GROUP BY status
      ORDER BY
        CASE status
          WHEN 'draft' THEN 1
          WHEN 'sent' THEN 2
          WHEN 'approved' THEN 3
          WHEN 'converted' THEN 4
          WHEN 'expired' THEN 5
          ELSE 6
        END
    `).all(since);

    const total = funnel.reduce((sum: number, f: any) => sum + f.count, 0);
    const result = funnel.map((f: any) => ({
      ...f,
      percentage: total > 0 ? Math.round((f.count / total) * 100) : 0
    }));

    res.json({ funnel: result, total, period_days: days });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2.4 Customer Segmentation
app.get('/api/admin/analytics/customer-segments', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const customers = db.prepare(`
      SELECT cl.id, cl.name, cl.phone, cl.city,
        COUNT(q.id) as total_orders,
        COALESCE(SUM(q.total_selling_price), 0) as total_spent,
        MAX(q.created_at) as last_order_date,
        ROUND(AVG(q.total_selling_price), 0) as avg_order_size,
        CAST(julianday('now') - julianday(MAX(q.created_at)) AS INTEGER) as days_since_last
      FROM clients cl
      LEFT JOIN quotes q ON q.client_id = cl.id AND q.status != 'expired'
      GROUP BY cl.id
      ORDER BY total_spent DESC
    `).all();

    // Segment customers
    const segmented = customers.map((c: any) => {
      let segment = 'prospect';
      if (c.total_orders >= 3 && c.total_spent > 10000000 && (c.days_since_last ?? 999) <= 30) {
        segment = 'vip';
      } else if (c.total_orders >= 1 && c.total_spent > 5000000) {
        segment = 'regular';
      } else if (c.total_orders >= 1 && (c.days_since_last ?? 999) > 60) {
        segment = 'inactive';
      } else if (c.total_orders >= 1) {
        segment = 'regular';
      }
      return { ...c, segment };
    });

    const counts = {
      vip: segmented.filter((c: any) => c.segment === 'vip').length,
      regular: segmented.filter((c: any) => c.segment === 'regular').length,
      inactive: segmented.filter((c: any) => c.segment === 'inactive').length,
      prospect: segmented.filter((c: any) => c.segment === 'prospect').length,
    };

    res.json({ customers: segmented, counts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2.5 Inventory Analytics
app.get('/api/admin/analytics/inventory', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    // Slow-moving stock (components not ordered in 60+ days)
    const slowMoving = db.prepare(`
      SELECT c.id, c.brand, c.model, c.category, c.stock_qty, c.cost_price, c.currency,
        MAX(q.created_at) as last_ordered,
        CAST(julianday('now') - julianday(COALESCE(MAX(q.created_at), c.created_at)) AS INTEGER) as days_idle,
        c.stock_qty * c.cost_price as stock_value_usd
      FROM components c
      LEFT JOIN quote_items qi ON qi.component_id = c.id
      LEFT JOIN quotes q ON qi.quote_id = q.id AND q.status != 'expired'
      WHERE c.is_active = 1 AND c.stock_qty > 0
      GROUP BY c.id
      HAVING days_idle > 60
      ORDER BY stock_value_usd DESC
    `).all();

    // Stock summary by category
    const stockSummary = db.prepare(`
      SELECT category,
        SUM(stock_qty) as total_units,
        COUNT(*) as unique_products,
        SUM(stock_qty * cost_price) as total_value_usd,
        SUM(CASE WHEN stock_qty = 0 THEN 1 ELSE 0 END) as out_of_stock,
        SUM(CASE WHEN stock_qty > 0 AND stock_qty <= 5 THEN 1 ELSE 0 END) as low_stock
      FROM components
      WHERE is_active = 1
      GROUP BY category
    `).all();

    // Most sold components (last 90 days)
    const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const topSelling = db.prepare(`
      SELECT c.brand, c.model, c.category, c.stock_qty,
        SUM(qi.quantity) as total_sold
      FROM quote_items qi
      JOIN components c ON qi.component_id = c.id
      JOIN quotes q ON qi.quote_id = q.id
      WHERE q.created_at >= ? AND q.status != 'expired'
      GROUP BY c.id
      ORDER BY total_sold DESC
      LIMIT 10
    `).all(since90);

    res.json({ slowMoving, stockSummary, topSelling });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// SMART RECOMMENDATIONS (Phase 3.1)
// ═══════════════════════════════════════════════════════════════

app.post('/api/engineering/recommend-components', requireAuth, (req, res) => {
  try {
    const { system_type, region_name, total_wh, system_voltage } = req.body;

    // Find similar past projects by region + system type + energy range
    const tolerance = 0.2; // ±20% energy tolerance
    const minWh = (total_wh || 0) * (1 - tolerance);
    const maxWh = (total_wh || 0) * (1 + tolerance);

    const similarQuotes = db.prepare(`
      SELECT q.id, q.quote_number, q.total_selling_price, q.created_at,
        qs.system_type, qs.total_wh, qs.system_voltage, qs.sun_hours
      FROM quotes q
      JOIN quote_engineering_snapshot qs ON qs.quote_id = q.id
      WHERE q.status != 'expired'
        AND qs.system_type = ?
        AND qs.total_wh BETWEEN ? AND ?
        ${system_voltage ? 'AND qs.system_voltage = ?' : ''}
      ORDER BY q.created_at DESC
      LIMIT 10
    `).all(...[system_type, minWh, maxWh, ...(system_voltage ? [system_voltage] : [])]);

    if (similarQuotes.length === 0) {
      return res.json({ recommendations: [], message: 'لا توجد مشاريع مشابهة سابقة' });
    }

    // Get components used in those quotes
    const quoteIds = similarQuotes.map((q: any) => q.id);
    const placeholders = quoteIds.map(() => '?').join(',');

    const componentUsage = db.prepare(`
      SELECT c.id, c.brand, c.model, c.category, c.cost_price, c.currency,
        COUNT(*) as usage_count,
        AVG(qi.quantity) as avg_quantity
      FROM quote_items qi
      JOIN components c ON qi.component_id = c.id
      WHERE qi.quote_id IN (${placeholders})
        AND c.is_active = 1
      GROUP BY c.id
      ORDER BY usage_count DESC
    `).all(...quoteIds);

    const enriched = enrichProductsWithPricing(componentUsage.map((c: any) => ({
      ...c,
      spec: '{}',
      margin_percent: null
    })));

    res.json({
      recommendations: enriched,
      based_on: similarQuotes.length,
      similar_quotes: similarQuotes.map((q: any) => ({
        quote_number: q.quote_number,
        total_wh: q.total_wh,
        price: q.total_selling_price,
        date: q.created_at
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// MARGIN RECOMMENDATIONS (Phase 3.2)
// ═══════════════════════════════════════════════════════════════

app.get('/api/admin/margin-recommendations', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const defaultMargin = getDefaultMargin();

    // Average margin by category
    const categoryMargins = db.prepare(`
      SELECT c.category,
        ROUND(AVG(qi.margin_percent_snapshot), 1) as avg_margin,
        COUNT(qi.id) as sample_size
      FROM quote_items qi
      JOIN components c ON qi.component_id = c.id
      JOIN quotes q ON qi.quote_id = q.id
      WHERE q.status != 'expired'
      GROUP BY c.category
    `).all();

    // Seasonal trends (margin by month)
    const seasonalMargins = db.prepare(`
      SELECT strftime('%m', q.created_at) as month,
        ROUND(AVG(CASE WHEN q.total_material_cost > 0 THEN (q.total_profit * 100.0 / q.total_material_cost) ELSE 0 END), 1) as avg_margin,
        COUNT(*) as quote_count
      FROM quotes q
      WHERE q.status != 'expired'
      GROUP BY month
      ORDER BY month
    `).all();

    // Products with margins below system default
    const belowDefault = db.prepare(`
      SELECT brand, model, category, margin_percent, cost_price
      FROM components
      WHERE is_active = 1
        AND margin_percent IS NOT NULL
        AND margin_percent < ?
      ORDER BY margin_percent ASC
    `).all(defaultMargin);

    res.json({
      default_margin: defaultMargin,
      category_margins: categoryMargins,
      seasonal_margins: seasonalMargins,
      below_default: belowDefault,
      recommendations: [
        ...(belowDefault.length > 0 ? [{
          type: 'warning',
          message: `${belowDefault.length} منتج بهامش أقل من الافتراضي (${defaultMargin}%)`,
          action: 'مراجعة هوامش المنتجات المنخفضة'
        }] : []),
        ...categoryMargins.filter((c: any) => c.avg_margin < defaultMargin * 0.8).map((c: any) => ({
          type: 'info',
          message: `فئة ${c.category}: هامش متوسط ${c.avg_margin}% (أقل من النظام ${defaultMargin}%)`,
          action: `زيادة هوامش فئة ${c.category}`
        }))
      ]
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// DEMAND FORECASTING (Phase 3.3)
// ═══════════════════════════════════════════════════════════════

app.get('/api/admin/analytics/demand-forecast', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const weeksAhead = parseInt(req.query.weeks_ahead as string) || 12;

    // Weekly component usage over last 6 months
    const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

    const weeklyUsage = db.prepare(`
      SELECT c.id, c.brand, c.model, c.category, c.stock_qty,
        strftime('%Y-%W', q.created_at) as week,
        SUM(qi.quantity) as qty_used
      FROM quote_items qi
      JOIN components c ON qi.component_id = c.id
      JOIN quotes q ON qi.quote_id = q.id
      WHERE q.created_at >= ? AND q.status != 'expired'
      GROUP BY c.id, week
      ORDER BY c.id, week
    `).all(since);

    // Aggregate by component
    const componentMap = new Map<string, any>();
    for (const row of weeklyUsage as any[]) {
      if (!componentMap.has(row.id)) {
        componentMap.set(row.id, {
          id: row.id,
          brand: row.brand,
          model: row.model,
          category: row.category,
          stock_qty: row.stock_qty,
          weekly_data: []
        });
      }
      componentMap.get(row.id).weekly_data.push({
        week: row.week,
        qty: row.qty_used
      });
    }

    // Simple moving average forecast
    const forecasts = Array.from(componentMap.values()).map(comp => {
      const data = comp.weekly_data;
      const avgWeekly = data.length > 0
        ? data.reduce((sum: number, d: any) => sum + d.qty, 0) / data.length
        : 0;

      // Trend (compare last 4 weeks vs previous 4 weeks)
      const recent = data.slice(-4);
      const earlier = data.slice(-8, -4);
      const recentAvg = recent.length > 0 ? recent.reduce((s: number, d: any) => s + d.qty, 0) / recent.length : 0;
      const earlierAvg = earlier.length > 0 ? earlier.reduce((s: number, d: any) => s + d.qty, 0) / earlier.length : 0;
      const trend = earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg * 100) : 0;

      const forecastedDemand = Math.ceil(avgWeekly * weeksAhead);
      const stockWeeks = avgWeekly > 0 ? Math.floor(comp.stock_qty / avgWeekly) : 999;

      return {
        ...comp,
        weekly_data: undefined,
        avg_weekly_demand: Math.round(avgWeekly * 10) / 10,
        trend_percent: Math.round(trend),
        forecasted_demand: forecastedDemand,
        stock_weeks_remaining: stockWeeks,
        needs_reorder: stockWeeks < weeksAhead,
        risk_level: stockWeeks < 4 ? 'high' : stockWeeks < 8 ? 'medium' : 'low'
      };
    }).filter(f => f.avg_weekly_demand > 0)
      .sort((a, b) => a.stock_weeks_remaining - b.stock_weeks_remaining);

    res.json({
      forecasts,
      weeks_ahead: weeksAhead,
      high_risk: forecasts.filter(f => f.risk_level === 'high').length,
      medium_risk: forecasts.filter(f => f.risk_level === 'medium').length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ENGINEERING CALCULATIONS (Cable Loss, MPPT, ROI, Risk Analysis)
// ═══════════════════════════════════════════════════════════════

app.post('/api/engineering/cable-loss', requireAuth, validateSchema(CableLossSchema), (req, res) => {
  try {
    const { current_amps, cable_length_m, cable_gauge_mm2, system_voltage, material } = req.body;
    if (!current_amps || !cable_length_m || !cable_gauge_mm2 || !system_voltage) {
      return res.status(400).json({ error: 'Required: current_amps, cable_length_m, cable_gauge_mm2, system_voltage' });
    }
    const result = calculator.calculateCableLoss({
      current_amps, cable_length_m, cable_gauge_mm2, system_voltage,
      material: material || 'copper'
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/engineering/mppt-optimize', requireAuth, (req, res) => {
  try {
    const { panel_vmp, panel_imp, panel_voc, panel_isc, panel_count, system_voltage, mppt_max_voltage, mppt_max_current, ambient_temp_max } = req.body;
    if (!panel_vmp || !panel_voc || !panel_count || !mppt_max_voltage || !mppt_max_current) {
      return res.status(400).json({ error: 'Required: panel_vmp, panel_voc, panel_count, mppt_max_voltage, mppt_max_current' });
    }
    const result = calculator.calculateMPPT({
      panel_vmp, panel_imp: panel_imp || 0, panel_voc, panel_isc: panel_isc || 0,
      panel_count, system_voltage: system_voltage || 48,
      mppt_max_voltage, mppt_max_current,
      ambient_temp_max: ambient_temp_max || 45
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/engineering/roi', requireAuth, validateSchema(ROISchema), (req, res) => {
  try {
    const { total_system_cost_iqd, monthly_grid_bill_iqd, grid_coverage_percent, annual_degradation, annual_maintenance_cost_iqd, system_lifetime_years, electricity_inflation_rate } = req.body;
    if (!total_system_cost_iqd || !monthly_grid_bill_iqd) {
      return res.status(400).json({ error: 'Required: total_system_cost_iqd, monthly_grid_bill_iqd' });
    }
    const result = calculator.calculateROI({
      total_system_cost_iqd,
      monthly_grid_bill_iqd,
      grid_coverage_percent: grid_coverage_percent || 80,
      annual_degradation: annual_degradation || 0.7,
      annual_maintenance_cost_iqd: annual_maintenance_cost_iqd || 0,
      system_lifetime_years: system_lifetime_years || 25,
      electricity_inflation_rate: electricity_inflation_rate || 5
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/engineering/risk-analysis', requireAuth, (req, res) => {
  try {
    const { ambient_temp_avg, ambient_temp_max, dust_level, peak_load_w, inverter_capacity_w, battery_ah, required_ah, system_type } = req.body;
    const result = calculator.calculateRisk({
      ambient_temp_avg: ambient_temp_avg || 35,
      ambient_temp_max: ambient_temp_max || 50,
      dust_level: dust_level || 'medium',
      peak_load_w: peak_load_w || 0,
      inverter_capacity_w: inverter_capacity_w || 0,
      battery_ah: battery_ah || 0,
      required_ah: required_ah || 0,
      system_type: system_type || 'OFF_GRID'
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/engineering/temp-derating', requireAuth, (req, res) => {
  try {
    const { ambient_temp, power_temp_coeff } = req.body;
    if (ambient_temp === undefined) {
      return res.status(400).json({ error: 'Required: ambient_temp (°C)' });
    }
    const derating = calculateTempDerating(ambient_temp, power_temp_coeff);
    const cellTemp = ambient_temp + 25;
    res.json({
      ambient_temp,
      cell_temp: cellTemp,
      derating_percent: Math.round(derating * 10000) / 100,
      effective_output_percent: Math.round((1 - derating) * 10000) / 100
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// COST COMPONENTS (configurable accessories, installation fees)
// ═══════════════════════════════════════════════════════════════
app.get('/api/admin/cost-components', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const components = getCostComponents();
    res.json(components);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/cost-components/:id', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const old = db.prepare('SELECT * FROM cost_components WHERE id = ?').get(req.params.id) as any;
    if (!old) return res.status(404).json({ error: 'Cost component not found' });

    updateCostComponent(req.params.id, req.body);

    auditLogger.log(
      (req as any).user?.id, 'COST_COMPONENT_UPDATE', 'cost_component',
      { name: old.name, value: old.value, type: old.type },
      { name: req.body.name || old.name, value: req.body.value ?? old.value, type: req.body.type || old.type },
      req.ip, req.headers['user-agent'] || null
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// MAINTENANCE LOGS (post-sale tracking)
// ═══════════════════════════════════════════════════════════════
app.get('/api/maintenance-logs', requireAuth, (req, res) => {
  try {
    const { project_id, client_id } = req.query;
    let query = 'SELECT ml.*, c.name as client_name, p.name as project_name FROM maintenance_logs ml LEFT JOIN clients c ON ml.client_id = c.id LEFT JOIN projects p ON ml.project_id = p.id WHERE 1=1';
    const params: any[] = [];

    if (project_id) { query += ' AND ml.project_id = ?'; params.push(project_id); }
    if (client_id) { query += ' AND ml.client_id = ?'; params.push(client_id); }

    query += ' ORDER BY ml.created_at DESC';
    const logs = db.prepare(query).all(...params);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/maintenance-logs', requireAuth, validateSchema(MaintenanceLogSchema), (req, res) => {
  try {
    const { project_id, client_id, type, description, cost, currency, performed_by, performed_at, next_maintenance_at, notes } = req.body;
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO maintenance_logs (id, project_id, client_id, type, description, cost, currency, performed_by, performed_at, next_maintenance_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, project_id || null, client_id || null, type || 'routine', description || null, cost || 0, currency || 'IQD', performed_by || null, performed_at || null, next_maintenance_at || null, notes || null);

    auditLogger.log(
      (req as any).user?.id, 'MAINTENANCE_LOG_CREATE', 'maintenance',
      null, { id, type, project_id, client_id },
      req.ip, req.headers['user-agent'] || null
    );

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/maintenance-logs/:id', requireAuth, (req, res) => {
  try {
    const { type, description, cost, currency, performed_by, performed_at, next_maintenance_at, notes } = req.body;
    db.prepare(`
      UPDATE maintenance_logs SET type = ?, description = ?, cost = ?, currency = ?, performed_by = ?, performed_at = ?, next_maintenance_at = ?, notes = ?
      WHERE id = ?
    `).run(type || 'routine', description || null, cost || 0, currency || 'IQD', performed_by || null, performed_at || null, next_maintenance_at || null, notes || null, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/maintenance-logs/:id', requireAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM maintenance_logs WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// SYSTEM COMPARISON — compare two system configurations side-by-side
// ═══════════════════════════════════════════════════════════════
app.post('/api/engineering/compare-systems', requireAuth, (req, res) => {
  try {
    const { system_a, system_b } = req.body;
    if (!system_a || !system_b) {
      return res.status(400).json({ error: 'Required: system_a and system_b configurations' });
    }

    const buildConfig = (sys: any) => ({
      system_type: sys.system_type || 'OFF_GRID',
      system_voltage: sys.system_voltage || 48,
      sun_hours: sys.sun_hours || 5,
      autonomy_hours: sys.autonomy_hours || 24,
      dod: sys.dod || 0.8,
      battery_efficiency: sys.efficiency || 0.95,
      temp_correction: sys.temp_correction || 1.1,
      future_expansion: sys.future_expansion || 1.2,
      losses: sys.losses || DEFAULT_LOSSES
    });

    const loads = (system_a.loads || system_b.loads || []).map((a: any) => ({
      ...a, qty: a.qty || 1, surge_factor: a.surge_factor || 1, usage_period: a.usage_period || 'both'
    }));

    const resultA = calculator.calculateFullSystem(loads, buildConfig(system_a));
    const resultB = calculator.calculateFullSystem(loads, buildConfig(system_b));

    res.json({
      system_a: { config: system_a, result: resultA },
      system_b: { config: system_b, result: resultB },
      comparison: {
        battery_diff_wh: resultA.battery.required_energy_wh - resultB.battery.required_energy_wh,
        solar_diff_w: resultA.solar.required_power_w - resultB.solar.required_power_w,
        a_needs_more_battery: resultA.battery.required_energy_wh > resultB.battery.required_energy_wh,
        a_needs_more_solar: resultA.solar.required_power_w > resultB.solar.required_power_w
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// BATTERY COMPARISON — Lithium vs Lead-Acid analysis
// ═══════════════════════════════════════════════════════════════
app.post('/api/engineering/battery-comparison', (req, res) => {
  try {
    const { required_energy_wh, system_voltage, cycles_per_year = 365 } = req.body;
    if (!required_energy_wh || !system_voltage) {
      return res.status(400).json({ error: 'Required: required_energy_wh, system_voltage' });
    }

    const required_ah = required_energy_wh / system_voltage;

    // Lead-Acid parameters
    const leadAcid = {
      type: 'lead_acid',
      usable_dod: 0.50,        // Only 50% usable
      cycle_life: 800,          // 800 cycles at 50% DoD
      cost_per_ah_usd: 3.5,    // Approximate USD per Ah
      weight_per_ah_kg: 0.35,  // kg per Ah
      lifetime_years: Math.min(Math.floor(800 / cycles_per_year), 5),
      required_ah_adjusted: required_ah / 0.50,
      efficiency: 0.80
    };

    // Lithium (LiFePO4) parameters
    const lithium = {
      type: 'lithium_lifepo4',
      usable_dod: 0.80,        // 80% usable
      cycle_life: 4000,         // 4000 cycles at 80% DoD
      cost_per_ah_usd: 7.0,    // Approximate USD per Ah
      weight_per_ah_kg: 0.12,  // kg per Ah
      lifetime_years: Math.min(Math.floor(4000 / cycles_per_year), 15),
      required_ah_adjusted: required_ah / 0.80,
      efficiency: 0.95
    };

    const rate = getExchangeRate();

    const leadCostTotal = leadAcid.required_ah_adjusted * leadAcid.cost_per_ah_usd;
    const lithCostTotal = lithium.required_ah_adjusted * lithium.cost_per_ah_usd;

    // Lifetime cost (replacements)
    const leadReplacements = Math.ceil(15 / leadAcid.lifetime_years) - 1; // Over 15 years
    const lithReplacements = Math.ceil(15 / lithium.lifetime_years) - 1;

    const leadLifetimeCost = leadCostTotal * (1 + leadReplacements);
    const lithLifetimeCost = lithCostTotal * (1 + lithReplacements);

    res.json({
      required_ah,
      system_voltage,
      lead_acid: {
        ...leadAcid,
        total_cost_usd: Math.round(leadCostTotal),
        total_cost_iqd: Math.round(leadCostTotal * rate),
        weight_kg: Math.round(leadAcid.required_ah_adjusted * leadAcid.weight_per_ah_kg),
        replacements_in_15y: leadReplacements,
        lifetime_cost_usd: Math.round(leadLifetimeCost),
        lifetime_cost_iqd: Math.round(leadLifetimeCost * rate)
      },
      lithium: {
        ...lithium,
        total_cost_usd: Math.round(lithCostTotal),
        total_cost_iqd: Math.round(lithCostTotal * rate),
        weight_kg: Math.round(lithium.required_ah_adjusted * lithium.weight_per_ah_kg),
        replacements_in_15y: lithReplacements,
        lifetime_cost_usd: Math.round(lithLifetimeCost),
        lifetime_cost_iqd: Math.round(lithLifetimeCost * rate)
      },
      recommendation: lithLifetimeCost < leadLifetimeCost ? 'lithium' : 'lead_acid',
      savings_usd: Math.abs(Math.round(leadLifetimeCost - lithLifetimeCost)),
      exchange_rate: rate
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ALERTS — system health notifications
// ═══════════════════════════════════════════════════════════════
app.get('/api/alerts', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const alerts: any[] = [];

    // 1. Low stock components
    const lowStock = db.prepare('SELECT id, brand, model, category, stock_qty FROM components WHERE stock_qty <= 5 AND is_active = 1').all() as any[];
    lowStock.forEach(c => {
      alerts.push({
        type: c.stock_qty === 0 ? 'critical' : 'warning',
        category: 'stock',
        title: `مخزون منخفض: ${c.brand} ${c.model}`,
        description: c.stock_qty === 0 ? 'نفد المخزون بالكامل' : `المتبقي: ${c.stock_qty} وحدة فقط`,
        entity_id: c.id,
        entity_type: 'component'
      });
    });

    // 2. Exchange rate change alerts (if changed in last 24h)
    const recentRateChange = db.prepare(
      "SELECT rate, created_at FROM exchange_rate_history WHERE created_at >= datetime('now', '-24 hours') ORDER BY created_at DESC LIMIT 1"
    ).get() as any;
    if (recentRateChange) {
      alerts.push({
        type: 'info',
        category: 'exchange_rate',
        title: 'تغيير سعر الصرف',
        description: `سعر الصرف الجديد: ${recentRateChange.rate.toLocaleString()} IQD/USD`,
        entity_id: null,
        entity_type: 'setting'
      });
    }

    // 3. Expiring quotes (draft quotes older than 14 days)
    const expiringQuotes = db.prepare(
      "SELECT id, quote_number, customer_name, created_at FROM quotes WHERE status = 'draft' AND created_at <= datetime('now', '-14 days')"
    ).all() as any[];
    expiringQuotes.forEach(q => {
      alerts.push({
        type: 'warning',
        category: 'quote_expiry',
        title: `عرض سعر منتهي: ${q.quote_number}`,
        description: `العميل: ${q.customer_name} — تجاوز 14 يوم`,
        entity_id: q.id,
        entity_type: 'quote'
      });
    });

    // 4. Upcoming maintenance
    const upcomingMaint = db.prepare(
      "SELECT ml.*, c.name as client_name FROM maintenance_logs ml LEFT JOIN clients c ON ml.client_id = c.id WHERE ml.next_maintenance_at IS NOT NULL AND ml.next_maintenance_at <= datetime('now', '+7 days') AND ml.next_maintenance_at >= datetime('now') ORDER BY ml.next_maintenance_at ASC LIMIT 10"
    ).all() as any[];
    upcomingMaint.forEach(m => {
      alerts.push({
        type: 'info',
        category: 'maintenance',
        title: `صيانة قادمة: ${m.client_name || 'مشروع'}`,
        description: `${m.type} — ${m.next_maintenance_at}`,
        entity_id: m.id,
        entity_type: 'maintenance'
      });
    });

    res.json({ alerts, count: alerts.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ANNUAL CONSUMPTION ANALYSIS
// ═══════════════════════════════════════════════════════════════
app.post('/api/engineering/annual-analysis', requireAuth, (req, res) => {
  try {
    const { loads, sun_hours = 5, system_type = 'OFF_GRID', region_name } = req.body;
    if (!loads || !Array.isArray(loads) || loads.length === 0) {
      return res.status(400).json({ error: 'Required: loads array' });
    }

    const parsedLoads = loads.map((a: any) => ({
      ...a, qty: a.qty || 1, surge_factor: a.surge_factor || 1, usage_period: a.usage_period || 'both'
    }));

    const config = {
      system_type: system_type as SystemType,
      system_voltage: 48,
      sun_hours,
      autonomy_hours: 24,
      dod: 0.8,
      battery_efficiency: 0.95,
      temp_correction: 1.1,
      future_expansion: 1.0, // No expansion for analysis
      losses: DEFAULT_LOSSES
    };

    const result = calculator.calculateFullSystem(parsedLoads, config);

    // Monthly variation (Iraq has seasonal sun hours)
    const monthlyFactor = [0.85, 0.90, 1.0, 1.05, 1.10, 1.15, 1.15, 1.10, 1.05, 1.0, 0.90, 0.85];
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    const monthlyBreakdown = monthlyFactor.map((factor, i) => ({
      month: monthNames[i],
      month_index: i + 1,
      daily_consumption_wh: Math.round(result.load_profile.total_wh * factor),
      monthly_consumption_kwh: Math.round((result.load_profile.total_wh * factor * 30) / 1000),
      solar_generation_wh: Math.round(result.solar.required_power_w * sun_hours * factor),
      surplus_deficit_wh: Math.round(result.solar.required_power_w * sun_hours * factor - result.load_profile.total_wh * factor)
    }));

    const annualConsumption = monthlyBreakdown.reduce((sum, m) => sum + m.monthly_consumption_kwh, 0);

    res.json({
      region: region_name || 'غير محدد',
      system_type,
      sun_hours,
      daily_consumption_wh: result.load_profile.total_wh,
      annual_consumption_kwh: annualConsumption,
      peak_load_w: result.load_profile.peak_continuous_w,
      peak_surge_w: result.load_profile.peak_surge_w,
      monthly_breakdown: monthlyBreakdown,
      load_profile: result.load_profile
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// FUTURE EXPANSION CALCULATOR
// ═══════════════════════════════════════════════════════════════
app.post('/api/engineering/expansion-plan', requireAuth, (req, res) => {
  try {
    const { current_system, additional_loads } = req.body;
    if (!current_system || !additional_loads) {
      return res.status(400).json({ error: 'Required: current_system, additional_loads' });
    }

    // Calculate current system
    const currentLoads = (current_system.loads || []).map((a: any) => ({
      ...a, qty: a.qty || 1, surge_factor: a.surge_factor || 1, usage_period: a.usage_period || 'both'
    }));

    const expandedLoads = [
      ...currentLoads,
      ...(additional_loads || []).map((a: any) => ({
        ...a, qty: a.qty || 1, surge_factor: a.surge_factor || 1, usage_period: a.usage_period || 'both'
      }))
    ];

    const config = {
      system_type: (current_system.system_type || 'OFF_GRID') as SystemType,
      system_voltage: current_system.system_voltage || 48,
      sun_hours: current_system.sun_hours || 5,
      autonomy_hours: 24,
      dod: 0.8,
      battery_efficiency: 0.95,
      temp_correction: 1.1,
      future_expansion: 1.0,
      losses: DEFAULT_LOSSES
    };

    const currentResult = calculator.calculateFullSystem(currentLoads, config);
    const expandedResult = calculator.calculateFullSystem(expandedLoads, config);

    res.json({
      current: {
        total_wh: currentResult.load_profile.total_wh,
        panels_w: currentResult.solar.required_power_w,
        battery_wh: currentResult.battery.required_energy_wh,
        peak_w: currentResult.load_profile.peak_continuous_w
      },
      expanded: {
        total_wh: expandedResult.load_profile.total_wh,
        panels_w: expandedResult.solar.required_power_w,
        battery_wh: expandedResult.battery.required_energy_wh,
        peak_w: expandedResult.load_profile.peak_continuous_w
      },
      additional_needed: {
        panels_w: Math.max(0, expandedResult.solar.required_power_w - currentResult.solar.required_power_w),
        battery_wh: Math.max(0, expandedResult.battery.required_energy_wh - currentResult.battery.required_energy_wh),
        inverter_upgrade_needed: expandedResult.load_profile.peak_surge_w > currentResult.load_profile.peak_surge_w * 1.1
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// AI DOMAIN ENGINE API
// ═══════════════════════════════════════════════════════════════

// ─── Rate Limiter State (in-memory sliding window) ───
const aiRateLimiter = new Map<string, number[]>();
function checkAiRateLimit(key: string, maxPerHour: number = 30): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const timestamps = (aiRateLimiter.get(key) || []).filter(t => now - t < windowMs);
  if (timestamps.length >= maxPerHour) return false;
  timestamps.push(now);
  aiRateLimiter.set(key, timestamps);
  return true;
}

// ─── AI Chat ───
app.post('/api/ai/chat', requireAuth, validateSchema(AIChatSchema), async (req, res) => {
  try {
    const { sessionId, message, persona } = req.body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required.' });
    }
    if (message.length > 5000) {
      return res.status(400).json({ error: 'Message too long. Max 5000 characters.' });
    }

    const sid = sessionId || uuidv4();
    const ip = req.ip || 'unknown';

    // Rate limit: per session (30/hr) and per IP (60/hr)
    if (!checkAiRateLimit(`session:${sid}`, 30)) {
      return res.status(429).json({ error: 'تم تجاوز الحد الأقصى للرسائل في الساعة (30 رسالة). حاول لاحقاً.' });
    }
    if (!checkAiRateLimit(`ip:${ip}`, 60)) {
      return res.status(429).json({ error: 'Rate limit exceeded.' });
    }

    const personaId = persona && PERSONAS[persona] ? persona : 'engineer';
    const responseText = await AIService.processChat(sid, message.trim(), personaId, ip);

    res.json({ sessionId: sid, reply: responseText });
  } catch (err: any) {
    console.error('AI Chat Error:', err);
    res.status(500).json({ error: err.message || 'AI processing failed.' });
  }
});

// ─── AI Internal Tool Endpoints ───
app.post('/api/amper-quote', (req, res) => {
  try {
    const { amps, sun_hours } = req.body;
    if (!amps) return res.status(400).json({ error: 'amps required' });

    // Default abpe settings for AI generated quotes
    const settings = {
      abpe_dod: 80,
      abpe_eff: 90,
      system_type: 'OFF_GRID',
      wholesale_margin: 1.15,
      retail_margin: 1.30
    };

    const quote = generateQuoteHelper(Number(amps), settings, Number(sun_hours) || 5.0);
    res.json(quote);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── AI Sessions ───
app.get('/api/ai/sessions', requireAuth, (req, res) => {
  try {
    const sessions = db.prepare(
      'SELECT id, persona, total_tokens, message_count, created_at, updated_at FROM ai_chat_sessions ORDER BY updated_at DESC LIMIT 50'
    ).all();
    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ai/sessions/:id', requireAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM ai_chat_sessions WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Knowledge Sources CRUD ───
app.get('/api/ai/knowledge-sources', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const sources = db.prepare('SELECT id, title, source_type, is_active, chunks_count, created_at FROM ai_knowledge_sources ORDER BY created_at DESC').all();
    res.json(sources);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/knowledge-sources', requireAuth, requireRole(['admin']), validateSchema(AIKnowledgeSourceSchema), async (req, res) => {
  try {
    const { title, content, source_type, structured_data } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required.' });
    }

    const id = uuidv4();
    db.prepare(
      'INSERT INTO ai_knowledge_sources (id, title, content, source_type, structured_data) VALUES (?, ?, ?, ?, ?)'
    ).run(id, title, content, source_type || 'text', structured_data ? JSON.stringify(structured_data) : null);

    // Auto-chunk and embed
    let chunksCount = 0;
    try {
      chunksCount = await AIService.chunkAndEmbedKnowledge(id, content);
    } catch (embedErr: any) {
      console.error('Embedding failed (source saved without embeddings):', embedErr.message);
    }

    res.json({ id, title, chunks_count: chunksCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// [REMOVED] /api/debug-knowledge — insecure debug endpoint deleted in Phase 1 security hardening

app.put('/api/ai/knowledge-sources/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { title, content, source_type, is_active, structured_data } = req.body;
    const existing = db.prepare('SELECT * FROM ai_knowledge_sources WHERE id = ?').get(req.params.id) as any;
    if (!existing) return res.status(404).json({ error: 'Source not found.' });

    db.prepare(
      'UPDATE ai_knowledge_sources SET title = ?, content = ?, source_type = ?, is_active = ?, structured_data = ? WHERE id = ?'
    ).run(
      title || existing.title,
      content || existing.content,
      source_type || existing.source_type,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      structured_data ? JSON.stringify(structured_data) : existing.structured_data,
      req.params.id
    );

    // Re-chunk if content changed
    if (content && content !== existing.content) {
      // Delete old chunks
      db.prepare('DELETE FROM ai_knowledge_chunks WHERE source_id = ?').run(req.params.id);
      embeddingCache.removeBySource(req.params.id);
      // Re-embed
      await AIService.chunkAndEmbedKnowledge(req.params.id, content);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ai/knowledge-sources/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    // Remove from cache first
    embeddingCache.removeBySource(req.params.id);
    // Then from DB (cascade deletes chunks)
    db.prepare('DELETE FROM ai_knowledge_sources WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AI Settings ───
app.get('/api/ai/settings', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const promptRow = db.prepare("SELECT value_json FROM global_settings WHERE key_name = 'ai_system_prompt'").get() as any;
    const configRow = db.prepare("SELECT value_json FROM global_settings WHERE key_name = 'ai_config'").get() as any;

    let apiKey = '';
    let model = 'gemini-2.5-flash';
    if (configRow?.value_json) {
      const config = JSON.parse(configRow.value_json);
      apiKey = config.apiKey || '';
      model = config.model || 'gemini-2.5-flash';
    }

    res.json({
      system_prompt: promptRow ? JSON.parse(promptRow.value_json) : '',
      api_key_configured: !!process.env.GEMINI_API_KEY || !!apiKey,
      api_key_masked: apiKey ? apiKey.substring(0, 4) + '****' + apiKey.slice(-4) : null,
      model: model,
      personas: Object.keys(PERSONAS)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/ai/settings', requireAuth, requireRole(['admin']), validateSchema(AISettingsSchema), (req, res) => {
  try {
    const { system_prompt, api_key, model } = req.body;

    if (system_prompt !== undefined) {
      db.prepare("INSERT INTO global_settings (id, key_name, value_json) VALUES (?, 'ai_system_prompt', ?) ON CONFLICT(key_name) DO UPDATE SET value_json = excluded.value_json")
        .run(uuidv4(), JSON.stringify(system_prompt));
    }

    if (api_key !== undefined || model !== undefined) {
      // Get current to merge
      let currentConfig: any = {};
      const configRow = db.prepare("SELECT value_json FROM global_settings WHERE key_name = 'ai_config'").get() as any;
      if (configRow?.value_json) {
        currentConfig = JSON.parse(configRow.value_json);
      }

      const newConfig = {
        apiKey: api_key !== undefined ? api_key : currentConfig.apiKey,
        model: model !== undefined ? model : (currentConfig.model || 'gemini-2.5-flash')
      };

      db.prepare("INSERT INTO global_settings (id, key_name, value_json) VALUES (?, 'ai_config', ?) ON CONFLICT(key_name) DO UPDATE SET value_json = excluded.value_json")
        .run(uuidv4(), JSON.stringify(newConfig));
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Usage Analytics ───
app.get('/api/ai/usage-stats', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const totals = db.prepare(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(cost_estimate_usd) as total_cost_usd,
        AVG(response_time_ms) as avg_response_time_ms
      FROM ai_usage_logs
    `).get();

    const recentLogs = db.prepare(
      'SELECT * FROM ai_usage_logs ORDER BY created_at DESC LIMIT 20'
    ).all();

    const toolUsage = db.prepare(`
      SELECT tool_called, COUNT(*) as count 
      FROM ai_usage_logs 
      WHERE tool_called IS NOT NULL 
      GROUP BY tool_called 
      ORDER BY count DESC
    `).all();

    res.json({ totals, recentLogs, toolUsage });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Attach global error handler at the very end
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});
