# Review & Handoff Report — Milestone 3: SMS Action Web Frontend Implementation

## 1. Observation

Direct code inspection and verification commands yielded the following findings:

### 1.1 Dual-Pane Layout & Components (`apps/web/components/sms/SMSModal.tsx`)

- **Left Pane (5 columns - `md:col-span-5`)**:
  - Displays customer SMS history via `history.map` (lines 344–377).
  - Shows date formatting, staff tag (`createdStaffName`), recipient phone number, and message body.
  - Includes total count tag (`history.length`, line 318) and reload button (`reloadHistory`, line 326) with spin indicator (`loadingHistory`).
- **Right Pane (7 columns - `md:col-span-7`)**:
  - Recipient phone `Input` with `PhoneOutlined` prefix (lines 388–400).
  - SMS Template `Select` dropdown populated via `apiClient.sms.getTemplates()` (lines 405–416).
  - Variable Tag Chips mapped over `DEFAULT_SMS_VARIABLE_TAGS` from `@mos-lab/shared` (lines 424–435).
  - Custom `TextArea` editor with monospace font for template editing (lines 441–453).
  - Live Preview box with dynamic tag replacement (`livePreview` using `replaceAll`, lines 175–181 & 471–482).
  - Character & Segment Counter displaying `{characterCount} / 160 ký tự ({smsSegments} SMS)` with threshold color coding (lines 460–468).
  - Modal Footer Actions: "Lưu Template Mẫu" button for Admin (`user?.role === 'admin'`, lines 489–496), "Hủy" button, and gold "Gửi SMS" button with `SendOutlined` icon and loading state (lines 501–513).
- **Admin Save Template Modal**:
  - Embedded secondary `<Modal>` (lines 520–558) allowing Admin to enter template title and category (`GENERAL`, `REMINDER`, `PROMOTION`, `AFTERCARE`), calling `apiClient.sms.saveTemplate()`.

### 1.2 Button Integration in "Chạm 17 (ngày)" Tab

- `apps/web/app/dashboard/loca/components/LocaColumns.tsx`:
  - `getLocaColumns` (lines 326–337) and `getNewLocaColumns` (lines 535–546) include "Gửi SMS" button with gold border `#D4A84B` and `MessageOutlined` icon in the "Thao tác" column.
- `apps/web/app/dashboard/nyc/components/NycColumns.tsx`:
  - `getNycColumns` (lines 303–314) includes "Gửi SMS" button in the "Thao tác" column.
- `apps/web/app/dashboard/loca/page.tsx` & `apps/web/app/dashboard/nyc/page.tsx`:
  - Dynamically import `SMSModal` (`ssr: false`) and pass `smsModalVisible`, `selectedCustomer`, `onClose`, and `onSuccess` callback.

### 1.3 Theme Compliance & `tabular-nums` Formatting

- **Light/Dark Theme**:
  - Uses `useTheme()` context hook (`contextThemeMode`).
  - Implements Ant Design 5 `styles={{ content: {...}, header: {...} }}` configuration for theme-aware modal backgrounds (`#141414` in dark mode, `#ffffff` in light mode).
  - Uses theme-conditional styles for left pane (`bg-[#1a1a1a]`), cards (`border-[#303030]`), inputs, and preview box (`bg-amber-950/20` vs `bg-amber-50`).
- **Tabular Numbers (`tabular-nums`)**:
  - Applied to SMS history counter tag (`fontVariantNumeric: 'tabular-nums'`), history timestamp (`tabular-nums font-semibold`), phone number displays, phone input, and character count display (`fontVariantNumeric: 'tabular-nums'`).

### 1.4 API SDK Integration (`apps/web/lib/api-client.ts`)

- Zero raw `axios` or `fetch` strings found in components.
- All backend requests use `apiClient.sms` SDK methods: `getTemplates()`, `saveTemplate()`, `deleteTemplate()`, `getHistory()`, `sendSms()`.

### 1.5 Integrity Violations Check

- No hardcoded test outputs or mock fallback shortcuts embedded in source files.
- Real API calls wired with loading states, error reporting (`message.error`), and proper state updates.

### 1.6 Production Build Verification

- Command: `pnpm --filter @mos-lab/web build`
- Result: **Exit Code 0** (Success). Both `/dashboard/loca` and `/dashboard/nyc` pages compiled cleanly with Next.js Turbopack compiler.

---

## 2. Logic Chain

1. **Observation**: `SMSModal.tsx` defines a responsive dual-pane layout (`grid-cols-12`) with history panel on the left (5 cols) and message editor/preview on the right (7 cols).
2. **Logical Inference**: The dual-pane structure allows consultants to reference past SMS interactions while composing new messages, eliminating context switching.
3. **Observation**: Variables such as `{ten_khach}`, `{han_dung}`, and `{so_ngay_dam}` are dynamically replaced in `livePreview` via `tagValues` derived from `Customer` properties.
4. **Logical Inference**: Consultants can instantly verify what the customer will read before sending, preventing formatting errors or missing placeholders.
5. **Observation**: "Gửi SMS" buttons are present in the "Thao tác" column across both LoCa and NYC column definitions (`LocaColumns.tsx` and `NycColumns.tsx`), opening `SMSModal` with the target customer preselected.
6. **Logical Inference**: The SMS action workflow is cleanly integrated into the primary Touch 17 operational dashboards for seamless access.
7. **Observation**: Light/Dark theme switching is implemented via `useTheme()` and Antd 5 `styles` object, while `tabular-nums` is used on all dynamic numbers and timestamps. Next.js web build passes with exit code 0.
8. **Conclusion**: The web frontend implementation meets all requirements for correctness, UI quality, theme compliance, SDK usage, and build integrity.

---

## 3. Caveats

- **External Telecom Provider Integration**: SMS delivery to actual carrier networks depends on the Fastify backend provider configuration (e.g. SpeedSMS / eSMS / Zalo SMS gateway). The web frontend correctly handles API responses (`response.success`).
- **No caveats** regarding code structure or UI layout implementation.

---

## 4. Conclusion

**Verdict**: **APPROVE**

The web frontend implementation in `apps/web/components/sms/SMSModal.tsx`, `apps/web/app/dashboard/loca/`, `apps/web/app/dashboard/nyc/`, and `apps/web/lib/api-client.ts` is fully compliant with specifications, design rules, theme guidelines, and architecture conventions.

---

## 5. Verification Method

To independently verify this review:

1. **Run Web Production Build**:

   ```bash
   pnpm --filter @mos-lab/web build
   ```

   _Expected Output_: Exit code 0, successful page optimization for `/dashboard/loca` and `/dashboard/nyc`.

2. **Inspect Source Files**:
   - `apps/web/components/sms/SMSModal.tsx`
   - `apps/web/app/dashboard/loca/components/LocaColumns.tsx` (lines 326–337, 535–546)
   - `apps/web/app/dashboard/nyc/components/NycColumns.tsx` (lines 303–314)
   - `apps/web/lib/api-client.ts` (lines 997–1020)

3. **Check Theme & Layout Tokens**:
   - Verify presence of `useTheme()` and `tabular-nums` class/style properties in `SMSModal.tsx`.
