import { WorkspaceState } from '../types/abpe';

/**
 * Adapter to translate frontend strict camelCase WorkspaceState into
 * the backend strict snake_case WorkspaceCalculateRequest DTO.
 */
export function mapWorkspaceStateToCalculateRequest(state: WorkspaceState): any {
    return {
        system_type: state.config.systemType,
        system_voltage_mode: state.config.systemVoltageMode,
        system_voltage: state.config.systemVoltage,
        sun_hours: state.config.regionSunHours,
        autonomy_hours: state.config.autonomyHours,
        safety_margin: state.config.advanced.safetyMargin,
        dod: state.config.advanced.depthOfDischarge,
        efficiency: state.config.advanced.efficiency,
        future_expansion: state.config.advanced.futureExpansion,
        surge_factor: state.config.advanced.surgeFactor,
        loads: state.loads.map(l => ({
            label: l.label,
            watts: l.watts,
            hours_daily: l.hoursDaily,
            qty: l.quantity,
            surge_factor: l.surgeFactor,
            usage_period: l.usagePeriod
        })),
        selected_component_ids: {
            panel_id: state.selectedComponents.panelId,
            battery_id: state.selectedComponents.batteryId,
            inverter_id: state.selectedComponents.inverterId,
            controller_id: state.selectedComponents.controllerId
        },
        count_overrides: {
            panel_count: state.selectedComponents.panelCountOverride,
            battery_count: state.selectedComponents.batteryCountOverride,
            inverter_qty: state.selectedComponents.inverterQtyOverride
        },
        locked_components: {
            panel: state.selectedComponents.lockPanel,
            battery: state.selectedComponents.lockBattery,
            inverter: state.selectedComponents.lockInverter
        }
    };
}
