/**
 * Solar Engine — Professional Grade v2.0
 *
 * Features:
 *   - System Loss Factor (cable, temperature, dust, inverter)
 *   - Day/Night load splitting
 *   - System Type support (OFF_GRID / ON_GRID / HYBRID)
 *   - Cable Loss Calculation based on distance & wire gauge
 *   - Temperature Derating based on ambient temperature
 *   - MPPT Optimization logic
 *   - ROI & Payback calculation
 *   - Risk Analysis (temperature, dust, overload)
 */

// ─── Types ───────────────────────────────────────────────────

export type SystemType = 'OFF_GRID' | 'ON_GRID' | 'HYBRID';
export type UsagePeriod = 'day' | 'night' | 'both';

export interface LoadItem {
  name: string;
  watts: number;
  hours_daily: number;
  qty: number;
  surge_factor: number;
  usage_period: UsagePeriod;
}

export interface SystemLossFactors {
  cable_loss: number;          // 0.02–0.05 (2–5%)
  temp_derating: number;       // 0.05–0.15 (5–15%)
  dust_factor: number;         // 0.02–0.10 (2–10%)
  inverter_efficiency: number; // 0.90–0.97
}

export interface SolarEngineConfig {
  system_type: SystemType;
  system_voltage: number;       // 12, 24, 48
  sun_hours: number;
  autonomy_hours: number;       // Battery backup hours
  dod: number;                  // Depth of discharge (0.5–0.8)
  battery_chemistry?: BatteryChemistry; // If provided, overrides dod
  battery_efficiency: number;   // 0.85–0.95
  temp_correction: number;      // Temperature correction for batteries
  future_expansion: number;     // 1.0–2.0
  losses: SystemLossFactors;
}

export interface LoadProfile {
  total_wh: number;
  day_wh: number;
  night_wh: number;
  peak_continuous_w: number;
  peak_surge_w: number;
  peak_day_w: number;
  peak_night_w: number;
  loss_factor: number;
  total_wh_after_losses: number;
}

export interface BatteryResult {
  required_ah: number;
  required_energy_wh: number;
  night_wh_source: number;
  needed: boolean;
}

export type BatteryChemistry = 'LITHIUM' | 'GEL' | 'LEAD_ACID' | 'TUBULAR';

export const BATTERY_CHEMISTRY_PROPS: Record<BatteryChemistry, { dod: number, cycle_life_stc: number }> = {
  LITHIUM: { dod: 0.8, cycle_life_stc: 6000 },
  GEL: { dod: 0.5, cycle_life_stc: 1200 },
  LEAD_ACID: { dod: 0.5, cycle_life_stc: 500 },
  TUBULAR: { dod: 0.6, cycle_life_stc: 1500 }
};

export function calculateBatteryLife(chemistry: BatteryChemistry, avgTempC: number): number {
  const props = BATTERY_CHEMISTRY_PROPS[chemistry];
  const stcCycles = props.cycle_life_stc;

  let tempFactor = 1.0;
  if (avgTempC > 25) {
    const deltaT = avgTempC - 25;
    if (chemistry === 'LITHIUM') {
      tempFactor = Math.pow(0.85, deltaT / 10); // Loses ~15% life per 10°C over 25°C
    } else {
      tempFactor = Math.pow(0.5, deltaT / 10); // Halves every 10°C over 25°C
    }
  }

  // Assume roughly 1 full cycle equivalent per day for off-grid/hybrid
  const effectiveCycles = stcCycles * tempFactor;
  return effectiveCycles / 365.0; // Expected life in years
}

export interface SolarResult {
  required_power_w: number;
  total_generation_needed_wh: number;
  loss_factor: number;
}

export interface FullSystemResult {
  load_profile: LoadProfile;
  battery: BatteryResult;
  solar: SolarResult;
  system_type: SystemType;
  config: SolarEngineConfig;
  warnings: string[];
}

export interface SystemBalanceResult {
  daily_solar_harvest_wh: number;
  net_energy_wh: number;
  recharge_time_days: number;
  is_feasible: boolean;
  warnings: string[];
}

export interface BatteryBankResult {
  batteries_per_string: number;
  parallel_strings: number;
  total_battery_count: number;
  total_nominal_capacity_ah: number;
  total_usable_capacity_wh: number;
  warnings: string[];
}

// ─── Cable Loss Calculation Types ───────────────────────────

export interface CableLossInput {
  current_amps: number;        // System current in amps
  cable_length_m: number;      // One-way cable length in meters
  cable_gauge_mm2: number;     // Cable cross-section area (mm²)
  system_voltage: number;      // System voltage (12, 24, 48)
  material: 'copper' | 'aluminum'; // Cable material
  circuit_type?: 'dc' | 'ac';  // DC max 3%, AC max 5%
}

export interface CableLossResult {
  voltage_drop_v: number;      // Voltage drop in volts
  voltage_drop_percent: number; // Voltage drop as percentage
  power_loss_w: number;        // Power lost in cable
  power_loss_percent: number;  // Power loss as percentage
  is_acceptable: boolean;      // < 3% for DC, < 5% for AC
  recommended_gauge_mm2: number; // Minimum recommended gauge
}

// ─── MPPT Optimization Types ────────────────────────────────

export interface MPPTInput {
  panel_vmp: number;           // Panel voltage at max power (Vmp)
  panel_imp: number;           // Panel current at max power (Imp)
  panel_voc: number;           // Panel open-circuit voltage (Voc)
  panel_isc: number;           // Panel short-circuit current (Isc)
  panel_count: number;         // Total number of panels
  system_voltage: number;      // Battery/system voltage
  mppt_max_voltage: number;    // MPPT controller max input voltage
  mppt_max_current: number;    // MPPT controller max input current
  ambient_temp_max: number;    // Max expected ambient temperature (°C)
}

export interface MPPTResult {
  series_count: number;        // Panels in series per string
  parallel_count: number;      // Number of parallel strings
  string_voltage: number;      // String voltage at Vmp
  string_voc_cold: number;     // String Voc at lowest temp (safety)
  total_current: number;       // Total current from all strings
  mppt_utilization: number;    // MPPT capacity utilization %
  is_valid: boolean;           // Configuration is safe
  warnings: string[];          // Any configuration warnings
}

// ─── ROI & Payback Types ────────────────────────────────────

export interface ROIInput {
  total_system_cost_iqd: number;    // Total system cost
  monthly_grid_bill_iqd: number;    // Current monthly electricity bill
  grid_coverage_percent: number;     // % of bill offset by solar (50-100%)
  annual_degradation: number;        // Panel degradation rate (0.5-1%)
  annual_maintenance_cost_iqd: number; // Yearly maintenance cost
  system_lifetime_years: number;     // Expected system life (20-30 years)
  electricity_inflation_rate: number; // Annual electricity price increase (3-8%)
  battery_replacement_cost_iqd?: number; // Cost of replacing battery bank
  battery_chemistry?: BatteryChemistry;  // Chemistry to calculate lifespan 
  ambient_temp_avg?: number;             // Ambient temp for battery lifespan
}

export interface ROIResult {
  payback_years: number;             // Simple payback period
  total_savings_lifetime_iqd: number; // Total savings over lifetime
  roi_percent: number;               // Return on investment %
  net_present_value_iqd: number;     // NPV at 10% discount rate
  monthly_savings_iqd: number;       // Average monthly savings year 1
  yearly_savings: Array<{            // Year-by-year breakdown
    year: number;
    savings_iqd: number;
    cumulative_iqd: number;
    degradation_factor: number;
  }>;
}

// ─── Risk Analysis Types ────────────────────────────────────

export interface RiskInput {
  ambient_temp_avg: number;    // Average ambient temperature (°C)
  ambient_temp_max: number;    // Maximum ambient temperature (°C)
  dust_level: 'low' | 'medium' | 'high' | 'extreme'; // Environment dust level
  peak_load_w: number;         // Peak system load in watts
  inverter_capacity_w: number; // Inverter rated capacity
  battery_ah: number;          // Total battery capacity
  required_ah: number;         // Calculated required capacity
  system_type: SystemType;
}

export interface RiskResult {
  overall_risk: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;          // 0-100 score
  risks: Array<{
    category: string;          // 'temperature', 'dust', 'overload', 'battery', 'inverter'
    level: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation: string;
  }>;
}

// ─── Resistivity Constants ──────────────────────────────────

const RESISTIVITY = {
  copper: 0.0175,     // Ω·mm²/m at 20°C
  aluminum: 0.0283    // Ω·mm²/m at 20°C
};

// Standard wire gauges (mm²) and their max current (copper, in conduit)
const WIRE_GAUGE_AMPS: Record<number, number> = {
  1.5: 14, 2.5: 20, 4: 27, 6: 35, 10: 48, 16: 65, 25: 88, 35: 110, 50: 140, 70: 175, 95: 210, 120: 245
};

// ─── Default Loss Factors ────────────────────────────────────

export const DEFAULT_LOSSES: SystemLossFactors = {
  cable_loss: 0.03,            // 3% cable losses
  temp_derating: 0.10,         // 10% temperature derating
  dust_factor: 0.05,           // 5% dust/soiling
  inverter_efficiency: 0.93    // 93% inverter efficiency
};

/**
 * Calculate the combined system loss factor.
 * Result is a multiplier < 1 (e.g., 0.80 means 20% total losses).
 */
export function computeLossFactor(losses: SystemLossFactors): number {
  return (1 - losses.cable_loss) *
    (1 - losses.temp_derating) *
    (1 - losses.dust_factor) *
    losses.inverter_efficiency;
}

/**
 * Calculate temperature derating factor based on actual ambient temperature.
 * Panels are rated at STC (25°C cell temp). Each °C above reduces output.
 * Cell temp ≈ ambient + 25°C (typical NOCT offset)
 * Power coefficient typically -0.35%/°C to -0.45%/°C for crystalline silicon.
 */
export function calculateTempDerating(ambientTempC: number, powerTempCoeff: number = -0.004): number {
  const cellTemp = ambientTempC + 25; // NOCT approximation
  const stcTemp = 25;
  const deltaT = cellTemp - stcTemp;
  const derating = Math.abs(powerTempCoeff) * deltaT;
  return Math.max(0, Math.min(derating, 0.50)); // Cap at 50% derating
}

/**
 * Adapter to translate a legacy "Amperage" input into a synthetic LoadItem.
 * This allows the new unified workspace to process quick quotes without
 * needing a separate amperage calculation engine.
 */
export function convertAmperageToLoad(
  amps: number,
  voltage: number,
  hoursDaily: number,
  surgeFactor: number = 1.0
): LoadItem[] {
  return [
    {
      name: `Synthetic Amperage Load (${amps}A)`,
      watts: amps * voltage,
      hours_daily: hoursDaily,
      qty: 1,
      surge_factor: surgeFactor,
      usage_period: 'both' // Assume distributed usage for synthetic quick quotes
    }
  ];
}

// ─── Solar Calculator ────────────────────────────────────────

export class SolarCalculator {

  /**
   * Step 1: Calculate load profile with day/night split.
   */
  calculateLoadProfile(loads: LoadItem[], futureExpansion: number = 1.0, losses: SystemLossFactors = DEFAULT_LOSSES, sunHours: number = 6): LoadProfile {
    let day_wh = 0;
    let night_wh = 0;
    let peak_continuous_w = 0;
    let peak_surge_w = 0;
    let peak_day_w = 0;
    let peak_night_w = 0;

    // Use sun hours for realistic day/night split instead of fixed 50/50
    const dayFraction = Math.min(sunHours / 12, 1); // sun_hours out of ~12h typical day
    const nightFraction = 1 - dayFraction;

    for (const load of loads) {
      const watts = load.watts * (load.qty || 1);
      const surge = watts * (load.surge_factor || 1);
      const load_wh = watts * (load.hours_daily || 0);
      const period = load.usage_period || 'both';

      // Split energy by usage period
      if (period === 'day') {
        day_wh += load_wh;
        peak_day_w += watts;
      } else if (period === 'night') {
        night_wh += load_wh;
        peak_night_w += watts;
      } else {
        // 'both' — split based on actual sun hours ratio
        day_wh += load_wh * dayFraction;
        night_wh += load_wh * nightFraction;
        peak_day_w += watts;
        peak_night_w += watts;
      }

      peak_continuous_w += watts;
      peak_surge_w += surge; // surge = watts * surge_factor, already includes continuous
    }

    // Apply future expansion
    day_wh *= futureExpansion;
    night_wh *= futureExpansion;
    peak_continuous_w *= futureExpansion;
    peak_surge_w *= futureExpansion;
    peak_day_w *= futureExpansion;
    peak_night_w *= futureExpansion;

    const total_wh = day_wh + night_wh;
    const loss_factor = computeLossFactor(losses);
    const total_wh_after_losses = total_wh / loss_factor;

    return {
      total_wh,
      day_wh,
      night_wh,
      peak_continuous_w,
      peak_surge_w,
      peak_day_w,
      peak_night_w,
      loss_factor,
      total_wh_after_losses
    };
  }

  /**
   * Step 2: Calculate battery requirements.
   *
   * OFF_GRID → batteries sized for night_wh + autonomy
   * ON_GRID  → no batteries needed
   * HYBRID   → batteries sized for night_wh as backup
   */
  calculateBattery(config: SolarEngineConfig, profile: LoadProfile): BatteryResult {
    // If chemistry is provided, override the generic DOD
    if (config.battery_chemistry) {
      config.dod = BATTERY_CHEMISTRY_PROPS[config.battery_chemistry].dod;
    }

    // ON_GRID: No batteries
    if (config.system_type === 'ON_GRID') {
      return {
        required_ah: 0,
        required_energy_wh: 0,
        night_wh_source: profile.night_wh,
        needed: false
      };
    }

    // OFF_GRID: Full autonomy — batteries must cover night loads + autonomy reserve
    let energy_to_store_wh: number;
    const loss_factor = computeLossFactor(config.losses);

    if (config.system_type === 'OFF_GRID') {
      // Night load is always needed from batteries
      const night_energy = profile.night_wh / loss_factor;

      // Autonomy: additional hours of FULL load coverage beyond the standard night
      // autonomy_hours represents total backup hours desired
      // If autonomy_hours > night hours (12h default), extra comes from day loads too
      const autonomy_fraction = Math.min(config.autonomy_hours / 24, 1);
      const autonomy_energy = profile.total_wh_after_losses * autonomy_fraction;

      // Take the maximum: either full autonomy coverage or at minimum night load
      energy_to_store_wh = Math.max(autonomy_energy, night_energy);
    } else {
      // HYBRID: batteries as backup for night loads only (grid handles rest)
      energy_to_store_wh = profile.night_wh / loss_factor;
    }

    // Apply battery corrections
    const corrected = (energy_to_store_wh * config.temp_correction) / (config.dod * config.battery_efficiency);
    const required_ah = corrected / config.system_voltage;

    return {
      required_ah,
      required_energy_wh: corrected,
      night_wh_source: profile.night_wh,
      needed: true
    };
  }

  /**
   * Step 3: Calculate solar panel requirements.
   *
   * OFF_GRID → panels must generate total_wh (day + night through batteries)
   * ON_GRID  → panels generate day_wh, excess goes to grid
   * HYBRID   → panels generate total_wh, grid fills gaps
   */
  calculateSolar(config: SolarEngineConfig, profile: LoadProfile): SolarResult {
    const loss_factor = computeLossFactor(config.losses);

    let generation_needed_wh: number;

    if (config.system_type === 'ON_GRID') {
      // Panels generate for entire consumption; excess exported
      generation_needed_wh = profile.total_wh / loss_factor;
    } else {
      // OFF_GRID & HYBRID: panels must generate everything
      generation_needed_wh = profile.total_wh_after_losses;
    }

    // Guard: sun_hours must be > 0 to avoid Infinity
    if (!config.sun_hours || config.sun_hours <= 0) {
      throw new Error('sun_hours must be greater than 0');
    }
    const required_power_w = generation_needed_wh / config.sun_hours;

    return {
      required_power_w,
      total_generation_needed_wh: generation_needed_wh,
      loss_factor
    };
  }

  /**
   * Full system calculation — runs all steps in sequence.
   */
  calculateFullSystem(loads: LoadItem[], config: SolarEngineConfig): FullSystemResult {
    const profile = this.calculateLoadProfile(loads, config.future_expansion, config.losses, config.sun_hours);
    const battery = this.calculateBattery(config, profile);
    const solar = this.calculateSolar(config, profile);

    const warnings: string[] = [];
    if (computeLossFactor(config.losses) < 0.75) {
      warnings.push('System has high calculated losses (>25%). Consider larger cables or better cooling.');
    }

    return {
      load_profile: profile,
      battery,
      solar,
      system_type: config.system_type,
      config,
      warnings
    };
  }

  /**
   * Phase 6: Calculate system energy balance and recharge feasibility.
   */
  calculateSystemBalance(pv_wattage: number, sun_hours: number, performance_ratio: number, day_load_wh: number, battery_usable_wh: number, system_type: SystemType): SystemBalanceResult {
    const warnings: string[] = [];
    const daily_solar_harvest_wh = pv_wattage * sun_hours * performance_ratio;
    const net_energy_wh = daily_solar_harvest_wh - day_load_wh;
    
    let recharge_time_days = Infinity;
    let is_feasible = true;

    if (net_energy_wh > 0) {
       recharge_time_days = battery_usable_wh / net_energy_wh;
       if (recharge_time_days > 3) {
           warnings.push(`Battery bank is large compared to PV array. Estimated recharge time is ${recharge_time_days.toFixed(1)} days.`);
       }
    } else {
       if (system_type === 'OFF_GRID') {
           is_feasible = false;
           warnings.push('CRITICAL: PV array is insufficient to even support daytime loads, impossible to charge batteries off-grid.');
       } else if (system_type === 'HYBRID') {
           warnings.push('WARNING: PV array cannot fully support daytime loads. System will rely heavily on the grid for battery charging.');
       }
    }

    return {
      daily_solar_harvest_wh: Math.round(daily_solar_harvest_wh),
      net_energy_wh: Math.round(net_energy_wh),
      recharge_time_days: Math.round(recharge_time_days * 10) / 10,
      is_feasible,
      warnings
    };
  }

  /**
   * Phase 6: Calculate exact battery bank strings and parallels.
   */
  calculateBatteryBank(required_energy_wh: number, battery_ah: number, battery_v: number, system_voltage: number): BatteryBankResult {
    const warnings: string[] = [];
    if (required_energy_wh <= 0) {
      return { batteries_per_string: 0, parallel_strings: 0, total_battery_count: 0, total_nominal_capacity_ah: 0, total_usable_capacity_wh: 0, warnings };
    }

    const batteries_per_string = Math.max(1, Math.round(system_voltage / battery_v));
    const string_voltage = batteries_per_string * battery_v;
    if (string_voltage !== system_voltage) {
       warnings.push(`Selected battery voltage (${battery_v}V) cannot exactly build a ${system_voltage}V system. Adjusting to nearest multiple.`);
    }

    const single_battery_wh = battery_ah * battery_v;
    const string_energy_wh = single_battery_wh * batteries_per_string;
    const raw_parallel_strings = Math.ceil(required_energy_wh / string_energy_wh);
    
    // Safety limit on parallel strings
    let parallel_strings = raw_parallel_strings;
    if (parallel_strings > 3) {
       warnings.push(`High number of parallel strings (${parallel_strings}). Consider modular battery racks or higher capacity batteries to avoid balancing issues.`);
    }

    const total_battery_count = batteries_per_string * parallel_strings;
    return {
      batteries_per_string,
      parallel_strings,
      total_battery_count,
      total_nominal_capacity_ah: parallel_strings * battery_ah,
      total_usable_capacity_wh: total_battery_count * single_battery_wh,
      warnings
    };
  }

  /**
   * Calculate cable voltage drop and power loss.
   *
   * V_drop = 2 × I × ρ × L / A
   * Where: I=current, ρ=resistivity, L=length, A=cross-section
   * Factor of 2 accounts for round-trip (positive + negative)
   */
  calculateCableLoss(input: CableLossInput): CableLossResult {
    const rho = RESISTIVITY[input.material];
    const resistance = (2 * rho * input.cable_length_m) / input.cable_gauge_mm2;

    const voltage_drop_v = input.current_amps * resistance;
    const voltage_drop_percent = (voltage_drop_v / input.system_voltage) * 100;
    const power_loss_w = input.current_amps * voltage_drop_v;
    const power_loss_percent = (power_loss_w / (input.current_amps * input.system_voltage)) * 100;

    // DC cables should have < 3% drop, AC < 5%
    const maxDropPercent = input.circuit_type === 'ac' ? 5 : 3;
    const is_acceptable = voltage_drop_percent < maxDropPercent;

    // Find minimum gauge that keeps drop under threshold
    const maxResistance = ((maxDropPercent / 100) * input.system_voltage) / input.current_amps;
    const minArea = (2 * rho * input.cable_length_m) / maxResistance;
    const gauges = Object.keys(WIRE_GAUGE_AMPS).map(Number).sort((a, b) => a - b);
    const recommended_gauge_mm2 = gauges.find(g => g >= minArea && WIRE_GAUGE_AMPS[g] >= input.current_amps) || gauges[gauges.length - 1];

    return {
      voltage_drop_v: Math.round(voltage_drop_v * 100) / 100,
      voltage_drop_percent: Math.round(voltage_drop_percent * 100) / 100,
      power_loss_w: Math.round(power_loss_w * 100) / 100,
      power_loss_percent: Math.round(power_loss_percent * 100) / 100,
      is_acceptable,
      recommended_gauge_mm2
    };
  }

  /**
   * MPPT Optimization — calculate optimal series/parallel panel configuration.
   *
   * Rules:
   * 1. String Voc (at cold temp) must not exceed MPPT max voltage
   * 2. Total current must not exceed MPPT max current
   * 3. String Vmp must be above minimum MPPT tracking voltage (usually battery_voltage + 5V)
   * 4. Voc increases ~0.35%/°C below STC (25°C) for crystalline panels
   */
  calculateMPPT(input: MPPTInput): MPPTResult {
    const warnings: string[] = [];

    // Voc temperature coefficient — use min expected temp (default: region-appropriate)
    // Iraq typical minimum: 0°C to -5°C in winter
    const coldTempC = Math.min(input.ambient_temp_max - 30, 5); // Estimate min from max, cap at 5°C
    const vocTempCoeff = -0.003; // -0.3%/°C typical for crystalline
    const vocColdFactor = 1 + Math.abs(vocTempCoeff) * (25 - coldTempC); // Voc increases in cold

    const panel_voc_cold = input.panel_voc * vocColdFactor;

    // Calculate max panels in series (limited by MPPT max voltage)
    const maxSeries = Math.floor(input.mppt_max_voltage / panel_voc_cold);

    // Calculate min panels in series (string Vmp must exceed battery voltage + headroom)
    const minVmpRequired = input.system_voltage + 5; // 5V headroom for MPPT tracking
    const minSeries = Math.ceil(minVmpRequired / input.panel_vmp);

    if (minSeries > maxSeries) {
      warnings.push('Panel Vmp too low for this battery voltage and MPPT controller.');
    }

    // Find optimal configuration
    let bestSeries = minSeries;
    let bestParallel = 1;
    let bestUtilization = 0;

    for (let s = minSeries; s <= maxSeries; s++) {
      const p = Math.floor(input.panel_count / s);
      if (p <= 0) continue;

      const totalCurrent = p * input.panel_imp;
      if (totalCurrent > input.mppt_max_current) continue;

      const usedPanels = s * p;
      const utilization = usedPanels / input.panel_count;

      if (utilization >= bestUtilization) {
        bestUtilization = utilization;
        bestSeries = s;
        bestParallel = p;
      }
    }

    const string_voltage = bestSeries * input.panel_vmp;
    const string_voc_cold = bestSeries * panel_voc_cold;
    const total_current = bestParallel * input.panel_imp;

    if (total_current > input.mppt_max_current) {
      warnings.push(`Total current ${total_current.toFixed(1)}A exceeds MPPT max ${input.mppt_max_current}A`);
    }
    if (string_voc_cold > input.mppt_max_voltage) {
      warnings.push(`Cold Voc ${string_voc_cold.toFixed(1)}V exceeds MPPT max ${input.mppt_max_voltage}V`);
    }
    if (bestSeries * bestParallel < input.panel_count) {
      warnings.push(`${input.panel_count - bestSeries * bestParallel} panels unused with this configuration`);
    }

    const mppt_utilization = (total_current / input.mppt_max_current) * 100;

    return {
      series_count: bestSeries,
      parallel_count: bestParallel,
      string_voltage: Math.round(string_voltage * 10) / 10,
      string_voc_cold: Math.round(string_voc_cold * 10) / 10,
      total_current: Math.round(total_current * 10) / 10,
      mppt_utilization: Math.round(mppt_utilization * 10) / 10,
      is_valid: warnings.length === 0 && bestParallel > 0,
      warnings
    };
  }

  /**
   * ROI & Payback Calculation.
   *
   * Uses simple payback + NPV with electricity inflation.
   */
  calculateROI(input: ROIInput): ROIResult {
    const yearlyBreakdown: ROIResult['yearly_savings'] = [];
    let cumulativeSavings = 0;
    let paybackYear = input.system_lifetime_years; // Default to max if never pays back
    let paybackFound = false;
    const discountRate = 0.10; // 10% discount rate for NPV
    let npv = -input.total_system_cost_iqd;

    for (let year = 1; year <= input.system_lifetime_years; year++) {
      // Panel degradation reduces generation each year (default ~0.5%)
      const degradationFactor = Math.pow(1 - input.annual_degradation / 100, year - 1);

      // Electricity prices rise with inflation
      const inflatedBill = input.monthly_grid_bill_iqd * Math.pow(1 + input.electricity_inflation_rate / 100, year - 1);

      // Annual savings = coverage % × inflated bill × 12 months × degradation - maintenance
      let annualSavings = (input.grid_coverage_percent / 100) * inflatedBill * 12 * degradationFactor - input.annual_maintenance_cost_iqd;

      // Deduct Battery Replacement Costs if applicable
      if (input.battery_replacement_cost_iqd && input.battery_chemistry) {
        // Find expected life
        const expectedLife = calculateBatteryLife(input.battery_chemistry, input.ambient_temp_avg || 25);
        if (expectedLife > 0) {
          // Check if a multiple of the expected life falls in this year
          const remainder = year % Math.round(expectedLife);
          if (year > 1 && remainder === 0 && year !== input.system_lifetime_years) {
            // Deduct replacement cost from savings on this specific year
            annualSavings -= input.battery_replacement_cost_iqd;
          }
        }
      }

      cumulativeSavings += annualSavings;

      // NPV calculation
      npv += annualSavings / Math.pow(1 + discountRate, year);

      yearlyBreakdown.push({
        year,
        savings_iqd: Math.round(annualSavings),
        cumulative_iqd: Math.round(cumulativeSavings),
        degradation_factor: Math.round(degradationFactor * 1000) / 1000
      });

      // Find payback year (first year cumulative savings exceed cost)
      if (!paybackFound && cumulativeSavings >= input.total_system_cost_iqd) {
        // Interpolate for more precise payback
        const prevCumulative = cumulativeSavings - annualSavings;
        const remaining = input.total_system_cost_iqd - prevCumulative;
        // Avoid division by zero or negative if replacement cost made savings negative
        if (annualSavings > 0) {
          paybackYear = year - 1 + (remaining / annualSavings);
        } else {
          paybackYear = year; // fallback
        }
        paybackFound = true;
      }
    }

    const totalSavings = cumulativeSavings;
    const roi = ((totalSavings - input.total_system_cost_iqd) / input.total_system_cost_iqd) * 100;

    // Year 1 monthly savings
    const year1Annual = (input.grid_coverage_percent / 100) * input.monthly_grid_bill_iqd * 12 - input.annual_maintenance_cost_iqd;

    return {
      payback_years: Math.round(paybackYear * 10) / 10,
      total_savings_lifetime_iqd: Math.round(totalSavings),
      roi_percent: Math.round(roi * 10) / 10,
      net_present_value_iqd: Math.round(npv),
      monthly_savings_iqd: Math.round(year1Annual / 12),
      yearly_savings: yearlyBreakdown
    };
  }

  /**
   * Risk Analysis — evaluate system risks based on environmental and design factors.
   */
  calculateRisk(input: RiskInput): RiskResult {
    const risks: RiskResult['risks'] = [];
    let totalScore = 0;

    // 1. Temperature Risk
    const tempDerating = calculateTempDerating(input.ambient_temp_max);
    if (input.ambient_temp_max >= 50) {
      risks.push({
        category: 'temperature',
        level: 'critical',
        description: `Extreme ambient temperature (${input.ambient_temp_max}°C) — panel derating ${(tempDerating * 100).toFixed(1)}%`,
        recommendation: 'Install ventilated mounting, consider panel spacing for airflow, add temperature monitoring'
      });
      totalScore += 30;
    } else if (input.ambient_temp_max >= 45) {
      risks.push({
        category: 'temperature',
        level: 'high',
        description: `High ambient temperature (${input.ambient_temp_max}°C) — panel derating ${(tempDerating * 100).toFixed(1)}%`,
        recommendation: 'Ensure adequate panel ventilation, consider elevated mounting structure'
      });
      totalScore += 20;
    } else if (input.ambient_temp_max >= 35) {
      risks.push({
        category: 'temperature',
        level: 'medium',
        description: `Moderate temperature impact (${input.ambient_temp_max}°C) — derating ${(tempDerating * 100).toFixed(1)}%`,
        recommendation: 'Standard ventilated mounting is sufficient'
      });
      totalScore += 10;
    }

    // 2. Dust Risk
    const dustMap = { low: 5, medium: 15, high: 25, extreme: 35 };
    const dustScore = dustMap[input.dust_level];
    totalScore += dustScore;

    if (input.dust_level === 'extreme') {
      risks.push({
        category: 'dust',
        level: 'critical',
        description: 'Extreme dust environment — expected soiling loss up to 15-20%',
        recommendation: 'Install automated panel cleaning system, schedule monthly maintenance, consider anti-soiling coating'
      });
    } else if (input.dust_level === 'high') {
      risks.push({
        category: 'dust',
        level: 'high',
        description: 'High dust environment — expected soiling loss 8-12%',
        recommendation: 'Schedule bi-weekly panel cleaning, consider tilt angle optimization for self-cleaning'
      });
    } else if (input.dust_level === 'medium') {
      risks.push({
        category: 'dust',
        level: 'medium',
        description: 'Moderate dust — expected soiling loss 4-6%',
        recommendation: 'Monthly panel cleaning recommended'
      });
    }

    // 3. Overload Risk (inverter capacity vs peak load)
    if (input.inverter_capacity_w > 0) {
      const loadRatio = input.peak_load_w / input.inverter_capacity_w;
      if (loadRatio > 1.0) {
        risks.push({
          category: 'overload',
          level: 'critical',
          description: `Peak load (${input.peak_load_w}W) exceeds inverter capacity (${input.inverter_capacity_w}W) by ${((loadRatio - 1) * 100).toFixed(0)}%`,
          recommendation: 'Upgrade inverter or reduce peak loads. Risk of inverter shutdown and damage.'
        });
        totalScore += 30;
      } else if (loadRatio > 0.85) {
        risks.push({
          category: 'overload',
          level: 'high',
          description: `Peak load at ${(loadRatio * 100).toFixed(0)}% of inverter capacity — limited headroom`,
          recommendation: 'Consider larger inverter for future expansion and surge handling'
        });
        totalScore += 15;
      } else if (loadRatio > 0.70) {
        risks.push({
          category: 'overload',
          level: 'medium',
          description: `Inverter loaded at ${(loadRatio * 100).toFixed(0)}% — acceptable with limited expansion room`,
          recommendation: 'Current sizing is adequate but plan for upgrades if loads increase'
        });
        totalScore += 5;
      }
    }

    // 4. Battery Risk (for systems with batteries)
    if (input.system_type !== 'ON_GRID' && input.battery_ah > 0) {
      const batteryRatio = input.battery_ah / input.required_ah;
      if (batteryRatio < 1.0) {
        risks.push({
          category: 'battery',
          level: 'critical',
          description: `Battery capacity (${input.battery_ah}Ah) is insufficient — need ${input.required_ah.toFixed(0)}Ah`,
          recommendation: 'Add more batteries to meet calculated requirement. Current setup will cause deep discharge damage.'
        });
        totalScore += 25;
      } else if (batteryRatio < 1.1) {
        risks.push({
          category: 'battery',
          level: 'medium',
          description: `Battery capacity is marginal — only ${((batteryRatio - 1) * 100).toFixed(0)}% headroom`,
          recommendation: 'Consider adding 10-20% more battery capacity for reliability'
        });
        totalScore += 10;
      }
    }

    // Calculate overall risk level
    let overall_risk: RiskResult['overall_risk'];
    if (totalScore >= 60) overall_risk = 'critical';
    else if (totalScore >= 35) overall_risk = 'high';
    else if (totalScore >= 15) overall_risk = 'medium';
    else overall_risk = 'low';

    return {
      overall_risk,
      risk_score: Math.min(totalScore, 100),
      risks
    };
  }
}
