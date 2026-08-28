---
request_feedback: true
---

# Commit review — Academy Marketing & Sales access

## Danh sách file thay đổi

| Khu vực                  | File                                                                                                                                                                                                                                            | Nội dung                                                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Academy workspace        | `apps/api/src/modules/academy-sales/academy-sales.service.ts`, `apps/api/src/modules/teams/team.service.ts`, `apps/api/src/modules/academy-sales/routes.ts`, `apps/api/src/modules/academy-workshops/routes.ts`                                 | Cấp workspace Academy cho thành viên active của các team thuộc Department Academy, gồm Marketing & Sales; vẫn giữ fallback roster cũ. |
| Tuition data scope       | `apps/api/src/modules/academy-sales/academy-talent-assessment.service.ts`, `apps/web/app/dashboard/academy-leads/payments/page.tsx`                                                                                                             | Thành viên không phải Manager chỉ xem học phí của lead trong phạm vi được giao; không thể xác nhận thu tiền.                          |
| Sidebar & policy         | `packages/shared/src/types/menu-access.ts`, `apps/web/config/sidebar.config.tsx`, `apps/web/app/dashboard/academy-leads/components/AcademyAccessGate.tsx`                                                                                       | Thêm Workshop OS vào policy menu, hiển thị Thu học phí cho thành viên Academy đủ điều kiện và đồng bộ thông điệp quyền.               |
| Tests                    | `apps/api/src/modules/academy-sales/academy-sales.service.test.ts`, `apps/api/src/modules/menu-access/menu-access.service.test.ts`                                                                                                              | Cover team Marketing & Sales, lead scope cho non-manager và Workshop OS visibility.                                                   |
| Workshop registration UI | `apps/web/app/academy/workshops/components/AcademyWorkshopRegistrationHero.tsx`, `apps/web/app/academy/workshops/components/GoogleWorkshopJoinButton.tsx`, `apps/web/app/academy/workshops/register/[code]/AcademyWorkshopRegistrationPage.tsx` | Di chuyển nút theme, tăng bề rộng Google sign-in và cho phép nút chiếm toàn vùng form.                                                |
| Review artifact          | `commit_review.md`                                                                                                                                                                                                                              | Cập nhật review cho toàn bộ working tree hiện tại.                                                                                    |

## Tóm tắt thay đổi

- Marketing & Sales được công nhận là team Academy hợp lệ, nên có thể vào Học viên, Lead Manager, Chiến dịch, Workshop OS, Khóa học và Thu học phí.
- Dữ liệu học phí của thành viên không phải Manager bị giới hạn theo lead scope; hành động xác nhận thu tiền vẫn chỉ dành cho Admin/Manager.
- Workshop OS được quản trị qua policy menu thay vì là một submenu không có key quyền riêng.
- Giao diện đăng ký workshop công khai có hero gọn hơn và Google sign-in rộng, dễ thao tác hơn.

## Kiểm tra đã chạy

- `pnpm --filter @mos-lab/shared build` — pass.
- `pnpm --filter @mos-lab/api exec tsc --noEmit` — pass.
- Scoped ESLint cho các file API, web và shared thay đổi — pass.
- `pnpm exec tsx --test apps/api/src/modules/academy-sales/academy-sales.service.test.ts apps/api/src/modules/menu-access/menu-access.service.test.ts` — 16 tests pass.
- `pnpm --filter @mos-lab/web build` — pass.
- `git diff --check` — pass.

## Production migration plan

- CRM schema changes: **None**.
- Production data migrations included in this commit: **None**.
- `bash scripts/deploy/migration-plan.sh origin/main` báo `none` cho cả schema và data migrations.
- `pnpm --filter @mos-lab/api data-migrations:validate` pass; đã xác thực 10 production migration hiện có. Không migration ID nào sẽ được chạy bởi commit này.

## Commit đề xuất

```text
feat(academy): grant marketing team workspace access

- Authorize active Academy Department teams and scope tuition ledgers to owned leads
- Add Workshop OS to the menu-policy matrix and expose tuition view to eligible members
- Polish the public workshop registration theme and Google sign-in layout

AI-assisted. Reviewed and verified.
```

## Approval required

Reply **`Proceed`** để mình commit và push toàn bộ working tree theo message trên. Sau khi CI pass, mình sẽ xin xác nhận riêng trước khi deploy VPS.
