# Shared Types & SDK Client Design Analysis for SMS Action Feature (Milestone 1)

## 1. Overview & Objectives

This analysis defines the data transfer objects (DTOs), type definitions, SDK extension methods, dynamic variable tag specifications, and compliance rules for the **SMS Action Feature** in `mos-lab` (specifically for "Chạm 17 (ngày)" in LoCa / NYC Customer Care).

The SMS Action feature enables Booker and Staff users to:

1. Select from standardized system & legacy SMS templates (or edit customized messages).
2. Substitute dynamic customer/service variable tags (`{ten_khach}`, `{han_dung}`, `{so_ngay_dam}`, `{ten_combo}`, `{sdt_cua_hang}`, `{ten_booker}`, etc.) with live customer data.
3. Send SMS messages via backend API `/api/sms/send`, automatically writing to legacy DB `user_sms` and logging activity in CRM DB `crm_call_logs` (`call_type = 'SMS'`).
4. Review customer SMS history in real-time within the SMS Modal dual-pane layout.

---

## 2. Shared Types Audit & Proposed Layout (`packages/shared/src/types/sms.ts`)

### 2.1 Package Architecture & Export Layout

In `packages/shared/src/`:

- New module file: `packages/shared/src/types/sms.ts`
- Module re-export in `packages/shared/src/index.ts`:
  ```typescript
  export * from './types/sms';
  ```
- Build command: `pnpm --filter @mos-lab/shared build`

### 2.2 Complete DTO Definitions (`packages/shared/src/types/sms.ts`)

```typescript
export type SmsTemplateCategory = 'REMINDER_17' | 'COMBO_EXPIRY' | 'APPOINTMENT' | 'PROMOTION' | 'GENERAL' | string;

export type SmsStatus = 'SENT' | 'DELIVERED' | 'FAILED' | 'PENDING';

/**
 * SMS Template Definition
 */
export interface SmsTemplate {
  id: number;
  title: string; // Template name (e.g. "Reminder 17 - Khách Lẻ")
  content: string; // Template body containing variables (e.g. "Chào {ten_khach}...")
  category?: SmsTemplateCategory; // Category classification
  isSystem?: boolean; // System preset vs custom
  isActive: boolean; // Active status flag
  createdAt: string; // ISO Date String
  updatedAt: string; // ISO Date String
  createdStaffId?: number | null;
  createdStaffName?: string | null;
}

export interface SaveSmsTemplateInput {
  id?: number; // undefined when creating new template
  title: string;
  content: string;
  category?: SmsTemplateCategory;
  isActive?: boolean;
}

export interface SmsTemplateListResponse {
  success: boolean;
  data: SmsTemplate[];
  total: number;
}

/**
 * Dynamic Variable Tag Specification
 */
export interface SmsVariableTagDefinition {
  tag: string; // Tag identifier e.g. "{ten_khach}"
  label: string; // Human-readable title e.g. "Tên khách hàng"
  description: string; // Helpful usage tip e.g. "Họ tên của khách hàng nhận tin"
  exampleValue: string; // Example preview value e.g. "Chị Lan"
}

export type SmsVariableValues = Record<string, string | number | null | undefined>;

export interface PreviewSmsRequest {
  templateContent: string;
  customerId: number;
  customVariables?: SmsVariableValues;
}

export interface PreviewSmsResponse {
  success: boolean;
  rawContent: string;
  renderedContent: string;
  missingVariables: string[];
  charCount: number;
  smsMessageCount: number; // Estimated SMS segment count (GSM 7-bit vs Unicode)
}

/**
 * Send SMS Request & Response DTOs
 */
export interface SendSmsRequest {
  customerId: number; // Legacy user_id
  toPhoneNumber: string; // Target phone number
  body: string; // Final SMS message content
  templateId?: number | null; // ID of template used (if applicable)
  templateTitle?: string | null; // Title of template used (if applicable)
  note?: string | null; // Internal note for CRM history log
}

export interface SendSmsResponse {
  success: boolean;
  message: string;
  data: {
    userSmsId: number; // Created ID in legacy DB user_sms table
    callLogId?: number; // Created ID in CRM DB crm_call_logs table
    customerId: number;
    toPhoneNumber: string;
    body: string;
    sentAt: string; // ISO Date String
    staffId: number;
    staffName?: string;
  };
}

/**
 * Customer SMS History Item DTO
 */
export interface CustomerSmsHistoryItem {
  id: number;
  customerId: number;
  toPhoneNumber: string;
  body: string;
  templateId?: number | null;
  templateTitle?: string | null;
  status: SmsStatus | string;
  createdStaffId: number;
  createdStaffName: string;
  createdStaffAvatar?: string | null;
  createdAt: string; // ISO Date String
}

export interface ListSmsHistoryParams {
  page?: number;
  limit?: number;
}

export interface ListSmsHistoryResponse {
  success: boolean;
  items: CustomerSmsHistoryItem[];
  totalCount: number;
  hasMore: boolean;
}
```

---

## 3. SDK Client Extensions Audit (`apps/web/lib/api-client.ts`)

### 3.1 SDK Integration Strategy

All API calls must use `apiClient` in `apps/web/lib/api-client.ts` to ensure type safety, autocomplete, and strict compliance with **Rule #2** ("Never use raw Axios strings").

### 3.2 Required Imports Addition in `apps/web/lib/api-client.ts`

```typescript
import {
  SmsTemplate,
  SmsTemplateListResponse,
  SaveSmsTemplateInput,
  SendSmsRequest,
  SendSmsResponse,
  ListSmsHistoryParams,
  ListSmsHistoryResponse,
  PreviewSmsRequest,
  PreviewSmsResponse,
} from '@mos-lab/shared';
```

### 3.3 Proposed `apiClient.sms` Extension Object

```typescript
  sms: {
    getTemplates: async (): Promise<SmsTemplateListResponse> => {
      const response = await api.get('/sms/templates');
      return response.data;
    },
    saveTemplate: async (data: SaveSmsTemplateInput): Promise<{ success: boolean; data: SmsTemplate }> => {
      const response = await api.post('/sms/templates', data);
      return response.data;
    },
    deleteTemplate: async (id: number): Promise<{ success: boolean }> => {
      const response = await api.delete(`/sms/templates/${id}`);
      return response.data;
    },
    sendSms: async (data: SendSmsRequest): Promise<SendSmsResponse> => {
      const response = await api.post('/sms/send', data);
      return response.data;
    },
    getCustomerSmsHistory: async (
      customerId: number,
      params?: ListSmsHistoryParams
    ): Promise<ListSmsHistoryResponse> => {
      const response = await api.get(`/sms/history/${customerId}`, { params });
      return response.data;
    },
    previewSms: async (data: PreviewSmsRequest): Promise<PreviewSmsResponse> => {
      const response = await api.post('/sms/preview', data);
      return response.data;
    },
  },
```

---

## 4. Dynamic Variable Tag Definitions & Substitution Logic

### 4.1 Variable Tag Catalog

| Variable Tag         | Label (Tiếng Việt)           | Source Field / Fallback Mapping Logic                                                                          | Example Output                 |
| -------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `{ten_khach}`        | Tên khách hàng               | `customer.name` -> `customer.profile.full_name` -> `"Khách hàng"`                                              | "Chị Lan"                      |
| `{sdt_khach}`        | SĐT khách hàng               | `customer.phone` -> `customer.contacts[0].phone_number` -> `""`                                                | "0901234567"                   |
| `{so_ngay_dam}`      | Số ngày từ lần dịch vụ trước | `customer.daysSinceLastVisit` (Calculated from `COALESCE(ro.actual_booking_date_start, o.booking_date_start)`) | "17"                           |
| `{han_dung}`         | Hạn dặm mi tối đa            | Single customer: `lastVisit + 21 days`; Combo customer: `lastVisit + 25 days` (Format `DD/MM/YYYY`)            | "25/08/2026"                   |
| `{ten_combo}`        | Tên gói combo                | `customer.comboBalance?.comboName` -> `customer.newComboDetails?.comboName` -> `"Gói Dặm Mi"`                  | "Combo Mi Thiết Kế 10 Lần"     |
| `{luot_dam_con_lai}` | Số lượt dặm/gói còn lại      | `customer.comboBalance?.retainCount` -> `0` (Formatted as e.g. `"3 lượt"`)                                     | "3 lượt"                       |
| `{ngay_lam_near}`    | Ngày làm mi gần nhất         | `customer.lastVisit` / `customer.lastBookingDate` (Formatted `DD/MM/YYYY`)                                     | "02/08/2026"                   |
| `{sdt_cua_hang}`     | SĐT / Hotline cửa hàng       | Store config hotline e.g. `"0909123456"`                                                                       | "0909123456"                   |
| `{diachi_cuahang}`   | Địa chỉ cửa hàng             | Store config address e.g. `"123 Nguyễn Trãi, Q.1, TP.HCM"`                                                     | "123 Nguyễn Trãi, Q.1, TP.HCM" |
| `{ten_booker}`       | Tên nhân viên Booker         | Current logged-in staff `displayName`                                                                          | "Ngọc Điệp"                    |

### 4.2 Substitution Helper Specifications

A client-side & backend template substitution engine must:

1. Perform global tag replacements using regex pattern `/\{([a-zA-Z0-9_]+)\}/g`.
2. Extract missing variables if any tag exists in `content` but has no valid key in `variables`.
3. Calculate character length and SMS segment count:
   - **GSM 7-bit Encoding**: Single SMS <= 160 characters. Concatenated SMS <= 153 characters per segment.
   - **Unicode (UCS-2) Encoding**: Single SMS <= 70 characters. Concatenated SMS <= 67 characters per segment.

---

## 5. System Rule Compliance Checklist

| Rule Category                | Constraint Description                                     | Implementation Requirement                                                                                                                 |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Fastify Relative Imports** | All relative imports in `apps/api` **MUST** end with `.js` | `import { smsService } from './services/sms.service.js';` in Fastify backend files.                                                        |
| **SDK Usage (No Raw Axios)** | Never use raw axios calls in UI components                 | Use `apiClient.sms.sendSms(...)` and `apiClient.sms.getTemplates()` exclusively.                                                           |
| **RBAC Authorization**       | Admin vs Staff role permissions                            | `/api/sms/templates` (POST/PUT/DELETE) guarded by `requireRole(['admin'])`. `/api/sms/send` guarded by `requireAuth` (staff/booker/admin). |
| **Theme Compatibility**      | Light / Dark theme support                                 | Use Antd tokens or `themeMode === 'dark' ? ... : ...` in components & styles.                                                              |
| **Number Jitter Prevention** | `tabular-nums` for timers, counts, timestamps              | Apply `className="tabular-nums"` or `font-variant-numeric: tabular-nums` to SMS lengths (`125/160`), timestamps (`14:41:22`), and counts.  |
| **Database Operations**      | DB client separation                                       | Write SMS records to legacy DB `user_sms` via `fastify.prisma.legacy`, write log to CRM DB `crm_call_logs` via `fastify.prisma.crm`.       |

---

## 6. Implementation Roadmap for Milestone 2

1. **Step 1 (Shared Types)**: Add `packages/shared/src/types/sms.ts`, export from `packages/shared/src/index.ts`, run `pnpm --filter @mos-lab/shared build`.
2. **Step 2 (API Client)**: Extend `apps/web/lib/api-client.ts` with `sms` property object.
3. **Step 3 (Fastify Backend)**: Create `apps/api/src/modules/sms/` (routes, controller, service) using `.js` imports and Prisma legacy/crm clients.
4. **Step 4 (Frontend UI)**: Build `SMSModal.tsx` dual-pane component with Antd 5 + Tailwind v4 + Light/Dark theme support + `tabular-nums`.
