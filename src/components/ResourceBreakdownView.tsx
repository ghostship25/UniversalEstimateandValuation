import React, { useState, useRef, useEffect } from 'react';
import {
  Package,
  Users,
  Wrench,
  Truck,
  Download,
  Search,
  CheckCircle2,
  Filter,
  FileSpreadsheet,
  ArrowRight,
  Layers,
  ChevronDown,
  ChevronUp,
  PieChart,
  Boxes,
  HelpCircle,
  Printer,
  Ruler,
  MoreVertical
} from 'lucide-react';
import { ProjectEstimate, RateNormItem, ResourceMaster, ZoneInfo, ValuationMBRow, ValuationMBBook } from '../types';
import { findMasterResource } from '../services/rateEngine';
import { downloadPrintableHTML } from '../services/printExport';
import { exportResourceBreakdownToExcel } from '../services/excelExport';

interface ResourceBreakdownViewProps {
  project: ProjectEstimate;
  norms: RateNormItem[];
  resources: ResourceMaster[];
  selectedZone: ZoneInfo;
  selectedFY: string;
  onNavigateToTab?: (tab: string) => void;
  valuationRows?: ValuationMBRow[];
  valuationBooks?: ValuationMBBook[];
  initialSource?: 'estimate' | 'valuation';
}

interface AbstractResourceRow {
  resource_id: number | string;
  name: string;
  category: 'Material' | 'Labor' | 'Equipment' | 'Transport';
  unit: string;
  total_quantity: number;
  unit_rate: number;
  total_cost: number;
  used_in_items: Array<{
    item_code: string;
    description: string;
    boq_quantity: number;
    boq_unit: string;
    qty_per_base_unit: number;
    norm_base_qty: number;
    subtotal_resource_qty: number;
  }>;
}

export const ResourceBreakdownView: React.FC<ResourceBreakdownViewProps> = ({
  project,
  norms,
  resources,
  selectedZone,
  selectedFY,
  onNavigateToTab,
  valuationRows = [],
  valuationBooks = [],
  initialSource = 'estimate'
}) => {
  const [breakdownSource, setBreakdownSource] = useState<'estimate' | 'valuation'>(initialSource);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'ALL' | 'Material' | 'Labor' | 'Equipment' | 'Transport'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedResourceId, setExpandedResourceId] = useState<number | string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Custom Headings, Metadata & Footings Provisions
  const [customTopHeadings, setCustomTopHeadings] = useState<Array<{ id: string; text: string }>>([
    { id: '1', text: project.header_config?.authority_name || "Sample City Authority" },
    { id: '2', text: project.header_config?.office_name || "Local Authority Office" },
    { id: '3', text: project.header_config?.office_address || "Sample City, Sample County" }
  ]);

  const [customMetadataFields, setCustomMetadataFields] = useState<Array<{ id: string; label: string; value: string }>>([
    { id: 'm1', label: 'Program / Project Name', value: project.title },
    { id: 'm2', label: 'Fiscal year', value: project.fiscal_year || selectedFY },
    { id: 'm3', label: 'Implementation Location', value: project.local_authority || 'Sample City -15' },
    { id: 'm4', label: 'Budget sub-head no.', value: project.budget_head_no || '' }
  ]);

  const [signatures, setSignatures] = useState<Array<{ id: string; title: string; designation: string }>>([
    { id: 's1', title: 'Prepared By', designation: 'Sub-Engineer' },
    { id: 's2', title: 'Checked By', designation: 'Engineer' },
    { id: 's3', title: 'Approved By', designation: 'Chief Administrative Officer' }
  ]);

  const [isHeaderFooterModalOpen, setIsHeaderFooterModalOpen] = useState<boolean>(false);

  // Listen to Ribbon events
  useEffect(() => {
    const handleSetSource = (e: any) => {
      const src = typeof e.detail === 'object' && e.detail?.source ? e.detail.source : e.detail;
      if (src === 'estimate' || src === 'valuation') {
        setBreakdownSource(src);
      }
    };
    const handleExportExcel = () => handleExportResourceExcel();
    const handleExportCSV = () => handleExportResourceCSV();
    const handlePrint = () => handlePrintResourceSheet();
    const handleOrientation = (e: any) => {
      const orient = typeof e.detail === 'object' && e.detail?.orientation ? e.detail.orientation : e.detail;
      if (orient === 'portrait' || orient === 'landscape') {
        setPrintOrientation(orient);
      }
    };

    window.addEventListener('uev:rb-set-source', handleSetSource);
    window.addEventListener('uev:rb-export-excel', handleExportExcel);
    window.addEventListener('uev:rb-export-csv', handleExportCSV);
    window.addEventListener('uev:rb-print', handlePrint);
    window.addEventListener('uev:rb-set-orientation', handleOrientation);

    return () => {
      window.removeEventListener('uev:rb-set-source', handleSetSource);
      window.removeEventListener('uev:rb-export-excel', handleExportExcel);
      window.removeEventListener('uev:rb-export-csv', handleExportCSV);
      window.removeEventListener('uev:rb-print', handlePrint);
      window.removeEventListener('uev:rb-set-orientation', handleOrientation);
    };
  }, []);

  // More Menu State
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Build the Quantity Breakdown Abstract across all BOQ items
  const resourceMap: { [key: string]: AbstractResourceRow } = {};

  project.items.forEach((boqItem) => {
    // Find matching norm specification
    const matchedNorm = norms.find((n) => n.item_id === boqItem.item_id || n.code === boqItem.item_code);

    if (matchedNorm && matchedNorm.resources) {
      let boqQty = Number(boqItem.estimated_quantity) || 0;
      
      if (breakdownSource === 'valuation') {
        const itemValRows = valuationRows.filter((r) => r.boq_item_id === boqItem.id);
        if (itemValRows.length > 0) {
          boqQty = itemValRows.reduce((sum, r) => sum + (Number(r.quantity_this_bill) ?? Number((r as any).quantity) ?? 0), 0);
        } else if ((boqItem as any).valuation_quantity !== undefined && (boqItem as any).valuation_quantity > 0) {
          boqQty = Number((boqItem as any).valuation_quantity);
        } else if ((boqItem as any).executed_quantity !== undefined && (boqItem as any).executed_quantity > 0) {
          boqQty = Number((boqItem as any).executed_quantity);
        } else if (boqItem.mb_rows && boqItem.mb_rows.length > 0) {
          boqQty = boqItem.mb_rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
        }
      }

      const baseNormQty = Number(matchedNorm.base_quantity) || 1;

      // Scale multiplier = Quantity / Norm Base Quantity
      const scaleFactor = boqQty / baseNormQty;

      matchedNorm.resources.forEach((normRes) => {
        const resId = normRes.resource_id;
        const resQtyForThisBOQ = normRes.quantity_per_base_unit * scaleFactor;
        const groupKey = String(normRes.resource_name || `RES-${resId || 'UNKNOWN'}`).toLowerCase().trim();

        // Determine rate from Resources Master using robust normalized matching
        const masterResObj = findMasterResource(normRes, resources);

        let effectiveRate = masterResObj ? masterResObj.default_rate : 0;
        let effectiveUnit = masterResObj ? masterResObj.unit : (normRes.unit_override || 'Unit');

        if (effectiveRate <= 0) {
          if (normRes.category === 'Labor') {
            effectiveRate = Math.round(1050 * selectedZone.labor_multiplier);
          } else if (normRes.category === 'Material') {
            effectiveRate = Math.round(850 * selectedZone.material_multiplier);
          } else if (normRes.category === 'Equipment') {
            effectiveRate = 2200;
          } else {
            effectiveRate = 500;
          }
        }

        if (!resourceMap[groupKey]) {
          const parsedResId = Number(resId);
          resourceMap[groupKey] = {
            resource_id: !isNaN(parsedResId) && parsedResId !== 0 ? parsedResId : (resId || `res_${groupKey}`),
            name: normRes.resource_name || (masterResObj ? masterResObj.name : `Resource #${resId}`),
            category: (normRes.category as any) || (masterResObj ? masterResObj.category : 'Material'),
            unit: effectiveUnit,
            total_quantity: 0,
            unit_rate: effectiveRate,
            total_cost: 0,
            used_in_items: []
          };
        }

        resourceMap[groupKey].total_quantity += resQtyForThisBOQ;
        resourceMap[groupKey].used_in_items.push({
          item_code: boqItem.item_code,
          description: boqItem.description,
          boq_quantity: boqQty,
          boq_unit: boqItem.unit,
          qty_per_base_unit: normRes.quantity_per_base_unit,
          norm_base_qty: baseNormQty,
          subtotal_resource_qty: Math.round(resQtyForThisBOQ * 1000) / 1000
        });
      });
    }
  });

  // Calculate final totals for each aggregated resource
  const aggregatedResources: AbstractResourceRow[] = Object.values(resourceMap).map((res) => {
    const roundedQty = Math.round(res.total_quantity * 1000) / 1000;
    const roundedCost = Math.round(roundedQty * res.unit_rate * 100) / 100;
    return {
      ...res,
      total_quantity: roundedQty,
      total_cost: roundedCost
    };
  });

  // Filter aggregated list
  const filteredResources = aggregatedResources.filter((res) => {
    const matchesSearch =
      String(res.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(res.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(res.unit || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeCategoryFilter === 'ALL') return true;
    return res.category === activeCategoryFilter;
  });

  // Summary Card Statistics
  const totalMaterialCost = aggregatedResources
    .filter((r) => r.category === 'Material')
    .reduce((acc, r) => acc + r.total_cost, 0);

  const totalLaborCost = aggregatedResources
    .filter((r) => r.category === 'Labor')
    .reduce((acc, r) => acc + r.total_cost, 0);

  const totalLaborMandays = aggregatedResources
    .filter((r) => r.category === 'Labor')
    .reduce((acc, r) => acc + r.total_quantity, 0);

  const totalEquipmentCost = aggregatedResources
    .filter((r) => r.category === 'Equipment')
    .reduce((acc, r) => acc + r.total_cost, 0);

  const grandDirectResourceCost = aggregatedResources.reduce((acc, r) => acc + r.total_cost, 0);

  // Download complete Resource Quantity Breakdown Sheet as CSV (without rate/amount)
  const handleExportResourceCSV = () => {
    if (aggregatedResources.length === 0) {
      alert('No resource data available to export. Ensure BOQ has items.');
      return;
    }

    let csvContent =
      'S.N.,Resource Name,Category,Unit,Total Project Quantity,Used in BOQ Items\n';

    aggregatedResources.forEach((res, index) => {
      const boqListStr = res.used_in_items.map((i) => `${i.item_code}`).join('; ');
      csvContent += `"${index + 1}","${res.name.replace(/"/g, '""')}","${res.category}","${res.unit}","${res.total_quantity}","${boqListStr}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Resource_Quantity_Breakdown_${selectedZone.name_en}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Resource Quantity Breakdown Sheet exported successfully!');
  };

  // Export Resource Quantity Breakdown to Excel (.xlsx) ready to print
  const handleExportResourceExcel = () => {
    if (aggregatedResources.length === 0) {
      alert('No resource data available to export.');
      return;
    }
    exportResourceBreakdownToExcel(aggregatedResources, project, selectedZone, selectedFY);
    showToast('Exported formatted Resource Breakdown to Excel (.xlsx) ready to print!');
  };

  const handlePrintResourceSheet = () => {
    if (aggregatedResources.length === 0) {
      alert('No resource data available to print.');
      return;
    }

    const topHeadingsHtml = customTopHeadings.map((h, idx) => `
      <div style="font-size: ${idx === 0 ? '16pt' : '12pt'}; font-weight: bold; color: #000;">${h.text}</div>
    `).join('');

    const metadataGridHtml = customMetadataFields.length > 0 ? `
      <table style="width: 100%; border: none !important; font-size: 10pt; margin-bottom: 12px;">
        ${Array.from({ length: Math.ceil(customMetadataFields.length / 2) }).map((_, rIdx) => {
          const f1 = customMetadataFields[rIdx * 2];
          const f2 = customMetadataFields[rIdx * 2 + 1];
          return `
            <tr style="border: none !important;">
              <td style="border: none !important; width: 50%;">
                ${f1 ? `<b>${f1.label}:</b> ${f1.value}` : ''}
              </td>
              <td style="border: none !important; width: 50%; text-align: right;">
                ${f2 ? `<b>${f2.label}:</b> ${f2.value}` : ''}
              </td>
            </tr>
          `;
        }).join('')}
      </table>
    ` : '';

    const customHeaderHtml = `
      <div style="text-align: center; font-family: sans-serif; margin-bottom: 16px;">
        ${topHeadingsHtml}
        <div style="font-size: 14pt; font-weight: bold; text-decoration: underline; color: #000; margin-top: 8px; margin-bottom: 12px;">
          ${breakdownSource === 'valuation' ? 'Quantity details of construction materials, labor and equipment as per valuation' : 'Quantity details of construction materials, labor and equipment as per estimate'}
        </div>
      </div>
      ${metadataGridHtml}
    `;

    let tableHtml = `<table border="1" cellpadding="6" cellspacing="0" class="print-table" style="width:100%; border-collapse: collapse; font-size: 9.5pt;">
      <thead>
        <tr style="background-color: #f1f5f9; text-align: center;">
          <th class="col-sn" style="border: 1px solid #000;">S.No.</th>
          <th class="col-desc" style="border: 1px solid #000;">Material / labor / equipment description</th>
          <th class="col-cat" style="border: 1px solid #000;">Category</th>
          <th class="col-unit" style="border: 1px solid #000;">Unit</th>
          <th class="col-qty" style="border: 1px solid #000;">Total quantity</th>
          <th class="col-used" style="border: 1px solid #000;">Project items used</th>
        </tr>
      </thead>
      <tbody>`;

    aggregatedResources.forEach((res, idx) => {
      const boqListStr = res.used_in_items
        .map((u) => `${u.item_code} (${u.subtotal_resource_qty} ${res.unit})`)
        .join('; ');

      tableHtml += `<tr>
        <td class="col-sn" style="text-align: center; border: 1px solid #000;">${idx + 1}</td>
        <td class="col-desc" style="border: 1px solid #000;"><b>${res.name}</b></td>
        <td class="col-cat" style="text-align: center; border: 1px solid #000;">${res.category}</td>
        <td class="col-unit" style="text-align: center; border: 1px solid #000;">${res.unit}</td>
        <td class="col-qty" style="text-align: right; border: 1px solid #000; color: #1e3a8a;"><b>${res.total_quantity.toFixed(2)}</b></td>
        <td class="col-used" style="font-size: 8.5pt; color: #334155; border: 1px solid #000;">${boqListStr}</td>
      </tr>`;
    });

    const sigsHtml = signatures.map(sig => `
      <td style="border: none !important; text-align: center; vertical-align: bottom; padding: 10px;">
        _______________________<br/>
        <b>${sig.title}</b><br/>
        <span style="font-size: 8pt; color: #444;">${sig.designation}</span>
      </td>
    `).join('');

    tableHtml += `</tbody></table>
    <div style="margin-top: 35px; page-break-inside: avoid;">
      <table style="width: 100%; border: none !important; font-size: 9.5pt;">
        <tr style="border: none !important; text-align: center;">
          ${sigsHtml}
        </tr>
      </table>
    </div>`;

    downloadPrintableHTML({
      title: 'Quantity details of construction materials, labor and equipment',
      projectTitle: project.title,
      zone: selectedZone.name_en,
      fiscalYear: selectedFY,
      customHeaderHtml,
      tableHtml,
      filename: `Resource_Breakdown_${project.title.replace(/\s+/g, '_')}`,
      orientation: printOrientation
    });
    showToast('Printable Resource Breakdown generated successfully!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2 border border-slate-700 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}



      {/* Summary KPI Cards (Quantity Only) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {/* Materials Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unique Materials</span>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5 font-mono">
              {aggregatedResources.filter((r) => r.category === 'Material').length} <span className="text-xs font-normal">Items</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Material components required
            </span>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Labor Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Labor Mandays</span>
            <div className="text-lg font-extrabold text-emerald-700 mt-0.5 font-mono">
              {totalLaborMandays.toLocaleString('ne-NP')} <span className="text-xs font-normal">Mandays</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              {aggregatedResources.filter((r) => r.category === 'Labor').length} labor categories
            </span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Equipment Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Equipment & Machinery</span>
            <div className="text-lg font-extrabold text-purple-700 mt-0.5 font-mono">
              {aggregatedResources.filter((r) => r.category === 'Equipment').length} <span className="text-xs font-normal">Machine Types</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Required tools & machinery
            </span>
          </div>
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        {/* Total Resource Count */}
        <div className="bg-white border border-indigo-200 rounded-2xl p-4 shadow-sm flex items-center justify-between bg-gradient-to-br from-indigo-50/40 to-white">
          <div>
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Total Resource Abstract</span>
            <div className="text-lg font-extrabold text-indigo-900 mt-0.5 font-mono">
              {aggregatedResources.length} <span className="text-xs font-normal">Total Lines</span>
            </div>
            <span className="text-[11px] text-indigo-600 font-medium">
              Across all project items
            </span>
          </div>
          <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold">
            <PieChart className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Category Pill Filters */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {(
              [
                { id: 'ALL', label: 'All Resources' },
                { id: 'Material', label: '📦 Materials' },
                { id: 'Labor', label: '👷 Labor' },
                { id: 'Equipment', label: '🚜 Equipment & Tools' },
                { id: 'Transport', label: '🚚 Transport & Freight' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategoryFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeCategoryFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search resource name or unit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Main Aggregated Resources Table */}
      {project.items.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No BOQ Items Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Add work items to the estimate to view aggregated material, labor, and equipment requirements.
            </p>
          </div>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('rate-analysis')}
              className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition"
            >
              Go to Rate Analysis Engine →
            </button>
          )}
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs">
          No resources match the selected category filter or search query.
        </div>
      ) : (
        <div className="bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-300">
              <thead className="bg-slate-800 text-white uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="p-3 w-12 text-center border border-slate-300">S.N.</th>
                  <th className="p-3 border border-slate-300">Resource Name & Specification</th>
                  <th className="p-3 w-28 text-center border border-slate-300">Category</th>
                  <th className="p-3 w-20 text-center border border-slate-300">Unit</th>
                  <th className="p-3 w-36 text-right border border-slate-300">Total Project Qty</th>
                  <th className="p-3 w-24 text-center border border-slate-300 print:hidden">Usage Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                {filteredResources.map((res, idx) => {
                  const isExpanded = expandedResourceId === res.resource_id;

                  return (
                    <React.Fragment key={`${res.resource_id}_${idx}`}>
                      <tr className="hover:bg-slate-50 transition">
                        <td className="p-3 text-center text-slate-500 font-mono border border-slate-300">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900 border border-slate-300">
                          {res.name}
                        </td>
                        <td className="p-3 text-center border border-slate-300">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              res.category === 'Material'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : res.category === 'Labor'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : res.category === 'Equipment'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {res.category}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600 border border-slate-300">{res.unit}</td>
                        <td className="p-3 text-right font-mono font-extrabold text-blue-700 text-sm border border-slate-300">
                          {res.total_quantity.toLocaleString('ne-NP')}
                        </td>
                        <td className="p-3 text-center border border-slate-300 print:hidden">
                          <button
                            onClick={() =>
                              setExpandedResourceId(isExpanded ? null : res.resource_id)
                            }
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 mx-auto"
                          >
                            <span>{res.used_in_items.length} Items</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* Nested Usage Details Breakdown */}
                      {isExpanded && (
                        <tr className="print:hidden">
                          <td colSpan={6} className="p-4 bg-slate-50 border border-slate-300">
                            <div className="bg-white border border-slate-300 rounded-xl p-3 space-y-2">
                              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                                BOQ Item Breakdown for <strong>{res.name}</strong>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse border border-slate-300">
                                  <thead className="bg-slate-100 text-slate-600 uppercase text-[9px] font-bold">
                                    <tr>
                                      <th className="p-2 border border-slate-300">Item Code</th>
                                      <th className="p-2 border border-slate-300">BOQ Work Description</th>
                                      <th className="p-2 text-right border border-slate-300">BOQ Quantity</th>
                                      <th className="p-2 text-right border border-slate-300">Norm Coeff / Unit</th>
                                      <th className="p-2 text-right border border-slate-300">Subtotal Resource Qty</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-mono">
                                    {res.used_in_items.map((it, iIdx) => (
                                      <tr key={iIdx} className="hover:bg-slate-50">
                                        <td className="p-2 font-bold text-indigo-700 border border-slate-300">{it.item_code}</td>
                                        <td className="p-2 font-sans font-medium text-slate-800 border border-slate-300">{it.description}</td>
                                        <td className="p-2 text-right text-slate-700 border border-slate-300">
                                          {it.boq_quantity.toLocaleString('ne-NP')} {it.boq_unit}
                                        </td>
                                        <td className="p-2 text-right text-slate-500 border border-slate-300">
                                          {it.qty_per_base_unit} / {it.norm_base_qty} {it.boq_unit}
                                        </td>
                                        <td className="p-2 text-right font-bold text-blue-700 border border-slate-300">
                                          {it.subtotal_resource_qty.toLocaleString('ne-NP')} {res.unit}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-bold text-xs text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className="p-3 text-right uppercase border border-slate-300">
                    Total Resource Lines in Project Abstract:
                  </td>
                  <td className="p-3 text-right font-mono font-extrabold text-blue-800 text-base border border-slate-300">
                    {aggregatedResources.length} Items
                  </td>
                  <td className="border border-slate-300 print:hidden"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Custom Headings & Footings Modal */}
      {isHeaderFooterModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>✏️ Custom Headings & Footings</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customize printable report top headings, project metadata, and signature blocks.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsHeaderFooterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Section 1: Top Header Lines */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
 1. Top Office Headings
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setCustomTopHeadings([
                      ...customTopHeadings,
                      { id: Date.now().toString(), text: 'New Heading' }
                    ])
                  }
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 cursor-pointer"
                >
                  + Add Heading Line
                </button>
              </div>
              <div className="space-y-2">
                {customTopHeadings.map((h, idx) => (
                  <div key={h.id} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 w-5 text-right">{idx + 1}.</span>
                    <input
                      type="text"
                      value={h.text}
                      onChange={(e) => {
                        const next = [...customTopHeadings];
                        next[idx].text = e.target.value;
                        setCustomTopHeadings(next);
                      }}
                      className="flex-1 text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {customTopHeadings.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setCustomTopHeadings(customTopHeadings.filter((item) => item.id !== h.id))}
                        className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1.5 rounded bg-red-50 hover:bg-red-100 cursor-pointer"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Metadata Fields */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
 2. Project Metadata Grid
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setCustomMetadataFields([
                      ...customMetadataFields,
                      { id: Date.now().toString(), label: 'Label', value: 'Value' }
                    ])
                  }
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 cursor-pointer"
                >
                  + Add Metadata Field
                </button>
              </div>
              <div className="space-y-2">
                {customMetadataFields.map((f, idx) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={f.label}
                      placeholder="Label (e.g.)"
                      onChange={(e) => {
                        const next = [...customMetadataFields];
                        next[idx].label = e.target.value;
                        setCustomMetadataFields(next);
                      }}
                      className="w-1/2 text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={f.value}
                      placeholder="Value"
                      onChange={(e) => {
                        const next = [...customMetadataFields];
                        next[idx].value = e.target.value;
                        setCustomMetadataFields(next);
                      }}
                      className="w-1/2 text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomMetadataFields(customMetadataFields.filter((item) => item.id !== f.id))}
                      className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1.5 rounded bg-red-50 hover:bg-red-100 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Signature Footers */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
 3. Signature Footings
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSignatures([
                      ...signatures,
                      { id: Date.now().toString(), title: 'Role', designation: 'Designation' }
                    ])
                  }
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 cursor-pointer"
                >
                  + Add Signature Block
                </button>
              </div>
              <div className="space-y-2">
                {signatures.map((s, idx) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={s.title}
                      placeholder="Title (e.g.)"
                      onChange={(e) => {
                        const next = [...signatures];
                        next[idx].title = e.target.value;
                        setSignatures(next);
                      }}
                      className="w-1/2 text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={s.designation}
                      placeholder="Designation (e.g.)"
                      onChange={(e) => {
                        const next = [...signatures];
                        next[idx].designation = e.target.value;
                        setSignatures(next);
                      }}
                      className="w-1/2 text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setSignatures(signatures.filter((item) => item.id !== s.id))}
                      className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1.5 rounded bg-red-50 hover:bg-red-100 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsHeaderFooterModalOpen(false);
                  showToast('Headings and Footings saved for printable report!');
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
              >
                Save Headings & Footings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
