# Analysis & Execution Specification for Milestone M1 (Worker_M1)

## Executive Summary

This document provides a complete, unified execution specification for **Worker_M1** to execute the schema and shared types update for the **CV Lash Extension Speed Model** (Milestone M1).

The goal of M1 is to establish strong TypeScript types in `@mos-lab/shared` and add the `crm_cv_speed_profile` model to `apps/api/prisma/crm.prisma`, generating the updated Prisma client so downstream backend API endpoints (M2) and frontend components (M3/M4) can build against strongly typed interfaces.

---

## 1. Workspace Build Script Verification

Inspection of workspace configuration files confirmed the following build scripts and execution requirements:

| Package           | File Path                      | Script Name       | Command                                                                                       | Notes / Execution Rule                                                                                                                                                                  |
| ----------------- | ------------------------------ | ----------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@mos-lab/shared` | `packages/shared/package.json` | `build`           | `tsc`                                                                                         | Run via `pnpm --filter @mos-lab/shared build`. **Must use `BypassSandbox: true`** when executing commands in local shell environment to prevent pnpm cache permission errors (`EPERM`). |
| `@mos-lab/api`    | `apps/api/package.json`        | `prisma:generate` | `prisma generate --schema=prisma/legacy.prisma && prisma generate --schema=prisma/crm.prisma` | Run via `pnpm --filter @mos-lab/api prisma:generate`. **Must use `BypassSandbox: true`**.                                                                                               |
| `@mos-lab/api`    | `apps/api/package.json`        | `build`           | `pnpm prisma:generate && tsc && pnpm postbuild`                                               | Run via `pnpm --filter @mos-lab/api build`. Generates clients, compiles TypeScript, and copies `src/generated` to `dist/generated`. **Must use `BypassSandbox: true`**.                 |

---

## 2. Component Inspection & Current State Assessment

1. **`packages/shared/src/types/cv-speed.ts`**:
   - **Status**: Already created. Contains all 113 lines of required interfaces (`CvSpeedProfile`, `CvSpeedMatrixCell`, `CvSpeedMatrixRow`, `CvSpeedMatrix`, `CvSpeedRanking`, `CvSpeedDetail`, `CvSpeedPrediction`, `CvSpeedSeedResult`, `LashServiceMode`, `SpeedRating`, `ModelLayer`, `ConfidenceLevel`).
   - **Worker Task**: Verify content against specification.

2. **`packages/shared/src/types/index.ts`**:
   - **Status**: Already exports `export * from './cv-speed.js';` on line 14.
   - **Worker Task**: Verify presence.

3. **`packages/shared/src/index.ts`**:
   - **Status**: Main barrel export file. Currently exports types individually but lacks `export * from './types/cv-speed.js';`.
   - **Worker Task**: Add `export * from './types/cv-speed.js';` to `packages/shared/src/index.ts`.

4. **`apps/api/prisma/crm.prisma`**:
   - **Status**: Currently has 740 lines. Model `crm_cv_speed_profile` is missing.
   - **Worker Task**: Append `model CrmCvSpeedProfile` definition to the end of `crm.prisma`.

---

## 3. Step-by-Step Execution Checklist for Worker_M1

Worker_M1 must perform the following actions in exact sequential order:

### Step 1: Verify & Finalize `packages/shared/src/types/cv-speed.ts`

- **Action**: Ensure `/Users/dannydo/projects/mos-lab/packages/shared/src/types/cv-speed.ts` exists with exact exports:

```typescript
export type LashServiceMode = 'normal_clean' | 'normal_removal' | 'retain';
export type SpeedRating = 'fast' | 'normal' | 'slow';
export type ModelLayer = 1 | 2 | 3;
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface CvSpeedProfile {
  staffId: number;
  staffName?: string | null;
  lashStyle: string;
  serviceMode: LashServiceMode | string;
  lashCount: number;
  cleaningMinutes: number;
  extensionMinutes: number;
  prepQcMinutes: number;
  totalMinutes: number;
  modelLayer: ModelLayer;
  sampleSize: number;
  confidence: ConfidenceLevel;
  regA?: number | null;
  regB?: number | null;
  regRSquared?: number | null;
  benchmarkTotalMinutes?: number | null;
  speedDeltaPercent?: number | null;
  speedRating: SpeedRating;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CvSpeedMatrixCell {
  totalMinutes: number;
  speedRating: SpeedRating;
  modelLayer: ModelLayer;
  sampleSize: number;
  confidence: ConfidenceLevel;
}

export interface CvSpeedMatrixRow {
  staffId: number;
  staffName: string;
  profiles: Record<string, CvSpeedMatrixCell>;
}

export interface CvSpeedMatrix {
  data: CvSpeedMatrixRow[];
  lashStyles: string[];
  lashCounts: number[];
}

export interface CvSpeedRanking {
  rank: number;
  staffId: number;
  staffName: string;
  predictedTime: number;
  sampleSize: number;
  confidence: ConfidenceLevel;
  speedRating: SpeedRating;
  trend: 'improving' | 'declining' | 'stable';
}

export interface CvSpeedDetail {
  staffId: number;
  staffName: string;
  totalCases: number;
  avgSpeedVsBenchmarkPercent: number;
  overallScore: number;
  phaseBreakdown: {
    cleaning: number;
    extension: number;
    prepQc: number;
  };
  recentCases: Array<{
    orderId: number;
    date: string;
    lashStyle: string;
    serviceMode: LashServiceMode;
    lashCount: number;
    cleaningMinutes: number;
    extensionMinutes: number;
    prepQcMinutes: number;
    totalMinutes: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    avgTotalMinutes: number;
    benchmarkMinutes: number;
  }>;
}

export interface CvSpeedPrediction {
  staffId: number;
  lashStyle: string;
  serviceMode: LashServiceMode;
  lashCount: number;
  predictedMinutes: {
    cleaning: number;
    extension: number;
    prepQc: number;
    total: number;
  };
  modelLayer: ModelLayer;
  sampleSize: number;
  confidence: ConfidenceLevel;
  speedRating: SpeedRating;
  benchmarkMinutes: number;
}

export interface CvSpeedSeedResult {
  success: boolean;
  profilesProcessed: number;
  cvsCount: number;
  timestamp: string;
}
```

### Step 2: Update Barrel Exports (`packages/shared/src/index.ts` & `types/index.ts`)

- **File 1**: `packages/shared/src/types/index.ts`
  - Ensure line `export * from './cv-speed.js';` is present.
- **File 2**: `packages/shared/src/index.ts`
  - Append `export * from './types/cv-speed.js';` to ensure direct access via `@mos-lab/shared`. Note the required `.js` extension per NodeNext TypeScript rules!

### Step 3: Build Shared Package

- **Command**:
  ```bash
  pnpm --filter @mos-lab/shared build
  ```
- **Rule**: Execute with `BypassSandbox: true`.
- **Verification**: Check that `packages/shared/dist/index.d.ts` and `packages/shared/dist/types/cv-speed.d.ts` are generated without errors.

### Step 4: Update Prisma Schema (`apps/api/prisma/crm.prisma`)

- **File**: `apps/api/prisma/crm.prisma`
- **Action**: Append the model `CrmCvSpeedProfile` at line 741:

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

  @@unique([staffId, lashStyle, serviceMode, lashCount], name: "staff_style_mode_count")
  @@index([staffId])
  @@index([lashStyle])
  @@map("crm_cv_speed_profile")
}
```

### Step 5: Execute Prisma Client Generation

- **Command**:
  ```bash
  pnpm --filter @mos-lab/api prisma:generate
  ```
- **Rule**: Execute with `BypassSandbox: true`.
- **Verification**: Output must confirm generation of `src/generated/crm-client`.

### Step 6: Verify API Build

- **Command**:
  ```bash
  pnpm --filter @mos-lab/api build
  ```
- **Rule**: Execute with `BypassSandbox: true`.
- **Verification**: Confirms that TypeScript compiles cleanly across `@mos-lab/api` with the new Prisma model and shared types.

---

## 4. Evidence & Verification Methodology

1. **Shared Build Verification**:
   - `pnpm --filter @mos-lab/shared build` exits code 0.
   - Test import in node / ts: `import { CvSpeedProfile } from '@mos-lab/shared';` resolves cleanly.

2. **Prisma Client Verification**:
   - `pnpm --filter @mos-lab/api prisma:generate` exits code 0.
   - Generated client in `apps/api/src/generated/crm-client/index.d.ts` contains `CrmCvSpeedProfile` delegate methods (`findMany`, `upsert`, `create`, `deleteMany`).

3. **Backend Compilation Verification**:
   - `pnpm --filter @mos-lab/api build` exits code 0.
