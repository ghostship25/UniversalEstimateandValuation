import React, { useState } from 'react';
import {
  BookOpen,
  DollarSign,
  Calculator,
  FileSpreadsheet,
  BarChart3,
  Layers,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Home,
  FileCode,
  Briefcase,
  ShieldCheck,
  HardDrive,
  Award,
  CreditCard,
  FileCheck2,
  Boxes,
  PenTool,
  Grid,
  Lock,
  Edit3
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenRestoreModal: () => void;
  onOpenWelcomeScreen?: () => void;
  onOpenSnapshotModal?: () => void;
  isLocked?: boolean;
  isCollapsed: boolean;
  setIsCollapsed: (c: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenRestoreModal,
  onOpenWelcomeScreen,
  onOpenSnapshotModal,
  isLocked,
  isCollapsed,
  setIsCollapsed
}) => {
  const [openModule1, setOpenModule1] = useState(true);
  const [openModule2, setOpenModule2] = useState(true);
  const [openModule3, setOpenModule3] = useState(true);
  const [openModuleValuation, setOpenModuleValuation] = useState(true);

  const isActive = (tab: string) => {
    if (activeTab === tab) return true;
    if (tab === 'bar-bending-schedule' && (activeTab === 'bar-bending' || activeTab === 'bbs')) return true;
    return false;
  };

  return (
    <aside
      className={`bg-white text-slate-800 border-r border-slate-200 flex flex-col justify-between transition-all duration-300 z-20 shrink-0 shadow-sm ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Branding Header */}
      <div className="p-3 bg-blue-950 text-white flex items-center justify-between border-b border-blue-800">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-red-600 border border-white flex items-center justify-center font-extrabold text-white text-sm shadow">
              <Calculator className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-xs font-black tracking-tight uppercase leading-none text-white">Universal Estimating & Valuation</h2>
              <span className="text-[10px] text-blue-200 font-mono">Rate & Quantity Engine</span>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition mx-auto cursor-pointer"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links Tree */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 text-xs font-medium bg-slate-50/50">
        {/* MODULE 1: INITIATION (NORMS & ZONE RATES & RDS PLANT) */}
        <div className="space-y-1">
          {!isCollapsed ? (
            <button
              onClick={() => setOpenModule1(!openModule1)}
              className="w-full flex items-center justify-between text-[10px] font-black uppercase text-slate-700 hover:text-blue-900 py-1 px-2 tracking-wider"
            >
              <span className="flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-blue-800" />
                MASTER LIBRARIES
              </span>
              {openModule1 ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
            </button>
          ) : (
            <div className="h-px bg-slate-200 my-2" />
          )}

          {(openModule1 || isCollapsed) && (
            <div className="space-y-1 mt-1">
              <button
                onClick={() => setActiveTab('norms-library')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                  isActive('norms-library')
                    ? 'bg-red-700 text-white font-bold shadow-xs'
                    : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                }`}
                title="Norms Entry & CSV Import/Export"
              >
                <BookOpen className={`w-4 h-4 shrink-0 ${isActive('norms-library') ? 'text-white' : 'text-emerald-700'}`} />
                {!isCollapsed && <span>Norms Library</span>}
              </button>

              <button
                onClick={() => setActiveTab('zone-rates')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                  isActive('zone-rates')
                    ? 'bg-red-700 text-white font-bold shadow-xs'
                    : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                }`}
                title="Zone Rates Registry"
              >
                <DollarSign className={`w-4 h-4 shrink-0 ${isActive('zone-rates') ? 'text-white' : 'text-blue-700'}`} />
                {!isCollapsed && <span>Zone Rates</span>}
              </button>
            </div>
          )}
        </div>

        {/* MODULE 2: RATE ANALYSIS & COMPUTATIONAL ENGINES */}
        <div className="space-y-1">
          {!isCollapsed ? (
            <button
              onClick={() => setOpenModule2(!openModule2)}
              className="w-full flex items-center justify-between text-[10px] font-black uppercase text-slate-700 hover:text-red-800 py-1 px-2 tracking-wider"
            >
              <span className="flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-red-700" />
                ENGINES & ANALYSIS
              </span>
              {openModule2 ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
            </button>
          ) : (
            <div className="h-px bg-slate-200 my-2" />
          )}

          {(openModule2 || isCollapsed) && (
            <div className="space-y-1 mt-1">
              <button
                onClick={() => setActiveTab('rate-analysis')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                  isActive('rate-analysis')
                    ? 'bg-red-700 text-white font-bold shadow-xs'
                    : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                }`}
                title="Rate Analysis Engine"
              >
                <Calculator className={`w-4 h-4 shrink-0 ${isActive('rate-analysis') ? 'text-white' : 'text-blue-700'}`} />
                {!isCollapsed && <span>Rate Analysis</span>}
              </button>

              <button
                onClick={() => setActiveTab('bar-bending-schedule')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                  isActive('bar-bending-schedule')
                    ? 'bg-red-700 text-white font-bold shadow-xs'
                    : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                }`}
                title="Bar Bending Schedule (BBS) Engine"
              >
                <Grid className={`w-4 h-4 shrink-0 ${isActive('bar-bending-schedule') ? 'text-white' : 'text-purple-700'}`} />
                {!isCollapsed && <span>Bar Bending (BBS)</span>}
              </button>
            </div>
          )}
        </div>

        {/* MODULE 3: ESTIMATE MODULE (MB, ESTIMATE & RESOURCE QUANTITIES) */}
        <div className="space-y-1">
          {!isCollapsed ? (
            <button
              onClick={() => setOpenModule3(!openModule3)}
              className="w-full flex items-center justify-between text-[10px] font-black uppercase text-slate-700 hover:text-emerald-900 py-1 px-2 tracking-wider"
            >
              <span className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-emerald-800" />
                ESTIMATE MODULE
              </span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-mono font-bold lowercase">mb•boq•qty</span>
              {openModule3 ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
            </button>
          ) : (
            <div className="h-px bg-slate-200 my-2" />
          )}

          {(openModule3 || isCollapsed) && (
            <div className="space-y-1 mt-1">
              <button
                onClick={() => setActiveTab('mb')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                  isActive('mb')
                    ? 'bg-red-700 text-white font-bold shadow-xs'
                    : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                }`}
                title="1. Measurement Book ( - L × B × H)"
              >
                <FileSpreadsheet className={`w-4 h-4 shrink-0 ${isActive('mb') ? 'text-white' : 'text-purple-700'}`} />
                {!isCollapsed && <span>1. Measurement Book (MB)</span>}
              </button>

              <button
                onClick={() => setActiveTab('boq')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                  isActive('boq')
                    ? 'bg-red-700 text-white font-bold shadow-xs'
                    : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                }`}
                title="2. Cost Estimate Abstract ( - BOQ)"
              >
                <BarChart3 className={`w-4 h-4 shrink-0 ${isActive('boq') ? 'text-white' : 'text-blue-700'}`} />
                {!isCollapsed && <span>2. Cost Estimate (BOQ)</span>}
              </button>

              <button
                onClick={() => setActiveTab('resource-breakdown')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                  isActive('resource-breakdown')
                    ? 'bg-red-700 text-white font-bold shadow-xs'
                    : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                }`}
                title="3. Resource Quantity Breakdown"
              >
                <Layers className={`w-4 h-4 shrink-0 ${isActive('resource-breakdown') ? 'text-white' : 'text-emerald-700'}`} />
                {!isCollapsed && <span>3. Resource Quantities</span>}
              </button>

              <button
                onClick={() => setActiveTab('template-drawings')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                  isActive('template-drawings')
                    ? 'bg-red-700 text-white font-bold shadow-xs'
                    : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                }`}
                title="Parametric Cross-Section Drawings (Drain, Road, Culvert)"
              >
                <PenTool className={`w-4 h-4 shrink-0 ${isActive('template-drawings') ? 'text-white' : 'text-purple-700'}`} />
                {!isCollapsed && <span>Drawings</span>}
              </button>
            </div>
          )}
        </div>

        {/* MODULE 4: POST-CONTRACT & VALUATION */}
        <div className="space-y-1">
          {!isCollapsed ? (
            <button
              onClick={() => setOpenModuleValuation(!openModuleValuation)}
              className="w-full flex items-center justify-between text-[10px] font-black uppercase text-slate-700 hover:text-indigo-900 py-1 px-2 tracking-wider"
            >
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-indigo-700" />
                VALUATION & CONTRACT
              </span>
              {openModuleValuation ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
            </button>
          ) : (
            <div className="h-px bg-slate-200 my-2" />
          )}

          {(openModuleValuation || isCollapsed) && (
            <div className="space-y-1 mt-1">
              <button
                onClick={() => setActiveTab('contract-agreement')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                  isActive('contract-agreement')
                    ? 'bg-red-700 text-white font-bold shadow-xs'
                    : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                }`}
                title="Contract Agreement & Contractor Rates"
              >
                <Award className={`w-4 h-4 shrink-0 ${isActive('contract-agreement') ? 'text-white' : 'text-emerald-700'}`} />
                {!isCollapsed && <span>Contract Agreement</span>}
              </button>

              <button
                onClick={() => setActiveTab('valuation-mb')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                  isActive('valuation-mb')
                    ? 'bg-red-700 text-white font-bold shadow-xs'
                    : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                }`}
                title="Valuation Measurement Books (Multiple VMBs)"
              >
                <BookOpen className={`w-4 h-4 shrink-0 ${isActive('valuation-mb') ? 'text-white' : 'text-indigo-700'}`} />
                {!isCollapsed && <span>Valuation MB</span>}
              </button>

              <button
                onClick={() => setActiveTab('valuation-abstract')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                  isActive('valuation-abstract')
                    ? 'bg-red-700 text-white font-bold shadow-xs'
                    : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                }`}
                title="Valuation Bill Abstract & Billing Summary"
              >
                <FileSpreadsheet className={`w-4 h-4 shrink-0 ${isActive('valuation-abstract') ? 'text-white' : 'text-blue-700'}`} />
                {!isCollapsed && <span>Valuation Abstract</span>}
              </button>

              <button
                onClick={() => setActiveTab('valuation-resources')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                  isActive('valuation-resources')
                    ? 'bg-red-700 text-white font-bold shadow-xs'
                    : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                }`}
                title="Valuation Resource Quantity Breakdown"
              >
                <Boxes className={`w-4 h-4 shrink-0 ${isActive('valuation-resources') ? 'text-white' : 'text-purple-700'}`} />
                {!isCollapsed && <span>Valuation Resources</span>}
              </button>

              <button
                onClick={() => setActiveTab('completion-certificate')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                  isActive('completion-certificate')
                    ? 'bg-red-700 text-white font-bold shadow-xs'
                    : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
                }`}
                title="Completion Certificate (Final Valuation & Variance)"
              >
                <FileCheck2 className={`w-4 h-4 shrink-0 ${isActive('completion-certificate') ? 'text-white' : 'text-emerald-700'}`} />
                {!isCollapsed && <span>Completion (Variance)</span>}
              </button>
            </div>
          )}
        </div>

        {/* MODULE 5: DOCUMENTATION & USER MANUAL */}
        <div className="space-y-1">
          {!isCollapsed ? (
            <div className="text-[10px] font-black uppercase text-slate-700 py-1 px-2 tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-800" />
              <span>HELP</span>
            </div>
          ) : (
            <div className="h-px bg-slate-200 my-2" />
          )}

          <div className="space-y-1 mt-1">
            <button
              onClick={() => setActiveTab('user-manual')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                isActive('user-manual')
                  ? 'bg-red-700 text-white font-bold shadow-xs'
                  : 'hover:bg-slate-200/80 text-slate-700 hover:text-slate-900'
              }`}
              title="User Manual & Feature Guide"
            >
              <BookOpen className={`w-4 h-4 shrink-0 ${isActive('user-manual') ? 'text-white' : 'text-blue-700'}`} />
              {!isCollapsed && <span>User Manual</span>}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
