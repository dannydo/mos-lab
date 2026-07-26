# Subagent Handoff Report: R4 — Security & Data Integrity Risk Assessment for Catalog Management

**Working Directory**: `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_r4`  
**Date**: 2026-07-26  
**Status**: Completed (Hard Handoff)

---

## 1. Observation

### 1.1 Backend Authorization & Middleware

- **File**: `apps/api/src/middlewares/auth.ts`
  - `requireAuth` (lines 21–52): Validates JWT payload via `request.jwtVerify()`, sets `request.user`, and updates `lastActiveAt` in `fastify.prisma.crm.crmStaff` with 60-second throttling. Returns `401 Unauthorized` if token missing/invalid.
  - `requireRole` (lines 54–70): Takes `allowedRoles: UserRole[]` (e.g., `['admin']`). Validates `request.user`. Returns `401 Unauthorized` if `request.user` missing, or `403 Forbidden` with message `Role "${user.role}" does not have permission to access this resource` if `allowedRoles.includes(user.role)` is false.
- **Role System**: `apps/api/src/modules/roles/routes.ts` enforces `requireAuth` + `requireRole(['admin'])` on sensitive endpoints like role creation, update, and deletion (lines 47, 132, 224).

### 1.2 Frontend Route Guard & Sidebar Structure

- **File**: `apps/web/app/dashboard/layout.tsx`
  - User identity retrieved from `localStorage.getItem('mos_user')` and background sync `apiClient.auth.me()` (lines 282–313).
  - Sidebar Menu Visibility (lines 100–104 & 135–137): `userRole === 'admin'` dynamically filters menu items. Currently `staff` ('Nhân sự (HR)') is hidden for non-admins.
  - Route Guarding: Pages currently lack route wrapper guards; navigation relies on layout menu hiding and server API returns.

### 1.3 Database Architecture & Rules

- **Rule in `AGENTS.md`** (lines 49–51) & `.agents/AGENTS.md`:
  - `fastify.prisma.crm`: Database `mos_lab` for CRM data (CRUD allowed).
  - `fastify.prisma.legacy`: Database `management` for Legacy CRM data (**READ-ONLY**).
- **Prisma Schema Inspection**:
  - `apps/api/prisma/legacy.prisma` defines master tables in `management` DB:
    - `service` (lines 119–151): Master catalog items (`id`, `client_id`, `service_key`, `service_type`, `duration_minute`, `is_disabled`, etc.).
    - `service_language` (lines 153–161): Multilingual catalog descriptions (`id`, `language_id`, `service_id`, `service_name`, etc.).
    - Transactional tables: `order`, `order_service`, `user`, `user_profile`, `user_service_balance`.

---

## 2. Logic Chain

```
[Observation 1.1: Backend Middleware]
  └── requireAuth + requireRole(['admin']) enforces 401/403 at Fastify layer
       └── CONCLUSION 1: Standardized 3-tier admin defense for Catalog API routes

[Observation 1.2: Frontend Navigation & Page Guarding]
  └── Sidebar hides admin items; direct page access requires explicit AdminGuard check
       └── CONCLUSION 2: Tier 2 (Page Guard) + Tier 3 (Sidebar Menu) complete 3-Tier Security

[Observation 1.3: Legacy Database Rule vs Catalog Location]
  └── Catalog tables (service, service_language) reside exclusively in legacy `management` DB
       └── Logical Deduction: Writing catalog updates via CRM requires mutating `management` DB
       └── Risk Mitigation: Restrict writes ONLY to catalog metadata tables; preserve strict READ-ONLY on transactional history (order, user_service_balance)
       └── CONCLUSION 3: Reconcile AGENTS.md with a explicit Catalog Exception Rule

[Observation 1.3 & Schema Dependencies]
  └── Service mutation spans multiple tables (service + service_language)
       └── Risk: Partial failures create orphan records
       └── CONCLUSION 4: Mandatory Prisma $transaction usage for multi-table catalog updates
```

### Step-by-Step Reasoning:

1. **3-Tier Admin Access Control Audit**:
   - **Tier 1 (Backend Middleware)**: All `/api/catalog/*` mutating routes (`POST`, `PUT`, `DELETE`) and admin view routes MUST register `preHandler: [requireAuth, requireRole(['admin'])]`.
   - **Tier 2 (Frontend Route Guard)**: A dedicated `AdminGuard` component or hook in `apps/web` must verify `user?.role === 'admin'`. If unauthorized, redirect to `/dashboard/today` or render an Antd `403 Result`.
   - **Tier 3 (Sidebar Visibility)**: In `apps/web/app/dashboard/layout.tsx`, wrap the catalog navigation item in `if (userRole === 'admin')`.

2. **Legacy DB READ-ONLY Rule Reconciling & Exception Framework**:
   - _Conflict_: `AGENTS.md` marks `fastify.prisma.legacy` as **READ-ONLY**. However, service catalog tables (`service`, `service_language`, `service_price`) are stored in `management` DB.
   - _R4 Assessment_: Catalog tables are **Master Metadata**, whereas `order`, `order_service`, `user_profile`, `staff_bonus` are **Transactional/Financial Records**.
   - _Reconciliation_: Update `AGENTS.md` Rule #3 with an explicit exception:
     > `fastify.prisma.legacy`: Database `management` for Legacy CRM data is **READ-ONLY** for transactional/historical tables (`order`, `order_service`, `user`, `user_profile`, `staff_bonus`, `user_service_balance`).  
     > **Catalog Exception**: Writing to catalog tables (`service`, `service_language`, `service_price`, `product`) via `fastify.prisma.legacy` is **ALLOWED** exclusively via Catalog Management endpoints, protected by `requireRole(['admin'])` and executed inside `$transaction`.

3. **Concurrency & Race Conditions Assessment**:
   - _Risk 1 (Simultaneous Price Update & Order Creation)_: Legacy WingsLashes PHP application creates an order while CRM API updates `service_price`.
   - _Risk 2 (Duplicate `service_key` / `package_key` Collisions)_: Concurrent insertion of duplicate keys.
   - _Risk 3 (Soft Delete vs In-Flight Bookings)_: Admin deactivates service (`is_disabled = true`) while a customer is booking in legacy app.
   - _Mitigation_: Enforce `service_key` uniqueness checks prior to creation, use soft deletion (`is_disabled = true`), and avoid hard `DELETE` queries.

4. **Prisma `$transaction` Multi-Table Safety**:
   - Updating catalog involves creating/updating `service` + `service_language`. Without transactions, a failure in `service_language` leaves an orphan `service` row.
   - All catalog operations MUST be wrapped in `fastify.prisma.legacy.$transaction(async (tx) => { ... })`.

---

## 3. Caveats

1. **Legacy Database Locks**: MySQL MyISAM vs InnoDB storage engines on legacy tables. If legacy tables use MyISAM, row-level locking is unavailable and table-level locks could block concurrent legacy app writes during long transactions.
2. **Schema Drift**: `apps/api/prisma/legacy.prisma` must be kept in sync with actual legacy DB migrations via `pnpm --filter @mos-lab/api prisma:db:pull:legacy`.
3. **WingsLashes Caching**: If the WingsLashes PHP app caches service definitions in Redis or APCu, database updates in Fastify won't invalidate legacy cache until TTL expires or a cache clear signal is dispatched.

---

## 4. Conclusion & Concrete Implementation Blueprint

### 4.1 Backend Route Pattern (`apps/api/src/modules/catalog/routes.ts`)

```typescript
import { FastifyInstance } from 'fastify';
import { requireAuth, requireRole } from '../../middlewares/auth.js';

export async function catalogRoutes(fastify: FastifyInstance) {
  // GET /api/catalog/services (Authenticated staff read access)
  fastify.get('/catalog/services', { preHandler: [requireAuth] }, async (request, reply) => {
    return fastify.prisma.legacy.service.findMany({
      where: { is_disabled: false },
      orderBy: { position: 'asc' },
    });
  });

  // POST /api/catalog/services (Admin Only + Transactional Safety)
  fastify.post('/catalog/services', { preHandler: [requireAuth, requireRole(['admin'])] }, async (request, reply) => {
    const { serviceKey, serviceName, serviceType, serviceGroup, durationMinute, description } = request.body as any;

    return fastify.prisma.legacy.$transaction(async (tx) => {
      // 1. Uniqueness check
      const existing = await tx.service.findFirst({ where: { service_key: serviceKey } });
      if (existing) {
        throw new Error(`Service key "${serviceKey}" already exists`);
      }

      // 2. Insert master service
      const newService = await tx.service.create({
        data: {
          client_id: 1,
          client_business_id: 1,
          service_key: serviceKey,
          service_type: serviceType,
          service_group: serviceGroup,
          duration_minute: durationMinute,
          duration_minute_standard: durationMinute,
          profile_attribute_set_id: 1,
          customer_survey_set_id: 1,
          staff_survey_set_id: 1,
          remind_interval_day: 30,
          last_day_required: 0,
          position: 0,
          is_temporary: false,
          is_disabled: false,
          date_created: new Date(),
        },
      });

      // 3. Insert multilingual description
      await tx.service_language.create({
        data: {
          language_id: 1,
          service_id: newService.id,
          service_name: serviceName,
          service_description: description,
        },
      });

      return newService;
    });
  });
}
```

### 4.2 Frontend Admin Guard Pattern (`apps/web/components/AdminGuard.tsx`)

```tsx
'use client';

import React from 'react';
import { Result, Button } from 'antd';
import { useRouter } from 'next/navigation';

export default function AdminGuard({ userRole, children }: { userRole?: string; children: React.ReactNode }) {
  const router = useRouter();

  if (userRole !== 'admin') {
    return (
      <Result
        status="403"
        title="403"
        subTitle="Bạn không có quyền truy cập trang Quản lý Danh mục."
        extra={
          <Button type="primary" onClick={() => router.push('/dashboard/today')}>
            Về Trang Chủ
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
```

---

## 5. Verification Method

### 5.1 Command Line Verification

```bash
# 1. Type check and build shared package
pnpm --filter @mos-lab/shared build

# 2. Run lint checks across workspace
pnpm lint

# 3. Build workspace targets
pnpm build
```

### 5.2 Security & Integrity Inspection Points

1. **Middleware Verification**: Ensure `preHandler: [requireAuth, requireRole(['admin'])]` is attached to all mutating catalog endpoints. Test via HTTP request with non-admin JWT token to confirm HTTP `403 Forbidden` response.
2. **Transaction Integrity Verification**: Simulate DB failure in `service_language` insertion during service creation; confirm that `service` table creation is automatically rolled back in `management` DB.
3. **Sidebar & Route Guard Verification**: Log in as a `telesales` or `cc` user; verify catalog sidebar item is hidden and navigating directly to `/dashboard/catalog` displays the 403 error result.
