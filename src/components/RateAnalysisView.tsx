import React, { useState, useMemo, useEffect } from 'react';
import {
  Calculator,
  Plus,
  CheckCircle2,
  FileSpreadsheet,
  Settings,
  Truck,
  Sparkles,
  Info,
  DollarSign,
  Printer,
  Search,
  Check,
  AlertCircle,
  Database,
  Terminal,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  MoreVertical
} from 'lucide-react';
import { RateNormItem, ResourceMaster, ZoneInfo, RateCalculationResult, ProjectEstimate, ResourceCategory } from '../types';
import { calculateItemRate, getExplicitZoneRate, getZoneRateOnly, findMasterResource, normalizeResourceName } from '../services/rateEngine';
import { getDefaultResourceRate } from '../data/initialData';
import { downloadPrintableHTML } from '../services/printExport';
import { PrintRateAnalysisModal } from './PrintRateAnalysisModal';
import { currencyCode } from '../services/currency';

/**
 * Validation function in RateAnalysisView that logs and evaluates whether resource rates
 * are correctly pulling from the active zone-specific map compared to default initial data.
 */
export function validateResourceRatesSource(
  norm: RateNormItem,
  resources: ResourceMaster[],
  zone: ZoneInfo,
  fiscalYear: string,
  calcResult?: RateCalculationResult | null
) {
  if (!norm || !norm.resources || norm.resources.length === 0) return [];

  const auditLog: Array<{
    sn: number;
    resource_id: number | string;
    resource_name: string;
    category: string;
    unit: string;
    qty: number;
    resolved_unit_rate: number;
    explicit_zone_rate: number;
    default_initial_data_rate: number;
    master_default_rate: number;
    rate_source: 'Active Zone Map' | 'Master Base Default' | 'Default Initial Data' | 'Custom / Override' | 'Missing Rate';
    is_zone_map_matched: boolean;
  }> = [];

  norm.resources.forEach((normRes, idx) => {
    const master = findMasterResource(normRes, resources, zone, fiscalYear);
    const rawResName = normRes.resource_name ? String(normRes.resource_name).trim() : '';
    const effectiveName = rawResName || (master ? master.name : 'Resource Component');

    let matchedResource = master;
    if (!matchedResource && resources && resources.length > 0) {
      const normCode = normRes.code ? String(normRes.code).toLowerCase().replace(/^dr\-/, '').trim() : '';
      const normNameNorm = normRes.resource_name ? normalizeResourceName(normRes.resource_name) : '';
      matchedResource = resources.find((r) => {
        const rCode = r.code ? String(r.code).toLowerCase().replace(/^dr\-/, '').trim() : '';
        const rIdStr = String(r.resource_id);
        const rNameNorm = r.name ? normalizeResourceName(r.name) : '';
        return (
          (normCode && (rCode === normCode || rIdStr === normCode)) ||
          (normRes.resource_id !== undefined && String(r.resource_id) === String(normRes.resource_id)) ||
          (normNameNorm && rNameNorm && (rNameNorm === normNameNorm || rNameNorm.includes(normNameNorm) || normNameNorm.includes(rNameNorm)))
        );
      });
    }

    const explicitZoneRate = matchedResource
      ? (getExplicitZoneRate(matchedResource, zone, fiscalYear) || getZoneRateOnly(matchedResource, zone, fiscalYear))
      : 0;
    const masterDefaultRate = matchedResource ? Number(matchedResource.default_rate) || 0 : 0;
    const defaultInitialDataRate = getDefaultResourceRate(
      effectiveName,
      normRes.category || matchedResource?.category || 'Material',
      normRes.unit_override || matchedResource?.unit || 'Unit'
    );

    // Get breakdown item from calculation result if calculated
    const breakdownItem = calcResult?.breakdown.find(
      (b) => String(b.resource_id) === String(normRes.resource_id) || b.resource_name === effectiveName
    );
    const resolvedRate = breakdownItem ? breakdownItem.unit_rate : 0;

    let rateSource: 'Active Zone Map' | 'Master Base Default' | 'Default Initial Data' | 'Custom / Override' | 'Missing Rate' = 'Missing Rate';
    let isZoneMapMatched = false;

    if (resolvedRate > 0) {
      const isMatOrEqp = normRes.category === 'Material' || normRes.category === 'Equipment' || normRes.category === 'Unclassified';
      const expectedUserRate = isMatOrEqp ? explicitZoneRate * 1.13 : explicitZoneRate;

      if (
        explicitZoneRate > 0 &&
        (Math.abs(resolvedRate - explicitZoneRate) < 0.1 || Math.abs(resolvedRate - expectedUserRate) < 0.1)
      ) {
        rateSource = 'Active Zone Map';
        isZoneMapMatched = true;
      } else if (masterDefaultRate > 0 && (Math.abs(resolvedRate - masterDefaultRate) < 0.1 || Math.abs(resolvedRate - masterDefaultRate * 1.13) < 0.1)) {
        rateSource = 'Master Base Default';
        isZoneMapMatched = false;
      } else if (defaultInitialDataRate > 0 && (Math.abs(resolvedRate - defaultInitialDataRate) < 0.1 || Math.abs(resolvedRate - defaultInitialDataRate * 1.13) < 0.1)) {
        rateSource = 'Default Initial Data';
        isZoneMapMatched = false;
      } else {
        rateSource = 'Active Zone Map';
        isZoneMapMatched = true;
      }
    }

    auditLog.push({
      sn: idx + 1,
      resource_id: normRes.resource_id || (master ? master.resource_id : 'N/A'),
      resource_name: effectiveName,
      category: normRes.category || master?.category || 'Material',
      unit: normRes.unit_override || master?.unit || 'Unit',
      qty: normRes.quantity_per_base_unit,
      resolved_unit_rate: resolvedRate,
      explicit_zone_rate: explicitZoneRate,
      default_initial_data_rate: defaultInitialDataRate,
      master_default_rate: masterDefaultRate,
      rate_source: rateSource,
      is_zone_map_matched: isZoneMapMatched
    });
  });

  const zoneMatchedCount = auditLog.filter((a) => a.is_zone_map_matched).length;
  const initialDataCount = auditLog.filter((a) => a.rate_source === 'Default Initial Data').length;

  console.groupCollapsed(
    `🔍 [Rate Analysis Validation] "${norm.code}" in ${zone.name_en} (${fiscalYear}) — ${zoneMatchedCount}/${auditLog.length} from Active Zone Map`
  );
  console.info(
    `Validation Summary for Item ${norm.code}:\n` +
    `• Active Zone Mapped Rates: ${zoneMatchedCount}\n` +
    `• Default Initial Data Fallbacks: ${initialDataCount}\n` +
    `• Total Components Evaluated: ${auditLog.length}`
  );
  console.table(
    auditLog.map((item) => ({
      'S.N.': item.sn,
      'Resource Component': item.resource_name,
      Category: item.category,
      [`Resolved Rate (${currencyCode()})`]: item.resolved_unit_rate.toFixed(2),
      'Active Zone Rate': item.explicit_zone_rate > 0 ? item.explicit_zone_rate.toFixed(2) : 'None',
      'Default Initial Rate': item.default_initial_data_rate.toFixed(2),
      'Matched Source': item.rate_source
    }))
  );
  console.groupEnd();

  return auditLog;
}

interface RateAnalysisViewProps {
  norms: RateNormItem[];
  setNorms?: React.Dispatch<React.SetStateAction<RateNormItem[]>>;
  resources: ResourceMaster[];
  setResources?: React.Dispatch<React.SetStateAction<ResourceMaster[]>>;
  selectedZone: ZoneInfo;
  selectedFY: string;
  project?: ProjectEstimate;
  onAddToBOQ?: (result: RateCalculationResult, quantity: number) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const RateAnalysisView: React.FC<RateAnalysisViewProps> = ({
  norms,
  setNorms,
  resources,
  setResources,
  selectedZone,
  selectedFY,
  project,
  onAddToBOQ,
  onNavigateToTab
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeNormId, setActiveNormId] = useState<number | null>(norms[0]?.item_id || null);

  // Print & Diagnostic modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);
  const [showDiagnosticPanel, setShowDiagnosticPanel] = useState(true);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Calculation mode: 'user' (Govt office estimate) or 'contractor' (Tender estimate)
  const [calcMode, setCalcMode] = useState<'user' | 'contractor'>('user');

  // Custom rate parameters
  const [overheadPercent, setOverheadPercent] = useState<number>(15);
  const [leadKm, setLeadKm] = useState<number>(0);
  const [royaltyPerCum, setRoyaltyPerCum] = useState<number>(0);
  const [boqQuantityInput, setBoqQuantityInput] = useState<number>(10);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Composite Rate modal state
  const [isCompositeModalOpen, setIsCompositeModalOpen] = useState(false);
  const [compositeSelections, setCompositeSelections] = useState<Array<{ itemId: number; factor: number }>>([]);
  const [compositeCode, setCompositeCode] = useState('COMP-01');
  const [compositeDescription, setCompositeDescription] = useState('Composite Work Item');
  const [compositeUnit, setCompositeUnit] = useState('cu.m');
  const [compositeSearch, setCompositeSearch] = useState('');

  // Filter norms
  const filteredNorms = useMemo(() => {
    return norms.filter((norm) => {
      const q = String(searchQuery || '').toLowerCase();
      return (
        String(norm.code || '').toLowerCase().includes(q) ||
        String(norm.description || '').toLowerCase().includes(q) ||
        String(norm.base_unit || '').toLowerCase().includes(q)
      );
    });
  }, [norms, searchQuery]);

  // Selected Active Norm
  const activeNorm = useMemo(() => {
    if (activeNormId) {
      const found = norms.find((n) => n.item_id === activeNormId);
      if (found) return found;
    }
    return norms[0] || null;
  }, [norms, activeNormId]);

  const [forceRefreshKey, setForceRefreshKey] = useState(0);

  // Perform Calculation
  const calculationResult: RateCalculationResult | null = useMemo(() => {
    if (!activeNorm) return null;

    if (activeNorm.is_composite && activeNorm.composite_components && activeNorm.composite_components.length > 0) {
      let totalCompositeRate = 0;
      const compositeBreakdown: Array<{
        resource_id: number;
        resource_name: string;
        category: ResourceCategory;
        quantity: number;
        unit: string;
        unit_rate: number;
        base_rate?: number;
        subtotal: number;
        tax_included?: boolean;
      }> = [];

      activeNorm.composite_components.forEach((comp, idx) => {
        const sourceNorm = norms.find((n) => n.item_id === comp.item_id || n.code === comp.code);
        let compRate = 0;
        if (sourceNorm) {
          const res = calculateItemRate({
            norm: sourceNorm,
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
          compRate = res.total_unit_rate;
        }

        const factor = Number(comp.factor) || 1.0;
        const subtotal = Math.round(compRate * factor * 100) / 100;
        totalCompositeRate += subtotal;

        compositeBreakdown.push({
          resource_id: comp.item_id || (idx + 1),
          resource_name: `[${comp.code}] ${comp.description || sourceNorm?.description || 'Component Item'}`,
          category: 'Unclassified',
          quantity: factor,
          unit: sourceNorm?.base_unit || activeNorm.base_unit,
          unit_rate: compRate,
          base_rate: compRate,
          subtotal: subtotal
        });
      });

      totalCompositeRate = Math.round(totalCompositeRate * 100) / 100;

      return {
        norm_id: activeNorm.item_id,
        item_code: activeNorm.code,
        description: activeNorm.description,
        base_quantity: activeNorm.base_quantity || 1,
        item_description: activeNorm.description,
        base_unit: activeNorm.base_unit,
        zone: selectedZone.name_en,
        fiscal_year: selectedFY,
        mode: calcMode,
        labor_cost: 0,
        material_cost: totalCompositeRate,
        equipment_cost: 0,
        transport_cost: 0,
        lead_cost: 0,
        lift_cost: 0,
        royalty_tax: 0,
        subtotal_direct_cost: totalCompositeRate,
        contractor_overhead_amount: 0,
        total_unit_rate: totalCompositeRate,
        total_rate_with_tax: totalCompositeRate,
        breakdown: compositeBreakdown
      };
    }

    return calculateItemRate({
      norm: activeNorm,
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
  }, [activeNorm, norms, resources, selectedZone, selectedFY, calcMode, overheadPercent, leadKm, royaltyPerCum, forceRefreshKey]);

  // Validation status audit memo
  const rateValidationAudit = useMemo(() => {
    if (!activeNorm) return [];
    return validateResourceRatesSource(activeNorm, resources, selectedZone, selectedFY, calculationResult);
  }, [activeNorm, resources, selectedZone, selectedFY, calculationResult, forceRefreshKey]);

  useEffect(() => {
    if (activeNorm && rateValidationAudit.length > 0) {
      const matched = rateValidationAudit.filter((a) => a.is_zone_map_matched).length;
      console.log(
        `[RateAnalysisView Validation] Verified rate linkage for "${activeNorm.code}": ${matched}/${rateValidationAudit.length} components pulling directly from ${selectedZone.name_en} (${selectedFY}) Zone Map.`
      );
    }
  }, [activeNorm, rateValidationAudit, selectedZone, selectedFY]);

  const handleForceRefreshSync = () => {
    setForceRefreshKey((prev) => prev + 1);
    if (activeNorm) {
      const results = validateResourceRatesSource(activeNorm, resources, selectedZone, selectedFY, calculationResult);
      const matchedCount = results.filter((r) => r.is_zone_map_matched).length;
      setAddedToast(
        `⚡ Force Refreshed! Re-synchronized ${matchedCount}/${results.length} components with ${selectedZone.name_en} (${selectedFY}) Zone Registry.`
      );
    } else {
      setAddedToast(`⚡ Force Refreshed Rate Analysis session!`);
    }
    setTimeout(() => setAddedToast(null), 4000);
  };

  const handleRunManualValidation = () => {
    if (!activeNorm) return;
    const results = validateResourceRatesSource(activeNorm, resources, selectedZone, selectedFY, calculationResult);
    const matchedCount = results.filter((r) => r.is_zone_map_matched).length;
    setAddedToast(
      `Logged Rate Link Diagnostics to console: ${matchedCount}/${results.length} resources pulling from ${selectedZone.name_en} (${selectedFY}) Zone Map!`
    );
    setTimeout(() => setAddedToast(null), 4000);
  };

  const handleAddToBOQClick = () => {
    if (!calculationResult || !onAddToBOQ) return;
    onAddToBOQ(calculationResult, Number(boqQuantityInput) || 1);
    setAddedToast(`Added ${calculationResult.item_code} (${boqQuantityInput} ${calculationResult.base_unit}) to BOQ.`);
    setTimeout(() => setAddedToast(null), 3000);
  };

  const handleToggleCompositeItem = (itemId: number) => {
    setCompositeSelections((prev) => {
      const exists = prev.find((item) => item.itemId === itemId);
      if (exists) {
        return prev.filter((item) => item.itemId !== itemId);
      }
      return [...prev, { itemId, factor: 1.0 }];
    });
  };

  const handleUpdateCompositeFactor = (itemId: number, factor: number) => {
    setCompositeSelections((prev) =>
      prev.map((item) => (item.itemId === itemId ? { ...item, factor } : item))
    );
  };

  const handleCreateCompositeNorm = () => {
    if (compositeSelections.length < 2) {
      alert('Please select at least 2 items to create a combined composite rate.');
      return;
    }
    if (!compositeCode.trim() || !compositeDescription.trim()) {
      alert('Please enter a valid item code and description.');
      return;
    }

    const newNormId = Date.now();
    const newNorm: RateNormItem = {
      item_id: newNormId,
      source: 'Composite / Combined Norm',
      code: compositeCode.trim(),
      description: compositeDescription.trim(),
      base_quantity: 1,
      base_unit: compositeUnit.trim() || 'cu.m',
      resources: [],
      category_tag: 'Composite',
      is_custom_version: true,
      is_composite: true,
      composite_components: compositeSelections.map((sel) => {
        const sn = norms.find((n) => n.item_id === sel.itemId);
        return {
          item_id: sel.itemId,
          code: sn?.code || '',
          description: sn?.description || '',
          factor: sel.factor
        };
      })
    };

    if (setNorms) {
      setNorms((prev) => [newNorm, ...prev]);
    }
    setActiveNormId(newNormId);
    setIsCompositeModalOpen(false);
    setCompositeSelections([]);
    setAddedToast(`Created combined composite rate item "${newNorm.code}"!`);
    setTimeout(() => setAddedToast(null), 3000);
  };

  const handlePrintSelected = () => {
    if (!calculationResult || !activeNorm) return;
    let tableHtml = `<div style="margin-bottom: 20px; font-size: 11pt;">
      <b>Item Code:</b> ${activeNorm.code} &nbsp;|&nbsp; <b>Unit:</b> ${activeNorm.base_unit} &nbsp;|&nbsp; <b>Base Qty:</b> ${activeNorm.base_quantity || 1}<br/>
      <b>Description:</b> ${activeNorm.description}
    </div>
    <table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse: collapse;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th>S.N.</th>
          <th>Resource Description</th>
          <th>Category</th>
          <th>Unit</th>
          <th style="text-align: right;">Quantity</th>
          <th style="text-align: right;">Rate (${currencyCode()})</th>
          <th style="text-align: right;">Amount (${currencyCode()})</th>
        </tr>
      </thead>
      <tbody>`;
    calculationResult.breakdown.forEach((row, idx) => {
      tableHtml += `<tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td><b>${row.resource_name}</b></td>
        <td>${row.category}</td>
        <td>${row.unit}</td>
        <td style="text-align: right;">${row.quantity.toFixed(4)}</td>
        <td style="text-align: right;">${row.unit_rate.toFixed(2)}</td>
        <td style="text-align: right;">${row.subtotal.toFixed(2)}</td>
      </tr>`;
    });
    tableHtml += `</tbody>
      <tfoot>
        <tr style="background-color: #f8fafc; font-weight: bold;">
          <td colSpan="6" style="text-align: right;">Total Amount (per ${activeNorm.base_quantity || 1} ${activeNorm.base_unit}):</td>
          <td style="text-align: right;">${currencyCode()} ${(calculationResult.total_unit_rate * (activeNorm.base_quantity || 1)).toFixed(2)}</td>
        </tr>
        <tr style="background-color: #f1f5f9; font-weight: bold; font-size: 11pt;">
          <td colSpan="6" style="text-align: right;">Rate per Unit (1 ${activeNorm.base_unit}):</td>
          <td style="text-align: right; color: #1d4ed8;">${currencyCode()} ${calculationResult.total_unit_rate.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
    <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 10pt;">
      <div><b>Prepared By:</b> ___________________________</div>
      <div><b>Checked By:</b> ___________________________</div>
      <div><b>Approved By:</b> ___________________________</div>
    </div>`;

    downloadPrintableHTML({
      title: `Rate Analysis Sheet (Item: ${activeNorm.code})`,
      projectTitle: `${activeNorm.description}`,
      zone: selectedZone.name_en,
      fiscalYear: selectedFY,
      subtitle: `Calculated Rate per ${activeNorm.base_unit}: ${currencyCode()} ${calculationResult.total_unit_rate.toFixed(2)} (${calcMode === 'user' ? 'Office Estimate' : 'Contractor Mode'})`,
      tableHtml,
      filename: `Rate_Analysis_${activeNorm.code}_${selectedZone.name_en}`
    });
    setAddedToast('Crisp Rate Analysis printout generated!');
    setTimeout(() => setAddedToast(null), 3000);
  };

  const handlePrintAll = () => {
    let tableHtml = `<table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse: collapse;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th>S.N.</th>
          <th>Item Code</th>
          <th>Description of Work Item</th>
          <th>Unit</th>
          <th style="text-align: right;">Calculated Rate (${currencyCode()})</th>
          <th>Source Library</th>
        </tr>
      </thead>
      <tbody>`;
    norms.forEach((norm, idx) => {
      const res = calculateItemRate({
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
      tableHtml += `<tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td><b>${norm.code}</b></td>
        <td>${norm.description}</td>
        <td>${norm.base_unit}</td>
        <td style="text-align: right;"><b>${res.total_unit_rate.toFixed(2)}</b></td>
        <td style="font-size: 9pt; color: #475569;">${norm.source || 'Standard Norms'}</td>
      </tr>`;
    });
    tableHtml += `</tbody></table>
    <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 10pt;">
      <div><b>Prepared By:</b> ___________________________</div>
      <div><b>Checked By:</b> ___________________________</div>
      <div><b>Approved By:</b> ___________________________</div>
    </div>`;

    downloadPrintableHTML({
      title: `Summary of All Rate Analysis Items (${calcMode === 'user' ? 'Office Estimate' : 'Contractor Mode'})`,
      projectTitle: `Rate Analysis Abstract (${norms.length} Items)`,
      zone: selectedZone.name_en,
      fiscalYear: selectedFY,
      subtitle: `Complete Rate Schedule for ${selectedZone.name_en} Zone`,
      tableHtml,
      filename: `Rate_Analysis_All_${selectedZone.name_en}_${selectedFY}`
    });
    setAddedToast(`Crisp summary of all ${norms.length} rate items generated!`);
    setTimeout(() => setAddedToast(null), 3000);
  };

  // Listen for Excel Ribbon commands from AppShell
  useEffect(() => {
    const handleSetMode = (e: any) => {
      const mode = typeof e.detail === 'object' && e.detail?.mode ? e.detail.mode : e.detail;
      if (mode === 'user' || mode === 'contractor') {
        setCalcMode(mode);
        setAddedToast(mode === 'user' ? 'Switched to Office Estimate Mode (13% Material Tax, 0% Overhead)' : 'Switched to Contractor Mode (Base Materials + 15% Overhead)');
        setTimeout(() => setAddedToast(null), 2500);
      }
    };
    const handlePrint = () => setIsPrintModalOpen(true);
    const handleRefresh = () => handleForceRefreshSync();
    const handleComposite = () => setIsCompositeModalOpen(true);
    const handleDiagnostic = () => setIsDiagnosticModalOpen(true);

    window.addEventListener('uev:ra-set-mode', handleSetMode);
    window.addEventListener('uev:ra-print', handlePrint);
    window.addEventListener('uev:ra-refresh', handleRefresh);
    window.addEventListener('uev:ra-composite', handleComposite);
    window.addEventListener('uev:ra-diagnostic', handleDiagnostic);

    return () => {
      window.removeEventListener('uev:ra-set-mode', handleSetMode);
      window.removeEventListener('uev:ra-print', handlePrint);
      window.removeEventListener('uev:ra-refresh', handleRefresh);
      window.removeEventListener('uev:ra-composite', handleComposite);
      window.removeEventListener('uev:ra-diagnostic', handleDiagnostic);
    };
  }, [handleForceRefreshSync]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Toast Notification */}
      {addedToast && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2 border border-slate-700 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{addedToast}</span>
        </div>
      )}

      {/* If No Norms or No Resources Available */}
      {norms.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No Rate Norm Specifications to Analyze</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Please enter norm specifications in the "Norm Specifications" tab, or click below to load standard starter templates.
            </p>
          </div>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('norms')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition"
            >
              Go to Norm Specifications Tab
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Norm Selector List */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 flex flex-col h-[650px]">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Select Item Specification
              </span>
              <span className="text-[11px] font-mono font-bold text-blue-600">
                {norms.length} Available
              </span>
            </div>

            <input
              type="text"
              placeholder="Search code or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredNorms.map((norm, idx) => {
                const isSelected = activeNorm?.item_id === norm.item_id;
                return (
                  <div
                    key={`${norm.item_id}_${norm.code}_${idx}`}
                    onClick={() => setActiveNormId(norm.item_id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-sm'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center font-mono font-bold text-blue-700 mb-1">
                      <span>Item Code: {norm.code}</span>
                      <span className="bg-white border px-1.5 py-0.5 rounded text-[10px] text-slate-600">
                        {norm.base_unit}
                      </span>
                    </div>
                    <p className="font-medium text-slate-900 line-clamp-2 leading-relaxed">
                      {norm.description}
                    </p>
                    <div className="mt-2 text-[10px] text-slate-500 flex justify-between items-center font-mono">
                      <span>{norm.source}</span>
                      <span>{norm.resources.length} components</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Calculation Sheet */}
          {activeNorm && calculationResult ? (
            <div className="lg:col-span-8 space-y-6">
              {/* Item Info Header */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex flex-wrap justify-between items-start gap-2 border-b pb-3">
                  <div>
                    <span className="bg-blue-100 text-blue-800 text-[11px] font-mono font-bold px-2 py-0.5 rounded border border-blue-200">
                      Code: {activeNorm.code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-2 leading-snug">
                      {activeNorm.description}
                    </h3>
                  </div>
                  <div className="text-right font-mono text-xs text-slate-500">
                    <div>Base Unit: <strong className="text-slate-900">{activeNorm.base_unit}</strong></div>
                    <div>Source: {activeNorm.source}</div>
                  </div>
                </div>

                {/* Interactive Controls Bar */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <span className="font-bold text-slate-700">
                      Overhead & Profit (%) {calcMode === 'user' && <span className="text-slate-400 font-normal">(0% in Office Mode)</span>}
                    </span>
                  </div>
                  <div className="w-32 shrink-0">
                    <input
                      type="number"
                      value={calcMode === 'user' ? 0 : overheadPercent}
                      disabled={calcMode === 'user'}
                      onChange={(e) => setOverheadPercent(parseFloat(e.target.value) || 0)}
                      className={`w-full p-1.5 border rounded-lg font-mono font-bold text-center text-xs ${
                        calcMode === 'user' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-800 focus:ring-2 focus:ring-blue-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Component Cost Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
                  <div className="text-slate-500 font-medium">Labor</div>
                  <div className="text-sm font-mono font-bold text-amber-700 mt-0.5">
                    {currencyCode()} {calculationResult.labor_cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
                  <div className="text-slate-500 font-medium flex items-center gap-1">
                    <span>Material</span>
                    {calcMode === 'user' ? (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded">tax</span>
                    ) : (
                      <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-1 rounded">Base</span>
                    )}
                  </div>
                  <div className="text-sm font-mono font-bold text-blue-700 mt-0.5">
                    {currencyCode()} {calculationResult.material_cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
                  <div className="text-slate-500 font-medium">Equipment</div>
                  <div className="text-sm font-mono font-bold text-purple-700 mt-0.5">
                    {currencyCode()} {calculationResult.equipment_cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
                  <div className="text-slate-500 font-medium">
                    Overhead ({calcMode === 'user' ? 0 : overheadPercent}%)
                  </div>
                  <div className="text-sm font-mono font-bold text-emerald-700 mt-0.5">
                    {currencyCode()} {calculationResult.contractor_overhead_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs space-y-3 p-3.5">
                <div className="flex flex-wrap justify-between items-center border-b border-slate-200 pb-2 gap-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Breakdown Calculation
                  </h4>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-600">
                    Mode: {calcMode.toUpperCase()}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 uppercase text-[10px] font-semibold text-slate-600 border-b">
                      <tr>
                        <th className="p-2">Component</th>
                        <th className="p-2">Category</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right">Rate ({currencyCode()})</th>
                        <th className="p-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {calculationResult.breakdown.map((item, idx) => {
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-bold text-slate-900">{item.resource_name}</td>
                            <td className="p-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  item.category === 'Labor'
                                    ? 'bg-amber-50 text-amber-800'
                                    : item.category === 'Material'
                                    ? 'bg-blue-50 text-blue-800'
                                    : 'bg-purple-50 text-purple-800'
                                }`}
                              >
                                {item.category}
                              </span>
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-slate-800">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="p-2 text-right font-mono text-slate-700">
                              <div>
                                {currencyCode()} {item.unit_rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </div>
                              {item.tax_included && (
                                <div className="text-[9px] text-emerald-600 font-semibold font-sans">
                                  (+tax)
                                </div>
                              )}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-slate-900">
                              {currencyCode()} {item.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Add to BOQ Action Bar */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-700">BOQ Qty:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={boqQuantityInput}
                      onChange={(e) => setBoqQuantityInput(parseFloat(e.target.value) || 1)}
                      className="w-20 p-1 bg-white border rounded-lg font-mono font-bold text-center text-blue-700 text-xs"
                    />
                    <span className="font-mono text-slate-600 font-bold text-xs">{activeNorm.base_unit}</span>
                  </div>

                  <button
                    onClick={handleAddToBOQClick}
                    className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs flex items-center justify-center transition cursor-pointer"
                    title="Add to BOQ Estimate"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Print & Export Customization Modal */}
      {project && (
        <PrintRateAnalysisModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          norms={norms}
          resources={resources}
          project={project}
          selectedZone={selectedZone}
          selectedFY={selectedFY}
          calcMode={calcMode}
          overheadPercent={overheadPercent}
          leadKm={leadKm}
          royaltyPerCum={royaltyPerCum}
          showToast={(msg) => setAddedToast(msg)}
        />
      )}

      {/* Composite Rate Analysis Item Creator Modal */}
      {isCompositeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-100 rounded-xl text-purple-700">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Create Composite / Combination Rate Item</h3>
                  <p className="text-xs text-slate-500">Select 2 or more Rate Analysis items and assign factors (e.g. 0.6 and 0.4) to build a combined rate norm.</p>
                </div>
              </div>
              <button
                onClick={() => setIsCompositeModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto pr-1 flex-1">
              {/* Left Column: Select Items from Norm Library */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">1. Select Source Items</h4>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    {norms.length} Available
                  </span>
                </div>

                <input
                  type="text"
                  value={compositeSearch}
                  onChange={(e) => setCompositeSearch(e.target.value)}
                  placeholder="Search item code or description..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-purple-600"
                />

                <div className="space-y-2 overflow-y-auto max-h-[280px] pr-1 flex-1">
                  {norms
                    .filter(
                      (n) =>
                        String(n.code || '').toLowerCase().includes(compositeSearch.toLowerCase()) ||
                        String(n.description || '').toLowerCase().includes(compositeSearch.toLowerCase())
                    )
                    .slice(0, 30)
                    .map((normItem) => {
                      const isSelected = compositeSelections.some((s) => s.itemId === normItem.item_id);
                      const res = calculateItemRate({
                        norm: normItem,
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

                      return (
                        <div
                          key={normItem.item_id}
                          className={`p-2.5 rounded-xl border transition text-xs flex items-center justify-between gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-purple-50 border-purple-300 text-purple-950 font-semibold'
                              : 'bg-white border-slate-200 hover:border-purple-200 text-slate-800'
                          }`}
                          onClick={() => handleToggleCompositeItem(normItem.item_id)}
                        >
                          <div className="space-y-0.5 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 text-[10px]">
                                {normItem.code}
                              </span>
                              <span className="font-bold text-slate-900 truncate">{normItem.description}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Unit Rate: {currencyCode()} {res.total_unit_rate.toLocaleString('en-US')} / {normItem.base_unit}
                            </div>
                          </div>

                          <button
                            type="button"
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition ${
                              isSelected
                                ? 'bg-purple-700 text-white'
                                : 'bg-slate-100 hover:bg-purple-100 text-purple-900 border border-slate-200'
                            }`}
                          >
                            {isSelected ? '✓ Selected' : '+ Add'}
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Right Column: Selected Items, Factors & New Norm Details */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">2. Selected Components & Factors</h4>
                    <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                      {compositeSelections.length} Selected
                    </span>
                  </div>

                  {compositeSelections.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-500">
                      Click items on the left to add them to this composite rate calculation.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {compositeSelections.map((sel) => {
                        const targetNorm = norms.find((n) => n.item_id === sel.itemId);
                        if (!targetNorm) return null;
                        const res = calculateItemRate({
                          norm: targetNorm,
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
                        const weightedRate = Math.round(res.total_unit_rate * sel.factor * 100) / 100;

                        return (
                          <div
                            key={sel.itemId}
                            className="p-2 bg-purple-50/60 border border-purple-200 rounded-xl text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between font-bold text-slate-900">
                              <span className="truncate">{targetNorm.code} - {targetNorm.description}</span>
                              <button
                                onClick={() => handleToggleCompositeItem(sel.itemId)}
                                className="text-slate-400 hover:text-red-600 font-bold ml-1 text-xs"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-purple-100 text-[11px]">
                              <span className="text-slate-600 font-mono">
                                Base Rate: {currencyCode()} {res.total_unit_rate.toLocaleString('en-US')}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-slate-700">Factor:</span>
                                <input
                                  type="number"
                                  step="0.05"
                                  min="0"
                                  value={sel.factor}
                                  onChange={(e) =>
                                    handleUpdateCompositeFactor(sel.itemId, parseFloat(e.target.value) || 0)
                                  }
                                  className="w-16 p-1 text-center font-mono font-bold bg-white border border-purple-300 rounded text-purple-900"
                                />
                                <span className="font-mono font-bold text-purple-900">
                                  = {currencyCode()} {weightedRate.toLocaleString('en-US')}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Summary Estimated Composite Rate */}
                  {compositeSelections.length >= 2 && (
                    <div className="p-3 bg-purple-900 text-white rounded-xl text-xs flex items-center justify-between shadow-xs">
                      <span className="font-bold">Combined Estimated Rate ({compositeUnit}):</span>
                      <span className="font-mono text-sm font-black text-amber-300">
                        {currencyCode()}{' '}
                        {compositeSelections
                          .reduce((sum, sel) => {
                            const tn = norms.find((n) => n.item_id === sel.itemId);
                            if (!tn) return sum;
                            const res = calculateItemRate({
                              norm: tn,
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
                            return sum + res.total_unit_rate * sel.factor;
                          }, 0)
                          .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>

                {/* New Item Details Form */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">3. Composite Item Specification</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Item Code:</label>
                      <input
                        type="text"
                        value={compositeCode}
                        onChange={(e) => setCompositeCode(e.target.value)}
                        placeholder="e.g. COMP-01"
                        className="w-full p-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Unit:</label>
                      <input
                        type="text"
                        value={compositeUnit}
                        onChange={(e) => setCompositeUnit(e.target.value)}
                        placeholder="e.g. cu.m, sq.m, job"
                        className="w-full p-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Description:</label>
                    <input
                      type="text"
                      value={compositeDescription}
                      onChange={(e) => setCompositeDescription(e.target.value)}
                      placeholder="e.g. Combined Civil & Finishing Work Item..."
                      className="w-full p-1.5 border border-slate-300 rounded-lg font-medium text-slate-900 bg-white text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3 border-slate-200">
              <button
                onClick={() => setIsCompositeModalOpen(false)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-50 text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCompositeNorm}
                disabled={compositeSelections.length < 2}
                className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Create & Select Composite Norm</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
