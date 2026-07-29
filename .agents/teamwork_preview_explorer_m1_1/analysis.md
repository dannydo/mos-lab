# SMS Action Feature - Web Frontend Audit & Analysis Report (Milestone 1)

## Executive Summary

This report presents the findings of the Explorer 1 read-only audit for Milestone 1 of the **SMS Action Feature** in `mos-lab`. It covers the Web Frontend Customer Care views (`apps/web/app/dashboard/loca` and `apps/web/app/dashboard/nyc`), table column structures (focusing on the "Chạm 17 (ngày)" tab and "Thao tác" column), customer row data models, and UI modal design patterns in `apps/web`.

---

## 1. Audit of Customer Care Views & Table Columns

### 1.1 LoCa Campaign View (`apps/web/app/dashboard/loca`)

- **Files Examined**:
  - Page View: `/Users/dannydo/projects/mos-lab/apps/web/app/dashboard/loca/page.tsx`
  - Columns Definition: `/Users/dannydo/projects/mos-lab/apps/web/app/dashboard/loca/components/LocaColumns.tsx`
  - Data Hook: `/Users/dannydo/projects/mos-lab/apps/web/app/dashboard/loca/hooks/useLocaData.ts`
  - Table Config Hook: `/Users/dannydo/projects/mos-lab/apps/web/hooks/useTableConfig.ts`
- **Tabs & Touchpoints Pipeline**:
  - Navigation Tabs: `NEW_LOCA`, `LOCA_ALL`, `CONTACTED`, `CALLBACK`, `BOOKED`, `HSD_30`, `LSD_1`, `SP`.
  - In `LOCA_ALL` tab, the pipeline bar renders individual touchpoint pills based on `DEFAULT_LOCA_CONFIGS`:
    - `now` (Hôm qua / 1 day)
    - `17` (**Chạm 17 ngày** - `daysMin: 17, daysMax: 17`, color: `#3B82F6`)
    - `19`, `21`, `23`, `25`, `30`, `35`, `40`, `45`, `50`, `55`, `60+`
- **Table Columns (`getLocaColumns`)**:
  1. `Mã KH` (`id`, width: 90)
  2. `Khách Hàng` (`name`, renders avatar, name link to detail modal, phone number with click-to-call `makeCall`)
  3. `Số Dư Combo` (`comboBalance`, Tag showing remaining visits `normalCount` + `retainCount`)
  4. `HSD Sử Dụng` (`expiryDate`, formatted `DD/MM/YYYY`)
  5. `Chưa tới tiệm (Ngày)` (`daysSinceLastVisit`, retouch days count / callback date / future booking badge)
  6. `Tổng Chi Tiêu` (`totalSpent`, formatted VND with `tabular-nums`)
  7. `Đã phân bổ` (`allocatedDays`)
  8. `Booker phụ trách` (`assignedStaff`)
  9. `Ngày gọi gần nhất` (`lastCallDate`)
  10. `Thời lượng` (`lastCallDuration`)
  11. `Trạng thái cuộc gọi` (`lastCallResult`)
  12. `Ghi chú cuộc gọi` (`lastCallNote`)
  13. `Thao tác` (`actions`, width: 120): Currently renders a single button for `"Lên lịch gọi"` / `"Đã lên lịch"` calling `handleAddToPlan(record.id)`.

### 1.2 NYC Campaign View (`apps/web/app/dashboard/nyc`)

- **Files Examined**:
  - Page View: `/Users/dannydo/projects/mos-lab/apps/web/app/dashboard/nyc/page.tsx`
  - Columns Definition: `/Users/dannydo/projects/mos-lab/apps/web/app/dashboard/nyc/components/NycColumns.tsx`
  - Data Hook: `/Users/dannydo/projects/mos-lab/apps/web/app/dashboard/nyc/hooks/useNycData.ts`
- **Tabs & Touchpoints**:
  - Tabs: `NYC_30`, `NYC_35`, `NYC_40`, `NYC_45`, `NYC_50`, `NYC_55`, `NYC_60`.
- **Table Columns (`getNycColumns`)**:
  - Similar to `LocaColumns`, including `id`, `name`, `daysSinceLastVisit` (with missed appointment warning badge), `totalSpent`, `allocatedDays`, `assignedStaff`, `lastCallDate`, `lastCallDuration`, `lastCallResult`, `lastCallNote`, and `actions` (width: 110).

---

## 2. Customer Row Data Structure & Variable Mapping

The data model for customer rows is defined in `/Users/dannydo/projects/mos-lab/packages/shared/src/types/customer.ts` (`Customer` interface).

| SMS Template Variable   | Description                             | Source Field in `Customer` Object                                         | Fallback / Formatting Rule                                                         |
| ----------------------- | --------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `{ten_khach}`           | Customer Full Name                      | `record.name`                                                             | Required string, e.g. `"Chị An"`                                                   |
| `{sdt_khach}`           | Customer Phone Number                   | `record.phone`                                                            | String, e.g. `"0901234567"`                                                        |
| `{han_dung}`            | Combo Expiry Date                       | `record.comboBalance?.expiryDate`                                         | `dayjs(record.comboBalance.expiryDate).format('DD/MM/YYYY')` or `'Không thời hạn'` |
| `{so_ngay_dam}`         | Days to retouch / days since last visit | `record.daysSinceLastVisit`                                               | `record.daysSinceLastVisit !== null ? record.daysSinceLastVisit : '-'`             |
| `{ten_combo}`           | Package / Service Name                  | `record.newComboDetails?.comboName` or `record.comboBalance?.serviceName` | String, e.g. `"Combo Nối Mi Volume (Gói 5 Lần)"`                                   |
| `{sdt_cua_hang}`        | Store Hotline Number                    | `sipConfig?.phoneNumber` or OmiCall context                               | Default: `'0328703439'` (Viettel SIP Trunk Hotline)                                |
| `{mã_kh}` / Customer ID | Unique Customer ID                      | `record.id`                                                               | Number, e.g. `1024`                                                                |
| `{cc_phu_trach}`        | Assigned Booker/Telesales Name          | `record.assignedStaff?.displayName`                                       | String, default: `'Wings Lashes'`                                                  |

---

## 3. UI Design Patterns & Existing Modal Audit

### 3.1 Audited Modal Components

1. `CopyComboModal.tsx` (`/Users/dannydo/projects/mos-lab/apps/web/components/customer-detail/components/CopyComboModal.tsx`)
2. `CallLogModal.tsx` (`/Users/dannydo/projects/mos-lab/apps/web/components/CallLogModal.tsx`)
3. `CustomerDetailDrawer.tsx` (`/Users/dannydo/projects/mos-lab/apps/web/components/CustomerDetailDrawer.tsx`)

### 3.2 Modal Design & Architectural Standards

- **Dual-Pane Layout (Nửa trái / Nửa phải)**:
  - **Left Pane (Editor & Controls)**:
    - Variable tag chips: Rendered via `<Tag color="orange" onClick={() => handleInsertTag('{ten_khach}')}>+ Tên KH</Tag>`.
    - Monospace `TextArea` (`fontFamily: 'monospace'`) with resize observer for template customization.
    - Template action buttons: Reset Default, Save Default.
  - **Right Pane (Live Preview & Metrics)**:
    - Smartphone/SMS chat bubble style preview box with dynamic tag substitution (`previewText`).
    - Live metrics counter: Character count (`X/160`), SMS count (`1 tin SMS` or `2 tin SMS`).
- **Theme & Token Compliance**:
  - Theme hook: `const { themeMode } = useTheme();` and `const { token } = theme.useToken();`.
  - Background styling: `themeMode === 'dark' ? '#1e293b' : '#ffffff'`.
  - Strict compliance with `AGENTS.md` (no hardcoded dark mode colors without conditional handling).
- **Ant Design 5 & Tailwind v4 Integration**:
  - Antd 5: `<Modal>`, `<Form>`, `<Input.TextArea>`, `<Button>`, `<Tag>`, `<Space>`, `<Tooltip>`, `<Divider>`, `<ConfigProvider>`.
  - Tailwind v4: `flex`, `flex-col`, `gap-3`, `tabular-nums`, `rounded-xl`, `border-slate-200 dark:border-slate-800`.
- **Resizability & LocalStorage Persistence**:
  - Modal title controls: Preset width toggle buttons (`CompressOutlined` 520px/600px, `ExpandOutlined` 750px, `FullscreenOutlined` 900px/950px).
  - Bottom-right corner drag handle for manual width adjustment.
  - State persistence in `localStorage`: `mos_sms_modal_width`, `mos_sms_template`.

---

## 4. Integration Architecture & Implementation Recommendations

### 4.1 "Thao tác" Column Integration

- Update column width in `LocaColumns.tsx` and `NycColumns.tsx` from `120px` to `180px`-`200px`.
- Add `"Gửi SMS"` button alongside `"Lên lịch gọi"` in the `Space` container:
  ```tsx
  <Tooltip title="Gửi SMS cho khách hàng">
    <Button
      type="default"
      size="small"
      icon={<MessageOutlined style={{ color: '#fa8c16' }} />}
      onClick={(e) => {
        e.stopPropagation();
        onOpenSmsModal(record);
      }}
      className="hover:border-amber-500 hover:text-amber-500"
    >
      SMS
    </Button>
  </Tooltip>
  ```

### 4.2 Component Hierarchy & Data Flow

1. **Component**: `apps/web/components/sms/SmsModal.tsx` (or `apps/web/components/SmsModal.tsx`).
2. **Hooks**:
   - Update `useLocaData` and `useNycData` to hold `smsModalVisible` (boolean) and `selectedSmsCustomer` (`Customer | null`).
   - Pass `onOpenSmsModal` into `getLocaColumns` and `getNycColumns`.
3. **Pages**:
   - Dynamically load `SmsModal` in `LocaCampaignPage` (`apps/web/app/dashboard/loca/page.tsx`) and `NycCampaignPage` (`apps/web/app/dashboard/nyc/page.tsx`).
