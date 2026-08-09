# Investigation Analysis: CV Speed SDK Extension & Shared Types (M4)

## Executive Summary

This report presents the investigation and design for extending `apps/web/lib/api-client.ts` (`apiClient.kpi.cvSpeed`) and `packages/shared/src/types/cv-speed.ts` to support the CV Lash Extension Speed Model KPI Dashboard UI (Milestone 4).

---

## 1. Existing System Audit

### 1.1 `apps/web/lib/api-client.ts` Analysis

- **Imports (Lines 152–160)**:
  Currently imports: `CvSpeedProfile`, `CvSpeedMatrix`, `CvSpeedRanking`, `CvSpeedMonthlyTrend`, `CvSpeedTrend`, `CvSpeedDetail`, `CvSpeedPrediction`, `CvSpeedSeedResult`.
- **Existing `apiClient.kpi.cvSpeed` (Lines 796–825)**:
  Currently defines 7 basic methods (`getProfiles`, `getMatrix`, `getRanking`, `getTrend`, `getDetail`, `predict`, `seed`).
- **Deficiencies Identified**:
  1. **Missing Return Type Annotations**: Methods currently rely on implicit `Promise<any>` return inference instead of strongly-typed `Promise<CvSpeedProfile[]>`, `Promise<CvSpeedMatrix>`, etc.
  2. **Missing SDK Methods**:
     - `getSeedStatus` — calls `GET /api/kpi/cv-speed/seed/status`
     - `getStyles` — calls `GET /api/kpi/cv-speed/styles`
  3. **Incomplete Query Parameter Handling**:
     - `getTrend`: missing optional `params?: { lashStyle?: string; serviceMode?: string }` supported by backend route.
     - `getDetail`: missing optional `params?: { dateFrom?: string; dateTo?: string; limit?: string | number }` supported by backend route.
     - `predict`: missing optional parameters and flexible type inputs (`number | string`).
  4. **Missing Shared Types**:
     - `CvSpeedSeedStatus` and `CvSpeedStyles` are not yet defined in `packages/shared/src/types/cv-speed.ts`.

### 1.2 `apps/api/src/modules/kpi/routes/cv-speed.routes.ts` Endpoints Alignment

The backend exposes 9 distinct route handlers under `/kpi/cv-speed/*`:

1. `GET /api/kpi/cv-speed/profiles` (Query: `staffId`, `lashStyle`, `serviceMode`) → returns `CvSpeedProfile[]`
2. `GET /api/kpi/cv-speed/matrix` (Query: `serviceMode`) → returns `CvSpeedMatrix`
3. `GET /api/kpi/cv-speed/ranking` (Query: `lashStyle`, `lashCount`, `serviceMode`) → returns `CvSpeedRanking[]`
4. `GET /api/kpi/cv-speed/trend/:staffId` (Params: `staffId`, Query: `lashStyle`, `serviceMode`) → returns `CvSpeedMonthlyTrend[]`
5. `GET /api/kpi/cv-speed/detail/:staffId` (Params: `staffId`, Query: `dateFrom`, `dateTo`, `limit`) → returns `CvSpeedDetail`
6. `GET /api/kpi/cv-speed/predict` & `POST /api/kpi/cv-speed/predict` (Query/Body: `staffId`, `lashStyle`, `serviceMode`, `lashCount`) → returns `CvSpeedPrediction`
7. `POST /api/kpi/cv-speed/seed` → returns `CvSpeedSeedResult`
8. `GET /api/kpi/cv-speed/seed/status` → returns `CvSpeedSeedStatus`
9. `GET /api/kpi/cv-speed/styles` → returns `CvSpeedStyles`

---

## 2. Proposed Changes for `packages/shared/src/types/cv-speed.ts`

To ensure UI components compile cleanly and type checking succeeds without TS2305 missing export errors, the following additions are required in `packages/shared/src/types/cv-speed.ts`:

### 2.1 Missing Type Aliases & Interfaces to Add

```typescript
// Add type alias to ensure clean UI component imports
export type CvSpeedTrend = CvSpeedMonthlyTrend;

// Add seed status response interface
export interface CvSpeedSeedStatus {
  totalProfiles: number;
  activeStaffCount: number;
  lastUpdatedAt: string | null;
  isSeeded: boolean;
}

// Add styles & standards metadata interface
export interface CvSpeedStyles {
  lashStyles: string[];
  lashCounts: number[];
  serviceModes: LashServiceMode[] | string[];
  benchmarksCount: number;
}
```

---

## 3. Proposed Changes for `apps/web/lib/api-client.ts`

### 3.1 Type Imports to Update in `api-client.ts` (around Line 152)

```typescript
import {
  // ... existing imports ...
  CvSpeedProfile,
  CvSpeedMatrix,
  CvSpeedRanking,
  CvSpeedMonthlyTrend,
  CvSpeedTrend,
  CvSpeedDetail,
  CvSpeedPrediction,
  CvSpeedSeedResult,
  CvSpeedSeedStatus,
  CvSpeedStyles,
} from '@mos-lab/shared';
```

### 3.2 Complete `cvSpeed` SDK Namespace Method Design

Replace lines 796–825 in `apps/web/lib/api-client.ts` with:

```typescript
    cvSpeed: {
      getProfiles: async (params?: {
        staffId?: number | string;
        lashStyle?: string;
        serviceMode?: string;
        speedRating?: string;
      }): Promise<CvSpeedProfile[]> => {
        const response = await api.get('/kpi/cv-speed/profiles', { params });
        return response.data;
      },

      getMatrix: async (params?: {
        serviceMode?: string;
      }): Promise<CvSpeedMatrix> => {
        const response = await api.get('/kpi/cv-speed/matrix', { params });
        return response.data;
      },

      getRanking: async (params?: {
        lashStyle?: string;
        lashCount?: number | string;
        serviceMode?: string;
      }): Promise<CvSpeedRanking[]> => {
        const response = await api.get('/kpi/cv-speed/ranking', { params });
        return response.data;
      },

      getTrend: async (
        staffId: number | string,
        params?: { lashStyle?: string; serviceMode?: string }
      ): Promise<CvSpeedMonthlyTrend[]> => {
        const response = await api.get(`/kpi/cv-speed/trend/${staffId}`, { params });
        return response.data;
      },

      getDetail: async (
        staffId: number | string,
        params?: { dateFrom?: string; dateTo?: string; limit?: string | number }
      ): Promise<CvSpeedDetail> => {
        const response = await api.get(`/kpi/cv-speed/detail/${staffId}`, { params });
        return response.data;
      },

      predict: async (params: {
        staffId: number | string;
        lashStyle?: string;
        serviceMode?: string;
        lashCount?: number | string;
      }): Promise<CvSpeedPrediction> => {
        const response = await api.get('/kpi/cv-speed/predict', { params });
        return response.data;
      },

      seed: async (): Promise<CvSpeedSeedResult> => {
        const response = await api.post('/kpi/cv-speed/seed');
        return response.data;
      },

      getSeedStatus: async (): Promise<CvSpeedSeedStatus> => {
        const response = await api.get('/kpi/cv-speed/seed/status');
        return response.data;
      },

      getStyles: async (): Promise<CvSpeedStyles> => {
        const response = await api.get('/kpi/cv-speed/styles');
        return response.data;
      },
    },
```

---

## 4. Method Specification Summary

| Method          | Endpoint                        | HTTP | Parameters                                                      | Return Type                      |
| --------------- | ------------------------------- | ---- | --------------------------------------------------------------- | -------------------------------- |
| `getProfiles`   | `/kpi/cv-speed/profiles`        | GET  | `params?: { staffId?, lashStyle?, serviceMode?, speedRating? }` | `Promise<CvSpeedProfile[]>`      |
| `getMatrix`     | `/kpi/cv-speed/matrix`          | GET  | `params?: { serviceMode? }`                                     | `Promise<CvSpeedMatrix>`         |
| `getRanking`    | `/kpi/cv-speed/ranking`         | GET  | `params?: { lashStyle?, lashCount?, serviceMode? }`             | `Promise<CvSpeedRanking[]>`      |
| `getTrend`      | `/kpi/cv-speed/trend/:staffId`  | GET  | `staffId`, `params?: { lashStyle?, serviceMode? }`              | `Promise<CvSpeedMonthlyTrend[]>` |
| `getDetail`     | `/kpi/cv-speed/detail/:staffId` | GET  | `staffId`, `params?: { dateFrom?, dateTo?, limit? }`            | `Promise<CvSpeedDetail>`         |
| `predict`       | `/kpi/cv-speed/predict`         | GET  | `params: { staffId, lashStyle?, serviceMode?, lashCount? }`     | `Promise<CvSpeedPrediction>`     |
| `seed`          | `/kpi/cv-speed/seed`            | POST | none                                                            | `Promise<CvSpeedSeedResult>`     |
| `getSeedStatus` | `/kpi/cv-speed/seed/status`     | GET  | none                                                            | `Promise<CvSpeedSeedStatus>`     |
| `getStyles`     | `/kpi/cv-speed/styles`          | GET  | none                                                            | `Promise<CvSpeedStyles>`         |

---

## 5. Verification Commands for Implementer

```bash
# 1. Build shared package after updating types
pnpm --filter @mos-lab/shared build

# 2. Build web application after updating api-client.ts
pnpm --filter @mos-lab/web build
```
