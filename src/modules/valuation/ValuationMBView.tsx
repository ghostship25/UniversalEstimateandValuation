import React, { useState, useRef, useMemo } from 'react';
import {
  Ruler,
  Plus,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Layers,
  Calculator,
  Info,
  ChevronDown,
  ChevronUp,
  Search,
  Grid,
  Edit3,
  X,
  LayoutGrid,
  List,
  Printer,
  Link2,
  Copy,
  FolderPlus,
  AlertTriangle,
  BookOpen,
  BookPlus,
  Boxes,
  BarChart3,
  MoreVertical
} from 'lucide-react';
import { ValuationProgressChart } from '../../components/ValuationProgressChart';
import {
  ProjectEstimate,
  BOQItem,
  MBRow,
  ValuationMBBook,
  ValuationMBRow,
  MeasurementBookDef,
  RateNormItem,
  ZoneInfo,
  ResourceMaster,
  CustomColCalcMode,
  CustomColPosition,
  CustomColConfig,
  CustomHeaderField,
  ColumnLabelsConfig
} from '../../types';
import { calculateItemRate } from '../../services/rateEngine';
import { downloadPrintableHTML } from '../../services/printExport';
import { exportMBToExcel, exportValuationMBToExcel } from '../../services/excelExport';
import * as XLSX from 'xlsx';
import { evaluateMBFormula, resolveFieldValue } from '../../services/mbFormulaEvaluator';
import { recalculateSingleMBRows, recalculateItemTotal as calcItemTotal, recalculateAllProjectItems } from '../../services/mbDependencyEngine';
import { SpreadsheetCell, PointTarget } from '../../components/SpreadsheetCell';
// EmbeddedMBSpreadsheet removed as per Excel Live Sync preference
import { OfficeLiveSyncModal } from '../../components/OfficeLiveSyncModal';

import { SignatureBlock, CustomTopHeading, HeaderMetadataField } from './CompletionCertificateView';
import { currencyCode } from '../../services/currency';

interface ValuationMBViewProps {
  project: ProjectEstimate;
  setProject: React.Dispatch<React.SetStateAction<ProjectEstimate>>;
  valuationBooks: ValuationMBBook[];
  setValuationBooks: React.Dispatch<React.SetStateAction<ValuationMBBook[]>>;
  valuationRows: ValuationMBRow[];
  setValuationRows: React.Dispatch<React.SetStateAction<ValuationMBRow[]>>;
  norms?: RateNormItem[];
  resources?: ResourceMaster[];
  selectedZone?: ZoneInfo;
  selectedFY?: string;
  showToast: (msg: string) => void;
  onNavigateToTab?: (tab: string) => void;
  defaultViewMode?: 'grid' | 'abstract';
}

export const ValuationMBView: React.FC<ValuationMBViewProps> = ({
  project,
  setProject,
  valuationBooks,
  setValuationBooks,
  valuationRows,
  setValuationRows,
  norms = [],
  resources = [],
  selectedZone = { id: 'zone_metro_a', name_en: 'Metro A',province: 'Central Province', region: 'Urban', labor_multiplier: 1, material_multiplier: 1 },
  selectedFY = '2026/27',
  showToast,
  onNavigateToTab,
  defaultViewMode
}) => {
  const activeBooks = valuationBooks;
  const [activeBookId, setActiveBookId] = useState<string>(activeBooks[0]?.id || '');
  const activeBook = activeBooks.find((b) => b.id === activeBookId) || activeBooks[0] || null;

  // Enriched items mapping current active Valuation MB rows to mb_rows for formula resolution
  const valuationEnrichedItems = useMemo(() => {
    if (!activeBook) return project.items;
    return project.items.map((it) => {
      const itemValRows = valuationRows.filter((r) => r.mb_id === activeBook.id && r.boq_item_id === it.id);
      const mappedMbRows: MBRow[] = itemValRows.map((r) => ({
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
      return {
        ...it,
        mb_rows: mappedMbRows.length > 0 ? mappedMbRows : (it.mb_rows || [])
      };
    });
  }, [project.items, valuationRows, activeBook]);

  // Save System Restore Point Helper
  const saveValuationRestorePoint = (title: string, notes: string) => {
    try {
      const STORAGE_KEY = 'uev_system_restore_points';
      const existingRaw = localStorage.getItem(STORAGE_KEY);
      const existingPoints = existingRaw ? JSON.parse(existingRaw) : [];
      const newPoint = {
        id: `rp_val_${Date.now()}`,
        name: title,
        createdAt: new Date().toISOString(),
        notes: notes,
        data: {
          selectedZoneId: selectedZone.id,
          selectedFY,
          resources,
          norms,
          project,
          valuationBooks,
          valuationRows
        }
      };
      const updated = [newPoint, ...(Array.isArray(existingPoints) ? existingPoints : [])];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      showToast(`Saved system restore checkpoint: "${title}"`);
    } catch (e) {
      console.error('Failed to create restore point:', e);
    }
  };

  // Sync / Copy Estimate MB rows directly into active Valuation MB IPC Bill
  const handleSyncEstimateMBToValuation = () => {
    if (!activeBook) {
      showToast('Please select or create an active Valuation MB book first.');
      return;
    }

    const totalEstimateMbRows = project.items.reduce((acc, item) => acc + (item.mb_rows?.length || 0), 0);
    if (totalEstimateMbRows === 0) {
      alert('The Estimate Measurement Book is currently empty. Add measurement rows in Estimate MB first before syncing to Valuation.');
      return;
    }

    const currentValRowsForBook = valuationRows.filter((r) => r.mb_id === activeBook.id);

    let shouldOverwrite = false;
    if (currentValRowsForBook.length > 0) {
      const confirmMsg = `Active Valuation MB "${activeBook.mb_number}" currently has ${currentValRowsForBook.length} measurement rows.\n\n` +
        `• Click OK to OVERWRITE and replace with all ${totalEstimateMbRows} rows from Estimate MB.\n` +
        `• Click CANCEL to APPEND the Estimate MB rows to existing Valuation rows.`;
      shouldOverwrite = confirm(confirmMsg);
    }

    // Always create a Restore Point before changing Valuation state
    saveValuationRestorePoint(
      `Pre-Sync Checkpoint (${activeBook.mb_number})`,
      `Automated system restore point created before syncing ${totalEstimateMbRows} Estimate MB rows into Valuation IPC Bill ${activeBook.mb_number}.`
    );

    const syncedValRows: ValuationMBRow[] = [];
    project.items.forEach((item) => {
      const mbRows = item.mb_rows || [];
      mbRows.forEach((r) => {
        syncedValRows.push({
          id: `vmb_sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          mb_id: activeBook.id,
          mb_book_id: r.mb_book_id || 'mb_1',
          boq_item_id: item.id,
          particulars: r.particulars || 'Synced Estimate Measurement',
          no_of_units: r.no_of_units ?? 1,
          length: r.length ?? 0,
          breadth: r.breadth ?? 0,
          height: r.height ?? 0,
          quantity_this_bill: r.quantity || 0,
          formula: r.formula,
          is_heading: r.is_heading,
          remarks: r.remarks || 'Synced from Estimate MB'
        });
      });
    });

    if (shouldOverwrite) {
      setValuationRows((prev) => [
        ...prev.filter((r) => r.mb_id !== activeBook.id),
        ...syncedValRows
      ]);
    } else {
      setValuationRows((prev) => [...prev, ...syncedValRows]);
    }

    showToast(`Successfully synced ${syncedValRows.length} measurement rows from Estimate MB into Valuation IPC Bill (${activeBook.mb_number})! Auto-created Restore Point.`);
  };

  // State for Add P.S. Item Modal
  const [isPSModalOpen, setIsPSModalOpen] = useState(false);
  const [psCodeInput, setPsCodeInput] = useState('PS-01');
  const [psDescriptionInput, setPsDescriptionInput] = useState('Insurance for Works, Equipment, Personnel & Quality Control Lab Tests');
  const [psUnitInput, setPsUnitInput] = useState('L.S.');
  const [psRateInput, setPsRateInput] = useState<number>(25000);
  const [psEstimatedQtyInput, setPsEstimatedQtyInput] = useState<number>(1);

  const handleAddPSItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!psDescriptionInput.trim()) {
      showToast('Please enter a description for the P.S. Item.');
      return;
    }

    const nextPsNum = project.items.filter(i => (i as any).is_ps || i.chapter === 'Provisional Sums' || i.item_code?.startsWith('PS')).length + 1;
    const itemCode = psCodeInput.trim() || `PS-0${nextPsNum}`;

    const newPsItem: BOQItem = {
      id: `ps_item_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      item_id: project.items.length + 1,
      item_code: itemCode,
      description: psDescriptionInput.trim(),
      unit: psUnitInput.trim() || 'L.S.',
      estimated_quantity: psEstimatedQtyInput || 1,
      calculated_unit_rate: psRateInput || 0,
      user_rate: psRateInput || 0,
      total_amount: (psEstimatedQtyInput || 1) * (psRateInput || 0),
      chapter: 'Provisional Sums',
      precision: 2,
      mb_rows: [
        {
          id: `ps_row_${Date.now()}`,
          particulars: 'Itemized Provisional Sum Claim',
          no_of_units: 1,
          length: 1,
          breadth: 1,
          height: 1,
          quantity: 1
        }
      ]
    };
    (newPsItem as any).is_ps = true;

    // Ensure 'Provisional Sums' category heading exists
    if (!allCategoryHeadings.includes('Provisional Sums')) {
      setCustomCategoryHeadings((prev) => [...prev, 'Provisional Sums']);
    }

    setProject((prev) => ({
      ...prev,
      items: [...prev.items, newPsItem]
    }));

    if (activeBook) {
      const newValRow: ValuationMBRow = {
        id: `vmb_ps_row_${Date.now()}`,
        mb_id: activeBook.id,
        boq_item_id: newPsItem.id,
        particulars: 'Provisional Sum Executed Claim',
        no_of_units: 1,
        length: 1,
        breadth: 1,
        height: 1,
        quantity_this_bill: 1,
        remarks: 'P.S. Item Claim'
      };
      setValuationRows((prev) => [...prev, newValRow]);
    }

    showToast(`Added Provisional Sum item "${newPsItem.item_code} - ${newPsItem.description}"!`);
    setIsPSModalOpen(false);
  };

  const isPSItem = (item: BOQItem) => (item as any).is_ps || item.chapter === 'Provisional Sums' || item.unit?.toLowerCase() === 'ps' || item.unit?.toLowerCase() === 'p.s.' || item.item_code?.toLowerCase().startsWith('ps') || item.description?.toLowerCase().includes('provisional sum');

  const [viewMode, setViewMode] = useState<'grid' | 'abstract' | 'analytics'>(defaultViewMode || 'grid');
  const [abstractFormat, setAbstractFormat] = useState<'estimate' | 'detailed'>('estimate');

  const [isEditingHeader, setIsEditingHeader] = useState<boolean>(false);
  const [isHeaderMinimized, setIsHeaderMinimized] = useState<boolean>(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);

  // Official Header & Metadata Configuration
  const [headerMetadata, setHeaderMetadata] = useState({
    authorityName: project.header_config?.authority_name || "Sample City Authority",
    officeName: project.header_config?.office_name || "Local Authority Office",
    officeAddress: project.header_config?.office_address || "Sample City, Sample County",
    officeNamePreeti: "O6x/L pk–dxfgu/kflnsf\ngu/ sfo{kflnsfsf] sfof{no\nO6x/L ;'g;/L",
    pageNo: project.header_config?.page_no || "First",
    projectName: project.title || project.header_config?.document_title_mb || "River protection works at  (Infront of Abhishek Chaudhary's house and Bhotiya Khola, Sample City-15, Sample County",
    contractNo: project.header_config?.contract_no || "CNT/2025/26/01",
    location: project.header_config?.implementation_location || "Sample City -15,16, Sample County",
    contractorName: project.header_config?.contractor_name || "Apex Construction Co., Ward-7, Sample County",
    measurementDate: project.header_config?.measurement_date || "2026-08-25",
    agreementDate: project.header_config?.agreement_date || "2026-02-23",
    acceptanceDate: project.header_config?.acceptance_date || "2026-02-20",
    completionDate: project.header_config?.completion_date || "2026-09-11",
    workOrderDate: project.header_config?.work_order_date || "2026-02-25"
  });

  // Custom Top Document Headings (Editable top heading lines, add/remove/edit)
  const [customTopHeadings, setCustomTopHeadings] = useState<CustomTopHeading[]>([
    { id: 'h1', text: project.header_config?.authority_name || 'Sample City Authority' },
    { id: 'h2', text: project.header_config?.office_name || 'Local Authority Office' },
    { id: 'h3', text: project.header_config?.office_address || 'Sample City, Sample County' }
  ].filter(h => h.text.trim() !== ''));

  const handleTopHeadingChange = (id: string, newText: string) => {
    setCustomTopHeadings(prev => prev.map(h => h.id === id ? { ...h, text: newText } : h));
  };

  const handleRemoveTopHeading = (id: string) => {
    setCustomTopHeadings(prev => prev.filter(h => h.id !== id));
  };

  const handleAddTopHeading = () => {
    const newHeading: CustomTopHeading = {
      id: `top_h_${Date.now()}`,
      text: 'New upper heading'
    };
    setCustomTopHeadings(prev => [...prev, newHeading]);
  };

  // Dynamic & Editable Metadata Fields (Add/Remove/Edit)
  const [customMetadataFields, setCustomMetadataFields] = useState<HeaderMetadataField[]>([
    { id: 'm1', label: 'Project / construction work name', value: project.title || project.header_config?.document_title_mb || "River protection works at Sample City-15, Sample County", isDeletable: true },
    { id: 'm2', label: 'Implementation Location', value: project.header_config?.implementation_location || "Sample City -15,16, Sample County", isDeletable: true },
    { id: 'm3', label: 'Agreement no', value: project.header_config?.contract_no || "CNT/2025/26/01", isDeletable: true },
    { id: 'm4', label: 'Contractor name', value: project.header_config?.contractor_name || "Apex Construction Co., Ward-7, Sample County", isDeletable: true },
    { id: 'm5', label: 'Measurement date', value: project.header_config?.measurement_date || "2026-08-25", isDeletable: true },
    { id: 'm6', label: 'Agreement date', value: project.header_config?.agreement_date || "2026-02-23", isDeletable: true },
    { id: 'm7', label: 'Work acceptance date', value: project.header_config?.acceptance_date || "2026-02-20", isDeletable: true },
    { id: 'm8', label: 'Work completion due date', value: project.header_config?.completion_date || "2026-09-11", isDeletable: true },
    { id: 'm9', label: 'Work order date', value: project.header_config?.work_order_date || "2026-02-25", isDeletable: true }
  ]);

  const handleCustomMetadataChange = (id: string, field: 'label' | 'value', val: string) => {
    setCustomMetadataFields(prev => prev.map(f => f.id === id ? { ...f, [field]: val } : f));
  };

  const handleAddCustomMetadataField = () => {
    const newField: HeaderMetadataField = {
      id: `meta_${Date.now()}`,
      label: 'New detail heading',
      value: 'Description / value',
      isDeletable: true
    };
    setCustomMetadataFields(prev => [...prev, newField]);
  };

  const handleRemoveCustomMetadataField = (id: string) => {
    setCustomMetadataFields(prev => prev.filter(f => f.id !== id));
  };

  // Dynamic & Editable Signature Headings
  const [signatures, setSignatures] = useState<SignatureBlock[]>([
    { id: '1', title: 'Prepared By', designation: 'Site Engineer / Sub-Engineer' },
    { id: '2', title: 'Checked By', designation: 'Division Engineer' },
    { id: '3', title: 'Approved By', designation: 'Chief Administrative Officer / Chief Engineer' }
  ]);

  const handleSignatureChange = (id: string, field: 'title' | 'designation', val: string) => {
    setSignatures(prev => prev.map(sig => sig.id === id ? { ...sig, [field]: val } : sig));
  };

  const handleAddSignature = () => {
    const newSig: SignatureBlock = {
      id: Date.now().toString(),
      title: 'New position / heading',
      designation: 'Designation'
    };
    setSignatures(prev => [...prev, newSig]);
  };

  const handleRemoveSignature = (id: string) => {
    setSignatures(prev => prev.filter(sig => sig.id !== id));
  };

  const handleSaveHeaderMetadata = () => {
    setProject((prev) => ({
      ...prev,
      header_config: {
        ...prev.header_config,
        authority_name: headerMetadata.authorityName,
        office_name: headerMetadata.officeName,
        office_address: headerMetadata.officeAddress,
        implementation_location: headerMetadata.location,
        contractor_name: headerMetadata.contractorName,
        contract_no: headerMetadata.contractNo,
        agreement_date: headerMetadata.agreementDate,
        work_order_date: headerMetadata.workOrderDate,
        acceptance_date: headerMetadata.acceptanceDate,
        completion_date: headerMetadata.completionDate,
        measurement_date: headerMetadata.measurementDate,
        page_no: headerMetadata.pageNo
      }
    }));
    setIsEditingHeader(false);
    showToast('Valuation MB Header fields updated and saved successfully.');
  };

  React.useEffect(() => {
    if (defaultViewMode && defaultViewMode !== viewMode) {
      setViewMode(defaultViewMode);
    }
  }, [defaultViewMode, viewMode]);
  const [isCategoryManagerExpanded, setIsCategoryManagerExpanded] = useState<boolean>(false);

  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(
    project.items.length > 0 ? project.items[0].id : null
  );

  // Modal for creating dynamic new Valuation MB
  const [showNewBookModal, setShowNewBookModal] = useState<boolean>(false);
  const [showEditBookModal, setShowEditBookModal] = useState<boolean>(false);
  const [bookToDelete, setBookToDelete] = useState<ValuationMBBook | null>(null);
  const [isOfficeSyncModalOpen, setIsOfficeSyncModalOpen] = useState<boolean>(false);

  // Manage Valuation Books Modal State
  const [manageModalTab, setManageModalTab] = useState<'list' | 'create' | 'edit'>('list');
  const [editingBook, setEditingBook] = useState<ValuationMBBook | null>(null);
  const [autoSyncOnCreate, setAutoSyncOnCreate] = useState<boolean>(true);

  // Active Sub-MB Book selection state for the active IPC
  const [activeSubMBId, setActiveSubMBId] = useState<string>('all');
  const [printTargetSubMBId, setPrintTargetSubMBId] = useState<string>('all');
  const [isAddSubMBModalOpen, setIsAddSubMBModalOpen] = useState<boolean>(false);
  const [newSubMBCode, setNewSubMBCode] = useState<string>('');
  const [newSubMBTitle, setNewSubMBTitle] = useState<string>('');
  const [newSubMBRemarks, setNewSubMBRemarks] = useState<string>('');

  const defaultSubBooks: MeasurementBookDef[] = useMemo(() => [
    { id: 'vmb_sub_1', code: 'VMB-01', title: 'Main Civil & Structure Works', remarks: 'Primary Valuation MB' }
  ], []);

  const subBooks: MeasurementBookDef[] = useMemo(() => {
    if (activeBook?.sub_books && activeBook.sub_books.length > 0) {
      return activeBook.sub_books;
    }
    return defaultSubBooks;
  }, [activeBook?.sub_books, defaultSubBooks]);

  const activeSubMB = useMemo(() => {
    return subBooks.find((b) => b.id === activeSubMBId);
  }, [subBooks, activeSubMBId]);

  const [combinedValDisplayMode, setCombinedValDisplayMode] = useState<'both' | 'matrix' | 'details'>('both');
  const [expandAllItems, setExpandAllItems] = useState<boolean>(true);

  const handleCreateSubMBBook = () => {
    if (!activeBook) return;
    const newSubBook: MeasurementBookDef = {
      id: `vmb_sub_${Date.now()}`,
      code: newSubMBCode.trim() || `VMB-0${subBooks.length + 1}`,
      title: newSubMBTitle.trim() || `${subBooks.length + 1}th Sub Valuation MB`,
      remarks: newSubMBRemarks.trim() || '',
      created_at: new Date().toISOString()
    };

    const updatedSubBooks = [...(activeBook.sub_books || defaultSubBooks), newSubBook];
    const updatedValuationBooks = valuationBooks.map((b) =>
      b.id === activeBook.id ? { ...b, sub_books: updatedSubBooks } : b
    );

    setValuationBooks(updatedValuationBooks);
    setActiveSubMBId(newSubBook.id);
    setIsAddSubMBModalOpen(false);
    showToast(`Added Sub Valuation MB ${newSubBook.code}: "${newSubBook.title}" to IPC #${activeBook.ipc_number || 1}`);
  };

  const handleDeleteSubMBBook = (subBookIdToDelete: string) => {
    if (!activeBook) return;
    if (subBooks.length <= 1) {
      showToast('At least one Valuation MB Book must exist for the IPC.');
      return;
    }

    const targetSubBook = subBooks.find((b) => b.id === subBookIdToDelete);
    const remainingSubBooks = subBooks.filter((b) => b.id !== subBookIdToDelete);
    const fallbackSubBookId = remainingSubBooks[0].id;

    // Reassign sub-rows to fallback primary sub-book
    setValuationRows((prev) =>
      prev.map((r) =>
        r.mb_id === activeBook.id && (r.mb_book_id === subBookIdToDelete || !r.mb_book_id)
          ? { ...r, mb_book_id: fallbackSubBookId }
          : r
      )
    );

    const updatedValuationBooks = valuationBooks.map((b) =>
      b.id === activeBook.id ? { ...b, sub_books: remainingSubBooks } : b
    );

    setValuationBooks(updatedValuationBooks);
    if (activeSubMBId === subBookIdToDelete) {
      setActiveSubMBId('all');
    }
    showToast(`Deleted Sub Valuation MB ${targetSubBook?.code || ''}. Sub-rows reassigned to ${remainingSubBooks[0].code}.`);
  };

  // New Book Form State
  const [newMbNo, setNewMbNo] = useState(`VMB-0${activeBooks.length + 1}`);
  const [newMbTitle, setNewMbTitle] = useState(`${activeBooks.length + 1}th Running Valuation MB`);
  const [newMbType, setNewMbType] = useState<'RUNNING_BILL' | 'FINAL_VALUATION'>('RUNNING_BILL');
  const [newIpcNo, setNewIpcNo] = useState(activeBooks.length + 1);
  const [newDateBs, setNewDateBs] = useState('2026-11-15');
  const [newRefNo, setNewRefNo] = useState(`MB/VAL/2026-27/0${activeBooks.length + 1}`);
  const [newVerifiedBy, setNewVerifiedBy] = useState('Er. B. K. Sharma (Site Engineer)');
  const [newRemarks, setNewRemarks] = useState('');

  // Edit Book Form State
  const [editMbNo, setEditMbNo] = useState('');
  const [editMbTitle, setEditMbTitle] = useState('');
  const [editMbType, setEditMbType] = useState<'RUNNING_BILL' | 'FINAL_VALUATION'>('RUNNING_BILL');
  const [editIpcNo, setEditIpcNo] = useState(1);
  const [editDateBs, setEditDateBs] = useState('2026-11-15');
  const [editRefNo, setEditRefNo] = useState('');
  const [editVerifiedBy, setEditVerifiedBy] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

  // Modal for adding a new item from Norms to Valuation MB
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState<boolean>(false);
  const [normSearchQuery, setNormSearchQuery] = useState<string>('');
  const [selectedNormId, setSelectedNormId] = useState<number>(norms[0]?.item_id || 0);
  const [selectedNormIds, setSelectedNormIds] = useState<number[]>(norms[0]?.item_id ? [norms[0].item_id] : []);

  // Modal for adding custom column to a BOQ item table
  const [isCustomColModalOpen, setIsCustomColModalOpen] = useState<boolean>(false);
  const [targetItemIdForCol, setTargetItemIdForCol] = useState<string | null>(null);
  const [newCustomColName, setNewCustomColName] = useState<string>('');
  const [newCustomColCalcMode, setNewCustomColCalcMode] = useState<CustomColCalcMode>('none');
  const [newCustomColPosition, setNewCustomColPosition] = useState<CustomColPosition>('after_h');

  // Modal for Linking Cells / MB Items reference guide
  const [linkModalOpen, setLinkModalOpen] = useState<boolean>(false);

  // Dynamic Category Manager input & headings list
  const defaultCategoryHeadings = [
    'General Works',
    'Protection Works',
    'Earthworks & Site Clearance',
    'Concrete Works',
    'Masonry Works',
    'Finishing Works',
    'Sanitary & Plumbing',
    'Electrical Works'
  ];

  const [customCategoryHeadings, setCustomCategoryHeadings] = useState<string[]>([]);
  const [removedCategoryHeadings, setRemovedCategoryHeadings] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState<string>('');

  // Confirmation modal state for Work Item deletion
  const [itemToDelete, setItemToDelete] = useState<{ id: string; item_code: string; description: string } | null>(null);

  // Grid view sub-mode: 'detail' (standard grid) or 'spreadsheet' (embedded interactive spreadsheet)
  const [gridSubMode, setGridSubMode] = useState<'detail' | 'spreadsheet'>('detail');

  // Bulk delete Valuation MBs modal state
  const [showManageBooksModal, setShowManageBooksModal] = useState<boolean>(false);
  const [selectedBooksToDelete, setSelectedBooksToDelete] = useState<string[]>([]);

  // Confirmation modal state for Category Heading deletion
  const [categoryToDelete, setCategoryToDelete] = useState<{ name: string; affectedCount: number } | null>(null);

  // Modal state for adding a new category from item dropdown
  const [addCategoryForItemId, setAddCategoryForItemId] = useState<string | null>(null);
  const [newCategoryModalName, setNewCategoryModalName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Combine default categories, custom added categories, and any categories present on existing items
  const allCategoryHeadings = Array.from(
    new Set([
      ...defaultCategoryHeadings,
      ...customCategoryHeadings,
      ...project.items.map((it) => (it.chapter && it.chapter.trim() ? it.chapter.trim() : 'General Works'))
    ])
  ).filter((cat) => !removedCategoryHeadings.includes(cat));

  const handleAddCategoryHeading = (e: React.FormEvent) => {
    e.preventDefault();
    const catName = newCategoryInput.trim();
    if (!catName) return;
    if (allCategoryHeadings.includes(catName)) {
      showToast(`Category heading "${catName}" already exists.`);
      setNewCategoryInput('');
      return;
    }
    if (removedCategoryHeadings.includes(catName)) {
      setRemovedCategoryHeadings((prev) => prev.filter((c) => c !== catName));
    }
    setCustomCategoryHeadings((prev) => [...prev, catName]);
    setNewCategoryInput('');
    showToast(`Added category heading "${catName}". Select it on any work item to group under it.`);
  };

  const handleDeleteCategoryHeading = (catToDelete: string) => {
    if (catToDelete === 'General Works') {
      showToast('"General Works" is the default fallback category heading and cannot be deleted.');
      return;
    }
    const affectedItems = project.items.filter((i) => (i.chapter || 'General Works') === catToDelete);
    setCategoryToDelete({ name: catToDelete, affectedCount: affectedItems.length });
  };

  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    const catToDelete = categoryToDelete.name;
    if (categoryToDelete.affectedCount > 0) {
      setProject((prev) => ({
        ...prev,
        items: prev.items.map((it) =>
          (it.chapter || 'General Works') === catToDelete
            ? { ...it, chapter: 'General Works' }
            : it
        )
      }));
    }
    setCustomCategoryHeadings((prev) => prev.filter((c) => c !== catToDelete));
    setRemovedCategoryHeadings((prev) => [...prev, catToDelete]);
    showToast(`Category heading "${catToDelete}" deleted successfully.`);
    setCategoryToDelete(null);
  };

  const handleConfirmAddNewCategoryModal = (e: React.FormEvent) => {
    e.preventDefault();
    const catName = newCategoryModalName.trim();
    if (!catName) return;
    if (!customCategoryHeadings.includes(catName)) {
      setCustomCategoryHeadings((prev) => [...prev, catName]);
    }
    if (removedCategoryHeadings.includes(catName)) {
      setRemovedCategoryHeadings((prev) => prev.filter((c) => c !== catName));
    }
    if (addCategoryForItemId) {
      handleUpdateItemChapter(addCategoryForItemId, catName);
      showToast(`Item assigned to category "${catName}"`);
    } else {
      showToast(`Created category heading "${catName}"`);
    }
    setAddCategoryForItemId(null);
    setNewCategoryModalName('');
  };

  const handleConfirmDeleteItem = () => {
    if (!itemToDelete) return;
    const deletedCode = itemToDelete.item_code;
    setProject((prev) => ({
      ...prev,
      items: recalculateAllMBItems(prev.items.filter((it) => it.id !== itemToDelete.id))
    }));
    setItemToDelete(null);
    showToast(`Deleted work item Norm ${deletedCode} from Measurement Book.`);
  };

  const rateMode = project.rate_mode || 'user';

  const getItemUnitRate = (item: BOQItem): number => {
    if (rateMode === 'user') {
      return item.user_rate !== undefined ? item.user_rate : item.calculated_unit_rate;
    }
    return item.contractor_rate !== undefined ? item.contractor_rate : item.calculated_unit_rate;
  };

  // Get valuation rows for active book & item
  const getItemValuationRows = (itemId: string, ignoreSubMBFilter = false): ValuationMBRow[] => {
    let bookRows = valuationRows.filter((r) => r.mb_id === activeBook.id && r.boq_item_id === itemId);

    if (!ignoreSubMBFilter && activeSubMBId !== 'all') {
      bookRows = bookRows.filter((r) => {
        const rowSubBookId = r.mb_book_id || subBooks[0]?.id || 'vmb_sub_1';
        return rowSubBookId === activeSubMBId;
      });
    }

    if (bookRows.length > 0) return bookRows;

    // Fallback to item's mb_rows if no valuation rows set yet
    const targetItem = project.items.find((it) => it.id === itemId);
    if (targetItem && targetItem.mb_rows && targetItem.mb_rows.length > 0) {
      let fallbackRows = targetItem.mb_rows;
      if (!ignoreSubMBFilter && activeSubMBId !== 'all') {
        fallbackRows = fallbackRows.filter((r) => {
          const rowSubBookId = r.mb_book_id || subBooks[0]?.id || 'vmb_sub_1';
          return rowSubBookId === activeSubMBId || activeSubMBId === (subBooks[0]?.id || 'vmb_sub_1');
        });
      }
      return fallbackRows.map((r) => ({
        id: r.id,
        mb_id: activeBook.id,
        mb_book_id: r.mb_book_id || (activeSubMBId === 'all' ? (subBooks[0]?.id || 'vmb_sub_1') : activeSubMBId),
        ipc_number: activeBook.ipc_number || 1,
        boq_item_id: itemId,
        particulars: r.particulars,
        no_of_units: r.no_of_units ?? 1,
        length: r.length ?? 0,
        breadth: r.breadth ?? 0,
        height: r.height ?? 0,
        quantity_this_bill: typeof r.quantity === 'number' ? r.quantity : 0,
        custom_fields: r.custom_fields ? { ...r.custom_fields } : {},
        formula: r.formula,
        remarks: r.remarks
      }));
    }
    return [];
  };

  // Calculate item valuation quantity for active book across all sub MBs (Combined) or active sub MB
  const getItemValuationQuantity = (itemId: string, ignoreSubMBFilter = false): number => {
    const rows = getItemValuationRows(itemId, ignoreSubMBFilter);
    return rows.reduce((sum, r) => sum + (r.quantity_this_bill || 0), 0);
  };

  // Calculate previous cumulative bill quantity for active book
  const getPreviousBillQuantity = (itemId: string): number => {
    const currentIpc = activeBook.ipc_number || 1;
    const prevBooks = activeBooks.filter((b) => (b.ipc_number || 1) < currentIpc);
    const prevBookIds = prevBooks.map((b) => b.id);
    const prevRows = valuationRows.filter((r) => r.boq_item_id === itemId && r.mb_id && prevBookIds.includes(r.mb_id));
    return prevRows.reduce((sum, r) => sum + (r.quantity_this_bill || 0), 0);
  };

  const handleToggleBookFinalType = (bookId: string) => {
    const updatedBooks = activeBooks.map((b) =>
      b.id === bookId
        ? { ...b, bill_type: (b.bill_type === 'FINAL_VALUATION' ? 'RUNNING_BILL' : 'FINAL_VALUATION') as any }
        : b
    );
    setValuationBooks(updatedBooks);
    const target = updatedBooks.find((b) => b.id === bookId);
    showToast(
      target?.bill_type === 'FINAL_VALUATION'
        ? `MB ${target.mb_number} set as Final Valuation MB (Work Completion Certificate Enabled).`
        : `MB ${target.mb_number} set as Running Bill.`
    );
  };

  const totalSubRowsCount = project.items.reduce(
    (acc, item) => acc + getItemValuationRows(item.id).length,
    0
  );

  const filteredNorms = norms.filter((n) => {
    if (!normSearchQuery.trim()) return true;
    const q = normSearchQuery.toLowerCase();
    return (
      n.code.toLowerCase().includes(q) ||
      n.description.toLowerCase().includes(q) ||
      n.source.toLowerCase().includes(q)
    );
  });

  const recalculateMBRows = (rows: MBRow[], allItems: BOQItem[] = project.items, currentItem?: BOQItem): MBRow[] => {
    return recalculateSingleMBRows(rows, allItems, currentItem);
  };

  const recalculateItemTotal = (item: BOQItem, allItems: BOQItem[] = project.items): BOQItem => {
    return calcItemTotal(item, allItems, rateMode);
  };

  const recalculateAllMBItems = (itemsList: BOQItem[]): BOQItem[] => {
    return recalculateAllProjectItems(itemsList, rateMode).items;
  };

  const handleToggleCalcColumn = (itemId: string, colKey: string) => {
    setProject((prev) => ({
      ...prev,
      items: recalculateAllMBItems(
        prev.items.map((item) => {
          if (item.id === itemId) {
            const defaultCols = ['no_of_units', 'length', 'breadth', 'height'];
            const currentIncluded = item.included_calc_columns || defaultCols;
            const isIncluded = currentIncluded.includes(colKey);
            const updatedCols = isIncluded
              ? currentIncluded.filter((c) => c !== colKey)
              : [...currentIncluded, colKey];
            const updatedItem = {
              ...item,
              included_calc_columns: updatedCols
            };
            return recalculateItemTotal(updatedItem, prev.items);
          }
          return item;
        })
      )
    }));
    showToast('Updated quantity calculation column settings.');
  };

  // Handle Edit Valuation MB Book
  const handleStartEditBook = (book: ValuationMBBook) => {
    setEditingBook(book);
    setEditMbNo(book.mb_number || '');
    setEditMbTitle(book.title || '');
    setEditMbType(book.bill_type || 'RUNNING_BILL');
    setEditIpcNo(book.ipc_number || 1);
    setEditDateBs(book.date_iso || '2026-11-15');
    setEditRefNo(book.book_ref_no || '');
    setEditVerifiedBy(book.verified_by || '');
    setEditRemarks(book.remarks || '');
    setManageModalTab('edit');
  };

  const handleSaveEditBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;
    const updatedBooks = valuationBooks.map((b) => {
      if (b.id === editingBook.id) {
        return {
          ...b,
          mb_number: editMbNo,
          title: editMbTitle,
          bill_type: editMbType,
          ipc_number: editIpcNo,
          date_iso: editDateBs,
          book_ref_no: editRefNo,
          verified_by: editVerifiedBy,
          remarks: editRemarks
        };
      }
      return b;
    });
    setValuationBooks(updatedBooks);
    showToast(`Updated Valuation MB: ${editMbNo} (${editMbTitle})`);
    setEditingBook(null);
    setManageModalTab('list');
  };

  // Handle Create New Valuation MB
  const handleCreateNewBook = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nextIndex = activeBooks.length + 1;
    const createdBook: ValuationMBBook = {
      id: `vmb_book_${Date.now()}`,
      mb_number: newMbNo || `VMB-0${nextIndex}`,
      title: newMbTitle || `${nextIndex}th Running Valuation MB`,
      bill_type: newMbType,
      ipc_number: newIpcNo,
      date_iso: newDateBs,
      book_ref_no: newRefNo || `MB/VAL/2026-27/0${nextIndex}`,
      verified_by: newVerifiedBy,
      remarks: newRemarks || (newMbType === 'FINAL_VALUATION' ? 'Final Valuation MB' : 'Running bill valuation measurement'),
      created_at: new Date().toISOString()
    };

    const updatedBooks = [...activeBooks, createdBook];
    setValuationBooks(updatedBooks);
    setActiveBookId(createdBook.id);

    if (autoSyncOnCreate) {
      const syncedValRows: ValuationMBRow[] = [];
      project.items.forEach((item) => {
        const mbRows = item.mb_rows || [];
        mbRows.forEach((r) => {
          syncedValRows.push({
            id: `vmb_sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            mb_id: createdBook.id,
            mb_book_id: r.mb_book_id || 'mb_1',
            boq_item_id: item.id,
            particulars: r.particulars || 'Synced Estimate Measurement',
            no_of_units: r.no_of_units ?? 1,
            length: r.length ?? 0,
            breadth: r.breadth ?? 0,
            height: r.height ?? 0,
            quantity_this_bill: r.quantity || 0,
            formula: r.formula,
            is_heading: r.is_heading,
            remarks: r.remarks || 'Synced from Estimate MB'
          });
        });
      });
      if (syncedValRows.length > 0) {
        setValuationRows((prev) => [...prev, ...syncedValRows]);
        showToast(`Auto-synced ${syncedValRows.length} measurement rows from Estimate MB into ${createdBook.mb_number}!`);
      }
    }

    setShowNewBookModal(false);
    showToast(`Added Valuation MB: ${createdBook.mb_number} (${createdBook.title})`);

    const nextNum = updatedBooks.length + 1;
    setNewMbNo(`VMB-0${nextNum}`);
    setNewMbTitle(`${nextNum}th Running Valuation MB`);
    setNewIpcNo(nextNum);
    setNewRefNo(`MB/VAL/2026-27/0${nextNum}`);
    setManageModalTab('list');
  };

  // Copy Measurement Data from Estimate MB to Active Valuation MB
  const handleCopyFromEstimateMB = () => {
    if (!activeBook) return;

    let copiedCount = 0;
    const newRows: ValuationMBRow[] = [];

    project.items.forEach((item) => {
      if (item.mb_rows && item.mb_rows.length > 0) {
        item.mb_rows.forEach((r) => {
          copiedCount++;
          newRows.push({
            id: `vmb_row_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            mb_id: activeBook.id,
            boq_item_id: item.id,
            particulars: `${r.particulars} (As Built)`,
            no_of_units: typeof r.no_of_units === 'number' ? r.no_of_units : (parseFloat(String(r.no_of_units)) || 1),
            length: typeof r.length === 'number' ? r.length : (parseFloat(String(r.length)) || 1),
            breadth: typeof r.breadth === 'number' ? r.breadth : (parseFloat(String(r.breadth)) || 1),
            height: typeof r.height === 'number' ? r.height : (parseFloat(String(r.height)) || 1),
            quantity_this_bill: typeof r.quantity === 'number' ? r.quantity : (parseFloat(String(r.quantity)) || 0),
            formula: r.formula,
            verified_by: activeBook.verified_by,
            remarks: `Copied from Estimate MB`
          });
        });
      }
    });

    if (copiedCount === 0) {
      showToast('No measurement rows found in Estimate MB to copy.');
      return;
    }

    setValuationRows((prev) => [...prev, ...newRows]);
    showToast(`Copied ${copiedCount} detail rows from Estimate MB into ${activeBook.mb_number}!`);
  };

  // Add a sub-row to a specific BOQ item in Valuation MB
  const handleAddSubRow = (itemId: string) => {
    const existingValRows = valuationRows.filter((r) => r.mb_id === activeBook.id && r.boq_item_id === itemId);
    const targetSubBookId = activeSubMBId === 'all' ? (subBooks[0]?.id || 'vmb_sub_1') : activeSubMBId;

    const newRow: ValuationMBRow = {
      id: `vmb_row_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      mb_id: activeBook.id,
      mb_book_id: targetSubBookId,
      boq_item_id: itemId,
      particulars: `Valuation Entry ${existingValRows.length + 1}`,
      no_of_units: 1,
      length: 1.0,
      breadth: 1.0,
      height: 1.0,
      quantity_this_bill: 1.0,
      verified_by: activeBook.verified_by,
      remarks: ''
    };

    setValuationRows((prev) => [...prev, newRow]);

    // Also sync to project item mb_rows if needed
    setProject((prev) => ({
      ...prev,
      items: recalculateAllMBItems(prev.items.map((item) => {
        if (item.id === itemId) {
          const mbRow: MBRow = {
            id: newRow.id,
            particulars: newRow.particulars,
            no_of_units: newRow.no_of_units,
            length: newRow.length,
            breadth: newRow.breadth,
            height: newRow.height,
            quantity: newRow.quantity_this_bill
          };
          const updatedMbRows = [...(item.mb_rows || []), mbRow];
          return recalculateItemTotal({ ...item, mb_rows: updatedMbRows }, prev.items);
        }
        return item;
      }))
    }));

    showToast('Added new measurement detail row.');
  };

  // Helper to ensure a row exists in valuationRows state before updating
  const ensureValuationRowExists = (
    prevRows: ValuationMBRow[],
    bookId: string,
    itemId: string,
    rowId: string
  ): ValuationMBRow[] => {
    if (!bookId) return prevRows;
    const exists = prevRows.some((r) => r.id === rowId && r.mb_id === bookId);
    if (exists) return prevRows;

    const targetItem = project.items.find((it) => it.id === itemId);
    const existingMbRow = targetItem?.mb_rows?.find((r) => r.id === rowId);

    const newRow: ValuationMBRow = {
      id: rowId,
      mb_id: bookId,
      boq_item_id: itemId,
      particulars: existingMbRow?.particulars || 'Site Sub-measurement',
      no_of_units: typeof existingMbRow?.no_of_units === 'number' ? existingMbRow.no_of_units : (parseFloat(String(existingMbRow?.no_of_units)) || 1),
      length: typeof existingMbRow?.length === 'number' ? existingMbRow.length : (parseFloat(String(existingMbRow?.length)) || 1),
      breadth: typeof existingMbRow?.breadth === 'number' ? existingMbRow.breadth : (parseFloat(String(existingMbRow?.breadth)) || 1),
      height: typeof existingMbRow?.height === 'number' ? existingMbRow.height : (parseFloat(String(existingMbRow?.height)) || 1),
      quantity_this_bill: typeof existingMbRow?.quantity === 'number' ? existingMbRow.quantity : 1,
      formula: existingMbRow?.formula,
      remarks: existingMbRow?.remarks || '',
      custom_fields: existingMbRow?.custom_fields ? { ...existingMbRow.custom_fields } : {}
    };

    return [...prevRows, newRow];
  };

  const recalculateValuationRows = (
    allValRows: ValuationMBRow[],
    items: BOQItem[],
    bookId: string
  ): ValuationMBRow[] => {
    let currentValRows = [...allValRows];

    for (let pass = 0; pass < 3; pass++) {
      const enrichedItems = items.map((it) => {
        const itemValRows = currentValRows.filter((r) => r.mb_id === bookId && r.boq_item_id === it.id);
        const mappedMbRows: MBRow[] = itemValRows.map((r) => ({
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
        return {
          ...it,
          mb_rows: mappedMbRows.length > 0 ? mappedMbRows : (it.mb_rows || [])
        };
      });

      currentValRows = currentValRows.map((r) => {
        if (r.mb_id !== bookId) return r;
        const targetItem = items.find((it) => it.id === r.boq_item_id);
        const itemValRows = currentValRows.filter((row) => row.mb_id === bookId && row.boq_item_id === r.boq_item_id);
        const rIdx = itemValRows.findIndex((row) => row.id === r.id);

        const evalVal = (val: any): number => {
          if (val === undefined || val === null || val === '') return 0;
          if (typeof val === 'number') return isNaN(val) ? 0 : val;
          if (typeof val === 'string') {
            const trimmed = val.trim();
            if (trimmed.startsWith('=')) {
              return evaluateMBFormula(trimmed, itemValRows as any[], rIdx, enrichedItems);
            }
            const parsed = parseFloat(trimmed);
            return isNaN(parsed) ? 0 : parsed;
          }
          return 0;
        };

        const no = evalVal(r.no_of_units);
        const l = evalVal(r.length);
        const b = evalVal(r.breadth);
        const h = evalVal(r.height);

        const defaultCols = ['no_of_units', 'length', 'breadth', 'height'];
        const includedCols = targetItem?.included_calc_columns || defaultCols;

        const useNo = includedCols.includes('no_of_units');
        const useL = includedCols.includes('length');
        const useB = includedCols.includes('breadth');
        const useH = includedCols.includes('height');

        let activeFactors: number[] = [];
        if (useNo) activeFactors.push(no);
        if (useL && l !== 0) activeFactors.push(l);
        if (useB && b !== 0) activeFactors.push(b);
        if (useH && h !== 0) activeFactors.push(h);

        let computedQty = 1;
        if (activeFactors.length === 0) {
          computedQty = useNo ? no : 0;
        } else {
          computedQty = activeFactors.reduce((acc, v) => acc * v, 1);
        }

        if (targetItem && targetItem.custom_column_names && targetItem.custom_column_config) {
          targetItem.custom_column_names.forEach((colName) => {
            const config = targetItem.custom_column_config?.[colName];
            const isColIncludedInCalc = !includedCols || includedCols.includes(colName);
            const rawVal = r.custom_fields?.[colName];
            if (rawVal !== undefined && rawVal !== '') {
              const val = evalVal(rawVal);
              if (isColIncludedInCalc && config) {
                if (!isNaN(val)) {
                  if (config.calcMode === 'multiply' && val !== 0) computedQty *= val;
                  else if (config.calcMode === 'add') computedQty += val;
                  else if (config.calcMode === 'subtract') computedQty -= val;
                }
              }
            }
          });
        }

        const prec = targetItem?.precision ?? 2;
        const factor = Math.pow(10, prec);
        const roundedQty = Math.round(computedQty * factor) / factor;

        return {
          ...r,
          quantity_this_bill: roundedQty
        };
      });
    }

    return currentValRows;
  };

  const handleDeleteBook = (bookId: string) => {
    if (valuationBooks.length <= 1) {
      showToast('Cannot delete the only Valuation MB. At least one Valuation MB must remain.');
      return;
    }
    const target = valuationBooks.find((b) => b.id === bookId);
    if (target) {
      setBookToDelete(target);
    }
  };

  const handleConfirmDeleteBook = () => {
    if (!bookToDelete) return;
    if (valuationBooks.length <= 1) {
      showToast('Cannot delete the only Valuation MB.');
      setBookToDelete(null);
      return;
    }
    const bookId = bookToDelete.id;
    const updatedBooks = valuationBooks.filter((b) => b.id !== bookId);
    const updatedRows = valuationRows.filter((r) => r.mb_id !== bookId);
    setValuationBooks(updatedBooks);
    setValuationRows(updatedRows);
    if (activeBookId === bookId) {
      setActiveBookId(updatedBooks[0]?.id || '');
    }
    showToast(`Deleted Valuation MB "${bookToDelete.mb_number || ''}: ${bookToDelete.title || ''}".`);
    setBookToDelete(null);
  };

  const handleBulkDeleteBooks = () => {
    if (selectedBooksToDelete.length === 0) {
      showToast('No Valuation MBs selected for deletion.');
      return;
    }
    if (valuationBooks.length <= selectedBooksToDelete.length) {
      showToast('Cannot delete all Valuation MBs. At least one Valuation MB must remain.');
      return;
    }
    const updatedBooks = valuationBooks.filter((b) => !selectedBooksToDelete.includes(b.id));
    const updatedRows = valuationRows.filter((r) => !selectedBooksToDelete.includes(r.mb_id));
    setValuationBooks(updatedBooks);
    setValuationRows(updatedRows);
    if (selectedBooksToDelete.includes(activeBookId)) {
      setActiveBookId(updatedBooks[0]?.id || '');
    }
    setSelectedBooksToDelete([]);
    setShowManageBooksModal(false);
    showToast(`Bulk deleted ${selectedBooksToDelete.length} Valuation MB(s).`);
  };

  const handleDeleteSubRows = (itemId: string, rowIds: string[]) => {
    if (!activeBook) return;
    setValuationRows((prev) => {
      const filtered = prev.filter((r) => !(r.mb_id === activeBook.id && r.boq_item_id === itemId && rowIds.includes(r.id)));
      return recalculateValuationRows(filtered, project.items, activeBook.id);
    });
  };

  // Update a sub-row field
  const handleUpdateSubRow = (
    itemId: string,
    rowId: string,
    field: keyof ValuationMBRow | keyof MBRow,
    value: any
  ) => {
    if (!activeBook) return;
    setValuationRows((prev) => {
      const ensured = ensureValuationRowExists(prev, activeBook.id, itemId, rowId);
      const updatedList = ensured.map((r) => {
        if (r.id === rowId && r.mb_id === activeBook.id) {
          return { ...r, [field]: value };
        }
        return r;
      });
      return recalculateValuationRows(updatedList, project.items, activeBook.id);
    });
  };

  const handleUpdateCustomField = (
    itemId: string,
    rowId: string,
    colName: string,
    value: string
  ) => {
    if (!activeBook) return;
    setValuationRows((prev) => {
      const ensured = ensureValuationRowExists(prev, activeBook.id, itemId, rowId);
      const updatedList = ensured.map((r) => {
        if (r.id === rowId && r.mb_id === activeBook.id) {
          const existingFields = r.custom_fields || {};
          return {
            ...r,
            custom_fields: {
              ...existingFields,
              [colName]: value
            }
          };
        }
        return r;
      });
      return recalculateValuationRows(updatedList, project.items, activeBook.id);
    });
  };

  const handleAddCustomColumn = () => {
    if (!targetItemIdForCol || !newCustomColName.trim()) {
      alert('Please enter a valid column name.');
      return;
    }
    const colName = newCustomColName.trim();

    setProject((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === targetItemIdForCol) {
          const existingCols = item.custom_column_names || [];
          const existingConfig = item.custom_column_config || {};
          if (existingCols.includes(colName)) {
            alert('Column with this name already exists.');
            return item;
          }
          const defaultCols = ['no_of_units', 'length', 'breadth', 'height', ...existingCols];
          const currentIncluded = item.included_calc_columns || defaultCols;
          const updatedIncluded = newCustomColCalcMode !== 'none' && !currentIncluded.includes(colName)
            ? [...currentIncluded, colName]
            : currentIncluded;

          const updatedItem: BOQItem = {
            ...item,
            custom_column_names: [...existingCols, colName],
            custom_column_config: {
              ...existingConfig,
              [colName]: {
                calcMode: newCustomColCalcMode,
                position: newCustomColPosition
              }
            },
            included_calc_columns: updatedIncluded
          };
          return recalculateItemTotal(updatedItem, prev.items);
        }
        return item;
      })
    }));

    setNewCustomColName('');
    setNewCustomColCalcMode('none');
    setNewCustomColPosition('after_h');
    setIsCustomColModalOpen(false);
    showToast(`Added custom column "${colName}".`);
  };

  const handleUpdateItemChapter = (itemId: string, newChapter: string) => {
    setProject((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, chapter: newChapter } : item
      )
    }));
  };

  const handleUpdateItemPrecision = (itemId: string, newPrecision: number) => {
    setProject((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, precision: newPrecision } : item
      )
    }));
  };

  const handleUpdateItemTruncate = (itemId: string, truncate: boolean) => {
    setProject((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, truncate_quantity: truncate } : item
      )
    }));
  };

  const handleRemoveCustomColumn = (itemId: string, colName: string) => {
    setProject((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === itemId) {
          const updatedCols = (item.custom_column_names || []).filter((c) => c !== colName);
          const updatedConfig = { ...(item.custom_column_config || {}) };
          delete updatedConfig[colName];
          const updatedRows = (item.mb_rows || []).map((r) => {
            const fields = { ...(r.custom_fields || {}) };
            delete fields[colName];
            return { ...r, custom_fields: fields };
          });
          const updatedItem: BOQItem = {
            ...item,
            custom_column_names: updatedCols,
            custom_column_config: updatedConfig,
            mb_rows: updatedRows
          };
          return recalculateItemTotal(updatedItem, prev.items);
        }
        return item;
      })
    }));
    showToast(`Removed custom column "${colName}".`);
  };

  const handleDeleteSubRow = (itemId: string, rowId: string) => {
    setValuationRows((prev) => prev.filter((r) => r.id !== rowId));
    setProject((prev) => ({
      ...prev,
      items: recalculateAllMBItems(prev.items.map((item) => {
        if (item.id === itemId) {
          const updatedMbRows = (item.mb_rows || []).filter((r) => r.id !== rowId);
          return recalculateItemTotal({ ...item, mb_rows: updatedMbRows }, prev.items);
        }
        return item;
      }))
    }));
  };

  const handleAddItemToMB = (normIdsToAdd?: number | number[]) => {
    let targetIds: number[] = [];
    if (Array.isArray(normIdsToAdd)) {
      targetIds = normIdsToAdd;
    } else if (typeof normIdsToAdd === 'number') {
      targetIds = [normIdsToAdd];
    } else if (selectedNormIds && selectedNormIds.length > 0) {
      targetIds = selectedNormIds;
    } else if (selectedNormId) {
      targetIds = [selectedNormId];
    }

    if (targetIds.length === 0) {
      alert('No norm specifications selected.');
      return;
    }

    const addedNorms: RateNormItem[] = [];

    setProject((prev) => {
      let updatedItems = [...prev.items];
      let lastExpandedId: string | null = null;

      targetIds.forEach((id, index) => {
        const selNorm = norms.find((n) => n.item_id === id);
        if (!selNorm) return;
        addedNorms.push(selNorm);

        const rateResult = calculateItemRate({
          norm: selNorm,
          resources,
          zone: selectedZone,
          fiscalYear: selectedFY,
          mode: rateMode
        });

        const userRate = rateResult.user_unit_rate || rateResult.total_unit_rate;
        const contractorRate = rateResult.contractor_unit_rate || rateResult.total_unit_rate;
        const activeRate = rateResult.total_unit_rate;
        const effRate = rateMode === 'user' ? userRate : contractorRate;

        const defaultRow: MBRow = {
          id: `mb_row_${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`,
          particulars: 'Initial Location / Dimension Entry',
          no_of_units: 1,
          length: 1.0,
          breadth: 1.0,
          height: 1.0,
          quantity: 1.0,
          remarks: 'As Executed'
        };

        const newItem: BOQItem = {
          id: `item_${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`,
          item_id: selNorm.item_id,
          item_code: selNorm.code,
          description: selNorm.description,
          unit: selNorm.base_unit,
          estimated_quantity: 1.0,
          calculated_unit_rate: activeRate,
          user_rate: userRate,
          contractor_rate: contractorRate,
          total_amount: effRate * 1.0,
          chapter: selNorm.category_tag || 'General Works',
          mb_rows: [defaultRow],
          included_calc_columns: ['no_of_units', 'length', 'breadth', 'height'],
          custom_column_names: [],
          custom_column_config: {}
        };

        updatedItems.push(newItem);
        lastExpandedId = newItem.id;
      });

      if (lastExpandedId) {
        setExpandedItemId(lastExpandedId);
      }

      return {
        ...prev,
        items: recalculateAllMBItems(updatedItems)
      };
    });

    setIsAddItemModalOpen(false);
    setSelectedNormIds([]);

    if (addedNorms.length === 1) {
      showToast(`Added work item Norm ${addedNorms[0].code} to Measurement Book.`);
    } else {
      showToast(`Added ${addedNorms.length} work items to Measurement Book.`);
    }
  };

  const handleImportExcelToValuationMB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBook) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (!rawData || rawData.length < 2) {
          showToast('Uploaded spreadsheet is empty or missing data headers.');
          return;
        }

        let importedCount = 0;
        const newImportedRows: ValuationMBRow[] = [];

        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0) continue;

          const descCell = String(row[1] || row[0] || '').trim();
          if (!descCell || descCell.includes('Valuation Measurement Book')) continue;

          const noVal = parseFloat(row[3]) || 1;
          const lVal = parseFloat(row[4]) || 1;
          const bVal = parseFloat(row[5]) || 1;
          const hVal = parseFloat(row[6]) || 1;
          const qtyVal = parseFloat(row[7]) || parseFloat(row[8]) || (noVal * lVal * bVal * hVal);

          if (noVal || lVal || bVal || hVal) {
            const matchedItem = project.items.find((it) => descCell.includes(it.item_code)) || project.items[0];
            if (matchedItem) {
              newImportedRows.push({
                id: `vmb_imp_${Date.now()}_${i}`,
                mb_id: activeBook.id,
                boq_item_id: matchedItem.id,
                particulars: descCell.startsWith('↳') || descCell.startsWith('•') ? descCell.replace(/^[↳•\s]+/, '').trim() : descCell,
                no_of_units: noVal,
                length: lVal,
                breadth: bVal,
                height: hVal,
                quantity_this_bill: qtyVal,
                remarks: String(row[row.length - 1] || 'Imported from Excel')
              });
              importedCount++;
            }
          }
        }

        if (importedCount > 0) {
          setValuationRows((prev) => [...prev, ...newImportedRows]);
          showToast(`Successfully imported ${importedCount} sub-measurement rows from Excel into ${activeBook.mb_number}!`);
        } else {
          showToast('Could not parse valid measurement rows from spreadsheet.');
        }
      } catch (err) {
        console.error('Failed to parse spreadsheet:', err);
        showToast('Error reading spreadsheet file. Please upload a valid .xlsx or .csv file.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handlePrintMB = () => {
    if (project.items.length === 0) {
      alert('Valuation Measurement Book is empty.');
      return;
    }

    const allCustomCols: string[] = [];
    project.items.forEach((item) => {
      (item.custom_column_names || []).forEach((col) => {
        if (!allCustomCols.includes(col)) allCustomCols.push(col);
      });
    });

    const dimColSpan = 4 + allCustomCols.length; // No, L, B, H + custom cols

    const topHeadingsHtml = customTopHeadings.map((h, idx) => `
      <div style="font-size: ${idx === 0 ? '14pt' : '11.5pt'}; font-weight: bold; margin-bottom: 2px;">${h.text}</div>
    `).join('');

    const metadataGridHtml = customMetadataFields.length > 0 ? `
      <table style="width: 100%; border: 1px solid #000; border-collapse: collapse; font-size: 9pt; text-align: left; margin-bottom: 16px;">
        ${Array.from({ length: Math.ceil(customMetadataFields.length / 2) }).map((_, rIdx) => {
          const f1 = customMetadataFields[rIdx * 2];
          const f2 = customMetadataFields[rIdx * 2 + 1];
          return `
            <tr>
              <td style="border: 1px solid #000; padding: 5px 8px; font-weight: bold; width: 50%;">
                ${f1 ? `${f1.label}: <span style="font-weight: normal;">${f1.value}</span>` : ''}
              </td>
              <td style="border: 1px solid #000; padding: 5px 8px; font-weight: bold; width: 50%;">
                ${f2 ? `${f2.label}: <span style="font-weight: normal;">${f2.value}</span>` : ''}
              </td>
            </tr>
          `;
        }).join('')}
      </table>
    ` : '';

    const printTargetBook = printTargetSubMBId === 'all'
      ? null
      : subBooks.find((b) => b.id === printTargetSubMBId);

    const docSubtitle = printTargetSubMBId === 'all'
      ? 'Combined Valuation Measurement Summary (All Sub MBs)'
      : `Valuation MB (${printTargetBook?.code || ''}: ${printTargetBook?.title || ''})`;

    let tableHtml = `
      <div style="margin-bottom: 20px; text-align: center; font-family: sans-serif;">
        ${topHeadingsHtml}
        
        <div style="text-align: right; font-size: 10pt; font-weight: bold; margin-bottom: 6px;">Sheet no: ${activeBook.page_start || 1}</div>
        
        <div style="font-size: 15pt; font-weight: bold; text-decoration: underline; margin-bottom: 4px;">Valuation Measurement Book</div>
        <div style="font-size: 11pt; font-weight: bold; color: #1e3a8a; margin-bottom: 4px;">${docSubtitle}</div>
        <div style="font-size: 11pt; font-weight: bold; color: #991b1b; margin-bottom: 14px;">Measurement no: ${activeBook.ipc_number === 1 ? 'First' : activeBook.ipc_number === 2 ? 'Second' : `${activeBook.ipc_number} th`}</div>

        ${metadataGridHtml}
      </div>`;

    if (printTargetSubMBId === 'all') {
      // 1. COMBINED VALUATION MATRIX PRINT TABLE SUMMARY
      tableHtml += `
        <div style="font-size: 11pt; font-weight: bold; color: #065f46; margin-bottom: 6px; text-decoration: underline;">
Sub-MB Quantity Column Matrix Summary
        </div>
        <table border="1" cellpadding="6" cellspacing="0" class="print-table" style="width:100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 25px;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: center; font-weight: bold;">
              <th style="border: 1px solid #000; width: 35px;" class="col-sn">S.No.</th>
              <th style="border: 1px solid #000; width: 80px;" class="col-code">Norm Code</th>
              <th style="border: 1px solid #000;" class="particulars col-desc">Description / Particulars</th>
              <th style="border: 1px solid #000; width: 45px;" class="col-unit">Unit</th>
              ${subBooks.map((sb) => `<th style="border: 1px solid #000; text-align: right; min-width: 65px;" class="sub-book-header">${sb.code}<br/><span style="font-size: 7.5pt; font-weight: normal; display: block; word-break: break-word;">${sb.title}</span></th>`).join('')}
              <th style="border: 1px solid #000; text-align: right; width: 95px; background-color: #e0f2fe; word-break: break-word;">This Bill</th>
              <th style="border: 1px solid #000; text-align: right; width: 85px; word-break: break-word;">Prev Bill</th>
              <th style="border: 1px solid #000; text-align: right; width: 95px; background-color: #dcfce7; word-break: break-word;">Cumulative</th>
            </tr>
          </thead>
          <tbody>`;

      project.items.forEach((item, idx) => {
        const precision = item.precision ?? 2;
        const allValRows = getItemValuationRows(item.id, true);
        const prevQty = getPreviousBillQuantity(item.id);
        const thisBillQty = getItemValuationQuantity(item.id, true);
        const cumQty = prevQty + thisBillQty;

        const subBookCells = subBooks.map((sb) => {
          const defaultSbId = subBooks[0]?.id || 'vmb_sub_1';
          const rowsForSb = allValRows.filter((r) => (r.mb_book_id || defaultSbId) === sb.id);
          const sbQty = rowsForSb.reduce((sum, r) => sum + (r.quantity_this_bill || 0), 0);
          return `<td style="text-align: right; border: 1px solid #000; font-family: monospace;" class="sub-book-col">${sbQty > 0 ? sbQty.toFixed(precision) : '-'}</td>`;
        }).join('');

        tableHtml += `
          <tr>
            <td style="text-align: center; border: 1px solid #000;" class="col-sn">${idx + 1}</td>
            <td style="border: 1px solid #000; font-weight: bold; font-family: monospace; text-align: center; word-break: break-all;" class="col-code">${item.item_code}</td>
            <td style="border: 1px solid #000; word-break: break-word; white-space: normal;" class="particulars col-desc">${item.description}</td>
            <td style="text-align: center; border: 1px solid #000;" class="col-unit">${item.unit}</td>
            ${subBookCells}
            <td style="text-align: right; border: 1px solid #000; font-weight: bold; background-color: #f0f9ff; color: #1e3a8a;">${thisBillQty.toFixed(precision)}</td>
            <td style="text-align: right; border: 1px solid #000; color: #854d0e;">${prevQty.toFixed(precision)}</td>
            <td style="text-align: right; border: 1px solid #000; font-weight: bold; background-color: #f0fdf4; color: #15803d;">${cumQty.toFixed(precision)}</td>
          </tr>`;
      });

      tableHtml += `
          </tbody>
          <tfoot>
            <tr style="background-color: #f1f5f9; font-weight: bold; font-size: 9.5pt;">
              <td colSpan="${4 + subBooks.length}" style="text-align: right; border: 1px solid #000;">
Total Measured Items:
              </td>
              <td colSpan="3" style="text-align: right; color: #1e3a8a; font-weight: bold; border: 1px solid #000;">
                ${project.items.length} Items
              </td>
            </tr>
          </tfoot>
        </table>`;

      // 2. DETAILED MEASUREMENT ROWS SECTION FOR COMBINED PRINT
      tableHtml += `
        <div style="font-size: 11pt; font-weight: bold; color: #1e3a8a; margin-top: 25px; margin-bottom: 8px; text-decoration: underline; page-break-before: auto;">
Detailed Measurement Rows
        </div>
        <table border="1" cellpadding="6" cellspacing="0" class="print-table" style="width:100%; border-collapse: collapse; font-size: 8.5pt;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: center; font-weight: bold;">
              <th rowspan="2" style="border: 1px solid #000; width: 35px;" class="col-sn">S.No.</th>
              <th rowspan="2" style="border: 1px solid #000;" class="particulars col-desc">Description of work/service and sub-measurement source</th>
              <th rowspan="2" style="border: 1px solid #000; width: 45px;" class="col-unit">Unit</th>
              <th rowspan="2" style="border: 1px solid #000; width: 85px;">Previous quantity</th>
              <th colspan="${dimColSpan}" style="text-align: center; border: 1px solid #000;">Measurement dimensions of this measurement</th>
              <th rowspan="2" style="text-align: right; border: 1px solid #000; width: 85px;">Quantity established by this measurement</th>
              <th rowspan="2" style="text-align: right; border: 1px solid #000; width: 85px;">Quantity to date (updated)</th>
            </tr>
            <tr style="background-color: #f8fafc; text-align: center; font-weight: bold;">
              <th style="border: 1px solid #000; width: 40px;">Quantity</th>
              <th style="border: 1px solid #000; width: 50px;">Length</th>
              <th style="border: 1px solid #000; width: 50px;">Width</th>
              <th style="border: 1px solid #000; width: 50px;">Height</th>
              ${allCustomCols.map((col) => `<th style="border: 1px solid #000;">${col}</th>`).join('')}
            </tr>
          </thead>
          <tbody>`;

      project.items.forEach((item, idx) => {
        const itemValRows = getItemValuationRows(item.id, true);
        const valQty = itemValRows.reduce((sum, r) => sum + (r.quantity_this_bill || 0), 0);
        const prevQty = getPreviousBillQuantity(item.id);
        const cumQty = prevQty + valQty;
        const precision = item.precision ?? 2;
        const emptyCustomCells = allCustomCols.map(() => `<td style="text-align: center; border: 1px solid #000;">-</td>`).join('');

        tableHtml += `
          <tr style="background-color: #f8fafc; font-weight: bold;">
            <td style="text-align: center; border: 1px solid #000;" class="col-sn"><b>${idx + 1}</b></td>
            <td style="border: 1px solid #000; word-break: break-word; white-space: normal;" class="particulars col-desc"><b>[${item.item_code}] ${item.description}</b></td>
            <td style="text-align: center; border: 1px solid #000;" class="col-unit">${item.unit}</td>
            <td style="text-align: right; border: 1px solid #000; color: #854d0e;">${prevQty.toFixed(precision)}</td>
            <td style="text-align: center; border: 1px solid #000;">-</td>
            <td style="text-align: center; border: 1px solid #000;">-</td>
            <td style="text-align: center; border: 1px solid #000;">-</td>
            <td style="text-align: center; border: 1px solid #000;">-</td>
            ${emptyCustomCells}
            <td style="text-align: right; color: #1e3a8a; border: 1px solid #000;"><b>${valQty.toFixed(precision)}</b></td>
            <td style="text-align: right; color: #15803d; border: 1px solid #000;"><b>${cumQty.toFixed(precision)}</b></td>
          </tr>`;

        itemValRows.forEach((r) => {
          const defaultSbId = subBooks[0]?.id || 'vmb_sub_1';
          const rSb = subBooks.find((sb) => sb.id === (r.mb_book_id || defaultSbId));
          const sbTag = rSb ? `[${rSb.code}] ` : '';

          const customTdCells = allCustomCols.map((colName) => {
            const val = r.custom_fields?.[colName] ?? '-';
            return `<td style="text-align: center; border: 1px solid #000;">${val}</td>`;
          }).join('');

          tableHtml += `
            <tr>
              <td style="border: 1px solid #000;"></td>
              <td style="padding-left: 15px; font-style: italic; border: 1px solid #000; word-break: break-word; white-space: normal;" class="particulars col-desc"><span style="color: #065f46; font-weight: bold;">${sbTag}</span>↳ ${r.particulars || 'Measurement Entry'}</td>
              <td style="text-align: center; border: 1px solid #000;" class="col-unit">${r.unit || item.unit}</td>
              <td style="text-align: center; border: 1px solid #000;">-</td>
              <td style="text-align: center; border: 1px solid #000;">${r.no_of_units}</td>
              <td style="text-align: center; border: 1px solid #000;">${r.length}</td>
              <td style="text-align: center; border: 1px solid #000;">${r.breadth}</td>
              <td style="text-align: center; border: 1px solid #000;">${r.height}</td>
              ${customTdCells}
              <td style="text-align: right; font-weight: bold; border: 1px solid #000;">${(r.quantity_this_bill || 0).toFixed(precision)}</td>
              <td style="border: 1px solid #000;"></td>
            </tr>`;
        });
      });

      tableHtml += `
          </tbody>
          <tfoot>
            <tr style="background-color: #f1f5f9; font-weight: bold; font-size: 10pt;">
              <td colSpan="${3 + dimColSpan + 1}" style="text-align: right; border: 1px solid #000;">
Total Work Items:
              </td>
              <td colSpan="2" style="text-align: right; color: #1e3a8a; font-weight: bold; border: 1px solid #000;">
                ${project.items.length} Items
              </td>
            </tr>
          </tfoot>
        </table>`;
    } else {
      // INDIVIDUAL SUB-MB DETAIL PRINT SHEET
      tableHtml += `
        <table border="1" cellpadding="6" cellspacing="0" class="print-table" style="width:100%; border-collapse: collapse; font-size: 8.5pt;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: center; font-weight: bold;">
              <th rowspan="2" style="border: 1px solid #000; width: 35px;">S.No.</th>
              <th rowspan="2" style="border: 1px solid #000;" class="particulars">Description of work/service activity</th>
              <th rowspan="2" style="border: 1px solid #000; width: 45px;">Unit</th>
              <th rowspan="2" style="border: 1px solid #000; width: 85px;">Quantity carried in previous measurement book</th>
              <th colspan="${dimColSpan}" style="text-align: center; border: 1px solid #000;">Measurement dimensions of this measurement</th>
              <th rowspan="2" style="text-align: right; border: 1px solid #000; width: 85px;">Quantity established by this measurement</th>
              <th rowspan="2" style="text-align: right; border: 1px solid #000; width: 85px;">Quantity of work done to date (updated)</th>
            </tr>
            <tr style="background-color: #f8fafc; text-align: center; font-weight: bold;">
              <th style="border: 1px solid #000; width: 40px;">Quantity</th>
              <th style="border: 1px solid #000; width: 50px;">Length</th>
              <th style="border: 1px solid #000; width: 50px;">Width</th>
              <th style="border: 1px solid #000; width: 50px;">Height</th>
              ${allCustomCols.map((col) => `<th style="border: 1px solid #000;">${col}</th>`).join('')}
            </tr>
          </thead>
          <tbody>`;

      project.items.forEach((item, idx) => {
        const itemValRows = getItemValuationRows(item.id, true).filter((r) => {
          const defaultSbId = subBooks[0]?.id || 'vmb_sub_1';
          return (r.mb_book_id || defaultSbId) === printTargetSubMBId;
        });

        const valQty = itemValRows.reduce((sum, r) => sum + (r.quantity_this_bill || 0), 0);
        const prevQty = getPreviousBillQuantity(item.id);
        const cumQty = prevQty + valQty;
        const precision = item.precision ?? 2;
        const emptyCustomCells = allCustomCols.map(() => `<td style="text-align: center; border: 1px solid #000;">-</td>`).join('');

        // Main Item Row
        tableHtml += `
          <tr style="background-color: #f8fafc; font-weight: bold;">
            <td style="text-align: center; border: 1px solid #000;"><b>${idx + 1}</b></td>
            <td style="border: 1px solid #000;" class="particulars"><b>[${item.item_code}] ${item.description}</b></td>
            <td style="text-align: center; border: 1px solid #000;">${item.unit}</td>
            <td style="text-align: right; border: 1px solid #000; color: #854d0e;">${prevQty.toFixed(precision)}</td>
            <td style="text-align: center; border: 1px solid #000;">-</td>
            <td style="text-align: center; border: 1px solid #000;">-</td>
            <td style="text-align: center; border: 1px solid #000;">-</td>
            <td style="text-align: center; border: 1px solid #000;">-</td>
            ${emptyCustomCells}
            <td style="text-align: right; color: #1e3a8a; border: 1px solid #000;"><b>${valQty.toFixed(precision)}</b></td>
            <td style="text-align: right; color: #15803d; border: 1px solid #000;"><b>${cumQty.toFixed(precision)}</b></td>
          </tr>`;

        // Sub-Rows
        itemValRows.forEach((r) => {
          const customTdCells = allCustomCols.map((colName) => {
            const val = r.custom_fields?.[colName] ?? '-';
            return `<td style="text-align: center; border: 1px solid #000;">${val}</td>`;
          }).join('');

          tableHtml += `
            <tr>
              <td style="border: 1px solid #000;"></td>
              <td style="padding-left: 15px; font-style: italic; border: 1px solid #000;" class="particulars">↳ ${r.particulars || 'Measurement Entry'}</td>
              <td style="text-align: center; border: 1px solid #000;">${r.unit || item.unit}</td>
              <td style="text-align: center; border: 1px solid #000;">-</td>
              <td style="text-align: center; border: 1px solid #000;">${r.no_of_units}</td>
              <td style="text-align: center; border: 1px solid #000;">${r.length}</td>
              <td style="text-align: center; border: 1px solid #000;">${r.breadth}</td>
              <td style="text-align: center; border: 1px solid #000;">${r.height}</td>
              ${customTdCells}
              <td style="text-align: right; font-weight: bold; border: 1px solid #000;">${(r.quantity_this_bill || 0).toFixed(precision)}</td>
              <td style="border: 1px solid #000;"></td>
            </tr>`;
        });
      });

      tableHtml += `
          </tbody>
          <tfoot>
            <tr style="background-color: #f1f5f9; font-weight: bold; font-size: 10pt;">
              <td colSpan="${3 + dimColSpan + 1}" style="text-align: right; border: 1px solid #000;">
Total Work Items:
              </td>
              <td colSpan="2" style="text-align: right; color: #1e3a8a; font-weight: bold; border: 1px solid #000;">
                ${project.items.length} Items
              </td>
            </tr>
          </tfoot>
        </table>`;
    }

    const sigsHtml = signatures.map(sig => `
      <td style="border: none !important; text-align: center; vertical-align: bottom; padding: 10px;">
        _______________________<br/>
        <b>${sig.title}</b><br/>
        <span style="font-size: 8pt; color: #444;">${sig.designation}</span><br/>
        <span style="font-size: 7.5pt; color: #666;">Date: ${activeBook?.date_iso || ''}</span>
      </td>
    `).join('');

    tableHtml += `
      <div style="margin-top: 40px; page-break-inside: avoid;">
        <table style="width: 100%; border: none !important; margin-top: 30px; font-size: 9pt;">
          <tr style="border: none !important; text-align: center;">
            ${sigsHtml}
          </tr>
        </table>
      </div>
    `;

    downloadPrintableHTML({
      title: `Valuation Measurement Book (${activeBook.mb_number})`,
      projectTitle: headerMetadata.projectName,
      zone: selectedZone.name_en,
      fiscalYear: selectedFY,
      customHeaderHtml: '',
      subtitle: printTargetBook ? printTargetBook.title : activeBook.title,
      tableHtml,
      filename: `Valuation_MB_${activeBook.mb_number}_${printTargetSubMBId}.html`,
      orientation: printOrientation
    });
  };

  const handlePrintValuationAbstract = () => {
    if (project.items.length === 0) {
      alert('Valuation MB is empty.');
      return;
    }

    const topHeadingsHtml = customTopHeadings.map((h, idx) => `
      <div style="font-size: ${idx === 0 ? '14pt' : '11.5pt'}; font-weight: bold; margin-bottom: 2px;">${h.text}</div>
    `).join('');

    const metadataGridHtml = customMetadataFields.length > 0 ? `
      <table style="width: 100%; border: 1px solid #000; border-collapse: collapse; font-size: 9pt; text-align: left; margin-bottom: 16px;">
        ${Array.from({ length: Math.ceil(customMetadataFields.length / 2) }).map((_, rIdx) => {
          const f1 = customMetadataFields[rIdx * 2];
          const f2 = customMetadataFields[rIdx * 2 + 1];
          return `
            <tr>
              <td style="border: 1px solid #000; padding: 5px 8px; font-weight: bold; width: 50%;">
                ${f1 ? `${f1.label}: <span style="font-weight: normal;">${f1.value}</span>` : ''}
              </td>
              <td style="border: 1px solid #000; padding: 5px 8px; font-weight: bold; width: 50%;">
                ${f2 ? `${f2.label}: <span style="font-weight: normal;">${f2.value}</span>` : ''}
              </td>
            </tr>
          `;
        }).join('')}
      </table>
    ` : '';

    let tableHtml = `
      <div style="margin-bottom: 20px; text-align: center; font-family: sans-serif;">
        ${topHeadingsHtml}
        
        <div style="font-size: 15pt; font-weight: bold; text-decoration: underline; margin-bottom: 4px;">Valuation Estimate Abstract</div>
        <div style="font-size: 10pt; font-weight: bold; color: #047857; margin-bottom: 14px;">Measurement Book: ${activeBook.mb_number} (${activeBook.title}) | As per cumulative updated quantity to date</div>

        ${metadataGridHtml}
      </div>

      <table border="1" cellpadding="6" cellspacing="0" class="print-table" style="width:100%; border-collapse: collapse; font-size: 9pt;">
        <thead>
          <tr style="background-color: #f1f5f9; text-align: center; font-weight: bold;">
            <th style="border: 1px solid #000; width: 40px;">S.No.</th>
            <th style="border: 1px solid #000; width: 80px;">Norm/Code</th>
            <th style="border: 1px solid #000;">Description of work/service</th>
            <th style="border: 1px solid #000; width: 50px;">Unit</th>
            <th style="border: 1px solid #000; width: 120px; background-color: #dcfce7;">Total Qty Up to Current MB</th>
            <th style="border: 1px solid #000; width: 90px;">Rate (${currencyCode()})</th>
            <th style="border: 1px solid #000; width: 120px;">Total amount (${currencyCode()})</th>
            <th style="border: 1px solid #000; width: 100px;">Remarks</th>
          </tr>
        </thead>
        <tbody>`;

    let totalAbstractAmount = 0;

    allCategoryHeadings.forEach((category) => {
      const catItems = project.items.filter((i) => (i.chapter || 'General Works') === category);
      if (catItems.length === 0) return;

      tableHtml += `
        <tr style="background-color: #e2e8f0; font-weight: bold;">
          <td colSpan="8" style="border: 1px solid #000; text-transform: uppercase; padding: 6px 8px;">
            📌 Section: ${category}
          </td>
        </tr>`;

      catItems.forEach((item, idx) => {
        const rate = getItemUnitRate(item);
        const thisBillQty = getItemValuationQuantity(item.id, true);
        const prevBillQty = getPreviousBillQuantity(item.id);
        const cumQty = prevBillQty + thisBillQty;
        const amount = cumQty * rate;
        totalAbstractAmount += amount;

        const precision = item.precision ?? 2;
        const itemValRows = getItemValuationRows(item.id);
        const remarks = itemValRows?.[0]?.remarks || activeBook.remarks || '-';

        tableHtml += `
          <tr>
            <td style="text-align: center; border: 1px solid #000;">${idx + 1}</td>
            <td style="text-align: center; font-weight: bold; border: 1px solid #000;">${item.item_code}</td>
            <td style="border: 1px solid #000;">${item.description}</td>
            <td style="text-align: center; border: 1px solid #000;">${item.unit}</td>
            <td style="text-align: right; font-weight: bold; border: 1px solid #000; background-color: #f0fdf4; color: #15803d;">${cumQty.toFixed(precision)}</td>
            <td style="text-align: right; border: 1px solid #000;">${rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="text-align: right; font-weight: bold; border: 1px solid #000;">${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="border: 1px solid #000; font-size: 8.5pt;">${remarks}</td>
          </tr>`;
      });
    });

    // Financial calculations for printable Abstract HTML
    const subTotalAmount = totalAbstractAmount;
    
    // Calculate Grand Estimate Amount matching BOQ/Estimate Abstract (Direct items + Tax + Provisional Sums + Contingency)
    const directEstimateSubtotal = project.items.reduce((acc, item) => {
      const rate = getItemUnitRate(item);
      return acc + ((item.estimated_quantity || 0) * rate);
    }, 0);

    const provItems = project.provisional_items || [];
    const provSumTotal = provItems.length > 0
      ? provItems.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.rate || 0)), 0)
      : (project.provisional_sum !== undefined ? Number(project.provisional_sum) : 0);

    const taxPercent = rateMode === 'user' ? 0 : (project.tax_percent ?? 0);
    const taxAmount = directEstimateSubtotal * (taxPercent / 100);
    const subtotalWithTaxAndPS = directEstimateSubtotal + taxAmount + provSumTotal;

    const userCfg = project.user_estimate_config || {};
    const autoContingency = userCfg.auto_contingency_enabled !== false;
    const allocatedBudget = Number(project.allocated_budget_amount) || 0;
    const baseForSlab = allocatedBudget > 0 ? allocatedBudget : subtotalWithTaxAndPS;

    let contPercent = 3.0;
    if (autoContingency) {
      if (baseForSlab <= 300000) contPercent = 2.0;
      else if (baseForSlab <= 2000000) contPercent = 1.5;
      else contPercent = 1.0;
    } else {
      contPercent = userCfg.manual_contingency_percent ?? (project.contingency_percent !== undefined ? Number(project.contingency_percent) : 3.0);
    }

    const calcBasis = userCfg.contingency_calc_basis || 'net_budget';
    let baseAmountForContingency = subtotalWithTaxAndPS;
    if (calcBasis === 'allocated_budget' || calcBasis === 'net_budget') {
      baseAmountForContingency = allocatedBudget > 0 ? allocatedBudget : subtotalWithTaxAndPS;
    } else if (calcBasis === 'grand_total') {
      baseAmountForContingency = directEstimateSubtotal;
    }

    const contingencyAmount = Math.round(baseAmountForContingency * (contPercent / 100) * 100) / 100;
    const grandEstimateAmount = (subtotalWithTaxAndPS + contingencyAmount) || 1;

    const netAllocatedBudget = Math.max(0, allocatedBudget - contingencyAmount);
    const targetBudget = allocatedBudget > 0
      ? (calcBasis === 'net_budget' ? netAllocatedBudget : allocatedBudget)
      : grandEstimateAmount;

    // = *
    const authorityGrant = grandEstimateAmount > 0
      ? Math.round((subTotalAmount * targetBudget) / grandEstimateAmount * 100) / 100
      : subTotalAmount;

    const contingencyPercent = project.user_estimate_config?.contingency_percent_valuation ?? contPercent;
    const contingencyDeduction = Math.round((authorityGrant * contingencyPercent) / 100 * 100) / 100;

    // =
    const publicParticipationAmount = Math.max(0, Math.round((subTotalAmount - authorityGrant) * 100) / 100);

    const isFirstAndFinalMB = activeBook.ipc_number === 1 || activeBook.title?.toLowerCase().includes('first & final');
    const previousAuthorityContribution = isFirstAndFinalMB ? 0 : (project.user_estimate_config?.previous_installment_amount ?? 0);

    // =
    const netAuthorityPayable = Math.max(0, authorityGrant - contingencyDeduction - previousAuthorityContribution);

    const sigsHtml = signatures.map(sig => `
      <td style="border: none !important; text-align: center; vertical-align: bottom; padding: 10px;">
        _______________________<br/>
        <b>${sig.title}</b><br/>
        <span style="font-size: 8pt; color: #444;">${sig.designation}</span><br/>
        <span style="font-size: 7.5pt; color: #666;">Date: ${activeBook?.date_iso || ''}</span>
      </td>
    `).join('');

    tableHtml += `
        </tbody>
        <tfoot>
          <tr style="background-color: #f1f5f9; font-weight: bold; font-size: 9.5pt;">
            <td colSpan="6" style="text-align: right; border: 1px solid #000; padding: 6px 8px;">Sub Total Amount:</td>
            <td style="text-align: right; border: 1px solid #000; font-weight: bold; padding: 6px 8px;">${currencyCode()} ${subTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="border: 1px solid #000; font-size: 8pt; text-align: center;">Total Executed Work</td>
          </tr>
          <tr style="background-color: #f8fafc; font-weight: bold; font-size: 9pt;">
            <td colSpan="6" style="text-align: right; border: 1px solid #000; padding: 5px 8px;">Grand Estimate Amount Incl. P.S.:</td>
            <td style="text-align: right; border: 1px solid #000; padding: 5px 8px;">${currencyCode()} ${grandEstimateAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="border: 1px solid #000; font-size: 8pt; text-align: center;">Estimate Base</td>
          </tr>
          <tr style="background-color: #f0fdf4; font-weight: bold; font-size: 9.5pt;">
            <td colSpan="6" style="text-align: right; border: 1px solid #000; padding: 6px 8px;">
Authority Grant Share:
            </td>
            <td style="text-align: right; border: 1px solid #000; color: #166534; padding: 6px 8px;">${currencyCode()} ${authorityGrant.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="border: 1px solid #000; font-size: 8pt; text-align: center;">Grant Share</td>
          </tr>
          <tr style="background-color: #eef2ff; font-weight: bold; font-size: 9pt;">
            <td colSpan="6" style="text-align: right; border: 1px solid #000; padding: 5px 8px;">
              Contingency deduction (${contingencyPercent}% Contingency Deduction):
            </td>
            <td style="text-align: right; border: 1px solid #000; color: #3730a3; padding: 5px 8px;">${currencyCode()} ${contingencyDeduction.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="border: 1px solid #000; font-size: 8pt; text-align: center;">Deduction</td>
          </tr>
          <tr style="background-color: #faf5ff; font-weight: bold; font-size: 9pt;">
            <td colSpan="6" style="text-align: right; border: 1px solid #000; padding: 5px 8px;">
Public Participation =:
            </td>
            <td style="text-align: right; border: 1px solid #000; color: #6b21a8; padding: 5px 8px;">${currencyCode()} ${publicParticipationAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="border: 1px solid #000; font-size: 8pt; text-align: center;">User Share</td>
          </tr>
          ${!isFirstAndFinalMB || previousAuthorityContribution > 0 ? `
          <tr style="background-color: #fffbeb; font-weight: bold; font-size: 9pt;">
            <td colSpan="6" style="text-align: right; border: 1px solid #000; padding: 5px 8px;">
Previous Authority Contribution Paid:
            </td>
            <td style="text-align: right; border: 1px solid #000; color: #92400e; padding: 5px 8px;">{currencyCode()} ${previousAuthorityContribution.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="border: 1px solid #000; font-size: 8pt; text-align: center;">Previous Deducted</td>
          </tr>
          ` : ''}
          <tr style="background-color: #15803d; color: #ffffff; font-weight: bold; font-size: 11pt;">
            <td colSpan="6" style="text-align: right; border: 1px solid #000; padding: 8px;">
Net Authority Amount Payable:
            </td>
            <td style="text-align: right; border: 1px solid #000; font-weight: 900; padding: 8px;">${currencyCode()} ${netAuthorityPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="border: 1px solid #000; font-size: 8pt; text-align: center; color: #dcfce7;">Net Payable</td>
          </tr>
        </tfoot>
      </table>

      <div style="margin-top: 40px; page-break-inside: avoid;">
        <table style="width: 100%; border: none !important; margin-top: 30px; font-size: 9pt;">
          <tr style="border: none !important; text-align: center;">
            ${sigsHtml}
          </tr>
        </table>
      </div>
    `;

    downloadPrintableHTML({
      title: `Valuation Estimate Abstract (${activeBook.mb_number})`,
      projectTitle: headerMetadata.projectName,
      zone: selectedZone.name_en,
      fiscalYear: selectedFY,
      customHeaderHtml: '',
      subtitle: `${activeBook.title} — Valuation Abstract`,
      tableHtml,
      filename: `Valuation_Abstract_${activeBook.mb_number}.html`,
      orientation: 'portrait'
    });
  };

  const handleExportExcel = () => {
    exportMBToExcel(project, selectedZone, selectedFY);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* UNIFIED MODULE WORKBENCH CONTROL BAR */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-3 border border-slate-800 print:hidden">
        {/* Left: Context Mode Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider hidden sm:inline">Context Mode:</span>
          <div className="bg-slate-800 p-1 rounded-xl flex items-center border border-slate-700">
            <button
              onClick={() => {
                if (onNavigateToTab) onNavigateToTab('mb');
                showToast('Switched context to Estimate Preparation Mode');
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
            >
              <span>📋</span> Estimate Mode
            </button>
            <button
              onClick={() => {
                if (onNavigateToTab) onNavigateToTab('valuation-mb');
                showToast('Switched context to Post-Contract Valuation Mode');
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition bg-emerald-600 text-white shadow-2xs cursor-pointer"
            >
              <span>📈</span> Valuation Mode
            </button>
          </div>
        </div>

        {/* Center/Right: Unified Single-Module Sub-Tabs */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => onNavigateToTab && onNavigateToTab('valuation-mb')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition bg-blue-600 text-white shadow-2xs cursor-pointer"
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>1. Valuation MB</span>
          </button>
          <button
            onClick={() => onNavigateToTab && onNavigateToTab('valuation-abstract')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>2. Valuation Abstract</span>
          </button>
          <button
            onClick={() => onNavigateToTab && onNavigateToTab('valuation-resources')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>3. Valuation Resources</span>
          </button>
        </div>
      </div>

      {/* Compact / Minimized Header Toggle Bar */}
      {isHeaderMinimized ? (
        <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Module 4: Valuation MB
            </span>
            <span className="text-xs font-bold text-slate-800">
              {activeBook?.mb_number}: {activeBook?.title} (Measurement no: {activeBook.ipc_number === 1 ? 'First' : activeBook.ipc_number === 2 ? 'Second' : `${activeBook.ipc_number} th`})
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Zone: {selectedZone.name_en} | FY: {selectedFY} | {project.items.length} Work Items
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsHeaderMinimized(false)}
            className="flex items-center space-x-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition cursor-pointer"
          >
            <span>Expand Header 🔽</span>
          </button>
        </div>
      ) : (
        <>
          {/* Main Control & Action Bar */}
          <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                  <Ruler className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm font-bold text-slate-900 leading-none">
                      Valuation MB & Grid
                    </h1>
                    <span className="text-[10px] font-bold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Module 4
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {project.items.length} Items • {totalSubRowsCount} Sub-Rows • {selectedZone.name_en} ({selectedFY})
                  </p>
                </div>
              </div>

              {/* Active Valuation MB Selector */}
              <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-500">MB:</span>
                <select
                  value={activeBookId}
                  onChange={(e) => setActiveBookId(e.target.value)}
                  className="text-xs font-bold text-slate-900 bg-transparent border-none focus:ring-0 cursor-pointer"
                >
                  {activeBooks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.mb_number}: {b.title} (IPC #{b.ipc_number || 1})
                    </option>
                  ))}
                </select>
              </div>

              {/* Compact Sub-MB selector if multiple sub-books exist */}
              {subBooks && subBooks.length > 1 && (
                <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                  <span className="text-[11px] font-semibold text-slate-500">Sub:</span>
                  <select
                    value={activeSubMBId}
                    onChange={(e) => setActiveSubMBId(e.target.value)}
                    className="text-xs font-bold text-slate-900 bg-transparent border-none focus:ring-0 cursor-pointer"
                  >
                    <option value="all">All Combined ({subBooks.length})</option>
                    {subBooks.map((sb) => (
                      <option key={sb.id} value={sb.id}>
                        {sb.code}: {sb.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Bill Type Toggle: Running Bill vs Final Valuation MB */}
              {activeBook && (
                <button
                  type="button"
                  onClick={() => handleToggleBookFinalType(activeBook.id)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                    activeBook.bill_type === 'FINAL_VALUATION'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  }`}
                  title="Click to toggle between Running Bill and Final Valuation MB"
                >
                  {activeBook.bill_type === 'FINAL_VALUATION' ? '⚡ Final VMB' : '📋 Running Bill'}
                </button>
              )}
            </div>

            {/* Icon-Only Action Buttons + More Menu */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* + Add Valuation MB (VMB) - Icon Only */}
              <button
                type="button"
                id="btn-add-vmb-icon"
                onClick={() => {
                  setManageModalTab('create');
                  setShowManageBooksModal(true);
                }}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-2xs cursor-pointer flex items-center justify-center"
                title="Add Valuation MB (VMB)"
                aria-label="Add Valuation MB"
              >
                <BookPlus className="w-4 h-4" />
              </button>

              {/* + Add Work Item */}
              <button
                type="button"
                onClick={() => setIsAddItemModalOpen(true)}
                className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-2xs cursor-pointer"
                title="Add Work Item"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Print MB */}
              <button
                type="button"
                onClick={handlePrintMB}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition shadow-2xs cursor-pointer"
                title="Print Measurement Book"
              >
                <Printer className="w-4 h-4 text-amber-400" />
              </button>

              {/* Consolidated More Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg transition cursor-pointer shadow-2xs"
                  title="More Options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {isMoreMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsMoreMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-medium animate-fadeIn">
                      <div className="px-3 py-1 text-[10px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-100">
                        Valuation MB Tools
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setIsEditingHeader(true);
                        }}
                        className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-blue-50 text-slate-700 hover:text-blue-800 transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Edit Headings & Meta</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setIsPSModalOpen(true);
                        }}
                        className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-amber-50 text-slate-700 hover:text-amber-800 transition cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>+ Add P.S. Item</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setManageModalTab('create');
                          setShowManageBooksModal(true);
                        }}
                        className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-red-50 text-slate-700 hover:text-red-800 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>+ Add New Valuation MB</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setNewSubMBCode(`VMB-0${subBooks.length + 1}`);
                          setNewSubMBTitle(`${subBooks.length + 1}th Sub-Valuation MB`);
                          setNewSubMBRemarks('');
                          setIsAddSubMBModalOpen(true);
                        }}
                        className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition cursor-pointer"
                      >
                        <FolderPlus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>+ Add Sub-Valuation MB</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setManageModalTab('list');
                          setShowManageBooksModal(true);
                        }}
                        className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Manage Valuation Books ({activeBooks.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          exportValuationMBToExcel(project, activeBook, valuationRows, selectedZone, selectedFY, activeSubMBId);
                        }}
                        className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition cursor-pointer border-t border-slate-100"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Export Excel (.xlsx)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setIsOfficeSyncModalOpen(true);
                        }}
                        className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-teal-50 text-slate-700 hover:text-teal-800 transition cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>Excel Live Sync</span>
                      </button>

                      <label
                        className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-blue-50 text-slate-700 hover:text-blue-800 transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Import Excel / CSV</span>
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={(e) => {
                            setIsMoreMenuOpen(false);
                            handleImportExcelToValuationMB(e);
                          }}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setLinkModalOpen(true);
                        }}
                        className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                      >
                        <Link2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Cell Link Guide</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setIsHeaderMinimized(!isHeaderMinimized);
                        }}
                        className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-100 text-slate-700 transition cursor-pointer border-t border-slate-100"
                      >
                        <ChevronUp className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{isHeaderMinimized ? 'Expand Header' : 'Minimize Header'}</span>
                      </button>

                      <div className="border-t border-slate-100 px-3 py-2 space-y-1.5 bg-slate-50/50">
                        <div className="text-[10px] font-bold uppercase text-slate-400">Print Configuration</div>
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <span className="text-slate-600">Target:</span>
                          <select
                            value={printTargetSubMBId}
                            onChange={(e) => setPrintTargetSubMBId(e.target.value)}
                            className="bg-white border border-slate-200 text-xs font-bold text-blue-900 px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            <option value="all">Combined Summary</option>
                            {subBooks.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.code}: {b.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <span className="text-slate-600">Layout:</span>
                          <select
                            value={printOrientation}
                            onChange={(e) => setPrintOrientation(e.target.value as 'portrait' | 'landscape')}
                            className="bg-white border border-slate-200 text-xs font-medium text-slate-700 px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            <option value="portrait">Portrait</option>
                            <option value="landscape">Landscape</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* COMBINED VALUATION MB DISPLAY MODE TOGGLE BAR */}
          {activeSubMBId === 'all' && (
            <div className="bg-slate-100 border border-slate-300 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden shadow-xs mt-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black text-slate-800">Combined View Mode:</span>
                <div className="inline-flex flex-wrap rounded-xl border border-slate-300 bg-white p-1 shadow-2xs gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCombinedValDisplayMode('both');
                      setExpandAllItems(true);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      combinedValDisplayMode === 'both'
                        ? 'bg-emerald-800 text-white shadow-2xs font-extrabold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>📊 Matrix & Detailed Rows (All-in-One)</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${combinedValDisplayMode === 'both' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-700'}`}>Recommended</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCombinedValDisplayMode('matrix')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      combinedValDisplayMode === 'matrix'
                        ? 'bg-emerald-800 text-white shadow-2xs font-extrabold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>📊 Quantity Matrix Only</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCombinedValDisplayMode('details')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      combinedValDisplayMode === 'details'
                        ? 'bg-emerald-800 text-white shadow-2xs font-extrabold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>📝 Detailed Rows Only</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExpandAllItems(!expandAllItems)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-2xs"
                  title="Expand or collapse detail measurement rows for all work items"
                >
                  {expandAllItems ? <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{expandAllItems ? 'Collapse All Details' : 'Expand All Item Details'}</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* DYNAMIC CATEGORY HEADINGS MANAGER - MB Sections (Shown only in Grid Mode) */}
      {viewMode === 'grid' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200">
        <div
          className="px-4 py-2.5 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
          onClick={() => setIsCategoryManagerExpanded(!isCategoryManagerExpanded)}
        >
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-blue-50 text-blue-700 rounded-md">
              <FolderPlus className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Work Sections & Headings
              </h3>
              <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                {allCategoryHeadings.length} Headings
              </span>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex items-center p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            title={isCategoryManagerExpanded ? 'Collapse' : 'Expand'}
          >
            {isCategoryManagerExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {isCategoryManagerExpanded && (
          <div className="p-5 border-t border-slate-200 space-y-4 bg-white">
            <form onSubmit={handleAddCategoryHeading} className="flex items-center space-x-2 max-w-lg">
              <input
                type="text"
                placeholder="e.g. Protection Works, Culvert..."
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="submit"
                className="inline-flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Heading</span>
              </button>
            </form>

            {/* AVAILABLE SECTION HEADINGS */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                AVAILABLE SECTION HEADINGS:
              </span>
              <div className="flex flex-wrap gap-2">
                {allCategoryHeadings.map((catName) => {
                  const catItemsCount = project.items.filter((i) => (i.chapter || 'General Works') === catName).length;
                  return (
                    <div
                      key={catName}
                      className="inline-flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-semibold">{catName}</span>
                      <span className="text-[10px] text-slate-500 bg-white border border-slate-200 rounded-full px-1.5 py-0.2">
                        {catItemsCount} items
                      </span>
                      {catName !== 'General Works' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategoryHeading(catName);
                          }}
                          className="p-0.5 text-slate-400 hover:text-red-600 rounded transition-colors ml-1"
                          title={`Delete "${catName}" heading`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* OFFICIAL HEADER CARD FOR VALUATION MB - Shown only when editing via More menu */}
      {activeBook && isEditingHeader && (
        <div id="valuation-mb-headings-editor" className="bg-white rounded-2xl border-2 border-blue-200 p-5 shadow-md space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="inline-block px-3 py-1 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs font-black tracking-wider shadow-2xs">
Measurement Book
              </span>
              <span className="text-xs font-bold text-slate-700">
                Measurement no: <span className="text-blue-700 font-extrabold">{activeBook.ipc_number === 1 ? 'First' : activeBook.ipc_number === 2 ? 'Second' : `${activeBook.ipc_number} th`} (IPC #{activeBook.ipc_number})</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300">
                Sheet no: <span className="font-mono text-slate-900 font-extrabold">{headerMetadata.pageNo || activeBook.page_start || 1}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingHeader(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs border border-slate-300 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
              >
 ✖️ Close
              </button>
            </div>
          </div>

          {/* EDITABLE HEADER FORM GRID */}
          <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-blue-200 pb-2">
              <h4 className="font-black text-blue-950 uppercase text-xs">Edit Official Headings & Metadata Details</h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingHeader(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs border border-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveHeaderMetadata}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-2xs cursor-pointer"
                >
                  💾 Save Headings & Footings
                </button>
              </div>
            </div>

            {/* 1. EDITABLE TOP DOCUMENT HEADINGS */}
            <div className="space-y-2 border-b border-blue-200 pb-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-blue-950 uppercase text-xs">Top Document Headings</span>
                <button
                  type="button"
                  onClick={handleAddTopHeading}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Top Heading</span>
                </button>
              </div>
              <div className="space-y-2">
                {customTopHeadings.map((h, index) => (
                  <div key={h.id} className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-blue-800 w-12 shrink-0">Title {index + 1}:</span>
                    <input
                      type="text"
                      value={h.text}
                      onChange={(e) => handleTopHeadingChange(h.id, e.target.value)}
                      className="flex-1 bg-white px-2.5 py-1.5 border border-blue-200 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Upper heading text..."
                    />
                    {customTopHeadings.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTopHeading(h.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition cursor-pointer"
                        title="Remove Heading"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 2. EDITABLE METADATA FIELDS */}
            <div className="space-y-2 border-b border-blue-200 pb-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-blue-950 uppercase text-xs">Metadata Details</span>
                <button
                  type="button"
                  onClick={handleAddCustomMetadataField}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Field</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {customMetadataFields.map((field) => (
                  <div key={field.id} className="flex items-center gap-1.5 bg-white p-2 border border-blue-200 rounded-lg shadow-2xs">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => handleCustomMetadataChange(field.id, 'label', e.target.value)}
                      placeholder="Label"
                      className="w-1/2 text-xs font-bold text-slate-800 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => handleCustomMetadataChange(field.id, 'value', e.target.value)}
                      placeholder="Value"
                      className="w-1/2 text-xs text-slate-900 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {customMetadataFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomMetadataField(field.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition shrink-0 cursor-pointer"
                        title="Delete Field"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 3. EDITABLE SIGNATURE HEADINGS */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <span className="font-black text-blue-950 uppercase text-xs">Signature Block Headings / Footings</span>
                <button
                  type="button"
                  onClick={handleAddSignature}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Footing</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {signatures.map((sig, index) => (
                  <div key={sig.id} className="p-2.5 bg-white border border-blue-200 rounded-lg space-y-1.5 shadow-2xs relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider">
                        Item {index + 1}
                      </span>
                      {signatures.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSignature(sig.id)}
                          className="text-red-500 hover:text-red-700 p-0.5 rounded hover:bg-red-50 transition cursor-pointer"
                          title="Remove Heading"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={sig.title}
                      onChange={(e) => handleSignatureChange(sig.id, 'title', e.target.value)}
                      placeholder="Title"
                      className="w-full text-xs font-bold text-slate-900 border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={sig.designation}
                      onChange={(e) => handleSignatureChange(sig.id, 'designation', e.target.value)}
                      placeholder="Designation"
                      className="w-full text-[11px] text-slate-600 border border-slate-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 gap-2">
              <button
                type="button"
                onClick={() => setIsEditingHeader(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-300 transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleSaveHeaderMetadata}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow cursor-pointer"
              >
                ✓ Save Headings & Footings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 1: VALUATION MB GRID */}
      {viewMode === 'grid' && (
        <div className="space-y-4">
          {/* COMBINED VALUATION MB QUANTITY MATRIX SUMMARY TABLE */}
          {activeSubMBId === 'all' && (combinedValDisplayMode === 'matrix' || combinedValDisplayMode === 'both') && project.items.length > 0 && (
            <div className="bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden mb-6">
              <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4.5 h-4.5 text-emerald-400" />
                  <h3 className="font-black text-sm tracking-wide">
                    Combined Valuation MB Executed Quantity Matrix (By Sub-MB Titles)
                  </h3>
                </div>
                <span className="text-xs text-amber-300 font-bold bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                  Summed up from {subBooks.length} Valuation Sub-MBs
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 uppercase text-[10px] font-extrabold text-slate-700 border-b-2 border-slate-300">
                    <tr>
                      <th className="p-3 text-center w-12 border-r border-slate-300">S.N.</th>
                      <th className="p-3 w-28 border-r border-slate-300">Item Code</th>
                      <th className="p-3 min-w-[240px] border-r border-slate-300">Description / Particulars</th>
                      <th className="p-3 text-center w-20 border-r border-slate-300">Unit</th>
                      {subBooks.map((sb) => (
                        <th key={sb.id} className="p-3 text-right min-w-[130px] border-r border-slate-300 bg-emerald-50/80 text-emerald-950 font-black">
                          <div className="flex flex-col items-end">
                            <span>{sb.code}</span>
                            <span className="text-[9px] font-medium text-slate-500 truncate max-w-[120px]">{sb.title}</span>
                          </div>
                        </th>
                      ))}
                      <th className="p-3 text-right min-w-[140px] bg-emerald-100/90 text-emerald-950 font-black text-xs">
                        <div className="flex flex-col items-end">
                          <span>Summed Executed Qty</span>
                          <span className="text-[9px] font-medium text-emerald-800">(This Bill Total)</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {project.items.map((item, idx) => {
                      const precision = item.precision ?? 2;
                      const allValRows = getItemValuationRows(item.id, true);
                      const totalThisBillQty = getItemValuationQuantity(item.id, true);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 text-center font-bold text-slate-600 border-r border-slate-200">{idx + 1}</td>
                          <td className="p-3 font-mono font-bold text-blue-700 border-r border-slate-200 bg-blue-50/30">{item.item_code}</td>
                          <td className="p-3 border-r border-slate-200 font-semibold text-slate-900">{item.description}</td>
                          <td className="p-3 text-center font-medium text-slate-600 border-r border-slate-200">{item.unit}</td>
                          {subBooks.map((sb) => {
                            const defaultSbId = subBooks[0]?.id || 'vmb_sub_1';
                            const rowsForSb = allValRows.filter((r) => (r.mb_book_id || defaultSbId) === sb.id);
                            const sbQty = rowsForSb.reduce((sum, r) => sum + (r.quantity_this_bill || 0), 0);
                            return (
                              <td key={sb.id} className="p-3 text-right font-mono font-bold text-emerald-900 border-r border-slate-200 bg-emerald-50/30">
                                {sbQty > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => setActiveSubMBId(sb.id)}
                                    className="hover:underline hover:text-emerald-700 cursor-pointer text-xs"
                                    title={`Click to view/edit ${sb.code}`}
                                  >
                                    {sbQty.toFixed(precision)}
                                  </button>
                                ) : (
                                  <span className="text-slate-300 font-normal">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-3 text-right font-mono font-black text-emerald-900 bg-emerald-100/70 text-sm">
                            {totalThisBillQty.toFixed(precision)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-900 text-white font-extrabold text-xs">
                    <tr>
                      <td colSpan={4 + subBooks.length} className="p-3 text-right">
                        Total Measured Work Items:
                      </td>
                      <td className="p-3 text-right font-mono font-black text-amber-300 text-sm">
                        {project.items.length} Items
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
          {(activeSubMBId !== 'all' || combinedValDisplayMode === 'details' || combinedValDisplayMode === 'both') && (
            project.items.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
                <Ruler className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-700">No Work Items Found in Valuation MB</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Start recording valuation site measurements by adding work items.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsAddItemModalOpen(true)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Work Item</span>
                  </button>
                </div>
              </div>
            ) : (
              project.items.map((item, index) => {
              const isExpanded = expandAllItems || expandedItemId === item.id;
              const unitRate = getItemUnitRate(item);
              const valQty = getItemValuationQuantity(item.id);
              const valTotalAmount = valQty * unitRate;
              const itemValRows = getItemValuationRows(item.id);

              const defaultCalcCols = ['no_of_units', 'length', 'breadth', 'height', ...(item.custom_column_names || [])];
              const includedCols = item.included_calc_columns || defaultCalcCols;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200"
                >
                  {/* Item Card Header */}
                  <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-800 text-white text-xs font-bold shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                            Norm {item.item_code}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">• Unit: {item.unit}</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          {item.description}
                        </h3>

                        {/* Settings Bar: Category Headings & Decimal Precision */}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                          <div className="flex items-center space-x-1 text-slate-600">
                            <span className="font-semibold text-slate-500 text-[11px] uppercase">SECTION HEADING:</span>
                            <select
                              value={item.chapter || 'General Works'}
                              onChange={(e) => handleUpdateItemChapter(item.id, e.target.value)}
                              className="text-xs font-semibold text-blue-700 bg-white border border-slate-300 rounded px-2 py-0.5 focus:ring-1 focus:ring-blue-500"
                            >
                              {allCategoryHeadings.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center space-x-2 text-slate-600">
                            <div className="flex items-center space-x-1">
                              <span className="font-semibold text-slate-500 text-[11px] uppercase">PRECISION:</span>
                              <select
                                value={item.precision ?? 2}
                                onChange={(e) => handleUpdateItemPrecision(item.id, parseInt(e.target.value, 10))}
                                className="text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded px-2 py-0.5 focus:ring-1 focus:ring-blue-500"
                              >
                                <option value={2}>2 Decimals (0.00)</option>
                                <option value={3}>3 Decimals (0.000)</option>
                                <option value={4}>4 Decimals (0.0000)</option>
                              </select>
                            </div>

                            <label className="flex items-center space-x-1 cursor-pointer text-slate-700 bg-white border border-slate-300 rounded px-2 py-0.5 hover:bg-slate-50" title="Truncate quantity decimal places instead of rounding">
                              <input
                                type="checkbox"
                                checked={item.truncate_quantity ?? project.user_estimate_config?.truncate_quantity ?? false}
                                onChange={(e) => handleUpdateItemTruncate(item.id, e.target.checked)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                              />
                              <span className="text-[11px] font-bold text-slate-700 uppercase">Truncate</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Side Totals & Actions */}
                    <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200">
                      <div className="text-left lg:text-right">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">EXECUTED QUANTITY</div>
                        <div className="text-sm font-black text-slate-900">
                          {(() => {
                            const prec = item.precision ?? 2;
                            const trunc = item.truncate_quantity ?? project.user_estimate_config?.truncate_quantity ?? false;
                            const factor = Math.pow(10, prec);
                            const q = trunc
                              ? (valQty >= 0 ? Math.floor(valQty * factor + 0.0000000001) : Math.ceil(valQty * factor - 0.0000000001)) / factor
                              : valQty;
                            return q.toFixed(prec);
                          })()} {item.unit}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleAddSubRow(item.id)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 transition-colors shadow-sm"
                          title="Add sub-measurement row"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Detail Row</span>
                        </button>

                        <button
                          onClick={() => {
                            setTargetItemIdForCol(item.id);
                            setIsCustomColModalOpen(true);
                          }}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded hover:bg-slate-900 transition-colors shadow-sm"
                          title="Add custom measurement column"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Custom Col</span>
                        </button>

                        <button
                          onClick={() => setItemToDelete({ id: item.id, item_code: item.item_code, description: item.description })}
                          className="p-1.5 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded transition-colors"
                          title="Delete work item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                          className="p-1.5 text-slate-500 hover:bg-slate-200 rounded transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Measurement Details Table */}
                  {isExpanded && (
                    <div className="p-4 space-y-3">
                      {/* Sub-MB Breakdown Bar for Combined View */}
                      {activeSubMBId === 'all' && subBooks.length > 1 && (
                        <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-emerald-950 uppercase text-[10px] tracking-wider flex items-center gap-1">
                              <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Sub-MB Breakdown:</span>
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {subBooks.map((sb) => {
                                const defaultSbId = subBooks[0]?.id || 'vmb_sub_1';
                                const rowsForSb = getItemValuationRows(item.id, true).filter((r) => (r.mb_book_id || defaultSbId) === sb.id);
                                const sbQty = rowsForSb.reduce((sum, r) => sum + (r.quantity_this_bill || 0), 0);
                                return (
                                  <button
                                    key={sb.id}
                                    type="button"
                                    onClick={() => setActiveSubMBId(sb.id)}
                                    className="inline-flex items-center gap-1 bg-white border border-emerald-300 hover:border-emerald-500 rounded-md px-2 py-0.5 text-xs font-bold text-emerald-900 shadow-2xs transition cursor-pointer"
                                    title={`Click to switch view to ${sb.code} (${sb.title})`}
                                  >
                                    <span className="text-[10px] text-emerald-700 font-mono">{sb.code}:</span>
                                    <span className="font-mono font-black">{sbQty.toFixed(item.precision ?? 2)}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-black text-emerald-950 bg-emerald-100/90 px-2.5 py-1 rounded-md border border-emerald-300">
                            <span>Combined Executed Qty:</span>
                            <span className="font-mono text-xs font-black">{valQty.toFixed(item.precision ?? 2)} {item.unit}</span>
                          </div>
                        </div>
                      )}
                      {/* Column Ticking Checkboxes Bar (like Estimate MB) */}
                      <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <span className="font-bold text-slate-700 text-[11px] uppercase">Included Calculation Columns:</span>
                        {[
                          { key: 'no_of_units', label: 'No.' },
                          { key: 'length', label: 'Length (L)' },
                          { key: 'breadth', label: 'Breadth (B)' },
                          { key: 'height', label: 'Height (H)' },
                          ...(item.custom_column_names || []).map((c) => ({ key: c, label: c }))
                        ].map(({ key, label }) => {
                          const isIncluded = includedCols.includes(key);
                          return (
                            <label
                              key={key}
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded border text-xs font-semibold cursor-pointer transition-colors ${
                                isIncluded
                                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                                  : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isIncluded}
                                onChange={() => handleToggleCalcColumn(item.id, key)}
                                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                              />
                              <span>{label}</span>
                            </label>
                          );
                        })}
                      </div>

                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                              <th className="p-2.5 min-w-[200px]">Particulars / Sub-Measurement Location</th>
                              <th className={`p-2.5 w-20 text-center ${!includedCols.includes('no_of_units') ? 'opacity-40 bg-slate-200/50' : ''}`}>No.</th>
                              <th className={`p-2.5 w-24 text-center ${!includedCols.includes('length') ? 'opacity-40 bg-slate-200/50' : ''}`}>Length (L)</th>
                              <th className={`p-2.5 w-24 text-center ${!includedCols.includes('breadth') ? 'opacity-40 bg-slate-200/50' : ''}`}>Breadth (B)</th>
                              <th className={`p-2.5 w-24 text-center ${!includedCols.includes('height') ? 'opacity-40 bg-slate-200/50' : ''}`}>Height (H)</th>

                              {/* Render Custom Columns */}
                              {(item.custom_column_names || []).map((colName) => (
                                <th key={colName} className="p-2.5 w-24 text-center bg-blue-50/50 text-blue-900 border-l border-slate-200 relative group">
                                  <span>{colName}</span>
                                  <button
                                    onClick={() => handleRemoveCustomColumn(item.id, colName)}
                                    className="ml-1 text-red-500 hover:text-red-700 hidden group-hover:inline-block"
                                    title="Remove column"
                                  >
                                    ×
                                  </button>
                                </th>
                              ))}

                              <th className="p-2.5 w-28 text-right bg-emerald-50 text-emerald-900">Executed Qty</th>
                              <th className="p-2.5 w-16 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {itemValRows.length === 0 ? (
                              <tr>
                                <td colSpan={6 + (item.custom_column_names?.length || 0)} className="p-6 text-center text-slate-400 italic">
                                  No detail sub-rows added yet. Click "+ Detail Row" above to enter site dimensions.
                                </td>
                              </tr>
                            ) : (
                              itemValRows.map((r, rIdx) => {
                                if (r.is_heading) {
                                  const customColsCount = item.custom_column_names?.length || 0;
                                  return (
                                    <tr key={r.id} className="bg-amber-50 border-y border-amber-200">
                                      <td colSpan={5 + customColsCount} className="p-2 font-bold text-amber-900">
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2">
                                            <span className="text-amber-600">📌</span>
                                            <input
                                              type="text"
                                              value={r.particulars}
                                              onChange={(e) => handleUpdateSubRow(item.id, r.id, 'particulars', e.target.value)}
                                              className="bg-white font-bold text-xs text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500 rounded px-2.5 py-1 w-full max-w-md border border-amber-300"
                                              placeholder="Sub-heading / Section Title..."
                                            />
                                          </div>
                                          <button
                                            onClick={() => handleDeleteSubRow(item.id, r.id)}
                                            className="text-xs bg-red-100 hover:bg-red-200 text-red-800 font-bold px-2.5 py-1 rounded-lg border border-red-300 transition flex items-center gap-1.5 print:hidden"
                                            title="Delete sub-heading"
                                          >
                                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                            <span>Remove Sub-heading</span>
                                          </button>
                                        </div>
                                      </td>
                                      <td className="p-2 text-center">
                                        <button
                                          onClick={() => handleDeleteSubRow(item.id, r.id)}
                                          className="text-red-500 hover:text-red-700 p-1"
                                          title="Delete sub-heading"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                }

                                return (
                                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                                    {/* Particulars */}
                                    <td className="p-2">
                                      <div className="flex items-center gap-1.5">
                                        {activeSubMBId === 'all' && subBooks.length > 1 && (
                                          <select
                                            value={r.mb_book_id || subBooks[0]?.id}
                                            onChange={(e) => handleUpdateSubRow(item.id, r.id, 'mb_book_id', e.target.value)}
                                            className="text-[10px] font-black bg-red-50 text-red-900 border border-red-200 rounded px-1.5 py-1 focus:ring-1 focus:ring-red-500 shrink-0 cursor-pointer"
                                            title="Assign measurement row to a specific Sub Valuation MB Book"
                                          >
                                            {subBooks.map((sb) => (
                                              <option key={sb.id} value={sb.id}>
                                                {sb.code}
                                              </option>
                                            ))}
                                          </select>
                                        )}
                                        <span
                                          className="shrink-0 text-[9px] font-mono font-black text-sky-800 bg-sky-100 border border-sky-200 rounded px-1 py-0.5 print:hidden"
                                          title={`Row ${rIdx + 1}. Use in formulas as L${rIdx + 1}, B${rIdx + 1}, H${rIdx + 1}, N${rIdx + 1}, Q${rIdx + 1}`}
                                        >
                                          R{rIdx + 1}
                                        </span>
                                        <input
                                          type="text"
                                          value={r.particulars}
                                          onChange={(e) => handleUpdateSubRow(item.id, r.id, 'particulars', e.target.value)}
                                          className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 font-medium"
                                          placeholder="Description / Location..."
                                        />
                                      </div>
                                    </td>

                                    {/* No. */}
                                    <td className="p-1 text-center">
                                      <SpreadsheetCell
                                        value={r.no_of_units}
                                        onChange={(val) => handleUpdateSubRow(item.id, r.id, 'no_of_units', val)}
                                        precision={item.precision ?? 2}
                                        isDisabled={!includedCols.includes('no_of_units')}
                                        onEvaluateFormula={(f) => evaluateMBFormula(f, itemValRows as any[], rIdx, valuationEnrichedItems)}
                                        linkTarget={{ itemIdx: valuationEnrichedItems.findIndex((it) => it.id === item.id), rowIdx: rIdx, prop: 'no_of_units' }}
                                      />
                                    </td>

                                    {/* Length */}
                                    <td className="p-1 text-center">
                                      <SpreadsheetCell
                                        value={r.length}
                                        onChange={(val) => handleUpdateSubRow(item.id, r.id, 'length', val)}
                                        precision={item.precision ?? 2}
                                        isDisabled={!includedCols.includes('length')}
                                        onEvaluateFormula={(f) => evaluateMBFormula(f, itemValRows as any[], rIdx, valuationEnrichedItems)}
                                        linkTarget={{ itemIdx: valuationEnrichedItems.findIndex((it) => it.id === item.id), rowIdx: rIdx, prop: 'length' }}
                                      />
                                    </td>

                                    {/* Breadth */}
                                    <td className="p-1 text-center">
                                      <SpreadsheetCell
                                        value={r.breadth}
                                        onChange={(val) => handleUpdateSubRow(item.id, r.id, 'breadth', val)}
                                        precision={item.precision ?? 2}
                                        isDisabled={!includedCols.includes('breadth')}
                                        onEvaluateFormula={(f) => evaluateMBFormula(f, itemValRows as any[], rIdx, valuationEnrichedItems)}
                                        linkTarget={{ itemIdx: valuationEnrichedItems.findIndex((it) => it.id === item.id), rowIdx: rIdx, prop: 'breadth' }}
                                      />
                                    </td>

                                    {/* Height */}
                                    <td className="p-1 text-center">
                                      <SpreadsheetCell
                                        value={r.height}
                                        onChange={(val) => handleUpdateSubRow(item.id, r.id, 'height', val)}
                                        precision={item.precision ?? 2}
                                        isDisabled={!includedCols.includes('height')}
                                        onEvaluateFormula={(f) => evaluateMBFormula(f, itemValRows as any[], rIdx, valuationEnrichedItems)}
                                        linkTarget={{ itemIdx: valuationEnrichedItems.findIndex((it) => it.id === item.id), rowIdx: rIdx, prop: 'height' }}
                                      />
                                    </td>

                                    {/* Custom Columns Inputs */}
                                    {(item.custom_column_names || []).map((colName) => (
                                      <td key={colName} className="p-1 bg-blue-50/20 text-center">
                                        <SpreadsheetCell
                                          value={r.custom_fields?.[colName] ?? ''}
                                          onChange={(val) => handleUpdateCustomField(item.id, r.id, colName, String(val))}
                                          precision={item.precision ?? 2}
                                          onEvaluateFormula={(f) => evaluateMBFormula(f, itemValRows as any[], rIdx, valuationEnrichedItems)}
                                          linkTarget={/^[A-Za-z0-9_]+$/.test(colName) ? { itemIdx: valuationEnrichedItems.findIndex((it) => it.id === item.id), rowIdx: rIdx, prop: colName } : undefined}
                                        />
                                      </td>
                                    ))}

                                    {/* Quantity */}
                                    <td className="p-1 font-bold text-right text-emerald-800 bg-emerald-50/50">
                                      <SpreadsheetCell
                                        value={r.quantity_this_bill || 0}
                                        isReadOnly={true}
                                        linkTarget={{ itemIdx: valuationEnrichedItems.findIndex((it) => it.id === item.id), rowIdx: rIdx, prop: 'qty' }}
                                        precision={item.precision ?? 2}
                                        suffix={item.unit}
                                      />
                                    </td>

                                    {/* Delete Row */}
                                    <td className="p-2 text-center">
                                      <button
                                        onClick={() => handleDeleteSubRow(item.id, r.id)}
                                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                                        title="Delete sub-row"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-100 font-bold border-t border-slate-200 text-slate-900">
                              <td colSpan={5 + (item.custom_column_names?.length || 0)} className="p-2.5 text-right">
                                Total Executed Quantity ({item.unit})
                                {activeSubMBId !== 'all' && activeSubMB ? ` (${activeSubMB.code})` : ''}:
                              </td>
                              <td className="p-2.5 text-right text-emerald-900 bg-emerald-100/80 font-black">
                                <PointTarget
                                  target={{ itemIdx: valuationEnrichedItems.findIndex((it) => it.id === item.id), rowIdx: null, prop: 'qty' }}
                                  title="Click while typing a formula (=) to link this item's total quantity"
                                >
                                  {valQty.toFixed(item.precision ?? 2)}
                                </PointTarget>
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )
        )}

          {/* Bottom Action Bar for Grid View */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="text-xs text-slate-500 font-medium">
              💡 Need to add additional BOQ items or itemized Provisional Sums for valuation?
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsAddItemModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Work Item</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPSModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                title="Add an itemized Provisional Sum (P.S.) item to Valuation MB"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-200" />
                <span>+ P.S. Item</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: VALUATION BILL ABSTRACT */}
      {viewMode === 'abstract' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                Valuation Abstract Statement ({activeBook.mb_number})
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Estimate Abstract format extracting total quantities added up to current MB, rate, total amount, and remarks.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setIsEditingHeader(!isEditingHeader)}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg text-xs shadow-2xs transition cursor-pointer flex items-center gap-1.5"
              >
                {isEditingHeader ? '✖️ View Headings' : '✏️ Edit Headings'}
              </button>

              <button
                onClick={handlePrintValuationAbstract}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition-colors shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Abstract</span>
              </button>
            </div>
          </div>

          {/* ESTIMATE ABSTRACT FORMAT (REQUIREMENT 2) */}
          {abstractFormat === 'estimate' ? (
            <div>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 font-extrabold text-slate-800 border-b border-slate-200 text-center">
                      <th className="p-3 border-r border-slate-200 w-12">S.No.</th>
                      <th className="p-3 border-r border-slate-200 w-28">Norm/Code</th>
                      <th className="p-3 border-r border-slate-200">Work Description</th>
                      <th className="p-3 border-r border-slate-200 w-16">Unit</th>
                      <th className="p-3 border-r border-slate-200 w-36 bg-emerald-100 text-emerald-950 font-black">
Up to Current MB
                      </th>
                      <th className="p-3 border-r border-slate-200 w-28 text-right">{currencyCode()}</th>
                      <th className="p-3 border-r border-slate-200 w-32 text-right bg-emerald-50 text-emerald-950 font-black">
{currencyCode()}
                      </th>
                      <th className="p-3 w-32 text-center">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(() => {
                      let totalAbstractAmount = 0;
                      return (
                        <>
                          {allCategoryHeadings.map((category) => {
                            const catItems = project.items.filter((i) => (i.chapter || 'General Works') === category);
                            if (catItems.length === 0) return null;

                            return (
                              <React.Fragment key={category}>
                                <tr className="bg-slate-200/80 font-bold text-slate-800">
                                  <td colSpan={8} className="p-2.5 uppercase tracking-wider text-[11px]">
                                    📌 Section: {category}
                                  </td>
                                </tr>
                                {catItems.map((item, idx) => {
                                  const rate = getItemUnitRate(item);
                                  const thisBillQty = getItemValuationQuantity(item.id, true);
                                  const prevBillQty = getPreviousBillQuantity(item.id);
                                  const cumQty = prevBillQty + thisBillQty;
                                  const amount = cumQty * rate;
                                  totalAbstractAmount += amount;

                                  const precision = item.precision ?? 2;
                                  const itemValRows = getItemValuationRows(item.id);
                                  const remarks = itemValRows?.[0]?.remarks || activeBook.remarks || '-';

                                  return (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="p-2.5 text-center font-medium border-r border-slate-200">{idx + 1}</td>
                                      <td className="p-2.5 text-center font-bold text-blue-700 border-r border-slate-200">{item.item_code}</td>
                                      <td className="p-2.5 border-r border-slate-200 font-medium text-slate-800">
                                        <div>{item.description}</div>
                                        {(() => {
                                          const allValRowsForCombined = getItemValuationRows(item.id, true);
                                          if (allValRowsForCombined.length === 0) return null;
                                          const map = new Map<string, number>();
                                          allValRowsForCombined.forEach((r) => {
                                            const sbId = r.mb_book_id || subBooks[0]?.id || 'vmb_sub_1';
                                            map.set(sbId, (map.get(sbId) || 0) + (r.quantity_this_bill || 0));
                                          });
                                          const entries = Array.from(map.entries());
                                          if (entries.length === 0) return null;

                                          return (
                                            <div className="mt-1 flex flex-wrap items-center gap-1.5 print:hidden text-[10px]">
                                              <span className="font-extrabold uppercase bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded border border-purple-200">
                                                Combined Valuation MB:
                                              </span>
                                              {entries.map(([sbId, qty]) => {
                                                const sbDef = subBooks.find((s) => s.id === sbId);
                                                return (
                                                  <span key={sbId} className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                                    <span className="font-bold text-blue-800">{sbDef?.code || 'Sub-MB'}:</span> {qty.toFixed(precision)} {item.unit}
                                                  </span>
                                                );
                                              })}
                                            </div>
                                          );
                                        })()}
                                      </td>
                                      <td className="p-2.5 text-center border-r border-slate-200 text-slate-600">{item.unit}</td>
                                      <td className="p-2.5 text-right font-black text-emerald-800 bg-emerald-50/60 border-r border-slate-200">
                                        {cumQty.toFixed(precision)}
                                      </td>
                                      <td className="p-2.5 text-right border-r border-slate-200 font-medium">
                                        {rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                      <td className="p-2.5 text-right font-black text-slate-900 border-r border-slate-200">
                                        {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                      <td className="p-2.5 text-center text-slate-500 text-[11px]">{remarks}</td>
                                    </tr>
                                  );
                                })}
                              </React.Fragment>
                            );
                          })}
                          {/* Summary Footer directly in table columns */}
                          {(() => {
                            const subTotalAmount = totalAbstractAmount;

                             // Calculate Grand Estimate Amount matching BOQ/Estimate Abstract (Direct items + Tax + Provisional Sums + Contingency)
                            const directEstimateSubtotal = project.items.reduce((acc, item) => {
                              const rate = getItemUnitRate(item);
                              return acc + ((item.estimated_quantity || 0) * rate);
                            }, 0);

                            const provItems = project.provisional_items || [];
                            const provSumTotal = provItems.length > 0
                              ? provItems.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.rate || 0)), 0)
                              : (project.provisional_sum !== undefined ? Number(project.provisional_sum) : 0);

                            const taxPercent = rateMode === 'user' ? 0 : (project.tax_percent ?? 0);
                            const taxAmount = directEstimateSubtotal * (taxPercent / 100);
                            const subtotalWithTaxAndPS = directEstimateSubtotal + taxAmount + provSumTotal;

                            const userCfg = project.user_estimate_config || {};
                            const autoContingency = userCfg.auto_contingency_enabled !== false;
                            const allocatedBudget = Number(project.allocated_budget_amount) || 0;
                            const baseForSlab = allocatedBudget > 0 ? allocatedBudget : subtotalWithTaxAndPS;

                            let contPercent = 3.0;
                            if (autoContingency) {
                              if (baseForSlab <= 300000) contPercent = 2.0;
                              else if (baseForSlab <= 2000000) contPercent = 1.5;
                              else contPercent = 1.0;
                            } else {
                              contPercent = userCfg.manual_contingency_percent ?? (project.contingency_percent !== undefined ? Number(project.contingency_percent) : 3.0);
                            }

                            const calcBasis = userCfg.contingency_calc_basis || 'net_budget';
                            let baseAmountForContingency = subtotalWithTaxAndPS;
                            if (calcBasis === 'allocated_budget' || calcBasis === 'net_budget') {
                              baseAmountForContingency = allocatedBudget > 0 ? allocatedBudget : subtotalWithTaxAndPS;
                            } else if (calcBasis === 'grand_total') {
                              baseAmountForContingency = directEstimateSubtotal;
                            }

                            const contingencyAmount = Math.round(baseAmountForContingency * (contPercent / 100) * 100) / 100;
                            const grandEstimateAmount = (subtotalWithTaxAndPS + contingencyAmount) || 1;

                            const netAllocatedBudget = Math.max(0, allocatedBudget - contingencyAmount);
                            const targetBudget = allocatedBudget > 0
                              ? (calcBasis === 'net_budget' ? netAllocatedBudget : allocatedBudget)
                              : grandEstimateAmount;

                            // = *
                            const authorityGrant = grandEstimateAmount > 0
                              ? Math.round((subTotalAmount * targetBudget) / grandEstimateAmount * 100) / 100
                              : subTotalAmount;

                            const contingencyPercent = project.user_estimate_config?.contingency_percent_valuation ?? contPercent;
                            const contingencyDeduction = Math.round((authorityGrant * contingencyPercent) / 100 * 100) / 100;

                            // =
                            const publicParticipationAmount = Math.max(0, Math.round((subTotalAmount - authorityGrant) * 100) / 100);

                            const isFirstAndFinalMB = activeBook.ipc_number === 1 || activeBook.title?.toLowerCase().includes('first & final');
                            const previousAuthorityContribution = isFirstAndFinalMB ? 0 : (project.user_estimate_config?.previous_installment_amount ?? 0);

                            // =
                            const netAuthorityPayable = Math.max(0, authorityGrant - contingencyDeduction - previousAuthorityContribution);

                            return (
                              <>
                                <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                                  <td colSpan={6} className="p-2.5 text-right font-extrabold text-slate-800">Sub Total Amount:</td>
                                  <td className="p-2.5 text-right font-mono font-black text-slate-900 bg-slate-50">
                                    {currencyCode()} {subTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-2.5 text-center text-slate-500 text-[10px]">Total Executed Work</td>
                                </tr>

                                <tr className="bg-slate-50 font-bold text-slate-700">
                                  <td colSpan={6} className="p-2 text-right">Grand Estimate Amount Incl. P.S.:</td>
                                  <td className="p-2 text-right font-mono font-bold text-slate-800">
                                    {currencyCode()} {grandEstimateAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-2 text-center text-slate-500 text-[10px]">Estimated Base</td>
                                </tr>

                                <tr className="bg-emerald-50/80 font-bold text-emerald-950">
                                  <td colSpan={6} className="p-2 text-right">
                                    <span>Authority Grant Share:</span>
                                  </td>
                                  <td className="p-2 text-right font-mono font-black text-emerald-900 bg-emerald-100/50">
                                    {currencyCode()} {authorityGrant.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-2 text-center text-emerald-800 text-[10px]">Authority Grant Share</td>
                                </tr>

                                <tr className="bg-indigo-50/80 font-bold text-indigo-950">
                                  <td colSpan={6} className="p-2 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <span>Contingency deduction ({contingencyPercent}% Contingency Deduction):</span>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={contingencyPercent}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          setProject(prev => ({
                                            ...prev,
                                            user_estimate_config: { ...prev.user_estimate_config, contingency_percent_valuation: val }
                                          }));
                                        }}
                                        className="w-12 text-center bg-white border border-indigo-300 rounded px-1 py-0.2 text-[11px] font-bold text-indigo-950"
                                      />
                                      <span>%</span>
                                    </div>
                                  </td>
                                  <td className="p-2 text-right font-mono font-black text-indigo-900">
                                    {currencyCode()} {contingencyDeduction.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-2 text-center text-indigo-700 text-[10px]">Contingency Deduction</td>
                                </tr>

                                <tr className="bg-purple-50 font-bold text-purple-950">
                                  <td colSpan={6} className="p-2 text-right">
                                    <span>Public Participation =:</span>
                                  </td>
                                  <td className="p-2 text-right font-mono font-black text-purple-900">
                                    {currencyCode()} {publicParticipationAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-2 text-center text-purple-700 text-[10px]">User Share</td>
                                </tr>

                                {!isFirstAndFinalMB || previousAuthorityContribution > 0 ? (
                                  <tr className="bg-amber-50/70 font-bold text-amber-950">
                                    <td colSpan={6} className="p-2 text-right">
                                      <span>Previous Authority Contribution Paid:</span>
                                    </td>
                                    <td className="p-2 text-right font-mono font-black text-amber-900 bg-amber-100/50">
                                      <div className="flex items-center justify-end gap-1">
                                        <span className="text-[10px] text-amber-700">{currencyCode()}</span>
                                        <input
                                          type="number"
                                          value={previousAuthorityContribution}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            setProject(prev => ({
                                              ...prev,
                                              user_estimate_config: { ...prev.user_estimate_config, previous_installment_amount: val }
                                            }));
                                          }}
                                          className="w-28 text-right bg-white border border-amber-300 rounded px-1 py-0.5 text-xs font-mono font-bold text-amber-950 focus:ring-1 focus:ring-amber-500"
                                        />
                                      </div>
                                    </td>
                                    <td className="p-2 text-center text-amber-800 text-[10px]">Previous Paid Grant</td>
                                  </tr>
                                ) : null}

                                <tr className="bg-emerald-700 text-white font-black text-sm border-t-2 border-emerald-900">
                                  <td colSpan={6} className="p-3 text-right uppercase tracking-wide">
Net Authority Amount Payable:
                                  </td>
                                  <td className="p-3 text-right font-mono font-black text-white text-base bg-emerald-800">
                                    {currencyCode()} {netAuthorityPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-3 text-center text-emerald-100 text-[10px]">Net Payable</td>
                                </tr>
                              </>
                            );
                          })()}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-800 border-b border-slate-200 text-center">
                    <th rowSpan={2} className="p-2.5 border-r border-slate-200 w-10">S.N.</th>
                    <th rowSpan={2} className="p-2.5 border-r border-slate-200 w-24">Norm Code</th>
                    <th rowSpan={2} className="p-2.5 border-r border-slate-200">Work Description</th>
                    <th rowSpan={2} className="p-2.5 border-r border-slate-200 w-16">Unit</th>
                    <th rowSpan={2} className="p-2.5 border-r border-slate-200 w-24 text-right">Rate ({currencyCode()})</th>
                    <th colSpan={2} className="p-2.5 border-r border-slate-200 bg-slate-200/50">BOQ Estimate</th>
                    <th colSpan={2} className="p-2.5 border-r border-slate-200 bg-sky-100 text-sky-900">This Bill ({activeBook.mb_number})</th>
                    <th colSpan={2} className="p-2.5 border-r border-slate-200 bg-amber-100 text-amber-900">Previous Cumulative</th>
                    <th colSpan={2} className="p-2.5 bg-emerald-100 text-emerald-900">Total Up To Date</th>
                  </tr>
                  <tr className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200 text-center text-[11px]">
                    <th className="p-2 border-r border-slate-200 w-20">Qty</th>
                    <th className="p-2 border-r border-slate-200 w-24">Amount</th>
                    <th className="p-2 border-r border-slate-200 w-20 bg-sky-50 text-sky-900">Qty</th>
                    <th className="p-2 border-r border-slate-200 w-24 bg-sky-50 text-sky-900">Amount</th>
                    <th className="p-2 border-r border-slate-200 w-20 bg-amber-50 text-amber-900">Qty</th>
                    <th className="p-2 border-r border-slate-200 w-24 bg-amber-50 text-amber-900">Amount</th>
                    <th className="p-2 border-r border-slate-200 w-20 bg-emerald-50 text-emerald-900">Qty</th>
                    <th className="p-2 bg-emerald-50 text-emerald-900 w-24">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {allCategoryHeadings.map((category) => {
                    const catItems = project.items.filter((i) => (i.chapter || 'General Works') === category);
                    if (catItems.length === 0) return null;

                    return (
                      <React.Fragment key={category}>
                        <tr className="bg-slate-200/80 font-bold text-slate-800">
                          <td colSpan={13} className="p-2.5 uppercase tracking-wider text-[11px]">
                            📌 Section: {category}
                          </td>
                        </tr>
                        {catItems.map((item, idx) => {
                          const rate = getItemUnitRate(item);
                          const estQty = item.estimated_quantity;
                          const estAmount = estQty * rate;

                          const thisBillQty = getItemValuationQuantity(item.id, true);
                          const thisBillAmount = thisBillQty * rate;

                          const prevBillQty = getPreviousBillQuantity(item.id);
                          const prevBillAmount = prevBillQty * rate;

                          const cumQty = prevBillQty + thisBillQty;
                          const cumAmount = cumQty * rate;

                          const precision = item.precision ?? 2;

                          return (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-2.5 text-center font-medium border-r border-slate-200">{idx + 1}</td>
                              <td className="p-2.5 text-center font-bold text-blue-700 border-r border-slate-200">{item.item_code}</td>
                              <td className="p-2.5 border-r border-slate-200 font-medium text-slate-800">{item.description}</td>
                              <td className="p-2.5 text-center border-r border-slate-200 text-slate-600">{item.unit}</td>
                              <td className="p-2.5 text-right border-r border-slate-200 font-medium">
                                {rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>

                              {/* Estimate */}
                              <td className="p-2.5 text-right border-r border-slate-200 text-slate-700">{estQty.toFixed(precision)}</td>
                              <td className="p-2.5 text-right border-r border-slate-200 font-medium">
                                {estAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>

                              {/* This Bill */}
                              <td className="p-2.5 text-right border-r border-slate-200 font-bold text-sky-800 bg-sky-50/50">
                                {thisBillQty.toFixed(precision)}
                              </td>
                              <td className="p-2.5 text-right border-r border-slate-200 font-bold text-sky-900 bg-sky-50/50">
                                {thisBillAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>

                              {/* Previous Cumulative */}
                              <td className="p-2.5 text-right border-r border-slate-200 text-amber-800 bg-amber-50/50">
                                {prevBillQty.toFixed(precision)}
                              </td>
                              <td className="p-2.5 text-right border-r border-slate-200 text-amber-900 bg-amber-50/50 font-medium">
                                {prevBillAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>

                              {/* Up To Date Cumulative */}
                              <td className="p-2.5 text-right border-r border-slate-200 font-bold text-emerald-800 bg-emerald-50/50">
                                {cumQty.toFixed(precision)}
                              </td>
                              <td className="p-2.5 text-right font-black text-emerald-900 bg-emerald-50/50">
                                {cumAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 3: ESTIMATED VS ACTUAL PROGRESS TREND ANALYTICS */}
      {viewMode === 'analytics' && (
        <ValuationProgressChart
          project={project}
          valuationBooks={activeBooks}
          valuationRows={valuationRows}
        />
      )}

      {/* MODAL: Add New Valuation MB */}
      {showNewBookModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-red-600" />
                Add New Valuation MB
              </h3>
              <button onClick={() => setShowNewBookModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewBook} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Valuation MB Number</label>
                <input
                  type="text"
                  value={newMbNo}
                  onChange={(e) => setNewMbNo(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold"
                  placeholder="e.g. VMB-03"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Title / Bill Description</label>
                <input
                  type="text"
                  value={newMbTitle}
                  onChange={(e) => setNewMbTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="e.g. 3rd Running Bill Valuation MB"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Bill Type</label>
                  <select
                    value={newMbType}
                    onChange={(e) => setNewMbType(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium"
                  >
                    <option value="RUNNING_BILL">Running Bill</option>
                    <option value="FINAL_VALUATION">Final Valuation</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">IPC / Bill No.</label>
                  <input
                    type="number"
                    value={newIpcNo}
                    onChange={(e) => setNewIpcNo(parseInt(e.target.value, 10) || 1)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-center"
                    min={1}
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Measurement Date</label>
                <input
                  type="text"
                  value={newDateBs}
                  onChange={(e) => setNewDateBs(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="YYYY-MM-DD"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Verified By (Engineer)</label>
                <input
                  type="text"
                  value={newVerifiedBy}
                  onChange={(e) => setNewVerifiedBy(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="Name and Designation"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewBookModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
                >
                  Create Valuation MB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Work Item from Norms */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Work Item from Norm Specifications</h3>
              <button onClick={() => setIsAddItemModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search norms by code, description, or department..."
                value={normSearchQuery}
                onChange={(e) => setNormSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-200">
              {filteredNorms.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No norm items match your search.
                </div>
              ) : (
                filteredNorms.map((n) => {
                  const isSelected = selectedNormIds.includes(n.item_id);
                  return (
                    <div
                      key={n.item_id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedNormIds((prev) => prev.filter((id) => id !== n.item_id));
                        } else {
                          setSelectedNormIds((prev) => [...prev, n.item_id]);
                        }
                      }}
                      className={`p-3 text-xs cursor-pointer transition-colors flex items-start justify-between gap-3 ${
                        isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-[11px]">
                            {n.code}
                          </span>
                          <span className="text-slate-500 text-[11px] font-medium">• {n.source}</span>
                          <span className="text-slate-500 text-[11px] font-medium">• Unit: {n.base_unit}</span>
                        </div>
                        <p className="text-slate-800 font-medium leading-snug">{n.description}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="mt-1 rounded text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">
                {selectedNormIds.length} norm item(s) selected
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItemToMB()}
                  disabled={selectedNormIds.length === 0}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  Add Selected Items
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Custom Column Configuration */}
      {isCustomColModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Custom Column to Item Table</h3>
              <button onClick={() => setIsCustomColModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Column Name / Label</label>
                <input
                  type="text"
                  placeholder="e.g. Depth, Steel Factor, Thickness..."
                  value={newCustomColName}
                  onChange={(e) => setNewCustomColName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Calculation Mode</label>
                <select
                  value={newCustomColCalcMode}
                  onChange={(e) => setNewCustomColCalcMode(e.target.value as CustomColCalcMode)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="none">None (Text / Remarks Column)</option>
                  <option value="multiplier">Multiplier (Multiply into Quantity)</option>
                  <option value="additive">Additive (Add to Quantity)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCustomColModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomColumn}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Add Column
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Formula Link Guide */}
      {linkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-blue-600" />
                Measurement Formula & Cell Linking Guide
              </h3>
              <button onClick={() => setLinkModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>You can enter dynamic formulas in the <strong>Formula / Link</strong> cell of any sub-row:</p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-200">
                <li><code>=L*B*H</code> — Multiply standard dimensions directly</li>
                <li><code>=R1*0.5</code> — Reference Row 1 quantity and multiply by 0.5</li>
                <li><code>=SUM(R1:R3)</code> — Sum quantities from Row 1 to Row 3</li>
                <li><code>=ITEM(1).QTY * 0.10</code> — Reference Item 1 total quantity</li>
              </ul>
            </div>

            <div className="pt-3 flex justify-end border-t border-slate-100">
              <button
                onClick={() => setLinkModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Work Item Delete Confirmation */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Confirm Work Item Deletion</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete work item <strong>Norm {itemToDelete.item_code}</strong> ({itemToDelete.description})? This will remove all associated measurement sub-rows.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteItem}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
              >
                Delete Work Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Manage Valuation Books (IPC Bills) */}
      {showManageBooksModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-red-100 text-red-700 rounded-xl">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Manage Valuation Books (IPC Bills)</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Define specific Valuation MBs tied to Interim Payment Certificates (IPC #1, #2... Final Valuation)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowManageBooksModal(false);
                  setEditingBook(null);
                  setManageModalTab('list');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Total Valuation MBs</span>
                <span className="text-base font-black text-slate-900">{valuationBooks.length} Books</span>
              </div>
              <div className="bg-red-50 p-3 rounded-xl border border-red-200">
                <span className="text-[10px] font-extrabold uppercase text-red-600 block">Active MB</span>
                <span className="text-base font-black text-red-900 truncate block">{activeBook?.mb_number || 'N/A'}</span>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                <span className="text-[10px] font-extrabold uppercase text-blue-600 block">IPC Stage</span>
                <span className="text-base font-black text-blue-900">IPC #{activeBook?.ipc_number || 1}</span>
              </div>
              <div className="bg-purple-50 p-3 rounded-xl border border-purple-200">
                <span className="text-[10px] font-extrabold uppercase text-purple-600 block">Total Sub-Rows</span>
                <span className="text-base font-black text-purple-900">{valuationRows.length} Rows</span>
              </div>
            </div>

            {/* Modal Sub-Tabs Navigation */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setManageModalTab('list')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  manageModalTab === 'list'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Valuation Books List ({valuationBooks.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setManageModalTab('create');
                  setEditingBook(null);
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  manageModalTab === 'create'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Create Valuation MB</span>
              </button>
              {manageModalTab === 'edit' && editingBook && (
                <button
                  type="button"
                  onClick={() => setManageModalTab('edit')}
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-amber-600 text-white shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit ({editingBook.mb_number})</span>
                </button>
              )}
            </div>

            {/* TAB 1: Valuation Books List */}
            {manageModalTab === 'list' && (
              <div className="space-y-3">
                <div className="max-h-[360px] overflow-y-auto space-y-3 pr-1">
                  {valuationBooks.map((book) => {
                    const isActive = book.id === activeBookId;
                    const isSelectedForBulk = selectedBooksToDelete.includes(book.id);
                    const bookRowsCount = valuationRows.filter((r) => r.mb_id === book.id).length;

                    return (
                      <div
                        key={book.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isActive
                            ? 'bg-red-50/60 border-red-300 ring-2 ring-red-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelectedForBulk}
                              onChange={() => {
                                setSelectedBooksToDelete((prev) =>
                                  isSelectedForBulk ? prev.filter((id) => id !== book.id) : [...prev, book.id]
                                );
                              }}
                              className="rounded text-red-600 focus:ring-red-500 cursor-pointer mt-0.5"
                              title="Select for bulk delete"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-slate-900">{book.mb_number}</span>
                                <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                  IPC #{book.ipc_number || 1}
                                </span>
                                <span
                                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                    book.bill_type === 'FINAL_VALUATION'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {book.bill_type === 'FINAL_VALUATION' ? 'Final Valuation' : 'Running Bill'}
                                </span>
                                {isActive && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-600 text-white">
                                    🌟 Active
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs font-bold text-slate-800 mt-0.5">{book.title}</h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {!isActive && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveBookId(book.id);
                                  showToast(`Set active Valuation MB to ${book.mb_number}`);
                                }}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition shadow-2xs cursor-pointer"
                              >
                                Select Active
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleStartEditBook(book)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                              title="Edit Valuation MB Details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {valuationBooks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteBook(book.id)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                                title="Delete Valuation MB"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Details Metadata Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-600 mt-2">
                          <div>
                            <span className="text-slate-400 font-medium block">Date:</span>
                            <span className="font-bold text-slate-800">{book.date_iso || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium block">Ref No:</span>
                            <span className="font-mono font-bold text-slate-800 truncate block">{book.book_ref_no || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium block">Verified By:</span>
                            <span className="font-bold text-slate-800 truncate block">{book.verified_by || 'Site Engineer'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium block">Measurement Rows:</span>
                            <span className="font-bold text-slate-900">{bookRowsCount} sub-rows</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bulk Delete Footer */}
                {selectedBooksToDelete.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-bold text-red-900">
                      {selectedBooksToDelete.length} Valuation MB(s) selected for deletion
                    </span>
                    <button
                      type="button"
                      onClick={handleBulkDeleteBooks}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-2xs"
                    >
                      Delete Selected ({selectedBooksToDelete.length})
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Create New Valuation MB */}
            {manageModalTab === 'create' && (
              <form onSubmit={handleCreateNewBook} className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Valuation MB Number</label>
                    <input
                      type="text"
                      value={newMbNo}
                      onChange={(e) => setNewMbNo(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold bg-white"
                      placeholder="e.g. VMB-02"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">IPC / Bill Number</label>
                    <input
                      type="number"
                      value={newIpcNo}
                      onChange={(e) => setNewIpcNo(parseInt(e.target.value, 10) || 1)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold bg-white"
                      min={1}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Title / Bill Description</label>
                  <input
                    type="text"
                    value={newMbTitle}
                    onChange={(e) => setNewMbTitle(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                    placeholder="e.g. 2nd Running Bill Valuation MB"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Bill Type</label>
                    <select
                      value={newMbType}
                      onChange={(e) => setNewMbType(e.target.value as any)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium bg-white"
                    >
                      <option value="RUNNING_BILL">Running Bill (VMB)</option>
                      <option value="FINAL_VALUATION">Final Valuation MB (Completion)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Measurement Date</label>
                    <input
                      type="text"
                      value={newDateBs}
                      onChange={(e) => setNewDateBs(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                      placeholder="YYYY-MM-DD"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Verified By (Engineer)</label>
                    <input
                      type="text"
                      value={newVerifiedBy}
                      onChange={(e) => setNewVerifiedBy(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                      placeholder="Name and Designation"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Book Ref Number</label>
                    <input
                      type="text"
                      value={newRefNo}
                      onChange={(e) => setNewRefNo(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono bg-white"
                      placeholder="e.g. MB/VAL/2026-27/02"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Remarks / Location Notes</label>
                  <input
                    type="text"
                    value={newRemarks}
                    onChange={(e) => setNewRemarks(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                    placeholder="Optional notes regarding this valuation bill"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={autoSyncOnCreate}
                      onChange={(e) => setAutoSyncOnCreate(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Auto-sync Measurement Rows from Estimate MB</span>
                      <span className="text-[11px] text-slate-500">
                        Automatically copy baseline length, breadth, height sub-rows from Estimate MB into this new IPC bill
                      </span>
                    </div>
                  </label>
                </div>

                <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setManageModalTab('list')}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-sm cursor-pointer"
                  >
                    ➕ Create & Set Active Valuation MB
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: Edit Valuation MB */}
            {manageModalTab === 'edit' && editingBook && (
              <form onSubmit={handleSaveEditBook} className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Valuation MB Number</label>
                    <input
                      type="text"
                      value={editMbNo}
                      onChange={(e) => setEditMbNo(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">IPC / Bill Number</label>
                    <input
                      type="number"
                      value={editIpcNo}
                      onChange={(e) => setEditIpcNo(parseInt(e.target.value, 10) || 1)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold bg-white"
                      min={1}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Title / Bill Description</label>
                  <input
                    type="text"
                    value={editMbTitle}
                    onChange={(e) => setEditMbTitle(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Bill Type</label>
                    <select
                      value={editMbType}
                      onChange={(e) => setEditMbType(e.target.value as any)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium bg-white"
                    >
                      <option value="RUNNING_BILL">Running Bill (VMB)</option>
                      <option value="FINAL_VALUATION">Final Valuation MB (Completion)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Measurement Date</label>
                    <input
                      type="text"
                      value={editDateBs}
                      onChange={(e) => setEditDateBs(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Verified By (Engineer)</label>
                    <input
                      type="text"
                      value={editVerifiedBy}
                      onChange={(e) => setEditVerifiedBy(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Book Ref Number</label>
                    <input
                      type="text"
                      value={editRefNo}
                      onChange={(e) => setEditRefNo(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Remarks</label>
                  <input
                    type="text"
                    value={editRemarks}
                    onChange={(e) => setEditRemarks(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBook(null);
                      setManageModalTab('list');
                    }}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 shadow-sm cursor-pointer"
                  >
                    💾 Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Category Delete Confirmation */}
      {categoryToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Delete Category Heading</h3>
            </div>
            <p className="text-xs text-slate-600">
              Delete category heading <strong>"{categoryToDelete.name}"</strong>? {categoryToDelete.affectedCount > 0 && `${categoryToDelete.affectedCount} work item(s) currently under this category will be moved to "General Works".`}
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 cursor-pointer"
              >
                Delete Heading
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Single Valuation MB Delete Confirmation */}
      {bookToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Confirm Valuation MB Deletion</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete Valuation MB <strong>"{bookToDelete.mb_number}: {bookToDelete.title}"</strong> ({bookToDelete.date_iso})? This will permanently delete this MB and all associated valuation measurement sub-rows.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setBookToDelete(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBook}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 cursor-pointer"
              >
                Delete Valuation MB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MS Excel / LibreOffice Live Sync */}
      <OfficeLiveSyncModal
        isOpen={isOfficeSyncModalOpen}
        onClose={() => setIsOfficeSyncModalOpen(false)}
        project={project}
        setProject={setProject}
        zone={selectedZone || { id: '1', name_en: 'Metro B',province: 'Central Province', region: 'Urban', labor_multiplier: 1.0, material_multiplier: 1.0 }}
        fiscalYear={selectedFY || '2026/27'}
        showToast={showToast}
        valuationRows={valuationRows}
        setValuationRows={setValuationRows}
        activeBookId={activeBook?.id}
      />

      {/* MODAL: Add Itemized P.S. (Provisional Sum) Item */}
      {isPSModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2 text-amber-700">
                <FileSpreadsheet className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
 + Add Itemized P.S. Item
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPSModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPSItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">P.S. Item Code:</label>
                  <input
                    type="text"
                    required
                    value={psCodeInput}
                    onChange={(e) => setPsCodeInput(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 font-mono font-bold focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. PS-01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit:</label>
                  <input
                    type="text"
                    required
                    value={psUnitInput}
                    onChange={(e) => setPsUnitInput(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 font-bold focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. L.S. / P.S. / Job"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description:</label>
                <textarea
                  required
                  rows={2}
                  value={psDescriptionInput}
                  onChange={(e) => setPsDescriptionInput(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 font-medium focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. Insurance for Works, Equipment, Personnel & Quality Control Lab Tests..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Qty:</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={psEstimatedQtyInput}
                    onChange={(e) => setPsEstimatedQtyInput(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 font-bold focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rate ():</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={psRateInput}
                    onChange={(e) => setPsRateInput(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 font-bold font-mono focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs font-bold text-amber-900">
                <span>Total P.S. Amount:</span>
                <span className="font-mono text-sm text-amber-950 font-black">
                  {currencyCode()} {((psEstimatedQtyInput || 0) * (psRateInput || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPSModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 shadow-sm cursor-pointer"
                >
                  + Add P.S. Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SUB VALUATION MB BOOK FOR ACTIVE IPC */}
      {isAddSubMBModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-red-700 to-amber-700 p-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-amber-300" />
                <h3 className="font-extrabold text-sm">Add Sub Valuation MB for IPC #{activeBook?.ipc_number || 1}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSubMBModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">MB Code / Number</label>
                <input
                  type="text"
                  value={newSubMBCode}
                  onChange={(e) => setNewSubMBCode(e.target.value)}
                  placeholder="e.g. VMB-02"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Valuation MB Title</label>
                <input
                  type="text"
                  value={newSubMBTitle}
                  onChange={(e) => setNewSubMBTitle(e.target.value)}
                  placeholder="e.g. Retaining Wall & Drainage"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Location / Remarks (Optional)</label>
                <textarea
                  value={newSubMBRemarks}
                  onChange={(e) => setNewSubMBRemarks(e.target.value)}
                  placeholder="e.g. Chainage 0+200 to 0+500"
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddSubMBModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateSubMBBook}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm transition cursor-pointer"
              >
                Create Valuation MB
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
