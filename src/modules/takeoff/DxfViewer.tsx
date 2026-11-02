import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DxfModel } from './dxfModel';
import type { Pt } from './takeoffStore';

export interface DxfView { z: number; ox: number; oy: number } // screen = page * z + (ox, oy)

interface Props {
  model: DxfModel;
  view: DxfView;
  onView: (v: DxfView) => void;
  hiddenLayers: Set<string>;
  highlight: Set<number>;      // entity ids drawn emphasised (selected measurement)
  picked: Set<number>;         // entity ids picked with the pick tool
  tool: string;                // 'pan' | 'pick' | 'calibrate' | 'length' | 'area' | 'count'
  onPoint: (p: Pt, shift: boolean) => void;
  onDouble: () => void;
  onPick: (entityId: number | null, additive: boolean) => void;
  onMove: (p: Pt | null) => void;
  /** freehand shapes are drawn by dragging */
  dragDraw: boolean;
  onDragStart: (p: Pt) => void;
  onDragMove: (p: Pt) => void;
  onDragEnd: () => void;
  /** overlay content in page units; rendered inside <g transform> so stroke sizes use z */
  overlay: (z: number) => React.ReactNode;
}

const SNAP_PX = 12;
const CELL = 64; // grid cells per axis

export const DxfViewer: React.FC<Props> = ({ model, view, onView, hiddenLayers, highlight, picked, tool, onPoint, onDouble, onPick, onMove, dragDraw, onDragStart, onDragMove, onDragEnd, overlay }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [snap, setSnap] = useState<Pt | null>(null);
  const dragging = useRef(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean; button: number } | null>(null);

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // vertex grid for snapping
  const grid = useMemo(() => {
    const cw = model.extents.w / CELL || 1, ch = model.extents.h / CELL || 1;
    const map = new Map<number, Pt[]>();
    const key = (cx: number, cy: number) => cy * (CELL + 2) + cx;
    model.prims.forEach((pr) => {
      // endpoints and vertices only (cheap, and what people snap to)
      const pts = pr.pts.length > 40 ? [pr.pts[0], pr.pts[pr.pts.length - 1]] : pr.pts;
      pts.forEach((p) => {
        const k = key(Math.floor(p.x / cw), Math.floor(p.y / ch));
        (map.get(k) || map.set(k, []).get(k)!).push(p);
      });
    });
    return { map, cw, ch, key };
  }, [model]);

  const toPage = useCallback((cx: number, cy: number): Pt => {
    const r = wrapRef.current!.getBoundingClientRect();
    return { x: (cx - r.left - view.ox) / view.z, y: (cy - r.top - view.oy) / view.z };
  }, [view]);

  const findSnap = useCallback((p: Pt): Pt | null => {
    const rad = SNAP_PX / view.z;
    const { map, cw, ch, key } = grid;
    const cx0 = Math.floor((p.x - rad) / cw), cx1 = Math.floor((p.x + rad) / cw);
    const cy0 = Math.floor((p.y - rad) / ch), cy1 = Math.floor((p.y + rad) / ch);
    if ((cx1 - cx0 + 1) * (cy1 - cy0 + 1) > 400) return null;
    let best: Pt | null = null, bd = rad;
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      (map.get(key(cx, cy)) || []).forEach((q) => { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d <= bd) { bd = d; best = q; } });
    }
    return best;
  }, [grid, view.z]);

  // ---- draw ------------------------------------------------------------------------------------
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.floor(size.w * dpr); cv.height = Math.floor(size.h * dpr);
    cv.style.width = `${size.w}px`; cv.style.height = `${size.h}px`;
    const ctx = cv.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size.w, size.h);
    const { z, ox, oy } = view;
    const byLayer = new Map<string, number[]>();
    model.prims.forEach((p, i) => { if (!hiddenLayers.has(p.layer)) (byLayer.get(p.layer) || byLayer.set(p.layer, []).get(p.layer)!).push(i); });
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const layerColor = (n: string) => model.layers.find((l) => l.name === n)?.color || '#374151';
    const strokePrims = (idx: number[], color: string, width: number) => {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
      idx.forEach((i) => {
        const pts = model.prims[i].pts; if (!pts.length) return;
        ctx.moveTo(pts[0].x * z + ox, pts[0].y * z + oy);
        for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x * z + ox, pts[k].y * z + oy);
        if (model.prims[i].closed) ctx.closePath();
      });
      ctx.stroke();
    };
    byLayer.forEach((idx, layer) => strokePrims(idx, layerColor(layer), 1));
    // text
    ctx.fillStyle = '#4b5563';
    model.texts.forEach((t) => {
      if (hiddenLayers.has(t.layer)) return;
      const px = t.h * z; if (px < 5) return;
      ctx.font = `${Math.min(px, 60)}px sans-serif`; ctx.fillText(t.text, t.x * z + ox, t.y * z + oy);
    });
    // emphasised
    const hl: number[] = [], pk: number[] = [];
    model.entities.forEach((e) => { if (hiddenLayers.has(e.layer)) return; if (highlight.has(e.id)) hl.push(...e.prims); if (picked.has(e.id)) pk.push(...e.prims); });
    if (hl.length) strokePrims(hl, '#2563eb', 3);
    if (pk.length) strokePrims(pk, '#f59e0b', 3.5);
  }, [model, view, size, hiddenLayers, highlight, picked]);

  // ---- interaction -----------------------------------------------------------------------------
  const onWheel = (e: React.WheelEvent) => {
    const r = wrapRef.current!.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const nz = Math.min(5000, Math.max(0.0001, view.z * (e.deltaY < 0 ? 1.18 : 1 / 1.18)));
    const k = nz / view.z;
    onView({ z: nz, ox: mx - (mx - view.ox) * k, oy: my - (my - view.oy) * k });
  };
  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (dragDraw && e.button === 0) { dragging.current = true; onDragStart(toPage(e.clientX, e.clientY)); return; }
    drag.current = { x: e.clientX, y: e.clientY, ox: view.ox, oy: view.oy, moved: false, button: e.button };
  };
  const onMoveEv = (e: React.PointerEvent) => {
    if (dragging.current) { onDragMove(toPage(e.clientX, e.clientY)); return; }
    const d = drag.current;
    if (d && (d.button === 1 || d.button === 2 || tool === 'pan')) {
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
      onView({ z: view.z, ox: d.ox + dx, oy: d.oy + dy });
      return;
    }
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) d.moved = true;
    const p = toPage(e.clientX, e.clientY);
    const measuring = tool === 'length' || tool === 'area' || tool === 'count' || tool === 'calibrate';
    setSnap(measuring ? findSnap(p) : null);
    onMove(p);
  };
  const onUp = (e: React.PointerEvent) => {
    if (dragging.current) { dragging.current = false; onDragEnd(); return; }
    const d = drag.current; drag.current = null;
    if (!d || d.moved || d.button !== 0) return;
    let p = toPage(e.clientX, e.clientY);
    if (tool === 'pick') { onPick(hitTest(p), e.shiftKey || e.ctrlKey || e.metaKey); return; }
    if (tool === 'pan') return;
    const s = findSnap(p); if (s) p = s;
    onPoint(p, e.shiftKey);
  };

  const hitTest = (p: Pt): number | null => {
    const tol = 7 / view.z; let best: number | null = null, bd = tol;
    model.entities.forEach((e) => {
      if (hiddenLayers.has(e.layer)) return;
      const [a, b, c, d] = e.bbox;
      if (p.x < a - tol || p.x > c + tol || p.y < b - tol || p.y > d + tol) return;
      e.prims.forEach((pi) => {
        const pts = model.prims[pi].pts; const closed = model.prims[pi].closed;
        const n = closed ? pts.length : pts.length - 1;
        for (let i = 0; i < n; i++) {
          const s = pts[i], t = pts[(i + 1) % pts.length];
          const dx = t.x - s.x, dy = t.y - s.y, l2 = dx * dx + dy * dy;
          const u = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - s.x) * dx + (p.y - s.y) * dy) / l2));
          const dist = Math.hypot(p.x - (s.x + u * dx), p.y - (s.y + u * dy));
          if (dist < bd) { bd = dist; best = e.id; }
        }
      });
    });
    return best;
  };

  const cursor = tool === 'pan' ? 'grab' : tool === 'pick' ? 'pointer' : 'crosshair';
  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 overflow-hidden select-none touch-none"
      style={{ cursor }}
      onWheel={onWheel}
      onPointerDown={onDown}
      onPointerMove={onMoveEv}
      onPointerUp={onUp}
      onPointerLeave={() => { onMove(null); setSnap(null); }}
      onDoubleClick={() => onDouble()}
      onContextMenu={(e) => e.preventDefault()}
      data-testid="dxf-viewer"
    >
      <canvas ref={canvasRef} className="absolute inset-0" data-testid="dxf-canvas" />
      <svg className="absolute inset-0 pointer-events-none" width={size.w} height={size.h}>
        <g transform={`translate(${view.ox} ${view.oy}) scale(${view.z})`}>
          {overlay(view.z)}
          {snap && <rect x={snap.x - 5 / view.z} y={snap.y - 5 / view.z} width={10 / view.z} height={10 / view.z} fill="none" stroke="#16a34a" strokeWidth={2 / view.z} />}
        </g>
      </svg>
    </div>
  );
};
