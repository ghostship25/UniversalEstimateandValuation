import { DrawingTemplateDef } from '../../types';

/**
 * Generates standard ASCII DXF (AutoCAD Drawing Interchange Format R12 / 2000)
 * from parametric civil template cross-sections.
 */
export function generateCADSectionDXF(
  template: DrawingTemplateDef,
  params: Record<string, number>
): string {
  const p = { ...template.dimension_params, ...params };
  const lines: string[] = [];

  const add = (...args: string[]) => lines.push(...args);

  // DXF Header
  add('0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '0', 'ENDSEC');

  // DXF Tables (Layers)
  add(
    '0',
    'SECTION',
    '2',
    'TABLES',
    '0',
    'TABLE',
    '2',
    'LAYER',
    '70',
    '4',
    // Layer 0: Default
    '0',
    'LAYER',
    '2',
    '0',
    '70',
    '0',
    '62',
    '7',
    '6',
    'CONTINUOUS',
    // Layer: CONCRETE
    '0',
    'LAYER',
    '2',
    'CONCRETE',
    '70',
    '0',
    '62',
    '4', // Cyan
    '6',
    'CONTINUOUS',
    // Layer: MASONRY
    '0',
    'LAYER',
    '2',
    'MASONRY',
    '70',
    '0',
    '62',
    '30', // Orange/Brown
    '6',
    'CONTINUOUS',
    // Layer: REBAR
    '0',
    'LAYER',
    '2',
    'REBAR',
    '70',
    '0',
    '62',
    '1', // Red
    '6',
    'CONTINUOUS',
    // Layer: DIMS
    '0',
    'LAYER',
    '2',
    'DIMS',
    '70',
    '0',
    '62',
    '3', // Green
    '6',
    'CONTINUOUS',
    '0',
    'ENDTAB',
    '0',
    'ENDSEC'
  );

  // DXF Entities
  add('0', 'SECTION', '2', 'ENTITIES');

  // Helper to add line entity
  const addLine = (x1: number, y1: number, x2: number, y2: number, layer: string = '0') => {
    add(
      '0',
      'LINE',
      '8',
      layer,
      '10',
      x1.toFixed(4),
      '20',
      y1.toFixed(4),
      '30',
      '0.0',
      '11',
      x2.toFixed(4),
      '21',
      y2.toFixed(4),
      '31',
      '0.0'
    );
  };

  // Helper to add text entity
  const addText = (
    text: string,
    x: number,
    y: number,
    height: number = 0.15,
    layer: string = 'DIMS'
  ) => {
    add(
      '0',
      'TEXT',
      '8',
      layer,
      '10',
      x.toFixed(4),
      '20',
      y.toFixed(4),
      '30',
      '0.0',
      '40',
      height.toFixed(4),
      '1',
      text
    );
  };

  // Build Geometry according to svg_type
  if (template.svg_type === 'trapezoidal_drain') {
    const b = p.bed_width || 0.60;
    const d = p.drain_depth || 0.60;
    const tw = p.wall_thickness || 0.35;
    const tb = p.bed_pcc_thickness || 0.15;
    const z = p.side_slope_z || 0.5;

    // Foundation bed PCC
    const botW = b + 2 * tw;
    addLine(-botW / 2, 0, botW / 2, 0, 'CONCRETE');
    addLine(botW / 2, 0, botW / 2, tb, 'CONCRETE');
    addLine(botW / 2, tb, -botW / 2, tb, 'CONCRETE');
    addLine(-botW / 2, tb, -botW / 2, 0, 'CONCRETE');

    // Bed clear line
    addLine(-b / 2, tb, b / 2, tb, 'MASONRY');

    // Left wall
    const topXLeft = -(b / 2 + z * d);
    addLine(-b / 2, tb, topXLeft, tb + d, 'MASONRY');
    addLine(topXLeft, tb + d, topXLeft - tw, tb + d, 'MASONRY');
    addLine(topXLeft - tw, tb + d, -botW / 2, tb, 'MASONRY');

    // Right wall
    const topXRight = b / 2 + z * d;
    addLine(b / 2, tb, topXRight, tb + d, 'MASONRY');
    addLine(topXRight, tb + d, topXRight + tw, tb + d, 'MASONRY');
    addLine(topXRight + tw, tb + d, botW / 2, tb, 'MASONRY');

    // Dimension labels
    addText(`Bed Width b = ${b.toFixed(2)}m`, 0, tb - 0.20, 0.12);
    addText(`Depth d = ${d.toFixed(2)}m`, topXRight + tw + 0.1, tb + d / 2, 0.12);
    addText(`Side Slope 1:${z}`, topXRight / 2, tb + d / 2 + 0.1, 0.10);
  } else if (template.svg_type === 'rcc_box_drain') {
    const W = p.clear_width || 0.75;
    const H = p.clear_depth || 0.80;
    const tw = p.wall_thickness || 0.15;
    const tb = p.base_slab_thickness || 0.15;
    const tcov = p.cover_slab_thickness || 0.10;

    const totalW = W + 2 * tw;

    // Bottom Base Slab
    addLine(-totalW / 2, 0, totalW / 2, 0, 'CONCRETE');
    addLine(totalW / 2, 0, totalW / 2, tb, 'CONCRETE');
    addLine(-totalW / 2, 0, -totalW / 2, tb, 'CONCRETE');

    // Inside waterway
    addLine(-W / 2, tb, W / 2, tb, 'CONCRETE');
    addLine(-W / 2, tb, -W / 2, tb + H, 'CONCRETE');
    addLine(W / 2, tb, W / 2, tb + H, 'CONCRETE');

    // Outer wall faces
    addLine(-totalW / 2, tb, -totalW / 2, tb + H, 'CONCRETE');
    addLine(totalW / 2, tb, totalW / 2, tb + H, 'CONCRETE');

    // Top wall edges
    addLine(-totalW / 2, tb + H, -W / 2, tb + H, 'CONCRETE');
    addLine(W / 2, tb + H, totalW / 2, tb + H, 'CONCRETE');

    // Cover Slab
    addLine(-totalW / 2 - 0.05, tb + H + 0.02, totalW / 2 + 0.05, tb + H + 0.02, 'CONCRETE');
    addLine(totalW / 2 + 0.05, tb + H + 0.02, totalW / 2 + 0.05, tb + H + 0.02 + tcov, 'CONCRETE');
    addLine(totalW / 2 + 0.05, tb + H + 0.02 + tcov, -totalW / 2 - 0.05, tb + H + 0.02 + tcov, 'CONCRETE');
    addLine(-totalW / 2 - 0.05, tb + H + 0.02 + tcov, -totalW / 2 - 0.05, tb + H + 0.02, 'CONCRETE');

    addText(`Clear Width W = ${W.toFixed(2)}m`, 0, tb / 2, 0.12);
    addText(`Clear Depth H = ${H.toFixed(2)}m`, 0, tb + H / 2, 0.12);
  } else if (template.svg_type === 'box_culvert') {
    const S = p.clear_span || 2.50;
    const H = p.clear_height || 2.00;
    const tw = p.wall_thickness || 0.30;
    const tb = p.bottom_slab_thickness || 0.30;
    const ttop = p.top_slab_thickness || 0.30;

    const outerW = S + 2 * tw;
    const outerH = H + tb + ttop;

    // Outer box boundary
    addLine(-outerW / 2, 0, outerW / 2, 0, 'CONCRETE');
    addLine(outerW / 2, 0, outerW / 2, outerH, 'CONCRETE');
    addLine(outerW / 2, outerH, -outerW / 2, outerH, 'CONCRETE');
    addLine(-outerW / 2, outerH, -outerW / 2, 0, 'CONCRETE');

    // Inner clear vent
    addLine(-S / 2, tb, S / 2, tb, 'CONCRETE');
    addLine(S / 2, tb, S / 2, tb + H, 'CONCRETE');
    addLine(S / 2, tb + H, -S / 2, tb + H, 'CONCRETE');
    addLine(-S / 2, tb + H, -S / 2, tb, 'CONCRETE');

    addText(`Clear Span S = ${S.toFixed(2)}m`, 0, tb + H / 2, 0.20);
    addText(`Clear Height H = ${H.toFixed(2)}m`, 0, tb + H / 2 - 0.30, 0.20);
  }

  // End of Entities and File
  add('0', 'ENDSEC', '0', 'EOF');

  return lines.join('\n');
}
