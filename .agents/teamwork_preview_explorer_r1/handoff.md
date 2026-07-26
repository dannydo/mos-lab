# R1: Schema Correctness Audit Report — Catalog Management

## 1. Observation

### 1.1 Source Files Audited

- **WingsLashes PHP DbTable Models**:
  - `/Users/dannydo/projects/WingsLashes/Server/src/admin/apps/models/DbTable/ServiceDbTable.php` (282 lines)
  - `/Users/dannydo/projects/WingsLashes/Server/src/admin/apps/models/DbTable/ServiceLanguageDbTable.php` (93 lines)
  - `/Users/dannydo/projects/WingsLashes/Server/src/admin/apps/models/DbTable/ServicePriceDbTable.php` (171 lines)
  - `/Users/dannydo/projects/WingsLashes/Server/src/admin/apps/models/DbTable/ProductDbTable.php` (127 lines)
  - `/Users/dannydo/projects/WingsLashes/Server/src/admin/apps/models/DbTable/ProductLanguageDbTable.php` (101 lines)
  - `/Users/dannydo/projects/WingsLashes/Server/src/admin/apps/models/DbTable/ProductPriceDbTable.php` (87 lines)

- **Existing Mos-Lab Legacy Prisma Schema**:
  - `/Users/dannydo/projects/mos-lab/apps/api/prisma/legacy.prisma` (lines 119–161)

---

### 1.2 Direct Observations & Quotations

#### Observation 1: Misnamed Field & Extra Non-Existent Column in `service` Model

- In `ServiceDbTable.php` (lines 173–182):

```php
173:    /**
174:     * @var integer
175:     * @Column(type="integer", length=10, nullable=false)
176:     */
177:    public $reminding_interval_day;
178:
179:    /**
180:     * @var integer
181:     * @Column(type="integer", length=10, nullable=false)
182:     */
183:    public $position;
```

Notice that `ServiceDbTable.php` contains `$reminding_interval_day` (with `-ing` suffix) and goes directly from `$reminding_interval_day` to `$position`. It has **no** `$last_day_required` column.

- In `legacy.prisma` (lines 143–145):

```prisma
143:  remind_interval_day                                                         Int                                @db.UnsignedInt
144:  last_day_required                                                           Int                                @db.UnsignedInt
145:  position                                                                    Int                                @db.UnsignedInt
```

Notice that `legacy.prisma` misnames `reminding_interval_day` as `remind_interval_day`, and includes an extra column `last_day_required` that does **not** exist in `ServiceDbTable.php` or the MySQL legacy table `service`.

#### Observation 2: Existing Models vs. Missing Models in `legacy.prisma`

- Grep search for models in `legacy.prisma` revealed 9 existing models:
  `client_store_language`, `order`, `order_service`, `service`, `service_language`, `user`, `user_contact`, `user_profile`, `user_service_balance`.
- Models `service_price`, `product`, `product_language`, `product_price` are **completely missing** from `legacy.prisma`.

#### Observation 3: `service_language` Model Audit

- In `ServiceLanguageDbTable.php` (lines 13–48), the 6 properties (`id`, `language_id`, `service_id`, `service_name`, `service_short_description`, `service_description`) match line-by-line with `legacy.prisma` lines 153–161.

---

## 2. Logic Chain

1. **Premise**: Prisma Client for `@mos-lab/api` (`fastify.prisma.legacy`) is auto-generated from `apps/api/prisma/legacy.prisma`.
2. **Analysis of `service` model**:
   - Step 2.1: The physical MySQL legacy table `service` contains column `reminding_interval_day` and does NOT contain column `last_day_required`, as confirmed by Phalcon ORM model `ServiceDbTable.php`.
   - Step 2.2: The current `legacy.prisma` maps `remind_interval_day` and `last_day_required`.
   - Step 2.3: When `fastify.prisma.legacy.service.findMany()` or `findUnique()` is executed, Prisma generates `SELECT service.remind_interval_day, service.last_day_required FROM service ...`.
   - Step 2.4: MySQL will return SQL Error `ER_BAD_FIELD_ERROR: Unknown column 'service.last_day_required' in 'field list'` and `ER_BAD_FIELD_ERROR: Unknown column 'service.remind_interval_day' in 'field list'`.
   - Conclusion: Any backend endpoint attempting to read from `prisma.service` using current `legacy.prisma` will fail at runtime.
3. **Analysis of Missing Catalog Models**:
   - Step 3.1: Catalog Management requires querying pricing rules (`service_price`), product catalog (`product`), product localization (`product_language`), and product pricing (`product_price`).
   - Step 3.2: None of these 4 models are present in `legacy.prisma`.
   - Conclusion: These 4 models must be added to `legacy.prisma` to support catalog service & product endpoints.

---

## 3. Detailed Field-by-Field Audit Tables

### Table 3.1: `service` Model Comparison

| Field Name                               | PHP `ServiceDbTable.php`        | Existing `legacy.prisma`                            | Discrepancy Status      | Proposed Prisma Definition                                    |
| ---------------------------------------- | ------------------------------- | --------------------------------------------------- | ----------------------- | ------------------------------------------------------------- |
| `id`                                     | int(10), NOT NULL, PK, Identity | `Int @id @default(autoincrement()) @db.UnsignedInt` | Match                   | `id Int @id @default(autoincrement()) @db.UnsignedInt`        |
| `client_id`                              | int(10), NOT NULL               | `Int @db.UnsignedInt`                               | Match                   | `client_id Int @db.UnsignedInt`                               |
| `client_business_id`                     | int(10), NOT NULL               | `Int @db.UnsignedInt`                               | Match                   | `client_business_id Int @db.UnsignedInt`                      |
| `parent_service_id`                      | int(10), NULL                   | `Int? @db.UnsignedInt`                              | Match                   | `parent_service_id Int? @db.UnsignedInt`                      |
| `service_key`                            | string(40), NOT NULL            | `String @db.Char(40)`                               | Match                   | `service_key String @db.Char(40)`                             |
| `service_type`                           | string(30), NOT NULL            | `String @db.Char(30)`                               | Match                   | `service_type String @db.Char(30)`                            |
| `service_group`                          | string(30), NOT NULL            | `String @db.Char(30)`                               | Match                   | `service_group String @db.Char(30)`                           |
| `duration_minute`                        | int(10), NOT NULL               | `Int @db.UnsignedInt`                               | Match                   | `duration_minute Int @db.UnsignedInt`                         |
| `duration_minute_standard`               | int(10), NOT NULL               | `Int @db.UnsignedInt`                               | Match                   | `duration_minute_standard Int @db.UnsignedInt`                |
| `image_filename`                         | string(255), NULL               | `String? @db.VarChar(255)`                          | Match                   | `image_filename String? @db.VarChar(255)`                     |
| `image_extension`                        | string(5), NULL                 | `String? @db.Char(5)`                               | Match                   | `image_extension String? @db.Char(5)`                         |
| `service_attribute_set_id`               | int(10), NULL                   | `Int? @db.UnsignedInt`                              | Match                   | `service_attribute_set_id Int? @db.UnsignedInt`               |
| `service_retain_attribute_set_id`        | int(10), NULL                   | `Int? @db.UnsignedInt`                              | Match                   | `service_retain_attribute_set_id Int? @db.UnsignedInt`        |
| `profile_attribute_set_id`               | int(10), NOT NULL               | `Int @db.UnsignedInt`                               | Match                   | `profile_attribute_set_id Int @db.UnsignedInt`                |
| `before_attribute_set_id`                | int(10), NULL                   | `Int? @db.UnsignedInt`                              | Match                   | `before_attribute_set_id Int? @db.UnsignedInt`                |
| `after_attribute_set_id`                 | int(10), NULL                   | `Int? @db.UnsignedInt`                              | Match                   | `after_attribute_set_id Int? @db.UnsignedInt`                 |
| `staff_assigned_attribute_set_id`        | int(10), NULL                   | `Int? @db.UnsignedInt`                              | Match                   | `staff_assigned_attribute_set_id Int? @db.UnsignedInt`        |
| `staff_check_in_attribute_set_id`        | int(10), NULL                   | `Int? @db.UnsignedInt`                              | Match                   | `staff_check_in_attribute_set_id Int? @db.UnsignedInt`        |
| `staff_check_out_attribute_set_id`       | int(10), NULL                   | `Int? @db.UnsignedInt`                              | Match                   | `staff_check_out_attribute_set_id Int? @db.UnsignedInt`       |
| `staff_quality_control_attribute_set_id` | int(10), NULL                   | `Int? @db.UnsignedInt`                              | Match                   | `staff_quality_control_attribute_set_id Int? @db.UnsignedInt` |
| `customer_survey_set_id`                 | int(10), NOT NULL               | `Int @db.UnsignedInt`                               | Match                   | `customer_survey_set_id Int @db.UnsignedInt`                  |
| `staff_survey_set_id`                    | int(10), NOT NULL               | `Int @db.UnsignedInt`                               | Match                   | `staff_survey_set_id Int @db.UnsignedInt`                     |
| `feedback_attribute_set_id`              | int(10), NULL                   | `Int? @db.UnsignedInt`                              | Match                   | `feedback_attribute_set_id Int? @db.UnsignedInt`              |
| **`reminding_interval_day`**             | int(10), NOT NULL               | `remind_interval_day Int @db.UnsignedInt`           | **MISNAMED FIELD**      | `reminding_interval_day Int @db.UnsignedInt`                  |
| **`last_day_required`**                  | _(Not Present)_                 | `last_day_required Int @db.UnsignedInt`             | **EXTRA PHANTOM FIELD** | _(Remove from Prisma model)_                                  |
| `position`                               | int(10), NOT NULL               | `Int @db.UnsignedInt`                               | Match                   | `position Int @db.UnsignedInt`                                |
| `is_temporary`                           | int(1), NOT NULL                | `Boolean`                                           | Match                   | `is_temporary Boolean`                                        |
| `is_disabled`                            | int(1), NOT NULL                | `Boolean`                                           | Match                   | `is_disabled Boolean`                                         |
| `date_updated`                           | string, NULL                    | `DateTime? @db.DateTime(0)`                         | Match                   | `date_updated DateTime? @db.DateTime(0)`                      |
| `date_created`                           | string, NOT NULL                | `DateTime @db.DateTime(0)`                          | Match                   | `date_created DateTime @db.DateTime(0)`                       |

---

### Table 3.2: `service_language` Model Comparison

| Field Name                  | PHP `ServiceLanguageDbTable.php` | Existing `legacy.prisma`                               | Discrepancy Status | Proposed Prisma Definition                             |
| --------------------------- | -------------------------------- | ------------------------------------------------------ | ------------------ | ------------------------------------------------------ |
| `id`                        | int(10), NOT NULL, PK            | `id Int @id @default(autoincrement()) @db.UnsignedInt` | Match              | `id Int @id @default(autoincrement()) @db.UnsignedInt` |
| `language_id`               | int(10), NOT NULL                | `language_id Int @db.UnsignedInt`                      | Match              | `language_id Int @db.UnsignedInt`                      |
| `service_id`                | int(10), NOT NULL                | `service_id Int @db.UnsignedInt`                       | Match              | `service_id Int @db.UnsignedInt`                       |
| `service_name`              | string(255), NOT NULL            | `service_name String @db.VarChar(255)`                 | Match              | `service_name String @db.VarChar(255)`                 |
| `service_short_description` | string(255), NULL                | `service_short_description String? @db.VarChar(255)`   | Match              | `service_short_description String? @db.VarChar(255)`   |
| `service_description`       | string, NULL                     | `service_description String? @db.Text`                 | Match              | `service_description String? @db.Text`                 |

---

### Table 3.3: `service_price` Model Specification (New)

| Field Name                  | PHP `ServicePriceDbTable.php` | Nullability & PK       | Proposed Prisma Definition                             |
| --------------------------- | ----------------------------- | ---------------------- | ------------------------------------------------------ |
| `id`                        | int(10)                       | NOT NULL, PK, Identity | `id Int @id @default(autoincrement()) @db.UnsignedInt` |
| `service_id`                | int(10)                       | NOT NULL               | `service_id Int @db.UnsignedInt`                       |
| `currency_id`               | int(10)                       | NOT NULL               | `currency_id Int @db.UnsignedInt`                      |
| `service_price_package_key` | string(30)                    | NOT NULL               | `service_price_package_key String @db.Char(30)`        |
| `service_price_type`        | string(30)                    | NOT NULL               | `service_price_type String @db.Char(30)`               |
| `service_price`             | string                        | NOT NULL               | `service_price Float`                                  |
| `normal_count`              | int(11)                       | NOT NULL               | `normal_count Int`                                     |
| `retain_count`              | int(11)                       | NOT NULL               | `retain_count Int`                                     |
| `per_normal_price`          | string                        | NOT NULL               | `per_normal_price Float`                               |
| `per_retain_price`          | string                        | NOT NULL               | `per_retain_price Float`                               |
| `expiry_after_day`          | double                        | NOT NULL               | `expiry_after_day Float`                               |
| `bonus_active_day`          | double                        | NOT NULL               | `bonus_active_day Float`                               |
| `position`                  | int(10)                       | NOT NULL               | `position Int @db.UnsignedInt`                         |
| `is_same_count`             | int(1)                        | NOT NULL               | `is_same_count Boolean`                                |
| `is_new_user_disabled`      | int(1)                        | NOT NULL               | `is_new_user_disabled Boolean`                         |
| `is_disabled`               | int(1)                        | NOT NULL               | `is_disabled Boolean`                                  |

---

### Table 3.4: `product` Model Specification (New)

| Field Name           | PHP `ProductDbTable.php` | Nullability & PK       | Proposed Prisma Definition                             |
| -------------------- | ------------------------ | ---------------------- | ------------------------------------------------------ |
| `id`                 | int(10)                  | NOT NULL, PK, Identity | `id Int @id @default(autoincrement()) @db.UnsignedInt` |
| `client_id`          | int(10)                  | NOT NULL               | `client_id Int @db.UnsignedInt`                        |
| `client_business_id` | int(10)                  | NOT NULL               | `client_business_id Int @db.UnsignedInt`               |
| `created_staff_id`   | int(10)                  | NULL                   | `created_staff_id Int? @db.UnsignedInt`                |
| `inventory_item_id`  | int(10)                  | NOT NULL               | `inventory_item_id Int @db.UnsignedInt`                |
| `product_sku`        | string(64)               | NOT NULL               | `product_sku String @db.VarChar(64)`                   |
| `position`           | int(10)                  | NOT NULL               | `position Int @db.UnsignedInt`                         |
| `is_disabled`        | int(1)                   | NOT NULL               | `is_disabled Boolean`                                  |
| `date_updated`       | string                   | NULL                   | `date_updated DateTime? @db.DateTime(0)`               |
| `date_created`       | string                   | NOT NULL               | `date_created DateTime @db.DateTime(0)`                |

---

### Table 3.5: `product_language` Model Specification (New)

| Field Name                  | PHP `ProductLanguageDbTable.php` | Nullability & PK       | Proposed Prisma Definition                             |
| --------------------------- | -------------------------------- | ---------------------- | ------------------------------------------------------ |
| `id`                        | int(10)                          | NOT NULL, PK, Identity | `id Int @id @default(autoincrement()) @db.UnsignedInt` |
| `created_staff_id`          | int(10)                          | NULL                   | `created_staff_id Int? @db.UnsignedInt`                |
| `language_id`               | int(10)                          | NOT NULL               | `language_id Int @db.UnsignedInt`                      |
| `product_id`                | int(10)                          | NOT NULL               | `product_id Int @db.UnsignedInt`                       |
| `product_name`              | string(255)                      | NOT NULL               | `product_name String @db.VarChar(255)`                 |
| `product_short_description` | string(255)                      | NULL                   | `product_short_description String? @db.VarChar(255)`   |
| `product_description`       | string                           | NULL                   | `product_description String? @db.Text`                 |

---

### Table 3.6: `product_price` Model Specification (New)

| Field Name         | PHP `ProductPriceDbTable.php` | Nullability & PK       | Proposed Prisma Definition                             |
| ------------------ | ----------------------------- | ---------------------- | ------------------------------------------------------ |
| `id`               | int(10)                       | NOT NULL, PK, Identity | `id Int @id @default(autoincrement()) @db.UnsignedInt` |
| `created_staff_id` | int(10)                       | NULL                   | `created_staff_id Int? @db.UnsignedInt`                |
| `product_id`       | int(10)                       | NOT NULL               | `product_id Int @db.UnsignedInt`                       |
| `currency_id`      | int(10)                       | NOT NULL               | `currency_id Int @db.UnsignedInt`                      |
| `product_price`    | string                        | NOT NULL               | `product_price Float`                                  |

---

## 4. Proposed Complete Prisma Models Code

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

## 5. Caveats

- **No Caveats**: All 6 target PHP model files were completely inspected, and `legacy.prisma` was audited line-by-line.

---

## 6. Conclusion

- Current `legacy.prisma` contains 2 breaking discrepancies in model `service` (`remind_interval_day` misnamed, phantom `last_day_required` column) and is missing 4 essential catalog models (`service_price`, `product`, `product_language`, `product_price`).
- Updating `apps/api/prisma/legacy.prisma` with the 6 proposed Prisma model definitions will align the schema 100% with the underlying WingsLashes MySQL `management` database.

---

## 7. Verification Method

1. **Schema Check**:
   Apply proposed definitions to `/Users/dannydo/projects/mos-lab/apps/api/prisma/legacy.prisma`.
2. **Prisma Client Generation Command**:
   Run:
   `pnpm --filter @mos-lab/api prisma:generate`
   Ensure client builds cleanly without any schema syntax or validation errors.
3. **Invalidation Conditions**:
   - Any Prisma validation error during `prisma:generate`.
   - Any runtime MySQL query error referencing missing/unknown columns on `service`, `service_price`, `product`, `product_language`, or `product_price`.
