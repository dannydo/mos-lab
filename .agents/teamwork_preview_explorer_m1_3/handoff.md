# Audit and Inventory Report: Vietnamese Search Utility & Controls (/dashboard/nyc, /dashboard/omicall, /dashboard/staff)

**Agent**: explorer_m1_3  
**Working Directory**: `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_3`  
**Date**: 2026-07-28

---

## 1. Observation

### 1.1 Existing Vietnamese Tone Removal Implementations

- **File**: `apps/web/app/dashboard/today/components/BookerTeamConfigModal.tsx` (Lines 10-18)
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
- **File**: `apps/web/app/dashboard/today/components/TodayCalendarSummary.tsx` (Line 21)
  - Imports `removeVietnameseTones` from `./BookerTeamConfigModal`.
- **State of Shared Packages**:
  - `packages/shared/src/utils/` does **not** currently exist.
  - `apps/web/lib/utils/search.ts` does **not** currently exist.

---

### 1.2 Module 1: `/dashboard/nyc` (`apps/web/app/dashboard/nyc/`)

1. **Control 1: Staff/Booker Selector Select Dropdown**
   - **Location**: `apps/web/app/dashboard/nyc/page.tsx` (Lines 286-296)
   - **Component**: `<Select>`
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
   - **Current State**: Lacks `showSearch` and `filterOption`.

2. **Control 2: Main Customer Search Input**
   - **Location**: `apps/web/app/dashboard/nyc/page.tsx` (Lines 599-606)
   - **Component**: `<Input>`
   - **Current Implementation**:
     ```tsx
     <Input
       placeholder="Tìm khách hàng (Tên, SĐT, ID)..."
       prefix={<SearchOutlined style={{ color: '#aaa' }} />}
       value={searchQuery}
       onChange={(e) => setSearchQuery(e.target.value)}
       allowClear
       style={{ width: 280 }}
     />
     ```
   - **Current State**: Controlled state passed to `useNycData` hook -> API query parameter `search`.

3. **Control 3: Campaign Sort Field Select**
   - **Location**: `apps/web/app/dashboard/nyc/page.tsx` (Lines 607-618)
   - **Component**: `<Select>` (Sort dropdown with 5 fixed options).

---

### 1.3 Module 2: `/dashboard/omicall` (`apps/web/app/dashboard/omicall/`)

1. **Control 1: Staff Filter Select Dropdown**
   - **Location**: `apps/web/app/dashboard/omicall/page.tsx` (Lines 621-634)
   - **Component**: `<Select showSearch>`
   - **Current Implementation**:
     ```tsx
     <Select
       value={staffFilter}
       onChange={setStaffFilter}
       style={{ width: 170 }}
       showSearch
       filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
       options={[
         { value: 'ALL', label: 'Tất cả nhân viên' },
         ...staffList.map((s) => ({ value: s.id.toString(), label: s.displayName })),
       ]}
     />
     ```
   - **Current State**: Tone-sensitive filter using standard `.toLowerCase()`. Searching "Ngoc" will not match "Ngọc".

2. **Control 2: Call Status Filter Dropdown**
   - **Location**: `apps/web/app/dashboard/omicall/page.tsx` (Lines 566-577)
   - **Component**: `<Select>` (Fixed 5 options).

3. **Control 3: Happy Call Filter Dropdown**
   - **Location**: `apps/web/app/dashboard/omicall/page.tsx` (Lines 584-595)
   - **Component**: `<Select>` (Fixed 5 options).

4. **Control 4: AI Analysis Filter Dropdown**
   - **Location**: `apps/web/app/dashboard/omicall/page.tsx` (Lines 602-613)
   - **Component**: `<Select>` (Fixed 5 options).

---

### 1.4 Module 3: `/dashboard/staff` (`apps/web/app/dashboard/staff/`)

1. **Control 1: Staff Directory Search Input (Active & Locked Tabs)**
   - **Location**: `apps/web/app/dashboard/staff/page.tsx` (Lines 262-269, Lines 372-379)
   - **Component**: `<Input>`
   - **Current Implementation**:
     ```tsx
     <Input
       placeholder="Tìm theo tên hoặc email/username đăng nhập..."
       prefix={<SearchOutlined style={{ color: '#888' }} />}
       value={searchQuery}
       onChange={(e) => setSearchQuery(e.target.value)}
       allowClear
       style={{ width: '100%' }}
     />
     ```
   - **Current State**: Controls `searchQuery` state, passed to `useStaffData` hook -> API query parameter `search`.

2. **Control 2: Role Filter Dropdown (Active & Locked Tabs)**
   - **Location**: `apps/web/app/dashboard/staff/page.tsx` (Lines 272-285, Lines 381-396)
   - **Component**: `<Select>` (Role filter options).

3. **Control 3: Legacy Wings Lashes Staff Link Select (Staff Add/Edit Modal)**
   - **Location**: `apps/web/app/dashboard/staff/components/StaffTabsContent.tsx` (Lines 208-221)
   - **Component**: `<Select showSearch optionFilterProp="children">`
   - **Current Implementation**:
     ```tsx
     <Select placeholder="Chọn tài khoản Wings Lashes liên kết" allowClear showSearch optionFilterProp="children">
       {legacyStaffList.map((item) => (
         <Option key={item.id} value={item.id}>
           {item.name} {item.phone ? ` - ${item.phone}` : ''} {item.email ? ` - ${item.email}` : ''} (ID: {item.id})
         </Option>
       ))}
     </Select>
     ```
   - **Current State**: Uses `optionFilterProp="children"` which performs raw string matching without Vietnamese tone normalization.

4. **Control 4: Target Staff Merge Select (Merge Staff Modal)**
   - **Location**: `apps/web/app/dashboard/staff/page.tsx` (Lines 1168-1186)
   - **Component**: `<Select>`
   - **Current Implementation**:
     ```tsx
     <Select
       style={{ width: '100%' }}
       placeholder="Chọn tài khoản chính giữ lại..."
       value={targetMergeStaffId}
       onChange={(val) => setTargetMergeStaffId(val)}
     >
       {staffList
         .filter((s) => selectedRowKeys.includes(s.id))
         .map((s) => (
           <Option key={s.id} value={s.id}>
             {' '}
             ...{' '}
           </Option>
         ))}
     </Select>
     ```
   - **Current State**: Standard select dropdown.

---

### 1.5 Shared Components & Modals Used in Dashboard Routes

1. **Control 1: Service Select in BookingWizardDrawer**
   - **Location**: `apps/web/components/BookingWizardDrawer.tsx` (Lines 733-736)
   - **Component**: `<Select showSearch filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}>`
   - **Current State**: Tone-sensitive standard string match.

2. **Control 2: Promotion Select in BookingWizardDrawer**
   - **Location**: `apps/web/components/BookingWizardDrawer.tsx` (Lines 894-898)
   - **Component**: `<Select showSearch filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}>`
   - **Current State**: Tone-sensitive standard string match.

3. **Control 3: Service Select in RescheduleBookingModal**
   - **Location**: `apps/web/components/RescheduleBookingModal.tsx` (Lines 400-403)
   - **Component**: `<Select showSearch filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}>`
   - **Current State**: Tone-sensitive standard string match.

4. **Control 4: Booker Select Filter in DailyCallsTable**
   - **Location**: `apps/web/components/DailyCallsTable.tsx` (Lines 598-613)
   - **Component**: `<Select placeholder="Lọc theo Booker">`
   - **Current State**: Lacks `showSearch` and `filterOption`.

---

## 2. Logic Chain

1. **Tone Sensitivity Problem**:
   - Vietnamese text contains diacritics (accents) like `á, à, ả, ã, ạ, ă, ắ, ằ, ẳ, ẵ, ặ, â, ấ, ầ, ẩ, ẫ, ậ, đ, ê, ế, ề, ể, ễ, ệ, ô, ố, ồ, ổ, ỗ, ộ, ơ, ớ, ờ, ở, ỡ, ợ, ư, ứ, ừ, ử, ữ, ự`.
   - Standard JavaScript `.toLowerCase().includes(...)` compares exact codepoints. Searching for "Thuy" will return `false` for "Thuỳ" or "Thúy".
2. **Normalisation Mechanism**:
   - Calling `.normalize('NFD')` decomposes combined characters into base ASCII characters + combining diacritical mark characters (range `\u0300-\u036f`).
   - Stripping `[\u0300-\u036f]` removes accents.
   - Special case `đ` / `Đ`: `đ` and `Đ` do not decompose under NFD, so they must be explicitly replaced with `d` / `D`.
3. **Safety & Flexibility**:
   - Input strings or Ant Design Option labels may be `null`, `undefined`, `number`, React nodes, or complex objects.
   - `removeVietnameseTones(str)` must safely handle non-string values: `if (!str) return ''; String(str)...`.
   - `vietnameseSearchFilter(input, option)` must check `option.label`, `option.children`, `option.value` or custom attributes safely.

---

## 3. Caveats

- **Server-side Search vs Client-side Filter**:
  - Input fields like `searchQuery` in NYC (`page.tsx` line 599) and Staff (`page.tsx` line 262) trigger API calls (`apiClient.customers.nycCampaigns` and `apiClient.staff.list`) passing `search` parameter to Fastify backend. Tone-insensitive search for API backends must be handled by SQL (`ILIKE`, `unaccent`, or normalized SQL queries).
  - Client-side `<Select showSearch>` components perform in-memory filtering over loaded options array, which directly requires `removeVietnameseTones` in `filterOption`.
- **Option Children rendering**:
  - When `<Option>` contains nested JSX elements (e.g. `<Option><span>{name}</span></Option>`), `option.children` is a React element or array. Ant Design's `filterOption` receives `option` object containing `label`, `children`, `value`. Checking string properties or passing explicit `label` string is recommended.

---

## 4. Conclusion & Standard Utility Specification

### 4.1 Optimal Standard Utility (`packages/shared/src/utils/search.ts` & `apps/web/lib/utils/search.ts`)

```typescript
/**
 * Removes Vietnamese tones/diacritics from a string, converts to lower case, and trims whitespace.
 * Handles null, undefined, and non-string inputs safely.
 *
 * @param str - The input string to normalize
 * @returns Normalized tone-free lowercase string
 */
export function removeVietnameseTones(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

/**
 * Standard filterOption function for Ant Design <Select showSearch>.
 * Evaluates whether option label/children matches input string after removing Vietnamese tones.
 *
 * @param input - Search query entered by user
 * @param option - Ant Design Select option object
 * @returns boolean indicating if option matches query
 */
export function vietnameseSearchFilter(input: string, option?: any): boolean {
  if (!input) return true;
  if (!option) return false;

  const normalizedInput = removeVietnameseTones(input);
  if (!normalizedInput) return true;

  let targetText = '';

  if (typeof option.label === 'string' || typeof option.label === 'number') {
    targetText = String(option.label);
  } else if (typeof option.children === 'string' || typeof option.children === 'number') {
    targetText = String(option.children);
  } else if (Array.isArray(option.children)) {
    targetText = option.children
      .map((child: any) => (typeof child === 'string' || typeof child === 'number' ? String(child) : ''))
      .join(' ');
  } else if (option.value !== undefined && option.value !== null) {
    targetText = String(option.value);
  }

  return removeVietnameseTones(targetText).includes(normalizedInput);
}
```

---

### 4.2 Formulated Refactoring Plan

#### Module 1: `/dashboard/nyc`

- **File**: `apps/web/app/dashboard/nyc/page.tsx`
  - **Line 286**: Add `showSearch` and `filterOption={vietnameseSearchFilter}` to Booker/Telesales Select dropdown.
    ```tsx
    <Select
      showSearch
      filterOption={vietnameseSearchFilter}
      placeholder="Chọn Booker/Telesales"
      value={assignedStaffId}
      onChange={(val) => setAssignedStaffId(val)}
      style={{ width: 200 }}
      options={[...]}
    />
    ```

#### Module 2: `/dashboard/omicall`

- **File**: `apps/web/app/dashboard/omicall/page.tsx`
  - **Line 621-634**: Refactor staff filter `<Select>`:
    ```tsx
    // Before:
    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}

    // After:
    filterOption={vietnameseSearchFilter}
    ```

#### Module 3: `/dashboard/staff`

- **File**: `apps/web/app/dashboard/staff/components/StaffTabsContent.tsx`
  - **Line 208-221**: Refactor Legacy Staff Select in Staff Modal:
    ```tsx
    // Before:
    <Select placeholder="Chọn tài khoản Wings Lashes liên kết" allowClear showSearch optionFilterProp="children">

    // After:
    <Select
      placeholder="Chọn tài khoản Wings Lashes liên kết"
      allowClear
      showSearch
      filterOption={vietnameseSearchFilter}
    >
    ```
- **File**: `apps/web/app/dashboard/staff/page.tsx`
  - **Line 1168-1186**: Add `showSearch` and `filterOption={vietnameseSearchFilter}` to target merge staff Select in Merge Staff Modal.

#### Shared Components

- **File**: `apps/web/components/BookingWizardDrawer.tsx`
  - **Lines 735 & 897**: Replace `filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}` with `filterOption={vietnameseSearchFilter}`.
- **File**: `apps/web/components/RescheduleBookingModal.tsx`
  - **Line 402**: Replace `filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}` with `filterOption={vietnameseSearchFilter}`.
- **File**: `apps/web/components/DailyCallsTable.tsx`
  - **Line 598**: Add `showSearch` and `filterOption={vietnameseSearchFilter}` to Booker filter `<Select>`.

---

## 5. Verification Method

1. **Unit Test / Inspection Verification**:
   - Inspect exported utility functions in `packages/shared/src/utils/search.ts` or `apps/web/lib/utils/search.ts`:
     - `removeVietnameseTones('Nguyễn Văn Ánh')` -> `'nguyen van anh'`
     - `removeVietnameseTones('Đồng Bằng')` -> `'dong bang'`
     - `vietnameseSearchFilter('ngoc', { label: 'Ngọc Điệp' })` -> `true`
     - `vietnameseSearchFilter('Thuy', { label: 'Thuỳ Trang 🌸' })` -> `true`
2. **Build Verification**:
   - Run `pnpm --filter @mos-lab/shared build` and `pnpm --filter @mos-lab/web build` to verify type safety and absence of build errors.
3. **UI Functional Verification**:
   - Navigate to `/dashboard/omicall`, open Staff filter dropdown, type "ngoc", verify "Ngọc Điệp" appears.
   - Navigate to `/dashboard/staff`, open Add/Edit Staff modal, search Legacy Staff with unaccented text "hang", verify "Hằng Ni" appears.
   - Navigate to `/dashboard/nyc`, click Booker filter, type unaccented text, verify staff matches correctly.
