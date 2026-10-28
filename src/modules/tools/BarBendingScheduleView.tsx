import React, { useState, useMemo, useEffect } from 'react';
import {
  Grid,
  Plus,
  Trash2,
  Download,
  FileSpreadsheet,
  Layers,
  Sparkles,
  CheckCircle2,
  Info,
  RotateCcw,
  Sliders,
  ChevronRight,
  ShieldCheck,
  Zap,
  ArrowRight,
  Printer,
  Copy,
  Edit3,
  Bookmark,
  Check,
  Eye,
  Settings2,
  RefreshCw,
  FolderOpen,
  Compass,
  Link,
  SlidersHorizontal,
  Workflow,
  MoreVertical,
  ChevronDown,
  X
} from 'lucide-react';
import { BBSItem, BBSShapeType, ProjectEstimate, BOQItem, MBRow } from '../../types';
import {
  BBS_SHAPE_CATALOG,
  calculateRebarUnitWeight,
  computeCuttingLengthWithTrace,
  computeDynamicNosFromDimension,
  recomputeDynamicBBSItem,
  generateSlabCulvertDynamicBBS,
  generateBoxCulvertDynamicBBS,
  generateTwinBoxCulvertDynamicBBS,
  generateDrainDynamicBBS,
  generateProtectionWallDynamicBBS,
  generateRigidPavementDynamicBBS,
  generatePipeCulvertDynamicBBS,
  generateBBSFromDrawing
} from '../../services/bbsDynamicEngine';
import { DynamicRebarShapeSvg } from '../../components/drawings/DynamicRebarShapeSvg';
import { CustomSegmentShapeEditorModal } from '../../components/drawings/CustomSegmentShapeEditorModal';

interface BarBendingScheduleViewProps {
  project?: ProjectEstimate;
  setProject?: React.Dispatch<React.SetStateAction<ProjectEstimate>>;
  onNavigateToTab?: (tab: string) => void;
  showToast?: (msg: string) => void;
}

const INITIAL_DEFAULT_BBS: BBSItem[] = generateSlabCulvertDynamicBBS({
  clear_span: 4.0,
  barrel_length: 8.5,
  deck_slab_thickness: 0.35,
  bearing_length: 0.40,
  bed_block_thickness: 0.25,
  dirt_wall_height: 0.40,
  kerb_width: 0.30,
  kerb_height: 0.30
});

export const BarBendingScheduleView: React.FC<BarBendingScheduleViewProps> = ({
  project,
  setProject,
  onNavigateToTab,
  showToast
}) => {
  const [bbsItems, setBbsItems] = useState<BBSItem[]>(INITIAL_DEFAULT_BBS);
  const [selectedStructureFilter, setSelectedStructureFilter] = useState<string>('ALL');
  const [wastagePercent, setWastagePercent] = useState<number>(3.0); // 3% standard cutting wastage
  const [activeEditingId, setActiveEditingId] = useState<string | null>(null);

  // Active Linked CAD Drawing Tracker
  const [activeLinkedDrawing, setActiveLinkedDrawing] = useState<{
    category: string;
    variantKey: string;
    name: string;
    params: Record<string, number>;
  } | null>(null);

  // Component-wise Sync to MB / BOQ Modal State
  const [isComponentSyncModalOpen, setIsComponentSyncModalOpen] = useState(false);
  const [syncMode, setSyncMode] = useState<'unified' | 'component_wise'>('unified');
  const [componentTargetMapping, setComponentTargetMapping] = useState<Record<string, string>>({});
  const [includeCuttingFormulas, setIncludeCuttingFormulas] = useState(true);

  // Custom Segment Turning & Bending Designer Modal State
  const [isCustomDesignerOpen, setIsCustomDesignerOpen] = useState(false);
  const [customDesignerItem, setCustomDesignerItem] = useState<BBSItem | undefined>(undefined);

  // New Bar / Edit Bar Modal Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [formStructure, setFormStructure] = useState('RCC Slab Culvert (4.0m Span)');
  const [formComponent, setFormComponent] = useState<BBSItem['component']>('Deck Slab');
  const [formBarMark, setFormBarMark] = useState('SC-01');
  const [formDia, setFormDia] = useState<number>(16);
  const [formShape, setFormShape] = useState<BBSShapeType>('U_HOOK');
  const [formNoOfElements, setFormNoOfElements] = useState<number>(1);

  // Dynamic Straight Line Segments A, B, C, D, E, F
  const [formSegA, setFormSegA] = useState<number>(4.72);
  const [formSegB, setFormSegB] = useState<number>(0.27);
  const [formSegC, setFormSegC] = useState<number>(0.27);
  const [formSegD, setFormSegD] = useState<number>(0);
  const [formSegE, setFormSegE] = useState<number>(0);
  const [formSegF, setFormSegF] = useState<number>(0);

  // Custom Bends
  const [formBend90, setFormBend90] = useState<number>(2);
  const [formBend135, setFormBend135] = useState<number>(0);
  const [formBend45, setFormBend45] = useState<number>(0);
  const [formBend180, setFormBend180] = useState<number>(0);

  // Dimension Driver
  const [driverDimensionName, setDriverDimensionName] = useState('Clear Span (S)');
  const [driverDimensionVal, setDriverDimensionVal] = useState<number>(4.0);
  const [driverClearCover, setDriverClearCover] = useState<number>(40);
  const [driverSpacing, setDriverSpacing] = useState<number>(125);
  const [driverMultiplier, setDriverMultiplier] = useState<number>(1);
  const [driverFormulaDesc, setDriverFormulaDesc] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isPresetsSubmenuOpen, setIsPresetsSubmenuOpen] = useState(false);

  // Auto-detect and sync with CAD Drawings from localStorage on mount
  useEffect(() => {
    try {
      const activePresetStr =
        localStorage.getItem(`uev_active_bbs_preset_${project?.id}`) ||
        localStorage.getItem('uev_active_bbs_preset');

      if (activePresetStr) {
        const parsed = JSON.parse(activePresetStr);
        if (parsed?.category && parsed?.variantKey && parsed?.params) {
          const generated = generateBBSFromDrawing(parsed.category, parsed.variantKey, parsed.params);
          if (generated && generated.length > 0) {
            setBbsItems(generated);
            setSelectedStructureFilter('ALL');
            setActiveLinkedDrawing({
              category: parsed.category,
              variantKey: parsed.variantKey,
              name: parsed.structureName || `${parsed.category} - ${parsed.variantKey}`,
              params: parsed.params
            });
            showToast?.(`Loaded live reinforcement schedule from CAD Drawing: ${parsed.structureName || parsed.variantKey}`);
            return;
          }
        }
      }

      // Check general drawing parameters
      const drawingParamsKey = `uev_drawing_params_${project?.id}`;
      const savedParamsStr = localStorage.getItem(drawingParamsKey);
      if (savedParamsStr) {
        const savedParams = JSON.parse(savedParamsStr);
        if (savedParams?.category) {
          const cat = savedParams.category;
          const varKey =
            cat === 'drain'
              ? savedParams.drainType || 'rcc_rectangular'
              : cat === 'road'
              ? savedParams.roadType || 'rigid_concrete'
              : cat === 'culvert'
              ? savedParams.culvertType || 'slab_culvert'
              : savedParams.wallType || 'rcc_l_wall';
          const generated = generateBBSFromDrawing(cat, varKey, savedParams);
          if (generated && generated.length > 0) {
            setBbsItems(generated);
            setActiveLinkedDrawing({
              category: cat,
              variantKey: varKey,
              name: `Active Drawing: ${cat} - ${varKey}`,
              params: savedParams
            });
          }
        }
      }
    } catch {}
  }, [project?.id]);

  // Dynamic Dimension Link for Nos
  const [isDimensionLinked, setIsDimensionLinked] = useState<boolean>(true);
  const [formDimName, setFormDimName] = useState<string>('Barrel Roadway Length (Lb)');
  const [formDimVal, setFormDimVal] = useState<number>(8.50);
  const [formCoverMm, setFormCoverMm] = useState<number>(40);
  const [formSpacingMm, setFormSpacingMm] = useState<number>(125);
  const [formMultiplier, setFormMultiplier] = useState<number>(1);
  const [formManualBarsPerEl, setFormManualBarsPerEl] = useState<number>(68);

  // When shape changes in form, update default bends and segment hints
  const handleFormShapeChange = (newShape: BBSShapeType) => {
    setFormShape(newShape);
    const meta = BBS_SHAPE_CATALOG[newShape];
    if (meta) {
      setFormBend90(meta.defaultBends.count90);
      setFormBend135(meta.defaultBends.count135);
      setFormBend45(meta.defaultBends.count45);
      setFormBend180(meta.defaultBends.count180);
    }
  };

  // Live calculation preview in form
  const formPreviewNos = useMemo(() => {
    if (!isDimensionLinked) {
      return {
        barsPerEl: formManualBarsPerEl,
        totalBars: formManualBarsPerEl * formNoOfElements,
        desc: `Manual input: ${formManualBarsPerEl} Nos per element`
      };
    }
    const res = computeDynamicNosFromDimension(
      formDimName,
      formDimVal,
      formCoverMm,
      formSpacingMm,
      formMultiplier,
      formNoOfElements
    );
    return {
      barsPerEl: res.barsPerElement,
      totalBars: res.totalBars,
      desc: res.formulaDesc
    };
  }, [
    isDimensionLinked,
    formManualBarsPerEl,
    formNoOfElements,
    formDimName,
    formDimVal,
    formCoverMm,
    formSpacingMm,
    formMultiplier
  ]);

  const formPreviewCut = useMemo(() => {
    return computeCuttingLengthWithTrace(
      formShape,
      formDia,
      formSegA,
      formSegB,
      formSegC,
      formSegD,
      formSegE,
      formSegF,
      {
        count90: formBend90,
        count135: formBend135,
        count45: formBend45,
        count180: formBend180
      }
    );
  }, [
    formShape,
    formDia,
    formSegA,
    formSegB,
    formSegC,
    formSegD,
    formSegE,
    formSegF,
    formBend90,
    formBend135,
    formBend45,
    formBend180
  ]);

  const formPreviewTotalLen = useMemo(() => {
    return Number((formPreviewCut.cuttingLengthM * formPreviewNos.totalBars).toFixed(2));
  }, [formPreviewCut.cuttingLengthM, formPreviewNos.totalBars]);

  const formPreviewWeightKg = useMemo(() => {
    const unitWt = calculateRebarUnitWeight(formDia);
    return Number((formPreviewTotalLen * unitWt).toFixed(2));
  }, [formPreviewTotalLen, formDia]);

  // Open Segment Turning & Bending Designer Modal
  const handleOpenCustomDesigner = (item?: BBSItem) => {
    setCustomDesignerItem(item);
    setIsCustomDesignerOpen(true);
  };

  // Save from Segment Turning & Bending Designer Modal
  const handleSaveCustomDesignerItem = (savedItem: BBSItem) => {
    setBbsItems((prev) => {
      const exists = prev.some((i) => i.id === savedItem.id);
      if (exists) {
        return prev.map((i) => (i.id === savedItem.id ? savedItem : i));
      }
      return [...prev, savedItem];
    });
    showToast?.(`Bar Mark ${savedItem.bar_mark} (${savedItem.shape_name || 'Turned Shape'}) saved to schedule.`);
  };

  // Open modal for Adding New Bar Mark
  const handleOpenAddModal = () => {
    setEditingItemId(null);
    setFormBarMark(`M-${bbsItems.length + 1}`);
    setFormShape('U_HOOK');
    setFormDia(16);
    setFormSegA(3.50);
    setFormSegB(0.35);
    setFormSegC(0.35);
    setFormSegD(0);
    setFormSegE(0);
    setFormSegF(0);
    setFormBend90(2);
    setFormBend135(0);
    setFormBend45(0);
    setFormBend180(0);
    setIsDimensionLinked(true);
    setFormDimName('Span / Member Length');
    setFormDimVal(6.0);
    setFormCoverMm(40);
    setFormSpacingMm(150);
    setFormMultiplier(1);
    setFormNoOfElements(1);
    setFormRemarks('');
    setIsFormOpen(true);
  };

  // Open modal for Editing Existing Bar Mark
  const handleOpenEditModal = (item: BBSItem) => {
    setEditingItemId(item.id);
    setFormStructure(item.structure_name);
    setFormComponent(item.component);
    setFormBarMark(item.bar_mark);
    setFormDia(item.bar_diameter_mm);
    setFormShape(item.shape_type);
    setFormNoOfElements(item.no_of_elements || 1);

    setFormSegA(item.length_a_m || 0);
    setFormSegB(item.length_b_m || 0);
    setFormSegC(item.length_c_m || 0);
    setFormSegD(item.length_d_m || 0);
    setFormSegE(item.length_e_m || 0);
    setFormSegF(item.length_f_m || 0);

    setFormBend90(item.bend_count_90 ?? BBS_SHAPE_CATALOG[item.shape_type]?.defaultBends.count90 ?? 0);
    setFormBend135(item.bend_count_135 ?? BBS_SHAPE_CATALOG[item.shape_type]?.defaultBends.count135 ?? 0);
    setFormBend45(item.bend_count_45 ?? BBS_SHAPE_CATALOG[item.shape_type]?.defaultBends.count45 ?? 0);
    setFormBend180(item.bend_count_180 ?? BBS_SHAPE_CATALOG[item.shape_type]?.defaultBends.count180 ?? 0);

    if (item.dimension_driver) {
      setIsDimensionLinked(true);
      setFormDimName(item.dimension_driver.dimension_name);
      setFormDimVal(item.dimension_driver.dimension_val_m);
      setFormCoverMm(item.dimension_driver.clear_cover_mm);
      setFormSpacingMm(item.dimension_driver.spacing_mm);
      setFormMultiplier(item.dimension_driver.multiplier);
    } else {
      setIsDimensionLinked(false);
      setFormManualBarsPerEl(item.bars_per_element || 1);
    }

    setFormRemarks(item.remarks || '');
    setIsFormOpen(true);
  };

  // Save Bar Form Submit (Add or Edit)
  const handleSaveBarForm = (e: React.FormEvent) => {
    e.preventDefault();

    const rawItem: BBSItem = {
      id: editingItemId || `bbs-${Date.now()}`,
      structure_name: formStructure,
      component: formComponent,
      bar_mark: formBarMark,
      bar_diameter_mm: formDia,
      shape_type: formShape,
      no_of_elements: formNoOfElements,
      bars_per_element: formPreviewNos.barsPerEl,
      dimension_driver: isDimensionLinked
        ? {
            dimension_name: formDimName,
            dimension_val_m: formDimVal,
            clear_cover_mm: formCoverMm,
            spacing_mm: formSpacingMm,
            multiplier: formMultiplier,
            formula_desc: formPreviewNos.desc
          }
        : undefined,
      formula_nos_desc: formPreviewNos.desc,
      length_a_m: formSegA,
      length_b_m: formSegB,
      length_c_m: formSegC,
      length_d_m: formSegD,
      length_e_m: formSegE,
      length_f_m: formSegF,
      bend_count_90: formBend90,
      bend_count_135: formBend135,
      bend_count_45: formBend45,
      bend_count_180: formBend180,
      cutting_length_m: 0,
      total_length_m: 0,
      unit_weight_kg_per_m: 0,
      total_weight_kg: 0,
      total_weight_tonnes: 0,
      remarks: formRemarks
    };

    const computed = recomputeDynamicBBSItem(rawItem);

    if (editingItemId) {
      setBbsItems((prev) => prev.map((item) => (item.id === editingItemId ? computed : item)));
      showToast?.(`Updated Bar Mark ${formBarMark} in schedule.`);
    } else {
      setBbsItems((prev) => [...prev, computed]);
      showToast?.(`Added new Bar Mark ${formBarMark} to schedule.`);
    }

    setIsFormOpen(false);
  };

  // Delete Bar Mark
  const handleDeleteBar = (id: string) => {
    setBbsItems((prev) => prev.filter((item) => item.id !== id));
    showToast?.('Bar mark removed.');
  };

  // Duplicate Bar Mark
  const handleDuplicateBar = (item: BBSItem) => {
    const clone: BBSItem = {
      ...item,
      id: `bbs-${Date.now()}`,
      bar_mark: `${item.bar_mark}-Copy`
    };
    setBbsItems((prev) => [...prev, recomputeDynamicBBSItem(clone)]);
    showToast?.(`Duplicated ${item.bar_mark}.`);
  };

  // Load Preset Schedule
  const handleLoadPreset = (
    presetType: 'slab_culvert' | 'box_culvert' | 'box_twin' | 'drain' | 'protection_wall' | 'rigid_pavement' | 'pipe_culvert'
  ) => {
    if (presetType === 'slab_culvert') {
      setBbsItems(
        generateSlabCulvertDynamicBBS({
          clear_span: 4.0,
          barrel_length: 8.5,
          deck_slab_thickness: 0.35,
          bearing_length: 0.40,
          bed_block_thickness: 0.25,
          dirt_wall_height: 0.40,
          kerb_width: 0.30,
          kerb_height: 0.30
        })
      );
      showToast?.('Loaded RCC Slab Culvert Dynamic Rebar Schedule (IS 2502 / BS 8666).');
    } else if (presetType === 'box_culvert') {
      setBbsItems(
        generateBoxCulvertDynamicBBS({
          clear_span: 2.5,
          clear_height: 2.0,
          barrel_length: 8.5,
          wall_thickness: 0.30,
          bottom_slab_thickness: 0.30,
          top_slab_thickness: 0.30,
          haunch_size: 0.25
        })
      );
      showToast?.('Loaded RCC Box Culvert Dynamic Rebar Schedule.');
    } else if (presetType === 'drain') {
      setBbsItems(
        generateDrainDynamicBBS({
          reach_length: 100,
          clear_width: 0.75,
          clear_depth: 0.80,
          wall_thickness: 0.15,
          base_slab_thickness: 0.15
        })
      );
      setActiveLinkedDrawing({
        category: 'drain',
        variantKey: 'rcc_rectangular',
        name: 'RCC Rectangular Drain Channel & Cover Slab',
        params: { reachLength: 100, clearWidth: 0.75, clearDepth: 0.8 }
      });
      showToast?.('Loaded RCC Drain Channel & Cover Slab Schedule.');
    } else if (presetType === 'protection_wall') {
      setBbsItems(
        generateProtectionWallDynamicBBS({
          wallHeight: 3.0,
          wallLength: 30.0,
          topWidth: 0.50,
          bottomWidth: 1.20,
          foundationDepth: 1.20,
          pccWidth: 1.80
        })
      );
      setActiveLinkedDrawing({
        category: 'protection_wall',
        variantKey: 'rcc_l_wall',
        name: 'RCC L-Protection / Retaining Wall',
        params: { wallHeight: 3.0, wallLength: 30.0 }
      });
      showToast?.('Loaded RCC Protection Wall Rebar Schedule.');
    } else if (presetType === 'box_twin') {
      setBbsItems(
        generateTwinBoxCulvertDynamicBBS({
          clear_span: 2.50,
          clear_height: 2.00,
          barrel_length: 8.50,
          wall_thickness: 0.30,
          pier_thickness: 0.30,
          bottom_slab_thickness: 0.30,
          top_slab_thickness: 0.30,
          haunch_size: 0.25
        })
      );
      setActiveLinkedDrawing({
        category: 'culvert',
        variantKey: 'box_twin',
        name: 'Twin Cell Box Culvert (2×2.5m × 2.0m)',
        params: { clearSpan: 2.5, clearHeight: 2.0, barrelLength: 8.5 }
      });
      showToast?.('Loaded Twin Cell RCC Box Culvert Schedule.');
    } else if (presetType === 'rigid_pavement') {
      setBbsItems(
        generateRigidPavementDynamicBBS({
          road_length: 100,
          carriageway_width: 5.50,
          pqcThickness: 0.20
        })
      );
      setActiveLinkedDrawing({
        category: 'road',
        variantKey: 'rigid_concrete',
        name: 'Rigid Concrete Pavement Dowel & Tie Bars',
        params: { length: 100, carriagewayWidth: 5.5 }
      });
      showToast?.('Loaded Rigid Pavement Joint Reinforcement Schedule.');
    } else if (presetType === 'pipe_culvert') {
      setBbsItems(
        generatePipeCulvertDynamicBBS({
          pipe_dia: 0.90,
          pipe_count: 1,
          barrel_length: 8.50
        })
      );
      setActiveLinkedDrawing({
        category: 'culvert',
        variantKey: 'pipe_rcc',
        name: 'RCC Pipe Culvert Bedding & Headwall',
        params: { pipeDia: 0.9, barrelLength: 8.5 }
      });
      showToast?.('Loaded RCC Pipe Culvert Bedding & Headwall Schedule.');
    }
  };

  // Reload Live Parameters from Active CAD Drawing in Workspace
  const handleReloadActiveCADDrawing = () => {
    try {
      const activePresetStr =
        localStorage.getItem(`uev_active_bbs_preset_${project?.id}`) ||
        localStorage.getItem('uev_active_bbs_preset');
      if (activePresetStr) {
        const parsed = JSON.parse(activePresetStr);
        if (parsed?.category && parsed?.variantKey && parsed?.params) {
          const generated = generateBBSFromDrawing(parsed.category, parsed.variantKey, parsed.params);
          if (generated && generated.length > 0) {
            setBbsItems(generated);
            setActiveLinkedDrawing({
              category: parsed.category,
              variantKey: parsed.variantKey,
              name: parsed.structureName || `${parsed.category} - ${parsed.variantKey}`,
              params: parsed.params
            });
            showToast?.(`Refreshed live CAD dimensions for ${parsed.structureName || parsed.variantKey}`);
            return;
          }
        }
      }

      const drawingParamsKey = `uev_drawing_params_${project?.id}`;
      const savedParamsStr = localStorage.getItem(drawingParamsKey);
      if (savedParamsStr) {
        const saved = JSON.parse(savedParamsStr);
        if (saved?.category) {
          const cat = saved.category;
          const varKey =
            cat === 'drain'
              ? saved.drainType || 'rcc_rectangular'
              : cat === 'road'
              ? saved.roadType || 'rigid_concrete'
              : cat === 'culvert'
              ? saved.culvertType || 'slab_culvert'
              : saved.wallType || 'rcc_l_wall';
          const generated = generateBBSFromDrawing(cat, varKey, saved);
          if (generated && generated.length > 0) {
            setBbsItems(generated);
            setActiveLinkedDrawing({
              category: cat,
              variantKey: varKey,
              name: `Live CAD Drawing: ${cat} - ${varKey}`,
              params: saved
            });
            showToast?.(`Refreshed live CAD dimensions from ${cat} drawing.`);
            return;
          }
        }
      }
      showToast?.('No active CAD drawing found. Select a drawing in the CAD Drawing Workspace or choose a preset below.');
    } catch {
      showToast?.('Failed to reload CAD drawing parameters.');
    }
  };

  // Component-wise Summary Breakdown
  const componentSummaries = useMemo(() => {
    const compMap: Record<
      string,
      {
        componentName: string;
        totalKg: number;
        totalTonnes: number;
        barMarksCount: number;
        totalNos: number;
        diaSet: Set<number>;
        items: BBSItem[];
      }
    > = {};

    bbsItems.forEach((item) => {
      const cName = item.component || 'General Component';
      if (!compMap[cName]) {
        compMap[cName] = {
          componentName: cName,
          totalKg: 0,
          totalTonnes: 0,
          barMarksCount: 0,
          totalNos: 0,
          diaSet: new Set(),
          items: []
        };
      }
      compMap[cName].totalKg += item.total_weight_kg;
      compMap[cName].barMarksCount += 1;
      compMap[cName].totalNos += item.no_of_elements * item.bars_per_element;
      compMap[cName].diaSet.add(item.bar_diameter_mm);
      compMap[cName].items.push(item);
    });

    Object.values(compMap).forEach((c) => {
      c.totalTonnes = Math.round((c.totalKg / 1000) * 1000) / 1000;
      c.totalKg = Math.round(c.totalKg * 10) / 10;
    });

    return compMap;
  }, [bbsItems]);

  // Rebar Diameter Breakdown & Grand Totals
  const summary = useMemo(() => {
    const diaMap: Record<number, { total_length_m: number; total_weight_kg: number; total_weight_tonnes: number; count: number }> = {};
    let grandTotalKg = 0;
    let grandTotalLengthM = 0;

    bbsItems.forEach((b) => {
      if (!diaMap[b.bar_diameter_mm]) {
        diaMap[b.bar_diameter_mm] = { total_length_m: 0, total_weight_kg: 0, total_weight_tonnes: 0, count: 0 };
      }
      diaMap[b.bar_diameter_mm].total_length_m += b.total_length_m;
      diaMap[b.bar_diameter_mm].total_weight_kg += b.total_weight_kg;
      diaMap[b.bar_diameter_mm].total_weight_tonnes += b.total_weight_tonnes;
      diaMap[b.bar_diameter_mm].count += 1;

      grandTotalKg += b.total_weight_kg;
      grandTotalLengthM += b.total_length_m;
    });

    const grandTotalT = grandTotalKg / 1000;
    const grossT = grandTotalT * (1 + wastagePercent / 100);

    return {
      diaMap,
      grandTotalKg: Math.round(grandTotalKg * 10) / 10,
      grandTotalLengthM: Math.round(grandTotalLengthM * 10) / 10,
      grandTotalT: Math.round(grandTotalT * 1000) / 1000,
      grossT: Math.round(grossT * 1000) / 1000,
      grossKg: Math.round(grossT * 1000)
    };
  }, [bbsItems, wastagePercent]);

  // Filter items by structure name
  const structureNames = useMemo(() => {
    const set = new Set<string>();
    bbsItems.forEach((i) => set.add(i.structure_name));
    return Array.from(set);
  }, [bbsItems]);

  const filteredItems = useMemo(() => {
    if (selectedStructureFilter === 'ALL') return bbsItems;
    return bbsItems.filter((i) => i.structure_name === selectedStructureFilter);
  }, [bbsItems, selectedStructureFilter]);

  // Execute Component-Wise or Unified Steel Sync to Project MB & BOQ
  const handleExecuteComponentWiseSync = () => {
    if (!project || !setProject) {
      showToast?.('No active project found.');
      return;
    }

    const wastageMultiplier = 1 + wastagePercent / 100;

    if (syncMode === 'unified') {
      const steelQtyKg = summary.grossKg;
      const existingIdx = project.items.findIndex(
        (item) =>
          item.description.toLowerCase().includes('rebar') ||
          item.description.toLowerCase().includes('steel reinforcement') ||
          item.description.toLowerCase().includes('tmt')
      );

      const mbRowList: MBRow[] = bbsItems.map((b) => ({
        id: `mb_bbs_${b.id}`,
        particulars: `${b.structure_name} - ${b.component} (Mark ${b.bar_mark}, Ø${b.bar_diameter_mm}mm, Shape ${b.shape_code || '00'}) - Segments: A=${b.length_a_m}m${b.length_b_m ? `, B=${b.length_b_m}m` : ''}${b.length_c_m ? `, C=${b.length_c_m}m` : ''}`,
        no_of_units: b.no_of_elements * b.bars_per_element,
        length: b.cutting_length_m,
        breadth: 1,
        height: b.unit_weight_kg_per_m,
        quantity: b.total_weight_kg,
        remarks: includeCuttingFormulas
          ? b.formula_cutting_length_desc || `Cutting Len: ${b.cutting_length_m}m`
          : `Mark ${b.bar_mark}`
      }));

      if (existingIdx >= 0) {
        setProject((prev) => {
          const updated = [...prev.items];
          updated[existingIdx] = {
            ...updated[existingIdx],
            estimated_quantity: Math.round(steelQtyKg),
            total_amount: Math.round(steelQtyKg * (updated[existingIdx].calculated_unit_rate || 145)),
            mb_rows: mbRowList
          };
          return { ...prev, items: updated };
        });
      } else {
        const newBOQItem: BOQItem = {
          id: `boq_steel_${Date.now()}`,
          item_id: 205,
          item_code: 'BLD-ST-01',
          description: `Supplying, cutting, bending and placing Fe 500 TMT steel reinforcement bars in position (${activeLinkedDrawing?.name || 'All Components'})`,
          unit: 'Kg',
          estimated_quantity: Math.round(steelQtyKg),
          calculated_unit_rate: 145,
          total_amount: Math.round(steelQtyKg * 145),
          chapter: 'RCC Works & Steel Reinforcement',
          mb_rows: mbRowList
        };

        setProject((prev) => ({
          ...prev,
          items: [...prev.items, newBOQItem]
        }));
      }

      setIsComponentSyncModalOpen(false);
      showToast?.(`Synced ${summary.grossT} MT (${summary.grossKg.toLocaleString()} kg) steel across all components to Project BOQ & MB.`);
      return;
    }

    // Component-wise mapping mode
    const updatedItems = [...project.items];
    let syncedComponentsCount = 0;

    Object.entries(componentSummaries).forEach(([cName, cSummary]) => {
      const targetId = componentTargetMapping[cName];
      const compNetKg = cSummary.totalKg;
      const compGrossKg = Math.round(compNetKg * wastageMultiplier);

      const compMbRows: MBRow[] = cSummary.items.map((b) => ({
        id: `mb_bbs_comp_${b.id}`,
        particulars: `${b.structure_name} - ${cName} (Mark ${b.bar_mark}, Ø${b.bar_diameter_mm}mm, Shape ${b.shape_code || '00'}) - Segments: A=${b.length_a_m}m${b.length_b_m ? `, B=${b.length_b_m}m` : ''}`,
        no_of_units: b.no_of_elements * b.bars_per_element,
        length: b.cutting_length_m,
        breadth: 1,
        height: b.unit_weight_kg_per_m,
        quantity: b.total_weight_kg,
        remarks: includeCuttingFormulas
          ? b.formula_cutting_length_desc || `Cutting Len: ${b.cutting_length_m}m`
          : `Mark ${b.bar_mark}`
      }));

      if (targetId && targetId !== 'NEW_ITEM') {
        const itemIdx = updatedItems.findIndex((it) => it.id === targetId);
        if (itemIdx >= 0) {
          const current = updatedItems[itemIdx];
          const existingNonBBS = current.mb_rows?.filter((r) => !r.id.startsWith('mb_bbs_comp_')) || [];
          const combinedMbRows = [...existingNonBBS, ...compMbRows];
          const newQty = Math.round(combinedMbRows.reduce((sum, r) => sum + (r.quantity || 0), 0));
          updatedItems[itemIdx] = {
            ...current,
            estimated_quantity: newQty,
            total_amount: Math.round(newQty * (current.calculated_unit_rate || 145)),
            mb_rows: combinedMbRows
          };
          syncedComponentsCount++;
        }
      } else {
        // Create new item for this component
        const newItem: BOQItem = {
          id: `boq_steel_comp_${cName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
          item_id: 205,
          item_code: `BLD-ST-${cName.slice(0, 3).toUpperCase()}`,
          description: `Fe 500 TMT Steel Reinforcement for ${cName} (${Array.from(cSummary.diaSet).map((d) => `Ø${d}mm`).join(', ')})`,
          unit: 'Kg',
          estimated_quantity: compGrossKg,
          calculated_unit_rate: 145,
          total_amount: Math.round(compGrossKg * 145),
          chapter: 'RCC Works & Steel Reinforcement',
          mb_rows: compMbRows
        };
        updatedItems.push(newItem);
        syncedComponentsCount++;
      }
    });

    setProject((prev) => ({
      ...prev,
      items: updatedItems
    }));

    setIsComponentSyncModalOpen(false);
    showToast?.(`Successfully mapped ${syncedComponentsCount} structural components with dedicated MB rows to Project BOQ!`);
  };

  // One-click sync to Project MB / BOQ (Opens component-mapped modal)
  const handlePushSteelToMB = () => {
    setIsComponentSyncModalOpen(true);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Bar Mark',
      'Structure',
      'Component',
      'Shape Code',
      'Shape Name',
      'Diameter (mm)',
      'Segment A (m)',
      'Segment B (m)',
      'Segment C (m)',
      'Segment D (m)',
      'Segment E (m)',
      'Segment F (m)',
      'Cutting Length (m)',
      'Cutting Formula',
      'Chosen Dimension Driver',
      'Spacing (mm)',
      'Nos per Element',
      'No of Elements',
      'Total Nos',
      'Total Length (m)',
      'Unit Weight (kg/m)',
      'Total Weight (kg)',
      'Total Weight (MT)',
      'Remarks'
    ];

    const rows = bbsItems.map((b) => [
      b.bar_mark,
      `"${b.structure_name}"`,
      `"${b.component}"`,
      b.shape_code || '',
      `"${b.shape_name || b.shape_type}"`,
      b.bar_diameter_mm,
      b.length_a_m || '',
      b.length_b_m || '',
      b.length_c_m || '',
      b.length_d_m || '',
      b.length_e_m || '',
      b.length_f_m || '',
      b.cutting_length_m,
      `"${b.formula_cutting_length_desc || ''}"`,
      `"${b.dimension_driver?.dimension_name || ''}"`,
      b.dimension_driver?.spacing_mm || '',
      b.bars_per_element,
      b.no_of_elements,
      b.bars_per_element * b.no_of_elements,
      b.total_length_m,
      b.unit_weight_kg_per_m,
      b.total_weight_kg,
      b.total_weight_tonnes,
      `"${b.remarks || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bar_Bending_Schedule_A_F_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 text-slate-900 overflow-hidden font-sans">
      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Grid className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 leading-none">
                Bar Bending Schedule (BBS)
              </h1>
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                BS 8666 & IS 2502
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {bbsItems.length} Bar Marks • Total: {summary.grandTotalKg.toLocaleString('en-US')} kg ({summary.grandTotalT} T)
            </p>
          </div>
        </div>

        {/* Action Controls - Icon-only with tooltips + More Menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-2xs cursor-pointer"
            title="Add Bar Mark"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleOpenCustomDesigner()}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-indigo-700 border border-slate-300 rounded-lg transition shadow-2xs cursor-pointer"
            title="Turning & Bending Designer"
          >
            <Compass className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handlePushSteelToMB}
            className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-2xs cursor-pointer"
            title="Sync Steel to MB & BOQ"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>

          {/* Consolidated More Dropdown */}
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
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsPresetsSubmenuOpen(false);
                  }}
                />
                <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-medium animate-fadeIn">
                  <div className="px-3 py-1 text-[10px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-100">
                    BBS Tools & Presets
                  </div>

                  {/* Presets Toggle / List */}
                  <div className="px-1 py-1">
                    <button
                      type="button"
                      onClick={() => setIsPresetsSubmenuOpen(!isPresetsSubmenuOpen)}
                      className="w-full px-2.5 py-1.5 text-left flex items-center justify-between hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg transition cursor-pointer font-bold"
                    >
                      <div className="flex items-center gap-2">
                        <Bookmark className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Load Template Presets</span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isPresetsSubmenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isPresetsSubmenuOpen && (
                      <div className="ml-2 pl-2 border-l border-slate-200 space-y-0.5 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            handleLoadPreset('slab_culvert');
                            setIsMoreMenuOpen(false);
                          }}
                          className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-[11px] transition cursor-pointer"
                        >
                          🌉 RCC Slab Culvert (4m)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleLoadPreset('box_culvert');
                            setIsMoreMenuOpen(false);
                          }}
                          className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-[11px] transition cursor-pointer"
                        >
                          📦 Single Box Culvert (2.5×2m)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleLoadPreset('box_twin');
                            setIsMoreMenuOpen(false);
                          }}
                          className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-[11px] transition cursor-pointer"
                        >
                          🏢 Twin Box Culvert (2×2.5m)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleLoadPreset('drain');
                            setIsMoreMenuOpen(false);
                          }}
                          className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-[11px] transition cursor-pointer"
                        >
                          🌊 RCC Drain & Cover Slabs
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleLoadPreset('protection_wall');
                            setIsMoreMenuOpen(false);
                          }}
                          className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-[11px] transition cursor-pointer"
                        >
                          🛡️ RCC Retaining Wall
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleLoadPreset('rigid_pavement');
                            setIsMoreMenuOpen(false);
                          }}
                          className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-[11px] transition cursor-pointer"
                        >
                          🛣️ Rigid Pavement
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleLoadPreset('pipe_culvert');
                            setIsMoreMenuOpen(false);
                          }}
                          className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-[11px] transition cursor-pointer"
                        >
                          🚰 RCC Pipe Culvert
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleReloadActiveCADDrawing();
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 transition cursor-pointer font-medium"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Reload from Active CAD</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleExportCSV();
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition cursor-pointer font-medium"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Export CSV Takeoff</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Linked Drawing & Structure Notification Banner */}
        <div className="bg-gradient-to-r from-indigo-50/80 via-white to-slate-50 p-4 rounded-2xl border border-indigo-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200">
              <Link className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200">
                  Active Structure Link
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {activeLinkedDrawing?.name || selectedStructureFilter !== 'ALL' ? selectedStructureFilter : 'Integrated CAD Drawing Geometry'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Straight segments (A..F), hook deductions and rebar counts are auto-calculated from active CAD dimensions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReloadActiveCADDrawing}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 flex items-center gap-1.5 shadow-xs transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
              <span>Refresh CAD</span>
            </button>
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab('template-drawings')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition"
              >
                <span>Drawings Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Steel Analytics & Summary Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
              Net Steel Reinforcement
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
              {summary.grandTotalT}{' '}
              <span className="text-xs font-bold text-indigo-600">MT</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              {summary.grandTotalKg.toLocaleString()} kg • {summary.grandTotalLengthM.toLocaleString()} m run
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
              Cutting Wastage Allowance
            </span>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={wastagePercent}
                onChange={(e) => setWastagePercent(Number(e.target.value) || 0)}
                className="w-16 px-2 py-0.5 bg-slate-50 border border-slate-300 text-emerald-700 rounded-lg font-mono font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="text-xs font-bold text-slate-700">% Wastage</span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">Standard: 2.5% to 5.0% for laps & cuts</span>
          </div>

          <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-800 p-4 rounded-2xl border border-indigo-600 shadow-sm text-white">
            <span className="text-[10px] uppercase font-bold text-indigo-200 block tracking-wider">
              Gross Procurement Steel
            </span>
            <div className="text-2xl font-black mt-1 font-mono text-emerald-300">
              {summary.grossT}{' '}
              <span className="text-xs font-bold text-white">MT</span>
            </div>
            <div className="text-[11px] text-indigo-100 font-mono mt-0.5">
              {summary.grossKg.toLocaleString()} kg (with {wastagePercent}% wastage)
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
              Diameter Breakdown
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {Object.entries(summary.diaMap).map(([dia, d]) => (
                <span
                  key={dia}
                  className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold"
                >
                  Ø{dia}: {(d.total_weight_kg / 1000).toFixed(2)}T
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Structure Filter Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 text-xs shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedStructureFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                selectedStructureFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              All Items ({bbsItems.length})
            </button>
            {structureNames.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStructureFilter(st)}
                className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                  selectedStructureFilter === st
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 font-mono px-2">
            Showing {filteredItems.length} of {bbsItems.length} Marks
          </span>
        </div>

        {/* BBS Detailed Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Detailed Rebar Schedule Register with Dynamic Segments (A, B, C, D, E, F)
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              BS 8666 / IS 2502 Compliant
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                  <th className="py-3 px-3">Mark</th>
                  <th className="py-3 px-3">Component</th>
                  <th className="py-3 px-3 text-center">Shape Sketch</th>
                  <th className="py-3 px-3">Straight Segments (A, B, C, D, E, F)</th>
                  <th className="py-3 px-3 text-center">Dia (Ø)</th>
                  <th className="py-3 px-3">Dimension Driver & Spacing</th>
                  <th className="py-3 px-3 text-center">Nos</th>
                  <th className="py-3 px-3 text-right">Cutting Len</th>
                  <th className="py-3 px-3 text-right">Total Len</th>
                  <th className="py-3 px-3 text-right">Total Wt</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {filteredItems.map((bar) => {
                  const meta = BBS_SHAPE_CATALOG[bar.shape_type] || BBS_SHAPE_CATALOG.CUSTOM_MULTI_SEGMENT;

                  return (
                    <tr key={bar.id} className="hover:bg-indigo-50/40 transition group">
                      {/* Bar Mark */}
                      <td className="py-3 px-3 font-mono font-black text-indigo-700 text-sm">
                        {bar.bar_mark}
                        <span className="block text-[10px] text-slate-500 font-normal">
                          Code {bar.shape_code || meta.bsCode}
                        </span>
                      </td>

                      {/* Component & Structure */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{bar.component}</div>
                        <span className="text-[11px] text-slate-500 block">{bar.structure_name}</span>
                        {bar.remarks && (
                          <span className="text-[10px] text-slate-500 italic block mt-0.5">{bar.remarks}</span>
                        )}
                      </td>

                      {/* Shape Vector Thumbnail */}
                      <td className="py-3 px-3 text-center">
                        <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 inline-block shadow-xs">
                          <DynamicRebarShapeSvg item={bar} width={130} height={60} theme="light" />
                        </div>
                        <span className="text-[10px] text-slate-600 block mt-0.5 font-bold">
                          {bar.shape_name || meta.name}
                        </span>
                        {bar.custom_segments && bar.custom_segments.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[9.5px] font-mono mt-1 font-semibold">
                            <Compass className="w-2.5 h-2.5" /> {bar.custom_segments.length} Turned Segs
                          </span>
                        )}
                      </td>

                      {/* Straight Line Segments Breakdown A, B, C, D, E, F */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                          {bar.length_a_m !== undefined && bar.length_a_m > 0 && (
                            <span className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded font-bold">
                              <b className="text-indigo-950">A:</b> {bar.length_a_m.toFixed(2)}m
                            </span>
                          )}
                          {bar.length_b_m !== undefined && bar.length_b_m > 0 && (
                            <span className="bg-amber-50 border border-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                              <b className="text-amber-950">B:</b> {bar.length_b_m.toFixed(2)}m
                            </span>
                          )}
                          {bar.length_c_m !== undefined && bar.length_c_m > 0 && (
                            <span className="bg-amber-50 border border-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                              <b className="text-amber-950">C:</b> {bar.length_c_m.toFixed(2)}m
                            </span>
                          )}
                          {bar.length_d_m !== undefined && bar.length_d_m > 0 && (
                            <span className="bg-cyan-50 border border-cyan-200 text-cyan-800 px-1.5 py-0.5 rounded font-bold">
                              <b className="text-cyan-950">D:</b> {bar.length_d_m.toFixed(2)}m
                            </span>
                          )}
                          {bar.length_e_m !== undefined && bar.length_e_m > 0 && (
                            <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                              <b className="text-emerald-950">E:</b> {bar.length_e_m.toFixed(2)}m
                            </span>
                          )}
                          {bar.length_f_m !== undefined && bar.length_f_m > 0 && (
                            <span className="bg-purple-50 border border-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-bold">
                              <b className="text-purple-950">F:</b> {bar.length_f_m.toFixed(2)}m
                            </span>
                          )}
                        </div>

                        {/* Cutting length equation trace */}
                        {bar.formula_cutting_length_desc && (
                          <div className="text-[10px] text-slate-500 font-mono mt-1">
                            {bar.formula_cutting_length_desc}
                          </div>
                        )}
                      </td>

                      {/* Diameter */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                        <span className="bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 text-slate-800">
                          Ø{bar.bar_diameter_mm}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {bar.unit_weight_kg_per_m.toFixed(3)} kg/m
                        </span>
                      </td>

                      {/* Dimension Driver & Spacing */}
                      <td className="py-3 px-3">
                        {bar.dimension_driver ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800 text-[11px] block">
                              {bar.dimension_driver.dimension_name}: {bar.dimension_driver.dimension_val_m.toFixed(2)}m
                            </span>
                            <span className="text-[10px] text-indigo-600 font-mono font-bold block">
                              @{bar.dimension_driver.spacing_mm}mm c/c (Cover: {bar.dimension_driver.clear_cover_mm}mm)
                            </span>
                            <span className="text-[9.5px] text-slate-500 font-mono block">
                              {bar.dimension_driver.formula_desc}
                            </span>
                          </div>
                        ) : (
                          <div className="text-slate-500 text-xs font-mono">
                            Manual / Fixed Count
                          </div>
                        )}
                      </td>

                      {/* Total Nos */}
                      <td className="py-3 px-3 text-center font-mono">
                        <span className="font-bold text-slate-900 text-sm">
                          {bar.bars_per_element * (bar.no_of_elements || 1)}
                        </span>
                        {bar.no_of_elements > 1 && (
                          <span className="text-[10px] text-slate-500 block">
                            ({bar.no_of_elements} × {bar.bars_per_element})
                          </span>
                        )}
                      </td>

                      {/* Cutting Length */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {bar.cutting_length_m.toFixed(2)} m
                      </td>

                      {/* Total Length */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600 font-semibold">
                        {bar.total_length_m.toFixed(1)} m
                      </td>

                      {/* Total Weight */}
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-700 text-sm">
                        {bar.total_weight_kg.toFixed(1)} kg
                        <span className="text-[10px] text-slate-500 font-normal block">
                          ({bar.total_weight_tonnes.toFixed(3)} MT)
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenCustomDesigner(bar)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                            title="Open in Segment Turning & Bending Designer (Visual CAD)"
                          >
                            <Compass className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(bar)}
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                            title="Edit Segment Lengths (A-F), Dimension Driver & Spacing"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateBar(bar)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="Duplicate Bar Mark"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBar(bar.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Bar Mark"
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
        </div>
      </div>

      {/* DYNAMIC REBAR MODAL (ADD / EDIT) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl">
                  <Grid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {editingItemId ? `Edit Bar Mark: ${formBarMark}` : 'Add New Dynamic Bar Schedule Element'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Define straight lines (A, B, C, D, E, F), bend geometry, and chosen dimension driver for automated count
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBarForm} className="space-y-5 text-xs">
              {/* Top Row: Structure, Component, Mark, Diameter, Shape */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Structure Name</label>
                  <input
                    type="text"
                    required
                    value={formStructure}
                    onChange={(e) => setFormStructure(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Component</label>
                  <select
                    value={formComponent}
                    onChange={(e) => setFormComponent(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Deck Slab">Deck Slab</option>
                    <option value="Base Slab">Base Slab</option>
                    <option value="Abutment Wall">Abutment Wall</option>
                    <option value="Top Slab">Top Slab</option>
                    <option value="L-Cap Bed-Block">L-Cap Bed-Block</option>
                    <option value="Dirt Wall">Dirt Wall</option>
                    <option value="Crash Kerb">Crash Kerb</option>
                    <option value="Wing Wall">Wing Wall</option>
                    <option value="Stem">Wall Stem</option>
                    <option value="Footing">Footing</option>
                    <option value="Cover Slab">Cover Slab</option>
                    <option value="Beam">Beam</option>
                    <option value="Column">Column</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bar Mark</label>
                  <input
                    type="text"
                    required
                    value={formBarMark}
                    onChange={(e) => setFormBarMark(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-black text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Diameter (Ø mm)</label>
                  <select
                    value={formDia}
                    onChange={(e) => setFormDia(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {[8, 10, 12, 16, 20, 25, 32].map((d) => (
                      <option key={d} value={d}>
                        Ø {d} mm ({calculateRebarUnitWeight(d)} kg/m)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Shape Code Selector & Visual Preview Box */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      BS 8666 / IS 2502 Standard Shape Code
                    </label>
                    <select
                      value={formShape}
                      onChange={(e) => handleFormShapeChange(e.target.value as BBSShapeType)}
                      className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-xl font-bold text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="STRAIGHT">Shape 00: Straight Bar</option>
                      <option value="L_BEND">Shape 11: L-Bend / 90° Hook</option>
                      <option value="U_HOOK">Shape 21: Double L-Bend / U-Bar</option>
                      <option value="RECT_STIRRUP">Shape 51: Closed Stirrup / Tie (135° Hooks)</option>
                      <option value="CRANKED_BENT_UP">Shape 41: Cranked / Bent-Up (45° Bends)</option>
                      <option value="CHAIR_BAR">Shape 31: Chair Bar / Spacer</option>
                      <option value="CAP_BAR">Shape 71: Capping Bar with Outward Feet</option>
                      <option value="HAUNCH_TIE">Shape 61: 45° Corner Haunch Tie</option>
                      <option value="CIRCULAR_TIE">Shape 77: Circular Ring Link</option>
                      <option value="CUSTOM_MULTI_SEGMENT">Shape 99: Custom Multi-Segment (A-F)</option>
                    </select>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-indigo-700 block">
                      {BBS_SHAPE_CATALOG[formShape]?.name}
                    </span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {BBS_SHAPE_CATALOG[formShape]?.description}
                    </p>
                    <span className="text-[10px] font-mono text-emerald-700 block pt-1 font-semibold">
                      {BBS_SHAPE_CATALOG[formShape]?.formulaHint}
                    </span>
                  </div>
                </div>

                {/* Live Vector SVG Shape Canvas */}
                <div className="md:col-span-2 flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200 relative shadow-2xs">
                  <span className="absolute top-2 left-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Interactive Geometry Preview (A, B, C, D, E, F)
                  </span>
                  <div className="py-2">
                    <DynamicRebarShapeSvg
                      item={{
                        id: 'preview',
                        structure_name: formStructure,
                        component: formComponent,
                        bar_mark: formBarMark,
                        bar_diameter_mm: formDia,
                        shape_type: formShape,
                        no_of_elements: 1,
                        bars_per_element: 1,
                        length_a_m: formSegA,
                        length_b_m: formSegB,
                        length_c_m: formSegC,
                        length_d_m: formSegD,
                        length_e_m: formSegE,
                        length_f_m: formSegF,
                        bend_count_90: formBend90,
                        bend_count_135: formBend135,
                        bend_count_45: formBend45,
                        bend_count_180: formBend180,
                        cutting_length_m: formPreviewCut.cuttingLengthM,
                        total_length_m: formPreviewTotalLen,
                        unit_weight_kg_per_m: calculateRebarUnitWeight(formDia),
                        total_weight_kg: formPreviewWeightKg,
                        total_weight_tonnes: formPreviewWeightKg / 1000
                      }}
                      width={280}
                      height={100}
                      theme="light"
                    />
                  </div>
                  <div className="w-full flex items-center justify-between text-[11px] font-mono border-t border-slate-200 pt-1.5 px-2 text-slate-700">
                    <span>Cutting Len: <b className="text-emerald-700">{formPreviewCut.cuttingLengthM}m</b></span>
                    <span className="text-slate-500">{formPreviewCut.formulaExpression}</span>
                  </div>
                </div>
              </div>

              {/* Straight Line Segments Inputs (A, B, C, D, E, F) & Bend Settings */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    Straight Line Segments Dimensions (meters)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Gross Sum Σ = {formPreviewCut.grossSumM.toFixed(2)}m • Deductions = {formPreviewCut.bendDeductionM.toFixed(3)}m
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  <div className="bg-white p-2.5 rounded-xl border border-indigo-200 shadow-2xs">
                    <label className="block font-bold text-indigo-800 text-[11px] mb-1">
                      Segment A (m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formSegA}
                      onChange={(e) => setFormSegA(Number(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-500 block mt-1">Main Length / Base</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs">
                    <label className="block font-bold text-amber-800 text-[11px] mb-1">
                      Segment B (m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formSegB}
                      onChange={(e) => setFormSegB(Number(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-500 block mt-1">Leg 1 / Hook / Depth</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs">
                    <label className="block font-bold text-amber-800 text-[11px] mb-1">
                      Segment C (m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formSegC}
                      onChange={(e) => setFormSegC(Number(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-500 block mt-1">Leg 2 / Return / Crank</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <label className="block font-bold text-cyan-800 text-[11px] mb-1">
                      Segment D (m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formSegD}
                      onChange={(e) => setFormSegD(Number(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-500 block mt-1">Top / Side 4 / Foot 1</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <label className="block font-bold text-emerald-800 text-[11px] mb-1">
                      Segment E (m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formSegE}
                      onChange={(e) => setFormSegE(Number(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-500 block mt-1">Hook 1 / Foot 2</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <label className="block font-bold text-purple-800 text-[11px] mb-1">
                      Segment F (m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formSegF}
                      onChange={(e) => setFormSegF(Number(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-500 block mt-1">Hook 2 / Extension</span>
                  </div>
                </div>

                {/* Bend Deductions Config */}
                <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 text-[11px] shadow-2xs">
                  <span className="font-bold text-slate-700">Bend Quantities:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600">90° (-2d):</span>
                    <input
                      type="number"
                      min="0"
                      max="8"
                      value={formBend90}
                      onChange={(e) => setFormBend90(Number(e.target.value) || 0)}
                      className="w-12 px-2 py-0.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-center text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600">135° (-3d):</span>
                    <input
                      type="number"
                      min="0"
                      max="4"
                      value={formBend135}
                      onChange={(e) => setFormBend135(Number(e.target.value) || 0)}
                      className="w-12 px-2 py-0.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-center text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600">45° (-1d):</span>
                    <input
                      type="number"
                      min="0"
                      max="4"
                      value={formBend45}
                      onChange={(e) => setFormBend45(Number(e.target.value) || 0)}
                      className="w-12 px-2 py-0.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-center text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Number of Bars (Nos) Associated with Chosen Dimension */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-800 text-xs">
                      Number of Bars (Nos) Calculation from Chosen Dimension
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-slate-600 text-xs flex items-center gap-1.5 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={isDimensionLinked}
                        onChange={(e) => setIsDimensionLinked(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 bg-white border-slate-300 focus:ring-indigo-500"
                      />
                      <span>Link to Structural Dimension</span>
                    </label>
                  </div>
                </div>

                {isDimensionLinked ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="md:col-span-2">
                        <label className="block font-bold text-slate-700 mb-1">
                          Chosen Dimension Name
                        </label>
                        <input
                          type="text"
                          value={formDimName}
                          onChange={(e) => setFormDimName(e.target.value)}
                          placeholder="e.g. Barrel Length (Lb), Span (S)"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Dimension Value (m)
                        </label>
                        <input
                          type="number"
                          step="0.05"
                          min="0.1"
                          value={formDimVal}
                          onChange={(e) => setFormDimVal(Number(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-emerald-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Clear Cover (mm)
                        </label>
                        <input
                          type="number"
                          step="5"
                          min="15"
                          max="100"
                          value={formCoverMm}
                          onChange={(e) => setFormCoverMm(Number(e.target.value) || 40)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Spacing (c/c mm)
                        </label>
                        <input
                          type="number"
                          step="25"
                          min="50"
                          max="500"
                          value={formSpacingMm}
                          onChange={(e) => setFormSpacingMm(Number(e.target.value) || 150)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-indigo-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                        <div>
                          <span className="font-bold text-slate-800 text-xs block">
                            Layer / Member Multiplier
                          </span>
                          <span className="text-[10px] text-slate-500">
                            e.g. 2 for both faces/walls, 4 for 4 corners
                          </span>
                        </div>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={formMultiplier}
                          onChange={(e) => setFormMultiplier(Number(e.target.value) || 1)}
                          className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-center text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200 flex items-center justify-between shadow-2xs">
                        <div>
                          <span className="font-bold text-indigo-900 text-xs block">
                            Calculated Bars per Unit:
                          </span>
                          <span className="text-[10px] text-indigo-700 font-mono font-semibold">
                            {formPreviewNos.desc}
                          </span>
                        </div>
                        <span className="text-xl font-black font-mono text-emerald-700">
                          {formPreviewNos.barsPerEl} Nos
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Manual Bars per Structure Element
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formManualBarsPerEl}
                        onChange={(e) => setFormManualBarsPerEl(Number(e.target.value) || 1)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Number of Structure Units
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formNoOfElements}
                        onChange={(e) => setFormNoOfElements(Number(e.target.value) || 1)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Remarks Field */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reinforcement Notes & Specification Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bottom main tension rebar across span @ 125mm c/c"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div className="text-xs font-mono text-slate-600">
                  Total Weight Impact: <b className="text-emerald-700">{formPreviewWeightKg} kg</b> ({ (formPreviewWeightKg / 1000).toFixed(3) } MT)
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const currentItem = editingItemId
                        ? bbsItems.find((i) => i.id === editingItemId)
                        : undefined;
                      setIsFormOpen(false);
                      handleOpenCustomDesigner(currentItem);
                    }}
                    className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl font-bold transition text-xs flex items-center gap-1.5"
                    title="Open this bar mark in full vector segment designer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Visual Turning & Bending Designer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-md transition text-xs flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingItemId ? 'Update Bar Schedule Item' : 'Add to Schedule'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Segment Turning & Bending Designer Modal */}
      <CustomSegmentShapeEditorModal
        isOpen={isCustomDesignerOpen}
        onClose={() => setIsCustomDesignerOpen(false)}
        onSave={handleSaveCustomDesignerItem}
        initialItem={customDesignerItem}
        structureName={selectedStructureFilter !== 'ALL' ? selectedStructureFilter : 'RCC Structure'}
      />

      {/* Component-Wise Steel Sync to Project MB & BOQ Modal */}
      {isComponentSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto text-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <span>Sync Rebar Schedule to Project MB & BOQ</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200 uppercase">
                      Audit Compliant
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Map bar marks by component with cutting formulas, unit weights, and measurement book entries.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsComponentSyncModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sync Mode Selection */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSyncMode('unified')}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                  syncMode === 'unified'
                    ? 'bg-indigo-50/80 border-indigo-300 text-slate-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-900">Option A: Unified BOQ Item</span>
                  {syncMode === 'unified' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                </div>
                <span className="text-[11px] text-slate-600">
                  Consolidates all components into 1 Master Steel Reinforcement BOQ Item with itemized MB lines per mark.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSyncMode('component_wise')}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                  syncMode === 'component_wise'
                    ? 'bg-emerald-50/80 border-emerald-300 text-slate-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-900">Option B: Component-Mapped</span>
                  {syncMode === 'component_wise' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <span className="text-[11px] text-slate-600">
                  Maps Deck Slab, Walls, Slabs, Bed-Blocks & Foundations into separate component BOQ line items.
                </span>
              </button>
            </div>

            {/* Component Summary Breakdown Table */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Components in Bar Schedule ({Object.keys(componentSummaries).length} Components)</span>
                <span className="text-indigo-600 font-mono text-xs font-black">
                  Total Gross: {summary.grossT} MT ({summary.grossKg.toLocaleString()} kg)
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-black border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">Component</th>
                      <th className="px-3 py-2 text-center">Marks</th>
                      <th className="px-3 py-2 text-center">Diameters</th>
                      <th className="px-3 py-2 text-right">Net Weight</th>
                      <th className="px-3 py-2 text-right">Gross (+{wastagePercent}%)</th>
                      {syncMode === 'component_wise' && <th className="px-3 py-2">Target BOQ Item</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {Object.entries(componentSummaries).map(([cName, cSummary]) => {
                      const compGrossKg = Math.round(cSummary.totalKg * (1 + wastagePercent / 100));
                      const compGrossT = Number((compGrossKg / 1000).toFixed(3));
                      return (
                        <tr key={cName} className="hover:bg-slate-100/60 bg-white">
                          <td className="px-3 py-2.5 font-sans font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-600" />
                            <span>{cName}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center text-slate-700">
                            {cSummary.barMarksCount} marks ({cSummary.totalNos} bars)
                          </td>
                          <td className="px-3 py-2.5 text-center text-indigo-700 font-bold">
                            {Array.from(cSummary.diaSet).map((d) => `Ø${d}`).join(', ')}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-700">
                            {cSummary.totalKg.toLocaleString()} kg
                          </td>
                          <td className="px-3 py-2.5 text-right font-black text-emerald-700">
                            {compGrossT} MT ({compGrossKg.toLocaleString()} kg)
                          </td>
                          {syncMode === 'component_wise' && (
                            <td className="px-3 py-1.5 font-sans">
                              <select
                                value={componentTargetMapping[cName] || 'NEW_ITEM'}
                                onChange={(e) =>
                                  setComponentTargetMapping((prev) => ({
                                    ...prev,
                                    [cName]: e.target.value
                                  }))
                                }
                                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-[11px] text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              >
                                <option value="NEW_ITEM">✨ Create New BOQ Item ({cName})</option>
                                {project?.items.map((it, idx) => (
                                  <option key={it.id} value={it.id}>
                                    #{idx + 1} ({it.code || 'BOQ'}): {it.description.slice(0, 32)}...
                                  </option>
                                ))}
                              </select>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sync Settings */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-bold">
                  <input
                    type="checkbox"
                    checked={includeCuttingFormulas}
                    onChange={(e) => setIncludeCuttingFormulas(e.target.checked)}
                    className="rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Include dynamic segment formulas & dimension drivers in MB remarks</span>
                </label>
                <span className="text-[11px] text-slate-500 font-medium">Generates mathematical audit trace</span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 pt-2.5">
                <span className="text-slate-600 font-bold">Wastage / Rolling Margin Allowance:</span>
                <span className="font-mono font-black text-emerald-700">+{wastagePercent}% Included in Procurement</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsComponentSyncModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteComponentWiseSync}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-black shadow-md transition text-xs flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Sync to Project MB / BOQ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
