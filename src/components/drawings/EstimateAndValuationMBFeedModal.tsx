import React, { useState } from 'react';
import {
  Layers,
  History,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Plus,
  RefreshCw,
  Eye,
  RotateCcw,
  Trash2,
  Sparkles,
  BookOpen,
  X,
  FileCheck,
  Calendar,
  UserCheck,
  ChevronRight,
  TrendingUp,
  Info,
  Sliders,
  DownloadCloud,
  Check,
  Maximize2
} from 'lucide-react';
import {
  ProjectEstimate,
  BOQItem,
  ValuationMBBook,
  ValuationMBRow,
  EstimateMBVersion
} from '../../types';
import {
  DrawingSectionDef,
  ProtectionWallComponentMapping,
  DrawingCategory
} from './types';
import {
  loadEstimateMBVersions,
  createEstimateMBSnapshot,
  deleteEstimateMBVersion,
  feedCADSectionsToValuationMB
} from '../../services/estimateMBVersioning';
import {
  calculateComponentMBValues,
  getDefaultComponentsForStructureVariant
} from '../../services/boqStructureMappingService';
import { currencyCode } from '../../services/currency';

interface EstimateAndValuationMBFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectEstimate;
  setProject: React.Dispatch<React.SetStateAction<ProjectEstimate>>;
  category: DrawingCategory;
  variantKey: string;
  variantTitle?: string;
  wallSections: DrawingSectionDef[];
  currentDrawingParams?: any;
  mapping: ProtectionWallComponentMapping;
  valuationBooks?: ValuationMBBook[];
  setValuationBooks?: React.Dispatch<React.SetStateAction<ValuationMBBook[]>>;
  valuationRows?: ValuationMBRow[];
  setValuationRows?: React.Dispatch<React.SetStateAction<ValuationMBRow[]>>;
  showToast: (msg: string) => void;
  onNavigateToTab?: (tab: string) => void;
  onLoadEstimateDrawing?: (version: EstimateMBVersion) => void;
  initialTab?: 'feed_estimate' | 'feed_valuation' | 'version_history';
}

export const EstimateAndValuationMBFeedModal: React.FC<EstimateAndValuationMBFeedModalProps> = ({
  isOpen,
  onClose,
  project,
  setProject,
  category,
  variantKey,
  variantTitle = 'Protection Wall Structure',
  wallSections,
  currentDrawingParams,
  mapping,
  valuationBooks = [],
  setValuationBooks,
  valuationRows = [],
  setValuationRows,
  showToast,
  onNavigateToTab,
  onLoadEstimateDrawing,
  initialTab = 'feed_estimate'
}) => {
  const [activeTab, setActiveTab] = useState<'feed_estimate' | 'feed_valuation' | 'version_history'>(initialTab);

  // Estimate MB Feed Form State
  const [versionTitle, setVersionTitle] = useState(() => `Estimate MB Snapshot (${variantTitle})`);
  const [versionNotes, setVersionNotes] = useState('Fed CAD Template drawing sections into Estimate MB');
  const [autoSnapshotEnabled, setAutoSnapshotEnabled] = useState(true);

  // Valuation MB Feed Form State
  const [selectedBookId, setSelectedBookId] = useState<string>(() => valuationBooks[0]?.id || '');
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>(() => wallSections.map((s) => s.id));
  const [valuationFeedMode, setValuationFeedMode] = useState<'append' | 'replace_book_category'>('append');
  const [verifiedBy, setVerifiedBy] = useState('Site Engineer');
  const [valuationDateBS, setValuationDateBS] = useState('2026-05-15');

  // New Valuation MB Modal state
  const [isCreatingNewBook, setIsCreatingNewBook] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookType, setNewBookType] = useState<'RUNNING_BILL' | 'FINAL_VALUATION'>('RUNNING_BILL');
  const [newBookIPC, setNewBookIPC] = useState<number>(() => (valuationBooks.length > 0 ? valuationBooks.length + 1 : 1));

  // Version History State
  const [savedVersions, setSavedVersions] = useState<EstimateMBVersion[]>(() => loadEstimateMBVersions(project.id));
  const [inspectingVersion, setInspectingVersion] = useState<EstimateMBVersion | null>(null);

  if (!isOpen) return null;

  // Compute live Estimate MB preview
  const wallItem = project.items.find((i) => i.id === mapping.wallItemId);
  const pccItem = project.items.find((i) => i.id === mapping.pccItemId);
  const solingItem = project.items.find((i) => i.id === mapping.solingItemId);
  const excItem = project.items.find((i) => i.id === mapping.excavationItemId);
  const formworkItem = project.items.find((i) => i.id === mapping.formworkItemId);

  const totalSectionsLength = wallSections.reduce((sum, s) => sum + (s.params.wallLength || 0), 0);

  // Handle Feed to Estimate MB (strictly feeds Estimate MB only)
  const handleConfirmFeedToEstimateMB = () => {
    // 1. Create automatic snapshot version first with full CAD parameter & section geometry
    if (autoSnapshotEnabled) {
      const snapshot = createEstimateMBSnapshot(project, {
        title: versionTitle.trim() || `Estimate MB Snapshot (${variantTitle})`,
        source: 'CAD_DRAWING_ESTIMATE',
        drawingCategory: category,
        variantKey: variantKey,
        variantName: variantTitle,
        sections: wallSections,
        drawingParams: currentDrawingParams || wallSections[0]?.params,
        mapping: mapping,
        notes: versionNotes
      });
      setSavedVersions((prev) => [snapshot, ...prev]);
    }

    // 2. Update Project Items with CAD multi-section MB rows (Estimate BOQ items only)
    setProject((prev) => {
      const compRowsMap = new Map<string, any[]>();
      let dynComps = mapping.dynamicComponents;
      if (!dynComps || dynComps.length === 0) {
        dynComps = getDefaultComponentsForStructureVariant(variantKey || 'plum_concrete', mapping);
      }

      dynComps.forEach((comp) => {
        const targetItemId = comp.mappedItemId || (comp as any).mappedBoqItemId;
        if (!targetItemId || comp.enabled === false) return;
        const rows = wallSections.map((sec) => {
          const val = calculateComponentMBValues(comp, sec);
          const chStr = sec.chainageStart && sec.chainageEnd ? `(Ch. ${sec.chainageStart} to ${sec.chainageEnd})` : '';
          return {
            id: `mb_sec_${sec.id}_${comp.id}`,
            particulars: `${sec.sectionCode} ${chStr}: ${comp.name} [${comp.unit}]`,
            no_of_units: val.no_of_units,
            length: parseFloat(val.length.toFixed(3)),
            breadth: parseFloat(val.breadth.toFixed(3)),
            height: parseFloat(val.height.toFixed(3)),
            quantity: parseFloat(val.quantity.toFixed(3)),
            remarks: `CAD Section ${sec.sectionCode}`
          };
        });
        compRowsMap.set(targetItemId, rows);
      });

      return {
        ...prev,
        items: prev.items.map((it) => {
          if (compRowsMap.has(it.id)) {
            const mbRows = compRowsMap.get(it.id)!;
            const newQty = parseFloat(mbRows.reduce((sum, r) => sum + r.quantity, 0).toFixed(3));
            const rate = it.calculated_unit_rate || it.user_rate || 0;
            return {
              ...it,
              estimated_quantity: newQty,
              total_amount: parseFloat((newQty * rate).toFixed(2)),
              mb_rows: mbRows
            };
          }
          return it;
        })
      };
    });

    showToast(`Successfully fed CAD sections to Estimate MB & saved Version Snapshot!`);
    onClose();
  };

  // Create new Valuation MB Book
  const handleCreateNewValuationBook = () => {
    if (!newBookTitle.trim()) return;
    const newBookId = `vmb_book_${project.id}_${Date.now()}`;
    const nextMBNum = `VMB-0${valuationBooks.length + 1}`;

    const newBook: ValuationMBBook = {
      id: newBookId,
      mb_number: nextMBNum,
      title: newBookTitle.trim(),
      bill_type: newBookType,
      ipc_number: newBookIPC,
      date_iso: valuationDateBS,
      verified_by: verifiedBy,
      created_at: new Date().toISOString()
    };

    const updatedBooks = [...valuationBooks, newBook];
    if (setValuationBooks) {
      setValuationBooks(updatedBooks);
    }
    try {
      localStorage.setItem(`uev_valuation_books_${project.id}`, JSON.stringify(updatedBooks));
    } catch (err) {
      console.error('Failed to save valuation books:', err);
    }

    setSelectedBookId(newBookId);
    setIsCreatingNewBook(false);
    setNewBookTitle('');
    showToast(`Created Measurement Book ${nextMBNum}: "${newBook.title}"`);
  };

  // Handle Feed to Valuation MB (strictly feeds Valuation MB only)
  const handleConfirmFeedToValuationMB = () => {
    if (!selectedBookId) {
      showToast('Please select or create a target Valuation Measurement Book.');
      return;
    }
    if (selectedSectionIds.length === 0) {
      showToast('Please select at least one drawing section to feed.');
      return;
    }

    const targetBook = valuationBooks.find((b) => b.id === selectedBookId);
    const targetBookTitle = targetBook ? `${targetBook.mb_number} - ${targetBook.title}` : 'Valuation MB';
    const ipcNum = targetBook?.ipc_number || 1;

    const result = feedCADSectionsToValuationMB({
      projectId: project.id,
      targetBookId: selectedBookId,
      targetBookTitle,
      ipcNumber: ipcNum,
      dateBS: valuationDateBS,
      verifiedBy,
      sections: wallSections,
      drawingCategory: category,
      variantKey,
      mapping,
      projectItems: project.items,
      existingValuationRows: valuationRows,
      selectedSectionIds,
      mode: valuationFeedMode
    });

    if (setValuationRows) {
      setValuationRows(result.updatedValuationRows);
    }

    showToast(`Fed ${result.addedRowsCount} site measurement rows into Valuation MB (${targetBookTitle})!`);
    onClose();
  };

  // Handle Restore Version into Active Estimate MB
  const handleRestoreVersion = (ver: EstimateMBVersion) => {
    if (!confirm(`Restore Estimate MB to "${ver.title}" (${ver.version_number})? This will replace current estimate MB rows with this snapshot's state.`)) {
      return;
    }

    setProject((prev) => ({
      ...prev,
      items: JSON.parse(JSON.stringify(ver.items_snapshot))
    }));

    showToast(`Restored Estimate MB to Version ${ver.version_number}!`);
    onClose();
  };

  // Handle Loading saved drawing into CAD Studio
  const handleLoadDrawingToCADStudio = (ver: EstimateMBVersion) => {
    if (onLoadEstimateDrawing) {
      onLoadEstimateDrawing(ver);
      showToast(`Loaded drawing sections from Estimate Version ${ver.version_number} into CAD Studio!`);
      onClose();
    }
  };

  // Handle Delete Version
  const handleDeleteVersion = (verId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this Estimate MB snapshot?')) return;
    const remaining = deleteEstimateMBVersion(project.id, verId);
    setSavedVersions(remaining);
    if (inspectingVersion?.id === verId) {
      setInspectingVersion(null);
    }
    showToast('Deleted Estimate MB snapshot.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-xl shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base">
                  CAD Drawing MB Feeder & Version Snapshots
                </h3>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-full uppercase">
                  {variantTitle}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Feed CAD cross-sections into either <b>Estimate MB</b> (Pre-Contract) or <b>Valuation MB</b> (Site Execution Running Bill).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection Bar: Strictly Mutually Exclusive Target Selection */}
        <div className="px-6 pt-3 pb-0 bg-slate-50/50 border-b border-slate-200 flex items-center gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => { setActiveTab('feed_estimate'); setInspectingVersion(null); }}
            className={`pb-3 px-4 text-xs font-extrabold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'feed_estimate'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck className="w-4 h-4 text-indigo-600" />
            <span>Target 1: Feed to Estimate MB (Pre-Contract)</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('feed_valuation'); setInspectingVersion(null); }}
            className={`pb-3 px-4 text-xs font-extrabold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'feed_valuation'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Target 2: Feed to Valuation MB (Running Bill)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('version_history')}
            className={`pb-3 px-4 text-xs font-extrabold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ml-auto ${
              activeTab === 'version_history'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4 text-purple-600" />
            <span>Estimate Drawing Snapshots & Versions ({savedVersions.length})</span>
          </button>
        </div>

        {/* Tab 1: Feed to Estimate MB */}
        {activeTab === 'feed_estimate' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Mutual Exclusivity Notice */}
            <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-3 text-xs text-indigo-950">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-indigo-900">
                  Target Destination: Pre-Contract Project Estimate MB
                </p>
                <p className="text-indigo-800 text-[11px] mt-0.5">
                  Feeding here updates the Detailed Measurement Sheet (MB) for approved BOQ items and saves an immutable <b>CAD Drawing Snapshot</b> containing exact geometry, section chainages, and dimensions so you can review or reload what the drawings were at estimate time.
                </p>
              </div>
            </div>

            {/* Version Snapshot Options */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSnapshotEnabled}
                    onChange={(e) => setAutoSnapshotEnabled(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span>Create Auto-Version Snapshot of Estimate MB & CAD Sections</span>
                </label>
                <span className="text-[10px] font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                  RECOMMENDED FOR AUDIT
                </span>
              </div>

              {autoSnapshotEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Snapshot Version Title
                    </label>
                    <input
                      type="text"
                      value={versionTitle}
                      onChange={(e) => setVersionTitle(e.target.value)}
                      placeholder="Estimate MB Baseline v1.0"
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Notes / Remarks
                    </label>
                    <input
                      type="text"
                      value={versionNotes}
                      onChange={(e) => setVersionNotes(e.target.value)}
                      placeholder="e.g., DPR approved drawing sections"
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Live Preview of CAD Multi-Sections that will be fed */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Drawing Sections to Feed into Estimate MB ({wallSections.length} Sections | Total Length: {totalSectionsLength}m)
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Wall Type: <b>{variantTitle}</b>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-700">
                  <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">Section Code</th>
                      <th className="px-3 py-2">Chainage / Title</th>
                      <th className="px-3 py-2 text-right">Length (L)</th>
                      <th className="px-3 py-2 text-right">Height (H)</th>
                      <th className="px-3 py-2 text-right">Top / Bot Width</th>
                      <th className="px-3 py-2 text-right">Wall Vol (m³)</th>
                      <th className="px-3 py-2 text-right">Bed PCC (m³)</th>
                      <th className="px-3 py-2 text-right">Soling</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {wallSections.map((sec) => {
                      const topW = sec.params.wallTopWidth || 0.6;
                      const botW = sec.params.wallBottomWidth || 1.5;
                      const avgW = (topW + botW) / 2;
                      const wallVol = avgW * sec.params.wallHeight * sec.params.wallLength;
                      const pccVol = sec.params.pccWidth * sec.params.pccThickness * sec.params.wallLength;
                      const solVol = sec.params.solingWidth * sec.params.solingThickness * sec.params.wallLength;

                      return (
                        <tr key={sec.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono font-bold text-indigo-700">
                            {sec.sectionCode}
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-900">
                            {sec.title || 'Protection Wall'}
                            {sec.chainageStart && sec.chainageEnd && (
                              <span className="text-[10px] text-slate-500 ml-1 font-mono">
                                ({sec.chainageStart} - {sec.chainageEnd})
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{sec.params.wallLength}m</td>
                          <td className="px-3 py-2 text-right font-mono">{sec.params.wallHeight}m</td>
                          <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-500">
                            {topW.toFixed(2)} / {botW.toFixed(2)}m
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                            {wallVol.toFixed(3)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-slate-600">
                            {pccVol.toFixed(3)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-slate-600">
                            {solVol.toFixed(3)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Target Mapped BOQ Items Summary */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Target Estimate BOQ Items Receiving Rows
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase block">1. Wall Structure</span>
                  <span className="font-medium text-slate-800 truncate block">
                    {wallItem ? wallItem.description : '⚠️ No Mapped BOQ Item'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Item Code: {wallItem?.code || 'WALL'}</span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase block">2. Bed PCC Concrete</span>
                  <span className="font-medium text-slate-800 truncate block">
                    {pccItem ? pccItem.description : '⚠️ No Mapped BOQ Item'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Item Code: {pccItem?.code || 'PCC'}</span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase block">3. Soling Bedding</span>
                  <span className="font-medium text-slate-800 truncate block">
                    {solingItem ? solingItem.description : '⚠️ No Mapped BOQ Item'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Item Code: {solingItem?.code || 'SOL'}</span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase block">4. Foundation Excavation</span>
                  <span className="font-medium text-slate-800 truncate block">
                    {excItem ? excItem.description : '⚠️ No Mapped BOQ Item'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Item Code: {excItem?.code || 'EXC'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Feed to Valuation MB */}
        {activeTab === 'feed_valuation' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Valuation Isolation Notice */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-xs text-emerald-950">
              <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-900">
                  Target Destination: Post-Contract Valuation Measurement Book (Site Running Bill)
                </p>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  Feeding here generates official site measurement records (Quantity This Bill) inside the selected contractor Measurement Book. It <b>will not modify or overwrite</b> the original Estimate MB.
                </p>
              </div>
            </div>

            {/* Target Book Selection */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Target Valuation Measurement Book
                </label>
                <button
                  type="button"
                  onClick={() => setIsCreatingNewBook(!isCreatingNewBook)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isCreatingNewBook ? 'Select Existing Book' : 'Create New Running Bill Book'}</span>
                </button>
              </div>

              {!isCreatingNewBook ? (
                <div>
                  {valuationBooks.length === 0 ? (
                    <div className="p-4 text-center bg-white rounded-lg border border-dashed border-slate-300">
                      <p className="text-xs font-bold text-slate-600">No Valuation Books created yet.</p>
                      <button
                        type="button"
                        onClick={() => setIsCreatingNewBook(true)}
                        className="mt-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                      >
                        Create First Running Bill Book
                      </button>
                    </div>
                  ) : (
                    <select
                      value={selectedBookId}
                      onChange={(e) => setSelectedBookId(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    >
                      {valuationBooks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.mb_number} - {b.title} (IPC #{b.ipc_number || 1} | {b.bill_type})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className="p-3.5 bg-white border border-emerald-200 rounded-lg space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Book Title / Running Bill Description
                      </label>
                      <input
                        type="text"
                        value={newBookTitle}
                        onChange={(e) => setNewBookTitle(e.target.value)}
                        placeholder="e.g. Running Bill 01 - Foundation & Protection Wall"
                        className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        IPC Bill Number
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={newBookIPC}
                        onChange={(e) => setNewBookIPC(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewBook(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateNewValuationBook}
                      disabled={!newBookTitle.trim()}
                      className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold disabled:opacity-50"
                    >
                      Save & Select Book
                    </button>
                  </div>
                </div>
              )}

              {/* Feed Mode & Verification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Feed Mode for this Book
                  </label>
                  <select
                    value={valuationFeedMode}
                    onChange={(e) => setValuationFeedMode(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="append">Append Rows to existing book measurements</option>
                    <option value="replace_book_category">Replace previous CAD rows in this book</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Verified By / Site In-charge
                  </label>
                  <input
                    type="text"
                    value={verifiedBy}
                    onChange={(e) => setVerifiedBy(e.target.value)}
                    placeholder="Site Engineer"
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Select Sections to Feed */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Select Executed Sections to Feed into Valuation MB
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSectionIds(wallSections.map((s) => s.id))}
                    className="text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    Select All ({wallSections.length})
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSectionIds([])}
                    className="text-[11px] font-bold text-slate-500 hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                {wallSections.map((sec) => {
                  const isChecked = selectedSectionIds.includes(sec.id);
                  const topW = sec.params.wallTopWidth || 0.6;
                  const botW = sec.params.wallBottomWidth || 1.5;
                  const avgW = (topW + botW) / 2;
                  const wallVol = avgW * sec.params.wallHeight * sec.params.wallLength;
                  return (
                    <label
                      key={sec.id}
                      className={`p-3 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                        isChecked ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-slate-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSectionIds((p) => [...p, sec.id]);
                            } else {
                              setSelectedSectionIds((p) => p.filter((id) => id !== sec.id));
                            }
                          }}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-mono text-[10px]">
                              {sec.sectionCode}
                            </span>
                            <span>{sec.title || 'Protection Wall Section'}</span>
                            {sec.chainageStart && sec.chainageEnd && (
                              <span className="text-[11px] text-slate-500 font-mono">
                                (Ch. {sec.chainageStart} to {sec.chainageEnd})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            Length: <b>{sec.params.wallLength}m</b> | Height: <b>{sec.params.wallHeight}m</b> | Avg W: <b>{avgW.toFixed(2)}m</b>
                          </div>
                        </div>
                      </div>
                      <div className="text-right font-mono font-bold text-emerald-900">
                        {wallVol.toFixed(3)} m³
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Estimate Drawing Snapshots & Version History */}
        {activeTab === 'version_history' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">
                  Estimate MB Versions & Saved CAD Drawing Snapshots
                </h4>
                <p className="text-xs text-slate-500">
                  Every time you feed CAD drawings to the Estimate MB, an immutable snapshot of all drawing sections, dimensions, and BOQ items is preserved for audit and historical recall.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const snap = createEstimateMBSnapshot(project, {
                    title: `Manual Snapshot (${new Date().toLocaleTimeString()})`,
                    source: 'MANUAL_MB',
                    drawingCategory: category,
                    variantKey: variantKey,
                    variantName: variantTitle,
                    sections: wallSections,
                    drawingParams: currentDrawingParams || wallSections[0]?.params,
                    mapping: mapping,
                    notes: 'User manually created Estimate MB snapshot'
                  });
                  setSavedVersions(loadEstimateMBVersions(project.id));
                  showToast(`Created manual Estimate MB version ${snap.version_number}!`);
                }}
                className="px-3 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Manual Snapshot</span>
              </button>
            </div>

            {savedVersions.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                <History className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No Estimate MB versions saved yet.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Feed drawing sections in Target 1 above to create your initial version snapshot.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedVersions.map((ver) => {
                  const hasDrawingSections = (ver.saved_drawing_sections && ver.saved_drawing_sections.length > 0) || (ver.sections_summary && ver.sections_summary.length > 0);

                  return (
                    <div
                      key={ver.id}
                      className="p-4 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl shadow-xs space-y-3 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-mono font-extrabold text-xs rounded-md">
                            {ver.version_number}
                          </span>
                          <h5 className="font-bold text-xs text-slate-900">
                            {ver.title}
                          </h5>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(ver.created_at).toLocaleString()}
                          </span>
                          {ver.source === 'CAD_DRAWING_ESTIMATE' && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-full">
                              CAD Drawing Snapshot
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {hasDrawingSections && (
                            <button
                              type="button"
                              onClick={() => setInspectingVersion(ver)}
                              className="px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg flex items-center gap-1"
                              title="Inspect drawing sections & parameters at the time of estimate"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Inspect CAD Sections</span>
                            </button>
                          )}

                          {onLoadEstimateDrawing && ver.saved_drawing_sections && (
                            <button
                              type="button"
                              onClick={() => handleLoadDrawingToCADStudio(ver)}
                              className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1"
                              title="Load this exact drawing back into the CAD canvas"
                            >
                              <DownloadCloud className="w-3 h-3" />
                              <span>Load in CAD Studio</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRestoreVersion(ver)}
                            className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-1"
                            title="Restore this version into active Estimate MB"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore BOQ</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteVersion(ver.id, e)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete snapshot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg font-medium flex-wrap">
                        <span>Total Items: <b>{ver.total_items_count}</b></span>
                        <span>Total Amount: <b>{currencyCode()} {ver.total_estimate_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b></span>
                        {ver.variant_name && <span>Variant: <b>{ver.variant_name}</b></span>}
                        {ver.saved_drawing_sections && <span>CAD Sections Saved: <b>{ver.saved_drawing_sections.length}</b></span>}
                      </div>

                      {ver.notes && (
                        <p className="text-[11px] text-slate-500 italic">
                          {ver.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CAD Drawing Snapshot Inspector Sub-Modal */}
        {inspectingVersion && (
          <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3.5 bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-purple-300" />
                  <h4 className="font-extrabold text-sm">
                    CAD Drawing Sections at Estimate: {inspectingVersion.version_number} ({inspectingVersion.title})
                  </h4>
                </div>
                <button
                  onClick={() => setInspectingVersion(null)}
                  className="p-1 text-purple-200 hover:text-white rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-950">Captured at: {new Date(inspectingVersion.created_at).toLocaleString()}</span>
                    <span className="font-mono text-purple-700 font-bold">Category: {inspectingVersion.variant_name || inspectingVersion.drawing_category}</span>
                  </div>
                  <p className="text-purple-800 text-[11px]">
                    Below are the exact geometric sections and structural dimensions that were fed into the project estimate measurement sheet.
                  </p>
                </div>

                {/* Table of Saved Sections */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-bold text-xs text-slate-800">
                    Saved Sections Breakdown
                  </div>
                  <table className="w-full text-xs text-left text-slate-700">
                    <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Section</th>
                        <th className="px-3 py-2">Chainage</th>
                        <th className="px-3 py-2 text-right">Length (L)</th>
                        <th className="px-3 py-2 text-right">Height (H)</th>
                        <th className="px-3 py-2 text-right">Top / Bot Width</th>
                        <th className="px-3 py-2 text-right">Avg Width</th>
                        <th className="px-3 py-2 text-right">Volume (m³)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(inspectingVersion.saved_drawing_sections || inspectingVersion.sections_summary || []).map((sec: any, idx: number) => {
                        const secCode = sec.sectionCode || `SEC ${idx + 1}`;
                        const length = sec.params?.wallLength ?? sec.length ?? 0;
                        const height = sec.params?.wallHeight ?? sec.height ?? 0;
                        const topW = sec.params?.wallTopWidth ?? sec.width ?? 0.6;
                        const botW = sec.params?.wallBottomWidth ?? sec.width ?? 1.5;
                        const avgW = (topW + botW) / 2;
                        const vol = length * avgW * height;

                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono font-bold text-purple-700">{secCode}</td>
                            <td className="px-3 py-2 font-mono text-[11px] text-slate-600">
                              {sec.chainageStart && sec.chainageEnd ? `${sec.chainageStart} to ${sec.chainageEnd}` : 'Standard'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">{length}m</td>
                            <td className="px-3 py-2 text-right font-mono">{height}m</td>
                            <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-500">{topW.toFixed(2)} / {botW.toFixed(2)}m</td>
                            <td className="px-3 py-2 text-right font-mono font-semibold">{avgW.toFixed(2)}m</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">{vol.toFixed(3)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Parameter Baseline Breakdown */}
                {inspectingVersion.saved_drawing_params && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                      Sub-Structure & Auxiliary Parameters
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-slate-500 block">Bed PCC Width:</span>
                        <span className="font-bold text-slate-900">{inspectingVersion.saved_drawing_params.pccWidth || 1.8} m</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-slate-500 block">Bed PCC Thickness:</span>
                        <span className="font-bold text-slate-900">{inspectingVersion.saved_drawing_params.pccThickness || 0.15} m</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-slate-500 block">Soling Thickness:</span>
                        <span className="font-bold text-slate-900">{inspectingVersion.saved_drawing_params.solingThickness || 0.15} m</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-slate-500 block">Excavation Depth:</span>
                        <span className="font-bold text-slate-900">{inspectingVersion.saved_drawing_params.excavationDepth || 1.2} m</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setInspectingVersion(null)}
                  className="px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg"
                >
                  Back to Version List
                </button>

                <div className="flex items-center gap-2">
                  {onLoadEstimateDrawing && inspectingVersion.saved_drawing_sections && (
                    <button
                      type="button"
                      onClick={() => handleLoadDrawingToCADStudio(inspectingVersion)}
                      className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs"
                    >
                      <DownloadCloud className="w-3.5 h-3.5" />
                      <span>Load into CAD Studio</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRestoreVersion(inspectingVersion)}
                    className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore BOQ Items</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {activeTab === 'feed_estimate' && (
              <span>Target: <b className="text-indigo-700">Estimate MB (Approved BOQ)</b> with Auto-Version Snapshot</span>
            )}
            {activeTab === 'feed_valuation' && (
              <span>Target: <b className="text-emerald-700">Valuation MB ({selectedSectionIds.length} sections selected)</b></span>
            )}
            {activeTab === 'version_history' && (
              <span>{savedVersions.length} version snapshot(s) stored</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>

            {activeTab === 'feed_estimate' && (
              <button
                type="button"
                onClick={handleConfirmFeedToEstimateMB}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm flex items-center gap-2 transition-all hover:shadow-md"
              >
                <FileCheck className="w-4 h-4" />
                <span>Save Snapshot & Feed to Estimate MB</span>
              </button>
            )}

            {activeTab === 'feed_valuation' && (
              <button
                type="button"
                onClick={handleConfirmFeedToValuationMB}
                disabled={selectedSectionIds.length === 0 || !selectedBookId}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl shadow-sm flex items-center gap-2 transition-all hover:shadow-md"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Feed {selectedSectionIds.length} Section(s) to Valuation MB</span>
              </button>
            )}

            {activeTab === 'version_history' && (
              <button
                type="button"
                onClick={() => setActiveTab('feed_estimate')}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl"
              >
                Back to Feed
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
