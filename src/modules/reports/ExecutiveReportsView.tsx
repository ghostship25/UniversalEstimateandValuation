import React from 'react';
import { FileText, Download, Printer, BarChart3, PieChart, FileSpreadsheet } from 'lucide-react';
import { ProjectEstimate, ZoneInfo } from '../../types';
import { currencyCode } from '../../services/currency';

interface ExecutiveReportsViewProps {
  project: ProjectEstimate;
  selectedZone: ZoneInfo;
  selectedFY: string;
  showToast: (msg: string) => void;
}

export const ExecutiveReportsView: React.FC<ExecutiveReportsViewProps> = ({
  project,
  selectedZone,
  selectedFY,
  showToast
}) => {
  const totalAmount = project.items.reduce((s, i) => s + i.total_amount, 0);

  const handleExportPDF = (reportName: string) => {
    showToast(`Generating ${reportName} PDF report...`);
  };

  const handleExportCSV = (reportName: string) => {
    showToast(`Exporting ${reportName} to Excel/CSV...`);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-blue-900 rounded-2xl p-6 text-white shadow-lg border-2 border-red-600 flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-red-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider">
              REPORTS & ANALYTICS
            </span>
            <span className="text-blue-200 text-xs font-mono">• Executive Reports Hub</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">Project Financial & Technical Reports</h2>
          <p className="text-xs text-blue-100 mt-1">
            Export official Abstract BOQ, Detailed Measurement Book (MB), Resource Material Schedules, and Valuation IPC summaries.
          </p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Report 1: Abstract BOQ */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-blue-300 transition">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Official Abstract BOQ Estimate</h4>
              <p className="text-[11px] text-slate-500">Includes Tax & Rate Analysis Mode</p>
            </div>
          </div>
          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl font-mono">
            Total Items: {project.items.length} | Amount: {currencyCode()} {totalAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExportPDF('Abstract BOQ')}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button
              onClick={() => handleExportCSV('Abstract BOQ')}
              className="flex-1 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" /> CSV / Excel
            </button>
          </div>
        </div>

        {/* Report 2: Detailed Measurement Book (MB) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-indigo-300 transition">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Detailed Measurement Book (MB)</h4>
              <p className="text-[11px] text-slate-500">Full No. × L × B × H breakdown sub-rows</p>
            </div>
          </div>
          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl font-mono">
            Zone: {selectedZone.name_en} | FY: {selectedFY}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExportPDF('Measurement Book')}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button
              onClick={() => handleExportCSV('Measurement Book')}
              className="flex-1 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" /> CSV / Excel
            </button>
          </div>
        </div>

        {/* Report 3: Resource Breakdown Schedule */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-emerald-300 transition">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <PieChart className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Resource Breakdown Schedule</h4>
              <p className="text-[11px] text-slate-500">Total Cement, Rebar, Aggregate & Labour</p>
            </div>
          </div>
          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl font-mono">
            Material, Labour, Equipment & Fuel Totals
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExportPDF('Resource Breakdown')}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button
              onClick={() => handleExportCSV('Resource Breakdown')}
              className="flex-1 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" /> CSV / Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
