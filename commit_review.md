---
request_feedback: true
status: pending_approval
branch: main
base: origin/main
---

# Commit review — customer combo balance query

## Danh sách file thay đổi

- `apps/api/src/modules/customers/routes.ts`
- `commit_review.md` — artifact review này

## Tóm tắt thay đổi

- Thay hai nhóm subquery tương quan bị lặp nhiều lần bằng một CTE `latest_combo` dùng chung.
- CTE chỉ lấy giao dịch combo `Completed` của đúng khách đang xem, loại trừ các package `single`, `refill` và `balance` như logic cũ.
- Phần trả về `normalCount` và `retainCount` vẫn chỉ nhận số dư tại ngày mua combo mới nhất, nhưng truy vấn ngắn hơn và tránh lặp lại cùng phép tính ở cả hai nhánh `order_service_combo` và `order_service`.

## Phạm vi không nằm trong commit này

- Bản vá **MOS-BUG-9 / WingsLashes Dev** được thực hiện trong checkout WingsLashes Dev riêng, không thuộc Git repository `mos-lab`. Vì vậy commit này không bao gồm thay đổi đó.

## Production migration plan

### CRM schema changes

- **None.** Không có thay đổi Prisma schema so với `origin/main`.

### Pending production data migrations

- **None.** Không có production data migration mới. Thay đổi chỉ refactor câu SQL đọc dữ liệu khách hàng.

### Migration inventory result

- `bash scripts/deploy/migration-plan.sh origin/main`: không có schema change và không có production data migration.
- `pnpm --filter @mos-lab/api data-migrations:validate`: thành công; xác thực 16 production data migration modules.

## Verification

- `git diff --check` ✅
- `pnpm --filter @mos-lab/api build` ✅

## Commit message đề xuất

```text
perf(customers): streamline latest combo balance lookup

- Reuse a scoped CTE for the latest completed combo purchase
- Remove repeated correlated subqueries from customer balance queries

AI-assisted. Reviewed and verified.
```

## Approval

Chờ Danny duyệt phạm vi và commit message. Chưa stage, commit, push hoặc deploy.
