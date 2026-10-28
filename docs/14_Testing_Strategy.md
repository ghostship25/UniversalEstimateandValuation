# 14. Testing Strategy

## 1. Unit Testing
- **Rate Engine Calculations**: Verify that $\text{Material} + \text{Labor} + \text{Equipment} + 15\% \text{Overhead} + 13\% \text{Tax}$ equals expected mathematical values within $\pm 0.01$ local currency accuracy.
- **Unit Normalization**: Verify unit conversion functions (e.g. `cum` -> `Cu.m.`, `` -> `Nos`).

## 2. Integration & Data Integrity Testing
- **Cascade Deletes**: Ensure deleting a resource notifies or guards against breaking active rate analysis norms.
- **Excel Parser Validation**: Test importing malformed Excel sheets to ensure validation errors are flagged cleanly.

## 3. Performance & Load Testing
- Test calculation latency when recalculating 500 BOQ items simultaneously (<200ms target).
