import React from 'react';

interface DimensionLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  value: number | string;
  unit?: string;
  offset?: number; // Distance away from measured points
  orientation?: 'horizontal' | 'vertical' | 'sloped';
  lineColor?: string;
  textColor?: string;
  dimColor?: string;
  bgFill?: string;
  fontSize?: number;
  onEditValue?: (newValue: number) => void;
  paramKey?: string;
  paramName?: string;
}

export const DimensionLine: React.FC<DimensionLineProps> = ({
  x1,
  y1,
  x2,
  y2,
  label,
  value,
  unit = 'm',
  offset = 20,
  orientation = 'horizontal',
  lineColor,
  textColor,
  dimColor,
  bgFill,
  fontSize: customFontSize,
  onEditValue,
  paramName
}) => {
  const stroke = lineColor || dimColor || '#2563eb';
  const textClr = textColor || dimColor || '#2563eb';

  // Calculate extension lines and offset line positions
  let dimX1 = x1;
  let dimY1 = y1;
  let dimX2 = x2;
  let dimY2 = y2;

  let ext1_startX = x1, ext1_startY = y1, ext1_endX = x1, ext1_endY = y1;
  let ext2_startX = x2, ext2_startY = y2, ext2_endX = x2, ext2_endY = y2;
  let textX = (x1 + x2) / 2;
  let textY = (y1 + y2) / 2;

  if (orientation === 'horizontal') {
    dimY1 = y1 + offset;
    dimY2 = y2 + offset;
    ext1_endY = dimY1 + Math.sign(offset) * 6;
    ext2_endY = dimY2 + Math.sign(offset) * 6;
    textX = (x1 + x2) / 2;
    textY = dimY1 - 6;
  } else if (orientation === 'vertical') {
    dimX1 = x1 + offset;
    dimX2 = x2 + offset;
    ext1_endX = dimX1 + Math.sign(offset) * 6;
    ext2_endX = dimX2 + Math.sign(offset) * 6;
    textX = dimX1 + (offset > 0 ? 8 : -8);
    textY = (y1 + y2) / 2;
  }

  const numVal = typeof value === 'number' ? value : parseFloat(value);
  const formattedVal = !isNaN(numVal) ? numVal.toFixed(2) : String(value);
  const displayText = `${label ? `${label} = ` : ''}${formattedVal} ${unit}`;

  // Auto calculate line span length & dynamic font size for small/tight spans
  const lineSpan = Math.hypot(dimX2 - dimX1, dimY2 - dimY1);
  const dynamicFontSize = customFontSize || (lineSpan > 0 && lineSpan < 80 ? Math.max(9.5, Math.min(11, lineSpan / 7)) : 10.5);

  // Background pill dimensions for clean contrast without heavy border outlines
  const textWidth = displayText.length * (dynamicFontSize * 0.58) + 10;
  const textHeight = dynamicFontSize + 6;

  // Center alignment for clean text rendering
  let textAnchor: 'start' | 'middle' | 'end' = 'middle';
  let pillX = textX - textWidth / 2;

  if (orientation === 'vertical') {
    if (offset > 0) {
      textAnchor = 'start';
      pillX = textX - 2;
    } else {
      textAnchor = 'end';
      pillX = textX - textWidth + 2;
    }
  }

  const pillY = textY - textHeight / 2;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onEditValue) return;
    const input = window.prompt(
      `Edit ${paramName || label || 'dimension'} value (${unit}):`,
      !isNaN(numVal) ? numVal.toString() : String(value)
    );
    if (input !== null) {
      const parsed = parseFloat(input);
      if (!isNaN(parsed) && parsed > 0) {
        onEditValue(parsed);
      } else {
        alert('Please enter a valid positive number.');
      }
    }
  };

  return (
    <g
      className="group cursor-pointer transition-opacity hover:opacity-90"
      onClick={handleClick}
    >
      <title>Click to edit dimension value directly</title>
      {/* Extension Line 1 */}
      <line
        x1={ext1_startX}
        y1={ext1_startY}
        x2={ext1_endX}
        y2={ext1_endY}
        stroke={stroke}
        strokeWidth="1"
        strokeDasharray="2 2"
        opacity="0.6"
      />

      {/* Extension Line 2 */}
      <line
        x1={ext2_startX}
        y1={ext2_startY}
        x2={ext2_endX}
        y2={ext2_endY}
        stroke={stroke}
        strokeWidth="1"
        strokeDasharray="2 2"
        opacity="0.6"
      />

      {/* Main Dimension Line with Arrows */}
      <line
        x1={dimX1}
        y1={dimY1}
        x2={dimX2}
        y2={dimY2}
        stroke={stroke}
        strokeWidth="1.2"
        markerStart="url(#arrowStart)"
        markerEnd="url(#arrowEnd)"
      />

      {/* Background Pill for crisp readability without cluttering border boxes */}
      <rect
        x={pillX}
        y={pillY}
        width={textWidth}
        height={textHeight}
        rx="4"
        fill={bgFill || (stroke.includes('#38bdf8') || stroke.includes('#bfdbfe') ? '#0f172a' : '#ffffff')}
        fillOpacity="0.95"
        stroke="none"
      />

      {/* Text Label */}
      <text
        x={textX}
        y={textY + 1}
        fill={textClr}
        fontSize={dynamicFontSize}
        fontWeight="600"
        textAnchor={textAnchor}
        alignmentBaseline="middle"
        className="select-none font-mono group-hover:fill-amber-400"
      >
        {displayText}
      </text>
    </g>
  );
};
