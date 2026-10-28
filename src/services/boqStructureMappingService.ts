import { BOQItem, ValuationMBRow } from '../types';
import {
  DrawingSectionDef,
  ProtectionWallParameters,
  ProtectionWallComponentMapping,
  DynamicBOQComponentDef,
  ComponentCalcFormula
} from '../components/drawings/types';

/**
 * Returns default dynamic BOQ components according to the Nature of Structure / Structure Variant
 */
export function getDefaultComponentsForStructureVariant(
  variantKey: string,
  existingMapping?: ProtectionWallComponentMapping
): DynamicBOQComponentDef[] {
  const normKey = variantKey || 'rcc_rectangular';

  // 1. R.C.C. RECTANGULAR DRAIN
  // (Excavation, Soling, PCC(M10), PCC(M20)(Bed P.C.C. + Wall + Slab Cover (may or maynot have)), Formwork, Reinforcement)
  if (normKey === 'rcc_rectangular' || normKey === 'drain_rcc_rectangular' || normKey === 'rcc_drain') {
    const customFormFactor = typeof existingMapping?.formworkFactor === 'number' ? existingMapping.formworkFactor : 2.0;

    return [
      {
        id: 'comp_drain_excavation',
        key: 'excavation',
        name: 'Excavation in Foundation Trench',
        categoryTag: 'Earthwork',
        iconEmoji: '⛏️',
        unit: 'm3',
        calcFormula: 'excavation_pit',
        mappedItemId: existingMapping?.excavationItemId || '',
        enabled: true,
        remarks: 'Trench excavation for RCC drain: L × B × H'
      },
      {
        id: 'comp_drain_soling',
        key: 'soling',
        name: 'Stone / Brick Soling Bedding',
        categoryTag: 'Bedding',
        iconEmoji: '🧱',
        unit: 'm3',
        calcFormula: 'soling_bed',
        mappedItemId: existingMapping?.solingItemId || '',
        enabled: true,
        remarks: 'Bedding soling under PCC: L × B × H'
      },
      {
        id: 'comp_drain_pcc_m10',
        key: 'pcc_m10',
        name: 'Bed PCC (M10) 1:3:6 Leveling Concrete',
        categoryTag: 'Bedding',
        iconEmoji: '📐',
        unit: 'm3',
        calcFormula: 'pcc_bed',
        mappedItemId: existingMapping?.pccItemId || '',
        enabled: true,
        remarks: 'Lean leveling PCC M10 bed: L × B × H'
      },
      {
        id: 'comp_drain_rcc_concrete',
        key: 'rcc_m20_concrete',
        name: 'PCC/RCC (M20) Concrete (Bed + Walls + Cover Slab)',
        categoryTag: 'Concrete',
        iconEmoji: '🏰',
        unit: 'm3',
        calcFormula: 'drain_rcc_concrete',
        mappedItemId: existingMapping?.rccConcreteItemId || existingMapping?.wallItemId || '',
        enabled: true,
        remarks: 'RCC (M20) Bed Slab + 2 Walls + Optional Top Cover Slab'
      },
      {
        id: 'comp_drain_reinforcement',
        key: 'reinforcement',
        name: 'Reinforcement Steel (TMT Fe500)',
        categoryTag: 'Steel',
        iconEmoji: '🔩',
        unit: 'kg',
        calcFormula: 'reinforcement_steel',
        userFactor: 85,
        mappedItemId: existingMapping?.rebarItemId || '',
        enabled: true,
        remarks: 'Steel rebar: Total RCC Volume × Rebar Density (85 kg/m³)'
      },
      {
        id: 'comp_drain_formwork',
        key: 'formwork',
        name: 'Formwork / Shuttering (User Factor)',
        categoryTag: 'Formwork',
        iconEmoji: '🪵',
        unit: 'sq.m',
        calcFormula: 'formwork_shuttering',
        userFactor: customFormFactor,
        mappedItemId: existingMapping?.formworkItemId || '',
        enabled: true,
        remarks: `Drain walls shuttering: L × H × User Factor (${customFormFactor}x)`
      }
    ];
  }

  // 2. PLUM DRAIN
  // (Excavation, Soling, PCC(M10), Plum(Wall(Road Side and User Side Different Width)), Formwork)
  if (normKey === 'plum_drain' || normKey === 'drain_plum') {
    const customFormFactor = typeof existingMapping?.formworkFactor === 'number' ? existingMapping.formworkFactor : 2.0;

    return [
      {
        id: 'comp_drain_excavation',
        key: 'excavation',
        name: 'Excavation in Foundation Trench',
        categoryTag: 'Earthwork',
        iconEmoji: '⛏️',
        unit: 'm3',
        calcFormula: 'excavation_pit',
        mappedItemId: existingMapping?.excavationItemId || '',
        enabled: true,
        remarks: 'Trench excavation for plum drain: L × B × H'
      },
      {
        id: 'comp_drain_soling',
        key: 'soling',
        name: 'Stone Soling Bedding Layer',
        categoryTag: 'Bedding',
        iconEmoji: '🧱',
        unit: 'm3',
        calcFormula: 'soling_bed',
        mappedItemId: existingMapping?.solingItemId || '',
        enabled: true,
        remarks: 'Stone soling bedding: L × B × H'
      },
      {
        id: 'comp_drain_pcc_m10',
        key: 'pcc_m10',
        name: 'Bed PCC (M10) 1:3:6 Leveling Concrete',
        categoryTag: 'Bedding',
        iconEmoji: '📐',
        unit: 'm3',
        calcFormula: 'pcc_bed',
        mappedItemId: existingMapping?.pccItemId || '',
        enabled: true,
        remarks: 'Base PCC M10 leveling bed: L × B × H'
      },
      {
        id: 'comp_drain_plum_concrete',
        key: 'plum_concrete',
        name: 'Plum Concrete (1:3:6 + 40% Plum) Walls & Bed',
        categoryTag: 'Concrete',
        iconEmoji: '🏰',
        unit: 'm3',
        calcFormula: 'drain_plum_concrete',
        mappedItemId: existingMapping?.wallItemId || '',
        enabled: true,
        remarks: 'Plum concrete walls (Road Side & User Side different width) + bed'
      },
      {
        id: 'comp_drain_formwork',
        key: 'formwork',
        name: 'Formwork / Shuttering (User Factor)',
        categoryTag: 'Formwork',
        iconEmoji: '🪵',
        unit: 'sq.m',
        calcFormula: 'formwork_shuttering',
        userFactor: customFormFactor,
        mappedItemId: existingMapping?.formworkItemId || '',
        enabled: true,
        remarks: `Plum drain shuttering: L × H × User Factor (${customFormFactor}x)`
      }
    ];
  }

  // 3. BRICK MASONRY DRAIN / BRICK MASONRY WALL
  // (Excavation, Soling, PCC(M10), Brick Masonary Wall(Road Side and User Side Different Width), Plaster, Punning(Full Height) + Top PCC)
  if (normKey === 'brick_masonry' || normKey === 'drain_brick_masonry') {
    return [
      {
        id: 'comp_excavation',
        key: 'excavation',
        name: 'Excavation in Foundation Trench',
        categoryTag: 'Earthwork',
        iconEmoji: '⛏️',
        unit: 'm3',
        calcFormula: 'excavation_pit',
        mappedItemId: existingMapping?.excavationItemId || '',
        enabled: true,
        remarks: 'Foundation trench excavation: L × B × H'
      },
      {
        id: 'comp_soling',
        key: 'soling',
        name: 'Flat Brick / Stone Soling Bedding',
        categoryTag: 'Bedding',
        iconEmoji: '🧱',
        unit: 'm3',
        calcFormula: 'soling_bed',
        mappedItemId: existingMapping?.solingItemId || '',
        enabled: true,
        remarks: 'Soling layer under bed PCC: L × B × H'
      },
      {
        id: 'comp_pcc_136',
        key: 'pcc_136',
        name: 'Bed PCC (M10) 1:3:6 Leveling Concrete',
        categoryTag: 'Bedding',
        iconEmoji: '📐',
        unit: 'm3',
        calcFormula: 'pcc_bed',
        mappedItemId: existingMapping?.pccItemId || '',
        enabled: true,
        remarks: 'Lean concrete 1:3:6 / M10 bed: L × B × H'
      },
      {
        id: 'comp_brick_masonry',
        key: 'brick_masonry',
        name: 'Brick Masonry Wall Body (Road & User Side Diff Width)',
        categoryTag: 'Masonry',
        iconEmoji: '🧱',
        unit: 'm3',
        calcFormula: 'drain_brick_masonry',
        mappedItemId: existingMapping?.brickMasonryItemId || existingMapping?.wallItemId || '',
        enabled: true,
        remarks: 'Brick masonry wall (Road Side width + User Side width) × H × L'
      },
      {
        id: 'comp_plaster',
        key: 'plaster',
        name: 'Cement Sand Plaster (1:4 / 1:6)',
        categoryTag: 'Finishing',
        iconEmoji: '🎨',
        unit: 'sq.m',
        calcFormula: 'drain_plaster',
        userFactor: 1.0,
        mappedItemId: existingMapping?.plasterItemId || '',
        enabled: true,
        remarks: 'Plaster on exposed outer/inner faces: L × (2H + TopW)'
      },
      {
        id: 'comp_punning',
        key: 'punning',
        name: 'Neat Cement Punning (Full Height Inside Drain)',
        categoryTag: 'Finishing',
        iconEmoji: '✨',
        unit: 'sq.m',
        calcFormula: 'drain_punning_full_height',
        userFactor: 1.0,
        mappedItemId: existingMapping?.punningItemId || '',
        enabled: true,
        remarks: 'Neat cement punning covering full invert bed + full height of both inner walls: L × (InvertB + 2H)'
      },
      {
        id: 'comp_pcc_124',
        key: 'pcc_124',
        name: 'Top PCC (1:2:4 / M15) Coping Band / Cap',
        categoryTag: 'Concrete',
        iconEmoji: '📐',
        unit: 'm3',
        calcFormula: 'pcc_coping_124',
        userFactor: 0.075,
        mappedItemId: existingMapping?.pcc124ItemId || '',
        enabled: true,
        remarks: 'Top PCC coping band: L × (Tw_road + Tw_user) × Thickness (0.075m)'
      }
    ];
  }

  // 2. STONE MASONRY WALL
  // Excavation, Soling, PCC(1:3:6), Stone Masonary, PCC(M15), Weep Hole, Pointing
  if (normKey === 'stone_masonry' || normKey === 'retaining_masonry') {
    return [
      {
        id: 'comp_excavation',
        key: 'excavation',
        name: 'Excavation in Foundation Trench',
        categoryTag: 'Earthwork',
        iconEmoji: '⛏️',
        unit: 'm3',
        calcFormula: 'excavation_pit',
        mappedItemId: existingMapping?.excavationItemId || '',
        enabled: true,
        remarks: 'Foundation excavation pit: L × B × H'
      },
      {
        id: 'comp_soling',
        key: 'soling',
        name: 'Stone Soling Bedding Layer',
        categoryTag: 'Bedding',
        iconEmoji: '🧱',
        unit: 'm3',
        calcFormula: 'soling_bed',
        mappedItemId: existingMapping?.solingItemId || '',
        enabled: true,
        remarks: 'Dry stone soling bedding: L × B × H'
      },
      {
        id: 'comp_pcc_136',
        key: 'pcc_136',
        name: 'Bed PCC (1:3:6) Leveling Concrete',
        categoryTag: 'Bedding',
        iconEmoji: '📐',
        unit: 'm3',
        calcFormula: 'pcc_bed',
        mappedItemId: existingMapping?.pccItemId || '',
        enabled: true,
        remarks: 'Base PCC concrete 1:3:6: L × B × H'
      },
      {
        id: 'comp_stone_masonry',
        key: 'stone_masonry',
        name: 'Stone Masonry Wall Body (1:4 / 1:6)',
        categoryTag: 'Masonry',
        iconEmoji: '🏰',
        unit: 'm3',
        calcFormula: 'wall_body_masonry',
        mappedItemId: existingMapping?.stoneMasonryItemId || existingMapping?.wallItemId || '',
        enabled: true,
        remarks: 'Random rubble stone masonry: L × ((TopW + BotW)/2) × H'
      },
      {
        id: 'comp_pcc_m15',
        key: 'pcc_m15',
        name: 'PCC (M15) Coping Band / Top Cap',
        categoryTag: 'Concrete',
        iconEmoji: '📐',
        unit: 'm3',
        calcFormula: 'pcc_coping_m15',
        userFactor: 0.10, // 100mm coping
        mappedItemId: existingMapping?.pccM15ItemId || '',
        enabled: true,
        remarks: 'PCC M15 coping band: L × TopW × Thickness (0.10m)'
      },
      {
        id: 'comp_weep_hole',
        key: 'weep_hole',
        name: 'Weep Holes (75mm/100mm PVC with Filter)',
        categoryTag: 'Drainage',
        iconEmoji: '💧',
        unit: 'm',
        calcFormula: 'weep_hole_pvc',
        userFactor: 1.5, // 1.5m c/c spacing
        mappedItemId: existingMapping?.weepHoleItemId || '',
        enabled: true,
        remarks: 'PVC weep holes @ 1.5m c/c staggered: Pipe length/Nos'
      },
      {
        id: 'comp_pointing',
        key: 'pointing',
        name: 'Pointing (1:3 Cement Sand Mortar)',
        categoryTag: 'Finishing',
        iconEmoji: '🎨',
        unit: 'sq.m',
        calcFormula: 'pointing_surface',
        userFactor: 1.0,
        mappedItemId: existingMapping?.pointingItemId || '',
        enabled: true,
        remarks: 'Raised/Flush pointing on exposed masonry face: L × H'
      }
    ];
  }

  // 3. R.C.C. L PROTECTION WALL (Bed PCC + Wall Component + Reinforcement + Formwork + Weep Hole)
  // Excavation, Soling, PCC(1:3:6), PCC(M20/25), Reinforcement, Formwork (User choose formwork Factor), WeepHole
  if (normKey === 'rcc_l_wall' || normKey === 'rcc_cantilever') {
    const customFormworkFactor = typeof existingMapping?.formworkFactor === 'number' ? existingMapping.formworkFactor : 2.0;

    return [
      {
        id: 'comp_excavation',
        key: 'excavation',
        name: 'Excavation in Foundation Trench',
        categoryTag: 'Earthwork',
        iconEmoji: '⛏️',
        unit: 'm3',
        calcFormula: 'excavation_pit',
        mappedItemId: existingMapping?.excavationItemId || '',
        enabled: true,
        remarks: 'Trench excavation for L-wall base slab & toe: L × B × H'
      },
      {
        id: 'comp_soling',
        key: 'soling',
        name: 'Stone Soling / Gravel Bedding',
        categoryTag: 'Bedding',
        iconEmoji: '🧱',
        unit: 'm3',
        calcFormula: 'soling_bed',
        mappedItemId: existingMapping?.solingItemId || '',
        enabled: true,
        remarks: 'Bedding soling layer: L × B × H'
      },
      {
        id: 'comp_pcc_136',
        key: 'pcc_136',
        name: 'Bed PCC (1:3:6) Leveling Concrete',
        categoryTag: 'Bedding',
        iconEmoji: '📐',
        unit: 'm3',
        calcFormula: 'pcc_bed',
        mappedItemId: existingMapping?.pccItemId || '',
        enabled: true,
        remarks: 'Base leveling PCC 1:3:6 (0.10m thick): L × B × H'
      },
      {
        id: 'comp_rcc_m20_25',
        key: 'rcc_m20_25',
        name: 'PCC / RCC (M20/25) Structural Concrete',
        categoryTag: 'Concrete',
        iconEmoji: '🏰',
        unit: 'm3',
        calcFormula: 'wall_body_rcc',
        mappedItemId: existingMapping?.rccConcreteItemId || existingMapping?.wallItemId || '',
        enabled: true,
        remarks: 'RCC stem + base slab concrete: Stem Vol + Base Slab Vol'
      },
      {
        id: 'comp_reinforcement',
        key: 'reinforcement',
        name: 'Reinforcement Steel (TMT Fe500)',
        categoryTag: 'Steel',
        iconEmoji: '🔩',
        unit: 'kg',
        calcFormula: 'reinforcement_steel',
        userFactor: 95, // 95 kg/m3 steel density
        mappedItemId: existingMapping?.rebarItemId || '',
        enabled: true,
        remarks: 'TMT rebar: RCC Concrete Vol × Steel Density (95 kg/m³)'
      },
      {
        id: 'comp_formwork',
        key: 'formwork',
        name: 'Formwork / Shuttering (User Factor)',
        categoryTag: 'Formwork',
        iconEmoji: '🪵',
        unit: 'sq.m',
        calcFormula: 'formwork_shuttering',
        userFactor: customFormworkFactor, // User may choose formwork Factor (No derived Condition)
        mappedItemId: existingMapping?.formworkItemId || '',
        enabled: true,
        remarks: `Wall shuttering: L × H × User Factor (${customFormworkFactor}x)`
      },
      {
        id: 'comp_weep_hole',
        key: 'weep_hole',
        name: 'Weep Holes (75mm/100mm PVC with Filter)',
        categoryTag: 'Drainage',
        iconEmoji: '💧',
        unit: 'm',
        calcFormula: 'weep_hole_pvc',
        userFactor: 1.5,
        mappedItemId: existingMapping?.weepHoleItemId || '',
        enabled: true,
        remarks: 'PVC weep holes @ 1.5m c/c staggered'
      }
    ];
  }

  // 4. PLUM CONCRETE WALLS (Equal Width Vertical / Unequal Width Battered)
  if (normKey === 'plum_concrete_equal' || normKey === 'plum_concrete_unequal' || normKey === 'plum_concrete') {
    const isVertical = normKey === 'plum_concrete_equal';
    const formFactor = typeof existingMapping?.formworkFactor === 'number' ? existingMapping.formworkFactor : 2.0;

    return [
      {
        id: 'comp_excavation',
        key: 'excavation',
        name: 'Excavation in Foundation Trench',
        categoryTag: 'Earthwork',
        iconEmoji: '⛏️',
        unit: 'm3',
        calcFormula: 'excavation_pit',
        mappedItemId: existingMapping?.excavationItemId || '',
        enabled: true,
        remarks: 'Foundation trench pit: L × B × H'
      },
      {
        id: 'comp_soling',
        key: 'soling',
        name: 'Stone Soling Bedding Layer',
        categoryTag: 'Bedding',
        iconEmoji: '🧱',
        unit: 'm3',
        calcFormula: 'soling_bed',
        mappedItemId: existingMapping?.solingItemId || '',
        enabled: true,
        remarks: 'Stone soling bedding: L × B × H'
      },
      {
        id: 'comp_pcc_136',
        key: 'pcc_136',
        name: 'Bed PCC (1:3:6) Leveling Concrete',
        categoryTag: 'Bedding',
        iconEmoji: '📐',
        unit: 'm3',
        calcFormula: 'pcc_bed',
        mappedItemId: existingMapping?.pccItemId || '',
        enabled: true,
        remarks: 'Bed PCC 1:3:6 leveling layer: L × B × H'
      },
      {
        id: 'comp_plum_wall',
        key: 'plum_wall',
        name: isVertical
          ? 'Plum Concrete Wall Body (Vertical 1:3:6 + 40% Plum)'
          : 'Plum Concrete Wall Body (Battered 1:3:6 + 40% Plum)',
        categoryTag: 'Concrete',
        iconEmoji: '🏰',
        unit: 'm3',
        calcFormula: 'wall_body_masonry',
        mappedItemId: existingMapping?.wallItemId || '',
        enabled: true,
        remarks: 'Plum concrete (1:3:6 with 40% boulders): L × ((TopW + BotW)/2) × H'
      },
      {
        id: 'comp_formwork',
        key: 'formwork',
        name: 'Formwork / Shuttering (User Factor)',
        categoryTag: 'Formwork',
        iconEmoji: '🪵',
        unit: 'sq.m',
        calcFormula: 'formwork_shuttering',
        userFactor: formFactor,
        mappedItemId: existingMapping?.formworkItemId || '',
        enabled: true,
        remarks: `Wall shuttering: L × H × User Factor (${formFactor}x)`
      },
      {
        id: 'comp_weep_hole',
        key: 'weep_hole',
        name: 'Weep Holes (75mm/100mm PVC Pipes)',
        categoryTag: 'Drainage',
        iconEmoji: '💧',
        unit: 'm',
        calcFormula: 'weep_hole_pvc',
        userFactor: 1.5,
        mappedItemId: existingMapping?.weepHoleItemId || '',
        enabled: true,
        remarks: 'PVC weep holes @ 1.5m c/c'
      }
    ];
  }

  // 4. ROAD VARIANTS
  // 4A. Flexible Asphalt Concrete Road
  if (normKey === 'flexible_asphalt' || normKey === 'asphalt_road' || normKey === 'flexible_pavement') {
    return [
      {
        id: 'comp_road_excavation',
        key: 'road_excavation',
        name: 'Roadway Earthwork / Roadbed Excavation',
        categoryTag: 'Earthwork',
        iconEmoji: '🚜',
        unit: 'm3',
        calcFormula: 'road_excavation',
        mappedItemId: existingMapping?.excavationItemId || '',
        enabled: true,
        remarks: 'Road roadway cut/fill excavation: L × W_road × Depth'
      },
      {
        id: 'comp_road_subgrade',
        key: 'road_subgrade',
        name: 'Subgrade Preparation (300mm Compacted Soil)',
        categoryTag: 'Subgrade',
        iconEmoji: '🏗️',
        unit: 'sq.m',
        calcFormula: 'road_subgrade',
        mappedItemId: '',
        enabled: true,
        remarks: 'Subgrade compaction & grading: L × (Wc + 2*Ws)'
      },
      {
        id: 'comp_road_gsb',
        key: 'road_gsb',
        name: 'Granular Sub-Base (GSB 200mm Layer)',
        categoryTag: 'Base/Sub-base',
        iconEmoji: '🪨',
        unit: 'm3',
        calcFormula: 'road_gsb',
        mappedItemId: existingMapping?.solingItemId || '',
        enabled: true,
        remarks: 'Granular Sub-Base: L × (Wc + 2*Ws) × T_gsb'
      },
      {
        id: 'comp_road_wmm',
        key: 'road_wmm',
        name: 'Wet Mix Macadam (WMM / Base Course 150mm)',
        categoryTag: 'Base/Sub-base',
        iconEmoji: '🛣️',
        unit: 'm3',
        calcFormula: 'road_wmm_base',
        mappedItemId: existingMapping?.pccItemId || '',
        enabled: true,
        remarks: 'Crushed stone base course / WMM: L × (Wc + 0.6) × T_base'
      },
      {
        id: 'comp_road_prime_tack',
        key: 'road_prime_tack',
        name: 'Prime Coat & Tack Coat Bituminous Spray',
        categoryTag: 'Bituminous',
        iconEmoji: '🧴',
        unit: 'sq.m',
        calcFormula: 'road_prime_tack',
        mappedItemId: '',
        enabled: true,
        remarks: 'Bitumen emulsion / cutback prime & tack application: L × Wc'
      },
      {
        id: 'comp_road_asphalt',
        key: 'road_asphalt',
        name: 'Asphalt Concrete / Premix Carpet (50mm Wearing Course)',
        categoryTag: 'Pavement',
        iconEmoji: '⚫',
        unit: 'm3',
        calcFormula: 'road_asphalt',
        mappedItemId: existingMapping?.wallItemId || '',
        enabled: true,
        remarks: 'Asphalt concrete wearing course: L × Wc × T_asphalt'
      },
      {
        id: 'comp_road_shoulder',
        key: 'road_shoulder',
        name: 'Gravel / Earthen Shoulders (Both Sides)',
        categoryTag: 'Shoulders',
        iconEmoji: '🌾',
        unit: 'm3',
        calcFormula: 'road_gravel_shoulder',
        mappedItemId: '',
        enabled: true,
        remarks: 'Hard shoulder graveling: L × (Ws_left + Ws_right) × T_shoulder'
      }
    ];
  }

  // 4B. Rigid Concrete Road (PQC + DLC + GSB + Tie/Dowel Rebar + Joint Sealing)
  if (normKey === 'rigid_concrete' || normKey === 'concrete_road' || normKey === 'rigid_pavement') {
    return [
      {
        id: 'comp_road_excavation',
        key: 'road_excavation',
        name: 'Roadway Excavation / Cutting to Formation Level',
        categoryTag: 'Earthwork',
        iconEmoji: '🚜',
        unit: 'm3',
        calcFormula: 'road_excavation',
        mappedItemId: existingMapping?.excavationItemId || '',
        enabled: true,
        remarks: 'Excavation to formation level: L × W × Depth'
      },
      {
        id: 'comp_road_gsb',
        key: 'road_gsb',
        name: 'Granular Sub-Base (GSB 150mm Filter Layer)',
        categoryTag: 'Subgrade',
        iconEmoji: '🪨',
        unit: 'm3',
        calcFormula: 'road_gsb',
        mappedItemId: existingMapping?.solingItemId || '',
        enabled: true,
        remarks: 'GSB drainage/separation layer: L × (Wc + 2*Ws) × T_gsb'
      },
      {
        id: 'comp_road_dlc',
        key: 'road_dlc',
        name: 'Dry Lean Concrete (DLC M10/M15 100mm Base)',
        categoryTag: 'Base/Sub-base',
        iconEmoji: '📐',
        unit: 'm3',
        calcFormula: 'road_dlc',
        mappedItemId: existingMapping?.pccItemId || '',
        enabled: true,
        remarks: 'Dry lean concrete leveling sub-base: L × (Wc + 0.4) × T_dlc'
      },
      {
        id: 'comp_road_pqc',
        key: 'road_pqc',
        name: 'Pavement Quality Concrete (PQC M30/M40 Slab)',
        categoryTag: 'Pavement',
        iconEmoji: '⬜',
        unit: 'm3',
        calcFormula: 'road_pqc_concrete',
        mappedItemId: existingMapping?.wallItemId || '',
        enabled: true,
        remarks: 'PQC M30/M40 concrete pavement slab: L × Wc × T_pqc'
      },
      {
        id: 'comp_road_dowel_rebar',
        key: 'road_dowel_rebar',
        name: 'Dowel Bars & Tie Bars Steel (Fe500)',
        categoryTag: 'Steel',
        iconEmoji: '🔩',
        unit: 'kg',
        calcFormula: 'reinforcement_steel',
        userFactor: 35, // 35 kg/m3 for rigid pavement dowels & tie bars
        mappedItemId: existingMapping?.rebarItemId || '',
        enabled: true,
        remarks: 'MS / TMT dowel & tie bars: PQC Vol × 35 kg/m³'
      },
      {
        id: 'comp_road_joints',
        key: 'road_joints',
        name: 'Contraction & Expansion Joint Grooving & Sealant',
        categoryTag: 'Finishing',
        iconEmoji: '🩹',
        unit: 'm',
        calcFormula: 'road_joint_sealing',
        mappedItemId: '',
        enabled: true,
        remarks: 'Transverse & longitudinal joint sawing and polysulphide sealing'
      }
    ];
  }

  // 4C. Earthen / Gravel Road
  if (normKey === 'earthen_gravel' || normKey === 'gravel_road' || normKey === 'earthen_road') {
    return [
      {
        id: 'comp_road_excavation',
        key: 'road_excavation',
        name: 'Earthwork in Embankment / Cutting & Formation',
        categoryTag: 'Earthwork',
        iconEmoji: '🚜',
        unit: 'm3',
        calcFormula: 'road_excavation',
        mappedItemId: existingMapping?.excavationItemId || '',
        enabled: true,
        remarks: 'Earthwork cutting/filling to road profile: L × W × H'
      },
      {
        id: 'comp_road_subgrade',
        key: 'road_subgrade',
        name: 'Subgrade Preparation & Heavy Compaction',
        categoryTag: 'Subgrade',
        iconEmoji: '🏗️',
        unit: 'sq.m',
        calcFormula: 'road_subgrade',
        mappedItemId: '',
        enabled: true,
        remarks: 'Subgrade watering & roller compaction: L × (Wc + 2*Ws)'
      },
      {
        id: 'comp_road_gravel_surface',
        key: 'road_gravel_surface',
        name: 'Gravel / Murrum Wearing Surface (150mm Course)',
        categoryTag: 'Pavement',
        iconEmoji: '🪨',
        unit: 'm3',
        calcFormula: 'road_gsb',
        mappedItemId: existingMapping?.solingItemId || '',
        enabled: true,
        remarks: 'Selected gravel wearing course: L × Wc × 0.15m'
      },
      {
        id: 'comp_road_side_drain',
        key: 'road_side_drain',
        name: 'Side Drain Excavation & Shaping',
        categoryTag: 'Drainage',
        iconEmoji: '⛏️',
        unit: 'm3',
        calcFormula: 'excavation_pit',
        mappedItemId: '',
        enabled: true,
        remarks: 'V/Trapezoidal side drain earthwork: L × (Drain W × D)'
      }
    ];
  }

  // 5. CULVERT VARIANTS
  // 5A. Single Cell Box Culvert
  if (normKey === 'box_single' || normKey === 'box_culvert_single' || normKey === 'box_culvert') {
    return [
      {
        id: 'comp_culvert_excavation',
        key: 'culvert_excavation',
        name: 'Deep Trench Excavation for Box Culvert',
        categoryTag: 'Earthwork',
        iconEmoji: '⛏️',
        unit: 'm3',
        calcFormula: 'culvert_excavation',
        mappedItemId: existingMapping?.excavationItemId || '',
        enabled: true,
        remarks: 'Trench excavation for box culvert: Lb × OuterW × TotalDepth'
      },
      {
        id: 'comp_culvert_bedding_pcc',
        key: 'culvert_bedding_pcc',
        name: 'Bedding PCC (M10/1:3:6) Leveling Course',
        categoryTag: 'Bedding',
        iconEmoji: '📐',
        unit: 'm3',
        calcFormula: 'culvert_bedding_pcc',
        mappedItemId: existingMapping?.pccItemId || '',
        enabled: true,
        remarks: '100mm Bedding concrete under raft slab: Lb × (OuterW + 0.4) × 0.10'
      },
      {
        id: 'comp_culvert_box_rcc',
        key: 'culvert_box_rcc',
        name: 'RCC (M20/25) Monolithic Box Barrel (Slabs + Walls)',
        categoryTag: 'Concrete',
        iconEmoji: '🏰',
        unit: 'm3',
        calcFormula: 'culvert_box_concrete',
        mappedItemId: existingMapping?.wallItemId || '',
        enabled: true,
        remarks: 'Raft slab + 2 Side walls + Top slab concrete: Net box concrete volume'
      },
      {
        id: 'comp_culvert_rebar',
        key: 'culvert_rebar',
        name: 'TMT Reinforcement Steel Fe500 (Box Slabs & Stem)',
        categoryTag: 'Steel',
        iconEmoji: '🔩',
        unit: 'kg',
        calcFormula: 'reinforcement_steel',
        userFactor: 110, // 110 kg/m3 for heavy box culvert
        mappedItemId: existingMapping?.rebarItemId || '',
        enabled: true,
        remarks: 'High yield Fe500 rebar: Box Concrete Vol × 110 kg/m³'
      },
      {
        id: 'comp_culvert_formwork',
        key: 'culvert_formwork',
        name: 'Shuttering / Centering Formwork for Box Culvert',
        categoryTag: 'Formwork',
        iconEmoji: '🪵',
        unit: 'sq.m',
        calcFormula: 'formwork_shuttering',
        userFactor: 2.5,
        mappedItemId: existingMapping?.formworkItemId || '',
        enabled: true,
        remarks: 'Inner soffit + outer wall shuttering: Lb × Total Perim × 2.5x'
      },
      {
        id: 'comp_culvert_waterproofing',
        key: 'culvert_waterproofing',
        name: 'Bituminous Waterproofing & Mastic Membrane',
        categoryTag: 'Finishing',
        iconEmoji: '🛡️',
        unit: 'sq.m',
        calcFormula: 'culvert_waterproofing',
        mappedItemId: '',
        enabled: true,
        remarks: 'Top slab & outer wall bitumen damp-proofing: Lb × (OuterW + 2*H)'
      },
      {
        id: 'comp_culvert_apron',
        key: 'culvert_apron',
        name: 'Flexible Stone Pitching Launching Apron (U/S & D/S)',
        categoryTag: 'Protection',
        iconEmoji: '🪨',
        unit: 'm3',
        calcFormula: 'culvert_apron_pitching',
        mappedItemId: '',
        enabled: true,
        remarks: 'Boulder/Gabion launching apron: ApronCount × ApronL × ApronW × ApronT'
      },
      {
        id: 'comp_culvert_scour_wall',
        key: 'culvert_scour_wall',
        name: 'Cutoff Scour Wall Concrete / Plum (U/S & D/S)',
        categoryTag: 'Protection',
        iconEmoji: '🧱',
        unit: 'm3',
        calcFormula: 'culvert_scour_wall_concrete',
        mappedItemId: '',
        enabled: true,
        remarks: 'Cutoff scour drop wall: ScourWallCount × ScourW × ScourDepth × ScourT'
      }
    ];
  }

  // 5B. Twin Cell Box Culvert
  if (normKey === 'box_twin' || normKey === 'box_culvert_twin') {
    return [
      {
        id: 'comp_culvert_excavation',
        key: 'culvert_excavation',
        name: 'Trench Excavation for Twin Cell Box Culvert',
        categoryTag: 'Earthwork',
        iconEmoji: '⛏️',
        unit: 'm3',
        calcFormula: 'culvert_excavation',
        mappedItemId: existingMapping?.excavationItemId || '',
        enabled: true,
        remarks: 'Deep excavation for twin cell box: Lb × TwinOuterW × TotalDepth'
      },
      {
        id: 'comp_culvert_bedding_pcc',
        key: 'culvert_bedding_pcc',
        name: 'Bedding PCC (M10/1:3:6) Foundation Layer',
        categoryTag: 'Bedding',
        iconEmoji: '📐',
        unit: 'm3',
        calcFormula: 'culvert_bedding_pcc',
        mappedItemId: existingMapping?.pccItemId || '',
        enabled: true,
        remarks: '100mm Bedding concrete: Lb × (TwinOuterW + 0.4) × 0.10'
      },
      {
        id: 'comp_culvert_box_rcc',
        key: 'culvert_box_rcc',
        name: 'RCC (M20/25) Twin Box Concrete (Slabs + 3 Walls)',
        categoryTag: 'Concrete',
        iconEmoji: '🏰',
        unit: 'm3',
        calcFormula: 'culvert_box_concrete',
        mappedItemId: existingMapping?.wallItemId || '',
        enabled: true,
        remarks: 'Raft base + 3 Walls (2 outer + 1 central pier) + Deck slab concrete'
      },
      {
        id: 'comp_culvert_rebar',
        key: 'culvert_rebar',
        name: 'TMT Reinforcement Steel Fe500 (Twin Box)',
        categoryTag: 'Steel',
        iconEmoji: '🔩',
        unit: 'kg',
        calcFormula: 'reinforcement_steel',
        userFactor: 115,
        mappedItemId: existingMapping?.rebarItemId || '',
        enabled: true,
        remarks: 'Fe500 Rebar: Twin Box Concrete Vol × 115 kg/m³'
      },
      {
        id: 'comp_culvert_formwork',
        key: 'culvert_formwork',
        name: 'Shuttering / Formwork (Twin Cells)',
        categoryTag: 'Formwork',
        iconEmoji: '🪵',
        unit: 'sq.m',
        calcFormula: 'formwork_shuttering',
        userFactor: 3.2,
        mappedItemId: existingMapping?.formworkItemId || '',
        enabled: true,
        remarks: 'Twin cell inner soffits & wall formwork'
      },
      {
        id: 'comp_culvert_apron',
        key: 'culvert_apron',
        name: 'Flexible Stone Pitching Launching Apron (U/S & D/S)',
        categoryTag: 'Protection',
        iconEmoji: '🪨',
        unit: 'm3',
        calcFormula: 'culvert_apron_pitching',
        mappedItemId: '',
        enabled: true,
        remarks: 'Boulder/Gabion launching apron: ApronCount × ApronL × TwinApronW × ApronT'
      },
      {
        id: 'comp_culvert_scour_wall',
        key: 'culvert_scour_wall',
        name: 'Cutoff Scour Wall Concrete / Plum (U/S & D/S)',
        categoryTag: 'Protection',
        iconEmoji: '🧱',
        unit: 'm3',
        calcFormula: 'culvert_scour_wall_concrete',
        mappedItemId: '',
        enabled: true,
        remarks: 'Cutoff scour drop wall: ScourWallCount × TwinScourW × ScourDepth × ScourT'
      }
    ];
  }

  // 5C. RCC Pipe Culvert (Hume Pipes NP3/NP4 + Cradle Bedding + Jointing)
  if (normKey === 'pipe_rcc' || normKey === 'pipe_culvert' || normKey === 'rcc_pipe') {
    return [
      {
        id: 'comp_pipe_excavation',
        key: 'pipe_excavation',
        name: 'Trench Excavation for Pipe Culvert',
        categoryTag: 'Earthwork',
        iconEmoji: '⛏️',
        unit: 'm3',
        calcFormula: 'culvert_excavation',
        mappedItemId: existingMapping?.excavationItemId || '',
        enabled: true,
        remarks: 'Trench excavation for pipe culvert: Lb × TrenchW × Depth'
      },
      {
        id: 'comp_pipe_bedding',
        key: 'pipe_bedding',
        name: 'Concrete Cradle Bedding PCC (M15/1:2:4)',
        categoryTag: 'Bedding',
        iconEmoji: '📐',
        unit: 'm3',
        calcFormula: 'culvert_pipe_bedding',
        mappedItemId: existingMapping?.pccItemId || '',
        enabled: true,
        remarks: 'U-cradle / haunch concrete bedding under RCC pipes'
      },
      {
        id: 'comp_pipe_supply_laying',
        key: 'pipe_supply_laying',
        name: 'NP3 / NP4 Reinforced Concrete Pipes Supply & Laying',
        categoryTag: 'Pipes',
        iconEmoji: '⭕',
        unit: 'm',
        calcFormula: 'culvert_pipe_nos',
        mappedItemId: existingMapping?.wallItemId || '',
        enabled: true,
        remarks: 'High-strength RCC Hume pipes: Pipe Count × Barrel Length (m)'
      },
      {
        id: 'comp_pipe_jointing',
        key: 'pipe_jointing',
        name: 'Collar Jointing in Cement Mortar (1:2)',
        categoryTag: 'Masonry',
        iconEmoji: '🩹',
        unit: 'nos',
        calcFormula: 'custom_multiplier',
        userFactor: 4.0,
        mappedItemId: '',
        enabled: true,
        remarks: 'Flushing & cement collar jointing at pipe joints'
      },
      {
        id: 'comp_pipe_headwalls',
        key: 'pipe_headwalls',
        name: 'Inlet / Outlet Stone Masonry Headwalls & Wingwalls',
        categoryTag: 'Masonry',
        iconEmoji: '🏰',
        unit: 'm3',
        calcFormula: 'culvert_masonry_abutment',
        mappedItemId: '',
        enabled: true,
        remarks: 'Stone masonry headwalls & aprons at both ends'
      }
    ];
  }

  // 5D. Slab Culvert (Masonry Abutments + L-Cap + RCC Deck Slab + Masonry Wing Walls)
  if (normKey === 'slab_culvert' || normKey === 'culvert_slab') {
    return [
      {
        id: 'comp_slab_culvert_excavation',
        key: 'culvert_excavation',
        name: 'Excavation in Foundation Trenches (Abutments & Wing Walls)',
        categoryTag: 'Earthwork',
        iconEmoji: '⛏️',
        unit: 'm3',
        calcFormula: 'culvert_excavation',
        mappedItemId: existingMapping?.excavationItemId || '',
        enabled: true,
        remarks: 'Trench excavation for 2 abutments + 4 flared wing walls'
      },
      {
        id: 'comp_slab_culvert_soling',
        key: 'soling',
        name: 'Flat Stone Soling under Abutments & Wing Walls',
        categoryTag: 'Bedding',
        iconEmoji: '🧱',
        unit: 'm3',
        calcFormula: 'soling_bed',
        mappedItemId: existingMapping?.solingItemId || '',
        enabled: true,
        remarks: 'Dry stone soling bedding (0.15m thick)'
      },
      {
        id: 'comp_slab_culvert_bedding',
        key: 'culvert_bedding_pcc',
        name: 'Bed PCC (1:3:6 / M10) Foundation Leveling Concrete',
        categoryTag: 'Bedding',
        iconEmoji: '📐',
        unit: 'm3',
        calcFormula: 'culvert_bedding_pcc',
        mappedItemId: existingMapping?.pccItemId || '',
        enabled: true,
        remarks: 'Base leveling concrete under 2 abutments & 4 wing walls'
      },
      {
        id: 'comp_slab_culvert_abutments',
        key: 'culvert_abutments',
        name: 'Stone / Plum Masonry in Abutment Walls (2 Nos)',
        categoryTag: 'Masonry',
        iconEmoji: '🏰',
        unit: 'm3',
        calcFormula: 'culvert_masonry_abutment',
        mappedItemId: existingMapping?.stoneMasonryItemId || existingMapping?.wallItemId || '',
        enabled: true,
        remarks: '2 Abutments: 2 × Lb × AvgWidth × Height'
      },
      {
        id: 'comp_slab_culvert_wingwalls',
        key: 'culvert_wingwalls',
        name: 'Stone Masonry in Flared Wing Walls (4 Nos)',
        categoryTag: 'Masonry',
        iconEmoji: '🛡️',
        unit: 'm3',
        calcFormula: 'culvert_wingwall_masonry',
        mappedItemId: existingMapping?.stoneMasonryItemId || existingMapping?.wallItemId || '',
        enabled: true,
        remarks: '4 Wing walls: 4 × L_wing × AvgWidth × AvgHeight'
      },
      {
        id: 'comp_slab_culvert_lcap',
        key: 'culvert_lcap',
        name: 'RCC / PCC (M20) Bed-Cap / L-Cap (Seat & Dirt Wall)',
        categoryTag: 'Concrete',
        iconEmoji: '📐',
        unit: 'm3',
        calcFormula: 'culvert_lcap_concrete',
        mappedItemId: existingMapping?.pccM15ItemId || '',
        enabled: true,
        remarks: 'L-shaped bearing cap & dirt ballast wall: 2 Nos × Lb × Area'
      },
      {
        id: 'comp_slab_culvert_deck_rcc',
        key: 'culvert_deck_rcc',
        name: 'RCC (M20/25) Deck Slab Structural Concrete',
        categoryTag: 'Concrete',
        iconEmoji: '🏛️',
        unit: 'm3',
        calcFormula: 'culvert_slab_concrete',
        mappedItemId: existingMapping?.rccConcreteItemId || '',
        enabled: true,
        remarks: 'RCC Deck slab & side kerbs: (Span + 2*Bearing) × RoadW × Thickness'
      },
      {
        id: 'comp_slab_culvert_rebar',
        key: 'culvert_rebar',
        name: 'TMT Reinforcement Fe500 (Deck Slab & L-Caps)',
        categoryTag: 'Steel',
        iconEmoji: '🔩',
        unit: 'kg',
        calcFormula: 'reinforcement_steel',
        userFactor: 105, // 105 kg/m3 for deck slab + L-cap steel
        mappedItemId: existingMapping?.rebarItemId || '',
        enabled: true,
        remarks: 'Fe500 Rebar: Concrete Vol × 105 kg/m³'
      },
      {
        id: 'comp_slab_culvert_formwork',
        key: 'culvert_formwork',
        name: 'Formwork / Centering for Deck Slab, L-Caps & Kerbs',
        categoryTag: 'Formwork',
        iconEmoji: '🪵',
        unit: 'sq.m',
        calcFormula: 'formwork_shuttering',
        userFactor: 1.8,
        mappedItemId: existingMapping?.formworkItemId || '',
        enabled: true,
        remarks: 'Deck soffit staging + L-cap sides + kerb fascia shuttering'
      },
      {
        id: 'comp_slab_culvert_coping',
        key: 'culvert_coping',
        name: 'Top PCC (1:2:4 / M15) Coping on Wing Walls & Parapets',
        categoryTag: 'Concrete',
        iconEmoji: '🧱',
        unit: 'm3',
        calcFormula: 'pcc_coping_124',
        userFactor: 0.075,
        mappedItemId: existingMapping?.pcc124ItemId || '',
        enabled: true,
        remarks: 'PCC Coping band on 4 wing walls: 4 × L_wing × TopW × 0.075m'
      },
      {
        id: 'comp_slab_culvert_plaster',
        key: 'culvert_plaster',
        name: 'Cement Plaster / Pointing (1:4) on Exposed Masonry',
        categoryTag: 'Finishing',
        iconEmoji: '🎨',
        unit: 'sq.m',
        calcFormula: 'plaster_surface',
        mappedItemId: existingMapping?.plasterItemId || '',
        enabled: true,
        remarks: 'Exposed face plaster / flush pointing on abutments & wing walls'
      },
      {
        id: 'comp_slab_culvert_weep_hole',
        key: 'culvert_weep_hole',
        name: 'PVC Weep Holes (100mm dia with Geotextile Filter)',
        categoryTag: 'Drainage',
        iconEmoji: '💧',
        unit: 'nos',
        calcFormula: 'weep_hole_pvc',
        userFactor: 1.5,
        mappedItemId: existingMapping?.weepHoleItemId || '',
        enabled: true,
        remarks: 'PVC weep holes @ 1.5m c/c in abutments and wing walls'
      }
    ];
  }

  // 6. CUSTOM WALL (Full Custom Mapping & Linkage)
  return [
    {
      id: 'comp_excavation',
      key: 'excavation',
      name: 'Excavation in Foundation Trench',
      categoryTag: 'Earthwork',
      iconEmoji: '⛏️',
      unit: 'm3',
      calcFormula: 'excavation_pit',
      mappedItemId: existingMapping?.excavationItemId || '',
      enabled: true,
      remarks: 'Custom Foundation Excavation: L × B × H'
    },
    {
      id: 'comp_soling',
      key: 'soling',
      name: 'Soling Bedding Layer',
      categoryTag: 'Bedding',
      iconEmoji: '🧱',
      unit: 'm3',
      calcFormula: 'soling_bed',
      mappedItemId: existingMapping?.solingItemId || '',
      enabled: true,
      remarks: 'Custom Soling Layer: L × B × H'
    },
    {
      id: 'comp_pcc_136',
      key: 'pcc_136',
      name: 'Bed PCC (1:3:6) Leveling Concrete',
      categoryTag: 'Bedding',
      iconEmoji: '📐',
      unit: 'm3',
      calcFormula: 'pcc_bed',
      mappedItemId: existingMapping?.pccItemId || '',
      enabled: true,
      remarks: 'Custom Bed PCC Layer: L × B × H'
    },
    {
      id: 'comp_custom_wall_body',
      key: 'custom_wall_body',
      name: 'Custom Wall Structural Body',
      categoryTag: 'Masonry',
      iconEmoji: '🏰',
      unit: 'm3',
      calcFormula: 'wall_body_masonry',
      mappedItemId: existingMapping?.wallItemId || '',
      enabled: true,
      remarks: 'Custom Wall Body: L × ((TopW + BotW)/2) × H'
    },
    {
      id: 'comp_formwork',
      key: 'formwork',
      name: 'Formwork / Shuttering (User Factor)',
      categoryTag: 'Formwork',
      iconEmoji: '🪵',
      unit: 'sq.m',
      calcFormula: 'formwork_shuttering',
      userFactor: 2.0,
      mappedItemId: existingMapping?.formworkItemId || '',
      enabled: true,
      remarks: 'Custom Wall Formwork: L × H × Factor'
    },
    {
      id: 'comp_weep_hole',
      key: 'weep_hole',
      name: 'Weep Holes / Drainage Pipe',
      categoryTag: 'Drainage',
      iconEmoji: '💧',
      unit: 'm',
      calcFormula: 'weep_hole_pvc',
      userFactor: 1.5,
      mappedItemId: existingMapping?.weepHoleItemId || '',
      enabled: true,
      remarks: 'Drainage weep holes'
    }
  ];
}

/**
 * Intelligent Auto-Matcher: Matches project BOQ items to dynamic components by analyzing item keywords
 */
export function autoMatchComponentsToProjectBOQ(
  components: DynamicBOQComponentDef[],
  projectItems: BOQItem[]
): DynamicBOQComponentDef[] {
  const matchedItemIds = new Set<string>();

  return components.map((comp) => {
    // If already mapped to a valid item, keep it
    if (comp.mappedItemId && projectItems.some((i) => i.id === comp.mappedItemId)) {
      matchedItemIds.add(comp.mappedItemId);
      return comp;
    }

    let foundItemId: string | undefined;

    // Search keywords by component key/formula
    for (const item of projectItems) {
      if (matchedItemIds.has(item.id)) continue;
      const desc = (item.description || '').toLowerCase();
      const code = (item.code || '').toLowerCase();
      const unit = (item.unit || '').toLowerCase();

      if (comp.key === 'excavation' || comp.calcFormula === 'excavation_pit') {
        if (desc.includes('excavation') || desc.includes('earthwork') || desc.includes('cutting')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.key === 'soling' || comp.calcFormula === 'soling_bed') {
        if (desc.includes('soling') || desc.includes('flat brick') || desc.includes('stone soling')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.key === 'pcc_136' || (comp.calcFormula === 'pcc_bed' && (desc.includes('1:3:6') || desc.includes('m10') || desc.includes('lean') || desc.includes('bedding')))) {
        if (desc.includes('1:3:6') || desc.includes('m10') || (desc.includes('pcc') && !desc.includes('1:2:4') && !desc.includes('m15') && !desc.includes('m20') && !desc.includes('m25'))) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.key === 'brick_masonry') {
        if (desc.includes('brick')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.key === 'stone_masonry') {
        if (desc.includes('stone masonry') || desc.includes('rubble')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.key === 'pcc_124' || comp.calcFormula === 'pcc_coping_124') {
        if (desc.includes('1:2:4') || desc.includes('coping') || desc.includes('m15') || desc.includes('band')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.key === 'pcc_m15' || comp.calcFormula === 'pcc_coping_m15') {
        if (desc.includes('m15') || desc.includes('1:2:4') || desc.includes('coping') || desc.includes('cap')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.key === 'plaster' || comp.calcFormula === 'plaster_surface') {
        if (desc.includes('plaster')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.key === 'punning' || comp.calcFormula === 'punning_surface') {
        if (desc.includes('punning') || desc.includes('neat cement')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.key === 'pointing' || comp.calcFormula === 'pointing_surface') {
        if (desc.includes('pointing')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.key === 'weep_hole' || comp.calcFormula === 'weep_hole_pvc') {
        if (desc.includes('weep') || desc.includes('pvc pipe') || desc.includes('drain pipe')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.key === 'reinforcement' || comp.calcFormula === 'reinforcement_steel') {
        if (desc.includes('reinforcement') || desc.includes('rebar') || desc.includes('fe500') || desc.includes('fe415') || desc.includes('tor steel')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.key === 'rcc_m20_25' || comp.calcFormula === 'wall_body_rcc') {
        if (desc.includes('rcc') || desc.includes('m20') || desc.includes('m25') || desc.includes('1:1.5:3')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.key === 'formwork' || comp.calcFormula === 'formwork_shuttering') {
        if (desc.includes('formwork') || desc.includes('shuttering') || desc.includes('centering')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.key === 'plum_wall') {
        if (desc.includes('plum') || (desc.includes('protection') && desc.includes('wall'))) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.key === 'custom_wall_body') {
        if (desc.includes('wall') || desc.includes('retaining') || desc.includes('protection')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.calcFormula === 'road_excavation') {
        if (desc.includes('roadway') || desc.includes('formation') || desc.includes('cutting') || desc.includes('earthwork') || desc.includes('excavation')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.calcFormula === 'road_subgrade') {
        if (desc.includes('subgrade') || desc.includes('preparation of subgrade')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.calcFormula === 'road_gsb') {
        if (desc.includes('gsb') || desc.includes('granular sub') || desc.includes('sub-base') || desc.includes('subbase')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.calcFormula === 'road_wmm_base') {
        if (desc.includes('wmm') || desc.includes('wet mix') || desc.includes('base course') || desc.includes('macadam')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.calcFormula === 'road_prime_tack') {
        if (desc.includes('prime coat') || desc.includes('tack coat') || desc.includes('emulsion') || desc.includes('bitumen')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.calcFormula === 'road_asphalt') {
        if (desc.includes('asphalt') || desc.includes('premix') || desc.includes('dbm') || desc.includes('bituminous concrete') || desc.includes('wearing course')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.calcFormula === 'road_pqc_concrete') {
        if (desc.includes('pqc') || desc.includes('pavement quality') || desc.includes('m30') || desc.includes('m40') || desc.includes('concrete road')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.calcFormula === 'road_dlc') {
        if (desc.includes('dlc') || desc.includes('dry lean') || desc.includes('lean concrete')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.calcFormula === 'culvert_excavation') {
        if (desc.includes('culvert') || desc.includes('trench') || desc.includes('deep excavation') || desc.includes('foundation excavation')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.calcFormula === 'culvert_bedding_pcc') {
        if (desc.includes('bedding') || desc.includes('cradle') || (desc.includes('pcc') && (desc.includes('1:3:6') || desc.includes('m10')))) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.calcFormula === 'culvert_box_concrete') {
        if (desc.includes('box culvert') || desc.includes('culvert concrete') || (desc.includes('rcc') && desc.includes('culvert'))) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.calcFormula === 'culvert_pipe_nos') {
        if (desc.includes('hume pipe') || desc.includes('np3') || desc.includes('np4') || desc.includes('rcc pipe') || desc.includes('pipe culvert')) {
          foundItemId = item.id;
          break;
        }
      } else if (comp.calcFormula === 'culvert_slab_concrete') {
        if (desc.includes('deck slab') || desc.includes('slab culvert') || (desc.includes('slab') && desc.includes('rcc'))) {
          foundItemId = item.id;
          break;
        }
      }
    }

    if (foundItemId) {
      matchedItemIds.add(foundItemId);
      return { ...comp, mappedItemId: foundItemId };
    }

    return comp;
  });
}

/**
 * Calculates Section Dimensions and Quantity for a specific component
 */
export function calculateComponentQuantityForSection(
  component: DynamicBOQComponentDef,
  section: DrawingSectionDef,
  boqItem?: BOQItem
): {
  quantity: number;
  length: number;
  breadth: number;
  height: number;
  no_of_units: number;
  unit: string;
  particulars: string;
  remarks: string;
} {
  const p = section.params;
  const l = p.wallLength || 10.0;
  const h = p.wallHeight || 2.5;
  const topW = p.wallTopWidth || 0.6;
  const botW = p.wallBottomWidth || 1.5;
  const avgW = parseFloat(((topW + botW) / 2).toFixed(3));
  const chStr = section.chainageStart && section.chainageEnd ? `(Ch. ${section.chainageStart} to ${section.chainageEnd})` : '';

  const isItemSqM = (boqItem?.unit || component.unit || '').toLowerCase().includes('m2') || (boqItem?.unit || component.unit || '').toLowerCase().includes('sq');
  const isItemKg = (boqItem?.unit || component.unit || '').toLowerCase().includes('kg');
  const isItemTon = (boqItem?.unit || component.unit || '').toLowerCase().includes('ton') || (boqItem?.unit || component.unit || '').toLowerCase().includes('mt');
  const isItemNos = (boqItem?.unit || component.unit || '').toLowerCase().includes('no') || (boqItem?.unit || component.unit || '').toLowerCase().includes('pc');
  const isItemM = (boqItem?.unit || component.unit || '').toLowerCase().includes('rm') || (boqItem?.unit || component.unit || '').toLowerCase() === 'm';

  let qty = 0;
  let len = l;
  let br = 1;
  let ht = 1;
  let nos = 1;
  let unit = boqItem?.unit || component.unit || 'm3';
  let particulars = `${section.sectionCode} ${chStr}: ${component.name}`;
  let remarks = `CAD Section ${section.sectionCode}`;

  switch (component.calcFormula) {
    case 'excavation_pit': {
      br = p.excavationWidth || (p.pccWidth + 0.6);
      ht = p.excavationDepth || 1.2;
      qty = parseFloat((len * br * ht).toFixed(3));
      particulars = `${section.sectionCode} ${chStr}: Foundation Trench Excavation Pit (B=${br.toFixed(2)}m, D=${ht.toFixed(2)}m)`;
      break;
    }

    case 'soling_bed': {
      br = p.solingWidth || (p.pccWidth + 0.1);
      ht = isItemSqM ? 1 : (p.solingThickness || 0.15);
      qty = isItemSqM ? parseFloat((len * br).toFixed(3)) : parseFloat((len * br * ht).toFixed(3));
      particulars = `${section.sectionCode} ${chStr}: Soling Bedding Layer (W=${br.toFixed(2)}m, T=${(p.solingThickness || 0.15).toFixed(2)}m)`;
      break;
    }

    case 'pcc_bed': {
      br = p.pccWidth || (botW + 0.3);
      ht = p.pccThickness || 0.15;
      qty = parseFloat((len * br * ht).toFixed(3));
      particulars = `${section.sectionCode} ${chStr}: Bed PCC (1:3:6) Base Leveling Layer (W=${br.toFixed(2)}m, T=${ht.toFixed(2)}m)`;
      break;
    }

    case 'drain_rcc_concrete': {
      const clearB = topW || 0.60;
      const tw = p.wallTopWidth || 0.20;
      const tb = p.baseSlabThickness || 0.20;
      const tc = 0.10; // Cover slab thickness
      const hasCover = p.customStemType !== 'stepped'; // Default has cover
      const outerW = clearB + 2 * tw;

      const bedVol = len * outerW * tb;
      const wallsVol = len * (2 * tw) * h;
      const coverVol = hasCover ? len * outerW * tc : 0;
      const totalVol = parseFloat((bedVol + wallsVol + coverVol).toFixed(3));

      qty = totalVol;
      br = parseFloat(outerW.toFixed(3));
      ht = parseFloat((h + tb + (hasCover ? tc : 0)).toFixed(3));
      particulars = `${section.sectionCode} ${chStr}: RCC (M20) Drain Concrete (Bed=${bedVol.toFixed(2)}m³ + Walls=${wallsVol.toFixed(2)}m³${hasCover ? ` + Cover Slab=${coverVol.toFixed(2)}m³` : ''}) Total=${qty}m³`;
      break;
    }

    case 'drain_plum_concrete': {
      const clearB = topW || 0.60;
      const twRoad = botW > 0.4 ? botW : 0.35; // Road side wall width
      const twUser = topW < 0.4 ? topW : 0.25; // User side wall width
      const tb = typeof p.baseSlabThickness === 'number' ? p.baseSlabThickness : 0.20;
      const outerW = clearB + twRoad + twUser;

      const roadWallVol = len * twRoad * h;
      const userWallVol = len * twUser * h;
      const bedVol = len * outerW * tb;
      const totalVol = parseFloat((roadWallVol + userWallVol + bedVol).toFixed(3));

      qty = totalVol;
      br = parseFloat(outerW.toFixed(3));
      ht = parseFloat((h + tb).toFixed(3));
      const bedDesc = tb > 0 ? `, Bed=${bedVol.toFixed(2)}m³` : ' (No Plum Bed Slab, Bed P.C.C. Only)';
      particulars = `${section.sectionCode} ${chStr}: Plum Concrete Drain Body (Road Side Tw=${twRoad.toFixed(2)}m, User Side Tw=${twUser.toFixed(2)}m${bedDesc}) Total=${qty}m³`;
      break;
    }

    case 'drain_brick_masonry': {
      const twRoad = botW > 0.4 ? botW : 0.35; // Road side width (1.5 brick)
      const twUser = topW < 0.4 ? topW : 0.23; // User side width (1 brick)
      const totalWallW = twRoad + twUser;
      const vol = len * totalWallW * h;

      qty = parseFloat(vol.toFixed(3));
      br = parseFloat(totalWallW.toFixed(3));
      ht = h;
      particulars = `${section.sectionCode} ${chStr}: Brick Masonry Drain Walls (Road Side Tw=${twRoad.toFixed(2)}m + User Side Tw=${twUser.toFixed(2)}m, H=${h.toFixed(2)}m)`;
      break;
    }

    case 'drain_plaster': {
      const clearB = topW || 0.60;
      const plasterH = typeof p.plasterHeight === 'number' && p.plasterHeight >= 0 ? p.plasterHeight : h;
      const plasterPerimeter = clearB + 2 * plasterH;
      qty = parseFloat((len * plasterPerimeter).toFixed(3));
      ht = parseFloat(plasterPerimeter.toFixed(3));
      br = 1;
      unit = 'sq.m';
      particulars = `${section.sectionCode} ${chStr}: Cement Sand Plaster (1:4) on Drain (Bed=${clearB.toFixed(2)}m + 2 Walls × ${plasterH.toFixed(2)}m = ${plasterPerimeter.toFixed(2)}m)`;
      break;
    }

    case 'drain_punning_full_height': {
      const clearB = topW || 0.60;
      const punningH = typeof p.punningHeight === 'number' && p.punningHeight >= 0 ? p.punningHeight : h;
      const punningPerimeter = clearB + 2 * punningH;
      qty = parseFloat((len * punningPerimeter).toFixed(3));
      ht = parseFloat(punningPerimeter.toFixed(3));
      br = 1;
      unit = 'sq.m';
      particulars = `${section.sectionCode} ${chStr}: Neat Cement Punning on Drain (Bed=${clearB.toFixed(2)}m + 2 Walls × ${punningH.toFixed(2)}m = ${punningPerimeter.toFixed(2)}m)`;
      break;
    }

    case 'wall_body_masonry': {
      br = avgW;
      ht = h;
      qty = parseFloat((len * br * ht).toFixed(3));
      particulars = `${section.sectionCode} ${chStr}: ${component.name} (Top=${topW.toFixed(2)}m, Bot=${botW.toFixed(2)}m, H=${ht.toFixed(2)}m)`;
      break;
    }

    case 'wall_body_rcc': {
      // RCC Stem + Bed/Base Slab + Fillet
      const isLowerHeight = p.rccWallConfigType === 'lower_flush_base' || (p.toeLength === 0 && (!p.heelLength || p.heelLength < 0.2));
      const baseSlabW = p.baseSlabWidth || (isLowerHeight ? botW + 0.30 : Math.max(1.80, botW + (p.toeLength || 0.50) + (p.heelLength || 1.30)));
      const baseSlabT = p.baseSlabThickness || (isLowerHeight ? 0.25 : 0.35);
      const stemVol = len * avgW * h;
      const baseVol = len * baseSlabW * baseSlabT;
      
      // Fillet / Haunch Volume at stem-bed joint
      let filletVol = 0;
      if (p.hasFillet) {
        const fSize = p.filletSize || 0.15;
        const count = p.filletLocation === 'both' ? 2 : 1;
        filletVol = len * (0.5 * fSize * fSize) * count;
      }

      const totalConcreteVol = stemVol + baseVol + filletVol;
      qty = parseFloat(totalConcreteVol.toFixed(3));
      br = parseFloat((totalConcreteVol / (len * (h + baseSlabT))).toFixed(3));
      ht = parseFloat((h + baseSlabT).toFixed(3));
      
      const configLabel = isLowerHeight ? 'Lower Height Base' : 'Cantilever Toe & Heel';
      const filletLabel = p.hasFillet ? ` + Fillet=${filletVol.toFixed(3)}m³` : '';
      particulars = `${section.sectionCode} ${chStr}: ${p.concreteGrade || 'PCC/RCC (M15/20/25)'} [${configLabel}] (Stem=${stemVol.toFixed(2)}m³ + Bed Slab=${baseVol.toFixed(2)}m³${filletLabel}) Total=${qty}m³`;
      break;
    }

    case 'pcc_coping_124':
    case 'pcc_coping_m15': {
      const copingT = component.userFactor || p.copingThickness || 0.075;
      br = topW;
      ht = copingT;
      qty = parseFloat((len * br * ht).toFixed(3));
      particulars = `${section.sectionCode} ${chStr}: ${component.name} (W=${topW.toFixed(2)}m, T=${copingT.toFixed(3)}m)`;
      break;
    }

    case 'plaster_surface': {
      // Exposed front face + top (User-specified plaster height or wall height)
      const plasterH = typeof p.plasterHeight === 'number' && p.plasterHeight >= 0 ? p.plasterHeight : h;
      const exposedHt = plasterH + (p.plasterThickness ? topW : topW * 0.5);
      ht = parseFloat(exposedHt.toFixed(3));
      br = 1;
      qty = parseFloat((len * ht).toFixed(3));
      unit = 'sq.m';
      particulars = `${section.sectionCode} ${chStr}: ${component.name} (Face Plaster H=${plasterH.toFixed(2)}m + Top=${topW.toFixed(2)}m)`;
      break;
    }

    case 'punning_surface': {
      // User-specified punning height or wall height (Default: wall height h)
      const punningH = typeof p.punningHeight === 'number' && p.punningHeight >= 0 ? p.punningHeight : h;
      const punningW = parseFloat((topW + punningH).toFixed(3));
      br = punningW;
      ht = 1;
      qty = parseFloat((len * br).toFixed(3));
      unit = 'sq.m';
      particulars = `${section.sectionCode} ${chStr}: ${component.name} (Face Punning H=${punningH.toFixed(2)}m + Top=${topW.toFixed(2)}m)`;
      break;
    }

    case 'pointing_surface': {
      // Exposed masonry face (1 or 2 sides)
      const sides = p.formworkSides === 'both' ? 2 : 1;
      nos = sides;
      ht = h;
      br = 1;
      qty = parseFloat((nos * len * ht).toFixed(3));
      unit = 'sq.m';
      particulars = `${section.sectionCode} ${chStr}: ${component.name} (${sides} Exposed Face${sides > 1 ? 's' : ''}, H=${h.toFixed(2)}m)`;
      break;
    }

    case 'weep_hole_pvc': {
      const spacing = component.userFactor || 1.5;
      const rowsCount = Math.max(1, Math.floor(h / 1.2));
      const nosPerSec = Math.max(1, Math.round(l / spacing)) * rowsCount;

      if (isItemNos) {
        qty = nosPerSec;
        nos = nosPerSec;
        len = 1;
        br = 1;
        ht = 1;
        unit = 'nos';
        particulars = `${section.sectionCode} ${chStr}: Weep Holes (${nosPerSec} Nos @ ${spacing}m c/c in ${rowsCount} Rows)`;
      } else {
        // Pipe length in meters: nos * average wall thickness
        const pipeLengthPerHole = parseFloat((avgW + 0.15).toFixed(3)); // extra 15cm projection
        qty = parseFloat((nosPerSec * pipeLengthPerHole).toFixed(3));
        nos = nosPerSec;
        len = pipeLengthPerHole;
        br = 1;
        ht = 1;
        unit = 'm';
        particulars = `${section.sectionCode} ${chStr}: 75mm PVC Weep Hole Pipes (${nosPerSec} Nos × ${pipeLengthPerHole.toFixed(2)}m/each)`;
      }
      break;
    }

    case 'reinforcement_steel': {
      // RCC Stem + Base Slab volume * density
      const baseSlabW = p.baseSlabWidth || Math.max(1.80, botW + 1.60);
      const baseSlabT = p.baseSlabThickness || 0.35;
      const totalRccVol = len * avgW * h + len * baseSlabW * baseSlabT;
      const density = component.userFactor || p.rebarDensityKgPerM3 || 95; // kg/m3

      const totalKg = totalRccVol * density;
      if (isItemTon) {
        qty = parseFloat((totalKg / 1000).toFixed(4));
        unit = 'MT';
      } else {
        qty = parseFloat(totalKg.toFixed(2));
        unit = 'kg';
      }
      nos = 1;
      len = parseFloat(totalRccVol.toFixed(3));
      br = density;
      ht = 1;
      particulars = `${section.sectionCode} ${chStr}: TMT Rebar Fe500 (RCC Vol=${totalRccVol.toFixed(2)}m³ × ${density}kg/m³ = ${totalKg.toFixed(1)}kg)`;
      break;
    }

    case 'road_excavation': {
      const roadW = topW > 2.0 ? topW : (botW > 2.0 ? botW : 7.0);
      const cutDepth = h > 0.1 && h < 3.0 ? h : 0.60;
      qty = parseFloat((len * roadW * cutDepth).toFixed(3));
      br = roadW;
      ht = cutDepth;
      particulars = `${section.sectionCode} ${chStr}: Roadway Excavation & Formation Cutting (W=${roadW.toFixed(2)}m, D=${cutDepth.toFixed(2)}m)`;
      break;
    }

    case 'road_subgrade': {
      const roadW = topW > 2.0 ? topW : 7.0;
      qty = parseFloat((len * roadW).toFixed(3));
      br = roadW;
      ht = 1;
      unit = 'sq.m';
      particulars = `${section.sectionCode} ${chStr}: Subgrade Preparation & Compaction (W=${roadW.toFixed(2)}m)`;
      break;
    }

    case 'road_gsb': {
      const roadW = topW > 2.0 ? topW : 7.0;
      const gsbT = 0.20;
      qty = parseFloat((len * roadW * gsbT).toFixed(3));
      br = roadW;
      ht = gsbT;
      particulars = `${section.sectionCode} ${chStr}: Granular Sub-Base (GSB) Layer (W=${roadW.toFixed(2)}m, T=0.20m)`;
      break;
    }

    case 'road_wmm_base': {
      const roadW = (topW > 2.0 ? topW : 5.5) + 0.6;
      const wmmT = 0.15;
      qty = parseFloat((len * roadW * wmmT).toFixed(3));
      br = parseFloat(roadW.toFixed(2));
      ht = wmmT;
      particulars = `${section.sectionCode} ${chStr}: Wet Mix Macadam (WMM) Base Course (W=${roadW.toFixed(2)}m, T=0.15m)`;
      break;
    }

    case 'road_prime_tack': {
      const cwW = topW > 2.0 ? topW : 5.5;
      qty = parseFloat((len * cwW).toFixed(3));
      br = cwW;
      ht = 1;
      unit = 'sq.m';
      particulars = `${section.sectionCode} ${chStr}: Prime Coat & Tack Coat Bituminous Spray (W=${cwW.toFixed(2)}m)`;
      break;
    }

    case 'road_asphalt': {
      const cwW = topW > 2.0 ? topW : 5.5;
      const asphaltT = 0.05; // 50mm
      qty = parseFloat((len * cwW * asphaltT).toFixed(3));
      br = cwW;
      ht = asphaltT;
      particulars = `${section.sectionCode} ${chStr}: Asphalt Concrete Wearing Course (W=${cwW.toFixed(2)}m, T=50mm)`;
      break;
    }

    case 'road_pqc_concrete': {
      const cwW = topW > 2.0 ? topW : 5.5;
      const pqcT = 0.20; // 200mm PQC
      qty = parseFloat((len * cwW * pqcT).toFixed(3));
      br = cwW;
      ht = pqcT;
      particulars = `${section.sectionCode} ${chStr}: Pavement Quality Concrete (PQC M30/M40) Slab (W=${cwW.toFixed(2)}m, T=0.20m)`;
      break;
    }

    case 'road_dlc': {
      const dlcW = (topW > 2.0 ? topW : 5.5) + 0.4;
      const dlcT = 0.10;
      qty = parseFloat((len * dlcW * dlcT).toFixed(3));
      br = parseFloat(dlcW.toFixed(2));
      ht = dlcT;
      particulars = `${section.sectionCode} ${chStr}: Dry Lean Concrete (DLC M10) Sub-base (W=${dlcW.toFixed(2)}m, T=0.10m)`;
      break;
    }

    case 'road_gravel_shoulder': {
      const shW = 2.40; // 1.2m left + 1.2m right
      const shT = 0.15;
      qty = parseFloat((len * shW * shT).toFixed(3));
      br = shW;
      ht = shT;
      particulars = `${section.sectionCode} ${chStr}: Gravel Hard Shoulders Left & Right (Total W=2.40m, T=0.15m)`;
      break;
    }

    case 'road_joint_sealing': {
      const spacing = 4.5; // contraction joints every 4.5m
      const numTransverse = Math.max(1, Math.round(len / spacing));
      const cwW = topW > 2.0 ? topW : 5.5;
      const totalJointMeters = parseFloat((numTransverse * cwW + len).toFixed(2)); // transverse + longitudinal
      qty = totalJointMeters;
      len = totalJointMeters;
      br = 1;
      ht = 1;
      unit = 'm';
      particulars = `${section.sectionCode} ${chStr}: Contraction & Longitudinal Joint Grooving & Polysulphide Sealant (${numTransverse} Transverse + Long.)`;
      break;
    }

    case 'culvert_excavation': {
      const outerW = topW > 1.5 ? topW + 1.2 : 4.0;
      const depth = h > 1.0 ? h + 1.0 : 3.0;
      const bLength = len > 3.0 ? len : 7.5;
      qty = parseFloat((bLength * outerW * depth).toFixed(3));
      len = bLength;
      br = parseFloat(outerW.toFixed(2));
      ht = parseFloat(depth.toFixed(2));
      particulars = `${section.sectionCode} ${chStr}: Culvert Trench Deep Excavation (L=${bLength.toFixed(2)}m, W=${outerW.toFixed(2)}m, D=${depth.toFixed(2)}m)`;
      break;
    }

    case 'culvert_bedding_pcc': {
      const outerW = topW > 1.5 ? topW + 0.6 : 3.6;
      const bLength = len > 3.0 ? len : 7.5;
      const bedT = 0.10;
      qty = parseFloat((bLength * outerW * bedT).toFixed(3));
      len = bLength;
      br = parseFloat(outerW.toFixed(2));
      ht = bedT;
      particulars = `${section.sectionCode} ${chStr}: Bedding PCC M10 Leveling Concrete (L=${bLength.toFixed(2)}m, W=${outerW.toFixed(2)}m, T=0.10m)`;
      break;
    }

    case 'culvert_box_concrete': {
      const span = topW || 2.0;
      const clearH = h || 1.8;
      const tw = 0.25;
      const tt = 0.25;
      const tb = 0.30;
      const outerW = span + 2 * tw;
      const totalH = clearH + tt + tb;
      const bLength = len > 3.0 ? len : 7.5;

      const grossVol = bLength * outerW * totalH;
      const openingVol = bLength * span * clearH;
      const netBoxVol = parseFloat((grossVol - openingVol).toFixed(3));

      qty = netBoxVol;
      len = bLength;
      br = parseFloat(outerW.toFixed(2));
      ht = parseFloat(totalH.toFixed(2));
      particulars = `${section.sectionCode} ${chStr}: RCC (M20/25) Box Culvert Monolithic Concrete (Span=${span.toFixed(2)}m, H=${clearH.toFixed(2)}m, L=${bLength.toFixed(2)}m)`;
      break;
    }

    case 'culvert_pipe_nos': {
      const bLength = len > 3.0 ? len : 7.5;
      const pipeCount = component.userFactor || 1;
      const totalMeters = parseFloat((bLength * pipeCount).toFixed(2));
      qty = totalMeters;
      len = bLength;
      nos = pipeCount;
      unit = 'm';
      particulars = `${section.sectionCode} ${chStr}: NP3/NP4 Reinforced Concrete Hume Pipes (${pipeCount} Row(s) × ${bLength.toFixed(2)}m Barrel)`;
      break;
    }

    case 'culvert_pipe_bedding': {
      const bLength = len > 3.0 ? len : 7.5;
      const cradleW = 1.60;
      const cradleH = 0.35;
      qty = parseFloat((bLength * cradleW * cradleH).toFixed(3));
      len = bLength;
      br = cradleW;
      ht = cradleH;
      particulars = `${section.sectionCode} ${chStr}: Concrete Cradle Bedding for Hume Pipe (L=${bLength.toFixed(2)}m, W=1.60m, H=0.35m)`;
      break;
    }

    case 'culvert_slab_concrete': {
      const span = topW || 3.0;
      const bearing = 0.35;
      const totalSpan = span + 2 * bearing;
      const roadW = len > 3.0 ? len : 7.5;
      const slabT = 0.35;
      const kerbVol = 2 * (totalSpan * 0.30 * 0.30); // 2 Kerbs 0.30m x 0.30m
      const totalVol = parseFloat((totalSpan * roadW * slabT + kerbVol).toFixed(3));
      qty = totalVol;
      len = totalSpan;
      br = roadW;
      ht = slabT;
      particulars = `${section.sectionCode} ${chStr}: RCC (M20/25) Deck Slab & Kerbs (Span=${totalSpan.toFixed(2)}m, Road W=${roadW.toFixed(2)}m, T=${slabT.toFixed(2)}m)`;
      break;
    }

    case 'culvert_masonry_abutment': {
      const abutH = h || 2.2;
      const topAbutW = topW > 0.4 && topW < 1.5 ? topW : 0.70;
      const botAbutW = botW > 0.8 ? botW : 1.20;
      const avgAbutW = (topAbutW + botAbutW) / 2;
      const bLength = len > 3.0 ? len : 7.5;
      const twoAbutmentsVol = parseFloat((2 * (bLength * avgAbutW * abutH)).toFixed(3));
      qty = twoAbutmentsVol;
      nos = 2;
      len = bLength;
      br = parseFloat(avgAbutW.toFixed(2));
      ht = abutH;
      particulars = `${section.sectionCode} ${chStr}: Stone Masonry Abutment Walls (2 Nos × L=${bLength.toFixed(2)}m, AvgW=${avgAbutW.toFixed(2)}m, H=${abutH.toFixed(2)}m)`;
      break;
    }

    case 'culvert_wingwall_masonry': {
      const wingL = 3.50; // Standard 3.5m flared wing wall
      const wingTopW = 0.50;
      const wingBotW = 1.00;
      const avgWingW = (wingTopW + wingBotW) / 2;
      const startH = (h || 2.2) + 0.35;
      const endH = 0.90;
      const avgWingH = (startH + endH) / 2;
      const fourWingsVol = parseFloat((4 * (wingL * avgWingW * avgWingH)).toFixed(3));
      qty = fourWingsVol;
      nos = 4;
      len = wingL;
      br = parseFloat(avgWingW.toFixed(2));
      ht = parseFloat(avgWingH.toFixed(2));
      particulars = `${section.sectionCode} ${chStr}: Stone Masonry Flared Wing Walls (4 Nos × L=${wingL.toFixed(2)}m, AvgW=${avgWingW.toFixed(2)}m, AvgH=${avgWingH.toFixed(2)}m)`;
      break;
    }

    case 'culvert_lcap_concrete': {
      const bLength = len > 3.0 ? len : 7.5;
      const capW = 0.70;
      const capT = 0.20; // 200mm base seat
      const dirtH = 0.35; // 350mm dirt / ballast wall
      const dirtW = 0.20;
      const secArea = (capW * capT) + (dirtW * dirtH);
      const twoCapsVol = parseFloat((2 * (bLength * secArea)).toFixed(3));
      qty = twoCapsVol;
      nos = 2;
      len = bLength;
      br = capW;
      ht = parseFloat((capT + dirtH).toFixed(2));
      particulars = `${section.sectionCode} ${chStr}: RCC/PCC (M20) L-Cap Bed-Blocks & Dirt Walls (2 Nos × L=${bLength.toFixed(2)}m, Seat=${capW}m × ${capT}m + Dirt Wall=${dirtW}m × ${dirtH}m)`;
      break;
    }

    case 'culvert_waterproofing': {
      const outerW = topW > 1.5 ? topW + 0.6 : 3.0;
      const bLength = len > 3.0 ? len : 7.5;
      const totalArea = parseFloat((bLength * (outerW + 2 * (h || 1.8))).toFixed(3));
      qty = totalArea;
      len = bLength;
      br = outerW;
      ht = 1;
      unit = 'sq.m';
      particulars = `${section.sectionCode} ${chStr}: Bituminous Damp-Proofing Membrane (Top Slab + Side Walls)`;
      break;
    }

    case 'culvert_apron_pitching': {
      const cp = p as any;
      const hasApron = cp.hasLaunchingApron ?? true;
      const apronLoc = cp.launchingApronOption || (hasApron ? 'both' : 'none');
      const apronCount = !hasApron || apronLoc === 'none' ? 0 : (apronLoc === 'both' ? 2 : 1);
      const apronL = cp.launchingApronLength || 3.0;
      const apronT = cp.launchingApronThickness || 0.35;
      const apronW = topW > 1.5 ? topW + 2.0 : 5.5; // Spread width of apron at mouth
      
      const totalVol = parseFloat((apronCount * apronL * apronW * apronT).toFixed(3));
      qty = totalVol;
      nos = apronCount;
      len = apronL;
      br = parseFloat(apronW.toFixed(2));
      ht = apronT;
      unit = isItemSqM ? 'sq.m' : 'm3';
      if (isItemSqM) {
        qty = parseFloat((apronCount * apronL * apronW).toFixed(2));
        ht = 1;
      }
      particulars = `${section.sectionCode} ${chStr}: Flexible Stone Pitching / Gabion Launching Apron (${apronCount} Nos [${apronLoc.toUpperCase()}], L=${apronL.toFixed(2)}m, W=${apronW.toFixed(2)}m, T=${apronT.toFixed(2)}m)`;
      break;
    }

    case 'culvert_scour_wall_concrete': {
      const cp = p as any;
      const hasScour = cp.hasScourWall ?? true;
      const scourLoc = cp.scourWallLocation || (hasScour ? 'both' : 'none');
      const scourCount = !hasScour || scourLoc === 'none' ? 0 : (scourLoc === 'both' ? 2 : 1);
      const scourDepth = cp.scourWallDepth || 1.20;
      const scourThick = cp.scourWallThickness || 0.30;
      const scourW = topW > 1.5 ? topW + 1.2 : 4.5;
      
      const totalVol = parseFloat((scourCount * scourW * scourThick * scourDepth).toFixed(3));
      qty = totalVol;
      nos = scourCount;
      len = scourW;
      br = scourThick;
      ht = scourDepth;
      unit = 'm3';
      particulars = `${section.sectionCode} ${chStr}: Cutoff Scour / Curtain Drop Wall Concrete (${scourCount} Nos [${scourLoc.toUpperCase()}], W=${scourW.toFixed(2)}m, D=${scourDepth.toFixed(2)}m, T=${scourThick.toFixed(2)}m)`;
      break;
    }

    case 'formwork_shuttering': {
      // User Chosen Formwork Factor (No derived constraint)
      const userFactor = typeof component.userFactor === 'number' && !isNaN(component.userFactor) ? component.userFactor : 2.0;
      const formH = p.formworkHeight || h;
      qty = parseFloat((len * formH * userFactor).toFixed(3));
      nos = userFactor;
      len = l;
      br = 1;
      ht = formH;
      unit = 'sq.m';
      particulars = `${section.sectionCode} ${chStr}: Wall Formwork Shuttering (H=${formH.toFixed(2)}m, Factor=${userFactor}x)`;
      break;
    }

    case 'custom_multiplier':
    default: {
      const factor = component.userFactor || 1.0;
      qty = parseFloat((len * h * factor).toFixed(3));
      nos = 1;
      len = l;
      br = factor;
      ht = h;
      particulars = `${section.sectionCode} ${chStr}: ${component.name} (Custom Factor=${factor})`;
      break;
    }
  }

  return {
    quantity: qty,
    length: len,
    breadth: br,
    height: ht,
    no_of_units: nos,
    unit,
    particulars,
    remarks
  };
}

/**
 * Calculates Total Summed Quantity across all drawing sections for a specific component
 */
export function calculateTotalComponentQuantity(
  component: DynamicBOQComponentDef,
  sections: DrawingSectionDef[],
  boqItem?: BOQItem
): number {
  return sections.reduce((sum, sec) => {
    const res = calculateComponentQuantityForSection(component, sec, boqItem);
    return sum + res.quantity;
  }, 0);
}

/**
 * Generate Estimate MB Rows for a mapped component across sections
 */
export function generateEstimateMBRowsForComponent(
  component: DynamicBOQComponentDef,
  sections: DrawingSectionDef[],
  boqItem?: BOQItem
): any[] {
  return sections.map((sec) => {
    const calc = calculateComponentQuantityForSection(component, sec, boqItem);
    return {
      id: `mb_sec_${sec.id}_${component.id || component.key}`,
      particulars: calc.particulars,
      no_of_units: calc.no_of_units,
      length: parseFloat(calc.length.toFixed(3)),
      breadth: parseFloat(calc.breadth.toFixed(3)),
      height: parseFloat(calc.height.toFixed(3)),
      quantity: calc.quantity,
      remarks: calc.remarks
    };
  });
}

/**
 * Generate Valuation MB Rows (Running Bill) for a mapped component across sections
 */
export function generateValuationMBRowsForComponent(
  component: DynamicBOQComponentDef,
  sections: DrawingSectionDef[],
  options: {
    targetBookId: string;
    ipcNumber: number;
    dateBS: string;
    verifiedBy: string;
    variantKey: string;
  },
  boqItem?: BOQItem
): ValuationMBRow[] {
  return sections.map((sec) => {
    const calc = calculateComponentQuantityForSection(component, sec, boqItem);
    return {
      id: `vmb_row_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      mb_id: options.targetBookId,
      mb_book_id: options.targetBookId,
      boq_item_id: component.mappedItemId || '',
      ipc_number: options.ipcNumber,
      date_iso: options.dateBS,
      particulars: calc.particulars,
      no_of_units: calc.no_of_units,
      length: calc.length,
      breadth: calc.breadth,
      height: calc.height,
      quantity_this_bill: calc.quantity,
      unit: calc.unit,
      verified_by: options.verifiedBy,
      remarks: `CAD As-Built ${sec.sectionCode}`,
      custom_fields: {
        sectionId: sec.id,
        sectionCode: sec.sectionCode,
        chainageStart: sec.chainageStart,
        chainageEnd: sec.chainageEnd,
        componentKey: component.key,
        componentName: component.name,
        variantKey: options.variantKey
      }
    };
  });
}

/**
 * Alias for calculateComponentQuantityForSection to calculate MB values for a component and section
 */
export const calculateComponentMBValues = calculateComponentQuantityForSection;

/**
 * Alias for autoMatchComponentsToProjectBOQ
 */
export const autoMatchComponentsForProject = autoMatchComponentsToProjectBOQ;


