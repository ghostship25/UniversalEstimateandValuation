import React, { useState, useMemo } from 'react';
import {
  Layers,
  Sliders,
  Calculator,
  FileSpreadsheet,
  Plus,
  Save,
  CheckCircle2,
  Share2,
  Printer,
  ChevronRight,
  BookOpen,
  Sparkles,
  ArrowRight,
  RefreshCw,
  FolderPlus,
  Compass,
  FileText,
  Building,
  Info,
  Check,
  Download,
  Activity,
  ShieldCheck,
  Coins,
  FileCheck,
  Wrench,
  BarChart3,
  MapPin,
  FileCode2,
  Table,
  Zap
} from 'lucide-react';
import {
  STANDARD_DRAWING_TEMPLATES,
  calculateTemplateWorkItems
} from './drawingTemplatesData';
import { TemplateCanvasDrawing } from './TemplateCanvasDrawing';
import { DrawingTemplateDef, TemplateWorkItemOutput } from '../../types';
import {
  calculateHydraulics,
  calculateWallStability,
  generateBarBendingSchedule,
  generateMultiStationChainages,
  estimateCostForItems,
  HydraulicAnalysisResult,
  StabilityAnalysisResult,
  BBSRebarItem,
  RDS_STANDARD_UNIT_RATES
} from './drawingAnalysisUtils';
import { generateCADSectionDXF } from './dxfExportUtils';
import { DynamicRebarShapeSvg } from '../../components/drawings/DynamicRebarShapeSvg';
import { BBSItem } from '../../types';
import { currencyCode } from '../../services/currency';

interface TemplateDrawingViewProps {
  onPushToMB?: (items: TemplateWorkItemOutput[], chainageOrLoc: string) => void;
}

export const TemplateDrawingView: React.FC<TemplateDrawingViewProps> = ({ onPushToMB }) => {
  // Active selected template
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(STANDARD_DRAWING_TEMPLATES[0].id);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<'takeoff' | 'analysis' | 'bbs' | 'stations' | 'cost' | 'sheet'>('takeoff');

  // Current dynamic parameter values
  const currentTemplate = useMemo(() => {
    return STANDARD_DRAWING_TEMPLATES.find((t) => t.id === selectedTemplateId) || STANDARD_DRAWING_TEMPLATES[0];
  }, [selectedTemplateId]);

  const [paramValues, setParamValues] = useState<Record<string, number>>(() => ({
    ...currentTemplate.dimension_params
  }));

  // Chainage reference input for MB mapping
  const [chainageRef, setChainageRef] = useState<string>('CH 0+000 to CH 0+100 (RHS)');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [activeHighlightItem, setActiveHighlightItem] = useState<string | null>(null);

  // Multi-station inputs
  const [multiStartCH, setMultiStartCH] = useState<number>(0);
  const [multiEndCH, setMultiEndCH] = useState<number>(500);
  const [multiInterval, setMultiInterval] = useState<number>(50);
  const [multiSide, setMultiSide] = useState<string>('RHS');

  // Hydraulic Analysis Settings
  const [bedSlopePercent, setBedSlopePercent] = useState<number>(1.0); // 1% default
  const [manningsCoeff, setManningsCoeff] = useState<number>(0.015);

  // When template changes, reset params to defaults
  const handleSelectTemplate = (tmpl: DrawingTemplateDef) => {
    setSelectedTemplateId(tmpl.id);
    setParamValues({ ...tmpl.dimension_params });
  };

  // Handle single param change
  const handleParamChange = (key: string, val: number) => {
    setParamValues((prev) => ({
      ...prev,
      [key]: val
    }));
  };

  // Reset to default
  const handleResetParams = () => {
    setParamValues({ ...currentTemplate.dimension_params });
  };

  // Run calculation engine
  const calculatedItems = useMemo(() => {
    return calculateTemplateWorkItems(currentTemplate, paramValues);
  }, [currentTemplate, paramValues]);

  // Run Engineering Checks
  const hydraulicResult = useMemo<HydraulicAnalysisResult | null>(() => {
    return calculateHydraulics(
      currentTemplate.svg_type,
      paramValues,
      bedSlopePercent / 100,
      manningsCoeff
    );
  }, [currentTemplate.svg_type, paramValues, bedSlopePercent, manningsCoeff]);

  const stabilityResult = useMemo<StabilityAnalysisResult | null>(() => {
    if (currentTemplate.svg_type === 'retaining_wall') {
      return calculateWallStability(paramValues);
    }
    return null;
  }, [currentTemplate.svg_type, paramValues]);

  const bbsSchedule = useMemo<BBSRebarItem[]>(() => {
    return generateBarBendingSchedule(currentTemplate.svg_type, paramValues);
  }, [currentTemplate.svg_type, paramValues]);

  const multiStations = useMemo(() => {
    return generateMultiStationChainages(
      currentTemplate,
      paramValues,
      multiStartCH,
      multiEndCH,
      multiInterval,
      multiSide
    );
  }, [currentTemplate, paramValues, multiStartCH, multiEndCH, multiInterval, multiSide]);

  const costEstimate = useMemo(() => {
    return estimateCostForItems(calculatedItems);
  }, [calculatedItems]);

  // Categories list matching standard template data
  const categories = [
    { id: 'all', label: 'All Templates' },
    { id: 'Drain', label: 'Drains & Channels' },
    { id: 'Culvert', label: 'Culverts & Bridges' },
    { id: 'Road Section', label: 'Road Sections' },
    { id: 'Retaining Structure', label: 'Retaining Structures' }
  ];

  const filteredTemplates = STANDARD_DRAWING_TEMPLATES.filter((t) => {
    if (selectedCategory === 'all') return true;
    return t.category === selectedCategory;
  });

  // Push single reach to MB
  const handlePushToMB = () => {
    if (onPushToMB) {
      onPushToMB(calculatedItems, chainageRef);
      setSuccessToast(`Successfully transferred ${calculatedItems.length} work items to Measurement Book for ${chainageRef}!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } else {
      setSuccessToast(`Generated ${calculatedItems.length} detailed MB calculation records for ${chainageRef}`);
      setTimeout(() => setSuccessToast(null), 4000);
    }
  };

  // Push all multi-station intervals to MB
  const handlePushAllStationsToMB = () => {
    if (onPushToMB) {
      let totalPushed = 0;
      multiStations.forEach((station) => {
        const segParams = {
          ...paramValues,
          reach_length: station.lengthM,
          road_length_m: station.lengthM,
          wall_length_m: station.lengthM,
          pipe_length_m: station.lengthM
        };
        const stationItems = calculateTemplateWorkItems(currentTemplate, segParams);
        onPushToMB(stationItems, `${station.chainageFrom} to ${station.chainageTo}`);
        totalPushed += stationItems.length;
      });

      setSuccessToast(`Transferred all ${multiStations.length} stations (${totalPushed} records) to Measurement Book!`);
      setTimeout(() => setSuccessToast(null), 4500);
    }
  };

  // Export CSV summary
  const handleExportCSV = () => {
    const headers = ['Item No', 'Description of Work', 'Unit', 'Total Quantity', 'Quantity per Unit Length', 'Formula Particulars'];
    const rows = calculatedItems.map((item, idx) => [
      idx + 1,
      `"${item.item_name}"`,
      item.unit,
      item.calculated_quantity,
      item.unit_rate_qty ?? '',
      `"${item.particulars_template}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${currentTemplate.id}_quantity_takeoff.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export DXF
  const handleExportDXF = () => {
    const dxf = generateCADSectionDXF(currentTemplate, paramValues);
    const blob = new Blob([dxf], { type: 'application/dxf;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTemplate.id}_cad_drawing.dxf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Banner */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Compass className="w-7 h-7 text-blue-600" />
            Template Drawings & Dimension Quantity Engine
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Parametric cross-section templates with real-time CAD visualization, hydraulic/structural checks, BBS, and instant Measurement Book (MB) mapping for Roads & Buildings Dept. civil works.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportDXF}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 transition flex items-center gap-1.5 shadow-sm"
          >
            <FileCode2 className="w-4 h-4 text-emerald-600" />
            Export DXF
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export CSV
          </button>
          <button
            onClick={handlePushToMB}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition flex items-center gap-2 shadow-sm shadow-blue-500/25"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Transfer to MB
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template Selector Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {filteredTemplates.map((tmpl) => {
          const isSelected = tmpl.id === selectedTemplateId;
          return (
            <button
              key={tmpl.id}
              onClick={() => handleSelectTemplate(tmpl)}
              className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between relative group ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tmpl.code}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium capitalize">
                    {tmpl.category}
                  </span>
                </div>
                <div className="font-bold text-xs text-slate-800 line-clamp-2 leading-tight">
                  {tmpl.name}
                </div>
              </div>

              <div className="mt-2 text-[10px] text-slate-500 line-clamp-1">
                {tmpl.standard_ref}
              </div>

              {isSelected && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600 ring-4 ring-blue-200" />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Parameters & Dimension Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Parametric Dimensions</h3>
              </div>
              <button
                onClick={handleResetParams}
                className="text-xs text-slate-500 hover:text-blue-600 font-medium flex items-center gap-1 transition"
                title="Reset to default dimensions"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>

            {/* Chainage / Location Reference Box */}
            <div className="space-y-1.5 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
              <label className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                Chainage / Location Reference (MB Tag)
              </label>
              <input
                type="text"
                value={chainageRef}
                onChange={(e) => setChainageRef(e.target.value)}
                placeholder="e.g. CH 0+000 to CH 0+150 (LHS)"
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-blue-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Dynamic Slider & Input Controls */}
            <div className="space-y-3.5 max-h-[440px] overflow-y-auto pr-1">
              {currentTemplate.param_definitions.map((def) => {
                const val = paramValues[def.key] ?? def.default_val ?? def.default_value ?? 0;

                return (
                  <div key={def.key} className="space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                          {def.symbol}
                        </span>
                        {def.label}
                      </span>
                      <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">
                        {val} {def.unit}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={def.min ?? 0}
                        max={def.max ?? 100}
                        step={def.step ?? 0.05}
                        value={val}
                        onChange={(e) => handleParamChange(def.key, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <input
                        type="number"
                        min={def.min ?? 0}
                        max={def.max ?? 100}
                        step={def.step ?? 0.05}
                        value={val}
                        onChange={(e) => handleParamChange(def.key, parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {def.description && (
                      <p className="text-[10px] text-slate-500 leading-tight">{def.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Canvas & Sub-Tab Modules (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Real-time CAD Canvas */}
          <TemplateCanvasDrawing
            template={currentTemplate}
            params={paramValues}
            activeItemHighlight={activeHighlightItem}
          />

          {/* Feature Sub-Tabs Navigation */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex border-b overflow-x-auto bg-slate-50/70 p-1.5 gap-1 text-xs font-bold">
              <button
                onClick={() => setActiveSubTab('takeoff')}
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition whitespace-nowrap ${
                  activeSubTab === 'takeoff'
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span>Quantity Takeoff & MB</span>
                <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black">
                  {calculatedItems.length}
                </span>
              </button>

              <button
                onClick={() => setActiveSubTab('analysis')}
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition whitespace-nowrap ${
                  activeSubTab === 'analysis'
                    ? 'bg-white text-cyan-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Activity className="w-4 h-4 text-cyan-600" />
                <span>Hydraulics & Checks</span>
              </button>

              {bbsSchedule.length > 0 && (
                <button
                  onClick={() => setActiveSubTab('bbs')}
                  className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition whitespace-nowrap ${
                    activeSubTab === 'bbs'
                      ? 'bg-white text-rose-700 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Wrench className="w-4 h-4 text-rose-600" />
                  <span>Rebar BBS</span>
                </button>
              )}

              <button
                onClick={() => setActiveSubTab('stations')}
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition whitespace-nowrap ${
                  activeSubTab === 'stations'
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span>Multi-Station MB</span>
              </button>

              <button
                onClick={() => setActiveSubTab('cost')}
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition whitespace-nowrap ${
                  activeSubTab === 'cost'
                    ? 'bg-white text-amber-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Coins className="w-4 h-4 text-amber-600" />
                <span>Roads Dept. Cost Estimate</span>
              </button>

              <button
                onClick={() => setActiveSubTab('sheet')}
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition whitespace-nowrap ${
                  activeSubTab === 'sheet'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <FileCheck className="w-4 h-4 text-slate-700" />
                <span>CAD Sheet</span>
              </button>
            </div>

            {/* Sub-Tab 1: Quantity Takeoff & MB Items */}
            {activeSubTab === 'takeoff' && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Calculated Bill of Quantities (MB Output)</span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Reach: <strong>{paramValues.reach_length || paramValues.road_length_m || paramValues.wall_length_m || paramValues.barrel_length || 100}m</strong>
                  </span>
                </div>

                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Description of Work Item</th>
                        <th className="py-2.5 px-3 text-center">Unit</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3 text-right">Qty / m</th>
                        <th className="py-2.5 px-3">Formula / Dimensions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {calculatedItems.map((item, idx) => (
                        <tr
                          key={item.id}
                          className="hover:bg-blue-50/40 transition group cursor-pointer"
                          onMouseEnter={() => setActiveHighlightItem(item.id)}
                          onMouseLeave={() => setActiveHighlightItem(null)}
                        >
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            <div>{item.item_name}</div>
                            {item.dor_item_no && (
                              <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1 rounded">
                                {item.dor_item_no}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded">{item.unit}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-blue-700 text-xs">
                            {item.calculated_quantity.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500 text-[11px]">
                            {item.unit_rate_qty ? item.unit_rate_qty.toFixed(3) : '-'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            {item.calc_formula_desc}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-Tab 2: Hydraulics & Structural Stability Checks */}
            {activeSubTab === 'analysis' && (
              <div className="p-4 space-y-4">
                {hydraulicResult && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-cyan-600" />
                        Manning's Open Channel Flow & Hydraulic Discharge Analysis
                      </h4>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-slate-500">Bed Slope (S):</label>
                        <select
                          value={bedSlopePercent}
                          onChange={(e) => setBedSlopePercent(parseFloat(e.target.value))}
                          className="text-xs font-bold bg-slate-100 border border-slate-200 rounded px-2 py-0.5"
                        >
                          <option value={0.5}>0.5% (1 in 200)</option>
                          <option value={1.0}>1.0% (1 in 100)</option>
                          <option value={2.0}>2.0% (1 in 50)</option>
                          <option value={0.2}>0.2% (1 in 500)</option>
                        </select>
                      </div>
                    </div>

                    {/* Hydraulic KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-cyan-50/70 border border-cyan-200 rounded-xl">
                        <span className="text-[10px] text-cyan-700 uppercase font-bold block">Waterway Area (A)</span>
                        <span className="text-lg font-mono font-black text-cyan-900">{hydraulicResult.waterwayArea} m²</span>
                      </div>
                      <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                        <span className="text-[10px] text-blue-700 uppercase font-bold block">Hydraulic Radius (R)</span>
                        <span className="text-lg font-mono font-black text-blue-900">{hydraulicResult.hydraulicRadius} m</span>
                      </div>
                      <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                        <span className="text-[10px] text-indigo-700 uppercase font-bold block">Flow Velocity (V)</span>
                        <span className="text-lg font-mono font-black text-indigo-900">{hydraulicResult.flowVelocity} m/s</span>
                      </div>
                      <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                        <span className="text-[10px] text-emerald-700 uppercase font-bold block">Discharge (Q)</span>
                        <span className="text-lg font-mono font-black text-emerald-900">{hydraulicResult.dischargeM3s} m³/s</span>
                        <span className="text-[10px] text-emerald-600 block">({hydraulicResult.dischargeLps} L/s)</span>
                      </div>
                    </div>

                    {/* Velocity Status Banner */}
                    <div
                      className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
                        hydraulicResult.velocityStatus === 'safe'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium'
                          : hydraulicResult.velocityStatus === 'warning_silting'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>{hydraulicResult.velocityMessage}</span>
                      <span className="ml-auto font-mono text-[10px] px-2 py-0.5 bg-white rounded border">
                        {hydraulicResult.flowRegime}
                      </span>
                    </div>
                  </div>
                )}

                {/* Retaining Wall Stability Report */}
                {stabilityResult && (
                  <div className="space-y-3 pt-2">
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5 border-b pb-2">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      Rankine Gravity Retaining Wall Stability Analysis
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Overturning Factor (FSO)</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-lg font-mono font-black text-slate-800">{stabilityResult.factorOfSafetyOverturning}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stabilityResult.isOverturningSafe ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {stabilityResult.isOverturningSafe ? 'SAFE (≥2.0)' : 'UNSAFE'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Sliding Factor (FSS)</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-lg font-mono font-black text-slate-800">{stabilityResult.factorOfSafetySliding}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stabilityResult.isSlidingSafe ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {stabilityResult.isSlidingSafe ? 'SAFE (≥1.5)' : 'UNSAFE'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Max Base Pressure (q_max)</span>
                        <span className="text-lg font-mono font-black text-slate-800">{stabilityResult.maxBasePressure_kPa} kPa</span>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Weight (W)</span>
                        <span className="text-lg font-mono font-black text-slate-800">{stabilityResult.totalWeight_kN} kN/m</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sub-Tab 3: Bar Bending Schedule (BBS) */}
            {activeSubTab === 'bbs' && (
              <div className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <Table className="w-4 h-4 text-blue-600" />
                      Dynamic Bar Bending Schedule (IS:2502 / BS:8666 & Roads Dept. Standards)
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Straight segments A, B, C, D, E, F, bend deductions, and bar counts automatically linked to parametric dimensions.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-rose-700 font-bold bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
                      Total Steel: {bbsSchedule.reduce((s, b) => s + b.totalWeightKg, 0).toFixed(1)} kg ({ (bbsSchedule.reduce((s, b) => s + b.totalWeightKg, 0) / 1000).toFixed(3) } MT)
                    </span>
                    {onPushToMB && (
                      <button
                        onClick={() => {
                          const totalSteelKg = bbsSchedule.reduce((s, b) => s + b.totalWeightKg, 0);
                          const totalSteelMT = totalSteelKg / 1000;
                          const steelItems: TemplateWorkItemOutput[] = [
                            {
                              id: 'rebar_fe500',
                              item_name: `Providing, fabricating and laying TMT Fe500 reinforcement steel in ${currentTemplate.name}`,
                              unit: 'MT',
                              calc_formula_desc: `Bar Bending Schedule (${bbsSchedule.length} bar marks) = ${totalSteelKg.toFixed(1)} kg`,
                              calculated_quantity: Number(totalSteelMT.toFixed(3)),
                              unit_rate_qty: Number(totalSteelMT.toFixed(3)),
                              no_of_units: 1,
                              length_val: '-',
                              breadth_val: '-',
                              height_val: '-',
                              particulars_template: `Bar Bending Schedule (${bbsSchedule.length} bar marks: ${bbsSchedule.map(b => b.barMark).join(', ')}) = ${totalSteelKg.toFixed(1)} kg`,
                              category: 'Rebar'
                            }
                          ];
                          onPushToMB(steelItems, `BBS Steel - ${currentTemplate.name}`);
                          setSuccessToast(`Transferred ${totalSteelKg.toFixed(1)} kg (${totalSteelMT.toFixed(3)} MT) Reinforcement Steel to Measurement Book!`);
                          setTimeout(() => setSuccessToast(null), 4000);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors shadow-sm text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Push Steel to MB
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto border rounded-xl shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Mark</th>
                        <th className="py-2.5 px-3">Bar Description & Shape</th>
                        <th className="py-2.5 px-3 text-center">Dia (Ø)</th>
                        <th className="py-2.5 px-3 text-center">Spacing</th>
                        <th className="py-2.5 px-3">Segments (A, B, C, D, E, F) & Formula</th>
                        <th className="py-2.5 px-3 text-right">Cut L (m)</th>
                        <th className="py-2.5 px-3 text-right">No.</th>
                        <th className="py-2.5 px-3 text-right">Total L (m)</th>
                        <th className="py-2.5 px-3 text-right">Weight (kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {bbsSchedule.map((bar) => {
                        const mockBbsItem: BBSItem = {
                          id: bar.barMark,
                          structure_name: currentTemplate.name,
                          component: 'Deck Slab',
                          bar_mark: bar.barMark,
                          bar_diameter_mm: bar.diameterMm,
                          shape_type: bar.shapeType || 'STRAIGHT',
                          shape_code: bar.shapeCode || '00',
                          shape_name: bar.shapeDescription,
                          no_of_elements: 1,
                          bars_per_element: bar.noOfBars,
                          length_a_m: bar.segmentA_m || 0,
                          length_b_m: bar.segmentB_m,
                          length_c_m: bar.segmentC_m,
                          length_d_m: bar.segmentD_m,
                          length_e_m: bar.segmentE_m,
                          length_f_m: bar.segmentF_m,
                          cutting_length_m: bar.cuttingLengthM,
                          total_length_m: bar.totalLengthM,
                          unit_weight_kg_per_m: bar.unitWeightKgM,
                          total_weight_kg: bar.totalWeightKg,
                          total_weight_tonnes: bar.totalWeightKg / 1000,
                          formula_cutting_length_desc: bar.formulaExpression || '',
                          formula_nos_desc: bar.dimensionDriverDesc || ''
                        };

                        return (
                          <tr key={bar.barMark} className="hover:bg-blue-50/40 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-black text-blue-700 align-top">
                              <div className="flex flex-col gap-1">
                                <span>{bar.barMark}</span>
                                {bar.shapeCode && (
                                  <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border font-mono">
                                    Code {bar.shapeCode}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-800 align-top">
                              <div>{bar.description}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">{bar.shapeDescription}</div>
                              <div className="mt-1.5 bg-slate-50 p-1 rounded border inline-block">
                                <DynamicRebarShapeSvg item={mockBbsItem} width={130} height={45} theme="light" showLabels={false} />
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 align-top">
                              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-black">
                                Ø{bar.diameterMm}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-600 align-top">
                              @{bar.spacingMm}mm
                            </td>
                            <td className="py-2.5 px-3 text-xs align-top">
                              <div className="font-mono text-[11px] text-slate-700 flex flex-wrap gap-1">
                                {bar.segmentA_m !== undefined && (
                                  <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                                    A: {bar.segmentA_m}m
                                  </span>
                                )}
                                {bar.segmentB_m !== undefined && (
                                  <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                                    B: {bar.segmentB_m}m
                                  </span>
                                )}
                                {bar.segmentC_m !== undefined && (
                                  <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                                    C: {bar.segmentC_m}m
                                  </span>
                                )}
                                {bar.segmentD_m !== undefined && (
                                  <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                                    D: {bar.segmentD_m}m
                                  </span>
                                )}
                                {bar.segmentE_m !== undefined && (
                                  <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                                    E: {bar.segmentE_m}m
                                  </span>
                                )}
                                {bar.segmentF_m !== undefined && (
                                  <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                                    F: {bar.segmentF_m}m
                                  </span>
                                )}
                              </div>
                              {bar.formulaExpression && (
                                <div className="text-[10px] text-slate-500 font-mono mt-1">
                                  Cut: {bar.formulaExpression}
                                </div>
                              )}
                              {bar.dimensionDriverDesc && (
                                <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                                  Driver: {bar.dimensionDriverDesc}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 align-top">
                              {bar.cuttingLengthM.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-blue-700 align-top">
                              {bar.noOfBars}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600 align-top">
                              {bar.totalLengthM.toFixed(1)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-rose-700 align-top">
                              {bar.totalWeightKg.toFixed(1)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-Tab 4: Multi-Station Chainage MB Generator */}
            {activeSubTab === 'stations' && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500">Start Chainage (m)</label>
                    <input
                      type="number"
                      value={multiStartCH}
                      onChange={(e) => setMultiStartCH(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-mono font-bold px-2 py-1 bg-white border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500">End Chainage (m)</label>
                    <input
                      type="number"
                      value={multiEndCH}
                      onChange={(e) => setMultiEndCH(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-mono font-bold px-2 py-1 bg-white border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500">Station Interval</label>
                    <select
                      value={multiInterval}
                      onChange={(e) => setMultiInterval(parseFloat(e.target.value))}
                      className="w-full text-xs font-mono font-bold px-2 py-1 bg-white border rounded"
                    >
                      <option value={20}>Every 20m</option>
                      <option value={25}>Every 25m</option>
                      <option value={50}>Every 50m</option>
                      <option value={100}>Every 100m</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500">Side Tag</label>
                    <select
                      value={multiSide}
                      onChange={(e) => setMultiSide(e.target.value)}
                      className="w-full text-xs font-mono font-bold px-2 py-1 bg-white border rounded"
                    >
                      <option value="RHS">Right Hand Side (RHS)</option>
                      <option value="LHS">Left Hand Side (LHS)</option>
                      <option value="Both">Both Sides (B/S)</option>
                      <option value="Center">Centerline (CL)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Generated Stations ({multiStations.length} Segments)</span>
                  <button
                    onClick={handlePushAllStationsToMB}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 transition text-xs shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Push All {multiStations.length} Stations to MB
                  </button>
                </div>

                <div className="overflow-x-auto border rounded-xl max-h-[220px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b text-slate-600 font-bold uppercase text-[10px] sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Station #</th>
                        <th className="py-2 px-3">Chainage Range</th>
                        <th className="py-2 px-3 text-right">Length (m)</th>
                        <th className="py-2 px-3">MB Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {multiStations.map((st) => (
                        <tr key={st.stationIndex} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-indigo-600">Station {st.stationIndex}</td>
                          <td className="py-2 px-3 font-medium text-slate-800">{st.chainageFrom} to {st.chainageTo}</td>
                          <td className="py-2 px-3 text-right">{st.lengthM}m</td>
                          <td className="py-2 px-3 text-[11px] text-emerald-600 font-sans font-semibold">Ready for MB entry</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-Tab 5: Roads Dept. Cost Estimate & Rate Analysis */}
            {activeSubTab === 'cost' && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-amber-600" />
                      Roads Dept. Zone Rate Analysis Cost Baseline
                    </h4>
                    <span className="text-[11px] text-slate-500">Government approved zone rate norms (FY 2026/27)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Estimated Cost</span>
                    <span className="text-base font-black text-amber-700 font-mono">
                      {currencyCode()} {costEstimate.totalCostValue.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 block">
                      ({currencyCode()} {costEstimate.costPerMeterValue.toLocaleString()} / meter)
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Item Description</th>
                        <th className="py-2 px-3 text-center">Unit</th>
                        <th className="py-2 px-3 text-right">Quantity</th>
                        <th className="py-2 px-3 text-right">Rate ({currencyCode()})</th>
                        <th className="py-2 px-3 text-right">Amount ({currencyCode()})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {costEstimate.itemizedCosts.map((it) => (
                        <tr key={it.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-medium text-slate-900">{it.itemName}</td>
                          <td className="py-2 px-3 text-center font-mono">{it.unit}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">{it.quantity.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">{it.unitRate.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono font-black text-slate-900">{it.amountValue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-Tab 6: CAD Sheet Print Layout */}
            {activeSubTab === 'sheet' && (
              <div className="p-4 space-y-4">
                <div className="border-2 border-slate-900 rounded-xl p-4 bg-white text-slate-900 space-y-4 font-sans print:p-0">
                  {/* Sheet Header & Border */}
                  <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Government / Local Infrastructure Office</div>
                      <div className="text-base font-black uppercase text-slate-900">{currentTemplate.name}</div>
                    </div>
                    <div className="text-right border-l-2 border-slate-900 pl-4">
                      <div className="text-[10px] font-mono text-slate-500">DRAWING NO:</div>
                      <div className="text-sm font-black font-mono text-blue-700">{currentTemplate.code}-01</div>
                      <div className="text-[10px] text-slate-500">SCALE: 1:20 (NTS)</div>
                    </div>
                  </div>

                  {/* Key Dimensions Box */}
                  <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-2.5 rounded border border-slate-200 font-mono">
                    <div>Reach: <strong>{paramValues.reach_length || paramValues.road_length_m || paramValues.wall_length_m || paramValues.barrel_length || 100}m</strong></div>
                    <div>Standard: <strong>{currentTemplate.standard_ref}</strong></div>
                    <div>Date: <strong>{new Date().toLocaleDateString()}</strong></div>
                  </div>

                  {/* Print Action */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition"
                    >
                      <Printer className="w-4 h-4" />
                      Print CAD Engineering Sheet
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
