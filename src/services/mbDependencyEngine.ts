import { evalCellValue } from './mbCellValue';
import { BOQItem, MBRow, ProjectEstimate } from '../types';
import { evaluateMBFormula } from './mbFormulaEvaluator';
import { calcQuantityVal } from './rateEngine';

export function getItemUnitRate(item: BOQItem, rateMode: 'user' | 'contractor' = 'user'): number {
  if (rateMode === 'user') {
    return item.user_rate !== undefined ? item.user_rate : item.calculated_unit_rate || 0;
  }
  return item.contractor_rate !== undefined ? item.contractor_rate : item.calculated_unit_rate || 0;
}

function evalValOrFormula(val: any, rows: MBRow[], idx: number, allItems: BOQItem[]): number | null {
  return evalCellValue(val, (f) => evaluateMBFormula(f, rows, idx, allItems));
}

/**
 * Base quantity of a Measurement Book row from its No. / Length / Breadth / Height.
 *
 * A typed 0 is a real value: it multiplies, so 1 x 3 x 6 x 0 = 0.
 * An empty or text cell is blank (null) and is SKIPPED, like an empty column on a paper MB: 1 x 3 x 6 x (empty) = 18.
 * Only included columns take part. If every included column is blank the quantity is 0.
 * Negative values (deductions) are kept.
 */
export function computeRowBaseQuantity(
  v: { no: number | null; l: number | null; b: number | null; h: number | null },
  use: { no: boolean; l: boolean; b: boolean; h: boolean }
): number {
  const factors: number[] = [];
  const take = (on: boolean, x: number | null) => { if (on && x !== null && Number.isFinite(x)) factors.push(x); };
  take(use.no, v.no); take(use.l, v.l); take(use.b, v.b); take(use.h, v.h);
  return factors.length === 0 ? 0 : factors.reduce((acc, x) => acc * x, 1);
}

export function recalculateSingleMBRows(
  rows: MBRow[],
  allItems: BOQItem[],
  currentItem?: BOQItem
): MBRow[] {
  let currentRows = [...rows];
  // 2 passes for intra-item row references (e.g. R2 depending on R1)
  for (let pass = 0; pass < 2; pass++) {
    currentRows = currentRows.map((r, idx) => {
      // Evaluate custom formula if stored
      if (r.formula && String(r.formula).trim().startsWith('=')) {
        const evaluated = evaluateMBFormula(String(r.formula), currentRows, idx, allItems);
        return { ...r, quantity: Math.round(evaluated * 10000) / 10000 };
      }

      const no = evalValOrFormula(r.no_of_units, currentRows, idx, allItems);
      const l = evalValOrFormula(r.length, currentRows, idx, allItems);
      const b = evalValOrFormula(r.breadth, currentRows, idx, allItems);
      const h = evalValOrFormula(r.height, currentRows, idx, allItems);

      const defaultCols = ['no_of_units', 'length', 'breadth', 'height'];
      const includedCols = currentItem?.included_calc_columns || defaultCols;

      const useNo = includedCols.includes('no_of_units');
      const useL = includedCols.includes('length');
      const useB = includedCols.includes('breadth');
      const useH = includedCols.includes('height');

      let computedQty = computeRowBaseQuantity({ no, l, b, h }, { no: useNo, l: useL, b: useB, h: useH });

      if (currentItem && currentItem.custom_column_names && currentItem.custom_column_config) {
        currentItem.custom_column_names.forEach((colName) => {
          const config = currentItem.custom_column_config?.[colName];
          const isColIncludedInCalc = !includedCols || includedCols.includes(colName);
          const rawVal = r.custom_fields?.[colName];
          if (rawVal !== undefined && rawVal !== '') {
            const val = evalValOrFormula(rawVal, currentRows, idx, allItems);
            if (isColIncludedInCalc && config) {
              if (val !== null && !isNaN(val)) {
                if (config.calcMode === 'multiply') computedQty *= val;
                else if (config.calcMode === 'add') computedQty += val;
                else if (config.calcMode === 'subtract') computedQty -= val;
              }
            }
          }
        });
      }

      const precision = currentItem?.precision ?? 2;
      const truncate = currentItem?.truncate_quantity ?? false;
      return { ...r, quantity: calcQuantityVal(computedQty, precision, truncate) };
    });
  }
  return currentRows;
}

export function recalculateItemTotal(
  item: BOQItem,
  allItems: BOQItem[],
  rateMode: 'user' | 'contractor' = 'user'
): BOQItem {
  const precision = item.precision ?? 2;
  const truncate = item.truncate_quantity ?? false;
  const mbRows = recalculateSingleMBRows(item.mb_rows || [], allItems, item);

  const hasMBRows = Array.isArray(mbRows) && mbRows.length > 0;
  const sumQty = hasMBRows ? mbRows.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0) : 0;
  const roundedQty = calcQuantityVal(sumQty, precision, truncate);
  const finalQty = hasMBRows ? roundedQty : (typeof item.estimated_quantity === 'number' ? item.estimated_quantity : 0);

  const unitRate = getItemUnitRate(item, rateMode);
  const roundedAmount = Math.round(finalQty * unitRate * 100) / 100;

  return {
    ...item,
    mb_rows: mbRows,
    estimated_quantity: finalQty,
    total_amount: roundedAmount
  };
}

/**
 * Iteratively recalculates all items in the project until quantities and formulas stabilize.
 */
export function recalculateAllProjectItems(
  items: BOQItem[],
  rateMode: 'user' | 'contractor' = 'user'
): { items: BOQItem[]; hasChanged: boolean } {
  let curr = [...items];
  let hasChanged = false;

  for (let pass = 0; pass < 5; pass++) {
    let passChanged = false;
    const next = curr.map((item) => {
      const updated = recalculateItemTotal(item, curr, rateMode);
      
      const qtyDiff = Math.abs((updated.estimated_quantity || 0) - (item.estimated_quantity || 0)) > 0.00001;
      const amountDiff = Math.abs((updated.total_amount || 0) - (item.total_amount || 0)) > 0.01;
      
      let rowsDiff = false;
      const oldRows = item.mb_rows || [];
      const newRows = updated.mb_rows || [];
      if (oldRows.length !== newRows.length) {
        rowsDiff = true;
      } else {
        for (let i = 0; i < oldRows.length; i++) {
          const o = oldRows[i];
          const n = newRows[i];
          if (
            Math.abs((o.quantity || 0) - (n.quantity || 0)) > 0.00001 ||
            o.formula !== n.formula ||
            o.mb_book_id !== n.mb_book_id ||
            o.no_of_units !== n.no_of_units ||
            o.length !== n.length ||
            o.breadth !== n.breadth ||
            o.height !== n.height ||
            o.particulars !== n.particulars ||
            JSON.stringify(o.custom_fields || {}) !== JSON.stringify(n.custom_fields || {})
          ) {
            rowsDiff = true;
            break;
          }
        }
      }

      if (qtyDiff || amountDiff || rowsDiff) {
        passChanged = true;
        console.log(`[mbDependencyEngine] Item update detected on pass ${pass + 1}:`, {
          itemId: item.id,
          code: item.item_code,
          oldQty: item.estimated_quantity,
          newQty: updated.estimated_quantity,
          oldAmount: item.total_amount,
          newAmount: updated.total_amount,
          reasons: { qtyDiff, amountDiff, rowsDiff }
        });
        return updated;
      }
      return item;
    });

    if (passChanged) {
      hasChanged = true;
      curr = next;
    } else {
      break;
    }
  }

  return { items: curr, hasChanged };
}

export function recalculateProject(project: ProjectEstimate): ProjectEstimate {
  const { items, hasChanged } = recalculateAllProjectItems(project.items, project.rate_mode || 'user');
  if (!hasChanged) return project;
  return {
    ...project,
    items,
    updated_at: new Date().toISOString()
  };
}
