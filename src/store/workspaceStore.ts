import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WorkspaceState, WorkspaceConfig, WorkspaceLoadItem, WorkspaceSelectedComponents } from '../types/abpe';
import { workspaceApi } from '../services/workspaceApi';

interface WorkspaceStore extends WorkspaceState {
    isCalculating: boolean;
    // Actions
    loadPresets: () => Promise<void>;
    setConfig: (config: Partial<WorkspaceConfig>) => void;
    setCalculationMode: (mode: 'manual' | 'debounced') => void;
    
    // Loads
    addLoad: (load: Omit<WorkspaceLoadItem, 'id'>) => void;
    updateLoad: (id: string, updates: Partial<WorkspaceLoadItem>) => void;
    removeLoad: (id: string) => void;
    setQuickAmpereLoad: (amps: number, voltage: number, hoursDaily: number) => void;
    
    // Components
    selectComponent: (type: 'panel' | 'battery' | 'inverter' | 'controller', id: string | undefined) => void;
    setCountOverride: (type: 'panel' | 'battery' | 'inverter', count: number | undefined) => void;
    lockComponent: (type: 'panel' | 'battery' | 'inverter', locked: boolean) => void;
    clearComponentSelection: () => void;
    
    // Calc Lifecycle
    calculate: () => Promise<void>;
    resetWorkspace: () => void;
}

const initialConfig: WorkspaceConfig = {
    systemType: 'HYBRID',
    systemVoltageMode: 'auto',
    regionSunHours: 5,
    autonomyHours: 12,
    advanced: {
        safetyMargin: 1.2,
        depthOfDischarge: 0.8,
        efficiency: 0.85,
        futureExpansion: 1.1,
        surgeFactor: 2.0
    }
};

const initialSelectedComponents: WorkspaceSelectedComponents = {};

export const useWorkspaceStore = create<WorkspaceStore>()(
    persist(
        (set, get) => ({
            config: initialConfig,
            loads: [],
            selectedComponents: initialSelectedComponents,
            ui: {
                activeTab: 'loads',
                isProMode: false,
                calculationMode: 'manual',
                isDirty: false
            },
            result: undefined,
            isCalculating: false,

            loadPresets: async () => {
                // To be implemented in next steps with the /api/workspace/presets API
                console.log('Loading presets...');
            },

            setConfig: (newConfig) => set((state) => ({ 
                config: { ...state.config, ...newConfig },
                ui: { ...state.ui, isDirty: true }
            })),

            setCalculationMode: (mode) => set((state) => ({
                ui: { ...state.ui, calculationMode: mode }
            })),

            addLoad: (load) => set((state) => ({
                loads: [...state.loads, { ...load, id: crypto.randomUUID() }],
                ui: { ...state.ui, isDirty: true }
            })),

            updateLoad: (id, updates) => set((state) => ({
                loads: state.loads.map(l => l.id === id ? { ...l, ...updates } : l),
                ui: { ...state.ui, isDirty: true }
            })),

            removeLoad: (id) => set((state) => ({
                loads: state.loads.filter(l => l.id !== id),
                ui: { ...state.ui, isDirty: true }
            })),

            setQuickAmpereLoad: (amps, voltage, hoursDaily) => set((state) => {
                const syntheticLoad: WorkspaceLoadItem = {
                    id: 'quick-ampere-synthetic',
                    label: `Quick Ampere (${amps}A)`,
                    watts: amps * voltage,
                    hoursDaily: hoursDaily,
                    quantity: 1,
                    usagePeriod: 'both' // Assumption for quick quote
                };
                
                // Replace any existing quick load, or add if new
                const filteredLoads = state.loads.filter(l => l.id !== 'quick-ampere-synthetic');
                return {
                    loads: [...filteredLoads, syntheticLoad],
                    ui: { ...state.ui, isDirty: true }
                };
            }),

            selectComponent: (type, id) => set((state) => ({
                selectedComponents: { ...state.selectedComponents, [`${type}Id`]: id },
                ui: { ...state.ui, isDirty: true }
            })),

            setCountOverride: (type, count) => set((state) => {
                const key = type === 'inverter' ? 'inverterQtyOverride' : `${type}CountOverride`;
                return {
                    selectedComponents: { ...state.selectedComponents, [key]: count },
                    ui: { ...state.ui, isDirty: true }
                };
            }),

            lockComponent: (type, locked) => set((state) => ({
                selectedComponents: { ...state.selectedComponents, [`lock${type.charAt(0).toUpperCase() + type.slice(1)}`]: locked },
                ui: { ...state.ui, isDirty: true }
            })),

            clearComponentSelection: () => set((state) => ({
                selectedComponents: initialSelectedComponents,
                ui: { ...state.ui, isDirty: true }
            })),

            calculate: async () => {
                const state = get();
                // Validate before call
                if (state.loads.length === 0) {
                    throw new Error("Cannot calculate without any loads.");
                }
                
                try {
                    set({ isCalculating: true });
                    const result = await workspaceApi.calculateWorkspace(state);
                    set((s) => ({ result, ui: { ...s.ui, isDirty: false }, isCalculating: false }));
                } catch (error) {
                    console.error("Calculation failed", error);
                    set({ isCalculating: false });
                    throw error;
                }
            },

            resetWorkspace: () => set({
                config: initialConfig,
                loads: [],
                selectedComponents: initialSelectedComponents,
                ui: { activeTab: 'loads', isProMode: false, calculationMode: 'manual', isDirty: false },
                result: undefined
            })
        }),
        {
            name: 'abpe-workspace-storage', // unique name
            partialize: (state) => ({ 
                config: state.config, 
                loads: state.loads, 
                selectedComponents: state.selectedComponents,
                ui: { ...state.ui, isDirty: true } // Always start dirty on reload
            }), 
        }
    )
);
