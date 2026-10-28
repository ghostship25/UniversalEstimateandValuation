import {
  DrawingTemplateDef,
  TemplateWorkItemOutput,
  DimensionParam,
  TemplateDrawingCategory
} from '../../types';

export const STANDARD_DRAWING_TEMPLATES: DrawingTemplateDef[] = [
  // ----------------------------------------------------
  // 1. TRAPEZOIDAL STONE MASONRY DRAIN
  // ----------------------------------------------------
  {
    id: 'tmp-drn-trapezoidal',
    code: 'TMP-DRN-01',
    category: 'Drain',
    name: 'Trapezoidal Stone Masonry Drain',
    description: 'Standard trapezoidal open drain with stone soling, PCC bed foundation, stone masonry sloping side walls, and internal cement plaster with punning.',
    standard_ref: 'Roads Dept. Road Drainage Standard Drawings & BLD Guidelines',
    svg_type: 'trapezoidal_drain',
    dimension_params: {
      reach_length: 100, // L (m)
      bed_width: 0.60, // b (m)
      drain_depth: 0.60, // d (m)
      wall_thickness: 0.35, // tw (m)
      bed_pcc_thickness: 0.15, // tb (m)
      soling_thickness: 0.15, // t_sol (m)
      side_slope_z: 0.5, // 1:z (0.5 means 1V:0.5H)
      plaster_thickness_mm: 12.5,
      freeboard: 0.10
    },
    param_definitions: [
      { key: 'reach_length', label: 'Drain Reach Length', symbol: 'L', unit: 'm', default_val: 100, min: 1, max: 5000, step: 5, description: 'Total continuous running length of drain section' },
      { key: 'bed_width', label: 'Clear Bottom Bed Width', symbol: 'b', unit: 'm', default_val: 0.60, min: 0.20, max: 3.0, step: 0.05, description: 'Internal clear hydraulic bed width' },
      { key: 'drain_depth', label: 'Clear Drain Depth', symbol: 'd', unit: 'm', default_val: 0.60, min: 0.20, max: 3.0, step: 0.05, description: 'Internal clear depth from bed to top edge' },
      { key: 'wall_thickness', label: 'Masonry Wall Thickness', symbol: 't_w', unit: 'm', default_val: 0.35, min: 0.20, max: 1.0, step: 0.05, description: 'Thickness of stone masonry side walls' },
      { key: 'side_slope_z', label: 'Side Slope Ratio (H:V)', symbol: 'z', unit: 'ratio', default_val: 0.5, min: 0.1, max: 2.0, step: 0.1, description: 'Horizontal component for 1 vertical (e.g. 0.5 for 1:0.5)' },
      { key: 'bed_pcc_thickness', label: 'PCC Base Thickness', symbol: 't_b', unit: 'm', default_val: 0.15, min: 0.05, max: 0.5, step: 0.025, description: 'PCC (1:3:6 or 1:2:4) leveling and bed slab thickness' },
      { key: 'soling_thickness', label: 'Stone Soling Thickness', symbol: 't_sol', unit: 'm', default_val: 0.15, min: 0, max: 0.40, step: 0.05, description: 'Flat dry stone soling under foundation' }
    ]
  },

  // ----------------------------------------------------
  // 2. RECTANGULAR RCC DRAIN WITH PRECAST COVER
  // ----------------------------------------------------
  {
    id: 'tmp-drn-rcc-box',
    code: 'TMP-DRN-02',
    category: 'Drain',
    name: 'Rectangular RCC Drain with Precast Cover Slab',
    description: 'Urban rectangular reinforced concrete drain with cast-in-situ RCC base and walls, topped with removable precast RCC cover slabs.',
    standard_ref: 'BLD Urban Road Drainage & Local Engineering Standards',
    svg_type: 'rcc_box_drain',
    dimension_params: {
      reach_length: 150, // L (m)
      clear_width: 0.75, // W (m)
      clear_depth: 0.80, // H (m)
      wall_thickness: 0.15, // tw (m)
      base_slab_thickness: 0.15, // tb (m)
      cover_slab_thickness: 0.10, // t_cov (m)
      pcc_bed_thickness: 0.075, // t_pcc (m)
      soling_thickness: 0.15, // t_sol (m)
      rebar_density_kg_m3: 95 // kg/m3 of RCC
    },
    param_definitions: [
      { key: 'reach_length', label: 'Drain Reach Length', symbol: 'L', unit: 'm', default_val: 150, min: 1, max: 5000, step: 5, description: 'Total reach length of drain' },
      { key: 'clear_width', label: 'Clear Internal Width', symbol: 'W', unit: 'm', default_val: 0.75, min: 0.30, max: 3.0, step: 0.05, description: 'Inside waterway width' },
      { key: 'clear_depth', label: 'Clear Internal Depth', symbol: 'H', unit: 'm', default_val: 0.80, min: 0.30, max: 3.0, step: 0.05, description: 'Inside waterway depth' },
      { key: 'wall_thickness', label: 'RCC Wall Thickness', symbol: 't_w', unit: 'm', default_val: 0.15, min: 0.10, max: 0.40, step: 0.025, description: 'Thickness of reinforced concrete side walls' },
      { key: 'base_slab_thickness', label: 'RCC Base Slab Thickness', symbol: 't_b', unit: 'm', default_val: 0.15, min: 0.10, max: 0.40, step: 0.025, description: 'Thickness of bottom RCC raft slab' },
      { key: 'cover_slab_thickness', label: 'Precast Cover Slab Thk', symbol: 't_cov', unit: 'm', default_val: 0.10, min: 0.075, max: 0.25, step: 0.025, description: 'Thickness of precast removable cover slab' },
      { key: 'pcc_bed_thickness', label: 'PCC 1:3:6 Screed Thk', symbol: 't_pcc', unit: 'm', default_val: 0.075, min: 0.05, max: 0.20, step: 0.025, description: 'Lean concrete leveling layer' },
      { key: 'soling_thickness', label: 'Stone Soling Thickness', symbol: 't_sol', unit: 'm', default_val: 0.15, min: 0, max: 0.30, step: 0.05, description: 'Dry flat stone soling base' },
      { key: 'rebar_density_kg_m3', label: 'Rebar Ratio (kg/m³)', symbol: 'ρ_s', unit: 'ratio', default_val: 95, min: 50, max: 200, step: 5, description: 'Average steel rebar density for RCC M20/M25' }
    ]
  },

  // ----------------------------------------------------
  // 3. SAUCER / V-SHAPED CURB DRAIN
  // ----------------------------------------------------
  {
    id: 'tmp-drn-saucer',
    code: 'TMP-DRN-03',
    category: 'Drain',
    name: 'Saucer / V-Shaped Surface Drain & Kerb Channel',
    description: 'Shallow surface drain integrated with road kerb for storm water collection in urban streetscapes.',
    standard_ref: 'Roads Dept. Urban Street Cross-Section Guidelines',
    svg_type: 'saucer_drain',
    dimension_params: {
      reach_length: 200,
      saucer_width: 0.60,
      center_dish_depth: 0.10,
      pcc_thickness: 0.15,
      soling_thickness: 0.15,
      kerb_height: 0.25,
      kerb_width: 0.15
    },
    param_definitions: [
      { key: 'reach_length', label: 'Reach Length', symbol: 'L', unit: 'm', default_val: 200, min: 5, max: 5000, step: 10, description: 'Total running length' },
      { key: 'saucer_width', label: 'Saucer Drain Width', symbol: 'W_s', unit: 'm', default_val: 0.60, min: 0.30, max: 1.50, step: 0.05, description: 'Width of curved dish channel' },
      { key: 'center_dish_depth', label: 'Center Dish Depression', symbol: 'd_c', unit: 'm', default_val: 0.10, min: 0.05, max: 0.30, step: 0.02, description: 'Central drop depth of saucer profile' },
      { key: 'pcc_thickness', label: 'PCC M15/M20 Thickness', symbol: 't_pcc', unit: 'm', default_val: 0.15, min: 0.10, max: 0.30, step: 0.025, description: 'Concrete dish slab thickness' },
      { key: 'soling_thickness', label: 'Stone Soling Thickness', symbol: 't_sol', unit: 'm', default_val: 0.15, min: 0, max: 0.30, step: 0.05, description: 'Stone soling foundation' },
      { key: 'kerb_height', label: 'Kerb Stone Height', symbol: 'H_k', unit: 'm', default_val: 0.25, min: 0.15, max: 0.45, step: 0.05, description: 'Height of side kerb stone' },
      { key: 'kerb_width', label: 'Kerb Stone Width', symbol: 'W_k', unit: 'm', default_val: 0.15, min: 0.10, max: 0.30, step: 0.025, description: 'Width of side kerb' }
    ]
  },

  // ----------------------------------------------------
  // 4. RCC BOX CULVERT (SINGLE CELL)
  // ----------------------------------------------------
  {
    id: 'tmp-clv-box-single',
    code: 'TMP-CLV-01',
    category: 'Culvert',
    name: 'RCC Box Culvert (Single Cell - Standard Roads Dept.)',
    description: 'Monolithic reinforced concrete box culvert for road crossings including barrel, top slab, bottom raft, haunches, wing walls, and stone apron pitching.',
    standard_ref: 'Roads Department Bridge & Culvert Standard Drawings',
    svg_type: 'box_culvert',
    dimension_params: {
      clear_span: 2.50, // S (m)
      clear_height: 2.00, // H (m)
      barrel_length: 8.50, // L_barrel (m) along road
      wall_thickness: 0.30, // tw (m)
      bottom_slab_thickness: 0.30, // tb (m)
      top_slab_thickness: 0.30, // ttop (m)
      haunch_size: 0.15, // h_c (m)
      soling_thickness: 0.20, // t_sol (m)
      pcc_bed_thickness: 0.10, // t_pcc (m)
      wingwall_length: 3.50, // L_ww (m)
      wingwall_thickness: 0.35, // tw_ww (m)
      apron_length_total: 8.00, // Upstream + Downstream apron (m)
      rebar_density_kg_m3: 115 // kg/m3 for RCC M25
    },
    param_definitions: [
      { key: 'clear_span', label: 'Clear Vent Span', symbol: 'S', unit: 'm', default_val: 2.50, min: 1.0, max: 6.0, step: 0.25, description: 'Clear internal span between abutment walls' },
      { key: 'clear_height', label: 'Clear Vent Height', symbol: 'H', unit: 'm', default_val: 2.00, min: 1.0, max: 5.0, step: 0.25, description: 'Clear internal vertical waterway height' },
      { key: 'barrel_length', label: 'Barrel Length (Road Width)', symbol: 'L_b', unit: 'm', default_val: 8.50, min: 4.0, max: 30.0, step: 0.50, description: 'Total length of box barrel transverse to stream' },
      { key: 'wall_thickness', label: 'Side Abutment Wall Thk', symbol: 't_w', unit: 'm', default_val: 0.30, min: 0.20, max: 0.60, step: 0.05, description: 'Thickness of vertical RCC sidewalls' },
      { key: 'bottom_slab_thickness', label: 'Bottom Raft Slab Thk', symbol: 't_b', unit: 'm', default_val: 0.30, min: 0.20, max: 0.60, step: 0.05, description: 'Thickness of foundation raft slab' },
      { key: 'top_slab_thickness', label: 'Top Deck Slab Thk', symbol: 't_top', unit: 'm', default_val: 0.30, min: 0.20, max: 0.60, step: 0.05, description: 'Thickness of top traffic deck slab' },
      { key: 'haunch_size', label: 'Corner Haunch Size', symbol: 'h_c', unit: 'm', default_val: 0.15, min: 0.10, max: 0.30, step: 0.05, description: '45-degree internal corner haunch leg' },
      { key: 'pcc_bed_thickness', label: 'PCC 1:3:6 Bed Course', symbol: 't_pcc', unit: 'm', default_val: 0.10, min: 0.05, max: 0.25, step: 0.025, description: 'Leveling screed concrete under raft' },
      { key: 'soling_thickness', label: 'Stone Soling Thickness', symbol: 't_sol', unit: 'm', default_val: 0.20, min: 0.10, max: 0.40, step: 0.05, description: 'Dry boulder/stone soling base' },
      { key: 'wingwall_length', label: 'Wing Wall Length (Each of 4)', symbol: 'L_ww', unit: 'm', default_val: 3.50, min: 1.5, max: 8.0, step: 0.5, description: 'Length of splayed wing wall' },
      { key: 'rebar_density_kg_m3', label: 'Rebar Ratio (kg/m³)', symbol: 'ρ_s', unit: 'ratio', default_val: 115, min: 70, max: 200, step: 5, description: 'Structural steel rebar density' }
    ]
  },

  // ----------------------------------------------------
  // 5. RCC SLAB CULVERT ON MASONRY ABUTMENTS
  // ----------------------------------------------------
  {
    id: 'tmp-clv-slab-masonry',
    code: 'TMP-CLV-02',
    category: 'Culvert',
    name: 'RCC Slab Culvert on Stone Masonry Abutments',
    description: 'Composite culvert featuring stone masonry gravity abutments and wing walls with a cast-in-situ RCC M25 deck slab and kerb beams.',
    standard_ref: 'Roads Dept. Standard Drawings for Medium Span Slab Culverts',
    svg_type: 'slab_culvert',
    dimension_params: {
      clear_span: 4.00, // S (m)
      deck_width: 8.00, // W_deck (m)
      abutment_height: 2.80, // H_ab (m)
      abutment_top_width: 0.65, // w_top (m)
      abutment_bottom_width: 1.25, // w_bot (m)
      slab_thickness: 0.35, // t_slab (m)
      footing_offset_width: 1.60, // w_ft (m)
      footing_depth: 0.60, // d_ft (m)
      pcc_bed_thickness: 0.15,
      soling_thickness: 0.20,
      rebar_density_kg_m3: 120
    },
    param_definitions: [
      { key: 'clear_span', label: 'Clear Span', symbol: 'S', unit: 'm', default_val: 4.00, min: 1.5, max: 8.0, step: 0.25, description: 'Clear waterway span between abutment front faces' },
      { key: 'deck_width', label: 'Deck Width (Road Width)', symbol: 'W_d', unit: 'm', default_val: 8.00, min: 4.0, max: 24.0, step: 0.5, description: 'Total width of RCC deck slab' },
      { key: 'abutment_height', label: 'Abutment Masonry Height', symbol: 'H_ab', unit: 'm', default_val: 2.80, min: 1.5, max: 6.0, step: 0.2, description: 'Height of abutment masonry from footing top to deck seat' },
      { key: 'abutment_top_width', label: 'Abutment Top Width', symbol: 'w_top', unit: 'm', default_val: 0.65, min: 0.50, max: 1.20, step: 0.05, description: 'Top seat width of abutment wall' },
      { key: 'abutment_bottom_width', label: 'Abutment Bottom Width', symbol: 'w_bot', unit: 'm', default_val: 1.25, min: 0.80, max: 2.50, step: 0.05, description: 'Bottom width of abutment wall body' },
      { key: 'slab_thickness', label: 'RCC Deck Slab Thickness', symbol: 't_s', unit: 'm', default_val: 0.35, min: 0.20, max: 0.60, step: 0.025, description: 'Thickness of reinforced concrete deck slab' },
      { key: 'footing_depth', label: 'Foundation Footing Depth', symbol: 'd_ft', unit: 'm', default_val: 0.60, min: 0.30, max: 1.50, step: 0.10, description: 'Depth of masonry footing steps' },
      { key: 'rebar_density_kg_m3', label: 'Rebar Ratio (kg/m³)', symbol: 'ρ_s', unit: 'ratio', default_val: 120, min: 80, max: 200, step: 5, description: 'Reinforcement density for RCC slab & kerbs' }
    ]
  },

  // ----------------------------------------------------
  // 6. HUME PIPE CULVERT (NP3 / NP4)
  // ----------------------------------------------------
  {
    id: 'tmp-clv-pipe',
    code: 'TMP-CLV-03',
    category: 'Culvert',
    name: 'RCC Hume Pipe Culvert (NP3/NP4 with Headwalls)',
    description: 'Standard single or multi-row reinforced concrete pipe culvert with concrete cradle bed, stone masonry headwalls, and drop inlet/aprons.',
    standard_ref: 'Roads Dept. Standard Drawings for Pipe Culverts (Spec 700)',
    svg_type: 'pipe_culvert',
    dimension_params: {
      pipe_diameter_m: 0.90, // Internal diameter (m)
      no_of_pipe_rows: 1, // 1 or 2
      pipe_length_m: 9.00, // Total barrel length (m)
      cradle_pcc_thickness: 0.20, // (m)
      headwall_height: 1.80, // (m)
      headwall_length: 4.50, // (m)
      headwall_thickness: 0.50, // (m)
      soling_thickness: 0.15 // (m)
    },
    param_definitions: [
      { key: 'pipe_diameter_m', label: 'Pipe Internal Diameter', symbol: 'D', unit: 'm', default_val: 0.90, min: 0.60, max: 2.00, step: 0.15, description: 'Internal bore diameter of NP3/NP4 pipe' },
      { key: 'no_of_pipe_rows', label: 'Number of Pipe Rows', symbol: 'N_p', unit: 'nos', default_val: 1, min: 1, max: 4, step: 1, description: 'Single, twin or multi-cell pipe arrangement' },
      { key: 'pipe_length_m', label: 'Total Pipe Length', symbol: 'L_p', unit: 'm', default_val: 9.00, min: 4.0, max: 30.0, step: 1.0, description: 'Total length of pipe barrel' },
      { key: 'cradle_pcc_thickness', label: 'PCC Cradle Bed Thickness', symbol: 't_crd', unit: 'm', default_val: 0.20, min: 0.15, max: 0.40, step: 0.05, description: 'PCC 1:3:6 bedding under pipe haunches' },
      { key: 'headwall_height', label: 'Headwall Height', symbol: 'H_hw', unit: 'm', default_val: 1.80, min: 1.0, max: 4.0, step: 0.2, description: 'Height of stone masonry headwall' },
      { key: 'headwall_length', label: 'Headwall Length', symbol: 'L_hw', unit: 'm', default_val: 4.50, min: 2.5, max: 12.0, step: 0.5, description: 'Length of headwall transverse to stream' }
    ]
  },

  // ----------------------------------------------------
  // 7. FLEXIBLE PAVEMENT ROAD CROSS-SECTION
  // ----------------------------------------------------
  {
    id: 'tmp-rd-flexible',
    code: 'TMP-RD-01',
    category: 'Road Section',
    name: 'Flexible Pavement Road Cross-Section (Roads Dept. Standard)',
    description: 'Standard highway and authority road layered pavement cross-section comprising Subgrade Preparation, Granular Sub-base (GSB), WMM Base Course, Prime/Tack coats, DBM, and Asphalt Concrete with Shoulders.',
    standard_ref: 'Roads Department Standard Specifications Section 1000 & 1200',
    svg_type: 'road_flexible',
    dimension_params: {
      road_length_m: 500, // L (m)
      carriageway_width: 5.50, // W_cw (m)
      shoulder_width_each: 1.00, // W_sh (m)
      subgrade_depth: 0.30, // t_sg (m)
      gsb_thickness: 0.15, // t_gsb (m)
      wmm_thickness: 0.15, // t_wmm (m)
      dbm_thickness: 0.05, // t_dbm (m)
      ac_thickness: 0.03, // t_ac (m)
      camber_percent: 2.5 // %
    },
    param_definitions: [
      { key: 'road_length_m', label: 'Road Reach Length', symbol: 'L', unit: 'm', default_val: 500, min: 10, max: 20000, step: 25, description: 'Total chainage length of road section' },
      { key: 'carriageway_width', label: 'Carriageway Paved Width', symbol: 'W_cw', unit: 'm', default_val: 5.50, min: 3.0, max: 24.0, step: 0.25, description: 'Blacktopped bituminous lane width' },
      { key: 'shoulder_width_each', label: 'Shoulder Width (Each Side)', symbol: 'W_sh', unit: 'm', default_val: 1.00, min: 0.5, max: 3.0, step: 0.25, description: 'Width of earthen or gravel shoulder on both sides' },
      { key: 'subgrade_depth', label: 'Subgrade Compaction Depth', symbol: 't_sg', unit: 'm', default_val: 0.30, min: 0.15, max: 0.50, step: 0.05, description: 'Top subgrade layer scarified and compacted to 95% MDD' },
      { key: 'gsb_thickness', label: 'Granular Sub-Base (GSB) Thk', symbol: 't_gsb', unit: 'm', default_val: 0.15, min: 0.10, max: 0.30, step: 0.025, description: 'Graded crushed stone sub-base thickness' },
      { key: 'wmm_thickness', label: 'Wet Mix Macadam (WMM) Thk', symbol: 't_wmm', unit: 'm', default_val: 0.15, min: 0.10, max: 0.30, step: 0.025, description: 'Plant-mixed mechanical stabilized base course' },
      { key: 'dbm_thickness', label: 'Dense Bituminous Macadam (DBM)', symbol: 't_dbm', unit: 'm', default_val: 0.05, min: 0.04, max: 0.12, step: 0.01, description: 'Bituminous binder course layer' },
      { key: 'ac_thickness', label: 'Asphalt Concrete (AC / Wearing)', symbol: 't_ac', unit: 'm', default_val: 0.03, min: 0.025, max: 0.06, step: 0.005, description: 'Asphalt concrete wearing course / premix carpet' },
      { key: 'camber_percent', label: 'Transverse Camber Slope', symbol: 'C', unit: '%', default_val: 2.5, min: 1.5, max: 4.0, step: 0.5, description: 'Crossfall percentage for drainage runoff' }
    ]
  },

  // ----------------------------------------------------
  // 8. RIGID PAVEMENT / CONCRETE ROAD SECTION
  // ----------------------------------------------------
  {
    id: 'tmp-rd-rigid',
    code: 'TMP-RD-02',
    category: 'Road Section',
    name: 'Rigid Concrete Pavement (PQC / DLC with Dowels & Kerbs)',
    description: 'High-durability urban concrete road comprising subgrade preparation, Dry Lean Concrete (DLC M10) subbase, separation polythene membrane, and Pavement Quality Concrete (PQC M30) with dowels and precast kerbs.',
    standard_ref: 'Roads Dept. Guidelines for Concrete Pavements & IRC:58 / IRC:15',
    svg_type: 'road_rigid',
    dimension_params: {
      road_length_m: 300,
      slab_width: 6.00,
      dlc_thickness: 0.10,
      pqc_thickness: 0.20,
      kerb_height: 0.30,
      kerb_width: 0.15,
      joint_spacing_m: 4.00,
      dowel_bar_dia_mm: 25,
      soling_thickness: 0.15
    },
    param_definitions: [
      { key: 'road_length_m', label: 'Road Reach Length', symbol: 'L', unit: 'm', default_val: 300, min: 10, max: 10000, step: 25, description: 'Continuous running length' },
      { key: 'slab_width', label: 'PQC Concrete Slab Width', symbol: 'W_slab', unit: 'm', default_val: 6.00, min: 3.0, max: 16.0, step: 0.25, description: 'Total width of PQC slab' },
      { key: 'dlc_thickness', label: 'DLC M10 Sub-base Thickness', symbol: 't_dlc', unit: 'm', default_val: 0.10, min: 0.075, max: 0.20, step: 0.025, description: 'Dry Lean Concrete base layer' },
      { key: 'pqc_thickness', label: 'PQC M30 Slab Thickness', symbol: 't_pqc', unit: 'm', default_val: 0.20, min: 0.15, max: 0.35, step: 0.025, description: 'Pavement Quality Concrete slab thickness' },
      { key: 'joint_spacing_m', label: 'Contraction Joint Spacing', symbol: 'S_j', unit: 'm', default_val: 4.00, min: 3.0, max: 5.0, step: 0.25, description: 'Transverse saw-cut contraction joint interval' },
      { key: 'kerb_height', label: 'Side Kerb Stone Height', symbol: 'H_k', unit: 'm', default_val: 0.30, min: 0.20, max: 0.45, step: 0.05, description: 'Height of precast roadside kerb stones' },
      { key: 'kerb_width', label: 'Side Kerb Stone Width', symbol: 'W_k', unit: 'm', default_val: 0.15, min: 0.10, max: 0.30, step: 0.025, description: 'Width of precast kerb stones' }
    ]
  },

  // ----------------------------------------------------
  // 9. GRAVITY STONE MASONRY RETAINING WALL
  // ----------------------------------------------------
  {
    id: 'tmp-ret-masonry',
    code: 'TMP-RET-01',
    category: 'Retaining Structure',
    name: 'Gravity Stone Masonry Retaining Wall / Breast Wall',
    description: 'Standard hill road gravity retaining wall with stepped stone masonry footing, front batter, back drainage gravel filter, weep holes, and cement plaster capping.',
    standard_ref: 'Roads Dept. Retaining Wall Standards & Design Manual',
    svg_type: 'retaining_wall',
    dimension_params: {
      wall_length_m: 60, // L (m)
      retaining_height_m: 3.50, // H (m)
      crest_top_width_m: 0.60, // b_top (m)
      front_batter_ratio: 0.167, // 1:6 (1H : 6V = 0.167)
      back_batter_ratio: 0.333, // 1:3 (1H : 3V = 0.333)
      foundation_depth_m: 1.20, // D_f (m)
      foundation_offset_m: 0.30, // Offset each side (m)
      pcc_bed_thickness: 0.15, // t_pcc (m)
      soling_thickness: 0.20, // t_sol (m)
      weep_hole_spacing_m: 1.50, // spacing (m)
      filter_media_thickness_m: 0.30 // thickness of gravel packing behind wall (m)
    },
    param_definitions: [
      { key: 'wall_length_m', label: 'Retaining Wall Length', symbol: 'L', unit: 'm', default_val: 60, min: 5, max: 1000, step: 5, description: 'Total continuous running length of wall' },
      { key: 'retaining_height_m', label: 'Retaining Height Above Ground', symbol: 'H', unit: 'm', default_val: 3.50, min: 1.5, max: 10.0, step: 0.25, description: 'Exposed retaining stem height' },
      { key: 'crest_top_width_m', label: 'Top Crest Width', symbol: 'b_top', unit: 'm', default_val: 0.60, min: 0.45, max: 1.20, step: 0.05, description: 'Width of wall top crest' },
      { key: 'front_batter_ratio', label: 'Front Face Batter (H/V)', symbol: 's_f', unit: 'ratio', default_val: 0.167, min: 0.0, max: 0.35, step: 0.025, description: 'Front batter ratio (0.167 for 1:6 slope)' },
      { key: 'back_batter_ratio', label: 'Back Face Batter / Slope', symbol: 's_b', unit: 'ratio', default_val: 0.333, min: 0.0, max: 0.50, step: 0.025, description: 'Back batter / step ratio (0.333 for 1:3 slope)' },
      { key: 'foundation_depth_m', label: 'Foundation Depth', symbol: 'D_f', unit: 'm', default_val: 1.20, min: 0.60, max: 3.0, step: 0.10, description: 'Embedment depth below ground level' },
      { key: 'weep_hole_spacing_m', label: 'Weep Hole Spacing (c/c)', symbol: 'S_w', unit: 'm', default_val: 1.50, min: 1.0, max: 3.0, step: 0.25, description: 'Horizontal and vertical grid spacing of weep holes' },
      { key: 'filter_media_thickness_m', label: 'Gravel Filter Media Thk', symbol: 't_flt', unit: 'm', default_val: 0.30, min: 0.15, max: 0.60, step: 0.05, description: 'Thickness of backfill crushed gravel layer' }
    ]
  },

  // ----------------------------------------------------
  // 10. GABION RETAINING WALL
  // ----------------------------------------------------
  {
    id: 'tmp-ret-gabion',
    code: 'TMP-RET-02',
    category: 'Retaining Structure',
    name: 'Gabion Wire Mesh Retaining Wall (Tiered Structure)',
    description: 'Tiered flexible gabion crate retaining structure with mechanically woven or machine-made GI wire hexagonal mesh filled with hard boulder stones and geotextile filter backing.',
    standard_ref: 'Roads Dept. Specifications Section 2400 (Gabion Works)',
    svg_type: 'gabion_wall',
    dimension_params: {
      wall_length_m: 50, // L (m)
      no_of_tiers: 3, // 3 tiers high (e.g. 3m total height)
      tier_height_m: 1.00, // 1m per crate
      base_width_m: 3.00, // 3m at bottom (3 crates)
      mid_width_m: 2.00, // 2m at mid tier (2 crates)
      top_width_m: 1.00, // 1m at top tier (1 crate)
      soling_thickness: 0.20,
      geotextile_layers: 1
    },
    param_definitions: [
      { key: 'wall_length_m', label: 'Gabion Wall Length', symbol: 'L', unit: 'm', default_val: 50, min: 5, max: 1000, step: 5, description: 'Total continuous running length' },
      { key: 'no_of_tiers', label: 'Number of Tiers (Crate Rows)', symbol: 'N_t', unit: 'nos', default_val: 3, min: 1, max: 8, step: 1, description: 'Total vertical stepped tiers (each 1m high)' },
      { key: 'base_width_m', label: 'Base Tier Width', symbol: 'W_base', unit: 'm', default_val: 3.00, min: 1.0, max: 8.0, step: 1.0, description: 'Width of bottom gabion mattress / crates' },
      { key: 'top_width_m', label: 'Top Tier Width', symbol: 'W_top', unit: 'm', default_val: 1.00, min: 1.0, max: 4.0, step: 1.0, description: 'Width of uppermost gabion crates' },
      { key: 'tier_height_m', label: 'Standard Crate Height', symbol: 'H_t', unit: 'm', default_val: 1.00, min: 0.50, max: 1.50, step: 0.50, description: 'Height of each crate box (usually 1.0m or 0.5m)' }
    ]
  }
];

// ----------------------------------------------------
// CALCULATION ENGINE: Calculates exact work items and quantities from parameters
// ----------------------------------------------------
export function calculateTemplateWorkItems(
  template: DrawingTemplateDef,
  params: Record<string, number>
): TemplateWorkItemOutput[] {
  const p = { ...template.dimension_params, ...params };
  const items: TemplateWorkItemOutput[] = [];

  switch (template.svg_type) {
    // --------------------------------------------------
    // TRAPEZOIDAL DRAIN
    // --------------------------------------------------
    case 'trapezoidal_drain': {
      const L = p.reach_length || 100;
      const b = p.bed_width || 0.60;
      const d = p.drain_depth || 0.60;
      const tw = p.wall_thickness || 0.35;
      const tb = p.bed_pcc_thickness || 0.15;
      const tsol = p.soling_thickness || 0.15;
      const z = p.side_slope_z || 0.5;

      const totalH = d + tb + tsol;
      const bottomW = b + 2 * tw;
      const topExcW = bottomW + 2 * z * totalH;
      const avgExcW = (bottomW + topExcW) / 2;
      const excQty = Number((L * avgExcW * totalH).toFixed(3));

      items.push({
        id: 'drn-1-exc',
        item_name: 'Earthwork in excavation for drain trench in all types of soil',
        item_code_hint: 'RDS-EARTH-01',
        unit: 'm3',
        category: 'Excavation',
        calc_formula_desc: `L × [(Bottom_W + Top_W) / 2] × Total_Depth = ${L} × [(${bottomW.toFixed(2)} + ${topExcW.toFixed(2)})/2] × ${totalH.toFixed(2)}`,
        calculated_quantity: excQty,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number(avgExcW.toFixed(3)),
        height_val: Number(totalH.toFixed(3)),
        particulars_template: `Earthwork in excavation for ${template.name} (${L}m reach)`
      });

      if (tsol > 0) {
        const solQty = Number((L * bottomW).toFixed(3));
        items.push({
          id: 'drn-1-sol',
          item_name: 'Providing and laying flat dry stone soling under drain bed',
          item_code_hint: 'RDS-SOLING-01',
          unit: 'm2',
          category: 'Soling & PCC',
          calc_formula_desc: `L × Bed_Width = ${L} × ${bottomW.toFixed(2)}`,
          calculated_quantity: solQty,
          no_of_units: 1,
          length_val: L,
          breadth_val: Number(bottomW.toFixed(3)),
          height_val: '',
          particulars_template: `Stone soling in foundation bed (${L}m reach)`
        });
      }

      const pccQty = Number((L * bottomW * tb).toFixed(3));
      items.push({
        id: 'drn-1-pcc',
        item_name: 'PCC (1:3:6 or M15) in drain bed foundation slab',
        item_code_hint: 'RDS-CONC-M15',
        unit: 'm3',
        category: 'Soling & PCC',
        calc_formula_desc: `L × Bed_Width × Bed_Thk = ${L} × ${bottomW.toFixed(2)} × ${tb.toFixed(2)}`,
        calculated_quantity: pccQty,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number(bottomW.toFixed(3)),
        height_val: Number(tb.toFixed(3)),
        particulars_template: `PCC (1:3:6) in drain bed slab (${L}m reach)`
      });

      const wallSlopeLen = Math.sqrt(d * d + (z * d) * (z * d));
      const masonryQty = Number((2 * L * wallSlopeLen * tw).toFixed(3));
      items.push({
        id: 'drn-1-mas',
        item_name: 'Stone masonry in 1:4 cement sand mortar in sloping side walls',
        item_code_hint: 'RDS-MASONRY-14',
        unit: 'm3',
        category: 'Masonry',
        calc_formula_desc: `2 Walls × L × Sloping_Length × Wall_Thk = 2 × ${L} × ${wallSlopeLen.toFixed(3)} × ${tw.toFixed(2)}`,
        calculated_quantity: masonryQty,
        no_of_units: 2,
        length_val: L,
        breadth_val: Number(tw.toFixed(3)),
        height_val: Number(wallSlopeLen.toFixed(3)),
        particulars_template: `Stone masonry 1:4 in side walls (2 Nos, ${L}m)`
      });

      const plasterArea = Number((L * (b + 2 * wallSlopeLen)).toFixed(3));
      items.push({
        id: 'drn-1-pls',
        item_name: '12.5mm cement plaster (1:4) with neat cement punning on internal bed and walls',
        item_code_hint: 'RDS-PLASTER-14',
        unit: 'm2',
        category: 'Plaster/Pointing',
        calc_formula_desc: `L × (Bed_b + 2 × Sloping_Wall_Length) = ${L} × (${b.toFixed(2)} + 2 × ${wallSlopeLen.toFixed(3)})`,
        calculated_quantity: plasterArea,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number((b + 2 * wallSlopeLen).toFixed(3)),
        height_val: '',
        particulars_template: `Internal 12.5mm plaster with punning (${L}m reach)`
      });

      const backfillQty = Math.max(0, Number((excQty - (masonryQty + pccQty + (tsol > 0 ? tsol * bottomW * L : 0) + (L * (b + (b + 2 * z * d)) / 2 * d))).toFixed(3)));
      if (backfillQty > 0) {
        items.push({
          id: 'drn-1-bkf',
          item_name: 'Backfilling behind drain masonry wall with available excavated earth',
          item_code_hint: 'RDS-EARTH-03',
          unit: 'm3',
          category: 'Excavation',
          calc_formula_desc: `Excavation - Structures - Void = ${backfillQty} m³`,
          calculated_quantity: backfillQty,
          no_of_units: 1,
          length_val: L,
          breadth_val: Number((avgExcW - bottomW).toFixed(3)),
          height_val: Number(d.toFixed(3)),
          particulars_template: `Backfilling around drain walls (${L}m reach)`
        });
      }
      break;
    }

    // --------------------------------------------------
    // RECTANGULAR RCC DRAIN WITH PRECAST COVER
    // --------------------------------------------------
    case 'rcc_box_drain': {
      const L = p.reach_length || 150;
      const W = p.clear_width || 0.75;
      const H = p.clear_depth || 0.80;
      const tw = p.wall_thickness || 0.15;
      const tb = p.base_slab_thickness || 0.15;
      const tcov = p.cover_slab_thickness || 0.10;
      const tpcc = p.pcc_bed_thickness || 0.075;
      const tsol = p.soling_thickness || 0.15;
      const rebarDensity = p.rebar_density_kg_m3 || 95;

      const outW = W + 2 * tw;
      const totalH = H + tb + tpcc + tsol;
      const excW = outW + 0.30; // working space
      const excQty = Number((L * excW * totalH).toFixed(3));

      items.push({
        id: 'drn-2-exc',
        item_name: 'Earthwork in excavation for rectangular drain trench',
        item_code_hint: 'RDS-EARTH-01',
        unit: 'm3',
        category: 'Excavation',
        calc_formula_desc: `L × Trench_Width × Total_Depth = ${L} × ${excW.toFixed(2)} × ${totalH.toFixed(2)}`,
        calculated_quantity: excQty,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number(excW.toFixed(3)),
        height_val: Number(totalH.toFixed(3)),
        particulars_template: `Earthwork in excavation for RCC drain (${L}m)`
      });

      if (tsol > 0) {
        items.push({
          id: 'drn-2-sol',
          item_name: 'Providing and laying flat dry stone soling under drain base',
          item_code_hint: 'RDS-SOLING-01',
          unit: 'm2',
          category: 'Soling & PCC',
          calc_formula_desc: `L × Trench_Width = ${L} × ${excW.toFixed(2)}`,
          calculated_quantity: Number((L * excW).toFixed(3)),
          no_of_units: 1,
          length_val: L,
          breadth_val: Number(excW.toFixed(3)),
          height_val: '',
          particulars_template: `Dry stone soling base (${L}m)`
        });
      }

      if (tpcc > 0) {
        items.push({
          id: 'drn-2-pcc',
          item_name: 'PCC (1:3:6) leveling screed bed under drain base slab',
          item_code_hint: 'RDS-CONC-M15',
          unit: 'm3',
          category: 'Soling & PCC',
          calc_formula_desc: `L × Trench_Width × PCC_Thk = ${L} × ${excW.toFixed(2)} × ${tpcc.toFixed(3)}`,
          calculated_quantity: Number((L * excW * tpcc).toFixed(3)),
          no_of_units: 1,
          length_val: L,
          breadth_val: Number(excW.toFixed(3)),
          height_val: Number(tpcc.toFixed(3)),
          particulars_template: `PCC 1:3:6 leveling course (${L}m)`
        });
      }

      // RCC Base Slab
      const rccBaseQty = Number((L * outW * tb).toFixed(3));
      // RCC Walls
      const rccWallQty = Number((2 * L * tw * H).toFixed(3));
      // RCC Precast Cover
      const rccCoverQty = Number((L * outW * tcov).toFixed(3));
      const totalRCC = Number((rccBaseQty + rccWallQty + rccCoverQty).toFixed(3));

      items.push({
        id: 'drn-2-rcc-body',
        item_name: 'RCC (M20 / 1:1.5:3) in drain base raft and side walls',
        item_code_hint: 'RDS-CONC-M20',
        unit: 'm3',
        category: 'Concrete',
        calc_formula_desc: `Base (${rccBaseQty} m³) + 2 Walls (${rccWallQty} m³) = ${Number((rccBaseQty + rccWallQty).toFixed(3))} m³`,
        calculated_quantity: Number((rccBaseQty + rccWallQty).toFixed(3)),
        no_of_units: 1,
        length_val: L,
        breadth_val: Number(outW.toFixed(3)),
        height_val: Number((tb + (2 * tw * H) / outW).toFixed(3)),
        particulars_template: `Cast-in-situ RCC M20 for base & side walls (${L}m)`
      });

      items.push({
        id: 'drn-2-rcc-cover',
        item_name: 'Precast RCC (M20 / M25) cover slabs with lifting hooks',
        item_code_hint: 'RDS-CONC-PRECAST',
        unit: 'm3',
        category: 'Concrete',
        calc_formula_desc: `L × Cover_Width × Cover_Thk = ${L} × ${outW.toFixed(2)} × ${tcov.toFixed(2)}`,
        calculated_quantity: rccCoverQty,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number(outW.toFixed(3)),
        height_val: Number(tcov.toFixed(3)),
        particulars_template: `Precast RCC M20 cover slab panels (${L}m)`
      });

      // Formwork / Shuttering (Inner 2 faces + Outer 2 faces)
      const formworkArea = Number((2 * L * H + 2 * L * (H + tb)).toFixed(3));
      items.push({
        id: 'drn-2-formwork',
        item_name: 'Providing and erecting steel/plywood centering & shuttering for RCC drain',
        item_code_hint: 'RDS-FORMWORK-01',
        unit: 'm2',
        category: 'Formwork',
        calc_formula_desc: `Inner faces (2 × L × H) + Outer faces [2 × L × (H + tb)] = ${formworkArea} m²`,
        calculated_quantity: formworkArea,
        no_of_units: 4,
        length_val: L,
        breadth_val: Number(H.toFixed(3)),
        height_val: '',
        particulars_template: `Centering and shuttering for drain walls (${L}m)`
      });

      // Rebar Steel (Fe500)
      const steelWeightTonnes = Number(((totalRCC * rebarDensity) / 1000).toFixed(3));
      items.push({
        id: 'drn-2-steel',
        item_name: 'Providing, bending, cutting and tying TMT Fe500 reinforcement rebar',
        item_code_hint: 'RDS-REBAR-FE500',
        unit: 'ton',
        category: 'Rebar',
        calc_formula_desc: `Total RCC Vol (${totalRCC} m³) × ${rebarDensity} kg/m³ = ${(totalRCC * rebarDensity).toFixed(1)} kg`,
        calculated_quantity: steelWeightTonnes,
        no_of_units: 1,
        length_val: '',
        breadth_val: '',
        height_val: '',
        particulars_template: `TMT Fe500 reinforcement for RCC drain and covers (${L}m reach)`
      });

      // Internal Plaster
      const plasterArea = Number((L * (W + 2 * H)).toFixed(3));
      items.push({
        id: 'drn-2-plaster',
        item_name: '12.5mm cement plaster 1:3 with neat cement punning on internal waterway',
        item_code_hint: 'RDS-PLASTER-13',
        unit: 'm2',
        category: 'Plaster/Pointing',
        calc_formula_desc: `L × (W + 2 × H) = ${L} × (${W.toFixed(2)} + 2 × ${H.toFixed(2)})`,
        calculated_quantity: plasterArea,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number((W + 2 * H).toFixed(3)),
        height_val: '',
        particulars_template: `Internal surface plaster with punning (${L}m)`
      });
      break;
    }

    // --------------------------------------------------
    // SAUCER / V-SHAPED SURFACE DRAIN
    // --------------------------------------------------
    case 'saucer_drain': {
      const L = p.reach_length || 200;
      const Ws = p.saucer_width || 0.60;
      const tpcc = p.pcc_thickness || 0.15;
      const tsol = p.soling_thickness || 0.15;
      const Hk = p.kerb_height || 0.25;
      const Wk = p.kerb_width || 0.15;

      const totalW = Ws + Wk;
      const totalDepth = tpcc + tsol;
      const excQty = Number((L * totalW * totalDepth).toFixed(3));

      items.push({
        id: 'drn-3-exc',
        item_name: 'Excavation in all types of soil for saucer drain and kerb line',
        item_code_hint: 'RDS-EARTH-01',
        unit: 'm3',
        category: 'Excavation',
        calc_formula_desc: `L × Total_Width × Depth = ${L} × ${totalW.toFixed(2)} × ${totalDepth.toFixed(2)}`,
        calculated_quantity: excQty,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number(totalW.toFixed(3)),
        height_val: Number(totalDepth.toFixed(3)),
        particulars_template: `Excavation for saucer drain (${L}m)`
      });

      if (tsol > 0) {
        items.push({
          id: 'drn-3-sol',
          item_name: 'Flat stone soling under saucer bed and kerb foundation',
          item_code_hint: 'RDS-SOLING-01',
          unit: 'm2',
          category: 'Soling & PCC',
          calc_formula_desc: `L × Total_Width = ${L} × ${totalW.toFixed(2)}`,
          calculated_quantity: Number((L * totalW).toFixed(3)),
          no_of_units: 1,
          length_val: L,
          breadth_val: Number(totalW.toFixed(3)),
          height_val: '',
          particulars_template: `Flat stone soling foundation (${L}m)`
        });
      }

      const pccDishQty = Number((L * Ws * tpcc).toFixed(3));
      items.push({
        id: 'drn-3-pcc',
        item_name: 'PCC (M15 / M20) curved dish concrete in saucer drain',
        item_code_hint: 'RDS-CONC-M15',
        unit: 'm3',
        category: 'Concrete',
        calc_formula_desc: `L × Saucer_Width × PCC_Thk = ${L} × ${Ws.toFixed(2)} × ${tpcc.toFixed(2)}`,
        calculated_quantity: pccDishQty,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number(Ws.toFixed(3)),
        height_val: Number(tpcc.toFixed(3)),
        particulars_template: `PCC concrete dish casting (${L}m)`
      });

      const kerbQty = Number((L * Wk * Hk).toFixed(3));
      items.push({
        id: 'drn-3-kerb',
        item_name: 'Supplying and fixing precast RCC / PCC Kerb stones alongside drain',
        item_code_hint: 'RDS-KERB-01',
        unit: 'm',
        category: 'Miscellaneous',
        calc_formula_desc: `Running length = ${L} m`,
        calculated_quantity: L,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number(Wk.toFixed(3)),
        height_val: Number(Hk.toFixed(3)),
        particulars_template: `Precast kerb stones (${L}m)`
      });
      break;
    }

    // --------------------------------------------------
    // RCC BOX CULVERT (SINGLE CELL)
    // --------------------------------------------------
    case 'box_culvert': {
      const S = p.clear_span || 2.50;
      const H = p.clear_height || 2.00;
      const Lb = p.barrel_length || 8.50;
      const tw = p.wall_thickness || 0.30;
      const tb = p.bottom_slab_thickness || 0.30;
      const ttop = p.top_slab_thickness || 0.30;
      const hc = p.haunch_size || 0.15;
      const tpcc = p.pcc_bed_thickness || 0.10;
      const tsol = p.soling_thickness || 0.20;
      const Lww = p.wingwall_length || 3.50;
      const rebarDensity = p.rebar_density_kg_m3 || 115;

      const outW = S + 2 * tw;
      const totalBoxH = H + tb + ttop;
      const totalFoundH = totalBoxH + tpcc + tsol;
      const excW = outW + 1.20; // with working offset & slope
      const excL = Lb + 2.0;

      // Excavation for barrel + wing walls
      const barrelExc = excL * excW * (H + tb + tpcc + tsol);
      const wingwallExc = 4 * (Lww * 1.5 * 1.5);
      const totalExc = Number((barrelExc + wingwallExc).toFixed(3));

      items.push({
        id: 'clv-1-exc',
        item_name: 'Foundation excavation for RCC Box Culvert barrel, wing walls and cut-offs in all soils',
        item_code_hint: 'RDS-EARTH-02',
        unit: 'm3',
        category: 'Excavation',
        calc_formula_desc: `Barrel (${barrelExc.toFixed(1)} m³) + Wingwalls (${wingwallExc.toFixed(1)} m³) = ${totalExc} m³`,
        calculated_quantity: totalExc,
        no_of_units: 1,
        length_val: Number(excL.toFixed(2)),
        breadth_val: Number(excW.toFixed(2)),
        height_val: Number((H + tb + tpcc + tsol).toFixed(2)),
        particulars_template: `Foundation excavation for RCC Box Culvert (${S}m × ${H}m, L=${Lb}m)`
      });

      // Stone Soling
      const solingArea = Number((Lb * outW + 4 * (Lww * 1.2)).toFixed(3));
      items.push({
        id: 'clv-1-sol',
        item_name: 'Flat boulder/dry stone soling under raft foundation and wing walls',
        item_code_hint: 'RDS-SOLING-01',
        unit: 'm2',
        category: 'Soling & PCC',
        calc_formula_desc: `Raft Area (${(Lb * outW).toFixed(1)} m²) + Wingwalls = ${solingArea} m²`,
        calculated_quantity: solingArea,
        no_of_units: 1,
        length_val: Lb,
        breadth_val: Number(outW.toFixed(3)),
        height_val: '',
        particulars_template: `Dry boulder stone soling base`
      });

      // PCC 1:3:6 Bed
      const pccQty = Number((solingArea * tpcc).toFixed(3));
      items.push({
        id: 'clv-1-pcc',
        item_name: 'PCC (1:3:6) leveling screed concrete course under culvert raft and aprons',
        item_code_hint: 'RDS-CONC-M15',
        unit: 'm3',
        category: 'Soling & PCC',
        calc_formula_desc: `Soling_Area × PCC_Thk = ${solingArea} × ${tpcc.toFixed(2)}`,
        calculated_quantity: pccQty,
        no_of_units: 1,
        length_val: Lb,
        breadth_val: Number(outW.toFixed(3)),
        height_val: Number(tpcc.toFixed(3)),
        particulars_template: `PCC 1:3:6 leveling course`
      });

      // RCC M25 Concrete (Raft, Abutment walls, Top Deck slab, Haunches)
      const bottomRaftVol = Lb * outW * tb;
      const wallsVol = 2 * Lb * tw * H;
      const topDeckVol = Lb * outW * ttop;
      const haunchesVol = 4 * (0.5 * hc * hc) * Lb;
      const wingwallsRCC = 4 * (Lww * 0.35 * (H + tb));
      const totalRCCM25 = Number((bottomRaftVol + wallsVol + topDeckVol + haunchesVol + wingwallsRCC).toFixed(3));

      items.push({
        id: 'clv-1-rcc',
        item_name: 'RCC (M25 / Grade 25) in raft, abutments, top deck slab, haunches and wing walls',
        item_code_hint: 'RDS-CONC-M25',
        unit: 'm3',
        category: 'Concrete',
        calc_formula_desc: `Raft (${bottomRaftVol.toFixed(2)}) + Walls (${wallsVol.toFixed(2)}) + Deck (${topDeckVol.toFixed(2)}) + Haunch + Wingwalls = ${totalRCCM25} m³`,
        calculated_quantity: totalRCCM25,
        no_of_units: 1,
        length_val: Lb,
        breadth_val: Number(outW.toFixed(3)),
        height_val: Number((totalRCCM25 / (Lb * outW)).toFixed(3)),
        particulars_template: `RCC M25 concrete for monolithic Box Culvert`
      });

      // Formwork
      const deckSoffit = Lb * S;
      const wallFaces = 2 * (2 * Lb * H); // Inner 2 faces + Outer 2 faces
      const wingwallFaces = 4 * (2 * Lww * (H + tb));
      const totalFormwork = Number((deckSoffit + wallFaces + wingwallFaces).toFixed(3));

      items.push({
        id: 'clv-1-form',
        item_name: 'Centering and shuttering with steel / plywood props for deck soffit and wall faces',
        item_code_hint: 'RDS-FORMWORK-02',
        unit: 'm2',
        category: 'Formwork',
        calc_formula_desc: `Deck Soffit (${deckSoffit.toFixed(1)}) + Wall Faces (${wallFaces.toFixed(1)}) + Wingwalls = ${totalFormwork} m²`,
        calculated_quantity: totalFormwork,
        no_of_units: 1,
        length_val: Lb,
        breadth_val: Number(S.toFixed(3)),
        height_val: '',
        particulars_template: `Formwork & staging for box culvert`
      });

      // TMT Fe500 Rebar Steel
      const rebarTonnes = Number(((totalRCCM25 * rebarDensity) / 1000).toFixed(3));
      items.push({
        id: 'clv-1-rebar',
        item_name: 'Providing, cutting, bending and tying TMT Fe500 high yield reinforcement steel',
        item_code_hint: 'RDS-REBAR-FE500',
        unit: 'ton',
        category: 'Rebar',
        calc_formula_desc: `Total RCC (${totalRCCM25} m³) × ${rebarDensity} kg/m³ = ${(totalRCCM25 * rebarDensity).toFixed(1)} kg`,
        calculated_quantity: rebarTonnes,
        no_of_units: 1,
        length_val: '',
        breadth_val: '',
        height_val: '',
        particulars_template: `TMT Fe500 reinforcement for ${S}m × ${H}m Box Culvert`
      });

      // Stone Pitching / Apron
      const apronQty = Number((8.0 * (S + 2 * tw) * 0.30).toFixed(3));
      items.push({
        id: 'clv-1-apron',
        item_name: 'Dry stone / boulder pitching in upstream and downstream bed aprons',
        item_code_hint: 'RDS-PITCHING-01',
        unit: 'm3',
        category: 'Masonry',
        calc_formula_desc: `Apron Length (8m) × Span_Out (${outW.toFixed(2)}m) × 0.30m thk = ${apronQty} m³`,
        calculated_quantity: apronQty,
        no_of_units: 2,
        length_val: 4.0,
        breadth_val: Number(outW.toFixed(3)),
        height_val: 0.30,
        particulars_template: `Boulder pitching in U/S & D/S aprons`
      });

      // Filter Media & Weep Holes
      const filterQty = Number((2 * Lb * H * 0.30).toFixed(3));
      items.push({
        id: 'clv-1-filter',
        item_name: 'Providing and laying granular gravel filter media behind abutment walls',
        item_code_hint: 'RDS-FILTER-01',
        unit: 'm3',
        category: 'Miscellaneous',
        calc_formula_desc: `2 Walls × Lb × H × 0.30m thk = ${filterQty} m³`,
        calculated_quantity: filterQty,
        no_of_units: 2,
        length_val: Lb,
        breadth_val: 0.30,
        height_val: Number(H.toFixed(3)),
        particulars_template: `Gravel filter packing behind walls`
      });
      break;
    }

    // --------------------------------------------------
    // RCC SLAB CULVERT ON MASONRY ABUTMENTS
    // --------------------------------------------------
    case 'slab_culvert': {
      const S = p.clear_span || 4.00;
      const Wd = p.deck_width || 8.00;
      const Hab = p.abutment_height || 2.80;
      const wtop = p.abutment_top_width || 0.65;
      const wbot = p.abutment_bottom_width || 1.25;
      const tslab = p.slab_thickness || 0.35;
      const dft = p.footing_depth || 0.60;
      const tpcc = p.pcc_bed_thickness || 0.15;
      const tsol = p.soling_thickness || 0.20;
      const rebarDensity = p.rebar_density_kg_m3 || 120;

      const avgAbutW = (wtop + wbot) / 2;
      const abutFoundW = wbot + 0.60;
      const totalFoundD = Hab + dft + tpcc + tsol;

      // Excavation for 2 abutments + 4 wing walls
      const abutExc = 2 * (Wd + 1.0) * abutFoundW * totalFoundD;
      const wingExc = 4 * (3.5 * 1.5 * 2.0);
      const totalExc = Number((abutExc + wingExc).toFixed(3));

      items.push({
        id: 'clv-2-exc',
        item_name: 'Foundation excavation for stone masonry abutments and wing walls',
        item_code_hint: 'RDS-EARTH-02',
        unit: 'm3',
        category: 'Excavation',
        calc_formula_desc: `2 Abutments (${abutExc.toFixed(1)}) + 4 Wingwalls = ${totalExc} m³`,
        calculated_quantity: totalExc,
        no_of_units: 2,
        length_val: Number((Wd + 1.0).toFixed(2)),
        breadth_val: Number(abutFoundW.toFixed(2)),
        height_val: Number(totalFoundD.toFixed(2)),
        particulars_template: `Excavation for ${S}m span Slab Culvert abutments`
      });

      // Flat Soling & PCC Base
      const solingArea = Number((2 * (Wd + 1.0) * abutFoundW + 4 * (3.5 * 1.5)).toFixed(3));
      items.push({
        id: 'clv-2-sol',
        item_name: 'Flat boulder stone soling in foundation bed',
        item_code_hint: 'RDS-SOLING-01',
        unit: 'm2',
        category: 'Soling & PCC',
        calc_formula_desc: `Foundation Base Area = ${solingArea} m²`,
        calculated_quantity: solingArea,
        no_of_units: 2,
        length_val: Number((Wd + 1.0).toFixed(2)),
        breadth_val: Number(abutFoundW.toFixed(2)),
        height_val: '',
        particulars_template: `Stone soling in abutment base`
      });

      const pccQty = Number((solingArea * tpcc).toFixed(3));
      items.push({
        id: 'clv-2-pcc',
        item_name: 'PCC (1:3:6) leveling foundation bed concrete',
        item_code_hint: 'RDS-CONC-M15',
        unit: 'm3',
        category: 'Soling & PCC',
        calc_formula_desc: `Soling_Area × PCC_Thk = ${solingArea} × ${tpcc.toFixed(2)}`,
        calculated_quantity: pccQty,
        no_of_units: 2,
        length_val: Number((Wd + 1.0).toFixed(2)),
        breadth_val: Number(abutFoundW.toFixed(2)),
        height_val: Number(tpcc.toFixed(3)),
        particulars_template: `PCC 1:3:6 leveling course`
      });

      // Stone Masonry in 1:4 Cement Sand Mortar (Abutments + Wingwalls)
      const abutMasonry = 2 * (Wd * avgAbutW * Hab + Wd * (wbot + 0.3) * dft);
      const wingMasonry = 4 * (3.5 * 0.8 * (Hab + dft) * 0.6);
      const totalMasonry = Number((abutMasonry + wingMasonry).toFixed(3));

      items.push({
        id: 'clv-2-mas',
        item_name: 'Stone masonry in 1:4 cement sand mortar in abutment bodies, footings and wing walls',
        item_code_hint: 'RDS-MASONRY-14',
        unit: 'm3',
        category: 'Masonry',
        calc_formula_desc: `2 Abutments (${abutMasonry.toFixed(1)}) + 4 Wingwalls (${wingMasonry.toFixed(1)}) = ${totalMasonry} m³`,
        calculated_quantity: totalMasonry,
        no_of_units: 2,
        length_val: Wd,
        breadth_val: Number(avgAbutW.toFixed(3)),
        height_val: Number((Hab + dft).toFixed(3)),
        particulars_template: `Stone masonry 1:4 in abutments and wingwalls`
      });

      // RCC M25 in Deck Slab & Kerb Beams
      const totalSpan = S + 2 * (wtop * 0.6); // bearing
      const deckVol = totalSpan * Wd * tslab;
      const kerbVol = 2 * totalSpan * 0.30 * 0.30;
      const totalDeckRCC = Number((deckVol + kerbVol).toFixed(3));

      items.push({
        id: 'clv-2-rcc',
        item_name: 'RCC (M25 / Grade 25) in deck slab, bearing pads and roadside kerb beams',
        item_code_hint: 'RDS-CONC-M25',
        unit: 'm3',
        category: 'Concrete',
        calc_formula_desc: `Deck Slab (${deckVol.toFixed(2)} m³) + Kerb Beams (${kerbVol.toFixed(2)} m³) = ${totalDeckRCC} m³`,
        calculated_quantity: totalDeckRCC,
        no_of_units: 1,
        length_val: Number(totalSpan.toFixed(3)),
        breadth_val: Wd,
        height_val: Number(tslab.toFixed(3)),
        particulars_template: `RCC M25 in deck slab (${S}m clear span)`
      });

      // Centering and Shuttering for Deck Soffit
      const shutterArea = Number((S * Wd + 2 * totalSpan * tslab).toFixed(3));
      items.push({
        id: 'clv-2-form',
        item_name: 'Providing centering, staging and shuttering for RCC deck slab soffit and sides',
        item_code_hint: 'RDS-FORMWORK-02',
        unit: 'm2',
        category: 'Formwork',
        calc_formula_desc: `Soffit Area (Span × Width) + Sides = ${shutterArea} m²`,
        calculated_quantity: shutterArea,
        no_of_units: 1,
        length_val: S,
        breadth_val: Wd,
        height_val: '',
        particulars_template: `Staging & shuttering for slab culvert`
      });

      // TMT Fe500 Rebar
      const steelTonnes = Number(((totalDeckRCC * rebarDensity) / 1000).toFixed(3));
      items.push({
        id: 'clv-2-rebar',
        item_name: 'Providing, cutting, bending and placing TMT Fe500 reinforcement rebar',
        item_code_hint: 'RDS-REBAR-FE500',
        unit: 'ton',
        category: 'Rebar',
        calc_formula_desc: `Deck RCC (${totalDeckRCC} m³) × ${rebarDensity} kg/m³ = ${(totalDeckRCC * rebarDensity).toFixed(1)} kg`,
        calculated_quantity: steelTonnes,
        no_of_units: 1,
        length_val: '',
        breadth_val: '',
        height_val: '',
        particulars_template: `TMT Fe500 steel for ${S}m Slab Culvert`
      });
      break;
    }

    // --------------------------------------------------
    // HUME PIPE CULVERT
    // --------------------------------------------------
    case 'pipe_culvert': {
      const D = p.pipe_diameter_m || 0.90;
      const Np = p.no_of_pipe_rows || 1;
      const Lp = p.pipe_length_m || 9.00;
      const tcrd = p.cradle_pcc_thickness || 0.20;
      const Hhw = p.headwall_height || 1.80;
      const Lhw = p.headwall_length || 4.50;
      const thw = p.headwall_thickness || 0.50;
      const tsol = p.soling_thickness || 0.15;

      const trenchW = Np * (D + 0.30) + 0.60;
      const trenchH = D + tcrd + tsol + 0.60;
      const excTrench = Lp * trenchW * trenchH;
      const excHeadwall = 2 * (Lhw * (thw + 0.40) * (Hhw + 0.60));
      const totalExc = Number((excTrench + excHeadwall).toFixed(3));

      items.push({
        id: 'clv-3-exc',
        item_name: 'Excavation for pipe trench, concrete cradle bed and headwalls in all soils',
        item_code_hint: 'RDS-EARTH-01',
        unit: 'm3',
        category: 'Excavation',
        calc_formula_desc: `Trench (${excTrench.toFixed(1)}) + Headwalls (${excHeadwall.toFixed(1)}) = ${totalExc} m³`,
        calculated_quantity: totalExc,
        no_of_units: 1,
        length_val: Lp,
        breadth_val: Number(trenchW.toFixed(2)),
        height_val: Number(trenchH.toFixed(2)),
        particulars_template: `Excavation for ${Np}-row Ø${(D * 1000).toFixed(0)}mm Hume Pipe Culvert`
      });

      // PCC 1:3:6 Cradle Bedding
      const pccCradle = Number((Lp * trenchW * tcrd).toFixed(3));
      items.push({
        id: 'clv-3-pcc',
        item_name: 'PCC (1:3:6) in pipe cradle foundation and haunch bedding',
        item_code_hint: 'RDS-CONC-M15',
        unit: 'm3',
        category: 'Soling & PCC',
        calc_formula_desc: `Lp × Trench_Width × Cradle_Thk = ${Lp} × ${trenchW.toFixed(2)} × ${tcrd.toFixed(2)}`,
        calculated_quantity: pccCradle,
        no_of_units: 1,
        length_val: Lp,
        breadth_val: Number(trenchW.toFixed(3)),
        height_val: Number(tcrd.toFixed(3)),
        particulars_template: `PCC 1:3:6 concrete cradle bedding`
      });

      // Providing and Laying NP3 / NP4 Reinforced Concrete Hume Pipe
      const totalPipeRunningM = Number((Np * Lp).toFixed(2));
      items.push({
        id: 'clv-3-pipe',
        item_name: `Providing, lowering, laying and jointing NP3/NP4 RCC Hume Pipe (Ø${(D * 1000).toFixed(0)}mm) with cement mortar collar joints`,
        item_code_hint: 'RDS-PIPE-NP3',
        unit: 'm',
        category: 'Miscellaneous',
        calc_formula_desc: `${Np} Rows × ${Lp}m = ${totalPipeRunningM} m`,
        calculated_quantity: totalPipeRunningM,
        no_of_units: Np,
        length_val: Lp,
        breadth_val: Number(D.toFixed(3)),
        height_val: '',
        particulars_template: `NP3 RCC Spun Pipe Ø${(D * 1000).toFixed(0)}mm`
      });

      // Stone Masonry in Headwalls & Wingwalls
      const headwallMasonry = Number((2 * (Lhw * thw * Hhw + Lhw * (thw + 0.3) * 0.60)).toFixed(3));
      items.push({
        id: 'clv-3-mas',
        item_name: 'Stone masonry 1:4 in upstream & downstream headwalls, drop wall and apron cutoffs',
        item_code_hint: 'RDS-MASONRY-14',
        unit: 'm3',
        category: 'Masonry',
        calc_formula_desc: `2 Headwalls × Length × Thk × Height = ${headwallMasonry} m³`,
        calculated_quantity: headwallMasonry,
        no_of_units: 2,
        length_val: Lhw,
        breadth_val: Number(thw.toFixed(3)),
        height_val: Number(Hhw.toFixed(3)),
        particulars_template: `Stone masonry 1:4 headwalls (U/S & D/S)`
      });

      // 12.5mm Plaster on Exposed Masonry Faces
      const plasterArea = Number((2 * (Lhw * Hhw + 2 * (thw * Hhw))).toFixed(3));
      items.push({
        id: 'clv-3-pls',
        item_name: '12.5mm cement plaster 1:4 with neat cement finish on exposed headwall faces',
        item_code_hint: 'RDS-PLASTER-14',
        unit: 'm2',
        category: 'Plaster/Pointing',
        calc_formula_desc: `Exposed faces of 2 headwalls = ${plasterArea} m²`,
        calculated_quantity: plasterArea,
        no_of_units: 2,
        length_val: Lhw,
        breadth_val: Number(Hhw.toFixed(3)),
        height_val: '',
        particulars_template: `Cement plaster 1:4 on headwalls`
      });
      break;
    }

    // --------------------------------------------------
    // FLEXIBLE PAVEMENT ROAD CROSS-SECTION
    // --------------------------------------------------
    case 'road_flexible': {
      const L = p.road_length_m || 500;
      const Wcw = p.carriageway_width || 5.50;
      const Wsh = p.shoulder_width_each || 1.00;
      const tsg = p.subgrade_depth || 0.30;
      const tgsb = p.gsb_thickness || 0.15;
      const twmm = p.wmm_thickness || 0.15;
      const tdbm = p.dbm_thickness || 0.05;
      const tac = p.ac_thickness || 0.03;

      const totalFormW = Wcw + 2 * Wsh;

      // 1. Subgrade preparation
      const subgradeArea = Number((L * totalFormW).toFixed(3));
      items.push({
        id: 'rd-1-sg',
        item_name: 'Subgrade preparation, scarifying, watering and compacting to 95% MDD (Heavy compaction)',
        item_code_hint: 'RDS-PAV-SUBGRADE',
        unit: 'm2',
        category: 'Pavement',
        calc_formula_desc: `L × Formation_Width = ${L} × ${totalFormW.toFixed(2)}`,
        calculated_quantity: subgradeArea,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number(totalFormW.toFixed(3)),
        height_val: Number(tsg.toFixed(3)),
        particulars_template: `Subgrade preparation (${L}m reach, ${totalFormW}m formation width)`
      });

      // 2. Granular Sub-Base (GSB)
      const gsbW = totalFormW + 0.30;
      const gsbQty = Number((L * gsbW * tgsb).toFixed(3));
      items.push({
        id: 'rd-1-gsb',
        item_name: 'Providing, laying and compacting Granular Sub-Base (GSB) with approved graded crushed material',
        item_code_hint: 'RDS-PAV-GSB',
        unit: 'm3',
        category: 'Pavement',
        calc_formula_desc: `L × GSB_Width × GSB_Thk = ${L} × ${gsbW.toFixed(2)} × ${tgsb.toFixed(3)}`,
        calculated_quantity: gsbQty,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number(gsbW.toFixed(3)),
        height_val: Number(tgsb.toFixed(3)),
        particulars_template: `Granular Sub-Base (GSB) course (${tgsb * 100}cm thk)`
      });

      // 3. Wet Mix Macadam (WMM) Base Course
      const wmmW = Wcw + 0.30;
      const wmmQty = Number((L * wmmW * twmm).toFixed(3));
      items.push({
        id: 'rd-1-wmm',
        item_name: 'Providing, laying and compacting Wet Mix Macadam (WMM) base course with mechanical paver',
        item_code_hint: 'RDS-PAV-WMM',
        unit: 'm3',
        category: 'Pavement',
        calc_formula_desc: `L × WMM_Width × WMM_Thk = ${L} × ${wmmW.toFixed(2)} × ${twmm.toFixed(3)}`,
        calculated_quantity: wmmQty,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number(wmmW.toFixed(3)),
        height_val: Number(twmm.toFixed(3)),
        particulars_template: `Wet Mix Macadam (WMM) base course (${twmm * 100}cm thk)`
      });

      // 4. Prime Coat
      const primeArea = Number((L * wmmW).toFixed(3));
      items.push({
        id: 'rd-1-prime',
        item_name: 'Applying Bitumen Prime Coat with slow setting emulsion (SS1 / MC-30) @ 0.8 kg/m²',
        item_code_hint: 'RDS-PAV-PRIME',
        unit: 'm2',
        category: 'Pavement',
        calc_formula_desc: `L × WMM_Width = ${L} × ${wmmW.toFixed(2)}`,
        calculated_quantity: primeArea,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number(wmmW.toFixed(3)),
        height_val: '',
        particulars_template: `Bitumen Prime Coat on WMM surface`
      });

      // 5. Dense Bituminous Macadam (DBM)
      if (tdbm > 0) {
        const dbmQty = Number((L * Wcw * tdbm).toFixed(3));
        items.push({
          id: 'rd-1-dbm',
          item_name: 'Providing and laying Dense Bituminous Macadam (DBM) binder course with sensor paver',
          item_code_hint: 'RDS-PAV-DBM',
          unit: 'm3',
          category: 'Pavement',
          calc_formula_desc: `L × Carriageway_Width × DBM_Thk = ${L} × ${Wcw.toFixed(2)} × ${tdbm.toFixed(3)}`,
          calculated_quantity: dbmQty,
          no_of_units: 1,
          length_val: L,
          breadth_val: Number(Wcw.toFixed(3)),
          height_val: Number(tdbm.toFixed(3)),
          particulars_template: `Dense Bituminous Macadam (DBM) course (${tdbm * 100}mm thk)`
        });

        // Tack coat over DBM
        items.push({
          id: 'rd-1-tack',
          item_name: 'Applying Bitumen Tack Coat with rapid setting emulsion (RS1) @ 0.25 kg/m²',
          item_code_hint: 'RDS-PAV-TACK',
          unit: 'm2',
          category: 'Pavement',
          calc_formula_desc: `L × Carriageway_Width = ${L} × ${Wcw.toFixed(2)}`,
          calculated_quantity: Number((L * Wcw).toFixed(3)),
          no_of_units: 1,
          length_val: L,
          breadth_val: Number(Wcw.toFixed(3)),
          height_val: '',
          particulars_template: `Bitumen Tack Coat on DBM surface`
        });
      }

      // 6. Asphalt Concrete Wearing Course
      const acQty = Number((L * Wcw * tac).toFixed(3));
      items.push({
        id: 'rd-1-ac',
        item_name: 'Providing and laying Asphalt Concrete (AC / Wearing Course / Premix Carpet) with mechanical roller',
        item_code_hint: 'RDS-PAV-AC',
        unit: 'm3',
        category: 'Pavement',
        calc_formula_desc: `L × Carriageway_Width × AC_Thk = ${L} × ${Wcw.toFixed(2)} × ${tac.toFixed(3)}`,
        calculated_quantity: acQty,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number(Wcw.toFixed(3)),
        height_val: Number(tac.toFixed(3)),
        particulars_template: `Asphalt Concrete wearing course (${tac * 100}mm thk)`
      });

      // 7. Shoulders (Gravel/Earthen)
      const shoulderH = twmm + tdbm + tac;
      const shoulderQty = Number((2 * L * Wsh * shoulderH).toFixed(3));
      items.push({
        id: 'rd-1-sh',
        item_name: 'Providing, spreading and compacting hard gravel / selected earth shoulders on both sides',
        item_code_hint: 'RDS-PAV-SHOULDER',
        unit: 'm3',
        category: 'Pavement',
        calc_formula_desc: `2 Sides × L × Shoulder_Width × Shoulder_Depth = 2 × ${L} × ${Wsh.toFixed(2)} × ${shoulderH.toFixed(2)}`,
        calculated_quantity: shoulderQty,
        no_of_units: 2,
        length_val: L,
        breadth_val: Number(Wsh.toFixed(3)),
        height_val: Number(shoulderH.toFixed(3)),
        particulars_template: `Earthen / Gravel Shoulders (2 Sides, ${L}m)`
      });
      break;
    }

    // --------------------------------------------------
    // RIGID PAVEMENT / CONCRETE ROAD SECTION
    // --------------------------------------------------
    case 'road_rigid': {
      const L = p.road_length_m || 300;
      const Wslab = p.slab_width || 6.00;
      const tdlc = p.dlc_thickness || 0.10;
      const tpqc = p.pqc_thickness || 0.20;
      const Hk = p.kerb_height || 0.30;
      const Wk = p.kerb_width || 0.15;
      const jointSpacing = p.joint_spacing_m || 4.00;

      // Subgrade dressing
      items.push({
        id: 'rd-2-sg',
        item_name: 'Subgrade dressing, leveling and compacting to 95% MDD for concrete road',
        item_code_hint: 'RDS-PAV-SUBGRADE',
        unit: 'm2',
        category: 'Pavement',
        calc_formula_desc: `L × Slab_Width = ${L} × ${Wslab.toFixed(2)}`,
        calculated_quantity: Number((L * Wslab).toFixed(3)),
        no_of_units: 1,
        length_val: L,
        breadth_val: Number(Wslab.toFixed(3)),
        height_val: '',
        particulars_template: `Subgrade dressing for rigid pavement (${L}m)`
      });

      // Dry Lean Concrete (DLC M10)
      const dlcW = Wslab + 0.30;
      const dlcQty = Number((L * dlcW * tdlc).toFixed(3));
      items.push({
        id: 'rd-2-dlc',
        item_name: 'Providing and laying Dry Lean Concrete (DLC / M10) subbase course with mechanical vibrator',
        item_code_hint: 'RDS-CONC-DLC',
        unit: 'm3',
        category: 'Concrete',
        calc_formula_desc: `L × DLC_Width × DLC_Thk = ${L} × ${dlcW.toFixed(2)} × ${tdlc.toFixed(3)}`,
        calculated_quantity: dlcQty,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number(dlcW.toFixed(3)),
        height_val: Number(tdlc.toFixed(3)),
        particulars_template: `Dry Lean Concrete (DLC M10) subbase (${tdlc * 100}cm thk)`
      });

      // Separation Polythene Membrane (125 micron)
      const polyArea = Number((L * Wslab).toFixed(3));
      items.push({
        id: 'rd-2-poly',
        item_name: 'Providing and laying separation polythene membrane sheet (125 micron) over DLC',
        item_code_hint: 'RDS-MISC-POLY',
        unit: 'm2',
        category: 'Miscellaneous',
        calc_formula_desc: `L × Slab_Width = ${L} × ${Wslab.toFixed(2)}`,
        calculated_quantity: polyArea,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number(Wslab.toFixed(3)),
        height_val: '',
        particulars_template: `Polythene separation sheet (125 micron)`
      });

      // Pavement Quality Concrete (PQC M30)
      const pqcQty = Number((L * Wslab * tpqc).toFixed(3));
      items.push({
        id: 'rd-2-pqc',
        item_name: 'Providing and laying Pavement Quality Concrete (PQC M30) with needle & screed vibrators, groove cutting and texturing',
        item_code_hint: 'RDS-CONC-PQC',
        unit: 'm3',
        category: 'Concrete',
        calc_formula_desc: `L × Slab_Width × PQC_Thk = ${L} × ${Wslab.toFixed(2)} × ${tpqc.toFixed(3)}`,
        calculated_quantity: pqcQty,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number(Wslab.toFixed(3)),
        height_val: Number(tpqc.toFixed(3)),
        particulars_template: `Pavement Quality Concrete (PQC M30) slab (${tpqc * 100}cm thk)`
      });

      // Joint cutting & sealing
      const noOfJoints = Math.floor(L / jointSpacing);
      const totalJointLen = Number((noOfJoints * Wslab + L).toFixed(2));
      items.push({
        id: 'rd-2-joints',
        item_name: 'Saw cutting contraction/dummy joints (3-4mm wide, 50mm deep) and sealing with polysulphide sealant',
        item_code_hint: 'RDS-MISC-JOINTS',
        unit: 'm',
        category: 'Miscellaneous',
        calc_formula_desc: `${noOfJoints} Transverse Joints × ${Wslab}m + Longitudinal Joint = ${totalJointLen} m`,
        calculated_quantity: totalJointLen,
        no_of_units: noOfJoints,
        length_val: Number(Wslab.toFixed(3)),
        breadth_val: '',
        height_val: '',
        particulars_template: `Saw cutting and sealing contraction joints`
      });

      // Precast Kerb Stones
      items.push({
        id: 'rd-2-kerb',
        item_name: 'Providing and fixing precast concrete Kerb Stones on both sides with cement mortar bedding',
        item_code_hint: 'RDS-KERB-01',
        unit: 'm',
        category: 'Miscellaneous',
        calc_formula_desc: `2 Sides × Road_Length = 2 × ${L} = ${2 * L} m`,
        calculated_quantity: 2 * L,
        no_of_units: 2,
        length_val: L,
        breadth_val: Number(Wk.toFixed(3)),
        height_val: Number(Hk.toFixed(3)),
        particulars_template: `Precast kerb stones (both sides, ${2 * L}m total)`
      });
      break;
    }

    // --------------------------------------------------
    // GRAVITY STONE MASONRY RETAINING WALL
    // --------------------------------------------------
    case 'retaining_wall': {
      const L = p.wall_length_m || 60;
      const H = p.retaining_height_m || 3.50;
      const btop = p.crest_top_width_m || 0.60;
      const sf = p.front_batter_ratio || 0.167; // 1:6
      const sb = p.back_batter_ratio || 0.333; // 1:3
      const Df = p.foundation_depth_m || 1.20;
      const tpcc = p.pcc_bed_thickness || 0.15;
      const tsol = p.soling_thickness || 0.20;
      const spacingW = p.weep_hole_spacing_m || 1.50;
      const tflt = p.filter_media_thickness_m || 0.30;

      const stemBaseW = btop + sf * H + sb * H;
      const foundW = stemBaseW + 0.60; // offset
      const totalDepth = Df + tpcc + tsol;
      const excQty = Number((L * foundW * totalDepth).toFixed(3));

      items.push({
        id: 'ret-1-exc',
        item_name: 'Foundation excavation for retaining wall in hillside soil/ordinary rock',
        item_code_hint: 'RDS-EARTH-02',
        unit: 'm3',
        category: 'Excavation',
        calc_formula_desc: `L × Found_Width × Total_Depth = ${L} × ${foundW.toFixed(2)} × ${totalDepth.toFixed(2)}`,
        calculated_quantity: excQty,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number(foundW.toFixed(3)),
        height_val: Number(totalDepth.toFixed(3)),
        particulars_template: `Foundation excavation for ${H}m high retaining wall (${L}m)`
      });

      if (tsol > 0) {
        items.push({
          id: 'ret-1-sol',
          item_name: 'Flat boulder stone soling in foundation base',
          item_code_hint: 'RDS-SOLING-01',
          unit: 'm2',
          category: 'Soling & PCC',
          calc_formula_desc: `L × Found_Width = ${L} × ${foundW.toFixed(2)}`,
          calculated_quantity: Number((L * foundW).toFixed(3)),
          no_of_units: 1,
          length_val: L,
          breadth_val: Number(foundW.toFixed(3)),
          height_val: '',
          particulars_template: `Stone soling under retaining wall base`
        });
      }

      if (tpcc > 0) {
        items.push({
          id: 'ret-1-pcc',
          item_name: 'PCC (1:3:6) leveling screed foundation course',
          item_code_hint: 'RDS-CONC-M15',
          unit: 'm3',
          category: 'Soling & PCC',
          calc_formula_desc: `L × Found_Width × PCC_Thk = ${L} × ${foundW.toFixed(2)} × ${tpcc.toFixed(2)}`,
          calculated_quantity: Number((L * foundW * tpcc).toFixed(3)),
          no_of_units: 1,
          length_val: L,
          breadth_val: Number(foundW.toFixed(3)),
          height_val: Number(tpcc.toFixed(3)),
          particulars_template: `PCC 1:3:6 leveling course`
        });
      }

      // Stone Masonry 1:4 / 1:6 in Wall Body & Footing
      const stemAvgW = (btop + stemBaseW) / 2;
      const stemVol = L * stemAvgW * H;
      const footingVol = L * (stemBaseW + 0.30) * Df;
      const totalMasonry = Number((stemVol + footingVol).toFixed(3));

      items.push({
        id: 'ret-1-mas',
        item_name: 'Stone masonry in 1:4 (or 1:6) cement sand mortar in retaining wall body and stepped footing',
        item_code_hint: 'RDS-MASONRY-14',
        unit: 'm3',
        category: 'Masonry',
        calc_formula_desc: `Stem (${stemVol.toFixed(1)} m³) + Footing (${footingVol.toFixed(1)} m³) = ${totalMasonry} m³`,
        calculated_quantity: totalMasonry,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number(stemAvgW.toFixed(3)),
        height_val: Number((H + Df).toFixed(3)),
        particulars_template: `Stone masonry 1:4 in wall body (${H}m height, ${L}m length)`
      });

      // 20mm Cement Pointing / Plaster Coping on top
      const exposedFrontArea = Number((L * Math.sqrt(H * H + (sf * H) * (sf * H))).toFixed(3));
      items.push({
        id: 'ret-1-pointing',
        item_name: 'Cement pointing (1:3) on exposed front face and cement plaster (1:4) capping on crest',
        item_code_hint: 'RDS-POINTING-13',
        unit: 'm2',
        category: 'Plaster/Pointing',
        calc_formula_desc: `Exposed Front Face Area = ${exposedFrontArea} m²`,
        calculated_quantity: exposedFrontArea,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number(Math.sqrt(H * H + (sf * H) * (sf * H)).toFixed(3)),
        height_val: '',
        particulars_template: `Cement pointing 1:3 on exposed wall face`
      });

      // Weep holes (PVC 110mm)
      const noOfWeepholes = Math.floor(L / spacingW) * Math.max(1, Math.floor(H / 1.5));
      items.push({
        id: 'ret-1-weep',
        item_name: 'Providing and fixing 110mm Ø PVC weep holes with geotextile wrap at back end',
        item_code_hint: 'RDS-MISC-WEEP',
        unit: 'nos',
        category: 'Miscellaneous',
        calc_formula_desc: `${noOfWeepholes} Weep Holes @ ${spacingW}m c/c grid`,
        calculated_quantity: noOfWeepholes,
        no_of_units: noOfWeepholes,
        length_val: 1.0,
        breadth_val: '',
        height_val: '',
        particulars_template: `110mm PVC weep holes`
      });

      // Gravel Filter Media
      const filterVol = Number((L * H * tflt).toFixed(3));
      items.push({
        id: 'ret-1-filter',
        item_name: 'Providing and placing crushed gravel filter media packing behind retaining wall',
        item_code_hint: 'RDS-FILTER-01',
        unit: 'm3',
        category: 'Miscellaneous',
        calc_formula_desc: `L × H × Filter_Thk = ${L} × ${H.toFixed(2)} × ${tflt.toFixed(2)}`,
        calculated_quantity: filterVol,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number(tflt.toFixed(3)),
        height_val: Number(H.toFixed(3)),
        particulars_template: `Gravel filter media backing (${tflt * 100}cm thk)`
      });
      break;
    }

    // --------------------------------------------------
    // GABION RETAINING WALL
    // --------------------------------------------------
    case 'gabion_wall': {
      const L = p.wall_length_m || 50;
      const Ntiers = p.no_of_tiers || 3;
      const Ht = p.tier_height_m || 1.00;
      const Wbase = p.base_width_m || 3.00;
      const Wtop = p.top_width_m || 1.00;

      const avgW = (Wbase + Wtop) / 2;
      const totalH = Ntiers * Ht;
      const excQty = Number((L * (Wbase + 0.50) * 1.0).toFixed(3));

      items.push({
        id: 'gab-1-exc',
        item_name: 'Excavation for gabion mattress / wall foundation trench',
        item_code_hint: 'RDS-EARTH-01',
        unit: 'm3',
        category: 'Excavation',
        calc_formula_desc: `L × (Base_Width + 0.5) × Depth = ${L} × ${(Wbase + 0.5).toFixed(2)} × 1.0`,
        calculated_quantity: excQty,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number((Wbase + 0.5).toFixed(3)),
        height_val: 1.0,
        particulars_template: `Excavation for gabion wall (${L}m)`
      });

      // Total Gabion Crate Volume
      const gabionVol = Number((L * avgW * totalH).toFixed(3));
      items.push({
        id: 'gab-1-mesh',
        item_name: 'Providing and weaving heavy galvanized (GI) wire mesh gabion crates (10G / 8G, 100x120mm mesh) and filling with boulder stones',
        item_code_hint: 'RDS-GABION-01',
        unit: 'm3',
        category: 'Masonry',
        calc_formula_desc: `L × Avg_Width × Total_Height = ${L} × ${avgW.toFixed(2)} × ${totalH.toFixed(2)}`,
        calculated_quantity: gabionVol,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number(avgW.toFixed(3)),
        height_val: Number(totalH.toFixed(3)),
        particulars_template: `Gabion wire crates filled with stone boulders (${Ntiers} tiers, ${L}m)`
      });

      // Geotextile Non-Woven Filter Membrane
      const geoArea = Number((L * totalH * 1.2).toFixed(3));
      items.push({
        id: 'gab-1-geo',
        item_name: 'Providing and laying non-woven geotextile filter fabric (250 GSM) backing behind gabion wall',
        item_code_hint: 'RDS-GEOTEXTILE-01',
        unit: 'm2',
        category: 'Miscellaneous',
        calc_formula_desc: `L × Total_Height × 1.2 lap = ${geoArea} m²`,
        calculated_quantity: geoArea,
        no_of_units: 1,
        length_val: L,
        breadth_val: Number((totalH * 1.2).toFixed(3)),
        height_val: '',
        particulars_template: `Non-woven geotextile filter fabric (250 GSM)`
      });
      break;
    }

    default: {
      // Fallback custom generic
      const L = p.length || 10;
      const W = p.width || 1;
      const H = p.height || 1;
      items.push({
        id: 'gen-1',
        item_name: `Calculated quantity for ${template.name}`,
        unit: 'm3',
        category: 'Miscellaneous',
        calc_formula_desc: `L × W × H = ${L} × ${W} × ${H}`,
        calculated_quantity: Number((L * W * H).toFixed(3)),
        no_of_units: 1,
        length_val: L,
        breadth_val: W,
        height_val: H,
        particulars_template: `${template.name} quantity`
      });
      break;
    }
  }

  return items;
}
