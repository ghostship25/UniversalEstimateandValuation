import React, { useState, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Eye,
  Maximize2,
  Minimize2,
  Sparkles,
  Info,
  Download,
  Box,
  Sliders,
  Move,
  FileCode2,
  Printer
} from 'lucide-react';
import { DrawingTemplateDef } from '../../types';
import { generateCADSectionDXF } from './dxfExportUtils';

interface TemplateCanvasDrawingProps {
  template: DrawingTemplateDef;
  params: Record<string, number>;
  activeItemHighlight?: string | null;
}

export const TemplateCanvasDrawing: React.FC<TemplateCanvasDrawingProps> = ({
  template,
  params,
  activeItemHighlight
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [colorTheme, setColorTheme] = useState<'cad-light' | 'blueprint-dark'>('cad-light');
  const [viewMode, setViewMode] = useState<'2d_section' | '3d_isometric'>('2d_section');
  const [showWaterLevel, setShowWaterLevel] = useState<boolean>(true);
  const [showDimensionLabels, setShowDimensionLabels] = useState<boolean>(true);
  const [showRebarMesh, setShowRebarMesh] = useState<boolean>(true);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const p = { ...template.dimension_params, ...params };
  const isDark = colorTheme === 'blueprint-dark';

  // Export SVG File
  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `${template.id}_CAD_section.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Export DXF File
  const handleExportDXF = () => {
    const dxfContent = generateCADSectionDXF(template, params);
    const blob = new Blob([dxfContent], { type: 'application/dxf;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.id}_section.dxf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dimension Helper: Draw arrow line with text
  const renderDimLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    text: string,
    offsetText: { x: number; y: number } = { x: 0, y: -6 },
    vertical: boolean = false
  ) => {
    if (!showDimensionLabels) return null;
    const arrowColor = isDark ? '#38bdf8' : '#0284c7';
    const textColor = isDark ? '#e0f2fe' : '#0369a1';

    return (
      <g className="select-none font-mono text-[11px] font-semibold transition-all">
        {/* Leader lines */}
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={arrowColor} strokeWidth="1.2" strokeDasharray="none" />
        {/* End ticks / arrows */}
        {vertical ? (
          <>
            <line x1={x1 - 4} y1={y1} x2={x1 + 4} y2={y1} stroke={arrowColor} strokeWidth="1.5" />
            <line x1={x2 - 4} y1={y2} x2={x2 + 4} y2={y2} stroke={arrowColor} strokeWidth="1.5" />
          </>
        ) : (
          <>
            <line x1={x1} y1={y1 - 4} x2={x1} y2={y1 + 4} stroke={arrowColor} strokeWidth="1.5" />
            <line x1={x2} y1={y2 - 4} x2={x2} y2={y2 + 4} stroke={arrowColor} strokeWidth="1.5" />
          </>
        )}
        {/* Center label */}
        <rect
          x={(x1 + x2) / 2 + offsetText.x - 36}
          y={(y1 + y2) / 2 + offsetText.y - 9}
          width="72"
          height="18"
          rx="4"
          fill={isDark ? '#0f172a' : '#ffffff'}
          fillOpacity="0.9"
          stroke={arrowColor}
          strokeWidth="0.75"
        />
        <text
          x={(x1 + x2) / 2 + offsetText.x}
          y={(y1 + y2) / 2 + offsetText.y + 4}
          fill={textColor}
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
        >
          {text}
        </text>
      </g>
    );
  };

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border transition-all shadow-sm ${
        isFullScreen ? 'fixed inset-4 z-50 bg-slate-900 border-slate-700 shadow-2xl flex flex-col' : isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}
    >
      {/* Canvas Top Toolbar */}
      <div
        className={`flex flex-wrap items-center justify-between px-4 py-2.5 border-b text-xs gap-2 ${
          isDark ? 'bg-slate-900/95 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
        }`}
      >
        <div className="flex items-center space-x-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('2d_section')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                viewMode === '2d_section'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              2D Section
            </button>
            <button
              onClick={() => setViewMode('3d_isometric')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                viewMode === '3d_isometric'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              3D Isometric
            </button>
          </div>

          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono hidden sm:inline-block ${
              isDark ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            Scale: 1:{Math.round(20 / zoomLevel)}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 flex-wrap">
          {viewMode === '2d_section' && (
            <>
              <button
                onClick={() => setShowDimensionLabels(!showDimensionLabels)}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 text-[11px] font-medium border transition ${
                  showDimensionLabels
                    ? isDark
                      ? 'bg-blue-900/50 border-blue-700 text-blue-200'
                      : 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                    : isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-400'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
                title="Toggle Dimension Annotations"
              >
                <Eye className="w-3.5 h-3.5" />
                Dims
              </button>

              <button
                onClick={() => setShowWaterLevel(!showWaterLevel)}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 text-[11px] font-medium border transition ${
                  showWaterLevel
                    ? isDark
                      ? 'bg-cyan-900/50 border-cyan-700 text-cyan-200'
                      : 'bg-cyan-50 border-cyan-300 text-cyan-700 font-semibold'
                    : isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-400'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
                title="Toggle Water Flow Level Indicator"
              >
                Hydraulics
              </button>

              <button
                onClick={() => setShowRebarMesh(!showRebarMesh)}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 text-[11px] font-medium border transition ${
                  showRebarMesh
                    ? isDark
                      ? 'bg-rose-900/50 border-rose-700 text-rose-200'
                      : 'bg-rose-50 border-rose-300 text-rose-700 font-semibold'
                    : isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-400'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
                title="Toggle Steel Rebar Mesh"
              >
                Rebar
              </button>
            </>
          )}

          <button
            onClick={() => setColorTheme(isDark ? 'cad-light' : 'blueprint-dark')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 text-[11px] font-medium border transition ${
              isDark ? 'bg-slate-800 border-slate-700 text-amber-300' : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            {isDark ? '☀️ CAD Light' : '🌙 Blueprint'}
          </button>

          {/* Zoom Buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setZoomLevel((prev) => Math.max(0.6, prev - 0.15))}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1.5 text-slate-500">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(2.5, prev + 0.15))}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Export Dropdown */}
          <button
            onClick={handleExportSVG}
            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] flex items-center gap-1 shadow-sm transition"
            title="Download Vector SVG"
          >
            <Download className="w-3.5 h-3.5" />
            SVG
          </button>

          <button
            onClick={handleExportDXF}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] flex items-center gap-1 shadow-sm transition"
            title="Download AutoCAD DXF"
          >
            <FileCode2 className="w-3.5 h-3.5" />
            DXF
          </button>

          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            title="Toggle Full Screen View"
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main SVG Render Stage */}
      <div className={`relative w-full ${isFullScreen ? 'flex-1' : 'h-[440px] sm:h-[480px]'} flex items-center justify-center overflow-auto p-4 select-none`}>
        {/* Hover Inspector Tooltip */}
        {hoveredPart && (
          <div className="absolute top-4 left-4 z-20 bg-slate-900/90 text-white px-3 py-1.5 rounded-lg text-xs font-mono border border-slate-700 shadow-lg backdrop-blur-sm pointer-events-none animate-fade-in">
            <span className="text-amber-400 font-bold">Element:</span> {hoveredPart}
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox="0 0 800 480"
          className="w-full h-full max-h-full transition-transform duration-200 origin-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Engineering CAD Grid & Hatch Definitions */}
          <defs>
            <pattern id="cad-grid-major" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke={isDark ? '#1e293b' : '#e2e8f0'} strokeWidth="1" />
            </pattern>
            <pattern id="cad-grid-minor" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke={isDark ? '#0f172a' : '#f1f5f9'} strokeWidth="0.5" />
            </pattern>

            {/* Concrete Hatch */}
            <pattern id="concrete-hatch" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill={isDark ? '#1e293b' : '#f8fafc'} />
              <circle cx="4" cy="4" r="1.5" fill="#94a3b8" />
              <circle cx="14" cy="12" r="1.2" fill="#64748b" />
              <circle cx="10" cy="18" r="1.0" fill="#94a3b8" />
              <polygon points="12,4 16,8 14,9" fill="#94a3b8" opacity="0.6" />
            </pattern>

            {/* Stone Masonry Hatch */}
            <pattern id="masonry-hatch" width="40" height="30" patternUnits="userSpaceOnUse">
              <rect width="40" height="30" fill={isDark ? '#334155' : '#fef3c7'} />
              <path d="M 0,15 L 40,15 M 20,0 L 20,15 M 0,30 L 40,30 M 10,15 L 10,30 M 30,15 L 30,30" stroke="#d97706" strokeWidth="1.5" />
            </pattern>

            {/* Earth Subgrade Hatch */}
            <pattern id="earth-hatch" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill={isDark ? '#0f172a' : '#fafaf9'} />
              <line x1="0" y1="20" x2="20" y2="0" stroke="#a8a29e" strokeWidth="0.8" strokeDasharray="3 3" />
              <line x1="0" y1="10" x2="10" y2="0" stroke="#a8a29e" strokeWidth="0.8" />
              <line x1="10" y1="20" x2="20" y2="10" stroke="#a8a29e" strokeWidth="0.8" />
            </pattern>

            {/* Gabion Wire Mesh Hatch */}
            <pattern id="gabion-hatch" width="24" height="24" patternUnits="userSpaceOnUse">
              <rect width="24" height="24" fill={isDark ? '#1e293b' : '#ecfdf5'} />
              <path d="M 0 12 L 12 0 L 24 12 L 12 24 Z" fill="none" stroke="#059669" strokeWidth="1.2" />
              <circle cx="12" cy="12" r="3" fill="#6ee7b7" />
            </pattern>
          </defs>

          {/* Background Grid */}
          <rect width="800" height="480" fill={isDark ? '#020617' : '#ffffff'} />
          <rect width="800" height="480" fill="url(#cad-grid-minor)" />
          <rect width="800" height="480" fill="url(#cad-grid-major)" />

          {/* ==================================================== */}
          {/* 3D ISOMETRIC / PERSPECTIVE MODE */}
          {/* ==================================================== */}
          {viewMode === '3d_isometric' && (
            <g transform="translate(400, 260)">
              {/* Ground Earth Platform */}
              <polygon
                points="-260,-40 0,-160 260,-40 0,80"
                fill={isDark ? '#0f172a' : '#f5f5f4'}
                stroke={isDark ? '#334155' : '#d6d3d1'}
                strokeWidth="1.5"
              />

              {/* Structure Extrusion */}
              {template.svg_type.includes('drain') || template.svg_type === 'saucer_drain' ? (
                <>
                  {/* Extruded Drain Trench */}
                  <polygon
                    points="-160, -10 -20, -90 140, -10 0, 70"
                    fill="url(#concrete-hatch)"
                    stroke="#2563eb"
                    strokeWidth="2"
                  />
                  {/* Water Flow Ribbon */}
                  {showWaterLevel && (
                    <polygon
                      points="-120, 10 0, -50 120, 10 0, 70"
                      fill="#38bdf8"
                      fillOpacity="0.75"
                      stroke="#0284c7"
                      strokeWidth="1"
                    />
                  )}
                  {/* Direction of Water Flow Arrow */}
                  <line x1="0" y1="-30" x2="0" y2="45" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="4 2" />
                  <polygon points="0,55 -6,40 6,40" fill="#ffffff" />
                  <text x="15" y="10" fill="#0369a1" fontSize="11" fontWeight="bold">Flow Direction ➔</text>
                </>
              ) : template.svg_type.includes('culvert') ? (
                <>
                  {/* Extruded Box Culvert 3D */}
                  <polygon
                    points="-180,-20 -20,-110 160,-20 0,70"
                    fill="url(#concrete-hatch)"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                  />
                  <polygon
                    points="-180,-20 0,70 0,110 -180,20"
                    fill="#1e3a8a"
                    opacity="0.8"
                    stroke="#1e293b"
                    strokeWidth="1.5"
                  />
                  <polygon
                    points="0,70 160,-20 160,20 0,110"
                    fill="#1d4ed8"
                    opacity="0.9"
                    stroke="#1e293b"
                    strokeWidth="1.5"
                  />
                  {/* Water inside barrel */}
                  <polygon points="-80,25 0,70 80,25 0,-15" fill="#38bdf8" opacity="0.8" />
                  <text x="0" y="45" fill="#ffffff" textAnchor="middle" fontSize="11" fontWeight="bold">Waterway Barrel</text>
                </>
              ) : template.svg_type.includes('road') ? (
                <>
                  {/* Road 3D Extruded Carriageway */}
                  <polygon
                    points="-220,-30 0,-140 220,-30 0,80"
                    fill="#18181b"
                    stroke="#3f3f46"
                    strokeWidth="2"
                  />
                  {/* Road Centerline Dashes */}
                  <line x1="0" y1="-140" x2="0" y2="80" stroke="#facc15" strokeWidth="3" strokeDasharray="16 10" />
                  {/* Pavement Layer Sides */}
                  <polygon points="-220,-30 0,80 0,105 -220, -5" fill="#71717a" />
                  <polygon points="0,80 220,-30 220,-5 0,105" fill="#52525b" />
                  <text x="-90" y="20" fill="#ffffff" fontSize="11" fontWeight="bold">Paved Carriageway</text>
                  <text x="40" y="20" fill="#ffffff" fontSize="11" fontWeight="bold">Shoulder</text>
                </>
              ) : (
                <>
                  {/* Retaining Wall 3D Tiered Block */}
                  <polygon points="-140,-10 0,-90 140,-10 0,70" fill="url(#masonry-hatch)" stroke="#d97706" strokeWidth="2" />
                  <polygon points="-140,-10 0,70 0,120 -140,40" fill="#b45309" opacity="0.9" />
                  <polygon points="0,70 140,-10 140,40 0,120" fill="#92400e" opacity="0.8" />
                  <text x="0" y="35" fill="#ffffff" textAnchor="middle" fontSize="12" fontWeight="bold">Retaining Wall Stem</text>
                </>
              )}

              {/* Title Badge in 3D Mode */}
              <rect x="-130" y="-195" width="260" height="28" rx="6" fill={isDark ? '#0f172a' : '#ffffff'} stroke="#3b82f6" strokeWidth="1" />
              <text x="0" y="-177" fill={isDark ? '#93c5fd' : '#1d4ed8'} textAnchor="middle" fontSize="11" fontWeight="bold">
                Isometric 3D Perspective ({template.name})
              </text>
            </g>
          )}

          {/* ==================================================== */}
          {/* 2D TECHNICAL CROSS-SECTION DRAWINGS */}
          {/* ==================================================== */}
          {viewMode === '2d_section' && (
            <>
              {/* TRAPEZOIDAL DRAIN */}
              {template.svg_type === 'trapezoidal_drain' && (
                <g transform="translate(400, 240)">
                  {(() => {
                    const b = p.bed_width || 0.60;
                    const d = p.drain_depth || 0.60;
                    const tw = p.wall_thickness || 0.35;
                    const tb = p.bed_pcc_thickness || 0.15;
                    const tsol = p.soling_thickness || 0.15;
                    const z = p.side_slope_z || 0.5;

                    const scale = 110;
                    const bPx = b * scale;
                    const dPx = d * scale;
                    const twPx = tw * scale;
                    const tbPx = tb * scale;
                    const tSolPx = tsol * scale;
                    const zSlopePx = z * dPx;

                    const bedLeft = -bPx / 2;
                    const bedRight = bPx / 2;
                    const wallTopLeft = bedLeft - zSlopePx;
                    const wallTopRight = bedRight + zSlopePx;

                    const botLeft = bedLeft - twPx;
                    const botRight = bedRight + twPx;
                    const totalBottomW = botRight - botLeft;

                    return (
                      <>
                        {/* Subgrade Excavation Line */}
                        <polygon
                          points={`${wallTopLeft - twPx - 25},${-dPx - 20} ${wallTopRight + twPx + 25},${-dPx - 20} ${botRight + 20},${tbPx + tSolPx + 30} ${botLeft - 20},${tbPx + tSolPx + 30}`}
                          fill="url(#earth-hatch)"
                          stroke="#94a3b8"
                          strokeWidth="1"
                          strokeDasharray="4 2"
                        />

                        {/* Flat Stone Soling Bed */}
                        {tsol > 0 && (
                          <rect
                            x={botLeft - 10}
                            y={tbPx}
                            width={totalBottomW + 20}
                            height={tSolPx}
                            fill="#ca8a04"
                            opacity="0.75"
                            stroke="#854d0e"
                            strokeWidth="1.5"
                            onMouseEnter={() => setHoveredPart(`Stone Soling (${tsol}m thk)`)}
                            onMouseLeave={() => setHoveredPart(null)}
                          />
                        )}

                        {/* Bed PCC Layer (1:3:6) */}
                        <rect
                          x={botLeft}
                          y="0"
                          width={totalBottomW}
                          height={tbPx}
                          fill="url(#concrete-hatch)"
                          stroke="#2563eb"
                          strokeWidth="2"
                          onMouseEnter={() => setHoveredPart(`PCC Bed Slab (${tb}m thk)`)}
                          onMouseLeave={() => setHoveredPart(null)}
                        />

                        {/* Left Stone Masonry Sloping Wall */}
                        <polygon
                          points={`${bedLeft},0 ${wallTopLeft},${-dPx} ${wallTopLeft - twPx},${-dPx} ${botLeft},0`}
                          fill="url(#masonry-hatch)"
                          stroke="#d97706"
                          strokeWidth="2"
                          onMouseEnter={() => setHoveredPart(`Left Masonry Wall (${tw}m thk, 1:${z} slope)`)}
                          onMouseLeave={() => setHoveredPart(null)}
                        />

                        {/* Right Stone Masonry Sloping Wall */}
                        <polygon
                          points={`${bedRight},0 ${wallTopRight},${-dPx} ${wallTopRight + twPx},${-dPx} ${botRight},0`}
                          fill="url(#masonry-hatch)"
                          stroke="#d97706"
                          strokeWidth="2"
                          onMouseEnter={() => setHoveredPart(`Right Masonry Wall (${tw}m thk, 1:${z} slope)`)}
                          onMouseLeave={() => setHoveredPart(null)}
                        />

                        {/* Internal Cement Plaster Layer */}
                        <polyline
                          points={`${wallTopLeft},${-dPx} ${bedLeft},0 ${bedRight},0 ${wallTopRight},${-dPx}`}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="3"
                        />

                        {/* Water Hydraulic Flow Level */}
                        {showWaterLevel && (
                          <g>
                            <polygon
                              points={`${bedLeft + 5},0 ${bedRight - 5},0 ${wallTopRight * 0.75},${-dPx * 0.75} ${wallTopLeft * 0.75},${-dPx * 0.75}`}
                              fill="#38bdf8"
                              fillOpacity="0.55"
                            />
                            <line
                              x1={wallTopLeft * 0.75}
                              y1={-dPx * 0.75}
                              x2={wallTopRight * 0.75}
                              y2={-dPx * 0.75}
                              stroke="#0284c7"
                              strokeWidth="1.5"
                              strokeDasharray="4 2"
                            />
                            <text x="0" y={-dPx * 0.75 - 5} fill="#0284c7" textAnchor="middle" fontSize="10" fontWeight="bold">
                              ▼ FSL (Full Supply Level)
                            </text>
                          </g>
                        )}

                        {/* Dimension Annotations */}
                        {renderDimLine(bedLeft, tbPx + tSolPx + 15, bedRight, tbPx + tSolPx + 15, `b = ${b.toFixed(2)}m`, { x: 0, y: 15 })}
                        {renderDimLine(wallTopRight + twPx + 20, -dPx, wallTopRight + twPx + 20, 0, `d = ${d.toFixed(2)}m`, { x: 25, y: 0 }, true)}
                        {renderDimLine(wallTopLeft, -dPx - 25, wallTopRight, -dPx - 25, `Top W = ${(b + 2 * z * d).toFixed(2)}m`, { x: 0, y: -10 })}
                        {renderDimLine(botLeft - 25, 0, botLeft - 25, tbPx, `tb=${tb.toFixed(2)}`, { x: -25, y: 0 }, true)}
                      </>
                    );
                  })()}
                </g>
              )}

              {/* RECTANGULAR RCC DRAIN WITH PRECAST COVER */}
              {template.svg_type === 'rcc_box_drain' && (
                <g transform="translate(400, 240)">
                  {(() => {
                    const W = p.clear_width || 0.75;
                    const H = p.clear_depth || 0.80;
                    const tw = p.wall_thickness || 0.15;
                    const tb = p.base_slab_thickness || 0.15;
                    const tcov = p.cover_slab_thickness || 0.10;
                    const tpcc = p.pcc_bed_thickness || 0.075;
                    const tsol = p.soling_thickness || 0.15;

                    const scale = 110;
                    const wPx = W * scale;
                    const hPx = H * scale;
                    const twPx = tw * scale;
                    const tbPx = tb * scale;
                    const tcovPx = tcov * scale;
                    const tpccPx = tpcc * scale;
                    const tsolPx = tsol * scale;

                    const totalWPx = wPx + 2 * twPx;

                    return (
                      <>
                        {/* Soling & Lean Concrete Screed */}
                        {tsol > 0 && (
                          <rect x={-totalWPx / 2 - 15} y={tbPx + tpccPx} width={totalWPx + 30} height={tsolPx} fill="#ca8a04" opacity="0.6" stroke="#854d0e" strokeWidth="1" />
                        )}
                        <rect x={-totalWPx / 2 - 10} y={tbPx} width={totalWPx + 20} height={tpccPx} fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />

                        {/* Monolithic RCC Base Raft & Sidewalls */}
                        <path
                          d={`M ${-totalWPx / 2} ${-hPx} L ${-wPx / 2} ${-hPx} L ${-wPx / 2} 0 L ${wPx / 2} 0 L ${wPx / 2} ${-hPx} L ${totalWPx / 2} ${-hPx} L ${totalWPx / 2} ${tbPx} L ${-totalWPx / 2} ${tbPx} Z`}
                          fill="url(#concrete-hatch)"
                          stroke="#2563eb"
                          strokeWidth="2.5"
                        />

                        {/* Rebar Cage Display */}
                        {showRebarMesh && (
                          <g stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3">
                            <polyline points={`${-totalWPx / 2 + 10},${-hPx + 5} ${-totalWPx / 2 + 10},${tbPx - 10} ${totalWPx / 2 - 10},${tbPx - 10} ${totalWPx / 2 - 10},${-hPx + 5}`} fill="none" />
                            <polyline points={`${-wPx / 2 - 8},${-hPx + 10} ${-wPx / 2 - 8},${tbPx - 20} ${wPx / 2 + 8},${tbPx - 20} ${wPx / 2 + 8},${-hPx + 10}`} fill="none" />
                          </g>
                        )}

                        {/* Precast Removable Cover Slab */}
                        <rect
                          x={-totalWPx / 2 - 6}
                          y={-hPx - tcovPx - 3}
                          width={totalWPx + 12}
                          height={tcovPx}
                          fill="url(#concrete-hatch)"
                          stroke="#1d4ed8"
                          strokeWidth="2"
                        />
                        {/* Hand Lifting Holes in Cover Slab */}
                        <circle cx={-wPx / 4} cy={-hPx - tcovPx / 2 - 3} r="4" fill="#0f172a" />
                        <circle cx={wPx / 4} cy={-hPx - tcovPx / 2 - 3} r="4" fill="#0f172a" />

                        {/* Water Flow */}
                        {showWaterLevel && (
                          <rect x={-wPx / 2} y={-hPx * 0.7} width={wPx} height={hPx * 0.7} fill="#38bdf8" fillOpacity="0.6" stroke="#0284c7" strokeWidth="1" />
                        )}

                        {/* Dimensions */}
                        {renderDimLine(-wPx / 2, 20, wPx / 2, 20, `W = ${W.toFixed(2)}m`, { x: 0, y: 15 })}
                        {renderDimLine(totalWPx / 2 + 25, -hPx, totalWPx / 2 + 25, 0, `H = ${H.toFixed(2)}m`, { x: 25, y: 0 }, true)}
                        {renderDimLine(-totalWPx / 2, -hPx - tcovPx - 25, totalWPx / 2, -hPx - tcovPx - 25, `Total W = ${(W + 2 * tw).toFixed(2)}m`, { x: 0, y: -10 })}
                      </>
                    );
                  })()}
                </g>
              )}

              {/* SAUCER / V-SHAPED CURB DRAIN */}
              {template.svg_type === 'saucer_drain' && (
                <g transform="translate(400, 240)">
                  {(() => {
                    const Ws = p.saucer_width || 0.60;
                    const dc = p.center_dish_depth || 0.10;
                    const tpcc = p.pcc_thickness || 0.15;
                    const tsol = p.soling_thickness || 0.15;
                    const Hk = p.kerb_height || 0.25;
                    const Wk = p.kerb_width || 0.15;

                    const scale = 140;
                    const wsPx = Ws * scale;
                    const dcPx = dc * scale;
                    const tpccPx = tpcc * scale;
                    const tsolPx = tsol * scale;
                    const hkPx = Hk * scale;
                    const wkPx = Wk * scale;

                    return (
                      <>
                        {/* Subgrade */}
                        <rect x={-wsPx / 2 - wkPx - 30} y={tpccPx + tsolPx} width={wsPx + wkPx + 60} height="60" fill="url(#earth-hatch)" stroke="#94a3b8" strokeWidth="1" />

                        {/* Stone Soling */}
                        {tsol > 0 && (
                          <rect x={-wsPx / 2 - wkPx - 10} y={tpccPx} width={wsPx + wkPx + 20} height={tsolPx} fill="#ca8a04" opacity="0.6" stroke="#854d0e" strokeWidth="1" />
                        )}

                        {/* Parabolic Dish Dish Concrete Slab */}
                        <path
                          d={`M ${-wsPx / 2} 0 Q 0 ${dcPx * 2} ${wsPx / 2} 0 L ${wsPx / 2} ${tpccPx} L ${-wsPx / 2} ${tpccPx} Z`}
                          fill="url(#concrete-hatch)"
                          stroke="#2563eb"
                          strokeWidth="2.5"
                        />

                        {/* Precast Kerb Stone */}
                        <rect x={-wsPx / 2 - wkPx} y={-hkPx + 10} width={wkPx} height={hkPx + tpccPx} fill="#475569" stroke="#1e293b" strokeWidth="2" rx="4" />
                        <text x={-wsPx / 2 - wkPx / 2} y={-hkPx / 2} fill="#ffffff" textAnchor="middle" fontSize="9" fontWeight="bold">Kerb</text>

                        {/* Water Flow in Dish Channel */}
                        {showWaterLevel && (
                          <path
                            d={`M ${-wsPx / 3} ${dcPx * 0.4} Q 0 ${dcPx * 1.8} ${wsPx / 3} ${dcPx * 0.4} Z`}
                            fill="#38bdf8"
                            fillOpacity="0.75"
                          />
                        )}

                        {/* Dimensions */}
                        {renderDimLine(-wsPx / 2, -30, wsPx / 2, -30, `Dish W = ${Ws.toFixed(2)}m`, { x: 0, y: -10 })}
                        {renderDimLine(0, 0, 0, dcPx * 2, `dc = ${dc.toFixed(2)}m`, { x: 25, y: 0 }, true)}
                        {renderDimLine(-wsPx / 2 - wkPx, -hkPx - 15, -wsPx / 2, -hkPx - 15, `Wk = ${Wk.toFixed(2)}m`, { x: 0, y: -8 })}
                      </>
                    );
                  })()}
                </g>
              )}

              {/* RCC BOX CULVERT */}
              {template.svg_type === 'box_culvert' && (
                <g transform="translate(400, 240)">
                  {(() => {
                    const S = p.clear_span || 2.50;
                    const H = p.clear_height || 2.00;
                    const tw = p.wall_thickness || 0.30;
                    const tb = p.bottom_slab_thickness || 0.30;
                    const ttop = p.top_slab_thickness || 0.30;
                    const hc = p.haunch_size || 0.15;
                    const tpcc = p.pcc_bed_thickness || 0.10;
                    const tsol = p.soling_thickness || 0.20;

                    const scale = 55;
                    const sPx = S * scale;
                    const hPx = H * scale;
                    const twPx = tw * scale;
                    const tbPx = tb * scale;
                    const ttopPx = ttop * scale;
                    const hcPx = hc * scale;
                    const tpccPx = tpcc * scale;
                    const tsolPx = tsol * scale;

                    const outerW = sPx + 2 * twPx;
                    const outerH = hPx + tbPx + ttopPx;

                    return (
                      <>
                        {/* Soling and PCC */}
                        <rect x={-outerW / 2 - 20} y={tbPx + tpccPx} width={outerW + 40} height={tsolPx} fill="#ca8a04" opacity="0.6" stroke="#854d0e" strokeWidth="1" />
                        <rect x={-outerW / 2 - 10} y={tbPx} width={outerW + 20} height={tpccPx} fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />

                        {/* Monolithic Outer Box Path */}
                        <path
                          d={`M ${-outerW / 2} ${-hPx - ttopPx} L ${outerW / 2} ${-hPx - ttopPx} L ${outerW / 2} ${tbPx} L ${-outerW / 2} ${tbPx} Z`}
                          fill="url(#concrete-hatch)"
                          stroke="#2563eb"
                          strokeWidth="3"
                        />

                        {/* Internal Waterway Vent with Corner Haunches */}
                        <path
                          d={`M ${-sPx / 2 + hcPx} 0 L ${sPx / 2 - hcPx} 0 L ${sPx / 2} ${-hcPx} L ${sPx / 2} ${-hPx + hcPx} L ${sPx / 2 - hcPx} ${-hPx} L ${-sPx / 2 + hcPx} ${-hPx} L ${-sPx / 2} ${-hPx + hcPx} L ${-sPx / 2} ${-hcPx} Z`}
                          fill={isDark ? '#020617' : '#ffffff'}
                          stroke="#1e3a8a"
                          strokeWidth="2.5"
                        />

                        {/* Rebar Cage */}
                        {showRebarMesh && (
                          <rect
                            x={-outerW / 2 + 10}
                            y={-hPx - ttopPx + 10}
                            width={outerW - 20}
                            height={outerH - 20}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="1.5"
                            strokeDasharray="4 3"
                          />
                        )}

                        {/* Water Stream in Culvert */}
                        {showWaterLevel && (
                          <rect x={-sPx / 2} y={-hPx * 0.75} width={sPx} height={hPx * 0.75} fill="#38bdf8" fillOpacity="0.6" stroke="#0284c7" strokeWidth="1.5" />
                        )}

                        {/* Dimensions */}
                        {renderDimLine(-sPx / 2, 20, sPx / 2, 20, `Clear Span S = ${S.toFixed(2)}m`, { x: 0, y: 15 })}
                        {renderDimLine(outerW / 2 + 30, -hPx, outerW / 2 + 30, 0, `Clear H = ${H.toFixed(2)}m`, { x: 30, y: 0 }, true)}
                        {renderDimLine(-outerW / 2, -hPx - ttopPx - 30, outerW / 2, -hPx - ttopPx - 30, `Total W = ${(S + 2 * tw).toFixed(2)}m`, { x: 0, y: -10 })}
                      </>
                    );
                  })()}
                </g>
              )}

              {/* SLAB CULVERT ON MASONRY ABUTMENTS WITH L-CAP & WING WALLS */}
              {template.svg_type === 'slab_culvert' && (
                <g transform="translate(400, 240)">
                  {(() => {
                    const S = p.clear_span || 4.00;
                    const Hab = p.abutment_height || 2.80;
                    const wtop = p.abutment_top_width || 0.65;
                    const wbot = p.abutment_bottom_width || 1.25;
                    const tslab = p.slab_thickness || 0.35;
                    const dft = p.footing_depth || 0.60;
                    const tpcc = p.pcc_bed_thickness || 0.15;
                    const tsol = p.soling_thickness || 0.20;
                    const lCapThk = p.bed_block_thickness || 0.25;
                    const bearingW = p.bearing_length || Number((wtop * 0.6).toFixed(2));
                    const dirtH = Number((tslab + 0.05).toFixed(2));
                    const dirtW = 0.22;

                    const scale = 52;
                    const sPx = S * scale;
                    const hAbPx = Hab * scale;
                    const wTopPx = wtop * scale;
                    const wBotPx = wbot * scale;
                    const tSlabPx = tslab * scale;
                    const dftPx = dft * scale;
                    const tpccPx = tpcc * scale;
                    const tsolPx = tsol * scale;
                    const lCapPx = lCapThk * scale;
                    const bearingPx = bearingW * scale;
                    const dirtHPx = dirtH * scale;
                    const dirtWPx = dirtW * scale;

                    const leftInnerX = -sPx / 2;
                    const rightInnerX = sPx / 2;
                    const deckLeftX = leftInnerX - bearingPx;
                    const deckRightX = rightInnerX + bearingPx;
                    const deckTopY = -hAbPx - lCapPx - tSlabPx;
                    const deckBotY = -hAbPx - lCapPx;

                    // Footing dimensions
                    const footOffset = 0.30 * scale;
                    const leftFootLeft = leftInnerX - wBotPx - footOffset;
                    const leftFootRight = leftInnerX + footOffset;
                    const rightFootLeft = rightInnerX - footOffset;
                    const rightFootRight = rightInnerX + wBotPx + footOffset;

                    return (
                      <>
                        {/* Stream / Ground Reference Line */}
                        <line x1={-sPx / 2 - 120} y1="0" x2={sPx / 2 + 120} y2="0" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="6 3" />

                        {/* Backfill Earth Hatch Behind Abutments */}
                        <polygon
                          points={`
                            ${leftInnerX - wBotPx - 100},0
                            ${leftInnerX - wTopPx - 50},${-hAbPx}
                            ${leftInnerX - wTopPx},${-hAbPx}
                            ${leftInnerX - wBotPx},0
                          `}
                          fill="url(#earth-hatch)"
                          opacity="0.6"
                        />
                        <polygon
                          points={`
                            ${rightInnerX + wBotPx + 100},0
                            ${rightInnerX + wTopPx + 50},${-hAbPx}
                            ${rightInnerX + wTopPx},${-hAbPx}
                            ${rightInnerX + wBotPx},0
                          `}
                          fill="url(#earth-hatch)"
                          opacity="0.6"
                        />

                        {/* Splayed Wing Wall Background Shading (Masonry) */}
                        <polygon
                          points={`
                            ${leftInnerX - wTopPx},${-hAbPx}
                            ${leftInnerX - wTopPx - 80},${-hAbPx + 40}
                            ${leftInnerX - wBotPx - 90},0
                            ${leftInnerX - wBotPx},0
                          `}
                          fill="url(#masonry-hatch)"
                          opacity="0.45"
                          stroke="#b45309"
                          strokeWidth="1.5"
                          strokeDasharray="4 2"
                        />
                        <polygon
                          points={`
                            ${rightInnerX + wTopPx},${-hAbPx}
                            ${rightInnerX + wTopPx + 80},${-hAbPx + 40}
                            ${rightInnerX + wBotPx + 90},0
                            ${rightInnerX + wBotPx},0
                          `}
                          fill="url(#masonry-hatch)"
                          opacity="0.45"
                          stroke="#b45309"
                          strokeWidth="1.5"
                          strokeDasharray="4 2"
                        />

                        {/* Foundation Flat Stone Soling (under left & right abutments) */}
                        {tsol > 0 && (
                          <>
                            <rect
                              x={leftFootLeft - 10}
                              y={dftPx + tpccPx}
                              width={leftFootRight - leftFootLeft + 20}
                              height={tsolPx}
                              fill="#ca8a04"
                              opacity="0.75"
                              stroke="#854d0e"
                              strokeWidth="1.5"
                            />
                            <rect
                              x={rightFootLeft - 10}
                              y={dftPx + tpccPx}
                              width={rightFootRight - rightFootLeft + 20}
                              height={tsolPx}
                              fill="#ca8a04"
                              opacity="0.75"
                              stroke="#854d0e"
                              strokeWidth="1.5"
                            />
                          </>
                        )}

                        {/* Foundation Bed PCC 1:3:6 (under left & right abutments) */}
                        {tpcc > 0 && (
                          <>
                            <rect
                              x={leftFootLeft}
                              y={dftPx}
                              width={leftFootRight - leftFootLeft}
                              height={tpccPx}
                              fill="url(#concrete-hatch)"
                              stroke="#2563eb"
                              strokeWidth="1.5"
                            />
                            <rect
                              x={rightFootLeft}
                              y={dftPx}
                              width={rightFootRight - rightFootLeft}
                              height={tpccPx}
                              fill="url(#concrete-hatch)"
                              stroke="#2563eb"
                              strokeWidth="1.5"
                            />
                          </>
                        )}

                        {/* Foundation Stepped Masonry Footings */}
                        <rect
                          x={leftFootLeft + 5}
                          y="0"
                          width={leftFootRight - leftFootLeft - 10}
                          height={dftPx}
                          fill="url(#masonry-hatch)"
                          stroke="#d97706"
                          strokeWidth="2"
                        />
                        <rect
                          x={rightFootLeft + 5}
                          y="0"
                          width={rightFootRight - rightFootLeft - 10}
                          height={dftPx}
                          fill="url(#masonry-hatch)"
                          stroke="#d97706"
                          strokeWidth="2"
                        />

                        {/* Left Masonry Abutment Stem */}
                        <polygon
                          points={`
                            ${leftInnerX},0
                            ${leftInnerX},${-hAbPx}
                            ${leftInnerX - wTopPx},${-hAbPx}
                            ${leftInnerX - wBotPx},0
                          `}
                          fill="url(#masonry-hatch)"
                          stroke="#d97706"
                          strokeWidth="2.5"
                        />

                        {/* Right Masonry Abutment Stem */}
                        <polygon
                          points={`
                            ${rightInnerX},0
                            ${rightInnerX},${-hAbPx}
                            ${rightInnerX + wTopPx},${-hAbPx}
                            ${rightInnerX + wBotPx},0
                          `}
                          fill="url(#masonry-hatch)"
                          stroke="#d97706"
                          strokeWidth="2.5"
                        />

                        {/* Left RCC L-Cap Bed Block & Dirt Ballast Wall */}
                        <path
                          d={`
                            M ${leftInnerX} ${-hAbPx}
                            L ${leftInnerX - wTopPx} ${-hAbPx}
                            L ${leftInnerX - wTopPx} ${-hAbPx - lCapPx - dirtHPx}
                            L ${leftInnerX - wTopPx + dirtWPx} ${-hAbPx - lCapPx - dirtHPx}
                            L ${leftInnerX - wTopPx + dirtWPx} ${-hAbPx - lCapPx}
                            L ${leftInnerX} ${-hAbPx - lCapPx}
                            Z
                          `}
                          fill="url(#concrete-hatch)"
                          stroke="#2563eb"
                          strokeWidth="2"
                        />

                        {/* Right RCC L-Cap Bed Block & Dirt Ballast Wall */}
                        <path
                          d={`
                            M ${rightInnerX} ${-hAbPx}
                            L ${rightInnerX + wTopPx} ${-hAbPx}
                            L ${rightInnerX + wTopPx} ${-hAbPx - lCapPx - dirtHPx}
                            L ${rightInnerX + wTopPx - dirtWPx} ${-hAbPx - lCapPx - dirtHPx}
                            L ${rightInnerX + wTopPx - dirtWPx} ${-hAbPx - lCapPx}
                            L ${rightInnerX} ${-hAbPx - lCapPx}
                            Z
                          `}
                          fill="url(#concrete-hatch)"
                          stroke="#2563eb"
                          strokeWidth="2"
                        />

                        {/* Elastomeric / Tar Paper Bearing Pads */}
                        <rect
                          x={leftInnerX - bearingPx + 5}
                          y={deckBotY - 3}
                          width={bearingPx - 10}
                          height="3"
                          fill="#0f172a"
                        />
                        <rect
                          x={rightInnerX + 5}
                          y={deckBotY - 3}
                          width={bearingPx - 10}
                          height="3"
                          fill="#0f172a"
                        />

                        {/* RCC M25 Deck Slab */}
                        <rect
                          x={deckLeftX}
                          y={deckTopY}
                          width={deckRightX - deckLeftX}
                          height={tSlabPx}
                          fill="url(#concrete-hatch)"
                          stroke="#1d4ed8"
                          strokeWidth="2.5"
                        />

                        {/* Bituminous / Concrete Wearing Coat on Deck */}
                        <rect
                          x={deckLeftX}
                          y={deckTopY - 6}
                          width={deckRightX - deckLeftX}
                          height="6"
                          fill="#334155"
                          stroke="#1e293b"
                          strokeWidth="1"
                        />

                        {/* Roadside Kerb Beams / Crash Barriers */}
                        <rect
                          x={deckLeftX - 4}
                          y={deckTopY - 26}
                          width="22"
                          height="26"
                          fill="url(#concrete-hatch)"
                          stroke="#1d4ed8"
                          strokeWidth="2"
                        />
                        <rect
                          x={deckRightX - 18}
                          y={deckTopY - 26}
                          width="22"
                          height="26"
                          fill="url(#concrete-hatch)"
                          stroke="#1d4ed8"
                          strokeWidth="2"
                        />

                        {/* Rebar Cage Overlay in Slab */}
                        {showRebarMesh && (
                          <g stroke="#ef4444" strokeWidth="1.5">
                            {/* Main Tension U-Bar Bottom */}
                            <path
                              d={`
                                M ${deckLeftX + 10} ${deckTopY + 12}
                                L ${deckLeftX + 10} ${deckBotY - 8}
                                L ${deckRightX - 10} ${deckBotY - 8}
                                L ${deckRightX - 10} ${deckTopY + 12}
                              `}
                              fill="none"
                              strokeDasharray="4 3"
                            />
                            {/* Top & Bottom Distribution Dots */}
                            {[0.25, 0.5, 0.75].map((frac, idx) => (
                              <g key={idx}>
                                <circle cx={deckLeftX + (deckRightX - deckLeftX) * frac} cy={deckBotY - 14} r="2.5" fill="#ef4444" />
                                <circle cx={deckLeftX + (deckRightX - deckLeftX) * frac} cy={deckTopY + 12} r="2.5" fill="#ef4444" />
                              </g>
                            ))}
                            {/* L-Cap Stirrup */}
                            <rect
                              x={leftInnerX - bearingPx + 6}
                              y={-hAbPx - lCapPx + 4}
                              width={bearingPx - 12}
                              height={lCapPx - 8}
                              fill="none"
                              stroke="#f59e0b"
                              strokeWidth="1.2"
                              strokeDasharray="2 2"
                            />
                            <rect
                              x={rightInnerX + 6}
                              y={-hAbPx - lCapPx + 4}
                              width={bearingPx - 12}
                              height={lCapPx - 8}
                              fill="none"
                              stroke="#f59e0b"
                              strokeWidth="1.2"
                              strokeDasharray="2 2"
                            />
                          </g>
                        )}

                        {/* Water Hydraulic Flow Level */}
                        {showWaterLevel && (
                          <g>
                            <rect
                              x={leftInnerX}
                              y={-hAbPx * 0.65}
                              width={sPx}
                              height={hAbPx * 0.65}
                              fill="#38bdf8"
                              fillOpacity="0.55"
                            />
                            <line
                              x1={leftInnerX}
                              y1={-hAbPx * 0.65}
                              x2={rightInnerX}
                              y2={-hAbPx * 0.65}
                              stroke="#0284c7"
                              strokeWidth="1.5"
                              strokeDasharray="4 2"
                            />
                            <text
                              x="0"
                              y={-hAbPx * 0.65 - 5}
                              fill="#0284c7"
                              textAnchor="middle"
                              fontSize="10"
                              fontWeight="bold"
                            >
                              ▼ FSL (Waterway Area = {(S * Hab * 0.65).toFixed(2)} m²)
                            </text>
                          </g>
                        )}

                        {/* Dimensions */}
                        {renderDimLine(leftInnerX, 22, rightInnerX, 22, `Clear Span S = ${S.toFixed(2)}m`, { x: 0, y: 14 })}
                        {renderDimLine(rightInnerX + wBotPx + 45, -hAbPx, rightInnerX + wBotPx + 45, 0, `Hab = ${Hab.toFixed(2)}m`, { x: 30, y: 0 }, true)}
                        {renderDimLine(deckLeftX, deckTopY - 35, deckRightX, deckTopY - 35, `Deck Slab Span = ${(S + 2 * bearingW).toFixed(2)}m`, { x: 0, y: -10 })}
                        {renderDimLine(leftInnerX - wTopPx - 25, deckTopY, leftInnerX - wTopPx - 25, deckBotY, `ts = ${tslab.toFixed(2)}m`, { x: -28, y: 0 }, true)}
                        {renderDimLine(leftInnerX - wTopPx, -hAbPx - 15, leftInnerX, -hAbPx - 15, `w_top = ${wtop.toFixed(2)}m`, { x: 0, y: -8 })}
                      </>
                    );
                  })()}
                </g>
              )}

              {/* HUME PIPE CULVERT */}
              {template.svg_type === 'pipe_culvert' && (
                <g transform="translate(400, 240)">
                  {(() => {
                    const D = p.pipe_diameter_m || 0.90;
                    const Np = p.no_of_pipe_rows || 1;
                    const tcrd = p.cradle_pcc_thickness || 0.20;

                    const scale = 110;
                    const dPx = D * scale;
                    const rPx = dPx / 2;
                    const tCrdPx = tcrd * scale;

                    return (
                      <>
                        {/* PCC Cradle Bedding */}
                        <path
                          d={`M ${-rPx - 25} ${rPx + tCrdPx} L ${rPx + 25} ${rPx + tCrdPx} L ${rPx + 25} 0 L ${rPx} 0 Q 0 ${rPx * 1.5} ${-rPx} 0 L ${-rPx - 25} 0 Z`}
                          fill="url(#concrete-hatch)"
                          stroke="#2563eb"
                          strokeWidth="2"
                        />

                        {/* Pipe Outer & Inner Walls */}
                        <circle cx="0" cy="0" r={rPx + 12} fill="#94a3b8" stroke="#1e293b" strokeWidth="2.5" />
                        <circle cx="0" cy="0" r={rPx} fill={isDark ? '#020617' : '#ffffff'} stroke="#0f172a" strokeWidth="2" />

                        {/* Water Flow inside Pipe */}
                        {showWaterLevel && (
                          <path
                            d={`M ${-rPx * 0.8} ${rPx * 0.2} A ${rPx} ${rPx} 0 0 0 ${rPx * 0.8} ${rPx * 0.2} Z`}
                            fill="#38bdf8"
                            fillOpacity="0.7"
                          />
                        )}

                        {/* Dimensions */}
                        {renderDimLine(-rPx, 0, rPx, 0, `Ø = ${D.toFixed(2)}m`, { x: 0, y: -10 })}
                      </>
                    );
                  })()}
                </g>
              )}

              {/* ROAD FLEXIBLE PAVEMENT */}
              {template.svg_type === 'road_flexible' && (
                <g transform="translate(400, 240)">
                  {(() => {
                    const Wcw = p.carriageway_width || 5.50;
                    const Wsh = p.shoulder_width_each || 1.00;
                    const tgsb = p.gsb_thickness || 0.15;
                    const twmm = p.wmm_thickness || 0.15;
                    const tdbm = p.dbm_thickness || 0.05;
                    const tac = p.ac_thickness || 0.03;
                    const camber = p.camber_percent || 2.5;

                    const scale = 50;
                    const wCwPx = Wcw * scale;
                    const wShPx = Wsh * scale;
                    const totalWPx = wCwPx + 2 * wShPx;

                    const tGsbPx = tgsb * 200;
                    const tWmmPx = twmm * 200;
                    const tDbmPx = tdbm * 300;
                    const tAcPx = tac * 400;

                    const crownH = (wCwPx / 2) * (camber / 100);

                    return (
                      <>
                        {/* Subgrade */}
                        <rect x={-totalWPx / 2 - 20} y="40" width={totalWPx + 40} height="80" fill="url(#earth-hatch)" stroke="#64748b" strokeWidth="1" />
                        <text x="0" y="85" fill={isDark ? '#cbd5e1' : '#475569'} textAnchor="middle" fontSize="11" fontWeight="bold">Compacted Subgrade (95% MDD)</text>

                        {/* GSB Layer */}
                        <polygon
                          points={`-${totalWPx / 2 + 10},40 -${totalWPx / 2 + 10},${40 - tGsbPx} ${totalWPx / 2 + 10},${40 - tGsbPx} ${totalWPx / 2 + 10},40`}
                          fill={isDark ? '#334155' : '#e2e8f0'}
                          stroke="#94a3b8"
                          strokeWidth="1.5"
                        />
                        <text x={-totalWPx / 2 + 30} y={40 - tGsbPx / 2 + 4} fill={isDark ? '#94a3b8' : '#475569'} fontSize="9" fontWeight="bold">GSB ({tgsb * 100}cm)</text>

                        {/* WMM Layer */}
                        <polygon
                          points={`-${wCwPx / 2 + 15},${40 - tGsbPx} -${wCwPx / 2 + 15},${40 - tGsbPx - tWmmPx} ${wCwPx / 2 + 15},${40 - tGsbPx - tWmmPx} ${wCwPx / 2 + 15},${40 - tGsbPx}`}
                          fill={isDark ? '#475569' : '#cbd5e1'}
                          stroke="#64748b"
                          strokeWidth="1.5"
                        />
                        <text x={-wCwPx / 2 + 25} y={40 - tGsbPx - tWmmPx / 2 + 4} fill={isDark ? '#e2e8f0' : '#1e293b'} fontSize="9" fontWeight="bold">WMM Base ({twmm * 100}cm)</text>

                        {/* Asphalt Layers */}
                        <polygon
                          points={`-${wCwPx / 2},${40 - tGsbPx - tWmmPx} 0,${40 - tGsbPx - tWmmPx - crownH} ${wCwPx / 2},${40 - tGsbPx - tWmmPx} ${wCwPx / 2},${40 - tGsbPx - tWmmPx - tDbmPx} 0,${40 - tGsbPx - tWmmPx - tDbmPx - crownH} -${wCwPx / 2},${40 - tGsbPx - tWmmPx - tDbmPx}`}
                          fill="#334155"
                          stroke="#0f172a"
                          strokeWidth="1.5"
                        />
                        <polygon
                          points={`-${wCwPx / 2},${40 - tGsbPx - tWmmPx - tDbmPx} 0,${40 - tGsbPx - tWmmPx - tDbmPx - crownH} ${wCwPx / 2},${40 - tGsbPx - tWmmPx - tDbmPx} ${wCwPx / 2},${40 - tGsbPx - tWmmPx - tDbmPx - tAcPx} 0,${40 - tGsbPx - tWmmPx - tDbmPx - tAcPx - crownH} -${wCwPx / 2},${40 - tGsbPx - tWmmPx - tDbmPx - tAcPx}`}
                          fill="#09090b"
                          stroke="#27272a"
                          strokeWidth="1.5"
                        />

                        {/* Road Centerline */}
                        <line x1="0" y1="-80" x2="0" y2="40" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 3" />
                        <text x="0" y="-85" fill="#ef4444" textAnchor="middle" fontSize="10" fontWeight="bold">℄ Road Centerline</text>

                        {/* Dimensions */}
                        {renderDimLine(-wCwPx / 2, -60, wCwPx / 2, -60, `Carriageway W = ${Wcw.toFixed(2)}m`, { x: 0, y: -10 })}
                        {renderDimLine(-totalWPx / 2, 135, totalWPx / 2, 135, `Formation Width = ${(Wcw + 2 * Wsh).toFixed(2)}m`, { x: 0, y: 15 })}
                      </>
                    );
                  })()}
                </g>
              )}

              {/* RIGID CONCRETE PAVEMENT */}
              {template.svg_type === 'road_rigid' && (
                <g transform="translate(400, 240)">
                  {(() => {
                    const Wslab = p.slab_width || 6.00;
                    const tdlc = p.dlc_thickness || 0.10;
                    const tpqc = p.pqc_thickness || 0.20;

                    const scale = 50;
                    const wPx = Wslab * scale;
                    const tDlcPx = tdlc * 250;
                    const tPqcPx = tpqc * 250;

                    return (
                      <>
                        <rect x={-wPx / 2 - 40} y="30" width={wPx + 80} height="60" fill="url(#earth-hatch)" stroke="#64748b" strokeWidth="1" />
                        <rect x={-wPx / 2 - 15} y={30 - tDlcPx} width={wPx + 30} height={tDlcPx} fill="url(#concrete-hatch)" stroke="#0284c7" strokeWidth="1.5" />
                        <rect x={-wPx / 2} y={30 - tDlcPx - tPqcPx} width={wPx} height={tPqcPx} fill="url(#concrete-hatch)" stroke="#2563eb" strokeWidth="2.5" />

                        {/* Dowel Bars */}
                        <line x1="-30" y1={30 - tDlcPx - tPqcPx / 2} x2="30" y2={30 - tDlcPx - tPqcPx / 2} stroke="#ef4444" strokeWidth="3" />
                        <text x="0" y={30 - tDlcPx - tPqcPx / 2 - 6} fill="#ef4444" textAnchor="middle" fontSize="9" fontWeight="bold">Ø25 Dowel Bar @ Contraction Joint</text>

                        {/* Dimensions */}
                        {renderDimLine(-wPx / 2, -60, wPx / 2, -60, `Slab Width = ${Wslab.toFixed(2)}m`, { x: 0, y: -10 })}
                        {renderDimLine(wPx / 2 + 30, 30 - tDlcPx - tPqcPx, wPx / 2 + 30, 30 - tDlcPx, `t_PQC = ${tpqc.toFixed(2)}m`, { x: 30, y: 0 }, true)}
                      </>
                    );
                  })()}
                </g>
              )}

              {/* RETAINING WALL */}
              {template.svg_type === 'retaining_wall' && (
                <g transform="translate(400, 240)">
                  {(() => {
                    const H = p.retaining_height_m || 3.50;
                    const btop = p.crest_top_width_m || 0.60;
                    const sf = p.front_batter_ratio || 0.167;
                    const sb = p.back_batter_ratio || 0.333;
                    const Df = p.foundation_depth_m || 1.20;
                    const tpcc = p.pcc_bed_thickness || 0.15;
                    const tsol = p.soling_thickness || 0.20;

                    const scale = 40;
                    const hPx = H * scale;
                    const bTopPx = btop * scale;
                    const dfPx = Df * scale;
                    const frontBatterPx = sf * hPx;
                    const backBatterPx = sb * hPx;
                    const tpccPx = tpcc * scale;
                    const tsolPx = tsol * scale;

                    const stemBaseWPx = bTopPx + frontBatterPx + backBatterPx;
                    const baseOffsetPx = 25;
                    const footingWPx = stemBaseWPx + 2 * baseOffsetPx;

                    return (
                      <>
                        {/* Earth Backfill behind wall */}
                        <polygon
                          points={`${-stemBaseWPx / 2 + frontBatterPx + bTopPx},${-hPx} ${300},${-hPx} ${300},${dfPx} ${stemBaseWPx / 2 + baseOffsetPx},${dfPx} ${stemBaseWPx / 2},0`}
                          fill="url(#earth-hatch)"
                          stroke="#94a3b8"
                          strokeWidth="1"
                        />
                        <text x="180" y={-hPx / 2} fill="#64748b" textAnchor="middle" fontSize="11" fontWeight="bold">Compacted Earth Backfill</text>

                        {/* Soling & PCC under footing */}
                        <rect x={-footingWPx / 2 - 10} y={dfPx + tpccPx} width={footingWPx + 20} height={tsolPx} fill="#ca8a04" opacity="0.6" stroke="#854d0e" strokeWidth="1" />
                        <rect x={-footingWPx / 2} y={dfPx} width={footingWPx} height={tpccPx} fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />

                        {/* Stepped Masonry Footing */}
                        <rect x={-footingWPx / 2} y="0" width={footingWPx} height={dfPx} fill="url(#masonry-hatch)" stroke="#d97706" strokeWidth="2.5" />

                        {/* Gravity Retaining Wall Stem */}
                        <polygon
                          points={`${-stemBaseWPx / 2},0 ${-stemBaseWPx / 2 + frontBatterPx},${-hPx} ${-stemBaseWPx / 2 + frontBatterPx + bTopPx},${-hPx} ${stemBaseWPx / 2},0`}
                          fill="url(#masonry-hatch)"
                          stroke="#d97706"
                          strokeWidth="3"
                        />

                        {/* Weep Holes */}
                        <line x1={-stemBaseWPx / 2 + 10} y1="-30" x2={stemBaseWPx / 2 - 10} y2="-20" stroke="#0284c7" strokeWidth="4" />
                        <text x="20" y="-35" fill="#0284c7" fontSize="9" fontWeight="bold">110mm Ø PVC Weep Hole</text>

                        {/* Dimensions */}
                        {renderDimLine(-stemBaseWPx / 2 + frontBatterPx, -hPx - 25, -stemBaseWPx / 2 + frontBatterPx + bTopPx, -hPx - 25, `Top = ${btop.toFixed(2)}m`, { x: 0, y: -8 })}
                        {renderDimLine(-stemBaseWPx / 2 - 35, -hPx, -stemBaseWPx / 2 - 35, 0, `H = ${H.toFixed(2)}m`, { x: -30, y: 0 }, true)}
                        {renderDimLine(-footingWPx / 2, dfPx + tpccPx + tsolPx + 20, footingWPx / 2, dfPx + tpccPx + tsolPx + 20, `Base = ${((stemBaseWPx + 2 * baseOffsetPx) / scale).toFixed(2)}m`, { x: 0, y: 15 })}
                      </>
                    );
                  })()}
                </g>
              )}

              {/* GABION RETAINING WALL */}
              {template.svg_type === 'gabion_wall' && (
                <g transform="translate(400, 240)">
                  {(() => {
                    const Ntiers = p.no_of_tiers || 3;
                    const Wbase = p.base_width_m || 3.00;
                    const Wtop = p.top_width_m || 1.00;
                    const Ht = p.tier_height_m || 1.00;

                    const scale = 50;
                    const htPx = Ht * scale;

                    return (
                      <>
                        {/* Crates stack */}
                        {Array.from({ length: Ntiers }).map((_, idx) => {
                          const tierW = Wbase - ((Wbase - Wtop) / (Ntiers - 1 || 1)) * idx;
                          const wPx = tierW * scale;
                          const yPos = -idx * htPx;

                          return (
                            <g key={idx}>
                              <rect
                                x={-wPx / 2}
                                y={yPos - htPx}
                                width={wPx}
                                height={htPx}
                                fill="url(#gabion-hatch)"
                                stroke="#059669"
                                strokeWidth="2.5"
                              />
                              <text x="0" y={yPos - htPx / 2 + 4} fill="#065f46" textAnchor="middle" fontSize="10" fontWeight="bold">
                                Tier {idx + 1} ({tierW.toFixed(1)}m × {Ht.toFixed(1)}m)
                              </text>
                            </g>
                          );
                        })}

                        {/* Dimensions */}
                        {renderDimLine(-Wbase * scale / 2, 25, Wbase * scale / 2, 25, `Base W = ${Wbase.toFixed(2)}m`, { x: 0, y: 15 })}
                      </>
                    );
                  })()}
                </g>
              )}
            </>
          )}
        </svg>
      </div>

      {/* Footer Info Strip */}
      <div
        className={`px-4 py-2 text-[11px] flex flex-wrap items-center justify-between border-t gap-2 ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100/80 border-slate-200 text-slate-600'
        }`}
      >
        <div className="flex items-center gap-1.5 font-medium">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>
            Standard: <strong className="text-slate-800 dark:text-slate-200">{template.standard_ref}</strong>
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] text-slate-500">
          <span>All dimensions in meters (m)</span>
          <span className="hidden sm:inline-block">•</span>
          <span className="hidden sm:inline-block">AutoCAD DXF R12 / SVG Vector Ready</span>
        </div>
      </div>
    </div>
  );
};
