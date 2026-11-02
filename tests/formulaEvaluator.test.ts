import { describe, it, expect } from 'vitest';
import { evaluateMBFormula } from '../src/services/mbFormulaEvaluator';

const r = (id: string, length: any, extra: any = {}) => ({ id, particulars: id, no_of_units: 1, length, breadth: 1, height: 1, quantity: 0, ...extra });
const A: any = { id: 'A', item_code: '1.1', mb_rows: [r('a1', 10), r('a2', '=L1*2'), r('a3', 4)] };
const B: any = { id: 'B', item_code: '2.1', mb_rows: [r('b1', '=I1.R2.L'), r('b2', 7)] };
const items = [A, B];

describe('formula evaluator', () => {
  it('same-item column + row reference', () => expect(evaluateMBFormula('=L1*2', A.mb_rows, 1, items)).toBe(20));
  it('cross-item reference to a value', () => expect(evaluateMBFormula('=I1.R1.L', B.mb_rows, 0, items)).toBe(10));
  it('cross-item reference to a cell that is itself a formula', () => expect(evaluateMBFormula('=I1.R2.L', B.mb_rows, 0, items)).toBe(20));
  it('REGRESSION: a formula cell at the same row number in another item is not a circular reference', () => {
    const A2: any = { id: 'A', item_code: '1.1', mb_rows: [r('a1', '=L2*2'), r('a2', 12.5)] };
    const B2: any = { id: 'B', item_code: '2.1', mb_rows: [r('b1', '=I1.R1.L')] };
    expect(evaluateMBFormula('=I1.R1.L', B2.mb_rows, 0, [A2, B2])).toBe(25);
  });
  it('ranges and item totals', () => {
    expect(evaluateMBFormula('=SUM(L1:L3)', A.mb_rows, 99, items)).toBe(34); // evaluated from a cell outside the range
    expect(evaluateMBFormula('=I1.QTY', B.mb_rows, 0, items)).toBeGreaterThanOrEqual(0);
  });
  it('code based references', () => expect(evaluateMBFormula('=ITEM("1.1").R1.L', B.mb_rows, 1, items)).toBe(10));
  it('a true self reference does not hang', () => {
    const S: any = { id: 'S', item_code: '9', mb_rows: [r('s1', '=L1+1')] };
    expect(Number.isFinite(evaluateMBFormula('=L1+1', S.mb_rows, 0, [S]))).toBe(true);
  });
});
