---
request_feedback: true
---

# Commit review

## Danh sách file thay đổi

- `apps/api/src/modules/customers/routes.ts`
- `apps/api/src/modules/customers/services/booking-promotion.service.ts` (mới)
- `apps/api/src/modules/kpi/routes/bk.routes.ts`
- `apps/api/src/modules/kpi/services/bk-salary.service.ts`
- `apps/web/app/dashboard/bk/components/BkBookingTab.tsx`
- `apps/web/app/dashboard/schedule-calendar/page.tsx`
- `apps/web/components/UpdateBookingModal.tsx`
- `apps/web/lib/api-client.ts`
- `packages/shared/src/types/bk.ts`
- `packages/shared/src/types/campaign.ts`
- `packages/shared/src/types/customer.ts`

## Tóm tắt thay đổi

- Cho phép đổi khuyến mãi trong modal cập nhật lịch hẹn. Lịch thuộc custom campaign chỉ xem/chọn được ưu đãi của đúng campaign đó; backend kiểm tra phạm vi, đồng bộ promotion legacy, tính lại giá/giảm giá và ghi audit.
- Tập trung logic promotion của booking vào `BookingPromotionService`, dùng chung cho tạo mới và cập nhật lịch hẹn.
- Bổ sung số cuộc gọi, pickup và tỷ lệ pickup cho BK Leaderboard. Tỷ lệ pickup được tính tại backend: `pickup / cuộc gọi`, làm tròn một chữ số; UI hiển thị dạng `673 (39.3%)`.
- Cập nhật nhãn KPI `BOOKING DONE`, bổ sung card Pickup, avatar/chi tiết booking đã có từ thay đổi liên quan, và thu nhỏ biểu tượng dấu cộng trên nút tạo lịch.
- Bổ sung DTO dùng chung và API client có kiểu cho promotion của booking.

## Kiểm tra đã thực hiện

- `pnpm --filter @mos-lab/shared build` — pass
- `pnpm --filter @mos-lab/api build` — pass
- `pnpm --filter @mos-lab/web exec tsc --noEmit` — pass
- Browser QA — modal lịch custom campaign hiển thị đúng promotion giới hạn theo Come Back; BK Leaderboard hiển thị `673 (39.3%)`; nhãn `BOOKING DONE` hiển thị đúng.

## Production migration plan

- CRM schema changes: None.
- Production data migrations: None.
- `bash scripts/deploy/migration-plan.sh origin/main`: không có schema change hoặc migration pending.
- `pnpm --filter @mos-lab/api data-migrations:validate`: đã validate 0 production data migration.

## Commit message đề xuất

```text
feat(kpi): improve booking promotion and call metrics

- Scope custom campaign promotions when editing bookings
- Surface call, pickup, and pickup-rate metrics in BK leaderboard
- Polish booking and schedule dashboard labels

AI-assisted. Reviewed and verified.
```

## Chờ duyệt

Phê duyệt commit message trên bằng `Proceed` hoặc `OK` để tôi stage, commit và push lên `main`.
