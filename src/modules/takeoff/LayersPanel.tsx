import React from 'react';
import { Eye, EyeOff, Image as ImageIcon, FileSpreadsheet, Focus } from 'lucide-react';

export interface LayerRow {
  key: string;            // item id or '_none'
  color: string;
  visible: boolean;
  title: string;          // "1.1 Earthwork ..."
  count: number;          // measurements
  summary: string;        // e.g. "40.000 m · 96.000 m² · 3 nos"
}

interface Props {
  rows: LayerRow[];
  onToggle: (key: string) => void;
  onIsolate: (key: string) => void;
  onShowAll: () => void;
  onColor: (key: string) => void;
  onExportPng: () => void;
  onExportCsv: () => void;
  exporting: boolean;
}

export const LayersPanel: React.FC<Props> = ({ rows, onToggle, onIsolate, onShowAll, onColor, onExportPng, onExportCsv, exporting }) => (
  <div className="border-b bg-white" data-testid="layers-panel">
    <div className="flex items-center gap-1.5 px-3 py-1.5">
      <div className="font-bold text-xs text-slate-800">Item layers <span className="font-normal text-slate-500">(evidence)</span></div>
      <span className="flex-1" />
      <button onClick={onShowAll} className="text-[10px] font-bold text-blue-700">Show all</button>
      <button data-testid="export-png" disabled={exporting || !rows.length} onClick={onExportPng} className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-300 text-[10px] font-bold text-slate-700 disabled:opacity-40" title="PNG of this page with the visible item layers and a legend"><ImageIcon className="w-3 h-3" /> PNG</button>
      <button data-testid="export-csv" disabled={!rows.length} onClick={onExportCsv} className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-300 text-[10px] font-bold text-slate-700 disabled:opacity-40" title="All measurements with item, page, value and factors"><FileSpreadsheet className="w-3 h-3" /> CSV</button>
    </div>
    <div className="max-h-36 overflow-y-auto">
      {rows.length === 0 && <div className="px-3 pb-2 text-[11px] text-slate-500">Each BOQ item you assign measurements to becomes its own layer here, so every quantity stays traceable to the drawing.</div>}
      {rows.map((r) => (
        <div key={r.key} className="flex items-center gap-1.5 px-3 py-1 border-t text-[11px]" data-testid="layer-row">
          <button onClick={() => onToggle(r.key)} className="text-slate-500" title="Show / hide this layer">{r.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}</button>
          <button onClick={() => onColor(r.key)} className="w-3.5 h-3.5 rounded shrink-0 border border-white shadow" style={{ background: r.color }} title="Change layer colour" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate" title={r.title}>{r.title}</div>
            <div className="text-[10px] text-slate-500 font-mono truncate">{r.count} · {r.summary}</div>
          </div>
          <button onClick={() => onIsolate(r.key)} className="text-slate-400 hover:text-blue-700" title="Show only this layer"><Focus className="w-3.5 h-3.5" /></button>
        </div>
      ))}
    </div>
  </div>
);
