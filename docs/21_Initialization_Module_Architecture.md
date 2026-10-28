# 21. Enterprise Initialization Module & ERP Master Architecture

## 1. Product Requirements for the Initialization Module

### 1.1 Business Objective
The Initialization Module serves as the mandatory, single-source-of-truth ERP setup engine for Universal Estimating & Valuation. All rate analyses, BOQ estimates, material schedules, and tender bids in  Government, Municipalities, Provincial Ministries, Consultants, and Contractors depend directly on the setup parameters established during initialization.

### 1.2 Core Requirements
- **Mandatory First-Run Execution**: Upon initial launch or environment reset, the Initial Setup Wizard opens automatically and locks main application navigation until all 8 mandatory steps pass validation.
- **Multi-Fiscal-Year Isolation**: Complete data segregation per  Fiscal Year (e.g., 2026/27, 2027/28). Allows copying previous rate schedules with inflation factors and locking completed fiscal years against unauthorized tampering.
- **Jurisdictional Organization Mapping**: Captures State/Province, Zone, Local Authority Type (Metropolitan, Sub-Metropolitan, Local Authority, Rural Local Authority), Office Name, Logo, Address, and Contact Details.
- **Preloaded & Custom Zone Rates**: Checks existing library for Fiscal Year + Zone + Org. Offers preloaded standard schedules, Excel/CSV uploader, or manual rate entry.
- **Master Norm Libraries**: Manages Building, RDS Road, RDS Bridge, IRR Irrigation, WSS Water Supply, PWR Electrical, Heavy Mechanical, WRS River Training, and Urban Infrastructure libraries. Read-only originals with custom versioning.
- **Automated Resource Cross-Mapping**: Multi-tier matching engine (Resource Code → Exact Name → Alias → Fuzzy Match) mapping zone rate tariffs to standard norm resources.
- **Master Diagnostic Validation**: Scans system readiness before unlocking operational modules.

---

## 2. Database Schema (3NF Normalized)

All tables utilize **UUID v4** primary keys, audit fields (`created_at`, `created_by`, `modified_at`, `modified_by`), optimistic concurrency control (`version`), soft deletion (`deleted_at`, `is_deleted`), and status tracking (`status`).

```sql
-- 1. Fiscal Year Table
CREATE TABLE fiscal_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE, -- e.g. '2026/27'
    is_active BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    start_date_bs DATE NOT NULL,
    end_date_bs DATE NOT NULL,
    copied_from_fy VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    version INT DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'ACTIVE'
);

-- 2. State / Province Master
CREATE TABLE provinces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    province_no INT NOT NULL UNIQUE,
    name_en VARCHAR(100) NOT NULL,
    name_np VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false
);

-- 3. Zone Master
CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    province_id UUID REFERENCES provinces(id),
    name_en VARCHAR(100) NOT NULL,
    name_np VARCHAR(100) NOT NULL,
    region VARCHAR(30) CHECK (region IN ('Himalayan', 'Hilly', 'Terai', 'Valley')),
    labor_multiplier NUMERIC(5,2) DEFAULT 1.00,
    material_multiplier NUMERIC(5,2) DEFAULT 1.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false
);

-- 4. Local Authority Master
CREATE TABLE local authorities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES zones(id),
    name_en VARCHAR(150) NOT NULL,
    name_np VARCHAR(150) NOT NULL,
    municipality_type VARCHAR(50) CHECK (municipality_type IN ('Metropolitan City', 'Sub-Metropolitan City', 'Local Authority', 'Rural Local Authority')),
    total_subdivisions INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false
);

-- 5. Organization & Department Master
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipality_id UUID REFERENCES local authorities(id),
    department_name VARCHAR(200) NOT NULL,
    organization_name VARCHAR(200) NOT NULL,
    office_name VARCHAR(200) NOT NULL,
    logo_url TEXT,
    address TEXT NOT NULL,
    contact_email VARCHAR(100),
    contact_phone VARCHAR(50),
    pan_no VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INT DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'ACTIVE'
);

-- 6. Resource Master
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id_num INT UNIQUE NOT NULL,
    code VARCHAR(50),
    name_en VARCHAR(200) NOT NULL,
    name_np VARCHAR(200),
    category VARCHAR(30) CHECK (category IN ('Material', 'Labor', 'Equipment', 'Transport', 'Unclassified', 'Excluded')),
    unit VARCHAR(30) NOT NULL,
    default_rate NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INT DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'ACTIVE'
);

-- 7. Resource Alias Table
CREATE TABLE resource_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID REFERENCES resources(id),
    alias_name VARCHAR(200) NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Zone Rate Master & History
CREATE TABLE zone_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fiscal_year_id UUID REFERENCES fiscal_years(id),
    zone_id UUID REFERENCES zones(id),
    organization_id UUID REFERENCES organizations(id),
    resource_id UUID REFERENCES resources(id),
    item_code VARCHAR(50) NOT NULL,
    resource_code VARCHAR(50),
    item_name_en VARCHAR(200) NOT NULL,
    item_name_np VARCHAR(200),
    category VARCHAR(30) NOT NULL,
    subcategory VARCHAR(100),
    unit VARCHAR(30) NOT NULL,
    zone_rate NUMERIC(12,2) NOT NULL,
    effective_date DATE NOT NULL,
    source VARCHAR(150),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INT DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'ACTIVE'
);

-- 9. Norm Master & Versioning
CREATE TABLE norm_masters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id_num INT UNIQUE NOT NULL,
    source_library VARCHAR(100) NOT NULL, -- e.g., 'Building (BLD)'
    code VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    base_quantity NUMERIC(10,3) NOT NULL DEFAULT 1.00,
    base_unit VARCHAR(30) NOT NULL,
    version VARCHAR(20) DEFAULT 'v1.0-Standard',
    is_read_only BOOLEAN DEFAULT true,
    parent_norm_id UUID REFERENCES norm_masters(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'ACTIVE'
);

-- 10. Norm Items (Resource breakdown)
CREATE TABLE norm_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    norm_id UUID REFERENCES norm_masters(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES resources(id),
    quantity_per_base_unit NUMERIC(12,5) NOT NULL,
    unit_override VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Resource Mapping Rules
CREATE TABLE resource_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_rate_id UUID REFERENCES zone_rates(id),
    master_resource_id UUID REFERENCES resources(id),
    confidence_score NUMERIC(5,4) NOT NULL,
    match_type VARCHAR(30) CHECK (match_type IN ('CODE_EXACT', 'NAME_EXACT', 'ALIAS', 'FUZZY_MATCH', 'MANUAL')),
    status VARCHAR(30) DEFAULT 'APPROVED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Import & Validation Logs
CREATE TABLE import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name VARCHAR(200) NOT NULL,
    total_rows INT NOT NULL,
    inserted_count INT NOT NULL,
    updated_count INT NOT NULL,
    failed_count INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    error_details JSONB,
    executed_by UUID,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Entity-Relationship (ER) Diagram

```
+-----------------------------------------------------------------------------------+
|                              MASTER DATA HIERARCHY                                |
+-----------------------------------------------------------------------------------+

   Application (Universal Estimating & Valuation Engine)
        │
        ├── FiscalYear (1 : N)
        │     │
        │     └── Organization (1 : N)
        │           │
        │           └── ZoneRate (1 : N)
        │                 │
        │                 └── ResourceMapping (1 : 1)
        │                       │
        │                       └── ResourceMaster (1 : N)
        │                             │
        │                             └── StandardNorms (1 : N)
        │                                   │
        │                                   └── Projects (1 : N)
        │                                         │
        │                                         └── BOQ (1 : N)
        │                                               │
        │                                               └── RateAnalysis
```

---

## 4. UI Wireframes & Layout Spec

```
+-----------------------------------------------------------------------------------+
|  UEV INITIAL CONFIGURATION WIZARD                               Step 3 of 8 |
+-----------------------------------------------------------------------------------+
| [1. FY] -> [2. Organization] -> [3. Zone Rates] -> [4. Validation] -> ...     |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  Select Zone Rate Schedule Source for Metro A (FY 2026/27)                  |
|                                                                                   |
|  +------------------------+  +------------------------+  +---------------------+  |
|  | Option A: Preloaded    |  | Option B: Excel Upload |  | Option C: Manual    |  |
|  | Standard Schedule      |  | Custom Template (.xlsx)|  | Direct Data Entry   |  |
|  | [217 Active Rates]     |  | [Upload Button]        |  | [Initialize Table]  |  |
|  +------------------------+  +------------------------+  +---------------------+  |
|                                                                                   |
+-----------------------------------------------------------------------------------+
|  [< Previous Step]                                        [Next Step: Upload >]   |
+-----------------------------------------------------------------------------------+
```

---

## 5. Import Template Specification (Excel / CSV)

The official zone rate import template requires 11 standardized columns:

| Col # | Column Name | Data Type | Required | Sample Value | Validation Rules |
|---|---|---|---|---|---|
| 1 | `Item Code` | String | Yes | `DR-MAT-001` | Unique string alphanumeric |
| 2 | `Resource Code` | String | Yes | `RES-CEM-53` | Resource code matching |
| 3 | `Item Name English` | String | Yes | `OPC Cement 53 Grade` | Min 3 chars |
| 4 | `Item Name (alt.)` | String | No | `` | Optional alternate-name column |
| 5 | `Category` | Enum | Yes | `Material` | Material, Labor, Equipment, Transport |
| 6 | `Subcategory` | String | No | `Binding Materials` | Text string |
| 7 | `Unit` | String | Yes | `Bag` | Normalized unit (Bag, Cu.m., Sq.m., Md, hr, kg) |
| 8 | `Zone Rate` | Decimal | Yes | `780.00` | Positive numeric > 0 |
| 9 | `Effective Date` | Date | Yes | `2026-04-01` | YYYY-MM-DD format |
| 10 | `Source` | String | Yes | `Zone Rate Committee` | Text source |
| 11 | `Remarks` | String | No | `Standard 50kg Bag` | Text comments |

---

## 6. Validation Rules Engine

1. **Duplicate Detection Rule**: Rejects rows where `Item Code` or (`Resource Code` + `Zone`) exists in active FY, prompting Update vs Insert strategy.
2. **Unit Validation Rule**: Normalizes variants (e.g. `cum`, `cu.m`, `m3` → `Cu.m.`; `sqm`, `sq.m`, `m2` → `Sq.m.`; `md`, `manday` → `Md`).
3. **Missing Resource Detection**: Flags resources in imported rates that do not match existing Master Resources, marking them for automated mapping in Step 7.
4. **Preview & Rollback**: All spreadsheet rows are parsed into staging memory. If user clicks "Cancel" or errors exceed 5%, transaction rolls back cleanly.
5. **Import Log Recording**: Saves row counts, inserted rows, updated rows, and detailed error messages into `import_logs`.

---

## 7. Folder Structure

```
/
├── docs/                        # Complete 21 Spec Kit Documentation Set
│   ├── 01_Project_Vision.md
│   ├── ...
│   └── 21_Initialization_Module_Architecture.md
├── src/
│   ├── components/              # Modular UI Components
│   │   ├── RateAnalysisView.tsx # Interactive Rate Analysis Worksheet
│   │   ├── BOQView.tsx          # Project BOQ Abstract & Bulk Material Rollup
│   │   ├── DataCleaningView.tsx # De-duplication & Alias Matcher
│   │   ├── AIAssistantModal.tsx # Gemini AI Civil Engineering Assistant
│   │   └── SearchModal.tsx      # Global Cmd+K Search Overlay
│   ├── data/
│   │   └── initialData.ts       #  Zones, Fiscal Years, Resources & Norms
│   ├── types/
│   │   └── index.ts             # Strict TypeScript Models & Interfaces
│   ├── App.tsx                  # App State Engine & Setup Router
│   └── main.tsx                 # React App Entry Point
└── server.ts                    # Express Server & Gemini Proxy Endpoint
```

---

## 8. API Design Specification

```
POST /api/setup/initialize
  Body: { fiscal_year, organization, zone_rates, norm_libraries, resource_mappings }
  Response: { success: true, init_token: "INIT_2026_A_8231", completed_at: "2026-07-22T22:40:00Z" }

GET /api/setup/status
  Response: { is_completed: true, active_fy: "2026/27", active_zone: "Metro A" }

POST /api/rates/import-excel
  Body: FormData (Excel file)
  Response: { parsed_count: 217, duplicates_found: 0, validation_status: "PASSED" }

GET /api/norms/libraries
  Response: [ { code: "BLD-BD", enabled: true, item_count: 142 }, ... ]

POST /api/resource/map-auto
  Body: { zone_rates, master_resources }
  Response: { mapped_rules: [ ... ], pending_review_count: 0 }
```

---

## 9. User Flow Diagram

```
[ App Launch ]
      │
      ▼
Is Setup Completed?
 ├── NO  ──► [ Launch Initial Setup Wizard ]
 │                 │
 │                 ├── Step 1: Fiscal Year Config (2026/27)
 │                 ├── Step 2: Organization Setup (state/province, zone)
 │                 ├── Step 3: Select Zone Rate Source
 │                 ├── Step 4: Excel Ingestion & Validation
 │                 ├── Step 5: Enable Norm Libraries
 │                 ├── Step 6: Norm Management & Versioning
 │                 ├── Step 7: Automated Resource Cross-Mapping
 │                 └── Step 8: Master Diagnostic Check
 │                       │
 │                       ▼
 │                [ Complete Initialization ]
 │                       │
 └── YES ◄───────────────┘
      │
      ▼
[ Open Main Universal Estimating & Valuation Suite ]
 (Rate Analysis | Resource Master | BOQ Abstract | AI Assistant)
```

---

## 10. Future Scalability Plan

1. **Multi-Tenant Government Cloud**: Scale database horizontally across 's 753 Local Levels (Municipalities) with isolated schema per local_authority.
2. **Offline-First SQLite Sync**: Native desktop compilation via Tauri / Cloud Run container sync keeping rate calculations functional in remote mountain locations without internet access.
3. **Role-Based Access Control (RBAC)**: Granular permissions for Estimating Engineers, Section Chiefs, Zone Rate Officers, and Contractors.
4. **Blockchain Audit Trail**: Cryptographic hashing of approved rate schedules to prevent retroactive price modifications or tender bid manipulation.

> Note: the 8-step setup wizard described in this document is a design specification. It is not included in the current build; fiscal year, zone and organization setup are available from the Initiation modules in the application.
