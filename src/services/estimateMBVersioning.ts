import {
  ProjectEstimate,
  BOQItem,
  EstimateMBVersion,
  ValuationMBBook,
  ValuationMBRow
} from '../types';
import { DrawingSectionDef, ProtectionWallComponentMapping } from '../components/drawings/types';

const ESTIMATE_MB_VERSIONS_PREFIX = 'uev_estimate_mb_versions_';

/**
 * Load all saved Estimate MB versions for a specific project
 */
export function loadEstimateMBVersions(projectId: string): EstimateMBVersion[] {
  try {
    const raw = localStorage.getItem(`${ESTIMATE_MB_VERSIONS_PREFIX}${projectId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load Estimate MB versions:', err);
    return [];
  }
}

/**
 * Save or append an Estimate MB version
 */
export function saveEstimateMBVersion(projectId: string, version: EstimateMBVersion): EstimateMBVersion[] {
  const versions = loadEstimateMBVersions(projectId);
  const existingIdx = versions.findIndex((v) => v.id === version.id);

  if (existingIdx >= 0) {
    versions[existingIdx] = version;
  } else {
    versions.unshift(version);
  }

  try {
    localStorage.setItem(`${ESTIMATE_MB_VERSIONS_PREFIX}${projectId}`, JSON.stringify(versions));
  } catch (err) {
    console.error('Failed to save Estimate MB version:', err);
  }
  return versions;
}

/**
 * Delete a specific Estimate MB version
 */
export function deleteEstimateMBVersion(projectId: string, versionId: string): EstimateMBVersion[] {
  const versions = loadEstimateMBVersions(projectId);
  const filtered = versions.filter((v) => v.id !== versionId);
  try {
    localStorage.setItem(`${ESTIMATE_MB_VERSIONS_PREFIX}${projectId}`, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete Estimate MB version:', err);
  }
  return filtered;
}

/**
 * Create a new snapshot of current Project Estimate MB
 */
export function createEstimateMBSnapshot(
  project: ProjectEstimate,
  options: {
    title?: string;
    source?: 'CAD_DRAWING_ESTIMATE' | 'MANUAL_MB' | 'EXCEL_IMPORT' | 'RESTORED';
    drawingCategory?: string;
    variantKey?: string;
    variantName?: string;
    sections?: DrawingSectionDef[];
    drawingParams?: any;
    mapping?: any;
    notes?: string;
  }
): EstimateMBVersion {
  const totalAmount = project.items.reduce((sum, it) => sum + (it.total_amount || 0), 0);
  const totalItemsCount = project.items.length;
  const existingVersions = loadEstimateMBVersions(project.id);
  const nextVerNum = `v1.${existingVersions.length}`;

  const sectionsSummary = options.sections?.map((sec) => {
    const topW = sec.params.wallTopWidth || 0.6;
    const botW = sec.params.wallBottomWidth || 1.5;
    const avgW = (topW + botW) / 2;
    return {
      sectionCode: sec.sectionCode,
      title: sec.title,
      chainageStart: sec.chainageStart,
      chainageEnd: sec.chainageEnd,
      length: sec.params.wallLength || 0,
      height: sec.params.wallHeight || 0,
      width: parseFloat(avgW.toFixed(3))
    };
  });

  const newVersion: EstimateMBVersion = {
    id: `est_mb_ver_${Date.now()}`,
    version_number: nextVerNum,
    title: options.title || `Estimate MB Snapshot (${options.variantName || options.drawingCategory || 'CAD Sync'})`,
    created_at: new Date().toISOString(),
    source: options.source || 'CAD_DRAWING_ESTIMATE',
    drawing_category: options.drawingCategory,
    variant_name: options.variantName,
    items_snapshot: JSON.parse(JSON.stringify(project.items)),
    total_estimate_amount: parseFloat(totalAmount.toFixed(2)),
    total_items_count: totalItemsCount,
    sections_summary: sectionsSummary,
    saved_drawing_params: options.drawingParams ? JSON.parse(JSON.stringify(options.drawingParams)) : undefined,
    saved_drawing_sections: options.sections ? JSON.parse(JSON.stringify(options.sections)) : undefined,
    saved_variant_key: options.variantKey,
    saved_mapping: options.mapping ? JSON.parse(JSON.stringify(options.mapping)) : undefined,
    notes: options.notes || `Created before CAD feed into Estimate MB at ${new Date().toLocaleTimeString()}`
  };

  saveEstimateMBVersion(project.id, newVersion);
  return newVersion;
}

/**
 * Feed CAD Multi-Sections into Valuation MB (Running Bill / Final Bill)
 */
export interface FeedToValuationMBParams {
  projectId: string;
  targetBookId: string;
  targetBookTitle: string;
  ipcNumber: number;
  dateBS?: string;
  verifiedBy?: string;
  sections: DrawingSectionDef[];
  drawingCategory: string;
  variantKey: string;
  mapping: ProtectionWallComponentMapping;
  projectItems: BOQItem[];
  existingValuationRows: ValuationMBRow[];
  selectedSectionIds?: string[]; // If undefined, feed all sections
}

export function feedCADSectionsToValuationMB(params: {
  projectId: string;
  targetBookId: string;
  targetBookTitle: string;
  ipcNumber: number;
  dateBS?: string;
  verifiedBy?: string;
  sections: DrawingSectionDef[];
  drawingCategory: string;
  variantKey: string;
  mapping: ProtectionWallComponentMapping;
  projectItems: BOQItem[];
  existingValuationRows: ValuationMBRow[];
  selectedSectionIds?: string[];
  mode?: 'append' | 'replace_book_category';
}): {
  updatedValuationRows: ValuationMBRow[];
  addedRowsCount: number;
  totalQuantityThisBill: number;
  feedSummary: Array<{
    itemDescription: string;
    itemCode: string;
    unit: string;
    rowsCount: number;
    totalQty: number;
  }>;
} {
  const {
    targetBookId,
    ipcNumber,
    dateBS = '2026-05-15',
    verifiedBy = 'Site Engineer',
    sections,
    variantKey,
    mapping,
    projectItems,
    existingValuationRows,
    selectedSectionIds,
    mode = 'append'
  } = params;

  const targetSections = selectedSectionIds && selectedSectionIds.length > 0
    ? sections.filter((s) => selectedSectionIds.includes(s.id))
    : sections;

  const newRows: ValuationMBRow[] = [];
  const summaryMap: Record<string, { itemDescription: string; itemCode: string; unit: string; rowsCount: number; totalQty: number }> = {};

  // If dynamic components are provided in mapping, iterate over all enabled mapped components
  if (mapping.dynamicComponents && mapping.dynamicComponents.length > 0) {
    const activeComps = mapping.dynamicComponents.filter((c) => c.enabled !== false && c.mappedItemId);
    for (const comp of activeComps) {
      const boqItem = projectItems.find((i) => i.id === comp.mappedItemId);
      if (!boqItem) continue;

      targetSections.forEach((sec) => {
        // Calculate component specific parameters & quantities
        const p = sec.params;
        const l = p.wallLength || 10.0;
        const h = p.wallHeight || 2.5;
        const topW = p.wallTopWidth || 0.6;
        const botW = p.wallBottomWidth || 1.5;
        const avgW = (topW + botW) / 2;
        const chStr = sec.chainageStart && sec.chainageEnd ? `(Ch. ${sec.chainageStart} to ${sec.chainageEnd})` : '';

        const isItemSqM = (boqItem.unit || comp.unit || '').toLowerCase().includes('m2') || (boqItem.unit || comp.unit || '').toLowerCase().includes('sq');
        const isItemKg = (boqItem.unit || comp.unit || '').toLowerCase().includes('kg');
        const isItemTon = (boqItem.unit || comp.unit || '').toLowerCase().includes('ton') || (boqItem.unit || comp.unit || '').toLowerCase().includes('mt');
        const isItemNos = (boqItem.unit || comp.unit || '').toLowerCase().includes('no') || (boqItem.unit || comp.unit || '').toLowerCase().includes('pc');

        let qty = 0;
        let len = l;
        let br = 1;
        let ht = 1;
        let nos = 1;
        let particulars = `${sec.sectionCode} ${chStr}: ${comp.name}`;

        switch (comp.calcFormula) {
          case 'excavation_pit': {
            br = p.excavationWidth || (p.pccWidth + 0.6);
            ht = p.excavationDepth || 1.2;
            qty = parseFloat((len * br * ht).toFixed(3));
            particulars = `${sec.sectionCode} ${chStr}: Foundation Trench Excavation Pit`;
            break;
          }
          case 'soling_bed': {
            br = p.solingWidth || (p.pccWidth + 0.1);
            ht = isItemSqM ? 1 : (p.solingThickness || 0.15);
            qty = isItemSqM ? parseFloat((len * br).toFixed(3)) : parseFloat((len * br * ht).toFixed(3));
            particulars = `${sec.sectionCode} ${chStr}: Soling Bedding Layer`;
            break;
          }
          case 'pcc_bed': {
            br = p.pccWidth || (botW + 0.3);
            ht = p.pccThickness || 0.15;
            qty = parseFloat((len * br * ht).toFixed(3));
            particulars = `${sec.sectionCode} ${chStr}: Bed PCC (1:3:6) Base Leveling Layer`;
            break;
          }
          case 'wall_body_masonry': {
            br = avgW;
            ht = h;
            qty = parseFloat((len * br * ht).toFixed(3));
            particulars = `${sec.sectionCode} ${chStr}: ${comp.name} (Top=${topW.toFixed(2)}m, Bot=${botW.toFixed(2)}m, H=${h.toFixed(2)}m)`;
            break;
          }
          case 'wall_body_rcc': {
            const baseSlabW = p.baseSlabWidth || Math.max(1.80, botW + 1.60);
            const baseSlabT = p.baseSlabThickness || 0.35;
            const stemVol = len * avgW * h;
            const baseVol = len * baseSlabW * baseSlabT;
            qty = parseFloat((stemVol + baseVol).toFixed(3));
            br = parseFloat(((stemVol + baseVol) / (len * (h + baseSlabT))).toFixed(3));
            ht = parseFloat((h + baseSlabT).toFixed(3));
            particulars = `${sec.sectionCode} ${chStr}: RCC M20/25 Concrete (Stem + Base Slab)`;
            break;
          }
          case 'pcc_coping_124':
          case 'pcc_coping_m15': {
            const copingT = comp.userFactor || p.copingThickness || 0.075;
            br = topW;
            ht = copingT;
            qty = parseFloat((len * br * ht).toFixed(3));
            particulars = `${sec.sectionCode} ${chStr}: ${comp.name} Coping Band (W=${topW.toFixed(2)}m, T=${copingT}m)`;
            break;
          }
          case 'plaster_surface': {
            const expHt = h + topW * 0.5;
            ht = parseFloat(expHt.toFixed(3));
            br = 1;
            qty = parseFloat((len * ht).toFixed(3));
            particulars = `${sec.sectionCode} ${chStr}: Cement Plaster on Wall Face`;
            break;
          }
          case 'punning_surface': {
            const punnW = parseFloat((topW + 0.30).toFixed(3));
            br = punnW;
            ht = 1;
            qty = parseFloat((len * br).toFixed(3));
            particulars = `${sec.sectionCode} ${chStr}: Neat Cement Punning on Coping Band`;
            break;
          }
          case 'pointing_surface': {
            const sides = p.formworkSides === 'both' ? 2 : 1;
            nos = sides;
            ht = h;
            br = 1;
            qty = parseFloat((nos * len * ht).toFixed(3));
            particulars = `${sec.sectionCode} ${chStr}: Pointing on Exposed Masonry Face (${sides} sides)`;
            break;
          }
          case 'weep_hole_pvc': {
            const spacing = comp.userFactor || 1.5;
            const rowsCount = Math.max(1, Math.floor(h / 1.2));
            const nosPerSec = Math.max(1, Math.round(l / spacing)) * rowsCount;
            if (isItemNos) {
              qty = nosPerSec;
              nos = nosPerSec;
              particulars = `${sec.sectionCode} ${chStr}: Weep Holes (${nosPerSec} Nos)`;
            } else {
              const pipeLen = parseFloat((avgW + 0.15).toFixed(3));
              qty = parseFloat((nosPerSec * pipeLen).toFixed(3));
              nos = nosPerSec;
              len = pipeLen;
              particulars = `${sec.sectionCode} ${chStr}: PVC Weep Hole Pipes (${nosPerSec} Nos × ${pipeLen}m)`;
            }
            break;
          }
          case 'reinforcement_steel': {
            const baseSlabW = p.baseSlabWidth || Math.max(1.80, botW + 1.60);
            const baseSlabT = p.baseSlabThickness || 0.35;
            const totalRccVol = len * avgW * h + len * baseSlabW * baseSlabT;
            const density = comp.userFactor || p.rebarDensityKgPerM3 || 95;
            const totalKg = totalRccVol * density;
            qty = isItemTon ? parseFloat((totalKg / 1000).toFixed(4)) : parseFloat(totalKg.toFixed(2));
            len = parseFloat(totalRccVol.toFixed(3));
            br = density;
            particulars = `${sec.sectionCode} ${chStr}: Reinforcement Steel Fe500 (${density} kg/m³)`;
            break;
          }
          case 'formwork_shuttering': {
            const userFactor = typeof comp.userFactor === 'number' ? comp.userFactor : 2.0;
            const formH = p.formworkHeight || h;
            qty = parseFloat((len * formH * userFactor).toFixed(3));
            nos = userFactor;
            ht = formH;
            particulars = `${sec.sectionCode} ${chStr}: Wall Formwork Shuttering (${userFactor}x factor)`;
            break;
          }
          default: {
            const factor = comp.userFactor || 1.0;
            qty = parseFloat((len * h * factor).toFixed(3));
            particulars = `${sec.sectionCode} ${chStr}: ${comp.name}`;
            break;
          }
        }

        const row: ValuationMBRow = {
          id: `vmb_row_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          mb_id: targetBookId,
          mb_book_id: targetBookId,
          boq_item_id: boqItem.id,
          ipc_number: ipcNumber,
          date_iso: dateBS,
          particulars,
          no_of_units: nos,
          length: len,
          breadth: br,
          height: ht,
          quantity_this_bill: qty,
          unit: boqItem.unit || comp.unit || 'm3',
          verified_by: verifiedBy,
          remarks: `CAD Site As-Built ${sec.sectionCode}`,
          custom_fields: {
            sectionId: sec.id,
            sectionCode: sec.sectionCode,
            chainageStart: sec.chainageStart,
            chainageEnd: sec.chainageEnd,
            componentKey: comp.key,
            componentName: comp.name,
            drawingCategory: 'protection_wall',
            variantKey
          }
        };
        newRows.push(row);

        if (!summaryMap[boqItem.id]) {
          summaryMap[boqItem.id] = {
            itemDescription: boqItem.description,
            itemCode: boqItem.code || 'ITEM',
            unit: boqItem.unit || comp.unit || 'm3',
            rowsCount: 0,
            totalQty: 0
          };
        }
        summaryMap[boqItem.id].rowsCount += 1;
        summaryMap[boqItem.id].totalQty += qty;
      });
    }
  } else {
    // Fallback to legacy 5 items
    const wallItem = projectItems.find((i) => i.id === mapping.wallItemId);
    const pccItem = projectItems.find((i) => i.id === mapping.pccItemId);
    const solingItem = projectItems.find((i) => i.id === mapping.solingItemId);
    const excItem = projectItems.find((i) => i.id === mapping.excavationItemId);
    const formworkItem = projectItems.find((i) => i.id === mapping.formworkItemId);

    // 1. Excavation Pit
    if (excItem) {
      targetSections.forEach((sec) => {
        const l = sec.params.wallLength || 10;
        const b = sec.params.excavationWidth || (sec.params.pccWidth + 0.6);
        const h = sec.params.excavationDepth || 1.2;
        const qty = parseFloat((l * b * h).toFixed(3));
        const chStr = sec.chainageStart && sec.chainageEnd ? `(Ch. ${sec.chainageStart} to ${sec.chainageEnd})` : '';

        const row: ValuationMBRow = {
          id: `vmb_row_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          mb_id: targetBookId,
          mb_book_id: targetBookId,
          boq_item_id: excItem.id,
          ipc_number: ipcNumber,
          date_iso: dateBS,
          particulars: `${sec.sectionCode} ${chStr}: Foundation Trench Excavation Pit`,
          no_of_units: 1,
          length: l,
          breadth: b,
          height: h,
          quantity_this_bill: qty,
          unit: excItem.unit || 'm3',
          verified_by: verifiedBy,
          remarks: `CAD Site As-Built ${sec.sectionCode}`,
          custom_fields: {
            sectionId: sec.id,
            sectionCode: sec.sectionCode,
            chainageStart: sec.chainageStart,
            chainageEnd: sec.chainageEnd,
            drawingCategory: 'protection_wall',
            variantKey
          }
        };
        newRows.push(row);

        if (!summaryMap[excItem.id]) {
          summaryMap[excItem.id] = { itemDescription: excItem.description, itemCode: excItem.code || 'EXC', unit: excItem.unit || 'm3', rowsCount: 0, totalQty: 0 };
        }
        summaryMap[excItem.id].rowsCount += 1;
        summaryMap[excItem.id].totalQty += qty;
      });
    }

    // 2. Soling Bedding
    if (solingItem) {
      const isSqM = (solingItem.unit || '').toLowerCase().includes('m2') || (solingItem.unit || '').toLowerCase().includes('sq');
      targetSections.forEach((sec) => {
        const l = sec.params.wallLength || 10;
        const b = sec.params.solingWidth || (sec.params.pccWidth + 0.1);
        const h = isSqM ? 1 : (sec.params.solingThickness || 0.15);
        const qty = parseFloat((isSqM ? l * b : l * b * h).toFixed(3));
        const chStr = sec.chainageStart && sec.chainageEnd ? `(Ch. ${sec.chainageStart} to ${sec.chainageEnd})` : '';

        const row: ValuationMBRow = {
          id: `vmb_row_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          mb_id: targetBookId,
          mb_book_id: targetBookId,
          boq_item_id: solingItem.id,
          ipc_number: ipcNumber,
          date_iso: dateBS,
          particulars: `${sec.sectionCode} ${chStr}: Stone / Brick Soling Bedding`,
          no_of_units: 1,
          length: l,
          breadth: b,
          height: isSqM ? 1 : h,
          quantity_this_bill: qty,
          unit: solingItem.unit || (isSqM ? 'sq.m' : 'm3'),
          verified_by: verifiedBy,
          remarks: `CAD Site As-Built ${sec.sectionCode}`,
          custom_fields: {
            sectionId: sec.id,
            sectionCode: sec.sectionCode,
            chainageStart: sec.chainageStart,
            chainageEnd: sec.chainageEnd
          }
        };
        newRows.push(row);

        if (!summaryMap[solingItem.id]) {
          summaryMap[solingItem.id] = { itemDescription: solingItem.description, itemCode: solingItem.code || 'SOL', unit: solingItem.unit || 'm3', rowsCount: 0, totalQty: 0 };
        }
        summaryMap[solingItem.id].rowsCount += 1;
        summaryMap[solingItem.id].totalQty += qty;
      });
    }

    // 3. Bed PCC
    if (pccItem) {
      targetSections.forEach((sec) => {
        const l = sec.params.wallLength || 10;
        const b = sec.params.pccWidth || 1.8;
        const h = sec.params.pccThickness || 0.15;
        const qty = parseFloat((l * b * h).toFixed(3));
        const chStr = sec.chainageStart && sec.chainageEnd ? `(Ch. ${sec.chainageStart} to ${sec.chainageEnd})` : '';

        const row: ValuationMBRow = {
          id: `vmb_row_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          mb_id: targetBookId,
          mb_book_id: targetBookId,
          boq_item_id: pccItem.id,
          ipc_number: ipcNumber,
          date_iso: dateBS,
          particulars: `${sec.sectionCode} ${chStr}: Bed PCC 1:3:6 Leveling Concrete`,
          no_of_units: 1,
          length: l,
          breadth: b,
          height: h,
          quantity_this_bill: qty,
          unit: pccItem.unit || 'm3',
          verified_by: verifiedBy,
          remarks: `CAD Site As-Built ${sec.sectionCode}`,
          custom_fields: {
            sectionId: sec.id,
            sectionCode: sec.sectionCode,
            chainageStart: sec.chainageStart,
            chainageEnd: sec.chainageEnd
          }
        };
        newRows.push(row);

        if (!summaryMap[pccItem.id]) {
          summaryMap[pccItem.id] = { itemDescription: pccItem.description, itemCode: pccItem.code || 'PCC', unit: pccItem.unit || 'm3', rowsCount: 0, totalQty: 0 };
        }
        summaryMap[pccItem.id].rowsCount += 1;
        summaryMap[pccItem.id].totalQty += qty;
      });
    }

    // 4. Wall Structural Body (Stone / RCC / Plum / Brick)
    if (wallItem) {
      targetSections.forEach((sec) => {
        const l = sec.params.wallLength || 10;
        const topW = sec.params.wallTopWidth || 0.6;
        const botW = sec.params.wallBottomWidth || 1.5;
        const avgW = parseFloat(((topW + botW) / 2).toFixed(3));
        const h = sec.params.wallHeight || 2.5;
        const qty = parseFloat((l * avgW * h).toFixed(3));
        const chStr = sec.chainageStart && sec.chainageEnd ? `(Ch. ${sec.chainageStart} to ${sec.chainageEnd})` : '';
        const isVert = Math.abs(topW - botW) < 0.001;

        const row: ValuationMBRow = {
          id: `vmb_row_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          mb_id: targetBookId,
          mb_book_id: targetBookId,
          boq_item_id: wallItem.id,
          ipc_number: ipcNumber,
          date_iso: dateBS,
          particulars: `${sec.sectionCode} ${chStr}: ${isVert ? 'Vertical Protection Wall Body' : 'Tapered Protection Wall Body'} (Top=${topW}m, Bot=${botW}m, H=${h}m)`,
          no_of_units: 1,
          length: l,
          breadth: avgW,
          height: h,
          quantity_this_bill: qty,
          unit: wallItem.unit || 'm3',
          verified_by: verifiedBy,
          remarks: `CAD Site As-Built ${sec.sectionCode}`,
          custom_fields: {
            sectionId: sec.id,
            sectionCode: sec.sectionCode,
            chainageStart: sec.chainageStart,
            chainageEnd: sec.chainageEnd,
            top_width: topW,
            bottom_width: botW
          }
        };
        newRows.push(row);

        if (!summaryMap[wallItem.id]) {
          summaryMap[wallItem.id] = { itemDescription: wallItem.description, itemCode: wallItem.code || 'WALL', unit: wallItem.unit || 'm3', rowsCount: 0, totalQty: 0 };
        }
        summaryMap[wallItem.id].rowsCount += 1;
        summaryMap[wallItem.id].totalQty += qty;
      });
    }

    // 5. Formwork Shuttering
    if (formworkItem) {
      targetSections.forEach((sec) => {
        const l = sec.params.wallLength || 10;
        const h = sec.params.formworkHeight || sec.params.wallHeight || 2.5;
        const sidesMult = sec.params.formworkSides === 'both' ? 2 : 1;
        const qty = parseFloat((sidesMult * l * h).toFixed(3));
        const chStr = sec.chainageStart && sec.chainageEnd ? `(Ch. ${sec.chainageStart} to ${sec.chainageEnd})` : '';

        const row: ValuationMBRow = {
          id: `vmb_row_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          mb_id: targetBookId,
          mb_book_id: targetBookId,
          boq_item_id: formworkItem.id,
          ipc_number: ipcNumber,
          date_iso: dateBS,
          particulars: `${sec.sectionCode} ${chStr}: Wall Formwork Shuttering (${sec.params.formworkSides || 'both'} sides)`,
          no_of_units: sidesMult,
          length: l,
          breadth: 1,
          height: h,
          quantity_this_bill: qty,
          unit: formworkItem.unit || 'sq.m',
          verified_by: verifiedBy,
          remarks: `CAD Site As-Built ${sec.sectionCode}`,
          custom_fields: {
            sectionId: sec.id,
            sectionCode: sec.sectionCode,
            chainageStart: sec.chainageStart,
            chainageEnd: sec.chainageEnd
          }
        };
        newRows.push(row);

        if (!summaryMap[formworkItem.id]) {
          summaryMap[formworkItem.id] = { itemDescription: formworkItem.description, itemCode: formworkItem.code || 'FORM', unit: formworkItem.unit || 'sq.m', rowsCount: 0, totalQty: 0 };
        }
        summaryMap[formworkItem.id].rowsCount += 1;
        summaryMap[formworkItem.id].totalQty += qty;
      });
    }
  }

  let finalRows: ValuationMBRow[] = [];
  if (mode === 'replace_book_category') {
    // Keep rows from other books or non-mapped items
    const mappedItemIds = [
      mapping.wallItemId,
      mapping.pccItemId,
      mapping.solingItemId,
      mapping.excavationItemId,
      mapping.formworkItemId
    ].filter(Boolean);

    finalRows = existingValuationRows.filter(
      (r) => !(r.mb_id === targetBookId && mappedItemIds.includes(r.boq_item_id))
    );
    finalRows.push(...newRows);
  } else {
    finalRows = [...existingValuationRows, ...newRows];
  }

  // Persist valuation rows in local storage
  try {
    localStorage.setItem(`uev_valuation_rows_${params.projectId}`, JSON.stringify(finalRows));
  } catch (err) {
    console.error('Failed to persist valuation rows:', err);
  }

  const totalQtyThisBill = Object.values(summaryMap).reduce((sum, s) => sum + s.totalQty, 0);

  return {
    updatedValuationRows: finalRows,
    addedRowsCount: newRows.length,
    totalQuantityThisBill: parseFloat(totalQtyThisBill.toFixed(3)),
    feedSummary: Object.values(summaryMap)
  };
}
