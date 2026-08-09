import { fitLogarithmicModel, predictCvSpeed } from '../modules/kpi/services/cv-speed-model.service.js';

console.log('=== EMPIRICAL MATHEMATICAL & LOGIC VERIFICATION ===');

// 1. Task 1: Logarithmic fitting equation T = a + b * ln(n)
console.log('\n--- TEST 1: Logarithmic Regression Fitting T = a + b * ln(n) ---');

// Synthetic data with known a = 10, b = 15
// T(30) = 10 + 15 * ln(30) = 10 + 15 * 3.4012 = 61.018
// T(60) = 10 + 15 * ln(60) = 10 + 15 * 4.0943 = 71.415
// T(80) = 10 + 15 * ln(80) = 10 + 15 * 4.3820 = 75.730
// T(100) = 10 + 15 * ln(100) = 10 + 15 * 4.6052 = 79.078
// T(120) = 10 + 15 * ln(120) = 10 + 15 * 4.7875 = 81.812

const perfectPoints = [
  { lashCount: 30, timeMinutes: 10 + 15 * Math.log(30) },
  { lashCount: 60, timeMinutes: 10 + 15 * Math.log(60) },
  { lashCount: 80, timeMinutes: 10 + 15 * Math.log(80) },
  { lashCount: 100, timeMinutes: 10 + 15 * Math.log(100) },
  { lashCount: 120, timeMinutes: 10 + 15 * Math.log(120) },
];

const fit1 = fitLogarithmicModel(perfectPoints);
console.log('Perfect points fit result:', fit1);
console.log('Expected: a ~ 10, b ~ 15, rSquared ~ 1.00, isMonotonic: true');

// 2. Task 2: Monotonicity enforcement (b >= 0, T(80) >= T(60))
console.log('\n--- TEST 2: Monotonicity Enforcement ---');

const nonMonotonicPoints = [
  { lashCount: 30, timeMinutes: 80 },
  { lashCount: 60, timeMinutes: 70 },
  { lashCount: 80, timeMinutes: 60 },
  { lashCount: 100, timeMinutes: 50 },
];

const fit2 = fitLogarithmicModel(nonMonotonicPoints);
console.log('Non-monotonic points fit result:', fit2);
console.log('isMonotonic:', fit2.isMonotonic, '(Expected: false)');

// Test monotonicity evaluated at 60 and 80
const T_60 = fit1.a + fit1.b * Math.log(60);
const T_80 = fit1.a + fit1.b * Math.log(80);
console.log(`T(60) = ${T_60}, T(80) = ${T_80}, T(80) >= T(60): ${T_80 >= T_60}`);

// 3. Task 3: 3-layer estimation cascade
console.log('\n--- TEST 3: 3-Layer Estimation Cascade & Thresholds ---');

// Create mock prismas to test predictCvSpeed
function createMockPrisma(rawCases: any[]) {
  return {
    crmPrisma: {
      crmLashTypeBenchmark: {
        findFirst: async () => ({ benchmarkMinutes: 60 }),
      },
    },
    legacyPrisma: {
      $queryRawUnsafe: async (sql: string) => {
        if (sql.includes('MIN(date_created)')) {
          return [{ first_date: new Date('2024-01-01') }];
        }
        if (sql.includes('COUNT(DISTINCT os.id)')) {
          return [{ cnt: 250 }];
        }
        if (sql.includes('report_order_service')) {
          return rawCases;
        }
        return [];
      },
    },
  };
}

async function runCascadeTests() {
  // Test Case 3A: 5 exact match cases -> should trigger Layer 1
  const exact5 = Array(5).fill({
    service_key: 'classic-60',
    service_name: 'Classic 60',
    service_type: 'Normal',
    cleaning_minute: 10,
    servicing_minute: 40,
    preparation_minute: 5,
    pre_servicing_minute: 5,
  });

  const mock1 = createMockPrisma(exact5);
  const pred1 = await predictCvSpeed(mock1.crmPrisma, mock1.legacyPrisma, 47510, 'Classic', 'normal_clean', 60);
  console.log('Case 3A (5 exact match cases): modelLayer =', pred1.modelLayer, '(Expected: 1)');

  // Test Case 3B: 3 exact match cases -> What layer does code pick?
  const exact3 = Array(3).fill({
    service_key: 'classic-60',
    service_name: 'Classic 60',
    service_type: 'Normal',
    cleaning_minute: 10,
    servicing_minute: 40,
    preparation_minute: 5,
    pre_servicing_minute: 5,
  });
  const mock2 = createMockPrisma(exact3);
  const pred2 = await predictCvSpeed(mock2.crmPrisma, mock2.legacyPrisma, 47510, 'Classic', 'normal_clean', 60);
  console.log(
    'Case 3B (3 exact match cases): modelLayer =',
    pred2.modelLayer,
    '(Expected in task description: 1, Code result:',
    pred2.modelLayer,
    ')'
  );

  // Test Case 3C: 4 cases with varying count (e.g. 30, 60, 80, 100) -> Log regression
  const varying4 = [
    {
      service_key: 'classic-30',
      service_name: 'Classic 30',
      service_type: 'Normal',
      cleaning_minute: 8,
      servicing_minute: 25,
      preparation_minute: 3,
      pre_servicing_minute: 2,
    },
    {
      service_key: 'classic-60',
      service_name: 'Classic 60',
      service_type: 'Normal',
      cleaning_minute: 10,
      servicing_minute: 40,
      preparation_minute: 5,
      pre_servicing_minute: 5,
    },
    {
      service_key: 'classic-80',
      service_name: 'Classic 80',
      service_type: 'Normal',
      cleaning_minute: 12,
      servicing_minute: 50,
      preparation_minute: 5,
      pre_servicing_minute: 5,
    },
    {
      service_key: 'classic-100',
      service_name: 'Classic 100',
      service_type: 'Normal',
      cleaning_minute: 15,
      servicing_minute: 60,
      preparation_minute: 5,
      pre_servicing_minute: 5,
    },
  ];
  const mock3 = createMockPrisma(varying4);
  const pred3 = await predictCvSpeed(mock3.crmPrisma, mock3.legacyPrisma, 47510, 'Classic', 'normal_clean', 70);
  console.log('Case 3C (4 varying cases across count series): modelLayer =', pred3.modelLayer, '(Expected: 2)');

  // Test Case 3D: 0 cases -> Layer 3
  const mock4 = createMockPrisma([]);
  const pred4 = await predictCvSpeed(mock4.crmPrisma, mock4.legacyPrisma, 47510, 'Classic', 'normal_clean', 60);
  console.log('Case 3D (0 cases): modelLayer =', pred4.modelLayer, '(Expected: 3)');

  // 4. Task 4: Phase breakdown sum T_total = T_cleaning + T_extension + T_prep_qc
  console.log('\n--- TEST 4: Phase Breakdown Sum Integrity ---');

  function verifyPhaseSum(name: string, pred: any) {
    const { cleaning, extension, prepQc, total } = pred.predictedMinutes;
    const sum = cleaning + extension + prepQc;
    const diff = Math.abs(sum - total);
    console.log(
      `[${name}] Layer ${pred.modelLayer}: cleaning(${cleaning}) + extension(${extension}) + prepQc(${prepQc}) = sum(${sum}), total = ${total}. Valid: ${diff === 0}`
    );
    return diff === 0;
  }

  verifyPhaseSum('Case 3A (Layer 1)', pred1);
  verifyPhaseSum('Case 3B (Layer 2)', pred2);
  verifyPhaseSum('Case 3C (Layer 2)', pred3);
  verifyPhaseSum('Case 3D (Layer 3)', pred4);

  // Test Case 4B: Stress testing Layer 1 phase breakdown sum with non-uniform medians
  console.log('\n--- TEST 4B: Layer 1 Median Sum Invariant Failure Case ---');
  const layer1NonUniform = [
    {
      service_key: 'classic-60',
      service_name: 'Classic 60',
      service_type: 'Normal',
      cleaning_minute: 5,
      servicing_minute: 55,
      preparation_minute: 3,
      pre_servicing_minute: 2,
    }, // total 65
    {
      service_key: 'classic-60',
      service_name: 'Classic 60',
      service_type: 'Normal',
      cleaning_minute: 5,
      servicing_minute: 50,
      preparation_minute: 10,
      pre_servicing_minute: 5,
    }, // total 70
    {
      service_key: 'classic-60',
      service_name: 'Classic 60',
      service_type: 'Normal',
      cleaning_minute: 20,
      servicing_minute: 45,
      preparation_minute: 6,
      pre_servicing_minute: 4,
    }, // total 75
    {
      service_key: 'classic-60',
      service_name: 'Classic 60',
      service_type: 'Normal',
      cleaning_minute: 22,
      servicing_minute: 42,
      preparation_minute: 8,
      pre_servicing_minute: 5,
    }, // total 77
    {
      service_key: 'classic-60',
      service_name: 'Classic 60',
      service_type: 'Normal',
      cleaning_minute: 25,
      servicing_minute: 40,
      preparation_minute: 9,
      pre_servicing_minute: 6,
    }, // total 80
  ];
  const mockLayer1Fail = createMockPrisma(layer1NonUniform);
  const predL1Fail = await predictCvSpeed(
    mockLayer1Fail.crmPrisma,
    mockLayer1Fail.legacyPrisma,
    47510,
    'Classic',
    'normal_clean',
    60
  );
  verifyPhaseSum('Layer 1 Median Sum Invariant Test', predL1Fail);

  // Test Case 4C: Stress testing Layer 2 small total predExt Math.max(10) override
  console.log('\n--- TEST 4C: Layer 2 Math.max(10) Override Invariant Failure Case ---');
  const layer2SmallTotal = [
    {
      service_key: 'classic-30',
      service_name: 'Classic 30',
      service_type: 'Normal',
      cleaning_minute: 9,
      servicing_minute: 5,
      preparation_minute: 4,
      pre_servicing_minute: 2,
    },
    {
      service_key: 'classic-30',
      service_name: 'Classic 30',
      service_type: 'Normal',
      cleaning_minute: 8,
      servicing_minute: 6,
      preparation_minute: 3,
      pre_servicing_minute: 3,
    },
    {
      service_key: 'classic-30',
      service_name: 'Classic 30',
      service_type: 'Normal',
      cleaning_minute: 10,
      servicing_minute: 4,
      preparation_minute: 5,
      pre_servicing_minute: 1,
    },
  ];
  const mockLayer2Fail = createMockPrisma(layer2SmallTotal);
  const predL2Fail = await predictCvSpeed(
    mockLayer2Fail.crmPrisma,
    mockLayer2Fail.legacyPrisma,
    47510,
    'Classic',
    'normal_clean',
    20
  );
  verifyPhaseSum('Layer 2 Math.max(10) Override Invariant Test', predL2Fail);
}

runCascadeTests().catch(console.error);
