// Format Preferences Service for Universal Estimating & Valuation
// Controls the display format of tables, typography, currency, numbers, and Measurement Book (MB) formats

export type TableDensity = 'compact' | 'standard' | 'spacious';
export type BaseFontSize = 'small' | 'medium' | 'large';
export type CurrencySymbol = string; // ISO code or symbol, e.g. 'USD', 'EUR', '$'
export type NumberSystem = 'international' | 'south_asian';
export type GridlineStyle = 'excel' | 'subtle' | 'zebra' | 'minimal';
export type HeaderBannerStyle = 'official' | 'corporate' | 'clean';
export type ZeroDisplay = 'dash' | 'zero' | 'blank';

export type MBLayoutType = 'standard_8_col' | 'linear_chainage' | 'surface_area' | 'sectional_station';
export type MBRoundingMode = 'round' | 'truncate';
export type MBDeductionStyle = 'inline_red' | 'bracketed' | 'separate_table';
export type MBSubtotalFrequency = 'per_item' | 'cumulative' | 'page_wise';
export type MBDimensionUnits = 'metric' | 'imperial' | 'full_labels';

export interface DisplayFormatPreferences {
  tableDensity: TableDensity;
  fontSize: BaseFontSize;
  currencySymbol: CurrencySymbol;
  numberSystem: NumberSystem;
  gridlineStyle: GridlineStyle;
  headerBannerStyle: HeaderBannerStyle;
  zeroDisplay: ZeroDisplay;
  statusBadges: boolean;
}

export interface MBFormatPreferences {
  layoutType: MBLayoutType;
  precision: number; // 2, 3, or 4
  roundingMode: MBRoundingMode;
  deductionStyle: MBDeductionStyle;
  subtotalFrequency: MBSubtotalFrequency;
  dimensionUnits: MBDimensionUnits;
}

export interface AppFormatConfig {
  display: DisplayFormatPreferences;
  mb: MBFormatPreferences;
}

const STORAGE_KEY = 'uev_format_preferences_v1';

export const DEFAULT_FORMAT_CONFIG: AppFormatConfig = {
  display: {
    tableDensity: 'standard',
    fontSize: 'medium',
    currencySymbol: 'USD',
    numberSystem: 'international',
    gridlineStyle: 'excel',
    headerBannerStyle: 'official',
    zeroDisplay: 'dash',
    statusBadges: true,
  },
  mb: {
    layoutType: 'standard_8_col',
    precision: 3, // standard civil engineering precision for m3
    roundingMode: 'round',
    deductionStyle: 'inline_red',
    subtotalFrequency: 'per_item',
    dimensionUnits: 'metric',
  },
};

export function loadFormatPreferences(): AppFormatConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FORMAT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      display: { ...DEFAULT_FORMAT_CONFIG.display, ...(parsed.display || {}) },
      mb: { ...DEFAULT_FORMAT_CONFIG.mb, ...(parsed.mb || {}) },
    };
  } catch (e) {
    console.warn('Failed to load format preferences:', e);
    return DEFAULT_FORMAT_CONFIG;
  }
}

export function saveFormatPreferences(config: AppFormatConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('uev:format-preferences-changed', { detail: config }));
  } catch (e) {
    console.error('Failed to save format preferences:', e);
  }
}

// Preset formatting bundles
export const FORMAT_PRESETS: Record<string, { label: string; description: string; config: AppFormatConfig }> = {
  official_standard: {
    label: 'Official Standard',
    description: 'Standard 8-column measurement book, international number formatting, 3-decimal measurement precision, red inline deductions.',
    config: {
      display: {
        tableDensity: 'standard',
        fontSize: 'medium',
        currencySymbol: 'USD',
        numberSystem: 'international',
        gridlineStyle: 'excel',
        headerBannerStyle: 'official',
        zeroDisplay: 'dash',
        statusBadges: true,
      },
      mb: {
        layoutType: 'standard_8_col',
        precision: 3,
        roundingMode: 'round',
        deductionStyle: 'inline_red',
        subtotalFrequency: 'per_item',
        dimensionUnits: 'metric',
      },
    },
  },
  excel_classic: {
    label: 'Excel Classic Spreadsheet',
    description: 'High-contrast gridlines, standard spreadsheet layout, compact density, 2-decimal financial values.',
    config: {
      display: {
        tableDensity: 'compact',
        fontSize: 'small',
        currencySymbol: 'USD',
        numberSystem: 'international',
        gridlineStyle: 'excel',
        headerBannerStyle: 'corporate',
        zeroDisplay: 'zero',
        statusBadges: true,
      },
      mb: {
        layoutType: 'standard_8_col',
        precision: 2,
        roundingMode: 'round',
        deductionStyle: 'bracketed',
        subtotalFrequency: 'per_item',
        dimensionUnits: 'metric',
      },
    },
  },
  road_chainage_linear: {
    label: 'Road Linear & Chainage Format',
    description: 'Specialized for road earthwork, sub-base & asphalt with From-To station tracking.',
    config: {
      display: {
        tableDensity: 'standard',
        fontSize: 'medium',
        currencySymbol: 'USD',
        numberSystem: 'international',
        gridlineStyle: 'excel',
        headerBannerStyle: 'official',
        zeroDisplay: 'dash',
        statusBadges: true,
      },
      mb: {
        layoutType: 'linear_chainage',
        precision: 3,
        roundingMode: 'round',
        deductionStyle: 'inline_red',
        subtotalFrequency: 'cumulative',
        dimensionUnits: 'metric',
      },
    },
  },
  high_density_spacious: {
    label: 'Spacious Presentation Layout',
    description: 'Larger typography, zebra striping, relaxed padding, ideal for meetings and client presentations.',
    config: {
      display: {
        tableDensity: 'spacious',
        fontSize: 'large',
        currencySymbol: 'USD',
        numberSystem: 'international',
        gridlineStyle: 'zebra',
        headerBannerStyle: 'official',
        zeroDisplay: 'dash',
        statusBadges: true,
      },
      mb: {
        layoutType: 'standard_8_col',
        precision: 2,
        roundingMode: 'round',
        deductionStyle: 'inline_red',
        subtotalFrequency: 'per_item',
        dimensionUnits: 'full_labels',
      },
    },
  },
};

// Helper formatters
export function formatCurrencyValue(amount: number, config: AppFormatConfig): string {
  const symbol = config.display.currencySymbol;
  let formattedNumber = '';

  if (config.display.numberSystem === 'south_asian') {
    formattedNumber = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } else {
    formattedNumber = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return `${symbol} ${formattedNumber}`;
}

export function formatMeasurementQuantity(qty: number, config: AppFormatConfig): string {
  const precision = config.mb.precision;
  if (qty === 0 && config.display.zeroDisplay === 'dash') return '-';
  if (qty === 0 && config.display.zeroDisplay === 'blank') return '';

  if (config.mb.roundingMode === 'truncate') {
    const factor = Math.pow(10, precision);
    const truncated = Math.trunc(qty * factor) / factor;
    return truncated.toFixed(precision);
  }

  return qty.toFixed(precision);
}

export function getDensityClasses(density: TableDensity) {
  switch (density) {
    case 'compact':
      return {
        cellPadding: 'px-2 py-1',
        headerPadding: 'px-2 py-1.5',
        fontSize: 'text-xs',
      };
    case 'spacious':
      return {
        cellPadding: 'px-4 py-3',
        headerPadding: 'px-4 py-3',
        fontSize: 'text-sm',
      };
    case 'standard':
    default:
      return {
        cellPadding: 'px-3 py-2',
        headerPadding: 'px-3 py-2',
        fontSize: 'text-xs',
      };
  }
}

export function getFontSizeClasses(size: BaseFontSize): string {
  switch (size) {
    case 'small':
      return 'text-xs';
    case 'large':
      return 'text-base';
    case 'medium':
    default:
      return 'text-sm';
  }
}

