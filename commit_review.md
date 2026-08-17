---
request_feedback: true
target: production
---

# Production Commit Review

## Scope

- Branch: `main`
- Candidate changes: 1 source file, 52 additions / 19 deletions.

## Danh sách file thay đổi

```
apps/web/components/telesales/hooks/useTelesalesDashboard.ts
```

## Tóm tắt nội dung thay đổi

- Chuẩn hoá kích thước modal Telesales đã lưu thành số nguyên thay vì chuỗi CSS, khớp với kiểu dữ liệu mà component modal sử dụng khi render.
- Đọc kích thước đã lưu đồng bộ trước lần render đầu tiên, nên F5 không ghi đè kích thước người dùng bằng kích thước mặc định.
- Lưu kích thước resize đã làm tròn, kiểm tra ngưỡng tối thiểu và tránh ghi `localStorage` lặp lại khi kích thước không đổi.
- Tương thích với giá trị cũ dạng `900px` nhờ `parseInt`.

## Verification

- `pnpm --filter @mos-lab/web exec eslint 'components/telesales/hooks/useTelesalesDashboard.ts' 'components/TelesalesDashboardModal.tsx'` — passed.
- `pnpm --filter @mos-lab/web exec tsc --noEmit` — passed.
- `git diff --check` — passed.
- Live browser: resized the modal to `1192 × 857`; both values were saved to `localStorage`. After a full reload, reopening the modal restored exactly `1192 × 857`.

## Production migration plan

- CRM schema changes: **None**.
- Pending production data migrations: **None**.
- `bash scripts/deploy/migration-plan.sh origin/main`: reports no schema or data migrations.
- `pnpm --filter @mos-lab/api data-migrations:validate`: passed; validated 0 production data migrations.
- Expected production data effect: no schema or data migration will run.

## Proposed commit

```
fix(telesales): persist resized dashboard modal dimensions

- Restore validated numeric dimensions before the modal first renders.
- Avoid redundant browser-storage writes during resize observation.

AI-assisted. Reviewed and verified.
```

## Approval requested

Approve this exact commit scope and message to stage and push it to `main`. Once CI passes, the guarded workflow requires a separate confirmation before VPS deployment.

## Diff inventory

```
 .../telesales/hooks/useTelesalesDashboard.ts | 71 ++++++++++++++++------
 1 file changed, 52 insertions(+), 19 deletions(-)
```
