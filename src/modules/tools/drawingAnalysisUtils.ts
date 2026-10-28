import { DrawingTemplateDef, TemplateWorkItemOutput } from '../../types';

// ----------------------------------------------------
// 1. HYDRAULIC & STABILITY ANALYSIS
// ----------------------------------------------------

export interface HydraulicAnalysisResult {
  waterwayArea: number; // A (m2)
  wettedPerimeter: number; // P (m)
  hydraulicRadius: number; // R = A/P (m)
  flowVelocity: number; // V = (1/n) * R^(2/3) * S^(1/2) (m/s)
  dischargeM3s: number; // Q = A * V (m3/s)
  dischargeLps: number; // Q in Liters/sec
  froudeNumber: number; // Fr = V / sqrt(g * D_h)
  flowRegime: 'Subcritical (Fr < 1)' | 'Critical (Fr = 1)' | 'Supercritical (Fr > 1)';
  velocityStatus: 'safe' | 'warning_silting' | 'danger_scouring';
  velocityMessage: string;
}

export interface StabilityAnalysisResult {
  overturningMoment_kNm: number; // Mo (kNm/m)
  resistingMoment_kNm: number; // Mr (kNm/m)
  factorOfSafetyOverturning: number; // FSO = Mr / Mo
  isOverturningSafe: boolean;
  drivingForce_kN: number; // Pa (kN/m)
  resistingForce_kN: number; // Fr = mu * W (kN/m)
  factorOfSafetySliding: number; // FSS = Fr / Pa
  isSlidingSafe: boolean;
  totalWeight_kN: number; // W (kN/m)
  maxBasePressure_kPa: number; // q_max (kN/m2)
  minBasePressure_kPa: number; // q_min (kN/m2)
  eccentricity_m: number; // e (m)
  isEccentricitySafe: boolean; // e <= B/6 (No tension in base)
}

export interface BBSRebarItem {
  barMark: string;
  description: string;
  diameterMm: number;
  shapeType?: 'STRAIGHT' | 'L_BEND' | 'U_HOOK' | 'RECT_STIRRUP' | 'CRANKED_BENT_UP' | 'CHAIR_BAR' | 'CAP_BAR' | 'HAUNCH_TIE' | 'CIRCULAR_TIE' | 'CUSTOM_MULTI_SEGMENT';
  shapeCode?: string;
  shapeDescription: string;
  spacingMm: number;
  segmentA_m?: number;
  segmentB_m?: number;
  segmentC_m?: number;
  segmentD_m?: number;
  segmentE_m?: number;
  segmentF_m?: number;
  formulaExpression?: string;
  dimensionDriverDesc?: string;
  cuttingLengthM: number;
  noOfBars: number;
  totalLengthM: number;
  unitWeightKgM: number; // d^2 / 162.28
  totalWeightKg: number;
}

export interface MultiStationMBRow {
  stationIndex: number;
  chainageFrom: string;
  chainageTo: string;
  lengthM: number;
  items: {
    itemName: string;
    unit: string;
    quantity: number;
    formula: string;
  }[];
}

// ----------------------------------------------------
// HYDRAULIC CALCULATION (Manning's Formula)
// ----------------------------------------------------
export function calculateHydraulics(
  templateSvgType: string,
  params: Record<string, number>,
  bedSlope: number = 0.01, // S = 1% (1 in 100) default
  manningsN: number = 0.015 // Smooth concrete / finished plaster
): HydraulicAnalysisResult | null {
  let A = 0;
  let P = 0;

  if (templateSvgType === 'trapezoidal_drain') {
    const b = params.bed_width || 0.60;
    const d = (params.drain_depth || 0.60) - (params.freeboard || 0.10); // water depth
    const z = params.side_slope_z || 0.5;
    A = (b + z * d) * d;
    P = b + 2 * d * Math.sqrt(1 + z * z);
  } else if (templateSvgType === 'rcc_box_drain') {
    const W = params.clear_width || 0.75;
    const H = (params.clear_depth || 0.80) * 0.85; // 85% full design depth
    A = W * H;
    P = W + 2 * H;
  } else if (templateSvgType === 'saucer_drain') {
    const Ws = params.saucer_width || 0.60;
    const dc = params.center_dish_depth || 0.10;
    A = (2 / 3) * Ws * dc; // Parabolic approximation
    P = Ws + (8 / 3) * (dc * dc / Ws);
  } else if (templateSvgType === 'box_culvert') {
    const S = params.clear_span || 2.50;
    const H = (params.clear_height || 2.00) * 0.80; // 80% full
    A = S * H;
    P = S + 2 * H;
  } else if (templateSvgType === 'slab_culvert') {
    const S = params.clear_span || 4.00;
    const Hab = (params.abutment_height || 2.80) * 0.70;
    A = S * Hab;
    P = S + 2 * Hab;
  } else if (templateSvgType === 'pipe_culvert') {
    const D = params.pipe_diameter_m || 0.90;
    const Np = params.no_of_pipe_rows || 1;
    // 80% full circular pipe flow approx
    A = Np * (0.8 * Math.PI * (D / 2) * (D / 2));
    P = Np * (0.8 * Math.PI * D);
  } else {
    return null;
  }

  if (A <= 0 || P <= 0) return null;

  const R = A / P;
  const V = (1 / manningsN) * Math.pow(R, 2 / 3) * Math.sqrt(bedSlope);
  const Q = A * V;
  const hydraulicDepth = A / (P / 2); // approx top width
  const Fr = V / Math.sqrt(9.81 * Math.max(0.1, hydraulicDepth));

  let flowRegime: HydraulicAnalysisResult['flowRegime'] = 'Subcritical (Fr < 1)';
  if (Fr > 1.05) flowRegime = 'Supercritical (Fr > 1)';
  else if (Fr >= 0.95 && Fr <= 1.05) flowRegime = 'Critical (Fr = 1)';

  let velocityStatus: HydraulicAnalysisResult['velocityStatus'] = 'safe';
  let velocityMessage = 'Flow velocity is within optimal non-silting & non-scouring limits (0.6 - 3.0 m/s).';

  if (V < 0.6) {
    velocityStatus = 'warning_silting';
    velocityMessage = 'Velocity is low (< 0.6 m/s); silt deposition may occur. Consider increasing channel bed slope.';
  } else if (V > 3.0) {
    velocityStatus = 'danger_scouring';
    velocityMessage = 'Velocity is high (> 3.0 m/s); excessive turbulence & bed scouring likely. Consider bed drops or energy dissipators.';
  }

  return {
    waterwayArea: Number(A.toFixed(4)),
    wettedPerimeter: Number(P.toFixed(3)),
    hydraulicRadius: Number(R.toFixed(4)),
    flowVelocity: Number(V.toFixed(2)),
    dischargeM3s: Number(Q.toFixed(3)),
    dischargeLps: Number((Q * 1000).toFixed(1)),
    froudeNumber: Number(Fr.toFixed(2)),
    flowRegime,
    velocityStatus,
    velocityMessage
  };
}

// ----------------------------------------------------
// RETAINING WALL STABILITY ANALYSIS (Rankine's Theory)
// ----------------------------------------------------
export function calculateWallStability(
  params: Record<string, number>,
  soilUnitWeight: number = 18, // gamma = 18 kN/m3
  soilPhiDeg: number = 30, // phi = 30 deg
  masonryUnitWeight: number = 22, // gamma_m = 22 kN/m3
  frictionCoeff: number = 0.50, // mu = 0.50
  soilSBC: number = 180 // Safe Bearing Capacity (kPa)
): StabilityAnalysisResult {
  const H = params.retaining_height_m || 3.50;
  const btop = params.crest_top_width_m || 0.60;
  const sf = params.front_batter_ratio || 0.167; // 1:6
  const sb = params.back_batter_ratio || 0.333; // 1:3
  const Df = params.foundation_depth_m || 1.20;

  const totalH = H + Df;
  const stemBaseW = btop + sf * H + sb * H;
  const baseB = stemBaseW + 0.60; // Footing offsets

  // Rankine Active Earth Pressure Coefficient
  const phiRad = (soilPhiDeg * Math.PI) / 180;
  const Ka = (1 - Math.sin(phiRad)) / (1 + Math.sin(phiRad)); // ~0.333

  // Active Thrust Pa
  const Pa = 0.5 * soilUnitWeight * totalH * totalH * Ka; // kN per meter
  const Mo = Pa * (totalH / 3); // Overturning moment about toe

  // Wall Self-Weight breakdown (Rectangular + 2 Triangular parts + Footing)
  const wRect = btop * H * masonryUnitWeight;
  const wFrontTri = 0.5 * (sf * H) * H * masonryUnitWeight;
  const wBackTri = 0.5 * (sb * H) * H * masonryUnitWeight;
  const wFooting = baseB * Df * masonryUnitWeight;
  const wSoilBack = 0.5 * (sb * H) * H * soilUnitWeight; // soil weight on back batter

  const totalW = wRect + wFrontTri + wBackTri + wFooting + wSoilBack;

  // Lever arms about toe
  const xFooting = baseB / 2;
  const xFrontTri = 0.30 + (2 / 3) * (sf * H);
  const xRect = 0.30 + sf * H + btop / 2;
  const xBackTri = 0.30 + sf * H + btop + (1 / 3) * (sb * H);
  const xSoilBack = 0.30 + sf * H + btop + (2 / 3) * (sb * H);

  const Mr =
    wFooting * xFooting +
    wFrontTri * xFrontTri +
    wRect * xRect +
    wBackTri * xBackTri +
    wSoilBack * xSoilBack;

  const FSO = Number((Mr / Math.max(1, Mo)).toFixed(2));
  const isOverturningSafe = FSO >= 2.0;

  const Fr = totalW * frictionCoeff;
  const FSS = Number((Fr / Math.max(1, Pa)).toFixed(2));
  const isSlidingSafe = FSS >= 1.5;

  // Resultant position x_bar from toe
  const xBar = (Mr - Mo) / totalW;
  const eccentricity = Number((baseB / 2 - xBar).toFixed(3));
  const isEccentricitySafe = Math.abs(eccentricity) <= baseB / 6;

  // Base pressure distribution
  const qMax = Number(((totalW / baseB) * (1 + (6 * eccentricity) / baseB)).toFixed(1));
  const qMin = Number(((totalW / baseB) * (1 - (6 * eccentricity) / baseB)).toFixed(1));

  return {
    overturningMoment_kNm: Number(Mo.toFixed(1)),
    resistingMoment_kNm: Number(Mr.toFixed(1)),
    factorOfSafetyOverturning: FSO,
    isOverturningSafe,
    drivingForce_kN: Number(Pa.toFixed(1)),
    resistingForce_kN: Number(Fr.toFixed(1)),
    factorOfSafetySliding: FSS,
    isSlidingSafe,
    totalWeight_kN: Number(totalW.toFixed(1)),
    maxBasePressure_kPa: qMax,
    minBasePressure_kPa: qMin,
    eccentricity_m: eccentricity,
    isEccentricitySafe
  };
}

// ----------------------------------------------------
// BAR BENDING SCHEDULE (BBS) GENERATOR (DYNAMIC A-F SEGMENTS)
// ----------------------------------------------------
export function generateBarBendingSchedule(
  templateSvgType: string,
  params: Record<string, number>
): BBSRebarItem[] {
  const bbs: BBSRebarItem[] = [];

  const getWeightPerM = (dia: number) => (dia * dia) / 162.28;

  if (templateSvgType === 'slab_culvert') {
    const span = params.clear_span || 4.0;
    const Lb = params.deck_width || params.barrel_length || 8.0;
    const Ts = params.slab_thickness || params.deck_slab_thickness || 0.35;
    const wtop = params.abutment_top_width || 0.65;
    const bearing = params.bearing_length || (wtop ? Number((wtop * 0.6).toFixed(2)) : 0.40);
    const LcapThk = params.bed_block_thickness || params.l_cap_thickness || 0.25;
    const dirtH = params.dirt_wall_height || Number((Ts + 0.05).toFixed(2));
    const kerbW = params.kerb_width || 0.30;
    const kerbH = params.kerb_height || 0.30;

    const cover = 0.04; // 40mm cover

    // 1. Deck Slab Bottom Main Tension Bar (Double L-Bend U-Bar, Shape 21)
    const segA1 = Number((span + 2 * bearing - 2 * cover).toFixed(3));
    const segB1 = Number((Ts - 2 * cover).toFixed(3));
    const segC1 = segB1;
    const dia1 = 16;
    const space1 = 125;
    const cut1 = Number((segA1 + segB1 + segC1 - 2 * 2 * (dia1 / 1000)).toFixed(2));
    const no1 = Math.floor((Lb - 2 * cover) / (space1 / 1000)) + 1;
    const totalLen1 = Number((no1 * cut1).toFixed(1));
    const wt1 = Number((totalLen1 * getWeightPerM(dia1)).toFixed(1));

    bbs.push({
      barMark: 'SC-01',
      description: 'Deck Slab Bottom Main Tension Reinforcement (Waterway Span)',
      diameterMm: dia1,
      shapeType: 'U_HOOK',
      shapeCode: '21',
      shapeDescription: 'Double L-Bend U-Bar with 90° returns into slab edge',
      spacingMm: space1,
      segmentA_m: segA1,
      segmentB_m: segB1,
      segmentC_m: segC1,
      formulaExpression: `A(${segA1}m) + B(${segB1}m) + C(${segC1}m) - 2×2d = ${cut1}m`,
      dimensionDriverDesc: `Deck Width (${Lb}m) @ ${space1}mm c/c`,
      cuttingLengthM: cut1,
      noOfBars: no1,
      totalLengthM: totalLen1,
      unitWeightKgM: Number(getWeightPerM(dia1).toFixed(3)),
      totalWeightKg: wt1
    });

    // 2. Deck Slab Top & Bottom Distribution Bars (Straight, Shape 00)
    const segA2 = Number((Lb - 2 * cover).toFixed(3));
    const dia2 = 10;
    const space2 = 150;
    const cut2 = segA2;
    const deckSpanTotal = span + 2 * bearing;
    const baseNos2 = Math.floor((deckSpanTotal - 2 * cover) / (space2 / 1000)) + 1;
    const no2 = baseNos2 * 2; // 2 layers (Top & Bottom)
    const totalLen2 = Number((no2 * cut2).toFixed(1));
    const wt2 = Number((totalLen2 * getWeightPerM(dia2)).toFixed(1));

    bbs.push({
      barMark: 'SC-02',
      description: 'Deck Slab Longitudinal Distribution Bars (Top & Bottom Mats)',
      diameterMm: dia2,
      shapeType: 'STRAIGHT',
      shapeCode: '00',
      shapeDescription: 'Straight distribution bars',
      spacingMm: space2,
      segmentA_m: segA2,
      formulaExpression: `A(${segA2}m) = ${cut2}m`,
      dimensionDriverDesc: `Deck Span (${deckSpanTotal.toFixed(2)}m) @ ${space2}mm c/c × 2 Layers`,
      cuttingLengthM: cut2,
      noOfBars: no2,
      totalLengthM: totalLen2,
      unitWeightKgM: Number(getWeightPerM(dia2).toFixed(3)),
      totalWeightKg: wt2
    });

    // 3. RCC L-Cap Bed Block Closed Stirrups (Shape 51)
    const segA3 = Number((bearing - 2 * 0.035).toFixed(3));
    const segB3 = Number((LcapThk - 2 * 0.035).toFixed(3));
    const dia3 = 10;
    const space3 = 150;
    const cut3 = Number((2 * (segA3 + segB3) + 2 * 0.10 - 5 * 2 * (dia3 / 1000)).toFixed(2));
    const noPerAbutment = Math.floor((Lb - 2 * 0.035) / (space3 / 1000)) + 1;
    const no3 = noPerAbutment * 2; // 2 Abutments
    const totalLen3 = Number((no3 * cut3).toFixed(1));
    const wt3 = Number((totalLen3 * getWeightPerM(dia3)).toFixed(1));

    bbs.push({
      barMark: 'SC-03',
      description: 'L-Cap Bed-Block Closed Shear Stirrups (Both Abutments)',
      diameterMm: dia3,
      shapeType: 'RECT_STIRRUP',
      shapeCode: '51',
      shapeDescription: 'Closed rectangular tie with 135° seismic end hooks',
      spacingMm: space3,
      segmentA_m: segA3,
      segmentB_m: segB3,
      segmentC_m: segA3,
      segmentD_m: segB3,
      segmentE_m: 0.10,
      segmentF_m: 0.10,
      formulaExpression: `2×(A+B) + 2×Hook(0.10) - 5×2d = ${cut3}m`,
      dimensionDriverDesc: `Abutment Length (${Lb}m) @ ${space3}mm c/c × 2 Abutments`,
      cuttingLengthM: cut3,
      noOfBars: no3,
      totalLengthM: totalLen3,
      unitWeightKgM: Number(getWeightPerM(dia3).toFixed(3)),
      totalWeightKg: wt3
    });

    // 4. L-Cap Ballast Dirt Wall Vertical L-Bars (Shape 11)
    const segA4 = Number((dirtH + LcapThk - 0.035).toFixed(3));
    const segB4 = 0.35;
    const dia4 = 12;
    const space4 = 150;
    const cut4 = Number((segA4 + segB4 - 2 * (dia4 / 1000)).toFixed(2));
    const no4 = (Math.floor((Lb - 2 * 0.035) / (space4 / 1000)) + 1) * 2; // 2 dirt walls
    const totalLen4 = Number((no4 * cut4).toFixed(1));
    const wt4 = Number((totalLen4 * getWeightPerM(dia4)).toFixed(1));

    bbs.push({
      barMark: 'SC-04',
      description: 'L-Cap Ballast Dirt Wall Vertical Anchorage Bars (2 Abutments)',
      diameterMm: dia4,
      shapeType: 'L_BEND',
      shapeCode: '11',
      shapeDescription: '90° L-bar anchored into bed-block',
      spacingMm: space4,
      segmentA_m: segA4,
      segmentB_m: segB4,
      formulaExpression: `A(${segA4}m) + B(${segB4}m) - 2d = ${cut4}m`,
      dimensionDriverDesc: `Dirt Wall Length (${Lb}m) @ ${space4}mm c/c × 2 Walls`,
      cuttingLengthM: cut4,
      noOfBars: no4,
      totalLengthM: totalLen4,
      unitWeightKgM: Number(getWeightPerM(dia4).toFixed(3)),
      totalWeightKg: wt4
    });

    // 5. Crash Kerb / Wheel Guard U-Ties (Shape 21)
    const segA5 = Number((kerbW - 2 * 0.025).toFixed(3));
    const segB5 = Number((kerbH + 0.20).toFixed(3));
    const dia5 = 10;
    const space5 = 200;
    const cut5 = Number((segA5 + 2 * segB5 - 4 * (dia5 / 1000)).toFixed(2));
    const no5 = (Math.floor((Lb - 2 * 0.025) / (space5 / 1000)) + 1) * 2; // 2 side kerbs
    const totalLen5 = Number((no5 * cut5).toFixed(1));
    const wt5 = Number((totalLen5 * getWeightPerM(dia5)).toFixed(1));

    bbs.push({
      barMark: 'SC-05',
      description: 'Crash Kerb / Wheel Guard U-Ties Embedded in Deck Slab',
      diameterMm: dia5,
      shapeType: 'U_HOOK',
      shapeCode: '21',
      shapeDescription: 'Inverted U-bar tie',
      spacingMm: space5,
      segmentA_m: segA5,
      segmentB_m: segB5,
      segmentC_m: segB5,
      formulaExpression: `A(${segA5}m) + B(${segB5}m) + C(${segB5}m) - 4d = ${cut5}m`,
      dimensionDriverDesc: `Culvert Roadway (${Lb}m) @ ${space5}mm c/c × 2 Kerbs`,
      cuttingLengthM: cut5,
      noOfBars: no5,
      totalLengthM: totalLen5,
      unitWeightKgM: Number(getWeightPerM(dia5).toFixed(3)),
      totalWeightKg: wt5
    });
  } else if (templateSvgType === 'rcc_box_drain') {
    const L = params.reach_length || 150;
    const W = params.clear_width || 0.75;
    const H = params.clear_depth || 0.80;
    const tw = params.wall_thickness || 0.15;
    const tb = params.base_slab_thickness || 0.15;
    const cover = 0.03;

    // 1. U-shaped main transverse bar (Base + 2 Walls)
    const segA = Number((W + 2 * tw - 2 * cover).toFixed(3));
    const segB = Number((H + tb - cover).toFixed(3));
    const segC = segB;
    const diaU = 10;
    const spacingU = 150;
    const cutLenU = Number((segA + segB + segC - 2 * 2 * (diaU / 1000)).toFixed(2));
    const noOfBarsU = Math.floor((L - 2 * cover) / (spacingU / 1000)) + 1;
    const totalLenU = Number((cutLenU * noOfBarsU).toFixed(1));
    const wtU = Number((totalLenU * getWeightPerM(diaU)).toFixed(1));

    bbs.push({
      barMark: 'DR-01',
      description: 'Main Transverse U-Bars (Bottom Base Slab & Both Side Wall Faces)',
      diameterMm: diaU,
      shapeType: 'U_HOOK',
      shapeCode: '21',
      shapeDescription: 'Channel U-Shape with 90° upright legs',
      spacingMm: spacingU,
      segmentA_m: segA,
      segmentB_m: segB,
      segmentC_m: segC,
      formulaExpression: `A(${segA}m) + B(${segB}m) + C(${segC}m) - 4d = ${cutLenU}m`,
      dimensionDriverDesc: `Reach Length (${L}m) @ ${spacingU}mm c/c`,
      cuttingLengthM: cutLenU,
      noOfBars: noOfBarsU,
      totalLengthM: totalLenU,
      unitWeightKgM: Number(getWeightPerM(diaU).toFixed(3)),
      totalWeightKg: wtU
    });

    // 2. Longitudinal distribution bars
    const diaDist = 8;
    const barsPerSection = 8;
    const cutDist = Number(L.toFixed(2));
    const totalDistLen = Number((L * barsPerSection * 1.05).toFixed(1)); // 5% lap
    const wtDist = Number((totalDistLen * getWeightPerM(diaDist)).toFixed(1));

    bbs.push({
      barMark: 'DR-02',
      description: 'Longitudinal Distribution Bars in Base Slab & Walls',
      diameterMm: diaDist,
      shapeType: 'STRAIGHT',
      shapeCode: '00',
      shapeDescription: 'Straight distribution bars',
      spacingMm: 200,
      segmentA_m: cutDist,
      formulaExpression: `A(${cutDist}m) = ${cutDist}m`,
      dimensionDriverDesc: `Drain Reach (${L}m) × ${barsPerSection} Continuous Lines`,
      cuttingLengthM: cutDist,
      noOfBars: barsPerSection,
      totalLengthM: totalDistLen,
      unitWeightKgM: Number(getWeightPerM(diaDist).toFixed(3)),
      totalWeightKg: wtDist
    });

    // 3. Precast Cover Slab Reinforcement Mesh
    const diaCov = 8;
    const covSpan = Number((W + 2 * tw + 0.10 - 2 * 0.02).toFixed(3));
    const noSlabs = Math.ceil(L / 0.50); // 50cm precast slabs
    const barsPerSlab = 5;
    const totalCovBars = noSlabs * barsPerSlab;
    const totalCovLen = Number((totalCovBars * covSpan).toFixed(1));
    const wtCov = Number((totalCovLen * getWeightPerM(diaCov)).toFixed(1));

    bbs.push({
      barMark: 'DR-03',
      description: 'Precast Cover Slab Transverse Reinforcement Mesh',
      diameterMm: diaCov,
      shapeType: 'STRAIGHT',
      shapeCode: '00',
      shapeDescription: 'Straight bars with end cover hooks',
      spacingMm: 100,
      segmentA_m: covSpan,
      formulaExpression: `A(${covSpan}m) = ${covSpan}m`,
      dimensionDriverDesc: `${noSlabs} Precast Slabs × 5 Bars`,
      cuttingLengthM: covSpan,
      noOfBars: totalCovBars,
      totalLengthM: totalCovLen,
      unitWeightKgM: Number(getWeightPerM(diaCov).toFixed(3)),
      totalWeightKg: wtCov
    });
  } else if (templateSvgType === 'box_culvert') {
    const S = params.clear_span || 2.50;
    const H = params.clear_height || 2.00;
    const Lb = params.barrel_length || 8.50;
    const tw = params.wall_thickness || 0.30;
    const tb = params.bottom_slab_thickness || 0.30;
    const ttop = params.top_slab_thickness || 0.30;
    const haunch = params.haunch_size || 0.25;
    const cover = 0.04;

    // Top & Bottom Slab Main Tension Bars (Ø16 @ 125)
    const diaMain = 16;
    const segA_b = Number((S + 2 * tw - 2 * cover).toFixed(3));
    const segB_b = Number((tb + 0.30 - cover).toFixed(3));
    const cutMain = Number((segA_b + 2 * segB_b - 4 * (diaMain / 1000)).toFixed(2));
    const noMainSingle = Math.floor((Lb - 2 * cover) / 0.125) + 1;
    const noMain = noMainSingle * 2; // Top & Bottom
    const totalLenMain = Number((noMain * cutMain).toFixed(1));
    const wtMain = Number((totalLenMain * getWeightPerM(diaMain)).toFixed(1));

    bbs.push({
      barMark: 'BC-01',
      description: 'Top & Bottom Slabs Main Transverse Bars (Outer/Inner Faces)',
      diameterMm: diaMain,
      shapeType: 'U_HOOK',
      shapeCode: '21',
      shapeDescription: 'Double L-Bend U-bar with anchorage returns',
      spacingMm: 125,
      segmentA_m: segA_b,
      segmentB_m: segB_b,
      segmentC_m: segB_b,
      formulaExpression: `A(${segA_b}m) + B(${segB_b}m) + C(${segB_b}m) - 4d = ${cutMain}m`,
      dimensionDriverDesc: `Barrel Length (${Lb}m) @ 125mm c/c × 2 Slabs`,
      cuttingLengthM: cutMain,
      noOfBars: noMain,
      totalLengthM: totalLenMain,
      unitWeightKgM: Number(getWeightPerM(diaMain).toFixed(3)),
      totalWeightKg: wtMain
    });

    // Wall Vertical Reinforcement (Ø12 @ 150)
    const diaWall = 12;
    const segA_w = Number((H + tb + ttop - 2 * cover).toFixed(3));
    const segB_w = 0.35;
    const cutWall = Number((segA_w + segB_w - 2 * (diaWall / 1000)).toFixed(2));
    const noWallPerFace = Math.floor((Lb - 2 * cover) / 0.150) + 1;
    const noWall = noWallPerFace * 4; // 2 sidewalls * 2 faces
    const totalLenWall = Number((noWall * cutWall).toFixed(1));
    const wtWall = Number((totalLenWall * getWeightPerM(diaWall)).toFixed(1));

    bbs.push({
      barMark: 'BC-02',
      description: 'Side Abutment Walls Vertical Main Bars (2 Walls × 2 Faces)',
      diameterMm: diaWall,
      shapeType: 'L_BEND',
      shapeCode: '11',
      shapeDescription: '90° L-bar with starter anchorage into slab',
      spacingMm: 150,
      segmentA_m: segA_w,
      segmentB_m: segB_w,
      formulaExpression: `A(${segA_w}m) + B(${segB_w}m) - 2d = ${cutWall}m`,
      dimensionDriverDesc: `Barrel Length (${Lb}m) @ 150mm c/c × 4 Faces`,
      cuttingLengthM: cutWall,
      noOfBars: noWall,
      totalLengthM: totalLenWall,
      unitWeightKgM: Number(getWeightPerM(diaWall).toFixed(3)),
      totalWeightKg: wtWall
    });

    // Corner Haunch Diagonal Ties (Ø12 @ 150)
    const diaHaunch = 12;
    const segA_h = Number((Math.SQRT2 * haunch).toFixed(3));
    const segB_h = 0.35;
    const cutHaunch = Number((segA_h + 2 * segB_h).toFixed(2));
    const noHaunch = (Math.floor((Lb - 2 * cover) / 0.150) + 1) * 4; // 4 corners
    const totalLenHaunch = Number((noHaunch * cutHaunch).toFixed(1));
    const wtHaunch = Number((totalLenHaunch * getWeightPerM(diaHaunch)).toFixed(1));

    bbs.push({
      barMark: 'BC-03',
      description: 'Internal Corner Haunches 45° Diagonal Reinforcement Ties',
      diameterMm: diaHaunch,
      shapeType: 'HAUNCH_TIE',
      shapeCode: '61',
      shapeDescription: '45° Diagonal bar with anchorage legs',
      spacingMm: 150,
      segmentA_m: segA_h,
      segmentB_m: segB_h,
      segmentC_m: segB_h,
      formulaExpression: `A(${segA_h}m) + B(${segB_h}m) + C(${segB_h}m) = ${cutHaunch}m`,
      dimensionDriverDesc: `Barrel Length (${Lb}m) @ 150mm c/c × 4 Haunch Corners`,
      cuttingLengthM: cutHaunch,
      noOfBars: noHaunch,
      totalLengthM: totalLenHaunch,
      unitWeightKgM: Number(getWeightPerM(diaHaunch).toFixed(3)),
      totalWeightKg: wtHaunch
    });

    // Longitudinal Distribution (Ø10 @ 200)
    const diaDist = 10;
    const cutDist = Number(Lb.toFixed(2));
    const boxPerimeter = 2 * (S + 2 * tw) + 2 * (H + tb + ttop);
    const noDistBars = Math.floor((boxPerimeter - 4 * cover) / 0.200) + 1;
    const totalDistLen = Number((noDistBars * cutDist * 1.08).toFixed(1)); // 8% lap
    const wtDist = Number((totalDistLen * getWeightPerM(diaDist)).toFixed(1));

    bbs.push({
      barMark: 'BC-04',
      description: 'Longitudinal Distribution Rebar in Top/Bottom Slabs & Walls',
      diameterMm: diaDist,
      shapeType: 'STRAIGHT',
      shapeCode: '00',
      shapeDescription: 'Straight distribution bars with laps',
      spacingMm: 200,
      segmentA_m: cutDist,
      formulaExpression: `A(${cutDist}m) = ${cutDist}m`,
      dimensionDriverDesc: `Perimeter (${boxPerimeter.toFixed(2)}m) @ 200mm c/c`,
      cuttingLengthM: cutDist,
      noOfBars: noDistBars,
      totalLengthM: totalDistLen,
      unitWeightKgM: Number(getWeightPerM(diaDist).toFixed(3)),
      totalWeightKg: wtDist
    });
  } else if (templateSvgType === 'road_rigid') {
    const L = params.road_length_m || 300;
    const W = params.slab_width || 6.00;
    const jointSpacing = params.joint_spacing_m || 4.00;

    // Dowel Bars at Transverse Contraction Joints (Ø25 @ 300mm c/c)
    const noJoints = Math.floor(L / jointSpacing);
    const barsPerJoint = Math.floor((W - 0.30) / 0.30);
    const totalDowelBars = noJoints * barsPerJoint;
    const dowelLen = 0.50; // 500mm
    const wtDowel = Number((totalDowelBars * dowelLen * getWeightPerM(25)).toFixed(1));

    bbs.push({
      barMark: 'PQC-01',
      description: 'Mild Steel Epoxy-Coated Dowel Bars (Ø25 @ Contraction Joints)',
      diameterMm: 25,
      shapeType: 'STRAIGHT',
      shapeCode: '00',
      shapeDescription: 'Straight round bar with debonding sleeve',
      spacingMm: 300,
      segmentA_m: dowelLen,
      formulaExpression: `A(0.50m) = 0.50m`,
      dimensionDriverDesc: `${noJoints} Joints × ${barsPerJoint} Bars across ${W}m Width`,
      cuttingLengthM: 0.50,
      noOfBars: totalDowelBars,
      totalLengthM: Number((totalDowelBars * dowelLen).toFixed(1)),
      unitWeightKgM: Number(getWeightPerM(25).toFixed(3)),
      totalWeightKg: wtDowel
    });

    // Tie Bars at Longitudinal Centerline Joint (Ø12 @ 600mm c/c)
    const noTieBars = Math.floor(L / 0.60);
    const tieLen = 0.64; // 640mm
    const wtTie = Number((noTieBars * tieLen * getWeightPerM(12)).toFixed(1));

    bbs.push({
      barMark: 'PQC-02',
      description: 'Deformed TMT Fe500 Tie Bars (Ø12 @ Longitudinal Joint)',
      diameterMm: 12,
      shapeType: 'STRAIGHT',
      shapeCode: '00',
      shapeDescription: 'Straight deformed bar with central plastic sleeve',
      spacingMm: 600,
      segmentA_m: tieLen,
      formulaExpression: `A(0.64m) = 0.64m`,
      dimensionDriverDesc: `Road Length (${L}m) @ 600mm c/c`,
      cuttingLengthM: 0.64,
      noOfBars: noTieBars,
      totalLengthM: Number((noTieBars * tieLen).toFixed(1)),
      unitWeightKgM: Number(getWeightPerM(12).toFixed(3)),
      totalWeightKg: wtTie
    });
  } else if (templateSvgType === 'retaining_wall') {
    const H = params.retaining_height_m || params.wall_height || 3.50;
    const L = params.wall_length_m || 60.0;
    const btop = params.crest_top_width_m || 0.60;
    const sf = params.front_batter_ratio || 0.167;
    const sb = params.back_batter_ratio || 0.333;
    const bbot = btop + sf * H + sb * H;
    const Df = params.foundation_depth_m || params.foundation_depth || 1.20;
    const cover = 0.05;

    // 1. Stem Main Vertical Rebar
    const segA = Number((H + Df - 2 * cover).toFixed(3));
    const segB = Number((bbot * 0.70).toFixed(3));
    const dia1 = 16;
    const space1 = 150;
    const cut1 = Number((segA + segB - 2 * (dia1 / 1000)).toFixed(2));
    const no1 = Math.floor((L - 2 * cover) / (space1 / 1000)) + 1;
    const totalLen1 = Number((no1 * cut1).toFixed(1));
    const wt1 = Number((totalLen1 * getWeightPerM(dia1)).toFixed(1));

    bbs.push({
      barMark: 'RW-01',
      description: 'Wall Stem Main Vertical Tension Bars (Earth Face)',
      diameterMm: dia1,
      shapeType: 'L_BEND',
      shapeCode: '11',
      shapeDescription: '90° L-bar anchored into base footing',
      spacingMm: space1,
      segmentA_m: segA,
      segmentB_m: segB,
      formulaExpression: `A(${segA}m) + B(${segB}m) - 2d = ${cut1}m`,
      dimensionDriverDesc: `Wall Length (${L}m) @ ${space1}mm c/c`,
      cuttingLengthM: cut1,
      noOfBars: no1,
      totalLengthM: totalLen1,
      unitWeightKgM: Number(getWeightPerM(dia1).toFixed(3)),
      totalWeightKg: wt1
    });

    // 2. Stem Horizontal Distribution Bars
    const dia2 = 10;
    const space2 = 200;
    const cut2 = Number(L.toFixed(2));
    const no2 = (Math.floor((H - 2 * cover) / (space2 / 1000)) + 1) * 2; // 2 faces
    const totalLen2 = Number((no2 * cut2 * 1.05).toFixed(1));
    const wt2 = Number((totalLen2 * getWeightPerM(dia2)).toFixed(1));

    bbs.push({
      barMark: 'RW-02',
      description: 'Stem Horizontal Temperature & Distribution Bars (2 Faces)',
      diameterMm: dia2,
      shapeType: 'STRAIGHT',
      shapeCode: '00',
      shapeDescription: 'Straight distribution bars with 5% lap allowance',
      spacingMm: space2,
      segmentA_m: cut2,
      formulaExpression: `A(${cut2}m) = ${cut2}m`,
      dimensionDriverDesc: `Wall Height (${H}m) @ ${space2}mm c/c × 2 Faces`,
      cuttingLengthM: cut2,
      noOfBars: no2,
      totalLengthM: totalLen2,
      unitWeightKgM: Number(getWeightPerM(dia2).toFixed(3)),
      totalWeightKg: wt2
    });
  }

  return bbs;
}

// ----------------------------------------------------
// MULTI-STATION CHAINAGE GENERATOR
// ----------------------------------------------------
export function generateMultiStationChainages(
  template: DrawingTemplateDef,
  params: Record<string, number>,
  startChainageM: number = 0,
  endChainageM: number = 500,
  stationIntervalM: number = 50,
  sideOffsetLabel: string = 'RHS'
): MultiStationMBRow[] {
  const rows: MultiStationMBRow[] = [];
  const totalDist = Math.max(stationIntervalM, endChainageM - startChainageM);
  const numIntervals = Math.ceil(totalDist / stationIntervalM);

  const formatCH = (m: number) => {
    const km = Math.floor(m / 1000);
    const rem = (m % 1000).toFixed(0).padStart(3, '0');
    return `CH ${km}+${rem}`;
  };

  for (let i = 0; i < numIntervals; i++) {
    const curStart = startChainageM + i * stationIntervalM;
    const curEnd = Math.min(endChainageM, curStart + stationIntervalM);
    const segLen = curEnd - curStart;
    if (segLen <= 0) break;

    // Run computation for this segment length
    const segParams = {
      ...params,
      reach_length: segLen,
      road_length_m: segLen,
      wall_length_m: segLen,
      pipe_length_m: segLen
    };

    // Calculate quantities proportionally for this segment
    const baseLength =
      params.reach_length ||
      params.road_length_m ||
      params.wall_length_m ||
      params.barrel_length ||
      params.pipe_length_m ||
      100;

    const ratio = segLen / baseLength;

    rows.push({
      stationIndex: i + 1,
      chainageFrom: formatCH(curStart),
      chainageTo: `${formatCH(curEnd)} (${sideOffsetLabel})`,
      lengthM: segLen,
      items: []
    });
  }

  return rows;
}

// ----------------------------------------------------
// RDS NORMS RATE ANALYSIS BASELINE
// ----------------------------------------------------
export const RDS_STANDARD_UNIT_RATES: Record<string, { rate: number; desc: string }> = {
  'RDS-EARTH-01': { rate: 385, desc: 'Earthwork excavation in road/drain trench (per m³)' },
  'RDS-EARTH-02': { rate: 290, desc: 'Roadbed subgrade preparation and compaction (per m²)' },
  'RDS-EARTH-03': { rate: 210, desc: 'Backfilling behind masonry/drain walls (per m³)' },
  'RDS-SOLING-01': { rate: 395, desc: 'Flat dry stone soling 150mm bed (per m²)' },
  'RDS-CONC-M15': { rate: 8650, desc: 'PCC 1:3:6 (M15) concrete bed course (per m³)' },
  'RDS-CONC-M10': { rate: 7400, desc: 'Dry Lean Concrete (DLC M10) base (per m³)' },
  'RDS-RCC-M20': { rate: 13400, desc: 'RCC M20 in drain walls/culvert (per m³)' },
  'RDS-RCC-M25': { rate: 14800, desc: 'RCC M25 structural concrete in slabs/box (per m³)' },
  'RDS-PQC-M30': { rate: 15200, desc: 'Pavement Quality Concrete (PQC M30) (per m³)' },
  'RDS-REBAR-FE500': { rate: 138, desc: 'TMT Fe500 reinforcement steel cut/bend/place (per kg)' },
  'RDS-FORMWORK-01': { rate: 580, desc: 'Steel/plywood shuttering and formwork (per m²)' },
  'RDS-MASONRY-14': { rate: 6900, desc: 'Stone masonry in 1:4 cement sand mortar (per m³)' },
  'RDS-MASONRY-16': { rate: 6200, desc: 'Stone masonry in 1:6 cement sand mortar (per m³)' },
  'RDS-PLASTER-14': { rate: 420, desc: '12.5mm plaster 1:4 with cement punning (per m²)' },
  'RDS-POINTING-13': { rate: 320, desc: 'Flush cement pointing 1:3 on exposed stone (per m²)' },
  'RDS-GSB-01': { rate: 2450, desc: 'Granular Sub-Base (GSB) crushed stone (per m³)' },
  'RDS-WMM-01': { rate: 3200, desc: 'Wet Mix Macadam (WMM) base course (per m³)' },
  'RDS-TACK-01': { rate: 65, desc: 'Bituminous Prime & Tack coats (per m²)' },
  'RDS-DBM-01': { rate: 14200, desc: 'Dense Bituminous Macadam (DBM) (per m³)' },
  'RDS-AC-01': { rate: 16500, desc: 'Asphalt Concrete (AC) wearing surface (per m³)' },
  'RDS-GABION-01': { rate: 4450, desc: 'GI wire woven gabion crates with boulders (per m³)' },
  'RDS-GEOTEXTILE-01': { rate: 185, desc: 'Non-woven geotextile filter fabric (per m²)' },
  'RDS-PIPE-090': { rate: 6200, desc: '900mm Ø NP3 RCC Hume Pipe supply & laying (per m)' },
  'RDS-KERB-01': { rate: 850, desc: 'Precast M20 concrete kerb stones (per m)' },
  'RDS-MISC-WEEP': { rate: 350, desc: '110mm PVC weep hole with filter cap (per nos)' }
};

export function estimateCostForItems(
  items: TemplateWorkItemOutput[]
): {
  itemizedCosts: {
    id: string;
    itemName: string;
    unit: string;
    quantity: number;
    unitRate: number;
    amountValue: number;
  }[];
  totalCostValue: number;
  costPerMeterValue: number;
} {
  let totalCost = 0;

  const itemizedCosts = items.map((it) => {
    let unitRate = 1200; // fallback
    const code = it.dor_item_no || it.item_code_hint;
    if (code && RDS_STANDARD_UNIT_RATES[code]) {
      unitRate = RDS_STANDARD_UNIT_RATES[code].rate;
    } else {
      // Heuristic based on description
      const desc = it.item_name.toLowerCase();
      if (desc.includes('excavation')) unitRate = 385;
      else if (desc.includes('soling')) unitRate = 395;
      else if (desc.includes('pcc') || desc.includes('1:3:6')) unitRate = 8650;
      else if (desc.includes('rcc') || desc.includes('m20') || desc.includes('m25')) unitRate = 13800;
      else if (desc.includes('rebar') || desc.includes('steel')) unitRate = 138;
      else if (desc.includes('formwork') || desc.includes('shuttering')) unitRate = 580;
      else if (desc.includes('masonry')) unitRate = 6900;
      else if (desc.includes('plaster') || desc.includes('punning')) unitRate = 420;
      else if (desc.includes('gsb')) unitRate = 2450;
      else if (desc.includes('wmm')) unitRate = 3200;
      else if (desc.includes('asphalt') || desc.includes('dbm')) unitRate = 15000;
      else if (desc.includes('gabion')) unitRate = 4450;
      else if (desc.includes('geotextile')) unitRate = 185;
      else if (desc.includes('kerb')) unitRate = 850;
      else if (desc.includes('weep')) unitRate = 350;
    }

    const amount = Math.round(it.calculated_quantity * unitRate * 100) / 100;
    totalCost += amount;

    return {
      id: it.id,
      itemName: it.item_name,
      unit: it.unit,
      quantity: it.calculated_quantity,
      unitRate,
      amountValue: amount
    };
  });

  const reachLen = items.length > 0 && typeof items[0].length_val === 'number' ? items[0].length_val : 1;
  const costPerMeter = Math.round((totalCost / Math.max(1, reachLen)) * 100) / 100;

  return {
    itemizedCosts,
    totalCostValue: Math.round(totalCost),
    costPerMeterValue: costPerMeter
  };
}
