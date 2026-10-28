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
  Filter,
  PenTool,
  Grid,
  MousePointer,
  HelpCircle,
  Share2,
  Table,
  Upload,
  Box,
  CircleDot,
  MinusCircle,
  PlusCircle,
  Eye as EyeIcon,
  Layers3,
  CheckCheck,
  ArrowUpRight,
  Triangle,
  Shapes,
  Star,
  FilePlus,
  FolderDown,
  FolderUp,
  Bookmark,
  BookmarkCheck,
  Edit3
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
} from '../types';
import { generateCADSectionDXF } from '../modules/tools/dxfExportUtils';
import {
  loadUserCustomTemplates,
  saveOrUpdateCustomTemplate,
  deleteUserCustomTemplate,
  getDefaultTemplateIds,
  toggleDefaultTemplateStatus,
  exportTemplatesToJSON,
  parseAndImportTemplatesJSON
} from '../services/templateStorage';
import { currencyCode } from '../services/currency';

// Standard  Government Rate Analysis Norms Catalog (Roads Dept. Road Norms & Standard Building Norms)
export const DEFAULT_TEMPLATE_CIVIL_NORMS: RateNormItem[] = [
  {
    item_id: 201,
    code: '2.01',
    source: 'Roads Dept. Road Norms (Ch. 2)',
    description: 'Earthwork excavation in road cutting / embankment in ordinary soil and disposal up to 10m',
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
      { resource_id: 104, resource_name: 'OPC Cement 53 Grade', category: 'Material', quantity_per_base_unit: 4.4 },
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
    description: 'RCC M20 (1:1.5:3) nominal mix in drain walls, base slabs, culvert decks and box sections',
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
  }
];

// Rich Standard Civil Engineering Templates
export const BUILTIN_CIVIL_TEMPLATES: VisualGeometryModel[] = [
  {
    id: 'tpl_rcc_l_wall',
    name: '1. R.C.C. L Protection Wall',
    category: 'Protection Wall',
    description: 'Reinforced Cement Concrete (RCC M20/M25) L-shaped cantilever retaining & protection wall with stem, base slab, toe, rebar reinforcement & weep holes',
    chainage_reference: 'Ch 1+100 to Ch 1+250 (Hill Cutting Protection)',
    parameters: {
      L: 10.0,
      No: 1.0,
      H_stem: 3.00,
      t_top: 0.25,
      t_bot: 0.40,
      W_base: 2.20,
      t_base: 0.35,
      L_toe: 0.50,
      t_pcc: 0.10,
      t_soling: 0.15,
      rebar_density: 95.0
    },
    parameter_defs: [
      { key: 'L', symbol: 'L', label: 'Wall Length (L)', unit: 'm', default_val: 10.0, default_value: 10.0, min: 1.0, max: 1000.0, step: 1.0, description: 'Running protection wall length' },
      { key: 'No', symbol: 'No', label: 'Units (No)', unit: 'nos', default_val: 1.0, default_value: 1.0, min: 1.0, max: 10.0, step: 1.0, description: 'Number of wall segments' },
      { key: 'H_stem', symbol: 'H_stem', label: 'Stem Height (H_stem)', unit: 'm', default_val: 3.00, default_value: 3.00, min: 1.0, max: 8.0, step: 0.1, description: 'Height of vertical cantilever stem' },
      { key: 't_top', symbol: 't_top', label: 'Stem Top (t_top)', unit: 'm', default_val: 0.25, default_value: 0.25, min: 0.15, max: 0.8, step: 0.025, description: 'Top crest thickness of RCC stem' },
      { key: 't_bot', symbol: 't_bot', label: 'Stem Base (t_bot)', unit: 'm', default_val: 0.40, default_value: 0.40, min: 0.20, max: 1.2, step: 0.025, description: 'Stem junction thickness at base slab' },
      { key: 'W_base', symbol: 'W_base', label: 'Base Width (W_base)', unit: 'm', default_val: 2.20, default_value: 2.20, min: 1.0, max: 6.0, step: 0.1, description: 'Total foundation footing width' },
      { key: 't_base', symbol: 't_base', label: 'Base Thickness (t_base)', unit: 'm', default_val: 0.35, default_value: 0.35, min: 0.2, max: 1.2, step: 0.025, description: 'Thickness of foundation base slab' },
      { key: 'L_toe', symbol: 'L_toe', label: 'Toe Projection (L_toe)', unit: 'm', default_val: 0.50, default_value: 0.50, min: 0.1, max: 2.0, step: 0.05, description: 'Front toe cantilever projection' },
      { key: 't_pcc', symbol: 't_pcc', label: 'PCC Bed (t_pcc)', unit: 'm', default_val: 0.10, default_value: 0.10, min: 0.05, max: 0.3, step: 0.025, description: 'M10 foundation leveling screed pad' },
      { key: 't_soling', symbol: 't_soling', label: 'Soling Bed (t_soling)', unit: 'm', default_val: 0.15, default_value: 0.15, min: 0.1, max: 0.4, step: 0.05, description: 'Dry boulder soling cushion' },
      { key: 'rebar_density', symbol: 'rebar_density', label: 'Steel Density', unit: 'kg/m3', default_val: 95.0, default_value: 95.0, min: 50.0, max: 250.0, step: 5.0, description: 'TMT Fe500 Rebar density per m³ concrete' }
    ],
    shapes: [
      {
        id: 'shp_rcc_excavation',
        name: '1. Foundation Trench Excavation',
        shape_type: 'rectangle',
        color: '#d97706',
        hatch_pattern: 'earth',
        is_visible: true,
        order: 1,
        dimensions: {
          length_param: 'L',
          width_param: 'W_base + 0.60',
          height_param: 't_base + t_pcc + t_soling',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * (W_base + 0.60) * (t_base + t_pcc + t_soling)',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Earthwork excavation for RCC L-wall footing trench (Width={W_base+0.6}m, Depth={t_base+t_pcc+t_soling}m)'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 202,
          norm_code: '2.02',
          norm_source: 'Roads Dept. Road Norms (Ch. 2)',
          norm_description: 'Earthwork in excavation for foundation trench of retaining & protection walls',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_rcc_soling',
        name: '2. Dry Boulder Stone Soling Bed',
        shape_type: 'rectangle',
        color: '#64748b',
        hatch_pattern: 'stone',
        is_visible: true,
        order: 2,
        dimensions: {
          length_param: 'L',
          width_param: 'W_base + 0.20',
          height_param: 't_soling',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * (W_base + 0.20) * t_soling',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Dry flat boulder stone soling cushion under RCC footing (Width={W_base+0.2}m, Th={t_soling}m)'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 301,
          norm_code: '3.01',
          norm_source: 'Standard Building Norms',
          norm_description: 'Dry Flat Stone Soling under foundation bed with hand packing and sand voids filling',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_rcc_pcc_screed',
        name: '3. PCC M10 (1:3:6) Screed Bed Pad',
        shape_type: 'rectangle',
        color: '#0284c7',
        hatch_pattern: 'concrete',
        is_visible: true,
        order: 3,
        dimensions: {
          length_param: 'L',
          width_param: 'W_base + 0.20',
          height_param: 't_pcc',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * (W_base + 0.20) * t_pcc',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'PCC 1:3:6 (M10) leveling screed pad under RCC footing (Width={W_base+0.2}m, Th={t_pcc}m)'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 401,
          norm_code: '4.01 A',
          norm_source: 'Standard Building Norms',
          norm_description: 'PCC 1:3:6 (M10 Nominal Mix) with 20mm aggregate in foundation screed bed',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_rcc_base_slab',
        name: '4. RCC M20 (1:1.5:3) Base Footing Slab',
        shape_type: 'rectangle',
        color: '#4338ca',
        hatch_pattern: 'concrete',
        is_visible: true,
        order: 4,
        dimensions: {
          length_param: 'L',
          width_param: 'W_base',
          height_param: 't_base',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * W_base * t_base',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'RCC M20 (1:1.5:3) structural base footing slab ({W_base}m x {t_base}m)'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 501,
          norm_code: '5.01',
          norm_source: 'Roads Dept. Specifications',
          norm_description: 'RCC M20 (1:1.5:3) nominal mix in base slabs and retaining structures',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_rcc_stem_wall',
        name: '5. RCC M20 (1:1.5:3) Vertical Stem Wall',
        shape_type: 'trapezoid',
        color: '#312e81',
        hatch_pattern: 'concrete',
        is_visible: true,
        order: 5,
        dimensions: {
          length_param: 'L',
          width_param: 't_top',
          bottom_width_param: 't_bot',
          height_param: 'H_stem',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * ((t_top + t_bot) / 2) * H_stem',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'RCC M20 (1:1.5:3) vertical stem wall (Top={t_top}m, Base={t_bot}m, Height={H_stem}m)'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 501,
          norm_code: '5.01',
          norm_source: 'Roads Dept. Specifications',
          norm_description: 'RCC M20 (1:1.5:3) nominal mix in retaining wall stem and cantilever structures',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_rcc_rebar',
        name: '6. TMT Fe500 Steel Rebar Reinforcement',
        shape_type: 'compound_layer',
        color: '#dc2626',
        hatch_pattern: 'solid',
        is_visible: true,
        order: 6,
        dimensions: {
          length_param: 'L',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * ( (W_base * t_base) + (((t_top + t_bot) / 2) * H_stem) ) * rebar_density',
          quantity_type: 'weight',
          unit: 'kg',
          particulars_format: 'TMT 500D steel rebar cutting, bending & binding @ {rebar_density} kg/m³ concrete'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 601,
          norm_code: '6.01',
          norm_source: 'Roads Dept. Road Norms (Ch. 6)',
          norm_description: 'Thermo-Mechanically Treated (TMT Fe500) Rebar cutting, bending, binding & placing',
          base_unit: 'kg'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_rcc_formwork',
        name: '7. Centering & Shuttering Formwork',
        shape_type: 'compound_layer',
        color: '#f59e0b',
        hatch_pattern: 'solid',
        is_visible: true,
        order: 7,
        dimensions: {
          length_param: 'L',
          height_param: '2 * H_stem + 2 * t_base',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * (2 * H_stem + 2 * t_base)',
          quantity_type: 'area',
          unit: 'm2',
          particulars_format: 'Plywood formwork shuttering for stem front, back and base slab edges'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 701,
          norm_code: '7.01',
          norm_source: 'Roads Dept. Road Norms (Ch. 7)',
          norm_description: 'Formwork / shuttering centering including propping, strutting & staging',
          base_unit: 'm2'
        },
        include_in_mb_export: true
      }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'tpl_stone_masonry_wall',
    name: '2. Stone Masonry Wall',
    category: 'Protection Wall',
    description: 'Battered random rubble stone masonry gravity protection wall in 1:4 cement mortar with PCC coping, screed bed, soling cushion & weep holes',
    chainage_reference: 'Ch 2+400 to Ch 2+600',
    parameters: {
      L: 10.0,
      No: 1.0,
      H_wall: 2.50,
      W_top: 0.60,
      W_bot: 1.60,
      t_coping: 0.075,
      t_pcc: 0.15,
      t_soling: 0.15,
      t_plaster: 0.015
    },
    parameter_defs: [
      { key: 'L', symbol: 'L', label: 'Wall Length (L)', unit: 'm', default_val: 10.0, default_value: 10.0, min: 1.0, max: 1000.0, step: 1.0, description: 'Running wall length' },
      { key: 'No', symbol: 'No', label: 'Units (No)', unit: 'nos', default_val: 1.0, default_value: 1.0, min: 1.0, max: 10.0, step: 1.0, description: 'Number of wall reaches' },
      { key: 'H_wall', symbol: 'H_wall', label: 'Wall Height (H)', unit: 'm', default_val: 2.50, default_value: 2.50, min: 1.0, max: 8.0, step: 0.1, description: 'Total vertical height of stone wall body' },
      { key: 'W_top', symbol: 'W_top', label: 'Top Width (W_top)', unit: 'm', default_val: 0.60, default_value: 0.60, min: 0.40, max: 1.5, step: 0.05, description: 'Top crest width of masonry' },
      { key: 'W_bot', symbol: 'W_bot', label: 'Bottom Width (W_bot)', unit: 'm', default_val: 1.60, default_value: 1.60, min: 0.80, max: 4.0, step: 0.05, description: 'Bottom base width of masonry' },
      { key: 't_coping', symbol: 't_coping', label: 'Coping (t_coping)', unit: 'm', default_val: 0.075, default_value: 0.075, min: 0.05, max: 0.15, step: 0.01, description: 'Top PCC 1:2:4 coping band thickness' },
      { key: 't_pcc', symbol: 't_pcc', label: 'PCC Bed (t_pcc)', unit: 'm', default_val: 0.15, default_value: 0.15, min: 0.10, max: 0.30, step: 0.025, description: 'M10 foundation leveling pad' },
      { key: 't_soling', symbol: 't_soling', label: 'Soling (t_soling)', unit: 'm', default_val: 0.15, default_value: 0.15, min: 0.10, max: 0.40, step: 0.05, description: 'Dry boulder soling cushion' },
      { key: 't_plaster', symbol: 't_plaster', label: 'Plaster/Pointing', unit: 'm', default_val: 0.015, default_value: 0.015, min: 0.01, max: 0.03, step: 0.005, description: '12.5mm mortar pointing on exposed face' }
    ],
    shapes: [
      {
        id: 'shp_sm_excavation',
        name: '1. Foundation Trench Excavation',
        shape_type: 'rectangle',
        color: '#d97706',
        hatch_pattern: 'earth',
        is_visible: true,
        order: 1,
        dimensions: {
          length_param: 'L',
          width_param: 'W_bot + 0.60',
          height_param: 't_pcc + t_soling + 0.30',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * (W_bot + 0.60) * (t_pcc + t_soling + 0.30)',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Earthwork excavation for stone masonry foundation (Width={W_bot+0.6}m, Depth={t_pcc+t_soling+0.3}m)'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 202,
          norm_code: '2.02',
          norm_source: 'Roads Dept. Road Norms (Ch. 2)',
          norm_description: 'Earthwork in excavation for foundation trench of retaining walls',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_sm_soling',
        name: '2. Dry Boulder Stone Soling Bed',
        shape_type: 'rectangle',
        color: '#64748b',
        hatch_pattern: 'stone',
        is_visible: true,
        order: 2,
        dimensions: {
          length_param: 'L',
          width_param: 'W_bot + 0.30',
          height_param: 't_soling',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * (W_bot + 0.30) * t_soling',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Flat boulder stone soling cushion under foundation (Width={W_bot+0.3}m, Th={t_soling}m)'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 301,
          norm_code: '3.01',
          norm_source: 'Standard Building Norms',
          norm_description: 'Dry Flat Stone Soling under foundation bed with hand packing and sand voids filling',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_sm_pcc_bed',
        name: '3. Foundation PCC 1:3:6 Screed Bed',
        shape_type: 'rectangle',
        color: '#0284c7',
        hatch_pattern: 'concrete',
        is_visible: true,
        order: 3,
        dimensions: {
          length_param: 'L',
          width_param: 'W_bot + 0.30',
          height_param: 't_pcc',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * (W_bot + 0.30) * t_pcc',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'PCC 1:3:6 (M10) leveling pad under masonry (Width={W_bot+0.3}m, Th={t_pcc}m)'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 401,
          norm_code: '4.01 A',
          norm_source: 'Standard Building Norms',
          norm_description: 'PCC 1:3:6 (M10) nominal mix in foundation screed bed',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_sm_masonry_body',
        name: '4. Stone Masonry in 1:4 Cement Sand Mortar',
        shape_type: 'trapezoid',
        color: '#b45309',
        hatch_pattern: 'brick',
        is_visible: true,
        order: 4,
        dimensions: {
          length_param: 'L',
          width_param: 'W_top',
          bottom_width_param: 'W_bot',
          height_param: 'H_wall',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * ((W_top + W_bot) / 2) * H_wall',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Random Rubble (RR) stone masonry in 1:4 cement mortar wall body (Top={W_top}m, Bottom={W_bot}m, Height={H_wall}m)'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 801,
          norm_code: '8.01',
          norm_source: 'Roads Dept. Road Norms (Ch. 8)',
          norm_description: 'Random Rubble (RR) stone masonry in 1:4 cement sand mortar in retaining & breast walls',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_sm_plaster',
        name: '5. 12.5mm Cement Mortar Plaster / Pointing (1:4)',
        shape_type: 'compound_layer',
        color: '#10b981',
        hatch_pattern: 'sand',
        is_visible: true,
        order: 5,
        dimensions: {
          length_param: 'L',
          height_param: 'H_wall',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * H_wall',
          quantity_type: 'area',
          unit: 'm2',
          particulars_format: '12.5mm thick cement sand pointing/plaster 1:4 on exposed front face ({L}m x {H_wall}m)'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 901,
          norm_code: '9.01',
          norm_source: 'Standard Building Norms',
          norm_description: '12.5mm thick cement sand plaster 1:4 with neat cement punning',
          base_unit: 'm2'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_sm_coping',
        name: '6. Top Weather Coping PCC 1:2:4 (M15)',
        shape_type: 'rectangle',
        color: '#059669',
        hatch_pattern: 'concrete',
        is_visible: true,
        order: 6,
        dimensions: {
          length_param: 'L',
          width_param: 'W_top',
          height_param: 't_coping',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * W_top * t_coping',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'PCC 1:2:4 (M15) weathering coping on wall crest ({W_top}m x {t_coping}m)'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 402,
          norm_code: '4.01 B',
          norm_source: 'Standard Building Norms',
          norm_description: 'PCC 1:2:4 (M15 Nominal Mix) in coping and weather bands',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'tpl_plum_concrete_wall',
    name: '3. Plum Concrete Wall',
    category: 'Protection Wall',
    description: 'Composite mass concrete gravity wall with 40% plum boulders in 1:3:6 concrete, base pad, soling, excavation & formwork',
    chainage_reference: 'Ch 3+150 to Ch 3+350',
    parameters: {
      L: 10.0,
      No: 1.0,
      H_stem: 2.50,
      W_top: 0.60,
      W_bot: 1.50,
      W_base: 1.80,
      H_base: 0.15,
      t_soling: 0.15
    },
    parameter_defs: [
      { key: 'L', symbol: 'L', label: 'Wall Length (L)', unit: 'm', default_val: 10.0, default_value: 10.0, min: 1.0, max: 1000.0, step: 1.0, description: 'Running length of wall' },
      { key: 'No', symbol: 'No', label: 'Units (No)', unit: 'nos', default_val: 1.0, default_value: 1.0, min: 1.0, max: 10.0, step: 1.0, description: 'Count of wall sections' },
      { key: 'H_stem', symbol: 'H_stem', label: 'Stem Height (H_stem)', unit: 'm', default_val: 2.50, default_value: 2.50, min: 1.0, max: 8.0, step: 0.1, description: 'Height of trapezoidal wall body' },
      { key: 'W_top', symbol: 'W_top', label: 'Crest Width (W_top)', unit: 'm', default_val: 0.60, default_value: 0.60, min: 0.4, max: 1.5, step: 0.05, description: 'Top crest width of wall' },
      { key: 'W_bot', symbol: 'W_bot', label: 'Bottom Width (W_bot)', unit: 'm', default_val: 1.50, default_value: 1.50, min: 0.8, max: 3.5, step: 0.05, description: 'Bottom stem width at footing junction' },
      { key: 'W_base', symbol: 'W_base', label: 'Base Width (W_base)', unit: 'm', default_val: 1.80, default_value: 1.80, min: 1.0, max: 5.0, step: 0.1, description: 'Total footing width' },
      { key: 'H_base', symbol: 'H_base', label: 'Base Depth (H_base)', unit: 'm', default_val: 0.15, default_value: 0.15, min: 0.1, max: 1.0, step: 0.025, description: 'Thickness of foundation PCC pad' },
      { key: 't_soling', symbol: 't_soling', label: 'Soling Bed (t_soling)', unit: 'm', default_val: 0.15, default_value: 0.15, min: 0.1, max: 0.4, step: 0.05, description: 'Boulder soling cushion under footing' }
    ],
    shapes: [
      {
        id: 'shp_pc_excavation',
        name: '1. Foundation Trench Excavation',
        shape_type: 'rectangle',
        color: '#d97706',
        hatch_pattern: 'earth',
        is_visible: true,
        order: 1,
        dimensions: {
          length_param: 'L',
          width_param: 'W_base + 0.60',
          height_param: 'H_base + t_soling + 0.20',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * (W_base + 0.60) * (H_base + t_soling + 0.20)',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Earthwork excavation for plum concrete wall footing (Width={W_base+0.6}m, Depth={H_base+t_soling+0.2}m)'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 202,
          norm_code: '2.02',
          norm_source: 'Roads Dept. Road Norms (Ch. 2)',
          norm_description: 'Earthwork excavation for retaining wall foundation trench',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_pc_soling',
        name: '2. Boulder Stone Soling Bed',
        shape_type: 'rectangle',
        color: '#64748b',
        hatch_pattern: 'stone',
        is_visible: true,
        order: 2,
        dimensions: {
          length_param: 'L',
          width_param: 'W_base',
          height_param: 't_soling',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * W_base * t_soling',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Dry boulder flat soling under retaining wall base (Width={W_base}m, Th={t_soling}m)'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 301,
          norm_code: '3.01',
          norm_source: 'Standard Building Norms',
          norm_description: 'Dry Flat Stone Soling under foundation bed',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_pc_base',
        name: '3. Base Bed PCC 1:3:6 Leveling Pad',
        shape_type: 'rectangle',
        color: '#0284c7',
        hatch_pattern: 'concrete',
        is_visible: true,
        order: 3,
        dimensions: {
          length_param: 'L',
          width_param: 'W_base',
          height_param: 'H_base',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * W_base * H_base',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'PCC 1:3:6 (M10) foundation screed pad ({W_base}m x {H_base}m)'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 401,
          norm_code: '4.01 A',
          norm_source: 'Standard Building Norms',
          norm_description: 'PCC 1:3:6 (M10 Nominal Mix) in foundation footing slab',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_pc_stem',
        name: '4. Plum Concrete (60:40) Wall Stem Body',
        shape_type: 'trapezoid',
        color: '#475569',
        hatch_pattern: 'concrete',
        is_visible: true,
        order: 4,
        dimensions: {
          length_param: 'L',
          width_param: 'W_top',
          bottom_width_param: 'W_bot',
          height_param: 'H_stem',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * ((W_top + W_bot) / 2) * H_stem',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Plum concrete stem body 1:3:6 with 40% boulders (Top={W_top}m, Bottom={W_bot}m, Height={H_stem}m)'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 401,
          norm_code: '4.01 A',
          norm_source: 'Roads Dept. Road Norms',
          norm_description: 'Plum concrete 1:3:6 with 40% clean hard boulders in gravity retaining & breast walls',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_pc_shuttering',
        name: '5. Formwork & Shuttering for Stem',
        shape_type: 'compound_layer',
        color: '#f59e0b',
        hatch_pattern: 'solid',
        is_visible: true,
        order: 5,
        dimensions: {
          length_param: 'L',
          height_param: 'H_stem',
          nos_param: '2 * No'
        },
        mb_formula: {
          expression: '2 * No * L * H_stem',
          quantity_type: 'area',
          unit: 'm2',
          particulars_format: 'Formwork / shuttering for front & back faces (2 sides x {L}m x {H_stem}m)'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 701,
          norm_code: '7.01',
          norm_source: 'Roads Dept. Road Norms (Ch. 7)',
          norm_description: 'Formwork / shuttering centering including propping with plywood/steel plates',
          base_unit: 'm2'
        },
        include_in_mb_export: true
      }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'tpl_trapezoidal_drain',
    name: 'Roads Dept. Standard Trapezoidal Drain (Type B)',
    category: 'Drain',
    description: 'Parametric roadside open drain with soling bed, PCC leveling pad, rubble masonry sidewalls & cement plaster',
    chainage_reference: 'Ch 0+000 to Ch 0+500',
    parameters: {
      L: 50.0,
      No: 1.0,
      B_top: 1.20,
      B_bot: 0.60,
      H_drain: 0.80,
      t_soling: 0.15,
      t_pcc: 0.10,
      t_wall: 0.25,
      t_plaster: 0.015
    },
    parameter_defs: [
      { key: 'L', symbol: 'L', label: 'Length (L)', unit: 'm', default_val: 50.0, default_value: 50.0, min: 1.0, max: 2000.0, step: 1.0, description: 'Running channel reach length' },
      { key: 'No', symbol: 'No', label: 'Side / Units (No)', unit: 'nos', default_val: 1.0, default_value: 1.0, min: 1.0, max: 2.0, step: 1.0, description: '1 for one-side, 2 for both sides' },
      { key: 'B_top', symbol: 'B_top', label: 'Top Width (B_top)', unit: 'm', default_val: 1.20, default_value: 1.20, min: 0.4, max: 3.0, step: 0.05, description: 'Top opening width across inner banks' },
      { key: 'B_bot', symbol: 'B_bot', label: 'Bed Width (B_bot)', unit: 'm', default_val: 0.60, default_value: 0.60, min: 0.3, max: 2.5, step: 0.05, description: 'Bottom invert bed width' },
      { key: 'H_drain', symbol: 'H_drain', label: 'Clear Height (H)', unit: 'm', default_val: 0.80, default_value: 0.80, min: 0.3, max: 2.0, step: 0.05, description: 'Internal clear drain depth' },
      { key: 't_soling', symbol: 't_soling', label: 'Soling Bed (t_soling)', unit: 'm', default_val: 0.15, default_value: 0.15, min: 0.1, max: 0.3, step: 0.05, description: 'Dry boulder soling cushion' },
      { key: 't_pcc', symbol: 't_pcc', label: 'PCC Bed (t_pcc)', unit: 'm', default_val: 0.10, default_value: 0.10, min: 0.05, max: 0.25, step: 0.05, description: 'M10 foundation leveling pad' },
      { key: 't_wall', symbol: 't_wall', label: 'Wall Thickness (t_wall)', unit: 'm', default_val: 0.25, default_value: 0.25, min: 0.15, max: 0.5, step: 0.05, description: 'Masonry sidewall thickness' },
      { key: 't_plaster', symbol: 't_plaster', label: 'Plaster (t_plaster)', unit: 'm', default_val: 0.015, default_value: 0.015, min: 0.01, max: 0.03, step: 0.005, description: '12.5mm neat cement plaster' }
    ],
    shapes: [
      {
        id: 'shp_excavation',
        name: '1. Foundation Trench Excavation',
        shape_type: 'trapezoid',
        color: '#d97706',
        hatch_pattern: 'earth',
        is_visible: true,
        order: 1,
        dimensions: {
          length_param: 'L',
          width_param: 'B_top + 2 * t_wall',
          bottom_width_param: 'B_bot + 2 * t_wall',
          height_param: 'H_drain + t_pcc + t_soling',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * (( (B_top + 2 * t_wall) + (B_bot + 2 * t_wall) ) / 2) * (H_drain + t_pcc + t_soling)',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Earthwork excavation for trapezoidal drain trench (Top={B_top+2*t_wall}m, Bed={B_bot+2*t_wall}m, Depth={H_drain+t_pcc+t_soling}m)'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 202,
          norm_code: '2.02',
          norm_source: 'Roads Dept. Road Norms (Ch. 2)',
          norm_description: 'Earthwork in excavation for foundation trench of drains in all soil types',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_soling',
        name: '2. Dry Flat Stone Soling Bed',
        shape_type: 'rectangle',
        color: '#64748b',
        hatch_pattern: 'stone',
        is_visible: true,
        order: 2,
        dimensions: {
          length_param: 'L',
          width_param: 'B_bot + 2 * t_wall',
          height_param: 't_soling',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * (B_bot + 2 * t_wall) * t_soling',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Flat stone soling under drain bed (Width={B_bot+2*t_wall}m, Th={t_soling}m)'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 301,
          norm_code: '3.01',
          norm_source: 'Standard Building Norms',
          norm_description: 'Dry Flat Stone Soling under foundation bed with hand packing and sand voids filling',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_pcc_bed',
        name: '3. PCC 1:3:6 Foundation Screed Pad',
        shape_type: 'rectangle',
        color: '#0284c7',
        hatch_pattern: 'concrete',
        is_visible: true,
        order: 3,
        dimensions: {
          length_param: 'L',
          width_param: 'B_bot + 2 * t_wall',
          height_param: 't_pcc',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * (B_bot + 2 * t_wall) * t_pcc',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'PCC 1:3:6 in foundation leveling pad (Width={B_bot+2*t_wall}m, Th={t_pcc}m)'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 401,
          norm_code: '4.01 A',
          norm_source: 'Standard Building Norms',
          norm_description: 'PCC 1:3:6 (M10) nominal mix in foundation screed bed',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_masonry_walls',
        name: '4. Stone Masonry 1:4 Side Walls',
        shape_type: 'compound_layer',
        color: '#b45309',
        hatch_pattern: 'brick',
        is_visible: true,
        order: 4,
        dimensions: {
          length_param: 'L',
          width_param: 't_wall',
          height_param: 'H_drain',
          nos_param: '2 * No'
        },
        mb_formula: {
          expression: '2 * No * L * t_wall * H_drain',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Random Rubble (RR) stone masonry 1:4 in drain side walls (2 walls x {t_wall}m x {H_drain}m)'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 801,
          norm_code: '8.01',
          norm_source: 'Roads Dept. Road Norms (Ch. 8)',
          norm_description: 'Random Rubble (RR) stone masonry in 1:4 cement sand mortar in drain sidewalls',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_cement_plaster',
        name: '5. Inside 12.5mm Cement Plaster & Punning',
        shape_type: 'compound_layer',
        color: '#10b981',
        hatch_pattern: 'sand',
        is_visible: true,
        order: 5,
        dimensions: {
          length_param: 'L',
          width_param: 'B_bot + 2 * H_drain',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * (B_bot + 2 * H_drain)',
          quantity_type: 'area',
          unit: 'm2',
          particulars_format: '12.5mm Plaster 1:4 on exposed bed & inside walls (Perimeter={B_bot+2*H_drain}m)'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 901,
          norm_code: '9.01',
          norm_source: 'Standard Building Norms',
          norm_description: '12.5mm thick cement sand plaster 1:4 with neat cement punning',
          base_unit: 'm2'
        },
        include_in_mb_export: true
      }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'tpl_rcc_box_drain',
    name: 'Roadside RCC Box Drain with Slab',
    category: 'Drain',
    description: 'RCC M20 Box drain with bottom slab, side walls, cover slab with rebars & formwork',
    chainage_reference: 'Ch 0+500 to Ch 1+000',
    parameters: {
      L: 20.0,
      No: 1.0,
      B_inner: 0.60,
      H_inner: 0.60,
      t_wall: 0.15,
      t_base: 0.15,
      t_cover: 0.10,
      t_pcc: 0.075,
      t_soling: 0.15
    },
    parameter_defs: [
      { key: 'L', symbol: 'L', label: 'Length (L)', unit: 'm', default_val: 20.0, default_value: 20.0, min: 1.0, max: 1000.0, step: 1.0, description: 'Drain stretch length' },
      { key: 'No', symbol: 'No', label: 'Units (No)', unit: 'nos', default_val: 1.0, default_value: 1.0, min: 1.0, max: 5.0, step: 1.0, description: 'Number of units' },
      { key: 'B_inner', symbol: 'B_inner', label: 'Inner Width (B)', unit: 'm', default_val: 0.60, default_value: 0.60, min: 0.3, max: 2.0, step: 0.05, description: 'Internal clear span width' },
      { key: 'H_inner', symbol: 'H_inner', label: 'Inner Height (H)', unit: 'm', default_val: 0.60, default_value: 0.60, min: 0.3, max: 2.0, step: 0.05, description: 'Internal clear depth' },
      { key: 't_wall', symbol: 't_wall', label: 'Wall Thickness', unit: 'm', default_val: 0.15, default_value: 0.15, min: 0.1, max: 0.4, step: 0.025, description: 'RCC side wall thickness' },
      { key: 't_base', symbol: 't_base', label: 'Base Slab', unit: 'm', default_val: 0.15, default_value: 0.15, min: 0.1, max: 0.4, step: 0.025, description: 'RCC bottom base slab thickness' },
      { key: 't_cover', symbol: 't_cover', label: 'Cover Slab', unit: 'm', default_val: 0.10, default_value: 0.10, min: 0.075, max: 0.3, step: 0.025, description: 'RCC top cover slab thickness' },
      { key: 't_pcc', symbol: 't_pcc', label: 'PCC Bed', unit: 'm', default_val: 0.075, default_value: 0.075, min: 0.05, max: 0.2, step: 0.025, description: 'M10 foundation leveling bed' },
      { key: 't_soling', symbol: 't_soling', label: 'Soling Bed', unit: 'm', default_val: 0.15, default_value: 0.15, min: 0.1, max: 0.3, step: 0.05, description: 'Dry boulder soling cushion' }
    ],
    shapes: [
      {
        id: 'shp_box_excavation',
        name: '1. Foundation Trench Excavation',
        shape_type: 'rectangle',
        color: '#d97706',
        hatch_pattern: 'earth',
        is_visible: true,
        order: 1,
        dimensions: {
          length_param: 'L',
          width_param: 'B_inner + 2 * t_wall + 0.30',
          height_param: 'H_inner + t_base + t_pcc + t_soling',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * (B_inner + 2 * t_wall + 0.30) * (H_inner + t_base + t_pcc + t_soling)',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Excavation for RCC box drain trench'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 202,
          norm_code: '2.02',
          norm_source: 'Roads Dept. Road Norms (Ch. 2)',
          norm_description: 'Earthwork excavation for box drain trench',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_box_soling',
        name: '2. Dry Boulder Flat Soling Bed',
        shape_type: 'rectangle',
        color: '#64748b',
        hatch_pattern: 'stone',
        is_visible: true,
        order: 2,
        dimensions: {
          length_param: 'L',
          width_param: 'B_inner + 2 * t_wall',
          height_param: 't_soling',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * (B_inner + 2 * t_wall) * t_soling',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Soling under box drain bed'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 301,
          norm_code: '3.01',
          norm_source: 'Standard Building Norms',
          norm_description: 'Dry Flat Stone Soling under foundation bed',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_box_rcc_concrete',
        name: '3. RCC M20 (1:1.5:3) Box Structure Body',
        shape_type: 'compound_layer',
        color: '#4338ca',
        hatch_pattern: 'concrete',
        is_visible: true,
        order: 3,
        dimensions: {
          length_param: 'L',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * ( ((B_inner + 2 * t_wall) * t_base) + (2 * t_wall * H_inner) + ((B_inner + 2 * t_wall) * t_cover) )',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'RCC M20 (1:1.5:3) in box drain base, walls & cover slab'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 501,
          norm_code: '5.01',
          norm_source: 'Roads Dept. Specifications',
          norm_description: 'RCC M20 (1:1.5:3) nominal mix in box structures',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'tpl_hume_pipe_culvert',
    name: 'NP3 RCC Hume Pipe Culvert (Dia 900mm)',
    category: 'Culvert',
    description: 'Cross drainage NP3 reinforced concrete pipe culvert with bedding cradle, headwalls, and backfilling',
    chainage_reference: 'Ch 4+320 Cross Drainage',
    parameters: {
      L: 12.0,
      No: 1.0,
      D_pipe: 0.90,
      t_pipe: 0.08,
      W_trench: 1.60,
      H_trench: 1.80,
      t_bedding: 0.20
    },
    parameter_defs: [
      { key: 'L', symbol: 'L', label: 'Culvert Length (L)', unit: 'm', default_val: 12.0, default_value: 12.0, min: 2.0, max: 50.0, step: 0.5, description: 'Barrel length across road formation' },
      { key: 'No', symbol: 'No', label: 'No. of Rows (No)', unit: 'nos', default_val: 1.0, default_value: 1.0, min: 1.0, max: 3.0, step: 1.0, description: 'Single or double row culvert' },
      { key: 'D_pipe', symbol: 'D_pipe', label: 'Internal Dia (D)', unit: 'm', default_val: 0.90, default_value: 0.90, min: 0.6, max: 1.5, step: 0.15, description: 'NP3 internal barrel diameter' },
      { key: 't_pipe', symbol: 't_pipe', label: 'Pipe Thickness (t)', unit: 'm', default_val: 0.08, default_value: 0.08, min: 0.05, max: 0.15, step: 0.01, description: 'Precast barrel wall thickness' },
      { key: 'W_trench', symbol: 'W_trench', label: 'Trench Width (W)', unit: 'm', default_val: 1.60, default_value: 1.60, min: 1.0, max: 3.0, step: 0.1, description: 'Excavation width for cradle' },
      { key: 'H_trench', symbol: 'H_trench', label: 'Trench Depth (H)', unit: 'm', default_val: 1.80, default_value: 1.80, min: 1.0, max: 4.0, step: 0.1, description: 'Total depth from road level' },
      { key: 't_bedding', symbol: 't_bedding', label: 'PCC Bedding (t_bed)', unit: 'm', default_val: 0.20, default_value: 0.20, min: 0.1, max: 0.4, step: 0.05, description: 'M15 concrete cradle support' }
    ],
    shapes: [
      {
        id: 'shp_pipe_excavation',
        name: '1. Trench Excavation for Culvert',
        shape_type: 'rectangle',
        color: '#d97706',
        hatch_pattern: 'earth',
        is_visible: true,
        order: 1,
        dimensions: {
          length_param: 'L',
          width_param: 'W_trench',
          height_param: 'H_trench',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * W_trench * H_trench',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'Excavation for pipe culvert trench ({W_trench}m x {H_trench}m)'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 202,
          norm_code: '2.02',
          norm_source: 'Roads Dept. Road Norms (Ch. 2)',
          norm_description: 'Earthwork excavation for culvert foundation trench',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_pipe_cradle',
        name: '2. Concrete Cradle Bedding M15 (1:2:4)',
        shape_type: 'rectangle',
        color: '#0284c7',
        hatch_pattern: 'concrete',
        is_visible: true,
        order: 2,
        dimensions: {
          length_param: 'L',
          width_param: 'W_trench',
          height_param: 't_bedding',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L * W_trench * t_bedding',
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: 'PCC 1:2:4 bedding cradle under NP3 pipe'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 402,
          norm_code: '4.01 B',
          norm_source: 'Standard Building Norms',
          norm_description: 'PCC 1:2:4 (M15 Nominal Mix) in bedding cradle',
          base_unit: 'm3'
        },
        include_in_mb_export: true
      },
      {
        id: 'shp_pipe_barrel',
        name: '3. NP3 Precast RCC Pipe (Dia 900mm)',
        shape_type: 'circle',
        color: '#475569',
        hatch_pattern: 'solid',
        is_visible: true,
        order: 3,
        dimensions: {
          length_param: 'L',
          width_param: 'D_pipe',
          height_param: 'D_pipe',
          nos_param: 'No'
        },
        mb_formula: {
          expression: 'No * L',
          quantity_type: 'length',
          unit: 'm',
          particulars_format: 'Supplying, laying & jointing NP3 Hume Pipe dia {D_pipe}m'
        },
        norm_mapping: {
          is_mapped: true,
          norm_id: 501,
          norm_code: '5.01',
          norm_source: 'Roads Dept. Specifications',
          norm_description: 'Supplying and laying NP3 RCC pipe barrel',
          base_unit: 'm'
        },
        include_in_mb_export: true
      }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export interface TemplateEditorViewProps {
  project?: ProjectEstimate;
  setProject?: React.Dispatch<React.SetStateAction<ProjectEstimate>>;
  selectedZone?: ZoneInfo;
  selectedFY?: string;
  norms?: RateNormItem[];
  resources?: ResourceMaster[];
  onNavigateToTab?: (tab: string) => void;
  onPushToMB?: (items: TemplateWorkItemOutput[]) => void;
}

export const TemplateEditorView: React.FC<TemplateEditorViewProps> = ({
  project,
  setProject,
  selectedZone,
  selectedFY = '2026/27',
  norms = [],
  resources = [],
  onNavigateToTab,
  onPushToMB
}) => {
  // Available rate norms
  const activeNorms = useMemo(() => {
    return norms && norms.length > 0 ? norms : DEFAULT_TEMPLATE_CIVIL_NORMS;
  }, [norms]);

  // Custom Templates Storage & Defaults State
  const [customTemplates, setCustomTemplates] = useState<VisualGeometryModel[]>(() => {
    return loadUserCustomTemplates();
  });

  const [defaultTemplateIds, setDefaultTemplateIds] = useState<string[]>(() => {
    return getDefaultTemplateIds();
  });

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importJsonInput, setImportJsonInput] = useState<string>('');

  const [newTemplateFormData, setNewTemplateFormData] = useState<{
    name: string;
    category: VisualGeometryModel['category'];
    description: string;
    chainage_reference: string;
    archetype: 'rcc_l_wall' | 'stone_masonry_wall' | 'plum_concrete_wall' | 'trapezoidal_drain' | 'rcc_box' | 'blank';
  }>({
    name: 'Custom RCC Protection Wall',
    category: 'Protection Wall',
    description: 'Custom site-specific geometry template with parametric quantities and norms',
    chainage_reference: 'Ch 0+000 to Ch 0+100',
    archetype: 'rcc_l_wall'
  });

  // Merged List of all Built-in and Custom Templates
  const allTemplates = useMemo<VisualGeometryModel[]>(() => {
    return [...BUILTIN_CIVIL_TEMPLATES, ...customTemplates];
  }, [customTemplates]);

  // Filtered Templates according to active category tab
  const filteredTemplates = useMemo<VisualGeometryModel[]>(() => {
    if (categoryFilter === 'all') return allTemplates;
    if (categoryFilter === 'defaults') {
      return allTemplates.filter(t => defaultTemplateIds.includes(t.id));
    }
    if (categoryFilter === 'custom') {
      return allTemplates.filter(t => t.is_custom === true);
    }
    return allTemplates.filter(t => t.category === categoryFilter);
  }, [allTemplates, categoryFilter, defaultTemplateIds]);

  // Current Template Model State
  const [activeModel, setActiveModel] = useState<VisualGeometryModel>(() => {
    const custom = loadUserCustomTemplates();
    const defaults = getDefaultTemplateIds();
    const defaultTemplate = [...BUILTIN_CIVIL_TEMPLATES, ...custom].find(t => defaults.includes(t.id));
    return JSON.parse(JSON.stringify(defaultTemplate || BUILTIN_CIVIL_TEMPLATES[0]));
  });

  // Selected Shape ID inside the template for editing
  const [selectedShapeId, setSelectedShapeId] = useState<string>(() => {
    return activeModel.shapes[0]?.id || '';
  });

  // Canvas Viewport Transforms
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showDimensionLabels, setShowDimensionLabels] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'section' | 'isometric'>('section');
  const [isMBDrawerOpen, setIsMBDrawerOpen] = useState<boolean>(false);

  // Search & Filter Norms Modal
  const [isNormSearchModalOpen, setIsNormSearchModalOpen] = useState<boolean>(false);
  const [normSearchQuery, setNormSearchQuery] = useState<string>('');
  const [targetShapeForNormMapping, setTargetShapeForNormMapping] = useState<string | null>(null);

  // Status message
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const svgCanvasRef = useRef<SVGSVGElement | null>(null);

  const showStatus = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Toggle Default status of template
  const handleToggleDefault = (templateId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isNowDefault = toggleDefaultTemplateStatus(templateId);
    setDefaultTemplateIds(getDefaultTemplateIds());
    showStatus(
      isNowDefault ? '⭐ Marked as Default Template' : 'Removed from Default Templates',
      'info'
    );
  };

  // Save current active model as Custom Template
  const handleSaveActiveAsCustom = () => {
    const isExistingCustom = activeModel.is_custom === true;
    const modelToSave: VisualGeometryModel = {
      ...activeModel,
      id: isExistingCustom ? activeModel.id : `custom_tpl_${Date.now()}`,
      is_custom: true,
      updated_at: new Date().toISOString()
    };

    saveOrUpdateCustomTemplate(modelToSave);
    const updatedCustoms = loadUserCustomTemplates();
    setCustomTemplates(updatedCustoms);
    setActiveModel(modelToSave);
    showStatus(`💾 Template "${modelToSave.name}" saved to Custom Templates!`, 'success');
  };

  // Duplicate current template as a new editable custom template
  const handleDuplicateActiveTemplate = () => {
    const newId = `custom_tpl_${Date.now()}`;
    const duplicated: VisualGeometryModel = {
      ...JSON.parse(JSON.stringify(activeModel)),
      id: newId,
      name: `${activeModel.name} (Custom Copy)`,
      is_custom: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    saveOrUpdateCustomTemplate(duplicated);
    const updatedCustoms = loadUserCustomTemplates();
    setCustomTemplates(updatedCustoms);
    setActiveModel(duplicated);
    setSelectedShapeId(duplicated.shapes[0]?.id || '');
    showStatus(`📋 Duplicated as Custom Template "${duplicated.name}"`, 'success');
  };

  // Delete a custom template
  const handleDeleteCustomTemplate = (templateId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = customTemplates.find(t => t.id === templateId);
    if (!target) return;

    if (!window.confirm(`Are you sure you want to delete custom template "${target.name}"?`)) {
      return;
    }

    deleteUserCustomTemplate(templateId);
    const updatedCustoms = loadUserCustomTemplates();
    setCustomTemplates(updatedCustoms);
    setDefaultTemplateIds(getDefaultTemplateIds());

    if (activeModel.id === templateId) {
      const fallback = BUILTIN_CIVIL_TEMPLATES[0];
      setActiveModel(JSON.parse(JSON.stringify(fallback)));
      setSelectedShapeId(fallback.shapes[0]?.id || '');
    }
    showStatus(`🗑️ Deleted custom template "${target.name}"`, 'info');
  };

  // Create New Custom Template from Modal
  const handleCreateNewTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let baseTemplate: VisualGeometryModel;

    switch (newTemplateFormData.archetype) {
      case 'rcc_l_wall':
        baseTemplate = JSON.parse(JSON.stringify(BUILTIN_CIVIL_TEMPLATES[0]));
        break;
      case 'stone_masonry_wall':
        baseTemplate = JSON.parse(JSON.stringify(BUILTIN_CIVIL_TEMPLATES[1]));
        break;
      case 'plum_concrete_wall':
        baseTemplate = JSON.parse(JSON.stringify(BUILTIN_CIVIL_TEMPLATES[2]));
        break;
      case 'trapezoidal_drain':
        baseTemplate = JSON.parse(JSON.stringify(BUILTIN_CIVIL_TEMPLATES[3]));
        break;
      case 'rcc_box':
        baseTemplate = JSON.parse(JSON.stringify(BUILTIN_CIVIL_TEMPLATES[4]));
        break;
      case 'blank':
      default:
        baseTemplate = {
          id: '',
          name: '',
          category: newTemplateFormData.category,
          description: '',
          chainage_reference: newTemplateFormData.chainage_reference,
          parameters: { L: 10.0, No: 1.0, W: 1.5, H: 2.0 },
          parameter_defs: [
            { key: 'L', symbol: 'L', label: 'Length (L)', unit: 'm', default_val: 10.0, default_value: 10.0, min: 1.0, max: 500.0, step: 1.0, description: 'Structure length' },
            { key: 'No', symbol: 'No', label: 'Units (No)', unit: 'nos', default_val: 1.0, default_value: 1.0, min: 1.0, max: 10.0, step: 1.0, description: 'Number of units' },
            { key: 'W', symbol: 'W', label: 'Width (W)', unit: 'm', default_val: 1.5, default_value: 1.5, min: 0.2, max: 10.0, step: 0.1, description: 'Section width' },
            { key: 'H', symbol: 'H', label: 'Height (H)', unit: 'm', default_val: 2.0, default_value: 2.0, min: 0.2, max: 10.0, step: 0.1, description: 'Section height' }
          ],
          shapes: [
            {
              id: 'shp_layer_1',
              name: '1. Foundation Trench Excavation',
              shape_type: 'rectangle',
              color: '#d97706',
              hatch_pattern: 'earth',
              is_visible: true,
              order: 1,
              dimensions: { length_param: 'L', width_param: 'W', height_param: 'H', nos_param: 'No' },
              mb_formula: {
                expression: 'No * L * W * H',
                quantity_type: 'volume',
                unit: 'm3',
                particulars_format: 'Excavation for structure ({W}m x {H}m)'
              },
              norm_mapping: { is_mapped: true, norm_id: 202, norm_code: '2.02', norm_source: 'Roads Dept. Road Norms (Ch. 2)', norm_description: 'Earthwork excavation', base_unit: 'm3' },
              include_in_mb_export: true
            }
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        break;
    }

    const newCustom: VisualGeometryModel = {
      ...baseTemplate,
      id: `custom_tpl_${Date.now()}`,
      name: newTemplateFormData.name.trim() || 'Custom Drawing Template',
      category: newTemplateFormData.category,
      description: newTemplateFormData.description.trim() || 'User-defined template drawing',
      chainage_reference: newTemplateFormData.chainage_reference.trim() || 'Ch 0+000',
      is_custom: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    saveOrUpdateCustomTemplate(newCustom);
    const updatedCustoms = loadUserCustomTemplates();
    setCustomTemplates(updatedCustoms);
    setActiveModel(newCustom);
    setSelectedShapeId(newCustom.shapes[0]?.id || '');
    setIsNewTemplateModalOpen(false);
    showStatus(`✨ Created new custom template "${newCustom.name}"!`, 'success');
  };

  // Export Templates as JSON
  const handleExportTemplatesJSON = () => {
    exportTemplatesToJSON(allTemplates, `civil_templates_export_${new Date().toISOString().slice(0, 10)}.json`);
    showStatus('📤 Exported templates JSON backup!', 'success');
  };

  // Import Templates from JSON
  const handleImportTemplatesJSONSubmit = () => {
    if (!importJsonInput.trim()) return;
    try {
      const imported = parseAndImportTemplatesJSON(importJsonInput);
      setCustomTemplates(loadUserCustomTemplates());
      setDefaultTemplateIds(getDefaultTemplateIds());
      setIsImportModalOpen(false);
      setImportJsonInput('');
      showStatus(`📥 Successfully imported ${imported.length} custom templates!`, 'success');
    } catch (err: any) {
      showStatus(`❌ Import failed: ${err?.message || 'Invalid format'}`, 'error');
    }
  };

  // Currently Selected Shape Object
  const selectedShape = useMemo(() => {
    return activeModel.shapes.find(s => s.id === selectedShapeId) || activeModel.shapes[0] || null;
  }, [activeModel.shapes, selectedShapeId]);

  // Safe Parameter Expression Evaluator
  const evaluateMathExpression = (expr: string, params: Record<string, number>): number => {
    if (!expr || typeof expr !== 'string') return 0;
    try {
      let cleaned = expr.trim();
      const sortedKeys = Object.keys(params).sort((a, b) => b.length - a.length);
      for (const key of sortedKeys) {
        const val = params[key] ?? 0;
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        cleaned = cleaned.replace(regex, `(${val})`);
      }
      if (/[^0-9\.\+\-\*\/\(\)\s\,eE]/.test(cleaned)) {
        return 0;
      }
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${cleaned})`)();
      return typeof result === 'number' && !isNaN(result) && isFinite(result) ? result : 0;
    } catch {
      return 0;
    }
  };

  // Interpolate particulars string with computed parameter values
  const interpolateParticulars = (format: string, params: Record<string, number>): string => {
    if (!format) return '';
    return format.replace(/\{([^}]+)\}/g, (_, expression) => {
      const val = evaluateMathExpression(expression, params);
      return Number(val.toFixed(2)).toString();
    });
  };

  // Computed Quantities for all shapes in the active model
  const calculatedItems = useMemo(() => {
    return activeModel.shapes.map(shape => {
      const params = activeModel.parameters;
      const quantity = evaluateMathExpression(shape.mb_formula.expression, params);
      const particulars = interpolateParticulars(shape.mb_formula.particulars_format, params);
      
      // Calculate estimated cost if norm is mapped
      let estimatedRate = 0;
      if (shape.norm_mapping?.is_mapped && shape.norm_mapping.norm_id) {
        const norm = activeNorms.find(n => n.item_id === shape.norm_mapping?.norm_id || n.code === shape.norm_mapping?.norm_code);
        if (norm) {
          estimatedRate = norm.resources.reduce((sum, res) => {
            const masterRes = resources.find(r => r.resource_id === res.resource_id);
            const rate = masterRes?.zone_rates?.[selectedZone?.id || ''] || masterRes?.default_rate || 550;
            return sum + (res.quantity_per_base_unit * rate);
          }, 0);
          estimatedRate = estimatedRate * 1.15; // Contractor OH & profit
        }
      }

      if (estimatedRate === 0) {
        // Sensible fallback estimate
        estimatedRate = shape.mb_formula.unit === 'm3' ? 3850 : shape.mb_formula.unit === 'm2' ? 420 : 1200;
      }

      const totalAmount = quantity * estimatedRate;

      return {
        shape,
        quantity: Math.max(0, quantity),
        unit: shape.mb_formula.unit,
        particulars,
        estimatedRate,
        totalAmount
      };
    });
  }, [activeModel, activeNorms, resources, selectedZone]);

  // Overall Totals
  const totalSummary = useMemo(() => {
    const totalVolume = calculatedItems
      .filter(i => i.unit === 'm3')
      .reduce((sum, i) => sum + i.quantity, 0);
    const totalArea = calculatedItems
      .filter(i => i.unit === 'm2')
      .reduce((sum, i) => sum + i.quantity, 0);
    const totalCost = calculatedItems
      .reduce((sum, i) => sum + i.totalAmount, 0);

    return {
      totalVolume,
      totalArea,
      totalCost,
      mappedCount: activeModel.shapes.filter(s => s.norm_mapping?.is_mapped).length,
      totalShapes: activeModel.shapes.length
    };
  }, [calculatedItems, activeModel.shapes]);

  // Update Parameter Value
  const handleUpdateParameter = (key: string, value: number) => {
    setActiveModel(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [key]: Math.max(0, value)
      },
      updated_at: new Date().toISOString()
    }));
  };

  // Adjust parameter by delta
  const handleStepParameter = (key: string, delta: number) => {
    const current = activeModel.parameters[key] ?? 1.0;
    const newVal = Math.max(0, Number((current + delta).toFixed(3)));
    handleUpdateParameter(key, newVal);
  };

  // Update Shape Property
  const handleUpdateShapeField = (shapeId: string, updates: Partial<VisualGeometricShape>) => {
    setActiveModel(prev => ({
      ...prev,
      shapes: prev.shapes.map(s => (s.id === shapeId ? { ...s, ...updates } : s)),
      updated_at: new Date().toISOString()
    }));
  };

  // Duplicate Shape
  const handleDuplicateShape = (shapeId: string) => {
    const target = activeModel.shapes.find(s => s.id === shapeId);
    if (!target) return;
    const cloned: VisualGeometricShape = {
      ...JSON.parse(JSON.stringify(target)),
      id: `shape_${Date.now()}`,
      name: `${target.name} (Copy)`,
      order: activeModel.shapes.length + 1
    };
    setActiveModel(prev => ({
      ...prev,
      shapes: [...prev.shapes, cloned],
      updated_at: new Date().toISOString()
    }));
    setSelectedShapeId(cloned.id);
    showStatus(`Duplicated "${target.name}".`);
  };

  // Delete Shape
  const handleDeleteShape = (shapeId: string) => {
    if (activeModel.shapes.length <= 1) {
      alert('A template model must have at least one construction element.');
      return;
    }
    setActiveModel(prev => ({
      ...prev,
      shapes: prev.shapes.filter(s => s.id !== shapeId),
      updated_at: new Date().toISOString()
    }));
    const remaining = activeModel.shapes.filter(s => s.id !== shapeId);
    setSelectedShapeId(remaining[0]?.id || '');
    showStatus('Element deleted.');
  };

  // Add New Element
  const handleAddShape = (shapeType: GeometricShapeType = 'rectangle') => {
    handleInjectShapePreset(shapeType === 'trapezoid' ? 'trapezoid' : shapeType === 'triangle' ? 'triangle' : 'rectangle');
  };

  // Inject Geometric Shape Preset (Rectangle, Trapezoid, Triangle) with default dimensions & SVG path bindings
  const handleInjectShapePreset = (presetType: 'rectangle' | 'trapezoid' | 'triangle') => {
    const existingParams = { ...activeModel.parameters };
    const newParamDefs = [...activeModel.parameter_defs];

    // Ensure common length & units exist
    if (existingParams['L'] === undefined) {
      existingParams['L'] = 10.0;
      if (!newParamDefs.some(d => d.key === 'L')) {
        newParamDefs.push({
          key: 'L',
          symbol: 'L',
          label: 'Length (L)',
          unit: 'm',
          default_val: 10.0,
          default_value: 10.0,
          min: 1.0,
          max: 2000.0,
          step: 1.0,
          description: 'Running Reach Length'
        });
      }
    }
    if (existingParams['No'] === undefined) {
      existingParams['No'] = 1.0;
      if (!newParamDefs.some(d => d.key === 'No')) {
        newParamDefs.push({
          key: 'No',
          symbol: 'No',
          label: 'Units (No)',
          unit: 'nos',
          default_val: 1.0,
          default_value: 1.0,
          min: 1.0,
          max: 50.0,
          step: 1.0,
          description: 'Number of Units / Sides'
        });
      }
    }

    let newShape: VisualGeometricShape;

    if (presetType === 'rectangle') {
      // Check existing width / height parameters or establish standard
      let widthKey = 'W_rect';
      let heightKey = 'H_rect';

      if (existingParams['W_rect'] === undefined && existingParams['W'] === undefined && existingParams['B_bot'] === undefined) {
        existingParams['W_rect'] = 1.00;
        newParamDefs.push({
          key: 'W_rect',
          symbol: 'W',
          label: 'Rect Width (W)',
          unit: 'm',
          default_val: 1.00,
          default_value: 1.00,
          min: 0.1,
          max: 10.0,
          step: 0.05,
          description: 'Width of rectangular cross-section'
        });
      } else {
        widthKey = existingParams['W_rect'] !== undefined ? 'W_rect' : existingParams['W'] !== undefined ? 'W' : 'B_bot';
      }

      if (existingParams['H_rect'] === undefined && existingParams['H'] === undefined && existingParams['t_pcc'] === undefined) {
        existingParams['H_rect'] = 0.50;
        newParamDefs.push({
          key: 'H_rect',
          symbol: 'H',
          label: 'Rect Height (H)',
          unit: 'm',
          default_val: 0.50,
          default_value: 0.50,
          min: 0.05,
          max: 10.0,
          step: 0.05,
          description: 'Height/depth of rectangular cross-section'
        });
      } else {
        heightKey = existingParams['H_rect'] !== undefined ? 'H_rect' : existingParams['H'] !== undefined ? 'H' : 't_pcc';
      }

      newShape = {
        id: `shp_rect_${Date.now()}`,
        name: `${activeModel.shapes.length + 1}. Rectangle (${widthKey} × ${heightKey})`,
        shape_type: 'rectangle',
        color: '#0ea5e9',
        hatch_pattern: 'concrete',
        is_visible: true,
        order: activeModel.shapes.length + 1,
        dimensions: {
          length_param: 'L',
          width_param: widthKey,
          height_param: heightKey,
          nos_param: 'No'
        },
        mb_formula: {
          expression: `No * L * ${widthKey} * ${heightKey}`,
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: `Rectangular block section ({L}m x {${widthKey}}m x {${heightKey}}m)`
        },
        norm_mapping: {
          is_mapped: false
        },
        include_in_mb_export: true
      };

      showStatus(`Injected Rectangle Preset (Width: ${(existingParams[widthKey] || 1.0).toFixed(2)}m, Height: ${(existingParams[heightKey] || 0.5).toFixed(2)}m) into canvas.`);
    } else if (presetType === 'trapezoid') {
      let topKey = 'W_top';
      let botKey = 'W_bot';
      let heightKey = 'H_trap';

      if (existingParams['W_top'] === undefined && existingParams['B_top'] === undefined) {
        existingParams['W_top'] = 1.20;
        newParamDefs.push({
          key: 'W_top',
          symbol: 'W_top',
          label: 'Top Width (W_top)',
          unit: 'm',
          default_val: 1.20,
          default_value: 1.20,
          min: 0.2,
          max: 10.0,
          step: 0.05,
          description: 'Top width across trapezoid'
        });
      } else {
        topKey = existingParams['W_top'] !== undefined ? 'W_top' : 'B_top';
      }

      if (existingParams['W_bot'] === undefined && existingParams['B_bot'] === undefined) {
        existingParams['W_bot'] = 0.60;
        newParamDefs.push({
          key: 'W_bot',
          symbol: 'W_bot',
          label: 'Bottom Width (W_bot)',
          unit: 'm',
          default_val: 0.60,
          default_value: 0.60,
          min: 0.1,
          max: 10.0,
          step: 0.05,
          description: 'Bottom invert width of trapezoid'
        });
      } else {
        botKey = existingParams['W_bot'] !== undefined ? 'W_bot' : 'B_bot';
      }

      if (existingParams['H_trap'] === undefined && existingParams['H_drain'] === undefined && existingParams['H_stem'] === undefined) {
        existingParams['H_trap'] = 0.80;
        newParamDefs.push({
          key: 'H_trap',
          symbol: 'H',
          label: 'Trapezoid Height (H)',
          unit: 'm',
          default_val: 0.80,
          default_value: 0.80,
          min: 0.1,
          max: 10.0,
          step: 0.05,
          description: 'Vertical height of trapezoid'
        });
      } else {
        heightKey = existingParams['H_trap'] !== undefined ? 'H_trap' : existingParams['H_drain'] !== undefined ? 'H_drain' : 'H_stem';
      }

      newShape = {
        id: `shp_trap_${Date.now()}`,
        name: `${activeModel.shapes.length + 1}. Trapezoid (${topKey} / ${botKey} × ${heightKey})`,
        shape_type: 'trapezoid',
        color: '#f59e0b',
        hatch_pattern: 'earth',
        is_visible: true,
        order: activeModel.shapes.length + 1,
        dimensions: {
          length_param: 'L',
          width_param: topKey,
          bottom_width_param: botKey,
          height_param: heightKey,
          nos_param: 'No'
        },
        mb_formula: {
          expression: `No * L * ((${topKey} + ${botKey}) / 2) * ${heightKey}`,
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: `Trapezoidal cross-section (Top={${topKey}}m, Bot={${botKey}}m, H={${heightKey}}m)`
        },
        norm_mapping: {
          is_mapped: false
        },
        include_in_mb_export: true
      };

      showStatus(`Injected Trapezoid Preset (Top: ${(existingParams[topKey] || 1.2).toFixed(2)}m, Bottom: ${(existingParams[botKey] || 0.6).toFixed(2)}m, Height: ${(existingParams[heightKey] || 0.8).toFixed(2)}m) into canvas.`);
    } else {
      // Triangle preset
      let baseKey = 'W_base';
      let heightKey = 'H_tri';

      if (existingParams['W_base'] === undefined) {
        existingParams['W_base'] = 0.80;
        newParamDefs.push({
          key: 'W_base',
          symbol: 'W_base',
          label: 'Base Width (W_base)',
          unit: 'm',
          default_val: 0.80,
          default_value: 0.80,
          min: 0.1,
          max: 10.0,
          step: 0.05,
          description: 'Base width of triangular cross-section'
        });
      }

      if (existingParams['H_tri'] === undefined) {
        existingParams['H_tri'] = 0.60;
        newParamDefs.push({
          key: 'H_tri',
          symbol: 'H',
          label: 'Triangle Height (H)',
          unit: 'm',
          default_val: 0.60,
          default_value: 0.60,
          min: 0.05,
          max: 10.0,
          step: 0.05,
          description: 'Vertical height of triangular cross-section'
        });
      }

      newShape = {
        id: `shp_tri_${Date.now()}`,
        name: `${activeModel.shapes.length + 1}. Triangle Wedge (${baseKey} × ${heightKey})`,
        shape_type: 'triangle',
        color: '#10b981',
        hatch_pattern: 'stone',
        is_visible: true,
        order: activeModel.shapes.length + 1,
        dimensions: {
          length_param: 'L',
          width_param: baseKey,
          height_param: heightKey,
          nos_param: 'No'
        },
        mb_formula: {
          expression: `No * L * (0.5 * ${baseKey} * ${heightKey})`,
          quantity_type: 'volume',
          unit: 'm3',
          particulars_format: `Triangular section (Base={${baseKey}}m, H={${heightKey}}m)`
        },
        norm_mapping: {
          is_mapped: false
        },
        include_in_mb_export: true
      };

      showStatus(`Injected Triangle Preset (Base: ${(existingParams[baseKey] || 0.8).toFixed(2)}m, Height: ${(existingParams[heightKey] || 0.6).toFixed(2)}m) into canvas.`);
    }

    setActiveModel(prev => ({
      ...prev,
      parameters: existingParams,
      parameter_defs: newParamDefs,
      shapes: [...prev.shapes, newShape],
      updated_at: new Date().toISOString()
    }));
    setSelectedShapeId(newShape.id);
  };

  // Map Norm Item
  const handleApplyNormMapping = (norm: RateNormItem) => {
    if (!targetShapeForNormMapping) return;
    handleUpdateShapeField(targetShapeForNormMapping, {
      norm_mapping: {
        is_mapped: true,
        norm_id: norm.item_id,
        norm_code: norm.code,
        norm_source: norm.source,
        norm_description: norm.description,
        base_unit: norm.base_unit
      },
      mb_formula: {
        ...selectedShape?.mb_formula,
        unit: norm.base_unit || 'm3',
        expression: selectedShape?.mb_formula.expression || 'No * L * B_top * H_drain',
        quantity_type: norm.base_unit === 'm2' ? 'area' : norm.base_unit === 'm' ? 'length' : 'volume'
      }
    });
    setIsNormSearchModalOpen(false);
    setTargetShapeForNormMapping(null);
    showStatus(`Mapped Norm ${norm.code} successfully!`);
  };

  // Push to Measurement Book (MB)
  const handlePushToProjectMB = () => {
    const itemsToExport = calculatedItems.filter(i => i.shape.include_in_mb_export);
    if (itemsToExport.length === 0) {
      alert('Please check at least one item marked "In MB" to export.');
      return;
    }

    if (onPushToMB) {
      const templateOutputs: TemplateWorkItemOutput[] = itemsToExport.map((item, idx) => ({
        id: item.shape.id,
        item_name: item.shape.name,
        item_code_hint: item.shape.norm_mapping?.norm_code || 'GEN-01',
        dor_item_no: item.shape.norm_mapping?.norm_code || `DWG-${idx + 1}`,
        unit: item.unit,
        calc_formula_desc: item.shape.mb_formula.expression,
        calculated_quantity: item.quantity,
        unit_rate_qty: 1,
        no_of_units: 1,
        length_val: 1,
        breadth_val: 1,
        height_val: 1,
        particulars_template: item.particulars,
        remarks: item.shape.mb_formula.remarks || `Visual Model: ${activeModel.name}`,
        category: 'Excavation'
      }));
      onPushToMB(templateOutputs);
    }

    if (setProject && project) {
      setProject(prev => {
        const updatedItems = [...prev.items];
        itemsToExport.forEach((item, idx) => {
          const p = activeModel.parameters;
          const lengthVal = evaluateMathExpression(item.shape.dimensions.length_param || 'L', p) || p.L || 1;
          const widthVal = evaluateMathExpression(item.shape.dimensions.width_param || 'B_top', p) || 1;
          const heightVal = evaluateMathExpression(item.shape.dimensions.height_param || 'H_drain', p) || 1;
          const nosVal = evaluateMathExpression(item.shape.dimensions.nos_param || 'No', p) || 1;

          const newMBRow: MBRow = {
            id: `mb_tpl_${Date.now()}_${idx}`,
            particulars: `${activeModel.chainage_reference}: ${item.particulars || item.shape.name}`,
            no_of_units: Number(nosVal.toFixed(2)),
            length: Number(lengthVal.toFixed(2)),
            breadth: Number(widthVal.toFixed(2)),
            height: Number(heightVal.toFixed(2)),
            quantity: Number(item.quantity.toFixed(3)),
            remarks: `From Visual Model: ${activeModel.name}`,
            formula: item.shape.mb_formula.expression
          };

          const existingIdx = updatedItems.findIndex(
            it => it.description.toLowerCase() === item.shape.name.toLowerCase() ||
                  (item.shape.norm_mapping?.norm_code && it.code === item.shape.norm_mapping.norm_code)
          );

          if (existingIdx >= 0) {
            const existing = updatedItems[existingIdx];
            const updatedRows = [...(existing.mb_rows || []), newMBRow];
            const newTotal = parseFloat(updatedRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0).toFixed(3));
            const effRate = existing.calculated_unit_rate || existing.user_rate || item.estimatedRate;
            updatedItems[existingIdx] = {
              ...existing,
              estimated_quantity: newTotal,
              total_amount: Math.round(newTotal * effRate * 100) / 100,
              mb_rows: updatedRows
            };
          } else {
            const rate = item.estimatedRate > 0 ? item.estimatedRate : 1200;
            updatedItems.push({
              id: `item_tpl_${Date.now()}_${idx}`,
              item_id: Date.now() + idx,
              item_code: item.shape.norm_mapping?.norm_code || `DWG-${idx + 1}`,
              code: item.shape.norm_mapping?.norm_code || `DWG-${idx + 1}`,
              description: item.shape.name,
              unit: item.unit,
              estimated_quantity: item.quantity,
              calculated_unit_rate: rate,
              user_rate: rate,
              total_amount: Math.round(item.quantity * rate * 100) / 100,
              chapter: `${activeModel.category} Works`,
              mb_rows: [newMBRow]
            });
          }
        });

        return {
          ...prev,
          items: updatedItems,
          updated_at: new Date().toISOString()
        };
      });
    }

    showStatus(`Successfully pushed ${itemsToExport.length} item(s) to Measurement Book (MB)!`);
    if (onNavigateToTab) {
      setTimeout(() => {
        if (confirm('Items pushed to MB successfully! Would you like to view the Measurement Book now?')) {
          onNavigateToTab('measurement-book');
        }
      }, 300);
    }
  };

  // Export DXF
  const handleExportDXF = () => {
    try {
      const dxfContent = generateCADSectionDXF(
        {
          id: activeModel.id,
          name: activeModel.name,
          category: 'drain',
          subType: 'custom',
          description: activeModel.description,
          default_scale: 1,
          dimension_params: activeModel.parameters,
          calculated_items: []
        } as any,
        activeModel.parameters
      );

      const blob = new Blob([dxfContent], { type: 'application/dxf;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeModel.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_cad.dxf`;
      a.click();
      URL.revokeObjectURL(url);
      showStatus('AutoCAD DXF vector drawing downloaded.');
    } catch {
      showStatus('Failed to generate DXF file.', 'error');
    }
  };

  // Export SVG
  const handleExportSVG = () => {
    if (!svgCanvasRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgCanvasRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeModel.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_drawing.svg`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('Vector SVG exported successfully!');
  };

  // Canvas Mouse / Touch Handlers for Pan & Zoom
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 0) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoomLevel(prev => Math.min(3.5, Math.max(0.4, prev * zoomFactor)));
  };

  // Canvas SVG Coordinates Calculator for Shapes
  const canvasCenter = { x: 300, y: 220 };
  const scalePxPerMeter = 110 * zoomLevel;

  // Geometry path generator for parametric shapes
  const getShapeSvgPath = (shape: VisualGeometricShape): string => {
    const p = activeModel.parameters;
    const cx = canvasCenter.x + panOffset.x;
    const cy = canvasCenter.y + panOffset.y;

    if (shape.shape_type === 'trapezoid') {
      const topW = (
        evaluateMathExpression(shape.dimensions.width_param || 'W_top', p) ||
        evaluateMathExpression(shape.dimensions.width_param || 'B_top', p) ||
        1.2
      ) * scalePxPerMeter;
      const botW = (
        evaluateMathExpression(shape.dimensions.bottom_width_param || 'W_bot', p) ||
        evaluateMathExpression(shape.dimensions.bottom_width_param || 'B_bot', p) ||
        0.6
      ) * scalePxPerMeter;
      const h = (
        evaluateMathExpression(shape.dimensions.height_param || 'H_trap', p) ||
        evaluateMathExpression(shape.dimensions.height_param || 'H_drain', p) ||
        0.8
      ) * scalePxPerMeter;

      const p1 = { x: cx - topW / 2, y: cy - h / 2 };
      const p2 = { x: cx + topW / 2, y: cy - h / 2 };
      const p3 = { x: cx + botW / 2, y: cy + h / 2 };
      const p4 = { x: cx - botW / 2, y: cy + h / 2 };

      return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} Z`;
    }

    if (shape.shape_type === 'rectangle') {
      const w = (
        evaluateMathExpression(shape.dimensions.width_param || 'W_rect', p) ||
        evaluateMathExpression(shape.dimensions.width_param || 'W', p) ||
        evaluateMathExpression(shape.dimensions.width_param || 'B_bot', p) ||
        1.0
      ) * scalePxPerMeter;
      const h = (
        evaluateMathExpression(shape.dimensions.height_param || 'H_rect', p) ||
        evaluateMathExpression(shape.dimensions.height_param || 'H', p) ||
        evaluateMathExpression(shape.dimensions.height_param || 't_pcc', p) ||
        0.4
      ) * scalePxPerMeter;

      const x = cx - w / 2;
      const y = cy - h / 2;

      return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
    }

    if (shape.shape_type === 'triangle') {
      const baseW = (
        evaluateMathExpression(shape.dimensions.width_param || 'W_base', p) ||
        evaluateMathExpression(shape.dimensions.width_param || 'B_bot', p) ||
        0.8
      ) * scalePxPerMeter;
      const h = (
        evaluateMathExpression(shape.dimensions.height_param || 'H_tri', p) ||
        evaluateMathExpression(shape.dimensions.height_param || 'H_drain', p) ||
        0.6
      ) * scalePxPerMeter;

      const topApex = { x: cx, y: cy - h / 2 };
      const botRight = { x: cx + baseW / 2, y: cy + h / 2 };
      const botLeft = { x: cx - baseW / 2, y: cy + h / 2 };

      return `M ${topApex.x} ${topApex.y} L ${botRight.x} ${botRight.y} L ${botLeft.x} ${botLeft.y} Z`;
    }

    if (shape.shape_type === 'circle') {
      const dia = (evaluateMathExpression(shape.dimensions.width_param || 'D_pipe', p) || 0.9) * scalePxPerMeter;
      const r = dia / 2;
      return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
    }

    // Default compound / fallback box
    const w = (evaluateMathExpression(shape.dimensions.width_param || 'B_top', p) || 1.0) * scalePxPerMeter;
    const h = (evaluateMathExpression(shape.dimensions.height_param || 'H_drain', p) || 0.6) * scalePxPerMeter;
    return `M ${cx - w / 2} ${cy - h / 2} L ${cx + w / 2} ${cy - h / 2} L ${cx + w / 2} ${cy + h / 2} L ${cx - w / 2} ${cy + h / 2} Z`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 antialiased font-sans select-none overflow-hidden">
      {/* 1. Header Toolbar with Preset Quick Badges */}
      <header className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>Interactive Geometric Template Editor</span>
                {activeModel.is_custom && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5" />
                    Custom User Template
                  </span>
                )}
                {defaultTemplateIds.includes(activeModel.id) && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    Default
                  </span>
                )}
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Create, customize, and save civil engineering template drawings for RCC L-Walls, Stone Masonry, Plum Concrete, Drains & Culverts
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* New Custom Template Button */}
          <button
            onClick={() => setIsNewTemplateModalOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition shadow-md shadow-indigo-600/30"
            title="Create a New Custom Template from Scratch or Archetype"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>New Template</span>
          </button>

          {/* Save to Custom Templates */}
          <button
            onClick={handleSaveActiveAsCustom}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 hover:border-purple-500/50 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition shadow-xs"
            title="Save current geometry as a persistent Custom Template"
          >
            <Save className="w-3.5 h-3.5 text-purple-400" />
            <span>Save Custom</span>
          </button>

          {/* Toggle Default Status */}
          <button
            onClick={(e) => handleToggleDefault(activeModel.id, e)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition border shadow-xs ${
              defaultTemplateIds.includes(activeModel.id)
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Mark or unmark this template as Default"
          >
            <Star
              className={`w-3.5 h-3.5 ${
                defaultTemplateIds.includes(activeModel.id) ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
              }`}
            />
            <span>{defaultTemplateIds.includes(activeModel.id) ? 'Is Default' : 'Set as Default'}</span>
          </button>

          {/* Duplicate Button */}
          <button
            onClick={handleDuplicateActiveTemplate}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition shadow-xs"
            title="Clone current template into an editable custom template"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Duplicate</span>
          </button>

          {/* Export CAD DXF */}
          <button
            onClick={handleExportDXF}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/50 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition shadow-xs"
            title="Export AutoCAD R12 DXF Vector Section"
          >
            <FileCode2 className="w-3.5 h-3.5 text-amber-400" />
            <span>DXF</span>
          </button>

          {/* Backup / Export & Import Dropdowns */}
          <button
            onClick={handleExportTemplatesJSON}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition shadow-xs"
            title="Export Templates JSON backup"
          >
            <FolderDown className="w-3.5 h-3.5 text-sky-400" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition shadow-xs"
            title="Import Templates from JSON text file"
          >
            <FolderUp className="w-3.5 h-3.5 text-sky-400" />
            <span>Import JSON</span>
          </button>

          {/* Delete Custom (if active is custom) */}
          {activeModel.is_custom && (
            <button
              onClick={(e) => handleDeleteCustomTemplate(activeModel.id, e)}
              className="flex items-center gap-1 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800 px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition"
              title="Delete this custom template"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Delete</span>
            </button>
          )}

          {/* Toggle Live MB Drawer */}
          <button
            onClick={() => setIsMBDrawerOpen(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
              isMBDrawerOpen
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/40'
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Live MB</span>
            <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-black/30">
              {calculatedItems.length}
            </span>
          </button>

          {/* PRIMARY: PUSH TO MEASUREMENT BOOK */}
          <button
            onClick={handlePushToProjectMB}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black px-4 py-1.5 rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Push to MB</span>
          </button>
        </div>
      </header>

      {/* 2. Preset Selector Ribbon with Category Filter Chips */}
      <div className="bg-slate-950/90 border-b border-slate-800 px-5 py-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs shrink-0">
        {/* Category Filters and Presets */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {/* Filter Chips */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 shrink-0">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition ${
                categoryFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({allTemplates.length})
            </button>
            <button
              onClick={() => setCategoryFilter('defaults')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition flex items-center gap-1 ${
                categoryFilter === 'defaults' ? 'bg-amber-600 text-white' : 'text-amber-400/80 hover:text-amber-300'
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              <span>Defaults ({defaultTemplateIds.length})</span>
            </button>
            <button
              onClick={() => setCategoryFilter('Protection Wall')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition ${
                categoryFilter === 'Protection Wall' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Protection Walls
            </button>
            <button
              onClick={() => setCategoryFilter('Drain')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition ${
                categoryFilter === 'Drain' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Drains
            </button>
            <button
              onClick={() => setCategoryFilter('Culvert')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition ${
                categoryFilter === 'Culvert' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Culverts
            </button>
            <button
              onClick={() => setCategoryFilter('custom')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition flex items-center gap-1 ${
                categoryFilter === 'custom' ? 'bg-purple-600 text-white' : 'text-purple-400 hover:text-purple-300'
              }`}
            >
              <Tag className="w-3 h-3" />
              <span>Custom ({customTemplates.length})</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800 shrink-0" />

          {/* Template buttons */}
          <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto">
            {filteredTemplates.map(t => {
              const isActive = t.id === activeModel.id;
              const isDefault = defaultTemplateIds.includes(t.id);
              return (
                <div
                  key={t.id}
                  className={`group relative flex items-center rounded-lg text-xs font-bold transition border shrink-0 ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white border-slate-700'
                  }`}
                >
                  <button
                    onClick={() => {
                      setActiveModel(JSON.parse(JSON.stringify(t)));
                      setSelectedShapeId(t.shapes[0]?.id || '');
                      showStatus(`Loaded template: ${t.name}`);
                    }}
                    className="px-2.5 py-1 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    {isDefault && (
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                    )}
                    <span>{t.name}</span>
                    {t.is_custom && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/30 text-purple-200 border border-purple-400/40">
                        Custom
                      </span>
                    )}
                  </button>

                  <button
                    onClick={(e) => handleToggleDefault(t.id, e)}
                    className="px-1.5 py-1 text-slate-400 hover:text-amber-400 transition cursor-pointer border-l border-white/10"
                    title={isDefault ? 'Remove from Defaults' : 'Add to Defaults'}
                  >
                    <Star className={`w-3 h-3 ${isDefault ? 'text-amber-400 fill-amber-400' : 'text-slate-400 opacity-40 group-hover:opacity-100'}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Metrics Pill */}
        <div className="flex items-center gap-3 text-[11px] font-medium bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl text-slate-300 shrink-0">
          <span>
            Total Volume: <strong className="font-mono text-emerald-400">{totalSummary.totalVolume.toFixed(2)} m³</strong>
          </span>
          <span className="text-slate-700">|</span>
          <span>
            Est. Cost: <strong className="font-mono text-amber-400">{currencyCode()} {totalSummary.totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong>
          </span>
        </div>
      </div>

      {/* Notification Toast */}
      {statusMessage && (
        <div
          className={`px-5 py-2 text-xs font-bold flex items-center justify-between border-b ${
            statusMessage.type === 'error'
              ? 'bg-red-950 text-red-200 border-red-800'
              : 'bg-emerald-950 text-emerald-200 border-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Main Workspace Area: 3 Clean Panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Interactive Element Layers */}
        <aside className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers3 className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-black text-slate-200 uppercase tracking-wider">
                Layers ({activeModel.shapes.length})
              </h2>
            </div>

            <button
              onClick={() => handleAddShape('rectangle')}
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded-lg text-xs font-bold cursor-pointer transition shadow-xs"
              title="Add New Construction Layer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="p-2 space-y-1.5 flex-1">
            {activeModel.shapes.map((shape, index) => {
              const isSelected = shape.id === selectedShapeId;
              const calc = calculatedItems.find(c => c.shape.id === shape.id);

              return (
                <div
                  key={shape.id}
                  onClick={() => setSelectedShapeId(shape.id)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500/50 shadow-md'
                      : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-md shrink-0 shadow-xs"
                        style={{ backgroundColor: shape.color }}
                      />
                      <span className="text-xs font-bold text-slate-200 truncate">
                        {shape.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateShapeField(shape.id, { is_visible: !shape.is_visible });
                        }}
                        className="p-1 text-slate-400 hover:text-slate-200 rounded"
                        title={shape.is_visible ? 'Hide Element' : 'Show Element'}
                      >
                        {shape.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteShape(shape.id);
                        }}
                        className="p-1 text-slate-500 hover:text-red-400 rounded"
                        title="Delete Element"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quantity and Norm Badge */}
                  <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-slate-800/60">
                    <span className="font-mono text-indigo-300 font-bold">
                      {calc?.quantity.toFixed(2)} {shape.mb_formula.unit}
                    </span>

                    {shape.norm_mapping?.is_mapped ? (
                      <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
                        Norm {shape.norm_mapping.norm_code}
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetShapeForNormMapping(shape.id);
                          setIsNormSearchModalOpen(true);
                        }}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline"
                      >
                        + Map Norm
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reference footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/40 text-[11px] text-slate-400">
            <span className="font-bold text-slate-300">Chainage: </span>
            <span className="font-mono text-emerald-400">{activeModel.chainage_reference}</span>
          </div>
        </aside>

        {/* Center Stage: Interactive CAD SVG Canvas */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950 relative">
          {/* Geometric Shape Presets Toolbar */}
          <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs z-20 shadow-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-indigo-400 font-bold uppercase tracking-wider text-[11px] mr-1">
                <Shapes className="w-4 h-4 text-indigo-400" />
                <span>Shape Presets:</span>
              </div>

              {/* Rectangle Preset Button */}
              <button
                onClick={() => handleInjectShapePreset('rectangle')}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-sky-600/20 text-slate-200 hover:text-sky-300 border border-slate-700 hover:border-sky-500/60 transition cursor-pointer shadow-xs active:scale-95"
                title="Inject Rectangle Preset (Width × Height)"
              >
                <div className="w-4 h-3 rounded-xs border-2 border-sky-400 bg-sky-500/20" />
                <div className="flex flex-col text-left">
                  <span className="font-bold text-xs leading-none">Rectangle</span>
                  <span className="text-[10px] text-slate-400 group-hover:text-sky-300/80 font-mono">W × H</span>
                </div>
                <span className="text-[10px] bg-slate-900/90 px-1.5 py-0.5 rounded text-sky-400 font-mono font-bold border border-slate-700/60">
                  + Add
                </span>
              </button>

              {/* Trapezoid Preset Button */}
              <button
                onClick={() => handleInjectShapePreset('trapezoid')}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-600/20 text-slate-200 hover:text-amber-300 border border-slate-700 hover:border-amber-500/60 transition cursor-pointer shadow-xs active:scale-95"
                title="Inject Trapezoid Preset (Top-Width, Bottom-Width, Height)"
              >
                <svg className="w-4 h-3.5 text-amber-400 stroke-current fill-amber-500/20" viewBox="0 0 20 16">
                  <polygon points="4,2 16,2 19,14 1,14" strokeWidth="2" />
                </svg>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-xs leading-none">Trapezoid</span>
                  <span className="text-[10px] text-slate-400 group-hover:text-amber-300/80 font-mono">Top / Bot × H</span>
                </div>
                <span className="text-[10px] bg-slate-900/90 px-1.5 py-0.5 rounded text-amber-400 font-mono font-bold border border-slate-700/60">
                  + Add
                </span>
              </button>

              {/* Triangle Preset Button */}
              <button
                onClick={() => handleInjectShapePreset('triangle')}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600/20 text-slate-200 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/60 transition cursor-pointer shadow-xs active:scale-95"
                title="Inject Triangle Preset (½ × Base-Width × Height)"
              >
                <Triangle className="w-3.5 h-3.5 text-emerald-400 fill-emerald-500/20" />
                <div className="flex flex-col text-left">
                  <span className="font-bold text-xs leading-none">Triangle</span>
                  <span className="text-[10px] text-slate-400 group-hover:text-emerald-300/80 font-mono">½ × Base × H</span>
                </div>
                <span className="text-[10px] bg-slate-900/90 px-1.5 py-0.5 rounded text-emerald-400 font-mono font-bold border border-slate-700/60">
                  + Add
                </span>
              </button>
            </div>

            {/* Quick Canvas Status Hint */}
            <div className="text-[11px] text-slate-400 hidden lg:flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Click preset to inject SVG path & default dimensions into canvas</span>
            </div>
          </div>

          {/* Canvas Controls Top Bar */}
          <div className="bg-slate-950 px-4 py-2 flex items-center justify-between text-xs z-10 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">Zoom:</span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(3.0, prev + 0.15))}
                className="p-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(prev => Math.max(0.4, prev - 0.15))}
                className="p-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setZoomLevel(1.0);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className="p-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition cursor-pointer"
                title="Reset Pan & Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-slate-400">{Math.round(zoomLevel * 100)}%</span>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>Grid</span>
              </label>

              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={showDimensionLabels}
                  onChange={(e) => setShowDimensionLabels(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>Dimensions</span>
              </label>
            </div>
          </div>

          {/* The Interactive SVG Canvas */}
          <div className="flex-1 overflow-hidden relative flex items-center justify-center p-4">
            <svg
              ref={svgCanvasRef}
              className="w-full h-full cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onWheel={handleWheel}
            >
              <defs>
                <pattern id="editor_small_grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                </pattern>
                <pattern id="editor_large_grid" width="100" height="100" patternUnits="userSpaceOnUse">
                  <rect width="100" height="100" fill="url(#editor_small_grid)" />
                  <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#334155" strokeWidth="1" />
                </pattern>

                {/* Civil Engineering Hatches */}
                <pattern id="hatch_concrete" width="12" height="12" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="#94a3b8" />
                  <circle cx="8" cy="8" r="1.5" fill="#64748b" />
                  <path d="M 0 12 L 12 0" stroke="#475569" strokeWidth="0.5" />
                </pattern>
                <pattern id="hatch_earth" width="16" height="16" patternUnits="userSpaceOnUse">
                  <path d="M 0 8 L 8 0 M 4 12 L 12 4 M 8 16 L 16 8" stroke="#d97706" strokeWidth="1" opacity="0.6" />
                </pattern>
                <pattern id="hatch_stone" width="20" height="20" patternUnits="userSpaceOnUse">
                  <rect x="1" y="1" width="8" height="8" fill="none" stroke="#94a3b8" strokeWidth="0.75" />
                  <rect x="10" y="10" width="8" height="8" fill="none" stroke="#94a3b8" strokeWidth="0.75" />
                </pattern>
                <pattern id="hatch_brick" width="14" height="10" patternUnits="userSpaceOnUse">
                  <rect width="14" height="5" fill="none" stroke="#ea580c" strokeWidth="0.75" />
                  <line x1="7" y1="0" x2="7" y2="5" stroke="#ea580c" strokeWidth="0.75" />
                  <rect y="5" width="14" height="5" fill="none" stroke="#ea580c" strokeWidth="0.75" />
                  <line x1="0" y1="5" x2="0" y2="10" stroke="#ea580c" strokeWidth="0.75" />
                </pattern>
              </defs>

              {/* Grid Background */}
              {showGrid && (
                <rect width="100%" height="100%" fill="url(#editor_large_grid)" />
              )}

              {/* Coordinate Origin Crosshairs */}
              <g transform={`translate(${canvasCenter.x + panOffset.x}, ${canvasCenter.y + panOffset.y})`}>
                <line x1="-25" y1="0" x2="25" y2="0" stroke="#f43f5e" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
                <line x1="0" y1="-25" x2="0" y2="25" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
                <circle cx="0" cy="0" r="2.5" fill="#f43f5e" />
                <text x="5" y="-5" fill="#64748b" fontSize="9" fontFamily="monospace">CL</text>
              </g>

              {/* Render Shapes Collection */}
              <g id="shapes_layer">
                {activeModel.shapes.map((shape) => {
                  if (!shape.is_visible) return null;
                  const isSelected = shape.id === selectedShapeId;
                  const pathD = getShapeSvgPath(shape);

                  return (
                    <g key={shape.id} className="transition-all">
                      {/* Shape Path Body */}
                      <path
                        d={pathD}
                        fill={
                          shape.hatch_pattern === 'concrete'
                            ? 'url(#hatch_concrete)'
                            : shape.hatch_pattern === 'earth'
                            ? 'url(#hatch_earth)'
                            : shape.hatch_pattern === 'stone'
                            ? 'url(#hatch_stone)'
                            : shape.hatch_pattern === 'brick'
                            ? 'url(#hatch_brick)'
                            : shape.color
                        }
                        fillOpacity={shape.hatch_pattern === 'solid' ? 0.45 : 0.85}
                        stroke={isSelected ? '#6366f1' : shape.color}
                        strokeWidth={isSelected ? 3.5 : 1.5}
                        strokeDasharray={shape.is_subtraction ? '4,4' : undefined}
                        className="cursor-pointer hover:stroke-indigo-400 transition"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedShapeId(shape.id);
                        }}
                      />

                      {/* Selection Glow */}
                      {isSelected && (
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#818cf8"
                          strokeWidth="8"
                          strokeOpacity="0.25"
                          pointerEvents="none"
                        />
                      )}
                    </g>
                  );
                })}
              </g>

              {/* Dimension Annotations & Callouts */}
              {showDimensionLabels && (
                <g id="dimensions_layer">
                  {(() => {
                    const p = activeModel.parameters;
                    const cx = canvasCenter.x + panOffset.x;
                    const cy = canvasCenter.y + panOffset.y;
                    const currShape = selectedShape || activeModel.shapes[0];

                    if (currShape?.shape_type === 'triangle') {
                      const baseVal = evaluateMathExpression(currShape.dimensions.width_param || 'W_base', p) || p.W_base || p.B_bot || 0.8;
                      const hVal = evaluateMathExpression(currShape.dimensions.height_param || 'H_tri', p) || p.H_tri || p.H_drain || 0.6;
                      const baseW = baseVal * scalePxPerMeter;
                      const h = hVal * scalePxPerMeter;

                      return (
                        <>
                          {/* Base Width Leader */}
                          <line
                            x1={cx - baseW / 2}
                            y1={cy + h / 2 + 20}
                            x2={cx + baseW / 2}
                            y2={cy + h / 2 + 20}
                            stroke="#10b981"
                            strokeWidth="1.5"
                          />
                          <line x1={cx - baseW / 2} y1={cy + h / 2} x2={cx - baseW / 2} y2={cy + h / 2 + 28} stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
                          <line x1={cx + baseW / 2} y1={cy + h / 2} x2={cx + baseW / 2} y2={cy + h / 2 + 28} stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
                          <text x={cx} y={cy + h / 2 + 35} fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                            Base ({currShape.dimensions.width_param || 'W_base'}) = {baseVal.toFixed(2)}m
                          </text>

                          {/* Apex Height Drop Leader */}
                          <line
                            x1={cx + baseW / 2 + 22}
                            y1={cy - h / 2}
                            x2={cx + baseW / 2 + 22}
                            y2={cy + h / 2}
                            stroke="#f59e0b"
                            strokeWidth="1.5"
                          />
                          <line x1={cx} y1={cy - h / 2} x2={cx + baseW / 2 + 30} y2={cy - h / 2} stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
                          <line x1={cx + baseW / 2} y1={cy + h / 2} x2={cx + baseW / 2 + 30} y2={cy + h / 2} stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
                          <text
                            x={cx + baseW / 2 + 30}
                            y={cy + 4}
                            fill="#f59e0b"
                            fontSize="11"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            H ({currShape.dimensions.height_param || 'H_tri'}) = {hVal.toFixed(2)}m
                          </text>
                        </>
                      );
                    }

                    if (currShape?.shape_type === 'rectangle') {
                      const wVal = evaluateMathExpression(currShape.dimensions.width_param || 'W_rect', p) || p.W_rect || p.W || p.B_bot || 1.0;
                      const hVal = evaluateMathExpression(currShape.dimensions.height_param || 'H_rect', p) || p.H_rect || p.H || p.t_pcc || 0.4;
                      const w = wVal * scalePxPerMeter;
                      const h = hVal * scalePxPerMeter;

                      return (
                        <>
                          {/* Width Leader */}
                          <line
                            x1={cx - w / 2}
                            y1={cy - h / 2 - 20}
                            x2={cx + w / 2}
                            y2={cy - h / 2 - 20}
                            stroke="#38bdf8"
                            strokeWidth="1.5"
                          />
                          <line x1={cx - w / 2} y1={cy - h / 2} x2={cx - w / 2} y2={cy - h / 2 - 28} stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
                          <line x1={cx + w / 2} y1={cy - h / 2} x2={cx + w / 2} y2={cy - h / 2 - 28} stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
                          <text x={cx} y={cy - h / 2 - 25} fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                            Width ({currShape.dimensions.width_param || 'W_rect'}) = {wVal.toFixed(2)}m
                          </text>

                          {/* Height Leader */}
                          <line
                            x1={cx + w / 2 + 20}
                            y1={cy - h / 2}
                            x2={cx + w / 2 + 20}
                            y2={cy + h / 2}
                            stroke="#f59e0b"
                            strokeWidth="1.5"
                          />
                          <line x1={cx + w / 2} y1={cy - h / 2} x2={cx + w / 2 + 28} y2={cy - h / 2} stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
                          <line x1={cx + w / 2} y1={cy + h / 2} x2={cx + w / 2 + 28} y2={cy + h / 2} stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
                          <text
                            x={cx + w / 2 + 28}
                            y={cy + 4}
                            fill="#f59e0b"
                            fontSize="11"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            H ({currShape.dimensions.height_param || 'H_rect'}) = {hVal.toFixed(2)}m
                          </text>
                        </>
                      );
                    }

                    // Default / Trapezoid
                    const topVal = evaluateMathExpression(currShape?.dimensions.width_param || 'W_top', p) || p.W_top || p.B_top || p.W || 1.2;
                    const botVal = evaluateMathExpression(currShape?.dimensions.bottom_width_param || 'W_bot', p) || p.W_bot || p.B_bot || p.W || 0.6;
                    const hVal = evaluateMathExpression(currShape?.dimensions.height_param || 'H_trap', p) || p.H_trap || p.H_drain || p.H_stem || p.H || 0.8;

                    const topW = topVal * scalePxPerMeter;
                    const botW = botVal * scalePxPerMeter;
                    const h = hVal * scalePxPerMeter;

                    return (
                      <>
                        {/* Top Width Leader */}
                        <line
                          x1={cx - topW / 2}
                          y1={cy - h / 2 - 20}
                          x2={cx + topW / 2}
                          y2={cy - h / 2 - 20}
                          stroke="#38bdf8"
                          strokeWidth="1.5"
                        />
                        <line x1={cx - topW / 2} y1={cy - h / 2} x2={cx - topW / 2} y2={cy - h / 2 - 28} stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
                        <line x1={cx + topW / 2} y1={cy - h / 2} x2={cx + topW / 2} y2={cy - h / 2 - 28} stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
                        <text x={cx} y={cy - h / 2 - 25} fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                          Top ({currShape?.dimensions.width_param || 'W_top'}) = {topVal.toFixed(2)}m
                        </text>

                        {/* Bottom Width Leader */}
                        <line
                          x1={cx - botW / 2}
                          y1={cy + h / 2 + 20}
                          x2={cx + botW / 2}
                          y2={cy + h / 2 + 20}
                          stroke="#34d399"
                          strokeWidth="1.5"
                        />
                        <line x1={cx - botW / 2} y1={cy + h / 2} x2={cx - botW / 2} y2={cy + h / 2 + 28} stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
                        <line x1={cx + botW / 2} y1={cy + h / 2} x2={cx + botW / 2} y2={cy + h / 2 + 28} stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
                        <text x={cx} y={cy + h / 2 + 35} fill="#34d399" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                          Bottom ({currShape?.dimensions.bottom_width_param || 'W_bot'}) = {botVal.toFixed(2)}m
                        </text>

                        {/* Height Leader */}
                        <line
                          x1={cx + Math.max(topW, botW) / 2 + 20}
                          y1={cy - h / 2}
                          x2={cx + Math.max(topW, botW) / 2 + 20}
                          y2={cy + h / 2}
                          stroke="#f59e0b"
                          strokeWidth="1.5"
                        />
                        <text
                          x={cx + Math.max(topW, botW) / 2 + 28}
                          y={cy + 4}
                          fill="#f59e0b"
                          fontSize="11"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          H ({currShape?.dimensions.height_param || 'H_trap'}) = {hVal.toFixed(2)}m
                        </text>
                      </>
                    );
                  })()}
                </g>
              )}
            </svg>

            {/* Floating Live Dimension Handle Adjusters directly on Canvas */}
            <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 text-xs shadow-xl space-y-2 max-w-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Selected: {selectedShape?.name}</span>
                </span>
                <span className="font-mono text-emerald-400 font-bold text-[11px]">
                  {calculatedItems.find(c => c.shape.id === selectedShape?.id)?.quantity.toFixed(2)} {selectedShape?.mb_formula.unit}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono bg-slate-950/80 p-1.5 rounded border border-slate-800 truncate">
                Formula: {selectedShape?.mb_formula.expression}
              </div>
            </div>
          </div>
        </main>

        {/* Right Column: Live Parameter Sliders & Inspector */}
        <aside className="w-84 bg-slate-950 border-l border-slate-800 flex flex-col shrink-0 overflow-y-auto">
          {/* Header */}
          <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-black text-slate-200 uppercase tracking-wider">
                Parametric Sliders
              </h2>
            </div>
            <span className="text-[10px] text-slate-400">Live 2-Way Sync</span>
          </div>

          {/* Sliders List */}
          <div className="p-3.5 space-y-4 flex-1">
            <div className="space-y-3">
              {activeModel.parameter_defs.map(def => {
                const currentVal = activeModel.parameters[def.key] ?? (def.default_value ?? def.default_val ?? 1.0);
                const step = def.step || 0.05;
                const min = def.min ?? 0;
                const max = def.max ?? 100;

                return (
                  <div key={def.key} className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">{def.label}</span>
                      <div className="flex items-center gap-1">
                        {/* Micro Stepper Buttons */}
                        <button
                          onClick={() => handleStepParameter(def.key, -step)}
                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold text-emerald-400 px-1 text-xs">
                          {currentVal.toFixed(2)} {def.unit}
                        </span>
                        <button
                          onClick={() => handleStepParameter(def.key, step)}
                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Slider Input */}
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={currentVal}
                      onChange={(e) => handleUpdateParameter(def.key, parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                );
              })}
            </div>

            {/* Selected Element Quick Settings */}
            {selectedShape && (
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
                  Active Element Settings
                </label>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Layer Title</label>
                  <input
                    type="text"
                    value={selectedShape.name}
                    onChange={(e) => handleUpdateShapeField(selectedShape.id, { name: e.target.value })}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Norm Mapping Card */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Rate Norm Link</label>
                  {selectedShape.norm_mapping?.is_mapped ? (
                    <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-emerald-400 text-xs">
                          Norm {selectedShape.norm_mapping.norm_code}
                        </span>
                        <button
                          onClick={() => {
                            setTargetShapeForNormMapping(selectedShape.id);
                            setIsNormSearchModalOpen(true);
                          }}
                          className="text-[10px] text-emerald-300 hover:underline cursor-pointer"
                        >
                          Change
                        </button>
                      </div>
                      <p className="text-[10px] text-emerald-200 leading-snug line-clamp-2">
                        {selectedShape.norm_mapping.norm_description}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setTargetShapeForNormMapping(selectedShape.id);
                        setIsNormSearchModalOpen(true);
                      }}
                      className="w-full py-2 border border-dashed border-indigo-500/50 hover:border-indigo-400 bg-indigo-950/20 hover:bg-indigo-950/40 text-indigo-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Select Government Norm</span>
                    </button>
                  )}
                </div>

                {/* Formula Expression Quick Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Formula Expression</label>
                  <input
                    type="text"
                    value={selectedShape.mb_formula.expression}
                    onChange={(e) =>
                      handleUpdateShapeField(selectedShape.id, {
                        mb_formula: { ...selectedShape.mb_formula, expression: e.target.value }
                      })
                    }
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs font-bold text-emerald-400 focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <button
                      onClick={() =>
                        handleUpdateShapeField(selectedShape.id, {
                          mb_formula: {
                            ...selectedShape.mb_formula,
                            expression: 'No * L * ((B_top + B_bot) / 2) * H_drain',
                            unit: 'm3',
                            quantity_type: 'volume'
                          }
                        })
                      }
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono cursor-pointer"
                    >
                      Trapezoid
                    </button>
                    <button
                      onClick={() =>
                        handleUpdateShapeField(selectedShape.id, {
                          mb_formula: {
                            ...selectedShape.mb_formula,
                            expression: 'No * L * B_bot * t_pcc',
                            unit: 'm3',
                            quantity_type: 'volume'
                          }
                        })
                      }
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono cursor-pointer"
                    >
                      Rectangle
                    </button>
                    <button
                      onClick={() =>
                        handleUpdateShapeField(selectedShape.id, {
                          mb_formula: {
                            ...selectedShape.mb_formula,
                            expression: 'No * L * (0.5 * W_base * H_tri)',
                            unit: 'm3',
                            quantity_type: 'volume'
                          }
                        })
                      }
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono cursor-pointer"
                    >
                      Triangle (½BH)
                    </button>
                    <button
                      onClick={() =>
                        handleUpdateShapeField(selectedShape.id, {
                          mb_formula: {
                            ...selectedShape.mb_formula,
                            expression: 'No * L * (B_bot + 2 * H_drain)',
                            unit: 'm2',
                            quantity_type: 'area'
                          }
                        })
                      }
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono cursor-pointer"
                    >
                      Plaster
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 4. Bottom Collapsible Live MB Table Drawer */}
      {isMBDrawerOpen && (
        <div className="bg-slate-950 border-t border-slate-800 p-4 max-h-64 overflow-y-auto shrink-0 shadow-2xl z-30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">
                Measurement Book (MB) Live Calculated Rows
              </h3>
            </div>
            <button
              onClick={handlePushToProjectMB}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirm & Push to MB</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="bg-slate-900 text-slate-300 text-[11px] uppercase font-bold">
                <tr>
                  <th className="p-2 border-r border-slate-800 text-center">SN</th>
                  <th className="p-2 border-r border-slate-800">Particulars / Layer Description</th>
                  <th className="p-2 border-r border-slate-800 text-center">Nos</th>
                  <th className="p-2 border-r border-slate-800 text-center">L (m)</th>
                  <th className="p-2 border-r border-slate-800 text-center">B (m)</th>
                  <th className="p-2 border-r border-slate-800 text-center">H (m)</th>
                  <th className="p-2 border-r border-slate-800 text-right">Quantity</th>
                  <th className="p-2 border-r border-slate-800 text-center">Unit</th>
                  <th className="p-2 text-right">Est. Amount ({currencyCode()})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-950 text-slate-300">
                {calculatedItems.map((item, index) => {
                  const p = activeModel.parameters;
                  const lengthVal = evaluateMathExpression(item.shape.dimensions.length_param || 'L', p) || p.L || 1;
                  const widthVal = evaluateMathExpression(item.shape.dimensions.width_param || 'B_top', p) || 1;
                  const heightVal = evaluateMathExpression(item.shape.dimensions.height_param || 'H_drain', p) || 1;
                  const nosVal = evaluateMathExpression(item.shape.dimensions.nos_param || 'No', p) || 1;

                  return (
                    <tr key={item.shape.id} className="hover:bg-slate-900/50">
                      <td className="p-2 font-mono text-center font-bold text-slate-500 border-r border-slate-800">{index + 1}</td>
                      <td className="p-2 font-medium text-slate-200 border-r border-slate-800">
                        <div>{item.particulars}</div>
                        {item.shape.norm_mapping?.is_mapped && (
                          <span className="text-[10px] text-emerald-400 font-mono">
                            [Norm {item.shape.norm_mapping.norm_code}]
                          </span>
                        )}
                      </td>
                      <td className="p-2 font-mono text-center border-r border-slate-800">{nosVal.toFixed(2)}</td>
                      <td className="p-2 font-mono text-center border-r border-slate-800">{lengthVal.toFixed(2)}</td>
                      <td className="p-2 font-mono text-center border-r border-slate-800">{widthVal.toFixed(2)}</td>
                      <td className="p-2 font-mono text-center border-r border-slate-800">{heightVal.toFixed(2)}</td>
                      <td className="p-2 font-mono text-right font-bold text-emerald-400 border-r border-slate-800">
                        {item.quantity.toFixed(2)}
                      </td>
                      <td className="p-2 font-mono text-center font-bold text-slate-400 border-r border-slate-800">{item.unit}</td>
                      <td className="p-2 font-mono text-right font-bold text-amber-400">
                        {item.totalAmount > 0 ? item.totalAmount.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. New Custom Template Modal */}
      {isNewTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 max-w-xl w-full flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-black text-white">
                  Create New Parametric Drawing Template
                </h3>
              </div>
              <button
                onClick={() => setIsNewTemplateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewTemplateSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
              {/* Archetype Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Base Engineering Archetype / Structure
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: 'rcc_l_wall', label: 'RCC L-Protection Wall', icon: '🛡️', cat: 'Protection Wall' },
                    { key: 'stone_masonry_wall', label: 'Stone Masonry Wall', icon: '🧱', cat: 'Protection Wall' },
                    { key: 'plum_concrete_wall', label: 'Plum Concrete Wall', icon: '🪨', cat: 'Protection Wall' },
                    { key: 'trapezoidal_drain', label: 'Trapezoidal Drain', icon: '🌊', cat: 'Drain' },
                    { key: 'rcc_box', label: 'RCC Box Culvert', icon: '📦', cat: 'Culvert' },
                    { key: 'blank', label: 'Blank Custom Layer', icon: '📄', cat: 'Protection Wall' }
                  ].map(arch => (
                    <button
                      key={arch.key}
                      type="button"
                      onClick={() => {
                        setNewTemplateFormData(prev => ({
                          ...prev,
                          archetype: arch.key as any,
                          category: arch.cat as any
                        }));
                      }}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                        newTemplateFormData.archetype === arch.key
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-xs ring-1 ring-indigo-500'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-xl mb-1">{arch.icon}</span>
                      <span className="text-xs font-bold leading-tight">{arch.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Template Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTemplateFormData.name}
                    onChange={(e) => setNewTemplateFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. 3.5m RCC L-Retaining Wall"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Category & Chainage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={newTemplateFormData.category}
                    onChange={(e) => setNewTemplateFormData(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Protection Wall">Protection Wall</option>
                    <option value="Drain">Drain</option>
                    <option value="Culvert">Culvert</option>
                    <option value="Retaining Wall">Retaining Wall</option>
                    <option value="Breast Wall">Breast Wall</option>
                    <option value="Gabion Wall">Gabion Wall</option>
                    <option value="Cross Drainage">Cross Drainage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Chainage / Location Ref
                  </label>
                  <input
                    type="text"
                    value={newTemplateFormData.chainage_reference}
                    onChange={(e) => setNewTemplateFormData(prev => ({ ...prev, chainage_reference: e.target.value }))}
                    placeholder="e.g. Ch 0+000 to Ch 0+150 RHS"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Description & Specifications
                </label>
                <textarea
                  rows={2}
                  value={newTemplateFormData.description}
                  onChange={(e) => setNewTemplateFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Notes on foundation soling, PCC screed pad, rebar grades, weep holes, filter media..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewTemplateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Create & Launch Editor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Import Templates JSON Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 max-w-lg w-full flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderUp className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-black text-white">
                  Import Custom Templates JSON
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportJsonInput('');
                }}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                Paste the exported JSON text or upload a template definitions file to restore or share your customized civil templates.
              </p>

              <div>
                <textarea
                  rows={8}
                  value={importJsonInput}
                  onChange={(e) => setImportJsonInput(e.target.value)}
                  placeholder={`{\n  "version": "1.0",\n  "templates": [ ... ]\n}`}
                  className="w-full p-3 font-mono text-[11px] bg-slate-950 border border-slate-800 rounded-xl text-emerald-300 placeholder-slate-600 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportJsonInput('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportTemplatesJSONSubmit}
                  disabled={!importJsonInput.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/30 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <FolderUp className="w-4 h-4" />
                  <span>Import Templates</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
