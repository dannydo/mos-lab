# Handoff Report — Tone-Insensitive & Case-Insensitive Vietnamese Search Refactoring (Worker M2_2)

**Worker**: `worker_m2_2`  
**Working Directory**: `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m2_2`  
**Scope**: `/dashboard/cv`, `/dashboard/catalog`, `/dashboard/appointments`, `/dashboard/loca`  
**Date**: 2026-07-28

---

## 1. Observation

Direct observations and evidence chain of changes across the 4 assigned dashboard modules:

1. **Shared Utilities (`packages/shared/src/utils/search.ts` & `apps/web/lib/utils/search.ts`)**:
   - Created `removeVietnameseTones(str: string): string` to normalize diacritics, convert `đ`/`Đ` to `d`/`D`, lowercase, and trim input strings safely.
   - Created `vietnameseSearchFilter(input: string, option?: any): boolean` to handle Ant Design `<Select showSearch>` filtering against option `label`, `children`, or `value`.
   - Exported from `@mos-lab/shared` index and re-exported from `apps/web/lib/utils/search.ts`.

2. **`/dashboard/cv`**:
   - `apps/web/app/dashboard/cv/page.tsx`: Imported `vietnameseSearchFilter` from `@mos-lab/shared`. Updated Consultant `<Select showSearch>` (line 232) to use `filterOption={vietnameseSearchFilter}`.
   - `apps/web/app/dashboard/cv/components/CvConfigDrawer.tsx`: Imported `removeVietnameseTones` from `@mos-lab/shared`. Refactored `filteredStaff` (line 50) to filter `displayName` and `username` using `removeVietnameseTones`.
   - `apps/web/app/dashboard/cv/components/CvThuNhapTab.tsx`: Imported `removeVietnameseTones` from `@mos-lab/shared`. Refactored `filteredData` (line 403) to filter `staffName` and `store` using `removeVietnameseTones`.
   - `apps/web/app/dashboard/cv/components/CvTipTab.tsx`: Imported `removeVietnameseTones` from `@mos-lab/shared`. Refactored `filteredRecords` (line 147) to filter `techName`, `clientName`, and `serviceName` using `removeVietnameseTones`.
   - `apps/web/app/dashboard/cv/components/CvXoayTab.tsx`: Imported `removeVietnameseTones` from `@mos-lab/shared`. Refactored `filteredData` (line 166) to filter `techName`, `clientName`, `serviceName`, and `store` using `removeVietnameseTones`.

3. **`/dashboard/catalog`**:
   - `apps/web/app/dashboard/catalog/page.tsx`: Imported `vietnameseSearchFilter` from `@mos-lab/shared`. Updated Combo Drawer Applicable Service `<Select showSearch>` (line 1746) to use `filterOption={vietnameseSearchFilter}`.

4. **`/dashboard/appointments`**:
   - `apps/web/app/dashboard/appointments/page.tsx`: Imported `vietnameseSearchFilter` from `@mos-lab/shared`. Updated Booker Select (line 315) to include `showSearch` and `filterOption={vietnameseSearchFilter}`.

5. **`/dashboard/loca`**:
   - `apps/web/app/dashboard/loca/page.tsx`: Imported `vietnameseSearchFilter` from `@mos-lab/shared`. Updated Booker/Telesales Select (line 315) to include `showSearch` and `filterOption={vietnameseSearchFilter}`.

---

## 2. Logic Chain

1. **Utility Standardization**: Standardizing `removeVietnameseTones` and `vietnameseSearchFilter` in `@mos-lab/shared` ensures accent-insensitive search logic is identical across frontend UI components and shared types.
2. **Select Control Filtering**: Replacing basic `.toLowerCase().includes()` or default `optionFilterProp="label"` with `vietnameseSearchFilter` allows users to search for Vietnamese text regardless of whether accents/diacritics are typed (e.g. searching "ngoc" matches "Ngọc Điệp", "thuy" matches "Thuỳ Trang").
3. **Array Filter Normalization**: Using `removeVietnameseTones` in `useMemo` hooks for data tables and drawer lists ensures filtering matches both accented and unaccented search queries consistently across all CV tabs and drawers.
4. **Minimal Changes & Parity**: Edits directly targeted specified line ranges and components without modifying unrelated code or UI layout structure.

---

## 3. Caveats

No caveats. All specified controls across `/dashboard/cv`, `/dashboard/catalog`, `/dashboard/appointments`, and `/dashboard/loca` were refactored with genuine logic and verified.

---

## 4. Conclusion

All search controls across `/dashboard/cv`, `/dashboard/catalog`, `/dashboard/appointments`, and `/dashboard/loca` have been successfully refactored to support tone-insensitive and case-insensitive Vietnamese search using `removeVietnameseTones` and `vietnameseSearchFilter`.

---

## 5. Verification Method

Independent verification steps:

1. **Build `@mos-lab/shared`**:

   ```bash
   pnpm --filter @mos-lab/shared build
   ```

   _Status_: PASS (0 compilation errors).

2. **Build `@mos-lab/web`**:

   ```bash
   pnpm --filter @mos-lab/web build
   ```

   _Status_: PASS (Compiled successfully in 15.8s, 0 TypeScript errors).

3. **Source Inspection**:
   - `apps/web/app/dashboard/cv/page.tsx` (Consultant Select uses `vietnameseSearchFilter`)
   - `apps/web/app/dashboard/cv/components/CvConfigDrawer.tsx` (`filteredStaff` uses `removeVietnameseTones`)
   - `apps/web/app/dashboard/cv/components/CvThuNhapTab.tsx` (`filteredData` uses `removeVietnameseTones`)
   - `apps/web/app/dashboard/cv/components/CvTipTab.tsx` (`filteredRecords` uses `removeVietnameseTones`)
   - `apps/web/app/dashboard/cv/components/CvXoayTab.tsx` (`filteredData` uses `removeVietnameseTones`)
   - `apps/web/app/dashboard/catalog/page.tsx` (Applicable Service Select uses `vietnameseSearchFilter`)
   - `apps/web/app/dashboard/appointments/page.tsx` (Booker Select uses `showSearch` + `vietnameseSearchFilter`)
   - `apps/web/app/dashboard/loca/page.tsx` (Booker/Telesales Select uses `showSearch` + `vietnameseSearchFilter`)
