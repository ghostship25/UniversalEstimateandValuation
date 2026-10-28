import * as XLSX from 'xlsx';
import { ProjectEstimate, ZoneInfo, MBRow, ValuationMBRow } from '../types';
import { resolveFieldValue, validateAndCleanFormulaReferences } from './mbFormulaEvaluator';
import { recalculateItemTotal, recalculateAllProjectItems } from './mbDependencyEngine';

export function isElectronAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);
}

/**
 * Generate binary ArrayBuffer of the MB Excel spreadsheet
 */
export function generateMBExcelArrayBuffer(
  project: ProjectEstimate,
  zone: ZoneInfo,
  fiscalYear: string,
  valuationRows?: ValuationMBRow[],
  activeBookId?: string
): { buffer: ArrayBuffer; fileName: string } {
  const projectTitle = project.title || 'Construction work';
  const fy = project.fiscal_year || fiscalYear || '2025/26';
  const location = project.local_authority || 'Sample City -15';
  const budgetHead = project.budget_head_no || '';
  const duration = project.estimated_duration || '';

  const allCustomCols: string[] = [];
  project.items.forEach((item) => {
    (item.custom_column_names || []).forEach((col) => {
      if (col && !allCustomCols.includes(col)) {
        allCustomCols.push(col);
      }
    });
  });

  const emptyCustomCols = allCustomCols.map(() => '');

  const data: (string | number)[][] = [
    ['Sample City Authority'],
    ['Local Authority Office'],
    ['Sample City, Sample Province'],
    [''],
    [activeBookId ? 'Valuation Measurement Book Details' : 'Measurement Book Details'],
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
      Number(item.estimated_quantity || 0),
      item.chapter || 'BLD Norms'
    ]);

    // Detail rows: Use valuationRows if provided for activeBookId, else fallback to item.mb_rows
    let rowsToExport: MBRow[] = [];
    if (valuationRows && activeBookId) {
      const vRows = valuationRows.filter((r) => r.mb_id === activeBookId && r.boq_item_id === item.id);
      if (vRows.length > 0) {
        rowsToExport = vRows.map((r) => ({
          id: r.id,
          particulars: r.particulars || '',
          no_of_units: r.no_of_units ?? 1,
          length: r.length ?? 0,
          breadth: r.breadth ?? 0,
          height: r.height ?? 0,
          quantity: r.quantity_this_bill || 0,
          custom_fields: r.custom_fields || {},
          formula: r.formula,
          remarks: r.remarks
        }));
      }
    }
    if (rowsToExport.length === 0 && item.mb_rows && item.mb_rows.length > 0) {
      rowsToExport = item.mb_rows;
    }

    if (rowsToExport.length > 0) {
      rowsToExport.forEach((row, subIdx) => {
        if (row.is_heading) {
          data.push(['', `   📌 ${row.particulars}`, '', '', '', '', '', ...emptyCustomCols, '', '']);
        } else {
          const noVal = resolveFieldValue(row.no_of_units, rowsToExport, subIdx, project.items);
          const lVal = resolveFieldValue(row.length, rowsToExport, subIdx, project.items);
          const bVal = resolveFieldValue(row.breadth, rowsToExport, subIdx, project.items);
          const hVal = resolveFieldValue(row.height, rowsToExport, subIdx, project.items);
          const customVals = allCustomCols.map((colName) =>
            resolveFieldValue(row.custom_fields?.[colName], rowsToExport, subIdx, project.items)
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
        rowsToExport.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0),
        ''
      ]);
    }
    data.push(['']);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const totalColsCount = 8 + allCustomCols.length;

  worksheet['!cols'] = [
    { wch: 8 },  // S.N.
    { wch: 45 }, // Description
    { wch: 10 }, // Unit
    { wch: 12 }, // No
    { wch: 12 }, // L
    { wch: 12 }, // B
    { wch: 12 }, // H
    ...allCustomCols.map(() => ({ wch: 14 })),
    { wch: 16 }, // Quantity
    { wch: 25 }  // Remarks
  ];

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
  const fileName = `MB_LiveSync_${safeTitle}_${zone.name_en || 'Sample City'}_${fiscalYear || '2026_27'}.xlsx`;

  const wbBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return { buffer: wbBuffer, fileName };
}

/**
 * Parse an updated Excel spreadsheet buffer back into Project MB items, headings, sub-rows, and custom fields
 */
export function parseExcelBufferToMBUpdates(
  fileBuffer: ArrayBuffer,
  currentProject: ProjectEstimate,
  currentValuationRows?: ValuationMBRow[],
  activeValBookId?: string
): { updatedProject: ProjectEstimate; updatedValuationRows?: ValuationMBRow[]; updatedCount: number; validationReport?: any } {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  if (!worksheet) {
    return { updatedProject: currentProject, updatedValuationRows: currentValuationRows, updatedCount: 0 };
  }

  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  let updatedCount = 0;

  // Clone current items so we can update them safely
  const itemsList: any[] = currentProject.items.map((it) => ({
    ...it,
    mb_rows: [...(it.mb_rows || []).map((r) => ({ ...r, custom_fields: { ...(r.custom_fields || {}) } }))],
    custom_column_names: [...(it.custom_column_names || [])]
  }));

  const itemMap = new Map<string, any>();
  itemsList.forEach((it) => {
    itemMap.set(it.id, it);
    if (it.item_code) {
      itemMap.set(String(it.item_code).trim(), it);
    }
  });

  // Detect header row to find column mapping & dynamic custom columns
  let headerRowIndex = -1;
  let descCol = 1;
  let unitCol = 2;
  let noCol = 3;
  let lengthCol = 4;
  let breadthCol = 5;
  let heightCol = 6;
  let qtyCol = 7;
  let remarksCol = 8;
  const customColsMapping: { colIdx: number; name: string }[] = [];

  for (let r = 0; r < Math.min(rawData.length, 25); r++) {
    const row = rawData[r];
    if (!row) continue;
    const rowStr = row.map((cell) => String(cell || '')).join(' ');
    if (rowStr.includes('Description')) {
      headerRowIndex = r;
      row.forEach((cell, cIdx) => {
        const str = String(cell || '').trim();
        if (str.includes('Description')) descCol = cIdx;
        else if (str.toLowerCase().includes('unit')) unitCol = cIdx;
        else if (str.includes('No.')) noCol = cIdx;
        else if (str.includes('(L)')) lengthCol = cIdx;
        else if (str.includes('(B)')) breadthCol = cIdx;
        else if (str.includes('(H)')) heightCol = cIdx;
        else if (str.toLowerCase().includes('quantity')) qtyCol = cIdx;
        else if (str.toLowerCase().includes('remarks')) remarksCol = cIdx;
      });

      // Detect any custom columns placed between heightCol and qtyCol
      for (let c = heightCol + 1; c < qtyCol; c++) {
        const colHeader = String(row[c] || '').trim();
        if (colHeader) {
          customColsMapping.push({ colIdx: c, name: colHeader });
        }
      }
      break;
    }
  }

  let currentItemObj: any = null;
  let currentSubRows: MBRow[] = [];

  const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

  for (let i = startRow; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;

    const col0Str = String(row[0] || '').trim();
    const col1Str = String(row[descCol] || row[1] || '').trim();

    // Skip total summary rows
    if (col1Str.startsWith('[Total') || col1Str.startsWith('[Total') || col1Str.includes('Total ')) {
      continue;
    }

    // Check if this row is a Main Item row (has S.N. in Col 0 or Item code format)
    if (col0Str && !isNaN(Number(col0Str)) && col1Str) {
      // Save sub rows of previous item before switching
      if (currentItemObj) {
        currentItemObj.mb_rows = currentSubRows;
      }

      // Match item by code e.g. [ 1.1] or item_code
 const codeMatch = col1Str.match(/\[ ([^\]]+)\]/) || col1Str.match(/\[Item ([^\]]+)\]/);
      let matchedItem: any = null;
      if (codeMatch && codeMatch[1]) {
        const extractedCode = codeMatch[1].trim();
        matchedItem = itemMap.get(extractedCode);
      }

      if (!matchedItem) {
        // Try fuzzy matching by description substring
        for (const it of itemsList) {
 const cleanDescInExcel = col1Str.replace(/\[ [^\]]+\]/, '').replace(/\[Item [^\]]+\]/, '').trim();
          if (cleanDescInExcel && (it.description.includes(cleanDescInExcel) || cleanDescInExcel.includes(it.description))) {
            matchedItem = itemMap.get(it.id);
            break;
          }
        }
      }

      if (matchedItem) {
        currentItemObj = matchedItem;
        currentSubRows = [...(currentItemObj.mb_rows || [])];

        // Update item description & unit if edited in Excel
 const cleanDesc = col1Str.replace(/\[ [^\]]+\]/, '').replace(/\[Item [^\]]+\]/, '').trim();
        if (cleanDesc && cleanDesc !== currentItemObj.description) {
          currentItemObj.description = cleanDesc;
          updatedCount++;
        }
        const unitVal = String(row[unitCol] || '').trim();
        if (unitVal && unitVal !== currentItemObj.unit) {
          currentItemObj.unit = unitVal;
          updatedCount++;
        }
      } else {
        // Create new item if inserted in Excel
        const newItemId = `item_excel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
 const cleanDesc = col1Str.replace(/\[ [^\]]+\]/, '').replace(/\[Item [^\]]+\]/, '').trim();
        const newItem: any = {
          id: newItemId,
          item_code: `EX-${col0Str}`,
          description: cleanDesc || `Excel Item ${col0Str}`,
          unit: String(row[unitCol] || 'S.Q.M.').trim() || 'S.Q.M.',
          mb_rows: [],
          custom_column_names: customColsMapping.map((c) => c.name)
        };
        itemsList.push(newItem);
        itemMap.set(newItemId, newItem);
        currentItemObj = newItem;
        currentSubRows = [];
        updatedCount++;
      }

      // Sync custom column names on current item if new custom columns were added
      customColsMapping.forEach(({ name }) => {
        if (!currentItemObj.custom_column_names) {
          currentItemObj.custom_column_names = [];
        }
        if (!currentItemObj.custom_column_names.includes(name)) {
          currentItemObj.custom_column_names.push(name);
        }
      });

      continue;
    }

    // Process Sub-measurement detail row or Heading row under currentItemObj
    if (currentItemObj && col1Str) {
      const isHeadingRow = col1Str.startsWith('📌') || (
        (row[noCol] === undefined || row[noCol] === '-' || row[noCol] === '') &&
        (row[lengthCol] === undefined || row[lengthCol] === '-' || row[lengthCol] === '') &&
        (row[breadthCol] === undefined || row[breadthCol] === '-' || row[breadthCol] === '') &&
        (row[heightCol] === undefined || row[heightCol] === '-' || row[heightCol] === '') &&
        !col1Str.startsWith('•')
      );

      const cleanText = col1Str.replace(/^📌\s*/, '').replace(/^•\s*/, '').trim();

      if (isHeadingRow) {
        // Look for existing heading row by particulars or next available heading slot
        const existingHeading = currentSubRows.find(
          (r) => r.is_heading && (r.particulars.trim() === cleanText || cleanText.includes(r.particulars.trim()))
        );

        if (existingHeading) {
          if (existingHeading.particulars !== cleanText) {
            existingHeading.particulars = cleanText;
            updatedCount++;
          }
        } else {
          // Insert new heading row
          const newHeadingRow: MBRow = {
            id: `heading_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            particulars: cleanText || 'Heading Section',
            is_heading: true,
            no_of_units: '',
            length: '',
            breadth: '',
            height: '',
            quantity: 0
          };
          currentSubRows.push(newHeadingRow);
          updatedCount++;
        }
      } else {
        // Regular Sub-measurement row
        const noVal = parseRowValue(row[noCol]);
        const lVal = parseRowValue(row[lengthCol]);
        const bVal = parseRowValue(row[breadthCol]);
        const hVal = parseRowValue(row[heightCol]);
        const remarksVal = String(row[remarksCol] || row[qtyCol + 1] || '').trim();

        // Custom fields map
        const customFields: Record<string, string> = {};
        customColsMapping.forEach(({ colIdx, name }) => {
          const val = parseRowValue(row[colIdx]);
          if (val !== undefined) {
            customFields[name] = String(val);
          }
        });

        // Find existing non-heading sub-row by particulars or unassigned slot
        let matchedSubRow = currentSubRows.find(
          (r) => !r.is_heading && r.particulars.trim() === cleanText
        );

        if (!matchedSubRow) {
          matchedSubRow = currentSubRows.find(
            (r) => !r.is_heading && (r as any)._synced !== true
          );
        }

        if (matchedSubRow) {
          (matchedSubRow as any)._synced = true;
          matchedSubRow.particulars = cleanText || matchedSubRow.particulars || 'Sub-measurement';
          if (noVal !== undefined) matchedSubRow.no_of_units = noVal;
          if (lVal !== undefined) matchedSubRow.length = lVal;
          if (bVal !== undefined) matchedSubRow.breadth = bVal;
          if (hVal !== undefined) matchedSubRow.height = hVal;
          if (remarksVal) matchedSubRow.remarks = remarksVal;
          if (Object.keys(customFields).length > 0) {
            matchedSubRow.custom_fields = { ...(matchedSubRow.custom_fields || {}), ...customFields };
          }
          updatedCount++;
        } else {
          // Create new sub-row inserted from Excel
          const newSubRow: MBRow = {
            id: `mb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            particulars: cleanText || 'Sub-measurement',
            no_of_units: noVal !== undefined ? noVal : 1,
            length: lVal !== undefined ? lVal : '',
            breadth: bVal !== undefined ? bVal : '',
            height: hVal !== undefined ? hVal : '',
            custom_fields: customFields,
            remarks: remarksVal,
            quantity: 0
          };
          (newSubRow as any)._synced = true;
          currentSubRows.push(newSubRow);
          updatedCount++;
        }
      }
    }
  }

  // Save last item sub rows
  if (currentItemObj) {
    currentItemObj.mb_rows = currentSubRows.map((r) => {
      const { _synced, ...cleanR } = r as any;
      return cleanR;
    });
  }

  // Recalculate item totals and update project state
  const updatedItemsList = itemsList.map((it) => {
    return recalculateItemTotal(it, itemsList);
  });

  const finalItemsResult = recalculateAllProjectItems(updatedItemsList);
  const rawUpdatedProject = { ...currentProject, items: finalItemsResult.items };

  // Data validation helper scans for broken formula references after Excel sync to prevent crashes
  const { sanitizedProject, report } = validateAndCleanFormulaReferences(rawUpdatedProject);

  let updatedValuationRows: ValuationMBRow[] | undefined = undefined;
  if (currentValuationRows && activeValBookId) {
    updatedValuationRows = [...currentValuationRows];
    sanitizedProject.items.forEach((it) => {
      if (it.mb_rows) {
        // Remove existing valuation rows for this book & item, replace with synced rows
        updatedValuationRows = updatedValuationRows!.filter((r) => !(r.mb_id === activeValBookId && r.boq_item_id === it.id));
        const newVRows: ValuationMBRow[] = it.mb_rows.map((r) => ({
          id: r.id,
          mb_id: activeValBookId,
          boq_item_id: it.id,
          particulars: r.particulars || '',
          no_of_units: r.no_of_units ?? 1,
          length: r.length ?? 0,
          breadth: r.breadth ?? 0,
          height: r.height ?? 0,
          quantity_this_bill: typeof r.quantity === 'number' ? r.quantity : 0,
          custom_fields: r.custom_fields ? { ...r.custom_fields } : {},
          formula: r.formula,
          remarks: r.remarks
        }));
        updatedValuationRows.push(...newVRows);
      }
    });
  }

  return {
    updatedProject: sanitizedProject,
    updatedValuationRows,
    updatedCount,
    validationReport: report
  };
}

function parseRowValue(val: any): number | string | undefined {
  if (val === undefined || val === null || val === '-' || val === '') return undefined;
  if (typeof val === 'string' && val.trim().startsWith('=')) {
    return val.trim();
  }
  const num = Number(val);
  if (!isNaN(num)) return num;
  return String(val).trim();
}
