---
name: e2e-crawler-benchmark
description: >
  Hệ thống Bot tự động giả lập người dùng duyệt qua toàn bộ hệ thống mos-lab (các trang, tab, popup, drawer),
  đo đạc thời gian tải thực tế trên browser (TTFB, FCP, LCP, Network latency), thu thập slow queries từ
  backend Fastify & Prisma, và xuất báo cáo kép (HTML Dashboard trực quan + Markdown summary).
---

# 🤖 E2E Crawler & Benchmark Suite (mos-lab)

## Overview
Skill này đóng vai người dùng thật điều hướng tự động trên toàn bộ hệ thống `mos-lab`:
1. Mở từng trang theo cấu trúc Sidebar & Routing.
2. Click từng Tab và kiểm tra thời gian chuyển đổi.
3. Mở các Modal/Drawer, đo thời gian render, chụp ảnh màn hình và đóng an toàn (**Tuyệt đối KHÔNG submit tạo/xóa dữ liệu**).
4. Đo lường chính xác các chỉ số Core Web Vitals: Navigation Timing, TTFB, FCP, LCP, và tổng thời gian tải.
5. Ghi nhận các yêu cầu mạng bị chậm (> 1.000ms) và các câu truy vấn SQL chậm (> 500ms) từ Prisma Backend.
6. Xuất báo cáo kép: Dashboard HTML trực quan (`output/benchmark/report.html`) và bản tóm tắt Markdown (`output/benchmark/BENCHMARK_REPORT.md`).

---

## Trigger Phrases
- "kiểm tra toàn bộ chức năng"
- "chạy benchmark"
- "đo thời gian các trang"
- "craw toàn bộ hệ thống"
- "tìm slow queries"
- "kiểm tra hiệu năng web"
- "chạy bot giả lập người dùng"

---

## Hướng Dẫn Thực Thi (Workflow)

### Bước 1: Đảm bảo Dev Server đang chạy
Trước khi chạy bot, kiểm tra xem máy chủ Web và API đã khởi động hay chưa:
- Web: `http://localhost:4000`
- API: `http://localhost:4001`
Nếu chưa chạy, sử dụng skill `start-servers` hoặc chạy `pnpm dev`.

### Bước 2: Khởi chạy Benchmark
Agent thực thi lệnh tương ứng với yêu cầu của người dùng:

1. **Chế độ Nhanh (Quick Run - ~1 phút, chỉ quét các màn hình chính cốt lõi)**:
   ```bash
   pnpm benchmark:crawl:quick
   ```

2. **Chế độ Toàn diện (Full Audit - Quét sâu 100% tất cả các màn hình, tab, popup)**:
   ```bash
   pnpm benchmark:crawl
   ```

3. **Chế độ Xem Trực quan (Headed Mode - Hiện cửa sổ trình duyệt)**:
   ```bash
   node scripts/crawler-benchmark/index.mjs --headed
   ```

### Bước 3: Đọc và Tóm tắt Báo cáo
Sau khi chạy xong:
1. Đọc tệp tóm tắt `output/benchmark/BENCHMARK_REPORT.md`.
2. Báo cáo lại cho Danny:
   - Tổng số trang đã quét và thời gian tải trung bình.
   - Top 3 trang chạy chậm nhất cần chú ý.
   - Danh sách các câu truy vấn SQL chạy chậm (>500ms) nếu có, kèm gợi ý đánh Index hoặc tối ưu hóa truy vấn.
   - Đường dẫn mở xem Dashboard trực quan: `output/benchmark/report.html`.
