import React, { useEffect, useMemo, useState } from 'react';
import { Crosshair, Ruler, Check, AlertTriangle } from 'lucide-react';
import { Pt, ScaleInfo, UNIT_TO_M, dist } from './takeoffStore';
import { UNIT_CHOICES } from './dxfModel';

export type ScaleScope = { mode: 'page' | 'all' | 'range'; range?: string };

interface Props {
  kind: 'pdf' | 'image' | 'dxf';
  numPages: number;
  page: number;
  info?: ScaleInfo;
  mpp?: number;
  pagesWithScale: number[];
  /** sheet size in mm for PDFs (to sanity check a preset scale) */
  paperMm?: { w: number; h: number };
  fileUnitName?: string;           // DXF: units declared in the file
  calibPts: Pt[] | null;           // picked points in drawing units
  picking: boolean;
  onPickPoints: () => void;
  onApply: (mpp: number, info: ScaleInfo, scope: ScaleScope, ref?: { a: Pt; b: Pt }) => void;
  onClear: (scope: ScaleScope) => void;
}

const PRESETS = [1, 5, 10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 300, 500, 1000, 2000];
const PAPERS: [string, number, number][] = [['A0', 841, 1189], ['A1', 594, 841], ['A2', 420, 594], ['A3', 297, 420], ['A4', 210, 297], ['ARCH D', 610, 914], ['Letter', 216, 279]];

export function parsePageRange(text: string, max: number): number[] {
  const out = new Set<number>();
  text.split(',').forEach((part) => {
    const m = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) return;
    const a = Number(m[1]), b = m[2] ? Number(m[2]) : a;
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) if (i >= 1 && i <= max) out.add(i);
  });
  return [...out].sort((x, y) => x - y);
}
export function scopePages(scope: ScaleScope, page: number, numPages: number): number[] {
  if (scope.mode === 'all') return Array.from({ length: numPages }, (_, i) => i + 1);
  if (scope.mode === 'range') return parsePageRange(scope.range || '', numPages);
  return [page];
}
export function paperName(w: number, h: number): string {
  const [a, b] = w < h ? [w, h] : [h, w];
  const hit = PAPERS.find(([, pw, ph]) => Math.abs(pw - a) < 4 && Math.abs(ph - b) < 4);
  return hit ? hit[0] : '';
}

export const ScalePanel: React.FC<Props> = ({ kind, numPages, page, info, mpp, pagesWithScale, paperMm, fileUnitName, calibPts, picking, onPickPoints, onApply, onClear }) => {
  const [real, setReal] = useState('');
  const [unit, setUnit] = useState(kind === 'dxf' ? 'm' : 'm');
  const [ratio, setRatio] = useState(100);
  const [cadUnit, setCadUnit] = useState('m');
  const [scope, setScope] = useState<'page' | 'all' | 'range'>('page');
  const [rangeText, setRangeText] = useState('');
  const multi = numPages > 1;
  useEffect(() => { setReal(''); setScope('page'); }, [page]);

  const pix = calibPts && calibPts.length === 2 ? dist(calibPts[0], calibPts[1]) : 0;
  const realNum = parseFloat(real);
  const twoPointMpp = pix > 0 && realNum > 0 ? (realNum * (UNIT_TO_M[unit] || 1)) / pix : 0;
  const paperPerUnit = 0.0254 / 72; // metres of paper per PDF unit
  const sc: ScaleScope = { mode: scope, range: rangeText };
  const targetPages = scopePages(sc, page, numPages);
  const missing = Array.from({ length: numPages }, (_, i) => i + 1).filter((p) => !pagesWithScale.includes(p));
  const paper = paperMm ? paperName(paperMm.w, paperMm.h) : '';

  const apply = (m: number, i: ScaleInfo, withRef?: { a: Pt; b: Pt }) => {
    if (scope === 'range' && targetPages.length === 0) return;
    onApply(m, i, sc, withRef);
    setScope('page'); // default back to this page only
  };

  const scopeBox = multi && (
    <div className="mt-2 border-t border-amber-200 pt-2" data-testid="scale-scope">
      <div className="font-bold text-slate-700 mb-1">Apply the scale to</div>
      <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="scale-scope" checked={scope === 'page'} onChange={() => setScope('page')} /> This page only <span className="text-slate-500">(page {page})</span></label>
      <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="scale-scope" checked={scope === 'all'} onChange={() => setScope('all')} data-testid="scope-all" /> All {numPages} pages <span className="text-slate-500">(sheets drawn to the same scale)</span></label>
      <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="scale-scope" checked={scope === 'range'} onChange={() => setScope('range')} /> Pages
        <input value={rangeText} onFocus={() => setScope('range')} onChange={(e) => { setRangeText(e.target.value); setScope('range'); }} placeholder="e.g. 1-3, 5" className="w-24 border rounded px-1.5 py-0.5 font-mono" />
      </label>
      <div className="mt-1 text-[11px] text-slate-600">→ will apply to page{targetPages.length === 1 ? '' : 's'}: <b className="font-mono">{targetPages.length ? targetPages.join(', ') : 'none (check the range)'}</b></div>
    </div>
  );

  return (
    <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 text-xs" data-testid="scale-panel">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <b className="text-amber-900">Drawing scale</b>
        {mpp
          ? <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold"><Check className="w-3.5 h-3.5" /> Page {page}: {info?.label || `1 unit = ${mpp.toPrecision(4)} m`}</span>
          : <span className="inline-flex items-center gap-1 text-red-700 font-semibold"><AlertTriangle className="w-3.5 h-3.5" /> Page {page} has no scale yet. Length and area need a scale.</span>}
        {multi && <span className="text-slate-600">· pages with scale: <b className="font-mono">{pagesWithScale.length ? pagesWithScale.join(', ') : 'none'}</b>{missing.length > 0 && <> · <span className="text-red-700">missing: <b className="font-mono">{missing.join(', ')}</b></span></>}</span>}
        {mpp && <button onClick={() => { onClear(sc); setScope('page'); }} className="ml-auto text-[11px] px-2 py-0.5 rounded border border-red-300 text-red-700 bg-white" title={scope === 'page' ? 'Remove the scale of this page' : 'Remove the scale of the selected pages'}>Clear scale ({scope === 'page' ? 'this page' : scope === 'all' ? 'all pages' : 'range'})</button>}
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: kind === 'pdf' ? '1.4fr 1fr' : kind === 'dxf' ? '1.4fr 1fr' : '1fr' }}>
        {/* A: known distance */}
        <div className="bg-white border border-amber-200 rounded-lg p-2.5">
          <div className="font-bold text-slate-800 mb-1.5 flex items-center gap-1"><Ruler className="w-3.5 h-3.5 text-amber-600" /> A · Measure a known distance <span className="font-normal text-slate-500">(most reliable)</span></div>
          <ol className="space-y-1.5">
            <li className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">1</span>
              <button data-testid="scale-pick" onClick={onPickPoints} className={`px-2 py-1 rounded border font-bold flex items-center gap-1 ${picking ? 'bg-amber-500 text-white border-amber-500' : 'bg-white border-amber-400 text-amber-800'}`}><Crosshair className="w-3.5 h-3.5" /> {pix > 0 ? 'Pick again' : 'Pick 2 points'}</button>
              <span className="text-slate-600">{pix > 0 ? <b className="text-emerald-700">✓ 2 points picked ({pix.toFixed(2)} units apart)</b> : picking ? (calibPts?.length === 1 ? 'Click the SECOND end of the dimension…' : 'Click the FIRST end of a dimension you know…') : 'then click both ends of a dimension you know'}</span></li>
            <li className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">2</span>
              <span>Real distance:</span>
              <input data-testid="calib-dist" value={real} onChange={(e) => setReal(e.target.value)} placeholder="e.g. 10" className="w-20 border rounded px-1.5 py-0.5 font-mono" />
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className="border rounded px-1 py-0.5">{Object.keys(UNIT_TO_M).map((u) => <option key={u}>{u}</option>)}</select></li>
            <li className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">3</span>
              <button data-testid="calib-apply" disabled={!twoPointMpp} onClick={() => apply(twoPointMpp, { method: 'two-point', label: `${realNum} ${unit} = ${pix.toFixed(1)} units` }, calibPts ? { a: calibPts[0], b: calibPts[1] } : undefined)}
                className="px-2.5 py-1 rounded bg-amber-600 text-white font-bold disabled:opacity-40">Apply scale</button>
              {twoPointMpp > 0 && <span className="text-slate-600">→ 1 unit = <b className="font-mono">{twoPointMpp.toPrecision(4)} m</b>{kind === 'pdf' ? <> (≈ 1:{Math.round(twoPointMpp / paperPerUnit)} on paper)</> : null}</span>}</li>
          </ol>
          {scopeBox}
        </div>

        {/* B: preset or units */}
        {kind === 'pdf' && (
          <div className="bg-white border border-amber-200 rounded-lg p-2.5">
            <div className="font-bold text-slate-800 mb-1.5">B · Use the printed drawing scale</div>
            <div className="flex items-center gap-1.5">1 :
              <select value={ratio} onChange={(e) => setRatio(Number(e.target.value))} className="border rounded px-1 py-0.5" data-testid="preset-ratio">{PRESETS.map((r) => <option key={r} value={r}>{r}</option>)}</select>
              <button data-testid="preset-apply" disabled={scope === 'range' && targetPages.length === 0} onClick={() => apply(paperPerUnit * ratio, { method: 'preset', label: `1:${ratio} (printed scale)` })} className="px-2 py-1 rounded border border-amber-500 text-amber-800 font-bold bg-white">Apply 1:{ratio}</button>
            </div>
            {paperMm && <div className="mt-1.5 text-slate-600">This sheet is <b className="font-mono">{Math.round(paperMm.w)} × {Math.round(paperMm.h)} mm</b>{paper && <> ({paper})</>}.</div>}
            <div className="mt-1 text-[11px] text-amber-800">Only correct if the PDF was plotted at 100% (actual paper size) and the drawing really is at this scale. Check it by measuring a known dimension.</div>
          </div>
        )}
        {kind === 'dxf' && (
          <div className="bg-white border border-amber-200 rounded-lg p-2.5">
            <div className="font-bold text-slate-800 mb-1.5">B · Drawing units</div>
            <div className="text-slate-600 mb-1">File says: <b>{fileUnitName || 'units not set'}</b></div>
            <div className="flex items-center gap-1.5">1 drawing unit =
              <select value={cadUnit} onChange={(e) => setCadUnit(e.target.value)} className="border rounded px-1 py-0.5" data-testid="cad-unit">{UNIT_CHOICES.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}</select>
              <button data-testid="cad-unit-apply" onClick={() => { const u = UNIT_CHOICES.find((x) => x.id === cadUnit)!; apply(u.m, { method: 'units', label: `1 unit = 1 ${u.id}` }); }} className="px-2 py-1 rounded border border-amber-500 text-amber-800 font-bold bg-white">Apply</button>
            </div>
            <div className="mt-1 text-[11px] text-amber-800">If values look 1000× too large or small, the unit is wrong. Check against a known dimension.</div>
          </div>
        )}
      </div>
    </div>
  );
};
