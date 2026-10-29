export type ResourceCategory = 'Material' | 'Labor' | 'Equipment' | 'Transport' | 'Unclassified' | 'Excluded';

export type AuthorityType = 'Metropolitan City' | 'Sub-Metropolitan City' | 'Local Authority' | 'Rural Local Authority';

export interface FiscalYearConfig {
  id: string;
  code: string; // e.g., "2026/27"
  is_active: boolean;
  is_locked: boolean;
  start_date_iso: string;
  end_date_iso: string;
  copied_from_fy?: string;
  created_at: string;
}

export interface OrganizationSetup {
  province: string;
  zone: string;
  authority_type: AuthorityType;
  authority_name: string;
  ward_no?: string;
  department: string;
  organization_name: string;
  office_name: string;
  logo_url?: string;
  address: string;
  contact_email: string;
  contact_phone: string;
  pan_no?: string;
}

export interface ZoneRateItem {
  id: string;
  item_code: string; // e.g., "DR-MAT-01"
  resource_code: string;
  name_en: string;
  category: ResourceCategory;
  subcategory: string;
  unit: string;
  zone_rate: number;
  effective_date: string;
  source: string; // e.g., "Capital City Zone Rate Committee"
  remarks?: string;
  fiscal_year: string;
  zone: string;
  mapped_resource_id?: number;
}

export interface ZoneRateImportLog {
  id: string;
  timestamp: string;
  file_name: string;
  total_rows: number;
  inserted_count: number;
  updated_count: number;
  failed_count: number;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  errors: string[];
}

export interface NormLibraryModule {
  id: string;
  code: string;
  title: string;
  department: 'BLD' | 'RDS' | 'IRR' | 'WSS' | 'PWR' | 'WRS' | 'URBAN';
  description: string;
  enabled: boolean;
  item_count: number;
  version: string;
  is_custom_clone?: boolean;
}

export interface ResourceMaster {
  resource_id: number;
  name: string;
  category: ResourceCategory;
  category_confidence?: string;
  unit: string;
  used_in?: string;
  default_rate: number;
  code?: string;
  aliases?: string[];
  is_tax_free?: boolean;
  rate_calc_type?: 'fixed' | 'percent_labour' | 'percent_equipment' | 'percent_material';
  remarks?: string;
  zone_rates?: Record<string, number>;
}

export interface NormResourceItem {
  resource_id: number | string;
  resource_name: string;
  category: ResourceCategory;
  quantity_per_base_unit: number;
  unit_override?: string;
  rate_calc_type?: 'fixed' | 'percent_labour' | 'percent_equipment' | 'percent_material';
  percentage_value?: number;
  is_tax_free?: boolean;
  default_rate?: number;
  code?: string;
}

export interface RateNormItem {
  item_id: number;
  source: string; // e.g. "Building (WBSBD)", "Road (WBSRoad)"
  code: string;
  description: string;
  base_quantity: number;
  base_unit: string;
  resources: NormResourceItem[];
  category_tag?: string;
  version?: string;
  is_custom_version?: boolean;
  parent_item_id?: number;
  status?: 'ACTIVE' | 'DEACTIVATED';
  productivity_rate?: string;
  reference_document?: string;
  is_composite?: boolean;
  composite_components?: Array<{
    item_id: number;
    code: string;
    description: string;
    factor: number;
  }>;
}

export interface ResourceMappingRule {
  id: string;
  zone_resource_code: string;
  zone_item_name: string;
  master_resource_id: number;
  master_resource_name: string;
  confidence_score: number; // 0 to 1
  match_type: 'CODE_EXACT' | 'NAME_EXACT' | 'ALIAS' | 'FUZZY_MATCH' | 'MANUAL';
  status: 'APPROVED' | 'PENDING_REVIEW';
}

export interface ZoneInfo {
  id: string;
  name_en: string;
  province: string;
  region: 'Mountain' | 'Hills' | 'Plains' | 'Urban';
  labor_multiplier: number;
  material_multiplier: number;
}

export interface RateCalculationResult {
  norm_id: number;
  item_code: string;
  description: string;
  base_quantity: number;
  base_unit: string;
  zone: string;
  fiscal_year: string;
  mode?: 'user' | 'contractor';
  
  labor_cost: number;
  material_cost: number;
  material_tax_amount?: number;
  equipment_cost: number;
  equipment_tax_amount?: number;
  transport_cost: number;
  
  lead_cost: number;
  lift_cost: number;
  royalty_tax: number;
  
  subtotal_direct_cost: number;
  contractor_overhead_amount: number;
  total_unit_rate: number;
  total_rate_with_tax: number;

  user_unit_rate?: number;
  contractor_unit_rate?: number;
  
  breakdown: Array<{
    resource_id: number;
    resource_name: string;
    category: ResourceCategory;
    quantity: number;
    unit: string;
    unit_rate: number;
    base_rate?: number;
    subtotal: number;
    tax_included?: boolean;
  }>;
}

export interface MeasurementBookDef {
  id: string;
  code: string;
  title: string;
  remarks?: string;
  created_at?: string;
}

export interface MBRow {
  id: string;
  mb_book_id?: string; // Optional parent MB Book ID for Multi-MB support
  is_heading?: boolean; // True if this row is a custom section / chapter heading in MB
  formula?: string; // Custom formula expression for quantity or cell linking (e.g., "=R1*0.5", "=SUM(R1:R3)", "=L*B*0.5")
  particulars: string; // e.g., "Main Block Footing F1", "Verandah Wall", "Deduction for Doors"
  no_of_units: number | string; // No. (multiplier, e.g. 1, 2, 4 or formula)
  length: number | string;      // L (m or ft or formula)
  breadth: number | string;     // B (m or ft or formula)
  height: number | string;      // H (m or ft or formula)
  quantity: number;    // Calculated: no_of_units * length * breadth * height or evaluated formula
  remarks?: string;
  custom_fields?: Record<string, string>; // Extra user-defined columns
  takeoff_id?: string; // Id of the PDF takeoff measurement this row was created from
}

export interface ProvisionalItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
}

export type CustomColCalcMode = 'none' | 'multiply' | 'add' | 'subtract';
export type CustomColPosition = 'after_particulars' | 'after_no' | 'after_h' | 'before_remarks';

export interface CustomColConfig {
  calcMode: CustomColCalcMode;
  position: CustomColPosition;
}

export interface CustomHeaderField {
  id: string;
  label: string;
  value: string;
}

export type ContingencyCalcBasis = 'net_budget' | 'allocated_budget' | 'grand_total';
export type UserContributionCalcBasis = 'net_budget' | 'allocated_budget' | 'grand_total' | 'fixed_amount';

export interface UserEstimateConfig {
  contingency_calc_basis?: ContingencyCalcBasis; // default 'net_budget'
  user_contribution_calc_basis?: UserContributionCalcBasis; // default 'net_budget'
  auto_contingency_enabled?: boolean; // default true (<=3L => 2%, 3L-20L => 1.5%, >20L => 1%)
  manual_contingency_percent?: number;
  manual_user_contribution_percent?: number;
  rate_precision?: number; // default 2 decimal places
  quantity_precision?: number; // default 2 decimal places
  amount_precision?: number; // default 2 decimal places
  truncate_quantity?: boolean; // default false (if true, truncate quantities to precision instead of rounding)
  contingency_percent_valuation?: number; // default 1.5%
  previous_installment_amount?: number; // 1st Authority Contribution Amount / Previous MB payment
  allocated_budget_override?: number; // Authority Contribution Amount / Allocated budget override
  currency_symbol?: string; // default 'currency'
  strict_rate_mode?: boolean; // default true (no default fake rates fallback)
  user_mode_material_tax_percent?: number; // default 10%
  user_mode_overhead_percent?: number; // default 0%
  contractor_mode_overhead_percent?: number; // default 15%
  contractor_mode_tax_percent?: number; // default 10%
}

export interface BOQItem {
  id: string;
  item_id: number;
  item_code: string;
  code?: string;
  description: string;
  unit: string;
  estimated_quantity: number;
  calculated_unit_rate: number;
  user_rate?: number;
  contractor_rate?: number;
  mode?: 'user' | 'contractor';
  total_amount: number;
  chapter: string;
  precision?: number; // Item-specific quantity decimal precision (e.g. 2, 3, 4 decimal places)
  truncate_quantity?: boolean; // Item-specific quantity truncation flag
  breadth?: number;
  height?: number;
  length?: number;
  custom_fields?: Record<string, any>;
  mb_rows?: MBRow[]; // Sub-rows for Measurement Book detailing
  custom_column_names?: string[]; // Dynamic extra columns added to MB table
  custom_column_config?: Record<string, CustomColConfig>; // Calculation rules and table position for custom columns
  included_calc_columns?: string[]; // Custom list of column keys included in quantity calculation (e.g. ['no_of_units', 'length', 'breadth', 'height'])
}

export interface ColumnLabelsConfig {
  particulars?: string;
  no_of_units?: string;
  length?: string;
  breadth?: string;
  height?: string;
  quantity?: string;
  unit?: string;
  rate?: string;
  amount?: string;
  remarks?: string;
}

export interface ProjectHeaderConfig {
  authority_name?: string;
  office_name?: string;
  office_address?: string;
  implementation_location?: string;
  contractor_name?: string;
  contract_no?: string;
  agreement_date?: string;
  work_order_date?: string;
  acceptance_date?: string;
  completion_date?: string;
  measurement_date?: string;
  page_no?: string;
  budget_head_no?: string;
  document_title_mb?: string;
  document_title_estimate?: string;
  document_title_rate_analysis?: string;
  document_title_resource?: string;
  custom_headings?: CustomHeaderField[]; // User dynamic extra custom project headings
  hidden_headings?: string[]; // IDs or keys of top header fields explicitly removed/hidden by user
  column_labels?: ColumnLabelsConfig; // Custom editable table column headers
}

export interface ProjectEstimate {
  id: string;
  title: string;
  client_name: string;
  zone: string;
  local_authority?: string;
  implementation_location?: string;
  budget_head_no?: string;
  allocated_budget_amount?: number; // (Allocated Budget)
  user_contribution_amount?: number;
  user_contribution_percent?: number; // %
  user_estimate_config?: UserEstimateConfig; // Config for user estimate budget, contingency & user contribution
  estimated_duration?: string;
  fiscal_year: string;
  header_config?: ProjectHeaderConfig;
  rate_mode?: 'user' | 'contractor';
  contractor_overhead_percent: number;
  tax_percent: number;
  provisional_sum?: number; // Provisional Sum (P.S.) legacy/fallback lump sum
  provisional_items?: ProvisionalItem[]; // Itemized schedule of Provisional Sums (EXCLUDING Tax)
  contingency_percent?: number; // Contingency percentage (usually 3% or 5%)
  lead_distance_km: number;
  measurement_books?: MeasurementBookDef[]; // Multi-MB books in an Estimate
  items: BOQItem[];
  created_at: string;
  updated_at: string;
  estimate_mb_versions?: EstimateMBVersion[];
}

export interface EstimateMBVersion {
  id: string;
  version_number: string; // e.g. "v1.0", "v1.1"
  title: string;          // e.g. "Baseline Estimate MB from CAD Section 1-1"
  created_at: string;
  source: 'CAD_DRAWING_ESTIMATE' | 'MANUAL_MB' | 'EXCEL_IMPORT' | 'RESTORED';
  drawing_category?: string;
  variant_name?: string;
  items_snapshot: BOQItem[];
  total_estimate_amount: number;
  total_items_count: number;
  sections_summary?: Array<{
    sectionCode: string;
    title?: string;
    chainageStart?: string;
    chainageEnd?: string;
    length: number;
    height: number;
    width: number;
  }>;
  // Saved CAD Drawing Snapshot at the time of Estimate
  saved_drawing_params?: any;
  saved_drawing_sections?: any[];
  saved_variant_key?: string;
  saved_mapping?: any;
  notes?: string;
}

// Valuation Entities (Post-Contract Management)
export interface Contract {
  id: string;
  project_id: string;
  contract_number: string;
  contract_title: string;
  contractor_name: string;
  contractor_pan?: string;
  awarded_amount: number;
  engineer_estimate_amount: number;
  tender_discount_percent: number;
  start_date_iso: string;
  completion_date_iso: string;
  retention_percent: number; // e.g., 5%
  advance_given: number;
  status: 'ACTIVE' | 'SUBSTANTIALLY_COMPLETED' | 'TERMINATED' | 'CLOSED';
}

export interface ValuationMBBook {
  id: string;
  mb_number: string; // e.g. "VMB-01", "VMB-02"
  title: string;     // e.g. "1st Running Bill Valuation MB", "2nd Running Bill Valuation MB", "Final Valuation MB"
  bill_type: 'RUNNING_BILL' | 'FINAL_VALUATION';
  ipc_number: number;
  date_iso: string;
  book_ref_no?: string;
  page_start?: number;
  page_end?: number;
  verified_by: string;
  remarks?: string;
  created_at: string;
  sub_books?: MeasurementBookDef[]; // Sub-MB books within a single IPC
}

export interface ValuationMBRow {
  id: string;
  mb_id?: string;
  mb_book_id?: string; // Reference to parent MB Book (e.g. MB-01, MB-02)
  contract_id?: string;
  boq_item_id: string;
  ipc_number?: number; // IPC #1, #2, etc.
  date_iso?: string;
  particulars: string;
  no_of_units?: number | string;
  length?: number | string;
  breadth?: number | string;
  height?: number | string;
  quantity_this_bill: number;
  unit?: string;
  custom_fields?: Record<string, any>;
  formula?: string;
  is_heading?: boolean;
  verified_by?: string;
  remarks?: string;
  takeoff_id?: string; // Id of the PDF takeoff measurement this row was created from
}

export interface IPCBill {
  id: string;
  contract_id: string;
  ipc_number: number;
  bill_date_iso: string;
  period_from_iso: string;
  period_to_iso: string;
  gross_amount_this_bill: number;
  gross_amount_cumulative: number;
  retention_deduction: number; // 5%
  advance_deduction: number;
  tax_amount: number;
  net_payable_amount: number;
  status: 'DRAFT' | 'RECOMMENDED_BY_ENGINEER' | 'APPROVED' | 'DISBURSED';
  remarks?: string;
}

export interface VariationOrder {
  id: string;
  contract_id: string;
  variation_no: string;
  type: 'QUANTITY_VARIATION' | 'EXTRA_ITEM';
  item_code: string;
  description: string;
  unit: string;
  original_qty: number;
  revised_qty: number;
  approved_rate: number;
  amount_impact: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_by: string;
  approval_date_iso: string;
}

export interface CompletionCertificate {
  id: string;
  contract_id: string;
  certificate_no: string;
  completion_certificate_date_iso: string;
  actual_completion_date_iso?: string;
  defect_liability_months: number;
  defect_liability_period_months?: number;
  final_contract_amount: number;
  final_contract_value?: number;
  engineer_in_charge?: string;
  quality_grade?: 'SATISFACTORY' | 'GOOD' | 'EXCELLENT';
  status: 'ISSUED' | 'DRAFT' | 'ARCHIVED';
  verified_by_engineer?: string;
  remarks?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Senior Division Engineer' | 'Site Engineer' | 'Accountant' | 'Contractor Admin' | 'System Admin';
  department: string;
  office: string;
  active: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  module: string;
  action: string;
  details: string;
}

export interface DuplicatePair {
  id: string;
  resource1: ResourceMaster;
  resource2: ResourceMaster;
  similarity_score: number;
  reason: string;
}

export interface SpecDoc {
  file_id: string;
  filename: string;
  title: string;
  content: string;
}

export interface SetupWizardState {
  is_completed: boolean;
  completed_at?: string;
  current_step: number;
  fiscal_years: FiscalYearConfig[];
  active_fy: string;
  organization: OrganizationSetup;
  zone_rate_source: 'PRELOADED' | 'EXCEL_UPLOAD' | 'MANUAL';
  zone_rates: ZoneRateItem[];
  import_logs: ZoneRateImportLog[];
  norm_libraries: NormLibraryModule[];
  custom_norms: RateNormItem[];
  resource_mappings: ResourceMappingRule[];
}

export interface GeneralSettings {
  office_name: string;
  office_address: string;
  department: string;
  province: string;
  zone: string;
  local_authority: string;
  fiscal_year: string;
  contractor_overhead_percent: number;
  tax_percent: number;
  currency: string; // e.g. "currency"
  default_unit_system: 'Metric' | 'Imperial';
  precision_decimals: number;
  auto_save_enabled: boolean;
}

export interface MasterTemplate {
  file_type: 'UEV_TEMPLATE';
  version: '3.2.0';
  id: string;
  template_name: string;
  template_code: string; // e.g. "BLD_2026_27"
  description: string;
  department: 'BLD' | 'Roads Dept.' | 'Local Authority' | 'Irrigation' | 'WSS' | 'PWR' | 'General';
  fiscal_year: string;
  organization: OrganizationSetup;
  zone: string;
  province: string;
  general_settings: GeneralSettings;
  resources: ResourceMaster[];
  norms: RateNormItem[];
  zone_rates: Record<string, ResourceMaster[]>; // zone_id -> resources with rates
  created_at: string;
  updated_at: string;
  author: string;
}

export interface UEVProject {
  file_type: 'UEV_PROJECT';
  version: '3.2.0';
  id: string;
  project_code: string;
  title: string;
  template_id?: string;
  template_name?: string;
  client_name: string;
  contractor_name?: string;
  consultant_name?: string;
  location: string;
  zone: string;
  local_authority?: string;
  province?: string;
  fiscal_year: string;
  department: string;
  project_type: 'Building' | 'Road' | 'Bridge' | 'Water Supply' | 'Irrigation' | 'Electrical' | 'General Civil';
  funding_source?: 'Government' | 'Local Government' | 'World Bank' | 'ADB' | 'Donor Agency';
  rate_mode?: 'user' | 'contractor';
  contractor_overhead_percent: number;
  tax_percent: number;
  lead_distance_km: number;
  items: BOQItem[];
  created_at: string;
  updated_at: string;
}

export type RateCalculationMode = 'user' | 'contractor';

export interface RecentFile {
  id: string;
  name: string;
  file_type: 'template' | 'project';
  file_extension: '.uet' | '.uep';
  department: string;
  zone: string;
  fiscal_year: string;
  last_opened: string;
  is_pinned?: boolean;
}

export interface ExcelOpenRequest {
  fileName: string;
  buffer: ArrayBuffer;
}

export interface ExcelOpenResponse {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface FileWatchEvent {
  filePath: string;
  buffer: ArrayBuffer;
  timestamp: number;
}

export interface ComCellData {
  sheetName?: string;
  cellRef: string;
  value: string | number;
}

export interface ComAutomationStatus {
  isAvailable: boolean;
  activeWorkbookName?: string;
  excelProcessId?: number;
  error?: string;
}

// ----------------------------------------------------
// RDS Plant & Machinery (Equipment Engine) Types
// Circular 2075-10-18 Compliance
// ----------------------------------------------------
export type EquipmentCategory =
  | 'Earthmoving'
  | 'Compaction'
  | 'Concreting & Mixing'
  | 'Paving & Road'
  | 'Haulage & Transport'
  | 'Lifting & Cranes'
  | 'Power & Utilities'
  | 'General Civil';

export interface EquipmentOperatingBreakdown {
  ownership_cost_per_hr: number; // Depreciation + Capital Interest + Insurance + Tax
  fuel_cost_per_hr: number; // Diesel/Petrol consumption * rate
  electricity_cost_per_hr: number; // kWh * electricity tariff
  crew_cost_per_hr: number; // Operator + Assistant/Helper
  servicing_cost_per_hr: number; // Lubricants, filters, routine service
  maintenance_cost_per_hr: number; // Major repairs & spares
  heating_oil_cost_per_hr: number; // For bitumen/asphalt heaters
  total_hire_rate_per_hr: number; // Grand Total Hire Charge
}

export interface EquipmentMasterItem {
  id: string;
  code: string;
  name: string;
  category: EquipmentCategory;
  capacity: string;
  capacity_val: number;
  capacity_unit: string;
  output_val?: number;
  output_unit?: string;
  power_rating?: string; // e.g. "120 HP", "45 kW"
  fuel_type: 'Diesel' | 'Petrol' | 'Electric' | 'Dual' | 'None';
  fuel_consumption_rate: number; // liters/hr or kWh/hr
  activity_usage: string; // e.g. "Earth Excavation in bulk", "Compaction 95% MDD"
  default_hire_rate: number;
  breakdown: EquipmentOperatingBreakdown;
  source_circular: string; // e.g. "RDS Circular 2075-10-18"
  effective_fy: string;
  status: 'ACTIVE' | 'SUPERSEDED' | 'PROPOSED';
}

// ----------------------------------------------------
// Transportation Engine (RDS Sec 800 + WRS Sec 5) Types
// ----------------------------------------------------
export type TerrainType = 'Plains' | 'Hills' | 'Mountain';
export type RoadSurfaceType = 'Blacktopped' | 'Gravelled' | 'Earthen' | 'Riverbed/Rough Track';
export type TransportVehicleType = 'Truck (10 ton)' | 'Tipper (5.5 m3)' | 'Tractor Trailer (3 ton)' | 'Manual Porter' | 'Mixed Multi-Modal';

export interface TransportMaterialProfile {
  id: string;
  material_name: string;
  bulk_density_kg_m3: number; // e.g., Sand: 1400-1600, Stone: 1500-1800, Cement: 1440
  void_percentage: number; // e.g. 30% for aggregates
  unit: string;
  default_lead_km: number;
  is_transport_enabled_by_default: boolean;
}

export interface TransportCalculationParams {
  material_id?: string;
  material_name: string;
  quantity: number;
  unit: string;
  lead_km: number;
  terrain: TerrainType;
  road_surface: RoadSurfaceType;
  vehicle_type: TransportVehicleType;
  vehicle_capacity: number; // tonnes or m3
  loaded_speed_kmh: number;
  empty_speed_kmh: number;
  loading_time_mins: number;
  unloading_time_mins: number;
  include_loading_unloading: boolean;
}

export interface TransportCalculationResult {
  round_trip_distance_km: number;
  cycle_time_hours: number;
  trips_per_day: number;
  trips_required: number;
  total_vehicle_hours: number;
  hourly_vehicle_rate: number;
  transport_cost_total: number;
  cost_per_unit: number;
  loading_unloading_cost_total: number;
  grand_transport_rate_per_unit: number;
  methodology: 'RDS Section 800' | 'WRS Section 5' | 'Standard Empirical';
}

// ----------------------------------------------------
// Bar Bending Schedule (BBS) Engine Types
// ----------------------------------------------------
export type BBSShapeType =
  | 'STRAIGHT'
  | 'L_BEND'
  | 'U_HOOK'
  | 'RECT_STIRRUP'
  | 'CRANKED_BENT_UP'
  | 'CHAIR_BAR'
  | 'CAP_BAR'
  | 'HAUNCH_TIE'
  | 'CIRCULAR_TIE'
  | 'HELICAL_SPIRAL'
  | 'CUSTOM_MULTI_SEGMENT';

export type SegmentTurnDirection =
  | 'STRAIGHT'
  | 'TURN_UP_90'
  | 'TURN_DOWN_90'
  | 'TURN_LEFT_90'
  | 'TURN_RIGHT_90'
  | 'CRANK_UP_45'
  | 'CRANK_DOWN_45'
  | 'CRANK_UP_LEFT_45'
  | 'CRANK_DOWN_LEFT_45'
  | 'HOOK_IN_135'
  | 'HOOK_OUT_135'
  | 'HOOK_180'
  | 'CUSTOM_ANGLE';

export interface BBSSegmentDef {
  segment_id: string; // 'A', 'B', 'C', 'D', 'E', 'F', 'G', ...
  label: string; // e.g. "Main Span", "Vertical Leg", "Anchorage Bend", etc.
  length_m: number;
  direction: SegmentTurnDirection;
  turn_angle_deg: number; // 0 for initial/straight, 90, 45, 135, 180 or custom angle
  custom_angle_deg?: number; // relative turning angle or custom heading
  bend_deduction_d_factor?: number; // 2 for 90° (2d), 1 for 45° (1d), 3 for 135° (3d), 4 for 180° (4d)
  hook_type?: 'NONE' | 'HOOK_90' | 'HOOK_135' | 'HOOK_180';
  is_hook?: boolean;
}

export interface BBSStraightSegment {
  code: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  label: string;
  length_m: number;
  formula_expression?: string;
  isActive: boolean;
}

export interface BBSDimensionDriver {
  dimension_name: string; // e.g. "Barrel Length (Lb)", "Wall Height (H)", "Span (S)"
  dimension_val_m: number;
  clear_cover_mm: number;
  spacing_mm: number;
  multiplier: number; // e.g. 2 for both faces, 4 for corners
  formula_desc: string; // e.g. "[(8.50 - 2×0.04)/0.15 + 1] × 2 = 114 Nos"
}

export interface BBSItem {
  id: string;
  structure_name: string; // e.g. "Box Culvert 2x2m", "RCC Slab Culvert 4.0m", "RCC Drain Section"
  component: 'Base Slab' | 'Abutment Wall' | 'Top Slab' | 'Cover Slab' | 'Footing' | 'Column' | 'Beam' | 'Wing Wall' | 'Deck Slab' | 'L-Cap Bed-Block' | 'Dirt Wall' | 'Crash Kerb' | 'Stem' | 'Shear Key' | 'Pavement';
  bar_mark: string; // e.g. "A1", "T1", "SC-01", "ST-1"
  bar_diameter_mm: number; // 8, 10, 12, 16, 20, 25, 32
  shape_type: BBSShapeType;
  shape_code?: string; // BS 8666 standard shape code e.g. "00", "11", "21", "31", "41", "51", "61", "71", "99"
  shape_name?: string; // Human readable shape name
  
  // Number calculation parameters
  no_of_elements: number; // Number of similar structures
  bars_per_element: number; // Bars per structural unit (calculated from chosen dimension or manual)
  dimension_driver?: BBSDimensionDriver; // Associated chosen dimension
  formula_nos_desc?: string;
  
  // Straight line segments A, B, C, D, E, F
  length_a_m: number; // Main segment A
  length_b_m?: number; // Segment B
  length_c_m?: number; // Segment C
  length_d_m?: number; // Segment D
  length_e_m?: number; // Segment E
  length_f_m?: number; // Segment F
  
  // Defined custom segment sequence with turns & bends
  custom_segments?: BBSSegmentDef[];

  // Bend and hook allowances & deductions
  bend_count_90?: number;
  bend_count_135?: number;
  bend_count_45?: number;
  bend_count_180?: number;
  hook_allowance_m?: number;
  bend_deduction_m?: number;
  formula_cutting_length_desc?: string; // e.g. "A(3.20) + B(0.35) + C(0.35) - 2×2d(0.048) = 3.85m"
  
  cutting_length_m: number; // Net cutting length per bar
  total_length_m: number; // Total length for all bars
  unit_weight_kg_per_m: number; // d^2 / 162.28
  total_weight_kg: number;
  total_weight_tonnes: number;
  remarks?: string;
}

export interface BBSProjectSummary {
  diameter_breakdown: Record<number, { total_length_m: number; total_weight_kg: number; total_weight_tonnes: number }>;
  grand_total_weight_kg: number;
  grand_total_weight_tonnes: number;
  wastage_percent: number; // typically 2.5% to 5%
  gross_steel_required_tonnes: number;
}

// ----------------------------------------------------
// Project Snapshot & Audit Trail (Lock) Types
// ----------------------------------------------------
export interface ProjectSnapshot {
  snapshot_id: string;
  project_id: string;
  created_at: string;
  locked_by: string;
  lock_reason?: string;
  is_locked: boolean;
  norms_snapshot: RateNormItem[];
  resources_snapshot: ResourceMaster[];
  zone_rates_snapshot: Record<string, number>;
  equipment_rates_snapshot: EquipmentMasterItem[];
  transport_defaults_snapshot: Record<string, any>;
  calculation_settings_snapshot: UserEstimateConfig;
}

// ----------------------------------------------------
// Template Drawings & Dimension-Based Quantity Engine Types
// ----------------------------------------------------
export type TemplateDrawingCategory = 'Drain' | 'Culvert' | 'Road Section' | 'Retaining Structure' | 'Custom';

export interface DimensionParam {
  key: string;
  label: string;
  symbol: string; // e.g., "L", "W", "H", "tw", "tb", "z", "W_road"
  unit: 'm' | 'mm' | 'cm' | 'ratio' | 'nos' | '%' | 'deg' | 'kg' | 'kg/m3';
  default_val: number;
  default_value?: number;
  min?: number;
  max?: number;
  step?: number;
  description: string;
}

export interface TemplateWorkItemOutput {
  id: string;
  item_name: string;
  item_code_hint?: string; // Suggested norm or standard BOQ item code
  dor_item_no?: string; // Roads / Buildings Dept. standard rate analysis item code
  unit: string; // 'm3' | 'm2' | 'm' | 'kg' | 'ton' | 'nos' | 'sq.m' | 'cu.m'
  calc_formula_desc: string;
  calculated_quantity: number;
  unit_rate_qty?: number; // Per linear meter / unit quantity
  no_of_units: number | string;
  length_val: number | string;
  breadth_val: number | string;
  height_val: number | string;
  particulars_template: string;
  remarks?: string;
  category: 'Excavation' | 'Soling & PCC' | 'Masonry' | 'Concrete' | 'Formwork' | 'Rebar' | 'Plaster/Pointing' | 'Pavement' | 'Miscellaneous';
}

export interface DrawingTemplateDef {
  id: string;
  category: TemplateDrawingCategory;
  code: string; // e.g., "TMP-DRN-01"
  name: string;
  description: string;
  standard_ref: string; // e.g., "Roads Dept. Standard Drawings / BLD Standard Cross Sections"
  dimension_params: Record<string, number>;
  param_definitions: DimensionParam[];
  svg_type: 'trapezoidal_drain' | 'rcc_box_drain' | 'saucer_drain' | 'box_culvert' | 'slab_culvert' | 'pipe_culvert' | 'road_flexible' | 'road_rigid' | 'retaining_wall' | 'gabion_wall' | 'custom_generic';
  is_custom?: boolean;
}

export interface CustomDrawingTemplateSaved {
  id: string;
  category: TemplateDrawingCategory;
  code: string;
  name: string;
  description: string;
  standard_ref: string;
  dimension_params: Record<string, number>;
  param_definitions: DimensionParam[];
  svg_type: 'trapezoidal_drain' | 'rcc_box_drain' | 'saucer_drain' | 'box_culvert' | 'slab_culvert' | 'pipe_culvert' | 'road_flexible' | 'road_rigid' | 'retaining_wall' | 'gabion_wall' | 'custom_generic';
  custom_items: Array<{
    id: string;
    item_name: string;
    unit: string;
    category: 'Excavation' | 'Soling & PCC' | 'Masonry' | 'Concrete' | 'Formwork' | 'Rebar' | 'Plaster/Pointing' | 'Pavement' | 'Miscellaneous';
    formula_expression: string; // e.g., "L * (W + 2*tw) * H"
    particulars_pattern: string;
  }>;
  created_at: string;
}

// ----------------------------------------------------
// Visual Shape Geometry Editor & Norms-to-MB Mapping Types
// ----------------------------------------------------
export type GeometricShapeType = 'rectangle' | 'trapezoid' | 'triangle' | 'polygon' | 'circle' | 'compound_layer';

export interface VisualGeometricShape {
  id: string;
  name: string; // e.g. "Trapezoidal Excavation", "PCC Bed 1:3:6", "Stone Masonry Wall", "Asphalt Layer"
  shape_type: GeometricShapeType;
  color: string;
  hatch_pattern: 'concrete' | 'stone' | 'earth' | 'asphalt' | 'granular' | 'steel' | 'water' | 'sand' | 'brick' | 'solid';
  is_subtraction?: boolean; // For voids/cutouts
  is_visible: boolean;
  order: number;
  
  // Dimensions parameter keys / formulas
  dimensions: {
    length_param: string; // e.g. "L"
    width_param?: string; // e.g. "W_top" or "W"
    bottom_width_param?: string; // e.g. "W_bot" or "B"
    height_param?: string; // e.g. "H" or "D"
    thickness_param?: string; // e.g. "tw" or "t"
    side_slope_param?: string; // e.g. "z"
    nos_param?: string; // e.g. "No"
    offset_x_param?: string;
    offset_y_param?: string;
  };
  
  // Custom formula expression linked to MB quantity
  mb_formula: {
    expression: string; // e.g. "No * L * ((W_top + W_bot) / 2) * H"
    quantity_type: 'volume' | 'area' | 'length' | 'weight' | 'numbers';
    unit: string; // 'm3' | 'm2' | 'm' | 'kg' | 'nos'
    particulars_format: string; // e.g. "{name}: Section {L}m x {W_top}m x {H}m"
    remarks?: string;
  };
  
  // Norms / Rate Analysis Mapping
  norm_mapping?: {
    is_mapped: boolean;
    norm_id?: number | string;
    norm_code?: string; // e.g. "2.01", "5.1 2", "Roads Dept.-202"
    norm_source?: string;
    norm_description?: string;
    base_unit?: string;
    estimated_rate?: number;
    dor_item_no?: string;
  };
  
  include_in_mb_export: boolean; // Only mapped & selected items get exported to MB!
}

export interface VisualGeometryModel {
  id: string;
  name: string;
  category: 'Protection Wall' | 'Road' | 'Drain' | 'Retaining Structure' | 'Culvert' | 'Custom';
  description: string;
  chainage_reference: string;
  
  // Global parameter values
  parameters: Record<string, number>;
  parameter_defs: DimensionParam[];
  
  // Shapes collection
  shapes: VisualGeometricShape[];
  
  is_custom?: boolean;
  is_default?: boolean;
  
  created_at: string;
  updated_at: string;
}

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      platform: string;
      saveAndOpenXlsx: (fileName: string, buffer: ArrayBuffer) => Promise<ExcelOpenResponse>;
      openInOffice: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      startWatchingXlsx: (filePath: string) => Promise<{ success: boolean; watching?: string; error?: string }>;
      stopWatchingXlsx: () => Promise<{ success: boolean }>;
      selectFile: () => Promise<{ filePath: string; buffer: ArrayBuffer } | null>;
      onXlsxUpdated: (callback: (data: FileWatchEvent) => void) => () => void;
      initComAutomation?: () => Promise<ComAutomationStatus>;
      readComCellData?: (cellRef: string) => Promise<{ success: boolean; data?: ComCellData; error?: string }>;
      writeComCellData?: (data: ComCellData) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

