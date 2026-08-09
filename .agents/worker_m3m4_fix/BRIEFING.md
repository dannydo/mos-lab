# BRIEFING — 2026-08-08T09:05:00+07:00

## Mission

Remediate math, service mode, phase breakdown sum invariants, active CV staff export function, and API routes in CV Speed Model & Routes for M3-M4.

## 🔒 My Identity

- Archetype: worker_m3m4_fix
- Roles: implementer, qa
- Working directory: /Users/dannydo/projects/mos-lab/.agents/worker_m3m4_fix
- Original parent: df3ef5bf-7493-4e72-b987-ed361bd02374
- Milestone: M3-M4 CV Speed Model Fixes

## 🔒 Key Constraints

- Fix Layer Threshold Inversion: Layer 1 check (`exactCases.length >= 3`), Layer 2 check (`parsedCases.length >= 5 && logFit.isMonotonic && logFit.rSquared >= 0.5`).
- Fix Phase Breakdown Sum Invariant ($T_{total} = T_{cleaning} + T_{extension} + T_{prep\_qc}$):
  - Layer 1: `medianTotal = Math.round(sortedTotal[Math.floor(sortedTotal.length / 2)])`, `predClean = Math.max(5, Math.round(medianTotal * avgCleanRatio))`, `predPrep = Math.max(5, Math.round(medianTotal * avgPrepRatio))`, `predExt = medianTotal - predClean - predPrep`.
  - Layer 2: `predClean = Math.max(5, Math.round(predTotal * (avgCleanRatio || 0.15)))`, `predPrep = Math.max(5, Math.round(predTotal * (avgPrepRatio || 0.10)))`, `predExt = predTotal - predClean - predPrep`.
  - Ensure $T_{cleaning} + T_{extension} + T_{prep\_qc} = T_{total}$ strictly holds.
- Fix Service Mode `normal_removal`: Update historical case classification in `predictCvSpeed` to distinguish `normal_clean` vs `normal_removal`. `normal_removal` adds removal time (~10-15 mins) over `normal_clean`.
- Define and export `getActiveCvStaffList(crmPrisma, legacyPrisma)` returning `Promise<Array<{ id: number; name: string }>>`.

## Current Parent

- Conversation ID: df3ef5bf-7493-4e72-b987-ed361bd02374
- Updated: 2026-08-08T09:05:00+07:00

## Change Tracker

- **Files modified**: TBD
- **Build status**: Pending
- **Pending issues**: None

## Quality Status

- **Build/test result**: Pending
- **Lint status**: Pending
- **Tests added/modified**: Pending
