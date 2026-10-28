import * as XLSX from 'xlsx';
import { ProjectEstimate, RateNormItem, ResourceMaster, ZoneInfo } from '../types';
import { calculateItemRate } from './rateEngine';
import { currencyCode } from './currency';

export interface MasterWorkbookExportOptions {
  project: ProjectEstimate;
  norms: RateNormItem[];
  resources: ResourceMaster[];
  selectedZone: ZoneInfo;
  selectedFY: string;
  calcMode?: 'user' | 'contractor';
  overheadPercent?: number;
  taxPercent?: number;
}

/**
 * Generates and downloads a complete multi-sheet Master Engineering Estimation Workbook (.xlsx)
 * conforming to Government (Roads / Buildings Dept. / MoUD) standards.
 */
export function exportMasterWorkbookExcel(options: MasterWorkbookExportOptions): void {
  const {
    project,
    norms,
    resources,
    selectedZone,
    selectedFY,
    calcMode = 'user',
    overheadPercent = 15,
    taxPercent = 13
  } = options;

  const wb = XLSX.utils.book_new();

  // ==========================================
  // SHEET 1: PROJECT COVER & ABSTRACT SUMMARY
  // ==========================================
  const summaryRows: any[][] = [
    ['PROJECT ESTIMATION SYSTEM'],
    ['MASTER PROJECT ESTIMATE & RATE ANALYSIS WORKBOOK'],
    [''],
    ['Project Title:', project.title || 'Infrastructure Project'],
    ['Client / Authority:', project.client_name || 'Government Authority / Department'],
    ['Zone:', selectedZone.name_en],
    ['Fiscal Year:', selectedFY],
    ['Estimation Mode:', calcMode === 'user' ? 'Government / Office Estimate' : 'Contractor / Tender Estimate'],
    ['Export Date:', new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })],
    [''],
    ['--- SUMMARY OF COSTS ---'],
    ['Total BOQ Items:', project.items.length]
  ];

  let boqSubtotal = 0;
  project.items.forEach((item) => {
    const qty = Number(item.estimated_quantity) || 0;
    const rate = calcMode === 'user'
      ? (item.user_rate ?? item.calculated_unit_rate)
      : (item.contractor_rate ?? item.calculated_unit_rate);
    boqSubtotal += qty * rate;
  });

  const taxAmount = (boqSubtotal * taxPercent) / 100;
  const grandTotal = boqSubtotal + taxAmount;

  summaryRows.push(
    [`Subtotal Direct Amount (${currencyCode()}):`, boqSubtotal.toFixed(2)],
    [`Tax (${taxPercent}%):`, taxAmount.toFixed(2)],
    [`Grand Total Amount (${currencyCode()}):`, grandTotal.toFixed(2)]
  );

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Cover & Summary');

  // ==========================================
  // SHEET 2: BILL OF QUANTITIES (BOQ ABSTRACT)
  // ==========================================
  const boqHeaders = [
    'S.N.',
    'Item Code',
    'Item Description / Specification',
    'Unit',
    'Quantity',
    `Rate (${currencyCode()})`,
    `Amount (${currencyCode()})`,
    'Remarks'
  ];

  const boqDataRows: any[][] = [
    ['BILL OF QUANTITIES (BOQ) ABSTRACT OF COST'],
    [`Project: ${project.title || ''} | Zone: ${selectedZone.name_en} | FY: ${selectedFY}`],
    [''],
    boqHeaders
  ];

  project.items.forEach((item, idx) => {
    const qty = Number(item.estimated_quantity) || 0;
    const rate = calcMode === 'user'
      ? (item.user_rate ?? item.calculated_unit_rate)
      : (item.contractor_rate ?? item.calculated_unit_rate);
    const amt = qty * rate;

    boqDataRows.push([
      idx + 1,
      item.item_code || `Item-${idx + 1}`,
      item.description,
      item.unit,
      qty,
      rate,
      amt,
      item.chapter || ''
    ]);
  });

  boqDataRows.push(
    ['', '', '', '', '', 'Subtotal:', boqSubtotal, ''],
    ['', '', '', '', '', `Tax (${taxPercent}%):`, taxAmount, ''],
    ['', '', '', '', '', `Grand Total (${currencyCode()}):`, grandTotal, '']
  );

  const wsBOQ = XLSX.utils.aoa_to_sheet(boqDataRows);
  XLSX.utils.book_append_sheet(wb, wsBOQ, 'BOQ Abstract');

  // ==========================================
  // SHEET 3: RATE ANALYSIS FOR ALL ITEMS
  // ==========================================
  const rateAnalysisRows: any[][] = [
    ['RATE ANALYSIS OF CONSTRUCTION ITEMS'],
    [`Zone: ${selectedZone.name_en} | FY: ${selectedFY} | Mode: ${calcMode.toUpperCase()}`],
    ['']
  ];

  // Calculate rate analysis for all items or available norms
  const itemsToAnalyze = project.items.length > 0
    ? project.items
    : norms.map((n, i) => ({
        id: `norm_${i}`,
        item_no: n.code,
        code: n.code,
        description: n.description,
        unit: n.base_unit,
        quantity: 1,
        rate: 0,
        amount: 0,
        norm_id: n.item_id
      }));

  itemsToAnalyze.forEach((item, itemIdx) => {
    const matchedNorm = norms.find(
      (n) =>
        (item.item_id && n.item_id === item.item_id) ||
        (item.item_code && n.code === item.item_code) ||
        (n.description === item.description)
    ) || norms[0];

    if (!matchedNorm) return;

    const calcResult = calculateItemRate({
      norm: matchedNorm,
      resources,
      zone: selectedZone,
      fiscalYear: selectedFY,
      mode: calcMode,
      contractorOverheadPercent: overheadPercent,
      taxPercent
    });

    rateAnalysisRows.push(
      [`ITEM ${itemIdx + 1}: ${matchedNorm.code} - ${matchedNorm.description}`],
      [`Base Quantity: ${matchedNorm.base_quantity} ${matchedNorm.base_unit} | Calculated Unit Rate: ${currencyCode()} ${calcResult.total_unit_rate.toFixed(2)}`],
      ['S.N.', 'Category', 'Resource Description', 'Unit', 'Norm Qty', `Rate (${currencyCode()})`, `Amount (${currencyCode()})`, 'Tax / Remarks']
    );

    calcResult.breakdown.forEach((res, rIdx) => {
      rateAnalysisRows.push([
        rIdx + 1,
        res.category,
        res.resource_name,
        res.unit,
        res.quantity,
        res.unit_rate,
        res.subtotal,
        res.tax_included ? 'Taxable' : 'Tax-Exempt'
      ]);
    });

    rateAnalysisRows.push(
      ['', '', '', '', 'Direct Cost:', '', calcResult.subtotal_direct_cost, ''],
      ['', '', '', '', `Overhead (${overheadPercent}%):`, '', calcResult.contractor_overhead_amount, ''],
      ['', '', '', '', `Total Unit Rate (${currencyCode()}):`, '', calcResult.total_unit_rate, `Per ${matchedNorm.base_unit}`],
      [''] // separator row
    );
  });

  const wsRateAnalysis = XLSX.utils.aoa_to_sheet(rateAnalysisRows);
  XLSX.utils.book_append_sheet(wb, wsRateAnalysis, 'Rate Analysis');

  // ==========================================
  // SHEET 4: MEASUREMENT BOOK (MB)
  // ==========================================
  const mbHeaders = [
    'Item No',
    'Description of Work',
    'Sub-Item / Chainage',
    'Nos',
    'Length (L)',
    'Breadth (B)',
    'Height (H)',
    'Quantity',
    'Unit',
    'Remarks'
  ];

  const mbRows: any[][] = [
    ['MEASUREMENT BOOK (DETAILED MEASUREMENTS)'],
    [`Project: ${project.title || ''} | Zone: ${selectedZone.name_en}`],
    [''],
    mbHeaders
  ];

  project.items.forEach((item) => {
    if (item.mb_rows && item.mb_rows.length > 0) {
      item.mb_rows.forEach((mbr, mbrIdx) => {
        mbRows.push([
          mbrIdx === 0 ? item.item_code : '',
          mbrIdx === 0 ? item.description : '',
          mbr.particulars || `Measurement ${mbrIdx + 1}`,
          mbr.no_of_units ?? 1,
          mbr.length ?? '',
          mbr.breadth ?? '',
          mbr.height ?? '',
          mbr.quantity ?? '',
          item.unit,
          mbr.remarks || ''
        ]);
      });
      mbRows.push(['', '', 'Total for Item:', '', '', '', '', item.estimated_quantity, item.unit, '']);
    } else {
      mbRows.push([
        item.item_code,
        item.description,
        'Lump Sum / Direct Quantity',
        1,
        '-',
        '-',
        '-',
        item.estimated_quantity,
        item.unit,
        item.chapter || ''
      ]);
    }
  });

  const wsMB = XLSX.utils.aoa_to_sheet(mbRows);
  XLSX.utils.book_append_sheet(wb, wsMB, 'Measurement Book');

  // ==========================================
  // SHEET 5: CONSOLIDATED RESOURCE QUANTITIES
  // ==========================================
  const resourceTotals = new Map<string, { name: string; category: string; unit: string; totalQty: number; rate: number }>();

  project.items.forEach((item) => {
    const qty = Number(item.estimated_quantity) || 0;
    if (qty <= 0) return;

    const matchedNorm = norms.find(
      (n) =>
        (item.item_id && n.item_id === item.item_id) ||
        (item.item_code && n.code === item.item_code)
    );

    if (matchedNorm && matchedNorm.resources) {
      matchedNorm.resources.forEach((r) => {
        const key = `${r.resource_name}_${r.category}_${r.unit_override || 'Unit'}`;
        const existing = resourceTotals.get(key) || {
          name: r.resource_name,
          category: r.category,
          unit: r.unit_override || 'Unit',
          totalQty: 0,
          rate: 0
        };
        existing.totalQty += (Number(r.quantity_per_base_unit) || 0) * qty;
        resourceTotals.set(key, existing);
      });
    }
  });

  const resRows: any[][] = [
    ['CONSOLIDATED RESOURCE BREAKDOWN'],
    [`Total required labor, materials, and equipment for project: ${project.title || ''}`],
    [''],
    ['S.N.', 'Category', 'Resource Description', 'Unit', 'Total Quantity Required', `Zone Rate (${currencyCode()})`, `Estimated Total Cost (${currencyCode()})`]
  ];

  let rSn = 1;
  let totalResourceCost = 0;
  resourceTotals.forEach((val) => {
    const matchedMaster = resources.find((mr) => mr.name.toLowerCase() === val.name.toLowerCase());
    const rate = matchedMaster ? (matchedMaster.default_rate || 0) : 0;
    const cost = val.totalQty * rate;
    totalResourceCost += cost;

    resRows.push([
      rSn++,
      val.category,
      val.name,
      val.unit,
      val.totalQty.toFixed(2),
      rate > 0 ? rate : '—',
      cost > 0 ? cost.toFixed(2) : '—'
    ]);
  });

  resRows.push(
    ['', '', '', '', 'Total Resource Cost:', '', totalResourceCost.toFixed(2)]
  );

  const wsResources = XLSX.utils.aoa_to_sheet(resRows);
  XLSX.utils.book_append_sheet(wb, wsResources, 'Resource Breakdown');

  // Trigger Download
  const filename = `${(project.title || 'Project_Estimate').replace(/[^a-zA-Z0-9_-]/g, '_')}_Master_Workbook.xlsx`;
  XLSX.writeFile(wb, filename);
}
