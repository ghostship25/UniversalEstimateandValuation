import { describe, it, expect } from 'vitest';
import { computeRowBaseQuantity } from '../src/services/mbDependencyEngine';
import { evalCellValue, parseNumericText, isBlankCell } from '../src/services/mbCellValue';

const all = { no: true, l: true, b: true, h: true };
const q = (no: number | null, l: number | null, b: number | null, h: number | null, use = all) => computeRowBaseQuantity({ no, l, b, h }, use);

describe('MB row quantity: a typed 0 multiplies, an empty or text cell is skipped', () => {
  it('multiplies all numbers', () => expect(q(2, 5, 3, 4)).toBe(120));
  it('N=1 L=3 B=6 H=0 gives 0', () => expect(q(1, 3, 6, 0)).toBe(0));
  it('N=1 L=3 B=6 H empty gives 18', () => expect(q(1, 3, 6, null)).toBe(18));
  it('a zero in any column gives 0', () => {
    expect(q(0, 5, 2, 3)).toBe(0);
    expect(q(2, 0, 3, 4)).toBe(0);
    expect(q(2, 5, 0, 4)).toBe(0);
  });
  it('blank columns are skipped wherever they are', () => {
    expect(q(null, 5, 2, 3)).toBe(30);
    expect(q(2, null, 3, 4)).toBe(24);
    expect(q(2, 5, null, null)).toBe(10);
  });
  it('all blank gives 0, not 1', () => expect(q(null, null, null, null)).toBe(0));
  it('keeps negative values (deductions)', () => expect(q(-1, 2, 3, null)).toBe(-6));
  it('only included columns take part', () => {
    expect(q(2, 5, 3, 4, { no: true, l: true, b: false, h: false })).toBe(10);
    expect(q(2, 0, 3, 4, { no: true, l: false, b: true, h: true })).toBe(24); // the excluded 0 is ignored
  });
});

describe('reading a cell', () => {
  const ev = (f: string) => (f === '=L1*2' ? 10 : NaN);
  it('numbers, including 0', () => { expect(evalCellValue(0, ev)).toBe(0); expect(evalCellValue(3.5, ev)).toBe(3.5); expect(evalCellValue('12', ev)).toBe(12); });
  it('empty / undefined / null are blank', () => { expect(evalCellValue('', ev)).toBeNull(); expect(evalCellValue('  ', ev)).toBeNull(); expect(evalCellValue(undefined, ev)).toBeNull(); expect(evalCellValue(null, ev)).toBeNull(); });
  it('text is blank', () => { expect(evalCellValue('NA', ev)).toBeNull(); expect(evalCellValue('m', ev)).toBeNull(); });
  it('formulas use their result; an unresolvable formula is blank', () => { expect(evalCellValue('=L1*2', ev)).toBe(10); expect(evalCellValue('=bad', ev)).toBeNull(); });
  it('numbers with thousands separators', () => expect(parseNumericText('1,250.5')).toBe(1250.5));
  it('isBlankCell', () => { expect(isBlankCell('')).toBe(true); expect(isBlankCell('NA')).toBe(true); expect(isBlankCell(0)).toBe(false); expect(isBlankCell('=L1')).toBe(false); });
});
