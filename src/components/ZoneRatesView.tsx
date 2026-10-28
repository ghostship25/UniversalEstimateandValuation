import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Download,
  Upload,
  Search,
  Trash2,
  Edit2,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  DollarSign,
  Info,
  CheckSquare,
  Square,
  Filter,
  Layers,
  ListChecks,
  Check,
  Percent,
  MoreVertical,
  Zap
} from 'lucide-react';
import { ResourceMaster, ResourceCategory, ZoneInfo, RateNormItem } from '../types';
import { findMasterResource, normalizeResourceName, getZoneRateOnly, calculateTokenSimilarity, inferRateCalcType, inferIsTaxFree, clearRateCalculationCache } from '../services/rateEngine';
import { CSVDiffPreviewModal, DiffPreviewItem } from './CSVDiffPreviewModal';
import { currencyCode } from '../services/currency';

interface ZoneRatesViewProps {
  resources: ResourceMaster[];
  setResources: React.Dispatch<React.SetStateAction<ResourceMaster[]>>;
  selectedZone: ZoneInfo;
  selectedFY: string;
  norms?: RateNormItem[];
  isInitiationLocked?: boolean;
  zones?: ZoneInfo[];
  onSelectZone?: (d: ZoneInfo) => void;
  onOpenAddZoneModal?: () => void;
}

function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim().replace(/^"|"$/g, ''));
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim().replace(/^"|"$/g, ''));
  return result;
}

export const ZoneRatesView: React.FC<ZoneRatesViewProps> = ({
  resources,
  setResources,
  selectedZone,
  selectedFY,
  norms = [],
  isInitiationLocked = false,
  zones,
  onSelectZone,
  onOpenAddZoneModal
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedResourceIds, setSelectedResourceIds] = useState<(number | string)[]>([]);

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

  // Modal State for Rate Item Add/Edit
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<ResourceMaster | null>(null);
  const [formState, setFormState] = useState<{
    name: string;
    category: ResourceCategory;
    unit: string;
    default_rate: number;
    code: string;
    is_tax_free: boolean;
    rate_calc_type: 'fixed' | 'percent_labour' | 'percent_equipment' | 'percent_material';
  }>({
    name: '',
    category: 'Material',
    unit: 'Cu.m.',
    default_rate: 0,
    code: '',
    is_tax_free: false,
    rate_calc_type: 'fixed'
  });

  // Template Download Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);
  const [templateMode, setTemplateMode] = useState<'extracted' | 'blank'>('extracted');
  const [normSelectionType, setNormSelectionType] = useState<'all' | 'dept' | 'specific'>('all');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedNormIdsForTemplate, setSelectedNormIdsForTemplate] = useState<(number | string)[]>([]);
  const [templateSearchQuery, setTemplateSearchQuery] = useState<string>('');
  const [includeRatesInTemplate, setIncludeRatesInTemplate] = useState<boolean>(true);
  const [includeMasterResourcesInTemplate, setIncludeMasterResourcesInTemplate] = useState<boolean>(true);

  // CSV Diff & Conflict Preview Modal State
  const [isDiffPreviewOpen, setIsDiffPreviewOpen] = useState<boolean>(false);
  const [diffPreviewItems, setDiffPreviewItems] = useState<DiffPreviewItem[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getActiveZoneRate = (res: ResourceMaster) => {
    return getZoneRateOnly(res, selectedZone, selectedFY);
  };

  const categories: (ResourceCategory | 'All')[] = ['All', 'Labor', 'Material', 'Equipment', 'Transport'];

  const filteredResources = resources.filter((res) => {
    const matchesCategory = selectedCategory === 'All' || res.category === selectedCategory;
    const matchesSearch =
      String(res.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (res.code && String(res.code || '').toLowerCase().includes(searchQuery.toLowerCase())) ||
      String(res.unit || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Extract unique departments from norms
  const availableDepartments = Array.from(new Set(norms.map((n) => n.source || 'General Norms'))).filter(Boolean);

  const handleOpenTemplateModal = () => {
    setSelectedDepartments(availableDepartments);
    setSelectedNormIdsForTemplate(norms.map((n) => n.item_id));
    setIsTemplateModalOpen(true);
  };

  // Extract resources for CSV Template
  const getExtractedTemplateResources = () => {
    if (templateMode === 'blank') {
      return [
        { code: 'LAB-01', name: 'Unskilled Labor', category: 'Labor' as ResourceCategory, unit: 'Md', default_rate: 0, referencedNorms: ['Sample'] },
        { code: 'LAB-02', name: 'Skilled Mason', category: 'Labor' as ResourceCategory, unit: 'Md', default_rate: 0, referencedNorms: ['Sample'] },
        { code: 'MAT-01', name: 'OPC Cement 53 Grade', category: 'Material' as ResourceCategory, unit: 'Bag', default_rate: 0, referencedNorms: ['Sample'] },
        { code: 'MAT-02', name: 'Washed River Sand', category: 'Material' as ResourceCategory, unit: 'Cu.m.', default_rate: 0, referencedNorms: ['Sample'] },
        { code: 'EQP-01', name: 'Concrete Mixer 7/5 CFT', category: 'Equipment' as ResourceCategory, unit: 'Hour', default_rate: 0, referencedNorms: ['Sample'] }
      ];
    }

    let targetNorms: RateNormItem[] = [];
    if (normSelectionType === 'all') {
      targetNorms = norms;
    } else if (normSelectionType === 'dept') {
      targetNorms = norms.filter((n) => selectedDepartments.includes(n.source));
    } else if (normSelectionType === 'specific') {
      const selSet = new Set(selectedNormIdsForTemplate.map(String));
      targetNorms = norms.filter((n) => selSet.has(String(n.item_id)));
    }

    const resMap = new Map<
      string,
      {
        code: string;
        name: string;
        category: ResourceCategory;
        unit: string;
        default_rate: number;
        referencedNorms: string[];
      }
    >();

    targetNorms.forEach((norm) => {
      norm.resources.forEach((normRes) => {
        let name = normRes.resource_name?.trim() || '';

        // Match existing master resource using robust normalized matching
        const existingMaster = findMasterResource(normRes, resources);

        // If normRes.resource_name is missing or equal to code like "MAT-01", prefer existingMaster's descriptive name
        if (existingMaster && existingMaster.name && existingMaster.name !== existingMaster.code) {
          if (!name || name === existingMaster.code || (existingMaster.code && String(name).toLowerCase() === String(existingMaster.code).toLowerCase())) {
            name = existingMaster.name;
          }
        }

        if (!name || name === 'Resource Name') return;

        const category = normRes.category || (existingMaster ? existingMaster.category : 'Material');
        const unit = normRes.unit_override || (existingMaster ? existingMaster.unit : 'Unit');
        const rate = includeRatesInTemplate ? (existingMaster ? existingMaster.default_rate : 0) : 0;
        
        // Code should be distinct from Name
        let code = existingMaster?.code || (normRes as any).code || '';
        if (!code || code === name) {
          code = `DR-${category.slice(0, 3).toUpperCase()}-${(resMap.size + 1).toString().padStart(3, '0')}`;
        }

        const key = String(name || '').toLowerCase();

        if (!resMap.has(key)) {
          resMap.set(key, {
            code,
            name,
            category,
            unit,
            default_rate: rate,
            referencedNorms: [norm.code]
          });
        } else {
          const item = resMap.get(key)!;
          if (!item.referencedNorms.includes(norm.code)) {
            item.referencedNorms.push(norm.code);
          }
          if (includeRatesInTemplate && item.default_rate === 0 && existingMaster?.default_rate) {
            item.default_rate = existingMaster.default_rate;
          }
        }
      });
    });

    if (includeMasterResourcesInTemplate) {
      resources.forEach((masterRes) => {
        const key = String(masterRes.name || '').toLowerCase().trim();
        if (!resMap.has(key)) {
          resMap.set(key, {
            code: masterRes.code || `DR-${masterRes.category.slice(0, 3).toUpperCase()}-${(resMap.size + 1).toString().padStart(3, '0')}`,
            name: masterRes.name,
            category: masterRes.category,
            unit: masterRes.unit,
            default_rate: includeRatesInTemplate ? masterRes.default_rate : 0,
            referencedNorms: ['Master Rates']
          });
        }
      });
    }

    const items = Array.from(resMap.values());
    const categoryOrder: Record<string, number> = { Labor: 1, Material: 2, Equipment: 3, Transport: 4 };
    items.sort((a, b) => {
      const catA = categoryOrder[a.category] || 99;
      const catB = categoryOrder[b.category] || 99;
      if (catA !== catB) return catA - catB;
      return a.name.localeCompare(b.name);
    });

    return items;
  };

  const handleExecuteDownloadTemplate = () => {
    const items = getExtractedTemplateResources();
    if (items.length === 0) {
      alert('No resources match your current selection filter.');
      return;
    }

    const header = `Item Code,Resource Name,Category,Unit,Zone Rate (${currencyCode()}),Referenced Norms`;
    const csvRows = items.map((item, idx) => {
      const code = item.code || `DR-${item.category.slice(0, 3).toUpperCase()}-${(idx + 1).toString().padStart(3, '0')}`;
      const name = item.name.includes(',') || item.name.includes('"') ? `"${item.name.replace(/"/g, '""')}"` : item.name;
      const unit = item.unit.includes(',') ? `"${item.unit}"` : item.unit;
      const rate = item.default_rate || 0;
      const normRefs = item.referencedNorms.length > 0 ? `"${item.referencedNorms.join(', ')}"` : 'General';
      return `${code},${name},${item.category},${unit},${rate},${normRefs}`;
    });

    const csvContent = [header, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const fileName =
      templateMode === 'blank'
        ? `Zone_Rates_Blank_Template.csv`
        : `Zone_Rates_Template_${selectedZone.name_en.replace(/\s+/g, '_')}_${selectedFY.replace('/', '-')}.csv`;

    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsTemplateModalOpen(false);
    showToast(`Downloaded CSV template with ${items.length} resource items!`);
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormState({
      name: '',
      category: 'Material',
      unit: 'Cu.m.',
      default_rate: 0,
      code: `DR-${Date.now().toString().slice(-4)}`,
      is_tax_free: false,
      rate_calc_type: 'fixed'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ResourceMaster) => {
    setEditingItem(item);
    setFormState({
      name: item.name,
      category: item.category,
      unit: item.unit,
      default_rate: getActiveZoneRate(item),
      code: item.code || `DR-${item.resource_id}`,
      is_tax_free: !!item.is_tax_free,
      rate_calc_type: item.rate_calc_type || 'fixed'
    });
    setIsModalOpen(true);
  };

  const handleToggleTaxFree = (resourceId: number) => {
    setResources((prev) =>
      prev.map((r) =>
        r.resource_id === resourceId
          ? { ...r, is_tax_free: !r.is_tax_free }
          : r
      )
    );
    showToast(`Toggled Tax status for item.`);
  };

  const handleChangeCalcType = (resourceId: number, calcType: 'fixed' | 'percent_labour' | 'percent_equipment' | 'percent_material') => {
    setResources((prev) =>
      prev.map((r) =>
        r.resource_id === resourceId
          ? { ...r, rate_calc_type: calcType }
          : r
      )
    );
    showToast(`Updated Rate Calculation mode.`);
  };

  const handleSaveItem = () => {
    if (!formState.name.trim()) {
      alert('Please enter resource name');
      return;
    }

    const rateVal = Number(formState.default_rate) || 0;
    const fyClean = selectedFY ? selectedFY.replace('/', '-') : '';
    const distRates: Record<string, number> = {
      ...(editingItem?.zone_rates || {}),
      [selectedZone.id]: rateVal,
      [selectedZone.name_en]: rateVal,
      [`${selectedZone.id}_${selectedFY}`]: rateVal,
      [`${selectedZone.name_en}_${selectedFY}`]: rateVal,
      [`${selectedZone.id}_${fyClean}`]: rateVal,
      [`${selectedZone.name_en}_${fyClean}`]: rateVal
    };

    if (editingItem) {
      setResources((prev) =>
        prev.map((r) =>
          r.resource_id === editingItem.resource_id
            ? {
                ...r,
                name: formState.name,
                category: formState.category,
                unit: formState.unit,
                default_rate: rateVal,
                code: formState.code,
                is_tax_free: formState.is_tax_free,
                rate_calc_type: formState.rate_calc_type,
                zone_rates: distRates
              }
            : r
        )
      );
      showToast(`Updated "${formState.name}" rate successfully.`);
    } else {
      const newItem: ResourceMaster = {
        resource_id: Date.now(),
        name: formState.name.trim(),
        category: formState.category,
        unit: formState.unit.trim() || 'Unit',
        default_rate: rateVal,
        code: formState.code.trim() || `DR-${Date.now().toString().slice(-4)}`,
        is_tax_free: formState.is_tax_free,
        rate_calc_type: formState.rate_calc_type,
        zone_rates: distRates
      };
      setResources((prev) => [newItem, ...prev]);
      showToast(`Added new zone rate item "${newItem.name}".`);
    }

    setIsModalOpen(false);
  };

  const handleToggleSelectResource = (id: number | string) => {
    const idStr = String(id);
    setSelectedResourceIds((prev) => {
      if (prev.some((i) => String(i) === idStr)) {
        return prev.filter((i) => String(i) !== idStr);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAllFiltered = () => {
    const filteredIdsStr = filteredResources.map((r) => String(r.resource_id));
    const selectedIdsStr = selectedResourceIds.map(String);
    const allSelected = filteredIdsStr.length > 0 && filteredIdsStr.every((id) => selectedIdsStr.includes(id));

    if (allSelected) {
      setSelectedResourceIds((prev) => prev.filter((id) => !filteredIdsStr.includes(String(id))));
    } else {
      const newSelections = filteredResources.map((r) => r.resource_id);
      const combined = Array.from(new Set([...selectedResourceIds.map(String), ...newSelections.map(String)]));
      setSelectedResourceIds(combined);
    }
  };

  const handleBulkSetTaxFree = (isTaxFree: boolean) => {
    if (selectedResourceIds.length === 0) return;
    const selectedSet = new Set(selectedResourceIds.map(String));
    setResources((prev) =>
      prev.map((r) =>
        selectedSet.has(String(r.resource_id))
          ? { ...r, is_tax_free: isTaxFree }
          : r
      )
    );
    showToast(`Marked ${selectedResourceIds.length} item(s) as ${isTaxFree ? 'Tax Free' : 'Taxable (13%)'}.`);
  };

  const handleDeleteSelectedResources = () => {
    if (isInitiationLocked) {
      alert('Initiation data is locked. Password unlock is required to delete rates.');
      return;
    }
    if (selectedResourceIds.length === 0) return;
    const selectedSet = new Set(selectedResourceIds.map(String));
    setResources((prev) => prev.filter((r) => !selectedSet.has(String(r.resource_id))));
    showToast(`Deleted ${selectedResourceIds.length} selected rate item(s).`);
    setSelectedResourceIds([]);
  };

  const handleDeleteItem = (id: number | string, itemObj?: ResourceMaster) => {
    if (isInitiationLocked) {
      alert('Initiation data is locked. Password unlock is required to delete rates.');
      return;
    }
    const targetIdStr = id !== undefined && id !== null ? String(id) : '';
    const targetCodeStr = itemObj?.code ? String(itemObj.code).toLowerCase().trim() : '';
    const targetName = itemObj?.name ? itemObj.name.trim().toLowerCase() : '';
    const targetNormName = itemObj?.name ? normalizeResourceName(itemObj.name) : '';

    setResources((prev) =>
      prev.filter((r) => {
        const rIdStr = r.resource_id !== undefined ? String(r.resource_id) : '';
        const rCodeStr = r.code ? String(r.code).toLowerCase().trim() : '';
        const rName = r.name ? String(r.name).trim().toLowerCase() : '';

        if (targetIdStr && rIdStr === targetIdStr) return false;
        if (targetCodeStr && rCodeStr && rCodeStr === targetCodeStr) return false;
        if (targetName && rName === targetName) return false;
        if (targetNormName && r.name && normalizeResourceName(r.name) === targetNormName) return false;
        return true;
      })
    );
    setSelectedResourceIds((prev) => prev.filter((i) => String(i) !== targetIdStr));
    showToast('Item deleted successfully.');
  };

  const handleClearAll = () => {
    if (isInitiationLocked) {
      alert('Initiation data is locked. Password unlock is required to clear rates.');
      return;
    }
    setResources([]);
    setSelectedResourceIds([]);
    showToast('Cleared all zone rates.');
  };

  const handleImportDefaultKtmRates = () => {
    if (isInitiationLocked) {
      alert('Initiation data is locked. Password unlock is required to add rates.');
      return;
    }
    const defaultList: ResourceMaster[] = [
      { resource_id: 101, code: 'LAB-01', name: 'Unskilled Labor', category: 'Labor', unit: 'Md', default_rate: 850 },
      { resource_id: 102, code: 'LAB-02', name: 'Skilled Mason', category: 'Labor', unit: 'Md', default_rate: 1250 },
      { resource_id: 104, code: 'MAT-01', name: 'OPC Cement 53 Grade', category: 'Material', unit: 'Bag', default_rate: 750 },
      { resource_id: 106, code: 'MAT-03', name: 'Coarse River Sand', category: 'Material', unit: 'Cu.m.', default_rate: 2400 },
      { resource_id: 108, code: 'MAT-05', name: 'First Class Local Bricks', category: 'Material', unit: 'Pcs', default_rate: 18 }
    ];
    setResources(defaultList);
    showToast(`Populated standard rate schedule for ${selectedZone.name_en} (${selectedFY}).`);
  };

  // Download Blank CSV Template
  const handleDownloadTemplate = () => {
    const csvContent =
      `Item Code,Resource Name,Category,Unit,Zone Rate (${currencyCode()})\n` +
      'LAB-01,Unskilled Labor,Labor,Md,0\n' +
      'LAB-02,Skilled Mason,Labor,Md,0\n' +
      'MAT-01,OPC Cement,Material,Bag,0\n' +
      'MAT-02,Washed Sand,Material,Cu.m.,0\n' +
      'EQP-01,Concrete Mixer 7/5,Equipment,Hour,0\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Zone_Rates_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import CSV File with Flexible Dynamic Header Detection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        alert('CSV file appears empty or missing data rows.');
        return;
      }

      const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/["']/g, '').trim());

      const claimedCols = new Set<number>();
      const findHeaderCol = (keywords: string[], excludeKeywords: string[], fallbackIdx: number) => {
        const idx = header.findIndex((h, i) => {
          if (claimedCols.has(i)) return false;
          const matches = keywords.some((k) => h.includes(k));
          const isExcluded = excludeKeywords.some((ek) => h.includes(ek));
          return matches && !isExcluded;
        });
        if (idx !== -1) {
          claimedCols.add(idx);
          return idx;
        }
        return fallbackIdx;
      };

      const colCode = findHeaderCol(['item code', 'resource code', 'res code', 'code', 'id'], ['name', 'desc', 'unit', 'rate'], 0);
      let colName = findHeaderCol(['resource name', 'material name', 'equipment name', 'item name', 'particulars', 'description', 'name'], ['code', 'id'], 1);

      if (colName === colCode && header.length > 1) {
        colName = colCode === 0 ? 1 : 0;
      }

      const colCat = findHeaderCol(['category', 'cat', 'type', 'group'], [], 2);
      const colUnit = findHeaderCol(['unit', 'uom'], [], 3);
      const colRate = findHeaderCol(['zone rate', 'rate', 'price', 'cost', 'amount'], [], 4);
      const colTax = findHeaderCol(['tax', 'tax', 'is_tax_free', 'tax_free', 'tax free', 'Discount'], [], -1);

      const hasAnyHeaderMatch = claimedCols.size > 0;
      const startIdx = hasAnyHeaderMatch ? 1 : 0;

      const newItems: ResourceMaster[] = [];

      for (let i = startIdx; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (cols.length < 2) continue;

        let code = (colCode < cols.length && cols[colCode] ? cols[colCode] : cols[0] || '').trim();
        let name = (colName < cols.length && cols[colName] ? cols[colName] : (cols[1] || cols[0]) || '').trim();
        const rawCategory = (colCat < cols.length && cols[colCat] ? cols[colCat] : cols[2] || 'Material').trim();
        const unit = (colUnit < cols.length && cols[colUnit] ? cols[colUnit] : cols[3] || 'Unit').trim();
        const rawRate = (colRate < cols.length && cols[colRate] ? cols[colRate] : cols[4] || '0').trim();
        const rawTax = (colTax !== -1 && colTax < cols.length && cols[colTax] ? cols[colTax] : '').trim().toLowerCase();

        let category: ResourceCategory = 'Material';
        const catLower = rawCategory.toLowerCase();
        if (catLower.includes('lab') || catLower.includes('man') || catLower.includes('work')) {
          category = 'Labor';
        } else if (catLower.includes('eq') || catLower.includes('machin') || catLower.includes('plant')) {
          category = 'Equipment';
        } else if (catLower.includes('trans') || catLower.includes('haul') || catLower.includes('tipper')) {
          category = 'Transport';
        } else {
          category = 'Material';
        }

        const colCalcType = findHeaderCol(['rate_calc_type', 'calc_type', 'calc type', 'type'], [], -1);
        const rawCalc = colCalcType !== -1 && colCalcType < cols.length ? cols[colCalcType].trim().toLowerCase() : '';
        let calcType: 'fixed' | 'percent_labour' | 'percent_equipment' | 'percent_material' = 'fixed';
        if (rawCalc.includes('percent_labour') || (rawCalc.includes('lab') && rawCalc.includes('percent'))) {
          calcType = 'percent_labour';
        } else if (rawCalc.includes('percent_equipment') || ((rawCalc.includes('eq') || rawCalc.includes('plant')) && rawCalc.includes('percent'))) {
          calcType = 'percent_equipment';
        } else if (rawCalc.includes('percent_material') || (rawCalc.includes('mat') && rawCalc.includes('percent'))) {
          calcType = 'percent_material';
        } else {
          calcType = inferRateCalcType(name, unit, category);
        }

        let isTaxFree = false;
        if (rawTax) {
          if (rawTax.includes('free') || rawTax.includes('exempt') || rawTax === 'true' || rawTax === 'yes' || rawTax === '1' || rawTax === '0%') {
            isTaxFree = true;
          }
        } else {
          isTaxFree = inferIsTaxFree(name, unit);
        }

        if (!name && code) {
          name = code;
        }
        if (!code && name) {
          code = `DR-${Date.now() + i}`;
        }

        const parsedRate = parseFloat(rawRate.replace(/[^0-9.]/g, '')) || 0;

        if (name && name !== 'Resource Name') {
          const fyClean = selectedFY ? selectedFY.replace('/', '-') : '';
          const distId = selectedZone?.id ? selectedZone.id : 'default';
          const distName = selectedZone?.name_en ? selectedZone.name_en : 'Default Zone';
          const distRates: Record<string, number> = {
            default: parsedRate,
            [distId]: parsedRate,
            [distName]: parsedRate,
            [distId.toLowerCase()]: parsedRate,
            [distName.toLowerCase()]: parsedRate,
            [`${distId}_${selectedFY}`]: parsedRate,
            [`${distName}_${selectedFY}`]: parsedRate,
            [`${distId}_${fyClean}`]: parsedRate,
            [`${distName}_${fyClean}`]: parsedRate,
            [`${distId.toLowerCase()}_${selectedFY.toLowerCase()}`]: parsedRate,
            [`${distName.toLowerCase()}_${selectedFY.toLowerCase()}`]: parsedRate,
            [`${distId.toLowerCase()}_${fyClean.toLowerCase()}`]: parsedRate,
            [`${distName.toLowerCase()}_${fyClean.toLowerCase()}`]: parsedRate
          };

          const newResId = Date.now() * 1000 + i + Math.floor(Math.random() * 900);
          newItems.push({
            resource_id: newResId,
            code: code || `DR-${newResId}`,
            name: name,
            category,
            unit: unit || 'Unit',
            default_rate: parsedRate,
            is_tax_free: isTaxFree,
            rate_calc_type: calcType,
            zone_rates: distRates
          });
        }
      }

      if (newItems.length > 0) {
        // Build interactive diff preview items
        const diffList: DiffPreviewItem[] = newItems.map((ni) => {
          const niCode = ni.code ? String(ni.code).toLowerCase().replace(/^dr\-/, '').trim() : '';
          const niNameNorm = normalizeResourceName(ni.name);

          const existing = resources.find((item) => {
            const itemCode = item.code ? String(item.code).toLowerCase().replace(/^dr\-/, '').trim() : '';
            const itemIdStr = String(item.resource_id);
            const itemNameNorm = normalizeResourceName(item.name);
            return (
              (itemCode && niCode && itemCode === niCode) ||
              (itemIdStr && niCode && itemIdStr === niCode) ||
              (itemNameNorm && niNameNorm && itemNameNorm === niNameNorm) ||
              calculateTokenSimilarity(item.name, ni.name) >= 0.70
            );
          });

          if (existing) {
            const rateChanged = Math.abs((existing.default_rate || 0) - (ni.default_rate || 0)) > 0.001;
            const taxChanged = existing.is_tax_free !== ni.is_tax_free;
            const isChanged = rateChanged || taxChanged;

            return {
              id: ni.resource_id,
              code: ni.code || `RES-${ni.resource_id}`,
              name: ni.name,
              category: ni.category,
              unit: ni.unit,
              oldRate: existing.default_rate,
              newRate: ni.default_rate,
              status: isChanged ? ('modified' as const) : ('unchanged' as const),
              isSelected: isChanged,
              itemData: ni
            };
          } else {
            return {
              id: ni.resource_id,
              code: ni.code || `RES-${ni.resource_id}`,
              name: ni.name,
              category: ni.category,
              unit: ni.unit,
              newRate: ni.default_rate,
              status: 'new' as const,
              isSelected: true,
              itemData: ni
            };
          }
        });

        setDiffPreviewItems(diffList);
        setIsDiffPreviewOpen(true);
      } else {
        alert('Could not parse any valid rows. Please check file formatting.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Handler to apply selected diff preview items
  const handleApplyDiffImport = (selectedDiffs: DiffPreviewItem[]) => {
    if (selectedDiffs.length === 0) {
      showToast('No items selected to import.');
      setIsDiffPreviewOpen(false);
      return;
    }

    const newItemsToMerge: ResourceMaster[] = selectedDiffs
      .map((d) => d.itemData as ResourceMaster)
      .filter(Boolean);

    setResources((prev) => {
      const updatedPrev = prev.map((item) => {
        const itemCode = item.code ? String(item.code).toLowerCase().replace(/^dr\-/, '').trim() : '';
        const itemIdStr = String(item.resource_id);
        const itemNameNorm = normalizeResourceName(item.name);

        const match = newItemsToMerge.find((ni) => {
          const niCode = ni.code ? String(ni.code).toLowerCase().replace(/^dr\-/, '').trim() : '';
          const niNameNorm = normalizeResourceName(ni.name);
          return (
            (itemCode && niCode && itemCode === niCode) ||
            (itemIdStr && niCode && itemIdStr === niCode) ||
            (itemNameNorm && niNameNorm && itemNameNorm === niNameNorm) ||
            calculateTokenSimilarity(item.name, ni.name) >= 0.70
          );
        });

        if (match) {
          const updatedZoneRates = { ...(item.zone_rates || {}), ...(match.zone_rates || {}) };
          return {
            ...item,
            default_rate: match.default_rate > 0 ? match.default_rate : item.default_rate,
            zone_rates: updatedZoneRates,
            is_tax_free: match.is_tax_free !== undefined ? match.is_tax_free : item.is_tax_free
          };
        }
        return item;
      });

      const unmatchedNewItems = newItemsToMerge.filter((ni) => {
        const niCode = ni.code ? String(ni.code).toLowerCase().replace(/^dr\-/, '').trim() : '';
        const niNameNorm = normalizeResourceName(ni.name);
        return !updatedPrev.some((existing) => {
          const eCode = existing.code ? String(existing.code).toLowerCase().replace(/^dr\-/, '').trim() : '';
          const eIdStr = String(existing.resource_id);
          const eNameNorm = normalizeResourceName(existing.name);
          return (
            (eCode && niCode && eCode === niCode) ||
            (eIdStr && niCode && eIdStr === niCode) ||
            (eNameNorm && niNameNorm && eNameNorm === niNameNorm) ||
            calculateTokenSimilarity(existing.name, ni.name) >= 0.70
          );
        });
      });

      return [...unmatchedNewItems, ...updatedPrev];
    });

    clearRateCalculationCache();
    setIsDiffPreviewOpen(false);
    showToast(`Successfully applied ${selectedDiffs.length} rate item(s)!`);
  };

  // One-click Starter Template Loader
  const handleLoadStarterTemplate = () => {
    const starterItems: ResourceMaster[] = [
      { resource_id: 101, code: 'LAB-01', name: 'Unskilled Labor', category: 'Labor', unit: 'Md', default_rate: 850 },
      { resource_id: 102, code: 'LAB-02', name: 'Skilled Mason', category: 'Labor', unit: 'Md', default_rate: 1250 },
      { resource_id: 103, code: 'LAB-03', name: 'Bar Bender / Carpenter', category: 'Labor', unit: 'Md', default_rate: 1300 },
      { resource_id: 104, code: 'MAT-01', name: 'OPC Cement 53 Grade', category: 'Material', unit: 'Bag', default_rate: 750 },
      { resource_id: 105, code: 'MAT-02', name: 'PPC Cement', category: 'Material', unit: 'Bag', default_rate: 680 },
      { resource_id: 106, code: 'MAT-03', name: 'Coarse River Sand', category: 'Material', unit: 'Cu.m.', default_rate: 2400 },
      { resource_id: 107, code: 'MAT-04', name: 'Crushed Stone Aggregate 20mm', category: 'Material', unit: 'Cu.m.', default_rate: 3100 },
      { resource_id: 108, code: 'MAT-05', name: 'First Class Local Bricks', category: 'Material', unit: 'Pcs', default_rate: 18 },
      { resource_id: 109, code: 'MAT-06', name: 'TMT Rebar Steel', category: 'Material', unit: 'Kg', default_rate: 118 },
      { resource_id: 110, code: 'EQP-01', name: 'Concrete Mixer 7/5 CFT', category: 'Equipment', unit: 'Hour', default_rate: 650 },
      { resource_id: 111, code: 'EQP-02', name: 'Needle Vibrator 40mm', category: 'Equipment', unit: 'Hour', default_rate: 250 },
      { resource_id: 112, code: 'TRN-01', name: 'Local Tipper Freight Haulage', category: 'Transport', unit: 'Ton-Km', default_rate: 28 }
    ];

    setResources(starterItems);
    showToast('Loaded standard Zone Rate template (12 items).');
  };

  const handleExportCSV = () => {
    if (resources.length === 0) {
      alert('No zone rates to export.');
      return;
    }
    const header = `Item Code,Resource Name,Category,Unit,Zone Rate (${currencyCode()}),Tax Free,Calculation Type`;
    const rows = resources.map((r) => {
      const code = r.code || `DR-${r.resource_id}`;
      const name = r.name.includes(',') || r.name.includes('"') ? `"${r.name.replace(/"/g, '""')}"` : r.name;
      const unit = r.unit.includes(',') ? `"${r.unit}"` : r.unit;
      const rate = getActiveZoneRate(r);
      const taxFree = r.is_tax_free ? 'Yes' : 'No';
      const calcType = r.rate_calc_type || 'fixed';
      return `${code},${name},${r.category},${unit},${rate},${taxFree},${calcType}`;
    });
    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Zone_Rates_${selectedZone.name_en}_${selectedFY.replace('/', '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${resources.length} rate items to CSV.`);
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Listen to Ribbon events
  useEffect(() => {
    const handleAdd = () => {
      if (!isInitiationLocked) handleOpenAddModal();
    };
    const handleImport = () => {
      if (!isInitiationLocked) fileInputRef.current?.click();
    };
    const handleExport = () => handleExportCSV();
    const handleDownloadTemplate = () => handleOpenTemplateModal();
    const handleStarter = () => {
      if (!isInitiationLocked) handleLoadStarterTemplate();
    };
    const handleDiagnostics = () => setIsDiagnosticsOpen(true);
    const handleFilterCat = (e: any) => {
      const cat = typeof e.detail === 'object' && e.detail?.cat ? e.detail.cat : e.detail;
      if (cat) setSelectedCategory(cat);
    };
    const handleSearch = (e: any) => {
      const query = typeof e.detail === 'object' && e.detail?.query ? e.detail.query : e.detail;
      setSearchQuery(query || '');
    };

    window.addEventListener('uev:rates-add-resource', handleAdd);
    window.addEventListener('uev:rates-import-csv', handleImport);
    window.addEventListener('uev:rates-export-csv', handleExport);
    window.addEventListener('uev:rates-download-template', handleDownloadTemplate);
    window.addEventListener('uev:rates-load-starter', handleStarter);
    window.addEventListener('uev:rates-diagnostics', handleDiagnostics);
    window.addEventListener('uev:rates-filter-cat', handleFilterCat);
    window.addEventListener('uev:rates-search', handleSearch);

    return () => {
      window.removeEventListener('uev:rates-add-resource', handleAdd);
      window.removeEventListener('uev:rates-import-csv', handleImport);
      window.removeEventListener('uev:rates-export-csv', handleExport);
      window.removeEventListener('uev:rates-download-template', handleDownloadTemplate);
      window.removeEventListener('uev:rates-load-starter', handleStarter);
      window.removeEventListener('uev:rates-diagnostics', handleDiagnostics);
      window.removeEventListener('uev:rates-filter-cat', handleFilterCat);
      window.removeEventListener('uev:rates-search', handleSearch);
    };
  }, [isInitiationLocked, handleOpenAddModal, handleExportCSV, handleOpenTemplateModal, handleLoadStarterTemplate]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Hidden file input for CSV Import triggered from Ribbon */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        disabled={isInitiationLocked}
        className="hidden"
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2 border border-slate-700 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Initiation Locked Warning Banner */}
      {isInitiationLocked && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center justify-between text-amber-900 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-200/70 rounded-xl text-amber-800 font-bold">
              🔒
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider">Initiation Data & Zone Rates Locked</h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Master rates locked in read-only mode.
              </p>
            </div>
          </div>
          <span className="bg-amber-200 text-amber-900 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase font-mono shrink-0">
            PROTECTED STATE
          </span>
        </div>
      )}

      {/* Floating Banner for Selected Items Bulk Actions */}
      {selectedResourceIds.length > 0 && (
        <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 border border-slate-700 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckSquare className="w-5 h-5 text-indigo-400" />
            <div>
              <span className="text-xs font-bold block">{selectedResourceIds.length} Rate Item(s) Selected</span>
              <span className="text-[11px] text-slate-300">Apply bulk changes or remove selected items</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkSetTaxFree(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow transition"
              title="Set selected resources to Tax Free (0% Tax in rate analysis)"
            >
              <Check className="w-3.5 h-3.5" />
              Set Tax Free
            </button>
            <button
              onClick={() => handleBulkSetTaxFree(false)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow transition"
              title="Set selected resources to Taxable (tax applied)"
            >
              <Percent className="w-3.5 h-3.5" />
              Set Taxable (13%)
            </button>
            <button
              onClick={handleDeleteSelectedResources}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected ({selectedResourceIds.length})
            </button>
            <button
              onClick={() => setSelectedResourceIds([])}
              className="text-xs text-slate-300 hover:text-white px-3 py-1.5 font-semibold transition"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Zone Rates Table or Empty Slate */}
      {filteredResources.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto text-blue-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No Zone Rates Recorded for {selectedZone.name_en} ({selectedFY})</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Rates are stored strictly per zone and fiscal year. You can populate standard rate items, add individual items manually, or upload a CSV file.
            </p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
            <button
              onClick={handleImportDefaultKtmRates}
              disabled={isInitiationLocked}
              className={`font-bold text-xs px-4 py-2.5 rounded-xl shadow transition ${
                isInitiationLocked
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              + Copy Standard Zone Rates Schedule
            </button>
            <button
              onClick={handleOpenAddModal}
              disabled={isInitiationLocked}
              className={`font-bold text-xs px-4 py-2.5 rounded-xl shadow transition ${
                isInitiationLocked
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              + Add First Rate Item
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <button
                      onClick={handleSelectAllFiltered}
                      className="text-slate-400 hover:text-slate-700"
                      title="Select / Deselect all visible items"
                    >
                      {filteredResources.length > 0 &&
                      filteredResources.every((r) => selectedResourceIds.map(String).includes(String(r.resource_id))) ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3">Code</th>
                  <th className="p-3">Resource Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Unit</th>
                  <th className="p-3 text-center">Tax Status</th>
                  <th className="p-3 text-center">Rate Calc Type</th>
                  <th className="p-3 text-right">Zone Rate ({currencyCode()})</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredResources.map((res, idx) => {
                  const isChecked = selectedResourceIds.map(String).includes(String(res.resource_id));
                  return (
                    <tr key={`${res.resource_id}_${idx}`} className={`hover:bg-slate-50 transition ${isChecked ? 'bg-blue-50/40' : ''}`}>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleSelectResource(res.resource_id)}
                          className="text-slate-500 hover:text-slate-800"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>
                      <td className="p-3 font-mono font-bold text-blue-700">{res.code || `DR-${res.resource_id}`}</td>
                      <td className="p-3 font-bold text-slate-900">{res.name}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            res.category === 'Labor'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : res.category === 'Material'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : res.category === 'Equipment'
                              ? 'bg-purple-50 text-purple-800 border border-purple-200'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {res.category}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600">{res.unit}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleTaxFree(res.resource_id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer border ${
                            res.is_tax_free
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
                          }`}
                          title="Click to toggle Tax Free / Taxable status"
                        >
                          {res.is_tax_free ? '✓ Tax Free' : 'Taxable (13%)'}
                        </button>
                      </td>
                      <td className="p-3 text-center">
                        <select
                          value={res.rate_calc_type || 'fixed'}
                          onChange={(e) => handleChangeCalcType(res.resource_id, e.target.value as any)}
                          className="bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-semibold p-1 focus:bg-white cursor-pointer"
                        >
                          <option value="fixed">Fixed Rate</option>
                          <option value="percent_labour">% Labour Cost</option>
                          <option value="percent_equipment">% Equipment Cost</option>
                          <option value="percent_material">% Material Cost</option>
                        </select>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 text-sm">
                        {currencyCode()} {getActiveZoneRate(res).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(res)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                            title="Edit Rate"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(res.resource_id, res)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
            <span>Showing {filteredResources.length} of {resources.length} rate items</span>
            <span className="font-mono">Zone: {selectedZone.name_en}</span>
          </div>
        </div>
      )}

      {/* Modal for Adding / Editing Zone Rate */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingItem ? 'Edit Zone Rate Item' : 'Add New Zone Rate Item'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Item Code</label>
                <input
                  type="text"
                  value={formState.code}
                  onChange={(e) => setFormState({ ...formState, code: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-mono font-bold text-blue-700 bg-slate-50 focus:bg-white"
                  placeholder="e.g. MAT-01"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Resource Name</label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-medium bg-slate-50 focus:bg-white"
                  placeholder="e.g. OPC Cement 53 Grade"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formState.category}
                    onChange={(e) => setFormState({ ...formState, category: e.target.value as ResourceCategory })}
                    className="w-full p-2.5 border rounded-xl font-medium bg-slate-50 focus:bg-white"
                  >
                    <option value="Labor">Labor</option>
                    <option value="Material">Material</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Transport">Transport</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={formState.unit}
                    onChange={(e) => setFormState({ ...formState, unit: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-mono bg-slate-50 focus:bg-white"
                    placeholder="e.g. Bag, Cu.m., Md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tax Status</label>
                  <select
                    value={formState.is_tax_free ? 'tax_free' : 'taxable'}
                    onChange={(e) => setFormState({ ...formState, is_tax_free: e.target.value === 'tax_free' })}
                    className="w-full p-2.5 border rounded-xl font-medium bg-slate-50 focus:bg-white"
                  >
                    <option value="taxable">Taxable (13%)</option>
                    <option value="tax_free">Tax Free</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rate Calc Type</label>
                  <select
                    value={formState.rate_calc_type}
                    onChange={(e) => setFormState({ ...formState, rate_calc_type: e.target.value as any })}
                    className="w-full p-2.5 border rounded-xl font-medium bg-slate-50 focus:bg-white"
                  >
                    <option value="fixed">Fixed Rate</option>
                    <option value="percent_labour">% Labour Cost</option>
                    <option value="percent_equipment">% Equipment Cost</option>
                    <option value="percent_material">% Material Cost</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Zone Rate ({currencyCode()})</label>
                <input
                  type="number"
                  step="0.01"
                  value={formState.default_rate}
                  onChange={(e) => setFormState({ ...formState, default_rate: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 border rounded-xl font-mono font-bold text-emerald-700 text-sm bg-slate-50 focus:bg-white"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow"
              >
                Save Rate Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Downloading Zone Rates CSV Template with Norm Materials */}
      {isTemplateModalOpen && (() => {
        const previewItems = getExtractedTemplateResources();
        const laborCount = previewItems.filter((i) => i.category === 'Labor').length;
        const materialCount = previewItems.filter((i) => i.category === 'Material').length;
        const equipmentCount = previewItems.filter((i) => i.category === 'Equipment').length;
        const transportCount = previewItems.filter((i) => i.category === 'Transport').length;

        const filteredNormsForSelection = norms.filter(
          (n) =>
            String(n.code || '').toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
            String(n.description || '').toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
            String(n.source || '').toLowerCase().includes(templateSearchQuery.toLowerCase())
        );

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-start border-b pb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Download Zone Rates CSV Template
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Pre-fill your CSV collection template with all material, labor, and equipment items required by your selected norms.
                  </p>
                </div>
                <button
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto pr-1 text-xs flex-1">
                {/* Template Type Selector */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTemplateMode('extracted')}
                    className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                      templateMode === 'extracted'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <Layers className={`w-4 h-4 mt-0.5 ${templateMode === 'extracted' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-bold text-slate-900">Populate from Norm Specs</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Extracts all required materials, labor & plants from selected rate norms ({norms.length} active)
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplateMode('blank')}
                    className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                      templateMode === 'blank'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <FileSpreadsheet className={`w-4 h-4 mt-0.5 ${templateMode === 'blank' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-bold text-slate-900">Blank Sample CSV</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Standard blank template with 5 generic sample items
                      </div>
                    </div>
                  </button>
                </div>

                {templateMode === 'extracted' && (
                  <div className="space-y-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                      <Filter className="w-3.5 h-3.5 text-blue-600" />
                      Select Norm Scope to Extract Materials From
                    </div>

                    {/* Scope Mode Options */}
                    <div className="grid grid-cols-3 gap-2">
                      <label
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-[11px] font-bold transition ${
                          normSelectionType === 'all'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="normScope"
                          checked={normSelectionType === 'all'}
                          onChange={() => setNormSelectionType('all')}
                          className="hidden"
                        />
                        <span>All Active Norms ({norms.length})</span>
                      </label>

                      <label
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-[11px] font-bold transition ${
                          normSelectionType === 'dept'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="normScope"
                          checked={normSelectionType === 'dept'}
                          onChange={() => setNormSelectionType('dept')}
                          className="hidden"
                        />
                        <span>By Department</span>
                      </label>

                      <label
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-[11px] font-bold transition ${
                          normSelectionType === 'specific'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="normScope"
                          checked={normSelectionType === 'specific'}
                          onChange={() => setNormSelectionType('specific')}
                          className="hidden"
                        />
                        <span>Pick Specific Norms</span>
                      </label>
                    </div>

                    {/* Department Selection Checkboxes */}
                    {normSelectionType === 'dept' && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                        <span className="font-bold text-slate-700 block text-[11px]">Select Departments:</span>
                        <div className="flex flex-wrap gap-2">
                          {availableDepartments.map((dept) => {
                            const isSelected = selectedDepartments.includes(dept);
                            const count = norms.filter((n) => n.source === dept).length;
                            return (
                              <button
                                key={dept}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedDepartments((prev) => prev.filter((d) => d !== dept));
                                  } else {
                                    setSelectedDepartments((prev) => [...prev, dept]);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                                  isSelected
                                    ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {isSelected ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                                <span>{dept} ({count} norms)</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Specific Norm Checklist */}
                    {normSelectionType === 'specific' && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 max-h-56 flex flex-col">
                        <div className="flex items-center justify-between gap-2">
                          <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                            <input
                              type="text"
                              value={templateSearchQuery}
                              onChange={(e) => setTemplateSearchQuery(e.target.value)}
                              placeholder="Search norms..."
                              className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-lg"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const allIds = norms.map((n) => n.item_id);
                              const isAllSelected = allIds.every((id) => selectedNormIdsForTemplate.map(String).includes(String(id)));
                              setSelectedNormIdsForTemplate(isAllSelected ? [] : allIds);
                            }}
                            className="text-[11px] font-bold text-blue-600 hover:underline whitespace-nowrap"
                          >
                            Toggle All
                          </button>
                        </div>

                        <div className="overflow-y-auto space-y-1 flex-1 pr-1">
                          {filteredNormsForSelection.map((norm, idx) => {
                            const isChecked = selectedNormIdsForTemplate.map(String).includes(String(norm.item_id));
                            return (
                              <label
                                key={`${norm.item_id}_${idx}`}
                                className={`flex items-start gap-2 p-1.5 rounded-lg border cursor-pointer transition text-[11px] ${
                                  isChecked ? 'bg-blue-50/50 border-blue-200' : 'border-transparent hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const idStr = String(norm.item_id);
                                    setSelectedNormIdsForTemplate((prev) =>
                                      prev.map(String).includes(idStr)
                                        ? prev.filter((i) => String(i) !== idStr)
                                        : [...prev, norm.item_id]
                                    );
                                  }}
                                  className="mt-0.5"
                                />
                                <div className="flex-1">
                                  <div className="font-bold text-slate-800 flex items-center justify-between">
                                    <span>{norm.code}</span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {norm.resources.length} resources
                                    </span>
                                  </div>
                                  <div className="text-slate-600 line-clamp-1">{norm.description}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Output Options Toggles */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-200 text-[11px] font-semibold text-slate-700">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeRatesInTemplate}
                          onChange={(e) => setIncludeRatesInTemplate(e.target.checked)}
                        />
                        <span>Pre-fill current default rates if available</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeMasterResourcesInTemplate}
                          onChange={(e) => setIncludeMasterResourcesInTemplate(e.target.checked)}
                        />
                        <span>Include existing master rates list</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Extracted Preview Badge */}
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5 text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Template Ready ({previewItems.length} Unique Resources)
                    </div>
                    <div className="text-[11px] text-emerald-800 mt-0.5">
                      Ready to generate CSV collection form for zone official rates.
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                    <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded">
                      Labor: {laborCount}
                    </span>
                    <span className="bg-blue-100 text-blue-900 border border-blue-300 px-2 py-0.5 rounded">
                      Material: {materialCount}
                    </span>
                    <span className="bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded">
                      Equipment: {equipmentCount}
                    </span>
                    {transportCount > 0 && (
                      <span className="bg-slate-100 text-slate-900 border border-slate-300 px-2 py-0.5 rounded">
                        Transport: {transportCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDownloadTemplate}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download CSV Template ({previewItems.length} items)</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Smart CSV Diff Preview Modal */}
      <CSVDiffPreviewModal
        isOpen={isDiffPreviewOpen}
        onClose={() => setIsDiffPreviewOpen(false)}
        items={diffPreviewItems}
        onConfirm={handleApplyDiffImport}
        title="Zone Rates Import Preview & Diff Analysis"
        subtitle={`Review changes before updating zone rates for ${selectedZone.name_en} (${selectedFY}). Modified rates are highlighted with comparison values.`}
      />
    </div>
  );
};
