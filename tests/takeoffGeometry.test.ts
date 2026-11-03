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
    near(r.spec.no_of_units, 1.375, 1e-4); near(r.qty, 96 * 1.375, 1e-2);
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
