# 🤖 Tech Stack — Tối Ưu Cho AI Agent

> **Context**: Không có developer, chỉ có AI agent code. Chọn công cụ mà AI tạo ra code đúng nhất, nhanh nhất, ít bug nhất.

---

## Nguyên Tắc Chọn Cho AI

| Tiêu chí | Giải thích |
|:---------|:-----------|
| **Training data nhiều** | AI biết nhiều → code đúng hơn |
| **Ít code hơn** | Ít code = ít bug |
| **Opinionated** | AI không cần đưa ra quyết định → ít sai |
| **Ít config** | Config sai = debug khó cho AI |
| **Error messages rõ** | AI tự debug dễ hơn |

---

## 1. UI Library: **Ant Design** ✅ (thay đổi từ shadcn/ui)

### Tại sao Ant Design dễ hơn cho AI?

**CRM = Tables + Forms + Modals.** Ant Design có sẵn tất cả:

```
Ant Design — AI viết 10 dòng:
┌──────────────────────────────────┐
│ <Table                           │
│   columns={columns}              │
│   dataSource={customers}         │
│   pagination={{ pageSize: 20 }}  │
│   filters, sorting, search       │
│   → TẤT CẢ BUILT-IN             │
│ />                               │
└──────────────────────────────────┘

shadcn/ui — AI viết 50+ dòng:
┌──────────────────────────────────┐
│ Cần cài TanStack Table           │
│ Tự build pagination component    │
│ Tự build sorting logic           │
│ Tự build filter UI               │
│ Tự build search                  │
│ → NHIỀU CODE = NHIỀU BUG         │
└──────────────────────────────────┘
```

| So sánh | Ant Design | shadcn/ui |
|:--------|:-----------|:----------|
| **Table (sort, filter, paginate)** | 1 component, 10 dòng | 50+ dòng (TanStack Table + custom UI) |
| **Form + validation** | `<Form.Item rules={...}>` | React Hook Form + Zod + custom layout |
| **Date picker** | Built-in, Vietnamese locale | Phải cài thêm + config |
| **Modal/Dialog** | Built-in | Phải copy component + customize |
| **Training data** | ⭐⭐⭐⭐⭐ (10 năm, hàng triệu ví dụ) | ⭐⭐⭐ (2 năm, ít hơn) |
| **AI bugs** | Ít (pattern chuẩn, ít code) | Nhiều hơn (nhiều code, nhiều config) |

> [!IMPORTANT]
> **Kết luận**: Ant Design giúp AI viết **ít code hơn 3-5 lần** cho CRM components. Ít code = ít bug = nhanh hơn.

### Trade-off trung thực:
- ⚠️ Ant Design trông "giống Ant Design" — khó customize branding hoàn toàn
- ⚠️ Bundle size lớn hơn (~1MB)
- ✅ Nhưng cho giai đoạn MVP và tool nội bộ (telesales dùng) → **không quan trọng**
- ✅ Khi nào cần branding custom (customer-facing) → refactor UI sau

---

## 2. ORM: **Prisma** ✅ (thay đổi từ Drizzle)

### Tại sao Prisma dễ hơn cho AI?

| So sánh | Prisma | Drizzle |
|:--------|:-------|:--------|
| **Training data** | ⭐⭐⭐⭐⭐ (gấp 10× Drizzle) | ⭐⭐⭐ (mới hơn) |
| **Legacy DB** | `prisma db pull` → tự tạo schema từ DB có sẵn | Phải viết schema tay |
| **Migration** | `prisma migrate` built-in | drizzle-kit (ít tài liệu hơn) |
| **Type safety** | Auto-generated client | Tốt nhưng khác pattern |
| **Debug** | Prisma Studio (GUI xem data) | Không có |
| **AI viết đúng** | Rất cao (pattern đã chuẩn hóa) | Cao nhưng ít ví dụ |

### Killer feature cho dự án này:

```bash
# Prisma tự đọc legacy database và tạo schema:
prisma db pull --schema=./prisma/legacy.prisma

# → AI KHÔNG CẦN VIẾT SCHEMA CHO LEGACY DB
# → Prisma tự hiểu 52K users, 283K orders, tất cả relationships
```

> [!IMPORTANT]
> **Kết luận**: `prisma db pull` là game-changer. AI không cần đoán schema legacy DB — Prisma tự introspect và tạo schema chính xác.

---

## 3. Monorepo: **Turborepo + pnpm** ✅ (giữ nguyên)

### Tại sao monorepo cho AI?

| So sánh | Monorepo (Turborepo) | 2 repos riêng |
|:--------|:---------------------|:--------------|
| **Shared types** | ✅ 1 chỗ, FE + BE dùng chung | ❌ Copy-paste, dễ lệch |
| **AI consistency** | ✅ Sửa type → cả FE + BE thấy lỗi ngay | ❌ AI có thể quên sync |
| **Deploy** | 1 lệnh | 2 lệnh riêng |
| **Setup** | ⚠️ Phức tạp hơn ban đầu | ✅ Đơn giản hơn |

> **Kết luận**: Monorepo phức tạp hơn lúc setup, nhưng **shared types giữa FE và BE** là cực kỳ quan trọng khi AI code — nếu type lệch, AI sẽ tạo bug rất khó tìm.

---

## 4. Repo: **Mới (`wings-crm`)** ✅

Không cần giải thích nhiều:
- Clean start → AI không bị confused bởi code legacy
- Không risk phá code Wings Lashes

---

## 5. Branding — Wings Lashes

### Logo files (trên server):
- `logo.png` — Logo chính
- `logo-black.png` — Logo đen
- `logo-white.png` — Logo trắng
- `logo-slogan-black.png` — Logo + slogan (nền sáng)
- `logo-slogan-white.png` — Logo + slogan (nền tối)

### Color Palette:

```
Wings Lashes Brand Colors:

Primary (Gold/Orange):
┌─────────────────────────────┐
│  #D4A84B  — Gold chính      │  ████████
│  #E8B84A  — Gold sáng       │  ████████
│  #C49A3C  — Gold đậm       │  ████████
│  #F5D799  — Gold nhạt       │  ████████
└─────────────────────────────┘

Neutral (Black):
┌─────────────────────────────┐
│  #000000  — Đen chính       │  ████████
│  #1A1A1A  — Đen nhẹ        │  ████████
│  #333333  — Xám đậm        │  ████████
│  #F5F5F5  — Xám nền        │  ████████
│  #FFFFFF  — Trắng           │  ████████
└─────────────────────────────┘

Semantic (CRM):
┌─────────────────────────────┐
│  #52C41A  — Xanh lá (LIVE)  │  ████████  → Combo Live
│  #FF4D4F  — Đỏ (DEAD)      │  ████████  → Combo Dead
│  #FAAD14  — Vàng (SINGLE)  │  ████████  → Single
│  #1890FF  — Xanh dương     │  ████████  → Links, actions
└─────────────────────────────┘
```

> **Ant Design theme config** sẽ dùng `#D4A84B` làm primary color, `#000000` background cho sidebar/header.

---

## Tóm Tắt — Tech Stack Final (Tối Ưu Cho AI)

| Layer | Chọn (AI-optimized) | Thay đổi | Lý do |
|:------|:--------------------|:---------|:------|
| **UI Library** | **Ant Design 5** | ⚡ Đổi | Ít code 3-5×, training data nhiều nhất |
| **CSS** | **Ant Design Theme** (không cần Tailwind riêng) | ⚡ Đổi | Ant Design tự quản lý styling |
| **ORM** | **Prisma** | ⚡ Đổi | `db pull` auto-generate schema, training data nhiều |
| **Frontend** | Next.js 15 | Giữ | — |
| **Backend** | Fastify 5 | Giữ | — |
| **Monorepo** | Turborepo + pnpm | Giữ | Shared types quan trọng |
| **Repo** | `wings-crm` (mới) | Giữ | Clean start |
| **State** | TanStack Query + Zustand | Giữ | — |
| **Forms** | Ant Design Form (built-in) | ⚡ Đổi | Không cần React Hook Form riêng |
| **Charts** | Ant Design Charts (@ant-design/charts) | ⚡ Đổi | Tích hợp sẵn, consistent |
| **Branding** | Gold #D4A84B + Black #000000 | Mới | Wings Lashes brand |

### Điểm khác biệt lớn nhất:

> **Chuyển từ "build everything" (shadcn) sang "use everything" (Ant Design)**
>
> AI agent không cần build components từ đầu — chỉ cần **ghép components có sẵn** và focus vào business logic. Ít code hơn = ít bug hơn = ship nhanh hơn.
