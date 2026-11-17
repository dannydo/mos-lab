import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import {
  buildLegacyServiceProgressImageUrl,
  IosBookingProgress,
  resolveActiveServicingRound,
  SafeAny,
} from '@mos-lab/shared';
import { executeIosBookingAction } from '../services/ios-actions.service.js';
import { IosAuthContext } from '../services/ios-auth.service.js';
import { LegacyOrderCatalogSnapshot } from '../services/ios-legacy-payload.mapper.js';
import { createInMemoryConfigStore, createOverrideRepository } from '../services/ios-overrides.service.js';
import {
  mergeHydratedBookingProgress,
  persistRetainCountsByServiceIndex,
} from '../services/ios-progress-sync.helper.js';

const COMPLETE_ATTRS = {
  naturalLashLength: '9-10mm',
  naturalLashThickness: 'Mỏng vừa',
  naturalLashCount: 'Trung bình',
  naturalLashDensity: 'Trung bình',
  lashTrail: 'Hơi xuống',
  eyeShape: 'Mắt 2 mí',
  lashHealth: 'Khỏe',
  medicalProblem: 'Không có',
  isNewClientDiagnosticDone: true,
  hasUnderMink: true,
  underMinkServiceType: 'Retain' as const,
};

const cvlActor: IosAuthContext = {
  id: 11,
  legacyStaffId: 46272,
  displayName: 'Thao Ly',
  role: 'cvl',
  careerTier: 'CVL',
};

function createDualServiceHarness() {
  const phpCalls: Array<{ endpoint: string; payload: Record<string, SafeAny> }> = [];
  let currentLegacyState = 'Consultation';
  const catalog: LegacyOrderCatalogSnapshot = {
    orderExists: true,
    orderId: 145501,
    customerUserId: 88995,
    clientStoreId: 6,
    currentOrderState: currentLegacyState,
    promotionId: null,
    userUrlId: null,
    existingOrderServiceIds: [5001, 5002],
    upperService: {
      serviceId: 115,
      serviceGroup: 'LashesTop',
      singlePriceId: 1150,
      singlePriceAmount: 770000,
      balancePriceId: 1159,
      staffSurveySetId: 3,
      customerSurveySetId: 4,
    },
    underService: {
      serviceId: 128,
      serviceGroup: 'LashesUnder',
      singlePriceId: 1280,
      singlePriceAmount: 190000,
      balancePriceId: 1289,
      staffSurveySetId: 3,
      customerSurveySetId: 4,
    },
    products: [],
    staffFiveStarSurveyAnswers: { '6': [{ survey_answer_id: '24', survey_answer: '5' }] },
    customerHappySurveyAnswers: {},
  };

  const deps = {
    getPool: () => ({}) as mysql.Pool,
    resolveCatalog: async () => ({ ...catalog, currentOrderState: currentLegacyState }),
    resolveAuthToken: async () => ({ authUserId: 3879, loginToken: 'tok-under-round' }),
    waitNextSecond: async () => {},
    callEndpoint: async (endpoint: string, payload: Record<string, SafeAny>) => {
      phpCalls.push({ endpoint, payload });
      if (endpoint === '/order/service/progress/update') {
        currentLegacyState = String(payload.service_state || currentLegacyState);
      }
      if (endpoint === '/order/service/next') currentLegacyState = 'Consultation';
      if (endpoint === '/order/service/done') currentLegacyState = 'ServiceCompleted';
      return { ok: true, status: '1', code: '0000', message: 'OK' };
    },
  };

  return { phpCalls, deps };
}

test('2-round Under Lash syncs Round 1 (os0) with stripped raw Base64 -> /order/service/next -> Round 2 (os1) -> single /order/service/done', async () => {
  const store = createInMemoryConfigStore();
  const repo = createOverrideRepository(store);
  const harness = createDualServiceHarness();

  await executeIosBookingAction(
    cvlActor,
    {
      bookingId: 145501,
      customerId: 88995,
      action: 'SAVE_CONSULTATION',
      serviceType: 'Normal',
      attributes: COMPLETE_ATTRS,
    },
    repo,
    harness.deps,
    { enableLegacyStepSync: true }
  );
  harness.phpCalls.length = 0;

  // Round 1 Before -> ServiceStart on 5001 with stripped Base64
  await executeIosBookingAction(
    cvlActor,
    {
      bookingId: 145501,
      action: 'UPDATE_PROGRESS',
      orderState: 'Service Start',
      progress: { beforePhotoUrl: 'data:image/jpeg;base64,AAAABBBBCCCC' },
    },
    repo,
    harness.deps,
    { enableLegacyStepSync: true }
  );
  // Round 1 Cleaned -> ServiceCleaned on 5001
  await executeIosBookingAction(
    cvlActor,
    {
      bookingId: 145501,
      action: 'UPDATE_PROGRESS',
      orderState: 'Service Cleaned',
      progress: { cleanedPhotoUrl: 'data:image/jpeg;base64,DDDDEEEEFFFF' },
    },
    repo,
    harness.deps,
    { enableLegacyStepSync: true }
  );
  // Round 1 After -> NEXT_SERVICE_ROUND uploads ServiceEnd on 5001, calls /order/service/next on 5001, Preparation on 5002
  await executeIosBookingAction(
    cvlActor,
    {
      bookingId: 145501,
      action: 'NEXT_SERVICE_ROUND',
      orderState: 'Preparation',
      progress: { afterPhotoUrl: 'data:image/jpeg;base64,GGGGHHHHIIII' },
    },
    repo,
    harness.deps,
    { enableLegacyStepSync: true }
  );

  // Round 2 Before, Cleaned, Completed -> syncs exclusively on 5002
  await executeIosBookingAction(
    cvlActor,
    {
      bookingId: 145501,
      action: 'UPDATE_PROGRESS',
      orderState: 'Service Start',
      progress: { activeServiceRound: 'UNDER', underBeforePhotoUrl: 'data:image/jpeg;base64,JJJJKKKKLLLL' },
    },
    repo,
    harness.deps,
    { enableLegacyStepSync: true }
  );
  await executeIosBookingAction(
    cvlActor,
    {
      bookingId: 145501,
      action: 'UPDATE_PROGRESS',
      orderState: 'Service Cleaned',
      progress: { activeServiceRound: 'UNDER', underCleanedPhotoUrl: 'data:image/jpeg;base64,MMMMNNNNOOOO' },
    },
    repo,
    harness.deps,
    { enableLegacyStepSync: true }
  );
  await executeIosBookingAction(
    cvlActor,
    {
      bookingId: 145501,
      action: 'UPDATE_PROGRESS',
      orderState: 'Service Completed',
      progress: { activeServiceRound: 'UNDER', underAfterPhotoUrl: 'data:image/jpeg;base64,PPPPQQQQRRRR' },
    },
    repo,
    harness.deps,
    { enableLegacyStepSync: true }
  );
  await executeIosBookingAction(
    cvlActor,
    { bookingId: 145501, action: 'COMPLETE_SURVEY', survey: { rating: 5 } },
    repo,
    harness.deps,
    { enableLegacyStepSync: true }
  );

  const progressUpdates = harness.phpCalls.filter((c) => c.endpoint === '/order/service/progress/update');
  const nextCalls = harness.phpCalls.filter((c) => c.endpoint === '/order/service/next');
  const doneCalls = harness.phpCalls.filter((c) => c.endpoint === '/order/service/done');

  assert.equal(progressUpdates[0].payload.order_service_id, '5001');
  assert.equal(progressUpdates[0].payload.service_state, 'ServiceStart');
  assert.equal(progressUpdates[0].payload.image, 'AAAABBBBCCCC');
  assert.equal(progressUpdates[0].payload.image.startsWith('data:'), false);

  assert.equal(progressUpdates[2].payload.order_service_id, '5001');
  assert.equal(progressUpdates[2].payload.service_state, 'ServiceEnd');
  assert.equal(progressUpdates[2].payload.image, 'GGGGHHHHIIII');

  assert.equal(nextCalls.length, 1);
  assert.equal(nextCalls[0].payload.order_service_id, '5001');

  assert.equal(progressUpdates[3].payload.order_service_id, '5002');
  assert.equal(progressUpdates[3].payload.service_state, 'Preparation');
  assert.equal(progressUpdates[4].payload.order_service_id, '5002');
  assert.equal(progressUpdates[4].payload.service_state, 'ServiceStart');
  assert.equal(progressUpdates[4].payload.image, 'JJJJKKKKLLLL');
  assert.equal(progressUpdates[6].payload.order_service_id, '5002');
  assert.equal(progressUpdates[6].payload.service_state, 'ServiceEnd');
  assert.equal(progressUpdates[6].payload.image, 'PPPPQQQQRRRR');

  assert.equal(doneCalls.length, 1);
  assert.equal(doneCalls[0].payload.order_service_id, '5002');
});

test('DECLINED photo omits image key in Legacy PHP payload', async () => {
  const store = createInMemoryConfigStore();
  const repo = createOverrideRepository(store);
  const harness = createDualServiceHarness();

  await executeIosBookingAction(
    cvlActor,
    {
      bookingId: 145501,
      customerId: 88995,
      action: 'SAVE_CONSULTATION',
      serviceType: 'Normal',
      attributes: COMPLETE_ATTRS,
    },
    repo,
    harness.deps,
    { enableLegacyStepSync: true }
  );
  harness.phpCalls.length = 0;

  await executeIosBookingAction(
    cvlActor,
    {
      bookingId: 145501,
      action: 'UPDATE_PROGRESS',
      orderState: 'Service Start',
      progress: { beforePhotoUrl: 'DECLINED:Khách nhạy cảm riêng tư' },
    },
    repo,
    harness.deps,
    { enableLegacyStepSync: true }
  );

  assert.equal(harness.phpCalls[0].endpoint, '/order/service/progress/update');
  assert.equal('image' in harness.phpCalls[0].payload, false);
});

test('persistRetainCountsByServiceIndex writes Under #17/#18 only when Under service is Retain', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const fakePool = {
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      if (sql.includes('FROM order_service')) {
        return [
          [
            { id: 5001, service_id: 115, service_group: 'LashesTop' },
            { id: 5002, service_id: 127, service_group: 'LashesUnder' },
          ],
        ];
      }
      return [[]];
    },
  } as unknown as mysql.Pool;

  // Normal Under (service_id 127) must ignore underRetain even if passed
  await persistRetainCountsByServiceIndex(
    145501,
    {
      retainLashCountLeft: 65,
      retainLashCountRight: 70,
      underRetainLashCountLeft: 20,
      underRetainLashCountRight: 22,
    },
    () => fakePool,
    'Normal'
  );
  const insertsNormal = queries.filter((q) => q.sql.includes('INSERT INTO item_attribute_value'));
  assert.equal(insertsNormal.length, 1);
  assert.equal(insertsNormal[0].params[0], 5001);

  queries.length = 0;
  await persistRetainCountsByServiceIndex(
    145501,
    {
      underRetainLashCountLeft: 25,
      underRetainLashCountRight: 28,
    },
    () => fakePool,
    'Retain'
  );
  const insertsRetain = queries.filter((q) => q.sql.includes('INSERT INTO item_attribute_value'));
  assert.equal(insertsRetain.length, 1);
  assert.equal(insertsRetain[0].params[0], 5002);
  assert.equal(insertsRetain[0].params[1], '25');
  assert.equal(insertsRetain[0].params[4], '28');
});

test('Legacy CDN URL formula, 3-photo backward compat & WingsBeauty cross-app Round 2 hydration', () => {
  assert.equal(
    buildLegacyServiceProgressImageUrl(1401645, '1401645', 'jpg'),
    'https://cdn.wingslashes.com/uploads/order/service-progress/645/original/1401645.jpg'
  );

  // Completed historical 3-photo mOS order must stay non-blocking
  const historicalRound = resolveActiveServicingRound({
    status: 'DONE',
    orderState: 'Completed',
    attributes: { hasUnderMink: true },
    progress: {
      elapsedSeconds: 3600,
      timerRunning: false,
      beforePhotoUrl: '/api/ios/photos/b.jpg',
      cleanedPhotoUrl: '/api/ios/photos/c.jpg',
      afterPhotoUrl: '/api/ios/photos/a.jpg',
    } as IosBookingProgress,
  });
  assert.equal(historicalRound, 'UPPER');

  // WingsBeauty completed Round 1 -> hydrates Round 2 into mOS
  const hydrated = mergeHydratedBookingProgress(
    {
      beforePhotoUrl: 'https://cdn.wingslashes.com/uploads/order/service-progress/1/original/1.jpg',
      upperCompleted: true,
      lastLegacyUpperState: 'ServiceCompleted',
      activeServiceRound: 'UNDER',
    },
    null
  );
  assert.equal(hydrated?.upperCompleted, true);
  assert.equal(hydrated?.activeServiceRound, 'UNDER');
});
