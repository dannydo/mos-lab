import { fitLogarithmicModel, predictCvSpeed } from '../../dist/modules/kpi/services/cv-speed-model.service.js';

console.log('=== EMPIRICAL TEST: LAYER 2 MATH.MAX OVERRIDE BREAKDOWN ===');

function createMockPrisma(rawCases) {
  return {
    crmPrisma: {
      crmLashTypeBenchmark: {
        findFirst: async () => ({ benchmarkMinutes: 20 }),
      },
    },
    legacyPrisma: {
      $queryRawUnsafe: async (sql) => {
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

async function testLayer2Breakdown() {
  // 3 cases where cleaning & prep take most of the time (e.g. total 25: cleaning 11, prep 10, servicing 4)
  const smallTotalCases = [
    {
      service_key: 'classic-30',
      service_name: 'Classic 30',
      service_type: 'Normal',
      cleaning_minute: 11,
      servicing_minute: 4,
      preparation_minute: 5,
      pre_servicing_minute: 5,
    }, // total 25
    {
      service_key: 'classic-60',
      service_name: 'Classic 60',
      service_type: 'Normal',
      cleaning_minute: 12,
      servicing_minute: 5,
      preparation_minute: 5,
      pre_servicing_minute: 5,
    }, // total 27
    {
      service_key: 'classic-80',
      service_name: 'Classic 80',
      service_type: 'Normal',
      cleaning_minute: 13,
      servicing_minute: 6,
      preparation_minute: 5,
      pre_servicing_minute: 5,
    }, // total 29
  ];

  const mock = createMockPrisma(smallTotalCases);
  const pred = await predictCvSpeed(mock.crmPrisma, mock.legacyPrisma, 47510, 'Classic', 'normal_clean', 30);

  const { cleaning, extension, prepQc, total } = pred.predictedMinutes;
  const sum = cleaning + extension + prepQc;
  console.log(`Model Layer: ${pred.modelLayer}`);
  console.log(`cleaning(${cleaning}) + extension(${extension}) + prepQc(${prepQc}) = sum(${sum}), total = ${total}`);
  console.log(`Phase breakdown sum valid: ${sum === total}`);
}

testLayer2Breakdown().catch(console.error);
