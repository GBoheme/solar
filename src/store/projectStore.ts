import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ApplianceLoad {
  id: string;
  name: string;
  watts: number;
  qty: number;
  hours_daily: number;
  surge_factor: number;
  type: string;
  icon?: string;
  usage_period?: 'day' | 'night' | 'both';
}

export interface AdvancedSettings {
  safety_margin: number;
  dod: number;
  efficiency: number;
  temp_correction: number;
  future_expansion: number;
}

export interface CatalogItem {
  id: string;
  company_id?: string;
  sku?: string;
  category?: string;
  brand?: string;
  model: string;
  spec: string;
  cost_price?: number;     // Legacy
  sale_price?: number;     // Legacy
  purchase_price?: number; // Phase 6 New
  wholesale_price?: number;// Phase 6 New
  retail_price?: number;   // Phase 6 New
  currency?: string;
  stock_qty?: number;
  unit?: string;
  created_at?: string;
}

export interface SystemRecommendationData {
  engineering: {
    total_wh: number;
    day_wh?: number;
    night_wh?: number;
    loss_factor?: number;
    total_wh_after_losses?: number;
    peak_continuous_w: number;
    peak_surge_w: number;
    required_ah: number;
    required_panel_w: number;
    system_voltage: number;
    system_type?: string;
    autonomy_hours: number;
    safety_margin: number;
    dod: number;
    efficiency: number;
    temp_correction: number;
    future_expansion: number;
    warnings?: string[];
    battery_bank?: any;
    system_balance?: any;
  };
  recommendation: {
    material_cost: number;
    wholesale_total?: number;
    retail_total?: number;
    sale_price?: number; // legacy payload
    panels: { count: number; item: CatalogItem };
    batteries: {
      count: number;
      item: CatalogItem;
      alternatives?: { item: CatalogItem, count: number, total_cost: number, total_sale: number }[];
    };
    inverter: { item: CatalogItem };
    controller?: { item: CatalogItem };
  };
  pricing?: any;
  payment_options?: any;
}

interface ProjectState {
  step: number;
  isProMode: boolean;
  projectType: string | null;
  region: any | null;
  appliances: ApplianceLoad[];
  systemType: string;
  gridHoursOff: number;
  advancedSettings: AdvancedSettings;
  recommendation: SystemRecommendationData | null;

  setStep: (step: number) => void;
  toggleProMode: () => void;
  setProjectType: (type: string) => void;
  setRegion: (region: any) => void;
  addAppliance: (appliance: ApplianceLoad) => void;
  updateApplianceQty: (id: string, qty: number) => void;
  updateApplianceHours: (id: string, hours: number) => void;
  updateAppliancePeriod: (id: string, period: 'day' | 'night' | 'both') => void;
  removeAppliance: (id: string) => void;
  setSystemType: (type: string) => void;
  setGridHoursOff: (hours: number) => void;
  updateAdvancedSettings: (settings: Partial<AdvancedSettings>) => void;
  setRecommendation: (rec: SystemRecommendationData | null) => void;
  reset: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      step: 1,
      isProMode: false,
      projectType: null,
      region: null,
      appliances: [],
      systemType: 'hybrid',
      gridHoursOff: 12,
      advancedSettings: {
        safety_margin: 1.25,
        dod: 0.8,
        efficiency: 0.95,
        temp_correction: 1.1,
        future_expansion: 1.2
      },
      recommendation: null,

      setStep: (step) => set({ step }),
      toggleProMode: () => set((state) => ({ isProMode: !state.isProMode })),
      setProjectType: (type) => set({ projectType: type }),
      setRegion: (region) => set({ region }),
      addAppliance: (appliance) => set((state) => {
        const existing = state.appliances.find(a => a.id === appliance.id);
        if (existing) {
          return { appliances: state.appliances.map(a => a.id === appliance.id ? { ...a, qty: a.qty + 1 } : a) };
        }
        return { appliances: [...state.appliances, { ...appliance, qty: appliance.qty || 1, hours_daily: appliance.hours_daily || 4 }] };
      }),
      updateApplianceQty: (id, qty) => set((state) => ({
        appliances: state.appliances.map(a => a.id === id ? { ...a, qty } : a)
      })),
      updateApplianceHours: (id, hours) => set((state) => ({
        appliances: state.appliances.map(a => a.id === id ? { ...a, hours_daily: hours } : a)
      })),
      updateAppliancePeriod: (id, period) => set((state) => ({
        appliances: state.appliances.map(a => a.id === id ? { ...a, usage_period: period } : a)
      })),
      removeAppliance: (id) => set((state) => ({
        appliances: state.appliances.filter(a => a.id !== id)
      })),
      setSystemType: (type) => set({ systemType: type }),
      setGridHoursOff: (hours) => set({ gridHoursOff: hours }),
      updateAdvancedSettings: (settings) => set((state) => ({ advancedSettings: { ...state.advancedSettings, ...settings } })),
      setRecommendation: (rec) => set({ recommendation: rec }),
      reset: () => set({ step: 1, projectType: null, region: null, appliances: [], recommendation: null })
    }),
    {
      name: 'smart-solar-project-storage',
    }
  )
);
