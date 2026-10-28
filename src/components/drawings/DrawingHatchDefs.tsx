import React from 'react';

interface DrawingHatchDefsProps {
  canvasTheme: 'cad' | 'paper' | 'blueprint';
  showGrid: boolean;
  gridColor: string;
  dimLineColor: string;
}

export const DrawingHatchDefs: React.FC<DrawingHatchDefsProps> = ({
  canvasTheme,
  showGrid,
  gridColor,
  dimLineColor
}) => {
  const isCad = canvasTheme === 'cad';
  const isBlueprint = canvasTheme === 'blueprint';

  return (
    <defs>
      {/* 1. Reinforced / Mass Concrete Hatching Pattern (Aggregate triangles + stipple dots) */}
      <pattern id="concreteHatch" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="1.2" fill={isCad ? '#94a3b8' : isBlueprint ? '#bfdbfe' : '#64748b'} />
        <circle cx="14" cy="11" r="1.5" fill={isCad ? '#94a3b8' : isBlueprint ? '#bfdbfe' : '#64748b'} />
        <circle cx="9" cy="17" r="1" fill={isCad ? '#64748b' : isBlueprint ? '#93c5fd' : '#94a3b8'} />
        {/* Concrete Aggregate Triangles */}
        <path
          d="M 6,12 L 9,16 L 11,12 Z"
          fill="none"
          stroke={isCad ? '#94a3b8' : isBlueprint ? '#93c5fd' : '#475569'}
          strokeWidth="0.9"
        />
        <path
          d="M 14,3 L 17,7 L 19,3 Z"
          fill="none"
          stroke={isCad ? '#94a3b8' : isBlueprint ? '#93c5fd' : '#475569'}
          strokeWidth="0.9"
        />
      </pattern>

      {/* 1b. Reinforced Cement Concrete (RCC M20/M25) Hatch with Rebar Grid */}
      <pattern id="rccHatch" width="24" height="24" patternUnits="userSpaceOnUse">
        <rect width="24" height="24" fill={isCad ? '#1e293b' : isBlueprint ? '#1e3a8a' : '#e2e8f0'} opacity="0.4" />
        <line x1="0" y1="12" x2="24" y2="12" stroke={isCad ? '#38bdf8' : isBlueprint ? '#93c5fd' : '#0284c7'} strokeWidth="1" strokeDasharray="4 2" />
        <line x1="12" y1="0" x2="12" y2="24" stroke={isCad ? '#38bdf8' : isBlueprint ? '#93c5fd' : '#0284c7'} strokeWidth="1" strokeDasharray="4 2" />
        <circle cx="6" cy="6" r="1" fill={isCad ? '#94a3b8' : '#64748b'} />
        <circle cx="18" cy="18" r="1.2" fill={isCad ? '#94a3b8' : '#64748b'} />
        <path d="M 4,16 L 7,20 L 9,16 Z" fill="none" stroke={isCad ? '#94a3b8' : '#475569'} strokeWidth="0.8" />
      </pattern>

      {/* 2. Stone Masonry Hatching Pattern (Irregular stone block hatching) */}
      <pattern id="stoneHatch" width="28" height="28" patternUnits="userSpaceOnUse">
        <path
          d="M 0 14 L 28 14 M 14 0 L 14 28"
          stroke={isCad ? '#64748b' : isBlueprint ? '#93c5fd' : '#94a3b8'}
          strokeWidth="1"
        />
        <path
          d="M 0 0 L 28 28 M 0 28 L 28 0"
          stroke={isCad ? '#334155' : isBlueprint ? '#3b82f6' : '#cbd5e1'}
          strokeWidth="0.7"
          strokeDasharray="3 3"
        />
      </pattern>

      {/* 2a. Random Rubble Masonry Pattern with Dressed Joints */}
      <pattern id="rubbleHatch" width="36" height="36" patternUnits="userSpaceOnUse">
        <path d="M 2 12 Q 10 6 18 12 Q 26 18 34 10 L 34 26 Q 24 32 16 24 Q 8 30 2 24 Z" fill="none" stroke={isCad ? '#94a3b8' : isBlueprint ? '#93c5fd' : '#78350f'} strokeWidth="1" />
        <path d="M 18 12 L 16 24" stroke={isCad ? '#64748b' : '#94a3b8'} strokeWidth="0.9" />
        <path d="M 10 6 L 8 0 M 26 18 L 30 36 M 24 32 L 28 36" stroke={isCad ? '#475569' : '#cbd5e1'} strokeWidth="0.7" strokeDasharray="2 2" />
      </pattern>

      {/* 2b. Plum Concrete Hatching Pattern (Concrete stipple + embedded large stone plums) */}
      <pattern id="plumHatch" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="8" cy="8" r="1.2" fill={isCad ? '#94a3b8' : isBlueprint ? '#bfdbfe' : '#64748b'} />
        <circle cx="28" cy="22" r="1.5" fill={isCad ? '#94a3b8' : isBlueprint ? '#bfdbfe' : '#64748b'} />
        {/* Large Plum Boulders */}
        <path d="M 12 10 Q 18 6 22 12 Q 26 18 18 22 Q 10 24 12 10 Z" fill={isCad ? '#475569' : isBlueprint ? '#3b82f6' : '#94a3b8'} opacity="0.6" stroke={isCad ? '#94a3b8' : '#475569'} strokeWidth="1" />
        <path d="M 26 28 Q 34 24 36 32 Q 32 38 24 36 Q 22 30 26 28 Z" fill={isCad ? '#475569' : isBlueprint ? '#3b82f6' : '#94a3b8'} opacity="0.6" stroke={isCad ? '#94a3b8' : '#475569'} strokeWidth="1" />
      </pattern>

      {/* 2c. Brick / Stone Soling Pattern */}
      <pattern id="solingHatch" width="20" height="12" patternUnits="userSpaceOnUse">
        <rect width="20" height="12" fill="none" stroke={isCad ? '#b45309' : isBlueprint ? '#60a5fa' : '#78350f'} strokeWidth="0.8" />
        <line x1="10" y1="0" x2="10" y2="6" stroke={isCad ? '#b45309' : isBlueprint ? '#60a5fa' : '#78350f'} strokeWidth="0.8" />
        <line x1="0" y1="6" x2="20" y2="6" stroke={isCad ? '#b45309' : isBlueprint ? '#60a5fa' : '#78350f'} strokeWidth="0.8" />
        <line x1="5" y1="6" x2="5" y2="12" stroke={isCad ? '#b45309' : isBlueprint ? '#60a5fa' : '#78350f'} strokeWidth="0.8" />
        <line x1="15" y1="6" x2="15" y2="12" stroke={isCad ? '#b45309' : isBlueprint ? '#60a5fa' : '#78350f'} strokeWidth="0.8" />
      </pattern>

      {/* 2d. Brick Masonry Hatching Pattern (Running bond masonry with mortar lines) */}
      <pattern id="brickHatch" width="24" height="14" patternUnits="userSpaceOnUse">
        <rect width="24" height="14" fill={isCad ? '#451a03' : isBlueprint ? '#1e3a8a' : '#fecdd3'} opacity="0.45" />
        <line x1="0" y1="0" x2="24" y2="0" stroke={isCad ? '#f87171' : isBlueprint ? '#93c5fd' : '#b91c1c'} strokeWidth="1" />
        <line x1="0" y1="7" x2="24" y2="7" stroke={isCad ? '#f87171' : isBlueprint ? '#93c5fd' : '#b91c1c'} strokeWidth="1" />
        <line x1="0" y1="14" x2="24" y2="14" stroke={isCad ? '#f87171' : isBlueprint ? '#93c5fd' : '#b91c1c'} strokeWidth="1" />
        <line x1="12" y1="0" x2="12" y2="7" stroke={isCad ? '#f87171' : isBlueprint ? '#93c5fd' : '#b91c1c'} strokeWidth="1" />
        <line x1="0" y1="7" x2="0" y2="14" stroke={isCad ? '#f87171' : isBlueprint ? '#93c5fd' : '#b91c1c'} strokeWidth="1" />
        <line x1="24" y1="7" x2="24" y2="14" stroke={isCad ? '#f87171' : isBlueprint ? '#93c5fd' : '#b91c1c'} strokeWidth="1" />
      </pattern>

      {/* 3. Asphalt Wearing Course Pattern (Fine dense texture) */}
      <pattern id="asphaltHatch" width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill={isCad ? '#0f172a' : isBlueprint ? '#172554' : '#334155'} />
        <circle cx="2" cy="2" r="1" fill={isCad ? '#38bdf8' : isBlueprint ? '#60a5fa' : '#94a3b8'} />
        <circle cx="6" cy="6" r="1" fill={isCad ? '#e2e8f0' : isBlueprint ? '#bfdbfe' : '#f8fafc'} />
        <circle cx="2" cy="6" r="0.8" fill={isCad ? '#64748b' : isBlueprint ? '#3b82f6' : '#64748b'} />
        <circle cx="6" cy="2" r="0.8" fill={isCad ? '#64748b' : isBlueprint ? '#3b82f6' : '#64748b'} />
      </pattern>

      {/* 4. Earthwork / Soil Pattern (45-degree angle sloped hatch lines) */}
      <pattern id="earthHatch" width="24" height="24" patternUnits="userSpaceOnUse">
        <path
          d="M 0 24 L 24 0 M -6 6 L 6 -6 M 18 30 L 30 18"
          stroke={isCad ? '#854d0e' : isBlueprint ? '#1d4ed8' : '#94a3b8'}
          strokeWidth="1.2"
        />
        <circle cx="6" cy="18" r="1" fill={isCad ? '#a16207' : isBlueprint ? '#60a5fa' : '#cbd5e1'} />
        <circle cx="18" cy="6" r="1" fill={isCad ? '#a16207' : isBlueprint ? '#60a5fa' : '#cbd5e1'} />
      </pattern>

      {/* 5. Sand / Granular Material Sub-Base Pattern */}
      <pattern id="granularHatch" width="16" height="16" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="3" r="1" fill={isCad ? '#fbbf24' : isBlueprint ? '#fde047' : '#d97706'} />
        <circle cx="11" cy="7" r="1.5" fill={isCad ? '#f59e0b' : isBlueprint ? '#fde047' : '#b45309'} />
        <circle cx="7" cy="13" r="1" fill={isCad ? '#fbbf24' : isBlueprint ? '#fde047' : '#d97706'} />
        <circle cx="15" cy="15" r="1.2" fill={isCad ? '#f59e0b' : isBlueprint ? '#fde047' : '#b45309'} />
      </pattern>

      {/* 6. Water Flow Wave Pattern */}
      <pattern id="waterHatch" width="20" height="10" patternUnits="userSpaceOnUse">
        <path
          d="M 0 5 Q 5 0, 10 5 T 20 5"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1"
          opacity="0.8"
        />
      </pattern>

      {/* 7. CAD Background Grid */}
      {showGrid && (
        <pattern id="cadGrid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke={gridColor} strokeWidth="0.8" />
        </pattern>
      )}

      {/* 8. Arrowhead Markers for Dimension Lines */}
      <marker
        id="arrowStart"
        viewBox="0 0 10 10"
        refX="10"
        refY="5"
        markerWidth="5"
        markerHeight="5"
        orient="auto-start-reverse"
      >
        <path d="M 10 1 L 0 5 L 10 9 Z" fill={dimLineColor} />
      </marker>
      <marker
        id="arrowEnd"
        viewBox="0 0 10 10"
        refX="10"
        refY="5"
        markerWidth="5"
        markerHeight="5"
        orient="auto"
      >
        <path d="M 0 1 L 10 5 L 0 9 Z" fill={dimLineColor} />
      </marker>
    </defs>
  );
};
