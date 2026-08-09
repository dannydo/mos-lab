# Prisma Schema Analysis for M1: `crm_cv_speed_profile`

**Agent ID**: `explorer_m1_2`  
**Date**: 2026-08-08  
**Target Schema File**: `apps/api/prisma/crm.prisma`

---

## 1. Executive Summary

This document provides a comprehensive design and analysis for adding the `CrmCvSpeedProfile` model (`crm_cv_speed_profile` table) to `apps/api/prisma/crm.prisma`.

The model supports milestone **M1 (CV Lash Extension Speed Model)** of the `mos-lab` CRM system. It stores calculated non-linear (logarithmic) speed profiles per CV (technician) across various lash styles, service modes (`normal_clean`, `normal_removal`, `retain`), and standard lash counts (30, 60, 70, 80, 90, 100, 120, 140).

---

## 2. Requirements & Existing Schema Inspection

### 2.1 Specification Requirements (from `ORIGINAL_REQUEST.md` R2)

The database schema specification defines the following columns:

```sql
crm_cv_speed_profile:
  id                      INT PK AUTO_INCREMENT
  staff_id                INT NOT NULL          -- CV staff ID from legacy
  staff_name              VARCHAR(100)          -- Cached display name
  lash_style              VARCHAR(50) NOT NULL  -- 'Classic', 'Mink', 'Volume 3D', etc.
  service_mode            VARCHAR(20) NOT NULL  -- 'normal_clean', 'normal_removal', 'retain'
  lash_count              INT NOT NULL          -- Target lash count (60, 70, 80, 90, 100, 120, 140)
  cleaning_minutes        FLOAT NOT NULL
  extension_minutes       FLOAT NOT NULL
  prep_qc_minutes         FLOAT NOT NULL
  total_minutes           FLOAT NOT NULL
  model_layer             INT NOT NULL          -- 1=direct, 2=regression, 3=benchmark fallback
  sample_size             INT NOT NULL          -- Number of data points used
  confidence              VARCHAR(10) NOT NULL  -- 'high', 'medium', 'low'
  reg_a                   FLOAT NULL            -- Regression intercept (if layer 2)
  reg_b                   FLOAT NULL            -- Regression log-rate (if layer 2)
  reg_r_squared           FLOAT NULL            -- Regression fit quality (if layer 2)
  benchmark_total_minutes FLOAT NULL            -- Global P50 benchmark for comparison
  speed_delta_percent     FLOAT NULL            -- (predicted - benchmark) / benchmark × 100
  speed_rating            VARCHAR(10) NOT NULL  -- 'fast' (green), 'normal' (yellow), 'slow' (red)
  updated_at              DATETIME NOT NULL
  created_at              DATETIME NOT NULL
  UNIQUE(staff_id, lash_style, service_mode, lash_count)
```

### 2.2 Inspection of Existing Models in `crm.prisma`

Inspecting `apps/api/prisma/crm.prisma` (specifically models like `CrmLashTypeBenchmark` around lines 724-739 and `CrmStaff` around lines 11-48):

1. **Naming Conventions**:
   - Model name: PascalCase with `Crm` prefix (`CrmCvSpeedProfile`).
   - Field names: camelCase (`staffId`, `lashStyle`, `totalMinutes`).
   - Database table name: snake_case via `@@map("crm_cv_speed_profile")`.
   - Database column names: snake_case via `@map("...")`.

2. **Column Types & Modifiers**:
   - Floating point fields (`FLOAT`): Prisma type `Float` (e.g. `baseSalary Float? @map("base_salary")`).
   - Integer fields (`INT`): Prisma type `Int`.
   - Variable characters (`VARCHAR(N)`): Prisma type `String` with `@db.VarChar(N)`.
   - Nullable fields (`NULL`): Prisma type with trailing `?` (e.g. `regA Float? @map("reg_a")`).
   - Timestamps: `@db.DateTime(0)` with defaults `@default(now())` and `@updatedAt`.

3. **Constraints and Indexing**:
   - Primary key: `id Int @id @default(autoincrement())`.
   - Unique constraint: `@@unique([staffId, lashStyle, serviceMode, lashCount])`.
   - Table map: `@@map("crm_cv_speed_profile")`.

---

## 3. Detailed Model Design (`CrmCvSpeedProfile`)

Below is the complete Prisma model snippet to be appended to `apps/api/prisma/crm.prisma`:

```prisma
model CrmCvSpeedProfile {
  id                    Int      @id @default(autoincrement())
  staffId               Int      @map("staff_id")
  staffName             String?  @map("staff_name") @db.VarChar(100)
  lashStyle             String   @map("lash_style") @db.VarChar(50)
  serviceMode           String   @map("service_mode") @db.VarChar(20)
  lashCount             Int      @map("lash_count")
  cleaningMinutes       Float    @map("cleaning_minutes")
  extensionMinutes      Float    @map("extension_minutes")
  prepQcMinutes         Float    @map("prep_qc_minutes")
  totalMinutes          Float    @map("total_minutes")
  modelLayer            Int      @map("model_layer")
  sampleSize            Int      @map("sample_size")
  confidence            String   @map("confidence") @db.VarChar(10)
  regA                  Float?   @map("reg_a")
  regB                  Float?   @map("reg_b")
  regRSquared           Float?   @map("reg_r_squared")
  benchmarkTotalMinutes Float?   @map("benchmark_total_minutes")
  speedDeltaPercent     Float?   @map("speed_delta_percent")
  speedRating           String   @map("speed_rating") @db.VarChar(10)
  updatedAt             DateTime @default(now()) @updatedAt @map("updated_at") @db.DateTime(0)
  createdAt             DateTime @default(now()) @map("created_at") @db.DateTime(0)

  @@unique([staffId, lashStyle, serviceMode, lashCount])
  @@index([staffId])
  @@index([lashStyle, serviceMode, lashCount])
  @@index([speedRating])
  @@map("crm_cv_speed_profile")
}
```

### 3.1 Field-by-Field Mapping Matrix

| DB Column                 | Prisma Field            | Prisma Type | DB Type / Decorator                                             | Description                                  |
| ------------------------- | ----------------------- | ----------- | --------------------------------------------------------------- | -------------------------------------------- |
| `id`                      | `id`                    | `Int`       | `@id @default(autoincrement())`                                 | Primary key                                  |
| `staff_id`                | `staffId`               | `Int`       | `@map("staff_id")`                                              | Legacy CV staff ID                           |
| `staff_name`              | `staffName`             | `String?`   | `@map("staff_name") @db.VarChar(100)`                           | Cached display name of CV                    |
| `lash_style`              | `lashStyle`             | `String`    | `@map("lash_style") @db.VarChar(50)`                            | Lash style (Classic, Mink, Volume 3D, etc.)  |
| `service_mode`            | `serviceMode`           | `String`    | `@map("service_mode") @db.VarChar(20)`                          | `normal_clean`, `normal_removal`, `retain`   |
| `lash_count`              | `lashCount`             | `Int`       | `@map("lash_count")`                                            | Target lash count (30..140)                  |
| `cleaning_minutes`        | `cleaningMinutes`       | `Float`     | `@map("cleaning_minutes")`                                      | Predicted cleaning phase time                |
| `extension_minutes`       | `extensionMinutes`      | `Float`     | `@map("extension_minutes")`                                     | Predicted extension phase time               |
| `prep_qc_minutes`         | `prepQcMinutes`         | `Float`     | `@map("prep_qc_minutes")`                                       | Predicted setup & QC phase time              |
| `total_minutes`           | `totalMinutes`          | `Float`     | `@map("total_minutes")`                                         | Sum of predicted phase times                 |
| `model_layer`             | `modelLayer`            | `Int`       | `@map("model_layer")`                                           | 1=direct, 2=regression, 3=benchmark fallback |
| `sample_size`             | `sampleSize`            | `Int`       | `@map("sample_size")`                                           | Data point count                             |
| `confidence`              | `confidence`            | `String`    | `@map("confidence") @db.VarChar(10)`                            | 'high', 'medium', 'low'                      |
| `reg_a`                   | `regA`                  | `Float?`    | `@map("reg_a")`                                                 | Logarithmic regression intercept             |
| `reg_b`                   | `regB`                  | `Float?`    | `@map("reg_b")`                                                 | Logarithmic regression slope                 |
| `reg_r_squared`           | `regRSquared`           | `Float?`    | `@map("reg_r_squared")`                                         | Coefficient of determination (R²)            |
| `benchmark_total_minutes` | `benchmarkTotalMinutes` | `Float?`    | `@map("benchmark_total_minutes")`                               | Global P50 benchmark                         |
| `speed_delta_percent`     | `speedDeltaPercent`     | `Float?`    | `@map("speed_delta_percent")`                                   | Delta % vs global benchmark                  |
| `speed_rating`            | `speedRating`           | `String`    | `@map("speed_rating") @db.VarChar(10)`                          | 'fast', 'normal', 'slow'                     |
| `updated_at`              | `updatedAt`             | `DateTime`  | `@default(now()) @updatedAt @map("updated_at") @db.DateTime(0)` | Auto timestamp on update                     |
| `created_at`              | `createdAt`             | `DateTime`  | `@default(now()) @map("created_at") @db.DateTime(0)`            | Creation timestamp                           |

---

## 4. Validation and Client Generation Command Sequence

To apply and validate this schema model in the repository:

### Command 1: Validate Prisma Schema

Validate that `apps/api/prisma/crm.prisma` contains no syntax or type errors:

```bash
CRM_DATABASE_URL="mysql://root:password@localhost:3306/mos_lab" pnpm --filter @mos-lab/api exec prisma validate --schema=prisma/crm.prisma
```

### Command 2: Generate Prisma Client

Re-generate the TypeScript Prisma client for `crm.prisma` under `apps/api/src/generated/crm-client`:

```bash
CRM_DATABASE_URL="mysql://root:password@localhost:3306/mos_lab" pnpm --filter @mos-lab/api prisma:generate
```

### Command 3: Verify Client Export

Verify that `fastify.prisma.crm.crmCvSpeedProfile` is available in `apps/api/src/generated/crm-client`:

```bash
pnpm --filter @mos-lab/api build
```

---

## 5. Downstream Integration Guide

1. **Prisma Client Usage**:
   - Access via `fastify.prisma.crm.crmCvSpeedProfile`:
   - Upsert during nightly seed operation:
     ```ts
     await fastify.prisma.crm.crmCvSpeedProfile.upsert({
       where: {
         staffId_lashStyle_serviceMode_lashCount: {
           staffId,
           lashStyle,
           serviceMode,
           lashCount,
         },
       },
       update: { ...profileData },
       create: { ...profileData },
     });
     ```

2. **Shared Package Alignment**:
   - In `@mos-lab/shared/src/types/cv-speed.ts`, map database fields directly to the TypeScript interface `CvSpeedProfile`.
