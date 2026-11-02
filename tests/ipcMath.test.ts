import { describe, it, expect } from 'vitest';
import { computeIpc } from '../src/services/ipcMath';

const base = { grossThisBill: 100000, grossBeforeThisBill: 0, retentionPercent: 5, advanceGiven: 0, advanceRecoveryPercent: 0, advanceRecoveredBefore: 0, taxPercent: 10 };

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
