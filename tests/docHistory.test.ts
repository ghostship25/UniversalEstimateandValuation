import { describe, it, expect } from 'vitest';
import { DocHistory } from '../src/services/docHistory';

const same = (a: { v: number }, b: { v: number }) => a.v === b.v;
const mk = () => { let t = 0; const h = new DocHistory({ v: 0 }, { windowMs: 700, now: () => t }); return { h, tick: (ms: number) => { t += ms; } }; };

describe('undo / redo history', () => {
  it('undoes and redoes separate steps', () => {
    const { h, tick } = mk();
    h.record({ v: 1 }, same); tick(2000); h.record({ v: 2 }, same); tick(2000); h.record({ v: 3 }, same);
    expect(h.undo()).toEqual({ v: 2 }); expect(h.undo()).toEqual({ v: 1 }); expect(h.undo()).toEqual({ v: 0 });
    expect(h.undo()).toBeNull();
    expect(h.redo()).toEqual({ v: 1 }); expect(h.redo()).toEqual({ v: 2 });
  });
  it('changes within the window are one step (an edit plus its recalculation)', () => {
    const { h, tick } = mk();
    h.record({ v: 1 }, same); tick(50); h.record({ v: 2 }, same); tick(50); h.record({ v: 3 }, same);
    expect(h.undo()).toEqual({ v: 0 });
    expect(h.canUndo).toBe(false);
  });
  it('a new edit after an undo clears redo', () => {
    const { h, tick } = mk();
    h.record({ v: 1 }, same); tick(2000); h.record({ v: 2 }, same);
    h.undo(); expect(h.canRedo).toBe(true);
    tick(10); h.record({ v: 9 }, same);
    expect(h.canRedo).toBe(false);
    expect(h.undo()).toEqual({ v: 1 });
  });
  it('an edit right after an undo is its own step, not merged', () => {
    const { h, tick } = mk();
    h.record({ v: 1 }, same); tick(2000); h.record({ v: 2 }, same);
    h.undo(); h.record({ v: 5 }, same);
    expect(h.undo()).toEqual({ v: 1 });
  });
  it('identical state is ignored', () => { const { h } = mk(); expect(h.record({ v: 0 }, same)).toBe(false); expect(h.canUndo).toBe(false); });
  it('keeps at most the limit', () => {
    let t = 0; const h = new DocHistory({ v: 0 }, { limit: 3, windowMs: 1, now: () => t });
    for (let i = 1; i <= 10; i++) { t += 10; h.record({ v: i }, same); }
    expect(h.depth).toBe(3);
  });
  it('a derived update is folded into the step, however late it arrives', () => {
    const { h, tick } = mk();
    h.record({ v: 1 }, same); tick(5000); h.merge({ v: 11 });
    expect(h.undo()).toEqual({ v: 0 });
    expect(h.redo()).toEqual({ v: 11 });
  });
  it('reset starts a fresh history', () => { const { h, tick } = mk(); h.record({ v: 1 }, same); tick(2000); h.record({ v: 2 }, same); h.reset({ v: 7 }); expect(h.canUndo).toBe(false); expect(h.canRedo).toBe(false); });
});
