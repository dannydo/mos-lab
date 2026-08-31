---
request_feedback: false
status: approved
branch: main
base: origin/main
---

# Commit review — Bug Inbox clarification workflow

## Danh sách file thay đổi

### Review artifact

- `commit_review.md`

### CRM schema, migration và API

- `apps/api/prisma/crm.prisma`
- `apps/api/prisma/migrations/20260831170000_add_bug_report_clarification/migration.sql`
- `apps/api/src/scripts/data-migrations/20260831170500_backfill_bug_report_clarification.ts`
- `apps/api/src/modules/bug-reports/bug-report.service.ts`
- `apps/api/src/modules/bug-reports/bug-report.service.test.ts`
- `apps/api/src/modules/bug-reports/routes.ts`

### Shared contracts và Agent CLI

- `packages/shared/src/types/bug-report.ts`
- `scripts/bug-agent.ts`
- `scripts/bug-agent.test.ts`

### Bug Inbox UI và Web SDK

- `apps/web/lib/api-client.ts`
- `apps/web/app/dashboard/bug-reports/page.tsx`
- `apps/web/app/dashboard/bug-reports/bug-report-presenters.tsx`
- `apps/web/app/dashboard/bug-reports/hooks/useBugReports.ts`
- `apps/web/components/bug-reports/BugReportAttachmentPreview.tsx`
- `apps/web/components/bug-reports/BugReportConversation.tsx`
- `apps/web/components/bug-reports/BugReportSurface.tsx`
- `apps/web/components/bug-reports/MyBugReportsPanel.tsx`
- `apps/web/components/bug-reports/useMyBugReports.ts`

## Tóm tắt thay đổi

- Thêm hội thoại làm rõ trực tiếp trong Admin Bug Inbox và popup `Lỗi của tôi`; nhân viên hoặc Admin có thể gửi text, dán ảnh hoặc chọn tối đa 3 ảnh cho mỗi bình luận.
- Bảo vệ ảnh đính kèm theo quyền sở hữu ticket: người báo chỉ xem ticket của mình, Admin có quyền xem/trao đổi, ticket kết thúc chuyển sang chỉ đọc.
- Bổ sung clarification state machine `PENDING_AGENT → WAITING_REPORTER → PENDING_AGENT → READY`, notification khi Agent cần người báo bổ sung dữ kiện và audit log cho từng lần hỏi/trả lời.
- Ép Agent kiểm tra repository, shared contracts, service/model và case tương tự trước; nếu chưa hiểu kết quả đúng thì phải hỏi và dừng. Backend từ chối approve/fix khi clarification chưa `READY`.
- Mở rộng Agent queue thành hai loại việc `CLARIFY` và `FIX`; thêm Agent Bridge/CLI để gửi câu hỏi hoặc ghi nhận kết luận biz logic.
- Lưu kết luận biz logic và toàn bộ hội thoại vào bundle Agent để tái sử dụng tri thức, giảm khả năng lặp lại lỗi cùng loại.
- Tách component preview ảnh được bảo vệ và component conversation dùng chung để giữ UI/API flow đồng bộ.

## Production migration plan

### CRM schema changes

1. `20260831170000_add_bug_report_clarification`
   - Thêm `clarification_status`, `clarification_summary`, `clarified_at` vào `crm_bug_reports`.
   - Tạo bảng `crm_bug_report_comments` để lưu comment của Staff/Agent, loại comment, nội dung, tác giả và thời gian.
   - Thêm `comment_id` nullable, index và foreign key vào `crm_bug_report_attachments` để gắn ảnh với từng comment.
   - Các thay đổi đều additive; không drop/rename cột và không yêu cầu `--accept-data-loss`.
   - File SQL có backfill tương thích cho môi trường dùng Prisma migrations, nhưng production mOS vẫn phải dùng guarded `prisma db push`, không dùng `prisma migrate deploy` hoặc `prisma migrate resolve`.

### Pending production data migrations

1. `20260831170500_backfill_bug_report_clarification`
   - Description: đánh dấu các ticket đã triage trước khi clarification gate ra đời là `READY` để không làm kẹt công việc lịch sử.
   - Expected data effect: chỉ cập nhật ticket có status `APPROVED`, `IN_PROGRESS`, `FIXED`, `CLOSED`, `REJECTED` hoặc `DUPLICATE` nhưng vẫn còn `PENDING_AGENT`; giữ nguyên ticket `NEW` và ticket đã có trạng thái clarification khác.
   - Safety: có preflight kiểm tra đủ ba cột, điều kiện cập nhật idempotent, chạy trong transaction/advisory lock của production migration runner.

### Migration inventory result

- `bash scripts/deploy/migration-plan.sh origin/main`: phát hiện đúng 2 schema files và 1 production data migration ở trên.
- `pnpm --filter @mos-lab/api data-migrations:validate`: hợp lệ, tổng cộng 15 production data migration modules.

## Verification

- `pnpm lint` ✅ — 4 package lint và UI contract gate.
- `pnpm --filter @mos-lab/shared build` ✅
- `pnpm --filter @mos-lab/api build` ✅
- `pnpm --filter @mos-lab/web build` ✅
- `pnpm --filter @mos-lab/api exec tsc --noEmit` ✅
- Bug Report service tests ✅ — 11/11.
- Bug Agent CLI tests ✅ — 2/2.
- Prisma schema validate/generate và local additive schema apply ✅
- Production data migrations validate ✅ — 15 modules.
- `git diff --check` ✅
- Browser QA desktop/mobile ✅ — Admin và reporter đều thấy hội thoại/câu hỏi Agent; chọn ảnh bật nút gửi; mobile không tràn ngang; console không có lỗi.
- Dữ liệu QA tạm đã được xóa sau khi kiểm tra.

## Commit message đề xuất

```text
feat(bug-inbox): add agent clarification workflow

- Add protected ticket conversations with image attachments for reporters and admins
- Gate Agent fixes on business-logic clarification with audit and notification state
- Add additive schema changes and a safe backfill for existing triaged tickets

AI-assisted. Reviewed and verified.
```

## Approval

- Approved by Danny with **Go** on 31/08/2026.
- Workflow may stage the reviewed worktree, commit and push `main`.
- Sau khi CI pass, deployment VPS vẫn cần một xác nhận riêng.
