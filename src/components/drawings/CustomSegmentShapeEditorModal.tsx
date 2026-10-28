import React, { useState, useEffect, useMemo } from 'react';
import {
  BBSItem,
  BBSSegmentDef,
  SegmentTurnDirection,
  BBSShapeType
} from '../../types';
import {
  computeCustomSegmentsGeometry,
  convertShapeToSegments,
  recomputeDynamicBBSItem,
  calculateRebarUnitWeight,
  BBS_SHAPE_CATALOG
} from '../../services/bbsDynamicEngine';
import { DynamicRebarShapeSvg } from './DynamicRebarShapeSvg';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Layers,
  Compass,
  Check,
  X,
  Sparkles,
  Info,
  Maximize2,
  Copy,
  Hash,
  Ruler,
  HelpCircle
} from 'lucide-react';

interface CustomSegmentShapeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: BBSItem) => void;
  initialItem?: BBSItem;
  structureName?: string;
}

const PRESET_TEMPLATES: {
  name: string;
  shapeType: BBSShapeType;
  bsCode: string;
  description: string;
  segments: BBSSegmentDef[];
}[] = [
  {
    name: 'Straight Bar',
    shapeType: 'STRAIGHT',
    bsCode: '00',
    description: 'Straight longitudinal bar without bends',
    segments: [
      { segment_id: 'A', label: 'Main Length', length_m: 3.5, direction: 'STRAIGHT', turn_angle_deg: 0, bend_deduction_d_factor: 0 }
    ]
  },
  {
    name: 'L-Bend Starter Dowel',
    shapeType: 'L_BEND',
    bsCode: '11',
    description: 'Straight bar with single 90° anchorage leg',
    segments: [
      { segment_id: 'A', label: 'Main Span', length_m: 2.8, direction: 'STRAIGHT', turn_angle_deg: 0, bend_deduction_d_factor: 0 },
      { segment_id: 'B', label: '90° Leg / Bend', length_m: 0.45, direction: 'TURN_DOWN_90', turn_angle_deg: 90, bend_deduction_d_factor: 2 }
    ]
  },
  {
    name: 'Double L-Bend / U-Bar',
    shapeType: 'U_HOOK',
    bsCode: '21',
    description: 'U-shaped bottom tray / tension bar with two uprights',
    segments: [
      { segment_id: 'B', label: 'Left Upright', length_m: 0.35, direction: 'TURN_DOWN_90', turn_angle_deg: 0, bend_deduction_d_factor: 0 },
      { segment_id: 'A', label: 'Bottom Web', length_m: 3.2, direction: 'TURN_RIGHT_90', turn_angle_deg: 90, bend_deduction_d_factor: 2 },
      { segment_id: 'C', label: 'Right Upright', length_m: 0.35, direction: 'TURN_UP_90', turn_angle_deg: 90, bend_deduction_d_factor: 2 }
    ]
  },
  {
    name: 'Z-Step / Retaining Dowel',
    shapeType: 'CUSTOM_MULTI_SEGMENT',
    bsCode: '33',
    description: 'Z-shaped stepped bar for wall-to-slab or footing',
    segments: [
      { segment_id: 'A', label: 'Top Horizontal', length_m: 0.8, direction: 'STRAIGHT', turn_angle_deg: 0, bend_deduction_d_factor: 0 },
      { segment_id: 'B', label: 'Vertical Step', length_m: 0.5, direction: 'TURN_DOWN_90', turn_angle_deg: 90, bend_deduction_d_factor: 2 },
      { segment_id: 'C', label: 'Bottom Horizontal', length_m: 0.8, direction: 'TURN_RIGHT_90', turn_angle_deg: 90, bend_deduction_d_factor: 2 }
    ]
  },
  {
    name: '45° Bent-Up Crank Bar',
    shapeType: 'CRANKED_BENT_UP',
    bsCode: '41',
    description: 'Truss tension bar cranked at 45° for shear resistance',
    segments: [
      { segment_id: 'A', label: 'Left Bottom Span', length_m: 1.0, direction: 'STRAIGHT', turn_angle_deg: 0, bend_deduction_d_factor: 0 },
      { segment_id: 'B', label: 'Left 45° Crank', length_m: 0.45, direction: 'CRANK_UP_45', turn_angle_deg: 45, bend_deduction_d_factor: 1 },
      { segment_id: 'C', label: 'Center Top Span', length_m: 2.2, direction: 'STRAIGHT', turn_angle_deg: 45, bend_deduction_d_factor: 1 },
      { segment_id: 'D', label: 'Right 45° Crank', length_m: 0.45, direction: 'CRANK_DOWN_45', turn_angle_deg: 45, bend_deduction_d_factor: 1 },
      { segment_id: 'E', label: 'Right Bottom Span', length_m: 1.0, direction: 'STRAIGHT', turn_angle_deg: 45, bend_deduction_d_factor: 1 }
    ]
  },
  {
    name: 'Closed Rectangular Stirrup (135° Hooks)',
    shapeType: 'RECT_STIRRUP',
    bsCode: '51',
    description: 'Shear ring with 135° seismic end hooks',
    segments: [
      { segment_id: 'E', label: '135° Hook 1', length_m: 0.10, direction: 'CRANK_DOWN_45', turn_angle_deg: 0, is_hook: true, hook_type: 'HOOK_135' },
      { segment_id: 'A', label: 'Top Width', length_m: 0.35, direction: 'STRAIGHT', turn_angle_deg: 135, bend_deduction_d_factor: 3 },
      { segment_id: 'B', label: 'Vertical Leg Right', length_m: 0.50, direction: 'TURN_DOWN_90', turn_angle_deg: 90, bend_deduction_d_factor: 2 },
      { segment_id: 'C', label: 'Bottom Width', length_m: 0.35, direction: 'TURN_LEFT_90', turn_angle_deg: 90, bend_deduction_d_factor: 2 },
      { segment_id: 'D', label: 'Vertical Leg Left', length_m: 0.50, direction: 'TURN_UP_90', turn_angle_deg: 90, bend_deduction_d_factor: 2 },
      { segment_id: 'F', label: '135° Hook 2', length_m: 0.10, direction: 'CRANK_DOWN_LEFT_45', turn_angle_deg: 135, is_hook: true, hook_type: 'HOOK_135', bend_deduction_d_factor: 3 }
    ]
  },
  {
    name: '3D Chair Stool Bar',
    shapeType: 'CHAIR_BAR',
    bsCode: '31',
    description: 'Support stool for top reinforcement mesh',
    segments: [
      { segment_id: 'D', label: 'Left Base Foot', length_m: 0.20, direction: 'STRAIGHT', turn_angle_deg: 0, bend_deduction_d_factor: 0 },
      { segment_id: 'B', label: 'Left Stool Leg', length_m: 0.25, direction: 'TURN_UP_90', turn_angle_deg: 90, bend_deduction_d_factor: 2 },
      { segment_id: 'A', label: 'Top Web', length_m: 0.40, direction: 'TURN_RIGHT_90', turn_angle_deg: 90, bend_deduction_d_factor: 2 },
      { segment_id: 'C', label: 'Right Stool Leg', length_m: 0.25, direction: 'TURN_DOWN_90', turn_angle_deg: 90, bend_deduction_d_factor: 2 },
      { segment_id: 'E', label: 'Right Base Foot', length_m: 0.20, direction: 'TURN_RIGHT_90', turn_angle_deg: 90, bend_deduction_d_factor: 2 }
    ]
  },
  {
    name: 'Capping Hat Bar',
    shapeType: 'CAP_BAR',
    bsCode: '71',
    description: 'U-capping with outward anchor feet for crash kerb / wall top',
    segments: [
      { segment_id: 'D', label: 'Left Outward Foot', length_m: 0.15, direction: 'STRAIGHT', turn_angle_deg: 0, bend_deduction_d_factor: 0 },
      { segment_id: 'B', label: 'Left Leg Down', length_m: 0.30, direction: 'TURN_DOWN_90', turn_angle_deg: 90, bend_deduction_d_factor: 2 },
      { segment_id: 'A', label: 'Top Horizontal', length_m: 0.50, direction: 'TURN_RIGHT_90', turn_angle_deg: 90, bend_deduction_d_factor: 2 },
      { segment_id: 'C', label: 'Right Leg Up', length_m: 0.30, direction: 'TURN_UP_90', turn_angle_deg: 90, bend_deduction_d_factor: 2 },
      { segment_id: 'E', label: 'Right Outward Foot', length_m: 0.15, direction: 'TURN_RIGHT_90', turn_angle_deg: 90, bend_deduction_d_factor: 2 }
    ]
  },
  {
    name: '45° Haunch Corner Tie',
    shapeType: 'HAUNCH_TIE',
    bsCode: '61',
    description: 'Corner diagonal reinforcement for box culvert haunches',
    segments: [
      { segment_id: 'B', label: 'Wall Anchorage Leg', length_m: 0.40, direction: 'STRAIGHT', turn_angle_deg: 0, bend_deduction_d_factor: 0 },
      { segment_id: 'A', label: 'Haunch Diagonal (45°)', length_m: 0.50, direction: 'CRANK_DOWN_45', turn_angle_deg: 45, bend_deduction_d_factor: 1 },
      { segment_id: 'C', label: 'Slab Anchorage Leg', length_m: 0.40, direction: 'TURN_DOWN_90', turn_angle_deg: 45, bend_deduction_d_factor: 1 }
    ]
  }
];

const DIRECTION_OPTIONS: {
  dir: SegmentTurnDirection;
  label: string;
  icon: string;
  defaultAngle: number;
  defaultDeduction: number;
}[] = [
  { dir: 'STRAIGHT', label: 'Straight (→)', icon: '→', defaultAngle: 0, defaultDeduction: 0 },
  { dir: 'TURN_UP_90', label: 'Turn Up 90° (↑)', icon: '↑', defaultAngle: 90, defaultDeduction: 2 },
  { dir: 'TURN_DOWN_90', label: 'Turn Down 90° (↓)', icon: '↓', defaultAngle: 90, defaultDeduction: 2 },
  { dir: 'TURN_LEFT_90', label: 'Turn Left 90° (←)', icon: '←', defaultAngle: 90, defaultDeduction: 2 },
  { dir: 'TURN_RIGHT_90', label: 'Turn Right 90° (→)', icon: '→', defaultAngle: 90, defaultDeduction: 2 },
  { dir: 'CRANK_UP_45', label: 'Crank Up 45° (↗)', icon: '↗', defaultAngle: 45, defaultDeduction: 1 },
  { dir: 'CRANK_DOWN_45', label: 'Crank Down 45° (↘)', icon: '↘', defaultAngle: 45, defaultDeduction: 1 },
  { dir: 'CRANK_UP_LEFT_45', label: 'Crank Up-Left 45° (↖)', icon: '↖', defaultAngle: 45, defaultDeduction: 1 },
  { dir: 'CRANK_DOWN_LEFT_45', label: 'Crank Down-Left 45° (↙)', icon: '↙', defaultAngle: 45, defaultDeduction: 1 },
  { dir: 'HOOK_IN_135', label: 'Seismic Hook 135° (↺)', icon: '↺', defaultAngle: 135, defaultDeduction: 3 },
  { dir: 'HOOK_OUT_135', label: 'Hook Out 135° (↻)', icon: '↻', defaultAngle: 135, defaultDeduction: 3 },
  { dir: 'HOOK_180', label: 'U-Return Hook 180° (↷)', icon: '↷', defaultAngle: 180, defaultDeduction: 4 },
  { dir: 'CUSTOM_ANGLE', label: 'Custom Angle (∠)', icon: '∠', defaultAngle: 60, defaultDeduction: 1.5 }
];

export const CustomSegmentShapeEditorModal: React.FC<CustomSegmentShapeEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  structureName = 'RCC Structure'
}) => {
  if (!isOpen) return null;

  // Initialize bar mark state
  const [barMark, setBarMark] = useState(initialItem?.bar_mark || 'BM-01');
  const [component, setComponent] = useState<any>(initialItem?.component || 'Deck Slab');
  const [diameter, setDiameter] = useState<number>(initialItem?.bar_diameter_mm || 16);
  const [noOfElements, setNoOfElements] = useState<number>(initialItem?.no_of_elements || 1);
  const [barsPerElement, setBarsPerElement] = useState<number>(initialItem?.bars_per_element || 28);
  const [remarks, setRemarks] = useState<string>(initialItem?.remarks || '');
  const [shapeName, setShapeName] = useState<string>(initialItem?.shape_name || 'Custom Bent Shape');
  const [shapeCode, setShapeCode] = useState<string>(initialItem?.shape_code || '99');

  // Segments sequence
  const [segments, setSegments] = useState<BBSSegmentDef[]>(() => {
    if (initialItem?.custom_segments && initialItem.custom_segments.length > 0) {
      return JSON.parse(JSON.stringify(initialItem.custom_segments));
    }
    if (initialItem) {
      return convertShapeToSegments(
        initialItem.shape_type,
        initialItem.length_a_m,
        initialItem.length_b_m,
        initialItem.length_c_m,
        initialItem.length_d_m,
        initialItem.length_e_m,
        initialItem.length_f_m
      );
    }
    return PRESET_TEMPLATES[2].segments; // default U-Bar
  });

  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(0);
  const [canvasTheme, setCanvasTheme] = useState<'cad' | 'light' | 'blueprint'>('light');

  // Recalculate geometry live
  const geomResult = useMemo(() => {
    return computeCustomSegmentsGeometry(segments, diameter);
  }, [segments, diameter]);

  const unitWeight = calculateRebarUnitWeight(diameter);
  const totalLengthM = Number((geomResult.cuttingLengthM * noOfElements * barsPerElement).toFixed(2));
  const totalWeightKg = Number((totalLengthM * unitWeight).toFixed(2));
  const totalWeightTonnes = Number((totalWeightKg / 1000).toFixed(3));

  // Handlers for segment modifications
  const handleUpdateSegment = (index: number, updates: Partial<BBSSegmentDef>) => {
    setSegments((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleAddSegment = () => {
    setSegments((prev) => {
      const nextIndex = prev.length;
      const nextLetter = String.fromCharCode(65 + (nextIndex % 26));
      const newSeg: BBSSegmentDef = {
        segment_id: nextLetter,
        label: `Segment ${nextLetter}`,
        length_m: 0.35,
        direction: 'TURN_DOWN_90',
        turn_angle_deg: 90,
        bend_deduction_d_factor: 2
      };
      return [...prev, newSeg];
    });
    setActiveSegmentIndex(segments.length);
  };

  const handleDuplicateSegment = (index: number) => {
    setSegments((prev) => {
      const target = prev[index];
      const next = [...prev];
      const newSeg: BBSSegmentDef = {
        ...target,
        segment_id: String.fromCharCode(65 + (prev.length % 26)),
        label: `${target.label} (Copy)`
      };
      next.splice(index + 1, 0, newSeg);
      return next;
    });
  };

  const handleRemoveSegment = (index: number) => {
    if (segments.length <= 1) return;
    setSegments((prev) => prev.filter((_, i) => i !== index));
    if (activeSegmentIndex >= segments.length - 1) {
      setActiveSegmentIndex(Math.max(0, segments.length - 2));
    }
  };

  const handleMoveSegment = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= segments.length) return;
    setSegments((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next;
    });
    setActiveSegmentIndex(target);
  };

  // Flip and Mirror Operations
  const handleFlipHorizontal = () => {
    setSegments((prev) => {
      return prev.map((seg) => {
        let nextDir = seg.direction;
        if (seg.direction === 'TURN_LEFT_90') nextDir = 'TURN_RIGHT_90';
        else if (seg.direction === 'TURN_RIGHT_90') nextDir = 'TURN_LEFT_90';
        else if (seg.direction === 'CRANK_UP_45') nextDir = 'CRANK_UP_LEFT_45';
        else if (seg.direction === 'CRANK_UP_LEFT_45') nextDir = 'CRANK_UP_45';
        else if (seg.direction === 'CRANK_DOWN_45') nextDir = 'CRANK_DOWN_LEFT_45';
        else if (seg.direction === 'CRANK_DOWN_LEFT_45') nextDir = 'CRANK_DOWN_45';
        return { ...seg, direction: nextDir };
      });
    });
  };

  const handleFlipVertical = () => {
    setSegments((prev) => {
      return prev.map((seg) => {
        let nextDir = seg.direction;
        if (seg.direction === 'TURN_UP_90') nextDir = 'TURN_DOWN_90';
        else if (seg.direction === 'TURN_DOWN_90') nextDir = 'TURN_UP_90';
        else if (seg.direction === 'CRANK_UP_45') nextDir = 'CRANK_DOWN_45';
        else if (seg.direction === 'CRANK_DOWN_45') nextDir = 'CRANK_UP_45';
        else if (seg.direction === 'CRANK_UP_LEFT_45') nextDir = 'CRANK_DOWN_LEFT_45';
        else if (seg.direction === 'CRANK_DOWN_LEFT_45') nextDir = 'CRANK_UP_LEFT_45';
        return { ...seg, direction: nextDir };
      });
    });
  };

  const handleReverseSequence = () => {
    setSegments((prev) => [...prev].reverse());
  };

  const handleApplyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setSegments(JSON.parse(JSON.stringify(preset.segments)));
    setShapeName(preset.name);
    setShapeCode(preset.bsCode);
    setActiveSegmentIndex(0);
  };

  const handleSaveBar = () => {
    const baseItem: BBSItem = {
      id: initialItem?.id || `bbs-custom-${Date.now()}`,
      structure_name: initialItem?.structure_name || structureName,
      component,
      bar_mark: barMark.trim() || 'BM-01',
      bar_diameter_mm: diameter,
      shape_type: 'CUSTOM_MULTI_SEGMENT',
      shape_code: shapeCode,
      shape_name: shapeName,
      no_of_elements: Number(noOfElements) || 1,
      bars_per_element: Number(barsPerElement) || 1,
      length_a_m: segments[0]?.length_m || 0,
      length_b_m: segments[1]?.length_m,
      length_c_m: segments[2]?.length_m,
      length_d_m: segments[3]?.length_m,
      length_e_m: segments[4]?.length_m,
      length_f_m: segments[5]?.length_m,
      custom_segments: segments,
      cutting_length_m: geomResult.cuttingLengthM,
      total_length_m: totalLengthM,
      unit_weight_kg_per_m: unitWeight,
      total_weight_kg: totalWeightKg,
      total_weight_tonnes: totalWeightTonnes,
      formula_cutting_length_desc: geomResult.formulaExpression,
      remarks
    };

    const recomputed = recomputeDynamicBBSItem(baseItem);
    onSave(recomputed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Rebar Segment Turning & Bending Designer
                </h2>
                <span className="px-2 py-0.5 text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md font-bold">
                  IS:2502 / BS:8666
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Define exact straight line lengths, turn angles, bend deductions, and hooks to synthesize custom Bar Marks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Presets Ribbon */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-thin">
          <span className="text-xs font-bold text-slate-600 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Presets:
          </span>
          {PRESET_TEMPLATES.map((tpl) => (
            <button
              key={tpl.name}
              onClick={() => handleApplyPreset(tpl)}
              className="px-3 py-1 text-xs font-medium bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 rounded-lg text-slate-700 whitespace-nowrap transition-all shrink-0 shadow-2xs"
              title={tpl.description}
            >
              {tpl.name} <span className="text-slate-400 font-mono text-[10px]">({tpl.bsCode})</span>
            </button>
          ))}
        </div>

        {/* Modal Main Body: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          
          {/* Left Column: Visual Vector CAD Canvas & Engineering Math (5 cols) */}
          <div className="lg:col-span-5 p-5 flex flex-col gap-4 bg-slate-50/50">
            
            {/* Realtime CAD Canvas Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col relative overflow-hidden shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Vector CAD Simulation
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setCanvasTheme('light')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      canvasTheme === 'light' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => setCanvasTheme('blueprint')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      canvasTheme === 'blueprint' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Blueprint
                  </button>
                  <button
                    onClick={() => setCanvasTheme('cad')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      canvasTheme === 'cad' ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Dark CAD
                  </button>
                </div>
              </div>

              {/* Dynamic SVG Display with Grid */}
              <div
                className={`w-full h-52 rounded-lg border flex items-center justify-center p-4 relative overflow-hidden transition-colors ${
                  canvasTheme === 'cad'
                    ? 'bg-slate-950 border-slate-800'
                    : canvasTheme === 'blueprint'
                    ? 'bg-blue-950/90 border-blue-800'
                    : 'bg-white border-slate-200'
                }`}
                style={{
                  backgroundImage:
                    canvasTheme === 'cad'
                      ? 'radial-gradient(circle, #334155 1px, transparent 1px)'
                      : canvasTheme === 'blueprint'
                      ? 'radial-gradient(circle, #3b82f6 1px, transparent 1px)'
                      : 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
                  backgroundSize: '16px 16px'
                }}
              >
                <DynamicRebarShapeSvg
                  segments={segments}
                  activeSegmentIndex={activeSegmentIndex}
                  width={340}
                  height={170}
                  theme={canvasTheme}
                  showLabels={true}
                  showAngles={true}
                  onSelectSegment={(idx) => setActiveSegmentIndex(idx)}
                />
              </div>

              {/* Canvas Geometric Controls */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200 text-xs">
                <span className="text-slate-500">
                  Segments: <strong className="text-slate-900">{segments.length}</strong> | Bends: <strong className="text-amber-600">{geomResult.bendsCount.count90 + geomResult.bendsCount.count45 + geomResult.bendsCount.count135 + geomResult.bendsCount.count180}</strong>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleFlipHorizontal}
                    title="Flip Horizontal (Mirror X)"
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleFlipVertical}
                    title="Flip Vertical (Mirror Y)"
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                  >
                    <FlipVertical className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleReverseSequence}
                    title="Reverse Sequence (Start ↔ End)"
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Engineering Formula & Quantities Breakdown */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Ruler className="w-4 h-4 text-indigo-600" /> Cutting Length & Steel Weight
                </span>
                <span className="text-xs font-mono font-bold text-indigo-700">
                  Ø {diameter}mm ({unitWeight.toFixed(3)} kg/m)
                </span>
              </div>

              {/* Math Trace */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono text-xs text-slate-700 break-all leading-relaxed">
                <div className="text-[11px] text-slate-500 mb-0.5">IS:2502 Step-by-Step Deduction Trace:</div>
                <div className="text-emerald-700 font-bold">{geomResult.formulaExpression}</div>
              </div>

              {/* Metric Values Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div className="text-slate-500 text-[11px] font-medium">Gross Segment Sum</div>
                  <div className="text-sm font-bold text-slate-900 font-mono">{geomResult.grossSumM.toFixed(3)} m</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div className="text-slate-500 text-[11px] font-medium">Total Bend Deductions</div>
                  <div className="text-sm font-bold text-amber-700 font-mono">
                    -{geomResult.bendDeductionM.toFixed(3)} m
                  </div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div className="text-slate-500 text-[11px] font-medium">Net Cutting Length / Bar</div>
                  <div className="text-base font-bold text-emerald-700 font-mono">{geomResult.cuttingLengthM.toFixed(3)} m</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div className="text-slate-500 text-[11px] font-medium">Total Weight (for {noOfElements * barsPerElement} Nos)</div>
                  <div className="text-base font-bold text-indigo-700 font-mono">{totalWeightKg.toFixed(1)} kg ({totalWeightTonnes.toFixed(3)} MT)</div>
                </div>
              </div>
            </div>

            {/* Bar Mark Attributes Form */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Bar Mark Specification
              </span>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-700 font-medium block mb-1">Bar Mark</label>
                  <input
                    type="text"
                    value={barMark}
                    onChange={(e) => setBarMark(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. SC-01, T1"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-medium block mb-1">Diameter (Ø mm)</label>
                  <select
                    value={diameter}
                    onChange={(e) => setDiameter(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {[8, 10, 12, 16, 20, 25, 28, 32, 36, 40].map((d) => (
                      <option key={d} value={d}>
                        Ø {d} mm ({calculateRebarUnitWeight(d)} kg/m)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-medium block mb-1">Component / Member</label>
                  <select
                    value={component}
                    onChange={(e) => setComponent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {[
                      'Deck Slab',
                      'Abutment Wall',
                      'Base Slab',
                      'Footing',
                      'Wing Wall',
                      'L-Cap Bed-Block',
                      'Dirt Wall',
                      'Crash Kerb',
                      'Column',
                      'Beam',
                      'Stem',
                      'Shear Key',
                      'Cover Slab'
                    ].map((comp) => (
                      <option key={comp} value={comp}>
                        {comp}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-medium block mb-1">Bars Per Element (Nos)</label>
                  <input
                    type="number"
                    min="1"
                    value={barsPerElement}
                    onChange={(e) => setBarsPerElement(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Interactive Segment Sequence Builder & Turning Angles (7 cols) */}
          <div className="lg:col-span-7 p-5 flex flex-col gap-4 bg-slate-50/30 overflow-y-auto">
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" /> Segment Sequence & Angle Turning Table
                </h3>
                <p className="text-xs text-slate-500">
                  Configure segment order, lengths, turn directions, and deduction factors
                </p>
              </div>

              <button
                onClick={handleAddSegment}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Segment
              </button>
            </div>

            {/* Segments List Cards */}
            <div className="flex flex-col gap-3">
              {segments.map((seg, idx) => {
                const isActive = activeSegmentIndex === idx;
                const letter = seg.segment_id || String.fromCharCode(65 + idx);

                return (
                  <div
                    key={`segment-card-${idx}`}
                    onClick={() => setActiveSegmentIndex(idx)}
                    className={`border rounded-xl p-3.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {/* Segment Identifier & Name */}
                      <div className="flex items-center gap-2 flex-1">
                        <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {letter}
                        </span>
                        <input
                          type="text"
                          value={seg.label}
                          onChange={(e) => handleUpdateSegment(idx, { label: e.target.value })}
                          className="bg-transparent text-xs font-bold text-slate-900 focus:bg-slate-50 border border-transparent focus:border-slate-300 rounded px-2 py-1 w-full max-w-xs focus:outline-none"
                          placeholder="e.g. Main bottom span, Vertical leg"
                        />
                      </div>

                      {/* Sequence Control Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveSegment(idx, -1);
                          }}
                          disabled={idx === 0}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveSegment(idx, 1);
                          }}
                          disabled={idx === segments.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateSegment(idx);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700"
                          title="Duplicate Segment"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSegment(idx);
                          }}
                          disabled={segments.length <= 1}
                          className="p-1 text-red-500 hover:text-red-700 disabled:opacity-30"
                          title="Delete Segment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Segment Geometry Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                      
                      {/* Length Input with Quick Increment Buttons */}
                      <div className="md:col-span-5 flex flex-col gap-1">
                        <label className="text-[11px] text-slate-600 font-medium flex items-center justify-between">
                          <span>Straight Length (m)</span>
                          <span className="font-mono text-slate-500">{(seg.length_m * 1000).toFixed(0)} mm</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={seg.length_m}
                            onChange={(e) =>
                              handleUpdateSegment(idx, { length_m: Math.max(0.01, Number(e.target.value)) })
                            }
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateSegment(idx, { length_m: Number((seg.length_m + 0.05).toFixed(3)) })
                            }
                            className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-mono shrink-0 font-semibold"
                          >
                            +0.05
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateSegment(idx, { length_m: Number((seg.length_m + 0.10).toFixed(3)) })
                            }
                            className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-mono shrink-0 font-semibold"
                          >
                            +0.10
                          </button>
                        </div>
                      </div>

                      {/* Direction and Turn Angle Selector */}
                      <div className="md:col-span-7 flex flex-col gap-1">
                        <label className="text-[11px] text-slate-600 font-medium">
                          Turn Direction & Bending Angle ({idx === 0 ? 'Initial Orientation' : 'Corner Turn'})
                        </label>
                        <select
                          value={seg.direction}
                          onChange={(e) => {
                            const val = e.target.value as SegmentTurnDirection;
                            const opt = DIRECTION_OPTIONS.find((o) => o.dir === val);
                            handleUpdateSegment(idx, {
                              direction: val,
                              turn_angle_deg: opt?.defaultAngle ?? 90,
                              bend_deduction_d_factor: opt?.defaultDeduction ?? 2
                            });
                          }}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                          {DIRECTION_OPTIONS.map((opt) => (
                            <option key={opt.dir} value={opt.dir}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                    </div>

                    {/* Advanced Bend Angle & Deduction Options (Shown when active or for custom angle) */}
                    {(isActive || seg.direction === 'CUSTOM_ANGLE') && idx > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200 grid grid-cols-2 gap-3 text-[11px]">
                        <div>
                          <label className="text-slate-600 font-medium block mb-1">Turn Angle (Degrees)</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="360"
                              value={seg.turn_angle_deg}
                              onChange={(e) =>
                                handleUpdateSegment(idx, { turn_angle_deg: Number(e.target.value) })
                              }
                              className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            <span className="text-slate-500">deg</span>
                          </div>
                        </div>

                        <div>
                          <label className="text-slate-600 font-medium block mb-1">IS Bend Deduction Factor</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={seg.bend_deduction_d_factor ?? 2}
                              onChange={(e) =>
                                handleUpdateSegment(idx, { bend_deduction_d_factor: Number(e.target.value) })
                              }
                              className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            <span className="text-slate-500">× d</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Helper Banner */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-indigo-900">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong>IS 2502 Bend Deduction Standard:</strong> 45° bend = 1d deduction ({(1 * (diameter / 1000)).toFixed(3)}m), 90° bend = 2d ({(2 * (diameter / 1000)).toFixed(3)}m), 135° bend = 3d ({(3 * (diameter / 1000)).toFixed(3)}m), 180° hook = 4d deduction + 9d hook length.
              </div>
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="text-xs text-slate-600">
            Shape Code: <strong className="text-slate-900 font-mono font-bold">{shapeCode}</strong> | Cutting Length: <strong className="text-emerald-700 font-mono font-black text-sm">{geomResult.cuttingLengthM.toFixed(3)}m</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveBar}
              className="px-5 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4" /> Save Bar Mark to Schedule
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
