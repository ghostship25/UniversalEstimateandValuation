import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Save,
  RotateCcw,
  RotateCw,
  Printer,
  Search,
  Lock,
  Unlock,
  Settings,
  Database,
  FileSpreadsheet,
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  Maximize2,
  Minimize2,
  FileCode,
  Download,
  Upload,
  BookOpen,
  Ruler,
  Boxes,
  Layers,
  PenTool,
  HelpCircle,
  LayoutGrid,
  CheckCircle2,
  FileText,
  DollarSign,
  FolderPlus,
  Copy,
  Trash2,
  RefreshCw,
  Sliders,
  Edit2,
  Edit3,
  Truck,
  Building,
  Users,
  Wrench,
  MinusCircle,
  FileCheck,
  ChevronUp,
  Sparkles,
  Terminal,
  ShieldCheck,
  Receipt,
  ClipboardList,
  Eye,
  Table,
  Hash,
  Palette,
  Link2,
  Grid,
  ZoomIn,
  ZoomOut,
  PanelLeft,
  Split,
  Monitor,
  Calendar,
  Columns,
  Square,
  CheckSquare,
  FileDown,
  Zap,
  Camera
} from 'lucide-react';
import { Sidebar } from './Sidebar';
import { ZoneInfo, ProjectEstimate } from '../../types';
import { DisplayMBFormatModal } from '../DisplayMBFormatModal';
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
  MBDimensionUnits,
  GridlineStyle,
  HeaderBannerStyle
} from '../../services/formatPreferences';
import { currencyCode } from '../../services/currency';

interface AppShellProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  zones: ZoneInfo[];
  selectedZone: ZoneInfo;
  setSelectedZone: (d: ZoneInfo) => void;
  fiscalYears: string[];
  selectedFY: string;
  setSelectedFY: (fy: string) => void;
  onOpenRestoreModal: () => void;
  onOpenSearchModal: () => void;
  isInitiationLocked: boolean;
  setIsInitiationLocked: (locked: boolean) => void;
  onToggleInitiationLock?: () => void;
  onOpenAddZoneModal: () => void;
  onOpenAddFYModal?: () => void;
  onOpenProjectModal: () => void;
  onOpenWelcomeScreen?: () => void;
  onOpenUserSettings?: (initialTab?: any) => void;
  onOpenDatabaseModal?: () => void;
  onOpenSnapshotModal?: () => void;
  isProjectLocked?: boolean;
  onToggleProjectLock?: () => void;
  activeProjectTitle: string;
  activeTemplateName?: string;
  onNewTemplate: () => void;
  onExportTemplate: () => void;
  onExportProject: () => void;
  onSaveFile: () => void;
  project?: ProjectEstimate;
  showToast?: (msg: string) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  setActiveTab,
  zones,
  selectedZone,
  setSelectedZone,
  fiscalYears,
  selectedFY,
  setSelectedFY,
  onOpenRestoreModal,
  onOpenSearchModal,
  isInitiationLocked,
  setIsInitiationLocked,
  onToggleInitiationLock,
  onOpenAddZoneModal,
  onOpenAddFYModal,
  onOpenProjectModal,
  onOpenWelcomeScreen,
  onOpenUserSettings,
  onOpenDatabaseModal,
  onOpenSnapshotModal,
  isProjectLocked,
  onToggleProjectLock,
  activeProjectTitle,
  activeTemplateName,
  onNewTemplate,
  onExportTemplate,
  onExportProject,
  onSaveFile,
  project,
  showToast,
  children
}) => {
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  // Active Ribbon Topic (controls subsidiary tools)
  const [activeRibbonTopic, setActiveRibbonTopic] = useState<string>(() => {
    if (['dashboard', 'boq', 'mb', 'rate-analysis', 'resource-breakdown', 'bar-bending-schedule', 'zone-rates', 'norms-library', 'valuation-mb', 'reports', 'user-manual'].includes(activeTab)) {
      return activeTab;
    }
    if (activeTab === 'template-drawings' || activeTab === 'template-editor' || activeTab === 'templates') return 'boq';
    if (activeTab === 'bar-bending' || activeTab === 'bbs') return 'bar-bending-schedule';
    if (activeTab === 'contract-agreement' || activeTab === 'completion-certificate' || activeTab === 'ipc-bill' || activeTab === 'valuation-abstract') return 'valuation-mb';
    if (activeTab === 'resource-master' || activeTab === 'fiscal-year' || activeTab === 'organization') return 'zone-rates';
    return 'boq';
  });

  // Keep Ribbon Topic in sync when activeTab changes
  useEffect(() => {
    if (['dashboard', 'boq', 'mb', 'rate-analysis', 'resource-breakdown', 'bar-bending-schedule', 'zone-rates', 'norms-library', 'valuation-mb', 'reports', 'user-manual'].includes(activeTab)) {
      setActiveRibbonTopic(activeTab);
    } else if (activeTab === 'template-drawings' || activeTab === 'template-editor' || activeTab === 'templates') {
      setActiveRibbonTopic('boq');
    } else if (activeTab === 'bar-bending' || activeTab === 'bbs') {
      setActiveRibbonTopic('bar-bending-schedule');
    } else if (activeTab === 'contract-agreement' || activeTab === 'completion-certificate' || activeTab === 'ipc-bill' || activeTab === 'valuation-abstract') {
      setActiveRibbonTopic('valuation-mb');
    } else if (activeTab === 'resource-master' || activeTab === 'fiscal-year' || activeTab === 'organization') {
      setActiveRibbonTopic('zone-rates');
    }
  }, [activeTab]);

  useEffect(() => {
    const handleNavigate = (e: any) => {
      const tab = typeof e.detail === 'object' && e.detail?.tab ? e.detail.tab : e.detail;
      if (tab && typeof tab === 'string') {
        setActiveTab(tab);
        setActiveRibbonTopic(tab);
      }
    };
    window.addEventListener('uev:navigate-tab', handleNavigate);
    return () => window.removeEventListener('uev:navigate-tab', handleNavigate);
  }, [setActiveTab]);

  const [normsActiveDept, setNormsActiveDept] = useState<string>('ALL');
  const [ratesActiveCat, setRatesActiveCat] = useState<string>('All');
  const [rbSource, setRbSource] = useState<'estimate' | 'valuation'>('estimate');

  const dispatchToolAction = (eventName: string, detail?: any) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  };

  const localToast = (msg: string) => {
    if (showToast) {
      showToast(msg);
    }
  };

  // Format Preferences & Customizer State
  const [formatConfig, setFormatConfig] = useState<AppFormatConfig>(loadFormatPreferences);
  const [isFormatModalOpen, setIsFormatModalOpen] = useState<boolean>(false);
  const [formatModalInitialTab, setFormatModalInitialTab] = useState<'display' | 'mb' | 'presets'>('display');

  useEffect(() => {
    const handleFormatPrefChanged = (e: any) => {
      if (e.detail) {
        setFormatConfig(e.detail);
      }
    };
    window.addEventListener('uev:format-preferences-changed', handleFormatPrefChanged);
    return () => window.removeEventListener('uev:format-preferences-changed', handleFormatPrefChanged);
  }, []);

  const updateFormatConfig = (updater: (prev: AppFormatConfig) => AppFormatConfig) => {
    const updated = updater(formatConfig);
    setFormatConfig(updated);
    saveFormatPreferences(updated);
    localToast('Format preference updated & applied.');
  };

  // Measurement Book (MB) Ribbon State
  const [activeMBBookId, setActiveMBBookId] = useState<string>('all');
  const [mbPrintTarget, setMbPrintTarget] = useState<string>('all');
  const [mbPrintOrientation, setMbPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [mbDisplayMode, setMbDisplayMode] = useState<'both' | 'matrix' | 'details'>('both');
  const [mbPrecision, setMbPrecision] = useState<number>(2);

  // Page Layout States
  const [pageOrientation, setPageOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pageSize, setPageSize] = useState<'A4' | 'Legal' | 'A3'>('A4');
  const [pageMargins, setPageMargins] = useState<'gov' | 'normal' | 'narrow' | 'wide'>('gov');
  const [printScale, setPrintScale] = useState<number>(100);
  const [printGridlines, setPrintGridlines] = useState<boolean>(true);
  const [showLetterheadOnPrint, setShowLetterheadOnPrint] = useState<boolean>(true);
  const [showSignOffsOnPrint, setShowSignOffsOnPrint] = useState<boolean>(true);

  // View States
  const [viewLayoutMode, setViewLayoutMode] = useState<'normal' | 'page_layout' | 'compact'>('normal');
  const [freezePanes, setFreezePanes] = useState<'none' | 'header' | 'firstCol'>('header');
  const [showFormulaBar, setShowFormulaBar] = useState<boolean>(true);
  const [showSummaryCards, setShowSummaryCards] = useState<boolean>(true);

  const handleExportModulePDF = () => {
    if (activeTab === 'mb' || activeRibbonTopic === 'mb') {
      dispatchToolAction('uev:mb-print');
      localToast('Opening Measurement Book (MB) PDF print preview...');
    } else if (activeTab === 'boq' || activeRibbonTopic === 'boq' || activeRibbonTopic === 'estimate') {
      dispatchToolAction('uev:boq-print');
      localToast('Opening Cost Estimate (BOQ) PDF print preview...');
    } else if (activeTab === 'resource-breakdown' || activeRibbonTopic === 'resource-breakdown') {
      dispatchToolAction('uev:resource-export');
      localToast('Exporting Resource Quantities to print preview...');
    } else if (['valuation-mb', 'ipc-bill', 'contract-agreement', 'completion-certificate'].includes(activeTab) || activeRibbonTopic === 'valuation-mb') {
      dispatchToolAction('uev:valuation-print');
      localToast('Opening Valuation & Bill PDF print preview...');
    } else if (activeTab === 'bar-bending-schedule' || activeTab === 'bar-bending' || activeTab === 'bbs') {
      dispatchToolAction('uev:bbs-print');
      localToast('Opening BBS print preview...');
    } else {
      window.print();
    }
  };

  // Dynamic Print and Page Layout style injection
  useEffect(() => {
    let styleTag = document.getElementById('uev-page-layout-style') as HTMLStyleElement;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'uev-page-layout-style';
      document.head.appendChild(styleTag);
    }
    const marginMap = {
      gov: '25mm 15mm 15mm 25mm',
      normal: '20mm',
      narrow: '10mm',
      wide: '30mm'
    };
    styleTag.innerHTML = `
      @page {
        size: ${pageSize.toLowerCase()} ${pageOrientation};
        margin: ${marginMap[pageMargins] || '20mm'};
      }
      ${!printGridlines ? '@media print { table, th, td { border-color: transparent !important; } }' : ''}
      ${!showLetterheadOnPrint ? '@media print { .official-gov-letterhead, [data-letterhead="true"] { display: none !important; } }' : ''}
      ${!showSignOffsOnPrint ? '@media print { .official-signoffs-block, [data-signoffs="true"] { display: none !important; } }' : ''}
    `;
  }, [pageSize, pageOrientation, pageMargins, printGridlines, showLetterheadOnPrint, showSignOffsOnPrint]);

  useEffect(() => {
    const handleActiveBookChanged = (e: any) => {
      if (e.detail) {
        setActiveMBBookId(e.detail);
      }
    };
    const handleDisplayModeChanged = (e: any) => {
      if (e.detail) {
        setMbDisplayMode(e.detail);
      }
    };
    window.addEventListener('uev:mb-active-book-changed', handleActiveBookChanged);
    window.addEventListener('uev:mb-display-mode-changed', handleDisplayModeChanged);
    return () => {
      window.removeEventListener('uev:mb-active-book-changed', handleActiveBookChanged);
      window.removeEventListener('uev:mb-display-mode-changed', handleDisplayModeChanged);
    };
  }, []);

  const mbBooks = useMemo(() => {
    if (project?.measurement_books && project.measurement_books.length > 0) {
      return project.measurement_books;
    }
    return [
      { id: 'mb_1', code: 'MB-01', title: 'Main Civil & Structure Works', remarks: 'Primary Civil Measurement Book' }
    ];
  }, [project?.measurement_books]);

  // Close file menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setIsFileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute stats for bottom status bar
  const totalItemCount = project?.items?.length || 0;
  const directSubtotal = useMemo(() => {
    if (!project?.items) return 0;
    return project.items.reduce((sum, item) => {
      const qty = Number(item.estimated_quantity) || 0;
      const rate = Number(item.calculated_unit_rate || item.user_rate || 0);
      return sum + qty * rate;
    }, 0);
  }, [project?.items]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Stage indicator badge title
  const getStageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'PROJECT DASHBOARD & ANALYTICS';
      case 'boq': return 'ESTIMATE BOQ ABSTRACT (BILL OF QUANTITIES)';
      case 'mb': return 'MEASUREMENT BOOK (DETAILED MB)';
      case 'resource-breakdown': return 'RESOURCE QUANTITIES & MATERIAL REQUISITION';
      case 'rate-analysis': return 'ANALYSIS OF RATES ENGINE (BLD/RDS)';
      case 'bar-bending-schedule':
      case 'bar-bending':
      case 'bbs':
        return 'BAR BENDING SCHEDULE (BBS)';
      case 'zone-rates': return 'ZONE RESOURCE RATES MASTER';
      case 'norms-library': return 'SPECIFICATIONS & NORMS LIBRARY';
      case 'valuation-mb': return 'POST-CONTRACT VALUATION MB';
      case 'valuation-abstract': return 'RUNNING BILL VALUATION ABSTRACT';
      case 'contract-agreement': return 'CONTRACT AGREEMENT & CONTRACTOR BOQ';
      case 'completion-certificate': return 'COMPLETION CERTIFICATE';
      case 'reports': return 'EXECUTIVE ENGINEERING REPORTS';
      case 'user-manual': return 'USER GUIDE & SPECIFICATIONS MANUAL';
      default: return activeTab.toUpperCase();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased select-none">
      {/* 1. TOP TITLE BAR (Excel Dark Blue Bar #101d36) */}
      <header className="bg-[#101d36] text-white text-xs flex items-center justify-between px-3 py-1.5 border-b border-slate-800 shrink-0 z-40 select-none">
        {/* Left: Branding & Quick Access Toolbar */}
        <div className="flex items-center space-x-3">
          {/* App Branding */}
          <div className="flex items-center space-x-2 pr-2 border-r border-slate-700">
            <div className="w-6 h-6 rounded bg-red-600 flex items-center justify-center font-bold text-white shadow-xs">
              <FileSpreadsheet className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold tracking-wide text-sm text-slate-100">Universal Estimating & Valuation</span>
            <span className="text-[11px] text-slate-300 hidden md:inline font-mono">Rate &amp; Quantity Engine</span>
          </div>

          {/* Quick Access Toolbar */}
          <div className="flex items-center space-x-0.5 text-slate-300">
            <button
              onClick={() => {
                onSaveFile();
                localToast('Project data saved to local session.');
              }}
              className="p-1 hover:bg-slate-700 hover:text-white rounded transition cursor-pointer"
              title="Save Project (Ctrl+S)"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
            </button>
            <button
              onClick={() => localToast('Undo performed.')}
              className="p-1 hover:bg-slate-700 hover:text-white rounded transition cursor-pointer"
              title="Undo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => localToast('Redo performed.')}
              className="p-1 hover:bg-slate-700 hover:text-white rounded transition cursor-pointer"
              title="Redo"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => window.print()}
              className="p-1 hover:bg-slate-700 hover:text-white rounded transition cursor-pointer"
              title="Print Active View (Ctrl+P)"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onOpenSearchModal}
              className="p-1 hover:bg-slate-700 hover:text-white rounded transition cursor-pointer"
              title="Global Search Norms & Items (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-blue-300" />
            </button>
            {onOpenSnapshotModal && (
              <button
                onClick={onOpenSnapshotModal}
                className="p-1 hover:bg-slate-700 hover:text-white rounded transition cursor-pointer"
                title="Project Snapshot & Version Lock"
              >
                {isProjectLocked ? (
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 text-slate-300" />
                )}
              </button>
            )}
            {onOpenDatabaseModal && (
              <button
                onClick={onOpenDatabaseModal}
                className="p-1 hover:bg-slate-700 hover:text-white rounded transition cursor-pointer"
                title="Database & Storage Info"
              >
                <Database className="w-3.5 h-3.5 text-purple-300" />
              </button>
            )}
            {onOpenUserSettings && (
              <button
                onClick={onOpenUserSettings}
                className="p-1 hover:bg-slate-700 hover:text-white rounded transition cursor-pointer"
                title="Application Settings & Customizations"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Current Project Badge Pill */}
          <div
            onClick={onOpenProjectModal}
            className="hidden lg:flex items-center bg-[#15233e] hover:bg-[#1a2d52] border border-slate-700 rounded-full px-3 py-1 text-slate-200 text-xs font-medium space-x-2 cursor-pointer transition shadow-xs"
            title="Click to Switch or Manage Projects"
          >
            <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate max-w-xs font-bold text-white">
              Project: {project?.title || activeProjectTitle || 'Capital City Administrative Building Infrastructure'}
            </span>
            <ChevronDown className="w-3 h-3 text-blue-300" />
          </div>

          {/* Mode & User Status Badges */}
          <div className="hidden xl:flex items-center space-x-1.5">
            <span className="bg-blue-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow-2xs">
              {project?.rate_mode === 'contractor' ? 'Contractor Mode' : 'Office Mode'}
            </span>
            <span className="bg-slate-700 text-slate-200 font-medium text-[10px] px-2.5 py-0.5 rounded-full shadow-2xs">
              User: Admin
            </span>
          </div>
        </div>

        {/* Right: Zone, Fiscal Year & Live Sync Info */}
        <div className="flex items-center space-x-3 text-[11px]">
          <div className="flex items-center space-x-2 text-slate-300 font-mono">
            <span>Zone: </span>
            <span className="font-bold text-white bg-blue-900/60 px-1.5 py-0.5 rounded border border-blue-700/50">
              {selectedZone.name_en}
            </span>
            <span className="text-slate-500">|</span>
            <span>FY: </span>
            <span className="text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-700/50">
              {selectedFY}
            </span>
          </div>

          <div className="hidden sm:flex items-center space-x-1.5 border-l border-slate-700 pl-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-300 text-[10px] font-mono">Live Sync</span>
          </div>
        </div>
      </header>

      {/* 2. RIBBON NAVIGATION TABS BAR (Excel-Style Main Topics Row) */}
      <nav
        aria-label="Ribbon Navigation Main Topics"
        className="bg-[#101d36] text-slate-300 text-xs font-medium px-2 flex items-center justify-between border-b border-slate-700 shrink-0 select-none"
      >
        <div className="flex items-center space-x-0.5 overflow-x-auto scrollbar-none">
          {/* Excel File Backstage Button & Dropdown */}
          <div className="relative" ref={fileMenuRef}>
            <button
              onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
              className="px-3 py-1.5 bg-[#b91c1c] hover:bg-red-700 text-white font-bold transition flex items-center space-x-1 rounded-t cursor-pointer"
            >
              <span>File</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {isFileMenuOpen && (
              <div className="absolute left-0 top-full bg-white text-slate-800 shadow-2xl border border-slate-200 rounded-b-xl py-1.5 z-50 w-64 text-xs font-medium animate-fadeIn">
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onSaveFile();
                    localToast('Project data saved successfully.');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-600" /> Save Project (Ctrl+S)
                </button>
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onOpenProjectModal();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-2 cursor-pointer text-blue-700 font-bold"
                >
                  <Building2 className="w-3.5 h-3.5 text-blue-600" /> Open / Switch Project
                </button>
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onNewTemplate();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-indigo-600" /> New Master Template (.uet)
                </button>
                <div className="h-px bg-slate-200 my-1"></div>
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onExportProject();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-2 cursor-pointer text-emerald-700 font-semibold"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" /> Export Project File (.uep / .json)
                </button>
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onExportTemplate();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-2 cursor-pointer text-purple-700 font-semibold"
                >
                  <Upload className="w-3.5 h-3.5 text-purple-600" /> Export Master Template (.uet)
                </button>
                <div className="h-px bg-slate-200 my-1"></div>
                <button
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onOpenRestoreModal();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5 text-cyan-600" /> Database Backup &amp; Restore
                </button>
                {onOpenSnapshotModal && (
                  <button
                    onClick={() => {
                    setIsFileMenuOpen(false);
                    onOpenSnapshotModal();
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-600" /> Estimate Snapshot &amp; Version Lock
                  </button>
                )}
                {onOpenUserSettings && (
                  <button
                    onClick={() => {
                      setIsFileMenuOpen(false);
                      onOpenUserSettings();
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-600" /> Project Settings
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Main Topics (Excel Horizontal Ribbon Tabs) */}
          {[
            { id: 'dashboard', label: 'Home' },
            { id: 'norms-library', label: 'Norms & Rates' },
            { id: 'estimate', label: 'Estimate' },
            { id: 'valuation-mb', label: 'Valuation' },
            { id: 'bar-bending-schedule', label: 'Tools' },
            { id: 'layout', label: 'Page Layout' },
            { id: 'view', label: 'View' },
            { id: 'settings', label: 'Settings' },
            { id: 'user-manual', label: 'Help' }
          ].map((tab) => {
            const isSelected = 
              (tab.id === 'estimate' && (
                activeRibbonTopic === 'estimate' ||
                activeRibbonTopic === 'boq' ||
                activeRibbonTopic === 'mb' ||
                activeRibbonTopic === 'resource-breakdown' ||
                activeTab === 'boq' ||
                activeTab === 'mb' ||
                activeTab === 'resource-breakdown'
              )) ||
              (tab.id === 'dashboard' && activeTab === 'dashboard') ||
              (tab.id === 'norms-library' && (activeTab === 'norms-library' || activeTab === 'zone-rates' || activeRibbonTopic === 'norms-library')) ||
              (tab.id === 'valuation-mb' && (activeTab === 'valuation-mb' || activeTab === 'contract-agreement' || activeTab === 'completion-certificate' || activeTab === 'ipc-bill' || activeRibbonTopic === 'valuation-mb')) ||
              (tab.id === 'bar-bending-schedule' && (activeTab === 'bar-bending-schedule' || activeTab === 'bar-bending' || activeTab === 'bbs' || activeRibbonTopic === 'tools')) ||
              (tab.id === 'layout' && activeRibbonTopic === 'layout') ||
              (tab.id === 'view' && activeRibbonTopic === 'view') ||
              (tab.id === 'user-manual' && activeTab === 'user-manual');

            return (
              <div key={tab.id} className="relative flex items-center shrink-0">
                <button
                  onClick={() => {
                    if (tab.id === 'settings') {
                      if (onOpenUserSettings) onOpenUserSettings();
                      return;
                    }
                    if (tab.id === 'layout') {
                      setActiveRibbonTopic('layout');
                      return;
                    }
                    if (tab.id === 'view') {
                      setActiveRibbonTopic('view');
                      return;
                    }
                    if (tab.id === 'estimate') {
                      if (activeTab === 'mb') {
                        setActiveRibbonTopic('mb');
                      } else if (activeTab === 'resource-breakdown') {
                        setActiveRibbonTopic('resource-breakdown');
                      } else {
                        setActiveRibbonTopic('boq');
                        setActiveTab('boq');
                      }
                      return;
                    }
                    setActiveRibbonTopic(tab.id);
                    setActiveTab(tab.id);
                  }}
                  className={`ribbon-tab ${
                    isSelected
                      ? 'active bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  } px-3.5 py-1.5 text-xs font-semibold rounded-t transition cursor-pointer whitespace-nowrap flex items-center gap-1.5`}
                  title={tab.id === 'estimate' ? 'Estimate Module: Measurement Book (MB), Cost Estimate (BOQ), & Resource Quantities' : `Switch to ${tab.label}`}
                >
                  <span>{tab.label}</span>
                  {tab.id === 'estimate' && (
                    <span className={`text-[10px] font-bold hidden sm:inline px-1 py-0.2 rounded ${
                      isSelected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-800 text-slate-300'
                    }`}>
                      MB • BOQ • Qty
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>



        {/* Right Utility: Nav Tree & Fullscreen */}
        <div className="flex items-center space-x-1 pl-2">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer flex items-center gap-1 text-[11px] ${
              isSidebarOpen ? 'bg-slate-800 text-white font-bold' : ''
            }`}
            title="Toggle Navigation Tree Panel"
          >
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} />
            <span className="hidden sm:inline">Nav Tree</span>
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </nav>

      {/* 3. SUBSIDIARY RIBBON COMMAND BAR (Excel-Style Subtopics and Tools) */}
      <div className="bg-white border-b border-slate-200 px-3 py-1 flex items-center justify-between shadow-2xs h-[100px] shrink-0 select-none overflow-x-auto">
        {/* --- A. ESTIMATE (BOQ) SUBSIDIARY RIBBON --- */}
        {((activeRibbonTopic === 'boq' || activeRibbonTopic === 'estimate' || activeTab === 'boq') && activeRibbonTopic !== 'mb' && activeTab !== 'mb' && activeRibbonTopic !== 'resource-breakdown' && activeTab !== 'resource-breakdown') && (
          <div className="flex items-stretch space-x-1.5 w-full overflow-x-auto">
            {/* Group 1: Estimate Module 3-Way Sub-Nav */}
            <div className="flex flex-col justify-between px-1.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100 shadow-2xs gap-0.5">
                <button
                  onClick={() => {
                    setActiveRibbonTopic('mb');
                    setActiveTab('mb');
                    localToast('Switched to Measurement Book (MB).');
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded text-slate-700 hover:text-purple-900 hover:bg-white transition flex items-center gap-1 cursor-pointer"
                  title="1. Measurement Book ( - L × B × H)"
                >
                  <Ruler className="w-3.5 h-3.5 text-purple-600" />
                  <span>1. MB</span>
                </button>
                <button
                  className="px-2.5 py-1 text-xs font-black rounded bg-emerald-600 text-white shadow-xs flex items-center gap-1 cursor-default"
                  title="Current Active: 2. Cost Estimate / BOQ Abstract"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                  <span>2. Estimate</span>
                </button>
                <button
                  onClick={() => {
                    setActiveRibbonTopic('resource-breakdown');
                    setActiveTab('resource-breakdown');
                    localToast('Switched to Resource Quantity Breakdown.');
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded text-slate-700 hover:text-blue-900 hover:bg-white transition flex items-center gap-1 cursor-pointer"
                  title="3. Resource Quantity Breakdown"
                >
                  <Boxes className="w-3.5 h-3.5 text-blue-600" />
                  <span>3. Resource Qty</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 select-none">
                Module Workflow
              </span>
            </div>

            {/* Group 2: Estimate Mode & Tax Configuration */}
            <div className="flex flex-col justify-between px-2 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex flex-col gap-1 py-0.5">
                <div className="inline-flex rounded-md overflow-hidden border border-slate-300 shadow-2xs text-xs">
                  <button
                    onClick={() => {
                      dispatchToolAction('uev:boq-set-mode', 'user');
                      localToast('Switched to Office Estimate Mode (0% Civil Tax).');
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                      project?.rate_mode !== 'contractor'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                    title="Office / Departmental Estimate Mode: 0% Tax on Civil Items"
                  >
                    Office Mode (0% Tax)
                  </button>
                  <button
                    onClick={() => {
                      dispatchToolAction('uev:boq-set-mode', 'contractor');
                      localToast('Switched to Contractor Tender Mode (tax + 15% OH).');
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold transition cursor-pointer border-l border-slate-300 ${
                      project?.rate_mode === 'contractor'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                    title="Contractor / Tender Mode: tax on Civil Subtotal"
                  >
                    Contractor (Tax incl.)
                  </button>
                </div>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 select-none">
                Estimate Mode
              </span>
            </div>

            {/* Group 3: MB Linkage & Source */}
            <div className="flex flex-col justify-between px-2 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1 py-0.5">
                <button
                  onClick={() => {
                    dispatchToolAction('uev:boq-toggle-mb-filter');
                  }}
                  className="flex flex-col items-center justify-center p-1 px-2.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-2xs transition cursor-pointer min-w-[70px] h-[52px]"
                  title="Filter or Link Measurement Books to Estimate Abstract"
                >
                  <BookOpen className="w-4 h-4 text-purple-600 mb-0.5" />
                  <span className="text-[10px] font-bold leading-tight text-center">
                    MB Source<br />
                    <span className="text-[9px] font-normal text-purple-700">Combined</span>
                  </span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 select-none">
                MB Linkage
              </span>
            </div>

            {/* Group 4: Items & Data Transfer */}
            <div className="flex flex-col justify-between px-2 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1.5 py-0.5">
                <button
                  onClick={() => dispatchToolAction('uev:boq-add-item')}
                  className="flex flex-col items-center justify-center p-1 px-2.5 rounded border border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 shadow-2xs transition cursor-pointer min-w-[60px] h-[52px]"
                  title="Add Work Item from Norms Library"
                >
                  <Plus className="w-4 h-4 text-emerald-700 mb-0.5" />
                  <span className="text-[10px] font-bold leading-tight text-center">
                    + Add<br />
                    <span className="text-[9px] font-normal text-emerald-800">Item</span>
                  </span>
                </button>

                <button
                  onClick={() => dispatchToolAction('uev:boq-import-excel')}
                  className="flex flex-col items-center justify-center p-1 px-2.5 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-900 shadow-2xs transition cursor-pointer min-w-[64px] h-[52px]"
                  title="Import BOQ from Excel Spreadsheet (.xlsx)"
                >
                  <Upload className="w-4 h-4 text-blue-700 mb-0.5" />
                  <span className="text-[10px] font-bold leading-tight text-center">
                    Import<br />
                    <span className="text-[9px] font-normal text-blue-800">Excel</span>
                  </span>
                </button>

                <button
                  onClick={() => dispatchToolAction('uev:boq-export-excel')}
                  className="flex flex-col items-center justify-center p-1 px-2.5 rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 shadow-2xs transition cursor-pointer min-w-[64px] h-[52px]"
                  title="Export Estimate to Excel (.xlsx) or PDF"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700 mb-0.5" />
                  <span className="text-[10px] font-bold leading-tight text-center">
                    Export<br />
                    <span className="text-[9px] font-normal text-emerald-800">Excel / PDF</span>
                  </span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 select-none">
                Data Transfer
              </span>
            </div>

            {/* Group 5: Calculation & Integrity Audit */}
            <div className="flex flex-col justify-between px-2 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1.5 py-0.5">
                <button
                  onClick={() => {
                    dispatchToolAction('uev:boq-recalculate');
                    localToast('Recalculated BOQ quantities & rates.');
                  }}
                  className="flex flex-col items-center justify-center p-1 px-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-2xs transition cursor-pointer min-w-[60px] h-[52px]"
                  title="Recalculate all rates, quantities, and subtotal amounts"
                >
                  <RotateCw className="w-4 h-4 text-blue-600 mb-0.5" />
                  <span className="text-[10px] font-bold leading-tight text-center">
                    Recalculate<br />
                    <span className="text-[9px] font-normal text-slate-500">Totals</span>
                  </span>
                </button>

                <button
                  onClick={() => dispatchToolAction('uev:boq-audit')}
                  className="flex flex-col items-center justify-center p-1 px-2 rounded border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-900 shadow-2xs transition cursor-pointer min-w-[56px] h-[52px]"
                  title="Run BOQ Integrity & Math Audit Check"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mb-0.5" />
                  <span className="text-[10px] font-bold leading-tight text-center">
                    Audit<br />
                    <span className="text-[9px] font-normal text-slate-500">Verify</span>
                  </span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 select-none">
                Audit &amp; Math
              </span>
            </div>

            {/* Group 6: Page Setup & Output */}
            <div className="flex flex-col justify-between px-2 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1.5 py-0.5">
                <div className="flex flex-col gap-1">
                  <select
                    onChange={(e) => dispatchToolAction('uev:boq-set-orientation', { orientation: e.target.value })}
                    className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-[11px] font-semibold px-2 py-1 rounded shadow-2xs cursor-pointer focus:outline-none"
                    defaultValue="portrait"
                    title="Page Print Orientation"
                  >
                    <option value="portrait">📄 Portrait</option>
                    <option value="landscape">📑 Landscape</option>
                  </select>
                  <button
                    onClick={() => dispatchToolAction('uev:boq-print')}
                    className="flex items-center justify-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-[11px] font-bold shadow-2xs transition cursor-pointer"
                    title="Print Official BOQ Document"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-700" />
                    <span>Print BOQ</span>
                  </button>
                </div>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 select-none">
                Page Setup &amp; Print
              </span>
            </div>

            {/* Group 7: Live Summary KPI Pill */}
            <div className="flex flex-col justify-between px-3 py-0.5 shrink-0 ml-auto">
              <div className="flex flex-col justify-center h-[52px] bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-right">
                <div className="text-[10px] text-slate-500 font-semibold">
                  Items: <span className="font-bold text-slate-800">{totalItemCount}</span>
                </div>
                <div className="text-[11px] font-extrabold text-emerald-800 font-mono">
                  {currencyCode()} {directSubtotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </div>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-right mt-1 select-none">
                Estimate Total
              </span>
            </div>
          </div>
        )}

        {/* --- B. MEASUREMENTS (MB) SUBSIDIARY RIBBON --- */}
        {activeRibbonTopic === 'mb' && (
          <div className="flex items-stretch space-x-1 w-full overflow-x-auto">
            {/* Estimate Module 3-Way Sub-Nav */}
            <div className="flex flex-col justify-between px-1.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100 shadow-2xs gap-0.5">
                <button
                  className="px-2.5 py-1 text-xs font-black rounded bg-purple-700 text-white shadow-xs flex items-center gap-1 cursor-default"
                  title="Current Active: 1. Measurement Book ( - L × B × H)"
                >
                  <Ruler className="w-3.5 h-3.5 text-purple-100" />
                  <span>1. MB</span>
                </button>
                <button
                  onClick={() => {
                    setActiveRibbonTopic('boq');
                    setActiveTab('boq');
                    localToast('Switched to Cost Estimate Abstract (BOQ).');
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded text-slate-700 hover:text-emerald-900 hover:bg-white transition flex items-center gap-1 cursor-pointer"
                  title="2. Cost Estimate / BOQ Abstract"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2. Estimate</span>
                </button>
                <button
                  onClick={() => {
                    setActiveRibbonTopic('resource-breakdown');
                    setActiveTab('resource-breakdown');
                    localToast('Switched to Resource Quantity Breakdown.');
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded text-slate-700 hover:text-blue-900 hover:bg-white transition flex items-center gap-1 cursor-pointer"
                  title="3. Resource Quantity Breakdown"
                >
                  <Boxes className="w-3.5 h-3.5 text-blue-600" />
                  <span>3. Resource Qty</span>
                </button>
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 select-none">
                Estimate Module
              </span>
            </div>

            {/* Subtopic Group 1: Books & Sets */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => {
                    setActiveMBBookId('all');
                    window.dispatchEvent(new CustomEvent('uev:mb-select-book', { detail: 'all' }));
                  }}
                  className={`flex flex-col items-center justify-center p-1 rounded border transition cursor-pointer min-w-[56px] shadow-2xs ${
                    activeMBBookId === 'all'
                      ? 'bg-amber-400 border-amber-500 text-slate-950 font-black'
                      : 'border-transparent text-slate-700 hover:bg-white hover:border-slate-300'
                  }`}
                  title="View All Combined MB Books"
                >
                  <BookOpen className={`w-4 h-4 mb-0.5 ${activeMBBookId === 'all' ? 'text-slate-950' : 'text-amber-600'}`} />
                  <span className="text-[10px] font-semibold leading-tight text-center">
                    Combined<br />
                    <span className="text-[9px] opacity-80">({mbBooks.length})</span>
                  </span>
                </button>

                <div className="flex items-center space-x-1 max-w-[180px] overflow-x-auto py-0.5">
                  {mbBooks.map((book) => (
                    <button
                      key={book.id}
                      onClick={() => {
                        setActiveMBBookId(book.id);
                        window.dispatchEvent(new CustomEvent('uev:mb-select-book', { detail: book.id }));
                      }}
                      className={`flex flex-col items-center justify-center px-1.5 py-1 rounded border transition cursor-pointer min-w-[48px] shadow-2xs ${
                        activeMBBookId === book.id
                          ? 'bg-blue-600 border-blue-700 text-white font-black'
                          : 'border-transparent text-slate-700 hover:bg-white hover:border-slate-300'
                      }`}
                      title={`${book.code}: ${book.title}`}
                    >
                      <span className="text-[11px] font-mono font-bold leading-tight">{book.code}</span>
                      <span className="text-[9px] opacity-85 truncate max-w-[44px]">Book</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => dispatchToolAction('uev:mb-add-book')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[44px]"
                  title="Add New Measurement Book Set"
                >
                  <Plus className="w-4 h-4 text-emerald-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">New<br />MB</span>
                </button>

                {activeMBBookId !== 'all' && mbBooks.length > 1 && (
                  <button
                    onClick={() => dispatchToolAction('uev:mb-delete-book', activeMBBookId)}
                    className="flex flex-col items-center justify-center p-1 rounded hover:bg-red-50 hover:border-red-300 border border-transparent transition cursor-pointer text-slate-500 hover:text-red-700 group shadow-2xs min-w-[44px]"
                    title="Delete Current Selected Measurement Book"
                  >
                    <Trash2 className="w-4 h-4 text-red-500 mb-0.5 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-semibold leading-tight text-center">Delete<br />MB</span>
                  </button>
                )}
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Measurement Books
              </span>
            </div>

            {/* Subtopic Group 2: Items & Structure */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => dispatchToolAction('uev:mb-add-item')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[50px]"
                  title="Add Work Item from Norms Library"
                >
                  <Plus className="w-4 h-4 text-blue-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">+ Work<br />Item</span>
                </button>
                <button
                  onClick={() => dispatchToolAction('uev:mb-toggle-headings')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[52px]"
                  title="Manage Section Headings (Earthworks, Substructure, etc.)"
                >
                  <FolderPlus className="w-4 h-4 text-amber-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Section<br />Headings</span>
                </button>
                <button
                  onClick={() => dispatchToolAction('uev:mb-toggle-header-edit')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[52px]"
                  title="Configure Official Local Authority Document Headings & Table Headers"
                >
                  <Edit2 className="w-4 h-4 text-indigo-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Doc<br />Headings</span>
                </button>
                <button
                  onClick={() => dispatchToolAction('uev:mb-toggle-signatures')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[52px]"
                  title="Manage Official Signatures (Prepared by, Checked by, Approved by)"
                >
                  <FileCheck className="w-4 h-4 text-teal-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Sign-<br />Offs</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Items &amp; Headings
              </span>
            </div>

            {/* Subtopic Group 3: Record Entries & Calculations */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => dispatchToolAction('uev:mb-add-row')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[48px]"
                  title="Add New Measurement Record Row (L × B × H)"
                >
                  <Plus className="w-4 h-4 text-purple-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Add<br />Entry</span>
                </button>
                <button
                  onClick={() => dispatchToolAction('uev:mb-add-deduction')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[48px]"
                  title="Add Negative Deduction Entry (-)"
                >
                  <MinusCircle className="w-4 h-4 text-red-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Deduct<br />(-)</span>
                </button>
                <button
                  onClick={() => dispatchToolAction('uev:mb-add-custom-col')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[48px]"
                  title="Add Custom Column to MB Table (Chainage, Grid Axis, Multiplier, etc.)"
                >
                  <Grid className="w-4 h-4 text-blue-700 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">+ Col<br />Custom</span>
                </button>
                <button
                  onClick={() => dispatchToolAction('uev:mb-open-takeoff')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group"
                  title="PDF / Drawing Takeoff: measure lengths, areas and counts on a drawing and send them to the MB"
                >
                  <Ruler className="w-4 h-4 text-emerald-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">PDF<br />Takeoff</span>
                </button>
                <button
                  onClick={() => dispatchToolAction('uev:mb-link-guide')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[48px]"
                  title="Cell Link Guide & Formula Syntax Reference (=ITEM.QTY, etc.)"
                >
                  <Link2 className="w-4 h-4 text-indigo-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Cell<br />Links</span>
                </button>
                <button
                  onClick={() => dispatchToolAction('uev:mb-toggle-expand')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[48px]"
                  title="Toggle Expand / Collapse All Measurement Rows"
                >
                  <ChevronUp className="w-4 h-4 text-slate-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Expand<br />Rows</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Entries &amp; Calc
              </span>
            </div>

            {/* Subtopic Group 4: View Modes & Precision */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1.5">
                <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMbDisplayMode('both');
                      dispatchToolAction('uev:mb-set-display-mode', 'both');
                    }}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                      mbDisplayMode === 'both'
                        ? 'bg-blue-900 text-white font-extrabold shadow-2xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                    title="Show Both Matrix Summary & Itemized Details"
                  >
                    <span>📊 All-in-One</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMbDisplayMode('matrix');
                      dispatchToolAction('uev:mb-set-display-mode', 'matrix');
                    }}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                      mbDisplayMode === 'matrix'
                        ? 'bg-blue-900 text-white font-extrabold shadow-2xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                    title="Cross-Book Quantity Summary Matrix Only"
                  >
                    <span>📈 Matrix</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMbDisplayMode('details');
                      dispatchToolAction('uev:mb-set-display-mode', 'details');
                    }}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                      mbDisplayMode === 'details'
                        ? 'bg-blue-900 text-white font-extrabold shadow-2xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                    title="Itemized Measurement Book Details Only"
                  >
                    <span>📝 Details</span>
                  </button>
                </div>

                <div className="flex flex-col justify-center gap-1 border-l border-slate-200 pl-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-600">Decimals:</span>
                    <select
                      value={mbPrecision}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setMbPrecision(val);
                        dispatchToolAction('uev:mb-set-precision', val);
                      }}
                      className="bg-white border border-slate-300 rounded px-1 py-0.2 text-[10px] font-mono font-bold text-slate-800 cursor-pointer"
                      title="Decimal Places Precision"
                    >
                      <option value={1}>1 (0.0)</option>
                      <option value={2}>2 (0.00)</option>
                      <option value={3}>3 (0.000)</option>
                      <option value={4}>4 (0.0000)</option>
                    </select>
                  </div>
                </div>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                View &amp; Precision
              </span>
            </div>

            {/* Subtopic Group 5: Format & Sheet Management */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => {
                    if (onOpenUserSettings) {
                      onOpenUserSettings('format');
                    } else {
                      setFormatModalInitialTab('mb');
                      setIsFormatModalOpen(true);
                    }
                  }}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[50px]"
                  title="Format MB: Table Density, Font Size, Ruled Lines, Number Systems & Bikram Sambat"
                >
                  <Sliders className="w-4 h-4 text-blue-700 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Format<br />MB</span>
                </button>
                <button
                  onClick={() => dispatchToolAction('uev:mb-blank-sheet')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[52px]"
                  title="Reset to Blank Sheet with official letterhead and ruled rows (no placeholder items)"
                >
                  <RotateCcw className="w-4 h-4 text-amber-600 mb-0.5 group-hover:rotate-180 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Blank<br />Sheet</span>
                </button>
                <button
                  onClick={() => dispatchToolAction('uev:mb-load-sample')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[52px]"
                  title="Populate Standard Civil Engineering Sample Measurement Book Items"
                >
                  <Boxes className="w-4 h-4 text-emerald-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Load<br />Sample</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Format &amp; Setup
              </span>
            </div>

            {/* Subtopic Group 6: Print & Layout Options */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1 bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                <select
                  value={mbPrintTarget}
                  onChange={(e) => setMbPrintTarget(e.target.value)}
                  className="bg-transparent text-[11px] font-bold text-blue-900 px-1 py-0.5 focus:outline-none cursor-pointer border-r border-slate-200"
                  title="Choose print scope"
                >
                  <option value="all">📊 Combined</option>
                  {mbBooks.map((b) => (
                    <option key={b.id} value={b.id}>
                      📖 {b.code}
                    </option>
                  ))}
                </select>

                <select
                  value={mbPrintOrientation}
                  onChange={(e) => setMbPrintOrientation(e.target.value as 'portrait' | 'landscape')}
                  className="bg-transparent text-[11px] font-medium text-slate-700 px-1 py-0.5 focus:outline-none cursor-pointer border-r border-slate-200"
                  title="Page Orientation"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>

                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('uev:mb-print', {
                      detail: { target: mbPrintTarget, orientation: mbPrintOrientation }
                    }));
                  }}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold transition cursor-pointer shadow-2xs flex items-center gap-1"
                  title="Print Measurement Book (Official Format)"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-bold">Print</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Print &amp; Layout
              </span>
            </div>

            {/* Subtopic Group 7: Data Transfer & Sync */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => dispatchToolAction('uev:mb-sync-boq')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[50px]"
                  title="Push Measured Quantities directly to BOQ Estimate"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-600 mb-0.5 group-hover:rotate-180 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Sync to<br />BOQ</span>
                </button>
                <button
                  onClick={() => dispatchToolAction('uev:mb-import-sheet')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[50px]"
                  title="Import Measurement Detail Sheet (CSV / Excel)"
                >
                  <Upload className="w-4 h-4 text-slate-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Import<br />Sheet</span>
                </button>
                <button
                  onClick={() => dispatchToolAction('uev:mb-export-excel')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[50px]"
                  title="Export Measurement Book to Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Export<br />Excel</span>
                </button>
                <button
                  onClick={() => dispatchToolAction('uev:mb-office-sync')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[50px]"
                  title="Live Office Cloud Sync"
                >
                  <Sparkles className="w-4 h-4 text-teal-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Office<br />Sync</span>
                </button>
                <button
                  onClick={() => setActiveTab('template-drawings')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[50px]"
                  title="Open AutoCAD / Cross-Section Drawings"
                >
                  <PenTool className="w-4 h-4 text-purple-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Drawings<br />Sheet</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Data &amp; Sync
              </span>
            </div>

            {/* Subtopic Group 8: Linked Sheets */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 shrink-0">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => { setActiveRibbonTopic('boq'); setActiveTab('boq'); }}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[50px]"
                  title="Return to BOQ Estimate Abstract"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">BOQ<br />Abstract</span>
                </button>
                <button
                  onClick={() => { setActiveRibbonTopic('rate-analysis'); setActiveTab('rate-analysis'); }}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[50px]"
                  title="Go to Rate Analysis Engine"
                >
                  <Layers className="w-4 h-4 text-blue-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Rate<br />Analysis</span>
                </button>
                <button
                  onClick={() => { setActiveRibbonTopic('bar-bending-schedule'); setActiveTab('bar-bending-schedule'); }}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[50px]"
                  title="Open Bar Bending Schedule"
                >
                  <PenTool className="w-4 h-4 text-indigo-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">BBS<br />Sheet</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Linked Sheets
              </span>
            </div>
          </div>
        )}

        {/* --- C. RATE ANALYSIS SUBSIDIARY RIBBON --- */}
        {activeRibbonTopic === 'rate-analysis' && (
          <div className="flex items-stretch space-x-1 w-full">
            {/* Subtopic Group: Norms Specifications */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => localToast('Standard Building Norms loaded.')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[54px]"
                  title="BLD Department of Urban Development & Building Construction Norms"
                >
                  <Building className="w-4 h-4 text-blue-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">BLD<br/>Building</span>
                </button>
                <button
                  onClick={() => localToast('Roads Dept. Road & Bridge Norms loaded.')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[54px]"
                  title="Department of Roads Norms"
                >
                  <Truck className="w-4 h-4 text-amber-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Roads Dept.<br/>Roads</span>
                </button>
                <button
                  onClick={onOpenSearchModal}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[52px]"
                  title="Search Norms Catalog"
                >
                  <Search className="w-4 h-4 text-indigo-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Search<br/>Norms</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Norms Specifications
              </span>
            </div>

            {/* Subtopic Group: Zone Rates & OH */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex flex-col justify-center space-y-1">
                <div className="flex items-center space-x-2 text-[10.5px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                  <span>Zone: <strong className="text-slate-900">{selectedZone.name_en}</strong></span>
                  <span className="text-slate-400">•</span>
                  <span>FY: <strong className="text-slate-900">{selectedFY}</strong></span>
                </div>
                <div className="flex items-center space-x-2 text-[10px] text-slate-600 px-1 font-mono">
                  <span>Overhead: <strong className="text-emerald-700">15.0% (Contractor)</strong></span>
                  <span>•</span>
                  <span>Tax on Mat: <strong className="text-slate-800">13% Built-in</strong></span>
                </div>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Zone Rates &amp; OH
              </span>
            </div>

            {/* Subtopic Group: Breakdown Matrices */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => localToast('Viewing Labor breakdown coefficients.')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[50px]"
                  title="Skilled and Unskilled Labor Matrix"
                >
                  <Users className="w-4 h-4 text-purple-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Labor<br/>Matrix</span>
                </button>
                <button
                  onClick={() => localToast('Viewing Materials breakdown coefficients.')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[50px]"
                  title="Materials and Wastage Breakdown"
                >
                  <Boxes className="w-4 h-4 text-amber-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Materials<br/>Matrix</span>
                </button>
                <button
                  onClick={() => localToast('Viewing Equipment and Machinery hire rates.')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[50px]"
                  title="Equipment &amp; Machinery Hire Breakdown"
                >
                  <Wrench className="w-4 h-4 text-blue-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Equipment<br/>Plant</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Breakdown Matrices
              </span>
            </div>

            {/* Subtopic Group: Actions */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 shrink-0">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => window.print()}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[52px]"
                  title="Print Rate Analysis Booklet"
                >
                  <Printer className="w-4 h-4 text-slate-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Print<br/>Booklet</span>
                </button>
                <button
                  onClick={() => { setActiveRibbonTopic('boq'); setActiveTab('boq'); }}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[52px]"
                  title="Return to BOQ Estimate"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">BOQ<br/>Estimate</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Actions &amp; Export
              </span>
            </div>
          </div>
        )}

        {/* --- D. QUANTITIES & INDENTS SUBSIDIARY RIBBON --- */}
        {activeRibbonTopic === 'resource-breakdown' && (
          <div className="flex items-stretch space-x-1 w-full overflow-x-auto">
            {/* Estimate Module 3-Way Sub-Nav */}
            <div className="flex flex-col justify-between px-1.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100 shadow-2xs gap-0.5">
                <button
                  onClick={() => {
                    setActiveRibbonTopic('mb');
                    setActiveTab('mb');
                    localToast('Switched to Measurement Book (MB).');
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded text-slate-700 hover:text-purple-900 hover:bg-white transition flex items-center gap-1 cursor-pointer"
                  title="1. Measurement Book ( - L × B × H)"
                >
                  <Ruler className="w-3.5 h-3.5 text-purple-600" />
                  <span>1. MB</span>
                </button>
                <button
                  onClick={() => {
                    setActiveRibbonTopic('boq');
                    setActiveTab('boq');
                    localToast('Switched to Cost Estimate Abstract (BOQ).');
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded text-slate-700 hover:text-emerald-900 hover:bg-white transition flex items-center gap-1 cursor-pointer"
                  title="2. Cost Estimate / BOQ Abstract"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2. Estimate</span>
                </button>
                <button
                  className="px-2.5 py-1 text-xs font-black rounded bg-blue-600 text-white shadow-xs flex items-center gap-1 cursor-default"
                  title="Current Active: 3. Resource Quantity Breakdown"
                >
                  <Boxes className="w-3.5 h-3.5 text-blue-100" />
                  <span>3. Resource Qty</span>
                </button>
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 select-none">
                Estimate Module
              </span>
            </div>

            {/* Subtopic Group: Context Source */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1 py-0.5">
                <button
                  onClick={() => {
                    setRbSource('estimate');
                    dispatchToolAction('uev:rb-set-source', 'estimate');
                  }}
                  className={`px-2.5 py-1 rounded text-[10.5px] font-bold transition cursor-pointer ${
                    rbSource === 'estimate'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  📋 Estimate Mode
                </button>
                <button
                  onClick={() => {
                    setRbSource('valuation');
                    dispatchToolAction('uev:rb-set-source', 'valuation');
                  }}
                  className={`px-2.5 py-1 rounded text-[10.5px] font-bold transition cursor-pointer ${
                    rbSource === 'valuation'
                      ? 'bg-purple-700 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  📈 Valuation Mode
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Source Context
              </span>
            </div>

            {/* Subtopic Group: Export & Print */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => dispatchToolAction('uev:rb-export-excel')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 min-w-[50px]"
                  title="Export Resource Quantities to Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 mb-0.5" />
                  <span className="text-[10px] font-bold leading-tight text-center">Excel</span>
                </button>
                <button
                  onClick={() => dispatchToolAction('uev:rb-export-csv')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 min-w-[50px]"
                  title="Export Resource Breakdown to CSV"
                >
                  <Download className="w-4 h-4 text-blue-600 mb-0.5" />
                  <span className="text-[10px] font-bold leading-tight text-center">CSV</span>
                </button>
                <button
                  onClick={() => dispatchToolAction('uev:rb-print')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 min-w-[50px]"
                  title="Print Official Resource Breakdown Sheet"
                >
                  <Printer className="w-4 h-4 text-slate-700 mb-0.5" />
                  <span className="text-[10px] font-bold leading-tight text-center">Print</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Export &amp; Print
              </span>
            </div>

            {/* Subtopic Group: Key Materials Monitor */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1.5">
                <div className="flex flex-col items-center justify-center p-1 bg-white rounded border border-slate-200 min-w-[54px]">
                  <span className="text-[10px] text-slate-500 font-semibold">Cement</span>
                  <span className="text-xs font-bold text-emerald-700 font-mono">Bags</span>
                </div>
                <div className="flex flex-col items-center justify-center p-1 bg-white rounded border border-slate-200 min-w-[54px]">
                  <span className="text-[10px] text-slate-500 font-semibold">Rebar</span>
                  <span className="text-xs font-bold text-blue-700 font-mono">MT</span>
                </div>
                <div className="flex flex-col items-center justify-center p-1 bg-white rounded border border-slate-200 min-w-[54px]">
                  <span className="text-[10px] text-slate-500 font-semibold">Aggregates</span>
                  <span className="text-xs font-bold text-amber-700 font-mono">m³</span>
                </div>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Key Materials
              </span>
            </div>

            {/* Subtopic Group: Output & Export */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 shrink-0">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => { setActiveRibbonTopic('boq'); setActiveTab('boq'); }}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 min-w-[52px]"
                  title="Return to BOQ Estimate"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 mb-0.5" />
                  <span className="text-[10px] font-semibold leading-tight text-center">BOQ<br/>Estimate</span>
                </button>
                <button
                  onClick={() => { setActiveRibbonTopic('mb'); setActiveTab('mb'); }}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 min-w-[52px]"
                  title="Go to Measurement Book"
                >
                  <Ruler className="w-4 h-4 text-blue-600 mb-0.5" />
                  <span className="text-[10px] font-semibold leading-tight text-center">MB<br/>Book</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Workbook
              </span>
            </div>
          </div>
        )}

        {/* --- E. BAR BENDING (BBS) SUBSIDIARY RIBBON --- */}
        {activeRibbonTopic === 'bar-bending-schedule' && (
          <div className="flex items-stretch space-x-1 w-full">
            {/* Subtopic Group: Structural Elements */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => localToast('Selected Footings & Foundation steel schedule.')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[54px]"
                  title="Footings & Foundation"
                >
                  <Building2 className="w-4 h-4 text-blue-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Footing &amp;<br/>Foundation</span>
                </button>
                <button
                  onClick={() => localToast('Selected Columns & Ties steel schedule.')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[54px]"
                  title="Columns & Ties"
                >
                  <Layers className="w-4 h-4 text-emerald-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Columns &amp;<br/>Ties</span>
                </button>
                <button
                  onClick={() => localToast('Selected Beams & Slabs steel schedule.')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[54px]"
                  title="Beams & Slabs"
                >
                  <PenTool className="w-4 h-4 text-purple-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Beams &amp;<br/>Slabs</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Structural Members
              </span>
            </div>

            {/* Subtopic Group: Standards & Deductions */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex flex-col justify-center space-y-1">
                <div className="flex items-center space-x-2 text-[10.5px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                  <span>Bend Deduction: <strong>45° = 1d | 90° = 2d</strong></span>
                </div>
                <div className="flex items-center space-x-2 text-[10px] text-slate-600 px-1 font-mono">
                  <span>Hook Length: <strong>9d / 10d</strong></span>
                  <span>•</span>
                  <span>Wastage Margin: <strong>2.5%</strong></span>
                </div>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Rebar Standards
              </span>
            </div>

            {/* Subtopic Group: Output */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 shrink-0">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => window.print()}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[52px]"
                  title="Print BBS Report"
                >
                  <Printer className="w-4 h-4 text-slate-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Print<br/>BBS</span>
                </button>
                <button
                  onClick={() => { setActiveRibbonTopic('mb'); setActiveTab('mb'); }}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[52px]"
                  title="Go to Measurement Book"
                >
                  <Ruler className="w-4 h-4 text-purple-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">View<br/>MB</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Output &amp; Print
              </span>
            </div>
          </div>
        )}

        {/* --- F. VALUATION & BILLING SUBSIDIARY RIBBON --- */}
        {activeRibbonTopic === 'valuation-mb' && (
          <div className="flex items-stretch space-x-1 w-full">
            {/* Subtopic Group: Valuation Stages */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setActiveTab('valuation-mb')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[54px]"
                  title="Post-Contract Valuation MB"
                >
                  <FileText className="w-4 h-4 text-blue-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Valuation<br/>MB</span>
                </button>
                <button
                  onClick={() => setActiveTab('valuation-abstract')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[54px]"
                  title="Interim Payment Certificate (IPC Running Bill)"
                >
                  <DollarSign className="w-4 h-4 text-emerald-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Running<br/>Bill (IPC)</span>
                </button>
                <button
                  onClick={() => dispatchToolAction('uev:vmb-open-takeoff')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group"
                  title="PDF / Drawing Takeoff: measure lengths, areas and counts on a drawing and send them to the MB"
                >
                  <Ruler className="w-4 h-4 text-emerald-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">PDF<br />Takeoff</span>
                </button>
                <button
                  onClick={() => setActiveTab('contract-agreement')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[54px]"
                  title="Contract Agreement &amp; Tender Schedule"
                >
                  <FileCode className="w-4 h-4 text-indigo-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Contract<br/>Agreement</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Valuation Stages
              </span>
            </div>

            {/* Subtopic Group: Deductions & Retention */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex flex-col justify-center space-y-1">
                <div className="flex items-center space-x-2 text-[10.5px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                  <span>Retention: <strong>5.0%</strong></span>
                  <span className="text-slate-400">•</span>
                  <span>Mob. Recovery: <strong>Auto</strong></span>
                </div>
                <div className="flex items-center space-x-2 text-[10px] text-slate-600 px-1 font-mono">
                  <span>Tax: <strong>Per project</strong></span>
                  <span>•</span>
                  <span>Security Dep: <strong>Held</strong></span>
                </div>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Statutory Deductions
              </span>
            </div>

            {/* Subtopic Group: Certification */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 shrink-0">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setActiveTab('completion-certificate')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[54px]"
                  title="Completion Certificate (Completion Certificate)"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Completion<br/>Certificate</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[52px]"
                  title="Print Current Valuation Certificate"
                >
                  <Printer className="w-4 h-4 text-slate-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Print<br/>Bill</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Certification &amp; Print
              </span>
            </div>
          </div>
        )}

        {/* --- G. RATES & NORMS MASTER SUBSIDIARY RIBBON --- */}
        {(activeRibbonTopic === 'zone-rates' || activeRibbonTopic === 'norms-library' || activeTab === 'norms-library' || activeTab === 'zone-rates') && (
          <div className="flex items-stretch space-x-1 w-full overflow-x-auto">
            {/* Subtopic Group 1: Catalogs Switcher */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => {
                    setActiveTab('norms-library');
                    setActiveRibbonTopic('norms-library');
                  }}
                  className={`flex flex-col items-center justify-center p-1 rounded transition cursor-pointer min-w-[56px] border ${
                    activeTab === 'norms-library'
                      ? 'bg-blue-100/90 border-blue-400 text-blue-900 shadow-xs font-bold'
                      : 'hover:bg-white hover:border-slate-300 border-transparent text-slate-700 hover:text-slate-900'
                  }`}
                  title="Browse Standard Engineering Norms Specification Library"
                >
                  <BookOpen className="w-4 h-4 text-blue-600 mb-0.5" />
                  <span className="text-[10px] leading-tight text-center">Norms<br/>Catalog</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('zone-rates');
                    setActiveRibbonTopic('zone-rates');
                  }}
                  className={`flex flex-col items-center justify-center p-1 rounded transition cursor-pointer min-w-[56px] border ${
                    activeTab === 'zone-rates'
                      ? 'bg-emerald-100/90 border-emerald-400 text-emerald-900 shadow-xs font-bold'
                      : 'hover:bg-white hover:border-slate-300 border-transparent text-slate-700 hover:text-slate-900'
                  }`}
                  title="Configure Zone Master Rates"
                >
                  <DollarSign className="w-4 h-4 text-emerald-600 mb-0.5" />
                  <span className="text-[10px] leading-tight text-center">Zone<br/>Rates</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Catalog View
              </span>
            </div>

            {/* IF IN NORMS CATALOG */}
            {activeTab === 'norms-library' ? (
              <>
                {/* Subtopic Group: Norms Commands */}
                <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => dispatchToolAction('uev:norms-add')}
                      className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 min-w-[48px]"
                      title="Add New Rate Norm Specification"
                    >
                      <Plus className="w-4 h-4 text-blue-600 mb-0.5" />
                      <span className="text-[10px] font-bold leading-tight text-center">Add Norm</span>
                    </button>
                    <button
                      onClick={() => dispatchToolAction('uev:norms-import')}
                      className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 min-w-[48px]"
                      title="Import Standard Norms Catalog or CSV"
                    >
                      <FolderPlus className="w-4 h-4 text-indigo-600 mb-0.5" />
                      <span className="text-[10px] font-bold leading-tight text-center">Import</span>
                    </button>
                    <button
                      onClick={() => dispatchToolAction('uev:norms-download-template')}
                      className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 min-w-[48px]"
                      title="Download CSV Import Template"
                    >
                      <Download className="w-4 h-4 text-slate-600 mb-0.5" />
                      <span className="text-[10px] font-semibold leading-tight text-center">Template</span>
                    </button>
                    <button
                      onClick={() => dispatchToolAction('uev:norms-delete-selected')}
                      className="flex flex-col items-center justify-center p-1 rounded hover:bg-rose-50 hover:border-rose-200 border border-transparent transition cursor-pointer text-slate-700 hover:text-rose-700 min-w-[48px]"
                      title="Delete Selected Norms"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600 mb-0.5" />
                      <span className="text-[10px] font-semibold leading-tight text-center">Delete Sel.</span>
                    </button>
                    <button
                      onClick={() => dispatchToolAction('uev:norms-delete-sample')}
                      className="flex flex-col items-center justify-center p-1 rounded hover:bg-amber-50 hover:border-amber-200 border border-transparent transition cursor-pointer text-slate-700 hover:text-amber-700 min-w-[48px]"
                      title="Clear Default Sample Norms"
                    >
                      <RotateCcw className="w-4 h-4 text-amber-600 mb-0.5" />
                      <span className="text-[10px] font-semibold leading-tight text-center">Clean Samples</span>
                    </button>
                  </div>
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                    Norms Commands
                  </span>
                </div>

                {/* Subtopic Group: Department Filter */}
                <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
                  <div className="flex items-center space-x-1 py-0.5">
                    {[
                      { id: 'ALL', label: 'All' },
                      { id: 'BLD', label: 'BLD' },
                      { id: 'RDS', label: 'RDS' },
                      { id: 'WRS', label: 'WRS' },
                      { id: 'CUSTOM', label: 'Custom' }
                    ].map((dept) => (
                      <button
                        key={dept.id}
                        onClick={() => {
                          setNormsActiveDept(dept.id);
                          dispatchToolAction('uev:norms-filter-dept', dept.id);
                        }}
                        className={`px-2 py-1 rounded text-[10.5px] font-bold transition cursor-pointer ${
                          normsActiveDept === dept.id
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {dept.label}
                      </button>
                    ))}
                  </div>
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                    Department Filter
                  </span>
                </div>

                {/* Subtopic Group: Search Norms */}
                <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
                  <div className="flex items-center space-x-1.5 py-0.5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1.5" />
                      <input
                        type="text"
                        placeholder="Search norms..."
                        onChange={(e) => dispatchToolAction('uev:norms-search', e.target.value)}
                        className="pl-7 pr-2 py-0.5 text-xs bg-white border border-slate-300 rounded font-medium w-36 focus:w-48 transition-all focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                    Search Norms
                  </span>
                </div>
              </>
            ) : (
              /* IF IN ZONE RATES */
              <>
                {/* Subtopic Group: Rates Commands */}
                <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => dispatchToolAction('uev:rates-add-resource')}
                      className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 min-w-[48px]"
                      title="Add New Zone Resource Rate"
                    >
                      <Plus className="w-4 h-4 text-emerald-600 mb-0.5" />
                      <span className="text-[10px] font-bold leading-tight text-center">+ Resource</span>
                    </button>
                    <button
                      onClick={() => dispatchToolAction('uev:rates-import-csv')}
                      className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 min-w-[48px]"
                      title="Import Rates from CSV File"
                    >
                      <Upload className="w-4 h-4 text-indigo-600 mb-0.5" />
                      <span className="text-[10px] font-bold leading-tight text-center">Import CSV</span>
                    </button>
                    <button
                      onClick={() => dispatchToolAction('uev:rates-export-csv')}
                      className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 min-w-[48px]"
                      title="Export Rates to CSV File"
                    >
                      <Download className="w-4 h-4 text-blue-600 mb-0.5" />
                      <span className="text-[10px] font-semibold leading-tight text-center">Export CSV</span>
                    </button>
                    <button
                      onClick={() => dispatchToolAction('uev:rates-download-template')}
                      className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 min-w-[48px]"
                      title="Generate Zone Rate Template"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-amber-600 mb-0.5" />
                      <span className="text-[10px] font-semibold leading-tight text-center">Template</span>
                    </button>
                    <button
                      onClick={() => dispatchToolAction('uev:rates-load-starter')}
                      className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 min-w-[48px]"
                      title="Load Standard Starter Rates"
                    >
                      <Sparkles className="w-4 h-4 text-purple-600 mb-0.5" />
                      <span className="text-[10px] font-semibold leading-tight text-center">Starter</span>
                    </button>
                    <button
                      onClick={() => dispatchToolAction('uev:rates-diagnostics')}
                      className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 min-w-[48px]"
                      title="Rate Integrity Diagnostics"
                    >
                      <ShieldCheck className="w-4 h-4 text-cyan-600 mb-0.5" />
                      <span className="text-[10px] font-semibold leading-tight text-center">Integrity</span>
                    </button>
                  </div>
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                    Rates Commands
                  </span>
                </div>

                {/* Subtopic Group: Category Filter */}
                <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
                  <div className="flex items-center space-x-1 py-0.5">
                    {['All', 'Labor', 'Material', 'Equipment', 'Transport'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setRatesActiveCat(cat);
                          dispatchToolAction('uev:rates-filter-cat', cat);
                        }}
                        className={`px-2 py-1 rounded text-[10.5px] font-bold transition cursor-pointer ${
                          ratesActiveCat === cat
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                    Category Filter
                  </span>
                </div>

                {/* Subtopic Group: Zone & Fiscal Year */}
                <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
                  <div className="flex items-center space-x-2 py-0.5">
                    <div className="flex items-center space-x-1.5 text-[10.5px] text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200 font-mono">
                      <span><strong>{selectedZone.name_en}</strong> ({selectedFY})</span>
                    </div>
                    {onOpenAddZoneModal && (
                      <button
                        onClick={onOpenAddZoneModal}
                        className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[10.5px] font-bold text-slate-800 transition cursor-pointer"
                        title="Switch or Add Zone"
                      >
                        Change
                      </button>
                    )}
                  </div>
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                    Active Zone
                  </span>
                </div>

                {/* Subtopic Group: Search Rates */}
                <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
                  <div className="flex items-center space-x-1.5 py-0.5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1.5" />
                      <input
                        type="text"
                        placeholder="Search rates..."
                        onChange={(e) => dispatchToolAction('uev:rates-search', e.target.value)}
                        className="pl-7 pr-2 py-0.5 text-xs bg-white border border-slate-300 rounded font-medium w-36 focus:w-48 transition-all focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                    Search Rates
                  </span>
                </div>
              </>
            )}

            {/* Subtopic Group: Navigation / Estimate Links */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 shrink-0">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => { setActiveRibbonTopic('rate-analysis'); setActiveTab('rate-analysis'); }}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 min-w-[52px]"
                  title="Go to Rate Analysis Engine"
                >
                  <PenTool className="w-4 h-4 text-purple-600 mb-0.5" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Rate<br/>Analysis</span>
                </button>
                <button
                  onClick={() => { setActiveRibbonTopic('boq'); setActiveTab('boq'); }}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 min-w-[52px]"
                  title="Return to BOQ Estimate"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 mb-0.5" />
                  <span className="text-[10px] font-semibold leading-tight text-center">BOQ<br/>Estimate</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Workflow
              </span>
            </div>
          </div>
        )}

        {/* --- H. HOME / DASHBOARD SUBSIDIARY RIBBON --- */}
        {activeRibbonTopic === 'dashboard' && (
          <div className="flex items-stretch space-x-1 w-full">
            {/* Subtopic Group: Project Identity */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={onOpenProjectModal}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[56px]"
                  title="Open or Switch Project"
                >
                  <Building2 className="w-4 h-4 text-blue-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Switch<br/>Project</span>
                </button>
                {onOpenSnapshotModal && (
                  <button
                    onClick={onOpenSnapshotModal}
                    className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[56px]"
                    title="Estimate Snapshot &amp; Version Lock"
                  >
                    <Lock className="w-4 h-4 text-amber-600 mb-0.5 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-semibold leading-tight text-center">Version<br/>Lock</span>
                  </button>
                )}
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Project Identity
              </span>
            </div>

            {/* Subtopic Group: Quick Launch */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => { setActiveRibbonTopic('boq'); setActiveTab('boq'); }}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[52px]"
                  title="Go to BOQ Estimate"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">BOQ<br/>Estimate</span>
                </button>
                <button
                  onClick={() => { setActiveRibbonTopic('mb'); setActiveTab('mb'); }}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[52px]"
                  title="Go to Measurement Book"
                >
                  <Ruler className="w-4 h-4 text-purple-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">MB<br/>Book</span>
                </button>
                <button
                  onClick={() => { setActiveRibbonTopic('rate-analysis'); setActiveTab('rate-analysis'); }}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[52px]"
                  title="Go to Rate Analysis"
                >
                  <Layers className="w-4 h-4 text-blue-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Rate<br/>Analysis</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Quick Launch
              </span>
            </div>

            {/* Subtopic Group: Storage & Backup */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 shrink-0">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => { onSaveFile(); localToast('Project saved successfully.'); }}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[52px]"
                  title="Save Project Session"
                >
                  <Save className="w-4 h-4 text-emerald-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Save<br/>(Ctrl+S)</span>
                </button>
                <button
                  onClick={onOpenRestoreModal}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[52px]"
                  title="Database Backup &amp; Restore"
                >
                  <Database className="w-4 h-4 text-cyan-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Backup<br/>Restore</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Storage &amp; Backup
              </span>
            </div>
          </div>
        )}

        {/* --- I. REPORTS & TENDER SUBSIDIARY RIBBON --- */}
        {activeRibbonTopic === 'reports' && (
          <div className="flex items-stretch space-x-1 w-full">
            {/* Subtopic Group: Official Reports */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => localToast('Opening Executive Estimate Summary.')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[56px]"
                  title="Executive Estimate Summary"
                >
                  <FileText className="w-4 h-4 text-blue-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Estimate<br/>Summary</span>
                </button>
                <button
                  onClick={() => localToast('Opening Tender Blank BOQ for Bidders.')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[56px]"
                  title="Tender Blank BOQ (Bid Document)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Tender<br/>Blank BOQ</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Official Reports
              </span>
            </div>

            {/* Subtopic Group: Output */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 shrink-0">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => window.print()}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[52px]"
                  title="Print Report Booklet (Ctrl+P)"
                >
                  <Printer className="w-4 h-4 text-slate-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">Print<br/>Report</span>
                </button>
                <button
                  onClick={() => { setActiveRibbonTopic('boq'); setActiveTab('boq'); }}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[52px]"
                  title="Return to BOQ Estimate"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">BOQ<br/>Abstract</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Print &amp; Return
              </span>
            </div>
          </div>
        )}

        {/* --- J. HELP & MANUAL SUBSIDIARY RIBBON --- */}
        {activeRibbonTopic === 'user-manual' && (
          <div className="flex items-stretch space-x-1 w-full">
            {/* Subtopic Group: Documentation */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => localToast('Opening User Guide.')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[56px]"
                  title="Universal Estimating & Valuation User Guide"
                >
                  <HelpCircle className="w-4 h-4 text-blue-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">User<br/>Manual</span>
                </button>
                <button
                  onClick={() => localToast('Opening BLD Standards Reference.')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-white hover:border-slate-300 border border-transparent transition cursor-pointer text-slate-700 hover:text-slate-900 group shadow-2xs hover:shadow-xs min-w-[56px]"
                  title="BLD Standard Specifications"
                >
                  <BookOpen className="w-4 h-4 text-emerald-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-semibold leading-tight text-center">BLD<br/>Norms</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                Engineering Docs
              </span>
            </div>

            {/* Subtopic Group: System Info */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 shrink-0">
              <div className="flex flex-col justify-center space-y-1 font-mono text-[10.5px] text-slate-600">
                <span>Application: <strong className="text-slate-900">Universal Estimating & Valuation v2.5</strong></span>
                <span>Specification: <strong className="text-emerald-700">BLD/Roads Dept.</strong></span>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
                System Info
              </span>
            </div>
          </div>
        )}

        {/* --- M. PAGE LAYOUT SUBSIDIARY RIBBON --- */}
        {activeRibbonTopic === 'layout' && (
          <div className="flex items-stretch space-x-1 w-full overflow-x-auto">
            {/* Subtopic Group 1: Page Setup (Orientation, Size, Margins) */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-2">
                {/* Orientation Selector */}
                <div className="flex flex-col space-y-1">
                  <div className="text-[10px] font-semibold text-slate-600 flex items-center gap-1">
                    <span>Orientation:</span>
                  </div>
                  <div className="inline-flex rounded border border-slate-300 p-0.5 bg-slate-100 shadow-2xs">
                    <button
                      onClick={() => {
                        setPageOrientation('portrait');
                        localToast('Print Orientation set to Portrait.');
                      }}
                      className={`px-2 py-1 text-[10.5px] font-bold rounded flex items-center gap-1 cursor-pointer transition ${
                        pageOrientation === 'portrait'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-200'
                      }`}
                      title="Portrait Mode ( - Standard for BOQ Abstract)"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Portrait</span>
                    </button>
                    <button
                      onClick={() => {
                        setPageOrientation('landscape');
                        localToast('Print Orientation set to Landscape.');
                      }}
                      className={`px-2 py-1 text-[10.5px] font-bold rounded flex items-center gap-1 cursor-pointer transition ${
                        pageOrientation === 'landscape'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-200'
                      }`}
                      title="Landscape Mode ( - Recommended for Wide Measurement Books & BBS)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Landscape</span>
                    </button>
                  </div>
                </div>

                {/* Paper Size Selector */}
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600">Paper Size:</label>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      const sz = e.target.value as 'A4' | 'Legal' | 'A3';
                      setPageSize(sz);
                      localToast(`Paper size set to ${sz}.`);
                    }}
                    className="text-[11px] font-bold border border-slate-300 rounded px-2 py-1 bg-white text-slate-800 shadow-2xs cursor-pointer focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="A4">A4 (210 × 297 mm) - Standard</option>
                    <option value="Legal">Legal (8.5 × 14 in) - Long</option>
                    <option value="A3">A3 (297 × 420 mm) - Wide</option>
                  </select>
                </div>

                {/* Margins Selector */}
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600">Margins:</label>
                  <select
                    value={pageMargins}
                    onChange={(e) => {
                      const mg = e.target.value as 'gov' | 'normal' | 'narrow' | 'wide';
                      setPageMargins(mg);
                      localToast(`Margins set to ${mg === 'gov' ? 'Gov Binding (25mm left)' : mg}.`);
                    }}
                    className="text-[11px] font-bold border border-slate-300 rounded px-2 py-1 bg-white text-slate-800 shadow-2xs cursor-pointer focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="gov">Gov Binding (25mm Left Punch)</option>
                    <option value="normal">Normal (20 mm / 0.8 in)</option>
                    <option value="narrow">Narrow (10 mm / 0.4 in)</option>
                    <option value="wide">Wide (30 mm / 1.2 in)</option>
                  </select>
                </div>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
 Page Setup
              </span>
            </div>

            {/* Subtopic Group 2: Print Scale & Fitting */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const next = printScale === 85 ? 100 : 85;
                    setPrintScale(next);
                    localToast(next === 85 ? 'Fitted all columns to 1 Page Width (85%).' : 'Print Scale reset to 100%.');
                  }}
                  className={`flex flex-col items-center justify-center p-1 px-2.5 rounded border transition cursor-pointer group shadow-2xs min-w-[62px] h-[52px] ${
                    printScale !== 100
                      ? 'bg-blue-50 border-blue-400 text-blue-900'
                      : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Fit All Spreadsheet Columns on One Page Wide"
                >
                  <Columns className="w-3.5 h-3.5 text-blue-600 mb-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[9.5px] font-bold text-center leading-tight">
                    Fit 1 Page<br />
                    <span className="text-[8.5px] font-normal text-slate-500">Wide</span>
                  </span>
                </button>

                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600">Print Scale:</label>
                  <div className="flex items-center space-x-1">
                    <select
                      value={printScale}
                      onChange={(e) => {
                        const sc = Number(e.target.value);
                        setPrintScale(sc);
                        localToast(`Print scale set to ${sc}%.`);
                      }}
                      className="text-[11px] font-bold border border-slate-300 rounded px-1.5 py-1 bg-white text-slate-800 shadow-2xs cursor-pointer focus:border-blue-500 focus:outline-hidden"
                    >
                      <option value={100}>100% (Normal)</option>
                      <option value={90}>90%</option>
                      <option value={80}>80% (Compact)</option>
                      <option value={75}>75% (Dense MB)</option>
                    </select>
                  </div>
                </div>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
 Scale to Fit
              </span>
            </div>

            {/* Subtopic Group 3: Sheet Options & Government Formatting */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10.5px]">
                <label className="flex items-center space-x-1.5 cursor-pointer select-none text-slate-700 hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={printGridlines}
                    onChange={(e) => {
                      setPrintGridlines(e.target.checked);
                      localToast(e.target.checked ? 'Gridlines enabled on print.' : 'Gridlines hidden on print.');
                    }}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium">Print Gridlines</span>
                </label>

                <label className="flex items-center space-x-1.5 cursor-pointer select-none text-slate-700 hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={showLetterheadOnPrint}
                    onChange={(e) => {
                      setShowLetterheadOnPrint(e.target.checked);
                      localToast(e.target.checked ? 'Official Letterhead enabled.' : 'Letterhead hidden.');
                    }}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium">Gov Letterhead</span>
                </label>

                <label className="flex items-center space-x-1.5 cursor-pointer select-none text-slate-700 hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={showSignOffsOnPrint}
                    onChange={(e) => {
                      setShowSignOffsOnPrint(e.target.checked);
                      localToast(e.target.checked ? 'Sign-Off Block enabled.' : 'Sign-Off Block hidden.');
                    }}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium">Sign-Offs Block</span>
                </label>

                <button
                  onClick={() => {
                    setIsFormatModalOpen(true);
                    setFormatModalInitialTab('display');
                  }}
                  className="text-left text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer text-[10px]"
                >
                  More Layout Rules...
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
 Sheet Options
              </span>
            </div>

            {/* Subtopic Group 4: Print Preview & Export */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 shrink-0">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => window.print()}
                  className="flex flex-col items-center justify-center p-1 px-3 rounded bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer min-w-[66px] h-[52px]"
                  title="Open Print Dialog / Save as PDF (Ctrl + P)"
                >
                  <Printer className="w-4 h-4 mb-0.5 text-blue-100" />
                  <span className="text-[10px] font-bold leading-tight text-center">Print Preview<br />(Ctrl+P)</span>
                </button>

                <button
                  onClick={() => {
                    window.print();
                    localToast('Select "Save as PDF" in print destination.');
                  }}
                  className="flex flex-col items-center justify-center p-1 px-2.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-2xs transition cursor-pointer min-w-[58px] h-[52px]"
                  title="Export Current Sheet as Clean PDF"
                >
                  <FileDown className="w-3.5 h-3.5 text-emerald-600 mb-0.5" />
                  <span className="text-[9.5px] font-bold leading-tight text-center">Export<br />to PDF</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
 Print & Export
              </span>
            </div>
          </div>
        )}

        {/* --- N. VIEW SUBSIDIARY RIBBON --- */}
        {activeRibbonTopic === 'view' && (
          <div className="flex items-stretch space-x-1 w-full overflow-x-auto">
            {/* Subtopic Group 1: Workbook Views */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => {
                    setViewLayoutMode('normal');
                    localToast('Switched to Normal Grid View.');
                  }}
                  className={`flex flex-col items-center justify-center p-1 px-2.5 rounded border transition cursor-pointer shadow-2xs min-w-[56px] h-[52px] ${
                    viewLayoutMode === 'normal'
                      ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Normal View: Interactive editing grid with live calculations"
                >
                  <Grid className="w-3.5 h-3.5 text-blue-600 mb-0.5" />
                  <span className="text-[9.5px] leading-tight text-center">Normal<br />Grid</span>
                </button>

                <button
                  onClick={() => {
                    setViewLayoutMode('page_layout');
                    localToast('Switched to Page Layout View.');
                  }}
                  className={`flex flex-col items-center justify-center p-1 px-2.5 rounded border transition cursor-pointer shadow-2xs min-w-[56px] h-[52px] ${
                    viewLayoutMode === 'page_layout'
                      ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Page Layout View: See how document appears on paper with margins and headers"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-600 mb-0.5" />
                  <span className="text-[9.5px] leading-tight text-center">Page<br />Layout</span>
                </button>

                <button
                  onClick={() => {
                    if (!document.fullscreenElement) {
                      document.documentElement.requestFullscreen().catch(() => {});
                      setIsFullscreen(true);
                      localToast('Entered Fullscreen / Zen Mode.');
                    } else {
                      document.exitFullscreen().catch(() => {});
                      setIsFullscreen(false);
                      localToast('Exited Fullscreen.');
                    }
                  }}
                  className="flex flex-col items-center justify-center p-1 px-2.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer shadow-2xs min-w-[56px] h-[52px]"
                  title="Toggle Full Screen (Zen Mode - Distraction Free)"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-3.5 h-3.5 text-amber-600 mb-0.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5 text-slate-600 mb-0.5" />
                  )}
                  <span className="text-[9.5px] font-semibold leading-tight text-center">
                    {isFullscreen ? 'Exit Full' : 'Full Screen'}
                  </span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
 Workbook Views
              </span>
            </div>

            {/* Subtopic Group 2: Show / Hide Elements */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setIsSidebarOpen(!isSidebarOpen);
                    localToast(isSidebarOpen ? 'Navigation Sidebar collapsed.' : 'Navigation Sidebar opened.');
                  }}
                  className={`flex flex-col items-center justify-center p-1 px-2 rounded border transition cursor-pointer shadow-2xs min-w-[58px] h-[52px] ${
                    isSidebarOpen
                      ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Toggle Navigation Sidebar (Project Outline, Masters, Tools)"
                >
                  <PanelLeft className="w-3.5 h-3.5 text-blue-600 mb-0.5" />
                  <span className="text-[9.5px] leading-tight text-center">Sidebar<br />Drawer</span>
                </button>

                <div className="flex flex-col space-y-1 text-[10.5px]">
                  <label className="flex items-center space-x-1.5 cursor-pointer select-none text-slate-700 hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={showFormulaBar}
                      onChange={(e) => {
                        setShowFormulaBar(e.target.checked);
                        localToast(e.target.checked ? 'Formula Bar shown.' : 'Formula Bar hidden.');
                      }}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium">Formula Bar</span>
                  </label>

                  <label className="flex items-center space-x-1.5 cursor-pointer select-none text-slate-700 hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={showSummaryCards}
                      onChange={(e) => {
                        setShowSummaryCards(e.target.checked);
                        localToast(e.target.checked ? 'Cost Summary Cards shown.' : 'Cost Summary Cards hidden.');
                      }}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium">Summary Cards</span>
                  </label>
                </div>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
 Show / Hide
              </span>
            </div>

            {/* Subtopic Group 3: Zoom Controls */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => {
                    setZoomLevel(100);
                    localToast('Zoom reset to 100%.');
                  }}
                  className="flex flex-col items-center justify-center p-1 px-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition cursor-pointer shadow-2xs min-w-[52px] h-[52px]"
                  title="Reset Zoom to 100%"
                >
                  <Search className="w-3.5 h-3.5 text-blue-600 mb-0.5" />
                  <span className="text-[10px] font-bold text-center">100%<br /><span className="text-[8.5px] font-normal text-slate-500">Reset</span></span>
                </button>

                <div className="flex flex-col space-y-1">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
                      className="p-1 px-2 rounded border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs"
                      title="Zoom Out (-10%)"
                    >
                      <ZoomOut className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                    <span className="font-mono text-xs font-bold text-slate-800 w-12 text-center">
                      {zoomLevel}%
                    </span>
                    <button
                      onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                      className="p-1 px-2 rounded border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs"
                      title="Zoom In (+10%)"
                    >
                      <ZoomIn className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-1 text-[9.5px]">
                    {[75, 90, 110, 125].map((z) => (
                      <button
                        key={z}
                        onClick={() => {
                          setZoomLevel(z);
                          localToast(`Zoom set to ${z}%.`);
                        }}
                        className={`px-1 rounded border ${
                          zoomLevel === z
                            ? 'bg-blue-600 text-white font-bold border-blue-600'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-200 border-slate-200'
                        } cursor-pointer`}
                      >
                        {z}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
 Zoom
              </span>
            </div>

            {/* Subtopic Group 4: Freeze Panes */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 border-r border-slate-200 shrink-0">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => {
                    setFreezePanes('header');
                    localToast('Header Row Frozen (headers stay sticky when scrolling).');
                  }}
                  className={`flex flex-col items-center justify-center p-1 px-2 rounded border transition cursor-pointer shadow-2xs min-w-[58px] h-[52px] ${
                    freezePanes === 'header'
                      ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Keep top column headers sticky during vertical scroll"
                >
                  <Table className="w-3.5 h-3.5 text-blue-600 mb-0.5" />
                  <span className="text-[9.5px] leading-tight text-center">Freeze<br />Top Row</span>
                </button>

                <button
                  onClick={() => {
                    setFreezePanes('firstCol');
                    localToast('First Column Frozen (item code & description stay sticky).');
                  }}
                  className={`flex flex-col items-center justify-center p-1 px-2 rounded border transition cursor-pointer shadow-2xs min-w-[58px] h-[52px] ${
                    freezePanes === 'firstCol'
                      ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Keep item codes and descriptions visible during horizontal scroll"
                >
                  <Columns className="w-3.5 h-3.5 text-indigo-600 mb-0.5" />
                  <span className="text-[9.5px] leading-tight text-center">Freeze<br />1st Col</span>
                </button>

                <button
                  onClick={() => {
                    setFreezePanes('none');
                    localToast('Panes Unfrozen.');
                  }}
                  className={`flex flex-col items-center justify-center p-1 px-2 rounded border transition cursor-pointer shadow-2xs min-w-[52px] h-[52px] ${
                    freezePanes === 'none'
                      ? 'bg-slate-100 border-slate-400 text-slate-800 font-bold'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Unfreeze All Panes"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500 mb-0.5" />
                  <span className="text-[9.5px] leading-tight text-center">Unfreeze<br />Panes</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
 Freeze Panes
              </span>
            </div>

            {/* Subtopic Group 5: Number System & Preferences */}
            <div className="flex flex-col justify-between px-2.5 py-0.5 shrink-0">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => {
                    const next = formatConfig.display.numberSystem === 'south_asian' ? 'international' : 'south_asian';
                    updateFormatConfig((c) => ({
                      ...c,
                      display: { ...c.display, numberSystem: next }
                    }));
                  }}
                  className="flex flex-col items-center justify-center p-1 px-2.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-2xs transition cursor-pointer min-w-[66px] h-[52px]"
                  title="Switch between South Asian Lakhs/Crores (1,23,456.78) and International Millions (123,456.78)"
                >
                  <Hash className="w-3.5 h-3.5 text-purple-600 mb-0.5" />
                  <span className="text-[9.5px] font-bold leading-tight text-center">
                    {formatConfig.display.numberSystem === 'south_asian' ? 'Lakhs' : 'Millions'}<br />
                    <span className="text-[8.5px] font-normal text-slate-500">Numbering</span>
                  </span>
                </button>

                <button
                  onClick={() => {
                    setIsFormatModalOpen(true);
                    setFormatModalInitialTab('display');
                  }}
                  className="flex flex-col items-center justify-center p-1 px-2.5 rounded border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 shadow-2xs transition cursor-pointer min-w-[62px] h-[52px]"
                  title="Open Full Display & Formatting Modal"
                >
                  <Sliders className="w-3.5 h-3.5 text-purple-700 mb-0.5" />
                  <span className="text-[9.5px] font-bold leading-tight text-center">Display<br />Preferences</span>
                </button>
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider text-center mt-1 pb-0.5 select-none">
 Format & Culture
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4. MAIN APPLICATION CANVAS & OPTIONAL DOCKED SIDEBAR */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Optional Collapsible Sidebar Drawer */}
        {isSidebarOpen && (
          <div className="w-64 border-r border-slate-300 bg-white z-30 shrink-0 flex flex-col shadow-lg animate-fadeIn">
            <Sidebar
              activeTab={activeTab}
              setActiveTab={(t) => {
                setActiveTab(t);
              }}
              onOpenRestoreModal={onOpenRestoreModal}
              onOpenWelcomeScreen={onOpenWelcomeScreen}
              onOpenSnapshotModal={onOpenSnapshotModal}
              isLocked={isProjectLocked}
              isCollapsed={false}
              setIsCollapsed={() => setIsSidebarOpen(false)}
            />
          </div>
        )}

        {/* Main View Work Area */}
        <main className={`flex-1 overflow-y-auto p-2 sm:p-4 flex flex-col ${viewLayoutMode === 'page_layout' ? 'bg-slate-300/80 py-6' : 'bg-slate-100/60'}`}>
          <div
            className={`w-full flex-1 flex flex-col transition-all ${
              viewLayoutMode === 'page_layout'
                ? 'max-w-5xl mx-auto bg-white p-6 sm:p-8 rounded-sm shadow-xl border border-slate-300'
                : ''
            }`}
            style={{
              zoom: zoomLevel !== 100 ? `${zoomLevel}%` : undefined
            }}
          >
            {children}
          </div>
        </main>
      </div>

      {/* 6. STATUS BAR */}
      <footer className="bg-[#e9ecef] border-t border-slate-300 flex items-center justify-end px-3 py-1 text-xs select-none shrink-0 print:hidden shadow-inner z-30">
        {/* Right: Status Bar Metrics & Zoom Controls */}
        <div className="flex items-center space-x-4 text-[11px] text-slate-600 mt-1 sm:mt-0 font-mono">
          <div className="hidden sm:flex items-center space-x-3 border-r border-slate-300 pr-3">
            <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded text-[10px]">
              Ready
            </span>
            <span>
              Items Count: <strong className="text-slate-800 font-bold">{totalItemCount}</strong>
            </span>
            <span>
              Sum: <strong className="text-slate-800 font-bold">{currencyCode()} {directSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </span>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
              className="p-1 hover:bg-slate-200 rounded text-slate-600 transition cursor-pointer"
              title="Zoom Out"
            >
              -
            </button>
            <span className="font-mono text-[10px] w-8 text-center font-bold text-slate-700">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
              className="p-1 hover:bg-slate-200 rounded text-slate-600 transition cursor-pointer"
              title="Zoom In"
            >
              +
            </button>
          </div>

          <div className="hidden lg:inline text-[10px] text-slate-500 font-sans border-l border-slate-300 pl-2">
            Er. Raju Acharya
          </div>
        </div>
      </footer>

      {/* Full Screen Format & MB Customizer Modal */}
      <DisplayMBFormatModal
        isOpen={isFormatModalOpen}
        onClose={() => setIsFormatModalOpen(false)}
        initialTab={formatModalInitialTab}
        onApplied={(updated) => setFormatConfig(updated)}
      />
    </div>
  );
};
