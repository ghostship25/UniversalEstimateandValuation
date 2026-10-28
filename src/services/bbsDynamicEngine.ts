import {
  BBSItem,
  BBSShapeType,
  BBSDimensionDriver,
  BBSSegmentDef,
  SegmentTurnDirection
} from '../types';

// ====================================================
// BS 8666 & IS 2502 STANDARD SHAPE CODES & METADATA
// ====================================================

export interface BBSShapeMetadata {
  type: BBSShapeType;
  bsCode: string;
  isCode: string;
  name: string;
  description: string;
  activeSegments: ('A' | 'B' | 'C' | 'D' | 'E' | 'F')[];
  segmentLabels: Partial<Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F', string>>;
  defaultBends: {
    count90: number;
    count135: number;
    count45: number;
    count180: number;
  };
  formulaHint: string;
}

export const BBS_SHAPE_CATALOG: Record<BBSShapeType, BBSShapeMetadata> = {
  STRAIGHT: {
    type: 'STRAIGHT',
    bsCode: '00',
    isCode: '01',
    name: 'Straight Bar',
    description: 'Single straight rebar segment with no bends',
    activeSegments: ['A'],
    segmentLabels: { A: 'Length (A)' },
    defaultBends: { count90: 0, count135: 0, count45: 0, count180: 0 },
    formulaHint: 'Cutting Length = A'
  },
  L_BEND: {
    type: 'L_BEND',
    bsCode: '11',
    isCode: '02',
    name: 'L-Bend / 90° Hook',
    description: 'Straight bar with single 90° leg (starter / anchorage)',
    activeSegments: ['A', 'B'],
    segmentLabels: { A: 'Main Length (A)', B: '90° Leg / Bend (B)' },
    defaultBends: { count90: 1, count135: 0, count45: 0, count180: 0 },
    formulaHint: 'Cutting Length = A + B - 2d'
  },
  U_HOOK: {
    type: 'U_HOOK',
    bsCode: '21',
    isCode: '03',
    name: 'Double L-Bend / U-Bar',
    description: 'Channel / U-shaped bar with two 90° returns (slab / trough)',
    activeSegments: ['A', 'B', 'C'],
    segmentLabels: { A: 'Base Web (A)', B: 'Left Upright (B)', C: 'Right Upright (C)' },
    defaultBends: { count90: 2, count135: 0, count45: 0, count180: 0 },
    formulaHint: 'Cutting Length = A + B + C - 2×(2d)'
  },
  RECT_STIRRUP: {
    type: 'RECT_STIRRUP',
    bsCode: '51',
    isCode: '06',
    name: 'Rectangular Stirrup / Closed Ring',
    description: 'Closed rectangular shear link with 135° seismic end hooks',
    activeSegments: ['A', 'B', 'C', 'D', 'E', 'F'],
    segmentLabels: {
      A: 'Horizontal Width (A)',
      B: 'Vertical Depth (B)',
      C: 'Top Return (C)',
      D: 'Opposite Side (D)',
      E: '135° Hook 1 (E)',
      F: '135° Hook 2 (F)'
    },
    defaultBends: { count90: 3, count135: 2, count45: 0, count180: 0 },
    formulaHint: 'Cutting Length = 2(A + B) + 2×Hook(10d) - Deductions'
  },
  CRANKED_BENT_UP: {
    type: 'CRANKED_BENT_UP',
    bsCode: '41',
    isCode: '04',
    name: 'Cranked / Bent-Up Bar (45°)',
    description: 'Beam / slab tension bar cranked at 45° for negative shear & moment',
    activeSegments: ['A', 'B', 'C', 'D', 'E'],
    segmentLabels: {
      A: 'Left Straight (A)',
      B: 'Left Crank Slope (B)',
      C: 'Center Raised Span (C)',
      D: 'Right Crank Slope (D)',
      E: 'Right Straight (E)'
    },
    defaultBends: { count90: 0, count135: 0, count45: 4, count180: 0 },
    formulaHint: 'Cutting Length = A + C + E + 2×(0.42d_c or B+D) - Deductions'
  },
  CHAIR_BAR: {
    type: 'CHAIR_BAR',
    bsCode: '31',
    isCode: '08',
    name: 'Chair Bar / Mat Spacer',
    description: '3D rebar chair to support top reinforcement mat above bottom mat',
    activeSegments: ['A', 'B', 'C', 'D', 'E'],
    segmentLabels: {
      A: 'Top Support Web (A)',
      B: 'Left Leg Stool (B)',
      C: 'Right Leg Stool (C)',
      D: 'Left Foot Base (D)',
      E: 'Right Foot Base (E)'
    },
    defaultBends: { count90: 4, count135: 0, count45: 0, count180: 0 },
    formulaHint: 'Cutting Length = A + B + C + D + E - 4×(2d)'
  },
  CAP_BAR: {
    type: 'CAP_BAR',
    bsCode: '71',
    isCode: '09',
    name: 'Capping Bar / Top Overlap Hat',
    description: 'Inverted U-bar with outward anchorage feet for kerbs / walls',
    activeSegments: ['A', 'B', 'C', 'D', 'E'],
    segmentLabels: {
      A: 'Top Horizontal (A)',
      B: 'Left Down Leg (B)',
      C: 'Right Down Leg (C)',
      D: 'Left Outward Foot (D)',
      E: 'Right Outward Foot (E)'
    },
    defaultBends: { count90: 4, count135: 0, count45: 0, count180: 0 },
    formulaHint: 'Cutting Length = A + B + C + D + E - 4×(2d)'
  },
  HAUNCH_TIE: {
    type: 'HAUNCH_TIE',
    bsCode: '61',
    isCode: '07',
    name: 'Corner Haunch Tie (45° Diagonal)',
    description: 'Internal diagonal haunch bar for rigid frame corners in box culverts',
    activeSegments: ['A', 'B', 'C'],
    segmentLabels: {
      A: 'Diagonal Haunch (A)',
      B: 'Wall Anchorage Leg (B)',
      C: 'Slab Anchorage Leg (C)'
    },
    defaultBends: { count90: 0, count135: 2, count45: 0, count180: 0 },
    formulaHint: 'Cutting Length = A + B + C'
  },
  CIRCULAR_TIE: {
    type: 'CIRCULAR_TIE',
    bsCode: '77',
    isCode: '10',
    name: 'Circular Spiral / Ring Tie',
    description: 'Circular column or pile ring link with seismic lap hook',
    activeSegments: ['A', 'B'],
    segmentLabels: {
      A: 'Internal Core Dia (A)',
      B: 'Lap & Hook Allowance (B)'
    },
    defaultBends: { count90: 0, count135: 2, count45: 0, count180: 0 },
    formulaHint: 'Cutting Length = π×A + B'
  },
  HELICAL_SPIRAL: {
    type: 'HELICAL_SPIRAL',
    bsCode: '88',
    isCode: '11',
    name: 'Continuous Helical Spiral',
    description: 'Continuous helical spring reinforcement for round columns / piles',
    activeSegments: ['A', 'B', 'C'],
    segmentLabels: {
      A: 'Spiral Diameter (A)',
      B: 'Spiral Pitch (B)',
      C: 'Total Spiral Height (C)'
    },
    defaultBends: { count90: 0, count135: 0, count45: 0, count180: 0 },
    formulaHint: 'Cutting Length = √( (π×A)² + B² ) × (C/B)'
  },
  CUSTOM_MULTI_SEGMENT: {
    type: 'CUSTOM_MULTI_SEGMENT',
    bsCode: '99',
    isCode: '99',
    name: 'Custom Multi-Segment (A-F)',
    description: 'Fully customizable user-defined multi-segment bar geometry',
    activeSegments: ['A', 'B', 'C', 'D', 'E', 'F'],
    segmentLabels: {
      A: 'Segment A (m)',
      B: 'Segment B (m)',
      C: 'Segment C (m)',
      D: 'Segment D (m)',
      E: 'Segment E (m)',
      F: 'Segment F (m)'
    },
    defaultBends: { count90: 2, count135: 0, count45: 0, count180: 0 },
    formulaHint: 'Cutting Length = Σ(A+B+C+D+E+F) - Bend Deductions'
  }
};

// ====================================================
// UNIT WEIGHT COMPUTATION (IS 1786 / SP 34)
// Formula: Weight = d² / 162.28 kg per running meter
// ====================================================
export function calculateRebarUnitWeight(diaMm: number): number {
  return Math.round(((diaMm * diaMm) / 162.28) * 1000) / 1000;
}

// ====================================================
// DYNAMIC CUTTING LENGTH COMPUTATION WITH NAMED SEGMENTS
// Computes exact cutting length and full mathematical trace
// ====================================================
export interface CuttingLengthResult {
  cuttingLengthM: number;
  grossSumM: number;
  bendDeductionM: number;
  hookAllowanceM: number;
  formulaExpression: string;
}

// ----------------------------------------------------
// VECTOR CAD 2D GEOMETRY FOR SEGMENT TURNS & BENDS
// ----------------------------------------------------
export interface SegmentPoint2D {
  x: number;
  y: number;
}

export interface ComputedSegmentVertex {
  segmentIndex: number;
  segmentId: string;
  label: string;
  lengthM: number;
  start: SegmentPoint2D;
  end: SegmentPoint2D;
  midpoint: SegmentPoint2D;
  labelPoint: SegmentPoint2D;
  angleDeg: number;
  headingDeg: number;
  turnAngleDeg: number;
  direction: SegmentTurnDirection;
  turnDescription: string;
  bendDeductionM: number;
  hookAllowanceM: number;
}

export interface CustomSegmentsGeometryResult {
  vertices: ComputedSegmentVertex[];
  points: SegmentPoint2D[];
  svgPath: string;
  viewBox: { minX: number; minY: number; width: number; height: number };
  grossSumM: number;
  bendDeductionM: number;
  hookAllowanceM: number;
  cuttingLengthM: number;
  formulaExpression: string;
  bendsCount: {
    count90: number;
    count135: number;
    count45: number;
    count180: number;
    other: number;
  };
}

export function computeCustomSegmentsGeometry(
  segments: BBSSegmentDef[],
  diaMm: number = 16
): CustomSegmentsGeometryResult {
  const diaM = diaMm / 1000;
  if (!segments || segments.length === 0) {
    return {
      vertices: [],
      points: [{ x: 0, y: 0 }],
      svgPath: 'M 0 0',
      viewBox: { minX: -50, minY: -50, width: 100, height: 100 },
      grossSumM: 0,
      bendDeductionM: 0,
      hookAllowanceM: 0,
      cuttingLengthM: 0,
      formulaExpression: 'No segments defined',
      bendsCount: { count90: 0, count135: 0, count45: 0, count180: 0, other: 0 }
    };
  }

  const bendsCount = { count90: 0, count135: 0, count45: 0, count180: 0, other: 0 };
  let grossSumM = 0;
  let totalBendDeductionM = 0;
  let totalHookAllowanceM = 0;

  // Track orientation angle (0° = pointing Right / +X in SVG, 90° = pointing Down / +Y in SVG)
  let currentHeadingDeg = 0;
  let currentPoint: SegmentPoint2D = { x: 0, y: 0 };
  const allPoints: SegmentPoint2D[] = [currentPoint];
  const computedVertices: ComputedSegmentVertex[] = [];

  const formulaTerms: string[] = [];

  segments.forEach((seg, idx) => {
    const lenM = Math.max(0.01, Number(seg.length_m) || 0.1);
    grossSumM += lenM;

    let turnAngleDeg = seg.turn_angle_deg ?? 0;
    const dir = seg.direction || 'STRAIGHT';

    // Derive heading change based on direction preset
    let targetHeadingDeg = currentHeadingDeg;
    let turnDesc = 'Straight';

    if (idx === 0) {
      // Initial segment heading
      if (dir === 'TURN_UP_90') targetHeadingDeg = -90;
      else if (dir === 'TURN_DOWN_90') targetHeadingDeg = 90;
      else if (dir === 'TURN_LEFT_90') targetHeadingDeg = 180;
      else if (dir === 'CRANK_UP_45') targetHeadingDeg = -45;
      else if (dir === 'CRANK_DOWN_45') targetHeadingDeg = 45;
      else if (dir === 'CRANK_UP_LEFT_45') targetHeadingDeg = -135;
      else if (dir === 'CRANK_DOWN_LEFT_45') targetHeadingDeg = 135;
      else targetHeadingDeg = 0;
      turnDesc = 'Start Origin';
    } else {
      switch (dir) {
        case 'STRAIGHT':
          targetHeadingDeg = currentHeadingDeg;
          turnAngleDeg = 0;
          turnDesc = 'Straight';
          break;
        case 'TURN_UP_90':
          targetHeadingDeg = -90;
          turnAngleDeg = 90;
          turnDesc = 'Turn Up 90°';
          break;
        case 'TURN_DOWN_90':
          targetHeadingDeg = 90;
          turnAngleDeg = 90;
          turnDesc = 'Turn Down 90°';
          break;
        case 'TURN_LEFT_90':
          targetHeadingDeg = 180;
          turnAngleDeg = 90;
          turnDesc = 'Turn Left 90°';
          break;
        case 'TURN_RIGHT_90':
          targetHeadingDeg = 0;
          turnAngleDeg = 90;
          turnDesc = 'Turn Right 90°';
          break;
        case 'CRANK_UP_45':
          targetHeadingDeg = -45;
          turnAngleDeg = 45;
          turnDesc = 'Crank Up 45°';
          break;
        case 'CRANK_DOWN_45':
          targetHeadingDeg = 45;
          turnAngleDeg = 45;
          turnDesc = 'Crank Down 45°';
          break;
        case 'CRANK_UP_LEFT_45':
          targetHeadingDeg = -135;
          turnAngleDeg = 45;
          turnDesc = 'Crank Up-Left 45°';
          break;
        case 'CRANK_DOWN_LEFT_45':
          targetHeadingDeg = 135;
          turnAngleDeg = 45;
          turnDesc = 'Crank Down-Left 45°';
          break;
        case 'HOOK_IN_135':
          targetHeadingDeg = currentHeadingDeg + 135;
          turnAngleDeg = 135;
          turnDesc = 'Seismic Hook 135°';
          break;
        case 'HOOK_OUT_135':
          targetHeadingDeg = currentHeadingDeg - 135;
          turnAngleDeg = 135;
          turnDesc = 'Hook Out 135°';
          break;
        case 'HOOK_180':
          targetHeadingDeg = currentHeadingDeg + 180;
          turnAngleDeg = 180;
          turnDesc = 'U-Return 180°';
          break;
        case 'CUSTOM_ANGLE':
          targetHeadingDeg = currentHeadingDeg + (seg.custom_angle_deg ?? turnAngleDeg);
          turnDesc = `Turn ${turnAngleDeg}°`;
          break;
        default:
          targetHeadingDeg = currentHeadingDeg;
      }
    }

    currentHeadingDeg = targetHeadingDeg;

    // Bend deduction calculation (IS:2502 standard: 45°=1d, 90°=2d, 135°=3d, 180°=4d)
    let segBendDeduction = 0;
    if (idx > 0 && turnAngleDeg > 0) {
      let dFactor = seg.bend_deduction_d_factor;
      if (dFactor === undefined) {
        if (Math.abs(turnAngleDeg - 90) < 5) dFactor = 2;
        else if (Math.abs(turnAngleDeg - 45) < 5) dFactor = 1;
        else if (Math.abs(turnAngleDeg - 135) < 5) dFactor = 3;
        else if (Math.abs(turnAngleDeg - 180) < 5) dFactor = 4;
        else dFactor = (turnAngleDeg / 45) * 1;
      }
      segBendDeduction = Number((dFactor * diaM).toFixed(4));
      totalBendDeductionM += segBendDeduction;

      if (Math.abs(turnAngleDeg - 90) < 5) bendsCount.count90++;
      else if (Math.abs(turnAngleDeg - 135) < 5) bendsCount.count135++;
      else if (Math.abs(turnAngleDeg - 45) < 5) bendsCount.count45++;
      else if (Math.abs(turnAngleDeg - 180) < 5) bendsCount.count180++;
      else bendsCount.other++;
    }

    // Hook allowance calculation
    let segHookAllowance = 0;
    if (seg.hook_type === 'HOOK_180' || dir === 'HOOK_180') {
      segHookAllowance = Number((9 * diaM).toFixed(4));
      totalHookAllowanceM += segHookAllowance;
    } else if (seg.hook_type === 'HOOK_135' || dir === 'HOOK_IN_135') {
      segHookAllowance = Number((10 * diaM).toFixed(4));
      totalHookAllowanceM += segHookAllowance;
    }

    // Vector step in scaled coordinate units (1m = 100 units in vector space)
    const rad = (currentHeadingDeg * Math.PI) / 180;
    const dx = Math.cos(rad) * lenM * 100;
    const dy = Math.sin(rad) * lenM * 100;

    const startPoint = { ...currentPoint };
    const endPoint = {
      x: Number((currentPoint.x + dx).toFixed(2)),
      y: Number((currentPoint.y + dy).toFixed(2))
    };

    const midpoint = {
      x: Number(((startPoint.x + endPoint.x) / 2).toFixed(2)),
      y: Number(((startPoint.y + endPoint.y) / 2).toFixed(2))
    };

    // Label offset perpendicular to segment
    const normalRad = rad - Math.PI / 2;
    const labelOffset = 18;
    const labelPoint = {
      x: Number((midpoint.x + Math.cos(normalRad) * labelOffset).toFixed(2)),
      y: Number((midpoint.y + Math.sin(normalRad) * labelOffset).toFixed(2))
    };

    computedVertices.push({
      segmentIndex: idx,
      segmentId: seg.segment_id || String.fromCharCode(65 + idx),
      label: seg.label || `Seg ${String.fromCharCode(65 + idx)}`,
      lengthM: lenM,
      start: startPoint,
      end: endPoint,
      midpoint,
      labelPoint,
      angleDeg: currentHeadingDeg,
      headingDeg: currentHeadingDeg,
      turnAngleDeg,
      direction: dir,
      turnDescription: turnDesc,
      bendDeductionM: segBendDeduction,
      hookAllowanceM: segHookAllowance
    });

    allPoints.push(endPoint);
    currentPoint = endPoint;

    formulaTerms.push(`${seg.segment_id || String.fromCharCode(65 + idx)}(${lenM.toFixed(2)}m)`);
  });

  // Generate smooth filleted SVG Path
  let svgPath = '';
  if (computedVertices.length > 0) {
    const first = computedVertices[0];
    svgPath = `M ${first.start.x} ${first.start.y}`;

    for (let i = 0; i < computedVertices.length; i++) {
      const v = computedVertices[i];
      if (i < computedVertices.length - 1) {
        const nextV = computedVertices[i + 1];
        // Calculate fillet curve at vertex
        const filletR = Math.min(12, v.lengthM * 20, nextV.lengthM * 20);
        const inRad = (v.headingDeg * Math.PI) / 180;
        const outRad = (nextV.headingDeg * Math.PI) / 180;

        const pCorner = v.end;
        const pIn = {
          x: pCorner.x - Math.cos(inRad) * filletR,
          y: pCorner.y - Math.sin(inRad) * filletR
        };
        const pOut = {
          x: pCorner.x + Math.cos(outRad) * filletR,
          y: pCorner.y + Math.sin(outRad) * filletR
        };

        svgPath += ` L ${pIn.x} ${pIn.y} Q ${pCorner.x} ${pCorner.y} ${pOut.x} ${pOut.y}`;
      } else {
        svgPath += ` L ${v.end.x} ${v.end.y}`;
      }
    }
  }

  // Calculate bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  allPoints.forEach((pt) => {
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  });

  const pad = 35;
  const width = Math.max(120, maxX - minX + 2 * pad);
  const height = Math.max(80, maxY - minY + 2 * pad);

  const netCuttingLengthM = Math.max(
    0.05,
    Number((grossSumM - totalBendDeductionM + totalHookAllowanceM).toFixed(3))
  );

  let formulaExpression = formulaTerms.join(' + ');
  if (totalBendDeductionM > 0) {
    formulaExpression += ` - Bends(${totalBendDeductionM.toFixed(3)}m)`;
  }
  if (totalHookAllowanceM > 0) {
    formulaExpression += ` + Hooks(${totalHookAllowanceM.toFixed(3)}m)`;
  }
  formulaExpression += ` = ${netCuttingLengthM.toFixed(3)}m`;

  return {
    vertices: computedVertices,
    points: allPoints,
    svgPath,
    viewBox: {
      minX: minX - pad,
      minY: minY - pad,
      width,
      height
    },
    grossSumM: Number(grossSumM.toFixed(3)),
    bendDeductionM: Number(totalBendDeductionM.toFixed(3)),
    hookAllowanceM: Number(totalHookAllowanceM.toFixed(3)),
    cuttingLengthM: netCuttingLengthM,
    formulaExpression,
    bendsCount
  };
}

// ----------------------------------------------------
// CONVERT STANDARD BBS SHAPE TO TURNED SEGMENT ARRAY
// ----------------------------------------------------
export function convertShapeToSegments(
  shape: BBSShapeType,
  a: number = 0,
  b: number = 0,
  c: number = 0,
  d: number = 0,
  e: number = 0,
  f: number = 0,
  existingCustom?: BBSSegmentDef[]
): BBSSegmentDef[] {
  if (existingCustom && existingCustom.length > 0) {
    return existingCustom;
  }

  const safeA = a > 0 ? a : 1.0;
  const safeB = b > 0 ? b : 0.35;
  const safeC = c > 0 ? c : 0.35;
  const safeD = d > 0 ? d : 0.20;
  const safeE = e > 0 ? e : 0.20;
  const safeF = f > 0 ? f : 0.10;

  switch (shape) {
    case 'STRAIGHT':
      return [
        {
          segment_id: 'A',
          label: 'Main Length (A)',
          length_m: safeA,
          direction: 'STRAIGHT',
          turn_angle_deg: 0,
          bend_deduction_d_factor: 0
        }
      ];

    case 'L_BEND':
      return [
        {
          segment_id: 'A',
          label: 'Main Length (A)',
          length_m: safeA,
          direction: 'STRAIGHT',
          turn_angle_deg: 0,
          bend_deduction_d_factor: 0
        },
        {
          segment_id: 'B',
          label: '90° Leg / Bend (B)',
          length_m: safeB,
          direction: 'TURN_DOWN_90',
          turn_angle_deg: 90,
          bend_deduction_d_factor: 2
        }
      ];

    case 'U_HOOK':
      return [
        {
          segment_id: 'B',
          label: 'Left Upright (B)',
          length_m: safeB,
          direction: 'TURN_DOWN_90',
          turn_angle_deg: 0,
          bend_deduction_d_factor: 0
        },
        {
          segment_id: 'A',
          label: 'Base Web (A)',
          length_m: safeA,
          direction: 'TURN_RIGHT_90',
          turn_angle_deg: 90,
          bend_deduction_d_factor: 2
        },
        {
          segment_id: 'C',
          label: 'Right Upright (C)',
          length_m: safeC,
          direction: 'TURN_UP_90',
          turn_angle_deg: 90,
          bend_deduction_d_factor: 2
        }
      ];

    case 'RECT_STIRRUP':
      return [
        {
          segment_id: 'E',
          label: '135° Hook 1 (E)',
          length_m: safeE || 0.10,
          direction: 'CRANK_DOWN_45',
          turn_angle_deg: 0,
          is_hook: true,
          hook_type: 'HOOK_135',
          bend_deduction_d_factor: 0
        },
        {
          segment_id: 'A',
          label: 'Horizontal Width (A)',
          length_m: safeA,
          direction: 'STRAIGHT',
          turn_angle_deg: 135,
          bend_deduction_d_factor: 3
        },
        {
          segment_id: 'B',
          label: 'Vertical Depth (B)',
          length_m: safeB,
          direction: 'TURN_DOWN_90',
          turn_angle_deg: 90,
          bend_deduction_d_factor: 2
        },
        {
          segment_id: 'C',
          label: 'Bottom Return (C)',
          length_m: c > 0 ? c : safeA,
          direction: 'TURN_LEFT_90',
          turn_angle_deg: 90,
          bend_deduction_d_factor: 2
        },
        {
          segment_id: 'D',
          label: 'Left Depth (D)',
          length_m: d > 0 ? d : safeB,
          direction: 'TURN_UP_90',
          turn_angle_deg: 90,
          bend_deduction_d_factor: 2
        },
        {
          segment_id: 'F',
          label: '135° Hook 2 (F)',
          length_m: safeF || 0.10,
          direction: 'CRANK_DOWN_LEFT_45',
          turn_angle_deg: 135,
          is_hook: true,
          hook_type: 'HOOK_135',
          bend_deduction_d_factor: 3
        }
      ];

    case 'CRANKED_BENT_UP':
      return [
        {
          segment_id: 'A',
          label: 'Left Straight (A)',
          length_m: safeA,
          direction: 'STRAIGHT',
          turn_angle_deg: 0,
          bend_deduction_d_factor: 0
        },
        {
          segment_id: 'B',
          label: 'Left Crank (B)',
          length_m: safeB,
          direction: 'CRANK_UP_45',
          turn_angle_deg: 45,
          bend_deduction_d_factor: 1
        },
        {
          segment_id: 'C',
          label: 'Raised Span (C)',
          length_m: safeC,
          direction: 'STRAIGHT',
          turn_angle_deg: 45,
          bend_deduction_d_factor: 1
        },
        {
          segment_id: 'D',
          label: 'Right Crank (D)',
          length_m: safeD,
          direction: 'CRANK_DOWN_45',
          turn_angle_deg: 45,
          bend_deduction_d_factor: 1
        },
        {
          segment_id: 'E',
          label: 'Right Straight (E)',
          length_m: safeE,
          direction: 'STRAIGHT',
          turn_angle_deg: 45,
          bend_deduction_d_factor: 1
        }
      ];

    case 'CHAIR_BAR':
      return [
        {
          segment_id: 'D',
          label: 'Left Foot (D)',
          length_m: safeD,
          direction: 'STRAIGHT',
          turn_angle_deg: 0,
          bend_deduction_d_factor: 0
        },
        {
          segment_id: 'B',
          label: 'Left Leg (B)',
          length_m: safeB,
          direction: 'TURN_UP_90',
          turn_angle_deg: 90,
          bend_deduction_d_factor: 2
        },
        {
          segment_id: 'A',
          label: 'Top Support Web (A)',
          length_m: safeA,
          direction: 'TURN_RIGHT_90',
          turn_angle_deg: 90,
          bend_deduction_d_factor: 2
        },
        {
          segment_id: 'C',
          label: 'Right Leg (C)',
          length_m: safeC,
          direction: 'TURN_DOWN_90',
          turn_angle_deg: 90,
          bend_deduction_d_factor: 2
        },
        {
          segment_id: 'E',
          label: 'Right Foot (E)',
          length_m: safeE,
          direction: 'TURN_RIGHT_90',
          turn_angle_deg: 90,
          bend_deduction_d_factor: 2
        }
      ];

    case 'CAP_BAR':
      return [
        {
          segment_id: 'D',
          label: 'Left Foot (D)',
          length_m: safeD,
          direction: 'STRAIGHT',
          turn_angle_deg: 0,
          bend_deduction_d_factor: 0
        },
        {
          segment_id: 'B',
          label: 'Left Leg (B)',
          length_m: safeB,
          direction: 'TURN_DOWN_90',
          turn_angle_deg: 90,
          bend_deduction_d_factor: 2
        },
        {
          segment_id: 'A',
          label: 'Top Horizontal (A)',
          length_m: safeA,
          direction: 'TURN_RIGHT_90',
          turn_angle_deg: 90,
          bend_deduction_d_factor: 2
        },
        {
          segment_id: 'C',
          label: 'Right Leg (C)',
          length_m: safeC,
          direction: 'TURN_UP_90',
          turn_angle_deg: 90,
          bend_deduction_d_factor: 2
        },
        {
          segment_id: 'E',
          label: 'Right Foot (E)',
          length_m: safeE,
          direction: 'TURN_RIGHT_90',
          turn_angle_deg: 90,
          bend_deduction_d_factor: 2
        }
      ];

    case 'HAUNCH_TIE':
      return [
        {
          segment_id: 'B',
          label: 'Wall Leg (B)',
          length_m: safeB,
          direction: 'STRAIGHT',
          turn_angle_deg: 0,
          bend_deduction_d_factor: 0
        },
        {
          segment_id: 'A',
          label: 'Diagonal Haunch (A)',
          length_m: safeA,
          direction: 'CRANK_DOWN_45',
          turn_angle_deg: 45,
          bend_deduction_d_factor: 1
        },
        {
          segment_id: 'C',
          label: 'Slab Leg (C)',
          length_m: safeC,
          direction: 'TURN_DOWN_90',
          turn_angle_deg: 45,
          bend_deduction_d_factor: 1
        }
      ];

    default:
      return [
        { segment_id: 'A', label: 'Segment A', length_m: safeA, direction: 'STRAIGHT', turn_angle_deg: 0 },
        { segment_id: 'B', label: 'Segment B', length_m: safeB, direction: 'TURN_DOWN_90', turn_angle_deg: 90, bend_deduction_d_factor: 2 }
      ];
  }
}

// ----------------------------------------------------
// CONVERT SEGMENT ARRAY BACK TO LEGACY A..F DIMS
// ----------------------------------------------------
export function convertSegmentsToLegacyDims(segments: BBSSegmentDef[]): {
  length_a_m: number;
  length_b_m?: number;
  length_c_m?: number;
  length_d_m?: number;
  length_e_m?: number;
  length_f_m?: number;
} {
  return {
    length_a_m: segments[0]?.length_m || 0,
    length_b_m: segments[1]?.length_m,
    length_c_m: segments[2]?.length_m,
    length_d_m: segments[3]?.length_m,
    length_e_m: segments[4]?.length_m,
    length_f_m: segments[5]?.length_m
  };
}

export function computeCuttingLengthWithTrace(
  shape: BBSShapeType,
  diaMm: number,
  segA: number = 0,
  segB: number = 0,
  segC: number = 0,
  segD: number = 0,
  segE: number = 0,
  segF: number = 0,
  customBends?: {
    count90?: number;
    count135?: number;
    count45?: number;
    count180?: number;
  }
): CuttingLengthResult {
  const diaM = diaMm / 1000;
  const meta = BBS_SHAPE_CATALOG[shape] || BBS_SHAPE_CATALOG.CUSTOM_MULTI_SEGMENT;

  const count90 = customBends?.count90 ?? meta.defaultBends.count90;
  const count135 = customBends?.count135 ?? meta.defaultBends.count135;
  const count45 = customBends?.count45 ?? meta.defaultBends.count45;
  const count180 = customBends?.count180 ?? meta.defaultBends.count180;

  // Standard IS 2502 / BS 8666 bend deductions:
  // 90° bend = 2d
  // 135° bend = 3d
  // 45° bend = 1d
  const bendDeductionM =
    count90 * (2 * diaM) +
    count135 * (3 * diaM) +
    count45 * (1 * diaM);

  // Hook allowances:
  // 180° standard semi-circular hook = 9d
  // 135° stirrup seismic hook = 10d (or 24d for pairs)
  const hookAllowanceM = count180 * (9 * diaM);

  let cuttingLengthM = 0;
  let grossSumM = 0;
  let formulaExpression = '';

  if (shape === 'STRAIGHT') {
    grossSumM = segA;
    cuttingLengthM = Math.max(0.05, segA);
    formulaExpression = `A (${segA.toFixed(2)}m) = ${cuttingLengthM.toFixed(2)}m`;
  } else if (shape === 'L_BEND') {
    grossSumM = segA + segB;
    cuttingLengthM = Math.max(0.05, grossSumM - (count90 > 0 ? count90 * 2 * diaM : 0));
    formulaExpression = `A (${segA.toFixed(2)}) + B (${segB.toFixed(2)}) - ${count90}×2d (${(count90 * 2 * diaM).toFixed(3)}) = ${cuttingLengthM.toFixed(2)}m`;
  } else if (shape === 'U_HOOK') {
    grossSumM = segA + segB + segC;
    cuttingLengthM = Math.max(0.05, grossSumM - (count90 * 2 * diaM));
    formulaExpression = `A (${segA.toFixed(2)}) + B (${segB.toFixed(2)}) + C (${segC.toFixed(2)}) - ${count90}×2d (${(count90 * 2 * diaM).toFixed(3)}) = ${cuttingLengthM.toFixed(2)}m`;
  } else if (shape === 'RECT_STIRRUP') {
    // If user entered A (width) and B (depth), standard stirrup perimeter is 2(A+B) + hooks
    const h1 = segE > 0 ? segE : 10 * diaM;
    const h2 = segF > 0 ? segF : 10 * diaM;
    const effC = segC > 0 ? segC : segA;
    const effD = segD > 0 ? segD : segB;
    grossSumM = segA + segB + effC + effD + h1 + h2;
    // Deductions: 3x 90° bends (3x2d = 6d) and 2x 135° bends (2x3d = 6d)
    const totalDeduct = (3 * 2 * diaM) + (2 * 3 * diaM);
    cuttingLengthM = Math.max(0.1, grossSumM - totalDeduct);
    formulaExpression = `2×[A(${segA.toFixed(2)}) + B(${segB.toFixed(2)})] + 2×Hook(${h1.toFixed(2)}) - Bends(${(totalDeduct).toFixed(3)}) = ${cuttingLengthM.toFixed(2)}m`;
  } else if (shape === 'CRANKED_BENT_UP') {
    grossSumM = segA + segB + segC + segD + segE;
    cuttingLengthM = Math.max(0.1, grossSumM - (count45 * diaM));
    formulaExpression = `A(${segA.toFixed(2)}) + B(${segB.toFixed(2)}) + C(${segC.toFixed(2)}) + D(${segD.toFixed(2)}) + E(${segE.toFixed(2)}) - ${count45}×1d = ${cuttingLengthM.toFixed(2)}m`;
  } else if (shape === 'CHAIR_BAR' || shape === 'CAP_BAR') {
    grossSumM = segA + segB + segC + segD + segE;
    cuttingLengthM = Math.max(0.1, grossSumM - (count90 * 2 * diaM));
    formulaExpression = `A(${segA.toFixed(2)}) + B(${segB.toFixed(2)}) + C(${segC.toFixed(2)}) + D(${segD.toFixed(2)}) + E(${segE.toFixed(2)}) - ${count90}×2d = ${cuttingLengthM.toFixed(2)}m`;
  } else if (shape === 'CIRCULAR_TIE') {
    grossSumM = Math.PI * segA + segB;
    cuttingLengthM = Math.max(0.1, grossSumM);
    formulaExpression = `π × A(${segA.toFixed(2)}) + Lap B(${segB.toFixed(2)}) = ${cuttingLengthM.toFixed(2)}m`;
  } else {
    // Custom multi-segment
    grossSumM = segA + segB + segC + segD + segE + segF;
    cuttingLengthM = Math.max(0.05, grossSumM - bendDeductionM + hookAllowanceM);
    formulaExpression = `Σ(A..F: ${grossSumM.toFixed(2)}) - Bends (${bendDeductionM.toFixed(3)}) = ${cuttingLengthM.toFixed(2)}m`;
  }

  return {
    cuttingLengthM: Number(cuttingLengthM.toFixed(3)),
    grossSumM: Number(grossSumM.toFixed(3)),
    bendDeductionM: Number(bendDeductionM.toFixed(3)),
    hookAllowanceM: Number(hookAllowanceM.toFixed(3)),
    formulaExpression
  };
}

// ====================================================
// DYNAMIC NUMBER OF BARS (NOS) COMPUTATION FROM DIMENSION
// Computes: Nos = [(Dimension - 2×Cover) / Spacing + 1] × Multiplier
// ====================================================
export interface DynamicNosResult {
  barsPerElement: number;
  totalBars: number;
  netSpanM: number;
  formulaDesc: string;
}

export function computeDynamicNosFromDimension(
  dimName: string,
  chosenDimValM: number,
  clearCoverMm: number = 40,
  spacingMm: number = 150,
  multiplier: number = 1,
  noOfElements: number = 1
): DynamicNosResult {
  const coverM = (clearCoverMm * 2) / 1000;
  const netSpanM = Math.max(0, chosenDimValM - coverM);
  const spacingM = Math.max(0.01, spacingMm / 1000);

  let baseNos = 1;
  if (netSpanM > 0 && spacingM > 0) {
    baseNos = Math.floor(netSpanM / spacingM) + 1;
  }

  const barsPerElement = Math.max(1, baseNos * Math.max(1, multiplier));
  const totalBars = barsPerElement * Math.max(1, noOfElements);

  const formulaDesc = `[(${chosenDimValM.toFixed(2)}m - 2×${clearCoverMm}mm) / ${spacingMm}mm + 1] × ${multiplier} = ${barsPerElement} Nos`;

  return {
    barsPerElement,
    totalBars,
    netSpanM: Number(netSpanM.toFixed(3)),
    formulaDesc
  };
}

// ====================================================
// FULL BBS ITEM FACTORY & RE-EVALUATOR
// Takes raw segments & driver params, recalculates all values
// ====================================================
export function recomputeDynamicBBSItem(item: BBSItem): BBSItem {
  const shape = item.shape_type || 'STRAIGHT';
  const dia = item.bar_diameter_mm || 12;

  // 1. Recalculate Numbers if dimension driver is defined
  let barsPerEl = item.bars_per_element;
  let formulaNos = item.formula_nos_desc || '';

  if (item.dimension_driver) {
    const nosRes = computeDynamicNosFromDimension(
      item.dimension_driver.dimension_name,
      item.dimension_driver.dimension_val_m,
      item.dimension_driver.clear_cover_mm,
      item.dimension_driver.spacing_mm,
      item.dimension_driver.multiplier,
      item.no_of_elements
    );
    barsPerEl = nosRes.barsPerElement;
    formulaNos = nosRes.formulaDesc;
  }

  // 2. Recalculate Cutting Length from custom_segments OR standard A, B, C, D, E, F
  let cuttingLengthM = 0;
  let bendDeductionM = 0;
  let hookAllowanceM = 0;
  let formulaCuttingDesc = '';
  let updatedItem = { ...item };

  if (item.custom_segments && item.custom_segments.length > 0) {
    const customGeom = computeCustomSegmentsGeometry(item.custom_segments, dia);
    cuttingLengthM = customGeom.cuttingLengthM;
    bendDeductionM = customGeom.bendDeductionM;
    hookAllowanceM = customGeom.hookAllowanceM;
    formulaCuttingDesc = customGeom.formulaExpression;

    // Sync legacy segment values for backward compatibility
    const legacyDims = convertSegmentsToLegacyDims(item.custom_segments);
    updatedItem = {
      ...updatedItem,
      ...legacyDims,
      bend_count_90: customGeom.bendsCount.count90,
      bend_count_135: customGeom.bendsCount.count135,
      bend_count_45: customGeom.bendsCount.count45,
      bend_count_180: customGeom.bendsCount.count180
    };
  } else {
    const cutRes = computeCuttingLengthWithTrace(
      shape,
      dia,
      item.length_a_m || 0,
      item.length_b_m || 0,
      item.length_c_m || 0,
      item.length_d_m || 0,
      item.length_e_m || 0,
      item.length_f_m || 0,
      {
        count90: item.bend_count_90,
        count135: item.bend_count_135,
        count45: item.bend_count_45,
        count180: item.bend_count_180
      }
    );
    cuttingLengthM = cutRes.cuttingLengthM;
    bendDeductionM = cutRes.bendDeductionM;
    hookAllowanceM = cutRes.hookAllowanceM;
    formulaCuttingDesc = cutRes.formulaExpression;
  }

  const totalLengthM = Number((cuttingLengthM * (item.no_of_elements || 1) * barsPerEl).toFixed(2));
  const unitWt = calculateRebarUnitWeight(dia);
  const totalWeightKg = Number((totalLengthM * unitWt).toFixed(2));
  const totalWeightTonnes = Number((totalWeightKg / 1000).toFixed(3));

  const meta = BBS_SHAPE_CATALOG[shape] || BBS_SHAPE_CATALOG.CUSTOM_MULTI_SEGMENT;

  return {
    ...updatedItem,
    shape_code: item.custom_segments && item.custom_segments.length > 0 ? (item.shape_code || '99') : meta.bsCode,
    shape_name: item.shape_name || meta.name,
    bars_per_element: barsPerEl,
    formula_nos_desc: formulaNos,
    cutting_length_m: cuttingLengthM,
    bend_deduction_m: bendDeductionM,
    hook_allowance_m: hookAllowanceM,
    formula_cutting_length_desc: formulaCuttingDesc,
    total_length_m: totalLengthM,
    unit_weight_kg_per_m: unitWt,
    total_weight_kg: totalWeightKg,
    total_weight_tonnes: totalWeightTonnes
  };
}

// ====================================================
// PARAMETRIC STRUCTURE BBS PRESET GENERATORS
// Generates fully dynamic A-F rebar schedules tied to CAD parameters
// ====================================================

export function generateSlabCulvertDynamicBBS(p: Record<string, number>): BBSItem[] {
  const span = p.clear_span ?? 4.0;
  const Lb = p.barrel_length ?? 8.5;
  const Ts = p.deck_slab_thickness ?? 0.35;
  const bearing = p.bearing_length ?? 0.40;
  const LcapThk = p.bed_block_thickness ?? 0.25;
  const dirtH = p.dirt_wall_height ?? 0.40;
  const kerbW = p.kerb_width ?? 0.30;
  const kerbH = p.kerb_height ?? 0.30;

  const coverDeck = 40; // mm
  const coverLcap = 35; // mm
  const coverKerb = 25; // mm

  const items: BBSItem[] = [];

  // 1. Deck Slab Bottom Main Tension Bars (Double L-Bend U-Bar, Shape 21)
  // A = Span + 2*Bearing - 2*Cover; B, C = Ts - 2*Cover
  const mainA = Number((span + 2 * bearing - (2 * coverDeck) / 1000).toFixed(3));
  const mainB = Number((Ts - (2 * coverDeck) / 1000).toFixed(3));
  const mainC = mainB;
  const mainDia = 16;
  const mainSpacing = 125;

  const item1: BBSItem = {
    id: 'bbs-sc-01',
    structure_name: `RCC Slab Culvert (${span}m Span)`,
    component: 'Deck Slab',
    bar_mark: 'SC-01',
    bar_diameter_mm: mainDia,
    shape_type: 'U_HOOK',
    no_of_elements: 1,
    bars_per_element: 1,
    length_a_m: mainA,
    length_b_m: mainB,
    length_c_m: mainC,
    bend_count_90: 2,
    dimension_driver: {
      dimension_name: 'Barrel Roadway Length (Lb)',
      dimension_val_m: Lb,
      clear_cover_mm: coverDeck,
      spacing_mm: mainSpacing,
      multiplier: 1,
      formula_desc: ''
    },
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `Bottom main tension rebar Ø16 @ ${mainSpacing}mm c/c across clear waterway`
  };
  items.push(recomputeDynamicBBSItem(item1));

  // 2. Deck Slab Top & Bottom Distribution Bars (Straight, Shape 00)
  // Length A = Lb - 2*Cover (or lap segment)
  const distA = Number((Lb - (2 * coverDeck) / 1000).toFixed(3));
  const distDia = 10;
  const distSpacing = 150;
  const totalDeckWidth = span + 2 * bearing;

  const item2: BBSItem = {
    id: 'bbs-sc-02',
    structure_name: `RCC Slab Culvert (${span}m Span)`,
    component: 'Deck Slab',
    bar_mark: 'SC-02',
    bar_diameter_mm: distDia,
    shape_type: 'STRAIGHT',
    no_of_elements: 1,
    bars_per_element: 1,
    length_a_m: distA,
    dimension_driver: {
      dimension_name: 'Total Deck Width (Span + 2×Bearing)',
      dimension_val_m: totalDeckWidth,
      clear_cover_mm: coverDeck,
      spacing_mm: distSpacing,
      multiplier: 2, // Top and Bottom distribution layers
      formula_desc: ''
    },
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `Top & bottom longitudinal distribution bars Ø10 @ ${distSpacing}mm c/c (2 layers)`
  };
  items.push(recomputeDynamicBBSItem(item2));

  // 3. RCC L-Cap Bed-Block Closed Stirrups (Shape 51)
  // A = Bearing - 2*Cover; B = LcapThk - 2*Cover; 2 Abutments
  const stirrupA = Number((bearing - (2 * coverLcap) / 1000).toFixed(3));
  const stirrupB = Number((LcapThk - (2 * coverLcap) / 1000).toFixed(3));
  const stirrupDia = 10;
  const stirrupSpacing = 150;

  const item3: BBSItem = {
    id: 'bbs-sc-03',
    structure_name: `RCC Slab Culvert (${span}m Span)`,
    component: 'L-Cap Bed-Block',
    bar_mark: 'SC-03',
    bar_diameter_mm: stirrupDia,
    shape_type: 'RECT_STIRRUP',
    no_of_elements: 1,
    bars_per_element: 1,
    length_a_m: stirrupA,
    length_b_m: stirrupB,
    length_c_m: stirrupA,
    length_d_m: stirrupB,
    length_e_m: 0.10,
    length_f_m: 0.10,
    bend_count_90: 3,
    bend_count_135: 2,
    dimension_driver: {
      dimension_name: 'Abutment Length (Lb) × 2 Abutments',
      dimension_val_m: Lb,
      clear_cover_mm: coverLcap,
      spacing_mm: stirrupSpacing,
      multiplier: 2, // 2 Abutments
      formula_desc: ''
    },
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `RCC Bed-Block / L-Cap shear links Ø10 @ ${stirrupSpacing}mm c/c (Both Abutments)`
  };
  items.push(recomputeDynamicBBSItem(item3));

  // 4. L-Cap Ballast Dirt Wall Vertical L-Bars (Shape 11)
  // A = dirtH + LcapThk - Cover; B = 0.35m foot into bed block
  const dirtA = Number((dirtH + LcapThk - coverLcap / 1000).toFixed(3));
  const dirtB = 0.35;
  const dirtDia = 12;
  const dirtSpacing = 150;

  const item4: BBSItem = {
    id: 'bbs-sc-04',
    structure_name: `RCC Slab Culvert (${span}m Span)`,
    component: 'Dirt Wall',
    bar_mark: 'SC-04',
    bar_diameter_mm: dirtDia,
    shape_type: 'L_BEND',
    no_of_elements: 1,
    bars_per_element: 1,
    length_a_m: dirtA,
    length_b_m: dirtB,
    bend_count_90: 1,
    dimension_driver: {
      dimension_name: 'Dirt Wall Length (Lb) × 2 Walls',
      dimension_val_m: Lb,
      clear_cover_mm: coverLcap,
      spacing_mm: dirtSpacing,
      multiplier: 2, // 2 Dirt walls
      formula_desc: ''
    },
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `L-Cap Ballast Dirt Wall vertical L-bars Ø12 @ ${dirtSpacing}mm c/c (2 Abutments)`
  };
  items.push(recomputeDynamicBBSItem(item4));

  // 5. Crash Kerb / Wheel Guard U-Ties (Shape 21)
  // A = kerbW - 2*Cover; B, C = kerbH + 0.20 embedment in slab
  const kerbA = Number((kerbW - (2 * coverKerb) / 1000).toFixed(3));
  const kerbB = Number((kerbH + 0.20).toFixed(3));
  const kerbDia = 10;
  const kerbSpacing = 200;

  const item5: BBSItem = {
    id: 'bbs-sc-05',
    structure_name: `RCC Slab Culvert (${span}m Span)`,
    component: 'Crash Kerb',
    bar_mark: 'SC-05',
    bar_diameter_mm: kerbDia,
    shape_type: 'U_HOOK',
    no_of_elements: 1,
    bars_per_element: 1,
    length_a_m: kerbA,
    length_b_m: kerbB,
    length_c_m: kerbB,
    bend_count_90: 2,
    dimension_driver: {
      dimension_name: 'Culvert Length (Lb) × 2 Side Kerbs',
      dimension_val_m: Lb,
      clear_cover_mm: coverKerb,
      spacing_mm: kerbSpacing,
      multiplier: 2, // 2 Kerbs
      formula_desc: ''
    },
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `Crash / Wheel Kerb U-ties embedded in deck slab Ø10 @ ${kerbSpacing}mm c/c`
  };
  items.push(recomputeDynamicBBSItem(item5));

  return items;
}

export function generateBoxCulvertDynamicBBS(p: Record<string, any>): BBSItem[] {
  const S = p.clearSpan ?? p.clear_span ?? 2.50;
  const H = p.clearHeight ?? p.clear_height ?? 2.00;
  const Lb = p.barrelLength ?? p.barrel_length ?? 8.50;
  const tw = p.wallThickness ?? p.wall_thickness ?? 0.30;
  const tb = p.bottomSlabThickness ?? p.bottom_slab_thickness ?? 0.30;
  const ttop = p.topSlabThickness ?? p.top_slab_thickness ?? 0.30;
  
  // Fillet & Fillet Bar options
  const hasFillet = p.hasFillet !== undefined ? Boolean(p.hasFillet) : (p.has_fillet !== undefined ? Boolean(p.has_fillet) : true);
  const haunch = hasFillet ? (p.filletSize ?? p.fillet_size ?? p.haunch_size ?? 0.20) : 0;
  const hasFilletBar = p.hasFilletBar !== undefined ? Boolean(p.hasFilletBar) : (p.has_fillet_bar !== undefined ? Boolean(p.has_fillet_bar) : true);
  const filletDia = p.filletBarDia ?? p.fillet_bar_dia ?? 12;
  const filletSpace = p.filletBarSpacing ?? p.fillet_bar_spacing ?? 150;

  // Scour Wall options
  const hasScour = p.hasScourWall !== undefined ? Boolean(p.hasScourWall) : (p.has_scour_wall !== undefined ? Boolean(p.has_scour_wall) : true);
  const scourLoc = p.scourWallLocation ?? p.scour_wall_location ?? (hasScour ? 'both' : 'none');
  const scourDepth = p.scourWallDepth ?? p.scour_wall_depth ?? 1.20;
  const scourThick = p.scourWallThickness ?? p.scour_wall_thickness ?? 0.30;
  const scourWallCount = !hasScour || scourLoc === 'none' ? 0 : (scourLoc === 'both' ? 2 : 1);

  const cover = 40; // mm
  const items: BBSItem[] = [];

  // 1. Bottom Slab Main Transverse Tension Bar (U-Bar, Shape 21)
  const bSlabA = Number((S + 2 * tw - (2 * cover) / 1000).toFixed(3));
  const bSlabB = Number((tb + 0.30 - cover / 1000).toFixed(3));
  const dia1 = 16;
  const space1 = 125;

  const item1: BBSItem = {
    id: 'bbs-bc-01',
    structure_name: `RCC Box Culvert (${S}m × ${H}m)`,
    component: 'Base Slab',
    bar_mark: 'BC-01',
    bar_diameter_mm: dia1,
    shape_type: 'U_HOOK',
    no_of_elements: 1,
    bars_per_element: 1,
    length_a_m: bSlabA,
    length_b_m: bSlabB,
    length_c_m: bSlabB,
    bend_count_90: 2,
    dimension_driver: {
      dimension_name: 'Barrel Length (Lb)',
      dimension_val_m: Lb,
      clear_cover_mm: cover,
      spacing_mm: space1,
      multiplier: 1,
      formula_desc: ''
    },
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `Bottom Base Slab main outer tension reinforcement Ø16 @ ${space1}mm c/c`
  };
  items.push(recomputeDynamicBBSItem(item1));

  // 2. Top Slab Main Transverse Tension Bar (U-Bar, Shape 21)
  const tSlabA = Number((S + 2 * tw - (2 * cover) / 1000).toFixed(3));
  const tSlabB = Number((ttop + 0.30 - cover / 1000).toFixed(3));
  const dia2 = 16;
  const space2 = 125;

  const item2: BBSItem = {
    id: 'bbs-bc-02',
    structure_name: `RCC Box Culvert (${S}m × ${H}m)`,
    component: 'Top Slab',
    bar_mark: 'BC-02',
    bar_diameter_mm: dia2,
    shape_type: 'U_HOOK',
    no_of_elements: 1,
    bars_per_element: 1,
    length_a_m: tSlabA,
    length_b_m: tSlabB,
    length_c_m: tSlabB,
    bend_count_90: 2,
    dimension_driver: {
      dimension_name: 'Barrel Length (Lb)',
      dimension_val_m: Lb,
      clear_cover_mm: cover,
      spacing_mm: space2,
      multiplier: 1,
      formula_desc: ''
    },
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `Top Deck Slab main outer tension reinforcement Ø16 @ ${space2}mm c/c`
  };
  items.push(recomputeDynamicBBSItem(item2));

  // 3. Abutment Wall Vertical Bars (L-Bend, Shape 11) - Both Faces, 2 Walls
  const wallA = Number((H + tb + ttop - (2 * cover) / 1000).toFixed(3));
  const wallB = 0.35; // L-bend into slab
  const dia3 = 12;
  const space3 = 150;

  const item3: BBSItem = {
    id: 'bbs-bc-03',
    structure_name: `RCC Box Culvert (${S}m × ${H}m)`,
    component: 'Abutment Wall',
    bar_mark: 'BC-03',
    bar_diameter_mm: dia3,
    shape_type: 'L_BEND',
    no_of_elements: 1,
    bars_per_element: 1,
    length_a_m: wallA,
    length_b_m: wallB,
    bend_count_90: 1,
    dimension_driver: {
      dimension_name: 'Barrel Length (Lb) × 2 Walls × 2 Faces',
      dimension_val_m: Lb,
      clear_cover_mm: cover,
      spacing_mm: space3,
      multiplier: 4, // 2 walls * 2 faces
      formula_desc: ''
    },
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `Side Abutment Walls vertical bars Ø12 @ ${space3}mm c/c (2 walls × 2 faces)`
  };
  items.push(recomputeDynamicBBSItem(item3));

  // 4. Corner Haunch 45° Diagonal Ties (Shape 61) - 4 Corners (Conditionally generated if fillet & fillet bar are active)
  if (hasFillet && hasFilletBar && haunch > 0) {
    const diagA = Number((Math.SQRT2 * haunch).toFixed(3));
    const diagB = 0.35; // embed into wall
    const diagC = 0.35; // embed into slab

    const item4: BBSItem = {
      id: 'bbs-bc-04',
      structure_name: `RCC Box Culvert (${S}m × ${H}m)`,
      component: 'Top Slab',
      bar_mark: 'BC-04',
      bar_diameter_mm: filletDia,
      shape_type: 'HAUNCH_TIE',
      no_of_elements: 1,
      bars_per_element: 1,
      length_a_m: diagA,
      length_b_m: diagB,
      length_c_m: diagC,
      bend_count_135: 2,
      dimension_driver: {
        dimension_name: 'Barrel Length (Lb) × 4 Box Corners',
        dimension_val_m: Lb,
        clear_cover_mm: cover,
        spacing_mm: filletSpace,
        multiplier: 4, // 4 haunch corners
        formula_desc: ''
      },
      cutting_length_m: 0,
      total_length_m: 0,
      unit_weight_kg_per_m: 0,
      total_weight_kg: 0,
      total_weight_tonnes: 0,
      remarks: `45° Internal Corner Haunch reinforcement ties Ø${filletDia} @ ${filletSpace}mm c/c (4 Corners, Haunch ${(haunch * 1000).toFixed(0)}mm)`
    };
    items.push(recomputeDynamicBBSItem(item4));
  }

  // 5. Longitudinal Distribution Bars (Straight, Shape 00)
  const distA = Number(Lb.toFixed(3));
  const dia5 = 10;
  const space5 = 200;
  const boxPerimeter = 2 * (S + 2 * tw) + 2 * (H + tb + ttop);

  const item5: BBSItem = {
    id: 'bbs-bc-05',
    structure_name: `RCC Box Culvert (${S}m × ${H}m)`,
    component: 'Base Slab',
    bar_mark: 'BC-05',
    bar_diameter_mm: dia5,
    shape_type: 'STRAIGHT',
    no_of_elements: 1,
    bars_per_element: 1,
    length_a_m: distA,
    dimension_driver: {
      dimension_name: 'Box Culvert Cross-Section Perimeter',
      dimension_val_m: boxPerimeter,
      clear_cover_mm: cover,
      spacing_mm: space5,
      multiplier: 1,
      formula_desc: ''
    },
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `Longitudinal distribution bars in top slab, bottom slab & walls Ø10 @ ${space5}mm c/c`
  };
  items.push(recomputeDynamicBBSItem(item5));

  // 6. Scour / Cutoff Curtain Wall Vertical Steel (if Scour Wall active and RCC)
  if (scourWallCount > 0 && p.scourWallType === 'rcc') {
    const scourOuterW = S + 2 * tw + 0.60;
    const scourH = scourDepth;
    const item6: BBSItem = {
      id: 'bbs-bc-06',
      structure_name: `RCC Box Culvert (${S}m × ${H}m)`,
      component: 'Base Slab',
      bar_mark: 'BC-06',
      bar_diameter_mm: 10,
      shape_type: 'U_HOOK',
      no_of_elements: scourWallCount,
      bars_per_element: 1,
      length_a_m: Number((scourThick - 0.08).toFixed(3)),
      length_b_m: Number((scourH - 0.04).toFixed(3)),
      length_c_m: Number((scourH - 0.04).toFixed(3)),
      bend_count_90: 2,
      dimension_driver: {
        dimension_name: `Scour Wall Width (${scourLoc.toUpperCase()}) × ${scourWallCount} Walls`,
        dimension_val_m: scourOuterW,
        clear_cover_mm: cover,
        spacing_mm: 200,
        multiplier: scourWallCount,
        formula_desc: ''
      },
      cutting_length_m: 0,
      total_length_m: 0,
      unit_weight_kg_per_m: 0,
      total_weight_kg: 0,
      total_weight_tonnes: 0,
      remarks: `Cutoff Scour Wall reinforcement U-ties Ø10 @ 200mm c/c (${scourLoc.toUpperCase()} ${scourWallCount} Nos, D=${scourDepth}m)`
    };
    items.push(recomputeDynamicBBSItem(item6));
  }

  return items;
}

export function generateDrainDynamicBBS(p: Record<string, number>): BBSItem[] {
  const L = p.reach_length ?? 100;
  const W = p.clear_width ?? 0.75;
  const H = p.clear_depth ?? 0.80;
  const tw = p.wall_thickness ?? 0.15;
  const tb = p.base_slab_thickness ?? 0.15;

  const cover = 30; // mm
  const items: BBSItem[] = [];

  // 1. Transverse Main U-Trough Bar (Shape 21)
  const uA = Number((W + 2 * tw - (2 * cover) / 1000).toFixed(3));
  const uB = Number((H + tb - cover / 1000).toFixed(3));
  const dia1 = 10;
  const space1 = 150;

  const item1: BBSItem = {
    id: 'bbs-dr-01',
    structure_name: `RCC Drain Channel (${W}m × ${H}m)`,
    component: 'Base Slab',
    bar_mark: 'DR-01',
    bar_diameter_mm: dia1,
    shape_type: 'U_HOOK',
    no_of_elements: 1,
    bars_per_element: 1,
    length_a_m: uA,
    length_b_m: uB,
    length_c_m: uB,
    bend_count_90: 2,
    dimension_driver: {
      dimension_name: 'Drain Reach Length (L)',
      dimension_val_m: L,
      clear_cover_mm: cover,
      spacing_mm: space1,
      multiplier: 1,
      formula_desc: ''
    },
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `Main Transverse U-bar (Base slab + 2 side walls) Ø10 @ ${space1}mm c/c`
  };
  items.push(recomputeDynamicBBSItem(item1));

  // 2. Longitudinal Distribution Bars (Straight, Shape 00)
  const distA = Number(L.toFixed(3));
  const dia2 = 8;
  const distBarsCount = 8; // 4 in base, 2 in each wall

  const item2: BBSItem = {
    id: 'bbs-dr-02',
    structure_name: `RCC Drain Channel (${W}m × ${H}m)`,
    component: 'Abutment Wall',
    bar_mark: 'DR-02',
    bar_diameter_mm: dia2,
    shape_type: 'STRAIGHT',
    no_of_elements: 1,
    bars_per_element: distBarsCount,
    length_a_m: distA,
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `Longitudinal distribution bars in base slab & walls Ø8 (8 continuous lines)`
  };
  items.push(recomputeDynamicBBSItem(item2));

  // 3. Precast Cover Slab Reinforcement (Straight, Shape 00)
  const covSpan = Number((W + 2 * tw + 0.10 - (2 * 20) / 1000).toFixed(3));
  const dia3 = 8;
  const noSlabs = Math.ceil(L / 0.50); // 50cm per precast unit

  const item3: BBSItem = {
    id: 'bbs-dr-03',
    structure_name: `RCC Drain Channel (${W}m × ${H}m)`,
    component: 'Cover Slab',
    bar_mark: 'DR-03',
    bar_diameter_mm: dia3,
    shape_type: 'STRAIGHT',
    no_of_elements: noSlabs,
    bars_per_element: 5, // 5 bars per 50cm precast unit
    length_a_m: covSpan,
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `Precast cover slab transverse reinforcement mesh Ø8 (5 bars per 50cm slab)`
  };
  items.push(recomputeDynamicBBSItem(item3));

  return items;
}

export function generateProtectionWallDynamicBBS(p: Record<string, number>): BBSItem[] {
  const H = p.wallHeight ?? 3.0;
  const L = p.wallLength ?? 30.0;
  const btop = p.topWidth ?? 0.50;
  const bbot = p.bottomWidth ?? 1.20;
  const Df = p.foundationDepth ?? 1.20;
  const pccW = p.pccWidth ?? bbot + 0.60;

  const cover = 50; // mm
  const items: BBSItem[] = [];

  // 1. Stem Main Vertical Rebar with Starter Leg into Footing (L-Bend, Shape 11)
  const stemA = Number((H + Df - (2 * cover) / 1000).toFixed(3));
  const stemB = Number((bbot * 0.70).toFixed(3)); // L-anchorage into footing
  const dia1 = 16;
  const space1 = 150;

  const item1: BBSItem = {
    id: 'bbs-pw-01',
    structure_name: `RCC Retaining / Protection Wall (H=${H}m)`,
    component: 'Stem',
    bar_mark: 'RW-01',
    bar_diameter_mm: dia1,
    shape_type: 'L_BEND',
    no_of_elements: 1,
    bars_per_element: 1,
    length_a_m: stemA,
    length_b_m: stemB,
    bend_count_90: 1,
    dimension_driver: {
      dimension_name: 'Wall Length (L)',
      dimension_val_m: L,
      clear_cover_mm: cover,
      spacing_mm: space1,
      multiplier: 1, // tension earth face
      formula_desc: ''
    },
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `Main vertical tension reinforcement (Earth side face) Ø16 @ ${space1}mm c/c`
  };
  items.push(recomputeDynamicBBSItem(item1));

  // 2. Base Footing Transverse Bottom Tension Bar (U-Bar, Shape 21)
  const footA = Number((pccW - (2 * cover) / 1000).toFixed(3));
  const footB = 0.35;
  const dia2 = 16;
  const space2 = 150;

  const item2: BBSItem = {
    id: 'bbs-pw-02',
    structure_name: `RCC Retaining / Protection Wall (H=${H}m)`,
    component: 'Footing',
    bar_mark: 'RW-02',
    bar_diameter_mm: dia2,
    shape_type: 'U_HOOK',
    no_of_elements: 1,
    bars_per_element: 1,
    length_a_m: footA,
    length_b_m: footB,
    length_c_m: footB,
    bend_count_90: 2,
    dimension_driver: {
      dimension_name: 'Wall Length (L)',
      dimension_val_m: L,
      clear_cover_mm: cover,
      spacing_mm: space2,
      multiplier: 1,
      formula_desc: ''
    },
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `Footing base slab main transverse bending reinforcement Ø16 @ ${space2}mm c/c`
  };
  items.push(recomputeDynamicBBSItem(item2));

  // 3. Stem Horizontal Distribution Bars (Straight, Shape 00)
  const distA = Number(L.toFixed(3));
  const dia3 = 10;
  const space3 = 200;

  const item3: BBSItem = {
    id: 'bbs-pw-03',
    structure_name: `RCC Retaining / Protection Wall (H=${H}m)`,
    component: 'Stem',
    bar_mark: 'RW-03',
    bar_diameter_mm: dia3,
    shape_type: 'STRAIGHT',
    no_of_elements: 1,
    bars_per_element: 1,
    length_a_m: distA,
    dimension_driver: {
      dimension_name: 'Stem Height (H) × 2 Faces',
      dimension_val_m: H,
      clear_cover_mm: cover,
      spacing_mm: space3,
      multiplier: 2, // Both faces
      formula_desc: ''
    },
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `Horizontal shrinkage & temperature distribution steel Ø10 @ ${space3}mm c/c (2 Faces)`
  };
  items.push(recomputeDynamicBBSItem(item3));

  return items;
}

// ----------------------------------------------------
// TWIN CELL BOX CULVERT DYNAMIC BBS
// ----------------------------------------------------
export function generateTwinBoxCulvertDynamicBBS(p: Record<string, any>): BBSItem[] {
  const S = p.clearSpan ?? p.clear_span ?? 2.50;
  const H = p.clearHeight ?? p.clear_height ?? 2.00;
  const Lb = p.barrelLength ?? p.barrel_length ?? 8.50;
  const tw = p.wallThickness ?? p.wall_thickness ?? 0.30;
  const tpier = p.pierThickness ?? p.pier_thickness ?? 0.30;
  const tb = p.bottomSlabThickness ?? p.bottom_slab_thickness ?? 0.30;
  const ttop = p.topSlabThickness ?? p.top_slab_thickness ?? 0.30;

  // Fillet & Fillet Bar options
  const hasFillet = p.hasFillet !== undefined ? Boolean(p.hasFillet) : (p.has_fillet !== undefined ? Boolean(p.has_fillet) : true);
  const haunch = hasFillet ? (p.filletSize ?? p.fillet_size ?? p.haunch_size ?? 0.20) : 0;
  const hasFilletBar = p.hasFilletBar !== undefined ? Boolean(p.hasFilletBar) : (p.has_fillet_bar !== undefined ? Boolean(p.has_fillet_bar) : true);
  const filletDia = p.filletBarDia ?? p.fillet_bar_dia ?? 12;
  const filletSpace = p.filletBarSpacing ?? p.fillet_bar_spacing ?? 150;

  // Scour Wall options
  const hasScour = p.hasScourWall !== undefined ? Boolean(p.hasScourWall) : (p.has_scour_wall !== undefined ? Boolean(p.has_scour_wall) : true);
  const scourLoc = p.scourWallLocation ?? p.scour_wall_location ?? (hasScour ? 'both' : 'none');
  const scourDepth = p.scourWallDepth ?? p.scour_wall_depth ?? 1.20;
  const scourThick = p.scourWallThickness ?? p.scour_wall_thickness ?? 0.30;
  const scourWallCount = !hasScour || scourLoc === 'none' ? 0 : (scourLoc === 'both' ? 2 : 1);

  const totalWidth = 2 * S + 2 * tw + tpier;
  const cover = 40; // mm
  const items: BBSItem[] = [];

  // 1. Bottom Slab Main Transverse Tension Bar (U-Bar, Shape 21) across twin cells
  const bSlabA = Number((totalWidth - (2 * cover) / 1000).toFixed(3));
  const bSlabB = Number((tb + 0.30 - cover / 1000).toFixed(3));
  const dia1 = 16;
  const space1 = 125;

  const item1: BBSItem = {
    id: 'bbs-tbc-01',
    structure_name: `RCC Twin Box Culvert (2×${S}m × ${H}m)`,
    component: 'Base Slab',
    bar_mark: 'TBC-01',
    bar_diameter_mm: dia1,
    shape_type: 'U_HOOK',
    no_of_elements: 1,
    bars_per_element: 1,
    length_a_m: bSlabA,
    length_b_m: bSlabB,
    length_c_m: bSlabB,
    bend_count_90: 2,
    dimension_driver: {
      dimension_name: 'Barrel Length (Lb)',
      dimension_val_m: Lb,
      clear_cover_mm: cover,
      spacing_mm: space1,
      multiplier: 1,
      formula_desc: ''
    },
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `Base Slab continuous bottom transverse rebar Ø16 @ ${space1}mm c/c (Full Width ${totalWidth.toFixed(2)}m)`
  };
  items.push(recomputeDynamicBBSItem(item1));

  // 2. Top Slab Main Transverse Tension Bar (U-Bar, Shape 21)
  const tSlabA = bSlabA;
  const tSlabB = Number((ttop + 0.30 - cover / 1000).toFixed(3));
  const dia2 = 16;
  const space2 = 125;

  const item2: BBSItem = {
    id: 'bbs-tbc-02',
    structure_name: `RCC Twin Box Culvert (2×${S}m × ${H}m)`,
    component: 'Top Slab',
    bar_mark: 'TBC-02',
    bar_diameter_mm: dia2,
    shape_type: 'U_HOOK',
    no_of_elements: 1,
    bars_per_element: 1,
    length_a_m: tSlabA,
    length_b_m: tSlabB,
    length_c_m: tSlabB,
    bend_count_90: 2,
    dimension_driver: {
      dimension_name: 'Barrel Length (Lb)',
      dimension_val_m: Lb,
      clear_cover_mm: cover,
      spacing_mm: space2,
      multiplier: 1,
      formula_desc: ''
    },
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `Top Deck Slab continuous transverse rebar Ø16 @ ${space2}mm c/c (Full Width ${totalWidth.toFixed(2)}m)`
  };
  items.push(recomputeDynamicBBSItem(item2));

  // 3. Side Abutment & Center Pier Wall Vertical Reinforcement (3 walls × 2 faces = 6 layers)
  const wallA = Number((H + tb + ttop - (2 * cover) / 1000).toFixed(3));
  const wallB = 0.35;
  const dia3 = 12;
  const space3 = 150;

  const item3: BBSItem = {
    id: 'bbs-tbc-03',
    structure_name: `RCC Twin Box Culvert (2×${S}m × ${H}m)`,
    component: 'Abutment Wall',
    bar_mark: 'TBC-03',
    bar_diameter_mm: dia3,
    shape_type: 'L_BEND',
    no_of_elements: 1,
    bars_per_element: 1,
    length_a_m: wallA,
    length_b_m: wallB,
    bend_count_90: 1,
    dimension_driver: {
      dimension_name: 'Barrel Length (Lb) × 3 Walls × 2 Faces',
      dimension_val_m: Lb,
      clear_cover_mm: cover,
      spacing_mm: space3,
      multiplier: 6, // 2 outer walls + 1 center pier = 3 walls * 2 faces
      formula_desc: ''
    },
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `Vertical steel in outer abutments & center pier wall Ø12 @ ${space3}mm c/c (3 walls × 2 faces)`
  };
  items.push(recomputeDynamicBBSItem(item3));

  // 4. Corner Haunches 45° Diagonal Ties (8 corners for twin box) - Conditionally generated
  if (hasFillet && hasFilletBar && haunch > 0) {
    const diagA = Number((Math.SQRT2 * haunch).toFixed(3));

    const item4: BBSItem = {
      id: 'bbs-tbc-04',
      structure_name: `RCC Twin Box Culvert (2×${S}m × ${H}m)`,
      component: 'Top Slab',
      bar_mark: 'TBC-04',
      bar_diameter_mm: filletDia,
      shape_type: 'HAUNCH_TIE',
      no_of_elements: 1,
      bars_per_element: 1,
      length_a_m: diagA,
      length_b_m: 0.35,
      length_c_m: 0.35,
      bend_count_135: 2,
      dimension_driver: {
        dimension_name: 'Barrel Length (Lb) × 8 Haunch Corners',
        dimension_val_m: Lb,
        clear_cover_mm: cover,
        spacing_mm: filletSpace,
        multiplier: 8, // 8 corners in twin cell
        formula_desc: ''
      },
      cutting_length_m: 0,
      total_length_m: 0,
      unit_weight_kg_per_m: 0,
      total_weight_kg: 0,
      total_weight_tonnes: 0,
      remarks: `45° Internal Corner Haunch ties Ø${filletDia} @ ${filletSpace}mm c/c (8 corners in twin cells, Haunch ${(haunch * 1000).toFixed(0)}mm)`
    };
    items.push(recomputeDynamicBBSItem(item4));
  }

  // 5. Longitudinal Distribution Bars
  const distA = Number(Lb.toFixed(3));
  const dia5 = 10;
  const space5 = 200;
  const totalPerimeter = 2 * totalWidth + 3 * (H + tb + ttop);

  const item5: BBSItem = {
    id: 'bbs-tbc-05',
    structure_name: `RCC Twin Box Culvert (2×${S}m × ${H}m)`,
    component: 'Base Slab',
    bar_mark: 'TBC-05',
    bar_diameter_mm: dia5,
    shape_type: 'STRAIGHT',
    no_of_elements: 1,
    bars_per_element: 1,
    length_a_m: distA,
    dimension_driver: {
      dimension_name: 'Twin Box Culvert Structural Perimeter',
      dimension_val_m: totalPerimeter,
      clear_cover_mm: cover,
      spacing_mm: space5,
      multiplier: 1,
      formula_desc: ''
    },
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `Longitudinal distribution bars in slabs & walls Ø10 @ ${space5}mm c/c`
  };
  items.push(recomputeDynamicBBSItem(item5));

  // 6. Scour / Cutoff Curtain Wall Vertical Steel (if Scour Wall active and RCC)
  if (scourWallCount > 0 && p.scourWallType === 'rcc') {
    const scourOuterW = totalWidth + 0.60;
    const scourH = scourDepth;
    const item6: BBSItem = {
      id: 'bbs-tbc-06',
      structure_name: `RCC Twin Box Culvert (2×${S}m × ${H}m)`,
      component: 'Base Slab',
      bar_mark: 'TBC-06',
      bar_diameter_mm: 10,
      shape_type: 'U_HOOK',
      no_of_elements: scourWallCount,
      bars_per_element: 1,
      length_a_m: Number((scourThick - 0.08).toFixed(3)),
      length_b_m: Number((scourH - 0.04).toFixed(3)),
      length_c_m: Number((scourH - 0.04).toFixed(3)),
      bend_count_90: 2,
      dimension_driver: {
        dimension_name: `Scour Wall Width (${scourLoc.toUpperCase()}) × ${scourWallCount} Walls`,
        dimension_val_m: scourOuterW,
        clear_cover_mm: cover,
        spacing_mm: 200,
        multiplier: scourWallCount,
        formula_desc: ''
      },
      cutting_length_m: 0,
      total_length_m: 0,
      unit_weight_kg_per_m: 0,
      total_weight_kg: 0,
      total_weight_tonnes: 0,
      remarks: `Cutoff Scour Wall reinforcement U-ties Ø10 @ 200mm c/c (${scourLoc.toUpperCase()} ${scourWallCount} Nos, D=${scourDepth}m)`
    };
    items.push(recomputeDynamicBBSItem(item6));
  }

  return items;
}

// ----------------------------------------------------
// RIGID CONCRETE PAVEMENT (DOWEL & TIE BARS) DYNAMIC BBS
// ----------------------------------------------------
export function generateRigidPavementDynamicBBS(p: Record<string, number>): BBSItem[] {
  const roadLength = p.length ?? p.road_length ?? 100;
  const Wc = p.carriagewayWidth ?? p.carriageway_width ?? 5.50;
  const Tpqc = p.pqcThickness ?? p.asphaltThickness ?? 0.20;

  const jointInterval = 4.5; // Contraction joint spacing (IRC:58 standard 4.5m)
  const numTransverseJoints = Math.max(1, Math.floor(roadLength / jointInterval));
  const dowelDia = 25; // 25mm plain mild steel dowel bar (IRC:58)
  const dowelLength = 0.50; // 500mm length
  const dowelSpacing = 300; // 300mm c/c

  const items: BBSItem[] = [];

  // 1. Transverse Contraction Joint Mild Steel Dowel Bars (Straight, Shape 00)
  const dowelsPerJoint = Math.floor((Wc - 0.30) / (dowelSpacing / 1000)) + 1;
  const item1: BBSItem = {
    id: 'bbs-rp-01',
    structure_name: `Rigid Concrete Pavement (${Wc}m Carriageway, L=${roadLength}m)`,
    component: 'Pavement',
    bar_mark: 'DB-01',
    bar_diameter_mm: dowelDia,
    shape_type: 'STRAIGHT',
    no_of_elements: numTransverseJoints,
    bars_per_element: dowelsPerJoint,
    length_a_m: dowelLength,
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `MS Plain Dowel Bars Ø25 × 500mm @ 300mm c/c at transverse joints (Every ${jointInterval}m)`
  };
  items.push(recomputeDynamicBBSItem(item1));

  // 2. Longitudinal Centerline Joint Deformed Tie Bars (Straight, Shape 00)
  const tieDia = 12; // 12mm TMT deformed tie bar (IRC:58)
  const tieLength = 0.64; // 640mm length
  const tieSpacing = 600; // 600mm c/c along centerline
  const numTieBars = Math.floor((roadLength - 0.5) / (tieSpacing / 1000)) + 1;

  const item2: BBSItem = {
    id: 'bbs-rp-02',
    structure_name: `Rigid Concrete Pavement (${Wc}m Carriageway, L=${roadLength}m)`,
    component: 'Pavement',
    bar_mark: 'TB-01',
    bar_diameter_mm: tieDia,
    shape_type: 'STRAIGHT',
    no_of_elements: 1,
    bars_per_element: numTieBars,
    length_a_m: tieLength,
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `TMT Fe500 Deformed Tie Bars Ø12 × 640mm @ ${tieSpacing}mm c/c along longitudinal centerline joint`
  };
  items.push(recomputeDynamicBBSItem(item2));

  return items;
}

// ----------------------------------------------------
// RCC PIPE CULVERT (CRADLE & HEADWALL) DYNAMIC BBS
// ----------------------------------------------------
export function generatePipeCulvertDynamicBBS(p: Record<string, number>): BBSItem[] {
  const dia = p.pipeDia ?? p.pipe_dia ?? 0.90;
  const numPipes = Math.max(1, p.pipeCount ?? p.pipe_count ?? 1);
  const Lb = p.barrelLength ?? p.barrel_length ?? 8.50;
  const headwallH = dia + 1.20;
  const headwallW = numPipes * (dia + 0.30) + 1.20;

  const cover = 35; // mm
  const items: BBSItem[] = [];

  // 1. Concrete Bedding Cradle Reinforcement Mesh / U-Bars (Shape 21)
  const cradleA = Number((headwallW - (2 * cover) / 1000).toFixed(3));
  const cradleB = 0.40;
  const dia1 = 10;
  const space1 = 150;

  const item1: BBSItem = {
    id: 'bbs-pc-01',
    structure_name: `RCC Pipe Culvert (${numPipes}×NP3 Ø${(dia * 1000).toFixed(0)}mm)`,
    component: 'Base Slab',
    bar_mark: 'PC-01',
    bar_diameter_mm: dia1,
    shape_type: 'U_HOOK',
    no_of_elements: 1,
    bars_per_element: 1,
    length_a_m: cradleA,
    length_b_m: cradleB,
    length_c_m: cradleB,
    bend_count_90: 2,
    dimension_driver: {
      dimension_name: 'Pipe Barrel Length (Lb)',
      dimension_val_m: Lb,
      clear_cover_mm: cover,
      spacing_mm: space1,
      multiplier: 1,
      formula_desc: ''
    },
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `Concrete bedding cradle transverse reinforcement U-bars Ø10 @ ${space1}mm c/c`
  };
  items.push(recomputeDynamicBBSItem(item1));

  // 2. Headwall & Wingwall Vertical Rebar (Shape 11) - 2 Headwalls
  const headA = Number((headwallH - cover / 1000).toFixed(3));
  const headB = 0.35;
  const dia2 = 12;
  const space2 = 150;

  const item2: BBSItem = {
    id: 'bbs-pc-02',
    structure_name: `RCC Pipe Culvert (${numPipes}×NP3 Ø${(dia * 1000).toFixed(0)}mm)`,
    component: 'Wing Wall',
    bar_mark: 'PC-02',
    bar_diameter_mm: dia2,
    shape_type: 'L_BEND',
    no_of_elements: 1,
    bars_per_element: 1,
    length_a_m: headA,
    length_b_m: headB,
    bend_count_90: 1,
    dimension_driver: {
      dimension_name: 'Headwall Width × 2 Headwalls',
      dimension_val_m: headwallW,
      clear_cover_mm: cover,
      spacing_mm: space2,
      multiplier: 2, // Inflow + Outflow headwalls
      formula_desc: ''
    },
    cutting_length_m: 0,
    total_length_m: 0,
    unit_weight_kg_per_m: 0,
    total_weight_kg: 0,
    total_weight_tonnes: 0,
    remarks: `Inlet & outlet headwall/wingwall vertical reinforcement Ø12 @ ${space2}mm c/c (2 Ends)`
  };
  items.push(recomputeDynamicBBSItem(item2));

  return items;
}

// ====================================================
// MASTER DISPATCHER: GENERATE BBS FROM ANY DRAWING TEMPLATE
// Maps category, subtype, and dynamic params directly into BBSItem[]
// ====================================================
export function generateBBSFromDrawing(
  category: 'drain' | 'culvert' | 'road' | 'protection_wall' | string,
  drawingType: string,
  params: Record<string, number>
): BBSItem[] {
  const normCategory = (category || '').toLowerCase();
  const normType = (drawingType || '').toLowerCase();

  // 1. CULVERTS
  if (normCategory === 'culvert' || normType.includes('culvert')) {
    if (normType.includes('slab') || normType === 'slab_culvert') {
      return generateSlabCulvertDynamicBBS({
        clear_span: params.clearSpan ?? params.clear_span ?? 4.0,
        barrel_length: params.barrelLength ?? params.barrel_length ?? 8.5,
        deck_slab_thickness: params.deckSlabThickness ?? params.deck_slab_thickness ?? params.topSlabThickness ?? 0.35,
        bearing_length: params.bearingLength ?? params.bearing_length ?? 0.40,
        bed_block_thickness: params.bedBlockThickness ?? params.bed_block_thickness ?? 0.25,
        dirt_wall_height: params.dirtWallHeight ?? params.dirt_wall_height ?? 0.40,
        kerb_width: params.kerbWidth ?? params.kerb_width ?? 0.30,
        kerb_height: params.kerbHeight ?? params.kerb_height ?? 0.30
      });
    }
    if (normType === 'box_twin' || normType.includes('twin')) {
      return generateTwinBoxCulvertDynamicBBS(params);
    }
    if (normType === 'pipe_rcc' || normType.includes('pipe')) {
      return generatePipeCulvertDynamicBBS(params);
    }
    // Default Single Cell Box Culvert
    return generateBoxCulvertDynamicBBS({
      clear_span: params.clearSpan ?? params.clear_span ?? 2.50,
      clear_height: params.clearHeight ?? params.clear_height ?? 2.00,
      barrel_length: params.barrelLength ?? params.barrel_length ?? 8.50,
      wall_thickness: params.wallThickness ?? params.wall_thickness ?? 0.30,
      bottom_slab_thickness: params.bottomSlabThickness ?? params.bottom_slab_thickness ?? 0.30,
      top_slab_thickness: params.topSlabThickness ?? params.top_slab_thickness ?? 0.30,
      haunch_size: params.haunchSize ?? params.haunch_size ?? 0.25
    });
  }

  // 2. DRAINS
  if (normCategory === 'drain' || normType.includes('drain')) {
    return generateDrainDynamicBBS({
      reach_length: params.length ?? params.reach_length ?? 100,
      clear_width: params.invertWidth ?? params.clear_width ?? 0.75,
      clear_depth: params.depth ?? params.clear_depth ?? 0.80,
      wall_thickness: params.wallThickness ?? params.wall_thickness ?? 0.15,
      base_slab_thickness: params.baseThickness ?? params.base_slab_thickness ?? 0.15
    });
  }

  // 3. PROTECTION / RETAINING WALLS
  if (normCategory === 'protection_wall' || normCategory === 'retaining_structure' || normType.includes('wall')) {
    return generateProtectionWallDynamicBBS({
      wallHeight: params.wallHeight ?? 3.0,
      wallLength: params.wallLength ?? 30.0,
      topWidth: params.wallTopWidth ?? params.topWidth ?? 0.50,
      bottomWidth: params.wallBottomWidth ?? params.bottomWidth ?? 1.20,
      foundationDepth: params.foundationDepth ?? params.excavationDepth ?? 1.20,
      pccWidth: params.pccWidth ?? params.excavationWidth ?? 1.80
    });
  }

  // 4. ROADS (RIGID CONCRETE / PQC)
  if (normCategory === 'road' || normType.includes('road') || normType.includes('rigid') || normType.includes('pqc')) {
    return generateRigidPavementDynamicBBS(params);
  }

  // Fallback to Slab Culvert preset
  return generateSlabCulvertDynamicBBS(params);
}

// ----------------------------------------------------
// QUICK SUMMARY FOR CAD DRAWINGS
// ----------------------------------------------------
export function getBBSPreviewSummaryForDrawing(
  category: string,
  drawingType: string,
  params: Record<string, number>
): {
  totalSteelKg: number;
  totalSteelTonnes: number;
  totalBarsCount: number;
  itemsCount: number;
  items: BBSItem[];
} {
  const items = generateBBSFromDrawing(category, drawingType, params);
  let totalKg = 0;
  let totalBars = 0;

  items.forEach((item) => {
    totalKg += item.total_weight_kg;
    totalBars += item.no_of_elements * item.bars_per_element;
  });

  return {
    totalSteelKg: Math.round(totalKg * 10) / 10,
    totalSteelTonnes: Math.round((totalKg / 1000) * 1000) / 1000,
    totalBarsCount: totalBars,
    itemsCount: items.length,
    items
  };
}
