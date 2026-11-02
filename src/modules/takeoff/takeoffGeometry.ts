// Pure geometry + quantity rules for takeoff measurements (no React, fully unit-testable).
import type { Pt, Pitch, SendAs, Shape, TakeoffMeasurement, TakeoffToolType, MBRowSpec } from './takeoffStore';
import { dist, polygonArea, polylineLength } from './takeoffStore';
import { computeRowBaseQuantity } from '../../services/mbDependencyEngine';

export type Family = TakeoffToolType; // 'length' | 'area' | 'count' | 'angle'

export interface ShapeInfo {
  label: string;
  family: Family;
  /** points needed to finish automatically (undefined = open ended: Enter / double-click) */
  autoPoints?: number;
  minPoints: number;
  drag?: boolean;          // drawn by dragging (freehand)
  hint: string;
}

export const SHAPES: Record<Shape, ShapeInfo> = {
  line:     { label: 'Straight line', family: 'length', autoPoints: 2, minPoints: 2, hint: 'Click the start and the end point.' },
  polyline: { label: 'Polyline', family: 'length', minPoints: 2, hint: 'Click each corner. Double-click or Enter to finish.' },
  arc:      { label: 'Arc / curve (3 points)', family: 'length', autoPoints: 3, minPoints: 3, hint: 'Click the start, a point ON the arc, then the end.' },
  curve:    { label: 'Freehand curve', family: 'length', drag: true, minPoints: 2, hint: 'Press and drag along the curve, release to finish.' },
  rect:     { label: 'Rectangle', family: 'area', autoPoints: 2, minPoints: 2, hint: 'Click two opposite corners.' },
  rrect:    { label: 'Rotated rectangle', family: 'area', autoPoints: 3, minPoints: 3, hint: 'Click both ends of one side, then a point on the opposite side.' },
  polygon:  { label: 'Polygon', family: 'area', minPoints: 3, hint: 'Click each corner. Double-click or Enter to close.' },
  circle:   { label: 'Circle', family: 'area', autoPoints: 2, minPoints: 2, hint: 'Click the centre, then a point on the edge.' },
  ellipse:  { label: 'Ellipse', family: 'area', autoPoints: 2, minPoints: 2, hint: 'Click two opposite corners of its bounding box.' },
  freehand: { label: 'Freehand area', family: 'area', drag: true, minPoints: 3, hint: 'Press and drag around the area, release to close.' },
  count:    { label: 'Count', family: 'count', minPoints: 1, hint: 'Click each object. Enter to finish the group.' },
  angle:    { label: 'Angle', family: 'angle', autoPoints: 3, minPoints: 3, hint: 'Click a point on one arm, the vertex, then a point on the other arm.' },
  cad:      { label: 'CAD selection', family: 'length', minPoints: 0, hint: '' },
};

export const LENGTH_SHAPES: Shape[] = ['line', 'polyline', 'arc', 'curve'];
export const AREA_SHAPES: Shape[] = ['rect', 'rrect', 'polygon', 'circle', 'ellipse', 'freehand'];

export function shapeOf(m: Pick<TakeoffMeasurement, 'shape' | 'type'>): Shape {
  if (m.shape) return m.shape;
  return m.type === 'area' ? 'polygon' : m.type === 'count' ? 'count' : m.type === 'angle' ? 'angle' : 'polyline';
}

export interface Geo {
  length?: number;                 // path length (length family)
  area?: number;
  perimeter?: number;
  dims?: { a: number; b: number }; // side lengths of rectangles (a = first side, b = other)
  angle?: number;                  // degrees
  count?: number;
  outline: Pt[];                   // points to draw (curves already sampled)
  closed: boolean;
}

const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** circle through three points */
export function circleFrom3(a: Pt, b: Pt, c: Pt): { c: Pt; r: number } | null {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-12) return null;
  const ux = ((a.x ** 2 + a.y ** 2) * (b.y - c.y) + (b.x ** 2 + b.y ** 2) * (c.y - a.y) + (c.x ** 2 + c.y ** 2) * (a.y - b.y)) / d;
  const uy = ((a.x ** 2 + a.y ** 2) * (c.x - b.x) + (b.x ** 2 + b.y ** 2) * (a.x - c.x) + (c.x ** 2 + c.y ** 2) * (b.x - a.x)) / d;
  return { c: { x: ux, y: uy }, r: Math.hypot(a.x - ux, a.y - uy) };
}

/** arc from a through b to c: sampled points + exact length */
export function arcThrough(a: Pt, b: Pt, c: Pt): { pts: Pt[]; length: number } {
  const circ = circleFrom3(a, b, c);
  if (!circ) return { pts: [a, c], length: dist(a, c) }; // collinear: a straight line
  const ang = (p: Pt) => Math.atan2(p.y - circ.c.y, p.x - circ.c.x);
  const a0 = ang(a), am = ang(b), a1 = ang(c);
  const norm = (x: number) => ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const ccw = norm(am - a0) < norm(a1 - a0); // does going counter-clockwise from a hit b before c?
  const sweep = ccw ? norm(a1 - a0) : -norm(a0 - a1);
  const n = Math.max(8, Math.ceil((Math.abs(sweep) * 180) / Math.PI / 4));
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = a0 + (sweep * i) / n;
    pts.push({ x: circ.c.x + circ.r * Math.cos(t), y: circ.c.y + circ.r * Math.sin(t) });
  }
  return { pts, length: circ.r * Math.abs(sweep) };
}

/** four corners of the rectangle with base side p0-p1 and the opposite side through p2 */
export function rotatedRect(p0: Pt, p1: Pt, p2: Pt): { corners: Pt[]; a: number; b: number } {
  const a = dist(p0, p1);
  if (a === 0) return { corners: [p0, p1, p1, p0], a: 0, b: 0 };
  const ux = (p1.x - p0.x) / a, uy = (p1.y - p0.y) / a;
  const nx = -uy, ny = ux;
  const w = (p2.x - p0.x) * nx + (p2.y - p0.y) * ny; // signed perpendicular distance
  const c3 = { x: p1.x + nx * w, y: p1.y + ny * w }, c4 = { x: p0.x + nx * w, y: p0.y + ny * w };
  return { corners: [p0, p1, c3, c4], a, b: Math.abs(w) };
}

export function ellipsePerimeter(a: number, b: number): number {
  const h = ((a - b) ** 2) / ((a + b) ** 2 || 1);
  return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h))); // Ramanujan II
}
const sampleCircle = (c: Pt, r: number, n = 96): Pt[] => Array.from({ length: n }, (_, i) => ({ x: c.x + r * Math.cos((2 * Math.PI * i) / n), y: c.y + r * Math.sin((2 * Math.PI * i) / n) }));
const sampleEllipse = (c: Pt, a: number, b: number, n = 96): Pt[] => Array.from({ length: n }, (_, i) => ({ x: c.x + a * Math.cos((2 * Math.PI * i) / n), y: c.y + b * Math.sin((2 * Math.PI * i) / n) }));

export function angleDeg(p0: Pt, v: Pt, p2: Pt): number {
  const a1 = Math.atan2(p0.y - v.y, p0.x - v.x), a2 = Math.atan2(p2.y - v.y, p2.x - v.x);
  let d = Math.abs(a1 - a2) * 180 / Math.PI;
  if (d > 180) d = 360 - d;
  return d;
}

/** geometry in drawing units (page units for PDFs, drawing units for CAD) */
export function geometryOf(shape: Shape, pts: Pt[]): Geo {
  switch (shape) {
    case 'line': case 'polyline': case 'curve':
      return { length: polylineLength(pts), outline: pts, closed: false };
    case 'arc': {
      if (pts.length < 3) return { length: polylineLength(pts), outline: pts, closed: false };
      const arc = arcThrough(pts[0], pts[1], pts[2]);
      return { length: arc.length, outline: arc.pts, closed: false };
    }
    case 'rect': {
      if (pts.length < 2) return { outline: pts, closed: false };
      const [p, q] = pts;
      const corners = [{ x: p.x, y: p.y }, { x: q.x, y: p.y }, { x: q.x, y: q.y }, { x: p.x, y: q.y }];
      const a = Math.abs(q.x - p.x), b = Math.abs(q.y - p.y);
      return { area: a * b, perimeter: 2 * (a + b), dims: { a, b }, outline: corners, closed: true };
    }
    case 'rrect': {
      if (pts.length < 3) return { length: pts.length === 2 ? dist(pts[0], pts[1]) : undefined, outline: pts, closed: false };
      const r = rotatedRect(pts[0], pts[1], pts[2]);
      return { area: r.a * r.b, perimeter: 2 * (r.a + r.b), dims: { a: r.a, b: r.b }, outline: r.corners, closed: true };
    }
    case 'polygon': case 'freehand': {
      if (pts.length < 3) return { outline: pts, closed: false };
      return { area: polygonArea(pts), perimeter: polylineLength([...pts, pts[0]]), outline: pts, closed: true };
    }
    case 'circle': {
      if (pts.length < 2) return { outline: pts, closed: false };
      const r = dist(pts[0], pts[1]);
      return { area: Math.PI * r * r, perimeter: 2 * Math.PI * r, dims: { a: 2 * r, b: 2 * r }, outline: sampleCircle(pts[0], r), closed: true };
    }
    case 'ellipse': {
      if (pts.length < 2) return { outline: pts, closed: false };
      const a = Math.abs(pts[1].x - pts[0].x) / 2, b = Math.abs(pts[1].y - pts[0].y) / 2;
      return { area: Math.PI * a * b, perimeter: ellipsePerimeter(a, b), dims: { a: 2 * a, b: 2 * b }, outline: sampleEllipse(mid(pts[0], pts[1]), a, b), closed: true };
    }
    case 'count':
      return { count: pts.length, outline: pts, closed: false };
    case 'angle':
      return pts.length >= 3 ? { angle: angleDeg(pts[0], pts[1], pts[2]), outline: pts, closed: false } : { outline: pts, closed: false };
    default:
      return { outline: pts, closed: false };
  }
}

// ---- quantities --------------------------------------------------------------------------------
export const M_TO_FT = 1 / 0.3048;

export interface Quant {
  family: Family;
  /** primary measured value in output units (m / m² / ft / ft² / nos / degrees); null when no scale */
  value: number | null;
  perimeter: number | null;
  dims: { a: number; b: number } | null;
  geo: Geo;
}

export function quantOf(m: TakeoffMeasurement, mpp: number | undefined, out: 'm' | 'ft'): Quant {
  const shape = shapeOf(m);
  let geo: Geo = geometryOf(shape, m.points);
  const family = SHAPES[shape].family === 'length' && m.type !== 'length' ? m.type : m.type;
  if (m.raw !== undefined) {
    geo = { ...geo, length: m.type === 'length' ? m.raw : undefined, area: m.type === 'area' ? m.raw : undefined, count: m.type === 'count' ? m.raw : undefined };
  }
  if (family === 'count') return { family, value: geo.count ?? m.points.length, perimeter: null, dims: null, geo };
  if (family === 'angle') return { family, value: geo.angle ?? null, perimeter: null, dims: null, geo };
  if (!mpp) return { family, value: null, perimeter: null, dims: null, geo };
  const lf = mpp * (out === 'ft' ? M_TO_FT : 1);
  if (family === 'length') return { family, value: (geo.length ?? 0) * lf, perimeter: null, dims: null, geo };
  return {
    family,
    value: (geo.area ?? 0) * lf * lf,
    perimeter: geo.perimeter !== undefined ? geo.perimeter * lf : null,
    dims: geo.dims ? { a: geo.dims.a * lf, b: geo.dims.b * lf } : null,
    geo,
  };
}

export function pitchFactor(p?: Pitch): number {
  if (!p || !(p.value > 0)) return 1;
  if (p.mode === 'ratio') return Math.sqrt(1 + p.value * p.value);       // rise per 1 of run
  return 1 / Math.cos((Math.min(p.value, 85) * Math.PI) / 180);          // degrees from horizontal
}
export const wasteFactor = (w?: number) => 1 + (w && w > 0 ? w / 100 : 0);

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const r4 = (n: number) => Math.round(n * 10000) / 10000;

export function sendOptions(m: TakeoffMeasurement): { id: SendAs; label: string }[] {
  const shape = shapeOf(m);
  if (SHAPES[shape].family !== 'area') return [];
  const rect = shape === 'rect' || shape === 'rrect';
  const opts: { id: SendAs; label: string }[] = [
    { id: 'value', label: 'Area as one value (L)' },
    { id: 'perimeter', label: 'Perimeter (L)' },
  ];
  if (rect || shape === 'circle' || shape === 'ellipse') {
    opts.push({ id: 'LxB', label: 'Length × Breadth' }, { id: 'BxL', label: 'Breadth × Length' }, { id: 'LxH', label: 'Length × Height' });
  }
  return opts;
}

export interface RowResult { spec: MBRowSpec; qty: number; text: string }

/** Convert a measurement into the N × L × B × H columns of an MB row. Blank factors are not used; a typed 0 gives a quantity of 0. */
export function buildRow(m: TakeoffMeasurement, q: Quant, sheetName: string, rowId: string): RowResult | null {
  if (q.value === null || q.family === 'angle') return null;
  const sign = m.deduct ? -1 : 1;
  const factor = pitchFactor(m.pitch) * wasteFactor(m.waste);
  // blank = not used (written as 1, which leaves the product unchanged); a typed 0 is a real value and gives 0
  const b = m.b === undefined || m.b === null || Number.isNaN(m.b) ? 1 : m.b;
  const h = m.h === undefined || m.h === null || Number.isNaN(m.h) ? 1 : m.h;
  let n = 1, l = 1, bb = 1, hh = 1;
  const sendAs: SendAs = m.sendAs || 'value';
  if (q.family === 'count') { n = q.value; bb = b; hh = h; }
  else if (q.family === 'length') { l = q.value; bb = b; hh = h; }
  else {
    const d = q.dims;
    if (sendAs === 'perimeter' && q.perimeter !== null) { l = q.perimeter; bb = b; hh = h; }
    else if (sendAs === 'LxB' && d) { l = d.a; bb = d.b; hh = h; }
    else if (sendAs === 'BxL' && d) { l = d.b; bb = d.a; hh = h; }
    else if (sendAs === 'LxH' && d) { l = d.a; bb = b; hh = d.b; }
    else { l = q.value; bb = 1; hh = h; }
  }
  const extras: string[] = [];
  if (factor !== 1) extras.push(`factor ${factor.toFixed(4)}`);
  const shape = shapeOf(m);
  const spec: MBRowSpec = {
    id: rowId,
    particulars: `${m.deduct ? 'Deduct: ' : ''}${m.label}`,
    no_of_units: r4(sign * n * factor),
    length: r3(l), breadth: r3(bb), height: r3(hh),
    remarks: `Takeoff: ${sheetName} · ${SHAPES[shape].label}${extras.length ? ' · ' + extras.join(', ') : ''}`,
    takeoff_id: m.id,
  };
  const qty = computeRowBaseQuantity({ no: spec.no_of_units, l: spec.length, b: spec.breadth, h: spec.height }, { no: true, l: true, b: true, h: true });
  const text = `N ${spec.no_of_units} · L ${spec.length} · B ${spec.breadth} · H ${spec.height}`;
  return { spec, qty, text };
}

/** primary measured value as text, e.g. "12.500 m" */
export function formatValue(q: Quant, out: 'm' | 'ft'): string {
  if (q.value === null) return q.family === 'angle' ? '–' : 'set scale';
  if (q.family === 'count') return `${q.value} nos`;
  if (q.family === 'angle') return `${q.value.toFixed(1)}°`;
  const v = Math.abs(q.value) > 0 && Math.abs(q.value) < 0.01 ? q.value.toPrecision(3) : q.value.toFixed(3);
  return `${v} ${q.family === 'length' ? (out === 'ft' ? 'ft' : 'm') : out === 'ft' ? 'ft²' : 'm²'}`;
}
