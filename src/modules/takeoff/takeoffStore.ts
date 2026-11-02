// Persistence + geometry helpers for PDF / image takeoff.
// Sheets (the PDF bytes + calibration + measurements) are kept in IndexedDB so large drawings do not
// bloat the project JSON / localStorage.

export type TakeoffToolType = 'length' | 'area' | 'count' | 'angle';

/** how a measurement is drawn: this decides which quantities (length, area, perimeter, side dimensions) it yields */
export type Shape =
  | 'line' | 'polyline' | 'arc' | 'curve'            // length family
  | 'rect' | 'rrect' | 'polygon' | 'circle' | 'ellipse' | 'freehand' // area family
  | 'count' | 'angle' | 'cad';

/** how an area measurement is written into the MB columns */
export type SendAs = 'value' | 'perimeter' | 'LxB' | 'BxL' | 'LxH';
export interface Pitch { mode: 'ratio' | 'deg'; value: number }
export interface Pt { x: number; y: number }

export interface TakeoffLink { itemId: string; rowId: string }

export interface TakeoffMeasurement {
  id: string;
  page: number;
  type: TakeoffToolType;
  shape?: Shape;           // older saved measurements have no shape; see shapeOf()
  label: string;
  points: Pt[];            // page units (PDF points at scale 1, or image pixels)
  deduct: boolean;         // sent to the MB as a negative quantity
  itemId?: string;         // target BOQ item
  b?: number;              // optional breadth / width factor
  h?: number;              // optional height / depth / thickness factor
  sendAs?: SendAs;         // area shapes: value | perimeter | L x B | B x L | L x H
  pitch?: Pitch;           // slope: multiplies a plan length / area by the true-length factor
  waste?: number;          // % allowance added to the quantity
  note?: string;
  links: TakeoffLink[];    // MB rows created from this measurement
  /** CAD-derived measurements: raw length (units) / area (units²) / count, so rescaling stays exact */
  raw?: number;
  entityIds?: number[];    // CAD entities this measurement was built from (highlighted when selected)
  layer?: string;
  blockName?: string;
}

export type ScaleMethod = 'two-point' | 'preset' | 'units' | 'file';
export interface ScaleInfo {
  method: ScaleMethod;
  label: string;           // human readable, e.g. "1:100" or "10 m = 100.0 units"
  ref?: { a: Pt; b: Pt; text: string }; // the calibration line, drawn on the sheet as a check
}

export interface TakeoffSheet {
  id: string;
  projectKey: string;
  name: string;
  kind: 'pdf' | 'image' | 'dxf';
  data: ArrayBuffer;
  /** metres per page unit, per page number (set by calibration) */
  pageScales: Record<number, number>;
  /** item layers (evidence): colour + visibility per BOQ item id ('_none' = unassigned) */
  layers?: Record<string, { color: string; visible: boolean }>;
  /** how each page's scale was set (shown to the user so it is always clear what is applied) */
  scaleInfo?: Record<number, ScaleInfo>;
  outUnit: 'm' | 'ft';
  measurements: TakeoffMeasurement[];
  updatedAt: number;
}

const DB_NAME = 'uev_takeoff';
const STORE = 'sheets';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('projectKey', 'projectKey', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listSheets(projectKey: string): Promise<TakeoffSheet[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).index('projectKey').getAll(projectKey);
      req.onsuccess = () => resolve((req.result as TakeoffSheet[]).sort((a, b) => a.updatedAt - b.updatedAt));
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/** every sheet of every project (used by full backup) */
export async function listAllSheets(): Promise<TakeoffSheet[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as TakeoffSheet[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/** replace all stored sheets with the given ones, keeping their timestamps (used by restore) */
export async function replaceAllSheets(sheets: TakeoffSheet[]): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const os = tx.objectStore(STORE);
    os.clear();
    sheets.forEach((s) => os.put(s));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveSheet(sheet: TakeoffSheet): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ ...sheet, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* storage unavailable (private mode etc.): the session still works, it just is not persisted */
  }
}

export async function deleteSheet(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

// ---- geometry ---------------------------------------------------------------------------------
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export function polylineLength(pts: Pt[]): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i]);
  return s;
}

export function polygonArea(pts: Pt[]): number {
  if (pts.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

export function centroid(pts: Pt[]): Pt {
  if (!pts.length) return { x: 0, y: 0 };
  return { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length };
}

export const UNIT_TO_M: Record<string, number> = { m: 1, cm: 0.01, mm: 0.001, ft: 0.3048, in: 0.0254 };
const M_TO_FT = 1 / 0.3048;

/** value in output units (m / m2 or ft / ft2) or null when the page is not calibrated */
export function measurementValue(m: TakeoffMeasurement, mpp: number | undefined, out: 'm' | 'ft'): number | null {
  if (m.type === 'count') return m.raw !== undefined ? m.raw : m.points.length;
  if (!mpp) return null;
  if (m.raw !== undefined) {
    return m.type === 'length'
      ? m.raw * mpp * (out === 'ft' ? M_TO_FT : 1)
      : m.raw * mpp * mpp * (out === 'ft' ? M_TO_FT * M_TO_FT : 1);
  }
  if (m.type === 'length') return polylineLength(m.points) * mpp * (out === 'ft' ? M_TO_FT : 1);
  return polygonArea(m.points) * mpp * mpp * (out === 'ft' ? M_TO_FT * M_TO_FT : 1);
}

export interface MBRowSpec {
  id: string;
  particulars: string;
  no_of_units: number;
  length: number;
  breadth: number;
  height: number;
  remarks: string;
  takeoff_id: string;
}
