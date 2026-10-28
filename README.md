# Universal Estimating & Valuation

A web and desktop application for construction cost estimating and contract valuation. It works for any country, currency and measurement standard: rate analysis, norms libraries, Measurement Book (MB), Bill of Quantities (BOQ), interim payment certificates and completion certificates, all in English and fully offline-capable.

## Features

- **Norms & rate analysis** – Resource breakdowns (labor, material, equipment), percentage-based resources, overhead and profit, and one-click transfer of rates into the BOQ. Import or export norms as CSV/Excel.
- **Zone rates** – Rate schedules per zone/location and fiscal year, with labor and material multipliers and per-resource tax status (taxable / tax-exempt).
- **Two pricing modes** – Client estimate mode (material rates net of tax, tax applied on the taxable subtotal) and contractor mode (tax included in material rates).
- **Measurement Book** – Hierarchical sub-measurements, spreadsheet-style formulas (`=SUM(L1:L5)`, `=REF(item_id)`), custom dimension columns, deductions, precision and rounding settings.
- **BOQ / abstract of estimate** – Live quantity sync from the MB, contingency, tax, grand total, Excel and print output.
- **Valuation** – Valuation MB, contract setup, interim payment certificates (retention, advance recovery, tax), variation orders (component present, not yet linked in navigation) and completion certificate.
- **Drawing tools** – Parametric template drawings, bar bending schedules and visual geometry-to-MB mapping.
- **AI assistant (optional)** – Gemini-backed norm suggestions and Q&A when `GEMINI_API_KEY` is set.
- **Local-first** – Data is kept in the browser (SQLite via sql.js / localStorage); installable as a PWA; optional Electron wrapper.

## Configuration

All regional settings are user-configurable under **Settings → Display / Format**:

| Setting | Default | Notes |
|---|---|---|
| Currency | `USD` | Any code or symbol (EUR, GBP, JPY, INR, AED, ...). |
| Number system | International (1,234,567.89) | Optional South Asian grouping (12,34,567.89). |
| Tax rate | Per project (new projects: 10%) | Set to 0 for no tax. |
| Fiscal year | `YYYY/YY` | Free format, e.g. `2026/27`. |
| Dimension labels | `No., L, B, H` | Or full labels. |

Sample zones, rates, organizations and contractors included in the app are illustrative placeholders. Replace them with your own norms and rate schedules (CSV/Excel import is supported).

## Getting started

```bash
npm install
cp .env.example .env      # optional: add GEMINI_API_KEY
npm run dev               # http://localhost:3000
```

Other scripts: `npm run lint` (type check), `npm run build` (production build), `npm start` (run the built server), `npm run desktop:build` (Electron installers via electron-builder).

## Project layout

```
src/            React + TypeScript application (components, modules, services, data, types)
server.ts       Express server (API routes, optional Gemini proxy, serves the app)
electron/       Optional desktop wrapper
public/         PWA manifest, service worker, icons
docs/           Specification documents
```

## Data files

Project files use `.uep` and master templates use `.uet` (both JSON).

## Privacy

Everything runs locally unless you enable the optional AI assistant, which sends your prompt and limited project context to the Gemini API.
