---
name: e2e-crawler-benchmark
description: >
  Hệ thống Bot tự động giả lập người dùng duyệt qua toàn bộ hệ thống mos-lab (các trang, tab, popup, drawer),
  đo đạc thời gian tải thực tế trên browser (TTFB, FCP, LCP, Network latency), thu thập slow queries từ
  backend Fastify & Prisma, đo bundle/responsive Core Web Vitals, đối chiếu API Cold/Warm & SQL, và xuất
  báo cáo Markdown trực quan dễ hiểu (Baseline Audit hoặc Before vs After khi tối ưu).
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
- "kiểm tra performance"
- "báo cáo performance"
- "báo cáo hiệu năng trước và sau"
- "so sánh trước và sau khi tối ưu"

---

## Hướng Dẫn Thực Thi (Workflow)

### Bước 1: Đảm bảo Dev Server đang chạy
Trước khi chạy bot, kiểm tra xem máy chủ Web và API đã khởi động hay chưa:
- Web: `http://localhost:4000`
- API: `http://localhost:4001`
Nếu chưa chạy, sử dụng skill `start-servers` hoặc chạy `pnpm dev`.

### Bước 2: Khởi chạy Benchmark
Agent thực thi lệnh tương ứng với yêu cầu của người dùng:

1. **Audit Production Cô Lập (Khuyến nghị khi kiểm tra hoặc đối chiếu trước/sau tối ưu)**:
   - Build bản production tách biệt: `pnpm qa:responsive:performance:build` (`.next-performance`) và build API (`pnpm --filter @mos-lab/api build` nếu test backend).
   - Khởi chạy API (`:4001`) + Web (`:4002`) cô lập, chạy `PERF_USE_EXISTING_SERVERS=1 pnpm qa:responsive:performance`, đo `curl` 3 lượt (Cold & Warm Avg + Content-Encoding/bytes) và Playwright probe các route mục tiêu; nhớ tắt toàn bộ server tạm sau khi đo xong.

2. **Chế độ Nhanh (Quick Run - ~1 phút, chỉ quét các màn hình chính cốt lõi)**:
   ```bash
   pnpm benchmark:crawl:quick
   ```

3. **Chế độ Toàn diện (Full Audit - Quét sâu 100% tất cả các màn hình, tab, popup)**:
   ```bash
   pnpm benchmark:crawl
   ```

4. **Chế độ Xem Trực quan (Headed Mode - Hiện cửa sổ trình duyệt)**:
   ```bash
   node scripts/crawler-benchmark/index.mjs --headed
   ```

### Bước 3: Xuất Báo Cáo Trực Quan & Dễ Hiểu (Mandatory Format)
Mỗi khi báo cáo kết quả benchmark (hoặc đối chiếu **Before vs After** sau khi tối ưu), **BẮT BUỘC** đọc và trình bày theo mẫu chuẩn tại [`references/before-after-report-template.md`](./references/before-after-report-template.md), tuân thủ các nguyên tắc:
1. **Trình bày bằng tiếng Việt rõ ràng, thân thiện với người điều hành**, giải thích ngắn gọn "vì sao nhanh/chậm hơn" kèm nguyên nhân gốc thay vì chỉ thả log thô.
2. **Dẫn số liệu đo trực tiếp & thống nhất đơn vị** (`ms`, `B`/`KB`/`MB`, `br`/`raw`, Cold vs Warm Avg, `×` lần / `%` thay đổi). Tuyệt đối không bịa hoặc suy diễn con số chưa đo.
3. **Bắt buộc có Bảng Điểm Nhấn Tổng Hợp (`Executive Highlights`)** đặt ngay đầu báo cáo + bảng chi tiết tách rõ **Frontend (Bundle, CSS, CWV, DOM)** và **Backend (API Polling, Payload, SQL, Cache)**.
4. **Bắt buộc có Biểu đồ Mermaid `xychart-beta`** so sánh trực quan nhóm chỉ số cùng thang đo/đơn vị (các chỉ số vượt thang đo hoặc timeout tách thành ghi chú dưới biểu đồ).
5. **Kèm ngữ cảnh môi trường đo** (cổng chạy, độ trễ DB RTT nếu đo qua VPN/Tailscale), **xác minh chất lượng** (`verify:quick`, unit tests, `check:ui-contract`, `check:code-health`), **bảng Commit/CI/Deploy** (nếu đã phát hành), **link `file://`** click được tới mọi file nguồn/artifact liên quan, và tuân thủ ngôn ngữ tôn trọng Wings (`CV`, `CVL`, `CVLL` — tuyệt đối không dùng từ cấm).
