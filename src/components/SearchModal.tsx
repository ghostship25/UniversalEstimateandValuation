import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  Layers,
  Calculator,
  ArrowRight,
  Command,
  FileSpreadsheet,
  BookOpen,
  DollarSign,
  Boxes,
  PenTool,
  RotateCcw,
  Download,
  Sparkles,
  ChevronRight,
  FolderOpen
} from 'lucide-react';
import { RateNormItem, ResourceMaster, ProjectEstimate } from '../types';
import { currencyCode } from '../services/currency';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  norms: RateNormItem[];
  resources: ResourceMaster[];
  project?: ProjectEstimate;
  onSelectNorm?: (normId: number) => void;
  onNavigateTab?: (tab: string) => void;
  onTriggerExportWorkbook?: () => void;
  onOpenRestoreModal?: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  norms,
  resources,
  project,
  onSelectNorm,
  onNavigateTab,
  onTriggerExportWorkbook,
  onOpenRestoreModal
}) => {
  const [query, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global Ctrl/Cmd + K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Quick navigation action presets
  const quickActions = useMemo(() => [
    {
      id: 'act-rates',
      type: 'action',
      title: 'Go to Zone Rates & Material Prices',
      category: 'Navigation',
      icon: DollarSign,
      iconColor: 'text-blue-600',
      action: () => { onNavigateTab?.('zone-rates'); onClose(); }
    },
    {
      id: 'act-norms',
      type: 'action',
      title: 'Go to Norms & Formula Library',
      category: 'Navigation',
      icon: Layers,
      iconColor: 'text-indigo-600',
      action: () => { onNavigateTab?.('norms-library'); onClose(); }
    },
    {
      id: 'act-analysis',
      type: 'action',
      title: 'Go to Rate Analysis Engine',
      category: 'Navigation',
      icon: Calculator,
      iconColor: 'text-blue-600',
      action: () => { onNavigateTab?.('rate-analysis'); onClose(); }
    },
    {
      id: 'act-mb',
      type: 'action',
      title: 'Go to Measurement Book (MB)',
      category: 'Navigation',
      icon: BookOpen,
      iconColor: 'text-purple-600',
      action: () => { onNavigateTab?.('mb'); onClose(); }
    },
    {
      id: 'act-boq',
      type: 'action',
      title: 'Go to BOQ Cost Estimate Abstract',
      category: 'Navigation',
      icon: FileSpreadsheet,
      iconColor: 'text-emerald-600',
      action: () => { onNavigateTab?.('boq'); onClose(); }
    },
    {
      id: 'act-resources',
      type: 'action',
      title: 'Go to Resource Quantities Breakdown',
      category: 'Navigation',
      icon: Boxes,
      iconColor: 'text-amber-600',
      action: () => { onNavigateTab?.('resource-breakdown'); onClose(); }
    },
    {
      id: 'act-drawings',
      type: 'action',
      title: 'Go to Template Drawings & CAD View',
      category: 'Navigation',
      icon: PenTool,
      iconColor: 'text-cyan-600',
      action: () => { onNavigateTab?.('template-drawings'); onClose(); }
    },
    {
      id: 'act-restore',
      type: 'action',
      title: 'Open System Restore Points & Snapshots',
      category: 'Data & Backup',
      icon: RotateCcw,
      iconColor: 'text-rose-600',
      action: () => { onOpenRestoreModal?.(); onClose(); }
    }
  ], [onNavigateTab, onOpenRestoreModal, onClose]);

  // Filtered lists
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    // Matching actions
    const matchedActions = q
      ? quickActions.filter((a) => a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q))
      : quickActions.slice(0, 4);

    // Matching Norms
    const matchedNorms = norms
      .filter((n) => {
        if (!q) return false;
        return (
          String(n.code || '').toLowerCase().includes(q) ||
          String(n.description || '').toLowerCase().includes(q) ||
          String(n.source || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 5)
      .map((n) => ({
        id: `norm-${n.item_id}`,
        type: 'norm',
        title: `${n.code} — ${n.description}`,
        sub: `${n.source || 'Norm'} | Base: ${n.base_quantity} ${n.base_unit}`,
        icon: Calculator,
        iconColor: 'text-blue-600',
        action: () => {
          onSelectNorm?.(n.item_id);
          onNavigateTab?.('rate-analysis');
          onClose();
        }
      }));

    // Matching Master Resources
    const matchedResources = resources
      .filter((r) => {
        if (!q) return false;
        return (
          String(r.name || '').toLowerCase().includes(q) ||
          String(r.code || '').toLowerCase().includes(q) ||
          String(r.category || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 5)
      .map((r) => ({
        id: `res-${r.resource_id}`,
        type: 'resource',
        title: r.name,
        sub: `Category: ${r.category} | Unit: ${r.unit} ${r.default_rate ? `| Rate: {currencyCode()} ${r.default_rate}` : ''}`,
        icon: Layers,
        iconColor: 'text-indigo-600',
        action: () => {
          onNavigateTab?.('zone-rates');
          onClose();
        }
      }));

    // Matching BOQ Items
    const matchedBOQ = (project?.items || [])
      .filter((b) => {
        if (!q) return false;
        return (
          String(b.item_code || '').toLowerCase().includes(q) ||
          String(b.description || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 4)
      .map((b) => ({
        id: `boq-${b.id}`,
        type: 'boq',
        title: `${b.item_code || 'Item'}: ${b.description}`,
        sub: `Qty: ${b.estimated_quantity} ${b.unit} | Rate: ${currencyCode()} ${b.calculated_unit_rate || 0}`,
        icon: FileSpreadsheet,
        iconColor: 'text-emerald-600',
        action: () => {
          onNavigateTab?.('boq');
          onClose();
        }
      }));

    return [...matchedActions, ...matchedNorms, ...matchedResources, ...matchedBOQ];
  }, [query, quickActions, norms, resources, project, onSelectNorm, onNavigateTab, onClose]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  // Keyboard navigation (Up, Down, Enter, Esc)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < results.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        results[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 p-4 z-50 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50/70">
          <Command className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, item code (e.g. 2.4, 7.2), material name..."
            value={query}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
          />
          <div className="hidden sm:flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-200 text-slate-700 rounded border border-slate-300">
              ESC
            </kbd>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-2 sm:p-3 overflow-y-auto max-h-[60vh] space-y-1">
          {results.length > 0 ? (
            results.map((item, index) => {
              const IconComp = item.icon || ChevronRight;
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 ' + (item.iconColor || 'text-slate-600')
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {item.title}
                      </div>
                      {'sub' in item && item.sub && (
                        <div className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                          {item.sub}
                        </div>
                      )}
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-3.5 h-3.5 shrink-0 transition ${
                      isSelected ? 'text-white translate-x-0.5' : 'text-slate-300'
                    }`}
                  />
                </button>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              No matching commands, norms, resources, or items found for &quot;{query}&quot;.
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-3">
            <span>
              Navigate <kbd className="font-mono bg-slate-200 px-1 rounded text-slate-700">↑</kbd>{' '}
              <kbd className="font-mono bg-slate-200 px-1 rounded text-slate-700">↓</kbd>
            </span>
            <span>
              Select <kbd className="font-mono bg-slate-200 px-1 rounded text-slate-700">↵</kbd>
            </span>
          </div>
          <div className="text-[10px] text-slate-400">
            Universal Estimating & Valuation Global Command Engine
          </div>
        </div>
      </div>
    </div>
  );
};
