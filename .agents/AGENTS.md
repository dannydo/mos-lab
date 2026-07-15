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

---

# Workspace Isolation and External Code Modification Rules

Để tránh việc Agent vô tình chỉnh sửa mã nguồn của các dự án/workspace khác khi đang làm việc trong workspace này:

## 1. Hạn chế phạm vi hoạt động (Workspace Isolation)
* Agent **được phép ĐỌC** thông tin từ các tệp tin nằm ngoài thư mục workspace hiện tại (`/Users/dannydo/projects/mos-lab`) để tham khảo, đối chiếu hoặc tìm hiểu ngữ cảnh phục vụ công việc.
* Tuy nhiên, **tuyệt đối KHÔNG tự ý chỉnh sửa (ghi, tạo mới hoặc thay đổi)** bất kỳ tệp tin nào nằm ngoài thư mục workspace hiện tại.
* Nếu người dùng yêu cầu chỉnh sửa hoặc ghi tệp tin nằm ngoài workspace hiện tại, Agent **bắt buộc phải cảnh báo người dùng** trước khi thực hiện:
  * Nêu rõ đường dẫn tuyệt đối của tệp tin/dự án ngoài workspace sẽ bị tác động.
  * Yêu cầu xác nhận rõ ràng từ người dùng (ví dụ: "Bạn có chắc chắn muốn chỉnh sửa tệp tin ngoài workspace này không?") trước khi gọi bất kỳ công cụ ghi/sửa tệp tin nào (`write_to_file`, `replace_file_content`, v.v.).

## 2. Xác thực trước khi sửa đổi
* Chỉ tiến hành thay đổi mã nguồn ở workspace khác khi và chỉ khi nhận được sự đồng ý bằng văn bản rõ ràng từ người dùng trong phiên chat hiện tại.

---

# Hybrid Styling Workflow: Ant Design 5 & Tailwind CSS v4

Để xây dựng giao diện ứng dụng quản lý `mos-lab` vừa vững chắc về tính năng, vừa có tính thẩm mỹ cao (Premium UI) và đồng bộ, Agent cần tuân thủ workflow phối hợp sau:

## 1. Phân chia vai trò công nghệ
* **Ant Design 5 (Trụ cột chức năng):** Sử dụng các component sẵn có của Antd cho các thành phần có trạng thái (state) phức tạp, tương tác dữ liệu cao hoặc cần tuân thủ form/bảng biểu:
  * `<Table>`, `<Form>`, `<Form.Item>`, `<Select>`, `<DatePicker>`, `<Modal>`, `<Drawer>`, `<Tabs>`, `<Steps>`, `<Upload>`.
* **Tailwind CSS v4 (Thẩm mỹ & Bố cục):** Sử dụng các utility classes của Tailwind để dựng bố cục, căn lề, khoảng cách, và trang trí nâng cao:
  * Layout: `grid`, `flex`, `gap-*`, `w-*`, `h-*`.
  * Visual: Gradient nền (`bg-gradient-to-r`), hiệu ứng bóng mờ (`shadow-*`), bo góc (`rounded-*`), và backdrop-filter (glassmorphism).
  * Animations: Hiệu ứng hover, chuyển cảnh mượt mà (`transition-all duration-300 ease-in-out hover:scale-[1.02]`).

## 2. Quy tắc tích hợp & Tránh xung đột
* **Không lạm dụng custom CSS:** Ưu tiên dùng Tailwind class trực tiếp trên thẻ hoặc cấu hình `className` của Antd. Hạn chế tối đa việc viết thêm file `.css` mới trừ khi ghi đè (override) component của Antd.
* **Ghi đè phong cách Antd (Antd Customization):**
  * Sử dụng thuộc tính `className` kết hợp với Tailwind (ví dụ: `<Card className="shadow-lg border border-slate-100 dark:border-slate-800">`).
  * Khi cần ghi đè CSS sâu của Antd (ví dụ `.ant-table`), hãy đặt trong các block CSS phân vùng rõ ràng theo theme `.dark-theme` / `.light-theme` trong file CSS toàn cục như quy định ở phần "Frontend Theme Customization Rules".
* **Đồng bộ màu sắc với Design Tokens:**
  * Khi dùng Tailwind class hoặc inline style liên quan đến màu sắc, hãy đảm bảo chúng khớp với trạng thái `themeMode` hiện tại.
  * Ưu tiên dùng CSS Variables hoặc Antd Design Tokens (`theme.useToken()`) để các màu sắc (background, border, text) tự động thay đổi khi chuyển đổi qua lại giữa Light/Dark theme.

## 3. Tiêu chuẩn giao diện cao cấp (Premium UI)
* **Tránh giao diện mặc định đơn điệu:** Tuyệt đối không để nguyên giao diện mặc định thô cứng của Antd. Hãy bo tròn các góc mềm mại hơn, thêm shadow nhẹ, và dùng màu nền tinh tế (thay vì màu xám/trắng mặc định).
* **Micro-animations:** Thêm hiệu ứng transition nhẹ nhàng khi hover vào các thẻ card, nút bấm hoặc dòng trong bảng để giao diện có cảm giác "sống động" và phản hồi tốt.
* **Không dùng hình ảnh giữ chỗ (placeholders):** Sử dụng biểu tượng SVG chất lượng cao hoặc sinh ảnh thực tế bằng công cụ AI nếu cần minh họa.

---

# External Server Details (Image Storage Server)
*Đây là thông tin cấu hình máy chủ dùng để lưu trữ ảnh cho dự án Wings Lashes (tác vụ phân tích tiếng cười đã chuyển qua sử dụng trực tiếp Gemini API).*

*   **IP:** `75.119.148.205`
*   **Port:** `22`
*   **User:** `root`
*   **Password:** `qyRUPgRjsV26FYD6qcUe`
*   **Ghi chú:** Máy chủ chạy Ubuntu 20.04 LTS, có 31GB RAM trống và 8 vCPUs (AMD EPYC). Không được hỏi lại người dùng thông tin này.


