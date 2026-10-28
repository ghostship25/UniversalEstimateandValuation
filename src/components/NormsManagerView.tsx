import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Download,
  Search,
  Trash2,
  Edit2,
  Layers,
  CheckCircle2,
  Sparkles,
  Eye,
  Box,
  Hammer,
  Wrench,
  Truck,
  PlusCircle,
  FolderPlus,
  Upload,
  CheckSquare,
  Square,
  FileSpreadsheet,
  HelpCircle,
  ChevronDown,
  Filter,
  Check,
  FileText,
  X,
  AlertCircle,
  MoreVertical,
  Zap,
  Percent
} from 'lucide-react';
import { RateNormItem, ResourceMaster, ResourceCategory, ZoneInfo } from '../types';
import { getDefaultResourceRate } from '../data/initialData';
import { normalizeResourceName, inferRateCalcType, inferIsTaxFree } from '../services/rateEngine';
import {
  BUILDING_NORMS,
  ROAD_NORMS,
  DWRI_IRRIGATION_NORMS,
  CUSTOM_NORMS_CATALOG
} from '../data/departmentNormsCatalog';

interface NormsManagerViewProps {
  norms: RateNormItem[];
  setNorms: React.Dispatch<React.SetStateAction<RateNormItem[]>>;
  resources: ResourceMaster[];
  setResources?: React.Dispatch<React.SetStateAction<ResourceMaster[]>>;
  isInitiationLocked?: boolean;
  selectedZone?: ZoneInfo;
}

export interface NormResourceRowForm {
  is_custom: boolean;
  resource_id: number | string;
  resource_name: string;
  category: ResourceCategory;
  quantity_per_base_unit: number;
  // Custom resource fields
  custom_name: string;
  custom_category: ResourceCategory;
  custom_unit: string;
  custom_default_rate: number;
  rate_calc_type?: 'fixed' | 'percent_labour' | 'percent_equipment' | 'percent_material';
  is_tax_free?: boolean;
}

// Robust CSV Line Parser supporting quotes, escaped quotes, commas and tab separators
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === ',' || char === '\t') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export const NormsManagerView: React.FC<NormsManagerViewProps> = ({
  norms,
  setNorms,
  resources,
  setResources,
  isInitiationLocked = false,
  selectedZone
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<'ALL' | 'BLD' | 'RDS' | 'WRS' | 'CUSTOM'>('ALL');
  const [expandedNormId, setExpandedNormId] = useState<number | string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Consolidated More Dropdown State
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

  // Multi-select for Deletion (stored as string/number safely)
  const [selectedNormIds, setSelectedNormIds] = useState<(number | string)[]>([]);

  // Import / Add Library Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importTab, setImportTab] = useState<'CATALOG' | 'CSV'>('CATALOG');
  const [catalogDepartment, setCatalogDepartment] = useState<'ALL' | 'BLD' | 'RDS' | 'WRS' | 'CUSTOM'>('ALL');
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [selectedCatalogItemIds, setSelectedCatalogItemIds] = useState<number[]>([]);
  
  // CSV / Excel File Upload State
  const [csvText, setCsvText] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Main Norm Edit/Create Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingNorm, setEditingNorm] = useState<RateNormItem | null>(null);
  const [formState, setFormState] = useState<{
    code: string;
    description: string;
    source: string;
    base_unit: string;
    base_quantity: number;
    resources: NormResourceRowForm[];
  }>({
    code: '',
    description: '',
    source: 'Standard Building Norms',
    base_unit: 'Cu.m.',
    base_quantity: 1,
    resources: []
  });

  // SUB-MODAL: QUICK NEW RESOURCE
  const [isNewResourceSubModalOpen, setIsNewResourceSubModalOpen] = useState<boolean>(false);
  const [quickResourceForm, setQuickResourceForm] = useState<{
    name: string;
    category: ResourceCategory;
    unit: string;
    default_rate: number;
    quantity_per_base_unit: number;
    rate_calc_type?: 'fixed' | 'percent_labour' | 'percent_equipment' | 'percent_material';
    is_tax_free?: boolean;
  }>({
    name: '',
    category: 'Material',
    unit: 'Kg',
    default_rate: 100,
    quantity_per_base_unit: 1.0,
    rate_calc_type: 'fixed',
    is_tax_free: false
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Master Catalog collection combining all department standards
  const allCatalogNorms: RateNormItem[] = [
    ...BUILDING_NORMS,
    ...ROAD_NORMS,
    ...DWRI_IRRIGATION_NORMS,
    ...CUSTOM_NORMS_CATALOG
  ];

  // Active filtered list
  const filteredNorms = norms.filter((n) => {
    const matchesSearch =
      String(n.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(n.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(n.base_unit || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedDeptFilter === 'ALL') return true;
    if (selectedDeptFilter === 'BLD') return String(n.source || '').toLowerCase().includes('building');
    if (selectedDeptFilter === 'RDS') return String(n.source || '').toLowerCase().includes('road');
    if (selectedDeptFilter === 'WRS') return String(n.source || '').toLowerCase().includes('water') || String(n.source || '').toLowerCase().includes('irrigation') || String(n.source || '').toLowerCase().includes('water');
    if (selectedDeptFilter === 'CUSTOM') return String(n.source || '').toLowerCase().includes('custom');
    return true;
  });

  // Type-Safe Checkbox Selection Logic
  const handleToggleSelectNorm = (id: number | string) => {
    const idStr = String(id);
    setSelectedNormIds((prev) => {
      const exists = prev.some((i) => String(i) === idStr);
      if (exists) {
        return prev.filter((i) => String(i) !== idStr);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAllFiltered = () => {
    const filteredIdsStr = filteredNorms.map((n) => String(n.item_id));
    const selectedIdsStr = selectedNormIds.map(String);
    const allSelected = filteredIdsStr.length > 0 && filteredIdsStr.every((id) => selectedIdsStr.includes(id));

    if (allSelected) {
      setSelectedNormIds((prev) => prev.filter((id) => !filteredIdsStr.includes(String(id))));
    } else {
      const newSelections = filteredNorms.map((n) => n.item_id);
      const combined = Array.from(new Set([...selectedNormIds.map(String), ...newSelections.map(String)]));
      setSelectedNormIds(combined);
    }
  };

  // Robust Delete Handlers with initiation lock security
  const handleDeleteSingleNorm = (id: number | string, code: string) => {
    if (isInitiationLocked) {
      alert('Initiation data is locked. Password unlock is required to delete norms.');
      return;
    }
    const idStr = String(id);
    setNorms((prev) => prev.filter((n) => String(n.item_id) !== idStr));
    setSelectedNormIds((prev) => prev.filter((i) => String(i) !== idStr));
    showToast(`Deleted norm specification "${code}".`);
  };

  const handleDeleteSelectedNorms = () => {
    if (isInitiationLocked) {
      alert('Initiation data is locked. Password unlock is required to delete norms.');
      return;
    }
    if (selectedNormIds.length === 0) return;
    const selectedSet = new Set(selectedNormIds.map(String));
    const count = selectedSet.size;
    setNorms((prev) => prev.filter((n) => !selectedSet.has(String(n.item_id))));
    showToast(`Successfully deleted ${count} selected norm specification(s).`);
    setSelectedNormIds([]);
  };

  const handleDeleteSampleNorms = () => {
    if (isInitiationLocked) {
      alert('Initiation data is locked. Password unlock is required to delete norms.');
      return;
    }
    const remaining = norms.filter((n) => n.source.toLowerCase().includes('custom'));
    const removedCount = norms.length - remaining.length;
    setNorms(remaining);
    setSelectedNormIds([]);
    showToast(`Deleted ${removedCount} sample norms. ${remaining.length} custom norms retained.`);
  };

  const handleClearFilteredNorms = () => {
    if (isInitiationLocked) {
      alert('Initiation data is locked. Password unlock is required to clear norms.');
      return;
    }
    if (filteredNorms.length === 0) return;
    const filterLabel = selectedDeptFilter === 'ALL' ? 'all visible' : selectedDeptFilter;
    const idsToRemove = new Set(filteredNorms.map((f) => String(f.item_id)));
    const count = idsToRemove.size;
    setNorms((prev) => prev.filter((n) => !idsToRemove.has(String(n.item_id))));
    setSelectedNormIds((prev) => prev.filter((id) => !idsToRemove.has(String(id))));
    showToast(`Cleared ${count} ${filterLabel} norms.`);
  };

  const handleClearAll = () => {
    setNorms([]);
    setSelectedNormIds([]);
    showToast('Cleared all norms.');
  };

  // SINGLE & BULK IMPORT LOGIC
  const handleSingleImportNorm = (item: RateNormItem) => {
    const exists = norms.some((n) => n.code === item.code);
    if (exists) {
      if (!confirm(`Norm "${item.code}" already exists in active list. Add anyway?`)) {
        return;
      }
    }

    const newItem: RateNormItem = {
      ...item,
      item_id: Date.now() + Math.floor(Math.random() * 1000)
    };

    setNorms((prev) => [newItem, ...prev]);
    showToast(`Imported ${item.source} Norm "${item.code} - ${item.description.substring(0, 30)}..."`);
  };

  const handleBulkImportSelectedCatalogItems = () => {
    if (selectedCatalogItemIds.length === 0) {
      alert('Please select at least one norm item from the library.');
      return;
    }

    const itemsToImport = allCatalogNorms.filter((item) => selectedCatalogItemIds.includes(item.item_id));
    const newItems: RateNormItem[] = itemsToImport.map((item, idx) => ({
      ...item,
      item_id: Date.now() + idx + Math.floor(Math.random() * 1000)
    }));

    setNorms((prev) => [...newItems, ...prev]);
    setIsImportModalOpen(false);
    setSelectedCatalogItemIds([]);
    showToast(`Bulk imported ${newItems.length} norm specifications!`);
  };

  const handleBulkImportDepartment = (dept: 'BLD' | 'RDS' | 'WRS' | 'CUSTOM' | 'ALL') => {
    let sourceList: RateNormItem[] = [];
    let deptName = '';

    if (dept === 'BLD') {
      sourceList = BUILDING_NORMS;
      deptName = 'Building';
    } else if (dept === 'RDS') {
      sourceList = ROAD_NORMS;
      deptName = 'RDS Road';
    } else if (dept === 'WRS') {
      sourceList = DWRI_IRRIGATION_NORMS;
      deptName = 'WRS Irrigation';
    } else if (dept === 'CUSTOM') {
      sourceList = CUSTOM_NORMS_CATALOG;
      deptName = 'Custom';
    } else {
      sourceList = allCatalogNorms;
      deptName = 'All Catalog';
    }

    const newItems: RateNormItem[] = sourceList.map((item, idx) => ({
      ...item,
      item_id: Date.now() + idx + Math.floor(Math.random() * 1000)
    }));

    setNorms((prev) => [...newItems, ...prev]);
    setIsImportModalOpen(false);
    showToast(`Bulk imported all ${newItems.length} ${deptName} Norm Specifications!`);
  };

  // FILE UPLOAD HANDLER FOR CSV / EXCEL
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    setUploadedFileName(file.name);
    setUploadedFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCsvText(text);
        showToast(`Loaded ${file.name} successfully! Click "Parse & Import CSV Norms" below.`);
      }
    };
    reader.onerror = () => {
      alert('Failed to read file content. Please select a valid CSV or text file.');
    };
    reader.readAsText(file);
  };

  // CSV Import Parser with Dynamic Column Detection and Multi-Resource Grouping
  const handleProcessCSVImport = () => {
    if (!csvText.trim()) {
      alert('Please select a CSV file or paste CSV text content.');
      return;
    }

    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      alert('CSV must contain a header line and at least one data row.');
      return;
    }

    const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/["']/g, '').trim());

    // Helper to locate dynamic column positions with exclude filter and prevent column index collisions
    const claimedCols = new Set<number>();
    const findCol = (keywords: string[], excludeKeywords: string[], fallbackIdx: number) => {
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

    const colCode = findCol(['norm code', 'item code', 'work code', 'code'], ['res', 'resource', 'mat', 'lab', 'eq'], 0);
    const colDesc = findCol(['description', 'desc', 'specification', 'particulars', 'work description', 'item description', 'name of work'], ['unit', 'qty', 'code', 'res', 'resource'], 1);
    const colSource = findCol(['source', 'authority', 'department', 'reference', 'ref'], ['res', 'resource', 'code'], 2);
    const colBaseUnit = findCol(['base unit', 'norm unit', 'work unit', 'item unit'], ['res', 'resource', 'mat', 'labor', 'eq', 'qty', 'quantity', 'rate', 'per', 'coeff'], 3);
    const colBaseQty = findCol(['base quantity', 'base qty', 'norm quantity', 'norm qty', 'work quantity', 'work qty', 'output quantity', 'output qty', 'quantity', 'qty'], ['res', 'resource', 'mat', 'labor', 'eq', 'coeff', 'per', 'unit'], 4);
    const colResCode = findCol(['resource code', 'res code', 'material code', 'labor code', 'eq code', 'item code', 'id'], ['norm', 'work', 'name', 'desc'], 5);
    let colResName = findCol(['resource name', 'res name', 'material name', 'labor name', 'equipment name', 'particulars', 'name', 'resource', 'component'], ['code', 'id', 'cat', 'type', 'unit', 'qty'], 6);

    if (colResName === colResCode && header.length > 6) {
      colResName = 6;
    }

    const colResCat = findCol(['resource category', 'category', 'type', 'group'], [], 7);
    const colQtyPerBase = findCol(['qty per base unit', 'coefficient', 'resource quantity', 'res quantity', 'res qty', 'resource qty', 'quantity', 'norm qty', 'qty', 'consumption', 'factor', 'amount'], ['base', 'work', 'output'], 8);
    const colResUnit = findCol(['unit for material', 'resource unit', 'res unit', 'material unit', 'labor unit', 'unit', 'uom'], ['base', 'norm', 'work', 'rate', 'price'], 9);
    const colRate = findCol(['default rate', 'zone rate', 'rate', 'price', 'cost', 'amount'], [], 10);
    const colCalcType = findCol(['calc type', 'rate calc type', 'calc mode', 'calculation type', 'percent calc', 'mode'], [], -1);
    const colIsTaxFree = findCol(['tax free', 'is tax free', 'tax exempt', 'tax free', 'exempt'], [], -1);

    const hasAnyHeaderMatch = claimedCols.size > 0;
    const startIdx = hasAnyHeaderMatch ? 1 : 0;

    // Map rows by Norm Code
    const normGroupMap: {
      [code: string]: {
        code: string;
        desc: string;
        source: string;
        unit: string;
        baseQty: number;
        resources: any[];
      };
    } = {};

    const newlyDiscoveredMasterResources: ResourceMaster[] = [];

    for (let i = startIdx; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      if (row.length < 2) continue;

      const code = row[colCode] || `CSV-${i}`;
      const desc = row[colDesc] || 'Imported Work Specification';
      const source = row[colSource] || 'Custom CSV Import';
      const unit = row[colBaseUnit] || 'Cu.m.';
      const baseQty = parseFloat(row[colBaseQty]) || 1.0;

      const resCode = row[colResCode] || `RES-${i}`;
      const resName = row[colResName] || 'Labor / Material Component';
      const rawCat = row[colResCat] || 'Material';
      
      let resCategory: ResourceCategory = 'Material';
      const catLower = String(rawCat || '').toLowerCase();
      if (catLower.includes('lab') || catLower.includes('man') || catLower.includes('worker')) {
        resCategory = 'Labor';
      } else if (catLower.includes('eq') || catLower.includes('plant') || catLower.includes('machin')) {
        resCategory = 'Equipment';
      } else if (catLower.includes('trans') || catLower.includes('haul')) {
        resCategory = 'Transport';
      } else {
        resCategory = 'Material';
      }

      const qtyPerUnit = parseFloat(row[colQtyPerBase]) || 1.0;
      const resUnit = row[colResUnit] || 'Unit';
      const defaultRate = parseFloat(row[colRate]) || getDefaultResourceRate(resName, resCategory, resUnit);

      if (!normGroupMap[code]) {
        normGroupMap[code] = {
          code,
          desc,
          source,
          unit,
          baseQty,
          resources: []
        };
      }

      // Check if this resource already exists in master resources
      const existingResource = (resources || []).find(
        (r) =>
          (r.name && resName && String(r.name).toLowerCase().trim() === String(resName).toLowerCase().trim()) ||
          (resCode && r.code && String(r.code).toLowerCase().trim() === String(resCode).toLowerCase().trim())
      );

      const effectiveResId = existingResource ? existingResource.resource_id : (Date.now() + Math.floor(Math.random() * 1000000) + i);
      const rawResName = resName ? String(resName).trim() : '';
      const isGenericResName = !rawResName || /^res\-\d+/i.test(rawResName) || /^resource\-\d+/i.test(rawResName) || rawResName.toLowerCase() === 'labor / material component' || rawResName.toLowerCase() === 'resource component';
      const effectiveResName = (!isGenericResName && rawResName) ? rawResName : (existingResource ? existingResource.name : resName);

      const rawCalcType = colCalcType !== -1 ? String(row[colCalcType] || '').toLowerCase() : '';
      let parsedCalcType: 'fixed' | 'percent_labour' | 'percent_equipment' | 'percent_material' = 'fixed';
      if (rawCalcType.includes('percent_labour') || (rawCalcType.includes('lab') && rawCalcType.includes('percent'))) {
        parsedCalcType = 'percent_labour';
      } else if (rawCalcType.includes('percent_equipment') || ((rawCalcType.includes('eq') || rawCalcType.includes('plant')) && rawCalcType.includes('percent'))) {
        parsedCalcType = 'percent_equipment';
      } else if (rawCalcType.includes('percent_material') || (rawCalcType.includes('mat') && rawCalcType.includes('percent'))) {
        parsedCalcType = 'percent_material';
      } else {
        parsedCalcType = inferRateCalcType(effectiveResName, resUnit, resCategory);
      }

      const rawTaxFree = colIsTaxFree !== -1 ? String(row[colIsTaxFree] || '').toLowerCase() : '';
      const parsedIsTaxFree = ['true', '1', 'yes', 'y', 'tax_free', 'tax free', 'taxfree'].includes(rawTaxFree) ||
        inferIsTaxFree(effectiveResName, resUnit);

      normGroupMap[code].resources.push({
        resource_id: effectiveResId,
        code: resCode,
        resource_name: effectiveResName,
        category: resCategory,
        quantity_per_base_unit: qtyPerUnit,
        unit_override: resUnit,
        default_rate: defaultRate,
        rate_calc_type: parsedCalcType,
        is_tax_free: parsedIsTaxFree
      });

      // Register to Master Rates or update existing rate if provided
      if (resName && resName !== 'Labor / Material Component') {
        if (!existingResource) {
          const distRates: Record<string, number> = {};
          if (defaultRate > 0) {
            if (selectedZone?.id) distRates[selectedZone.id] = defaultRate;
            if (selectedZone?.name_en) distRates[selectedZone.name_en] = defaultRate;
          }
          newlyDiscoveredMasterResources.push({
            resource_id: effectiveResId,
            code: resCode,
            name: effectiveResName,
            category: resCategory,
            unit: resUnit,
            default_rate: defaultRate,
            rate_calc_type: parsedCalcType,
            is_tax_free: parsedIsTaxFree,
            zone_rates: Object.keys(distRates).length > 0 ? distRates : undefined
          });
        }
      }
    }

    const importedNorms: RateNormItem[] = Object.values(normGroupMap).map((item, idx) => ({
      item_id: Date.now() + idx,
      code: item.code,
      description: item.desc,
      source: item.source,
      base_unit: item.unit,
      base_quantity: item.baseQty,
      resources: item.resources
    }));

    if (importedNorms.length === 0) {
      alert('No valid norm formulas could be parsed from the CSV input. Please check the CSV format.');
      return;
    }

    if (setResources) {
      setResources((prev) => {
        // Collect rate updates from imported norm resources
        const uploadedRatesMap = new Map<string, number>();
        importedNorms.forEach((norm) => {
          norm.resources.forEach((r) => {
            if (r.default_rate && r.default_rate > 0) {
              if (r.resource_name) uploadedRatesMap.set(String(r.resource_name).toLowerCase().trim(), r.default_rate);
              if (r.code) uploadedRatesMap.set(String(r.code).toLowerCase().trim(), r.default_rate);
            }
          });
        });

        // Update existing resources with uploaded rates if provided
        const updatedPrev = prev.map((item) => {
          const nameKey = String(item.name || '').toLowerCase().trim();
          const codeKey = item.code ? String(item.code).toLowerCase().trim() : '';
          const newRate = uploadedRatesMap.get(nameKey) || (codeKey ? uploadedRatesMap.get(codeKey) : undefined);
          if (newRate && newRate > 0) {
            const updatedZoneRates = { ...(item.zone_rates || {}) };
            if (selectedZone?.id) updatedZoneRates[selectedZone.id] = newRate;
            if (selectedZone?.name_en) updatedZoneRates[selectedZone.name_en] = newRate;
            return {
              ...item,
              default_rate: newRate,
              zone_rates: updatedZoneRates
            };
          }
          return item;
        });

        const existingNames = new Set(updatedPrev.map((r) => String(r.name || '').toLowerCase().trim()));
        const uniqueNew = newlyDiscoveredMasterResources.filter((r) => !existingNames.has(String(r.name || '').toLowerCase().trim()));
        return [...uniqueNew, ...updatedPrev];
      });
    }

    setNorms((prev) => [...importedNorms, ...prev]);
    setIsImportModalOpen(false);
    setCsvText('');
    setUploadedFileName(null);
    setUploadedFileSize(null);
    showToast(`Successfully imported ${importedNorms.length} norm specifications from CSV!`);
  };

  // Open Edit Modal
  const handleOpenAddModal = () => {
    setEditingNorm(null);
    const defaultRes = resources[0] || { resource_id: 101, name: 'Default Resource Item', category: 'Labor' };
    setFormState({
      code: `12.${norms.length + 1}`,
      description: '',
      source: 'Custom Norms',
      base_unit: 'Cu.m.',
      base_quantity: 1,
      resources: [
        {
          is_custom: false,
          resource_id: defaultRes.resource_id,
          resource_name: defaultRes.name,
          category: defaultRes.category,
          quantity_per_base_unit: 1.0,
          custom_name: '',
          custom_category: 'Material',
          custom_unit: 'Cu.m.',
          custom_default_rate: 0
        }
      ]
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (norm: RateNormItem) => {
    setEditingNorm(norm);
    setFormState({
      code: norm.code,
      description: norm.description,
      source: norm.source,
      base_unit: norm.base_unit,
      base_quantity: norm.base_quantity,
      resources: norm.resources.map((r) => {
        const matched = resources.find(
          (m) =>
            String(m.resource_id) === String(r.resource_id) ||
            (m.name && r.resource_name && normalizeResourceName(m.name) === normalizeResourceName(r.resource_name)) ||
            (m.code && r.code && String(m.code).toLowerCase().replace(/^dr\-/, '').trim() === String(r.code).toLowerCase().replace(/^dr\-/, '').trim())
        );
        const effectiveId = matched ? matched.resource_id : r.resource_id;
        const effectiveName = matched ? matched.name : (r.resource_name || 'Resource');
        const effectiveCat = matched ? matched.category : (r.category || 'Material');

        return {
          is_custom: false,
          resource_id: effectiveId,
          resource_name: effectiveName,
          category: effectiveCat,
          quantity_per_base_unit: r.quantity_per_base_unit,
          custom_name: '',
          custom_category: effectiveCat,
          custom_unit: 'Unit',
          custom_default_rate: 0
        };
      })
    });
    setIsModalOpen(true);
  };

  const handleAddExistingResourceRow = () => {
    const fallback = resources[0] || { resource_id: 101, name: 'Default Resource Item', category: 'Labor' };
    setFormState((prev) => ({
      ...prev,
      resources: [
        ...prev.resources,
        {
          is_custom: false,
          resource_id: fallback.resource_id,
          resource_name: fallback.name,
          category: fallback.category,
          quantity_per_base_unit: 1.0,
          custom_name: '',
          custom_category: 'Material',
          custom_unit: 'Cu.m.',
          custom_default_rate: 0
        }
      ]
    }));
  };

  const handleSaveQuickNewResource = () => {
    if (!quickResourceForm.name.trim()) {
      alert('Please enter a Resource Name (e.g. High-Tensile Rebar, Hydro Cement).');
      return;
    }

    const newResId = Date.now();
    const newMasterRes: ResourceMaster = {
      resource_id: newResId,
      name: quickResourceForm.name.trim(),
      category: quickResourceForm.category,
      unit: quickResourceForm.unit.trim() || 'Unit',
      default_rate: Number(quickResourceForm.default_rate) || 0,
      code: `DR-${quickResourceForm.category.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`
    };

    if (setResources) {
      setResources((prev) => [newMasterRes, ...prev]);
    }

    setFormState((prev) => ({
      ...prev,
      resources: [
        ...prev.resources,
        {
          is_custom: false,
          resource_id: newMasterRes.resource_id,
          resource_name: newMasterRes.name,
          category: newMasterRes.category,
          quantity_per_base_unit: Number(quickResourceForm.quantity_per_base_unit) || 1.0,
          custom_name: '',
          custom_category: newMasterRes.category,
          custom_unit: newMasterRes.unit,
          custom_default_rate: newMasterRes.default_rate
        }
      ]
    }));

    setIsNewResourceSubModalOpen(false);
    setQuickResourceForm({
      name: '',
      category: 'Material',
      unit: 'Kg',
      default_rate: 100,
      quantity_per_base_unit: 1.0
    });

    showToast(`Added new ${newMasterRes.category} "${newMasterRes.name}" to Master Rates.`);
  };

  const handleSaveNorm = () => {
    if (!formState.code.trim() || !formState.description.trim()) {
      alert('Please fill in Item Code and Description.');
      return;
    }

    if (formState.resources.length === 0) {
      alert('Please add at least one resource component to this norm formula.');
      return;
    }

    const newlyCreatedMasterResources: ResourceMaster[] = [];

    const finalNormResources = formState.resources.map((row) => {
      if (row.is_custom) {
        const resName = row.custom_name.trim() || 'Custom Component';
        const newResId = Date.now() + Math.floor(Math.random() * 10000);
        const newResObj: ResourceMaster = {
          resource_id: newResId,
          name: resName,
          category: row.custom_category,
          unit: row.custom_unit.trim() || 'Unit',
          default_rate: Number(row.custom_default_rate) || 0,
          code: `DR-${row.custom_category.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`
        };
        newlyCreatedMasterResources.push(newResObj);

        return {
          resource_id: newResId,
          resource_name: resName,
          category: row.custom_category,
          quantity_per_base_unit: Number(row.quantity_per_base_unit) || 1.0
        };
      } else {
        return {
          resource_id: row.resource_id,
          resource_name: row.resource_name,
          category: row.category,
          quantity_per_base_unit: Number(row.quantity_per_base_unit) || 1.0
        };
      }
    });

    if (newlyCreatedMasterResources.length > 0 && setResources) {
      setResources((prev) => [...newlyCreatedMasterResources, ...prev]);
    }

    if (editingNorm) {
      setNorms((prev) =>
        prev.map((n) =>
          String(n.item_id) === String(editingNorm.item_id)
            ? {
                ...n,
                code: formState.code.trim(),
                description: formState.description.trim(),
                source: formState.source.trim() || 'Custom Norms',
                base_unit: formState.base_unit.trim() || 'Cu.m.',
                base_quantity: Number(formState.base_quantity) || 1,
                resources: finalNormResources
              }
            : n
        )
      );
      showToast(`Updated norm specification "${formState.code}".`);
    } else {
      const newNorm: RateNormItem = {
        item_id: Date.now(),
        code: formState.code.trim(),
        description: formState.description.trim(),
        source: formState.source.trim() || 'Custom Norms',
        base_unit: formState.base_unit.trim() || 'Cu.m.',
        base_quantity: Number(formState.base_quantity) || 1,
        resources: finalNormResources
      };
      setNorms((prev) => [newNorm, ...prev]);
      showToast(`Added new norm specification "${newNorm.code}".`);
    }

    setIsModalOpen(false);
  };

  // CSV TEMPLATE DOWNLOAD WITH ALL REQUIRED HEADINGS
  const handleDownloadTemplate = () => {
    const csvContent =
      'Norm Code,Description,Source,Base Unit,Base Quantity,Resource Code,Resource Name,Resource Category,Qty Per Base Unit,Unit For Material/Labor,Plants and Equipments,Default Rate\n' +
      '"2.4","First class brickwork in 1:6 cement sand mortar in foundation and superstructure","Building","Cu.m.",1,"LAB-01","Unskilled Labor","Labor",0.70,"Manday",850\n' +
      '"2.4","First class brickwork in 1:6 cement sand mortar in foundation and superstructure","Building","Cu.m.",1,"LAB-02","Skilled Mason","Labor",0.35,"Manday",1250\n' +
      '"2.4","First class brickwork in 1:6 cement sand mortar in foundation and superstructure","Building","Cu.m.",1,"MAT-01","OPC Cement 53 Grade","Material",1.05,"Bag",750\n' +
      '"2.4","First class brickwork in 1:6 cement sand mortar in foundation and superstructure","Building","Cu.m.",1,"MAT-02","Washed River Sand","Material",0.23,"Cu.m.",2400\n' +
      '"2.4","First class brickwork in 1:6 cement sand mortar in foundation and superstructure","Building","Cu.m.",1,"MAT-05","First Class Local Bricks","Material",480.00,"Pcs",18\n' +
      '"12.1","100mm RCC Slab M20 Concrete with shuttering & compaction","Custom Norms","Sq.m.",1,"LAB-01","Unskilled Labor","Labor",0.45,"Manday",850\n' +
      '"12.1","100mm RCC Slab M20 Concrete with shuttering & compaction","Custom Norms","Sq.m.",1,"EQP-01","Concrete Mixer Machine","Equipment",0.12,"Hour",1200\n';

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Custom_Norm_Specifications_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryBadge = (cat: ResourceCategory) => {
    switch (cat) {
      case 'Labor':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
            <Hammer className="w-3 h-3 text-amber-600" /> Labor
          </span>
        );
      case 'Material':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
            <Box className="w-3 h-3 text-blue-600" /> Material
          </span>
        );
      case 'Equipment':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
            <Wrench className="w-3 h-3 text-purple-600" /> Equipment
          </span>
        );
      case 'Transport':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
            <Truck className="w-3 h-3 text-emerald-600" /> Transport
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
            {cat}
          </span>
        );
    }
  };

  // Filter Catalog Items for Import Modal
  const filteredCatalogNorms = allCatalogNorms.filter((item) => {
    const matchesSearch =
      String(item.code || '').toLowerCase().includes(catalogSearch.toLowerCase()) ||
      String(item.description || '').toLowerCase().includes(catalogSearch.toLowerCase()) ||
      String(item.base_unit || '').toLowerCase().includes(catalogSearch.toLowerCase());

    if (!matchesSearch) return false;
    if (catalogDepartment === 'ALL') return true;
    if (catalogDepartment === 'BLD') return String(item.source || '').toLowerCase().includes('building');
    if (catalogDepartment === 'RDS') return String(item.source || '').toLowerCase().includes('road');
    if (catalogDepartment === 'WRS') return String(item.source || '').toLowerCase().includes('water') || String(item.source || '').toLowerCase().includes('irrigation');
    if (catalogDepartment === 'CUSTOM') return String(item.source || '').toLowerCase().includes('custom');
    return true;
  });

  // Listen to Ribbon events
  useEffect(() => {
    const handleAdd = () => handleOpenAddModal();
    const handleImport = () => setIsImportModalOpen(true);
    const handleDownload = () => handleDownloadTemplate();
    const handleDeleteSel = () => handleDeleteSelectedNorms();
    const handleDeleteSamp = () => handleDeleteSampleNorms();
    const handleFilterDept = (e: any) => {
      const dept = typeof e.detail === 'object' && e.detail?.dept ? e.detail.dept : e.detail;
      if (dept) setSelectedDeptFilter(dept);
    };
    const handleSearch = (e: any) => {
      const query = typeof e.detail === 'object' && e.detail?.query ? e.detail.query : e.detail;
      setSearchQuery(query || '');
    };

    window.addEventListener('uev:norms-add', handleAdd);
    window.addEventListener('uev:norms-import', handleImport);
    window.addEventListener('uev:norms-download-template', handleDownload);
    window.addEventListener('uev:norms-delete-selected', handleDeleteSel);
    window.addEventListener('uev:norms-delete-sample', handleDeleteSamp);
    window.addEventListener('uev:norms-filter-dept', handleFilterDept);
    window.addEventListener('uev:norms-search', handleSearch);

    return () => {
      window.removeEventListener('uev:norms-add', handleAdd);
      window.removeEventListener('uev:norms-import', handleImport);
      window.removeEventListener('uev:norms-download-template', handleDownload);
      window.removeEventListener('uev:norms-delete-selected', handleDeleteSel);
      window.removeEventListener('uev:norms-delete-sample', handleDeleteSamp);
      window.removeEventListener('uev:norms-filter-dept', handleFilterDept);
      window.removeEventListener('uev:norms-search', handleSearch);
    };
  }, [handleOpenAddModal, handleDownloadTemplate, handleDeleteSelectedNorms, handleDeleteSampleNorms]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2 border border-slate-700 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Banner for Selected Items Multi-Deletion */}
      {selectedNormIds.length > 0 && (
        <div className="bg-rose-900 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between border border-rose-700 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckSquare className="w-5 h-5 text-rose-300" />
            <div>
              <span className="text-xs font-bold block">{selectedNormIds.length} Norm Specification(s) Selected</span>
              <span className="text-[11px] text-rose-200">Click Delete Selected to permanently remove them from active list</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteSelectedNorms}
              className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected ({selectedNormIds.length})
            </button>
            <button
              onClick={() => setSelectedNormIds([])}
              className="text-xs text-rose-200 hover:text-white px-3 py-2 font-semibold transition"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Norms List Table or Empty Slate */}
      {filteredNorms.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-600">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No Norm Specifications Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              You can import standard BLD, RDS, WRS official norms in bulk or single items, upload a CSV file, or build custom norm formulas from scratch.
            </p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition flex items-center gap-1.5"
            >
              <FolderPlus className="w-4 h-4" />
              Import Norms CSV / Excel File
            </button>
            <button
              onClick={handleOpenAddModal}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-300 transition"
            >
              + Create Single Custom Norm Spec
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800 text-white font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <button
                      onClick={handleSelectAllFiltered}
                      className="text-slate-300 hover:text-white"
                      title="Select / Deselect all visible"
                    >
                      {filteredNorms.length > 0 &&
                      filteredNorms.every((n) => selectedNormIds.map(String).includes(String(n.item_id))) ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3">Item Code</th>
                  <th className="p-3">Source / Authority</th>
                  <th className="p-3">Work Specification Description</th>
                  <th className="p-3 text-center">Base Unit</th>
                  <th className="p-3 text-right">Resource Components</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredNorms.map((n, idx) => {
                  const isExpanded = String(expandedNormId) === String(n.item_id);
                  const isChecked = selectedNormIds.map(String).includes(String(n.item_id));

                  return (
                    <React.Fragment key={`${n.item_id}_${n.code}_${idx}`}>
                      <tr className={`hover:bg-slate-50 transition ${isChecked ? 'bg-indigo-50/50' : ''}`}>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleSelectNorm(n.item_id)}
                            className="text-slate-500 hover:text-slate-800"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-700">{n.code}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              String(n.source || '').toLowerCase().includes('building')
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : String(n.source || '').toLowerCase().includes('road')
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : String(n.source || '').toLowerCase().includes('water')
                                ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {n.source}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900 leading-snug">{n.description}</td>
                        <td className="p-3 text-center font-mono text-slate-600">{n.base_unit}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800">
                          {n.resources.length} items
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setExpandedNormId(isExpanded ? null : n.item_id)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-semibold text-[11px] flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              {isExpanded ? 'Hide' : 'Inspect Formula'}
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(n)}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition"
                              title="Edit Formula"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteSingleNorm(n.item_id, n.code)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition"
                              title="Delete this Norm Specification"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Breakdown */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={7} className="p-4 border-t border-b border-slate-200">
                            <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                              <div className="flex justify-between items-center text-xs font-bold text-slate-800 border-b pb-2">
                                <span>Resource Coefficients for Item {n.code} ({n.source})</span>
                                <span className="text-slate-500 font-normal">Base Norm Qty: {n.base_quantity} {n.base_unit}</span>
                              </div>
                              <table className="w-full text-xs">
                                <thead className="text-[10px] uppercase bg-slate-100 font-semibold text-slate-600">
                                  <tr>
                                    <th className="p-2 text-left">Resource Component</th>
                                    <th className="p-2 text-left">Category</th>
                                    <th className="p-2 text-right">Coefficient (Qty per {n.base_unit})</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {n.resources.map((res, ridx) => (
                                    <tr key={ridx} className="hover:bg-slate-50">
                                      <td className="p-2 font-medium text-slate-900">{res.resource_name}</td>
                                      <td className="p-2">{getCategoryBadge(res.category)}</td>
                                      <td className="p-2 text-right font-mono font-bold text-blue-700">
                                        {res.quantity_per_base_unit}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: SINGLE & BULK IMPORT BLD, RDS, WRS & CUSTOM NORMS */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-indigo-600" />
                  Import / Load Rate Norms Library
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Load preloaded norms from library folders or upload custom CSV / Excel files.
                </p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold text-base">
                ✕
              </button>
            </div>

            {/* Modal Import Header */}
            <div className="flex border-b border-slate-200 text-xs font-bold">
              <div className="px-4 py-2 border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/50 flex items-center gap-1">
                📄 Bulk CSV / Excel File Upload
              </div>
            </div>

            {/* BULK CSV / EXCEL FILE UPLOAD WITH DRAG & DROP & FULL HEADINGS */}
            <div className="space-y-4">
                {/* Required CSV Headings Info Banner */}
                <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-950 space-y-2">
                  <div className="flex items-center justify-between font-bold text-blue-900">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                      <span>CSV / Excel Standard Headings & Formula Guide:</span>
                    </div>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono font-bold">
                      Rate Engine Supported
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-blue-200 font-mono text-[10px] overflow-x-auto text-slate-800">
                    Norm Code | Description | Source | Base Unit | Base Quantity | Resource Code | Resource Name | Resource Category | Qty Per Base Unit | Unit | Default Rate | Rate Calc Type | Tax Free
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-slate-700 bg-white/70 p-2 rounded-lg border border-blue-100">
                    <div>
                      <strong className="text-purple-900 font-bold block mb-0.5">1. Percentage Norms (e.g., 3% or 4% of Labor/Equipment):</strong>
                      Set <code className="bg-purple-50 px-1 py-0.5 text-purple-900 font-bold">Rate Calc Type</code> to <code className="text-purple-700 font-mono">percent_labour</code> or <code className="text-purple-700 font-mono">percent_equipment</code>, and set <code className="font-bold">Qty Per Base Unit</code> to <code className="font-mono font-bold">0.03</code> or <code className="font-mono font-bold">0.04</code>.
                    </div>
                    <div>
                      <strong className="text-emerald-900 font-bold block mb-0.5">2. Tax Free / Exempt Items:</strong>
                      Set <code className="bg-emerald-50 px-1 py-0.5 text-emerald-900 font-bold">Tax Free</code> column to <code className="text-emerald-700 font-mono">true</code>, or add <code className="font-bold">"Tax Free"</code> in Resource Name. Exempt from 13% material Tax in Govt mode.
                    </div>
                  </div>
                  <p className="text-[10px] text-blue-800 leading-relaxed font-medium">
                    * Multiple rows sharing the same <strong>Norm Code</strong> will automatically be grouped into a single multi-component Norm Specification breakdown formula in <code className="font-mono font-bold">src/services/rateEngine.ts</code>!
                  </p>
                </div>

                {/* Drag and Drop File Upload Area */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDropFile}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 ${
                    isDraggingFile
                      ? 'border-indigo-600 bg-indigo-50/80'
                      : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-slate-100/60'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv,.txt,.xlsx,.xls"
                    className="hidden"
                  />
                  <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Click to Browse CSV / Excel File or Drag & Drop Here
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Supports .csv, .txt, .xlsx files exported from Excel
                    </p>
                  </div>
                  {uploadedFileName && (
                    <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2 mt-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>{uploadedFileName} ({uploadedFileSize})</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap justify-between items-center pt-2 gap-3 border-t">
                  <button
                    onClick={handleDownloadTemplate}
                    className="bg-slate-100 hover:bg-slate-200 text-indigo-700 font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-300 transition flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4 text-indigo-600" />
                    Download Custom CSV Norms Template
                  </button>

                  <button
                    onClick={handleProcessCSVImport}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Parse & Import Uploaded CSV Norms →
                  </button>
                </div>
              </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE / EDIT SINGLE NORM SPECIFICATION */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                {editingNorm ? `Edit Norm Specification (${editingNorm.code})` : 'Create Single Custom Norm Specification'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Item Code</label>
                <input
                  type="text"
                  value={formState.code}
                  onChange={(e) => setFormState({ ...formState, code: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-mono font-bold text-blue-700 bg-slate-50 focus:bg-white"
                  placeholder="e.g. 2.4 or 12.1"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Base Unit</label>
                <input
                  type="text"
                  value={formState.base_unit}
                  onChange={(e) => setFormState({ ...formState, base_unit: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-mono bg-slate-50 focus:bg-white"
                  placeholder="e.g. Cu.m., Sq.m., Kg, Metre"
                />
              </div>

              <div className="col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Specification Work Description</label>
                <textarea
                  rows={2}
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 focus:bg-white font-medium"
                  placeholder="e.g. First class brickwork in 1:6 cement sand mortar in foundation and superstructure..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Norm Source / Authority</label>
                <input
                  type="text"
                  value={formState.source}
                  onChange={(e) => setFormState({ ...formState, source: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 focus:bg-white"
                  placeholder="e.g. Standard Building Norms, RDS Road Norms, Custom"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Base Norm Quantity</label>
                <input
                  type="number"
                  step="0.1"
                  value={formState.base_quantity}
                  onChange={(e) => setFormState({ ...formState, base_quantity: parseFloat(e.target.value) || 1 })}
                  className="w-full p-2.5 border rounded-xl font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            {/* Resource Composition Breakdown Section */}
            <div className="space-y-3 pt-3 border-t">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Resource Breakdown Components</span>
                  <span className="text-[11px] text-slate-500">
                    Choose existing materials/labor/equipment or create new ones on the fly!
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddExistingResourceRow}
                    className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Pick Existing
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsNewResourceSubModalOpen(true)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    ✨ + New Material / Labor
                  </button>
                </div>
              </div>

              {/* Composition Table */}
              <div className="border rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 uppercase text-[10px] font-semibold text-slate-600 sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5">Resource Selection / Input</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5 text-right">Coefficient (Qty per {formState.base_unit || 'Unit'})</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {formState.resources.map((resRow, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="p-2.5 min-w-[280px]">
                          {!resRow.is_custom ? (
                            <div className="space-y-1">
                              {(() => {
                                const currentIdStr = String(resRow.resource_id);
                                const existsInMaster = resources.some((r) => String(r.resource_id) === currentIdStr);

                                return (
                                  <select
                                    value={currentIdStr}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === '__CREATE_NEW__') {
                                        const updated = [...formState.resources];
                                        updated[idx] = {
                                          ...updated[idx],
                                          is_custom: true,
                                          custom_name: resRow.resource_name || '',
                                          custom_category: resRow.category || 'Material',
                                          custom_unit: 'Unit',
                                          custom_default_rate: 0
                                        };
                                        setFormState({ ...formState, resources: updated });
                                      } else {
                                        const match = resources.find((r) => String(r.resource_id) === value);
                                        const updated = [...formState.resources];
                                        updated[idx] = {
                                          ...updated[idx],
                                          resource_id: match ? match.resource_id : (isNaN(Number(value)) ? (value as any) : Number(value)),
                                          resource_name: match?.name || resRow.resource_name || 'Resource',
                                          category: match?.category || resRow.category || 'Material'
                                        };
                                        setFormState({ ...formState, resources: updated });
                                      }
                                    }}
                                    className="w-full p-2 border rounded-xl bg-white font-medium text-xs text-slate-800 border-slate-300 focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="__CREATE_NEW__" className="font-bold text-emerald-700 bg-emerald-50">
                                      ✨ + Create New Material / Labor / Equipment...
                                    </option>
                                    {!existsInMaster && resRow.resource_name && (
                                      <option value={currentIdStr} className="font-bold text-blue-700">
                                        📌 {resRow.resource_name} ({resRow.category || 'Uploaded Resource'})
                                      </option>
                                    )}
                                    <optgroup label="Select from Master Rates">
                                      {resources.map((r, rIdx) => (
                                        <option key={`${r.resource_id}_${rIdx}`} value={String(r.resource_id)}>
                                          {r.name} ({r.category} - {r.unit})
                                        </option>
                                      ))}
                                    </optgroup>
                                  </select>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="space-y-2 p-2 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                              <div className="flex justify-between items-center text-[11px] font-bold text-emerald-900">
                                <span className="flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-emerald-600" />
                                  New Custom Resource
                                </span>
                              </div>

                              <input
                                type="text"
                                placeholder="Resource Name (e.g. Epoxy Primer)"
                                value={resRow.custom_name}
                                onChange={(e) => {
                                  const updated = [...formState.resources];
                                  updated[idx].custom_name = e.target.value;
                                  setFormState({ ...formState, resources: updated });
                                }}
                                className="w-full p-1.5 border rounded-lg text-xs bg-white font-medium"
                              />

                              <div className="grid grid-cols-2 gap-1.5">
                                <select
                                  value={resRow.custom_category}
                                  onChange={(e) => {
                                    const updated = [...formState.resources];
                                    updated[idx].custom_category = e.target.value as ResourceCategory;
                                    setFormState({ ...formState, resources: updated });
                                  }}
                                  className="p-1 border rounded-lg text-[11px] bg-white font-semibold text-slate-700"
                                >
                                  <option value="Material">Material</option>
                                  <option value="Labor">Labor</option>
                                  <option value="Equipment">Equipment</option>
                                  <option value="Transport">Transport</option>
                                </select>

                                <input
                                  type="text"
                                  placeholder="Unit (e.g. Litre, Kg)"
                                  value={resRow.custom_unit}
                                  onChange={(e) => {
                                    const updated = [...formState.resources];
                                    updated[idx].custom_unit = e.target.value;
                                    setFormState({ ...formState, resources: updated });
                                  }}
                                  className="p-1 border rounded-lg text-[11px] bg-white"
                                />
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="p-2.5">
                          {resRow.is_custom ? (
                            getCategoryBadge(resRow.custom_category)
                          ) : (
                            getCategoryBadge(resRow.category)
                          )}
                        </td>

                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            step="0.0001"
                            value={resRow.quantity_per_base_unit}
                            onChange={(e) => {
                              const updated = [...formState.resources];
                              updated[idx].quantity_per_base_unit = parseFloat(e.target.value) || 0;
                              setFormState({ ...formState, resources: updated });
                            }}
                            className="w-28 p-1.5 border rounded-xl text-right font-mono font-bold text-blue-700 bg-white focus:ring-2 focus:ring-blue-500"
                          />
                        </td>

                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = formState.resources.filter((_, i) => i !== idx);
                              setFormState({ ...formState, resources: updated });
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Remove row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-50 text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNorm}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                Save Norm Specification Formula
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL: QUICK NEW RESOURCE */}
      {isNewResourceSubModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-600" />
                Add New Resource Component
              </h3>
              <button
                onClick={() => setIsNewResourceSubModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Resource Name (English) *</label>
                <input
                  type="text"
                  value={quickResourceForm.name}
                  onChange={(e) => setQuickResourceForm({ ...quickResourceForm, name: e.target.value })}
                  placeholder="e.g. Epoxy Grout, Hydro Operator"
                  className="w-full p-2.5 border rounded-xl font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={quickResourceForm.category}
                    onChange={(e) => setQuickResourceForm({ ...quickResourceForm, category: e.target.value as ResourceCategory })}
                    className="w-full p-2.5 border rounded-xl font-medium bg-slate-50 focus:bg-white"
                  >
                    <option value="Material">Material</option>
                    <option value="Labor">Labor</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Transport">Transport</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    value={quickResourceForm.unit}
                    onChange={(e) => setQuickResourceForm({ ...quickResourceForm, unit: e.target.value })}
                    placeholder="e.g. Kg, Manday, Hr"
                    className="w-full p-2.5 border rounded-xl font-medium bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Base Rate (NRs.)</label>
                  <input
                    type="number"
                    value={quickResourceForm.default_rate}
                    onChange={(e) => setQuickResourceForm({ ...quickResourceForm, default_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold text-emerald-800 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Coefficient / % Value</label>
                  <input
                    type="number"
                    step="0.001"
                    value={quickResourceForm.quantity_per_base_unit}
                    onChange={(e) => setQuickResourceForm({ ...quickResourceForm, quantity_per_base_unit: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold text-blue-700 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rate Calc Mode</label>
                  <select
                    value={quickResourceForm.rate_calc_type || 'fixed'}
                    onChange={(e) => setQuickResourceForm({ ...quickResourceForm, rate_calc_type: e.target.value as any })}
                    className="w-full p-2 border rounded-xl font-semibold text-xs bg-slate-50 focus:bg-white"
                  >
                    <option value="fixed">Standard Fixed Qty</option>
                    <option value="percent_labour">% of Total Labor Cost (e.g. 3% Sundries)</option>
                    <option value="percent_equipment">% of Total Equipment Cost (e.g. 4% Tools)</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-900 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 w-full hover:bg-emerald-100/80 transition">
                    <input
                      type="checkbox"
                      checked={!!quickResourceForm.is_tax_free}
                      onChange={(e) => setQuickResourceForm({ ...quickResourceForm, is_tax_free: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span>Tax Free / Exempt Material</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setIsNewResourceSubModalOpen(false)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-50 text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuickNewResource}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                Add to Master & Select
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
