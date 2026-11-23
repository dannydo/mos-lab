# UI Theme, Styling, Icons & Table Standards

> Extracted from root/legacy `AGENTS.md` in Wave 0. Covers frontend theme parity, Tailwind + Ant Design 5 hybrid styling, number stability, icons, DatePicker, SVG delegation, and `<Table>` contracts.

---

## 1. Frontend Theme Customization (Light & Dark Parity)

- **Global State**: `themeMode` (`'light' | 'dark'`) via `useTheme()` in `ThemeContext.tsx`. Switching applies `.light-theme` or `.dark-theme` on `document.documentElement` (`<html>`).
- **Scoped CSS Overrides**: Never hardcode dark backgrounds/text in global selectors (`background: #141414 !important`). Scope every library override:
  ```css
  .dark-theme .antd-custom-table .ant-table {
    background: #141414 !important;
    color: #ccc !important;
  }
  .light-theme .antd-custom-table .ant-table {
    background: #ffffff !important;
    color: #333333 !important;
  }
  ```
- **Inline Styles**: Always derive from `themeMode === 'dark' ? ... : ...` or Ant Design tokens via `theme.useToken()` (`token.colorBgContainer`, `token.colorBorderSecondary`, etc.).
- **Dual-Theme Verification**: Before finishing UI changes, toggle Light/Dark mode in the header and verify tables, modals, drawers, and text contrast in both modes.

---

## 2. Hybrid Styling Workflow: Ant Design 5 & Tailwind CSS v4

- **Ant Design 5 (Functional Backbone)**: Use Antd components for stateful/complex data widgets (`<Table>`, `<Form>`, `<Form.Item>`, `<Select>`, `<DatePicker>`, `<Modal>`, `<Drawer>`, `<Tabs>`, `<Steps>`, `<Upload>`), preferring Assembly Kit primitives in `apps/web/components/ui` (`StatCard`, `SectionCard`, `PageHeader`, `StatusTag`, `IconText`, `DensityContainer`, `AdaptiveDrawer`).
- **Tailwind CSS v4 (Layout & Visual Polish)**: Use Tailwind utilities for `grid`, `flex`, `gap-*`, gradients, shadows, borders, glassmorphism, and micro-animations. Avoid adding new custom `.css` files unless scoping Antd overrides.
- **No Raw Placeholders**: Use high-craft SVG icons or generated assets rather than placeholder boxes.

---

## 3. Single Source of Truth Design Tokens & Density

- Source all palette, radius, typography, responsive breakpoints (`phone: 375`, `ipad: 768`, `laptop: 1024`, `desktop: 1440`, `fourK: 2560`), and density presets (`compact`, `comfort`, `spacious`) from `themeTokens` in `@mos-lab/shared` (`packages/shared/src/theme/tokens.ts`).
- Enforce `pnpm check:ui-contract` (no new raw Antd `Table/Modal/Drawer/Tag/Statistic/Spin/Empty/Result` imports or literal color/inline-style drift on product dashboard routes).

---

## 4. Number Jitter Prevention (`tabular-nums`)

- All timers, countdowns, call durations, clocks, and continuously updating numbers MUST use tabular figures:
  - Tailwind: `className="tabular-nums"`
  - Inline style: `style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}`

---

## 5. Strict Vertical Alignment & Badge Centering

- Never use non-existent Tailwind class `align-center`; always use `items-center`.
- All Badges, Tags, Pills, and Status Badges MUST use `inline-flex items-center justify-center leading-none` with balanced padding (`py-1 px-2.5`).

---

## 6. Drawer Close Button Placement Invariant

- Every Drawer (`AdaptiveDrawer` or Ant Design `Drawer`) MUST place its `[✕]` close button at the **top-right** (`closable: { placement: 'end' }`) while keeping the title anchored **top-left**. Never place `[✕]` on the left of the title. Prefer `AdaptiveDrawer` for all new/refactored drawers.

---

## 7. Ant Design `<Table>` Standards

### A. Explicit `ColumnsType<T>` Type Annotation

- Every `<Table>` column array, `useMemo` column array, or column factory (`getPendingColumns`, `getStaffColumns`, etc.) MUST be explicitly typed as `ColumnsType<T>` from `'antd/es/table'` (or `TableProps<T>['columns']`). This prevents TypeScript from widening `align: 'right' | 'center'` to `string` and breaking Next.js production builds.

### B. Explicit Numeric Column Widths & Tablet No-Wrap

- Every column definition (especially with `scroll={{ x: 'max-content' }}`) MUST declare a numeric `width` (e.g., `95`–`170`), never `undefined`.
- Use `white-space: nowrap` for text, VND amounts, phone numbers, timestamps, and status badges so cells never collapse into vertical single-character wrapping on iPad/Tablet (`1024px–1366px`).
- `useTableConfig.ts` enforces `effectiveWidth` (`width >= 40 ? config.width : staticCol.width || 120`) to recover missing widths in saved configs.

### C. Controlled & Persistent Table Pagination

- All paginated `<Table>` instances MUST use controlled state (`current`, `pageSize`, `onChange`, `showSizeChanger`, `pageSizeOptions: ['10', '20', '50', '100']`, `showTotal`).
- Persist `activeTab`, `page`, and `pageSize` in `localStorage`; reset `page` to `1` when search/filters change.

---

## 8. Toolbar Buttons & Creation `+` Action Standard

- **Synchronized Square Filter Buttons**: Single-icon filter buttons next to search inputs MUST be `32x32px` (`w-8 h-8 rounded-lg`), matching the `h-8`, `rounded-lg`, and border style of the Gear config button.
- **Required `+` Icon on Creation Actions**: All creation/addition buttons and actions (_Đặt lịch mới_, _Tạo chiến dịch_, _Thêm mốc chạm_, _Tạo phân bổ_) MUST include `+` / `<PlusOutlined />` (even on compact gold icon buttons, so they are not confused with generic calendar buttons).

---

## 9. Unified Icon & Emoji Picker Invariant

- Always use shared `IconPickerModal` (`apps/web/components/IconPickerModal.tsx`) and `TouchpointIconPicker` (`apps/web/components/campaign/TouchpointIconPicker.tsx`) backed by `IconSystem.tsx` (`renderIconHelper` / `getIconComponent`), supporting Ant Design, Lucide, Emoji, and Custom SVG icons. Never build ad-hoc icon pickers.

---

## 10. Technician (CV) `<CvDatePicker>` Invariant

- All date pickers tied to a Technician (`CV`) MUST use `<CvDatePicker>` (`apps/web/components/booking/CvDatePicker.tsx`), NEVER raw Ant Design `<DatePicker>`:
  - Disables past dates (`isBefore(dayjs().startOf('day'))`).
  - Strikes through & disables fixed weekly off days (`offDays`) and approved leave (`approvedOffDates`).
  - Shows orange dot (`#f59e0b`) + tooltip/alert for pending (`New`) leave requests, red dot (`#ef4444`) for `Rejected` leave requests.
  - Enforces Monday-first calendar headers (`T2 T3 T4 T5 T6 T7 CN`) and `getNextAvailableDate` fallback when landing on an off-day.

---

## 11. SVG Diagram Event Delegation & Antd Modal/Drawer Stacking

- **SVG Event Delegation**: Attach click handlers on the root SVG container (`svgWrapperRef`) using `.closest('.node')`, and wrap React state updates (`setSelectedNode`, `setModalOpen`) inside `flushSync(() => { ... })` from `'react-dom'` so React 19 / Next.js 16 updates immediately.
- **Select inside Modal/Drawer**: Always pass `getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}` on `<Select>` inside custom-zIndex Modals/Drawers and keep Modal/Drawer `zIndex={1050}` (never `10000`) to avoid Antd `zIndexPopupBase` warnings and hidden dropdown menus.
