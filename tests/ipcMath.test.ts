import { describe, it, expect } from 'vitest';
import { computeIpc } from '../src/services/ipcMath';

const base = { grossThisBill: 100000, grossBeforeThisBill: 0, retentionPercent: 5, advanceGiven: 0, advanceRecoveryPercent: 0, advanceRecoveredBefore: 0, taxPercent: 10 };

describe('IPC: price adjustment and retention release', () => {
  const b = { grossThisBill: 100000, grossBeforeThisBill: 0, retentionPercent: 10, advanceGiven: 0, advanceRecoveryPercent: 0, advanceRecoveredBefore: 0, taxPercent: 0 };
  it('price adjustment raises the certified value, retention follows it', () => {
    const r = computeIpc({ ...b, priceAdjustmentPercent: 5 });
    expect(r).toMatchObject({ priceAdjustment: 5000, adjustedGross: 105000, retention: 10500, net: 94500 });
    expect(r.grossCumulative).toBe(100000);
  });
  it('a negative adjustment reduces it', () => expect(computeIpc({ ...b, priceAdjustmentPercent: -2 }).adjustedGross).toBe(98000));
  it('retention is released back into the payment, capped at what is held', () => {
    const r = computeIpc({ ...b, retentionHeldBefore: 20000, retentionRelease: 15000 });
    expect(r.retention).toBe(10000); expect(r.retentionReleased).toBe(15000);
    expect(r.retentionHeld).toBe(15000); expect(r.net).toBe(90000 + 15000);
    const capped = computeIpc({ ...b, retentionHeldBefore: 0, retentionRelease: 99999 });
    expect(capped.retentionReleased).toBe(10000); expect(capped.retentionHeld).toBe(0);
  });
  it('released retention is not taxed again', () => {
    const r = computeIpc({ ...b, taxPercent: 10, retentionHeldBefore: 5000, retentionRelease: 5000 });
    expect(r.tax).toBe(9000); expect(r.net).toBe(90000 + 9000 + 5000);
  });
  it('already released retention is not released twice', () => {
    expect(computeIpc({ ...b, retentionHeldBefore: 5000, retentionReleasedBefore: 5000, retentionPercent: 0, retentionRelease: 3000 }).retentionReleased).toBe(0);
  });
});

describe('IPC maths', () => {
  it('retention, tax and net on a simple bill', () => {
    const r = computeIpc(base);
    expect(r).toMatchObject({ gross: 100000, retention: 5000, advance: 0, afterDeductions: 95000, tax: 9500, net: 104500, grossCumulative: 100000 });
  });
  it('uses the contract percentages, nothing is assumed', () => {
    const r = computeIpc({ ...base, retentionPercent: 0, taxPercent: 0 });
    expect(r).toMatchObject({ retention: 0, tax: 0, net: 100000 });
  });
  it('advance is recovered as a % of each bill', () => {
    const r = computeIpc({ ...base, advanceGiven: 50000, advanceRecoveryPercent: 20 });
    expect(r.advance).toBe(20000); expect(r.advanceOutstanding).toBe(30000);
  });
  it('advance recovery is capped at what is still outstanding and tracked across bills', () => {
    const r = computeIpc({ ...base, advanceGiven: 50000, advanceRecoveryPercent: 20, advanceRecoveredBefore: 40000 });
    expect(r.advance).toBe(10000); expect(r.advanceOutstanding).toBe(0);
    expect(computeIpc({ ...base, advanceGiven: 50000, advanceRecoveryPercent: 20, advanceRecoveredBefore: 50000 }).advance).toBe(0);
  });
  it('no recovery percentage means no recovery', () => expect(computeIpc({ ...base, advanceGiven: 50000 }).advance).toBe(0));
  it('cumulative gross adds the earlier bills', () => expect(computeIpc({ ...base, grossBeforeThisBill: 250000 }).grossCumulative).toBe(350000));
  it('rounds to 2 decimals at each step so the certificate adds up', () => {
    const r = computeIpc({ ...base, grossThisBill: 33333.333, retentionPercent: 5, taxPercent: 7.5 });
    expect(r.net).toBeCloseTo(r.afterDeductions + r.tax, 2);
    expect(Number.isInteger(Math.round(r.net * 100))).toBe(true);
  });
  it('garbage inputs never produce NaN', () => {
    const r = computeIpc({ ...base, retentionPercent: NaN, taxPercent: -5, grossThisBill: NaN });
    expect(Number.isFinite(r.net)).toBe(true);
  });
});
