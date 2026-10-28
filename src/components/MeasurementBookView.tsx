import React, { useState, useRef } from 'react';
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
  Edit2,
  Edit3,
  X,
  LayoutGrid,
  List,
  Printer,
  Link2,
  Copy,
  PenTool,
  FolderPlus,
  AlertTriangle,
  BookOpen,
  Boxes,
  Minus,
  MoreVertical,
  MoreHorizontal,
  FileCheck,
  Building2
} from 'lucide-react';
import { ProjectEstimate, BOQItem, MBRow, MeasurementBookDef, RateNormItem, ZoneInfo, ResourceMaster, CustomColCalcMode, CustomColPosition, CustomColConfig, CustomHeaderField, ColumnLabelsConfig } from '../types';
import { SignatureBlock } from '../modules/valuation/CompletionCertificateView';
import { calculateItemRate, calcQuantityVal } from '../services/rateEngine';
import { downloadPrintableHTML } from '../services/printExport';
import { exportMBToExcel } from '../services/excelExport';
import { evaluateMBFormula, resolveFieldValue } from '../services/mbFormulaEvaluator';
import { recalculateSingleMBRows, recalculateItemTotal as calcItemTotal, recalculateAllProjectItems } from '../services/mbDependencyEngine';
import { SpreadsheetCell } from './SpreadsheetCell';
// Remove EmbeddedMBSpreadsheet import
import { OfficeLiveSyncModal } from './OfficeLiveSyncModal';
import {
  AppFormatConfig,
  loadFormatPreferences,
  getDensityClasses,
  getFontSizeClasses
} from '../services/formatPreferences';

interface MeasurementBookViewProps {
  project: ProjectEstimate;
  setProject: React.Dispatch<React.SetStateAction<ProjectEstimate>>;
  norms: RateNormItem[];
  resources: ResourceMaster[];
  selectedZone: ZoneInfo;
  selectedFY: string;
  onNavigateToTab?: (tab: string) => void;
}

export const MeasurementBookView: React.FC<MeasurementBookViewProps> = ({
  project,
  setProject,
  norms,
  resources,
  selectedZone,
  selectedFY,
  onNavigateToTab
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(
    project.items.length > 0 ? project.items[0].id : null
  );

  // Multi-MB Books Management
  const defaultMBBooks: MeasurementBookDef[] = [
    { id: 'mb_1', code: 'MB-01', title: 'Main Civil & Structure Works', remarks: 'Primary Civil Measurement Book' }
  ];

  const mbBooks: MeasurementBookDef[] = React.useMemo(() => {
    if (project.measurement_books && project.measurement_books.length > 0) {
      return project.measurement_books;
    }
    return defaultMBBooks;
  }, [project.measurement_books]);

  const [activeMBBookId, setActiveMBBookId] = useState<string>('all');

  const activeMBBook = React.useMemo(() => {
    return mbBooks.find((b) => b.id === activeMBBookId);
  }, [mbBooks, activeMBBookId]);

  const getScopeQtyForItem = React.useCallback(
    (item: BOQItem, targetBookId: string) => {
      const itemPrecision = item.precision ?? project.user_estimate_config?.quantity_precision ?? 2;
      const itemTruncate = item.truncate_quantity ?? project.user_estimate_config?.truncate_quantity ?? false;
      const defaultBookId = mbBooks[0]?.id || 'mb_1';

      if (targetBookId === 'all') {
        return item.estimated_quantity;
      }

      const itemMbRows = item.mb_rows || [];
      const matchingRows = itemMbRows.filter((r) => {
        const rBookId = r.mb_book_id || defaultBookId;
        return rBookId === targetBookId;
      });

      if (matchingRows.length === 0) {
        if (!item.mb_rows || item.mb_rows.length === 0) {
          return targetBookId === defaultBookId ? item.estimated_quantity : 0;
        }
        return 0;
      }

      const sum = matchingRows.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
      return calcQuantityVal(sum, itemPrecision, itemTruncate);
    },
    [mbBooks, project.user_estimate_config]
  );
  const [isAddMBModalOpen, setIsAddMBModalOpen] = useState<boolean>(false);
  const [newMBTitle, setNewMBTitle] = useState<string>('');
  const [newMBCode, setNewMBCode] = useState<string>('');
  const [newMBRemarks, setNewMBRemarks] = useState<string>('');
  const [combinedDisplayMode, setCombinedDisplayMode] = useState<'both' | 'matrix' | 'details'>('both');
  const [expandAllItems, setExpandAllItems] = useState<boolean>(true);
  const [printTargetMBId, setPrintTargetMBId] = useState<string>('all');
  const [showLetterhead, setShowLetterhead] = useState<boolean>(false);

  // Format Preferences State (Table Density, MB Precision, Layout)
  const [formatPreferences, setFormatPreferences] = useState<AppFormatConfig>(loadFormatPreferences);

  React.useEffect(() => {
    const handleFormatChange = (e: any) => {
      if (e.detail) {
        setFormatPreferences(e.detail);
      }
    };
    window.addEventListener('uev:format-preferences-changed', handleFormatChange);
    return () => window.removeEventListener('uev:format-preferences-changed', handleFormatChange);
  }, []);

  React.useEffect(() => {
    setPrintTargetMBId(activeMBBookId);
    window.dispatchEvent(new CustomEvent('uev:mb-active-book-changed', { detail: activeMBBookId }));
  }, [activeMBBookId]);

  const handleCreateMBBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMBTitle.trim()) return;
    const newBook: MeasurementBookDef = {
      id: `mb_${Date.now()}`,
      code: newMBCode.trim() || `MB-0${mbBooks.length + 1}`,
      title: newMBTitle.trim(),
      remarks: newMBRemarks.trim(),
      created_at: new Date().toISOString()
    };
    const updatedBooks = [...mbBooks, newBook];
    setProject((prev) => ({
      ...prev,
      measurement_books: updatedBooks
    }));
    setActiveMBBookId(newBook.id);
    setNewMBTitle('');
    setNewMBCode('');
    setNewMBRemarks('');
    setIsAddMBModalOpen(false);
    showToast(`Created new Measurement Book: ${newBook.code} - ${newBook.title}`);
  };

  const handleDeleteMBBook = (bookId: string) => {
    if (mbBooks.length <= 1) {
      alert('At least one Measurement Book must remain in the project.');
      return;
    }
    const targetBook = mbBooks.find((b) => b.id === bookId);
    if (!confirm(`Are you sure you want to delete Measurement Book "${targetBook?.code} - ${targetBook?.title}"? Sub-rows will be reassigned to the main MB.`)) {
      return;
    }
    const updatedBooks = mbBooks.filter((b) => b.id !== bookId);
    const fallbackId = updatedBooks[0].id;

    setProject((prev) => ({
      ...prev,
      measurement_books: updatedBooks,
      items: prev.items.map((it) => ({
        ...it,
        mb_rows: (it.mb_rows || []).map((r) => (r.mb_book_id === bookId ? { ...r, mb_book_id: fallbackId } : r))
      }))
    }));
    setActiveMBBookId(fallbackId);
    showToast(`Deleted Measurement Book ${targetBook?.code}. Sub-rows moved to ${updatedBooks[0].code}.`);
  };

  // Modal for adding a new item from Norms to MB
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
  
  // Modal for MS Excel / LibreOffice Live Sync
  const [isOfficeSyncModalOpen, setIsOfficeSyncModalOpen] = useState<boolean>(false);

  // Dynamic & Editable Signatures
  const [signatures, setSignatures] = useState<SignatureBlock[]>([
    { id: '1', title: 'Prepared By', designation: 'Site Engineer / Sub-Engineer' },
    { id: '2', title: 'Checked By', designation: 'Engineer' },
    { id: '3', title: 'Approved By', designation: 'Chief / Administrative Officer' }
  ]);
  const [isSignaturesModalOpen, setIsSignaturesModalOpen] = useState<boolean>(false);

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
  const [isCategoryManagerExpanded, setIsCategoryManagerExpanded] = useState<boolean>(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const [openItemMenuId, setOpenItemMenuId] = useState<string | null>(null);

  // Confirmation modal state for Work Item deletion
  const [itemToDelete, setItemToDelete] = useState<{ id: string; item_code: string; description: string } | null>(null);

  // Confirmation modal state for Category Heading deletion
  const [categoryToDelete, setCategoryToDelete] = useState<{ name: string; affectedCount: number } | null>(null);

  // Editable Header & Metadata Configuration for Estimate Module
  const [isEditingHeader, setIsEditingHeader] = useState<boolean>(false);
  const [isHeaderCardMinimized, setIsHeaderCardMinimized] = useState<boolean>(false);

  const [columnLabels, setColumnLabels] = useState<ColumnLabelsConfig>({
    particulars: project.header_config?.column_labels?.particulars || "Particulars / Location Description",
    no_of_units: project.header_config?.column_labels?.no_of_units || "No.",
    length: project.header_config?.column_labels?.length || "Length (L)",
    breadth: project.header_config?.column_labels?.breadth || "Breadth (B)",
    height: project.header_config?.column_labels?.height || "Height (H)",
    quantity: project.header_config?.column_labels?.quantity || "Quantity",
    unit: project.header_config?.column_labels?.unit || "Unit",
    rate: project.header_config?.column_labels?.rate || "Rate",
    amount: project.header_config?.column_labels?.amount || "Amount",
    remarks: project.header_config?.column_labels?.remarks || "Remarks"
  });

  const [customHeadings, setCustomHeadings] = useState<CustomHeaderField[]>(
    project.header_config?.custom_headings || []
  );

  const [headerMetadata, setHeaderMetadata] = useState({
    authorityName: project.header_config?.authority_name || "Sample City Authority",
    officeName: project.header_config?.office_name || "Local Authority Office",
    officeAddress: project.header_config?.office_address || "Sample City, Sample County",
    pageNo: project.header_config?.page_no || "First",
    projectName: project.title || project.header_config?.document_title_mb || "River protection works",
    contractNo: project.header_config?.contract_no || "CNT/2025/26/01",
    location: project.header_config?.implementation_location || "Sample City -15, Sample County",
    contractorName: project.header_config?.contractor_name || "Apex Construction Co., Ward-7, Sample County",
    measurementDate: project.header_config?.measurement_date || "2026-08-25",
    agreementDate: project.header_config?.agreement_date || "2026-02-23",
    acceptanceDate: project.header_config?.acceptance_date || "2026-02-20",
    completionDate: project.header_config?.completion_date || "2026-09-11",
    workOrderDate: project.header_config?.work_order_date || "2026-02-25"
  });

  const handleAddCustomHeading = () => {
    const newH: CustomHeaderField = {
      id: `hdr_${Date.now()}`,
      label: 'Field Name',
      value: ''
    };
    setCustomHeadings((prev) => [...prev, newH]);
  };

  const handleDeleteCustomHeading = (id: string) => {
    setCustomHeadings((prev) => prev.filter((h) => h.id !== id));
  };

  const handleUpdateCustomHeading = (id: string, key: 'label' | 'value', val: string) => {
    setCustomHeadings((prev) =>
      prev.map((h) => (h.id === id ? { ...h, [key]: val } : h))
    );
  };

  const handleSaveHeaderMetadata = () => {
    setProject((prev) => ({
      ...prev,
      title: headerMetadata.projectName || prev.title,
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
        page_no: headerMetadata.pageNo,
        custom_headings: customHeadings,
        column_labels: columnLabels
      }
    }));
    setIsEditingHeader(false);
    showToast('Estimate Header fields & Column labels saved successfully.');
  };

  const handleClearMB = () => {
    if (window.confirm('Are you sure you want to clear all MB measurement items? This action cannot be undone.')) {
      setProject((prev) => ({ ...prev, items: [] }));
      showToast('All MB items cleared');
    }
  };

  // Modal state for adding a new category from item dropdown
  const [addCategoryForItemId, setAddCategoryForItemId] = useState<string | null>(null);
  const [newCategoryModalName, setNewCategoryModalName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

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
    // If it was previously removed, un-remove it
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
    showToast(`Deleted work item Norm ${deletedCode} from Measurement Book and Estimate.`);
  };

  const rateMode = project.rate_mode || 'user';

  // Helper to get active unit rate for an item according to Office/User vs Contractor/Tender mode
  const getItemUnitRate = (item: BOQItem): number => {
    if (rateMode === 'user') {
      return item.user_rate !== undefined ? item.user_rate : item.calculated_unit_rate;
    }
    return item.contractor_rate !== undefined ? item.contractor_rate : item.calculated_unit_rate;
  };

  // Compute total number of sub-measurement rows recorded across all items
  const totalSubRowsCount = project.items.reduce(
    (acc, item) => acc + (item.mb_rows ? item.mb_rows.length : 0),
    0
  );

  // Filtered Norms list for search
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

  // Helper to re-calculate item total quantity & total amount from its MB sub-rows
  const recalculateItemTotal = (item: BOQItem, allItems: BOQItem[] = project.items): BOQItem => {
    return calcItemTotal(item, allItems, rateMode);
  };

  // Re-calculate all items across the project
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

  // Add a new sub-row to a specific BOQ item
  const handleAddSubRow = (itemId: string) => {
    const targetItem = project.items.find((it) => it.id === itemId);
    const existingCount = targetItem?.mb_rows?.length || 0;

    const targetBookId = activeMBBookId !== 'all' ? activeMBBookId : (mbBooks[0]?.id || 'mb_1');

    const newRow: MBRow = {
      id: `mb_row_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      mb_book_id: targetBookId,
      particulars: `Section / Location Entry ${existingCount + 1}`,
      no_of_units: 1,
      length: 1.0,
      breadth: 1.0,
      height: 1.0,
      quantity: 1.0,
      remarks: '',
      custom_fields: {}
    };

    setProject((prev) => ({
      ...prev,
      items: recalculateAllMBItems(prev.items.map((item) => {
        if (item.id === itemId) {
          const updatedMbRows = [...(item.mb_rows || []), newRow];
          return recalculateItemTotal({ ...item, mb_rows: updatedMbRows }, prev.items);
        }
        return item;
      }))
    }));

    showToast('Added new measurement detail row.');
  };

  // Update a standard field in a sub-row
  const handleUpdateSubRow = (
    itemId: string,
    rowId: string,
    field: keyof MBRow,
    value: any
  ) => {
    setProject((prev) => ({
      ...prev,
      items: recalculateAllMBItems(prev.items.map((item) => {
        if (item.id === itemId) {
          const updatedMbRows = (item.mb_rows || []).map((r) => {
            if (r.id === rowId) {
              return { ...r, [field]: value };
            }
            return r;
          });
          return recalculateItemTotal({ ...item, mb_rows: updatedMbRows }, prev.items);
        }
        return item;
      }))
    }));
  };

  // Update a custom field value in a sub-row
  const handleUpdateCustomField = (
    itemId: string,
    rowId: string,
    colName: string,
    value: string
  ) => {
    setProject((prev) => ({
      ...prev,
      items: recalculateAllMBItems(prev.items.map((item) => {
        if (item.id === itemId) {
          const updatedMbRows = (item.mb_rows || []).map((r) => {
            if (r.id === rowId) {
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
          return recalculateItemTotal({ ...item, mb_rows: updatedMbRows }, prev.items);
        }
        return item;
      }))
    }));
  };

  // Add a Custom Column to an Item
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

  // Remove a Custom Column from an Item
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
      items: prev.items.map((item) => {
        if (item.id === itemId) {
          const updated = { ...item, precision: newPrecision };
          return calcItemTotal(updated, prev.items, prev.rate_mode || 'user');
        }
        return item;
      })
    }));
  };

  const handleUpdateItemTruncate = (itemId: string, truncate: boolean) => {
    setProject((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === itemId) {
          const updated = { ...item, truncate_quantity: truncate };
          return calcItemTotal(updated, prev.items, prev.rate_mode || 'user');
        }
        return item;
      })
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

  // Delete a sub-row
  const handleDeleteSubRow = (itemId: string, rowId: string) => {
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

  // Bulk delete sub-rows
  const handleDeleteSubRows = (itemId: string, rowIds: string[]) => {
    setProject((prev) => ({
      ...prev,
      items: recalculateAllMBItems(prev.items.map((item) => {
        if (item.id === itemId) {
          const updatedMbRows = (item.mb_rows || []).filter((r) => !rowIds.includes(r.id));
          return recalculateItemTotal({ ...item, mb_rows: updatedMbRows }, prev.items);
        }
        return item;
      }))
    }));
  };

  // Duplicate entire work item
  const handleDuplicateItem = (itemId: string) => {
    const itemToDup = project.items.find((i) => i.id === itemId);
    if (!itemToDup) return;
    const newItem: BOQItem = {
      ...itemToDup,
      id: `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      description: `${itemToDup.description} (Copy)`,
      mb_rows: (itemToDup.mb_rows || []).map((r) => ({
        ...r,
        id: `mb_row_${Date.now()}_${Math.floor(Math.random() * 1000)}`
      }))
    };
    setProject((prev) => {
      const idx = prev.items.findIndex((i) => i.id === itemId);
      const updated = [...prev.items];
      updated.splice(idx + 1, 0, newItem);
      return { ...prev, items: recalculateAllMBItems(updated) };
    });
    showToast('Duplicated work item.');
  };

  // Move work item up / down
  const handleMoveItem = (itemId: string, direction: 'up' | 'down') => {
    setProject((prev) => {
      const idx = prev.items.findIndex((i) => i.id === itemId);
      if (idx === -1) return prev;
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === prev.items.length - 1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      const updated = [...prev.items];
      const [moved] = updated.splice(idx, 1);
      updated.splice(targetIdx, 0, moved);
      return { ...prev, items: updated };
    });
  };

  // Add a sub-heading row
  const handleAddSubHeading = (itemId: string) => {
    const targetBookId = activeMBBookId !== 'all' ? activeMBBookId : (mbBooks[0]?.id || 'mb_1');
    const newRow: MBRow = {
      id: `mb_heading_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      mb_book_id: targetBookId,
      particulars: 'Sub-Section Heading / Location',
      is_heading: true,
      no_of_units: 0,
      length: 0,
      breadth: 0,
      height: 0,
      quantity: 0
    };
    setProject((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === itemId) {
          return { ...item, mb_rows: [...(item.mb_rows || []), newRow] };
        }
        return item;
      })
    }));
    showToast('Added sub-heading row.');
  };

  // Add a deduction row
  const handleAddDeductionRow = (itemId: string) => {
    const targetBookId = activeMBBookId !== 'all' ? activeMBBookId : (mbBooks[0]?.id || 'mb_1');
    const newRow: MBRow = {
      id: `mb_ded_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      mb_book_id: targetBookId,
      particulars: 'Deduction for opening / void',
      no_of_units: -1,
      length: 1.0,
      breadth: 1.0,
      height: 1.0,
      quantity: -1.0,
      remarks: 'Deduction',
      custom_fields: {}
    };
    setProject((prev) => ({
      ...prev,
      items: recalculateAllMBItems(prev.items.map((item) => {
        if (item.id === itemId) {
          const updatedMbRows = [...(item.mb_rows || []), newRow];
          return recalculateItemTotal({ ...item, mb_rows: updatedMbRows }, prev.items);
        }
        return item;
      }))
    }));
    showToast('Added deduction row.');
  };

  // Duplicate sub-row
  const handleDuplicateSubRow = (itemId: string, rowId: string) => {
    setProject((prev) => ({
      ...prev,
      items: recalculateAllMBItems(prev.items.map((item) => {
        if (item.id === itemId) {
          const rows = item.mb_rows || [];
          const idx = rows.findIndex((r) => r.id === rowId);
          if (idx === -1) return item;
          const targetRow = rows[idx];
          const newRow: MBRow = {
            ...targetRow,
            id: `mb_row_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            particulars: `${targetRow.particulars} (Copy)`
          };
          const updatedRows = [...rows];
          updatedRows.splice(idx + 1, 0, newRow);
          return recalculateItemTotal({ ...item, mb_rows: updatedRows }, prev.items);
        }
        return item;
      }))
    }));
    showToast('Duplicated row.');
  };

  // Move sub-row up / down
  const handleMoveSubRow = (itemId: string, rowId: string, direction: 'up' | 'down') => {
    setProject((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === itemId) {
          const rows = [...(item.mb_rows || [])];
          const idx = rows.findIndex((r) => r.id === rowId);
          if (idx === -1) return item;
          if (direction === 'up' && idx === 0) return item;
          if (direction === 'down' && idx === rows.length - 1) return item;
          const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
          const [moved] = rows.splice(idx, 1);
          rows.splice(targetIdx, 0, moved);
          return { ...item, mb_rows: rows };
        }
        return item;
      })
    }));
  };

  // Add Item(s) to MB Sheet from Norm List with automatic code, description, unit & rate population
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

    let lastExpandedIdToSet: string | null = null;

    setProject((prev) => {
      let updatedItems = [...prev.items];

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

        const existingIdx = updatedItems.findIndex(
          (it) => it.item_id === selNorm.item_id || (it.item_code && it.item_code === selNorm.code)
        );

        const defaultRow: MBRow = {
          id: `mb_row_${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`,
          particulars: existingIdx !== -1
            ? `Section / Location Entry ${(updatedItems[existingIdx].mb_rows?.length || 0) + 1}`
            : 'Initial Location Measurement',
          no_of_units: 1,
          length: 10.0,
          breadth: 0.23,
          height: 0.45,
          quantity: 1.035,
          remarks: 'Estimated',
          custom_fields: {}
        };

        if (existingIdx !== -1) {
          const existingItem = updatedItems[existingIdx];
          const updatedMbRows = [...(existingItem.mb_rows || []), defaultRow];
          const sumQty = updatedMbRows.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
          const roundedQty = Math.round(sumQty * 10000) / 10000;

          const updatedItem: BOQItem = {
            ...existingItem,
            description: selNorm.description,
            unit: selNorm.base_unit,
            calculated_unit_rate: activeRate,
            user_rate: userRate,
            contractor_rate: contractorRate,
            mode: rateMode,
            estimated_quantity: roundedQty,
            total_amount: Math.round(roundedQty * effRate * 100) / 100,
            mb_rows: updatedMbRows
          };

          updatedItems[existingIdx] = updatedItem;
          lastExpandedIdToSet = existingItem.id;
        } else {
          const newBOQItem: BOQItem = {
            id: `boq_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
            item_id: selNorm.item_id,
            item_code: selNorm.code,
            description: selNorm.description,
            unit: selNorm.base_unit,
            estimated_quantity: 1.035,
            calculated_unit_rate: activeRate,
            user_rate: userRate,
            contractor_rate: contractorRate,
            mode: rateMode,
            total_amount: Math.round(1.035 * effRate * 100) / 100,
            chapter: selNorm.source || 'General Civil Works',
            mb_rows: [defaultRow],
            custom_column_names: []
          };

          updatedItems.push(newBOQItem);
          lastExpandedIdToSet = newBOQItem.id;
        }
      });

      return {
        ...prev,
        items: updatedItems
      };
    });

    if (lastExpandedIdToSet) {
      setExpandedItemId(lastExpandedIdToSet);
    }

    setIsAddItemModalOpen(false);
    if (addedNorms.length === 1) {
      const selNorm = addedNorms[0];
      showToast(`Added entry for Item ${selNorm.code} - ${selNorm.description.slice(0, 30)}...`);
    } else if (addedNorms.length > 1) {
      showToast(`Successfully added ${addedNorms.length} work items to Measurement Book!`);
    }
  };

  // Export entire Measurement Book to formatted Excel (.xlsx) with borders
  const handleExportMBExcel = () => {
    if (project.items.length === 0) {
      alert('Measurement Book is empty.');
      return;
    }
    exportMBToExcel(project, selectedZone, selectedFY, activeMBBookId);
    showToast('Exported formatted Measurement Book to Excel (.xlsx) ready to print!');
  };

  // Print Measurement Book with official header
  const handlePrintMB = () => {
    if (project.items.length === 0) {
      alert('Measurement Book is empty.');
      return;
    }

    const qtyPrecision = project.user_estimate_config?.quantity_precision ?? 2;
    const headerConfig = project.header_config || {};
    const authorityName = headerConfig.authority_name || 'Sample City Authority';
    const officeName = headerConfig.office_name || 'Local Authority Office';
    const officeAddress = headerConfig.office_address || 'Sample City, Sample Province';
    const customHeadings = headerConfig.custom_headings || [];

    let customHeadingsHtml = '';
    if (customHeadings.length > 0) {
      customHeadingsHtml = customHeadings
        .map((h) => `<tr style="border: none !important;"><td colSpan="2" style="border: none !important;"><b>${h.label}:</b> ${h.value}</td></tr>`)
        .join('');
    }

    const isCombinedPrint = printTargetMBId === 'all';
    const targetBook = mbBooks.find((b) => b.id === printTargetMBId);
    const documentTitle = isCombinedPrint
      ? 'Combined Measurement Book Summary'
      : `Measurement Book - ${targetBook?.code || 'MB'})`;

    const customHeaderHtml = `
      <div style="text-align: center; font-family: 'Kalimati', 'Nirmala UI', sans-serif; margin-bottom: 16px;">
        <div style="font-size: 16pt; font-weight: bold; color: #000;">${authorityName}</div>
        <div style="font-size: 13pt; font-weight: bold; color: #000;">${officeName}</div>
        <div style="font-size: 11pt; font-weight: bold; color: #000;">${officeAddress}</div>
        <br/>
        <div style="font-size: 14pt; font-weight: bold; text-decoration: underline; color: #000;">${documentTitle}</div>
        ${!isCombinedPrint && targetBook ? `<div style="font-size: 11pt; font-weight: bold; color: #1e3a8a; margin-top: 4px;">Book title: ${targetBook.title}</div>` : ''}
        ${isCombinedPrint ? `<div style="font-size: 10pt; font-weight: bold; color: #334155; margin-top: 4px;">Total measurement books: ${mbBooks.map(b => b.code).join(', ')}</div>` : ''}
      </div>

      <table style="width: 100%; font-size: 10pt; margin-bottom: 12px; border: none !important;">
        <tr style="border: none !important;">
          <td style="border: none !important;"><b>Program / Project Name:</b> ${project.title}</td>
          <td style="border: none !important; text-align: right;"><b>Fiscal Year:</b> ${project.fiscal_year || selectedFY}</td>
        </tr>
        <tr style="border: none !important;">
          <td style="border: none !important;"><b>Implementation Location:</b> ${project.local_authority || selectedZone.name_en}</td>
          <td style="border: none !important; text-align: right;"><b>Budget sub-head no:</b> ${project.budget_head_no || headerConfig.budget_head_no || ''}</td>
        </tr>
        ${customHeadingsHtml}
      </table>
    `;

    let tableHtml = '';

    if (isCombinedPrint) {
      // 1. COMBINED ESTIMATE MB QUANTITY MATRIX TABLE
      tableHtml += `
        <div style="font-size: 11pt; font-weight: bold; color: #1e3a8a; margin-bottom: 6px; text-decoration: underline;">
MB Quantity Column Matrix Summary
        </div>
        <table border="1" cellpadding="6" cellspacing="0" class="print-table" style="width:100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 25px;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: center; font-weight: bold;">
              <th style="border: 1px solid #000; width: 35px;" class="col-sn">S.No.</th>
              <th style="border: 1px solid #000; width: 85px;" class="col-code">Norm</th>
              <th style="border: 1px solid #000;" class="particulars col-desc">Work Description</th>
              <th style="border: 1px solid #000; width: 50px;" class="col-unit">Unit</th>
              ${mbBooks.map(b => `<th style="border: 1px solid #000; text-align: right; min-width: 65px;" class="sub-book-header">${b.code}<br/><span style="font-size: 7.5pt; font-weight: normal; display: block; word-break: break-word;">${b.title}</span></th>`).join('')}
              <th style="border: 1px solid #000; text-align: right; min-width: 90px; background-color: #e2e8f0; word-break: break-word;">Total quantity<br/><span style="font-size: 7.5pt; font-weight: normal;">(Summed Qty)</span></th>
              <th style="border: 1px solid #000; width: 80px;">Remarks</th>
            </tr>
          </thead>
          <tbody>`;

      project.items.forEach((item, idx) => {
        const itemPrecision = item.precision ?? qtyPrecision;
        const totalQty = getScopeQtyForItem(item, 'all');

        const bookCells = mbBooks.map(b => {
          const bQty = getScopeQtyForItem(item, b.id);
          return `<td style="text-align: right; border: 1px solid #000;" class="sub-book-col">${bQty > 0 ? Number(bQty).toFixed(itemPrecision) : '-'}</td>`;
        }).join('');

        tableHtml += `<tr>
          <td style="text-align: center; border: 1px solid #000;" class="col-sn">${idx + 1}</td>
          <td style="text-align: center; font-family: monospace; font-weight: bold; border: 1px solid #000;" class="col-code">${item.item_code}</td>
          <td style="border: 1px solid #000; word-break: break-word; white-space: normal;" class="particulars col-desc"><b>${item.description}</b></td>
          <td style="text-align: center; border: 1px solid #000;" class="col-unit">${item.unit}</td>
          ${bookCells}
          <td style="text-align: right; font-weight: bold; border: 1px solid #000; background-color: #f8fafc; color: #1e3a8a;">${Number(totalQty).toFixed(itemPrecision)}</td>
          <td style="border: 1px solid #000; font-size: 8pt;">${item.chapter || ''}</td>
        </tr>`;
      });

      tableHtml += `</tbody>
        <tfoot>
          <tr style="background-color: #f1f5f9; font-weight: bold; font-size: 9.5pt;">
            <td colSpan="${4 + mbBooks.length}" style="text-align: right; border: 1px solid #000;">Total Measured Work Items:</td>
            <td style="text-align: right; color: #1e3a8a; border: 1px solid #000;">${project.items.length} Items</td>
            <td style="border: 1px solid #000;"></td>
          </tr>
        </tfoot>
      </table>`;

      // 2. DETAILED MEASUREMENT ROWS SECTION FOR COMBINED ESTIMATE MB PRINT
      const allCustomColsCombined: string[] = [];
      project.items.forEach((item) => {
        (item.custom_column_names || []).forEach((col) => {
          if (col && !allCustomColsCombined.includes(col)) allCustomColsCombined.push(col);
        });
      });
      const dimColSpanComb = 3 + allCustomColsCombined.length;

      tableHtml += `
        <div style="font-size: 11pt; font-weight: bold; color: #1e3a8a; margin-top: 25px; margin-bottom: 8px; text-decoration: underline; page-break-before: auto;">
Detailed Measurement Rows
        </div>
        <table border="1" cellpadding="6" cellspacing="0" class="print-table" style="width:100%; border-collapse: collapse; font-size: 9.5pt;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: center;">
              <th rowspan="2" class="col-sn" style="border: 1px solid #000;">S.No.</th>
              <th rowspan="2" class="col-desc particulars" style="border: 1px solid #000;">Description of work/service and measurement book source</th>
              <th rowspan="2" class="col-unit" style="border: 1px solid #000;">Unit</th>
              <th colspan="${dimColSpanComb}" style="text-align: center; border: 1px solid #000;">Measurement dimensions</th>
              <th rowspan="2" class="col-qty" style="text-align: right; border: 1px solid #000;">Quantity</th>
              <th rowspan="2" class="col-source" style="border: 1px solid #000;">Source of estimate</th>
            </tr>
            <tr style="background-color: #f8fafc; text-align: center;">
              <th class="col-l" style="border: 1px solid #000;">Length (L)</th>
              <th class="col-b" style="border: 1px solid #000;">Width (B)</th>
              <th class="col-h" style="border: 1px solid #000;">Height (H)</th>
              ${allCustomColsCombined.map((col) => `<th style="border: 1px solid #000;">${col}</th>`).join('')}
            </tr>
          </thead>
          <tbody>`;

      project.items.forEach((item, idx) => {
        const totalQty = getScopeQtyForItem(item, 'all');
        const emptyCustomCells = allCustomColsCombined.map(() => `<td style="text-align: center; border: 1px solid #000;">-</td>`).join('');
        const itemPrecision = item.precision ?? qtyPrecision;

        tableHtml += `<tr style="background-color: #f8fafc; font-weight: bold;">
          <td style="text-align: center; border: 1px solid #000;" class="col-sn"><b>${idx + 1}</b></td>
          <td style="border: 1px solid #000; word-break: break-word; white-space: normal;" class="particulars col-desc"><b>[Item ${item.item_code}] ${item.description}</b></td>
          <td style="text-align: center; border: 1px solid #000;" class="col-unit">${item.unit}</td>
          <td style="text-align: center; border: 1px solid #000;">-</td>
          <td style="text-align: center; border: 1px solid #000;">-</td>
          <td style="text-align: center; border: 1px solid #000;">-</td>
          ${emptyCustomCells}
          <td style="text-align: right; color: #1e3a8a; border: 1px solid #000;"><b>${Number(totalQty).toFixed(itemPrecision)}</b></td>
          <td style="font-size: 8.5pt; border: 1px solid #000;">${item.chapter || 'BLD Norms'}</td>
        </tr>`;

        const allRows = item.mb_rows || [];
        if (allRows.length > 0) {
          allRows.forEach((row, subIdx) => {
            const defaultBookId = mbBooks[0]?.id || 'mb_1';
            const rBook = mbBooks.find((b) => b.id === (row.mb_book_id || defaultBookId));
            const bTag = rBook ? `[${rBook.code}] ` : '';

            if (row.is_heading) {
              tableHtml += `<tr style="background-color: #f1f5f9; font-weight: bold;">
                <td style="border: 1px solid #000;"></td>
                <td colSpan="${dimColSpanComb + 4}" style="padding-left: 20px; color: #334155; border: 1px solid #000;" class="particulars col-desc"><span style="color: #1e3a8a; font-weight: bold;">${bTag}</span>📌 <i>${row.particulars}</i></td>
              </tr>`;
            } else {
              const formatMbPrintVal = (v: any) => {
                if (v === '-' || v === '' || v === undefined || v === null) return '-';
                if (typeof v === 'number') return v;
                return String(v);
              };

              const noVal = resolveFieldValue(row.no_of_units, allRows, subIdx, project.items);
              const lVal = resolveFieldValue(row.length, allRows, subIdx, project.items);
              const bVal = resolveFieldValue(row.breadth, allRows, subIdx, project.items);
              const hVal = resolveFieldValue(row.height, allRows, subIdx, project.items);
              const customTdCells = allCustomColsCombined.map((colName) => {
                const val = resolveFieldValue(row.custom_fields?.[colName], allRows, subIdx, project.items);
                return `<td style="text-align: right; border: 1px solid #000;">${formatMbPrintVal(val)}</td>`;
              }).join('');

              const isDeduction = Number(noVal) < 0 || (row.particulars && row.particulars.toLowerCase().includes('deduction'));

              tableHtml += `<tr style="${isDeduction ? 'color: #b91c1c; background-color: #fff5f5;' : ''}">
                <td style="text-align: center; color: #64748b; border: 1px solid #000;">↳</td>
                <td style="padding-left: 20px; border: 1px solid #000; word-break: break-word; white-space: normal;" class="particulars col-desc"><span style="color: #1e3a8a; font-weight: bold;">${bTag}</span>${row.particulars || 'Measurement details'}</td>
                <td style="text-align: center; border: 1px solid #000;" class="col-unit">${item.unit}</td>
                <td style="text-align: right; border: 1px solid #000;">${formatMbPrintVal(noVal)}</td>
                <td style="text-align: right; border: 1px solid #000;">${formatMbPrintVal(lVal)}</td>
                <td style="text-align: right; border: 1px solid #000;">${formatMbPrintVal(bVal)}</td>
                <td style="text-align: right; border: 1px solid #000;">${formatMbPrintVal(hVal)}</td>
                ${customTdCells}
                <td style="text-align: right; font-weight: bold; border: 1px solid #000;">${(row.quantity || 0).toFixed(itemPrecision)}</td>
                <td style="border: 1px solid #000;"></td>
              </tr>`;
            }
          });
        }
      });

      tableHtml += `</tbody>
        <tfoot>
          <tr style="background-color: #f1f5f9; font-weight: bold; font-size: 9.5pt;">
            <td colSpan="${dimColSpanComb + 4}" style="text-align: right; border: 1px solid #000;">Total Work Items:</td>
            <td style="text-align: right; color: #1e3a8a; border: 1px solid #000;">${project.items.length} Items</td>
            <td style="border: 1px solid #000;"></td>
          </tr>
        </tfoot>
      </table>`;
    } else {
      // Build Detailed Measurement Sheet for Selected MB Book
      const allCustomCols: string[] = [];
      project.items.forEach((item) => {
        (item.custom_column_names || []).forEach((col) => {
          if (col && !allCustomCols.includes(col)) allCustomCols.push(col);
        });
      });
      const dimColSpan = 3 + allCustomCols.length;
      const defaultBookId = mbBooks[0]?.id || 'mb_1';

      tableHtml = `<table border="1" cellpadding="6" cellspacing="0" class="print-table" style="width:100%; border-collapse: collapse; font-size: 9.5pt;">
        <thead>
          <tr style="background-color: #f1f5f9; text-align: center;">
            <th rowspan="2" class="col-sn" style="border: 1px solid #000;">S.No.</th>
            <th rowspan="2" class="col-desc" style="border: 1px solid #000;">Description of work/service (item)</th>
            <th rowspan="2" class="col-unit" style="border: 1px solid #000;">Unit</th>
            <th colspan="${dimColSpan}" style="text-align: center; border: 1px solid #000;">Measurement dimensions</th>
            <th rowspan="2" class="col-qty" style="text-align: right; border: 1px solid #000;">Quantity</th>
            <th rowspan="2" class="col-source" style="border: 1px solid #000;">Source of estimate</th>
          </tr>
          <tr style="background-color: #f8fafc; text-align: center;">
            <th class="col-l" style="border: 1px solid #000;">Length (L)</th>
            <th class="col-b" style="border: 1px solid #000;">Width (B)</th>
            <th class="col-h" style="border: 1px solid #000;">Height (H)</th>
            ${allCustomCols.map((col) => `<th style="border: 1px solid #000;">${col}</th>`).join('')}
          </tr>
        </thead>
        <tbody>`;

      project.items.forEach((item, idx) => {
        const scopeQty = getScopeQtyForItem(item, printTargetMBId);
        const visibleMbRows = (item.mb_rows || []).filter((r) => (r.mb_book_id || defaultBookId) === printTargetMBId);
        const emptyCustomCells = allCustomCols.map(() => `<td style="text-align: center; border: 1px solid #000;">-</td>`).join('');

        // Main item row
        tableHtml += `<tr style="background-color: #f8fafc; font-weight: bold;">
          <td style="text-align: center; border: 1px solid #000;"><b>${idx + 1}</b></td>
          <td style="border: 1px solid #000;"><b>[Item ${item.item_code}] ${item.description}</b></td>
          <td style="text-align: center; border: 1px solid #000;">${item.unit}</td>
          <td style="text-align: center; border: 1px solid #000;">-</td>
          <td style="text-align: center; border: 1px solid #000;">-</td>
          <td style="text-align: center; border: 1px solid #000;">-</td>
          ${emptyCustomCells}
          <td style="text-align: right; color: #1e3a8a; border: 1px solid #000;"><b>${Number(scopeQty).toFixed(qtyPrecision)}</b></td>
          <td style="font-size: 8.5pt; border: 1px solid #000;">${item.chapter || 'BLD Norms'}</td>
        </tr>`;

        // Sub-rows (details)
        if (visibleMbRows.length > 0) {
          visibleMbRows.forEach((row, subIdx) => {
            if (row.is_heading) {
              tableHtml += `<tr style="background-color: #f1f5f9; font-weight: bold;">
                <td style="border: 1px solid #000;"></td>
                <td colSpan="${dimColSpan + 4}" style="padding-left: 20px; color: #334155; border: 1px solid #000;">📌 <i>${row.particulars}</i></td>
              </tr>`;
            } else {
              const formatMbPrintVal = (v: any) => {
                if (v === '-' || v === '' || v === undefined || v === null) return '-';
                if (typeof v === 'number') return v;
                return String(v);
              };

              const noVal = resolveFieldValue(row.no_of_units, visibleMbRows, subIdx, project.items);
              const lVal = resolveFieldValue(row.length, visibleMbRows, subIdx, project.items);
              const bVal = resolveFieldValue(row.breadth, visibleMbRows, subIdx, project.items);
              const hVal = resolveFieldValue(row.height, visibleMbRows, subIdx, project.items);
              const customTdCells = allCustomCols.map((colName) => {
                const val = resolveFieldValue(row.custom_fields?.[colName], visibleMbRows, subIdx, project.items);
                return `<td style="text-align: right; border: 1px solid #000;">${formatMbPrintVal(val)}</td>`;
              }).join('');

              const isDeduction = Number(noVal) < 0 || (row.particulars && row.particulars.toLowerCase().includes('deduction'));

              tableHtml += `<tr style="${isDeduction ? 'color: #b91c1c; background-color: #fff5f5;' : ''}">
                <td style="text-align: center; color: #64748b; border: 1px solid #000;">↳</td>
                <td style="padding-left: 24px; border: 1px solid #000;">
                  ${row.particulars || 'Sub-measurement'} 
                  ${noVal !== '-' ? `<span style="font-size: 8.5pt; color: #64748b;">(No: ${noVal})</span>` : ''}
                </td>
                <td style="text-align: center; color: #64748b; border: 1px solid #000;">${item.unit}</td>
                <td style="text-align: right; border: 1px solid #000;">${formatMbPrintVal(lVal)}</td>
                <td style="text-align: right; border: 1px solid #000;">${formatMbPrintVal(bVal)}</td>
                <td style="text-align: right; border: 1px solid #000;">${formatMbPrintVal(hVal)}</td>
                ${customTdCells}
                <td style="text-align: right; font-weight: 600; border: 1px solid #000;">${Number(row.quantity).toFixed(qtyPrecision)}</td>
                <td style="font-size: 8.5pt; color: #64748b; border: 1px solid #000;">${row.remarks || ''}</td>
              </tr>`;
            }
          });

          // Subtotal summary line for item
          tableHtml += `<tr style="border-bottom: 2px solid #000; font-weight: bold; background-color: #f1f5f9;">
            <td style="border: 1px solid #000;"></td>
            <td style="padding-left: 24px; text-align: right; border: 1px solid #000;"><b>Total quantity (${targetBook?.code || 'MB'}):</b></td>
            <td style="text-align: center; border: 1px solid #000;"><b>${item.unit}</b></td>
            <td colSpan="${dimColSpan}" style="border: 1px solid #000;"></td>
            <td style="text-align: right; font-size: 10pt; color: #1e3a8a; border: 1px solid #000;"><b>${Number(scopeQty).toFixed(qtyPrecision)}</b></td>
            <td style="border: 1px solid #000;"></td>
          </tr>`;
        }
      });

      tableHtml += `</tbody></table>`;
    }

    const sigsHtml = signatures.map(sig => `
      <div style="text-align: center; min-width: 140px; margin: 10px;">
        <div style="border-bottom: 1.5px solid #000; width: 130px; margin: 0 auto 5px auto; height: 30px;"></div>
        <b>${sig.title}</b><br/>
        <span style="font-size: 8pt; color: #444;">${sig.designation}</span>
      </div>
    `).join('');

    tableHtml += `
    <div style="margin-top: 40px; display: flex; justify-content: space-around; font-size: 9.5pt; flex-wrap: wrap; page-break-inside: avoid;">
      ${sigsHtml}
    </div>`;

    downloadPrintableHTML({
      title: documentTitle,
      projectTitle: project.title,
      zone: selectedZone.name_en,
      fiscalYear: selectedFY,
      customHeaderHtml,
      tableHtml,
      filename: isCombinedPrint ? `Combined_MB_Summary_${project.title.replace(/\s+/g, '_')}` : `MB_${targetBook?.code || 'Detail'}_${project.title.replace(/\s+/g, '_')}`,
      orientation: printOrientation
    });
    showToast(`${isCombinedPrint ? 'Combined MB Summary' : (targetBook?.code || 'MB')} print preview generated!`);
  };

  // Export entire Measurement Book to CSV
  const handleExportMBCSV = () => {
    if (project.items.length === 0) {
      alert('Measurement Book is empty.');
      return;
    }

    let csv = `Detailed Measurement Book (MB)\n`;
    csv += `Project: ${project.title}, Zone: ${selectedZone.name_en}, Fiscal Year: ${selectedFY}\n\n`;
    csv += `Item Code,Description / Particulars,No. of Units,Length (L),Breadth / Width (B),Height / Depth (H),Measured Quantity,Unit,Remarks\n`;

    const defaultBookId = mbBooks[0]?.id || 'mb_1';

    project.items.forEach((item) => {
      const scopeQty = getScopeQtyForItem(item, activeMBBookId);
      const visibleMbRows = activeMBBookId === 'all'
        ? (item.mb_rows || [])
        : (item.mb_rows || []).filter((r) => (r.mb_book_id || defaultBookId) === activeMBBookId);

      csv += `"${item.item_code}","[ITEM] ${item.description.replace(/"/g, '""')}",,,,"${scopeQty}","${item.unit}",\n`;
      visibleMbRows.forEach((row) => {
        if (row.is_heading) {
          csv += `,"--- ${row.particulars.replace(/"/g, '""')} ---",,,,,,\n`;
        } else {
          csv += `,"${row.particulars.replace(/"/g, '""')}",${row.no_of_units},${row.length},${row.breadth},${row.height},${row.quantity},"${item.unit}","${(row.remarks || '').replace(/"/g, '""')}"\n`;
        }
      });
      csv += `,"Subtotal for Item ${item.item_code}",,,,,${scopeQty},"${item.unit}",\n\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${project.title.replace(/\s+/g, '_')}_Measurement_Book.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported Measurement Book to CSV.');
  };

  // Download Measurement Book CSV Template
  const handleDownloadMBTemplate = () => {
    const csvContent =
      'Item Code,Particulars / Location,No.,Length (L),Breadth (B),Height (H),Remarks,Chainage/Axis,Elevation\n' +
      '2.4,Main Block Foundation West Axis,2,12.50,0.35,0.60,Foundation Step 1,Axis A-B,Ground\n' +
      '2.4,Main Block Foundation East Axis,2,12.50,0.35,0.60,Foundation Step 1,Axis C-D,Ground\n' +
      '2.4,Deduction for Door Opening D1,-2,1.00,0.35,2.10,Deduction,Axis A-B,Plinth\n' +
      '4.1,PCC Floor Slab Gr. Floor,1,15.00,10.00,0.10,Slab M15,Full Floor,Level 0\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Measurement_Book_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle CSV Import for Measurement Sheet
  const handleImportCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const lines = content.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        alert('CSV file appears empty or invalid.');
        return;
      }

      // Parse CSV rows starting after header
      let importedRowsCount = 0;
      const newItemsMap: { [code: string]: MBRow[] } = {};

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim().replace(/^"/, '').replace(/"$/, ''));
        if (parts.length >= 2) {
          const code = parts[0] || '1.1';
          const particulars = parts[1] || 'Imported Entry';
          const no = parseFloat(parts[2]) || 1;
          const l = parseFloat(parts[3]) || 0;
          const b = parseFloat(parts[4]) || 0;
          const h = parseFloat(parts[5]) || 0;
          const remarks = parts[6] || 'Imported from Spreadsheet';

          let computedQty = no * l * b * h;
          if (l === 0 && b === 0 && h === 0) computedQty = no;

          const customFields: Record<string, string> = {};
          if (parts[7]) customFields['Chainage/Axis'] = parts[7];
          if (parts[8]) customFields['Elevation'] = parts[8];

          const row: MBRow = {
            id: `mb_imp_${Date.now()}_${i}`,
            particulars,
            no_of_units: no,
            length: l,
            breadth: b,
            height: h,
            quantity: Math.round(computedQty * 10000) / 10000,
            remarks,
            custom_fields: customFields
          };

          if (!newItemsMap[code]) {
            newItemsMap[code] = [];
          }
          newItemsMap[code].push(row);
          importedRowsCount++;
        }
      }

      if (importedRowsCount === 0) {
        alert('No valid measurement rows found in CSV.');
        return;
      }

      // Merge imported rows into project items and derive rates from Rate Analysis
      setProject((prev) => {
        let existingItems = [...prev.items];
        const currentMode = prev.rate_mode || 'user';

        Object.keys(newItemsMap).forEach((code) => {
          const matchIdx = existingItems.findIndex((it) => it.item_code === code);
          const rowsToAdd = newItemsMap[code];
          const matchedNorm = norms.find((n) => n.code === code);

          let userRate = 0;
          let contractorRate = 0;
          let activeRate = 0;

          if (matchedNorm) {
            const rateResult = calculateItemRate({
              norm: matchedNorm,
              resources,
              zone: selectedZone,
              fiscalYear: selectedFY,
              mode: currentMode
            });
            userRate = rateResult.user_unit_rate || rateResult.total_unit_rate;
            contractorRate = rateResult.contractor_unit_rate || rateResult.total_unit_rate;
            activeRate = rateResult.total_unit_rate;
          }

          if (matchIdx >= 0) {
            const currentItem = existingItems[matchIdx];
            const updatedRows = [...(currentItem.mb_rows || []), ...rowsToAdd];
            
            const finalUserRate = currentItem.user_rate || userRate;
            const finalContractorRate = currentItem.contractor_rate || contractorRate;
            const finalActiveRate = currentItem.calculated_unit_rate || activeRate;

            existingItems[matchIdx] = recalculateItemTotal({
              ...currentItem,
              calculated_unit_rate: finalActiveRate,
              user_rate: finalUserRate,
              contractor_rate: finalContractorRate,
              mb_rows: updatedRows
            });
          } else {
            const effRate = currentMode === 'user' ? (userRate || 8500) : (contractorRate || 8500);

            const newItem: BOQItem = {
              id: `boq_${Date.now()}_${code}_${Math.random().toString(36).substring(2, 7)}`,
              item_id: matchedNorm?.item_id || (Date.now() + Math.floor(Math.random() * 1000000)),
              item_code: code,
              description: matchedNorm?.description || `Imported Work Item (${code})`,
              unit: matchedNorm?.base_unit || 'Cu.m.',
              estimated_quantity: 0,
              calculated_unit_rate: activeRate || 8500,
              user_rate: userRate || effRate,
              contractor_rate: contractorRate || effRate,
              mode: currentMode,
              total_amount: 0,
              chapter: matchedNorm?.source || 'General Civil Works',
              mb_rows: rowsToAdd,
              custom_column_names: ['Chainage/Axis', 'Elevation']
            };
            existingItems.push(recalculateItemTotal(newItem));
          }
        });

        return {
          ...prev,
          items: recalculateAllMBItems(existingItems)
        };
      });

      showToast(`Successfully imported ${importedRowsCount} measurement detail sub-rows!`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  };

  // Listen for Ribbon Command Bar Actions
  React.useEffect(() => {
    const handleAddItem = () => setIsAddItemModalOpen(true);
    const handleAddBook = () => setIsAddMBModalOpen(true);
    const handleSelectBook = (e: any) => {
      if (e.detail) setActiveMBBookId(e.detail);
    };
    const handleToggleHeadings = () => setIsCategoryManagerExpanded((prev) => !prev);
    const handleToggleHeaderEdit = () => setIsEditingHeader((prev) => !prev);
    const handleToggleExpand = () => setExpandAllItems((prev) => !prev);
    const handleImportSheet = () => fileInputRef.current?.click();
    const handleExportExcel = () => handleExportMBExcel();
    const handleOfficeSync = () => setIsOfficeSyncModalOpen(true);
    const handleAddRow = () => {
      if (project.items.length > 0) {
        handleAddSubRow(project.items[0].id);
      } else {
        setIsAddItemModalOpen(true);
        showToast('Please add a work item to insert measurement rows.');
      }
    };
    const handleAddDeduction = () => {
      if (project.items.length > 0) {
        handleAddDeductionRow(project.items[0].id);
      } else {
        setIsAddItemModalOpen(true);
        showToast('Please add a work item to insert deduction rows.');
      }
    };
    const handlePrintAction = (e: any) => {
      if (e.detail?.target) setPrintTargetMBId(e.detail.target);
      if (e.detail?.orientation) setPrintOrientation(e.detail.orientation);
      setTimeout(() => {
        handlePrintMB();
      }, 50);
    };
    const handleSyncBOQ = () => {
      showToast('✓ All Measurement Book quantities synchronized with BOQ abstract!');
    };
    const handleSetDisplayMode = (e: any) => {
      if (e.detail) {
        setCombinedDisplayMode(e.detail);
        if (e.detail === 'both' || e.detail === 'details') {
          setExpandAllItems(true);
        }
        window.dispatchEvent(new CustomEvent('uev:mb-display-mode-changed', { detail: e.detail }));
        showToast(`Display mode: ${e.detail === 'both' ? 'All-in-One' : e.detail === 'matrix' ? 'Matrix Summary' : 'Itemized Details'}`);
      }
    };
    const handleSetPrecision = (e: any) => {
      if (e.detail !== undefined) {
        const prec = Number(e.detail);
        setProject(prev => ({
          ...prev,
          user_estimate_config: {
            ...prev.user_estimate_config,
            quantity_precision: prec
          },
          items: prev.items.map(it => ({ ...it, precision: prec }))
        }));
        showToast(`MB precision set to ${prec} decimal places.`);
      }
    };
    const handleBlankSheet = () => {
      if (project.items.length === 0) {
        showToast('Measurement Book is already a clean blank sheet.');
        return;
      }
      if (confirm('Clear all measurement items and reset to a clean official blank ruled sheet?')) {
        setProject(prev => ({
          ...prev,
          items: []
        }));
        showToast('Measurement Book reset to clean blank ruled sheet.');
      }
    };
    const handleLoadSample = () => {
      const sampleItems: BOQItem[] = [
        {
          id: 'item_sample_1',
          item_id: 1,
          item_code: '1.1',
          description: 'Earthwork excavation in foundation trenches and drains including dressing, ramming, and shoring (BLD Section 1)',
          unit: 'Cu.m.',
          calculated_unit_rate: 345.50,
          total_amount: 50199.77,
          estimated_quantity: 145.296,
          chapter: 'Earthworks & Site Clearance',
          mb_rows: [
            {
              id: 'row_s1_1',
              mb_book_id: mbBooks[0]?.id || 'mb_1',
              particulars: 'Main Foundation Trench along Grid Axis A-D',
              no_of_units: 4,
              length: 12.50,
              breadth: 1.20,
              height: 1.50,
              quantity: 90.00
            },
            {
              id: 'row_s1_2',
              mb_book_id: mbBooks[0]?.id || 'mb_1',
              particulars: 'Cross Foundation Trench along Grid Axis 1-4',
              no_of_units: 4,
              length: 8.40,
              breadth: 1.20,
              height: 1.50,
              quantity: 60.48
            },
            {
              id: 'row_s1_3',
              mb_book_id: mbBooks[0]?.id || 'mb_1',
              particulars: 'Deduction (-) Column Footing Intersections',
              no_of_units: -12,
              length: 1.20,
              breadth: 1.20,
              height: 0.30,
              quantity: -5.184
            }
          ]
        },
        {
          id: 'item_sample_2',
          item_id: 2,
          item_code: '1.3',
          description: 'Providing and laying flat brick soling dry packed with sand filling (BLD Section 1)',
          unit: 'Sq.m.',
          calculated_unit_rate: 890.00,
          total_amount: 68886.00,
          estimated_quantity: 77.40,
          chapter: 'Earthworks & Site Clearance',
          mb_rows: [
            {
              id: 'row_s2_1',
              mb_book_id: mbBooks[0]?.id || 'mb_1',
              particulars: 'Flat brick soling under Column Footings',
              no_of_units: 12,
              length: 1.50,
              breadth: 1.50,
              height: 1.00,
              quantity: 27.00
            },
            {
              id: 'row_s2_2',
              mb_book_id: mbBooks[0]?.id || 'mb_1',
              particulars: 'Flat brick soling along Wall Foundations',
              no_of_units: 1,
              length: 42.00,
              breadth: 1.20,
              height: 1.00,
              quantity: 50.40
            }
          ]
        },
        {
          id: 'item_sample_3',
          item_id: 3,
          item_code: '2.1',
          description: 'Cement concrete (1:3:6) M10 nominal mix with 20mm down crushed aggregate in foundation and under floors',
          unit: 'Cu.m.',
          calculated_unit_rate: 8650.00,
          total_amount: 59685.00,
          estimated_quantity: 6.90,
          chapter: 'Concrete Works',
          mb_rows: [
            {
              id: 'row_s3_1',
              mb_book_id: mbBooks[0]?.id || 'mb_1',
              particulars: 'Mud Mat / Plain Cement Concrete (1:3:6) bed under Footings',
              no_of_units: 12,
              length: 1.50,
              breadth: 1.50,
              height: 0.10,
              quantity: 2.70
            },
            {
              id: 'row_s3_2',
              mb_book_id: mbBooks[0]?.id || 'mb_1',
              particulars: 'PCC bed under Wall Footing trenches',
              no_of_units: 1,
              length: 42.00,
              breadth: 1.00,
              height: 0.10,
              quantity: 4.20
            }
          ]
        },
        {
          id: 'item_sample_4',
          item_id: 4,
          item_code: '3.2',
          description: 'Reinforced Cement Concrete (1:1.5:3) M20 with 20mm graded stone ballast in columns & grade beams',
          unit: 'Cu.m.',
          calculated_unit_rate: 14200.00,
          total_amount: 226795.30,
          estimated_quantity: 15.9715,
          chapter: 'Concrete Works',
          mb_rows: [
            {
              id: 'row_s4_1',
              mb_book_id: mbBooks[0]?.id || 'mb_1',
              particulars: 'Isolated Column Footings (Trapezoidal + Pad)',
              no_of_units: 12,
              length: 1.35,
              breadth: 1.35,
              height: 0.45,
              quantity: 9.8415
            },
            {
              id: 'row_s4_2',
              mb_book_id: mbBooks[0]?.id || 'mb_1',
              particulars: 'Column Stubs up to Plinth Level (C1)',
              no_of_units: 12,
              length: 0.30,
              breadth: 0.30,
              height: 1.80,
              quantity: 1.944
            },
            {
              id: 'row_s4_3',
              mb_book_id: mbBooks[0]?.id || 'mb_1',
              particulars: 'Plinth Tie Beams (PB-1)',
              no_of_units: 1,
              length: 52.00,
              breadth: 0.23,
              height: 0.35,
              quantity: 4.186
            }
          ]
        },
        {
          id: 'item_sample_5',
          item_id: 5,
          item_code: '4.1',
          description: 'First class brick masonry work in 1:4 cement sand mortar in foundation and plinth wall',
          unit: 'Cu.m.',
          calculated_unit_rate: 11450.00,
          total_amount: 170009.60,
          estimated_quantity: 14.848,
          chapter: 'Masonry Works',
          mb_rows: [
            {
              id: 'row_s5_1',
              mb_book_id: mbBooks[0]?.id || 'mb_1',
              particulars: 'Plinth wall along outer perimeter',
              no_of_units: 2,
              length: 14.50,
              breadth: 0.35,
              height: 0.90,
              quantity: 9.135
            },
            {
              id: 'row_s5_2',
              mb_book_id: mbBooks[0]?.id || 'mb_1',
              particulars: 'Plinth wall along inner partitions',
              no_of_units: 3,
              length: 9.20,
              breadth: 0.23,
              height: 0.90,
              quantity: 5.713
            }
          ]
        }
      ];

      setProject(prev => ({
        ...prev,
        items: sampleItems
      }));
      setExpandAllItems(true);
      showToast('Standard civil engineering sample measurements loaded!');
    };
    const handleLinkGuide = () => {
      setLinkModalOpen(true);
    };
    const handleAddCustomCol = () => {
      setIsCustomColModalOpen(true);
    };
    const handleDeleteBookAction = (e: any) => {
      if (e.detail) {
        handleDeleteMBBook(e.detail);
      }
    };
    const handleToggleSignaturesAction = () => {
      setIsSignaturesModalOpen(prev => !prev);
    };

    window.addEventListener('uev:mb-add-item', handleAddItem);
    window.addEventListener('uev:mb-add-book', handleAddBook);
    window.addEventListener('uev:mb-select-book', handleSelectBook);
    window.addEventListener('uev:mb-toggle-headings', handleToggleHeadings);
    window.addEventListener('uev:mb-toggle-header-edit', handleToggleHeaderEdit);
    window.addEventListener('uev:mb-toggle-expand', handleToggleExpand);
    window.addEventListener('uev:mb-import-sheet', handleImportSheet);
    window.addEventListener('uev:mb-export-excel', handleExportExcel);
    window.addEventListener('uev:mb-office-sync', handleOfficeSync);
    window.addEventListener('uev:mb-add-row', handleAddRow);
    window.addEventListener('uev:mb-add-deduction', handleAddDeduction);
    window.addEventListener('uev:mb-print', handlePrintAction);
    window.addEventListener('uev:mb-sync-boq', handleSyncBOQ);
    window.addEventListener('uev:mb-set-display-mode', handleSetDisplayMode);
    window.addEventListener('uev:mb-set-precision', handleSetPrecision);
    window.addEventListener('uev:mb-blank-sheet', handleBlankSheet);
    window.addEventListener('uev:mb-load-sample', handleLoadSample);
    window.addEventListener('uev:mb-link-guide', handleLinkGuide);
    window.addEventListener('uev:mb-add-custom-col', handleAddCustomCol);
    window.addEventListener('uev:mb-delete-book', handleDeleteBookAction);
    window.addEventListener('uev:mb-toggle-signatures', handleToggleSignaturesAction);

    return () => {
      window.removeEventListener('uev:mb-add-item', handleAddItem);
      window.removeEventListener('uev:mb-add-book', handleAddBook);
      window.removeEventListener('uev:mb-select-book', handleSelectBook);
      window.removeEventListener('uev:mb-toggle-headings', handleToggleHeadings);
      window.removeEventListener('uev:mb-toggle-header-edit', handleToggleHeaderEdit);
      window.removeEventListener('uev:mb-toggle-expand', handleToggleExpand);
      window.removeEventListener('uev:mb-import-sheet', handleImportSheet);
      window.removeEventListener('uev:mb-export-excel', handleExportExcel);
      window.removeEventListener('uev:mb-office-sync', handleOfficeSync);
      window.removeEventListener('uev:mb-add-row', handleAddRow);
      window.removeEventListener('uev:mb-add-deduction', handleAddDeduction);
      window.removeEventListener('uev:mb-print', handlePrintAction);
      window.removeEventListener('uev:mb-sync-boq', handleSyncBOQ);
      window.removeEventListener('uev:mb-set-display-mode', handleSetDisplayMode);
      window.removeEventListener('uev:mb-set-precision', handleSetPrecision);
      window.removeEventListener('uev:mb-blank-sheet', handleBlankSheet);
      window.removeEventListener('uev:mb-load-sample', handleLoadSample);
      window.removeEventListener('uev:mb-link-guide', handleLinkGuide);
      window.removeEventListener('uev:mb-add-custom-col', handleAddCustomCol);
      window.removeEventListener('uev:mb-delete-book', handleDeleteBookAction);
      window.removeEventListener('uev:mb-toggle-signatures', handleToggleSignaturesAction);
    };
  }, [project.items, activeMBBookId, mbBooks, printTargetMBId, printOrientation]);

  const fontSizeClass = getFontSizeClasses(formatPreferences.display.fontSize);
  const density = getDensityClasses(formatPreferences.display.tableDensity);

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 ${fontSizeClass}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 bg-red-700 text-white px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2 border border-red-800 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input for CSV Import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv,.txt"
        onChange={handleImportCSVFile}
        className="hidden"
      />



      {/* Bloat-Free Measurement Book Summary Bar */}
      <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-700 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
            <Ruler className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 text-sm">
Measurement Book
              </span>
              <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-900 px-2 py-0.5 rounded border border-purple-200">
                {activeMBBookId === 'all' ? 'Combined All Books' : `${activeMBBook?.code}: ${activeMBBook?.title}`}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
              <span className="font-semibold text-slate-700">{project.title}</span>
              <span>•</span>
              <span>{project.items.length} Work Items</span>
              <span>•</span>
              <span className="font-mono text-slate-600">{selectedZone?.name_en} (FY {project.fiscal_year || selectedFY})</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={() => setIsAddItemModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Add work item from Norms Library to Measurement Book"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Work Item</span>
          </button>
          <button
            onClick={() => setShowLetterhead(!showLetterhead)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              showLetterhead
                ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold'
                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
            }`}
            title="Toggle official letterhead"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>{showLetterhead ? 'Hide Letterhead' : 'Govt Letterhead'}</span>
            {showLetterhead ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* OFFICIAL GOVERNMENT LETTERHEAD BANNER */}
      <div className={`${showLetterhead ? 'block' : 'hidden print:block'} bg-white border border-slate-300 rounded-2xl p-5 shadow-xs text-center space-y-2 relative print:border-none print:shadow-none print:p-2 animate-fadeIn`}>
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Government</div>
        <div className="text-xl font-black text-slate-900 tracking-wide">{headerMetadata.authorityName || 'Local Authority Office'}</div>
        <div className="text-sm font-bold text-blue-900">{headerMetadata.officeName || 'Local Authority Office, Planning and Infrastructure Section'}</div>
        <div className="text-xs font-semibold text-slate-600">{headerMetadata.officeAddress || selectedZone?.name_en || 'Capital City'}</div>
        <div className="inline-block mt-2 px-4 py-1 bg-red-50 text-red-900 border border-red-200 rounded-xl font-black text-sm uppercase tracking-wider">
Measurement Book
        </div>
        
        {/* Project Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-3 text-[11px] text-left border-t border-slate-200 mt-3 bg-slate-50/70 p-3 rounded-xl">
          <div><span className="text-slate-500 font-medium block">Project name:</span><span className="font-bold text-slate-900 truncate block">{headerMetadata.projectName || project.title}</span></div>
          <div><span className="text-slate-500 font-medium block">Fiscal year:</span><span className="font-bold text-blue-900 block">{project.fiscal_year || selectedFY}</span></div>
          <div><span className="text-slate-500 font-medium block">Location / zone:</span><span className="font-bold text-slate-800 block">{headerMetadata.location || selectedZone?.name_en || 'Capital City'}</span></div>
          <div><span className="text-slate-500 font-medium block">Agreement no:</span><span className="font-mono font-bold text-slate-800 block">{headerMetadata.contractNo || '-'}</span></div>
          <div><span className="text-slate-500 font-medium block">Contractor:</span><span className="font-bold text-slate-800 block">{headerMetadata.contractorName || '-'}</span></div>
          <div><span className="text-slate-500 font-medium block">Date / sheet:</span><span className="font-mono font-bold text-slate-800 block">{headerMetadata.measurementDate} (P.{headerMetadata.pageNo})</span></div>
        </div>
      </div>

      {/* EXPANDABLE OFFICIAL HEADER CARD (WHEN EDITING) */}
      {isEditingHeader && (
        <div className="bg-white rounded-2xl border border-indigo-200 p-5 shadow-sm space-y-4 print:mb-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-black">
Measurement Book
              </span>
              <span className="text-xs font-bold text-slate-700">
                Fiscal year: <span className="text-indigo-700 font-extrabold">{project.fiscal_year || selectedFY}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveHeaderMetadata}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-2xs cursor-pointer"
              >
                ✓ Save & Close
              </button>
              <button
                onClick={() => setIsEditingHeader(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                title="Close Header Editor"
              >
                ✕
              </button>
            </div>
          </div>

          {/* EDITABLE HEADER FORM GRID */}
          <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-4 text-xs">
            {/* Standard Project Metadata Headings */}
            <div className="space-y-3">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">1. Official office and project details:</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div className="relative">
                  <label className="font-bold text-slate-700 block mb-1">Local authority name:</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={headerMetadata.authorityName}
                      onChange={(e) => setHeaderMetadata({ ...headerMetadata, authorityName: e.target.value })}
                      className="w-full bg-white px-2.5 py-1 border rounded-lg font-bold text-slate-900 text-xs"
                    />
                    <button type="button" onClick={() => setHeaderMetadata({ ...headerMetadata, authorityName: '' })} className="text-slate-400 hover:text-red-600 font-bold px-1" title="Clear heading">✕</button>
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Office name:</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={headerMetadata.officeName}
                      onChange={(e) => setHeaderMetadata({ ...headerMetadata, officeName: e.target.value })}
                      className="w-full bg-white px-2.5 py-1 border rounded-lg font-bold text-slate-900 text-xs"
                    />
                    <button type="button" onClick={() => setHeaderMetadata({ ...headerMetadata, officeName: '' })} className="text-slate-400 hover:text-red-600 font-bold px-1" title="Clear heading">✕</button>
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Office address / location:</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={headerMetadata.officeAddress}
                      onChange={(e) => setHeaderMetadata({ ...headerMetadata, officeAddress: e.target.value })}
                      className="w-full bg-white px-2.5 py-1 border rounded-lg font-bold text-slate-900 text-xs"
                    />
                    <button type="button" onClick={() => setHeaderMetadata({ ...headerMetadata, officeAddress: '' })} className="text-slate-400 hover:text-red-600 font-bold px-1" title="Clear heading">✕</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Project / construction work name:</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={headerMetadata.projectName}
                      onChange={(e) => setHeaderMetadata({ ...headerMetadata, projectName: e.target.value })}
                      className="w-full bg-white px-2.5 py-1 border rounded-lg font-bold text-slate-900 text-xs"
                    />
                    <button type="button" onClick={() => setHeaderMetadata({ ...headerMetadata, projectName: '' })} className="text-slate-400 hover:text-red-600 font-bold px-1" title="Clear heading">✕</button>
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Implementation Location:</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={headerMetadata.location}
                      onChange={(e) => setHeaderMetadata({ ...headerMetadata, location: e.target.value })}
                      className="w-full bg-white px-2.5 py-1 border rounded-lg font-bold text-slate-900 text-xs"
                    />
                    <button type="button" onClick={() => setHeaderMetadata({ ...headerMetadata, location: '' })} className="text-slate-400 hover:text-red-600 font-bold px-1" title="Clear heading">✕</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Agreement no:</label>
                  <input
                    type="text"
                    value={headerMetadata.contractNo}
                    onChange={(e) => setHeaderMetadata({ ...headerMetadata, contractNo: e.target.value })}
                    className="w-full bg-white px-2.5 py-1 border rounded-lg font-mono font-bold text-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Contractor name:</label>
                  <input
                    type="text"
                    value={headerMetadata.contractorName}
                    onChange={(e) => setHeaderMetadata({ ...headerMetadata, contractorName: e.target.value })}
                    className="w-full bg-white px-2.5 py-1 border rounded-lg font-bold text-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Measurement date:</label>
                  <input
                    type="text"
                    value={headerMetadata.measurementDate}
                    onChange={(e) => setHeaderMetadata({ ...headerMetadata, measurementDate: e.target.value })}
                    className="w-full bg-white px-2.5 py-1 border rounded-lg font-mono font-bold text-slate-900 text-center text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Sheet no:</label>
                  <input
                    type="text"
                    value={headerMetadata.pageNo}
                    onChange={(e) => setHeaderMetadata({ ...headerMetadata, pageNo: e.target.value })}
                    className="w-full bg-white px-2.5 py-1 border rounded-lg font-mono font-bold text-slate-900 text-center text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Custom Project Headings Section */}
            <div className="border-t border-blue-200 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Custom Headings:</span>
                <button
                  type="button"
                  onClick={handleAddCustomHeading}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add heading
                </button>
              </div>

              {customHeadings.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic bg-white/60 p-2 rounded-lg border border-slate-200">
                  No custom headings have been added. To add one, click '+ Add heading' Click
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {customHeadings.map((h) => (
                    <div key={h.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-300">
                      <input
                        type="text"
                        value={h.label}
                        onChange={(e) => handleUpdateCustomHeading(h.id, 'label', e.target.value)}
                        placeholder="Label"
                        className="w-1/2 px-2 py-1 text-xs border rounded font-semibold text-slate-800"
                      />
                      <input
                        type="text"
                        value={h.value}
                        onChange={(e) => handleUpdateCustomHeading(h.id, 'value', e.target.value)}
                        placeholder="Value"
                        className="w-1/2 px-2 py-1 text-xs border rounded font-bold text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomHeading(h.id)}
                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        title="Delete Heading"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dynamic Table Column Labels Customization Section */}
            <div className="border-t border-blue-200 pt-3 space-y-2">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">Table Column Headers:</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-white p-3 rounded-xl border border-slate-300">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Particulars</label>
                  <input
                    type="text"
                    value={columnLabels.particulars || ''}
                    onChange={(e) => setColumnLabels({ ...columnLabels, particulars: e.target.value })}
                    className="w-full px-2 py-1 text-xs border rounded font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">No. / Quantity</label>
                  <input
                    type="text"
                    value={columnLabels.no_of_units || ''}
                    onChange={(e) => setColumnLabels({ ...columnLabels, no_of_units: e.target.value })}
                    className="w-full px-2 py-1 text-xs border rounded font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Length</label>
                  <input
                    type="text"
                    value={columnLabels.length || ''}
                    onChange={(e) => setColumnLabels({ ...columnLabels, length: e.target.value })}
                    className="w-full px-2 py-1 text-xs border rounded font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Breadth</label>
                  <input
                    type="text"
                    value={columnLabels.breadth || ''}
                    onChange={(e) => setColumnLabels({ ...columnLabels, breadth: e.target.value })}
                    className="w-full px-2 py-1 text-xs border rounded font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Height</label>
                  <input
                    type="text"
                    value={columnLabels.height || ''}
                    onChange={(e) => setColumnLabels({ ...columnLabels, height: e.target.value })}
                    className="w-full px-2 py-1 text-xs border rounded font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Quantity</label>
                  <input
                    type="text"
                    value={columnLabels.quantity || ''}
                    onChange={(e) => setColumnLabels({ ...columnLabels, quantity: e.target.value })}
                    className="w-full px-2 py-1 text-xs border rounded font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Unit</label>
                  <input
                    type="text"
                    value={columnLabels.unit || ''}
                    onChange={(e) => setColumnLabels({ ...columnLabels, unit: e.target.value })}
                    className="w-full px-2 py-1 text-xs border rounded font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Rate</label>
                  <input
                    type="text"
                    value={columnLabels.rate || ''}
                    onChange={(e) => setColumnLabels({ ...columnLabels, rate: e.target.value })}
                    className="w-full px-2 py-1 text-xs border rounded font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Amount</label>
                  <input
                    type="text"
                    value={columnLabels.amount || ''}
                    onChange={(e) => setColumnLabels({ ...columnLabels, amount: e.target.value })}
                    className="w-full px-2 py-1 text-xs border rounded font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Remarks</label>
                  <input
                    type="text"
                    value={columnLabels.remarks || ''}
                    onChange={(e) => setColumnLabels({ ...columnLabels, remarks: e.target.value })}
                    className="w-full px-2 py-1 text-xs border rounded font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveHeaderMetadata}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-2xs cursor-pointer"
              >
                ✓ Save All Headings & Column Labels
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPANDABLE CATEGORY HEADINGS MANAGER (WHEN EXPANDED) */}
      {isCategoryManagerExpanded && (
        <div className="bg-slate-50/95 border border-slate-200 rounded-xl p-3 shadow-2xs print:hidden animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-blue-600" />
              <span className="font-extrabold text-xs text-slate-900">MB Section Headings Manager</span>
              <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                {allCategoryHeadings.length} Categories
              </span>
            </div>
            <button
              onClick={() => setIsCategoryManagerExpanded(false)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
              title="Close Section Headings Manager"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2.5 pt-2.5">
            <p className="text-[11px] text-slate-600 font-medium">
              Add section headings (e.g. Protection Works, Culvert Works). Work items selected with these headings automatically organize under section headers in the Estimate.
            </p>
            <form onSubmit={handleAddCategoryHeading} className="flex items-center gap-2">
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                placeholder="e.g. Protection Works, Culvert..."
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600 w-52 shadow-2xs"
              />
              <button
                type="submit"
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-2xs flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add</span>
              </button>
            </form>

            {/* Category Pills list */}
            {allCategoryHeadings.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {allCategoryHeadings.map((catName) => {
                  const itemCount = project.items.filter((i) => (i.chapter || 'General Works') === catName).length;
                  const isDefaultGeneral = catName === 'General Works';
                  return (
                    <div
                      key={catName}
                      className={`inline-flex items-center gap-1.5 bg-white border text-xs font-medium px-2.5 py-0.5 rounded-lg shadow-2xs ${
                        itemCount > 0 ? 'border-blue-300 text-blue-950 bg-blue-50/50 font-bold' : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      <span>📁 {catName}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          itemCount > 0 ? 'bg-blue-200/80 text-blue-900' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {itemCount}
                      </span>
                      {!isDefaultGeneral && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategoryHeading(catName)}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-0.5 rounded transition cursor-pointer ml-0.5"
                          title={`Delete category heading "${catName}"`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMBINED MB QUANTITY MATRIX SUMMARY TABLE */}
      {activeMBBookId === 'all' && (combinedDisplayMode === 'matrix' || combinedDisplayMode === 'both') && project.items.length > 0 && (
        <div className="bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4.5 h-4.5 text-amber-400" />
              <h3 className="font-black text-sm tracking-wide">
                Combined MB Quantity Summary Matrix (By MB Book Titles)
              </h3>
            </div>
            <span className="text-xs text-amber-300 font-bold bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              Summed up from {mbBooks.length} MB Books
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 uppercase text-[10px] font-extrabold text-slate-700 border-b-2 border-slate-300">
                <tr>
                  <th className="p-3 text-center w-12 border-r border-slate-300">S.N.</th>
                  <th className="p-3 w-28 border-r border-slate-300">Norm Code</th>
                  <th className="p-3 min-w-[240px] border-r border-slate-300">Description / Particulars</th>
                  <th className="p-3 text-center w-20 border-r border-slate-300">Unit</th>
                  {mbBooks.map((book) => (
                    <th key={book.id} className="p-3 text-right min-w-[130px] border-r border-slate-300 bg-blue-50/80 text-blue-950 font-black">
                      <div className="flex flex-col items-end">
                        <span>{book.code}</span>
                        <span className="text-[9px] font-medium text-slate-500 truncate max-w-[120px]">{book.title}</span>
                      </div>
                    </th>
                  ))}
                  <th className="p-3 text-right min-w-[140px] bg-emerald-100/90 text-emerald-950 font-black text-xs">
                    <div className="flex flex-col items-end">
                      <span>Summed Up Qty</span>
                      <span className="text-[9px] font-medium text-emerald-800">(Total Measured)</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {project.items.map((item, idx) => {
                  const itemPrecision = item.precision ?? project.user_estimate_config?.quantity_precision ?? 2;
                  const totalQty = getScopeQtyForItem(item, 'all');

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 text-center font-bold text-slate-600 border-r border-slate-200">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-red-700 border-r border-slate-200 bg-red-50/30">{item.item_code}</td>
                      <td className="p-3 border-r border-slate-200 font-semibold text-slate-900">{item.description}</td>
                      <td className="p-3 text-center font-medium text-slate-600 border-r border-slate-200">{item.unit}</td>
                      {mbBooks.map((book) => {
                        const bookQty = getScopeQtyForItem(item, book.id);
                        return (
                          <td key={book.id} className="p-3 text-right font-mono font-bold text-blue-900 border-r border-slate-200 bg-blue-50/30">
                            {bookQty > 0 ? (
                              <button
                                type="button"
                                onClick={() => setActiveMBBookId(book.id)}
                                className="hover:underline hover:text-blue-700 cursor-pointer text-xs"
                                title={`Click to view/edit ${book.code}`}
                              >
                                {bookQty.toLocaleString('en-US', { minimumFractionDigits: itemPrecision, maximumFractionDigits: itemPrecision })}
                              </button>
                            ) : (
                              <span className="text-slate-300 font-normal">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-3 text-right font-mono font-black text-emerald-900 bg-emerald-50/80 text-sm">
                        {totalQty.toLocaleString('en-US', { minimumFractionDigits: itemPrecision, maximumFractionDigits: itemPrecision })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-extrabold text-xs">
                <tr>
                  <td colSpan={4 + mbBooks.length} className="p-3 text-right">
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

      {/* Main Measurement Book List */}
      {(activeMBBookId !== 'all' || combinedDisplayMode === 'details' || combinedDisplayMode === 'both') && (
        project.items.length === 0 ? (
        <div className="bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden space-y-0">
          {/* Official Letterhead Strip inside Book */}
          <div className="bg-slate-50 border-b border-slate-300 p-4 text-center">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Government</div>
            <div className="text-lg font-black text-slate-900">{headerMetadata.authorityName || 'Local Authority Office'}</div>
            <div className="text-xs font-bold text-blue-900">{headerMetadata.officeName || 'Local Authority Office, Planning and Infrastructure Section'}</div>
            <div className="text-[11px] text-slate-600">{headerMetadata.officeAddress || selectedZone?.name_en || 'Capital City'}</div>
            <div className="inline-block mt-1 px-3 py-0.5 bg-red-50 text-red-900 border border-red-200 rounded-lg font-black text-xs uppercase tracking-wider">
Measurement Book
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 text-[11px] text-left border-t border-slate-200 mt-2 bg-white p-2.5 rounded-lg">
              <div><span className="text-slate-500 font-medium block">Project:</span><span className="font-bold text-slate-900 truncate block">{headerMetadata.projectName || project.title}</span></div>
              <div><span className="text-slate-500 font-medium block">FY.:</span><span className="font-bold text-blue-900 block">{project.fiscal_year || selectedFY}</span></div>
              <div><span className="text-slate-500 font-medium block">Contract no:</span><span className="font-mono font-bold text-slate-800 block">{headerMetadata.contractNo || '-'}</span></div>
              <div><span className="text-slate-500 font-medium block">Date:</span><span className="font-mono font-bold text-slate-800 block">{headerMetadata.measurementDate} (P.{headerMetadata.pageNo})</span></div>
            </div>
          </div>

          {/* Clean Official Ruled Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 uppercase text-[10px] font-black text-slate-700 border-b-2 border-slate-300">
                <tr>
                  <th className="p-3 text-center w-12 border-r border-slate-300">S.N.</th>
                  <th className="p-3 w-28 border-r border-slate-300">Norm Code</th>
                  <th className="p-3 min-w-[260px] border-r border-slate-300">Description / Particulars</th>
                  <th className="p-3 text-center w-16 border-r border-slate-300">No.</th>
                  <th className="p-3 text-right w-20 border-r border-slate-300">Length (L)</th>
                  <th className="p-3 text-right w-20 border-r border-slate-300">Breadth (B)</th>
                  <th className="p-3 text-right w-20 border-r border-slate-300">Height (H)</th>
                  <th className="p-3 text-right w-24 border-r border-slate-300">Quantity</th>
                  <th className="p-3 text-center w-16 border-r border-slate-300">Unit</th>
                  <th className="p-3 w-28">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[1, 2, 3, 4, 5, 6, 7].map((rowIdx) => (
                  <tr key={rowIdx} className={`h-11 ${rowIdx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'} hover:bg-blue-50/30 transition`}>
                    <td className="p-3 text-center font-mono text-slate-400 border-r border-slate-200">{rowIdx}</td>
                    <td className="p-3 border-r border-slate-200"></td>
                    <td className="p-3 border-r border-slate-200"></td>
                    <td className="p-3 border-r border-slate-200"></td>
                    <td className="p-3 border-r border-slate-200"></td>
                    <td className="p-3 border-r border-slate-200"></td>
                    <td className="p-3 border-r border-slate-200"></td>
                    <td className="p-3 border-r border-slate-200"></td>
                    <td className="p-3 border-r border-slate-200"></td>
                    <td className="p-3"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Clean Interactive Action Banner on the Ruled Sheet */}
          <div className="bg-slate-50 border-t border-slate-300 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Official Blank Ruled Sheet Ready for Measurements</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddItemModalOpen(true)}
                className="bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                + Add Work Item to MB
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('uev:mb-load-sample'))}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Boxes className="w-4 h-4" />
                📋 Load Sample Civil Measurements
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-300 transition cursor-pointer"
              >
                📥 Import Excel / CSV
              </button>
            </div>
          </div>

          {/* Official Signatures Block at Bottom of Ruled Sheet */}
          <div className="bg-white border-t border-slate-200 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              {signatures.map((sig) => (
                <div key={sig.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 flex flex-col justify-between min-h-[120px]">
                  <div className="border-b border-dashed border-slate-300 pb-8">
                    <span className="text-[10px] text-slate-400 italic">Signature</span>
                  </div>
                  <div className="pt-2">
                    <div className="text-xs font-black text-slate-900">{sig.title}</div>
                    <div className="text-[11px] text-slate-600 font-semibold">{sig.designation}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {project.items.map((item, idx) => {
            const isExpanded = expandAllItems || expandedItemId === item.id;
            const mbRows = item.mb_rows || [];
            const unitRate = getItemUnitRate(item);
            const customCols = item.custom_column_names || [];
            const itemPrecision = item.precision ?? project.user_estimate_config?.quantity_precision ?? 2;
            const getColsAtPos = (pos: CustomColPosition) => 
              customCols.filter((col) => (item.custom_column_config?.[col]?.position || 'after_h') === pos);

            const renderCustomColHeader = (colName: string) => {
              const config = item.custom_column_config?.[colName];
              const modeLabel = config?.calcMode === 'multiply' ? ' (×)' :
                                config?.calcMode === 'add' ? ' (+)' :
                                config?.calcMode === 'subtract' ? ' (-)' : '';
              const isIncludedInCalc = !item.included_calc_columns || item.included_calc_columns.includes(colName);
              return (
                <th key={colName} className="p-2 min-w-[130px] text-blue-900 bg-blue-50/70 border border-slate-300 text-center">
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <div className="flex items-center gap-1 font-bold">
                      <span>{colName}{modeLabel}</span>
                      <button
                        onClick={() => handleRemoveCustomColumn(item.id, colName)}
                        className="text-slate-400 hover:text-red-700 font-bold print:hidden text-xs"
                        title={`Remove custom column ${colName}`}
                      >
                        ✕
                      </button>
                    </div>
                    {config?.calcMode && config.calcMode !== 'none' && (
                      <label className="flex items-center gap-1 text-[9px] font-normal cursor-pointer text-slate-600 hover:text-slate-900 print:hidden">
                        <input
                          type="checkbox"
                          checked={isIncludedInCalc}
                          onChange={() => handleToggleCalcColumn(item.id, colName)}
                          className="w-3 h-3 text-emerald-600 rounded focus:ring-0"
                          title="Toggle in quantity formula"
                        />
                        <span>Calc</span>
                      </label>
                    )}
                  </div>
                </th>
              );
            };

            const renderCustomColCell = (r: MBRow, colName: string) => {
              const rIdx = mbRows.indexOf(r);
              const customVal = r.custom_fields?.[colName] !== undefined ? r.custom_fields[colName] : '';
              return (
                <td key={colName} className="p-2 bg-blue-50/30 border border-slate-300">
                  <SpreadsheetCell
                    value={customVal}
                    onChange={(newVal) =>
                      handleUpdateCustomField(item.id, r.id, colName, String(newVal))
                    }
                    onEvaluateFormula={(f) => evaluateMBFormula(f, mbRows, rIdx, project.items)}
                    placeholder={`Enter ${colName}`}
                    className="text-center font-medium"
                    precision={itemPrecision}
                  />
                </td>
              );
            };

            const colsBeforeQty = 5 + customCols.length - getColsAtPos('before_remarks').length;
            const colsAfterQty = 2 + getColsAtPos('before_remarks').length;

            const scopeQty = getScopeQtyForItem(item, activeMBBookId);
            const scopeAmount = scopeQty * unitRate;
            const defaultBookId = mbBooks[0]?.id || 'mb_1';
            const visibleMbRows = activeMBBookId === 'all'
              ? mbRows
              : mbRows.filter((r) => (r.mb_book_id || defaultBookId) === activeMBBookId);

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition"
              >
                {/* Item Header Bar */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 bg-blue-900 text-white rounded-lg flex items-center justify-center text-xs font-mono font-black">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-red-700 text-xs bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                          Norm {item.item_code}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900">{item.description}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-medium flex flex-wrap items-center gap-2 mt-1">
                        <span>Unit: <strong className="text-slate-900 font-bold">{item.unit}</strong></span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <span className="text-[10px] font-extrabold uppercase text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">Category:</span>
                          <select
                            value={item.chapter || 'General Works'}
                            onChange={(e) => {
                              if (e.target.value === '__NEW_CAT__') {
                                setAddCategoryForItemId(item.id);
                                setNewCategoryModalName('');
                              } else {
                                handleUpdateItemChapter(item.id, e.target.value);
                              }
                            }}
                            className="text-[11px] font-bold text-blue-950 bg-white border-2 border-blue-300 hover:border-red-500 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-red-500 shadow-2xs cursor-pointer"
                          >
                            {allCategoryHeadings.map((cat) => (
                              <option key={cat} value={cat}>📁 {cat}</option>
                            ))}
                            <option value="__NEW_CAT__">➕ Add New Category...</option>
                          </select>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold uppercase text-slate-500">Decimals:</span>
                          <select
                            value={itemPrecision}
                            onChange={(e) => handleUpdateItemPrecision(item.id, parseInt(e.target.value, 10))}
                            className="text-[11px] font-bold text-blue-900 bg-white border border-blue-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            title="Set decimal precision for this item of work"
                          >
                            <option value={1}>1 Dec (0.0)</option>
                            <option value={2}>2 Dec (0.00)</option>
                            <option value={3}>3 Dec (0.000)</option>
                            <option value={4}>4 Dec (0.0000)</option>
                          </select>

                          <label className="flex items-center gap-1 cursor-pointer text-[11px] font-bold text-slate-700 bg-white border border-blue-200 rounded px-1.5 py-0.5 hover:bg-slate-50 shadow-2xs" title="Truncate total quantity decimal places instead of rounding">
                            <input
                              type="checkbox"
                              checked={item.truncate_quantity ?? project.user_estimate_config?.truncate_quantity ?? false}
                              onChange={(e) => handleUpdateItemTruncate(item.id, e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                            />
                            <span className="text-[10px] uppercase font-extrabold text-blue-900">Truncate</span>
                          </label>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Quantity</span>
                      <span className="text-base font-mono font-black text-blue-900">
                        {scopeQty.toLocaleString('en-US', {
                          minimumFractionDigits: itemPrecision,
                          maximumFractionDigits: itemPrecision
                        })}{' '}
                        <span className="text-xs font-normal text-slate-600">{item.unit}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300">
                      <button
                        onClick={() => handleAddSubRow(item.id)}
                        className="px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold shadow-2xs transition flex items-center gap-1 cursor-pointer"
                        title="Add Measurement Detail Row"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Row</span>
                      </button>

                      {/* Item Actions More Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenItemMenuId(openItemMenuId === item.id ? null : item.id)}
                          className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg transition cursor-pointer"
                          title="More item actions (Sub-heading, Deduction, Formula, Custom Col, Move, Duplicate, Delete)"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {openItemMenuId === item.id && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setOpenItemMenuId(null)}
                            />
                            <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-medium animate-fadeIn">
                              <button
                                onClick={() => {
                                  setOpenItemMenuId(null);
                                  handleAddSubHeading(item.id);
                                }}
                                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-purple-50 text-purple-900 transition cursor-pointer"
                              >
                                <FolderPlus className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                                <span>+ Sub-Section Heading</span>
                              </button>
                              <button
                                onClick={() => {
                                  setOpenItemMenuId(null);
                                  handleAddDeductionRow(item.id);
                                }}
                                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-amber-50 text-amber-900 transition cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                <span>+ Deduction Row</span>
                              </button>
                              <button
                                onClick={() => {
                                  setOpenItemMenuId(null);
                                  setLinkModalOpen(true);
                                }}
                                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-blue-50 text-blue-900 transition cursor-pointer font-mono"
                              >
                                <Link2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                                <span>fx Link / Formula</span>
                              </button>
                              <button
                                onClick={() => {
                                  setOpenItemMenuId(null);
                                  setTargetItemIdForCol(item.id);
                                  setIsCustomColModalOpen(true);
                                }}
                                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-100 text-slate-800 transition cursor-pointer"
                              >
                                <Grid className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                <span>+ Custom Column</span>
                              </button>
                              <div className="my-1 border-t border-slate-100" />
                              <button
                                onClick={() => {
                                  setOpenItemMenuId(null);
                                  handleDuplicateItem(item.id);
                                }}
                                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-indigo-50 text-indigo-900 transition cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span>Duplicate Item</span>
                              </button>
                              <button
                                onClick={() => {
                                  setOpenItemMenuId(null);
                                  handleMoveItem(item.id, 'up');
                                }}
                                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                              >
                                <ChevronUp className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                <span>Move Item Up</span>
                              </button>
                              <button
                                onClick={() => {
                                  setOpenItemMenuId(null);
                                  handleMoveItem(item.id, 'down');
                                }}
                                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                              >
                                <ChevronDown className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                <span>Move Item Down</span>
                              </button>
                              <div className="my-1 border-t border-slate-100" />
                              <button
                                onClick={() => {
                                  setOpenItemMenuId(null);
                                  setItemToDelete({
                                    id: item.id,
                                    item_code: item.item_code,
                                    description: item.description
                                  });
                                }}
                                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-rose-50 text-rose-700 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>Delete Item</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                        className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg transition cursor-pointer"
                        title={isExpanded ? 'Collapse Sheet' : 'Expand Measurement Sheet'}
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub-Rows Measurement Table */}
                {isExpanded && (
                  <div className="p-4 bg-white space-y-3">
                    {activeMBBookId === 'all' && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-700">MB Quantities Breakdown:</span>
                        {mbBooks.map((b) => {
                          const bQty = getScopeQtyForItem(item, b.id);
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => setActiveMBBookId(b.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                bQty > 0
                                  ? 'bg-blue-100 text-blue-900 border border-blue-300 hover:bg-blue-200'
                                  : 'bg-slate-100 text-slate-400 border border-slate-200'
                              }`}
                              title={`Click to switch to ${b.code} (${b.title})`}
                            >
                              <span>{b.code}:</span>
                              <span className="font-mono">{bQty.toFixed(itemPrecision)} {item.unit}</span>
                            </button>
                          );
                        })}
                        <span className="ml-auto text-xs font-black text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg">
                          Combined Qty: {scopeQty.toFixed(itemPrecision)} {item.unit}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap justify-between items-center text-xs text-slate-600 border-b border-slate-200 pb-2 gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-slate-900">
                          Measurement Sub-Rows ({visibleMbRows.length} {visibleMbRows.length === 1 ? 'entry' : 'entries'})
                        </span>
                        {customCols.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-extrabold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              Custom Columns:
                            </span>
                            {customCols.map((col) => (
                              <span
                                key={col}
                                className="inline-flex items-center gap-1 bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-bold px-2 py-0.5 rounded-full"
                              >
                                <span>{col}</span>
                                <button
                                  onClick={() => handleRemoveCustomColumn(item.id, col)}
                                  className="text-slate-400 hover:text-red-700 font-bold ml-0.5"
                                  title={`Remove custom column ${col}`}
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {(() => {
                      if (visibleMbRows.length === 0) {
                        return (
                          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 space-y-2">
                            <p className="text-xs text-slate-600 font-medium">
                              {activeMBBookId === 'all'
                                ? 'No detail measurement rows recorded for this item yet.'
                                : `No detail measurement rows in ${mbBooks.find(b => b.id === activeMBBookId)?.code} for this item.`}
                            </p>
                            <button
                              onClick={() => handleAddSubRow(item.id)}
                              className="px-3 py-1.5 bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                            >
                              + Add Detail Measurement Row
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-2xs">
                          <table className="w-full text-xs text-left border-collapse border border-slate-300">
                            <thead className="bg-slate-100 uppercase text-[10px] font-extrabold text-slate-700 border-b border-slate-300">
                              <tr>
                                <th className="p-2.5 min-w-[220px] border border-slate-300">{columnLabels.particulars || "Particulars / Location Description"}</th>
                              {getColsAtPos('after_particulars').map((col) => renderCustomColHeader(col))}
                              <th className="p-2 text-center w-20 border border-slate-300">
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <span>{columnLabels.no_of_units || "No."}</span>
                                  <label className="flex items-center gap-1 text-[9px] font-normal cursor-pointer text-slate-600 hover:text-slate-900 print:hidden">
                                    <input
                                      type="checkbox"
                                      checked={!item.included_calc_columns || item.included_calc_columns.includes('no_of_units')}
                                      onChange={() => handleToggleCalcColumn(item.id, 'no_of_units')}
                                      className="w-3 h-3 text-emerald-600 rounded focus:ring-0"
                                      title="Toggle No. in quantity formula"
                                    />
                                    <span>Calc</span>
                                  </label>
                                </div>
                              </th>
                              {getColsAtPos('after_no').map((col) => renderCustomColHeader(col))}
                              <th className="p-2 text-center w-24 border border-slate-300">
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <span>{columnLabels.length || "Length (L)"}</span>
                                  <label className="flex items-center gap-1 text-[9px] font-normal cursor-pointer text-slate-600 hover:text-slate-900 print:hidden">
                                    <input
                                      type="checkbox"
                                      checked={!item.included_calc_columns || item.included_calc_columns.includes('length')}
                                      onChange={() => handleToggleCalcColumn(item.id, 'length')}
                                      className="w-3 h-3 text-emerald-600 rounded focus:ring-0"
                                      title="Toggle Length in quantity formula"
                                    />
                                    <span>Calc</span>
                                  </label>
                                </div>
                              </th>
                              <th className="p-2 text-center w-24 border border-slate-300">
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <span>{columnLabels.breadth || "Breadth (B)"}</span>
                                  <label className="flex items-center gap-1 text-[9px] font-normal cursor-pointer text-slate-600 hover:text-slate-900 print:hidden">
                                    <input
                                      type="checkbox"
                                      checked={!item.included_calc_columns || item.included_calc_columns.includes('breadth')}
                                      onChange={() => handleToggleCalcColumn(item.id, 'breadth')}
                                      className="w-3 h-3 text-emerald-600 rounded focus:ring-0"
                                      title="Toggle Breadth in quantity formula"
                                    />
                                    <span>Calc</span>
                                  </label>
                                </div>
                              </th>
                              <th className="p-2 text-center w-24 border border-slate-300">
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <span>{columnLabels.height || "Height (H)"}</span>
                                  <label className="flex items-center gap-1 text-[9px] font-normal cursor-pointer text-slate-600 hover:text-slate-900 print:hidden">
                                    <input
                                      type="checkbox"
                                      checked={!item.included_calc_columns || item.included_calc_columns.includes('height')}
                                      onChange={() => handleToggleCalcColumn(item.id, 'height')}
                                      className="w-3 h-3 text-emerald-600 rounded focus:ring-0"
                                      title="Toggle Height in quantity formula"
                                    />
                                    <span>Calc</span>
                                  </label>
                                </div>
                              </th>
                              {getColsAtPos('after_h').map((col) => renderCustomColHeader(col))}
                              <th className="p-2.5 text-right w-28 text-blue-900 font-black border border-slate-300">{columnLabels.quantity || "Quantity"} ({item.unit})</th>
                              {getColsAtPos('before_remarks').map((col) => renderCustomColHeader(col))}
                              <th className="p-2.5 min-w-[140px] border border-slate-300">{columnLabels.remarks || "Remarks"}</th>
                              <th className="p-2.5 text-center w-12 border border-slate-300 print:hidden">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {visibleMbRows.map((r) => {
                              const rIdx = mbRows.indexOf(r);
                              const assignedBook = mbBooks.find(b => b.id === r.mb_book_id) || mbBooks[0];

                              if (r.is_heading) {
                                const totalColsCount = (activeMBBookId === 'all' ? 8 : 7) + customCols.length;
                                return (
                                  <tr key={r.id} className="bg-amber-50/90 border-y-2 border-amber-200">
                                    <td colSpan={totalColsCount} className="p-2.5 border border-slate-300 font-bold text-amber-950">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-amber-700">📌</span>
                                          <input
                                            type="text"
                                            value={r.particulars}
                                            onChange={(e) =>
                                              handleUpdateSubRow(item.id, r.id, 'particulars', e.target.value)
                                            }
                                            className="bg-white font-bold text-xs text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500 rounded px-2.5 py-1 w-full max-w-md border border-amber-300"
                                            placeholder="Enter sub-heading title..."
                                          />
                                        </div>
                                        <button
                                          onClick={() => handleDeleteSubRow(item.id, r.id)}
                                          className="text-xs bg-red-100 hover:bg-red-200 text-red-800 font-bold px-2.5 py-1 rounded-lg border border-red-300 transition flex items-center gap-1.5 print:hidden"
                                          title="Delete this sub-heading row"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                          <span>Remove Sub-heading</span>
                                        </button>
                                      </div>
                                    </td>
                                    <td className="p-2 text-center border border-slate-300 print:hidden">
                                      <button
                                        onClick={() => handleDeleteSubRow(item.id, r.id)}
                                        className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                        title="Delete sub-heading"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              }

                              return (
                                <tr key={r.id} className="hover:bg-slate-50 transition">
                                  <td className="p-2 border border-slate-300">
                                    <div className="flex items-center gap-1.5">
                                      {activeMBBookId === 'all' && mbBooks.length > 1 && (
                                        <select
                                          value={r.mb_book_id || mbBooks[0]?.id}
                                          onChange={(e) => handleUpdateSubRow(item.id, r.id, 'mb_book_id', e.target.value)}
                                          className="text-[10px] font-black bg-blue-50 text-blue-900 border border-blue-200 rounded px-1.5 py-1 focus:ring-1 focus:ring-blue-500 shrink-0 cursor-pointer"
                                          title="Assign measurement row to a specific Measurement Book"
                                        >
                                          {mbBooks.map((b) => (
                                            <option key={b.id} value={b.id}>
                                              {b.code}
                                            </option>
                                          ))}
                                        </select>
                                      )}
                                      <input
                                        type="text"
                                        value={r.particulars}
                                        onChange={(e) =>
                                          handleUpdateSubRow(item.id, r.id, 'particulars', e.target.value)
                                        }
                                        className="w-full p-1.5 border rounded-lg text-xs font-semibold bg-white border-slate-300 focus:ring-1 focus:ring-red-500"
                                        placeholder="e.g. Foundation Footing F1..."
                                      />
                                    </div>
                                  </td>

                                  {getColsAtPos('after_particulars').map((col) => renderCustomColCell(r, col))}

                                  <td className="p-2 text-center border border-slate-300">
                                    <SpreadsheetCell
                                      value={r.no_of_units}
                                      onChange={(newVal) =>
                                        handleUpdateSubRow(item.id, r.id, 'no_of_units', newVal)
                                      }
                                      onEvaluateFormula={(f) => evaluateMBFormula(f, mbRows, rIdx, project.items)}
                                      type="number"
                                      step="0.1"
                                      className="text-center"
                                      precision={itemPrecision}
                                    />
                                  </td>

                                  {getColsAtPos('after_no').map((col) => renderCustomColCell(r, col))}

                                  <td className="p-2 text-center border border-slate-300">
                                    <SpreadsheetCell
                                      value={r.length}
                                      onChange={(newVal) =>
                                        handleUpdateSubRow(item.id, r.id, 'length', newVal)
                                      }
                                      onEvaluateFormula={(f) => evaluateMBFormula(f, mbRows, rIdx, project.items)}
                                      type="number"
                                      step="0.01"
                                      className="text-center"
                                      precision={itemPrecision}
                                    />
                                  </td>

                                  <td className="p-2 text-center border border-slate-300">
                                    <SpreadsheetCell
                                      value={r.breadth}
                                      onChange={(newVal) =>
                                        handleUpdateSubRow(item.id, r.id, 'breadth', newVal)
                                      }
                                      onEvaluateFormula={(f) => evaluateMBFormula(f, mbRows, rIdx, project.items)}
                                      type="number"
                                      step="0.01"
                                      className="text-center"
                                      precision={itemPrecision}
                                    />
                                  </td>

                                  <td className="p-2 text-center border border-slate-300">
                                    <SpreadsheetCell
                                      value={r.height}
                                      onChange={(newVal) =>
                                        handleUpdateSubRow(item.id, r.id, 'height', newVal)
                                      }
                                      onEvaluateFormula={(f) => evaluateMBFormula(f, mbRows, rIdx, project.items)}
                                      type="number"
                                      step="0.01"
                                      className="text-center"
                                      precision={itemPrecision}
                                    />
                                  </td>

                                  {getColsAtPos('after_h').map((col) => renderCustomColCell(r, col))}

                                  <td className="p-2 text-right font-mono font-black text-blue-900 border border-slate-300">
                                    <SpreadsheetCell
                                      value={r.formula || r.quantity}
                                      onChange={(newVal) =>
                                        handleUpdateSubRow(
                                          item.id,
                                          r.id,
                                          typeof newVal === 'string' && newVal.startsWith('=') ? 'formula' : 'quantity',
                                          newVal
                                        )
                                      }
                                      onEvaluateFormula={(f) => evaluateMBFormula(f, mbRows, rIdx, project.items)}
                                      isCalculated={!r.formula}
                                      suffix={item.unit}
                                      precision={itemPrecision}
                                    />
                                  </td>

                                  {getColsAtPos('before_remarks').map((col) => renderCustomColCell(r, col))}

                                  <td className="p-2 border border-slate-300">
                                    <input
                                      type="text"
                                      value={r.remarks || ''}
                                      onChange={(e) =>
                                        handleUpdateSubRow(item.id, r.id, 'remarks', e.target.value)
                                      }
                                      className="w-full p-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 bg-white"
                                      placeholder="Optional note"
                                    />
                                  </td>

                                  <td className="p-1 text-center border border-slate-300 print:hidden whitespace-nowrap">
                                    <div className="inline-flex items-center gap-0.5">
                                      <button
                                        onClick={() => handleDuplicateSubRow(item.id, r.id)}
                                        className="p-1 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition cursor-pointer"
                                        title="Duplicate row (Dup)"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleMoveSubRow(item.id, r.id, 'up')}
                                        className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition cursor-pointer"
                                        title="Move row up (↑)"
                                      >
                                        <ChevronUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleMoveSubRow(item.id, r.id, 'down')}
                                        className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition cursor-pointer"
                                        title="Move row down (↓)"
                                      >
                                        <ChevronDown className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteSubRow(item.id, r.id)}
                                        className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                                        title="Delete row (Del)"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>

                          {/* Footer Sum for Item */}
                          <tfoot className="bg-slate-100 font-bold text-xs text-slate-900 border-t-2 border-slate-300">
                            <tr>
                              <td colSpan={colsBeforeQty} className="p-2.5 text-right font-extrabold border border-slate-300">
                                Total Calculated Quantity for Norm {item.item_code}
                                {activeMBBookId !== 'all' && activeMBBook ? ` (${activeMBBook.code})` : ''}:
                              </td>
                              <td className="p-2.5 text-right font-mono font-black text-red-700 text-sm border border-slate-300">
                                {scopeQty.toLocaleString('en-US', {
                                  minimumFractionDigits: itemPrecision,
                                  maximumFractionDigits: itemPrecision
                                })} {item.unit}
                              </td>
                              <td colSpan={colsAfterQty} className="border border-slate-300 print:hidden"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    );
                  })()}
                  </div>
                )}
              </div>
            );
          })}

          {/* Official Signatures Block at Bottom of Populated MB */}
          <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-xs mt-6 print:border-none print:shadow-none print:p-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 print:hidden">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-teal-600" />
                <span className="font-extrabold text-xs text-slate-900">Official Sign-Offs & Verification Block</span>
              </div>
              <button
                onClick={() => setIsSignaturesModalOpen(true)}
                className="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Signatories
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              {signatures.map((sig) => (
                <div key={sig.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 flex flex-col justify-between min-h-[130px]">
                  <div className="border-b border-dashed border-slate-300 pb-10">
                    <span className="text-[10px] text-slate-400 italic">Signature</span>
                  </div>
                  <div className="pt-2">
                    <div className="text-xs font-black text-slate-900">{sig.title}</div>
                    <div className="text-[11px] text-slate-600 font-semibold">{sig.designation}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    )}

      {/* Modal: Add Item from Norm Specifications to MB */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-700" />
                Add Work Item to Measurement Book
              </h3>
              <button
                onClick={() => setIsAddItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Search Norms Bar */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Search Norm Code / Description</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={normSearchQuery}
                    onChange={(e) => setNormSearchQuery(e.target.value)}
                    placeholder="Type Norm Code (e.g., 2.4, 4.1) or keyword..."
                    className="w-full pl-9 pr-3 py-2 border rounded-xl font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 border-slate-300"
                  />
                </div>
              </div>

              {/* Norm List Picker */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Select Norm Item(s) ({filteredNorms.length} available)</label>
                  {selectedNormIds.length > 0 && (
                    <button
                      onClick={() => setSelectedNormIds([])}
                      className="text-[11px] font-bold text-red-600 hover:underline"
                    >
                      Clear Selection ({selectedNormIds.length})
                    </button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                  {filteredNorms.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 font-medium">
                      No matching norms found for "{normSearchQuery}".
                    </div>
                  ) : (
                    filteredNorms.map((n, idx) => {
                      const isSelected = selectedNormIds.includes(n.item_id) || selectedNormId === n.item_id;
                      return (
                        <div
                          key={`${n.item_id}_${n.code}_${idx}`}
                          onClick={() => {
                            if (selectedNormIds.includes(n.item_id)) {
                              setSelectedNormIds(selectedNormIds.filter(id => id !== n.item_id));
                            } else {
                              setSelectedNormIds([...selectedNormIds, n.item_id]);
                              setSelectedNormId(n.item_id);
                            }
                          }}
                          className={`p-3 cursor-pointer flex items-start justify-between gap-3 transition ${
                            isSelected ? 'bg-red-50 border-l-4 border-red-700' : 'hover:bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="mt-1 w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 shrink-0 pointer-events-none"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-red-700 bg-white px-2 py-0.5 rounded border border-red-200 text-xs">
                                  Code {n.code}
                                </span>
                                <span className="font-bold text-slate-900 text-xs">{n.description}</span>
                              </div>
                              <span className="text-[11px] text-slate-500 font-medium block mt-1">
                                Source: {n.source} | Base Unit: <strong className="text-slate-800">{n.base_unit}</strong>
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddItemToMB([n.item_id]);
                            }}
                            className="bg-red-700 hover:bg-red-800 text-white font-bold text-xs px-2.5 py-1 rounded-lg shrink-0 shadow-xs cursor-pointer"
                          >
                            + Norm
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>
                  Select checkboxes above, then click "+ Norms" to add them all at once.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsAddItemModalOpen(false)}
                className="px-3 py-1.5 border rounded-xl text-xs font-semibold hover:bg-slate-50 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddItemToMB()}
                className="px-3.5 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                + Add Selected ({selectedNormIds.length > 0 ? selectedNormIds.length : 1})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Custom Column to MB Table */}
      {isCustomColModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Grid className="w-5 h-5 text-blue-900" />
                Add Custom Column to MB Table
              </h3>
              <button
                onClick={() => setIsCustomColModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Column Title / Name</label>
                <input
                  type="text"
                  value={newCustomColName}
                  onChange={(e) => setNewCustomColName(e.target.value)}
                  placeholder="e.g. Chainage, Grid Axis, Elevation, Deduction Note"
                  className="w-full p-2.5 border rounded-xl font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600 border-slate-300"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Include in Quantity Calculation?</label>
                <select
                  value={newCustomColCalcMode}
                  onChange={(e) => setNewCustomColCalcMode(e.target.value as CustomColCalcMode)}
                  className="w-full p-2.5 border rounded-xl font-semibold bg-white border-slate-300 focus:ring-2 focus:ring-blue-600 text-slate-800"
                >
                  <option value="none">No - Reference / Info Only (Default)</option>
                  <option value="multiply">Yes - Multiply (×) with No. × L × B × H</option>
                  <option value="add">Yes - Add (+) numeric value to row quantity</option>
                  <option value="subtract">Yes - Subtract (-) numeric value (Deduction)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  {newCustomColCalcMode === 'multiply' && 'Useful for extra multiplication factors like thickness or repetitive counts.'}
                  {newCustomColCalcMode === 'add' && 'Adds whatever numeric value you enter in this column directly to the row quantity.'}
                  {newCustomColCalcMode === 'subtract' && 'Subtracts whatever numeric value you enter in this column from the row quantity.'}
                  {newCustomColCalcMode === 'none' && 'Does not alter the standard Qty = No. × L × B × H formula.'}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Column Position in Table</label>
                <select
                  value={newCustomColPosition}
                  onChange={(e) => setNewCustomColPosition(e.target.value as CustomColPosition)}
                  className="w-full p-2.5 border rounded-xl font-semibold bg-white border-slate-300 focus:ring-2 focus:ring-blue-600 text-slate-800"
                >
                  <option value="after_particulars">After Particulars / Location Description</option>
                  <option value="after_no">After No. of Units</option>
                  <option value="after_h">After Height (H) - Before Quantity (Default)</option>
                  <option value="before_remarks">After Quantity - Before Remarks</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed">
                Adding a custom column creates a dedicated cell for every row. Its calculation rule and position will apply instantly.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsCustomColModalOpen(false)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-50 text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomColumn}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Linking Cells / MB Items */}
      {linkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-700 border border-blue-200">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Link MB Cell & Item Reference Guide</h3>
                  <p className="text-xs text-slate-500">Click any formula code below to copy it to your clipboard for use in length, breadth, height, or quantity cells.</p>
                </div>
              </div>
              <button
                onClick={() => setLinkModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-950 space-y-1">
              <div className="font-bold text-blue-900">💡 How to Link Cells & Custom Columns in MB:</div>
              <p>In any numeric cell (No, L, B, H, Custom Column, or Qty), type <code className="bg-white px-1.5 py-0.5 rounded border font-mono font-bold text-blue-700">=ITEM("1.1").QTY</code> or click a button below to copy syntax.</p>
              <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
                <span className="bg-white px-2 py-0.5 rounded border border-blue-200"><b>=ITEM("1.1").QTY</b> (Item Total)</span>
                <span className="bg-white px-2 py-0.5 rounded border border-blue-200"><b>=I1.R1.L</b> (Item 1 Row 1 Length)</span>
                <span className="bg-white px-2 py-0.5 rounded border border-blue-200"><b>=I1.R1.Thickness</b> (Custom Column)</span>
                <span className="bg-white px-2 py-0.5 rounded border border-blue-200"><b>=R1.L * 2</b> (Same Item Row 1)</span>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {project.items.map((item, idx) => (
                <div key={item.id} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-xs text-slate-900">
                      Item {idx + 1}: <span className="font-mono text-blue-800 font-black">{item.item_code}</span> - {item.description}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`=ITEM("${item.item_code}").QTY`);
                        showToast(`Copied formula: =ITEM("${item.item_code}").QTY`);
                      }}
                      className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-[11px] font-bold shadow-xs transition flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy Item Qty (=ITEM("{item.item_code}").QTY)
                    </button>
                  </div>

                  {item.mb_rows && item.mb_rows.length > 0 && (
                    <div className="pl-4 border-l-2 border-blue-200 space-y-1.5 pt-1">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Sub-Rows in Item {item.item_code}:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {item.mb_rows.map((row, rIdx) => (
                          <div key={row.id} className="bg-white border border-slate-200 rounded-lg p-2 text-xs flex flex-col gap-1 shadow-2xs">
                            <div className="font-semibold text-slate-800 truncate">Row {rIdx + 1}: {row.particulars || 'Unnamed row'}</div>
                            <div className="flex flex-wrap gap-1">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`=ITEM("${item.item_code}").R${rIdx + 1}.L`);
                                  showToast(`Copied: =ITEM("${item.item_code}").R${rIdx + 1}.L`);
                                }}
                                className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border rounded font-mono text-[10px] transition"
                              >
                                L ({row.length})
                              </button>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`=ITEM("${item.item_code}").R${rIdx + 1}.B`);
                                  showToast(`Copied: =ITEM("${item.item_code}").R${rIdx + 1}.B`);
                                }}
                                className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border rounded font-mono text-[10px] transition"
                              >
                                B ({row.breadth})
                              </button>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`=ITEM("${item.item_code}").R${rIdx + 1}.H`);
                                  showToast(`Copied: =ITEM("${item.item_code}").R${rIdx + 1}.H`);
                                }}
                                className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border rounded font-mono text-[10px] transition"
                              >
                                H ({row.height})
                              </button>
                              {(item.custom_column_names || []).map((colName) => (
                                <button
                                  key={colName}
                                  onClick={() => {
                                    navigator.clipboard.writeText(`=ITEM("${item.item_code}").R${rIdx + 1}.${colName}`);
                                    showToast(`Copied: =ITEM("${item.item_code}").R${rIdx + 1}.${colName}`);
                                  }}
                                  className="px-1.5 py-0.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded font-mono text-[10px] font-bold transition"
                                >
                                  {colName} ({row.custom_fields?.[colName] ?? '-'})
                                </button>
                              ))}
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`=ITEM("${item.item_code}").R${rIdx + 1}.QTY`);
                                  showToast(`Copied: =ITEM("${item.item_code}").R${rIdx + 1}.QTY`);
                                }}
                                className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded font-mono text-[10px] font-bold transition"
                              >
                                Qty ({row.quantity})
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                onClick={() => setLinkModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition"
              >
                Close Reference
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Work Item Deletion */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Delete Work Item?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to delete work item{' '}
                  <strong className="text-slate-900 font-mono">Norm {itemToDelete.item_code}</strong> (
                  <span className="font-semibold text-slate-800">{itemToDelete.description}</span>)?
                </p>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium mt-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    This action will permanently remove this item and all its measurement detail entries from both the Measurement Book and the Estimate Abstract.
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteItem}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Yes, Delete Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Category Heading Deletion */}
      {categoryToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Delete Category Heading?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to delete category heading{' '}
                  <strong className="text-slate-900 font-bold">"{categoryToDelete.name}"</strong>?
                </p>
                {categoryToDelete.affectedCount > 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium mt-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      This heading contains <strong>{categoryToDelete.affectedCount} work item(s)</strong>. Deleting it will reassign those items to <strong>"General Works"</strong>.
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 font-medium pt-1">
                    This category heading has no items assigned and will be removed.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Yes, Delete Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Adding New Category Heading */}
      {addCategoryForItemId !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form onSubmit={handleConfirmAddNewCategoryModal} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-900 border border-blue-200 flex items-center justify-center font-bold">
                <FolderPlus className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Add New Section Category</h3>
                <p className="text-xs text-slate-500">Create a new heading to organize work items</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Category Heading Name</label>
              <input
                type="text"
                value={newCategoryModalName}
                onChange={(e) => setNewCategoryModalName(e.target.value)}
                placeholder="e.g. Protection Works, Culvert Works, River Training"
                autoFocus
                className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setAddCategoryForItemId(null);
                  setNewCategoryModalName('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newCategoryModalName.trim()}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Save & Assign Category
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: MS Excel / LibreOffice Live Sync */}
      <OfficeLiveSyncModal
        isOpen={isOfficeSyncModalOpen}
        onClose={() => setIsOfficeSyncModalOpen(false)}
        project={project}
        setProject={setProject}
        zone={selectedZone}
        fiscalYear={selectedFY}
        showToast={showToast}
      />

      {/* MODAL: Add New Measurement Book (MB Book) */}
      {isAddMBModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-700" />
                <span>Add New Measurement Book (MB)</span>
              </h3>
              <button
                onClick={() => setIsAddMBModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMBBook} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">MB Book Code / Number (e.g. MB-02, MB-CIVIL):</label>
                <input
                  type="text"
                  required
                  placeholder={`e.g. MB-0${mbBooks.length + 1}`}
                  value={newMBCode}
                  onChange={(e) => setNewMBCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">MB Book Title / Section Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Substructure & Retaining Wall Works"
                  value={newMBTitle}
                  onChange={(e) => setNewMBTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Remarks / Location Description (Optional):</label>
                <textarea
                  placeholder="e.g. Measurements for Chainage 0+000 to 0+500"
                  value={newMBRemarks}
                  onChange={(e) => setNewMBRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddMBModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
                >
                  ➕ Create MB Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Official Signatories Manager */}
      {isSignaturesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-black text-slate-900">Official Signatories</h3>
              </div>
              <button
                onClick={() => setIsSignaturesModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Configure official signatories printed at the bottom of each Measurement Book sheet. Titles and designations can be customized.
            </p>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {signatures.map((sig, sIdx) => (
                <div key={sig.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-700">Signatory #{sIdx + 1}</span>
                    {signatures.length > 1 && (
                      <button
                        onClick={() => handleRemoveSignature(sig.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Title</label>
                      <input
                        type="text"
                        value={sig.title}
                        onChange={(e) => handleSignatureChange(sig.id, 'title', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border rounded-lg font-bold text-slate-900 bg-white border-slate-300"
                        placeholder="e.g. Prepared by"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Designation</label>
                      <input
                        type="text"
                        value={sig.designation}
                        onChange={(e) => handleSignatureChange(sig.id, 'designation', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border rounded-lg font-bold text-slate-900 bg-white border-slate-300"
                        placeholder="e.g. Sub-Engineer"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddSignature}
              className="w-full py-2 border-2 border-dashed border-teal-300 hover:border-teal-500 text-teal-700 hover:bg-teal-50/50 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Add Signatory Block
            </button>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsSignaturesModalOpen(false)}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
