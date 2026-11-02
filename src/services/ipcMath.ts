// Interim Payment Certificate maths. Pure and tested: every percentage comes from the contract / project,
// nothing is assumed. Rounded to 2 decimals at each step so the printed certificate adds up exactly.
export interface IpcInput {
  grossThisBill: number;
  grossBeforeThisBill: number;      // sum of gross of all earlier bills
  retentionPercent: number;
  advanceGiven: number;
  advanceRecoveryPercent: number;   // % of each bill's gross recovered until the advance is repaid
  advanceRecoveredBefore: number;   // advance already recovered by earlier bills
  taxPercent: number;
}
export interface IpcResult {
  gross: number;
  grossCumulative: number;
  retention: number;
  advance: number;
  afterDeductions: number;
  tax: number;
  net: number;
  advanceOutstanding: number;       // still to be recovered after this bill
}
const r2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
const pct = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

export function computeIpc(i: IpcInput): IpcResult {
  const gross = r2(i.grossThisBill);
  const retention = r2(gross * pct(i.retentionPercent) / 100);
  const remaining = Math.max(0, r2(i.advanceGiven) - r2(i.advanceRecoveredBefore));
  const advance = r2(Math.min(remaining, gross * pct(i.advanceRecoveryPercent) / 100));
  const afterDeductions = r2(gross - retention - advance);
  const tax = r2(afterDeductions * pct(i.taxPercent) / 100);
  return {
    gross,
    grossCumulative: r2(i.grossBeforeThisBill + gross),
    retention,
    advance,
    afterDeductions,
    tax,
    net: r2(afterDeductions + tax),
    advanceOutstanding: r2(remaining - advance),
  };
}
