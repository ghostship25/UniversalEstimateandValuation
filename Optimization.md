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
| **P1 #8 Excel-like MB grid:** real undo/redo (the old buttons were fake), Enter/Tab/arrow navigation, range selection, copy / cut / paste (also with Excel), clear, fill down | Done |
| **P1 #10 Contract and valuation depth (part):** revised contract sum from approved variations, extra items added to the BOQ, price adjustment, retention release, unlimited IPCs, cumulative certificates register + CSV | Done (rest below) |
| **Takeoff rows:** one MB row per item description built from a count, lengths, an area and typed values, column by column, kept in sync with the MB, also from DXF and in the Valuation MB | Done |
| P1 #7 remaining takeoff items, P1 #9 Regional flexibility | Planned |
| **UX & onboarding from a first-time user review (U1 to U8 below):** Start-here guide, next-step indicator, sample project with reset, settings summary, glossary, backup reminder, phone layout | Planned |
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

### 6. Takeoff phase 2: DXF drawings: done (refinements in #7)

### 7. Takeoff next steps (S to M): partly done
Already done: shapes, per-page / all-pages / range scale, evidence layers, PNG and CSV export, DXF takeoff, **takeoff rows** (one MB row filled column by column from several measurements). Remaining:
- Edit points after drawing (drag vertices), copy a measurement to another page.
- Snap to vector PDF line ends and corners (extract paths with pdf.js).
- Different scales on one sheet (viewport scales) and a scale-verification tool.
- Multi-page evidence pack (PDF) with one page per item layer.
- Revision compare: overlay two versions of a sheet and flag changed areas.
- DXF: hatch areas, geometry inside blocks by layer, dimension entities, DWG through a conversion service.
- Valuation MB: colour measurements per bill and show cumulative progress.
- Takeoff measurements are not part of undo / redo yet (they live in IndexedDB, not in the project state).

### 8. Excel-like grid behaviour in the MB: done
Both MBs (Estimate and Valuation):
- **Undo / redo** for the whole document (projects, rates, MB and valuation rows, contract, bills, variations): the header buttons, Ctrl+Z and Ctrl+Y (inside a cell with nothing typed, Ctrl+Z also undoes the document). An edit and the recalculation it triggers are one step. The old Undo / Redo buttons only showed a message and did nothing.
- **Keyboard:** Enter moves down (Shift+Enter up), Tab / Shift+Tab move sideways and wrap to the next row, arrow keys move between cells (left / right only at the ends of the text), all skipping heading rows and continuing into the next item.
- **Ranges:** Shift+arrows or Shift+click select a block within one item; Ctrl+C / Ctrl+X copy and cut it as tab-separated text; Ctrl+V pastes a block copied from the app (formulas move with their row) or from Excel; pasting one value over a range fills it; Delete clears; Ctrl+D fills down (formulas shift row by row).
Still open: fill-right and the fill handle (drag), pasting formulas written in Excel syntax, selecting across several items.

### 9. Regional flexibility (M to L): planned
- Several tax types per project (VAT / GST / sales tax, withholding), per-item tax status.
- Imperial and metric rate libraries and unit conversion.
- Standard Method of Measurement templates (NRM2, CESMM4, ASMM, CSI MasterFormat) as importable item-code sets.
- Currency conversion table for multi-currency projects.

### 10. Contract and valuation depth (M to L): partly done
Done:
- **Variation orders:** a summary shows the awarded sum, approved variations and the **revised contract sum**; an approved extra item can be added to the BOQ with one click so it can be measured and valued; the form no longer pre-fills invented values, numbers are VO-001 style, and the approval date is set when you approve.
- **Interim payment certificates:** any number of certificates (the screen was fixed at four), price adjustment % per certificate (can be negative), retention release (capped at what is held, not taxed again), contract position (revised sum, certified to date and %, retention held, advance still to recover), and a **cumulative certificates register** with CSV download.
Still open: escalation from price indices (base and current index formulas), materials on site, advance recovery schedules (fixed instalments), liquidated damages, variations that change the quantity of an existing item in the valuation, an approval workflow (who, when, status history), and a printable certificate register.

### Found and fixed while doing P1
- Undo and Redo in the header were decorative.
- The IPC screen could only show four certificates, and its table had fixed text for 5% retention and 10% recovery.
- Leftovers of the original regional version that the first conversion missed: a personal name used as the default approver and sample users, the national tax-ID field "PAN" (now Tax ID), a Kathmandu locality in an address default, two Devanagari print fonts (Kalimati, Nirmala UI), a Nepali sentence stored in legacy Preeti font encoding, and a sample project name with a person and river. The only remaining personal name is the author credit line, which I left untouched.

---

## UX & onboarding: feedback from a first-time user review

A colleague reviewed the Measurement Book and BOQ screens and found the foundation comprehensive, with the MB-to-BOQ link especially useful. Their suggestions are about making the first hour easier. Each one was checked against the running app (desktop 1440 px and a phone-size 390 px screen) before being listed.

**What the audit found**
- **Desktop:** the header already shows the zone, the financial year, *Saved hh:mm* and a backup-age chip. It does not show the currency, the tax rate or the unit system; the currency appears only as "USD" inside the cards and table headings and can only be changed in Settings → Display. The Home screen lists nine "workflow modules" with no order or progress, and an empty project just shows "0 items".
- **Phone (390 px):** the page scrolls sideways (570 px wide), 20 of the 38 visible buttons are smaller than 32 px, at least one table is wider than the screen, and the *Saved* indicator is hidden on small screens. On desktop 58 of the 65 controls on the BOQ screen are under 32 px, which is fine for a mouse and too small for touch.
- **Already in place:** a saved indicator and a backup chip (P0 #4), a full backup and restore, a "Load Sample Civil Measurements" button, and a currency setting.

| # | Suggestion | Today (audited) | Planned change | Priority | Effort |
|---|---|---|---|---|---|
| U1 | **"Start here" guide** through the usual flow: add norms or work items → enter measurements → sync quantities to the BOQ → review rates → export or print | None. First-time users land on Home with nine unordered modules | A short checklist that opens on first run and from Help. Each step shows live status (work items: 0, items measured: 3 of 12, rates reviewed, last export) and links straight to the screen. Dismissible, progress kept per project | P1 | M |
| U2 | **Make the next step obvious on each screen**, especially the BOQ screen with its many options | Several equal-weight buttons, no recommendation | A numbered step bar (1 Norms, 2 Measure, 3 BOQ, 4 Rates, 5 Export) highlighting where you are, and one primary "Recommended next" button worked out from the project state (no items → add work items; items without measurements → enter measurements; measured but not synced → sync to BOQ; synced → review rates; reviewed → print / export) | P1 | M |
| U3 | **Small editable sample project with a clear reset** | The sample button fills only the MB of the current project, and there is no reset | A complete sample project (items, rates, measurements, a contract and one payment certificate) created as its own project, labelled "Sample (safe to edit)", with a *Reset sample* button that restores it. It never touches real projects | P2 | M |
| U4 | **Show units, currency, tax mode, zone and financial year together and let users check them before estimating** | Zone and FY in the header, "Office Mode" chip; currency only as text; tax rate and units not visible | An *Estimate settings* bar (Currency · Units · Tax mode and rate · Zone · FY), each part clickable to change. A "check before you start" step when a project is created that asks to confirm the currency and tax rate, and a visible "default, not confirmed" mark until the user does | P1 | S to M |
| U5 | **Brief explanations and examples** for Norms, Resource Qty, Contract BOQ, Version Lock (and Office vs Contractor mode, Zone rates, MB, BOQ, IPC, Retention) | No explanation in the ribbon or the screens | A "?" next to each term with a one-sentence definition and a worked example, a Help → Glossary page, and a short hint on each empty screen | P1 | S |
| U6 | **Clearer save and backup status** with last-saved time and a straightforward reminder | Desktop: shows *Saved hh:mm* and a passive "No backup yet" chip. Phone: hidden | Keep the indicator on small screens too; after 7 days or N changes show a dismissible reminder with a one-click *Back up now*; show the last backup time in the file menu | P1 | S |
| U7 | **Check tables and controls on a phone and put the most-used actions within reach** | Fails the basics (see audit): sideways page scroll, tiny controls, wide tables | Responsive header (chips collapse into one menu), the ribbon becomes a bottom action bar with the most-used actions (Add item, Add measurement, Save, Undo, Export), tables scroll inside their own container with a fixed first column, 44 px touch targets in touch mode, the takeoff side panel becomes a bottom sheet | P2 (P1 if phones are a target) | L |
| U8 | **Make the currency setting easy to find and confirm** | Only in Settings → Display; the dashboard shows "USD" with no way to change it from there | Covered by U4: a currency chip in the header that opens the setting, a currency choice when a project is created, and the currency shown in each BOQ and bill title. Later: a second "report currency" with a user-entered exchange rate (see P1 #9) | P1 | S |

**Suggested order for these:** quick wins first (U5 glossary, U6 backup reminder, U4 + U8 settings bar and currency chip), then the guided flow (U1 Start here, U2 next-step bar), then the sample project (U3), and the phone pass (U7) as its own piece of work.

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

1. Done: tests, stable references, valuation screens, backups, Excel-like grid, contract depth (see the status table).
2. Next: the quick UX wins (U4 to U6, U8), then the guided flow (U1, U2).
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