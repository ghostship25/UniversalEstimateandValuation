import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Search,
  ArrowRight,
  ArrowLeft,
  Download,
  Layers,
  Sparkles,
  Info,
  Check,
  Filter,
  DollarSign,
  Eye,
  Boxes,
  RefreshCw,
  Trash2,
  Sliders,
  ChevronRight
} from 'lucide-react';
import {
  RateNormItem,
  ResourceMaster,
  ZoneInfo,
  ProjectEstimate,
  BOQItem,
  MBRow
} from '../types';
import {
  BUILDING_NORMS,
  ROAD_NORMS,
  DWRI_IRRIGATION_NORMS,
  CUSTOM_NORMS_CATALOG
} from '../data/departmentNormsCatalog';
import {
  ImportedExcelRow,
  ColumnMappingConfig,
  MappedBOQItemDraft,
  autoDetectColumns,
  extractItemsFromSheet,
  matchItemWithNorms,
  calculateDraftItemRates,
  canonicalUnit,
  areUnitsCompatible,
  downloadSampleBOQExcelTemplate
} from '../services/boqExcelService';
import { currencyCode } from '../services/currency';

interface BOQExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectEstimate;
  setProject: React.Dispatch<React.SetStateAction<ProjectEstimate>>;
  norms: RateNormItem[];
  setNorms?: React.Dispatch<React.SetStateAction<RateNormItem[]>>;
  resources: ResourceMaster[];
  selectedZone: ZoneInfo;
  selectedFY: string;
  showToast: (msg: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

type WizardStep = 'upload' | 'columns' | 'mapping' | 'complete';

export const BOQExcelImportModal: React.FC<BOQExcelImportModalProps> = ({
  isOpen,
  onClose,
  project,
  setProject,
  norms,
  setNorms,
  resources,
  selectedZone,
  selectedFY,
  showToast,
  onNavigateToTab
}) => {
  // Wizard Step State
  const [step, setStep] = useState<WizardStep>('upload');

  // File & Workbook State
  const [file, setFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState<string>('');
  const [rawSheetData, setRawSheetData] = useState<any[][]>([]);
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Column Mapping Configuration
  const [columnConfig, setColumnConfig] = useState<ColumnMappingConfig>({
    headerRowIndex: 0,
    itemNoCol: 0,
    descriptionCol: 1,
    unitCol: 2,
    quantityCol: 3,
    rateCol: 4,
    chapterCol: 5
  });

  // Draft items mapped with norms
  const [draftItems, setDraftItems] = useState<MappedBOQItemDraft[]>([]);

  // Global Import Settings
  const [rateMode, setRateMode] = useState<'user' | 'contractor'>(project.rate_mode || 'user');
  const [importStrategy, setImportStrategy] = useState<'append' | 'replace'>('append');
  const [defaultChapter, setDefaultChapter] = useState<string>('General Civil Works');

  // Filter & Search in Review Workspace
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [matchFilter, setMatchFilter] = useState<'ALL' | 'MAPPED' | 'UNMAPPED' | 'HIGH' | 'MODERATE'>('ALL');

  // Modal / Popover States for Norm Picker & Resource Inspector
  const [inspectingDraft, setInspectingDraft] = useState<MappedBOQItemDraft | null>(null);
  const [pickerTargetDraftId, setPickerTargetDraftId] = useState<string | null>(null);
  const [normPickerSearch, setNormPickerSearch] = useState<string>('');
  const [normPickerDept, setNormPickerDept] = useState<string>('ALL');

  // Drag & drop state
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Consolidated Master Norms Catalog (including app norms + all department catalogs)
  const allAvailableNorms = useMemo(() => {
    const list: RateNormItem[] = [];
    const seenCodes = new Set<string>();

    const addNorms = (items: RateNormItem[]) => {
      items.forEach((item) => {
        const key = `${item.code}_${item.item_id}`;
        if (!seenCodes.has(key)) {
          seenCodes.add(key);
          list.push(item);
        }
      });
    };

    addNorms(norms);
    addNorms(BUILDING_NORMS);
    addNorms(ROAD_NORMS);
    addNorms(DWRI_IRRIGATION_NORMS);
    addNorms(CUSTOM_NORMS_CATALOG);

    return list;
  }, [norms]);

  // Handle File Upload & Excel Parsing
  const processUploadedFile = (uploadedFile: File) => {
    setIsParsingFile(true);
    setParseError(null);
    setFile(uploadedFile);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('Workbook contains no worksheets.');
        }

        const sheets = workbook.SheetNames;
        setSheetNames(sheets);

        // Pick first sheet or sheet with "boq" or "estimate" in name
        const preferredSheet =
          sheets.find((s) => s.toLowerCase().includes('boq') || s.toLowerCase().includes('estimate')) ||
          sheets[0];

        setSelectedSheetName(preferredSheet);
        const worksheet = workbook.Sheets[preferredSheet];
        const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rawJson || rawJson.length === 0) {
          throw new Error('Selected worksheet is completely empty.');
        }

        setRawSheetData(rawJson);

        // Auto-detect columns
        const detected = autoDetectColumns(rawJson);
        setColumnConfig(detected);

        setIsParsingFile(false);
        setStep('columns');
      } catch (err: any) {
        setIsParsingFile(false);
        setParseError(err.message || 'Failed to read spreadsheet.');
      }
    };

    reader.onerror = () => {
      setIsParsingFile(false);
      setParseError('Failed to read file.');
    };

    reader.readAsArrayBuffer(uploadedFile);
  };

  // Switch Sheet in Workbook
  const handleSelectSheet = (sheetName: string) => {
    if (!file) return;
    setSelectedSheetName(sheetName);
    setIsParsingFile(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        setRawSheetData(rawJson);

        const detected = autoDetectColumns(rawJson);
        setColumnConfig(detected);
        setIsParsingFile(false);
      } catch (err: any) {
        setIsParsingFile(false);
        setParseError(err.message || 'Failed to read sheet.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Convert raw rows into draft items mapped with system norms
  const handleGenerateNormsMapping = () => {
    const rawItems = extractItemsFromSheet(rawSheetData, columnConfig);

    if (rawItems.length === 0) {
      alert('No valid work items found in the worksheet with current column mappings. Please verify columns.');
      return;
    }

    const overheadPct = project.contractor_overhead_percent || 15;
    const taxPct = project.tax_percent ?? 0;

    const drafts: MappedBOQItemDraft[] = rawItems.map((rawItem, idx) => {
      const match = matchItemWithNorms(rawItem, allAvailableNorms);
      const rates = calculateDraftItemRates(
        match.norm,
        rawItem.rawQuantity,
        resources,
        selectedZone,
        selectedFY,
        rateMode,
        overheadPct,
        taxPct
      );

      const hasExcelRate = typeof rawItem.rawRate === 'number' && rawItem.rawRate > 0;
      const rateSource: 'SYSTEM_ANALYZED' | 'EXCEL_RATE' =
        hasExcelRate && !match.norm ? 'EXCEL_RATE' : 'SYSTEM_ANALYZED';

      const effectiveRate =
        rateSource === 'EXCEL_RATE' && hasExcelRate ? rawItem.rawRate! : rates.analyzedRate;

      return {
        id: `draft_${Date.now()}_${idx}`,
        selected: true,
        excelRow: rawItem,
        mappedNorm: match.norm,
        matchConfidence: match.confidence,
        matchType: match.matchType,
        matchReason: match.reason,
        editedQuantity: rawItem.rawQuantity,
        editedUnit: match.norm?.base_unit || rawItem.rawUnit,
        rateSource,
        analyzedRate: rates.analyzedRate,
        userRate: rates.userRate,
        contractorRate: rates.contractorRate,
        effectiveRate,
        totalAmount: Math.round(rawItem.rawQuantity * effectiveRate * 100) / 100,
        assignedChapter: rawItem.rawChapter || defaultChapter,
        resourcePreview: rates.resourcePreview
      };
    });

    setDraftItems(drafts);
    setStep('mapping');
  };

  // Recalculate draft when user changes mapped norm or quantity or rate source
  const updateDraftItem = (draftId: string, updates: Partial<MappedBOQItemDraft>) => {
    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== draftId) return item;

        const updated = { ...item, ...updates };

        // If mapped norm changed, recalculate analyzed rates and resource preview
        if (updates.mappedNorm !== undefined) {
          const rates = calculateDraftItemRates(
            updates.mappedNorm,
            updated.editedQuantity,
            resources,
            selectedZone,
            selectedFY,
            rateMode,
            project.contractor_overhead_percent || 15,
            project.tax_percent ?? 0
          );

          updated.analyzedRate = rates.analyzedRate;
          updated.userRate = rates.userRate;
          updated.contractorRate = rates.contractorRate;
          updated.resourcePreview = rates.resourcePreview;
          if (updates.mappedNorm) {
            updated.editedUnit = updates.mappedNorm.base_unit;
            updated.matchType = 'MANUAL';
            updated.matchConfidence = 100;
            updated.matchReason = 'Manually Assigned by User';
          }
        }

        // If quantity changed, update resource preview scale
        if (updates.editedQuantity !== undefined && updated.mappedNorm) {
          const rates = calculateDraftItemRates(
            updated.mappedNorm,
            updates.editedQuantity,
            resources,
            selectedZone,
            selectedFY,
            rateMode,
            project.contractor_overhead_percent || 15,
            project.tax_percent ?? 0
          );
          updated.resourcePreview = rates.resourcePreview;
        }

        // Determine effective rate
        if (updated.rateSource === 'EXCEL_RATE' && typeof updated.excelRow.rawRate === 'number') {
          updated.effectiveRate = updated.excelRow.rawRate;
        } else {
          updated.effectiveRate = updated.analyzedRate;
        }

        updated.totalAmount = Math.round(updated.editedQuantity * updated.effectiveRate * 100) / 100;

        return updated;
      })
    );
  };

  // Re-run matching for all items
  const handleAutoMatchAll = () => {
    setDraftItems((prev) =>
      prev.map((item) => {
        const match = matchItemWithNorms(item.excelRow, allAvailableNorms);
        const rates = calculateDraftItemRates(
          match.norm,
          item.editedQuantity,
          resources,
          selectedZone,
          selectedFY,
          rateMode,
          project.contractor_overhead_percent || 15,
          project.tax_percent ?? 0
        );

        const rateSource = item.rateSource;
        const effectiveRate =
          rateSource === 'EXCEL_RATE' && typeof item.excelRow.rawRate === 'number'
            ? item.excelRow.rawRate
            : rates.analyzedRate;

        return {
          ...item,
          mappedNorm: match.norm,
          matchConfidence: match.confidence,
          matchType: match.matchType,
          matchReason: match.reason,
          editedUnit: match.norm?.base_unit || item.excelRow.rawUnit,
          analyzedRate: rates.analyzedRate,
          userRate: rates.userRate,
          contractorRate: rates.contractorRate,
          effectiveRate,
          totalAmount: Math.round(item.editedQuantity * effectiveRate * 100) / 100,
          resourcePreview: rates.resourcePreview
        };
      })
    );
    showToast('Re-analyzed all items against the system norms catalog.');
  };

  // Toggle all items selection
  const handleToggleSelectAll = (select: boolean) => {
    setDraftItems((prev) => prev.map((it) => ({ ...it, selected: select })));
  };

  // Filtered draft items
  const filteredDraftItems = useMemo(() => {
    return draftItems.filter((item) => {
      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = item.excelRow.rawDescription.toLowerCase().includes(q);
        const codeMatch = item.excelRow.rawItemNo.toLowerCase().includes(q);
        const normMatch =
          item.mappedNorm &&
          (item.mappedNorm.code.toLowerCase().includes(q) ||
            item.mappedNorm.description.toLowerCase().includes(q));
        if (!descMatch && !codeMatch && !normMatch) return false;
      }

      // Match Status Filter
      if (matchFilter === 'MAPPED') return !!item.mappedNorm;
      if (matchFilter === 'UNMAPPED') return !item.mappedNorm;
      if (matchFilter === 'HIGH') return item.matchConfidence >= 75;
      if (matchFilter === 'MODERATE') return item.matchConfidence >= 40 && item.matchConfidence < 75;

      return true;
    });
  }, [draftItems, searchQuery, matchFilter]);

  // Statistics Summary
  const stats = useMemo(() => {
    const total = draftItems.length;
    const selected = draftItems.filter((d) => d.selected);
    const mapped = draftItems.filter((d) => !!d.mappedNorm);
    const unmapped = draftItems.filter((d) => !d.mappedNorm);

    const projectedSubtotal = selected.reduce((sum, d) => sum + d.totalAmount, 0);
    const excelSubtotal = selected.reduce((sum, d) => sum + (d.excelRow.rawAmount || 0), 0);

    return {
      total,
      selectedCount: selected.length,
      mappedCount: mapped.length,
      unmappedCount: unmapped.length,
      projectedSubtotal,
      excelSubtotal
    };
  }, [draftItems]);

  // Confirm Import & Inject into Project Items
  const handleConfirmImport = () => {
    const selectedDrafts = draftItems.filter((d) => d.selected);

    if (selectedDrafts.length === 0) {
      alert('Please select at least one item to import.');
      return;
    }

    // 1. Ensure any newly mapped catalog norm is in the active norms array
    const newlyAddedNorms: RateNormItem[] = [];
    selectedDrafts.forEach((draft) => {
      if (draft.mappedNorm) {
        const normExists = norms.some(
          (n) => n.item_id === draft.mappedNorm!.item_id || n.code === draft.mappedNorm!.code
        );
        if (!normExists) {
          const alreadyQueued = newlyAddedNorms.some(
            (n) => n.item_id === draft.mappedNorm!.item_id || n.code === draft.mappedNorm!.code
          );
          if (!alreadyQueued) {
            newlyAddedNorms.push(draft.mappedNorm);
          }
        }
      }
    });

    if (newlyAddedNorms.length > 0 && setNorms) {
      setNorms((prev) => [...prev, ...newlyAddedNorms]);
    }

    // 2. Build BOQItem list
    const newBOQItems: BOQItem[] = selectedDrafts.map((draft, idx) => {
      const norm = draft.mappedNorm;
      const itemId = norm ? norm.item_id : 90000 + idx + Math.floor(Math.random() * 1000);
      const itemCode = norm ? norm.code : draft.excelRow.rawItemNo || `IMP-${idx + 1}`;
      const description = draft.excelRow.rawDescription;
      const unit = draft.editedUnit || norm?.base_unit || draft.excelRow.rawUnit;
      const qty = Number(draft.editedQuantity) || 0;
      const calcRate = draft.analyzedRate;
      const userRate = draft.userRate || draft.effectiveRate;
      const contractorRate = draft.contractorRate || draft.effectiveRate;
      const activeRate = draft.effectiveRate;

      // Create an initial Measurement Book row so this item has full measurement support
      const initialMBRow: MBRow = {
        id: `mb_imp_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}`,
        particulars: 'Quantity from Imported BOQ Abstract',
        no_of_units: 1,
        length: qty,
        breadth: 1,
        height: 1,
        quantity: qty,
        remarks: 'Imported from Excel Abstract'
      };

      return {
        id: `boq_imp_${Date.now()}_${idx}`,
        item_id: itemId,
        item_code: itemCode,
        description,
        unit,
        estimated_quantity: qty,
        calculated_unit_rate: calcRate,
        user_rate: userRate,
        contractor_rate: contractorRate,
        mode: rateMode,
        total_amount: Math.round(qty * activeRate * 100) / 100,
        chapter: draft.assignedChapter || defaultChapter,
        mb_rows: [initialMBRow]
      };
    });

    // 3. Update project items
    setProject((prev) => {
      const updatedItems =
        importStrategy === 'replace' ? newBOQItems : [...prev.items, ...newBOQItems];

      return {
        ...prev,
        rate_mode: rateMode,
        items: updatedItems,
        updated_at: new Date().toISOString()
      };
    });

    showToast(
      `Successfully imported ${newBOQItems.length} items from Excel! Rates & resource breakdown generated.`
    );
    setStep('complete');
  };

  // Filtered norms for the in-modal norm picker
  const filteredPickerNorms = useMemo(() => {
    return allAvailableNorms.filter((n) => {
      if (normPickerDept !== 'ALL') {
        if (normPickerDept === 'BLD' && !n.source.includes('BLD') && !n.source.includes('Building'))
          return false;
        if (normPickerDept === 'RDS' && !n.source.includes('RDS') && !n.source.includes('Road'))
          return false;
        if (normPickerDept === 'WRS' && !n.source.includes('WRS') && !n.source.includes('Irrigation'))
          return false;
        if (normPickerDept === 'CUSTOM' && !n.source.includes('Custom')) return false;
      }

      if (normPickerSearch.trim()) {
        const q = normPickerSearch.toLowerCase();
        const codeMatch = n.code.toLowerCase().includes(q);
        const descMatch = n.description.toLowerCase().includes(q);
        const unitMatch = n.base_unit.toLowerCase().includes(q);
        return codeMatch || descMatch || unitMatch;
      }

      return true;
    });
  }, [allAvailableNorms, normPickerSearch, normPickerDept]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-6xl max-h-[94vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                  Import BOQ Excel & Map with System Norms
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                  {selectedZone.name_en} ({selectedFY})
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Upload your external BOQ/Estimate spreadsheet, map items to official norms, and generate rates & resource quantities.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={downloadSampleBOQExcelTemplate}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition border border-white/20"
              title="Download clean sample BOQ Excel template"
            >
              <Download className="w-3.5 h-3.5 text-amber-300" />
              <span>Sample Template</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Wizard Stepper */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center space-x-4 sm:space-x-8">
            <button
              onClick={() => step !== 'complete' && setStep('upload')}
              disabled={step === 'complete'}
              className={`flex items-center space-x-2 ${
                step === 'upload'
                  ? 'text-blue-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === 'upload' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                1
              </span>
              <span>1. Upload File</span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />

            <button
              onClick={() => rawSheetData.length > 0 && step !== 'complete' && setStep('columns')}
              disabled={rawSheetData.length === 0 || step === 'complete'}
              className={`flex items-center space-x-2 ${
                step === 'columns'
                  ? 'text-blue-600 font-bold'
                  : rawSheetData.length > 0
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === 'columns' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                2
              </span>
              <span>2. Verify Columns</span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />

            <button
              onClick={() => draftItems.length > 0 && step !== 'complete' && setStep('mapping')}
              disabled={draftItems.length === 0 || step === 'complete'}
              className={`flex items-center space-x-2 ${
                step === 'mapping'
                  ? 'text-blue-600 font-bold'
                  : draftItems.length > 0
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === 'mapping' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                3
              </span>
              <span>3. Norms Mapping & Rates</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-slate-500 text-[11px]">
            <Info className="w-3.5 h-3.5 text-indigo-500" />
            <span>Maps external items to Building, Road, Water Resources and Custom Norms</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-100/50">
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="max-w-2xl mx-auto space-y-6 py-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const files = e.dataTransfer.files;
                  if (files && files[0]) {
                    processUploadedFile(files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition cursor-pointer ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files[0]) {
                      processUploadedFile(files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto text-blue-600 mb-4 shadow-xs">
                  <Upload className="w-8 h-8" />
                </div>

                <h3 className="text-base font-bold text-slate-800">
                  Select or Drag & Drop your BOQ / Estimate File
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Supports Microsoft Excel (.xlsx, .xls) and CSV spreadsheet files
                </p>

                <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow hover:bg-blue-700 transition">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Choose Spreadsheet File</span>
                </div>

                <div className="mt-4 text-[11px] text-slate-400">
                  Works with files from MS Excel, Google Sheets, LibreOffice, or other estimation software
                </div>
              </div>

              {parseError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Error reading file:</span> {parseError}
                  </div>
                </div>
              )}

              {/* Sample Template & Help Box */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      Need a formatted Excel template?
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Download our pre-structured BOQ template with sample civil works items (brickwork, PCC, RCC, rebar).
                    </p>
                  </div>
                </div>
                <button
                  onClick={downloadSampleBOQExcelTemplate}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-300" />
                  <span>Download Sample (.xlsx)</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: VERIFY COLUMNS */}
          {step === 'columns' && (
            <div className="space-y-5 max-w-4xl mx-auto">
              {/* Sheet & Header Selection Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Spreadsheet Configuration & Column Mapping
                    </h3>
                    <p className="text-xs text-slate-500">
                      Confirm which columns in your spreadsheet represent Item Code, Description, Unit, and Quantity.
                    </p>
                  </div>

                  {sheetNames.length > 1 && (
                    <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
                      <span className="text-xs text-slate-600 font-semibold">Active Sheet:</span>
                      <select
                        value={selectedSheetName}
                        onChange={(e) => handleSelectSheet(e.target.value)}
                        className="text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
                      >
                        {sheetNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Header Row Index Selector */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-semibold text-slate-700">Header Row (0-indexed):</span>
                  <input
                    type="number"
                    min={0}
                    max={Math.min(rawSheetData.length - 1, 20)}
                    value={columnConfig.headerRowIndex}
                    onChange={(e) => {
                      const idx = Math.max(0, parseInt(e.target.value) || 0);
                      setColumnConfig((prev) => ({ ...prev, headerRowIndex: idx }));
                    }}
                    className="w-16 px-2 py-1 border border-slate-300 rounded-md font-mono text-center font-bold"
                  />
                  <span className="text-slate-400 text-[11px]">
                    (Row {columnConfig.headerRowIndex + 1} will be used for column titles)
                  </span>
                </div>

                {/* Column Dropdowns Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
                  {/* Item No / Code */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Item No / Code</label>
                    <select
                      value={columnConfig.itemNoCol}
                      onChange={(e) =>
                        setColumnConfig((prev) => ({ ...prev, itemNoCol: parseInt(e.target.value) }))
                      }
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5 focus:ring-1 focus:ring-blue-500 font-medium"
                    >
                      <option value={-1}>-- None --</option>
                      {(rawSheetData[columnConfig.headerRowIndex] || []).map((col, idx) => (
                        <option key={idx} value={idx}>
                          Col {idx + 1}: {String(col || `Column ${idx + 1}`).substring(0, 20)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-blue-700 flex items-center gap-1">
                      <span>Description *</span>
                    </label>
                    <select
                      value={columnConfig.descriptionCol}
                      onChange={(e) =>
                        setColumnConfig((prev) => ({ ...prev, descriptionCol: parseInt(e.target.value) }))
                      }
                      className="w-full text-xs bg-blue-50/50 border border-blue-300 rounded-lg p-1.5 focus:ring-1 focus:ring-blue-500 font-bold text-slate-800"
                    >
                      {(rawSheetData[columnConfig.headerRowIndex] || []).map((col, idx) => (
                        <option key={idx} value={idx}>
                          Col {idx + 1}: {String(col || `Column ${idx + 1}`).substring(0, 20)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Unit */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Unit</label>
                    <select
                      value={columnConfig.unitCol}
                      onChange={(e) =>
                        setColumnConfig((prev) => ({ ...prev, unitCol: parseInt(e.target.value) }))
                      }
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5 focus:ring-1 focus:ring-blue-500 font-medium"
                    >
                      <option value={-1}>-- None --</option>
                      {(rawSheetData[columnConfig.headerRowIndex] || []).map((col, idx) => (
                        <option key={idx} value={idx}>
                          Col {idx + 1}: {String(col || `Column ${idx + 1}`).substring(0, 20)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-blue-700 flex items-center gap-1">
                      <span>Quantity *</span>
                    </label>
                    <select
                      value={columnConfig.quantityCol}
                      onChange={(e) =>
                        setColumnConfig((prev) => ({ ...prev, quantityCol: parseInt(e.target.value) }))
                      }
                      className="w-full text-xs bg-blue-50/50 border border-blue-300 rounded-lg p-1.5 focus:ring-1 focus:ring-blue-500 font-bold text-slate-800"
                    >
                      <option value={-1}>-- None --</option>
                      {(rawSheetData[columnConfig.headerRowIndex] || []).map((col, idx) => (
                        <option key={idx} value={idx}>
                          Col {idx + 1}: {String(col || `Column ${idx + 1}`).substring(0, 20)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Existing Rate */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Existing Rate (Opt)</label>
                    <select
                      value={columnConfig.rateCol}
                      onChange={(e) =>
                        setColumnConfig((prev) => ({ ...prev, rateCol: parseInt(e.target.value) }))
                      }
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5 focus:ring-1 focus:ring-blue-500 font-medium"
                    >
                      <option value={-1}>-- None --</option>
                      {(rawSheetData[columnConfig.headerRowIndex] || []).map((col, idx) => (
                        <option key={idx} value={idx}>
                          Col {idx + 1}: {String(col || `Column ${idx + 1}`).substring(0, 20)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Chapter / Category */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Chapter (Opt)</label>
                    <select
                      value={columnConfig.chapterCol}
                      onChange={(e) =>
                        setColumnConfig((prev) => ({ ...prev, chapterCol: parseInt(e.target.value) }))
                      }
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5 focus:ring-1 focus:ring-blue-500 font-medium"
                    >
                      <option value={-1}>-- None --</option>
                      {(rawSheetData[columnConfig.headerRowIndex] || []).map((col, idx) => (
                        <option key={idx} value={idx}>
                          Col {idx + 1}: {String(col || `Column ${idx + 1}`).substring(0, 20)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Live Data Preview (First 5 Rows):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Total Rows in Sheet: {rawSheetData.length}
                  </span>
                </div>
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-left">
                        <th className="p-2 border-r border-slate-200 w-12 text-center">Row</th>
                        <th className="p-2 border-r border-slate-200">Item No / Code</th>
                        <th className="p-2 border-r border-slate-200">Description</th>
                        <th className="p-2 border-r border-slate-200">Unit</th>
                        <th className="p-2 border-r border-slate-200 text-right">Quantity</th>
                        <th className="p-2 border-r border-slate-200 text-right">Rate</th>
                        <th className="p-2">Chapter</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawSheetData
                        .slice(columnConfig.headerRowIndex + 1, columnConfig.headerRowIndex + 6)
                        .map((row, rIdx) => {
                          const itemNo = columnConfig.itemNoCol !== -1 ? row[columnConfig.itemNoCol] : '—';
                          const desc = columnConfig.descriptionCol !== -1 ? row[columnConfig.descriptionCol] : '—';
                          const unit = columnConfig.unitCol !== -1 ? row[columnConfig.unitCol] : '—';
                          const qty = columnConfig.quantityCol !== -1 ? row[columnConfig.quantityCol] : '—';
                          const rate = columnConfig.rateCol !== -1 ? row[columnConfig.rateCol] : '—';
                          const chap = columnConfig.chapterCol !== -1 ? row[columnConfig.chapterCol] : '—';

                          return (
                            <tr key={rIdx} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="p-2 border-r border-slate-200 text-center font-mono text-slate-400">
                                {columnConfig.headerRowIndex + rIdx + 2}
                              </td>
                              <td className="p-2 border-r border-slate-200 font-semibold font-mono text-slate-800">
                                {String(itemNo || '—')}
                              </td>
                              <td className="p-2 border-r border-slate-200 text-slate-700 max-w-xs truncate">
                                {String(desc || '—')}
                              </td>
                              <td className="p-2 border-r border-slate-200 text-slate-600">
                                {String(unit || '—')}
                              </td>
                              <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-slate-800">
                                {String(qty || '—')}
                              </td>
                              <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-600">
                                {String(rate || '—')}
                              </td>
                              <td className="p-2 text-slate-500 truncate max-w-32">
                                {String(chap || 'General Works')}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step 2 Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to File Upload</span>
                </button>

                <button
                  onClick={handleGenerateNormsMapping}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Analyze & Map System Norms →</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: NORMS MAPPING & RATES REVIEW WORKSPACE */}
          {step === 'mapping' && (
            <div className="space-y-4">
              {/* Top Statistics & Configuration Banner */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Total Items Found
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-black text-slate-800">{stats.total} Items</span>
                    <span className="text-xs font-semibold text-blue-600">
                      {stats.selectedCount} selected
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Norms Auto-Mapped
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl font-black text-emerald-600">{stats.mappedCount}</span>
                      <span className="text-xs text-slate-500 font-medium">/ {stats.total}</span>
                    </div>
                    {stats.unmappedCount > 0 ? (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {stats.unmappedCount} need manual pick
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        100% Mapped!
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Projected Direct Cost
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-lg font-black text-slate-900 font-mono">
                      {currencyCode()} {stats.projectedSubtotal.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium">
                    Calculated via {selectedZone.name_en} Zone Rates
                  </span>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Import Settings
                    </span>
                    <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-bold">
                      {rateMode === 'user' ? 'Office Rate' : 'Contractor Rate'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <select
                      value={importStrategy}
                      onChange={(e) => setImportStrategy(e.target.value as 'append' | 'replace')}
                      className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 font-semibold text-slate-800 cursor-pointer flex-1"
                    >
                      <option value="append">Append to existing BOQ</option>
                      <option value="replace">Replace all BOQ items</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Search, Filter & Bulk Actions Bar */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter by description, code, or norm..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Status Pills */}
                  <div className="flex items-center space-x-1 text-xs">
                    <button
                      onClick={() => setMatchFilter('ALL')}
                      className={`px-2 py-1 rounded-md transition ${
                        matchFilter === 'ALL'
                          ? 'bg-slate-900 text-white font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All ({draftItems.length})
                    </button>
                    <button
                      onClick={() => setMatchFilter('MAPPED')}
                      className={`px-2 py-1 rounded-md transition ${
                        matchFilter === 'MAPPED'
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      Mapped ({stats.mappedCount})
                    </button>
                    <button
                      onClick={() => setMatchFilter('UNMAPPED')}
                      className={`px-2 py-1 rounded-md transition ${
                        matchFilter === 'UNMAPPED'
                          ? 'bg-amber-600 text-white font-bold'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                      }`}
                    >
                      Unmapped ({stats.unmappedCount})
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAutoMatchAll}
                    className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                    title="Re-run matching against all system norms"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Auto-Match All</span>
                  </button>

                  <div className="h-4 w-px bg-slate-200" />

                  <button
                    onClick={() => handleToggleSelectAll(true)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={() => handleToggleSelectAll(false)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Interactive Items Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-[460px]">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs text-slate-700 border-b border-slate-200 text-left">
                      <tr>
                        <th className="p-2.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={stats.selectedCount === draftItems.length && draftItems.length > 0}
                            onChange={(e) => handleToggleSelectAll(e.target.checked)}
                            className="rounded text-blue-600 cursor-pointer"
                          />
                        </th>
                        <th className="p-2.5 w-14 text-center">No.</th>
                        <th className="p-2.5 min-w-[240px]">Original Excel Work Description</th>
                        <th className="p-2.5 min-w-[280px]">Mapped System Norm & Resource Spec</th>
                        <th className="p-2.5 w-24 text-right">Quantity</th>
                        <th className="p-2.5 w-28 text-right">Unit Rate ({currencyCode()})</th>
                        <th className="p-2.5 w-32 text-right">Amount ({currencyCode()})</th>
                        <th className="p-2.5 w-20 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDraftItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">
                            No items match current filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredDraftItems.map((draft, idx) => {
                          const norm = draft.mappedNorm;
                          const unitsMatch = norm ? areUnitsCompatible(draft.editedUnit, norm.base_unit) : true;

                          return (
                            <tr
                              key={draft.id}
                              className={`hover:bg-slate-50/80 transition ${
                                !draft.selected ? 'opacity-40 bg-slate-50/30' : ''
                              }`}
                            >
                              {/* Checkbox */}
                              <td className="p-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={draft.selected}
                                  onChange={(e) =>
                                    updateDraftItem(draft.id, { selected: e.target.checked })
                                  }
                                  className="rounded text-blue-600 cursor-pointer"
                                />
                              </td>

                              {/* S.N. / Item Code */}
                              <td className="p-2.5 text-center font-mono font-bold text-slate-600">
                                {draft.excelRow.rawItemNo || idx + 1}
                              </td>

                              {/* Original Description & Unit */}
                              <td className="p-2.5">
                                <div className="font-semibold text-slate-900 leading-snug">
                                  {draft.excelRow.rawDescription}
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                    Excel Unit: {draft.excelRow.rawUnit}
                                  </span>
                                  {draft.excelRow.rawChapter && (
                                    <span className="text-slate-400 font-medium">
                                      📂 {draft.excelRow.rawChapter}
                                    </span>
                                  )}
                                  {draft.excelRow.rawRate && (
                                    <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                      Original Rate: {currencyCode()} {draft.excelRow.rawRate.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Mapped Norm & Match Confidence */}
                              <td className="p-2.5">
                                {norm ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-black text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                          {norm.code}
                                        </span>
                                        <span className="text-[10px] font-semibold text-slate-500 truncate max-w-36">
                                          {norm.source}
                                        </span>
                                      </div>

                                      {/* Confidence Badge */}
                                      <span
                                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                                          draft.matchConfidence >= 80
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : draft.matchConfidence >= 50
                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                                        }`}
                                      >
                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                        <span>{draft.matchConfidence}%</span>
                                      </span>
                                    </div>

                                    <div className="text-[11px] text-slate-700 line-clamp-2 leading-tight">
                                      {norm.description}
                                    </div>

                                    <div className="flex items-center gap-2 pt-0.5">
                                      <button
                                        onClick={() => setPickerTargetDraftId(draft.id)}
                                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                                      >
                                        Change Norm
                                      </button>
                                      <span className="text-slate-300">|</span>
                                      <button
                                        onClick={() => setInspectingDraft(draft)}
                                        className="text-[10px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-0.5"
                                      >
                                        <Eye className="w-3 h-3 text-slate-400" />
                                        <span>Resources ({norm.resources?.length || 0})</span>
                                      </button>

                                      {!unitsMatch && (
                                        <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                                          ⚠️ Unit: {norm.base_unit}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center justify-between">
                                    <div className="text-[11px] text-amber-800 font-semibold flex items-center gap-1">
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      <span>Not matched to any system norm</span>
                                    </div>
                                    <button
                                      onClick={() => setPickerTargetDraftId(draft.id)}
                                      className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold shadow-xs cursor-pointer"
                                    >
                                      Select Norm
                                    </button>
                                  </div>
                                )}
                              </td>

                              {/* Quantity Editor */}
                              <td className="p-2.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="number"
                                    step="any"
                                    value={draft.editedQuantity}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      updateDraftItem(draft.id, { editedQuantity: val });
                                    }}
                                    className="w-20 px-1.5 py-1 text-right font-mono font-bold text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                                <span className="text-[10px] text-slate-400 font-semibold block text-right mt-0.5">
                                  {draft.editedUnit}
                                </span>
                              </td>

                              {/* Rate Options & Preview */}
                              <td className="p-2.5 text-right">
                                <div className="font-mono font-bold text-slate-900 text-xs">
                                  {draft.effectiveRate.toFixed(2)}
                                </div>
                                {draft.excelRow.rawRate && norm && (
                                  <select
                                    value={draft.rateSource}
                                    onChange={(e) =>
                                      updateDraftItem(draft.id, {
                                        rateSource: e.target.value as 'SYSTEM_ANALYZED' | 'EXCEL_RATE'
                                      })
                                    }
                                    className="text-[10px] bg-slate-50 border border-slate-200 rounded px-1 py-0.5 mt-1 font-semibold text-slate-600 cursor-pointer"
                                  >
                                    <option value="SYSTEM_ANALYZED">System Rate</option>
                                    <option value="EXCEL_RATE">Excel Rate</option>
                                  </select>
                                )}
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  per {draft.editedUnit}
                                </span>
                              </td>

                              {/* Total Amount */}
                              <td className="p-2.5 text-right font-mono font-extrabold text-slate-900 text-xs">
                                {currencyCode()} {draft.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>

                              {/* Actions */}
                              <td className="p-2.5 text-center">
                                <button
                                  onClick={() =>
                                    setDraftItems((prev) => prev.filter((it) => it.id !== draft.id))
                                  }
                                  className="p-1 text-slate-400 hover:text-rose-600 transition rounded hover:bg-rose-50"
                                  title="Remove item from import"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => setStep('columns')}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Columns</span>
                </button>

                <div className="flex items-center gap-2.5">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-slate-800">
                      {stats.selectedCount} Items Selected
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Total: {currencyCode()} {stats.projectedSubtotal.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmImport}
                    disabled={stats.selectedCount === 0}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Import to Project BOQ ({stats.selectedCount})</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: COMPLETE / SUCCESS */}
          {step === 'complete' && (
            <div className="max-w-xl mx-auto py-8 text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-200 shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-slate-900">
                  BOQ Abstract Successfully Imported!
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Your Excel items have been linked into the system norms. Analyzed rates, Measurement Book detailing, and comprehensive Resource Breakdown quantities have been generated.
                </p>
              </div>

              {/* Summary Stats Box */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-2 gap-4 text-left">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Items Added</span>
                  <div className="text-lg font-black text-slate-800 mt-0.5">
                    {stats.selectedCount} Items
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    {stats.mappedCount} Mapped to Norms
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Direct Subtotal</span>
                  <div className="text-lg font-black text-blue-700 font-mono mt-0.5">
                    {currencyCode()} {stats.projectedSubtotal.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {selectedZone.name_en} Rates
                  </span>
                </div>
              </div>

              {/* Quick Navigation Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToTab?.('boq');
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>View in BOQ Abstract</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onNavigateToTab?.('resource-breakdown');
                  }}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Boxes className="w-4 h-4 text-amber-300" />
                  <span>View Resource Breakdown</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onNavigateToTab?.('mb');
                  }}
                  className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Open Measurement Book</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* IN-MODAL NORM PICKER MODAL */}
        {pickerTargetDraftId && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fadeIn">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <h3 className="text-sm font-bold">Select Norm from System Catalog</h3>
                </div>
                <button
                  onClick={() => setPickerTargetDraftId(null)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Department Tabs & Search */}
              <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by code (e.g. 2.4, 4.1), keyword (brickwork, excavation)..."
                    value={normPickerSearch}
                    onChange={(e) => setNormPickerSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1 text-[11px]">
                  {['ALL', 'BLD', 'RDS', 'WRS', 'CUSTOM'].map((dept) => (
                    <button
                      key={dept}
                      onClick={() => setNormPickerDept(dept)}
                      className={`px-2 py-0.5 rounded-md font-semibold transition ${
                        normPickerDept === dept
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {dept === 'ALL'
                        ? 'All Catalogs'
                        : dept === 'BLD'
                        ? 'Building'
                        : dept === 'RDS'
                        ? 'RDS Road'
                        : dept === 'WRS'
                        ? 'WRS Irrigation'
                        : 'Custom Norms'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Norms List */}
              <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100 max-h-96">
                {filteredPickerNorms.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No matching norms found in catalog.
                  </div>
                ) : (
                  filteredPickerNorms.map((n) => (
                    <div
                      key={`${n.source}_${n.code}_${n.item_id}`}
                      onClick={() => {
                        updateDraftItem(pickerTargetDraftId, { mappedNorm: n });
                        setPickerTargetDraftId(null);
                        showToast(`Mapped item to norm "${n.code}" (${n.source})`);
                      }}
                      className="p-2.5 hover:bg-blue-50/60 transition cursor-pointer rounded-lg flex items-start justify-between gap-3 group"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {n.code}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            {n.source}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            Base Unit: {n.base_unit}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-900">
                          {n.description}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Ingredients: {n.resources?.map((r) => r.resource_name).join(', ') || 'Standard breakdown'}
                        </div>
                      </div>

                      <button className="px-2.5 py-1 bg-slate-100 group-hover:bg-blue-600 group-hover:text-white rounded text-xs font-bold text-slate-700 transition shrink-0">
                        Select
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* RESOURCE INSPECTOR POPOVER */}
        {inspectingDraft && inspectingDraft.mappedNorm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 animate-fadeIn">
              <div className="flex items-start justify-between border-b pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Norm {inspectingDraft.mappedNorm.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {inspectingDraft.mappedNorm.source}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 mt-1 leading-snug">
                    {inspectingDraft.mappedNorm.description}
                  </h4>
                </div>
                <button
                  onClick={() => setInspectingDraft(null)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Norm Base Quantity: <b>{inspectingDraft.mappedNorm.base_quantity} {inspectingDraft.mappedNorm.base_unit}</b>
                  </span>
                  <span>
                    Item Quantity: <b>{inspectingDraft.editedQuantity} {inspectingDraft.editedUnit}</b>
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="p-2 text-left">Resource Name</th>
                        <th className="p-2 text-left">Category</th>
                        <th className="p-2 text-right">Norm / Base</th>
                        <th className="p-2 text-right font-bold text-blue-700">Scaled Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inspectingDraft.resourcePreview.map((res, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2 font-medium text-slate-800">{res.name}</td>
                          <td className="p-2 text-[11px] text-slate-500">{res.category}</td>
                          <td className="p-2 text-right font-mono text-slate-600">
                            {inspectingDraft.mappedNorm?.resources?.[i]?.quantity_per_base_unit || '—'}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-blue-700">
                            {res.quantity} {res.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setInspectingDraft(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
