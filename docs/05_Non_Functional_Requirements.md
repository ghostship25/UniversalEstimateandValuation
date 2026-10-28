# 05. Non-Functional Requirements

## 1. Performance & Speed
- **Sub-50ms Rate Analysis Engine**: Instant calculation when switching zones, changing labor wages, or adding custom materials.
- **Large Dataset Capacity**: Efficient virtualized table rendering capable of smoothly displaying 10,000+ BOQ items and master resources.

## 2. Local-First & Offline Resilience
- Progressive Web App (PWA) manifest with service worker caching.
- Embedded local storage fallback (SQLite / IndexedDB) with background synchronization to PostgreSQL.

## 3. Data Integrity & Security
- Strict Third Normal Form (3NF) relational database normalization.
- Foreign key constraints, UUID surrogate keys, soft deletion (`is_deleted` flags), and detailed audit timestamps (`created_at`, `updated_at`, `created_by`).
- JWT authentication with Role-Based Access Control (Super Admin, Estimator, Auditor, Viewer).

## 4. Internationalization & Accessibility
- Native support for UTF-8 Unicode text in item descriptions.
- Keyboard shortcuts (`CMD+K` / `Ctrl+K`) for global resource search.
