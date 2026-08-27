---
request_feedback: true
---

# Commit review

## Danh sách file thay đổi

- `apps/api/src/modules/customers/routes.ts`
- `apps/api/src/modules/customers/services/customer-creation.service.ts` _(new)_
- `apps/web/app/dashboard/layout.tsx`
- `apps/web/components/BookingWizardDrawer.tsx`
- `apps/web/components/CreateCustomerModal.tsx` _(new)_
- `apps/web/lib/api-client.ts`
- `packages/shared/src/types/customer.ts`

## Tóm tắt thay đổi

- Thêm nút đặt lịch dạng icon trên thanh menu đầu trang và dùng lại Booking Wizard hiện hữu.
- Thêm flow tạo khách độc lập ngay trong Booking Wizard: tạo hồ sơ không sinh lịch hẹn, sau đó có thể chọn khách vừa tạo để tiếp tục đặt lịch.
- Đồng bộ form tạo khách với Wings Lashes legacy: họ tên, SĐT, người giới thiệu ưu tiên, hồ sơ tùy chọn, Facebook/Messenger và nguồn campaign/quảng cáo.
- Thêm tùy chọn khách nước ngoài với tự nhận diện theo SĐT, cho phép xác nhận thủ công và lưu trạng thái override.
- Tập trung hóa logic tạo khách ở backend để flow tạo khách độc lập và khách mới trong booking dùng cùng nghiệp vụ referral, nguồn khách và dữ liệu legacy.

## Production migration plan

- CRM schema changes: **None**.
- Pending production data migrations included in this change: **None**.
- `bash scripts/deploy/migration-plan.sh origin/main`: không có schema hoặc data migration cần deploy.
- `pnpm --filter @mos-lab/api data-migrations:validate`: đã xác thực 3 production data migrations hiện có; không có migration mới trong thay đổi này.

## Commit message đề xuất

```text
feat(customers): add standalone customer creation flow

- Add a global booking entry point with a legacy-compatible customer form
- Persist referral, source, social profile, and foreign-customer status
- Reuse a unified backend service for standalone and booking lead creation

AI-assisted. Reviewed and verified.
```
