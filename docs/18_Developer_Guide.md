# 18. Developer Guide

## Local Setup & Development Workflow
1. Clone repository and install dependencies:
   ```bash
   npm install
   ```
2. Start dev server:
   ```bash
   npm run dev
   ```
   App runs on `http://localhost:3000`.

## Architecture Conventions
- All rate analysis calculations are implemented in `/src/services/rateEngine.ts` to remain deterministic, framework-agnostic, and testable.
- State management uses React Hooks + local state with localStorage sync for offline persistence.
- Server endpoints in `server.ts` wrap Gemini API for intelligent rate and norm recommendations.
