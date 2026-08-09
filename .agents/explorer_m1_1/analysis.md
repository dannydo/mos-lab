# M1 Analysis Report: Shared Types for CV Speed Model

**Author**: explorer_m1_1  
**Date**: 2026-08-08  
**Target File**: `packages/shared/src/types/cv-speed.ts`  
**Package Barrel**: `packages/shared/src/index.ts`

---

## Executive Summary

This report defines the complete, strongly-typed TypeScript interface definitions required for **M1 (Shared Types for CV Speed Model)** of the **CV Lash Extension Speed Model** feature.

The types designed herein provide the Single Source of Truth contract between the Fastify backend (`apps/api`), Prisma ORM models, API client SDK, and Next.js CRM frontend (`apps/web`).

---

## 1. Context & Existing Type Ecosystem

In `@mos-lab/shared`:

- Existing CV types are located at `packages/shared/src/types/cv.ts` (e.g., `CvXoayRecord`, `CvTipLeaderboardEntry`, `CvStaffRealtimeStatus`, `LashEtaEstimate`).
- Catalog & Benchmark types are located at `packages/shared/src/types/catalog.ts` (e.g., `LASH_STYLES`, `LashStyle`, `LashTypeBenchmark`, `LashEtaEstimate`).
- All shared types are re-exported in `packages/shared/src/index.ts` using `NodeNext` ESM syntax (`export * from './types/<module>.js';`).

To maintain clean modular separation while following system conventions, all new CV Speed Model types will be placed in a dedicated file: `packages/shared/src/types/cv-speed.ts`.

---

## 2. Proposed TypeScript Definitions (`packages/shared/src/types/cv-speed.ts`)

Below is the exact TypeScript code to be implemented in `packages/shared/src/types/cv-speed.ts`:

```typescript
// ══════════════════════════════════════════════════════════════════════════════
// CV Lash Extension Speed Model Shared Types
// Verified against R1-R5 Requirements & CRM Database Schema
// ══════════════════════════════════════════════════════════════════════════════

// ─── Enums & Literals ─────────────────────────────────────────────────────────

/**
 * Service modes for lash extensions:
 * - 'normal_clean': Customer has NO prior lash extensions (new set)
 * - 'normal_removal': Customer HAS prior lash extensions (requires lash removal before new set)
 * - 'retain': Refill / touch-up service
 */
export const LASH_SERVICE_MODES = ['normal_clean', 'normal_removal', 'retain'] as const;
export type LashServiceMode = (typeof LASH_SERVICE_MODES)[number];

/**
 * Speed rating classification vs global benchmark:
 * - 'fast': Green (predicted time < -10% vs benchmark)
 * - 'normal': Yellow (-10% to +10% vs benchmark)
 * - 'slow': Red (predicted time > +10% vs benchmark)
 */
export const SPEED_RATINGS = ['fast', 'normal', 'slow'] as const;
export type SpeedRating = (typeof SPEED_RATINGS)[number];

/**
 * Self-correcting estimation layer used by logarithmic model:
 * - Layer 1: Direct Data (≥5 data points for exact style, mode, and lash count)
 * - Layer 2: Regression Interpolation (≥3 data points across count range, log curve fitted)
 * - Layer 3: Global Benchmark Fallback (<3 data points, global benchmark adjusted by CV ratio)
 */
export type ModelLayer = 1 | 2 | 3;

/**
 * Model prediction confidence level:
 * - 'high': Layer 1 or Layer 2 with high sample size and R² ≥ 0.7
 * - 'medium': Layer 2 with moderate R² (0.5 - 0.7)
 * - 'low': Layer 3 fallback or low sample size
 */
export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

/** Standard lash counts used for prediction matrix and benchmarking */
export const STANDARD_LASH_COUNTS = [30, 60, 70, 80, 90, 100, 120, 140] as const;
export type StandardLashCount = (typeof STANDARD_LASH_COUNTS)[number];

// ─── Core CV Speed Profile Interface ─────────────────────────────────────────

/**
 * Matches database entity `crm_cv_speed_profile` and single profile DTO
 */
export interface CvSpeedProfile {
  id?: number;
  staffId: number;
  staffName?: string;
  avatar?: string | null;
  lashStyle: string; // e.g. 'Classic', 'Mink', 'Volume 3D', 'Ultralight'
  serviceMode: LashServiceMode;
  lashCount: number;

  // Predicted phase durations (in minutes)
  cleaningMinutes: number;
  extensionMinutes: number;
  prepQcMinutes: number;
  totalMinutes: number;

  // Logarithmic Model Metadata
  modelLayer: ModelLayer;
  sampleSize: number;
  confidence: ConfidenceLevel;
  regA?: number | null; // Logarithmic regression intercept: a
  regB?: number | null; // Logarithmic regression slope: b (time = a + b * ln(count))
  regRSquared?: number | null; // Coefficient of determination (R²)

  // Comparison to Global Benchmark
  benchmarkTotalMinutes?: number | null;
  speedDeltaPercent?: number | null; // (predicted - benchmark) / benchmark * 100
  speedRating: SpeedRating;

  // Safety & Audit Flags
  monotonicWarning?: boolean; // True if non-monotonic regression forced Layer 3 fallback
  updatedAt?: string;
  createdAt?: string;
}

// ─── Section 1: Overview Speed Matrix Types ──────────────────────────────────

/**
 * Single cell in the overview Speed Matrix table (Section 1)
 */
export interface CvSpeedMatrixCell {
  lashStyle: string;
  serviceMode: LashServiceMode;
  lashCount: number;
  totalMinutes: number;
  cleaningMinutes: number;
  extensionMinutes: number;
  prepQcMinutes: number;
  speedRating: SpeedRating;
  speedDeltaPercent: number | null;
  benchmarkMinutes: number | null;
  modelLayer: ModelLayer;
  sampleSize: number;
  confidence: ConfidenceLevel;
  monotonicWarning?: boolean;
}

/**
 * Row representing one active CV in the Speed Matrix table
 */
export interface CvSpeedMatrixRow {
  staffId: number;
  staffName: string;
  avatar?: string | null;
  storeName?: string;
  seniorityMonths?: number;
  rollingWindowMonths: number; // 3 months (junior), 4 months (mid), 6 months (senior)
  /** Key format: `${lashStyle}_${serviceMode}_${lashCount}` */
  cellMap: Record<string, CvSpeedMatrixCell>;
  profiles: CvSpeedProfile[];
}

/**
 * Column definition header for the overview Speed Matrix table
 */
export interface CvSpeedMatrixColumn {
  lashStyle: string;
  serviceMode: LashServiceMode;
  lashCount: number;
  benchmarkMinutes: number;
}

/**
 * Response for GET /api/kpi/cv-speed/matrix
 */
export interface CvSpeedMatrix {
  columns: CvSpeedMatrixColumn[];
  rows: CvSpeedMatrixRow[];
  summary: {
    totalActiveCvs: number;
    fastCvCount: number;
    normalCvCount: number;
    slowCvCount: number;
  };
}

// ─── Section 2: Ranking Table Types ──────────────────────────────────────────

/**
 * Entry item for CV Speed Ranking table (Section 2)
 */
export interface CvSpeedRankingEntry {
  rank: number;
  staffId: number;
  staffName: string;
  avatar?: string | null;
  storeName?: string;
  predictedTime: number; // total predicted minutes
  cleaningMinutes: number;
  extensionMinutes: number;
  prepQcMinutes: number;
  sampleSize: number;
  confidence: ConfidenceLevel;
  modelLayer: ModelLayer;
  speedRating: SpeedRating;
  speedDeltaPercent: number | null;
  benchmarkMinutes: number;
  trendIndicator: 'improving' | 'declining' | 'stable';
}

/**
 * Response for GET /api/kpi/cv-speed/ranking
 */
export interface CvSpeedRanking {
  lashStyle: string;
  serviceMode: LashServiceMode;
  lashCount: number;
  benchmarkMinutes: number;
  rankings: CvSpeedRankingEntry[];
  total: number;
}

// ─── Section 3: CV Detail Modal Types ────────────────────────────────────────

/** Phase breakdown aggregated by lash style for a single CV */
export interface CvSpeedPhaseBreakdown {
  lashStyle: string;
  serviceMode: LashServiceMode;
  lashCount: number;
  avgCleaningMinutes: number;
  avgExtensionMinutes: number;
  avgPrepQcMinutes: number;
  avgTotalMinutes: number;
  caseCount: number;
}

/** Recent order case timeline breakdown for a single CV */
export interface CvSpeedRecentCase {
  orderId: number;
  orderServiceId: number;
  clientName: string;
  serviceName: string;
  lashStyle: string;
  serviceMode: LashServiceMode;
  lashCount: number | null;
  checkinDate: string; // YYYY-MM-DD HH:mm:ss
  cleaningMinutes: number;
  extensionMinutes: number;
  prepQcMinutes: number;
  totalMinutes: number;
  benchmarkMinutes?: number | null;
  speedRating?: SpeedRating;
}

/**
 * Response for GET /api/kpi/cv-speed/detail/:staffId
 */
export interface CvSpeedDetail {
  staffId: number;
  staffName: string;
  avatar?: string | null;
  storeName?: string;
  seniorityMonths: number;
  rollingWindowMonths: number;
  totalCases: number;
  avgSpeedVsBenchmarkPercent: number; // Negative = faster than benchmark (e.g. -12.5%)
  overallSpeedScore: number; // Score out of 100
  overallSpeedRating: SpeedRating;
  phaseBreakdowns: CvSpeedPhaseBreakdown[];
  recentCases: CvSpeedRecentCase[];
  monthlyTrends: CvSpeedTrendPoint[];
}

// ─── Section 3: Monthly Speed Trend Types ────────────────────────────────────

/** Single data point in monthly speed trend chart */
export interface CvSpeedTrendPoint {
  month: string; // YYYY-MM (e.g., '2026-03')
  staffAvgMinutes: number;
  benchmarkAvgMinutes: number;
  caseCount: number;
  speedDeltaPercent: number;
  speedRating: SpeedRating;
}

/**
 * Response for GET /api/kpi/cv-speed/trend/:staffId
 */
export interface CvSpeedTrend {
  staffId: number;
  staffName: string;
  dataPoints: CvSpeedTrendPoint[];
  overallTrend: 'improving' | 'declining' | 'stable';
  overallDeltaPercent: number;
}

// ─── Section 4: Booking Predictor Types ──────────────────────────────────────

/** Request parameters for GET /api/kpi/cv-speed/predict */
export interface CvSpeedPredictionInput {
  staffId: number;
  lashStyle: string;
  serviceMode: LashServiceMode;
  lashCount: number;
}

/**
 * Response for GET /api/kpi/cv-speed/predict
 */
export interface CvSpeedPrediction {
  staffId: number;
  staffName: string;
  lashStyle: string;
  serviceMode: LashServiceMode;
  lashCount: number;
  predictedCleaningMinutes: number;
  predictedExtensionMinutes: number;
  predictedPrepQcMinutes: number;
  predictedTotalMinutes: number;
  modelLayer: ModelLayer;
  confidence: ConfidenceLevel;
  sampleSize: number;
  benchmarkTotalMinutes: number;
  speedDeltaPercent: number;
  speedRating: SpeedRating;
  monotonicWarning?: boolean;
  sourceDescription: string;
}

// ─── Seeding Operation Types ──────────────────────────────────────────────────

/**
 * Response for POST /api/kpi/cv-speed/seed
 */
export interface CvSpeedSeedResult {
  success: boolean;
  processedCvCount: number;
  totalProfilesGenerated: number;
  insertedProfiles: number;
  updatedProfiles: number;
  layerBreakdown: {
    layer1Count: number;
    layer2Count: number;
    layer3Count: number;
  };
  monotonicWarningsCount: number;
  durationMs: number;
  timestamp: string;
}

// ─── API Query Parameters ─────────────────────────────────────────────────────

/** Parameters for GET /api/kpi/cv-speed/profiles */
export interface CvSpeedProfilesParams {
  staffId?: number;
  lashStyle?: string;
  serviceMode?: LashServiceMode;
  lashCount?: number;
  speedRating?: SpeedRating;
  dateFrom?: string;
  dateTo?: string;
}

/** Parameters for GET /api/kpi/cv-speed/ranking */
export interface CvSpeedRankingParams {
  lashStyle: string;
  lashCount: number;
  serviceMode: LashServiceMode;
  dateFrom?: string;
  dateTo?: string;
}
```

---

## 3. Detailed Mapping to Requirements (R1-R5)

| Type Definition                                          | Requirement Mapping                         | Description / Role                                                                              |
| -------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `LashServiceMode`                                        | R1 (Service Mode: 3 types)                  | `'normal_clean'`, `'normal_removal'`, `'retain'`                                                |
| `SpeedRating`                                            | R2 (Speed Rating: 3 colors)                 | `'fast'` (<-10%), `'normal'` (-10% to +10%), `'slow'` (>+10%)                                   |
| `ModelLayer`                                             | R1 & R2 (3-Layer estimation)                | `1` (Direct), `2` (Regression), `3` (Benchmark Fallback)                                        |
| `ConfidenceLevel`                                        | R2 & R3 (Model metadata)                    | `'high'`, `'medium'`, `'low'`                                                                   |
| `CvSpeedProfile`                                         | R2 (`crm_cv_speed_profile` DB entity & API) | Complete single speed profile entry with phase times, regression coefficients, delta, and flags |
| `CvSpeedMatrixCell` / `Row` / `Column` / `CvSpeedMatrix` | R3 & R4 Section 1 (Overview Speed Matrix)   | Matrix format where rows=CVs, columns=styles×counts, cells=total minutes with speed rating      |
| `CvSpeedRankingEntry` / `CvSpeedRanking`                 | R3 & R4 Section 2 (Ranking Table)           | CVs ranked fastest to slowest with trend indicators                                             |
| `CvSpeedPhaseBreakdown` / `RecentCase` / `CvSpeedDetail` | R3 & R4 Section 3 (CV Detail Modal)         | CV summary metrics, per-style phase breakdown, recent cases timeline, and monthly trends        |
| `CvSpeedTrendPoint` / `CvSpeedTrend`                     | R3 & R4 Section 3 (Monthly Trend)           | Monthly progress tracking showing CV average speed vs benchmark                                 |
| `CvSpeedPredictionInput` / `CvSpeedPrediction`           | R3 & R4 Section 4 (Booking Predictor)       | Single ETA prediction for booking form with confidence & layer source                           |
| `CvSpeedSeedResult`                                      | R2 & R3 (`POST /api/kpi/cv-speed/seed`)     | Audit summary of nightly seeding operation                                                      |
| `CvSpeedProfilesParams` / `RankingParams`                | R3 (API Route Query Parameters)             | Typed request query filters for Fastify route handlers                                          |

---

## 4. Export Configuration in Barrel Files

### 4.1 Export in `packages/shared/src/index.ts`

In `packages/shared/src/index.ts`, add the export line using NodeNext ESM extension (`.js`):

```typescript
export * from './types/cv-speed.js';
```

### 4.2 Handling `packages/shared/src/types/index.ts`

Currently, `packages/shared/src/types/` does NOT contain an `index.ts` file; all type modules are directly exported from `packages/shared/src/index.ts`.

However, if `packages/shared/src/types/index.ts` is created as a submodule barrel in the future, it should contain:

```typescript
export * from './cv-speed.js';
```

---

## 5. Verification & Build Steps

After implementing `packages/shared/src/types/cv-speed.ts` and updating `packages/shared/src/index.ts`:

1. Build the shared package:
   ```bash
   pnpm --filter @mos-lab/shared build
   ```
2. Verify typescript compilation completes without errors (`dist/` directory populated with `.d.ts` and `.js` files).
3. Import `@mos-lab/shared` types in `apps/api` and `apps/web` to confirm auto-completion and type inference work seamlessly.
