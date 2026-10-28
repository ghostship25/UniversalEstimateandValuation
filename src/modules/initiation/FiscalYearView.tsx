import React, { useState } from 'react';
import { Calendar, Plus, CheckCircle2, Lock, Unlock, Globe } from 'lucide-react';
import { FiscalYearConfig } from '../../types';

interface FiscalYearViewProps {
  fiscalYears: string[];
  setFiscalYears: React.Dispatch<React.SetStateAction<string[]>>;
  selectedFY: string;
  setSelectedFY: (fy: string) => void;
  showToast: (msg: string) => void;
}

export const FiscalYearView: React.FC<FiscalYearViewProps> = ({
  fiscalYears,
  setFiscalYears,
  selectedFY,
  setSelectedFY,
  showToast
}) => {
  const [newFY, setNewFY] = useState('');

  const handleAddFY = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFY.trim();
    if (!trimmed) return;
    if (fiscalYears.includes(trimmed)) {
      showToast('Fiscal Year already exists.');
      return;
    }

    setFiscalYears([...fiscalYears, trimmed]);
    setNewFY('');
    showToast(`Fiscal Year ${trimmed} added.`);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-blue-900 rounded-2xl p-6 text-white shadow-lg border-2 border-red-600 flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-red-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider">
              INITIATION (Master Data)
            </span>
            <span className="text-blue-200 text-xs font-mono">• Fiscal Year Management</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">Fiscal Year Calendar Registry</h2>
          <p className="text-xs text-blue-100 mt-1">
            Configure Fiscal Years (e.g. 2025/26, 2026/27), set active working fiscal period, and lock past budget records.
          </p>
        </div>
      </div>

      {/* Form: Add Fiscal Year */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-600" />
          Register New Fiscal Year
        </h3>

        <form onSubmit={handleAddFY} className="flex gap-3 text-xs max-w-md">
          <input
            type="text"
            value={newFY}
            onChange={(e) => setNewFY(e.target.value)}
            placeholder="e.g. 2027/28"
            className="flex-1 p-2.5 border rounded-xl font-mono font-bold text-slate-900"
            required
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Fiscal Year
          </button>
        </form>
      </div>

      {/* Fiscal Years List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          Registered Fiscal Years ({fiscalYears.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {fiscalYears.map((fy) => {
            const isActive = selectedFY === fy;

            return (
              <div
                key={fy}
                onClick={() => {
                  setSelectedFY(fy);
                  showToast(`Active Fiscal Year switched to ${fy}`);
                }}
                className={`p-4 rounded-xl border transition cursor-pointer flex justify-between items-center ${
                  isActive
                    ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-sm'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>
                  <span className="font-mono font-extrabold text-slate-900 text-sm block">{fy}</span>
                  <span className="text-[11px] text-slate-500">
                    {isActive ? 'Current Active Fiscal Year' : 'Click to set active'}
                  </span>
                </div>

                {isActive ? (
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs font-semibold hover:text-blue-600">Select</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
