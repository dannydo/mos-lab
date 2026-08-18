---
request_feedback: true
---

# Commit review — BK/CC/CV leaderboard refinement

## Danh sách file thay đổi

- `apps/api/src/modules/kpi/routes/bk.routes.ts`
- `apps/web/app/dashboard/bk/components/BkBookingTab.tsx`
- `apps/web/app/dashboard/bk/components/BkDoneTab.tsx`
- `apps/web/app/dashboard/bk/components/BkRevenueTab.tsx`
- `apps/web/app/dashboard/bk/components/BkThuNhapTab.tsx`
- `apps/web/app/dashboard/bk/components/BkTipTab.tsx`
- `apps/web/app/dashboard/bk/page.tsx`
- `apps/web/app/dashboard/cc/page.tsx`
- `apps/web/app/dashboard/cv/page.tsx`
- `apps/web/app/dashboard/layout.tsx`
- `apps/web/app/globals.css`
- `packages/shared/src/types/bk.ts`

## Tóm tắt thay đổi

- Chuẩn hoá trải nghiệm BK Leaderboard: nhãn tab, tiêu đề leaderboard/bảng chi tiết, bộ lọc Done/Tip/Combo, avatar khách hàng và Booker, cùng trạng thái dùng vector icon.
- Đồng bộ báo cáo doanh thu Booker cho riêng nhóm Telesales; dùng doanh thu net của đơn `Completed` theo thời điểm check-in thực tế, làm tròn VND và dùng cùng cơ sở cho thưởng doanh thu.
- Bổ sung hiển thị combo, combo live, tip và bonus Done; tách tổng thưởng Tip và Doanh Thu trên paystub.
- Điều chỉnh header/filter của CC và CV theo bố cục BK; rút gọn điều hướng BK và đưa màn hình vận hành vào menu `Khác`.
- Sửa vùng cuộn sidebar để mọi mục menu vẫn truy cập được trên viewport thấp.

## Kế hoạch migration production

- CRM schema changes: **None**.
- Production data migrations: **None**.
- Kiểm tra `migration-plan.sh origin/main`: không có schema change hoặc data migration pending.
- Kiểm tra `data-migrations:validate`: hợp lệ, 0 migration production.

## Commit message đề xuất

```text
feat(kpi): refine BK leaderboard reporting

- Align BK leaderboard data, bonus views, and Telesales scope
- Improve report navigation, responsive headers, and table presentation

AI-assisted. Reviewed and verified.
```
