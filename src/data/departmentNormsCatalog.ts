import { RateNormItem } from '../types';

export const BUILDING_NORMS: RateNormItem[] = [
  {
    item_id: 2001,
    code: '1.1',
    source: 'Standard Building Norms',
    description: 'Earthwork in excavation in foundation trenches in all kinds of soil including dressing and leveling (depth up to 1.5m)',
    base_unit: 'Cu.m.',
    base_quantity: 1.0,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 0.7 }
    ]
  },
  {
    item_id: 2002,
    code: '2.4',
    source: 'Standard Building Norms',
    description: 'First class brickwork in 1:6 cement sand mortar in foundation and superstructure',
    base_unit: 'Cu.m.',
    base_quantity: 1.0,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 0.7 },
      { resource_id: 102, resource_name: 'Skilled Mason', category: 'Labor', quantity_per_base_unit: 0.35 },
      { resource_id: 104, resource_name: 'OPC Cement 53 Grade', category: 'Material', quantity_per_base_unit: 1.05 },
      { resource_id: 106, resource_name: 'Coarse River Sand', category: 'Material', quantity_per_base_unit: 0.23 },
      { resource_id: 108, resource_name: 'First Class Local Bricks', category: 'Material', quantity_per_base_unit: 480.0 }
    ]
  },
  {
    item_id: 2003,
    code: '3.1',
    source: 'Standard Building Norms',
    description: 'Uncoursed random rubble stone masonry in 1:6 cement mortar in foundation',
    base_unit: 'Cu.m.',
    base_quantity: 1.0,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 1.1 },
      { resource_id: 102, resource_name: 'Skilled Mason', category: 'Labor', quantity_per_base_unit: 0.55 },
      { resource_id: 104, resource_name: 'OPC Cement 53 Grade', category: 'Material', quantity_per_base_unit: 0.95 },
      { resource_id: 106, resource_name: 'Coarse River Sand', category: 'Material', quantity_per_base_unit: 0.25 },
      { resource_id: 111, resource_name: 'Quarry Stone Boulders', category: 'Material', quantity_per_base_unit: 1.15 }
    ]
  },
  {
    item_id: 2004,
    code: '4.1',
    source: 'Standard Building Norms',
    description: 'PCC 1:2:4 (M15) in foundation and floor slab including mixing, placing & curing',
    base_unit: 'Cu.m.',
    base_quantity: 1.0,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 1.1 },
      { resource_id: 102, resource_name: 'Skilled Mason', category: 'Labor', quantity_per_base_unit: 0.25 },
      { resource_id: 104, resource_name: 'OPC Cement 53 Grade', category: 'Material', quantity_per_base_unit: 6.4 },
      { resource_id: 106, resource_name: 'Coarse River Sand', category: 'Material', quantity_per_base_unit: 0.44 },
      { resource_id: 107, resource_name: 'Crushed Stone Aggregate 20mm', category: 'Material', quantity_per_base_unit: 0.88 },
      { resource_id: 110, resource_name: 'Concrete Mixer 7/5 CFT', category: 'Equipment', quantity_per_base_unit: 0.35 }
    ]
  },
  {
    item_id: 2005,
    code: '4.2',
    source: 'Standard Building Norms',
    description: 'RCC 1:1.5:3 (M20) in columns, beams and slab including placing, vibrating and curing',
    base_unit: 'Cu.m.',
    base_quantity: 1.0,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 1.5 },
      { resource_id: 102, resource_name: 'Skilled Mason', category: 'Labor', quantity_per_base_unit: 0.35 },
      { resource_id: 104, resource_name: 'OPC Cement 53 Grade', category: 'Material', quantity_per_base_unit: 8.0 },
      { resource_id: 106, resource_name: 'Coarse River Sand', category: 'Material', quantity_per_base_unit: 0.42 },
      { resource_id: 107, resource_name: 'Crushed Stone Aggregate 20mm', category: 'Material', quantity_per_base_unit: 0.84 },
      { resource_id: 110, resource_name: 'Concrete Mixer 7/5 CFT', category: 'Equipment', quantity_per_base_unit: 0.4 },
      { resource_id: 173, resource_name: 'Concrete Vibrator', category: 'Equipment', quantity_per_base_unit: 0.25 }
    ]
  },
  {
    item_id: 2006,
    code: '5.2',
    source: 'Standard Building Norms',
    description: 'TMT High-Yield Reinforcement Steel bar cutting, bending & placing in RCC works',
    base_unit: 'Kg',
    base_quantity: 1.0,
    resources: [
      { resource_id: 103, resource_name: 'Bar Bender / Carpenter', category: 'Labor', quantity_per_base_unit: 0.015 },
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 0.015 },
      { resource_id: 109, resource_name: 'TMT Rebar Steel', category: 'Material', quantity_per_base_unit: 1.05 }
    ]
  },
  {
    item_id: 2007,
    code: '6.1',
    source: 'Standard Building Norms',
    description: '12.5mm cement sand plaster (1:4) on brick masonry walls including curing',
    base_unit: 'Sq.m.',
    base_quantity: 1.0,
    resources: [
      { resource_id: 102, resource_name: 'Skilled Mason', category: 'Labor', quantity_per_base_unit: 0.12 },
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 0.15 },
      { resource_id: 104, resource_name: 'OPC Cement 53 Grade', category: 'Material', quantity_per_base_unit: 0.11 },
      { resource_id: 106, resource_name: 'Coarse River Sand', category: 'Material', quantity_per_base_unit: 0.015 }
    ]
  },
  {
    item_id: 2008,
    code: '8.1',
    source: 'Standard Building Norms',
    description: 'Providing and applying 2 coats of emulsion paint over a coat of primer on interior plaster',
    base_unit: 'Sq.m.',
    base_quantity: 1.0,
    resources: [
      { resource_id: 102, resource_name: 'Skilled Painter', category: 'Labor', quantity_per_base_unit: 0.08 },
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 0.05 },
      { resource_id: 112, resource_name: 'Wall Primer', category: 'Material', quantity_per_base_unit: 0.08 },
      { resource_id: 113, resource_name: 'Emulsion Paint', category: 'Material', quantity_per_base_unit: 0.15 }
    ]
  }
];

export const ROAD_NORMS: RateNormItem[] = [
  {
    item_id: 3001,
    code: '1.01A',
    source: 'RDS Road Norms',
    description: 'Dismantling of existing structures like culverts, bridges, retaining walls comprising of masonry, cement concrete by manual means',
    base_unit: 'Cu.m.',
    base_quantity: 20.0,
    resources: [
      { resource_id: 84, resource_name: 'Skilled Labor (RDS)', category: 'Labor', quantity_per_base_unit: 1.0 },
      { resource_id: 105, resource_name: 'Unskilled Labor (RDS)', category: 'Labor', quantity_per_base_unit: 24.0 },
      { resource_id: 101, resource_name: 'Tractor-Trolley', category: 'Equipment', quantity_per_base_unit: 6.0 }
    ]
  },
  {
    item_id: 3002,
    code: '2.02A',
    source: 'RDS Road Norms',
    description: 'Providing and Laying Reinforced cement concrete NP3 Flush jointed pipe for culverts including fixing with cement mortar 1:2 (300mm dia)',
    base_unit: 'm',
    base_quantity: 12.5,
    resources: [
      { resource_id: 84, resource_name: 'Skilled Labor (RDS)', category: 'Labor', quantity_per_base_unit: 1.0 },
      { resource_id: 105, resource_name: 'Unskilled Labor (RDS)', category: 'Labor', quantity_per_base_unit: 5.0 },
      { resource_id: 79, resource_name: 'Sand', category: 'Material', quantity_per_base_unit: 0.08 },
      { resource_id: 33, resource_name: 'Cement', category: 'Material', quantity_per_base_unit: 0.06 },
      { resource_id: 75, resource_name: 'RCC pipe NP3 (300mm)', category: 'Material', quantity_per_base_unit: 12.5 }
    ]
  },
  {
    item_id: 3003,
    code: '6.01A',
    source: 'RDS Road Norms',
    description: 'Providing and laying granular subbase (GSB) on prepared surface, mixing at OMC and compacting by mechanical means (63mm Down)',
    base_unit: 'Cu.m.',
    base_quantity: 300.0,
    resources: [
      { resource_id: 85, resource_name: 'Skilled Labor (RDS)', category: 'Labor', quantity_per_base_unit: 2.0 },
      { resource_id: 106, resource_name: 'Unskilled Labor (RDS)', category: 'Labor', quantity_per_base_unit: 12.0 },
      { resource_id: 65, resource_name: 'Motor grader', category: 'Equipment', quantity_per_base_unit: 6.0 },
      { resource_id: 107, resource_name: 'Vibratory roller', category: "Equipment", quantity_per_base_unit: 12.0 },
      { resource_id: 37, resource_name: 'Water Sprinkling', category: 'Material', quantity_per_base_unit: 18.0 },
      { resource_id: 91, resource_name: 'Sub-base Material S1/S2', category: 'Material', quantity_per_base_unit: 384.0 }
    ]
  },
  {
    item_id: 3004,
    code: '13.01A',
    source: 'RDS Road Norms',
    description: 'Providing and laying Gabion wire box structure for retaining earth with diaphragm including rolling, cutting, weaving and boulder filling',
    base_unit: 'Cu.m.',
    base_quantity: 6.0,
    resources: [
      { resource_id: 85, resource_name: 'Skilled Labor (RDS)', category: 'Labor', quantity_per_base_unit: 3.0 },
      { resource_id: 106, resource_name: 'Unskilled Labor (RDS)', category: 'Labor', quantity_per_base_unit: 7.0 },
      { resource_id: 20, resource_name: 'Binding Wire', category: 'Material', quantity_per_base_unit: 3.62 },
      { resource_id: 63, resource_name: 'Mesh Wire (Gabion)', category: 'Material', quantity_per_base_unit: 70.2 },
      { resource_id: 82, resource_name: 'Selvedge Wire', category: 'Material', quantity_per_base_unit: 7.82 },
      { resource_id: 28, resource_name: 'Boulder / Quarry Stone', category: 'Material', quantity_per_base_unit: 6.6 }
    ]
  },
  {
    item_id: 3005,
    code: '14.02',
    source: 'RDS Road Norms',
    description: 'Providing and laying Bituminous Prime Coat with MC-70 Bitumen distributor at 0.75 lit/sq.m.',
    base_unit: 'Sq.m.',
    base_quantity: 1000.0,
    resources: [
      { resource_id: 85, resource_name: 'Skilled Labor (RDS)', category: 'Labor', quantity_per_base_unit: 1.0 },
      { resource_id: 106, resource_name: 'Unskilled Labor (RDS)', category: 'Labor', quantity_per_base_unit: 4.0 },
      { resource_id: 22, resource_name: 'Bitumen MC-70', category: 'Material', quantity_per_base_unit: 750.0 },
      { resource_id: 24, resource_name: 'Bitumen Distributor Truck', category: 'Equipment', quantity_per_base_unit: 2.5 }
    ]
  }
];

export const DWRI_IRRIGATION_NORMS: RateNormItem[] = [
  {
    item_id: 4001,
    code: 'W-01',
    source: 'WRS Irrigation Norms',
    description: 'Excavation of canal in canal bed and banks in ordinary soil including 30m lead and 1.5m lift',
    base_unit: 'Cu.m.',
    base_quantity: 1.0,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 0.65 }
    ]
  },
  {
    item_id: 4002,
    code: 'W-04',
    source: 'WRS Irrigation Norms',
    description: 'Providing and laying M15 PCC canal lining in slope and bed including formwork and curing',
    base_unit: 'Cu.m.',
    base_quantity: 1.0,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 1.25 },
      { resource_id: 102, resource_name: 'Skilled Mason', category: 'Labor', quantity_per_base_unit: 0.3 },
      { resource_id: 104, resource_name: 'OPC Cement 53 Grade', category: 'Material', quantity_per_base_unit: 6.2 },
      { resource_id: 106, resource_name: 'Coarse River Sand', category: 'Material', quantity_per_base_unit: 0.45 },
      { resource_id: 107, resource_name: 'Crushed Stone Aggregate 20mm', category: 'Material', quantity_per_base_unit: 0.86 }
    ]
  },
  {
    item_id: 4003,
    code: 'W-08',
    source: 'WRS Irrigation Norms',
    description: 'Providing, laying and jointing PE 100 HDPE pipe PN 6 (90mm outer diameter) in trench',
    base_unit: 'm',
    base_quantity: 100.0,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 8.0 },
      { resource_id: 102, resource_name: 'Plumber / Pipe Fitter', category: 'Labor', quantity_per_base_unit: 2.0 },
      { resource_id: 114, resource_name: 'HDPE Pipe 90mm PN6', category: 'Material', quantity_per_base_unit: 102.0 },
      { resource_id: 115, resource_name: 'Butt Fusion Welding Machine', category: 'Equipment', quantity_per_base_unit: 4.0 }
    ]
  },
  {
    item_id: 4004,
    code: 'W-12',
    source: 'WRS Irrigation Norms',
    description: 'Dry Stone Pitching in canal slope and river bank protection works with boulders',
    base_unit: 'Cu.m.',
    base_quantity: 1.0,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 0.5 },
      { resource_id: 102, resource_name: 'Skilled Mason', category: 'Labor', quantity_per_base_unit: 0.4 },
      { resource_id: 111, resource_name: 'Quarry Stone Boulders', category: 'Material', quantity_per_base_unit: 1.1 }
    ]
  }
];

export const CUSTOM_NORMS_CATALOG: RateNormItem[] = [
  {
    item_id: 5001,
    code: 'CST-01',
    source: 'Custom Norms',
    description: 'Supply and installation of Solar Street Light 60W LED with PV Panel and Lithium Battery',
    base_unit: 'Set',
    base_quantity: 1.0,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 1.0 },
      { resource_id: 102, resource_name: 'Electrician', category: 'Labor', quantity_per_base_unit: 0.5 },
      { resource_id: 116, resource_name: 'Solar Street Light Set 60W', category: 'Material', quantity_per_base_unit: 1.0 },
      { resource_id: 117, resource_name: 'Steel Pole 6m Octagonal', category: 'Material', quantity_per_base_unit: 1.0 }
    ]
  },
  {
    item_id: 5002,
    code: 'CST-02',
    source: 'Custom Norms',
    description: 'Interlocking Concrete Block Paving 60mm thick for footpaths and parking yards',
    base_unit: 'Sq.m.',
    base_quantity: 1.0,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 0.35 },
      { resource_id: 102, resource_name: 'Skilled Paver Mason', category: 'Labor', quantity_per_base_unit: 0.25 },
      { resource_id: 118, resource_name: 'Interlocking Paver Blocks 60mm', category: 'Material', quantity_per_base_unit: 50.0 },
      { resource_id: 106, resource_name: 'Coarse River Sand (Bedding)', category: 'Material', quantity_per_base_unit: 0.05 }
    ]
  }
];
