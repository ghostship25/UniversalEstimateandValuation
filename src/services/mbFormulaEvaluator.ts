import { BOQItem, MBRow } from '../types';

/**
 * Evaluates custom spreadsheet formulas in Measurement Book cells with cross-item and custom column support.
 * Examples supported:
 *  - =ITEM("1.1").QTY
 *  - =ITEM("1.1").R1.L
 *  - =ITEM("1.1").R1.Thickness
 *  - =I1.R1.C1
 *  - =R1.Thickness * 2
 *  - =SUM(R1:R3)
 */
export function evaluateMBFormula(
  formulaStr: string,
  rows: MBRow[],
  currentRowIndex: number,
  allItems: BOQItem[] = [],
  depth: number = 0
): number {
  if (depth > 10) return 0;
  let expr = String(formulaStr || '').trim();
  if (expr.startsWith('=')) expr = expr.substring(1).trim();
  if (!expr) return 0;

  const resolveVal = (val: any, targetRows: MBRow[], rIndex: number, propName?: string): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('=')) {
        if (rIndex === currentRowIndex && propName && trimmed.toLowerCase().includes(propName)) {
          return 0;
        }
        return evaluateMBFormula(trimmed, targetRows, rIndex, allItems, depth + 1);
      }
      const num = parseFloat(trimmed);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  const getRowPropVal = (targetRow: MBRow, propName: string, targetRows: MBRow[], rIdx: number): number => {
    if (!targetRow) return 0;
    const prop = propName ? propName.toLowerCase().trim() : 'qty';
    let rawVal: any;
    if (prop === 'l' || prop === 'length') rawVal = targetRow.length;
    else if (prop === 'b' || prop === 'breadth') rawVal = targetRow.breadth;
    else if (prop === 'h' || prop === 'height') rawVal = targetRow.height;
    else if (prop === 'n' || prop === 'no' || prop === 'units') rawVal = targetRow.no_of_units;
    else if (prop === 'q' || prop === 'qty' || prop === 'quantity' || prop === 'quantity_this_bill') {
      rawVal = (targetRow as any).quantity_this_bill ?? targetRow.quantity;
    } else if (/^c[0-9]+$/i.test(prop)) {
      const colIdx = parseInt(prop.substring(1), 10) - 1;
      const customKeys = Object.keys(targetRow.custom_fields || {});
      if (customKeys[colIdx]) {
        rawVal = targetRow.custom_fields?.[customKeys[colIdx]];
      }
    } else {
      const customFields = targetRow.custom_fields || {};
      const matchKey = Object.keys(customFields).find((k) => k.toLowerCase() === prop);
      if (matchKey !== undefined) {
        rawVal = customFields[matchKey];
      }
    }
    return resolveVal(rawVal, targetRows, rIdx, prop);
  };

  // 0. Replace cross-item references like ITEM("1.1").QTY, ITEM(1).R1.L, ITEM(1).R1.Thickness, I1.R1.C1
  expr = expr.replace(/(?:item|i)\s*\(\s*["']?([0-9.]+|[a-z0-9\-]+)["']?\s*\)(?:\.(r[0-9]+))?(?:\.([a-z0-9_]+))?/gi, (_, itemRef, rowRef, propRef) => {
    const targetItem = allItems.find(it => String(it.item_code).toLowerCase() === String(itemRef).toLowerCase()) ||
                       allItems[parseInt(itemRef, 10) - 1];
    if (!targetItem) return '0';
    
    if (rowRef) {
      const rIdx = parseInt(rowRef.replace(/[^0-9]/g, ''), 10) - 1;
      const targetRow = (targetItem.mb_rows || [])[rIdx];
      if (!targetRow) return '0';
      return String(getRowPropVal(targetRow, propRef || 'qty', targetItem.mb_rows || [], rIdx));
    }

    const prop = propRef ? propRef.toLowerCase() : 'qty';
    if (prop === 'rate') return String(targetItem.user_rate || targetItem.contractor_rate || targetItem.calculated_unit_rate || 0);
    if (prop === 'amount') return String(targetItem.total_amount || 0);
    if (prop === 'qty' || prop === 'quantity') {
      const mbRowsSum = (targetItem.mb_rows || []).reduce(
        (sum, r) => sum + (Number((r as any).quantity_this_bill) ?? Number(r.quantity) ?? 0),
        0
      );
      return String(mbRowsSum || Number(targetItem.estimated_quantity) || 0);
    }

    // If propRef is a custom column, sum across targetItem's rows
    let customSum = 0;
    (targetItem.mb_rows || []).forEach((r, idx) => {
      customSum += getRowPropVal(r, propRef, targetItem.mb_rows || [], idx);
    });
    return String(customSum || Number(targetItem.estimated_quantity) || 0);
  });

  // 0a. Replace shorthand #1, #1.1, #1.QTY, #1.1.QTY, #1.1.R1.L, #1.R1.C1
  expr = expr.replace(/#([0-9.]+|[a-z0-9\-]+)(?:\.(r[0-9]+))?(?:\.([a-z0-9_]+))?/gi, (_, itemRef, rowRef, propRef) => {
    const targetItem = allItems.find(it => String(it.item_code).toLowerCase() === String(itemRef).toLowerCase()) ||
                       allItems[parseInt(itemRef, 10) - 1];
    if (!targetItem) return '0';
    
    if (rowRef) {
      const rIdx = parseInt(rowRef.replace(/[^0-9]/g, ''), 10) - 1;
      const targetRow = (targetItem.mb_rows || [])[rIdx];
      if (!targetRow) return '0';
      return String(getRowPropVal(targetRow, propRef || 'qty', targetItem.mb_rows || [], rIdx));
    }

    const prop = propRef ? propRef.toLowerCase() : 'qty';
    if (prop === 'rate') return String(targetItem.user_rate || targetItem.contractor_rate || targetItem.calculated_unit_rate || 0);
    if (prop === 'amount') return String(targetItem.total_amount || 0);
    if (prop === 'qty' || prop === 'quantity') {
      const mbRowsSum = (targetItem.mb_rows || []).reduce(
        (sum, r) => sum + (Number((r as any).quantity_this_bill) ?? Number(r.quantity) ?? 0),
        0
      );
      return String(mbRowsSum || Number(targetItem.estimated_quantity) || 0);
    }

    let customSum = 0;
    (targetItem.mb_rows || []).forEach((r, idx) => {
      customSum += getRowPropVal(r, propRef, targetItem.mb_rows || [], idx);
    });
    return String(customSum || Number(targetItem.estimated_quantity) || 0);
  });

  // 0b. Replace shorthand I1, I1.QTY, I1.R1.L, I1.R1.Thickness, I1.R1.C1
  expr = expr.replace(/\bi([0-9]+)(?:\.(r[0-9]+))?(?:\.([a-z0-9_]+))?\b/gi, (_, itemIdxStr, rowRef, propRef) => {
    const targetItem = allItems[parseInt(itemIdxStr, 10) - 1];
    if (!targetItem) return '0';
    if (rowRef) {
      const rIdx = parseInt(rowRef.replace(/[^0-9]/g, ''), 10) - 1;
      const targetRow = (targetItem.mb_rows || [])[rIdx];
      if (!targetRow) return '0';
      return String(getRowPropVal(targetRow, propRef || 'qty', targetItem.mb_rows || [], rIdx));
    }
    const prop = propRef ? propRef.toLowerCase() : 'qty';
    if (prop === 'rate') return String(targetItem.user_rate || targetItem.contractor_rate || targetItem.calculated_unit_rate || 0);
    if (prop === 'amount') return String(targetItem.total_amount || 0);
    if (prop === 'qty' || prop === 'quantity') {
      const mbRowsSum = (targetItem.mb_rows || []).reduce(
        (sum, r) => sum + (Number((r as any).quantity_this_bill) ?? Number(r.quantity) ?? 0),
        0
      );
      return String(mbRowsSum || Number(targetItem.estimated_quantity) || 0);
    }

    let customSum = 0;
    (targetItem.mb_rows || []).forEach((r, idx) => {
      customSum += getRowPropVal(r, propRef, targetItem.mb_rows || [], idx);
    });
    return String(customSum || Number(targetItem.estimated_quantity) || 0);
  });

  // 0c. Excel-style column ranges: SUM(L1:L3) -> SUM(R1:R3.L)
  expr = expr.replace(/sum\s*\(\s*([lbhnq])([0-9]+)\s*:\s*\1([0-9]+)\s*\)/gi, (_, c, a, b) => `SUM(R${a}:R${b}.${c})`);

  // 1. Expand range functions like SUM(R1:R4) or SUM(R1:R4.Thickness)
  expr = expr.replace(/sum\s*\(\s*r([0-9]+)\s*:\s*r([0-9]+)(?:\.([a-z0-9_]+))?\s*\)/gi, (_, startStr, endStr, propStr) => {
    const start = parseInt(startStr, 10) - 1;
    const end = parseInt(endStr, 10) - 1;
    let sum = 0;
    for (let i = Math.max(0, start); i <= Math.min(rows.length - 1, end); i++) {
      if (rows[i]) {
        sum += getRowPropVal(rows[i], propStr || 'qty', rows, i);
      }
    }
    return String(sum);
  });

  // 2. Replace shorthand row references like L1, B1, H1, N1, Q1, R1.L, R1.B, R1.H, R1.N, R1.Thickness, R1.C1 or R1 (defaults to qty)
  expr = expr.replace(/\b([lbhnq])([0-9]+)\b/gi, (_, letter, rowNumStr) => {
    const rIdx = parseInt(rowNumStr, 10) - 1;
    const targetRow = rows[rIdx];
    if (!targetRow) return '0';
    const propMap: Record<string, string> = { l: 'length', b: 'breadth', h: 'height', n: 'no_of_units', q: 'qty' };
    return String(getRowPropVal(targetRow, propMap[letter.toLowerCase()] || 'qty', rows, rIdx));
  });

  expr = expr.replace(/r([0-9]+)\.([a-z0-9_]+)/gi, (_, rowNumStr, propStr) => {
    const rIdx = parseInt(rowNumStr, 10) - 1;
    const targetRow = rows[rIdx];
    if (!targetRow) return '0';
    return String(getRowPropVal(targetRow, propStr, rows, rIdx));
  });

  expr = expr.replace(/\br([0-9]+)\b/gi, (_, rowNumStr) => {
    const rIdx = parseInt(rowNumStr, 10) - 1;
    const targetRow = rows[rIdx];
    return targetRow ? String(getRowPropVal(targetRow, 'qty', rows, rIdx)) : '0';
  });

  // 3. Replace local row shorthands L, B, H, N, QTY, or local custom field names
  const cur: Partial<MBRow> = rows[currentRowIndex] || {};
  expr = expr.replace(/\bl\b/gi, String(resolveVal(cur.length, rows, currentRowIndex, 'l')));
  expr = expr.replace(/\bb\b/gi, String(resolveVal(cur.breadth, rows, currentRowIndex, 'b')));
  expr = expr.replace(/\bh\b/gi, String(resolveVal(cur.height, rows, currentRowIndex, 'h')));
  expr = expr.replace(/\bn\b/gi, String(resolveVal(cur.no_of_units, rows, currentRowIndex, 'n')));

  // Support local C1, C2, C3 indexed custom columns for current row
  expr = expr.replace(/\bc([0-9]+)\b/gi, (_, cNum) => {
    const cIdx = parseInt(cNum, 10) - 1;
    const customKeys = Object.keys(cur.custom_fields || {});
    if (customKeys[cIdx]) {
      const val = cur.custom_fields?.[customKeys[cIdx]];
      return String(resolveVal(val, rows, currentRowIndex, `c${cNum}`));
    }
    return '0';
  });

  // Check if expr references any custom fields present in current row
  if (cur.custom_fields) {
    Object.keys(cur.custom_fields).forEach((customKey) => {
      const reg = new RegExp(`\\b${customKey}\\b`, 'gi');
      if (reg.test(expr)) {
        const customVal = getRowPropVal(cur as MBRow, customKey, rows, currentRowIndex);
        expr = expr.replace(reg, String(customVal));
      }
    });
  }

  // 4. Safe arithmetic evaluation
  try {
    const safeExpr = expr.replace(/[^0-9+\-*/().]/g, '');
    if (safeExpr) {
      // eslint-disable-next-line no-eval
      const res = Function(`"use strict"; return (${safeExpr})`)();
      if (typeof res === 'number' && !isNaN(res)) {
        return res;
      }
    }
  } catch (e) {
    // fallback
  }
  return 0;
}

/**
 * Resolves a cell value (number or formula string) to its calculated numeric value for Excel and PDF output.
 */
export function resolveFieldValue(
  val: any,
  rows: MBRow[],
  rIdx: number,
  allItems: BOQItem[] = []
): number | string {
  if (val === undefined || val === null || val === '') return '-';
  if (typeof val === 'number') return isNaN(val) ? '-' : val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('=') || /[+\-*/]/.test(trimmed)) {
      const evaluated = evaluateMBFormula(trimmed, rows, rIdx, allItems);
      return isNaN(evaluated) ? 0 : evaluated;
    }
    const num = parseFloat(trimmed);
    return isNaN(num) ? trimmed : num;
  }
  return '-';
}

export interface FormulaValidationReport {
  brokenCount: number;
  fixedItemsCount: number;
  details: { itemId: string; itemCode: string; rowId: string; field: string; formula: string; reason: string }[];
}

/**
 * Data validation helper that scans for broken formula references within the project JSON data after an Excel sync,
 * preventing the application from crashing if a cell reference is removed in the external file.
 */
export function validateAndCleanFormulaReferences(project: any): { sanitizedProject: any; report: FormulaValidationReport } {
  if (!project || !Array.isArray(project.items)) {
    return {
      sanitizedProject: project,
      report: { brokenCount: 0, fixedItemsCount: 0, details: [] }
    };
  }

  const details: FormulaValidationReport['details'] = [];
  let brokenCount = 0;
  let fixedItemsCount = 0;

  const sanitizedItems = project.items.map((item: BOQItem) => {
    let itemHasFix = false;
    const mbRows = item.mb_rows || [];

    const sanitizedRows = mbRows.map((row, rIdx) => {
      const updatedRow: any = { ...row };

      // Validate formula if explicitly present
      if (updatedRow.formula && typeof updatedRow.formula === 'string') {
        const formulaStr = updatedRow.formula.trim();
        if (formulaStr.startsWith('=')) {
          try {
            const evaluated = evaluateMBFormula(formulaStr, mbRows, rIdx, project.items);
            if (isNaN(evaluated) || !isFinite(evaluated)) {
              brokenCount++;
              itemHasFix = true;
              details.push({
                itemId: item.id,
                itemCode: item.item_code || '',
                rowId: row.id,
                field: 'formula',
                formula: formulaStr,
                reason: 'Evaluates to invalid number or missing cell reference'
              });
              updatedRow.formula = undefined;
            }
          } catch (err) {
            brokenCount++;
            itemHasFix = true;
            details.push({
              itemId: item.id,
              itemCode: item.item_code || '',
              rowId: row.id,
              field: 'formula',
              formula: formulaStr,
              reason: String(err)
            });
            updatedRow.formula = undefined;
          }
        }
      }

      // Check standard fields: no_of_units, length, breadth, height
      const stdFields: (keyof MBRow)[] = ['no_of_units', 'length', 'breadth', 'height'];
      stdFields.forEach((f) => {
        const val = updatedRow[f];
        if (typeof val === 'string') {
          const trimmed = val.trim();
          if (trimmed.startsWith('=')) {
            try {
              const evaluated = evaluateMBFormula(trimmed, mbRows, rIdx, project.items);
              if (isNaN(evaluated) || !isFinite(evaluated)) {
                brokenCount++;
                itemHasFix = true;
                details.push({
                  itemId: item.id,
                  itemCode: item.item_code || '',
                  rowId: row.id,
                  field: String(f),
                  formula: trimmed,
                  reason: 'Broken cell reference or division by zero'
                });
                updatedRow[f] = 0;
              }
            } catch (err) {
              brokenCount++;
              itemHasFix = true;
              details.push({
                itemId: item.id,
                itemCode: item.item_code || '',
                rowId: row.id,
                field: String(f),
                formula: trimmed,
                reason: String(err)
              });
              updatedRow[f] = 0;
            }
          }
        }
      });

      // Check custom_fields
      if (updatedRow.custom_fields && typeof updatedRow.custom_fields === 'object') {
        const customObj = { ...updatedRow.custom_fields };
        Object.keys(customObj).forEach((colName) => {
          const val = customObj[colName];
          if (typeof val === 'string') {
            const trimmed = val.trim();
            if (trimmed.startsWith('=')) {
              try {
                const evaluated = evaluateMBFormula(trimmed, mbRows, rIdx, project.items);
                if (isNaN(evaluated) || !isFinite(evaluated)) {
                  brokenCount++;
                  itemHasFix = true;
                  details.push({
                    itemId: item.id,
                    itemCode: item.item_code || '',
                    rowId: row.id,
                    field: `custom_fields.${colName}`,
                    formula: trimmed,
                    reason: 'Broken custom column formula reference'
                  });
                  customObj[colName] = '0';
                }
              } catch (err) {
                brokenCount++;
                itemHasFix = true;
                details.push({
                  itemId: item.id,
                  itemCode: item.item_code || '',
                  rowId: row.id,
                  field: `custom_fields.${colName}`,
                  formula: trimmed,
                  reason: String(err)
                });
                customObj[colName] = '0';
              }
            }
          }
        });
        updatedRow.custom_fields = customObj;
      }

      return updatedRow;
    });

    if (itemHasFix) fixedItemsCount++;

    return {
      ...item,
      mb_rows: sanitizedRows
    };
  });

  return {
    sanitizedProject: { ...project, items: sanitizedItems },
    report: {
      brokenCount,
      fixedItemsCount,
      details
    }
  };
}

