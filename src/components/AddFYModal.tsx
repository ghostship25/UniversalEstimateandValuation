import React, { useState } from 'react';
import { Calendar, Plus } from 'lucide-react';

interface AddFYModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFY: (newFY: string, makeCurrent?: boolean) => void;
}

export const AddFYModal: React.FC<AddFYModalProps> = ({
  isOpen,
  onClose,
  onAddFY
}) => {
  const [fyCode, setFyCode] = useState('');
  const [setAsCurrent, setSetAsCurrent] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fyCode.trim()) {
      alert('Please enter Fiscal Year Code (e.g. 2027/28)');
      return;
    }

    onAddFY(fyCode.trim(), setAsCurrent);
    setFyCode('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Add Custom Fiscal Year</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold p-1">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Fiscal Year Code (B.S. or A.D.)</label>
            <input
              type="text"
              value={fyCode}
              onChange={(e) => setFyCode(e.target.value)}
              placeholder="e.g. 2027/28 or 2028/29"
              className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold text-emerald-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Format: YYYY/YY (e.g. 2026/27 or 2027/28).
            </p>
          </div>

          <div className="flex items-center gap-2 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
            <input
              type="checkbox"
              id="setAsCurrentFY"
              checked={setAsCurrent}
              onChange={(e) => setSetAsCurrent(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <label htmlFor="setAsCurrentFY" className="font-bold text-slate-800 text-xs cursor-pointer">
 Set as Current / Active Fiscal Year (.)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-50 text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Fiscal Year
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
