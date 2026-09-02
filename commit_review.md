---
request_feedback: true
status: awaiting_approval
---

# Commit review — mOS Inbox admin access & personalized handoffs

## Danh sách file thay đổi

| Khu vực                   | File                                                                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| API quyền Inbox           | `apps/api/src/modules/bug-reports/routes.ts`                                                                                                          |
| API test                  | `apps/api/src/modules/bug-reports/routes.test.ts`                                                                                                     |
| Inbox presenters & test   | `apps/web/app/dashboard/bug-reports/bug-report-presenters.tsx`, `apps/web/app/dashboard/bug-reports/bug-report-presenters.test.ts`                    |
| Inbox responsive table    | `apps/web/app/dashboard/bug-reports/components/BugReportMobileCard.tsx`, `apps/web/app/dashboard/bug-reports/components/useBugReportInboxColumns.tsx` |
| Inbox page                | `apps/web/app/dashboard/bug-reports/page.tsx`                                                                                                         |
| Feedback popup            | `apps/web/components/bug-reports/BugReportSurface.tsx`                                                                                                |
| Inbox conversation        | `apps/web/components/bug-reports/BugReportConversation.tsx`                                                                                           |
| Shared workflow label     | `apps/web/components/bug-reports/bug-report-workflow.ts`                                                                                              |
| Sidebar & regression test | `apps/web/config/sidebar.config.tsx`, `apps/web/components/ui/__tests__/ui-primitives.test.tsx`                                                       |
| Review artifact           | `commit_review.md`                                                                                                                                    |

**Diff stat:** 13 files changed, 215 insertions, 90 deletions.

## Tóm tắt thay đổi

- Mọi Admin và Super Admin có thể mở, xem chi tiết và xem attachment trong mOS Inbox. Danny vẫn là người duy nhất được triage, xác nhận đóng và quản lý ticket.
- Admin chỉ theo dõi Inbox ở chế độ chỉ đọc; không thấy composer bình luận hoặc các điều khiển thay đổi ticket. API cũng không cấp quyền bình luận lên ticket của người khác.
- Popup Phản hồi mOS có icon Inbox không kèm text, kèm tooltip `Mở mOS Inbox`, chỉ hiển thị cho Admin/Super Admin.
- Các trạng thái cần người báo phản hồi hiển thị tên rút gọn cá nhân hóa, ví dụ `Chờ Quang Khải làm rõ`, `Chờ Quang Khải nghiệm thu` và `Quang Khải · Bổ sung thông tin`.
- Bổ sung regression tests cho quyền đọc Inbox của Admin và workflow label có tên người báo.

## Production migration plan

### CRM schema

**None.** Không có thay đổi Prisma schema hoặc migration trong diff này.

`bash scripts/deploy/migration-plan.sh origin/main` xác nhận: `Schema changes: none`.

### Data migrations

**None.** Không có data migration mới cần chạy.

`pnpm --filter @mos-lab/api data-migrations:validate` xác nhận 17 production data migration hiện hữu hợp lệ.

### Safety

- Không có migration database được áp dụng trong lần deploy này.
- Các thay đổi giới hạn quyền thao tác ở cả UI và Fastify route guard; quyền triage/đóng ticket vẫn yêu cầu đúng canonical Super Admin Danny.

## Verification

- `git diff --check` ✅
- `pnpm --filter @mos-lab/api data-migrations:validate` ✅
- `bash scripts/deploy/migration-plan.sh origin/main` ✅ — không có schema/data migration mới.
- `pnpm --filter @mos-lab/web exec eslint ...` ✅ cho các file Inbox đã sửa.
- `pnpm --filter @mos-lab/web exec vitest run app/dashboard/bug-reports/bug-report-presenters.test.ts` ✅ — 4 tests pass.
- `pnpm --filter @mos-lab/web typecheck` ✅.
- Browser QA ✅ — mOS Inbox có label cá nhân hóa và popup có icon link `/dashboard/bug-reports` cho Admin.

## Commit message đề xuất

```text
feat(inbox): expand admin visibility and personalize reporter handoffs

- Let all admins view the mOS Inbox while reserving triage and closure for Danny.
- Add an admin Inbox shortcut to the feedback popup and personalize reporter-facing status labels.
- Cover the access and presentation behavior with focused regression tests.

AI-assisted. Reviewed and verified.
```

## Chờ duyệt

Xin xác nhận commit message và phạm vi trên trước khi mình stage, commit, push và theo dõi CI.
