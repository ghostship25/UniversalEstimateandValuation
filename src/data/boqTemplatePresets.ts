// Comprehensive Print-Ready BOQ Headings & Line Items Presets
// Conforms to Government (BLD, Roads Dept., WSS, procurement authority) Standards

export interface EditableBOQTemplateItem {
  id: string;
  item_code: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  remarks?: string;
}

export interface EditableBOQChapter {
  id: string;
  code: string; // e.g. "1.0" or "PART A"
  title: string;
  items: EditableBOQTemplateItem[];
}

export interface BOQPrintTemplatePreset {
  id: string;
  name: string;
  authority: string;
  category: string;
  description: string;
  defaultProjectName: string;
  defaultLocation: string;
  contingencyPercent: number;
  taxPercent: number;
  chapters: EditableBOQChapter[];
}

export const BOQ_PRINT_PRESETS: BOQPrintTemplatePreset[] = [
  // 1. BLD Standard Multi-Storey Building BOQ
  {
    id: 'building_standard',
    name: 'BLD Standard Building Works BOQ',
    authority: 'Building Norms',
    category: 'Civil Building',
    description: 'Print-ready Bill of Quantities for multi-storey RCC frame buildings covering site preparation, substructure, RCC frame, brick masonry, finishing, and MEP works.',
    defaultProjectName: 'Construction of Multi-Purpose Authority Community Center Building',
    defaultLocation: 'Ward No. 04, Central Town',
    contingencyPercent: 3,
    taxPercent: 13,
    chapters: [
      {
        id: 'ch_1',
        code: '1.0',
        title: 'Preliminary & General Works',
        items: [
          {
            id: 'item_1_1',
            item_code: 'GEN-01',
            description: 'Erecting standard citizen notice and public audit display board (1.8m x 1.2m) with paint and text as per government guidelines.',
            unit: 'LS',
            quantity: 1,
            rate: 15000,
            amount: 15000,
            remarks: 'As per authority audit guidelines'
          },
          {
            id: 'item_1_2',
            item_code: 'GEN-02',
            description: 'Construction of temporary site store, office, and labor shed with GI sheet roofing including dismantling on completion.',
            unit: 'LS',
            quantity: 1,
            rate: 45000,
            amount: 45000,
            remarks: 'Complete item'
          },
          {
            id: 'item_1_3',
            item_code: 'GEN-03',
            description: 'Site layout, pegging, benchmark establishment and leveling using total station/theodolite.',
            unit: 'LS',
            quantity: 1,
            rate: 20000,
            amount: 20000,
            remarks: 'Certified by engineer'
          }
        ]
      },
      {
        id: 'ch_2',
        code: '2.0',
        title: 'Earthwork & Site Preparation',
        items: [
          {
            id: 'item_2_1',
            item_code: 'EW-01',
            description: 'Earthwork excavation in foundation trenches and footings in all kinds of soil up to 2.5m depth including dressing, trimming, and lead up to 30m.',
            unit: 'm³',
            quantity: 185.50,
            rate: 425.00,
            amount: 78837.50,
            remarks: 'Norms Ref 2.1'
          },
          {
            id: 'item_2_2',
            item_code: 'EW-02',
            description: 'Backfilling around footings, plinth beam and basement using excavated selected soil in 150mm layers with optimal moisture, watering and ramming.',
            unit: 'm³',
            quantity: 95.00,
            rate: 240.00,
            amount: 22800.00,
            remarks: 'Norms Ref 2.4'
          }
        ]
      },
      {
        id: 'ch_3',
        code: '3.0',
        title: 'Soling & Substructure Concrete',
        items: [
          {
            id: 'item_3_1',
            item_code: 'SOL-01',
            description: 'Dry flat brick soling under footings and floor using first-class chimney-baked bricks laid in herring-bone or flat pattern with sand joint packing.',
            unit: 'm²',
            quantity: 124.00,
            rate: 685.00,
            amount: 84940.00,
            remarks: 'First class brick'
          },
          {
            id: 'item_3_2',
            item_code: 'PCC-01',
            description: 'Plain cement concrete (PCC 1:3:6) using 40mm down graded stone aggregate in foundation footings and under plinth beams.',
            unit: 'm³',
            quantity: 14.80,
            rate: 9850.00,
            amount: 145780.00,
            remarks: 'OPC 43 Grade'
          }
        ]
      },
      {
        id: 'ch_4',
        code: '4.0',
        title: 'Reinforced Cement Concrete (RCC)',
        items: [
          {
            id: 'item_4_1',
            item_code: 'RCC-01',
            description: 'Reinforced Cement Concrete M20 grade (1:1.5:3 mix) in isolated footings and foundation columns including mechanical mixing, placing, vibrating and curing for 28 days (excluding rebar & shuttering).',
            unit: 'm³',
            quantity: 26.50,
            rate: 13200.00,
            amount: 349800.00,
            remarks: 'Footings'
          },
          {
            id: 'item_4_2',
            item_code: 'RCC-02',
            description: 'Reinforced Cement Concrete M20 grade in superstructure columns, plinth tie beams, floor beams, and lintels including vibration and curing.',
            unit: 'm³',
            quantity: 38.20,
            rate: 14450.00,
            amount: 551990.00,
            remarks: 'Columns & Beams'
          },
          {
            id: 'item_4_3',
            item_code: 'RCC-03',
            description: 'Reinforced Cement Concrete M20 grade in suspended roof slabs, floor slabs, and cantilever chhajjas including leveling and water curing.',
            unit: 'm³',
            quantity: 32.00,
            rate: 14200.00,
            amount: 454400.00,
            remarks: '125mm Slab'
          }
        ]
      },
      {
        id: 'ch_5',
        code: '5.0',
        title: 'Reinforcement Steel & Formwork',
        items: [
          {
            id: 'item_5_1',
            item_code: 'STL-01',
            description: 'Providing, straightening, cutting, bending, hooking, placing in position and binding Fe-500 grade TMT reinforcement bars with 18-gauge GI binding wire including concrete cover blocks.',
            unit: 'kg',
            quantity: 8450.00,
            rate: 118.50,
            amount: 1001325.00,
            remarks: 'Fe-500 TMT'
          },
          {
            id: 'item_5_2',
            item_code: 'SHT-01',
            description: 'Centering and shuttering for footings, columns, beams, and slabs using waterproof film-faced plywood / steel sheets with steel props, bracing, and staging.',
            unit: 'm²',
            quantity: 485.00,
            rate: 490.00,
            amount: 237650.00,
            remarks: 'Plywood formwork'
          }
        ]
      },
      {
        id: 'ch_6',
        code: '6.0',
        title: 'Brickwork & Plastering',
        items: [
          {
            id: 'item_6_1',
            item_code: 'BRK-01',
            description: 'Brick masonry work in 1:4 cement sand mortar in 230mm thick outer main walls using first-class chimney baked bricks including soaking in water and scaffolding.',
            unit: 'm³',
            quantity: 42.00,
            rate: 11200.00,
            amount: 470400.00,
            remarks: 'Outer walls'
          },
          {
            id: 'item_6_2',
            item_code: 'BRK-02',
            description: 'Brick masonry work in 1:4 cement sand mortar in 115mm thick partition walls with GI wire reinforcement every 4 courses.',
            unit: 'm²',
            quantity: 165.00,
            rate: 1250.00,
            amount: 206250.00,
            remarks: 'Partition'
          },
          {
            id: 'item_6_3',
            item_code: 'PLS-01',
            description: '12.5mm thick cement sand plaster (1:4) on internal and external brick walls including groove making, scaffolding and 14 days water curing.',
            unit: 'm²',
            quantity: 580.00,
            rate: 265.00,
            amount: 153700.00,
            remarks: 'Wall plaster'
          }
        ]
      },
      {
        id: 'ch_7',
        code: '7.0',
        title: 'Finishing, Painting & Openings',
        items: [
          {
            id: 'item_7_1',
            item_code: 'FLR-01',
            description: 'Providing and laying 300x300mm non-skid ceramic floor tiles on 20mm cement mortar base (1:3) including joint grouting with white cement/pigment.',
            unit: 'm²',
            quantity: 115.00,
            rate: 1450.00,
            amount: 166750.00,
            remarks: 'Ceramic tiles'
          },
          {
            id: 'item_7_2',
            item_code: 'PNT-01',
            description: 'Applying two coats of exterior weather-coat acrylic emulsion paint over a coat of approved primer on external plastered surfaces.',
            unit: 'm²',
            quantity: 340.00,
            rate: 185.00,
            amount: 62900.00,
            remarks: 'Weathercoat'
          },
          {
            id: 'item_7_3',
            item_code: 'UPVC-01',
            description: 'Supplying and fixing three-track UPVC sliding windows with 5mm thick Saint-Gobain float glass, mosquito net, and locking hardware.',
            unit: 'm²',
            quantity: 28.00,
            rate: 5200.00,
            amount: 145600.00,
            remarks: '3-track UPVC'
          }
        ]
      }
    ]
  },

  // 2. Roads Department Road & Drainage BOQ
  {
    id: 'dor_road_standard',
    name: 'Roads Dept. Road & Drainage Construction BOQ',
    authority: 'Roads Dept. Standard Specifications 2080',
    category: 'Road & Highway',
    description: 'Complete bill of quantities for blacktopped road construction including subgrade preparation, granular sub-base, crushed stone base, asphalt/premix carpeting, side drains, and gabion wall.',
    defaultProjectName: 'Upgrading and Asphalting of Authority Connector Road',
    defaultLocation: 'Chainage 0+000 to 1+250, Ward No. 07',
    contingencyPercent: 3,
    taxPercent: 13,
    chapters: [
      {
        id: 'dor_ch_1',
        code: '100',
        title: 'General & Site Facilitation Items',
        items: [
          {
            id: 'dor_1_1',
            item_code: '101',
            description: 'Insurance for works, plant, equipment, and third-party liabilities as specified in contract clauses.',
            unit: 'LS',
            quantity: 1,
            rate: 65000,
            amount: 65000,
            remarks: 'Mandatory insurance'
          },
          {
            id: 'dor_1_2',
            item_code: '102',
            description: 'Traffic management, safety barricades, retro-reflective detour signs, and flagman during construction.',
            unit: 'LS',
            quantity: 1,
            rate: 25000,
            amount: 25000,
            remarks: 'Site safety'
          }
        ]
      },
      {
        id: 'dor_ch_2',
        code: '200',
        title: 'Site Clearance & Earthwork',
        items: [
          {
            id: 'dor_2_1',
            item_code: '201',
            description: 'Clearing and grubbing the road corridor within the right-of-way including removal of roots and disposal of debris.',
            unit: 'm²',
            quantity: 4500.00,
            rate: 18.00,
            amount: 81000.00,
            remarks: 'Clearing corridor'
          },
          {
            id: 'dor_2_2',
            item_code: '301',
            description: 'Roadway excavation in all types of soil and decomposed rock using hydraulic excavator and disposing of unsuitable material beyond 50m.',
            unit: 'm³',
            quantity: 1250.00,
            rate: 185.00,
            amount: 231250.00,
            remarks: 'Excavator cutting'
          },
          {
            id: 'dor_2_3',
            item_code: '401',
            description: 'Compacting original ground / subgrade to not less than 95% MDD using 10-12 ton smooth wheel vibratory roller.',
            unit: 'm²',
            quantity: 3750.00,
            rate: 35.00,
            amount: 131250.00,
            remarks: 'Subgrade prep'
          }
        ]
      },
      {
        id: 'dor_ch_3',
        code: '500',
        title: 'Pavement Sub-Base & Base Course',
        items: [
          {
            id: 'dor_3_1',
            item_code: '501',
            description: 'Providing, spreading, grading, and compacting Granular Sub-Base (GSB) material 150mm thick conforming to Roads Dept. Table 12.1.',
            unit: 'm³',
            quantity: 480.00,
            rate: 2150.00,
            amount: 1032000.00,
            remarks: '150mm GSB'
          },
          {
            id: 'dor_3_2',
            item_code: '601',
            description: 'Providing, laying, spreading and rolling Wet Mix Macadam (WMM) base course 100mm compacted thickness using mechanical paver and roller.',
            unit: 'm³',
            quantity: 320.00,
            rate: 3450.00,
            amount: 1104000.00,
            remarks: '100mm WMM'
          }
        ]
      },
      {
        id: 'dor_ch_4',
        code: '800',
        title: 'Bituminous Works (Blacktopping)',
        items: [
          {
            id: 'dor_4_1',
            item_code: '701',
            description: 'Applying slow-curing bitumen emulsion (SS-1) prime coat over prepared WMM surface at the rate of 0.85 kg/m² using pressure distributor.',
            unit: 'm²',
            quantity: 3200.00,
            rate: 95.00,
            amount: 304000.00,
            remarks: 'Bitumen SS-1'
          },
          {
            id: 'dor_4_2',
            item_code: '801',
            description: 'Providing and laying 40mm compacted Asphalt Concrete wearing course using VG-30 bitumen, graded aggregates, and sensor paver including tandem roller compaction.',
            unit: 'm²',
            quantity: 3200.00,
            rate: 680.00,
            amount: 2176000.00,
            remarks: '40mm AC'
          }
        ]
      },
      {
        id: 'dor_ch_5',
        code: '900',
        title: 'Roadside Drains & Protection Works',
        items: [
          {
            id: 'dor_5_1',
            item_code: '901',
            description: 'Construction of trapezoidal side drain in 1:4 stone masonry with 100mm RCC M15 cover slabs including excavation and bed concrete.',
            unit: 'm',
            quantity: 450.00,
            rate: 2650.00,
            amount: 1192500.00,
            remarks: 'Side drain'
          },
          {
            id: 'dor_5_2',
            item_code: '1001',
            description: 'Supplying and weaving heavy-duty machine-made zinc-coated gabion wire crates (2m x 1m x 1m, 10 SWG) and hand packing with hard quarry stones.',
            unit: 'm³',
            quantity: 140.00,
            rate: 3150.00,
            amount: 441000.00,
            remarks: '10 SWG Gabion'
          }
        ]
      }
    ]
  },

  // 3. Authority User Committee Simple Works BOQ
  {
    id: 'user_committee_infrastructure',
    name: 'Authority User Committee BOQ',
    authority: 'Local Government Operation Act 2074',
    category: 'Community Infrastructure',
    description: 'Simplified, print-ready community infrastructure BOQ designed for authority ward projects executed by consumer committees, highlighting public audits, voluntary labor, and authority subsidies.',
    defaultProjectName: 'Ward Community Road Paving & Drainage Construction',
    defaultLocation: 'Ward No. 03, Community Tol',
    contingencyPercent: 1.5,
    taxPercent: 0, // Consumer committees often work under direct subsidy / Tax-exempt norms
    chapters: [
      {
        id: 'uc_ch_1',
        code: '1',
        title: 'Preliminary and administrative expenses',
        items: [
          {
            id: 'uc_1_1',
            item_code: 'P-01',
            description: 'Mandatory at project site 2.0x1.2 m public information board (including cost, committee and beneficiary details): fabrication and installation.',
            unit: 'Pcs',
            quantity: 1,
            rate: 12000,
            amount: 12000,
            remarks: 'Mandatory'
          },
          {
            id: 'uc_1_2',
            item_code: 'P-02',
            description: 'Public Hearing / Public Audit',
            unit: 'Times',
            quantity: 2,
            rate: 7500,
            amount: 15000,
            remarks: '2 Times'
          }
        ]
      },
      {
        id: 'uc_ch_2',
        code: '2',
        title: 'Earthwork and foundation preparation work',
        items: [
          {
            id: 'uc_2_1',
            item_code: 'M-01',
            description: 'Road surface leveling, filling of potholes, and earth cutting/filling with compaction.',
            unit: 'm²',
            quantity: 850.00,
            rate: 45.00,
            amount: 38250.00,
            remarks: 'User'
          }
        ]
      },
      {
        id: 'uc_ch_3',
        code: '3',
        title: 'PCC',
        items: [
          {
            id: 'uc_3_1',
            item_code: 'C-01',
            description: 'Stone Soling with Sand Packing',
            unit: 'm²',
            quantity: 650.00,
            rate: 480.00,
            amount: 312000.00,
            remarks: 'Soling'
          },
          {
            id: 'uc_3_2',
            item_code: 'C-02',
            description: 'PCC 1:2:4',
            unit: 'm³',
            quantity: 65.00,
            rate: 11400.00,
            amount: 741000.00,
            remarks: 'PCC 1:2:4'
          }
        ]
      },
      {
        id: 'uc_ch_4',
        code: '4',
        title: 'Protection and drain construction work',
        items: [
          {
            id: 'uc_4_1',
            item_code: 'N-01',
            description: '1:4 Stone wall in cement sand mortar 60x60 cm drain and plastering work.',
            unit: 'm',
            quantity: 120.00,
            rate: 1850.00,
            amount: 222000.00,
            remarks: 'Masonry Drain'
          }
        ]
      }
    ]
  }
];
