import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  Position,
  Handle
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Sun, Battery, Zap, Activity, Home } from 'lucide-react';

const CustomNode = ({ data }: any) => {
  return (
    <div className={`px-5 py-4 shadow-lg rounded-2xl border-2 ${data.borderColor} bg-slate-900 text-white min-w-[160px] flex flex-col items-center justify-center relative`}>
      {data.targetHandle && <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-slate-400" />}
      <div className={`p-2.5 rounded-xl ${data.iconBg} mb-2`}>
        <data.icon className={`w-6 h-6 ${data.iconColor}`} />
      </div>
      <div className="font-bold text-sm text-center leading-tight">{data.label}</div>
      <div className="text-[11px] text-slate-400 font-medium mt-1 text-center">{data.sublabel}</div>
      {data.sourceHandle && <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-slate-400" />}
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

export default function DynamicDiagram({ panels, batteries, inverter, systemType }: any) {
  const nodes = useMemo(() => {
    const defaultNodes = [];
    let xOffset = 0;

    // 1. Solar Panels
    if (systemType !== 'backup') {
      defaultNodes.push({
        id: 'panels',
        type: 'custom',
        position: { x: xOffset, y: 100 },
        data: {
          label: 'الألواح الشمسية',
          sublabel: `${panels.count} لوح`,
          icon: Sun,
          borderColor: 'border-blue-500',
          iconBg: 'bg-blue-500/20',
          iconColor: 'text-blue-400',
          sourceHandle: true
        }
      });
      xOffset += 260;

      // MPPT Charge Controller
      defaultNodes.push({
        id: 'mppt',
        type: 'custom',
        position: { x: xOffset, y: 100 },
        data: {
          label: 'منظم الشحن',
          sublabel: 'يحمي البطاريات',
          icon: Activity,
          borderColor: 'border-amber-500',
          iconBg: 'bg-amber-500/20',
          iconColor: 'text-amber-400',
          targetHandle: true,
          sourceHandle: true
        }
      });
      xOffset += 260;
    }

    // 2. Batteries
    if (systemType !== 'solar_direct') {
      defaultNodes.push({
        id: 'batteries',
        type: 'custom',
        position: { x: xOffset, y: systemType === 'backup' ? 100 : 250 },
        data: {
          label: 'البطاريات',
          sublabel: `${batteries.count} بطارية`,
          icon: Battery,
          borderColor: 'border-emerald-500',
          iconBg: 'bg-emerald-500/20',
          iconColor: 'text-emerald-400',
          targetHandle: systemType !== 'backup',
          sourceHandle: true
        }
      });
      if (systemType === 'backup') xOffset += 260;
    }

    // 3. Inverter
    defaultNodes.push({
      id: 'inverter',
      type: 'custom',
      position: { x: xOffset, y: 100 },
      data: {
        label: 'المحوّل (انفرتر)',
        sublabel: 'يحوّل الكهرباء لأجهزتك',
        icon: Zap,
        borderColor: 'border-slate-400',
        iconBg: 'bg-slate-700',
        iconColor: 'text-slate-300',
        targetHandle: true,
        sourceHandle: true
      }
    });
    xOffset += 260;

    // 4. Loads
    defaultNodes.push({
      id: 'loads',
      type: 'custom',
      position: { x: xOffset, y: 100 },
      data: {
        label: 'أجهزة المنزل',
        sublabel: 'الأحمال الكهربائية',
        icon: Home,
        borderColor: 'border-purple-500',
        iconBg: 'bg-purple-500/20',
        iconColor: 'text-purple-400',
        targetHandle: true
      }
    });

    return defaultNodes;
  }, [panels, batteries, inverter, systemType]);

  const edges = useMemo(() => {
    const defaultEdges = [];

    if (systemType !== 'backup') {
      defaultEdges.push({
        id: 'e-panels-mppt', source: 'panels', target: 'mppt',
        animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
      });

      if (systemType !== 'solar_direct') {
        defaultEdges.push({
          id: 'e-mppt-batteries', source: 'mppt', target: 'batteries',
          animated: true, style: { stroke: '#10b981', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
        });
        defaultEdges.push({
          id: 'e-batteries-inverter', source: 'batteries', target: 'inverter',
          animated: true, style: { stroke: '#f59e0b', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
        });
      } else {
        defaultEdges.push({
          id: 'e-mppt-inverter', source: 'mppt', target: 'inverter',
          animated: true, style: { stroke: '#f59e0b', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
        });
      }
    } else {
      defaultEdges.push({
        id: 'e-batteries-inverter', source: 'batteries', target: 'inverter',
        animated: true, style: { stroke: '#f59e0b', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
      });
    }

    defaultEdges.push({
      id: 'e-inverter-loads', source: 'inverter', target: 'loads',
      animated: true, style: { stroke: '#a855f7', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
    });

    return defaultEdges;
  }, [systemType]);

  return (
    <div className="h-[400px] w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.2 }} proOptions={{ hideAttribution: true }}>
        <Background color="#334155" gap={16} />
        <Controls className="bg-slate-800 border-slate-700 fill-white" />
      </ReactFlow>
    </div>
  );
}
