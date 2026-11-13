# `/api/ios` Backend Module — AI Agent Guide

Modular Fastify backend powering the `/ios-app` consultation, service execution, upsell, and checkout workflow.

> **Hard File-Size Invariant**: Every `.ts` file inside `apps/api/src/modules/ios/` MUST remain **<= 550 lines** so AI agents can read any file in a single `read_file` call. All relative imports MUST end with `.js` (`NodeNext`). Never use forbidden terms or raw feather Unicode emojis; always use `CVL`, `CVLL`, `CC`, and `Chuyên Viên`.

---

## 1. Directory & Responsibility Map

```text
apps/api/src/modules/ios/
├── routes.ts                                 # Fastify route registration + re-exports for natural lash validators
├── mock-data.ts                              # INITIAL_BOOKINGS fixture used ONLY in explicit ?demo=1 mode
├── routes.test.ts                            # Node test runner suite (auth, math, atomic overrides, Live/Demo purity)
└── services/
    ├── db-pools.ts                           # Lazy MySQL pools (legacyPool, crmPool) + WeakSet-guarded onClose shutdown
    ├── ios-auth.service.ts                   # JWT + CrmStaff resolution -> IosAuthContext (careerTier: CVL|CVLL|CC|ADMIN)
    ├── ios-photos.service.ts                 # Base64 -> disk upload & GET /ios/photos/:filename static streaming
    ├── ios-overrides.service.ts              # Atomic per-booking (IOS_BK_OVR:<id>) & avatar (IOS_CUST_AVT:<id>) repo
    ├── ios-bookings-sql.service.ts           # Live Mode primary order + batch order_service / contact / visit queries
    ├── ios-customer-enrichment.service.ts    # Batch lash history (LIMIT 800), Combo Live, Under Mink & Diamond queries
    ├── ios-staff-stats.service.ts            # Live MySQL monthly stats (15s cache, 0-initialized) + Demo stats builder
    ├── ios-bookings-formatters.ts            # Avatar/time/phone formatters + shared financial & tip breakdown math
    ├── ios-bookings-mapper.service.ts        # Pure mappers: mapLiveOrdersToBookings, buildDemoModeBookings, CVL scope
    ├── ios-bookings-query.service.ts         # Orchestrates GET /ios/bookings (Live Mode vs ?demo=1 mode)
    └── ios-actions.service.ts                # Executes POST /ios/bookings state transitions with per-booking locks
```

---

## 2. Core Architectural Invariants

### A. Atomic Per-Booking Override Persistence (`IOS_BK_OVR:<bookingId>`)

- Never write all booking states into a single monolithic JSON blob. Concurrent check-ins or progress saves from two `Chuyên Viên` tablets will cause lost updates.
- Each booking writes atomically via `INSERT INTO crm_config ... ON DUPLICATE KEY UPDATE` under `IOS_BK_OVR:${bookingId}` (and customer avatars under `IOS_CUST_AVT:${customerId}`).
- **Backward Compatibility**: `loadBookingOverride` and `loadBookingOverridesBatch` transparently fall back to legacy `IOS_APP_LIVE_BOOKING_OVERRIDES` (and `IOS_APP_CUSTOMER_AVATARS`), overlaying atomic keys on top so zero in-flight data is lost.

### B. 100% Live Data Purity vs Explicit `?demo=1`

- **Live Mode (default, no `demo=1`)**:
  1. `targetDate` is strictly `query.date || todayVn` — never scan historical dates when today has 0 bookings.
  2. Never merge `INITIAL_BOOKINGS` mock records into Live Mode responses.
  3. Never fabricate historical lash dates when `lashHistoryMap` has no rows — return `[]`.
  4. Initialize `staffStats` to `0 đ` / `0` shifts and populate solely from real MySQL queries.
- **Demo Mode (`?demo=1` or `?demo=true`)**:
  - Serves `INITIAL_BOOKINGS` merged with `crm_config` overrides, `source: 'demo_mode'`, `demoMode: true`.

### C. Access Control & `CVL` Customer Privacy (Kinh Thánh mOS UI-010)

- Only `CVL`, `CVLL`, `CC`, and `ADMIN` (`canAccessIosConsultationApp`) may call `/api/ios/*`.
- Non-admin `CVL` accounts are strictly locked to `effectiveRole = 'CVL'`, `scope = 'MY_CUSTOMERS'`, masked phone numbers, and `filterBookingsForCvlScope` (their own assigned/checked-in/checked-out customers + any late unassigned `INCOMING` customers + all unassigned customers sharing the next upcoming time slot).
- `POST /ios/bookings` enforces `409 Conflict` if another `Chuyên Viên` already checked in a queue customer, and `403 Forbidden` if a `CVL` attempts to mutate another `Chuyên Viên`'s customer.

### D. Batch SQL Discipline (Zero Correlated Subqueries)

- `ios-bookings-sql.service.ts` fetches `order` rows for `targetDate` first, then runs parameterized `IN (?)` batch queries via `Promise.all` (`order_service`, `user_contact`, `total_visits`, `lashHistory` with `LIMIT 800`, `user_service_balance`, `user_balance`). Never add per-row correlated subqueries inside `SELECT FROM \`order\``.

---

## 3. 3-Step Recipe: Adding a New Booking Field or `POST` Action

1. **Shared Contract (`packages/shared/src/types/ios-app.ts`)**:
   Add the new DTO field, action union literal (`IosBookingActionType`), or pure calculation helper in `@mos-lab/shared`, then run `pnpm --filter @mos-lab/shared build`.
2. **Service Implementation (`apps/api/src/modules/ios/services/`)**:
   - For a new `POST` action: add a branch inside `executeIosBookingAction` in `ios-actions.service.ts` (mutating `nextOverride` inside `repo.withBookingLock`).
   - For a new read/mapped field: query in `ios-bookings-sql.service.ts` or `ios-customer-enrichment.service.ts` and map in `ios-bookings-mapper.service.ts` (both Live and Demo mappers).
3. **Unit Test & Verification (`routes.test.ts`)**:
   Add unit coverage in `apps/api/src/modules/ios/routes.test.ts`, verify `wc -l` stays `<= 550` lines per file, and run:
   ```bash
   pnpm --filter @mos-lab/api exec tsc --noEmit
   pnpm --filter @mos-lab/api exec tsx --test src/modules/ios/routes.test.ts
   ```
