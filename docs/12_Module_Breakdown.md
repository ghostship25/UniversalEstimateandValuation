# 12. Module Breakdown

## 1. Rate Analysis Calculation Engine (`/src/services/rateEngine.ts`)
- Pure, deterministic calculation functions handling L/M/E item sub-costs.
- Applies Zone Rate overrides based on selected location (e.g. Metro A vs Metro B vs Hills A vs Mountain A).
- Adds Lead (km haulage rate), Lift (scaffolding/crane height factor), Royalty, Contractor Overhead (15%), and Tax (configured rate).

## 2. Resource & Zone Rate Master
- Searchable directory of 217+ civil engineering materials, labor types, and heavy equipment.
- Multi-zone rate comparison grid showing price trends across fiscal years.

## 3. Standard Norms Library (BLD & RDS)
- 341 pre-configured rate analysis items covering Earthwork, Concrete, Formwork, Masonry, Roofing, Aluminium Works, Road Pavements, Pipe Culverts, Gabion Structures, etc.

## 4. BOQ & Abstract Cost Generator
- Create custom project estimates, attach quantities to norms, calculate project subtotal, contingency, and print client-ready reports.

## 5. Data Cleaning & De-duplication Module
- Rules-based string distance & LLM-assisted fuzzy matching to propose merges for duplicate entries.

## 6. Gemini AI Assistant
- Conversational assistant that recommends norms based on project scope, detects anomalous resource prices, and assists with unit conversions.

## 7. Valuation Measurement Book & Abstract Engine (`/src/modules/valuation/ValuationMBView.tsx`)
- **Interim Payment Certificate (IPC) Management**: Tracks valuation MB records across multiple billing stages (IPC 1, IPC 2, First & Final).
- **Itemized Provisional Sums (P.S. Items)**: Dedicated `+ P.S. Item` button adds itemized provisional sum claims to valuation total prior to contingency.
- **Valuation Abstract Financial Statement**: Computes Sub Total Executed Work, Grand Estimate Base, Approved Authority Budget, Proportional Authority Grant Share, Contingency Deduction, Public Participation Share, Previous Paid Installment deduction, and Net Payable Amount.
- **Smart PDF & Excel Export**: Formatted PDF printouts with dynamic auto-fit column widths and live sync to Excel/LibreOffice.
