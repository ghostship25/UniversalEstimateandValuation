// Currency helper: the currency label shown across the app is user-configurable (Settings > Display).
// It is read from the saved format preferences and defaults to USD.
const STORAGE_KEY = 'uev_format_preferences_v1';

export function currencyCode(): string {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      const c = parsed?.display?.currencySymbol;
      if (typeof c === 'string' && c.trim()) return c.trim();
    }
  } catch {
    /* ignore */
  }
  return 'USD';
}

export const COMMON_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AUD', 'CAD', 'CHF', 'AED', 'SAR', 'ZAR', 'BRL', 'MXN', 'SGD', 'NZD', 'NGN', 'KES'];
