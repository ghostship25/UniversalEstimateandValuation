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
| PDF / image takeoff v1 | Done |
| **Takeoff v2: scale per page / all pages / range, many shapes, area as L×B / B×L / L×H, item evidence layers, PNG + CSV evidence export** | Done |
| **CAD (DXF) takeoff**: layers, block counts, pick, snap, units | Done |
| **MB rule: empty / text = skipped, typed 0 = multiplies** (1×3×6×empty = 18; 1×3×6×0 = 0), Estimate and Valuation | Done |
| **P0 #1 Tests: 71 Vitest tests in CI** | Done (more to add, see P0) |
| **P0 #2 References follow their cells** (insert / move / delete rows and items, `#REF!` + warning) | Done |
| **P0 #3 Contract Setup, IPC Certificates, Variation Orders reachable** from the Valuation ribbon | Done |
| **P0 #4 Full backup & restore, Saved / NOT SAVED, backup age, offline (no CDN)** | Done |
| **P0 #5 Invented defaults removed** (retention, advance, tax, rates, dates) | Done |
| Valuation rows leaking into the Estimate MB (inflated estimate quantities) | Fixed |
| Hardcoded "Tax: 13% Added" label in the Valuation ribbon | Fixed |
| Everything below | Planned |

---

## P0: Correctness and data safety (done in this release)

### 1. Automated tests for the money-critical code: done, keep growing
71 Vitest tests in 7 files run on every push (`npm test`, also in the GitHub workflow): the quantity rule and cell reading, takeoff geometry and MB row building, DXF parsing, backup format and validation, reference remapping, the formula evaluator and the IPC payment maths. The IPC maths was moved out of the screen into `ipcMath.ts` so it can be tested.
Still to cover: the rate engine (resource rates, overhead, tax), the dependency engine end to end, and one "golden project" test (a fixed sample project in, expected BOQ and IPC totals out).

### 2. References follow their cells: done
Formulas name cells by position (`I2.R3.L`, `L1`, `SUM(L1:L3)`). Whenever rows or items are inserted, moved or deleted (Estimate MB, Valuation MB, item order), every formula in the project is rewritten so it still points at the same cell, as a spreadsheet does (`src/services/refRemap.ts`). A reference to something that was deleted becomes `#REF!`, is shown as `#REF!` in the cell and raises a warning. References by item code (`ITEM("1.1")`) never change.
Limits: no undo yet; pasting or duplicating a formula row does not adjust references (there is no fill-down yet); valuation rows are grouped by (valuation MB, item).

### 3. Valuation screens reachable: done
Contract Setup, IPC Certificates and Variation Orders are now in the Valuation ribbon (the ribbon's retention, advance, discount and tax now show the real contract / project values instead of fixed text). Variation Orders is still a register: approved variations do not yet change the contract value or valuation quantities (see P1 #10).

### 4. Backup, recovery and offline: done
- **Backup → Full Backup & Restore** saves projects, rate tables and zones, MB and valuation rows, contract, bills, variations, settings and takeoff drawings in one file (the lock password is never written). Restore validates the file, downloads a safety copy of the current data first, then replaces everything.
- The header shows *Saved hh:mm* or a red **NOT SAVED** when the browser refuses to store (full disk), plus a backup-age chip that turns amber after 7 days.
- Offline: the database engine (sql.js WebAssembly) is bundled instead of loaded from a public CDN, and the service worker no longer imports a script from the internet. Verified on a production build with the network off.
Still open: scheduled automatic backups to a chosen folder (File System Access API), optional encryption of the backup file, backup of several browsers / users into one.

### 5. Invented numbers removed: done
Removed or replaced by values from the contract / project: contract defaults (retention 5, discount 8.5 and 12, advance 500,000), the fixed 5% retention and 10% advance recovery in the IPC (advance recovery is now a contract field and is tracked across bills), the "cumulative" that multiplied this bill by the bill number, fixed bill dates, fallback rates (145, 550, 1,200, 5,000, 8,500, 1,000), the hardcoded 13% tax in rate analysis and the sample project (the default now follows the project's tax rate; sample data uses an illustrative 10%), and the static ribbon labels.
Decision to confirm with your accountant: the IPC computes tax on the amount after retention and advance (the existing behaviour, now in one tested place); some regimes tax the gross.

### Bugs found and fixed while doing P0
- The formula evaluator treated a formula cell at the same row number in another item as a circular reference and returned 0.
- Copying an estimate row into the valuation turned a typed 0 into 1.
- A blank cell was saved as 0, so empty and zero could not be told apart.
- Adding a valuation row also added a row to the estimate (fixed earlier).

---

## P1: High-value features

### 6. Takeoff phase 2: DXF drawings (done; refinements below)
Parse DXF in the browser (`dxf-parser`), render it, and measure by clicking entities or by layer: exact lengths, areas and block counts with no scale calibration.
- Read `$INSUNITS`, LINE / LWPOLYLINE / CIRCLE / ARC / INSERT (block counts) / HATCH.
- Layer table with totals, one-click "send layer to item".
- DWG cannot be read reliably in the browser; document the conversion route (free ODA File Converter → DXF).

### 7. Takeoff next steps (S to M)
Already done: shapes, per-page / all-pages / range scale, evidence layers, PNG and CSV export. Remaining:
- Snap to vector PDF line ends and corners (extract paths with pdf.js).
- Different scales on one sheet (viewport scales), and a scale-verification tool.
- Multi-page evidence pack (PDF) with one page per item layer.
- DXF: hatch areas, xref/blocks measured by layer inside blocks, dimension entities, DWG via a conversion service.
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
Approved variation orders flowing into the contract value and valuation quantities; Price adjustment / escalation formulas, advance-payment recovery schedules, retention release, materials on site, variation-order approval workflow, IPC history and cumulative reports.

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

## Takeoff measurement types: research and what is implemented

Measurement kinds offered by professional takeoff tools (Bluebeam Revu, PlanSwift, On-Screen Takeoff, STACK, ProEst), compared with this app:

| Kind | Typical use | In this app |
|---|---|---|
| Linear: straight, polyline | walls, pipes, cables, kerbs | Done (line, polyline) |
| Arc / curved linear | curved walls, kerbs, pipes | Done (3-point arc, freehand curve) |
| Area: rectangle, polygon | floors, slabs, roofs | Done (rectangle, rotated rectangle, polygon) |
| Area: circle, ellipse, freehand | tanks, pits, irregular ground | Done |
| Count | doors, fixtures, columns, piles | Done (plus CAD block counts) |
| Perimeter of an area | skirting, formwork edges, fencing | Done (send as Perimeter) |
| Dimensions of an area (L × B) | slabs, footings, rooms | Done (L × B, B × L) |
| Wall area (length × height) | plaster, paint, cladding | Done (length with Height factor, or area sent as L × H) |
| Volume (area × depth / thickness) | concrete, excavation, fill | Done (Height / depth factor) |
| Cutout / deduction | openings, voids | Done (Deduct) |
| Slope / pitch factor | roofs, ramps, sloped ground | Done (rise:1 or degrees) |
| Waste / allowance % | materials | Done |
| Angle | checking geometry, roof pitch | Done (evidence only, not sent) |
| Layers / grouping per item | traceable evidence, revisions | Done (item layers; PNG + CSV export) |
| Segmented linear (label each segment) | runs with different sizes | Planned |
| Elevation / level (Z) based quantities | cut and fill, multi-storey | Planned |
| Count by symbol (image recognition) | repeated symbols | Planned, AI-assisted with review |
| Material conversion (kg/m, bags/m³) | rebar, cement, paint coverage | Planned |
| Takeoff templates (preset item + shape + factors) | repeat work | Planned |
| Revision compare (overlay two sheet versions) | addenda | Planned |

Area can be written to the MB as one value, or as dimensions so the MB shows the evidence: rectangle sides as Length × Breadth or Breadth × Length, or as Length × Height for an elevation. Slope and waste are carried in the MB "No." column so the row stays a plain N × L × B × H product.

---

## Takeoff: what it does and its limits (v2)

**Does:** open a PDF, DXF (ASCII) or PNG/JPG; set the scale per page, for all pages or a page range; measure the shapes above; assign each measurement to a BOQ item (an evidence layer); preview the MB row and get a unit check (e.g. an area sent to a Cu.m. item); send to the Estimate or Valuation MB; push re-measured values to the rows already created; export a PNG and a CSV; keep everything per project in the browser (IndexedDB, nothing uploaded).

**Limits:** accuracy depends on the scale and on click precision (zoom in); scanned drawings can be skewed; no vertex editing, snapping to PDF lines or revision compare yet; CAD totals cover model-space entities (geometry inside blocks is counted only as block references); HATCH entities and DWG files are not read; splines are approximated.