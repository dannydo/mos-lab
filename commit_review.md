---
request_feedback: true
status: awaiting_approval
---

# Commit review — feedback popup icon-control parity

## Danh sách file thay đổi

| Khu vực                 | File                                                   |
| ----------------------- | ------------------------------------------------------ |
| Feedback popup controls | `apps/web/components/bug-reports/BugReportSurface.tsx` |
| Review artifact         | `commit_review.md`                                     |

**Diff stat:** 2 files changed, 28 insertions, 63 deletions.

## Tóm tắt thay đổi

- Thay link Inbox tự style và nút Workflow tự style bằng cùng một `IconButton` primitive, vẫn giữ link trực tiếp `/dashboard/bug-reports`.
- Hai control nay dùng chung toàn bộ visual contract: kích thước, padding, bo góc, căn giữa icon, màu, focus và hover state.
- Browser QA xác nhận cả hai khung `32×32px`, cách nhau `4px` và tâm icon trùng với tâm nút.

## Production migration plan

### CRM schema

**None.** `bash scripts/deploy/migration-plan.sh origin/main` xác nhận không có schema change.

### Data migrations

**None.** Không có data migration mới cần chạy. `pnpm --filter @mos-lab/api data-migrations:validate` xác nhận 17 migration production hiện hữu hợp lệ.

## Verification

- `git diff --check` ✅
- `pnpm --filter @mos-lab/web exec eslint components/bug-reports/BugReportSurface.tsx` ✅
- `pnpm --filter @mos-lab/web typecheck` ✅
- Browser QA ✅ — DOM và computed styles của hai control đồng nhất; link Inbox vẫn là anchor hợp lệ.

## Commit message đề xuất

```text
fix(inbox): unify feedback popup icon controls

- Use the shared IconButton primitive for Inbox and workflow actions.
- Keep both controls visually and interactively identical.

AI-assisted. Reviewed and verified.
```

## Chờ duyệt

Yêu cầu `Go` hiện tại được dùng làm xác nhận phạm vi release này; chuẩn bị stage, commit và push.
