import React, { useState } from 'react';
import { Plus, Trash2, Send, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { RowCol, TakeoffRow } from './takeoffStore';
import { ROW_COLS, COL_NAME, RowAssembly, unitDim, dimName } from './takeoffGeometry';

export type ActiveCol = RowCol | 'AREA';

interface ItemLite { id: string; code: string; description: string; unit: string }
interface Props {
  rows: TakeoffRow[];
  items: ItemLite[];
  assemblies: Record<string, RowAssembly>;
  activeRowId: string | null;
  activeCol: ActiveCol | null;
  onActivate: (id: string | null) => void;
  onCreate: (itemId: string, label: string) => void;
  onPickCol: (c: ActiveCol) => void;
  onManual: (rowId: string, col: RowCol, v: number | undefined) => void;
  onToggleAuto: (rowId: string) => void;
  onSend: (rowId: string) => void;
  onDelete: (rowId: string) => void;
  memberCount: (rowId: string) => number;
}

const CHIP: Record<ActiveCol, string> = { N: 'No. · Count', L: 'L · Length', B: 'B · Breadth', H: 'H · Height', AREA: 'Area → L×B' };

export const RowsPanel: React.FC<Props> = ({ rows, items, assemblies, activeRowId, activeCol, onActivate, onCreate, onPickCol, onManual, onToggleAuto, onSend, onDelete, memberCount }) => {
  const [form, setForm] = useState(false);
  const [itemId, setItemId] = useState('');
  const [label, setLabel] = useState('');
  const active = rows.find((r) => r.id === activeRowId) || null;
  const asm = active ? assemblies[active.id] : null;
  const item = active ? items.find((i) => i.id === active.itemId) : null;
  const create = () => {
    if (!itemId || !label.trim()) return;
    onCreate(itemId, label.trim());
    setLabel(''); setForm(false);
  };
  return (
    <div className="border-b bg-white" data-testid="rows-panel">
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        <div className="font-bold text-xs text-slate-800">Takeoff rows <span className="font-normal text-slate-500">(one MB row, filled column by column)</span></div>
        <span className="flex-1" />
        {active && <button onClick={() => onActivate(null)} data-testid="row-free" className="text-[10px] font-bold text-slate-500 px-1.5 py-0.5 border rounded" title="Measure without a row: each measurement makes its own MB row">Free mode</button>}
        <button onClick={() => setForm((f) => !f)} data-testid="row-new" className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-bold"><Plus className="w-3 h-3" /> New row</button>
      </div>

      {form && (
        <div className="px-3 pb-2 space-y-1.5" data-testid="row-form">
          <select data-testid="row-item" value={itemId} onChange={(e) => setItemId(e.target.value)} className="w-full border border-slate-300 rounded px-1.5 py-1 text-xs">
            <option value="">BOQ item…</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.code} · {i.description.slice(0, 48)} ({i.unit})</option>)}
          </select>
          <div className="flex gap-1.5">
            <input data-testid="row-label" value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') create(); }} placeholder="Row description, e.g. Footing F1" className="flex-1 border border-slate-300 rounded px-1.5 py-1 text-xs" />
            <button data-testid="row-create" disabled={!itemId || !label.trim()} onClick={create} className="px-2.5 py-1 rounded bg-emerald-600 text-white text-xs font-bold disabled:opacity-40">Create</button>
          </div>
        </div>
      )}

      {active && asm && (
        <div className="mx-3 mb-2 rounded-xl border-2 border-indigo-400 bg-indigo-50/40 p-2 space-y-1.5" data-testid="row-active">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-xs truncate" title={active.label}>{active.label}</div>
              <div className="text-[10px] text-slate-500 truncate">{item?.code} · {item?.description.slice(0, 40)} ({item?.unit}) · {memberCount(active.id)} measurement(s)</div>
            </div>
            <button onClick={() => onDelete(active.id)} className="text-slate-400 hover:text-red-600" title="Delete this takeoff row (the MB row stays)"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
          <div className="text-[10px] text-slate-600">Pick a column, then measure on the drawing: it goes into this row. Fill one column or all of them, in any order.</div>
          <div className="grid grid-cols-5 gap-1">
            {(['N', 'L', 'B', 'H', 'AREA'] as ActiveCol[]).map((c) => (
              <button key={c} data-testid={`rowcol-${c}`} onClick={() => onPickCol(c)}
                className={`px-1 py-1 rounded-lg text-[10px] font-bold border leading-tight ${activeCol === c ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-indigo-50'}`}>{CHIP[c]}</button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {ROW_COLS.map((c) => {
              const measured = asm.sources[c].length > 0;
              const val = asm.cols[c];
              return (
                <div key={c} className="rounded-lg border bg-white p-1" data-testid={`rowcell-${c}`}>
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-500"><span>{COL_NAME[c]}</span>{measured ? <span className="text-emerald-600" title="measured">● {asm.sources[c].length}</span> : asm.typed[c] ? <span className="text-amber-600">typed</span> : <span>blank</span>}</div>
                  {measured
                    ? <div className="font-mono text-xs font-bold text-slate-900" data-testid={`rowval-${c}`}>{val === null ? '–' : Number(val).toFixed(3)}</div>
                    : <input data-testid={`rowtype-${c}`} type="number" step="any" value={active.manual[c] ?? ''} placeholder="–" onChange={(e) => onManual(active.id, c, e.target.value === '' ? undefined : Number(e.target.value))} className="w-full font-mono text-xs border border-slate-200 rounded px-1 py-0.5" title="Type a value for this column, or measure it" />}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between font-mono text-xs bg-white rounded-lg border px-2 py-1" data-testid="row-qty">
            <span className="text-slate-500">{asm.text}</span><span className="font-bold">= {asm.qty.toFixed(3)} {item?.unit}</span>
          </div>
          {(() => {
            const need = item ? unitDim(item.unit) : null;
            const has = ROW_COLS.some((c) => asm.cols[c] !== null);
            if (!has || need === null) return null;
            // a count in No. alone gives dimension 0; each filled length column adds one
            if (need === asm.dim) return null;
            return <div data-testid="row-unitcheck" className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-1">Unit check: {item?.unit} expects {dimName(need)}, this row gives {dimName(asm.dim)}. {need > asm.dim ? 'Measure or type the missing column(s) (Length, Breadth, Height, or an Area).' : 'Remove a column that should not multiply.'}</div>;
          })()}
          {asm.warnings.map((w, i) => <div key={i} className="flex gap-1 text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-1"><AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{w}</div>)}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-[10px] text-slate-700 cursor-pointer"><input type="checkbox" checked={active.autoSync} onChange={() => onToggleAuto(active.id)} data-testid="row-auto" /> Keep the MB row up to date automatically</label>
            <span className="flex-1" />
            {active.mbRowId && <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="w-3 h-3" /> in MB</span>}
            <button data-testid="row-send" onClick={() => onSend(active.id)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold"><Send className="w-3 h-3" /> {active.mbRowId ? 'Update MB row' : 'Send to MB'}</button>
          </div>
        </div>
      )}

      {rows.filter((r) => r.id !== activeRowId).length > 0 && (
        <div className="px-3 pb-2 space-y-1 max-h-28 overflow-y-auto">
          {rows.filter((r) => r.id !== activeRowId).map((r) => {
            const a = assemblies[r.id]; const it = items.find((i) => i.id === r.itemId);
            return (
              <button key={r.id} onClick={() => onActivate(r.id)} data-testid="row-other" className="w-full flex items-center gap-2 text-left px-2 py-1 rounded-lg border border-slate-200 hover:bg-indigo-50 text-[11px]">
                <span className="font-semibold truncate flex-1">{r.label}</span>
                <span className="text-slate-500 truncate max-w-[110px]">{it?.code}</span>
                <span className="font-mono">{a ? a.qty.toFixed(2) : '0.00'} {it?.unit}</span>
                <span className={r.mbRowId ? 'text-emerald-600' : 'text-slate-400'}>{r.mbRowId ? '● MB' : '○'}</span>
              </button>
            );
          })}
        </div>
      )}
      {rows.length === 0 && !form && <div className="px-3 pb-2 text-[11px] text-slate-500">Create a row for an item description (for example Footing F1), then count it, measure its length, breadth and height, or its area, all into the same MB row.</div>}
      <button className="hidden" onClick={() => onActivate(null)}><X /></button>
    </div>
  );
};
