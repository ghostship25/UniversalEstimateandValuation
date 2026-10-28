export interface PrintExportOptions {
  title: string;
  projectTitle: string;
  zone: string;
  fiscalYear: string;
  subtitle?: string;
  tableHtml: string;
  filename: string;
  customHeaderHtml?: string;
  orientation?: 'portrait' | 'landscape';
}

export function downloadPrintableHTML(options: PrintExportOptions) {
  const pageOrientation = options.orientation || 'landscape';
  const headerSection = options.customHeaderHtml !== undefined ? options.customHeaderHtml : `
    <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px;">
      <h1 style="font-size: 16pt; font-weight: bold; margin: 0 0 4px 0; color: #000;">${options.title}</h1>
      <h2 style="font-size: 13pt; font-weight: bold; margin: 0 0 4px 0; color: #000;">${options.projectTitle || 'Infrastructure Project'}</h2>
      <p style="font-size: 10pt; margin: 0; color: #333;">Zone: ${options.zone} | Fiscal year: ${options.fiscalYear} ${options.subtitle ? '| ' + options.subtitle : ''}</p>
    </div>
  `;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${options.title} - ${options.projectTitle}</title>
  <style>
    @page { size: A4 ${pageOrientation}; margin: 10mm; }
    body { font-family: 'Kalimati', 'Nirmala UI', 'Segoe UI', Tahoma, sans-serif; color: #000; margin: 0; padding: 10px; background: #fff; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: ${pageOrientation === 'portrait' ? '8.5pt' : '9.5pt'}; table-layout: auto; }
    th, td { border: 1px solid #000 !important; padding: ${pageOrientation === 'portrait' ? '4px 6px' : '5px 7px'}; text-align: left; vertical-align: top; word-wrap: break-word; overflow-wrap: break-word; }
    th { background-color: #f1f5f9 !important; color: #000 !important; font-weight: bold; text-align: center; vertical-align: middle; }
    tr { page-break-inside: avoid; }
    
    /* Smart Text Volume Column Sizing & Dynamic Text Wrapping Rules */
    .col-sn, td.sn, th.sn, th:first-child, td:first-child { width: 35px !important; min-width: 28px; text-align: center; white-space: normal !important; }
    .col-code, td.code, th.code, td.col-code, th.col-code { width: 80px !important; min-width: 50px; text-align: center; white-space: normal !important; font-weight: bold; word-break: break-all !important; }
    .col-unit, td.unit, th.unit { width: 50px !important; min-width: 38px; text-align: center; white-space: normal !important; }
    .col-cat, td.cat, th.cat { width: 90px !important; min-width: 55px; white-space: normal !important; }
    .col-qty, td.qty, th.qty { width: 85px !important; min-width: 60px; text-align: right; white-space: normal !important; }
    .col-rate, td.rate, th.rate { width: 95px !important; min-width: 70px; text-align: right; white-space: normal !important; }
    .col-amount, td.amount, th.amount { width: 110px !important; min-width: 80px; text-align: right; white-space: normal !important; font-weight: bold; }
    
    /* Description & Particulars Columns Take Primary Space According to Text Volume */
    .col-desc, td.description, th.description, td.particulars, th.particulars {
      width: auto !important;
      min-width: 150px !important;
      word-wrap: break-word !important;
      word-break: break-word !important;
      overflow-wrap: break-word !important;
      white-space: normal !important;
      line-height: 1.35;
    }

    /* Sub-MB / Sub-Book Headers in Combined Print Tables */
    .sub-book-header, th.sub-book-header, td.sub-book-header, .sub-book-col {
      word-wrap: break-word !important;
      word-break: break-word !important;
      overflow-wrap: break-word !important;
      white-space: normal !important;
      text-align: right;
      min-width: 60px;
    }

    ${pageOrientation === 'portrait' ? `
      /* Additional Portrait PDF Fit Enhancements */
      body { padding: 4px; }
      table { font-size: 8.5pt !important; }
      th, td { padding: 3px 5px !important; }
    ` : ''}
    .print-toolbar { position: fixed; top: 10px; right: 10px; background: #0f172a; color: #fff; padding: 8px 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-family: sans-serif; font-size: 12px; display: flex; gap: 10px; align-items: center; z-index: 9999; }
    .print-btn { background: #2563eb; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; }
    .print-btn:hover { background: #1d4ed8; }
    @media print {
      body { padding: 0; }
      .print-toolbar { display: none !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      tfoot { display: table-row-group !important; }
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <span><b>${options.title}</b> — Ready to Print</span>
    <button class="print-btn" onclick="window.print()">🖨️ Print Now</button>
  </div>
  ${headerSection}
  <div class="content">
    ${options.tableHtml}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        try {
          window.print();
        } catch(e) {
          console.error('Print window error:', e);
        }
      }, 400);
    };
  </script>
</body>
</html>`;

  // Strategy 1: Open popup window directly for print preview
  try {
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      return;
    }
  } catch (e) {
    console.warn('Popup blocked, falling back to blob print download...', e);
  }

  // Strategy 2: Download standalone HTML document ready for printing
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${options.filename}.html`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
