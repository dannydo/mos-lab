---
request_feedback: true
target: production
---

# Production Commit Review

## Scope

- Branch: `main`
- Candidate changes: 6 source files, 186 additions / 145 deletions.

## Danh sách file thay đổi

```
apps/api/src/modules/campaigns/campaign.service.ts
apps/api/src/modules/customers/routes.ts
apps/web/app/dashboard/customers/hooks/useCustomerList.ts
apps/web/app/dashboard/loca/hooks/useLocaData.ts
apps/web/app/dashboard/nyc/campaigns/[slug]/page.tsx
apps/web/lib/api-client.ts
```

## Tóm tắt nội dung thay đổi

- Tối ưu API khách hàng chiến dịch: phân trang tại database cho luồng không có bộ lọc hậu xử lý, giới hạn `pageSize` hợp lệ, tìm kiếm tiếng Việt không dấu, và áp dụng bộ lọc touchpoint theo đúng khoảng ngày cấu hình.
- Trang NYC chỉ tải dữ liệu chi tiết khi người dùng mở khách hàng; nhờ đó payload danh sách chiến dịch giảm đáng kể.
- Trang LoCa loại bỏ các request danh sách/thống kê bị gọi trùng khi khởi tạo, vẫn tải lần đầu ngay lập tức, và cache thống kê theo user + bộ lọc trong 15 giây.
- Trang Khách hàng gộp các GET đồng thời nhưng không cache kết quả đã hoàn tất, nên dữ liệu vẫn mới sau mutation; việc chuyển trang chỉ tải danh sách mới, không tính lại badge totals.

## Verification

- `pnpm --filter @mos-lab/api exec tsc --noEmit` — passed.
- `pnpm --filter @mos-lab/web exec tsc --noEmit` — passed.
- Focused ESLint for all changed API and web files — passed.
- Live browser checks for NYC, LoCa, and Customers — passed; initial duplicate requests were removed and pagination now avoids unnecessary stats refreshes.

## Production migration plan

- CRM schema changes: **None**.
- Pending production data migrations: **None**. The migration directory contains only `types.ts` and `README.md`; no default-exported migration module is pending.
- `bash scripts/deploy/migration-plan.sh origin/main`: reports no schema or data migrations.
- `pnpm --filter @mos-lab/api data-migrations:validate`: passed; validated 0 production data migrations.
- Expected production data effect: no schema or data migration will run. The guarded deployment script will only validate the existing schema and migration registry.

## Proposed commit

```
perf(dashboards): reduce campaign and customer page fetch overhead

- Page unfiltered campaign customers at the database boundary and normalize Vietnamese search.
- Coalesce concurrent reads, cache LoCa stats, and avoid stats refreshes during pagination.

AI-assisted. Reviewed and verified.
```

## Approval requested

Approve this exact commit scope and message to proceed with staging and pushing to `main`. After CI passes, a separate confirmation will be required before the VPS deployment.

## Diff inventory

```
 apps/api/src/modules/campaigns/campaign.service.ts |  51 ++++--
 apps/api/src/modules/customers/routes.ts           |  12 +-
 .../dashboard/customers/hooks/useCustomerList.ts   |  10 +-
 apps/web/app/dashboard/loca/hooks/useLocaData.ts   |  36 +++--
 .../app/dashboard/nyc/campaigns/[slug]/page.tsx    | 175 +++++++++------------
 apps/web/lib/api-client.ts                         |  47 ++++--
 6 files changed, 186 insertions(+), 145 deletions(-)
```
