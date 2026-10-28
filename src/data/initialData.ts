import { ResourceMaster, RateNormItem, ZoneInfo } from '../types';

export const INITIAL_ZONES: ZoneInfo[] = [
  { id: 'plains_a', name_en: 'Plains A',province: 'North Province', region: 'Plains', labor_multiplier: 0.95, material_multiplier: 0.95 },
  { id: 'metro_a', name_en: 'Metro A',province: 'Central Province', region: 'Urban', labor_multiplier: 1.0, material_multiplier: 1.0 },
  { id: 'metro_b', name_en: 'Metro B',province: 'Central Province', region: 'Urban', labor_multiplier: 1.0, material_multiplier: 1.0 },
  { id: 'pkr', name_en: 'Sample County (Sample City)',province: 'West Province', region: 'Hills', labor_multiplier: 1.08, material_multiplier: 1.05 },
  { id: 'plains_b', name_en: 'Plains B',province: 'Central Province', region: 'Plains', labor_multiplier: 0.95, material_multiplier: 0.92 },
  { id: 'plains_c', name_en: 'Plains C',province: 'North Province', region: 'Plains', labor_multiplier: 0.92, material_multiplier: 0.90 },
  { id: 'mountain_a', name_en: 'Mountain A',province: 'North Province', region: 'Mountain', labor_multiplier: 1.45, material_multiplier: 1.60 },
  { id: 'mountain_b', name_en: 'Mountain B',province: 'Upper Province', region: 'Mountain', labor_multiplier: 1.50, material_multiplier: 1.75 },
  { id: 'plains_d', name_en: 'Plains D',province: 'Far Province', region: 'Plains', labor_multiplier: 0.94, material_multiplier: 0.95 },
];

export const FISCAL_YEARS = ['2026/27', '2025/26', '2024/25', '2023/24'];

// Helper to determine default base currency rate for  resources (Reset to 0 for pristine scratch rate calculation)
export function getDefaultResourceRate(_name: string, _category: string, _unit: string): number {
  return 0;
}


export const INITIAL_RESOURCES: ResourceMaster[] = [
  { resource_id: 101, code: "LAB-01", name: "Unskilled Labor", category: "Labor", unit: "Md", used_in: "Building / Road / Irrigation", default_rate: 0 },
  { resource_id: 102, code: "LAB-02", name: "Skilled Mason", category: "Labor", unit: "Md", used_in: "Building / Road / Irrigation", default_rate: 0 },
  { resource_id: 103, code: "LAB-03", name: "Semi-skilled Labor", category: "Labor", unit: "Md", used_in: "Building / Road / Irrigation", default_rate: 0 },
  { resource_id: 104, code: "MAT-01", name: "OPC Cement 53 Grade", category: "Material", unit: "Bag", used_in: "Building / Road / Irrigation", default_rate: 0 },
  { resource_id: 106, code: "MAT-02", name: "Coarse River Sand", category: "Material", unit: "Cu.m.", used_in: "Building / Road / Irrigation", default_rate: 0 },
  { resource_id: 108, code: "MAT-03", name: "First Class Local Bricks", category: "Material", unit: "Nos", used_in: "Building / Road / Irrigation", default_rate: 0 },
  { resource_id: 109, code: "MAT-04", name: "TMT Rebar Steel", category: "Material", unit: "Kg", used_in: "Building / Road / Irrigation", default_rate: 0 },
  { resource_id: 111, code: "MAT-05", name: "Quarry Stone Boulders", category: "Material", unit: "Cu.m.", used_in: "Building / Road / Irrigation", default_rate: 0 },
  { resource_id: 107, code: "MAT-06", name: "Crushed Stone Aggregate 20mm", category: "Material", unit: "Cu.m.", used_in: "Building / Road / Irrigation", default_rate: 0 },
  { resource_id: 110, code: "EQP-01", name: "Concrete Mixer 7/5 CFT", category: "Equipment", unit: "hr", used_in: "Building / Road / Irrigation", default_rate: 0 },
  { resource_id: 173, code: "EQP-02", name: "Concrete Vibrator", category: "Equipment", unit: "hr", used_in: "Building / Road / Irrigation", default_rate: 0 },
  { resource_id: 159, code: "MAT-07", name: "Water", category: "Material", unit: "lit", used_in: "Building / Road / Irrigation", default_rate: 0 },
  { resource_id: 146, code: "MAT-08", name: "Diesel Fuel", category: "Material", unit: "lit", used_in: "Building / Road / Irrigation", default_rate: 0 },
  { resource_id: 20, code: "MAT-09", name: "Binding Wire", category: "Material", unit: "kg", used_in: "Building / Road / Irrigation", default_rate: 0 },
  { resource_id: 16, code: "EQP-03", name: "Air Compressor", category: "Equipment", unit: "hr", used_in: "Road (WBSRoad)", default_rate: 0 },
  { resource_id: 22, code: "MAT-10", name: "Bitumen MC-70", category: "Material", unit: "lit", used_in: "Road (WBSRoad)", default_rate: 0 },
  { resource_id: 24, code: "EQP-04", name: "Bitumen Distributor Truck", category: "Equipment", unit: "hr", used_in: "Road (WBSRoad)", default_rate: 0 },
  { resource_id: 26, code: "MAT-11", name: "Borrowpit Material", category: "Material", unit: "Cu.m.", used_in: "Road (WBSRoad)", default_rate: 0 },
  { resource_id: 38, code: "EQP-05", name: "Crane", category: "Equipment", unit: "hr", used_in: "Road (WBSRoad)", default_rate: 0 },
  { resource_id: 39, code: "EQP-06", name: "Dozer", category: "Equipment", unit: "hr", used_in: "Road (WBSRoad)", default_rate: 0 },
  { resource_id: 43, code: "EQP-07", name: "Excavator", category: "Equipment", unit: "hr", used_in: "Road (WBSRoad)", default_rate: 0 },
  { resource_id: 47, code: "EQP-08", name: "Generator", category: "Equipment", unit: "hr", used_in: "Road (WBSRoad)", default_rate: 0 },
  { resource_id: 64, code: "EQP-09", name: "Motor Grader", category: "Equipment", unit: "hr", used_in: "Road (WBSRoad)", default_rate: 0 },
  { resource_id: 68, code: "EQP-10", name: "Paver Finisher", category: "Equipment", unit: "hr", used_in: "Road (WBSRoad)", default_rate: 0 },
  { resource_id: 71, code: "EQP-11", name: "Plate Compactor", category: "Equipment", unit: "hr", used_in: "Road (WBSRoad)", default_rate: 0 },
  { resource_id: 75, code: "MAT-12", name: "RCC Pipe NP3 (300mm)", category: "Material", unit: "m", used_in: "Road (WBSRoad)", default_rate: 0 },
  { resource_id: 86, code: "EQP-12", name: "Smooth Wheeled Roller", category: "Equipment", unit: "hr", used_in: "Road (WBSRoad)", default_rate: 0 },
  { resource_id: 91, code: "MAT-13", name: "Sub-base Material S1/S2", category: "Material", unit: "Cu.m.", used_in: "Road (WBSRoad)", default_rate: 0 },
  { resource_id: 95, code: "EQP-13", name: "Tipper Truck", category: "Equipment", unit: "hr", used_in: "Road (WBSRoad)", default_rate: 0 },
  { resource_id: 301, code: "EQP-14", name: "Tractor-Trolley", category: "Equipment", unit: "hr", used_in: "Road (WBSRoad)", default_rate: 0 },
  { resource_id: 302, code: "EQP-15", name: "Vibratory Roller", category: "Equipment", unit: "hr", used_in: "Road (WBSRoad)", default_rate: 0 },
  { resource_id: 114, code: "MAT-14", name: "HDPE Pipe 90mm PN6", category: "Material", unit: "m", used_in: "Irrigation (WRS)", default_rate: 0 },
  { resource_id: 115, code: "EQP-16", name: "Butt Fusion Welding Machine", category: "Equipment", unit: "hr", used_in: "Irrigation (WRS)", default_rate: 0 },
  { resource_id: 116, code: "MAT-15", name: "Solar Street Light Set 60W", category: "Material", unit: "Set", used_in: "Custom", default_rate: 0 },
  { resource_id: 117, code: "MAT-16", name: "Steel Pole 6m Octagonal", category: "Material", unit: "Set", used_in: "Custom", default_rate: 0 },
  { resource_id: 118, code: "MAT-17", name: "Interlocking Paver Blocks 60mm", category: "Material", unit: "Sq.m.", used_in: "Custom", default_rate: 0 },
  { resource_id: 126, code: "MAT-18", name: "Sal Timber", category: "Material", unit: "Cu.m.", used_in: "Building (WBSBD)", default_rate: 0 },
  { resource_id: 140, code: "MAT-19", name: "CGI Sheet", category: "Material", unit: "sq.m.", used_in: "Building (WBSBD)", default_rate: 0 },
  { resource_id: 143, code: "MAT-20", name: "Floor Tiles", category: "Material", unit: "sq.m.", used_in: "Building (WBSBD)", default_rate: 0 },
  { resource_id: 151, code: "MAT-21", name: "Enamel Paint", category: "Material", unit: "lit", used_in: "Building (WBSBD)", default_rate: 0 },
  { resource_id: 163, code: "MAT-22", name: "Wall Primer", category: "Material", unit: "lit", used_in: "Building (WBSBD)", default_rate: 0 },
  { resource_id: 176, code: "MAT-23", name: "Marble Slab", category: "Material", unit: "sq.m.", used_in: "Building (WBSBD)", default_rate: 0 }
];

// Sample of key rate norms mapped directly from user input JSON (Building WBSBD + Road WBSRoad)
export const INITIAL_NORMS: RateNormItem[] = [
  {
    item_id: 1,
    source: "Building (WBSBD)",
    code: "1.1 A",
    description: "Felling trees, cutting branches and cutting logs, carrying to a distance from the construction site of 15 m distance, including all related work (12-30 cm girth)",
    base_quantity: 1.0,
    base_unit: "Quantity",
    resources: [{ resource_id: 142, resource_name: "Unskilled Labor", category: "Labor", quantity_per_base_unit: 0.13 }]
  },
  {
    item_id: 12,
    source: "Building (WBSBD)",
    code: "2.01",
    description: "In soft clay and silty soil 'All types of excavation work 10 m distance with disposal and 1.5 m lift (by labor) |",
    base_quantity: 1.0,
    base_unit: "Cu.m.",
    resources: [{ resource_id: 142, resource_name: "Unskilled Labor", category: "Labor", quantity_per_base_unit: 0.7 }]
  },
  {
    item_id: 29,
    source: "Building (WBSBD)",
    code: "5.1 A2",
    description: "in substructure 1 No. chimney kiln bricks supplied 1:3 parts cement mortar jointing work |",
    base_quantity: 1.0,
    base_unit: "Cu.m.",
    resources: [
      { resource_id: 142, resource_name: "Unskilled Labor", category: "Labor", quantity_per_base_unit: 2.2 },
      { resource_id: 191, resource_name: "Skilled Mason", category: "Labor", quantity_per_base_unit: 1.5 },
      { resource_id: 159, resource_name: "Water", category: "Material", quantity_per_base_unit: 150.0 },
      { resource_id: 120, resource_name: "Bricks", category: "Material", quantity_per_base_unit: 400.0 },
      { resource_id: 193, resource_name: "OPC Cement", category: "Material", quantity_per_base_unit: 0.13 },
      { resource_id: 167, resource_name: "Sand", category: "Material", quantity_per_base_unit: 0.27 }
    ]
  },
  {
    item_id: 41,
    source: "Building (WBSBD)",
    code: "7.2B",
    description: "Supplying materials and placing in foundation, walls and boundary walls 1:4:8 parts cement concrete (PCC) work 30 m transport, including all related work |(Manual)",
    base_quantity: 1.0,
    base_unit: "Cu.m.",
    resources: [
      { resource_id: 142, resource_name: "Unskilled Labor", category: "Labor", quantity_per_base_unit: 4.0 },
      { resource_id: 191, resource_name: "Skilled Mason", category: "Labor", quantity_per_base_unit: 1.0 },
      { resource_id: 159, resource_name: "Water", category: "Material", quantity_per_base_unit: 100.0 },
      { resource_id: 193, resource_name: "OPC Cement", category: "Material", quantity_per_base_unit: 0.17 },
      { resource_id: 213, resource_name: "40mm Aggregate", category: "Material", quantity_per_base_unit: 0.65 },
      { resource_id: 205, resource_name: "20mm Aggregate", category: "Material", quantity_per_base_unit: 0.24 },
      { resource_id: 168, resource_name: "Coarse Sand", category: "Material", quantity_per_base_unit: 0.47 }
    ]
  },
  {
    item_id: 47,
    source: "Building (WBSBD)",
    code: "7.41B",
    description: "Supplying materials and placing with a concrete mixer in superstructure, deck slabs and beams 1:2:4 parts cement concrete (PCC) work 30 m transport, including all related work |",
    base_quantity: 1.0,
    base_unit: "Cu.m.",
    resources: [
      { resource_id: 142, resource_name: "Unskilled Labor", category: "Labor", quantity_per_base_unit: 3.5 },
      { resource_id: 191, resource_name: "Skilled Mason", category: "Labor", quantity_per_base_unit: 0.5 },
      { resource_id: 159, resource_name: "Water", category: "Material", quantity_per_base_unit: 130.0 },
      { resource_id: 193, resource_name: "OPC Cement", category: "Material", quantity_per_base_unit: 0.32 },
      { resource_id: 213, resource_name: "40mm Aggregate", category: "Material", quantity_per_base_unit: 0.52 },
      { resource_id: 205, resource_name: "20mm Aggregate", category: "Material", quantity_per_base_unit: 0.33 },
      { resource_id: 168, resource_name: "Coarse Sand", category: "Material", quantity_per_base_unit: 0.445 },
      { resource_id: 146, resource_name: "Diesel Fuel", category: "Material", quantity_per_base_unit: 3.0 },
      { resource_id: 123, resource_name: "Concrete Mixer", category: "Equipment", quantity_per_base_unit: 0.6 },
      { resource_id: 173, resource_name: "Concrete Vibrator", category: "Equipment", quantity_per_base_unit: 0.25 }
    ]
  },
  {
    item_id: 53,
    source: "Building (WBSBD)",
    code: "7.5",
    description: "Cutting, bending and placing steel reinforcement bars as per drawings for RCC, including binding and transport up to 30 m transport, including all related work |(8 mm-16mm diameter steel bars )",
    base_quantity: 1000.0,
    base_unit: "kg",
    resources: [
      { resource_id: 142, resource_name: "Unskilled Labor", category: "Labor", quantity_per_base_unit: 12.0 },
      { resource_id: 191, resource_name: "Skilled Mason", category: "Labor", quantity_per_base_unit: 12.0 },
      { resource_id: 122, resource_name: "MS Rebar", category: "Material", quantity_per_base_unit: 1.05 },
      { resource_id: 169, resource_name: "Binding Wire", category: "Material", quantity_per_base_unit: 10.0 }
    ]
  },
  {
    item_id: 184,
    source: "Road (WBSRoad)",
    code: "1.01A",
    description: "Dismantling of existing structures like culverts, bridges, retaining walls comprising of masonry, cement concrete by manual means (Grade M10 and below)",
    base_quantity: 20.0,
    base_unit: "Cu.m.",
    resources: [
      { resource_id: 84, resource_name: "Skilled Labor", category: "Labor", quantity_per_base_unit: 1.0 },
      { resource_id: 105, resource_name: "Unskilled Labor", category: "Labor", quantity_per_base_unit: 24.0 },
      { resource_id: 101, resource_name: "Tractor-Trolley", category: "Equipment", quantity_per_base_unit: 6.0 }
    ]
  },
  {
    item_id: 216,
    source: "Road (WBSRoad)",
    code: "2.02A",
    description: "Providing and Laying Reinforced cement concrete NP3 Flush jointed pipe for culverts including fixing with cement mortar 1:2 (300mm internal dia)",
    base_quantity: 12.5,
    base_unit: "m",
    resources: [
      { resource_id: 84, resource_name: "Skilled Labor", category: "Labor", quantity_per_base_unit: 1.0 },
      { resource_id: 105, resource_name: "Unskilled Labor", category: "Labor", quantity_per_base_unit: 5.0 },
      { resource_id: 79, resource_name: "Sand", category: "Material", quantity_per_base_unit: 0.08 },
      { resource_id: 33, resource_name: "Cement", category: "Material", quantity_per_base_unit: 0.06 },
      { resource_id: 75, resource_name: "RCC pipe NP3", category: "Material", quantity_per_base_unit: 12.5 }
    ]
  },
  {
    item_id: 264,
    source: "Road (WBSRoad)",
    code: "6.01A",
    description: "Providing and laying granular subbase on prepared surface, mixing at OMC and compacting by mechanical means (63mm Down Aggregate)",
    base_quantity: 300.0,
    base_unit: "Cu.m.",
    resources: [
      { resource_id: 85, resource_name: "Skilled Labor (RDS)", category: "Labor", quantity_per_base_unit: 2.0 },
      { resource_id: 106, resource_name: "Unskilled Labor (RDS)", category: "Labor", quantity_per_base_unit: 12.0 },
      { resource_id: 65, resource_name: "Motor grader", category: "Equipment", quantity_per_base_unit: 6.0 },
      { resource_id: 107, resource_name: "Vibratory roller", category: "Equipment", quantity_per_base_unit: 12.0 },
      { resource_id: 37, resource_name: "Cost of water (dup)", category: "Material", quantity_per_base_unit: 18.0 },
      { resource_id: 91, resource_name: "Sub-base Material S1/S2", category: "Material", quantity_per_base_unit: 384.0 },
      { resource_id: 98, resource_name: "Tractor / Loader", category: "Equipment", quantity_per_base_unit: 12.0 }
    ]
  },
  {
    item_id: 306,
    source: "Road (WBSRoad)",
    code: "13.01A",
    description: "Providing and laying Gabion structure for retaining earth with diaphragm including rolling, cutting, weaving and boulder filling (Box size 3x1x1m)",
    base_quantity: 6.0,
    base_unit: "Cu.m.",
    resources: [
      { resource_id: 85, resource_name: "Skilled Labor (RDS)", category: "Labor", quantity_per_base_unit: 3.0 },
      { resource_id: 106, resource_name: "Unskilled Labor (RDS)", category: "Labor", quantity_per_base_unit: 7.0 },
      { resource_id: 20, resource_name: "Binding Wire", category: "Material", quantity_per_base_unit: 3.62 },
      { resource_id: 63, resource_name: "Mesh wire", category: "Material", quantity_per_base_unit: 70.2 },
      { resource_id: 82, resource_name: "Selvedge Wire", category: "Material", quantity_per_base_unit: 7.82 },
      { resource_id: 28, resource_name: "Boulder / Stone", category: "Material", quantity_per_base_unit: 6.6 }
    ]
  }
];

export const SPEC_DOCS_LIST = [
  { file_id: "01", filename: "01_Project_Vision.md", title: "Project Vision & Mandate" },
  { file_id: "02", filename: "02_Product_Requirements.md", title: "Product Requirements Document (PRD)" },
  { file_id: "03", filename: "03_User_Stories.md", title: "User Stories & Personas" },
  { file_id: "04", filename: "04_Functional_Requirements.md", title: "Functional Requirements" },
  { file_id: "05", filename: "05_Non_Functional_Requirements.md", title: "Non-Functional Requirements" },
  { file_id: "06", filename: "06_Database_Design.md", title: "3NF Database Schema Specification" },
  { file_id: "07", filename: "07_ER_Diagram.md", title: "Entity-Relationship (ER) Diagram" },
  { file_id: "08", filename: "08_System_Architecture.md", title: "High-Level System Architecture" },
  { file_id: "09", filename: "09_API_Specification.md", title: "REST API Specification" },
  { file_id: "10", filename: "10_UI_UX_Guidelines.md", title: "UI/UX Design System Guidelines" },
  { file_id: "11", filename: "11_Project_Folder_Structure.md", title: "Repository & Component Structure" },
  { file_id: "12", filename: "12_Module_Breakdown.md", title: "Core Modules & Calculation Mechanics" },
  { file_id: "13", filename: "13_Roadmap.md", title: "20-Year Development Roadmap" },
  { file_id: "14", filename: "14_Testing_Strategy.md", title: "Quality Assurance & Math Test Suite" },
  { file_id: "15", filename: "15_Deployment_Guide.md", title: "Docker, Cloud Run & Tauri Build Guide" },
  { file_id: "16", filename: "16_User_Manual.md", title: "Civil Estimator User Manual" },
  { file_id: "17", filename: "17_Admin_Manual.md", title: "System Administrator & Rates Manual" },
  { file_id: "18", filename: "18_Developer_Guide.md", title: "Developer Onboarding & Setup" },
  { file_id: "19", filename: "19_Data_Migration_Guide.md", title: "Legacy SQLite/Excel Data Ingestion" },
  { file_id: "20", filename: "20_Future_Features.md", title: "AI OCR, BIM 4D & Blockchain Audit" },
  { file_id: "21", filename: "21_Initialization_Module_Architecture.md", title: "Enterprise Initialization Module & ERP Master Architecture" }
];
