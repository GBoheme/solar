# CHANGELOG — Smart Solar Systems

## [1.1.0] — Security & Engineering Audit (2026-03-01)

### 🔴 CRITICAL — Security (P0)

#### P0.1 — Authentication Re-enabled
- **File:** `server.ts` (lines 7-35)
- Re-enabled `requireAuth` and `requireRole` middleware imports
- Removed hardcoded admin user injection (direct access mode)
- Added centralized auth middleware: all `/api/*` routes require auth except public paths
- Added admin role guard for `/api/admin/*`, `/api/settings/exchange-rate`, `/api/settings/default-margin`
- Added `requireRole(['admin'])` on `DELETE /api/quotes/:id` and `DELETE /api/clients/:id`
- Set `trust proxy` for correct IP detection behind reverse proxy

#### P0.2 — JWT Refresh Token Fix
- **File:** `server.ts` (refresh + logout endpoints)
- Changed `jwt.decode()` → `jwt.verify()` for refresh token validation (was accepting unsigned tokens)
- Fixed logout endpoint: moved audit log inside verified block, added catch for expired tokens

#### P0.3 — Stack Trace Leak Removed
- **File:** `server.ts` (amper-quote endpoint)
- Removed `stack: err.stack` from error response (was exposing internal paths)
- Now returns generic message in production

#### P0.4 — Audit Logging Enforcement
- **File:** `server.ts`
- Added audit logging on `DELETE /api/quotes/:id` (was missing)
- Added audit logging on `DELETE /api/clients/:id` (was missing)
- All destructive operations now logged with actor, entity, old/new values

#### P0.5 — Secrets & Configuration
- **File:** `vite.config.ts`
- Removed `GEMINI_API_KEY` injection into client bundle (was leaking API key to frontend)
- **File:** `.env.example`
- Added `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS` to required env vars
- Added generation instructions for strong secrets

#### P0.6 — API Fetch Auth Restoration
- **File:** `src/utils/apiFetch.ts`
- Restored Bearer token attachment from `authStore`
- Restored auto-refresh on 401 (TokenExpired)
- Auto-redirect to `/login` on refresh failure

### 🟡 HIGH — Security Hardening (P0)

#### P0.7 — CORS & Security Middleware
- **File:** `server/middleware/security.ts`
- Removed `NODE_ENV !== 'production'` CORS bypass (was allowing all origins in dev)
- CORS now uses `CORS_ORIGINS` env var (configurable, strict by default)
- Added CSP headers via Helmet in production
- Increased global rate limit from 100→300 per 10 min (was too aggressive for SPA)
- Increased body size limit from 10kb→50kb
- Removed duplicate `express.json()` in server.ts (was overriding security middleware limit)

### 🔧 Engineering Fixes (P0)

#### P0.8 — Solar Engine: Division by Zero Guard
- **File:** `server/solar_engine.ts` (calculateSolar)
- Added `sun_hours > 0` validation (was producing `Infinity` with zero sun hours)

#### P0.9 — Amper Engine: Multiple Fixes
- **File:** `server/amper_engine.ts`
- **Day/Night Split Bug:** Clamped `dayHours` to not exceed `abpe_hours` (was causing `day_wh + night_wh > total_wh`)
- **OFF_GRID Battery Oversizing:** Changed from total load to night load (consistent with solar engine)
- **Double Loss Application:** Removed redundant `/efficiency` division in `calculateSolar` (was already in `total_wh_after_losses`)
- **Division by Zero:** Added `sun_hours > 0` guard

#### P0.10 — Quote Snapshot Zero-Value Bug
- **File:** `server/services/quoteService.ts` (saveEngineeringSnapshot)
- Changed `|| null` → `?? null` for all engineering fields (was converting valid `0` values to `null`)

### 🧪 Testing

- Added Jest + ts-jest test framework
- **40 unit tests** covering:
  - `solar_engine.ts`: load profile, battery sizing, solar sizing, temp derating, battery life, full system integration
  - `amper_engine.ts`: profile calculation, battery sizing, solar sizing, day/night split, 30A system flow
- All 40 tests passing ✅

### 🔄 CI/CD

- Added `.github/workflows/ci.yml`:
  - TypeScript type checking
  - Unit tests with coverage threshold (50%)
  - Production build verification
  - Dependency security audit
- Added test scripts to `package.json`

### 📦 Package Cleanup
- Moved `vite` from `dependencies` → `devDependencies` (build tool, not runtime)
- Added `jest`, `ts-jest`, `@types/jest` to devDependencies
