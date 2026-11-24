// Undo / redo history for the whole document. Snapshots are plain references to immutable state, so keeping
// 100 of them is cheap. Changes that arrive close together (an edit and the recalculation it triggers) are one step.
export interface HistoryOptions { limit?: number; windowMs?: number; now?: () => number }

export class DocHistory<T> {
  private past: T[] = [];
  private future: T[] = [];
  private present: T;
  private lastTime = 0;
  private limit: number;
  private windowMs: number;
  private now: () => number;

  constructor(initial: T, opts: HistoryOptions = {}) {
    this.present = initial;
    this.limit = opts.limit ?? 100;
    this.windowMs = opts.windowMs ?? 700;
    this.now = opts.now ?? (() => Date.now());
  }

  /** register a new state. Returns true when it was recorded (it differs from the current one). */
  record(next: T, same: (a: T, b: T) => boolean): boolean {
    if (same(this.present, next)) return false;
    const t = this.now();
    if (t - this.lastTime > this.windowMs || this.past.length === 0) {
      this.past.push(this.present);
      if (this.past.length > this.limit) this.past.shift();
    }
    this.present = next;
    this.future = [];
    this.lastTime = t;
    return true;
  }
  /** a derived update (e.g. the recalculation that follows an edit): fold it into the current step */
  merge(next: T) { this.present = next; }
  undo(): T | null {
    if (!this.past.length) return null;
    this.future.push(this.present);
    this.present = this.past.pop() as T;
    this.lastTime = 0; // the next edit starts a new step
    return this.present;
  }
  redo(): T | null {
    if (!this.future.length) return null;
    this.past.push(this.present);
    this.present = this.future.pop() as T;
    this.lastTime = 0;
    return this.present;
  }
  /** the state was replaced from outside (restore, project switch): start a fresh history */
  reset(state: T) { this.past = []; this.future = []; this.present = state; this.lastTime = 0; }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  get depth() { return this.past.length; }
}
