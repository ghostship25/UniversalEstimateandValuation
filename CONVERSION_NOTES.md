# Conversion notes: Nepal edition -> Universal Estimating & Valuation

- Branding unified (was NIRMANA / Astra-RMS / react-example). Package: `universal-estimating-valuation`.
- All Devanagari text and Nepali-language fields (`*_np`) removed; the UI and data are English only.
- Currency is user-configurable (default USD); tax is a generic per-project rate (new projects 10%); number grouping defaults to international (South Asian lakh/crore kept as an option).
- Districts -> Zones; Nepal agency norms (DUDBC/DOR/DOI...) -> neutral Buildings/Roads/Irrigation/Water Supply catalogs; Karya Sampanna -> Completion Certificate; Bikram Sambat date fields (`*_bs`) -> `*_iso`.
- File extensions: projects `.uep`, templates `.uet`. Storage keys now `uev_*`: data saved by the old build will not load.
- Removed unreachable legacy files (Navbar, Header, InitialSetupWizard, DocsViewer, ImportExportView, ResourceMasterView, RateDiagnosticsModal, EmbeddedMBSpreadsheet, ipcBridge, DOR equipment/transport engines and data).
- Fixed: 0% tax falling back to 13%; invented fallback amounts in the IPC bill; path traversal in `/api/docs/:filename`; missing PWA/build icons; electron/electron-builder missing from devDependencies.
- Known gaps: VariationOrderView, ContractSetupView and IPCBillView are not all reachable from navigation; sample rates are illustrative; English wording of converted strings has not had human review.

## Added: Excel-style cell linking (Estimate MB and Valuation MB)
- Type `=`, click any other cell (same item, other item, or an item total), press Enter. Esc cancels; clicking a second cell replaces the last pointed reference; linked cells are highlighted and show an `R#` row badge.
- Same item: `L1`, `B1`, `H1`, `N1`, `Q1`; other item: `I2.R1.L`, `I2.R1.QTY`, `I2.QTY`; ranges: `SUM(L1:L3)`.
- Fixed: formula cells kept showing stale values until reload when their source changed; Esc could commit the draft.
- Code: `src/services/formulaPointing.ts`, `src/components/SpreadsheetCell.tsx`.

## Added: PDF / image takeoff (Estimate MB and Valuation MB)
- Ribbon button 'PDF Takeoff' (Estimate > Entries & Calc, Valuation > Valuation Stages). Code in `src/modules/takeoff/`.
- Fixed: adding a Valuation MB row also added a phantom row to the Estimate MB (estimate quantities were inflated); removed a hardcoded 'Tax: 13% Added' label from the Valuation ribbon.
- See `Optimization.md` for the prioritized roadmap.

## Takeoff v2 + CAD
- Scale per page / all pages / range; shapes (line, polyline, arc, curve, rectangle, rotated rectangle, polygon, circle, ellipse, freehand, count, angle); area as value / perimeter / L×B / B×L / L×H; slope and waste; item evidence layers with PNG and CSV export; DXF takeoff (`src/modules/takeoff/`).
- MB rule: an empty or text No./L/B/H cell is skipped; a typed 0 multiplies (1×3×6×empty = 18, 1×3×6×0 = 0). `computeRowBaseQuantity` in `mbDependencyEngine.ts` + `mbCellValue.ts`, used by Estimate and Valuation. Blank stays blank when saved (it was turned into 0 before).
- Tests: `npm test` (Vitest) runs in CI.

## P0 work (see Optimization.md)
- Tests: 71 Vitest tests (quantity rule, takeoff geometry, DXF, backup format, reference remap, formula evaluator, IPC maths).
- References follow cells when rows/items move, are inserted or deleted (`src/services/refRemap.ts`); deleted targets show #REF! with a warning.
- Valuation screens wired into the ribbon: Contract Setup, IPC Certificates, Variation Orders.
- Full Backup & Restore, Saved / NOT SAVED indicator, backup-age chip; sql.js wasm bundled and a CDN-free service worker so the app works offline.
- Invented numbers removed (contract defaults, fixed 5% retention, 10% advance recovery, fake cumulative, fixed bill dates, fallback rates 145 / 550 / 1200 / 8500, hardcoded 13% tax). New: `advance_recovery_percent` on the contract.
- Bugs fixed: a false circular-reference guard returned 0 for a formula cell at the same row number in another item; copying an estimate row into the valuation turned a 0 into 1.
