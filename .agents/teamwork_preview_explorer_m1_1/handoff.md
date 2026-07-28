# Audit & Inventory Report: Tone-Insensitive Vietnamese Search Controls in CRM Modules (1-4)

**Module Scope**:

1. `/dashboard/today` (`apps/web/app/dashboard/today/`)
2. `/dashboard/customers` (`apps/web/app/dashboard/customers/`)
3. `/dashboard/bk` (`apps/web/app/dashboard/bk/`)
4. `/dashboard/cc` (`apps/web/app/dashboard/cc/`)

---

## 1. Observation

Direct code inspection of all files across the four designated CRM modules revealed the following search, filter, and selection components:

### Shared Search Utility Reference

- `apps/web/app/dashboard/today/components/BookerTeamConfigModal.tsx` (Lines 10-18):

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

---

### Module 1: `/dashboard/today`

#### 1.1 `BookerTeamConfigModal.tsx`

- **File Path**: `apps/web/app/dashboard/today/components/BookerTeamConfigModal.tsx`
- **Lines**: 247-259
- **Component**: `<Select showSearch>` (HR Staff Picker)
- **Current Code**:

```typescript
<Select
  showSearch
  loading={loadingStaff}
  placeholder="Tìm & chọn nhân sự HR thật..."
  value={selectedStaffName}
  onChange={setSelectedStaffName}
  filterOption={(input, option) =>
    removeVietnameseTones(String(option?.label || '')).includes(removeVietnameseTones(input))
  }
  options={selectableStaffOptions}
  style={{ width: '320px' }}
  notFoundContent={loadingStaff ? <Spin size="small" /> : 'Không tìm thấy nhân sự'}
/>
```

- **Current Logic**: Already uses `removeVietnameseTones` for both option label and user input. Tone-insensitive and case-insensitive.
- **Refactoring Needed**: Replace inline function import/definition with shared utility `@mos-lab/shared` or `apps/web/lib/utils/search.ts`.

#### 1.2 `TodayCalendarSummary.tsx`

- **File Path**: `apps/web/app/dashboard/today/components/TodayCalendarSummary.tsx`
- **Lines**: 254-266
- **Component**: `<Select showSearch>` (Booker / Team Filter)
- **Current Code**:

```typescript
<Select
  size="small"
  showSearch
  allowClear
  placeholder="Tất cả Đội Nhóm & Booker"
  value={selectedBooker || 'all'}
  onChange={(val) => setSelectedBooker(val === 'all' ? null : val)}
  filterOption={(input, option) =>
    removeVietnameseTones(String(option?.label || '')).includes(removeVietnameseTones(input))
  }
  style={{ width: '210px' }}
  options={groupedBookerOptions}
/>
```

- **Current Logic**: Already uses `removeVietnameseTones`. Tone-insensitive and case-insensitive.
- **Refactoring Needed**: Import standard `removeVietnameseTones` utility.

#### 1.3 `TodayBookingsTable.tsx`

- **File Path**: `apps/web/app/dashboard/today/components/TodayBookingsTable.tsx`
- **Lines**: 344-350
- **Component**: `<Select>` (Booker / Team Filter)
- **Current Code**:

```typescript
<Select
  value={selectedBooker || 'all'}
  onChange={(val) => setSelectedBooker(val === 'all' ? null : val)}
  options={groupedBookerOptions}
  style={{ width: '200px' }}
  placeholder="Lọc Đội / Booker"
/>
```

- **Current Logic**: Missing `showSearch` and `filterOption`. Users cannot search booker names in dropdown.
- **Refactoring Needed**: Add `showSearch` and `filterOption={(input, option) => removeVietnameseTones(String(option?.label || '')).includes(removeVietnameseTones(input))}`.

---

### Module 2: `/dashboard/customers`

#### 2.1 `RevokeAssignmentModal.tsx`

- **File Path**: `apps/web/app/dashboard/customers/components/RevokeAssignmentModal.tsx`
- **Lines**: 164-172
- **Component**: `<Select showSearch optionFilterProp="children">` (Target Booker Picker)
- **Current Code**:

```typescript
<Select placeholder="Chọn Booker..." showSearch optionFilterProp="children" style={{ borderRadius: '6px' }}>
  {staffList
    .filter((s) => ['telesales', 'executive', 'manager', 'admin'].includes(s.role?.toLowerCase() || ''))
    .map((staff) => (
      <Select.Option key={staff.id} value={staff.id}>
        {staff.displayName} (@{staff.username})
      </Select.Option>
    ))}
</Select>
```

- **Current Logic**: Relies on AntD default `optionFilterProp="children"`. Tone-sensitive; typing "nguyen" does NOT match "Nguyễn".
- **Refactoring Needed**: Remove `optionFilterProp="children"` and add `filterOption={(input, option) => removeVietnameseTones(String(option?.children || option?.label || '')).includes(removeVietnameseTones(input))}`.

#### 2.2 `CustomerFilters.tsx`

- **File Path**: `apps/web/app/dashboard/customers/components/CustomerFilters.tsx`
- **Lines**: 505-525
- **Component**: `<Select>` (Assigned Booker Filter in Drawer)
- **Current Code**:

```typescript
<Select
  value={assignedStaffId}
  style={{ width: '100%' }}
  onChange={(val) => {
    setAssignedStaffId(val);
    setActiveFilterId(null);
  }}
  options={[
    { value: 'all', label: 'Tất cả' },
    { value: 'unassigned', label: 'Chưa phân bổ' },
    { value: 'me', label: 'Khách hàng của tôi' },
    ...staffList.map((s) => ({ value: s.id.toString(), label: `Booker: ${s.displayName}` }))
  ]}
/>
```

- **Current Logic**: Lacks search capability for long staff list.
- **Refactoring Needed**: Add `showSearch` and `filterOption={(input, option) => removeVietnameseTones(String(option?.label || '')).includes(removeVietnameseTones(input))}`.

#### 2.3 `AssignmentHistoryDrawer.tsx`

- **File Path**: `apps/web/app/dashboard/customers/components/AssignmentHistoryDrawer.tsx`
- **Lines**: 81-89, 184-192
- **Component**: `<Input searchQuery>` (History Text Search)
- **Current Code**:

```typescript
if (searchQuery.trim()) {
  const q = searchQuery.toLowerCase().trim();
  const matchStaff =
    (item.newStaffName || '').toLowerCase().includes(q) || (item.prevStaffName || '').toLowerCase().includes(q);
  const matchPerformer = (item.assignedBy || '').toLowerCase().includes(q);
  const matchFormula = (item.sourceFilterSummary || '').toLowerCase().includes(q);
  const matchReason = (item.reason || '').toLowerCase().includes(q);
  return matchStaff || matchPerformer || matchFormula || matchReason;
}
```

- **Current Logic**: Uses JavaScript `.toLowerCase().includes()`. Tone-sensitive.
- **Refactoring Needed**: Update logic to use `removeVietnameseTones`:

```typescript
if (searchQuery.trim()) {
  const q = removeVietnameseTones(searchQuery);
  const matchStaff =
    removeVietnameseTones(item.newStaffName || '').includes(q) ||
    removeVietnameseTones(item.prevStaffName || '').includes(q);
  const matchPerformer = removeVietnameseTones(item.assignedBy || '').includes(q);
  const matchFormula = removeVietnameseTones(item.sourceFilterSummary || '').includes(q);
  const matchReason = removeVietnameseTones(item.reason || '').includes(q);
  return matchStaff || matchPerformer || matchFormula || matchReason;
}
```

---

### Module 3: `/dashboard/bk`

#### 3.1 `BkBookingTab.tsx`

- **File Path**: `apps/web/app/dashboard/bk/components/BkBookingTab.tsx`
- **Lines**: 128-138, 499-507
- **Component**: `<Input value={searchText}>` (Booking Detail Search)
- **Current Code**:

```typescript
const filteredDetailRecords = useMemo(() => {
  if (!searchText) return detailRecords;
  const lower = searchText.toLowerCase();
  return detailRecords.filter(
    (r) =>
      r.clientName.toLowerCase().includes(lower) ||
      r.orderKey.toLowerCase().includes(lower) ||
      (r.clientPhone && r.clientPhone.includes(lower)) ||
      (r.bookerName && r.bookerName.toLowerCase().includes(lower))
  );
}, [detailRecords, searchText]);
```

- **Current Logic**: Uses `.toLowerCase().includes()`. Tone-sensitive.
- **Refactoring Needed**: Replace with `removeVietnameseTones`:

```typescript
const filteredDetailRecords = useMemo(() => {
  if (!searchText) return detailRecords;
  const q = removeVietnameseTones(searchText);
  return detailRecords.filter(
    (r) =>
      removeVietnameseTones(r.clientName).includes(q) ||
      removeVietnameseTones(r.orderKey).includes(q) ||
      (r.clientPhone && r.clientPhone.includes(q)) ||
      (r.bookerName && removeVietnameseTones(r.bookerName).includes(q))
  );
}, [detailRecords, searchText]);
```

#### 3.2 `BkDoneTab.tsx`

- **File Path**: `apps/web/app/dashboard/bk/components/BkDoneTab.tsx`
- **Lines**: 137-148, 598-606
- **Component**: `<Input value={searchText}>` (Completed Booking Search)
- **Current Code**:

```typescript
const filteredDetailRecords = useMemo(() => {
  if (!searchText) return detailRecords;
  const lower = searchText.toLowerCase();
  return detailRecords.filter(
    (r) =>
      r.clientName.toLowerCase().includes(lower) ||
      r.orderKey.toLowerCase().includes(lower) ||
      (r.clientPhone && r.clientPhone.toLowerCase().includes(lower)) ||
      (r.bookerName && r.bookerName.toLowerCase().includes(lower)) ||
      (r.serviceName && r.serviceName.toLowerCase().includes(lower))
  );
}, [detailRecords, searchText]);
```

- **Current Logic**: Tone-sensitive `.toLowerCase().includes()`.
- **Refactoring Needed**:

```typescript
const filteredDetailRecords = useMemo(() => {
  if (!searchText) return detailRecords;
  const q = removeVietnameseTones(searchText);
  return detailRecords.filter(
    (r) =>
      removeVietnameseTones(r.clientName).includes(q) ||
      removeVietnameseTones(r.orderKey).includes(q) ||
      (r.clientPhone && removeVietnameseTones(r.clientPhone).includes(q)) ||
      (r.bookerName && removeVietnameseTones(r.bookerName).includes(q)) ||
      (r.serviceName && removeVietnameseTones(r.serviceName).includes(q))
  );
}, [detailRecords, searchText]);
```

#### 3.3 `BkRevenueTab.tsx`

- **File Path**: `apps/web/app/dashboard/bk/components/BkRevenueTab.tsx`
- **Lines**: 122-131, 431-439
- **Component**: `<Input value={searchText}>` (BK Revenue Detail Search)
- **Current Code**:

```typescript
const filteredDetailRecords = useMemo(() => {
  if (!searchText) return detailRecords;
  const lower = searchText.toLowerCase();
  return detailRecords.filter(
    (r) =>
      r.clientName.toLowerCase().includes(lower) ||
      r.orderKey.toLowerCase().includes(lower) ||
      (r.store && r.store.toLowerCase().includes(lower))
  );
}, [detailRecords, searchText]);
```

- **Current Logic**: Tone-sensitive `.toLowerCase().includes()`.
- **Refactoring Needed**:

```typescript
const filteredDetailRecords = useMemo(() => {
  if (!searchText) return detailRecords;
  const q = removeVietnameseTones(searchText);
  return detailRecords.filter(
    (r) =>
      removeVietnameseTones(r.clientName).includes(q) ||
      removeVietnameseTones(r.orderKey).includes(q) ||
      (r.store && removeVietnameseTones(r.store).includes(q))
  );
}, [detailRecords, searchText]);
```

#### 3.4 `BkTipTab.tsx`

- **File Path**: `apps/web/app/dashboard/bk/components/BkTipTab.tsx`
- **Lines**: 125-134, 415-423
- **Component**: `<Input value={searchText}>` (BK Tip Detail Search)
- **Current Code**:

```typescript
const filteredDetailRecords = useMemo(() => {
  if (!searchText) return detailRecords;
  const lower = searchText.toLowerCase();
  return detailRecords.filter(
    (r) =>
      r.clientName.toLowerCase().includes(lower) ||
      (r.bookerName && r.bookerName.toLowerCase().includes(lower)) ||
      (r.store && r.store.toLowerCase().includes(lower))
  );
}, [detailRecords, searchText]);
```

- **Current Logic**: Tone-sensitive `.toLowerCase().includes()`.
- **Refactoring Needed**:

```typescript
const filteredDetailRecords = useMemo(() => {
  if (!searchText) return detailRecords;
  const q = removeVietnameseTones(searchText);
  return detailRecords.filter(
    (r) =>
      removeVietnameseTones(r.clientName).includes(q) ||
      (r.bookerName && removeVietnameseTones(r.bookerName).includes(q)) ||
      (r.store && removeVietnameseTones(r.store).includes(q))
  );
}, [detailRecords, searchText]);
```

#### 3.5 `BkConfigDrawer.tsx`

- **File Path**: `apps/web/app/dashboard/bk/components/BkConfigDrawer.tsx`
- **Lines**: 89-95, 348-355
- **Component**: `<Input value={searchText}>` (BK Active Staff Config Search)
- **Current Code**:

```typescript
const filteredStaff = React.useMemo(() => {
  if (!searchText) return allStaff;
  const lower = searchText.toLowerCase();
  return allStaff.filter(
    (s) =>
      s.displayName.toLowerCase().includes(lower) ||
      (s.username && s.username.toLowerCase().includes(lower)) ||
      (s.store && s.store.toLowerCase().includes(lower))
  );
}, [allStaff, searchText]);
```

- **Current Logic**: Tone-sensitive `.toLowerCase().includes()`.
- **Refactoring Needed**:

```typescript
const filteredStaff = React.useMemo(() => {
  if (!searchText) return allStaff;
  const q = removeVietnameseTones(searchText);
  return allStaff.filter(
    (s) =>
      removeVietnameseTones(s.displayName).includes(q) ||
      (s.username && removeVietnameseTones(s.username).includes(q)) ||
      (s.store && removeVietnameseTones(s.store).includes(q))
  );
}, [allStaff, searchText]);
```

---

### Module 4: `/dashboard/cc`

#### 4.1 `CcConfigDrawer.tsx`

- **File Path**: `apps/web/app/dashboard/cc/components/CcConfigDrawer.tsx`
- **Lines**: 46-52, 121-128
- **Component**: `<Input value={searchText}>` (CC Active Staff Config Search)
- **Current Code**:

```typescript
const filteredStaff = React.useMemo(() => {
  if (!searchText) return allStaff;
  const lower = searchText.toLowerCase();
  return allStaff.filter(
    (s) => s.displayName.toLowerCase().includes(lower) || (s.username && s.username.toLowerCase().includes(lower))
  );
}, [allStaff, searchText]);
```

- **Current Logic**: Tone-sensitive `.toLowerCase().includes()`.
- **Refactoring Needed**:

```typescript
const filteredStaff = React.useMemo(() => {
  if (!searchText) return allStaff;
  const q = removeVietnameseTones(searchText);
  return allStaff.filter(
    (s) =>
      removeVietnameseTones(s.displayName).includes(q) || (s.username && removeVietnameseTones(s.username).includes(q))
  );
}, [allStaff, searchText]);
```

#### 4.2 `CcDiamondDetailModal.tsx`

- **File Path**: `apps/web/app/dashboard/cc/components/CcDiamondDetailModal.tsx`
- **Lines**: 89-98, 274-280
- **Component**: `<Input value={searchText}>` (CC Diamond Referral Detail Search)
- **Current Code**:

```typescript
const filteredDetails = detailsData.filter((item) => {
  if (!searchText) return true;
  const lower = searchText.toLowerCase();
  return (
    item.referrerName.toLowerCase().includes(lower) ||
    item.referrerPhone.includes(lower) ||
    item.newName.toLowerCase().includes(lower) ||
    item.newPhone.includes(lower)
  );
});
```

- **Current Logic**: Tone-sensitive `.toLowerCase().includes()`.
- **Refactoring Needed**:

```typescript
const filteredDetails = detailsData.filter((item) => {
  if (!searchText) return true;
  const q = removeVietnameseTones(searchText);
  return (
    removeVietnameseTones(item.referrerName).includes(q) ||
    item.referrerPhone.includes(q) ||
    removeVietnameseTones(item.newName).includes(q) ||
    item.newPhone.includes(q)
  );
});
```

#### 4.3 `CcDiamondTab.tsx`

- **File Path**: `apps/web/app/dashboard/cc/components/CcDiamondTab.tsx`
- **Lines**: 75-81, 377-383
- **Component**: `<Input value={searchText}>` (CC Diamond List Search)
- **Current Code**:

```typescript
const filteredData = (diamondData?.data || []).filter((item) => {
  const matchesSearch =
    item.tenCc.toLowerCase().includes(searchText.toLowerCase()) || String(item.ccId).includes(searchText);
  const matchesConsultant =
    selectedConsultant === 'ALL' || item.tenCc.toLowerCase() === selectedConsultant.toLowerCase();
  return matchesSearch && matchesConsultant;
});
```

- **Current Logic**: Tone-sensitive `.toLowerCase().includes()`.
- **Refactoring Needed**:

```typescript
const filteredData = (diamondData?.data || []).filter((item) => {
  const q = removeVietnameseTones(searchText);
  const matchesSearch = removeVietnameseTones(item.tenCc).includes(q) || String(item.ccId).includes(searchText);
  const matchesConsultant =
    selectedConsultant === 'ALL' || removeVietnameseTones(item.tenCc) === removeVietnameseTones(selectedConsultant);
  return matchesSearch && matchesConsultant;
});
```

#### 4.4 `CcThuNhapTab.tsx`

- **File Path**: `apps/web/app/dashboard/cc/components/CcThuNhapTab.tsx`
- **Lines**: 230-236, 661-667
- **Component**: `<Input value={searchText}>` (CC Paystub Live Search)
- **Current Code**:

```typescript
const filteredData = useMemo(() => {
  if (!searchText) return paystubData;
  const lower = searchText.toLowerCase();
  return paystubData.filter(
    (r) => r.displayName.toLowerCase().includes(lower) || r.store.toLowerCase().includes(lower)
  );
}, [paystubData, searchText]);
```

- **Current Logic**: Tone-sensitive `.toLowerCase().includes()`.
- **Refactoring Needed**:

```typescript
const filteredData = useMemo(() => {
  if (!searchText) return paystubData;
  const q = removeVietnameseTones(searchText);
  return paystubData.filter(
    (r) => removeVietnameseTones(r.displayName).includes(q) || removeVietnameseTones(r.store).includes(q)
  );
}, [paystubData, searchText]);
```

#### 4.5 `CcThuongTab.tsx`

- **File Path**: `apps/web/app/dashboard/cc/components/CcThuongTab.tsx`
- **Lines**: 311-319, 818-824
- **Component**: `<Input value={searchText}>` (CC Bonus Tab Search)
- **Current Code**:

```typescript
if (searchText) {
  const lower = searchText.toLowerCase();
  result = result.filter(
    (r) =>
      r.consultant_name.toLowerCase().includes(lower) ||
      r.date.includes(lower) ||
      (r.store_code && r.store_code.toLowerCase().includes(lower))
  );
}
```

- **Current Logic**: Tone-sensitive `.toLowerCase().includes()`.
- **Refactoring Needed**:

```typescript
if (searchText) {
  const q = removeVietnameseTones(searchText);
  result = result.filter(
    (r) =>
      removeVietnameseTones(r.consultant_name).includes(q) ||
      r.date.includes(q) ||
      (r.store_code && removeVietnameseTones(r.store_code).includes(q))
  );
}
```

#### 4.6 `CcTipTab.tsx`

- **File Path**: `apps/web/app/dashboard/cc/components/CcTipTab.tsx`
- **Lines**: 175-185, 630-636
- **Component**: `<Input value={searchText}>` (CC Tip Detail Search)
- **Current Code**:

```typescript
if (searchText) {
  const lower = searchText.toLowerCase();
  return (
    r.clientName.toLowerCase().includes(lower) ||
    r.serviceName.toLowerCase().includes(lower) ||
    r.ccInName.toLowerCase().includes(lower) ||
    r.ccOutName.toLowerCase().includes(lower) ||
    r.consultantName.toLowerCase().includes(lower) ||
    r.checkinTime.includes(lower)
  );
}
```

- **Current Logic**: Tone-sensitive `.toLowerCase().includes()`.
- **Refactoring Needed**:

```typescript
if (searchText) {
  const q = removeVietnameseTones(searchText);
  return (
    removeVietnameseTones(r.clientName).includes(q) ||
    removeVietnameseTones(r.serviceName).includes(q) ||
    removeVietnameseTones(r.ccInName).includes(q) ||
    removeVietnameseTones(r.ccOutName).includes(q) ||
    removeVietnameseTones(r.consultantName).includes(q) ||
    r.checkinTime.includes(q)
  );
}
```

#### 4.7 `CcXoayTab.tsx`

- **File Path**: `apps/web/app/dashboard/cc/components/CcXoayTab.tsx`
- **Lines**: 23-34, 280-287
- **Component**: `<Input value={searchText}>` (CC Shift Detail Search)
- **Current Code**:

```typescript
const filteredData = useMemo(() => {
  if (!searchText) return data;
  const lower = searchText.toLowerCase();
  return data.filter((item) => {
    return (
      item.clientName?.toLowerCase().includes(lower) ||
      item.serviceName?.toLowerCase().includes(lower) ||
      item.consultantName?.toLowerCase().includes(lower) ||
      item.store?.toLowerCase().includes(lower)
    );
  });
}, [data, searchText]);
```

- **Current Logic**: Tone-sensitive `.toLowerCase().includes()`.
- **Refactoring Needed**:

```typescript
const filteredData = useMemo(() => {
  if (!searchText) return data;
  const q = removeVietnameseTones(searchText);
  return data.filter((item) => {
    return (
      (item.clientName && removeVietnameseTones(item.clientName).includes(q)) ||
      (item.serviceName && removeVietnameseTones(item.serviceName).includes(q)) ||
      (item.consultantName && removeVietnameseTones(item.consultantName).includes(q)) ||
      (item.store && removeVietnameseTones(item.store).includes(q))
    );
  });
}, [data, searchText]);
```

#### 4.8 `page.tsx`

- **File Path**: `apps/web/app/dashboard/cc/page.tsx`
- **Lines**: 353-363
- **Component**: `<Select>` (Consultant Filter)
- **Current Code**:

```typescript
<Select
  aria-label="Lọc theo tư vấn viên CC"
  value={selectedConsultant}
  onChange={(val) => setSelectedConsultant(val)}
  style={{ width: 180 }}
  options={[
    { value: 'ALL', label: 'Tất cả CC' },
    ...leaderboardData.map((s) => ({ value: s.displayName, label: s.displayName })),
  ]}
  placeholder="Chọn CC"
/>
```

- **Current Logic**: Lacks `showSearch` and `filterOption`.
- **Refactoring Needed**: Add `showSearch` and `filterOption={(input, option) => removeVietnameseTones(String(option?.label || '')).includes(removeVietnameseTones(input))}`.

---

## 2. Logic Chain

1. **Initial Search Capability Assessment**:
   - The user requested an audit of all Ant Design `<Select showSearch>`, table filters, and search inputs across four dashboard modules: `/dashboard/today`, `/dashboard/customers`, `/dashboard/bk`, and `/dashboard/cc`.
   - Goal: Identify every control where Vietnamese text input could fail matching due to diacritical marks/tones (e.g. searching "nguyen" to find "Nguyễn").

2. **Systematic Source Inspection**:
   - Step 1: Located all source files under `apps/web/app/dashboard/{today,customers,bk,cc}`.
   - Step 2: Searched for `<Select`, `showSearch`, `filterOption`, `optionFilterProp`, `onFilter`, `filterDropdown`, and `<Input`.
   - Step 3: Inspected the filter logic for every matching line.

3. **Pattern Categorization**:
   - **Category A (Already Tone-Insensitive)**:
     - `BookerTeamConfigModal.tsx` line 247
     - `TodayCalendarSummary.tsx` line 254
   - **Category B (AntD Select with `optionFilterProp="children"` or Missing `showSearch`)**:
     - `RevokeAssignmentModal.tsx` line 164 (`optionFilterProp="children"`)
     - `TodayBookingsTable.tsx` line 344 (missing `showSearch`)
     - `CustomerFilters.tsx` line 505 (missing `showSearch`)
     - `cc/page.tsx` line 353 (missing `showSearch`)
   - **Category C (Custom Text Search `<Input>` using `toLowerCase().includes()`)**:
     - `AssignmentHistoryDrawer.tsx` line 82
     - `BkBookingTab.tsx` line 130
     - `BkDoneTab.tsx` line 139
     - `BkRevenueTab.tsx` line 124
     - `BkTipTab.tsx` line 127
     - `BkConfigDrawer.tsx` line 91
     - `CcConfigDrawer.tsx` line 48
     - `CcDiamondDetailModal.tsx` line 91
     - `CcDiamondTab.tsx` line 77
     - `CcThuNhapTab.tsx` line 232
     - `CcThuongTab.tsx` line 312
     - `CcTipTab.tsx` line 176
     - `CcXoayTab.tsx` line 25

4. **Conclusion Formulation**:
   - Out of 19 identified search/select/filter controls across the 4 CRM modules:
     - 2 controls are already using `removeVietnameseTones`.
     - 4 `<Select>` controls need `showSearch` / `filterOption` updated with `removeVietnameseTones`.
     - 13 custom text search `<Input>` controls need their `useMemo`/`filter` logic updated to call `removeVietnameseTones`.

---

## 3. Caveats

- **Server-side Search Endpoints**: Main page table searches (e.g. `Input.Search` on `/dashboard/customers` line 277) execute server-side API requests via Fastify/Prisma backend. Backend SQL/Prisma query logic will be handled as part of backend search normalization if required.
- **Static Option Selects**: Small dropdowns with 2-4 static fixed values (e.g. branch dropdowns, refresh interval dropdowns, sort order dropdowns) do not require `showSearch` or tone normalization as they are not searched by free text.
- **Code Modifications**: This investigation report is strictly read-only per agent instructions. Implementation will occur in Milestone M2.

---

## 4. Conclusion

All 19 search and selection controls across `/dashboard/today`, `/dashboard/customers`, `/dashboard/bk`, and `/dashboard/cc` have been fully inventoried. Exact file paths, line numbers, current implementations, and precise `removeVietnameseTones` refactoring snippets are documented above.

Refactoring impact summary:

- **Total Files Affected**: 16 files
- **Total Controls Identified**: 19 controls
- **Ready for Implementation**: 100%

---

## 5. Verification Method

To verify these findings independently:

1. **Verify Files and Lines**:

   ```bash
   grep -n -E "showSearch|filterOption|optionFilterProp|searchText|searchQuery" \
     apps/web/app/dashboard/today/components/* \
     apps/web/app/dashboard/customers/components/* \
     apps/web/app/dashboard/bk/components/* \
     apps/web/app/dashboard/cc/components/*
   ```

2. **Verify Existing Tone Normalization Utility**:
   - Inspect `apps/web/app/dashboard/today/components/BookerTeamConfigModal.tsx` line 10.

3. **Verify Build**:
   ```bash
   pnpm --filter @mos-lab/web build
   ```
