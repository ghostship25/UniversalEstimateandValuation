import React from 'react';
import { DimensionLine } from './DimensionLine';
import { CulvertParameters } from './types';
import { Layers, Eye, Shield, Compass, Ruler } from 'lucide-react';

interface SlabCulvertDrawingProps {
  params: CulvertParameters;
  onUpdateParam: (key: keyof CulvertParameters, value: any) => void;
  showDimensions: boolean;
  showHatching: boolean;
  canvasTheme?: 'cad' | 'paper' | 'blueprint';
  themeColors?: any;
  viewMode?: 'cross_section' | 'longitudinal' | 'plan_wingwalls';
  onSelectViewMode?: (mode: 'cross_section' | 'longitudinal' | 'plan_wingwalls') => void;
}

export const SlabCulvertDrawing: React.FC<SlabCulvertDrawingProps> = ({
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
  const waterColor = isCad ? '#0284c7' : isBlueprint ? '#38bdf8' : '#0ea5e9';
  const fillAsphalt = isCad ? '#1e293b' : isBlueprint ? '#0f172a' : '#334155';
  const fillRailing = isCad ? '#94a3b8' : isBlueprint ? '#cbd5e1' : '#475569';

  // Fill Patterns
  const fillRCC = showHatching ? 'url(#concreteHatch)' : isCad ? '#334155' : isBlueprint ? '#1e3a8a' : '#cbd5e1';
  const fillStone = showHatching ? 'url(#stoneHatch)' : isCad ? '#475569' : isBlueprint ? '#1e3a8a' : '#cbd5e1';
  const fillPcc = showHatching ? 'url(#concreteHatch)' : isCad ? '#475569' : isBlueprint ? '#2563eb' : '#e2e8f0';
  const fillSoling = showHatching ? 'url(#solingHatch)' : isCad ? '#78350f' : isBlueprint ? '#3b82f6' : '#fef3c7';
  const fillEarth = showHatching ? 'url(#earthHatch)' : isCad ? '#1e293b' : isBlueprint ? '#172554' : '#f1f5f9';

  // Core Geometry & Dimensions with Defaults
  const span = params.clearSpan || 3.00;              // S [m]
  const clearH = params.clearHeight || 2.20;          // H [m]
  const slabT = params.topSlabThickness || 0.35;      // Ts [m]
  const abutTopW = params.abutmentTopWidth || 0.70;   // Tw_top [m]
  const abutBotW = params.abutmentBottomWidth || 1.20;// Tw_bot [m]
  const abutH = params.abutmentHeight || clearH;      // Habut [m]
  const barrelL = params.barrelLength || 7.50;        // Lb [m]
  const wearingT = params.wearingCoatThickness || 0.05;

  // L-Cap Geometry
  const hasLCap = params.hasLCap ?? true;
  const lCapT = params.lCapThickness || 0.20;         // Bed-block seat thickness
  const lCapW = params.lCapWidth || abutTopW;         // Total bed-block width
  const lCapDirtH = params.lCapDirtWallHeight || (slabT + wearingT); // Upstand dirt wall height
  const lCapDirtW = params.lCapDirtWallThickness || 0.22;            // Dirt wall thickness
  const bearingSeatL = params.bearingLength || 0.35;  // Bearing seat width

  // Wing Wall Geometry
  const hasWingWalls = params.hasWingWalls ?? true;
  const wingL = params.wingWallLength || 3.50;
  const wingTopW = params.wingWallTopWidth || 0.50;
  const wingBotW = params.wingWallBottomWidth || 1.00;
  const wingStartH = params.wingWallStartHeight || (abutH + lCapT + lCapDirtH);
  const wingEndH = params.wingWallEndHeight || 0.90;
  const copingT = params.wingWallCopingThickness || 0.075;

  // Foundation Geometry
  const pccT = params.foundationPccThickness || 0.15;
  const pccOffset = params.foundationPccOffset || 0.15;
  const solingT = params.foundationSolingThickness || 0.15;
  const solingOffset = 0.075;
  const apronT = params.apronThickness || 0.15;
  const curtainH = params.curtainWallDepth || 0.80;
  const waterLvl = Math.min(clearH - 0.2, params.waterLevel || 0.80);

  // SVG Drawing Canvas Scale & Coordinates
  const cx = 390;
  const topY = 170;
  const scale = 72; // px per meter

  const pxSpan = span * scale;
  const pxClearH = clearH * scale;
  const pxSlabT = slabT * scale;
  const pxWearingT = wearingT * scale;
  const pxAbutTopW = abutTopW * scale;
  const pxAbutBotW = abutBotW * scale;
  const pxAbutH = abutH * scale;
  const pxLCapT = lCapT * scale;
  const pxLCapDirtH = lCapDirtH * scale;
  const pxLCapDirtW = lCapDirtW * scale;
  const pxPccT = pccT * scale;
  const pxPccOffset = pccOffset * scale;
  const pxSolingT = solingT * scale;
  const pxSolingOffset = (pccOffset + solingOffset) * scale;
  const pxApronT = apronT * scale;
  const pxCurtainH = curtainH * scale;
  const pxWaterLvl = waterLvl * scale;

  // Coordinates
  const deckLeftX = cx - pxSpan / 2 - (hasLCap ? bearingSeatL * scale : pxAbutTopW);
  const deckRightX = cx + pxSpan / 2 + (hasLCap ? bearingSeatL * scale : pxAbutTopW);
  const deckWidth = deckRightX - deckLeftX;
  const deckTopY = topY;
  const deckBotY = deckTopY + pxSlabT;

  const leftAbutInnerX = cx - pxSpan / 2;
  const leftAbutTopOuterX = leftAbutInnerX - pxAbutTopW;
  const leftAbutBotOuterX = leftAbutInnerX - pxAbutBotW;

  const rightAbutInnerX = cx + pxSpan / 2;
  const rightAbutTopOuterX = rightAbutInnerX + pxAbutTopW;
  const rightAbutBotOuterX = rightAbutInnerX + pxAbutBotW;

  const abutTopY = deckBotY + (hasLCap ? pxLCapT : 0);
  const abutBotY = abutTopY + pxAbutH;

  const bedLevelY = abutBotY;
  const pccBotY = bedLevelY + pxPccT;
  const solingBotY = pccBotY + pxSolingT;

  return (
    <g id="slab-culvert-assembly" className="transition-all duration-300">
      {/* ========================================================================= */}
      {/* 1. CROSS-SECTION VIEW: WATERWAY ELEVATION WITH ABUTMENTS, L-CAP & DECK SLAB */}
      {/* ========================================================================= */}
      {viewMode === 'cross_section' && (
        <g id="culvert-cross-section-view">
          {/* Natural Ground / Embankment Soil on Sides */}
          <polygon
            points={`
              ${leftAbutBotOuterX - 120},${bedLevelY}
              ${leftAbutTopOuterX - 60},${deckTopY - 20}
              ${leftAbutTopOuterX},${deckTopY + pxSlabT}
              ${leftAbutBotOuterX},${bedLevelY}
            `}
            fill={fillEarth}
            stroke={strokeColor}
            strokeWidth="1"
            strokeDasharray="4 2"
            opacity="0.75"
          />
          <polygon
            points={`
              ${rightAbutBotOuterX + 120},${bedLevelY}
              ${rightAbutTopOuterX + 60},${deckTopY - 20}
              ${rightAbutTopOuterX},${deckTopY + pxSlabT}
              ${rightAbutBotOuterX},${bedLevelY}
            `}
            fill={fillEarth}
            stroke={strokeColor}
            strokeWidth="1"
            strokeDasharray="4 2"
            opacity="0.75"
          />

          {/* FOUNDATION: Flat Stone Soling under Abutments */}
          <rect
            x={leftAbutBotOuterX - pxSolingOffset}
            y={pccBotY}
            width={pxAbutBotW + pxSolingOffset + pxPccOffset}
            height={pxSolingT}
            fill={fillSoling}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
          <rect
            x={rightAbutInnerX - pxPccOffset}
            y={pccBotY}
            width={pxAbutBotW + pxSolingOffset + pxPccOffset}
            height={pxSolingT}
            fill={fillSoling}
            stroke={strokeColor}
            strokeWidth="1.5"
          />

          {/* FOUNDATION: Bed PCC Leveling (1:3:6 / M10) */}
          <rect
            x={leftAbutBotOuterX - pxPccOffset}
            y={bedLevelY}
            width={pxAbutBotW + 2 * pxPccOffset}
            height={pxPccT}
            fill={fillPcc}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
          <rect
            x={rightAbutInnerX - pxPccOffset}
            y={bedLevelY}
            width={pxAbutBotW + 2 * pxPccOffset}
            height={pxPccT}
            fill={fillPcc}
            stroke={strokeColor}
            strokeWidth="1.5"
          />

          {/* INVERT BED APRON: Concrete Pitching / Floor Level */}
          <rect
            x={leftAbutInnerX}
            y={bedLevelY - pxApronT}
            width={pxSpan}
            height={pxApronT}
            fill={fillPcc}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
          {/* Upstream / Downstream Cut-Off Curtain Walls */}
          <rect
            x={leftAbutInnerX + 20}
            y={bedLevelY}
            width={16}
            height={pxCurtainH}
            fill={fillPcc}
            stroke={strokeColor}
            strokeWidth="1.2"
          />
          <rect
            x={rightAbutInnerX - 36}
            y={bedLevelY}
            width={16}
            height={pxCurtainH}
            fill={fillPcc}
            stroke={strokeColor}
            strokeWidth="1.2"
          />

          {/* WATER LEVEL & STREAM FLOW IN WATERWAY */}
          {waterLvl > 0 && (
            <g id="water-level-stream">
              <rect
                x={leftAbutInnerX + 1}
                y={bedLevelY - pxApronT - pxWaterLvl}
                width={pxSpan - 2}
                height={pxWaterLvl}
                fill={waterColor}
                opacity="0.30"
              />
              <line
                x1={leftAbutInnerX}
                y1={bedLevelY - pxApronT - pxWaterLvl}
                x2={rightAbutInnerX}
                y2={bedLevelY - pxApronT - pxWaterLvl}
                stroke={waterColor}
                strokeWidth="2"
                strokeDasharray="6 3"
              />
              <text
                x={cx}
                y={bedLevelY - pxApronT - pxWaterLvl - 6}
                fill={waterColor}
                fontSize="10"
                fontWeight="900"
                textAnchor="middle"
                className="font-mono"
              >
                ▼ HFL / Design Water Level ({waterLvl.toFixed(2)}m)
              </text>
            </g>
          )}

          {/* MASONRY ABUTMENTS (Stone / Plum Masonry with Stepped / Battered Back) */}
          {/* Left Masonry Abutment */}
          <polygon
            points={`
              ${leftAbutInnerX},${abutTopY}
              ${leftAbutTopOuterX},${abutTopY}
              ${leftAbutBotOuterX},${bedLevelY}
              ${leftAbutInnerX},${bedLevelY}
            `}
            fill={fillStone}
            stroke={strokeColor}
            strokeWidth="2.2"
          />
          {/* Left Masonry Step Footing Profile (if stepped) */}
          <line
            x1={leftAbutTopOuterX}
            y1={abutTopY + pxAbutH * 0.4}
            x2={leftAbutTopOuterX - 12}
            y2={abutTopY + pxAbutH * 0.4}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
          <line
            x1={leftAbutTopOuterX - 12}
            y1={abutTopY + pxAbutH * 0.4}
            x2={leftAbutTopOuterX - 12}
            y2={abutTopY + pxAbutH * 0.7}
            stroke={strokeColor}
            strokeWidth="1.5"
          />

          {/* Right Masonry Abutment */}
          <polygon
            points={`
              ${rightAbutInnerX},${abutTopY}
              ${rightAbutTopOuterX},${abutTopY}
              ${rightAbutBotOuterX},${bedLevelY}
              ${rightAbutInnerX},${bedLevelY}
            `}
            fill={fillStone}
            stroke={strokeColor}
            strokeWidth="2.2"
          />
          <line
            x1={rightAbutTopOuterX}
            y1={abutTopY + pxAbutH * 0.4}
            x2={rightAbutTopOuterX + 12}
            y2={abutTopY + pxAbutH * 0.4}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
          <line
            x1={rightAbutTopOuterX + 12}
            y1={abutTopY + pxAbutH * 0.4}
            x2={rightAbutTopOuterX + 12}
            y2={abutTopY + pxAbutH * 0.7}
            stroke={strokeColor}
            strokeWidth="1.5"
          />

          {/* PVC WEEP HOLES IN ABUTMENTS (Staggered 75-100mm dia with gravel filter) */}
          <g id="weep-holes" fill="#0284c7" stroke={strokeColor} strokeWidth="1">
            <circle cx={leftAbutInnerX - pxAbutTopW * 0.4} cy={bedLevelY - pxAbutH * 0.3} r="4" />
            <circle cx={leftAbutInnerX - pxAbutTopW * 0.7} cy={bedLevelY - pxAbutH * 0.6} r="4" />
            <circle cx={rightAbutInnerX + pxAbutTopW * 0.4} cy={bedLevelY - pxAbutH * 0.3} r="4" />
            <circle cx={rightAbutInnerX + pxAbutTopW * 0.7} cy={bedLevelY - pxAbutH * 0.6} r="4" />
          </g>

          {/* ===================================================================== */}
          {/* L-CAP (BED-BLOCK / BEARING CAP WITH DIRT BALLAST WALL)                */}
          {/* ===================================================================== */}
          {hasLCap && (
            <g id="l-cap-bed-blocks">
              {/* Left L-Cap: Base Bearing Seat + Upstand Dirt Wall forming L */}
              {/* Base Bed-Block Pad */}
              <polygon
                points={`
                  ${leftAbutInnerX},${deckBotY}
                  ${leftAbutTopOuterX},${deckBotY}
                  ${leftAbutTopOuterX},${abutTopY}
                  ${leftAbutInnerX},${abutTopY}
                `}
                fill={fillRCC}
                stroke={strokeColor}
                strokeWidth="2"
              />
              {/* Left Upstand Dirt Wall (forms the back leg of the L-Cap) */}
              <polygon
                points={`
                  ${leftAbutTopOuterX},${deckTopY - pxWearingT}
                  ${leftAbutTopOuterX + pxLCapDirtW},${deckTopY - pxWearingT}
                  ${leftAbutTopOuterX + pxLCapDirtW},${deckBotY}
                  ${leftAbutTopOuterX},${deckBotY}
                `}
                fill={fillRCC}
                stroke={strokeColor}
                strokeWidth="2"
              />
              {/* Left Bearing Pad (Elastomeric / Mortar Pad under Deck Slab) */}
              <rect
                x={leftAbutInnerX - bearingSeatL * scale + 4}
                y={deckBotY - 4}
                width={bearingSeatL * scale - 8}
                height={5}
                fill="#f59e0b"
                stroke="#b45309"
                strokeWidth="1"
              />
              {/* Expansion Joint Gap between Dirt Wall and Deck Slab */}
              <line
                x1={leftAbutTopOuterX + pxLCapDirtW + 2}
                y1={deckTopY - pxWearingT}
                x2={leftAbutTopOuterX + pxLCapDirtW + 2}
                y2={deckBotY}
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="2 2"
              />

              {/* Right L-Cap: Base Bearing Seat + Upstand Dirt Wall forming L */}
              {/* Base Bed-Block Pad */}
              <polygon
                points={`
                  ${rightAbutInnerX},${deckBotY}
                  ${rightAbutTopOuterX},${deckBotY}
                  ${rightAbutTopOuterX},${abutTopY}
                  ${rightAbutInnerX},${abutTopY}
                `}
                fill={fillRCC}
                stroke={strokeColor}
                strokeWidth="2"
              />
              {/* Right Upstand Dirt Wall */}
              <polygon
                points={`
                  ${rightAbutTopOuterX - pxLCapDirtW},${deckTopY - pxWearingT}
                  ${rightAbutTopOuterX},${deckTopY - pxWearingT}
                  ${rightAbutTopOuterX},${deckBotY}
                  ${rightAbutTopOuterX - pxLCapDirtW},${deckBotY}
                `}
                fill={fillRCC}
                stroke={strokeColor}
                strokeWidth="2"
              />
              {/* Right Bearing Pad */}
              <rect
                x={rightAbutInnerX + 4}
                y={deckBotY - 4}
                width={bearingSeatL * scale - 8}
                height={5}
                fill="#f59e0b"
                stroke="#b45309"
                strokeWidth="1"
              />
              {/* Right Expansion Joint Gap */}
              <line
                x1={rightAbutTopOuterX - pxLCapDirtW - 2}
                y1={deckTopY - pxWearingT}
                x2={rightAbutTopOuterX - pxLCapDirtW - 2}
                y2={deckBotY}
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="2 2"
              />

              {/* L-Cap Badge / Callout */}
              <text
                x={leftAbutTopOuterX + 8}
                y={abutTopY - 6}
                fill={themeColors?.titleText || '#6366f1'}
                fontSize="9"
                fontWeight="900"
                className="font-mono"
              >
                RCC L-CAP (M20)
              </text>
              <text
                x={rightAbutTopOuterX - 8}
                y={abutTopY - 6}
                fill={themeColors?.titleText || '#6366f1'}
                fontSize="9"
                fontWeight="900"
                textAnchor="end"
                className="font-mono"
              >
                RCC L-CAP (M20)
              </text>
            </g>
          )}

          {/* ===================================================================== */}
          {/* RCC DECK SLAB ON TOP WITH WEARING COAT, REBAR & KERBS                 */}
          {/* ===================================================================== */}
          <g id="rcc-deck-slab-on-top">
            {/* Structural RCC Deck Slab Body */}
            <rect
              x={deckLeftX}
              y={deckTopY}
              width={deckWidth}
              height={pxSlabT}
              fill={fillRCC}
              stroke={strokeColor}
              strokeWidth="2.5"
            />

            {/* Asphalt / Concrete Wearing Surface Coat */}
            <rect
              x={deckLeftX}
              y={deckTopY - pxWearingT}
              width={deckWidth}
              height={pxWearingT}
              fill={fillAsphalt}
              stroke={strokeColor}
              strokeWidth="1.2"
            />

            {/* Internal Steel Reinforcement Indication */}
            {/* Bottom Main Tension Rebar Dots */}
            {Array.from({ length: Math.round(span * 6) + 4 }).map((_, i) => {
              const rx = deckLeftX + 12 + i * ((deckWidth - 24) / (Math.round(span * 6) + 3));
              return (
                <circle
                  key={`bot-bar-${i}`}
                  cx={rx}
                  cy={deckBotY - 8}
                  r="2.5"
                  fill={rebarColor}
                />
              );
            })}
            {/* Bottom Main Distribution Bar Line */}
            <line
              x1={deckLeftX + 8}
              y1={deckBotY - 6}
              x2={deckRightX - 8}
              y2={deckBotY - 6}
              stroke={rebarColor}
              strokeWidth="2"
            />

            {/* Top Rebar Line */}
            <line
              x1={deckLeftX + 8}
              y1={deckTopY + 8}
              x2={deckRightX - 8}
              y2={deckTopY + 8}
              stroke={rebarColor}
              strokeWidth="1.8"
            />

            {/* RCC Crash Barrier / Kerb Left & Right */}
            {/* Left Kerb */}
            <polygon
              points={`
                ${deckLeftX},${deckTopY - pxWearingT - 22}
                ${deckLeftX + 22},${deckTopY - pxWearingT - 22}
                ${deckLeftX + 22},${deckTopY - pxWearingT}
                ${deckLeftX},${deckTopY - pxWearingT}
              `}
              fill={fillRCC}
              stroke={strokeColor}
              strokeWidth="1.8"
            />
            {/* Left Handrail / Safety Post */}
            <line
              x1={deckLeftX + 10}
              y1={deckTopY - pxWearingT - 22}
              x2={deckLeftX + 10}
              y2={deckTopY - pxWearingT - 55}
              stroke={fillRailing}
              strokeWidth="4"
            />
            <circle cx={deckLeftX + 10} cy={deckTopY - pxWearingT - 55} r="4" fill={fillRailing} />

            {/* Right Kerb */}
            <polygon
              points={`
                ${deckRightX - 22},${deckTopY - pxWearingT - 22}
                ${deckRightX},${deckTopY - pxWearingT - 22}
                ${deckRightX},${deckTopY - pxWearingT}
                ${deckRightX - 22},${deckTopY - pxWearingT}
              `}
              fill={fillRCC}
              stroke={strokeColor}
              strokeWidth="1.8"
            />
            {/* Right Handrail / Safety Post */}
            <line
              x1={deckRightX - 10}
              y1={deckTopY - pxWearingT - 22}
              x2={deckRightX - 10}
              y2={deckTopY - pxWearingT - 55}
              stroke={fillRailing}
              strokeWidth="4"
            />
            <circle cx={deckRightX - 10} cy={deckTopY - pxWearingT - 55} r="4" fill={fillRailing} />
          </g>

          {/* ===================================================================== */}
          {/* MASONRY WING WALL ELEVATION PROFILES (FLARED WING WALLS)              */}
          {/* ===================================================================== */}
          {hasWingWalls && (
            <g id="masonry-wing-walls-elevation">
              {/* Left Wing Wall Profile Splaying Outward */}
              <polygon
                points={`
                  ${leftAbutTopOuterX - 10},${deckTopY}
                  ${leftAbutTopOuterX - 90},${abutBotY - wingEndH * scale * 0.3}
                  ${leftAbutBotOuterX - 90},${bedLevelY}
                  ${leftAbutBotOuterX},${bedLevelY}
                  ${leftAbutTopOuterX},${abutTopY}
                `}
                fill={fillStone}
                stroke={strokeColor}
                strokeWidth="1.5"
                strokeDasharray="5 3"
                opacity="0.85"
              />
              {/* Left Wing Wall Top PCC Coping Band */}
              <polygon
                points={`
                  ${leftAbutTopOuterX - 10},${deckTopY - copingT * scale}
                  ${leftAbutTopOuterX - 90},${abutBotY - wingEndH * scale * 0.3 - copingT * scale}
                  ${leftAbutTopOuterX - 90},${abutBotY - wingEndH * scale * 0.3}
                  ${leftAbutTopOuterX - 10},${deckTopY}
                `}
                fill={fillPcc}
                stroke={strokeColor}
                strokeWidth="1.2"
              />

              {/* Right Wing Wall Profile Splaying Outward */}
              <polygon
                points={`
                  ${rightAbutTopOuterX + 10},${deckTopY}
                  ${rightAbutTopOuterX + 90},${abutBotY - wingEndH * scale * 0.3}
                  ${rightAbutBotOuterX + 90},${bedLevelY}
                  ${rightAbutBotOuterX},${bedLevelY}
                  ${rightAbutTopOuterX},${abutTopY}
                `}
                fill={fillStone}
                stroke={strokeColor}
                strokeWidth="1.5"
                strokeDasharray="5 3"
                opacity="0.85"
              />
              {/* Right Wing Wall Top PCC Coping */}
              <polygon
                points={`
                  ${rightAbutTopOuterX + 10},${deckTopY - copingT * scale}
                  ${rightAbutTopOuterX + 90},${abutBotY - wingEndH * scale * 0.3 - copingT * scale}
                  ${rightAbutTopOuterX + 90},${abutBotY - wingEndH * scale * 0.3}
                  ${rightAbutTopOuterX + 10},${deckTopY}
                `}
                fill={fillPcc}
                stroke={strokeColor}
                strokeWidth="1.2"
              />

              {/* Wing Wall Callout */}
              <text
                x={leftAbutTopOuterX - 50}
                y={abutBotY - wingEndH * scale * 0.4}
                fill={themeColors?.titleText || '#475569'}
                fontSize="9"
                fontWeight="800"
                textAnchor="middle"
                className="font-mono"
              >
                FLARED WING WALL
              </text>
              <text
                x={rightAbutTopOuterX + 50}
                y={abutBotY - wingEndH * scale * 0.4}
                fill={themeColors?.titleText || '#475569'}
                fontSize="9"
                fontWeight="800"
                textAnchor="middle"
                className="font-mono"
              >
                FLARED WING WALL
              </text>
            </g>
          )}

          {/* MAIN TITLE HEADING */}
          <text
            x={cx}
            y={topY - 45}
            fill={themeColors?.titleText || '#0f172a'}
            fontSize="15"
            fontWeight="900"
            textAnchor="middle"
            letterSpacing="0.5"
          >
            RCC SLAB CULVERT WITH MASONRY ABUTMENTS, L-CAPS & WING WALLS
          </text>
          <text
            x={cx}
            y={topY - 30}
            fill={isCad ? '#94a3b8' : '#64748b'}
            fontSize="10"
            fontWeight="700"
            textAnchor="middle"
            className="font-mono"
          >
            CROSS-SECTION ELEVATION (LOOKING ALONG WATERWAY FLOW)
          </text>

          {/* ===================================================================== */}
          {/* INTERACTIVE CAD DIMENSION LINES                                       */}
          {/* ===================================================================== */}
          {showDimensions && (
            <g id="slab-culvert-dimension-lines">
              {/* 1. Clear Span (S) */}
              <DimensionLine
                x1={leftAbutInnerX}
                y1={deckBotY + pxAbutH * 0.45}
                x2={rightAbutInnerX}
                y2={deckBotY + pxAbutH * 0.45}
                label="Clear Span S"
                value={span}
                offset={0}
                lineColor={dimColor}
                textColor={themeColors?.dimText || dimColor}
                paramName="Clear Span (S)"
                onEditValue={(v) => onUpdateParam('clearSpan', v)}
              />

              {/* 2. Clear Height / Abutment Height (H) */}
              <DimensionLine
                x1={cx}
                y1={deckBotY}
                x2={cx}
                y2={bedLevelY - pxApronT}
                label="Clear Height H"
                value={clearH}
                offset={0}
                lineColor={dimColor}
                textColor={themeColors?.dimText || dimColor}
                paramName="Clear Height (H)"
                onEditValue={(v) => onUpdateParam('clearHeight', v)}
              />

              {/* 3. Top Slab Thickness (Ts) */}
              <DimensionLine
                x1={deckRightX + 25}
                y1={deckTopY}
                x2={deckRightX + 25}
                y2={deckBotY}
                label="Slab Ts"
                value={slabT}
                offset={0}
                lineColor={dimColor}
                textColor={themeColors?.dimText || dimColor}
                paramName="Top Slab Thickness"
                onEditValue={(v) => onUpdateParam('topSlabThickness', v)}
              />

              {/* 4. Left Abutment Top Width */}
              <DimensionLine
                x1={leftAbutTopOuterX}
                y1={abutTopY - 15}
                x2={leftAbutInnerX}
                y2={abutTopY - 15}
                label="Abutment Top W"
                value={abutTopW}
                offset={0}
                lineColor={dimColor}
                textColor={themeColors?.dimText || dimColor}
                paramName="Abutment Top Width"
                onEditValue={(v) => onUpdateParam('abutmentTopWidth', v)}
              />

              {/* 5. Left Abutment Bottom Width */}
              <DimensionLine
                x1={leftAbutBotOuterX}
                y1={bedLevelY + 12}
                x2={leftAbutInnerX}
                y2={bedLevelY + 12}
                label="Abutment Bot W"
                value={abutBotW}
                offset={0}
                lineColor={dimColor}
                textColor={themeColors?.dimText || dimColor}
                paramName="Abutment Bottom Width"
                onEditValue={(v) => onUpdateParam('abutmentBottomWidth', v)}
              />

              {/* 6. Bed PCC Thickness */}
              <DimensionLine
                x1={leftAbutBotOuterX - pxPccOffset - 20}
                y1={bedLevelY}
                x2={leftAbutBotOuterX - pxPccOffset - 20}
                y2={pccBotY}
                label="Bed PCC"
                value={pccT}
                offset={0}
                lineColor={dimColor}
                textColor={themeColors?.dimText || dimColor}
                paramName="PCC Bedding Thickness"
                onEditValue={(v) => onUpdateParam('foundationPccThickness', v)}
              />

              {/* 7. Stone Soling Thickness */}
              <DimensionLine
                x1={leftAbutBotOuterX - pxSolingOffset - 20}
                y1={pccBotY}
                x2={leftAbutBotOuterX - pxSolingOffset - 20}
                y2={solingBotY}
                label="Soling Bed"
                value={solingT}
                offset={0}
                lineColor={dimColor}
                textColor={themeColors?.dimText || dimColor}
                paramName="Stone Soling Thickness"
                onEditValue={(v) => onUpdateParam('foundationSolingThickness', v)}
              />

              {/* 8. Total Overall Culvert Width at Deck Level */}
              <DimensionLine
                x1={deckLeftX}
                y1={topY - 15}
                x2={deckRightX}
                y2={topY - 15}
                label="Total Deck Span"
                value={parseFloat((span + 2 * bearingSeatL).toFixed(2))}
                offset={0}
                lineColor={dimColor}
                textColor={themeColors?.dimText || dimColor}
                paramName="Total Deck Span"
              />
            </g>
          )}
        </g>
      )}

      {/* ========================================================================= */}
      {/* 2. LONGITUDINAL SECTION: ROADWAY ELEVATION (BARREL LENGTH VIEW)           */}
      {/* ========================================================================= */}
      {viewMode === 'longitudinal' && (
        <g id="culvert-longitudinal-view">
          {(() => {
            const longScale = 46;
            const pxBarrelL = barrelL * longScale;
            const bLeftX = cx - pxBarrelL / 2;
            const bRightX = cx + pxBarrelL / 2;
            const roadTopY = topY + 20;

            return (
              <g>
                {/* Road Embankment Backfill */}
                <polygon
                  points={`
                    ${bLeftX - 70},${abutBotY}
                    ${bLeftX - 30},${roadTopY + 15}
                    ${bLeftX},${roadTopY + 15}
                    ${bLeftX},${abutBotY}
                  `}
                  fill={fillEarth}
                  stroke={strokeColor}
                  strokeWidth="1.2"
                />
                <polygon
                  points={`
                    ${bRightX + 70},${abutBotY}
                    ${bRightX + 30},${roadTopY + 15}
                    ${bRightX},${roadTopY + 15}
                    ${bRightX},${abutBotY}
                  `}
                  fill={fillEarth}
                  stroke={strokeColor}
                  strokeWidth="1.2"
                />

                {/* Foundation Bedding along Roadway */}
                <rect
                  x={bLeftX - 15}
                  y={pccBotY}
                  width={pxBarrelL + 30}
                  height={pxSolingT}
                  fill={fillSoling}
                  stroke={strokeColor}
                  strokeWidth="1.5"
                />
                <rect
                  x={bLeftX - 10}
                  y={bedLevelY}
                  width={pxBarrelL + 20}
                  height={pxPccT}
                  fill={fillPcc}
                  stroke={strokeColor}
                  strokeWidth="1.5"
                />

                {/* Masonry Abutment Front Elevation (Length along Barrel) */}
                <rect
                  x={bLeftX}
                  y={abutTopY}
                  width={pxBarrelL}
                  height={pxAbutH}
                  fill={fillStone}
                  stroke={strokeColor}
                  strokeWidth="2.2"
                />

                {/* Staggered Weep Holes along Barrel Length */}
                {Array.from({ length: Math.max(3, Math.round(barrelL / 1.5)) }).map((_, i) => {
                  const wx = bLeftX + 25 + i * ((pxBarrelL - 50) / (Math.max(3, Math.round(barrelL / 1.5)) - 1));
                  return (
                    <g key={`long-weep-${i}`}>
                      <circle cx={wx} cy={bedLevelY - pxAbutH * 0.3} r="4" fill="#0284c7" stroke={strokeColor} />
                      <circle cx={wx + 15} cy={bedLevelY - pxAbutH * 0.65} r="4" fill="#0284c7" stroke={strokeColor} />
                    </g>
                  );
                })}

                {/* L-Cap Bed Block along Barrel Length */}
                <rect
                  x={bLeftX}
                  y={deckBotY}
                  width={pxBarrelL}
                  height={pxLCapT}
                  fill={fillRCC}
                  stroke={strokeColor}
                  strokeWidth="2"
                />

                {/* Deck Slab along Road Width */}
                <rect
                  x={bLeftX}
                  y={roadTopY}
                  width={pxBarrelL}
                  height={pxSlabT}
                  fill={fillRCC}
                  stroke={strokeColor}
                  strokeWidth="2.5"
                />

                {/* Asphalt Wearing Surface */}
                <rect
                  x={bLeftX}
                  y={roadTopY - pxWearingT}
                  width={pxBarrelL}
                  height={pxWearingT}
                  fill={fillAsphalt}
                  stroke={strokeColor}
                  strokeWidth="1.2"
                />

                {/* Road Shoulder & Parapet Railings on Left & Right */}
                <rect x={bLeftX} y={roadTopY - pxWearingT - 18} width={20} height={18} fill={fillRCC} stroke={strokeColor} />
                <rect x={bRightX - 20} y={roadTopY - pxWearingT - 18} width={20} height={18} fill={fillRCC} stroke={strokeColor} />
                <line x1={bLeftX} y1={roadTopY - pxWearingT - 40} x2={bRightX} y2={roadTopY - pxWearingT - 40} stroke={fillRailing} strokeWidth="3" />
                <line x1={bLeftX + 10} y1={roadTopY - pxWearingT - 18} x2={bLeftX + 10} y2={roadTopY - pxWearingT - 40} stroke={fillRailing} strokeWidth="3" />
                <line x1={bRightX - 10} y1={roadTopY - pxWearingT - 18} x2={bRightX - 10} y2={roadTopY - pxWearingT - 40} stroke={fillRailing} strokeWidth="3" />

                {/* Title */}
                <text x={cx} y={topY - 45} fill={themeColors?.titleText || '#0f172a'} fontSize="15" fontWeight="900" textAnchor="middle">
                  LONGITUDINAL SECTION & BARREL ELEVATION
                </text>
                <text x={cx} y={topY - 30} fill={isCad ? '#94a3b8' : '#64748b'} fontSize="10" fontWeight="700" textAnchor="middle" className="font-mono">
                  ELEVATION ALONG ROADWAY CARRIAGEWAY (BARREL LENGTH Lb = {barrelL.toFixed(2)}m)
                </text>

                {/* Dimension Line: Barrel Length */}
                {showDimensions && (
                  <DimensionLine
                    x1={bLeftX}
                    y1={roadTopY - pxWearingT - 55}
                    x2={bRightX}
                    y2={roadTopY - pxWearingT - 55}
                    label="Barrel Length Lb"
                    value={barrelL}
                    offset={0}
                    lineColor={dimColor}
                    textColor={themeColors?.dimText || dimColor}
                    paramName="Barrel Length"
                    onEditValue={(v) => onUpdateParam('barrelLength', v)}
                  />
                )}
              </g>
            );
          })()}
        </g>
      )}

      {/* ========================================================================= */}
      {/* 3. PLAN & WING WALLS LAYOUT VIEW: TOP VIEW WITH 4 FLARED WING WALLS       */}
      {/* ========================================================================= */}
      {viewMode === 'plan_wingwalls' && (
        <g id="culvert-plan-wingwalls-view">
          {(() => {
            const planScale = 38;
            const pxSpanP = span * planScale;
            const pxBarrelP = barrelL * planScale;
            const pxWingLP = wingL * planScale;

            const pLeftAbutX = cx - pxSpanP / 2 - 20;
            const pRightAbutX = cx + pxSpanP / 2;
            const pTopRoadY = topY + 40;
            const pBotRoadY = pTopRoadY + pxBarrelP;

            return (
              <g>
                {/* Stream Flow Bed (Invert Apron) */}
                <rect
                  x={pLeftAbutX - 50}
                  y={pTopRoadY - 70}
                  width={pxSpanP + 90}
                  height={pxBarrelP + 140}
                  fill={fillPcc}
                  opacity="0.3"
                  stroke={strokeColor}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />

                {/* Waterway Stream Flow Direction Arrow */}
                <g stroke="#0284c7" strokeWidth="2.5" fill="#0284c7">
                  <line x1={cx} y1={pTopRoadY - 50} x2={cx} y2={pTopRoadY - 15} markerEnd="url(#flowArrow)" />
                  <line x1={cx} y1={pBotRoadY + 15} x2={cx} y2={pBotRoadY + 50} markerEnd="url(#flowArrow)" />
                  <text x={cx} y={pTopRoadY - 55} fontSize="9" fontWeight="900" textAnchor="middle" fill="#0284c7" className="font-mono">
                    ▲ UPSTREAM FLOW
                  </text>
                  <text x={cx} y={pBotRoadY + 65} fontSize="9" fontWeight="900" textAnchor="middle" fill="#0284c7" className="font-mono">
                    ▼ DOWNSTREAM DISCHARGE
                  </text>
                </g>

                {/* Left Masonry Abutment Wall (Top View) */}
                <rect
                  x={pLeftAbutX}
                  y={pTopRoadY}
                  width={20}
                  height={pxBarrelP}
                  fill={fillStone}
                  stroke={strokeColor}
                  strokeWidth="2"
                />
                {/* Right Masonry Abutment Wall (Top View) */}
                <rect
                  x={pRightAbutX}
                  y={pTopRoadY}
                  width={20}
                  height={pxBarrelP}
                  fill={fillStone}
                  stroke={strokeColor}
                  strokeWidth="2"
                />

                {/* RCC Deck Slab Over Waterway (Top View) */}
                <rect
                  x={pLeftAbutX}
                  y={pTopRoadY}
                  width={pxSpanP + 40}
                  height={pxBarrelP}
                  fill={fillRCC}
                  opacity="0.80"
                  stroke={strokeColor}
                  strokeWidth="2.5"
                />

                {/* Carriageway Centerline & Road Surface Marking */}
                <line
                  x1={pLeftAbutX - 100}
                  y1={pTopRoadY + pxBarrelP / 2}
                  x2={pRightAbutX + 120}
                  y2={pTopRoadY + pxBarrelP / 2}
                  stroke="#fbbf24"
                  strokeWidth="2"
                  strokeDasharray="8 6"
                />

                {/* 4 FLARED MASONRY WING WALLS (@ 45° Splay Angle) */}
                {/* 1. Top-Left (Upstream Left Wing Wall) */}
                <polygon
                  points={`
                    ${pLeftAbutX},${pTopRoadY}
                    ${pLeftAbutX - pxWingLP * 0.707},${pTopRoadY - pxWingLP * 0.707}
                    ${pLeftAbutX - pxWingLP * 0.707 - 14},${pTopRoadY - pxWingLP * 0.707 + 10}
                    ${pLeftAbutX - 14},${pTopRoadY}
                  `}
                  fill={fillStone}
                  stroke={strokeColor}
                  strokeWidth="2"
                />
                {/* 2. Top-Right (Upstream Right Wing Wall) */}
                <polygon
                  points={`
                    ${pRightAbutX + 20},${pTopRoadY}
                    ${pRightAbutX + 20 + pxWingLP * 0.707},${pTopRoadY - pxWingLP * 0.707}
                    ${pRightAbutX + 20 + pxWingLP * 0.707 + 14},${pTopRoadY - pxWingLP * 0.707 + 10}
                    ${pRightAbutX + 34},${pTopRoadY}
                  `}
                  fill={fillStone}
                  stroke={strokeColor}
                  strokeWidth="2"
                />

                {/* 3. Bottom-Left (Downstream Left Wing Wall) */}
                <polygon
                  points={`
                    ${pLeftAbutX},${pBotRoadY}
                    ${pLeftAbutX - pxWingLP * 0.707},${pBotRoadY + pxWingLP * 0.707}
                    ${pLeftAbutX - pxWingLP * 0.707 - 14},${pBotRoadY + pxWingLP * 0.707 - 10}
                    ${pLeftAbutX - 14},${pBotRoadY}
                  `}
                  fill={fillStone}
                  stroke={strokeColor}
                  strokeWidth="2"
                />
                {/* 4. Bottom-Right (Downstream Right Wing Wall) */}
                <polygon
                  points={`
                    ${pRightAbutX + 20},${pBotRoadY}
                    ${pRightAbutX + 20 + pxWingLP * 0.707},${pBotRoadY + pxWingLP * 0.707}
                    ${pRightAbutX + 20 + pxWingLP * 0.707 + 14},${pBotRoadY + pxWingLP * 0.707 - 10}
                    ${pRightAbutX + 34},${pBotRoadY}
                  `}
                  fill={fillStone}
                  stroke={strokeColor}
                  strokeWidth="2"
                />

                {/* Wing Wall Labels */}
                <text x={pLeftAbutX - pxWingLP * 0.5} y={pTopRoadY - pxWingLP * 0.5 - 6} fill={dimColor} fontSize="9" fontWeight="900" className="font-mono">
                  45° FLARED WING (3.5m)
                </text>
                <text x={pRightAbutX + 20 + pxWingLP * 0.2} y={pTopRoadY - pxWingLP * 0.5 - 6} fill={dimColor} fontSize="9" fontWeight="900" className="font-mono">
                  45° FLARED WING (3.5m)
                </text>

                {/* Title */}
                <text x={cx} y={topY - 45} fill={themeColors?.titleText || '#0f172a'} fontSize="15" fontWeight="900" textAnchor="middle">
                  GENERAL LAYOUT & PLAN VIEW
                </text>
                <text x={cx} y={topY - 30} fill={isCad ? '#94a3b8' : '#64748b'} fontSize="10" fontWeight="700" textAnchor="middle" className="font-mono">
                  TOP PLAN VIEW (WATERWAY SPAN S={span.toFixed(2)}m × ROADWAY Lb={barrelL.toFixed(2)}m + 4 NOS WING WALLS)
                </text>

                {/* Dimensions */}
                {showDimensions && (
                  <>
                    <DimensionLine
                      x1={pLeftAbutX + 20}
                      y1={pTopRoadY + pxBarrelP / 2}
                      x2={pRightAbutX}
                      y2={pTopRoadY + pxBarrelP / 2}
                      label="Clear Span"
                      value={span}
                      offset={0}
                      lineColor={dimColor}
                      textColor={themeColors?.dimText || dimColor}
                      paramName="Clear Span"
                    />
                    <DimensionLine
                      x1={pRightAbutX + 45}
                      y1={pTopRoadY}
                      x2={pRightAbutX + 45}
                      y2={pBotRoadY}
                      label="Roadway Width Lb"
                      value={barrelL}
                      offset={0}
                      lineColor={dimColor}
                      textColor={themeColors?.dimText || dimColor}
                      paramName="Barrel Length"
                    />
                  </>
                )}
              </g>
            );
          })()}
        </g>
      )}
    </g>
  );
};
