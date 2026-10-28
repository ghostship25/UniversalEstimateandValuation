import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Layers,
  Sliders,
  Calculator,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Info,
  Search,
  BookOpen,
  ArrowRight,
  RefreshCw,
  FolderOpen,
  Save,
  Download,
  Check,
  X,
  FileSpreadsheet,
  Cpu,
  Coins,
  Square,
  Maximize2,
  FileCode2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Tag,
  Palette,
  Compass,
  Zap,
  Filter
} from 'lucide-react';
import {
  ProjectEstimate,
  RateNormItem,
  ResourceMaster,
  ZoneInfo,
  VisualGeometryModel,
  VisualGeometricShape,
  GeometricShapeType,
  DimensionParam,
  TemplateWorkItemOutput,
  MBRow
} from '../../types';
import { generateCADSectionDXF } from './dxfExportUtils';
import { currencyCode } from '../../services/currency';

// Baseline  Standard Civil Works Norms (Roads & Buildings Dept.)
export const STANDARD_CIVIL_NORMS: RateNormItem[] = [
  {
    item_id: 201,
    code: '2.01',
    source: 'Roads Dept. Road Norms (Ch. 2)',
    description: 'Earthwork excavation in road embankment/cutting in ordinary soil and disposal up to 10m',
    base_unit: 'm3',
    base_quantity: 1,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 0.8 },
      { resource_id: 102, resource_name: 'Supervisor / Foreman', category: 'Labor', quantity_per_base_unit: 0.05 }
    ]
  },
  {
    item_id: 202,
    code: '2.02',
    source: 'Roads Dept. Road Norms (Ch. 2)',
    description: 'Earthwork in excavation for foundation trench of drains, retaining walls, culverts in all types of soil',
    base_unit: 'm3',
    base_quantity: 1,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 0.95 },
      { resource_id: 102, resource_name: 'Supervisor / Foreman', category: 'Labor', quantity_per_base_unit: 0.05 }
    ]
  },
  {
    item_id: 301,
    code: '3.01',
    source: 'Standard Building Norms',
    description: 'Dry Flat Stone Soling under foundation bed with hand packing and sand filling voids',
    base_unit: 'm3',
    base_quantity: 1,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 0.6 },
      { resource_id: 102, resource_name: 'Skilled Mason', category: 'Labor', quantity_per_base_unit: 0.3 },
      { resource_id: 107, resource_name: 'Stone Boulder / Soling Stone', category: 'Material', quantity_per_base_unit: 1.05 },
      { resource_id: 106, resource_name: 'Coarse River Sand', category: 'Material', quantity_per_base_unit: 0.15 }
    ]
  },
  {
    item_id: 401,
    code: '4.01 A',
    source: 'Standard Building Norms',
    description: 'PCC 1:3:6 (M10 Nominal Mix) with 20mm graded aggregate in foundation and screed bed',
    base_unit: 'm3',
    base_quantity: 1,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 1.5 },
      { resource_id: 102, resource_name: 'Skilled Mason', category: 'Labor', quantity_per_base_unit: 0.35 },
      { resource_id: 104, resource_name: 'OPC Cement 53 Grade', category: 'Material', quantity_per_base_unit: 4.4 }, // bags
      { resource_id: 106, resource_name: 'Coarse River Sand', category: 'Material', quantity_per_base_unit: 0.45 },
      { resource_id: 109, resource_name: 'Crushed Stone Aggregate 20mm', category: 'Material', quantity_per_base_unit: 0.90 }
    ]
  },
  {
    item_id: 402,
    code: '4.01 B',
    source: 'Standard Building Norms',
    description: 'PCC 1:2:4 (M15 Nominal Mix) in bed leveling, coping and protective aprons',
    base_unit: 'm3',
    base_quantity: 1,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 1.8 },
      { resource_id: 102, resource_name: 'Skilled Mason', category: 'Labor', quantity_per_base_unit: 0.45 },
      { resource_id: 104, resource_name: 'OPC Cement 53 Grade', category: 'Material', quantity_per_base_unit: 6.4 },
      { resource_id: 106, resource_name: 'Coarse River Sand', category: 'Material', quantity_per_base_unit: 0.44 },
      { resource_id: 109, resource_name: 'Crushed Stone Aggregate 20mm', category: 'Material', quantity_per_base_unit: 0.88 }
    ]
  },
  {
    item_id: 501,
    code: '5.01',
    source: 'Roads Dept. Standard Specifications',
    description: 'RCC M20 (1:1.5:3) nominal/design mix in drain walls, base slabs, culvert decks and box sections',
    base_unit: 'm3',
    base_quantity: 1,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 2.2 },
      { resource_id: 102, resource_name: 'Skilled Mason', category: 'Labor', quantity_per_base_unit: 0.6 },
      { resource_id: 104, resource_name: 'OPC Cement 53 Grade', category: 'Material', quantity_per_base_unit: 8.0 },
      { resource_id: 106, resource_name: 'Coarse River Sand', category: 'Material', quantity_per_base_unit: 0.42 },
      { resource_id: 109, resource_name: 'Crushed Stone Aggregate 20mm', category: 'Material', quantity_per_base_unit: 0.84 }
    ]
  },
  {
    item_id: 502,
    code: '5.02',
    source: 'Roads Dept. Standard Specifications',
    description: 'RCC M25 (1:1:2) high grade structural concrete in bridge decks, high retaining walls and box culverts',
    base_unit: 'm3',
    base_quantity: 1,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 2.4 },
      { resource_id: 102, resource_name: 'Skilled Mason', category: 'Labor', quantity_per_base_unit: 0.7 },
      { resource_id: 104, resource_name: 'OPC Cement 53 Grade', category: 'Material', quantity_per_base_unit: 9.6 },
      { resource_id: 106, resource_name: 'Coarse River Sand', category: 'Material', quantity_per_base_unit: 0.40 },
      { resource_id: 109, resource_name: 'Crushed Stone Aggregate 20mm', category: 'Material', quantity_per_base_unit: 0.80 }
    ]
  },
  {
    item_id: 601,
    code: '6.01',
    source: 'Roads Dept. Road Norms (Ch. 6)',
    description: 'Thermo-Mechanically Treated (TMT Fe500) Rebar cutting, bending, binding & placing in position',
    base_unit: 'kg',
    base_quantity: 1,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 0.015 },
      { resource_id: 103, resource_name: 'Skilled Bar Bender', category: 'Labor', quantity_per_base_unit: 0.012 },
      { resource_id: 110, resource_name: 'TMT 500D Steel Reinforcement Rebar', category: 'Material', quantity_per_base_unit: 1.05 },
      { resource_id: 111, resource_name: 'GI Binding Wire 20-22 SWG', category: 'Material', quantity_per_base_unit: 0.010 }
    ]
  },
  {
    item_id: 701,
    code: '7.01',
    source: 'Roads Dept. Road Norms (Ch. 7)',
    description: 'Formwork / shuttering centering including propping, strutting & staging with waterproof plywood/steel sheets',
    base_unit: 'm2',
    base_quantity: 1,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 0.3 },
      { resource_id: 102, resource_name: 'Skilled Carpenter', category: 'Labor', quantity_per_base_unit: 0.25 },
      { resource_id: 112, resource_name: 'Film-Faced Shuttering Plywood & Timber', category: 'Material', quantity_per_base_unit: 0.08 }
    ]
  },
  {
    item_id: 801,
    code: '8.01',
    source: 'Roads Dept. Road Norms (Ch. 8)',
    description: 'Random Rubble (RR) stone masonry in 1:4 cement sand mortar in breast/retaining walls & drain sidewalls',
    base_unit: 'm3',
    base_quantity: 1,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 1.6 },
      { resource_id: 102, resource_name: 'Skilled Stone Mason', category: 'Labor', quantity_per_base_unit: 0.75 },
      { resource_id: 104, resource_name: 'OPC Cement 53 Grade', category: 'Material', quantity_per_base_unit: 2.7 },
      { resource_id: 106, resource_name: 'Coarse River Sand', category: 'Material', quantity_per_base_unit: 0.38 },
      { resource_id: 107, resource_name: 'Dressed Quarry Stone / Boulders', category: 'Material', quantity_per_base_unit: 1.15 }
    ]
  },
  {
    item_id: 802,
    code: '8.02',
    source: 'Roads Dept. Road Norms (Ch. 8)',
    description: 'Random Rubble (RR) stone masonry in 1:6 cement sand mortar in retaining structures',
    base_unit: 'm3',
    base_quantity: 1,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 1.6 },
      { resource_id: 102, resource_name: 'Skilled Stone Mason', category: 'Labor', quantity_per_base_unit: 0.70 },
      { resource_id: 104, resource_name: 'OPC Cement 53 Grade', category: 'Material', quantity_per_base_unit: 1.8 },
      { resource_id: 106, resource_name: 'Coarse River Sand', category: 'Material', quantity_per_base_unit: 0.38 },
      { resource_id: 107, resource_name: 'Dressed Quarry Stone / Boulders', category: 'Material', quantity_per_base_unit: 1.15 }
    ]
  },
  {
    item_id: 901,
    code: '9.01',
    source: 'Standard Building Norms',
    description: '12.5mm thick cement sand plaster 1:4 with neat cement punning on drain bed and wall surfaces',
    base_unit: 'm2',
    base_quantity: 1,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 0.18 },
      { resource_id: 102, resource_name: 'Skilled Plasterer', category: 'Labor', quantity_per_base_unit: 0.14 },
      { resource_id: 104, resource_name: 'OPC Cement 53 Grade', category: 'Material', quantity_per_base_unit: 0.18 },
      { resource_id: 106, resource_name: 'Coarse River Sand', category: 'Material', quantity_per_base_unit: 0.016 }
    ]
  },
  {
    item_id: 1001,
    code: '10.01',
    source: 'Roads Dept. Road Norms (Ch. 10)',
    description: 'Granular Sub-Base (GSB) crushed stone grading conforming to Table 12.1 laid and compacted to 98% MDD',
    base_unit: 'm3',
    base_quantity: 1,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 0.25 },
      { resource_id: 115, resource_name: 'Crushed GSB Graded Material', category: 'Material', quantity_per_base_unit: 1.25 }
    ]
  },
  {
    item_id: 1002,
    code: '10.02',
    source: 'Roads Dept. Road Norms (Ch. 10)',
    description: 'Wet Mix Macadam (WMM) base course with graded crushed aggregate & mechanical paver/roller',
    base_unit: 'm3',
    base_quantity: 1,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 0.20 },
      { resource_id: 116, resource_name: 'WMM Crushed Aggregates & Filler', category: 'Material', quantity_per_base_unit: 1.22 }
    ]
  },
  {
    item_id: 1101,
    code: '11.01',
    source: 'Roads Dept. Road Norms (Ch. 11)',
    description: 'Bituminous Prime Coat & Tack Coat with emulsion VG-10 at specified rate of spray',
    base_unit: 'm2',
    base_quantity: 1,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 0.04 },
      { resource_id: 117, resource_name: 'Bitumen VG-10 / SS1 Emulsion', category: 'Material', quantity_per_base_unit: 0.90 }
    ]
  },
  {
    item_id: 1102,
    code: '11.02',
    source: 'Roads Dept. Road Norms (Ch. 11)',
    description: 'Dense Bituminous Macadam (DBM) binder course with 50-75mm compacted thickness using batching plant',
    base_unit: 'm3',
    base_quantity: 1,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 0.2 },
      { resource_id: 118, resource_name: 'Hot Mix DBM Bituminous Mix', category: 'Material', quantity_per_base_unit: 2.35 }
    ]
  },
  {
    item_id: 1103,
    code: '11.03',
    source: 'Roads Dept. Road Norms (Ch. 11)',
    description: 'Asphalt Concrete (AC) wearing course 40-50mm compacted thickness conforming to Roads Dept. Table 13.4',
    base_unit: 'm3',
    base_quantity: 1,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 0.2 },
      { resource_id: 119, resource_name: 'Hot Mix Asphalt Concrete Mix', category: 'Material', quantity_per_base_unit: 2.38 }
    ]
  },
  {
    item_id: 1201,
    code: '12.01',
    source: 'Roads Dept. Road Norms (Ch. 12)',
    description: 'GI wire mechanically woven hexagonal gabion boxes with boulder stone packing in river training & walls',
    base_unit: 'm3',
    base_quantity: 1,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 1.2 },
      { resource_id: 102, resource_name: 'Skilled Gabion Weaver', category: 'Labor', quantity_per_base_unit: 0.4 },
      { resource_id: 120, resource_name: 'GI Gabion Crate 10 SWG Wire', category: 'Material', quantity_per_base_unit: 1.0 },
      { resource_id: 107, resource_name: 'River Boulder Stones 150-300mm', category: 'Material', quantity_per_base_unit: 1.15 }
    ]
  },
  {
    item_id: 1301,
    code: '13.01',
    source: 'Roads Dept. Road Norms (Ch. 13)',
    description: 'Supply and laying of NP3 Class RCC Hume Pipes (900mm Ø) with collar joints and concrete bedding',
    base_unit: 'm',
    base_quantity: 1,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 1.4 },
      { resource_id: 102, resource_name: 'Skilled Pipe Fitter / Mason', category: 'Labor', quantity_per_base_unit: 0.4 },
      { resource_id: 122, resource_name: 'NP3 RCC Hume Pipe 900mm Dia (2.5m span)', category: 'Material', quantity_per_base_unit: 1.0 }
    ]
  }
];

interface VisualGeometryMBEditorProps {
  project: ProjectEstimate;
  setProject: React.Dispatch<React.SetStateAction<ProjectEstimate>>;
  selectedZone: ZoneInfo;
  selectedFY: string;
  norms?: RateNormItem[];
  resources?: ResourceMaster[];
  onNavigateToTab?: (tab: string) => void;
  onClose?: () => void;
}

// Built-in presets for quick geometry modeling
const BUILTIN_GEOMETRY_PRESETS: VisualGeometryModel[] = [
  // 1. TRAPEZOIDAL ROAD CROSS-SECTION
  {
    id: 'preset-road-trapezoid',
    name: 'Trapezoidal Road Cross-Section (Embankment & Multi-Layer)',
    category: 'Road',
    description: 'Complete road embankment cross-section with subgrade trapezoid, granular sub-base, crushed stone base, and asphalt wearing course.',
    chainage_reference: 'CH 0+000 to CH 0+500 (Full Width)',
    parameters: {
      L: 500,        // Running Length (m)
      W_top: 7.0,    // Top Road Width (Carriageway + Shoulders)
      W_bot: 11.5,   // Embankment Bottom Width
      H_emb: 1.5,    // Embankment Height (m)
      z_slope: 1.5,  // Embankment side slope 1:1.5
      t_asphalt: 0.05, // 50mm Asphalt
      t_base: 0.15,    // 150mm Crushed Stone Base
      t_subbase: 0.20, // 200mm Granular Sub-base
      t_subgrade: 0.30,// 300mm Selected Subgrade
      No: 1
    },
    parameter_defs: [
      { key: 'L', label: 'Road Reach Length', symbol: 'L', unit: 'm', default_val: 500, min: 10, max: 10000, step: 10, description: 'Continuous longitudinal length of road reach' },
      { key: 'W_top', label: 'Carriageway Top Width', symbol: 'W_top', unit: 'm', default_val: 7.0, min: 3.0, max: 20.0, step: 0.25, description: 'Roadway top width including shoulders' },
      { key: 'W_bot', label: 'Embankment Base Width', symbol: 'W_bot', unit: 'm', default_val: 11.5, min: 4.0, max: 30.0, step: 0.5, description: 'Bottom width of earth embankment at ground level' },
      { key: 'H_emb', label: 'Embankment Fill Height', symbol: 'H_emb', unit: 'm', default_val: 1.5, min: 0.2, max: 10.0, step: 0.1, description: 'Average fill height of road embankment' },
      { key: 'z_slope', label: 'Embankment Side Slope (H:1V)', symbol: 'z', unit: 'ratio', default_val: 1.5, min: 0.5, max: 3.0, step: 0.25, description: 'Side slope ratio (e.g. 1.5 for 1V:1.5H)' },
      { key: 't_asphalt', label: 'Asphalt Concrete (AC) Thickness', symbol: 't_ac', unit: 'm', default_val: 0.05, min: 0.03, max: 0.15, step: 0.01, description: 'Wearing course bituminous asphalt concrete' },
      { key: 't_base', label: 'Crushed Stone Base Thickness', symbol: 't_base', unit: 'm', default_val: 0.15, min: 0.075, max: 0.30, step: 0.025, description: 'Graded crushed stone base course' },
      { key: 't_subbase', label: 'Granular Sub-Base Thickness', symbol: 't_gsb', unit: 'm', default_val: 0.20, min: 0.10, max: 0.40, step: 0.025, description: 'Granular sub-base layer' },
      { key: 'No', label: 'Number of Carriageways', symbol: 'No', unit: 'nos', default_val: 1, min: 1, max: 10, step: 1, description: 'Number of identical roadway alignments' }
    ],
    shapes: [
      {
        id: 'shape-road-embankment',
        name: 'Road Embankment Earthwork Fill',
        shape_type: 'trapezoid',
        color: '#d97706',
        hatch_pattern: 'earth',
        is_visible: true,
        order: 1,
        dimensions: {
          length_param: 'L',
          width_param: 'W_top',
          bottom_width_param: 'W_bot',
          height_param: 'H_emb',
          side_slope_param: 'z_slope',
          nos_param: 'No',
          offset_x_param: '0',
          offset_y_param: '0'
        },
        mb_formula: {
          expression: 'No * L * ((W_top + W_bot) / 2) * H_emb',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Embankment Fill in layers: L={L}m x Avg.W={((W_top+W_bot)/2).toFixed(2)}m x H={H_emb}m',
          remarks: 'Compacted earthwork in embankment'
        },
        norm_mapping: {
          is_mapped: true,
          norm_code: 'Roads Dept.-104',
          norm_source: 'Roads Dept. Road Norms',
          norm_description: 'Earthwork compaction in embankment in layers not exceeding 150mm with vibratory roller',
          base_unit: 'm3',
          estimated_rate: 345,
          dor_item_no: 'RDS-RD-104'
        },
        include_in_mb_export: true
      },
      {
        id: 'shape-road-subbase',
        name: 'Granular Sub-Base (GSB) Layer',
        shape_type: 'trapezoid',
        color: '#ca8a04',
        hatch_pattern: 'granular',
        is_visible: true,
        order: 2,
        dimensions: {
          length_param: 'L',
          width_param: 'W_top',
          bottom_width_param: 'W_top + 2 * t_subbase * z_slope',
          height_param: 't_subbase',
          nos_param: 'No',
          offset_x_param: '0',
          offset_y_param: 'H_emb'
        },
        mb_formula: {
          expression: 'No * L * (W_top + t_subbase * z_slope) * t_subbase',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Granular Sub-base (GSB) compacted: L={L}m x W={W_top}m x t={t_subbase}m',
          remarks: 'Roads Dept. Standard GSB grading'
        },
        norm_mapping: {
          is_mapped: true,
          norm_code: 'Roads Dept.-201',
          norm_source: 'Roads Dept. Road Norms',
          norm_description: 'Providing and laying Granular Sub-base (GSB) conforming to Roads Dept. Standard Specifications',
          base_unit: 'm3',
          estimated_rate: 1850,
          dor_item_no: 'RDS-RD-201'
        },
        include_in_mb_export: true
      },
      {
        id: 'shape-road-base',
        name: 'Crushed Stone Base Course (WMM / Base)',
        shape_type: 'rectangle',
        color: '#64748b',
        hatch_pattern: 'stone',
        is_visible: true,
        order: 3,
        dimensions: {
          length_param: 'L',
          width_param: 'W_top - 0.5',
          height_param: 't_base',
          nos_param: 'No',
          offset_x_param: '0.25',
          offset_y_param: 'H_emb + t_subbase'
        },
        mb_formula: {
          expression: 'No * L * (W_top - 0.5) * t_base',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Crushed Stone Base Course: L={L}m x W={(W_top-0.5).toFixed(2)}m x t={t_base}m',
          remarks: 'Plant-mixed wet mix macadam / base'
        },
        norm_mapping: {
          is_mapped: true,
          norm_code: 'Roads Dept.-202',
          norm_source: 'Roads Dept. Road Norms',
          norm_description: 'Providing and laying Crushed Stone Base Course (WMM) compacted to required grade and camber',
          base_unit: 'm3',
          estimated_rate: 2650,
          dor_item_no: 'RDS-RD-202'
        },
        include_in_mb_export: true
      },
      {
        id: 'shape-road-asphalt',
        name: 'Asphalt Concrete (AC) Wearing Surface',
        shape_type: 'rectangle',
        color: '#1e293b',
        hatch_pattern: 'asphalt',
        is_visible: true,
        order: 4,
        dimensions: {
          length_param: 'L',
          width_param: 'W_top - 1.0',
          height_param: 't_asphalt',
          nos_param: 'No',
          offset_x_param: '0.5',
          offset_y_param: 'H_emb + t_subbase + t_base'
        },
        mb_formula: {
          expression: 'No * L * (W_top - 1.0) * t_asphalt',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Asphalt Concrete Wearing Course 50mm: L={L}m x W={(W_top-1.0).toFixed(2)}m x t={t_asphalt}m',
          remarks: 'Hot mix asphalt concrete paver finished'
        },
        norm_mapping: {
          is_mapped: true,
          norm_code: 'Roads Dept.-301',
          norm_source: 'Roads Dept. Road Norms',
          norm_description: 'Bituminous Concrete (AC) wearing course with VG-30 bitumen compacted with tandem roller',
          base_unit: 'm3',
          estimated_rate: 14500,
          dor_item_no: 'RDS-RD-301'
        },
        include_in_mb_export: true
      }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  // 2. TRAPEZOIDAL STONE MASONRY DRAIN
  {
    id: 'preset-drain-trapezoid',
    name: 'Trapezoidal Stone Masonry Drain with PCC Bed',
    category: 'Drain',
    description: 'Trapezoidal open roadside drain featuring excavation trench, flat stone soling, PCC 1:3:6 foundation bed, stone masonry side walls, and internal cement plaster.',
    chainage_reference: 'CH 0+000 to CH 0+250 (Left Side Drain)',
    parameters: {
      L: 250,        // Running Length (m)
      B_bed: 0.60,   // Invert / Bottom Width (m)
      H_depth: 0.75, // Inside Depth (m)
      t_wall: 0.30,  // Masonry Wall Thickness (m)
      t_pcc: 0.15,   // Bed PCC Thickness (m)
      t_sol: 0.15,   // Stone Soling (m)
      z_slope: 0.5,  // Wall Side Slope 1:0.5
      t_plaster: 0.015, // 15mm Plaster
      No: 1
    },
    parameter_defs: [
      { key: 'L', label: 'Drain Reach Length', symbol: 'L', unit: 'm', default_val: 250, min: 5, max: 5000, step: 5, description: 'Running length of drain section' },
      { key: 'B_bed', label: 'Clear Bed Invert Width', symbol: 'B', unit: 'm', default_val: 0.60, min: 0.25, max: 3.0, step: 0.05, description: 'Internal clear waterway bed width' },
      { key: 'H_depth', label: 'Clear Drain Depth', symbol: 'H', unit: 'm', default_val: 0.75, min: 0.30, max: 2.5, step: 0.05, description: 'Internal clear drain depth' },
      { key: 't_wall', label: 'Masonry Wall Thickness', symbol: 'tw', unit: 'm', default_val: 0.30, min: 0.15, max: 0.60, step: 0.025, description: 'Side wall thickness' },
      { key: 't_pcc', label: 'PCC Base Bed Thickness', symbol: 'tb', unit: 'm', default_val: 0.15, min: 0.05, max: 0.30, step: 0.025, description: 'PCC 1:3:6 foundation bed thickness' },
      { key: 't_sol', label: 'Stone Soling Thickness', symbol: 'tsol', unit: 'm', default_val: 0.15, min: 0.0, max: 0.30, step: 0.05, description: 'Dry stone soling layer' },
      { key: 'z_slope', label: 'Side Slope Ratio (H:V)', symbol: 'z', unit: 'ratio', default_val: 0.5, min: 0.0, max: 2.0, step: 0.1, description: 'Horizontal component for 1 vertical' },
      { key: 'No', label: 'Number of Drains', symbol: 'No', unit: 'nos', default_val: 1, min: 1, max: 4, step: 1, description: 'Number of parallel drain channels (1 for one side, 2 for both sides)' }
    ],
    shapes: [
      {
        id: 'shape-drn-exc',
        name: 'Trench Earthwork Excavation',
        shape_type: 'trapezoid',
        color: '#b45309',
        hatch_pattern: 'earth',
        is_visible: true,
        order: 1,
        dimensions: {
          length_param: 'L',
          width_param: 'B_bed + 2 * t_wall + 2 * (H_depth + t_pcc + t_sol) * z_slope + 0.30',
          bottom_width_param: 'B_bed + 2 * t_wall + 0.30',
          height_param: 'H_depth + t_pcc + t_sol',
          side_slope_param: 'z_slope',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * (B_bed + 2 * t_wall + 0.30 + (H_depth + t_pcc + t_sol) * z_slope) * (H_depth + t_pcc + t_sol)',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Trench Excavation in ordinary soil: L={L}m x Avg.B={(B_bed + 2*t_wall + 0.3 + (H_depth+t_pcc+t_sol)*z_slope).toFixed(2)}m x D={(H_depth+t_pcc+t_sol).toFixed(2)}m',
          remarks: 'Excavation in ordinary soil including 10m lift/lead'
        },
        norm_mapping: {
          is_mapped: true,
          norm_code: '2.01',
          norm_source: 'Standard Building Norms',
          norm_description: 'Earthwork in excavation in ordinary soil for foundation trenches with disposal up to 10m',
          base_unit: 'm3',
          estimated_rate: 280,
          dor_item_no: 'RDS-EW-201'
        },
        include_in_mb_export: true
      },
      {
        id: 'shape-drn-soling',
        name: 'Dry Stone Soling Bed',
        shape_type: 'rectangle',
        color: '#78716c',
        hatch_pattern: 'stone',
        is_visible: true,
        order: 2,
        dimensions: {
          length_param: 'L',
          width_param: 'B_bed + 2 * t_wall + 0.20',
          height_param: 't_sol',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * (B_bed + 2 * t_wall + 0.20) * t_sol',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Dry Flat Stone Soling: L={L}m x W={(B_bed + 2*t_wall + 0.20).toFixed(2)}m x t={t_sol}m',
          remarks: 'Stone boulder flat packing'
        },
        norm_mapping: {
          is_mapped: true,
          norm_code: '3.01',
          norm_source: 'Standard Building Norms',
          norm_description: 'Flat dry stone soling under foundation bed with hand packing and sand filling voids',
          base_unit: 'm3',
          estimated_rate: 1850,
          dor_item_no: 'BLD-SOL-01'
        },
        include_in_mb_export: true
      },
      {
        id: 'shape-drn-pcc',
        name: 'PCC 1:3:6 Bed Foundation',
        shape_type: 'rectangle',
        color: '#94a3b8',
        hatch_pattern: 'concrete',
        is_visible: true,
        order: 3,
        dimensions: {
          length_param: 'L',
          width_param: 'B_bed + 2 * t_wall + 0.15',
          height_param: 't_pcc',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * (B_bed + 2 * t_wall + 0.15) * t_pcc',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'PCC 1:3:6 Bed Slab: L={L}m x W={(B_bed + 2*t_wall + 0.15).toFixed(2)}m x t={t_pcc}m',
          remarks: 'Plain cement concrete M10 / 1:3:6'
        },
        norm_mapping: {
          is_mapped: true,
          norm_code: '4.01 A',
          norm_source: 'Standard Building Norms',
          norm_description: 'PCC 1:3:6 (Cement: Sand: Crushed Aggregate) in foundation and under bed',
          base_unit: 'm3',
          estimated_rate: 6850,
          dor_item_no: 'RDS-CC-401'
        },
        include_in_mb_export: true
      },
      {
        id: 'shape-drn-masonry',
        name: 'Stone Masonry Side Walls in 1:4 Mortar',
        shape_type: 'trapezoid',
        color: '#475569',
        hatch_pattern: 'stone',
        is_visible: true,
        order: 4,
        dimensions: {
          length_param: 'L',
          width_param: 't_wall',
          bottom_width_param: 't_wall',
          height_param: 'H_depth',
          nos_param: '2 * No'
        },
        mb_formula: {
          expression: '2 * No * L * t_wall * Math.sqrt(H_depth * H_depth + (H_depth * z_slope) * (H_depth * z_slope))',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Stone Masonry 1:4 Side Walls (2 sides): 2 x L={L}m x W={t_wall}m x Slant H={(Math.sqrt(H_depth*H_depth + (H_depth*z_slope)*(H_depth*z_slope))).toFixed(2)}m',
          remarks: 'Random rubble masonry in 1:4 cement mortar'
        },
        norm_mapping: {
          is_mapped: true,
          norm_code: '5.02',
          norm_source: 'Standard Building Norms',
          norm_description: 'Stone masonry in cement sand mortar (1:4) in foundation and drain side walls',
          base_unit: 'm3',
          estimated_rate: 5400,
          dor_item_no: 'BLD-MAS-02'
        },
        include_in_mb_export: true
      },
      {
        id: 'shape-drn-plaster',
        name: '12.5mm Cement Plaster 1:4 with Punning',
        shape_type: 'rectangle',
        color: '#cbd5e1',
        hatch_pattern: 'sand',
        is_visible: true,
        order: 5,
        dimensions: {
          length_param: 'L',
          width_param: 'B_bed + 2 * Math.sqrt(H_depth * H_depth + (H_depth * z_slope) * (H_depth * z_slope))',
          height_param: '1',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * (B_bed + 2 * Math.sqrt(H_depth * H_depth + (H_depth * z_slope) * (H_depth * z_slope)))',
          quantity_type: 'area',
          unit: 'm2',
          particulars_format: 'Inside Plaster 1:4 (Bed + 2 Slopes): L={L}m x Perimeter={(B_bed + 2 * Math.sqrt(H_depth*H_depth + (H_depth*z_slope)*(H_depth*z_slope))).toFixed(2)}m',
          remarks: 'Internal smooth cement plaster 12.5mm'
        },
        norm_mapping: {
          is_mapped: true,
          norm_code: '6.01',
          norm_source: 'Standard Building Norms',
          norm_description: '12.5mm thick cement sand plaster in 1:4 mix on drain walls and bed including neat cement punning',
          base_unit: 'm2',
          estimated_rate: 320,
          dor_item_no: 'BLD-PL-01'
        },
        include_in_mb_export: true
      }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  // 3. RECTANGULAR RCC BOX DRAIN
  {
    id: 'preset-drain-rcc-box',
    name: 'Rectangular RCC Box Drain with Removable Cover Slab',
    category: 'Drain',
    description: 'Urban rectangular RCC drain with raft foundation, reinforced side walls, top precast cover slabs, and rebar reinforcement.',
    chainage_reference: 'CH 0+000 to CH 0+150 (Urban Street Drain)',
    parameters: {
      L: 150,        // Running Length (m)
      W_clear: 0.75, // Clear Inside Width (m)
      H_clear: 0.80, // Clear Inside Depth (m)
      t_wall: 0.15,  // RCC Wall Thickness (m)
      t_base: 0.15,  // RCC Base Slab Thickness (m)
      t_cover: 0.10, // Precast Cover Slab Thickness (m)
      t_pcc: 0.075,  // PCC 1:3:6 Screed (m)
      t_sol: 0.15,   // Stone Soling (m)
      rebar_density: 100, // kg per m3 RCC
      No: 1
    },
    parameter_defs: [
      { key: 'L', label: 'Drain Reach Length', symbol: 'L', unit: 'm', default_val: 150, min: 5, max: 5000, step: 5, description: 'Longitudinal reach length' },
      { key: 'W_clear', label: 'Clear Inside Width', symbol: 'W', unit: 'm', default_val: 0.75, min: 0.3, max: 3.0, step: 0.05, description: 'Inside waterway width' },
      { key: 'H_clear', label: 'Clear Inside Height', symbol: 'H', unit: 'm', default_val: 0.80, min: 0.3, max: 3.0, step: 0.05, description: 'Inside waterway height' },
      { key: 't_wall', label: 'RCC Wall Thickness', symbol: 'tw', unit: 'm', default_val: 0.15, min: 0.10, max: 0.40, step: 0.025, description: 'Thickness of RCC side walls' },
      { key: 't_base', label: 'RCC Base Slab Thickness', symbol: 'tb', unit: 'm', default_val: 0.15, min: 0.10, max: 0.40, step: 0.025, description: 'Bottom raft slab thickness' },
      { key: 't_cover', label: 'Cover Slab Thickness', symbol: 'tcov', unit: 'm', default_val: 0.10, min: 0.075, max: 0.25, step: 0.025, description: 'Precast removable cover slab thickness' },
      { key: 't_pcc', label: 'PCC 1:3:6 Bed Thickness', symbol: 'tpcc', unit: 'm', default_val: 0.075, min: 0.05, max: 0.20, step: 0.025, description: 'Lean concrete leveling base' },
      { key: 't_sol', label: 'Stone Soling Thickness', symbol: 'tsol', unit: 'm', default_val: 0.15, min: 0.0, max: 0.30, step: 0.05, description: 'Dry stone soling base' },
      { key: 'rebar_density', label: 'Rebar Density (kg/m³)', symbol: 'ρ_s', unit: 'ratio', default_val: 100, min: 50, max: 200, step: 5, description: 'Reinforcement steel ratio per m3 of RCC' },
      { key: 'No', label: 'Number of Drains', symbol: 'No', unit: 'nos', default_val: 1, min: 1, max: 4, step: 1, description: 'Number of parallel drain reaches' }
    ],
    shapes: [
      {
        id: 'shape-box-exc',
        name: 'Trench Excavation for RCC Box Drain',
        shape_type: 'rectangle',
        color: '#b45309',
        hatch_pattern: 'earth',
        is_visible: true,
        order: 1,
        dimensions: {
          length_param: 'L',
          width_param: 'W_clear + 2 * t_wall + 0.30',
          height_param: 'H_clear + t_base + t_pcc + t_sol',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * (W_clear + 2 * t_wall + 0.30) * (H_clear + t_base + t_pcc + t_sol)',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Trench excavation: L={L}m x W={(W_clear+2*t_wall+0.30).toFixed(2)}m x D={(H_clear+t_base+t_pcc+t_sol).toFixed(2)}m',
          remarks: 'Excavation in ordinary soil'
        },
        norm_mapping: {
          is_mapped: true,
          norm_code: '2.01',
          norm_source: 'Standard Building Norms',
          norm_description: 'Earthwork excavation in foundation trench in ordinary soil',
          base_unit: 'm3',
          estimated_rate: 280,
          dor_item_no: 'RDS-EW-201'
        },
        include_in_mb_export: true
      },
      {
        id: 'shape-box-pcc',
        name: 'PCC 1:3:6 Screed Bed Foundation',
        shape_type: 'rectangle',
        color: '#94a3b8',
        hatch_pattern: 'concrete',
        is_visible: true,
        order: 2,
        dimensions: {
          length_param: 'L',
          width_param: 'W_clear + 2 * t_wall + 0.15',
          height_param: 't_pcc',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * (W_clear + 2 * t_wall + 0.15) * t_pcc',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'PCC 1:3:6 Screed: L={L}m x W={(W_clear+2*t_wall+0.15).toFixed(2)}m x t={t_pcc}m',
          remarks: 'Lean concrete leveling'
        },
        norm_mapping: {
          is_mapped: true,
          norm_code: '4.01 A',
          norm_source: 'Standard Building Norms',
          norm_description: 'PCC 1:3:6 leveling base under drain slab',
          base_unit: 'm3',
          estimated_rate: 6850,
          dor_item_no: 'RDS-CC-401'
        },
        include_in_mb_export: true
      },
      {
        id: 'shape-box-rcc-body',
        name: 'RCC M20 Base Slab & Side Walls',
        shape_type: 'rectangle',
        color: '#3b82f6',
        hatch_pattern: 'concrete',
        is_visible: true,
        order: 3,
        dimensions: {
          length_param: 'L',
          width_param: 'W_clear + 2 * t_wall',
          height_param: 'H_clear + t_base',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * ((W_clear + 2 * t_wall) * t_base + 2 * t_wall * H_clear)',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'RCC M20 Base & Walls: Base [L={L}m x W={(W_clear+2*t_wall).toFixed(2)}m x t={t_base}m] + Walls [2 x L={L}m x t={t_wall}m x H={H_clear}m]',
          remarks: 'Cast-in-situ RCC M20 concrete'
        },
        norm_mapping: {
          is_mapped: true,
          norm_code: '4.03 A',
          norm_source: 'Standard Building Norms',
          norm_description: 'RCC M20 (1:1.5:3) in drain foundation slab and side walls excluding rebar and formwork',
          base_unit: 'm3',
          estimated_rate: 11200,
          dor_item_no: 'RDS-RCC-403'
        },
        include_in_mb_export: true
      },
      {
        id: 'shape-box-rcc-cover',
        name: 'Precast RCC M20 Cover Slabs',
        shape_type: 'rectangle',
        color: '#1d4ed8',
        hatch_pattern: 'concrete',
        is_visible: true,
        order: 4,
        dimensions: {
          length_param: 'L',
          width_param: 'W_clear + 2 * t_wall',
          height_param: 't_cover',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * (W_clear + 2 * t_wall) * t_cover',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Precast RCC M20 Cover Slabs: L={L}m x W={(W_clear+2*t_wall).toFixed(2)}m x t={t_cover}m',
          remarks: 'Precast removable RCC slabs with lifting hooks'
        },
        norm_mapping: {
          is_mapped: true,
          norm_code: '4.04',
          norm_source: 'Standard Building Norms',
          norm_description: 'Precast RCC M20 cover slab units including casting, curing and fixing in position',
          base_unit: 'm3',
          estimated_rate: 12800,
          dor_item_no: 'BLD-RCC-04'
        },
        include_in_mb_export: true
      },
      {
        id: 'shape-box-rebar',
        name: 'TMT Steel Fe500 Reinforcement Bar',
        shape_type: 'rectangle',
        color: '#dc2626',
        hatch_pattern: 'steel',
        is_visible: true,
        order: 5,
        dimensions: {
          length_param: 'L',
          width_param: '1',
          height_param: '1',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * ((W_clear + 2 * t_wall) * t_base + 2 * t_wall * H_clear + (W_clear + 2 * t_wall) * t_cover) * rebar_density',
          quantity_type: 'weight',
          unit: 'kg',
          particulars_format: 'TMT Fe500 Rebar: Total RCC Vol={(L * ((W_clear+2*t_wall)*t_base + 2*t_wall*H_clear + (W_clear+2*t_wall)*t_cover)).toFixed(2)}m3 x {rebar_density} kg/m3',
          remarks: 'Fe500 grade thermo-mechanically treated bar'
        },
        norm_mapping: {
          is_mapped: true,
          norm_code: '4.08',
          norm_source: 'Standard Building Norms',
          norm_description: 'Supplying, cutting, bending, binding Fe500 TMT reinforcement bars including binding wire',
          base_unit: 'kg',
          estimated_rate: 118,
          dor_item_no: 'RDS-STL-408'
        },
        include_in_mb_export: true
      },
      {
        id: 'shape-box-formwork',
        name: 'Centering & Shuttering Formwork',
        shape_type: 'rectangle',
        color: '#eab308',
        hatch_pattern: 'sand',
        is_visible: true,
        order: 6,
        dimensions: {
          length_param: 'L',
          width_param: '4 * H_clear + 2 * t_base',
          height_param: '1',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * (4 * H_clear + 2 * t_base)',
          quantity_type: 'area',
          unit: 'm2',
          particulars_format: 'Formwork for RCC walls: L={L}m x Form Area {(4 * H_clear + 2 * t_base).toFixed(2)}m2/m (4 faces + base edges)',
          remarks: 'Steel/Plywood formwork with props'
        },
        norm_mapping: {
          is_mapped: true,
          norm_code: '4.06',
          norm_source: 'Standard Building Norms',
          norm_description: 'Centering and shuttering formwork with steel/plywood plates including propping and removal',
          base_unit: 'm2',
          estimated_rate: 450,
          dor_item_no: 'RDS-FW-406'
        },
        include_in_mb_export: true
      }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const VisualGeometryMBEditor: React.FC<VisualGeometryMBEditorProps> = ({
  project,
  setProject,
  selectedZone,
  selectedFY,
  norms = [],
  resources = [],
  onNavigateToTab,
  onClose
}) => {
  // Active Geometric Model
  const [activeModel, setActiveModel] = useState<VisualGeometryModel>(() => {
    // Check localStorage
    const saved = localStorage.getItem(`uev_visual_model_${project.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return BUILTIN_GEOMETRY_PRESETS[0];
  });

  // Selected shape for editing
  const [selectedShapeId, setSelectedShapeId] = useState<string>(
    activeModel.shapes[0]?.id || ''
  );

  // Active sub-tab in Editor
  const [editorSubTab, setEditorSubTab] = useState<'canvas_editor' | 'norms_mapper' | 'mb_preview' | 'formulas'>('canvas_editor');

  // Canvas visual controls
  const [canvasTheme, setCanvasTheme] = useState<'cad' | 'white' | 'blueprint'>('white');
  const [canvasZoom, setCanvasZoom] = useState<number>(1.0);
  const [canvasPan, setCanvasPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [show3DExtrusion, setShow3DExtrusion] = useState<boolean>(false);

  // Norm selection modal / search
  const [isNormSearchModalOpen, setIsNormSearchModalOpen] = useState<boolean>(false);
  const [targetShapeForNormMapping, setTargetShapeForNormMapping] = useState<string | null>(null);
  const [normSearchQuery, setNormSearchQuery] = useState<string>('');
  const [normDeptFilter, setNormDeptFilter] = useState<string>('all');

  // Notification Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3800);
  };

  const svgCanvasRef = useRef<SVGSVGElement | null>(null);

  // Save active model to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`uev_visual_model_${project.id}`, JSON.stringify(activeModel));
    } catch {}
  }, [activeModel, project.id]);

  // Handle single parameter value update
  const handleUpdateParameter = (key: string, value: number) => {
    setActiveModel((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [key]: value
      },
      updated_at: new Date().toISOString()
    }));
  };

  // Evaluate formula string with safety
  const evaluateShapeQuantity = (expression: string, params: Record<string, number>): number => {
    try {
      // Build safe math context
      const safeParams = { ...params, Math };
      // Replace keys with params values in function scope
      const keys = Object.keys(safeParams);
      const values = Object.values(safeParams);
      const func = new Function(...keys, `return Number(${expression});`);
      const result = func(...values);
      return isNaN(result) ? 0 : parseFloat(result.toFixed(3));
    } catch {
      return 0;
    }
  };

  // Format particulars string by evaluating placeholders
  const formatParticulars = (formatPattern: string, shapeName: string, params: Record<string, number>): string => {
    let text = formatPattern.replace(/\{name\}/g, shapeName);
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v.toString());
    });
    // Evaluate expressions like {(B_bed + 2*t_wall).toFixed(2)}
    text = text.replace(/\{([^}]+)\}/g, (_, expr) => {
      try {
        const keys = Object.keys({ ...params, Math });
        const values = Object.values({ ...params, Math });
        const func = new Function(...keys, `return ${expr};`);
        const res = func(...values);
        return typeof res === 'number' ? res.toFixed(2) : String(res);
      } catch {
        return expr;
      }
    });
    return text;
  };

  // Computed Quantities for all shapes
  const calculatedShapeOutputs = useMemo(() => {
    return activeModel.shapes.map((shape) => {
      const qty = evaluateShapeQuantity(shape.mb_formula.expression, activeModel.parameters);
      const formattedPart = formatParticulars(
        shape.mb_formula.particulars_format,
        shape.name,
        activeModel.parameters
      );
      const rate = shape.norm_mapping?.estimated_rate || 0;
      const totalAmount = parseFloat((qty * rate).toFixed(2));

      return {
        shape,
        calculated_quantity: qty,
        formatted_particulars: formattedPart,
        unit: shape.mb_formula.unit,
        estimated_rate: rate,
        total_amount: totalAmount
      };
    });
  }, [activeModel]);

  // Selected Shape
  const currentSelectedShape = useMemo(() => {
    return activeModel.shapes.find((s) => s.id === selectedShapeId) || activeModel.shapes[0];
  }, [activeModel.shapes, selectedShapeId]);

  // Combined Norms list from project props + standard baseline library
  const availableNormsList = useMemo(() => {
    const combined = [...STANDARD_CIVIL_NORMS];
    if (norms && norms.length > 0) {
      norms.forEach((n) => {
        if (!combined.some((c) => c.code === n.code)) {
          combined.push(n);
        }
      });
    }
    return combined;
  }, [norms]);

  // Filtered Norms
  const filteredNorms = useMemo(() => {
    return availableNormsList.filter((n) => {
      const matchesSearch =
        normSearchQuery === '' ||
        n.code.toLowerCase().includes(normSearchQuery.toLowerCase()) ||
        n.description.toLowerCase().includes(normSearchQuery.toLowerCase()) ||
        (n.source && n.source.toLowerCase().includes(normSearchQuery.toLowerCase()));

      const matchesDept =
        normDeptFilter === 'all' ||
        (n.source && n.source.toLowerCase().includes(normDeptFilter.toLowerCase()));

      return matchesSearch && matchesDept;
    });
  }, [availableNormsList, normSearchQuery, normDeptFilter]);

  // Handle Preset Selection
  const handleLoadPreset = (preset: VisualGeometryModel) => {
    setActiveModel({
      ...preset,
      id: `custom-model-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    setSelectedShapeId(preset.shapes[0]?.id || '');
    showToast(`Loaded "${preset.name}" preset!`);
  };

  // Add new shape layer
  const handleAddNewShape = (type: GeometricShapeType = 'rectangle') => {
    const newId = `shape-${Date.now()}`;
    const newShape: VisualGeometricShape = {
      id: newId,
      name: `Custom ${type === 'trapezoid' ? 'Trapezoid' : type === 'triangle' ? 'Triangle' : 'Layer'} ${activeModel.shapes.length + 1}`,
      shape_type: type,
      color: type === 'trapezoid' ? '#0284c7' : type === 'triangle' ? '#10b981' : '#6366f1',
      hatch_pattern: type === 'trapezoid' ? 'earth' : 'concrete',
      is_visible: true,
      order: activeModel.shapes.length + 1,
      dimensions: {
        length_param: 'L',
        width_param: 'W_top',
        bottom_width_param: type === 'trapezoid' ? 'W_bot' : undefined,
        height_param: 'H_depth',
        nos_param: 'No',
        side_slope_param: type === 'trapezoid' ? 'z_slope' : undefined
      },
      mb_formula: {
        expression:
          type === 'trapezoid'
            ? 'No * L * ((W_top + W_bot) / 2) * H_depth'
            : 'No * L * W_top * H_depth',
        quantity_type: 'volume',
        unit: 'm3',
        particulars_format: 'Custom Layer: L={L}m x W={W_top}m x H={H_depth}m',
        remarks: 'Defined in Visual Shape Builder'
      },
      norm_mapping: {
        is_mapped: false
      },
      include_in_mb_export: true
    };

    setActiveModel((prev) => ({
      ...prev,
      shapes: [...prev.shapes, newShape],
      updated_at: new Date().toISOString()
    }));
    setSelectedShapeId(newId);
    showToast(`Added new ${type} geometric shape layer!`);
  };

  // Duplicate Shape
  const handleDuplicateShape = (shapeId: string) => {
    const target = activeModel.shapes.find((s) => s.id === shapeId);
    if (!target) return;
    const dupId = `shape-dup-${Date.now()}`;
    const dup: VisualGeometricShape = {
      ...target,
      id: dupId,
      name: `${target.name} (Copy)`,
      order: activeModel.shapes.length + 1
    };
    setActiveModel((prev) => ({
      ...prev,
      shapes: [...prev.shapes, dup],
      updated_at: new Date().toISOString()
    }));
    setSelectedShapeId(dupId);
    showToast(`Duplicated "${target.name}"!`);
  };

  // Delete Shape
  const handleDeleteShape = (shapeId: string) => {
    if (activeModel.shapes.length <= 1) {
      showToast('At least one shape layer is required.');
      return;
    }
    setActiveModel((prev) => {
      const filtered = prev.shapes.filter((s) => s.id !== shapeId);
      return {
        ...prev,
        shapes: filtered,
        updated_at: new Date().toISOString()
      };
    });
    setSelectedShapeId(activeModel.shapes.find((s) => s.id !== shapeId)?.id || '');
    showToast('Deleted shape layer.');
  };

  // Update Shape property
  const handleUpdateCurrentShape = (updates: Partial<VisualGeometricShape>) => {
    setActiveModel((prev) => ({
      ...prev,
      shapes: prev.shapes.map((s) => (s.id === selectedShapeId ? { ...s, ...updates } : s)),
      updated_at: new Date().toISOString()
    }));
  };

  // Assign Norm to Target Shape
  const handleAssignNormToShape = (norm: RateNormItem) => {
    if (!targetShapeForNormMapping) return;

    // Estimate unit rate
    let estimatedRate = 1200;
    if (norm.resources && norm.resources.length > 0) {
      estimatedRate = Math.round(
        norm.resources.reduce((sum, r) => sum + (r.quantity_per_base_unit || 1) * (r.default_rate || 450), 0)
      );
      if (estimatedRate < 50) estimatedRate = 1500;
    }

    setActiveModel((prev) => ({
      ...prev,
      shapes: prev.shapes.map((s) => {
        if (s.id === targetShapeForNormMapping) {
          return {
            ...s,
            norm_mapping: {
              is_mapped: true,
              norm_id: norm.item_id,
              norm_code: norm.code,
              norm_source: norm.source || 'Civil Norms',
              norm_description: norm.description,
              base_unit: norm.base_unit || s.mb_formula.unit,
              estimated_rate: estimatedRate,
              dor_item_no: `NORM-${norm.code}`
            },
            include_in_mb_export: true // automatically enable for MB export
          };
        }
        return s;
      }),
      updated_at: new Date().toISOString()
    }));

    setIsNormSearchModalOpen(false);
    setTargetShapeForNormMapping(null);
    showToast(`Mapped Norm "${norm.code} - ${norm.description.slice(0, 30)}..." to shape!`);
  };

  // PUSH ONLY MAPPED & SELECTED ITEMS TO MEASUREMENT BOOK (MB)
  const handlePushSelectedMappedItemsToMB = () => {
    // Filter only shapes where include_in_mb_export is true AND norm is mapped
    const itemsToExport = calculatedShapeOutputs.filter(
      (out) => out.shape.include_in_mb_export && out.shape.norm_mapping?.is_mapped
    );

    if (itemsToExport.length === 0) {
      showToast('No mapped shapes are selected for MB export. Please map a Norm first!');
      return;
    }

    setProject((prev) => {
      const updatedItems = [...prev.items];
      const chainageTag = activeModel.chainage_reference || 'Custom Cross-Section Geometry';

      itemsToExport.forEach((out, idx) => {
        const normCode = out.shape.norm_mapping?.norm_code || `DWG-${idx + 1}`;
        const itemDesc = out.shape.name;

        // Check if matching BOQ item exists
        const existingIdx = updatedItems.findIndex(
          (it) =>
            it.description.toLowerCase() === itemDesc.toLowerCase() ||
            (out.shape.norm_mapping?.norm_code && it.code === out.shape.norm_mapping.norm_code)
        );

        const newMBRow: MBRow = {
          id: `mb_visual_${Date.now()}_${idx}`,
          particulars: `${chainageTag}: ${out.formatted_particulars}`,
          no_of_units: activeModel.parameters.No || 1,
          length: activeModel.parameters.L || 1,
          breadth: activeModel.parameters.W_top || activeModel.parameters.B_bed || 1,
          height: activeModel.parameters.H_depth || activeModel.parameters.H_emb || 1,
          quantity: out.calculated_quantity,
          formula: out.shape.mb_formula.expression,
          remarks: `Visual Geometry: ${out.shape.norm_mapping?.norm_code || 'Mapped Norm'}`
        };

        if (existingIdx >= 0) {
          // Append row to existing item
          const existingItem = updatedItems[existingIdx];
          const updatedRows = [...(existingItem.mb_rows || []), newMBRow];
          const newTotalQty = parseFloat(
            updatedRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0).toFixed(3)
          );
          const effectiveRate = existingItem.calculated_unit_rate || existingItem.user_rate || out.estimated_rate;

          updatedItems[existingIdx] = {
            ...existingItem,
            estimated_quantity: newTotalQty,
            total_amount: Math.round(newTotalQty * effectiveRate * 100) / 100,
            mb_rows: updatedRows
          };
        } else {
          // Create new BOQ item for this work item
          const newItemId = `item_geom_${Date.now()}_${idx}`;
          const effectiveRate = out.estimated_rate || 1200;
          updatedItems.push({
            id: newItemId,
            item_id: Date.now() + idx,
            item_code: normCode,
            code: normCode,
            description: `${itemDesc} (${out.shape.norm_mapping?.norm_description?.slice(0, 60) || 'Parametric Shape'})`,
            unit: out.unit,
            estimated_quantity: out.calculated_quantity,
            calculated_unit_rate: effectiveRate,
            user_rate: effectiveRate,
            total_amount: Math.round(out.calculated_quantity * effectiveRate * 100) / 100,
            chapter: 'Geometric Cross-Section Civil Works',
            mb_rows: [newMBRow]
          });
        }
      });

      return {
        ...prev,
        items: updatedItems
      };
    });

    showToast(`Successfully transferred ${itemsToExport.length} mapped items into Measurement Book (MB)!`);
    if (onNavigateToTab) {
      setTimeout(() => {
        onNavigateToTab('mb');
      }, 1200);
    }
  };

  // Canvas Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setStartPan({ x: e.clientX - canvasPan.x, y: e.clientY - canvasPan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setCanvasPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Export SVG
  const handleExportSVG = () => {
    if (!svgCanvasRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgCanvasRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `${activeModel.name.replace(/[^a-zA-Z0-9]/g, '_')}_geometry.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    showToast('Exported SVG Vector CAD drawing!');
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-xl space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border-2 border-emerald-500 font-bold text-xs flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-2xl shadow-md shadow-indigo-500/20">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Visual Geometric Shape Editor & Norms-to-MB Mapper
              </h2>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Standard Roads & Buildings Norms
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Draw and define parametric cross-sections (Trapezoid, Rectangle, Multi-Layer), link dimensions to MB formulas, map standard government norms, and push directly to Measurement Book.
            </p>
          </div>
        </div>

        {/* Quick Actions / Preset Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-600 px-2 flex items-center gap-1">
              <FolderOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Presets:</span>
            </span>
            {BUILTIN_GEOMETRY_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleLoadPreset(preset)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                  activeModel.name === preset.name
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                {preset.name.split(' ')[0]}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportSVG}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition border border-slate-200"
            title="Download SVG Vector Drawing"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export SVG</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditorSubTab('canvas_editor')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              editorSubTab === 'canvas_editor'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>1. Visual Cross-Section Drafter & Dimension Linker</span>
          </button>

          <button
            onClick={() => setEditorSubTab('norms_mapper')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              editorSubTab === 'norms_mapper'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>2. Government Norms & Rate Analysis Mapping</span>
            <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
              {calculatedShapeOutputs.filter((s) => s.shape.norm_mapping?.is_mapped).length} / {activeModel.shapes.length} Mapped
            </span>
          </button>

          <button
            onClick={() => setEditorSubTab('mb_preview')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              editorSubTab === 'mb_preview'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>3. Measurement Book (MB) Sync & Transfer</span>
          </button>
        </div>

        {/* Chainage / Location reference tag input */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
          <Tag className="w-3.5 h-3.5 text-indigo-600" />
          <span className="font-bold text-slate-500">Chainage / Loc:</span>
          <input
            type="text"
            value={activeModel.chainage_reference}
            onChange={(e) =>
              setActiveModel((prev) => ({ ...prev, chainage_reference: e.target.value }))
            }
            className="font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 text-xs w-56 focus:outline-indigo-600"
            placeholder="e.g. CH 0+000 to CH 0+250"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. VISUAL CROSS-SECTION DRAFTER & DIMENSION LINKER */}
      {/* ========================================================================= */}
      {editorSubTab === 'canvas_editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Shape Layer Stack & Parameters Control (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Global Parameters Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2 text-indigo-950 font-black text-xs">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <span>Cross-Section Global Dimensions</span>
                </div>
                <button
                  onClick={() => {
                    const preset = BUILTIN_GEOMETRY_PRESETS.find((p) => p.name === activeModel.name) || BUILTIN_GEOMETRY_PRESETS[0];
                    setActiveModel((prev) => ({ ...prev, parameters: { ...preset.parameters } }));
                    showToast('Reset parameters to defaults!');
                  }}
                  className="text-[11px] text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-bold"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Slider Inputs for each dimension */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                {activeModel.parameter_defs.map((param) => {
                  const val = activeModel.parameters[param.key] ?? param.default_val;
                  return (
                    <div key={param.key} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <span className="font-mono bg-indigo-100 text-indigo-800 px-1 py-0.2 rounded font-black text-[10px]">
                            {param.symbol}
                          </span>
                          <span>{param.label}</span>
                        </span>
                        <span className="font-mono font-bold text-indigo-900">
                          {val} {param.unit}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={param.min ?? 0.1}
                        max={param.max ?? 10}
                        step={param.step ?? 0.05}
                        value={val}
                        onChange={(e) => handleUpdateParameter(param.key, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shape Layers Stack */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2 text-indigo-950 font-black text-xs">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Geometric Shape Layers ({activeModel.shapes.length})</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleAddNewShape('rectangle')}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border border-indigo-200"
                    title="Add Rectangle Shape"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Rect</span>
                  </button>
                  <button
                    onClick={() => handleAddNewShape('trapezoid')}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border border-blue-200"
                    title="Add Trapezoid Shape"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Trap</span>
                  </button>
                </div>
              </div>

              {/* Shapes List */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {activeModel.shapes.map((shape, idx) => {
                  const isSelected = shape.id === selectedShapeId;
                  const shapeOutput = calculatedShapeOutputs.find((o) => o.shape.id === shape.id);

                  return (
                    <div
                      key={shape.id}
                      onClick={() => setSelectedShapeId(shape.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-400 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-4 h-4 rounded-md shrink-0 shadow-2xs border border-black/20"
                          style={{ backgroundColor: shape.color }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {shape.name}
                            </span>
                            <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-bold">
                              {shape.shape_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                            <span className="text-indigo-700 font-bold">
                              Qty: {shapeOutput?.calculated_quantity || 0} {shape.mb_formula.unit}
                            </span>
                            {shape.norm_mapping?.is_mapped ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" />
                                {shape.norm_mapping.norm_code}
                              </span>
                            ) : (
                              <span className="text-amber-600 italic">No Norm</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() =>
                            handleUpdateCurrentShape({ is_visible: !shape.is_visible })
                          }
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
                          title={shape.is_visible ? 'Hide Shape' : 'Show Shape'}
                        >
                          {shape.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-red-400" />}
                        </button>
                        <button
                          onClick={() => handleDuplicateShape(shape.id)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
                          title="Duplicate Shape"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteShape(shape.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded-md"
                          title="Delete Shape"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Selected Shape Formula Linkage Card */}
            {currentSelectedShape && (
              <div className="bg-white rounded-2xl p-4 border border-indigo-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 font-black text-xs text-indigo-950">
                    <Calculator className="w-4 h-4 text-indigo-600" />
                    <span>Selected Shape Formula & Dimension Linkage</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="color"
                      value={currentSelectedShape.color}
                      onChange={(e) => handleUpdateCurrentShape({ color: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                      title="Change Fill Color"
                    />
                  </div>
                </div>

                {/* Shape Name Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Shape Layer Name:
                  </label>
                  <input
                    type="text"
                    value={currentSelectedShape.name}
                    onChange={(e) => handleUpdateCurrentShape({ name: e.target.value })}
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-indigo-600"
                  />
                </div>

                {/* Mathematical Formula for MB Quantity */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-600">
                      MB Quantity Formula:
                    </label>
                    <span className="text-[10px] font-mono text-indigo-700 font-bold">
                      Evaluates to:{' '}
                      {evaluateShapeQuantity(
                        currentSelectedShape.mb_formula.expression,
                        activeModel.parameters
                      )}{' '}
                      {currentSelectedShape.mb_formula.unit}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={currentSelectedShape.mb_formula.expression}
                    onChange={(e) =>
                      handleUpdateCurrentShape({
                        mb_formula: {
                          ...currentSelectedShape.mb_formula,
                          expression: e.target.value
                        }
                      })
                    }
                    className="w-full text-xs font-mono font-bold text-slate-900 bg-slate-900 text-emerald-400 border border-slate-700 rounded-xl px-3 py-2"
                  />

                  {/* Clickable Dimension Chips to Insert */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[10px] text-slate-500 font-bold">Insert Dimension:</span>
                    {activeModel.parameter_defs.map((p) => (
                      <button
                        key={p.key}
                        onClick={() => {
                          const cur = currentSelectedShape.mb_formula.expression;
                          handleUpdateCurrentShape({
                            mb_formula: {
                              ...currentSelectedShape.mb_formula,
                              expression: `${cur} * ${p.key}`
                            }
                          });
                        }}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-100 text-indigo-800 rounded-md font-mono text-[10px] font-bold border border-slate-200"
                      >
                        +{p.key}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Vector CAD Canvas (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[580px]">
              {/* Canvas Toolbar */}
              <div className="bg-slate-100 border-b border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <span className="text-slate-700 font-black flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-indigo-600" />
                    <span>2D Section View</span>
                  </span>

                  {/* Theme Switcher */}
                  <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-200 text-[11px]">
                    <button
                      onClick={() => setCanvasTheme('white')}
                      className={`px-2 py-0.5 rounded ${canvasTheme === 'white' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                    >
                      Light
                    </button>
                    <button
                      onClick={() => setCanvasTheme('cad')}
                      className={`px-2 py-0.5 rounded ${canvasTheme === 'cad' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                    >
                      Dark CAD
                    </button>
                    <button
                      onClick={() => setCanvasTheme('blueprint')}
                      className={`px-2 py-0.5 rounded ${canvasTheme === 'blueprint' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                    >
                      Blueprint
                    </button>
                  </div>
                </div>

                {/* Canvas Controls */}
                <div className="flex items-center gap-1 text-slate-600">
                  <button
                    onClick={() => setShow3DExtrusion(!show3DExtrusion)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border ${
                      show3DExtrusion
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>3D Extrude</span>
                  </button>
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold ${showGrid ? 'bg-indigo-100 text-indigo-800' : 'bg-white text-slate-500'}`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setShowDimensions(!showDimensions)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold ${showDimensions ? 'bg-indigo-100 text-indigo-800' : 'bg-white text-slate-500'}`}
                  >
                    Dims
                  </button>
                  <button
                    onClick={() => setCanvasZoom((z) => Math.min(3.0, z + 0.15))}
                    className="p-1.5 bg-white hover:bg-slate-200 rounded-lg border border-slate-200"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setCanvasZoom((z) => Math.max(0.4, z - 0.15))}
                    className="p-1.5 bg-white hover:bg-slate-200 rounded-lg border border-slate-200"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setCanvasZoom(1.0);
                      setCanvasPan({ x: 0, y: 0 });
                    }}
                    className="p-1.5 bg-white hover:bg-slate-200 rounded-lg border border-slate-200"
                    title="Reset View"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Canvas SVG Area */}
              <div
                className={`flex-1 relative cursor-grab active:cursor-grabbing overflow-hidden ${
                  canvasTheme === 'cad'
                    ? 'bg-slate-950'
                    : canvasTheme === 'blueprint'
                    ? 'bg-[#0f3a60]'
                    : 'bg-slate-50'
                }`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                <svg
                  ref={svgCanvasRef}
                  className="w-full h-full select-none"
                  viewBox="-300 -200 600 400"
                >
                  <defs>
                    {/* Hatch Patterns */}
                    <pattern id="vEarthHatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <line x1="0" y1="0" x2="0" y2="12" stroke="#92400e" strokeWidth="1.2" />
                    </pattern>
                    <pattern id="vStoneHatch" width="16" height="16" patternUnits="userSpaceOnUse">
                      <polygon points="2,2 6,1 8,5 4,7" fill="#64748b" opacity="0.4" />
                      <polygon points="10,9 14,8 15,13 11,14" fill="#64748b" opacity="0.4" />
                    </pattern>
                    <pattern id="vConcreteHatch" width="10" height="10" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="1" fill="#475569" />
                      <circle cx="7" cy="7" r="1.2" fill="#475569" />
                    </pattern>
                    <pattern id="vGranularHatch" width="14" height="14" patternUnits="userSpaceOnUse">
                      <circle cx="3" cy="3" r="1.5" fill="#ca8a04" />
                      <circle cx="10" cy="9" r="1.5" fill="#ca8a04" />
                    </pattern>
                    <pattern id="vAsphaltHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
                      <line x1="0" y1="0" x2="8" y2="8" stroke="#1e293b" strokeWidth="2" />
                    </pattern>
                  </defs>

                  {/* Transform Group for Pan & Zoom */}
                  <g transform={`translate(${canvasPan.x}, ${canvasPan.y}) scale(${canvasZoom})`}>
                    {/* Background Grid */}
                    {showGrid && (
                      <g opacity={canvasTheme === 'cad' || canvasTheme === 'blueprint' ? 0.15 : 0.25}>
                        {Array.from({ length: 25 }).map((_, i) => {
                          const pos = (i - 12) * 25;
                          return (
                            <React.Fragment key={i}>
                              <line x1="-300" y1={pos} x2="300" y2={pos} stroke={canvasTheme === 'cad' ? '#38bdf8' : '#64748b'} strokeWidth="0.5" strokeDasharray="2,2" />
                              <line x1={pos} y1="-200" x2={pos} y2="200" stroke={canvasTheme === 'cad' ? '#38bdf8' : '#64748b'} strokeWidth="0.5" strokeDasharray="2,2" />
                            </React.Fragment>
                          );
                        })}
                      </g>
                    )}

                    {/* Center Ground Datum Line */}
                    <line
                      x1="-260"
                      y1="60"
                      x2="260"
                      y2="60"
                      stroke={canvasTheme === 'cad' ? '#22c55e' : '#16a34a'}
                      strokeWidth="1.5"
                      strokeDasharray="6,3"
                    />
                    <text
                      x="210"
                      y="55"
                      fill={canvasTheme === 'cad' ? '#22c55e' : '#16a34a'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      GROUND DATUM
                    </text>

                    {/* Render Shapes in order */}
                    {activeModel.shapes.map((shape, idx) => {
                      if (!shape.is_visible) return null;
                      const isSelected = shape.id === selectedShapeId;
                      const p = activeModel.parameters;

                      // Coordinate scaling: 1 meter = 40 pixels
                      const scale = 40;

                      // Evaluate Dimensions
                      const wTop = (p.W_top || p.B_bed || 2.0) * scale;
                      const wBot = (p.W_bot || p.B_bed || 2.0) * scale;
                      const hVal = (p.H_emb || p.H_depth || 1.0) * scale;
                      const yOffset = 60 - idx * 25;

                      if (shape.shape_type === 'trapezoid') {
                        const halfTop = wTop / 2;
                        const halfBot = wBot / 2;
                        const points = `-${halfBot},${yOffset} -${halfTop},${yOffset - hVal} ${halfTop},${yOffset - hVal} ${halfBot},${yOffset}`;

                        return (
                          <g key={shape.id} onClick={() => setSelectedShapeId(shape.id)} className="cursor-pointer">
                            {/* 3D Extrusion projection if enabled */}
                            {show3DExtrusion && (
                              <polygon
                                points={`${halfTop},${yOffset - hVal} ${halfTop + 50},${yOffset - hVal - 25} ${halfBot + 50},${yOffset - 25} ${halfBot},${yOffset}`}
                                fill={shape.color}
                                opacity="0.4"
                                stroke="#1e293b"
                                strokeWidth="1"
                              />
                            )}

                            <polygon
                              points={points}
                              fill={shape.color}
                              opacity="0.85"
                              stroke={isSelected ? '#f59e0b' : '#0f172a'}
                              strokeWidth={isSelected ? '3' : '1.5'}
                              strokeDasharray={isSelected ? '4,2' : undefined}
                            />
                            <text
                              x="0"
                              y={yOffset - hVal / 2}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="10"
                              fontWeight="bold"
                              fontFamily="sans-serif"
                            >
                              {shape.name.split(' ')[0]}
                            </text>
                          </g>
                        );
                      }

                      // Default Rectangle
                      const w = (p.W_top || p.B_bed || 1.5) * scale;
                      const h = (p.t_base || p.t_asphalt || p.t_pcc || 0.3) * scale;
                      const rectY = yOffset - h;

                      return (
                        <g key={shape.id} onClick={() => setSelectedShapeId(shape.id)} className="cursor-pointer">
                          {show3DExtrusion && (
                            <polygon
                              points={`${w / 2},${rectY} ${w / 2 + 50},${rectY - 25} ${w / 2 + 50},${rectY + h - 25} ${w / 2},${rectY + h}`}
                              fill={shape.color}
                              opacity="0.4"
                              stroke="#1e293b"
                              strokeWidth="1"
                            />
                          )}
                          <rect
                            x={-w / 2}
                            y={rectY}
                            width={w}
                            height={h}
                            fill={shape.color}
                            opacity="0.85"
                            stroke={isSelected ? '#f59e0b' : '#0f172a'}
                            strokeWidth={isSelected ? '3' : '1.5'}
                            strokeDasharray={isSelected ? '4,2' : undefined}
                          />
                          <text
                            x="0"
                            y={rectY + h / 2 + 3}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="9"
                            fontWeight="bold"
                          >
                            {shape.name.split(' ')[0]}
                          </text>
                        </g>
                      );
                    })}

                    {/* Dimension Leaders & Dynamic Labels */}
                    {showDimensions && (
                      <g stroke="#e11d48" strokeWidth="1" fill="#e11d48" fontSize="9" fontFamily="monospace" fontWeight="bold">
                        {/* Top Width Leader */}
                        <line x1="-100" y1="-70" x2="100" y2="-70" markerEnd="url(#arrow)" />
                        <text x="0" y="-75" textAnchor="middle" fill={canvasTheme === 'cad' ? '#fb7185' : '#be123c'}>
                          W_top = {(activeModel.parameters.W_top || 7.0).toFixed(2)}m
                        </text>
                        {/* Height Leader */}
                        <line x1="140" y1="-60" x2="140" y2="60" />
                        <text x="145" y="0" textAnchor="start" fill={canvasTheme === 'cad' ? '#fb7185' : '#be123c'}>
                          H = {(activeModel.parameters.H_emb || activeModel.parameters.H_depth || 1.5).toFixed(2)}m
                        </text>
                      </g>
                    )}
                  </g>
                </svg>

                {/* Overlay Legend */}
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs p-2 rounded-xl border border-slate-200 text-[10px] font-mono text-slate-700 shadow-sm space-y-1">
                  <div className="font-bold font-sans text-indigo-950 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Geometry Metric</span>
                  </div>
                  <div>Length: {activeModel.parameters.L || 100}m</div>
                  <div>Carriageway/Bed: {(activeModel.parameters.W_top || activeModel.parameters.B_bed || 2.0).toFixed(2)}m</div>
                  <div>Active Layers: {activeModel.shapes.length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. GOVERNMENT NORMS & RATE ANALYSIS MAPPING */}
      {/* ========================================================================= */}
      {editorSubTab === 'norms_mapper' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span>Norms & Rate Analysis Binding Matrix</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Map each geometric shape layer to official Roads / Buildings Dept. standard rate norms. Only shapes with active norm mapping can be transferred to the Measurement Book.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-blue-50 text-blue-900 border border-blue-200 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold">
                Mapped: {calculatedShapeOutputs.filter((s) => s.shape.norm_mapping?.is_mapped).length} of {activeModel.shapes.length} Layers
              </div>
            </div>
          </div>

          {/* Mapping Cards Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {calculatedShapeOutputs.map((out) => {
              const shape = out.shape;
              const isMapped = shape.norm_mapping?.is_mapped;

              return (
                <div
                  key={shape.id}
                  className={`bg-white rounded-2xl p-4 border transition-all shadow-xs space-y-3.5 ${
                    isMapped
                      ? 'border-emerald-300 ring-1 ring-emerald-200/50'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-4 h-4 rounded-md shadow-2xs border border-black/20 shrink-0"
                        style={{ backgroundColor: shape.color }}
                      />
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-900">{shape.name}</h4>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">
                          Shape: {shape.shape_type} | Qty: {out.calculated_quantity} {shape.mb_formula.unit}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isMapped ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Mapped</span>
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          Unmapped
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mapped Norm Details */}
                  {isMapped ? (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-lg text-[11px]">
                          Norm #{shape.norm_mapping?.norm_code}
                        </span>
                        <span className="text-slate-500 text-[10px]">
                          {shape.norm_mapping?.norm_source || 'Government Norms'}
                        </span>
                      </div>
                      <p className="text-slate-700 font-sans text-xs leading-relaxed">
                        {shape.norm_mapping?.norm_description}
                      </p>
                      <div className="flex items-center justify-between font-mono pt-1 text-[11px]">
                        <span className="text-slate-600">Unit Rate:</span>
                        <span className="font-bold text-emerald-700">
                          {currencyCode()} {shape.norm_mapping?.estimated_rate?.toLocaleString()} / {shape.mb_formula.unit}
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-mono text-[11px] font-bold text-slate-900 border-t border-slate-200 pt-1">
                        <span>Total Shape Cost:</span>
                        <span className="text-emerald-800">
                          {currencyCode()} {out.total_amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-200 text-xs text-amber-800 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-600" />
                        <span>No Norm Item Mapped</span>
                      </div>
                      <p className="text-[11px] text-amber-700">
                        Select a government norm to link labor, material coefficients and standard BOQ rate analysis to this shape.
                      </p>
                    </div>
                  )}

                  {/* Actions & Mapping Controls */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={shape.include_in_mb_export}
                        onChange={(e) => {
                          setActiveModel((prev) => ({
                            ...prev,
                            shapes: prev.shapes.map((s) =>
                              s.id === shape.id ? { ...s, include_in_mb_export: e.target.checked } : s
                            )
                          }));
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-slate-700">
                        Include in MB Export
                      </span>
                    </label>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setTargetShapeForNormMapping(shape.id);
                          setIsNormSearchModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>{isMapped ? 'Change Norm' : 'Select Norm'}</span>
                      </button>

                      {isMapped && (
                        <button
                          onClick={() => {
                            setActiveModel((prev) => ({
                              ...prev,
                              shapes: prev.shapes.map((s) =>
                                s.id === shape.id
                                  ? { ...s, norm_mapping: { is_mapped: false }, include_in_mb_export: false }
                                  : s
                              )
                            }));
                            showToast('Unlinked norm from shape.');
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                          title="Unlink Norm"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MEASUREMENT BOOK (MB) SYNC & TRANSFER */}
      {/* ========================================================================= */}
      {editorSubTab === 'mb_preview' && (
        <div className="space-y-6">
          {/* Top Summary Banner */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Measurement Book (MB) Entry Review</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                The table below shows the exact measurement rows computed from the geometric formulas. Only mapped and selected items will be committed to the project's Measurement Book.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePushSelectedMappedItemsToMB}
                className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl text-xs font-black transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>🚀 Transfer Selected Mapped Items to MB</span>
              </button>
            </div>
          </div>

          {/* Measurement Book Preview Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider font-mono">
                <tr>
                  <th className="p-3 w-10 text-center">Map</th>
                  <th className="p-3">Norm Code</th>
                  <th className="p-3">Work Item & Description</th>
                  <th className="p-3">MB Particulars & Formula</th>
                  <th className="p-3 text-right">Nos</th>
                  <th className="p-3 text-right">Quantity</th>
                  <th className="p-3 text-center">Unit</th>
                  <th className="p-3 text-right">Rate ({currencyCode()})</th>
                  <th className="p-3 text-right">Amount ({currencyCode()})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {calculatedShapeOutputs.map((out) => {
                  const shape = out.shape;
                  const isMapped = shape.norm_mapping?.is_mapped;
                  const isChecked = shape.include_in_mb_export && isMapped;

                  return (
                    <tr
                      key={shape.id}
                      className={`hover:bg-slate-50 transition ${
                        !isMapped ? 'opacity-60 bg-slate-50/50' : isChecked ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          disabled={!isMapped}
                          checked={shape.include_in_mb_export && isMapped}
                          onChange={(e) => {
                            setActiveModel((prev) => ({
                              ...prev,
                              shapes: prev.shapes.map((s) =>
                                s.id === shape.id ? { ...s, include_in_mb_export: e.target.checked } : s
                              )
                            }));
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 disabled:opacity-40"
                        />
                      </td>

                      <td className="p-3 font-bold text-blue-700">
                        {shape.norm_mapping?.norm_code || (
                          <span className="text-amber-600 font-sans italic text-[11px]">Unmapped</span>
                        )}
                      </td>

                      <td className="p-3 font-sans font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: shape.color }}
                          />
                          <span>{shape.name}</span>
                        </div>
                      </td>

                      <td className="p-3 font-sans text-slate-700 max-w-xs truncate" title={out.formatted_particulars}>
                        {out.formatted_particulars}
                      </td>

                      <td className="p-3 text-right text-slate-600 font-bold">
                        {activeModel.parameters.No || 1}
                      </td>

                      <td className="p-3 text-right font-black text-indigo-900 text-sm">
                        {out.calculated_quantity}
                      </td>

                      <td className="p-3 text-center text-slate-500 font-bold">
                        {out.unit}
                      </td>

                      <td className="p-3 text-right text-slate-700">
                        {out.estimated_rate > 0 ? out.estimated_rate.toLocaleString() : '-'}
                      </td>

                      <td className="p-3 text-right font-black text-emerald-800">
                        {out.total_amount > 0 ? `${currencyCode()} ${out.total_amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Total Cost Breakdown Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
              <div className="text-slate-600">
                <span>Selected for Transfer: </span>
                <span className="font-bold text-emerald-700">
                  {calculatedShapeOutputs.filter((s) => s.shape.include_in_mb_export && s.shape.norm_mapping?.is_mapped).length} Items
                </span>
              </div>

              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <span>Total Estimated Cost Impact:</span>
                <span className="text-emerald-700 font-black text-base">
                  {currencyCode()}{' '}
                  {calculatedShapeOutputs
                    .filter((s) => s.shape.include_in_mb_export && s.shape.norm_mapping?.is_mapped)
                    .reduce((sum, s) => sum + s.total_amount, 0)
                    .toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NORM SEARCH & SELECTION MODAL */}
      {/* ========================================================================= */}
      {isNormSearchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5 text-indigo-900 font-extrabold text-base">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <span>Select Government Rate Norm to Bind</span>
              </div>
              <button
                onClick={() => {
                  setIsNormSearchModalOpen(false);
                  setTargetShapeForNormMapping(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Department Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={normSearchQuery}
                  onChange={(e) => setNormSearchQuery(e.target.value)}
                  placeholder="Search by norm code (e.g. 2.01, Roads Dept.-201, Masonry, PCC, Earthwork)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-indigo-600 font-sans"
                />
              </div>

              <select
                value={normDeptFilter}
                onChange={(e) => setNormDeptFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
              >
                <option value="all">All Departments</option>
                <option value="RDS">Roads Dept. (Road & Bridge)</option>
                <option value="BLD">BLD (Building)</option>
                <option value="WSS">WSS (Water Supply)</option>
              </select>
            </div>

            {/* Norms List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
              {filteredNorms.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No matching rate norms found for "{normSearchQuery}".
                </div>
              ) : (
                filteredNorms.map((norm) => (
                  <div
                    key={norm.item_id || norm.code}
                    onClick={() => handleAssignNormToShape(norm)}
                    className="p-3 rounded-xl hover:bg-indigo-50/80 transition cursor-pointer flex items-center justify-between gap-3 border border-transparent hover:border-indigo-200"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md text-xs">
                          {norm.code}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {norm.source || 'Standard Norms'}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono font-bold">
                          Unit: {norm.base_unit}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 font-sans leading-snug">
                        {norm.description}
                      </p>
                    </div>

                    <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1">
                      <span>Map</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
