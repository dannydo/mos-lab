---
request_feedback: true
---

# Commit review — NYC fixed-price campaign release

## Changed files

- `apps/api/prisma/crm.prisma`
- `apps/api/prisma/migrations/20260824100000_add_campaign_fixed_final_price/migration.sql`
- `apps/api/prisma/migrations/20260824110000_add_campaign_fixed_price_categories/migration.sql`
- `apps/api/src/modules/campaigns/campaign.service.ts`
- `apps/api/src/modules/customers/routes.ts`
- `apps/api/src/modules/customers/routes/booking.routes.ts`
- `apps/api/src/modules/customers/services/booking-promotion.service.ts`
- `apps/api/src/modules/customers/services/customer-service-filter-catalog.service.ts`
- `apps/api/src/modules/customers/services/booking-promotion.service.test.ts`
- `apps/api/src/modules/customers/services/customer-service-filter-catalog.service.test.ts`
- `apps/web/app/dashboard/customers/components/CustomerBulkActions.tsx`
- `apps/web/app/dashboard/customers/components/CustomerFilters.tsx`
- `apps/web/app/dashboard/customers/components/CustomerTable.tsx`
- `apps/web/app/dashboard/customers/hooks/useCustomerData.ts`
- `apps/web/app/dashboard/customers/page.tsx`
- `apps/web/app/dashboard/nyc/campaigns/[slug]/page.tsx`
- `apps/web/app/dashboard/nyc/campaigns/page.tsx`
- `apps/web/components/BookingWizardDrawer.tsx`
- `apps/web/components/UpdateBookingModal.tsx`
- `apps/web/components/booking/comboUtils.ts`
- `apps/web/lib/campaign-fixed-price.ts`
- `apps/web/lib/campaign-form-options.ts`
- `packages/shared/src/types/auth.ts`
- `packages/shared/src/types/campaign.ts`
- `packages/shared/src/types/customer.ts`

## Tóm tắt

- Bổ sung ưu đãi NYC **Giá đồng nhất** với giá thanh toán cuối cùng theo dịch vụ lẻ nối mi hoặc thể loại catalog.
- Backend là nguồn tính giá duy nhất cho tạo/sửa lịch, từ chối dịch vụ ngoài phạm vi, giá cao hơn giá niêm yết, campaign không hoạt động/ngoài thời gian và ưu đãi chồng chéo.
- Booker thấy đúng ưu đãi campaign; Super Admin được tạo/sửa/hủy lịch, phân bổ khách và xem toàn bộ khách campaign qua `All Bookers`.
- Thêm thông báo lỗi rõ ràng trong wizard, giữ lại toàn bộ danh sách campaign sau khi đặt lịch, và thêm coverage cho logic đồng giá/catalog.

## Proposed commit

```text
feat(nyc): add scoped fixed-price campaign promotions

- Enforce fixed final pricing for selected lash services and catalog families
- Preserve Super Admin booking, allocation, and full campaign visibility
- Add additive CRM schema migrations and promotion regression coverage

AI-assisted. Reviewed and verified.
```

## Production migration plan

- CRM schema: hai `ALTER TABLE` chỉ thêm nullable `TEXT` vào `crm_campaign_promotions`:
  - `20260824100000_add_campaign_fixed_final_price`: `eligible_service_ids`.
  - `20260824110000_add_campaign_fixed_price_categories`: `eligible_service_category_keys`.
    Không xóa hay chuyển đổi dữ liệu hiện hữu.
- Không có production data migration mới trong commit.
- Nếu VPS chưa ghi nhận migration sẵn có `20260823180000_seed_academy_organization_defaults`, deploy sẽ chạy idempotent: seed catalog/giảng viên/organization Academy và chuẩn hóa tài khoản Super Admin. Đã được duyệt cho phép chạy nếu pending.

## Verification

- Focused backend tests: 7/7 passed.
- Shared build, API build, Web typecheck và scoped Web lint: passed.
- `data-migrations:validate`: passed (1 module hợp lệ).
- `migration-plan.sh origin/main`: chỉ liệt kê hai CRM schema migration; không có data migration mới.
