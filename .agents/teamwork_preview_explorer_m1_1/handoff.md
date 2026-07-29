# Explorer 1 Handoff Report - Milestone 1: SMS Action Feature Audit

## 1. Observation

Direct observations from examining the codebase:

1. **LoCa Campaign Views**:
   - Location: `apps/web/app/dashboard/loca/page.tsx`, `LocaColumns.tsx` (`apps/web/app/dashboard/loca/components/LocaColumns.tsx`), `useLocaData.ts` (`apps/web/app/dashboard/loca/hooks/useLocaData.ts`).
   - "Chạm 17 (ngày)" Touchpoint: In `LOCA_ALL` tab, defined in `DEFAULT_LOCA_CONFIGS` (line 42 of `useLocaData.ts`) as `{ key: '17', label: '17 ngày', daysMin: 17, daysMax: 17, color: '#3B82F6' }`.
   - "Thao tác" Column: Defined in `LocaColumns.tsx` (lines 297-327) with `width: 120` containing only the "Lên lịch gọi" (`handleAddToPlan`) button.

2. **NYC Campaign Views**:
   - Location: `apps/web/app/dashboard/nyc/page.tsx`, `NycColumns.tsx` (`apps/web/app/dashboard/nyc/components/NycColumns.tsx`), `useNycData.ts` (`apps/web/app/dashboard/nyc/hooks/useNycData.ts`).
   - "Thao tác" Column: Defined in `NycColumns.tsx` (lines 274-304) with `width: 110` containing only the "Lên lịch gọi" button.

3. **Customer Row Data Model**:
   - Shared Type: `Customer` interface in `packages/shared/src/types/customer.ts` (lines 5-65).
   - Available customer fields for template interpolation: `name`, `phone`, `daysSinceLastVisit`, `comboBalance` (`normalCount`, `retainCount`, `expiryDate`), `newComboDetails` (`comboName`, `comboPrice`, `purchaseDate`, `bookerName`, `ccInName`, `ccOutName`, `cvName`), `assignedStaff` (`displayName`), `id`.

4. **UI Design Patterns & Modals**:
   - Reference modal: `CopyComboModal.tsx` (`apps/web/components/customer-detail/components/CopyComboModal.tsx`).
   - Design patterns: Dual-pane layout, variable tag insertion chips (`Tag`), monospace `TextArea`, live preview box with tag replacement, Ant Design 5 & Tailwind v4 theme-aware styling (`.dark-theme`, `.light-theme`, `useTheme()`, `theme.useToken()`), modal width resizability, and `localStorage` persistence.

---

## 2. Logic Chain

1. **Observation 1 & 2** show that both LoCa (`/dashboard/loca`) and NYC (`/dashboard/nyc`) tables have dedicated "Thao tác" columns (`LocaColumns.tsx` line 297 and `NycColumns.tsx` line 274). The width of these columns (110px-120px) currently only accommodates a single button ("Lên lịch gọi").
2. **Observation 3** establishes that all customer attributes required for SMS placeholders (`{ten_khach}`, `{sdt_khach}`, `{han_dung}`, `{so_ngay_dam}`, `{ten_combo}`, `{sdt_cua_hang}`, `customer ID`, `{cc_phu_trach}`) exist on the `Customer` type or are easily derived from store/OmiCall contexts.
3. **Observation 4** demonstrates that `CopyComboModal.tsx` serves as the established gold-standard pattern for message template editing, tag insertion, live preview, dual-pane layout, and theme compliance in `mos-lab`.
4. Therefore, integrating the "Gửi SMS" action into LoCa and NYC requires expanding the "Thao tác" column width to 180px-200px, adding an "SMS" button with `MessageOutlined` icon, wiring `smsModalVisible` state in `useLocaData` / `useNycData`, and creating a reusable `SmsModal` component based on `CopyComboModal.tsx`.

---

## 3. Caveats

- **Store Hotline Variable (`{sdt_cua_hang}`)**: In the current frontend, store hotline defaults to `'0328703439'` (OmiCall Viettel SIP Trunk Hotline). If multi-branch hotline routing is added in future backend endpoints, the fallback string `'0328703439'` will safely ensure no template tag remains unresolved.
- **Scope Limit**: As Explorer 1, this task is strictly a read-only investigation. No application source code changes were made in `apps/web` or `packages/shared`.

---

## 4. Conclusion

- Customer care views (`loca` and `nyc`) are fully structured to support SMS actions.
- The `Customer` model provides all necessary fields to resolve template tags (`{ten_khach}`, `{sdt_khach}`, `{han_dung}`, `{so_ngay_dam}`, `{ten_combo}`, `{sdt_cua_hang}`, `customer ID`).
- The recommended implementation path is to build `SmsModal` adhering to the dual-pane layout of `CopyComboModal.tsx`, expand the "Thao tác" column width in `LocaColumns.tsx` and `NycColumns.tsx`, and trigger the modal via a new "SMS" button.

---

## 5. Verification Method

To verify these findings:

1. Inspect `apps/web/app/dashboard/loca/components/LocaColumns.tsx` (lines 297-327) and `apps/web/app/dashboard/nyc/components/NycColumns.tsx` (lines 274-304) to confirm the "Thao tác" column definition.
2. Inspect `packages/shared/src/types/customer.ts` (lines 5-65) to confirm `Customer` type fields.
3. Inspect `apps/web/components/customer-detail/components/CopyComboModal.tsx` to verify the dual-pane modal pattern, variable tag chips, and preview logic.
4. Review the generated analysis report at `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_1/analysis.md`.
