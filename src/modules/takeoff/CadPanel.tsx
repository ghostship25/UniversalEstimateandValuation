import React, { useState } from 'react';
import { Eye, EyeOff, Plus, X } from 'lucide-react';
import type { DxfModel } from './dxfModel';

export interface CadAdd {
  type: 'length' | 'area' | 'count';
  label: string;
  raw: number;           // drawing units / units² / count
  entityIds: number[];
  layer?: string;
  blockName?: string;
}

interface Props {
  model: DxfModel;
  mpp: number | undefined;
  out: 'm' | 'ft';
  hidden: Set<string>;
  onToggleLayer: (name: string) => void;
  onShowAll: () => void;
  picked: Set<number>;
  onClearPicked: () => void;
  onAdd: (a: CadAdd) => void;
}

export const CadPanel: React.FC<Props> = ({ model, mpp, out, hidden, onToggleLayer, onShowAll, picked, onClearPicked, onAdd }) => {
  const [tab, setTab] = useState<'layers' | 'blocks'>('layers');
  const [q, setQ] = useState('');
  const lf = out === 'ft' ? 3.28084 : 1;
  const af = lf * lf;
  const lenText = (raw: number) => (mpp ? `${(raw * mpp * lf).toFixed(3)} ${out === 'ft' ? 'ft' : 'm'}` : '–');
  const areaText = (raw: number) => (mpp ? `${(raw * mpp * mpp * af).toFixed(3)} ${out === 'ft' ? 'ft²' : 'm²'}` : '–');

  const pickedEnts = model.entities.filter((e) => picked.has(e.id));
  const pLen = pickedEnts.reduce((s, e) => s + e.length, 0);
  const pClosed = pickedEnts.filter((e) => e.area !== null);
  const pArea = pClosed.reduce((s, e) => s + (e.area || 0), 0);
  const noScale = !mpp;

  const btn = 'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-bold disabled:opacity-40 disabled:cursor-not-allowed';
  const layers = model.layers.filter((l) => l.name.toLowerCase().includes(q.toLowerCase()));
  const blocks = Object.entries(model.blocks).filter(([n]) => n.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="border-b bg-slate-50" data-testid="cad-panel">
      <div className="flex items-center gap-1 px-2 pt-2">
        {(['layers', 'blocks'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-2.5 py-1 rounded-t-lg text-[11px] font-bold ${tab === t ? 'bg-white border border-b-0 text-blue-700' : 'text-slate-500'}`}>
            {t === 'layers' ? `Layers (${model.layers.length})` : `Blocks (${Object.keys(model.blocks).length})`}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" className="ml-auto w-24 border rounded px-1.5 py-0.5 text-[11px]" />
        <button onClick={onShowAll} className="text-[10px] text-blue-700 font-bold px-1" title="Show all layers">Show all</button>
      </div>
      <div className="bg-white border-t max-h-52 overflow-y-auto">
        {tab === 'layers' && layers.map((l) => (
          <div key={l.name} className="flex items-center gap-1.5 px-2 py-1 border-b text-[11px]" data-testid="cad-layer">
            <button onClick={() => onToggleLayer(l.name)} className="text-slate-500" title="Show / hide layer">{hidden.has(l.name) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.color }} />
            <span className="font-semibold truncate flex-1" title={l.name}>{l.name}</span>
            <span className="font-mono text-slate-600 whitespace-nowrap">{lenText(l.length)}</span>
            <button disabled={noScale || l.length <= 0} className={`${btn} border-blue-300 text-blue-700`} title="Add this layer's total length as a measurement"
              onClick={() => onAdd({ type: 'length', label: `${l.name} length`, raw: l.length, entityIds: l.entityIds.filter((i) => model.entities[i].type !== 'INSERT'), layer: l.name })}><Plus className="w-3 h-3" />L</button>
            <button disabled={noScale || l.area <= 0} className={`${btn} border-emerald-300 text-emerald-700`} title={`Add the total area of closed shapes on this layer (${areaText(l.area)})`}
              onClick={() => onAdd({ type: 'area', label: `${l.name} area`, raw: l.area, entityIds: l.closedIds, layer: l.name })}><Plus className="w-3 h-3" />A</button>
          </div>
        ))}
        {tab === 'blocks' && (blocks.length === 0
          ? <div className="p-3 text-[11px] text-slate-500">No block references (INSERT) in this drawing.</div>
          : blocks.map(([name, ids]) => (
            <div key={name} className="flex items-center gap-1.5 px-2 py-1 border-b text-[11px]" data-testid="cad-block">
              <span className="font-semibold truncate flex-1" title={name}>{name}</span>
              <span className="font-mono text-slate-600">{ids.length} nos</span>
              <button className={`${btn} border-violet-300 text-violet-700`} onClick={() => onAdd({ type: 'count', label: `${name} count`, raw: ids.length, entityIds: ids, blockName: name })}><Plus className="w-3 h-3" />Count</button>
            </div>
          )))}
        {tab === 'layers' && layers.length === 0 && <div className="p-3 text-[11px] text-slate-500">No layers match.</div>}
      </div>
      {picked.size > 0 && (
        <div className="px-2 py-1.5 bg-amber-50 border-t border-amber-200 text-[11px] flex items-center gap-1.5 flex-wrap" data-testid="cad-picked">
          <b className="text-amber-800">{picked.size} picked</b>
          <span className="font-mono">{lenText(pLen)}</span>
          {pClosed.length > 0 && <span className="font-mono text-emerald-700">· {areaText(pArea)} ({pClosed.length} closed)</span>}
          <span className="flex-1" />
          <button disabled={noScale} className={`${btn} border-blue-300 text-blue-700 bg-white`} data-testid="cad-picked-length"
            onClick={() => onAdd({ type: 'length', label: `Picked length (${picked.size})`, raw: pLen, entityIds: pickedEnts.map((e) => e.id) })}><Plus className="w-3 h-3" />Length</button>
          <button disabled={noScale || pClosed.length === 0} className={`${btn} border-emerald-300 text-emerald-700 bg-white`}
            onClick={() => onAdd({ type: 'area', label: `Picked area (${pClosed.length})`, raw: pArea, entityIds: pClosed.map((e) => e.id) })}><Plus className="w-3 h-3" />Area</button>
          <button onClick={onClearPicked} className="text-slate-500" title="Clear selection"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {(Object.keys(model.unsupported).length > 0 || model.approxCount > 0) && (
        <div className="px-2 py-1 text-[10px] text-amber-800 bg-amber-50 border-t border-amber-200">
          {Object.keys(model.unsupported).length > 0 && <div>Not measured: {Object.entries(model.unsupported).map(([k, v]) => `${v}× ${k}`).join(', ')}. Convert hatches to closed polylines to measure their area.</div>}
          {model.approxCount > 0 && <div>{model.approxCount} spline(s) are approximated.</div>}
        </div>
      )}
      <div className="px-2 py-1 text-[10px] text-slate-500 border-t">Totals cover model-space entities. Geometry inside blocks is drawn but counted only as block references.</div>
    </div>
  );
};
