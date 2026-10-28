import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  RefreshCw,
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Check,
  Search,
  Filter
} from 'lucide-react';
import { currencyCode } from '../services/currency';

export interface DiffPreviewItem {
  id: string | number;
  code: string;
  name: string;
  category?: string;
  unit?: string;
  oldRate?: number;
  newRate?: number;
  status: 'new' | 'modified' | 'unchanged' | 'invalid';
  isSelected: boolean;
  itemData: any;
  notes?: string;
}

interface CSVDiffPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedItems: DiffPreviewItem[]) => void;
  title: string;
  subtitle?: string;
  type?: 'rates' | 'norms';
  items: DiffPreviewItem[];
}

export const CSVDiffPreviewModal: React.FC<CSVDiffPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  type = 'rates',
  items: initialItems
}) => {
  const [items, setItems] = useState<DiffPreviewItem[]>(initialItems);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'NEW' | 'MODIFIED' | 'UNCHANGED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Sync state if initialItems changes
  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  if (!isOpen) return null;

  const stats = {
    total: items.length,
    newCount: items.filter((i) => i.status === 'new').length,
    modifiedCount: items.filter((i) => i.status === 'modified').length,
    unchangedCount: items.filter((i) => i.status === 'unchanged').length,
    selectedCount: items.filter((i) => i.isSelected).length
  };

  const filteredItems = items.filter((item) => {
    if (activeFilter === 'NEW' && item.status !== 'new') return false;
    if (activeFilter === 'MODIFIED' && item.status !== 'modified') return false;
    if (activeFilter === 'UNCHANGED' && item.status !== 'unchanged') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const codeMatch = String(item.code || '').toLowerCase().includes(q);
      const nameMatch = String(item.name || '').toLowerCase().includes(q);
      const catMatch = String(item.category || '').toLowerCase().includes(q);
      return codeMatch || nameMatch || catMatch;
    }
    return true;
  });

  const handleToggleSelect = (id: string | number) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, isSelected: !it.isSelected } : it))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setItems((prev) => prev.map((it) => ({ ...it, isSelected: select })));
  };

  const handleSelectOnlyChanged = () => {
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        isSelected: it.status === 'new' || it.status === 'modified'
      }))
    );
  };

  const handleConfirm = () => {
    const selected = items.filter((i) => i.isSelected);
    onConfirm(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{title}</h2>
              <p className="text-xs text-slate-500">
                {subtitle || 'Review differences and confirm which items to update or insert'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Stat Pills & Filter Bar */}
        <div className="px-4 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>All Items</span>
              <span className="bg-white/20 text-current px-1.5 py-0.2 rounded-full text-[10px]">
                {stats.total}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('NEW')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeFilter === 'NEW'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Additions</span>
              <span className="bg-white/20 text-current px-1.5 py-0.2 rounded-full text-[10px]">
                {stats.newCount}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('MODIFIED')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeFilter === 'MODIFIED'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Rate Updates</span>
              <span className="bg-white/20 text-current px-1.5 py-0.2 rounded-full text-[10px]">
                {stats.modifiedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('UNCHANGED')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeFilter === 'UNCHANGED'
                  ? 'bg-slate-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Unchanged</span>
              <span className="bg-white/20 text-current px-1.5 py-0.2 rounded-full text-[10px]">
                {stats.unchangedCount}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search diffs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 w-44 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Quick Selection Shortcuts Bar */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Select:</span>
            <button
              onClick={() => handleSelectAll(true)}
              className="text-blue-600 hover:underline font-bold"
            >
              All ({stats.total})
            </button>
            <span>•</span>
            <button
              onClick={handleSelectOnlyChanged}
              className="text-emerald-700 hover:underline font-bold"
            >
              Only Changes ({stats.newCount + stats.modifiedCount})
            </button>
            <span>•</span>
            <button
              onClick={() => handleSelectAll(false)}
              className="text-slate-500 hover:underline font-bold"
            >
              None
            </button>
          </div>
          <div className="font-bold text-slate-800">
            {stats.selectedCount} of {stats.total} items selected for import
          </div>
        </div>

        {/* Diff Table */}
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold sticky top-0 z-10">
                <th className="p-2.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={stats.selectedCount === stats.total && stats.total > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-2.5 w-16 text-center">Status</th>
                <th className="p-2.5 w-24">Code</th>
                <th className="p-2.5 min-w-[200px]">Item / Resource Name</th>
                <th className="p-2.5 w-20">Unit</th>
                <th className="p-2.5 w-24 text-right">Current Rate</th>
                <th className="p-2.5 w-28 text-right">Import Rate</th>
                <th className="p-2.5 w-24 text-right">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredItems.map((item) => {
                const diffVal = (item.newRate || 0) - (item.oldRate || 0);
                const diffPercent = item.oldRate && item.oldRate > 0 ? (diffVal / item.oldRate) * 100 : null;

                return (
                  <tr
                    key={item.id}
                    onClick={() => handleToggleSelect(item.id)}
                    className={`hover:bg-blue-50/50 cursor-pointer transition ${
                      item.isSelected ? 'bg-white' : 'opacity-60 bg-slate-50/50'
                    }`}
                  >
                    <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={item.isSelected}
                        onChange={() => handleToggleSelect(item.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    {/* Status Badge */}
                    <td className="p-2.5 text-center font-sans">
                      {item.status === 'new' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          NEW
                        </span>
                      )}
                      {item.status === 'modified' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          UPDATED
                        </span>
                      )}
                      {item.status === 'unchanged' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          SAME
                        </span>
                      )}
                    </td>

                    {/* Code */}
                    <td className="p-2.5 font-bold text-slate-800 font-sans">
                      {item.code || '-'}
                    </td>

                    {/* Name */}
                    <td className="p-2.5 font-sans font-medium text-slate-900">
                      <div className="line-clamp-2">{item.name}</div>
                      {item.category && (
                        <span className="text-[10px] text-slate-400 uppercase font-sans">
                          {item.category}
                        </span>
                      )}
                    </td>

                    {/* Unit */}
                    <td className="p-2.5 font-sans text-slate-600">
                      {item.unit || '-'}
                    </td>

                    {/* Current Rate */}
                    <td className="p-2.5 text-right text-slate-500">
                      {item.oldRate !== undefined && item.oldRate > 0
                        ? `${currencyCode()} ${item.oldRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        : <span className="text-slate-400 font-sans text-[11px]">—</span>}
                    </td>

                    {/* New Import Rate */}
                    <td className="p-2.5 text-right font-bold text-slate-900">
                      {item.newRate !== undefined
                        ? `${currencyCode()} ${item.newRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        : <span className="text-slate-400 font-sans text-[11px]">—</span>}
                    </td>

                    {/* Variance */}
                    <td className="p-2.5 text-right font-sans">
                      {item.status === 'new' ? (
                        <span className="text-[11px] text-emerald-600 font-bold">+ New Item</span>
                      ) : item.status === 'modified' ? (
                        <span className={`text-[11px] font-bold flex items-center justify-end gap-0.5 ${
                          diffVal >= 0 ? 'text-amber-600' : 'text-blue-600'
                        }`}>
                          {diffVal >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          <span>{diffVal >= 0 ? '+' : ''}{diffPercent !== null ? `${diffPercent.toFixed(1)}%` : diffVal.toFixed(2)}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">0.0%</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredItems.length === 0 && (
            <div className="p-8 text-center text-slate-400 font-sans text-xs">
              No items match the current filter or search query.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-semibold hidden sm:inline">
              Ready to apply <b>{stats.selectedCount}</b> item(s)
            </span>
            <button
              onClick={handleConfirm}
              disabled={stats.selectedCount === 0}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Apply Selected ({stats.selectedCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
