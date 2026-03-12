import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const db = new Database('solar.db');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    base_currency TEXT DEFAULT 'USD',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    name TEXT,
    customer_name TEXT,
    customer_contact TEXT,
    address TEXT,
    sun_hours REAL,
    system_voltage INTEGER,
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS load_items (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    name TEXT,
    type TEXT,
    voltage REAL,
    amps REAL,
    watts REAL,
    hours_daily REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS components (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    sku TEXT,
    category TEXT,
    brand TEXT,
    model TEXT,
    spec TEXT,
    cost_price REAL,
    sale_price REAL,
    purchase_price REAL,
    wholesale_price REAL,
    retail_price REAL,
    currency TEXT DEFAULT 'USD',
    stock_qty INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'pcs',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS regions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT NOT NULL,
    sun_hours REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS appliances (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT NOT NULL,
    icon TEXT,
    default_watts REAL NOT NULL,
    surge_factor REAL DEFAULT 1.0,
    type TEXT DEFAULT 'AC'
  );

  CREATE TABLE IF NOT EXISTS global_settings (
    id TEXT PRIMARY KEY,
    key_name TEXT UNIQUE,
    value_json TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY,
    quote_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    status TEXT DEFAULT 'draft',
    pricing_layer TEXT NOT NULL,
    total_material_cost REAL NOT NULL,
    total_selling_price REAL NOT NULL,
    total_profit REAL NOT NULL,
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quote_items (
    id TEXT PRIMARY KEY,
    quote_id TEXT,
    component_id TEXT,
    component_snapshot_name TEXT NOT NULL,
    unit_price_snapshot REAL NOT NULL,
    quantity INTEGER NOT NULL,
    total_price REAL NOT NULL,
    FOREIGN KEY(quote_id) REFERENCES quotes(id)
  );

  CREATE TABLE IF NOT EXISTS workspace_presets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    workspace_state_json TEXT NOT NULL,
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Gracefully try to add refresh_token_hash col to users
try {
  db.exec('ALTER TABLE users ADD COLUMN refresh_token_hash TEXT;');
} catch (e: any) {
  // column likely exists
}

// P1.1: Force password change flag (default admin must change password on first login)
try {
  db.exec('ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0;');
} catch (e: any) { /* column likely exists */ }

// Set must_change_password = 1 for any user still using the default admin hash
try {
  const defaultHash = '$2a$12$NqL9E4KqEqF4W3MofS00QO/l0i11E/D.D1X8y8.L/I4g2w9F1A4R.';
  db.prepare('UPDATE users SET must_change_password = 1 WHERE password_hash = ?').run(defaultHash);
} catch (e: any) { /* ignore */ }

// Gracefully try to add new pricing columns to components
try {
  db.exec('ALTER TABLE components ADD COLUMN purchase_price REAL;');
  db.exec('ALTER TABLE components ADD COLUMN wholesale_price REAL;');
  db.exec('ALTER TABLE components ADD COLUMN retail_price REAL;');
  db.exec('ALTER TABLE components ADD COLUMN is_active INTEGER DEFAULT 1;');
} catch (e: any) {
  // columns likely exist
}

// === Dynamic Pricing System ===

// Add margin_percent to components
try {
  db.exec('ALTER TABLE components ADD COLUMN margin_percent REAL;');
} catch (e: any) { /* column likely exists */ }

// Exchange rate history table
db.exec(`
  CREATE TABLE IF NOT EXISTS exchange_rate_history (
    id TEXT PRIMARY KEY,
    rate REAL NOT NULL,
    changed_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Add snapshot columns to quotes
try {
  db.exec('ALTER TABLE quotes ADD COLUMN exchange_rate_snapshot REAL;');
} catch (e: any) { /* exists */ }
try {
  db.exec('ALTER TABLE quotes ADD COLUMN currency TEXT DEFAULT \'IQD\';');
} catch (e: any) { /* exists */ }

// --- Discount & Approval Columns ---
try { db.exec('ALTER TABLE quotes ADD COLUMN subtotal REAL;'); } catch (e: any) { /* exists */ }
try { db.exec('ALTER TABLE quotes ADD COLUMN discount_type TEXT DEFAULT \'fixed\';'); } catch (e: any) { /* exists */ }
try { db.exec('ALTER TABLE quotes ADD COLUMN discount_value REAL DEFAULT 0;'); } catch (e: any) { /* exists */ }
try { db.exec('ALTER TABLE quotes ADD COLUMN discount_applied_amount REAL DEFAULT 0;'); } catch (e: any) { /* exists */ }
try { db.exec('ALTER TABLE quotes ADD COLUMN net_total REAL;'); } catch (e: any) { /* exists */ }
try { db.exec('ALTER TABLE quotes ADD COLUMN approved_by TEXT;'); } catch (e: any) { /* exists */ }
try { db.exec('ALTER TABLE quotes ADD COLUMN approval_required_flag INTEGER DEFAULT 0;'); } catch (e: any) { /* exists */ }

// Add snapshot columns to quote_items
try {
  db.exec('ALTER TABLE components ADD COLUMN battery_chemistry TEXT CHECK(battery_chemistry IN (\'LITHIUM\', \'GEL\', \'LEAD_ACID\', \'TUBULAR\'));');
} catch (e: any) { /* exists */ }

try {
  db.exec('ALTER TABLE quote_items ADD COLUMN cost_price_snapshot REAL;');
} catch (e: any) { /* exists */ }
try {
  db.exec('ALTER TABLE quote_items ADD COLUMN margin_percent_snapshot REAL;');
} catch (e: any) { /* exists */ }
try {
  db.exec('ALTER TABLE quote_items ADD COLUMN currency_snapshot TEXT;');
} catch (e: any) { /* exists */ }
try {
  db.exec('ALTER TABLE quote_items ADD COLUMN exchange_rate_snapshot REAL;');
} catch (e: any) { /* exists */ }

// Add exchange_rate_snapshot and notes to quotes
try {
  db.exec('ALTER TABLE quotes ADD COLUMN exchange_rate_snapshot REAL;');
} catch (e: any) { /* exists */ }
try {
  db.exec('ALTER TABLE quotes ADD COLUMN notes TEXT;');
} catch (e: any) { /* exists */ }

// Price History table — tracks every cost_price / margin change with reason
db.exec(`
  CREATE TABLE IF NOT EXISTS price_history (
    id TEXT PRIMARY KEY,
    component_id TEXT NOT NULL,
    old_cost_price REAL,
    new_cost_price REAL,
    old_margin REAL,
    new_margin REAL,
    reason TEXT,
    changed_by TEXT,
    changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(component_id) REFERENCES components(id)
  );
`);

// ─── Clients Table ───────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id)
  );
`);

// ─── Cost Components Table (accessories, installation, configurable fees) ───
db.exec(`
  CREATE TABLE IF NOT EXISTS cost_components (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'percentage',  -- 'percentage' or 'fixed'
    value REAL NOT NULL DEFAULT 0,            -- percentage (e.g., 10) or fixed amount
    currency TEXT DEFAULT 'IQD',
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed default cost components if empty
const costCompCount = db.prepare('SELECT COUNT(*) as count FROM cost_components').get() as { count: number };
if (costCompCount.count === 0) {
  const insertCostComp = db.prepare('INSERT INTO cost_components (id, name, name_en, type, value, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
  insertCostComp.run(uuidv4(), 'ملحقات ومواد إضافية', 'Accessories & Misc', 'percentage', 10, 1);
  insertCostComp.run(uuidv4(), 'أجور التركيب', 'Installation Labor', 'percentage', 5, 2);
  insertCostComp.run(uuidv4(), 'كابلات', 'Cables', 'percentage', 3, 3);
  insertCostComp.run(uuidv4(), 'هيكل تثبيت', 'Mounting Structure', 'percentage', 5, 4);
}

// ─── Quote Engineering Snapshot (store engineering data with each quote) ───
db.exec(`
  CREATE TABLE IF NOT EXISTS quote_engineering_snapshot (
    id TEXT PRIMARY KEY,
    quote_id TEXT NOT NULL,
    system_type TEXT,
    system_voltage INTEGER,
    sun_hours REAL,
    total_wh REAL,
    day_wh REAL,
    night_wh REAL,
    peak_continuous_w REAL,
    peak_surge_w REAL,
    loss_factor REAL,
    total_wh_after_losses REAL,
    required_ah REAL,
    required_panel_w REAL,
    autonomy_hours REAL,
    dod REAL,
    efficiency REAL,
    temp_correction REAL,
    future_expansion REAL,
    cable_loss REAL,
    temp_derating REAL,
    dust_factor REAL,
    inverter_efficiency REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(quote_id) REFERENCES quotes(id)
  );
`);

// ─── Maintenance Logs Table (post-sale maintenance tracking) ───
db.exec(`
  CREATE TABLE IF NOT EXISTS maintenance_logs (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    client_id TEXT,
    type TEXT NOT NULL DEFAULT 'routine',    -- 'routine', 'repair', 'inspection', 'cleaning', 'warranty'
    description TEXT,
    cost REAL DEFAULT 0,
    currency TEXT DEFAULT 'IQD',
    performed_by TEXT,
    performed_at TEXT,
    next_maintenance_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id),
    FOREIGN KEY(client_id) REFERENCES clients(id)
  );
`);

// ─── Quote Cost Items (store accessories/installation fees per quote) ───
db.exec(`
  CREATE TABLE IF NOT EXISTS quote_cost_items (
    id TEXT PRIMARY KEY,
    quote_id TEXT NOT NULL,
    cost_component_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'percentage',
    value REAL NOT NULL DEFAULT 0,
    calculated_amount REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(quote_id) REFERENCES quotes(id),
    FOREIGN KEY(cost_component_id) REFERENCES cost_components(id)
  );
`);

// Add client_id to quotes and projects
try { db.exec('ALTER TABLE quotes ADD COLUMN client_id TEXT REFERENCES clients(id);'); } catch (e: any) { /* exists */ }
try { db.exec('ALTER TABLE projects ADD COLUMN client_id TEXT REFERENCES clients(id);'); } catch (e: any) { /* exists */ }


// Seed data if empty
const companyCount = db.prepare('SELECT COUNT(*) as count FROM companies').get() as { count: number };
if (companyCount.count === 0) {
  const companyId = uuidv4();
  db.prepare('INSERT INTO companies (id, name, base_currency) VALUES (?, ?, ?)').run(companyId, 'شركة الشمس الذكية', 'USD');

  // "admin123" hashed with salt rounds = 12
  const defaultHash = '$2a$12$NqL9E4KqEqF4W3MofS00QO/l0i11E/D.D1X8y8.L/I4g2w9F1A4R.';
  db.prepare('INSERT INTO users (id, company_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').run(
    uuidv4(), companyId, 'Admin', 'admin@solar.test', defaultHash, 'admin'
  );

  const insertComp = db.prepare('INSERT INTO components (id, company_id, sku, category, brand, model, spec, cost_price, sale_price, purchase_price, wholesale_price, retail_price, stock_qty, currency, margin_percent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

  insertComp.run(uuidv4(), companyId, 'P-550X', 'panel', 'BrandX', '550W Mono', JSON.stringify({ w: 550, v: 48 }), 110, 150, 110, 130, 150, 100, 'USD', null);
  insertComp.run(uuidv4(), companyId, 'BAT-200-LFP', 'battery', 'BatCo', '200Ah-48V LiFePO4', JSON.stringify({ Ah: 200, V: 48, type: 'LiFePO4' }), 800, 1100, 800, 950, 1100, 20, 'USD', null);
  insertComp.run(uuidv4(), companyId, 'BAT-200-GEL', 'battery', 'BatCo', '200Ah-12V GEL', JSON.stringify({ Ah: 200, V: 12, type: 'GEL' }), 200, 300, 200, 250, 300, 50, 'USD', null);
  insertComp.run(uuidv4(), companyId, 'MPPT-80', 'controller', 'Ctrl', 'MPPT 80A', JSON.stringify({ A: 80 }), 250, 380, 250, 300, 380, 10, 'USD', null);
  insertComp.run(uuidv4(), companyId, 'INV-5KW', 'inverter', 'InvCo', '5kW-48V Hybrid', JSON.stringify({ W: 5000, V: 48, type: 'Hybrid' }), 400, 650, 400, 500, 650, 15, 'USD', null);

  // Seed Regions
  const insertRegion = db.prepare('INSERT INTO regions (id, name, name_en, sun_hours) VALUES (?, ?, ?, ?)');
  const regions = [
    ['بغداد', 'Baghdad', 5.5],
    ['البصرة', 'Basra', 6.0],
    ['نينوى', 'Nineveh', 5.0],
    ['أربيل', 'Erbil', 4.8],
    ['دهوك', 'Duhok', 4.6],
    ['السليمانية', 'Sulaymaniyah', 4.7],
    ['كربلاء', 'Karbala', 5.6],
    ['النجف', 'Najaf', 5.7],
    ['ذي قار', 'Dhi Qar', 5.9],
    ['ميسان', 'Maysan', 5.8],
    ['واسط', 'Wasit', 5.6],
    ['ديالى', 'Diyala', 5.4],
    ['الأنبار', 'Anbar', 5.8],
    ['بابل', 'Babil', 5.5],
    ['القادسية', 'Qadisiyyah', 5.6],
    ['المثنى', 'Muthanna', 5.8],
    ['صلاح الدين', 'Salah al-Din', 5.3],
    ['كركوك', 'Kirkuk', 5.1]
  ];
  for (const r of regions) {
    insertRegion.run(uuidv4(), r[0], r[1], r[2]);
  }

  // Seed Appliances
  const insertAppliance = db.prepare('INSERT INTO appliances (id, name, name_en, icon, default_watts, surge_factor, type) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertAppliance.run(uuidv4(), 'تلفاز', 'TV', 'tv', 100, 1.0, 'AC');
  insertAppliance.run(uuidv4(), 'ثلاجة', 'Refrigerator', 'refrigerator', 200, 3.0, 'AC');
  insertAppliance.run(uuidv4(), 'مكيف 1 طن', 'AC 1 Ton', 'air-vent', 1200, 2.5, 'AC');
  insertAppliance.run(uuidv4(), 'مكيف 2 طن', 'AC 2 Ton', 'air-vent', 2400, 2.5, 'AC');
  insertAppliance.run(uuidv4(), 'مروحة سقفية', 'Ceiling Fan', 'fan', 60, 1.2, 'AC');
  insertAppliance.run(uuidv4(), 'إضاءة LED', 'LED Light', 'lightbulb', 15, 1.0, 'AC');
  insertAppliance.run(uuidv4(), 'مضخة ماء', 'Water Pump', 'droplet', 750, 3.0, 'AC');

  // Seed Global Settings for ABPE
  const insertSetting = db.prepare('INSERT INTO global_settings (id, key_name, value_json) VALUES (?, ?, ?)');
  const defaultSettings: Record<string, any> = {
    abpe_voltage: 220,
    abpe_phase: 'single',
    abpe_hours: 3,
    abpe_dod: 0.8,
    abpe_eff: 0.95,
    abpe_surge: 1.2,
    abpe_exp_margin: 1.2,
    wholesale_margin: 1.15,
    retail_margin: 1.30,
    // Dynamic Pricing settings
    usd_to_iqd: 1500,
    default_margin_percent: 15
  };
  for (const [key, val] of Object.entries(defaultSettings)) {
    insertSetting.run(uuidv4(), key, JSON.stringify(val));
  }

  // Seed initial exchange rate history
  db.prepare('INSERT INTO exchange_rate_history (id, rate, changed_by) VALUES (?, ?, ?)').run(
    uuidv4(), 1500, 'system'
  );
}

// Ensure usd_to_iqd and default_margin_percent exist (for existing databases)
const existingRate = db.prepare("SELECT id FROM global_settings WHERE key_name = 'usd_to_iqd'").get();
if (!existingRate) {
  db.prepare('INSERT INTO global_settings (id, key_name, value_json) VALUES (?, ?, ?)').run(
    uuidv4(), 'usd_to_iqd', JSON.stringify(1500)
  );
  db.prepare('INSERT INTO exchange_rate_history (id, rate, changed_by) VALUES (?, ?, ?)').run(
    uuidv4(), 1500, 'system'
  );
}
const existingMargin = db.prepare("SELECT id FROM global_settings WHERE key_name = 'default_margin_percent'").get();
if (!existingMargin) {
  db.prepare('INSERT INTO global_settings (id, key_name, value_json) VALUES (?, ?, ?)').run(
    uuidv4(), 'default_margin_percent', JSON.stringify(15)
  );
}

// ─── Bulk Pricing Tiers (quantity-based discounts) ───
db.exec(`
  CREATE TABLE IF NOT EXISTS component_pricing_tiers (
    id TEXT PRIMARY KEY,
    component_id TEXT NOT NULL,
    min_qty INTEGER NOT NULL DEFAULT 1,
    max_qty INTEGER NOT NULL DEFAULT 999999,
    discount_percent REAL NOT NULL DEFAULT 0,
    valid_from TEXT,
    valid_to TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(component_id) REFERENCES components(id) ON DELETE CASCADE
  );
`);

// ─── Client-Specific Pricing Overrides ───
db.exec(`
  CREATE TABLE IF NOT EXISTS client_pricing_overrides (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    component_id TEXT,
    category TEXT,
    discount_percent REAL NOT NULL DEFAULT 0,
    valid_from TEXT,
    valid_to TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY(component_id) REFERENCES components(id) ON DELETE CASCADE
  );
`);

// ═══════════════════════════════════════════════════════════════
// AI DOMAIN ENGINE TABLES
// ═══════════════════════════════════════════════════════════════

// ─── Knowledge Sources (original documents + structured specs) ───
db.exec(`
  CREATE TABLE IF NOT EXISTS ai_knowledge_sources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_type TEXT DEFAULT 'text',
    structured_data TEXT,
    is_active INTEGER DEFAULT 1,
    chunks_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// ─── Knowledge Chunks (RAG embeddings) ───
db.exec(`
  CREATE TABLE IF NOT EXISTS ai_knowledge_chunks (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(source_id) REFERENCES ai_knowledge_sources(id) ON DELETE CASCADE
  );
`);

// ─── Chat Sessions (server-side) ───
db.exec(`
  CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id TEXT PRIMARY KEY,
    messages TEXT NOT NULL DEFAULT '[]',
    persona TEXT DEFAULT 'engineer',
    total_tokens INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// ─── Usage Analytics + Cost Tracking ───
db.exec(`
  CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    embedding_tokens INTEGER DEFAULT 0,
    cost_estimate_usd REAL DEFAULT 0,
    response_time_ms INTEGER DEFAULT 0,
    tool_called TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed default AI system prompt if not exists
const existingAiPrompt = db.prepare("SELECT id FROM global_settings WHERE key_name = 'ai_system_prompt'").get();
if (!existingAiPrompt) {
  db.prepare('INSERT INTO global_settings (id, key_name, value_json) VALUES (?, ?, ?)').run(
    uuidv4(), 'ai_system_prompt', JSON.stringify(
      'أنت مهندس طاقة شمسية متخصص في تصميم وتركيب المنظومات الشمسية في العراق والشرق الأوسط. ' +
      'لديك خبرة عميقة في: حساب الأحمال الكهربائية، تحجيم الألواح الشمسية، اختيار البطاريات والانفرترات، ' +
      'حساب فقدان الكابلات، تحليل MPPT، حساب العائد على الاستثمار، وتحليل المخاطر البيئية. ' +
      'استخدم الأدوات المتاحة لك لإجراء الحسابات الدقيقة بدلاً من التخمين. ' +
      'أجب دائماً باللغة العربية إلا إذا طُلب منك غير ذلك. ' +
      'استخدم الوحدات الصحيحة (W, kW, kWh, Ah, V, A) في إجاباتك.'
    )
  );
}

// ─── Enable Foreign Keys ───
db.pragma('foreign_keys = ON');

// ─── Performance Indexes ───
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
  CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
  CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);
  CREATE INDEX IF NOT EXISTS idx_quotes_created_by ON quotes(created_by);
  CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
  CREATE INDEX IF NOT EXISTS idx_components_category ON components(category);
  CREATE INDEX IF NOT EXISTS idx_components_is_active ON components(is_active);
  CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
  CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
  CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_price_history_component_id ON price_history(component_id);
  CREATE INDEX IF NOT EXISTS idx_exchange_rate_history_created_at ON exchange_rate_history(created_at);
  CREATE INDEX IF NOT EXISTS idx_maintenance_logs_project_id ON maintenance_logs(project_id);
  CREATE INDEX IF NOT EXISTS idx_maintenance_logs_client_id ON maintenance_logs(client_id);
  CREATE INDEX IF NOT EXISTS idx_quote_engineering_snapshot_quote_id ON quote_engineering_snapshot(quote_id);
  CREATE INDEX IF NOT EXISTS idx_quote_cost_items_quote_id ON quote_cost_items(quote_id);
  CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
  CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_load_items_project_id ON load_items(project_id);
  CREATE INDEX IF NOT EXISTS idx_quote_items_component_id ON quote_items(component_id);
  CREATE INDEX IF NOT EXISTS idx_pricing_tiers_component_id ON component_pricing_tiers(component_id);
  CREATE INDEX IF NOT EXISTS idx_client_pricing_client_id ON client_pricing_overrides(client_id);
  CREATE INDEX IF NOT EXISTS idx_client_pricing_component_id ON client_pricing_overrides(component_id);
  CREATE INDEX IF NOT EXISTS idx_components_brand ON components(brand);
  CREATE INDEX IF NOT EXISTS idx_ai_chunks_source_id ON ai_knowledge_chunks(source_id);
  CREATE INDEX IF NOT EXISTS idx_ai_usage_session_id ON ai_usage_logs(session_id);
  CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_ai_sessions_updated_at ON ai_chat_sessions(updated_at);
`);

export { db };

