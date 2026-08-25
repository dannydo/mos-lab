---
request_feedback: true
---

# Commit review — Compact Google sign-in for workshop lobby

## Danh sách file thay đổi

- `apps/web/app/academy/workshops/lobby/[code]/page.tsx`
- `apps/web/app/academy/workshops/components/GoogleWorkshopJoinButton.tsx`
- `commit_review.md`

## Tóm tắt thay đổi

- Rút khối Google sign-in còn tiêu đề **Dùng Gmail để vào** và một câu mô tả ngắn, dễ hiểu.
- Thu gọn padding, tiêu đề, khoảng trống và empty state trên màn hình nhỏ để lobby gọn hơn ở viewport iPhone 12 (390 × 844).
- Giới hạn Google Identity button ở 320px, vẫn co theo chiều rộng màn hình nên không tràn ngang card trên điện thoại.
- Không thay đổi Google credential, API, quy tắc check-in, hay trạng thái tải/lỗi.

## Commit message đề xuất

```text
fix(workshops): compact Google sign-in on mobile

- Shorten the Google lobby copy for first-time attendees
- Reduce lobby spacing and heading scale on phone screens
- Cap the Google Identity button width at 320px

AI-assisted. Reviewed and verified.
```

## Production migration plan

- CRM schema: **None**.
- Production data migrations: **None**.
- Frontend-only change; Vercel deploys automatically after pushing `main`.

## Verification

- `pnpm --filter @mos-lab/web exec eslint "app/academy/workshops/lobby/[code]/page.tsx" "app/academy/workshops/components/GoogleWorkshopJoinButton.tsx"`: passed.
- `pnpm --filter @mos-lab/web build`: passed (production compilation and TypeScript).
- `pnpm --filter @mos-lab/api data-migrations:validate`: passed.
- `bash scripts/deploy/migration-plan.sh origin/main`: no CRM schema or data migration changes.
- Browser QA will verify the live Vercel deployment at 390 × 844 before handoff.
