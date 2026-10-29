import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { calcQuantityVal } from '../services/rateEngine';
import {
  LinkTarget,
  PointSession,
  buildRef,
  formulaPointing,
  referencedKeys,
  sameTarget,
  targetKey,
  usePointingVersion,
} from '../services/formulaPointing';

interface SpreadsheetCellProps {
  value: number | string;
  onChange?: (newValue: number | string) => void;
  type?: 'number' | 'text';
  step?: string | number;
  placeholder?: string;
  isReadOnly?: boolean;
  isDisabled?: boolean;
  isCalculated?: boolean;
  cellRefName?: string; // e.g., "C4" or "L2"
  className?: string;
  onFocusCell?: () => void;
  suffix?: string;
  precision?: number;
  truncate?: boolean;
  onEvaluateFormula?: (formulaStr: string) => number | string;
  /**
   * Identity of this cell for Excel-style point-and-click linking. When set, this cell can be
   * clicked while another cell's formula is being typed (after "=" or an operator) to insert a reference.
   */
  linkTarget?: LinkTarget;
}

/**
 * Inline Spreadsheet Cell Component
 * Allows inline editing, formula expression evaluation (=2*3.5), 
 * and real-time trigger for row total recalculations.
 */
export const SpreadsheetCell: React.FC<SpreadsheetCellProps> = ({
  value,
  onChange,
  type = 'number',
  step = '0.01',
  placeholder = '',
  isReadOnly = false,
  isDisabled = false,
  isCalculated = false,
  cellRefName,
  className = '',
  onFocusCell,
  suffix,
  precision,
  truncate = false,
  onEvaluateFormula,
  linkTarget
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [displayInput, setDisplayInput] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef<string>('');
  const lastInsertRef = useRef<{ start: number; end: number } | null>(null);
  const pendingCaretRef = useRef<number | null>(null);
  const sessionRef = useRef<PointSession | null>(null);
  const cancelledRef = useRef(false);
  usePointingVersion(); // re-render when a formula is being pointed so highlights stay in sync

  const getEvaluatedDisplay = (val: number | string): string => {
    if (typeof val === 'string' && val.trim().startsWith('=')) {
      if (onEvaluateFormula) {
        try {
          const res = onEvaluateFormula(val);
          if (typeof res === 'number' && !isNaN(res)) {
            const p = precision !== undefined ? precision : 2;
            const formattedVal = calcQuantityVal(res, p, truncate);
            return formattedVal.toLocaleString('en-US', { minimumFractionDigits: p, maximumFractionDigits: p });
          }
          if (res !== undefined && res !== null) return String(res);
        } catch (e) {
          // fallback
        }
      }
    }
    if (typeof val === 'number') {
      const p = precision !== undefined ? precision : 2;
      const formattedVal = calcQuantityVal(val, p, truncate);
      return formattedVal.toLocaleString('en-US', { minimumFractionDigits: p, maximumFractionDigits: p });
    }
    return String(val ?? '');
  };

  useEffect(() => {
    if (!isEditing) {
      setDisplayInput(getEvaluatedDisplay(value));
    }
  }, [value, isEditing]);

  const endSession = () => {
    if (sessionRef.current) formulaPointing.clearIf(sessionRef.current);
    sessionRef.current = null;
    lastInsertRef.current = null;
  };

  const updateDraft = (next: string) => {
    draftRef.current = next;
    setDisplayInput(next);
  };

  const handleFocus = () => {
    setIsEditing(true);
    // Show raw formula string when focused for editing
    updateDraft(String(value ?? ''));
    if (onFocusCell) onFocusCell();

    const s: PointSession = {
      origin: linkTarget || null,
      getDraft: () => draftRef.current,
      canPoint: () => {
        const el = inputRef.current;
        const d = draftRef.current;
        if (!el || !d.trim().startsWith('=')) return false;
        const caret = el.selectionStart ?? d.length;
        if (/[=+\-*/(,^]\s*$/.test(d.slice(0, caret))) return true;
        const li = lastInsertRef.current;
        return !!li && li.end === caret;
      },
      insertRef: (ref: string) => {
        const el = inputRef.current;
        const d = draftRef.current;
        let start = el?.selectionStart ?? d.length;
        let end = el?.selectionEnd ?? start;
        const li = lastInsertRef.current;
        if (li && li.end === start && start === end) {
          start = li.start; // Excel behaviour: clicking another cell replaces the last pointed reference
        }
        const next = d.slice(0, start) + ref + d.slice(end);
        lastInsertRef.current = { start, end: start + ref.length };
        pendingCaretRef.current = start + ref.length;
        updateDraft(next);
        formulaPointing.touch();
      },
    };
    sessionRef.current = s;
    formulaPointing.setSession(s);
  };

  // restore caret after a reference was inserted
  useLayoutEffect(() => {
    if (pendingCaretRef.current !== null && inputRef.current) {
      const pos = pendingCaretRef.current;
      pendingCaretRef.current = null;
      inputRef.current.focus();
      inputRef.current.setSelectionRange(pos, pos);
    }
  }, [displayInput]);

  useEffect(() => () => endSession(), []);

  // Clicking this cell while another cell's formula is waiting for an operand inserts a reference.
  const handlePointMouseDown = (e: React.MouseEvent) => {
    if (!linkTarget) return;
    const s = formulaPointing.getSession();
    if (!s || sameTarget(s.origin, linkTarget) || !s.canPoint()) return;
    e.preventDefault();
    e.stopPropagation();
    s.insertRef(buildRef(s.origin, linkTarget));
  };

  const pointSession = formulaPointing.getSession();
  const pointingActive = !!(pointSession && linkTarget && !sameTarget(pointSession.origin, linkTarget) && pointSession.canPoint());
  const isReferenced = !!(
    pointSession && linkTarget && !sameTarget(pointSession.origin, linkTarget) &&
    referencedKeys(pointSession.getDraft(), pointSession.origin).has(targetKey(linkTarget))
  );
  const pointClasses = `${pointingActive ? 'cursor-crosshair hover:ring-2 hover:ring-sky-400 rounded' : ''} ${
    isReferenced ? 'ring-2 ring-sky-500 ring-offset-1 bg-sky-50 rounded' : ''
  }`;

  const parseFormulaOrValue = (valStr: string): number | string => {
    const trimmed = valStr.trim();
    if (!trimmed) return type === 'number' ? 0 : '';
    if (trimmed.startsWith('=')) {
      // Retain formula string in state so it dynamically updates whenever referenced cells change
      return trimmed;
    }
    // Check if user entered an arithmetic expression like '10*2.5*0.3' or '2+3'
    if (/[+\-*/]/.test(trimmed) && /[0-9]/.test(trimmed)) {
      return '=' + trimmed;
    }
    if (type === 'number') {
      const num = parseFloat(trimmed);
      return isNaN(num) ? 0 : num;
    }
    return trimmed;
  };

  const handleCommit = () => {
    if (cancelledRef.current) { cancelledRef.current = false; return; }
    if (!isEditing) return;
    setIsEditing(false);
    endSession();
    const parsed = parseFormulaOrValue(draftRef.current || displayInput);
    onChange?.(parsed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommit();
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      cancelledRef.current = true;
      draftRef.current = String(value ?? '');
      setIsEditing(false);
      endSession();
      setDisplayInput(getEvaluatedDisplay(value));
      inputRef.current?.blur();
    }
  };

  const isFormula = typeof value === 'string' && value.trim().startsWith('=');

  if (isReadOnly || isCalculated) {
    return (
      <div
        className={`px-2 py-1.5 font-mono text-xs rounded transition flex items-center justify-between select-none ${
          isCalculated
            ? 'bg-blue-50/80 text-blue-900 font-black border border-blue-200/80'
            : 'bg-slate-50 text-slate-700 font-bold'
        } ${className} ${pointClasses}`}
        title={cellRefName ? `Cell ${cellRefName} (Calculated)` : 'Calculated Value'}
        onMouseDownCapture={handlePointMouseDown}
      >
        <span className="truncate">
          {typeof value === 'number'
            ? calcQuantityVal(value, precision !== undefined ? precision : 2, truncate).toLocaleString('en-US', {
                minimumFractionDigits: precision !== undefined ? precision : 2,
                maximumFractionDigits: precision !== undefined ? precision : 2
              })
            : getEvaluatedDisplay(value)}
        </span>
        {suffix && <span className="text-[10px] text-slate-500 font-medium ml-1">{suffix}</span>}
        {isCalculated && (
          <span className="text-[9px] font-sans font-extrabold bg-blue-200/60 text-blue-900 px-1 py-0.2 rounded ml-1">
            ƒx
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative group ${
        isEditing ? 'ring-2 ring-emerald-500 rounded bg-emerald-50/20 z-10' : ''
      } ${pointClasses}`}
      onMouseDownCapture={handlePointMouseDown}
    >
      <input
        ref={inputRef}
        type="text"
        disabled={isDisabled}
        value={isEditing ? displayInput : getEvaluatedDisplay(value)}
        onChange={(e) => {
          lastInsertRef.current = null;
          updateDraft(e.target.value);
          formulaPointing.touch();
        }}
        onFocus={handleFocus}
        onBlur={handleCommit}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full p-1.5 font-mono text-xs text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 font-bold transition shadow-2xs ${
          isDisabled ? 'bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed' : ''
        } ${isFormula ? 'text-emerald-800 bg-emerald-50/40' : ''} ${className}`}
      />
      {isEditing && displayInput.trim().startsWith('=') && typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none bg-slate-900/95 text-white rounded-lg shadow-xl px-3 py-1.5 text-xs flex items-center gap-3 max-w-[90vw]">
            <span className="font-mono font-bold text-emerald-300 truncate">ƒx {displayInput}</span>
            <span className="text-slate-300 whitespace-nowrap">Click a cell to link · Enter to confirm · Esc to cancel</span>
          </div>,
          document.body
        )}
      {isFormula && !isEditing && (
        <span
          className="absolute right-1 top-1.5 text-[9px] font-sans font-bold bg-emerald-100 text-emerald-800 px-1 rounded pointer-events-none"
          title={`Formula: ${value}`}
        >
          ƒx
        </span>
      )}
    </div>
  );
};


/**
 * Wrap any non-input element (e.g. an item's total quantity) so it can be clicked to insert a reference
 * while a formula is being typed in a SpreadsheetCell.
 */
export const PointTarget: React.FC<{
  target: LinkTarget;
  className?: string;
  title?: string;
  children: React.ReactNode;
}> = ({ target, className = '', title, children }) => {
  usePointingVersion();
  const s = formulaPointing.getSession();
  const active = !!(s && !sameTarget(s.origin, target) && s.canPoint());
  const referenced = !!(s && referencedKeys(s.getDraft(), s.origin).has(targetKey(target)));
  return (
    <span
      className={`${className} ${active ? 'cursor-crosshair hover:ring-2 hover:ring-sky-400 rounded' : ''} ${
        referenced ? 'ring-2 ring-sky-500 ring-offset-1 bg-sky-50 rounded' : ''
      }`}
      title={title}
      onMouseDownCapture={(e) => {
        const sess = formulaPointing.getSession();
        if (!sess || sameTarget(sess.origin, target) || !sess.canPoint()) return;
        e.preventDefault();
        e.stopPropagation();
        sess.insertRef(buildRef(sess.origin, target));
      }}
    >
      {children}
    </span>
  );
};
