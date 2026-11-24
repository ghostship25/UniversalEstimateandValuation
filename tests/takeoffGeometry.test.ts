import { describe, it, expect } from 'vitest';
import { geometryOf, quantOf, buildRow, pitchFactor, sendOptions } from '../src/modules/takeoff/takeoffGeometry';
import { toRowSpec } from '../src/modules/takeoff/takeoffStore';
import type { TakeoffMeasurement } from '../src/modules/takeoff/takeoffStore';

const P = (x: number, y: number) => ({ x, y });
const near = (a: number | undefined, b: number, tol = 1e-6) => expect(Math.abs((a ?? NaN) - b)).toBeLessThanOrEqual(tol);
const rect: TakeoffMeasurement = { id: 'm', page: 1, type: 'area', shape: 'rect', label: 'Room', points: [P(0, 0), P(120, 80)], deduct: false, links: [], sendAs: 'LxB' };

describe('takeoff geometry', () => {
  it('line / polyline lengths', () => {
    near(geometryOf('line', [P(0, 0), P(3, 4)]).length, 5);
    near(geometryOf('polyline', [P(0, 0), P(10, 0), P(10, 5)]).length, 15);
  });
  it('arc through three points', () => {
    near(geometryOf('arc', [P(0, 0), P(5, 5), P(10, 0)]).length, 5 * Math.PI, 1e-2);
    near(geometryOf('arc', [P(10, 0), P(10 * Math.cos(Math.PI / 4), 10 * Math.sin(Math.PI / 4)), P(0, 10)]).length, 5 * Math.PI, 1e-2);
  });
  it('rectangle, rotated rectangle, polygon', () => {
    const r = geometryOf('rect', [P(0, 0), P(12, 8)]);
    near(r.area, 96); near(r.perimeter, 40); near(r.dims?.a, 12); near(r.dims?.b, 8);
    near(geometryOf('rrect', [P(0, 0), P(10, 10), P(-3, 3)]).area, 60);
    near(geometryOf('polygon', [P(0, 0), P(4, 0), P(4, 3)]).area, 6);
  });
  it('circle, ellipse, angle', () => {
    const c = geometryOf('circle', [P(0, 0), P(0, 2)]);
    near(c.area, Math.PI * 4); near(c.perimeter, 4 * Math.PI);
    near(geometryOf('ellipse', [P(0, 0), P(6, 4)]).area, Math.PI * 6);
    near(geometryOf('angle', [P(1, 0), P(0, 0), P(0, 1)]).angle, 90);
  });
  it('slope factor', () => {
    near(pitchFactor({ mode: 'ratio', value: 0.75 }), 1.25);
    near(pitchFactor({ mode: 'deg', value: 60 }), 2, 1e-9);
    expect(pitchFactor(undefined)).toBe(1);
  });
});

describe('takeoff quantities and MB rows (0.1 m per unit: 120 x 80 units = 12 x 8 m)', () => {
  const q = quantOf(rect, 0.1, 'm');
  it('scales length and area', () => { near(q.value ?? NaN, 96); near(q.dims?.a, 12); near(q.perimeter ?? NaN, 40); });
  it('no scale gives no value', () => expect(quantOf(rect, undefined, 'm').value).toBeNull());
  it('area as Length x Breadth / Breadth x Length / Length x Height', () => {
    expect(buildRow(rect, q, 's', 'r')!.spec).toMatchObject({ length: 12, breadth: 8, height: 1 });
    expect(buildRow({ ...rect, sendAs: 'BxL' }, q, 's', 'r')!.spec).toMatchObject({ length: 8, breadth: 12 });
    expect(buildRow({ ...rect, sendAs: 'LxH' }, q, 's', 'r')!.spec).toMatchObject({ length: 12, breadth: 1, height: 8 });
    near(buildRow(rect, q, 's', 'r')!.qty, 96);
  });
  it('perimeter, depth (volume), deduction', () => {
    near(buildRow({ ...rect, sendAs: 'perimeter', h: 3 }, q, 's', 'r')!.qty, 120);
    near(buildRow({ ...rect, sendAs: 'value', h: 0.15 }, q, 's', 'r')!.qty, 14.4);
    near(buildRow({ ...rect, deduct: true }, q, 's', 'r')!.qty, -96);
  });
  it('slope and waste are carried in the No. column', () => {
    const r = buildRow({ ...rect, pitch: { mode: 'ratio', value: 0.75 }, waste: 10 }, q, 's', 'r')!;
    near(Number(r.spec.no_of_units), 1.375, 1e-4); near(r.qty, 96 * 1.375, 1e-2);
  });
  it('an empty extra factor is not used; a typed 0 gives 0', () => {
    near(buildRow({ ...rect, h: undefined, b: undefined }, q, 's', 'r')!.qty, 96);
    near(buildRow({ ...rect, h: 0 }, q, 's', 'r')!.qty, 0);
  });
  it('angles are not sent', () => expect(buildRow({ ...rect, type: 'angle', shape: 'angle', points: [P(1, 0), P(0, 0), P(0, 1)] }, quantOf({ ...rect, type: 'angle', shape: 'angle', points: [P(1, 0), P(0, 0), P(0, 1)] }, 0.1, 'm'), 's', 'r')).toBeNull());
  it('send options depend on the shape', () => {
    expect(sendOptions(rect).map((o) => o.id)).toEqual(['value', 'perimeter', 'LxB', 'BxL', 'LxH']);
    expect(sendOptions({ ...rect, shape: 'polygon' }).map((o) => o.id)).toEqual(['value', 'perimeter']);
  });
});

describe('legacy PDF takeoff row conversion', () => {
  const measurement: TakeoffMeasurement = {
    id: 'm1', page: 2, type: 'length', label: 'Wall', points: [], deduct: true, b: 0.2, h: 3, links: [],
  };

  it('maps dimensions, deduction, and takeoff metadata into an MB row', () => {
    expect(toRowSpec(measurement, 12.34567, 'Plan.pdf', 'row1')).toEqual({
      id: 'row1',
      particulars: 'Deduct: Wall',
      no_of_units: -1,
      length: 12.346,
      breadth: 0.2,
      height: 3,
      remarks: 'Takeoff: Plan.pdf p.2',
      takeoff_id: 'm1',
    });
  });
});

import { assembleRow, contribution } from '../src/modules/takeoff/takeoffGeometry';
import type { TakeoffRow } from '../src/modules/takeoff/takeoffStore';

describe('takeoff rows: one MB row from several measurements', () => {
  const row: TakeoffRow = { id: 'row1', itemId: 'i1', label: 'Footing F1', manual: {}, autoSync: true };
  const m = (id: string, type: any, shape: any, points: any[], extra: any = {}): TakeoffMeasurement => ({ id, page: 1, type, shape, label: id, points, deduct: false, links: [], rowId: 'row1', ...extra });
  const mk = (x: TakeoffMeasurement) => ({ m: x, q: quantOf(x, 0.1, 'm') }); // 0.1 m per unit
  const count = m('c', 'count', 'count', [P(0, 0), P(1, 1), P(2, 2), P(3, 3)]);              // 4 nos
  const lengthL = m('l', 'length', 'line', [P(0, 0), P(30, 0)], { col: 'L' });                // 3 m
  const lengthB = m('b', 'length', 'line', [P(0, 0), P(0, 12)], { col: 'B' });                // 1.2 m
  it('a count goes to No., lengths go to the column they were measured for', () => {
    const a = assembleRow(row, [mk(count), mk(lengthL), mk(lengthB)], 'p.pdf', 'mb1');
    expect(a.cols.N).toBe(4); expect(a.cols.L).toBeCloseTo(3, 9); expect(a.cols.B).toBeCloseTo(1.2, 9); expect(a.cols.H).toBeNull();
    expect(a.spec).toMatchObject({ no_of_units: 4, length: 3, breadth: 1.2, height: '' });
    expect(a.qty).toBeCloseTo(14.4, 6);                 // 4 x 3 x 1.2, the blank height is skipped
  });
  it('only one column measured is fine: the others stay blank', () => {
    const a = assembleRow(row, [mk(count)], 'p.pdf', 'mb1');
    expect(a.spec).toMatchObject({ no_of_units: 4, length: '', breadth: '', height: '' });
    expect(a.qty).toBe(4);
  });
  it('a typed value fills a column that is not measured; a measurement wins over it', () => {
    const typed = { ...row, manual: { H: 0.5, L: 99 } };
    const a = assembleRow(typed, [mk(lengthL)], 'p.pdf', 'mb1');
    expect(a.cols.L).toBe(3); expect(a.cols.H).toBe(0.5); expect(a.typed).toMatchObject({ L: false, H: true });
  });
  it('a typed 0 multiplies, like in the MB', () => expect(assembleRow({ ...row, manual: { N: 2, H: 0 } }, [mk(lengthL)], 'p.pdf', 'mb1').qty).toBe(0));
  it('several lengths into one column add up (runs of the same item)', () => {
    const l2 = m('l2', 'length', 'line', [P(0, 0), P(20, 0)], { col: 'L' });
    expect(assembleRow(row, [mk(lengthL), mk(l2)], 'p.pdf', 'mb1').cols.L).toBe(5);
  });
  it('a deduction subtracts from its column', () => {
    const d = m('d', 'length', 'line', [P(0, 0), P(10, 0)], { col: 'L', deduct: true });
    expect(assembleRow(row, [mk(lengthL), mk(d)], 'p.pdf', 'mb1').cols.L).toBe(2);
  });
  it('a rectangle fills L and B; perimeter and area-as-value fill L', () => {
    const rect = m('r', 'area', 'rect', [P(0, 0), P(120, 80)], { sendAs: 'LxB' });             // 12 x 8 m
    expect(assembleRow(row, [mk(rect)], 'p.pdf', 'mb1').cols).toMatchObject({ L: 12, B: 8 });
    expect(assembleRow(row, [mk({ ...rect, sendAs: 'perimeter' })], 'p.pdf', 'mb1').cols).toMatchObject({ L: 40, B: null });
    expect(assembleRow(row, [mk({ ...rect, sendAs: 'value' })], 'p.pdf', 'mb1').cols.L).toBe(96);
    expect(assembleRow(row, [mk({ ...rect, sendAs: 'LxH' })], 'p.pdf', 'mb1').cols).toMatchObject({ L: 12, H: 8 });
  });
  it('a rectangle plus a height measured as a length gives a volume', () => {
    const rect = m('r', 'area', 'rect', [P(0, 0), P(120, 80)], { sendAs: 'LxB' });
    const h = m('h', 'length', 'line', [P(0, 0), P(0, 5)], { col: 'H' });                      // 0.5 m
    expect(assembleRow(row, [mk(rect), mk(h)], 'p.pdf', 'mb1').qty).toBeCloseTo(48, 6);
  });
  it('warns when several areas would be multiplied together', () => {
    const r1 = m('r1', 'area', 'rect', [P(0, 0), P(10, 10)], { sendAs: 'LxB' }), r2 = m('r2', 'area', 'rect', [P(0, 0), P(20, 20)], { sendAs: 'LxB' });
    expect(assembleRow(row, [mk(r1), mk(r2)], 'p.pdf', 'mb1').warnings.length).toBe(1);
  });
  it('angles and unscaled lengths contribute nothing', () => {
    expect(contribution(lengthL, quantOf(lengthL, undefined, 'm'))).toBeNull();
    const ang = m('a', 'angle', 'angle', [P(1, 0), P(0, 0), P(0, 1)]);
    expect(contribution(ang, quantOf(ang, 0.1, 'm'))).toBeNull();
  });
});

import { unitDim } from '../src/modules/takeoff/takeoffGeometry';
describe('unit dimensionality and row dimension', () => {
  it('reads the dimension an item unit expects', () => {
    expect(unitDim('Cu.m.')).toBe(3); expect(unitDim('Sq.m.')).toBe(2); expect(unitDim('R.m.')).toBe(1);
    expect(unitDim('m')).toBe(1); expect(unitDim('Nos.')).toBe(0); expect(unitDim('kg')).toBeNull();
  });
  it('counts the lengths that multiply in a row', () => {
    const row2: TakeoffRow = { id: 'r', itemId: 'i', label: 'x', manual: {}, autoSync: true };
    const mm = (id: string, type: any, shape: any, pts: any[], extra: any = {}): TakeoffMeasurement => ({ id, page: 1, type, shape, label: id, points: pts, deduct: false, links: [], rowId: 'r', ...extra });
    const mk2 = (x: TakeoffMeasurement) => ({ m: x, q: quantOf(x, 0.1, 'm') });
    const count = mm('c', 'count', 'count', [P(0, 0)]);
    const L = mm('l', 'length', 'line', [P(0, 0), P(30, 0)], { col: 'L' });
    const B = mm('b', 'length', 'line', [P(0, 0), P(0, 12)], { col: 'B' });
    const rect = mm('r', 'area', 'rect', [P(0, 0), P(120, 80)], { sendAs: 'LxB' });
    const areaVal = mm('a', 'area', 'polygon', [P(0, 0), P(10, 0), P(10, 10)], { sendAs: 'value' });
    expect(assembleRow(row2, [mk2(count)], 's', 'x').dim).toBe(0);
    expect(assembleRow(row2, [mk2(count), mk2(L), mk2(B)], 's', 'x').dim).toBe(2);
    expect(assembleRow({ ...row2, manual: { H: 0.5 } }, [mk2(rect)], 's', 'x').dim).toBe(3);   // L, B from the rectangle + typed H
    expect(assembleRow(row2, [mk2(areaVal)], 's', 'x').dim).toBe(2);                          // an area written as one value is 2D
  });
});
