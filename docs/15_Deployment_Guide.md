# 15. Deployment Guide

## Web / Cloud Container Setup (Docker / Cloud Run)
1. Build application container:
   ```bash
   npm run build
   ```
2. Start server on production port 3000:
   ```bash
   NODE_ENV=production node dist/server.cjs
   ```

## Desktop Build (Tauri)
1. Install Tauri CLI and Rust compiler.
2. Build standalone executable for Windows/macOS:
   ```bash
   npm run tauri build
   ```
   This generates `Universal Estimating & Valuation-Setup.exe` bundled with embedded SQLite.
