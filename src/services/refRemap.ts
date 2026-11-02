// Keeps formula references pointing at the same cells when items or rows are inserted, deleted or moved
// (what a spreadsheet does). References are position based (I2.R3.L, L1, R3.Thickness, SUM(L1:L3)); this
// module rewrites them from the old positions to the new ones using the stable item / row ids.
// A reference to something that no longer exists becomes #REF! and is counted.
import type { BOQItem, MBRow, ValuationMBRow } from '../types';

export interface RemapMaps {
  /** new 0-based item index for an old 0-based item index, or null when the item is gone */
  mapItem: (oldItem: number) => number | null;
  /** new 0-based row index for an old (item, row), or null when the row is gone */
  mapRow: (oldItem: number, oldRow: number) => number | null;
}

const REF = '#REF!';

export function remapFormula(formula: string, curOldItem: number, maps: RemapMaps): { text: string; broken: number } {
  if (!formula.trim().startsWith('=')) return { text: formula, broken: 0 };
  let broken = 0;
  const keep: string[] = [];
  const hold = (s: string) => { keep.push(s); return `\u0001${keep.length - 1}\u0002`; };
  let t = formula;

  // protect quoted text and code based references (these do not depend on positions)
  t = t.replace(/"[^"]*"|'[^']*'/g, (m) => hold(m));
  t = t.replace(/\b(?:item|i)\s*\(\s*[^)]*\)(?:\.r[0-9]+)?(?:\.[a-z0-9_]+)?/gi, (m) => hold(m));
  t = t.replace(/#[0-9a-z][0-9a-z.\-]*/gi, (m) => hold(m));

  const row = (item: number, r: number): string | null => { const n = maps.mapRow(item, r); return n === null ? null : String(n + 1); };

  // I<n>[.R<m>][.prop]  (other item)
  t = t.replace(/\bi([0-9]+)(?:\.r([0-9]+))?(\.[a-z0-9_]+)?\b/gi, (_m, n, rr, prop) => {
    const oldItem = parseInt(n, 10) - 1;
    const newItem = maps.mapItem(oldItem);
    if (newItem === null) { broken++; return hold(REF); }
    let out = `I${newItem + 1}`;
    if (rr !== undefined) {
      const nr = row(oldItem, parseInt(rr, 10) - 1);
      if (nr === null) { broken++; return hold(REF); }
      out += `.R${nr}`;
    }
    return hold(out + (prop || ''));
  });

  // SUM(L1:L3) and SUM(R1:R4[.prop])  (same item)
  t = t.replace(/sum\s*\(\s*([lbhnq])([0-9]+)\s*:\s*\1([0-9]+)\s*\)/gi, (_m, c, a, b) => {
    const x = row(curOldItem, parseInt(a, 10) - 1), y = row(curOldItem, parseInt(b, 10) - 1);
    if (x === null || y === null) { broken++; return hold(REF); }
    return hold(`SUM(${String(c).toUpperCase()}${x}:${String(c).toUpperCase()}${y})`);
  });
  t = t.replace(/sum\s*\(\s*r([0-9]+)\s*:\s*r([0-9]+)(\.[a-z0-9_]+)?\s*\)/gi, (_m, a, b, prop) => {
    const x = row(curOldItem, parseInt(a, 10) - 1), y = row(curOldItem, parseInt(b, 10) - 1);
    if (x === null || y === null) { broken++; return hold(REF); }
    return hold(`SUM(R${x}:R${y}${prop || ''})`);
  });

  // L1 B1 H1 N1 Q1  (same item, column letter + row)
  t = t.replace(/\b([lbhnq])([0-9]+)\b/gi, (_m, c, r) => {
    const nr = row(curOldItem, parseInt(r, 10) - 1);
    if (nr === null) { broken++; return hold(REF); }
    return hold(`${String(c).toUpperCase()}${nr}`);
  });
  // R3.prop and R3  (same item)
  t = t.replace(/\br([0-9]+)(\.[a-z0-9_]+)?\b/gi, (_m, r, prop) => {
    const nr = row(curOldItem, parseInt(r, 10) - 1);
    if (nr === null) { broken++; return hold(REF); }
    return hold(`R${nr}${prop || ''}`);
  });

  // placeholders can be nested (a quoted string inside a protected ITEM(...)): restore until none are left
  for (let guard = 0; guard < 6 && /\u0001\d+\u0002/.test(t); guard++) t = t.replace(/\u0001(\d+)\u0002/g, (_m, i) => keep[Number(i)]);
  return { text: t, broken };
}

const isFormula = (v: unknown): v is string => typeof v === 'string' && v.trim().startsWith('=');

function remapRowFormulas<T extends { [k: string]: any }>(row: T, curOldItem: number, maps: RemapMaps, fields: string[]): { row: T; broken: number } {
  let broken = 0;
  let out: any = row;
  const set = (k: string, v: any) => { if (out === row) out = { ...row }; out[k] = v; };
  fields.forEach((f) => {
    if (isFormula(row[f])) { const r = remapFormula(row[f], curOldItem, maps); broken += r.broken; if (r.text !== row[f]) set(f, r.text); }
  });
  if (row.custom_fields && typeof row.custom_fields === 'object') {
    let cf: any = row.custom_fields, changed = false;
    Object.entries(row.custom_fields).forEach(([k, v]) => {
      if (isFormula(v)) { const r = remapFormula(v as string, curOldItem, maps); broken += r.broken; if (r.text !== v) { if (!changed) { cf = { ...row.custom_fields }; changed = true; } cf[k] = r.text; } }
    });
    if (changed) set('custom_fields', cf);
  }
  return { row: out, broken };
}
const FIELDS = ['no_of_units', 'length', 'breadth', 'height', 'formula'];

// ---- Estimate MB: items[].mb_rows ----------------------------------------------------------------
export function remapEstimateItems(prev: BOQItem[], next: BOQItem[]): { items: BOQItem[]; broken: number } {
  const prevPos = new Map(prev.map((it, i) => [it.id, i]));
  const nextPos = new Map(next.map((it, i) => [it.id, i]));
  const rowIds = (it: BOQItem) => (it.mb_rows || []).map((r) => r.id);
  const nextRowPos = next.map((it) => new Map(rowIds(it).map((id, i) => [id, i])));

  const maps: RemapMaps = {
    mapItem: (o) => { const it = prev[o]; if (!it) return null; const n = nextPos.get(it.id); return n === undefined ? null : n; },
    mapRow: (o, r) => {
      const it = prev[o]; if (!it) return null;
      const id = (it.mb_rows || [])[r]?.id; if (id === undefined) return r; // a reference beyond the existing rows stays as typed
      const ni = nextPos.get(it.id); if (ni === undefined) return null;
      const nr = nextRowPos[ni].get(id); return nr === undefined ? null : nr;
    },
  };
  // nothing moved (new items / rows only appended at the end): nothing to rewrite
  const prefix = (x: string[], y: string[]) => x.length <= y.length && x.every((id, k) => y[k] === id);
  const identity = prev.length <= next.length && prev.every((it, i) => next[i].id === it.id && prefix(rowIds(it), rowIds(next[i])));
  if (identity) return { items: next, broken: 0 };

  let broken = 0;
  const items = next.map((it) => {
    const oldIdx = prevPos.get(it.id);
    if (oldIdx === undefined || !(it.mb_rows || []).length) return it;
    let changed = false;
    const rows = (it.mb_rows || []).map((r: MBRow) => {
      const res = remapRowFormulas(r as any, oldIdx, maps, FIELDS);
      broken += res.broken; if (res.row !== r) changed = true;
      return res.row as MBRow;
    });
    return changed ? { ...it, mb_rows: rows } : it;
  });
  return { items, broken };
}

// ---- Valuation MB: rows grouped by (book, item) --------------------------------------------------
export function remapValuationRows(prev: ValuationMBRow[], next: ValuationMBRow[], itemIds: string[]): { rows: ValuationMBRow[]; broken: number } {
  const group = (rows: ValuationMBRow[]) => {
    const g = new Map<string, string[]>();
    rows.forEach((r) => { const k = `${r.mb_id}|${r.boq_item_id}`; (g.get(k) || g.set(k, []).get(k)!).push(r.id); });
    return g;
  };
  const pg = group(prev), ng = group(next);
  let identity = true;
  pg.forEach((ids, k) => { const n = ng.get(k) || []; if (ids.some((id, i) => n[i] !== id)) identity = false; });
  if (identity) return { rows: next, broken: 0 };
  let broken = 0;
  const rows = next.map((r) => {
    const cur = itemIds.indexOf(r.boq_item_id);
    if (cur < 0) return r;
    const maps: RemapMaps = {
      mapItem: (o) => o,
      mapRow: (o, rr) => {
        const itemId = itemIds[o]; if (itemId === undefined) return null;
        const k = `${r.mb_id}|${itemId}`;
        const id = (pg.get(k) || [])[rr]; if (id === undefined) return rr;
        const nr = (ng.get(k) || []).indexOf(id); return nr < 0 ? null : nr;
      },
    };
    const res = remapRowFormulas(r as any, cur, maps, FIELDS);
    broken += res.broken;
    return res.row as ValuationMBRow;
  });
  return { rows, broken };
}

/** the project's item order changed: valuation formulas that name items by position must follow */
export function remapValuationItemOrder(rows: ValuationMBRow[], oldIds: string[], newIds: string[]): { rows: ValuationMBRow[]; broken: number } {
  const same = oldIds.length <= newIds.length && oldIds.every((id, i) => newIds[i] === id);
  if (same) return { rows, broken: 0 };
  const maps: RemapMaps = { mapItem: (o) => { const id = oldIds[o]; if (id === undefined) return null; const n = newIds.indexOf(id); return n < 0 ? null : n; }, mapRow: (_o, r) => r };
  let broken = 0;
  const out = rows.map((r) => {
    const cur = oldIds.indexOf(r.boq_item_id);
    const res = remapRowFormulas(r as any, cur < 0 ? 0 : cur, maps, FIELDS);
    broken += res.broken; return res.row as ValuationMBRow;
  });
  return { rows: out, broken };
}
