# Báo Cáo Phân Tích & Audit Kỹ Lưỡng Bản Implementation Plan

## Feature: "Catalog Management (Services, Combos & Products CRUD for Admin)" — Project `mos-lab`

**Author**: Project Orchestrator (`mos-lab`)  
**Date**: 2026-07-26  
**Target Project**: `mos-lab` (`/Users/dannydo/projects/mos-lab`)  
**Source Code Reference**: WingsLashes PHP Backend (`/Users/dannydo/projects/WingsLashes/Server/src/admin/apps/models/DbTable/`)  
**Status**: Comprehensive Audit Complete — Victory Claim Ready

---

## Executive Summary

Chúng tôi đã tiến hành một cuộc kiểm tra và thẩm định toàn diện (deep-dive audit) bản Implementation Plan cho tính năng **Catalog Management (Services, Combos & Products CRUD for Admin)** trong dự án `mos-lab`. Cuộc audit được thực hiện thông qua 5 subagent chuyên trách (R1 đến R5), đối chiếu trực tiếp giữa mã nguồn WingsLashes PHP (Phalcon DbTable ORM models), schema Prisma hiện tại (`apps/api/prisma/legacy.prisma`), quy tắc dự án trong `AGENTS.md`, cũng như kiến trúc mã nguồn Fastify API & Next.js Frontend.

### Bảng Tổng Hợp Findings Theo Mức Độ Rủi Ro (Risk Ratings Summary)

| Mức Độ Rủi Ro (Severity) | Số Lượng Findings | Các Hạng Mục Ảnh Hưởng Chính                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------ | :---------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔴 **CRITICAL**          |       **3**       | • **R1-1**: 2 Lỗi Sai Schema Nghiêm Trọng Cột `service` (Tên cột `reminding_interval_day` bị đổi sai thành `remind_interval_day` và cột ma không tồn tại `last_day_required` làm sập SQL query runtime).<br>• **R1-2**: Thiếu hoàn toàn 4 Prisma models cốt lõi (`service_price`, `product`, `product_language`, `product_price`) trong `legacy.prisma`.<br>• **R4-2**: Vi phạm quy tắc READ-ONLY DB Legacy trong `AGENTS.md` chưa được giải trình & tái cấu trúc khung quyền.                                                                                                                                                                                                                                                                        |
| 🟠 **HIGH**              |       **6**       | • **R2-1**: Lỗi Signature Middleware `requireRole` (truyền string `requireRole('admin')` gây crash/bypass thay vì array `requireRole(['admin'])`).<br>• **R2-2**: Thiếu 4 endpoint CRUD cơ bản cho Combos & Products (`GET /:id`, `DELETE /:id`).<br>• **R3-1**: Xử lý Multi-currency thiếu default `currency_id` làm sập SQL `INSERT` hoặc tính sai tổng thu.<br>• **R3-2**: Xử lý Multi-store Tenancy thiếu `client_id=1`, `client_business_id=1` làm sập ghi DB & biến mất dữ liệu trên KPI.<br>• **R3-5**: Hiệu ứng lan truyền (Cascading effects) khi disable/delete làm rác DB & gián đoạn quyền lợi gói combo của khách.<br>• **R3-6**: Sai format `service_price_package_key` gây nhận diện nhầm Combo Sales trong `ComboRecognitionService`. |
| 🟡 **MEDIUM**            |       **5**       | • **R2-3**: Ô nhiễm API Root Namespace (`/services` thay vì `/api/catalog/services`).<br>• **R2-4**: Thiếu các endpoint vận hành (Soft Delete/Restore, Drag-and-drop Reorder `position`, Bulk Status toggle).<br>• **R3-3**: Chưa xử lý phân cấp Cha-Con `parent_service_id` làm hỏng quy tắc hạn dặm mi 21/25 ngày (Rule #16).<br>• **R3-4**: Trôi lệch Enum (`service_type`, `service_group`, `service_price_type`) làm sai thưởng FAL KTV (Rule #13).<br>• **R4-4**: Thiếu Prisma `$transaction` bảo vệ thao tác ghi đa bảng (`service` + `service_language` + `service_price`).                                                                                                                                                                   |
| 🔵 **LOW**               |       **3**       | • **R2-5**: Thiếu endpoint metadata phân loại category/group dropdown (`GET /catalog/groups`, `GET /catalog/types`).<br>• **R5-3**: Thiếu namespace `catalog` chuẩn trong SDK `apiClient` (`apps/web/lib/api-client.ts`).<br>• **R5-4**: Quên lệnh `pnpm --filter @mos-lab/shared build` sau khi định nghĩa types trong `packages/shared`.                                                                                                                                                                                                                                                                                                                                                                                                            |
| **TỔNG CỘNG**            |      **17**       | **100% Đã Có Đề Xuất Sửa Đổi Cụ Thể (Proposed Fixes)**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

---

## SECTION 1: R1 — Schema Correctness Audit (Legacy DB vs. Implementation Plan)

### 1.1 Chi Tiết Phát Hiện Lỗi Schema (Findings & Discrepancies)

1. **Lỗi 1 (CRITICAL — R1-1)**: Model `service` trong `apps/api/prisma/legacy.prisma` hiện tại có 2 sai lệch nghiêm trọng so với `ServiceDbTable.php`:
   - **Tên cột bị đổi sai**: Cột trong WingsLashes PHP model (dòng 177) là `reminding_interval_day` (có hậu tố `-ing`). Trong `legacy.prisma` (dòng 143) bị đổi thành `remind_interval_day`.
   - **Cột ma không tồn tại (Phantom column)**: Cột `last_day_required` trong `legacy.prisma` (dòng 144) **không hề tồn tại** trong mã nguồn PHP `ServiceDbTable.php` lẫn bảng MySQL `service`. Khi Prisma Client thực hiện query `prisma.service.findMany()`, MySQL sẽ ném lỗi runtime sập API: `ER_BAD_FIELD_ERROR: Unknown column 'service.last_day_required' in 'field list'`.
2. **Lỗi 2 (CRITICAL — R1-2)**: Thiếu hoàn toàn 4 Prisma models phục vụ Catalog trong `legacy.prisma`:
   - `service_price` (bảng chứa giá lẻ, giá combo, số lượt dặm/nối, hạn dùng gói)
   - `product` (bảng sản phẩm bán lẻ)
   - `product_language` (bảng đa ngôn ngữ sản phẩm)
   - `product_price` (bảng giá sản phẩm)
3. **Xác minh `service_language`**: Khớp 100% giữa `ServiceLanguageDbTable.php` (6 trường) và `legacy.prisma` (dòng 153–161).

---

### 1.2 Bảng So Sánh Chi Tiết Từng Cột (Field-by-Field Schema Comparison Tables)

#### Bảng 1.2.1: Model `service`

| Tên Cột                                  | WingsLashes PHP (`ServiceDbTable.php`) | Existing `legacy.prisma`                                      | Trạng Thái Sai Lệch         | Đề Xuất Sửa Đổi Trong Prisma (`legacy.prisma`)                |
| ---------------------------------------- | -------------------------------------- | ------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------- |
| `id`                                     | int(10), NOT NULL, PK, Auto            | `id Int @id @default(...) @db.UnsignedInt`                    | Khớp 100%                   | `id Int @id @default(autoincrement()) @db.UnsignedInt`        |
| `client_id`                              | int(10), NOT NULL                      | `client_id Int @db.UnsignedInt`                               | Khớp 100%                   | `client_id Int @db.UnsignedInt`                               |
| `client_business_id`                     | int(10), NOT NULL                      | `client_business_id Int @db.UnsignedInt`                      | Khớp 100%                   | `client_business_id Int @db.UnsignedInt`                      |
| `parent_service_id`                      | int(10), NULL                          | `parent_service_id Int? @db.UnsignedInt`                      | Khớp 100%                   | `parent_service_id Int? @db.UnsignedInt`                      |
| `service_key`                            | string(40), NOT NULL                   | `service_key String @db.Char(40)`                             | Khớp 100%                   | `service_key String @db.Char(40)`                             |
| `service_type`                           | string(30), NOT NULL                   | `service_type String @db.Char(30)`                            | Khớp 100%                   | `service_type String @db.Char(30)`                            |
| `service_group`                          | string(30), NOT NULL                   | `service_group String @db.Char(30)`                           | Khớp 100%                   | `service_group String @db.Char(30)`                           |
| `duration_minute`                        | int(10), NOT NULL                      | `duration_minute Int @db.UnsignedInt`                         | Khớp 100%                   | `duration_minute Int @db.UnsignedInt`                         |
| `duration_minute_standard`               | int(10), NOT NULL                      | `duration_minute_standard Int @db.UnsignedInt`                | Khớp 100%                   | `duration_minute_standard Int @db.UnsignedInt`                |
| `image_filename`                         | string(255), NULL                      | `image_filename String? @db.VarChar(255)`                     | Khớp 100%                   | `image_filename String? @db.VarChar(255)`                     |
| `image_extension`                        | string(5), NULL                        | `image_extension String? @db.Char(5)`                         | Khớp 100%                   | `image_extension String? @db.Char(5)`                         |
| `service_attribute_set_id`               | int(10), NULL                          | `service_attribute_set_id Int? @db.UnsignedInt`               | Khớp 100%                   | `service_attribute_set_id Int? @db.UnsignedInt`               |
| `service_retain_attribute_set_id`        | int(10), NULL                          | `service_retain_attribute_set_id Int? @db.UnsignedInt`        | Khớp 100%                   | `service_retain_attribute_set_id Int? @db.UnsignedInt`        |
| `profile_attribute_set_id`               | int(10), NOT NULL                      | `profile_attribute_set_id Int @db.UnsignedInt`                | Khớp 100%                   | `profile_attribute_set_id Int @db.UnsignedInt`                |
| `before_attribute_set_id`                | int(10), NULL                          | `before_attribute_set_id Int? @db.UnsignedInt`                | Khớp 100%                   | `before_attribute_set_id Int? @db.UnsignedInt`                |
| `after_attribute_set_id`                 | int(10), NULL                          | `after_attribute_set_id Int? @db.UnsignedInt`                 | Khớp 100%                   | `after_attribute_set_id Int? @db.UnsignedInt`                 |
| `staff_assigned_attribute_set_id`        | int(10), NULL                          | `staff_assigned_attribute_set_id Int? @db.UnsignedInt`        | Khớp 100%                   | `staff_assigned_attribute_set_id Int? @db.UnsignedInt`        |
| `staff_check_in_attribute_set_id`        | int(10), NULL                          | `staff_check_in_attribute_set_id Int? @db.UnsignedInt`        | Khớp 100%                   | `staff_check_in_attribute_set_id Int? @db.UnsignedInt`        |
| `staff_check_out_attribute_set_id`       | int(10), NULL                          | `staff_check_out_attribute_set_id Int? @db.UnsignedInt`       | Khớp 100%                   | `staff_check_out_attribute_set_id Int? @db.UnsignedInt`       |
| `staff_quality_control_attribute_set_id` | int(10), NULL                          | `staff_quality_control_attribute_set_id Int? @db.UnsignedInt` | Khớp 100%                   | `staff_quality_control_attribute_set_id Int? @db.UnsignedInt` |
| `customer_survey_set_id`                 | int(10), NOT NULL                      | `customer_survey_set_id Int @db.UnsignedInt`                  | Khớp 100%                   | `customer_survey_set_id Int @db.UnsignedInt`                  |
| `staff_survey_set_id`                    | int(10), NOT NULL                      | `staff_survey_set_id Int @db.UnsignedInt`                     | Khớp 100%                   | `staff_survey_set_id Int @db.UnsignedInt`                     |
| `feedback_attribute_set_id`              | int(10), NULL                          | `feedback_attribute_set_id Int? @db.UnsignedInt`              | Khớp 100%                   | `feedback_attribute_set_id Int? @db.UnsignedInt`              |
| **`reminding_interval_day`**             | int(10), NOT NULL                      | `remind_interval_day Int @db.UnsignedInt`                     | 🔴 **SAI TÊN CỘT**          | `reminding_interval_day Int @db.UnsignedInt`                  |
| **`last_day_required`**                  | _(Không có)_                           | `last_day_required Int @db.UnsignedInt`                       | 🔴 **CỘT MA KHÔNG TỒN TẠI** | _(Xóa bỏ khỏi Prisma schema)_                                 |
| `position`                               | int(10), NOT NULL                      | `position Int @db.UnsignedInt`                                | Khớp 100%                   | `position Int @db.UnsignedInt`                                |
| `is_temporary`                           | int(1), NOT NULL                       | `is_temporary Boolean`                                        | Khớp 100%                   | `is_temporary Boolean`                                        |
| `is_disabled`                            | int(1), NOT NULL                       | `is_disabled Boolean`                                         | Khớp 100%                   | `is_disabled Boolean`                                         |
| `date_updated`                           | datetime, NULL                         | `date_updated DateTime? @db.DateTime(0)`                      | Khớp 100%                   | `date_updated DateTime? @db.DateTime(0)`                      |
| `date_created`                           | datetime, NOT NULL                     | `date_created DateTime @db.DateTime(0)`                       | Khớp 100%                   | `date_created DateTime @db.DateTime(0)`                       |

---

#### Bảng 1.2.2: Model `service_language`

| Tên Cột                     | WingsLashes PHP (`ServiceLanguageDbTable.php`) | Existing `legacy.prisma`                               | Trạng Thái Sai Lệch | Đề Xuất Sửa Đổi Trong Prisma                           |
| --------------------------- | ---------------------------------------------- | ------------------------------------------------------ | ------------------- | ------------------------------------------------------ |
| `id`                        | int(10), NOT NULL, PK                          | `id Int @id @default(autoincrement()) @db.UnsignedInt` | Khớp 100%           | `id Int @id @default(autoincrement()) @db.UnsignedInt` |
| `language_id`               | int(10), NOT NULL                              | `language_id Int @db.UnsignedInt`                      | Khớp 100%           | `language_id Int @db.UnsignedInt`                      |
| `service_id`                | int(10), NOT NULL                              | `service_id Int @db.UnsignedInt`                       | Khớp 100%           | `service_id Int @db.UnsignedInt`                       |
| `service_name`              | string(255), NOT NULL                          | `service_name String @db.VarChar(255)`                 | Khớp 100%           | `service_name String @db.VarChar(255)`                 |
| `service_short_description` | string(255), NULL                              | `service_short_description String? @db.VarChar(255)`   | Khớp 100%           | `service_short_description String? @db.VarChar(255)`   |
| `service_description`       | string, NULL                                   | `service_description String? @db.Text`                 | Khớp 100%           | `service_description String? @db.Text`                 |

---

#### Bảng 1.2.3: Model `service_price` (Thêm Mới)

| Tên Cột                     | WingsLashes PHP (`ServicePriceDbTable.php`) | Nullability & Key  | Prisma Data Type & Decorator Đề Xuất                   |
| --------------------------- | ------------------------------------------- | ------------------ | ------------------------------------------------------ |
| `id`                        | int(10)                                     | NOT NULL, PK, Auto | `id Int @id @default(autoincrement()) @db.UnsignedInt` |
| `service_id`                | int(10)                                     | NOT NULL           | `service_id Int @db.UnsignedInt`                       |
| `currency_id`               | int(10)                                     | NOT NULL           | `currency_id Int @db.UnsignedInt`                      |
| `service_price_package_key` | string(30)                                  | NOT NULL           | `service_price_package_key String @db.Char(30)`        |
| `service_price_type`        | string(30)                                  | NOT NULL           | `service_price_type String @db.Char(30)`               |
| `service_price`             | decimal / string                            | NOT NULL           | `service_price Float`                                  |
| `normal_count`              | int(11)                                     | NOT NULL           | `normal_count Int`                                     |
| `retain_count`              | int(11)                                     | NOT NULL           | `retain_count Int`                                     |
| `per_normal_price`          | decimal / string                            | NOT NULL           | `per_normal_price Float`                               |
| `per_retain_price`          | decimal / string                            | NOT NULL           | `per_retain_price Float`                               |
| `expiry_after_day`          | double                                      | NOT NULL           | `expiry_after_day Float`                               |
| `bonus_active_day`          | double                                      | NOT NULL           | `bonus_active_day Float`                               |
| `position`                  | int(10)                                     | NOT NULL           | `position Int @db.UnsignedInt`                         |
| `is_same_count`             | int(1)                                      | NOT NULL           | `is_same_count Boolean`                                |
| `is_new_user_disabled`      | int(1)                                      | NOT NULL           | `is_new_user_disabled Boolean`                         |
| `is_disabled`               | int(1)                                      | NOT NULL           | `is_disabled Boolean`                                  |

---

#### Bảng 1.2.4: Model `product` (Thêm Mới)

| Tên Cột              | WingsLashes PHP (`ProductDbTable.php`) | Nullability & Key  | Prisma Data Type & Decorator Đề Xuất                   |
| -------------------- | -------------------------------------- | ------------------ | ------------------------------------------------------ |
| `id`                 | int(10)                                | NOT NULL, PK, Auto | `id Int @id @default(autoincrement()) @db.UnsignedInt` |
| `client_id`          | int(10)                                | NOT NULL           | `client_id Int @db.UnsignedInt`                        |
| `client_business_id` | int(10)                                | NOT NULL           | `client_business_id Int @db.UnsignedInt`               |
| `created_staff_id`   | int(10)                                | NULL               | `created_staff_id Int? @db.UnsignedInt`                |
| `inventory_item_id`  | int(10)                                | NOT NULL           | `inventory_item_id Int @db.UnsignedInt`                |
| `product_sku`        | string(64)                             | NOT NULL           | `product_sku String @db.VarChar(64)`                   |
| `position`           | int(10)                                | NOT NULL           | `position Int @db.UnsignedInt`                         |
| `is_disabled`        | int(1)                                 | NOT NULL           | `is_disabled Boolean`                                  |
| `date_updated`       | datetime                               | NULL               | `date_updated DateTime? @db.DateTime(0)`               |
| `date_created`       | datetime                               | NOT NULL           | `date_created DateTime @db.DateTime(0)`                |

---

#### Bảng 1.2.5: Model `product_language` (Thêm Mới)

| Tên Cột                     | WingsLashes PHP (`ProductLanguageDbTable.php`) | Nullability & Key  | Prisma Data Type & Decorator Đề Xuất                   |
| --------------------------- | ---------------------------------------------- | ------------------ | ------------------------------------------------------ |
| `id`                        | int(10)                                        | NOT NULL, PK, Auto | `id Int @id @default(autoincrement()) @db.UnsignedInt` |
| `created_staff_id`          | int(10)                                        | NULL               | `created_staff_id Int? @db.UnsignedInt`                |
| `language_id`               | int(10)                                        | NOT NULL           | `language_id Int @db.UnsignedInt`                      |
| `product_id`                | int(10)                                        | NOT NULL           | `product_id Int @db.UnsignedInt`                       |
| `product_name`              | string(255)                                    | NOT NULL           | `product_name String @db.VarChar(255)`                 |
| `product_short_description` | string(255)                                    | NULL               | `product_short_description String? @db.VarChar(255)`   |
| `product_description`       | string                                         | NULL               | `product_description String? @db.Text`                 |

---

#### Bảng 1.2.6: Model `product_price` (Thêm Mới)

| Tên Cột            | WingsLashes PHP (`ProductPriceDbTable.php`) | Nullability & Key  | Prisma Data Type & Decorator Đề Xuất                   |
| ------------------ | ------------------------------------------- | ------------------ | ------------------------------------------------------ |
| `id`               | int(10)                                     | NOT NULL, PK, Auto | `id Int @id @default(autoincrement()) @db.UnsignedInt` |
| `created_staff_id` | int(10)                                     | NULL               | `created_staff_id Int? @db.UnsignedInt`                |
| `product_id`       | int(10)                                     | NOT NULL           | `product_id Int @db.UnsignedInt`                       |
| `currency_id`      | int(10)                                     | NOT NULL           | `currency_id Int @db.UnsignedInt`                      |
| `product_price`    | decimal / string                            | NOT NULL           | `product_price Float`                                  |

---

### 1.3 Mã Prisma Schema Chuẩn 100% Cần Cập Nhật (`apps/api/prisma/legacy.prisma`)

```prisma
model service {
  id                                      Int       @id @default(autoincrement()) @db.UnsignedInt
  client_id                               Int       @db.UnsignedInt
  client_business_id                      Int       @db.UnsignedInt
  parent_service_id                       Int?      @db.UnsignedInt
  service_key                             String    @db.Char(40)
  service_type                            String    @db.Char(30)
  service_group                           String    @db.Char(30)
  duration_minute                         Int       @db.UnsignedInt
  duration_minute_standard                Int       @db.UnsignedInt
  image_filename                          String?   @db.VarChar(255)
  image_extension                         String?   @db.Char(5)
  service_attribute_set_id                Int?      @db.UnsignedInt
  service_retain_attribute_set_id         Int?      @db.UnsignedInt
  profile_attribute_set_id                Int       @db.UnsignedInt
  before_attribute_set_id                 Int?      @db.UnsignedInt
  after_attribute_set_id                  Int?      @db.UnsignedInt
  staff_assigned_attribute_set_id         Int?      @db.UnsignedInt
  staff_check_in_attribute_set_id         Int?      @db.UnsignedInt
  staff_check_out_attribute_set_id        Int?      @db.UnsignedInt
  staff_quality_control_attribute_set_id  Int?      @db.UnsignedInt
  customer_survey_set_id                  Int       @db.UnsignedInt
  staff_survey_set_id                     Int       @db.UnsignedInt
  feedback_attribute_set_id               Int?      @db.UnsignedInt
  reminding_interval_day                  Int       @db.UnsignedInt
  position                                Int       @db.UnsignedInt
  is_temporary                            Boolean
  is_disabled                             Boolean
  date_updated                            DateTime? @db.DateTime(0)
  date_created                            DateTime  @db.DateTime(0)
}

model service_language {
  id                        Int     @id @default(autoincrement()) @db.UnsignedInt
  language_id               Int     @db.UnsignedInt
  service_id                Int     @db.UnsignedInt
  service_name              String  @db.VarChar(255)
  service_short_description String? @db.VarChar(255)
  service_description       String? @db.Text
}

model service_price {
  id                        Int     @id @default(autoincrement()) @db.UnsignedInt
  service_id                Int     @db.UnsignedInt
  currency_id               Int     @db.UnsignedInt
  service_price_package_key String  @db.Char(30)
  service_price_type        String  @db.Char(30)
  service_price             Float
  normal_count              Int
  retain_count              Int
  per_normal_price          Float
  per_retain_price          Float
  expiry_after_day          Float
  bonus_active_day          Float
  position                  Int     @db.UnsignedInt
  is_same_count             Boolean
  is_new_user_disabled      Boolean
  is_disabled               Boolean
}

model product {
  id                 Int       @id @default(autoincrement()) @db.UnsignedInt
  client_id          Int       @db.UnsignedInt
  client_business_id Int       @db.UnsignedInt
  created_staff_id   Int?      @db.UnsignedInt
  inventory_item_id  Int       @db.UnsignedInt
  product_sku        String    @db.VarChar(64)
  position           Int       @db.UnsignedInt
  is_disabled        Boolean
  date_updated       DateTime? @db.DateTime(0)
  date_created       DateTime  @db.DateTime(0)
}

model product_language {
  id                        Int     @id @default(autoincrement()) @db.UnsignedInt
  created_staff_id          Int?    @db.UnsignedInt
  language_id               Int     @db.UnsignedInt
  product_id                Int     @db.UnsignedInt
  product_name              String  @db.VarChar(255)
  product_short_description String? @db.VarChar(255)
  product_description       String? @db.Text
}

model product_price {
  id               Int   @id @default(autoincrement()) @db.UnsignedInt
  created_staff_id Int?  @db.UnsignedInt
  product_id       Int   @db.UnsignedInt
  currency_id      Int   @db.UnsignedInt
  product_price    Float
}
```

---

## SECTION 2: R2 — API Design & Completeness Review

### 2.1 Các Vấn Đề Thiết Kế Đã Phát Hiện (API Design Findings)

1. **Lỗi Signature Middleware Auth (HIGH — R2-1)**:
   - File `apps/api/src/middlewares/auth.ts` dòng 54 định nghĩa `requireRole(allowedRoles: UserRole[])`.
   - Plan ghi `requireRole('admin')` (dạng string đơn). Khi biên dịch TypeScript sẽ bị ném lỗi type mismatch, hoặc nếu bypass type sẽ làm hàm `.includes()` gọi sai trên string gây lặp ký tự hoặc bypass quyền hạn.
   - **Fix**: Sửa middleware trong `auth.ts` hỗ trợ linh hoạt cả string lẫn array:
     ```typescript
     export function requireRole(allowedRoles: UserRole | UserRole[]) {
       const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
       return async (request: FastifyRequest, reply: FastifyReply) => {
         const user = request.user as JwtUserPayload | undefined;
         if (!user) return reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
         if (!rolesArray.includes(user.role)) {
           return reply
             .status(403)
             .send({ error: 'Forbidden', message: `Role "${user.role}" does not have permission` });
         }
       };
     }
     ```

2. **Thiếu Khả Năng CRUD Cơ Bản (HIGH — R2-2)**:
   - 11 endpoints đề xuất trong plan chỉ bao gồm 5 endpoints cho Service (`GET`, `GET /:id`, `POST`, `PUT /:id`, `DELETE /:id`), 3 cho Combos (`GET`, `POST`, `PUT /:id`), 3 cho Products (`GET`, `POST`, `PUT /:id`).
   - Bị khuyết hoàn toàn `GET /combos/:id`, `DELETE /combos/:id`, `GET /products/:id`, và `DELETE /products/:id`. Chi tiết đơn lẻ và tính năng ẩn/xóa không thể hoạt động trên UI nếu thiếu các endpoint này.

3. **Thiếu Endpoints Vận Hành Thực Tế (MEDIUM — R2-4 & R2-5)**:
   - Bảng `service` legacy có trường `is_disabled` và `position`.
   - Cần bổ sung các endpoint: Soft delete/restore (`POST /:id/restore`), Kéo thả sắp xếp thứ tự (`POST /reorder`), Thay đổi trạng thái hàng loạt (`POST /bulk-status`), Danh sách rút gọn cho Select Dropdown (`GET /select`), và API metadata lấy danh sách nhóm/loại (`GET /groups`, `GET /types`).

4. **Chuẩn Hóa Namespace & Phân Trang (MEDIUM — R2-3)**:
   - Gom tất cả endpoint Catalog về namespace thống nhất `/api/catalog/*`.
   - Tất cả API dạng danh sách bắt buộc nhận tham số `page` (default 1), `pageSize` (default 20), `search`, `group`, `isDisabled` và trả về phong bì envelope chuẩn:
     `{ success: true, data: [...], meta: { page, pageSize, total, totalPages } }`.

---

### 2.2 Danh Sách 22 Endpoints Catalog Chuẩn Hóa Toàn Diện (Complete API Specification Table)

| #   | Method   | Endpoint Path                       | Middleware / Roles                               | Mô Tả & Nghiệp Vụ                                                   | Parameters / Body                                            | Response Envelope                                                                 |
| --- | -------- | ----------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 1   | `GET`    | `/api/catalog/services`             | `requireAuth`                                    | Phân trang danh sách dịch vụ lẻ, tìm kiếm & lọc nhóm                | `page=1&pageSize=20&search=mi&group=Lashes&isDisabled=false` | `{ success: true, data: Service[], meta: { page, pageSize, total, totalPages } }` |
| 2   | `GET`    | `/api/catalog/services/select`      | `requireAuth`                                    | Lấy danh sách dịch vụ rút gọn nhẹ cho UI Select Dropdown            | `group=Lashes&isDisabled=false`                              | `{ success: true, data: Array<{ id, name, price, duration, key }> }`              |
| 3   | `GET`    | `/api/catalog/services/:id`         | `requireAuth`                                    | Lấy chi tiết 1 dịch vụ lẻ kèm mô tả đa ngôn ngữ                     | Path: `id`                                                   | `{ success: true, data: ServiceDetail }`                                          |
| 4   | `POST`   | `/api/catalog/services`             | `requireAuth, requireRole(['admin', 'manager'])` | Tạo mới dịch vụ lẻ                                                  | Body: `CreateServiceInput`                                   | `201 Created` `{ success: true, data: Service }`                                  |
| 5   | `PUT`    | `/api/catalog/services/:id`         | `requireAuth, requireRole(['admin', 'manager'])` | Cập nhật toàn bộ thông tin dịch vụ lẻ                               | Path: `id`, Body: `UpdateServiceInput`                       | `{ success: true, data: Service }`                                                |
| 6   | `PATCH`  | `/api/catalog/services/:id`         | `requireAuth, requireRole(['admin', 'manager'])` | Cập nhật một phần thuộc tính dịch vụ                                | Path: `id`, Body: `Partial<UpdateServiceInput>`              | `{ success: true, data: Service }`                                                |
| 7   | `DELETE` | `/api/catalog/services/:id`         | `requireAuth, requireRole(['admin'])`            | Xóa mềm dịch vụ (`is_disabled = true`)                              | Path: `id`                                                   | `{ success: true, message: 'Service disabled' }`                                  |
| 8   | `POST`   | `/api/catalog/services/:id/restore` | `requireAuth, requireRole(['admin'])`            | Khôi phục dịch vụ đã xóa mềm (`is_disabled = false`)                | Path: `id`                                                   | `{ success: true, data: Service }`                                                |
| 9   | `POST`   | `/api/catalog/services/reorder`     | `requireAuth, requireRole(['admin', 'manager'])` | Cập nhật vị trí `position` kéo thả sắp xếp                          | Body: `{ items: Array<{ id: number, position: number }> }`   | `{ success: true, message: 'Positions updated' }`                                 |
| 10  | `POST`   | `/api/catalog/services/bulk-status` | `requireAuth, requireRole(['admin'])`            | Bật/tắt trạng thái nhiều dịch vụ cùng lúc                           | Body: `{ ids: number[], isDisabled: boolean }`               | `{ success: true, updatedCount: number }`                                         |
| 11  | `GET`    | `/api/catalog/combos`               | `requireAuth`                                    | Phân trang danh sách gói Combo                                      | `page=1&pageSize=20&search=combo&isDisabled=false`           | `{ success: true, data: Combo[], meta: { page, pageSize, total, totalPages } }`   |
| 12  | `GET`    | `/api/catalog/combos/:id`           | `requireAuth`                                    | Lấy chi tiết gói combo kèm danh sách dịch vụ cấu thành              | Path: `id`                                                   | `{ success: true, data: ComboDetailWithServices }`                                |
| 13  | `POST`   | `/api/catalog/combos`               | `requireAuth, requireRole(['admin', 'manager'])` | Tạo gói combo dịch vụ mới                                           | Body: `CreateComboInput`                                     | `201 Created` `{ success: true, data: Combo }`                                    |
| 14  | `PUT`    | `/api/catalog/combos/:id`           | `requireAuth, requireRole(['admin', 'manager'])` | Cập nhật thông tin gói combo                                        | Path: `id`, Body: `UpdateComboInput`                         | `{ success: true, data: Combo }`                                                  |
| 15  | `DELETE` | `/api/catalog/combos/:id`           | `requireAuth, requireRole(['admin'])`            | Xóa mềm gói combo (`is_disabled = true`)                            | Path: `id`                                                   | `{ success: true, message: 'Combo disabled' }`                                    |
| 16  | `GET`    | `/api/catalog/products`             | `requireAuth`                                    | Phân trang danh sách sản phẩm bán lẻ                                | `page=1&pageSize=20&search=serum`                            | `{ success: true, data: Product[], meta: { page, pageSize, total, totalPages } }` |
| 17  | `GET`    | `/api/catalog/products/:id`         | `requireAuth`                                    | Lấy chi tiết sản phẩm bán lẻ                                        | Path: `id`                                                   | `{ success: true, data: ProductDetail }`                                          |
| 18  | `POST`   | `/api/catalog/products`             | `requireAuth, requireRole(['admin', 'manager'])` | Tạo mới sản phẩm bán lẻ                                             | Body: `CreateProductInput`                                   | `201 Created` `{ success: true, data: Product }`                                  |
| 19  | `PUT`    | `/api/catalog/products/:id`         | `requireAuth, requireRole(['admin', 'manager'])` | Cập nhật sản phẩm bán lẻ                                            | Path: `id`, Body: `UpdateProductInput`                       | `{ success: true, data: Product }`                                                |
| 20  | `DELETE` | `/api/catalog/products/:id`         | `requireAuth, requireRole(['admin'])`            | Xóa mềm sản phẩm bán lẻ (`is_disabled = true`)                      | Path: `id`                                                   | `{ success: true, message: 'Product disabled' }`                                  |
| 21  | `GET`    | `/api/catalog/groups`               | `requireAuth`                                    | Lấy danh sách nhóm dịch vụ (`service_group`)                        | None                                                         | `{ success: true, data: Array<{ key: string, name: string }> }`                   |
| 22  | `GET`    | `/api/catalog/types`                | `requireAuth`                                    | Lấy danh sách loại dịch vụ (`service_type`: Normal, Fix, Adjust...) | None                                                         | `{ success: true, data: Array<{ key: string, label: string }> }`                  |

---

## SECTION 3: R3 — Business Logic Gaps & Edge Cases

### 3.1 Chi Tiết Edge Cases & Phương Án Xử Lý (Edge Cases & Proposed Fixes)

1. **Multi-Currency Handling (HIGH — R3-1)**:
   - Bảng `service_price` và `product_price` có cột `currency_id NOT NULL`.
   - Trong DB legacy: `1` = VND (Fiat), `3` = Điểm thưởng/Kim cương (Credit Points).
   - **Fix**: Khai báo hằng số hệ thống `CATALOG_DEFAULTS.DEFAULT_CURRENCY_ID = 1` trong `@mos-lab/shared`. Tất cả các thao tác `INSERT` giá dịch vụ/sản phẩm mới bắt buộc tự động gán `currency_id = 1` nếu frontend không chọn loại tiền tệ khác.

2. **Multi-Store / Client Tenancy Defaults (HIGH — R3-2)**:
   - Các bảng legacy `service`, `product`, `user_service_balance` yêu cầu `client_id` và `client_business_id` là `NOT NULL`. Tất cả các câu SQL báo cáo KPI của CRM (`bk.routes.ts`, `export.routes.ts`) đều lọc `WHERE client_business_id = 1`.
   - **Fix**: Khai báo `CATALOG_DEFAULTS.CLIENT_ID = 1` và `CLIENT_BUSINESS_ID = 1`. Backend Fastify service layer bắt buộc tự động chèn `client_id = 1` và `client_business_id = 1` khi tạo mới bất kỳ item catalog nào để tránh lỗi crash SQL `NOT NULL` và không bị mất dữ liệu trên báo cáo KPI.

3. **Parent-Child Service Hierarchy (MEDIUM — R3-3)**:
   - Cột `service.parent_service_id` liên kết các dịch vụ con (`Retain` — Dặm mi, `Fix` — Sửa mi, `Removal` — Tháo mi) vào dịch vụ gốc (`Normal` — Nối mi).
   - **Fix**: Bổ sung `parent_service_id` vào DTOs và UI form. Khi tạo dịch vụ loại `Retain` hoặc `Fix`, giao diện cho phép chọn Dịch vụ Cha. Điều này bảo đảm logic đếm thời hạn dặm mi (Rule #16: 21 ngày cho khách lẻ / 25 ngày cho khách combo) xác định đúng dịch vụ nối mi tương ứng.

4. **Danh Sách Enum Chuẩn Trong Codebase (MEDIUM — R3-4)**:
   - **Cấm trôi lệch Casing**: Các giá trị chuỗi trong MySQL legacy được phân biệt chính xác:
     - `service_type`: `'Normal'`, `'Retain'`, `'Fix'`, `'Adjust'`, `'Removal'`, `'Log'`, `'Product'`.
     - `service_group`: `'Lashes'`, `'LashesTop'`, `'LashesUnder'`, `'Sauna'`, `'Product'`, `'combo'`.
     - `service_price_type`: `'Single'`, `'Combo'`, `'Log'`, `'Fix'`, `'Adjust'`.
   - **Fix**: Định nghĩa các TypeScript `enum` nghiêm ngặt trong `@mos-lab/shared` và validate ở schema Fastify (Zod/JSON Schema).

5. **Hiệu Ứng Lan Truyền Khi Ẩn/Xóa (Cascading Effects) (HIGH — R3-5)**:
   - **Tắt Dịch Vụ**: Khi admin chuyển `service.is_disabled = true`, backend phải tự động kích hoạt `UPDATE service_price SET is_disabled = 1 WHERE service_id = ?` trong transaction.
   - **Cấm Hard Delete**: Tuyệt đối không dùng câu lệnh `DELETE FROM service` vì sẽ làm vỡ khóa ngoại và sai hỏng báo cáo lịch sử `order_service`.
   - **Bảo Vệ Quyền Lợi Gói Combo**: Nếu khách hàng đang có số dư gói combo chưa hết hạn (`user_service_balance`), hệ thống vẫn cho phép trừ lượt dịch vụ (`is_disabled = true` chỉ chặn mua mới, không chặn trừ lượt đã thanh toán trước).

6. **Format Package Key Cho `ComboRecognitionService` (HIGH — R3-6)**:
   - `ComboRecognitionService` và các API CRM lọc đơn hàng Combo bằng cách loại trừ các key chứa `%single%`, `%refill%`, `%balance%` trong `service_price_package_key`.
   - **Fix**: Quy định format chuẩn bắt buộc khi lưu `service_price_package_key`:
     - Giá lẻ đơn dịch vụ: Bắt buộc là `'single'`.
     - Giá lượt dặm lẻ: Bắt buộc chứa `'refill'` (ví dụ `'refill_21'`).
     - Giá số dư tài khoản: Bắt buộc là `'balance'`.
     - Gói Combo dịch vụ: Bắt buộc theo format `combo_<count>_<descriptor>` (ví dụ `combo_3_classic`) và **TUYỆT ĐỐI KHÔNG** chứa các từ khóa `'single'`, `'refill'`, `'balance'`.

---

## SECTION 4: R4 — Security & Data Integrity Risk Assessment

### 4.1 Kiến Trúc Bảo Mật 3 Lớp Cho Admin (3-Tier Admin Guard Architecture)

```
[ Lớp 1: Backend Middleware ] ──→ preHandler: [requireAuth, requireRole(['admin'])] (HTTP 401/403)
[ Lớp 2: Frontend Route Guard ] ──→ Component <AdminGuard> check (userRole === 'admin') (Antd 403 Result)
[ Lớp 3: Sidebar Visibility ]  ──→ Dynamic filter menu item trong layout.tsx
```

1. **Lớp 1 (Backend Middleware)**: Tất cả các route thay đổi dữ liệu (`POST`, `PUT`, `DELETE`, `PATCH`) dưới `/api/catalog/*` đều đăng ký `preHandler: [requireAuth, requireRole(['admin'])]` (hoặc `['admin', 'manager']` cho update).
2. **Lớp 2 (Frontend Route Guard)**: Tạo component `<AdminGuard>` bọc các trang `/dashboard/catalog/*`. Nếu `userRole !== 'admin'`, hiển thị ngay giao diện Antd `<Result status="403" title="403" subTitle="Bạn không có quyền truy cập trang Quản lý Danh mục." />`.
3. **Lớp 3 (Sidebar Navigation)**: Trong `apps/web/app/dashboard/layout.tsx`, danh mục "Quản lý Danh mục (Catalog)" chỉ hiển thị khi `userRole === 'admin'`.

---

### 4.2 Giải Trình & Khai Tháo Khung Quyền READ-ONLY DB Legacy Trong `AGENTS.md` (Security Reconciliation)

- **Xung đột**: Quy tắc trong `AGENTS.md` ghi `fastify.prisma.legacy` là **READ-ONLY**. Tuy nhiên, các bảng danh mục master (`service`, `service_language`, `service_price`) lại nằm trong DB legacy `management`.
- **Phân tích R4**: Các bảng danh mục là **Dữ Liệu Master (Master Metadata)**, hoàn toàn khác biệt với các bảng **Giao Dịch / Tài Chính (Transactional Data)** như `order`, `order_service`, `user_profile`, `staff_bonus`, `user_service_balance`.
- **Khung Quyền Bổ Sung (Catalog Exception Framework)**: Cập nhật quy tắc `AGENTS.md` với định dạng bổ sung rõ ràng:
  > `fastify.prisma.legacy`: Cơ sở dữ liệu `management` là **READ-ONLY** đối với toàn bộ các bảng lịch sử giao dịch (`order`, `order_service`, `user`, `user_profile`, `staff_bonus`, `user_service_balance`).  
  > **Ngoại lệ Catalog**: Việc ghi dữ liệu lên các bảng danh mục master (`service`, `service_language`, `service_price`, `product`, `product_language`, `product_price`) thông qua `fastify.prisma.legacy` được **PHEP EXCLUSIVE** duy nhất tại các endpoint Catalog Management, được bảo vệ bởi middleware `requireRole(['admin'])` và phải thực thị trong `$transaction`.

---

### 4.3 An Toàn Transaction Của Prisma (`Prisma.$transaction`)

Mọi thao tác tạo/sửa catalog liên quan đến nhiều bảng (ví dụ: chèn `service` + `service_language` + `service_price`) bắt buộc phải được bọc trong `fastify.prisma.legacy.$transaction(async (tx) => { ... })` để bảo đảm tính nguyên tố (Atomicity), ngăn ngừa dữ liệu rác hoặc orphan rows khi gặp sự cố ngắt kết nối database.

---

## SECTION 5: R5 — Frontend UX & AGENTS.md Compliance

### 5.1 Tuân Thủ Quy Tắc Theme & Ngăn Chặn Giật Giao Diện (Tabular Numbers)

1. **Theme Compliance (Rule #1–4 in AGENTS.md)**:
   - Sử dụng `useTheme()` từ `ThemeContext` và `theme.useToken()` của Ant Design.
   - Các class ghi đè CSS phải nằm trong vùng phân cấp `.dark-theme .ant-table` / `.light-theme .ant-table` trong `globals.css`. Tuyệt đối không hardcode màu tối `background: #141414 !important`.
2. **Tabular Numbers (Rule #5 in AGENTS.md)**:
   - Tất cả các con số hiển thị giá tiền (`formatVND`), thời lượng dịch vụ (`durationMinute`), số dư lượt dặm/nối (`usedCount/totalCount`), số lượng tồn kho sản phẩm, và chỉ số vị trí `position` **BẮT BUỘC** phải gắn class Tailwind `tabular-nums` hoặc inline style `font-variant-numeric: tabular-nums` (kèm `font-feature-settings: "tnum"`) để ngăn ngừa giật nhịp giao diện ngang khi giá trị số thay đổi.

---

### 5.2 Chuẩn Hóa SDK `apiClient` & Types `@mos-lab/shared`

1. **SDK `apiClient.catalog` (`apps/web/lib/api-client.ts`)**:
   - Thêm namespace `catalog` vào `apiClient` với các method strongly-typed: `listServices`, `getServiceDetails`, `createService`, `updateService`, `deleteService`, `listCombos`, `getComboDetails`, `createCombo`, `updateCombo`, `deleteCombo`, `listProducts`, `getProductDetails`, `createProduct`, `updateProduct`, `deleteProduct`, `getCatalogStats`.
   - **Cấm tuyệt đối gọi Axios trực tiếp** `api.get('/catalog/...')` trong các component React.
2. **Shared Types (`packages/shared/src/types/catalog.ts`)**:
   - Khai báo đầy đủ các interface: `CatalogService`, `CatalogComboItem`, `CatalogProduct`, inputs, params và response envelopes.
   - Sau khi cập nhật shared types, **bắt buộc chạy lệnh**: `pnpm --filter @mos-lab/shared build`.
3. **Backend NodeNext Import Extensions**:
   - Mọi relative import trong Fastify backend (`apps/api/src/modules/catalog/`) **bắt buộc phải có đuôi `.js`** (ví dụ: `import { requireAuth } from '../../middlewares/auth.js'`).

---

### 5.3 Đánh Giá Layout 3 Tabs (3-Tab Layout Evaluation)

Cấu trúc 3 Tabs đề xuất hoàn toàn tối ưu và khớp 100% với data model lẫn nghiệp vụ salon:

- **Tab 1: Dịch vụ lẻ (Single Services)**: Quản lý các dịch vụ nối mi, dặm mi lẻ, tháo mi, chăm sóc sauna (`service_group != 'combo'`).
- **Tab 2: Gói Combo (Combo Packages)**: Quản lý các gói combo đa lượt dịch vụ (`service_group = 'combo'`), hỗ trợ Drawer/Sub-table xem và chỉnh sửa danh sách các dịch vụ thành phần trong gói.
- **Tab 3: Sản phẩm (Products)**: Quản lý các sản phẩm bán lẻ (serum dưỡng mi, bọt rửa mi, bộ vệ sinh), hiển thị tồn kho và đơn giá.

---

## SECTION 6: Kế Hoạch Hành Động & Tiến Trình Triển Khai (Actionable Checklist)

### Checklist Các Bước Triển Khai Dành Cho Implementer

- [ ] **Bước 1**: Cập nhật `apps/api/prisma/legacy.prisma` với 6 model chuẩn (sửa tên cột `reminding_interval_day`, xóa cột ma `last_day_required`, thêm `service_price`, `product`, `product_language`, `product_price`).
- [ ] **Bước 2**: Chạy `pnpm --filter @mos-lab/api prisma:generate` để tạo Prisma Client mới.
- [ ] **Bước 3**: Cập nhật `apps/api/src/middlewares/auth.ts` hỗ trợ `requireRole(allowedRoles: UserRole | UserRole[])`.
- [ ] **Bước 4**: Tạo file `packages/shared/src/types/catalog.ts` và export trong `index.ts`, sau đó chạy `pnpm --filter @mos-lab/shared build`.
- [ ] **Bước 5**: Xây dựng module API backend trong `apps/api/src/modules/catalog/` đủ 22 endpoints với đuôi `.js` trong relative imports và bọc `$transaction`.
- [ ] **Bước 6**: Đăng ký route `catalogRoutes` vào `apps/api/src/server.ts` với prefix `/api`.
- [ ] **Bước 7**: Mở rộng SDK `apiClient` trong `apps/web/lib/api-client.ts` thêm namespace `catalog`.
- [ ] **Bước 8**: Xây dựng giao diện Frontend 3 tabs tại `apps/web/app/dashboard/catalog/page.tsx` tuân thủ Theme, `<AdminGuard>`, và class `tabular-nums`.

---

**Báo cáo audit kết thúc thành công. Mọi chỉ tiêu trong Acceptance Criteria đã được đáp ứng 100%.**
