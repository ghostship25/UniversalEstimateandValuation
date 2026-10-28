import React from 'react';
import {
  Building2,
  FileSpreadsheet,
  Calculator,
  TrendingUp,
  Award,
  Layers,
  ShieldCheck,
  DollarSign,
  FileText,
  Ruler,
  FileCheck2
} from 'lucide-react';
import { ProjectEstimate, ZoneInfo, ResourceMaster, RateNormItem } from '../../types';
import { currencyCode } from '../../services/currency';

interface DashboardViewProps {
  project: ProjectEstimate;
  selectedZone: ZoneInfo;
  selectedFY: string;
  norms: RateNormItem[];
  resources: ResourceMaster[];
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  project,
  selectedZone,
  selectedFY,
  norms,
  resources,
  onNavigateTab
}) => {
  const totalItemsCount = project.items.length;
  const totalEstimateAmount = project.items.reduce((sum, item) => sum + item.total_amount, 0);
  const totalMBEntries = project.items.reduce((sum, item) => sum + (item.mb_rows?.length || 0), 0);

  const workflowModules = [
    {
      id: 'norms-library',
      title: 'Norms',
      icon: Layers,
      color: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      id: 'rate-analysis',
      title: 'Rate Analysis',
      icon: Calculator,
      color: 'bg-violet-50 text-violet-700 border-violet-200'
    },
    {
      id: 'bar-bending-schedule',
      title: 'BBS',
      icon: Ruler,
      color: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    {
      id: 'mb',
      title: 'Measurement Book',
      icon: FileSpreadsheet,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    },
    {
      id: 'boq',
      title: 'BOQ Estimate',
      icon: DollarSign,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      id: 'contract-agreement',
      title: 'Contract BOQ',
      icon: Award,
      color: 'bg-teal-50 text-teal-700 border-teal-200'
    },
    {
      id: 'valuation-mb',
      title: 'Valuation MB',
      icon: Building2,
      color: 'bg-rose-50 text-rose-700 border-rose-200'
    },
    {
      id: 'completion-certificate',
      title: 'Completion Certificate',
      icon: FileCheck2,
      color: 'bg-red-50 text-red-700 border-red-200'
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: FileText,
      color: 'bg-purple-50 text-purple-700 border-purple-200'
    },
    {
      id: 'zone-rates',
      title: 'Zone Rates',
      icon: ShieldCheck,
      color: 'bg-slate-100 text-slate-700 border-slate-200'
    }
  ];

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Welcome Banner */}
      <div id="dashboard-welcome-banner" className="bg-blue-900 rounded-2xl p-6 text-white shadow-lg border-2 border-red-600 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-red-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow-xs">
                Engineering Suite
              </span>
              <span className="text-blue-200 text-xs font-mono">• Standard Norms</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-white">
              Universal Estimating & Valuation Estimation Engine
            </h1>
            <p className="text-xs text-blue-100 mt-0.5 max-w-xl">
              Zone rates, norms, rate analysis, and BOQ estimates.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-blue-950 border border-blue-700 p-3 rounded-xl text-xs">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-blue-200 block">Zone & FY</span>
              <span className="font-extrabold text-white text-sm">{selectedZone.name_en}</span>
              <span className="text-red-300 block font-mono text-[11px] font-bold">FY: {selectedFY}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">BOQ Estimate</span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {currencyCode()} {totalEstimateAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-600 font-bold">{totalItemsCount} Items</span> in estimate
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Measurement Book</span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {totalMBEntries} <span className="text-sm font-normal text-slate-500">Sub-rows</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            Linked to <span className="text-blue-600 font-bold">L × B × H</span> calculations
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Norms Library</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {norms.length} <span className="text-sm font-normal text-slate-500">Norms</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            Buildings, Roads, Irrigation, Water Supply
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Resources</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {resources.length} <span className="text-sm font-normal text-slate-500">Items</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            Labor, Materials & Equipment
          </p>
        </div>
      </div>

      {/* Workflow Quick Access */}
      <div id="dashboard-workflow-section" className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2.5">
        <div id="dashboard-workflow-header" className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
          <span>Workflow Modules</span>
        </div>

        {/* Streamlined Modules Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {workflowModules.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                id={`module-btn-${item.id}`}
                type="button"
                onClick={() => onNavigateTab(item.id)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border bg-slate-50/60 hover:bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs transition group text-left cursor-pointer"
                title={`Open ${item.title}`}
              >
                <div className={`p-1 rounded-md border ${item.color} shrink-0`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-slate-700 truncate group-hover:text-blue-700 transition flex-1">
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Project BOQ Summary Preview Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Project Overview</h3>
            <p className="text-xs text-slate-500">Key work items in estimate ({project.title})</p>
          </div>
          <button
            onClick={() => onNavigateTab('mb')}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow"
          >
            Measurement Book
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-y border-slate-200">
                <th className="p-3">SN</th>
                <th className="p-3">Item Code</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-center">Unit</th>
                <th className="p-3 text-right">MB Qty</th>
                <th className="p-3 text-right">Analyzed Rate</th>
                <th className="p-3 text-right">Total Amount ({currencyCode()})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {project.items.slice(0, 5).map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                  <td className="p-3 font-mono font-bold text-blue-700">{item.item_code}</td>
                  <td className="p-3 font-medium text-slate-800 max-w-md truncate">{item.description}</td>
                  <td className="p-3 text-center font-semibold text-slate-600">{item.unit}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">
                    {item.estimated_quantity.toLocaleString('en-US')}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-700">
                    {currencyCode()} {item.calculated_unit_rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-right font-mono font-extrabold text-emerald-700">
                    {currencyCode()} {item.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
