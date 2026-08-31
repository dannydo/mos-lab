---
request_feedback: false
status: approved
branch: main
base: origin/main
---

# Commit review — Bug Inbox tracking & AI resolution workflow

## Danh sách file thay đổi

### Review artifact

- `commit_review.md`

### CRM schema & API

- `apps/api/prisma/crm.prisma`
- `apps/api/prisma/migrations/20260831100000_upgrade_bug_inbox_tracking/migration.sql`
- `apps/api/src/modules/bug-reports/bug-report.service.ts`
- `apps/api/src/modules/bug-reports/bug-report.service.test.ts`
- `apps/api/src/modules/bug-reports/routes.ts`
- `apps/api/src/modules/bug-reports/routes.test.ts`

### Shared contracts, Agent CLI & Web SDK

- `packages/shared/src/types/bug-report.ts`
- `scripts/bug-agent.ts`
- `apps/web/lib/api-client.ts`

### Bug Inbox UI

- `apps/web/app/dashboard/bug-reports/page.tsx`
- `apps/web/app/dashboard/bug-reports/bug-report-presenters.tsx`
- `apps/web/app/dashboard/bug-reports/hooks/useBugReports.ts`
- `apps/web/components/bug-reports/BugReportSurface.tsx`
- `apps/web/components/bug-reports/MyBugReportsPanel.tsx`
- `apps/web/components/bug-reports/useMyBugReports.ts`
- `apps/web/components/ui/MetricGrid.tsx`
- `apps/web/components/ui/__tests__/ui-primitives.test.tsx`
- `apps/web/app/globals.css`

### Related dashboard UI already present in the worktree

- `apps/web/app/dashboard/customers/components/CustomerFilters.tsx`
- `apps/web/app/dashboard/customers/components/filters/ActiveFilterTags.tsx`
- `apps/web/app/dashboard/customers/components/filters/SavedFilterDropdown.tsx`
- `apps/web/app/dashboard/customers/page.tsx`
- `apps/web/app/dashboard/nyc/page.tsx`
- `apps/web/app/dashboard/today/page.tsx`

## Tóm tắt thay đổi

- Hiển thị avatar người báo trong Bug Inbox và detail drawer; bổ sung tracking rõ thời điểm báo, Danny duyệt, Agent bắt đầu, gửi bản sửa và đóng ticket.
- Thêm mục **Lỗi của tôi** ngay trong popup báo lỗi với danh sách tối giản, trạng thái, thời gian chờ/xử lý và link mở bản đã sửa.
- Khi Agent gửi bản sửa, hệ thống lưu resolution có cấu trúc, tạo notification cho người báo và cho phép người báo xác nhận đóng hoặc mở lại; Admin/Super Admin có quyền override đóng với audit đầy đủ.
- Bổ sung kho tri thức resolution cho Agent: bundle trả về tối đa 5 case tương tự; CLI tạo `resolution.json`, tải `similar-resolutions.json` và hỗ trợ `pnpm bug:agent --fixed`.
- Bổ sung metric **Đã đóng** lấy từ count `CLOSED` phía API; mở rộng `MetricGrid` responsive từ 4 lên 5 cột.
- Chuẩn hóa footer popup báo lỗi, vị trí nút lịch sử, thumbnail ảnh paste và card lịch sử theo hướng tối giản.
- Tách presenter/status/attachment khỏi `page.tsx`, đưa trang Bug Inbox từ 1.009 xuống 870 dòng để đạt UI architecture gate.
- Giữ kèm các chỉnh UI đang có trong worktree: gom nhóm toolbar/filter khách hàng, compact active filter tags, sửa nhãn Today header, cursor/column title của NYC và CSS responsive tương ứng.

## Production migration plan

### CRM schema changes

1. `20260831100000_upgrade_bug_inbox_tracking`
   - Thêm cột nullable `crm_bug_reports.started_at`.
   - Tạo bảng `crm_bug_report_resolutions` để lưu problem summary, root cause, solution, verification, changed files, commit và release URL theo từng ticket.
   - Tạo bảng `crm_bug_report_notifications` để gửi và theo dõi thông báo duyệt bản sửa cho người báo.
   - Tạo unique/index/foreign key cần thiết; các quan hệ con dùng cascade khi ticket hoặc nhân viên bị xóa.
   - Expected data effect: **không backfill và không sửa dữ liệu ticket hiện hữu**; cột mới là nullable, hai bảng mới bắt đầu rỗng.

### Production data migrations

- **None.** `bash scripts/deploy/migration-plan.sh origin/main` không phát hiện file mới trong `apps/api/src/scripts/data-migrations/`.
- `pnpm --filter @mos-lab/api data-migrations:validate` đã validate thành công 14 migration module hiện hữu; không có migration ID hoặc data effect mới trong commit này.

### Safety

- Schema change là additive; không drop/rename cột và không cần `--accept-data-loss`.
- Production phải dùng `scripts/deploy-production.sh` với guarded `prisma db push`; không dùng `prisma migrate deploy` hoặc `prisma migrate resolve`.
- Nếu production `db push` yêu cầu `--accept-data-loss`, workflow phải dừng để lập kế hoạch backup/rollback riêng.

## Commit message đề xuất

```text
feat(bug-inbox): add review notifications and AI resolution memory

- Add reporter history, review links, lifecycle tracking, and admin override
- Persist structured Agent resolutions and surface similar resolved cases
- Add closed-ticket metrics and polish related responsive dashboard controls

AI-assisted. Reviewed and verified.
```

## Verification

- `bash scripts/deploy/migration-plan.sh origin/main` ✅
- `pnpm --filter @mos-lab/api data-migrations:validate` ✅ — 14 modules hợp lệ
- `pnpm lint` ✅ — 4 package lint + UI contract gate
- `pnpm --filter @mos-lab/shared build` ✅
- `pnpm --filter @mos-lab/api build` ✅ — gồm Prisma generate
- `pnpm --filter @mos-lab/web build` ✅ — Next.js production build
- Bug Report API tests ✅ — 9/9
- UI primitive tests ✅ — 38/38
- `git diff --check` ✅
- Browser QA Bug Inbox desktop/mobile ✅ — 5 metric cards, live `Đã đóng = 1`, không horizontal overflow

## Review note

- Checkpoint này sẽ stage **toàn bộ worktree**, bao gồm nhóm Customer/NYC/Today nêu trên, đúng với lệnh `git add .` của workflow.
- Nhóm Bug Inbox đã được browser QA trực tiếp; nhóm Customer/NYC/Today được bảo vệ bởi full lint và production build nhưng không được chạy lại browser QA tại checkpoint này.

## Approval

- Approved by Danny with **Go** on 31/08/2026.
- Workflow may stage the full worktree, commit the approved message and push `main`.
- VPS deployment still requires the post-CI confirmation checkpoint.
