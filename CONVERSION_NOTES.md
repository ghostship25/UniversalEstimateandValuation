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
