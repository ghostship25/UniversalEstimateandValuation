import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  DollarSign,
  Layers,
  CheckCircle2,
  AlertCircle,
  PieChart
} from 'lucide-react';
import { ProjectEstimate, ValuationMBBook, ValuationMBRow } from '../types';
import { currencyCode } from '../services/currency';

interface ValuationProgressChartProps {
  project: ProjectEstimate;
  valuationBooks: ValuationMBBook[];
  valuationRows: ValuationMBRow[];
}

export const ValuationProgressChart: React.FC<ValuationProgressChartProps> = ({
  project,
  valuationBooks,
  valuationRows
}) => {
  const [chartMode, setChartMode] = useState<'bills' | 'items'>('bills');

  // Helper to calculate total item estimate amount
  const getItemRate = (item: any) => item.calculated_unit_rate || item.user_rate || item.contractor_rate || 0;
  
  const getEstimateQuantity = (item: any) => {
    if (item.mb_rows && item.mb_rows.length > 0) {
      return item.mb_rows.reduce((sum: number, r: any) => sum + (Number(r.quantity) || 0), 0);
    }
    return Number(item.estimated_quantity) || 0;
  };

  const totalEstimateAmount = project.items.reduce(
    (sum, item) => sum + getEstimateQuantity(item) * getItemRate(item),
    0
  );

  // 1. Sort books by IPC / creation order
  const sortedBooks = [...valuationBooks].sort((a, b) => (a.ipc_number || 0) - (b.ipc_number || 0));

  // Build per-bill progress data
  let runningCumValuation = 0;
  const billTrendData = sortedBooks.map((book) => {
    const bookRows = valuationRows.filter((r) => r.mb_id === book.id);
    let thisBillValuation = 0;

    project.items.forEach((item) => {
      const itemBookRows = bookRows.filter((r) => r.boq_item_id === item.id);
      const qty = itemBookRows.reduce((s, r) => s + (Number(r.quantity_this_bill) || Number((r as any).quantity) || 0), 0);
      thisBillValuation += qty * getItemRate(item);
    });

    runningCumValuation += thisBillValuation;

    return {
      name: book.mb_number || `IPC-${book.ipc_number}`,
      fullName: book.title || book.mb_number,
      ipc: book.ipc_number,
      isFinal: book.bill_type === 'FINAL_VALUATION',
      [`This Bill (${currencyCode()})`]: Math.round(thisBillValuation),
      [`Cumulative Executed (${currencyCode()})`]: Math.round(runningCumValuation),
      [`Estimate Target (${currencyCode()})`]: Math.round(totalEstimateAmount),
      progressPercent: totalEstimateAmount > 0 ? (runningCumValuation / totalEstimateAmount) * 100 : 0
    };
  });

  // 2. Build per-item breakdown data
  const itemTrendData = project.items.map((item, idx) => {
    const rate = getItemRate(item);
    const estQty = getEstimateQuantity(item);
    const estAmount = estQty * rate;

    const itemRows = valuationRows.filter((r) => r.boq_item_id === item.id);
    const valQty = itemRows.reduce((s, r) => s + (Number(r.quantity_this_bill) || Number((r as any).quantity) || 0), 0);
    const valAmount = valQty * rate;
    const diffAmount = valAmount - estAmount;

    return {
      sn: idx + 1,
      code: `Norm ${item.item_code}`,
      desc: item.description.length > 25 ? item.description.slice(0, 25) + '...' : item.description,
      unit: item.unit,
      [`Estimated Amount (${currencyCode()})`]: Math.round(estAmount),
      [`Executed Valuation (${currencyCode()})`]: Math.round(valAmount),
      [`Variance (${currencyCode()})`]: Math.round(diffAmount)
    };
  });

  const totalExecutedAmount = billTrendData.length > 0
    ? (billTrendData[billTrendData.length - 1] as any)[`Cumulative Executed (${currencyCode()})`]
    : 0;

  const totalVarianceAmount = totalExecutedAmount - totalEstimateAmount;
  const overallProgressPercent = totalEstimateAmount > 0 ? (totalExecutedAmount / totalEstimateAmount) * 100 : 0;

  // Custom tooltip formatter
  const formatCurrency = (value: any) => `${currencyCode()} ${Number(value || 0).toLocaleString('en-US')}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 animate-fadeIn">
      {/* Header & View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-800 rounded-xl">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Valuation & Execution Trend Analytics
            </h3>
            <p className="text-xs text-slate-500">
              Interactive visualization comparing Approved Estimate vs Executed Running Bills
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setChartMode('bills')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              chartMode === 'bills'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📊 Running Bills Trend
          </button>
          <button
            onClick={() => setChartMode('items')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              chartMode === 'items'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 BOQ Items Progress
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
          <span className="text-[10px] uppercase font-extrabold text-slate-500">Approved Estimate</span>
          <div className="text-lg font-mono font-black text-slate-900">
            {currencyCode()} {totalEstimateAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[10px] text-slate-500">Total Budget Capacity</span>
        </div>

        <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-1">
          <span className="text-[10px] uppercase font-extrabold text-blue-900">Executed Valuation</span>
          <div className="text-lg font-mono font-black text-blue-950">
            {currencyCode()} {totalExecutedAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[10px] font-bold text-blue-800">
            {overallProgressPercent.toFixed(1)}% Completed Across {sortedBooks.length} MBs
          </span>
        </div>

        <div className={`border rounded-xl p-4 space-y-1 ${totalVarianceAmount > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-emerald-50/60 border-emerald-200'}`}>
          <span className="text-[10px] uppercase font-extrabold text-slate-600">Cost Variance</span>
          <div className={`text-lg font-mono font-black ${totalVarianceAmount > 0 ? 'text-amber-900' : 'text-emerald-900'}`}>
            {totalVarianceAmount > 0 ? '+' : ''}{currencyCode()} {totalVarianceAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <span className={`text-[10px] font-bold ${totalVarianceAmount > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
            {totalVarianceAmount > 0 ? `+${((totalVarianceAmount / (totalEstimateAmount || 1)) * 100).toFixed(1)}% Over Estimate` : 'Within Approved Budget'}
          </span>
        </div>

        <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-4 space-y-1">
          <span className="text-[10px] uppercase font-extrabold text-purple-900">Total Valuation MBs</span>
          <div className="text-lg font-mono font-black text-purple-950">
            {sortedBooks.length} Running Bills
          </div>
          <span className="text-[10px] font-bold text-purple-800">
            {sortedBooks.filter((b) => b.bill_type === 'FINAL_VALUATION').length} Final MB Certificate(s)
          </span>
        </div>
      </div>

      {/* Chart Render Area */}
      {chartMode === 'bills' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Cumulative Running Bill Progress vs Approved Estimate Target</span>
            <span className="text-slate-500 font-normal">X-Axis: Running Valuation Bills • Y-Axis: Amount ({currencyCode()})</span>
          </div>

          <div className="h-80 w-full bg-slate-50/50 p-2 rounded-xl border border-slate-200">
            {billTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No Valuation MBs created yet to plot trends.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={billTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#334155' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={formatCurrency} labelStyle={{ fontWeight: 'bold' }} />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontWeight: 'bold' }} />
                  <Bar dataKey={`This Bill (${currencyCode()})`} fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={28} />
                  <Line type="monotone" dataKey={`Cumulative Executed (${currencyCode()})`} stroke="#1e3a8a" strokeWidth={3} dot={{ r: 5 }} />
                  <Line type="stepAfter" dataKey={`Estimate Target (${currencyCode()})`} stroke="#dc2626" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>BOQ Items: Approved Estimate Amount vs Executed Site Valuation</span>
            <span className="text-slate-500 font-normal">X-Axis: Work Items • Y-Axis: Amount ({currencyCode()})</span>
          </div>

          <div className="h-80 w-full bg-slate-50/50 p-2 rounded-xl border border-slate-200">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={itemTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="code" tick={{ fontSize: 10, fontWeight: 'bold', fill: '#1e293b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={formatCurrency} labelStyle={{ fontWeight: 'bold' }} />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontWeight: 'bold' }} />
                <Bar dataKey={`Estimated Amount (${currencyCode()})`} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey={`Executed Valuation (${currencyCode()})`} fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
