import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  FileSpreadsheet,
  Ruler,
  Hash,
  Type,
  Eye,
  CheckCircle2,
  Table,
  Palette
} from 'lucide-react';
import {
  AppFormatConfig,
  DEFAULT_FORMAT_CONFIG,
  FORMAT_PRESETS,
  loadFormatPreferences,
  saveFormatPreferences,
  TableDensity,
  BaseFontSize,
  CurrencySymbol,
  NumberSystem,
  GridlineStyle,
  HeaderBannerStyle,
  ZeroDisplay,
  MBLayoutType,
  MBRoundingMode,
  MBDeductionStyle,
  MBSubtotalFrequency,
  MBDimensionUnits,
  formatCurrencyValue,
  formatMeasurementQuantity,
} from '../services/formatPreferences';
import { currencyCode, COMMON_CURRENCIES } from '../services/currency';

interface DisplayMBFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplied?: (config: AppFormatConfig) => void;
  initialTab?: 'display' | 'mb' | 'presets';
}

export const DisplayMBFormatModal: React.FC<DisplayMBFormatModalProps> = ({
  isOpen,
  onClose,
  onApplied,
  initialTab = 'display',
}) => {
  const [activeTab, setActiveTab] = useState<'display' | 'mb' | 'presets'>(initialTab);
  const [config, setConfig] = useState<AppFormatConfig>(DEFAULT_FORMAT_CONFIG);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(loadFormatPreferences());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (presetKey: string) => {
    const preset = FORMAT_PRESETS[presetKey];
    if (preset) {
      setConfig(preset.config);
    }
  };

  const handleSaveAndApply = () => {
    saveFormatPreferences(config);
    setSavedSuccess(true);
    if (onApplied) onApplied(config);
    setTimeout(() => {
      onClose();
    }, 450);
  };

  const handleResetToDefault = () => {
    setConfig(DEFAULT_FORMAT_CONFIG);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#1e3a8a] border-b-2 border-red-600 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/30 rounded-xl text-emerald-400 border border-emerald-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Format Manager &amp; Customizer</h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-400/30">
                  Displays &amp; MB
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Customize the presentation format of displays, tables, numbers, and Measurement Books (MB)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 pt-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('display')}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'display'
                  ? 'bg-white text-blue-700 border-t-2 border-l border-r border-slate-200 border-t-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              1. Format of Displays
            </button>
            <button
              onClick={() => setActiveTab('mb')}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'mb'
                  ? 'bg-white text-purple-700 border-t-2 border-l border-r border-slate-200 border-t-purple-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              2. Format of MBs (Measurement Books)
            </button>
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'presets'
                  ? 'bg-white text-emerald-700 border-t-2 border-l border-r border-slate-200 border-t-emerald-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              3. Quick Presets
            </button>
          </div>

          <button
            onClick={handleResetToDefault}
            className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 hover:underline cursor-pointer mb-1"
            title="Reset to default format"
          >
            <RotateCcw className="w-3 h-3" /> Reset Defaults
          </button>
        </div>

        {/* Content Body & Live Preview */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-100/50">
          {/* Controls Column */}
          <div className="lg:col-span-6 space-y-5">
            {/* TAB 1: FORMAT OF DISPLAYS */}
            {activeTab === 'display' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Table className="w-3.5 h-3.5 text-blue-600" />
                    Table Density &amp; Typography
                  </h4>

                  {/* Table Density */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Table Row Density (Spacing):
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['compact', 'standard', 'spacious'] as TableDensity[]).map((d) => (
                        <button
                          key={d}
                          onClick={() => setConfig((c) => ({ ...c, display: { ...c.display, tableDensity: d } }))}
                          className={`py-1.5 px-2 text-xs font-semibold rounded-lg border text-center transition cursor-pointer capitalize ${
                            config.display.tableDensity === d
                              ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-xs font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Base Font Size */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Base Font Size:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['small', 'medium', 'large'] as BaseFontSize[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => setConfig((c) => ({ ...c, display: { ...c.display, fontSize: s } }))}
                          className={`py-1.5 px-2 text-xs font-semibold rounded-lg border text-center transition cursor-pointer capitalize ${
                            config.display.fontSize === s
                              ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-xs font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                          }`}
                        >
                          {s === 'small' ? 'Compact (11px)' : s === 'medium' ? 'Standard (13px)' : 'Large (15px)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gridlines Style */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Gridlines &amp; Borders:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { id: 'excel', label: 'Excel Classic Grid', desc: 'Crisp borders on all cells' },
                        { id: 'subtle', label: 'Subtle Dividers', desc: 'Clean horizontal lines' },
                        { id: 'zebra', label: 'Zebra Striping', desc: 'Alternating row colors' },
                        { id: 'minimal', label: 'Minimalist Clean', desc: 'Lightweight layout' },
                      ] as { id: GridlineStyle; label: string; desc: string }[]).map((g) => (
                        <button
                          key={g.id}
                          onClick={() => setConfig((c) => ({ ...c, display: { ...c.display, gridlineStyle: g.id } }))}
                          className={`p-2 text-left rounded-lg border transition cursor-pointer ${
                            config.display.gridlineStyle === g.id
                              ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                          }`}
                        >
                          <div className="text-xs font-bold">{g.label}</div>
                          <div className="text-[10px] text-slate-500 leading-tight">{g.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-emerald-600" />
                    Currency &amp; Number Formats
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Currency Symbol */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Currency Symbol:</label>
                      <input
                        list="uev-currency-list-mb"
                        type="text"
                        value={config.display.currencySymbol}
                        maxLength={8}
                        onChange={(e) => setConfig((c) => ({ ...c, display: { ...c.display, currencySymbol: e.target.value.toUpperCase() || 'USD' } }))}
                        className="w-full px-2 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-white text-slate-800"
                        placeholder="USD, EUR, GBP..."
                      />
                      <datalist id="uev-currency-list-mb">
                        {COMMON_CURRENCIES.map((c) => (<option key={c} value={c} />))}
                      </datalist>
                    </div>

                    {/* Number System */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Number System:</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {([
                          { id: 'international', label: 'International', eg: '125,000' },
                          { id: 'south_asian', label: 'Lakh/Crore', eg: '1,25,000' },
                        ] as { id: NumberSystem; label: string; eg: string }[]).map((ns) => (
                          <button
                            key={ns.id}
                            onClick={() => setConfig((c) => ({ ...c, display: { ...c.display, numberSystem: ns.id } }))}
                            className={`py-1 text-center rounded-lg border transition cursor-pointer ${
                              config.display.numberSystem === ns.id
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                            }`}
                          >
                            <div className="text-xs font-bold">{ns.label}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{ns.eg}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Header Banner Style */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Header Banner Display:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { id: 'official', label: 'Official Seal' },
                        { id: 'corporate', label: 'Executive Blue Banner' },
                        { id: 'clean', label: 'Clean Borderless' },
                      ] as { id: HeaderBannerStyle; label: string }[]).map((hb) => (
                        <button
                          key={hb.id}
                          onClick={() => setConfig((c) => ({ ...c, display: { ...c.display, headerBannerStyle: hb.id } }))}
                          className={`py-1.5 px-2 text-xs font-semibold rounded-lg border text-center transition cursor-pointer ${
                            config.display.headerBannerStyle === hb.id
                              ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-xs font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                          }`}
                        >
                          {hb.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Zero display */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Display for Zero / Nil Values:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { id: 'dash', label: 'Hyphen (-)' },
                        { id: 'zero', label: 'Numeric (0.00)' },
                        { id: 'blank', label: 'Blank Space' },
                      ] as { id: ZeroDisplay; label: string }[]).map((z) => (
                        <button
                          key={z.id}
                          onClick={() => setConfig((c) => ({ ...c, display: { ...c.display, zeroDisplay: z.id } }))}
                          className={`py-1.5 px-2 text-xs font-semibold rounded-lg border text-center transition cursor-pointer ${
                            config.display.zeroDisplay === z.id
                              ? 'bg-slate-200 border-slate-400 text-slate-900 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                          }`}
                        >
                          {z.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: FORMAT OF MBS (MEASUREMENT BOOKS) */}
            {activeTab === 'mb' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-extrabold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-purple-600" />
                    MB Table Layout &amp; Dimension Structure
                  </h4>

                  {/* MB Layout Type */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Measurement Table Layout:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        {
                          id: 'standard_8_col',
                          label: 'Standard 8-Column MB',
                          desc: 'Item | Particulars | No | L | B | H | Qty | Unit',
                        },
                        {
                          id: 'linear_chainage',
                          label: 'Road Chainage Linear MB',
                          desc: 'Chainage (From - To) | Length | Width | Thickness',
                        },
                        {
                          id: 'surface_area',
                          label: 'Area / Surface MB',
                          desc: 'Item | Particulars | No | Length | Breadth | Area (m²)',
                        },
                        {
                          id: 'sectional_station',
                          label: 'Section / Station MB',
                          desc: 'Station | Distance | Area | Mean Area | Volume',
                        },
                      ] as { id: MBLayoutType; label: string; desc: string }[]).map((layout) => (
                        <button
                          key={layout.id}
                          onClick={() => setConfig((c) => ({ ...c, mb: { ...c.mb, layoutType: layout.id } }))}
                          className={`p-2.5 text-left rounded-lg border transition cursor-pointer ${
                            config.mb.layoutType === layout.id
                              ? 'bg-purple-50 border-purple-500 text-purple-950 shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                          }`}
                        >
                          <div className="text-xs font-bold">{layout.label}</div>
                          <div className="text-[10.5px] text-slate-500 font-mono mt-0.5">{layout.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Precision & Rounding */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Measurement Precision:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[2, 3, 4].map((p) => (
                          <button
                            key={p}
                            onClick={() => setConfig((c) => ({ ...c, mb: { ...c.mb, precision: p } }))}
                            className={`py-1.5 text-xs font-bold rounded-lg border text-center transition cursor-pointer ${
                              config.mb.precision === p
                                ? 'bg-purple-100 border-purple-600 text-purple-900 shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                            }`}
                          >
                            {p} Decimals
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        (3 decimals is standard for m³ earthwork/concrete)
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Rounding Mode:
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {([
                          { id: 'round', label: 'Math Round' },
                          { id: 'truncate', label: 'Strict Truncate' },
                        ] as { id: MBRoundingMode; label: string }[]).map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setConfig((c) => ({ ...c, mb: { ...c.mb, roundingMode: m.id } }))}
                            className={`py-1.5 text-xs font-bold rounded-lg border text-center transition cursor-pointer ${
                              config.mb.roundingMode === m.id
                                ? 'bg-purple-100 border-purple-600 text-purple-900 shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-extrabold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    MB Deductions &amp; Column Headings
                  </h4>

                  {/* Deductions Presentation */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Deductions Display Format:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { id: 'inline_red', label: 'Inline Red (-)', desc: '(-) Deduct: Opening' },
                        { id: 'bracketed', label: 'Bracketed (L×B×H)', desc: '(1.20 × 2.10)' },
                        { id: 'separate_table', label: 'Separate Sub-table', desc: 'Deductions Block' },
                      ] as { id: MBDeductionStyle; label: string; desc: string }[]).map((ded) => (
                        <button
                          key={ded.id}
                          onClick={() => setConfig((c) => ({ ...c, mb: { ...c.mb, deductionStyle: ded.id } }))}
                          className={`p-2 text-left rounded-lg border transition cursor-pointer ${
                            config.mb.deductionStyle === ded.id
                              ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                          }`}
                        >
                          <div className="text-xs font-bold">{ded.label}</div>
                          <div className="text-[10px] text-slate-500">{ded.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dimension Units & Column Labels */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Dimension Labels Language:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { id: 'metric', label: 'Metric (m, m², m³)' },
                        { id: 'imperial', label: 'Imperial (ft, sq.ft)' },
                        { id: 'full_labels', label: 'Full labels (Quantity, Length)' },
                      ] as { id: MBDimensionUnits; label: string }[]).map((u) => (
                        <button
                          key={u.id}
                          onClick={() => setConfig((c) => ({ ...c, mb: { ...c.mb, dimensionUnits: u.id } }))}
                          className={`py-1.5 px-2 text-xs font-semibold rounded-lg border text-center transition cursor-pointer ${
                            config.mb.dimensionUnits === u.id
                              ? 'bg-purple-100 border-purple-600 text-purple-900 font-bold shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                          }`}
                        >
                          {u.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subtotal Frequency */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Subtotal Frequency:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { id: 'per_item', label: 'Per Work Item Subtotal' },
                        { id: 'cumulative', label: 'Running Cumulative Total' },
                        { id: 'page_wise', label: 'Page-wise (C.O. / B.F.)' },
                      ] as { id: MBSubtotalFrequency; label: string }[]).map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => setConfig((c) => ({ ...c, mb: { ...c.mb, subtotalFrequency: sub.id } }))}
                          className={`py-1.5 px-2 text-xs font-semibold rounded-lg border text-center transition cursor-pointer ${
                            config.mb.subtotalFrequency === sub.id
                              ? 'bg-purple-100 border-purple-600 text-purple-900 font-bold shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: QUICK PRESETS */}
            {activeTab === 'presets' && (
              <div className="space-y-3">
                {Object.entries(FORMAT_PRESETS).map(([key, preset]) => (
                  <div
                    key={key}
                    className="bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-500 transition shadow-xs flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        {preset.label}
                        {config.mb.layoutType === preset.config.mb.layoutType &&
                          config.display.numberSystem === preset.config.display.numberSystem &&
                          config.display.tableDensity === preset.config.display.tableDensity && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-extrabold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Active Match
                            </span>
                          )}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>
                    <button
                      onClick={() => handleApplyPreset(key)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 transition cursor-pointer shadow-xs hover:shadow"
                    >
                      Load Preset
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-6 flex flex-col space-y-4">
            <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden flex-1 flex flex-col">
              {/* Preview Toolbar */}
              <div className="bg-slate-800 px-4 py-2 text-white text-xs font-bold flex items-center justify-between shrink-0">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  Live Preview: Displays &amp; MB Format
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Updates dynamically in real-time
                </span>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto flex-1 text-slate-800">
                {/* 1. Header Banner Preview */}
                {config.display.headerBannerStyle === 'official' && (
                  <div className="border-b-2 border-red-600 pb-2 text-center bg-red-50/40 p-2 rounded-t-lg">
                    <div className="text-[11px] font-bold text-red-700">Government / Local Level</div>
                    <div className="text-xs font-extrabold text-blue-950">Local Authority Office, Sample County</div>
                    <div className="text-[10px] text-slate-600 font-medium">Measurement Book</div>
                  </div>
                )}

                {config.display.headerBannerStyle === 'corporate' && (
                  <div className="bg-blue-900 text-white p-2.5 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-xs font-extrabold">INFRASTRUCTURE ENGINEERING WORKS</div>
                      <div className="text-[10.5px] text-blue-200">Official Work Schedule &amp; Measurement Book</div>
                    </div>
                    <div className="text-xs font-mono bg-blue-800 px-2 py-1 rounded">FY 2026/27</div>
                  </div>
                )}

                {/* 2. Display Table Preview (BOQ / Summary Style) */}
                <div>
                  <div className="text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>1. Display Table Preview (BOQ View Style):</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Density: {config.display.tableDensity} | Font: {config.display.fontSize}
                    </span>
                  </div>

                  <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <table
                      className={`w-full text-left border-collapse ${
                        config.display.fontSize === 'small'
                          ? 'text-[11px]'
                          : config.display.fontSize === 'large'
                          ? 'text-[14px]'
                          : 'text-[12.5px]'
                      }`}
                    >
                      <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                        <tr>
                          <th className={`border-r border-slate-300 ${config.display.tableDensity === 'compact' ? 'py-1 px-2' : config.display.tableDensity === 'spacious' ? 'py-2.5 px-3' : 'py-1.5 px-2.5'}`}>
                            Item No
                          </th>
                          <th className={`border-r border-slate-300 ${config.display.tableDensity === 'compact' ? 'py-1 px-2' : config.display.tableDensity === 'spacious' ? 'py-2.5 px-3' : 'py-1.5 px-2.5'}`}>
                            Description
                          </th>
                          <th className={`border-r border-slate-300 text-right ${config.display.tableDensity === 'compact' ? 'py-1 px-2' : config.display.tableDensity === 'spacious' ? 'py-2.5 px-3' : 'py-1.5 px-2.5'}`}>
                            Quantity
                          </th>
                          <th className={`text-right ${config.display.tableDensity === 'compact' ? 'py-1 px-2' : config.display.tableDensity === 'spacious' ? 'py-2.5 px-3' : 'py-1.5 px-2.5'}`}>
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className={`${config.display.gridlineStyle === 'zebra' ? 'bg-slate-50/80' : ''} ${config.display.gridlineStyle === 'excel' ? 'border-b border-slate-200' : 'border-b border-slate-100'}`}>
                          <td className={`font-mono ${config.display.gridlineStyle === 'excel' ? 'border-r border-slate-200' : ''} ${config.display.tableDensity === 'compact' ? 'py-1 px-2' : config.display.tableDensity === 'spacious' ? 'py-2.5 px-3' : 'py-1.5 px-2.5'}`}>
                            1.01
                          </td>
                          <td className={`${config.display.gridlineStyle === 'excel' ? 'border-r border-slate-200' : ''} ${config.display.tableDensity === 'compact' ? 'py-1 px-2' : config.display.tableDensity === 'spacious' ? 'py-2.5 px-3' : 'py-1.5 px-2.5'}`}>
                            Earthwork excavation in foundation
                          </td>
                          <td className={`text-right font-mono ${config.display.gridlineStyle === 'excel' ? 'border-r border-slate-200' : ''} ${config.display.tableDensity === 'compact' ? 'py-1 px-2' : config.display.tableDensity === 'spacious' ? 'py-2.5 px-3' : 'py-1.5 px-2.5'}`}>
                            {formatMeasurementQuantity(45.2, config)} m³
                          </td>
                          <td className={`text-right font-mono font-semibold text-emerald-800 ${config.display.tableDensity === 'compact' ? 'py-1 px-2' : config.display.tableDensity === 'spacious' ? 'py-2.5 px-3' : 'py-1.5 px-2.5'}`}>
                            {formatCurrencyValue(15820, config)}
                          </td>
                        </tr>
                        <tr className={`${config.display.gridlineStyle === 'excel' ? 'border-b border-slate-200' : 'border-b border-slate-100'}`}>
                          <td className={`font-mono ${config.display.gridlineStyle === 'excel' ? 'border-r border-slate-200' : ''} ${config.display.tableDensity === 'compact' ? 'py-1 px-2' : config.display.tableDensity === 'spacious' ? 'py-2.5 px-3' : 'py-1.5 px-2.5'}`}>
                            1.02
                          </td>
                          <td className={`${config.display.gridlineStyle === 'excel' ? 'border-r border-slate-200' : ''} ${config.display.tableDensity === 'compact' ? 'py-1 px-2' : config.display.tableDensity === 'spacious' ? 'py-2.5 px-3' : 'py-1.5 px-2.5'}`}>
                            PCC 1:3:6 in foundation
                          </td>
                          <td className={`text-right font-mono ${config.display.gridlineStyle === 'excel' ? 'border-r border-slate-200' : ''} ${config.display.tableDensity === 'compact' ? 'py-1 px-2' : config.display.tableDensity === 'spacious' ? 'py-2.5 px-3' : 'py-1.5 px-2.5'}`}>
                            {formatMeasurementQuantity(12.4, config)} m³
                          </td>
                          <td className={`text-right font-mono font-semibold text-emerald-800 ${config.display.tableDensity === 'compact' ? 'py-1 px-2' : config.display.tableDensity === 'spacious' ? 'py-2.5 px-3' : 'py-1.5 px-2.5'}`}>
                            {formatCurrencyValue(134540, config)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. MB Table Preview (Measurement Book Format) */}
                <div>
                  <div className="text-[11px] font-bold text-purple-900 mb-1 flex items-center justify-between">
                    <span>2. Measurement Book (MB) Preview:</span>
                    <span className="text-[10px] text-purple-700 font-mono">
                      Layout: {config.mb.layoutType} | Precision: {config.mb.precision} dec
                    </span>
                  </div>

                  <div className="border border-purple-300 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <table
                      className={`w-full text-left border-collapse ${
                        config.display.fontSize === 'small' ? 'text-[11px]' : 'text-[12px]'
                      }`}
                    >
                      <thead className="bg-purple-50 border-b border-purple-200 font-bold text-purple-950">
                        {config.mb.layoutType === 'standard_8_col' && (
                          <tr>
                            <th className="py-1 px-2 border-r border-purple-200">Particulars</th>
                            <th className="py-1 px-1.5 text-center border-r border-purple-200">
                              {config.mb.dimensionUnits === 'full_labels' ? 'Quantity' : 'No.'}
                            </th>
                            <th className="py-1 px-1.5 text-right border-r border-purple-200">
                              {config.mb.dimensionUnits === 'full_labels' ? 'Length' : 'L'}
                            </th>
                            <th className="py-1 px-1.5 text-right border-r border-purple-200">
                              {config.mb.dimensionUnits === 'full_labels' ? 'Width' : 'B'}
                            </th>
                            <th className="py-1 px-1.5 text-right border-r border-purple-200">
                              {config.mb.dimensionUnits === 'full_labels' ? 'Height' : 'H'}
                            </th>
                            <th className="py-1 px-2 text-right">
                              {config.mb.dimensionUnits === 'full_labels' ? 'Quantity' : 'Quantity'}
                            </th>
                          </tr>
                        )}
                        {config.mb.layoutType === 'linear_chainage' && (
                          <tr>
                            <th className="py-1 px-2 border-r border-purple-200">Chainage (From - To)</th>
                            <th className="py-1 px-1.5 text-right border-r border-purple-200">Length (m)</th>
                            <th className="py-1 px-1.5 text-right border-r border-purple-200">Width (m)</th>
                            <th className="py-1 px-1.5 text-right border-r border-purple-200">Depth (m)</th>
                            <th className="py-1 px-2 text-right">Volume (m³)</th>
                          </tr>
                        )}
                        {config.mb.layoutType === 'surface_area' && (
                          <tr>
                            <th className="py-1 px-2 border-r border-purple-200">Particulars</th>
                            <th className="py-1 px-1.5 text-center border-r border-purple-200">No.</th>
                            <th className="py-1 px-1.5 text-right border-r border-purple-200">Length</th>
                            <th className="py-1 px-1.5 text-right border-r border-purple-200">Breadth</th>
                            <th className="py-1 px-2 text-right">Area (m²)</th>
                          </tr>
                        )}
                        {config.mb.layoutType === 'sectional_station' && (
                          <tr>
                            <th className="py-1 px-2 border-r border-purple-200">Station</th>
                            <th className="py-1 px-1.5 text-right border-r border-purple-200">Distance</th>
                            <th className="py-1 px-1.5 text-right border-r border-purple-200">End Area</th>
                            <th className="py-1 px-1.5 text-right border-r border-purple-200">Mean Area</th>
                            <th className="py-1 px-2 text-right">Volume</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-purple-100 font-mono">
                        {config.mb.layoutType === 'standard_8_col' && (
                          <>
                            <tr>
                              <td className="py-1 px-2 border-r border-purple-100 font-sans">Main Column Footing F1</td>
                              <td className="py-1 px-1.5 text-center border-r border-purple-100">4</td>
                              <td className="py-1 px-1.5 text-right border-r border-purple-100">1.80</td>
                              <td className="py-1 px-1.5 text-right border-r border-purple-100">1.80</td>
                              <td className="py-1 px-1.5 text-right border-r border-purple-100">1.50</td>
                              <td className="py-1 px-2 text-right font-bold text-purple-950">
                                {formatMeasurementQuantity(19.44, config)}
                              </td>
                            </tr>
                            <tr className="bg-red-50/50 text-red-700">
                              <td className="py-1 px-2 border-r border-purple-100 font-sans italic">
                                {config.mb.deductionStyle === 'inline_red'
                                  ? '(-) Deduct: Pipe Opening'
                                  : config.mb.deductionStyle === 'bracketed'
                                  ? '(Deduct: Pipe Opening)'
                                  : 'Deduction: Pipe Opening'}
                              </td>
                              <td className="py-1 px-1.5 text-center border-r border-purple-100">-1</td>
                              <td className="py-1 px-1.5 text-right border-r border-purple-100">0.50</td>
                              <td className="py-1 px-1.5 text-right border-r border-purple-100">0.50</td>
                              <td className="py-1 px-1.5 text-right border-r border-purple-100">1.50</td>
                              <td className="py-1 px-2 text-right font-bold text-red-700">
                                {config.mb.deductionStyle === 'bracketed'
                                  ? `(${formatMeasurementQuantity(0.375, config)})`
                                  : `-${formatMeasurementQuantity(0.375, config)}`}
                              </td>
                            </tr>
                          </>
                        )}
                        {config.mb.layoutType === 'linear_chainage' && (
                          <>
                            <tr>
                              <td className="py-1 px-2 border-r border-purple-100 font-sans">CH 0+000 to CH 0+150</td>
                              <td className="py-1 px-1.5 text-right border-r border-purple-100">150.00</td>
                              <td className="py-1 px-1.5 text-right border-r border-purple-100">5.50</td>
                              <td className="py-1 px-1.5 text-right border-r border-purple-100">0.15</td>
                              <td className="py-1 px-2 text-right font-bold text-purple-950">
                                {formatMeasurementQuantity(123.75, config)}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1 px-2 border-r border-purple-100 font-sans">CH 0+150 to CH 0+300</td>
                              <td className="py-1 px-1.5 text-right border-r border-purple-100">150.00</td>
                              <td className="py-1 px-1.5 text-right border-r border-purple-100">5.50</td>
                              <td className="py-1 px-1.5 text-right border-r border-purple-100">0.15</td>
                              <td className="py-1 px-2 text-right font-bold text-purple-950">
                                {formatMeasurementQuantity(123.75, config)}
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                      <tfoot className="bg-purple-100/60 font-bold border-t border-purple-200">
                        <tr>
                          <td colSpan={config.mb.layoutType === 'standard_8_col' ? 5 : 4} className="py-1 px-2 text-right text-xs font-sans">
                            {config.mb.subtotalFrequency === 'cumulative' ? 'Cumulative Progress Total =' : 'Item Total Net Quantity ='}
                          </td>
                          <td className="py-1 px-2 text-right font-mono text-purple-950">
                            {config.mb.layoutType === 'standard_8_col'
                              ? formatMeasurementQuantity(19.065, config)
                              : formatMeasurementQuantity(247.5, config)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 border-t border-slate-300 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            {savedSuccess ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1 animate-pulse">
                <CheckCircle2 className="w-4 h-4" /> Formats saved &amp; applied successfully!
              </span>
            ) : (
              <span>Preferences apply across all Estimates, BOQs, MBs &amp; Reports.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndApply}
              className="px-6 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm hover:shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" /> Apply Format Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
