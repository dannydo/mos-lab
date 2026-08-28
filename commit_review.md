---
request_feedback: true
---

# Commit review — Academy Marketing & Sales CRUD

## Danh sách file thay đổi

| Khu vực                | File                                                                                                                                                                                                                                                                                  | Nội dung                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Shared access contract | `packages/shared/src/types/academy-sales.ts`                                                                                                                                                                                                                                          | Thêm cờ `canManage` cho Academy workspace.                                                                                        |
| Academy API            | `apps/api/src/modules/academy-sales/{academy-sales.service.ts,routes.ts,academy-campaign.service.ts,academy-talent-assessment.service.ts}`                                                                                                                                            | Cấp manager scope cho active `MARKETING_SALES` và áp dụng cho lead, campaign, học phí, khóa học, playbook, học bổng, import/sync. |
| Workshop API           | `apps/api/src/modules/academy-workshops/{routes.ts,academy-workshop.service.ts,academy-workshop-agenda-template.service.ts,academy-workshop-live.service.ts,academy-workshop-bonus.service.ts}`                                                                                       | Áp dụng CRUD scope cho workshop, agenda, phần thưởng và thưởng giáo viên.                                                         |
| Academy UI             | `apps/web/app/dashboard/academy-leads/{page.tsx,lead-manager/page.tsx,courses/page.tsx,payments/page.tsx,workshops/page.tsx,workshops/[slug]/page.tsx,campaigns/page.tsx,campaigns/[slug]/page.tsx,components/AcademyAccessGate.tsx,components/AcademyLeadTalentWorkshopOverlay.tsx}` | Hiển thị chính xác các thao tác CRUD theo quyền mới.                                                                              |
| Tests                  | `apps/api/src/modules/academy-sales/{academy-sales.service.test.ts,academy-campaign.service.test.ts,academy-campaign.routes.test.ts}`                                                                                                                                                 | Kiểm thử Marketing & Sales có manager scope và telesales Academy thường không nhận quyền đó.                                      |

## Tóm tắt thay đổi

- Thành viên **đang hoạt động** của đúng team `MARKETING_SALES` nhận quyền CRUD toàn bộ Academy: Học viên, Lead Manager, Chiến dịch, Workshop OS, Khóa học, học bổng và Thu học phí.
- Quyền được kiểm tra ở backend; giao diện chỉ phản ánh quyền từ API, không tự suy luận theo role frontend.
- Thành viên Academy khác vẫn giữ phạm vi xem/thao tác theo quyền hiện hữu.

## Kiểm tra đã chạy

- `pnpm --filter @mos-lab/shared build` — pass.
- `pnpm --filter @mos-lab/api exec tsc --noEmit` — pass.
- Scoped ESLint API và web — pass.
- 17 Academy service/campaign/route tests — pass.
- `pnpm --filter @mos-lab/web build` — pass.
- Kiểm tra giao diện Academy cục bộ — pass.
- `git diff --check` — pass.

## Commit message đề xuất

```text
feat(academy): grant marketing sales full CRUD access

- Grant active MARKETING_SALES members Academy management scope across leads, campaigns, workshops, courses, scholarships, and tuition payments
- Surface the shared CRUD permission consistently in Academy UI and cover the access boundary with tests

AI-assisted. Reviewed and verified.
```

## Production migration plan

- CRM schema changes: **None**.
- Pending production data migrations: **None**.
- `migration-plan.sh origin/main`: no schema or data migrations.
- `data-migrations:validate`: validated 10 existing production migration modules; no new migration will run.
