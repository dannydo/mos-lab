# 🏛️ Domain Slice Architecture Canon Template

> **Phiên bản**: 1.0.0  
> **Áp dụng cho**: Toàn bộ hệ thống `mos-lab` (`apps/web`, `apps/api`, `packages/shared`).  
> **Mục tiêu**: Phân rã triệt để các tệp God-files / Monolithic Components thành các Domain Slices độc lập, dễ mở rộng, kiểm thử tự động 100% và bảo toàn tương thích ngược (Zero Regression).

---

## 1. Nguyên lý Cốt lõi (Core Principles)

### 1.1. Single-Responsibility Subcomponents

- Mỗi thành phần giao diện chỉ đảm nhận một miền chức năng duy nhất:
  - Sidebar / Navigation (`*Sidebar.tsx`)
  - Feed & Timeline (`*MessageFeed.tsx` / `*ListFeed.tsx`)
  - Input & Action Bar (`*Composer.tsx` / `*ActionBar.tsx`)
  - Contextual Panels & Drawers (`*Drawer.tsx` / `*DetailPane.tsx`)
  - Modals & Overlays Container (`*Modals.tsx`)
- Container cha (`*Portal.tsx` / `*Container.tsx`) chỉ đóng vai trò nhạc trưởng điều phối state, bus sự kiện và socket/SSE realtime.

### 1.2. Backend Domain Services (Strangler Fig Pattern)

- Tách tệp `routes.ts` đồ sộ thành các dịch vụ chuyên biệt:
  - File & Media I/O (`*-file.service.ts`)
  - Quyền truy cập & Phân quyền (`*-access.service.ts`)
  - Định dạng hiển thị & Read Receipts (`*-format.service.ts`)
  - Thực thi nghiệp vụ & Đồng bộ Database (`*-repository.service.ts` / `*-workflow.service.ts`)
- **Tương thích ngược tuyệt đối (Backward-Compatibility Re-export)**: `routes.ts` bắt buộc re-export lại tất cả các hàm tiện ích mà unit test hoặc các module khác đang import, đảm bảo 0 dòng test nào bị gãy khi refactor.

### 1.3. NodeNext Invariant (`.js` extensions)

- Mọi relative import trong `apps/api` **bắt buộc** phải kết thúc bằng đuôi `.js` (ví dụ: `import { ... } from './chat-access.service.js'`), tuân thủ nghiêm ngặt cấu hình module NodeNext của TypeScript.

---

## 2. Bản đồ Cấu trúc Chuẩn của một Domain Slice

```
apps/web/components/<domain>/
├── <Domain>Portal.tsx               # Orchestrator Container (~500 - 1500 LOC)
├── components/
│   ├── <Domain>Sidebar.tsx         # Sidebar, tìm kiếm, lọc danh mục
│   ├── <Domain>Composer.tsx        # Khung nhập liệu, upload, định dạng
│   ├── <Domain>MessageFeed.tsx     # Dòng thời gian, danh sách bản ghi
│   ├── <Domain>ThreadDrawer.tsx    # Drawer chi tiết bên phải / Sub-views
│   ├── <Domain>TasksPane.tsx       # Bảng quản lý công việc liên kết
│   ├── <Domain>PinnedPane.tsx      # Bảng tin nhắn / mục đã ghim
│   ├── <Domain>DockedWindows.tsx   # Cửa sổ thu nhỏ pop-out góc phải
│   ├── <Domain>ReminderAlert.tsx   # Toast thông báo nhắc hẹn nổ chuông
│   └── <Domain>Modals.tsx          # Gom toàn bộ modal cấu hình, tạo mới, chỉnh sửa
├── context/
│   └── <Domain>Context.tsx         # Context chia sẻ state nếu cần
└── store/
    └── <Domain>Bridge.ts           # State machine, Bus sự kiện, Đồng bộ realtime

apps/api/src/modules/<domain>/
├── routes.ts                       # Fastify route registration & backward-compat exports
├── <domain>-file.service.ts        # Xử lý tệp tin, MIME, HEIC conversion, sanitization
├── <domain>-access.service.ts      # Đánh giá quyền truy cập, danh tính, role
├── <domain>-format.service.ts      # Định dạng hiển thị, tính toán unread, avatar, nhãn
├── <domain>-repository.service.ts  # CRUD quan hệ với Prisma CRM / Legacy
├── <domain>-realtime.hub.ts        # SSE / WebSocket Pub-Sub Hub
└── <domain>-workflow.service.ts    # Máy trạng thái quy trình tự động
```

---

## 3. Quy trình Triển khai 4 Bước (Execution Checklist)

1. **Phân tích Ranh giới (Boundary Analysis)**:
   - Liệt kê toàn bộ state, props và handlers trong tệp nguyên khối.
   - Nhóm các state và handlers theo từng component con.
2. **Chiết xuất Component Giao diện (Frontend Extraction)**:
   - Tạo các tệp trong `components/` với interface Props rõ ràng.
   - Splicing component vào tệp cha.
   - Chạy `pnpm --filter @mos-lab/web typecheck` và unit test để đảm bảo xanh lá 100%.
3. **Chiết xuất Dịch vụ Backend (Backend Service Extraction)**:
   - Tách các hàm thuần (pure functions), logic truy cập, và định dạng ra các `*.service.ts`.
   - Re-export qua `routes.ts` để bảo toàn tương thích ngược cho unit test.
   - Chạy `pnpm --filter @mos-lab/api build` và backend test suite.
4. **Xác minh Toàn diện (Monorepo Gate Verification)**:
   - Chạy `pnpm verify:quick` hoặc kiểm tra build của tất cả các package.
   - Dọn dẹp task nền bằng `manage_task(Action: 'kill')` trước khi kết thúc lượt làm việc.
