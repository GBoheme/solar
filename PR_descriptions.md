# Pull Request Descriptions & Commit Messages

## Main PR: Security & Engineering Audit v1.1.0

### PR Title
`fix(security): Re-enable authentication, fix engineering bugs, add tests`

### PR Body
```markdown
## Summary
- Re-enabled authentication middleware (was disabled for development, exposing all endpoints)
- Fixed 6 critical engineering calculation bugs in solar_engine and amper_engine
- Fixed JWT refresh token vulnerability (was using jwt.decode instead of jwt.verify)
- Removed API key leak from client bundle
- Added 40 unit tests for both calculation engines
- Added GitHub Actions CI pipeline

## Security Fixes (P0)
- ✅ Authentication re-enabled with centralized middleware guard
- ✅ JWT refresh: decode→verify (prevents token forgery)
- ✅ Removed stack trace from error responses
- ✅ Removed GEMINI_API_KEY from Vite client bundle
- ✅ Strict CORS with configurable origins (removed dev bypass)
- ✅ Restored Bearer token in apiFetch + auto-refresh
- ✅ Added admin role guard on delete operations
- ✅ Added audit logging on quote/client deletion

## Engineering Fixes (P0)
- ✅ Division by zero guard (sun_hours=0) in both engines
- ✅ Amper engine: day/night split invariant (day_wh + night_wh = total_wh)
- ✅ Amper engine: OFF_GRID battery sizing aligned with solar_engine
- ✅ Amper engine: removed double loss application in calculateSolar
- ✅ Quote snapshots: preserved zero values (|| → ??)

## Test Plan
- [x] TypeScript: 0 errors
- [x] Vite build: SUCCESS
- [x] 40 unit tests: ALL PASSING
- [x] Verify auth: non-public endpoints return 401 without token
- [x] Verify admin guard: non-admin users blocked from /api/admin/*
- [ ] Manual: Login flow works (login → refresh → protected routes)
- [ ] Manual: Quote creation with snapshot verification
- [ ] Manual: Amper engine 30A calculation produces reasonable values

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## Suggested Commit Messages

### Commit 1: Security Fixes
```
fix(auth): Re-enable authentication middleware on all sensitive endpoints

- Uncomment requireAuth/requireRole imports
- Remove hardcoded admin user injection (direct access mode)
- Add centralized auth middleware for /api/* routes
- Add admin role guard for /api/admin/*, exchange-rate, default-margin
- Fix jwt.decode→jwt.verify on refresh/logout endpoints
- Remove stack trace from amper-quote error response
- Add audit logging on quote/client deletion

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### Commit 2: Secret & Config Fixes
```
fix(security): Remove API key leak, harden CORS and security middleware

- Remove GEMINI_API_KEY injection from Vite client bundle
- Strict CORS policy with CORS_ORIGINS env var (remove dev bypass)
- Add CSP headers via Helmet in production mode
- Increase rate limit (100→300) to support SPA dashboard
- Fix duplicate express.json() body parser
- Update .env.example with JWT secrets and CORS config
- Restore Bearer token in apiFetch with auto-refresh

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### Commit 3: Engineering Fixes
```
fix(engine): Guard division-by-zero, fix amper day/night split and battery sizing

- solar_engine: Add sun_hours > 0 validation in calculateSolar
- amper_engine: Clamp dayHours to not exceed abpe_hours
- amper_engine: OFF_GRID battery sizing uses night load (not total)
- amper_engine: Remove double loss application in calculateSolar
- quoteService: Fix || null → ?? null for engineering snapshot zero values

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### Commit 4: Tests & CI
```
test: Add 40 unit tests for solar and amper engines, setup CI pipeline

- Add jest + ts-jest test framework
- 27 tests for solar_engine (load profile, battery, solar, temp, ROI)
- 15 tests for amper_engine (profile, battery, solar, 30A flow)
- Add GitHub Actions CI: lint, test, build, security audit
- Add test scripts to package.json
- Move vite from dependencies to devDependencies

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```
