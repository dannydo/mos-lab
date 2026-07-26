# Handoff Report — R5: Frontend UX & AGENTS.md Compliance Review for Catalog Management

**Author**: Explorer Agent (R5)  
**Target Audience**: Orchestrator & Implementer Agents  
**Date**: 2026-07-26  
**Status**: Complete

---

## 1. Observation

Direct observations from codebase inspection across `apps/web`, `apps/api`, `packages/shared`, and `AGENTS.md`:

### Observation 1.1: Project AGENTS.md Rules & Standards

- **Theme & CSS Overrides** (`AGENTS.md` Coding Guideline 4 & `.agents/AGENTS.md` Rule 1-3):
  - Theme state is managed globally via `ThemeProvider` (`apps/web/context/ThemeContext.tsx:18-54`), setting `themeMode` (`'light'` | `'dark'`) and root HTML classes `.light-theme` / `.dark-theme`.
  - CSS overrides in `apps/web/app/globals.css:147-190` are scoped under `.dark-theme .ant-table`, `.light-theme .ant-table`, `.dark-theme .ant-card`, etc.
  - Hardcoding dark background colors (`style={{ background: '#141414' }}`) is strictly prohibited; components must use `themeMode === 'dark' ? ... : ...` or `theme.useToken()`.
- **Tabular Numbers Rule** (`AGENTS.md` Coding Guideline 4 & `.agents/AGENTS.md` Rule 5):
  - "Tất cả các số đếm ngược, thời gian chạy, đồng hồ, thời lượng, v.v. bắt buộc phải dùng `font-variant-numeric: tabular-nums` (hoặc class Tailwind `tabular-nums`) để không bị giật giao diện khi số thay đổi."
- **apiClient SDK Requirement** (`AGENTS.md` Coding Guideline 2):
  - "Never use raw Axios strings: Do not call `api.get('/some-route')` directly. Always use the SDK: Always use `apiClient` located in `apps/web/lib/api-client.ts`."
- **Strongly-Typed Shared Packages** (`AGENTS.md` Coding Guideline 1):
  - All data models and API parameters must be defined in `packages/shared/src/types/` and exported in `packages/shared/src/index.ts`.
  - Re-building requirement: `pnpm --filter @mos-lab/shared build`.
- **Backend Imports & NodeNext .js Extensions** (`AGENTS.md` Coding Guideline 3):
  - Relative imports in `apps/api` **MUST** end with `.js` (e.g. `import { requireAuth } from '../../middlewares/auth.js'` observed at `apps/api/src/modules/staff/routes.ts:3`).
- **Ant Design 5 + Tailwind CSS v4 Hybrid Workflow** (`.agents/AGENTS.md` Hybrid Styling Workflow):
  - Stateful/complex components use Antd (`<Table>`, `<Form>`, `<Modal>`, `<Select>`, `<Tabs>`).
  - Layout, spacing, glassmorphism, and hover transitions use Tailwind CSS v4 (`flex`, `grid`, `gap-*`, `rounded-*`, `tabular-nums`).

### Observation 1.2: Current State of SDK & Shared Types

- `apps/web/lib/api-client.ts:69-737`: Currently exports `apiClient` with sub-objects (`auth`, `customers`, `plans`, `calls`, `kpi`, `nyc`, `loca`, `staff`, `roles`, `savedFilters`, `tableConfig`, `omicall`, `dashboard`, `gamification`, `bk`), but currently **lacks a dedicated `catalog` namespace**.
- `packages/shared/src/types/customer.ts:327-332`: Contains a basic legacy `Service` interface:
  ```ts
  export interface Service {
    id: number;
    name: string;
    price: number;
    duration: number;
  }
  ```
  This interface lacks catalog metadata (`service_key`, `service_group`, `service_type`, `duration_minute_standard`, `remind_interval_day` touch-up window, `position`, `is_disabled`, combo session item breakdown, product stock, unit, cost price).

### Observation 1.3: Database Models & Business Rule Constraints

- `apps/api/prisma/legacy.prisma:119-151`: Defines `model service` with fields: `id`, `client_id`, `service_key`, `service_type`, `service_group`, `duration_minute`, `duration_minute_standard`, `image_filename`, `remind_interval_day`, `last_day_required`, `position`, `is_temporary`, `is_disabled`, `date_created`, `date_updated`.
- `AGENTS.md` Rule 16 (Touch-up Expiration Windows):
  - Single services (Dặm mi khách lẻ): Max 21 days from last service check-in (`remind_interval_day = 21`).
  - Combo package services (Dặm mi khách combo): Max 25 days from last service check-in (`remind_interval_day = 25`).
- `AGENTS.md` Rule 21 (Unified Combo Recognition):
  - Package bundles require package details in `order_service_combo` and balance tracking in `user_service_balance`.

---

## 2. Logic Chain

1. **Need for Shared Types (`packages/shared/src/types/catalog.ts`)**:
   - _From Observation 1.1 & 1.2_: Frontend & Backend must share strongly typed models. The current `Service` interface in `customer.ts:327` is insufficient.
   - _Inference_: We must create `packages/shared/src/types/catalog.ts` containing `CatalogService`, `CatalogComboItem`, `CatalogProduct`, `ListCatalogServicesParams`, `ListCatalogServicesResponse`, `ListCatalogProductsParams`, `ListCatalogProductsResponse`, `CreateCatalogServiceInput`, `UpdateCatalogServiceInput`, `CreateCatalogProductInput`, `UpdateCatalogProductInput`, and `CatalogStatsResponse`.
   - _Inference_: Re-export in `packages/shared/src/index.ts` and run `pnpm --filter @mos-lab/shared build`.

2. **Need for `apiClient.catalog` SDK Integration (`apps/web/lib/api-client.ts`)**:
   - _From Observation 1.1 & 1.2_: Direct `axios` / `api.get('/catalog/...')` calls violate `AGENTS.md` Rule 2.
   - _Inference_: Add `apiClient.catalog` to `apps/web/lib/api-client.ts` containing type-safe methods: `listServices`, `getServiceDetails`, `createService`, `updateService`, `deleteService`, `listProducts`, `getProductDetails`, `createProduct`, `updateProduct`, `deleteProduct`, and `getCatalogStats`.

3. **Backend NodeNext `.js` Extension Rule (`apps/api/src/`)**:
   - _From Observation 1.1 & 1.3_: Relative imports in Fastify must specify `.js` extension.
   - _Inference_: In `apps/api/src/modules/catalog/routes.ts` or `services/catalog.service.ts`, write `import { requireAuth } from '../../middlewares/auth.js'`, `import { catalogService } from './services/catalog.service.js'`.

4. **Frontend Theme & Tabular Numbers Compliance**:
   - _From Observation 1.1_: Light & Dark themes are dynamically toggled via `ThemeContext`.
   - _Inference_: Components must use `themeMode` and `theme.useToken()`. Table row styling must rely on CSS variables or Antd tokens.
   - _Inference_: All numbers that represent price (`formatVND(price)`), duration (`durationMinute`), stock quantity, position index, or session counts (`usedCount/totalCount`) MUST be wrapped with `tabular-nums` class or `fontVariantNumeric: 'tabular-nums'`.

5. **3-Tab Layout Structural Evaluation**:
   - _From Observation 1.3 & Request_: 3 tabs proposed:
     - **Tab 1: Dịch vụ lẻ (Single Services)**: Items with `service_group != 'combo'` and `service_group != 'product'` (e.g. eyelash extensions, touch-up 21 days, lash removal, skincare).
     - **Tab 2: Gói Combo (Combo Packages)**: Items with `service_group = 'combo'` (multi-session packages, 25-day touch-up window, bundled items). Includes sub-table/drawer for bundled sessions.
     - **Tab 3: Sản phẩm (Products)**: Items with `service_group = 'product'` (lash serums, cleaning foams, retail kits, stock count, unit price).
   - _Conclusion on Layout_: The 3-tab layout aligns cleanly with both the underlying database schema (`service_group`) and salon management workflow.

---

## 3. Caveats

1. **Database Schema Mapping**:
   - Legacy DB stores items in `service` table with `service_group` field ('single', 'combo', 'product'). CRM DB (`mos_lab`) may add specific product inventory tables (`crm_product`). The API service layer must handle data mapping smoothly between legacy and CRM databases.
2. **Touch-up Window Business Rules**:
   - Single service touch-up duration MUST default to 21 days (`remind_interval_day = 21`).
   - Combo package touch-up duration MUST default to 25 days (`remind_interval_day = 25`).
3. **Build Requirement Sequence**:
   - `@mos-lab/shared` MUST be built first (`pnpm --filter @mos-lab/shared build`) before `apps/web` or `apps/api` can compile type imports from `@mos-lab/shared`.

---

## 4. Conclusion

The Frontend UX design and compliance strategy for Catalog Management in `mos-lab` is fully validated:

1. **Shared Types**: Add `packages/shared/src/types/catalog.ts` and build `@mos-lab/shared`.
2. **API SDK**: Extend `apiClient` in `apps/web/lib/api-client.ts` with `catalog` namespace.
3. **Backend Conventions**: Implement `apps/api/src/modules/catalog/` with required `.js` relative import extensions.
4. **Theme & Jitter Safety**: Apply dual theme support (`useTheme()`, `theme.useToken()`) and mandatory `tabular-nums` on all prices, durations, stock levels, and position numbers.
5. **Layout**: Implement clean 3-tab layout (`Tab 1: Dịch vụ lẻ`, `Tab 2: Gói Combo`, `Tab 3: Sản phẩm`) with stats summary top bar, search filter toolbar, Antd `<Table>`, and drawer/modal forms.

---

## 5. Verification Method

To verify compliance and implementation:

### 1. Build Verification

Run the following build commands in order:

```bash
# 1. Build shared package
pnpm --filter @mos-lab/shared build

# 2. Verify API TypeScript compilation (with .js extensions)
pnpm --filter @mos-lab/api build

# 3. Verify Web Next.js compilation & lint
pnpm --filter @mos-lab/web lint
```

### 2. File & Source Code Inspection

- Inspect `packages/shared/src/types/catalog.ts` for type completeness.
- Inspect `apps/web/lib/api-client.ts` to ensure `apiClient.catalog` exists and no raw `axios` calls are made in components.
- Inspect `apps/api/src/modules/catalog/` to verify relative imports end with `.js`.
- Inspect UI components (`SingleServicesTabContent.tsx`, `ComboPackagesTabContent.tsx`, `ProductsTabContent.tsx`) for `useTheme()`, `theme.useToken()`, and `tabular-nums` class usage on prices/durations.

### 3. Invalidation Conditions

- Any raw `axios.get('/catalog/...')` call inside web components invalidates SDK compliance.
- Any relative import in `apps/api/src/modules/catalog/` missing `.js` extension invalidates NodeNext backend compliance.
- Missing `tabular-nums` on price or duration text invalidates UX jitter prevention compliance.
