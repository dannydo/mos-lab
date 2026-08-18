---
request_feedback: true
---

# Commit review — Custom Campaign booking filters hotfix

## Danh sách file thay đổi

- `apps/api/src/modules/campaigns/campaign.service.ts`
- `apps/api/src/modules/campaigns/routes.ts`
- `apps/web/app/dashboard/nyc/campaigns/[slug]/page.tsx`
- `apps/web/app/globals.css`
- `apps/web/lib/api-client.ts`
- `packages/shared/src/types/campaign.ts`

## Tóm tắt thay đổi

- Thêm các filter trạng thái trực tiếp trên Custom Campaign: `Tất cả`, `Booked`, `Done`, `Missed`; ô tìm kiếm vẫn thu gọn và mở rộng khi cần.
- Chuẩn hóa rule `Done` ở backend: chỉ các đơn `Completed` trong đúng thời gian chạy campaign mới được tính; lấy thời điểm check-in thực tế (`actual_booking_date_start`), fallback sang lịch hẹn khi thiếu dữ liệu.
- Đồng bộ chiều cao badge trạng thái, bộ chọn Booker và nút hành động theo UI density hiện tại để toolbar thẳng hàng trên desktop và mobile.
- Mở rộng shared query contract và API client có kiểu cho filter trạng thái, tránh suy luận status ở frontend.

## Kiểm tra đã thực hiện

- `pnpm --filter @mos-lab/shared build` — pass
- `pnpm --filter @mos-lab/api build` — pass
- `pnpm --filter @mos-lab/web build` — pass
- `git diff --check` — pass
- Browser QA — Done trên campaign Come Back trả về 17 khách trong khoảng campaign, filter active đúng.

## Production migration plan

- CRM schema changes: None.
- Production data migrations: None.
- `bash scripts/deploy/migration-plan.sh origin/main`: không có schema change hoặc migration pending.
- `pnpm --filter @mos-lab/api data-migrations:validate`: validated 0 production data migration(s).
- Expected data effect: Không ghi hoặc biến đổi dữ liệu production; chỉ thay đổi điều kiện truy vấn dữ liệu đọc cho filter Custom Campaign.

## Commit message đề xuất

```text
fix(campaigns): refine custom campaign booking filters

- Add direct booked, done, and missed campaign filters
- Restrict Done to completed services within the campaign window
- Align campaign toolbar controls across UI densities

AI-assisted. Reviewed and verified.
```

## Chờ duyệt

Phê duyệt commit message trên bằng `Proceed` hoặc `OK` để tôi stage, commit và push lên `main`. Sau khi CI pass, tôi sẽ xin xác nhận lần cuối trước khi deploy production.
