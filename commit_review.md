---
request_feedback: true
---

# Hotfix Commit Review

## Danh sách file thay đổi

- `apps/web/config/sidebar.config.tsx`
- `packages/shared/src/types/menu-access.ts`

## Tóm tắt thay đổi

- Đưa mục **Lịch hẹn của tôi** vào cuối nhóm **Khách hàng & Chiến dịch** thay vì nhóm **Vận hành cuộc gọi**.
- Đồng bộ menu-access để quyền hiển thị của Lịch hẹn theo đúng nhóm Khách hàng & Chiến dịch.
- Đặt **Chiến dịch NYC** trước **Chiến dịch LoCa** trong sidebar.

## Commit message đề xuất

```text
fix(web): reorder customer navigation sidebar

- Move My Appointments to the CRM navigation group
- Place NYC campaigns before LoCa and align menu access metadata

AI-assisted. Reviewed and verified.
```

## Production migration plan

- CRM schema changes: None.
- New production data migrations in this hotfix: None.
- `bash scripts/deploy/migration-plan.sh origin/main`: no schema or production data migrations detected.
- `pnpm --filter @mos-lab/api data-migrations:validate`: passed; the repository's one existing production data migration is valid and no new migration is included in this change.

## Validation

- Scoped ESLint passed for `apps/web/config/sidebar.config.tsx` and `packages/shared/src/types/menu-access.ts`.
- Verified the two requested sidebar orders directly on the local appointments page.
