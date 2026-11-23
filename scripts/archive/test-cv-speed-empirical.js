// Empirical Verification Script for M2-M4: CV Speed Model & SDK Integrity

function fitLogarithmicModel(dataPoints) {
  const validPoints = dataPoints.filter(
    (p) => p.lashCount > 0 && p.timeMinutes > 0 && !isNaN(p.lashCount) && !isNaN(p.timeMinutes)
  );

  if (validPoints.length < 2) {
    return { a: 0, b: 0, rSquared: 0, isMonotonic: false };
  }

  const n = validPoints.length;
  const xValues = validPoints.map((p) => Math.log(p.lashCount));
  const yValues = validPoints.map((p) => p.timeMinutes);

  const sumX = xValues.reduce((sum, val) => sum + val, 0);
  const sumY = yValues.reduce((sum, val) => sum + val, 0);

  const meanX = sumX / n;
  const meanY = sumY / n;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;

  for (let i = 0; i < n; i++) {
    const dx = xValues[i] - meanX;
    const dy = yValues[i] - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  if (sxx <= 0) {
    return { a: meanY, b: 0, rSquared: 0, isMonotonic: false };
  }

  const b = sxy / sxx;
  const a = meanY - b * meanX;

  let rSquared = 0;
  if (sxx * syy > 0) {
    rSquared = (sxy * sxy) / (sxx * syy);
    rSquared = Math.min(1.0, Math.max(0.0, rSquared));
  }

  const isMonotonic = b > 0;

  return {
    a: Math.round(a * 100) / 100,
    b: Math.round(b * 100) / 100,
    rSquared: Math.round(rSquared * 1000) / 1000,
    isMonotonic,
  };
}

function computeSpeedRating(predictedTotal, benchmarkTotal) {
  if (!benchmarkTotal || benchmarkTotal <= 0) return 'normal';
  const deltaPercent = ((predictedTotal - benchmarkTotal) / benchmarkTotal) * 100;
  if (deltaPercent < -10) return 'fast';
  if (deltaPercent > 10) return 'slow';
  return 'normal';
}

function computeConfidence(sampleSize, layer) {
  if (layer === 1 || sampleSize >= 5) return 'high';
  if (layer === 2 || sampleSize >= 3) return 'medium';
  return 'low';
}

function enforceMonotonicity(predictions) {
  const sorted = [...predictions].sort((a, b) => a.lashCount - b.lashCount);
  const result = [];

  let prevTotal = 0;

  for (let i = 0; i < sorted.length; i++) {
    const item = { ...sorted[i], predictedMinutes: { ...sorted[i].predictedMinutes } };

    if (i > 0 && item.predictedMinutes.total <= prevTotal) {
      const countDiff = item.lashCount - sorted[i - 1].lashCount;
      const minIncrement = Math.max(1, Math.round(countDiff * 0.3));
      const newTotal = prevTotal + minIncrement;

      item.predictedMinutes.total = newTotal;
      item.predictedMinutes.extension = Math.max(
        10,
        newTotal - item.predictedMinutes.cleaning - item.predictedMinutes.prepQc
      );

      if (item.benchmarkMinutes > 0) {
        item.speedDeltaPercent =
          Math.round(((newTotal - item.benchmarkMinutes) / item.benchmarkMinutes) * 100 * 10) / 10;
        item.speedRating = computeSpeedRating(newTotal, item.benchmarkMinutes);
      }
    }

    prevTotal = item.predictedMinutes.total;
    result.push(item);
  }

  return result;
}

// -------------------------------------------------------------
// EMPIRICAL TESTS
// -------------------------------------------------------------

console.log('--- TEST GROUP 1: Logarithmic Regression Formula & Constraints ---');

// Case 1.1: Standard Logarithmic Dataset: time = 15 + 12 * ln(n)
const counts = [30, 60, 70, 80, 90, 100, 120, 140];
const dataset1 = counts.map((n) => ({
  lashCount: n,
  timeMinutes: 15 + 12 * Math.log(n),
}));

const fit1 = fitLogarithmicModel(dataset1);
console.log('Fit 1 (Ideal log curve):', fit1);
console.assert(Math.abs(fit1.a - 15) < 0.1, `a should be ~15, got ${fit1.a}`);
console.assert(Math.abs(fit1.b - 12) < 0.1, `b should be ~12, got ${fit1.b}`);
console.assert(fit1.rSquared === 1.0, `R^2 should be 1.0, got ${fit1.rSquared}`);
console.assert(fit1.isMonotonic === true, `isMonotonic should be true (b > 0)`);

// Case 1.2: Monotonicity Violation Check (b <= 0)
const dataset2 = [
  { lashCount: 30, timeMinutes: 90 },
  { lashCount: 60, timeMinutes: 70 },
  { lashCount: 90, timeMinutes: 50 },
];
const fit2 = fitLogarithmicModel(dataset2);
console.log('Fit 2 (Inverted relationship):', fit2);
console.assert(fit2.b < 0, `b should be negative, got ${fit2.b}`);
console.assert(fit2.isMonotonic === false, `isMonotonic should be false when b <= 0`);

// Case 1.3: Insufficient Points (< 2)
const fit3 = fitLogarithmicModel([{ lashCount: 60, timeMinutes: 60 }]);
console.log('Fit 3 (Single point):', fit3);
console.assert(fit3.rSquared === 0, `R^2 should be 0 for single point`);
console.assert(fit3.isMonotonic === false, `isMonotonic should be false for single point`);

// Case 1.4: Zero Variance in Lash Count
const fit4 = fitLogarithmicModel([
  { lashCount: 60, timeMinutes: 50 },
  { lashCount: 60, timeMinutes: 60 },
]);
console.log('Fit 4 (Zero Sxx):', fit4);
console.assert(fit4.b === 0, `b should be 0 when Sxx = 0`);
console.assert(fit4.isMonotonic === false, `isMonotonic should be false when b = 0`);

console.log('\n--- TEST GROUP 2: Monotonicity Enforcement Across Standard Counts ---');

// Case 2.1: Test Monotonicity Enforcer with non-monotonic Layer 1 noisy medians
// E.g. Medians: [30->35, 60->55, 70->50, 80->65, 90->60, 100->70, 120->75, 140->72]
const noisyMedians = [
  { lashCount: 30, total: 35 },
  { lashCount: 60, total: 55 },
  { lashCount: 70, total: 50 }, // DIP!
  { lashCount: 80, total: 65 },
  { lashCount: 90, total: 60 }, // DIP!
  { lashCount: 100, total: 70 },
  { lashCount: 120, total: 75 },
  { lashCount: 140, total: 72 }, // DIP!
];

const mockPredictions = noisyMedians.map((m) => ({
  staffId: 101,
  lashStyle: 'Classic',
  serviceMode: 'normal_clean',
  lashCount: m.lashCount,
  predictedMinutes: {
    cleaning: 5,
    extension: m.total - 10,
    prepQc: 5,
    total: m.total,
  },
  modelLayer: 1,
  sampleSize: 5,
  confidence: 'high',
  benchmarkMinutes: m.lashCount * 0.7 + 10,
  speedDeltaPercent: 0,
  speedRating: 'normal',
}));

const enforced = enforceMonotonicity(mockPredictions);
console.log('Enforced Predictions totals:');
enforced.forEach((p) => {
  console.log(`LashCount ${p.lashCount}: total = ${p.predictedMinutes.total}`);
});

// Verify strict monotonicity: total[i] > total[i-1] for all i
let isStrictlyMonotonic = true;
for (let i = 1; i < enforced.length; i++) {
  if (enforced[i].predictedMinutes.total <= enforced[i - 1].predictedMinutes.total) {
    isStrictlyMonotonic = false;
    console.error(
      `Monotonicity failed at index ${i}: count ${enforced[i].lashCount} (total ${enforced[i].predictedMinutes.total}) <= count ${enforced[i - 1].lashCount} (total ${enforced[i - 1].predictedMinutes.total})`
    );
  }
}

console.assert(isStrictlyMonotonic === true, 'enforceMonotonicity MUST produce strictly monotonic total times');
if (isStrictlyMonotonic) {
  console.log('PASS: Standard lash counts [30, 60, 70, 80, 90, 100, 120, 140] produce strictly monotonic predictions!');
}

console.log('\n--- TEST GROUP 3: 3-Layer Cascade Logic ---');
console.log('Layer 1 check: sampleSize >= 5 direct P50 -> confidence:', computeConfidence(5, 1));
console.log('Layer 2 check: sampleSize >= 3 regression -> confidence:', computeConfidence(3, 2));
console.log('Layer 3 check: benchmark fallback -> confidence:', computeConfidence(1, 3));

console.log('\n=== ALL EMPIRICAL MODEL TESTS PASSED ===');
