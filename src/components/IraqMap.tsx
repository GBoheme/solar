import React, { useState } from 'react';
import { Sun } from 'lucide-react';

interface IraqMapProps {
  regions: any[];
  selectedRegion: any;
  onSelect: (region: any) => void;
}

/* ── Approximate center positions for Iraqi provinces on a 400x500 canvas ── */
const PROVINCE_POSITIONS: Record<string, { x: number; y: number }> = {
  'دهوك': { x: 170, y: 35 },
  'أربيل': { x: 220, y: 60 },
  'السليمانية': { x: 270, y: 80 },
  'نينوى': { x: 140, y: 80 },
  'كركوك': { x: 210, y: 120 },
  'صلاح الدين': { x: 170, y: 160 },
  'ديالى': { x: 260, y: 170 },
  'الأنبار': { x: 80, y: 210 },
  'بغداد': { x: 210, y: 210 },
  'بابل': { x: 195, y: 260 },
  'كربلاء': { x: 145, y: 275 },
  'واسط': { x: 250, y: 270 },
  'النجف': { x: 130, y: 330 },
  'القادسية': { x: 190, y: 310 },
  'ميسان': { x: 275, y: 310 },
  'ذي قار': { x: 230, y: 350 },
  'المثنى': { x: 170, y: 380 },
  'البصرة': { x: 250, y: 420 },
};

/* ── Sun hours color scale ── */
function getSunColor(hours: number): string {
  if (hours >= 5.8) return '#f59e0b'; // Deep amber - high sun
  if (hours >= 5.3) return '#fbbf24'; // Medium amber
  if (hours >= 5.0) return '#fcd34d'; // Light amber
  return '#fde68a'; // Pale amber - lower sun
}

export default function IraqMap({ regions, selectedRegion, onSelect }: IraqMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="relative w-full" style={{ maxWidth: '380px' }}>
      {/* SVG Map Background (Iraq outline simplified) */}
      <svg viewBox="0 0 400 480" className="w-full h-auto">
        {/* Iraq country outline - simplified polygon */}
        <path
          d="M 50,30 L 120,15 L 200,10 L 290,25 L 330,70 L 310,120 L 330,170 L 310,220 L 340,280 L 320,340 L 290,380 L 260,450 L 220,470 L 200,460 L 150,420 L 100,380 L 60,320 L 40,250 L 30,180 L 40,110 Z"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2"
          strokeDasharray="4,4"
          opacity="0.4"
        />

        {/* Province dots and labels */}
        {regions.map((r) => {
          const pos = PROVINCE_POSITIONS[r.name];
          if (!pos) return null;
          const isSelected = selectedRegion?.id === r.id;
          const isHovered = hovered === r.id;
          const color = getSunColor(r.sun_hours);

          return (
            <g key={r.id}
              onClick={() => onSelect(r)}
              onMouseEnter={() => setHovered(r.id)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              {/* Pulse ring for selected */}
              {isSelected && (
                <circle cx={pos.x} cy={pos.y} r="22" fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.4">
                  <animate attributeName="r" from="16" to="26" dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Province circle */}
              <circle
                cx={pos.x} cy={pos.y}
                r={isSelected ? 16 : isHovered ? 14 : 12}
                fill={isSelected ? '#f59e0b' : color}
                stroke={isSelected ? '#92400e' : isHovered ? '#f59e0b' : '#fff'}
                strokeWidth={isSelected ? 3 : 2}
                style={{ transition: 'all 0.2s ease' }}
              />

              {/* Sun hours inside circle */}
              <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle"
                className="pointer-events-none select-none"
                fill={isSelected ? '#fff' : '#78350f'}
                fontSize="8" fontWeight="bold"
              >
                {r.sun_hours}
              </text>

              {/* Province name */}
              <text x={pos.x} y={pos.y + 26} textAnchor="middle"
                className="pointer-events-none select-none"
                fill={isSelected ? '#f59e0b' : isHovered ? '#f59e0b' : '#64748b'}
                fontSize="10" fontWeight={isSelected ? 'bold' : 'normal'}
              >
                {r.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-slate-400">
        <div className="flex items-center gap-1">
          <Sun className="w-3 h-3" />
          ساعات الشمس:
        </div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#fde68a]" /> أقل</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#fbbf24]" /> متوسط</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#f59e0b]" /> أكثر</div>
      </div>
    </div>
  );
}
