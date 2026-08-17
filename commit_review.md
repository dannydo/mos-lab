---
request_feedback: true
target: production-hotfix
---

# Production Hotfix Commit Review

## Scope

- Branch: `main`
- Candidate changes: 4 source files, 48 additions / 13 deletions.

## Danh sách file thay đổi

```
apps/api/src/modules/kpi/routes/bk.routes.ts
apps/api/src/modules/kpi/services/bk-salary.service.ts
apps/api/src/modules/kpi/services/bk-salary.service.test.ts
apps/web/app/dashboard/bk/components/BkBookingTab.tsx
```

## Tóm tắt nội dung thay đổi

- Sửa phạm vi Bảng Xếp Hạng Booking: chỉ lấy nhân sự đang hoạt động trong đội `BK_TELESALES`, thay vì nhóm BK mở rộng có thể bao gồm CS và Control.
- Đồng bộ Bảng Dữ Liệu Chi Tiết Booking với cùng roster Telesales; yêu cầu detail chỉ định Booker ngoài roster trả về dữ liệu rỗng.
- Thêm unit test cho guard phạm vi Booker và cập nhật nội dung UI để thể hiện rõ nhóm Telesales.

## Verification

- Fast-track production builds passed:
  - `pnpm --filter @mos-lab/shared build`
  - `pnpm --filter @mos-lab/api build`
  - `pnpm --filter @mos-lab/web build`
- Focused API/Web typecheck and ESLint — passed.
- `pnpm --filter @mos-lab/api exec tsx --test src/modules/kpi/services/bk-salary.service.test.ts` — passed (3 tests).
- Live dashboard QA — passed: Leaderboard and unfiltered booking table both show only Bích Phượng, Ngọc Điệp, and Tâm Nguyễn from the active Telesales roster.
- `git diff --check` — passed.

## Production migration plan

- CRM schema changes: **None**.
- Pending production data migrations: **None**.
- `bash scripts/deploy/migration-plan.sh origin/main`: reports no schema or data migrations.
- `pnpm --filter @mos-lab/api data-migrations:validate`: passed; validated 0 production data migrations.
- Expected production data effect: no schema or data migration will run.

## Proposed hotfix commit

```
fix(bk): restrict booking reports to telesales team

- Scope booking leaderboards and detail records to active BK_TELESALES members.
- Guard direct Booker detail requests against out-of-team IDs.

AI-assisted. Reviewed and fast-track verified.
```

## Approval requested

Approve this exact hotfix scope and message to create the short-lived hotfix branch, merge/tag `main`, and run the production release.

## Diff inventory

```
 apps/api/src/modules/kpi/routes/bk.routes.ts       | 33 ++++++++++++++--------
 .../modules/kpi/services/bk-salary.service.test.ts | 12 +++++++-
 .../src/modules/kpi/services/bk-salary.service.ts  | 13 +++++++++
 .../app/dashboard/bk/components/BkBookingTab.tsx   |  3 +-
 4 files changed, 48 insertions(+), 13 deletions(-)
```
