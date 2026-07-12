# 🚀 AI Agent Development Guide for mos-lab

This guide outlines common commands, monorepo architecture, coding standards, and best practices to help you develop faster and correctly in `mos-lab`.

---

## 🛠️ Common Commands

### Workspace Commands
- **Start local dev servers**: `pnpm dev` (Runs Web on http://localhost:4000 and API on http://localhost:4001)
- **Build all packages**: `pnpm build`
- **Run lint checks**: `pnpm lint`
- **Clean workspace build cache**: `pnpm clean`

### Backend DB Commands (`apps/api`)
- **Generate Prisma Clients**: `pnpm --filter @mos-lab/api prisma:generate` (Generates clients for both `crm` and `legacy`)
- **Apply CRM migrations**: `pnpm --filter @mos-lab/api prisma:migrate:crm`
- **Pull legacy DB schema**: `pnpm --filter @mos-lab/api prisma:db:pull:legacy`

---

## 📦 Monorepo Architecture

```
mos-lab/
├── apps/
│   ├── web/                          # Next.js 15 + Ant Design 5 (Port: 4000)
│   └── api/                          # Fastify 5 + TypeScript (Port: 4001)
├── packages/
│   └── shared/                       # Shared Types & Constants (@mos-lab/shared)
└── scripts/                          # Deployment scripts
```

---

## 🎯 Coding Guidelines & Best Practices

### 1. Strongly-Typed Shared Packages
- **Always use shared types**: Do not redefine model interfaces on the frontend. Use types from `@mos-lab/shared` (e.g. `Customer`, `DailyPlan`, `Staff`, etc.).
- When adding API endpoints, define request/response parameters in `packages/shared/src/types/` and run `pnpm --filter @mos-lab/shared build` before using them.

### 2. Frontend API Calls
- **Never use raw Axios strings**: Do not call `api.get('/some-route')` directly.
- **Use the SDK**: Always use `apiClient` located in `apps/web/lib/api-client.ts`. It provides autocomplete, parameter types, and return-type safety.
  - *Example*: `const res = await apiClient.customers.list({ bucket: 'COMBO_LIVE' });`

### 3. Backend Imports & Modules
- **File Extensions**: Relative imports in `apps/api` **MUST** end with `.js` (e.g. `import prismaPlugin from './plugins/prisma.js'`). This is required by `NodeNext` TypeScript configuration.
- **Prisma Clients**:
  - `fastify.prisma.crm`: Database `mos_lab` for CRM data (CRUD allowed).
  - `fastify.prisma.legacy`: Database `management` for Legacy CRM data (**READ-ONLY**).

### 4. Theme & Styling (Refer to `.agents/AGENTS.md`)
- **Theme support**: Giao diện hỗ trợ cả Sáng (Light Theme) và Tối (Dark Theme).
- **CSS Overrides**: Tuyệt đối không hardcode màu nền tối (`background: #141414 !important`). Phân vùng ghi đè rõ ràng:
  ```css
  .dark-theme .ant-table { background: #141414 !important; }
  .light-theme .ant-table { background: #ffffff !important; }
  ```
- **Inline Styles**: Luôn sử dụng `themeMode === 'dark' ? ... : ...` hoặc `theme.useToken()` của Ant Design.

### 5. Booker Salary API Configuration & Privacy (Refer to `.agents/AGENTS.md`)
- **No Shared API**: Tuyệt đối không gọi đến endpoint Wingslashes ngoài.
- Dùng API xuất dữ liệu nội bộ: `GET /api/kpi/export-booker-salary` đi kèm key tích hợp: `?key=FDC0D0A177694777A`.
