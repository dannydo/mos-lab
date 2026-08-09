# Empirical Challenger Handoff Report — Milestone 3 & Milestone 4 Verification Gate

**Target File**: `apps/api/src/modules/kpi/services/cv-speed-model.service.ts`  
**Working Directory**: `/Users/dannydo/projects/mos-lab/.agents/challenger_m3m4_2`  
**Explicit Verdict**: `REQUEST_CHANGES`

---

## 1. Observation

Empirical testing was conducted by executing isolated Node.js test scripts against `apps/api/dist/modules/kpi/services/cv-speed-model.service.js`. Below are verbatim code inspections and empirical test outputs for the 4 tasks:

### Task 1: Logarithmic fitting equation $T = a + b \ln(n)$

- **Code Inspection** (`cv-speed-model.service.ts` lines 22–78):
  ```ts
  const points = validPoints.map((p) => ({
    x: Math.log(p.lashCount),
    y: p.timeMinutes,
  }));
  ...
  const b = (sumXY - n * meanX * meanY) / denominator;
  const a = meanY - b * meanX;
  ```
- **Empirical Execution Output** (`node apps/api/src/scripts/test-empirical-m3m4.js`):
  ```
  --- TEST 1: Logarithmic Regression Fitting T = a + b * ln(n) ---
  Perfect points fit result: { a: 10, b: 15, rSquared: 1, isMonotonic: true }
  n = 30: Predicted T = 61.018, Expected T = 61.018, error = 0.00000
  n = 60: Predicted T = 71.415, Expected T = 71.415, error = 0.00000
  n = 80: Predicted T = 75.730, Expected T = 75.730, error = 0.00000
  n = 100: Predicted T = 79.078, Expected T = 79.078, error = 0.00000
  n = 120: Predicted T = 81.812, Expected T = 81.812, error = 0.00000
  ```
  _Result_: **PASS**. The regression fitting equation is mathematically accurate.

---

### Task 2: Monotonicity enforcement ($b \ge 0$, $T(80) \ge T(60)$)

- **Code Inspection** (`cv-speed-model.service.ts` line 71, 319; `cv-speed-seed.service.ts` lines 98–130):
  ```ts
  const isMonotonic = b > 0;
  ...
  if (logFit.isMonotonic && logFit.rSquared >= 0.5) { ... }
  ```
- **Empirical Execution Output**:
  ```
  --- TEST 2: Monotonicity Enforcement ---
  Negative slope fit result: { a: 162.82, b: -23.74, rSquared: 0.93, isMonotonic: false }
  isMonotonic evaluated as: false (Expected: false because b < 0)
  With positive b (15): T(60) = 71.42, T(80) = 75.73, T(80) >= T(60): true
  ```
  _Result_: **PASS**. Non-monotonic fits ($b \le 0$) are rejected from Layer 2. `enforceMonotonicity` in `cv-speed-seed.service.ts` guarantees $T(80) \ge T(60)$ across all counts.

---

### Task 3: 3-layer estimation cascade

- **Code Inspection** (`cv-speed-model.service.ts` lines 279, 315):
  - Line 279: `if (exactCases.length >= 5)` (Layer 1 check)
  - Line 315: `if (parsedCases.length >= 3)` (Layer 2 check)
- **Specification vs Implementation Comparison**:
  - **Task Spec**:
    - Layer 1: Direct historical average ($N \ge 3$)
    - Layer 2: Logarithmic regression model ($N \ge 5$)
    - Layer 3: Global benchmark adjusted by CV speed ratio
  - **Actual Code Implementation**:
    - Layer 1: Direct exact match average ($N \ge 5$) — line 279
    - Layer 2: Logarithmic regression model ($N \ge 3$) — line 315
- **Empirical Output**:
  ```
  Case 3A (5 exact match cases): modelLayer = 1 sampleSize = 5
  Case 3B (3 exact match cases): modelLayer = 3 sampleSize = 3 (Skipped Layer 1!)
  Case 3C (4 varying cases across count series): modelLayer = 2 sampleSize = 4
  ```
  _Result_: **FAIL (DISCREPANCY)**. Thresholds are inverted in code. A CV with 3 or 4 exact historical cases skips Layer 1 and falls through to Layer 2/3, whereas a CV with only 3 total cases attempts Layer 2 log regression on an insufficient sample size.

---

### Task 4: Phase breakdown sum ($T_{total} = T_{cleaning} + T_{extension} + T_{prep\_qc}$)

- **Code Inspection** (`cv-speed-model.service.ts` lines 280–288 and lines 324–328):
  - **Layer 1** (lines 280–288):
    ```ts
    const medianTotal = Math.round(sortedTotal[Math.floor(sortedTotal.length / 2)]);
    const medianClean = Math.round(sortedClean[Math.floor(sortedClean.length / 2)]);
    const medianExt = Math.round(sortedExt[Math.floor(sortedExt.length / 2)]);
    const medianPrep = Math.round(sortedPrep[Math.floor(sortedPrep.length / 2)]);
    ```
  - **Layer 2** (line 328):
    ```ts
    const predClean = Math.max(5, Math.round(predTotal * (avgCleanRatio || 0.15)));
    const predPrep = Math.max(5, Math.round(predTotal * (avgPrepRatio || 0.1)));
    const predExt = Math.max(10, predTotal - predClean - predPrep);
    ```
- **Empirical Failure Output 1 (Layer 1)** (`node apps/api/src/scripts/test-empirical-m3m4.js`):
  ```
  --- TEST 4B: Stress Test Layer 1 Non-Uniform Medians ---
  [Layer 1 Non-Uniform Medians] Layer 1: cleaning(20) + extension(45) + prepQc(13) = sum(78), total = 75. Valid: false
  ```
- **Empirical Failure Output 2 (Layer 2)** (`node apps/api/src/scripts/test-layer2-override.js`):
  ```
  Model Layer: 2
  cleaning(11) + extension(10) + prepQc(9) = sum(30), total = 25
  Phase breakdown sum valid: false
  ```
  _Result_: **FAIL (CRITICAL BUG)**. In both Layer 1 and Layer 2, the sub-phase components do NOT sum up to $T_{total}$.
  - In Layer 1: The median of component sums does NOT equal the sum of component medians for non-uniform phase distributions ($20 + 45 + 13 = 78 \neq 75$).
  - In Layer 2: Forcing `predExt = Math.max(10, predTotal - predClean - predPrep)` overrides arithmetic subtraction when remaining time $< 10$, causing $11 + 10 + 9 = 30 \neq 25$.

---

## 2. Logic Chain

1. **Task 1 & Task 2 Verification**:
   - The logarithmic regression math in `fitLogarithmicModel` accurately calculates $a, b, r^2$ for $T = a + b \ln(n)$. Synthetic test cases yielded $0.00000$ error against theoretical values.
   - Monotonicity is checked via $b > 0$, rejecting negative slopes from Layer 2. `enforceMonotonicity` in `cv-speed-seed.service.ts` ensures $T(80) \ge T(60)$.

2. **Task 3 Threshold Inversion Failure**:
   - Task 3 requires Layer 1 when $N \ge 3$ (historical average) and Layer 2 when $N \ge 5$ (log regression).
   - In `cv-speed-model.service.ts`, line 279 checks `exactCases.length >= 5` for Layer 1, and line 315 checks `parsedCases.length >= 3` for Layer 2.
   - Empirical test Case 3B proved that with 3 exact match cases, `modelLayer` returned `3` (skipped Layer 1). This is an inverted threshold bug.

3. **Task 4 Phase Breakdown Sum Violation**:
   - Task 4 requires $T_{total} = T_{cleaning} + T_{extension} + T_{prep\_qc}$ to hold unconditionally across all layers.
   - **Layer 1 Cause**: Independent median calculation for each phase array (`medianTotal`, `medianClean`, `medianExt`, `medianPrep`). In statistics, $\text{Median}(A + B + C) \neq \text{Median}(A) + \text{Median}(B) + \text{Median}(C)$.
   - **Layer 2 Cause**: `predExt = Math.max(10, predTotal - predClean - predPrep)`. When `predTotal - predClean - prepQc < 10`, `predExt` is forced to 10, breaking the equality $T_{clean} + T_{ext} + T_{prep} = T_{total}$.
   - Both bugs were empirically reproduced with non-zero residual differences ($78 \neq 75$ and $30 \neq 25$).

---

## 3. Caveats

- **Layer 3 Sum Integrity**: Layer 3 computes `predExt = predTotal - predClean - predPrep` without `Math.max(10, ...)`, so Layer 3 phase breakdown sum is valid.
- **Seeding Enforcement**: In `cv-speed-seed.service.ts`, `enforceMonotonicity` adjusts `total` and `extension` minutes across standard counts, preserving the sum invariant after seed calculations. However, live on-the-fly calls to `predictCvSpeed` (Layer 1 and Layer 2) directly expose invalid phase sums to the frontend prediction API.

---

## 4. Conclusion

While Tasks 1 and 2 (fitting math & monotonicity enforcement) are sound, **Task 3 contains threshold inversions** and **Task 4 contains critical mathematical invariant bugs in Layer 1 and Layer 2 phase breakdown calculations**.

### Required Remedies before Approval:

1. **Fix Layer 1 Phase Breakdown Sum**: Compute `medianTotal`, `medianClean`, and `medianPrep` (or ratios), and set `medianExt = medianTotal - medianClean - medianPrep` (ensuring non-negative).
2. **Fix Layer 2 Phase Breakdown Sum**: Compute `predExt = predTotal - predClean - predPrep` without forcing `Math.max(10)` above `predTotal`, or adjust `predTotal = predClean + predExt + predPrep`.
3. **Fix Layer Thresholds**: Update Layer 1 check to `exactCases.length >= 3` and Layer 2 check to `parsedCases.length >= 5` (and align `computeConfidence`).

**Explicit Verdict**: `REQUEST_CHANGES`

---

## 5. Verification Method

To independently verify these findings, run the following commands from workspace root `/Users/dannydo/projects/mos-lab`:

1. **Verify Task 1, 2, 3, and Task 4 (Layer 1 Median Sum Bug)**:

   ```bash
   node apps/api/src/scripts/test-empirical-m3m4.js
   ```

   _Expected Output_:
   - Test 1 & Test 2 output `PASS`.
   - Test 3 shows Case 3B (3 exact cases) returning `modelLayer = 3` instead of `1`.
   - Test 4B shows `[Layer 1 Non-Uniform Medians] Layer 1: cleaning(20) + extension(45) + prepQc(13) = sum(78), total = 75. Valid: false`.

2. **Verify Task 4 (Layer 2 Math.max Override Bug)**:
   ```bash
   node apps/api/src/scripts/test-layer2-override.js
   ```
   _Expected Output_:
   - `Model Layer: 2`
   - `cleaning(11) + extension(10) + prepQc(9) = sum(30), total = 25`
   - `Phase breakdown sum valid: false`
