export type DrawingCategory = 'drain' | 'road' | 'culvert' | 'protection_wall';

export type DrainType =
  | 'rcc_rectangular'
  | 'plum_drain'
  | 'brick_masonry'
  | 'rectangular'
  | 'trapezoidal'
  | 'l_shaped';
export type RoadType = 'flexible_asphalt' | 'rigid_concrete' | 'earthen_gravel';
export type CulvertType = 'box_single' | 'box_twin' | 'pipe_rcc' | 'slab_culvert';
export type ProtectionWallType =
  | 'stone_masonry'
  | 'rcc_l_wall'
  | 'plum_concrete_equal'
  | 'plum_concrete_unequal'
  | 'brick_masonry'
  | 'custom_wall'
  | 'plum_concrete'
  | 'retaining_masonry'
  | 'rcc_cantilever';

export type ParamSourceStatus = 'linked' | 'derived' | 'manual';

export interface ProtectionWallParameters {
  // Common Dimensions & Wall Geometry
  wallTopWidth: number;        // Top width of wall [m] (e.g. 0.60 or 0.25 for RCC)
  wallBottomWidth: number;     // Bottom width of wall [m] (e.g. 1.50 or 0.40 for RCC)
  wallHeight: number;          // Height of wall stem/body [m] (e.g. 2.50)
  wallLength: number;          // Total section length [m] (e.g. 10.0)
  frontBatterRatio: number;    // Front batter slope ratio (e.g. 0.1 for 1:0.1 or 0 for vertical)
  
  // Specific for RCC L / Cantilever / Protection Wall
  rccWallConfigType?: 'higher_cantilever_toe_heel' | 'lower_flush_base' | 'custom'; // Higher height (Toe+Heel) vs Lower height (Flush base / No toe) vs Custom
  baseSlabWidth?: number;      // Total width of RCC/PCC base/bed slab [m] (e.g. 2.20 or 1.50)
  baseSlabThickness?: number;  // Thickness of RCC/PCC base/bed slab [m] (e.g. 0.35 or 0.25)
  toeLength?: number;          // Front toe projection [m] (0 for lower height flush-back wall, e.g. 0.50 for cantilever)
  heelLength?: number;         // Rear heel slab length [m] (e.g. 1.30 or 0.80)
  hasFillet?: boolean;         // User may choose to keep fillet/haunch at joint of vertical wall and bed slab
  filletSize?: number;         // Triangular fillet dimension [m] (e.g. 0.15m = 150mm)
  filletLocation?: 'front' | 'back' | 'both'; // Location of fillet at stem-bed joint
  rebarDensityKgPerM3?: number;// Steel reinforcement density [kg/m³] (e.g. 95)
  rebarDiameter?: number;      // Main rebar dia in mm (e.g. 16)
  rebarSpacing?: number;       // Main rebar spacing in mm (e.g. 150)
  shearKeyDepth?: number;      // Optional shear key depth [m] (e.g. 0.25)
  concreteGrade?: string;      // e.g. 'M20', 'M25', 'PCC (M15/20)', '1:3:6 (40% Plum)'
  bedConcreteGrade?: string;   // Bed slab concrete grade e.g. 'PCC (M15)', 'PCC (M20)', 'RCC (M20)'
  levellingPccGrade?: string;  // Levelling bed concrete grade e.g. 'PCC (M10) 1:3:6'

  // Specific for Stone Masonry Wall
  copingThickness?: number;    // Top PCC/dressed stone coping thickness [m] (e.g. 0.075)
  plasterThickness?: number;   // Plaster/Pointing thickness [m] (e.g. 0.015)
  mortarRatio?: string;        // e.g. '1:4', '1:6'
  foundationStepWidth?: number;// Stepped footing offset [m] (e.g. 0.15)

  // Specific for Brick Masonry Wall
  brickMortarRatio?: string;   // e.g. '1:4', '1:6'
  brickPlinthWidth?: number;   // Width at plinth level [m] (e.g. 0.48)
  brickOffsets?: number;       // Number of stepped footing offsets (e.g. 2)
  plasterHeight?: number;      // Height of cement plaster on wall [m] (Default: wallHeight)
  punningHeight?: number;      // Height of neat cement punning on wall [m] (Default: wallHeight)
  
  // Specific for Custom Protection Wall
  customMaterial?: 'stone_masonry' | 'rcc' | 'plum_concrete' | 'brick_masonry' | 'pcc';
  customStemType?: 'vertical' | 'battered' | 'stepped';
  hasBaseSlab?: boolean;
  hasCoping?: boolean;
  
  // Bed PCC Layer
  pccWidth: number;            // Bed PCC width [m] (e.g. 1.80)
  pccThickness: number;        // Bed PCC thickness [m] (e.g. 0.15)
  
  // Soling Layer
  solingWidth: number;         // Soling width [m] (e.g. 1.80)
  solingThickness: number;     // Soling thickness [m] (e.g. 0.15)
  
  // Foundation Excavation
  excavationWidth: number;     // Excavation pit width [m] (e.g. 2.40)
  excavationDepth: number;     // Excavation pit depth [m] (e.g. 2.80)
  workingSpace: number;        // Extra clearance around foundation [m] (e.g. 0.30)

  // Formwork
  formworkHeight: number;      // Formwork height [m] (derived or manual)
  formworkArea: number;        // Derived formwork area [m²]
  formworkSides: 'both' | 'front_only' | 'back_only';

  // Details
  weepHoles: boolean;          // Weep holes rendered
  backfillSlopeHV: number;     // Backfill soil slope H:V ratio (e.g. 1.5)
  wallAlignmentOnPcc?: 'flush_back' | 'centered' | 'flush_front'; // Placement on Total PCC bed (One Side / Centered)

  // Manual override tracking map
  manualOverrides: Record<string, boolean>; // e.g. { pccWidth: true, excavationDepth: true }
}

export interface DrawingSectionDef {
  id: string;
  sectionCode: string; // e.g. 'SECTION 1-1', 'SECTION 2-2', 'SECTION 3-3'
  title: string;       // e.g. 'Ch. 0+000 to 0+050 (H = 2.50m)'
  chainageStart?: string;
  chainageEnd?: string;
  params: ProtectionWallParameters;
}

export type ComponentCalcFormula =
  | 'excavation_pit'        // L * B * H (Foundation Trench Excavation)
  | 'soling_bed'            // L * B * (H or 1 if sq.m) (Soling Bedding)
  | 'pcc_bed'               // L * B * H (Bed PCC 1:3:6 / M10)
  | 'wall_body_masonry'     // L * ((TopW + BotW)/2) * H (Stone / Brick / Plum Body)
  | 'wall_body_rcc'         // Stem + Base Slab RCC Concrete (M20/25)
  | 'drain_rcc_concrete'    // Drain Bed PCC/RCC + Walls + Slab Cover (optional)
  | 'drain_plum_concrete'   // Drain Plum Concrete Walls (Road & User Diff Width) + Bed
  | 'drain_brick_masonry'   // Drain Brick Masonry Walls (Road & User Diff Width)
  | 'drain_plaster'         // Drain Inner & Exposed Face Plaster
  | 'drain_punning_full_height' // Drain Neat Cement Punning on Invert Bed + Full Wall Heights
  | 'road_excavation'       // Road Roadway Excavation / Earthwork
  | 'road_subgrade'         // Subgrade Preparation / Compaction
  | 'road_gsb'              // Granular Sub-Base (GSB) Layer
  | 'road_wmm_base'         // Wet Mix Macadam (WMM) Base Course
  | 'road_prime_tack'       // Prime / Tack Coat Bituminous Spray
  | 'road_asphalt'          // Asphalt Concrete / DBM Wearing Course
  | 'road_pqc_concrete'     // Pavement Quality Concrete (PQC) M30/M40
  | 'road_dlc'              // Dry Lean Concrete (DLC) M10/M15 Base
  | 'road_gravel_shoulder'  // Hard Shoulders / Gravel Dressing
  | 'road_joint_sealing'    // Concrete Pavement Construction & Expansion Joints
  | 'culvert_excavation'    // Culvert Pit / Trench Excavation
  | 'culvert_bedding_pcc'   // Culvert Leveling Bed PCC
  | 'culvert_box_concrete'  // RCC Box Culvert Concrete (Barrel, Top Slab, Invert, Haunches)
  | 'culvert_pipe_nos'      // NP3 / NP4 RCC Hume Pipe Supply & Laying
  | 'culvert_pipe_bedding'  // Pipe Culvert Cradle / Bedding PCC
  | 'culvert_slab_concrete' // Slab Culvert Deck Slab Concrete
  | 'culvert_masonry_abutment' // Slab Culvert Abutment Stone/Plum Masonry
  | 'culvert_wingwall_masonry' // Slab Culvert Masonry Wing Walls (4 Nos)
  | 'culvert_lcap_concrete' // Slab Culvert L-Cap / Bed-Block Concrete
  | 'culvert_apron_pitching' // Launching Apron Stone Pitching / Gabion Bed Protection
  | 'culvert_scour_wall_concrete' // Cutoff Scour Wall (Drop Wall) Concrete/Masonry
  | 'culvert_waterproofing' // Bituminous Mastic / Waterproofing
  | 'pcc_coping_124'        // L * TopW * CopingThickness (PCC 1:2:4 Coping / Band)
  | 'pcc_coping_m15'        // L * TopW * CopingThickness (PCC M15 Cap / Band)
  | 'plaster_surface'       // L * (H + TopW) (1:4 / 1:6 Plaster)
  | 'punning_surface'       // L * (TopW + 0.3) (Neat Cement Punning)
  | 'pointing_surface'      // L * H * (sidesMult) (1:3 Pointing)
  | 'weep_hole_pvc'         // Nos or Length of PVC weep holes
  | 'reinforcement_steel'   // RCC Volume * Rebar Density kg/m³
  | 'formwork_shuttering'   // L * H * formworkFactor (User chosen factor)
  | 'custom_multiplier';    // Custom formula using factor and custom field

export interface DynamicBOQComponentDef {
  id: string;               // e.g. 'comp_excavation', 'comp_plaster', 'comp_custom_1'
  key: string;              // e.g. 'excavation', 'soling', 'pcc_136', 'brick_masonry', 'pcc_124', 'plaster', 'punning', etc.
  name: string;             // Display name e.g. "PCC (1:2:4)", "Plaster (1:4)", "Reinforcement (Fe500)"
  categoryTag?: string;     // e.g. 'Earthwork', 'Bedding', 'Concrete', 'Masonry', 'Finishing', 'Steel', 'Drainage', 'Custom'
  iconEmoji?: string;       // e.g. '⛏️', '🧱', '📐', '🏰', '🎨', '🪵', '🔩', '💧', '✨'
  mappedItemId?: string;    // BOQ Item ID from project.items
  unit?: string;            // 'm3', 'sq.m', 'm2', 'm', 'kg', 'nos', etc.
  calcFormula: ComponentCalcFormula;
  userFactor?: number;      // e.g. formwork factor (default 2.0 or 1.0 or custom), rebar kg/m3 (default 95), weep hole spacing (1.5), etc.
  isCustom?: boolean;       // whether created by user as custom component
  customFormulaDesc?: string; // explanation of custom calculation
  enabled?: boolean;        // whether this component is included in MB sync/feed
  remarks?: string;
}

export interface ProtectionWallComponentMapping {
  // Legacy / Direct mapped item IDs for backward compatibility
  excavationItemId?: string;
  solingItemId?: string;
  pccItemId?: string;
  wallItemId?: string;
  formworkItemId?: string;

  // Archetype specific mapped items
  rccConcreteItemId?: string;
  rebarItemId?: string;
  weepHoleItemId?: string;
  pcc124ItemId?: string;
  pccM15ItemId?: string;
  plasterItemId?: string;
  punningItemId?: string;
  pointingItemId?: string;
  stoneMasonryItemId?: string;
  brickMasonryItemId?: string;

  // Formwork custom settings (User chosen factor with no derived constraint)
  formworkFactor?: number;
  formworkMode?: 'sides' | 'custom_factor';

  // Dynamic component list for this structure variant (or custom wall)
  dynamicComponents?: DynamicBOQComponentDef[];

  // User custom components added on top of standard archetype
  customComponents?: DynamicBOQComponentDef[];
}

export interface DrainParameters {
  // Core Dimensions
  invertWidth: number;          // B (Internal clear bed width) [m] (e.g. 0.60)
  depth: number;                // H (Internal clear depth) [m] (e.g. 0.75)
  length?: number;              // L (Total section length) [m] (e.g. 10.0 or 50.0)
  
  // Wall Thicknesses (Road Side and User Side can have DIFFERENT widths!)
  wallThickness: number;        // Uniform Wall Thickness [m] (e.g. 0.20)
  roadSideWallThickness?: number;// Road Side Wall Width [m] (e.g. 0.35 or 0.25)
  userSideWallThickness?: number;// User Side (Hill/Inner Side) Wall Width [m] (e.g. 0.25)
  
  // Base Slab & Leveling Layers
  baseThickness: number;        // Bed Slab / Concrete Thickness Tb [m] (e.g. 0.20)
  pccThickness?: number;        // Bed PCC Thickness [m] (e.g. 0.10)
  pccWidth?: number;            // Bed PCC Width [m] (e.g. 1.40)
  pccM10Thickness?: number;     // Bed PCC (M10) 1:3:6 Leveling Thickness [m] (e.g. 0.10)
  pccM10Width?: number;         // Bed PCC (M10) Width [m] (e.g. 1.40)
  pccOffset?: number;           // PCC/Soling projection offset [m] (e.g. 0.075)
  solingThickness?: number;     // Stone / Brick Soling Thickness [m] (e.g. 0.15)
  solingWidth?: number;         // Soling Width [m] (e.g. 1.40)
  sectionLength?: number;       // Running length of drain section [m] (e.g. 10.0)
  
  // Foundation Trench Excavation
  excavationWidth?: number;     // Excavation Trench Pit Width [m] (e.g. 1.80)
  excavationDepth?: number;     // Excavation Trench Depth [m] (e.g. 1.20)
  workingSpace?: number;        // Working space clearance [m] (e.g. 0.15)

  // 1. RCC Rectangular Drain: (Bed PCC/RCC + Wall + Slab Cover (may or maynot have))
  hasCoverSlab?: boolean;       // Slab Cover toggle (may or may not have)
  coverSlabThickness?: number;  // Slab Cover Thickness [m] (e.g. 0.10)
  coverSlabWidth?: number;      // Slab Cover Width [m] (e.g. 1.10)
  rebarDensityKgPerM3?: number; // Rebar Density [kg/m³] (e.g. 85)
  concreteGrade?: string;       // Concrete Grade e.g. 'M20', 'M25'

  // 2. Plum Drain: Plum(Wall(Road Side and User Side Different Width)) + Formwork
  plumBoulderPercent?: number;  // Plum Boulder % (e.g. 40%)

  // 3. Brick Masonry Drain: Brick Masonary Wall(Road Side and User Side Different Width) + Plaster + Punning(Full Height) + Top PCC
  topPccThickness?: number;     // Top PCC Coping Band Thickness [m] (e.g. 0.075)
  topPccWidth?: number;         // Top PCC Coping Width [m] (e.g. 0.25)
  plasterThickness: number;     // Cement Sand Plaster Thickness [m] (e.g. 0.0125)
  plasterHeight?: number;       // Height of cement plaster on inner drain walls [m] (Default: depth)
  hasPunningFullHeight?: boolean;// Punning (Full Height: Bed + Both Walls inside drain)
  punningHeight?: number;       // Height of neat cement punning on drain walls [m] (Default: depth)
  punningThickness?: number;    // Neat Cement Punning Thickness [m] (e.g. 0.003)
  brickMortarRatio?: string;    // Brick Mortar Ratio (e.g. '1:4', '1:6')

  // Formwork
  formworkHeight?: number;      // Formwork Height [m]
  formworkArea?: number;        // Formwork Area [m²]
  formworkSides?: 'both' | 'inner_only' | 'outer_only';
  formworkFactor?: number;      // Formwork multiplier factor (e.g. 2.0 or 4.0)

  // Hydraulics & Legacy Fields
  topWidth: number;             // B1 (Top Width for trapezoidal) [m]
  sideSlopeHV: number;          // H:1 side slope ratio for trapezoidal (e.g. 1, 1.5, 2)
  freeboard: number;            // F (Freeboard depth) [m]
  waterDepth: number;           // Dw (Water depth) [m]
  material: 'concrete' | 'stone_masonry' | 'brick' | 'plum_concrete' | 'rcc';
  
  manualOverrides?: Record<string, boolean>;
}

export interface RoadParameters {
  carriagewayWidth: number;   // Wc [m]
  shoulderLeft: number;       // Ws_L [m]
  shoulderRight: number;      // Ws_R [m]
  camberPercent: number;       // Camber slope % (e.g. 2.5)
  camberType: 'crown' | 'crossfall'; // Two-sided crown vs Single-sided crossfall
  asphaltThickness: number;   // Wearing course [m]
  baseThickness: number;      // Crushed stone base course [m]
  subBaseThickness: number;   // Granular sub-base [m]
  subgradeThickness: number;  // Prepared subgrade [m]
  sideSlopeHV: number;        // Embankment slope ratio (e.g. 1.5)
  shoulderMaterial: 'paved' | 'earthen' | 'gravel';
  sideDrainWidth: number;     // Side drain width [m]
  sideDrainDepth: number;     // Side drain depth [m]
}

export interface CulvertParameters {
  clearSpan: number;          // S (Clear Span) [m]
  clearHeight: number;        // H (Clear Height) [m]
  topSlabThickness: number;   // Tt (Top Slab) [m]
  bottomSlabThickness: number;// Tb (Bottom Slab) [m]
  wallThickness: number;      // Tw (Outer Wall) [m]
  barrelLength: number;       // Lb (Barrel Length / Carriageway Width) [m]
  fillHeight: number;         // Hf (Fill over top slab / pipe) [m]
  pipeDia: number;            // Pipe Internal Diameter [m]
  pipeCount: number;          // Number of pipes (1, 2, 3)
  pipeWallThickness: number;  // Pipe wall thickness [m]
  pipeSpacing: number;        // Spacing between pipes [m]
  beddingDepth: number;       // Bedding concrete depth [m]
  abutmentHeight: number;     // Abutment wall height for slab culvert [m]
  wingWallLength: number;     // Wing wall length [m]
  waterLevel: number;         // Water level inside barrel/pipe [m]

  // --- Specific for Slab Culvert with Masonry Abutment, L-Cap, RCC Deck Slab & Wing Walls ---
  abutmentTopWidth?: number;       // Top width of masonry abutment [m] (e.g. 0.70)
  abutmentBottomWidth?: number;    // Bottom width of masonry abutment [m] (e.g. 1.20)
  abutmentBatterRatio?: number;    // Front face batter (e.g. 0.1 for 1:10)
  abutmentMasonryType?: 'stone_masonry' | 'brick_masonry' | 'plum_concrete';

  // L-Cap (Bed-Cap / Bearing Dirt Wall Cap)
  hasLCap?: boolean;               // L-Cap present (default: true)
  lCapThickness?: number;          // Base seat / bearing pad thickness [m] (e.g. 0.20)
  lCapWidth?: number;              // Total bed-cap width [m] (e.g. 0.70)
  lCapDirtWallHeight?: number;     // Upstand dirt/ballast wall height forming L-shape [m] (e.g. 0.35)
  lCapDirtWallThickness?: number;  // Dirt wall thickness [m] (e.g. 0.20)
  bearingLength?: number;          // Deck slab bearing seat length [m] (e.g. 0.35)

  // RCC Deck Slab & Wearing Course
  wearingCoatThickness?: number;   // Asphalt / Concrete wearing surface [m] (e.g. 0.05)
  kerbWidth?: number;              // RCC kerb width on slab edges [m] (e.g. 0.30)
  kerbHeight?: number;             // RCC kerb height [m] (e.g. 0.30)
  deckRebarDensityKgPerM3?: number;// Steel density (kg/m3) (e.g. 105)

  // Masonry Wing Walls
  hasWingWalls?: boolean;          // Wing walls present (default: true)
  wingWallCount?: number;          // Wing wall count (default: 4)
  wingWallType?: 'flared_45' | 'straight_return' | 'flared_30';
  wingWallStartHeight?: number;    // Wing wall height at abutment end [m] (e.g. 2.40)
  wingWallEndHeight?: number;      // Splayed end height [m] (e.g. 0.90)
  wingWallTopWidth?: number;       // Wing wall top width [m] (e.g. 0.50)
  wingWallBottomWidth?: number;    // Wing wall bottom width [m] (e.g. 1.00)
  wingWallCopingThickness?: number;// Top PCC coping on wing wall [m] (e.g. 0.075)
  weepHoleSpacing?: number;        // Spacing of PVC weep holes [m] (e.g. 1.5)

  // Foundation & Apron
  foundationPccThickness?: number; // Bed PCC 1:3:6 under abutments & wing walls [m] (e.g. 0.15)
  foundationPccOffset?: number;    // PCC lateral offset [m] (e.g. 0.15)
  foundationSolingThickness?: number; // Soling under abutments & wing walls [m] (e.g. 0.15)
  foundationDepth?: number;        // Embedment depth below bed [m] (e.g. 1.20)
  apronThickness?: number;         // Bed pitching / concrete apron thickness [m] (e.g. 0.15)
  curtainWallDepth?: number;       // Cut-off curtain wall depth [m] (e.g. 0.80)

  // --- Specific for RCC Box Culvert (Single & Twin Cell) ---
  // Fillet / Haunch Options
  hasFillet?: boolean;             // Fillet / Haunch present (default: true)
  filletSize?: number;             // Fillet size [m] (e.g. 0.15, 0.20, 0.25, 0.30 m)
  hasFilletBar?: boolean;          // Fillet / Corner diagonal rebar present (default: true)
  filletBarDia?: number;           // Fillet rebar diameter in mm (e.g. 10, 12, 16 mm)
  filletBarSpacing?: number;       // Fillet rebar spacing in mm (e.g. 150 mm)
  pierThickness?: number;          // Center pier thickness for twin box (e.g. 0.30 m)

  // Launching Apron (Bed Protection Pitching / Flexible Gabion Apron)
  hasLaunchingApron?: boolean;     // Launching apron present (default: true)
  launchingApronOption?: 'both' | 'upstream' | 'downstream' | 'none'; // U/s, D/s, or Both (default: 'both')
  launchingApronLength?: number;   // Length of launching apron [m] (e.g. 3.0 m)
  launchingApronThickness?: number;// Thickness of launching apron [m] (e.g. 0.30 m)
  launchingApronMaterial?: 'stone_pitching' | 'gabion_mattress' | 'concrete_blocks'; // Material
  launchingApronType?: 'stone_pitching' | 'gabion_mattress' | 'concrete_block';

  // Scour Wall (Curtain Wall / Drop Cutoff Wall)
  hasScourWall?: boolean;          // Scour wall present (default: true)
  scourWallLocation?: 'both' | 'upstream' | 'downstream' | 'none'; // U/s, D/s, or Both (default: 'both')
  scourWallDepth?: number;         // Depth of scour wall below bed [m] (e.g. 1.20 m)
  scourWallThickness?: number;     // Thickness of scour wall [m] (e.g. 0.30 m)
  scourWallType?: 'rcc' | 'plum_concrete' | 'stone_masonry'; // Material type
  scourWallPccDepth?: number;      // PCC leveling under scour wall [m] (e.g. 0.15 m)

  // Active Interactive View Mode
  culvertViewMode?: 'cross_section' | 'longitudinal' | 'plan_wingwalls';
  boxViewMode?: 'cross_section' | 'longitudinal' | 'plan_apron' | 'rebar_detail';
}

export interface ParameterChangeLog {
  id: string;
  timestamp: string;
  itemId: string;
  itemCode: string;
  itemDescription: string;
  parameterName: string;
  oldValue: number | string;
  newValue: number | string;
}

export interface DrawingParameterMapping {
  drawingParam: string;
  boqField: 'length' | 'breadth' | 'height' | 'custom_wall_thickness' | 'custom_base_thickness';
  label: string;
}

export interface UploadedDrawingRecord {
  id: string;
  fileName: string;
  fileFormat: 'DWF' | 'DXF' | 'PDF' | 'DWG' | 'IMAGE' | 'OTHER';
  fileSize: string;
  uploadDate: string;
  associatedCategory: DrawingCategory;
  associatedType: string;
  structureName: string;
  drawingCode: string;
  dataUrl?: string;
  textContent?: string;
  description?: string;
  tags: string[];
}
