import React, { useState, useEffect } from 'react';
import {
  Settings,
  Calendar,
  Globe,
  Lock,
  Unlock,
  Plus,
  X,
  Trash2,
  FileText,
  Calculator,
  Sliders,
  Hash,
  ShieldCheck,
  Palette,
  Table,
  Sparkles,
  Download,
  Upload,
  RotateCcw,
  PenTool,
  CheckCircle2,
  Eye,
  Building2,
  BookOpen,
  Check,
  Layers
} from 'lucide-react';
import {
  ZoneInfo,
  ProjectEstimate,
  CustomHeaderField,
  ContingencyCalcBasis,
  UserContributionCalcBasis,
  MasterTemplate
} from '../types';
import {
  AppFormatConfig,
  loadFormatPreferences,
  saveFormatPreferences,
  DEFAULT_FORMAT_CONFIG,
  FORMAT_PRESETS,
  TableDensity,
  BaseFontSize,
  CurrencySymbol,
  NumberSystem,
  MBLayoutType,
  MBDeductionStyle,
  GridlineStyle,
  HeaderBannerStyle,
  ZeroDisplay,
  MBDimensionUnits
} from '../services/formatPreferences';
import { STANDARD_TEMPLATES } from '../data/standardTemplates';
import { currencyCode, COMMON_CURRENCIES } from '../services/currency';

export type SettingsTabKey = 'general' | 'format' | 'templates' | 'precision' | 'headings' | 'user_estimate' | 'backups';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fiscalYears: string[];
  selectedFY: string;
  setSelectedFY: (fy: string) => void;
  zones: ZoneInfo[];
  selectedZone: ZoneInfo;
  setSelectedZone: (d: ZoneInfo) => void;
  onOpenAddFYModal?: () => void;
  onOpenAddZoneModal?: () => void;
  onOpenRestoreModal?: () => void;
  isInitiationLocked: boolean;
  setIsInitiationLocked: (locked: boolean) => void;
  project?: ProjectEstimate;
  setProject?: React.Dispatch<React.SetStateAction<ProjectEstimate>>;
  initialTab?: SettingsTabKey;
  activeTemplate?: MasterTemplate;
  setActiveTemplate?: (t: MasterTemplate) => void;
  onNewTemplate?: () => void;
  onExportTemplate?: () => void;
  onNavigateTab?: (tab: string) => void;
  showToast?: (msg: string) => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  fiscalYears,
  selectedFY,
  setSelectedFY,
  zones,
  selectedZone,
  setSelectedZone,
  onOpenAddFYModal,
  onOpenAddZoneModal,
  onOpenRestoreModal,
  isInitiationLocked,
  setIsInitiationLocked,
  project,
  setProject,
  initialTab = 'general',
  activeTemplate,
  setActiveTemplate,
  onNewTemplate,
  onExportTemplate,
  onNavigateTab,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Format Preferences State
  const [formatConfig, setFormatConfig] = useState<AppFormatConfig>(loadFormatPreferences);

  useEffect(() => {
    if (isOpen) {
      setFormatConfig(loadFormatPreferences());
    }
  }, [isOpen]);

  const updateFormat = (updater: (prev: AppFormatConfig) => AppFormatConfig) => {
    const updated = updater(formatConfig);
    setFormatConfig(updated);
    saveFormatPreferences(updated);
    window.dispatchEvent(new CustomEvent('uev:format-preferences-changed', { detail: updated }));
    if (showToast) showToast('Format updated & applied.');
  };

  const handleApplyPreset = (presetKey: string) => {
    const preset = FORMAT_PRESETS[presetKey];
    if (preset) {
      updateFormat(() => preset.config);
      if (showToast) showToast(`Applied ${preset.label} preset.`);
    }
  };

  // Selected Master Template local selection
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(activeTemplate?.id || STANDARD_TEMPLATES[0].id);

  // Custom headings state
  const [newHeadingLabel, setNewHeadingLabel] = useState('');
  const [newHeadingValue, setNewHeadingValue] = useState('');

  if (!isOpen) return null;

  const headerConfig = project?.header_config || {};
  const customHeadings = headerConfig.custom_headings || [];
  const userEstimateConfig = project?.user_estimate_config || {};

  // Handlers for Custom Headings
  const handleAddCustomHeading = () => {
    if (!newHeadingLabel.trim()) return;
    const newField: CustomHeaderField = {
      id: `h_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      label: newHeadingLabel.trim(),
      value: newHeadingValue.trim()
    };

    if (setProject) {
      setProject((prev) => ({
        ...prev,
        header_config: {
          ...(prev.header_config || {}),
          custom_headings: [...(prev.header_config?.custom_headings || []), newField]
        }
      }));
    }

    setNewHeadingLabel('');
    setNewHeadingValue('');
  };

  const handleRemoveCustomHeading = (id: string) => {
    if (setProject) {
      setProject((prev) => ({
        ...prev,
        header_config: {
          ...(prev.header_config || {}),
          custom_headings: (prev.header_config?.custom_headings || []).filter((h) => h.id !== id)
        }
      }));
    }
  };

  const handleUpdateHeaderConfig = (field: string, val: any) => {
    if (setProject) {
      setProject((prev) => ({
        ...prev,
        header_config: {
          ...(prev.header_config || {}),
          [field]: val
        }
      }));
    }
  };

  const handleUpdateUserEstimateConfig = (field: string, val: any) => {
    if (setProject) {
      setProject((prev) => ({
        ...prev,
        user_estimate_config: {
          ...(prev.user_estimate_config || {}),
          [field]: val
        }
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-blue-950 border-b-2 border-red-600 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600/30 rounded-xl text-emerald-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">System, Format &amp; Template Settings</h3>
              <p className="text-xs text-slate-300">Formats, Master Templates, Region, Document Headings &amp; Estimate Rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold px-4 pt-2 gap-1 shrink-0 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3 py-2 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'general'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            General &amp; Region
          </button>
          <button
            onClick={() => setActiveTab('format')}
            className={`px-3 py-2 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'format'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            Format &amp; Displays
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-2 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'templates'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
            Templates &amp; Presets
          </button>
          <button
            onClick={() => setActiveTab('precision')}
            className={`px-3 py-2 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'precision'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Hash className="w-3.5 h-3.5 text-emerald-600" />
            Precision &amp; Rules
          </button>
          <button
            onClick={() => setActiveTab('headings')}
            className={`px-3 py-2 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'headings'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            Project Headings
          </button>
          <button
            onClick={() => setActiveTab('user_estimate')}
            className={`px-3 py-2 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'user_estimate'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-rose-600" />
            Estimate Logic
          </button>
          <button
            onClick={() => setActiveTab('backups')}
            className={`px-3 py-2 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'backups'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
            Backups &amp; Restore
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-800 flex-1">
          {/* TAB 1: GENERAL & REGION */}
          {activeTab === 'general' && (
            <div className="space-y-5">
              {/* Active Fiscal Year Configuration */}
              <div className="space-y-2">
                <label className="font-bold flex items-center justify-between text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
 Active Fiscal Year
                  </span>
                  {onOpenAddFYModal && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenAddFYModal();
                      }}
                      className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 hover:underline text-[11px]"
                    >
                      <Plus className="w-3 h-3" />
                      Add New FY
                    </button>
                  )}
                </label>
                <select
                  value={selectedFY}
                  onChange={(e) => setSelectedFY(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {fiscalYears.map((fy) => (
                    <option key={fy} value={fy} className="bg-white text-slate-900 font-mono">
                      Fiscal Year {fy}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  All rate analysis, zone rate applications, and estimate abstracts will run under FY {selectedFY}.
                </p>
              </div>

              {/* Active Zone Configuration */}
              <div className="space-y-2">
                <label className="font-bold flex items-center justify-between text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-blue-600" />
                    Active Zone / Location Rates
                  </span>
                  {onOpenAddZoneModal && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenAddZoneModal();
                      }}
                      className="text-blue-700 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline text-[11px]"
                    >
                      <Plus className="w-3 h-3" />
                      Add Location
                    </button>
                  )}
                </label>
                <select
                  value={selectedZone.id}
                  onChange={(e) => {
                    const found = zones.find((d) => d.id === e.target.value);
                    if (found) setSelectedZone(found);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {zones.map((d) => (
                    <option key={d.id} value={d.id} className="bg-white text-slate-900">
                      {d.name_en} — {d.province}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  Rate schedule for {selectedZone.name_en} will be used for calculation.
                </p>
              </div>

              {/* Initiation Lock Toggle */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    {isInitiationLocked ? (
                      <Lock className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Unlock className="w-4 h-4 text-emerald-600" />
                    )}
                    Initiation Lock Status
                  </span>
                  <p className="text-[11px] text-slate-500">
                    {isInitiationLocked
                      ? 'Locked to prevent accidental changes during estimation.'
                      : 'Unlocked. You can modify master rates and norms.'}
                  </p>
                </div>
                <button
                  onClick={() => setIsInitiationLocked(!isInitiationLocked)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                    isInitiationLocked
                      ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                      : 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                  }`}
                >
                  {isInitiationLocked ? 'Unlock' : 'Lock'}
                </button>
              </div>
            </div>
          )}

          {/* TAB: FORMAT & DISPLAYS (Transferred from standalone Format ribbon) */}
          {activeTab === 'format' && (
            <div className="space-y-5">
              {/* Top Banner */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 text-[11px] text-indigo-950 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-bold flex items-center gap-1.5 text-xs text-indigo-900">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    Format of Displays, Tables &amp; Measurement Book (MB)
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Customize visual table density, font sizes, currency representation, number grouping, and detailed Measurement Book (MB) calculation layouts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    updateFormat(() => DEFAULT_FORMAT_CONFIG);
                    if (showToast) showToast('Reset to default formats.');
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold text-[10px] shrink-0 transition flex items-center gap-1 cursor-pointer"
                  title="Reset all format options to standard system defaults"
                >
                  <RotateCcw className="w-3 h-3 text-slate-500" />
                  Reset Defaults
                </button>
              </div>

              {/* 1-Click Standard Format Presets */}
              <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    1-Click Engineering &amp; Government Presets
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Quick Application</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {Object.entries(FORMAT_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleApplyPreset(key)}
                      className="p-2.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-400 rounded-xl text-left transition group shadow-2xs cursor-pointer"
                    >
                      <div className="font-bold text-slate-900 text-[11px] group-hover:text-blue-700 flex items-center justify-between">
                        <span>{preset.label}</span>
                        <Check className="w-3 h-3 opacity-0 group-hover:opacity-100 text-blue-600 transition" />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-tight">
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Displays Formatting Section */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b pb-2">
                  <Table className="w-4 h-4 text-blue-600" />
                  Display Tables &amp; General Formatting
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Table Density */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
 Table Density
                    </label>
                    <input
                      list="uev-currency-list"
                      type="text"
                      value={formatConfig.display.currencySymbol}
                      maxLength={8}
                      onChange={(e) => updateFormat((c) => ({ ...c, display: { ...c.display, currencySymbol: e.target.value.toUpperCase() || 'USD' } }))}
                      className="w-full px-2 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-white text-slate-800"
                      placeholder="USD, EUR, GBP..."
                    />
                    <datalist id="uev-currency-list">
                      {COMMON_CURRENCIES.map((c) => (<option key={c} value={c} />))}
                    </datalist>
                  </div>

                  {/* Number System */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
 Number System
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => updateFormat((c) => ({ ...c, display: { ...c.display, numberSystem: 'south_asian' } }))}
                        className={`py-1 text-[10.5px] font-bold rounded-lg transition cursor-pointer text-center ${
                          formatConfig.display.numberSystem === 'south_asian'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-700 hover:bg-white'
                        }`}
                        title="South Asian grouping (lakh / crore): 1,50,000"
                      >
                        Lakh / Crore
                      </button>
                      <button
                        type="button"
                        onClick={() => updateFormat((c) => ({ ...c, display: { ...c.display, numberSystem: 'international' } }))}
                        className={`py-1 text-[10.5px] font-bold rounded-lg transition cursor-pointer text-center ${
                          formatConfig.display.numberSystem === 'international'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-700 hover:bg-white'
                        }`}
                        title="International System: 150,000"
                      >
                        Millions
                      </button>
                    </div>
                  </div>

                  {/* Zero Value Display */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
 Zero Value Display
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      {(['zero', 'dash', 'blank'] as ZeroDisplay[]).map((z) => (
                        <button
                          key={z}
                          type="button"
                          onClick={() => updateFormat((c) => ({ ...c, display: { ...c.display, zeroDisplay: z } }))}
                          className={`py-1 text-[10px] font-bold rounded-lg capitalize transition cursor-pointer text-center ${
                            formatConfig.display.zeroDisplay === z
                              ? 'bg-purple-600 text-white shadow-2xs'
                              : 'text-slate-700 hover:bg-white'
                          }`}
                        >
                          {z === 'zero' ? '0.00' : z === 'dash' ? '— (Dash)' : 'Blank'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Measurement Book (MB) Format Section */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="font-bold text-slate-900 text-xs flex items-center justify-between border-b pb-2">
                  <span className="flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-purple-600" />
 Measurement Book (MB) Specifications
                  </span>
                  <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-mono font-bold">
                    Official MB Engine
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* MB Layout Type */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                      Measurement Book Table Layout
                    </label>
                    <div className="space-y-1.5">
                      {[
                        { id: 'standard_8_col', title: '8-Column Standard (Official)', desc: 'Standard Item, Particulars, No., L, B, H, Quantity, Remarks' },
                        { id: 'linear_chainage', title: 'Linear Road Chainage Layout', desc: 'Chainage From-To, Cross-section offset detailing' },
                        { id: 'surface_area', title: 'Surface Area Measurement Layout', desc: 'Net surface area calculation with itemized deductions' },
                        { id: 'sectional_station', title: 'Sectional Station Layout', desc: 'Reduced levels, station offsets, and cut/fill sections' }
                      ].map((ly) => (
                        <label
                          key={ly.id}
                          className={`flex items-start gap-2 p-2 rounded-xl border transition cursor-pointer ${
                            formatConfig.mb.layoutType === ly.id
                              ? 'bg-purple-50/80 border-purple-400 text-purple-950 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="radio"
                            name="mbLayoutType"
                            checked={formatConfig.mb.layoutType === ly.id}
                            onChange={() => updateFormat((c) => ({ ...c, mb: { ...c.mb, layoutType: ly.id as MBLayoutType } }))}
                            className="mt-0.5 text-purple-600"
                          />
                          <div>
                            <span className="text-[11px] block">{ly.title}</span>
                            <span className="text-[10px] text-slate-500 font-normal block leading-tight">{ly.desc}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Precision & Deductions */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Measurement Decimal Precision
                      </label>
                      <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        {[1, 2, 3, 4].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => updateFormat((c) => ({ ...c, mb: { ...c.mb, precision: p } }))}
                            className={`py-1 text-[10.5px] font-bold rounded-lg transition cursor-pointer text-center ${
                              formatConfig.mb.precision === p
                                ? 'bg-purple-600 text-white shadow-2xs'
                                : 'text-slate-700 hover:bg-white'
                            }`}
                          >
                            .{'0'.repeat(p)}
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Standard civil engineering precision is 2 places (.00).</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
 Deduction Row Styling
                      </label>
                      <div className="space-y-1">
                        {[
                          { id: 'inline_red', label: 'Inline Negative Red: (-) 12.50' },
                          { id: 'bracketed', label: 'Bracketed Accounting: (12.50)' },
                          { id: 'separate_table', label: 'Separate Deductions Sub-table' }
                        ].map((ded) => (
                          <label
                            key={ded.id}
                            className={`flex items-center gap-2 p-1.5 px-2.5 rounded-lg border text-[11px] transition cursor-pointer ${
                              formatConfig.mb.deductionStyle === ded.id
                                ? 'bg-purple-50 border-purple-400 font-bold text-purple-900'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name="deductionStyle"
                              checked={formatConfig.mb.deductionStyle === ded.id}
                              onChange={() => updateFormat((c) => ({ ...c, mb: { ...c.mb, deductionStyle: ded.id as MBDeductionStyle } }))}
                              className="text-purple-600"
                            />
                            <span>{ded.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Dimension Units System
                      </label>
                      <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => updateFormat((c) => ({ ...c, mb: { ...c.mb, dimensionUnits: 'metric' } }))}
                          className={`py-1 text-[10.5px] font-bold rounded-lg transition cursor-pointer text-center ${
                            formatConfig.mb.dimensionUnits === 'metric'
                              ? 'bg-purple-600 text-white shadow-2xs'
                              : 'text-slate-700 hover:bg-white'
                          }`}
                        >
                          Metric (m, cm, m³)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateFormat((c) => ({ ...c, mb: { ...c.mb, dimensionUnits: 'imperial' } }))}
                          className={`py-1 text-[10.5px] font-bold rounded-lg transition cursor-pointer text-center ${
                            formatConfig.mb.dimensionUnits === 'imperial'
                              ? 'bg-purple-600 text-white shadow-2xs'
                              : 'text-slate-700 hover:bg-white'
                          }`}
                        >
                          Imperial (ft, in, cft)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TEMPLATES & MASTER PRESETS (Transferred from standalone Templates ribbon) */}
          {activeTab === 'templates' && (
            <div className="space-y-5">
              {/* Active Template Banner */}
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-700" />
                    <span className="font-bold text-xs text-purple-950">Active Master Template:</span>
                    <span className="bg-purple-200 text-purple-900 font-bold px-2 py-0.5 rounded text-[10px]">
                      {activeTemplate?.template_code || 'BLD-BUILD-2026'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    {activeTemplate?.template_name || 'Master Building Norms & Zone Rates (2026/27)'}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                    <span>Dept: <strong>{activeTemplate?.department || 'BLD'}</strong></span>
                    <span>•</span>
                    <span>FY: <strong>{activeTemplate?.fiscal_year || '2026/27'}</strong></span>
                    <span>•</span>
                    <span>Zone: <strong>{activeTemplate?.zone || 'Capital City'}</strong></span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  {onExportTemplate && (
                    <button
                      type="button"
                      onClick={onExportTemplate}
                      className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      title="Export current Master Template (.uet)"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export .uet
                    </button>
                  )}
                  {onNewTemplate && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNewTemplate();
                      }}
                      className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Configure New Master Template"
                    >
                      <Plus className="w-3 h-3 text-purple-600" />
                      New Template
                    </button>
                  )}
                </div>
              </div>

              {/* Master Template Selection & Switching */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="font-bold text-slate-900 text-xs flex items-center justify-between border-b pb-2">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Standard Master Engineering Templates Library
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Select &amp; Apply to Project</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {STANDARD_TEMPLATES.map((tmpl) => {
                    const isSelected = selectedTemplateId === tmpl.id || (activeTemplate?.id === tmpl.id);
                    return (
                      <div
                        key={tmpl.id}
                        className={`p-3 rounded-xl border transition flex flex-col justify-between gap-2.5 ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-400 ring-1 ring-blue-300'
                            : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="bg-slate-200 text-slate-800 text-[9.5px] font-bold font-mono px-1.5 py-0.5 rounded">
                              {tmpl.department} • {tmpl.template_code}
                            </span>
                            {isSelected && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                                <CheckCircle2 className="w-3 h-3" /> Active
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-xs text-slate-900 leading-snug">
                            {tmpl.template_name}
                          </div>
                          <p className="text-[10.5px] text-slate-500 line-clamp-2 leading-tight">
                            {tmpl.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-200/80 pt-2">
                          <span className="text-[10px] text-slate-500 font-mono">
                            {tmpl.norms?.length || 0} Norms • {tmpl.resources?.length || 0} Rates
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTemplateId(tmpl.id);
                              if (setActiveTemplate) setActiveTemplate(tmpl);
                              localStorage.setItem('uev_active_template_v1', JSON.stringify(tmpl));

                              // Apply norms & resources to active project if confirmed
                              if (setProject) {
                                setProject((prev) => ({
                                  ...prev,
                                  title: prev.title || `${tmpl.department} Civil Infrastructure Project`,
                                  fiscal_year: tmpl.fiscal_year || prev.fiscal_year,
                                  contractor_overhead_percent: tmpl.general_settings?.contractor_overhead_percent ?? prev.contractor_overhead_percent,
                                  tax_percent: tmpl.general_settings?.tax_percent ?? prev.tax_percent
                                }));
                              }
                              if (showToast) showToast(`Applied ${tmpl.template_name} to project.`);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-white hover:bg-slate-200 border border-slate-300 text-slate-800'
                            }`}
                          >
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            {isSelected ? 'Re-Apply to Project' : 'Apply to Project'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Document Letterhead & Frame Structure Controls */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="font-bold text-slate-900 text-xs flex items-center justify-between border-b pb-2">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    Document Letterhead, Emblem &amp; Signatories Frame
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (setProject) {
                        setProject((prev) => ({
                          ...prev,
                          header_config: {
                            authority_name: 'Capital City Authority',
                            office_name: 'Local Authority Office',
                            office_address: 'Capital City, Central Province',
                            budget_head_no: '3370114'
                          }
                        }));
                      }
                      if (showToast) showToast('Reset letterhead and frame structure to Standard template.');
                    }}
                    className="text-[10px] font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 text-blue-600" />
                    Reset Frame to Standard
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Letterhead Banner Style */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                      Government Letterhead Emblem Style
                    </label>
                    <div className="space-y-1.5">
                      {[
                        { id: 'official', label: 'Center Emblem (Official Seal)', desc: 'Official seal at top center with authority titles' },
                        { id: 'corporate', label: 'Two-Column Standard (Emblem Left, Office Right)', desc: 'Traditional department letterhead with emblem left' },
                        { id: 'clean', label: 'Clean Bordered Official Schedule', desc: 'Minimalist clean header line for technical schedules' }
                      ].map((style) => (
                        <label
                          key={style.id}
                          className={`flex items-start gap-2 p-2 rounded-xl border transition cursor-pointer ${
                            formatConfig.display.headerBannerStyle === style.id
                              ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-950'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="radio"
                            name="headerBannerStyle"
                            checked={formatConfig.display.headerBannerStyle === style.id}
                            onChange={() => updateFormat((c) => ({ ...c, display: { ...c.display, headerBannerStyle: style.id as HeaderBannerStyle } }))}
                            className="mt-0.5 text-emerald-600"
                          />
                          <div>
                            <span className="text-[11px] block">{style.label}</span>
                            <span className="text-[10px] text-slate-500 font-normal block leading-tight">{style.desc}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Status Badges & CAD Drawing Links */}
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-800 text-[11px] flex items-center justify-between">
                        <span>Display Verification &amp; Lock Status Badges</span>
                        <input
                          type="checkbox"
                          checked={formatConfig.display.statusBadges !== false}
                          onChange={(e) => updateFormat((c) => ({ ...c, display: { ...c.display, statusBadges: e.target.checked } }))}
                          className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                        />
                      </div>
                      <p className="text-[10.5px] text-slate-500 leading-tight">
                        Renders official approval status badges, revision numbers, and lock watermarks across estimation sheets.
                      </p>
                    </div>

                    {/* Link to Parametric Drawing Templates */}
                    {onNavigateTab && (
                      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="font-bold text-amber-950 text-xs block flex items-center gap-1">
                            <PenTool className="w-3.5 h-3.5 text-amber-700" />
                            Parametric Drawing Templates
                          </span>
                          <span className="text-[10.5px] text-slate-600 block">
                            Drain, road, slab culvert, and retaining wall cross-sections.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onNavigateTab('template-drawings');
                          }}
                          className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition shadow-2xs whitespace-nowrap cursor-pointer"
                        >
                          Open Drawings
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: BACKUPS & SYSTEM CHECKPOINTS */}
          {activeTab === 'backups' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-900">
                <strong>System Restore Checkpoints & Database Backups:</strong> Create snapshot checkpoints of zone rates, norms, and project BOQs to easily revert or restore system state at any point.
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">Restore Point & System Checkpoints Manager</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Manage saved system snapshots, create manual checkpoints, or export/import backup JSON files.
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-end">
                  {onOpenRestoreModal && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenRestoreModal();
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow flex items-center gap-2 transition cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      Open Restore Checkpoints Manager
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: PRECISION & SYSTEM RULES */}
          {activeTab === 'precision' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900">
                <strong>Precision & Rate Extraction Settings:</strong> Customize numerical precision for unit rates, quantities, and financial totals across all rate analysis and estimate reports. Also set rules for rate extraction.
              </div>

              {/* Decimal Precision Controls */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-emerald-600" />
                  Decimal Precision Preferences
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Unit Rate Precision
                    </label>
                    <select
                      value={userEstimateConfig.rate_precision ?? 2}
                      onChange={(e) => handleUpdateUserEstimateConfig('rate_precision', parseInt(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono text-xs font-bold"
                    >
                      <option value={0}>0 Decimals (e.g. 1500)</option>
                      <option value={2}>2 Decimals (e.g. 1500.00)</option>
                      <option value={3}>3 Decimals (e.g. 1500.000)</option>
                      <option value={4}>4 Decimals (e.g. 1500.0000)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Quantity Precision
                    </label>
                    <select
                      value={userEstimateConfig.quantity_precision ?? 2}
                      onChange={(e) => handleUpdateUserEstimateConfig('quantity_precision', parseInt(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono text-xs font-bold"
                    >
                      <option value={0}>0 Decimals (e.g. 125)</option>
                      <option value={2}>2 Decimals (e.g. 125.50)</option>
                      <option value={3}>3 Decimals (e.g. 125.500)</option>
                      <option value={4}>4 Decimals (e.g. 125.5000)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Financial Amount Precision
                    </label>
                    <select
                      value={userEstimateConfig.amount_precision ?? 2}
                      onChange={(e) => handleUpdateUserEstimateConfig('amount_precision', parseInt(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono text-xs font-bold"
                    >
                      <option value={0}>0 Decimals (Rounded {currencyCode()})</option>
                      <option value={2}>2 Decimals (Exact Paisa)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* User Mode & Contractor Mode Rate Analysis Settings */}
              <div className="space-y-3 bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-200">
                <div className="font-bold text-indigo-950 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    User Mode vs Contractor Mode Rate Settings
                  </span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-mono">
                    Official & Tender Config
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-indigo-100 space-y-2">
                    <div className="font-bold text-blue-900 border-b pb-1 text-[11px]">
                      🏛️ User Mode (Office Estimate)
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                        Material Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={userEstimateConfig.user_mode_material_tax_percent ?? 0}
                        onChange={(e) => handleUpdateUserEstimateConfig('user_mode_material_tax_percent', parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 border rounded-lg font-mono font-bold bg-slate-50 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                        Overhead & Profit (%)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={userEstimateConfig.user_mode_overhead_percent ?? 0}
                        onChange={(e) => handleUpdateUserEstimateConfig('user_mode_overhead_percent', parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 border rounded-lg font-mono font-bold bg-slate-50 text-xs"
                      />
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-indigo-100 space-y-2">
                    <div className="font-bold text-indigo-900 border-b pb-1 text-[11px]">
                      🏗️ Contractor Mode (Tender)
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                        Contractor Overhead & Profit (%)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={userEstimateConfig.contractor_mode_overhead_percent ?? 15}
                        onChange={(e) => handleUpdateUserEstimateConfig('contractor_mode_overhead_percent', parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 border rounded-lg font-mono font-bold bg-slate-50 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                        Final BOQ Total Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={userEstimateConfig.contractor_mode_tax_percent ?? 0}
                        onChange={(e) => handleUpdateUserEstimateConfig('contractor_mode_tax_percent', parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 border rounded-lg font-mono font-bold bg-slate-50 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Currency & Overhead Settings */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  System Default Percentages & Currency Symbol
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Currency Symbol / Label
                    </label>
                    <input
                      type="text"
                      value={userEstimateConfig.currency_symbol || `${currencyCode()}`}
                      onChange={(e) => handleUpdateUserEstimateConfig('currency_symbol', e.target.value)}
                      placeholder={`e.g. ${currencyCode()},., Rs.`}
                      className="w-full p-2 border rounded-xl font-bold bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Strict Rate Extraction Rule
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userEstimateConfig.strict_rate_mode !== false}
                        onChange={(e) => handleUpdateUserEstimateConfig('strict_rate_mode', e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span className="text-[11px] font-bold text-slate-800">
                        Require Explicit Zone/CSV Rates (No default fake rates)
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOM PROJECT HEADINGS */}
          {activeTab === 'headings' && (
            <div className="space-y-4">
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-900">
                <strong>Project Document & Header Customization:</strong> Configure standard local_authority headers and add any custom project headings (e.g., Program Name, Ministry, User Committee Name, Grant Type) to display on estimate reports and printouts.
              </div>

              {/* Standard Office Headers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Local Authority</label>
                    {headerConfig.authority_name && (
                      <button
                        type="button"
                        onClick={() => handleUpdateHeaderConfig('authority_name', '')}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-800"
                        title="Remove heading"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={headerConfig.authority_name || ''}
                    onChange={(e) => handleUpdateHeaderConfig('authority_name', e.target.value)}
                    placeholder="e.g. (leave empty to remove)"
                    className="w-full p-2 border rounded-xl font-medium bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Office Name</label>
                    {headerConfig.office_name && (
                      <button
                        type="button"
                        onClick={() => handleUpdateHeaderConfig('office_name', '')}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-800"
                        title="Remove heading"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={headerConfig.office_name || ''}
                    onChange={(e) => handleUpdateHeaderConfig('office_name', e.target.value)}
                    placeholder="e.g. (leave empty to remove)"
                    className="w-full p-2 border rounded-xl font-medium bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Office Address</label>
                    {headerConfig.office_address && (
                      <button
                        type="button"
                        onClick={() => handleUpdateHeaderConfig('office_address', '')}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-800"
                        title="Remove heading"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={headerConfig.office_address || ''}
                    onChange={(e) => handleUpdateHeaderConfig('office_address', e.target.value)}
                    placeholder="e.g. (leave empty to remove)"
                    className="w-full p-2 border rounded-xl font-medium bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">. (Budget Head)</label>
                    {headerConfig.budget_head_no && (
                      <button
                        type="button"
                        onClick={() => handleUpdateHeaderConfig('budget_head_no', '')}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-800"
                        title="Remove heading"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={headerConfig.budget_head_no || ''}
                    onChange={(e) => handleUpdateHeaderConfig('budget_head_no', e.target.value)}
                    placeholder="e.g. (leave empty to remove)"
                    className="w-full p-2 border rounded-xl font-mono font-bold bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Dynamic Custom Headings List */}
              <div className="space-y-2 border-t pt-3">
                <label className="font-bold text-slate-900 block">
 Add Custom Project Headings
                </label>

                {customHeadings.length > 0 && (
                  <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    {customHeadings.map((h) => (
                      <div key={h.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <span className="font-bold text-slate-800 text-[11px] truncate">{h.label}</span>
                          <span className="text-slate-600 font-medium text-[11px] truncate">{h.value || '—'}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveCustomHeading(h.id)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                          title="Remove custom heading"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Custom Heading Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end pt-1">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Heading Title</label>
                    <input
                      type="text"
                      value={newHeadingLabel}
                      onChange={(e) => setNewHeadingLabel(e.target.value)}
                      placeholder="e.g. User committee name"
                      className="w-full p-2 border rounded-xl font-medium text-xs bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Value</label>
                    <input
                      type="text"
                      value={newHeadingValue}
                      onChange={(e) => setNewHeadingValue(e.target.value)}
                      placeholder="e.g. Sample City Road Improvement Committee"
                      className="w-full p-2 border rounded-xl font-medium text-xs bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <button
                      type="button"
                      onClick={handleAddCustomHeading}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: USER ESTIMATE LOGIC */}
          {activeTab === 'user_estimate' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900">
                <strong>User Estimate Provisions:</strong> Configure auto contingency calculation rules and how User Contribution is derived relative to Allocated Budget and Contingency.
              </div>

              {/* Contingency Auto Rates */}
              <div className="space-y-2 border-b pb-3">
                <label className="font-bold text-slate-800 block">
 1. Contingency Calculation
                </label>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoContingency"
                      checked={userEstimateConfig.auto_contingency_enabled !== false}
                      onChange={(e) => handleUpdateUserEstimateConfig('auto_contingency_enabled', e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <label htmlFor="autoContingency" className="font-bold text-slate-800 cursor-pointer">
                      Use Standard Government Auto-Slab Contingency Rules
                    </label>
                  </div>

                  <div className="text-[11px] text-slate-600 pl-6 space-y-0.5 font-mono">
                    <div>• Allocated Budget ≤ {currencyCode()} 300,000 → <strong>2.0% Contingency</strong></div>
                    <div>• Allocated Budget {currencyCode()} 300,000 – 2,000,000 → <strong>1.5% Contingency</strong></div>
                    <div>• Allocated Budget &gt; {currencyCode()} 2,000,000 → <strong>1.0% Contingency</strong></div>
                  </div>

                  {userEstimateConfig.auto_contingency_enabled === false && (
                    <div className="pt-2">
                      <label className="block font-bold text-slate-700 mb-1">Manual Contingency Percentage (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={userEstimateConfig.manual_contingency_percent || 3}
                        onChange={(e) => handleUpdateUserEstimateConfig('manual_contingency_percent', parseFloat(e.target.value) || 0)}
                        className="w-32 p-2 border rounded-xl font-bold font-mono bg-white"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <label className="block font-bold text-slate-700 mb-1">Contingency Calculation Basis</label>
                  <select
                    value={userEstimateConfig.contingency_calc_basis || 'net_budget'}
                    onChange={(e) => handleUpdateUserEstimateConfig('contingency_calc_basis', e.target.value as ContingencyCalcBasis)}
                    className="w-full p-2.5 border rounded-xl font-medium bg-slate-50 focus:bg-white text-xs"
                  >
                    <option value="net_budget">Deduct Contingency from Allocated Budget (Default: Net Budget = Budget - Contingency)</option>
                    <option value="grand_total">Calculate Contingency as Percentage of Grand Total Estimated Cost</option>
                    <option value="allocated_budget">Calculate Contingency directly on Allocated Budget Amount</option>
                  </select>
                </div>
              </div>

              {/* User Contribution Logic */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800 block">
 2. User Contribution Calculation Basis
                </label>

                <select
                  value={userEstimateConfig.user_contribution_calc_basis || 'net_budget'}
                  onChange={(e) => handleUpdateUserEstimateConfig('user_contribution_calc_basis', e.target.value as UserContributionCalcBasis)}
                  className="w-full p-2.5 border rounded-xl font-medium bg-slate-50 focus:bg-white text-xs"
                >
                  <option value="net_budget">
                    % of Net Allocated Budget (Default: % of [Allocated Budget - Contingency])
                  </option>
                  <option value="allocated_budget">
                    % of Total Allocated Budget Amount
                  </option>
                  <option value="grand_total">
                    Calculate Grand Total so Allocated Budget equals (1 - Contribution %) of Grand Total
                  </option>
                  <option value="fixed_amount">
                    Direct User-Defined Fixed {currencyCode()} Amount
                  </option>
                </select>
                <p className="text-[11px] text-slate-500 italic">
                  Example: For X = 300,000 budget with 2% contingency (Net = 294,000), 10% contribution yields 29,400 user contribution under default net budget basis.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2 rounded-xl shadow transition"
          >
            Save & Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
