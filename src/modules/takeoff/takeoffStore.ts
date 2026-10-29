// Persistence + geometry helpers for PDF / image takeoff.
// Sheets (the PDF bytes + calibration + measurements) are kept in IndexedDB so large drawings do not
// bloat the project JSON / localStorage.

export type TakeoffToolType = 'length' | 'area' | 'count';
export interface Pt { x: number; y: number }

export interface TakeoffLink { itemId: string; rowId: string }

export interface TakeoffMeasurement {
  id: string;
  page: number;
  type: TakeoffToolType;
  label: string;
  points: Pt[];            // page units (PDF points at scale 1, or image pixels)
  deduct: boolean;         // sent to the MB as a negative quantity
  itemId?: string;         // target BOQ item
  b?: number;              // optional breadth (length measurements)
  h?: number;              // optional height / depth / thickness
  links: TakeoffLink[];    // MB rows created from this measurement
}

export interface TakeoffSheet {
  id: string;
  projectKey: string;
  name: string;
  kind: 'pdf' | 'image';
  data: ArrayBuffer;
  /** metres per page unit, per page number (set by calibration) */
  pageScales: Record<number, number>;
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
  if (m.type === 'count') return m.points.length;
  if (!mpp) return null;
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

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Convert a measurement into the N x L x B x H columns of a Measurement Book row. */
export function toRowSpec(m: TakeoffMeasurement, value: number, sheetName: string, rowId: string): MBRowSpec {
  const sign = m.deduct ? -1 : 1;
  let n = 1, l = 1, b = 1, h = 1;
  if (m.type === 'count') { n = value; b = m.b ?? 1; h = m.h ?? 1; }
  else if (m.type === 'length') { l = r3(value); b = m.b ?? 1; h = m.h ?? 1; }
  else { l = r3(value); h = m.h ?? 1; }
  return {
    id: rowId,
    particulars: `${m.deduct ? 'Deduct: ' : ''}${m.label}`,
    no_of_units: sign * n,
    length: l,
    breadth: b,
    height: h,
    remarks: `Takeoff: ${sheetName} p.${m.page}`,
    takeoff_id: m.id,
  };
}
