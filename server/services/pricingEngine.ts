/**
 * Dynamic Pricing Engine
 * 
 * Calculates sell prices dynamically based on:
 * - Product cost_price (in product's currency)
 * - Exchange rate (USD → IQD)
 * - Margin percent (product-level or system default)
 * 
 * No hardcoded prices — everything comes from the database.
 */

import { db } from '../db';

// ─── Types ───────────────────────────────────────────────────

export interface PricingSettings {
    usd_to_iqd: number;
    default_margin_percent: number;
}

export interface ProductForPricing {
    id: string;
    cost_price: number;
    currency: string;
    margin_percent: number | null;
}

export interface PricedProduct extends ProductForPricing {
    cost_price_iqd: number;
    sell_price_iqd: number;
    effective_margin: number;
    exchange_rate: number;
    bulk_discount?: number;
    client_discount?: number;
    total_discount?: number;
}

export interface QuoteItemInput {
    component_id: string;
    quantity: number;
}

export interface QuoteTotalResult {
    items: Array<{
        component_id: string;
        component_name: string;
        cost_price: number;
        cost_price_iqd: number;
        sell_price_iqd: number;
        margin_percent: number;
        quantity: number;
        line_total_iqd: number;
    }>;
    subtotal_iqd: number;
    exchange_rate: number;
}

// ─── Bulk Pricing Tiers ─────────────────────────────────────

/**
 * Get applicable bulk discount for a component at given quantity
 */
export function getBulkDiscount(componentId: string, quantity: number): number {
    const now = new Date().toISOString();
    const tier = db.prepare(`
        SELECT discount_percent FROM component_pricing_tiers
        WHERE component_id = ? AND min_qty <= ? AND max_qty >= ?
          AND (valid_from IS NULL OR valid_from <= ?)
          AND (valid_to IS NULL OR valid_to >= ?)
        ORDER BY discount_percent DESC LIMIT 1
    `).get(componentId, quantity, quantity, now, now) as { discount_percent: number } | undefined;

    return tier?.discount_percent ?? 0;
}

/**
 * Get applicable client-specific discount for a component
 */
export function getClientDiscount(clientId: string, componentId: string, category?: string): number {
    const now = new Date().toISOString();
    // Check component-specific override first
    const compOverride = db.prepare(`
        SELECT discount_percent FROM client_pricing_overrides
        WHERE client_id = ? AND component_id = ?
          AND (valid_from IS NULL OR valid_from <= ?)
          AND (valid_to IS NULL OR valid_to >= ?)
        LIMIT 1
    `).get(clientId, componentId, now, now) as { discount_percent: number } | undefined;

    if (compOverride) return compOverride.discount_percent;

    // Check category-level override
    if (category) {
        const catOverride = db.prepare(`
            SELECT discount_percent FROM client_pricing_overrides
            WHERE client_id = ? AND component_id IS NULL AND category = ?
              AND (valid_from IS NULL OR valid_from <= ?)
              AND (valid_to IS NULL OR valid_to >= ?)
            LIMIT 1
        `).get(clientId, category, now, now) as { discount_percent: number } | undefined;

        if (catOverride) return catOverride.discount_percent;
    }

    // Check global client override (no component, no category)
    const globalOverride = db.prepare(`
        SELECT discount_percent FROM client_pricing_overrides
        WHERE client_id = ? AND component_id IS NULL AND category IS NULL
          AND (valid_from IS NULL OR valid_from <= ?)
          AND (valid_to IS NULL OR valid_to >= ?)
        LIMIT 1
    `).get(clientId, now, now) as { discount_percent: number } | undefined;

    return globalOverride?.discount_percent ?? 0;
}

// ─── Core Functions ──────────────────────────────────────────

/**
 * Read current exchange rate from global_settings
 */
export function getExchangeRate(): number {
    const row = db.prepare(
        "SELECT value_json FROM global_settings WHERE key_name = 'usd_to_iqd'"
    ).get() as { value_json: string } | undefined;

    if (!row) throw new Error('Exchange rate (usd_to_iqd) not configured');
    return JSON.parse(row.value_json) as number;
}

/**
 * Read default margin percent from global_settings
 */
export function getDefaultMargin(): number {
    const row = db.prepare(
        "SELECT value_json FROM global_settings WHERE key_name = 'default_margin_percent'"
    ).get() as { value_json: string } | undefined;

    if (!row) throw new Error('Default margin (default_margin_percent) not configured');
    return JSON.parse(row.value_json) as number;
}

/**
 * Get full pricing settings
 */
export function getPricingSettings(): PricingSettings {
    return {
        usd_to_iqd: getExchangeRate(),
        default_margin_percent: getDefaultMargin()
    };
}

/**
 * Round a price to the nearest step (default: 1000 IQD)
 */
export function roundToNearest(price: number, step: number = 1000): number {
    return Math.ceil(price / step) * step;
}

/**
 * Calculate the sell price in IQD for a single product.
 *
 * Formula:
 *   1. Convert cost to IQD (if USD)
 *   2. Apply client discount (if client_id provided)
 *   3. Apply bulk discount (if quantity provided)
 *   4. Apply margin: cost_iqd × (1 + margin% / 100)
 *   5. Round to nearest 1000 IQD
 */
export function calculateSellPrice(
    product: ProductForPricing,
    exchangeRate?: number,
    defaultMargin?: number,
    options?: { quantity?: number; clientId?: string; category?: string }
): PricedProduct {
    const rate = exchangeRate ?? getExchangeRate();
    const fallbackMargin = defaultMargin ?? getDefaultMargin();
    const effectiveMargin = product.margin_percent !== null && product.margin_percent !== undefined
        ? product.margin_percent
        : fallbackMargin;

    // Step 1: Convert to IQD
    const costIqd = product.currency === 'USD'
        ? product.cost_price * rate
        : product.cost_price; // Already IQD

    // Step 2: Apply client discount
    let clientDiscount = 0;
    if (options?.clientId) {
        clientDiscount = getClientDiscount(options.clientId, product.id, options.category);
    }

    // Step 3: Apply bulk discount
    let bulkDiscount = 0;
    if (options?.quantity && options.quantity > 1) {
        bulkDiscount = getBulkDiscount(product.id, options.quantity);
    }

    // Total discount (client + bulk, capped at 50%)
    const totalDiscount = Math.min(clientDiscount + bulkDiscount, 50);

    // Step 4: Apply margin after discounts
    const discountedCostIqd = costIqd * (1 - totalDiscount / 100);
    const rawSellPrice = discountedCostIqd * (1 + effectiveMargin / 100);

    // Step 5: Round
    const sellPriceIqd = roundToNearest(rawSellPrice);

    return {
        ...product,
        cost_price_iqd: costIqd,
        sell_price_iqd: sellPriceIqd,
        effective_margin: effectiveMargin,
        exchange_rate: rate,
        bulk_discount: bulkDiscount,
        client_discount: clientDiscount,
        total_discount: totalDiscount
    } as PricedProduct;
}

/**
 * Calculate total for a list of quote items.
 * Uses CURRENT exchange rate and margins.
 */
export function calculateQuoteTotal(
    itemInputs: QuoteItemInput[]
): QuoteTotalResult {
    const rate = getExchangeRate();
    const defaultMargin = getDefaultMargin();

    const items = itemInputs.map(input => {
        const component = db.prepare(
            'SELECT id, brand, model, cost_price, currency, margin_percent FROM components WHERE id = ?'
        ).get(input.component_id) as any;

        if (!component) {
            throw new Error(`Component ${input.component_id} not found`);
        }

        const priced = calculateSellPrice(
            {
                id: component.id,
                cost_price: component.cost_price,
                currency: component.currency || 'USD',
                margin_percent: component.margin_percent
            },
            rate,
            defaultMargin
        );

        return {
            component_id: component.id,
            component_name: `${component.brand} ${component.model}`,
            cost_price: component.cost_price,
            cost_price_iqd: priced.cost_price_iqd,
            sell_price_iqd: priced.sell_price_iqd,
            margin_percent: priced.effective_margin,
            quantity: input.quantity,
            line_total_iqd: priced.sell_price_iqd * input.quantity
        };
    });

    const subtotal = items.reduce((sum, item) => sum + item.line_total_iqd, 0);

    return {
        items,
        subtotal_iqd: subtotal,
        exchange_rate: rate
    };
}

// ─── Pricing Tiers CRUD ─────────────────────────────────────

export function getPricingTiers(componentId: string) {
    return db.prepare(
        'SELECT * FROM component_pricing_tiers WHERE component_id = ? ORDER BY min_qty ASC'
    ).all(componentId);
}

export function upsertPricingTier(data: {
    id?: string; component_id: string; min_qty: number; max_qty: number;
    discount_percent: number; valid_from?: string; valid_to?: string;
}) {
    const { v4: uuidv4 } = require('uuid');
    if (data.id) {
        db.prepare(`
            UPDATE component_pricing_tiers
            SET min_qty = ?, max_qty = ?, discount_percent = ?, valid_from = ?, valid_to = ?
            WHERE id = ?
        `).run(data.min_qty, data.max_qty, data.discount_percent, data.valid_from || null, data.valid_to || null, data.id);
        return data.id;
    } else {
        const id = uuidv4();
        db.prepare(`
            INSERT INTO component_pricing_tiers (id, component_id, min_qty, max_qty, discount_percent, valid_from, valid_to)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, data.component_id, data.min_qty, data.max_qty, data.discount_percent, data.valid_from || null, data.valid_to || null);
        return id;
    }
}

export function deletePricingTier(id: string) {
    db.prepare('DELETE FROM component_pricing_tiers WHERE id = ?').run(id);
}

// ─── Client Pricing Overrides CRUD ──────────────────────────

export function getClientPricingOverrides(clientId: string) {
    return db.prepare(`
        SELECT cpo.*, c.brand, c.model, c.category as comp_category
        FROM client_pricing_overrides cpo
        LEFT JOIN components c ON cpo.component_id = c.id
        WHERE cpo.client_id = ?
        ORDER BY cpo.created_at DESC
    `).all(clientId);
}

export function upsertClientPricingOverride(data: {
    id?: string; client_id: string; component_id?: string; category?: string;
    discount_percent: number; valid_from?: string; valid_to?: string;
}) {
    const { v4: uuidv4 } = require('uuid');
    if (data.id) {
        db.prepare(`
            UPDATE client_pricing_overrides
            SET component_id = ?, category = ?, discount_percent = ?, valid_from = ?, valid_to = ?
            WHERE id = ?
        `).run(data.component_id || null, data.category || null, data.discount_percent, data.valid_from || null, data.valid_to || null, data.id);
        return data.id;
    } else {
        const id = uuidv4();
        db.prepare(`
            INSERT INTO client_pricing_overrides (id, client_id, component_id, category, discount_percent, valid_from, valid_to)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, data.client_id, data.component_id || null, data.category || null, data.discount_percent, data.valid_from || null, data.valid_to || null);
        return id;
    }
}

export function deleteClientPricingOverride(id: string) {
    db.prepare('DELETE FROM client_pricing_overrides WHERE id = ?').run(id);
}

/**
 * Enrich a list of raw component rows with computed sell prices.
 * Used by GET /api/products and GET /api/admin/components
 */
export function enrichProductsWithPricing(components: any[]): any[] {
    const rate = getExchangeRate();
    const defaultMargin = getDefaultMargin();

    return components.map(c => {
        const priced = calculateSellPrice(
            {
                id: c.id,
                cost_price: c.cost_price ?? 0,
                currency: c.currency || 'USD',
                margin_percent: c.margin_percent
            },
            rate,
            defaultMargin
        );

        return {
            ...c,
            // Computed pricing fields
            cost_price_iqd: priced.cost_price_iqd,
            sell_price_iqd: priced.sell_price_iqd,
            effective_margin: priced.effective_margin,
            exchange_rate: rate
        };
    });
}
