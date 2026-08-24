---
request_feedback: true
---

# Commit review — Telesales roster and Done KPI hotfix

## Kết luận review

Hotfix đã được kiểm tra local và trên dashboard. Yêu cầu “hotfix it on prod in 1 go” được xem là phê duyệt commit, push, CI và deploy cho thay đổi này; rollout vẫn dừng ngay nếu CI, migration guard hoặc xác minh release thất bại.

## Danh sách file thay đổi

- `apps/api/src/modules/kpi/routes.ts`
- `apps/api/src/modules/kpi/services/salary-calculator.ts`
- `apps/web/components/TelesalesDashboardModal.tsx`
- `apps/web/components/telesales/components/TelesalesConfigPanel.tsx`
- `apps/web/components/telesales/hooks/useTelesalesDashboard.ts`

Tổng cộng: 5 file implementation, 81 dòng thêm và 220 dòng xóa.

## Tóm tắt thay đổi

- Leaderboard telesales chỉ lấy các thành viên active của team `BK_TELESALES`; không còn lọc theo CRM role hoặc danh sách lưu trên trình duyệt.
- Đồng bộ nguồn tính Booker salary/KPI với roster `BK_TELESALES`. Vì vậy thành viên như Tâm Nguyễn, có CRM role `admin` nhưng thuộc team, được tính Done đúng.
- Giữ đúng định nghĩa chỉ số: Booked theo `date_created`; Done theo đơn `Completed` và check-in thực tế.
- Loại bỏ roster và số liệu giả trên UI. Cấu hình chỉ hiển thị roster read-only từ backend, còn mục tiêu cấp độ vẫn chỉnh được.

## Production migration plan

### CRM schema thay đổi trong hotfix

None. `migration-plan.sh origin/main` báo không có schema thay đổi trong hotfix này.

### Production data migrations pending

- `20260823180000_seed_academy_organization_defaults`
  - Mô tả: seed catalog Academy, giảng viên, cơ cấu Department/Team mặc định và các identity Super Admin chuẩn.
  - Tác động dự kiến: upsert dữ liệu Academy và Department/Team; chỉ promote canonical admin identities. Migration idempotent, chạy trong transaction và được deploy script kiểm tra/ghi ledger.
  - Lưu ý: migration này đã tồn tại trên nhánh `main`, không được tạo bởi hotfix. Nó đang pending trên production và guarded deploy script sẽ áp dụng theo quy trình bắt buộc.

`pnpm --filter @mos-lab/api data-migrations:validate` đã pass, xác nhận 1 production data migration hợp lệ.

## Verification

- `pnpm --filter @mos-lab/api lint` — pass.
- `pnpm exec tsc --noEmit` trong `apps/api` — pass.
- `pnpm --filter @mos-lab/api exec tsx --test src/modules/kpi/services/bk-salary.service.test.ts` — 4/4 pass.
- Dashboard local tháng này: Tâm Nguyễn hiển thị đúng **41 Booked** và **30 Done Deal**.
- `git diff --check` — pass (Git fsmonitor cục bộ có cảnh báo IPC không ảnh hưởng kết quả kiểm tra).

## Commit đề xuất

```text
fix(kpi): align telesales roster and Done metrics

- Source the telesales leaderboard and KPI calculations from BK_TELESALES
- Include active team members regardless of their CRM role
- Remove browser-local roster filtering and placeholder dashboard metrics

AI-assisted. Reviewed and verified.
```
