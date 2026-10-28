import * as XLSX from 'xlsx';
import { RateNormItem, ResourceMaster, ZoneInfo, BOQItem, MBRow } from '../types';
import { calculateItemRate, calculateTokenSimilarity, normalizeResourceName } from './rateEngine';
import { currencyCode } from './currency';

export interface ImportedExcelRow {
  rawIndex: number;
  rawItemNo: string;
  rawDescription: string;
  rawUnit: string;
  rawQuantity: number;
  rawRate?: number;
  rawAmount?: number;
  rawChapter?: string;
}

export interface ColumnMappingConfig {
  headerRowIndex: number;
  itemNoCol: number;
  descriptionCol: number;
  unitCol: number;
  quantityCol: number;
  rateCol: number;
  chapterCol: number;
}

export type MatchType = 'EXACT_CODE' | 'SEMANTIC_HIGH' | 'SEMANTIC_MODERATE' | 'MANUAL' | 'UNMAPPED';

export interface MappedBOQItemDraft {
  id: string;
  selected: boolean;
  excelRow: ImportedExcelRow;
  mappedNorm?: RateNormItem;
  matchConfidence: number; // 0 - 100
  matchType: MatchType;
  matchReason: string;
  editedQuantity: number;
  editedUnit: string;
  rateSource: 'SYSTEM_ANALYZED' | 'EXCEL_RATE';
  analyzedRate: number;
  userRate: number;
  contractorRate: number;
  effectiveRate: number;
  totalAmount: number;
  assignedChapter: string;
  resourcePreview: Array<{
    name: string;
    category: string;
    quantity: number;
    unit: string;
  }>;
}

/**
 * Normalizes unit strings across common spellings and abbreviations
 */
export function canonicalUnit(unitStr?: string): string {
  if (!unitStr) return 'Unit';
  const u = String(unitStr).toLowerCase().replace(/[\.\s]/g, '').trim();

  if (['cum', 'm3', 'cu', 'cubicmeter'].includes(u) || u.includes('cu.m') || u.includes('cum')) {
    return 'Cu.m.';
  }
  if (['sqm', 'm2', 'sq', 'sqmeter'].includes(u) || u.includes('sq.m') || u.includes('sqm')) {
    return 'Sq.m.';
  }
  if (['m', 'mtr', 'meter', 'rm', 'r.m'].includes(u)) {
    return 'm';
  }
  if (['kg', 'kgs', 'kilogram'].includes(u)) {
    return 'Kg';
  }
  if (['ton', 'tonne'].includes(u)) {
    return 'Ton';
  }
  if (['nos', 'no', 'number', 'num'].includes(u)) {
    return 'Nos';
  }
  if (['set', 'sets'].includes(u)) {
    return 'Set';
  }
  if (['lit', 'litre', 'liter', 'l'].includes(u)) {
    return 'Lit';
  }
  if (['cft', 'cuft', 'cubicfeet'].includes(u)) {
    return 'Cft';
  }
  if (['sft', 'sqft', 'squarefeet'].includes(u)) {
    return 'Sft';
  }
  if (['job', 'ls', 'lumpsum'].includes(u)) {
    return 'Job';
  }

  return unitStr.trim();
}

/**
 * Checks if two unit strings are compatible (e.g. 'Cu.m.' and 'm3')
 */
export function areUnitsCompatible(u1?: string, u2?: string): boolean {
  if (!u1 || !u2) return false;
  return canonicalUnit(u1).toLowerCase() === canonicalUnit(u2).toLowerCase();
}

/**
 * Automatically detects the best header row and column indices from raw sheet data (2D array)
 */
export function autoDetectColumns(sheetData: any[][]): ColumnMappingConfig {
  let bestHeaderRow = 0;
  let maxMatchedHeaders = 0;

  const codeKeywords = ['item', 'code', 's.n', 'sn', 'no'];
  const descKeywords = ['desc', 'particular', 'work', 'item'];
  const unitKeywords = ['unit', 'uom'];
  const qtyKeywords = ['qty', 'quantity'];
  const rateKeywords = ['rate', 'unit rate'];
  const chapterKeywords = ['chapter', 'category', 'group', 'sub-head', 'heading'];

  // Search first 15 rows for the most likely header row
  const scanRows = Math.min(sheetData.length, 15);
  for (let r = 0; r < scanRows; r++) {
    const row = sheetData[r] || [];
    let matches = 0;
    const rowStrings = row.map((c) => String(c || '').toLowerCase().trim());

    if (rowStrings.some((s) => descKeywords.some((k) => s.includes(k)))) matches++;
    if (rowStrings.some((s) => unitKeywords.some((k) => s.includes(k)))) matches++;
    if (rowStrings.some((s) => qtyKeywords.some((k) => s.includes(k)))) matches++;
    if (rowStrings.some((s) => codeKeywords.some((k) => s.includes(k)))) matches++;
    if (rowStrings.some((s) => rateKeywords.some((k) => s.includes(k)))) matches++;

    if (matches > maxMatchedHeaders) {
      maxMatchedHeaders = matches;
      bestHeaderRow = r;
    }
  }

  const headerRow = (sheetData[bestHeaderRow] || []).map((c) => String(c || '').toLowerCase().trim());

  let itemNoCol = -1;
  let descriptionCol = -1;
  let unitCol = -1;
  let quantityCol = -1;
  let rateCol = -1;
  let chapterCol = -1;

  headerRow.forEach((h, idx) => {
    if (descriptionCol === -1 && (h.includes('desc') || h.includes('particular') || h.includes('work item'))) {
      descriptionCol = idx;
    } else if (unitCol === -1 && (h === 'unit' || h === 'uom')) {
      unitCol = idx;
    } else if (quantityCol === -1 && (h.includes('qty') || h.includes('quantity'))) {
      quantityCol = idx;
    } else if (rateCol === -1 && (h.includes('rate') || h.includes('unit rate'))) {
      rateCol = idx;
    } else if (itemNoCol === -1 && (h.includes('item no') || h.includes('item code') || h === 'code' || h === 'sn' || h === 's.n.' || h === 's.n')) {
      itemNoCol = idx;
    } else if (chapterCol === -1 && (h.includes('chapter') || h.includes('category') || h.includes('group') || h.includes('sub-head'))) {
      chapterCol = idx;
    }
  });

  // Fallbacks if columns were not found by exact keywords
  if (itemNoCol === -1) itemNoCol = 0;
  if (descriptionCol === -1) descriptionCol = itemNoCol === 0 ? 1 : 0;
  if (unitCol === -1) unitCol = descriptionCol + 1 < headerRow.length ? descriptionCol + 1 : -1;
  if (quantityCol === -1) quantityCol = unitCol !== -1 && unitCol + 1 < headerRow.length ? unitCol + 1 : -1;

  return {
    headerRowIndex: bestHeaderRow,
    itemNoCol,
    descriptionCol,
    unitCol,
    quantityCol,
    rateCol,
    chapterCol
  };
}

/**
 * Extracts raw items from sheet 2D array using the column mapping config
 */
export function extractItemsFromSheet(
  sheetData: any[][],
  config: ColumnMappingConfig
): ImportedExcelRow[] {
  const items: ImportedExcelRow[] = [];
  const startRow = config.headerRowIndex + 1;

  let currentChapter = 'General Works';

  for (let r = startRow; r < sheetData.length; r++) {
    const row = sheetData[r];
    if (!row || row.length === 0) continue;

    // Check if this row is an empty line or section header
    const rawDesc = String(row[config.descriptionCol] || '').trim();
    const rawNo = config.itemNoCol !== -1 ? String(row[config.itemNoCol] || '').trim() : '';
    const rawUnit = config.unitCol !== -1 ? String(row[config.unitCol] || '').trim() : '';
    const rawQtyVal = config.quantityCol !== -1 ? row[config.quantityCol] : '';
    const rawRateVal = config.rateCol !== -1 ? row[config.rateCol] : '';
    const rawChapVal = config.chapterCol !== -1 ? String(row[config.chapterCol] || '').trim() : '';

    // If description is blank and rawNo is also blank, skip
    if (!rawDesc && !rawNo) continue;

    // If description has text but no unit and no quantity, it might be a chapter header
    const parsedQty = parseFloat(String(rawQtyVal).replace(/,/g, ''));
    if (!rawUnit && (isNaN(parsedQty) || parsedQty === 0) && rawDesc && rawDesc.length < 80) {
      currentChapter = rawDesc;
      continue;
    }

    if (!rawDesc && rawNo) {
      continue;
    }

    const qty = !isNaN(parsedQty) ? parsedQty : 0;
    const parsedRate = parseFloat(String(rawRateVal).replace(/,/g, ''));
    const rate = !isNaN(parsedRate) ? parsedRate : undefined;

    let amount: number | undefined;
    if (rate !== undefined && qty > 0) {
      amount = Math.round(qty * rate * 100) / 100;
    }

    items.push({
      rawIndex: r + 1,
      rawItemNo: rawNo || `${items.length + 1}`,
      rawDescription: rawDesc,
      rawUnit: canonicalUnit(rawUnit),
      rawQuantity: qty,
      rawRate: rate,
      rawAmount: amount,
      rawChapter: rawChapVal || currentChapter
    });
  }

  return items;
}

/**
 * Intelligent Norm Matching Algorithm:
 * Compares an imported Excel item against available norms and suggests the best match
 */
export function matchItemWithNorms(
  item: ImportedExcelRow,
  allNorms: RateNormItem[]
): {
  norm?: RateNormItem;
  confidence: number;
  matchType: MatchType;
  reason: string;
} {
  if (!allNorms || allNorms.length === 0) {
    return { confidence: 0, matchType: 'UNMAPPED', reason: 'No norms in catalog' };
  }

  const cleanItemCode = item.rawItemNo.toLowerCase().replace(/[^a-z0-9\.]/g, '').trim();
  const cleanItemDesc = item.rawDescription.toLowerCase().trim();
  const itemUnit = canonicalUnit(item.rawUnit);

  // 1. Exact or Clean Code Match
  if (cleanItemCode) {
    const codeMatch = allNorms.find((n) => {
      const cleanNormCode = n.code.toLowerCase().replace(/[^a-z0-9\.]/g, '').trim();
      return cleanNormCode === cleanItemCode;
    });

    if (codeMatch) {
      const unitsMatch = areUnitsCompatible(itemUnit, codeMatch.base_unit);
      return {
        norm: codeMatch,
        confidence: unitsMatch ? 98 : 90,
        matchType: 'EXACT_CODE',
        reason: `Matched by Item Code "${codeMatch.code}" (${codeMatch.source})${!unitsMatch ? ' (Unit differs)' : ''}`
      };
    }
  }

  // 2. Keyword / Substring & Token Similarity Match
  let bestScore = 0;
  let bestNorm: RateNormItem | null = null;
  let bestReason = '';

  const engineeringKeywords = [
    { key: 'brickwork', boost: 0.25, words: ['brickwork', 'brick', '1:6', 'mortar'] },
    { key: 'excavation', boost: 0.25, words: ['excavation', 'earthwork', 'trench', 'foundation'] },
    { key: 'pcc', boost: 0.25, words: ['pcc', 'plain cement concrete', 'm15', '1:2:4', '1:3:6'] },
    { key: 'rcc', boost: 0.25, words: ['rcc', 'reinforced concrete', 'm20', '1:1.5:3', 'column', 'beam', 'slab'] },
    { key: 'rebar', boost: 0.25, words: ['rebar', 'steel', 'tmt', 'cutting', 'bending'] },
    { key: 'plaster', boost: 0.25, words: ['plaster', 'cement sand plaster', '12.5mm', '1:4'] },
    { key: 'paint', boost: 0.25, words: ['paint', 'emulsion', 'primer'] },
    { key: 'stone', boost: 0.25, words: ['stone', 'rubble', 'masonry', 'quarry'] },
    { key: 'pipe', boost: 0.25, words: ['pipe', 'hdpe', 'np3', 'flush jointed'] },
    { key: 'gabion', boost: 0.25, words: ['gabion', 'wire box', 'mesh', 'selvedge'] },
    { key: 'subbase', boost: 0.25, words: ['subbase', 'gsb', 'base course', 'roller'] }
  ];

  for (const norm of allNorms) {
    let score = calculateTokenSimilarity(cleanItemDesc, norm.description);

    // Boost score if key technical keywords align
    for (const group of engineeringKeywords) {
      const itemHas = group.words.some((w) => cleanItemDesc.includes(w));
      const normHas = group.words.some((w) => norm.description.toLowerCase().includes(w));
      if (itemHas && normHas) {
        score += group.boost;
      }
    }

    // Boost score if units align
    if (areUnitsCompatible(itemUnit, norm.base_unit)) {
      score += 0.15;
    }

    // Check code partial match inside description (e.g., "Item 2.4 Brickwork")
    if (cleanItemDesc.includes(norm.code.toLowerCase())) {
      score += 0.2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestNorm = norm;
      bestReason = `Matched by Description & Technical Spec (${norm.source})`;
    }
  }

  const confidencePct = Math.min(95, Math.round(bestScore * 100));

  if (bestNorm && confidencePct >= 65) {
    return {
      norm: bestNorm,
      confidence: confidencePct,
      matchType: 'SEMANTIC_HIGH',
      reason: `${bestReason} - ${confidencePct}% match`
    };
  } else if (bestNorm && confidencePct >= 40) {
    return {
      norm: bestNorm,
      confidence: confidencePct,
      matchType: 'SEMANTIC_MODERATE',
      reason: `Suggested Match: ${bestNorm.code} (${confidencePct}%)`
    };
  }

  return {
    confidence: confidencePct,
    matchType: 'UNMAPPED',
    reason: 'No high-confidence match found. Please choose manually.'
  };
}

/**
 * Calculates live analyzed rate & resource breakdown for a mapped item draft
 */
export function calculateDraftItemRates(
  norm: RateNormItem | undefined,
  quantity: number,
  resources: ResourceMaster[],
  zone: ZoneInfo,
  fiscalYear: string,
  mode: 'user' | 'contractor' = 'user',
  contractorOverheadPercent: number = 15,
  taxPercent: number = 13
): {
  analyzedRate: number;
  userRate: number;
  contractorRate: number;
  resourcePreview: Array<{ name: string; category: string; quantity: number; unit: string }>;
} {
  if (!norm) {
    return {
      analyzedRate: 0,
      userRate: 0,
      contractorRate: 0,
      resourcePreview: []
    };
  }

  const result = calculateItemRate({
    norm,
    resources,
    zone,
    fiscalYear,
    mode,
    contractorOverheadPercent,
    taxPercent
  });

  const userRate = result.user_unit_rate || result.total_unit_rate || 0;
  const contractorRate = result.contractor_unit_rate || result.total_unit_rate || 0;
  const analyzedRate = mode === 'user' ? userRate : contractorRate;

  // Calculate scaled resource quantities
  const scale = (quantity > 0 ? quantity : 1) / (norm.base_quantity || 1);
  const resourcePreview = (norm.resources || []).map((r) => ({
    name: r.resource_name,
    category: r.category,
    quantity: Math.round(r.quantity_per_base_unit * scale * 1000) / 1000,
    unit: r.unit_override || 'Unit'
  }));

  return {
    analyzedRate,
    userRate,
    contractorRate,
    resourcePreview
  };
}

/**
 * Generates and downloads a clean, professional sample BOQ Abstract Excel (.xlsx) file
 */
export function downloadSampleBOQExcelTemplate(): void {
  const headers = [
    'S.N.',
    'Item Code',
    'Description of Work',
    'Unit',
    'Quantity',
    `Existing Rate (${currencyCode()})`,
    `Amount (${currencyCode()})`,
    'Chapter / Category',
    'Remarks'
  ];

  const sampleRows = [
    [
      '1',
      '1.1',
      'Earthwork in excavation in foundation trenches in all kinds of soil including dressing and leveling (depth up to 1.5m)',
      'Cu.m.',
      45.5,
      '',
      '',
      'Earthwork & Foundation',
      'BLD Norms 1.1'
    ],
    [
      '2',
      '2.4',
      'First class brickwork in 1:6 cement sand mortar in foundation and superstructure',
      'Cu.m.',
      32.8,
      '',
      '',
      'Masonry Works',
      'BLD Norms 2.4'
    ],
    [
      '3',
      '4.1',
      'PCC 1:2:4 (M15) in foundation and floor slab including mixing, placing & curing',
      'Cu.m.',
      18.0,
      '',
      '',
      'Concrete Works',
      'BLD Norms 4.1'
    ],
    [
      '4',
      '4.2',
      'RCC 1:1.5:3 (M20) in columns, beams and slab including placing, vibrating and curing',
      'Cu.m.',
      24.5,
      '',
      '',
      'Concrete Works',
      'BLD Norms 4.2'
    ],
    [
      '5',
      '5.2',
      'TMT High-Yield Reinforcement Steel bar cutting, bending & placing in RCC works',
      'Kg',
      2850.0,
      '',
      '',
      'Reinforcement Steel',
      'BLD Norms 5.2'
    ],
    [
      '6',
      '6.1',
      '12.5mm cement sand plaster (1:4) on brick masonry walls including curing',
      'Sq.m.',
      320.0,
      '',
      '',
      'Finishing Works',
      'BLD Norms 6.1'
    ],
    [
      '7',
      '8.1',
      'Providing and applying 2 coats of emulsion paint over a coat of primer on interior plaster',
      'Sq.m.',
      320.0,
      '',
      '',
      'Finishing Works',
      'BLD Norms 8.1'
    ]
  ];

  const wsData = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths for readability
  ws['!cols'] = [
    { wch: 8 },  // S.N.
    { wch: 12 }, // Item Code
    { wch: 60 }, // Description
    { wch: 10 }, // Unit
    { wch: 12 }, // Quantity
    { wch: 18 }, // Existing Rate
    { wch: 16 }, // Amount
    { wch: 25 }, // Chapter
    { wch: 22 }  // Remarks
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BOQ Abstract Estimate');
  XLSX.writeFile(wb, 'Sample_BOQ_Abstract_Estimate_Template.xlsx');
}
