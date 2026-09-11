# CC KPI daily projection — benchmark ledger

## Contract

- **Target:** interactive CC KPI p95 below 0.5s, with no change to the Completed-order, actual-check-in, CC IN/OUT 50/50, or daily-tier rules.
- **Owner:** mOS `CcKpiService`. Legacy transaction tables stay read-only.
- **Scope:** all-store Daily Sales read; store-specific requests deliberately remain canonical until separately materialized and proven.

## Production trace

| Source query         | Occurrences |   Total | Average |    Max | Rows examined | Finding                                    |
| -------------------- | ----------: | ------: | ------: | -----: | ------------: | ------------------------------------------ |
| Combo sales per CC   |          18 | 18.155s |  1.009s | 4.012s |         2.84M | Per-order staff fallback lookups.          |
| Visit metrics per CC |          27 | 48.441s |  1.794s | 3.105s |        15.41M | Grouping and filesort; primary bottleneck. |

## Orb benchmark

| Variant                                          |           Runs |    p50 |    p95 | Output parity               | Decision     |
| ------------------------------------------------ | -------------: | -----: | -----: | --------------------------- | ------------ |
| Canonical `getCcDailySalesBonus`, cache bypassed | 10 + 3 warmups | 1.648s | 1.702s | Baseline                    | Fails target |
| Daily projection direct read                     |             10 |    2ms |    4ms | Exact normalized hash match | Pass         |
| Guarded service read with feature flag           |             10 |      — |    8ms | Exact normalized hash match | Pass         |

**Improvement:** canonical p95 1.702s to guarded projection p95 8ms: 99.5% lower latency, about 213× faster. The direct storage read is 4ms p95, about 426× faster.

## Safety gates that passed on Orb

- Complete 30-day coverage required; any missing day returns `null` and the API uses canonical Legacy SQL.
- Active-CC configuration must match the projection; a changed list returns `null` and uses canonical SQL.
- Feature flag remains off by default. Migration and worker deployment do not switch user reads.
- Projection payload contains daily results after the canonical split and tier calculation; it does not rewrite business formulas.

## Production rollout gates

1. Deploy migration and code with `CC_KPI_DAILY_PROJECTION_READ_ENABLED=false`.
2. Enable worker shadow mode and backfill the configured rolling period.
3. Compare canonical and projection hashes/totals for the full covered period.
4. Enable the read flag only after complete coverage and zero mismatches.
5. Confirm API health and observe new slow logs; leave Wings Control untouched throughout.
