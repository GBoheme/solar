import { z } from 'zod';

export const QuoteRequestSchema = z.object({
    amps: z.number().int().positive().max(1000),
    sun_hours: z.number().positive().max(24),
    day_hours: z.number().min(0).max(24).optional(),
    advancedSettings: z.object({
        future_expansion: z.number().min(1).max(2).optional(),
        dod: z.number().min(0.5).max(1).optional(),
        efficiency: z.number().min(0.5).max(1).optional(),
        temp_correction: z.number().min(1).max(1.5).optional(),
        safety_margin: z.number().min(1).max(2).optional()
    }).strict().optional(),
    systemVoltage: z.union([z.literal(12), z.literal(24), z.literal(48)]).optional()
}).strict();

export const GlobalSettingsSchema = z.object({
    abpe_voltage: z.union([z.literal(220), z.literal(380)]),
    abpe_phase: z.enum(['single', 'three']),
    abpe_hours: z.number().min(1).max(24),
    abpe_dod: z.number().min(0.5).max(1),
    abpe_eff: z.number().min(0.5).max(1),
    abpe_surge: z.number().min(1).max(5),
    abpe_exp_margin: z.number().min(1).max(2),
    abpe_pf: z.number().min(0.5).max(1),
    wholesale_margin: z.number().min(1).max(5),
    retail_margin: z.number().min(1).max(5)
}).strict();

export const LoginRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
}).strict();

export const ComponentSchema = z.object({
    category: z.enum(['battery', 'panel', 'inverter', 'controller', 'appliance', 'abpe']),
    brand: z.string().min(1),
    model: z.string().min(1),
    spec: z.record(z.string(), z.any()),
    cost_price: z.number().min(0),
    margin_percent: z.number().min(0).max(200).nullable().optional(),
    currency: z.string().min(3).max(3).optional(),
    stock_qty: z.number().int().min(0).optional(),
    sku: z.string().optional(),
    is_active: z.number().int().min(0).max(1).optional()
});

/**
 * New Quote schema: server-side pricing.
 * Frontend sends component_ids + quantities.
 * Server fetches prices, applies exchange rate & margins, stores snapshots.
 */
export const QuoteCreateSchema = z.object({
    customer_name: z.string().min(1),
    customer_phone: z.string().optional(),
    customer_address: z.string().optional(),
    notes: z.string().optional(),
    discount_type: z.enum(['fixed', 'percentage']).optional(),
    discount_value: z.number().min(0).optional(),
    // Items: component IDs + quantities — server calculates all prices
    items: z.array(z.object({
        component_id: z.string().min(1),
        quantity: z.number().int().min(1)
    })).min(1)
});

/**
 * Legacy schema for backward compatibility with old ABPE flow.
 * Will be deprecated once frontend is fully migrated.
 */
export const QuoteCreateLegacySchema = z.object({
    customer_name: z.string().min(1),
    customer_phone: z.string().optional(),
    pricing_layer: z.enum(['wholesale', 'retail']),
    quote_data: z.object({
        material_cost: z.number().min(0),
        wholesale_total: z.number().min(0),
        retail_total: z.number().min(0),
        profit: z.number().min(0),
        currency: z.string(),
        panels: z.object({ count: z.number().int().min(0), item: z.any() }),
        batteries: z.object({ count: z.number().int().min(0), item: z.any() }),
        inverter: z.object({ item: z.any() })
    })
}).strict();

// ── Maintenance Log ──
export const MaintenanceLogSchema = z.object({
    project_id: z.string().optional(),
    client_id: z.string().optional(),
    type: z.enum(['routine', 'corrective', 'preventive', 'emergency']).optional(),
    description: z.string().max(5000).optional(),
    cost: z.number().min(0).optional(),
    currency: z.string().min(3).max(3).optional(),
    performed_by: z.string().max(200).optional(),
    performed_at: z.string().optional(),
    next_maintenance_at: z.string().optional(),
    notes: z.string().max(5000).optional()
});

// ── AI Chat ──
export const AIChatSchema = z.object({
    sessionId: z.string().optional(),
    message: z.string().min(1).max(5000),
    persona: z.enum(['engineer', 'sales', 'beginner']).optional()
});

// ── AI Knowledge Source ──
export const AIKnowledgeSourceSchema = z.object({
    title: z.string().min(1).max(500),
    content: z.string().min(1).max(100000),
    source_type: z.enum(['text', 'document', 'url']).optional(),
    structured_data: z.any().optional()
});

// ── AI Settings ──
export const AISettingsSchema = z.object({
    system_prompt: z.string().max(10000).optional(),
    api_key: z.string().max(500).optional(),
    model: z.string().max(100).optional()
});

// ── Client Create/Update ──
export const ClientSchema = z.object({
    name: z.string().min(1).max(200),
    phone: z.string().max(50).optional(),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    type: z.enum(['residential', 'commercial', 'industrial', 'government']).optional(),
    notes: z.string().max(5000).optional()
});

// ── Engineering: Cable Loss ──
export const CableLossSchema = z.object({
    current_amps: z.number().positive(),
    cable_length_m: z.number().positive(),
    cable_gauge_mm2: z.number().positive(),
    system_voltage: z.number().positive(),
    material: z.enum(['copper', 'aluminum']).optional()
});

// ── Engineering: ROI ──
export const ROISchema = z.object({
    total_system_cost_iqd: z.number().positive(),
    monthly_grid_bill_iqd: z.number().positive(),
    grid_coverage_percent: z.number().min(0).max(100).optional(),
    annual_degradation: z.number().min(0).max(5).optional(),
    annual_maintenance_cost_iqd: z.number().min(0).optional(),
    system_lifetime_years: z.number().int().min(1).max(50).optional(),
    electricity_inflation_rate: z.number().min(0).max(50).optional()
});

// ── Workspace Sizing & Pricing ──
export const WorkspaceCalculateRequestSchema = z.object({
    system_type: z.enum(['OFF_GRID', 'ON_GRID', 'HYBRID']),
    system_voltage_mode: z.enum(['auto', 'manual']),
    system_voltage: z.union([z.literal(12), z.literal(24), z.literal(48)]).optional(),
    sun_hours: z.number().positive().max(24),
    autonomy_hours: z.number().min(0).max(72),
    safety_margin: z.number().min(1).max(2),
    dod: z.number().min(0.1).max(1),
    efficiency: z.number().min(0.1).max(1),
    future_expansion: z.number().min(1).max(2),
    surge_factor: z.number().min(1).max(5),
    loads: z.array(z.object({
        label: z.string().min(1),
        watts: z.number().positive(),
        hours_daily: z.number().min(0).max(24),
        qty: z.number().int().min(1),
        surge_factor: z.number().min(1).max(5).optional(),
        usage_period: z.enum(['day', 'night', 'both'])
    })).min(1),
    selected_component_ids: z.object({
        panel_id: z.string().optional(),
        battery_id: z.string().optional(),
        inverter_id: z.string().optional(),
        controller_id: z.string().optional(),
    }).optional(),
    count_overrides: z.object({
        panel_count: z.number().int().min(1).optional(),
        battery_count: z.number().int().min(1).optional(),
        inverter_qty: z.number().int().min(1).optional()
    }).optional(),
    locked_components: z.object({
        panel: z.boolean().optional(),
        battery: z.boolean().optional(),
        inverter: z.boolean().optional()
    }).optional()
}).strict();

export const WorkspaceCalculateResponseSchema = z.object({
    params_echo: z.any().optional(), // Used for debugging/validation
    engineering: z.object({
        total_wh: z.number(),
        total_wh_with_margin: z.number(),
        peak_continuous_w: z.number(),
        peak_surge_w: z.number(),
        night_wh: z.number(),
        day_wh: z.number(),
        system_voltage: z.number(),
        required_ah: z.number(),
        required_panel_w: z.number(),
        autonomy_hours: z.number(),
        assumptions: z.any().optional()
    }),
    recommendation: z.object({
        panels: z.object({
            count: z.number(),
            items: z.array(z.any())
        }),
        batteries: z.object({
            count: z.number(),
            series: z.number().optional(),
            parallel: z.number().optional(),
            items: z.array(z.any())
        }),
        inverter: z.object({
            count: z.number(),
            items: z.array(z.any())
        }),
        controller: z.object({
            item: z.any().optional().nullable()
        }).optional(),
        components_overridden: z.boolean()
    }),
    warnings: z.array(z.string()).optional(),
    compatibility_flags: z.record(z.string(), z.boolean()).optional(),
    pricing: z.object({
        components_total_iqd: z.number().optional(),
        installation_iqd: z.number().optional(),
        grand_total_iqd: z.number().optional(),
        currency: z.string().optional(),
        line_items: z.array(z.any()).optional()
    }).optional(),
    quote_ready_payload: z.any().optional()
});
