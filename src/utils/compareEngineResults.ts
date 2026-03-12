import { calculateSystem } from '../../server/amper_engine';
import { WorkspaceCalculateResponse } from '../types/abpe';

/**
 * Utility to compare the old Amper Engine output with the new Solar Engine output.
 * This is crucial for Phase 3 (Compatibility Validation) to ensure that the new
 * engine does not subtly break existing quote generation math before we deprecate the old engine.
 */
export function compareEngineResults(
  legacyAmperage: number,
  sysVolts: number,
  sunHours: number,
  newEngineResult: WorkspaceCalculateResponse
): {
  isEquivalent: boolean;
  divergences: string[];
} {
  const legacyResult = calculateSystem(legacyAmperage, sysVolts, sunHours);
  const divergences: string[] = [];

  // Compare Peak Power (W)
  const legacyWatts = legacyAmperage * 220;
  if (Math.abs(legacyWatts - newEngineResult.engineering.peak_continuous_w) > 5) {
    divergences.push(`Peak Continuous W mismatch. Legacy: ${legacyWatts}, New: ${newEngineResult.engineering.peak_continuous_w}`);
  }

  // Compare required Panel Capacity (W)
  const legacyPanelCapacity = legacyResult.items.reduce((acc, item) => 
    item.category === 'solar_panels' ? acc + (item.quantity * (item.capacity_w || 0)) : acc
  , 0);
  
  // Note: legacy engine didn't explicitly separate 'required_panel_w' from 'recommended actual panel w' 
  // as cleanly as the new engine, so we compare recommended against required for safety delta.
  if (Math.abs(legacyPanelCapacity - newEngineResult.engineering.required_panel_w) > 500) {
    // A 500W divergence is worth flagging, though rounding to panel sizes could cause it
    divergences.push(`Panel Capacity mismatch. Legacy Recommends: ${legacyPanelCapacity}W, New Requires: ${newEngineResult.engineering.required_panel_w}W`);
  }

  // Add more comparisons as needed (Ah, Battery quantities, etc.)

  return {
    isEquivalent: divergences.length === 0,
    divergences
  };
}
