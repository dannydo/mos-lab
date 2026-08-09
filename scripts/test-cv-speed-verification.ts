import {
  fitLogarithmicModel,
  computeSpeedRating,
  computeConfidence,
} from '../apps/api/src/modules/kpi/services/cv-speed-model.service.js';
import {
  STANDARD_LASH_STYLES,
  STANDARD_SERVICE_MODES,
  STANDARD_LASH_COUNTS,
} from '../apps/api/src/modules/kpi/services/cv-speed-seed.service.js';

function runUnitTests() {
  console.log('=== 1. Testing fitLogarithmicModel ===');

  // Test 1.1: Standard logarithmic curve y = 20 + 15 * ln(x)
  const perfectPoints = [30, 60, 70, 80, 90, 100, 120, 140].map((count) => ({
    lashCount: count,
    timeMinutes: 20 + 15 * Math.log(count),
  }));
  const res1 = fitLogarithmicModel(perfectPoints);
  console.log('Test 1.1 (Perfect log curve):', res1);
  if (Math.abs(res1.a - 20) > 0.5 || Math.abs(res1.b - 15) > 0.5 || res1.rSquared < 0.99 || !res1.isMonotonic) {
    console.error('FAIL Test 1.1: Log model fitting inaccurate');
  } else {
    console.log('PASS Test 1.1');
  }

  // Test 1.2: Negative slope (faster for more lashes - invalid real world data)
  const invertedPoints = [
    { lashCount: 30, timeMinutes: 100 },
    { lashCount: 60, timeMinutes: 80 },
    { lashCount: 90, timeMinutes: 60 },
  ];
  const res2 = fitLogarithmicModel(invertedPoints);
  console.log('Test 1.2 (Inverted points):', res2);
  if (res2.b >= 0 || res2.isMonotonic !== false) {
    console.error('FAIL Test 1.2: Should detect non-monotonic b <= 0');
  } else {
    console.log('PASS Test 1.2');
  }

  // Test 1.3: Low R^2 noisy data
  const noisyPoints = [
    { lashCount: 30, timeMinutes: 50 },
    { lashCount: 60, timeMinutes: 90 },
    { lashCount: 80, timeMinutes: 40 },
    { lashCount: 100, timeMinutes: 85 },
  ];
  const res3 = fitLogarithmicModel(noisyPoints);
  console.log('Test 1.3 (Noisy data):', res3);
  console.log('PASS Test 1.3, R^2 =', res3.rSquared);

  // Test 1.4: Single point / zero points edge cases
  const res4 = fitLogarithmicModel([{ lashCount: 60, timeMinutes: 60 }]);
  if (res4.rSquared !== 0 || res4.isMonotonic !== false) {
    console.error('FAIL Test 1.4: Edge case failure for single point');
  } else {
    console.log('PASS Test 1.4');
  }

  console.log('\n=== 2. Testing Speed Rating & Confidence ===');
  console.log('Rating (-20% faster):', computeSpeedRating(48, 60)); // fast
  console.log('Rating (0% diff):', computeSpeedRating(60, 60)); // normal
  console.log('Rating (+20% slower):', computeSpeedRating(72, 60)); // slow

  if (
    computeSpeedRating(48, 60) !== 'fast' ||
    computeSpeedRating(60, 60) !== 'normal' ||
    computeSpeedRating(72, 60) !== 'slow'
  ) {
    console.error('FAIL Speed rating calculation');
  } else {
    console.log('PASS Speed rating calculation');
  }

  console.log('\n=== 3. Testing Standard Lash Counts & Styles ===');
  console.log('Standard Styles:', STANDARD_LASH_STYLES);
  console.log('Standard Modes:', STANDARD_SERVICE_MODES);
  console.log('Standard Counts:', STANDARD_LASH_COUNTS);

  if (STANDARD_LASH_COUNTS.length !== 8 || STANDARD_LASH_STYLES.length !== 10) {
    console.error('FAIL Standard counts or styles list mismatch');
  } else {
    console.log('PASS Standard counts and styles definitions');
  }
}

runUnitTests();
