# Context Memory — Booker Customer Allocation System Upgrade

## Overview

This document records key context, findings, file locations, and decisions during the Booker Customer Allocation System upgrade for `mos-lab`.

## Key Requirements

1. **R1: Batch Pending Accept Flow**:
   - `PENDING_ACCEPT` status with 24h countdown timer.
   - Customers remain unassigned/pending during 24h period.
   - Booker verification modal showing customer details (name, phone, source, care history).
   - "Chấp nhận toàn bộ" -> status `ACCEPTED`, assigns customers officially to Booker.
   - "Từ chối toàn bộ" -> status `DECLINED` with mandatory decline reason, returns customers to allocation pool.
   - Auto-expiration after 24h without action -> status `EXPIRED`, returns customers to allocation pool.

2. **R2: Strict Deduplication & Database Transaction**:
   - Backend & DB filtering: filter out customers already owned by Booker or currently in another `PENDING_ACCEPT` batch.
   - Prisma `$transaction` and unique constraints: exact $+N$ customer increase for Booker upon acceptance without duplicate IDs or count mismatches.

3. **R3: 30-Day History & Countdown Timer**:
   - Allocation History tab/screen for Booker & Admin/Manager.
   - Records batch ID, assigner (Admin/Manager), recipient (Booker), customer count, status (`PENDING_ACCEPT`, `ACCEPTED`, `DECLINED`, `EXPIRED`, `RECALLED`), decline reason, timestamp.
   - 30-day countdown badge on history records showing remaining retention time.

4. **R4: Allocation Audit Dashboard for Admin/Manager**:
   - Overview dashboard for Admin/Manager to monitor acceptance/decline/expired rates per Booker, decline reasons.
   - "Recall Batch" button for Admin/Manager to recall `PENDING_ACCEPT` batches -> `RECALLED` and return customers to allocation pool.

5. **Build Integrity**:
   - Ensure `pnpm build` passes with zero type errors.

## Key Workspace Locations

- Project Root: `/Users/dannydo/projects/mos-lab`
- Fastify API Routes: `/Users/dannydo/projects/mos-lab/apps/api/src/modules/`
- Prisma Schemas: `/Users/dannydo/projects/mos-lab/apps/api/prisma/`
- Frontend Pages & Components: `/Users/dannydo/projects/mos-lab/apps/web/app/dashboard/`, `/Users/dannydo/projects/mos-lab/apps/web/components/`
- Frontend Lib & Shared Types: `/Users/dannydo/projects/mos-lab/apps/web/lib/`, `/Users/dannydo/projects/mos-lab/packages/shared/`
- Guidelines & Rules: `/Users/dannydo/projects/mos-lab/.agents/AGENTS.md`, `/Users/dannydo/projects/mos-lab/AGENTS.md`
