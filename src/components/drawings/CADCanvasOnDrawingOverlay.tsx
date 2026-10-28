import React, { useState } from 'react';
import { PenTool, Zap, ChevronDown, ChevronUp, Sliders } from 'lucide-react';
import { CADDimensionField } from './templates/types';

interface CADCanvasOnDrawingOverlayProps {
  fields: CADDimensionField[];
  values: Record<string, any>;
  onUpdateValue: (key: string, val: number) => void;
  liveSyncEnabled: boolean;
  category: string;
}

// Clean helper to produce short & clear CAD labels
const formatShortLabel = (label: string): string => {
  // Extract variable code in parentheses if present, e.g. "Invert Width B (m)" -> "B" or "Invert W"
  const match = label.match(/\(([A-Za-z0-9_]+)\)/);
  if (match) return match[1];
  
  // Clean string
  const clean = label.replace(/\([^)]*\)/g, '').trim();
  if (clean.length > 14) {
    return clean.split(' ')[0];
  }
  return clean;
};

export const CADCanvasOnDrawingOverlay: React.FC<CADCanvasOnDrawingOverlayProps> = ({
  fields,
  values,
  onUpdateValue,
  liveSyncEnabled,
}) => {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  if (!fields || fields.length === 0) return null;

  return (
    <div className="absolute bottom-3 left-3 z-20 max-w-[92%] print:hidden">
      {isCollapsed ? (
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-slate-950/90 hover:bg-slate-900 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-slate-200 text-xs font-bold shadow-xl flex items-center gap-2 transition-all"
          title="Expand Interactive CAD Dimensions Bar"
        >
          <PenTool className="w-3.5 h-3.5 text-indigo-400" />
          <span>Interactive CAD Dims ({fields.length})</span>
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ) : (
        <div className="bg-slate-950/85 backdrop-blur-md p-2 rounded-2xl border border-slate-800/90 text-white shadow-2xl flex flex-wrap items-center gap-1.5">
          {/* Header Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-950/80 text-indigo-300 rounded-xl text-xs font-bold border border-indigo-800/50">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Interactive Dims:</span>
          </div>

          {/* Dimension Inputs */}
          {fields.map((f) => {
            const currentVal = values[f.key] !== undefined ? values[f.key] : f.defaultValue;
            const isEditing = editingKey === f.key;
            const shortLabel = formatShortLabel(f.label);

            return (
              <div
                key={f.key}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs transition-all ${
                  isEditing
                    ? 'bg-indigo-950 border-indigo-500 ring-2 ring-indigo-500/30'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="font-semibold text-slate-400 text-[11px]">{shortLabel}:</span>

                {isEditing ? (
                  <input
                    type="number"
                    step={f.step || 0.05}
                    value={currentVal}
                    onChange={(e) => onUpdateValue(f.key, parseFloat(e.target.value) || 0)}
                    onBlur={() => setEditingKey(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setEditingKey(null);
                    }}
                    autoFocus
                    className="w-14 px-1 py-0.5 bg-slate-950 border border-indigo-400 rounded-md text-emerald-400 font-mono font-bold text-xs text-center focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => setEditingKey(f.key)}
                    className="font-mono text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
                    title={`Click to edit ${f.label}`}
                  >
                    <span>{typeof currentVal === 'number' ? currentVal.toFixed(2) : currentVal}</span>
                    <span className="text-[10px] text-slate-400 font-sans">{f.unit}</span>
                  </button>
                )}
              </div>
            );
          })}

          {liveSyncEnabled && (
            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 rounded-xl text-[10px] font-bold">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">Synced</span>
            </div>
          )}

          {/* Minimize / Collapse Button */}
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition ml-1"
            title="Collapse Overlay Bar"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
