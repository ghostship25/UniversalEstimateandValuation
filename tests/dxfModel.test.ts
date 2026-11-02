import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parseDxf, polyLength, polyArea } from '../src/modules/takeoff/dxfModel';

const model = parseDxf(readFileSync('samples/takeoff-sample-plan.dxf', 'utf8'));
const layer = (n: string) => model.layers.find((l) => l.name === n)!;
const near = (a: number, b: number, tol = 1e-3) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

describe('DXF takeoff model (sample plan, metres)', () => {
  it('reads the drawing units from the file', () => { expect(model.metersPerUnit).toBe(1); expect(model.unitName).toBe('metres'); });
  it('closed polyline layers: length and area', () => {
    near(layer('WALLS').length, 40); near(layer('WALLS').area, 96);
    near(layer('SLAB').length, 48); near(layer('SLAB').area, 140);
  });
  it('lines, bulge polyline and arc add up', () => near(layer('PIPES').length, 2 * Math.PI + 10 + 5 + 1.5 * Math.PI, 1e-3));
  it('circle length and area', () => { near(layer('COLUMNS').length, 2 * Math.PI); near(layer('COLUMNS').area, Math.PI); });
  it('counts block references by name', () => expect(model.blocks.COLUMN).toHaveLength(5));
  it('every entity has drawable geometry', () => expect(model.entities.every((e) => e.prims.length > 0)).toBe(true));
  it('rejects binary DXF', () => expect(() => parseDxf('AutoCAD Binary DXF\r\n\x1a\x00')).toThrow(/binary/i));
});

describe('bulge geometry', () => {
  const half = [{ x: 0, y: 0, bulge: 1 }, { x: 4, y: 0 }];
  it('semicircle length', () => near(polyLength(half, false), 2 * Math.PI));
  it('two bulged vertices make a full circle', () => {
    const circle = [{ x: 0, y: 0, bulge: 1 }, { x: 4, y: 0, bulge: 1 }];
    near(polyLength(circle, true), 4 * Math.PI);
    near(polyArea(circle), 4 * Math.PI);
  });
  it('closed semicircle + chord area', () => near(polyArea(half), (Math.PI * 4) / 2));
});
