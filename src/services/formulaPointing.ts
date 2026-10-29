import { useSyncExternalStore } from 'react';

/**
 * Excel-style "point and click" cell linking for Measurement Book grids.
 *
 * While a cell is being edited and its draft is a formula that is waiting for an operand
 * (e.g. "=", "=L2*", "=SUM(" ...), clicking any other linkable cell inserts a reference to it
 * into the draft instead of leaving the cell. Enter commits, Esc cancels.
 *
 * Reference grammar produced (all understood by evaluateMBFormula):
 *   same item  : L3  B3  H3  N3  Q3   (column letter + row number)   |  R3.Thickness (custom column)
 *   other item : I2.R3.L  I2.R3.B  I2.R3.H  I2.R3.N  I2.R3.QTY  I2.R3.Thickness
 *   item total : I2.QTY
 */

export type LinkProp = 'length' | 'breadth' | 'height' | 'no_of_units' | 'qty' | string;

export interface LinkTarget {
  /** 0-based position of the item in the list handed to evaluateMBFormula */
  itemIdx: number;
  /** 0-based position of the row in the item's row list; null for item-level targets */
  rowIdx: number | null;
  /** canonical column: length | breadth | height | no_of_units | qty | <custom column name> */
  prop: LinkProp;
}

export interface PointSession {
  origin: LinkTarget | null;
  /** true when the draft is waiting for an operand (or a previously inserted ref can be replaced) */
  canPoint: () => boolean;
  insertRef: (ref: string) => void;
  getDraft: () => string;
}

const STD: Record<string, string> = { length: 'L', breadth: 'B', height: 'H', no_of_units: 'N', qty: 'Q' };

export function buildRef(origin: LinkTarget | null, target: LinkTarget): string {
  const sameItem = !!origin && origin.itemIdx === target.itemIdx;
  if (target.rowIdx === null) return `I${target.itemIdx + 1}.QTY`;
  const row = target.rowIdx + 1;
  const std = STD[target.prop];
  if (sameItem) return std ? `${std}${row}` : `R${row}.${target.prop}`;
  if (target.prop === 'qty') return `I${target.itemIdx + 1}.R${row}.QTY`;
  return `I${target.itemIdx + 1}.R${row}.${std || target.prop}`;
}

export function sameTarget(a: LinkTarget | null, b: LinkTarget | null): boolean {
  return !!a && !!b && a.itemIdx === b.itemIdx && a.rowIdx === b.rowIdx && a.prop === b.prop;
}

export function targetKey(t: LinkTarget): string {
  return `${t.itemIdx}:${t.rowIdx ?? 'x'}:${String(t.prop).toLowerCase()}`;
}

const PROP_ALIASES: Record<string, string> = {
  l: 'length', length: 'length', b: 'breadth', breadth: 'breadth', h: 'height', height: 'height',
  n: 'no_of_units', no: 'no_of_units', units: 'no_of_units', q: 'qty', qty: 'qty', quantity: 'qty',
};
const normProp = (p?: string) => {
  const k = (p || 'qty').toLowerCase();
  return PROP_ALIASES[k] || k;
};

/** Keys of the cells referenced by a formula draft (used to highlight linked cells). */
export function referencedKeys(draft: string, origin: LinkTarget | null): Set<string> {
  const keys = new Set<string>();
  if (!draft.trim().startsWith('=')) return keys;
  const body = draft.slice(1);
  const rest = body.replace(/\bi(\d+)\.r(\d+)(?:\.([a-z0-9_]+))?/gi, (_, i, r, p) => {
    keys.add(`${+i - 1}:${+r - 1}:${normProp(p).toLowerCase()}`);
    return ' ';
  }).replace(/\bi(\d+)\.qty\b/gi, (_, i) => {
    keys.add(`${+i - 1}:x:qty`);
    return ' ';
  });
  if (origin) {
    const o = origin.itemIdx;
    rest
      .replace(/\br(\d+)\.([a-z0-9_]+)/gi, (_, r, p) => {
        keys.add(`${o}:${+r - 1}:${normProp(p).toLowerCase()}`);
        return ' ';
      })
      .replace(/\b([lbhnq])(\d+)\b/gi, (_, c, r) => {
        keys.add(`${o}:${+r - 1}:${normProp(c).toLowerCase()}`);
        return ' ';
      });
  }
  return keys;
}

// ---- tiny external store -------------------------------------------------------------------
let session: PointSession | null = null;
let version = 0;
const listeners = new Set<() => void>();
const emit = () => { version++; listeners.forEach((l) => l()); };

export const formulaPointing = {
  setSession(s: PointSession | null) { session = s; emit(); },
  clearIf(s: PointSession) { if (session === s) { session = null; emit(); } },
  getSession: () => session,
  /** call when the draft changed so highlights refresh */
  touch: emit,
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  getVersion: () => version,
};

export function usePointingVersion(): number {
  return useSyncExternalStore(formulaPointing.subscribe, formulaPointing.getVersion, formulaPointing.getVersion);
}
