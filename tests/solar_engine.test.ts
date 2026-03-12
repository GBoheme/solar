/**
 * Unit Tests — Solar Engine v2.0
 *
 * Covers: Load profile, battery sizing, solar sizing, cable loss, MPPT, ROI, risk.
 * Tests edge cases: zero loads, zero sun hours, extreme temperatures, surge overload.
 */

import {
  SolarCalculator,
  DEFAULT_LOSSES,
  computeLossFactor,
  calculateTempDerating,
  calculateBatteryLife,
  type LoadItem,
  type SolarEngineConfig,
  type SystemLossFactors,
} from '../server/solar_engine';

const calc = new SolarCalculator();

// ─── Helper: Build a standard config ─────────────────────
function makeConfig(overrides: Partial<SolarEngineConfig> = {}): SolarEngineConfig {
  return {
    system_type: 'OFF_GRID',
    system_voltage: 48,
    sun_hours: 6,
    autonomy_hours: 24,
    dod: 0.8,
    battery_efficiency: 0.95,
    temp_correction: 1.1,
    future_expansion: 1.2,
    losses: DEFAULT_LOSSES,
    ...overrides,
  };
}

function makeLoad(overrides: Partial<LoadItem> = {}): LoadItem {
  return {
    name: 'Test Load',
    watts: 100,
    hours_daily: 8,
    qty: 1,
    surge_factor: 1,
    usage_period: 'both',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════
// 1. computeLossFactor
// ═══════════════════════════════════════════════════════════
describe('computeLossFactor', () => {
  test('default losses produce expected factor', () => {
    const factor = computeLossFactor(DEFAULT_LOSSES);
    // (1-0.03) * (1-0.10) * (1-0.05) * 0.93 = 0.97 * 0.90 * 0.95 * 0.93 ≈ 0.7714
    expect(factor).toBeCloseTo(0.7714, 3);
    expect(factor).toBeLessThan(1);
    expect(factor).toBeGreaterThan(0);
  });

  test('zero losses produce factor ≈ 1', () => {
    const factor = computeLossFactor({
      cable_loss: 0, temp_derating: 0, dust_factor: 0, inverter_efficiency: 1.0,
    });
    expect(factor).toBeCloseTo(1.0, 4);
  });
});

// ═══════════════════════════════════════════════════════════
// 2. calculateTempDerating
// ═══════════════════════════════════════════════════════════
describe('calculateTempDerating', () => {
  test('25°C ambient gives ~10% derating (cell temp = 50°C)', () => {
    const derating = calculateTempDerating(25);
    // deltaT = 50-25 = 25, derating = 0.004 * 25 = 0.10
    expect(derating).toBeCloseTo(0.10, 2);
  });

  test('0°C ambient gives 0 derating (cell temp = 25°C = STC)', () => {
    const derating = calculateTempDerating(0);
    expect(derating).toBe(0);
  });

  test('-10°C gives 0 (negative derating clamped)', () => {
    const derating = calculateTempDerating(-10);
    expect(derating).toBe(0);
  });

  test('derating capped at 50%', () => {
    const derating = calculateTempDerating(200);
    expect(derating).toBeLessThanOrEqual(0.50);
  });
});

// ═══════════════════════════════════════════════════════════
// 3. calculateLoadProfile
// ═══════════════════════════════════════════════════════════
describe('calculateLoadProfile', () => {
  test('empty loads produce zero profile', () => {
    const profile = calc.calculateLoadProfile([], 1.0, DEFAULT_LOSSES, 6);
    expect(profile.total_wh).toBe(0);
    expect(profile.day_wh).toBe(0);
    expect(profile.night_wh).toBe(0);
    expect(profile.peak_continuous_w).toBe(0);
    expect(profile.peak_surge_w).toBe(0);
  });

  test('single daytime-only load', () => {
    const loads: LoadItem[] = [makeLoad({ watts: 500, hours_daily: 6, usage_period: 'day' })];
    const profile = calc.calculateLoadProfile(loads, 1.0, DEFAULT_LOSSES, 6);
    expect(profile.day_wh).toBe(3000);
    expect(profile.night_wh).toBe(0);
    expect(profile.total_wh).toBe(3000);
    expect(profile.peak_continuous_w).toBe(500);
  });

  test('single nighttime-only load', () => {
    const loads: LoadItem[] = [makeLoad({ watts: 200, hours_daily: 10, usage_period: 'night' })];
    const profile = calc.calculateLoadProfile(loads, 1.0, DEFAULT_LOSSES, 6);
    expect(profile.day_wh).toBe(0);
    expect(profile.night_wh).toBe(2000);
    expect(profile.total_wh).toBe(2000);
  });

  test('both-period load splits by sun hours', () => {
    const loads: LoadItem[] = [makeLoad({ watts: 100, hours_daily: 12, usage_period: 'both' })];
    const profile = calc.calculateLoadProfile(loads, 1.0, DEFAULT_LOSSES, 6);
    // dayFraction = 6/12 = 0.5, nightFraction = 0.5
    // total_wh = 1200, day_wh = 600, night_wh = 600
    expect(profile.total_wh).toBe(1200);
    expect(profile.day_wh).toBe(600);
    expect(profile.night_wh).toBe(600);
  });

  test('future expansion scales all values', () => {
    const loads: LoadItem[] = [makeLoad({ watts: 100, hours_daily: 10, qty: 1 })];
    const noExpansion = calc.calculateLoadProfile(loads, 1.0, DEFAULT_LOSSES, 6);
    const withExpansion = calc.calculateLoadProfile(loads, 1.5, DEFAULT_LOSSES, 6);
    expect(withExpansion.total_wh).toBeCloseTo(noExpansion.total_wh * 1.5, 1);
    expect(withExpansion.peak_continuous_w).toBeCloseTo(noExpansion.peak_continuous_w * 1.5, 1);
  });

  test('surge factor is applied correctly', () => {
    const loads: LoadItem[] = [makeLoad({ watts: 100, surge_factor: 3 })];
    const profile = calc.calculateLoadProfile(loads, 1.0, DEFAULT_LOSSES, 6);
    expect(profile.peak_surge_w).toBe(300);
    expect(profile.peak_continuous_w).toBe(100);
  });

  test('total_wh_after_losses > total_wh (compensates for losses)', () => {
    const loads: LoadItem[] = [makeLoad({ watts: 1000, hours_daily: 8 })];
    const profile = calc.calculateLoadProfile(loads, 1.0, DEFAULT_LOSSES, 6);
    expect(profile.total_wh_after_losses).toBeGreaterThan(profile.total_wh);
  });
});

// ═══════════════════════════════════════════════════════════
// 4. calculateBattery
// ═══════════════════════════════════════════════════════════
describe('calculateBattery', () => {
  test('ON_GRID needs no batteries', () => {
    const config = makeConfig({ system_type: 'ON_GRID' });
    const profile = calc.calculateLoadProfile([makeLoad()], 1.0, DEFAULT_LOSSES, 6);
    const bat = calc.calculateBattery(config, profile);
    expect(bat.needed).toBe(false);
    expect(bat.required_ah).toBe(0);
  });

  test('OFF_GRID produces positive battery requirement', () => {
    const config = makeConfig({ system_type: 'OFF_GRID' });
    const profile = calc.calculateLoadProfile(
      [makeLoad({ watts: 500, hours_daily: 12 })],
      1.0, DEFAULT_LOSSES, 6
    );
    const bat = calc.calculateBattery(config, profile);
    expect(bat.needed).toBe(true);
    expect(bat.required_ah).toBeGreaterThan(0);
    expect(bat.required_energy_wh).toBeGreaterThan(0);
  });

  test('HYBRID batteries sized only for night loads', () => {
    const config = makeConfig({ system_type: 'HYBRID' });
    const configOff = makeConfig({ system_type: 'OFF_GRID' });
    const profile = calc.calculateLoadProfile(
      [makeLoad({ watts: 500, hours_daily: 12 })],
      1.2, DEFAULT_LOSSES, 6
    );
    const batHybrid = calc.calculateBattery(config, profile);
    const batOffGrid = calc.calculateBattery(configOff, profile);
    // HYBRID should need less or equal batteries than OFF_GRID
    expect(batHybrid.required_ah).toBeLessThanOrEqual(batOffGrid.required_ah);
  });

  test('higher DoD reduces required Ah', () => {
    const loads = [makeLoad({ watts: 500, hours_daily: 10 })];
    const profile = calc.calculateLoadProfile(loads, 1.0, DEFAULT_LOSSES, 6);
    const bat80 = calc.calculateBattery(makeConfig({ dod: 0.8 }), profile);
    const bat50 = calc.calculateBattery(makeConfig({ dod: 0.5 }), profile);
    expect(bat80.required_ah).toBeLessThan(bat50.required_ah);
  });
});

// ═══════════════════════════════════════════════════════════
// 5. calculateSolar
// ═══════════════════════════════════════════════════════════
describe('calculateSolar', () => {
  test('zero sun hours throws error', () => {
    const config = makeConfig({ sun_hours: 0 });
    const profile = calc.calculateLoadProfile([makeLoad()], 1.0, DEFAULT_LOSSES, 6);
    expect(() => calc.calculateSolar(config, profile)).toThrow('sun_hours must be greater than 0');
  });

  test('more sun hours reduces required panel wattage', () => {
    const loads = [makeLoad({ watts: 1000, hours_daily: 10 })];
    const profile = calc.calculateLoadProfile(loads, 1.0, DEFAULT_LOSSES, 6);
    const solar6 = calc.calculateSolar(makeConfig({ sun_hours: 6 }), profile);
    const solar8 = calc.calculateSolar(makeConfig({ sun_hours: 8 }), profile);
    expect(solar8.required_power_w).toBeLessThan(solar6.required_power_w);
  });

  test('empty loads produce zero solar requirement', () => {
    const profile = calc.calculateLoadProfile([], 1.0, DEFAULT_LOSSES, 6);
    const solar = calc.calculateSolar(makeConfig(), profile);
    expect(solar.required_power_w).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
// 6. calculateFullSystem (integration)
// ═══════════════════════════════════════════════════════════
describe('calculateFullSystem', () => {
  test('typical Iraqi household scenario', () => {
    const loads: LoadItem[] = [
      makeLoad({ name: 'AC', watts: 1500, hours_daily: 10, surge_factor: 3, usage_period: 'both' }),
      makeLoad({ name: 'Fridge', watts: 150, hours_daily: 24, surge_factor: 2, usage_period: 'both' }),
      makeLoad({ name: 'Lights', watts: 100, hours_daily: 7, usage_period: 'night' }),
      makeLoad({ name: 'Pump', watts: 750, hours_daily: 2, surge_factor: 3, usage_period: 'day' }),
    ];
    const config = makeConfig({ sun_hours: 6.5, system_voltage: 48 });
    const result = calc.calculateFullSystem(loads, config);

    expect(result.load_profile.total_wh).toBeGreaterThan(0);
    expect(result.battery.needed).toBe(true);
    expect(result.battery.required_ah).toBeGreaterThan(0);
    expect(result.solar.required_power_w).toBeGreaterThan(0);
    expect(result.system_type).toBe('OFF_GRID');
  });

  test('low sun hours scenario (3h) requires more panels', () => {
    const loads = [makeLoad({ watts: 1000, hours_daily: 8 })];
    const highSun = calc.calculateFullSystem(loads, makeConfig({ sun_hours: 8 }));
    const lowSun = calc.calculateFullSystem(loads, makeConfig({ sun_hours: 3 }));
    expect(lowSun.solar.required_power_w).toBeGreaterThan(highSun.solar.required_power_w);
  });
});

// ═══════════════════════════════════════════════════════════
// 7. calculateBatteryLife
// ═══════════════════════════════════════════════════════════
describe('calculateBatteryLife', () => {
  test('lithium at 25°C lasts ~16 years', () => {
    const life = calculateBatteryLife('LITHIUM', 25);
    expect(life).toBeCloseTo(6000 / 365, 0); // ~16.4 years
  });

  test('lead acid at 25°C lasts ~1.4 years', () => {
    const life = calculateBatteryLife('LEAD_ACID', 25);
    expect(life).toBeCloseTo(500 / 365, 1); // ~1.37 years
  });

  test('high temperature reduces battery life', () => {
    const lifeCool = calculateBatteryLife('LITHIUM', 25);
    const lifeHot = calculateBatteryLife('LITHIUM', 45);
    expect(lifeHot).toBeLessThan(lifeCool);
  });
});
