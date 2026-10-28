import { RateNormItem, ResourceMaster, ZoneInfo, RateCalculationResult } from '../types';
import { getDefaultResourceRate } from '../data/initialData';

/**
 * Normalizes resource names to handle synonyms, spelling differences (e.g. labour vs labor),
 * parenthetical qualifiers, and material synonyms so rates match reliably regardless of upload format.
 */
export function normalizeResourceName(name?: string | number): string {
  if (!name) return '';
  let s = String(name).toLowerCase().replace(/["']/g, '').trim();

  // Canonical mapping for labor terms
  if (s.includes('unskilled') || s.includes('labourer')) {
    return 'unskilled labor';
  }
  if (!s.includes('semi') &&
      (s.includes('skilled') || s.includes('mason') || s.includes('painter') || s.includes('plumber') || s.includes('bar bender') || s.includes('carpenter'))) {
    return 'skilled labor';
  }
  if (s.includes('semi')) {
    return 'semiskilled labor';
  }

  // Canonical mappings for common materials & equipment
  if (s.includes('cement')) return 'opc cement';
  if (s.includes('brick')) return 'bricks ist class';
  if (s.includes('sand')) return 'coarse sand';
  if (s.includes('rebar') || s.includes('steel') || s.includes('tmt') || s.includes('hysd')) return 'hysd rebar';
  if (s.includes('stone') || s.includes('boulder')) return 'boulder stone';
  if (s.includes('aggregate')) return 'aggregate 20mm';
  if (s.includes('water')) return 'water';
  if (s.includes('diesel')) return 'diesel fuel';
  if (s.includes('mixer')) return 'concrete mixer';
  if (s.includes('vibrator')) return 'concrete vibrator';
  if (s.includes('wire')) return 'binding wire';
  if (s.includes('timber') || s.includes('wood')) return 'sal timber';
  if (s.includes('sheet')) return 'cgi sheet';
  if (s.includes('tile')) return 'tiles';
  if (s.includes('paint')) return 'enamel paint';
  if (s.includes('primer')) return 'primer';
  if (s.includes('marble')) return 'marble';

  // Standardize British/American spellings
  s = s.replace(/\blabour\b/g, 'labor');
  s = s.replace(/\blabours\b/g, 'labor');
  s = s.replace(/\bmetres\b/g, 'meter');
  s = s.replace(/\bmetre\b/g, 'meter');
  s = s.replace(/\blitres\b/g, 'liter');
  s = s.replace(/\blitre\b/g, 'liter');

  // Replace slashes, underscores, hyphens, and commas with spaces
  s = s.replace(/[\/_,]/g, ' ');
  // Remove parentheses and common department abbreviations
  s = s.replace(/[\(\)]/g, ' ');
  s = s.replace(/\bboy\b/g, ' ');
  s = s.replace(/\bgirl\b/g, ' ');

  // If ascii english words exist, remove non-ascii characters for clean comparison
  if (/[a-z]/.test(s)) {
    s = s.replace(/[^a-z0-9\s]/g, ' ');
  }

  return s.replace(/\s+/g, ' ').trim();
}

export function inferRateCalcType(name?: string, unit?: string, category?: string): 'fixed' | 'percent_labour' | 'percent_equipment' | 'percent_material' {
  const combined = `${name || ''} ${unit || ''} ${category || ''}`.toLowerCase();
  
  // Percent labour detection
  if (
    combined.includes('percent_labour') ||
    combined.includes('percent_labor') ||
    combined.includes('%_labour') ||
    combined.includes('%_labor') ||
    combined.includes('% of labour') ||
    combined.includes('% of labor') ||
    combined.includes('% labour') ||
    combined.includes('% labor') ||
    combined.includes('labour percent') ||
    combined.includes('labor percent') ||
    combined.includes('labour %') ||
    combined.includes('labor %') ||
    combined.includes('sundries') ||
    combined.includes('sundry') ||
    combined.includes('tools & plant') ||
    combined.includes('tools and plant') ||
    combined.includes('t&p') ||
    combined.includes('t & p')
  ) {
    return 'percent_labour';
  }

  // Percent equipment detection
  if (
    combined.includes('percent_equipment') ||
    combined.includes('percent_equip') ||
    combined.includes('percent_machinery') ||
    combined.includes('%_equipment') ||
    combined.includes('% of equipment') ||
    combined.includes('% of machine') ||
    combined.includes('% equipment') ||
    combined.includes('equipment percent') ||
    combined.includes('equipment %') ||
    combined.includes('machine %')
  ) {
    return 'percent_equipment';
  }

  // Percent material detection
  if (
    combined.includes('percent_material') ||
    combined.includes('%_material') ||
    combined.includes('% of material') ||
    combined.includes('% material') ||
    combined.includes('material percent') ||
    combined.includes('material %')
  ) {
    return 'percent_material';
  }

  // If unit is '%' or 'percent' or 'l.s.' and name mentions equipment
  const uLower = String(unit || '').toLowerCase().trim();
  if (uLower === '%' || uLower === 'percent' || uLower === 'l.s.' || uLower === 'ls' || uLower === 'lumpsum') {
    if (combined.includes('equip') || combined.includes('machin')) {
      return 'percent_equipment';
    }
    if (combined.includes('mat') || combined.includes('material')) {
      return 'percent_material';
    }
    return 'percent_labour';
  }

  return 'fixed';
}

export function inferIsTaxFree(name?: string, unit?: string, remarks?: string): boolean {
  const combined = `${name || ''} ${unit || ''} ${remarks || ''}`.toLowerCase();
  if (
    combined.includes('tax free') ||
    combined.includes('tax-free') ||
    combined.includes('taxfree') ||
    combined.includes('tax_free') ||
    combined.includes('tax free') ||
    combined.includes('tax-free') ||
    combined.includes('tax exempt') ||
    combined.includes('exempt from tax')
  ) {
    return true;
  }
  return false;
}

/**
 * Calculates Jaccard token overlap similarity (0 to 1) between two strings.
 */
export function calculateTokenSimilarity(str1: string, str2: string): number {
  const t1 = normalizeResourceName(str1).split(/\s+/).filter((w) => w.length > 1);
  const t2 = normalizeResourceName(str2).split(/\s+/).filter((w) => w.length > 1);
  if (!t1.length || !t2.length) return 0;

  const set1 = new Set(t1);
  const set2 = new Set(t2);

  let intersection = 0;
  set1.forEach((token) => {
    if (set2.has(token)) intersection++;
  });

  const union = new Set([...t1, ...t2]).size;
  if (union === 0) return 0;
  return intersection / union;
}

/**
 * Finds the matching ResourceMaster item from the resources array.
 * Uses smart multi-pass semantic matching so catalog items match master resources regardless of ID shifts
 * and prioritizes resources that have active uploaded zone rates.
 */
export function findMasterResource(
  normRes: { resource_id?: number | string; resource_name?: string; code?: string; category?: string },
  resources: ResourceMaster[],
  zone?: ZoneInfo,
  fiscalYear?: string
): ResourceMaster | undefined {
  if (!resources || !resources.length) return undefined;

  const normCode = (normRes as any).code ? String((normRes as any).code).toLowerCase().replace(/^dr\-/, '').trim() : '';
  const normName = normRes.resource_name ? String(normRes.resource_name).trim() : '';
  const normNameLower = normName.toLowerCase();
  const normNameNorm = normalizeResourceName(normName);
  const normId = normRes.resource_id !== undefined ? String(normRes.resource_id) : '';

  let bestResource: ResourceMaster | undefined = undefined;
  let maxScore = -1;

  for (const r of resources) {
    let score = 0;

    const rCode = r.code ? String(r.code).toLowerCase().replace(/^dr\-/, '').trim() : '';
    const rResIdStr = r.resource_id !== undefined ? String(r.resource_id) : '';
    const rNameLower = r.name ? String(r.name).toLowerCase().trim() : '';
    const rNameNorm = r.name ? normalizeResourceName(r.name) : '';

    // Pass 1: Code Match or ID-as-Code match
    if (normCode && rCode && rCode === normCode) {
      score += 100;
    } else if (normCode && rResIdStr && rResIdStr === normCode) {
      score += 95;
    }

    // Pass 2: Exact Name Match
    if (normNameLower && rNameLower && rNameLower === normNameLower) {
      score += 85;
    }

    // Pass 3: Normalized Name Match & Token Similarity
    if (normNameNorm && rNameNorm) {
      if (normNameNorm === rNameNorm) {
        score += 75;
      } else if (rNameNorm.includes(normNameNorm) || normNameNorm.includes(rNameNorm)) {
        if (!normRes.category || !r.category || normRes.category === r.category) {
          score += 55;
        }
      } else {
        const tokenSim = calculateTokenSimilarity(normNameNorm, rNameNorm);
        if (tokenSim >= 0.4) {
          score += Math.round(tokenSim * 60);
        }
      }
    }

    // Pass 4: Resource ID Match
    if (normId && rResIdStr && normId === rResIdStr) {
      if (!normRes.category || !r.category || normRes.category === r.category) {
        score += 65;
      }
    }

    // Bonus for having an uploaded / active zone rate or non-zero default rate
    if (score > 0) {
      if (zone && fiscalYear) {
        const drRate = getZoneRateOnly(r, zone, fiscalYear);
        if (drRate > 0) score += 40;
      } else {
        if (r.zone_rates && Object.values(r.zone_rates).some((v) => !isNaN(Number(v)) && Number(v) > 0)) {
          score += 35;
        } else if (Number(r.default_rate) > 0) {
          score += 20;
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestResource = r;
      }
    }
  }

  return bestResource;
}

export interface CalculationOptions {
  norm: RateNormItem;
  resources: ResourceMaster[];
  zone: ZoneInfo;
  fiscalYear: string;
  mode?: 'user' | 'contractor'; // 'user' (Govt office estimate) or 'contractor' (Tender estimate)
  contractorOverheadPercent?: number; // default 15% for contractor mode
  materialTaxPercent?: number; // default 10% for user mode material Tax
  equipmentTaxPercent?: number; // default 10% for user mode equipment Tax
  taxPercent?: number; // default 10% for contractor mode end Tax
  leadKm?: number; // extra haulage distance
  royaltyPerCum?: number; // e.g. currency 150/m3 for sand/stone
  customResourceRates?: Record<number, number>; // user local rate overrides
}

export function getExplicitZoneRate(r: ResourceMaster, zone?: ZoneInfo, fiscalYear?: string): number {
  if (!r || !r.zone_rates || Object.keys(r.zone_rates).length === 0) {
    return 0;
  }

  const dr = r.zone_rates;
  const fyClean = fiscalYear ? fiscalYear.replace('/', '-').toLowerCase() : '';
  const fyRaw = fiscalYear ? fiscalYear.toLowerCase() : '';
  const distId = zone?.id ? zone.id.toLowerCase() : '';
  const distName = zone?.name_en ? zone.name_en.toLowerCase() : '';

  const hasZone = Boolean(distId || distName);
  const hasFY = Boolean(fyRaw || fyClean);

  // If no zone and no FY specified at all, return any valid non-zero rate
  if (!hasZone && !hasFY) {
    for (const val of Object.values(dr)) {
      const num = Number(val);
      if (!isNaN(num) && num > 0) return num;
    }
    return 0;
  }

  let bestRate = 0;
  let bestMatchTier = 0; // 3 = Zone + FY match, 2 = Zone match, 1 = default key fallback

  for (const [key, val] of Object.entries(dr)) {
    const numVal = Number(val);
    if (isNaN(numVal) || numVal <= 0) continue;

    const kLower = key.toLowerCase();

    const matchesDist = hasZone && (
      (distId && (kLower === distId || kLower.includes(distId))) ||
      (distName && (kLower === distName || kLower.includes(distName)))
    );

    const matchesFY = hasFY && (
      (fyRaw && kLower.includes(fyRaw)) ||
      (fyClean && kLower.includes(fyClean))
    );

    if (hasZone && hasFY) {
      if (matchesDist && matchesFY) {
        return numVal; // Perfect match: both zone AND fiscal year match!
      } else if (matchesDist && bestMatchTier < 2) {
        bestRate = numVal;
        bestMatchTier = 2;
      } else if (kLower === 'default' && bestMatchTier < 1) {
        bestRate = numVal;
        bestMatchTier = 1;
      }
    } else if (hasZone) {
      if (matchesDist) {
        return numVal;
      } else if (kLower === 'default' && bestMatchTier < 1) {
        bestRate = numVal;
        bestMatchTier = 1;
      }
    } else if (hasFY) {
      if (matchesFY) {
        return numVal;
      } else if (kLower === 'default' && bestMatchTier < 1) {
        bestRate = numVal;
        bestMatchTier = 1;
      }
    }
  }

  return bestRate;
}

export function getZoneRateOnly(r: ResourceMaster, zone?: ZoneInfo, fiscalYear?: string): number {
  if (!r) return 0;
  const explicit = getExplicitZoneRate(r, zone, fiscalYear);
  if (explicit > 0) return explicit;

  const defNum = Number(r.default_rate);
  if (!isNaN(defNum) && defNum > 0) {
    return defNum;
  }

  if (r.zone_rates) {
    for (const val of Object.values(r.zone_rates)) {
      const numVal = Number(val);
      if (!isNaN(numVal) && numVal > 0) return numVal;
    }
  }

  return 0;
}

export function resolveComponentUnitRate(
  normRes: any,
  master: ResourceMaster | undefined,
  resources: ResourceMaster[],
  zone: ZoneInfo,
  fiscalYear: string,
  customResourceRates: Record<string | number, number> = {}
): number {
  // Step 1: Explicit user calculation override (from UI inputs / custom overrides)
  if (normRes.resource_id !== undefined && customResourceRates[normRes.resource_id] !== undefined && Number(customResourceRates[normRes.resource_id]) > 0) {
    return Number(customResourceRates[normRes.resource_id]);
  }
  if (normRes.code && customResourceRates[normRes.code] !== undefined && Number(customResourceRates[normRes.code]) > 0) {
    return Number(customResourceRates[normRes.code]);
  }
  if (master && master.resource_id !== undefined && customResourceRates[master.resource_id] !== undefined && Number(customResourceRates[master.resource_id]) > 0) {
    return Number(customResourceRates[master.resource_id]);
  }
  if (master && master.code && customResourceRates[master.code] !== undefined && Number(customResourceRates[master.code]) > 0) {
    return Number(customResourceRates[master.code]);
  }

  // Step 2: Check active rate on matched master resource
  if (master) {
    const masterRate = getZoneRateOnly(master, zone, fiscalYear);
    if (masterRate > 0) return masterRate;
  }

  // Step 3: Search across active resources array by code, resource_id, normalized name, or canonical labor category
  if (resources && resources.length > 0) {
    const normCode = normRes.code ? String(normRes.code).toLowerCase().replace(/^dr\-/, '').trim() : '';
    const masterCode = master?.code ? String(master.code).toLowerCase().replace(/^dr\-/, '').trim() : '';
    const targetCode = normCode || masterCode;
    const normNameNorm = normRes.resource_name ? normalizeResourceName(normRes.resource_name) : (master ? normalizeResourceName(master.name) : '');

    // 3a. Exact code or resource_id match across resources
    if (targetCode) {
      for (const r of resources) {
        const rCode = r.code ? String(r.code).toLowerCase().replace(/^dr\-/, '').trim() : '';
        const rIdStr = String(r.resource_id);
        if (rCode === targetCode || rIdStr === targetCode) {
          const rateVal = getZoneRateOnly(r, zone, fiscalYear);
          if (rateVal > 0) return rateVal;
        }
      }
    }

    // 3b. Match by resource_id
    if (normRes.resource_id !== undefined) {
      const normResIdStr = String(normRes.resource_id);
      for (const r of resources) {
        if (String(r.resource_id) === normResIdStr) {
          const rateVal = getZoneRateOnly(r, zone, fiscalYear);
          if (rateVal > 0) return rateVal;
        }
      }
    }

    // 3c. Normalized name match
    if (normNameNorm) {
      for (const r of resources) {
        if (r.name && normalizeResourceName(r.name) === normNameNorm) {
          const rateVal = getZoneRateOnly(r, zone, fiscalYear);
          if (rateVal > 0) return rateVal;
        }
      }
    }

    // 3d. Canonical Labor Category fallback
    const category = normRes.category || master?.category;
    if (category === 'Labor') {
      const normNameLower = String(normRes.resource_name || master?.name || '').toLowerCase();
      let targetLaborToken = '';
      if (normNameLower.includes('unskilled') || normNameLower.includes('labourer')) {
        targetLaborToken = 'unskilled labor';
      } else if (normNameLower.includes('skilled') || normNameLower.includes('mason') || normNameLower.includes('carpenter')) {
        targetLaborToken = 'skilled labor';
      } else if (normNameLower.includes('semi')) {
        targetLaborToken = 'semiskilled labor';
      }

      if (targetLaborToken) {
        for (const r of resources) {
          if (r.category === 'Labor' && normalizeResourceName(r.name) === targetLaborToken) {
            const rateVal = getZoneRateOnly(r, zone, fiscalYear);
            if (rateVal > 0) return rateVal;
          }
        }
      }
    }
  }

  // Step 4: Uploaded Norm Rate (embedded on normRes from imported custom norm specification or rate sheet)
  const normUploadedRate =
    Number((normRes as any).default_rate) ||
    Number((normRes as any).rate) ||
    Number((normRes as any).unit_rate) ||
    Number((normRes as any).price) ||
    Number((normRes as any).cost) ||
    Number((normRes as any).amount) ||
    0;
  if (normUploadedRate > 0) {
    return normUploadedRate;
  }

  // Step 5: Category starter rate fallback
  return getDefaultResourceRate(normRes.resource_name || master?.name || '', normRes.category || 'Material', normRes.unit_override || 'Unit');
}

// In-memory calculation cache for ultra-fast rate analysis and bulk BOQ evaluations
const rateCalculationCache = new Map<string, RateCalculationResult>();

/**
 * Clears the rate calculation memoization cache (call when zone rates, norms, or custom rates change).
 */
export function clearRateCalculationCache(): void {
  rateCalculationCache.clear();
}

export function calculateItemRate(options: CalculationOptions): RateCalculationResult {
  const {
    norm,
    resources,
    zone,
    fiscalYear,
    mode = 'user',
    contractorOverheadPercent = 15,
    materialTaxPercent = 13,
    equipmentTaxPercent = 13,
    taxPercent = 13,
    leadKm = 0,
    royaltyPerCum = 0,
    customResourceRates = {}
  } = options;

  if (!norm) {
    return {
      norm_id: 0,
      item_code: '',
      description: '',
      base_quantity: 1,
      base_unit: 'Unit',
      zone: zone?.name_en || '',
      fiscal_year: fiscalYear || '',
      mode,
      labor_cost: 0,
      material_cost: 0,
      material_tax_amount: 0,
      equipment_cost: 0,
      equipment_tax_amount: 0,
      transport_cost: 0,
      lead_cost: 0,
      lift_cost: 0,
      royalty_tax: 0,
      subtotal_direct_cost: 0,
      contractor_overhead_amount: 0,
      total_unit_rate: 0,
      total_rate_with_tax: 0,
      user_unit_rate: 0,
      contractor_unit_rate: 0,
      breakdown: []
    };
  }

  // Fast Cache Lookup
  const customRatesKey = Object.entries(customResourceRates).map(([k, v]) => `${k}:${v}`).join(',');
  const cacheKey = `${norm.item_id || norm.code}_${zone?.id || zone?.name_en}_${fiscalYear}_${mode}_${contractorOverheadPercent}_${materialTaxPercent}_${taxPercent}_${leadKm}_${royaltyPerCum}_${resources?.length || 0}_${customRatesKey}`;

  if (rateCalculationCache.has(cacheKey)) {
    return rateCalculationCache.get(cacheKey)!;
  }

  let laborCost = 0;
  let baseMaterialCost = 0;
  let equipmentCost = 0;
  let transportCost = 0;

  // Helper to detect if a resource item is a percentage-based rate resource (e.g., 3% of labour)
  const getPercentInfo = (normRes: any, master: ResourceMaster | undefined, name: string) => {
    // Priority to master's rate_calc_type set by user in Zone Rates registry
    const explicitCalcType = (master && master.rate_calc_type !== undefined) ? master.rate_calc_type : normRes.rate_calc_type;

    if (explicitCalcType === 'fixed') {
      return null; // Explicitly set to Fixed Rate in Zone Rates tab
    }

    const effectiveCalcType = (explicitCalcType && explicitCalcType !== 'fixed')
      ? explicitCalcType
      : inferRateCalcType(name || normRes.resource_name || master?.name, normRes.unit_override || master?.unit, normRes.category || master?.category);

    if (effectiveCalcType && String(effectiveCalcType).startsWith('percent_')) {
      const rawVal = Number(
        normRes.percentage_value !== undefined && normRes.percentage_value > 0
          ? normRes.percentage_value
          : normRes.quantity_per_base_unit
      );
      const percentFraction = (rawVal > 0 && rawVal < 1) ? rawVal : (rawVal > 0 ? rawVal / 100 : 0.03);
      const percent = percentFraction * 100;
      return {
        type: effectiveCalcType as 'percent_labour' | 'percent_equipment' | 'percent_material',
        percent: percent || 3,
        percentFraction: percentFraction || 0.03
      };
    }

    return null;
  };

  // Helper to check if a resource is Tax-exempt
  const checkIsTaxFree = (normRes: any, master?: ResourceMaster) => {
    // 1. Primary source of truth: Master resource setting in Zone Rates tab
    if (master && master.is_tax_free !== undefined) {
      return Boolean(master.is_tax_free);
    }
    // 2. Secondary source: Norm resource definition setting
    if (normRes && normRes.is_tax_free !== undefined) {
      return Boolean(normRes.is_tax_free);
    }
    // 3. Automated inference based on keywords
    return inferIsTaxFree(
      normRes.resource_name || master?.name,
      normRes.unit_override || master?.unit,
      String(master?.remarks || '') + ' ' + String(normRes.remarks || '')
    );
  };

  const fixedResources: Array<{
    normRes: any;
    master: ResourceMaster | undefined;
    baseRate: number;
    effectiveName: string;
    subtotalBase: number;
    isTaxFree: boolean;
  }> = [];

  const percentResources: Array<{
    normRes: any;
    master: ResourceMaster | undefined;
    effectiveName: string;
    percentInfo: { type: string; percent: number; percentFraction: number };
    isTaxFree: boolean;
  }> = [];

  const normResources = Array.isArray(norm.resources) ? norm.resources : [];

  normResources.forEach(normRes => {
    const master = findMasterResource(normRes, resources, zone, fiscalYear);
    const rawResName = normRes.resource_name ? String(normRes.resource_name).trim() : '';
    const isGenericPlaceholder = !rawResName || /^res\-\d+/i.test(rawResName) || /^resource\-\d+/i.test(rawResName) || rawResName.toLowerCase() === 'labor / material component' || rawResName.toLowerCase() === 'resource component';
    const effectiveName = (!isGenericPlaceholder && rawResName) ? rawResName : ((master ? master.name : rawResName) || 'Resource Component');
    
    const percentInfo = getPercentInfo(normRes, master, effectiveName);
    const isTaxFree = (percentInfo?.type === 'percent_labour' || normRes.category === 'Labor')
      ? true
      : checkIsTaxFree(normRes, master);

    if (percentInfo) {
      percentResources.push({
        normRes,
        master,
        effectiveName,
        percentInfo,
        isTaxFree
      });
    } else {
      let baseRate = customResourceRates[normRes.resource_id];
      if (baseRate === undefined && master && master.resource_id !== undefined) {
        baseRate = customResourceRates[master.resource_id];
      }

      if (baseRate === undefined || isNaN(Number(baseRate)) || Number(baseRate) <= 0) {
        baseRate = resolveComponentUnitRate(
          normRes,
          master,
          resources,
          zone,
          fiscalYear,
          customResourceRates
        );
      }

      const numBaseRate = Number(baseRate) || 0;
      const numQty = Number(normRes.quantity_per_base_unit) || 0;
      const subtotalBase = Math.round(numQty * numBaseRate * 100) / 100;

      switch (normRes.category) {
        case 'Labor':
          laborCost += subtotalBase;
          break;
        case 'Material':
          baseMaterialCost += subtotalBase;
          break;
        case 'Equipment':
          equipmentCost += subtotalBase;
          break;
        case 'Transport':
          transportCost += subtotalBase;
          break;
        default:
          baseMaterialCost += subtotalBase;
      }

      fixedResources.push({
        normRes,
        master,
        baseRate: numBaseRate,
        effectiveName,
        subtotalBase,
        isTaxFree
      });
    }
  });

  // Now process percentage-based resources using accumulated labor/equipment costs
  const percentBreakdowns: Array<{
    normRes: any;
    master: ResourceMaster | undefined;
    baseRate: number;
    displayQuantity: number;
    effectiveName: string;
    subtotalBase: number;
    isTaxFree: boolean;
    isPercentItem: boolean;
  }> = [];

  percentResources.forEach(pItem => {
    let baseAmount = 0;
    if (pItem.percentInfo.type === 'percent_equipment') {
      baseAmount = equipmentCost;
    } else if (pItem.percentInfo.type === 'percent_material') {
      baseAmount = baseMaterialCost;
    } else {
      // Default to percent_labour
      baseAmount = laborCost;
    }

    const calculatedSubtotal = Math.round((baseAmount * pItem.percentInfo.percentFraction) * 100) / 100;

    if (pItem.normRes.category === 'Labor') {
      laborCost += calculatedSubtotal;
    } else if (pItem.normRes.category === 'Equipment') {
      equipmentCost += calculatedSubtotal;
    } else {
      baseMaterialCost += calculatedSubtotal;
    }

    percentBreakdowns.push({
      normRes: pItem.normRes,
      master: pItem.master,
      baseRate: baseAmount, // Base cost (total labor or total equipment cost)
      displayQuantity: pItem.percentInfo.percentFraction,
      effectiveName: pItem.effectiveName,
      subtotalBase: calculatedSubtotal,
      isTaxFree: pItem.percentInfo.type === 'percent_labour' ? true : pItem.isTaxFree,
      isPercentItem: true
    });
  });

  const rawBreakdown = [...fixedResources, ...percentBreakdowns];

  // Calculate extra Lead haulage cost if leadKm > 0
  const leadHaulageRatePerKmTon = 28; // currency per ton-km standard tipper rate
  const totalMaterialVolume = norm.resources
    .filter(r => r.category === 'Material')
    .reduce((acc, r) => acc + (r.quantity_per_base_unit || 0), 0);
  const leadCost = leadKm * totalMaterialVolume * leadHaulageRatePerKmTon;

  // Royalty tax calculation for raw quarry materials
  const royaltyTax = totalMaterialVolume * royaltyPerCum;

  // Calculate User Material & Equipment Costs accounting for Tax-exempt items
  let userMaterialCost = 0;
  let userMaterialTaxAmount = 0;
  let userEquipmentCost = 0;
  let userEquipmentTaxAmount = 0;

  fixedResources.forEach(item => {
    const isMat = item.normRes.category === 'Material' || item.normRes.category === 'Unclassified';
    const isEqp = item.normRes.category === 'Equipment';

    if (isMat) {
      if (item.isTaxFree) {
        userMaterialCost += item.subtotalBase; // No Tax added
      } else {
        const itemTax = item.subtotalBase * (materialTaxPercent / 100);
        userMaterialTaxAmount += itemTax;
        userMaterialCost += (item.subtotalBase + itemTax);
      }
    } else if (isEqp) {
      if (item.isTaxFree) {
        userEquipmentCost += item.subtotalBase; // No Tax added
      } else {
        const itemTax = item.subtotalBase * (equipmentTaxPercent / 100);
        userEquipmentTaxAmount += itemTax;
        userEquipmentCost += (item.subtotalBase + itemTax);
      }
    }
  });

  percentBreakdowns.forEach(pItem => {
    const isMat = pItem.normRes.category === 'Material' || pItem.normRes.category === 'Unclassified';
    const isEqp = pItem.normRes.category === 'Equipment';

    if (isMat) {
      if (pItem.isTaxFree) {
        userMaterialCost += pItem.subtotalBase;
      } else {
        const itemTax = pItem.subtotalBase * (materialTaxPercent / 100);
        userMaterialTaxAmount += itemTax;
        userMaterialCost += (pItem.subtotalBase + itemTax);
      }
    } else if (isEqp) {
      if (pItem.isTaxFree) {
        userEquipmentCost += pItem.subtotalBase;
      } else {
        const itemTax = pItem.subtotalBase * (equipmentTaxPercent / 100);
        userEquipmentTaxAmount += itemTax;
        userEquipmentCost += (pItem.subtotalBase + itemTax);
      }
    }
  });

  const userDirectCost = laborCost + userMaterialCost + userEquipmentCost + transportCost + leadCost + royaltyTax;
  const userNormTotal = userDirectCost; // 0% overhead
  const userUnitRate = norm.base_quantity > 0 ? userNormTotal / norm.base_quantity : userNormTotal;

  // --- Calculate CONTRACTOR MODE rates ---
  const contractorDirectCost = laborCost + baseMaterialCost + equipmentCost + transportCost + leadCost + royaltyTax;
  const contractorOverheadAmount = contractorDirectCost * (contractorOverheadPercent / 100);
  const contractorNormTotal = contractorDirectCost + contractorOverheadAmount;
  const contractorUnitRate = norm.base_quantity > 0 ? contractorNormTotal / norm.base_quantity : contractorNormTotal;
  const contractorUnitRateWithTax = contractorUnitRate * (1 + (taxPercent / 100));

  // Build active breakdown based on current mode
  const breakdown: RateCalculationResult['breakdown'] = rawBreakdown.map(item => {
    const isMaterial = item.normRes.category === 'Material' || item.normRes.category === 'Unclassified';
    const isEquipment = item.normRes.category === 'Equipment';
    const isUserMode = mode === 'user';
    const isTaxApplicable = (isMaterial || isEquipment) && isUserMode && !item.isTaxFree;
    const taxPct = isEquipment ? equipmentTaxPercent : materialTaxPercent;
    
    // In User Mode, non-Tax-exempt material/equipment rate includes tax directly
    const effectiveUnitRate = isTaxApplicable
      ? Math.round(item.baseRate * (1 + taxPct / 100) * 100) / 100
      : item.baseRate;

    const displayQty = (item as any).displayQuantity !== undefined
      ? (item as any).displayQuantity
      : item.normRes.quantity_per_base_unit;

    const subtotal = (item as any).isPercentItem
      ? (isTaxApplicable ? Math.round(item.subtotalBase * (1 + taxPct / 100) * 100) / 100 : item.subtotalBase)
      : displayQty * effectiveUnitRate;

    return {
      resource_id: item.normRes.resource_id,
      resource_name: item.effectiveName,
      category: item.normRes.category,
      quantity: displayQty,
      unit: item.normRes.unit_override || (item.master ? item.master.unit : 'unit'),
      unit_rate: effectiveUnitRate,
      base_rate: item.baseRate,
      subtotal: Math.round(subtotal * 100) / 100,
      tax_included: isTaxApplicable
    };
  });

  const isUser = mode === 'user';
  const activeMaterialCost = isUser ? userMaterialCost : baseMaterialCost;
  const activeMaterialTaxAmount = isUser ? userMaterialTaxAmount : 0;
  const activeEquipmentCost = isUser ? userEquipmentCost : equipmentCost;
  const activeEquipmentTaxAmount = isUser ? userEquipmentTaxAmount : 0;
  const activeDirectCost = isUser ? userDirectCost : contractorDirectCost;
  const activeOverheadAmount = isUser ? 0 : contractorOverheadAmount;
  const activeUnitRate = isUser ? userUnitRate : contractorUnitRate;
  const activeTotalWithTax = isUser ? userUnitRate : contractorUnitRateWithTax;

  const result: RateCalculationResult = {
    norm_id: norm.item_id,
    item_code: norm.code,
    description: norm.description,
    base_quantity: norm.base_quantity,
    base_unit: norm.base_unit,
    zone: zone?.name_en || '',
    fiscal_year: fiscalYear,
    mode,

    labor_cost: Math.round(laborCost * 100) / 100,
    material_cost: Math.round(activeMaterialCost * 100) / 100,
    material_tax_amount: Math.round(activeMaterialTaxAmount * 100) / 100,
    equipment_cost: Math.round(activeEquipmentCost * 100) / 100,
    equipment_tax_amount: Math.round(activeEquipmentTaxAmount * 100) / 100,
    transport_cost: Math.round(transportCost * 100) / 100,

    lead_cost: Math.round(leadCost * 100) / 100,
    lift_cost: 0,
    royalty_tax: Math.round(royaltyTax * 100) / 100,

    subtotal_direct_cost: Math.round(activeDirectCost * 100) / 100,
    contractor_overhead_amount: Math.round(activeOverheadAmount * 100) / 100,
    total_unit_rate: Math.round(activeUnitRate * 100) / 100,
    total_rate_with_tax: Math.round(activeTotalWithTax * 100) / 100,

    user_unit_rate: Math.round(userUnitRate * 100) / 100,
    contractor_unit_rate: Math.round(contractorUnitRate * 100) / 100,

    breakdown
  };

  // Cache result for rapid repeat lookups
  rateCalculationCache.set(cacheKey, result);

  return result;
}

/**
 * Calculates a quantity according to decimal precision and optional truncation (floor).
 */
export function calcQuantityVal(value: number, precision: number = 2, truncate: boolean = false): number {
  const num = Number(value) || 0;
  const factor = Math.pow(10, precision);
  if (truncate) {
    return (num >= 0 ? Math.floor(num * factor + 0.0000000001) : Math.ceil(num * factor - 0.0000000001)) / factor;
  }
  return Math.round(num * factor) / factor;
}

/**
 * Formats a quantity value with precision and optional truncation.
 */
export function formatQuantity(value: number, precision: number = 2, truncate: boolean = false): string {
  const val = calcQuantityVal(value, precision, truncate);
  return val.toFixed(precision);
}

