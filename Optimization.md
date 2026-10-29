# Optimization & Roadmap

Prioritized improvements for **Universal Estimating & Valuation (UEV)**. Priority reflects risk to correctness first (money and quantities), then user value, then polish.

Legend: **P0** do first (correctness / data safety) · **P1** high value · **P2** valuable · **P3** nice to have.
Effort: S ≈ 1 to 2 days · M ≈ 3 to 7 days · L ≈ 2 to 4 weeks (one developer, rough).

---

## Status

| Item | Status |
|---|---|
| Universal (non-regional) conversion: currency, tax, zones, English only | Done |
| Excel-style cell linking in Estimate MB and Valuation MB (`=` then click) | Done |
| **PDF / image takeoff v1** (this release) | Done |
| Valuation rows leaking into the Estimate MB (inflated estimate quantities) | Fixed |
| Hardcoded "Tax: 13% Added" label in the Valuation ribbon | Fixed |
| Everything below | Planned |

---

## P0: Correctness and data safety

### 1. Automated tests for the money-critical code (M)
There are no automated tests. The formula evaluator, rate engine, tax / retention / advance calculations (IPC) and the MB dependency engine decide quantities and payments.
- Add Vitest; start with `mbFormulaEvaluator`, `mbDependencyEngine`, `rateEngine`, IPC math and the takeoff geometry (`takeoffStore`).
- Add a few golden-file tests (a sample project in, expected totals out).
- Run them in the existing GitHub Actions workflow (`npm test`) so a push cannot deploy a broken calculation.

### 2. Stable references instead of positions (M)
Cell links use item and row **positions** (`I2.R3.L`, `L1`). Reordering items or inserting rows silently re-points a formula.
- Store links by internal IDs and render them as `I2.R3` for display; rewrite on reorder, as Excel does.
- Warn before deleting a row or item that other cells depend on.

### 3. Wire up or retire the unreachable valuation screens (S)
`VariationOrderView`, `ContractSetupView` and `IPCBillView` exist but have no navigation path. Either add them to the Valuation ribbon and test them, or remove them. Variation orders and a contract setup are core to valuation.

### 4. Backup, export and recovery (S to M)
Data lives in the browser. Add one-click full-project export/import (single `.uep` file including takeoff drawings), an automatic periodic backup reminder, and a visible "last saved" indicator.

### 5. Remaining invented defaults (S)
Audit for other fallback numbers that can appear on a bill when data is missing (the IPC view had several; those were removed). Prefer showing an empty value or a warning over a made-up number. Also replace the static labels in the Valuation ribbon ("Retention: 5.0%", "Mob. Recovery: Auto", "Security Dep: Held") with the values from the actual contract setup.

---

## P1: High-value features

### 6. Takeoff phase 2: DXF drawings (M to L)
Parse DXF in the browser (`dxf-parser`), render it, and measure by clicking entities or by layer: exact lengths, areas and block counts with no scale calibration.
- Read `$INSUNITS`, LINE / LWPOLYLINE / CIRCLE / ARC / INSERT (block counts) / HATCH.
- Layer table with totals, one-click "send layer to item".
- DWG cannot be read reliably in the browser; document the conversion route (free ODA File Converter → DXF).

### 7. Takeoff phase 1.1: polish PDF takeoff (S to M)
- Snap to vector PDF line ends and corners (extract paths with pdf.js).
- Per-page multi-scale sheets (different scale per viewport).
- Edit points after drawing (drag vertices), copy a measurement to another page.
- Revision compare: overlay two versions of a sheet and flag changed areas.
- For the Valuation MB: colour measurements per bill and show cumulative progress.
- Export a marked-up PDF with the measurement labels.

### 8. Excel-like grid behaviour in the MB (M)
Arrow-key / Tab / Enter navigation, copy-paste of cell ranges, fill-down, multi-cell select, undo/redo for cell edits.

### 9. Regional flexibility (M to L)
- Several tax types per project (VAT/GST/sales tax, withholding), per-item tax status.
- Imperial / metric rate libraries and unit conversion.
- Standard Method of Measurement templates (e.g. NRM2, CESMM4, ASMM, CSI MasterFormat) as importable item-code sets.
- Currency conversion table for multi-currency projects.

### 10. Contract and valuation depth (M to L)
Price adjustment / escalation formulas, advance-payment recovery schedules, retention release, materials on site, variation-order approval workflow, IPC history and cumulative reports.

---

## P2: Performance and maintainability

### 11. Smaller, faster app (M)
- The main script is about 3 MB (about 740 KB compressed). Lazy-load each screen with `React.lazy`, and split heavy libraries (`xlsx`, `recharts`, `three`, `sql.js`) into their own chunks. The PDF library is already lazy-loaded.
- Virtualize long MB tables so projects with thousands of rows stay responsive.
- Memoize row components; avoid recalculating every item on each keystroke.

### 12. Break up the largest files (L)
`ValuationMBView` (~4,900 lines), `MeasurementBookView` (~3,900), `AppShell` (~2,900). Extract row components, ribbon groups and modals; share the common MB grid between the Estimate and Valuation views to remove duplicated logic.

### 13. Type safety and lint (S)
Enable ESLint and stricter TypeScript settings; remove `any` in the calculation code first.

### 14. Server hardening (S)
Rate-limit and authenticate the optional AI endpoints, validate request bodies, and never log prompts that may contain project data. (The `/api/docs` path traversal is already fixed.)

---

## P3: Nice to have

- Accessibility pass (keyboard focus, screen-reader labels, contrast).
- Optional UI translations framework (strings externalized) for teams who want another language.
- Multi-user sync / collaboration (CRDT or server-backed) for office teams.
- AI-assisted takeoff: suggest symbol counts and room areas for the user to confirm (never auto-accepted).
- Report designer: user-editable print templates and direct PDF export without the browser print dialog.
- Desktop installers via `electron-builder` in CI (replace `scripts/build-desktop-dist.py`, which generates a placeholder installer).

---

## Suggested order

1. Tests (#1) and stable references (#2), because everything later builds on correct calculations.
2. Wire up valuation screens (#3) and backups (#4).
3. DXF takeoff (#6) and takeoff polish (#7).
4. Bundle splitting and table virtualization (#11), then the file refactor (#12).
5. Regional, contract and grid features (#8 to #10) according to your users' needs.

---

## PDF takeoff v1: what it does and its limits

**Does:** open a PDF or PNG/JPG drawing; calibrate the scale from a known distance (or a 1:n drawing scale for vector PDFs); measure lengths (polyline), areas (polygon) and counts; mark deductions; assign each measurement to a BOQ item; send it to the **Estimate MB** or **Valuation MB** as a row (N × L × B × H, with optional breadth and thickness); push re-measured or recalibrated values to the rows it created ("Update linked rows"); keep drawings and measurements per project in the browser (IndexedDB, nothing uploaded).

**Limits:** accuracy depends on the calibration and on clicking precision (zoom in for precision); scanned drawings can be skewed or scaled unevenly; each page needs its own calibration; no vertex editing, snapping or revision compare yet (see #7); DWG is not supported (see #6).
