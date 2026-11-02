// Evidence export: a PNG of the drawing with the visible item layers burnt in (plus a legend), and a CSV table.

export interface LegendLine { color: string; text: string }

function download(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export async function exportEvidencePng(opts: {
  baseCanvas: HTMLCanvasElement;
  /** optional: re-render the drawing at export resolution (k times the on-screen size) for a crisp image */
  renderBase?: (k: number) => Promise<HTMLCanvasElement | null>;
  svg: SVGSVGElement;
  title: string;
  legend: LegendLine[];
  filename: string;
}): Promise<void> {
  const { baseCanvas, renderBase, svg, title, legend, filename } = opts;
  const cssW = Math.round(parseFloat(svg.getAttribute('width') || '') || svg.getBoundingClientRect().width);
  const cssH = Math.round(parseFloat(svg.getAttribute('height') || '') || svg.getBoundingClientRect().height);
  const k = Math.min(2, 3600 / Math.max(cssW, 1));
  const W = Math.round(cssW * k), H = Math.round(cssH * k);
  const lineH = 22, pad = 14;
  const legendH = pad * 2 + 24 + legend.length * lineH;

  const out = document.createElement('canvas');
  out.width = W; out.height = H + legendH;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, out.width, out.height);
  let base: HTMLCanvasElement = baseCanvas;
  if (renderBase) { try { base = (await renderBase(k)) || baseCanvas; } catch { base = baseCanvas; } }
  ctx.drawImage(base, 0, 0, W, H);

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('font-family', 'Helvetica, Arial, sans-serif');
  clone.setAttribute('width', String(cssW)); clone.setAttribute('height', String(cssH));
  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  await new Promise<void>((res) => {
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0, W, H); URL.revokeObjectURL(url); res(); };
    img.onerror = () => { URL.revokeObjectURL(url); res(); };
    img.src = url;
  });

  // legend
  ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, H, out.width, legendH);
  ctx.strokeStyle = '#cbd5e1'; ctx.beginPath(); ctx.moveTo(0, H + 0.5); ctx.lineTo(out.width, H + 0.5); ctx.stroke();
  ctx.fillStyle = '#0f172a'; ctx.font = 'bold 15px sans-serif';
  ctx.fillText(title, pad, H + pad + 14);
  ctx.font = '13px sans-serif';
  legend.forEach((l, i) => {
    const y = H + pad + 24 + (i + 1) * lineH - 6;
    ctx.fillStyle = l.color; ctx.fillRect(pad, y - 11, 14, 14);
    ctx.fillStyle = '#1e293b'; ctx.fillText(l.text, pad + 24, y);
  });
  ctx.fillStyle = '#64748b'; ctx.font = '11px sans-serif';
  ctx.fillText(`Generated ${new Date().toLocaleString()} · Universal Estimating & Valuation`, pad, out.height - 6);

  await new Promise<void>((res) => out.toBlob((b) => { if (b) download(b, filename); res(); }, 'image/png'));
}

export function exportCsv(rows: (string | number)[][], filename: string) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  download(new Blob(['\ufeff' + rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }), filename);
}
