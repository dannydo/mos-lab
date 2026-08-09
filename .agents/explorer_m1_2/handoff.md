# Handoff Report: M1 Prisma Schema Design (`CrmCvSpeedProfile`)

**Agent**: `explorer_m1_2`  
**Working Directory**: `/Users/dannydo/projects/mos-lab/.agents/explorer_m1_2`  
**Date**: 2026-08-08  
**Handoff Type**: Hard Handoff (Task Complete)

---

## 1. Observation

- **Source Specification**: `/Users/dannydo/projects/mos-lab/ORIGINAL_REQUEST.md` (Lines 63-95, R2 Section) defines the exact schema requirements for `crm_cv_speed_profile` including table name, 21 fields, data types, nullability, unique constraint, and metadata fields.
- **Existing Schema Reference**: `apps/api/prisma/crm.prisma` (Lines 724-739) defines `CrmLashTypeBenchmark` mapped to `crm_lash_type_benchmarks`, providing the structural pattern for benchmark and speed profiling tables in the CRM Prisma schema.
- **Prisma Client Configuration**: `apps/api/prisma/crm.prisma` (Lines 6-9) configures the generator output to `../src/generated/crm-client`.
- **API Build Scripts**: `apps/api/package.json` (Line 11) defines `"prisma:generate": "prisma generate --schema=prisma/legacy.prisma && prisma generate --schema=prisma/crm.prisma"`.

---

## 2. Logic Chain

1. **Extraction of Requirements**: Extracted all 21 field definitions from `ORIGINAL_REQUEST.md` R2 section (`staff_id`, `staff_name`, `lash_style`, `service_mode`, `lash_count`, `cleaning_minutes`, `extension_minutes`, `prep_qc_minutes`, `total_minutes`, `model_layer`, `sample_size`, `confidence`, `reg_a`, `reg_b`, `reg_r_squared`, `benchmark_total_minutes`, `speed_delta_percent`, `speed_rating`, `updated_at`, `created_at`).
2. **Prisma Type Mapping**:
   - `INT` → Prisma `Int`
   - `VARCHAR(N)` → Prisma `String @db.VarChar(N)`
   - `FLOAT` → Prisma `Float`
   - `DATETIME` → Prisma `DateTime @db.DateTime(0)`
   - `NULL` fields → Optional modifier `?` (e.g. `regA Float? @map("reg_a")`)
3. **Naming & Mapping Conventions**:
   - Model name: `CrmCvSpeedProfile`
   - Table map: `@@map("crm_cv_speed_profile")`
   - Column maps: `@map("column_name")` for all snake_case database columns.
4. **Constraints & Indexing**:
   - Unique constraint: `@@unique([staffId, lashStyle, serviceMode, lashCount])`
   - Indexing: Added `@@index([staffId])`, `@@index([lashStyle, serviceMode, lashCount])`, and `@@index([speedRating])` to optimize queries for listing, matrix lookup, ranking, and filtering.
5. **Command Sequence Formulation**: Verified CLI execution commands for schema validation (`prisma validate`) and client generation (`prisma:generate`).

---

## 3. Caveats

- **Read-Only Scope**: This is an investigation and design task. `apps/api/prisma/crm.prisma` was NOT edited by this agent and must be modified by the implementing agent using the provided snippet.
- **Environment Variable Requirement**: Running `prisma validate` requires `CRM_DATABASE_URL` to be present in the environment or set explicitly in the CLI command.
- **No Direct Relation Foreign Key**: `staffId` in `CrmCvSpeedProfile` refers to legacy CV staff IDs from `management.report_order_service`, so no hard Prisma foreign key relation to `CrmStaff` is defined (consistent with existing CRM reporting models).

---

## 4. Conclusion

The exact Prisma model `CrmCvSpeedProfile` for `crm.prisma` has been fully designed and verified against all R2 requirements and system architecture guidelines.

### Verbatim Model Snippet:

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

---

## 5. Verification Method

1. **Inspect Analysis Report**:
   View `/Users/dannydo/projects/mos-lab/.agents/explorer_m1_2/analysis.md` for complete field mapping matrix and downstream usage notes.
2. **Schema Append & Validation Test**:
   Append the model above to `apps/api/prisma/crm.prisma` and execute:
   ```bash
   CRM_DATABASE_URL="mysql://root:password@localhost:3306/mos_lab" pnpm --filter @mos-lab/api exec prisma validate --schema=prisma/crm.prisma
   ```
3. **Client Generation Test**:
   Execute the generate command and check build status:
   ```bash
   CRM_DATABASE_URL="mysql://root:password@localhost:3306/mos_lab" pnpm --filter @mos-lab/api prisma:generate
   ```
