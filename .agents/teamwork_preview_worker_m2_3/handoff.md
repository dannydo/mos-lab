# Handoff Report — worker_m2_3

## 1. Observation

- `apps/web/app/dashboard/nyc/page.tsx`: Booker/Telesales Select dropdown (line 286) lacked `showSearch` and tone-insensitive Vietnamese filter option. Added `showSearch` and `filterOption={vietnameseSearchFilter}` imported from `@mos-lab/shared`.
- `apps/web/app/dashboard/omicall/page.tsx`: Staff filter Select (line 621) used inline `.toLowerCase().includes(...)` without tone normalization. Refactored to `filterOption={vietnameseSearchFilter}`.
- `apps/web/app/dashboard/staff/components/StaffTabsContent.tsx`: Legacy Wings Lashes Staff Select (line 208) used `optionFilterProp="children"`. Removed `optionFilterProp="children"` and added `filterOption={vietnameseSearchFilter}`.
- `apps/web/app/dashboard/staff/page.tsx`: Target Merge Staff Select (line 1168) lacked search capabilities. Added `showSearch` and `filterOption={vietnameseSearchFilter}`.
- `apps/web/components/BookingWizardDrawer.tsx`: Service Select (line 735) and Promotion Select (line 897) used inline `.toLowerCase().includes(...)`. Refactored both to `filterOption={vietnameseSearchFilter}`.
- `apps/web/components/RescheduleBookingModal.tsx`: Service Select (line 402) used inline `.toLowerCase().includes(...)`. Refactored to `filterOption={vietnameseSearchFilter}`.
- `apps/web/components/DailyCallsTable.tsx`: Admin Booker filter Select (line 598) lacked search capabilities. Added `showSearch` and `filterOption={vietnameseSearchFilter}`.
- **Build Verification**: Ran `pnpm --filter @mos-lab/web build`. The output confirmed clean compilation with 0 errors:
  ```
  ✓ Compiled successfully
  ✓ Linting and checking validity of types
  ✓ Collecting page data
    Generating static pages (16/16)
  ✓ Finalizing page optimization
  ```

## 2. Logic Chain

- Standardized search across the application requires tone-insensitive and case-insensitive Vietnamese string matching (`removeVietnameseTones` / `vietnameseSearchFilter`).
- Using `vietnameseSearchFilter` from `@mos-lab/shared` provides a centralized helper that inspects `option.label`, `option.children`, and `option.value`, stripping accents and converting to lowercase for robust matching.
- Applying `showSearch` and `filterOption={vietnameseSearchFilter}` across all Select dropdowns ensures consistent UX for users searching Vietnamese names, service titles, and promotions regardless of diacritics input.

## 3. Caveats

- No caveats. All target components were updated without changing non-search behavior.

## 4. Conclusion

- Refactoring completed for all 7 specified Select controls across `/dashboard/nyc`, `/dashboard/omicall`, `/dashboard/staff`, `BookingWizardDrawer.tsx`, `RescheduleBookingModal.tsx`, and `DailyCallsTable.tsx`.
- Web build compiles cleanly without any TypeScript errors or build failures.

## 5. Verification Method

- Execute:
  `pnpm --filter @mos-lab/web build`
- Inspect code changes in:
  - `apps/web/app/dashboard/nyc/page.tsx`
  - `apps/web/app/dashboard/omicall/page.tsx`
  - `apps/web/app/dashboard/staff/components/StaffTabsContent.tsx`
  - `apps/web/app/dashboard/staff/page.tsx`
  - `apps/web/components/BookingWizardDrawer.tsx`
  - `apps/web/components/RescheduleBookingModal.tsx`
  - `apps/web/components/DailyCallsTable.tsx`
