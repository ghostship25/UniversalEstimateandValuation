# 01. Project Vision: Universal Estimating & Valuation Enterprise Rate Analysis System

## Purpose
Universal Estimating & Valuation is designed to modernize, standardize, and automate the construction cost estimation process across all public and private civil engineering sectors in  (including BLD, Department of Roads, Irrigation, DWSS, Provincial Governments, and Municipalities).

Historically, estimation teams relied on disjointed spreadsheets and paper-based Norms books (e.g. Norms 2070/2071 updates). This introduced vulnerabilities such as untracked coefficient changes, manual rounding discrepancies, unverified material lead/lift additions, and lack of historical audit trails. Universal Estimating & Valuation establishes a single source of truth for Rate Analysis, Bill of Quantities (BOQ), and Resource Price Indexing.

## Key Goals & Architectural Vision
- **Hybrid Local-First Architecture**: Operates as a Desktop local application (Tauri/Electron + SQLite) for offline field usage in remote mountain zones, and synchronizes seamlessly with a cloud PostgreSQL engine for multi-tier government approvals.
- **Strict Compliance with  Public Procurement Act (procurement rules/PPR)**: Built-in formulas for 15% Contractor Overhead & Profit, configured Tax, Zone Rate Committee (Jilla Dar Rate) lookup matrices, Lead/Lift transport adjustments, and Royalty taxes.
- **Unicode-Safe Data Entry**: Full support for UTF-8 Unicode text so item names and descriptions can be entered in any language.

## Advantages
1. **Consistency**: Enforces unified resource codes and standardized rate breakdown structures across all projects.
2. **Speed & Scalability**: Dynamic recalculation of thousands of BOQ items in <100ms.
3. **Data Integrity & Traceability**: Immutable version control and auditing on all norm updates and coefficient modifications.
