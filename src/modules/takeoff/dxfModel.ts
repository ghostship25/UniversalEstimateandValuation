// DXF (CAD) model for takeoff: parses an ASCII DXF, computes exact lengths / areas / block counts per layer,
// and builds flattened drawing primitives for display. All output coordinates are "page" coordinates:
// x' = x - minX, y' = maxY - y (origin top-left, y down) so they match the PDF overlay conventions.
import DxfParser from 'dxf-parser';
import type { Pt } from './takeoffStore';

export interface CadPrim {
  pts: Pt[];
  layer: string;
  closed: boolean;
  entity: number | null; // top-level entity id this primitive belongs to (null for block internals)
}
export interface CadText { x: number; y: number; h: number; text: string; layer: string }
export interface CadEntity {
  id: number;
  type: string;
  layer: string;
  length: number;            // drawing units
  area: number | null;       // drawing units², closed shapes only
  closed: boolean;
  approx: boolean;           // splines are approximated
  blockName?: string;
  bbox: [number, number, number, number];
  prims: number[];           // indexes into model.prims
}
export interface CadLayer {
  name: string;
  color: string;
  length: number;
  area: number;
  entityIds: number[];
  closedIds: number[];
  blocks: Record<string, number[]>;
}
export interface DxfModel {
  prims: CadPrim[];
  texts: CadText[];
  entities: CadEntity[];
  layers: CadLayer[];
  blocks: Record<string, number[]>; // block name -> insert entity ids
  extents: { w: number; h: number };
  insunits: number;
  metersPerUnit: number | null;
  unitName: string;
  unsupported: Record<string, number>;
  approxCount: number;
}

const ACI: Record<number, string> = { 1: '#e11d1d', 2: '#b8860b', 3: '#15803d', 4: '#0e7490', 5: '#1d4ed8', 6: '#a21caf', 7: '#1f2937', 8: '#6b7280', 9: '#9ca3af' };
const aciColor = (n?: number) => (n !== undefined && ACI[Math.abs(n)]) || '#374151';

export const INSUNITS: Record<number, { name: string; m: number }> = {
  1: { name: 'inches', m: 0.0254 }, 2: { name: 'feet', m: 0.3048 }, 3: { name: 'miles', m: 1609.344 },
  4: { name: 'millimetres', m: 0.001 }, 5: { name: 'centimetres', m: 0.01 }, 6: { name: 'metres', m: 1 },
  7: { name: 'kilometres', m: 1000 }, 10: { name: 'yards', m: 0.9144 }, 14: { name: 'decimetres', m: 0.1 },
};
export const UNIT_CHOICES: { id: string; label: string; m: number }[] = [
  { id: 'mm', label: 'Millimetres (mm)', m: 0.001 }, { id: 'cm', label: 'Centimetres (cm)', m: 0.01 },
  { id: 'm', label: 'Metres (m)', m: 1 }, { id: 'in', label: 'Inches (in)', m: 0.0254 }, { id: 'ft', label: 'Feet (ft)', m: 0.3048 },
];

type V = { x: number; y: number; bulge?: number };
const d2 = (a: V, b: V) => Math.hypot(a.x - b.x, a.y - b.y);

/** length of one polyline segment, bulge aware */
export function segLen(a: V, b: V, bulge = 0): number {
  const chord = d2(a, b);
  if (!bulge) return chord;
  const theta = 4 * Math.atan(Math.abs(bulge));
  const r = chord / (2 * Math.sin(theta / 2));
  return r * theta;
}
function segArea(a: V, b: V, bulge = 0): number {
  if (!bulge) return 0;
  const chord = d2(a, b);
  const theta = 4 * Math.atan(Math.abs(bulge));
  const r = chord / (2 * Math.sin(theta / 2));
  return Math.sign(bulge) * 0.5 * r * r * (theta - Math.sin(theta));
}
export function polyLength(v: V[], closed: boolean): number {
  let s = 0;
  for (let i = 0; i < v.length - 1; i++) s += segLen(v[i], v[i + 1], v[i].bulge);
  // a closed polyline needs its closing segment, also with only two vertices (two arcs make a circle)
  if (closed && v.length >= 2) s += segLen(v[v.length - 1], v[0], v[v.length - 1].bulge);
  return s;
}
export function polyArea(v: V[]): number {
  if (v.length < 2 || (v.length === 2 && !v.some((p) => p.bulge))) return 0;
  let s = 0;
  for (let i = 0; i < v.length; i++) {
    const a = v[i], b = v[(i + 1) % v.length];
    s += (a.x * b.y - b.x * a.y) / 2 + segArea(a, b, a.bulge);
  }
  return Math.abs(s);
}
function arcPoints(a: V, b: V, bulge: number): Pt[] {
  const chord = d2(a, b);
  const theta = 4 * Math.atan(Math.abs(bulge));
  const r = chord / (2 * Math.sin(theta / 2));
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = (b.x - a.x) / chord, dy = (b.y - a.y) / chord;
  const h = r * Math.cos(theta / 2);
  const sgn = bulge > 0 ? 1 : -1;
  const cx = mx - sgn * dy * h, cy = my + sgn * dx * h;
  const a0 = Math.atan2(a.y - cy, a.x - cx);
  const n = Math.max(4, Math.ceil((theta * 180) / Math.PI / 5));
  const out: Pt[] = [];
  for (let i = 1; i <= n; i++) {
    const ang = a0 + sgn * (theta * i) / n;
    out.push({ x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) });
  }
  return out;
}
function flattenPoly(v: V[], closed: boolean): Pt[] {
  if (!v.length) return [];
  const out: Pt[] = [{ x: v[0].x, y: v[0].y }];
  const n = closed ? v.length : v.length - 1;
  for (let i = 0; i < n; i++) {
    const a = v[i], b = v[(i + 1) % v.length];
    if (a.bulge && a.bulge !== 0) out.push(...arcPoints(a, b, a.bulge));
    else out.push({ x: b.x, y: b.y });
  }
  return out;
}
function arcSweepPts(cx: number, cy: number, r: number, a0: number, a1: number): Pt[] {
  let sweep = a1 - a0;
  while (sweep <= 0) sweep += Math.PI * 2;
  const n = Math.max(8, Math.ceil((sweep * 180) / Math.PI / 5));
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) out.push({ x: cx + r * Math.cos(a0 + (sweep * i) / n), y: cy + r * Math.sin(a0 + (sweep * i) / n) });
  return out;
}
function ellipsePts(e: any): Pt[] {
  const c = e.center, mj = e.majorAxisEndPoint, ratio = e.axisRatio || 1;
  const a = Math.hypot(mj.x, mj.y), rot = Math.atan2(mj.y, mj.x), b = a * ratio;
  let s = e.startAngle ?? 0, t = e.endAngle ?? Math.PI * 2;
  if (t <= s) t += Math.PI * 2;
  const n = 180, out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = s + ((t - s) * i) / n;
    const x = a * Math.cos(u), y = b * Math.sin(u);
    out.push({ x: c.x + x * Math.cos(rot) - y * Math.sin(rot), y: c.y + x * Math.sin(rot) + y * Math.cos(rot) });
  }
  return out;
}
function splinePts(e: any): Pt[] {
  const ctrl: any[] = e.controlPoints || [];
  const knots: number[] = e.knotValues || [];
  const p: number = e.degreeOfSplineCurve || 3;
  if (ctrl.length >= p + 1 && knots.length === ctrl.length + p + 1) {
    const lo = knots[p], hi = knots[ctrl.length];
    const n = Math.max(32, ctrl.length * 12), out: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i === n ? hi - 1e-9 : lo + ((hi - lo) * i) / n;
      let k = p; while (k < ctrl.length - 1 && t >= knots[k + 1]) k++;
      const d = ctrl.slice(k - p, k + 1).map((c) => ({ x: c.x, y: c.y }));
      for (let r = 1; r <= p; r++) {
        for (let j = p; j >= r; j--) {
          const den = knots[j + 1 + k - r] - knots[j + k - p];
          const alpha = den === 0 ? 0 : (t - knots[j + k - p]) / den;
          d[j] = { x: (1 - alpha) * d[j - 1].x + alpha * d[j].x, y: (1 - alpha) * d[j - 1].y + alpha * d[j].y };
        }
      }
      out.push(d[p]);
    }
    return out;
  }
  const fp: any[] = e.fitPoints && e.fitPoints.length ? e.fitPoints : ctrl;
  return fp.map((c) => ({ x: c.x, y: c.y }));
}
const polyLen = (p: Pt[]) => { let s = 0; for (let i = 1; i < p.length; i++) s += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y); return s; };
const shoelace = (p: Pt[]) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a.x * b.y - b.x * a.y; } return Math.abs(s) / 2; };

export function parseDxf(text: string): DxfModel {
  if (/^\s*AutoCAD Binary DXF/.test(text.slice(0, 40))) {
    throw new Error('This is a binary DXF. Save it as an ASCII DXF from your CAD program and try again.');
  }
  const parser = new DxfParser();
  let dxf: any;
  try { dxf = parser.parseSync(text); } catch (e: any) { throw new Error(`The DXF could not be read: ${e?.message || e}`); }
  if (!dxf || !Array.isArray(dxf.entities)) throw new Error('No drawing entities were found in this DXF.');

  const layerTable: Record<string, any> = dxf.tables?.layer?.layers || {};
  const layerColor = (name: string) => {
    const l = layerTable[name];
    if (!l) return '#374151';
    if (typeof l.colorIndex === 'number') return aciColor(l.colorIndex);
    return '#374151';
  };

  // raw model-space prims first (y up), converted to page space at the end
  const rawPrims: { pts: Pt[]; layer: string; closed: boolean; entity: number | null }[] = [];
  const rawTexts: CadText[] = [];
  const entities: CadEntity[] = [];
  const unsupported: Record<string, number> = {};
  let approxCount = 0;

  const bboxOf = (pts: Pt[]): [number, number, number, number] => {
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    pts.forEach((p) => { a = Math.min(a, p.x); b = Math.min(b, p.y); c = Math.max(c, p.x); d = Math.max(d, p.y); });
    return [a, b, c, d];
  };

  const addPrimsFor = (e: any, layer: string, entityId: number | null, tf: (p: Pt) => Pt, depth: number, budget: { n: number }) => {
    const push = (pts: Pt[], closed: boolean) => {
      if (budget.n-- <= 0 || pts.length < 2) return -1;
      rawPrims.push({ pts: pts.map(tf), layer, closed, entity: entityId });
      return rawPrims.length - 1;
    };
    switch (e.type) {
      case 'LINE': return [push([e.vertices[0], e.vertices[1]], false)];
      case 'LWPOLYLINE': case 'POLYLINE': {
        const closed = !!e.shape;
        return [push(flattenPoly(e.vertices as V[], closed), closed)];
      }
      case 'CIRCLE': return [push(arcSweepPts(e.center.x, e.center.y, e.radius, 0, Math.PI * 2), true)];
      case 'ARC': return [push(arcSweepPts(e.center.x, e.center.y, e.radius, e.startAngle, e.endAngle), false)];
      case 'ELLIPSE': return [push(ellipsePts(e), false)];
      case 'SPLINE': return [push(splinePts(e), false)];
      case 'TEXT': case 'MTEXT': {
        const p = tf(e.startPoint || e.position || { x: 0, y: 0 });
        const t = String(e.text || '').replace(/\\P/g, ' ').replace(/\{[^}]*;|}|\\[A-Za-z][^;]*;/g, '');
        if (t.trim()) rawTexts.push({ x: p.x, y: p.y, h: e.textHeight || e.height || 1, text: t, layer });
        return [];
      }
      case 'INSERT': {
        if (depth > 4) return [];
        const blk = dxf.blocks?.[e.name];
        if (!blk || !blk.entities) return [];
        const ox = e.position?.x || 0, oy = e.position?.y || 0;
        const sx = e.xScale ?? 1, sy = e.yScale ?? 1, rot = ((e.rotation || 0) * Math.PI) / 180;
        const bx = blk.position?.x || 0, by = blk.position?.y || 0;
        const cos = Math.cos(rot), sin = Math.sin(rot);
        const tf2 = (p: Pt): Pt => {
          const x = (p.x - bx) * sx, y = (p.y - by) * sy;
          return tf({ x: ox + x * cos - y * sin, y: oy + x * sin + y * cos });
        };
        const ids: number[] = [];
        blk.entities.forEach((be: any) => addPrimsFor(be, layer, entityId, tf2, depth + 1, budget).forEach((i) => { if (i >= 0) ids.push(i); }));
        return ids;
      }
      default: return [];
    }
  };

  const ident = (p: Pt) => ({ x: p.x, y: p.y });
  const budget = { n: 400000 };
  const SUPPORTED = new Set(['LINE', 'LWPOLYLINE', 'POLYLINE', 'CIRCLE', 'ARC', 'ELLIPSE', 'SPLINE', 'INSERT', 'TEXT', 'MTEXT']);

  dxf.entities.forEach((e: any) => {
    const layer: string = e.layer || '0';
    if (!SUPPORTED.has(e.type)) { unsupported[e.type] = (unsupported[e.type] || 0) + 1; return; }
    if (e.type === 'TEXT' || e.type === 'MTEXT') { addPrimsFor(e, layer, null, ident, 0, budget); return; }
    const id = entities.length;
    const before = rawPrims.length;
    const idx = addPrimsFor(e, layer, id, ident, 0, budget).filter((i) => i >= 0);
    let length = 0, area: number | null = null, closed = false, approx = false;
    if (e.type === 'LINE') length = d2(e.vertices[0], e.vertices[1]);
    else if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') {
      closed = !!e.shape; length = polyLength(e.vertices, closed);
      if (closed) area = polyArea(e.vertices);
    } else if (e.type === 'CIRCLE') { length = 2 * Math.PI * e.radius; area = Math.PI * e.radius * e.radius; closed = true; }
    else if (e.type === 'ARC') { let sw = e.endAngle - e.startAngle; while (sw <= 0) sw += Math.PI * 2; length = e.radius * sw; }
    else if (e.type === 'ELLIPSE') {
      const pts = ellipsePts(e); length = polyLen(pts);
      const full = Math.abs((((e.endAngle ?? Math.PI * 2) - (e.startAngle ?? 0)) % (Math.PI * 2))) < 1e-6 || (e.endAngle ?? 0) === (e.startAngle ?? 0);
      if (full) { closed = true; area = shoelace(pts); }
    } else if (e.type === 'SPLINE') {
      const pts = splinePts(e); length = polyLen(pts); approx = true; approxCount++;
      if (e.closed) { closed = true; area = shoelace(pts); }
    }
    const allPts = idx.flatMap((i) => rawPrims[i].pts);
    entities.push({
      id, type: e.type, layer, length, area, closed, approx, blockName: e.type === 'INSERT' ? e.name : undefined,
      bbox: allPts.length ? bboxOf(allPts) : [e.position?.x || 0, e.position?.y || 0, e.position?.x || 0, e.position?.y || 0],
      prims: idx,
    });
    void before;
  });

  // extents
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  rawPrims.forEach((p) => p.pts.forEach((q) => { minX = Math.min(minX, q.x); minY = Math.min(minY, q.y); maxX = Math.max(maxX, q.x); maxY = Math.max(maxY, q.y); }));
  // text labels also belong to the drawing extents (approximate width = 0.6 x height x characters)
  rawTexts.forEach((tx) => { const w = tx.h * 0.6 * tx.text.length; minX = Math.min(minX, tx.x); maxX = Math.max(maxX, tx.x + w); minY = Math.min(minY, tx.y); maxY = Math.max(maxY, tx.y + tx.h); });
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 1; maxY = 1; }
  const pad = Math.max(maxX - minX, maxY - minY) * 0.03 || 1;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const toPage = (p: Pt): Pt => ({ x: p.x - minX, y: maxY - p.y });

  const prims: CadPrim[] = rawPrims.map((p) => ({ ...p, pts: p.pts.map(toPage) }));
  const texts = rawTexts.map((t) => { const q = toPage(t); return { ...t, x: q.x, y: q.y }; });
  entities.forEach((e) => { e.bbox = [e.bbox[0] - minX, maxY - e.bbox[3], e.bbox[2] - minX, maxY - e.bbox[1]]; });

  // layers & blocks
  const layerMap: Record<string, CadLayer> = {};
  const blocks: Record<string, number[]> = {};
  entities.forEach((e) => {
    const L = (layerMap[e.layer] ||= { name: e.layer, color: layerColor(e.layer), length: 0, area: 0, entityIds: [], closedIds: [], blocks: {} });
    L.entityIds.push(e.id);
    if (e.type === 'INSERT') {
      (L.blocks[e.blockName!] ||= []).push(e.id);
      (blocks[e.blockName!] ||= []).push(e.id);
    } else {
      L.length += e.length;
      if (e.area !== null) { L.area += e.area; L.closedIds.push(e.id); }
    }
  });
  const layers = Object.values(layerMap).sort((a, b) => a.name.localeCompare(b.name));

  // count HATCH etc. that the parser silently skips
  const hatch = (text.match(/^\s*0\s*\r?\n\s*HATCH\s*$/gm) || []).length;
  if (hatch) unsupported.HATCH = hatch;

  const insunits = Number(dxf.header?.$INSUNITS ?? 0);
  const info = INSUNITS[insunits];
  return {
    prims, texts, entities, layers, blocks,
    extents: { w: maxX - minX, h: maxY - minY },
    insunits, metersPerUnit: info ? info.m : null, unitName: info ? info.name : 'not set in file',
    unsupported, approxCount,
  };
}
