import { currencyCode } from '../services/currency';
// Comprehensive Engineering Templates Presets for Universal Estimating & Valuation
// Covers:
// 1. Templates of Headings for BOQ, Estimate, MB, Resource, Valuation MB, Valuation, Completion Certificate
// 2. Templates of Reports for BOQ, Estimate, MB, Resource, Valuation MB, Valuation, Completion Certificate
// 3. Templates of Drawings
// 4. Other Necessary Items (Public Audit, Standard Specifications, Statutory Deductions)

export interface HeadingItem {
  id: string;
  code: string;
  title: string;
  description?: string;
  unit?: string;
  isMandatory?: boolean;
  subheadings?: HeadingItem[];
}

export interface HeadingTemplate {
  id: string;
  module: 'boq' | 'estimate' | 'mb' | 'resource' | 'valuation-mb' | 'valuation' | 'completion-certificate';
  title: string;
  category: string;
  description: string;
  authority: string; // e.g. "BLD", "Roads Dept.", "Local Authority", "procurement rules"
  headings: HeadingItem[];
  defaultHeaderConfig?: Record<string, string>;
}

export interface ReportTemplate {
  id: string;
  module: 'boq' | 'estimate' | 'mb' | 'resource' | 'valuation-mb' | 'valuation' | 'completion-certificate';
  title: string;
  description: string;
  formNumber?: string; // e.g. ""
  standardPaperSize: 'A4' | 'A3' | 'Legal';
  orientation: 'portrait' | 'landscape';
  columns: Array<{ key: string; label: string; width?: string; align?: 'left' | 'center' | 'right' }>;
  sampleDataDescription: string;
  sampleRows: any[];
  signatories: Array<{ role: string;department?: string }>;
}

export interface DrawingTemplate {
  id: string;
  category: 'roads' | 'drains' | 'culverts' | 'retaining_walls' | 'building';
  name: string;
  description: string;
  standardScale: string;
  applicableNorms: string;
  drawingCode: string;
  parameters: Array<{ name: string; symbol: string; defaultValue: number; unit: string }>;
}

export interface NecessaryItemTemplate {
  id: string;
  type: 'public_audit' | 'specifications' | 'statutory_rules' | 'rate_breakdown';
  title: string;
  description: string;
  content: string;
  fields?: Array<{ label: string; value: string }>;
}

// ----------------------------------------------------------------------------------
// 1. TEMPLATES OF HEADINGS
// ----------------------------------------------------------------------------------
export const HEADING_TEMPLATES: HeadingTemplate[] = [
  // A. BOQ / ESTIMATE HEADINGS
  {
    id: 'boq_building',
    module: 'boq',
    title: 'BLD Standard Building Works Hierarchy',
    category: 'Civil Building',
    authority: 'Building Norms',
    description: 'Standard 12-section hierarchical headings for civil building works according to Government BLD standards.',
    headings: [
      { id: 'h1', code: '1.0', title: 'Preliminary & General Items',isMandatory: true },
      { id: 'h2', code: '2.0', title: 'Site Clearance & Earthwork Excavation',},
      { id: 'h3', code: '3.0', title: 'Soling & Substructure PCC',},
      { id: 'h4', code: '4.0', title: 'Reinforced Cement Concrete (RCC Frame)',},
      { id: 'h5', code: '5.0', title: 'TMT Reinforcement Steel',},
      { id: 'h6', code: '6.0', title: 'Formwork & Shuttering',},
      { id: 'h7', code: '7.0', title: 'Brick / Block Masonry Works',},
      { id: 'h8', code: '8.0', title: 'Plastering & Pointing Works',},
      { id: 'h9', code: '9.0', title: 'Flooring, Skirting & Tiling',},
      { id: 'h10', code: '10.0', title: 'Doors, Windows & Woodwork',},
      { id: 'h11', code: '11.0', title: 'Painting & Weathercoat Finishing',},
      { id: 'h12', code: '12.0', title: 'Sanitary, Plumbing & Electrification',},
      { id: 'h13', code: '13.0', title: 'Provisional Sums & Contingency',},
    ],
    defaultHeaderConfig: {
      document_title_estimate: 'Detailed Cost Estimate & BOQ',
      office_name: 'Local Authority Office / Infrastructure Development Office',
    }
  },
  {
    id: 'boq_dor_road',
    module: 'boq',
    title: 'Roads Department Road & Drainage Headings',
    category: 'Road & Highway',
    authority: 'Roads Dept. Standard Specifications',
    description: 'Standard roadwork hierarchy covering site clearing, subgrade, sub-base, crushed stone base, asphalt, and drainage cross-structures.',
    headings: [
      { id: 'r1', code: '100', title: 'General Items & Traffic Safety Provisions',},
      { id: 'r2', code: '200', title: 'Site Clearance & Tree Felling',},
      { id: 'r3', code: '300', title: 'Earthworks in Cut & Fill / Embankment',},
      { id: 'r4', code: '400', title: 'Subgrade Preparation & Compaction',},
      { id: 'r5', code: '500', title: 'Granular Sub-Base Course (GSB)',},
      { id: 'r6', code: '600', title: 'Crushed Stone Base Course (WMM)',},
      { id: 'r7', code: '700', title: 'Prime Coat & Bituminous Tack Coat',},
      { id: 'r8', code: '800', title: 'Asphalt Concrete / Premix Carpeting',},
      { id: 'r9', code: '900', title: 'Side Drains, Slab Culverts & Cross Drainage',},
      { id: 'r10', code: '1000', title: 'Gabion & Stone Masonry Retaining Structures',},
      { id: 'r11', code: '1100', title: 'Road Furniture, Signs & Thermoplastic Marking',},
    ],
  },
  {
    id: 'boq_user_committee',
    module: 'boq',
    title: 'Authority User Committee Estimate Format',
    category: 'Authority / Community',
    authority: 'Local Government Operation Act 2074',
    description: 'Tailored for Authority ward infrastructure projects executed by User Committees (Public Audit, User Contribution, Non-Taxable Items).',
    headings: [
      { id: 'u1', code: '1', title: 'Preliminary and administrative expenses (notice board, public hearing)',},
      { id: 'u2', code: '2', title: 'Earth excavation, filling and leveling work',},
      { id: 'u3', code: '3', title: 'PCC/RCC',},
      { id: 'u4', code: '4', title: 'Gabion wire mesh weaving and filling protection work',},
      { id: 'u5', code: '5', title: 'Wall, plaster and finishing work',},
      { id: 'u6', code: '6', title: 'User participation (voluntary labor / local contribution)',},
      { id: 'u7', code: '7', title: 'Technical and administrative contingency (1.5% to 3%)',},
    ],
  },

  // B. ESTIMATE HEADINGS
  {
    id: 'estimate_detailed_technical',
    module: 'estimate',
    title: 'Detailed Technical Engineering Estimate Headings',
    category: 'Engineering Estimate',
    authority: 'Standard Government Format',
    description: 'Complete breakdown containing Rate Analysis references, lead/lift haulage, and contingency computation hierarchy.',
    headings: [
      { id: 'e1', code: 'PART A', title: 'Direct Construction Works (Direct Cost)',},
      { id: 'e2', code: 'PART B', title: 'Material Lead, Lift & Haulage Surcharge',},
      { id: 'e3', code: 'PART C', title: 'Provisional Items & Environmental Compliance',},
      { id: 'e4', code: 'PART D', title: 'Contractor Overhead (15%)',},
      { id: 'e5', code: 'PART E', title: 'Value Added Tax - Tax',},
      { id: 'e6', code: 'PART F', title: 'Physical & Price Contingency (1% - 3%)',},
      { id: 'e7', code: 'PART G', title: 'Net Government / Authority Share',},
    ],
  },

  // C. MEASUREMENT BOOK (MB) HEADINGS
  {
    id: 'mb_structural_parts',
    module: 'mb',
    title: 'Standard Building MB Structural Sequence',
    category: 'Measurement Book',
    authority: 'Public Procurement Monitoring Office (procurement authority)',
    description: 'Sequential site measurement hierarchy for engineers from foundation footing up to roof terrace and parapet.',
    headings: [
      { id: 'm1', code: 'SEC-01', title: 'Foundation Excavation & Layout Trench',},
      { id: 'm2', code: 'SEC-02', title: 'Dry Stone / Flat Brick Soling Under Footing',},
      { id: 'm3', code: 'SEC-03', title: 'Lean Concrete PCC 1:3:6 in Foundation',},
      { id: 'm4', code: 'SEC-04', title: 'Isolated Footings & Mat Foundation RCC M20',},
      { id: 'm5', code: 'SEC-05', title: 'RCC Columns from Footing Top to Plinth Level',},
      { id: 'm6', code: 'SEC-06', title: 'Ground Floor Plinth Tie Beams',},
      { id: 'm7', code: 'SEC-07', title: 'RCC Columns Ground Floor to First Floor',},
      { id: 'm8', code: 'SEC-08', title: 'First Floor Suspended Slab & Intermediate Beams',},
      { id: 'm9', code: 'SEC-09', title: 'Superstructure Brickwork in 1:4 Cement Mortar',},
      { id: 'm10', code: 'SEC-10', title: 'Internal & External Cement Sand Plaster 12.5mm',},
    ],
  },
  {
    id: 'mb_road_chainage',
    module: 'mb',
    title: 'Road Chainage-wise Linear MB Headings',
    category: 'Road MB',
    authority: 'Roads Dept. Format',
    description: 'Chainage stride measurement format (e.g., 0+000 to 0+500) for road earthwork, GSB, WMM, and carpeting layers.',
    headings: [
      { id: 'mc1', code: 'CH-EARTH', title: 'Road Formation & Embankment by Chainage (From - To)',},
      { id: 'mc2', code: 'CH-GSB', title: 'Granular Sub-Base (GSB) Layer Thickness & Width',},
      { id: 'mc3', code: 'CH-WMM', title: 'Wet Mix Macadam (Base Course) Spread & Compaction',},
      { id: 'mc4', code: 'CH-BITUMEN', title: 'Asphalt Wearing Course / Bituminous Surface Treatment',},
      { id: 'mc5', code: 'CH-DRAIN', title: 'Side Drain Masonry & Concrete Cover Slab Stride',},
    ],
  },

  // D. RESOURCE HEADINGS
  {
    id: 'resource_schedule_headings',
    module: 'resource',
    title: 'Standard Resource Breakdown Master Categories',
    category: 'Resources & Procurement',
    authority: 'Zone Rate Committee & BLD',
    description: 'Complete grouping hierarchy for Materials, Labor, Equipment, Haulage, and Royalty.',
    headings: [
      { id: 'res_mat', code: 'MAT', title: 'A. Construction Materials',},
      { id: 'res_lab_s', code: 'LAB-SKILLED', title: 'B1. Skilled Labor',},
      { id: 'res_lab_u', code: 'LAB-UNSKILLED', title: 'B2. Unskilled Labor',},
      { id: 'res_eqp', code: 'EQP', title: 'C. Machinery, Plant & Equipment',},
      { id: 'res_fuel', code: 'POL', title: 'D. Fuel, Oil & Lubricants',},
      { id: 'res_trans', code: 'TRANS', title: 'E. Transport & Lead Haulage',},
      { id: 'res_tax', code: 'ROYALTY', title: 'F. Local Government Royalties & Quarry Taxes',},
    ],
  },

  // E. VALUATION MB HEADINGS
  {
    id: 'valuation_mb_headings',
    module: 'valuation-mb',
    title: 'Running Bill Measurement Book (Valuation MB) Hierarchy',
    category: 'Valuation & Billing',
    authority: 'procurement authority Running Bill Rules',
    description: 'Structure for progress measurements separating previous verified quantities from current bill claims.',
    headings: [
      { id: 'vmb1', code: 'MB-PREV', title: '1. Previous Certified Measurement',},
      { id: 'vmb2', code: 'MB-CURR', title: '2. This Bill Measurement',},
      { id: 'vmb3', code: 'MB-TOTAL', title: '3. Up to Date Cumulative Measurement',},
      { id: 'vmb4', code: 'MB-DEV', title: '4. Deviation / Variance against Original BOQ Quantity',},
      { id: 'vmb5', code: 'MB-EXTRA', title: '5. Variation Orders (VO) & Extra Non-BOQ Works',},
    ],
  },

  // F. VALUATION / IPC (RUNNING BILL) HEADINGS
  {
    id: 'valuation_ipc_headings',
    module: 'valuation',
    title: 'Interim Payment Certificate (IPC) Statutory Billing Headings',
    category: 'Payment Certificate',
    authority: 'Public Procurement Act 2063 / Rules 2064',
    description: 'Official financial reconciliation headings with all statutory deductions (Mobilization, Retention 5%, withholding tax 1.5%, Net Payable).',
    headings: [
      { id: 'ipc1', code: 'SEC-A', title: 'A. Gross Value of Work Executed Up to Date',},
      { id: 'ipc2', code: 'SEC-B', title: 'B. Less: Gross Value Certified in Previous Bills',},
      { id: 'ipc3', code: 'SEC-C', title: 'C. Gross Payable for Current Period (A - B)',},
      { id: 'ipc4', code: 'SEC-D', title: 'D. Statutory Deductions:',},
      { id: 'ipc4_1', code: 'D.1', title: ' 1. Mobilization Advance Recovery',},
      { id: 'ipc4_2', code: 'D.2', title: ' 2. Retention Money @ 5% (%)',},
      { id: 'ipc4_3', code: 'D.3', title: ' 3. Advance Income Tax (withholding tax) @ 1.5% (%)',},
      { id: 'ipc4_4', code: 'D.4', title: ' 4. Liquidated Damages / Penalties',},
      { id: 'ipc4_5', code: 'D.5', title: '  5. User Committee Contribution / Shramdan Deductions',},
      { id: 'ipc5', code: 'SEC-E', title: 'E. Total Deductions',},
      { id: 'ipc6', code: 'SEC-F', title: 'F. Net Payable to Contractor / User Committee (C - E)',},
    ],
  },

  // G. WORK COMPLETION HEADINGS
  {
    id: 'completion_certificate_headings',
    module: 'completion-certificate',
    title: 'Work Completion Certificate Format',
    category: 'Completion & Handover',
    authority: 'Ministry of Federal Affairs & General Administration (MoFAGA)',
    description: 'Mandatory sections for final project completion, joint technical audit, user committee endorsement, and financial audit.',
    headings: [
      { id: 'ks1', code: 'Part 1', title: 'Project & Contract Profile',},
      { id: 'ks2', code: 'Part 2', title: 'Physical Progress & Technical Measurement',},
      { id: 'ks3', code: 'Part 3', title: 'Quality & Material Test Clearance',},
      { id: 'ks4', code: 'Part 4', title: 'Monitoring Committee Recommendation',},
      { id: 'ks5', code: 'Part 5', title: 'Public Audit & Social Hearing Confirmation',},
      { id: 'ks6', code: 'Part 6', title: 'Final Financial Reconciliation',},
      { id: 'ks7', code: 'Part 7', title: ' (DLP) (Handover & Defect Liability)',},
    ],
    defaultHeaderConfig: {
      document_title_estimate: 'Work Completion Report',
      office_name: 'Local Authority Office',
    }
  },
];

// ----------------------------------------------------------------------------------
// 2. TEMPLATES OF REPORTS
// ----------------------------------------------------------------------------------
export const REPORT_TEMPLATES: ReportTemplate[] = [
  // A. BOQ / ESTIMATE REPORT
  {
    id: 'rpt_boq_abstract',
    module: 'boq',
    title: 'Official Abstract of Cost & BOQ Report',
    description: 'Standard Government BOQ presentation report with Chapter breakdown, Subtotals, Contingency & Tax.',
    formNumber: 'procurement authority Standard Form',
    standardPaperSize: 'A4',
    orientation: 'portrait',
    columns: [
      { key: 'sn', label: 'S.N.', width: '6%', align: 'center' },
      { key: 'item_code', label: 'Item Code', width: '12%', align: 'left' },
      { key: 'description', label: 'Description of Works', width: '40%', align: 'left' },
      { key: 'unit', label: 'Unit', width: '8%', align: 'center' },
      { key: 'quantity', label: 'Quantity', width: '10%', align: 'right' },
      { key: 'rate', label: `Rate (${currencyCode()})`, width: '12%', align: 'right' },
      { key: 'amount', label: `Amount (${currencyCode()})`, width: '12%', align: 'right' },
    ],
    sampleDataDescription: 'Includes sample civil building works (Excavation, Soling, RCC M20, Brickwork).',
    sampleRows: [
      { sn: '1', item_code: 'BLD-01', description: 'Earthwork excavation in foundation trench in all types of soil...', unit: 'm³', quantity: '45.20', rate: '350.00', amount: '15,820.00' },
      { sn: '2', item_code: 'BLD-04', description: 'Flat brick soling in foundation and under floor...', unit: 'm²', quantity: '68.50', rate: '620.00', amount: '42,470.00' },
      { sn: '3', item_code: 'BLD-12', description: 'PCC 1:3:6 (1 cement : 3 sand : 6 stone aggregate) in foundation...', unit: 'm³', quantity: '12.40', rate: '10,850.00', amount: '134,540.00' },
      { sn: '4', item_code: 'BLD-18', description: 'RCC M20 (1:1.5:3) in footings, plinth beams, columns and slabs...', unit: 'm³', quantity: '28.60', rate: '16,200.00', amount: '463,320.00' },
      { sn: '5', item_code: 'BLD-24', description: 'Supplying, bending and placing Fe 500 TMT reinforcement rebar...', unit: 'kg', quantity: '2,850.00', rate: '115.00', amount: '327,750.00' },
    ],
    signatories: [
      { role: 'Prepared By',},
      { role: 'Checked By',},
      { role: 'Approved By',},
    ]
  },
  {
    id: 'rpt_boq_bidder_blank',
    module: 'boq',
    title: 'Tender Blank BOQ (Bid Document Schedule)',
    description: 'Priceless tender document for public bidding with blank rate and amount columns for bidders to quote.',
    formNumber: 'IFB / NCB Schedule A',
    standardPaperSize: 'A4',
    orientation: 'portrait',
    columns: [
      { key: 'sn', label: 'Item No.', width: '8%', align: 'center' },
      { key: 'description', label: 'Description of Work Item', width: '45%', align: 'left' },
      { key: 'unit', label: 'Unit', width: '10%', align: 'center' },
      { key: 'quantity', label: 'Quantity', width: '12%', align: 'right' },
      { key: 'rate_figure', label: 'Bidder Rate (Figures)', width: '12%', align: 'center' },
      { key: 'rate_words', label: 'Bidder Rate (In Words)', width: '13%', align: 'center' },
    ],
    sampleDataDescription: 'Official procurement schedule where contractor enters rates in figures and words.',
    sampleRows: [
      { sn: '1.01', description: 'Site clearance and removing shrubs, trees up to 300mm girth...', unit: 'm²', quantity: '450.00', rate_figure: '________', rate_words: '________________' },
      { sn: '1.02', description: 'Earthwork excavation in foundation trenches including 10m lead...', unit: 'm³', quantity: '65.00', rate_figure: '________', rate_words: '________________' },
      { sn: '1.03', description: 'Dry stone soling packed under floor and foundation...', unit: 'm²', quantity: '82.00', rate_figure: '________', rate_words: '________________' },
    ],
    signatories: [
      { role: 'Procurement Officer',},
      { role: 'Authorized Contractor Stamp',},
    ]
  },

  // B. MB REPORT
  {
    id: 'rpt_mb_standard_8_col',
    module: 'mb',
    title: 'Standard 8-Column Measurement Book',
    description: 'Authentic 8-column engineering measurement book layout strictly conforming to standard public procurement formats.',
    formNumber: '. (MB Form)',
    standardPaperSize: 'A4',
    orientation: 'landscape',
    columns: [
      { key: 'item_no', label: 'Item No.', width: '6%', align: 'center' },
      { key: 'particulars', label: 'Particulars of Work & Location', width: '38%', align: 'left' },
      { key: 'nos', label: 'No.', width: '8%', align: 'center' },
      { key: 'l', label: 'Length (L)', width: '10%', align: 'right' },
      { key: 'b', label: 'Breadth (B)', width: '10%', align: 'right' },
      { key: 'h', label: 'Height / Depth (H)', width: '10%', align: 'right' },
      { key: 'qty', label: 'Quantity', width: '10%', align: 'right' },
      { key: 'unit', label: 'Unit', width: '8%', align: 'center' },
    ],
    sampleDataDescription: 'Step-by-step measurements with detailed formulas and deductions.',
    sampleRows: [
      { item_no: '1', particulars: 'Earthwork excavation for Column Footings F1 (6 Nos)', nos: '6', l: '1.80', b: '1.80', h: '1.50', qty: '29.16', unit: 'm³' },
      { item_no: '', particulars: 'Column Footings F2 (4 Nos)', nos: '4', l: '1.50', b: '1.50', h: '1.50', qty: '13.50', unit: 'm³' },
      { item_no: '', particulars: 'Plinth Beam Trench Excavation (Grid A-D)', nos: '2', l: '14.50', b: '0.40', h: '0.50', qty: '5.80', unit: 'm³' },
      { item_no: '', particulars: 'Total Earthwork Quantity =', nos: '', l: '', b: '', h: '', qty: '48.46', unit: 'm³' },
      { item_no: '2', particulars: 'Dry Stone Soling under footing F1', nos: '6', l: '1.80', b: '1.80', h: '0.15', qty: '19.44', unit: 'm²' },
      { item_no: '', particulars: 'Deduct: Existing inspection pit', nos: '-1', l: '0.80', b: '0.80', h: '0.15', qty: '-0.64', unit: 'm²' },
      { item_no: '', particulars: 'Net Soling Quantity =', nos: '', l: '', b: '', h: '', qty: '18.80', unit: 'm²' },
    ],
    signatories: [
      { role: 'Measured By',},
      { role: 'Checked & Verified By',},
      { role: 'Contractor Acceptance',},
    ]
  },

  // C. RESOURCE REPORT
  {
    id: 'rpt_resource_indent',
    module: 'resource',
    title: 'Comprehensive Material, Labor & Plant Schedule',
    description: 'Calculates total physical requirements (bags of cement, sand tons, rebar kg, skilled man-days) from BOQ norm quantities.',
    standardPaperSize: 'A4',
    orientation: 'portrait',
    columns: [
      { key: 'code', label: 'Resource Code', width: '12%', align: 'center' },
      { key: 'name', label: 'Resource Description', width: '38%', align: 'left' },
      { key: 'category', label: 'Category', width: '15%', align: 'center' },
      { key: 'unit', label: 'Unit', width: '10%', align: 'center' },
      { key: 'total_qty', label: 'Total Requirement', width: '12%', align: 'right' },
      { key: 'avg_rate', label: 'Zone Rate', width: '13%', align: 'right' },
    ],
    sampleDataDescription: 'Procurement schedule derived from standard engineering rate norms.',
    sampleRows: [
      { code: 'MAT-001', name: 'Ordinary Portland Cement (OPC 43/53 Grade)', category: 'Material', unit: 'Bags', total_qty: '420.00', avg_rate: '750.00' },
      { code: 'MAT-002', name: 'Fine Sand (River Bed Clean Sand)', category: 'Material', unit: 'm³', total_qty: '28.50', avg_rate: '2,800.00' },
      { code: 'MAT-003', name: 'Coarse Aggregate (20mm down machine crushed)', category: 'Material', unit: 'm³', total_qty: '42.00', avg_rate: '3,200.00' },
      { code: 'MAT-004', name: 'TMT Reinforcement Steel Bars (Fe 500)', category: 'Material', unit: 'kg', total_qty: '3,650.00', avg_rate: '115.00' },
      { code: 'LAB-001', name: 'Skilled Mason', category: 'Labor', unit: 'Man-day', total_qty: '145.00', avg_rate: '1,250.00' },
      { code: 'LAB-002', name: 'Unskilled Labor', category: 'Labor', unit: 'Man-day', total_qty: '380.00', avg_rate: '900.00' },
    ],
    signatories: [
      { role: 'Store Keeper / Site In-charge',},
      { role: 'Project Engineer',},
    ]
  },

  // D. VALUATION MB REPORT
  {
    id: 'rpt_valuation_mb',
    module: 'valuation-mb',
    title: 'Running Bill Measurement Book (Valuation Sheet)',
    description: 'Official comparison sheet matching previous measurements against this bill execution.',
    formNumber: 'Farām No. 44 (procurement rules)',
    standardPaperSize: 'A4',
    orientation: 'landscape',
    columns: [
      { key: 'item_no', label: 'BOQ Item', width: '8%', align: 'center' },
      { key: 'description', label: 'Item Description', width: '30%', align: 'left' },
      { key: 'unit', label: 'Unit', width: '7%', align: 'center' },
      { key: 'boq_qty', label: 'BOQ Scope Qty', width: '11%', align: 'right' },
      { key: 'prev_qty', label: 'Previous Certified', width: '11%', align: 'right' },
      { key: 'curr_qty', label: 'This Bill Executed', width: '11%', align: 'right' },
      { key: 'total_qty', label: 'Total to Date', width: '11%', align: 'right' },
      { key: 'status', label: 'Variance %', width: '11%', align: 'center' },
    ],
    sampleDataDescription: 'Verifies whether actual measurements remain within the 15% statutory variation limit.',
    sampleRows: [
      { item_no: '1.01', description: 'Site clearance and top soil stripping', unit: 'm²', boq_qty: '450.00', prev_qty: '450.00', curr_qty: '0.00', total_qty: '450.00', status: '100% (Completed)' },
      { item_no: '2.01', description: 'Earthwork excavation in foundation trenches', unit: 'm³', boq_qty: '65.00', prev_qty: '50.00', curr_qty: '15.00', total_qty: '65.00', status: '100% (Completed)' },
      { item_no: '3.01', description: 'RCC M20 in Column Footings & Plinth Beams', unit: 'm³', boq_qty: '32.00', prev_qty: '14.50', curr_qty: '16.00', total_qty: '30.50', status: '95.3% (In-Progress)' },
      { item_no: '4.01', description: 'TMT Reinforcement Steel Placement', unit: 'kg', boq_qty: '3,200.00', prev_qty: '1,450.00', curr_qty: '1,600.00', total_qty: '3,050.00', status: '95.3% (In-Progress)' },
    ],
    signatories: [
      { role: 'Site Overseer',},
      { role: 'Resident Engineer',},
      { role: 'Contractor Authorized Rep',},
    ]
  },

  // E. VALUATION / RUNNING BILL (IPC) REPORT
  {
    id: 'rpt_ipc_bill',
    module: 'valuation',
    title: 'Interim Payment Certificate (IPC) Running Bill Statement',
    description: 'Official Government running bill format containing gross amounts, previous payments, retention, withholding tax, and net payable amount.',
    formNumber: 'Running Bill',
    standardPaperSize: 'A4',
    orientation: 'portrait',
    columns: [
      { key: 'particulars', label: 'Bill Particulars / Items', width: '55%', align: 'left' },
      { key: 'reference', label: 'Ref / Formula', width: '15%', align: 'center' },
      { key: 'amount', label: `Amount (${currencyCode()})`, width: '30%', align: 'right' },
    ],
    sampleDataDescription: 'Accounting reconciliation for financial disbursement.',
    sampleRows: [
      { particulars: '1. Total Value of Works Executed Up to Date (Gross Valuation)', reference: 'MB Sheet Total', amount: '2,450,800.00' },
      { particulars: '2. Less: Gross Value Certified in Previous Bills (Running Bill 01)', reference: 'Prev Bill Certified', amount: '1,120,000.00' },
      { particulars: '3. Gross Value of Work Done in This Bill (1 - 2)', reference: 'Period Gross', amount: '1,330,800.00' },
      { particulars: '4. Statutory & Contractual Deductions:', reference: '', amount: '' },
      { particulars: '   a) Mobilization Advance Recovery (10%)', reference: 'Advance Clause', amount: '133,080.00' },
      { particulars: '   b) Security Retention Money (5%)', reference: 'procurement rules Clause 52', amount: '66,540.00' },
      { particulars: '   c) Advance Income Tax (withholding tax @ 1.5%)', reference: 'Inland Revenue', amount: '19,962.00' },
      { particulars: '   d) Local Royalty / Other Deductions', reference: 'Quarry Fee', amount: '4,500.00' },
      { particulars: '5. Total Deductions in This Bill', reference: 'Sum (a+b+c+d)', amount: '224,082.00' },
      { particulars: '6. NET AMOUNT PAYABLE TO CONTRACTOR (3 - 5)', reference: 'Pay Order Amount', amount: '1,106,718.00' },
    ],
    signatories: [
      { role: 'Account Officer',},
      { role: 'Planning / Technical Head',},
      { role: 'Chief Executive Officer',},
    ]
  },

  // F. WORK COMPLETION REPORT
  {
    id: 'rpt_completion_certificate_final',
    module: 'completion-certificate',
    title: 'Work Completion Certificate',
    description: 'Comprehensive Local Government completion document required for final bill audit, fund release, and project closure.',
    formNumber: 'Local level project completion form',
    standardPaperSize: 'A4',
    orientation: 'portrait',
    columns: [
      { key: 'field', label: 'Particulars', width: '35%', align: 'left' },
      { key: 'approved', label: 'Approved', width: '30%', align: 'center' },
      { key: 'actual', label: 'Actual Done', width: '35%', align: 'center' },
    ],
    sampleDataDescription: 'Executive closure sheet signed by technical staff, user committee, and ward officials.',
    sampleRows: [
      { field: '1. Total project cost / budget amount', approved: `${currencyCode()} 1,500,000.00`, actual: `${currencyCode()} 1,485,200.00` },
      { field: '2. Local authority / office grant', approved: `${currencyCode()} 1,200,000.00`, actual: `${currencyCode()} 1,200,000.00` },
      { field: '3. User participation (voluntary labor)', approved: `${currencyCode()} 300,000.00`, actual: `${currencyCode()} 285,200.00` },
      { field: '4. Project start and completion dates', approved: '2026-02-15 to 2026-04-30', actual: '2026-04-25 (completed within deadline)' },
      { field: 'Physical Progress', approved: '100 percent', actual: '100 percent complete' },
      { field: '6. Technical quality test report', approved: 'As per specification', actual: 'Cube test and field inspection satisfactory' },
      { field: 'Public Audit', approved: 'Mandatory', actual: '2026-04-28 public hearing completed' },
    ],
    signatories: [
      { role: 'Consumer Committee Chair',},
      { role: 'Ward Engineer / Sub-Engineer',},
      { role: 'Monitoring Committee Coordinator',},
      { role: 'Ward Chairperson',},
    ]
  },
];

// ----------------------------------------------------------------------------------
// 3. TEMPLATES OF DRAWINGS
// ----------------------------------------------------------------------------------
export const DRAWING_TEMPLATES: DrawingTemplate[] = [
  {
    id: 'drw_road_urban_street',
    category: 'roads',
    name: 'Standard Authority Urban Street Cross-Section',
    description: 'Complete cross section showing Carriageway (5.5m), Crushed stone base (150mm), Sub-base (150mm), and Covered RCC side drain.',
    standardScale: '1:50',
    applicableNorms: 'Roads Dept. Urban Road Standards',
    drawingCode: 'RDS-STD-RD-01',
    parameters: [
      { name: 'Carriageway Width', symbol: 'W_c', defaultValue: 5.5, unit: 'm' },
      { name: 'Sub-base Thickness', symbol: 'T_sb', defaultValue: 0.15, unit: 'm' },
      { name: 'Base Course Thickness', symbol: 'T_b', defaultValue: 0.15, unit: 'm' },
      { name: 'Asphalt Thickness', symbol: 'T_ac', defaultValue: 0.04, unit: 'm' },
      { name: 'Drain Width', symbol: 'W_d', defaultValue: 0.60, unit: 'm' },
      { name: 'Drain Depth', symbol: 'D_d', defaultValue: 0.75, unit: 'm' },
    ]
  },
  {
    id: 'drw_drain_trapezoidal',
    category: 'drains',
    name: 'Trapezoidal Stone Masonry Drain Section',
    description: 'Heavy discharge hillside and highway drain with dry stone foundation and 1:4 cement mortar masonry walls.',
    standardScale: '1:25',
    applicableNorms: 'BLD Road Drainage Spec',
    drawingCode: 'DRN-TRAP-02',
    parameters: [
      { name: 'Bottom Width', symbol: 'b', defaultValue: 0.45, unit: 'm' },
      { name: 'Top Width', symbol: 'T', defaultValue: 1.10, unit: 'm' },
      { name: 'Depth', symbol: 'h', defaultValue: 0.60, unit: 'm' },
      { name: 'Wall Thickness', symbol: 't', defaultValue: 0.30, unit: 'm' },
      { name: 'Side Slope (H:V)', symbol: 'z', defaultValue: 0.5, unit: 'ratio' },
    ]
  },
  {
    id: 'drw_drain_rectangular_rcc',
    category: 'drains',
    name: 'Covered RCC Rectangular Storm Water Drain',
    description: 'High capacity urban roadside drain with removable M20 reinforced concrete perforated cover slabs.',
    standardScale: '1:20',
    applicableNorms: 'Applicable national building code',
    drawingCode: 'DRN-RCC-RECT-03',
    parameters: [
      { name: 'Clear Width', symbol: 'B', defaultValue: 0.60, unit: 'm' },
      { name: 'Clear Depth', symbol: 'H', defaultValue: 0.80, unit: 'm' },
      { name: 'Bed Concrete Thickness', symbol: 'T_bed', defaultValue: 0.15, unit: 'm' },
      { name: 'Wall Thickness', symbol: 'T_wall', defaultValue: 0.15, unit: 'm' },
      { name: 'Cover Slab Thickness', symbol: 'T_slab', defaultValue: 0.10, unit: 'm' },
    ]
  },
  {
    id: 'drw_culvert_slab',
    category: 'culverts',
    name: 'Standard RCC Slab Culvert (Span 2.0m to 4.0m)',
    description: 'Gravity stone masonry abutments with M25 reinforced concrete deck slab and wing walls.',
    standardScale: '1:50',
    applicableNorms: 'Roads Dept. Bridge & Culvert Standard Drawings',
    drawingCode: 'CULV-SLAB-04',
    parameters: [
      { name: 'Clear Span', symbol: 'S', defaultValue: 3.0, unit: 'm' },
      { name: 'Clear Height', symbol: 'H', defaultValue: 2.0, unit: 'm' },
      { name: 'Deck Slab Thickness', symbol: 'T_deck', defaultValue: 0.30, unit: 'm' },
      { name: 'Abutment Top Width', symbol: 'W_top', defaultValue: 0.60, unit: 'm' },
      { name: 'Abutment Bottom Width', symbol: 'W_bot', defaultValue: 1.20, unit: 'm' },
    ]
  },
  {
    id: 'drw_wall_gabion',
    category: 'retaining_walls',
    name: 'Stepped Gabion Wire Retaining Wall',
    description: 'Flexible heavy wire mesh crates filled with hard quarry boulders for slope stabilization and riverbank training.',
    standardScale: '1:50',
    applicableNorms: 'Roads Dept. Bio-engineering & Slope Protection',
    drawingCode: 'WALL-GAB-05',
    parameters: [
      { name: 'Total Height', symbol: 'H_tot', defaultValue: 4.0, unit: 'm' },
      { name: 'Top Width', symbol: 'B_top', defaultValue: 1.0, unit: 'm' },
      { name: 'Base Width', symbol: 'B_base', defaultValue: 2.5, unit: 'm' },
      { name: 'Crate Length', symbol: 'L_crate', defaultValue: 2.0, unit: 'm' },
      { name: 'Crate Height', symbol: 'H_crate', defaultValue: 1.0, unit: 'm' },
    ]
  },
  {
    id: 'drw_bldg_footing_column',
    category: 'building',
    name: 'Isolated Trapezoidal Footing & Column Detail',
    description: 'Detailed structural reinforcement cross section for residential and authority multi-story RCC buildings.',
    standardScale: '1:20',
    applicableNorms: 'NBC 105:2020 & NBC 205',
    drawingCode: 'BLDG-FTG-06',
    parameters: [
      { name: 'Footing Length', symbol: 'L_f', defaultValue: 1.80, unit: 'm' },
      { name: 'Footing Breadth', symbol: 'B_f', defaultValue: 1.80, unit: 'm' },
      { name: 'Depth at Face', symbol: 'D_face', defaultValue: 0.45, unit: 'm' },
      { name: 'Depth at Edge', symbol: 'D_edge', defaultValue: 0.20, unit: 'm' },
      { name: 'Column Size', symbol: 'C_size', defaultValue: 0.30, unit: 'm' },
    ]
  },
];

// ----------------------------------------------------------------------------------
// 4. OTHER NECESSARY ITEMS
// ----------------------------------------------------------------------------------
export const NECESSARY_ITEMS_TEMPLATES: NecessaryItemTemplate[] = [
  {
    id: 'item_public_audit_board',
    type: 'public_audit',
    title: 'Public Audit Notice Board',
    description: 'Mandatory on-site disclosure hoarding board detailing budget allocations, donor/authority grant, user contribution, timeline, and grievance contact.',
    content: `
========================================================================
PUBLIC INFORMATION BOARD
========================================================================
1. Project name: [Enter project name here]
2. Implementing body: [Concerned local authority / user committee]
3. Budget heading and source: [Internal source / counterpart / special grant]
4. Total approved estimate amount: . __________________
   a) Office / local authority grant: . __________________
   b) User participation (voluntary labor): . __________________
5. Agreement date: 208... / ... / ...
6. Work completion due date: 208... / ... / ...
7. Beneficiary households and population: ________ households / ________ population
8. User committee office bearers:\n   - Chairperson: _________________ (Phone: _______________)
   - Secretary: _________________ (Phone: _______________)
   - Treasurer: _________________ (Phone: _______________)
9. Technical supervisor (engineer / sub-engineer): _________________
10. Grievance officer: [Information officer, contact number: ___________]
========================================================================
Note: This notice board must be displayed visibly at the work site before the project starts.
    `,
    fields: [
      { label: 'Project name', value: 'Road upgrading and drain construction' },
      { label: 'Approved budget', value: `${currencyCode()} 1,500,000.00` },
      { label: 'Participation amount', value: `${currencyCode()} 225,000.00` },
      { label: 'Completion date', value: '2026-04-30' },
    ]
  },
  {
    id: 'item_statutory_deductions',
    type: 'statutory_rules',
    title: 'Statutory Taxes & Deductions in Construction Contracts',
    description: 'Summary of Public Procurement Act 2063 & Financial Rules governing deductions in bills.',
    content: `
1. Tax (Tax):
   - Standard Rate: 13% applied to all taxable civil construction items.
   - User committee materials purchased with invoice include Tax; labor is Tax-exempt.

2. Retention Money:
   - 5% withheld from every Interim Payment Certificate (IPC / Running Bill).
   - 50% released upon Work Completion Certificate (Completion Certificate).
   - Remaining 50% released after Defect Liability Period (DLP - usually 1 year) along with final clearance.

3. Advance Income Tax (withholding tax):
   - 1.5% deducted from payments made to Tax-registered construction firms.
   - Direct deposit into Inland Revenue Department (IRD) portal under PAN/Tax.

4. Mobilization Advance:
   - Up to 10% - 20% of contract amount against Bank Guarantee.
   - Recovered proportionally from running bills starting from 20% progress and completed before 80%-90% progress.

5. Contingency:
   - User Committee Works:
     * <= ${currencyCode()} 300,000 => 2.0%
     * ${currencyCode()} 300,001 - 2,000,000 => 1.5%
     * > ${currencyCode()} 2,000,000 => 1.0%
   - Departmental Tender Works: Standard 3% or 5% contingency.
    `,
  },
  {
    id: 'item_specifications_standard',
    type: 'specifications',
    title: 'Standard Technical Specifications & Clauses (BLD/Roads Dept.)',
    description: 'Standard material and workmanship test clauses for cement, rebar, sand, water, and curing.',
    content: `
1. Cement & Sand Mortar:
   - Cement must be fresh OPC/PPC conforming to the applicable national cement standard.
   - Sand shall be clean river sand, free from silt and organic impurities (silt content < 6%).
   - Mortar shall be mixed in mechanical mixer or on clean watertight platform and used within 30 minutes of adding water.

2. Reinforced Cement Concrete (RCC):
   - Characteristic compressive cube strength for M20: 20 N/mm² at 28 days (13.5 N/mm² at 7 days).
   - Slump test shall be maintained between 75mm to 100mm for beams/columns.
   - Minimum continuous moist curing period: 14 days under gunny bags.

3. TMT Reinforcement Steel:
   - High yield strength deformed rebar Fe 500 conforming to NS:84.
   - Free from loose mill scale, rust pitting, oils, and grease.
   - Lap length: 50 * diameter of bar (50d) for tension and 40d for compression.
    `,
  },
];
