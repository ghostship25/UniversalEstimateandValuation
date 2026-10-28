# 11. Project Folder Structure

```
universal-estimating-valuation/
├── docs/                      # Spec Kit Architecture & Manuals (01 - 20)
├── src/
│   ├── assets/                # Logos, sample files
│   ├── components/            # Reusable UI components
│   │   ├── rate-analysis/     # Rate Analysis Worksheet & Formula Builder
│   │   ├── boq/               # Project BOQ & Abstract of Cost Table
│   │   ├── resources/         # Resource Master, Zone Rates, Lead/Lift
│   │   ├── data-cleaning/     # Duplicate detector & Unit normalizer
│   │   ├── ai-assistant/      # Gemini AI Chat & Norm Suggester
│   │   ├── reports/           # Printable Rate Analysis, Material Statement PDF/Excel
│   │   ├── docs-viewer/       # Built-in Spec Kit Viewer
│   │   └── ui/                # Buttons, Modal, Inputs, Badges, Cards
│   ├── data/                  #  Master Datasets (Resources & Norms JSON)
│   ├── services/              # API Client & Rate Calculation Engine
│   ├── types/                 # Shared TypeScript interfaces
│   ├── utils/                 # Unit conversions, number/currency formatters, excel export
│   ├── App.tsx                # Main Layout & Navigation Router
│   └── main.tsx               # Frontend Entry Point
├── server.ts                  # Express + Vite SSR/API Full-Stack Server
├── metadata.json              # App Metadata & Capabilities
├── package.json               # Dependencies & build scripts
└── vite.config.ts             # Vite Configuration
```
