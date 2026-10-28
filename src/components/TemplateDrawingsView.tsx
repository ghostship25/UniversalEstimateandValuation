import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Download,
  Printer,
  FileImage,
  Layers,
  Settings,
  Maximize2,
  Minimize2,
  Eye,
  CheckCircle2,
  Info,
  Sliders,
  Save,
  Grid,
  Sun,
  Moon,
  PenTool,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  AlertTriangle,
  History,
  SlidersHorizontal,
  X,
  HelpCircle,
  Table,
  Shield,
  Workflow,
  Link,
  Unlink,
  RefreshCw,
  Cpu,
  Folder,
  FolderOpen,
  FileCode,
  Sparkles,
  Plus,
  Trash2,
  UploadCloud,
  Star,
  BookmarkPlus,
  BookmarkCheck,
  FileSpreadsheet,
  Edit2,
  Edit3,
  ChevronDown,
  ChevronUp,
  Check,
  MoreHorizontal,
  Compass
} from 'lucide-react';
import { ProjectEstimate, BOQItem, ZoneInfo, EstimateMBVersion } from '../types';
import {
  loadUserCustomCADTemplates,
  saveOrUpdateCustomCADTemplate,
  getDefaultCADTemplateIds,
  toggleDefaultCADTemplateStatus
} from '../services/templateStorage';
import {
  DrawingCategory,
  DrainType,
  RoadType,
  CulvertType,
  ProtectionWallType,
  DrainParameters,
  RoadParameters,
  CulvertParameters,
  ProtectionWallParameters,
  DrawingSectionDef,
  ProtectionWallComponentMapping,
  ParameterChangeLog,
  DrawingParameterMapping,
  ParamSourceStatus,
  UploadedDrawingRecord
} from './drawings/types';
import { DrawingHatchDefs } from './drawings/DrawingHatchDefs';
import { DimensionLine } from './drawings/DimensionLine';
import { DrawingTitleBlock } from './drawings/DrawingTitleBlock';
import { ProtectionWallDrawing } from './drawings/ProtectionWallDrawing';
import { SlabCulvertDrawing } from './drawings/SlabCulvertDrawing';
import { BoxCulvertDrawing } from './drawings/BoxCulvertDrawing';
import { APP_FOLDER_CAD_TEMPLATES } from './drawings/templates';
import { CADTemplateDef } from './drawings/templates/types';
import { CADFolderTemplateBrowser } from './drawings/CADFolderTemplateBrowser';
import { CADCanvasOnDrawingOverlay } from './drawings/CADCanvasOnDrawingOverlay';
import { DrawingUploadRegistryModal } from './drawings/DrawingUploadRegistryModal';
import { TemplateDrawingView } from '../modules/tools/TemplateDrawingView';
import { TemplateEditorView } from './TemplateEditorView';
import { VisualGeometryMBEditor } from '../modules/tools/VisualGeometryMBEditor';
import {
  TemplateWorkItemOutput,
  MBRow,
  RateNormItem,
  ResourceMaster,
  ValuationMBBook,
  ValuationMBRow
} from '../types';
import { EstimateAndValuationMBFeedModal } from './drawings/EstimateAndValuationMBFeedModal';
import { BOQStructureComponentMappingPanel } from './drawings/BOQStructureComponentMappingPanel';
import {
  getDefaultComponentsForStructureVariant,
  autoMatchComponentsForProject,
  calculateComponentMBValues
} from '../services/boqStructureMappingService';
import { loadEstimateMBVersions, feedCADSectionsToValuationMB } from '../services/estimateMBVersioning';
import { currencyCode } from '../services/currency';

interface TemplateDrawingsViewProps {
  project: ProjectEstimate;
  setProject: React.Dispatch<React.SetStateAction<ProjectEstimate>>;
  selectedZone: ZoneInfo;
  selectedFY: string;
  norms?: RateNormItem[];
  resources?: ResourceMaster[];
  valuationBooks?: ValuationMBBook[];
  setValuationBooks?: React.Dispatch<React.SetStateAction<ValuationMBBook[]>>;
  valuationRows?: ValuationMBRow[];
  setValuationRows?: React.Dispatch<React.SetStateAction<ValuationMBRow[]>>;
  onNavigateToTab?: (tab: string) => void;
}

export const TemplateDrawingsView: React.FC<TemplateDrawingsViewProps> = ({
  project,
  setProject,
  selectedZone,
  selectedFY,
  norms = [],
  resources = [],
  valuationBooks = [],
  setValuationBooks,
  valuationRows = [],
  setValuationRows,
  onNavigateToTab
}) => {
  // Ref for SVG element export
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  // Helper to read initial saved drawing parameters
  const initialSavedParams = useMemo(() => {
    try {
      const savedKey = `uev_drawing_params_${project.id}`;
      const saved = (project as any)?.drawing_params || (localStorage.getItem(savedKey) ? JSON.parse(localStorage.getItem(savedKey)!) : null);
      return saved || {};
    } catch {
      return {};
    }
  }, [project.id]);

  // Category & Sub-type selection
  const [category, setCategory] = useState<DrawingCategory>(() => initialSavedParams.category || 'drain');
  const [drainType, setDrainType] = useState<DrainType>(() => {
    const raw = initialSavedParams.drainType;
    if (raw === 'rectangular' || !raw) return 'rcc_rectangular';
    return raw;
  });
  const [roadType, setRoadType] = useState<RoadType>(() => initialSavedParams.roadType || 'flexible_asphalt');
  const [culvertType, setCulvertType] = useState<CulvertType>(() => initialSavedParams.culvertType || 'box_single');
  const [wallType, setWallType] = useState<ProtectionWallType>(() => initialSavedParams.wallType || 'plum_concrete');

  // Selected BOQ Item for Binding
  const [selectedItemId, setSelectedItemId] = useState<string>(() => initialSavedParams.selectedItemId || '');
  const [activeTemplateId, setActiveTemplateId] = useState<string>(() => initialSavedParams.activeTemplateId || 'tpl_drain_rcc_rectangular');

  // Canvas visual options
  const [canvasTheme, setCanvasTheme] = useState<'cad' | 'paper' | 'blueprint'>('cad');
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showHatching, setShowHatching] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showTitleBlock, setShowTitleBlock] = useState<boolean>(true);
  const [showLegend, setShowLegend] = useState<boolean>(true);
  const [drawingScale, setDrawingScale] = useState<string>('1:20');

  // Interactive Pan & Zoom Controls
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPanPos, setStartPanPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Modals & Drawers
  const [showConfirmSaveModal, setShowConfirmSaveModal] = useState<boolean>(false);
  const [showMappingModal, setShowMappingModal] = useState<boolean>(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [showTopMoreMenu, setShowTopMoreMenu] = useState<boolean>(false);

  // Parameter Change History Log
  const [changeHistory, setChangeHistory] = useState<ParameterChangeLog[]>([]);

  // Parameter Mapping Configuration
  const [mappings, setMappings] = useState<DrawingParameterMapping[]>([
    { drawingParam: 'invertWidth / carriagewayWidth / clearSpan', boqField: 'breadth', label: 'Section Width / Span -> BOQ Breadth' },
    { drawingParam: 'depth / clearHeight', boqField: 'height', label: 'Section Depth / Clear Height -> BOQ Height' },
    { drawingParam: 'wallThickness', boqField: 'custom_wall_thickness', label: 'Wall Thickness -> Custom Field' },
    { drawingParam: 'baseThickness / slabThickness', boqField: 'custom_base_thickness', label: 'Base/Slab Thickness -> Custom Field' }
  ]);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Handle batch push of computed template items to Measurement Book
  const handlePushCalculatedItemsToMB = (workItems: TemplateWorkItemOutput[], chainageOrLoc: string) => {
    setProject((prev) => {
      const updatedItems = [...prev.items];

      workItems.forEach((workItem, idx) => {
        // Find if item already exists by code or description
        const existingIdx = updatedItems.findIndex(
          (it) => it.description.toLowerCase() === workItem.item_name.toLowerCase() ||
                  (workItem.dor_item_no && it.code === workItem.dor_item_no)
        );

        const newMBRow: MBRow = {
          id: `mb_tmpl_${Date.now()}_${idx}`,
          particulars: `${chainageOrLoc}: ${workItem.item_name} [${workItem.particulars_template}]`,
          no_of_units: 1,
          length: workItem.unit_rate_qty > 0 ? 1 : 1,
          breadth: 1,
          height: 1,
          quantity: workItem.calculated_quantity,
          formula: workItem.particulars_template,
          remarks: 'Auto-mapped from Parametric Drawing Template'
        };

        if (existingIdx >= 0) {
          // Append row to existing item
          const existingItem = updatedItems[existingIdx];
          const updatedRows = [...(existingItem.mb_rows || []), newMBRow];
          const newTotalQty = parseFloat(updatedRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0).toFixed(3));
          const effectiveRate = existingItem.calculated_unit_rate || existingItem.user_rate || 0;

          updatedItems[existingIdx] = {
            ...existingItem,
            estimated_quantity: newTotalQty,
            total_amount: Math.round(newTotalQty * effectiveRate * 100) / 100,
            mb_rows: updatedRows
          };
        } else {
          // Create a new BOQ item for this work
          const newItemId = `item_tmpl_${Date.now()}_${idx}`;
          const defaultRate = 1200; // estimated unit rate
          updatedItems.push({
            id: newItemId,
            item_id: Date.now() + idx,
            item_code: workItem.dor_item_no || `DWG-${idx + 1}`,
            code: workItem.dor_item_no || `DWG-${idx + 1}`,
            description: workItem.item_name,
            unit: workItem.unit,
            estimated_quantity: workItem.calculated_quantity,
            calculated_unit_rate: defaultRate,
            user_rate: defaultRate,
            total_amount: Math.round(workItem.calculated_quantity * defaultRate * 100) / 100,
            chapter: 'Drawings & Civil Infrastructure Works',
            mb_rows: [newMBRow]
          });
        }
      });

      return {
        ...prev,
        items: updatedItems
      };
    });

    showToast(`Transferred ${workItems.length} computed work items to Measurement Book for ${chainageOrLoc}!`);
  };

  // --- DRAIN PARAMETERS STATE ---
  const [drainParams, setDrainParams] = useState<DrainParameters>(() => ({
    invertWidth: 0.60,          // B (Invert/Clear Bottom Width)
    depth: 0.75,                // H (Internal Depth)
    wallThickness: 0.20,        // Tw (Wall Thickness for RCC)
    baseThickness: 0.20,        // Tb (Base Slab Thickness)
    roadSideWallThickness: 0.35,// Tw_road (Road side wall width for Plum/Brick)
    userSideWallThickness: 0.25,// Tw_user (User side wall width for Plum/Brick)
    hasCoverSlab: true,         // Cover Slab (may or may not have)
    coverSlabThickness: 0.10,   // Tc (Top RCC Cover Slab)
    coverSlabWidth: 1.00,       // Wc (Top RCC Cover Slab Width)
    plumBoulderPercent: 40,     // 40% plum boulders
    topPccThickness: 0.075,     // 75mm Top PCC Coping band for brick drain
    hasPunningFullHeight: true, // Full height neat cement punning
    freeboard: 0.15,            // F (Freeboard depth)
    waterDepth: 0.50,           // Dw (Water depth)
    plasterThickness: 0.0125,
    material: 'concrete',
    ...(initialSavedParams.drainParams || {})
  }));

  // --- ROAD PARAMETERS STATE ---
  const [roadParams, setRoadParams] = useState<RoadParameters>(() => ({
    carriagewayWidth: 5.50, // Wc (Carriageway width)
    shoulderLeft: 1.20,     // Ws_L
    shoulderRight: 1.20,    // Ws_R
    camberPercent: 2.5,     // Camber slope %
    camberType: 'crown',    // Two-sided crown vs Crossfall
    asphaltThickness: 0.05, // 50mm Asphalt Concrete
    baseThickness: 0.15,    // 150mm Base Course
    subBaseThickness: 0.20, // 200mm Sub-Base
    subgradeThickness: 0.30,// 300mm Subgrade
    sideSlopeHV: 1.5,       // Embankment slope 1:1.5
    shoulderMaterial: 'gravel',
    sideDrainWidth: 0.60,
    sideDrainDepth: 0.50,
    ...(initialSavedParams.roadParams || {})
  }));

  // --- CULVERT PARAMETERS STATE ---
  const [culvertParams, setCulvertParams] = useState<CulvertParameters>(() => ({
    clearSpan: 2.00,        // S (Clear Span)
    clearHeight: 1.80,      // H (Clear Height)
    topSlabThickness: 0.25, // Tt (Top Slab)
    bottomSlabThickness: 0.30, // Tb (Bottom Slab)
    wallThickness: 0.25,    // Tw (Outer Wall)
    barrelLength: 7.50,     // Lb (Barrel Length)
    fillHeight: 0.60,       // Hf (Fill over top slab / pipe)
    pipeDia: 0.90,          // Pipe Internal Diameter
    pipeCount: 1,           // 1, 2, or 3 pipes
    pipeWallThickness: 0.09,// Pipe wall (90mm)
    pipeSpacing: 0.30,      // Spacing between multiple pipes
    beddingDepth: 0.20,     // Bedding concrete depth
    abutmentHeight: 2.20,   // Abutment wall height for slab culvert
    wingWallLength: 3.00,
    waterLevel: 0.80,
    ...(initialSavedParams.culvertParams || {})
  }));

  // --- PROTECTION WALL PARAMETERS STATE ---
  const [protectionWallParams, setProtectionWallParams] = useState<ProtectionWallParameters>(() => ({
    wallTopWidth: 0.60,
    wallBottomWidth: 1.50,
    wallHeight: 2.50,
    wallLength: 10.0,
    frontBatterRatio: 0.1,
    pccWidth: 1.80,
    pccThickness: 0.15,
    solingWidth: 1.80,
    solingThickness: 0.15,
    excavationWidth: 2.40,
    excavationDepth: 2.80,
    workingSpace: 0.30,
    formworkHeight: 2.51,
    formworkArea: 50.2,
    formworkSides: 'both',
    weepHoles: true,
    backfillSlopeHV: 1.5,
    wallAlignmentOnPcc: 'flush_back',
    manualOverrides: {},
    ...(initialSavedParams.protectionWallParams || {})
  }));

  // --- MULTI-SECTION PROVISIONS (Sections 1-1, 2-2, 3-3...) ---
  // Load saved sections from localStorage or project state so sections persist across tab switching
  const [wallSections, setWallSections] = useState<DrawingSectionDef[]>(() => {
    try {
      const key = `uev_wall_sections_${project.id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      if ((project as any)?.wall_sections && Array.isArray((project as any).wall_sections) && (project as any).wall_sections.length > 0) {
        return (project as any).wall_sections;
      }
      if (initialSavedParams?.wallSections && Array.isArray(initialSavedParams.wallSections) && initialSavedParams.wallSections.length > 0) {
        return initialSavedParams.wallSections;
      }
    } catch {}
    return [
      {
        id: 'sec-1',
        sectionCode: 'SECTION 1-1',
        title: 'Section 1-1 (Ch. 0+000 to 0+050) H = 2.50m',
        chainageStart: '0+000',
        chainageEnd: '0+050',
        params: {
          wallTopWidth: 0.60,
          wallBottomWidth: 1.50,
          wallHeight: 2.50,
          wallLength: 50.0,
          frontBatterRatio: 0.1,
          pccWidth: 1.80,
          pccThickness: 0.15,
          solingWidth: 1.80,
          solingThickness: 0.15,
          excavationWidth: 2.40,
          excavationDepth: 2.80,
          workingSpace: 0.30,
          formworkHeight: 2.51,
          formworkArea: 251.0,
          formworkSides: 'both',
          weepHoles: true,
          backfillSlopeHV: 1.5,
          wallAlignmentOnPcc: 'flush_back',
          manualOverrides: {}
        }
      }
    ];
  });

  const [activeSectionId, setActiveSectionId] = useState<string>(() => {
    try {
      const key = `uev_wall_sections_${project.id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0].id;
        }
      }
    } catch {}
    return 'sec-1';
  });

  // --- UPLOADED CUSTOM DRAWINGS REGISTRY STATE ---
  const [uploadedDrawings, setUploadedDrawings] = useState<UploadedDrawingRecord[]>(() => {
    try {
      const key = `uev_uploaded_drawings_${project.id}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);

  const handleAddDrawingRecord = (record: UploadedDrawingRecord) => {
    setUploadedDrawings((prev) => {
      const updated = [record, ...prev];
      try {
        localStorage.setItem(`uev_uploaded_drawings_${project.id}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast(`Registered custom drawing: ${record.structureName}`);
  };

  const handleDeleteDrawingRecord = (id: string) => {
    setUploadedDrawings((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem(`uev_uploaded_drawings_${project.id}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast('Removed drawing from registry.');
  };

  const activeSection = useMemo(() => {
    return wallSections.find((s) => s.id === activeSectionId) || wallSections[0];
  }, [wallSections, activeSectionId]);

  const handleSelectSection = (secId: string) => {
    setActiveSectionId(secId);
    const target = wallSections.find((s) => s.id === secId);
    if (target) {
      setProtectionWallParams({ ...target.params });
      showToast(`Switched active section to ${target.sectionCode}`);
    }
  };

  const handleAddSection = () => {
    const nextNum = wallSections.length + 1;
    const secCode = `SECTION ${nextNum}-${nextNum}`;
    const newSecId = `sec-${Date.now()}`;
    const baseParams = activeSection ? { ...activeSection.params } : { ...protectionWallParams };
    const newH = parseFloat((baseParams.wallHeight + 0.5).toFixed(2));
    const newBotW = parseFloat((baseParams.wallBottomWidth + 0.2).toFixed(2));
    const secLen = baseParams.wallLength || 50.0;

    const newSecParams: ProtectionWallParameters = {
      ...baseParams,
      wallHeight: newH,
      wallBottomWidth: newBotW,
      wallAlignmentOnPcc: baseParams.wallAlignmentOnPcc || 'flush_back'
    };

    const newSec: DrawingSectionDef = {
      id: newSecId,
      sectionCode: secCode,
      title: `${secCode} (Ch. 0+${(nextNum - 1) * 50} to 0+${nextNum * 50}) H = ${newH.toFixed(2)}m`,
      chainageStart: `0+${(nextNum - 1) * 50}`,
      chainageEnd: `0+${nextNum * 50}`,
      params: newSecParams
    };

    setWallSections((prev) => [...prev, newSec]);
    setActiveSectionId(newSecId);
    setProtectionWallParams({ ...newSecParams });

    showToast(`Added ${secCode} & incorporated section detail rows into Measurement Book (MB)!`);
  };

  const handleDeleteSection = (secId: string) => {
    if (wallSections.length <= 1) {
      showToast('At least one drawing section must remain.');
      return;
    }

    const secToDelete = wallSections.find((s) => s.id === secId);
    const filtered = wallSections.filter((s) => s.id !== secId);
    setWallSections(filtered);
    setActiveSectionId(filtered[0].id);
    setProtectionWallParams({ ...filtered[0].params });

    showToast(`Deleted ${secToDelete?.sectionCode || 'Section'} & updated Measurement Book (MB)!`);
  };

  // Section Renaming State & Handlers
  const [showRenameSectionModal, setShowRenameSectionModal] = useState<boolean>(false);
  const [renamingSectionId, setRenamingSectionId] = useState<string>('');
  const [renamingCode, setRenamingCode] = useState<string>('');
  const [renamingTitle, setRenamingTitle] = useState<string>('');
  const [renamingChainageStart, setRenamingChainageStart] = useState<string>('');
  const [renamingChainageEnd, setRenamingChainageEnd] = useState<string>('');

  const handleStartRenameSection = (secId: string) => {
    const sec = wallSections.find((s) => s.id === secId);
    if (!sec) return;
    setRenamingSectionId(sec.id);
    setRenamingCode(sec.sectionCode);
    setRenamingTitle(sec.title);
    setRenamingChainageStart(sec.chainageStart || '');
    setRenamingChainageEnd(sec.chainageEnd || '');
    setShowRenameSectionModal(true);
  };

  const handleSaveRenameSection = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!renamingCode.trim()) {
      showToast('Section code cannot be empty.');
      return;
    }
    const cleanCode = renamingCode.trim();
    const cleanTitle = renamingTitle.trim() || `${cleanCode} (H=${(activeSection?.params.wallHeight || 0).toFixed(2)}m)`;
    
    setWallSections((prev) =>
      prev.map((s) => {
        if (s.id === renamingSectionId) {
          return {
            ...s,
            sectionCode: cleanCode,
            title: cleanTitle,
            chainageStart: renamingChainageStart.trim(),
            chainageEnd: renamingChainageEnd.trim()
          };
        }
        return s;
      })
    );

    setShowRenameSectionModal(false);
    showToast(`✏️ Renamed section to "${cleanCode}"!`);
  };

  // Minimized Panels / Accordion state for reduced scrolling ergonomics
  const [collapsedPanels, setCollapsedPanels] = useState<Record<string, boolean>>({
    live_sync: false,          // Live-Sync header card
    wall_dimensions: false,    // Essential Wall geometry (open by default)
    rcc_bed_geometry: false,   // RCC Bed slab & haunch (open when RCC active)
    masonry_finishes: false,   // Brick/Stone Finishes (plaster & punning)
    foundation_layers: true,   // Foundation & Bed layers (minimized by default)
    excavation_formwork: true, // Excavation & Formwork (minimized by default)
    display_options: true,     // Canvas Display & Theme (minimized by default)
    drain_geometry: false,
    drain_foundation: false,   // Drain PCC, Soling & Trench Excavation
    road_geometry: false,
    culvert_geometry: false
  });

  const togglePanel = (panelKey: string) => {
    setCollapsedPanels((prev) => ({
      ...prev,
      [panelKey]: !prev[panelKey]
    }));
  };

  const setAllPanelsCollapsed = (collapsed: boolean) => {
    setCollapsedPanels({
      live_sync: collapsed,
      wall_dimensions: collapsed,
      rcc_bed_geometry: collapsed,
      masonry_finishes: collapsed,
      foundation_layers: collapsed,
      excavation_formwork: collapsed,
      display_options: collapsed,
      drain_geometry: collapsed,
      drain_foundation: collapsed,
      road_geometry: collapsed,
      culvert_geometry: collapsed
    });
  };

  const areAllPanelsCollapsed = useMemo(() => {
    const relevantKeys = ['wall_dimensions', 'rcc_bed_geometry', 'foundation_layers', 'excavation_formwork', 'display_options'];
    return relevantKeys.every((k) => !!collapsedPanels[k]);
  }, [collapsedPanels]);


  const [protectionWallMapping, setProtectionWallMapping] = useState<ProtectionWallComponentMapping>(() => {
    const baseMapping: ProtectionWallComponentMapping = {
      excavationItemId: '',
      solingItemId: '',
      pccItemId: '',
      wallItemId: '',
      formworkItemId: '',
      ...(initialSavedParams.protectionWallMapping || {})
    };
    if (!baseMapping.dynamicComponents || baseMapping.dynamicComponents.length === 0) {
      const initialVariant = initialSavedParams.wallType || 'plum_concrete';
      baseMapping.dynamicComponents = getDefaultComponentsForStructureVariant(initialVariant, baseMapping);
    }
    return baseMapping;
  });

  const [showAssemblySyncModal, setShowAssemblySyncModal] = useState<boolean>(false);
  const [showMBFeedModal, setShowMBFeedModal] = useState<boolean>(false);
  const [mbFeedModalInitialTab, setMbFeedModalInitialTab] = useState<'feed_estimate' | 'feed_valuation' | 'version_history'>('feed_estimate');
  const [liveSyncTarget, setLiveSyncTarget] = useState<'estimate_mb' | 'valuation_mb' | 'disabled'>(() => {
    if (initialSavedParams.liveSyncTarget) return initialSavedParams.liveSyncTarget;
    if (typeof initialSavedParams.liveSyncEnabled === 'boolean' && !initialSavedParams.liveSyncEnabled) return 'disabled';
    return 'estimate_mb';
  });
  const [liveSyncScope, setLiveSyncScope] = useState<'active_section' | 'all_sections'>(() => initialSavedParams.liveSyncScope || 'all_sections');
  const [liveValuationBookId, setLiveValuationBookId] = useState<string>(() => initialSavedParams.liveValuationBookId || valuationBooks[0]?.id || '');
  const [showFolderBrowser, setShowFolderBrowser] = useState<boolean>(false);

  // Restore or reload saved drawing sections from an Estimate MB Version snapshot
  const handleLoadEstimateDrawing = (ver: EstimateMBVersion) => {
    if (ver.saved_drawing_sections && ver.saved_drawing_sections.length > 0) {
      setWallSections(ver.saved_drawing_sections);
      setActiveSectionId(ver.saved_drawing_sections[0].id);
      if (ver.saved_drawing_sections[0].params) {
        setProtectionWallParams({ ...ver.saved_drawing_sections[0].params });
      }
    } else if (ver.sections_summary && ver.sections_summary.length > 0) {
      const reconstructedSections: DrawingSectionDef[] = ver.sections_summary.map((s, idx) => ({
        id: `sec-restored-${idx + 1}-${Date.now()}`,
        sectionCode: s.sectionCode,
        title: s.title || `${s.sectionCode} H=${s.height}m`,
        chainageStart: s.chainageStart,
        chainageEnd: s.chainageEnd,
        params: {
          ...protectionWallParams,
          wallLength: s.length,
          wallHeight: s.height,
          wallTopWidth: s.width,
          wallBottomWidth: s.width
        }
      }));
      setWallSections(reconstructedSections);
      setActiveSectionId(reconstructedSections[0].id);
    }

    if (ver.saved_drawing_params) {
      setProtectionWallParams({ ...ver.saved_drawing_params });
    }
    if (ver.saved_variant_key) {
      setWallType(ver.saved_variant_key as ProtectionWallType);
    }
    if (ver.saved_mapping) {
      setProtectionWallMapping({ ...ver.saved_mapping });
    }

    showToast(`📐 Loaded original drawing sections & parameters from Estimate Version ${ver.version_number}!`);
  };

  // Custom CAD templates & default template IDs state
  const [customCADTemplates, setCustomCADTemplates] = useState<CADTemplateDef[]>(() => loadUserCustomCADTemplates());
  const [defaultCADTemplateIds, setDefaultCADTemplateIds] = useState<string[]>(() => getDefaultCADTemplateIds());

  // Save current viewport drawing as custom template modal state
  const [showSaveCustomModal, setShowSaveCustomModal] = useState<boolean>(false);
  const [saveCustomName, setSaveCustomName] = useState<string>('');
  const [saveCustomDesc, setSaveCustomDesc] = useState<string>('');
  const [saveCustomTags, setSaveCustomTags] = useState<string>('Custom, CAD, Drawing');
  const [saveCustomSetDefault, setSaveCustomSetDefault] = useState<boolean>(true);

  // Combine built-in templates and user-created custom templates
  const allCADTemplates = useMemo(() => {
    return [...customCADTemplates, ...APP_FOLDER_CAD_TEMPLATES];
  }, [customCADTemplates]);

  // Active CAD Template resolution
  const activeCADTemplate = useMemo(() => {
    return (
      allCADTemplates.find((t) => t.id === activeTemplateId) ||
      allCADTemplates.find((t) => t.category === category && defaultCADTemplateIds.includes(t.id)) ||
      allCADTemplates.find((t) => t.category === category) ||
      allCADTemplates[0]
    );
  }, [allCADTemplates, activeTemplateId, category, defaultCADTemplateIds]);

  const isCurrentTemplateDefault = useMemo(() => {
    return activeCADTemplate ? defaultCADTemplateIds.includes(activeCADTemplate.id) : false;
  }, [activeCADTemplate, defaultCADTemplateIds]);

  // Toggle default template status for the active template
  const handleToggleCurrentDefault = () => {
    if (!activeCADTemplate) return;
    const isNowDefault = toggleDefaultCADTemplateStatus(activeCADTemplate.id);
    setDefaultCADTemplateIds(getDefaultCADTemplateIds());
    showToast(
      isNowDefault
        ? `⭐ Set "${activeCADTemplate.name}" as Default Template!`
        : `Removed "${activeCADTemplate.name}" from Default Templates.`
    );
  };

  // Load CAD template selected from app directory browser & Activate BBS Preset
  const handleSelectTemplate = (tpl: CADTemplateDef) => {
    setActiveTemplateId(tpl.id);
    setCategory(tpl.category);
    if (tpl.category === 'drain') {
      setDrainType(tpl.variantKey as DrainType);
      setDrainParams({ ...tpl.defaultParams } as any);
    } else if (tpl.category === 'road') {
      setRoadType(tpl.variantKey as RoadType);
      setRoadParams({ ...tpl.defaultParams } as any);
    } else if (tpl.category === 'culvert') {
      setCulvertType(tpl.variantKey as CulvertType);
      setCulvertParams({ ...tpl.defaultParams } as any);
    } else if (tpl.category === 'protection_wall') {
      setWallType(tpl.variantKey as ProtectionWallType);
      setProtectionWallParams({ ...tpl.defaultParams } as any);
    }

    // Automatically persist active preset so Bar Bending Schedule (BBS) immediately binds to this drawing
    try {
      const presetPayload = {
        category: tpl.category,
        variantKey: tpl.variantKey,
        structureName: tpl.name,
        params: tpl.defaultParams,
        timestamp: Date.now()
      };
      localStorage.setItem(`uev_active_bbs_preset_${project.id}`, JSON.stringify(presetPayload));
      localStorage.setItem('uev_active_bbs_preset', JSON.stringify(presetPayload));
    } catch {}

    showToast(`Loaded CAD Template "${tpl.name}" & synced Bar Bending dimensions.`);
  };

  // Open / Navigate to Bar Bending Schedule (BBS) with active drawing parameters
  const handleOpenBarBendingSchedule = (customCat?: DrawingCategory, customVariant?: string, customParams?: any) => {
    const activeCat = customCat || category;
    const activeVar = customVariant || activeVariantKey;
    const activeParams = customParams || activeParamValues;

    const presetPayload = {
      category: activeCat,
      variantKey: activeVar,
      structureName: activeVariantTitle,
      params: activeParams,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(`uev_active_bbs_preset_${project.id}`, JSON.stringify(presetPayload));
      localStorage.setItem('uev_active_bbs_preset', JSON.stringify(presetPayload));
    } catch {}

    showToast(`Activated Bar Bending Schedule (BBS) for ${activeVariantTitle}!`);

    if (onNavigateToTab) {
      onNavigateToTab('bar-bending-schedule');
    }
  };

  // Open Save Viewport as Custom Template Modal
  const handleOpenSaveAsTemplateModal = () => {
    let defaultTitle = '';
    if (category === 'protection_wall') {
      defaultTitle = `${activeSection.title || 'Protection Wall'} (H=${protectionWallParams.wallHeight}m)`;
    } else if (category === 'drain') {
      defaultTitle = `Custom ${drainType.toUpperCase()} Drain (B=${drainParams.invertWidth}m)`;
    } else if (category === 'road') {
      defaultTitle = `Custom ${roadType.toUpperCase()} Road (W=${roadParams.carriagewayWidth}m)`;
    } else if (category === 'culvert') {
      defaultTitle = `Custom ${culvertType.toUpperCase()} Culvert (Span=${culvertParams.clearSpan}m)`;
    }
    setSaveCustomName(defaultTitle);
    setSaveCustomDesc(`User custom parametric template saved with fine-tuned cross-section dimensions.`);
    setSaveCustomTags(`Custom, CAD, ${category}`);
    setSaveCustomSetDefault(true);
    setShowSaveCustomModal(true);
  };

  // Save current viewport parameters as a new custom CAD template
  const handleSaveCustomTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveCustomName.trim() || !activeCADTemplate) return;

    const newId = `custom_cad_${Date.now()}`;
    const currentParams = activeParamValues;

    const newCADTemplate: CADTemplateDef = {
      id: newId,
      name: saveCustomName.trim(),
      category: category,
      variantKey: category === 'protection_wall' ? wallType : category === 'drain' ? drainType : category === 'road' ? roadType : culvertType,
      folderPath: '/user/custom/drawings/',
      fileName: `Custom_${category}_${newId.slice(-4)}.cad`,
      description: saveCustomDesc.trim() || `User custom CAD drawing template for ${saveCustomName.trim()}.`,
      dimensionFields: activeCADTemplate.dimensionFields.map((f) => ({
        ...f,
        defaultValue: currentParams[f.key] !== undefined ? currentParams[f.key] : f.defaultValue
      })),
      defaultParams: { ...currentParams },
      tags: saveCustomTags.split(',').map((t) => t.trim()).filter(Boolean),
      is_custom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = saveOrUpdateCustomCADTemplate(newCADTemplate);
    setCustomCADTemplates(updated);
    setActiveTemplateId(newId);

    if (saveCustomSetDefault) {
      toggleDefaultCADTemplateStatus(newId);
      setDefaultCADTemplateIds(getDefaultCADTemplateIds());
    }

    setShowSaveCustomModal(false);
    showToast(`💾 Saved custom CAD template "${newCADTemplate.name}"! ${saveCustomSetDefault ? 'Marked as Default ⭐' : ''}`);
  };

  // Reset drawing dimensions back to CAD template defaults
  const handleResetToTemplateDefaults = () => {
    if (!activeCADTemplate) return;
    if (category === 'drain') {
      setDrainParams({ ...activeCADTemplate.defaultParams } as any);
    } else if (category === 'road') {
      setRoadParams({ ...activeCADTemplate.defaultParams } as any);
    } else if (category === 'culvert') {
      setCulvertParams({ ...activeCADTemplate.defaultParams } as any);
    } else if (category === 'protection_wall') {
      setProtectionWallParams({ ...activeCADTemplate.defaultParams } as any);
    }
    showToast(`Reset CAD drawing dimensions to template defaults (${activeCADTemplate.name})`);
  };

  // Active Parameter Values for On-Canvas CAD Overlay
  const activeParamValues = useMemo(() => {
    if (category === 'drain') return drainParams;
    if (category === 'road') return roadParams;
    if (category === 'culvert') return culvertParams;
    if (category === 'protection_wall') return protectionWallParams;
    return {};
  }, [category, drainParams, roadParams, culvertParams, protectionWallParams]);

  const handleUpdateOverlayDimension = (key: string, val: number) => {
    if (category === 'drain') {
      setDrainParams((p) => ({ ...p, [key]: val }));
    } else if (category === 'road') {
      setRoadParams((p) => ({ ...p, [key]: val }));
    } else if (category === 'culvert') {
      setCulvertParams((p) => ({ ...p, [key]: val }));
    } else if (category === 'protection_wall') {
      handleUpdateProtectionWallParam(key as any, val, true);
    }
  };

  // Active Structure Variant Key across categories
  const activeVariantKey = useMemo(() => {
    if (category === 'drain') return drainType;
    if (category === 'road') return roadType;
    if (category === 'culvert') return culvertType;
    return wallType;
  }, [category, drainType, roadType, culvertType, wallType]);

  // Active Structure Variant Display Title
  const activeVariantTitle = useMemo(() => {
    if (category === 'drain') {
      if (drainType === 'rcc_rectangular') return '1. R.C.C Rectangular Drain';
      if (drainType === 'plum_drain') return '2. Plum Concrete Drain';
      if (drainType === 'brick_masonry') return '3. Brick Masonry Drain';
      return 'Roadside Drain Section';
    }
    if (category === 'road') {
      if (roadType === 'flexible_asphalt') return 'Flexible Asphalt Concrete Road';
      if (roadType === 'rigid_concrete') return 'Rigid Concrete Pavement';
      if (roadType === 'earthen_gravel') return 'Earthen / Gravel Road Cross-Section';
      return 'Road Cross-Section';
    }
    if (category === 'culvert') {
      if (culvertType === 'box_single') return 'Single Cell Box Culvert';
      if (culvertType === 'box_twin') return 'Twin Cell Box Culvert';
      if (culvertType === 'pipe_rcc') return 'RCC Pipe Culvert with Concrete Cradle';
      if (culvertType === 'slab_culvert') return 'RCC Slab Culvert on Masonry Abutments';
      return 'Culvert Cross-Section';
    }
    return activeCADTemplate?.name || 'Protection Wall Assembly';
  }, [category, drainType, roadType, culvertType, wallType, activeCADTemplate]);

  // Auto Match Active Structure BOQ Items
  const autoMatchActiveStructureItems = () => {
    setProtectionWallMapping((prev) => {
      const curDyn = getDefaultComponentsForStructureVariant(activeVariantKey, prev);
      const autoMatched = autoMatchComponentsForProject(curDyn, project.items);
      return {
        ...prev,
        dynamicComponents: autoMatched
      };
    });
    showToast(`⚡ Auto-matched BOQ components for ${activeVariantTitle}!`);
  };

  const handleSwitchCategory = (newCat: DrawingCategory) => {
    setCategory(newCat);
    const targetVariant = newCat === 'drain' ? drainType : newCat === 'road' ? roadType : newCat === 'culvert' ? culvertType : wallType;
    const matchingTpl = APP_FOLDER_CAD_TEMPLATES.find((t) => t.category === newCat && t.variantKey === targetVariant);
    if (matchingTpl) {
      setActiveTemplateId(matchingTpl.id);
    }
    setProtectionWallMapping((prev) => {
      const updatedDyn = getDefaultComponentsForStructureVariant(targetVariant, prev);
      const autoMatched = autoMatchComponentsForProject(updatedDyn, project.items);
      return {
        ...prev,
        dynamicComponents: autoMatched
      };
    });
  };

  const isLoadedRef = useRef(false);

  // Load persisted drawing parameters when active project changes
  useEffect(() => {
    try {
      const savedKey = `uev_drawing_params_${project.id}`;
      const savedData = localStorage.getItem(savedKey) || ((project as any).drawing_params ? JSON.stringify((project as any).drawing_params) : null);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.activeTemplateId) setActiveTemplateId(parsed.activeTemplateId);
        if (parsed.selectedItemId) setSelectedItemId(parsed.selectedItemId);
        if (parsed.category) setCategory(parsed.category);
        if (parsed.drainType) setDrainType(parsed.drainType);
        if (parsed.roadType) setRoadType(parsed.roadType);
        if (parsed.culvertType) setCulvertType(parsed.culvertType);
        if (parsed.wallType) setWallType(parsed.wallType);
        if (parsed.drainParams) setDrainParams((prev) => ({ ...prev, ...parsed.drainParams }));
        if (parsed.roadParams) setRoadParams((prev) => ({ ...prev, ...parsed.roadParams }));
        if (parsed.culvertParams) setCulvertParams((prev) => ({ ...prev, ...parsed.culvertParams }));
        if (parsed.protectionWallParams) setProtectionWallParams((prev) => ({ ...prev, ...parsed.protectionWallParams }));
        if (parsed.protectionWallMapping) setProtectionWallMapping(parsed.protectionWallMapping);
        if (parsed.changeHistory) setChangeHistory(parsed.changeHistory);
        if (parsed.liveSyncTarget) setLiveSyncTarget(parsed.liveSyncTarget);
        else if (typeof parsed.liveSyncEnabled === 'boolean') setLiveSyncTarget(parsed.liveSyncEnabled ? 'estimate_mb' : 'disabled');
        if (parsed.liveSyncScope) setLiveSyncScope(parsed.liveSyncScope);
        if (parsed.liveValuationBookId) setLiveValuationBookId(parsed.liveValuationBookId);
      }
    } catch (e) {
      console.error('Failed to load drawing parameters:', e);
    } finally {
      isLoadedRef.current = true;
    }
  }, [project.id]);

  // Persist drawing parameters whenever they are edited
  useEffect(() => {
    if (!isLoadedRef.current) return;
    try {
      const savedKey = `uev_drawing_params_${project.id}`;
      const payload = {
        activeTemplateId,
        selectedItemId,
        category,
        drainType,
        roadType,
        culvertType,
        wallType,
        drainParams,
        roadParams,
        culvertParams,
        protectionWallParams,
        protectionWallMapping,
        changeHistory,
        liveSyncTarget,
        liveSyncScope,
        liveValuationBookId
      };
      localStorage.setItem(savedKey, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to save drawing parameters:', e);
    }
  }, [
    project.id,
    activeTemplateId,
    selectedItemId,
    category,
    drainType,
    roadType,
    culvertType,
    wallType,
    drainParams,
    roadParams,
    culvertParams,
    protectionWallParams,
    protectionWallMapping,
    changeHistory,
    liveSyncTarget,
    liveSyncScope,
    liveValuationBookId
  ]);

  useEffect(() => {
    if (!protectionWallMapping.wallItemId && !protectionWallMapping.excavationItemId && (!protectionWallMapping.dynamicComponents || protectionWallMapping.dynamicComponents.length === 0)) {
      autoMatchActiveStructureItems();
    }
  }, [category, activeVariantKey, project.items]);

  // 1. DWG Takeoff from MB: Sync MB Item dimensions into active CAD Drawing parameters when selected item changes
  useEffect(() => {
    if (!selectedItemId || category === 'protection_wall') return;
    const boundItem = project.items.find((i) => i.id === selectedItemId);
    if (!boundItem) return;

    let b = boundItem.breadth || 0;
    let h = boundItem.height || 0;
    let l = boundItem.length || 0;

    if (boundItem.mb_rows && boundItem.mb_rows.length > 0) {
      const validB = boundItem.mb_rows.find((r) => r.breadth && Number(r.breadth) > 0);
      const validH = boundItem.mb_rows.find((r) => r.height && Number(r.height) > 0);
      const validL = boundItem.mb_rows.find((r) => r.length && Number(r.length) > 0);
      if (validB) b = Number(validB.breadth);
      if (validH) h = Number(validH.height);
      if (validL) l = Number(validL.length);
    }

    if (category === 'drain') {
      if (b > 0 && Math.abs(b - drainParams.invertWidth) > 0.001) {
        setDrainParams((p) => ({ ...p, invertWidth: b }));
      }
      if (h > 0 && Math.abs(h - drainParams.depth) > 0.001) {
        setDrainParams((p) => ({ ...p, depth: h }));
      }
    } else if (category === 'road') {
      if (b > 0 && Math.abs(b - roadParams.carriagewayWidth) > 0.001) {
        setRoadParams((p) => ({ ...p, carriagewayWidth: b }));
      }
    } else if (category === 'culvert') {
      if (b > 0 && Math.abs(b - (culvertType === 'pipe_rcc' ? culvertParams.pipeDia : culvertParams.clearSpan)) > 0.001) {
        setCulvertParams((p) => ({ ...p, clearSpan: b, pipeDia: b }));
      }
      if (h > 0 && Math.abs(h - (culvertType === 'pipe_rcc' ? culvertParams.pipeDia : culvertParams.clearHeight)) > 0.001) {
        setCulvertParams((p) => ({ ...p, clearHeight: h }));
      }
      if (l > 0 && Math.abs(l - culvertParams.barrelLength) > 0.001) {
        setCulvertParams((p) => ({ ...p, barrelLength: l }));
      }
    }
  }, [selectedItemId, category, culvertType]);

  const effectiveProtectionWallMapping = useMemo(() => {
    let baseDyn = protectionWallMapping.dynamicComponents;
    if (!baseDyn || baseDyn.length === 0) {
      baseDyn = getDefaultComponentsForStructureVariant(activeVariantKey, protectionWallMapping);
    }
    const resolvedDyn = autoMatchComponentsForProject(baseDyn, project.items);
    return {
      ...protectionWallMapping,
      dynamicComponents: resolvedDyn
    };
  }, [protectionWallMapping, activeVariantKey, project.items]);

  // 2. Real-time CAD Live Sync to BOQ and Measurement Book across all categories
  useEffect(() => {
    if (liveSyncTarget === 'disabled') return;

    // TARGET A: ESTIMATE MB (Pre-Contract BOQ Items)
    if (liveSyncTarget === 'estimate_mb') {
      setProject((prev) => {
        let changed = false;

        // Pre-compute rows for all mapped dynamic components
        const compRowsMap = new Map<string, any[]>();
        const dynComps = effectiveProtectionWallMapping.dynamicComponents || [];
        const sectionsToSync = liveSyncScope === 'active_section' && activeSectionId
          ? wallSections.filter((s) => s.id === activeSectionId)
          : wallSections;

        dynComps.forEach((comp) => {
          const targetItemId = comp.mappedItemId || (comp as any).mappedBoqItemId;
          if (!targetItemId || comp.enabled === false) return;
          const rows = sectionsToSync.map((sec) => {
            const val = calculateComponentMBValues(comp, sec);
            const chStr = sec.chainageStart && sec.chainageEnd ? `(Ch. ${sec.chainageStart} to ${sec.chainageEnd})` : '';
            return {
              id: `mb_sec_${sec.id}_${comp.id}`,
              particulars: `${sec.sectionCode} ${chStr}: ${comp.name} [${comp.unit}]`,
              no_of_units: val.no_of_units,
              length: parseFloat(val.length.toFixed(3)),
              breadth: parseFloat(val.breadth.toFixed(3)),
              height: parseFloat(val.height.toFixed(3)),
              quantity: parseFloat(val.quantity.toFixed(3)),
              remarks: `CAD Section ${sec.sectionCode}`
            };
          });
          compRowsMap.set(targetItemId, rows);
        });

        const updatedItems = prev.items.map((it) => {
          // Dynamic BOQ Component Mapping Live Sync (Drain, Road, Culvert & Protection Wall)
          if (compRowsMap.has(it.id)) {
            const newGeneratedRows = compRowsMap.get(it.id)!;
            let finalMbRows: any[] = [];
            if (liveSyncScope === 'active_section' && activeSectionId) {
              const otherRows = (it.mb_rows || []).filter((r) => !r.id?.startsWith(`mb_sec_${activeSectionId}_`));
              finalMbRows = [...otherRows, ...newGeneratedRows];
            } else {
              finalMbRows = newGeneratedRows;
            }

            const newQty = parseFloat(finalMbRows.reduce((sum, r) => sum + (r.quantity || 0), 0).toFixed(3));
            const rate = it.calculated_unit_rate || it.user_rate || 0;
            if (it.estimated_quantity !== newQty || JSON.stringify(it.mb_rows) !== JSON.stringify(finalMbRows)) {
              changed = true;
              return {
                ...it,
                estimated_quantity: newQty,
                total_amount: parseFloat((newQty * rate).toFixed(2)),
                mb_rows: finalMbRows,
                custom_fields: {
                  ...(it.custom_fields || {}),
                  top_width: (protectionWallParams.wallTopWidth || drainParams.invertWidth || roadParams.carriagewayWidth || 0).toString(),
                  bottom_width: (protectionWallParams.wallBottomWidth || drainParams.invertWidth || roadParams.carriagewayWidth || 0).toString()
                }
              };
            }
          }

          // Single Selected Item Live Sync (Fallback when no multi-component is mapped for this item)
          if (selectedItemId && it.id === selectedItemId && !compRowsMap.has(it.id)) {
            let b = 0, h = 0, l = it.length || 10;
            let particulars = 'Live CAD Takeoff Section';

            if (category === 'drain') {
              b = drainParams.invertWidth;
              h = drainParams.depth;
              particulars = `Drain Cross Section (${drainType})`;
            } else if (category === 'road') {
              b = roadParams.carriagewayWidth;
              h = roadParams.asphaltThickness + roadParams.baseThickness + roadParams.subBaseThickness;
              l = it.length || 100;
              particulars = `Road Pavement Layer (${roadType})`;
            } else if (category === 'culvert') {
              b = culvertType === 'pipe_rcc' ? culvertParams.pipeDia : culvertParams.clearSpan;
              h = culvertType === 'pipe_rcc' ? culvertParams.pipeDia : culvertParams.clearHeight;
              l = culvertParams.barrelLength || 8;
              particulars = `Culvert Structural Body (${culvertType})`;
            }

            const isSqM = (it.unit || '').toLowerCase().includes('m2') || (it.unit || '').toLowerCase().includes('sq');
            const newQty = parseFloat((isSqM ? (b * l) : (b * h * l)).toFixed(3));
            const rate = it.calculated_unit_rate || it.user_rate || 0;

            const mbRow = {
              id: it.mb_rows?.[0]?.id || `mb_cad_${it.id}`,
              particulars,
              no_of_units: 1,
              length: parseFloat(l.toFixed(3)),
              breadth: parseFloat(b.toFixed(3)),
              height: isSqM ? 1 : parseFloat(h.toFixed(3)),
              quantity: newQty,
              remarks: 'Live-Synced from CAD Drawing'
            };

            if (it.estimated_quantity !== newQty || !it.mb_rows || it.mb_rows.length !== 1 || JSON.stringify(it.mb_rows[0]) !== JSON.stringify(mbRow)) {
              changed = true;
              return {
                ...it,
                estimated_quantity: newQty,
                total_amount: parseFloat((newQty * rate).toFixed(2)),
                mb_rows: [mbRow]
              };
            }
          }

          return it;
        });

        if (!changed) return prev;
        return { ...prev, items: updatedItems };
      });
    }

    // TARGET B: VALUATION MB (Site Execution Running Bill MB)
    else if (liveSyncTarget === 'valuation_mb') {
      const targetBookId = liveValuationBookId || valuationBooks[0]?.id;
      if (!targetBookId || !setValuationRows) return;

      const targetBook = valuationBooks.find((b) => b.id === targetBookId);
      const targetBookTitle = targetBook ? `${targetBook.mb_number} - ${targetBook.title}` : 'Valuation MB';
      const ipcNum = targetBook?.ipc_number || 1;

      const sectionsToFeed = liveSyncScope === 'active_section' && activeSectionId
        ? wallSections.filter((s) => s.id === activeSectionId)
        : wallSections;

      const selectedIds = sectionsToFeed.map((s) => s.id);

      const result = feedCADSectionsToValuationMB({
        projectId: project.id,
        targetBookId,
        targetBookTitle,
        ipcNumber: ipcNum,
        dateBS: '2026-05-15',
        verifiedBy: 'Live Sync Engine',
        sections: wallSections,
        drawingCategory: category,
        variantKey: activeVariantKey,
        mapping: effectiveProtectionWallMapping,
        projectItems: project.items,
        existingValuationRows: valuationRows,
        selectedSectionIds: selectedIds,
        mode: liveSyncScope === 'active_section' ? 'append' : 'replace_book_category'
      });

      setValuationRows(result.updatedValuationRows);
    }
  }, [
    liveSyncTarget,
    liveSyncScope,
    liveValuationBookId,
    wallSections,
    activeSectionId,
    protectionWallParams,
    drainParams,
    roadParams,
    culvertParams,
    category,
    activeVariantKey,
    selectedItemId,
    effectiveProtectionWallMapping
  ]);

  // Persistent Storage for Drawing Parameters and Multi-Sections across tabs & session switches
  useEffect(() => {
    const drawingData = {
      category,
      drainType,
      roadType,
      culvertType,
      wallType,
      selectedItemId,
      activeTemplateId,
      liveSyncTarget,
      liveSyncScope,
      liveValuationBookId,
      drainParams,
      roadParams,
      culvertParams,
      protectionWallParams,
      protectionWallMapping,
      wallSections
    };

    try {
      const savedKey = `uev_drawing_params_${project.id}`;
      localStorage.setItem(savedKey, JSON.stringify(drawingData));
      const secKey = `uev_wall_sections_${project.id}`;
      localStorage.setItem(secKey, JSON.stringify(wallSections));
    } catch {}
  }, [
    category,
    drainType,
    roadType,
    culvertType,
    wallType,
    selectedItemId,
    activeTemplateId,
    liveSyncTarget,
    liveSyncScope,
    liveValuationBookId,
    drainParams,
    roadParams,
    culvertParams,
    protectionWallParams,
    protectionWallMapping,
    wallSections,
    project.id
  ]);

  const handleUpdateProtectionWallParam = (key: keyof ProtectionWallParameters, val: any, isManualOverride: boolean = false) => {
    setProtectionWallParams((prev) => {
      const numVal = typeof val === 'number' ? Math.max(0, val) : val;
      const updatedOverrides = {
        ...prev.manualOverrides,
        ...(isManualOverride ? { [key as string]: true } : {})
      };

      const nextParams: ProtectionWallParameters = {
        ...prev,
        [key]: numVal,
        manualOverrides: updatedOverrides
      };

      const topW = nextParams.wallTopWidth;
      const botW = nextParams.wallBottomWidth;
      const hWall = nextParams.wallHeight;
      const lWall = nextParams.wallLength;
      const wSpace = nextParams.workingSpace || 0.3;

      if (!updatedOverrides.formworkHeight) {
        const formH = Math.sqrt(Math.pow(hWall, 2) + Math.pow(Math.abs(botW - topW), 2));
        nextParams.formworkHeight = parseFloat(formH.toFixed(2));
      }
      if (!updatedOverrides.formworkArea) {
        const sidesMult = nextParams.formworkSides === 'both' ? 2 : 1;
        nextParams.formworkArea = parseFloat((nextParams.formworkHeight * lWall * sidesMult).toFixed(2));
      }

      if (!updatedOverrides.pccWidth) {
        nextParams.pccWidth = parseFloat(Math.max(botW + 0.30, 1.20).toFixed(2));
      }

      if (!updatedOverrides.solingWidth) {
        nextParams.solingWidth = nextParams.pccWidth;
      }

      if (!updatedOverrides.excavationWidth) {
        nextParams.excavationWidth = parseFloat((Math.max(nextParams.pccWidth, nextParams.solingWidth) + 2 * wSpace).toFixed(2));
      }

      if (!updatedOverrides.excavationDepth) {
        nextParams.excavationDepth = parseFloat((hWall + nextParams.pccThickness + nextParams.solingThickness).toFixed(2));
      }

      setWallSections((prevSections) =>
        prevSections.map((sec) =>
          sec.id === activeSectionId
            ? { ...sec, params: nextParams, title: `${sec.sectionCode} (H = ${nextParams.wallHeight.toFixed(2)}m)` }
            : sec
        )
      );

      return nextParams;
    });
  };

  const handleResetOverride = (key: keyof ProtectionWallParameters) => {
    setProtectionWallParams((prev) => {
      const newOverrides = { ...prev.manualOverrides };
      delete newOverrides[key as string];

      const nextParams = { ...prev, manualOverrides: newOverrides };

      const botW = nextParams.wallBottomWidth;
      const hWall = nextParams.wallHeight;
      const wSpace = nextParams.workingSpace || 0.3;

      if (key === 'pccWidth') nextParams.pccWidth = parseFloat(Math.max(botW + 0.30, 1.20).toFixed(2));
      if (key === 'solingWidth') nextParams.solingWidth = nextParams.pccWidth;
      if (key === 'excavationWidth') nextParams.excavationWidth = parseFloat((Math.max(nextParams.pccWidth, nextParams.solingWidth) + 2 * wSpace).toFixed(2));
      if (key === 'excavationDepth') nextParams.excavationDepth = parseFloat((hWall + nextParams.pccThickness + nextParams.solingThickness).toFixed(2));

      return nextParams;
    });
    showToast(`Reset parameter override for ${String(key)}`);
  };

  const assemblySyncPreview = useMemo(() => {
    const wallItem = project.items.find((i) => i.id === effectiveProtectionWallMapping.wallItemId);
    const pccItem = project.items.find((i) => i.id === effectiveProtectionWallMapping.pccItemId);
    const solingItem = project.items.find((i) => i.id === effectiveProtectionWallMapping.solingItemId);
    const excItem = project.items.find((i) => i.id === effectiveProtectionWallMapping.excavationItemId);
    const formworkItem = project.items.find((i) => i.id === effectiveProtectionWallMapping.formworkItemId);

    const wallVol = wallSections.reduce((sum, sec) => {
      const avgW = (sec.params.wallTopWidth + sec.params.wallBottomWidth) / 2;
      return sum + avgW * sec.params.wallHeight * sec.params.wallLength;
    }, 0);
    const wallRate = wallItem?.calculated_unit_rate || wallItem?.user_rate || 0;
    const wallNewQty = parseFloat(wallVol.toFixed(3));
    const wallNewAmt = wallNewQty * wallRate;

    const pccVol = wallSections.reduce((sum, sec) => {
      return sum + sec.params.pccWidth * sec.params.pccThickness * sec.params.wallLength;
    }, 0);
    const pccRate = pccItem?.calculated_unit_rate || pccItem?.user_rate || 0;
    const pccNewQty = parseFloat(pccVol.toFixed(3));
    const pccNewAmt = pccNewQty * pccRate;

    const isSolingSqM = (solingItem?.unit || '').toLowerCase().includes('m2') || (solingItem?.unit || '').toLowerCase().includes('sq');
    const solingVol = wallSections.reduce((sum, sec) => {
      const q = isSolingSqM ? sec.params.solingWidth * sec.params.wallLength : sec.params.solingWidth * sec.params.solingThickness * sec.params.wallLength;
      return sum + q;
    }, 0);
    const solingRate = solingItem?.calculated_unit_rate || solingItem?.user_rate || 0;
    const solingNewQty = parseFloat(solingVol.toFixed(3));
    const solingNewAmt = solingNewQty * solingRate;

    const excVol = wallSections.reduce((sum, sec) => {
      return sum + sec.params.excavationWidth * sec.params.excavationDepth * sec.params.wallLength;
    }, 0);
    const excRate = excItem?.calculated_unit_rate || excItem?.user_rate || 0;
    const excNewQty = parseFloat(excVol.toFixed(3));
    const excNewAmt = excNewQty * excRate;

    const formVol = wallSections.reduce((sum, sec) => {
      const sidesMult = sec.params.formworkSides === 'both' ? 2 : 1;
      return sum + sec.params.formworkHeight * sec.params.wallLength * sidesMult;
    }, 0);
    const formRate = formworkItem?.calculated_unit_rate || formworkItem?.user_rate || 0;
    const formNewQty = parseFloat(formVol.toFixed(3));
    const formNewAmt = formNewQty * formRate;

    const totalNewCost = wallNewAmt + pccNewAmt + solingNewAmt + excNewAmt + formNewAmt;
    const totalOldCost = (wallItem?.total_amount || 0) + (pccItem?.total_amount || 0) + (solingItem?.total_amount || 0) + (excItem?.total_amount || 0) + (formworkItem?.total_amount || 0);

    return {
      wallItem,
      wallNewQty,
      wallNewAmt,
      pccItem,
      pccNewQty,
      pccNewAmt,
      solingItem,
      solingNewQty,
      solingNewAmt,
      excItem,
      excNewQty,
      excNewAmt,
      formworkItem,
      formNewQty,
      formNewAmt,
      totalNewCost,
      totalOldCost
    };
  }, [project.items, effectiveProtectionWallMapping, wallSections]);

  const handleConfirmSyncAssemblyToBOQ = () => {
    const timestamp = new Date().toLocaleTimeString();
    const newLogs: ParameterChangeLog[] = [];

    setProject((prev) => ({
      ...prev,
      items: prev.items.map((it) => {
        if (it.id === effectiveProtectionWallMapping.wallItemId) {
          const wallMbRows = wallSections.map((sec) => {
            const avgW = (sec.params.wallTopWidth + sec.params.wallBottomWidth) / 2;
            const isVert = Math.abs(sec.params.wallTopWidth - sec.params.wallBottomWidth) < 0.001;
            const qty = parseFloat((avgW * sec.params.wallHeight * sec.params.wallLength).toFixed(3));
            return {
              id: `mb_sec_${sec.id}_wall`,
              particulars: `${sec.sectionCode}: ${isVert ? 'Vertical Protection Wall Structure' : 'Plum Concrete Protection Wall Body'} (H=${sec.params.wallHeight.toFixed(2)}m)`,
              no_of_units: 1,
              length: parseFloat(sec.params.wallLength.toFixed(3)),
              breadth: parseFloat(avgW.toFixed(3)),
              height: parseFloat(sec.params.wallHeight.toFixed(3)),
              quantity: qty,
              remarks: `CAD Section ${sec.sectionCode}`
            };
          });
          const newQty = parseFloat(wallMbRows.reduce((sum, r) => sum + r.quantity, 0).toFixed(3));
          const rate = it.calculated_unit_rate || it.user_rate || 0;
          newLogs.push({
            id: Math.random().toString(),
            timestamp,
            itemId: it.id,
            itemCode: it.code || 'BOQ',
            itemDescription: it.description,
            parameterName: 'Plum Wall Geometry Sync',
            oldValue: `${it.estimated_quantity} ${it.unit}`,
            newValue: `${newQty} ${it.unit}`
          });
          return {
            ...it,
            estimated_quantity: newQty,
            total_amount: parseFloat((newQty * rate).toFixed(2)),
            mb_rows: wallMbRows,
            custom_fields: {
              ...(it.custom_fields || {}),
              top_width: protectionWallParams.wallTopWidth.toString(),
              bottom_width: protectionWallParams.wallBottomWidth.toString()
            }
          };
        }

        if (it.id === effectiveProtectionWallMapping.pccItemId) {
          const pccMbRows = wallSections.map((sec) => {
            const qty = parseFloat((sec.params.pccWidth * sec.params.pccThickness * sec.params.wallLength).toFixed(3));
            return {
              id: `mb_sec_${sec.id}_pcc`,
              particulars: `${sec.sectionCode}: Bed PCC 1:3:6 Base Concrete Layer`,
              no_of_units: 1,
              length: parseFloat(sec.params.wallLength.toFixed(3)),
              breadth: parseFloat(sec.params.pccWidth.toFixed(3)),
              height: parseFloat(sec.params.pccThickness.toFixed(3)),
              quantity: qty,
              remarks: `CAD Section ${sec.sectionCode}`
            };
          });
          const newQty = parseFloat(pccMbRows.reduce((sum, r) => sum + r.quantity, 0).toFixed(3));
          const rate = it.calculated_unit_rate || it.user_rate || 0;
          newLogs.push({
            id: Math.random().toString(),
            timestamp,
            itemId: it.id,
            itemCode: it.code || 'BOQ',
            itemDescription: it.description,
            parameterName: 'PCC Bed Geometry Sync',
            oldValue: `${it.estimated_quantity} ${it.unit}`,
            newValue: `${newQty} ${it.unit}`
          });
          return {
            ...it,
            estimated_quantity: newQty,
            total_amount: parseFloat((newQty * rate).toFixed(2)),
            mb_rows: pccMbRows
          };
        }

        if (it.id === effectiveProtectionWallMapping.solingItemId) {
          const isSolingSqM = (it.unit || '').toLowerCase().includes('m2') || (it.unit || '').toLowerCase().includes('sq');
          const solingMbRows = wallSections.map((sec) => {
            const qtyVal = isSolingSqM ? sec.params.solingWidth * sec.params.wallLength : sec.params.solingWidth * sec.params.solingThickness * sec.params.wallLength;
            const qty = parseFloat(qtyVal.toFixed(3));
            return {
              id: `mb_sec_${sec.id}_soling`,
              particulars: `${sec.sectionCode}: Stone / Brick Soling Bedding Layer`,
              no_of_units: 1,
              length: parseFloat(sec.params.wallLength.toFixed(3)),
              breadth: parseFloat(sec.params.solingWidth.toFixed(3)),
              height: isSolingSqM ? 1 : parseFloat(sec.params.solingThickness.toFixed(3)),
              quantity: qty,
              remarks: `CAD Section ${sec.sectionCode}`
            };
          });
          const newQty = parseFloat(solingMbRows.reduce((sum, r) => sum + r.quantity, 0).toFixed(3));
          const rate = it.calculated_unit_rate || it.user_rate || 0;
          newLogs.push({
            id: Math.random().toString(),
            timestamp,
            itemId: it.id,
            itemCode: it.code || 'BOQ',
            itemDescription: it.description,
            parameterName: 'Soling Layer Geometry Sync',
            oldValue: `${it.estimated_quantity} ${it.unit}`,
            newValue: `${newQty} ${it.unit}`
          });
          return {
            ...it,
            estimated_quantity: newQty,
            total_amount: parseFloat((newQty * rate).toFixed(2)),
            mb_rows: solingMbRows
          };
        }

        if (it.id === effectiveProtectionWallMapping.excavationItemId) {
          const excMbRows = wallSections.map((sec) => {
            const qty = parseFloat((sec.params.excavationWidth * sec.params.excavationDepth * sec.params.wallLength).toFixed(3));
            return {
              id: `mb_sec_${sec.id}_exc`,
              particulars: `${sec.sectionCode}: Foundation Trench Excavation Pit`,
              no_of_units: 1,
              length: parseFloat(sec.params.wallLength.toFixed(3)),
              breadth: parseFloat(sec.params.excavationWidth.toFixed(3)),
              height: parseFloat(sec.params.excavationDepth.toFixed(3)),
              quantity: qty,
              remarks: `CAD Section ${sec.sectionCode}`
            };
          });
          const newQty = parseFloat(excMbRows.reduce((sum, r) => sum + r.quantity, 0).toFixed(3));
          const rate = it.calculated_unit_rate || it.user_rate || 0;
          newLogs.push({
            id: Math.random().toString(),
            timestamp,
            itemId: it.id,
            itemCode: it.code || 'BOQ',
            itemDescription: it.description,
            parameterName: 'Excavation Pit Geometry Sync',
            oldValue: `${it.estimated_quantity} ${it.unit}`,
            newValue: `${newQty} ${it.unit}`
          });
          return {
            ...it,
            estimated_quantity: newQty,
            total_amount: parseFloat((newQty * rate).toFixed(2)),
            mb_rows: excMbRows
          };
        }

        if (it.id === effectiveProtectionWallMapping.formworkItemId) {
          const formMbRows = wallSections.map((sec) => {
            const sidesMult = sec.params.formworkSides === 'both' ? 2 : 1;
            const qty = parseFloat((sec.params.formworkHeight * sec.params.wallLength * sidesMult).toFixed(3));
            return {
              id: `mb_sec_${sec.id}_form`,
              particulars: `${sec.sectionCode}: Wall Formwork Shuttering (${sec.params.formworkSides.replace('_', ' ')})`,
              no_of_units: sidesMult,
              length: parseFloat(sec.params.wallLength.toFixed(3)),
              breadth: 1,
              height: parseFloat(sec.params.formworkHeight.toFixed(3)),
              quantity: qty,
              remarks: `CAD Section ${sec.sectionCode}`
            };
          });
          const newQty = parseFloat(formMbRows.reduce((sum, r) => sum + r.quantity, 0).toFixed(3));
          const rate = it.calculated_unit_rate || it.user_rate || 0;
          newLogs.push({
            id: Math.random().toString(),
            timestamp,
            itemId: it.id,
            itemCode: it.code || 'BOQ',
            itemDescription: it.description,
            parameterName: 'Formwork Area Sync',
            oldValue: `${it.estimated_quantity} ${it.unit}`,
            newValue: `${newQty} ${it.unit}`
          });
          return {
            ...it,
            estimated_quantity: newQty,
            total_amount: parseFloat((newQty * rate).toFixed(2)),
            mb_rows: formMbRows
          };
        }

        return it;
      })
    }));

    setChangeHistory((prev) => [...newLogs, ...prev]);
    setShowAssemblySyncModal(false);
    showToast('Successfully synced Protection Wall Composite Assembly across mapped BOQ items!');
  };

  // Keep Trapezoidal Top Width & Side Slope in Sync
  const handleUpdateSideSlope = (slope: number) => {
    const validSlope = Math.max(0, slope);
    const calculatedTopW = drainParams.invertWidth + 2 * drainParams.depth * validSlope;
    setDrainParams((prev) => ({
      ...prev,
      sideSlopeHV: validSlope,
      topWidth: parseFloat(calculatedTopW.toFixed(2))
    }));
  };

  // Constraint Solver Engine & CAD Takeoff Section Geometry Metrics
  const cadTakeoffMetrics = useMemo(() => {
    let area = 0;
    let perimeter = 0;
    let length = 10;
    let widthPhys = 1.0;
    let heightPhys = 1.0;

    if (category === 'drain') {
      length = 10;
      if (drainType === 'rcc_rectangular' || drainType === 'rectangular') {
        const innerW = drainParams.invertWidth;
        const h = drainParams.depth;
        const tw = drainParams.wallThickness || 0.20;
        const tb = drainParams.baseThickness || 0.20;
        const tc = drainParams.hasCoverSlab ? (drainParams.coverSlabThickness || 0.10) : 0;
        widthPhys = innerW + 2 * tw;
        heightPhys = h + tb + tc + drainParams.freeboard;
        area = (innerW + 2 * tw) * tb + (2 * tw * h) + (drainParams.hasCoverSlab ? (innerW + 2 * tw) * tc : 0);
        perimeter = 2 * (h + tb) + widthPhys;
      } else if (drainType === 'plum_drain') {
        const innerW = drainParams.invertWidth;
        const h = drainParams.depth;
        const twRoad = drainParams.roadSideWallThickness || 0.35;
        const twUser = drainParams.userSideWallThickness || 0.25;
        const tb = drainParams.baseThickness || 0.20;
        widthPhys = innerW + twRoad + twUser;
        heightPhys = h + tb + drainParams.freeboard;
        area = (innerW + twRoad + twUser) * tb + (twRoad + twUser) * h;
        perimeter = 2 * h + innerW;
      } else if (drainType === 'brick_masonry') {
        const innerW = drainParams.invertWidth;
        const h = drainParams.depth;
        const twRoad = drainParams.roadSideWallThickness || 0.35;
        const twUser = drainParams.userSideWallThickness || 0.23;
        const tb = drainParams.baseThickness || 0.15;
        const tc = drainParams.topPccThickness || 0.075;
        widthPhys = innerW + twRoad + twUser;
        heightPhys = h + tb + tc + drainParams.freeboard;
        area = (innerW + twRoad + twUser) * tb + (twRoad + twUser) * h + (twRoad + twUser) * tc;
        perimeter = 2 * h + innerW;
      } else {
        const w = drainParams.invertWidth;
        const h = drainParams.depth;
        const tw = drainParams.wallThickness || 0.20;
        const tb = drainParams.baseThickness || 0.20;
        widthPhys = w + 2 * tw;
        heightPhys = h + tb;
        area = 2 * tw * h + (w + 2 * tw) * tb;
        perimeter = 2 * h + w;
      }
    } else if (category === 'road') {
      length = 100;
      widthPhys = roadParams.carriagewayWidth + roadParams.shoulderLeft + roadParams.shoulderRight + 1.5;
      heightPhys = roadParams.asphaltThickness + roadParams.baseThickness + roadParams.subBaseThickness;
      area = roadParams.carriagewayWidth * heightPhys;
      perimeter = roadParams.carriagewayWidth;
    } else if (category === 'culvert') {
      length = culvertParams.barrelLength || 8;
      if (culvertType === 'pipe_rcc') {
        const numP = Math.max(1, Math.min(3, culvertParams.pipeCount));
        const extR = culvertParams.pipeDia / 2 + culvertParams.pipeWallThickness;
        widthPhys = numP * (2 * extR) + (numP - 1) * culvertParams.pipeSpacing + 0.6;
        heightPhys = culvertParams.pipeDia + 2 * culvertParams.pipeWallThickness + culvertParams.beddingDepth + culvertParams.fillHeight;
        area = numP * Math.PI * (Math.pow(extR, 2) - Math.pow(culvertParams.pipeDia / 2, 2));
        perimeter = numP * Math.PI * culvertParams.pipeDia;
      } else {
        const numCells = culvertType === 'box_twin' ? 2 : 1;
        const span = culvertParams.clearSpan;
        const h = culvertParams.clearHeight;
        const tt = culvertParams.topSlabThickness;
        const tb = culvertParams.bottomSlabThickness;
        const tw = culvertParams.wallThickness;
        widthPhys = numCells * span + (numCells + 1) * tw;
        heightPhys = h + tt + tb + culvertParams.fillHeight;
        area = (widthPhys * (h + tt + tb)) - (numCells * span * h);
        perimeter = 2 * (widthPhys + h + tt + tb);
      }
    } else if (category === 'protection_wall') {
      length = protectionWallParams.wallLength;
      widthPhys = protectionWallParams.excavationWidth;
      heightPhys = protectionWallParams.excavationDepth;
      const avgW = (protectionWallParams.wallTopWidth + protectionWallParams.wallBottomWidth) / 2;
      area = avgW * protectionWallParams.wallHeight;
      perimeter = protectionWallParams.formworkHeight;
    }

    const volume = area * length;
    const targetScale = Math.max(25, Math.min(320, Math.min(460 / Math.max(0.2, widthPhys), 320 / Math.max(0.2, heightPhys))));

    return {
      area: parseFloat(area.toFixed(3)),
      perimeter: parseFloat(perimeter.toFixed(3)),
      length,
      volume: parseFloat(volume.toFixed(3)),
      widthPhys: parseFloat(widthPhys.toFixed(2)),
      heightPhys: parseFloat(heightPhys.toFixed(2)),
      calculatedScale: parseFloat(targetScale.toFixed(1))
    };
  }, [category, drainType, roadType, culvertType, wallType, drainParams, roadParams, culvertParams, protectionWallParams]);

  const handleUpdateTopWidth = (topW: number) => {
    const validTopW = Math.max(drainParams.invertWidth + 0.05, topW);
    const calculatedSlope = (validTopW - drainParams.invertWidth) / (2 * Math.max(0.05, drainParams.depth));
    setDrainParams((prev) => ({
      ...prev,
      topWidth: validTopW,
      sideSlopeHV: parseFloat(calculatedSlope.toFixed(2))
    }));
  };

  // Handle BOQ Item Binding
  const handleSelectItemToBind = (itemId: string) => {
    setSelectedItemId(itemId);
    if (!itemId) return;

    const item = project.items.find((i) => i.id === itemId);
    if (!item) return;

    let b = item.breadth || 0;
    let h = item.height || 0;
    let l = item.length || 0;

    if (item.mb_rows && item.mb_rows.length > 0) {
      const validB = item.mb_rows.find((r) => r.breadth && Number(r.breadth) > 0);
      const validH = item.mb_rows.find((r) => r.height && Number(r.height) > 0);
      const validL = item.mb_rows.find((r) => r.length && Number(r.length) > 0);
      if (validB) b = Number(validB.breadth);
      if (validH) h = Number(validH.height);
      if (validL) l = Number(validL.length);
    }

    const descLower = (item.description || '').toLowerCase();
    const codeLower = (item.code || '').toLowerCase();

    if (descLower.includes('drain') || codeLower.includes('drain')) {
      setCategory('drain');
      setDrainParams((prev) => ({
        ...prev,
        invertWidth: b > 0 ? b : prev.invertWidth,
        depth: h > 0 ? h : prev.depth,
        wallThickness: item.custom_fields?.wall_thickness ? Number(item.custom_fields.wall_thickness) : prev.wallThickness,
        baseThickness: item.custom_fields?.base_thickness ? Number(item.custom_fields.base_thickness) : prev.baseThickness
      }));
      showToast(`Auto-bound Drain parameters from "${item.description.slice(0, 35)}..." (B=${b || 0.6}m, H=${h || 0.75}m)`);
    } else if (descLower.includes('road') || descLower.includes('blacktop') || descLower.includes('pavement')) {
      setCategory('road');
      setRoadParams((prev) => ({
        ...prev,
        carriagewayWidth: b > 0 ? b : prev.carriagewayWidth,
        baseThickness: h > 0 ? h : prev.baseThickness
      }));
      showToast(`Auto-bound Road parameters from "${item.description.slice(0, 35)}..." (Width=${b || 5.5}m)`);
    } else if (descLower.includes('culvert') || descLower.includes('slab') || descLower.includes('pipe')) {
      setCategory('culvert');
      setCulvertParams((prev) => ({
        ...prev,
        clearSpan: b > 0 ? b : prev.clearSpan,
        clearHeight: h > 0 ? h : prev.clearHeight,
        barrelLength: l > 0 ? l : prev.barrelLength,
        pipeDia: b > 0 ? b : prev.pipeDia
      }));
      showToast(`Auto-bound Culvert parameters from "${item.description.slice(0, 35)}..." (Span=${b || 2.0}m, H=${h || 1.8}m)`);
    } else {
      if (category === 'drain') {
        setDrainParams((prev) => ({
          ...prev,
          invertWidth: b > 0 ? b : prev.invertWidth,
          depth: h > 0 ? h : prev.depth
        }));
      } else if (category === 'road') {
        setRoadParams((prev) => ({
          ...prev,
          carriagewayWidth: b > 0 ? b : prev.carriagewayWidth
        }));
      } else {
        setCulvertParams((prev) => ({
          ...prev,
          clearSpan: b > 0 ? b : prev.clearSpan,
          clearHeight: h > 0 ? h : prev.clearHeight
        }));
      }
      showToast(`Bound item dimensions (B=${b}m, H=${h}m, L=${l}m)`);
    }
  };

  // Preview changes before saving to BOQ
  const activeBoundItem = useMemo(() => {
    if (!selectedItemId) return null;
    return project.items.find((i) => i.id === selectedItemId) || null;
  }, [project.items, selectedItemId]);

  const proposedNewDimensions = useMemo(() => {
    let b = 0, h = 0, l = 0, wall = 0, base = 0;
    if (category === 'drain') {
      b = drainParams.invertWidth;
      h = drainParams.depth;
      l = activeBoundItem?.length || 10;
      wall = drainParams.wallThickness;
      base = drainParams.baseThickness;
    } else if (category === 'road') {
      b = roadParams.carriagewayWidth;
      h = roadParams.baseThickness + roadParams.subBaseThickness + roadParams.asphaltThickness;
      l = activeBoundItem?.length || 100;
    } else if (category === 'culvert') {
      b = culvertType === 'pipe_rcc' ? culvertParams.pipeDia : culvertParams.clearSpan;
      h = culvertType === 'pipe_rcc' ? culvertParams.pipeDia : culvertParams.clearHeight;
      l = culvertParams.barrelLength || activeBoundItem?.length || 8;
      wall = culvertParams.wallThickness;
      base = culvertParams.bottomSlabThickness;
    }
    return { b, h, l, wall, base };
  }, [category, drainParams, roadParams, culvertParams, culvertType, activeBoundItem]);

  // Recalculated Qty Preview for Confirmation Dialog
  const recalculatedQtyPreview = useMemo(() => {
    if (!activeBoundItem) return { oldQty: 0, newQty: 0, oldAmt: 0, newAmt: 0 };

    const oldQty = activeBoundItem.estimated_quantity || 0;
    const rate = activeBoundItem.calculated_unit_rate || activeBoundItem.user_rate || 0;
    const oldAmt = activeBoundItem.total_amount || oldQty * rate;

    // Estimate new quantity based on updated B, H, L or MB rows
    let newQty = oldQty;
    if (activeBoundItem.mb_rows && activeBoundItem.mb_rows.length > 0) {
      newQty = activeBoundItem.mb_rows.reduce((sum, row) => {
        const no = Number(row.no_of_units) || 1;
        const curL = Number(row.length) || proposedNewDimensions.l;
        const curB = proposedNewDimensions.b; // update B
        const curH = proposedNewDimensions.h; // update H
        return sum + no * curL * curB * curH;
      }, 0);
    } else {
      newQty = proposedNewDimensions.l * proposedNewDimensions.b * proposedNewDimensions.h;
    }

    const newAmt = newQty * rate;
    return { oldQty, newQty, oldAmt, newAmt, rate };
  }, [activeBoundItem, proposedNewDimensions]);

  // Execute Save and Bidirectional Update
  const handleConfirmSaveToBOQItem = () => {
    if (!selectedItemId || !activeBoundItem) return;

    const oldB = activeBoundItem.breadth || 0;
    const oldH = activeBoundItem.height || 0;
    const oldL = activeBoundItem.length || 0;

    const newLogs: ParameterChangeLog[] = [];
    const timestamp = new Date().toLocaleTimeString();

    if (oldB !== proposedNewDimensions.b) {
      newLogs.push({
        id: Math.random().toString(),
        timestamp,
        itemId: activeBoundItem.id,
        itemCode: activeBoundItem.code || 'BOQ',
        itemDescription: activeBoundItem.description,
        parameterName: 'Breadth (B) / Span',
        oldValue: `${oldB} m`,
        newValue: `${proposedNewDimensions.b} m`
      });
    }

    if (oldH !== proposedNewDimensions.h) {
      newLogs.push({
        id: Math.random().toString(),
        timestamp,
        itemId: activeBoundItem.id,
        itemCode: activeBoundItem.code || 'BOQ',
        itemDescription: activeBoundItem.description,
        parameterName: 'Height (H) / Depth',
        oldValue: `${oldH} m`,
        newValue: `${proposedNewDimensions.h} m`
      });
    }

    setChangeHistory((prev) => [...newLogs, ...prev]);

    setProject((prev) => ({
      ...prev,
      items: prev.items.map((it) => {
        if (it.id !== selectedItemId) return it;

        const updatedMbRows = (it.mb_rows || []).map((row) => {
          const no = Number(row.no_of_units) || 1;
          const curL = Number(row.length) || proposedNewDimensions.l;
          const curB = proposedNewDimensions.b;
          const curH = proposedNewDimensions.h;
          const rowQty = no * curL * curB * curH;
          return {
            ...row,
            breadth: curB,
            height: curH,
            quantity: rowQty
          };
        });

        const newEstimatedQty = updatedMbRows.length > 0
          ? updatedMbRows.reduce((acc, r) => acc + r.quantity, 0)
          : proposedNewDimensions.l * proposedNewDimensions.b * proposedNewDimensions.h;

        const rate = it.calculated_unit_rate || it.user_rate || 0;

        return {
          ...it,
          breadth: proposedNewDimensions.b,
          height: proposedNewDimensions.h,
          length: proposedNewDimensions.l,
          estimated_quantity: parseFloat(newEstimatedQty.toFixed(3)),
          total_amount: parseFloat((newEstimatedQty * rate).toFixed(2)),
          mb_rows: updatedMbRows,
          custom_fields: {
            ...(it.custom_fields || {}),
            wall_thickness: proposedNewDimensions.wall?.toString(),
            base_thickness: proposedNewDimensions.base?.toString(),
            drawing_category: category,
            drawing_type: category === 'drain' ? drainType : category === 'road' ? roadType : culvertType
          }
        };
      })
    }));

    setShowConfirmSaveModal(false);
    showToast(`Saved & updated BOQ Item "${activeBoundItem.description.slice(0, 30)}..." and recalculated MB & Estimate!`);
  };

  // Export SVG File
  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_${category}_drawing.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    showToast('Exported SVG vector engineering drawing!');
  };

  // Export High-Res PNG Image
  const handleExportPNG = () => {
    if (!svgRef.current) return;
    const svgElement = svgRef.current;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    const width = 2400;
    const height = 1600;
    canvas.width = width;
    canvas.height = height;

    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = canvasTheme === 'cad' ? '#0f172a' : canvasTheme === 'blueprint' ? '#0f3a60' : '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_${category}_drawing.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
        showToast('Exported High-Resolution (2400x1600) PNG image!');
      }
    };
    img.src = url;
  };

  // Theme Colors Setup for SVG Rendering
  const themeColors = useMemo(() => {
    if (canvasTheme === 'cad') {
      return {
        bg: '#0f172a',
        grid: '#1e293b',
        line: '#00ffcc', // Cyan CAD line
        dimLine: '#f59e0b', // Amber dimension lines
        dimText: '#fbbf24',
        concreteFill: '#1e293b',
        stoneFill: '#334155',
        asphaltFill: '#020617',
        earthFill: '#281c12',
        titleText: '#f8fafc',
        accentLine: '#ef4444'
      };
    } else if (canvasTheme === 'blueprint') {
      return {
        bg: '#0f3a60',
        grid: '#1d4ed8',
        line: '#ffffff',
        dimLine: '#93c5fd',
        dimText: '#ffffff',
        concreteFill: '#1e40af',
        stoneFill: '#2563eb',
        asphaltFill: '#172554',
        earthFill: '#1e3a8a',
        titleText: '#ffffff',
        accentLine: '#fca5a5'
      };
    } else {
      return {
        bg: '#ffffff',
        grid: '#f1f5f9',
        line: '#0f172a',
        dimLine: '#b91c1c', // Crimson red for engineering dimensions
        dimText: '#991b1b',
        concreteFill: '#e2e8f0',
        stoneFill: '#cbd5e1',
        asphaltFill: '#334155',
        earthFill: '#f1f5f9',
        titleText: '#0f172a',
        accentLine: '#2563eb'
      };
    }
  }, [canvasTheme]);

  // Active Materials list for Legend
  const activeMaterials = useMemo(() => {
    const mats: Array<{ name: string; hatchId: string }> = [];
    if (category === 'drain') {
      if (drainType === 'trapezoidal') {
        mats.push({ name: 'Stone Masonry', hatchId: 'stoneHatch' });
      } else {
        mats.push({ name: 'PCC/RCC Concrete', hatchId: 'concreteHatch' });
      }
      mats.push({ name: 'Soil / Earthwork', hatchId: 'earthHatch' });
      mats.push({ name: 'Water Flow', hatchId: 'waterHatch' });
    } else if (category === 'road') {
      if (roadType === 'flexible_asphalt') {
        mats.push({ name: 'Asphalt Concrete', hatchId: 'asphaltHatch' });
        mats.push({ name: 'Crushed Stone Base', hatchId: 'stoneHatch' });
      } else if (roadType === 'rigid_concrete') {
        mats.push({ name: 'PCC/RCC Pavement Slab', hatchId: 'concreteHatch' });
        mats.push({ name: 'Dry Lean Base', hatchId: 'stoneHatch' });
      }
      mats.push({ name: 'Granular Sub-Base', hatchId: 'granularHatch' });
      mats.push({ name: 'Subgrade Earth', hatchId: 'earthHatch' });
    } else if (category === 'culvert') {
      if (culvertType === 'pipe_rcc') {
        mats.push({ name: 'Concrete Cradle / Bed', hatchId: 'concreteHatch' });
      } else {
        mats.push({ name: 'RCC Structure', hatchId: 'concreteHatch' });
      }
      mats.push({ name: 'Earth Fill / Cushion', hatchId: 'earthHatch' });
      mats.push({ name: 'Water Flow', hatchId: 'waterHatch' });
    }
    return mats;
  }, [category, drainType, roadType, culvertType]);

  // Pan Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setStartPanPos({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - startPanPos.x,
      y: e.clientY - startPanPos.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Validation Warnings Check
  const validationWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (category === 'drain') {
      if (drainParams.invertWidth <= 0) warnings.push('Invert width must be greater than 0.');
      if (drainParams.depth <= 0) warnings.push('Internal depth must be greater than 0.');
      if (drainParams.wallThickness <= 0) warnings.push('Wall thickness must be greater than 0.');
    } else if (category === 'road') {
      if (roadParams.carriagewayWidth <= 0) warnings.push('Carriageway width must be greater than 0.');
      if (roadParams.camberPercent < 0.5 || roadParams.camberPercent > 8.0) {
        warnings.push('Camber percentage is outside typical engineering range (0.5% - 8.0%).');
      }
    } else if (category === 'culvert') {
      if (culvertParams.clearSpan <= 0) warnings.push('Clear span must be greater than 0.');
      if (culvertParams.clearHeight <= 0) warnings.push('Clear height must be greater than 0.');
      if (culvertType === 'pipe_rcc' && culvertParams.pipeCount < 1) warnings.push('Pipe count must be at least 1.');
    }
    return warnings;
  }, [category, drainParams, roadParams, culvertParams, culvertType]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border-2 border-emerald-500 font-bold text-xs flex items-center gap-2.5 animate-bounce print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md">
              <PenTool className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Parametric Civil Engineering Drawing Workspace</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2.5 py-0.5 rounded-full uppercase">
                  BOQ Bound v2.0
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic SVG CAD Generator for Drains, Roads & Culverts with Bidirectional Estimate & MB Synchronization.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons: Primary + More Dropdown Pattern */}
        <div className="flex items-center gap-2 relative">
          {/* Active Bar Bending Schedule (BBS) Direct Button */}
          <button
            type="button"
            onClick={() => handleOpenBarBendingSchedule()}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-extrabold transition shadow-sm hover:shadow active:scale-95"
            title="Generate & activate dynamic Bar Bending Schedule (BBS) directly from current drawing dimensions"
          >
            <Grid className="w-4 h-4 text-blue-200" />
            <span>Active Bar Bending (BBS)</span>
          </button>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={handleOpenSaveAsTemplateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-extrabold transition shadow-sm hover:shadow active:scale-95"
            title="Save current drawing section in viewport as your own reusable CAD Template"
          >
            <BookmarkPlus className="w-4 h-4 text-indigo-100" />
            <span>Save Template</span>
          </button>

          {/* More Actions Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTopMoreMenu((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-300 shadow-2xs"
              title="Additional CAD Drawing Actions & Exports"
            >
              <MoreHorizontal className="w-4 h-4 text-slate-600" />
              <span>More</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showTopMoreMenu ? 'rotate-180' : ''}`} />
            </button>

            {showTopMoreMenu && (
              <>
                {/* Backdrop to close menu */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowTopMoreMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Drawing Utilities & Catalog
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleOpenBarBendingSchedule();
                      setShowTopMoreMenu(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-blue-900 hover:bg-blue-50 flex items-center gap-2.5 transition"
                  >
                    <Grid className="w-4 h-4 text-blue-600" />
                    <div className="flex flex-col">
                      <span>Bar Bending Schedule (BBS)</span>
                      <span className="text-[10px] text-blue-600/70 font-normal">Rebar shapes, segments & cutting length</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowFolderBrowser(true);
                      setShowTopMoreMenu(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 flex items-center gap-2.5 transition"
                  >
                    <FolderOpen className="w-4 h-4 text-indigo-600" />
                    <div className="flex flex-col">
                      <span>CAD Template Catalog</span>
                      <span className="text-[10px] text-slate-400 font-normal">{allCADTemplates.length} templates available</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(true);
                      setShowTopMoreMenu(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 flex items-center gap-2.5 transition"
                  >
                    <UploadCloud className="w-4 h-4 text-sky-600" />
                    <div className="flex flex-col">
                      <span>Upload / Register CAD</span>
                      <span className="text-[10px] text-slate-400 font-normal">{uploadedDrawings.length} registered files</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleResetToTemplateDefaults();
                      setShowTopMoreMenu(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 flex items-center gap-2.5 transition"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-600" />
                    <div className="flex flex-col">
                      <span>Reset Dimensions</span>
                      <span className="text-[10px] text-slate-400 font-normal">Revert to standard defaults</span>
                    </div>
                  </button>

                  {changeHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowHistoryDrawer(true);
                        setShowTopMoreMenu(false);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-bold text-amber-900 hover:bg-amber-50 flex items-center gap-2.5 transition"
                    >
                      <History className="w-4 h-4 text-amber-600" />
                      <div className="flex flex-col">
                        <span>Change History</span>
                        <span className="text-[10px] text-amber-600/70 font-normal">{changeHistory.length} logs recorded</span>
                      </div>
                    </button>
                  )}

                  <div className="my-1 border-t border-slate-100" />
                  <div className="px-3 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Export & Output
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleExportSVG();
                      setShowTopMoreMenu(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-900 flex items-center gap-2.5 transition"
                  >
                    <Download className="w-4 h-4 text-blue-600" />
                    <span>Download Vector SVG</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleExportPNG();
                      setShowTopMoreMenu(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2.5 transition"
                  >
                    <FileImage className="w-4 h-4 text-emerald-600" />
                    <span>Export High-Res PNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      window.print();
                      setShowTopMoreMenu(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 flex items-center gap-2.5 transition"
                  >
                    <Printer className="w-4 h-4 text-indigo-600" />
                    <span>Print Drawing Sheet</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Category Tabs & BOQ Item Auto-Binding Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          {/* Category Switches */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => handleSwitchCategory('drain')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                category === 'drain' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🌊 Roadside Drain Sections</span>
            </button>
            <button
              onClick={() => handleSwitchCategory('road')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                category === 'road' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🛣️ Road Cross-Sections</span>
            </button>
            <button
              onClick={() => handleSwitchCategory('culvert')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                category === 'culvert' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🌉 Culvert Cross-Sections</span>
            </button>
            <button
              onClick={() => handleSwitchCategory('protection_wall')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                category === 'protection_wall' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🛡️ Protection Wall Assembly</span>
            </button>
          </div>

          {/* Sub-type Variant Dropdown */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-slate-500 font-bold">Structure Variant:</span>
            {category === 'drain' && (
              <select
                value={drainType}
                onChange={(e) => {
                  const newType = e.target.value as DrainType;
                  setDrainType(newType);
                  const matchingTpl = APP_FOLDER_CAD_TEMPLATES.find((t) => t.category === 'drain' && t.variantKey === newType);
                  if (matchingTpl) {
                    setActiveTemplateId(matchingTpl.id);
                    setDrainParams((prev) => ({
                      ...prev,
                      ...matchingTpl.defaultParams
                    }));
                  }
                  // Automatically switch the BOQ Component Mapping Panel components to match the new Drain Type
                  setProtectionWallMapping((prev) => {
                    const updatedDyn = getDefaultComponentsForStructureVariant(newType, prev);
                    const autoMatched = autoMatchComponentsForProject(updatedDyn, project.items);
                    return {
                      ...prev,
                      dynamicComponents: autoMatched
                    };
                  });
                }}
                className="p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
              >
                <option value="rcc_rectangular">1. R.C.C Rectangular Drain</option>
                <option value="plum_drain">2. Plum Drain</option>
                <option value="brick_masonry">3. Brick Masonry Drain</option>
              </select>
            )}

            {category === 'road' && (
              <select
                value={roadType}
                onChange={(e) => {
                  const newType = e.target.value as RoadType;
                  setRoadType(newType);
                  const matchingTpl = APP_FOLDER_CAD_TEMPLATES.find((t) => t.category === 'road' && t.variantKey === newType);
                  if (matchingTpl) {
                    setActiveTemplateId(matchingTpl.id);
                    setRoadParams((prev) => ({
                      ...prev,
                      ...matchingTpl.defaultParams
                    }));
                  }
                  setProtectionWallMapping((prev) => {
                    const updatedDyn = getDefaultComponentsForStructureVariant(newType, prev);
                    const autoMatched = autoMatchComponentsForProject(updatedDyn, project.items);
                    return {
                      ...prev,
                      dynamicComponents: autoMatched
                    };
                  });
                }}
                className="p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="flexible_asphalt">Flexible Asphalt Concrete Road</option>
                <option value="rigid_concrete">Rigid Cement Concrete Pavement</option>
                <option value="earthen_gravel">Earthen / Gravel Road Cross-Section</option>
              </select>
            )}

            {category === 'culvert' && (
              <select
                value={culvertType}
                onChange={(e) => {
                  const newType = e.target.value as CulvertType;
                  setCulvertType(newType);
                  const matchingTpl = APP_FOLDER_CAD_TEMPLATES.find((t) => t.category === 'culvert' && t.variantKey === newType);
                  if (matchingTpl) {
                    setActiveTemplateId(matchingTpl.id);
                    setCulvertParams((prev) => ({
                      ...prev,
                      ...matchingTpl.defaultParams
                    }));
                  }
                  setProtectionWallMapping((prev) => {
                    const updatedDyn = getDefaultComponentsForStructureVariant(newType, prev);
                    const autoMatched = autoMatchComponentsForProject(updatedDyn, project.items);
                    return {
                      ...prev,
                      dynamicComponents: autoMatched
                    };
                  });
                }}
                className="p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
              >
                <option value="box_single">1. Single Cell Box Culvert</option>
                <option value="box_twin">2. Twin Cell Box Culvert</option>
                <option value="pipe_rcc">3. RCC Pipe Culvert with Concrete Cradle</option>
                <option value="slab_culvert">4. RCC Slab Culvert (Masonry Walls + L-Cap + Top Slab + Wing Walls)</option>
              </select>
            )}

            {category === 'protection_wall' && (
              <select
                value={wallType}
                onChange={(e) => {
                  const newType = e.target.value as ProtectionWallType;
                  setWallType(newType);
                  const matchingTpl = APP_FOLDER_CAD_TEMPLATES.find((t) => t.category === 'protection_wall' && t.variantKey === newType);
                  if (matchingTpl) {
                    setActiveTemplateId(matchingTpl.id);
                    setProtectionWallParams((prev) => ({
                      ...prev,
                      ...matchingTpl.defaultParams,
                      manualOverrides: {}
                    }));
                  }
                  // Automatically switch the BOQ Component Mapping Panel components to match the new Structure Variant
                  setProtectionWallMapping((prev) => {
                    const updatedDyn = getDefaultComponentsForStructureVariant(newType, prev);
                    const autoMatched = autoMatchComponentsForProject(updatedDyn, project.items);
                    return {
                      ...prev,
                      dynamicComponents: autoMatched
                    };
                  });
                }}
                className="p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
              >
                <option value="stone_masonry">1. Stone Masonry Wall</option>
                <option value="rcc_l_wall">2. RCC L Protection Wall (Bed PCC + Wall Component)</option>
                <option value="plum_concrete_equal">3. Equal Width Plum Concrete Wall (Vertical)</option>
                <option value="plum_concrete_unequal">4. Unequal Width Plum Concrete Wall (Battered)</option>
                <option value="brick_masonry">5. Brick Masonry Wall</option>
                <option value="custom_wall">6. Custom Protection Wall</option>
              </select>
            )}

            {/* Active Template Status Pill */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500 font-bold hidden sm:inline">Active:</span>
              <span className="font-extrabold text-slate-900 flex items-center gap-1">
                <span className="truncate max-w-[150px]">{activeCADTemplate?.name}</span>
                {activeCADTemplate?.is_custom && (
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded-md border border-emerald-300">
                    Custom
                  </span>
                )}
                {isCurrentTemplateDefault && (
                  <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded-md border border-amber-300 flex items-center gap-0.5" title="Default Template">
                    <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" /> Default
                  </span>
                )}
              </span>
              <button
                onClick={() => setShowFolderBrowser(true)}
                className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline text-[11px] ml-1"
              >
                Browse
              </button>
            </div>
          </div>
        </div>

        {/* BOQ Item Selector for Binding */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <Link className="w-4 h-4 text-indigo-700 shrink-0" />
            <span className="font-extrabold text-indigo-950 whitespace-nowrap">Bind BOQ Item:</span>
            <select
              value={selectedItemId}
              onChange={(e) => handleSelectItemToBind(e.target.value)}
              className="p-2 bg-white border border-indigo-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 w-full"
            >
              <option value="">-- Select BOQ Item to Inherit Dimensions --</option>
              {project.items.map((item, idx) => (
                <option key={item.id} value={item.id}>
                  #{idx + 1} ({item.code || 'BOQ'}) - {item.description.slice(0, 50)}... [L: {item.length || 0}m, B: {item.breadth || 0}m, H: {item.height || 0}m]
                </option>
              ))}
            </select>
          </div>

          {selectedItemId && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmSaveModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition text-xs shadow-xs active:scale-95"
                title="Save modified drawing dimensions back to selected BOQ Item"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save to BOQ Item</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectItemToBind('')}
                className="flex items-center gap-1.5 px-2.5 py-2 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl font-bold transition text-xs border border-slate-200 shadow-2xs"
                title="Clear BOQ item binding"
              >
                <Unlink className="w-3.5 h-3.5 text-slate-500" />
                <span>Unbind</span>
              </button>
            </div>
          )}
        </div>

        {/* Validation Warnings Banner */}
        {validationWarnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block">Engineering Validation Warning:</span>
              <ul className="list-disc list-inside space-y-0.5 font-semibold">
                {validationWarnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Control Panel (Left) + CAD Canvas (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Numerical Parameter Control Panel */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3.5 print:hidden">
          <div className="flex items-center justify-between border-b pb-2.5">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <h2 className="font-extrabold text-sm text-slate-900">Section Parameters</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAllPanelsCollapsed(!areAllPanelsCollapsed)}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                title={areAllPanelsCollapsed ? 'Expand all parameter panels' : 'Minimize all parameter panels for clean view'}
              >
                {areAllPanelsCollapsed ? (
                  <>
                    <Maximize2 className="w-3 h-3 text-indigo-600" />
                    <span>Expand All</span>
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-3 h-3 text-slate-600" />
                    <span>Minimize All</span>
                  </>
                )}
              </button>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                Meters
              </span>
            </div>
          </div>

          {/* Accordion Panel 1: CAD Live-Sync & Feed Engine (Unified across all categories) */}
          <div className={`rounded-xl border transition-all text-xs ${
            liveSyncTarget === 'estimate_mb'
              ? 'bg-indigo-50/70 border-indigo-200'
              : liveSyncTarget === 'valuation_mb'
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => togglePanel('live_sync')}
              className="w-full p-2.5 flex items-center justify-between gap-2 text-left group hover:opacity-85 transition"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  liveSyncTarget === 'estimate_mb'
                    ? 'bg-indigo-600 animate-pulse'
                    : liveSyncTarget === 'valuation_mb'
                    ? 'bg-emerald-600 animate-pulse'
                    : 'bg-slate-400'
                }`} />
                <span className="font-extrabold text-xs text-slate-900 truncate">
                  ⚡ CAD Live-Sync & Measurement Feed
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                  {liveSyncTarget === 'estimate_mb'
                    ? 'Estimate MB'
                    : liveSyncTarget === 'valuation_mb'
                    ? 'Valuation MB'
                    : 'Sync Off'}
                </span>
                <div className="p-0.5 rounded text-slate-400 group-hover:text-slate-700">
                  {collapsedPanels.live_sync ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </div>
              </div>
            </button>

            {!collapsedPanels.live_sync && (
              <div className="p-3 pt-0 space-y-2.5 border-t border-slate-200/80 mt-1">
                {/* Target Radio Selection */}
                <div className="space-y-1 bg-white p-2 rounded-xl border border-slate-200">
                  <label className="text-[10px] font-bold text-slate-700 block">Sync Destination:</label>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => setLiveSyncTarget('estimate_mb')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold text-center border transition ${
                        liveSyncTarget === 'estimate_mb'
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Estimate MB
                    </button>
                    <button
                      type="button"
                      onClick={() => setLiveSyncTarget('valuation_mb')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold text-center border transition ${
                        liveSyncTarget === 'valuation_mb'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Valuation MB
                    </button>
                    <button
                      type="button"
                      onClick={() => setLiveSyncTarget('disabled')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold text-center border transition ${
                        liveSyncTarget === 'disabled'
                          ? 'bg-slate-700 text-white border-slate-800 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Off / Manual
                    </button>
                  </div>
                </div>

                {/* Scope Selection */}
                {liveSyncTarget !== 'disabled' && (
                  <div className="space-y-1 bg-white p-2 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                      <span>Section Scope:</span>
                      <span className="text-[9px] text-indigo-700 font-mono font-extrabold">
                        {liveSyncScope === 'active_section' ? `Active (${activeSection?.sectionCode || 'Selected'})` : 'All Sections'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      <button
                        type="button"
                        onClick={() => setLiveSyncScope('active_section')}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                          liveSyncScope === 'active_section'
                            ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Active Section
                      </button>
                      <button
                        type="button"
                        onClick={() => setLiveSyncScope('all_sections')}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                          liveSyncScope === 'all_sections'
                            ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        All Sections
                      </button>
                    </div>

                    {liveSyncTarget === 'valuation_mb' && valuationBooks.length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-200">
                        <label className="text-[10px] font-bold text-slate-700 block mb-1">Target Valuation Book:</label>
                        <select
                          value={liveValuationBookId}
                          onChange={(e) => setLiveValuationBookId(e.target.value)}
                          className="w-full p-1 border border-slate-300 rounded font-semibold text-slate-800 text-[10px]"
                        >
                          {valuationBooks.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.mb_number} - {b.title} (IPC #{b.ipc_number})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Feed Action Buttons */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      setMbFeedModalInitialTab('feed_estimate');
                      setShowMBFeedModal(true);
                    }}
                    className="py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg shadow-xs flex items-center justify-center gap-1 transition text-[10px]"
                    title="Feed CAD drawing sections into Estimate MB and record a Version Snapshot"
                  >
                    <FileSpreadsheet className="w-3 h-3 text-indigo-200" />
                    <span>Feed Estimate</span>
                  </button>
                  <button
                    onClick={() => {
                      setMbFeedModalInitialTab('feed_valuation');
                      setShowMBFeedModal(true);
                    }}
                    className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg shadow-xs flex items-center justify-center gap-1 transition text-[10px]"
                    title="Feed CAD drawing sections into Valuation MB (Running Bill)"
                  >
                    <Workflow className="w-3 h-3 text-emerald-200" />
                    <span>Feed Valuation</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    setMbFeedModalInitialTab('version_history');
                    setShowMBFeedModal(true);
                  }}
                  className="w-full py-1 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold rounded-lg flex items-center justify-center gap-1 transition text-[10px]"
                  title="Inspect past Estimate MB Version Snapshots"
                >
                  <History className="w-3 h-3 text-slate-500" />
                  <span>View Estimate CAD Snapshots</span>
                </button>
              </div>
            )}
          </div>

          {/* Accordion Panel 2: Dynamic BOQ Component Mapping Panel (Unified across all categories) */}
          <BOQStructureComponentMappingPanel
            variantKey={activeVariantKey}
            variantTitle={activeVariantTitle}
            components={protectionWallMapping.dynamicComponents || getDefaultComponentsForStructureVariant(activeVariantKey, protectionWallMapping)}
            onUpdateComponents={(updated) => setProtectionWallMapping((prev) => ({ ...prev, dynamicComponents: updated }))}
            projectItems={project.items}
            wallSections={wallSections}
            activeSection={wallSections.find((s) => s.id === activeSectionId)}
            onAutoDetectAll={autoMatchActiveStructureItems}
            showToast={showToast}
          />

          {/* DRAIN PARAMETERS INPUTS */}
          {category === 'drain' && (
            <div className="space-y-3.5 text-xs">
              {/* Drain Sub-Type Identification Badge */}
              <div className="p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                  <span className="font-extrabold text-indigo-950">
                    {drainType === 'plum_drain'
                      ? '2. Plum Concrete Drain'
                      : drainType === 'brick_masonry'
                      ? '3. Brick Masonry Drain'
                      : '1. R.C.C Rectangular Drain'}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                  {drainType === 'plum_drain'
                    ? 'Plum + PCC'
                    : drainType === 'brick_masonry'
                    ? 'Brick + Plaster + Punning'
                    : 'RCC M20 + Cover'}
                </span>
              </div>

              {/* Invert Clear Width */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex justify-between">
                  <span>Invert / Clear Internal Width (B)</span>
                  <span className="font-mono text-indigo-700 font-extrabold">{drainParams.invertWidth.toFixed(2)} m</span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="4.0"
                  value={drainParams.invertWidth}
                  onChange={(e) => setDrainParams((p) => ({ ...p, invertWidth: Math.max(0.05, parseFloat(e.target.value) || 0) }))}
                  className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Internal Clear Depth */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex justify-between">
                  <span>Internal Clear Depth (H)</span>
                  <span className="font-mono text-indigo-700 font-extrabold">{drainParams.depth.toFixed(2)} m</span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="3.5"
                  value={drainParams.depth}
                  onChange={(e) => setDrainParams((p) => ({ ...p, depth: Math.max(0.05, parseFloat(e.target.value) || 0) }))}
                  className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* WALL THICKNESS CONTROLS */}
              {drainType === 'plum_drain' || drainType === 'brick_masonry' ? (
                /* Asymmetrical / Distinct Road Side vs User Side Wall Widths */
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-800 text-[11px] uppercase tracking-wide">
                      {drainType === 'plum_drain' ? 'Plum Wall Widths' : 'Brick Wall Widths'}
                    </span>
                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                      Road vs User Side
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                        Road Side (Tw_road)
                      </label>
                      <input
                        type="number"
                        step="0.025"
                        min="0.1"
                        max="1.5"
                        value={drainParams.roadSideWallThickness ?? 0.35}
                        onChange={(e) =>
                          setDrainParams((p) => ({
                            ...p,
                            roadSideWallThickness: Math.max(0.05, parseFloat(e.target.value) || 0)
                          }))
                        }
                        className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                        User Side (Tw_user)
                      </label>
                      <input
                        type="number"
                        step="0.025"
                        min="0.1"
                        max="1.5"
                        value={drainParams.userSideWallThickness ?? 0.25}
                        onChange={(e) =>
                          setDrainParams((p) => ({
                            ...p,
                            userSideWallThickness: Math.max(0.05, parseFloat(e.target.value) || 0)
                          }))
                        }
                        className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Uniform RCC Wall Thickness */
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex justify-between">
                    <span>RCC Wall Thickness (Tw)</span>
                    <span className="font-mono text-indigo-700 font-extrabold">{(drainParams.wallThickness || 0.20).toFixed(2)} m</span>
                  </label>
                  <input
                    type="number"
                    step="0.025"
                    min="0.05"
                    max="0.8"
                    value={drainParams.wallThickness || 0.20}
                    onChange={(e) => setDrainParams((p) => ({ ...p, wallThickness: Math.max(0.02, parseFloat(e.target.value) || 0) }))}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* Base / Bed Slab Thickness */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex justify-between">
                  <span>
                    {drainType === 'plum_drain'
                      ? 'Plum Concrete Bed Slab (Tb)'
                      : drainType === 'brick_masonry'
                      ? 'Bed Concrete Slab (Tb)'
                      : 'RCC Bed Slab Thickness (Tb)'}
                  </span>
                  <span className="font-mono text-indigo-700 font-extrabold">
                    {(drainParams.baseThickness ?? 0.20) === 0
                      ? '0.00 m (Bed P.C.C. Only)'
                      : `${(drainParams.baseThickness ?? 0.20).toFixed(2)} m`}
                  </span>
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    step="0.025"
                    min="0"
                    max="1.0"
                    value={drainParams.baseThickness ?? 0.20}
                    onChange={(e) => {
                      const val = Math.max(0, parseFloat(e.target.value) || 0);
                      setDrainParams((p) => ({ ...p, baseThickness: val }));
                    }}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                  {(drainParams.baseThickness ?? 0.20) > 0 ? (
                    <button
                      type="button"
                      onClick={() => setDrainParams((p) => ({ ...p, baseThickness: 0 }))}
                      className="px-2.5 py-2 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl whitespace-nowrap border border-slate-200"
                      title="Set to 0 (Bed P.C.C. is enough, no Plum Bed Slab)"
                    >
                      Set 0 (PCC Only)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDrainParams((p) => ({ ...p, baseThickness: 0.20 }))}
                      className="px-2.5 py-2 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl whitespace-nowrap border border-indigo-200"
                      title="Restore default bed slab thickness"
                    >
                      Restore (0.20m)
                    </button>
                  )}
                </div>
                {drainType === 'plum_drain' && (drainParams.baseThickness ?? 0.20) === 0 && (
                  <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Plum Bed Slab excluded — Plum walls rest directly on Bed P.C.C.</span>
                  </p>
                )}
              </div>

              {/* SPECIFIC CONTROLS PER DRAIN TYPE */}
              {drainType === 'rcc_rectangular' || drainType === 'rectangular' ? (
                /* 1. RCC Rectangular Drain: Optional Slab Cover & Reinforcement */
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-950">
                      <input
                        type="checkbox"
                        checked={drainParams.hasCoverSlab ?? true}
                        onChange={(e) => setDrainParams((p) => ({ ...p, hasCoverSlab: e.target.checked }))}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span>Removable RCC Top Cover Slab</span>
                    </label>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded">
                      M20 Grade
                    </span>
                  </div>

                  {(drainParams.hasCoverSlab ?? true) && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                          Cover Thickness (Tc)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.05"
                          max="0.30"
                          value={drainParams.coverSlabThickness ?? 0.10}
                          onChange={(e) =>
                            setDrainParams((p) => ({
                              ...p,
                              coverSlabThickness: Math.max(0.02, parseFloat(e.target.value) || 0)
                            }))
                          }
                          className="w-full p-1.5 border border-emerald-300 rounded-lg font-mono font-bold text-slate-900 bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                          Cover Width
                        </label>
                        <input
                          type="number"
                          step="0.05"
                          min="0.2"
                          max="5.0"
                          value={
                            drainParams.coverSlabWidth ??
                            (drainParams.invertWidth + 2 * (drainParams.wallThickness || 0.20))
                          }
                          onChange={(e) =>
                            setDrainParams((p) => ({
                              ...p,
                              coverSlabWidth: Math.max(0.1, parseFloat(e.target.value) || 0)
                            }))
                          }
                          className="w-full p-1.5 border border-emerald-300 rounded-lg font-mono font-bold text-slate-900 bg-white text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {drainType === 'plum_drain' ? (
                /* 2. Plum Drain: Boulder Ratio */
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-950">Plum Boulder Ratio</span>
                    <span className="font-mono font-black text-amber-800">
                      {drainParams.plumBoulderPercent ?? 40}% Boulders
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="60"
                    step="5"
                    value={drainParams.plumBoulderPercent ?? 40}
                    onChange={(e) =>
                      setDrainParams((p) => ({
                        ...p,
                        plumBoulderPercent: parseInt(e.target.value, 10) || 40
                      }))
                    }
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-amber-700 font-semibold">
                    <span>20% (Light Plum)</span>
                    <span>40% (Standard)</span>
                    <span>60% (Heavy Boulder)</span>
                  </div>
                </div>
              ) : null}

              {drainType === 'brick_masonry' ? (
                /* 3. Brick Masonry Drain: Top PCC Coping, Plaster & Punning Heights */
                <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-orange-950 text-[11px] uppercase">
                      Brick Finishes: Plaster & Punning
                    </span>
                    <span className="text-[10px] bg-orange-100 text-orange-800 font-black px-1.5 py-0.5 rounded">
                      IS Standard
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-orange-900 mb-1 flex justify-between">
                      <span>Top PCC Coping Thickness</span>
                      <span className="font-mono text-orange-800 font-extrabold">
                        {((drainParams.topPccThickness ?? 0.075) * 1000).toFixed(0)} mm
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.02"
                      max="0.25"
                      value={drainParams.topPccThickness ?? 0.075}
                      onChange={(e) =>
                        setDrainParams((p) => ({
                          ...p,
                          topPccThickness: Math.max(0.01, parseFloat(e.target.value) || 0)
                        }))
                      }
                      className="w-full p-1.5 border border-orange-300 rounded-lg font-mono font-bold text-slate-900 bg-white text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-orange-900 mb-1 flex justify-between">
                        <span>Plaster Height (Hp)</span>
                        <span className="font-mono text-orange-800 font-bold">
                          {(drainParams.plasterHeight ?? drainParams.depth).toFixed(2)}m
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        value={drainParams.plasterHeight ?? drainParams.depth}
                        onChange={(e) =>
                          setDrainParams((p) => ({
                            ...p,
                            plasterHeight: Math.max(0, parseFloat(e.target.value) || 0)
                          }))
                        }
                        className="w-full p-1.5 border border-orange-300 rounded-lg font-mono font-bold text-slate-900 bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-orange-900 mb-1 flex justify-between">
                        <span>Punning Height (Hpun)</span>
                        <span className="font-mono text-orange-800 font-bold">
                          {(drainParams.punningHeight ?? drainParams.depth).toFixed(2)}m
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        value={drainParams.punningHeight ?? drainParams.depth}
                        onChange={(e) =>
                          setDrainParams((p) => ({
                            ...p,
                            punningHeight: Math.max(0, parseFloat(e.target.value) || 0)
                          }))
                        }
                        className="w-full p-1.5 border border-orange-300 rounded-lg font-mono font-bold text-slate-900 bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="p-2 bg-white/90 rounded-lg border border-orange-200 text-[11px] text-orange-950 font-medium">
                    <div className="flex items-center gap-1.5 font-bold text-orange-900 mb-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Plaster & Punning Heights</span>
                    </div>
                    <span>Default is drain internal depth ({drainParams.depth.toFixed(2)}m). Custom heights calculate girth accurately as B + 2×H.</span>
                  </div>
                </div>
              ) : null}

              {/* Water Depth & Freeboard */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Water Depth</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={drainParams.waterDepth}
                    onChange={(e) => setDrainParams((p) => ({ ...p, waterDepth: Math.max(0, parseFloat(e.target.value) || 0) }))}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Freeboard</label>
                  <input
                    type="number"
                    step="0.02"
                    min="0"
                    value={drainParams.freeboard}
                    onChange={(e) => setDrainParams((p) => ({ ...p, freeboard: Math.max(0, parseFloat(e.target.value) || 0) }))}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* DRAIN FOUNDATION, SOLING & EXCAVATION ACCORDION */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-xs mt-3">
                <button
                  type="button"
                  onClick={() => togglePanel('drain_foundation')}
                  className="w-full p-2.5 flex items-center justify-between gap-2 text-left group hover:opacity-85 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">
                      🪨
                    </div>
                    <span className="font-extrabold text-xs text-slate-900 truncate">
                      Drain Bedding & Trench Excavation
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                      PCC: {drainParams.pccThickness ?? 0.10}m • Soling: {drainParams.solingThickness ?? 0.15}m
                    </span>
                    <div className="p-0.5 rounded text-slate-400 group-hover:text-slate-700">
                      {collapsedPanels.drain_foundation ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </button>

                {!collapsedPanels.drain_foundation && (
                  <div className="p-3 pt-0 space-y-2.5 border-t border-slate-200 mt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 text-[11px]">Bed PCC Thickness</label>
                        <input
                          type="number"
                          step="0.025"
                          min="0"
                          value={drainParams.pccThickness ?? 0.10}
                          onChange={(e) => setDrainParams((p) => ({ ...p, pccThickness: Math.max(0, parseFloat(e.target.value) || 0) }))}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 text-[11px]">Soling Thickness</label>
                        <input
                          type="number"
                          step="0.025"
                          min="0"
                          value={drainParams.solingThickness ?? 0.15}
                          onChange={(e) => setDrainParams((p) => ({ ...p, solingThickness: Math.max(0, parseFloat(e.target.value) || 0) }))}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 text-[11px]">PCC / Soling Offset (m)</label>
                        <input
                          type="number"
                          step="0.025"
                          min="0"
                          value={drainParams.pccOffset ?? 0.075}
                          onChange={(e) => setDrainParams((p) => ({ ...p, pccOffset: Math.max(0, parseFloat(e.target.value) || 0) }))}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 text-[11px]">Section Length (L)</label>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={drainParams.sectionLength ?? 10.0}
                          onChange={(e) => setDrainParams((p) => ({ ...p, sectionLength: Math.max(1, parseFloat(e.target.value) || 1) }))}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ROAD PARAMETERS INPUTS */}
          {category === 'road' && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex justify-between">
                  <span>Carriageway Width (Wc)</span>
                  <span className="font-mono text-indigo-700 font-extrabold">{roadParams.carriagewayWidth} m</span>
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="2.0"
                  max="15.0"
                  value={roadParams.carriagewayWidth}
                  onChange={(e) => setRoadParams((p) => ({ ...p, carriagewayWidth: Math.max(1.0, parseFloat(e.target.value) || 0) }))}
                  className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Left Shoulder</label>
                  <input
                    type="number"
                    step="0.1"
                    value={roadParams.shoulderLeft}
                    onChange={(e) => setRoadParams((p) => ({ ...p, shoulderLeft: Math.max(0, parseFloat(e.target.value) || 0) }))}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Right Shoulder</label>
                  <input
                    type="number"
                    step="0.1"
                    value={roadParams.shoulderRight}
                    onChange={(e) => setRoadParams((p) => ({ ...p, shoulderRight: Math.max(0, parseFloat(e.target.value) || 0) }))}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Camber Slope (%)</label>
                  <input
                    type="number"
                    step="0.25"
                    value={roadParams.camberPercent}
                    onChange={(e) => setRoadParams((p) => ({ ...p, camberPercent: Math.max(0.1, parseFloat(e.target.value) || 0) }))}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Camber Profile</label>
                  <select
                    value={roadParams.camberType}
                    onChange={(e) => setRoadParams((p) => ({ ...p, camberType: e.target.value as 'crown' | 'crossfall' }))}
                    className="w-full p-2 border border-slate-300 rounded-xl font-bold text-slate-800"
                  >
                    <option value="crown">2-Sided Crown</option>
                    <option value="crossfall">1-Way Crossfall</option>
                  </select>
                </div>
              </div>

              {roadType === 'flexible_asphalt' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex justify-between">
                    <span>Asphalt Layer Thickness (m)</span>
                    <span className="font-mono text-indigo-700 font-extrabold">{roadParams.asphaltThickness} m</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={roadParams.asphaltThickness}
                    onChange={(e) => setRoadParams((p) => ({ ...p, asphaltThickness: Math.max(0.01, parseFloat(e.target.value) || 0) }))}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex justify-between">
                  <span>Base Course Thickness (m)</span>
                  <span className="font-mono text-indigo-700 font-extrabold">{roadParams.baseThickness} m</span>
                </label>
                <input
                  type="number"
                  step="0.02"
                  value={roadParams.baseThickness}
                  onChange={(e) => setRoadParams((p) => ({ ...p, baseThickness: Math.max(0.02, parseFloat(e.target.value) || 0) }))}
                  className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex justify-between">
                  <span>Sub-Base Thickness (m)</span>
                  <span className="font-mono text-indigo-700 font-extrabold">{roadParams.subBaseThickness} m</span>
                </label>
                <input
                  type="number"
                  step="0.02"
                  value={roadParams.subBaseThickness}
                  onChange={(e) => setRoadParams((p) => ({ ...p, subBaseThickness: Math.max(0.02, parseFloat(e.target.value) || 0) }))}
                  className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                />
              </div>
            </div>
          )}

          {/* CULVERT PARAMETERS INPUTS */}
          {category === 'culvert' && (
            <div className="space-y-2.5 text-xs">
              {culvertType === 'slab_culvert' ? (
                <>
                  {/* Panel 1: RCC Deck Slab on Top & Wearing Course */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => togglePanel('culvert_deck')}
                      className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 transition text-left"
                    >
                      <div className="flex items-center gap-1.5 font-extrabold text-slate-800 text-xs">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        <span>1. RCC Deck Slab & Carriageway</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                        <span className="font-mono text-indigo-700 font-black">S={culvertParams.clearSpan}m</span>
                        {collapsedPanels.culvert_deck ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </div>
                    </button>

                    {!collapsedPanels.culvert_deck && (
                      <div className="p-3 bg-white space-y-2.5 border-t border-slate-100">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1 flex justify-between">
                            <span>Clear Waterway Span (S)</span>
                            <span className="font-mono text-indigo-700 font-extrabold">{culvertParams.clearSpan} m</span>
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={culvertParams.clearSpan}
                            onChange={(e) => setCulvertParams((p) => ({ ...p, clearSpan: Math.max(0.5, parseFloat(e.target.value) || 0) }))}
                            className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Deck Slab (Ts)</label>
                            <input
                              type="number"
                              step="0.02"
                              value={culvertParams.topSlabThickness}
                              onChange={(e) => setCulvertParams((p) => ({ ...p, topSlabThickness: Math.max(0.15, parseFloat(e.target.value) || 0) }))}
                              className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Wearing Coat (m)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={culvertParams.wearingCoatThickness || 0.05}
                              onChange={(e) => setCulvertParams((p) => ({ ...p, wearingCoatThickness: Math.max(0, parseFloat(e.target.value) || 0) }))}
                              className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Barrel Length (Lb)</label>
                            <input
                              type="number"
                              step="0.5"
                              value={culvertParams.barrelLength || 7.50}
                              onChange={(e) => setCulvertParams((p) => ({ ...p, barrelLength: Math.max(1.0, parseFloat(e.target.value) || 0) }))}
                              className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Rebar (kg/m³)</label>
                            <input
                              type="number"
                              step="5"
                              value={culvertParams.deckRebarDensityKgPerM3 || 105}
                              onChange={(e) => setCulvertParams((p) => ({ ...p, deckRebarDensityKgPerM3: Math.max(20, parseFloat(e.target.value) || 0) }))}
                              className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Panel 2: Masonry Abutment Walls (2 Nos) */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => togglePanel('culvert_abutments')}
                      className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 transition text-left"
                    >
                      <div className="flex items-center gap-1.5 font-extrabold text-slate-800 text-xs">
                        <Shield className="w-3.5 h-3.5 text-amber-600" />
                        <span>2. Masonry Abutments (2 Nos)</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                        <span className="font-mono text-amber-700 font-black">H={culvertParams.clearHeight}m</span>
                        {collapsedPanels.culvert_abutments ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </div>
                    </button>

                    {!collapsedPanels.culvert_abutments && (
                      <div className="p-3 bg-white space-y-2.5 border-t border-slate-100">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1 flex justify-between">
                            <span>Abutment Height / Clear H</span>
                            <span className="font-mono text-amber-700 font-extrabold">{culvertParams.clearHeight} m</span>
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={culvertParams.clearHeight}
                            onChange={(e) => {
                              const val = Math.max(0.5, parseFloat(e.target.value) || 0);
                              setCulvertParams((p) => ({ ...p, clearHeight: val, abutmentHeight: val }));
                            }}
                            className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Top Width (Tw_top)</label>
                            <input
                              type="number"
                              step="0.05"
                              value={culvertParams.abutmentTopWidth || culvertParams.wallThickness || 0.70}
                              onChange={(e) => {
                                const val = Math.max(0.3, parseFloat(e.target.value) || 0);
                                setCulvertParams((p) => ({ ...p, abutmentTopWidth: val, wallThickness: val }));
                              }}
                              className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Bottom Width (Tw_bot)</label>
                            <input
                              type="number"
                              step="0.05"
                              value={culvertParams.abutmentBottomWidth || 1.20}
                              onChange={(e) => setCulvertParams((p) => ({ ...p, abutmentBottomWidth: Math.max(0.4, parseFloat(e.target.value) || 0) }))}
                              className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Abutment Masonry Type</label>
                          <select
                            value={culvertParams.abutmentMasonryType || 'stone_masonry'}
                            onChange={(e) => setCulvertParams((p) => ({ ...p, abutmentMasonryType: e.target.value as any }))}
                            className="w-full p-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                          >
                            <option value="stone_masonry">Stone Masonry (1:4 / 1:6 Mortar)</option>
                            <option value="plum_concrete">Plum Concrete (40% Boulders)</option>
                            <option value="brick_masonry">Brick Masonry</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Panel 3: RCC L-Cap & Dirt Wall */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => togglePanel('culvert_lcaps')}
                      className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 transition text-left"
                    >
                      <div className="flex items-center gap-1.5 font-extrabold text-slate-800 text-xs">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        <span>3. RCC L-Cap & Dirt Wall (Bed-Block)</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                        <span className="font-mono text-blue-700 font-black">
                          {culvertParams.hasLCap ? `T=${culvertParams.lCapThickness || 0.20}m` : 'None'}
                        </span>
                        {collapsedPanels.culvert_lcaps ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </div>
                    </button>

                    {!collapsedPanels.culvert_lcaps && (
                      <div className="p-3 bg-white space-y-2.5 border-t border-slate-100">
                        <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={culvertParams.hasLCap ?? true}
                            onChange={(e) => setCulvertParams((p) => ({ ...p, hasLCap: e.target.checked }))}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Include RCC L-Cap Bed Blocks & Dirt Walls</span>
                        </label>

                        {culvertParams.hasLCap && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">Bearing Bed (T_cap)</label>
                                <input
                                  type="number"
                                  step="0.02"
                                  value={culvertParams.lCapThickness || 0.20}
                                  onChange={(e) => setCulvertParams((p) => ({ ...p, lCapThickness: Math.max(0.1, parseFloat(e.target.value) || 0) }))}
                                  className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                                />
                              </div>
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">Bearing Seat (m)</label>
                                <input
                                  type="number"
                                  step="0.05"
                                  value={culvertParams.bearingLength || 0.35}
                                  onChange={(e) => setCulvertParams((p) => ({ ...p, bearingLength: Math.max(0.2, parseFloat(e.target.value) || 0) }))}
                                  className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">Dirt Wall H (m)</label>
                                <input
                                  type="number"
                                  step="0.05"
                                  value={culvertParams.lCapDirtWallHeight || 0.35}
                                  onChange={(e) => setCulvertParams((p) => ({ ...p, lCapDirtWallHeight: Math.max(0.15, parseFloat(e.target.value) || 0) }))}
                                  className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                                />
                              </div>
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">Dirt Wall Thick (m)</label>
                                <input
                                  type="number"
                                  step="0.02"
                                  value={culvertParams.lCapDirtWallThickness || 0.22}
                                  onChange={(e) => setCulvertParams((p) => ({ ...p, lCapDirtWallThickness: Math.max(0.15, parseFloat(e.target.value) || 0) }))}
                                  className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Panel 4: Masonry Wing Walls (4 Nos Flared @ 45°) */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => togglePanel('culvert_wingwalls')}
                      className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 transition text-left"
                    >
                      <div className="flex items-center gap-1.5 font-extrabold text-slate-800 text-xs">
                        <Compass className="w-3.5 h-3.5 text-emerald-600" />
                        <span>4. Masonry Wing Walls (4 Nos Flared)</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                        <span className="font-mono text-emerald-700 font-black">
                          {culvertParams.hasWingWalls ? `L=${culvertParams.wingWallLength || 3.50}m` : 'None'}
                        </span>
                        {collapsedPanels.culvert_wingwalls ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </div>
                    </button>

                    {!collapsedPanels.culvert_wingwalls && (
                      <div className="p-3 bg-white space-y-2.5 border-t border-slate-100">
                        <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={culvertParams.hasWingWalls ?? true}
                            onChange={(e) => setCulvertParams((p) => ({ ...p, hasWingWalls: e.target.checked }))}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Include 4 Nos Flared Return Wing Walls</span>
                        </label>

                        {culvertParams.hasWingWalls && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">Wing Length (Lw)</label>
                                <input
                                  type="number"
                                  step="0.25"
                                  value={culvertParams.wingWallLength || 3.50}
                                  onChange={(e) => setCulvertParams((p) => ({ ...p, wingWallLength: Math.max(1.0, parseFloat(e.target.value) || 0) }))}
                                  className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                                />
                              </div>
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">Coping Thick (m)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={culvertParams.wingWallCopingThickness || 0.075}
                                  onChange={(e) => setCulvertParams((p) => ({ ...p, wingWallCopingThickness: Math.max(0.04, parseFloat(e.target.value) || 0) }))}
                                  className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">Start H (Abutment)</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={culvertParams.wingWallStartHeight || 2.40}
                                  onChange={(e) => setCulvertParams((p) => ({ ...p, wingWallStartHeight: Math.max(0.5, parseFloat(e.target.value) || 0) }))}
                                  className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                                />
                              </div>
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">End H (Stream Bank)</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={culvertParams.wingWallEndHeight || 0.90}
                                  onChange={(e) => setCulvertParams((p) => ({ ...p, wingWallEndHeight: Math.max(0.4, parseFloat(e.target.value) || 0) }))}
                                  className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">Wing Top Width</label>
                                <input
                                  type="number"
                                  step="0.05"
                                  value={culvertParams.wingWallTopWidth || 0.50}
                                  onChange={(e) => setCulvertParams((p) => ({ ...p, wingWallTopWidth: Math.max(0.3, parseFloat(e.target.value) || 0) }))}
                                  className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                                />
                              </div>
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">Wing Bot Width</label>
                                <input
                                  type="number"
                                  step="0.05"
                                  value={culvertParams.wingWallBottomWidth || 1.00}
                                  onChange={(e) => setCulvertParams((p) => ({ ...p, wingWallBottomWidth: Math.max(0.4, parseFloat(e.target.value) || 0) }))}
                                  className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Panel 5: Foundation, Bed PCC, Soling & Invert Apron */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => togglePanel('culvert_foundation')}
                      className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 transition text-left"
                    >
                      <div className="flex items-center gap-1.5 font-extrabold text-slate-800 text-xs">
                        <Layers className="w-3.5 h-3.5 text-purple-600" />
                        <span>5. Bed PCC, Soling & Invert Apron</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                        <span className="font-mono text-purple-700 font-black">
                          PCC={culvertParams.foundationPccThickness || 0.15}m
                        </span>
                        {collapsedPanels.culvert_foundation ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </div>
                    </button>

                    {!collapsedPanels.culvert_foundation && (
                      <div className="p-3 bg-white space-y-2.5 border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Bed PCC (M10)</label>
                            <input
                              type="number"
                              step="0.02"
                              value={culvertParams.foundationPccThickness || 0.15}
                              onChange={(e) => setCulvertParams((p) => ({ ...p, foundationPccThickness: Math.max(0.05, parseFloat(e.target.value) || 0) }))}
                              className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Stone Soling Bed</label>
                            <input
                              type="number"
                              step="0.02"
                              value={culvertParams.foundationSolingThickness || 0.15}
                              onChange={(e) => setCulvertParams((p) => ({ ...p, foundationSolingThickness: Math.max(0.05, parseFloat(e.target.value) || 0) }))}
                              className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">PCC Offset (m)</label>
                            <input
                              type="number"
                              step="0.02"
                              value={culvertParams.foundationPccOffset || 0.15}
                              onChange={(e) => setCulvertParams((p) => ({ ...p, foundationPccOffset: Math.max(0.05, parseFloat(e.target.value) || 0) }))}
                              className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Apron Bed (m)</label>
                            <input
                              type="number"
                              step="0.02"
                              value={culvertParams.apronThickness || 0.15}
                              onChange={(e) => setCulvertParams((p) => ({ ...p, apronThickness: Math.max(0.05, parseFloat(e.target.value) || 0) }))}
                              className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Curtain Depth (m)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={culvertParams.curtainWallDepth || 0.80}
                              onChange={(e) => setCulvertParams((p) => ({ ...p, curtainWallDepth: Math.max(0.3, parseFloat(e.target.value) || 0) }))}
                              className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">HFL Water (m)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={culvertParams.waterLevel || 0.80}
                              onChange={(e) => setCulvertParams((p) => ({ ...p, waterLevel: Math.max(0, parseFloat(e.target.value) || 0) }))}
                              className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : culvertType !== 'pipe_rcc' ? (
                <>
                  {/* Comprehensive Box Culvert Inputs with Fillet, Fillet Bar, Apron & Scour Wall */}
                  {/* View Mode Selector */}
                  <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-[11px] font-bold">
                    {[
                      { id: 'cross_section', label: 'Cross Section' },
                      { id: 'longitudinal', label: 'Longitudinal' },
                      { id: 'plan', label: 'Plan' },
                      { id: 'rebar', label: 'Rebar Details' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setCulvertParams((p) => ({ ...p, boxViewMode: tab.id as any }))}
                        className={`flex-1 py-1.5 px-1 rounded-lg text-center transition ${
                          (culvertParams.boxViewMode || 'cross_section') === tab.id
                            ? 'bg-white text-indigo-700 shadow-xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Panel 1: Box Barrel Geometry */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => togglePanel('box_barrel')}
                      className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 transition text-left"
                    >
                      <div className="flex items-center gap-1.5 font-extrabold text-slate-800 text-xs">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        <span>1. RCC Box Barrel & Slabs</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                        <span className="font-mono text-indigo-700 font-black">
                          {culvertParams.clearSpan}m × {culvertParams.clearHeight}m
                        </span>
                        {collapsedPanels.box_barrel ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </div>
                    </button>

                    {!collapsedPanels.box_barrel && (
                      <div className="p-3 bg-white space-y-2.5 border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Clear Span (S)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={culvertParams.clearSpan}
                              onChange={(e) => setCulvertParams((p) => ({ ...p, clearSpan: Math.max(0.3, parseFloat(e.target.value) || 0) }))}
                              className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Clear Height (H)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={culvertParams.clearHeight}
                              onChange={(e) => setCulvertParams((p) => ({ ...p, clearHeight: Math.max(0.3, parseFloat(e.target.value) || 0) }))}
                              className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Top Slab (Tt)</label>
                            <input
                              type="number"
                              step="0.02"
                              value={culvertParams.topSlabThickness}
                              onChange={(e) => setCulvertParams((p) => ({ ...p, topSlabThickness: Math.max(0.1, parseFloat(e.target.value) || 0) }))}
                              className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Bottom Slab (Tb)</label>
                            <input
                              type="number"
                              step="0.02"
                              value={culvertParams.bottomSlabThickness || 0.30}
                              onChange={(e) => setCulvertParams((p) => ({ ...p, bottomSlabThickness: Math.max(0.1, parseFloat(e.target.value) || 0) }))}
                              className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Side Wall (Tw)</label>
                            <input
                              type="number"
                              step="0.02"
                              value={culvertParams.wallThickness}
                              onChange={(e) => setCulvertParams((p) => ({ ...p, wallThickness: Math.max(0.1, parseFloat(e.target.value) || 0) }))}
                              className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Barrel Length (Lb)</label>
                            <input
                              type="number"
                              step="0.5"
                              value={culvertParams.barrelLength || 8.50}
                              onChange={(e) => setCulvertParams((p) => ({ ...p, barrelLength: Math.max(1.0, parseFloat(e.target.value) || 0) }))}
                              className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                            />
                          </div>
                        </div>

                        {culvertType === 'box_twin' && (
                          <div>
                            <label className="block font-bold text-slate-700 mb-1 flex justify-between">
                              <span>Center Pier Wall Thickness (T_pier)</span>
                              <span className="font-mono text-indigo-700 font-extrabold">{culvertParams.pierThickness || 0.30} m</span>
                            </label>
                            <input
                              type="number"
                              step="0.02"
                              value={culvertParams.pierThickness || 0.30}
                              onChange={(e) => setCulvertParams((p) => ({ ...p, pierThickness: Math.max(0.15, parseFloat(e.target.value) || 0) }))}
                              className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block font-bold text-slate-700 mb-1 flex justify-between">
                            <span>Earth Cushion / Fill Height (Hf)</span>
                            <span className="font-mono text-indigo-700 font-extrabold">{culvertParams.fillHeight} m</span>
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={culvertParams.fillHeight}
                            onChange={(e) => setCulvertParams((p) => ({ ...p, fillHeight: Math.max(0, parseFloat(e.target.value) || 0) }))}
                            className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Panel 2: Corner Fillet / Haunch & Fillet Rebar */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => togglePanel('box_fillet')}
                      className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 transition text-left"
                    >
                      <div className="flex items-center gap-1.5 font-extrabold text-slate-800 text-xs">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>2. Corner Fillets & Fillet Bars</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                        <span className="font-mono text-amber-700 font-black">
                          {culvertParams.hasFillet ?? true ? `${((culvertParams.filletSize ?? 0.20) * 1000).toFixed(0)}mm Haunch` : 'No Fillet'}
                        </span>
                        {collapsedPanels.box_fillet ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </div>
                    </button>

                    {!collapsedPanels.box_fillet && (
                      <div className="p-3 bg-white space-y-2.5 border-t border-slate-100">
                        {/* Fillet / Haunch Toggle */}
                        <div className="flex items-center justify-between p-2 bg-amber-50/70 border border-amber-200 rounded-xl">
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-950">
                            <input
                              type="checkbox"
                              checked={culvertParams.hasFillet ?? true}
                              onChange={(e) => setCulvertParams((p) => ({ ...p, hasFillet: e.target.checked }))}
                              className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                            />
                            <span>Internal Corner Fillets / Haunches</span>
                          </label>
                          <span className="text-[10px] bg-amber-200/80 text-amber-900 font-black px-1.5 py-0.5 rounded">
                            45° Chamfer
                          </span>
                        </div>

                        {(culvertParams.hasFillet ?? true) && (
                          <>
                            <div>
                              <label className="block font-bold text-slate-700 mb-1 flex justify-between">
                                <span>Fillet Size (haunch leg length)</span>
                                <span className="font-mono text-amber-700 font-extrabold">{(culvertParams.filletSize ?? 0.20).toFixed(2)} m</span>
                              </label>
                              <div className="flex gap-1.5 items-center">
                                {[0.15, 0.20, 0.25, 0.30].map((sz) => (
                                  <button
                                    key={sz}
                                    type="button"
                                    onClick={() => setCulvertParams((p) => ({ ...p, filletSize: sz }))}
                                    className={`px-2 py-1 text-xs rounded-lg font-bold border transition ${
                                      (culvertParams.filletSize ?? 0.20) === sz
                                        ? 'bg-amber-500 text-white border-amber-600'
                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {(sz * 1000).toFixed(0)}mm
                                  </button>
                                ))}
                                <input
                                  type="number"
                                  step="0.025"
                                  min="0.05"
                                  max="0.60"
                                  value={culvertParams.filletSize ?? 0.20}
                                  onChange={(e) => setCulvertParams((p) => ({ ...p, filletSize: Math.max(0.05, parseFloat(e.target.value) || 0) }))}
                                  className="w-20 p-1 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs"
                                />
                              </div>
                            </div>

                            {/* Fillet Bar (Haunch Rebar) */}
                            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                                <input
                                  type="checkbox"
                                  checked={culvertParams.hasFilletBar ?? true}
                                  onChange={(e) => setCulvertParams((p) => ({ ...p, hasFilletBar: e.target.checked }))}
                                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <span>Corner Fillet Reinforcement Bars</span>
                              </label>

                              {(culvertParams.hasFilletBar ?? true) && (
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Bar Dia (Ø mm)</label>
                                    <select
                                      value={culvertParams.filletBarDia ?? 12}
                                      onChange={(e) => setCulvertParams((p) => ({ ...p, filletBarDia: parseInt(e.target.value, 10) || 12 }))}
                                      className="w-full p-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs"
                                    >
                                      <option value="10">Ø10 mm</option>
                                      <option value="12">Ø12 mm</option>
                                      <option value="16">Ø16 mm</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Spacing (mm c/c)</label>
                                    <select
                                      value={culvertParams.filletBarSpacing ?? 150}
                                      onChange={(e) => setCulvertParams((p) => ({ ...p, filletBarSpacing: parseInt(e.target.value, 10) || 150 }))}
                                      className="w-full p-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs"
                                    >
                                      <option value="100">@ 100 c/c</option>
                                      <option value="125">@ 125 c/c</option>
                                      <option value="150">@ 150 c/c</option>
                                      <option value="200">@ 200 c/c</option>
                                    </select>
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Panel 3: Launching Apron (Bed Protection Pitching) */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => togglePanel('box_apron')}
                      className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 transition text-left"
                    >
                      <div className="flex items-center gap-1.5 font-extrabold text-slate-800 text-xs">
                        <Shield className="w-3.5 h-3.5 text-emerald-600" />
                        <span>3. Launching Apron (U/S & D/S)</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                        <span className="font-mono text-emerald-700 font-black">
                          {culvertParams.hasLaunchingApron ?? true
                            ? (culvertParams.launchingApronOption || 'both').toUpperCase()
                            : 'None'}
                        </span>
                        {collapsedPanels.box_apron ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </div>
                    </button>

                    {!collapsedPanels.box_apron && (
                      <div className="p-3 bg-white space-y-2.5 border-t border-slate-100">
                        {/* Launching Apron Toggle */}
                        <div className="flex items-center justify-between p-2 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-950">
                            <input
                              type="checkbox"
                              checked={culvertParams.hasLaunchingApron ?? true}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setCulvertParams((p) => ({
                                  ...p,
                                  hasLaunchingApron: checked,
                                  launchingApronOption: checked ? (p.launchingApronOption === 'none' ? 'both' : p.launchingApronOption || 'both') : 'none'
                                }));
                              }}
                              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                            />
                            <span>Include Launching Apron Bed Protection</span>
                          </label>
                        </div>

                        {(culvertParams.hasLaunchingApron ?? true) && (
                          <>
                            <div>
                              <label className="block font-bold text-slate-700 mb-1">Apron Location / Option</label>
                              <div className="grid grid-cols-3 gap-1.5">
                                {[
                                  { id: 'both', label: 'Both (U/S & D/S)' },
                                  { id: 'upstream', label: 'Upstream (U/S)' },
                                  { id: 'downstream', label: 'Downstream (D/S)' }
                                ].map((opt) => (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setCulvertParams((p) => ({ ...p, launchingApronOption: opt.id as any, hasLaunchingApron: true }))}
                                    className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition text-center ${
                                      (culvertParams.launchingApronOption || 'both') === opt.id
                                        ? 'bg-emerald-600 text-white border-emerald-700'
                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">Apron Length (La)</label>
                                <input
                                  type="number"
                                  step="0.25"
                                  value={culvertParams.launchingApronLength ?? 3.0}
                                  onChange={(e) => setCulvertParams((p) => ({ ...p, launchingApronLength: Math.max(0.5, parseFloat(e.target.value) || 0) }))}
                                  className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                                />
                              </div>
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">Apron Thick (Ta)</label>
                                <input
                                  type="number"
                                  step="0.05"
                                  value={culvertParams.launchingApronThickness ?? 0.35}
                                  onChange={(e) => setCulvertParams((p) => ({ ...p, launchingApronThickness: Math.max(0.1, parseFloat(e.target.value) || 0) }))}
                                  className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1">Material / Type</label>
                              <select
                                value={culvertParams.launchingApronType || 'stone_pitching'}
                                onChange={(e) => setCulvertParams((p) => ({ ...p, launchingApronType: e.target.value as any }))}
                                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 text-xs"
                              >
                                <option value="stone_pitching">Flexible Boulder Stone Pitching (Dry)</option>
                                <option value="gabion_mattress">Gabion Wire Mesh Mattress / Crates</option>
                                <option value="concrete_block">Interlocking Precast Concrete Blocks</option>
                              </select>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Panel 4: Scour Wall (Curtain Drop Wall) */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => togglePanel('box_scour')}
                      className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 transition text-left"
                    >
                      <div className="flex items-center gap-1.5 font-extrabold text-slate-800 text-xs">
                        <Compass className="w-3.5 h-3.5 text-purple-600" />
                        <span>4. Cutoff Scour Wall (U/S & D/S)</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                        <span className="font-mono text-purple-700 font-black">
                          {culvertParams.hasScourWall ?? true
                            ? `D=${culvertParams.scourWallDepth ?? 1.20}m [${(culvertParams.scourWallLocation || 'both').toUpperCase()}]`
                            : 'None'}
                        </span>
                        {collapsedPanels.box_scour ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </div>
                    </button>

                    {!collapsedPanels.box_scour && (
                      <div className="p-3 bg-white space-y-2.5 border-t border-slate-100">
                        {/* Scour Wall Toggle */}
                        <div className="flex items-center justify-between p-2 bg-purple-50/70 border border-purple-200 rounded-xl">
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-purple-950">
                            <input
                              type="checkbox"
                              checked={culvertParams.hasScourWall ?? true}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setCulvertParams((p) => ({
                                  ...p,
                                  hasScourWall: checked,
                                  scourWallLocation: checked ? (p.scourWallLocation === 'none' ? 'both' : p.scourWallLocation || 'both') : 'none'
                                }));
                              }}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <span>Include Cutoff / Curtain Scour Wall</span>
                          </label>
                        </div>

                        {(culvertParams.hasScourWall ?? true) && (
                          <>
                            <div>
                              <label className="block font-bold text-slate-700 mb-1">Scour Wall Location / Option</label>
                              <div className="grid grid-cols-3 gap-1.5">
                                {[
                                  { id: 'both', label: 'Both (U/S & D/S)' },
                                  { id: 'upstream', label: 'Upstream (U/S)' },
                                  { id: 'downstream', label: 'Downstream (D/S)' }
                                ].map((opt) => (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setCulvertParams((p) => ({ ...p, scourWallLocation: opt.id as any, hasScourWall: true }))}
                                    className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition text-center ${
                                      (culvertParams.scourWallLocation || 'both') === opt.id
                                        ? 'bg-purple-600 text-white border-purple-700'
                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">Cutoff Depth (D_scour)</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={culvertParams.scourWallDepth ?? 1.20}
                                  onChange={(e) => setCulvertParams((p) => ({ ...p, scourWallDepth: Math.max(0.3, parseFloat(e.target.value) || 0) }))}
                                  className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                                />
                              </div>
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">Wall Thickness (Tw_scour)</label>
                                <input
                                  type="number"
                                  step="0.05"
                                  value={culvertParams.scourWallThickness ?? 0.30}
                                  onChange={(e) => setCulvertParams((p) => ({ ...p, scourWallThickness: Math.max(0.15, parseFloat(e.target.value) || 0) }))}
                                  className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1">Construction Type</label>
                              <select
                                value={culvertParams.scourWallType || 'rcc'}
                                onChange={(e) => setCulvertParams((p) => ({ ...p, scourWallType: e.target.value as any }))}
                                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 text-xs"
                              >
                                <option value="rcc">RCC (M20/25) Reinforced Drop Wall</option>
                                <option value="plum_concrete">Plum Concrete (M15 with 40% Boulders)</option>
                                <option value="stone_masonry">Random Rubble Stone Masonry (1:4)</option>
                              </select>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Pipe Culvert Inputs */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Pipe Dia (Ø)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={culvertParams.pipeDia}
                        onChange={(e) => setCulvertParams((p) => ({ ...p, pipeDia: Math.max(0.2, parseFloat(e.target.value) || 0) }))}
                        className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Pipe Count (N)</label>
                      <select
                        value={culvertParams.pipeCount}
                        onChange={(e) => setCulvertParams((p) => ({ ...p, pipeCount: parseInt(e.target.value) || 1 }))}
                        className="w-full p-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                      >
                        <option value={1}>1 Pipe</option>
                        <option value={2}>2 Pipes</option>
                        <option value={3}>3 Pipes</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex justify-between">
                      <span>Pipe Wall Thickness (m)</span>
                      <span className="font-mono text-indigo-700 font-extrabold">{culvertParams.pipeWallThickness} m</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={culvertParams.pipeWallThickness}
                      onChange={(e) => setCulvertParams((p) => ({ ...p, pipeWallThickness: Math.max(0.02, parseFloat(e.target.value) || 0) }))}
                      className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex justify-between">
                      <span>Bedding Depth (m)</span>
                      <span className="font-mono text-indigo-700 font-extrabold">{culvertParams.beddingDepth} m</span>
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={culvertParams.beddingDepth}
                      onChange={(e) => setCulvertParams((p) => ({ ...p, beddingDepth: Math.max(0.05, parseFloat(e.target.value) || 0) }))}
                      className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* PROTECTION WALL PARAMETERS & ASSEMBLY MAPPING INPUTS */}
          {category === 'protection_wall' && (
            <div className="space-y-3 text-xs">
              {/* Accordion Panel 3: Wall Dimensions & Core Geometry */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-xs">
                <button
                  type="button"
                  onClick={() => togglePanel('wall_dimensions')}
                  className="w-full p-2.5 flex items-center justify-between gap-2 text-left group hover:opacity-85 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                      🧱
                    </div>
                    <span className="font-extrabold text-xs text-slate-900 truncate">
                      Wall Dimensions & Geometry
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                      H={protectionWallParams.wallHeight}m • L={protectionWallParams.wallLength}m
                    </span>
                    <div className="p-0.5 rounded text-slate-400 group-hover:text-slate-700">
                      {collapsedPanels.wall_dimensions ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </button>

                {!collapsedPanels.wall_dimensions && (
                  <div className="p-3 pt-0 space-y-2.5 border-t border-slate-200 mt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Top Width (W_top)</label>
                        <input
                          type="number"
                          step="0.05"
                          value={protectionWallParams.wallTopWidth}
                          onChange={(e) => handleUpdateProtectionWallParam('wallTopWidth', parseFloat(e.target.value) || 0, true)}
                          className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Bottom Width (W_bot)</label>
                        <input
                          type="number"
                          step="0.05"
                          value={protectionWallParams.wallBottomWidth}
                          onChange={(e) => handleUpdateProtectionWallParam('wallBottomWidth', parseFloat(e.target.value) || 0, true)}
                          className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Wall Height (H)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={protectionWallParams.wallHeight}
                          onChange={(e) => handleUpdateProtectionWallParam('wallHeight', parseFloat(e.target.value) || 0, true)}
                          className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Section Length (L)</label>
                        <input
                          type="number"
                          step="1"
                          value={protectionWallParams.wallLength}
                          onChange={(e) => handleUpdateProtectionWallParam('wallLength', parseFloat(e.target.value) || 0, true)}
                          className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion Panel 4: RCC SPECIFIC: Bed Slab, Height Configuration & Joint Fillet Haunches */}
              {(wallType === 'rcc_l_wall' || wallType === 'rcc_cantilever' || wallType === 'custom_wall') && (
                <div className="bg-gradient-to-br from-indigo-50/90 to-blue-50/80 border border-indigo-200 rounded-xl transition-all shadow-xs">
                  <button
                    type="button"
                    onClick={() => togglePanel('rcc_bed_geometry')}
                    className="w-full p-2.5 flex items-center justify-between gap-2 text-left group hover:opacity-85 transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-md bg-indigo-200 text-indigo-900 flex items-center justify-center font-bold text-[10px]">
                        🏗️
                      </div>
                      <span className="font-extrabold text-xs text-indigo-950 truncate">
                        RCC Bed Slab & Haunches
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-indigo-200 text-indigo-800">
                        {protectionWallParams.rccWallConfigType === 'lower_flush_base'
                          ? 'Lower Flush Base'
                          : 'Toe & Heel Slab'}
                      </span>
                      <div className="p-0.5 rounded text-indigo-400 group-hover:text-indigo-700">
                        {collapsedPanels.rcc_bed_geometry ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </button>

                  {!collapsedPanels.rcc_bed_geometry && (
                    <div className="p-3 pt-0 space-y-2.5 border-t border-indigo-200/70 mt-1">
                      {/* Height Profile Preset Switcher */}
                      <div>
                        <label className="block font-extrabold text-slate-800 text-[10px] mb-1">
                          Structural Height Profile / Geometry:
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const botW = protectionWallParams.wallBottomWidth || 0.40;
                              handleUpdateProtectionWallParam('rccWallConfigType', 'higher_cantilever_toe_heel', true);
                              handleUpdateProtectionWallParam('toeLength', 0.50, true);
                              handleUpdateProtectionWallParam('heelLength', 1.30, true);
                              handleUpdateProtectionWallParam('baseSlabWidth', parseFloat((botW + 1.80).toFixed(2)), true);
                              handleUpdateProtectionWallParam('baseSlabThickness', 0.35, true);
                              handleUpdateProtectionWallParam('wallAlignmentOnPcc', 'centered', true);
                              handleUpdateProtectionWallParam('concreteGrade', 'RCC (M20/25)', true);
                              handleUpdateProtectionWallParam('hasFillet', true, true);
                              showToast('Switched to Higher Height RCC Wall (Toe & Heel Slab)!');
                            }}
                            className={`p-1.5 rounded-lg text-[10px] font-bold text-left border transition flex flex-col gap-0.5 ${
                              protectionWallParams.rccWallConfigType !== 'lower_flush_base'
                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span className="font-extrabold">Higher Height</span>
                            <span className="text-[9px] opacity-90">Toe & Heel Slab (Cantilever)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const botW = protectionWallParams.wallBottomWidth || 0.40;
                              handleUpdateProtectionWallParam('rccWallConfigType', 'lower_flush_base', true);
                              handleUpdateProtectionWallParam('toeLength', 0, true);
                              handleUpdateProtectionWallParam('heelLength', 0.20, true);
                              handleUpdateProtectionWallParam('baseSlabWidth', parseFloat((botW + 0.20).toFixed(2)), true);
                              handleUpdateProtectionWallParam('baseSlabThickness', 0.25, true);
                              handleUpdateProtectionWallParam('wallAlignmentOnPcc', 'flush_back', true);
                              handleUpdateProtectionWallParam('concreteGrade', 'PCC/RCC (M15/20)', true);
                              handleUpdateProtectionWallParam('hasFillet', true, true);
                              showToast('Switched to Lower Height RCC Wall (Flush Back Base, No Toe, Bed Slab + Fillet)!');
                            }}
                            className={`p-1.5 rounded-lg text-[10px] font-bold text-left border transition flex flex-col gap-0.5 ${
                              protectionWallParams.rccWallConfigType === 'lower_flush_base'
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span className="font-extrabold">Lower Height</span>
                            <span className="text-[9px] opacity-90">No Toe (Flush Back Base + Fillet)</span>
                          </button>
                        </div>
                      </div>

                      {/* Bed Slab Dimension Inputs */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block font-bold text-slate-700 text-[10px] mb-1">
                            Bed Slab Width (B)
                          </label>
                          <input
                            type="number"
                            step="0.05"
                            value={protectionWallParams.baseSlabWidth || (protectionWallParams.rccWallConfigType === 'lower_flush_base' ? 0.60 : 2.20)}
                            onChange={(e) => handleUpdateProtectionWallParam('baseSlabWidth', parseFloat(e.target.value) || 0, true)}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 text-[10px] mb-1">
                            Bed Slab Thickness (Tb)
                          </label>
                          <input
                            type="number"
                            step="0.025"
                            value={protectionWallParams.baseSlabThickness || (protectionWallParams.rccWallConfigType === 'lower_flush_base' ? 0.25 : 0.35)}
                            onChange={(e) => handleUpdateProtectionWallParam('baseSlabThickness', parseFloat(e.target.value) || 0, true)}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold text-slate-700 text-[10px] mb-1">
                            Toe Projection (L_toe)
                          </label>
                          <input
                            type="number"
                            step="0.05"
                            value={protectionWallParams.toeLength ?? (protectionWallParams.rccWallConfigType === 'lower_flush_base' ? 0 : 0.50)}
                            onChange={(e) => handleUpdateProtectionWallParam('toeLength', parseFloat(e.target.value) || 0, true)}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 text-[10px] mb-1">
                            Heel Length (L_heel)
                          </label>
                          <input
                            type="number"
                            step="0.05"
                            value={protectionWallParams.heelLength ?? (protectionWallParams.rccWallConfigType === 'lower_flush_base' ? 0.20 : 1.30)}
                            onChange={(e) => handleUpdateProtectionWallParam('heelLength', parseFloat(e.target.value) || 0, true)}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs"
                          />
                        </div>
                      </div>

                      {/* Joint Fillet / Triangular Haunch Options */}
                      <div className="pt-2 border-t border-indigo-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 font-bold text-slate-800 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!protectionWallParams.hasFillet}
                              onChange={(e) => handleUpdateProtectionWallParam('hasFillet', e.target.checked, true)}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>📐 Fillet / Haunch at Stem-Bed Joint</span>
                          </label>
                          {protectionWallParams.hasFillet && (
                            <span className="text-[10px] font-mono font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                              {((protectionWallParams.filletSize || 0.15) * 1000).toFixed(0)}mm
                            </span>
                          )}
                        </div>

                        {protectionWallParams.hasFillet && (
                          <div className="grid grid-cols-2 gap-2 bg-white p-2 rounded-lg border border-indigo-200">
                            <div>
                              <label className="block font-bold text-slate-700 text-[10px] mb-1">
                                Fillet Size (m)
                              </label>
                              <input
                                type="number"
                                step="0.025"
                                value={protectionWallParams.filletSize || 0.15}
                                onChange={(e) => handleUpdateProtectionWallParam('filletSize', parseFloat(e.target.value) || 0, true)}
                                className="w-full p-1 border border-slate-300 rounded font-mono font-bold text-slate-900 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-700 text-[10px] mb-1">
                                Fillet Placement
                              </label>
                              <select
                                value={protectionWallParams.filletLocation || 'front'}
                                onChange={(e) => handleUpdateProtectionWallParam('filletLocation', e.target.value as any, true)}
                                className="w-full p-1 border border-slate-300 rounded font-bold text-slate-800 text-xs"
                              >
                                <option value="front">Front Face Joint</option>
                                <option value="back">Back Face Joint</option>
                                <option value="both">Both Faces</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Accordion Panel 4.5: Brick & Stone Masonry Finishes (Plaster & Punning Heights) */}
              {(wallType === 'brick_masonry' || wallType === 'stone_masonry') && (
                <div className="bg-orange-50/70 border border-orange-200 rounded-xl transition-all shadow-xs">
                  <button
                    type="button"
                    onClick={() => togglePanel('masonry_finishes')}
                    className="w-full p-2.5 flex items-center justify-between gap-2 text-left group hover:opacity-85 transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-md bg-orange-200 text-orange-900 flex items-center justify-center font-bold text-[10px]">
                        🎨
                      </div>
                      <span className="font-extrabold text-xs text-orange-950 truncate">
                        Masonry Finishes: Plaster & Punning
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-orange-200 text-orange-800">
                        Hp={protectionWallParams.plasterHeight ?? protectionWallParams.wallHeight}m • Hpun={protectionWallParams.punningHeight ?? protectionWallParams.wallHeight}m
                      </span>
                      <div className="p-0.5 rounded text-orange-400 group-hover:text-orange-700">
                        {collapsedPanels.masonry_finishes ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </button>

                  {!collapsedPanels.masonry_finishes && (
                    <div className="p-3 pt-0 space-y-2.5 border-t border-orange-200/70 mt-1">
                      <div className="text-[11px] text-orange-950 font-medium bg-white p-2 rounded-lg border border-orange-200">
                        <span className="font-bold">Provision for Punning & Plaster Heights:</span> Default is the full height of the wall ({(protectionWallParams.wallHeight).toFixed(2)}m). Enter custom heights if finishes cover a specific elevation.
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1 text-[11px] flex justify-between">
                            <span>Plaster Height (Hp)</span>
                            <span className="font-mono text-orange-800 font-bold">
                              {(protectionWallParams.plasterHeight ?? protectionWallParams.wallHeight).toFixed(2)} m
                            </span>
                          </label>
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            value={protectionWallParams.plasterHeight ?? protectionWallParams.wallHeight}
                            onChange={(e) => handleUpdateProtectionWallParam('plasterHeight', Math.max(0, parseFloat(e.target.value) || 0), true)}
                            className="w-full p-2 bg-white border border-orange-300 rounded-xl font-mono font-bold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1 text-[11px] flex justify-between">
                            <span>Punning Height (Hpun)</span>
                            <span className="font-mono text-orange-800 font-bold">
                              {(protectionWallParams.punningHeight ?? protectionWallParams.wallHeight).toFixed(2)} m
                            </span>
                          </label>
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            value={protectionWallParams.punningHeight ?? protectionWallParams.wallHeight}
                            onChange={(e) => handleUpdateProtectionWallParam('punningHeight', Math.max(0, parseFloat(e.target.value) || 0), true)}
                            className="w-full p-2 bg-white border border-orange-300 rounded-xl font-mono font-bold text-slate-900"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1 text-[11px]">Plaster Thickness (m)</label>
                          <input
                            type="number"
                            step="0.0025"
                            min="0.005"
                            value={protectionWallParams.plasterThickness ?? 0.0125}
                            onChange={(e) => handleUpdateProtectionWallParam('plasterThickness', parseFloat(e.target.value) || 0.0125, true)}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1 text-[11px]">Mortar Ratio</label>
                          <select
                            value={protectionWallParams.brickMortarRatio || '1:4'}
                            onChange={(e) => handleUpdateProtectionWallParam('brickMortarRatio', e.target.value, true)}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 text-xs"
                          >
                            <option value="1:4">1:4 Cement Sand</option>
                            <option value="1:6">1:6 Cement Sand</option>
                            <option value="1:3">1:3 Cement Sand</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Accordion Panel 5: Bed & Foundation Layers (PCC & Soling) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-xs">
                <button
                  type="button"
                  onClick={() => togglePanel('foundation_layers')}
                  className="w-full p-2.5 flex items-center justify-between gap-2 text-left group hover:opacity-85 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">
                      🪨
                    </div>
                    <span className="font-extrabold text-xs text-slate-900 truncate">
                      Bed & Foundation Layers
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                      PCC: {protectionWallParams.pccWidth}m • Soling: {protectionWallParams.solingWidth}m
                    </span>
                    <div className="p-0.5 rounded text-slate-400 group-hover:text-slate-700">
                      {collapsedPanels.foundation_layers ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </button>

                {!collapsedPanels.foundation_layers && (
                  <div className="p-3 pt-0 space-y-2.5 border-t border-slate-200 mt-1">
                    <div className="bg-white p-2 rounded-xl border border-slate-200">
                      <label className="block font-extrabold text-slate-800 text-xs mb-1">
                        Wall Position on Total P.C.C. Bed:
                      </label>
                      <select
                        value={protectionWallParams.wallAlignmentOnPcc || 'flush_back'}
                        onChange={(e) => handleUpdateProtectionWallParam('wallAlignmentOnPcc', e.target.value as any, true)}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 text-xs"
                      >
                        <option value="flush_back">One Side of Total P.C.C. (Flush Back Face) [Default]</option>
                        <option value="centered">Centered on P.C.C. Bed</option>
                        <option value="flush_front">One Side of Total P.C.C. (Flush Front Face)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 flex justify-between">
                          <span>PCC Bed Width</span>
                          {protectionWallParams.manualOverrides.pccWidth && (
                            <button onClick={() => handleResetOverride('pccWidth')} className="text-[10px] text-indigo-600 underline">Reset</button>
                          )}
                        </label>
                        <input
                          type="number"
                          step="0.05"
                          value={protectionWallParams.pccWidth}
                          onChange={(e) => handleUpdateProtectionWallParam('pccWidth', parseFloat(e.target.value) || 0, true)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">PCC Thickness</label>
                        <input
                          type="number"
                          step="0.025"
                          value={protectionWallParams.pccThickness}
                          onChange={(e) => handleUpdateProtectionWallParam('pccThickness', parseFloat(e.target.value) || 0, true)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 flex justify-between">
                          <span>Soling Width</span>
                          {protectionWallParams.manualOverrides.solingWidth && (
                            <button onClick={() => handleResetOverride('solingWidth')} className="text-[10px] text-indigo-600 underline">Reset</button>
                          )}
                        </label>
                        <input
                          type="number"
                          step="0.05"
                          value={protectionWallParams.solingWidth}
                          onChange={(e) => handleUpdateProtectionWallParam('solingWidth', parseFloat(e.target.value) || 0, true)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Soling Thickness</label>
                        <input
                          type="number"
                          step="0.025"
                          value={protectionWallParams.solingThickness}
                          onChange={(e) => handleUpdateProtectionWallParam('solingThickness', parseFloat(e.target.value) || 0, true)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion Panel 6: Derived Excavation & Formwork */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-xs">
                <button
                  type="button"
                  onClick={() => togglePanel('excavation_formwork')}
                  className="w-full p-2.5 flex items-center justify-between gap-2 text-left group hover:opacity-85 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                      ⛏️
                    </div>
                    <span className="font-extrabold text-xs text-slate-900 truncate">
                      Derived Excavation & Formwork
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                      Exc: {protectionWallParams.excavationWidth}×{protectionWallParams.excavationDepth}m
                    </span>
                    <div className="p-0.5 rounded text-slate-400 group-hover:text-slate-700">
                      {collapsedPanels.excavation_formwork ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </button>

                {!collapsedPanels.excavation_formwork && (
                  <div className="p-3 pt-0 space-y-2.5 border-t border-slate-200 mt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 flex justify-between">
                          <span>Exc. Pit Width</span>
                          {protectionWallParams.manualOverrides.excavationWidth && (
                            <button onClick={() => handleResetOverride('excavationWidth')} className="text-[10px] text-indigo-600 underline">Reset</button>
                          )}
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={protectionWallParams.excavationWidth}
                          onChange={(e) => handleUpdateProtectionWallParam('excavationWidth', parseFloat(e.target.value) || 0, true)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 flex justify-between">
                          <span>Exc. Pit Depth</span>
                          {protectionWallParams.manualOverrides.excavationDepth && (
                            <button onClick={() => handleResetOverride('excavationDepth')} className="text-[10px] text-indigo-600 underline">Reset</button>
                          )}
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={protectionWallParams.excavationDepth}
                          onChange={(e) => handleUpdateProtectionWallParam('excavationDepth', parseFloat(e.target.value) || 0, true)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1 font-mono text-[11px]">
                      <div className="font-sans font-extrabold text-indigo-950 flex justify-between items-center">
                        <span>🪵 Derived Formwork Area</span>
                        <span className="text-indigo-700 font-extrabold">{protectionWallParams.formworkArea} m²</span>
                      </div>
                      <div className="text-slate-600 flex justify-between">
                        <span>Sloped Form Height: {protectionWallParams.formworkHeight} m</span>
                        <span>Sides: {protectionWallParams.formworkSides}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-slate-700 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={protectionWallParams.weepHoles}
                          onChange={(e) => handleUpdateProtectionWallParam('weepHoles', e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Render PVC Weep Holes</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Accordion Panel 7: Canvas Display & Theme Options */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-xs">
            <button
              type="button"
              onClick={() => togglePanel('display_options')}
              className="w-full p-2.5 flex items-center justify-between gap-2 text-left group hover:opacity-85 transition"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-md bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-[10px]">
                  🎨
                </div>
                <span className="font-extrabold text-xs text-slate-900 truncate">
                  Display & Theme Options
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 capitalize">
                  {canvasTheme} Mode • Dims {showDimensions ? 'ON' : 'OFF'}
                </span>
                <div className="p-0.5 rounded text-slate-400 group-hover:text-slate-700">
                  {collapsedPanels.display_options ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </div>
              </div>
            </button>

            {!collapsedPanels.display_options && (
              <div className="p-3 pt-0 space-y-2.5 border-t border-slate-200 mt-1">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCanvasTheme(canvasTheme === 'cad' ? 'paper' : canvasTheme === 'paper' ? 'blueprint' : 'cad')}
                    className="p-2 border rounded-xl font-bold flex items-center justify-center gap-1.5 bg-white text-slate-800 shadow-xs"
                  >
                    {canvasTheme === 'cad' ? <Moon className="w-3.5 h-3.5 text-amber-500" /> : <Sun className="w-3.5 h-3.5 text-blue-600" />}
                    <span className="capitalize">{canvasTheme} Mode</span>
                  </button>

                  <button
                    onClick={() => setShowDimensions(!showDimensions)}
                    className={`p-2 border rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-xs ${
                      showDimensions ? 'bg-indigo-50 border-indigo-300 text-indigo-800' : 'bg-white text-slate-500'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Dimensions</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 bg-white p-2.5 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-1.5 text-slate-600 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showHatching}
                      onChange={(e) => setShowHatching(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Hatching</span>
                  </label>

                  <label className="flex items-center gap-1.5 text-slate-600 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showGrid}
                      onChange={(e) => setShowGrid(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Grid</span>
                  </label>

                  <label className="flex items-center gap-1.5 text-slate-600 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showTitleBlock}
                      onChange={(e) => setShowTitleBlock(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Title Block</span>
                  </label>

                  <label className="flex items-center gap-1.5 text-slate-600 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLegend}
                      onChange={(e) => setShowLegend(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Legend</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: CAD Viewport & Vector Drawing Canvas */}
        <div className="lg:col-span-8 space-y-3">
          {/* CAD SECTIONS MANAGER TOOLBAR (Provision for Sections 1-1, 2-2, 3-3... across all categories) */}
          <div className="bg-slate-900 border-2 border-indigo-500/40 rounded-2xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-3 text-white print:hidden mb-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 bg-sky-950/80 border border-sky-800/80 px-2.5 py-1.5 rounded-xl">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>CAD SECTIONS:</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                {wallSections.map((sec) => {
                  const isActive = sec.id === activeSectionId;
                  return (
                    <div
                      key={sec.id}
                      className={`flex items-center rounded-lg transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600 via-sky-600 to-blue-600 text-white shadow-md ring-2 ring-sky-400/50'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectSection(sec.id)}
                        className="px-3 py-1.5 text-xs font-black flex items-center gap-2"
                      >
                        <span>{sec.sectionCode}</span>
                        <span className="text-[10px] font-mono opacity-85">
                          (H={sec.params.wallHeight}m)
                        </span>
                      </button>
                      {isActive && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRenameSection(sec.id);
                          }}
                          className="pr-2 pl-0.5 text-sky-200 hover:text-white transition"
                          title={`Rename ${sec.sectionCode}`}
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => handleStartRenameSection(activeSectionId)}
                  className="px-2 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/60 text-indigo-300 border border-indigo-500/50 rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-xs"
                  title="Rename active drawing section code & title"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Rename</span>
                </button>

                <button
                  onClick={handleAddSection}
                  className="px-2.5 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/60 text-emerald-300 border border-emerald-500/50 rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-sm"
                  title="Provision New Section (Section 4-4...)"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Section</span>
                </button>
              </div>
            </div>

            {/* Section Details & Alignment on PCC Control / Culvert View Modes */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {category === 'culvert' && culvertType === 'slab_culvert' && (
                <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCulvertParams((p) => ({ ...p, culvertViewMode: 'cross_section' }))}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition ${
                      (!culvertParams.culvertViewMode || culvertParams.culvertViewMode === 'cross_section')
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Cross-Section
                  </button>
                  <button
                    type="button"
                    onClick={() => setCulvertParams((p) => ({ ...p, culvertViewMode: 'longitudinal' }))}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition ${
                      culvertParams.culvertViewMode === 'longitudinal'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Longitudinal
                  </button>
                  <button
                    type="button"
                    onClick={() => setCulvertParams((p) => ({ ...p, culvertViewMode: 'plan_wingwalls' }))}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition ${
                      culvertParams.culvertViewMode === 'plan_wingwalls'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Plan & Wings
                  </button>
                </div>
              )}

              {category === 'protection_wall' && (
                <div className="flex items-center gap-2 bg-slate-950/90 px-2.5 py-1 rounded-xl border border-slate-800">
                  <span className="text-slate-400 font-bold text-[11px]">Wall Position on PCC:</span>
                  <select
                    value={protectionWallParams.wallAlignmentOnPcc || 'flush_back'}
                    onChange={(e) => handleUpdateProtectionWallParam('wallAlignmentOnPcc', e.target.value as any, true)}
                    className="bg-slate-900 border border-indigo-500/60 text-emerald-400 font-black px-2 py-1 rounded-lg focus:outline-none text-xs"
                  >
                    <option value="flush_back">One Side (Flush Back Face) [Default]</option>
                    <option value="centered">Centered on P.C.C.</option>
                    <option value="flush_front">One Side (Flush Front Face)</option>
                  </select>
                </div>
              )}

              {wallSections.length > 1 && (
                <button
                  onClick={() => handleDeleteSection(activeSectionId)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-950/60 p-1.5 rounded-lg border border-red-900/40 transition"
                  title="Delete active section"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div
            ref={canvasContainerRef}
            className={`relative rounded-2xl border-2 shadow-xl p-2 overflow-hidden transition-colors duration-300 select-none ${
              canvasTheme === 'cad'
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : canvasTheme === 'blueprint'
                ? 'bg-blue-900 border-blue-700 text-white'
                : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            {/* CAD Live-Sync Active Badge Overlay */}
            <div className="absolute top-4 left-4 z-10 print:hidden">
              <button
                onClick={() => {
                  setLiveSyncTarget((curr) => {
                    if (curr === 'estimate_mb') return 'valuation_mb';
                    if (curr === 'valuation_mb') return 'disabled';
                    return 'estimate_mb';
                  });
                }}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-2 border backdrop-blur-md shadow-lg transition-all ${
                  liveSyncTarget === 'estimate_mb'
                    ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-400 hover:bg-indigo-900/90'
                    : liveSyncTarget === 'valuation_mb'
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/90'
                    : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:bg-slate-800/90'
                }`}
                title="Click to cycle Live-Sync Target: Estimate MB -> Valuation MB -> Off"
              >
                <span className={`w-2.5 h-2.5 rounded-full ${
                  liveSyncTarget === 'estimate_mb'
                    ? 'bg-indigo-400 animate-pulse'
                    : liveSyncTarget === 'valuation_mb'
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-slate-500'
                }`} />
                <span>
                  ⚡ CAD Live-Sync: {
                    liveSyncTarget === 'estimate_mb'
                      ? 'ESTIMATE MB'
                      : liveSyncTarget === 'valuation_mb'
                      ? 'VALUATION MB'
                      : 'PAUSED'
                  }
                </span>
              </button>
            </div>

            {/* Viewport Zoom & Pan Floating Controls Toolbar */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 text-white text-xs shadow-lg print:hidden">
              <button
                onClick={() => setZoomLevel((z) => Math.min(3.0, z + 0.15))}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.15))}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setZoomLevel(1.0);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition font-mono font-bold"
                title="Reset Zoom & Pan"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <span className="font-mono text-[11px] font-extrabold px-1 text-amber-400">
                {Math.round(zoomLevel * 100)}%
              </span>
            </div>

            {/* Interactive On-Canvas CAD Dimension Input Overlay */}
            <CADCanvasOnDrawingOverlay
              fields={activeCADTemplate.dimensionFields}
              values={activeParamValues}
              onUpdateValue={handleUpdateOverlayDimension}
              liveSyncEnabled={liveSyncTarget !== 'disabled'}
              category={category}
            />

            {/* SVG CANVAS CONTAINER */}
            <div
              className="w-full flex items-center justify-center min-h-[540px] cursor-grab active:cursor-grabbing overflow-hidden"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <svg
                ref={svgRef}
                viewBox="0 0 900 620"
                className="w-full h-auto max-w-[900px] select-none"
                style={{
                  backgroundColor: themeColors.bg,
                  transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                  transformOrigin: 'center center'
                }}
              >
                {/* SVG HATCH DEFS */}
                <DrawingHatchDefs
                  canvasTheme={canvasTheme}
                  showGrid={showGrid}
                  gridColor={themeColors.grid}
                  dimLineColor={themeColors.dimLine}
                />

                {/* BACKGROUND GRID */}
                {showGrid && <rect width="900" height="620" fill="url(#cadGrid)" />}

                {/* ========================================================= */}
                {/* 1. DRAIN SECTION DRAWING RENDERER */}
                {/* ========================================================= */}
                {category === 'drain' && (
                  <g id="drainGroup" transform="translate(60, 30)">
                    {/* 1. R.C.C RECTANGULAR DRAIN */}
                    {(drainType === 'rcc_rectangular' || drainType === 'rectangular') && (() => {
                      const scale = cadTakeoffMetrics.calculatedScale;

                      const pxW = drainParams.invertWidth * scale;
                      const pxH = drainParams.depth * scale;
                      const pxTw = (drainParams.wallThickness || 0.20) * scale;
                      const pxTb = (drainParams.baseThickness || 0.20) * scale;
                      const pxTc = (drainParams.hasCoverSlab ? (drainParams.coverSlabThickness || 0.10) : 0) * scale;
                      const pxPcc = 0.10 * scale;
                      const pxSoling = 0.15 * scale;
                      const pxOffset = 0.10 * scale;
                      const pxF = (drainParams.freeboard || 0.15) * scale;
                      const pxWater = (drainParams.waterDepth || 0.50) * scale;

                      const cx = 390;
                      const topWallY = 130;

                      // Cover Slab Coordinates
                      const coverTopY = topWallY - pxTc;
                      const outerLeftX = cx - pxW / 2 - pxTw;
                      const outerRightX = cx + pxW / 2 + pxTw;
                      const innerLeftX = cx - pxW / 2;
                      const innerRightX = cx + pxW / 2;

                      const invertY = topWallY + pxH;
                      const bottomBedY = invertY + pxTb;
                      const bottomPccY = bottomBedY + pxPcc;
                      const bottomSolingY = bottomPccY + pxSoling;

                      const pccLeftX = outerLeftX - pxOffset;
                      const pccRightX = outerRightX + pxOffset;
                      const trenchLeftX = pccLeftX - 30;
                      const trenchRightX = pccRightX + 30;

                      return (
                        <g>
                          {/* Earthwork Excavation Trench Boundary */}
                          <path
                            d={`M ${trenchLeftX - 60} ${topWallY} L ${trenchLeftX} ${topWallY} L ${trenchLeftX} ${bottomSolingY + 20} L ${trenchRightX} ${bottomSolingY + 20} L ${trenchRightX} ${topWallY} L ${trenchRightX + 60} ${topWallY} L ${trenchRightX + 60} ${bottomSolingY + 50} L ${trenchLeftX - 60} ${bottomSolingY + 50} Z`}
                            fill={showHatching ? 'url(#earthHatch)' : themeColors.earthFill}
                            opacity="0.45"
                          />

                          {/* Flat Brick / Stone Soling Bedding */}
                          <rect
                            x={pccLeftX}
                            y={bottomPccY}
                            width={pccRightX - pccLeftX}
                            height={pxSoling}
                            fill={showHatching ? 'url(#solingHatch)' : '#d97706'}
                            stroke={themeColors.line}
                            strokeWidth="1.5"
                          />

                          {/* PCC (M10) Leveling Bedding Layer */}
                          <rect
                            x={pccLeftX}
                            y={bottomBedY}
                            width={pccRightX - pccLeftX}
                            height={pxPcc}
                            fill={showHatching ? 'url(#concreteHatch)' : themeColors.concreteFill}
                            stroke={themeColors.line}
                            strokeWidth="1.5"
                          />

                          {/* Structural RCC M20 Drain Channel (Bed + 2 Walls) */}
                          <path
                            d={`M ${outerLeftX} ${topWallY} L ${outerRightX} ${topWallY} L ${outerRightX} ${bottomBedY} L ${outerLeftX} ${bottomBedY} Z
                               M ${innerLeftX} ${topWallY} L ${innerRightX} ${topWallY} L ${innerRightX} ${invertY} L ${innerLeftX} ${invertY} Z`}
                            fillRule="evenodd"
                            fill={showHatching ? 'url(#rccHatch)' : themeColors.concreteFill}
                            stroke={themeColors.line}
                            strokeWidth="2.5"
                          />

                          {/* Rebar Dots & Reinforcement Ties */}
                          <g id="rccRebarDots" opacity="0.85">
                            {/* Wall Left Rebar */}
                            <circle cx={outerLeftX + pxTw * 0.3} cy={topWallY + 15} r="2.5" fill="#38bdf8" />
                            <circle cx={outerLeftX + pxTw * 0.7} cy={topWallY + 15} r="2.5" fill="#38bdf8" />
                            <circle cx={outerLeftX + pxTw * 0.3} cy={topWallY + pxH * 0.5} r="2.5" fill="#38bdf8" />
                            <circle cx={outerLeftX + pxTw * 0.7} cy={topWallY + pxH * 0.5} r="2.5" fill="#38bdf8" />
                            {/* Wall Right Rebar */}
                            <circle cx={outerRightX - pxTw * 0.3} cy={topWallY + 15} r="2.5" fill="#38bdf8" />
                            <circle cx={outerRightX - pxTw * 0.7} cy={topWallY + 15} r="2.5" fill="#38bdf8" />
                            <circle cx={outerRightX - pxTw * 0.3} cy={topWallY + pxH * 0.5} r="2.5" fill="#38bdf8" />
                            <circle cx={outerRightX - pxTw * 0.7} cy={topWallY + pxH * 0.5} r="2.5" fill="#38bdf8" />
                            {/* Bed Slab Rebar */}
                            <circle cx={innerLeftX + pxW * 0.25} cy={invertY + pxTb * 0.5} r="2.5" fill="#38bdf8" />
                            <circle cx={innerLeftX + pxW * 0.5} cy={invertY + pxTb * 0.5} r="2.5" fill="#38bdf8" />
                            <circle cx={innerLeftX + pxW * 0.75} cy={invertY + pxTb * 0.5} r="2.5" fill="#38bdf8" />
                          </g>

                          {/* Removable Top RCC Cover Slab (Optional) */}
                          {(drainParams.hasCoverSlab ?? true) && (
                            <g id="coverSlabGroup">
                              <rect
                                x={outerLeftX}
                                y={coverTopY}
                                width={outerRightX - outerLeftX}
                                height={pxTc}
                                fill={showHatching ? 'url(#concreteHatch)' : themeColors.concreteFill}
                                stroke={themeColors.line}
                                strokeWidth="2"
                                strokeDasharray="none"
                              />
                              {/* Slab Lifting Hook Holes */}
                              <circle cx={cx - pxW * 0.3} cy={coverTopY + pxTc / 2} r="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
                              <circle cx={cx + pxW * 0.3} cy={coverTopY + pxTc / 2} r="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
                              <text x={cx} y={coverTopY - 6} fill="#10b981" fontSize="10" fontWeight="extrabold" textAnchor="middle">
                                [Removable RCC M20 Cover Slab (Tc={(drainParams.coverSlabThickness || 0.10).toFixed(2)}m)]
                              </text>
                            </g>
                          )}

                          {/* Water Level Flow & Line */}
                          {pxWater > 0 && (
                            <g>
                              <rect
                                x={innerLeftX + 2}
                                y={invertY - pxWater}
                                width={pxW - 4}
                                height={pxWater}
                                fill="url(#waterHatch)"
                                opacity="0.85"
                              />
                              <path
                                d={`M ${innerLeftX + 2} ${invertY - pxWater} L ${innerRightX - 2} ${invertY - pxWater}`}
                                stroke="#38bdf8"
                                strokeWidth="2"
                                strokeDasharray="6 3"
                              />
                              <text x={cx} y={invertY - pxWater - 6} fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="bold">
                                ▼ Water Depth = {(drainParams.waterDepth || 0.50).toFixed(2)}m
                              </text>
                            </g>
                          )}

                          {/* DIMENSION CALLOUTS */}
                          {showDimensions && (
                            <g id="drainDimensions">
                              {/* Invert Clear Width B */}
                              <DimensionLine
                                x1={innerLeftX}
                                y1={invertY}
                                x2={innerRightX}
                                y2={invertY}
                                label="Clear B"
                                value={drainParams.invertWidth}
                                offset={28}
                                lineColor={themeColors.dimLine}
                                textColor={themeColors.dimText}
                                paramName="Invert Width"
                                onEditValue={(v) => setDrainParams((p) => ({ ...p, invertWidth: v }))}
                              />

                              {/* Internal Depth H */}
                              <DimensionLine
                                x1={innerRightX}
                                y1={topWallY}
                                x2={innerRightX}
                                y2={invertY}
                                label="Depth H"
                                value={drainParams.depth}
                                offset={28}
                                orientation="vertical"
                                lineColor={themeColors.dimLine}
                                textColor={themeColors.dimText}
                                paramName="Internal Depth"
                                onEditValue={(v) => setDrainParams((p) => ({ ...p, depth: v }))}
                              />

                              {/* Wall Thickness Tw */}
                              <DimensionLine
                                x1={outerLeftX}
                                y1={topWallY}
                                x2={innerLeftX}
                                y2={topWallY}
                                label="Tw"
                                value={drainParams.wallThickness || 0.20}
                                offset={-24}
                                lineColor={themeColors.dimLine}
                                textColor={themeColors.dimText}
                                paramName="Wall Thickness"
                                onEditValue={(v) => setDrainParams((p) => ({ ...p, wallThickness: v }))}
                              />

                              {/* Base Slab Tb */}
                              <DimensionLine
                                x1={outerLeftX}
                                y1={invertY}
                                x2={outerLeftX}
                                y2={bottomBedY}
                                label="Tb"
                                value={drainParams.baseThickness || 0.20}
                                offset={-28}
                                orientation="vertical"
                                lineColor={themeColors.dimLine}
                                textColor={themeColors.dimText}
                                paramName="Base Thickness"
                                onEditValue={(v) => setDrainParams((p) => ({ ...p, baseThickness: v }))}
                              />
                            </g>
                          )}

                          {/* Section Labels & Layer Specs */}
                          <text x={cx} y={topWallY - ((drainParams.hasCoverSlab ?? true) ? 26 : 14)} fill={themeColors.titleText} fontSize="14" fontWeight="900" textAnchor="middle">
                            1. R.C.C RECTANGULAR DRAIN CROSS-SECTION
                          </text>
                          <text x={cx} y={bottomSolingY + 32} fill={themeColors.dimText} fontSize="10" fontWeight="bold" textAnchor="middle">
                            Excavation | Soling (150mm) | PCC M10 (100mm) | RCC M20 (Bed + Walls + Slab Cover) | Formwork
                          </text>
                        </g>
                      );
                    })()}

                    {/* 2. PLUM DRAIN (DIFFERENT ROAD & USER SIDE WALL WIDTHS) */}
                    {drainType === 'plum_drain' && (() => {
                      const scale = cadTakeoffMetrics.calculatedScale;

                      const pxW = drainParams.invertWidth * scale;
                      const pxH = drainParams.depth * scale;
                      const pxTwRoad = (drainParams.roadSideWallThickness || 0.35) * scale;
                      const pxTwUser = (drainParams.userSideWallThickness || 0.25) * scale;
                      const pxTb = (drainParams.baseThickness || 0.20) * scale;
                      const pxPcc = 0.10 * scale;
                      const pxSoling = 0.15 * scale;
                      const pxOffset = 0.10 * scale;
                      const pxWater = (drainParams.waterDepth || 0.50) * scale;

                      const cx = 390;
                      const topWallY = 120;

                      // Left = Road Side Wall, Right = User Side Wall
                      const outerRoadLeftX = cx - pxW / 2 - pxTwRoad;
                      const innerRoadLeftX = cx - pxW / 2;
                      const innerUserRightX = cx + pxW / 2;
                      const outerUserRightX = cx + pxW / 2 + pxTwUser;

                      const invertY = topWallY + pxH;
                      const bottomBedY = invertY + pxTb;
                      const bottomPccY = bottomBedY + pxPcc;
                      const bottomSolingY = bottomPccY + pxSoling;

                      const pccLeftX = outerRoadLeftX - pxOffset;
                      const pccRightX = outerUserRightX + pxOffset;
                      const trenchLeftX = pccLeftX - 25;
                      const trenchRightX = pccRightX + 25;

                      return (
                        <g>
                          {/* Earth Excavation Surround */}
                          <path
                            d={`M ${trenchLeftX - 60} ${topWallY} L ${trenchLeftX} ${topWallY} L ${trenchLeftX} ${bottomSolingY + 20} L ${trenchRightX} ${bottomSolingY + 20} L ${trenchRightX} ${topWallY} L ${trenchRightX + 60} ${topWallY} L ${trenchRightX + 60} ${bottomSolingY + 50} L ${trenchLeftX - 60} ${bottomSolingY + 50} Z`}
                            fill={showHatching ? 'url(#earthHatch)' : themeColors.earthFill}
                            opacity="0.45"
                          />

                          {/* Flat Stone / Boulder Soling */}
                          <rect
                            x={pccLeftX}
                            y={bottomPccY}
                            width={pccRightX - pccLeftX}
                            height={pxSoling}
                            fill={showHatching ? 'url(#solingHatch)' : '#d97706'}
                            stroke={themeColors.line}
                            strokeWidth="1.5"
                          />

                          {/* PCC M10 Leveling Base */}
                          <rect
                            x={pccLeftX}
                            y={bottomBedY}
                            width={pccRightX - pccLeftX}
                            height={pxPcc}
                            fill={showHatching ? 'url(#concreteHatch)' : themeColors.concreteFill}
                            stroke={themeColors.line}
                            strokeWidth="1.5"
                          />

                          {/* Plum Concrete Body (Bed Slab + Asymmetric Walls, or Direct Walls on PCC) */}
                          {pxTb > 0 ? (
                            <path
                              d={`M ${outerRoadLeftX} ${topWallY} L ${outerUserRightX} ${topWallY} L ${outerUserRightX} ${bottomBedY} L ${outerRoadLeftX} ${bottomBedY} Z
                                 M ${innerRoadLeftX} ${topWallY} L ${innerUserRightX} ${topWallY} L ${innerUserRightX} ${invertY} L ${innerRoadLeftX} ${invertY} Z`}
                              fillRule="evenodd"
                              fill={showHatching ? 'url(#plumHatch)' : themeColors.concreteFill}
                              stroke={themeColors.line}
                              strokeWidth="2.5"
                            />
                          ) : (
                            <g id="plumDirectWallsOnPcc">
                              {/* Road Side Plum Wall */}
                              <rect
                                x={outerRoadLeftX}
                                y={topWallY}
                                width={pxTwRoad}
                                height={pxH}
                                fill={showHatching ? 'url(#plumHatch)' : themeColors.concreteFill}
                                stroke={themeColors.line}
                                strokeWidth="2.5"
                              />
                              {/* User Side Plum Wall */}
                              <rect
                                x={innerUserRightX}
                                y={topWallY}
                                width={pxTwUser}
                                height={pxH}
                                fill={showHatching ? 'url(#plumHatch)' : themeColors.concreteFill}
                                stroke={themeColors.line}
                                strokeWidth="2.5"
                              />
                            </g>
                          )}

                          {/* Side Orientation Callouts */}
                          {/* Road Side (Left) Callout */}
                          <g transform={`translate(${outerRoadLeftX - 10}, ${topWallY - 8})`}>
                            <rect x="-105" y="-18" width="110" height="22" rx="4" fill="#0284c7" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="1" />
                            <text x="-50" y="-4" fill="#38bdf8" fontSize="10" fontWeight="900" textAnchor="middle">
                              ROAD SIDE (Tw={(drainParams.roadSideWallThickness || 0.35).toFixed(2)}m)
                            </text>
                          </g>

                          {/* User Side (Right) Callout */}
                          <g transform={`translate(${outerUserRightX + 10}, ${topWallY - 8})`}>
                            <rect x="-5" y="-18" width="110" height="22" rx="4" fill="#10b981" fillOpacity="0.2" stroke="#34d399" strokeWidth="1" />
                            <text x="50" y="-4" fill="#34d399" fontSize="10" fontWeight="900" textAnchor="middle">
                              USER SIDE (Tw={(drainParams.userSideWallThickness || 0.25).toFixed(2)}m)
                            </text>
                          </g>

                          {/* Water Level */}
                          {pxWater > 0 && (
                            <g>
                              <rect
                                x={innerRoadLeftX + 2}
                                y={invertY - pxWater}
                                width={pxW - 4}
                                height={pxWater}
                                fill="url(#waterHatch)"
                                opacity="0.85"
                              />
                              <path
                                d={`M ${innerRoadLeftX + 2} ${invertY - pxWater} L ${innerUserRightX - 2} ${invertY - pxWater}`}
                                stroke="#38bdf8"
                                strokeWidth="2"
                                strokeDasharray="6 3"
                              />
                              <text x={cx} y={invertY - pxWater - 6} fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="bold">
                                ▼ Water Depth = {(drainParams.waterDepth || 0.50).toFixed(2)}m
                              </text>
                            </g>
                          )}

                          {/* DIMENSION LINES */}
                          {showDimensions && (
                            <g id="plumDrainDimensions">
                              {/* Invert Clear Width B */}
                              <DimensionLine
                                x1={innerRoadLeftX}
                                y1={invertY}
                                x2={innerUserRightX}
                                y2={invertY}
                                label="Clear B"
                                value={drainParams.invertWidth}
                                offset={28}
                                lineColor={themeColors.dimLine}
                                textColor={themeColors.dimText}
                                paramName="Invert Width"
                                onEditValue={(v) => setDrainParams((p) => ({ ...p, invertWidth: v }))}
                              />

                              {/* Internal Depth H */}
                              <DimensionLine
                                x1={innerUserRightX}
                                y1={topWallY}
                                x2={innerUserRightX}
                                y2={invertY}
                                label="Depth H"
                                value={drainParams.depth}
                                offset={28}
                                orientation="vertical"
                                lineColor={themeColors.dimLine}
                                textColor={themeColors.dimText}
                                paramName="Internal Depth"
                                onEditValue={(v) => setDrainParams((p) => ({ ...p, depth: v }))}
                              />

                              {/* Road Side Wall Thickness */}
                              <DimensionLine
                                x1={outerRoadLeftX}
                                y1={topWallY}
                                x2={innerRoadLeftX}
                                y2={topWallY}
                                label="Tw_road"
                                value={drainParams.roadSideWallThickness || 0.35}
                                offset={-26}
                                lineColor={themeColors.dimLine}
                                textColor={themeColors.dimText}
                                paramName="Road Side Wall"
                                onEditValue={(v) => setDrainParams((p) => ({ ...p, roadSideWallThickness: v }))}
                              />

                              {/* User Side Wall Thickness */}
                              <DimensionLine
                                x1={innerUserRightX}
                                y1={topWallY}
                                x2={outerUserRightX}
                                y2={topWallY}
                                label="Tw_user"
                                value={drainParams.userSideWallThickness || 0.25}
                                offset={-26}
                                lineColor={themeColors.dimLine}
                                textColor={themeColors.dimText}
                                paramName="User Side Wall"
                                onEditValue={(v) => setDrainParams((p) => ({ ...p, userSideWallThickness: v }))}
                              />

                              {/* Bed Slab Tb (Only if Tb > 0) */}
                              {(drainParams.baseThickness || 0) > 0 && (
                                <DimensionLine
                                  x1={outerRoadLeftX}
                                  y1={invertY}
                                  x2={outerRoadLeftX}
                                  y2={bottomBedY}
                                  label="Tb"
                                  value={drainParams.baseThickness || 0.20}
                                  offset={-28}
                                  orientation="vertical"
                                  lineColor={themeColors.dimLine}
                                  textColor={themeColors.dimText}
                                  paramName="Plum Bed Thickness"
                                  onEditValue={(v) => setDrainParams((p) => ({ ...p, baseThickness: v }))}
                                />
                              )}
                            </g>
                          )}

                          <text x={cx} y={topWallY - 25} fill={themeColors.titleText} fontSize="14" fontWeight="900" textAnchor="middle">
                            2. PLUM CONCRETE DRAIN CROSS-SECTION
                          </text>
                          <text x={cx} y={bottomSolingY + 32} fill={themeColors.dimText} fontSize="10" fontWeight="bold" textAnchor="middle">
                            Excavation | Soling | PCC (M10) | Plum Concrete Wall ({drainParams.plumBoulderPercent ?? 40}% Boulders) | Formwork
                          </text>
                        </g>
                      );
                    })()}

                    {/* 3. BRICK MASONRY DRAIN (DIFFERENT ROAD & USER SIDE WALL WIDTHS + PLASTER & FULL HEIGHT PUNNING + TOP PCC) */}
                    {drainType === 'brick_masonry' && (() => {
                      const scale = cadTakeoffMetrics.calculatedScale;

                      const pxW = drainParams.invertWidth * scale;
                      const pxH = drainParams.depth * scale;
                      const pxTwRoad = (drainParams.roadSideWallThickness || 0.35) * scale;
                      const pxTwUser = (drainParams.userSideWallThickness || 0.23) * scale;
                      const pxTb = (drainParams.baseThickness || 0.15) * scale;
                      const pxTc = (drainParams.topPccThickness || 0.075) * scale;
                      const pxPcc = 0.10 * scale;
                      const pxSoling = 0.15 * scale;
                      const pxOffset = 0.10 * scale;
                      const pxWater = (drainParams.waterDepth || 0.50) * scale;

                      const cx = 390;
                      const topWallY = 120;
                      const topCopingY = topWallY - pxTc;

                      const outerRoadLeftX = cx - pxW / 2 - pxTwRoad;
                      const innerRoadLeftX = cx - pxW / 2;
                      const innerUserRightX = cx + pxW / 2;
                      const outerUserRightX = cx + pxW / 2 + pxTwUser;

                      const invertY = topWallY + pxH;
                      const bottomBedY = invertY + pxTb;
                      const bottomPccY = bottomBedY + pxPcc;
                      const bottomSolingY = bottomPccY + pxSoling;

                      const pccLeftX = outerRoadLeftX - pxOffset;
                      const pccRightX = outerUserRightX + pxOffset;
                      const trenchLeftX = pccLeftX - 25;
                      const trenchRightX = pccRightX + 25;

                      return (
                        <g>
                          {/* Earth Excavation Trench Surround */}
                          <path
                            d={`M ${trenchLeftX - 60} ${topWallY} L ${trenchLeftX} ${topWallY} L ${trenchLeftX} ${bottomSolingY + 20} L ${trenchRightX} ${bottomSolingY + 20} L ${trenchRightX} ${topWallY} L ${trenchRightX + 60} ${topWallY} L ${trenchRightX + 60} ${bottomSolingY + 50} L ${trenchLeftX - 60} ${bottomSolingY + 50} Z`}
                            fill={showHatching ? 'url(#earthHatch)' : themeColors.earthFill}
                            opacity="0.45"
                          />

                          {/* Flat Brick Soling Layer */}
                          <rect
                            x={pccLeftX}
                            y={bottomPccY}
                            width={pccRightX - pccLeftX}
                            height={pxSoling}
                            fill={showHatching ? 'url(#solingHatch)' : '#d97706'}
                            stroke={themeColors.line}
                            strokeWidth="1.5"
                          />

                          {/* Bed PCC (M10) Leveling Concrete */}
                          <rect
                            x={pccLeftX}
                            y={bottomBedY}
                            width={pccRightX - pccLeftX}
                            height={pxPcc}
                            fill={showHatching ? 'url(#concreteHatch)' : themeColors.concreteFill}
                            stroke={themeColors.line}
                            strokeWidth="1.5"
                          />

                          {/* Base Concrete Invert Bed */}
                          <rect
                            x={outerRoadLeftX}
                            y={invertY}
                            width={outerUserRightX - outerRoadLeftX}
                            height={pxTb}
                            fill={showHatching ? 'url(#concreteHatch)' : themeColors.concreteFill}
                            stroke={themeColors.line}
                            strokeWidth="2"
                          />

                          {/* Road Side Brick Wall */}
                          <rect
                            x={outerRoadLeftX}
                            y={topWallY}
                            width={pxTwRoad}
                            height={pxH}
                            fill={showHatching ? 'url(#brickHatch)' : '#ef4444'}
                            stroke={themeColors.line}
                            strokeWidth="2.5"
                          />

                          {/* User Side Brick Wall */}
                          <rect
                            x={innerUserRightX}
                            y={topWallY}
                            width={pxTwUser}
                            height={pxH}
                            fill={showHatching ? 'url(#brickHatch)' : '#ef4444'}
                            stroke={themeColors.line}
                            strokeWidth="2.5"
                          />

                          {/* Top PCC (1:2:4) Coping Band capping Road Wall */}
                          <rect
                            x={outerRoadLeftX}
                            y={topCopingY}
                            width={pxTwRoad}
                            height={pxTc}
                            fill={showHatching ? 'url(#concreteHatch)' : themeColors.concreteFill}
                            stroke={themeColors.line}
                            strokeWidth="1.8"
                          />

                          {/* Top PCC (1:2:4) Coping Band capping User Wall */}
                          <rect
                            x={innerUserRightX}
                            y={topCopingY}
                            width={pxTwUser}
                            height={pxTc}
                            fill={showHatching ? 'url(#concreteHatch)' : themeColors.concreteFill}
                            stroke={themeColors.line}
                            strokeWidth="1.8"
                          />

                          {/* FULL HEIGHT PLASTER & NEAT CEMENT PUNNING LINING (Girth: B + 2H) */}
                          <path
                            d={`M ${innerRoadLeftX} ${topWallY} L ${innerRoadLeftX} ${invertY} L ${innerUserRightX} ${invertY} L ${innerUserRightX} ${topWallY}`}
                            fill="none"
                            stroke="#06b6d4"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <text x={cx} y={invertY - 8} fill="#06b6d4" fontSize="10" fontWeight="extrabold" textAnchor="middle">
                            ★ Full Height Plaster & Neat Cement Punning (B + 2H)
                          </text>

                          {/* Side Markers */}
                          <g transform={`translate(${outerRoadLeftX - 10}, ${topCopingY - 8})`}>
                            <rect x="-105" y="-18" width="110" height="22" rx="4" fill="#0284c7" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="1" />
                            <text x="-50" y="-4" fill="#38bdf8" fontSize="10" fontWeight="900" textAnchor="middle">
                              ROAD SIDE ({(drainParams.roadSideWallThickness || 0.35).toFixed(2)}m)
                            </text>
                          </g>

                          <g transform={`translate(${outerUserRightX + 10}, ${topCopingY - 8})`}>
                            <rect x="-5" y="-18" width="110" height="22" rx="4" fill="#10b981" fillOpacity="0.2" stroke="#34d399" strokeWidth="1" />
                            <text x="50" y="-4" fill="#34d399" fontSize="10" fontWeight="900" textAnchor="middle">
                              USER SIDE ({(drainParams.userSideWallThickness || 0.23).toFixed(2)}m)
                            </text>
                          </g>

                          {/* Water Level */}
                          {pxWater > 0 && (
                            <g>
                              <rect
                                x={innerRoadLeftX + 4}
                                y={invertY - pxWater}
                                width={pxW - 8}
                                height={pxWater}
                                fill="url(#waterHatch)"
                                opacity="0.85"
                              />
                              <path
                                d={`M ${innerRoadLeftX + 4} ${invertY - pxWater} L ${innerUserRightX - 4} ${invertY - pxWater}`}
                                stroke="#38bdf8"
                                strokeWidth="2"
                                strokeDasharray="6 3"
                              />
                              <text x={cx} y={invertY - pxWater - 6} fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="bold">
                                ▼ Water Depth = {(drainParams.waterDepth || 0.50).toFixed(2)}m
                              </text>
                            </g>
                          )}

                          {/* DIMENSION LINES */}
                          {showDimensions && (
                            <g id="brickDrainDimensions">
                              {/* Invert Clear Width B */}
                              <DimensionLine
                                x1={innerRoadLeftX}
                                y1={invertY}
                                x2={innerUserRightX}
                                y2={invertY}
                                label="Clear B"
                                value={drainParams.invertWidth}
                                offset={28}
                                lineColor={themeColors.dimLine}
                                textColor={themeColors.dimText}
                                paramName="Invert Width"
                                onEditValue={(v) => setDrainParams((p) => ({ ...p, invertWidth: v }))}
                              />

                              {/* Internal Depth H */}
                              <DimensionLine
                                x1={innerUserRightX}
                                y1={topWallY}
                                x2={innerUserRightX}
                                y2={invertY}
                                label="Depth H"
                                value={drainParams.depth}
                                offset={28}
                                orientation="vertical"
                                lineColor={themeColors.dimLine}
                                textColor={themeColors.dimText}
                                paramName="Internal Depth"
                                onEditValue={(v) => setDrainParams((p) => ({ ...p, depth: v }))}
                              />

                              {/* Road Wall Width */}
                              <DimensionLine
                                x1={outerRoadLeftX}
                                y1={topWallY}
                                x2={innerRoadLeftX}
                                y2={topWallY}
                                label="Tw_road"
                                value={drainParams.roadSideWallThickness || 0.35}
                                offset={-26}
                                lineColor={themeColors.dimLine}
                                textColor={themeColors.dimText}
                                paramName="Road Side Brick Wall"
                                onEditValue={(v) => setDrainParams((p) => ({ ...p, roadSideWallThickness: v }))}
                              />

                              {/* User Wall Width */}
                              <DimensionLine
                                x1={innerUserRightX}
                                y1={topWallY}
                                x2={outerUserRightX}
                                y2={topWallY}
                                label="Tw_user"
                                value={drainParams.userSideWallThickness || 0.23}
                                offset={-26}
                                lineColor={themeColors.dimLine}
                                textColor={themeColors.dimText}
                                paramName="User Side Brick Wall"
                                onEditValue={(v) => setDrainParams((p) => ({ ...p, userSideWallThickness: v }))}
                              />

                              {/* Top PCC Coping */}
                              <DimensionLine
                                x1={outerRoadLeftX}
                                y1={topCopingY}
                                x2={outerRoadLeftX}
                                y2={topWallY}
                                label="Top PCC"
                                value={drainParams.topPccThickness || 0.075}
                                offset={-28}
                                orientation="vertical"
                                lineColor={themeColors.dimLine}
                                textColor={themeColors.dimText}
                                paramName="Top PCC Thickness"
                                onEditValue={(v) => setDrainParams((p) => ({ ...p, topPccThickness: v }))}
                              />
                            </g>
                          )}

                          <text x={cx} y={topCopingY - 26} fill={themeColors.titleText} fontSize="14" fontWeight="900" textAnchor="middle">
                            3. BRICK MASONRY DRAIN WITH FULL-HEIGHT PUNNING
                          </text>
                          <text x={cx} y={bottomSolingY + 32} fill={themeColors.dimText} fontSize="10" fontWeight="bold" textAnchor="middle">
                            Excavation | Soling | PCC (M10) | Brick Masonry (Road & User Side) | Plaster | Punning (Full Height) | Top PCC Coping
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                )}

                {/* ========================================================= */}
                {/* 2. ROAD CROSS-SECTION DRAWING RENDERER */}
                {/* ========================================================= */}
                {category === 'road' && (
                  <g id="roadGroup" transform="translate(50, 40)">
                    {(() => {
                      const scale = cadTakeoffMetrics.calculatedScale;

                      const cx = 400;
                      const crownY = 160;

                      const pxCw = roadParams.carriagewayWidth * scale;
                      const pxShL = roadParams.shoulderLeft * scale;
                      const pxShR = roadParams.shoulderRight * scale;

                      const isCrown = roadParams.camberType === 'crown';
                      const dropY = isCrown
                        ? (roadParams.carriagewayWidth / 2) * (roadParams.camberPercent / 100) * scale
                        : roadParams.carriagewayWidth * (roadParams.camberPercent / 100) * scale;

                      const edgeL_X = cx - pxCw / 2;
                      const edgeR_X = cx + pxCw / 2;

                      const crownPeakY = crownY;
                      const edgeL_Y = isCrown ? crownY + dropY : crownY;
                      const edgeR_Y = isCrown ? crownY + dropY : crownY + dropY;

                      const shL_X = edgeL_X - pxShL;
                      const shR_X = edgeR_X + pxShR;

                      const shL_Y = edgeL_Y + (roadParams.shoulderLeft * 0.04) * scale;
                      const shR_Y = edgeR_Y + (roadParams.shoulderRight * 0.04) * scale;

                      const pxAsphalt = roadParams.asphaltThickness * scale * 2.5; // visual multiplier
                      const pxBase = roadParams.baseThickness * scale;
                      const pxSubBase = roadParams.subBaseThickness * scale;

                      return (
                        <g>
                          {/* Earth Subgrade Embankment */}
                          <polygon
                            points={`${shL_X - 60},${shL_Y + pxBase + pxSubBase + 60} ${shL_X},${shL_Y + pxBase + pxSubBase} ${shR_X},${shR_Y + pxBase + pxSubBase} ${shR_X + 60},${shR_Y + pxBase + pxSubBase + 60}`}
                            fill={showHatching ? 'url(#earthHatch)' : themeColors.earthFill}
                            opacity="0.5"
                          />

                          {/* Granular Sub-Base Layer */}
                          <polygon
                            points={`${shL_X},${shL_Y + pxBase} ${shR_X},${shR_Y + pxBase} ${shR_X + 20},${shR_Y + pxBase + pxSubBase} ${shL_X - 20},${shL_Y + pxBase + pxSubBase}`}
                            fill={showHatching ? 'url(#granularHatch)' : themeColors.concreteFill}
                            stroke={themeColors.line}
                            strokeWidth="1.5"
                          />

                          {/* Base Course Layer */}
                          <polygon
                            points={`${shL_X},${shL_Y} ${shR_X},${shR_Y} ${shR_X},${shR_Y + pxBase} ${shL_X},${shL_Y + pxBase}`}
                            fill={showHatching ? 'url(#stoneHatch)' : themeColors.stoneFill}
                            stroke={themeColors.line}
                            strokeWidth="1.5"
                          />

                          {/* Surface Pavement Layer (Asphalt or PCC) */}
                          <polygon
                            points={
                              isCrown
                                ? `${cx},${crownPeakY} ${edgeR_X},${edgeR_Y} ${edgeR_X},${edgeR_Y + pxAsphalt} ${cx},${crownPeakY + pxAsphalt} ${edgeL_X},${edgeL_Y + pxAsphalt} ${edgeL_X},${edgeL_Y}`
                                : `${edgeL_X},${edgeL_Y} ${edgeR_X},${edgeR_Y} ${edgeR_X},${edgeR_Y + pxAsphalt} ${edgeL_X},${edgeL_Y + pxAsphalt}`
                            }
                            fill={
                              roadType === 'rigid_concrete'
                                ? showHatching ? 'url(#concreteHatch)' : themeColors.concreteFill
                                : showHatching ? 'url(#asphaltHatch)' : themeColors.asphaltFill
                            }
                            stroke={themeColors.line}
                            strokeWidth="2.5"
                          />

                          {/* Centerline CL Marker */}
                          <line x1={cx} y1={crownY - 35} x2={cx} y2={shL_Y + pxBase + pxSubBase + 30} stroke="#ef4444" strokeWidth="1.8" strokeDasharray="6 3" />
                          <text x={cx} y={crownY - 42} fill="#ef4444" fontSize="11" fontWeight="extrabold" textAnchor="middle">
                            CL Roadway Centerline
                          </text>

                          {/* Side Drains on both edges */}
                          <path
                            d={`M ${shL_X} ${shL_Y} L ${shL_X - 20} ${shL_Y + 30} L ${shL_X - 50} ${shL_Y + 30} L ${shL_X - 60} ${shL_Y - 10}`}
                            fill="none"
                            stroke={themeColors.line}
                            strokeWidth="2"
                          />
                          <path
                            d={`M ${shR_X} ${shR_Y} L ${shR_X + 20} ${shR_Y + 30} L ${shR_X + 50} ${shR_Y + 30} L ${shR_X + 60} ${shR_Y - 10}`}
                            fill="none"
                            stroke={themeColors.line}
                            strokeWidth="2"
                          />

                          {showDimensions && (
                            <g>
                              <DimensionLine
                                x1={edgeL_X}
                                y1={crownY}
                                x2={edgeR_X}
                                y2={crownY}
                                label="Wc"
                                value={roadParams.carriagewayWidth}
                                offset={-25}
                                lineColor={themeColors.dimLine}
                                textColor={themeColors.dimText}
                                paramName="Carriageway Width"
                                onEditValue={(v) => setRoadParams((p) => ({ ...p, carriagewayWidth: v }))}
                              />

                              <text x={(cx + edgeR_X) / 2} y={crownY + dropY / 2 - 8} fill={themeColors.dimText} fontSize="11" fontWeight="extrabold">
                                Camber {roadParams.camberPercent}% ({roadParams.camberType})
                              </text>
                            </g>
                          )}

                          <text x={cx} y={crownY - 70} fill={themeColors.titleText} fontSize="16" fontWeight="900" textAnchor="middle">
                            TYPICAL {roadType.replace('_', ' ').toUpperCase()} CROSS-SECTION
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                )}

                {/* ========================================================= */}
                {/* 3. CULVERT DRAWING RENDERER */}
                {/* ========================================================= */}
                {category === 'culvert' && (
                  <g id="culvertGroup" transform="translate(80, 30)">
                    {/* Box Culvert (Single & Twin Cell) with Fillet, Fillet Bar, Launching Apron & Scour Wall */}
                    {(culvertType === 'box_single' || culvertType === 'box_twin') && (
                      <BoxCulvertDrawing
                        culvertType={culvertType}
                        params={culvertParams}
                        onUpdateParam={(key, val) => setCulvertParams((p) => ({ ...p, [key]: val }))}
                        showDimensions={showDimensions}
                        showHatching={showHatching}
                        canvasTheme={canvasTheme}
                        themeColors={themeColors}
                        viewMode={culvertParams.boxViewMode || 'cross_section'}
                        onSelectViewMode={(mode) => setCulvertParams((p) => ({ ...p, boxViewMode: mode }))}
                      />
                    )}

                    {/* Pipe Culvert with Dynamic Pipe Count (1, 2, or 3 pipes) */}
                    {culvertType === 'pipe_rcc' && (() => {
                      const numPipes = Math.max(1, Math.min(3, culvertParams.pipeCount));
                      const cx = 370;
                      const cy = 250;
                      const scale = cadTakeoffMetrics.calculatedScale;

                      const rInt = (culvertParams.pipeDia / 2) * scale;
                      const rExt = (culvertParams.pipeDia / 2 + culvertParams.pipeWallThickness) * scale;
                      const pxSpacing = culvertParams.pipeSpacing * scale;
                      const pxBed = culvertParams.beddingDepth * scale;

                      const totalPipesWidth = numPipes * (2 * rExt) + (numPipes - 1) * pxSpacing;
                      const startX = cx - totalPipesWidth / 2 + rExt;

                      return (
                        <g>
                          {/* Earth Fill */}
                          <rect
                            x={cx - totalPipesWidth / 2 - 80}
                            y={cy - rExt - culvertParams.fillHeight * scale}
                            width={totalPipesWidth + 160}
                            height={culvertParams.fillHeight * scale + rExt}
                            fill={showHatching ? 'url(#earthHatch)' : themeColors.earthFill}
                            opacity="0.4"
                          />

                          {/* Concrete Bedding Cradle */}
                          <polygon
                            points={`${cx - totalPipesWidth / 2 - 30},${cy} ${cx + totalPipesWidth / 2 + 30},${cy} ${cx + totalPipesWidth / 2 + 20},${cy + rExt + pxBed} ${cx - totalPipesWidth / 2 - 20},${cy + rExt + pxBed}`}
                            fill={showHatching ? 'url(#concreteHatch)' : themeColors.concreteFill}
                            stroke={themeColors.line}
                            strokeWidth="2"
                          />

                          {/* Render N Pipes */}
                          {Array.from({ length: numPipes }).map((_, i) => {
                            const pipeX = startX + i * (2 * rExt + pxSpacing);
                            return (
                              <g key={i}>
                                <circle cx={pipeX} cy={cy} r={rExt} fill={themeColors.stoneFill} stroke={themeColors.line} strokeWidth="2.5" />
                                <circle cx={pipeX} cy={cy} r={rInt} fill={themeColors.bg} stroke={themeColors.line} strokeWidth="2" />
                                <path
                                  d={`M ${pipeX - rInt * 0.8} ${cy + rInt * 0.3} L ${pipeX + rInt * 0.8} ${cy + rInt * 0.3}`}
                                  stroke="#38bdf8"
                                  strokeWidth="2"
                                  strokeDasharray="4 2"
                                />
                              </g>
                            );
                          })}

                          <text x={cx} y={cy - rExt - 40} fill={themeColors.titleText} fontSize="16" fontWeight="900" textAnchor="middle">
                            {numPipes > 1 ? `MULTI-PIPE (${numPipes} NOS)` : 'SINGLE PIPE'} RCC CULVERT WITH CONCRETE BEDDING
                          </text>

                          {showDimensions && (
                            <DimensionLine
                              x1={startX - rInt}
                              y1={cy}
                              x2={startX + rInt}
                              y2={cy}
                              label="Dia Ø"
                              value={culvertParams.pipeDia}
                              offset={-20}
                              lineColor={themeColors.dimLine}
                              textColor={themeColors.dimText}
                              paramName="Pipe Diameter"
                              onEditValue={(v) => setCulvertParams((p) => ({ ...p, pipeDia: v }))}
                            />
                          )}
                        </g>
                      );
                    })()}

                    {/* Slab Culvert with Masonry Abutments, L-Cap, Deck Slab & Wing Walls */}
                    {culvertType === 'slab_culvert' && (
                      <SlabCulvertDrawing
                        params={culvertParams}
                        onUpdateParam={(key, val) => setCulvertParams((p) => ({ ...p, [key]: val }))}
                        showDimensions={showDimensions}
                        showHatching={showHatching}
                        canvasTheme={canvasTheme}
                        themeColors={themeColors}
                        viewMode={culvertParams.culvertViewMode || 'cross_section'}
                        onSelectViewMode={(mode) => setCulvertParams((p) => ({ ...p, culvertViewMode: mode }))}
                      />
                    )}
                  </g>
                )}

                {/* 4. PROTECTION WALL ASSEMBLY DRAWING RENDERER */}
                {category === 'protection_wall' && (
                  <ProtectionWallDrawing
                    wallType={wallType}
                    params={protectionWallParams}
                    mapping={protectionWallMapping}
                    projectItems={project.items}
                    showDimensions={showDimensions}
                    showHatching={showHatching}
                    themeColors={themeColors}
                    onUpdateParam={handleUpdateProtectionWallParam}
                    onResetOverride={handleResetOverride}
                    activeSectionCode={activeSection?.sectionCode || 'SECTION 1-1'}
                    activeSectionTitle={activeSection?.title || 'Plum Concrete Protection Wall Section'}
                  />
                )}

                {/* TITLE BLOCK, SCALE BAR, & DYNAMIC LEGEND */}
                <DrawingTitleBlock
                  project={project}
                  category={category}
                  subType={category === 'drain' ? drainType : category === 'road' ? roadType : culvertType}
                  drawingScale={drawingScale}
                  selectedFY={selectedFY}
                  selectedItemCode={activeBoundItem?.code}
                  selectedItemDesc={activeBoundItem?.description}
                  showTitleBlock={showTitleBlock}
                  showLegend={showLegend}
                  textColor={themeColors.titleText}
                  lineColor={themeColors.line}
                  bgColor={themeColors.bg}
                  activeMaterials={activeMaterials}
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION SAVE MODAL FOR BIDIRECTIONAL BOQ UPDATE */}
      {showConfirmSaveModal && activeBoundItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-indigo-900">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-base">Confirm BOQ & Estimate Update</h3>
              </div>
              <button
                onClick={() => setShowConfirmSaveModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action will update the selected BOQ Item's primary dimensions and recalculate dependent Measurement Book (MB) rows and Abstract Estimate totals.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2 font-mono">
              <div className="font-sans font-bold text-slate-900 border-b pb-1">
                Item: #{activeBoundItem.code || 'BOQ'} - {activeBoundItem.description}
              </div>

              <div className="grid grid-cols-3 font-semibold text-slate-700 pt-1">
                <span>Parameter</span>
                <span>Current Value</span>
                <span className="text-indigo-700 font-bold">New Drawing Value</span>
              </div>

              <div className="grid grid-cols-3 text-slate-800">
                <span>Breadth (B) / Span</span>
                <span>{activeBoundItem.breadth || 0} m</span>
                <span className="text-indigo-700 font-bold">{proposedNewDimensions.b} m</span>
              </div>

              <div className="grid grid-cols-3 text-slate-800">
                <span>Height (H) / Depth</span>
                <span>{activeBoundItem.height || 0} m</span>
                <span className="text-indigo-700 font-bold">{proposedNewDimensions.h} m</span>
              </div>

              <div className="grid grid-cols-3 text-slate-800 border-t pt-1">
                <span className="font-sans font-bold">Est. Quantity</span>
                <span>{recalculatedQtyPreview.oldQty.toFixed(2)}</span>
                <span className="text-emerald-700 font-bold">{recalculatedQtyPreview.newQty.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-3 text-slate-800">
                <span className="font-sans font-bold">Total Amount</span>
                <span>{currencyCode()} {recalculatedQtyPreview.oldAmt.toLocaleString()}</span>
                <span className="text-emerald-700 font-bold">{currencyCode()} {recalculatedQtyPreview.newAmt.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmSaveModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSaveToBOQItem}
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save & Recalculate Estimate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROTECTION WALL ASSEMBLY SYNC MODAL */}
      {showAssemblySyncModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-indigo-900">
                <Workflow className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-base">Protection Wall Composite Assembly Sync</h3>
              </div>
              <button
                onClick={() => setShowAssemblySyncModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Synchronize parametric drawing dimensions across all 5 assembly BOQ items in the Measurement Book and Abstract Estimate.
            </p>

            {/* Preview Breakdown Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b text-[11px]">
                  <tr>
                    <th className="p-2.5">Assembly Component</th>
                    <th className="p-2.5">Mapped BOQ Item</th>
                    <th className="p-2.5 text-right">Calculated Qty</th>
                    <th className="p-2.5 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  <tr>
                    <td className="p-2.5 font-sans font-bold text-slate-900">1. Plum Wall Body</td>
                    <td className="p-2.5 text-slate-700 font-sans">
                      {assemblySyncPreview.wallItem ? `#${assemblySyncPreview.wallItem.code || 'BOQ'} - ${assemblySyncPreview.wallItem.description.slice(0, 30)}...` : <span className="text-amber-600 italic">Unmapped</span>}
                    </td>
                    <td className="p-2.5 text-right font-bold text-indigo-700">
                      {assemblySyncPreview.wallNewQty} {assemblySyncPreview.wallItem?.unit || 'm3'}
                    </td>
                    <td className="p-2.5 text-right text-emerald-700 font-bold">
                      {currencyCode()} {assemblySyncPreview.wallNewAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                  </tr>

                  <tr>
                    <td className="p-2.5 font-sans font-bold text-slate-900">2. Bed PCC Concrete</td>
                    <td className="p-2.5 text-slate-700 font-sans">
                      {assemblySyncPreview.pccItem ? `#${assemblySyncPreview.pccItem.code || 'BOQ'} - ${assemblySyncPreview.pccItem.description.slice(0, 30)}...` : <span className="text-amber-600 italic">Unmapped</span>}
                    </td>
                    <td className="p-2.5 text-right font-bold text-indigo-700">
                      {assemblySyncPreview.pccNewQty} {assemblySyncPreview.pccItem?.unit || 'm3'}
                    </td>
                    <td className="p-2.5 text-right text-emerald-700 font-bold">
                      {currencyCode()} {assemblySyncPreview.pccNewAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                  </tr>

                  <tr>
                    <td className="p-2.5 font-sans font-bold text-slate-900">3. Stone / Brick Soling</td>
                    <td className="p-2.5 text-slate-700 font-sans">
                      {assemblySyncPreview.solingItem ? `#${assemblySyncPreview.solingItem.code || 'BOQ'} - ${assemblySyncPreview.solingItem.description.slice(0, 30)}...` : <span className="text-amber-600 italic">Unmapped</span>}
                    </td>
                    <td className="p-2.5 text-right font-bold text-indigo-700">
                      {assemblySyncPreview.solingNewQty} {assemblySyncPreview.solingItem?.unit || 'm3'}
                    </td>
                    <td className="p-2.5 text-right text-emerald-700 font-bold">
                      {currencyCode()} {assemblySyncPreview.solingNewAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                  </tr>

                  <tr>
                    <td className="p-2.5 font-sans font-bold text-slate-900">4. Foundation Excavation</td>
                    <td className="p-2.5 text-slate-700 font-sans">
                      {assemblySyncPreview.excItem ? `#${assemblySyncPreview.excItem.code || 'BOQ'} - ${assemblySyncPreview.excItem.description.slice(0, 30)}...` : <span className="text-amber-600 italic">Unmapped</span>}
                    </td>
                    <td className="p-2.5 text-right font-bold text-indigo-700">
                      {assemblySyncPreview.excNewQty} {assemblySyncPreview.excItem?.unit || 'm3'}
                    </td>
                    <td className="p-2.5 text-right text-emerald-700 font-bold">
                      {currencyCode()} {assemblySyncPreview.excNewAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                  </tr>

                  <tr>
                    <td className="p-2.5 font-sans font-bold text-slate-900">5. Formwork / Shuttering</td>
                    <td className="p-2.5 text-slate-700 font-sans">
                      {assemblySyncPreview.formworkItem ? `#${assemblySyncPreview.formworkItem.code || 'BOQ'} - ${assemblySyncPreview.formworkItem.description.slice(0, 30)}...` : <span className="text-amber-600 italic">Unmapped</span>}
                    </td>
                    <td className="p-2.5 text-right font-bold text-indigo-700">
                      {assemblySyncPreview.formNewQty} {assemblySyncPreview.formworkItem?.unit || 'm2'}
                    </td>
                    <td className="p-2.5 text-right text-emerald-700 font-bold">
                      {currencyCode()} {assemblySyncPreview.formNewAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between font-mono text-xs text-indigo-950 font-bold">
              <span>Total Assembly Cost Impact:</span>
              <span className="text-emerald-700 text-sm">{currencyCode()} {assemblySyncPreview.totalNewCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAssemblySyncModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSyncAssemblyToBOQ}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Update All 5 BOQ Items</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PARAMETER MAPPING MODAL */}
      {showMappingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-indigo-900">
                <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-base">Parameter Mapping Configuration</h3>
              </div>
              <button
                onClick={() => setShowMappingModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Configure how drawing template parameters map to BOQ Item fields & custom columns.
            </p>

            <div className="space-y-2 text-xs">
              {mappings.map((m, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="font-semibold text-slate-800">
                    <span className="font-bold text-indigo-900 block">{m.label}</span>
                    <span className="font-mono text-slate-500 text-[11px]">{m.drawingParam}</span>
                  </div>
                  <span className="bg-indigo-100 text-indigo-800 font-mono font-bold px-2 py-1 rounded-lg text-[11px]">
                    {m.boqField}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowMappingModal(false)}
                className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE LOG HISTORY DRAWER */}
      {showHistoryDrawer && (
        <div className="fixed bottom-6 right-6 z-50 bg-white rounded-2xl p-4 shadow-2xl border border-slate-300 max-w-md w-full space-y-3 print:hidden">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2 text-indigo-950 font-extrabold text-sm">
              <History className="w-4 h-4 text-amber-500" />
              <span>Dimension Update Log History</span>
            </div>
            <button
              onClick={() => setShowHistoryDrawer(false)}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 text-xs font-mono">
            {changeHistory.map((log) => (
              <div key={log.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5">
                <div className="flex justify-between font-sans text-slate-500 text-[10px]">
                  <span>Item: #{log.itemCode}</span>
                  <span>{log.timestamp}</span>
                </div>
                <div className="font-bold text-slate-900 font-sans">{log.parameterName}</div>
                <div className="text-slate-700 flex items-center gap-1.5">
                  <span className="line-through text-slate-400">{log.oldValue}</span>
                  <span>→</span>
                  <span className="text-emerald-700 font-bold">{log.newValue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CAD FOLDER TEMPLATES BROWSER DIALOG */}
      <CADFolderTemplateBrowser
        isOpen={showFolderBrowser}
        onClose={() => setShowFolderBrowser(false)}
        activeTemplateId={activeTemplateId}
        onSelectTemplate={handleSelectTemplate}
        category={category}
        onOpenUploadModal={() => setShowUploadModal(true)}
        uploadedCount={uploadedDrawings.length}
        currentViewportParams={activeParamValues}
        onSaveAsCustomTemplate={handleOpenSaveAsTemplateModal}
      />

      {/* DRAWING UPLOAD & REGISTRY MODAL */}
      <DrawingUploadRegistryModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        uploadedRecords={uploadedDrawings}
        onAddDrawingRecord={handleAddDrawingRecord}
        onDeleteRecord={handleDeleteDrawingRecord}
      />

      {/* SAVE CURRENT VIEWPORT DRAWING AS CUSTOM TEMPLATE MODAL */}
      {showSaveCustomModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-tr from-emerald-600 to-teal-600 text-white rounded-xl shadow-xs">
                  <BookmarkPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">Save as Custom CAD Template</h4>
                  <p className="text-xs text-slate-500">Save current section drawing & dimensions to your reusable template catalog</p>
                </div>
              </div>
              <button
                onClick={() => setShowSaveCustomModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomTemplateSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3.0m Battered Cantilever Protection Wall"
                  value={saveCustomName}
                  onChange={(e) => setSaveCustomName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Structure Category</span>
                  <span className="text-xs font-extrabold text-indigo-900 capitalize mt-0.5 block">
                    {category.replace('_', ' ')}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Base Geometry Variant</span>
                  <span className="text-xs font-extrabold text-indigo-900 capitalize mt-0.5 block">
                    {category === 'protection_wall' ? wallType : category === 'drain' ? drainType : category === 'road' ? roadType : culvertType}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description & Specifications
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Standard 3m high protection wall with 0.5m toe and 1:4 batter..."
                  value={saveCustomDesc}
                  onChange={(e) => setSaveCustomDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="Protection Wall, RCC, Default, Hill Road"
                  value={saveCustomTags}
                  onChange={(e) => setSaveCustomTags(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Set as Default Option */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <div>
                    <span className="text-xs font-black text-amber-950 block">Mark as Default Template (⭐)</span>
                    <span className="text-[10px] text-amber-800">Automatically make this your primary default template for this category</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={saveCustomSetDefault}
                  onChange={(e) => setSaveCustomSetDefault(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded-md focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveCustomModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-md transition"
                >
                  Save Custom Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENAME SECTION MODAL DIALOG */}
      {showRenameSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-600/50 rounded-xl border border-indigo-400/40">
                  <Edit3 className="w-4 h-4 text-sky-300" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Rename Drawing Section</h3>
                  <p className="text-[10px] text-slate-300">
                    Customize section code, chainage reach & title for MB & CAD
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRenameSectionModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRenameSection} className="p-5 space-y-4 text-xs">
              {/* Live Preview Badge */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="font-bold text-slate-600 text-[11px]">Preview in CAD & MB:</span>
                <span className="px-2.5 py-1 bg-indigo-600 text-white font-extrabold text-xs rounded-lg shadow-xs">
                  {renamingCode || 'Section'} • H={(activeSection?.params.wallHeight || 0).toFixed(2)}m
                </span>
              </div>

              {/* Section Code Field */}
              <div>
                <label className="block font-extrabold text-slate-800 text-xs mb-1">
                  Section Code / Identifier <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Section 1-1, SEC-01, Reach 1"
                  value={renamingCode}
                  onChange={(e) => setRenamingCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                  autoFocus
                />
              </div>

              {/* Quick Preset Naming Chips */}
              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Quick Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {['Section 1-1', 'Section 2-2', 'Section 3-3', 'SEC-01', 'SEC-02', 'Reach A', 'Left Bank', 'Right Bank'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setRenamingCode(preset);
                        if (!renamingTitle || renamingTitle.startsWith('Section') || renamingTitle.startsWith('SEC')) {
                          setRenamingTitle(`${preset} (H=${(activeSection?.params.wallHeight || 0).toFixed(2)}m)`);
                        }
                      }}
                      className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 text-slate-700 font-bold text-[10px] rounded-lg border border-slate-200 transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section Title Field */}
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1">
                  Full Section Title / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plum Concrete Wall at Ch. 0+000 - 0+050"
                  value={renamingTitle}
                  onChange={(e) => setRenamingTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Chainage Range Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 text-[11px] mb-1">
                    Start Chainage (m)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0+000"
                    value={renamingChainageStart}
                    onChange={(e) => setRenamingChainageStart(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 text-[11px] mb-1">
                    End Chainage (m)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0+050"
                    value={renamingChainageEnd}
                    onChange={(e) => setRenamingChainageEnd(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRenameSectionModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Section Name</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ESTIMATE AND VALUATION MB FEED MODAL (WITH AUTO-VERSION SNAPSHOTS) */}
      <EstimateAndValuationMBFeedModal
        isOpen={showMBFeedModal}
        onClose={() => setShowMBFeedModal(false)}
        initialTab={mbFeedModalInitialTab}
        project={project}
        setProject={setProject}
        category={category}
        variantKey={activeVariantKey}
        variantTitle={activeVariantTitle}
        wallSections={wallSections}
        currentDrawingParams={
          category === 'drain' ? drainParams :
          category === 'road' ? roadParams :
          category === 'culvert' ? culvertParams :
          protectionWallParams
        }
        mapping={effectiveProtectionWallMapping}
        valuationBooks={valuationBooks}
        setValuationBooks={setValuationBooks}
        valuationRows={valuationRows}
        setValuationRows={setValuationRows}
        showToast={showToast}
        onNavigateToTab={onNavigateToTab}
        onLoadEstimateDrawing={handleLoadEstimateDrawing}
      />
    </div>
  );
};
