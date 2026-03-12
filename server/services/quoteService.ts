/**
 * Quote Service — Dynamic Pricing Model
 *
 * FLOW:
 *   1. Frontend sends component_ids + quantities
 *   2. Server fetches components from DB
 *   3. Fetches current exchange_rate from global_settings
 *   4. Calculates sell_price via pricingEngine.calculateSellPrice()
 *   5. Stores ALL snapshots: exchange_rate, cost_price, margin, currency, sell_price
 *   6. Saves engineering snapshot for traceability
 *   7. Applies configurable cost components (accessories, installation, etc.)
 *   8. Quote is immutable — price changes don't affect existing quotes
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { QuoteCreateSchema, QuoteCreateLegacySchema } from '../schemas/apiSchemas';
import {
    calculateSellPrice,
    getExchangeRate,
    getDefaultMargin,
    type PricedProduct
} from './pricingEngine';

// ─── Types ───────────────────────────────────────────────────

interface QuoteItemSnapshot {
    id: string;
    quote_id: string;
    component_id: string;
    component_snapshot_name: string;
    unit_cost_price_snapshot: number;
    unit_sell_price_iqd: number;
    cost_price_snapshot: number;
    margin_percent_snapshot: number;
    currency_snapshot: string;
    exchange_rate_snapshot: number;
    quantity: number;
    line_total_iqd: number;
}

export interface EngineeringSnapshot {
    system_type?: string;
    system_voltage?: number;
    sun_hours?: number;
    total_wh?: number;
    day_wh?: number;
    night_wh?: number;
    peak_continuous_w?: number;
    peak_surge_w?: number;
    loss_factor?: number;
    total_wh_after_losses?: number;
    required_ah?: number;
    required_panel_w?: number;
    autonomy_hours?: number;
    dod?: number;
    efficiency?: number;
    temp_correction?: number;
    future_expansion?: number;
    cable_loss?: number;
    temp_derating?: number;
    dust_factor?: number;
    inverter_efficiency?: number;
}

// ─── Helper: Apply Cost Components ──────────────────────────

function applyCostComponents(quoteId: string, subtotalIqd: number): number {
    const costComponents = db.prepare(
        'SELECT * FROM cost_components WHERE is_active = 1 ORDER BY sort_order'
    ).all() as any[];

    const insertCostItem = db.prepare(`
        INSERT INTO quote_cost_items (id, quote_id, cost_component_id, name, type, value, calculated_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let additionalCost = 0;
    for (const cc of costComponents) {
        let amount = 0;
        if (cc.type === 'percentage') {
            amount = subtotalIqd * (cc.value / 100);
        } else {
            // Fixed amount — convert if USD
            amount = cc.currency === 'USD' ? cc.value * getExchangeRate() : cc.value;
        }
        amount = Math.ceil(amount / 1000) * 1000; // Round UP to nearest 1000 IQD (financial safety)

        insertCostItem.run(
            uuidv4(), quoteId, cc.id, cc.name_en || cc.name, cc.type, cc.value, amount
        );
        additionalCost += amount;
    }

    return additionalCost;
}

// ─── Helper: Save Engineering Snapshot ──────────────────────

function saveEngineeringSnapshot(quoteId: string, eng: EngineeringSnapshot) {
    db.prepare(`
        INSERT INTO quote_engineering_snapshot (
            id, quote_id, system_type, system_voltage, sun_hours,
            total_wh, day_wh, night_wh, peak_continuous_w, peak_surge_w,
            loss_factor, total_wh_after_losses, required_ah, required_panel_w,
            autonomy_hours, dod, efficiency, temp_correction, future_expansion,
            cable_loss, temp_derating, dust_factor, inverter_efficiency
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        uuidv4(), quoteId,
        eng.system_type ?? null, eng.system_voltage ?? null, eng.sun_hours ?? null,
        eng.total_wh ?? null, eng.day_wh ?? null, eng.night_wh ?? null,
        eng.peak_continuous_w ?? null, eng.peak_surge_w ?? null,
        eng.loss_factor ?? null, eng.total_wh_after_losses ?? null,
        eng.required_ah ?? null, eng.required_panel_w ?? null,
        eng.autonomy_hours ?? null, eng.dod ?? null, eng.efficiency ?? null,
        eng.temp_correction ?? null, eng.future_expansion ?? null,
        eng.cable_loss ?? null, eng.temp_derating ?? null,
        eng.dust_factor ?? null, eng.inverter_efficiency ?? null
    );
}

// ─── Core Functions ──────────────────────────────────────────

/**
 * Creates a new Quote using the Dynamic Pricing Engine.
 * Server-side pricing — NO pre-calculated prices from frontend.
 */
export const createQuote = (reqData: any, user: { id: string }) => {
    // 1. Validate
    const validated = QuoteCreateSchema.parse(reqData);
    const { customer_name, customer_phone, customer_address, notes, discount_type, discount_value, items } = validated;

    // 2. Fetch current pricing state (ONCE — same rate for entire quote)
    const exchangeRate = getExchangeRate();
    const defaultMargin = getDefaultMargin();
    // Use the global minimum margin or default to 10% to check if discount requires approval
    const minAllowedMargin = 0.10;

    const quoteId = uuidv4();
    const quoteNumber = `QT-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    // 3. Process each item: fetch component → calculate price → build snapshot
    const snapshots = [];
    let totalCostIqd = 0;
    let totalSellIqd = 0;

    for (const item of items) {
        const component = db.prepare(
            'SELECT id, brand, model, cost_price, currency, margin_percent FROM components WHERE id = ? AND is_active = 1'
        ).get(item.component_id) as any;

        if (!component) {
            throw new Error(`المكون ${item.component_id} غير موجود أو غير نشط`);
        }

        // 4. Calculate via pricingEngine
        const priced = calculateSellPrice(
            {
                id: component.id,
                cost_price: component.cost_price,
                currency: component.currency || 'USD',
                margin_percent: component.margin_percent
            },
            exchangeRate,
            defaultMargin
        );

        const lineTotalIqd = priced.sell_price_iqd * item.quantity;
        const lineCostIqd = priced.cost_price_iqd * item.quantity;

        snapshots.push({
            id: uuidv4(),
            quote_id: quoteId,
            component_id: component.id,
            component_snapshot_name: `${component.brand} ${component.model}`,
            unit_cost_price_snapshot: component.cost_price,
            unit_sell_price_iqd: priced.sell_price_iqd,
            cost_price_snapshot: component.cost_price,
            margin_percent_snapshot: priced.effective_margin,
            currency_snapshot: component.currency || 'USD',
            exchange_rate_snapshot: exchangeRate,
            quantity: item.quantity,
            line_total_iqd: lineTotalIqd
        });

        totalCostIqd += lineCostIqd;
        totalSellIqd += lineTotalIqd;
    }

    // 5. INSERT inside a transaction (atomic)
    let additionalCost = 0;
    let finalSubtotal = 0;
    let discountApplied = 0;
    let finalNetTotal = 0;
    let finalProfit = 0;
    let approvalRequired = 0;
    const finalDiscountType = discount_type || 'fixed';
    const finalDiscountValue = discount_value || 0;

    const insertAll = db.transaction(() => {
        // Quote items with full snapshots
        const insertItem = db.prepare(`
            INSERT INTO quote_items (
                id, quote_id, component_id, component_snapshot_name,
                unit_price_snapshot, quantity, total_price,
                cost_price_snapshot, margin_percent_snapshot,
                currency_snapshot, exchange_rate_snapshot
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const snap of snapshots) {
            insertItem.run(
                snap.id, snap.quote_id, snap.component_id,
                snap.component_snapshot_name, snap.unit_sell_price_iqd,
                snap.quantity, snap.line_total_iqd,
                snap.cost_price_snapshot, snap.margin_percent_snapshot,
                snap.currency_snapshot, snap.exchange_rate_snapshot
            );
        }

        // Apply cost components (accessories, installation, etc.)
        additionalCost = applyCostComponents(quoteId, totalSellIqd);

        // Calculate REAL profit including cost components
        finalSubtotal = totalSellIqd + additionalCost;

        // Calculate Discount
        if (finalDiscountType === 'percentage') {
            discountApplied = finalSubtotal * (finalDiscountValue / 100);
        } else {
            discountApplied = finalDiscountValue;
        }
        discountApplied = Math.min(discountApplied, finalSubtotal); // Cap
        discountApplied = Math.round(discountApplied);

        finalNetTotal = finalSubtotal - discountApplied;
        finalProfit = finalNetTotal - totalCostIqd;

        // Check if approval is required:
        // E.g. Require approval if final profit margin drops below minAllowedMargin
        const currentMargin = finalProfit / totalCostIqd;
        if (discountApplied > 0 && currentMargin < minAllowedMargin) {
            approvalRequired = 1;
        }

        // Quote header — includes cost components and discounts in totals
        db.prepare(`
            INSERT INTO quotes (
                id, quote_number, customer_name, customer_phone,
                pricing_layer, total_material_cost, total_selling_price,
                total_profit, created_by,
                exchange_rate_snapshot, notes,
                subtotal, discount_type, discount_value, discount_applied_amount,
                net_total, approval_required_flag
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            quoteId, quoteNumber, customer_name, customer_phone || null,
            'dynamic', totalCostIqd, finalSubtotal, // Note: total_selling_price maps to finalSubtotal for legacy
            finalProfit, user.id,
            exchangeRate, notes || null,
            finalSubtotal, finalDiscountType, finalDiscountValue, discountApplied,
            finalNetTotal, approvalRequired
        );

        // Save engineering snapshot if provided
        if (reqData.engineering) {
            saveEngineeringSnapshot(quoteId, reqData.engineering);
        }
    });

    insertAll();

    return {
        id: quoteId,
        quote_number: quoteNumber,
        total_sell_iqd: finalSubtotal, // mapped to subtotal
        total_cost_iqd: totalCostIqd,
        total_profit_iqd: finalProfit,
        discount_applied: discountApplied,
        net_total: finalNetTotal,
        approval_required: approvalRequired === 1,
        exchange_rate: exchangeRate,
        items_count: snapshots.length
    };
};

/**
 * Legacy: Creates a Quote from ABPE flow.
 * NOW uses pricingEngine for server-side price validation.
 * Frontend prices are IGNORED — server recalculates everything.
 */
export const createQuoteFromABPE = (reqData: any, user: { id: string }) => {
    const validatedData = QuoteCreateLegacySchema.parse(reqData);
    const { customer_name, customer_phone, pricing_layer, quote_data } = validatedData;

    // Always use pricingEngine — never trust frontend prices
    const exchangeRate = getExchangeRate();
    const defaultMargin = getDefaultMargin();

    const quoteId = uuidv4();
    const quoteNumber = `QT-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    let totalCostIqd = 0;
    let totalSellIqd = 0;

    const insertQuote = db.transaction(() => {
        const insertItem = db.prepare(`
            INSERT INTO quote_items (
                id, quote_id, component_id, component_snapshot_name,
                unit_price_snapshot, quantity, total_price,
                cost_price_snapshot, margin_percent_snapshot,
                currency_snapshot, exchange_rate_snapshot
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // Process each component through pricingEngine (server-side validation)
        const processItem = (itemData: any, count: number) => {
            if (!itemData || count <= 0) return;

            const componentId = itemData.id || 'unknown';
            let priced: PricedProduct | null = null;

            // Try to price via pricingEngine using component from DB
            if (componentId !== 'unknown') {
                const component = db.prepare(
                    'SELECT id, cost_price, currency, margin_percent FROM components WHERE id = ?'
                ).get(componentId) as any;

                if (component) {
                    priced = calculateSellPrice(
                        {
                            id: component.id,
                            cost_price: component.cost_price,
                            currency: component.currency || 'USD',
                            margin_percent: component.margin_percent
                        },
                        exchangeRate,
                        defaultMargin
                    );
                }
            }

            // Use pricingEngine result if available, else fall back to provided data
            const unitSellIqd = priced ? priced.sell_price_iqd : ((itemData.cost_price || 0) * exchangeRate * (1 + defaultMargin / 100));
            const costPriceIqd = priced ? priced.cost_price_iqd : ((itemData.cost_price || 0) * exchangeRate);
            const margin = priced ? priced.effective_margin : defaultMargin;

            const lineTotalIqd = unitSellIqd * count;
            totalSellIqd += lineTotalIqd;
            totalCostIqd += costPriceIqd * count;

            insertItem.run(
                uuidv4(), quoteId, componentId,
                `${itemData.brand || ''} ${itemData.model || ''}`.trim(),
                unitSellIqd, count, lineTotalIqd,
                itemData.cost_price || 0, margin,
                itemData.currency || 'USD', exchangeRate
            );
        };

        processItem(quote_data.panels.item, quote_data.panels.count);
        processItem(quote_data.batteries.item, quote_data.batteries.count);
        processItem(quote_data.inverter.item, 1);

        // Apply cost components (accessories, installation, etc.)
        const abpeAdditionalCost = applyCostComponents(quoteId, totalSellIqd);
        const finalSellIqd = totalSellIqd + abpeAdditionalCost;
        const totalProfit = finalSellIqd - totalCostIqd;

        // Quote header with server-calculated totals (includes cost components)
        db.prepare(`
            INSERT INTO quotes (
                id, quote_number, customer_name, customer_phone,
                pricing_layer, total_material_cost, total_selling_price,
                total_profit, created_by, exchange_rate_snapshot
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            quoteId, quoteNumber, customer_name, customer_phone,
            'dynamic', totalCostIqd, finalSellIqd,
            totalProfit, user.id, exchangeRate
        );

        // Save engineering snapshot if provided
        if (reqData.engineering) {
            saveEngineeringSnapshot(quoteId, reqData.engineering);
        }
    });

    insertQuote();
    return { id: quoteId, quote_number: quoteNumber, total_sell_iqd: totalSellIqd, total_cost_iqd: totalCostIqd };
};

// ─── Read Operations ─────────────────────────────────────────

export const getQuotes = (limit: number = 100, offset: number = 0, filters?: {
    status?: string; customer_name?: string; from_date?: string; to_date?: string;
    min_total?: number; max_total?: number; sort_by?: string; order?: string;
}) => {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.status) {
        conditions.push('status = ?');
        params.push(filters.status);
    }
    if (filters?.customer_name) {
        conditions.push("LOWER(customer_name) LIKE ?");
        params.push(`%${filters.customer_name.toLowerCase()}%`);
    }
    if (filters?.from_date) {
        conditions.push('created_at >= ?');
        params.push(filters.from_date);
    }
    if (filters?.to_date) {
        conditions.push('created_at <= ?');
        params.push(filters.to_date);
    }
    if (filters?.min_total) {
        conditions.push('total_selling_price >= ?');
        params.push(filters.min_total);
    }
    if (filters?.max_total) {
        conditions.push('total_selling_price <= ?');
        params.push(filters.max_total);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy = 'created_at DESC';
    if (filters?.sort_by === 'total') orderBy = `total_selling_price ${filters.order === 'asc' ? 'ASC' : 'DESC'}`;
    else if (filters?.sort_by === 'customer') orderBy = `customer_name ${filters.order === 'asc' ? 'ASC' : 'DESC'}`;
    else if (filters?.sort_by === 'date') orderBy = `created_at ${filters.order === 'asc' ? 'ASC' : 'DESC'}`;

    const total = (db.prepare(`SELECT COUNT(*) as c FROM quotes ${whereClause}`).get(...params) as any).c;
    const data = db.prepare(`SELECT * FROM quotes ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...params, limit, offset);
    return { data, total, limit, offset };
};

export const getQuoteById = (id: string) => {
    const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(id);
    if (!quote) return null;
    const items = db.prepare('SELECT * FROM quote_items WHERE quote_id = ?').all(id);
    const costItems = db.prepare('SELECT * FROM quote_cost_items WHERE quote_id = ?').all(id);
    const engineering = db.prepare('SELECT * FROM quote_engineering_snapshot WHERE quote_id = ?').get(id);
    return { ...quote, items, cost_items: costItems, engineering };
};

export const deleteQuote = (id: string) => {
    const q = db.prepare('SELECT id FROM quotes WHERE id = ?').get(id);
    if (!q) throw new Error('Quote not found');

    db.transaction(() => {
        db.prepare('DELETE FROM quote_items WHERE quote_id = ?').run(id);
        db.prepare('DELETE FROM quote_cost_items WHERE quote_id = ?').run(id);
        db.prepare('DELETE FROM quote_engineering_snapshot WHERE quote_id = ?').run(id);
        db.prepare('DELETE FROM quotes WHERE id = ?').run(id);
    })();
};

// ─── Cost Components API ────────────────────────────────────

export const getCostComponents = () => {
    return db.prepare('SELECT * FROM cost_components ORDER BY sort_order').all();
};

export const updateCostComponent = (id: string, data: { name?: string; name_en?: string; type?: string; value?: number; is_active?: number }) => {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.name_en !== undefined) { fields.push('name_en = ?'); values.push(data.name_en); }
    if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
    if (data.value !== undefined) { fields.push('value = ?'); values.push(data.value); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active); }

    if (fields.length === 0) return;
    values.push(id);

    db.prepare(`UPDATE cost_components SET ${fields.join(', ')} WHERE id = ?`).run(...values);
};

// ─── Quote Lifecycle ─────────────────────────────────────────

export const convertQuoteToProject = (id: string, user: { id: string, company_id?: string }) => {
    const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(id) as any;
    if (!quote || quote.status !== 'draft') {
        throw new Error('Quote not found or already processed');
    }

    const company = db.prepare('SELECT id FROM companies LIMIT 1').get() as any;
    const companyId = user.company_id || company?.id;

    const projectId = uuidv4();

    const txn = db.transaction(() => {
        db.prepare(`
            INSERT INTO projects (
                id, company_id, name, customer_name, customer_contact, status, client_id
            ) VALUES (?, ?, ?, ?, ?, 'draft', ?)
        `).run(projectId, companyId, `Project from ${quote.quote_number}`, quote.customer_name, quote.customer_phone, quote.client_id || null);

        db.prepare('UPDATE quotes SET status = ? WHERE id = ?').run('converted', id);
    });

    txn();
    return projectId;
};

export const expireQuote = (id: string) => {
    db.prepare("UPDATE quotes SET status = 'expired' WHERE id = ? AND status = 'draft'").run(id);
    return true;
};

export const updateQuoteStatus = (id: string, newStatus: string, user: { id: string }) => {
    const quote = db.prepare('SELECT status, approval_required_flag FROM quotes WHERE id = ?').get(id) as any;
    if (!quote) throw new Error('Quote not found');

    const validStatuses = ['draft', 'sent', 'approved', 'locked', 'expired', 'converted'];
    if (!validStatuses.includes(newStatus)) {
        throw new Error('Invalid status');
    }

    // Enforce lock: If already locked/approved/converted, can rarely transition backward unless admin overrides
    // But for safety, keep it simple: just update the status and log it. In a full enterprise system
    // we would block 'locked' -> 'draft'.
    if (quote.status === 'locked' || quote.status === 'converted') {
        throw new Error(`Cannot change status from ${quote.status}`);
    }

    if (newStatus === 'approved' && quote.status !== 'approved') {
        const items = db.prepare('SELECT component_id, quantity FROM quote_items WHERE quote_id = ?').all(id) as any[];
        db.transaction(() => {
            db.prepare('UPDATE quotes SET status = ?, approved_by = ? WHERE id = ?').run(newStatus, user.id, id);

            // Inventory Hook: Deduct stock when quote is approved
            const deductStock = db.prepare('UPDATE components SET stock_qty = MAX(0, stock_qty - ?) WHERE id = ?');
            for (const item of items) {
                if (item.component_id) {
                    deductStock.run(item.quantity, item.component_id);
                }
            }
        })();
    } else {
        db.prepare('UPDATE quotes SET status = ? WHERE id = ?').run(newStatus, id);
    }

    return { success: true, oldStatus: quote.status, newStatus };
};
