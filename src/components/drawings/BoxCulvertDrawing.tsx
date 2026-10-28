import React from 'react';
import { DimensionLine } from './DimensionLine';
import { CulvertParameters } from './types';
import { Layers, Eye, Shield, Compass, Ruler, Waves, CornerDownRight, Split } from 'lucide-react';

interface BoxCulvertDrawingProps {
  culvertType: 'box_single' | 'box_twin';
  params: CulvertParameters;
  onUpdateParam: (key: keyof CulvertParameters, value: any) => void;
  showDimensions: boolean;
  showHatching: boolean;
  canvasTheme?: 'cad' | 'paper' | 'blueprint';
  themeColors?: any;
  viewMode?: 'cross_section' | 'longitudinal' | 'plan_apron' | 'rebar_detail';
  onSelectViewMode?: (mode: 'cross_section' | 'longitudinal' | 'plan_apron' | 'rebar_detail') => void;
}

export const BoxCulvertDrawing: React.FC<BoxCulvertDrawingProps> = ({
  culvertType,
  params,
  onUpdateParam,
  showDimensions,
  showHatching,
  canvasTheme = 'cad',
  themeColors,
  viewMode = 'cross_section',
  onSelectViewMode
}) => {
  const isCad = canvasTheme === 'cad';
  const isBlueprint = canvasTheme === 'blueprint';

  // Helper colors
  const strokeColor = isCad ? '#e2e8f0' : isBlueprint ? '#93c5fd' : '#1e293b';
  const dimColor = isCad ? '#38bdf8' : isBlueprint ? '#bfdbfe' : '#2563eb';
  const rebarColor = '#f97316';
  const filletRebarColor = '#ec4899';
  const waterColor = isCad ? '#0284c7' : isBlueprint ? '#38bdf8' : '#0ea5e9';
  const apronColor = isCad ? '#d97706' : isBlueprint ? '#f59e0b' : '#b45309';
  const scourWallColor = isCad ? '#64748b' : isBlueprint ? '#1e3a8a' : '#475569';

  // Fill Patterns
  const fillRCC = showHatching ? 'url(#concreteHatch)' : isCad ? '#334155' : isBlueprint ? '#1e3a8a' : '#cbd5e1';
  const fillPcc = showHatching ? 'url(#concreteHatch)' : isCad ? '#475569' : isBlueprint ? '#2563eb' : '#e2e8f0';
  const fillSoling = showHatching ? 'url(#solingHatch)' : isCad ? '#78350f' : isBlueprint ? '#3b82f6' : '#fef3c7';
  const fillEarth = showHatching ? 'url(#earthHatch)' : isCad ? '#1e293b' : isBlueprint ? '#172554' : '#f1f5f9';
  const fillApron = showHatching ? 'url(#solingHatch)' : isCad ? '#92400e' : isBlueprint ? '#d97706' : '#fef3c7';

  // Core Geometry & Dimensions with Defaults
  const isTwin = culvertType === 'box_twin';
  const numCells = isTwin ? 2 : 1;
  const span = params.clearSpan || 2.50;               // S [m]
  const clearH = params.clearHeight || 2.00;           // H [m]
  const topSlabT = params.topSlabThickness || 0.30;    // Tt [m]
  const botSlabT = params.bottomSlabThickness || 0.30; // Tb [m]
  const wallT = params.wallThickness || 0.30;          // Tw [m]
  const pierT = params.pierThickness || wallT;         // Tpier [m] (center pier)
  const barrelL = params.barrelLength || 8.50;         // Lb [m]
  const fillH = params.fillHeight || 0.60;             // Hf [m]
  const waterLvl = Math.min(clearH - 0.2, params.waterLevel || 0.80);

  // Fillet & Fillet Bar Parameters
  const hasFillet = params.hasFillet ?? true;
  const filletSize = hasFillet ? (params.filletSize || 0.20) : 0; // [m]
  const hasFilletBar = params.hasFilletBar ?? true;
  const filletBarDia = params.filletBarDia || 12; // mm
  const filletBarSpacing = params.filletBarSpacing || 150; // mm

  // Launching Apron Parameters
  const hasApron = params.hasLaunchingApron ?? true;
  const apronOption = params.launchingApronOption || (hasApron ? 'both' : 'none');
  const hasUsApron = hasApron && (apronOption === 'both' || apronOption === 'upstream');
  const hasDsApron = hasApron && (apronOption === 'both' || apronOption === 'downstream');
  const apronL = params.launchingApronLength || 3.00; // [m]
  const apronT = params.launchingApronThickness || 0.35; // [m]
  const apronMat = params.launchingApronMaterial || 'stone_pitching';

  // Scour Wall (Curtain Wall) Parameters
  const hasScourWall = params.hasScourWall ?? true;
  const scourLocation = params.scourWallLocation || (hasScourWall ? 'both' : 'none');
  const hasUsScourWall = hasScourWall && (scourLocation === 'both' || scourLocation === 'upstream');
  const hasDsScourWall = hasScourWall && (scourLocation === 'both' || scourLocation === 'downstream');
  const scourDepth = params.scourWallDepth || 1.20; // [m] below bed level
  const scourThick = params.scourWallThickness || 0.30; // [m]
  const scourType = params.scourWallType || 'plum_concrete';

  // Foundation Bedding
  const pccT = params.foundationPccThickness || 0.10; // [m]
  const pccOffset = params.foundationPccOffset || 0.15;
  const solingT = params.foundationSolingThickness || 0.15;

  // Scale & Viewport Positioning
  const cx = 390;
  const scale = 72; // px per meter

  const pxSpan = span * scale;
  const pxClearH = clearH * scale;
  const pxTopSlabT = topSlabT * scale;
  const pxBotSlabT = botSlabT * scale;
  const pxWallT = wallT * scale;
  const pxPierT = pierT * scale;
  const pxFillH = fillH * scale;
  const pxFillet = filletSize * scale;
  const pxPccT = pccT * scale;
  const pxPccOffset = pccOffset * scale;
  const pxSolingT = solingT * scale;
  const pxWaterLvl = waterLvl * scale;

  // Total Outer Width
  const totalClearSpan = isTwin ? 2 * span + pierT : span;
  const totalOuterWidth = totalClearSpan + 2 * wallT;
  const pxOuterW = totalOuterWidth * scale;

  return (
    <g id="box-culvert-drawing-root" className="transition-all duration-300">
      {/* VIEW SELECTOR SUB-NAVIGATION TABS */}
      {onSelectViewMode && (
        <foreignObject x="20" y="8" width="760" height="38">
          <div className="flex items-center justify-between bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 shadow-xl text-xs">
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-white mr-1.5 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                {isTwin ? 'Twin-Cell' : 'Single-Cell'} RCC Box Culvert:
              </span>
              <button
                type="button"
                onClick={() => onSelectViewMode('cross_section')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                  viewMode === 'cross_section'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Ruler className="w-3 h-3" />
                <span>1. Cross-Section</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectViewMode('longitudinal')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                  viewMode === 'longitudinal'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Waves className="w-3 h-3 text-amber-400" />
                <span>2. Longitudinal (Apron & Scour)</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectViewMode('plan_apron')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                  viewMode === 'plan_apron'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Compass className="w-3 h-3 text-emerald-400" />
                <span>3. Plan Layout</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectViewMode('rebar_detail')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                  viewMode === 'rebar_detail'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <CornerDownRight className="w-3 h-3 text-pink-400" />
                <span>4. Rebar & Fillet Detail</span>
              </button>
            </div>

            {/* Quick Feature Badges */}
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold">
              <span className={`px-2 py-0.5 rounded-md border ${hasFillet ? 'bg-pink-950/60 text-pink-300 border-pink-700' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                Fillet: {hasFillet ? `${(filletSize * 1000).toFixed(0)}mm` : 'OFF'}
              </span>
              <span className={`px-2 py-0.5 rounded-md border ${hasApron ? 'bg-amber-950/60 text-amber-300 border-amber-700' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                Apron: {apronOption.toUpperCase()}
              </span>
              <span className={`px-2 py-0.5 rounded-md border ${hasScourWall ? 'bg-blue-950/60 text-blue-300 border-blue-700' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                Scour Wall: {scourLocation.toUpperCase()}
              </span>
            </div>
          </div>
        </foreignObject>
      )}

      {/* ========================================================================= */}
      {/* 1. VIEW 1: TRANSVERSE CROSS-SECTION (BARREL, FILLETS, WATER, REBAR) */}
      {/* ========================================================================= */}
      {viewMode === 'cross_section' && (() => {
        const topY = 140;
        const outerLeftX = cx - pxOuterW / 2;
        const outerRightX = cx + pxOuterW / 2;

        const topSlabY = topY + pxFillH;
        const cellTopY = topSlabY + pxTopSlabT;
        const cellBotY = cellTopY + pxClearH;
        const bottomSlabY = cellBotY + pxBotSlabT;
        const pccBotY = bottomSlabY + pxPccT;
        const solingBotY = pccBotY + pxSolingT;

        const pccLeftX = outerLeftX - pxPccOffset;
        const pccRightX = outerRightX + pxPccOffset;

        return (
          <g id="box-cross-section-group">
            {/* Earth Excavation & Surrounding Fill */}
            {pxFillH > 0 && (
              <g>
                <polygon
                  points={`
                    ${outerLeftX - 100},${topY}
                    ${outerRightX + 100},${topY}
                    ${outerRightX + 50},${topSlabY}
                    ${outerLeftX - 50},${topSlabY}
                  `}
                  fill={fillEarth}
                  stroke={strokeColor}
                  strokeWidth="1"
                  strokeDasharray="4 2"
                  opacity="0.6"
                />
                <line x1={outerLeftX - 110} y1={topY} x2={outerRightX + 110} y2={topY} stroke={strokeColor} strokeWidth="1.5" />
                <text x={cx} y={topY - 8} fill={themeColors?.dimText || strokeColor} fontSize="10" fontWeight="bold" textAnchor="middle">
                  Finished Road / Formation Level (Earth Cushion Hf = {fillH.toFixed(2)}m)
                </text>
              </g>
            )}

            {/* Soling Bedding */}
            <rect
              x={pccLeftX - 10}
              y={pccBotY}
              width={pccRightX - pccLeftX + 20}
              height={pxSolingT}
              fill={fillSoling}
              stroke={strokeColor}
              strokeWidth="1.5"
            />

            {/* PCC M10 Base Leveling */}
            <rect
              x={pccLeftX}
              y={bottomSlabY}
              width={pccRightX - pccLeftX}
              height={pxPccT}
              fill={fillPcc}
              stroke={strokeColor}
              strokeWidth="1.5"
            />

            {/* Main Outer Concrete Box Monolithic Body */}
            <rect
              x={outerLeftX}
              y={topSlabY}
              width={pxOuterW}
              height={pxTopSlabT + pxClearH + pxBotSlabT}
              fill={fillRCC}
              stroke={strokeColor}
              strokeWidth="2.5"
            />

            {/* Inner Clear Waterway Cells with Corner Fillet Haunches */}
            {Array.from({ length: numCells }).map((_, i) => {
              const cellLeftX = isTwin
                ? i === 0
                  ? outerLeftX + pxWallT
                  : outerLeftX + pxWallT + pxSpan + pxPierT
                : outerLeftX + pxWallT;
              const cellRightX = cellLeftX + pxSpan;

              return (
                <g key={i}>
                  {/* Clear Cell Opening Area */}
                  {hasFillet && pxFillet > 0 ? (
                    // Octagonal / Chamfered Fillet Shape
                    <polygon
                      points={`
                        ${cellLeftX + pxFillet},${cellTopY}
                        ${cellRightX - pxFillet},${cellTopY}
                        ${cellRightX},${cellTopY + pxFillet}
                        ${cellRightX},${cellBotY - pxFillet}
                        ${cellRightX - pxFillet},${cellBotY}
                        ${cellLeftX + pxFillet},${cellBotY}
                        ${cellLeftX},${cellBotY - pxFillet}
                        ${cellLeftX},${cellTopY + pxFillet}
                      `}
                      fill={themeColors?.bg || '#0f172a'}
                      stroke={strokeColor}
                      strokeWidth="2"
                    />
                  ) : (
                    // Square Opening (No Fillet)
                    <rect
                      x={cellLeftX}
                      y={cellTopY}
                      width={pxSpan}
                      height={pxClearH}
                      fill={themeColors?.bg || '#0f172a'}
                      stroke={strokeColor}
                      strokeWidth="2"
                    />
                  )}

                  {/* Fillet Corner Triangles Hatching & Reinforcement Markers (if Fillet Enabled) */}
                  {hasFillet && pxFillet > 0 && (
                    <g>
                      {/* Top-Left Fillet */}
                      <polygon
                        points={`${cellLeftX},${cellTopY} ${cellLeftX + pxFillet},${cellTopY} ${cellLeftX},${cellTopY + pxFillet}`}
                        fill={fillRCC}
                        stroke={strokeColor}
                        strokeWidth="1.5"
                      />
                      {/* Top-Right Fillet */}
                      <polygon
                        points={`${cellRightX},${cellTopY} ${cellRightX - pxFillet},${cellTopY} ${cellRightX},${cellTopY + pxFillet}`}
                        fill={fillRCC}
                        stroke={strokeColor}
                        strokeWidth="1.5"
                      />
                      {/* Bottom-Right Fillet */}
                      <polygon
                        points={`${cellRightX},${cellBotY} ${cellRightX - pxFillet},${cellBotY} ${cellRightX},${cellBotY - pxFillet}`}
                        fill={fillRCC}
                        stroke={strokeColor}
                        strokeWidth="1.5"
                      />
                      {/* Bottom-Left Fillet */}
                      <polygon
                        points={`${cellLeftX},${cellBotY} ${cellLeftX + pxFillet},${cellBotY} ${cellLeftX},${cellBotY - pxFillet}`}
                        fill={fillRCC}
                        stroke={strokeColor}
                        strokeWidth="1.5"
                      />

                      {/* Fillet Bar Diagonal Ties (45° Rebar) if Enabled */}
                      {hasFilletBar && (
                        <g>
                          {/* Top-Left Diagonal Bar */}
                          <line
                            x1={cellLeftX - 6}
                            y1={cellTopY + pxFillet + 10}
                            x2={cellLeftX + pxFillet + 10}
                            y2={cellTopY - 6}
                            stroke={filletRebarColor}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                          {/* Top-Right Diagonal Bar */}
                          <line
                            x1={cellRightX + 6}
                            y1={cellTopY + pxFillet + 10}
                            x2={cellRightX - pxFillet - 10}
                            y2={cellTopY - 6}
                            stroke={filletRebarColor}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                          {/* Bottom-Right Diagonal Bar */}
                          <line
                            x1={cellRightX + 6}
                            y1={cellBotY - pxFillet - 10}
                            x2={cellRightX - pxFillet - 10}
                            y2={cellBotY + 6}
                            stroke={filletRebarColor}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                          {/* Bottom-Left Diagonal Bar */}
                          <line
                            x1={cellLeftX - 6}
                            y1={cellBotY - pxFillet - 10}
                            x2={cellLeftX + pxFillet + 10}
                            y2={cellBotY + 6}
                            stroke={filletRebarColor}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                        </g>
                      )}
                    </g>
                  )}

                  {/* Water Flow Depth Level in Cell */}
                  {pxWaterLvl > 0 && (
                    <g>
                      <rect
                        x={cellLeftX + 2}
                        y={cellBotY - pxWaterLvl}
                        width={pxSpan - 4}
                        height={pxWaterLvl}
                        fill="url(#waterHatch)"
                        opacity="0.8"
                      />
                      <line
                        x1={cellLeftX + 2}
                        y1={cellBotY - pxWaterLvl}
                        x2={cellRightX - 2}
                        y2={cellBotY - pxWaterLvl}
                        stroke={waterColor}
                        strokeWidth="1.8"
                        strokeDasharray="6 3"
                      />
                    </g>
                  )}
                </g>
              );
            })}

            {/* Rebar Indicator Lines */}
            {/* Top Slab Transverse Tension Rebar */}
            <line x1={outerLeftX + 10} y1={topSlabY + 8} x2={outerRightX - 10} y2={topSlabY + 8} stroke={rebarColor} strokeWidth="2" strokeDasharray="6 3" />
            <line x1={outerLeftX + 10} y1={cellTopY - 8} x2={outerRightX - 10} y2={cellTopY - 8} stroke={rebarColor} strokeWidth="2" strokeDasharray="6 3" />

            {/* Bottom Slab Transverse Tension Rebar */}
            <line x1={outerLeftX + 10} y1={bottomSlabY - 8} x2={outerRightX - 10} y2={bottomSlabY - 8} stroke={rebarColor} strokeWidth="2" strokeDasharray="6 3" />
            <line x1={outerLeftX + 10} y1={cellBotY + 8} x2={outerRightX - 10} y2={cellBotY + 8} stroke={rebarColor} strokeWidth="2" strokeDasharray="6 3" />

            {/* Vertical Wall Rebar */}
            <line x1={outerLeftX + 8} y1={topSlabY + 12} x2={outerLeftX + 8} y2={bottomSlabY - 12} stroke={rebarColor} strokeWidth="2" />
            <line x1={outerLeftX + pxWallT - 8} y1={topSlabY + 12} x2={outerLeftX + pxWallT - 8} y2={bottomSlabY - 12} stroke={rebarColor} strokeWidth="2" />
            <line x1={outerRightX - 8} y1={topSlabY + 12} x2={outerRightX - 8} y2={bottomSlabY - 12} stroke={rebarColor} strokeWidth="2" />
            <line x1={outerRightX - pxWallT + 8} y1={topSlabY + 12} x2={outerRightX - pxWallT + 8} y2={bottomSlabY - 12} stroke={rebarColor} strokeWidth="2" />

            {isTwin && (
              <>
                <line x1={cx - pxPierT / 2 + 6} y1={topSlabY + 12} x2={cx - pxPierT / 2 + 6} y2={bottomSlabY - 12} stroke={rebarColor} strokeWidth="2" />
                <line x1={cx + pxPierT / 2 - 6} y1={topSlabY + 12} x2={cx + pxPierT / 2 - 6} y2={bottomSlabY - 12} stroke={rebarColor} strokeWidth="2" />
              </>
            )}

            {/* Fillet & Rebar Callout Badges */}
            <g transform={`translate(${outerLeftX + pxWallT + (hasFillet ? pxFillet + 15 : 20)}, ${cellTopY + (hasFillet ? pxFillet + 15 : 20)})`}>
              <rect x="-5" y="-12" width="135" height="24" rx="4" fill="#831843" fillOpacity="0.85" stroke="#f472b6" strokeWidth="1" />
              <text x="62" y="3" fill="#fbcfe8" fontSize="9" fontWeight="900" textAnchor="middle">
                {hasFillet ? `Fillet ${(filletSize * 1000).toFixed(0)}×${(filletSize * 1000).toFixed(0)}mm ${hasFilletBar ? `(Ø${filletBarDia})` : '(No Bar)'}` : 'Square Corner (No Fillet)'}
              </text>
            </g>

            {/* Water Depth Callout */}
            <text x={cx} y={cellBotY - pxWaterLvl - 6} fill={waterColor} fontSize="10" textAnchor="middle" fontWeight="bold">
              ▼ HFL Water Depth = {waterLvl.toFixed(2)}m
            </text>

            {/* DIMENSION LINES */}
            {showDimensions && (
              <g id="box-cross-section-dimensions">
                {/* Clear Span */}
                <DimensionLine
                  x1={outerLeftX + pxWallT}
                  y1={cellBotY}
                  x2={outerLeftX + pxWallT + pxSpan}
                  y2={cellBotY}
                  label="Span (S)"
                  value={span}
                  offset={25}
                  lineColor={dimColor}
                  textColor={dimColor}
                  paramName="Clear Span"
                  onEditValue={(v) => onUpdateParam('clearSpan', v)}
                />

                {/* Clear Height */}
                <DimensionLine
                  x1={outerRightX}
                  y1={cellTopY}
                  x2={outerRightX}
                  y2={cellBotY}
                  label="Height (H)"
                  value={clearH}
                  offset={30}
                  orientation="vertical"
                  lineColor={dimColor}
                  textColor={dimColor}
                  paramName="Clear Height"
                  onEditValue={(v) => onUpdateParam('clearHeight', v)}
                />

                {/* Top Slab Thickness */}
                <DimensionLine
                  x1={outerLeftX}
                  y1={topSlabY}
                  x2={outerLeftX}
                  y2={cellTopY}
                  label="Tt"
                  value={topSlabT}
                  offset={-30}
                  orientation="vertical"
                  lineColor={dimColor}
                  textColor={dimColor}
                  paramName="Top Slab Thickness"
                  onEditValue={(v) => onUpdateParam('topSlabThickness', v)}
                />

                {/* Bottom Slab Thickness */}
                <DimensionLine
                  x1={outerLeftX}
                  y1={cellBotY}
                  x2={outerLeftX}
                  y2={bottomSlabY}
                  label="Tb"
                  value={botSlabT}
                  offset={-30}
                  orientation="vertical"
                  lineColor={dimColor}
                  textColor={dimColor}
                  paramName="Bottom Slab Thickness"
                  onEditValue={(v) => onUpdateParam('bottomSlabThickness', v)}
                />

                {/* Wall Thickness */}
                <DimensionLine
                  x1={outerLeftX}
                  y1={topSlabY}
                  x2={outerLeftX + pxWallT}
                  y2={topSlabY}
                  label="Tw"
                  value={wallT}
                  offset={-25}
                  lineColor={dimColor}
                  textColor={dimColor}
                  paramName="Wall Thickness"
                  onEditValue={(v) => onUpdateParam('wallThickness', v)}
                />

                {/* Overall Box Width */}
                <DimensionLine
                  x1={outerLeftX}
                  y1={bottomSlabY}
                  x2={outerRightX}
                  y2={bottomSlabY}
                  label="Total Width (W_box)"
                  value={totalOuterWidth}
                  offset={55}
                  lineColor={dimColor}
                  textColor={dimColor}
                  paramName="Outer Width"
                />
              </g>
            )}

            <text x={cx} y={topY - (pxFillH > 0 ? 30 : 15)} fill={themeColors?.titleText || strokeColor} fontSize="14" fontWeight="900" textAnchor="middle">
              1. TRANSVERSE CROSS-SECTION: {isTwin ? 'TWIN-CELL' : 'SINGLE-CELL'} RCC BOX CULVERT ({span}m × {clearH}m)
            </text>
            <text x={cx} y={solingBotY + 28} fill={themeColors?.dimText || '#64748b'} fontSize="10" fontWeight="bold" textAnchor="middle">
              {hasFillet ? `With ${filletSize * 1000}mm Corner Fillet Haunches & ${hasFilletBar ? `Ø${filletBarDia} Diagonal Bars` : 'No Corner Rebar'}` : 'Square Intersections (Without Corner Fillets)'} • PCC Leveling Base • Soling Bed
            </text>
          </g>
        );
      })()}

      {/* ========================================================================= */}
      {/* 2. VIEW 2: LONGITUDINAL SECTION: BARREL, LAUNCHING APRONS & SCOUR WALLS */}
      {/* ========================================================================= */}
      {viewMode === 'longitudinal' && (() => {
        const topY = 160;
        const pxBarrelL = barrelL * scale * 0.55; // Fit lengthwise
        const pxApronL = apronL * scale * 0.55;
        const pxScourD = scourDepth * scale;
        const pxScourThick = scourThick * scale * 0.7;

        const barrelLeftX = cx - pxBarrelL / 2;
        const barrelRightX = cx + pxBarrelL / 2;

        const topSlabY = topY + pxFillH * 0.7;
        const cellTopY = topSlabY + pxTopSlabT;
        const cellBotY = cellTopY + pxClearH;
        const bottomSlabY = cellBotY + pxBotSlabT;
        const pccBotY = bottomSlabY + pxPccT;
        const solingBotY = pccBotY + pxSolingT;

        // Upstream & Downstream Apron Coordinates
        const usApronStartX = barrelLeftX - pxApronL;
        const dsApronEndX = barrelRightX + pxApronL;

        const usScourX = hasUsScourWall ? usApronStartX : barrelLeftX;
        const dsScourX = hasDsScourWall ? dsApronEndX - pxScourThick : barrelRightX - pxScourThick;

        return (
          <g id="box-longitudinal-group">
            {/* Flow Direction Indicator Arrow */}
            <g transform={`translate(${cx}, ${topY - 45})`}>
              <line x1="-120" y1="0" x2="120" y2="0" stroke="#0284c7" strokeWidth="2.5" markerEnd="url(#flowArrow)" />
              <polygon points="120,-4 130,0 120,4" fill="#0284c7" />
              <text x="0" y="-8" fill="#38bdf8" fontSize="11" fontWeight="900" textAnchor="middle">
                🌊 WATER FLOW DIRECTION: UPSTREAM (U/S) ➔ DOWNSTREAM (D/S)
              </text>
            </g>

            {/* Earth Embankment over Barrel */}
            <rect
              x={barrelLeftX}
              y={topY}
              width={pxBarrelL}
              height={pxFillH * 0.7}
              fill={fillEarth}
              stroke={strokeColor}
              strokeWidth="1"
              strokeDasharray="4 2"
            />

            {/* Headwalls / Parapets at Both Barrel Ends */}
            <rect x={barrelLeftX - 12} y={topY - 15} width="12" height={pxTopSlabT + pxClearH + pxBotSlabT + pxFillH * 0.7 + 15} fill={fillRCC} stroke={strokeColor} strokeWidth="2" />
            <rect x={barrelRightX} y={topY - 15} width="12" height={pxTopSlabT + pxClearH + pxBotSlabT + pxFillH * 0.7 + 15} fill={fillRCC} stroke={strokeColor} strokeWidth="2" />

            {/* Main Box Barrel Concrete Walls & Slabs in Profile */}
            {/* Top Slab */}
            <rect x={barrelLeftX} y={topSlabY} width={pxBarrelL} height={pxTopSlabT} fill={fillRCC} stroke={strokeColor} strokeWidth="2" />
            {/* Waterway Opening Tunnel */}
            <rect x={barrelLeftX} y={cellTopY} width={pxBarrelL} height={pxClearH} fill={themeColors?.bg || '#0f172a'} stroke={strokeColor} strokeWidth="1.5" />
            {/* Bottom Slab / Raft */}
            <rect x={barrelLeftX} y={cellBotY} width={pxBarrelL} height={pxBotSlabT} fill={fillRCC} stroke={strokeColor} strokeWidth="2" />

            {/* Water Invert Level */}
            {pxWaterLvl > 0 && (
              <g>
                <rect x={barrelLeftX} y={cellBotY - pxWaterLvl} width={pxBarrelL} height={pxWaterLvl} fill="url(#waterHatch)" opacity="0.85" />
                <line x1={barrelLeftX} y1={cellBotY - pxWaterLvl} x2={barrelRightX} y2={cellBotY - pxWaterLvl} stroke={waterColor} strokeWidth="1.8" strokeDasharray="6 3" />
              </g>
            )}

            {/* Bedding PCC & Soling under Barrel */}
            <rect x={barrelLeftX - 10} y={bottomSlabY} width={pxBarrelL + 20} height={pxPccT} fill={fillPcc} stroke={strokeColor} strokeWidth="1.5" />
            <rect x={barrelLeftX - 15} y={pccBotY} width={pxBarrelL + 30} height={pxSolingT} fill={fillSoling} stroke={strokeColor} strokeWidth="1.5" />

            {/* =================================================================== */}
            {/* UPSTREAM (U/S) PROTECTION WORKS: LAUNCHING APRON & SCOUR WALL */}
            {/* =================================================================== */}
            {hasUsApron ? (
              <g id="upstream-launching-apron">
                {/* Flexible Launching Apron Pitching Bed */}
                <polygon
                  points={`
                    ${barrelLeftX},${bottomSlabY}
                    ${usApronStartX},${bottomSlabY + 10}
                    ${usApronStartX},${bottomSlabY + 10 + pxSolingT * 1.5}
                    ${barrelLeftX},${bottomSlabY + pxSolingT * 1.5}
                  `}
                  fill={fillApron}
                  stroke={strokeColor}
                  strokeWidth="2"
                />
                <text x={(barrelLeftX + usApronStartX) / 2} y={bottomSlabY - 8} fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="middle">
                  U/S Launching Apron (L={apronL.toFixed(1)}m)
                </text>
              </g>
            ) : (
              <g id="no-us-apron">
                <text x={barrelLeftX - 45} y={bottomSlabY + 15} fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">
                  (No U/S Apron)
                </text>
              </g>
            )}

            {/* Upstream Scour / Curtain Cutoff Wall */}
            {hasUsScourWall ? (
              <g id="upstream-scour-wall">
                <rect
                  x={hasUsApron ? usApronStartX - pxScourThick : barrelLeftX - pxScourThick}
                  y={bottomSlabY}
                  width={pxScourThick}
                  height={pxScourD}
                  fill={fillRCC}
                  stroke={strokeColor}
                  strokeWidth="2"
                />
                {/* PCC Base under Scour Wall */}
                <rect
                  x={(hasUsApron ? usApronStartX - pxScourThick : barrelLeftX - pxScourThick) - 8}
                  y={bottomSlabY + pxScourD}
                  width={pxScourThick + 16}
                  height={pxPccT}
                  fill={fillPcc}
                  stroke={strokeColor}
                  strokeWidth="1.5"
                />
                {/* Scour Wall Badge Callout */}
                <g transform={`translate(${hasUsApron ? usApronStartX - pxScourThick - 10 : barrelLeftX - pxScourThick - 10}, ${bottomSlabY + pxScourD / 2})`}>
                  <rect x="-100" y="-12" width="105" height="24" rx="4" fill="#1e3a8a" fillOpacity="0.9" stroke="#60a5fa" strokeWidth="1" />
                  <text x="-48" y="4" fill="#dbeafe" fontSize="8.5" fontWeight="900" textAnchor="middle">
                    U/S Scour Wall D={scourDepth}m
                  </text>
                </g>
              </g>
            ) : (
              <text x={barrelLeftX - 50} y={bottomSlabY + 45} fill="#94a3b8" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                (No U/S Scour Wall)
              </text>
            )}

            {/* =================================================================== */}
            {/* DOWNSTREAM (D/S) PROTECTION WORKS: LAUNCHING APRON & SCOUR WALL */}
            {/* =================================================================== */}
            {hasDsApron ? (
              <g id="downstream-launching-apron">
                {/* Flexible Launching Apron Pitching Bed */}
                <polygon
                  points={`
                    ${barrelRightX},${bottomSlabY}
                    ${dsApronEndX},${bottomSlabY + 12}
                    ${dsApronEndX},${bottomSlabY + 12 + pxSolingT * 1.5}
                    ${barrelRightX},${bottomSlabY + pxSolingT * 1.5}
                  `}
                  fill={fillApron}
                  stroke={strokeColor}
                  strokeWidth="2"
                />
                <text x={(barrelRightX + dsApronEndX) / 2} y={bottomSlabY - 8} fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="middle">
                  D/S Launching Apron (L={apronL.toFixed(1)}m)
                </text>
              </g>
            ) : (
              <g id="no-ds-apron">
                <text x={barrelRightX + 45} y={bottomSlabY + 15} fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">
                  (No D/S Apron)
                </text>
              </g>
            )}

            {/* Downstream Scour / Curtain Cutoff Wall */}
            {hasDsScourWall ? (
              <g id="downstream-scour-wall">
                <rect
                  x={hasDsApron ? dsApronEndX : barrelRightX}
                  y={bottomSlabY}
                  width={pxScourThick}
                  height={pxScourD}
                  fill={fillRCC}
                  stroke={strokeColor}
                  strokeWidth="2"
                />
                {/* PCC Base under Scour Wall */}
                <rect
                  x={(hasDsApron ? dsApronEndX : barrelRightX) - 8}
                  y={bottomSlabY + pxScourD}
                  width={pxScourThick + 16}
                  height={pxPccT}
                  fill={fillPcc}
                  stroke={strokeColor}
                  strokeWidth="1.5"
                />
                {/* Scour Wall Badge Callout */}
                <g transform={`translate(${hasDsApron ? dsApronEndX + pxScourThick + 10 : barrelRightX + pxScourThick + 10}, ${bottomSlabY + pxScourD / 2})`}>
                  <rect x="-5" y="-12" width="105" height="24" rx="4" fill="#1e3a8a" fillOpacity="0.9" stroke="#60a5fa" strokeWidth="1" />
                  <text x="48" y="4" fill="#dbeafe" fontSize="8.5" fontWeight="900" textAnchor="middle">
                    D/S Scour Wall D={scourDepth}m
                  </text>
                </g>
              </g>
            ) : (
              <text x={barrelRightX + 50} y={bottomSlabY + 45} fill="#94a3b8" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                (No D/S Scour Wall)
              </text>
            )}

            {/* DIMENSIONS FOR LONGITUDINAL SECTION */}
            {showDimensions && (
              <g id="longitudinal-dimensions">
                {/* Barrel Length */}
                <DimensionLine
                  x1={barrelLeftX}
                  y1={bottomSlabY}
                  x2={barrelRightX}
                  y2={bottomSlabY}
                  label="Barrel Length (Lb)"
                  value={barrelL}
                  offset={50}
                  lineColor={dimColor}
                  textColor={dimColor}
                  paramName="Barrel Length"
                  onEditValue={(v) => onUpdateParam('barrelLength', v)}
                />

                {/* Upstream Apron Length (if present) */}
                {hasUsApron && (
                  <DimensionLine
                    x1={usApronStartX}
                    y1={bottomSlabY}
                    x2={barrelLeftX}
                    y2={bottomSlabY}
                    label="U/S Apron"
                    value={apronL}
                    offset={25}
                    lineColor="#f59e0b"
                    textColor="#f59e0b"
                    paramName="Apron Length"
                    onEditValue={(v) => onUpdateParam('launchingApronLength', v)}
                  />
                )}

                {/* Downstream Apron Length (if present) */}
                {hasDsApron && (
                  <DimensionLine
                    x1={barrelRightX}
                    y1={bottomSlabY}
                    x2={dsApronEndX}
                    y2={bottomSlabY}
                    label="D/S Apron"
                    value={apronL}
                    offset={25}
                    lineColor="#f59e0b"
                    textColor="#f59e0b"
                    paramName="Apron Length"
                    onEditValue={(v) => onUpdateParam('launchingApronLength', v)}
                  />
                )}

                {/* Scour Depth (if present) */}
                {hasUsScourWall && (
                  <DimensionLine
                    x1={hasUsApron ? usApronStartX - pxScourThick : barrelLeftX - pxScourThick}
                    y1={bottomSlabY}
                    x2={hasUsApron ? usApronStartX - pxScourThick : barrelLeftX - pxScourThick}
                    y2={bottomSlabY + pxScourD}
                    label="Scour Depth"
                    value={scourDepth}
                    offset={-25}
                    orientation="vertical"
                    lineColor="#60a5fa"
                    textColor="#60a5fa"
                    paramName="Scour Wall Depth"
                    onEditValue={(v) => onUpdateParam('scourWallDepth', v)}
                  />
                )}
              </g>
            )}

            <text x={cx} y={topY - 65} fill={themeColors?.titleText || strokeColor} fontSize="14" fontWeight="900" textAnchor="middle">
              2. LONGITUDINAL PROFILE SECTION: BARREL, LAUNCHING APRONS & SCOUR WALLS
            </text>
            <text x={cx} y={bottomSlabY + pxScourD + 35} fill={themeColors?.dimText || '#64748b'} fontSize="10" fontWeight="bold" textAnchor="middle">
              Launching Apron: [{apronOption.toUpperCase()}] • Scour Cutoff Wall: [{scourLocation.toUpperCase()}] D={scourDepth.toFixed(2)}m • Flexible Boulder Pitching
            </text>
          </g>
        );
      })()}

      {/* ========================================================================= */}
      {/* 3. VIEW 3: PLAN VIEW (BED, WATERWAY, WINGWALLS, APRON & SCOUR CUTOFF) */}
      {/* ========================================================================= */}
      {viewMode === 'plan_apron' && (() => {
        const topY = 130;
        const pxBarrelL = barrelL * scale * 0.45;
        const pxW = pxOuterW * 0.65;
        const pxApronL = apronL * scale * 0.45;
        const wingL = 2.50 * scale * 0.45;

        const leftX = cx - pxBarrelL / 2;
        const rightX = cx + pxBarrelL / 2;
        const planTopY = topY + 40;
        const planBotY = planTopY + pxW;

        const usApronStartX = leftX - pxApronL;
        const dsApronEndX = rightX + pxApronL;

        return (
          <g id="box-plan-view-group">
            {/* Flow Indicator Arrow */}
            <g transform={`translate(${cx}, ${topY - 10})`}>
              <line x1="-120" y1="0" x2="120" y2="0" stroke="#0284c7" strokeWidth="2.5" markerEnd="url(#flowArrow)" />
              <polygon points="120,-4 130,0 120,4" fill="#0284c7" />
              <text x="0" y="-8" fill="#38bdf8" fontSize="11" fontWeight="900" textAnchor="middle">
                STREAM DISCHARGE / WATERWAY FLOW ➔
              </text>
            </g>

            {/* Upstream Launching Apron Plan Spread */}
            {hasUsApron && (
              <g id="plan-us-apron">
                <polygon
                  points={`
                    ${leftX},${planTopY - 20}
                    ${usApronStartX},${planTopY - 45}
                    ${usApronStartX},${planBotY + 45}
                    ${leftX},${planBotY + 20}
                  `}
                  fill={fillApron}
                  stroke={strokeColor}
                  strokeWidth="1.5"
                  opacity="0.85"
                />
                <text x={(leftX + usApronStartX) / 2} y={(planTopY + planBotY) / 2} fill="#f59e0b" fontSize="10" fontWeight="900" textAnchor="middle">
                  U/S LAUNCHING APRON
                </text>
              </g>
            )}

            {/* Upstream Scour Wall Cutoff Line */}
            {hasUsScourWall && (
              <line
                x1={hasUsApron ? usApronStartX : leftX}
                y1={planTopY - (hasUsApron ? 45 : 20)}
                x2={hasUsApron ? usApronStartX : leftX}
                y2={planBotY + (hasUsApron ? 45 : 20)}
                stroke="#60a5fa"
                strokeWidth="4"
                strokeDasharray="6 3"
              />
            )}

            {/* Downstream Launching Apron Plan Spread */}
            {hasDsApron && (
              <g id="plan-ds-apron">
                <polygon
                  points={`
                    ${rightX},${planTopY - 20}
                    ${dsApronEndX},${planTopY - 45}
                    ${dsApronEndX},${planBotY + 45}
                    ${rightX},${planBotY + 20}
                  `}
                  fill={fillApron}
                  stroke={strokeColor}
                  strokeWidth="1.5"
                  opacity="0.85"
                />
                <text x={(rightX + dsApronEndX) / 2} y={(planTopY + planBotY) / 2} fill="#f59e0b" fontSize="10" fontWeight="900" textAnchor="middle">
                  D/S LAUNCHING APRON
                </text>
              </g>
            )}

            {/* Downstream Scour Wall Cutoff Line */}
            {hasDsScourWall && (
              <line
                x1={hasDsApron ? dsApronEndX : rightX}
                y1={planTopY - (hasDsApron ? 45 : 20)}
                x2={hasDsApron ? dsApronEndX : rightX}
                y2={planBotY + (hasDsApron ? 45 : 20)}
                stroke="#60a5fa"
                strokeWidth="4"
                strokeDasharray="6 3"
              />
            )}

            {/* Main Box Barrel Road Deck / Top Plan */}
            <rect x={leftX} y={planTopY} width={pxBarrelL} height={pxW} fill={fillRCC} stroke={strokeColor} strokeWidth="2.5" />

            {/* Carriageway Centerline */}
            <line x1={cx} y1={planTopY - 10} x2={cx} y2={planBotY + 10} stroke="#ef4444" strokeWidth="2" strokeDasharray="6 3" />
            <text x={cx} y={planTopY - 15} fill="#ef4444" fontSize="9.5" fontWeight="bold" textAnchor="middle">
              CL Roadway Centerline
            </text>

            {/* Barrel Opening Hidden Linework */}
            <line x1={leftX} y1={planTopY + pxWallT * 0.65} x2={rightX} y2={planTopY + pxWallT * 0.65} stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 2" />
            <line x1={leftX} y1={planBotY - pxWallT * 0.65} x2={rightX} y2={planBotY - pxWallT * 0.65} stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 2" />

            {isTwin && (
              <>
                <line x1={leftX} y1={(planTopY + planBotY) / 2 - 8} x2={rightX} y2={(planTopY + planBotY) / 2 - 8} stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 2" />
                <line x1={leftX} y1={(planTopY + planBotY) / 2 + 8} x2={rightX} y2={(planTopY + planBotY) / 2 + 8} stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 2" />
              </>
            )}

            {/* Flared Wing Walls (4 Corners @ 45°) */}
            {/* Top-Left Wing */}
            <line x1={leftX} y1={planTopY} x2={leftX - wingL} y2={planTopY - wingL} stroke={strokeColor} strokeWidth="3" />
            {/* Bottom-Left Wing */}
            <line x1={leftX} y1={planBotY} x2={leftX - wingL} y2={planBotY + wingL} stroke={strokeColor} strokeWidth="3" />
            {/* Top-Right Wing */}
            <line x1={rightX} y1={planTopY} x2={rightX + wingL} y2={planTopY - wingL} stroke={strokeColor} strokeWidth="3" />
            {/* Bottom-Right Wing */}
            <line x1={rightX} y1={planBotY} x2={rightX + wingL} y2={planBotY + wingL} stroke={strokeColor} strokeWidth="3" />

            {/* DIMENSIONS */}
            {showDimensions && (
              <g id="plan-dimensions">
                <DimensionLine
                  x1={leftX}
                  y1={planBotY}
                  x2={rightX}
                  y2={planBotY}
                  label="Barrel Length (Lb)"
                  value={barrelL}
                  offset={65}
                  lineColor={dimColor}
                  textColor={dimColor}
                  paramName="Barrel Length"
                  onEditValue={(v) => onUpdateParam('barrelLength', v)}
                />

                <DimensionLine
                  x1={rightX}
                  y1={planTopY}
                  x2={rightX}
                  y2={planBotY}
                  label="Total Width"
                  value={totalOuterWidth}
                  offset={40}
                  orientation="vertical"
                  lineColor={dimColor}
                  textColor={dimColor}
                  paramName="Outer Width"
                />
              </g>
            )}

            <text x={cx} y={topY - 25} fill={themeColors?.titleText || strokeColor} fontSize="14" fontWeight="900" textAnchor="middle">
              3. GENERAL PLAN LAYOUT: BARREL, WING WALLS, APRON & SCOUR PROTECTION
            </text>
            <text x={cx} y={planBotY + 80} fill={themeColors?.dimText || '#64748b'} fontSize="10" fontWeight="bold" textAnchor="middle">
              Upstream & Downstream Flared Wings • Apron Perimeter Pitching • Scour Wall Cutoff Key
            </text>
          </g>
        );
      })()}

      {/* ========================================================================= */}
      {/* 4. VIEW 4: STRUCTURAL REBAR & CORNER FILLET ANATOMY (BBS DETAIL) */}
      {/* ========================================================================= */}
      {viewMode === 'rebar_detail' && (() => {
        const topY = 120;
        const cornerX = cx - 160;
        const cornerY = topY + 60;
        const dScale = 220; // Zoomed in scale for corner rebar

        const pxCornerW = (wallT + 0.6) * dScale;
        const pxCornerH = (topSlabT + 0.6) * dScale;
        const pxDfillet = filletSize * dScale;

        return (
          <g id="rebar-fillet-anatomy-group">
            <text x={cx} y={topY - 10} fill={themeColors?.titleText || strokeColor} fontSize="14" fontWeight="900" textAnchor="middle">
              4. STRUCTURAL REBAR & CORNER FILLET ANATOMY (IS:456 / IRC:112 SPECIFICATION)
            </text>

            {/* Left Side: Zoomed-in Corner Joint Fillet Rebar Detail */}
            <g transform={`translate(${cx - 180}, ${topY + 30})`}>
              {/* Outer Concrete Wall & Top Slab Joint */}
              <path
                d={`
                  M 0 0
                  L 240 0
                  L 240 60
                  L ${hasFillet ? 120 + pxDfillet * 0.5 : 120} 60
                  ${hasFillet && pxDfillet > 0 ? `L 120 ${60 + pxDfillet * 0.5}` : ''}
                  L 120 220
                  L 0 220
                  Z
                `}
                fill={fillRCC}
                stroke={strokeColor}
                strokeWidth="2.5"
              />

              {/* Outer Tension Rebar (Top Slab Outer Face) */}
              <line x1="15" y1="15" x2="225" y2="15" stroke={rebarColor} strokeWidth="3" />
              <line x1="15" y1="15" x2="15" y2="205" stroke={rebarColor} strokeWidth="3" />

              {/* Inner Tension Rebar */}
              <line x1="105" y1="45" x2="225" y2="45" stroke={rebarColor} strokeWidth="2.5" strokeDasharray="6 3" />
              <line x1="105" y1="45" x2="105" y2="205" stroke={rebarColor} strokeWidth="2.5" strokeDasharray="6 3" />

              {/* 45° Corner Fillet Diagonal Rebar Tie (if enabled) */}
              {hasFillet && hasFilletBar && pxDfillet > 0 ? (
                <g>
                  {/* Diagonal Main Bar */}
                  <line
                    x1="90"
                    y1={60 + pxDfillet * 0.5 + 40}
                    x2={120 + pxDfillet * 0.5 + 40}
                    y2="30"
                    stroke={filletRebarColor}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  {/* Anchor Hook into Wall */}
                  <line
                    x1="90"
                    y1={60 + pxDfillet * 0.5 + 40}
                    x2="90"
                    y2={60 + pxDfillet * 0.5 + 75}
                    stroke={filletRebarColor}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  {/* Anchor Hook into Top Slab */}
                  <line
                    x1={120 + pxDfillet * 0.5 + 40}
                    y1="30"
                    x2={120 + pxDfillet * 0.5 + 75}
                    y2="30"
                    stroke={filletRebarColor}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  <circle cx="90" cy="80" r="3.5" fill="#f43f5e" />
                  <circle cx="140" cy="30" r="3.5" fill="#f43f5e" />

                  {/* Callout Pointer */}
                  <line x1="140" y1="70" x2="200" y2="120" stroke="#f472b6" strokeWidth="1.5" strokeDasharray="3 2" />
                  <rect x="140" y="120" width="160" height="42" rx="6" fill="#831843" fillOpacity="0.9" stroke="#f472b6" strokeWidth="1.5" />
                  <text x="220" y="136" fill="#fce7f3" fontSize="9.5" fontWeight="900" textAnchor="middle">
                    Corner Fillet Bar: Ø{filletBarDia} @ {filletBarSpacing}mm
                  </text>
                  <text x="220" y="152" fill="#fbcfe8" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                    45° Diagonal Tie (Ld Anchorage)
                  </text>
                </g>
              ) : (
                <g transform="translate(140, 110)">
                  <rect x="0" y="0" width="150" height="35" rx="6" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                  <text x="75" y="18" fill="#e2e8f0" fontSize="9" fontWeight="bold" textAnchor="middle">
                    {hasFillet ? 'Fillet Active (Without Rebar)' : 'Square Joint (No Fillet Bar)'}
                  </text>
                  <text x="75" y="28" fill="#94a3b8" fontSize="7.5" textAnchor="middle">
                    Toggle enabled in sidebar
                  </text>
                </g>
              )}

              {/* Distribution Dots in Fillet Zone */}
              <circle cx="50" cy="15" r="3" fill={rebarColor} />
              <circle cx="90" cy="15" r="3" fill={rebarColor} />
              <circle cx="130" cy="15" r="3" fill={rebarColor} />
              <circle cx="170" cy="15" r="3" fill={rebarColor} />
              <circle cx="15" cy="50" r="3" fill={rebarColor} />
              <circle cx="15" cy="90" r="3" fill={rebarColor} />
              <circle cx="15" cy="130" r="3" fill={rebarColor} />
              <circle cx="15" cy="170" r="3" fill={rebarColor} />

              <text x="120" y="240" fill={themeColors?.titleText || strokeColor} fontSize="11" fontWeight="extrabold" textAnchor="middle">
                Enlarged Internal Corner Joint Detail
              </text>
            </g>

            {/* Right Side: Rebar Schedule & Parameters Summary Card */}
            <g transform={`translate(${cx + 140}, ${topY + 30})`}>
              <rect x="0" y="0" width="220" height="230" rx="10" fill={isCad ? '#1e293b' : '#f8fafc'} stroke={strokeColor} strokeWidth="1.5" />
              <rect x="0" y="0" width="220" height="28" rx="10" fill={isCad ? '#334155' : '#e2e8f0'} />
              <text x="110" y="18" fill={themeColors?.titleText || strokeColor} fontSize="10.5" fontWeight="900" textAnchor="middle">
                BAR BENDING SCHEDULE ANATOMY
              </text>

              <g className="text-[10px]" transform="translate(12, 45)">
                {/* 1. Main Tension Rebar */}
                <text x="0" y="0" fill={rebarColor} fontWeight="bold" fontSize="9.5">
                  1. Transverse Bottom & Top Slab:
                </text>
                <text x="8" y="14" fill={themeColors?.dimText || '#64748b'} fontSize="8.5">
                  Ø16 @ 125mm c/c (Shape 21 U-Trough)
                </text>

                {/* 2. Wall Vertical Rebar */}
                <text x="0" y="36" fill={rebarColor} fontWeight="bold" fontSize="9.5">
                  2. Side Walls Vertical Steel:
                </text>
                <text x="8" y="50" fill={themeColors?.dimText || '#64748b'} fontSize="8.5">
                  Ø12 @ 150mm c/c (2 Walls × 2 Faces)
                </text>

                {/* 3. Corner Fillet Bar */}
                <text x="0" y="72" fill={filletRebarColor} fontWeight="bold" fontSize="9.5">
                  3. Corner Fillet Haunch Ties:
                </text>
                <text x="8" y="86" fill={hasFillet && hasFilletBar ? '#ec4899' : '#94a3b8'} fontSize="8.5" fontWeight={hasFillet && hasFilletBar ? 'bold' : 'normal'}>
                  {hasFillet && hasFilletBar ? `Ø${filletBarDia} @ ${filletBarSpacing}mm (${isTwin ? '8 Corners' : '4 Corners'})` : 'Omitted / No Fillet Bar'}
                </text>

                {/* 4. Distribution Steel */}
                <text x="0" y="108" fill="#38bdf8" fontWeight="bold" fontSize="9.5">
                  4. Longitudinal Distribution Steel:
                </text>
                <text x="8" y="122" fill={themeColors?.dimText || '#64748b'} fontSize="8.5">
                  Ø10 @ 200mm c/c Continuous
                </text>

                {/* 5. Clear Cover */}
                <text x="0" y="144" fill="#a855f7" fontWeight="bold" fontSize="9.5">
                  5. Concrete Nominal Cover:
                </text>
                <text x="8" y="158" fill={themeColors?.dimText || '#64748b'} fontSize="8.5">
                  40mm in Earth/Water face, 30mm internal
                </text>
              </g>
            </g>
          </g>
        );
      })()}
    </g>
  );
};
