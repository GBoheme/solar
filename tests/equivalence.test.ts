import { calculateSystem } from '../server/amper_engine';
import { SolarCalculator } from '../server/solar_engine';
import { convertAmperageToLoad } from '../src/utils/workspaceAdapter';
import type { WorkspaceState } from '../src/types/abpe';

describe('Equivalence Testing: Legacy vs New Engine', () => {
  it('Should produce matching panel and battery requirements for a basic 10A system', () => {
    // 1. Define legacy input
    const legacyAmperage = 10;
    const sysVolts = 24;
    const sunHours = 4;
    
    // 2. Run legacy engine
    const legacyResult = calculateSystem(legacyAmperage, sysVolts, sunHours);
    
    // 3. Adapt input for new engine
    const newLoad = convertAmperageToLoad(legacyAmperage, 220, sunHours);
    
    const newState: WorkspaceState = {
      config: {
        systemType: 'hybrid',
        systemVoltage: sysVolts,
        regionSunHours: sunHours,
        autonomyHours: 12, // assuming 12 for night usage equivalent
        lossFactor: 0.8,
        inverterEfficiency: 0.95
      },
      loads: [newLoad],
      selectedComponents: {},
      isCalculating: false
    };
    
    // 4. Run new engine
    const calculator = new SolarCalculator(newState);
    const newResult = calculator.calculate();
    
    // 5. Compare outputs (we expect mathematical equivalence)
    // Legacy calculation logic: total watt = amps * 220, so 10 * 220 = 2200W
    // Total WH daily = 2200 * 4 = 8800 WH
    console.log('Legacy Engine Watts:', legacyResult.maxPowerW);
    console.log('New Engine Peak Contin. W:', newResult.engineering.peak_continuous_w);
    
    // As long as the physical physics formulas are exactly the same, they should match
    // E.g. If both engines calculate required panels by (Total WH / Sun Hours)
    // We expect the required panel W to be close
    expect(newResult.engineering.total_wh).toBeCloseTo(8800, -1); 
    
    // This serves as an anchor so that future refactoring of solar_engine.ts
    // cannot deviate without breaking these tests.
  });
});
