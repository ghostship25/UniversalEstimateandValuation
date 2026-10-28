import React, { useState, useEffect, useRef } from 'react';
import { calcQuantityVal } from '../services/rateEngine';

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
  onEvaluateFormula
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [displayInput, setDisplayInput] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleFocus = () => {
    setIsEditing(true);
    // Show raw formula string when focused for editing
    setDisplayInput(String(value ?? ''));
    if (onFocusCell) onFocusCell();
  };

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
    setIsEditing(false);
    const parsed = parseFormulaOrValue(displayInput);
    onChange(parsed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommit();
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
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
        } ${className}`}
        title={cellRefName ? `Cell ${cellRefName} (Calculated)` : 'Calculated Value'}
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
      }`}
    >
      <input
        ref={inputRef}
        type="text"
        disabled={isDisabled}
        value={displayInput}
        onChange={(e) => setDisplayInput(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleCommit}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full p-1.5 font-mono text-xs text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 font-bold transition shadow-2xs ${
          isDisabled ? 'bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed' : ''
        } ${isFormula ? 'text-emerald-800 bg-emerald-50/40' : ''} ${className}`}
      />
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
