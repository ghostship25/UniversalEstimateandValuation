import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Upload, Ruler, Hexagon, Hash, MousePointer2, Crosshair, ZoomIn, ZoomOut, Trash2, Send,
  ChevronLeft, ChevronRight, RefreshCw, Maximize, Hand, MousePointerClick, Triangle, ChevronDown, ChevronUp,
} from 'lucide-react';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  Pt, ScaleInfo, TakeoffMeasurement, TakeoffSheet, Shape, SendAs, MBRowSpec,
  deleteSheet, dist, listSheets, saveSheet,
} from './takeoffStore';
import {
  SHAPES, LENGTH_SHAPES, AREA_SHAPES, geometryOf, quantOf, buildRow, formatValue, sendOptions, shapeOf, M_TO_FT, Quant,
} from './takeoffGeometry';
import { DxfModel, parseDxf } from './dxfModel';
import { DxfViewer, DxfView } from './DxfViewer';
import { CadPanel, CadAdd } from './CadPanel';
import { ScalePanel, ScaleScope, scopePages } from './ScalePanel';
import { LayersPanel, LayerRow } from './LayersPanel';
import { exportCsv, exportEvidencePng } from './evidence';

export interface TakeoffItem { id: string; code: string; description: string; unit: string }

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: 'estimate' | 'valuation';
  projectKey: string;
  items: TakeoffItem[];
  onApplyRow: (itemId: string, spec: MBRowSpec) => void;
  onSyncRow: (itemId: string, spec: MBRowSpec) => void;
}

type Tool = 'select' | 'pan' | 'pick' | 'calibrate' | Shape;
const PALETTE = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#0d9488', '#db2777', '#65a30d', '#0891b2', '#ea580c', '#4f46e5', '#be185d', '#0f766e'];
const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
const isShapeTool = (t: Tool): t is Shape => t in SHAPES && t !== 'cad';

/** dimensionality an item's unit expects: 0 count, 1 length, 2 area, 3 volume (null = unknown, e.g. kg, ls) */
function unitDim(unit: string): number | null {
  const u = unit.toLowerCase().replace(/[\s.\/]/g, '');
  if (/^(sqm|m2|sqft|ft2|sqmtr|sqyd|sqmt)$/.test(u)) return 2;
  if (/^(cum|m3|cuft|ft3|cumtr|cuyd|cumt)$/.test(u)) return 3;
  if (/^(rm|rmt|m|mtr|lm|ft|rft|rmtr|km|lin?m|runningmeter|meter|metre)$/.test(u)) return 1;
  if (/^(nos?|nr|each|ea|pcs?|set|sets|point|points)$/.test(u)) return 0;
  return null;
}
/** dimensionality of what a measurement would write into the MB */
function rowDim(m: TakeoffMeasurement, q: Quant): number {
  const b = m.b !== undefined && m.b !== 1 ? 1 : 0, h = m.h !== undefined && m.h !== 1 ? 1 : 0;
  if (q.family === 'count') return 0 + b + h;
  if (q.family === 'length') return 1 + b + h;
  const s = m.sendAs || 'value';
  if (s === 'perimeter') return 1 + b + h;
  if (s === 'LxB' || s === 'BxL') return 2 + h;
  if (s === 'LxH') return 2 + b;
  return 2 + h;
}

interface PageSource {
  numPages: number;
  size: (page: number) => Promise<{ w: number; h: number }>;
  render: (page: number, canvas: HTMLCanvasElement, zoom: number) => Promise<void>;
}

export const TakeoffModal: React.FC<Props> = ({ isOpen, onClose, mode, projectKey, items, onApplyRow, onSyncRow }) => {
  const [sheets, setSheets] = useState<TakeoffSheet[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<DxfView>({ z: 1, ox: 0, oy: 0 });
  const [tool, setTool] = useState<Tool>('select');
  const [lastLen, setLastLen] = useState<Shape>('polyline');
  const [lastArea, setLastArea] = useState<Shape>('polygon');
  const [draft, setDraft] = useState<Pt[]>([]);
  const [cursor, setCursor] = useState<Pt | null>(null);
  const [pageSize, setPageSize] = useState<{ w: number; h: number }>({ w: 612, h: 792 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [calibPts, setCalibPts] = useState<Pt[] | null>(null);
  const [scaleOpen, setScaleOpen] = useState(true);
  const [deductMode, setDeductMode] = useState(false);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [source, setSource] = useState<PageSource | null>(null);
  const [cad, setCad] = useState<DxfModel | null>(null);
  const [hiddenCad, setHiddenCad] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [exporting, setExporting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfSvgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const renderTokenRef = useRef(0);
  const saveTimer = useRef<number | null>(null);
  const cadCache = useRef(new Map<string, DxfModel>());
  const dragPts = useRef<Pt[] | null>(null);
  const suppressClick = useRef(false);
  const userZoomed = useRef(false);

  const sheet = useMemo(() => sheets.find((s) => s.id === activeId) || null, [sheets, activeId]);
  const kind = sheet?.kind;
  const isCad = kind === 'dxf';
  const numPages = isCad || kind === 'image' ? 1 : source?.numPages || 1;
  const mpp = sheet?.pageScales[page];
  const scaleInfo = sheet?.scaleInfo?.[page];
  const out = sheet?.outUnit || 'm';
  const lenU = out === 'ft' ? 'ft' : 'm';
  const pageMeasurements = useMemo(() => (sheet ? sheet.measurements.filter((m) => m.page === page) : []), [sheet, page]);
  const flash = (m: string) => { setMessage(m); window.setTimeout(() => setMessage(''), 4200); };
  const pagesWithScale = useMemo(() => Object.keys(sheet?.pageScales || {}).map(Number).filter((p) => p >= 1 && p <= numPages).sort((a, b) => a - b), [sheet, numPages]);

  // ---- load / persist ----------------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    listSheets(projectKey).then((list) => {
      if (!alive) return;
      setSheets(list);
      setActiveId((cur) => (cur && list.some((s) => s.id === cur) ? cur : list[0]?.id || null));
    });
    return () => { alive = false; };
  }, [isOpen, projectKey]);

  const updateSheet = useCallback((fn: (s: TakeoffSheet) => TakeoffSheet) => {
    setSheets((prev) => prev.map((s) => (s.id === activeId ? fn(s) : s)));
  }, [activeId]);

  useEffect(() => {
    if (!sheet) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => { saveSheet(sheet); }, 500);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [sheet]);

  // ---- build the viewer source -------------------------------------------------------------------
  const fitCad = useCallback((m: DxfModel | null) => {
    const el = wrapRef.current;
    if (!m || !el) return;
    const W = el.clientWidth, H = el.clientHeight;
    const z = Math.max(1e-6, Math.min((W - 40) / m.extents.w, (H - 40) / m.extents.h));
    setView({ z, ox: (W - m.extents.w * z) / 2, oy: (H - m.extents.h * z) / 2 });
  }, []);

  useEffect(() => {
    setSource(null); setCad(null); setLoadError(''); setPage(1); setDraft([]); setSelectedId(null); setCalibPts(null); setPicked(new Set()); setHiddenCad(new Set());
    if (!sheet || !isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        if (sheet.kind === 'dxf') {
          let m = cadCache.current.get(sheet.id);
          if (!m) { m = parseDxf(new TextDecoder('utf-8').decode(sheet.data)); cadCache.current.set(sheet.id, m); }
          if (cancelled) return;
          setCad(m);
          window.setTimeout(() => fitCad(m!), 30);
        } else if (sheet.kind === 'image') {
          const url = URL.createObjectURL(new Blob([sheet.data]));
          const img = new Image();
          await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('Image could not be read')); img.src = url; });
          if (cancelled) return;
          setSource({
            numPages: 1,
            size: async () => ({ w: img.naturalWidth, h: img.naturalHeight }),
            render: async (_p, canvas, z) => {
              const dpr = window.devicePixelRatio || 1;
              canvas.width = Math.floor(img.naturalWidth * z * dpr); canvas.height = Math.floor(img.naturalHeight * z * dpr);
              canvas.style.width = `${img.naturalWidth * z}px`; canvas.style.height = `${img.naturalHeight * z}px`;
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
              // one render at a time per canvas, otherwise pdf.js refuses the new render and a wrong-scale drawing stays
              if (currentTask) {
                try { currentTask.cancel(); } catch { /* finished */ }
                try { await currentTask.promise; } catch { /* cancelled */ }
              }
              canvas.width = Math.floor(vp.width); canvas.height = Math.floor(vp.height);
              canvas.style.width = `${vp.width / dpr}px`; canvas.style.height = `${vp.height / dpr}px`;
              const task = pg.render({ canvasContext: canvas.getContext('2d')!, viewport: vp });
              currentTask = task;
              try { await task.promise; } catch (e: any) { if (e?.name !== 'RenderingCancelledException') throw e; }
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

  useEffect(() => {
    if (!source || !canvasRef.current) return;
    const token = ++renderTokenRef.current;
    (async () => {
      const sz = await source.size(page);
      if (token !== renderTokenRef.current) return;
      setPageSize(sz);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      if (token !== renderTokenRef.current) return;
      try { await source.render(page, canvasRef.current!, zoom); } catch { /* superseded */ }
    })();
  }, [source, page, zoom]);

  const fitToWidth = useCallback(() => {
    if (isCad) { fitCad(cad); return; }
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    setZoom(Math.max(0.2, Math.min(4, (el.clientWidth - 24) / pageSize.w, (el.clientHeight - 24) / pageSize.h)));
  }, [isCad, cad, fitCad, pageSize.w, pageSize.h]);
  const shapeBarVisible = isShapeTool(tool) && (LENGTH_SHAPES.includes(tool) || AREA_SHAPES.includes(tool));
  useEffect(() => { userZoomed.current = false; if (source) fitToWidth(); /* eslint-disable-next-line */ }, [source]);
  useEffect(() => {
    if (userZoomed.current) return;
    const id = window.setTimeout(() => fitToWidth(), 60);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scaleOpen, shapeBarVisible]);

  // ---- files -------------------------------------------------------------------------------------
  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const isPdf = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name);
    const isDxf = /\.dxf$/i.test(file.name);
    const isImg = /^image\//.test(file.type);
    if (/\.dwg$/i.test(file.name)) { flash('DWG cannot be read in the browser. Save or convert it as an ASCII DXF (e.g. with the free ODA File Converter) and open that.'); return; }
    if (!isPdf && !isImg && !isDxf) { flash('Please choose a PDF, a DXF (CAD) or an image (PNG / JPG).'); return; }
    const data = await file.arrayBuffer();
    const s: TakeoffSheet = {
      id: uid('sheet'), projectKey, name: file.name, kind: isDxf ? 'dxf' : isPdf ? 'pdf' : 'image', data,
      pageScales: {}, scaleInfo: {}, layers: {}, outUnit: 'm', measurements: [], updatedAt: Date.now(),
    };
    if (isDxf) {
      try {
        const m = parseDxf(new TextDecoder('utf-8').decode(data));
        cadCache.current.set(s.id, m);
        if (m.metersPerUnit) {
          s.pageScales = { 1: m.metersPerUnit };
          s.scaleInfo = { 1: { method: 'file', label: `1 unit = 1 ${m.unitName} (from the file)` } };
        }
      } catch (e: any) { flash(e?.message || 'The DXF could not be read.'); return; }
    }
    setSheets((p) => [...p, s]);
    setActiveId(s.id);
    setTool(isDxf ? 'pan' : 'select');
    setScaleOpen(!(isDxf && s.pageScales[1]));
    flash(isDxf ? (s.pageScales[1] ? `DXF opened. Units read from the file: ${s.scaleInfo?.[1]?.label.replace(' (from the file)', '')}. Confirm with the Scale chip if values look wrong.` : 'DXF opened but the file has no units. Choose the drawing units in the Scale section.') : 'Set the scale first: measure a known distance on the drawing, or pick its printed scale.');
  };

  const removeSheet = async () => {
    if (!sheet || !window.confirm(`Remove "${sheet.name}" and all of its measurements from takeoff? Rows already sent to the MB are not removed.`)) return;
    await deleteSheet(sheet.id);
    setSheets((p) => p.filter((s) => s.id !== sheet.id));
    setActiveId(null);
  };

  // ---- layers ------------------------------------------------------------------------------------
  const layerKey = (m: TakeoffMeasurement) => m.itemId || '_none';
  const withLayer = (s: TakeoffSheet, key: string): TakeoffSheet => {
    const layers = s.layers || {};
    if (layers[key]) return s;
    const color = key === '_none' ? '#64748b' : PALETTE[Object.keys(layers).filter((k) => k !== '_none').length % PALETTE.length];
    return { ...s, layers: { ...layers, [key]: { color, visible: true } } };
  };
  const layerColor = (m: TakeoffMeasurement) => sheet?.layers?.[layerKey(m)]?.color || '#2563eb';
  const layerVisible = (m: TakeoffMeasurement) => sheet?.layers?.[layerKey(m)]?.visible !== false;

  const patchMeasurement = (id: string, patch: Partial<TakeoffMeasurement>) =>
    updateSheet((s) => {
      const next = { ...s, measurements: s.measurements.map((m) => (m.id === id ? { ...m, ...patch } : m)) };
      return 'itemId' in patch ? withLayer(next, patch.itemId || '_none') : next;
    });
  const deleteMeasurement = (id: string) => {
    updateSheet((s) => ({ ...s, measurements: s.measurements.filter((m) => m.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  };

  const addMeasurement = (m: TakeoffMeasurement) => {
    updateSheet((s) => withLayer({ ...s, measurements: [...s.measurements, m] }, layerKey(m)));
    setSelectedId(m.id);
  };

  const finishWith = useCallback((pts: Pt[], shape: Shape) => {
    if (!sheet) return;
    const info = SHAPES[shape];
    if (pts.length < info.minPoints) { setDraft([]); return; }
    const n = sheet.measurements.filter((x) => shapeOf(x) === shape).length + 1;
    addMeasurement({
      id: uid('tk'), page, type: info.family, shape, label: `${info.label} ${n}`, points: pts, deduct: deductMode, links: [],
      sendAs: shape === 'rect' || shape === 'rrect' ? 'LxB' : 'value',
    });
    setDraft([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, page, deductMode, updateSheet]);

  const addCadMeasurement = (a: CadAdd) => {
    addMeasurement({
      id: uid('tk'), page: 1, type: a.type, shape: 'cad', label: a.label, points: [], raw: a.raw, entityIds: a.entityIds,
      layer: a.layer, blockName: a.blockName, deduct: deductMode, links: [],
    });
    setPicked(new Set());
    flash(`"${a.label}" added. Assign it to a BOQ item in the list.`);
  };

  // ---- scale -------------------------------------------------------------------------------------
  const applyScale = (m: number, info: ScaleInfo, scope: ScaleScope, ref?: { a: Pt; b: Pt }) => {
    if (!sheet) return;
    const pages = scopePages(scope, page, numPages);
    if (!pages.length) { flash('No pages selected.'); return; }
    const affected = sheet.measurements.filter((x) => pages.includes(x.page) && (x.type === 'length' || x.type === 'area') && sheet.pageScales[x.page] && Math.abs(sheet.pageScales[x.page] - m) > 1e-12);
    if (affected.length && !window.confirm(`${affected.length} existing measurement(s) on the selected page(s) will be recalculated with the new scale. Continue?`)) return;
    updateSheet((s) => {
      const pageScales = { ...s.pageScales }, scaleInfo = { ...(s.scaleInfo || {}) };
      pages.forEach((p) => {
        pageScales[p] = m;
        scaleInfo[p] = p === page
          ? { ...info, ref: ref ? { a: ref.a, b: ref.b, text: info.label } : undefined }
          : { ...info, label: `${info.label} · set from page ${page}` };
      });
      return { ...s, pageScales, scaleInfo };
    });
    setCalibPts(null); setTool(isCad ? 'pan' : 'select');
    setScaleOpen(false); // scale is set: give the drawing the room back (reopen from the Scale chip)
    const linked = affected.filter((x) => x.links.length).length;
    flash(`Scale applied to ${pages.length === 1 ? `page ${pages[0]}` : `${pages.length} pages (${pages.join(', ')})`}.${linked ? ` ${linked} measurement(s) already sent to the MB: press Update to push the new values.` : ''}`);
  };
  const clearScale = (scope: ScaleScope) => {
    if (!sheet) return;
    const pages = scopePages(scope, page, numPages);
    updateSheet((s) => {
      const pageScales = { ...s.pageScales }, scaleInfo = { ...(s.scaleInfo || {}) };
      pages.forEach((p) => { delete pageScales[p]; delete scaleInfo[p]; });
      return { ...s, pageScales, scaleInfo };
    });
    setScaleOpen(true);
    flash(`Scale removed from ${pages.length === 1 ? `page ${pages[0]}` : `${pages.length} pages`}.`);
  };

  const setToolSafe = (t: Tool) => {
    if (isShapeTool(t)) {
      const fam = SHAPES[t].family;
      if ((fam === 'length' || fam === 'area') && !mpp) { flash('Set the scale first (Drawing scale section).'); setScaleOpen(true); return; }
      if (fam === 'length') setLastLen(t); else if (fam === 'area') setLastArea(t);
    }
    setTool(t); setDraft([]); if (t === 'calibrate') { setCalibPts(null); setScaleOpen(true); }
  };

  // ---- pointer logic (shared by PDF/image overlay and CAD viewer) --------------------------------
  const constrain = (p: Pt, last: Pt | undefined, shift: boolean): Pt => {
    if (!shift || !last) return p;
    return Math.abs(p.x - last.x) > Math.abs(p.y - last.y) ? { x: p.x, y: last.y } : { x: last.x, y: p.y };
  };
  const handlePoint = (raw: Pt, shift: boolean) => {
    if (!sheet) return;
    if (tool === 'calibrate') {
      if (!calibPts || calibPts.length >= 2) setCalibPts([raw]);
      else { setCalibPts([calibPts[0], constrain(raw, calibPts[0], shift)]); setTool(isCad ? 'pan' : 'select'); }
      return;
    }
    if (isShapeTool(tool)) {
      const info = SHAPES[tool];
      if (info.drag) return;
      const last = draft[draft.length - 1];
      const p = tool === 'line' || tool === 'polyline' ? constrain(raw, last, shift) : raw;
      const next = [...draft, p];
      if (info.autoPoints && next.length >= info.autoPoints) finishWith(next, tool);
      else setDraft(next);
    } else if (tool === 'select') setSelectedId(null);
  };
  const handleDouble = () => {
    if (isShapeTool(tool) && !SHAPES[tool].autoPoints && !SHAPES[tool].drag) finishWith(draft.slice(0, -1), tool);
  };
  const dragStart = (p: Pt) => { dragPts.current = [p]; setDraft([p]); };
  const dragMove = (p: Pt, z: number) => {
    const pts = dragPts.current; if (!pts) return;
    if (dist(pts[pts.length - 1], p) >= 3 / z) { pts.push(p); setDraft([...pts]); }
  };
  const dragEnd = () => {
    const pts = dragPts.current; dragPts.current = null;
    if (pts && isShapeTool(tool)) finishWith(pts, tool);
    suppressClick.current = true; window.setTimeout(() => { suppressClick.current = false; }, 80);
  };
  const toPagePdf = (e: React.MouseEvent): Pt => {
    const r = (e.currentTarget as Element).getBoundingClientRect();
    return { x: (e.clientX - r.left) / zoom, y: (e.clientY - r.top) / zoom };
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return;
      if (e.key === 'Enter') { e.preventDefault(); if (isShapeTool(tool) && !SHAPES[tool].autoPoints) finishWith(draft, tool); }
      else if (e.key === 'Escape') { if (draft.length || calibPts) { setDraft([]); setCalibPts(null); } else onClose(); }
      else if (e.key === 'Backspace' && draft.length) { e.preventDefault(); setDraft((d) => d.slice(0, -1)); }
      else if (e.key === 'Delete' && selectedId) deleteMeasurement(selectedId);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, draft, calibPts, selectedId, tool, finishWith]);

  // ---- quantities / sending ----------------------------------------------------------------------
  const quantFor = (m: TakeoffMeasurement) => quantOf(m, sheet?.pageScales[m.page], out);
  const sendMeasurement = (m: TakeoffMeasurement) => {
    if (!sheet) return;
    if (!m.itemId) { flash('Choose the BOQ item first.'); return; }
    const row = buildRow(m, quantFor(m), sheet.name, uid(mode === 'estimate' ? 'mb_row' : 'vmb_row'));
    if (!row) { flash(m.type === 'angle' ? 'Angles are evidence only and are not sent to the MB.' : 'Set the scale for this page first.'); return; }
    onApplyRow(m.itemId, row.spec);
    patchMeasurement(m.id, { links: [...m.links, { itemId: m.itemId, rowId: row.spec.id }] });
    flash(`"${m.label}" added to the ${mode === 'estimate' ? 'Estimate' : 'Valuation'} MB.`);
  };
  const syncMeasurement = (m: TakeoffMeasurement) => {
    if (!sheet) return;
    const q = quantFor(m);
    m.links.forEach((l) => { const row = buildRow(m, q, sheet.name, l.rowId); if (row) onSyncRow(l.itemId, row.spec); });
    flash(`Updated ${m.links.length} linked row(s).`);
  };
  const pending = sheet ? sheet.measurements.filter((m) => m.itemId && m.type !== 'angle' && m.links.length === 0 && quantFor(m).value !== null) : [];

  // ---- layers panel data + exports ---------------------------------------------------------------
  const layerRows: LayerRow[] = useMemo(() => {
    if (!sheet) return [];
    const groups = new Map<string, TakeoffMeasurement[]>();
    sheet.measurements.forEach((m) => { const k = m.itemId || '_none'; (groups.get(k) || groups.set(k, []).get(k)!).push(m); });
    return [...groups.entries()].map(([key, ms]) => {
      const it = items.find((i) => i.id === key);
      let L = 0, A = 0, C = 0;
      ms.forEach((m) => { const q = quantOf(m, sheet.pageScales[m.page], out); if (q.value === null) return; const s = m.deduct ? -1 : 1; if (q.family === 'length') L += s * q.value; else if (q.family === 'area') A += s * q.value; else if (q.family === 'count') C += s * q.value; });
      const parts = [L ? `${L.toFixed(3)} ${lenU}` : '', A ? `${A.toFixed(3)} ${out === 'ft' ? 'ft²' : 'm²'}` : '', C ? `${C} nos` : ''].filter(Boolean);
      const lay = sheet.layers?.[key];
      return { key, color: lay?.color || '#64748b', visible: lay?.visible !== false, title: it ? `${it.code} · ${it.description.slice(0, 44)}` : 'Unassigned', count: ms.length, summary: parts.join(' · ') || '–' };
    });
  }, [sheet, items, out, lenU]);

  const toggleLayer = (key: string) => updateSheet((s) => ({ ...s, layers: { ...(s.layers || {}), [key]: { ...(s.layers?.[key] || { color: '#2563eb', visible: true }), visible: !(s.layers?.[key]?.visible !== false) } } }));
  const isolateLayer = (key: string) => updateSheet((s) => ({ ...s, layers: Object.fromEntries(Object.entries(s.layers || {}).map(([k, v]) => [k, { ...v, visible: k === key }])) }));
  const showAllLayers = () => updateSheet((s) => ({ ...s, layers: Object.fromEntries(Object.entries(s.layers || {}).map(([k, v]) => [k, { ...v, visible: true }])) }));
  const cycleColor = (key: string) => updateSheet((s) => { const cur = s.layers?.[key]; const i = Math.max(0, PALETTE.indexOf(cur?.color || '')); return { ...s, layers: { ...(s.layers || {}), [key]: { visible: cur?.visible !== false, color: PALETTE[(i + 1) % PALETTE.length] } } }; });

  const doExportPng = async () => {
    if (!sheet) return;
    const base = isCad ? (document.querySelector('[data-testid=dxf-canvas]') as HTMLCanvasElement | null) : canvasRef.current;
    const svg = isCad ? (document.querySelector('[data-testid=dxf-viewer] svg') as SVGSVGElement | null) : pdfSvgRef.current;
    if (!base || !svg) { flash('Nothing to export yet.'); return; }
    setExporting(true);
    try {
      const legend = layerRows.filter((r) => r.visible).map((r) => ({ color: r.color, text: `${r.title}   [${r.count}]   ${r.summary}` }));
      await exportEvidencePng({ baseCanvas: base, renderBase: !isCad && source ? async (k) => { const tmp = document.createElement('canvas'); await source.render(page, tmp, zoom * k); return tmp; } : undefined, svg, title: `${sheet.name}${numPages > 1 ? ` · page ${page}` : ''} · ${scaleInfo?.label || 'no scale'}`, legend, filename: `evidence_${sheet.name.replace(/\.[^.]+$/, '')}_p${page}.png` });
      flash('Evidence image downloaded.');
    } finally { setExporting(false); }
  };
  const doExportCsv = () => {
    if (!sheet) return;
    const rows: (string | number)[][] = [['Sheet', 'Page', 'Item code', 'Item description', 'Item unit', 'Measurement', 'Shape', 'Type', 'Value', 'Value unit', 'Perimeter', 'Side A', 'Side B', 'Deduct', 'Slope factor', 'Waste %', 'Breadth factor', 'Height factor', 'Sent to MB (rows)', 'Scale', 'Note']];
    sheet.measurements.forEach((m) => {
      const q = quantFor(m); const it = items.find((i) => i.id === m.itemId);
      const vu = q.family === 'length' ? lenU : q.family === 'area' ? (out === 'ft' ? 'ft²' : 'm²') : q.family === 'angle' ? 'deg' : 'nos';
      rows.push([sheet.name, m.page, it?.code || '', it?.description || '', it?.unit || '', m.label, SHAPES[shapeOf(m)].label, m.type, q.value === null ? '' : Number(q.value.toFixed(4)), vu, q.perimeter === null ? '' : Number(q.perimeter.toFixed(4)), q.dims ? Number(q.dims.a.toFixed(4)) : '', q.dims ? Number(q.dims.b.toFixed(4)) : '', m.deduct ? 'yes' : '', m.pitch ? Number((Math.sqrt(m.pitch.mode === 'ratio' ? 1 + m.pitch.value ** 2 : 1 / Math.cos((m.pitch.value * Math.PI) / 180) ** 2)).toFixed(4)) : '', m.waste || '', m.b ?? '', m.h ?? '', m.links.length, sheet.scaleInfo?.[m.page]?.label || '', m.note || '']);
    });
    exportCsv(rows, `takeoff_${sheet.name.replace(/\.[^.]+$/, '')}.csv`);
  };

  // ---- overlay (shared drawing code, in drawing units; z = pixels per unit) -----------------------
  const renderOverlay = (z: number) => {
    const g: React.ReactNode[] = [];
    pageMeasurements.forEach((m) => {
      if (!layerVisible(m)) return;
      const q = quantFor(m); const geo = q.geo; const c = layerColor(m);
      const sel = m.id === selectedId; const sw = (sel ? 3 : 2) / z;
      const dash = m.deduct ? `${6 / z}` : undefined;
      const pts = geo.outline;
      const str = pts.map((p) => `${p.x},${p.y}`).join(' ');
      const lab = `${m.deduct ? '− ' : ''}${m.label}: ${formatValue(q, out)}`;
      const anchor = pts.length ? { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length } : null;
      g.push(
        <g key={m.id} onClick={(e) => { if (tool === 'select') { e.stopPropagation(); setSelectedId(m.id); } }} style={{ cursor: tool === 'select' ? 'pointer' : undefined }}>
          {q.family === 'area' && pts.length > 2 && <polygon points={str} fill={c} fillOpacity={m.deduct ? 0.08 : 0.2} stroke={c} strokeWidth={sw} strokeDasharray={dash} />}
          {q.family === 'length' && pts.length > 1 && <polyline points={str} fill="none" stroke={c} strokeWidth={sw} strokeDasharray={dash} />}
          {q.family === 'angle' && pts.length > 1 && <polyline points={str} fill="none" stroke={c} strokeWidth={sw} />}
          {q.family !== 'count' && m.shape !== 'cad' && (m.points || []).map((p, k) => <circle key={k} cx={p.x} cy={p.y} r={3 / z} fill={c} />)}
          {q.family === 'count' && (m.points || []).map((p, k) => (
            <g key={k}><circle cx={p.x} cy={p.y} r={7 / z} fill={c} fillOpacity={0.88} /><text x={p.x} y={p.y + 3 / z} fontSize={9 / z} textAnchor="middle" fill="#fff" fontWeight="bold">{k + 1}</text></g>
          ))}
          {anchor && (
            <text x={anchor.x} y={anchor.y - 6 / z} fontSize={11 / z} textAnchor="middle" fill={c} fontWeight="bold" stroke="#fff" strokeWidth={3 / z} paintOrder="stroke">
              {lab}{q.dims && (m.sendAs === 'LxB' || m.sendAs === 'BxL' || m.sendAs === 'LxH') ? `  (${q.dims.a.toFixed(2)} × ${q.dims.b.toFixed(2)})` : ''}
            </text>
          )}
        </g>
      );
    });
    // scale reference line (what the scale was calibrated from)
    if (scaleInfo?.ref) {
      const r = scaleInfo.ref;
      g.push(<g key="scale-ref"><line x1={r.a.x} y1={r.a.y} x2={r.b.x} y2={r.b.y} stroke="#d97706" strokeWidth={2 / z} strokeDasharray={`${5 / z}`} />
        <circle cx={r.a.x} cy={r.a.y} r={3 / z} fill="#d97706" /><circle cx={r.b.x} cy={r.b.y} r={3 / z} fill="#d97706" />
        <text x={(r.a.x + r.b.x) / 2} y={(r.a.y + r.b.y) / 2 - 6 / z} fontSize={10 / z} textAnchor="middle" fill="#b45309" fontWeight="bold" stroke="#fff" strokeWidth={3 / z} paintOrder="stroke">scale: {r.text}</text></g>);
    }
    // draft preview
    if (isShapeTool(tool) && (draft.length > 0 || (cursor && !SHAPES[tool].drag && draft.length === 0 && false))) {
      const info = SHAPES[tool];
      const ptsPrev = cursor && !info.drag ? [...draft, cursor] : draft;
      const geo = geometryOf(tool, ptsPrev);
      const str = geo.outline.map((p) => `${p.x},${p.y}`).join(' ');
      let live = '';
      if (mpp && cursor) {
        const lf = mpp * (out === 'ft' ? M_TO_FT : 1);
        if (geo.length !== undefined) live = `${(geo.length * lf).toFixed(2)} ${lenU}`;
        if (geo.area !== undefined) live = `${(geo.area * lf * lf).toFixed(2)} ${out === 'ft' ? 'ft²' : 'm²'}${geo.dims ? `  (${(geo.dims.a * lf).toFixed(2)} × ${(geo.dims.b * lf).toFixed(2)})` : ''}`;
      }
      if (geo.angle !== undefined) live = `${geo.angle.toFixed(1)}°`;
      g.push(
        <g key="draft">
          {info.family === 'area' && geo.outline.length > 2 ? <polygon points={str} fill="#2563eb22" stroke="#2563eb" strokeWidth={2 / z} strokeDasharray={`${5 / z}`} /> : <polyline points={str} fill="none" stroke="#2563eb" strokeWidth={2 / z} strokeDasharray={`${5 / z}`} />}
          {draft.map((p, k) => <circle key={k} cx={p.x} cy={p.y} r={3.5 / z} fill="#2563eb" />)}
          {cursor && live && <text x={cursor.x + 8 / z} y={cursor.y - 8 / z} fontSize={11 / z} fill="#1d4ed8" fontWeight="bold" stroke="#fff" strokeWidth={3 / z} paintOrder="stroke">{live}</text>}
        </g>
      );
    }
    if (calibPts) {
      g.push(<g key="calib">{calibPts.map((p, k) => <circle key={k} cx={p.x} cy={p.y} r={5 / z} fill="#d97706" />)}
        {calibPts.length === 2 && <line x1={calibPts[0].x} y1={calibPts[0].y} x2={calibPts[1].x} y2={calibPts[1].y} stroke="#d97706" strokeWidth={2 / z} />}</g>);
    }
    return <>{g}</>;
  };

  if (!isOpen) return null;

  const dimName = (d: number | null) => (d === 0 ? 'a count' : d === 1 ? 'a length' : d === 2 ? 'an area' : d === 3 ? 'a volume' : 'a quantity');
  const zoomBy = (k: number) => {
    userZoomed.current = true;
    if (isCad) {
      const el = wrapRef.current; if (!el) return;
      const cx = el.clientWidth / 2, cy = el.clientHeight / 2;
      setView((v) => ({ z: v.z * k, ox: cx - (cx - v.ox) * k, oy: cy - (cy - v.oy) * k }));
    } else setZoom((z) => Math.min(6, Math.max(0.2, z * k)));
  };

  const toolBtn = (t: Tool, label: string, icon: React.ReactNode, hintText: string, active: boolean, onClick: () => void) => (
    <button key={label} onClick={onClick} title={hintText} data-testid={`tool-${label.toLowerCase()}`}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}>
      {icon}{label}
    </button>
  );
  const activeShape = isShapeTool(tool) ? tool : null;
  const hint =
    !sheet ? 'Open a PDF, DXF (CAD) or image drawing to begin.'
    : tool === 'calibrate' ? (calibPts?.length === 1 ? 'Click the second end of the known dimension (Shift = straight).' : 'Click the first end of a dimension you know.')
    : activeShape ? SHAPES[activeShape].hint + (draft.length ? ' · Backspace removes the last point · Esc cancels.' : '')
    : tool === 'pick' ? 'Click CAD entities to pick them (Shift = add more), then add their total length / area.'
    : tool === 'pan' ? 'Drag to pan, wheel to zoom.'
    : 'Select a measurement on the drawing or in the list.';

  const scaleChip = (
    <button onClick={() => setScaleOpen((o) => !o)} data-testid="scale-chip"
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border ${mpp ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-red-50 text-red-700 border-red-300'}`}
      title="Show / hide the scale settings">
      {mpp ? `✓ Scale: ${scaleInfo?.label || 'set'}` : `⚠ No scale (page ${page})`} {scaleOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
    </button>
  );

  const highlight = new Set<number>(sheet?.measurements.find((m) => m.id === selectedId)?.entityIds || []);

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/70 flex items-center justify-center p-2" data-testid="takeoff-modal">
      <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-[1900px] flex flex-col overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-slate-50">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-blue-600" />
            <div>
              <div className="font-bold text-slate-900 text-sm">PDF / CAD Takeoff <span className="ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">{mode === 'estimate' ? 'Estimate MB' : 'Valuation MB'}</span></div>
              <div className="text-[11px] text-slate-500">Measure on a PDF, image or DXF drawing, keep each BOQ item as an evidence layer, send quantities to the MB.</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-slate-200" title="Close (Esc)"><X className="w-5 h-5" /></button>
        </div>

        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b bg-white">
          <input ref={fileRef} type="file" accept=".pdf,.dxf,application/pdf,image/png,image/jpeg" className="hidden" data-testid="takeoff-file"
            onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-700">
            <Upload className="w-4 h-4" /> Open PDF / DXF / Image
          </button>
          {sheets.length > 0 && (
            <select value={activeId || ''} onChange={(e) => setActiveId(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold max-w-[220px]">
              {sheets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          {sheet && (
            <>
              <span className="w-px h-6 bg-slate-200" />
              {toolBtn('select', 'Select', <MousePointer2 className="w-4 h-4" />, 'Select / inspect measurements', tool === 'select', () => setToolSafe('select'))}
              {isCad && toolBtn('pan', 'Pan', <Hand className="w-4 h-4" />, 'Drag to pan', tool === 'pan', () => setToolSafe('pan'))}
              {isCad && toolBtn('pick', 'Pick', <MousePointerClick className="w-4 h-4" />, 'Pick CAD entities', tool === 'pick', () => setToolSafe('pick'))}
              {toolBtn(lastLen, 'Length', <Ruler className="w-4 h-4" />, 'Length: line, polyline, arc, curve', !!activeShape && LENGTH_SHAPES.includes(activeShape), () => setToolSafe(lastLen))}
              {toolBtn(lastArea, 'Area', <Hexagon className="w-4 h-4" />, 'Area: rectangle, polygon, circle, ellipse, freehand', !!activeShape && AREA_SHAPES.includes(activeShape), () => setToolSafe(lastArea))}
              {toolBtn('count', 'Count', <Hash className="w-4 h-4" />, 'Count objects', tool === 'count', () => setToolSafe('count'))}
              {toolBtn('angle', 'Angle', <Triangle className="w-4 h-4" />, 'Measure an angle (evidence only)', tool === 'angle', () => setToolSafe('angle'))}
              <label className="flex items-center gap-1 text-xs font-semibold text-red-700 ml-1 cursor-pointer" title="New measurements are deductions (negative)">
                <input type="checkbox" checked={deductMode} onChange={(e) => setDeductMode(e.target.checked)} /> Deduct (−)
              </label>
              <span className="w-px h-6 bg-slate-200" />
              <button onClick={() => zoomBy(1 / 1.25)} className="p-1.5 border rounded-lg hover:bg-slate-50" title="Zoom out"><ZoomOut className="w-4 h-4" /></button>
              <span className="text-xs font-mono w-12 text-center">{isCad ? '' : `${Math.round(zoom * 100)}%`}</span>
              <button onClick={() => zoomBy(1.25)} className="p-1.5 border rounded-lg hover:bg-slate-50" title="Zoom in"><ZoomIn className="w-4 h-4" /></button>
              <button onClick={fitToWidth} className="p-1.5 border rounded-lg hover:bg-slate-50" title="Fit to view"><Maximize className="w-4 h-4" /></button>
              {numPages > 1 && (
                <>
                  <span className="w-px h-6 bg-slate-200" />
                  <button disabled={page <= 1} onClick={() => { setPage((p) => p - 1); setDraft([]); setCalibPts(null); }} className="p-1.5 border rounded-lg disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                  <select value={page} onChange={(e) => { setPage(Number(e.target.value)); setDraft([]); setCalibPts(null); }} className="border rounded-lg px-1.5 py-1 text-xs font-mono" data-testid="page-select">
                    {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => <option key={p} value={p}>Page {p} / {numPages} {sheet.pageScales[p] ? '✓' : '⚠'}</option>)}
                  </select>
                  <button disabled={page >= numPages} onClick={() => { setPage((p) => p + 1); setDraft([]); setCalibPts(null); }} className="p-1.5 border rounded-lg disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                </>
              )}
              <span className="w-px h-6 bg-slate-200" />
              {scaleChip}
              <select value={out} onChange={(e) => updateSheet((s) => ({ ...s, outUnit: e.target.value as 'm' | 'ft' }))} className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold" title="Output units">
                <option value="m">Metric (m, m²)</option>
                <option value="ft">Imperial (ft, ft²)</option>
              </select>
            </>
          )}
        </div>

        {/* shape chips */}
        {sheet && activeShape && (LENGTH_SHAPES.includes(activeShape) || AREA_SHAPES.includes(activeShape)) && (
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 border-b bg-slate-50" data-testid="shape-bar">
            <span className="text-[11px] font-bold text-slate-500 uppercase">{LENGTH_SHAPES.includes(activeShape) ? 'Length shape' : 'Area shape'}</span>
            {(LENGTH_SHAPES.includes(activeShape) ? LENGTH_SHAPES : AREA_SHAPES).map((s) => (
              <button key={s} data-testid={`shape-${s}`} onClick={() => setToolSafe(s)} title={SHAPES[s].hint}
                className={`px-2 py-1 rounded-full text-[11px] font-bold border ${activeShape === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-indigo-50'}`}>{SHAPES[s].label}</button>
            ))}
          </div>
        )}

        {/* scale section */}
        {sheet && scaleOpen && (
          <ScalePanel
            kind={sheet.kind}
            numPages={numPages}
            page={page}
            info={scaleInfo}
            mpp={mpp}
            pagesWithScale={pagesWithScale}
            paperMm={sheet.kind === 'pdf' ? { w: (pageSize.w * 25.4) / 72, h: (pageSize.h * 25.4) / 72 } : undefined}
            fileUnitName={cad?.unitName}
            calibPts={calibPts}
            picking={tool === 'calibrate'}
            onPickPoints={() => setToolSafe('calibrate')}
            onApply={applyScale}
            onClear={clearScale}
          />
        )}

        {/* body */}
        <div className="flex-1 flex min-h-0">
          <div ref={wrapRef} className={`flex-1 bg-slate-300 relative ${isCad ? 'overflow-hidden' : 'overflow-auto p-3'}`} data-testid="takeoff-scroll">
            {!sheet && (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-3">
                <Upload className="w-10 h-10 text-slate-400" />
                <div className="font-semibold">Open a PDF, DXF (CAD) or image drawing to start measuring</div>
                <div className="text-xs text-slate-500 max-w-md text-center">Files stay in your browser (IndexedDB), nothing is uploaded. For CAD, save as an ASCII DXF (DWG must be converted first).</div>
                <button onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold">Choose file</button>
              </div>
            )}
            {loadError && <div className="m-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm">{loadError}</div>}

            {sheet && isCad && cad && (
              <DxfViewer
                model={cad} view={view} onView={setView} hiddenLayers={hiddenCad} highlight={highlight} picked={picked}
                tool={tool}
                onPoint={handlePoint} onDouble={handleDouble}
                onPick={(id, add) => setPicked((prev) => { const n = new Set(add ? prev : []); if (id !== null) { if (n.has(id) && add) n.delete(id); else n.add(id); } return n; })}
                onMove={setCursor}
                dragDraw={!!activeShape && !!SHAPES[activeShape].drag}
                onDragStart={dragStart} onDragMove={(p) => dragMove(p, view.z)} onDragEnd={dragEnd}
                overlay={renderOverlay}
              />
            )}

            {sheet && !isCad && source && (
              <div className="relative mx-auto bg-white shadow-lg" style={{ width: pageSize.w * zoom, height: pageSize.h * zoom }}>
                <canvas ref={canvasRef} className="absolute inset-0" data-testid="takeoff-canvas" />
                <svg
                  ref={pdfSvgRef}
                  data-testid="takeoff-overlay"
                  className="absolute inset-0"
                  width={pageSize.w * zoom} height={pageSize.h * zoom}
                  viewBox={`0 0 ${pageSize.w} ${pageSize.h}`}
                  style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
                  onClick={(e) => { if (suppressClick.current) return; handlePoint(toPagePdf(e), e.shiftKey); }}
                  onDoubleClick={handleDouble}
                  onMouseDown={(e) => { if (e.button === 0 && activeShape && SHAPES[activeShape].drag) { e.preventDefault(); dragStart(toPagePdf(e)); } }}
                  onMouseMove={(e) => { const p = toPagePdf(e); setCursor(p); if (dragPts.current) dragMove(p, zoom); }}
                  onMouseUp={() => { if (dragPts.current) dragEnd(); }}
                  onMouseLeave={() => { setCursor(null); if (dragPts.current) dragEnd(); }}
                >
                  {renderOverlay(zoom)}
                </svg>
              </div>
            )}
          </div>

          {/* right panel */}
          <div className="w-[430px] shrink-0 border-l bg-white flex flex-col min-h-0">
            <div className="overflow-y-auto" style={{ maxHeight: '45%' }}>
              {isCad && cad && sheet && (
                <CadPanel
                  model={cad} mpp={mpp} out={out} hidden={hiddenCad}
                  onToggleLayer={(n) => setHiddenCad((prev) => { const s = new Set(prev); if (s.has(n)) s.delete(n); else s.add(n); return s; })}
                  onShowAll={() => setHiddenCad(new Set())}
                  picked={picked} onClearPicked={() => setPicked(new Set())} onAdd={addCadMeasurement}
                />
              )}
              {sheet && (
                <LayersPanel rows={layerRows} onToggle={toggleLayer} onIsolate={isolateLayer} onShowAll={showAllLayers} onColor={cycleColor} onExportPng={doExportPng} onExportCsv={doExportCsv} exporting={exporting} />
              )}
            </div>
            <div className="px-3 py-2 border-y flex items-center justify-between bg-slate-50">
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
              {sheet && sheet.measurements.length === 0 && <div className="text-xs text-slate-500 p-3">No measurements yet. Set the scale, choose Length, Area, Count or Angle and click on the drawing{isCad ? ', or use the CAD layers / Pick tool above' : ''}.</div>}
              {sheet?.measurements.map((m) => {
                const q = quantFor(m);
                const item = items.find((i) => i.id === m.itemId);
                const sel = m.id === selectedId;
                const shape = shapeOf(m);
                const exp = expandedId === m.id;
                const opts = sendOptions(m);
                const row = sheet && m.itemId ? buildRow(m, q, sheet.name, 'preview') : null;
                const idim = item ? unitDim(item.unit) : null;
                const rdim = rowDim(m, q);
                const warn = row && idim !== null && idim !== rdim ? `Unit check: ${item!.unit} expects ${dimName(idim)}, but this writes ${dimName(rdim)}. Change “Send as”, or add Breadth / Height.` : '';
                return (
                  <div key={m.id} onClick={() => { setSelectedId(m.id); if (m.page !== page) setPage(m.page); }} className={`rounded-xl border p-2 text-xs space-y-1.5 cursor-pointer ${sel ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`} data-testid="takeoff-row">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: layerColor(m) }} title="Item layer colour" />
                      <input value={m.label} onChange={(e) => patchMeasurement(m.id, { label: e.target.value })} onClick={(e) => e.stopPropagation()} className="flex-1 min-w-0 border border-slate-200 rounded px-1.5 py-0.5 font-semibold" />
                      <span className="font-mono font-bold text-slate-800 whitespace-nowrap" data-testid="takeoff-value">{m.deduct ? '−' : ''}{formatValue(q, out)}</span>
                      <button onClick={(e) => { e.stopPropagation(); deleteMeasurement(m.id); }} className="text-slate-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-2">
                      <span className="font-semibold">{SHAPES[shape].label}</span>
                      {m.shape === 'cad' && <span>{m.layer ? `layer ${m.layer}` : m.blockName ? `block ${m.blockName}` : 'picked entities'}</span>}
                      {q.perimeter !== null && <span data-testid="takeoff-perimeter">perimeter {q.perimeter.toFixed(3)} {lenU}</span>}
                      {q.dims && shape !== 'circle' && <span data-testid="takeoff-dims">{q.dims.a.toFixed(3)} × {q.dims.b.toFixed(3)} {lenU}</span>}
                      <span>page {m.page}</span>
                    </div>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <select data-testid="takeoff-item" value={m.itemId || ''} onChange={(e) => patchMeasurement(m.id, { itemId: e.target.value || undefined })} className="flex-1 min-w-0 border border-slate-200 rounded px-1 py-1">
                        <option value="">Assign to BOQ item…</option>
                        {items.map((i) => <option key={i.id} value={i.id}>{i.code} · {i.description.slice(0, 40)} ({i.unit})</option>)}
                      </select>
                      <label className="flex items-center gap-1 text-red-700 whitespace-nowrap"><input type="checkbox" checked={m.deduct} onChange={(e) => patchMeasurement(m.id, { deduct: e.target.checked })} />Ded.</label>
                    </div>
                    {opts.length > 0 && (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <span className="text-slate-500 whitespace-nowrap">Send as</span>
                        <select data-testid="takeoff-sendas" value={m.sendAs || 'value'} onChange={(e) => patchMeasurement(m.id, { sendAs: e.target.value as SendAs })} className="flex-1 min-w-0 border border-slate-200 rounded px-1 py-1">
                          {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                      </div>
                    )}
                    <div onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setExpandedId(exp ? null : m.id)} className="text-[10px] font-bold text-indigo-700 flex items-center gap-0.5">{exp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} Factors: breadth, height / depth, slope, waste, note</button>
                      {exp && (
                        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                          <label className="flex items-center gap-1">Breadth (B) <input type="number" step="any" value={m.b ?? ''} placeholder="1" data-testid="takeoff-b" onChange={(e) => patchMeasurement(m.id, { b: e.target.value === '' ? undefined : Number(e.target.value) })} className="w-16 border border-slate-200 rounded px-1 py-0.5 font-mono" /></label>
                          <label className="flex items-center gap-1">Height / depth (H) <input type="number" step="any" value={m.h ?? ''} placeholder="1" data-testid="takeoff-h" onChange={(e) => patchMeasurement(m.id, { h: e.target.value === '' ? undefined : Number(e.target.value) })} className="w-16 border border-slate-200 rounded px-1 py-0.5 font-mono" /></label>
                          <label className="flex items-center gap-1">Waste % <input type="number" step="any" value={m.waste ?? ''} placeholder="0" data-testid="takeoff-waste" onChange={(e) => patchMeasurement(m.id, { waste: e.target.value === '' ? undefined : Number(e.target.value) })} className="w-16 border border-slate-200 rounded px-1 py-0.5 font-mono" /></label>
                          <label className="flex items-center gap-1">Slope
                            <select value={m.pitch?.mode || 'ratio'} onChange={(e) => patchMeasurement(m.id, { pitch: { mode: e.target.value as 'ratio' | 'deg', value: m.pitch?.value || 0 } })} className="border border-slate-200 rounded px-0.5 py-0.5"><option value="ratio">rise:1</option><option value="deg">deg</option></select>
                            <input type="number" step="any" value={m.pitch?.value ?? ''} placeholder="0" data-testid="takeoff-slope" onChange={(e) => patchMeasurement(m.id, { pitch: e.target.value === '' ? undefined : { mode: m.pitch?.mode || 'ratio', value: Number(e.target.value) } })} className="w-14 border border-slate-200 rounded px-1 py-0.5 font-mono" /></label>
                          <input value={m.note || ''} placeholder="Note / evidence reference" onChange={(e) => patchMeasurement(m.id, { note: e.target.value })} className="col-span-2 border border-slate-200 rounded px-1.5 py-0.5" />
                          <div className="col-span-2 text-[10px] text-slate-500">Leave a factor empty to skip it; a typed 0 makes the quantity 0. Slope turns a plan length / area into the true length / area; waste adds an allowance. Both are written into the MB “No.” column.</div>
                        </div>
                      )}
                    </div>
                    {row && <div className="text-[10px] font-mono text-slate-600 bg-slate-50 rounded px-1.5 py-1" data-testid="takeoff-preview">→ {row.text} = <b>{row.qty.toFixed(3)}</b> {item?.unit}</div>}
                    {warn && <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-1" data-testid="takeoff-warn">{warn}</div>}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {m.links.length > 0 && <span className="text-emerald-700 font-bold text-[10px]">✓ in MB ({m.links.length})</span>}
                      <span className="flex-1" />
                      {m.links.length > 0 && (
                        <button onClick={() => syncMeasurement(m)} className="flex items-center gap-1 px-2 py-1 rounded-lg border border-indigo-300 text-indigo-700 font-bold" title="Push the current values to the MB rows created from this measurement"><RefreshCw className="w-3 h-3" /> Update {m.links.length}</button>
                      )}
                      {m.type !== 'angle' && <button data-testid="takeoff-send" onClick={() => sendMeasurement(m)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 text-white font-bold"><Send className="w-3 h-3" /> {m.links.length ? 'Add again' : 'Send to MB'}</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* status bar */}
        <div className="px-3 py-1.5 border-t bg-slate-50 text-[11px] text-slate-600 flex items-center justify-between">
          <span data-testid="takeoff-status">{message || hint}</span>
          <span className="font-mono">{cursor ? `x ${cursor.x.toFixed(isCad ? 2 : 0)}  y ${cursor.y.toFixed(isCad ? 2 : 0)}` : ''}</span>
        </div>
      </div>
    </div>
  );
};
