import { apiJson } from './apiFetch';

export type SystemType = 'OFF_GRID' | 'ON_GRID' | 'HYBRID';
export type UsagePeriod = 'day' | 'night' | 'both';

export interface FastEstimateInput {
  amperage: number;
  systemType: SystemType;
  usagePeriod: UsagePeriod;
  hours: number;
  heavySurge: boolean; // e.g. motors, ACs
}

export interface PackageTier {
  id: 'economic' | 'balanced' | 'premium';
  name: string;
  description: string;
  profileRules: string[];
  estimatedPriceUsd: number;
}

export interface FastEstimateResult {
  assumptions: {
    nominalVoltage: number;
    phase: string;
    powerFactor: number;
    surgeMultiplier: number;
  };
  technical: {
    requiredPowerW: number;
    totalEnergyWh: number;
    suggestedSystemVoltage: number;
    requiredBatteryCapacityAh: number;
    approximatePanelCount: number; // Assuming standard 550W panel
    suggestedInverterSizeW: number;
  };
  packages: PackageTier[];
}

export class FastEstimateEngine {
  /**
   * Calculates the fast estimate by querying the UNIFIED BACKEND for physics,
   * then applying regional pricing tier assumptions.
   * 
   * Explicit Assumptions for Amperage-to-Power:
   * - Nominal Voltage: 220V AC
   * - Phase: Single Phase
   * - Power Factor (PF): 0.8
   * - Base Surge: 1.2x (if heavySurge is true, becomes 2.0x for inverter sizing)
   */
  static async calculate(input: FastEstimateInput): Promise<FastEstimateResult> {
    const nominalVoltage = 220;
    const pf = 0.8;
    const baseSurge = 1.2;
    const heavySurgeMultiplier = input.heavySurge ? 2.0 : 1.0;
    const surgeFactor = input.heavySurge ? 2.0 : 1.2;

    const watts = input.amperage * nominalVoltage * pf;

    // Build payload to hit the exact same backend engine that detail-mode uses
    const payload = {
       systemType: input.systemType,
       gridHoursOff: input.hours,
       appliances: [
           {
               name: `Synthetic Load (${input.amperage}A)`,
               watts,
               hours_daily: input.hours,
               qty: 1,
               surge_factor: surgeFactor,
               usage_period: input.usagePeriod
           }
       ]
    };

    const res = await apiJson('/api/calculate-recommendation', {
       method: 'POST',
       body: JSON.stringify(payload)
    });

    const eng = res.engineering;
    
    // Extract exact backend physics
    const totalEnergyWh = eng.total_wh_after_losses;
    const requiredPowerW = eng.peak_continuous_w;
    const suggestedSystemVoltage = eng.system_voltage;
    const requiredBatteryCapacityAh = eng.required_ah || 0;
    const approximatePanelCount = Math.ceil(eng.required_panel_w / 550);
    const suggestedInverterSizeW = Math.ceil(eng.peak_surge_w * 1.25); // 25% safety margin on surge

    // Pricing Heuristics (Generic Tiers, NOT catalog)
    const economicPanelCost = 550 * 0.11; 
    const balancedPanelCost = 550 * 0.13; 
    const premiumPanelCost = 550 * 0.20;  

    const economicBatCostAh = suggestedSystemVoltage === 48 ? 1.8 : 0.9;
    const balancedBatCostAh = suggestedSystemVoltage === 48 ? 2.8 : 1.4;
    const premiumBatCostAh = suggestedSystemVoltage === 48 ? 8.0 : 4.0;

    const economicInverterCostW = 0.08; 
    const balancedInverterCostW = 0.12; 
    const premiumInverterCostW = 0.20;  

    const economicPrice = 
      (approximatePanelCount * economicPanelCost) + 
      (requiredBatteryCapacityAh * economicBatCostAh) + 
      (suggestedInverterSizeW * economicInverterCostW);

    const balancedPrice = 
      (approximatePanelCount * balancedPanelCost) + 
      (requiredBatteryCapacityAh * balancedBatCostAh) + 
      (suggestedInverterSizeW * balancedInverterCostW);

    const premiumPrice = 
      (approximatePanelCount * premiumPanelCost) + 
      (requiredBatteryCapacityAh * premiumBatCostAh) + 
      (suggestedInverterSizeW * premiumInverterCostW);

    const packages: PackageTier[] = [
      {
        id: 'premium',
        name: 'الباقة الممتازة',
        description: 'أحدث التقنيات لعمر افتراضي طويل جداً وأداء مستقر تحت أقصى الظروف.',
        profileRules: [
          `ألواح شمسية: ${approximatePanelCount} لوح (قدرة 550W للوح)`,
          `بطاريات: ${requiredBatteryCapacityAh}Ah / ${suggestedSystemVoltage}V (ليثيوم LiFePO4 ذكية)`,
          `إنفرتر: ${suggestedInverterSizeW.toLocaleString()}W (هجين ذكي متطور)`
        ],
        estimatedPriceUsd: Math.ceil(premiumPrice / 50) * 50
      }
    ];

    return {
      assumptions: {
        nominalVoltage,
        phase: 'Single Phase',
        powerFactor: pf,
        surgeMultiplier: surgeFactor
      },
      technical: {
        requiredPowerW: Math.ceil(requiredPowerW),
        totalEnergyWh: Math.ceil(totalEnergyWh),
        suggestedSystemVoltage,
        requiredBatteryCapacityAh: Math.ceil(requiredBatteryCapacityAh),
        approximatePanelCount,
        suggestedInverterSizeW
      },
      packages
    };
  }
}
