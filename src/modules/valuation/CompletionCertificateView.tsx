import React, { useState, useEffect } from 'react';
import {
  Award,
  Printer,
  Download,
  Calendar,
  Building2,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  FileText,
  UserCheck,
  Edit3,
  Layers,
  Filter,
  AlertTriangle,
  ArrowRight,
  Plus,
  X,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { ProjectEstimate, ValuationMBBook, ValuationMBRow, CompletionCertificate, Contract } from '../../types';
import { downloadPrintableHTML } from '../../services/printExport';
import { currencyCode } from '../../services/currency';

export interface SignatureBlock {
  id: string;
  title: string;
  designation: string;
}

export interface CustomTopHeading {
  id: string;
  text: string;
}

export interface HeaderMetadataField {
  id: string;
  label: string;
  value: string;
  isDeletable?: boolean;
}



interface CompletionCertificateViewProps {
  project: ProjectEstimate;
  contract?: Contract | null;
  valuationBooks: ValuationMBBook[];
  valuationRows: ValuationMBRow[];
  certificate: CompletionCertificate | null;
  setCertificate: React.Dispatch<React.SetStateAction<CompletionCertificate | null>>;
  showToast: (msg: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const CompletionCertificateView: React.FC<CompletionCertificateViewProps> = ({
  project,
  contract,
  valuationBooks,
  valuationRows,
  certificate,
  setCertificate,
  showToast,
  onNavigateToTab
}) => {
  // Find Final Valuation MBs
  const finalBooks = valuationBooks.filter((b) => b.bill_type === 'FINAL_VALUATION');
  
  // Default filter to first Final MB if present, or first available MB, or 'ALL'
  const defaultFilter = finalBooks[0]?.id || valuationBooks[0]?.id || 'ALL';
  const [selectedBookFilter, setSelectedBookFilter] = useState<string>(defaultFilter);

  // Check if current filter represents a Final MB
  const selectedBook = valuationBooks.find((b) => b.id === selectedBookFilter);
  const isFinalSelected = selectedBook
    ? selectedBook.bill_type === 'FINAL_VALUATION'
    : (selectedBookFilter === 'ALL' && finalBooks.length > 0);

  // User Estimate Config & Allocated Budget Logic
  const userCfg = project.user_estimate_config || {};
  const allocatedBudget = (userCfg.allocated_budget_override ?? Number(project.allocated_budget_amount)) || 0;

  // Helper to get unit rate for an item
  const getItemRate = (item: any) => {
    return item.calculated_unit_rate || item.user_rate || 0;
  };

  // Estimate quantity strictly from MB of Estimate Module
  const getEstimateQuantity = (item: any) => {
    if (item.mb_rows && item.mb_rows.length > 0) {
      return item.mb_rows.reduce((sum: number, r: any) => sum + (Number(r.quantity) || 0), 0);
    }
    return Number(item.estimated_quantity) || 0;
  };

  // Compute total estimate amount
  const totalEstimateAmount = project.items.reduce(
    (sum, item) => sum + getEstimateQuantity(item) * getItemRate(item),
    0
  );

  // Automatic Contingency Percentage Calculation based on Allocated Budget & User Estimate Logic
  const calculateAutoContingencyPercent = () => {
    if (userCfg.contingency_percent_valuation !== undefined) {
      return userCfg.contingency_percent_valuation;
    }
    if (userCfg.auto_contingency_enabled !== false) {
      const baseForSlab = allocatedBudget > 0 ? allocatedBudget : totalEstimateAmount;
      if (baseForSlab <= 300000) return 2.0; // small budgets -> 2.0%
      if (baseForSlab <= 2000000) return 1.5; // medium budgets -> 1.5%
      return 1.0; // large budgets -> 1.0%
    }
    if (userCfg.manual_contingency_percent !== undefined) {
      return userCfg.manual_contingency_percent;
    }
    if (project.contingency_percent !== undefined) {
      return Number(project.contingency_percent);
    }
    return 1.5;
  };

  const [showContingency, setShowContingency] = useState<boolean>(true);
  const [contingencyPercent, setContingencyPercent] = useState<number>(calculateAutoContingencyPercent());

  // Keep contingency % updated automatically when project config or estimate changes
  useEffect(() => {
    setContingencyPercent(calculateAutoContingencyPercent());
  }, [project.user_estimate_config, project.allocated_budget_amount, project.contingency_percent, totalEstimateAmount]);

  // Headings Editing State (Minimized by default, expanded during editing)
  const [isEditingHeadings, setIsEditingHeadings] = useState<boolean>(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);

  // Custom Top Document Headings (Editable top heading lines, add/remove/edit)
  const [customTopHeadings, setCustomTopHeadings] = useState<CustomTopHeading[]>([
    { id: 'h1', text: project.header_config?.authority_name || 'Sample City Authority' },
    { id: 'h2', text: project.header_config?.office_name || 'Local Authority Office' },
    { id: 'h3', text: project.header_config?.office_address || 'Sample City, Sample County' },
    { id: 'h4', text: 'Completion Report' },
    { id: 'h5', text: project.title && project.title !== 'Untitled Project' ? project.title : '' }
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

  // Dynamic Metadata Headings array (Editable Labels & Values, Add Custom Headings, Delete unwanted Headings)
  const [metadataFields, setMetadataFields] = useState<HeaderMetadataField[]>([
    {
      id: 'proj_name',
      label: 'Project / work description',
      value: project.title && project.title !== 'Untitled Project' ? project.title : 'Drain in front of the Smith residence (Main Street)',
      isDeletable: true
    },
    {
      id: 'start_date',
      label: 'Work start date',
      value: '2027-09-17',
      isDeletable: true
    },
    {
      id: 'target_date',
      label: 'Work completion due date',
      value: '2028-02-30',
      isDeletable: true
    },
    {
      id: 'actual_date',
      label: 'Work completion date',
      value: '2027-11-20',
      isDeletable: true
    }
  ]);

  const handleFieldLabelChange = (id: string, newLabel: string) => {
    setMetadataFields(prev => prev.map(f => f.id === id ? { ...f, label: newLabel } : f));
  };

  const handleFieldValueChange = (id: string, newValue: string) => {
    setMetadataFields(prev => prev.map(f => f.id === id ? { ...f, value: newValue } : f));
  };

  const handleRemoveField = (id: string) => {
    setMetadataFields(prev => prev.filter(f => f.id !== id));
  };

  const handleAddCustomField = () => {
    const newField: HeaderMetadataField = {
      id: `custom_${Date.now()}`,
      label: 'New heading',
      value: 'Description',
      isDeletable: true
    };
    setMetadataFields(prev => [...prev, newField]);
  };

  // Dynamic & Editable Signature Headings (Default)
  const [signatures, setSignatures] = useState<SignatureBlock[]>([
    { id: '1', title: 'Prepared by', designation: 'Sub-Engineer' },
    { id: '2', title: 'Checked by', designation: 'Engineer' },
    { id: '3', title: 'Approved by', designation: 'Chief / Engineer' }
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

  // Filter valuation rows based on selected Valuation MB filter
  const filteredValuationRows = selectedBookFilter === 'ALL'
    ? valuationRows
    : valuationRows.filter((r) => r.mb_id === selectedBookFilter);

  // Calculate executed valuation metrics per BOQ item
  const itemComparisonList = project.items.map((item, idx) => {
    const itemRows = filteredValuationRows.filter(
      (r) =>
        r.boq_item_id === item.id ||
        (item.item_id && r.boq_item_id === String(item.item_id)) ||
        (item.item_code && r.boq_item_id === item.item_code)
    );

    let executedQty = 0;
    if (itemRows.length > 0) {
      executedQty = itemRows.reduce(
        (sum, r) => sum + (Number(r.quantity_this_bill) ?? Number((r as any).quantity) ?? 0),
        0
      );
    } else {
      executedQty = Number((item as any).valuation_quantity) ||
                    Number((item as any).executed_quantity) ||
                    getEstimateQuantity(item);
    }

    const rate = getItemRate(item);
    const estQty = getEstimateQuantity(item);
    const estAmount = estQty * rate;
    const valAmount = executedQty * rate;
    const diffQty = executedQty - estQty;
    const diffAmount = valAmount - estAmount;
    const variancePercent = estAmount > 0 ? (diffAmount / estAmount) * 100 : 0;

    return {
      sn: idx + 1,
      item,
      rate,
      estQty,
      estAmount,
      executedQty,
      valAmount,
      diffQty,
      diffAmount,
      variancePercent
    };
  });

  // Totals
  const totalValuationAmount = itemComparisonList.reduce((sum, i) => sum + i.valAmount, 0);
  const totalDiffAmount = totalValuationAmount - totalEstimateAmount;
  const overallVariancePercent = totalEstimateAmount > 0
    ? (totalDiffAmount / totalEstimateAmount) * 100
    : 0;

  // Base for Contingency calculation matching Allocated Budget & User Estimate Logic
  const estContingencyBase = allocatedBudget > 0 ? allocatedBudget : totalEstimateAmount;
  const valContingencyBase = allocatedBudget > 0 ? Math.max(0, allocatedBudget - (userCfg.previous_installment_amount || 0)) : totalValuationAmount;

  const estContingency = showContingency ? (estContingencyBase * contingencyPercent) / 100 : 0;
  const valContingency = showContingency ? (valContingencyBase * contingencyPercent) / 100 : 0;
  const diffContingency = valContingency - estContingency;

  const estGrandTotal = totalEstimateAmount + estContingency;
  const valGrandTotal = totalValuationAmount + valContingency;
  const diffGrandTotal = valGrandTotal - estGrandTotal;

  // Print Report Handler using downloadPrintableHTML
  const handlePrint = () => {
    const rowsHtml = itemComparisonList.map((row) => `
      <tr>
        <td style="text-align: center; border: 1px solid #000; font-weight: bold;">${row.sn}</td>
        <td style="border: 1px solid #000;">${row.item.description}</td>
        <td style="text-align: center; border: 1px solid #000;">${row.item.unit}</td>

        <td style="text-align: right; border: 1px solid #000;">${row.estQty.toLocaleString('en-US', { maximumFractionDigits: 3 })}</td>
        <td style="text-align: right; border: 1px solid #000;">${row.rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right; border: 1px solid #000; font-weight: bold;">${row.estAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>

        <td style="text-align: right; border: 1px solid #000; font-weight: bold; background-color: #f0f9ff;">${row.executedQty.toLocaleString('en-US', { maximumFractionDigits: 3 })}</td>
        <td style="text-align: right; border: 1px solid #000; background-color: #f0f9ff;">${row.rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right; border: 1px solid #000; font-weight: bold; background-color: #f0f9ff;">${row.valAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>

        <td style="text-align: right; border: 1px solid #000; font-weight: bold; color: ${row.diffQty > 0 ? '#b45309' : row.diffQty < 0 ? '#047857' : '#000'};">${row.diffQty > 0 ? '+' : ''}${row.diffQty.toFixed(2)}</td>
        <td style="text-align: right; border: 1px solid #000;">${row.rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right; border: 1px solid #000; font-weight: bold; color: ${row.diffAmount > 0 ? '#b45309' : row.diffAmount < 0 ? '#047857' : '#000'};">${row.diffAmount > 0 ? '+' : ''}${row.diffAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>

        <td style="border: 1px solid #000; font-size: 8pt; text-align: center;">
          ${row.variancePercent > 0 ? `More (+${row.variancePercent.toFixed(1)}%)` : row.variancePercent < 0 ? `Less (${row.variancePercent.toFixed(1)}%)` : 'As is'}
        </td>
      </tr>
    `).join('');

    const sigsHtml = signatures.map(sig => `
      <div style="min-width: 140px; margin-bottom: 20px;">
        <div style="border-bottom: 1.5px solid #000; width: 130px; margin: 0 auto 6px auto; height: 35px;"></div>
        <b>${sig.title}</b><br/>
        <span style="font-size: 8pt; color: #444;">${sig.designation}</span>
      </div>
    `).join('');

    const customHeaderHtml = customTopHeadings.length > 0 ? `
      <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
        ${customTopHeadings.map((h, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === customTopHeadings.length - 1 && customTopHeadings.length > 1;
          const fontSize = isFirst ? '15pt' : isLast ? '11.5pt' : '10.5pt';
          const color = isLast ? '#b91c1c' : '#000';
          const fontWeight = isFirst || isLast ? 'bold' : 'normal';
          return `<div style="font-size: ${fontSize}; color: ${color}; font-weight: ${fontWeight}; margin: 2px 0;">${h.text}</div>`;
        }).join('')}
      </div>
    ` : '';

    const metadataFieldsHtml = `
      <div style="display: flex; flex-direction: column; gap: 6px; text-align: left;">
        ${metadataFields.map(f => `
          <div style="font-size: 8.5pt; line-height: 1.4; color: #0f172a; word-break: break-word; text-align: left; margin: 0; padding: 0;">
            <span style="font-weight: bold; color: #1e293b;">${f.label} : </span>
            <span style="font-weight: 500; color: #0f172a;">${f.value || '-'}</span>
          </div>
        `).join('')}
      </div>
    `;

    const tableHtml = `
      <div style="font-family: sans-serif; padding: 10px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 12px; border: 1px solid #cbd5e1;">
          <tr>
            <td style="width: 58%; border: 1px solid #cbd5e1; padding: 10px 12px; vertical-align: top; text-align: left;">
              ${metadataFieldsHtml}
            </td>
            <td style="width: 42%; border: 1px solid #cbd5e1; padding: 10px 12px; vertical-align: top; text-align: left; background-color: #f8fafc;">
              <div style="display: flex; flex-direction: column; gap: 6px; text-align: left;">
                <div style="font-size: 8.5pt; line-height: 1.4; color: #0f172a; word-break: break-word;">
                  <span style="font-weight: bold; color: #1e293b;">Total estimate amount : </span>
                  <span style="font-weight: bold; color: #0f172a;">${currencyCode()} ${totalEstimateAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div style="font-size: 8.5pt; line-height: 1.4; color: #0f172a; word-break: break-word;">
                  <span style="font-weight: bold; color: #1e293b;">Amount spent : </span>
                  <span style="font-weight: bold; color: #312e81;">${currencyCode()} ${totalValuationAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div style="font-size: 8.5pt; line-height: 1.4; color: #0f172a; word-break: break-word;">
                  <span style="font-weight: bold; color: #1e293b;">Difference : </span>
                  <span style="font-weight: bold; color: ${totalDiffAmount > 0 ? '#b45309' : '#047857'};">
                    ${currencyCode()} ${totalDiffAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${overallVariancePercent.toFixed(3)}%)
                  </span>
                </div>
                <div style="font-size: 8.5pt; line-height: 1.4; color: #0f172a; word-break: break-word;">
                  <span style="font-weight: bold; color: #1e293b;">Appropriated budget : </span>
                  <span style="font-weight: bold; color: #1e3a8a;">${currencyCode()} ${(allocatedBudget > 0 ? allocatedBudget : 500000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
          <thead>
            <tr style="background-color: #1e293b; color: #fff; text-align: center;">
              <th rowSpan="2" style="border: 1px solid #000; padding: 4px;">S.No</th>
              <th rowSpan="2" style="border: 1px solid #000; padding: 4px; width: 25%;">Work description</th>
              <th rowSpan="2" style="border: 1px solid #000; padding: 4px;">Unit</th>
              <th colSpan="3" style="border: 1px solid #000; padding: 4px; background-color: #0f172a;">Estimate</th>
              <th colSpan="3" style="border: 1px solid #000; padding: 4px; background-color: #1e3a8a;">Executed</th>
              <th colSpan="3" style="border: 1px solid #000; padding: 4px; background-color: #78350f;">Variance</th>
              <th rowSpan="2" style="border: 1px solid #000; padding: 4px;">Remarks</th>
            </tr>
            <tr style="background-color: #334155; color: #fff; text-align: center; font-size: 8pt;">
              <th style="border: 1px solid #000; padding: 3px;">Quantity</th>
              <th style="border: 1px solid #000; padding: 3px;">Rate (${currencyCode()})</th>
              <th style="border: 1px solid #000; padding: 3px;">Total (${currencyCode()})</th>
              <th style="border: 1px solid #000; padding: 3px;">Quantity</th>
              <th style="border: 1px solid #000; padding: 3px;">Rate (${currencyCode()})</th>
              <th style="border: 1px solid #000; padding: 3px;">Total (${currencyCode()})</th>
              <th style="border: 1px solid #000; padding: 3px;">Quantity</th>
              <th style="border: 1px solid #000; padding: 3px;">Rate (${currencyCode()})</th>
              <th style="border: 1px solid #000; padding: 3px;">Total (${currencyCode()})</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background-color: #1e293b; color: #fff; font-weight: bold; font-size: 9pt;">
              <td colSpan="3" style="border: 1px solid #000; padding: 6px; text-align: right;">Subtotal:</td>
              <td colSpan="3" style="border: 1px solid #000; padding: 6px; text-align: right; color: #fde68a;">${currencyCode()} ${totalEstimateAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td colSpan="3" style="border: 1px solid #000; padding: 6px; text-align: right; color: #6ee7b7;">${currencyCode()} ${totalValuationAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td colSpan="3" style="border: 1px solid #000; padding: 6px; text-align: right; color: #67e8f9;">${currencyCode()} ${totalDiffAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="border: 1px solid #000;"></td>
            </tr>
            ${showContingency ? `
            <tr style="background-color: #f8fafc; color: #000; font-weight: bold; font-size: 8.5pt;">
              <td colSpan="3" style="border: 1px solid #000; padding: 5px; text-align: right;">Contingency deduction (${contingencyPercent}% Contingency):</td>
              <td colSpan="3" style="border: 1px solid #000; padding: 5px; text-align: right;">{currencyCode()} ${estContingency.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td colSpan="3" style="border: 1px solid #000; padding: 5px; text-align: right;">{currencyCode()} ${valContingency.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td colSpan="3" style="border: 1px solid #000; padding: 5px; text-align: right;">{currencyCode()} ${diffContingency.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="border: 1px solid #000; text-align: center; font-size: 7.5pt;">Contingency</td>
            </tr>
            <tr style="background-color: #0f172a; color: #fff; font-weight: bold; font-size: 9.5pt;">
              <td colSpan="3" style="border: 1px solid #000; padding: 6px; text-align: right; color: #fef08a;">Grand Total:</td>
              <td colSpan="3" style="border: 1px solid #000; padding: 6px; text-align: right; color: #fde68a;">{currencyCode()} ${estGrandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td colSpan="3" style="border: 1px solid #000; padding: 6px; text-align: right; color: #6ee7b7;">{currencyCode()} ${valGrandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td colSpan="3" style="border: 1px solid #000; padding: 6px; text-align: right; color: #67e8f9;">{currencyCode()} ${diffGrandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="border: 1px solid #000;"></td>
            </tr>
            ` : ''}
          </tfoot>
        </table>

        <div style="margin-top: 50px; display: flex; justify-content: space-around; flex-wrap: wrap; text-align: center; font-size: 9pt; gap: 20px;">
          ${sigsHtml}
        </div>
      </div>
    `;

    downloadPrintableHTML({
      title: customTopHeadings[0]?.text || 'Completion Report',
      projectTitle: project.title || 'Project',
      zone: 'Sample County',
      fiscalYear: '2026/27',
      customHeaderHtml: customHeaderHtml,
      tableHtml: tableHtml,
      filename: `Completion_Certificate_Report_${project.title || 'Project'}.html`,
      orientation: 'landscape'
    });

    showToast('Opened Completion Certificate Print Report');
  };

  // Export CSV function
  const handleExportCSV = () => {
    const headers = [
      'S.No (S.N.)',
      'Work Description',
      'Unit',
      'Est Qty',
      'Est Rate',
      'Est Total',
      'Executed Qty',
      'Executed Rate',
      'Executed Total',
      'Diff Qty',
      'Diff Total',
      'Remarks'
    ];

    const rows = itemComparisonList.map((row) => [
      row.sn,
      `"${row.item.description.replace(/"/g, '""')}"`,
      `"${row.item.unit}"`,
      row.estQty,
      row.rate.toFixed(2),
      row.estAmount.toFixed(2),
      row.executedQty,
      row.rate.toFixed(2),
      row.valAmount.toFixed(2),
      row.diffQty.toFixed(2),
      row.diffAmount.toFixed(2),
      `"${row.variancePercent > 0 ? 'Badi' : row.variancePercent < 0 ? 'Ghatai' : 'Yathawat'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Completion_Certificate_Report_${project.title || 'Project'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported Completion Certificate Report to CSV');
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Controls & Filter Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs px-4 py-3 flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-700 shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 leading-none">
Completion Certificate
              </h2>
              <span className="bg-slate-100 text-slate-700 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border border-slate-200">
                PPR 2064
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {itemComparisonList.length} Items • Variance: {currencyCode()} {totalDiffAmount.toLocaleString()} ({overallVariancePercent.toFixed(2)}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* MB Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-500">MB:</span>
            <select
              value={selectedBookFilter}
              onChange={(e) => setSelectedBookFilter(e.target.value)}
              className="bg-transparent font-bold text-xs text-blue-900 focus:outline-none cursor-pointer"
            >
              {valuationBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.mb_number} - {b.title} ({b.bill_type === 'FINAL_VALUATION' ? '⚡ Final MB' : 'Running Bill'})
                </option>
              ))}
              {finalBooks.length > 0 && (
                <option value="ALL">All Valuation MBs (Cumulative Final)</option>
              )}
            </select>
          </div>

          {/* Primary Action Button - Icon-Only */}
          <button
            onClick={handlePrint}
            disabled={!isFinalSelected}
            className={`p-2 font-bold rounded-lg transition shadow-2xs flex items-center justify-center ${
              isFinalSelected
                ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
            title={isFinalSelected ? 'Print Official Completion Certificate Report' : 'Requires Final Valuation MB to be selected'}
            aria-label="Print Report"
          >
            <Printer className="w-4 h-4" />
          </button>

          {/* More Options Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg transition cursor-pointer shadow-2xs"
              title="More Options"
              aria-label="More Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMoreMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMoreMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-medium animate-fadeIn">
                  <div className="px-3 py-1 text-[10px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-100">
                    Completion Certificate Options
                  </div>

                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleExportCSV();
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Export to CSV</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsEditingHeadings(!isEditingHeadings);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{isEditingHeadings ? 'Hide Headings Editor' : 'Edit Headings & Meta'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setShowContingency(!showContingency);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{showContingency ? 'Hide Contingency Deduction' : 'Show Contingency Deduction'}</span>
                  </button>

                  {onNavigateToTab && (
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onNavigateToTab('valuation-mb');
                      }}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-red-50 text-slate-700 hover:text-red-800 transition cursor-pointer border-t border-slate-100"
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span>Back to Valuation MB</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Warning Notice if Final Valuation MB is not selected */}
      {!isFinalSelected && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-amber-900">
                Final Valuation MB Required for Completion Certificate
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                Completion Certificate (Work Completion Statement & Variance Report) is only applicable when a <b>Final Valuation MB</b> is selected. Running Bills are intermediate payments and do not generate final completion variance certificates.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            {finalBooks.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-900">Select existing Final Valuation MB:</span>
                {finalBooks.map((fb) => (
                  <button
                    key={fb.id}
                    onClick={() => setSelectedBookFilter(fb.id)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs transition cursor-pointer"
                  >
                    ⚡ {fb.mb_number} ({fb.title})
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-amber-900">No Final Valuation MB created yet in this project.</span>
                <button
                  onClick={() => onNavigateToTab && onNavigateToTab('valuation-mb')}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Go to Valuation MB & Add Final Valuation MB
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Official Printed Printable Form Document Area (Visible when Final MB selected) */}
      {isFinalSelected && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-6 print:p-0 print:border-none print:shadow-none">
          
          {/* Custom Top Document Headings Block */}
          {customTopHeadings.length > 0 && (
            <div className="text-center space-y-1 pb-4 border-b border-slate-200">
              {customTopHeadings.map((h, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === customTopHeadings.length - 1 && customTopHeadings.length > 1;
                return (
                  <div
                    key={h.id}
                    className={`tracking-tight ${
                      isFirst
                        ? 'text-lg font-black text-slate-900'
                        : isLast
                        ? 'text-sm font-extrabold text-red-700'
                        : 'text-sm font-bold text-slate-700'
                    }`}
                  >
                    {h.text}
                  </div>
                );
              })}
            </div>
          )}

          {/* Dynamic Structured Metadata Box (Minimized by default, expanded during editing with Smart Indent) */}
          {!isEditingHeadings ? (
            /* Minimized View (Default) */
            <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-4 space-y-3 print:bg-transparent print:p-2 print:border">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-red-600" />
                  <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                    Project details and headings
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingHeadings(true)}
                  className="px-3 py-1 bg-white hover:bg-slate-100 text-red-600 font-bold border border-slate-300 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer print:hidden"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit title / details</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs bg-white p-3.5 rounded-lg border border-slate-200">
                {/* Left Side: Metadata Fields */}
                <div className="md:col-span-7 space-y-2 text-left border-r-0 md:border-r border-slate-200 md:pr-4">
                  {metadataFields.map((f) => (
                    <div key={f.id} className="flex flex-wrap items-baseline gap-1.5 text-xs text-left m-0 p-0">
                      <span className="font-bold text-slate-700 shrink-0">{f.label} :</span>
                      <span className="font-semibold text-slate-900 break-words">{f.value || '-'}</span>
                    </div>
                  ))}
                </div>

                {/* Right Side: Financial Metrics */}
                <div className="md:col-span-5 space-y-2 text-left">
                  <div className="flex flex-wrap items-baseline gap-1.5 text-xs">
                    <span className="font-bold text-slate-700 shrink-0">Total estimate amount :</span>
                    <span className="font-extrabold text-slate-900 whitespace-nowrap">
                      {currencyCode()} {totalEstimateAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-1.5 text-xs">
                    <span className="font-bold text-slate-700 shrink-0">Amount spent :</span>
                    <span className="font-extrabold text-indigo-900 whitespace-nowrap">
                      {currencyCode()} {totalValuationAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-1.5 text-xs">
                    <span className="font-bold text-slate-700 shrink-0">Difference :</span>
                    <span className={`font-extrabold whitespace-nowrap ${totalDiffAmount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {currencyCode()} {totalDiffAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({overallVariancePercent.toFixed(3)}%)
                    </span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-1.5 text-xs">
                    <span className="font-bold text-slate-700 shrink-0">Appropriated budget :</span>
                    <span className="font-extrabold text-blue-900 whitespace-nowrap">
                      {currencyCode()} {(allocatedBudget > 0 ? allocatedBudget : 500000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Expanded Editing View */
            <div className="bg-slate-50 rounded-xl border border-red-300 p-4 space-y-4 shadow-sm font-mono text-xs text-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-red-600" />
                  Edit headings and details
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingHeadings(false)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Close editing</span>
                  </button>
                </div>
              </div>

              {/* Editing Grid: Top Document Headings Editor + Metadata Fields Editor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Top Document Headings Editor */}
                <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between border-b pb-1">
                    <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                      Upper headings
                    </span>
                    <button
                      type="button"
                      onClick={handleAddTopHeading}
                      className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add heading</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {customTopHeadings.map((h) => (
                      <div key={h.id} className="flex items-center gap-2 bg-slate-50 p-1.5 rounded border border-slate-200">
                        <input
                          type="text"
                          value={h.text}
                          onChange={(e) => handleTopHeadingChange(h.id, e.target.value)}
                          className="w-full bg-white px-2 py-1 border border-slate-300 rounded font-bold text-slate-900 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                          placeholder="Upper heading"
                        />
                        {customTopHeadings.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTopHeading(h.id)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition shrink-0 cursor-pointer"
                            title="Remove this upper heading"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Dynamic Editable/Deletable User Metadata Fields */}
                <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between border-b pb-1">
                    <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                      Details and headings
                    </span>
                    <button
                      type="button"
                      onClick={handleAddCustomField}
                      className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add detail</span>
                    </button>
                  </div>

                  {metadataFields.map((field) => (
                    <div key={field.id} className="space-y-1 p-1.5 bg-slate-50/80 rounded border border-slate-200 relative group">
                      <div className="flex items-center justify-between gap-1">
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => handleFieldLabelChange(field.id, e.target.value)}
                          className="font-bold text-slate-700 text-[11px] bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-red-500 w-full"
                          placeholder="Title"
                        />
                        {metadataFields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveField(field.id)}
                            className="text-red-500 hover:text-red-700 p-0.5 rounded hover:bg-red-50 transition shrink-0 cursor-pointer"
                            title="Remove this detail"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                        className="w-full bg-white px-2 py-0.5 border border-slate-300 rounded font-semibold text-slate-900 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                        placeholder="Description"
                      />
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}

          {/* Main Work Completion Comparison Table */}
          <div className="overflow-x-auto border border-slate-300 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                {/* Top Section Header Row */}
                <tr className="bg-slate-800 text-white font-extrabold text-[11px] text-center divide-x divide-slate-700">
                  <th rowSpan={2} className="p-2 w-10">S.No</th>
                  <th rowSpan={2} className="p-2 min-w-[180px] text-left">Work description</th>
                  <th rowSpan={2} className="p-2 w-16">Unit</th>
                  <th colSpan={3} className="p-2 bg-slate-900 border-b border-slate-700">Estimate MB</th>
                  <th colSpan={3} className="p-2 bg-blue-900 border-b border-slate-700">Valuation MB</th>
                  <th colSpan={3} className="p-2 bg-amber-900 border-b border-slate-700">Difference</th>
                  <th rowSpan={2} className="p-2 min-w-[100px]">Remarks</th>
                </tr>
                {/* Sub Columns Header Row */}
                <tr className="bg-slate-700 text-slate-200 font-bold text-[10px] text-center divide-x divide-slate-600">
                  {/* */}
                  <th className="p-1.5 w-20">Quantity</th>
                  <th className="p-1.5 w-20">Rate ({currencyCode()})</th>
                  <th className="p-1.5 w-24">Total ({currencyCode()})</th>
                  {/* */}
                  <th className="p-1.5 w-20 bg-blue-950/40">Quantity</th>
                  <th className="p-1.5 w-20 bg-blue-950/40">Rate ({currencyCode()})</th>
                  <th className="p-1.5 w-24 bg-blue-950/40">Total ({currencyCode()})</th>
                  {/* */}
                  <th className="p-1.5 w-20 bg-amber-950/40">Quantity</th>
                  <th className="p-1.5 w-20 bg-amber-950/40">Rate ({currencyCode()})</th>
                  <th className="p-1.5 w-24 bg-amber-950/40">Total ({currencyCode()})</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-slate-900 font-mono text-[11px]">
                {itemComparisonList.map((row) => (
                  <tr key={row.item.id} className="hover:bg-slate-50 transition divide-x divide-slate-200">
                    <td className="p-2 text-center text-slate-500 font-bold">{row.sn}</td>
                    <td className="p-2 font-sans font-semibold text-slate-900">{row.item.description}</td>
                    <td className="p-2 text-center font-bold text-slate-600">{row.item.unit}</td>

                    {/* */}
                    <td className="p-2 text-right font-bold text-slate-800">{row.estQty.toLocaleString('en-US', { maximumFractionDigits: 3 })}</td>
                    <td className="p-2 text-right">{row.rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="p-2 text-right font-bold text-slate-800">
                      {row.estAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* */}
                    <td className="p-2 text-right bg-blue-50/30 font-extrabold text-indigo-900">
                      {row.executedQty.toLocaleString('en-US', { maximumFractionDigits: 3 })}
                    </td>
                    <td className="p-2 text-right bg-blue-50/30 text-slate-700">
                      {row.rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2 text-right bg-blue-50/30 font-bold text-indigo-950">
                      {row.valAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* */}
                    <td className={`p-2 text-right font-bold ${row.diffQty > 0 ? 'text-amber-700' : row.diffQty < 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {row.diffQty > 0 ? `+${row.diffQty.toFixed(2)}` : row.diffQty.toFixed(2)}
                    </td>
                    <td className="p-2 text-right text-slate-700">
                      {row.rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`p-2 text-right font-extrabold ${row.diffAmount > 0 ? 'text-amber-800 bg-amber-50/50' : row.diffAmount < 0 ? 'text-emerald-800 bg-emerald-50/50' : 'text-slate-500'}`}>
                      {row.diffAmount > 0 ? `+${row.diffAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : row.diffAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* */}
                    <td className="p-2 font-sans text-xs">
                      {row.variancePercent > 0 ? (
                        <span className="text-amber-700 font-bold">More ({row.variancePercent.toFixed(1)}%)</span>
                      ) : row.variancePercent < 0 ? (
                        <span className="text-emerald-700 font-bold">Less ({Math.abs(row.variancePercent).toFixed(1)}%)</span>
                      ) : (
                        <span className="text-slate-400">As is</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Total Footer Rows */}
              <tfoot className="divide-y divide-slate-800 font-bold text-xs">
                {/* Subtotal Row */}
                <tr className="bg-slate-800 text-white font-extrabold text-xs divide-x divide-slate-700">
                  <td colSpan={3} className="p-2.5 text-right uppercase tracking-wider text-slate-200">
Subtotal:
                  </td>
                  <td colSpan={3} className="p-2.5 text-right font-mono text-amber-200">
                    {currencyCode()} {totalEstimateAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={3} className="p-2.5 text-right font-mono text-emerald-200 bg-slate-800">
                    {currencyCode()} {totalValuationAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={3} className="p-2.5 text-right font-mono text-cyan-200">
                    {currencyCode()} {totalDiffAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-2.5"></td>
                </tr>

                {/* Contingency Row */}
                <tr className="bg-slate-800/90 text-indigo-200 divide-x divide-slate-700">
                  <td colSpan={3} className="p-2.5 text-right uppercase tracking-wider font-extrabold text-indigo-300">
                    <div className="flex items-center justify-end gap-2">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showContingency}
                          onChange={(e) => setShowContingency(e.target.checked)}
                          className="w-3.5 h-3.5 accent-indigo-500 rounded cursor-pointer"
                        />
                        <span>Contingency:</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={contingencyPercent}
                        onChange={(e) => setContingencyPercent(parseFloat(e.target.value) || 0)}
                        className="w-16 bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 text-right font-bold text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                      <span>%</span>
                    </div>
                  </td>
                  <td colSpan={3} className="p-2.5 text-right font-mono text-indigo-200">
                    {currencyCode()} {estContingency.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={3} className="p-2.5 text-right font-mono text-indigo-100 bg-indigo-950/40">
                    {currencyCode()} {valContingency.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={3} className="p-2.5 text-right font-mono text-indigo-200">
                    {currencyCode()} {diffContingency.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-2.5 text-[10px] text-indigo-300 text-center">
                    {showContingency ? `${contingencyPercent}% Auto Applied` : 'Disabled'}
                  </td>
                </tr>

                {/* Grand Total Row */}
                <tr className="bg-slate-900 text-white font-extrabold text-xs divide-x divide-slate-800 border-t-2 border-slate-700">
                  <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-amber-300">
Grand Total:
                  </td>
                  <td colSpan={3} className="p-3 text-right font-mono text-amber-300 text-sm">
                    {currencyCode()} {estGrandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={3} className="p-3 text-right font-mono text-emerald-300 text-sm bg-emerald-950/40">
                    {currencyCode()} {valGrandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={3} className="p-3 text-right font-mono text-cyan-300 text-sm">
                    {currencyCode()} {diffGrandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Verification Signatures Block (Editable, Addable, Removable) */}
          <div className="pt-8 border-t border-slate-200 mt-8">
            <div className="flex items-center justify-between mb-4 print:hidden">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Signature Headings</h4>
              <button
                type="button"
                onClick={handleAddSignature}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded px-2.5 py-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add new position / heading
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 text-center text-xs font-bold text-slate-800">
              {signatures.map((sig) => (
                <div key={sig.id} className="relative group space-y-1.5 p-3 rounded-lg border border-dashed border-slate-200 hover:border-slate-400 transition-colors bg-slate-50/50 print:bg-transparent print:border-none">
                  {signatures.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSignature(sig.id)}
                      className="absolute -top-2 -right-2 bg-red-100 text-red-700 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 print:hidden cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className="border-b-2 border-slate-800 w-36 mx-auto pb-6"></div>

                  <div className="space-y-1">
                    <input
                      type="text"
                      value={sig.title}
                      onChange={(e) => handleSignatureChange(sig.id, 'title', e.target.value)}
                      className="w-full text-center font-bold text-slate-900 bg-transparent border-b border-dashed border-slate-300 hover:border-slate-500 focus:border-blue-500 focus:bg-white focus:outline-none rounded px-1 text-xs"
                      placeholder="Title (e.g. Prepared By)"
                    />
                    <input
                      type="text"
                      value={sig.designation}
                      onChange={(e) => handleSignatureChange(sig.id, 'designation', e.target.value)}
                      className="w-full text-center text-[10px] text-slate-500 font-mono bg-transparent border-b border-dashed border-slate-300 hover:border-slate-500 focus:border-blue-500 focus:bg-white focus:outline-none rounded px-1"
                      placeholder="Designation"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

