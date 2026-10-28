import React from 'react';
import { BBSItem, BBSShapeType, BBSSegmentDef } from '../../types';
import {
  BBS_SHAPE_CATALOG,
  computeCustomSegmentsGeometry,
  convertShapeToSegments
} from '../../services/bbsDynamicEngine';

interface DynamicRebarShapeSvgProps {
  item?: BBSItem;
  segments?: BBSSegmentDef[];
  activeSegmentIndex?: number;
  width?: number;
  height?: number;
  showLabels?: boolean;
  showAngles?: boolean;
  theme?: 'cad' | 'light' | 'blueprint' | 'dark';
  className?: string;
  onSelectSegment?: (index: number) => void;
}

export const DynamicRebarShapeSvg: React.FC<DynamicRebarShapeSvgProps> = ({
  item,
  segments: directSegments,
  activeSegmentIndex,
  width = 180,
  height = 90,
  showLabels = true,
  showAngles = true,
  theme = 'light',
  className = '',
  onSelectSegment
}) => {
  const shape: BBSShapeType = item?.shape_type || 'STRAIGHT';
  const a = item?.length_a_m || 0;
  const b = item?.length_b_m || 0;
  const c = item?.length_c_m || 0;
  const d = item?.length_d_m || 0;
  const e = item?.length_e_m || 0;
  const f = item?.length_f_m || 0;

  // Determine active segments sequence (either explicit custom segments or catalog converted)
  const activeCustomSegments =
    directSegments ||
    item?.custom_segments ||
    (shape === 'CUSTOM_MULTI_SEGMENT'
      ? convertShapeToSegments(shape, a, b, c, d, e, f)
      : undefined);

  // Theme styling colors
  const strokeColor =
    theme === 'cad'
      ? '#38bdf8'
      : theme === 'blueprint'
      ? '#ffffff'
      : theme === 'dark'
      ? '#60a5fa'
      : '#2563eb';
  const activeStrokeColor = '#f59e0b'; // Amber for active segment
  const strokeWidth = 3.5;
  const tagBgColor =
    theme === 'cad'
      ? '#0f172a'
      : theme === 'blueprint'
      ? '#1e3a8a'
      : theme === 'dark'
      ? '#1e293b'
      : '#ffffff';
  const tagTextColor =
    theme === 'cad'
      ? '#93c5fd'
      : theme === 'blueprint'
      ? '#ffffff'
      : theme === 'dark'
      ? '#93c5fd'
      : '#1e40af';
  const tagBorder =
    theme === 'cad'
      ? '#334155'
      : theme === 'blueprint'
      ? '#60a5fa'
      : theme === 'dark'
      ? '#475569'
      : '#cbd5e1';
  const bendColor = '#f59e0b';

  // If we have custom turned segments (or item has custom_segments defined), render fully parametric CAD vector!
  if (activeCustomSegments && activeCustomSegments.length > 0) {
    const barDia = item?.bar_diameter_mm || 16;
    const geom = computeCustomSegmentsGeometry(activeCustomSegments, barDia);
    const vb = geom.viewBox;

    return (
      <div className={`inline-flex flex-col items-center justify-center ${className}`}>
        <svg
          viewBox={`${vb.minX} ${vb.minY} ${vb.width} ${vb.height}`}
          width={width}
          height={height}
          className="overflow-visible select-none transition-all duration-200"
        >
          {/* Defs for gradients/markers */}
          <defs>
            <filter id="svg-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Continuous smooth filleted rebar path */}
          <path
            d={geom.svgPath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Start and End nodes */}
          {geom.points.length > 0 && (
            <>
              <circle
                cx={geom.points[0].x}
                cy={geom.points[0].y}
                r={strokeWidth * 1.1}
                fill={strokeColor}
              />
              <circle
                cx={geom.points[geom.points.length - 1].x}
                cy={geom.points[geom.points.length - 1].y}
                r={strokeWidth * 1.1}
                fill={strokeColor}
              />
            </>
          )}

          {/* Render individual segments with hover / click and labels */}
          {geom.vertices.map((v, idx) => {
            const isActive = activeSegmentIndex === idx;
            return (
              <g
                key={`seg-${idx}-${v.segmentId}`}
                className="cursor-pointer transition-opacity group"
                onClick={() => onSelectSegment && onSelectSegment(idx)}
              >
                {/* Highlight line overlay */}
                {isActive && (
                  <line
                    x1={v.start.x}
                    y1={v.start.y}
                    x2={v.end.x}
                    y2={v.end.y}
                    stroke={activeStrokeColor}
                    strokeWidth={strokeWidth + 2}
                    strokeLinecap="round"
                    className="animate-pulse"
                  />
                )}

                {/* Angle badge at corner */}
                {showAngles && idx > 0 && v.turnAngleDeg > 0 && (
                  <g transform={`translate(${v.start.x}, ${v.start.y})`}>
                    <circle r="7" fill={bendColor} fillOpacity="0.2" stroke={bendColor} strokeWidth="1" />
                    <text
                      x="0"
                      y="2.5"
                      textAnchor="middle"
                      fill={bendColor}
                      fontSize="6.5"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      {v.turnAngleDeg}°
                    </text>
                  </g>
                )}

                {/* Dimension label badge */}
                {showLabels && (
                  <g
                    transform={`translate(${v.labelPoint.x}, ${v.labelPoint.y})`}
                    className="transition-transform group-hover:scale-110"
                  >
                    <rect
                      x="-22"
                      y="-8"
                      width="44"
                      height="15"
                      rx="3.5"
                      fill={isActive ? '#fef3c7' : tagBgColor}
                      stroke={isActive ? '#d97706' : tagBorder}
                      strokeWidth={isActive ? '1.5' : '1'}
                      filter="url(#svg-shadow)"
                    />
                    <text
                      x="0"
                      y="2.5"
                      textAnchor="middle"
                      fill={isActive ? '#92400e' : tagTextColor}
                      fontSize="8"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {v.segmentId}: {v.lengthM.toFixed(2)}m
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  const renderShapePath = () => {
    switch (shape) {
      case 'STRAIGHT': {
        // Horizontal straight bar from (20, 45) to (160, 45)
        return (
          <g>
            <line x1="20" y1="45" x2="160" y2="45" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            <circle cx="20" cy="45" r="3" fill={strokeColor} />
            <circle cx="160" cy="45" r="3" fill={strokeColor} />
            {showLabels && (
              <g transform="translate(90, 32)">
                <rect x="-26" y="-10" width="52" height="16" rx="4" fill={tagBgColor} stroke={tagBorder} strokeWidth="1" />
                <text x="0" y="2" textAnchor="middle" fill={tagTextColor} fontSize="9" fontWeight="bold" fontFamily="monospace">
                  A: {a.toFixed(2)}m
                </text>
              </g>
            )}
          </g>
        );
      }

      case 'L_BEND': {
        // Main A horizontal, Leg B vertical down
        return (
          <g>
            <path
              d="M 25 30 L 145 30 A 8 8 0 0 1 155 40 L 155 75"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* 90° bend indicator */}
            <path d="M 143 30 A 8 8 0 0 1 155 42" fill="none" stroke={bendColor} strokeWidth="1.5" strokeDasharray="2,2" />
            <circle cx="25" cy="30" r="3" fill={strokeColor} />
            <circle cx="155" cy="75" r="3" fill={strokeColor} />

            {showLabels && (
              <>
                <g transform="translate(85, 20)">
                  <rect x="-26" y="-9" width="52" height="15" rx="3" fill={tagBgColor} stroke={tagBorder} strokeWidth="1" />
                  <text x="0" y="2" textAnchor="middle" fill={tagTextColor} fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                    A: {a.toFixed(2)}m
                  </text>
                </g>
                <g transform="translate(160, 60)">
                  <rect x="-3" y="-8" width="48" height="15" rx="3" fill={tagBgColor} stroke={tagBorder} strokeWidth="1" />
                  <text x="21" y="3" textAnchor="middle" fill="#d97706" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                    B: {b.toFixed(2)}m
                  </text>
                </g>
              </>
            )}
          </g>
        );
      }

      case 'U_HOOK': {
        // U-bar: Left leg B, Base web A, Right leg C
        return (
          <g>
            <path
              d="M 30 25 L 30 65 A 6 6 0 0 0 38 72 L 142 72 A 6 6 0 0 0 150 65 L 150 25"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Bend Arcs */}
            <circle cx="30" cy="25" r="3" fill={strokeColor} />
            <circle cx="150" cy="25" r="3" fill={strokeColor} />

            {showLabels && (
              <>
                <g transform="translate(15, 45)">
                  <rect x="-14" y="-8" width="46" height="15" rx="3" fill={tagBgColor} stroke={tagBorder} strokeWidth="1" />
                  <text x="9" y="3" textAnchor="middle" fill="#d97706" fontSize="8" fontWeight="bold" fontFamily="monospace">
                    B: {b.toFixed(2)}m
                  </text>
                </g>
                <g transform="translate(90, 84)">
                  <rect x="-26" y="-8" width="52" height="15" rx="3" fill={tagBgColor} stroke={tagBorder} strokeWidth="1" />
                  <text x="0" y="3" textAnchor="middle" fill={tagTextColor} fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                    A: {a.toFixed(2)}m
                  </text>
                </g>
                <g transform="translate(165, 45)">
                  <rect x="-14" y="-8" width="46" height="15" rx="3" fill={tagBgColor} stroke={tagBorder} strokeWidth="1" />
                  <text x="9" y="3" textAnchor="middle" fill="#d97706" fontSize="8" fontWeight="bold" fontFamily="monospace">
                    C: {c.toFixed(2)}m
                  </text>
                </g>
              </>
            )}
          </g>
        );
      }

      case 'RECT_STIRRUP': {
        // Closed stirrup with 135° hooks
        return (
          <g>
            <rect
              x="45"
              y="20"
              width="90"
              height="50"
              rx="6"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            {/* 135° hook tails at top left */}
            <line x1="51" y1="20" x2="65" y2="34" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
            <line x1="45" y1="26" x2="59" y2="40" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />

            {showLabels && (
              <>
                <g transform="translate(90, 14)">
                  <rect x="-24" y="-8" width="48" height="14" rx="3" fill={tagBgColor} stroke={tagBorder} strokeWidth="1" />
                  <text x="0" y="2.5" textAnchor="middle" fill={tagTextColor} fontSize="8" fontWeight="bold" fontFamily="monospace">
                    A: {a.toFixed(2)}m
                  </text>
                </g>
                <g transform="translate(142, 45)">
                  <rect x="-2" y="-7" width="46" height="14" rx="3" fill={tagBgColor} stroke={tagBorder} strokeWidth="1" />
                  <text x="21" y="3" textAnchor="middle" fill="#d97706" fontSize="8" fontWeight="bold" fontFamily="monospace">
                    B: {b.toFixed(2)}m
                  </text>
                </g>
                <g transform="translate(75, 45)">
                  <text x="0" y="0" textAnchor="middle" fill="#94a3b8" fontSize="7.5" fontFamily="sans-serif">
                    135° Hooks
                  </text>
                </g>
              </>
            )}
          </g>
        );
      }

      case 'CRANKED_BENT_UP': {
        // A straight left, B crank slope, C raised span, D crank slope, E straight right
        return (
          <g>
            <path
              d="M 15 65 L 45 65 L 68 30 L 112 30 L 135 65 L 165 65"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="15" cy="65" r="3" fill={strokeColor} />
            <circle cx="165" cy="65" r="3" fill={strokeColor} />

            {showLabels && (
              <>
                <g transform="translate(30, 78)">
                  <text x="0" y="0" textAnchor="middle" fill={tagTextColor} fontSize="7.5" fontWeight="bold" fontFamily="monospace">
                    A:{a.toFixed(2)}
                  </text>
                </g>
                <g transform="translate(90, 22)">
                  <rect x="-20" y="-7" width="40" height="13" rx="3" fill={tagBgColor} stroke={tagBorder} strokeWidth="1" />
                  <text x="0" y="2.5" textAnchor="middle" fill={tagTextColor} fontSize="7.5" fontWeight="bold" fontFamily="monospace">
                    C:{c.toFixed(2)}
                  </text>
                </g>
                <g transform="translate(150, 78)">
                  <text x="0" y="0" textAnchor="middle" fill={tagTextColor} fontSize="7.5" fontWeight="bold" fontFamily="monospace">
                    E:{e > 0 ? e.toFixed(2) : a.toFixed(2)}
                  </text>
                </g>
                <g transform="translate(56, 45)">
                  <text x="0" y="0" textAnchor="middle" fill="#d97706" fontSize="7" fontWeight="bold">
                    45°
                  </text>
                </g>
              </>
            )}
          </g>
        );
      }

      case 'CHAIR_BAR': {
        // Chair bar: Foot D, Leg B, Top A, Leg C, Foot E
        return (
          <g>
            <path
              d="M 25 72 L 55 72 L 55 28 L 125 28 L 125 72 L 155 72"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {showLabels && (
              <>
                <g transform="translate(90, 20)">
                  <rect x="-22" y="-7" width="44" height="13" rx="3" fill={tagBgColor} stroke={tagBorder} strokeWidth="1" />
                  <text x="0" y="2.5" textAnchor="middle" fill={tagTextColor} fontSize="7.5" fontWeight="bold" fontFamily="monospace">
                    A:{a.toFixed(2)}m
                  </text>
                </g>
                <g transform="translate(42, 50)">
                  <text x="0" y="0" textAnchor="middle" fill="#d97706" fontSize="7.5" fontWeight="bold" fontFamily="monospace">
                    B:{b.toFixed(2)}
                  </text>
                </g>
                <g transform="translate(138, 50)">
                  <text x="0" y="0" textAnchor="middle" fill="#d97706" fontSize="7.5" fontWeight="bold" fontFamily="monospace">
                    C:{c.toFixed(2)}
                  </text>
                </g>
                <g transform="translate(38, 83)">
                  <text x="0" y="0" textAnchor="middle" fill={tagTextColor} fontSize="7" fontWeight="bold">
                    D:{d.toFixed(2)}
                  </text>
                </g>
                <g transform="translate(142, 83)">
                  <text x="0" y="0" textAnchor="middle" fill={tagTextColor} fontSize="7" fontWeight="bold">
                    E:{e.toFixed(2)}
                  </text>
                </g>
              </>
            )}
          </g>
        );
      }

      case 'CAP_BAR': {
        // Inverted U with outward feet: Foot D, Leg B, Top A, Leg C, Foot E
        return (
          <g>
            <path
              d="M 20 70 L 50 70 L 50 25 L 130 25 L 130 70 L 160 70"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {showLabels && (
              <>
                <g transform="translate(90, 18)">
                  <rect x="-22" y="-7" width="44" height="13" rx="3" fill={tagBgColor} stroke={tagBorder} strokeWidth="1" />
                  <text x="0" y="2.5" textAnchor="middle" fill={tagTextColor} fontSize="7.5" fontWeight="bold" fontFamily="monospace">
                    A: {a.toFixed(2)}m
                  </text>
                </g>
                <g transform="translate(40, 48)">
                  <text x="0" y="0" textAnchor="middle" fill="#d97706" fontSize="7.5" fontWeight="bold">
                    B:{b.toFixed(2)}
                  </text>
                </g>
                <g transform="translate(140, 48)">
                  <text x="0" y="0" textAnchor="middle" fill="#d97706" fontSize="7.5" fontWeight="bold">
                    C:{c.toFixed(2)}
                  </text>
                </g>
              </>
            )}
          </g>
        );
      }

      case 'HAUNCH_TIE': {
        // 45° diagonal A, tail B into wall, tail C into slab
        return (
          <g>
            <path
              d="M 30 30 L 70 30 L 130 65 L 130 80"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {showLabels && (
              <>
                <g transform="translate(100, 42)">
                  <text x="0" y="0" textAnchor="middle" fill={tagTextColor} fontSize="8" fontWeight="bold" fontFamily="monospace">
                    A: {a.toFixed(2)}m
                  </text>
                </g>
                <g transform="translate(48, 22)">
                  <text x="0" y="0" textAnchor="middle" fill="#d97706" fontSize="7.5" fontWeight="bold">
                    B:{b.toFixed(2)}
                  </text>
                </g>
                <g transform="translate(142, 75)">
                  <text x="0" y="0" textAnchor="middle" fill="#d97706" fontSize="7.5" fontWeight="bold">
                    C:{c.toFixed(2)}
                  </text>
                </g>
              </>
            )}
          </g>
        );
      }

      case 'CIRCULAR_TIE': {
        return (
          <g>
            <circle cx="90" cy="45" r="28" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
            <path d="M 90 17 L 115 17 A 10 10 0 0 1 120 27" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
            {showLabels && (
              <g transform="translate(90, 45)">
                <text x="0" y="3" textAnchor="middle" fill={tagTextColor} fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                  Ø: {a.toFixed(2)}m
                </text>
              </g>
            )}
          </g>
        );
      }

      default: {
        // Generic Custom Multi-Segment
        return (
          <g>
            <path
              d="M 20 60 L 60 60 L 60 30 L 120 30 L 120 60 L 160 60"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {showLabels && (
              <g transform="translate(90, 22)">
                <text x="0" y="0" textAnchor="middle" fill={tagTextColor} fontSize="8" fontWeight="bold" fontFamily="monospace">
                  A-F Segments
                </text>
              </g>
            )}
          </g>
        );
      }
    }
  };

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 180 90"
        width={width}
        height={height}
        className="overflow-visible select-none"
      >
        {renderShapePath()}
      </svg>
    </div>
  );
};
