import React from 'react';
import { DimensionLine } from './DimensionLine';
import { ProtectionWallParameters, ProtectionWallComponentMapping, ParamSourceStatus } from './types';
import { BOQItem } from '../../types';

interface ProtectionWallDrawingProps {
  wallType?: string;
  params: ProtectionWallParameters;
  onUpdateParam: (key: keyof ProtectionWallParameters, value: any, isManualOverride?: boolean) => void;
  onResetOverride?: (key: keyof ProtectionWallParameters) => void;
  mapping: ProtectionWallComponentMapping;
  projectItems: BOQItem[];
  showDimensions: boolean;
  showHatching: boolean;
  canvasTheme?: 'cad' | 'paper' | 'blueprint';
  themeColors?: any;
  zoomLevel?: number;
  activeSectionCode?: string;
  activeSectionTitle?: string;
}

export const ProtectionWallDrawing: React.FC<ProtectionWallDrawingProps> = ({
  wallType = 'plum_concrete',
  params,
  onUpdateParam,
  onResetOverride,
  mapping,
  projectItems,
  showDimensions,
  showHatching,
  canvasTheme = 'cad',
  themeColors,
  zoomLevel = 1,
  activeSectionCode = 'SECTION 1-1',
  activeSectionTitle = 'Protection Wall Section'
}) => {
  const isCad = canvasTheme === 'cad';
  const isBlueprint = canvasTheme === 'blueprint';

  const isRCCLWall = wallType === 'rcc_l_wall' || wallType === 'rcc_cantilever' || (wallType === 'custom_wall' && (params.hasBaseSlab || params.customMaterial === 'rcc'));
  const isStoneMasonry = wallType === 'stone_masonry' || wallType === 'retaining_masonry' || (wallType === 'custom_wall' && params.customMaterial === 'stone_masonry');
  const isBrickMasonry = wallType === 'brick_masonry' || (wallType === 'custom_wall' && params.customMaterial === 'brick_masonry');
  const isPlumEqual = wallType === 'plum_concrete_equal';
  const isPlumUnequal = wallType === 'plum_concrete_unequal' || wallType === 'plum_concrete';
  const isPlumConcrete = !isRCCLWall && !isStoneMasonry && !isBrickMasonry;

  // Helper theme colors
  const strokeColor = isCad ? '#e2e8f0' : isBlueprint ? '#93c5fd' : '#1e293b';
  const dimColor = isCad ? '#38bdf8' : isBlueprint ? '#bfdbfe' : '#2563eb';
  const rebarColor = '#f97316'; // Vivid orange for steel rebar

  // Fill Patterns
  const fillRCC = showHatching ? 'url(#rccHatch)' : isCad ? '#334155' : isBlueprint ? '#1e3a8a' : '#cbd5e1';
  const fillStone = showHatching ? 'url(#rubbleHatch)' : isCad ? '#475569' : isBlueprint ? '#1e3a8a' : '#cbd5e1';
  const fillPlum = showHatching ? 'url(#plumHatch)' : isCad ? '#334155' : isBlueprint ? '#1e3a8a' : '#cbd5e1';
  const fillBrick = showHatching ? 'url(#brickHatch)' : isCad ? '#7f1d1d' : isBlueprint ? '#1e3a8a' : '#fca5a5';
  const fillPcc = showHatching ? 'url(#concreteHatch)' : isCad ? '#475569' : isBlueprint ? '#2563eb' : '#e2e8f0';
  const fillSoling = showHatching ? 'url(#solingHatch)' : isCad ? '#78350f' : isBlueprint ? '#3b82f6' : '#fef3c7';
  const fillEarth = showHatching ? 'url(#earthHatch)' : isCad ? '#1e293b' : isBlueprint ? '#172554' : '#f1f5f9';

  // Find mapped items to determine link statuses
  const wallItem = projectItems.find((i) => i.id === mapping.wallItemId);
  const pccItem = projectItems.find((i) => i.id === mapping.pccItemId);
  const solingItem = projectItems.find((i) => i.id === mapping.solingItemId);
  const excItem = projectItems.find((i) => i.id === mapping.excavationItemId);
  const formworkItem = projectItems.find((i) => i.id === mapping.formworkItemId);

  // Status helper function
  const getParamStatus = (key: keyof ProtectionWallParameters, isAutoDerivedByDefault: boolean, hasMappedItem: boolean): ParamSourceStatus => {
    if (params.manualOverrides?.[key as string]) return 'manual';
    if (hasMappedItem) return 'linked';
    if (isAutoDerivedByDefault) return 'derived';
    return 'manual';
  };

  // Dimensions & Statuses
  const wallTopWidth = params.wallTopWidth || (isRCCLWall ? 0.30 : isStoneMasonry ? 0.60 : isBrickMasonry ? 0.35 : isPlumEqual ? 0.60 : 0.60);
  const wallBottomWidth = params.wallBottomWidth || (isRCCLWall ? 0.40 : isStoneMasonry ? 1.60 : isBrickMasonry ? 0.70 : isPlumEqual ? 0.60 : 1.50);
  const wallHeight = params.wallHeight || (isRCCLWall ? 3.00 : isStoneMasonry ? 2.50 : isBrickMasonry ? 2.00 : 2.50);
  const wallLength = params.wallLength || 10.0;

  // Crucial User Rule: If equal top and bottom width is given, make the wall component vertical!
  const isEqualWidth = Math.abs(wallTopWidth - wallBottomWidth) < 0.001 || isPlumEqual;

  // RCC specific parameters with defaults
  const isLowerHeightRCC = params.rccWallConfigType === 'lower_flush_base' || (params.toeLength === 0 && (params.heelLength ?? 0) < 0.2);
  const baseSlabThickness = params.baseSlabThickness || (isLowerHeightRCC ? 0.25 : 0.35);
  const toeLength = isLowerHeightRCC ? (params.toeLength || 0) : (params.toeLength ?? 0.50);
  const heelLength = params.heelLength ?? (isLowerHeightRCC ? 0.20 : Math.max(0.60, (params.baseSlabWidth || 2.20) - toeLength - wallBottomWidth));
  const baseSlabWidth = params.baseSlabWidth || (isLowerHeightRCC ? wallBottomWidth + toeLength + heelLength : Math.max(1.80, wallBottomWidth + toeLength + heelLength));

  // Fillet / Haunch Parameters
  const hasFillet = !!params.hasFillet;
  const filletSize = params.filletSize || 0.15;
  const filletLocation = params.filletLocation || (isLowerHeightRCC ? 'front' : 'both');

  // Stone & Brick Masonry specific parameters
  const copingThickness = params.copingThickness || 0.075;

  // Foundation & Excavation Parameters
  const pccThickness = params.pccThickness || (isRCCLWall ? 0.10 : 0.15);
  const pccWidth = params.pccWidth || (isRCCLWall ? baseSlabWidth + 0.20 : wallBottomWidth + 0.30);

  const solingThickness = params.solingThickness || 0.15;
  const solingWidth = params.solingWidth || pccWidth;

  const excavationWidth = params.excavationWidth || (pccWidth + 0.60);
  const totalPhysicalHeight = wallHeight + (isRCCLWall ? baseSlabThickness : 0) + pccThickness + solingThickness;
  const excavationDepth = params.excavationDepth || (totalPhysicalHeight + 0.30);

  // SVG Scaling Calculations (Center at X=480)
  const physicalW = Math.max(excavationWidth, pccWidth, solingWidth, baseSlabWidth, wallBottomWidth, 0.5);
  const physicalH = totalPhysicalHeight;
  const physicalDepth = Math.max(physicalH, excavationDepth, 0.5);

  const targetDrawWidth = 460;
  const targetDrawHeight = 320;

  const scaleX = targetDrawWidth / physicalW;
  const scaleY = targetDrawHeight / physicalDepth;
  const scale = Math.max(30, Math.min(360, Math.min(scaleX, scaleY)));
  const cx = 480;

  // Pixel conversions
  const wTopPx = wallTopWidth * scale;
  const wBotPx = wallBottomWidth * scale;
  const wHpx = wallHeight * scale;

  const baseSlabThPx = baseSlabThickness * scale;
  const baseSlabWPx = baseSlabWidth * scale;
  const toePx = toeLength * scale;
  const heelPx = heelLength * scale;
  const filletPx = filletSize * scale;
  const copingThPx = copingThickness * scale;

  const pccWpx = pccWidth * scale;
  const pccThPx = pccThickness * scale;

  const solWpx = solingWidth * scale;
  const solThPx = solingThickness * scale;

  const excWpx = excavationWidth * scale;
  const excDpx = excavationDepth * scale;

  // Vertical Coordinates
  const totalHpx = (isRCCLWall ? (wHpx + baseSlabThPx) : wHpx) + pccThPx + solThPx;
  const solingBottomY = Math.min(520, Math.max(280, 220 + totalHpx * 0.60));
  const solingTopY = solingBottomY - solThPx;
  const pccBottomY = solingTopY;
  const pccTopY = pccBottomY - pccThPx;

  // RCC Base Slab Coordinates vs Mass Wall Foundation Coordinates
  const baseSlabBottomY = pccTopY;
  const baseSlabTopY = baseSlabBottomY - baseSlabThPx;

  const wallBottomY = isRCCLWall ? baseSlabTopY : pccTopY;
  const wallTopY = wallBottomY - wHpx;

  // Horizontal Alignment
  const solingX1 = cx - solWpx / 2;
  const solingX2 = cx + solWpx / 2;

  const pccX1 = cx - pccWpx / 2;
  const pccX2 = cx + pccWpx / 2;

  // Base Slab & Wall Stem X-coordinates
  const baseSlabX1 = cx - baseSlabWPx / 2;
  const baseSlabX2 = cx + baseSlabWPx / 2;

  // RCC L-Wall Stem Coordinates (Stem sits between toe and heel on the base slab)
  const rccStemBotX1 = baseSlabX1 + toePx;
  const rccStemBotX2 = rccStemBotX1 + wBotPx;

  // RCC STEM: If equal width given -> strictly vertical stem! If unequal width -> battered front face, vertical rear face!
  let rccStemTopX1 = rccStemBotX1;
  let rccStemTopX2 = rccStemBotX2;

  if (isEqualWidth) {
    rccStemTopX1 = rccStemBotX1;
    rccStemTopX2 = rccStemBotX2;
  } else {
    // Unequal width: front face is battered/tapered, back face stays vertical against soil
    rccStemTopX1 = rccStemBotX1 + (wBotPx - wTopPx);
    rccStemTopX2 = rccStemBotX2;
  }

  // Gravity / Plum / Stone / Brick Coordinates
  const alignment = params.wallAlignmentOnPcc || 'centered';
  let wallBotX1 = cx - wBotPx / 2;
  let wallBotX2 = cx + wBotPx / 2;

  if (!isRCCLWall) {
    if (alignment === 'flush_back') {
      wallBotX2 = pccX2 - Math.min(12, pccWpx * 0.04);
      wallBotX1 = wallBotX2 - wBotPx;
    } else if (alignment === 'flush_front') {
      wallBotX1 = pccX1 + Math.min(12, pccWpx * 0.04);
      wallBotX2 = wallBotX1 + wBotPx;
    } else {
      wallBotX1 = cx - wBotPx / 2;
      wallBotX2 = cx + wBotPx / 2;
    }
  }

  // Wall Top Coordinates: If equal width -> strictly vertical wall component!
  let wallTopX1 = wallBotX1;
  let wallTopX2 = wallBotX2;

  if (isEqualWidth) {
    wallTopX1 = wallBotX1;
    wallTopX2 = wallBotX2;
  } else {
    const frontBatterOffset = wBotPx - wTopPx;
    wallTopX1 = wallBotX1 + frontBatterOffset;
    wallTopX2 = wallBotX2; // back face is vertical against soil
  }

  // Excavation Pit Coordinates
  const excX1 = cx - excWpx / 2;
  const excX2 = cx + excWpx / 2;
  const excBottomY = solingBottomY;
  const excTopY = excBottomY - excDpx;

  // Rebar Coordinates for RCC L-Wall
  const rebarCover = Math.max(4, scale * 0.04); // 40mm cover in pixels
  const mainBarStemX = rccStemTopX2 - rebarCover;
  const mainBarStemBotX = rccStemBotX2 - rebarCover;
  const mainBarBaseY = baseSlabBottomY - rebarCover;

  return (
    <g id="protection-wall-assembly">
      {/* CAD Section Callout Header */}
      <g transform="translate(480, 42)" id="cad-section-callout">
        <line x1="-240" y1="0" x2="240" y2="0" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="6 3" />
        <circle cx="-240" cy="0" r="13" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
        <text x="-240" y="4" textAnchor="middle" fontSize="10" fontWeight="900" fill="#ffffff">
          {activeSectionCode.includes('-') ? activeSectionCode.replace(/SECTION\s*/i, '').split('-')[0] : '1'}
        </text>
        <circle cx="240" cy="0" r="13" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
        <text x="240" y="4" textAnchor="middle" fontSize="10" fontWeight="900" fill="#ffffff">
          {activeSectionCode.includes('-') ? activeSectionCode.replace(/SECTION\s*/i, '').split('-')[1] : '1'}
        </text>
        <rect x="-140" y="-13" width="280" height="26" rx="6" fill={isCad ? '#0f172a' : '#ffffff'} stroke="#0ea5e9" strokeWidth="1.5" />
        <text x="0" y="4" textAnchor="middle" fontSize="11" fontWeight="800" fill={isCad ? '#38bdf8' : '#0284c7'} letterSpacing="0.8">
          {isRCCLWall
            ? isLowerHeightRCC
              ? 'CROSS SECTION: R.C.C. / CONCRETE PROTECTION WALL (LOWER HEIGHT FLUSH BASE)'
              : 'CROSS SECTION: R.C.C. L-PROTECTION WALL (CANTILEVER TOE & HEEL)'
            : isStoneMasonry
            ? 'CROSS SECTION: STONE MASONRY WALL'
            : 'CROSS SECTION: PLUM CONCRETE WALL'}
        </text>
      </g>

      {/* 1. Ground & Earth Excavation Background */}
      <path
        d={`
          M ${excX1 - 120} ${excTopY} 
          L ${excX1} ${excTopY} 
          L ${excX1} ${excBottomY} 
          L ${excX2} ${excBottomY} 
          L ${excX2} ${excTopY} 
          L ${excX2 + 120} ${excTopY} 
          L ${excX2 + 120} ${excBottomY + 40} 
          L ${excX1 - 120} ${excBottomY + 40} 
          Z
        `}
        fill={fillEarth}
        opacity="0.35"
      />

      {/* Earth Surface Hatch Lines */}
      <line x1={excX1 - 150} y1={excTopY} x2={excX1} y2={excTopY} stroke={strokeColor} strokeWidth="2" strokeDasharray="6 3" />
      <line x1={excX2} y1={excTopY} x2={excX2 + 150} y2={excTopY} stroke={strokeColor} strokeWidth="2" strokeDasharray="6 3" />

      {/* 2. Soling Bed Layer */}
      <rect
        x={solingX1}
        y={solingTopY}
        width={solWpx}
        height={solThPx}
        fill={fillSoling}
        stroke={strokeColor}
        strokeWidth="1.8"
      />
      <text
        x={cx}
        y={solingTopY + solThPx / 2 + 3}
        textAnchor="middle"
        fontSize={solThPx < 14 ? 8 : 10}
        fontWeight="bold"
        fill={isCad ? '#fbbf24' : '#92400e'}
      >
        FLAT BOULDER / STONE SOLING ({(solingThickness * 1000).toFixed(0)}mm)
      </text>

      {/* 3. Bed PCC Layer */}
      <rect
        x={pccX1}
        y={pccTopY}
        width={pccWpx}
        height={pccThPx}
        fill={fillPcc}
        stroke={strokeColor}
        strokeWidth="2"
      />
      <text
        x={cx}
        y={pccTopY + pccThPx / 2 + 3}
        textAnchor="middle"
        fontSize={pccThPx < 14 ? 8 : 10}
        fontWeight="bold"
        fill={isCad ? '#38bdf8' : '#1e40af'}
      >
        BED PCC 1:3:6 / M10 ({(pccThickness * 1000).toFixed(0)}mm)
      </text>

      {/* 4. Granular Backfill Soil behind Wall (Right side) */}
      <path
        d={`
          M ${isRCCLWall ? rccStemBotX2 : wallBotX2} ${isRCCLWall ? baseSlabTopY : wallBottomY}
          L ${isRCCLWall ? rccStemTopX2 : wallTopX2} ${wallTopY}
          L ${excX2 + 90} ${wallTopY + 20}
          L ${excX2 + 90} ${excTopY}
          L ${pccX2} ${pccTopY}
          Z
        `}
        fill={fillEarth}
        opacity="0.25"
      />
      <text
        x={(isRCCLWall ? rccStemBotX2 : wallBotX2) + 35}
        y={wallTopY + wHpx / 2}
        fontSize="10"
        fontStyle="italic"
        fill={isCad ? '#94a3b8' : '#64748b'}
      >
        Granular Gravel Backfill
      </text>

      {/* ========================================================================= */}
      {/* 5A. R.C.C. L-PROTECTION WALL (CANTILEVER STEM + BASE FOOTING SLAB + REBAR) */}
      {/* ========================================================================= */}
      {isRCCLWall && (
        <g id="rcc-l-wall-structure">
          {/* Base Footing Slab */}
          <rect
            x={baseSlabX1}
            y={baseSlabTopY}
            width={baseSlabWPx}
            height={baseSlabThPx}
            fill={fillRCC}
            stroke={strokeColor}
            strokeWidth="2.5"
          />

          {/* Vertical RCC Wall Stem */}
          <path
            d={`
              M ${rccStemBotX1} ${baseSlabTopY}
              L ${rccStemTopX1} ${wallTopY}
              L ${rccStemTopX2} ${wallTopY}
              L ${rccStemBotX2} ${baseSlabTopY}
              Z
            `}
            fill={fillRCC}
            stroke={strokeColor}
            strokeWidth="2.5"
          />

          {/* Triangular Fillet / Haunch at Stem-to-Bed-Slab Joint */}
          {hasFillet && (
            <g id="rcc-fillet-haunches">
              {/* Front Face Fillet */}
              {(filletLocation === 'front' || filletLocation === 'both') && (
                <path
                  d={`
                    M ${rccStemBotX1} ${baseSlabTopY}
                    L ${Math.max(baseSlabX1, rccStemBotX1 - filletPx)} ${baseSlabTopY}
                    L ${rccStemBotX1} ${baseSlabTopY - filletPx}
                    Z
                  `}
                  fill={fillRCC}
                  stroke={strokeColor}
                  strokeWidth="2"
                />
              )}

              {/* Rear Face Fillet */}
              {(filletLocation === 'back' || filletLocation === 'both') && (
                <path
                  d={`
                    M ${rccStemBotX2} ${baseSlabTopY}
                    L ${Math.min(baseSlabX2, rccStemBotX2 + filletPx)} ${baseSlabTopY}
                    L ${rccStemBotX2} ${baseSlabTopY - filletPx}
                    Z
                  `}
                  fill={fillRCC}
                  stroke={strokeColor}
                  strokeWidth="2"
                />
              )}

              {/* Fillet Callout Leader Badge */}
              <g transform={`translate(${rccStemBotX1 - (filletPx > 0 ? filletPx / 2 : 0)}, ${baseSlabTopY - filletPx / 2})`}>
                <line x1="0" y1="0" x2="-30" y2="-20" stroke="#10b981" strokeWidth="1.5" />
                <rect x="-140" y="-32" width="110" height="22" rx="4" fill="#0f172a" stroke="#10b981" strokeWidth="1.2" />
                <text x="-85" y="-17" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#34d399">
                  {(filletSize * 1000).toFixed(0)}×{(filletSize * 1000).toFixed(0)}mm Fillet Haunch
                </text>
              </g>
            </g>
          )}

          {/* Monolithic joint divider line removed visually, or joint dashed */}
          <line
            x1={rccStemBotX1}
            y1={baseSlabTopY}
            x2={rccStemBotX2}
            y2={baseSlabTopY}
            stroke={strokeColor}
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* Steel Reinforcement Schematic Layer */}
          <g id="rebar-cage" className="pointer-events-none">
            {/* Main L-Shape Tensile Rebar: runs down rear face of stem and turns into heel slab */}
            <path
              d={`
                M ${rccStemTopX2 - rebarCover} ${wallTopY + rebarCover}
                L ${mainBarStemBotX} ${baseSlabTopY + rebarCover}
                L ${mainBarStemBotX} ${mainBarBaseY}
                L ${baseSlabX2 - rebarCover} ${mainBarBaseY}
                L ${baseSlabX2 - rebarCover} ${mainBarBaseY - 12}
              `}
              fill="none"
              stroke={rebarColor}
              strokeWidth="2.5"
            />

            {/* Front Face Rebar / Toe Reinforcement */}
            <path
              d={`
                M ${rccStemTopX1 + rebarCover} ${wallTopY + rebarCover}
                L ${rccStemBotX1 + rebarCover} ${baseSlabTopY}
                L ${rccStemBotX1 + rebarCover} ${baseSlabTopY + rebarCover}
                L ${baseSlabX1 + rebarCover} ${baseSlabTopY + rebarCover}
                L ${baseSlabX1 + rebarCover} ${mainBarBaseY}
                L ${rccStemBotX1 + rebarCover} ${mainBarBaseY}
              `}
              fill="none"
              stroke={rebarColor}
              strokeWidth="2"
            />

            {/* Distribution Rebar Dots in Stem */}
            {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => {
              const yDot = wallTopY + wHpx * ratio;
              const xDotRear = rccStemTopX2 + (rccStemBotX2 - rccStemTopX2) * ratio - rebarCover - 4;
              const xDotFront = rccStemTopX1 + (rccStemBotX1 - rccStemTopX1) * ratio + rebarCover + 4;
              return (
                <g key={`stem-dot-${idx}`}>
                  <circle cx={xDotRear} cy={yDot} r="2.2" fill={rebarColor} />
                  <circle cx={xDotFront} cy={yDot} r="2.2" fill={rebarColor} />
                </g>
              );
            })}

            {/* Distribution Rebar Dots in Base Slab */}
            {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => {
              const xDot = baseSlabX1 + baseSlabWPx * ratio;
              return (
                <circle
                  key={`slab-dot-${idx}`}
                  cx={xDot}
                  cy={mainBarBaseY - 4}
                  r="2.2"
                  fill={rebarColor}
                />
              );
            })}

            {/* Rebar Spec Callout Badge */}
            <g transform={`translate(${rccStemTopX1 - 10}, ${wallTopY + wHpx * 0.35})`}>
              <line x1="0" y1="0" x2="-35" y2="-15" stroke={rebarColor} strokeWidth="1.5" />
              <rect x="-145" y="-28" width="110" height="24" rx="4" fill="#0f172a" stroke={rebarColor} strokeWidth="1.2" />
              <text x="-90" y="-12" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#f97316">
                TMT Fe500 ({params.rebarDiameter || 16}mm @ {(params.rebarSpacing || 150)}mm c/c)
              </text>
            </g>
          </g>

          {/* Component Labels */}
          <text
            x={rccStemBotX1 + wBotPx / 2}
            y={wallTopY + wHpx / 2}
            textAnchor="middle"
            fontSize="11"
            fontWeight="bold"
            fill={isCad ? '#e2e8f0' : '#1e293b'}
          >
            RCC STEM ({params.concreteGrade || 'M20'})
          </text>

          <text
            x={baseSlabX1 + toePx / 2}
            y={baseSlabTopY + baseSlabThPx / 2 + 3}
            textAnchor="middle"
            fontSize="9"
            fontWeight="bold"
            fill={isCad ? '#38bdf8' : '#0284c7'}
          >
            TOE
          </text>

          <text
            x={rccStemBotX2 + heelPx / 2}
            y={baseSlabTopY + baseSlabThPx / 2 + 3}
            textAnchor="middle"
            fontSize="9"
            fontWeight="bold"
            fill={isCad ? '#38bdf8' : '#0284c7'}
          >
            HEEL SLAB
          </text>
        </g>
      )}

      {/* ========================================================================= */}
      {/* 5B. STONE MASONRY PROTECTION WALL (BATTERED RUBBLE BODY + TOP COPING)     */}
      {/* ========================================================================= */}
      {isStoneMasonry && (
        <g id="stone-masonry-wall-structure">
          {/* Main Battered Stone Masonry Body */}
          <path
            d={`
              M ${wallBotX1} ${wallBottomY}
              L ${wallTopX1} ${wallTopY}
              L ${wallTopX2} ${wallTopY}
              L ${wallBotX2} ${wallBottomY}
              Z
            `}
            fill={fillStone}
            stroke={strokeColor}
            strokeWidth="2.5"
          />

          {/* PCC / Dressed Stone Top Coping */}
          <rect
            x={wallTopX1 - 10}
            y={wallTopY - copingThPx}
            width={wTopPx + 20}
            height={copingThPx}
            fill={fillPcc}
            stroke={strokeColor}
            strokeWidth="1.8"
            rx="2"
          />
          <text
            x={wallTopX1 + wTopPx / 2}
            y={wallTopY - copingThPx / 2 + 3}
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="bold"
            fill={isCad ? '#38bdf8' : '#0284c7'}
          >
            PCC COPING ({(copingThickness * 1000).toFixed(0)}mm)
          </text>

          {/* 12.5mm Cement Plaster / Pointing (1:4) Line on Exposed Front Face */}
          <line
            x1={wallBotX1 - 3}
            y1={wallBottomY}
            x2={wallTopX1 - 3}
            y2={wallTopY}
            stroke="#10b981"
            strokeWidth="3"
            strokeDasharray="4 2"
          />
          <text
            x={wallTopX1 - 16}
            y={wallTopY + wHpx * 0.25}
            textAnchor="end"
            fontSize="8.5"
            fontWeight="bold"
            fill="#10b981"
          >
            12.5mm Plaster (1:4)
          </text>

          {/* Wall Title Text */}
          <text
            x={wallBotX1 + wBotPx / 2}
            y={wallTopY + wHpx / 2}
            textAnchor="middle"
            fontSize="11"
            fontWeight="bold"
            fill={isCad ? '#e2e8f0' : '#1e293b'}
          >
            STONE MASONRY ({params.mortarRatio || '1:4'} Mortar)
          </text>
        </g>
      )}

      {/* ========================================================================= */}
      {/* 5C. BRICK MASONRY WALL (MODULAR BRICKS IN CEMENT MORTAR + COPING + PLASTER) */}
      {/* ========================================================================= */}
      {isBrickMasonry && (
        <g id="brick-masonry-wall-structure">
          {/* Main Brick Masonry Body */}
          <path
            d={`
              M ${wallBotX1} ${wallBottomY}
              L ${wallTopX1} ${wallTopY}
              L ${wallTopX2} ${wallTopY}
              L ${wallBotX2} ${wallBottomY}
              Z
            `}
            fill={fillBrick}
            stroke={strokeColor}
            strokeWidth="2.5"
          />

          {/* PCC / Chamfered Top Coping */}
          <rect
            x={wallTopX1 - 8}
            y={wallTopY - copingThPx}
            width={wTopPx + 16}
            height={copingThPx}
            fill={fillPcc}
            stroke={strokeColor}
            strokeWidth="1.8"
            rx="2"
          />
          <text
            x={wallTopX1 + wTopPx / 2}
            y={wallTopY - copingThPx / 2 + 3}
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="bold"
            fill={isCad ? '#38bdf8' : '#0284c7'}
          >
            PCC WEATHERED COPING ({(copingThickness * 1000).toFixed(0)}mm)
          </text>

          {/* 12.5mm Cement Plaster & Punning Lines on Exposed Front Face */}
          {(() => {
            const pH = params.plasterHeight !== undefined ? Math.min(params.wallHeight, params.plasterHeight) : params.wallHeight;
            const punH = params.punningHeight !== undefined ? Math.min(params.wallHeight, params.punningHeight) : params.wallHeight;
            const pRatio = params.wallHeight > 0 ? pH / params.wallHeight : 1;
            const punRatio = params.wallHeight > 0 ? punH / params.wallHeight : 1;

            const plasterTopX = wallBotX1 + (wallTopX1 - wallBotX1) * pRatio;
            const plasterTopY = wallBottomY - wHpx * pRatio;

            const punningTopX = wallBotX1 + (wallTopX1 - wallBotX1) * punRatio;
            const punningTopY = wallBottomY - wHpx * punRatio;

            return (
              <g id="brick-finishes">
                {/* Plaster Line */}
                <line
                  x1={wallBotX1 - 3}
                  y1={wallBottomY}
                  x2={plasterTopX - 3}
                  y2={plasterTopY}
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeDasharray="4 2"
                />
                <text
                  x={plasterTopX - 12}
                  y={plasterTopY + 12}
                  textAnchor="end"
                  fontSize="8.5"
                  fontWeight="bold"
                  fill="#10b981"
                >
                  Plaster (Hp = {pH.toFixed(2)}m)
                </text>

                {/* Punning Line */}
                <line
                  x1={wallBotX1 - 6}
                  y1={wallBottomY}
                  x2={punningTopX - 6}
                  y2={punningTopY}
                  stroke="#0284c7"
                  strokeWidth="2"
                  strokeDasharray="2 2"
                />
                <text
                  x={punningTopX - 12}
                  y={punningTopY + 24}
                  textAnchor="end"
                  fontSize="8"
                  fontWeight="bold"
                  fill={isCad ? '#38bdf8' : '#0284c7'}
                >
                  Punning (Hpun = {punH.toFixed(2)}m)
                </text>
              </g>
            );
          })()}

          <text
            x={wallBotX1 + wBotPx / 2}
            y={wallTopY + wHpx / 2}
            textAnchor="middle"
            fontSize="11"
            fontWeight="bold"
            fill={isCad ? '#e2e8f0' : '#1e293b'}
          >
            BRICK MASONRY ({params.brickMortarRatio || '1:4'} Mortar)
          </text>
        </g>
      )}

      {/* ========================================================================= */}
      {/* 5D. PLUM CONCRETE GRAVITY WALL (EQUAL VERTICAL OR UNEQUAL BATTERED)       */}
      {/* ========================================================================= */}
      {isPlumConcrete && (
        <g id="plum-concrete-wall-structure">
          <path
            d={`
              M ${wallBotX1} ${wallBottomY}
              L ${wallTopX1} ${wallTopY}
              L ${wallTopX2} ${wallTopY}
              L ${wallBotX2} ${wallBottomY}
              Z
            `}
            fill={fillPlum}
            stroke={strokeColor}
            strokeWidth="2.5"
          />

          {/* Formwork Guide Lines on vertical / sloped faces */}
          <g id="formwork-lines">
            <line
              x1={wallBotX1 - 4}
              y1={wallBottomY}
              x2={wallTopX1 - 4}
              y2={wallTopY}
              stroke="#eab308"
              strokeWidth="3"
              strokeDasharray="6 3"
            />
            <line
              x1={wallBotX2 + 4}
              y1={wallBottomY}
              x2={wallTopX2 + 4}
              y2={wallTopY}
              stroke="#eab308"
              strokeWidth="3"
              strokeDasharray="6 3"
            />
          </g>

          <text
            x={wallBotX1 + wBotPx / 2}
            y={wallTopY + wHpx / 2}
            textAnchor="middle"
            fontSize="11"
            fontWeight="bold"
            fill={isCad ? '#e2e8f0' : '#1e293b'}
          >
            {isPlumEqual
              ? 'PLUM CONCRETE 1:3:6 (EQUAL WIDTH VERTICAL STEM)'
              : 'PLUM CONCRETE 1:3:6 (40% PLUMS)'}
          </text>
        </g>
      )}

      {/* 6. Weep Holes (rendered for all protection wall types) */}
      {params.weepHoles && (
        <g id="weep-holes">
          {[0.3, 0.65].map((ratio, idx) => {
            const hY = wallBottomY - wHpx * ratio;
            const xLeft = (isRCCLWall ? rccStemBotX1 : wallBotX1) + ((isRCCLWall ? rccStemTopX1 : wallTopX1) - (isRCCLWall ? rccStemBotX1 : wallBotX1)) * ratio + 8;
            const xRight = (isRCCLWall ? rccStemBotX2 : wallBotX2) + ((isRCCLWall ? rccStemTopX2 : wallTopX2) - (isRCCLWall ? rccStemBotX2 : wallBotX2)) * ratio - 8;
            return (
              <g key={idx}>
                <line
                  x1={xLeft}
                  y1={hY}
                  x2={xRight}
                  y2={hY}
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeDasharray="4 2"
                />
                <circle cx={xRight + 6} cy={hY} r="5" fill="#f59e0b" />
                <text x={xLeft - 10} y={hY + 3} textAnchor="end" fontSize="9" fill="#38bdf8" fontWeight="600">
                  75mm PVC Weep Hole @ 1.5m c/c
                </text>
              </g>
            );
          })}
        </g>
      )}

      {/* 7. Dimension Lines & Interactive Labels */}
      {showDimensions && (
        <g id="protection-wall-dimensions">
          {/* Wall Stem Top Width Dimension */}
          <DimensionLine
            x1={wallTopX1}
            y1={wallTopY}
            x2={wallTopX2}
            y2={wallTopY}
            offset={-28}
            value={wallTopWidth}
            unit="m"
            label="Tw"
            dimColor={dimColor}
            onEditValue={(v) => onUpdateParam('wallTopWidth', v, true)}
          />

          {/* Wall Stem Bottom Width Dimension */}
          <DimensionLine
            x1={isRCCLWall ? rccStemBotX1 : wallBotX1}
            y1={wallBottomY}
            x2={isRCCLWall ? rccStemBotX2 : wallBotX2}
            y2={wallBottomY}
            offset={isRCCLWall ? -18 : -16}
            value={wallBottomWidth}
            unit="m"
            label="Bw"
            dimColor={dimColor}
            onEditValue={(v) => onUpdateParam('wallBottomWidth', v, true)}
          />

          {/* Wall Height Dimension */}
          <DimensionLine
            x1={Math.max(wallBotX2, wallTopX2, isRCCLWall ? rccStemBotX2 : wallBotX2)}
            y1={wallBottomY}
            x2={Math.max(wallBotX2, wallTopX2, isRCCLWall ? rccStemBotX2 : wallBotX2)}
            y2={wallTopY}
            offset={isRCCLWall ? heelPx + 40 : 45}
            orientation="vertical"
            value={wallHeight}
            unit="m"
            label="H"
            dimColor={dimColor}
            onEditValue={(v) => onUpdateParam('wallHeight', v, true)}
          />

          {/* RCC L-Wall: Base Slab Width & Component Dimensions */}
          {isRCCLWall && (
            <>
              {/* Total Base Slab Width */}
              <DimensionLine
                x1={baseSlabX1}
                y1={baseSlabBottomY}
                x2={baseSlabX2}
                y2={baseSlabBottomY}
                offset={24}
                orientation="horizontal"
                value={baseSlabWidth}
                unit="m"
                label="Bed Slab (B)"
                dimColor={dimColor}
                onEditValue={(v) => onUpdateParam('baseSlabWidth', v, true)}
              />

              {/* Base Slab Thickness */}
              <DimensionLine
                x1={baseSlabX1}
                y1={baseSlabBottomY}
                x2={baseSlabX1}
                y2={baseSlabTopY}
                offset={-36}
                orientation="vertical"
                value={baseSlabThickness}
                unit="m"
                label="Tb"
                dimColor={dimColor}
                onEditValue={(v) => onUpdateParam('baseSlabThickness', v, true)}
              />

              {/* Toe Slab Dimension (only if toe > 0.05) */}
              {toeLength > 0.04 && (
                <DimensionLine
                  x1={baseSlabX1}
                  y1={baseSlabTopY}
                  x2={rccStemBotX1}
                  y2={baseSlabTopY}
                  offset={-16}
                  orientation="horizontal"
                  value={toeLength}
                  unit="m"
                  label="Toe"
                  dimColor="#10b981"
                  onEditValue={(v) => onUpdateParam('toeLength', v, true)}
                />
              )}

              {/* Heel Slab Dimension (only if heel > 0.05) */}
              {heelLength > 0.04 && (
                <DimensionLine
                  x1={rccStemBotX2}
                  y1={baseSlabTopY}
                  x2={baseSlabX2}
                  y2={baseSlabTopY}
                  offset={-16}
                  orientation="horizontal"
                  value={heelLength}
                  unit="m"
                  label="Heel"
                  dimColor="#38bdf8"
                  onEditValue={(v) => onUpdateParam('heelLength', v, true)}
                />
              )}
            </>
          )}

          {/* PCC Bed Width */}
          <DimensionLine
            x1={pccX1}
            y1={pccBottomY}
            x2={pccX2}
            y2={pccBottomY}
            offset={isRCCLWall ? 48 : 26}
            orientation="horizontal"
            value={pccWidth}
            unit="m"
            label="PCC Bed"
            dimColor={dimColor}
            onEditValue={(v) => onUpdateParam('pccWidth', v, true)}
          />

          {/* PCC Thickness */}
          <DimensionLine
            x1={pccX1}
            y1={pccBottomY}
            x2={pccX1}
            y2={pccTopY}
            offset={-48}
            orientation="vertical"
            value={pccThickness}
            unit="m"
            label="PCC"
            dimColor={dimColor}
            onEditValue={(v) => onUpdateParam('pccThickness', v, true)}
          />

          {/* Soling Thickness */}
          <DimensionLine
            x1={solingX1}
            y1={solingBottomY}
            x2={solingX1}
            y2={solingTopY}
            offset={-75}
            orientation="vertical"
            value={solingThickness}
            unit="m"
            label="Soling"
            dimColor={dimColor}
            onEditValue={(v) => onUpdateParam('solingThickness', v, true)}
          />

          {/* Excavation Width */}
          <DimensionLine
            x1={excX1}
            y1={excBottomY}
            x2={excX2}
            y2={excBottomY}
            offset={isRCCLWall ? 72 : 54}
            orientation="horizontal"
            value={excavationWidth}
            unit="m"
            label="Excavation Trench"
            dimColor="#ef4444"
            onEditValue={(v) => onUpdateParam('excavationWidth', v, true)}
          />

          {/* Excavation Depth */}
          <DimensionLine
            x1={excX1}
            y1={excTopY}
            x2={excX1}
            y2={excBottomY}
            offset={-110}
            orientation="vertical"
            value={excavationDepth}
            unit="m"
            label="Exc Depth"
            dimColor="#ef4444"
            onEditValue={(v) => onUpdateParam('excavationDepth', v, true)}
          />

          {/* Detailed Engineering Title Block */}
          <g transform={`translate(${cx}, ${excBottomY + (isRCCLWall ? 105 : 85)})`}>
            <text
              x="0"
              y="0"
              textAnchor="middle"
              fontSize="13"
              fontWeight="800"
              fill={isCad ? '#f8fafc' : '#0f172a'}
              letterSpacing="0.5"
            >
              {isStoneMasonry
                ? '1. BATTERED RANDOM RUBBLE STONE MASONRY PROTECTION WALL'
                : isRCCLWall
                ? `2. R.C.C. L-PROTECTION WALL (${isEqualWidth ? 'VERTICAL STEM' : 'TAPERED STEM'} + BED PCC)`
                : isPlumEqual
                ? '3. EQUAL WIDTH PLUM CONCRETE PROTECTION WALL (VERTICAL STEM)'
                : isPlumUnequal
                ? '4. UNEQUAL WIDTH PLUM CONCRETE GRAVITY PROTECTION WALL (BATTERED)'
                : isBrickMasonry
                ? '5. MODULAR BRICK MASONRY PROTECTION WALL'
                : '6. CUSTOM PARAMETRIC PROTECTION WALL'}
            </text>
            <text
              x="0"
              y="18"
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill={isCad ? '#38bdf8' : '#2563eb'}
            >
              {isRCCLWall
                ? `H = ${wallHeight.toFixed(2)}m | Stem = ${wallTopWidth.toFixed(2)}m${isEqualWidth ? ' (Vertical)' : `–${wallBottomWidth.toFixed(2)}m`} | Base Slab = ${baseSlabWidth.toFixed(2)}m × ${baseSlabThickness.toFixed(2)}m | L = ${wallLength.toFixed(2)}m`
                : `Top = ${wallTopWidth.toFixed(2)}m | Base = ${wallBottomWidth.toFixed(2)}m${isEqualWidth ? ' (Vertical)' : ''} | H = ${wallHeight.toFixed(2)}m | L = ${wallLength.toFixed(2)}m`
              }
            </text>
          </g>
        </g>
      )}
    </g>
  );
};
