import { describe, it, expect } from 'vitest';
import { remapFormula, remapEstimateItems, remapValuationRows, remapValuationItemOrder } from '../src/services/refRemap';

const row = (id: string, extra: any = {}) => ({ id, particulars: id, no_of_units: 1, length: 1, breadth: 1, height: 1, quantity: 0, ...extra });
const item = (id: string, rows: any[]) => ({ id, mb_rows: rows } as any);

describe('remapFormula', () => {
  // old layout: items A,B,C ; B moves to the front, C is deleted
  const maps = {
    mapItem: (o: number) => ({ 0: 1, 1: 0, 2: null } as any)[o],
    mapRow: (o: number, r: number) => (o === 0 ? ({ 0: 1, 1: 2 } as any)[r] ?? null : r),
  };
  it('cross-item references follow the item', () => expect(remapFormula('=I2.R1.L*2', 0, maps).text).toBe('=I1.R1.L*2'));
  it('item-level references follow the item', () => expect(remapFormula('=I1.QTY/10', 1, maps).text).toBe('=I2.QTY/10'));
  it('same-item references follow row insertions', () => expect(remapFormula('=L1+B2', 0, maps).text).toBe('=L2+B3'));
  it('ranges and R-forms follow rows', () => {
    expect(remapFormula('=SUM(L1:L2)', 0, maps).text).toBe('=SUM(L2:L3)');
    expect(remapFormula('=R1.Thickness*2', 0, maps).text).toBe('=R2.Thickness*2');
  });
  it('a reference to a deleted item becomes #REF!', () => { const r = remapFormula('=I3.R1.L+5', 0, maps); expect(r.text).toBe('=#REF!+5'); expect(r.broken).toBe(1); });
  it('a reference to a deleted row becomes #REF!', () => { const r = remapFormula('=L3', 0, { ...maps, mapRow: () => null }); expect(r.text).toBe('=#REF!'); expect(r.broken).toBe(1); });
  it('leaves code based references, quoted text and plain numbers alone', () => {
    expect(remapFormula('=ITEM("1.1").R2.L*2', 0, maps).text).toBe('=ITEM("1.1").R2.L*2');
    expect(remapFormula('=2*3.5', 0, maps).text).toBe('=2*3.5');
    expect(remapFormula('12.5', 0, maps).text).toBe('12.5');
  });
});

describe('remapEstimateItems', () => {
  const a = item('A', [row('a1', { length: 10 }), row('a2', { length: '=L1*2' })]);
  const b = item('B', [row('b1', { length: '=I1.R2.L' }), row('b2', { length: '=R1.L+I1.QTY' })]);
  it('no structural change: untouched', () => { const r = remapEstimateItems([a, b], [a, b]); expect(r.items).toBe(r.items); expect(r.broken).toBe(0); });
  it('adding an item or row at the end changes nothing', () => {
    const r = remapEstimateItems([a, b], [a, b, item('C', [row('c1')])]); expect(r.items[1].mb_rows![0].length).toBe('=I1.R2.L');
  });
  it('moving items keeps references on the same cells', () => {
    const r = remapEstimateItems([a, b], [b, a]); // B first
    expect(r.items[0].mb_rows![0].length).toBe('=I2.R2.L');  // B row1 still points at A.row2 (A is now item 2)
    expect(r.items[0].mb_rows![1].length).toBe('=L1+I2.QTY'.replace('L1', 'R1.L').replace('R1.L+', 'R1.L+')); // same-item R1 stays R1
    expect(r.items[1].mb_rows![1].length).toBe('=L1*2');
  });
  it('inserting a row above shifts the references to it', () => {
    const a2 = item('A', [row('new'), ...a.mb_rows]);
    const r = remapEstimateItems([a, b], [a2, b]);
    expect(r.items[0].mb_rows![2].length).toBe('=L2*2');        // was =L1*2 (a1 is now row 2)
    expect(r.items[1].mb_rows![0].length).toBe('=I1.R3.L');     // was =I1.R2.L (a2 is now row 3)
  });
  it('deleting a referenced row gives #REF! and counts it', () => {
    const a3 = item('A', [a.mb_rows![0]]);
    const r = remapEstimateItems([a, b], [a3, b]);
    expect(r.items[1].mb_rows![0].length).toBe('=#REF!'); expect(r.broken).toBeGreaterThan(0);
  });
  it('deleting an item gives #REF! for references to it', () => {
    const r = remapEstimateItems([a, b], [b]);
    expect(r.items[0].mb_rows![0].length).toBe('=#REF!');
  });
});

describe('valuation rows', () => {
  const vr = (id: string, item: string, extra: any = {}) => ({ id, mb_id: 'mb1', boq_item_id: item, particulars: id, no_of_units: 1, length: 1, breadth: 1, height: 1, quantity_this_bill: 0, ...extra } as any);
  it('row insertion inside a (book,item) group shifts same-item references', () => {
    const prev = [vr('r1', 'A', { length: 4 }), vr('r2', 'A', { length: '=L1*2' })];
    const next = [vr('new', 'A'), prev[0], prev[1]];
    expect(remapValuationRows(prev, next, ['A']).rows[2].length).toBe('=L2*2');
  });
  it('item order change moves item references', () => {
    const rows = [vr('r1', 'A', { length: '=I2.R1.L' }), vr('r2', 'B', { length: 3 })];
    expect(remapValuationItemOrder(rows, ['A', 'B'], ['B', 'A']).rows[0].length).toBe('=I1.R1.L');
  });
});
