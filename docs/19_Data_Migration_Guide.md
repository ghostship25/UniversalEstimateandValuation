# 19. Data Migration Guide

## Legacy File Import Strategy
Universal Estimating & Valuation provides migration paths for existing SQLite databases, Excel spreadsheets, and JSON exports from legacy  Rate Analysis software.

## Migration Steps
1. Prepare Excel file with columns: `Resource Name`, `Category`, `Unit`, `Rate`, `Zone`.
2. Navigate to **Master Data** -> **Import Data**.
3. Upload `.xlsx`, `.csv`, `.json`, or `.db` (SQLite) file.
4. Preview mapped columns and standard units.
5. Click **Execute Migration**.
6. Run **Data Cleaning** tool post-import to eliminate duplicate items across imported sets.
