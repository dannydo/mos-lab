# Handoff Report: Ant Design `<Select showSearch>` & Search Control Audit & Refactoring Plan (Modules: CV, Catalog, Appointments, Loca)

**Agent**: `explorer_m1_2`  
**Working Directory**: `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_2`  
**Target Modules**:

1. `/dashboard/cv` (`apps/web/app/dashboard/cv/`)
2. `/dashboard/catalog` (`apps/web/app/dashboard/catalog/`)
3. `/dashboard/appointments` (`apps/web/app/dashboard/appointments/`)
4. `/dashboard/loca` (`apps/web/app/dashboard/loca/`)

---

## 1. Observation

Direct code inspection of the four assigned CRM modules revealed the following Ant Design `<Select showSearch>` components, Table search inputs, and filter controls:

### Module 1: `/dashboard/cv` (`apps/web/app/dashboard/cv/`)

1. **`apps/web/app/dashboard/cv/page.tsx` (Lines 227-238)**
   - **Control**: `<Select showSearch>` for Consultant (Chọn CV).
   - **Current Implementation**:
     ```tsx
     <Select
       value={selectedConsultant}
       onChange={setSelectedConsultant}
       style={{ width: 170 }}
       showSearch
       filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
       options={[
         { value: 'ALL', label: 'Tất cả CV' },
         ...staffOptions.map((s) => ({ value: String(s.staffId), label: s.displayName })),
       ]}
       placeholder="Chọn CV"
     />
     ```
   - **Finding**: `.toLowerCase().includes(...)` is case-insensitive but **tone-sensitive** (e.g. searching `"thanh"` fails to match `"Thành"`).

2. **`apps/web/app/dashboard/cv/components/CvConfigDrawer.tsx` (Lines 50-56 & 125-130)**
   - **Control**: Search `<Input prefix={<SearchOutlined />} placeholder="Tìm tên hoặc username..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />`.
   - **Current Implementation**:
     ```tsx
     const filteredStaff = React.useMemo(() => {
       if (!searchText) return validStaffList;
       const lower = searchText.toLowerCase();
       return validStaffList.filter(
         (s) => s.displayName.toLowerCase().includes(lower) || (s.username && s.username.toLowerCase().includes(lower))
       );
     }, [validStaffList, searchText]);
     ```
   - **Finding**: Lowercase string matching on `displayName` is **tone-sensitive**.

3. **`apps/web/app/dashboard/cv/components/CvThuNhapTab.tsx` (Lines 403-409 & 739-745)**
   - **Control**: Search `<Input placeholder="Tìm tên Chuyên viên..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />`.
   - **Current Implementation**:
     ```tsx
     const filteredData = React.useMemo(() => {
       if (!searchText) return paystubData;
       const lower = searchText.toLowerCase();
       return paystubData.filter(
         (item) => item.staffName.toLowerCase().includes(lower) || item.store.toLowerCase().includes(lower)
       );
     }, [paystubData, searchText]);
     ```
   - **Finding**: Lowercase string matching on `staffName` and `store` is **tone-sensitive**.

4. **`apps/web/app/dashboard/cv/components/CvTipTab.tsx` (Lines 147-156 & 533-538)**
   - **Control**: Search `<Input placeholder="Tìm tên Chuyên viên, Khách hàng, Dịch vụ..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />`.
   - **Current Implementation**:
     ```tsx
     const filteredRecords = React.useMemo(() => {
       if (!searchText) return records;
       const lower = searchText.toLowerCase();
       return records.filter(
         (r) =>
           r.techName.toLowerCase().includes(lower) ||
           r.clientName.toLowerCase().includes(lower) ||
           r.serviceName.toLowerCase().includes(lower)
       );
     }, [records, searchText]);
     ```
   - **Finding**: Lowercase string matching on `techName`, `clientName`, and `serviceName` is **tone-sensitive**.

5. **`apps/web/app/dashboard/cv/components/CvXoayTab.tsx` (Lines 166-182 & 533-538)**
   - **Control**: Search `<Input placeholder="Tìm KTV, Khách hàng, Dịch vụ..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />`.
   - **Current Implementation**:
     ```tsx
     const filteredData = React.useMemo(() => {
       let result = data;
       if (selectedCvName) {
         result = result.filter((item) => item.techName.toLowerCase() === selectedCvName.toLowerCase());
       }
       if (searchText) {
         const lower = searchText.toLowerCase();
         result = result.filter(
           (item) =>
             item.techName.toLowerCase().includes(lower) ||
             item.clientName.toLowerCase().includes(lower) ||
             item.serviceName.toLowerCase().includes(lower) ||
             item.store.toLowerCase().includes(lower)
         );
       }
       return result;
     }, [data, selectedCvName, searchText]);
     ```
   - **Finding**: Lowercase string matching on `techName`, `clientName`, `serviceName`, and `store` is **tone-sensitive**.

---

### Module 2: `/dashboard/catalog` (`apps/web/app/dashboard/catalog/`)

1. **`apps/web/app/dashboard/catalog/page.tsx` (Lines 1746-1755)**
   - **Control**: `<Select showSearch>` in Combo Drawer for selecting applicable service (`serviceId`).
   - **Current Implementation**:
     ```tsx
     <Select
       showSearch
       placeholder="Chọn dịch vụ"
       optionFilterProp="label"
       options={services.map((s) => ({
         value: s.id,
         label: `${s.serviceName || s.serviceKey} (${s.serviceGroup})`,
       }))}
     />
     ```
   - **Finding**: Uses default `optionFilterProp="label"` which does standard string includes without Vietnamese diacritics removal (tone-sensitive).

2. **`apps/web/app/dashboard/catalog/page.tsx` (Line 1312) & `CatalogComboLiveTab.tsx` (Line 466) & `CatalogDateToolbar.tsx` (Line 146)**
   - **Control**: Text search inputs for filtering catalog reports / live combos.
   - **Current Implementation**: State `reportSearch` / `search` passed to backend API parameter `search: search.trim() || undefined`.
   - **Finding**: Server-side filtered query.

---

### Module 3: `/dashboard/appointments` (`apps/web/app/dashboard/appointments/`)

1. **`apps/web/app/dashboard/appointments/page.tsx` (Lines 315-327)**
   - **Control**: `<Select>` for Booker selection (`selectedStaffId`).
   - **Current Implementation**:
     ```tsx
     <Select
       value={selectedStaffId}
       onChange={(value) => {
         setSelectedStaffId(value);
         localStorage.setItem('mos_appointments_selectedStaffId', value);
       }}
       style={{ width: '180px' }}
       options={[
         { value: 'all', label: 'Tất cả Booker' },
         ...staffList.map((s) => ({ value: s.id.toString(), label: s.displayName })),
       ]}
       placeholder="Chọn Booker"
     />
     ```
   - **Finding**: Currently missing `showSearch` and `filterOption`. Adding `showSearch` and tone-insensitive `filterOption` will significantly improve Booker searchability.

2. **`apps/web/app/dashboard/appointments/components/MissedDateNavigator.tsx` (Line 101)**
   - **Control**: Store filter `<Select value={selectedStore} ... />`. Static short list of stores.

3. **`apps/web/app/dashboard/appointments/components/MissedReasonModal.tsx` (Lines 249, 263, 278)**
   - **Control**: Enum category selects (`reasonCategory`, `responsibility`, `followUpStatus`).

---

### Module 4: `/dashboard/loca` (`apps/web/app/dashboard/loca/`)

1. **`apps/web/app/dashboard/loca/page.tsx` (Lines 315-325)**
   - **Control**: `<Select>` for Booker/Telesales selection (`assignedStaffId`).
   - **Current Implementation**:
     ```tsx
     <Select
       placeholder="Chọn Booker/Telesales"
       value={assignedStaffId}
       onChange={(val) => setAssignedStaffId(val)}
       style={{ width: 200 }}
       options={[
         { value: 'ALL', label: 'All Bookers' },
         { value: 'unassigned', label: 'Chưa phân bổ' },
         ...staffList.map((s) => ({ value: s.id.toString(), label: s.displayName })),
       ]}
     />
     ```
   - **Finding**: Missing `showSearch`. Needs `showSearch` and tone-insensitive `filterOption`.

2. **`apps/web/app/dashboard/loca/page.tsx` (Line 774) & `hooks/useLocaData.ts` (Line 251, 297)**
   - **Control**: Borderless search `<Input placeholder="Tìm khách hàng..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />`.
   - **Finding**: `searchQuery` triggers server-side filtered API call via `apiClient.kpi.getNewLoCaList`.

---

## 2. Logic Chain

1. **Standard `removeVietnameseTones` Utility**:
   Existing definition in `apps/web/app/dashboard/today/components/BookerTeamConfigModal.tsx` (Line 10):

   ```typescript
   export const removeVietnameseTones = (str: string): string => {
     return (str || '')
       .normalize('NFD')
       .replace(/[\u0300-\u036f]/g, '')
       .replace(/đ/g, 'd')
       .replace(/Đ/g, 'D')
       .toLowerCase()
       .trim();
   };
   ```

   This standard function strips accents/diacritics, normalizes 'đ'/'Đ' to 'd'/'D', converts to lowercase, and trims whitespace.

2. **Formulated Refactoring Code Snippets**:

   - **CV Module - `apps/web/app/dashboard/cv/page.tsx` (Line 232)**:

     ```tsx
     <Select
       value={selectedConsultant}
       onChange={setSelectedConsultant}
       style={{ width: 170 }}
       showSearch
       filterOption={(input, option) =>
         removeVietnameseTones(String(option?.label || '')).includes(removeVietnameseTones(input))
       }
       options={[
         { value: 'ALL', label: 'Tất cả CV' },
         ...staffOptions.map((s) => ({ value: String(s.staffId), label: s.displayName })),
       ]}
       placeholder="Chọn CV"
     />
     ```

   - **CV Module - `apps/web/app/dashboard/cv/components/CvConfigDrawer.tsx` (Line 50)**:

     ```tsx
     const filteredStaff = React.useMemo(() => {
       if (!searchText) return validStaffList;
       const target = removeVietnameseTones(searchText);
       return validStaffList.filter(
         (s) =>
           removeVietnameseTones(s.displayName).includes(target) ||
           (s.username && removeVietnameseTones(s.username).includes(target))
       );
     }, [validStaffList, searchText]);
     ```

   - **CV Module - `apps/web/app/dashboard/cv/components/CvThuNhapTab.tsx` (Line 403)**:

     ```tsx
     const filteredData = React.useMemo(() => {
       if (!searchText) return paystubData;
       const target = removeVietnameseTones(searchText);
       return paystubData.filter(
         (item) =>
           removeVietnameseTones(item.staffName).includes(target) || removeVietnameseTones(item.store).includes(target)
       );
     }, [paystubData, searchText]);
     ```

   - **CV Module - `apps/web/app/dashboard/cv/components/CvTipTab.tsx` (Line 147)**:

     ```tsx
     const filteredRecords = React.useMemo(() => {
       if (!searchText) return records;
       const target = removeVietnameseTones(searchText);
       return records.filter(
         (r) =>
           removeVietnameseTones(r.techName).includes(target) ||
           removeVietnameseTones(r.clientName).includes(target) ||
           removeVietnameseTones(r.serviceName).includes(target)
       );
     }, [records, searchText]);
     ```

   - **CV Module - `apps/web/app/dashboard/cv/components/CvXoayTab.tsx` (Line 166)**:

     ```tsx
     const filteredData = React.useMemo(() => {
       let result = data;
       if (selectedCvName) {
         const targetCv = removeVietnameseTones(selectedCvName);
         result = result.filter((item) => removeVietnameseTones(item.techName) === targetCv);
       }
       if (searchText) {
         const target = removeVietnameseTones(searchText);
         result = result.filter(
           (item) =>
             removeVietnameseTones(item.techName).includes(target) ||
             removeVietnameseTones(item.clientName).includes(target) ||
             removeVietnameseTones(item.serviceName).includes(target) ||
             removeVietnameseTones(item.store).includes(target)
         );
       }
       return result;
     }, [data, selectedCvName, searchText]);
     ```

   - **Catalog Module - `apps/web/app/dashboard/catalog/page.tsx` (Line 1746)**:

     ```tsx
     <Select
       showSearch
       placeholder="Chọn dịch vụ"
       filterOption={(input, option) =>
         removeVietnameseTones(String(option?.label || '')).includes(removeVietnameseTones(input))
       }
       options={services.map((s) => ({
         value: s.id,
         label: `${s.serviceName || s.serviceKey} (${s.serviceGroup})`,
       }))}
     />
     ```

   - **Appointments Module - `apps/web/app/dashboard/appointments/page.tsx` (Line 315)**:

     ```tsx
     <Select
       showSearch
       value={selectedStaffId}
       onChange={(value) => {
         setSelectedStaffId(value);
         localStorage.setItem('mos_appointments_selectedStaffId', value);
       }}
       style={{ width: '180px' }}
       filterOption={(input, option) =>
         removeVietnameseTones(String(option?.label || '')).includes(removeVietnameseTones(input))
       }
       options={[
         { value: 'all', label: 'Tất cả Booker' },
         ...staffList.map((s) => ({ value: s.id.toString(), label: s.displayName })),
       ]}
       placeholder="Chọn Booker"
     />
     ```

   - **Loca Module - `apps/web/app/dashboard/loca/page.tsx` (Line 315)**:
     ```tsx
     <Select
       showSearch
       placeholder="Chọn Booker/Telesales"
       value={assignedStaffId}
       onChange={(val) => setAssignedStaffId(val)}
       style={{ width: 200 }}
       filterOption={(input, option) =>
         removeVietnameseTones(String(option?.label || '')).includes(removeVietnameseTones(input))
       }
       options={[
         { value: 'ALL', label: 'All Bookers' },
         { value: 'unassigned', label: 'Chưa phân bổ' },
         ...staffList.map((s) => ({ value: s.id.toString(), label: s.displayName })),
       ]}
     />
     ```

---

## 3. Caveats

- **Centralized Utility Export**: `removeVietnameseTones` is currently exported from `BookerTeamConfigModal.tsx` in `/dashboard/today`. For project-wide consistency, it should be re-exported or centralized in `@mos-lab/shared` or `apps/web/lib/utils/search.ts`.
- **Server-Side API Searches**: Search inputs in `CatalogComboLiveTab.tsx` and `Loca` trigger server-side queries. Server-side API search handlers in `apps/api` should ensure SQL queries use `LOWER()` or unaccent matching if server-side filtering is intended to be tone-insensitive as well.

---

## 4. Conclusion

All search inputs, `<Select showSearch>` dropdowns, and client-side filter logic in the four assigned modules (`/dashboard/cv`, `/dashboard/catalog`, `/dashboard/appointments`, `/dashboard/loca`) have been inventoried and mapped out. Exact line numbers and refactoring snippets using `removeVietnameseTones` are provided above.

---

## 5. Verification Method

To verify after implementation:

1. Re-run `pnpm --filter @mos-lab/web build` to verify clean TypeScript compilation.
2. In the browser UI for `/dashboard/cv`, search for `"thanh"` in the Consultant Select, `CvConfigDrawer`, `CvThuNhapTab`, `CvTipTab`, and `CvXoayTab` search inputs, confirming that names like `"Thành"`, `"Thạnh"` appear in the results.
3. In `/dashboard/catalog`, open the Add/Edit Combo drawer, search `"mi"` in the Applicable Service Select, verifying matches like `"Uốn mi"`.
4. In `/dashboard/appointments` and `/dashboard/loca`, open the Booker Select dropdown, type `"diep"`, confirming `"Ngọc Điệp"` is matched.
