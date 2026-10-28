import React from 'react';
import { ProjectEstimate } from '../../types';
import { DrawingCategory } from './types';

interface DrawingTitleBlockProps {
  project: ProjectEstimate;
  category: DrawingCategory;
  subType: string;
  drawingScale: string;
  selectedFY: string;
  selectedItemCode?: string;
  selectedItemDesc?: string;
  showTitleBlock: boolean;
  showLegend: boolean;
  textColor: string;
  lineColor: string;
  bgColor: string;
  activeMaterials: Array<{ name: string; hatchId: string }>;
}

export const DrawingTitleBlock: React.FC<DrawingTitleBlockProps> = ({
  project,
  category,
  subType,
  drawingScale,
  selectedFY,
  selectedItemCode,
  selectedItemDesc,
  showTitleBlock,
  showLegend,
  textColor,
  lineColor,
  bgColor,
  activeMaterials
}) => {
  const getCategoryTitle = () => {
    if (category === 'drain') return 'ROADSIDE DRAIN CROSS-SECTION';
    if (category === 'road') return 'ROADWAY PAVEMENT CROSS-SECTION';
    return 'CULVERT STRUCTURE CROSS-SECTION';
  };

  const getVariantTitle = () => {
    switch (subType) {
      case 'rectangular': return 'Rectangular RCC/PCC Drain';
      case 'trapezoidal': return 'Trapezoidal Stone Masonry Drain';
      case 'l_shaped': return 'L-Shaped Roadside Kerb & Gutter Drain';
      case 'flexible_asphalt': return 'Flexible Asphalt Concrete Road';
      case 'rigid_concrete': return 'Rigid PCC/RCC Concrete Pavement';
      case 'earthen_gravel': return 'Earthen / Gravel Roadway';
      case 'box_single': return 'Single Cell RCC Box Culvert';
      case 'box_twin': return 'Twin Cell RCC Box Culvert';
      case 'pipe_rcc': return 'RCC Pipe Culvert with Concrete Bedding';
      case 'slab_culvert': return 'RCC Slab Culvert with Masonry Abutments';
      default: return subType.toUpperCase();
    }
  };

  return (
    <g id="engineeringOverlay">
      {/* 1. DYNAMIC MATERIAL LEGEND */}
      {showLegend && activeMaterials.length > 0 && (
        <g id="materialLegend" transform="translate(20, 20)">
          <rect
            x="0"
            y="0"
            width="170"
            height={28 + activeMaterials.length * 20}
            fill={bgColor}
            stroke={lineColor}
            strokeWidth="1.5"
            opacity="0.9"
          />
          <text x="10" y="18" fill={textColor} fontSize="11" fontWeight="extrabold">
            MATERIAL LEGEND
          </text>
          <line x1="0" y1="24" x2="170" y2="24" stroke={lineColor} strokeWidth="1" />

          {activeMaterials.map((mat, idx) => (
            <g key={mat.hatchId} transform={`translate(10, ${34 + idx * 20})`}>
              <rect
                x="0"
                y="-10"
                width="22"
                height="12"
                fill={`url(#${mat.hatchId})`}
                stroke={lineColor}
                strokeWidth="1"
              />
              <text x="30" y="0" fill={textColor} fontSize="10" fontWeight="bold">
                {mat.name}
              </text>
            </g>
          ))}
        </g>
      )}

      {/* 2. AUTOMATIC GRAPHICAL SCALE BAR */}
      <g id="scaleBar" transform="translate(20, 485)">
        <rect x="0" y="0" width="180" height="26" fill={bgColor} stroke={lineColor} strokeWidth="1" opacity="0.85" />
        <text x="10" y="12" fill={textColor} fontSize="9" fontWeight="bold">
          SCALE {drawingScale} (0
        </text>
        {/* Scale bar ticks */}
        <line x1="80" y1="18" x2="170" y2="18" stroke={lineColor} strokeWidth="2" />
        <line x1="80" y1="14" x2="80" y2="22" stroke={lineColor} strokeWidth="1.5" />
        <line x1="110" y1="14" x2="110" y2="22" stroke={lineColor} strokeWidth="1.5" />
        <line x1="140" y1="14" x2="140" y2="22" stroke={lineColor} strokeWidth="1.5" />
        <line x1="170" y1="14" x2="170" y2="22" stroke={lineColor} strokeWidth="1.5" />
        {/* Alternating black/white blocks */}
        <rect x="80" y="16" width="30" height="4" fill={lineColor} />
        <rect x="110" y="16" width="30" height="4" fill={bgColor} stroke={lineColor} strokeWidth="0.5" />
        <rect x="140" y="16" width="30" height="4" fill={lineColor} />

        <text x="80" y="11" fill={textColor} fontSize="8" textAnchor="middle">1</text>
        <text x="110" y="11" fill={textColor} fontSize="8" textAnchor="middle">2</text>
        <text x="140" y="11" fill={textColor} fontSize="8" textAnchor="middle">3</text>
        <text x="170" y="11" fill={textColor} fontSize="8" textAnchor="middle">4m)</text>
      </g>

      {/* 3. OFFICIAL ENGINEERING TITLE BLOCK */}
      {showTitleBlock && (
        <g id="officialTitleBlock" transform="translate(20, 520)">
          <rect x="0" y="0" width="860" height="85" fill={bgColor} stroke={lineColor} strokeWidth="2" />
          <line x1="260" y1="0" x2="260" y2="85" stroke={lineColor} strokeWidth="1.5" />
          <line x1="600" y1="0" x2="600" y2="85" stroke={lineColor} strokeWidth="1.5" />
          <line x1="260" y1="42" x2="860" y2="42" stroke={lineColor} strokeWidth="1" />

          {/* Left Box: Local Authority / Organization Header */}
          <text x="12" y="22" fill={textColor} fontSize="11" fontWeight="extrabold">
            {project.header_config?.authority_name || 'Local Authority Office'}
          </text>
          <text x="12" y="40" fill={textColor} fontSize="10" fontWeight="bold">
            {project.header_config?.office_name || 'Local Authority Office'}
          </text>
          <text x="12" y="58" fill={textColor} fontSize="9">
            {project.header_config?.office_address || 'Sample Province, Sample Country'}
          </text>
          <text x="12" y="74" fill={textColor} fontSize="8" fontWeight="bold" opacity="0.8">
            LOCATION: {project.implementation_location || project.zone || '-'}
          </text>

          {/* Middle Box: Project Title & Drawing Type */}
          <text x="270" y="22" fill={textColor} fontSize="11" fontWeight="extrabold">
            PROJECT: {project.title.length > 42 ? project.title.slice(0, 42) + '...' : project.title}
          </text>
          <text x="270" y="60" fill={textColor} fontSize="10" fontWeight="extrabold">
            TITLE: {getCategoryTitle()} ({getVariantTitle()})
          </text>
          {selectedItemCode && (
            <text x="270" y="75" fill={textColor} fontSize="9" fontWeight="bold">
              BOQ BIND: Item #{selectedItemCode} - {selectedItemDesc ? selectedItemDesc.slice(0, 35) + '...' : ''}
            </text>
          )}

          {/* Right Box: Scale, Date & Approval Signatures */}
          <text x="610" y="20" fill={textColor} fontSize="10" fontWeight="bold">
            SCALE: {drawingScale} | FISCAL YEAR: {selectedFY}
          </text>
          <text x="610" y="36" fill={textColor} fontSize="9">
            DATE: {new Date().toLocaleDateString()}
          </text>
          <line x1="600" y1="62" x2="860" y2="62" stroke={lineColor} strokeWidth="0.8" strokeDasharray="2 2" />
          <text x="610" y="76" fill={textColor} fontSize="8" fontWeight="bold">
            PREPARED: SITE ENGINEER | CHECKED & APPROVED: CHIEF ENGINEER
          </text>
        </g>
      )}
    </g>
  );
};
