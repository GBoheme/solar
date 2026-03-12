import { create } from 'zustand';
import { FastEstimateInput, FastEstimateResult, FastEstimateEngine, SystemType, UsagePeriod } from '../utils/fastEstimateEngine';

interface FastEstimateState {
  // Inputs
  amperage: number | '';
  systemType: SystemType;
  usagePeriod: UsagePeriod;
  hours: number;
  heavySurge: boolean;

  // Output
  result: FastEstimateResult | null;
  isCalculating: boolean;

  // Actions
  setAmperage: (amps: number | '') => void;
  setSystemType: (type: SystemType) => void;
  setUsagePeriod: (period: UsagePeriod) => void;
  setHours: (hours: number) => void;
  setHeavySurge: (surge: boolean) => void;
  
  calculate: () => void;
  reset: () => void;
}

export const useFastEstimateStore = create<FastEstimateState>((set, get) => ({
  amperage: '',
  systemType: 'HYBRID',
  usagePeriod: 'both',
  hours: 8,
  heavySurge: false,
  result: null,
  isCalculating: false,

  setAmperage: (amps) => {
    set({ amperage: amps });
    get().calculate(); // Auto-calculate on input change for "instant" feel
  },
  setSystemType: (type) => {
    set({ systemType: type });
    get().calculate();
  },
  setUsagePeriod: (period) => {
    set({ usagePeriod: period });
    get().calculate();
  },
  setHours: (hours) => {
    set({ hours });
    get().calculate();
  },
  setHeavySurge: (surge) => {
    set({ heavySurge: surge });
    get().calculate();
  },

  calculate: async () => {
    const { amperage, systemType, usagePeriod, hours, heavySurge } = get();
    if (typeof amperage !== 'number' || amperage <= 0) {
      set({ result: null });
      return;
    }

    set({ isCalculating: true });

    const input: FastEstimateInput = {
      amperage,
      systemType,
      usagePeriod,
      hours,
      heavySurge
    };

    try {
      const result = await FastEstimateEngine.calculate(input);
      set({ result, isCalculating: false });
    } catch (e) {
      console.error('Fast Estimate API Error:', e);
      set({ result: null, isCalculating: false });
    }
  },

  reset: () => set({
    amperage: '',
    systemType: 'HYBRID',
    usagePeriod: 'both',
    hours: 8,
    heavySurge: false,
    result: null,
    isCalculating: false
  })
}));
