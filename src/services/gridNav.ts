// Spreadsheet-style behaviour for the Measurement Book grids: keyboard navigation, range selection,
// copy / cut / paste (also with Excel), clear and fill down. The cells register themselves here by position
// (item, row, column); this module holds no React.
import { useSyncExternalStore } from 'react';
import { remapFormula } from './refRemap';

export interface GridPos { item: number; row: number; col: number }
export interface CellApi { set: (raw: string) => void; get: () => string; focus: () => void }

const key = (p: GridPos) => `${p.item}:${p.row}:${p.col}`;
const registry = new Map<string, { pos: GridPos; api: CellApi }>();

export function registerCell(pos: GridPos, api: CellApi): () => void {
  const k = key(pos);
  registry.set(k, { pos, api });
  return () => { if (registry.get(k)?.api === api) registry.delete(k); };
}
export const cellApi = (p: GridPos): CellApi | undefined => registry.get(key(p))?.api;
const all = (): GridPos[] => [...registry.values()].map((e) => e.pos).sort((a, b) => a.item - b.item || a.row - b.row || a.col - b.col);

/** the next cell in a direction; vertical moves continue into the next / previous item, Tab wraps to the next row */
export function neighbor(p: GridPos, dRow: number, dCol: number, wrap = false): GridPos | null {
  const cells = all();
  if (dRow !== 0) {
    const col = cells.filter((c) => c.col === p.col);
    const i = col.findIndex((c) => c.item === p.item && c.row === p.row);
    return col[i + dRow] ?? null;
  }
  const line = cells.filter((c) => c.item === p.item && c.row === p.row);
  const i = line.findIndex((c) => c.col === p.col);
  const t = line[i + dCol];
  if (t) return t;
  if (!wrap) return null;
  // wrap: last cell of the line -> first cell of the next line, and back
  const rows = [...new Set(cells.map((c) => `${c.item}:${c.row}`))];
  const r = rows.indexOf(`${p.item}:${p.row}`) + (dCol > 0 ? 1 : -1);
  if (r < 0 || r >= rows.length) return null;
  const [it, rw] = rows[r].split(':').map(Number);
  const target = cells.filter((c) => c.item === it && c.row === rw);
  return dCol > 0 ? target[0] : target[target.length - 1];
}
export function focusCell(p: GridPos | null): boolean {
  if (!p) return false;
  const api = cellApi(p);
  if (!api) return false;
  api.focus();
  return true;
}

// ---- selection store -------------------------------------------------------------------------
export interface Selection { anchor: GridPos; focus: GridPos }
let selection: Selection | null = null;
let active: GridPos | null = null;
let version = 0;
const listeners = new Set<() => void>();
const emit = () => { version++; listeners.forEach((l) => l()); };
export const getSelection = () => selection;
export const getActive = () => active;
export function setActive(p: GridPos | null) { active = p; }
export function setSelection(anchor: GridPos, focus: GridPos) {
  selection = anchor.item === focus.item ? { anchor, focus } : { anchor, focus: anchor };
  emit();
}
export function clearSelection() { if (selection) { selection = null; emit(); } }
export function useGridVersion(): number {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => version, () => version);
}
export function isSelected(p: GridPos): boolean {
  if (!selection || (selection.anchor.row === selection.focus.row && selection.anchor.col === selection.focus.col)) return false;
  const { anchor: a, focus: f } = selection;
  return p.item === a.item && p.row >= Math.min(a.row, f.row) && p.row <= Math.max(a.row, f.row) && p.col >= Math.min(a.col, f.col) && p.col <= Math.max(a.col, f.col);
}
export const isMultiSelection = () => !!selection && (selection.anchor.row !== selection.focus.row || selection.anchor.col !== selection.focus.col);

/** rows (that have editable cells) and columns of the current selection, in order */
function rangeLines(): { item: number; rows: number[]; cols: number[] } | null {
  if (!selection) return null;
  const { anchor: a, focus: f } = selection;
  const cells = all().filter((c) => c.item === a.item);
  const r0 = Math.min(a.row, f.row), r1 = Math.max(a.row, f.row), c0 = Math.min(a.col, f.col), c1 = Math.max(a.col, f.col);
  const rows = [...new Set(cells.filter((c) => c.row >= r0 && c.row <= r1).map((c) => c.row))];
  const cols = [...new Set(cells.filter((c) => c.col >= c0 && c.col <= c1).map((c) => c.col))].sort((x, y) => x - y);
  return { item: a.item, rows, cols };
}
const raw = (item: number, row: number, col: number) => cellApi({ item, row, col })?.get() ?? '';

// ---- text helpers ----------------------------------------------------------------------------
export const toTsv = (m: string[][]) => m.map((r) => r.join('\t')).join('\n');
export function parseTsv(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n');
  return lines.map((l) => l.split('\t'));
}
/** a copied formula moves down / up with the row it is pasted to, like a spreadsheet */
export function shiftFormulaRows(formula: string, delta: number): string {
  if (!delta || !formula.trim().startsWith('=')) return formula;
  return remapFormula(formula, 0, { mapItem: (o) => o, mapRow: (_o, r) => (r + delta >= 0 ? r + delta : null) }).text;
}

// ---- copy / paste / clear / fill -------------------------------------------------------------
let lastCopy: { text: string; item: number; rows: number[] } | null = null;

export function copySelection(): string | null {
  const rl = rangeLines();
  if (!rl || !rl.rows.length || !rl.cols.length) return null;
  const text = toTsv(rl.rows.map((r) => rl.cols.map((c) => raw(rl.item, r, c))));
  lastCopy = { text, item: rl.item, rows: rl.rows };
  return text;
}
export function clearSelectionCells(): number {
  const rl = rangeLines(); if (!rl) return 0;
  let n = 0;
  rl.rows.forEach((r) => rl.cols.forEach((c) => { cellApi({ item: rl.item, row: r, col: c })?.set(''); n++; }));
  return n;
}
/** paste a block starting at a cell (top-left of the selection, or the active cell) */
export function pasteBlock(text: string, start: GridPos): number {
  const block = parseTsv(text);
  const cells = all().filter((c) => c.item === start.item);
  const rows = [...new Set(cells.filter((c) => c.row >= start.row).map((c) => c.row))];
  const cols = [...new Set(cells.filter((c) => c.col >= start.col).map((c) => c.col))].sort((a, b) => a - b);
  const internal = lastCopy && lastCopy.text === text && lastCopy.item === start.item ? lastCopy : null;
  let n = 0;
  block.forEach((line, i) => {
    if (i >= rows.length) return;
    line.forEach((v, j) => {
      if (j >= cols.length) return;
      const delta = internal ? rows[i] - internal.rows[i] : 0;
      cellApi({ item: start.item, row: rows[i], col: cols[j] })?.set(internal ? shiftFormulaRows(v, delta) : v);
      n++;
    });
  });
  return n;
}
/** fill the selection with one value (a single value pasted over a range) */
export function fillSelectionWith(value: string): number {
  const rl = rangeLines(); if (!rl) return 0;
  let n = 0; rl.rows.forEach((r) => rl.cols.forEach((c) => { cellApi({ item: rl.item, row: r, col: c })?.set(value); n++; }));
  return n;
}
/** Ctrl+D: copy the top row of the selection down, or the cell above into the active cell */
export function fillDown(pos: GridPos): number {
  let n = 0;
  const rl = isMultiSelection() ? rangeLines() : null;
  if (rl && rl.rows.length > 1) {
    const top = rl.rows[0];
    rl.cols.forEach((c) => {
      const base = raw(rl.item, top, c);
      rl.rows.slice(1).forEach((r) => { cellApi({ item: rl.item, row: r, col: c })?.set(shiftFormulaRows(base, r - top)); n++; });
    });
    return n;
  }
  const above = neighbor(pos, -1, 0);
  if (above && above.item === pos.item) { cellApi(pos)?.set(shiftFormulaRows(raw(above.item, above.row, above.col), pos.row - above.row)); n = 1; }
  return n;
}
