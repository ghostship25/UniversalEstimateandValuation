import React, { useState, useMemo, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Printer,
  Download,
  CheckCircle2,
  Edit2,
  DollarSign,
  Layers,
  Boxes,
  PenTool,
  Ruler,
  BookOpen,
  Copy,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Save,
  RotateCcw,
  RotateCw,
  Building2,
  HelpCircle,
  MoreVertical,
  MoreHorizontal
} from 'lucide-react';
import { BOQItem, ProjectEstimate, ZoneInfo, RateNormItem, ResourceMaster } from '../types';
import { SignatureBlock } from '../modules/valuation/CompletionCertificateView';
import { downloadPrintableHTML } from '../services/printExport';
import { exportEstimateToExcel } from '../services/excelExport';
import { exportMasterWorkbookExcel } from '../services/batchExport';
import { calculateItemRate, calcQuantityVal } from '../services/rateEngine';
import { BOQExcelImportModal } from './BOQExcelImportModal';
import { currencyCode } from '../services/currency';

interface BOQViewProps {
  project: ProjectEstimate;
  setProject: React.Dispatch<React.SetStateAction<ProjectEstimate>>;
  selectedZone: ZoneInfo;
  selectedFY: string;
  norms?: RateNormItem[];
  setNorms?: React.Dispatch<React.SetStateAction<RateNormItem[]>>;
  resources?: ResourceMaster[];
  onNavigateToTab?: (tab: string) => void;
}

export const BOQView: React.FC<BOQViewProps> = ({
  project,
  setProject,
  selectedZone,
  selectedFY,
  norms = [],
  setNorms,
  resources = [],
  onNavigateToTab
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [showProjectDetails, setShowProjectDetails] = useState<boolean>(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState<boolean>(false);
  const [normSearchQuery, setNormSearchQuery] = useState<string>('');
  const [selectedNormId, setSelectedNormId] = useState<number>(norms[0]?.item_id || 0);
  const [selectedNormIds, setSelectedNormIds] = useState<number[]>(norms[0]?.item_id ? [norms[0].item_id] : []);
  const [isImportExcelModalOpen, setIsImportExcelModalOpen] = useState<boolean>(false);

  // Category & Abstract Headings States
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState<string>('');
  const [isAddingCategoryModalOpen, setIsAddingCategoryModalOpen] = useState<boolean>(false);
  const [newCategoryInput, setNewCategoryInput] = useState<string>('');
  const [isEditHeadingsModalOpen, setIsEditHeadingsModalOpen] = useState<boolean>(false);

  // Dynamic & Editable Signature Headings
  const [signatures, setSignatures] = useState<SignatureBlock[]>([
    { id: '1', title: 'Prepared By', designation: 'Site Engineer / Sub-Engineer' },
    { id: '2', title: 'Checked By', designation: 'Engineer' },
    { id: '3', title: 'Approved By', designation: 'Chief / Administrative Officer' }
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const rateMode = project.rate_mode || 'user';

  const setRateMode = (mode: 'user' | 'contractor') => {
    setProject((prev) => ({ ...prev, rate_mode: mode }));
    showToast(`Switched BOQ Estimate to ${mode === 'user' ? 'User (Office)' : 'Contractor (Tender)'} Mode.`);
  };

  // Option to filter BOQ data by Combined MBs or Individual MB
  const [selectedMBFilter, setSelectedMBFilter] = useState<string>('all');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);

  // Excel Format State Controls
  const [activeRibbonMenu, setActiveRibbonMenu] = useState<string | null>(null);
  const [activeCell, setActiveCell] = useState<{ ref: string; formula: string; value?: string }>({
    ref: 'F10',
    formula: '=SUMPRODUCT(E10:E15, F10:F15)',
    value: 'Direct Civil Subtotal'
  });
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showSignaturesSection, setShowSignaturesSection] = useState<boolean>(false);
  const [showProvisionalSection, setShowProvisionalSection] = useState<boolean>(true);

  const mbBooksList = useMemo(() => {
    if (project.measurement_books && project.measurement_books.length > 0) {
      return project.measurement_books;
    }
    return [{ id: 'mb_1', code: 'MB-01', title: 'Main Civil & Structure Works' }];
  }, [project.measurement_books]);

  // Dynamic Quantity calculation according to selected MB Filter Scope
  const getEffectiveBOQItemQty = (item: BOQItem): number => {
    if (!item.mb_rows || item.mb_rows.length === 0) {
      return typeof item.estimated_quantity === 'number' ? item.estimated_quantity : 0;
    }

    if (selectedMBFilter === 'all') {
      // Combined MB quantity across all MB books
      const sum = item.mb_rows.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
      return calcQuantityVal(sum, item.precision ?? 2, item.truncate_quantity ?? false);
    }

    // Filter by specific individual MB book ID
    const fallbackBookId = mbBooksList[0]?.id || 'mb_1';
    const filteredRows = item.mb_rows.filter((r) => {
      const rowBookId = r.mb_book_id || fallbackBookId;
      return rowBookId === selectedMBFilter;
    });

    if (filteredRows.length === 0) {
      return 0; // Item has MB detail rows, but none assigned to this specific MB book
    }

    const sum = filteredRows.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
    return calcQuantityVal(sum, item.precision ?? 2, item.truncate_quantity ?? false);
  };

  const getItemUnitRate = (item: BOQItem) => {
    if (rateMode === 'user') {
      return item.user_rate !== undefined ? item.user_rate : item.calculated_unit_rate;
    }
    return item.contractor_rate !== undefined ? item.contractor_rate : item.calculated_unit_rate;
  };

  const getItemAmount = (item: BOQItem) => {
    const qty = getEffectiveBOQItemQty(item);
    const rate = getItemUnitRate(item);
    return Math.round(qty * rate * 100) / 100;
  };

  // Calculations
  const directSubtotal = project.items.reduce((acc, item) => acc + getItemAmount(item), 0);
  const provItems = project.provisional_items || [];
  const provSumTotal = provItems.length > 0
    ? provItems.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.rate || 0)), 0)
    : (project.provisional_sum !== undefined ? Number(project.provisional_sum) : 150000);

  // 1. Tax (applied on Direct Civil Subtotal; 0% in User Rate Mode where Tax is inside rate analysis)
  const taxPercent = rateMode === 'user' ? 0 : (project.tax_percent ?? 0);
  const taxAmount = Math.round(directSubtotal * (taxPercent / 100) * 100) / 100;
  const subtotalWithTax = directSubtotal + taxAmount;

  // 2. Provisional Sum (P.S.) - Added AFTER Tax (Tax Exempt)
  const subtotalWithTaxAndPS = subtotalWithTax + provSumTotal;

  // User Estimate Logic for Contingency Calculation
  const userCfg = project.user_estimate_config || {};
  const autoContingency = userCfg.auto_contingency_enabled !== false; // default true
  const allocatedBudget = Number(project.allocated_budget_amount) || 0;

  // Base for auto contingency slab determination
  const baseForSlab = allocatedBudget > 0 ? allocatedBudget : subtotalWithTaxAndPS;

  let contPercent = 3.0;
  if (autoContingency) {
    if (baseForSlab <= 300000) {
      contPercent = 2.0;
    } else if (baseForSlab <= 2000000) {
      contPercent = 1.5;
    } else {
      contPercent = 1.0;
    }
  } else {
    contPercent = userCfg.manual_contingency_percent ?? (project.contingency_percent !== undefined ? Number(project.contingency_percent) : 3.0);
  }

  // 3. Contingency Calculation - Added AFTER P.S. (Before Grand Total)
  const calcBasis = userCfg.contingency_calc_basis || 'net_budget';
  let baseAmountForContingency = subtotalWithTaxAndPS;
  if (calcBasis === 'allocated_budget' || calcBasis === 'net_budget') {
    baseAmountForContingency = allocatedBudget > 0 ? allocatedBudget : subtotalWithTaxAndPS;
  } else if (calcBasis === 'grand_total') {
    baseAmountForContingency = subtotalWithTaxAndPS;
  }

  const contingencyAmount = Math.round(baseAmountForContingency * (contPercent / 100) * 100) / 100;

  // Net Allocated Budget = Allocated Budget - Contingency
  const netAllocatedBudget = Math.max(0, allocatedBudget - contingencyAmount);

  // 4. Grand Total Cost Estimate (includes P.S. & Contingency)
  const grandTotal = subtotalWithTaxAndPS + contingencyAmount;
  const taxableSubtotal = directSubtotal;

  // User Contribution Logic:
  // Minimum User Contribution % & Amount = Contribution % * Net Allocated Budget (or Subtotal if no allocated budget)
  const userContributionPercent = (project as any).user_contribution_percent !== undefined
    ? Number((project as any).user_contribution_percent)
    : 0;

  const minUserContributionAmount = allocatedBudget > 0
    ? Math.round(netAllocatedBudget * (userContributionPercent / 100) * 100) / 100
    : Math.round(directSubtotal * (userContributionPercent / 100) * 100) / 100;

  // Actual User Contribution = Grand Total - Allocated Budget (or min user contribution if no allocated budget)
  const autoCalculatedUserContrib = allocatedBudget > 0
    ? Math.max(0, Math.round((grandTotal - allocatedBudget) * 100) / 100)
    : minUserContributionAmount;

  const isUserContribManual = (project as any).user_contribution_amount_is_manual === true;

  const userContributionAmount = isUserContribManual && project.user_contribution_amount !== undefined && project.user_contribution_amount !== null
    ? Number(project.user_contribution_amount)
    : autoCalculatedUserContrib;

  // Office Net Share = Net Allocated Budget (or Grand Total - User Contribution)
  const officeNetShare = allocatedBudget > 0
    ? netAllocatedBudget
    : Math.max(0, grandTotal - userContributionAmount);

  const handleUpdateProvSum = (val: number) => {
    setProject((prev) => ({ ...prev, provisional_sum: val }));
  };

  const handleUpdateContingency = (val: number) => {
    setProject((prev) => ({ ...prev, contingency_percent: val }));
  };

  const handleUpdateAllocatedBudget = (val: number) => {
    setProject((prev: any) => ({
      ...prev,
      allocated_budget_amount: val,
      user_contribution_amount_is_manual: false
    }));
  };

  const handleUpdateUserContributionAmount = (amount: number) => {
    const calcPct = directSubtotal > 0 ? Math.round((amount / directSubtotal) * 10000) / 100 : 0;
    setProject((prev: any) => ({
      ...prev,
      user_contribution_amount: amount,
      user_contribution_percent: calcPct,
      user_contribution_amount_is_manual: true
    }));
  };

  const handleUpdateUserContributionPercent = (pct: number) => {
    const calcAmt = Math.round(directSubtotal * (pct / 100) * 100) / 100;
    setProject((prev: any) => ({
      ...prev,
      user_contribution_percent: pct,
      user_contribution_amount: calcAmt,
      user_contribution_amount_is_manual: false
    }));
  };

  const handleAddProvItem = () => {
    const newItem = {
      id: `ps_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      code: `PS-${provItems.length + 1}`,
      description: 'Insurance / Utility Shifting / Third-Party Testing',
      unit: 'P.S.',
      quantity: 1.0,
      rate: 50000,
      amount: 50000
    };
    setProject((prev) => ({
      ...prev,
      provisional_items: [...(prev.provisional_items || []), newItem]
    }));
    showToast('Added new Provisional Sum (P.S.) item.');
  };

  const handleUpdateProvItem = (id: string, field: string, val: any) => {
    setProject((prev) => ({
      ...prev,
      provisional_items: (prev.provisional_items || []).map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: val };
          const q = field === 'quantity' ? Number(val) || 0 : Number(updated.quantity) || 0;
          const r = field === 'rate' ? Number(val) || 0 : Number(updated.rate) || 0;
          updated.amount = Math.round(q * r * 100) / 100;
          return updated;
        }
        return item;
      })
    }));
  };

  const handleDeleteProvItem = (id: string) => {
    setProject((prev) => ({
      ...prev,
      provisional_items: (prev.provisional_items || []).filter((item) => item.id !== id)
    }));
    showToast('Removed P.S. item.');
  };

  const handleUpdateQuantity = (id: string, newQty: number) => {
    setProject((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === id) {
          const qty = Number(newQty) || 0;
          const rate = getItemUnitRate(item);
          return {
            ...item,
            estimated_quantity: qty,
            total_amount: Math.round(qty * rate * 100) / 100
          };
        }
        return item;
      })
    }));
  };

  const handleUpdateItemChapter = (id: string, newChapter: string) => {
    setProject((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, chapter: newChapter } : item
      )
    }));
  };

  const handleStartEditingCategory = (category: string) => {
    setEditingCategory(category);
    setEditingCategoryName(category);
  };

  const handleSaveCategoryHeading = (oldCategory: string) => {
    const trimmed = editingCategoryName.trim();
    if (!trimmed) {
      showToast('Category heading name cannot be empty.');
      return;
    }
    if (trimmed === oldCategory) {
      setEditingCategory(null);
      return;
    }
    setProject((prev) => ({
      ...prev,
      items: prev.items.map((it) =>
        (it.chapter || 'General Works') === oldCategory ? { ...it, chapter: trimmed } : it
      )
    }));
    setEditingCategory(null);
    showToast(`Updated category heading to "${trimmed}".`);
  };

  const handleAddCategoryHeading = () => {
    const catName = newCategoryInput.trim();
    if (!catName) return;
    setIsAddingCategoryModalOpen(false);
    setNewCategoryInput('');
    showToast(`Created category heading "${catName}". You can assign work items to it.`);
  };

  const handleUpdateHeaderConfigField = (field: string, value: string) => {
    setProject((prev) => ({
      ...prev,
      header_config: {
        ...(prev.header_config || {}),
        [field]: value
      }
    }));
  };

  const handleUpdateColumnLabel = (key: string, value: string) => {
    setProject((prev) => ({
      ...prev,
      header_config: {
        ...(prev.header_config || {}),
        column_labels: {
          ...(prev.header_config?.column_labels || {}),
          [key]: value
        }
      }
    }));
  };

  const groupedBOQItems = useMemo(() => {
    const groups: { category: string; items: BOQItem[]; subtotal: number }[] = [];
    const map: Record<string, BOQItem[]> = {};

    project.items.forEach((item) => {
      const cat = (item.chapter && item.chapter.trim()) ? item.chapter.trim() : 'General Works';
      if (!map[cat]) {
        map[cat] = [];
      }
      map[cat].push(item);
    });

    Object.keys(map).forEach((cat) => {
      const groupItems = map[cat];
      const subtotal = groupItems.reduce((acc, item) => acc + getItemAmount(item), 0);
      groups.push({ category: cat, items: groupItems, subtotal });
    });

    return groups;
  }, [project.items, rateMode, selectedZone]);

  const handleDeleteItem = (id: string) => {
    if (confirm('Remove item from BOQ estimate?')) {
      setProject((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item.id !== id)
      }));
      showToast('Item removed from BOQ.');
    }
  };

  const handleDuplicateItem = (id: string) => {
    const itemToDup = project.items.find((i) => i.id === id);
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
      const idx = prev.items.findIndex((i) => i.id === id);
      const updated = [...prev.items];
      updated.splice(idx + 1, 0, newItem);
      return { ...prev, items: updated };
    });
    showToast('Duplicated BOQ item.');
  };

  const handleMoveItem = (id: string, direction: 'up' | 'down') => {
    setProject((prev) => {
      const idx = prev.items.findIndex((i) => i.id === id);
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

  const handleClearBOQ = () => {
    if (confirm('Clear all BOQ items?')) {
      setProject((prev) => ({ ...prev, items: [] }));
      showToast('BOQ estimate cleared.');
    }
  };

  // Add work item from Norms library directly into BOQ
  const handleConfirmAddItem = () => {
    const idsToAdd = selectedNormIds.length > 0 ? selectedNormIds : [selectedNormId];
    const itemsToAdd = norms.filter((n) => idsToAdd.includes(n.item_id));
    if (itemsToAdd.length === 0) {
      showToast('Please select at least one norm item.');
      return;
    }

    setProject((prev) => {
      const updatedItems = [...prev.items];
      itemsToAdd.forEach((norm) => {
        const rateResult = calculateItemRate({
          norm,
          resources,
          zone: selectedZone,
          fiscalYear: selectedFY
        });
        const userRate = rateResult.user_unit_rate || rateResult.total_unit_rate;
        const contractorRate = rateResult.contractor_unit_rate || rateResult.total_unit_rate;
        const activeRate = prev.rate_mode === 'contractor' ? contractorRate : userRate;

        const newItem: BOQItem = {
          id: `boq_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          item_id: norm.item_id,
          item_code: norm.code || '1.1',
          description: norm.description,
          unit: norm.base_unit,
          estimated_quantity: 1,
          calculated_unit_rate: activeRate,
          user_rate: userRate,
          contractor_rate: contractorRate,
          total_amount: activeRate,
          chapter: 'General Works',
          mb_rows: [
            {
              id: `mb_row_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              particulars: 'Initial Dimension',
              no_of_units: 1,
              length: 1,
              breadth: 1,
              height: 1,
              quantity: 1
            }
          ]
        };
        updatedItems.push(newItem);
      });
      return { ...prev, items: updatedItems };
    });

    setIsAddItemModalOpen(false);
    showToast(`Added ${itemsToAdd.length} work item(s) to BOQ estimate.`);
  };

  // Export to CSV / Excel
  const handleExportCSV = () => {
    if (project.items.length === 0) {
      alert('BOQ is empty.');
      return;
    }

    let csv = `Bill of Quantities Estimate Abstract (${rateMode === 'user' ? 'User/Office Mode' : 'Contractor/Tender Mode'})\n`;
    csv += `Project: ${project.title}, Zone: ${selectedZone.name_en}, Fiscal Year: ${selectedFY}\n\n`;
    csv += `Item No.,Item Code,Description,Unit,Quantity,Unit Rate (${currencyCode()}),Total Amount (${currencyCode()})\n`;
    
    project.items.forEach((item, idx) => {
      const rate = getItemUnitRate(item);
      const amount = getItemAmount(item);
      const qty = getEffectiveBOQItemQty(item);
      csv += `"${idx + 1}","${item.item_code}","${item.description.replace(/"/g, '""')}","${item.unit}",${qty},${rate},${amount}\n`;
    });

    csv += `\n,,,Subtotal Civil Works Cost,,,"${directSubtotal.toFixed(2)}"\n`;
    if (rateMode === 'user') {
      csv += `,,,Contractor Overhead (0% - User Mode),,,"0.00"\n`;
      csv += `,,,Tax (0% - Material Tax included in Rate Analysis),,,"0.00"\n`;
    } else {
      csv += `,,,Tax (${taxPercent}% on Civil Works),,,"${taxAmount.toFixed(2)}"\n`;
    }
    csv += `,,,Subtotal (Incl. Tax),,,"${subtotalWithTax.toFixed(2)}"\n`;
    csv += `,,,Provisional Sum (P.S. - Tax Exempt),,,"${provSumTotal.toFixed(2)}"\n`;
    csv += `,,,Subtotal (Incl. Tax & P.S.),,,"${subtotalWithTaxAndPS.toFixed(2)}"\n`;
    csv += `,,,Contingency (${contPercent}%),,,"${contingencyAmount.toFixed(2)}"\n`;
    csv += `,,,GRAND TOTAL ESTIMATE (Incl. P.S.),,,"${grandTotal.toFixed(2)}"\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BOQ_${rateMode.toUpperCase()}_Estimate_${selectedZone.name_en}_${selectedFY}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Cost Estimate Abstract to formatted Excel (.xlsx) with borders
  const handleExportExcel = () => {
    if (project.items.length === 0) {
      alert('BOQ is empty.');
      return;
    }
    exportEstimateToExcel(project, selectedZone, selectedFY, rateMode);
    showToast('Exported formatted Estimate Abstract to Excel (.xlsx) ready to print!');
  };

  // Export Complete Multi-Sheet Master Project Workbook (.xlsx)
  const handleExportMasterWorkbook = () => {
    if (project.items.length === 0) {
      alert('BOQ is empty. Please add items before exporting master workbook.');
      return;
    }
    exportMasterWorkbookExcel({
      project,
      norms,
      resources,
      selectedZone,
      selectedFY,
      calcMode: rateMode,
      overheadPercent: 15,
      taxPercent
    });
    showToast('Exported Complete Master Project Estimation Workbook (.xlsx)!');
  };

  const handlePrint = () => {
    if (project.items.length === 0) {
      alert('BOQ is empty.');
      return;
    }

    const customHeaderHtml = `
      <div style="text-align: center; font-family: 'Kalimati', 'Nirmala UI', sans-serif; margin-bottom: 16px;">
        <div style="font-size: 16pt; font-weight: bold; color: #000;">${project.header_config?.authority_name || 'Sample City Authority'}</div>
        <div style="font-size: 13pt; font-weight: bold; color: #000;">${project.header_config?.office_name || 'Local Authority Office'}</div>
        <div style="font-size: 11pt; font-weight: bold; color: #000;">${project.header_config?.office_address || 'Sample City, Sample Province'}</div>
        <br/>
        <div style="font-size: 14pt; font-weight: bold; text-decoration: underline; color: #000;">${project.header_config?.document_title_estimate || 'Construction cost estimate'} (${rateMode === 'user' ? 'User Mode' : 'Contractor Mode'})</div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; gap: 20px;">
        <table style="width: 58%; font-size: 9.5pt; border: none !important; line-height: 1.6;">
          <tr style="border: none !important;">
            <td style="border: none !important;"><b>Project name:</b> ${project.title}</td>
          </tr>
          <tr style="border: none !important;">
            <td style="border: none !important;"><b>Implementation Location:</b> ${project.implementation_location || project.header_config?.implementation_location || project.local_authority || '—'}</td>
          </tr>
          <tr style="border: none !important;">
            <td style="border: none !important;"><b>Budget head no.:</b> ${project.budget_head_no || project.header_config?.budget_head_no || '—'}</td>
          </tr>
          <tr style="border: none !important;">
            <td style="border: none !important;"><b>Fiscal Year:</b> ${project.fiscal_year || selectedFY} | <b>Office/Client:</b> ${project.client_name}</td>
          </tr>
        </table>

        <table border="1" cellpadding="4" cellspacing="0" style="width: 40%; font-size: 9pt; border-collapse: collapse; background-color: #f8fafc;">
          <tr style="background-color: #e2e8f0; font-weight: bold;">
            <td colSpan="2" style="text-align: center; border: 1px solid #000;">Budget and cost estimate details</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000;">Approved budget amount:</td>
            <td style="text-align: right; font-weight: bold; border: 1px solid #000;">${allocatedBudget > 0 ? (currencyCode() + ' ') + allocatedBudget.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000;">Public participation (user):</td>
            <td style="text-align: right; font-weight: bold; border: 1px solid #000;">${currencyCode()} ${userContributionAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr style="background-color: #f1f5f9;">
            <td style="border: 1px solid #000;">Office grant (net):</td>
            <td style="text-align: right; font-weight: bold; border: 1px solid #000;">${currencyCode()} ${officeNetShare.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr style="background-color: #e2e8f0; font-weight: bold;">
            <td style="border: 1px solid #000;">Total cost estimate:</td>
            <td style="text-align: right; color: #1e3a8a; border: 1px solid #000;">${currencyCode()} ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          </tr>
        </table>
      </div>
    `;

    let tableHtml = `<table border="1" cellpadding="6" cellspacing="0" class="print-table" style="width:100%; border-collapse: collapse; font-size: 10pt;">
      <thead>
        <tr style="background-color: #f1f5f9; text-align: center;">
          <th class="col-sn" style="border: 1px solid #000;">S.No.</th>
          <th class="col-desc" style="border: 1px solid #000;">Description of work/service (item)</th>
          <th class="col-unit" style="border: 1px solid #000;">Unit</th>
          <th class="col-qty" style="border: 1px solid #000;">Quantity</th>
          <th class="col-rate" style="border: 1px solid #000;">Rate (${currencyCode()})</th>
          <th class="col-amount" style="border: 1px solid #000;">Total cost (${currencyCode()})</th>
        </tr>
      </thead>
      <tbody>`;

    project.items.forEach((item, idx) => {
      const unitRate = getItemUnitRate(item);
      const totalAmt = getItemAmount(item);
      const qty = getEffectiveBOQItemQty(item);
      tableHtml += `<tr>
        <td class="col-sn" style="text-align: center; border: 1px solid #000;">${idx + 1}</td>
        <td class="col-desc" style="border: 1px solid #000;"><b>[Item ${item.item_code}]</b> ${item.description}</td>
        <td class="col-unit" style="text-align: center; border: 1px solid #000;">${item.unit}</td>
        <td class="col-qty" style="text-align: right; border: 1px solid #000;">${qty.toFixed(2)}</td>
        <td class="col-rate" style="text-align: right; border: 1px solid #000;">${unitRate.toFixed(2)}</td>
        <td class="col-amount" style="text-align: right; border: 1px solid #000;"><b>${totalAmt.toFixed(2)}</b></td>
      </tr>`;
    });

    // Summary Rows
    tableHtml += `
      <tr style="background-color: #f8fafc; font-weight: bold;">
        <td colSpan="5" style="text-align: right; border: 1px solid #000;">Subtotal Civil Works:</td>
        <td style="text-align: right; border: 1px solid #000;">${currencyCode()} ${directSubtotal.toFixed(2)}</td>
      </tr>
      <tr style="background-color: #f8fafc; font-weight: bold;">
        <td colSpan="5" style="text-align: right; border: 1px solid #000;">Tax ${taxPercent}%):</td>
        <td style="text-align: right; border: 1px solid #000;">${currencyCode()} ${taxAmount.toFixed(2)}</td>
      </tr>
      <tr style="background-color: #fffbeb; font-weight: bold; color: #78350f;">
        <td colSpan="5" style="text-align: right; border: 1px solid #000;">Provisional Sum P.S. - Tax Exempt:</td>
        <td style="text-align: right; border: 1px solid #000;">${currencyCode()} ${provSumTotal.toFixed(2)}</td>
      </tr>
      <tr style="background-color: #f8fafc; font-weight: bold;">
        <td colSpan="5" style="text-align: right; border: 1px solid #000;">Contingency amount (${contPercent}% Contingency):</td>
        <td style="text-align: right; border: 1px solid #000;">${currencyCode()} ${contingencyAmount.toFixed(2)}</td>
      </tr>
      <tr style="background-color: #e2e8f0; font-weight: bold; font-size: 11pt;">
        <td colSpan="5" style="text-align: right; border: 1px solid #000;">Grand Total Estimate Incl. P.S.:</td>
        <td style="text-align: right; color: #1e3a8a; border: 1px solid #000;">${currencyCode()} ${grandTotal.toFixed(2)}</td>
      </tr>
    `;

    const sigsHtml = signatures.map(sig => `
      <div style="text-align: center; min-width: 140px; margin: 10px;">
        <div style="border-bottom: 1.5px solid #000; width: 130px; margin: 0 auto 5px auto; height: 30px;"></div>
        <b>${sig.title}</b><br/>
        <span style="font-size: 8pt; color: #444;">${sig.designation}</span>
      </div>
    `).join('');

    tableHtml += `</tbody></table>
    <div style="margin-top: 40px; display: flex; justify-content: space-around; font-size: 9.5pt; flex-wrap: wrap; page-break-inside: avoid;">
      ${sigsHtml}
    </div>`;

    downloadPrintableHTML({
      title: 'Cost Estimate Abstract',
      projectTitle: project.title,
      zone: selectedZone.name_en,
      fiscalYear: selectedFY,
      customHeaderHtml,
      tableHtml,
      filename: `Cost_Estimate_${project.title.replace(/\s+/g, '_')}`,
      orientation: printOrientation
    });
    showToast('Printable Estimate Abstract generated successfully!');
  };

  // Listen for Excel Ribbon Subsidiary Tool commands
  useEffect(() => {
    const handleAddItemEvent = () => setIsAddItemModalOpen(true);
    const handleAddCategoryEvent = () => setIsAddingCategoryModalOpen(true);
    const handleImportExcelEvent = () => setIsImportExcelModalOpen(true);
    const handleEditHeadingsEvent = () => setIsEditHeadingsModalOpen(true);
    const handleToggleSignaturesEvent = () => setShowSignaturesSection((prev) => !prev);
    const handleSetRateModeEvent = (e: any) => {
      const mode = typeof e.detail === 'object' && e.detail?.mode ? e.detail.mode : e.detail;
      if (mode === 'user' || mode === 'contractor') {
        setRateMode(mode);
        setProject((prev) => ({ ...prev, rate_mode: mode }));
        showToast(mode === 'contractor'
          ? 'Switched to Contractor Tender Mode (tax & 15% Overhead)'
          : 'Switched to Office Estimate Mode (0% Tax on Civil Works)');
      }
    };
    const handleExportExcelEvent = () => handleExportExcel();
    const handlePrintEvent = () => handlePrint();
    const handleSetOrientationEvent = (e: any) => {
      const orient = typeof e.detail === 'object' && e.detail?.orientation ? e.detail.orientation : e.detail;
      if (orient === 'portrait' || orient === 'landscape') {
        setPrintOrientation(orient);
        showToast(`Print orientation set to ${orient.charAt(0).toUpperCase() + orient.slice(1)}`);
      }
    };

    window.addEventListener('uev:boq-add-item', handleAddItemEvent);
    window.addEventListener('uev:boq-add-category', handleAddCategoryEvent);
    window.addEventListener('uev:boq-import-excel', handleImportExcelEvent);
    window.addEventListener('uev:boq-edit-headings', handleEditHeadingsEvent);
    window.addEventListener('uev:boq-toggle-signatures', handleToggleSignaturesEvent);
    window.addEventListener('uev:boq-set-mode', handleSetRateModeEvent);
    window.addEventListener('uev:boq-export-excel', handleExportExcelEvent);
    window.addEventListener('uev:boq-print', handlePrintEvent);
    window.addEventListener('uev:boq-set-orientation', handleSetOrientationEvent);

    return () => {
      window.removeEventListener('uev:boq-add-item', handleAddItemEvent);
      window.removeEventListener('uev:boq-add-category', handleAddCategoryEvent);
      window.removeEventListener('uev:boq-import-excel', handleImportExcelEvent);
      window.removeEventListener('uev:boq-edit-headings', handleEditHeadingsEvent);
      window.removeEventListener('uev:boq-toggle-signatures', handleToggleSignaturesEvent);
      window.removeEventListener('uev:boq-set-mode', handleSetRateModeEvent);
      window.removeEventListener('uev:boq-export-excel', handleExportExcelEvent);
      window.removeEventListener('uev:boq-print', handlePrintEvent);
      window.removeEventListener('uev:boq-set-orientation', handleSetOrientationEvent);
    };
  }, [handleExportExcel, handlePrint]);

  return (
    <div className="flex flex-col bg-slate-100 text-slate-800 font-sans text-xs select-none rounded-xl overflow-hidden shadow-lg border border-slate-300 w-full min-h-[85vh]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-12 right-5 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2 border border-slate-700 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}



      {/* Empty State or BOQ Table */}
      {project.items.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-4 m-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto text-blue-600">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Your BOQ Estimate is Currently Empty</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Start by entering dimensions in the Measurement Book (MB), import an existing BOQ Abstract Excel spreadsheet, or add items from Rate Analysis.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                if (onNavigateToTab) onNavigateToTab('mb');
                window.dispatchEvent(new CustomEvent('uev:navigate-tab', { detail: 'mb' }));
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
            >
              <Ruler className="w-4 h-4 text-amber-300" />
              <span>Open Measurement Book (MB)</span>
            </button>
            <button
              onClick={() => setIsImportExcelModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-300" />
              <span>Import BOQ Excel & Map Norms</span>
            </button>
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('rate-analysis')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
              >
                Go to Rate Analysis Engine
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-3">
          {/* Bloat-Free Compact Estimation Header Bar */}
          <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-xs print:hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Left: Project Identity & Mode */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      value={project.title}
                      onChange={(e) => setProject((prev) => ({ ...prev, title: e.target.value }))}
                      className="font-extrabold text-slate-900 text-sm bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-600 rounded px-1.5 py-0.5 transition max-w-sm"
                      title="Click to rename project title inline"
                    />
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      {selectedZone.name_en} • FY {project.fiscal_year || selectedFY}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>{project.header_config?.office_name || 'Local Authority Office'}</span>
                    <span>•</span>
                    <span className="font-semibold text-slate-700">{project.items.length} Work Items</span>
                    <span>•</span>
                    <button
                      onClick={() => setRateMode(rateMode === 'user' ? 'contractor' : 'user')}
                      className={`font-bold px-1.5 py-0.2 rounded text-[10px] cursor-pointer transition ${
                        rateMode === 'user'
                          ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                          : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                      }`}
                      title="Click to switch Rate Mode"
                    >
                      {rateMode === 'user' ? 'Office Mode (0% Tax)' : 'Contractor Mode (Tax incl.)'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Quick Add Item, KPI Totals, and Details Toggle */}
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  onClick={() => setIsAddItemModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Add work item directly from Norms Library"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Work Item</span>
                </button>

                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1 px-3">
                  <div className="text-right">
                    <div className="text-[9px] text-slate-500 font-semibold uppercase">Civil Subtotal</div>
                    <div className="text-xs font-bold text-slate-800 font-mono">
                      {currencyCode()} {directSubtotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="h-6 w-px bg-slate-300" />
                  <div className="text-right">
                    <div className="text-[9px] text-slate-500 font-semibold uppercase">Grand Total</div>
                    <div className="text-xs font-black text-emerald-800 font-mono">
                      {currencyCode()} {grandTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowProjectDetails(!showProjectDetails)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    showProjectDetails
                      ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                      : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                  }`}
                  title="Show or hide official government headings & budget allocation breakdown"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>{showProjectDetails ? 'Hide Details' : 'Budget & Info'}</span>
                  {showProjectDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Official Project Information & Top Right Budget Summary Box */}
          <div className={`${showProjectDetails ? 'block' : 'hidden print:block'} bg-white border border-slate-300 rounded-2xl p-5 shadow-sm animate-fadeIn`}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Left Column: Official Project Details */}
              <div className="md:col-span-7 space-y-2.5 text-xs text-slate-800">
                <div className="border-b pb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="font-extrabold text-sm text-slate-900">
                      {project.header_config?.office_name || 'Local Authority Office'}
                    </span>
                    <button
                      onClick={() => setIsEditHeadingsModalOpen(true)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded transition print:hidden"
                      title="Edit Office Name"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                    <span>{project.header_config?.authority_name || selectedZone.name_en}</span>
                    <button
                      onClick={() => setIsEditHeadingsModalOpen(true)}
                      className="p-0.5 text-blue-500 hover:text-blue-700 transition print:hidden"
                      title="Edit Local Authority Name"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </span>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Project Title:</span>
                    <button
                      onClick={() => setIsEditHeadingsModalOpen(true)}
                      className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 print:hidden"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit Heading</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={project.title}
                    onChange={(e) => setProject((prev) => ({ ...prev, title: e.target.value }))}
                    className="font-extrabold text-slate-900 text-sm mt-0.5 w-full bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded px-1.5 py-0.5 transition"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500 font-medium block">Location:</span>
                    <input
                      type="text"
                      value={project.implementation_location || project.header_config?.implementation_location || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProject((prev) => ({
                          ...prev,
                          implementation_location: val,
                          header_config: { ...(prev.header_config || {}), implementation_location: val }
                        }));
                      }}
                      placeholder="e.g. Sample City Ward. 4"
                      className="text-slate-900 font-bold w-full bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded px-1.5 py-0.5 text-xs transition"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">. (Budget Head No.):</span>
                    <input
                      type="text"
                      value={project.budget_head_no || project.header_config?.budget_head_no || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProject((prev) => ({
                          ...prev,
                          budget_head_no: val,
                          header_config: { ...(prev.header_config || {}), budget_head_no: val }
                        }));
                      }}
                      placeholder="e.g. 3370114"
                      className="font-mono text-slate-900 font-bold w-full bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded px-1.5 py-0.5 text-xs transition"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-slate-600 pt-1 border-t">
                  <div className="flex items-center gap-1">
                    <span>Client/Office:</span>
                    <input
                      type="text"
                      value={project.client_name}
                      onChange={(e) => setProject((prev) => ({ ...prev, client_name: e.target.value }))}
                      className="font-bold text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded px-1 py-0.2 transition"
                    />
                  </div>
                  <span>•</span>
                  <span>FY.: <strong className="font-mono">{project.fiscal_year || selectedFY}</strong></span>
                </div>
              </div>

              {/* Right Column: Top Right Corner Summary Table (Budget & User Contribution) */}
              <div className="md:col-span-5 bg-slate-50 rounded-xl p-3 border border-slate-300 text-xs">
                {rateMode === 'contractor' ? (
                  /* Contractor Mode: ONLY keep Allocated Budget and Total Tender Estimate */
                  <div>
                    <div className="text-[11px] font-black uppercase text-slate-700 tracking-wider mb-2 flex items-center justify-between border-b border-slate-200 pb-1">
                      <span>Allocated Budget</span>
                      <span className="text-[10px] bg-slate-700 text-white font-mono px-1.5 py-0.2 rounded font-bold">
                        Contractor Mode
                      </span>
                    </div>

                    <table className="w-full text-left font-mono text-[11px]">
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="py-1.5 text-slate-700 font-sans font-medium">Allocated Budget:</td>
                          <td className="py-1.5 text-right font-bold text-slate-900">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-[10px] text-slate-500 font-sans">{currencyCode()}</span>
                              <input
                                type="number"
                                value={project.allocated_budget_amount || ''}
                                onChange={(e) => handleUpdateAllocatedBudget(Number(e.target.value))}
                                placeholder="0.00"
                                className="w-28 text-right font-mono font-bold text-xs p-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 bg-white"
                              />
                            </div>
                          </td>
                        </tr>
                        <tr className="bg-blue-100/70 font-extrabold text-blue-900 text-xs">
                          <td className="py-1.5 text-blue-900 font-sans px-1">Total Tender Estimate:</td>
                          <td className="py-1.5 text-right text-blue-900 px-1 font-mono font-black">
                            {currencyCode()} {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* User Mode: with Subtotal, Contingency %, User Contribution % & Amount */
                  <div>
                    <div className="text-[11px] font-black uppercase text-slate-700 tracking-wider mb-2 flex items-center justify-between border-b border-slate-200 pb-1">
                      <span>Budget and public participation details</span>
                      <span className="text-[10px] bg-blue-600 text-white font-mono px-1.5 py-0.2 rounded font-bold">
                        User Mode
                      </span>
                    </div>

                    <table className="w-full text-left font-mono text-[11px]">
                      <tbody>
                        <tr className="border-b border-slate-200 bg-blue-50/50">
                          <td className="py-1 text-blue-900 font-sans font-bold">Allocated Budget:</td>
                          <td className="py-1 text-right font-bold text-slate-900">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-[10px] text-slate-500 font-sans">{currencyCode()}</span>
                              <input
                                type="number"
                                value={project.allocated_budget_amount || ''}
                                onChange={(e) => handleUpdateAllocatedBudget(Number(e.target.value))}
                                placeholder="0.00"
                                className="w-28 text-right font-mono font-bold text-xs p-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 bg-white"
                              />
                            </div>
                          </td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="py-1 text-slate-700 font-sans font-medium">
                            <div className="flex items-center gap-1.5">
                              <span>Contingency</span>
                              <span className="font-mono font-extrabold text-blue-900 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded text-xs" title="Calculated from User Estimate Rules">
                                {contPercent}%
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                ({autoContingency ? 'Auto Rule' : 'User Setting'})
                              </span>
                              <span>{allocatedBudget > 0 ? 'of Budget' : 'of Subtotal'}):</span>
                            </div>
                          </td>
                          <td className="py-1 text-right font-bold text-slate-900">
                            {currencyCode()} {contingencyAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {allocatedBudget > 0 && (
                          <tr className="border-b border-slate-200 bg-slate-100/80">
                            <td className="py-1 text-slate-800 font-sans font-bold">Net Alloc. Budget:</td>
                            <td className="py-1 text-right font-bold text-slate-900 font-mono">
                              {currencyCode()} {netAllocatedBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )}

                        <tr className="border-b border-slate-200 bg-amber-50/50">
                          <td className="py-1 text-amber-900 font-sans font-medium">
                            <div className="flex items-center gap-1">
                              <span>Min Contrib.</span>
                              <input
                                type="number"
                                value={userContributionPercent || ''}
                                onChange={(e) => handleUpdateUserContributionPercent(parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-12 p-0.5 border border-amber-300 rounded text-center font-mono font-bold text-xs text-amber-900 bg-white"
                                step="0.1"
                              />
                              <span>%):</span>
                            </div>
                          </td>
                          <td className="py-1 text-right font-bold text-amber-900 font-mono">
                            {currencyCode()} {minUserContributionAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        <tr className="border-b border-slate-200 bg-amber-100/60 font-bold">
                          <td className="py-1 text-amber-950 font-sans">
Actual User Contrib.:
                          </td>
                          <td className="py-1 text-right font-bold text-amber-900">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-[10px] text-amber-700 font-sans">{currencyCode()}</span>
                              <input
                                type="number"
                                value={userContributionAmount || ''}
                                onChange={(e) => handleUpdateUserContributionAmount(Number(e.target.value))}
                                placeholder="0.00"
                                className="w-28 text-right font-mono font-bold text-xs p-1 border border-amber-300 rounded focus:ring-1 focus:ring-amber-600 bg-white"
                              />
                            </div>
                          </td>
                        </tr>

                        <tr className="border-b border-slate-200 bg-emerald-50/50">
                          <td className="py-1 text-emerald-800 font-sans font-bold">Office Net Share:</td>
                          <td className="py-1 text-right font-bold text-emerald-900 font-mono">
                            {currencyCode()} {officeNetShare.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr className="bg-blue-100/70 font-extrabold text-blue-900 text-xs">
                          <td className="py-1.5 text-blue-900 font-sans px-1">Total Estimate:</td>
                          <td className="py-1.5 text-right text-blue-900 px-1 font-mono font-black">
                            {currencyCode()} {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-slate-300 excel-grid-lines">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-300">
                  {/* Excel Column Letters Header */}
                  <tr className="bg-slate-200 text-slate-600 font-mono text-[10px] text-center font-bold select-none print:hidden">
                    <th className="w-8 border border-slate-300 bg-slate-300/80 py-0.5">#</th>
                    <th className="border border-slate-300 py-0.5 w-12">A</th>
                    <th className="border border-slate-300 py-0.5 w-28">B</th>
                    <th className="border border-slate-300 py-0.5">C</th>
                    <th className="border border-slate-300 py-0.5 w-20 text-center">D</th>
                    <th className="border border-slate-300 py-0.5 w-28 text-right">E</th>
                    <th className="border border-slate-300 py-0.5 w-32 text-right">F</th>
                    <th className="border border-slate-300 py-0.5 w-36 text-right">G</th>
                    <th className="border border-slate-300 py-0.5 w-24 print:hidden text-center">H</th>
                  </tr>
                  <tr className="bg-slate-50 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b border-slate-300">
                    <th className="w-8 text-center border border-slate-300 bg-slate-100 font-mono text-slate-500 font-normal print:hidden">
                      Row
                    </th>
                    <th className="p-2.5 w-12 text-center border border-slate-300">
                      {project.header_config?.column_labels?.particulars ? 'S.N.' : (project.header_config?.column_labels?.particulars || 'S.N.')}
                    </th>
                    <th className="p-2.5 border border-slate-300">Item Code</th>
                    <th className="p-2.5 border border-slate-300">
                      {project.header_config?.column_labels?.particulars || 'Item Description'}
                    </th>
                    <th className="p-2.5 border border-slate-300 text-center">
                      {project.header_config?.column_labels?.unit || 'Unit'}
                    </th>
                    <th className="p-2.5 text-right border border-slate-300">
                      {project.header_config?.column_labels?.quantity || 'Quantity'}
                    </th>
                    <th className="p-2.5 text-right border border-slate-300">
                      {project.header_config?.column_labels?.rate || `Unit Rate (${currencyCode()})`}
                    </th>
                    <th className="p-2.5 text-right border border-slate-300">
                      {project.header_config?.column_labels?.amount || `Total Amount (${currencyCode()})`}
                    </th>
                    <th className="p-2.5 text-center border border-slate-300 print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {groupedBOQItems.map((group, groupIdx) => {
                    const isEditing = editingCategory === group.category;

                    return (
                      <React.Fragment key={group.category}>
                        {/* Category Heading Banner */}
                        <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                          <td colSpan={9} className="p-2.5 bg-slate-200/80 text-blue-950 font-black text-xs uppercase tracking-wide border border-slate-300">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                {isEditing ? (
                                  <div className="flex items-center gap-2 w-full max-w-lg print:hidden">
                                    <span className="text-blue-900 font-bold">📁 Section {groupIdx + 1}:</span>
                                    <input
                                      type="text"
                                      value={editingCategoryName}
                                      onChange={(e) => setEditingCategoryName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveCategoryHeading(group.category);
                                        if (e.key === 'Escape') setEditingCategory(null);
                                      }}
                                      className="p-1.5 border border-indigo-500 rounded-lg text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 flex-1"
                                      placeholder="Category Section Heading Name..."
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleSaveCategoryHeading(group.category)}
                                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs transition"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingCategory(null)}
                                      className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span>📁 Section {groupIdx + 1}: {group.category}</span>
                                    <button
                                      onClick={() => handleStartEditingCategory(group.category)}
                                      className="px-2 py-0.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-[10px] font-bold rounded border border-indigo-300 transition flex items-center gap-1 print:hidden cursor-pointer"
                                      title={`Rename category heading "${group.category}"`}
                                    >
                                      <Edit2 className="w-3 h-3 text-indigo-600" />
                                      <span>Edit Heading</span>
                                    </button>
                                    {group.category !== 'General Works' && (
                                      <button
                                        onClick={() => {
                                          if (confirm(`Remove category heading "${group.category}"? Items will be reassigned to "General Works".`)) {
                                            setProject((prev) => ({
                                              ...prev,
                                              items: prev.items.map((it) =>
                                                (it.chapter || 'General Works') === group.category ? { ...it, chapter: 'General Works' } : it
                                              )
                                            }));
                                            showToast(`Category heading "${group.category}" removed.`);
                                          }
                                        }}
                                        className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-[10px] font-bold rounded border border-rose-300 transition flex items-center gap-1 print:hidden cursor-pointer"
                                        title={`Remove category heading "${group.category}"`}
                                      >
                                        <Trash2 className="w-3 h-3 text-rose-600" />
                                        <span>Remove Heading</span>
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                              <span className="text-[11px] font-mono font-bold text-slate-700">
                                ({group.items.length} items) • Subtotal: {currencyCode()} {group.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Items under Category */}
                        {group.items.map((item, idx) => {
                          const unitRate = getItemUnitRate(item);
                          const totalAmt = getItemAmount(item);
                          const excelRow = idx + 4 + (groupIdx * 12);
                          const isSelected = activeCell.ref.endsWith(String(excelRow));
                          return (
                            <tr 
                              key={item.id} 
                              className={`transition cursor-cell ${isSelected ? 'bg-blue-50/80 font-medium' : 'hover:bg-slate-50'}`}
                            >
                              {/* Excel Row Index */}
                              <td 
                                onClick={() => setActiveCell({ ref: `A${excelRow}:H${excelRow}`, value: item.description, formula: `=ROW(${excelRow})` })}
                                className="w-8 text-center border border-slate-300 bg-slate-100/70 font-mono text-[10px] text-slate-500 select-none print:hidden"
                              >
                                {excelRow}
                              </td>

                              {/* Col A: S.N. */}
                              <td 
                                onClick={() => setActiveCell({ ref: `A${excelRow}`, value: String(idx + 1), formula: `=${idx + 1}` })}
                                className="p-2.5 text-center font-mono text-slate-600 border border-slate-300"
                              >
                                {idx + 1}
                              </td>

                              {/* Col B: Item Code */}
                              <td 
                                onClick={() => setActiveCell({ ref: `B${excelRow}`, value: item.item_code, formula: `="${item.item_code}"` })}
                                className="p-2.5 font-mono font-bold text-blue-700 border border-slate-300"
                              >
                                {item.item_code}
                              </td>

                              {/* Col C: Description */}
                              <td 
                                onClick={() => setActiveCell({ ref: `C${excelRow}`, value: item.description, formula: `="${item.description.replace(/"/g, '""')}"` })}
                                className="p-2.5 border border-slate-300"
                              >
                                <div className="font-bold text-slate-900">{item.description}</div>
                                {(() => {
                                  if (!item.mb_rows || item.mb_rows.length === 0) return null;
                                  
                                  const map = new Map<string, number>();
                                  item.mb_rows.forEach((r) => {
                                    const bookId = r.mb_book_id || mbBooksList[0]?.id || 'mb_1';
                                    map.set(bookId, (map.get(bookId) || 0) + (Number(r.quantity) || 0));
                                  });

                                  const entries = Array.from(map.entries());
                                  if (entries.length === 0) return null;

                                  const prec = item.precision ?? 2;

                                  if (selectedMBFilter === 'all') {
                                    return (
                                      <div className="mt-1 flex flex-wrap items-center gap-1.5 print:hidden">
                                        <span className="text-[10px] font-extrabold uppercase bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded border border-purple-200">
                                          Combined MB:
                                        </span>
                                        {entries.map(([bId, qty]) => {
                                          const bDef = mbBooksList.find((b) => b.id === bId);
                                          return (
                                            <span
                                              key={bId}
                                              className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                                              title={bDef?.title || ''}
                                            >
                                              <span className="font-bold text-blue-800">{bDef?.code || 'MB'}:</span> {qty.toFixed(prec)} {item.unit}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    );
                                  } else {
                                    const selectedQty = map.get(selectedMBFilter) || 0;
                                    const bDef = mbBooksList.find((b) => b.id === selectedMBFilter);
                                    return (
                                      <div className="mt-1 flex items-center gap-1.5 print:hidden">
                                        <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded border border-emerald-300">
                                          Individual MB ({bDef?.code || 'Selected'}):
                                        </span>
                                        <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                          {selectedQty.toFixed(prec)} {item.unit}
                                        </span>
                                      </div>
                                    );
                                  }
                                })()}
                              </td>

                              {/* Col D: Unit */}
                              <td 
                                onClick={() => setActiveCell({ ref: `D${excelRow}`, value: item.unit, formula: `="${item.unit}"` })}
                                className="p-2.5 font-mono text-slate-600 border border-slate-300 text-center"
                              >
                                {item.unit}
                              </td>

                              {/* Col E: Quantity */}
                              <td 
                                onClick={() => setActiveCell({ 
                                  ref: `E${excelRow}`, 
                                  value: String(getEffectiveBOQItemQty(item)), 
                                  formula: Boolean(item.mb_rows && item.mb_rows.length > 0) ? `=SUM(MB_${item.item_code}!Quantity)` : `${getEffectiveBOQItemQty(item)}` 
                                })}
                                className="p-2 text-right border border-slate-300"
                              >
                                <input
                                  type="number"
                                  step="0.01"
                                  value={getEffectiveBOQItemQty(item)}
                                  onChange={(e) => handleUpdateQuantity(item.id, parseFloat(e.target.value) || 0)}
                                  readOnly={Boolean(item.mb_rows && item.mb_rows.length > 0)}
                                  title={item.mb_rows && item.mb_rows.length > 0 ? "Quantity derived from Measurement Book" : "Edit quantity"}
                                  className="w-24 p-1.5 border rounded-lg text-right font-mono font-bold text-blue-700 bg-white print:border-none print:p-0 print:text-right"
                                />
                              </td>

                              {/* Col F: Unit Rate */}
                              <td 
                                onClick={() => setActiveCell({ ref: `F${excelRow}`, value: String(unitRate), formula: `=RATE_ANALYSIS("${item.item_code}")` })}
                                className="p-2.5 text-right font-mono text-slate-700 border border-slate-300"
                              >
                                {currencyCode()} {unitRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>

                              {/* Col G: Total Amount */}
                              <td 
                                onClick={() => setActiveCell({ ref: `G${excelRow}`, value: String(totalAmt), formula: `=E${excelRow}*F${excelRow}` })}
                                className="p-2.5 text-right font-mono font-bold text-slate-900 text-sm border border-slate-300"
                              >
                                {currencyCode()} {totalAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>

                              {/* Col H: Actions */}
                              <td className="p-2 text-center border border-slate-300 print:hidden whitespace-nowrap">
                                <div className="inline-flex items-center gap-0.5">
                                  <button
                                    onClick={() => handleDuplicateItem(item.id)}
                                    className="p-1 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition cursor-pointer"
                                    title="Duplicate item (Dup)"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveItem(item.id, 'up')}
                                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition cursor-pointer"
                                    title="Move item up (↑)"
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveItem(item.id, 'down')}
                                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition cursor-pointer"
                                    title="Move item down (↓)"
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded transition cursor-pointer"
                                    title="Delete item (Del)"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {/* Subtotal Row for Category */}
                        <tr className="bg-slate-100/70 font-extrabold text-slate-800 border-b-2 border-slate-300">
                          <td colSpan={7} className="p-2.5 text-right font-bold text-xs border border-slate-300">
                            Subtotal for {group.category}:
                          </td>
                          <td className="p-2.5 text-right font-mono font-black text-blue-950 text-xs border border-slate-300">
                            {currencyCode()} {group.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 border border-slate-300 print:hidden"></td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Schedule of Provisional Sum (P.S.) Items (Excluding Tax / Added at Bottom) */}
          <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  Schedule of Provisional Sum (P.S.) Items (Excluding Tax)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Provisional sums (insurance, third-party lab testing, utility shifting) are exempt from standard contractor Tax and added at the bottom of the estimate abstract.
                </p>
              </div>
              <button
                onClick={handleAddProvItem}
                className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1 print:hidden cursor-pointer"
                title="Add Provisional Sum (P.S.) Item"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ PS</span>
              </button>
            </div>

            {provItems.length === 0 ? (
              <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex flex-wrap justify-between items-center gap-3">
                <div>
                  <span className="font-bold">No itemized P.S. schedule defined.</span> Using fallback lump-sum of{' '}
                  <span className="font-mono font-bold">{currencyCode()} {provSumTotal.toLocaleString('en-US')}</span>.
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">Lump Sum P.S. ({currencyCode()}):</span>
                  <input
                    type="number"
                    value={project.provisional_sum !== undefined ? project.provisional_sum : 150000}
                    onChange={(e) => handleUpdateProvSum(parseFloat(e.target.value) || 0)}
                    className="w-28 p-1.5 border border-slate-300 rounded-lg text-right font-mono font-bold text-slate-900 bg-white"
                  />
                  <button
                    onClick={handleAddProvItem}
                    className="px-2.5 py-1.5 bg-amber-600 text-white font-bold rounded-lg text-xs shadow-xs hover:bg-amber-700 transition"
                  >
                    Create Itemized P.S. Schedule
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-300 rounded-xl">
                <table className="w-full text-xs text-left border-collapse border border-slate-300">
                  <thead className="bg-slate-100 uppercase text-[10px] font-extrabold text-slate-700 border-b border-slate-300">
                    <tr>
                      <th className="p-2.5 w-12 text-center border border-slate-300">S.N.</th>
                      <th className="p-2.5 w-24 border border-slate-300">Code</th>
                      <th className="p-2.5 min-w-[200px] border border-slate-300">Description / Particulars</th>
                      <th className="p-2.5 w-20 text-center border border-slate-300">Unit</th>
                      <th className="p-2.5 w-24 text-right border border-slate-300">Quantity</th>
                      <th className="p-2.5 w-32 text-right border border-slate-300">Rate ({currencyCode()})</th>
                      <th className="p-2.5 w-36 text-right font-black text-amber-900 border border-slate-300">Amount ({currencyCode()})</th>
                      <th className="p-2.5 w-12 text-center border border-slate-300 print:hidden">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {provItems.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="p-2 text-center font-mono text-slate-500 border border-slate-300">{idx + 1}</td>
                        <td className="p-2 border border-slate-300">
                          <input
                            type="text"
                            value={p.code}
                            onChange={(e) => handleUpdateProvItem(p.id, 'code', e.target.value)}
                            className="w-full p-1 border rounded font-mono font-bold text-amber-800 bg-white border-slate-300"
                          />
                        </td>
                        <td className="p-2 border border-slate-300">
                          <input
                            type="text"
                            value={p.description}
                            onChange={(e) => handleUpdateProvItem(p.id, 'description', e.target.value)}
                            className="w-full p-1 border rounded font-bold text-slate-900 bg-white border-slate-300"
                          />
                        </td>
                        <td className="p-2 text-center border border-slate-300">
                          <input
                            type="text"
                            value={p.unit}
                            onChange={(e) => handleUpdateProvItem(p.id, 'unit', e.target.value)}
                            className="w-16 p-1 border rounded text-center font-mono text-slate-700 bg-white border-slate-300"
                          />
                        </td>
                        <td className="p-2 text-right border border-slate-300">
                          <input
                            type="number"
                            step="0.1"
                            value={p.quantity}
                            onChange={(e) => handleUpdateProvItem(p.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-20 p-1 border rounded text-right font-mono font-bold text-slate-900 bg-white border-slate-300"
                          />
                        </td>
                        <td className="p-2 text-right border border-slate-300">
                          <input
                            type="number"
                            step="0.01"
                            value={p.rate}
                            onChange={(e) => handleUpdateProvItem(p.id, 'rate', parseFloat(e.target.value) || 0)}
                            className="w-24 p-1 border rounded text-right font-mono font-bold text-slate-900 bg-white border-slate-300"
                          />
                        </td>
                        <td className="p-2 text-right font-mono font-black text-amber-900 border border-slate-300 bg-amber-50/30">
                          {currencyCode()} {p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-center border border-slate-300 print:hidden">
                          <button
                            onClick={() => handleDeleteProvItem(p.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Remove P.S. Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold text-xs text-slate-900 border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={6} className="p-2.5 text-right font-extrabold border border-slate-300">
                        Total Provisional Sum (P.S. - Tax Exempt):
                      </td>
                      <td className="p-2.5 text-right font-mono font-black text-amber-900 text-sm border border-slate-300">
                        {currencyCode()} {provSumTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border border-slate-300 print:hidden"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Cost Summary Box */}
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm max-w-md ml-auto space-y-3 print:border-slate-400 print:shadow-none">
            <div className="flex justify-between items-center border-b border-slate-300 pb-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Estimate Financial Summary
              </h4>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {rateMode === 'user' ? 'Office Estimate' : 'Tender Estimate'}
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Civil Works Cost:</span>
                <span className="font-bold text-slate-900">
                  {currencyCode()} {directSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Tax ({rateMode === 'user' ? '0%' : '13%'} on Civil Works):</span>
                <span className="font-bold text-slate-900">
                  {rateMode === 'user'
                    ? `${currencyCode()} 0.00 (Incl. in Materials)`
                    : `${currencyCode()} ${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                </span>
              </div>

              <div className="flex justify-between text-slate-800 font-bold border-t border-slate-200 pt-1.5">
                <span>Subtotal (Incl. Tax):</span>
                <span>{currencyCode()} {subtotalWithTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between items-center text-amber-900 bg-amber-50/60 p-2 rounded border border-amber-200/80 font-bold">
                <span>Add: Provisional Sum (P.S.) (Tax Exempt):</span>
                <span className="font-mono font-black">
                  {currencyCode()} {provSumTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between text-slate-800 font-bold border-t border-slate-200 pt-1.5">
                <span>Subtotal (Incl. Tax & P.S.):</span>
                <span>{currencyCode()} {subtotalWithTaxAndPS.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between items-center text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 font-bold">
                <span className="flex items-center gap-1">
                  Contingency (
                  <input
                    type="number"
                    value={contPercent}
                    onChange={(e) => handleUpdateContingency(parseFloat(e.target.value) || 0)}
                    className="w-12 p-0.5 border border-slate-300 rounded text-center font-mono font-bold text-slate-900 bg-white inline-block print:border-none print:p-0"
                    step="0.5"
                  />
                  %):
                </span>
                <span className="font-bold text-slate-900 font-mono">
                  {currencyCode()} {contingencyAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="border-t-2 border-slate-300 pt-2 flex justify-between text-sm font-bold text-blue-900 bg-blue-50 p-3 rounded-xl">
                <span>Grand Estimated Total (Incl. P.S.):</span>
                <span>
                  {currencyCode()} {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Modal 1: Edit Abstract Headings & Document Titles */}
      {isEditHeadingsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Edit Abstract Headings & Document Banners</h3>
              </div>
              <button
                onClick={() => setIsEditHeadingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-lg rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 text-xs">
              {/* Office & Local Authority Banners */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-slate-800 uppercase text-[11px] tracking-wider text-indigo-900">
                  1. Official Header Banners
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Local Authority Name</label>
                    <input
                      type="text"
                      value={project.header_config?.authority_name || ''}
                      onChange={(e) => handleUpdateHeaderConfigField('authority_name', e.target.value)}
                      placeholder="e.g. Sample City Authority"
                      className="w-full p-2 border border-slate-300 rounded-lg font-medium bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Office Name</label>
                    <input
                      type="text"
                      value={project.header_config?.office_name || ''}
                      onChange={(e) => handleUpdateHeaderConfigField('office_name', e.target.value)}
                      placeholder="e.g. Local Authority Office"
                      className="w-full p-2 border border-slate-300 rounded-lg font-medium bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Office Address</label>
                    <input
                      type="text"
                      value={project.header_config?.office_address || ''}
                      onChange={(e) => handleUpdateHeaderConfigField('office_address', e.target.value)}
                      placeholder="e.g. Sample City, Sample Province"
                      className="w-full p-2 border border-slate-300 rounded-lg font-medium bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Abstract Document Title</label>
                    <input
                      type="text"
                      value={project.header_config?.document_title_estimate || ''}
                      onChange={(e) => handleUpdateHeaderConfigField('document_title_estimate', e.target.value)}
                      placeholder="e.g. Construction cost estimate"
                      className="w-full p-2 border border-slate-300 rounded-lg font-medium bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Project Info Banners */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-slate-800 uppercase text-[11px] tracking-wider text-indigo-900">
                  2. Project Metadata Headings
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Project Title</label>
                    <input
                      type="text"
                      value={project.title}
                      onChange={(e) => setProject((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={project.implementation_location || project.header_config?.implementation_location || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProject((prev) => ({
                          ...prev,
                          implementation_location: val,
                          header_config: { ...(prev.header_config || {}), implementation_location: val }
                        }));
                      }}
                      placeholder="e.g. Sample City Ward. 4"
                      className="w-full p-2 border border-slate-300 rounded-lg font-medium bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">. (Budget Head No.)</label>
                    <input
                      type="text"
                      value={project.budget_head_no || project.header_config?.budget_head_no || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProject((prev) => ({
                          ...prev,
                          budget_head_no: val,
                          header_config: { ...(prev.header_config || {}), budget_head_no: val }
                        }));
                      }}
                      placeholder="e.g. 3370114"
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Client Name</label>
                    <input
                      type="text"
                      value={project.client_name}
                      onChange={(e) => setProject((prev) => ({ ...prev, client_name: e.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded-lg font-medium bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Table Column Headings */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-slate-800 uppercase text-[11px] tracking-wider text-indigo-900">
                  3. Abstract Table Column Headings
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-600 text-[11px] mb-1">Item Description</label>
                    <input
                      type="text"
                      value={project.header_config?.column_labels?.particulars || ''}
                      onChange={(e) => handleUpdateColumnLabel('particulars', e.target.value)}
                      placeholder="e.g. Work description"
                      className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 text-[11px] mb-1">Unit Header</label>
                    <input
                      type="text"
                      value={project.header_config?.column_labels?.unit || ''}
                      onChange={(e) => handleUpdateColumnLabel('unit', e.target.value)}
                      placeholder="e.g. Unit"
                      className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 text-[11px] mb-1">Quantity Header</label>
                    <input
                      type="text"
                      value={project.header_config?.column_labels?.quantity || ''}
                      onChange={(e) => handleUpdateColumnLabel('quantity', e.target.value)}
                      placeholder="e.g. Quantity"
                      className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 text-[11px] mb-1">Unit Rate Header</label>
                    <input
                      type="text"
                      value={project.header_config?.column_labels?.rate || ''}
                      onChange={(e) => handleUpdateColumnLabel('rate', e.target.value)}
                      placeholder="e.g..) / Rate"
                      className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 text-[11px] mb-1">Total Amount Header</label>
                    <input
                      type="text"
                      value={project.header_config?.column_labels?.amount || ''}
                      onChange={(e) => handleUpdateColumnLabel('amount', e.target.value)}
                      placeholder="e.g. Amount"
                      className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button
                onClick={() => {
                  setIsEditHeadingsModalOpen(false);
                  showToast('Updated Abstract Headings successfully.');
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Done & Apply Headings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Add New Category Section Heading */}
      {isAddingCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex justify-between items-center border-b pb-2">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Add Category Section Heading</h3>
              </div>
              <button
                onClick={() => setIsAddingCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-lg rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Heading Title</label>
                <input
                  type="text"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCategoryHeading();
                  }}
                  placeholder="e.g. 01. Substructure & Civil Works"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Created category headings group work items together in the Abstract of Estimate table and reports.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button
                onClick={() => setIsAddingCategoryModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategoryHeading}
                disabled={!newCategoryInput.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition"
              >
                Add Heading
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Work Item from Norms Library */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn print:hidden">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Work Item to Estimate</h3>
                  <p className="text-[11px] text-slate-500">Pick from BLD / Roads Dept. standard specification norms</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search norms by code or description (e.g. brickwork, excavation, concrete)..."
                value={normSearchQuery}
                onChange={(e) => setNormSearchQuery(e.target.value)}
                className="w-full pl-3 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                autoFocus
              />
            </div>

            {/* Norms List */}
            <div className="max-h-72 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50">
              {norms
                .filter((norm) => {
                  if (!normSearchQuery.trim()) return true;
                  const q = normSearchQuery.toLowerCase();
                  return (
                    (norm.code || '').toLowerCase().includes(q) ||
                    (norm.description || '').toLowerCase().includes(q) ||
                    (norm.source || '').toLowerCase().includes(q)
                  );
                })
                .map((norm) => {
                  const isChecked = selectedNormIds.includes(norm.item_id);
                  const rateResult = calculateItemRate({
                    norm,
                    resources,
                    zone: selectedZone,
                    fiscalYear: selectedFY
                  });
                  const displayRate = rateMode === 'contractor'
                    ? (rateResult.contractor_unit_rate || rateResult.total_unit_rate)
                    : (rateResult.user_unit_rate || rateResult.total_unit_rate);

                  return (
                    <div
                      key={norm.item_id}
                      onClick={() => {
                        setSelectedNormIds((prev) =>
                          prev.includes(norm.item_id)
                            ? prev.filter((id) => id !== norm.item_id)
                            : [...prev, norm.item_id]
                        );
                        setSelectedNormId(norm.item_id);
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-start gap-3 ${
                        isChecked
                          ? 'bg-emerald-50 border-emerald-400 shadow-xs'
                          : 'bg-white hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-1 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-emerald-800 text-[11px] bg-emerald-100 px-1.5 py-0.2 rounded">
                            Item {norm.code}
                          </span>
                          <span className="font-mono font-bold text-slate-800 text-xs">
                            {currencyCode()} {displayRate.toFixed(2)} / {norm.base_unit}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-800 mt-1 line-clamp-2">{norm.description}</p>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{norm.source}</span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-between items-center border-t pt-3">
              <span className="text-xs text-slate-500">
                Selected: <strong className="text-slate-800">{selectedNormIds.length}</strong> items
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAddItem}
                  disabled={selectedNormIds.length === 0}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
                >
                  Add Selected to BOQ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOQ Excel Import & Norms Mapping Modal */}
      <BOQExcelImportModal
        isOpen={isImportExcelModalOpen}
        onClose={() => setIsImportExcelModalOpen(false)}
        project={project}
        setProject={setProject}
        norms={norms}
        setNorms={setNorms}
        resources={resources}
        selectedZone={selectedZone}
        selectedFY={selectedFY}
        showToast={showToast}
        onNavigateToTab={onNavigateToTab}
      />
    </div>
  );
};
