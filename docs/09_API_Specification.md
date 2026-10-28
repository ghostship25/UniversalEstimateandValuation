# 09. API Specification

## 1. Master Resources API
- `GET /api/v1/resources?search={query}&category={Material|Labor|Equipment}&page=1`: Query master resources.
- `POST /api/v1/resources`: Create a new resource master.
- `PUT /api/v1/resources/{id}`: Update resource properties, alias, or rate.
- `POST /api/v1/resources/clean`: Run AI/fuzzy duplicate detection across resources.

## 2. Norms & Rate Analysis API
- `GET /api/v1/norms?sector={Building|Road}&search={code_or_name}`: Search departmental norms.
- `POST /api/v1/analysis/calculate`: Calculate rate breakdown for a norm with custom zone rates, lead, lift, overheads, and taxes.
  - **Payload**:
    ```json
    {
      "norm_id": "item_29",
      "zone": "Metro A",
      "fiscal_year": "2025/26",
      "contractor_overhead_percent": 15.0,
      "vat_percent": 13.0,
      "custom_lead_km": 5.0
    }
    ```

## 3. BOQ & Project Estimation API
- `POST /api/v1/projects`: Create a new project estimate.
- `GET /api/v1/projects/{id}/abstract`: Generate Abstract of Cost report.
- `GET /api/v1/projects/{id}/material-statement`: Generate bulk Material, Labor, and Equipment statements.
