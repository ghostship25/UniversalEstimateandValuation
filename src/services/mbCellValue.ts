/**
 * How a Measurement Book cell is read when the quantity is calculated.
 *
 *   number, e.g. 3 or 0       -> that number. A typed 0 is a real value and multiplies the quantity to 0.
 *   formula, e.g. =L1*2       -> its result (a formula that cannot be evaluated counts as blank)
 *   arithmetic, e.g. 10*2.5   -> its result
 *   empty cell                -> blank (null): skipped, as on a paper MB
 *   text, e.g. "NA", "m"      -> blank (null): skipped
 */
const NUMERIC = /^[-+]?(\d+(\.\d*)?|\.\d+)(e[-+]?\d+)?$/i;

export function parseNumericText(s: string): number | null {
  const t = s.trim().replace(/,/g, '');
  if (!t || !NUMERIC.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function isBlankCell(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'number') return !Number.isFinite(v);
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return true;
    if (t.startsWith('=')) return false;
    return parseNumericText(t) === null && !/^[\d\s.,+\-*/()]+$/.test(t);
  }
  return true;
}

/** value of a cell, or null when the cell is blank / text (skipped in the multiplication) */
export function evalCellValue(val: unknown, evalFormula: (formula: string) => number): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val !== 'string') return null;
  const t = val.trim();
  if (!t) return null;
  if (t.startsWith('=')) {
    const r = evalFormula(t);
    return Number.isFinite(r) ? r : null;
  }
  const n = parseNumericText(t);
  if (n !== null) return n;
  // plain arithmetic typed without "=", e.g. 10*2.5 or 12-3
  if (/^[\d\s.,+\-*/()]+$/.test(t) && /\d/.test(t) && /[+\-*/]/.test(t)) {
    const r = evalFormula('=' + t);
    return Number.isFinite(r) ? r : null;
  }
  return null; // text
}
