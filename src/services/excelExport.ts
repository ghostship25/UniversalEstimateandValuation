import * as XLSX from 'xlsx';
import { ProjectEstimate, ZoneInfo, ResourceCategory } from '../types';
import { resolveFieldValue } from './mbFormulaEvaluator';
import { currencyCode } from './currency';

export interface AggregatedResource {
  id?: number | string;
  name: string;
  category: ResourceCategory;
  unit: string;
  total_quantity: number;
  used_in_items: Set<string> | Array<string | { item_code: string }>;
}

/**
 * Export Measurement Book (MB) with full detail rows and official header to Excel (.xlsx)
 */
export function exportMBToExcel(
  project: ProjectEstimate,
  zone: ZoneInfo,
  fiscalYear: string,
  targetBookId: string = 'all'
) {
  const mbBooks = project.measurement_books && project.measurement_books.length > 0
    ? project.measurement_books
    : [{ id: 'mb_1', code: 'MB-01', title: 'Main Civil & Structure Works' }];
  const defaultBookId = mbBooks[0]?.id || 'mb_1';

  const authorityHeader = project.local_authority || 'Sample City Authority, Local Authority Office, Sample City, Sample Province';
  const projectTitle = project.title || 'Construction work';
  const fy = project.fiscal_year || fiscalYear || '2025/26';
  const location = project.local_authority || 'Sample City -15';
  const budgetHead = project.budget_head_no || '';
  const duration = project.estimated_duration || '';

  // Collect all unique custom column names across all items in project
  const allCustomCols: string[] = [];
  project.items.forEach((item) => {
    (item.custom_column_names || []).forEach((col) => {
      if (col && !allCustomCols.includes(col)) {
        allCustomCols.push(col);
      }
    });
  });

  const emptyCustomCols = allCustomCols.map(() => '');

  // Construct Array of Arrays for Excel Worksheet
  const data: (string | number)[][] = [
    ['Sample City Authority'],
    ['Local Authority Office'],
    ['Sample City, Sample Province'],
    [''],
    ['Measurement Book Details'],
    [''],
    [`Program / Project Name: ${projectTitle}`, '', '', '', '', ...emptyCustomCols, `Fiscal Year: ${fy}`],
    [`Implementation Location: ${location}`, '', '', '', '', ...emptyCustomCols, `Budget sub-head no: ${budgetHead}`],
    [`Estimated completion period: ${duration}`, '', '', '', '', ...emptyCustomCols, ''],
    [''],
    [
      'S.No.',
      'Description of work/service (item and measurement details)',
      'Unit',
      'Quantity (No.)',
      'Length (L)',
      'Width (B)',
      'Height/depth (H)',
      ...allCustomCols,
      'Quantity',
      'Source of estimate / remarks'
    ]
  ];

  let snCounter = 1;

  project.items.forEach((item) => {
    const itemCodeStr = item.item_code ? `[Item ${item.item_code}] ` : '';
    const allRows = item.mb_rows || [];
    const filteredRows = targetBookId === 'all'
      ? allRows
      : allRows.filter((r) => (r.mb_book_id || defaultBookId) === targetBookId);

    const itemScopeQty = targetBookId === 'all'
      ? (item.estimated_quantity || 0)
      : (filteredRows.length > 0
          ? filteredRows.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0)
          : (!item.mb_rows || item.mb_rows.length === 0
              ? (targetBookId === defaultBookId ? item.estimated_quantity : 0)
              : 0));

    // Main Item Header Row
    data.push([
      snCounter++,
      `${itemCodeStr}${item.description}`,
      item.unit,
      '',
      '',
      '',
      '',
      ...emptyCustomCols,
      Number(itemScopeQty || 0),
      item.chapter || 'BLD Norms'
    ]);

    // Detail rows
    if (filteredRows.length > 0) {
      filteredRows.forEach((row, subIdx) => {
        if (row.is_heading) {
          data.push(['', `   📌 ${row.particulars}`, '', '', '', '', '', ...emptyCustomCols, '', '']);
        } else {
          const noVal = resolveFieldValue(row.no_of_units, filteredRows, subIdx, project.items);
          const lVal = resolveFieldValue(row.length, filteredRows, subIdx, project.items);
          const bVal = resolveFieldValue(row.breadth, filteredRows, subIdx, project.items);
          const hVal = resolveFieldValue(row.height, filteredRows, subIdx, project.items);
          const customVals = allCustomCols.map((colName) =>
            resolveFieldValue(row.custom_fields?.[colName], filteredRows, subIdx, project.items)
          );

          data.push([
            '',
            `   • ${row.particulars || 'Sub-measurement'}`,
            item.unit,
            noVal !== undefined ? noVal : '-',
            lVal !== undefined ? lVal : '-',
            bVal !== undefined ? bVal : '-',
            hVal !== undefined ? hVal : '-',
            ...customVals,
            Number(row.quantity || 0),
            row.remarks || ''
          ]);
        }
      });

      // Item total summary row
      data.push([
        '',
        ` [ (Total ${item.item_code})]:`,
        item.unit,
        '',
        '',
        '',
        '',
        ...emptyCustomCols,
        Number(itemScopeQty || 0),
        ''
      ]);
    }
    data.push(['']); // Spacing row
  });

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  const totalColsCount = 8 + allCustomCols.length; // 0 to 8 + allCustomCols.length

  // Set Column Widths
  worksheet['!cols'] = [
    { wch: 8 },  // S.N.
    { wch: 45 }, // Description
    { wch: 10 }, // Unit
    { wch: 12 }, // No
    { wch: 12 }, // L
    { wch: 12 }, // B
    { wch: 12 }, // H
    ...allCustomCols.map(() => ({ wch: 14 })), // Custom columns
    { wch: 16 }, // Quantity
    { wch: 25 }  // Remarks
  ];

  // Title Row Merges
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalColsCount } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalColsCount } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: totalColsCount } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: totalColsCount } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: 4 } },
    { s: { r: 6, c: 5 }, e: { r: 6, c: totalColsCount } },
    { s: { r: 7, c: 0 }, e: { r: 7, c: 4 } },
    { s: { r: 7, c: 5 }, e: { r: 7, c: totalColsCount } }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Measurement Book');

  const safeTitle = (project.title || 'MB_Estimate').replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_');
  XLSX.writeFile(workbook, `MB_MeasurementBook_${safeTitle}_${zone.name_en}_${fiscalYear}.xlsx`);
}

/**
 * Export Cost Estimate (BOQ) Abstract with official header to Excel (.xlsx)
 */
export function exportEstimateToExcel(
  project: ProjectEstimate,
  zone: ZoneInfo,
  fiscalYear: string,
  rateMode: 'user' | 'contractor' = 'user'
) {
  const projectTitle = project.title || 'Construction work';
  const fy = project.fiscal_year || fiscalYear || '2025/26';
  const location = project.local_authority || 'Sample City -15';
  const budgetHead = project.budget_head_no || '';
  const duration = project.estimated_duration || '';

  const getItemUnitRate = (item: any): number => {
    if (rateMode === 'user') {
      return item.user_rate !== undefined ? item.user_rate : (item.calculated_unit_rate || 0);
    }
    return item.contractor_rate !== undefined ? item.contractor_rate : (item.calculated_unit_rate || 0);
  };

  const getItemAmount = (item: any): number => {
    return (Number(item.estimated_quantity) || 0) * getItemUnitRate(item);
  };

  const subtotalItems = project.items.reduce((acc, item) => acc + getItemAmount(item), 0);
  const provItems = project.provisional_items || [];
  const provSumTotal = provItems.length > 0
    ? provItems.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.rate || 0)), 0)
    : (project.provisional_sum !== undefined ? Number(project.provisional_sum) : 0);

  const taxPercent = rateMode === 'user' ? 0 : (project.tax_percent ?? 0);
  const taxAmount = subtotalItems * (taxPercent / 100);
  const subtotalWithTax = subtotalItems + taxAmount;
  const subtotalWithTaxAndPS = subtotalWithTax + provSumTotal;

  const userCfg = project.user_estimate_config || {};
  const autoContingency = userCfg.auto_contingency_enabled !== false;
  const allocatedBudget = Number(project.allocated_budget_amount) || 0;
  const baseForSlab = allocatedBudget > 0 ? allocatedBudget : subtotalWithTaxAndPS;

  let contPercent = 3.0;
  if (autoContingency) {
    if (baseForSlab <= 300000) contPercent = 2.0;
    else if (baseForSlab <= 2000000) contPercent = 1.5;
    else contPercent = 1.0;
  } else {
    contPercent = userCfg.manual_contingency_percent ?? (project.contingency_percent !== undefined ? Number(project.contingency_percent) : 3.0);
  }

  const calcBasis = userCfg.contingency_calc_basis || 'net_budget';
  let baseAmountForContingency = subtotalWithTaxAndPS;
  if (calcBasis === 'allocated_budget' || calcBasis === 'net_budget') {
    baseAmountForContingency = allocatedBudget > 0 ? allocatedBudget : subtotalWithTaxAndPS;
  } else if (calcBasis === 'grand_total') {
    baseAmountForContingency = subtotalWithTaxAndPS;
  }

  const contingencyAmount = Math.round(baseAmountForContingency * (contPercent / 100) * 100) / 100;
  const grandTotal = subtotalWithTaxAndPS + contingencyAmount;

  const data: (string | number)[][] = [
    ['Sample City Authority'],
    ['Local Authority Office'],
    ['Sample City, Sample Province'],
    [''],
    ['Cost Estimate Abstract'],
    [''],
    [`Program / Project Name: ${projectTitle}`, '', '', '', `Fiscal Year: ${fy}`],
    [`Implementation Location: ${location}`, '', '', '', `Budget sub-head no: ${budgetHead}`],
    [`Estimated completion period: ${duration}`, '', '', '', ''],
    [''],
    [
      'S.No.',
      'Description of work/service (item)',
      'Unit',
      'Quantity',
      `Rate (${currencyCode()})`,
      `Total cost (${currencyCode()})`
    ]
  ];

  project.items.forEach((item, idx) => {
    const rate = getItemUnitRate(item);
    const amount = getItemAmount(item);
    data.push([
      idx + 1,
      `[Item ${item.item_code}] ${item.description}`,
      item.unit,
      Number(item.estimated_quantity || 0),
      Number(rate.toFixed(2)),
      Number(amount.toFixed(2))
    ]);
  });

  // Summary Rows
  data.push(['']);
  data.push(['', 'Subtotal Cost of Items', '', '', '', Number(subtotalItems.toFixed(2))]);
  data.push(['', `Tax ${taxPercent}%)`, '', '', '', Number(taxAmount.toFixed(2))]);
  data.push(['', 'Provisional Sum P.S. - Tax Exempt', '', '', '', Number(provSumTotal.toFixed(2))]);
  data.push(['', `Contingency ${contPercent}%)`, '', '', '', Number(contingencyAmount.toFixed(2))]);
  data.push(['', 'Grand Total Estimate Incl. P.S.', '', '', '', Number(grandTotal.toFixed(2))]);

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 8 },  // S.N.
    { wch: 55 }, // Description
    { wch: 10 }, // Unit
    { wch: 15 }, // Qty
    { wch: 15 }, // Rate
    { wch: 20 }  // Amount
  ];

  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 5 } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: 3 } },
    { s: { r: 6, c: 4 }, e: { r: 6, c: 5 } },
    { s: { r: 7, c: 0 }, e: { r: 7, c: 3 } },
    { s: { r: 7, c: 4 }, e: { r: 7, c: 5 } }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Estimate Abstract');

  const safeTitle = (project.title || 'Cost_Estimate').replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_');
  XLSX.writeFile(workbook, `Estimate_Abstract_${safeTitle}_${zone.name_en}_${fiscalYear}.xlsx`);
}

/**
 * Export Resource Quantity Breakdown to Excel (.xlsx)
 */
export function exportResourceBreakdownToExcel(
  aggregatedResources: AggregatedResource[],
  project: ProjectEstimate,
  zone: ZoneInfo,
  fiscalYear: string
) {
  const projectTitle = project.title || 'Construction work';
  const fy = project.fiscal_year || fiscalYear || '2025/26';

  const data: (string | number)[][] = [
    ['Sample City Authority'],
    ['Local Authority Office'],
    ['Sample City, Sample Province'],
    [''],
    ['Resource Quantity Breakdown'],
    [''],
    [`Program / Project Name: ${projectTitle}`, '', '', '', `Fiscal Year: ${fy}`],
    [''],
    [
      'S.No.',
      'Source / material description',
      'Category',
      'Unit',
      'Total required quantity',
      ' BOQ'
    ]
  ];

  aggregatedResources.forEach((res, idx) => {
    const rawItems = Array.from(res.used_in_items || []);
    const usedInStr = rawItems.map(item => typeof item === 'string' ? item : (item?.item_code || '')).filter(Boolean).join(', ');
    data.push([
      idx + 1,
      res.name,
      res.category,
      res.unit,
      Number(res.total_quantity.toFixed(4)),
      usedInStr
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 8 },  // S.N.
    { wch: 40 }, // Resource Name
    { wch: 15 }, // Category
    { wch: 10 }, // Unit
    { wch: 20 }, // Quantity
    { wch: 35 }  // BOQ Items
  ];

  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 5 } }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Resource Breakdown');

  const safeTitle = (project.title || 'Resource_Breakdown').replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_');
  XLSX.writeFile(workbook, `Resource_Breakdown_${safeTitle}_${zone.name_en}_${fiscalYear}.xlsx`);
}

/**
 * Export Rate Analysis (Summary or Detailed) to Excel (.xlsx) ready to print
 */
export function exportRateAnalysisToExcel(
  items: Array<{
    norm: any;
    result: {
      total_unit_rate: number;
      material_subtotal?: number;
      labor_subtotal?: number;
      equipment_subtotal?: number;
      contractor_overhead_amount?: number;
      breakdown?: Array<{
        resource_name: string;
        category: string;
        unit: string;
        quantity: number;
        unit_rate: number;
        subtotal: number;
      }>;
    };
  }>,
  project: ProjectEstimate,
  zone: ZoneInfo,
  fiscalYear: string,
  mode: 'summary' | 'detailed',
  headerConfig?: {
    authority_name?: string;
    office_name?: string;
    office_address?: string;
    document_title?: string;
    include_project_name?: boolean;
  }
) {
  const muni = headerConfig?.authority_name || project.header_config?.authority_name || 'Sample City Authority';
  const office = headerConfig?.office_name || project.header_config?.office_name || 'Local Authority Office';
  const address = headerConfig?.office_address || project.header_config?.office_address || 'Sample City, Sample Province';
  const docTitle = headerConfig?.document_title || project.header_config?.document_title_rate_analysis || 'Rate Analysis Sheet';
  const incProject = headerConfig?.include_project_name ?? true;

  const data: (string | number)[][] = [
    [muni],
    [office],
    [address],
    [''],
    [docTitle],
    ['']
  ];

  if (incProject) {
    data.push([`Program / Project Name: ${project.title || 'Construction work'}`, '', '', '', `Fiscal Year: ${project.fiscal_year || fiscalYear || '2025/26'}`]);
    data.push([`Implementation Location: ${project.local_authority || zone.name_en}`, '', '', '', `Budget sub-head no: ${project.budget_head_no || ''}`]);
    data.push(['']);
  }

  if (mode === 'summary') {
    data.push(['S.No.', 'Item code', 'Work Item', 'Unit', 'Base quantity', `Rate per unit (${currencyCode()})`]);
    items.forEach((entry, idx) => {
      data.push([
        idx + 1,
        entry.norm.code,
        entry.norm.description,
        entry.norm.base_unit,
        entry.norm.base_quantity || 1,
        Number(entry.result.total_unit_rate.toFixed(2))
      ]);
    });
  } else {
    items.forEach((entry, idx) => {
      data.push([`Item ${idx + 1}: ${entry.norm.code} - ${entry.norm.description} (Unit: ${entry.norm.base_unit})`]);
      data.push(['S.No.', 'Source / material description', 'Category', 'Unit', 'Quantity', `Rate (${currencyCode()})`, `Total (${currencyCode()})`]);
      (entry.result.breakdown || []).forEach((r, rIdx) => {
        data.push([
          rIdx + 1,
          r.resource_name,
          r.category,
          r.unit,
          Number(r.quantity.toFixed(4)),
          Number(r.unit_rate.toFixed(2)),
          Number(r.subtotal.toFixed(2))
        ]);
      });
      data.push(['', '', '', '', '', `Total rate (per 1 ${entry.norm.base_unit}):`, Number(entry.result.total_unit_rate.toFixed(2))]);
      data.push(['']);
    });
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 8 },  // S.N.
    { wch: 45 }, // Description / Resource
    { wch: 15 }, // Category / Unit
    { wch: 12 }, // Unit / Base Qty
    { wch: 15 }, // Qty / Rate
    { wch: 18 }, // Rate / Amount
    { wch: 20 }  // Total Amount
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rate Analysis');

  const safeTitle = (project.title || 'Rate_Analysis').replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_');
  XLSX.writeFile(workbook, `Rate_Analysis_${safeTitle}_${zone.name_en}_${fiscalYear}.xlsx`);
}

/**
 * Export Valuation Measurement Book (MB) to Excel (.xlsx)
 */
export function exportValuationMBToExcel(
  project: ProjectEstimate,
  activeBook: any,
  valuationRows: any[],
  zone: any,
  fiscalYear: string,
  targetSubBookId: string = 'all'
) {
  const subBooks = activeBook?.sub_books && activeBook.sub_books.length > 0
    ? activeBook.sub_books
    : [{ id: 'vmb_sub_1', code: 'VMB-01', title: 'Main Sub Valuation MB' }];
  const defaultSubBookId = subBooks[0]?.id || 'vmb_sub_1';

  const authorityHeader = project.local_authority || 'Sample City Authority, Local Authority Office, Sample City, Sample Province';
  const projectTitle = project.title || 'Construction work';
  const fy = project.fiscal_year || fiscalYear || '2025/26';
  const mbNo = activeBook?.mb_number || 'VMB-01';
  const billType = activeBook?.bill_type === 'FINAL_VALUATION' ? 'Final Valuation MB' : 'Running Bill Valuation MB';

  const allCustomCols: string[] = [];
  project.items.forEach((item) => {
    (item.custom_column_names || []).forEach((col) => {
      if (col && !allCustomCols.includes(col)) allCustomCols.push(col);
    });
  });

  const emptyCustomCols = allCustomCols.map(() => '');

  const data: (string | number)[][] = [
    ['Sample City Authority'],
    ['Local Authority Office, Sample City, Sample Province'],
    [''],
    [`Valuation Measurement Book - ${mbNo})`],
    [''],
    [`Project name: ${projectTitle}`, '', '', '', `Bill type: ${billType}`, ...emptyCustomCols, `IPC No: #${activeBook?.ipc_number || 1}`],
    [`Date: ${activeBook?.date_iso || '2026-06-15'}`, '', '', '', `Measurement register no: ${activeBook?.book_ref_no || '-'}`, ...emptyCustomCols, `Certified by: ${activeBook?.verified_by || '-'}`],
    [''],
    [
      'S.No.',
      'Measurement details / items and dimensions',
      'Unit',
      'Quantity (No.)',
      'Length (L)',
      'Width (B)',
      'Height (H)',
      ...allCustomCols,
      'Executed Qty',
      'Remarks / location'
    ]
  ];

  let snCounter = 1;

  project.items.forEach((item) => {
    const prec = item.precision ?? 2;
    const allValRows = valuationRows.filter((r) => r.mb_id === activeBook?.id && r.boq_item_id === item.id);
    const itemValRows = targetSubBookId === 'all'
      ? allValRows
      : allValRows.filter((r) => (r.mb_book_id || defaultSubBookId) === targetSubBookId);
    const itemTotalQty = itemValRows.reduce((sum, r) => sum + (r.quantity_this_bill || 0), 0);

    data.push([
      snCounter++,
      `[Item ${item.item_code}] ${item.description}`,
      item.unit,
      '',
      '',
      '',
      '',
      ...emptyCustomCols,
      Number(itemTotalQty.toFixed(prec)),
      item.chapter || 'Estimate Item'
    ]);

    itemValRows.forEach((r) => {
      const customVals = allCustomCols.map((colName) => r.custom_fields?.[colName] ?? '-');
      data.push([
        '',
        `   ↳ ${r.particulars || 'Sub-measurement'}`,
        item.unit,
        r.no_of_units,
        r.length,
        r.breadth,
        r.height,
        ...customVals,
        Number((r.quantity_this_bill || 0).toFixed(prec)),
        r.remarks || ''
      ]);
    });

    data.push(['']);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 45 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    ...allCustomCols.map(() => ({ wch: 14 })),
    { wch: 20 },
    { wch: 25 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Valuation_MB_${mbNo}`);
  XLSX.writeFile(workbook, `Valuation_MB_${mbNo}_${zone?.name_en || 'Export'}.xlsx`);
}
