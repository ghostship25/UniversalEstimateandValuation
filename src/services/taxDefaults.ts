// The tax rate used when a calculation is not given one explicitly. It follows the active project's tax rate
// (set from the project, default 0 until configured), so no country-specific rate is ever assumed.
let current = 0;
export const setCurrentTaxPercent = (p: unknown) => { const n = Number(p); current = Number.isFinite(n) && n >= 0 ? n : 0; };
export const defaultTaxPercent = () => current;
