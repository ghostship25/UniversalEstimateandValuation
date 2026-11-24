// Interim Payment Certificate maths. Pure and tested: every percentage comes from the contract / project,
// nothing is assumed. Rounded to 2 decimals at each step so the printed certificate adds up exactly.
export interface IpcInput {
  grossThisBill: number;            // value of work measured this bill
  grossBeforeThisBill: number;      // sum of gross of all earlier bills
  priceAdjustmentPercent?: number;  // price escalation / adjustment on this bill's work (may be negative)
  retentionPercent: number;
  retentionHeldBefore?: number;     // retention withheld by earlier bills
  retentionReleasedBefore?: number; // retention already released
  retentionRelease?: number;        // retention released with this bill (capped at what is held)
  advanceGiven: number;
  advanceRecoveryPercent: number;   // % of each bill's gross recovered until the advance is repaid
  advanceRecoveredBefore: number;
  taxPercent: number;
}
export interface IpcResult {
  gross: number;                    // measured work
  priceAdjustment: number;
  adjustedGross: number;            // gross + price adjustment
  grossCumulative: number;          // measured work to date (without adjustments)
  retention: number;
  retentionReleased: number;
  retentionHeld: number;            // retention held after this bill
  advance: number;
  afterDeductions: number;          // taxable amount
  tax: number;
  net: number;                      // payable
  advanceOutstanding: number;
}
const r2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
const pct = (n: number | undefined) => (n !== undefined && Number.isFinite(n) && n > 0 ? n : 0);

export function computeIpc(i: IpcInput): IpcResult {
  const gross = r2(i.grossThisBill);
  const adjPct = Number.isFinite(i.priceAdjustmentPercent as number) ? (i.priceAdjustmentPercent as number) : 0; // may be negative
  const priceAdjustment = r2(gross * adjPct / 100);
  const adjustedGross = r2(gross + priceAdjustment);
  const retention = r2(adjustedGross * pct(i.retentionPercent) / 100);
  const held = Math.max(0, r2((i.retentionHeldBefore ?? 0) + retention - (i.retentionReleasedBefore ?? 0)));
  const retentionReleased = Math.min(Math.max(0, r2(i.retentionRelease ?? 0)), held);
  const remaining = Math.max(0, r2(i.advanceGiven) - r2(i.advanceRecoveredBefore));
  const advance = r2(Math.min(remaining, gross * pct(i.advanceRecoveryPercent) / 100));
  const afterDeductions = r2(adjustedGross - retention - advance);
  const tax = r2(afterDeductions * pct(i.taxPercent) / 100);
  return {
    gross,
    priceAdjustment,
    adjustedGross,
    grossCumulative: r2(i.grossBeforeThisBill + gross),
    retention,
    retentionReleased,
    retentionHeld: r2(held - retentionReleased),
    advance,
    afterDeductions,
    tax,
    net: r2(afterDeductions + tax + retentionReleased),
    advanceOutstanding: r2(remaining - advance),
  };
}
