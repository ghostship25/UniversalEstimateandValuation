import React, { useState } from 'react';
import {
  Workflow,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Layers,
  Settings,
  ChevronDown,
  ChevronUp,
  Sliders,
  Sparkles,
  Link,
  Unlink,
  Info,
  HelpCircle,
  Check,
  X,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { BOQItem } from '../../types';
import {
  DrawingSectionDef,
  ProtectionWallParameters,
  ProtectionWallComponentMapping,
  DynamicBOQComponentDef,
  ComponentCalcFormula
} from './types';
import {
  calculateComponentQuantityForSection,
  calculateTotalComponentQuantity
} from '../../services/boqStructureMappingService';

interface BOQStructureComponentMappingPanelProps {
  variantKey: string;
  variantTitle?: string;
  components: DynamicBOQComponentDef[];
  onUpdateComponents: (updated: DynamicBOQComponentDef[]) => void;
  projectItems: BOQItem[];
  wallSections: DrawingSectionDef[];
  activeSection?: DrawingSectionDef;
  onAutoDetectAll: () => void;
  showToast: (msg: string) => void;
}

export const BOQStructureComponentMappingPanel: React.FC<BOQStructureComponentMappingPanelProps> = ({
  variantKey,
  variantTitle = 'Protection Wall Structure',
  components,
  onUpdateComponents,
  projectItems,
  wallSections,
  activeSection,
  onAutoDetectAll,
  showToast
}) => {
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('Custom');
  const [customCalcFormula, setCustomCalcFormula] = useState<ComponentCalcFormula>('custom_multiplier');
  const [customUnit, setCustomUnit] = useState('m3');
  const [customFactor, setCustomFactor] = useState<number>(1.0);
  const [customMappedItemId, setCustomMappedItemId] = useState('');
  const [expandedCompId, setExpandedCompId] = useState<string | null>(null);
  const [areAllSubCardsExpanded, setAreAllSubCardsExpanded] = useState<boolean>(false);

  // Handle mapping changes for a specific component
  const handleMapItem = (compId: string, itemId: string) => {
    const updated = components.map((c) => {
      if (c.id === compId) {
        return { ...c, mappedItemId: itemId };
      }
      return c;
    });
    onUpdateComponents(updated);
    if (itemId) {
      const it = projectItems.find((i) => i.id === itemId);
      showToast(`🔗 Linked "${it?.description.slice(0, 30)}..." to component!`);
    }
  };

  // Handle custom user factor changes (e.g. formwork factor, rebar density, coping thickness, weep hole spacing)
  const handleUpdateFactor = (compId: string, factor: number) => {
    const updated = components.map((c) => {
      if (c.id === compId) {
        return { ...c, userFactor: factor };
      }
      return c;
    });
    onUpdateComponents(updated);
  };

  // Handle enable/disable component
  const handleToggleEnabled = (compId: string) => {
    const updated = components.map((c) => {
      if (c.id === compId) {
        return { ...c, enabled: c.enabled !== false ? false : true };
      }
      return c;
    });
    onUpdateComponents(updated);
  };

  // Handle adding a brand new custom component
  const handleAddCustomComponentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newId = `comp_custom_${Date.now()}`;
    const newComp: DynamicBOQComponentDef = {
      id: newId,
      key: `custom_${Date.now()}`,
      name: customName.trim(),
      categoryTag: customCategory || 'Custom',
      iconEmoji: '✨',
      unit: customUnit || 'm3',
      calcFormula: customCalcFormula,
      userFactor: customFactor || 1.0,
      mappedItemId: customMappedItemId || '',
      isCustom: true,
      enabled: true,
      remarks: `User custom component: Factor=${customFactor} ${customUnit}`
    };

    onUpdateComponents([...components, newComp]);
    setShowAddCustomModal(false);
    setCustomName('');
    setCustomFactor(1.0);
    setCustomMappedItemId('');
    showToast(`✨ Added custom BOQ mapping component "${newComp.name}"!`);
  };

  // Handle deleting a custom component
  const handleDeleteCustomComponent = (compId: string) => {
    const target = components.find((c) => c.id === compId);
    const filtered = components.filter((c) => c.id !== compId);
    onUpdateComponents(filtered);
    showToast(`Removed component "${target?.name || 'Component'}"`);
  };

  const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(true); // Minimized by default for clean interface
  const mappedCount = components.filter((c) => c.mappedItemId).length;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 transition-all shadow-xs">
      {/* Header with Title, Auto-Detect, Add Custom & Minimize/Expand Buttons */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
          className="flex items-center gap-2 text-left min-w-0 flex-1 group hover:opacity-80 transition"
          title={isPanelCollapsed ? 'Click to expand BOQ Component Mapping Panel' : 'Click to minimize BOQ Component Mapping Panel'}
        >
          <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Workflow className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-xs text-indigo-950">
                BOQ Component Mapping
              </span>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full border ${
                mappedCount === components.length && components.length > 0
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : mappedCount > 0
                  ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                {mappedCount}/{components.length} Mapped
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium truncate">
              {variantTitle} • {isPanelCollapsed ? 'Click to expand & configure' : 'Linked to BOQ Line Items'}
            </p>
          </div>
          <div className="p-1 rounded-md text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-200/60 transition">
            {isPanelCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onAutoDetectAll}
            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
            title="Auto-match BOQ items using intelligent keyword recognition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[10px] hidden sm:inline">Auto</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsPanelCollapsed(false);
              setShowAddCustomModal(true);
            }}
            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1"
            title="Add a custom BOQ component row for mapping with custom inputs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[10px] hidden sm:inline">Custom</span>
          </button>
          <button
            type="button"
            onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
            className="p-1.5 bg-slate-200/70 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            title={isPanelCollapsed ? 'Expand Component Panel' : 'Minimize Component Panel'}
          >
            {isPanelCollapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Component Mapping Rows List (Rendered when expanded) */}
      {!isPanelCollapsed && (
        <div className="space-y-2 mt-3 pt-2.5 border-t border-slate-200">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold px-1">
            <span>Structure Sub-Components & Measurement Rules</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAreAllSubCardsExpanded(!areAllSubCardsExpanded)}
                className="text-indigo-600 hover:underline flex items-center gap-0.5"
                title={areAllSubCardsExpanded ? 'Collapse all sub-cards' : 'Expand all sub-cards'}
              >
                {areAllSubCardsExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                <span>{areAllSubCardsExpanded ? 'Collapse Sub-Cards' : 'Expand Sub-Cards'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPanelCollapsed(true)}
                className="text-slate-600 hover:text-slate-900 flex items-center gap-0.5"
                title="Minimize whole mapping panel"
              >
                <ChevronUp className="w-3 h-3" />
                <span>Minimize</span>
              </button>
            </div>
          </div>

        {components.map((comp) => {
          const isEnabled = comp.enabled !== false;
          const mappedItem = projectItems.find((i) => i.id === comp.mappedItemId);
          const totalQty = calculateTotalComponentQuantity(comp, wallSections, mappedItem);
          const activeSecQty = activeSection
            ? calculateComponentQuantityForSection(comp, activeSection, mappedItem).quantity
            : 0;

          const isExpanded = areAllSubCardsExpanded || expandedCompId === comp.id;

          return (
            <div
              key={comp.id}
              className={`rounded-xl border transition-all ${
                isEnabled
                  ? mappedItem
                    ? 'bg-white border-indigo-200/80 shadow-xs'
                    : 'bg-white border-slate-200'
                  : 'bg-slate-100/80 border-slate-200 opacity-60'
              }`}
            >
              {/* Main Card Header */}
              <div className="p-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => handleToggleEnabled(comp.id)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    title={isEnabled ? 'Component enabled in MB' : 'Component disabled'}
                  />
                  <span className="text-base leading-none select-none">{comp.iconEmoji || '🧱'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-[11px] text-slate-900 truncate">
                        {comp.name}
                      </span>
                      {comp.categoryTag && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          {comp.categoryTag}
                        </span>
                      )}
                      {comp.isCustom && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="font-mono text-indigo-700 font-bold">
                        Qty: {totalQty.toFixed(3)} {mappedItem?.unit || comp.unit}
                      </span>
                      {wallSections.length > 1 && (
                        <span className="text-slate-400 font-mono">
                          (Sec: {activeSecQty.toFixed(2)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {mappedItem ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1" title={`Linked to #${mappedItem.code || ''} ${mappedItem.description}`}>
                      <Link className="w-2.5 h-2.5" />
                      <span className="hidden sm:inline">Linked</span>
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1" title="Unmapped component">
                      <Unlink className="w-2.5 h-2.5" />
                      <span className="hidden sm:inline">Unmapped</span>
                    </span>
                  )}
                  {comp.isCustom && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomComponent(comp.id)}
                      className="p-1 text-red-400 hover:text-red-600 rounded hover:bg-red-50 transition"
                      title="Delete custom component"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpandedCompId(expandedCompId === comp.id ? null : comp.id)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition"
                    title="Toggle custom inputs & formula details"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* BOQ Item Selector & Custom Input Place */}
              <div className="px-2 pb-2 pt-0 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <select
                    value={comp.mappedItemId || ''}
                    onChange={(e) => handleMapItem(comp.id, e.target.value)}
                    className={`w-full p-1 text-[11px] rounded-lg font-semibold border transition ${
                      comp.mappedItemId
                        ? 'border-indigo-300 bg-indigo-50/40 text-slate-900 focus:ring-2 focus:ring-indigo-500'
                        : 'border-slate-300 bg-white text-slate-700 focus:ring-2 focus:ring-slate-400'
                    }`}
                  >
                    <option value="">-- Select BOQ Item to Bind --</option>
                    {projectItems.map((it, idx) => (
                      <option key={it.id} value={it.id}>
                        #{idx + 1} ({it.code || 'BOQ'}) - {it.description.slice(0, 45)}... [{it.unit || 'm3'}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Data Input Place (Formwork factor, steel density, plaster factor, etc.) */}
                {(isExpanded || comp.calcFormula === 'formwork_shuttering' || comp.calcFormula === 'reinforcement_steel' || comp.isCustom) && (
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[10px] space-y-1.5 mt-1">
                    {/* Specific Control for Formwork Factor */}
                    {comp.calcFormula === 'formwork_shuttering' && (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <label className="font-bold text-slate-700 block">Formwork Multiplier Factor:</label>
                          <span className="text-[9px] text-slate-500">
                            Custom factor (e.g. 2.0 = both sides, 1.0 = single side, 2.5 = deep)
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="10.0"
                            value={typeof comp.userFactor === 'number' ? comp.userFactor : 2.0}
                            onChange={(e) => handleUpdateFactor(comp.id, parseFloat(e.target.value) || 1.0)}
                            className="w-16 p-1 text-center font-mono font-bold bg-white border border-slate-300 rounded text-slate-900 text-xs"
                          />
                          <span className="font-bold text-slate-600">x</span>
                        </div>
                      </div>
                    )}

                    {/* Specific Control for Reinforcement Steel Density */}
                    {comp.calcFormula === 'reinforcement_steel' && (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <label className="font-bold text-slate-700 block">Steel Rebar Density (kg/m³):</label>
                          <span className="text-[9px] text-slate-500">
                            Rebar kg per cubic meter of RCC concrete
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            step="5"
                            min="10"
                            max="300"
                            value={comp.userFactor || 95}
                            onChange={(e) => handleUpdateFactor(comp.id, parseFloat(e.target.value) || 95)}
                            className="w-16 p-1 text-center font-mono font-bold bg-white border border-slate-300 rounded text-slate-900 text-xs"
                          />
                          <span className="font-bold text-slate-600">kg/m³</span>
                        </div>
                      </div>
                    )}

                    {/* Specific Control for PCC Coping Band */}
                    {(comp.calcFormula === 'pcc_coping_124' || comp.calcFormula === 'pcc_coping_m15') && (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <label className="font-bold text-slate-700 block">Coping Thickness (m):</label>
                          <span className="text-[9px] text-slate-500">
                            Top PCC cap thickness (e.g. 0.075m = 75mm)
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max="0.5"
                            value={comp.userFactor || 0.075}
                            onChange={(e) => handleUpdateFactor(comp.id, parseFloat(e.target.value) || 0.075)}
                            className="w-16 p-1 text-center font-mono font-bold bg-white border border-slate-300 rounded text-slate-900 text-xs"
                          />
                          <span className="font-bold text-slate-600">m</span>
                        </div>
                      </div>
                    )}

                    {/* Custom multiplier for user-created custom component */}
                    {comp.isCustom && comp.calcFormula === 'custom_multiplier' && (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <label className="font-bold text-slate-700 block">Custom Multiplier Factor:</label>
                          <span className="text-[9px] text-slate-500">
                            Applied to L × H × Factor
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            step="0.1"
                            value={comp.userFactor || 1.0}
                            onChange={(e) => handleUpdateFactor(comp.id, parseFloat(e.target.value) || 1.0)}
                            className="w-16 p-1 text-center font-mono font-bold bg-white border border-slate-300 rounded text-slate-900 text-xs"
                          />
                          <span className="font-bold text-slate-600">x</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Add Custom Component Modal */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Add Custom Mapping Component</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomComponentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Component Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gravel Filter Media behind Wall, Expansion Joint"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl font-bold text-slate-800"
                  >
                    <option value="Earthwork">Earthwork</option>
                    <option value="Bedding">Bedding</option>
                    <option value="Concrete">Concrete</option>
                    <option value="Masonry">Masonry</option>
                    <option value="Finishing">Finishing</option>
                    <option value="Steel">Steel</option>
                    <option value="Drainage">Drainage</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Calculation Mode</label>
                  <select
                    value={customCalcFormula}
                    onChange={(e) => setCustomCalcFormula(e.target.value as ComponentCalcFormula)}
                    className="w-full p-2 border border-slate-300 rounded-xl font-bold text-slate-800"
                  >
                    <option value="custom_multiplier">Length × Height × Factor</option>
                    <option value="excavation_pit">Length × Width × Depth</option>
                    <option value="plaster_surface">Area Surface (sq.m)</option>
                    <option value="weep_hole_pvc">Weep Hole Length / Nos</option>
                    <option value="reinforcement_steel">Rebar Density (kg)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    placeholder="m3, sq.m, m, kg, nos"
                    className="w-full p-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">User Factor / Multiplier</label>
                  <input
                    type="number"
                    step="0.01"
                    value={customFactor}
                    onChange={(e) => setCustomFactor(parseFloat(e.target.value) || 1.0)}
                    className="w-full p-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Map to Project BOQ Item</label>
                <select
                  value={customMappedItemId}
                  onChange={(e) => setCustomMappedItemId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl font-semibold text-slate-800"
                >
                  <option value="">-- Optional: Link BOQ Item Later --</option>
                  {projectItems.map((it, idx) => (
                    <option key={it.id} value={it.id}>
                      #{idx + 1} ({it.code || 'BOQ'}) - {it.description.slice(0, 40)}... [{it.unit || 'm3'}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-sm flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Create Component</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
