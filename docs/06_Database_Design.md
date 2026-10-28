# 06. Database Design & Relational Schema (3NF)

```sql
-- 1. Units Master Table
CREATE TABLE units (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name_en VARCHAR(100) NOT NULL,
    name_np VARCHAR(100)
);

-- 2. Resources Master Table
CREATE TABLE resources (
    id VARCHAR(36) PRIMARY KEY,
    unique_code VARCHAR(30) UNIQUE NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_np VARCHAR(255),
    category VARCHAR(50) CHECK (category IN ('Material', 'Labor', 'Equipment', 'Transport', 'Unclassified', 'Excluded')),
    unit VARCHAR(50) NOT NULL,
    default_rate DECIMAL(12,2) DEFAULT 0.00,
    used_in VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Zone Rates Table
CREATE TABLE zone_rates (
    id VARCHAR(36) PRIMARY KEY,
    resource_id VARCHAR(36) REFERENCES resources(id),
    zone_name VARCHAR(100) NOT NULL,
    fiscal_year VARCHAR(20) NOT NULL,
    rate DECIMAL(12,2) NOT NULL,
    source VARCHAR(100),
    UNIQUE(resource_id, zone_name, fiscal_year)
);

-- 4. Standard Norms / Items Table
CREATE TABLE norms (
    id VARCHAR(36) PRIMARY KEY,
    item_code VARCHAR(50) NOT NULL UNIQUE,
    source VARCHAR(100) NOT NULL, -- e.g., 'Building (WBSBD)', 'Road (WBSRoad)'
    description_en TEXT NOT NULL,
    description_np TEXT,
    base_quantity DECIMAL(10,4) NOT NULL DEFAULT 1.0,
    base_unit VARCHAR(50) NOT NULL
);

-- 5. Norm Resource Breakdown (Junction Table)
CREATE TABLE norm_resources (
    id VARCHAR(36) PRIMARY KEY,
    norm_id VARCHAR(36) REFERENCES norms(id) ON DELETE CASCADE,
    resource_id VARCHAR(36) REFERENCES resources(id),
    quantity_per_base_unit DECIMAL(12,6) NOT NULL,
    wastage_percent DECIMAL(5,2) DEFAULT 0.00
);

-- Indexes for lightning fast fuzzy search and composite joins
CREATE INDEX idx_resources_name_en ON resources(name_en);
CREATE INDEX idx_resources_name_np ON resources(name_np);
CREATE INDEX idx_norms_code ON norms(item_code);
CREATE INDEX idx_zone_rates_lookup ON zone_rates(zone_name, fiscal_year);
```
