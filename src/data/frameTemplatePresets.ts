// Comprehensive Structure & Frame Templates for Universal Estimating & Valuation
// Enables editing individual components, headings, letterheads, table columns, and frames

import { HeadingItem } from './templatePresets';
import { currencyCode } from '../services/currency';

export interface PrintFrameHeader {
  authority_crest: boolean;
  country_text: string;
  ministry_text: string;
  office_name: string;
  department_text: string;
  location_text: string;
  document_title_en: string;
  form_number: string;
  meta_fields: Array<{
    id: string;
    label_en: string;
    defaultValue: string;
    visible: boolean;
  }>;
}

export interface PrintFrameColumn {
  id: string;
  key: string;
  label_en: string;
  width: string;
  align: 'left' | 'center' | 'right';
  visible: boolean;
}

export interface PrintFrameSummary {
  direct_cost_label_en: string;
  contingency_enabled: boolean;
  contingency_label: string;
  contingency_percent: number;
  tax_enabled: boolean;
  tax_label: string;
  tax_percent: number;
  grand_total_label_en: string;
  in_words_prefix_en: string;
  notes: string[];
}

export interface PrintFrameSignatory {
  id: string;
  role_en: string;
  designation_en: string;
  office_text?: string;
  show_date: boolean;
}

export interface PrintFramePageStyle {
  paper_size: 'A4' | 'A3' | 'Legal';
  orientation: 'portrait' | 'landscape';
  margins: 'compact' | 'normal' | 'wide';
  border_style: 'double' | 'single' | 'classic' | 'none';
  font_scale: 'compact' | 'normal' | 'large';
  table_grid_style: 'full' | 'horizontal_only' | 'striped';
}

export interface PrintFrameTemplate {
  id: string;
  module: 'boq' | 'estimate' | 'mb' | 'resource' | 'valuation-mb' | 'valuation' | 'completion-certificate';
  name: string;
  description: string;
  authority: string;
  header: PrintFrameHeader;
  headings: HeadingItem[];
  columns: PrintFrameColumn[];
  summary: PrintFrameSummary;
  signatories: PrintFrameSignatory[];
  pageStyle: PrintFramePageStyle;
  is_custom?: boolean;
  updated_at?: string;
}

// ----------------------------------------------------------------------------------
// STANDARD GOVERNMENT FRAME TEMPLATES FOR EACH MODULE
// ----------------------------------------------------------------------------------

export const DEFAULT_FRAME_TEMPLATES: PrintFrameTemplate[] = [
  // 1. BOQ (BILL OF QUANTITIES) FRAME TEMPLATE
  {
    id: 'frame_boq_standard',
    module: 'boq',
    name: 'Standard BOQ Structure & Print Frame',
    description: 'Standard 8-column layout with official ministry header, customizable chapter headings, and 3-tier signature block.',
    authority: 'procurement authority / Building Norms',
    header: {
      authority_crest: true,
      country_text: 'Government',
      ministry_text: 'Ministry of Urban Development / Ministry of Infrastructure Development',
      office_name: 'Local Authority Office / Infrastructure Development Office',
      department_text: 'Planning, Technical and Infrastructure Development Section',
      location_text: 'Capital City, Sample Country',
      document_title_en: 'BILL OF QUANTITIES (BOQ) & ABSTRACT OF COST',
      form_number: 'Form no. 52 (As per public procurement rules)',
      meta_fields: [
        { id: 'f_proj',label_en: 'Project Name:', defaultValue: 'Administrative building construction and upgrading', visible: true },
        { id: 'f_loc',label_en: 'Location / Ward:', defaultValue: 'Ward no. 4, Authority premises', visible: true },
        { id: 'f_fy',label_en: 'Fiscal Year:', defaultValue: '2026/27', visible: true },
        { id: 'f_cont',label_en: 'Contract / Work ID:', defaultValue: 'NCB/WORKS-081/82-01', visible: true },
        { id: 'f_budget',label_en: 'Budget Head No.:', defaultValue: '33701123', visible: true },
        { id: 'f_party',label_en: 'Contractor / Committee:', defaultValue: 'As per tender process', visible: true },
      ]
    },
    headings: [
      { id: 'h1', code: '1.0', title: 'Preliminary & General Works',isMandatory: true, description: 'Site survey, insurance, signboard, quality assurance testing' },
      { id: 'h2', code: '2.0', title: 'Earthwork & Foundation Excavation',description: 'Excavation in ordinary/hard soil, lead disposal up to 10m' },
      { id: 'h3', code: '3.0', title: 'Soling & Plain Concrete (PCC)',description: 'Flat brick/dry stone soling and PCC 1:3:6 / 1:2:4' },
      { id: 'h4', code: '4.0', title: 'Reinforced Concrete (RCC Frame)',description: 'M20 / M25 design mix concrete in columns, beams, and slabs' },
      { id: 'h5', code: '5.0', title: 'TMT Reinforcement Steel',description: 'Fe500D thermo-mechanically treated bar fabrication' },
      { id: 'h6', code: '6.0', title: 'Formwork & Staging',description: 'Steel / waterproof plywood shuttering for RCC elements' },
      { id: 'h7', code: '7.0', title: 'Brick / Block Masonry',description: 'Chimney made first class bricks in 1:4 / 1:6 cement mortar' },
      { id: 'h8', code: '8.0', title: 'Plastering & Pointing',description: '12.5mm / 20mm cement plaster on ceiling and external walls' },
      { id: 'h9', code: '9.0', title: 'Flooring, Tiling & Skirting',description: 'Punam marble, vitrified tiles, and cement punning' },
      { id: 'h10', code: '10.0', title: 'Painting & External Coating',description: 'Primer, 2 coats synthetic enamel and weathercoat' },
      { id: 'h11', code: '11.0', title: 'Sanitary, Plumbing & Electrical',description: 'PPR/CPVC pipes, sanitary fixtures, and wiring' },
    ],
    columns: [
      { id: 'c_sn', key: 'sn',label_en: 'S.N.', width: '50px', align: 'center', visible: true },
      { id: 'c_code', key: 'item_code',label_en: 'Item Code', width: '80px', align: 'center', visible: true },
      { id: 'c_desc', key: 'description',label_en: 'Description of Works & Specifications', width: 'auto', align: 'left', visible: true },
      { id: 'c_unit', key: 'unit',label_en: 'Unit', width: '60px', align: 'center', visible: true },
      { id: 'c_qty', key: 'quantity',label_en: 'Quantity', width: '85px', align: 'right', visible: true },
      { id: 'c_rate', key: 'rate',label_en: `Rate (${currencyCode()})`, width: '90px', align: 'right', visible: true },
      { id: 'c_amt', key: 'amount',label_en: `Amount (${currencyCode()})`, width: '110px', align: 'right', visible: true },
      { id: 'c_rem', key: 'remarks',label_en: 'Remarks', width: '85px', align: 'center', visible: true },
    ],
    summary: {
      direct_cost_label_en: 'Total Direct Construction Works Cost:',
      contingency_enabled: true,
      contingency_label: 'Physical Contingency',
      contingency_percent: 3.0,
      tax_enabled: true,
      tax_label: 'Value Added Tax - Tax',
      tax_percent: 13.0,
      grand_total_label_en: 'GRAND TOTAL AMOUNT (Inclusive of Tax):',
      in_words_prefix_en: 'In Words:',
      notes: [
        'BLD Norms',
        'Measurement Book'
      ]
    },
    signatories: [
      { id: 's1',role_en: 'Prepared By',designation_en: 'Sub-Engineer', office_text: 'Planning Section', show_date: true },
      { id: 's2',role_en: 'Checked By',designation_en: 'Engineer / Section Chief', office_text: 'Infrastructure Development Section', show_date: true },
      { id: 's3',role_en: 'Approved By',designation_en: 'Chief Administrative Officer / PD', office_text: 'Head of office', show_date: true }
    ],
    pageStyle: {
      paper_size: 'A4',
      orientation: 'portrait',
      margins: 'normal',
      border_style: 'double',
      font_scale: 'normal',
      table_grid_style: 'full'
    }
  },

  // 2. DETAILED COST ESTIMATE FRAME TEMPLATE
  {
    id: 'frame_estimate_detailed',
    module: 'estimate',
    name: 'Detailed Cost Estimate Frame',
    description: 'Engineering detailed cost estimate frame with norm code cross-references, technical specifications, and authority verification headers.',
    authority: 'Standard Building / Local Standards',
    header: {
      authority_crest: true,
      country_text: 'Government',
      ministry_text: 'Ministry of Physical Infrastructure and Transport',
      office_name: 'Infrastructure Development Directorate',
      department_text: 'Engineering Design and Cost Estimate Section',
      location_text: 'Capital City, Sample Country',
      document_title_en: 'DETAILED ENGINEERING COST ESTIMATE',
      form_number: 'Form no. 205 (Public works cost estimate)',
      meta_fields: [
        { id: 'f_proj',label_en: 'Scheme Title:', defaultValue: 'Road upgrading and drain construction work', visible: true },
        { id: 'f_loc',label_en: 'Location:', defaultValue: 'Ward no. 2 R 3 connecting main access road', visible: true },
        { id: 'f_fy',label_en: 'Fiscal Year:', defaultValue: '2026/27', visible: true },
        { id: 'f_chain',label_en: 'Chainage / Length:', defaultValue: '0+000 to 1+250 km (1.25 km)', visible: true },
        { id: 'f_source',label_en: 'Funding Source:', defaultValue: 'Federal counterpart grant', visible: true }
      ]
    },
    headings: [
      { id: 'eh1', code: 'A', title: 'Site Establishment & Traffic Diversion',description: 'Site office, barricades, safety gears' },
      { id: 'eh2', code: 'B', title: 'Roadway Excavation & Formation',description: 'Excavation, grading, and compaction to 95% MDD' },
      { id: 'eh3', code: 'C', title: 'Sub-Base & Base Course Works',description: 'Graded crushed stone base as per Roads Dept. Standard 1200' },
      { id: 'eh4', code: 'D', title: 'Drainage & Side Drain Construction',description: 'Covered RCC drain and Hume pipe culverts' },
      { id: 'eh5', code: 'E', title: 'Pavement Bituminous Works (Asphalt/DBM)',description: 'Prime coat, tack coat, and asphalt concrete wearing' },
      { id: 'eh6', code: 'F', title: 'Road Furniture, Signage & Road Markings',description: 'Thermoplastic retro-reflective road marking paint' }
    ],
    columns: [
      { id: 'c_sn', key: 'sn',label_en: 'S.N.', width: '45px', align: 'center', visible: true },
      { id: 'c_norm', key: 'norm_code',label_en: 'Norm Ref', width: '75px', align: 'center', visible: true },
      { id: 'c_desc', key: 'description',label_en: 'Item Particulars & Technical Specs', width: 'auto', align: 'left', visible: true },
      { id: 'c_unit', key: 'unit',label_en: 'Unit', width: '55px', align: 'center', visible: true },
      { id: 'c_qty', key: 'quantity',label_en: 'Quantity', width: '80px', align: 'right', visible: true },
      { id: 'c_rate', key: 'rate',label_en: 'Analyzed Rate', width: '90px', align: 'right', visible: true },
      { id: 'c_amt', key: 'amount',label_en: `Amount (${currencyCode()})`, width: '110px', align: 'right', visible: true },
      { id: 'c_rem', key: 'remarks',label_en: 'Remarks', width: '80px', align: 'center', visible: true }
    ],
    summary: {
      direct_cost_label_en: 'Total Civil Works Estimate Cost:',
      contingency_enabled: true,
      contingency_label: 'Physical Contingency',
      contingency_percent: 3.0,
      tax_enabled: true,
      tax_label: 'Tax 13%',
      tax_percent: 13.0,
      grand_total_label_en: 'ESTIMATED TOTAL (Inclusive of Tax):',
      in_words_prefix_en: 'In Words:',
      notes: [
        'This cost estimate has been prepared on the basis of technical study and detailed survey.',
        'Variations in quantity due to site conditions will be certified in the measurement book.'
      ]
    },
    signatories: [
      { id: 's1',role_en: 'Prepared By',designation_en: 'Sub-Engineer', office_text: 'Design Section', show_date: true },
      { id: 's2',role_en: 'Checked By',designation_en: 'Assistant Engineer', office_text: 'Planning Section', show_date: true },
      { id: 's3',role_en: 'Recommended By',designation_en: 'Executive Engineer', office_text: 'Infrastructure Section', show_date: true },
      { id: 's4',role_en: 'Approved By',designation_en: 'Chief Administrative Officer', office_text: 'Head of office', show_date: true }
    ],
    pageStyle: {
      paper_size: 'A4',
      orientation: 'portrait',
      margins: 'normal',
      border_style: 'double',
      font_scale: 'normal',
      table_grid_style: 'full'
    }
  },

  // 3. MEASUREMENT BOOK (MB) FRAME TEMPLATE
  {
    id: 'frame_mb_standard',
    module: 'mb',
    name: 'Official Measurement Book (MB) Frame',
    description: 'Statutory 8-column measurement book format with L x B x H dimensional equations, deductions, and joint inspection signatures.',
    authority: 'Applicable Financial Administration Rules',
    header: {
      authority_crest: true,
      country_text: 'Government',
      ministry_text: 'Public works and infrastructure accounting system',
      office_name: 'Village / City Executive Office',
      department_text: 'Technical section (measurement records)',
      location_text: 'Country',
      document_title_en: 'OFFICIAL FIELD MEASUREMENT BOOK RECORD',
      form_number: 'Form no. 222 (Measurement Book)',
      meta_fields: [
        { id: 'f_mb_no',label_en: 'MB Book No.:', defaultValue: 'MB-081/82-03 (Page 1 to)', visible: true },
        { id: 'f_proj',label_en: 'Work Name:', defaultValue: 'Community building construction work', visible: true },
        { id: 'f_cont',label_en: 'Contract / Order No.:', defaultValue: 'MUN/BLDG-081/82-05', visible: true },
        { id: 'f_party',label_en: 'Contractor Name:', defaultValue: 'Summit Construction Pvt. Ltd.', visible: true },
        { id: 'f_date',label_en: 'Measurement Dates:', defaultValue: '2026-05-10 to 2026-05-15 ', visible: true }
      ]
    },
    headings: [
      { id: 'mbh1', code: 'Sec 1', title: 'Excavation for Foundation Footings',description: 'Dimensions per grid line' },
      { id: 'mbh2', code: 'Sec 2', title: 'Stone / Brick Soling under Footings',description: 'Thickness and area calculation' },
      { id: 'mbh3', code: 'Sec 3', title: 'PCC 1:2:4 in Foundation Footings & Tie Beams',description: 'Net concrete quantity' },
      { id: 'mbh4', code: 'Sec 4', title: 'RCC 1:1.5:3 in Columns & Slab Panels',description: 'Length, Breadth, Depth' },
      { id: 'mbh5', code: 'Sec 5', title: 'Brick Masonry in Substructure & Superstructure',description: 'Gross volume minus openings' }
    ],
    columns: [
      { id: 'c_sn', key: 'sn',label_en: 'S.N.', width: '40px', align: 'center', visible: true },
      { id: 'c_desc', key: 'particulars',label_en: 'Description & Locations', width: 'auto', align: 'left', visible: true },
      { id: 'c_no', key: 'no_of_units',label_en: 'No.', width: '55px', align: 'center', visible: true },
      { id: 'c_l', key: 'length',label_en: 'L (m)', width: '65px', align: 'right', visible: true },
      { id: 'c_b', key: 'breadth',label_en: 'B (m)', width: '65px', align: 'right', visible: true },
      { id: 'c_h', key: 'height',label_en: 'H (m)', width: '65px', align: 'right', visible: true },
      { id: 'c_qty', key: 'quantity',label_en: 'Quantity', width: '85px', align: 'right', visible: true },
      { id: 'c_unit', key: 'unit',label_en: 'Unit', width: '50px', align: 'center', visible: true },
      { id: 'c_rem', key: 'remarks',label_en: 'Remarks', width: '75px', align: 'center', visible: true }
    ],
    summary: {
      direct_cost_label_en: 'Total Certified Measurement Quantity:',
      contingency_enabled: false,
      contingency_label: '',
      contingency_percent: 0,
      tax_enabled: false,
      tax_label: '',
      tax_percent: 0,
      grand_total_label_en: 'Page Total Quantity:',
      in_words_prefix_en: 'Field Note:',
      notes: [
        'The stated measurements have been verified on site and certified as correct.',
        'Deduction'
      ]
    },
    signatories: [
      { id: 's1',role_en: 'Measured By',designation_en: 'Sub-Engineer', office_text: 'Field Engineering Section', show_date: true },
      { id: 's2',role_en: 'Contractor / Committee',designation_en: 'Authorized Signatory', office_text: 'Contractor side', show_date: true },
      { id: 's3',role_en: 'Checked & Verified By',designation_en: 'Civil Engineer', office_text: 'Infrastructure Development Section', show_date: true }
    ],
    pageStyle: {
      paper_size: 'A4',
      orientation: 'landscape',
      margins: 'compact',
      border_style: 'single',
      font_scale: 'normal',
      table_grid_style: 'full'
    }
  },

  // 4. RESOURCE CONSUMPTION BREAKDOWN FRAME TEMPLATE
  {
    id: 'frame_resource_breakdown',
    module: 'resource',
    name: 'Resource Consumption Breakdown Frame',
    description: 'Labor, equipment, and material requirement schedule frame for procurement, supply chain, and user committee distribution.',
    authority: 'BLD Norms / Procurement Planning',
    header: {
      authority_crest: true,
      country_text: 'Government',
      ministry_text: 'Urban development and infrastructure project',
      office_name: 'Local Authority Office',
      department_text: 'Material management and procurement unit',
      location_text: 'Country',
      document_title_en: 'RESOURCE & MATERIAL CONSUMPTION BREAKDOWN',
      form_number: 'Material requisition and distribution schedule',
      meta_fields: [
        { id: 'f_proj',label_en: 'Project Title:', defaultValue: 'Ward office building construction', visible: true },
        { id: 'f_fy',label_en: 'Fiscal Year:', defaultValue: '2026/27', visible: true },
        { id: 'f_loc',label_en: 'Site Location:', defaultValue: 'Ward no. 7', visible: true }
      ]
    },
    headings: [
      { id: 'rh1', code: 'Part 1', title: 'Labor Requirements',description: 'Skilled mason, carpenter, bar bender, unskilled labor' },
      { id: 'rh2', code: 'Part 2', title: 'Basic Construction Materials',description: 'Cement, sand, aggregate, bricks, TMT steel' },
      { id: 'rh3', code: 'Part 3', title: 'Machinery & Equipment Fuel',description: 'Concrete mixer, vibrator, excavator, truck transport' }
    ],
    columns: [
      { id: 'c_sn', key: 'sn',label_en: 'S.N.', width: '50px', align: 'center', visible: true },
      { id: 'c_name', key: 'resource_name',label_en: 'Resource / Material Description', width: 'auto', align: 'left', visible: true },
      { id: 'c_cat', key: 'category',label_en: 'Category', width: '100px', align: 'center', visible: true },
      { id: 'c_unit', key: 'unit',label_en: 'Unit', width: '60px', align: 'center', visible: true },
      { id: 'c_qty', key: 'total_qty',label_en: 'Required Quantity', width: '110px', align: 'right', visible: true },
      { id: 'c_rate', key: 'zone_rate',label_en: `Zone Rate (${currencyCode()})`, width: '100px', align: 'right', visible: true },
      { id: 'c_amt', key: 'total_cost',label_en: `Total Cost (${currencyCode()})`, width: '120px', align: 'right', visible: true }
    ],
    summary: {
      direct_cost_label_en: 'Total Resource Estimated Cost:',
      contingency_enabled: false,
      contingency_label: '',
      contingency_percent: 0,
      tax_enabled: true,
      tax_label: 'Tax 13%',
      tax_percent: 13.0,
      grand_total_label_en: 'Grand Total Resource Budget:',
      in_words_prefix_en: 'In Words:',
      notes: [
        'The official rate schedule approved by the zone rate fixing committee has been included.'
      ]
    },
    signatories: [
      { id: 's1',role_en: 'Prepared By',designation_en: 'Technical Assistant', show_date: true },
      { id: 's2',role_en: 'Checked By',designation_en: 'Engineer', show_date: true },
      { id: 's3',role_en: 'Approved By',designation_en: 'Chief Officer', show_date: true }
    ],
    pageStyle: {
      paper_size: 'A4',
      orientation: 'portrait',
      margins: 'normal',
      border_style: 'double',
      font_scale: 'normal',
      table_grid_style: 'striped'
    }
  },

  // 5. POST-CONTRACT VALUATION MB & RUNNING BILL FRAME TEMPLATE
  {
    id: 'frame_valuation_mb',
    module: 'valuation-mb',
    name: 'Post-Contract Valuation MB Frame',
    description: 'Running bill valuation measurement book with previous, this bill, and cumulative progress quantities comparison.',
    authority: 'FIDIC / procurement rules Standard Conditions of Contract',
    header: {
      authority_crest: true,
      country_text: 'Government',
      ministry_text: 'Ministry of Infrastructure Development',
      office_name: 'Local Authority Office',
      department_text: 'Project Monitoring and Evaluation Section',
      location_text: 'Country',
      document_title_en: 'POST-CONTRACT VALUATION MEASUREMENT BOOK',
      form_number: 'Form no. 223 (Running measurement bill)',
      meta_fields: [
        { id: 'f_bill_no',label_en: 'Bill No.:', defaultValue: 'Running Bill No.', visible: true },
        { id: 'f_proj',label_en: 'Project Title:', defaultValue: 'Permanent bridge and access road construction', visible: true },
        { id: 'f_cont',label_en: 'Contract Agreement No.:', defaultValue: 'NCB/BRG-081/82-02', visible: true },
        { id: 'f_period',label_en: 'Valuation Period:', defaultValue: '2026-04-01 to 2026-06-30 ', visible: true }
      ]
    },
    headings: [
      { id: 'vh1', code: 'Item 1', title: 'Substructure & Foundation Pier Works',},
      { id: 'vh2', code: 'Item 2', title: 'Superstructure Pre-stressed Girder Concrete',},
      { id: 'vh3', code: 'Item 3', title: 'River Training & Gabion Protection Works',}
    ],
    columns: [
      { id: 'c_sn', key: 'sn',label_en: 'S.N.', width: '40px', align: 'center', visible: true },
      { id: 'c_desc', key: 'description',label_en: 'Item Description', width: 'auto', align: 'left', visible: true },
      { id: 'c_unit', key: 'unit',label_en: 'Unit', width: '50px', align: 'center', visible: true },
      { id: 'c_boq_qty', key: 'boq_qty',label_en: 'BOQ Qty', width: '75px', align: 'right', visible: true },
      { id: 'c_prev_qty', key: 'prev_qty',label_en: 'Previous Qty', width: '75px', align: 'right', visible: true },
      { id: 'c_this_qty', key: 'this_qty',label_en: 'This Bill Qty', width: '80px', align: 'right', visible: true },
      { id: 'c_tot_qty', key: 'total_qty',label_en: 'Cumulative Qty', width: '85px', align: 'right', visible: true },
      { id: 'c_rate', key: 'contract_rate',label_en: `Rate (${currencyCode()})`, width: '85px', align: 'right', visible: true },
      { id: 'c_this_amt', key: 'this_amount',label_en: 'This Bill Amount', width: '105px', align: 'right', visible: true }
    ],
    summary: {
      direct_cost_label_en: 'Gross Payable for This Bill:',
      contingency_enabled: false,
      contingency_label: '',
      contingency_percent: 0,
      tax_enabled: true,
      tax_label: 'Tax 13%',
      tax_percent: 13.0,
      grand_total_label_en: 'Total Bill Amount with Tax:',
      in_words_prefix_en: 'In Words:',
      notes: [
        'Retention Money'
      ]
    },
    signatories: [
      { id: 's1',role_en: 'Valued By',designation_en: 'Site Sub-Engineer', show_date: true },
      { id: 's2',role_en: 'Certified By',designation_en: 'Resident Engineer', show_date: true },
      { id: 's3',role_en: 'Approved By',designation_en: 'Project Director', show_date: true }
    ],
    pageStyle: {
      paper_size: 'A4',
      orientation: 'landscape',
      margins: 'compact',
      border_style: 'double',
      font_scale: 'normal',
      table_grid_style: 'full'
    }
  },

  // 6. VALUATION IPC BILL & RETENTION BILL FRAME TEMPLATE
  {
    id: 'frame_valuation_ipc',
    module: 'valuation',
    name: 'Interim Payment Certificate (IPC) Frame',
    description: 'Financial deduction and payment certificate frame with mobilization recovery, 5% retention, 1.5% withholding tax, and net payable calculation.',
    authority: 'Applicable Treasury Rules / Procurement Standard',
    header: {
      authority_crest: true,
      country_text: 'Government',
      ministry_text: 'Public Expenditure and Treasury Control Office',
      office_name: 'Local Authority Office',
      department_text: 'Finance and Accounts Section',
      location_text: 'Country',
      document_title_en: 'CONTRACTOR RUNNING BILL & FINANCIAL ABSTRACT',
      form_number: 'Form no. 213 (Payment order and bill)',
      meta_fields: [
        { id: 'f_ipc_no',label_en: 'IPC Bill No.:', defaultValue: 'IPC-02', visible: true },
        { id: 'f_proj',label_en: 'Contract Name:', defaultValue: 'Hospital building block construction', visible: true },
        { id: 'f_cont',label_en: 'Contractor:', defaultValue: 'Pioneer Construction Ltd.', visible: true },
        { id: 'f_pan',label_en: 'PAN No.:', defaultValue: '301245678', visible: true }
      ]
    },
    headings: [
      { id: 'ih1', code: 'Bill A', title: 'Civil Construction Works Executed',},
      { id: 'ih2', code: 'Bill B', title: 'Price Adjustment / Variation',}
    ],
    columns: [
      { id: 'c_sn', key: 'sn',label_en: 'S.N.', width: '50px', align: 'center', visible: true },
      { id: 'c_item', key: 'item',label_en: 'Payment & Deduction Heads', width: 'auto', align: 'left', visible: true },
      { id: 'c_code', key: 'code',label_en: 'Account Code', width: '90px', align: 'center', visible: true },
      { id: 'c_prev', key: 'prev_amt',label_en: 'Up to Prev. Bill', width: '110px', align: 'right', visible: true },
      { id: 'c_this', key: 'this_amt',label_en: 'This Bill Amount', width: '120px', align: 'right', visible: true },
      { id: 'c_cum', key: 'cum_amt',label_en: 'Cumulative to Date', width: '125px', align: 'right', visible: true }
    ],
    summary: {
      direct_cost_label_en: 'Gross Certified Value of Work Done:',
      contingency_enabled: false,
      contingency_label: '',
      contingency_percent: 0,
      tax_enabled: true,
      tax_label: 'Tax Addition',
      tax_percent: 13.0,
      grand_total_label_en: 'NET PAYABLE AMOUNT (After All Deductions):',
      in_words_prefix_en: 'Net Payable in Words:',
      notes: [
        'Retention',
        'withholding tax'
      ]
    },
    signatories: [
      { id: 's1',role_en: 'Submitted By Engineer',designation_en: 'Project Engineer', show_date: true },
      { id: 's2',role_en: 'Audited & Checked By',designation_en: 'Finance Officer', show_date: true },
      { id: 's3',role_en: 'Payment Authorized By',designation_en: 'Chief Executive Officer', show_date: true }
    ],
    pageStyle: {
      paper_size: 'A4',
      orientation: 'portrait',
      margins: 'normal',
      border_style: 'double',
      font_scale: 'normal',
      table_grid_style: 'full'
    }
  },

  // 7. COMPLETION CERTIFICATE FRAME TEMPLATE
  {
    id: 'frame_completion_certificate',
    module: 'completion-certificate',
    name: 'Completion Certificate (Completion Certificate) Frame',
    description: 'Final work completion certificate frame with physical verification checklist, public audit report, and final handover endorsement.',
    authority: 'Procurement Regulations & Local Government Operation Act 2074',
    header: {
      authority_crest: true,
      country_text: 'Government',
      ministry_text: 'Ministry of Federal Affairs and General Administration',
      office_name: 'Local Authority Office',
      department_text: 'Project monitoring and supervision committee',
      location_text: 'Country',
      document_title_en: 'PROJECT WORK COMPLETION CERTIFICATE & FINAL SETTLEMENT',
      form_number: 'Schedule form no. 18 (Completion Report)',
      meta_fields: [
        { id: 'f_proj',label_en: 'Project Title:', defaultValue: 'Basic health post building construction', visible: true },
        { id: 'f_loc',label_en: 'Location / Ward:', defaultValue: 'Ward no. 5', visible: true },
        { id: 'f_est',label_en: 'Approved Estimate:', defaultValue: `${currencyCode()} 4,500,000/-`, visible: true },
        { id: 'f_cont_amt',label_en: 'Contract / Agreement Amt:', defaultValue: `${currencyCode()} 3,850,000/-`, visible: true },
        { id: 'f_date_st',label_en: 'Commencement Date:', defaultValue: '2026-01-15', visible: true },
        { id: 'f_date_end',label_en: 'Completion Date:', defaultValue: '2026-05-30', visible: true }
      ]
    },
    headings: [
      { id: 'ksh1', code: 'Section 1', title: 'Brief project description',description: 'Objective and beneficiaries' },
      { id: 'ksh2', code: 'Section 2', title: 'Comparative statement of physical and financial progress',description: 'Physical vs financial comparison' },
      { id: 'ksh3', code: 'Section 3', title: 'Quality testing and technical standards',description: 'Concrete cube test, steel test' },
      { id: 'ksh4', code: 'Section 4', title: 'Public Audit',description: 'Transparency & public clearance' }
    ],
    columns: [
      { id: 'c_sn', key: 'sn',label_en: 'S.N.', width: '50px', align: 'center', visible: true },
      { id: 'c_head', key: 'head',label_en: 'Inspection & Checklist Criteria', width: 'auto', align: 'left', visible: true },
      { id: 'c_status', key: 'status',label_en: 'Status', width: '120px', align: 'center', visible: true },
      { id: 'c_obs', key: 'observation',label_en: 'Technical Observation', width: '180px', align: 'left', visible: true }
    ],
    summary: {
      direct_cost_label_en: 'Final Evaluated Total Cost:',
      contingency_enabled: false,
      contingency_label: '',
      contingency_percent: 0,
      tax_enabled: false,
      tax_label: '',
      tax_percent: 0,
      grand_total_label_en: 'Final Amount Recommended for Release:',
      in_words_prefix_en: 'In Words:',
      notes: [
        'It is certified that this project has been satisfactorily completed in accordance with the approved drawings, design and specifications.',
        'Public Audit'
      ]
    },
    signatories: [
      { id: 's1',role_en: 'Field Technical Officer',designation_en: 'Sub-Engineer', show_date: true },
      { id: 's2',role_en: 'User Committee Chairperson',designation_en: 'Chairperson', show_date: true },
      { id: 's3',role_en: 'Monitoring Committee Head',designation_en: 'Deputy Mayor / Ward Chair', show_date: true },
      { id: 's4',role_en: 'Final Handover Approver',designation_en: 'Chief Administrative Officer', show_date: true }
    ],
    pageStyle: {
      paper_size: 'A4',
      orientation: 'portrait',
      margins: 'normal',
      border_style: 'double',
      font_scale: 'normal',
      table_grid_style: 'full'
    }
  }
];

// ----------------------------------------------------------------------------------
// LOCAL STORAGE PERSISTENCE HELPERS
// ----------------------------------------------------------------------------------

const FRAME_TEMPLATES_STORAGE_KEY = 'CIVIL_ESTIMATE_FRAME_TEMPLATES_V1';

export function loadAllFrameTemplates(): PrintFrameTemplate[] {
  try {
    const raw = localStorage.getItem(FRAME_TEMPLATES_STORAGE_KEY);
    if (!raw) return DEFAULT_FRAME_TEMPLATES;
    const parsed: PrintFrameTemplate[] = JSON.parse(raw);
    
    // Merge saved custom versions with defaults so all modules remain present
    const merged = DEFAULT_FRAME_TEMPLATES.map((def) => {
      const found = parsed.find((p) => p.id === def.id || p.module === def.module);
      return found || def;
    });

    // Also include any user-created new frame templates
    const customOnly = parsed.filter(
      (p) => !DEFAULT_FRAME_TEMPLATES.some((def) => def.id === p.id)
    );

    return [...merged, ...customOnly];
  } catch (e) {
    console.error('Failed to load frame templates from localStorage:', e);
    return DEFAULT_FRAME_TEMPLATES;
  }
}

export function saveFrameTemplate(template: PrintFrameTemplate): PrintFrameTemplate[] {
  try {
    const all = loadAllFrameTemplates();
    const updated = {
      ...template,
      is_custom: true,
      updated_at: new Date().toISOString()
    };

    const index = all.findIndex((t) => t.id === template.id);
    if (index >= 0) {
      all[index] = updated;
    } else {
      all.push(updated);
    }

    localStorage.setItem(FRAME_TEMPLATES_STORAGE_KEY, JSON.stringify(all));
    return all;
  } catch (e) {
    console.error('Failed to save frame template to localStorage:', e);
    return DEFAULT_FRAME_TEMPLATES;
  }
}

export function resetFrameTemplateToDefault(templateId: string): PrintFrameTemplate {
  const def = DEFAULT_FRAME_TEMPLATES.find((t) => t.id === templateId);
  if (!def) return DEFAULT_FRAME_TEMPLATES[0];

  try {
    const all = loadAllFrameTemplates();
    const filtered = all.filter((t) => t.id !== templateId);
    filtered.push(def);
    localStorage.setItem(FRAME_TEMPLATES_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to reset template in localStorage:', e);
  }

  return JSON.parse(JSON.stringify(def));
}
