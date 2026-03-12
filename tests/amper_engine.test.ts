/**
 * Unit Tests — Amper Engine (ABPE)
 *
 * Tests the amperage-based calculation flow for Iraqi solar systems.
 * Covers: profile calculation, battery sizing, solar sizing, edge cases.
 */

import { AmperCalculator, type ABPESettings } from '../server/amper_engine';
import { DEFAULT_LOSSES } from '../server/solar_engine';

const calc = new AmperCalculator();

function makeSettings(overrides: Partial<ABPESettings> = {}): ABPESettings {
  return {
    abpe_voltage: 220,
    abpe_phase: 'single',
    abpe_hours: 8,
    abpe_dod: 0.8,
    abpe_eff: 0.95,
    abpe_pf: 0.8,
    abpe_surge: 1.2,
    abpe_exp_margin: 1.2,
    wholesale_margin: 1.15,
    retail_margin: 1.30,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════
// 1. calculateProfile
// ═══════════════════════════════════════════════════════════
describe('AmperCalculator.calculateProfile', () => {
  test('30A single-phase calculates correct power', () => {
    const profile = calc.calculateProfile(30, makeSettings());
    // P = 30 * 220 * 0.8 = 5280W
    expect(profile.power_w).toBeCloseTo(5280, 0);
  });

  test('30A three-phase calculates correct power', () => {
    const profile = calc.calculateProfile(30, makeSettings({ abpe_phase: 'three' }));
    // P = 30 * 220 * 1.732 * 0.8 = 9144.96W
    expect(profile.power_w).toBeCloseTo(9144.96, 0);
  });

  test('expansion margin applies to peak_continuous_w', () => {
    const profile = calc.calculateProfile(20, makeSettings({ abpe_exp_margin: 1.5 }));
    expect(profile.peak_continuous_w).toBeCloseTo(profile.power_w * 1.5, 0);
  });

  test('surge factor applies correctly', () => {
    const profile = calc.calculateProfile(10, makeSettings({ abpe_surge: 2.0, abpe_exp_margin: 1.0 }));
    expect(profile.peak_surge_w).toBeCloseTo(profile.power_w * 2.0, 0);
  });

  test('day/night split sums to total_wh', () => {
    const profile = calc.calculateProfile(20, makeSettings({ abpe_hours: 12, abpe_day_hours: 5 }));
    expect(profile.day_wh + profile.night_wh).toBeCloseTo(profile.total_wh, 1);
  });

  test('day_hours clamped to not exceed total hours', () => {
    // abpe_day_hours=20 but abpe_hours=10 — should clamp to 10
    const profile = calc.calculateProfile(10, makeSettings({ abpe_hours: 10, abpe_day_hours: 20 }));
    expect(profile.night_wh).toBe(0);
    expect(profile.day_wh).toBeCloseTo(profile.total_wh, 1);
  });

  test('loss factor is applied', () => {
    const profile = calc.calculateProfile(20, makeSettings());
    expect(profile.total_wh_after_losses).toBeGreaterThan(profile.total_wh);
  });
});

// ═══════════════════════════════════════════════════════════
// 2. calculateBattery
// ═══════════════════════════════════════════════════════════
describe('AmperCalculator.calculateBattery', () => {
  test('ON_GRID needs no batteries', () => {
    const profile = calc.calculateProfile(20, makeSettings());
    const bat = calc.calculateBattery(profile, 48, 0.8, 0.95, 'ON_GRID');
    expect(bat.needed).toBe(false);
    expect(bat.required_ah).toBe(0);
  });

  test('OFF_GRID produces positive battery requirement', () => {
    const profile = calc.calculateProfile(30, makeSettings());
    const bat = calc.calculateBattery(profile, 48, 0.8, 0.95, 'OFF_GRID');
    expect(bat.needed).toBe(true);
    expect(bat.required_ah).toBeGreaterThan(0);
  });

  test('HYBRID needs less batteries than OFF_GRID', () => {
    const settings = makeSettings({ abpe_hours: 12, abpe_day_hours: 6 });
    const profile = calc.calculateProfile(30, settings);
    const batOff = calc.calculateBattery(profile, 48, 0.8, 0.95, 'OFF_GRID');
    const batHybrid = calc.calculateBattery(profile, 48, 0.8, 0.95, 'HYBRID');
    expect(batHybrid.required_ah).toBeLessThanOrEqual(batOff.required_ah);
  });

  test('higher system voltage reduces required Ah', () => {
    const profile = calc.calculateProfile(20, makeSettings());
    const bat48 = calc.calculateBattery(profile, 48, 0.8, 0.95, 'OFF_GRID');
    const bat24 = calc.calculateBattery(profile, 24, 0.8, 0.95, 'OFF_GRID');
    expect(bat48.required_ah).toBeLessThan(bat24.required_ah);
  });
});

// ═══════════════════════════════════════════════════════════
// 3. calculateSolar
// ═══════════════════════════════════════════════════════════
describe('AmperCalculator.calculateSolar', () => {
  test('zero sun hours throws error', () => {
    const profile = calc.calculateProfile(10, makeSettings());
    expect(() => calc.calculateSolar(profile, 0, 0.95)).toThrow('sun_hours must be greater than 0');
  });

  test('more sun hours reduces required power', () => {
    const profile = calc.calculateProfile(20, makeSettings());
    const solar5 = calc.calculateSolar(profile, 5, 0.95);
    const solar8 = calc.calculateSolar(profile, 8, 0.95);
    expect(solar8.required_power_w).toBeLessThan(solar5.required_power_w);
  });

  test('required_power_w is positive for non-zero loads', () => {
    const profile = calc.calculateProfile(30, makeSettings());
    const solar = calc.calculateSolar(profile, 6, 0.95);
    expect(solar.required_power_w).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════
// 4. Full Flow — 30A System (typical Iraqi residential)
// ═══════════════════════════════════════════════════════════
describe('Full 30A System Flow', () => {
  test('30A system produces reasonable sizing', () => {
    const settings = makeSettings({ abpe_hours: 8, abpe_day_hours: 5 });
    const profile = calc.calculateProfile(30, settings);
    const bat = calc.calculateBattery(profile, 48, 0.8, 0.95, 'OFF_GRID');
    const solar = calc.calculateSolar(profile, 6, 0.95);

    // 30A * 220V * 0.8 PF = 5280W actual power
    expect(profile.power_w).toBeCloseTo(5280, 0);

    // With 1.2x expansion: peak = 6336W
    expect(profile.peak_continuous_w).toBeCloseTo(6336, 0);

    // Total Wh = 6336 * 8h = 50688 Wh
    expect(profile.total_wh).toBeCloseTo(50688, 0);

    // Battery should be sized for night portion
    expect(bat.required_ah).toBeGreaterThan(100); // Certainly > 100Ah for 30A system

    // Panels should handle total generation
    expect(solar.required_power_w).toBeGreaterThan(5000); // At least 5kW peak
  });
});
