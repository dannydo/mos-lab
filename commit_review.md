---
request_feedback: true
---

# Commit review — Academy public workshop registration

## Thay đổi đang chờ commit

| Khu vực                 | File                                                                                                                                                          | Nội dung                                                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CRM schema & migration  | `apps/api/prisma/crm.prisma`, `apps/api/src/scripts/data-migrations/20260827010000_backfill_academy_workshop_registration_links.ts`                           | Thêm `registration_code` (unique, nullable) và `registration_open`; backfill code công khai ổn định cho các workshop đã tồn tại.                                                                                          |
| Public registration API | `apps/api/src/modules/academy-workshops/academy-workshop-public.service.ts`, `public.routes.ts`, `zalo-social-identity.service.ts`                            | Public registration theo link; Google/Zalo OAuth; PKCE, signed state, HttpOnly cookie và ticket ngắn hạn.                                                                                                                 |
| Workshop operations     | `academy-workshop.service.ts`, `AcademyWorkshopEditButton.tsx`, `AcademyWorkshopSharedQrButton.tsx`, `AcademyWorkshopWorkspaceSections.tsx`, workshop listing | Sinh/chia sẻ link đăng ký, bật/tắt public registration, và chỉ mở lobby từ thời điểm check-in.                                                                                                                            |
| Public web & contracts  | `apps/web/app/academy/workshops/register/[code]/page.tsx`, `apps/web/lib/api-client.ts`, `packages/shared/src/types/academy-workshop.ts`                      | Trang đăng ký show agenda, Google/Zalo/form thường; khi Zalo API chưa có credential, trạng thái chờ cấu hình vẫn hiển thị rõ ràng; hợp đồng API có trạng thái registration, referrer, và trạng thái chờ Academy xác nhận. |
| Tests & config          | `academy-workshop-rules.test.ts`, `zalo-social-identity.service.test.ts`, `apps/api/.env.example`                                                             | Cover phase/lobby và signed Zalo OAuth; mô tả biến môi trường server-side.                                                                                                                                                |

## Kiểm tra đã chạy

- `pnpm --filter @mos-lab/shared build` — pass.
- `pnpm --filter @mos-lab/api exec tsc --noEmit` — pass.
- `pnpm --filter @mos-lab/api lint` và `pnpm --filter @mos-lab/web lint` — pass.
- 27 Academy/Zalo unit tests — pass.
- `pnpm --filter @mos-lab/web build` — pass.
- `git diff --check` — pass.

## Production migration plan

1. **Schema:** guarded `prisma db push` thêm hai cột vào `crm_academy_workshops`:
   - `registration_code VARCHAR(48) NULL UNIQUE` — ban đầu nullable để an toàn với dữ liệu cũ.
   - `registration_open TINYINT NOT NULL DEFAULT 1`.
2. **Data migration:** `20260827010000_backfill_academy_workshop_registration_links`.
   - Chỉ cập nhật workshop đang thiếu `registration_code`.
   - Mỗi code được tạo deterministic từ `id` và `display_code`; không xoá hay thay đổi participant/lead/lịch hẹn.
   - Idempotent: workshop đã có code không bị chạm lại.
3. `bash scripts/deploy/migration-plan.sh origin/main` nhận diện đúng schema + migration trên; `pnpm --filter @mos-lab/api data-migrations:validate` đã xác thực 4 migration production.

## Cấu hình Zalo đã thực hiện bên ngoài

- Dùng Zalo Developer App **MasterOS** đang được WingsApp sử dụng.
- Đã xác thực domain `api.lab.masteros.app`.
- Đã thêm và lưu callback:
  `https://api.lab.masteros.app/api/academy/workshops/registration/zalo/callback`
- Production API vẫn cần bốn biến server-only: `ZALO_SOCIAL_APP_ID`, `ZALO_SOCIAL_SECRET_KEY`, `ZALO_SOCIAL_REDIRECT_URI`, `ZALO_SOCIAL_STATE_SECRET`.

## Commit đề xuất

```text
feat(academy): add public workshop registration with social auth

- Add agenda showcase and pending-attendee registration flow
- Support Google and secure Zalo OAuth registration
- Add safe registration-link schema backfill for existing workshops

AI-assisted. Reviewed and verified.
```

## Approval required

Xác nhận `Proceed` để mình commit/push. Sau khi CI pass, mình sẽ xin xác nhận deploy VPS theo workflow bắt buộc.
