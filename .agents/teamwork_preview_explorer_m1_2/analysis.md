# Milestone 1: SMS Action Feature - Backend Audit & Architecture Specification

**Author**: Explorer 2 (`teamwork_preview_explorer_m1_2`)  
**Date**: 2026-07-29  
**Target System**: Fastify 5 Backend (`apps/api`) & Shared Types (`packages/shared`)

---

## Executive Summary

This report provides a detailed audit of the backend Prisma schemas, database access patterns, and architectural design for the **SMS Action Feature** in `mos-lab`. The implementation requires 100% backward compatibility with the legacy MySQL `management` database table `user_sms`, seamless integration with CRM contact logs (`crm_call_logs`), and centralized system SMS template storage in `crm_config`.

---

## 1. Database Schema Audit & Prisma Model Mapping

### 1.1 Legacy Database Schema (`apps/api/prisma/legacy.prisma`)

**Current State**: The `user_sms` model is **not currently mapped** in `apps/api/prisma/legacy.prisma`.  
**Source Verification**: Verified against legacy PHP model `WingsLashes/Server/src/admin/apps/models/DbTable/UserSmsDbTable.php` and production MySQL `management` schema.

#### Proposed Prisma Model Definition for `legacy.prisma`

```prisma
model user_sms {
  id                   Int       @id @default(autoincrement()) @db.UnsignedInt
  client_id            Int       @default(1) @db.UnsignedInt
  client_business_id   Int       @default(1) @db.UnsignedInt
  created_staff_id     Int?      @db.UnsignedInt
  from_phone_number    String    @db.VarChar(20)
  to_phone_number      String    @db.VarChar(20)
  from_user_contact_id Int?      @db.UnsignedInt
  to_user_contact_id   Int?      @db.UnsignedInt
  from_user_id         Int?      @db.UnsignedInt
  to_user_id           Int?      @db.UnsignedInt
  to_language_id       Int?      @db.UnsignedInt
  template_id          Int?      @db.UnsignedInt
  order_id             Int?      @db.UnsignedInt
  sales_lead_id        Int?      @db.UnsignedInt
  provider             String?   @db.VarChar(30)
  title                String?   @db.VarChar(255)
  body                 String    @db.VarChar(500)
  data                 String?   @db.VarChar(255)
  post_param           String    @db.Text
  message_id           String?   @db.VarChar(100)
  sent_result          String?   @db.VarChar(255)
  ip_address           String    @db.VarChar(100)
  date_sent            DateTime? @db.DateTime(0)
  date_created         DateTime  @db.DateTime(0)

  @@index([to_user_id])
  @@index([created_staff_id])
  @@index([date_created])
}
```

_Note_: After adding this model to `apps/api/prisma/legacy.prisma`, run `pnpm --filter @mos-lab/api prisma:generate` to regenerate `@mos-lab/api` legacy Prisma client (`fastify.prisma.legacy.user_sms`).

---

### 1.2 CRM Database Schema (`apps/api/prisma/crm.prisma`)

**Current State**: Models `CrmCallLog` and `CrmConfig` are already defined and active in `crm.prisma`.

#### Relevant Models:

1. `CrmCallLog` (`crm_call_logs` table):
   - `id`: Int `@id @default(autoincrement())`
   - `planId`: Int? `@map("plan_id")`
   - `legacyUserId`: Int `@map("legacy_user_id")`
   - `staffId`: Int `@map("staff_id")`
   - `callType`: String `@map("call_type")` (For SMS actions, `callType = 'SMS'`)
   - `callResult`: String? `@map("call_result")` (Set to `'SENT'` or `'DELIVERED'`)
   - `durationSec`: Int? `@map("duration_sec")` (Set to `0` or `null`)
   - `note`: String? `@db.Text` (Stores the rendered SMS content string)
   - `outcome`: String? `@db.VarChar(30)` (Set to `'SMS_SENT'`)
   - `callUuid`: String? `@map("call_uuid")` (Stores reference string `USER_SMS_<id>`)
   - `createdAt`: DateTime `@default(now())`

2. `CrmConfig` (`crm_config` table):
   - `key`: String `@unique` (Key for SMS templates: `'SMS_TEMPLATES_CONFIG'`)
   - `value`: String `@db.Text` (JSON string array of SMS templates)
   - `updatedAt`: DateTime `@updatedAt`

---

## 2. Fastify Route & Module Architecture Audit

### 2.1 File Location & Registration

- New Module File: `apps/api/src/modules/sms/routes.ts`
- Registration File: `apps/api/src/server.ts`
  ```typescript
  import { smsRoutes } from './modules/sms/routes.js';
  // ...
  await server.register(smsRoutes, { prefix: '/api' });
  ```

---

## 3. Fastify API Endpoint Specifications

### 3.1 `POST /api/sms/send`

Sends an SMS message, records a new entry in legacy `user_sms`, creates a corresponding log in `crm_call_logs`, and optionally updates daily plan status.

- **Authentication**: `preHandler: [requireAuth]`
- **Request Body Payload**:

  ```json
  {
    "customerId": 1234,
    "toPhoneNumber": "0901234567",
    "body": "Chào Chị Lan, mi của chị đã làm được 17 ngày. Liên hệ 0901234567 để hẹn lịch dặm mi nhé!",
    "templateId": 1,
    "planId": 5678
  }
  ```

- **Execution Flow**:
  1. Validate `customerId` and non-empty `body`.
  2. If `toPhoneNumber` is not supplied, query active contact number from legacy `user_contact` table (`user_id = customerId AND is_disabled = 0`).
  3. Create record in legacy DB `user_sms`:
     ```typescript
     const userSms = await fastify.prisma.legacy.user_sms.create({
       data: {
         client_id: 1,
         client_business_id: 1,
         created_staff_id: user.id,
         from_phone_number: 'HOTLINE',
         to_phone_number: resolvedPhone,
         to_user_id: customerId,
         template_id: templateId || null,
         body: body.trim(),
         post_param: JSON.stringify({ source: 'mos-lab CRM', staffId: user.id }),
         ip_address: request.ip || '127.0.0.1',
         date_created: new Date(),
       },
     });
     ```
  4. Create CRM contact log in `crm_call_logs`:
     ```typescript
     const callLog = await fastify.prisma.crm.crmCallLog.create({
       data: {
         planId: planId || null,
         legacyUserId: customerId,
         staffId: user.id,
         callType: 'SMS',
         callResult: 'SENT',
         note: body.trim(),
         outcome: 'SMS_SENT',
         callUuid: `USER_SMS_${userSms.id}`,
         createdAt: new Date(),
       },
     });
     ```
  5. If `planId` is provided, update `crm_daily_plans` status to `'CALLED'`.
  6. Return response:
     ```json
     {
       "success": true,
       "message": "Gửi tin nhắn SMS thành công",
       "data": {
         "userSmsId": 12345,
         "callLogId": 67890,
         "toPhoneNumber": "0901234567",
         "body": "Chào Chị Lan...",
         "dateCreated": "2026-07-29T14:45:00.000Z"
       }
     }
     ```

---

### 3.2 `GET /api/sms/templates` & `POST /api/sms/templates`

#### `GET /api/sms/templates`

Fetches system & custom SMS templates stored in `crm_config` under key `'SMS_TEMPLATES_CONFIG'`.

- **Authentication**: `preHandler: [requireAuth]`
- **Default Seed Fallback**: If key `'SMS_TEMPLATES_CONFIG'` does not exist in `CrmConfig`, automatically seed the default templates:
  ```json
  [
    {
      "id": 1,
      "name": "Reminder 17 - Single (Chăm 17)",
      "content": "Chào {ten_khach}, mi của bạn đã làm được {so_ngay_dam} ngày. Liên hệ {sdt_cua_hang} để đặt lịch dặm mi nhé!",
      "category": "CHAM_17",
      "isSystem": true
    },
    {
      "id": 2,
      "name": "Reminder 25 - Combo (Chăm 25)",
      "content": "Chào {ten_khach}, gói combo {ten_combo} của bạn sắp đến hạn dặm (hạn dùng: {han_dung}). Liên hệ {sdt_cua_hang} để giữ lịch!",
      "category": "CHAM_25",
      "isSystem": true
    }
  ]
  ```

#### `POST /api/sms/templates`

Updates or creates SMS templates list in `crm_config`.

- **Authentication**: `preHandler: [requireAuth, requireRole(['admin', 'manager'])]`
- **Request Payload**:
  ```json
  {
    "templates": [
      {
        "id": 1,
        "name": "Reminder 17 - Single (Chăm 17)",
        "content": "Chào {ten_khach}, mi của bạn đã làm được {so_ngay_dam} ngày...",
        "category": "CHAM_17",
        "isSystem": true
      },
      {
        "id": 3,
        "name": "Mẫu Chăm Sóc Khách Hàng Thân Thiết",
        "content": "Chào {ten_khach}, tri ân khách hàng...",
        "category": "CUSTOM",
        "isSystem": false
      }
    ]
  }
  ```

---

### 3.3 `GET /api/sms/history/:customerId`

Returns historical SMS entries sent to a specific customer.

- **Authentication**: `preHandler: [requireAuth]`
- **Path Parameter**: `customerId` (legacy_user_id)
- **Data Access Pattern**:
  Query `user_sms` from legacy DB where `to_user_id = customerId`, ordered by `date_created DESC`. Join/Map `created_staff_id` with `crm_staff` display names.
- **Response Payload**:
  ```json
  {
    "customerId": 1234,
    "history": [
      {
        "id": 987,
        "toPhoneNumber": "0901234567",
        "body": "Chào Chị Lan, mi của chị...",
        "templateId": 1,
        "staffId": 12,
        "staffName": "Ngọc Điệp",
        "dateCreated": "2026-07-29T10:30:00.000Z",
        "status": "SENT"
      }
    ]
  }
  ```

---

## 4. Shared Types & SDK Extensions (`packages/shared`)

Add `packages/shared/src/types/sms.ts` and export it in `packages/shared/src/index.ts`:

```typescript
export interface SmsTemplate {
  id: number;
  name: string;
  content: string;
  category: 'CHAM_17' | 'CHAM_25' | 'PROMO' | 'CUSTOM';
  isSystem: boolean;
  updatedAt?: string;
}

export interface SendSmsRequest {
  customerId: number;
  toPhoneNumber?: string;
  body: string;
  templateId?: number;
  planId?: number;
}

export interface SendSmsResponse {
  success: boolean;
  message: string;
  data: {
    userSmsId: number;
    callLogId: number;
    toPhoneNumber: string;
    body: string;
    dateCreated: string;
  };
}

export interface SmsHistoryItem {
  id: number;
  toPhoneNumber: string;
  body: string;
  templateId: number | null;
  staffId: number | null;
  staffName: string;
  dateCreated: string;
  status: string;
}
```

Add SDK namespace `apiClient.sms` in `apps/web/lib/api-client.ts`:

```typescript
  sms: {
    send: async (data: SendSmsRequest): Promise<SendSmsResponse> => {
      const response = await api.post('/sms/send', data);
      return response.data;
    },
    getTemplates: async (): Promise<{ templates: SmsTemplate[] }> => {
      const response = await api.get('/sms/templates');
      return response.data;
    },
    saveTemplates: async (templates: SmsTemplate[]): Promise<{ success: boolean; templates: SmsTemplate[] }> => {
      const response = await api.post('/sms/templates', { templates });
      return response.data;
    },
    getHistory: async (customerId: number): Promise<{ customerId: number; history: SmsHistoryItem[] }> => {
      const response = await api.get(`/sms/history/${customerId}`);
      return response.data;
    },
  }
```

---

## 5. Verification Plan

1. **Prisma Generation Check**: Run `pnpm --filter @mos-lab/api prisma:generate` and confirm TypeScript types for `fastify.prisma.legacy.user_sms` compile cleanly.
2. **Endpoint Testing**:
   - Send test POST request to `/api/sms/send` and verify dual writes in `user_sms` and `crm_call_logs`.
   - Send GET request to `/api/sms/templates` and verify fallback template generation.
   - Send GET request to `/api/sms/history/:customerId` and verify historical records retrieval.
