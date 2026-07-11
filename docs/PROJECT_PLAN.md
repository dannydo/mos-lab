# 🚀 mos-lab — Project Plan

> **Repo**: `mos-lab`
> **Domain**: `lab.masteros.app`
> **Local**: `~/projects/mos-lab`
> **Goal**: CRM telesales chạy thật trong 5 ngày

---

## Day 0 — Prerequisites (trước khi bắt đầu)

> Đã hoàn thành từ WingsLashes workspace:

- [x] Server health: Disk 33%, RAM 10GB free, Swap 4GB
- [x] Monitoring: Netdata active
- [x] Auto-cleanup: Logrotate + release cleanup
- [ ] Node.js 20 LTS trên VPS
- [ ] PM2 trên VPS
- [ ] Database `mos_lab` + 4 tables
- [ ] MySQL user `mos_lab_api` (READ management, FULL mos_lab)
- [ ] Nginx proxy `lab.masteros.app` → `localhost:3001`
- [ ] DNS: `lab.masteros.app` → `194.233.76.123`

---

## Day 1 — Foundation

### 1.1 Tạo GitHub repo + Init monorepo
- [ ] Tạo repo `mos-lab` trên GitHub
- [ ] Clone về `~/projects/mos-lab`
- [ ] Init pnpm workspace + Turborepo
- [ ] Tạo structure:
  ```
  mos-lab/
  ├── apps/web/        # Next.js
  ├── apps/api/        # Fastify
  ├── packages/shared/ # Types
  ├── turbo.json
  └── pnpm-workspace.yaml
  ```

### 1.2 Setup Fastify API (`apps/api`)
- [ ] Init Fastify 5 + TypeScript
- [ ] Cài Prisma + mysql2 driver
- [ ] `prisma db pull` từ `management` DB → auto-generate legacy schema
- [ ] Tạo Prisma schema cho `mos_lab` DB (4 tables)
- [ ] `prisma generate` cho cả 2 schemas
- [ ] Test connection: query `SELECT COUNT(*) FROM user`
- [ ] Setup CORS (allow `lab.masteros.app`)

### 1.3 Verify
- [ ] `pnpm dev` → Fastify chạy trên port 3001
- [ ] `GET /api/health` → `{ status: 'ok', legacy_users: 52000+ }`
- [ ] Commit + push

---

## Day 2 — Auth + Customer List

### 2.1 Auth module (`apps/api/src/modules/auth/`)
- [ ] POST `/api/auth/login` → validate username/password → return JWT
- [ ] GET `/api/auth/me` → return current user from JWT
- [ ] Middleware: `requireAuth` → verify JWT on protected routes
- [ ] Middleware: `requireRole('admin')` → role-based access

### 2.2 Customer module (`apps/api/src/modules/customers/`)
- [ ] GET `/api/customers` → query legacy DB, tính bucket real-time
  - Query params: `bucket`, `search`, `page`, `limit`, `sort`
  - Bucket logic v1:
    ```
    COMBO_LIVE: balance > 0 AND expiry > today
    COMBO_DEAD: had combo but expired/used
    SINGLE: never had combo
    ```
- [ ] GET `/api/customers/:id` → chi tiết 1 khách
- [ ] GET `/api/customers/:id/history` → order history + services
- [ ] GET `/api/customers/stats` → count per bucket

### 2.3 Setup Next.js (`apps/web`)
- [ ] Init Next.js 15 (App Router)
- [ ] Cài Ant Design 5 + theme config (gold `#D4A84B`)
- [ ] Layout: Sidebar + Header (logo Wings Lashes)
- [ ] Login page → call API → store JWT
- [ ] Deploy lên Vercel (chưa cần custom domain)

### 2.4 Verify
- [ ] Login works (JWT)
- [ ] Customer list hiển thị với 3 bucket tabs
- [ ] Search by name/phone works
- [ ] Customer detail modal works
- [ ] Commit + push + Vercel auto-deploy

---

## Day 3 — Call Logging + Daily Plan

### 3.1 Plans module (`apps/api/src/modules/plans/`)
- [ ] POST `/api/plans` → tạo daily plan cho 1 khách
- [ ] GET `/api/plans/today` → plan hôm nay của staff đang login
- [ ] PUT `/api/plans/:id` → update status (PLANNED → CALLED → DONE)
- [ ] Auto-suggest: top 20 khách nên gọi (dựa trên bucket + days_since_visit)

### 3.2 Calls module (`apps/api/src/modules/calls/`)
- [ ] POST `/api/calls` → ghi log cuộc gọi
  - Fields: call_type, call_result, note, outcome, callback_date
- [ ] GET `/api/calls/:customerId` → lịch sử gọi của 1 khách

### 3.3 Frontend pages
- [ ] `/plans` → Daily plan view
  - Danh sách khách cần gọi hôm nay
  - Nút "Gọi" → mở modal ghi log
  - Status badges: PLANNED → CALLED → DONE
- [ ] Call log modal
  - Ant Design Form: call result, note, outcome
  - Quick actions: "Gọi nhỡ", "Hẹn gọi lại", "Đã book lịch"
- [ ] Customer card → tab "Lịch sử gọi"

### 3.4 Verify
- [ ] Tạo plan cho 5 khách test
- [ ] Ghi log cuộc gọi → thấy trong lịch sử
- [ ] Status flow: PLANNED → CALLED → DONE
- [ ] Commit + push

---

## Day 4 — KPI + Polish

### 4.1 KPI module (`apps/api/src/modules/kpi/`)
- [ ] GET `/api/kpi/today` → KPI hôm nay của staff
- [ ] GET `/api/kpi/report?from=&to=` → KPI theo khoảng thời gian
- [ ] Auto-calculate KPI từ call_logs + daily_plans

### 4.2 KPI Dashboard frontend
- [ ] `/kpi` → Ant Design Charts
  - Số liệu hôm nay: planned / called / answered / booked / renewed
  - Chart: trend 7 ngày
  - Manager view: so sánh KPI giữa các telesales (chỉ role manager/admin)

### 4.3 Polish
- [ ] Mobile responsive (telesales dùng điện thoại)
- [ ] Loading states + error handling
- [ ] Empty states (chưa có plan, chưa có call log)
- [ ] Ant Design notification (toast) khi ghi log thành công
- [ ] PWA manifest (dùng như app trên điện thoại)

### 4.4 Verify
- [ ] KPI dashboard hiển thị đúng số liệu
- [ ] Mobile view OK
- [ ] Tất cả flows: login → xem khách → tạo plan → gọi → ghi log → xem KPI
- [ ] Commit + push

---

## Day 5 — 🚀 LAUNCH

### 5.1 Deployment
- [ ] Deploy Fastify API lên VPS với PM2
- [ ] Config Vercel custom domain: `lab.masteros.app`
- [ ] SSL verify (certbot)
- [ ] Test full flow trên production

### 5.2 Seed data
- [ ] Tạo 10+ telesales accounts
- [ ] Verify: mỗi account login được, thấy customer list

### 5.3 Go Live
- [ ] Gửi link `lab.masteros.app` cho team telesales
- [ ] Hướng dẫn nhanh (1 trang): login → xem khách → tạo plan → gọi → ghi log

---

## Day 6+ — 💥 Iterate Biz Rules

> Đây là phase quan trọng nhất. Lắng nghe feedback từ telesales.

### Biz rules cần validate:

| # | Biz Rule | Câu hỏi cần trả lời | Status |
|:--|:---------|:--------------------|:-------|
| 1 | **Bucket logic** | 3 bucket đủ chưa? Cần sub-bucket? | ⏳ |
| 2 | **Priority sorting** | Sort theo gì? Days since visit? Total spent? | ⏳ |
| 3 | **Auto-suggest** | Top 20 khách nên gọi — logic đúng chưa? | ⏳ |
| 4 | **Call outcomes** | Đủ options chưa? Cần thêm? | ⏳ |
| 5 | **KPI metrics** | Đúng metric chưa? Cần thêm conversion rate? | ⏳ |
| 6 | **Daily plan** | Tự tạo hay auto-assign? Bao nhiêu khách/ngày? | ⏳ |
| 7 | **Callback tracking** | Nhắc gọi lại khi nào? Push notification? | ⏳ |
| 8 | **VIP logic** | Cần VIP tier không? Dựa trên total_spent? | ⏳ |

### Iterate workflow:
```
Telesales feedback → Sửa code (< 1 giờ) → Deploy → Test lại
```

### Khi nào biz rules "proven"?
- Telesales dùng hàng ngày ≥ 2 tuần
- Không còn feedback lớn về UX/logic
- KPI metrics ổn định
- → Ready to port vào MasterOS

---

## Port → MasterOS Checklist (sau khi proven)

| Task | Chi tiết |
|:-----|:---------|
| Đổi UI | Ant Design → Tailwind CSS v4 + MasterOS theme |
| Đổi ORM | Prisma → Drizzle ORM (`@wings/db`) |
| Đổi DB | MariaDB → Supabase Postgres (tạo sync worker) |
| Đổi API | Fastify → Next.js API Routes + `createRoute()` |
| Đổi Auth | Custom JWT → MasterOS JWT (jose) |
| Giữ nguyên | **Tất cả biz rules, bucket logic, KPI formulas** |
| Thêm | Multi-tenant support (Wings Lashes = 1 tenant) |
