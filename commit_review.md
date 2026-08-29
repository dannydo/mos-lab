---
request_feedback: true
status: awaiting_user_approval
branch: main
base: origin/main
---

# Commit review — Academy Workshop OS

## Danh sách file thay đổi

### API & data model

- `apps/api/prisma/crm.prisma`
- `apps/api/prisma/migrations/20260829103000_add_academy_workshop_menu_template_library/migration.sql`
- `apps/api/prisma/migrations/20260829113000_add_academy_workshop_equipment_template_library/migration.sql`
- `apps/api/prisma/migrations/20260829120000_add_workshop_template_references_and_capacity_default/migration.sql`
- `apps/api/prisma/migrations/20260829133000_add_academy_quiz_template_source/migration.sql`
- `apps/api/prisma/migrations/20260829140000_add_workshop_menu_agenda_item/migration.sql`
- `apps/api/prisma/migrations/20260829143000_add_agenda_resource_links/migration.sql`
- `apps/api/prisma/migrations/20260829150000_add_workshop_selection_change_deadline/migration.sql`
- `apps/api/prisma/migrations/20260829153000_split_workshop_selection_deadlines/migration.sql`
- `apps/api/src/modules/academy-workshops/academy-workshop-equipment-template.service.ts`
- `apps/api/src/modules/academy-workshops/academy-workshop-live.service.ts`
- `apps/api/src/modules/academy-workshops/academy-workshop-menu-template.service.ts`
- `apps/api/src/modules/academy-workshops/academy-workshop-public.service.ts`
- `apps/api/src/modules/academy-workshops/academy-workshop-storage.service.ts`
- `apps/api/src/modules/academy-workshops/academy-workshop.service.ts`
- `apps/api/src/modules/academy-workshops/routes.ts`
- `apps/api/src/scripts/data-migrations/20260829130000_seed_academy_workshop_viet_han_menu_template.ts`

### Web & shared contracts

- `apps/web/app/academy/workshops/register/[code]/AcademyWorkshopRegistration.module.css`
- `apps/web/app/academy/workshops/register/[code]/AcademyWorkshopRegistrationPage.tsx`
- `apps/web/app/dashboard/academy-leads/components/AcademyWorkshopAgendaManager.tsx`
- `apps/web/app/dashboard/academy-leads/components/AcademyWorkshopEquipmentManager.tsx`
- `apps/web/app/dashboard/academy-leads/components/AcademyWorkshopEquipmentTemplateLibrary.tsx`
- `apps/web/app/dashboard/academy-leads/components/AcademyWorkshopMenuManager.tsx`
- `apps/web/app/dashboard/academy-leads/components/AcademyWorkshopMenuTemplateLibrary.tsx`
- `apps/web/app/dashboard/academy-leads/components/AcademyWorkshopQuizManager.tsx`
- `apps/web/app/dashboard/academy-leads/components/AcademyWorkshopQuizTemplateLibrary.tsx`
- `apps/web/app/dashboard/academy-leads/components/AcademyWorkshopQuizTemplatePanel.tsx`
- `apps/web/app/dashboard/academy-leads/components/AcademyWorkshopSelectionDeadline.tsx`
- `apps/web/app/dashboard/academy-leads/components/AcademyWorkshopServerImageUpload.tsx`
- `apps/web/app/dashboard/academy-leads/components/useAcademyWorkshopEquipmentTemplates.ts`
- `apps/web/app/dashboard/academy-leads/components/useAcademyWorkshopMenuTemplates.ts`
- `apps/web/app/dashboard/academy-leads/workshops/[slug]/page.tsx`
- `apps/web/app/dashboard/academy-leads/workshops/page.tsx`
- `apps/web/app/page.tsx`
- `apps/web/lib/api-client.ts`
- `apps/web/public/academy/workshop-media/`
- `packages/shared/src/types/academy-workshop.ts`

## Tóm tắt thay đổi

- Thêm thư viện mẫu **thực đơn** và **bộ dụng cụ**: áp dụng mẫu vào workshop, cập nhật mẫu nguồn, hoặc lưu cấu hình hiện tại thành mẫu mới.
- Gắn thực đơn, bộ dụng cụ và game vào từng item Agenda thay vì suy luận bằng tên agenda; phần đăng ký công khai hiển thị đúng tại agenda được gắn.
- Thêm template game có truy vết mẫu nguồn và chức năng cập nhật ngược mẫu từ bản nháp workshop.
- Hỗ trợ upload ảnh minh họa cho câu hỏi game.
- Đặt sức chứa workshop mặc định là 10; bổ sung flow tạo workshop tương ứng.
- Thêm hạn riêng cho thay đổi **thực đơn** và **bộ dụng cụ**, khóa đúng từng lựa chọn khi hết hạn và hiển thị countdown cho học viên.
- Lưu snapshot món/bộ dụng cụ vào participant khi gửi đăng ký; autosave form và lựa chọn theo link workshop, khôi phục đúng sau F5.
- Bổ sung thực đơn mẫu **Nhà hàng Việt Hàn** gồm 3 nhóm và 9 lựa chọn.
- Chỉnh lại UI phần lựa chọn món/bộ dụng cụ trên trang đăng ký để dễ quét và nhất quán với hành trình agenda.

## Production migration plan

### CRM schema changes

1. `20260829103000_add_academy_workshop_menu_template_library`
   - Tạo bảng template thực đơn và các món trong template.
   - Không thay đổi dữ liệu workshop hiện hữu.
2. `20260829113000_add_academy_workshop_equipment_template_library`
   - Tạo bảng template bộ dụng cụ, package và ảnh.
   - Không thay đổi dữ liệu workshop hiện hữu.
3. `20260829120000_add_workshop_template_references_and_capacity_default`
   - Thêm reference template vào workshop và đổi default capacity thành 10.
   - Không thay đổi capacity của workshop hiện có.
4. `20260829133000_add_academy_quiz_template_source`
   - Thêm reference mẫu nguồn cho game workshop.
5. `20260829140000_add_workshop_menu_agenda_item`
   - Thêm một reference agenda cho thực đơn.
6. `20260829143000_add_agenda_resource_links`
   - Thêm một reference agenda cho bộ dụng cụ và reference agenda cho game.
7. `20260829150000_add_workshop_selection_change_deadline`
   - Thêm deadline dùng chung trước đây; cần áp dụng để giữ chuỗi schema hợp lệ.
8. `20260829153000_split_workshop_selection_deadlines`
   - Thêm deadline riêng cho thực đơn và dụng cụ.
   - Backfill giá trị deadline cũ sang cả hai cột cho workshop đã cấu hình deadline; đây là cập nhật dữ liệu một lần, không xóa dữ liệu.

### Production data migrations

1. `20260829130000_seed_academy_workshop_viet_han_menu_template`
   - Điều kiện: hai bảng template thực đơn đã tồn tại.
   - Tạo idempotent một template `Nhà hàng Việt Hàn` cùng 9 món mẫu nếu chưa có; không sửa template đã có món.

### Safety & validation

- `bash scripts/deploy/migration-plan.sh origin/main` đã liệt kê đúng 8 schema migration và 1 data migration ở trên.
- `pnpm --filter @mos-lab/api data-migrations:validate` đã pass: 12 production data migrations hợp lệ.
- Production deploy phải dùng script guarded `schema:apply:crm`/`deploy-production.sh`; không dùng `prisma migrate deploy` hoặc `--accept-data-loss`.

## Commit message đề xuất

```text
feat(academy): add workshop resource templates and registration persistence

- Add reusable menu and equipment templates with agenda resource assignments
- Persist menu and equipment choices through refresh and registration
- Add independent selection deadlines and the Việt Hàn menu template

AI-assisted. Reviewed and verified.
```

## Verification

- `pnpm --filter @mos-lab/api data-migrations:validate` ✅
- `pnpm --filter @mos-lab/web lint` ✅
- `pnpm --filter @mos-lab/web build` ✅
- Browser QA: thực đơn và bộ dụng cụ vẫn được khôi phục sau refresh ✅

## Approval requested

Vui lòng trả lời **OK/Proceed** để stage toàn bộ thay đổi, commit theo message trên và push `main`. Sau khi CI pass, mình sẽ hỏi lại trước khi deploy VPS.
