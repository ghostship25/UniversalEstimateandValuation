import React, { useState } from 'react';
import {
  Printer,
  FileSpreadsheet,
  X,
  CheckSquare,
  Square,
  Search,
  Settings2,
  FileText
} from 'lucide-react';
import { RateNormItem, ResourceMaster, ProjectEstimate, ZoneInfo, RateCalculationMode } from '../types';
import { calculateItemRate } from '../services/rateEngine';
import { downloadPrintableHTML } from '../services/printExport';
import { exportRateAnalysisToExcel } from '../services/excelExport';
import { currencyCode } from '../services/currency';

interface PrintRateAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  norms: RateNormItem[];
  resources: ResourceMaster[];
  project: ProjectEstimate;
  selectedZone: ZoneInfo;
  selectedFY: string;
  calcMode: RateCalculationMode;
  overheadPercent: number;
  leadKm: number;
  royaltyPerCum: number;
  showToast: (msg: string) => void;
}

export const PrintRateAnalysisModal: React.FC<PrintRateAnalysisModalProps> = ({
  isOpen,
  onClose,
  norms,
  resources,
  project,
  selectedZone,
  selectedFY,
  calcMode,
  overheadPercent,
  leadKm,
  royaltyPerCum,
  showToast
}) => {
  const [printType, setPrintType] = useState<'summary' | 'detailed'>('detailed');
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [selectedNormIds, setSelectedNormIds] = useState<Array<number | string>>(
    norms.map((n) => n.item_id)
  );
  const [searchQuery, setSearchQuery] = useState('');

  // User Defined Headings & Preferences
  const [authorityName, setAuthorityName] = useState(
    project.header_config?.authority_name || 'Sample City Authority'
  );
  const [officeName, setOfficeName] = useState(
    project.header_config?.office_name || 'Local Authority Office'
  );
  const [officeAddress, setOfficeAddress] = useState(
    project.header_config?.office_address || 'Sample City, Sample Province'
  );
  const [documentTitle, setDocumentTitle] = useState(
    project.header_config?.document_title_rate_analysis || 'Rate Analysis'
  );
  const [includeProjectName, setIncludeProjectName] = useState(true);

  if (!isOpen) return null;

  const filteredNorms = norms.filter(
    (n) =>
      String(n.code).toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(n.description).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const boqNormCodes = new Set(project.items.map((i) => i.item_code));

  const handleSelectAll = () => {
    setSelectedNormIds(norms.map((n) => n.item_id));
  };

  const handleDeselectAll = () => {
    setSelectedNormIds([]);
  };

  const handleSelectBoqOnly = () => {
    const boqOnlyIds = norms.filter((n) => boqNormCodes.has(n.code)).map((n) => n.item_id);
    setSelectedNormIds(boqOnlyIds);
  };

  const toggleSelectNorm = (id: number | string) => {
    const idStr = String(id);
    setSelectedNormIds((prev) =>
      prev.map(String).includes(idStr)
        ? prev.filter((i) => String(i) !== idStr)
        : [...prev, id]
    );
  };

  const selectedNormsList = norms.filter((n) =>
    selectedNormIds.map(String).includes(String(n.item_id))
  );

  // Generate Calculated Analysis for Selected Norms
  const calculatedItems = selectedNormsList.map((norm) => {
    const result = calculateItemRate({
      norm,
      resources,
      zone: selectedZone,
      fiscalYear: selectedFY,
      mode: calcMode,
      contractorOverheadPercent: overheadPercent,
      materialTaxPercent: 13,
      taxPercent: 13,
      leadKm,
      royaltyPerCum
    });
    return { norm, result };
  });

  const handleExecutePrint = () => {
    if (calculatedItems.length === 0) {
      alert('Please select at least one rate analysis item to print.');
      return;
    }

    const customHeaderHtml = `
      <div style="text-align: center; font-family: 'Kalimati', 'Nirmala UI', sans-serif; margin-bottom: 16px;">
        <div style="font-size: 16pt; font-weight: bold; color: #000;">${authorityName}</div>
        <div style="font-size: 13pt; font-weight: bold; color: #000;">${officeName}</div>
        <div style="font-size: 11pt; font-weight: bold; color: #000;">${officeAddress}</div>
        <br/>
        <div style="font-size: 14pt; font-weight: bold; text-decoration: underline; color: #000;">${documentTitle}</div>
      </div>

      ${
        includeProjectName
          ? `<table style="width: 100%; font-size: 10pt; margin-bottom: 14px; border: none !important;">
        <tr style="border: none !important;">
          <td style="border: none !important;"><b>Program / Project Name:</b> ${project.title || 'Construction work'}</td>
          <td style="border: none !important; text-align: right;"><b>Fiscal Year:</b> ${project.fiscal_year || selectedFY}</td>
        </tr>
        <tr style="border: none !important;">
          <td style="border: none !important;"><b>Implementation Location:</b> ${project.local_authority || selectedZone.name_en}</td>
          <td style="border: none !important; text-align: right;"><b>Budget sub-head no:</b> ${project.budget_head_no || ''}</td>
        </tr>
      </table>`
          : ''
      }
    `;

    let tableHtml = '';

    if (printType === 'summary') {
      tableHtml = `<table border="1" cellpadding="6" cellspacing="0" class="print-table" style="width:100%; border-collapse: collapse; font-size: 9.5pt;">
        <thead>
          <tr style="background-color: #f1f5f9; text-align: center;">
            <th class="col-sn" style="border: 1px solid #000;">S.No.</th>
            <th class="col-code" style="border: 1px solid #000;">Item code</th>
            <th class="col-desc" style="border: 1px solid #000;">Description of Work</th>
            <th class="col-unit" style="border: 1px solid #000;">Unit</th>
            <th class="col-qty" style="border: 1px solid #000;">Base quantity</th>
            <th class="col-rate" style="border: 1px solid #000;">${currencyCode()}</th>
          </tr>
        </thead>
        <tbody>`;

      calculatedItems.forEach((entry, idx) => {
        tableHtml += `<tr>
          <td class="col-sn" style="text-align: center; border: 1px solid #000;">${idx + 1}</td>
          <td class="col-code" style="border: 1px solid #000; font-weight: bold;">${entry.norm.code}</td>
          <td class="col-desc" style="border: 1px solid #000;">${entry.norm.description}</td>
          <td class="col-unit" style="text-align: center; border: 1px solid #000;">${entry.norm.base_unit}</td>
          <td class="col-qty" style="text-align: center; border: 1px solid #000;">${entry.norm.base_quantity || 1}</td>
          <td class="col-rate" style="text-align: right; border: 1px solid #000; font-weight: bold;">${entry.result.total_unit_rate.toFixed(2)}</td>
        </tr>`;
      });

      tableHtml += `</tbody></table>`;
    } else {
      // Detailed Rate Analysis for each selected item
      tableHtml = `<div style="display: flex; flex-direction: column; gap: 24px;">`;
      calculatedItems.forEach((entry, idx) => {
        tableHtml += `
          <div style="border: 1px solid #000; padding: 12px; border-radius: 4px; page-break-inside: avoid; margin-bottom: 20px;">
            <div style="font-size: 11pt; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px;">
              Item no. ${idx + 1}: [${entry.norm.code}] - ${entry.norm.description} &nbsp; (: ${entry.norm.base_quantity || 1} ${entry.norm.base_unit})
            </div>
            <table border="1" cellpadding="5" cellspacing="0" class="print-table" style="width:100%; border-collapse: collapse; font-size: 9pt;">
              <thead>
                <tr style="background-color: #f1f5f9; text-align: center;">
                  <th class="col-sn" style="border: 1px solid #000;">S.No.</th>
                  <th class="col-desc" style="border: 1px solid #000;">Material / labor / equipment details</th>
                  <th class="col-cat" style="border: 1px solid #000;">Square</th>
                  <th class="col-unit" style="border: 1px solid #000;">Unit</th>
                  <th class="col-qty" style="border: 1px solid #000;">Quantity</th>
                  <th class="col-rate" style="border: 1px solid #000;">Rate (${currencyCode()})</th>
                  <th class="col-amount" style="border: 1px solid #000;">Total (${currencyCode()})</th>
                </tr>
              </thead>
              <tbody>`;

        (entry.result.breakdown || []).forEach((r, rIdx) => {
          tableHtml += `<tr>
            <td class="col-sn" style="text-align: center; border: 1px solid #000;">${rIdx + 1}</td>
            <td class="col-desc" style="border: 1px solid #000;"><b>${r.resource_name}</b></td>
            <td class="col-cat" style="border: 1px solid #000;">${r.category}</td>
            <td class="col-unit" style="text-align: center; border: 1px solid #000;">${r.unit}</td>
            <td class="col-qty" style="text-align: right; border: 1px solid #000;">${r.quantity.toFixed(4)}</td>
            <td class="col-rate" style="text-align: right; border: 1px solid #000;">${r.unit_rate.toFixed(2)}</td>
            <td class="col-amount" style="text-align: right; border: 1px solid #000;">${r.subtotal.toFixed(2)}</td>
          </tr>`;
        });

        tableHtml += `
              </tbody>
              <tfoot>
                <tr style="background-color: #f8fafc; font-weight: bold;">
                  <td colSpan="6" style="text-align: right; border: 1px solid #000;">Total rate (per 1 ${entry.norm.base_unit}):</td>
                  <td style="text-align: right; border: 1px solid #000; font-size: 10pt; color: #000;">${currencyCode()} ${entry.result.total_unit_rate.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        `;
      });
      tableHtml += `</div>`;
    }

    // Add Signature Blocks
    tableHtml += `
      <div style="margin-top: 36px; display: flex; justify-content: space-between; font-size: 10pt; font-weight: bold;">
        <div style="text-align: center;">
          <div style="margin-bottom: 40px;">.........................................</div>
          <div>Engineer</div>
        </div>
        <div style="text-align: center;">
          <div style="margin-bottom: 40px;">.........................................</div>
          <div>Overseer / SDE</div>
        </div>
        <div style="text-align: center;">
          <div style="margin-bottom: 40px;">.........................................</div>
          <div>Chief Engineer / DAO</div>
        </div>
      </div>
    `;

    downloadPrintableHTML({
      title: documentTitle,
      projectTitle: includeProjectName ? project.title : '',
      zone: selectedZone.name_en,
      fiscalYear: selectedFY,
      customHeaderHtml,
      tableHtml,
      filename: `Rate_Analysis_${printType}_${selectedZone.name_en}`,
      orientation: printOrientation
    });

    showToast(`Printed ${calculatedItems.length} rate analysis items (${printType} mode).`);
    onClose();
  };

  const handleExecuteExcel = () => {
    if (calculatedItems.length === 0) {
      alert('Please select at least one rate analysis item to export.');
      return;
    }

    exportRateAnalysisToExcel(
      calculatedItems,
      project,
      selectedZone,
      selectedFY,
      printType,
      {
        authority_name: authorityName,
        office_name: officeName,
        office_address: officeAddress,
        document_title: documentTitle,
        include_project_name: includeProjectName
      }
    );

    showToast(`Exported ${calculatedItems.length} Rate Analysis items to Excel (.xlsx) ready to print!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-extrabold text-sm">Print / Export Rate Analysis</h3>
              <p className="text-[11px] text-slate-300">Custom print options, item selection & user-defined headings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Mode & Type Selection */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <label className="font-bold text-slate-800 text-xs block">1. Select Print Layout & Orientation</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  printType === 'detailed'
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="printType"
                  checked={printType === 'detailed'}
                  onChange={() => setPrintType('detailed')}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-extrabold text-slate-900 block">Full Detailed Rate Analysis Sheets</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Prints itemized resource breakdown tables (labor, material, equipment) for each selected item.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  printType === 'summary'
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="printType"
                  checked={printType === 'summary'}
                  onChange={() => setPrintType('summary')}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-extrabold text-slate-900 block">Rate Analysis Summary Abstract</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Prints a clean single summary table listing item codes, descriptions, units, and approved rates.
                  </span>
                </div>
              </label>
            </div>

            {/* Page Orientation Selector */}
            <div className="pt-2 border-t border-slate-200">
              <label className="font-bold text-slate-800 text-[11px] block mb-1.5">Print Orientation</label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer font-bold text-xs transition ${
                    printOrientation === 'portrait'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="printOrientation"
                    checked={printOrientation === 'portrait'}
                    onChange={() => setPrintOrientation('portrait')}
                  />
                  <span>📄 Portrait Mode ( A4)</span>
                </label>

                <label
                  className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer font-bold text-xs transition ${
                    printOrientation === 'landscape'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="printOrientation"
                    checked={printOrientation === 'landscape'}
                    onChange={() => setPrintOrientation('landscape')}
                  />
                  <span>📜 Landscape Mode ( A4)</span>
                </label>
              </div>
            </div>
          </div>

          {/* User Defined Headings Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-blue-600" /> 2. User-Defined Print Headings & Project Options
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-blue-900">
                <input
                  type="checkbox"
                  checked={includeProjectName}
                  onChange={(e) => setIncludeProjectName(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                Include Project Name & Info Table
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Local Authority / Organization Name</label>
                <input
                  type="text"
                  value={authorityName}
                  onChange={(e) => setAuthorityName(e.target.value)}
                  className="w-full p-2 border rounded-xl font-bold text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Office / Executive Name</label>
                <input
                  type="text"
                  value={officeName}
                  onChange={(e) => setOfficeName(e.target.value)}
                  className="w-full p-2 border rounded-xl font-bold text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Office Address / Location</label>
                <input
                  type="text"
                  value={officeAddress}
                  onChange={(e) => setOfficeAddress(e.target.value)}
                  className="w-full p-2 border rounded-xl font-medium text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Report Heading / Title</label>
                <input
                  type="text"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  className="w-full p-2 border rounded-xl font-bold text-blue-800 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Item Selection Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-2">
              <div>
                <label className="font-bold text-slate-800 text-xs block">
                  3. Select Rate Analysis Items to Print ({selectedNormIds.length} of {norms.length} selected)
                </label>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition"
                >
                  Select All
                </button>
                <button
                  onClick={handleSelectBoqOnly}
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[11px] transition"
                  title="Select items that are used in current active BOQ project"
                >
                  BOQ Items Only ({norms.filter((n) => boqNormCodes.has(n.code)).length})
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[11px] transition"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Filter Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search norms by code or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Items Checkbox List */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100">
              {filteredNorms.length === 0 ? (
                <div className="p-4 text-center text-slate-400">No norm items match search query.</div>
              ) : (
                filteredNorms.map((norm) => {
                  const isSelected = selectedNormIds.map(String).includes(String(norm.item_id));
                  const isBoq = boqNormCodes.has(norm.code);

                  return (
                    <div
                      key={norm.item_id}
                      onClick={() => toggleSelectNorm(norm.item_id)}
                      className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition ${
                        isSelected ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="font-mono font-bold text-slate-900 text-xs shrink-0">
                          {norm.code}
                        </span>
                        <span className="text-slate-700 truncate font-medium">{norm.description}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isBoq && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                            IN BOQ
                          </span>
                        )}
                        <span className="font-mono text-slate-500 text-[11px] font-bold">
                          1 {norm.base_unit}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <span className="text-xs font-bold text-slate-600">
            Selected: <span className="text-blue-700 font-extrabold">{selectedNormIds.length} Rate Item(s)</span>
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-100 text-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export to Excel (.xlsx)
            </button>
            <button
              onClick={handleExecutePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" /> Print Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
