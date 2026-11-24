import { describe, it, expect, beforeEach } from 'vitest';
import { registerCell, neighbor, setSelection, clearSelection, copySelection, pasteBlock, clearSelectionCells, fillDown, fillSelectionWith, isSelected, toTsv, parseTsv, shiftFormulaRows, setActive } from '../src/services/gridNav';

// a fake grid: item 0 has rows 0,2,3 (row 1 is a heading) x columns 0..3 ; item 1 has rows 0,1
const store = new Map<string, string>();
const k = (i: number, r: number, c: number) => `${i}:${r}:${c}`;
let unregs: (() => void)[] = [];
function build() {
  unregs.forEach((u) => u()); unregs = []; store.clear(); clearSelection();
  const layout: Record<number, number[]> = { 0: [0, 2, 3], 1: [0, 1] };
  Object.entries(layout).forEach(([it, rows]) => rows.forEach((r) => [0, 1, 2, 3].forEach((c) => {
    store.set(k(+it, r, c), c === 1 && r === 2 ? '=L1*2' : String(r * 10 + c));
    unregs.push(registerCell({ item: +it, row: r, col: c }, { set: (v) => store.set(k(+it, r, c), v), get: () => store.get(k(+it, r, c)) ?? '', focus: () => {} }));
  })));
}
beforeEach(build);

describe('grid navigation', () => {
  it('moves down, skipping heading rows, and continues into the next item', () => {
    expect(neighbor({ item: 0, row: 0, col: 1 }, 1, 0)).toEqual({ item: 0, row: 2, col: 1 });
    expect(neighbor({ item: 0, row: 3, col: 1 }, 1, 0)).toEqual({ item: 1, row: 0, col: 1 });
    expect(neighbor({ item: 1, row: 1, col: 1 }, 1, 0)).toBeNull();
    expect(neighbor({ item: 0, row: 2, col: 1 }, -1, 0)).toEqual({ item: 0, row: 0, col: 1 });
  });
  it('moves sideways and Tab wraps to the next row', () => {
    expect(neighbor({ item: 0, row: 0, col: 0 }, 0, 1)).toEqual({ item: 0, row: 0, col: 1 });
    expect(neighbor({ item: 0, row: 0, col: 3 }, 0, 1)).toBeNull();
    expect(neighbor({ item: 0, row: 0, col: 3 }, 0, 1, true)).toEqual({ item: 0, row: 2, col: 0 });
    expect(neighbor({ item: 0, row: 2, col: 0 }, 0, -1, true)).toEqual({ item: 0, row: 0, col: 3 });
  });
});

describe('range selection, copy, paste, clear, fill', () => {
  it('selects a rectangle within one item only', () => {
    setSelection({ item: 0, row: 0, col: 0 }, { item: 0, row: 2, col: 1 });
    expect(isSelected({ item: 0, row: 2, col: 1 })).toBe(true);
    expect(isSelected({ item: 0, row: 3, col: 1 })).toBe(false);
    expect(isSelected({ item: 1, row: 0, col: 0 })).toBe(false);
  });
  it('copies the range as tab separated text with raw formulas', () => {
    setSelection({ item: 0, row: 0, col: 0 }, { item: 0, row: 2, col: 1 });
    expect(copySelection()).toBe('0\t1\n20\t=L1*2');
  });
  it('pasting a copied block shifts formulas to the new rows', () => {
    setSelection({ item: 0, row: 2, col: 0 }, { item: 0, row: 2, col: 1 });
    const text = copySelection()!;               // row 2: "20\t=L1*2"
    pasteBlock(text, { item: 0, row: 3, col: 0 }); // pasted one row lower
    expect(store.get(k(0, 3, 0))).toBe('20');
    expect(store.get(k(0, 3, 1))).toBe('=L2*2');
  });
  it('pasting text from a spreadsheet fills cells to the right and below', () => {
    pasteBlock('1\t2\n3\t4', { item: 0, row: 0, col: 1 });
    expect([store.get(k(0, 0, 1)), store.get(k(0, 0, 2)), store.get(k(0, 2, 1)), store.get(k(0, 2, 2))]).toEqual(['1', '2', '3', '4']);
  });
  it('anything that does not fit is ignored, never wrapped', () => expect(pasteBlock('9\t9\t9\t9\t9', { item: 0, row: 0, col: 2 })).toBe(2));
  it('clears a range', () => { setSelection({ item: 0, row: 0, col: 0 }, { item: 0, row: 0, col: 3 }); expect(clearSelectionCells()).toBe(4); expect(store.get(k(0, 0, 2))).toBe(''); });
  it('fills a range with one value', () => { setSelection({ item: 0, row: 0, col: 0 }, { item: 0, row: 3, col: 0 }); fillSelectionWith('7'); expect([store.get(k(0, 0, 0)), store.get(k(0, 2, 0)), store.get(k(0, 3, 0))]).toEqual(['7', '7', '7']); });
  it('fill down copies the top row, shifting formulas', () => {
    store.set(k(0, 0, 1), '=L2+1');
    setSelection({ item: 0, row: 0, col: 1 }, { item: 0, row: 3, col: 1 });
    fillDown({ item: 0, row: 0, col: 1 });
    expect(store.get(k(0, 2, 1))).toBe('=L4+1');  // two rows down
    expect(store.get(k(0, 3, 1))).toBe('=L5+1');  // three rows down
  });
  it('Ctrl+D on a single cell copies the cell above', () => {
    clearSelection(); setActive({ item: 0, row: 3, col: 1 });
    fillDown({ item: 0, row: 3, col: 1 });
    expect(store.get(k(0, 3, 1))).toBe('=L2*2');
  });
});

describe('text helpers', () => {
  it('tsv round trip, including Excel line endings', () => {
    expect(parseTsv('a\tb\r\nc\td\r\n')).toEqual([['a', 'b'], ['c', 'd']]);
    expect(toTsv([['1', '2'], ['3', '4']])).toBe('1\t2\n3\t4');
  });
  it('shifts formulas by rows, leaves numbers alone', () => {
    expect(shiftFormulaRows('=L1+B2', 2)).toBe('=L3+B4');
    expect(shiftFormulaRows('12.5', 3)).toBe('12.5');
    expect(shiftFormulaRows('=L1', -1)).toBe('=#REF!');
  });
});
