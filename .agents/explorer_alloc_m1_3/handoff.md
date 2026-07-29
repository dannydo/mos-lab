# Frontend Booker Customer Allocation System Audit & Component Architecture Handoff Report

## 1. Observation

### 1.1 Shared Type Conventions (`packages/shared/src/types/`)

- **File Structure & Re-exports**: Shared types are defined in domain-specific files under `packages/shared/src/types/` and re-exported in `packages/shared/src/index.ts` (lines 1-19).
- **Existing Allocation DTOs** (`packages/shared/src/types/customer.ts`):
  - `AssignmentHistoryItem` (lines 95-115): Contains `id`, `batchId`, `staffId`, `staffName`, `allocatedBy`, `customerCount`, `actionType`, `sourceType`, `sourceFilterSummary`, `createdAt`, `expiredAt`, `isUndone`.
  - `AssignmentHistoryResponse` (lines 117-121): `{ history: AssignmentHistoryItem[]; total: number }`.
  - `RevokePreviewResponse` (lines 129-136): `{ totalCount: number; unassignedCount: number; assignedCount: number; staffBreakdown: ... }`.
  - `CustomerAssignmentTimelineItem` (lines 138-149): Tracks assignment timeline per customer.
- **Existing Booker Performance DTOs** (`packages/shared/src/types/bk.ts`):
  - `BkBookingRecord`, `BkBookingLeaderboardEntry`, `BkSalaryConfig`, `BkConfigResponse` (lines 1-262).

### 1.2 API Client SDK Structure (`apps/web/lib/api-client.ts`)

- `apiClient` singleton standardizes HTTP interactions with Axios backend (`apps/web/lib/api.ts`).
- Sub-objects group domain endpoints:
  - `apiClient.customers`: `assign` (lines 280-291), `revoke` (lines 292-305), `unassign` (lines 309-315), `getAssignmentHistory` (lines 331-333), `getAssignmentHistoryDetails` (lines 334-338), `undoAssignment` (lines 339-351).
  - `apiClient.bk`: `getBookingLeaderboard` (lines 903-905), `getDoneLeaderboard` (lines 911-913), `getPaystub` (lines 935-938), `getConfig` (lines 939-942), `saveConfig` (lines 943-950).

### 1.3 Routing & Component Placement

- **Layout Header** (`apps/web/app/dashboard/layout.tsx`): Header bar includes theme toggle, avatar dropdown, OmiCall status, and daily calls drawer trigger (lines 537-591).
- **Customer Directory & Assignment Actions** (`apps/web/app/dashboard/customers/`):
  - `page.tsx`: Primary customer grid with tab presets (lines 148-177).
  - `hooks/useCustomerAssignment.ts`: Handles bulk allocation via `apiClient.customers.assign` (lines 20-75).
  - `components/AssignmentHistoryDrawer.tsx`: Admin view for assignment batch logs (lines 47-200).
  - `components/RevokeAssignmentModal.tsx`: Admin modal for revoking or re-transferring customer data (lines 49-118).
- **Booker Dashboard** (`apps/web/app/dashboard/bk/page.tsx`):
  - Tabs: `BK Booking`, `BK Done`, `BK Tip`, `BK Doanh Thu`, `BK Thu Nhập` (lines 143-189).

---

## 2. Logic Chain

1. **Requirement Alignment**:
   - The upgrade introduces a **24-hour Verification Window** where allocated batches require explicit Booker acceptance or decline (with mandatory reason).
   - Accepted batches are retained for 30 days before automatic expiration / pool recycling.
   - Admins/Managers require an Audit Dashboard to track acceptance, decline, and 24h expiration rates per Booker.

2. **DTO & Shared Types Extension Strategy**:
   - We must define dedicated interfaces in `packages/shared/src/types/allocation.ts` (or extend `customer.ts` and `bk.ts`):
     ```typescript
     export type AllocationBatchStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

     export interface CustomerAllocationBatch {
       id: number;
       batchId: string;
       bookerId: number;
       bookerName: string;
       allocatedById: number;
       allocatedByName: string;
       totalCount: number;
       status: AllocationBatchStatus;
       allocatedAt: string;
       verificationExpiresAt: string; // 24h countdown target
       acceptedAt?: string | null;
       declinedAt?: string | null;
       declineReasonCategory?: string | null;
       declineReasonNote?: string | null;
       autoRevokedAt?: string | null;
       retentionExpiresAt?: string | null; // 30d countdown target
     }

     export interface CustomerAllocationItem {
       id: number;
       batchId: string;
       customerId: number;
       customerName: string;
       customerPhone: string;
       bucket: string;
       totalSpent: number;
       daysSinceLastVisit: number;
       assignedAt: string;
       status: AllocationBatchStatus;
     }

     export interface AllocationAuditStatsResponse {
       summary: {
         totalBatches: number;
         totalCustomers: number;
         acceptedCount: number;
         acceptedRate: number;
         declinedCount: number;
         declinedRate: number;
         expiredCount: number;
         expiredRate: number;
       };
       bookerBreakdown: Array<{
         bookerId: number;
         bookerName: string;
         avatar?: string | null;
         totalBatches: number;
         totalCustomers: number;
         acceptedCount: number;
         declinedCount: number;
         expiredCount: number;
         acceptanceRate: number;
         avgResponseMinutes: number;
       }>;
       declineReasonBreakdown: Array<{
         category: string;
         count: number;
         percentage: number;
       }>;
     }
     ```

3. **API SDK Extension Strategy (`apiClient.allocation`)**:
   - Extend `apps/web/lib/api-client.ts` with typed namespace:
     ```typescript
     allocation: {
       getPendingBatches: async (): Promise<CustomerAllocationBatch[]> => {
         const response = await api.get('/allocation/pending');
         return response.data;
       },
       getBatchDetails: async (batchId: string): Promise<{ batch: CustomerAllocationBatch; customers: CustomerAllocationItem[] }> => {
         const response = await api.get(`/allocation/batches/${batchId}`);
         return response.data;
       },
       acceptBatch: async (batchId: string): Promise<{ success: boolean; message: string; count: number }> => {
         const response = await api.post(`/allocation/batches/${batchId}/accept`);
         return response.data;
       },
       declineBatch: async (data: { batchId: string; reasonCategory: string; reasonNote?: string }): Promise<{ success: boolean; message: string }> => {
         const response = await api.post(`/allocation/batches/${data.batchId}/decline`, data);
         return response.data;
       },
       get30DayHistory: async (params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<{ items: CustomerAllocationBatch[]; total: number }> => {
         const response = await api.get('/allocation/history-30d', { params });
         return response.data;
       },
       getAuditStats: async (params?: { dateFrom?: string; dateTo?: string; bookerId?: number }): Promise<AllocationAuditStatsResponse> => {
         const response = await api.get('/allocation/audit-stats', { params });
         return response.data;
       },
       revokeBatch: async (data: { batchId: string; reason: string }): Promise<{ success: boolean; count: number }> => {
         const response = await api.post(`/allocation/batches/${data.batchId}/revoke`, data);
         return response.data;
       },
     }
     ```

4. **Component Architecture & Detailed UI Specification**:

   - **A. Booker Pending Allocation Verification Modal (`PendingAllocationModal.tsx`)**:
     - **Location**: Triggered globally upon Booker login or accessing `/dashboard/customers?assignedStaffId=me` / `/dashboard/today` via header alert badge in `DashboardLayout`.
     - **Visual Highlights**:
       - 24h Live Countdown Tag using `tabular-nums` CSS (`font-variant-numeric: tabular-nums`): e.g. `⏳ Còn 22:14:05 để phản hồi`. Color transitions from Warning (`#D4A84B`) to Danger (`#FF4D4F`) when remaining time < 2h.
       - Batch metadata: Assigning Manager name, total count (`X KH`), allocation timestamp.
       - Customer Batch Preview Table: AntD `<Table>` with pagination, showing `clientName`, `clientPhone`, `bucket` Tag (`COMBO_LIVE`, `SINGLE`, `NYC`), `daysSinceLastVisit`, `totalSpent` (formatted in VND).
     - **Actions**:
       - `Chấp nhận toàn bộ` button: Primary green (`bg-emerald-600 hover:bg-emerald-700`). Calls `apiClient.allocation.acceptBatch(batchId)`.
       - `Từ chối toàn bộ` button: Danger button (`danger`). Triggers inner `DeclineReasonModal`.
     - **Mandatory Decline Reason Modal (`DeclineReasonModal.tsx`)**:
       - Mandatory Reason Select: `PRESET_DECLINE_REASONS` (e.g. "Quá tải danh sách KH hiện tại", "Khách thuộc khu vực/chi nhánh không phù hợp", "Data không khớp tiêu chuẩn telesales", "Khác (Nhập lý do)").
       - Required textarea `reasonNote` when "Khác" is selected. Submit disabled until validated.

   - **B. 30-Day Allocation History Screen (`AllocationHistoryScreen.tsx`)**:
     - **Location**: New Tab in `/dashboard/customers` or `/dashboard/bk` ("Lịch sử 30 Ngày").
     - **Visual Highlights**:
       - 30-Day Retention Badge per batch: `⏱️ Hạn giữ data: còn 14 ngày 08 giờ`.
       - Filter Bar: Quick status filters (`ALL`, `PENDING`, `ACCEPTED`, `DECLINED`, `EXPIRED`), Search input.
       - Status Tags:
         - `PENDING`: Yellow/Gold badge (`Chờ xác nhận 24h`).
         - `ACCEPTED`: Emerald Green badge (`Đã nhận`) + 30-day countdown timer.
         - `DECLINED`: Red/Volcano badge (`Đã từ chối`) + Decline reason tooltip.
         - `EXPIRED`: Magenta/Purple badge (`Hết hạn 30 ngày - Đã thu hồi`).
       - Expandable detail view: Displays customer table inside batch.

   - **C. Admin/Manager Allocation Audit Dashboard (`AllocationAuditDashboard.tsx`)**:
     - **Location**: New Tab in `/dashboard/bk` ("Audit Phân Bổ Data") or `/dashboard/kpi`.
     - **Visual Highlights**:
       - Metric Summary Cards (4 Cards):
         1. `Tổng Batch / KH Phân Bổ`: Count of total batches and customer records.
         2. `Tỷ Lệ Chấp Nhận (%)`: Acceptance rate with green progress indicator.
         3. `Tỷ Lệ Từ Chối (%)`: Decline rate with red alert indicator.
         4. `Tỷ Lệ Trôi 24h / Hết Hạn 30d (%)`: Expired rate with purple tag.
       - Booker Performance Audit Table:
         - Booker Name & Avatar, Total Batches, Accepted Count (% rate), Declined Count (% rate), Expired Count (% rate), Average Verification Response Time (minutes).
       - Decline Reason Distribution Card:
         - Categorized breakdown of decline reasons with count & percentage bars.
       - Quick Action (`Thu hồi Batch` Button):
         - Allows Admin to force-revoke any pending or accepted batch with mandatory audit note (`apiClient.allocation.revokeBatch`).

---

## 3. Caveats

- Backend routes for `/api/allocation/*` are currently in design phase. The SDK and frontend components designed here will seamlessly connect once backend endpoints are available.
- Real-time countdowns rely on client-side interval timers paired with server-provided `verificationExpiresAt` ISO timestamps to avoid drift across timezone changes.

---

## 4. Conclusion

- The audited codebase exhibits clear monorepo architecture, strongly typed SDK patterns (`@mos-lab/shared` + `apiClient`), Ant Design 5 + Tailwind CSS v4 styling rules, and established modal/drawer patterns.
- The proposed 3-component architecture fulfills all user requirements for 24h verification countdowns, mandatory decline reasons, 30-day history retention tracking, and admin audit dashboards.

---

## 5. Verification Method

### 5.1 Verification Commands

- Check TypeScript build & shared types export:
  ```bash
  pnpm --filter @mos-lab/shared build
  ```
- Run typecheck on web app:
  ```bash
  pnpm --filter @mos-lab/web lint
  ```

### 5.2 Key Files to Inspect

- `packages/shared/src/types/bk.ts`
- `packages/shared/src/types/customer.ts`
- `apps/web/lib/api-client.ts`
- `apps/web/app/dashboard/layout.tsx`
- `apps/web/app/dashboard/customers/page.tsx`
- `apps/web/app/dashboard/bk/page.tsx`

### 5.3 Invalidation Conditions

- Any hardcoded color overrides for Dark Theme without `.light-theme`/`.dark-theme` scoping.
- Countdown numbers rendered without `tabular-nums` styling causing UI jitter.
