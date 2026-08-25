---
request_feedback: true
---

# Commit review — Academy Workshop Google self check-in

## Changed files

- `apps/api/prisma/crm.prisma`
- `apps/api/prisma/migrations/20260825103000_add_workshop_display_join_qr/migration.sql`
- `apps/api/src/modules/academy-workshops/academy-workshop-live.service.ts`
- `apps/api/src/modules/academy-workshops/academy-workshop-public.service.ts`
- `apps/api/src/modules/academy-workshops/academy-workshop-rules.test.ts`
- `apps/api/src/modules/academy-workshops/academy-workshop.service.ts`
- `apps/api/src/modules/academy-workshops/public.routes.ts`
- `apps/api/src/modules/academy-workshops/routes.ts`
- `apps/api/src/modules/auth/google-identity.service.ts`
- `apps/api/src/modules/auth/google-identity.service.test.ts`
- `apps/api/src/modules/auth/routes.ts`
- `apps/web/app/academy/workshops/components/GoogleWorkshopJoinButton.tsx`
- `apps/web/app/academy/workshops/display/[code]/page.tsx`
- `apps/web/app/academy/workshops/lobby/[code]/page.tsx`
- `apps/web/app/dashboard/academy-leads/components/AcademyWorkshopEditButton.tsx`
- `apps/web/app/dashboard/academy-leads/components/AcademyWorkshopSharedQrButton.tsx`
- `apps/web/app/dashboard/academy-leads/components/AcademyWorkshopWorkspaceSections.tsx`
- `apps/web/app/dashboard/academy-leads/workshops/[slug]/live/page.tsx`
- `apps/web/app/dashboard/academy-leads/workshops/[slug]/page.tsx`
- `apps/web/lib/api-client.ts`
- `packages/shared/src/types/academy-workshop.ts`

## Tóm tắt

- Thêm QR chung trên Leaderboard, staff có thể hiện/ẩn ngay trong Live Control; Stage nhận trạng thái mới qua WebSocket không cần refresh.
- Học viên đã đăng ký hoặc walk-in chọn hồ sơ để tự check-in; hồ sơ có số điện thoại bắt buộc xác minh đúng số.
- Học viên chưa có hồ sơ có thể đăng nhập Google để tạo/reuse lead walk-in, được xác nhận và check-in idempotent. Backend xác minh issuer, audience, expiry và email đã xác minh của Google token.
- Bổ sung khả năng sửa/đổi tên workshop và các UI/workflow liên quan.

## Proposed commit

```text
feat(workshops): add Google self check-in and leaderboard QR

- Add shared QR controls with realtime stage updates
- Support verified Google walk-ins and idempotent self check-in
- Add workshop editing and secure Google identity validation

AI-assisted. Reviewed and verified.
```

## Production migration plan

- CRM schema: `20260825103000_add_workshop_display_join_qr` chỉ thêm cột `show_join_qr_on_display TINYINT(1) NOT NULL DEFAULT 0` vào `crm_academy_workshops`.
- Không có `DROP`, không đổi kiểu dữ liệu, không có production data migration mới.
- Client OAuth đã cho phép `https://lab.masteros.app`; QR production phải sử dụng domain HTTPS này, không sử dụng IP LAN.

## Verification

- Focused API tests: 24/24 passed.
- Web tests: 81/81 passed.
- Shared build, API/Web typecheck, API/Web lint, UI contract, API/Web production build: passed.
- `data-migrations:validate`: passed.
- `migration-plan.sh origin/main`: chỉ liệt kê migration CRM additive ở trên.
