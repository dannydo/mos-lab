---
request_feedback: true
---

# Commit review — Academy operations, governed access, and KPI alignment

## Kết luận review

Sẵn sàng để duyệt commit. Không còn blocker đã biết sau review, build, test và smoke test local.

Review đã phát hiện và sửa 5 nhóm vấn đề trước khi đề xuất commit:

1. Bổ sung production data migration còn thiếu cho catalog Academy, cơ cấu Department/Team và Super Admin.
2. Chặn truy cập trực tiếp Post Hub/Chiến Thần ở cả API và page nếu user không thuộc Academy.
3. Đưa các màn Academy mới về đúng UI contract; tách hai page lớn thành helper/hook dễ bảo trì.
4. Cập nhật test fixture để phản ánh đúng access gate theo Academy team, không nới quyền production.
5. Loại bỏ nguy cơ cộng trùng CV Tip do join `order_service` khi tổng hợp `staff_tip`.

## Phạm vi thay đổi

- 46 file implementation tracked được sửa: 4.489 dòng thêm, 708 dòng xóa; cộng thêm artifact review này.
- 101 file mới, gồm 17 migration SQL và 35 asset Academy/invoice.
- Asset mới khoảng 3,8 MB cho Academy và 48 KB cho mockup hóa đơn.

### Backend và dữ liệu

- `apps/api/prisma/crm.prisma`
- `apps/api/src/middlewares/auth.ts` và test mới
- `apps/api/src/modules/academy-sales/**`
- `apps/api/src/modules/menu-access/**`
- `apps/api/src/modules/teams/**`
- `apps/api/src/modules/auth/routes.ts`
- `apps/api/src/modules/roles/routes.ts`
- `apps/api/src/modules/staff/routes.ts`
- `apps/api/src/modules/post-hub/routes.ts`
- `apps/api/src/modules/kpi/routes.ts`
- `apps/api/src/modules/kpi/routes/cv-tip.routes.ts`
- `apps/api/src/modules/calls/routes.ts`
- `apps/api/src/modules/gamification/routes.ts`
- `apps/api/src/server.ts`
- `apps/api/scripts/seed-admin.ts`
- `apps/api/src/scripts/seed-teams.ts`
- `apps/api/src/scripts/data-migrations/20260823180000_seed_academy_organization_defaults.ts`
- `apps/api/prisma/migrations/20260819110000_*` đến `20260823170000_*` (17 migration SQL)
- `scripts/deploy/migration-plan.sh`

### Frontend

- `apps/web/app/dashboard/academy-leads/**`: leads, campaign, khóa học, giảng viên, đánh giá tố chất/workshop, học phí và audit.
- `apps/web/app/dashboard/staff/teams/**`: CRUD Department/Team và liên kết nhân sự.
- `apps/web/app/dashboard/staff/menu-access/**`: policy hiển thị theo Department, Team, cá nhân và danh mục.
- `apps/web/components/layout/SidebarNav.tsx`, `apps/web/config/sidebar.config.tsx`, `apps/web/app/dashboard/layout.tsx`, `apps/web/app/globals.css`: hierarchy Section → Menu → Item, collapse persistence và rail alignment.
- `apps/web/app/dashboard/post-hub/**`: đặt Chiến Thần/Post Hub dưới Academy và bảo vệ direct URL.
- `apps/web/app/dashboard/bk/**`, `apps/web/app/dashboard/cc/**`, `apps/web/app/dashboard/cv/**`: đồng bộ báo cáo và server pagination CV Tip.
- `apps/web/lib/api-client.ts` và UI primitive tests.
- `apps/web/public/academy/**`, `apps/web/public/mockups/academy-invoices/**`: 35 asset mới.

### Shared contracts

- `packages/shared/src/types/academy-sales.ts`
- `packages/shared/src/types/academy-campaign.ts`
- `packages/shared/src/types/academy-talent-assessment.ts`
- `packages/shared/src/types/menu-access.ts`
- `packages/shared/src/types/auth.ts`
- `packages/shared/src/types/team.ts`
- `packages/shared/src/constants/index.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/types/index.ts`

## Nội dung nghiệp vụ chính

- Hoàn thiện workspace vận hành Academy: lead, campaign snapshot/touchpoint, catalog khóa học, giảng viên, workshop, hóa đơn, thanh toán follow-up và audit trail.
- Thêm Department/Team CRUD, vai trò `super_admin`, policy hiển thị menu theo Department/Team/cá nhân và giới hạn cả danh mục.
- Chuẩn hóa sidebar thành các section riêng; Academy là section độc lập, Chiến Thần là item trực tiếp của Academy; trạng thái expand/collapse giữ nguyên sau F5.
- Giới hạn toàn bộ Academy và Post Hub cho Super Admin/Admin hoặc thành viên Academy team đang hoạt động; API vẫn kiểm tra quyền dữ liệu độc lập.
- Đồng bộ shared types/API SDK và cải thiện báo cáo BK/CC/CV, đặc biệt tổng hợp/pagination CV Tip.

## Kế hoạch migration production

### Schema

- `crm.prisma` sẽ được áp dụng bằng bước `prisma db push` có guard, **không** dùng `--accept-data-loss`.
- Schema bổ sung dữ liệu Academy campaign/touchpoint/talent/payment/audit, Department, quan hệ Team–Department, menu access policy/audit và data migration ledger.
- Đã rà soát 17 migration SQL: không có `DROP`, `TRUNCATE`, `DELETE` hay `accept-data-loss`.
- Do production hiện không có Prisma migration baseline, 17 file SQL được giữ làm lịch sử/inventory; deploy script không chạy trực tiếp từng SQL mà đồng bộ schema qua guarded `db push`.

### Versioned data migration

- ID: `20260823180000_seed_academy_organization_defaults`
- Mô tả: seed catalog Academy, giảng viên, cơ cấu tổ chức mặc định và canonical Super Admin identities.
- Tác động dự kiến, theo transaction và idempotent:
  - upsert 9 khóa học và 4 giảng viên;
  - upsert Department `SHOP`, `ACADEMY`, `GROWTH`, `BACK_OFFICE`;
  - upsert Academy team và gán Department cho CC/CV, BK hierarchy và Academy;
  - upsert role `super_admin`;
  - chỉ promote các identity Danny chuẩn: `admin`, `danhdo@gmail.com`, `danny.do@wingslashes.com`.
- Migration được ghi nhận trong `crm_data_migrations`; chạy lại an toàn.
- `data-migrations:validate` đã xác nhận đúng 1 migration production đang chờ.
- Deploy phải dừng nếu schema check yêu cầu data loss.

## Verification

- `git diff --check` — pass.
- `pnpm lint` — pass, gồm UI contract check.
- `pnpm --filter @mos-lab/api lint` — pass, 0 warning.
- `pnpm --filter @mos-lab/api build` — pass.
- `pnpm --filter @mos-lab/web build` — pass; compile, TypeScript và generate 38/38 static pages thành công.
- Web tests — 8 files, 77/77 pass.
- API tests — 97/97 pass.
- `pnpm --filter @mos-lab/api data-migrations:validate` — pass.
- Browser smoke test tại `/dashboard/academy-leads/campaigns/cd-1` — page tải đúng, Academy/Chiến Thần hiển thị đúng hierarchy, không có console warning/error.

## Rủi ro và lưu ý rollout

- Đây là release lớn (147 file implementation thay đổi/mới, không tính artifact review), cần giữ nguyên thứ tự: commit → push → CI pass → xin xác nhận deploy → backup/migrate/restart/smoke test.
- `super_admin` thay đổi authorization và role records production; migration chỉ promote canonical Danny identities nêu trên.
- Post Hub hiện fail-closed cho user ngoài Academy; đây là thay đổi chủ đích.
- Push lên `main` có thể kích hoạt auto-deploy frontend; backend VPS vẫn phải chờ xác nhận deploy riêng sau khi CI xanh.

## Commit đề xuất

```text
feat(academy): launch governed operations workspace

- Build Academy campaigns, courses, instructors, talent, payment, and audit workflows
- Add department and team CRUD, Super Admin, and hierarchical menu visibility controls
- Protect Academy and Post Hub routes with active-team access checks
- Align CV tip reporting, sidebar persistence, shared contracts, and production migrations

AI-assisted. Reviewed and verified.
```

## Chờ duyệt

Phản hồi `Proceed` hoặc `OK` để tôi tạo commit và push lên `main`. Sau khi CI pass, tôi sẽ xin xác nhận riêng trước khi deploy VPS production.
