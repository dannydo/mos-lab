---
request_feedback: false
status: approved
branch: main
base: origin/main
---

# Commit review — mOS feature request workflow

## Danh sách file thay đổi

### Review artifact

- `commit_review.md`

### CRM schema, migration và API

- `apps/api/prisma/crm.prisma`
- `apps/api/prisma/migrations/20260831203000_add_feature_request_workflow/migration.sql`
- `apps/api/src/modules/bug-reports/bug-report.service.ts`
- `apps/api/src/modules/bug-reports/bug-report.service.test.ts`
- `apps/api/src/modules/bug-reports/routes.ts`

### Shared contracts và Agent Bridge

- `packages/shared/src/types/bug-report.ts`
- `scripts/bug-agent.ts`
- `scripts/bug-agent.test.ts`

### mOS Inbox và form phản hồi

- `apps/web/app/dashboard/bug-reports/page.tsx`
- `apps/web/app/dashboard/bug-reports/bug-report-presenters.tsx`
- `apps/web/app/dashboard/bug-reports/hooks/useBugReports.ts`
- `apps/web/app/dashboard/bug-reports/components/BugReportResolutionTracking.tsx`
- `apps/web/app/dashboard/bug-reports/components/FeatureRequestDetails.tsx`
- `apps/web/components/bug-reports/BugReportConversation.tsx`
- `apps/web/components/bug-reports/BugReportProfileControl.tsx`
- `apps/web/components/bug-reports/BugReportSurface.tsx`
- `apps/web/components/bug-reports/BugReportWorkflowGuide.tsx`
- `apps/web/components/bug-reports/MyBugReportsPanel.tsx`
- `apps/web/components/bug-reports/bug-report-drafts.ts`
- `apps/web/components/bug-reports/bug-report-drafts.test.ts`
- `apps/web/config/sidebar.config.tsx`

## Tóm tắt thay đổi

- Mở rộng Bug Inbox thành **mOS Inbox**, hỗ trợ hai loại yêu cầu độc lập: báo lỗi `MOS-BUG-*` và yêu cầu chức năng `MOS-FEAT-*`.
- Thêm form yêu cầu chức năng có cấu trúc gồm nhu cầu, lý do, nhóm người sử dụng và kết quả mong muốn; giữ nguyên khả năng đính kèm tối đa ba ảnh.
- Tách hoàn toàn draft nội dung, ảnh upload và trạng thái xử lý ảnh giữa tab Báo lỗi và Yêu cầu chức năng; gửi một loại chỉ reset draft của loại đó.
- Thêm workflow trực quan: người dùng gửi nhu cầu → AI Agent làm rõ → Danny quyết định sản phẩm → Agent triển khai/kiểm thử → người dùng nghiệm thu.
- Áp dụng gate backend nghiêm ngặt: yêu cầu chức năng chỉ được duyệt khi Agent đánh dấu `READY`, và Agent chỉ được triển khai sau khi Danny `APPROVED`.
- Mở rộng Agent Bridge, notification, timeline, trạng thái, bộ lọc và thống kê để hiểu đúng loại yêu cầu và nội dung nghiệp vụ riêng của feature.
- Thêm test cho mã `MOS-FEAT`, chuẩn hóa feature context, clarification gate và việc cô lập draft/ảnh giữa hai tab.
- Giữ UI responsive, accessible và tuân theo design system hiện có; đã kiểm tra desktop và điện thoại.

## Production migration plan

### CRM schema changes

1. `20260831203000_add_feature_request_workflow`
   - Thêm `crm_bug_reports.request_type VARCHAR(16) NOT NULL DEFAULT 'BUG'`.
   - Thêm `crm_bug_reports.request_metadata_json LONGTEXT NULL` để lưu reason, audience và desired outcome của yêu cầu chức năng.
   - Thêm index `bug_request_type_status_idx(request_type, status_sort, priority_sort, created_at)` cho lọc và sắp xếp mOS Inbox.
   - Expected data effect: mọi ticket lịch sử tự nhận `request_type = 'BUG'`; metadata lịch sử giữ `NULL`; không xóa, rename hoặc rewrite dữ liệu hiện có.
   - Production phải áp dụng bằng guarded `schema:apply:crm`/`prisma db push` không có `--accept-data-loss`; không dùng `prisma migrate deploy` hoặc `prisma migrate resolve`.

### Pending production data migrations

- **None.** Không có file mới trong `apps/api/src/scripts/data-migrations/` so với `origin/main`; schema default đã phân loại an toàn toàn bộ ticket lịch sử là Bug.

### Migration inventory result

- `bash scripts/deploy/migration-plan.sh origin/main`: phát hiện 2 schema files ở trên và **không có** production data migration mới.
- `pnpm --filter @mos-lab/api data-migrations:validate`: thành công; 16 production data migration modules hiện có đều hợp lệ.

## Verification

- `pnpm --filter @mos-lab/shared build` ✅
- `pnpm --filter @mos-lab/api build` ✅
- `pnpm --filter @mos-lab/web build` ✅
- API và Web TypeScript `--noEmit` ✅
- Scoped API/Web ESLint ✅
- Bug Report service + Agent CLI tests ✅ — 14/14.
- Draft isolation tests ✅ — 2/2; xác nhận nội dung và ảnh của Bug/Feature độc lập, reset đúng draft vừa gửi.
- UI contract ✅ — 498 source files scanned.
- `git diff --check` ✅
- Local CRM schema status ✅ — up to date.
- Local Web/API health check ✅ — HTTP 200.
- Browser QA desktop/mobile ✅ — form, workflow, approval gate và chuyển tab draft hoạt động đúng; không tạo ticket QA.

## Commit message đề xuất

```text
feat(mos-inbox): add feature request approval workflow

- Add structured feature requests with AI clarification and Danny approval gates
- Separate bug and feature drafts, uploads, tracking, notifications, and Agent keys
- Add additive CRM schema fields and verified desktop/mobile workflows

AI-assisted. Reviewed and verified.
```

## Approval

- Approved by Danny with **Go** on 31/08/2026.
- Workflow may stage the reviewed worktree, commit and push `main`.
- Sau khi CI pass, deployment VPS vẫn cần một xác nhận riêng.
