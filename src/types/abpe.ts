export interface WorkspaceConfig {
  systemType: 'OFF_GRID' | 'ON_GRID' | 'HYBRID';
  systemVoltageMode: 'auto' | 'manual';
  systemVoltage?: number;
  regionSunHours: number;
  autonomyHours: number;
  advanced: {
    safetyMargin: number;
    depthOfDischarge: number;
    efficiency: number;
    futureExpansion: number;
    surgeFactor: number;
  };
}

export interface WorkspaceLoadItem {
  id: string;
  label: string;
  watts: number;
  hoursDaily: number;
  quantity: number;
  surgeFactor?: number;
  usagePeriod: 'day' | 'night' | 'both';
}

export interface WorkspaceSelectedComponents {
  panelId?: string;
  batteryId?: string;
  inverterId?: string;
  controllerId?: string;
  panelCountOverride?: number;
  batteryCountOverride?: number;
  inverterQtyOverride?: number;
  lockPanel?: boolean;
  lockBattery?: boolean;
  lockInverter?: boolean;
}

export interface WorkspaceState {
  config: WorkspaceConfig;
  loads: WorkspaceLoadItem[];
  selectedComponents: WorkspaceSelectedComponents;
  ui: {
    activeTab: 'loads' | 'components' | 'results' | 'pricing' | 'compare';
    isProMode: boolean;
    calculationMode: 'manual' | 'debounced';
    isDirty: boolean;
  };
  result?: any; // Replace with specific WorkspaceCalculateResponseModel later
}
