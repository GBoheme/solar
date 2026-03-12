/**
 * Amper-Based Power Engine (ABPE)
 * 
 * Calculates system requirements from amperage input.
 * Professional grade with:
 *   - System Loss Factor integration
 *   - System Type support (OFF_GRID / ON_GRID / HYBRID)
 *   - Day/Night split for amper-based loads
 */

import {
    type SystemType,
    type SystemLossFactors,
    DEFAULT_LOSSES,
    computeLossFactor
} from './solar_engine';

// ─── Types ───────────────────────────────────────────────────

export interface ABPESettings {
    abpe_voltage: number;
    abpe_phase: 'single' | 'three';
    abpe_hours: number;
    abpe_dod: number;
    abpe_eff: number;
    abpe_pf: number;
    abpe_surge: number;
    abpe_exp_margin: number;
    /** Day hours out of total abpe_hours (rest = night) */
    abpe_day_hours?: number;
    /** System type: OFF_GRID (default) / ON_GRID / HYBRID */
    system_type?: SystemType;
    /** System loss factors — uses defaults if not provided */
    losses?: SystemLossFactors;
    // Legacy fields (kept for backward compat)
    wholesale_margin: number;
    retail_margin: number;
}

export interface AmperProfile {
    power_w: number;
    peak_continuous_w: number;
    peak_surge_w: number;
    total_wh: number;
    day_wh: number;
    night_wh: number;
    peak_day_w: number;
    peak_night_w: number;
    loss_factor: number;
    total_wh_after_losses: number;
}

export interface AmperBatteryResult {
    required_ah: number;
    required_energy_wh: number;
    needed: boolean;
}

export interface AmperSolarResult {
    required_power_w: number;
    total_generation_needed_wh: number;
}

// ─── Calculator ──────────────────────────────────────────────

export class AmperCalculator {

    /**
     * Step 1: Calculate power/energy profile from amperage.
     * Splits into day/night based on abpe_day_hours.
     */
    calculateProfile(requestedAmps: number, settings: ABPESettings): AmperProfile {
        const voltage = settings.abpe_voltage;
        const pf = settings.abpe_pf || 0.8;
        let power_w = 0;

        if (settings.abpe_phase === 'three') {
            power_w = requestedAmps * voltage * 1.732 * pf;
        } else {
            power_w = requestedAmps * voltage * pf;
        }

        // Apply surge & future expansion margins for inverter sizing
        const peak_continuous_w = power_w * settings.abpe_exp_margin;
        const peak_surge_w = power_w * settings.abpe_surge * settings.abpe_exp_margin;

        // Total daily energy
        const total_wh = peak_continuous_w * settings.abpe_hours;

        // Day/Night split — clamp dayHours to not exceed total hours
        const rawDayHours = settings.abpe_day_hours ?? Math.min(settings.abpe_hours, 8);
        const dayHours = Math.min(rawDayHours, settings.abpe_hours);
        const nightHours = Math.max(0, settings.abpe_hours - dayHours);
        const day_wh = peak_continuous_w * dayHours;
        const night_wh = peak_continuous_w * nightHours;

        const peak_day_w = dayHours > 0 ? peak_continuous_w : 0;
        const peak_night_w = nightHours > 0 ? peak_continuous_w : 0;

        // Apply loss factor
        const losses = settings.losses || DEFAULT_LOSSES;
        const loss_factor = computeLossFactor(losses);
        const total_wh_after_losses = total_wh / loss_factor;

        return {
            power_w,
            peak_continuous_w,
            peak_surge_w,
            total_wh,
            day_wh,
            night_wh,
            peak_day_w,
            peak_night_w,
            loss_factor,
            total_wh_after_losses
        };
    }

    /**
     * Step 2: Battery calculation with system type awareness.
     */
    calculateBattery(
        profile: AmperProfile,
        systemVoltage: number,
        dod: number,
        efficiency: number,
        systemType: SystemType = 'OFF_GRID'
    ): AmperBatteryResult {
        // ON_GRID: No batteries needed
        if (systemType === 'ON_GRID') {
            return { required_ah: 0, required_energy_wh: 0, needed: false };
        }

        let energy_to_store: number;

        if (systemType === 'OFF_GRID') {
            // Night load + losses (consistent with solar_engine — panels cover day directly)
            energy_to_store = profile.night_wh > 0
                ? profile.night_wh / profile.loss_factor
                : profile.total_wh_after_losses; // Fallback if no night split
        } else {
            // HYBRID: Only night loads need battery backup
            energy_to_store = profile.night_wh / profile.loss_factor;
        }

        const required_energy_wh = energy_to_store / (dod * efficiency);
        const required_ah = required_energy_wh / systemVoltage;

        return { required_ah, required_energy_wh, needed: true };
    }

    /**
     * Step 3: Solar panel calculation — accounts for losses.
     */
    calculateSolar(
        profile: AmperProfile,
        sun_hours: number,
        efficiency: number
    ): AmperSolarResult {
        // Guard: sun_hours must be > 0 to avoid Infinity
        if (!sun_hours || sun_hours <= 0) {
            throw new Error('sun_hours must be greater than 0');
        }
        // Panels must generate total energy including losses
        // Note: total_wh_after_losses already includes inverter efficiency via loss_factor
        // Do NOT divide by efficiency again to avoid double-counting
        const total_generation_needed_wh = profile.total_wh_after_losses;
        const required_power_w = total_generation_needed_wh / sun_hours;

        return { required_power_w, total_generation_needed_wh };
    }
}
