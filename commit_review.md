---
request_feedback: true
---

# Commit review

## Danh sách file thay đổi

- `.agents/AGENTS.md`
- `AGENTS.md`
- `apps/api/src/modules/customers/services/combo-recognition.service.ts`
- `apps/api/src/modules/kpi/routes/bk.routes.ts`
- `apps/api/src/modules/kpi/services/bk-salary.service.ts`
- `apps/web/app/dashboard/bk/components/BkDoneTab.tsx`
- `apps/web/app/dashboard/post-hub/components/PostHubApprovalStage.tsx`
- `apps/web/app/dashboard/post-hub/components/PostHubDataStage.tsx`
- `apps/web/app/dashboard/post-hub/components/PostHubPresentation.tsx`
- `apps/web/app/dashboard/post-hub/components/PostHubReviewDrawer.tsx`
- `apps/web/app/dashboard/post-hub/page.tsx`
- `apps/web/app/dashboard/staff/components/StaffColumns.tsx`
- `apps/web/app/dashboard/staff/components/StaffDirectoryToolbar.tsx` (new)
- `apps/web/app/dashboard/staff/page.tsx`
- `apps/web/app/globals.css`
- `apps/web/components/layout/SidebarNav.tsx`
- `apps/web/components/ui/__tests__/ui-primitives.test.tsx`
- `apps/web/config/sidebar.config.tsx`
- `apps/web/lib/api-client.ts`
- `packages/shared/src/types/bk.ts`

## Tóm tắt thay đổi

- **BK Done:** sửa nguồn tip từ ledger `staff_tip`; hiển thị combo đã bán và doanh thu combo; chuẩn hoá icon trạng thái vector; đổi nhãn Done/Missed; đổi tiêu đề cột `Hoa hồng OC` thành `Bonus Done`; thêm filter Tip và Combo qua typed API contract; nhận diện Combo Live đúng theo balance tại thời điểm làm dịch vụ, hiện nhãn `Combo Live` và trả fixed bonus 1.000đ/BK Done.
- **Combo recognition:** bổ sung nguồn dữ liệu tập trung để nhận diện combo Completed hợp lệ, loại trừ package `single/refill/balance`, đồng thời trả tên gói gọn theo dạng `Dịch vụ 10+6` và doanh thu net VND.
- **Post Hub:** rút gọn tên người đăng, bỏ hiển thị mã mOS nội bộ; tinh chỉnh Pending tag và toolbar action.
- **Nhân sự/Sidebar:** thay toolbar tìm kiếm/lọc nhân sự bằng primitive dùng lại, reset phân trang khi đổi lọc, căn giữa dữ liệu bảng, tổ chức menu HR thành nhóm Danh sách nhân sự/Cấu hình Đội nhóm và thêm test sidebar.

## Kiểm tra đã chạy

- `pnpm --filter @mos-lab/shared build`
- `pnpm --filter @mos-lab/api build`
- `pnpm --filter @mos-lab/web lint -- app/dashboard/bk/components/BkDoneTab.tsx lib/api-client.ts`
- Browser QA BK Done: vector status icons, Tip, Combo, Done và Missed filters.
- Browser QA Combo Live: đúng dòng `New Hyperlight 660` hiển thị `Combo Live` (không còn `Giảm: 0%`) và `+1.000 ₫` tại cột Bonus Done.

## Production migration plan

- **CRM schema changes:** None.
- **Production data migrations:** None.
- `bash scripts/deploy/migration-plan.sh origin/main`: no schema changes and no data migrations.
- `pnpm --filter @mos-lab/api data-migrations:validate`: validated 0 production data migrations.

## Commit message đề xuất

```text
feat(operations): enhance Booker reporting and staff workflows

- Add typed BK filters and the fixed 1K Combo Live Done bonus
- Polish BK status visuals, Post Hub metadata, and HR navigation

AI-assisted. Reviewed and verified.
```

## Approval needed

Worktree includes the BK reporting changes plus the existing Post Hub and HR/staff UI changes listed above. Approve this full scope and the proposed message before staging, committing, and pushing.
