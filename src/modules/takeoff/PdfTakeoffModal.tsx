import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Upload, Ruler, Hexagon, Hash, MousePointer2, Crosshair, ZoomIn, ZoomOut, Trash2, Send,
  ChevronLeft, ChevronRight, RefreshCw, Maximize,
} from 'lucide-react';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  Pt, TakeoffMeasurement, TakeoffSheet, TakeoffToolType, UNIT_TO_M,
  centroid, deleteSheet, dist, listSheets, measurementValue, polygonArea, polylineLength, saveSheet, toRowSpec,
  MBRowSpec,
} from './takeoffStore';

export interface TakeoffItem { id: string; code: string; description: string; unit: string }

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: 'estimate' | 'valuation';
  /** used to keep each project's drawings separate */
  projectKey: string;
  items: TakeoffItem[];
  /** create a new MB row from a measurement */
  onApplyRow: (itemId: string, spec: MBRowSpec) => void;
  /** update an MB row that was created earlier from the same measurement */
  onSyncRow: (itemId: string, spec: MBRowSpec) => void;
}

type Tool = 'select' | 'calibrate' | TakeoffToolType;
const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#0d9488', '#0891b2', '#db2777', '#65a30d'];
const PRESET_SCALES = [1, 5, 10, 20, 25, 50, 75, 100, 200, 250, 500, 1000];
const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

interface PageSource {
  numPages: number;
  size: (page: number) => Promise<{ w: number; h: number }>;
  render: (page: number, canvas: HTMLCanvasElement, zoom: number) => Promise<void>;
}

export const PdfTakeoffModal: React.FC<Props> = ({ isOpen, onClose, mode, projectKey, items, onApplyRow, onSyncRow }) => {
  const [sheets, setSheets] = useState<TakeoffSheet[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<Tool>('select');
  const [draft, setDraft] = useState<Pt[]>([]);
  const [cursor, setCursor] = useState<Pt | null>(null);
  const [pageSize, setPageSize] = useState<{ w: number; h: number }>({ w: 612, h: 792 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [calibPts, setCalibPts] = useState<Pt[] | null>(null);
  const [calibDist, setCalibDist] = useState('');
  const [calibUnit, setCalibUnit] = useState('m');
  const [presetScale, setPresetScale] = useState(100);
  const [deductMode, setDeductMode] = useState(false);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [source, setSource] = useState<PageSource | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const renderTokenRef = useRef(0);
  const saveTimer = useRef<number | null>(null);

  const sheet = useMemo(() => sheets.find((s) => s.id === activeId) || null, [sheets, activeId]);
  const mpp = sheet?.pageScales[page];
  const out = sheet?.outUnit || 'm';
  const lenU = out === 'ft' ? 'ft' : 'm';
  const areaU = out === 'ft' ? 'ft²' : 'm²';
  const pageMeasurements = useMemo(() => (sheet ? sheet.measurements.filter((m) => m.page === page) : []), [sheet, page]);

  const flash = (m: string) => { setMessage(m); window.setTimeout(() => setMessage(''), 3500); };

  // ---- load stored sheets ------------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    listSheets(projectKey).then((list) => {
      if (!alive) return;
      setSheets(list);
      setActiveId((cur) => cur && list.some((s) => s.id === cur) ? cur : list[0]?.id || null);
    });
    return () => { alive = false; };
  }, [isOpen, projectKey]);

  // ---- persist active sheet (debounced) ----------------------------------------------------------
  const updateSheet = useCallback((fn: (s: TakeoffSheet) => TakeoffSheet) => {
    setSheets((prev) => prev.map((s) => (s.id === activeId ? fn(s) : s)));
  }, [activeId]);

  useEffect(() => {
    if (!sheet) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => { saveSheet(sheet); }, 500);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [sheet]);

  // ---- build a page source for the active sheet ---------------------------------------------------
  useEffect(() => {
    setSource(null); setLoadError(''); setPage(1); setDraft([]); setSelectedId(null);
    if (!sheet || !isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        if (sheet.kind === 'image') {
          const blob = new Blob([sheet.data]);
          const url = URL.createObjectURL(blob);
          const img = new Image();
          await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('Image could not be read')); img.src = url; });
          if (cancelled) return;
          setSource({
            numPages: 1,
            size: async () => ({ w: img.naturalWidth, h: img.naturalHeight }),
            render: async (_p, canvas, z) => {
              const dpr = window.devicePixelRatio || 1;
              canvas.width = Math.floor(img.naturalWidth * z * dpr);
              canvas.height = Math.floor(img.naturalHeight * z * dpr);
              canvas.style.width = `${img.naturalWidth * z}px`;
              canvas.style.height = `${img.naturalHeight * z}px`;
              canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
            },
          });
        } else {
          const pdfjs = await import('pdfjs-dist');
          pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
          const pdf = await pdfjs.getDocument({ data: new Uint8Array(sheet.data.slice(0)) }).promise;
          if (cancelled) return;
          let currentTask: { cancel: () => void; promise: Promise<unknown> } | null = null;
          setSource({
            numPages: pdf.numPages,
            size: async (p) => { const pg = await pdf.getPage(p); const v = pg.getViewport({ scale: 1 }); return { w: v.width, h: v.height }; },
            render: async (p, canvas, z) => {
              const pg = await pdf.getPage(p);
              const dpr = window.devicePixelRatio || 1;
              const vp = pg.getViewport({ scale: z * dpr });
              // one render at a time per canvas: wait for any in-flight render to be cancelled first,
              // otherwise pdf.js refuses the new render and the old (wrong-scale) drawing stays visible
              if (currentTask) {
                try { currentTask.cancel(); } catch { /* already finished */ }
                try { await currentTask.promise; } catch { /* cancelled */ }
              }
              canvas.width = Math.floor(vp.width);
              canvas.height = Math.floor(vp.height);
              canvas.style.width = `${vp.width / dpr}px`;
              canvas.style.height = `${vp.height / dpr}px`;
              const task = pg.render({ canvasContext: canvas.getContext('2d')!, viewport: vp });
              currentTask = task;
              try { await task.promise; }
              catch (e: any) { if (e?.name !== 'RenderingCancelledException') throw e; }
            },
          });
        }
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || 'The file could not be opened');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet?.id, isOpen]);

  // ---- render the current page -------------------------------------------------------------------
  useEffect(() => {
    if (!source || !canvasRef.current) return;
    const token = ++renderTokenRef.current;
    (async () => {
      const sz = await source.size(page);
      if (token !== renderTokenRef.current) return;
      setPageSize(sz);
      // wait one frame so the canvas element has the new size before drawing
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      if (token !== renderTokenRef.current) return;
      try { await source.render(page, canvasRef.current!, zoom); } catch { /* superseded render */ }
    })();
  }, [source, page, zoom]);

  const fitToWidth = useCallback(() => {
    if (!wrapRef.current) return;
    setZoom(Math.max(0.2, Math.min(4, (wrapRef.current.clientWidth - 24) / pageSize.w)));
  }, [pageSize.w]);
  useEffect(() => { if (source) fitToWidth(); /* eslint-disable-next-line */ }, [source]);

  // ---- file handling -----------------------------------------------------------------------------
  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const isPdf = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name);
    const isImg = /^image\//.test(file.type);
    if (!isPdf && !isImg) { flash('Please choose a PDF or an image (PNG / JPG).'); return; }
    const data = await file.arrayBuffer();
    const s: TakeoffSheet = {
      id: uid('sheet'), projectKey, name: file.name, kind: isPdf ? 'pdf' : 'image', data,
      pageScales: {}, outUnit: 'm', measurements: [], updatedAt: Date.now(),
    };
    setSheets((p) => [...p, s]);
    setActiveId(s.id);
    setTool('calibrate');
    flash('Calibrate first: choose a known distance on the drawing (or pick a drawing scale).');
  };

  const removeSheet = async () => {
    if (!sheet || !window.confirm(`Remove "${sheet.name}" and all of its measurements from takeoff? Rows already sent to the MB are not removed.`)) return;
    await deleteSheet(sheet.id);
    setSheets((p) => p.filter((s) => s.id !== sheet.id));
    setActiveId(null);
  };

  // ---- pointer helpers ---------------------------------------------------------------------------
  const toPage = (e: React.MouseEvent): Pt => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: (e.clientX - r.left) / zoom, y: (e.clientY - r.top) / zoom };
  };
  const constrain = (p: Pt, last: Pt | undefined, shift: boolean): Pt => {
    if (!shift || !last) return p;
    return Math.abs(p.x - last.x) > Math.abs(p.y - last.y) ? { x: p.x, y: last.y } : { x: last.x, y: p.y };
  };

  const finishWith = useCallback((pts: Pt[]) => {
    if (!sheet) return;
    if (tool === 'length' && pts.length >= 2 || tool === 'area' && pts.length >= 3 || tool === 'count' && pts.length >= 1) {
      const type = tool as TakeoffToolType;
      const n = sheet.measurements.filter((m) => m.type === type).length + 1;
      const m: TakeoffMeasurement = {
        id: uid('tk'), page, type, points: pts, deduct: deductMode, links: [],
        label: `${type === 'length' ? 'Length' : type === 'area' ? 'Area' : 'Count'} ${n}`,
        itemId: undefined,
      };
      updateSheet((s) => ({ ...s, measurements: [...s.measurements, m] }));
      setSelectedId(m.id);
    }
    setDraft([]);
  }, [sheet, tool, page, deductMode, updateSheet]);
  const finishDraft = useCallback(() => finishWith(draft), [finishWith, draft]);

  const onCanvasClick = (e: React.MouseEvent) => {
    if (!sheet || !source) return;
    const raw = toPage(e);
    if (tool === 'calibrate') {
      const pts = calibPts && calibPts.length === 1 ? [calibPts[0], constrain(raw, calibPts[0], e.shiftKey)] : [raw];
      setCalibPts(pts);
      return;
    }
    if (tool === 'length' || tool === 'area') {
      const p = constrain(raw, draft[draft.length - 1], e.shiftKey);
      setDraft((d) => [...d, p]);
    } else if (tool === 'count') {
      setDraft((d) => [...d, raw]);
    } else {
      setSelectedId(null);
    }
  };

  const onCanvasDouble = () => {
    if (tool === 'length' || tool === 'area') {
      // the two clicks of a double click each added a point; drop the duplicate before finishing
      finishWith(draft.slice(0, -1));
    }
  };

  // ---- keyboard -----------------------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return;
      if (e.key === 'Enter') { e.preventDefault(); finishDraft(); }
      else if (e.key === 'Escape') { if (draft.length || calibPts) { setDraft([]); setCalibPts(null); } else onClose(); }
      else if (e.key === 'Backspace' && draft.length) { e.preventDefault(); setDraft((d) => d.slice(0, -1)); }
      else if (e.key === 'Delete' && selectedId) deleteMeasurement(selectedId);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, draft, calibPts, selectedId, finishDraft]);

  // ---- calibration --------------------------------------------------------------------------------
  const applyCalibration = () => {
    if (!calibPts || calibPts.length < 2) return;
    const real = parseFloat(calibDist);
    const pix = dist(calibPts[0], calibPts[1]);
    if (!(real > 0) || !(pix > 0)) { flash('Enter the real distance between the two points.'); return; }
    const metres = real * (UNIT_TO_M[calibUnit] || 1);
    updateSheet((s) => ({ ...s, pageScales: { ...s.pageScales, [page]: metres / pix } }));
    setCalibPts(null); setCalibDist(''); setTool('select');
    flash(`Page ${page} calibrated. All measurements on this page now use this scale.`);
  };
  const applyPreset = () => {
    // 1 PDF point = 1/72 inch on paper. Valid for vector PDFs printed / plotted at 100%.
    const metresPerPoint = (0.0254 / 72) * presetScale;
    updateSheet((s) => ({ ...s, pageScales: { ...s.pageScales, [page]: metresPerPoint } }));
    flash(`Scale 1:${presetScale} applied to page ${page} (assumes the sheet is at 100% paper size).`);
  };

  // ---- measurement list actions ------------------------------------------------------------------
  const patchMeasurement = (id: string, patch: Partial<TakeoffMeasurement>) =>
    updateSheet((s) => ({ ...s, measurements: s.measurements.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  const deleteMeasurement = (id: string) => {
    updateSheet((s) => ({ ...s, measurements: s.measurements.filter((m) => m.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  };

  const valueOf = (m: TakeoffMeasurement) => {
    const v = measurementValue(m, sheet?.pageScales[m.page], out);
    return v;
  };
  const fmt = (v: number | null, m: TakeoffMeasurement) =>
    v === null ? 'calibrate' : `${v.toFixed(m.type === 'count' ? 0 : 3)} ${m.type === 'count' ? 'nos' : m.type === 'length' ? lenU : areaU}`;

  const sendMeasurement = (m: TakeoffMeasurement) => {
    const v = valueOf(m);
    if (v === null || !sheet) { flash('Calibrate this page before sending.'); return; }
    if (!m.itemId) { flash('Choose the BOQ item first.'); return; }
    const spec = toRowSpec(m, v, sheet.name, uid(mode === 'estimate' ? 'mb_row' : 'vmb_row'));
    onApplyRow(m.itemId, spec);
    patchMeasurement(m.id, { links: [...m.links, { itemId: m.itemId, rowId: spec.id }] });
    flash(`"${m.label}" added to the ${mode === 'estimate' ? 'Estimate' : 'Valuation'} MB.`);
  };
  const syncMeasurement = (m: TakeoffMeasurement) => {
    const v = valueOf(m);
    if (v === null || !sheet) return;
    m.links.forEach((l) => onSyncRow(l.itemId, toRowSpec(m, v, sheet.name, l.rowId)));
    flash(`Updated ${m.links.length} linked row(s).`);
  };
  const pending = sheet ? sheet.measurements.filter((m) => m.itemId && m.links.length === 0 && valueOf(m) !== null) : [];

  // totals per item
  const totalsByItem = useMemo(() => {
    const t: Record<string, number> = {};
    (sheet?.measurements || []).forEach((m) => {
      if (!m.itemId) return;
      const v = measurementValue(m, sheet?.pageScales[m.page], out);
      if (v === null) return;
      t[m.itemId] = (t[m.itemId] || 0) + (m.deduct ? -v : v);
    });
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, out]);

  if (!isOpen) return null;

  const colorOf = (i: number) => COLORS[i % COLORS.length];
  const toolBtn = (t: Tool, label: string, icon: React.ReactNode, hint: string) => (
    <button
      key={t}
      onClick={() => { setTool(t); setDraft([]); setCalibPts(null); }}
      title={hint}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
        tool === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
      }`}
    >
      {icon}{label}
    </button>
  );
  const hint =
    !sheet ? 'Open a PDF or image drawing to begin.'
    : tool === 'calibrate' ? (calibPts?.length === 2 ? 'Enter the real distance below, then Apply.' : 'Click the two end points of a dimension you know (hold Shift for a straight line).')
    : tool === 'length' ? 'Click along the path. Double-click or Enter to finish. Backspace removes the last point. Shift = straight line.'
    : tool === 'area' ? 'Click the corners. Double-click or Enter to close the area. Backspace removes the last point.'
    : tool === 'count' ? 'Click each object to count. Enter to finish the group.'
    : 'Select a measurement on the drawing or in the list.';

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/70 flex items-center justify-center p-2" data-testid="takeoff-modal">
      <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-[1800px] flex flex-col overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-slate-50">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-blue-600" />
            <div>
              <div className="font-bold text-slate-900 text-sm">PDF / Drawing Takeoff <span className="ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">{mode === 'estimate' ? 'Estimate MB' : 'Valuation MB'}</span></div>
              <div className="text-[11px] text-slate-500">Measure on the drawing, assign to a BOQ item, send to the MB.</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-slate-200" title="Close (Esc)"><X className="w-5 h-5" /></button>
        </div>

        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b bg-white">
          <input ref={fileRef} type="file" accept=".pdf,application/pdf,image/png,image/jpeg" className="hidden" data-testid="takeoff-file"
            onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-700">
            <Upload className="w-4 h-4" /> Open PDF / Image
          </button>
          {sheets.length > 0 && (
            <select value={activeId || ''} onChange={(e) => setActiveId(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold max-w-[220px]">
              {sheets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          {sheet && (
            <>
              <span className="w-px h-6 bg-slate-200" />
              {toolBtn('select', 'Select', <MousePointer2 className="w-4 h-4" />, 'Select / inspect measurements')}
              {toolBtn('calibrate', 'Calibrate', <Crosshair className="w-4 h-4" />, 'Set the drawing scale from a known distance')}
              {toolBtn('length', 'Length', <Ruler className="w-4 h-4" />, 'Measure a length / polyline')}
              {toolBtn('area', 'Area', <Hexagon className="w-4 h-4" />, 'Measure an area / polygon')}
              {toolBtn('count', 'Count', <Hash className="w-4 h-4" />, 'Count objects')}
              <label className="flex items-center gap-1 text-xs font-semibold text-red-700 ml-1 cursor-pointer">
                <input type="checkbox" checked={deductMode} onChange={(e) => setDeductMode(e.target.checked)} /> Deduct (−)
              </label>
              <span className="w-px h-6 bg-slate-200" />
              <button onClick={() => setZoom((z) => Math.max(0.2, z / 1.25))} className="p-1.5 border rounded-lg hover:bg-slate-50" title="Zoom out"><ZoomOut className="w-4 h-4" /></button>
              <span className="text-xs font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.min(6, z * 1.25))} className="p-1.5 border rounded-lg hover:bg-slate-50" title="Zoom in"><ZoomIn className="w-4 h-4" /></button>
              <button onClick={fitToWidth} className="p-1.5 border rounded-lg hover:bg-slate-50" title="Fit to width"><Maximize className="w-4 h-4" /></button>
              {source && source.numPages > 1 && (
                <>
                  <span className="w-px h-6 bg-slate-200" />
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 border rounded-lg disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-xs font-mono">Page {page} / {source.numPages}</span>
                  <button disabled={page >= source.numPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 border rounded-lg disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                </>
              )}
              <span className="w-px h-6 bg-slate-200" />
              <select value={out} onChange={(e) => updateSheet((s) => ({ ...s, outUnit: e.target.value as 'm' | 'ft' }))} className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold" title="Output units">
                <option value="m">Metric (m, m²)</option>
                <option value="ft">Imperial (ft, ft²)</option>
              </select>
            </>
          )}
        </div>

        {/* calibration strip */}
        {sheet && (tool === 'calibrate' || !mpp) && (
          <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 bg-amber-50 border-b border-amber-200 text-xs">
            <b className="text-amber-800">Scale of page {page}:</b>
            {mpp ? <span className="font-mono text-emerald-700">calibrated ({(mpp * 1000).toFixed(3)} mm per drawing unit)</span> : <span className="text-red-700 font-semibold">not calibrated</span>}
            <span className="text-slate-400">|</span>
            <span>Known distance:</span>
            <input data-testid="calib-dist" value={calibDist} onChange={(e) => setCalibDist(e.target.value)} placeholder="e.g. 10" className="w-20 border rounded px-1.5 py-0.5 font-mono" />
            <select value={calibUnit} onChange={(e) => setCalibUnit(e.target.value)} className="border rounded px-1 py-0.5">
              {Object.keys(UNIT_TO_M).map((u) => <option key={u}>{u}</option>)}
            </select>
            <button data-testid="calib-apply" disabled={!calibPts || calibPts.length < 2} onClick={applyCalibration} className="px-2 py-0.5 rounded bg-amber-600 text-white font-bold disabled:opacity-40">Apply from 2 clicked points</button>
            {sheet.kind === 'pdf' && (
              <>
                <span className="text-slate-400">or drawing scale 1:</span>
                <select value={presetScale} onChange={(e) => setPresetScale(Number(e.target.value))} className="border rounded px-1 py-0.5">
                  {PRESET_SCALES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={applyPreset} className="px-2 py-0.5 rounded border border-amber-600 text-amber-800 font-bold" title="Only valid for vector PDFs at 100% paper size. Verify with a known dimension.">Apply</button>
              </>
            )}
          </div>
        )}

        {/* body */}
        <div className="flex-1 flex min-h-0">
          <div ref={wrapRef} className="flex-1 overflow-auto bg-slate-300 p-3 relative" data-testid="takeoff-scroll">
            {!sheet && (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-3">
                <Upload className="w-10 h-10 text-slate-400" />
                <div className="font-semibold">Open a PDF or image drawing to start measuring</div>
                <div className="text-xs text-slate-500 max-w-md text-center">Files stay in your browser (IndexedDB). Nothing is uploaded. Scanned drawings work too; calibrate the scale from a known dimension first.</div>
                <button onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold">Choose file</button>
              </div>
            )}
            {loadError && <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">{loadError}</div>}
            {sheet && source && (
              <div className="relative mx-auto bg-white shadow-lg" style={{ width: pageSize.w * zoom, height: pageSize.h * zoom }}>
                <canvas ref={canvasRef} className="absolute inset-0" data-testid="takeoff-canvas" />
                <svg
                  data-testid="takeoff-overlay"
                  className="absolute inset-0"
                  width={pageSize.w * zoom} height={pageSize.h * zoom}
                  viewBox={`0 0 ${pageSize.w} ${pageSize.h}`}
                  style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
                  onClick={onCanvasClick}
                  onDoubleClick={onCanvasDouble}
                  onMouseMove={(e) => setCursor(toPage(e))}
                  onMouseLeave={() => setCursor(null)}
                >
                  {pageMeasurements.map((m, i) => {
                    const c = m.deduct ? '#dc2626' : colorOf(sheet.measurements.indexOf(m));
                    const sel = m.id === selectedId;
                    const v = valueOf(m);
                    const lab = `${m.label}: ${fmt(v, m)}`;
                    const cen = centroid(m.points);
                    const sw = (sel ? 3 : 2) / zoom;
                    return (
                      <g key={m.id} onClick={(e) => { if (tool === 'select') { e.stopPropagation(); setSelectedId(m.id); } }} style={{ cursor: tool === 'select' ? 'pointer' : undefined }}>
                        {m.type === 'area' && <polygon points={m.points.map((p) => `${p.x},${p.y}`).join(' ')} fill={c} fillOpacity={0.18} stroke={c} strokeWidth={sw} strokeDasharray={m.deduct ? `${6 / zoom}` : undefined} />}
                        {m.type === 'length' && <polyline points={m.points.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={c} strokeWidth={sw} strokeDasharray={m.deduct ? `${6 / zoom}` : undefined} />}
                        {m.type !== 'count' && m.points.map((p, k) => <circle key={k} cx={p.x} cy={p.y} r={3 / zoom} fill={c} />)}
                        {m.type === 'count' && m.points.map((p, k) => (
                          <g key={k}><circle cx={p.x} cy={p.y} r={7 / zoom} fill={c} fillOpacity={0.85} /><text x={p.x} y={p.y + 3 / zoom} fontSize={9 / zoom} textAnchor="middle" fill="#fff" fontWeight="bold">{k + 1}</text></g>
                        ))}
                        <text x={cen.x} y={cen.y - 6 / zoom} fontSize={11 / zoom} textAnchor="middle" fill={c} fontWeight="bold" stroke="#fff" strokeWidth={3 / zoom} paintOrder="stroke">{lab}</text>
                      </g>
                    );
                  })}
                  {/* draft */}
                  {draft.length > 0 && (tool === 'length' || tool === 'area') && (
                    <g>
                      <polyline points={[...draft, ...(cursor ? [cursor] : [])].map((p) => `${p.x},${p.y}`).join(' ')} fill={tool === 'area' ? '#2563eb22' : 'none'} stroke="#2563eb" strokeWidth={2 / zoom} strokeDasharray={`${5 / zoom}`} />
                      {draft.map((p, k) => <circle key={k} cx={p.x} cy={p.y} r={3.5 / zoom} fill="#2563eb" />)}
                      {mpp && cursor && (
                        <text x={cursor.x + 8 / zoom} y={cursor.y - 8 / zoom} fontSize={11 / zoom} fill="#1d4ed8" fontWeight="bold" stroke="#fff" strokeWidth={3 / zoom} paintOrder="stroke">
                          {tool === 'length'
                            ? `${((polylineLength([...draft, cursor]) * mpp) * (out === 'ft' ? 3.28084 : 1)).toFixed(2)} ${lenU}`
                            : `${((polygonArea([...draft, cursor]) * mpp * mpp) * (out === 'ft' ? 10.7639 : 1)).toFixed(2)} ${areaU}`}
                        </text>
                      )}
                    </g>
                  )}
                  {draft.length > 0 && tool === 'count' && draft.map((p, k) => (
                    <g key={k}><circle cx={p.x} cy={p.y} r={7 / zoom} fill="#2563eb" fillOpacity={0.85} /><text x={p.x} y={p.y + 3 / zoom} fontSize={9 / zoom} textAnchor="middle" fill="#fff" fontWeight="bold">{k + 1}</text></g>
                  ))}
                  {calibPts && calibPts.map((p, k) => <circle key={k} cx={p.x} cy={p.y} r={5 / zoom} fill="#d97706" />)}
                  {calibPts && calibPts.length === 2 && <line x1={calibPts[0].x} y1={calibPts[0].y} x2={calibPts[1].x} y2={calibPts[1].y} stroke="#d97706" strokeWidth={2 / zoom} />}
                </svg>
              </div>
            )}
          </div>

          {/* right panel */}
          <div className="w-[400px] shrink-0 border-l bg-white flex flex-col min-h-0">
            <div className="px-3 py-2 border-b flex items-center justify-between">
              <div className="font-bold text-sm text-slate-800">Measurements ({sheet?.measurements.length || 0})</div>
              <div className="flex gap-1.5">
                {pending.length > 0 && (
                  <button data-testid="send-all" onClick={() => pending.forEach(sendMeasurement)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold">
                    <Send className="w-3.5 h-3.5" /> Send {pending.length} to MB
                  </button>
                )}
                {sheet && <button onClick={removeSheet} className="p-1.5 rounded-lg border text-red-600 hover:bg-red-50" title="Remove this drawing from takeoff"><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2" data-testid="takeoff-list">
              {sheet && sheet.measurements.length === 0 && <div className="text-xs text-slate-500 p-3">No measurements yet. Calibrate the scale, pick the Length, Area or Count tool and click on the drawing.</div>}
              {sheet?.measurements.map((m, idx) => {
                const v = valueOf(m);
                const item = items.find((i) => i.id === m.itemId);
                const sel = m.id === selectedId;
                return (
                  <div key={m.id} onClick={() => { setSelectedId(m.id); if (m.page !== page) setPage(m.page); }} className={`rounded-xl border p-2 text-xs space-y-1.5 cursor-pointer ${sel ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`} data-testid="takeoff-row">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.deduct ? '#dc2626' : colorOf(idx) }} />
                      <input value={m.label} onChange={(e) => patchMeasurement(m.id, { label: e.target.value })} onClick={(e) => e.stopPropagation()} className="flex-1 min-w-0 border border-slate-200 rounded px-1.5 py-0.5 font-semibold" />
                      <span className="font-mono font-bold text-slate-800 whitespace-nowrap" data-testid="takeoff-value">{m.deduct ? '−' : ''}{fmt(v, m)}</span>
                      <button onClick={(e) => { e.stopPropagation(); deleteMeasurement(m.id); }} className="text-slate-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <select data-testid="takeoff-item" value={m.itemId || ''} onChange={(e) => patchMeasurement(m.id, { itemId: e.target.value || undefined })} className="flex-1 min-w-0 border border-slate-200 rounded px-1 py-1">
                        <option value="">Assign to BOQ item…</option>
                        {items.map((i) => <option key={i.id} value={i.id}>{i.code} · {i.description.slice(0, 40)} ({i.unit})</option>)}
                      </select>
                      <label className="flex items-center gap-1 text-red-700 whitespace-nowrap"><input type="checkbox" checked={m.deduct} onChange={(e) => patchMeasurement(m.id, { deduct: e.target.checked })} />Ded.</label>
                    </div>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {m.type !== 'area' && (
                        <label className="flex items-center gap-1">B <input type="number" step="any" value={m.b ?? ''} placeholder="1" onChange={(e) => patchMeasurement(m.id, { b: e.target.value === '' ? undefined : Number(e.target.value) })} className="w-14 border border-slate-200 rounded px-1 py-0.5 font-mono" /></label>
                      )}
                      <label className="flex items-center gap-1">{m.type === 'area' ? 'H / thickness' : 'H'} <input type="number" step="any" value={m.h ?? ''} placeholder="1" onChange={(e) => patchMeasurement(m.id, { h: e.target.value === '' ? undefined : Number(e.target.value) })} className="w-14 border border-slate-200 rounded px-1 py-0.5 font-mono" /></label>
                      <span className="flex-1" />
                      {m.links.length > 0 && (
                        <button onClick={() => syncMeasurement(m)} className="flex items-center gap-1 px-2 py-1 rounded-lg border border-indigo-300 text-indigo-700 font-bold" title="Push the current value to the MB rows created from this measurement"><RefreshCw className="w-3 h-3" /> Update {m.links.length}</button>
                      )}
                      <button data-testid="takeoff-send" onClick={() => sendMeasurement(m)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 text-white font-bold"><Send className="w-3 h-3" /> {m.links.length ? 'Add again' : 'Send to MB'}</button>
                    </div>
                    {item && v !== null && <div className="text-[10px] text-slate-500">Item unit: <b>{item.unit}</b>{m.links.length > 0 && <span className="ml-2 text-emerald-700 font-bold">✓ in MB ({m.links.length})</span>}</div>}
                  </div>
                );
              })}
            </div>
            {Object.keys(totalsByItem).length > 0 && (
              <div className="border-t p-2 bg-slate-50 max-h-40 overflow-y-auto">
                <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Takeoff totals by item</div>
                {Object.entries(totalsByItem).map(([id, t]) => {
                  const it = items.find((i) => i.id === id);
                  return <div key={id} className="flex justify-between text-xs"><span className="truncate pr-2">{it?.code} {it?.description.slice(0, 28)}</span><span className="font-mono font-bold">{t.toFixed(3)} {it?.unit}</span></div>;
                })}
              </div>
            )}
          </div>
        </div>

        {/* status bar */}
        <div className="px-3 py-1.5 border-t bg-slate-50 text-[11px] text-slate-600 flex items-center justify-between">
          <span>{message || hint}</span>
          <span className="font-mono">{cursor ? `x ${cursor.x.toFixed(0)}  y ${cursor.y.toFixed(0)}` : ''}</span>
        </div>
      </div>
    </div>
  );
};
