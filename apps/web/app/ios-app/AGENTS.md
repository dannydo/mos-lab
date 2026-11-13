# 📱 AI Agent Guide — mOS iOS Consultation & Checkout App (`/ios-app`)

This document is the authoritative developer contract for AI Agents working inside `apps/web/app/ios-app`. Read this file **before** modifying any screen, hook, modal, or API integration in `/ios-app`.

---

## 1. Non-Negotiable Module Invariants (Enforced by `pnpm check:ui-contract`)

1. **Context-Window File Size Ceiling (`<= 700 lines/file`)**:
   - Every `.ts` and `.tsx` file under `apps/web/app/ios-app/` MUST stay **<= 700 lines** so any AI Agent can read an entire file in a single `read_file` call (800-line limit).
   - Never add hundreds of lines directly into an orchestrator file (`ScreenXX*.tsx` or `useIosAppState.ts`). Extract focused sub-components/hooks into the screen's feature folder (`screens/consultation/`, `screens/checkin/`, `screens/incoming/`, `screens/servicing/`, `screens/upsell/`, `screens/checkout/`, `ui-kit/combo-card/`).
2. **Single Source of Truth (`@mos-lab/shared` + `apiClient.ios`)**:
   - Shared types, 7/7 natural lash validation, bonus/tip/billing math, and `CVL` privacy scope live in [`packages/shared/src/types/ios-app.ts`](../../../../packages/shared/src/types/ios-app.ts) and are exported from `@mos-lab/shared`.
   - All HTTP calls to `/api/ios/*` MUST go through `apiClient.ios` ([`apps/web/lib/api/ios.api.ts`](../../lib/api/ios.api.ts)). Raw `fetch('/api/ios/...')` or `${apiBase}/ios/...` inside `/ios-app` is strictly forbidden and blocked by `check:ui-contract`.
3. **UI Vector Feather & Respectful Language Invariant (Rule 8)**:
   - NEVER use raw Unicode feather emoji (`U+1FAB6`) anywhere in `.ts` or `.tsx` files under `app/ios-app/` (macOS/iOS renders it like a brown baguette at 10–14px). Always render vector components `<CvFeather1Badge />`, `<CvFeather2Badge />`, or `<FeatherSvg />` from [`components/ui-kit/CvFeatherLabels.tsx`](./components/ui-kit/CvFeatherLabels.tsx), and use tier codes `'CVL'` / `'CVLL'` in plain strings.
   - NEVER use legacy `+` tier labels or disrespectful technician terms; always use `CV`, `CVL` (`Chuyên Viên Tự Chủ`), `CVLL` (`Chuyên Viên Tự Chủ Cấp Cao`), `CC`, `Chuyên Viên`.
4. **Role Lock & `CVL` Customer Privacy Scope (Kinh Thánh mOS `UI-010`)**:
   - Only `CVL`, `CVLL`, `CC`, and `Admin / Super Admin` (`canAccessIosConsultationApp`) may access `/ios-app`.
   - Non-admin users are strictly locked to their authenticated role (`resolveLockedIosRoleForUser`), ignoring `?role=` spoofing.
   - `CVL` accounts MUST NEVER see `STORE_ALL` or other specialists' bookings — they may ONLY view **(a)** unassigned lobby queue customers (`Đầu tua`: all unassigned customers in the next upcoming time slot, plus any late unassigned `INCOMING` customers who have not arrived yet alongside the next upcoming time slot) and **(b)** their own assigned/checked-in/checked-out customers (`filterBookingsForCvlScope`).
5. **Zero-Default 7/7 Natural Lash Diagnostic Gate (Kinh Thánh mOS `OPS-003` v1.2.0)**:
   - Natural Lash Check has **zero pre-filled defaults**. EVERY customer without a complete saved 7/7 Natural Lash profile (`CHƯA ĐO` — whether `Lần 1` or returning `Lần 10`) MUST have all 7 parameters measured (`naturalLashLength`, `naturalLashThickness`, `naturalLashCount`, `lashTrail`, `eyeShape`, `lashHealth`, `medicalProblem`) before unlocking Lash Design, reaching `Nhiệm Vụ Ca Làm` (`Step 6`), saving consultation, or starting the servicing timer (`hasCompleteNaturalLashSet` / `validateNaturalLashConsultationSave`). Once saved, 7/7 profiles persist per customer under `IOS_CUST_NLASH:<customerId>`.
6. **100% Live Data Purity vs. Explicit Demo Mode (`?demo=1`)**:
   - Default `/ios-app` runs in **Live Mode**: never initialize with or fall back to `INITIAL_BOOKINGS`, never fabricate lash history dates, and never inject mock bookings.
   - Pass `?demo=1` (Admin/QA testing) to enable `INITIAL_BOOKINGS` demo dataset and `RESET_DEMO` controls.

---

## 2. Step-Index Routing Map (`state.currentStep` <-> Component)

> **Critical Note for AI Agents:** Because `Step 8` was inserted for `Screen07bLashProgressCleaned`, `currentStep` numbers `8..15` are offset by `+1` from `Screen08..Screen14` filenames! Always check this table when calling `setCurrentStep(n)`:

| `currentStep` | Screen Component                   | Business Stage                                                              | Primary Next Transition                                              |
| :-----------: | :--------------------------------- | :-------------------------------------------------------------------------- | :------------------------------------------------------------------- |
|     **1**     | `Screen01IncomingBookings.tsx`     | Sảnh đón khách (`INCOMING` / `SERVICING` / `DONE` / `CANCEL`)               | `2` (Incoming), `3` (Checked-in), `6..14` (Servicing), `15` (Done)   |
|     **2**     | `Screen02CheckInProfile.tsx`       | Đón khách, Hồ sơ mi & Quick Check-in                                        | `3` (Tư vấn chi tiết) hoặc `6` (Quick Check-in khách cũ)             |
|     **3**     | `Screen03ConsultationMatrix.tsx`   | Kiểm tra 7/7 mi thật, Thiết kế dáng mi & Tư vấn gói Combo                   | `6` (`CVL`/`CVLL` tự nhận ca) hoặc `4` (`CC`/`CVLL` chia ca)         |
|     **4**     | `Screen04StaffQueueAssign.tsx`     | Điều phối phân công Chuyên Viên (`CC` / `CVLL`)                             | `5`                                                                  |
|     **5**     | `Screen05ServicingTransfer.tsx`    | Bàn giao iPad / Chuyển ca về máy Chuyên Viên                                | `6`                                                                  |
|     **6**     | `Screen06CvDashboardReceive.tsx`   | Chuyên Viên nhận ca & Cam kết thời lượng hoàn thành                         | `7` (khóa & chuyển về `3` nếu khách chưa đo đủ 7/7 thông số mi thật) |
|     **7**     | `Screen07LashProgressBefore.tsx`   | Chụp ảnh mi **Before** (trước vệ sinh)                                      | `8`                                                                  |
|     **8**     | `Screen07bLashProgressCleaned.tsx` | Vệ sinh Spa mi, Đếm sợi dặm (trái/phải) & Ảnh **Cleaned**                   | `9`                                                                  |
|     **9**     | `Screen08LashProgressTimer.tsx`    | Đồng hồ bấm giờ thực hiện kỹ thuật nối mi                                   | `10`                                                                 |
|    **10**     | `Screen09LashProgressAfter.tsx`    | Chụp ảnh hoàn thiện **After**                                               | `11`                                                                 |
|    **11**     | `Screen10CustomerSurvey.tsx`       | Khảo sát hài lòng khách hàng (Happiness Index)                              | `12`                                                                 |
|    **12**     | `Screen11ProductUpsell.tsx`        | Tư vấn Dưỡng mi Yeppeum & Smart Combo Matching / Khấu trừ gói               | `13`                                                                 |
|    **13**     | `Screen12CheckoutBilling.tsx`      | Đối soát hóa đơn, Kim Cương, VAT 8% & Thanh toán (VietQR/POS/Tiền mặt)      | `14` (hoặc `15` hoàn tất)                                            |
|    **14**     | `Screen13CheckoutTip.tsx`          | Bóc tách Tip (70% Làm mi + 10% Check-in + 10% Check-out) & Thưởng bậc thang | `15`                                                                 |
|    **15**     | `Screen14ThermalReceiptDone.tsx`   | Xuất phiếu in nhiệt ESC/POS LAN/Bluetooth & Đóng ca (`DONE`)                | `1` (Quay về Sảnh)                                                   |

**Auxiliary Role & Tab Screens (`page.tsx` top-level switches):**

- `state.isSettingsOpen === true` -> `ScreenSettingsRoleSwitch.tsx` (Admin Role/Branch Switcher & ESC/POS Printer Config)
- `state.role === 'STORE'` -> `ScreenStoreDashboard.tsx` (Live Salon Floor Beds & Branch Revenue)
- `state.role === 'INVENTORY'` -> `ScreenInventoryStock.tsx` (Lash/Glue/Care SKU Stock Monitor)
- `state.activeTab === 'paystub'` -> `ScreenCvPaystub.tsx` (Autonomous Specialist Live Paystub & Tip Breakdown)

---

## 3. Directory Map

```text
apps/web/app/ios-app/
├── page.tsx                          # Route guard, ?role / ?step / ?demo=1 parser & 1..15 step switch
├── state/
│   ├── useIosAppState.ts             # Public orchestrator facade hook (re-exports domain helpers)
│   ├── useIosBookingList.ts          # Standalone booking list hook via apiClient.ios
│   ├── useIosBillingCheckout.ts      # Upsell, checkout, tip & bonus hook (uses @mos-lab/shared math)
│   ├── offlineSync.ts                # LocalStorage + IndexedDB progress snapshot & offline action replay
│   └── mockData.ts                   # Shared type re-exports + demo dataset (?demo=1 only)
├── components/
│   ├── screens/                      # Entry Screen01..Screen14 + feature sub-folders:
│   │   ├── incoming/                 # Sub-components & helpers for Screen01
│   │   ├── checkin/                  # Sub-components & helpers for Screen02
│   │   ├── consultation/             # Sub-components, hooks & constraint matrix for Screen03
│   │   ├── servicing/                # Sub-components for Screen06 & Screen07b
│   │   ├── upsell/                   # Sub-components for Screen11
│   │   └── checkout/                 # Sub-components for Screen12
│   └── ui-kit/                       # Reusable iOS primitives (<CvFeather1Badge />, ComboSessionBadge, etc.)
└── services/
    └── thermalPrinterService.ts      # WebBluetooth / RawBT / LAN ESC/POS via apiClient.ios.printReceipt
```

---

## 4. 5-Minute AI Agent Extension Recipes

### Recipe A — Add a New Field to Consultation or Booking

1. Add the field to `IosBookingAttributes` (or `IosBookingItem`) in [`packages/shared/src/types/ios-app.ts`](../../../../packages/shared/src/types/ios-app.ts) and run `pnpm --filter @mos-lab/shared build`.
2. Map/persist the field in `apps/api/src/modules/ios/services/ios-actions.service.ts` and `ios-bookings-query.service.ts`.
3. Render/update the field inside the dedicated sub-component under `components/screens/consultation/` (keeping every file `<= 700` lines).
4. Add a unit test in `components/screens/__tests__/` or `apps/api/src/modules/ios/routes.test.ts`.

### Recipe B — Add a New Backend Action (`POST /api/ios/bookings`)

1. Add the action literal to `IosBookingActionType` in `packages/shared/src/types/ios-app.ts` and rebuild `@mos-lab/shared`.
2. Implement the handler branch in `apps/api/src/modules/ios/services/ios-actions.service.ts` using atomic `loadBookingOverride(bookingId)` + `saveBookingOverride(bookingId, next)` (never write a global JSON blob).
3. Call `apiClient.ios.executeBookingAction({ bookingId, action: 'YOUR_ACTION', ... })` from the appropriate `state/` sub-hook (or `enqueueOfflineAction` if offline-capable).

### Recipe C — Verification Checklist Before Handoff

```bash
pnpm check:ui-contract
pnpm --filter @mos-lab/api test
pnpm --filter @mos-lab/web exec vitest run app/ios-app
pnpm verify:quick
```
