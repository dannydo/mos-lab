# Handoff Report — Explorer M3_3

## 1. Observation

- File `apps/api/src/modules/kpi/routes/cv-speed.routes.ts` exists and implements all 7 requested API endpoints (`/profiles`, `/matrix`, `/ranking`, `/trend/:staffId`, `/detail/:staffId`, `/predict`, `/seed`).
- **Discovered Bug 1**: On line 182 of `cv-speed.routes.ts`, the route path is defined as `fastify.get('/api/kpi/cv-speed/ranking', ...)`. Since `server.ts` mounts `kpiRoutes` under prefix `/api`, this creates a double `/api` prefix resulting in 404 when querying `/api/kpi/cv-speed/ranking`.
- **Discovered Bug 2**: On line 527 of `cv-speed.routes.ts`, calling `legacyPrisma.$queryRawUnsafe<...>` when `legacyPrisma` is typed as `SafeAny` causes TypeScript error `TS2347: Untyped function calls may not accept type arguments.` during `pnpm --filter @mos-lab/api build`.
- File `apps/api/src/modules/kpi/routes.ts` imports `registerCvSpeedRoutes` from `./routes/cv-speed.routes.js` at line 10 and registers it at line 217 (`await registerCvSpeedRoutes(fastify);`).
- File `apps/api/src/server.ts` registers `kpiRoutes` under prefix `/api` at line 180 (`await server.register(kpiRoutes, { prefix: '/api' });`).
- All relative imports in `cv-speed.routes.ts` comply with NodeNext `.js` extension rules (e.g. `import { predictCvSpeed, detectServiceMode, computeSpeedRating } from '../services/cv-speed-model.service.js';`).
- Types are imported from `@mos-lab/shared` (`CvSpeedProfile`, `CvSpeedMatrix`, `CvSpeedRanking`, `CvSpeedMonthlyTrend`, `CvSpeedDetail`, `CvSpeedPrediction`, `CvSpeedSeedResult`).

## 2. Logic Chain

1. `server.ts` registers `kpiRoutes` with `{ prefix: '/api' }`.
2. Inside `kpiRoutes` (`apps/api/src/modules/kpi/routes.ts`), `registerCvSpeedRoutes` is registered.
3. In `cv-speed.routes.ts`, endpoints registered as `/kpi/cv-speed/...` resolve to `/api/kpi/cv-speed/...`.
4. Endpoint `/api/kpi/cv-speed/ranking` on line 182 has an extra `/api` prefix in its local path string (`/api/kpi/cv-speed/ranking`). Combined with the parent prefix `/api`, Fastify mounts it at `/api/api/kpi/cv-speed/ranking`.
5. Therefore, Worker_M3 must edit line 182 in `cv-speed.routes.ts` to change `/api/kpi/cv-speed/ranking` to `/kpi/cv-speed/ranking`.
6. On line 527, `legacyPrisma` is typed `SafeAny` (`any`). Calling `$queryRawUnsafe<T>` on `any` produces TS2347 error. Worker_M3 must cast the return value as `(await legacyPrisma.$queryRawUnsafe(...)) as Array<{ avg_time: number }>`.
7. Once both fixes are applied, `pnpm --filter @mos-lab/api build` will compile cleanly with exit code 0, and all 7 endpoints will be cleanly accessible under `/api/kpi/cv-speed/...`.

## 3. Caveats

- Database seeding (`POST /api/kpi/cv-speed/seed` or auto-seed on `/profiles` when table is empty) requires access to a running MySQL instance with both `mos_lab` CRM DB and `management` legacy DB schema populated.
- Authentication pre-handler `requireAuth` requires a valid JWT Bearer token when running `curl` verification against a live Fastify server.

## 4. Conclusion

The API route implementation in `apps/api/src/modules/kpi/routes/cv-speed.routes.ts` is fully structured and properly wired, requiring 2 specific code fixes (line 182 route path fix + line 527 TS2347 type cast fix). The step-by-step implementation plan in `analysis.md` provides clear guidance and verification commands for Worker_M3.

## 5. Verification Method

1. **Fix verification**:
   - Inspect line 182 in `apps/api/src/modules/kpi/routes/cv-speed.routes.ts` to ensure path is `/kpi/cv-speed/ranking`.
   - Inspect line 527 in `apps/api/src/modules/kpi/routes/cv-speed.routes.ts` to ensure `$queryRawUnsafe` has no generic type parameter and uses post-call casting `as Array<{ avg_time: number }>`.
2. **Build verification**:
   ```bash
   pnpm --filter @mos-lab/api build
   ```
3. **Endpoint verification**: Start backend API server (`pnpm dev` or `pnpm --filter @mos-lab/api dev`) and test all 7 endpoints:
   - `GET /api/kpi/cv-speed/profiles`
   - `GET /api/kpi/cv-speed/matrix`
   - `GET /api/kpi/cv-speed/ranking`
   - `GET /api/kpi/cv-speed/trend/:staffId`
   - `GET /api/kpi/cv-speed/detail/:staffId`
   - `GET /api/kpi/cv-speed/predict`
   - `POST /api/kpi/cv-speed/seed`
