# Frontend Theme Customization Rules

Để đảm bảo hệ thống hỗ trợ cả giao diện sáng (Light Theme) và tối (Dark Theme) chính xác, tất cả các tác vụ cập nhật giao diện trong tương lai cần tuân thủ nghiêm ngặt các quy tắc sau:

## 1. Cơ chế hoạt động của Theme
* Hệ thống sử dụng một biến trạng thái toàn cục `themeMode` ('light' | 'dark') được cấp phát qua `useTheme()` trong `ThemeContext.tsx`.
* Khi `themeMode` thay đổi, class `.light-theme` hoặc `.dark-theme` tương ứng sẽ được áp dụng trực tiếp lên thẻ `<html>` gốc (`document.documentElement`).

## 2. Quy tắc ghi đè CSS (CSS Overrides Rules)
* **Tuyệt đối KHÔNG** hardcode trực tiếp các thuộc tính màu nền tối (như `background: #141414 !important` hoặc `color: #fff`) trong các selector CSS toàn cục.
* Toàn bộ các quy tắc ghi đè màu sắc của thư viện (như `ant-table`, `ant-drawer`, `ant-tabs`) phải được phân vùng rõ ràng theo cấu trúc phân cấp dưới class theme của thẻ gốc:
  
  ```css
  /* Ghi đè màu sắc chỉ áp dụng cho Dark Theme */
  .dark-theme .antd-custom-table .ant-table {
    background: #141414 !important;
    color: #ccc !important;
  }
  
  /* Ghi đè màu sắc chỉ áp dụng cho Light Theme */
  .light-theme .antd-custom-table .ant-table {
    background: #ffffff !important;
    color: #333333 !important;
  }
  ```

## 3. Sử dụng inline style trong React
* Đối với các thuộc tính màu sắc viết trực tiếp bằng React `style={{ ... }}`, **luôn luôn** sử dụng toán tử điều kiện dựa trên trạng thái `themeMode` thay vì hardcode một giá trị màu cố định:
  
  * **Sai:** `style={{ background: '#141414', border: '1px solid #2a2a2a' }}`
  * **Đúng:** `style={{ background: themeMode === 'dark' ? '#141414' : '#ffffff', border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#e8e8e8'}` }}`

* Hoặc tối ưu hơn, hãy sử dụng các Design Token chính thức của Ant Design bằng hook `theme.useToken()`:
  ```typescript
  const { token } = theme.useToken();
  // Sử dụng token.colorBgContainer, token.colorBorderSecondary, v.v.
  ```

## 4. Kiểm thử trước khi đẩy code
* Trước khi hoàn thành chỉnh sửa UI, lập trình viên/Agent phải thực hiện kiểm thử giao diện bằng cách nhấp vào biểu tượng theme (mặt trời/mặt trăng) trên header để verify các bảng biểu, modal, drawer và văn bản hiển thị rõ ràng trên cả hai nền sáng và tối.

---

# Booker Salary API Configuration & Usage Rules

Để đảm bảo an toàn thông tin và tính riêng tư của dữ liệu doanh nghiệp mos-lab, các tác vụ liên quan đến API xuất dữ liệu tính lương Booker phải tuân thủ nghiêm ngặt quy tắc sau:

## 1. Tính độc lập của API (No Shared API)
* **Tuyệt đối KHÔNG** sử dụng chung hoặc gọi trực tiếp đến API ngoài của Wingslashes (`api.wingslashes.com`).
* Toàn bộ việc xuất dữ liệu và tính lương cho Booker phải được xử lý độc lập và khép kín qua endpoint nội bộ của Fastify tại:
  `GET /api/kpi/export-booker-salary`
* Mọi ứng dụng liên kết (như Google Sheets, App Scripts) hoặc các Module tính toán Leaderboard bắt buộc phải chuyển hướng cấu hình gọi qua domain nội bộ của hệ thống mos-lab với API key đi kèm:
  `?key=FDC0D0A177694777A&booker=...&date_from=...&date_to=...`

