import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDeploymentLaneMeasurementPlan, classifyDeploymentLane } from '@mos-lab/shared';

test('classifies a web-only source diff without widening to VPS work', () => {
  const decision = classifyDeploymentLane(['apps/web/app/dashboard/page.tsx', 'apps/web/components/Notice.tsx']);
  assert.equal(decision.lane, 'WEB_ONLY');
  assert.match(decision.willSkip.join(' '), /VPS API deployment/);
});

test('classifies registered API and worker files without scheduling Vercel', () => {
  const decision = classifyDeploymentLane([
    'apps/api/src/modules/bug-reports/routes.ts',
    'scripts/request-classifier-worker.ts',
  ]);
  assert.equal(decision.lane, 'API_WORKER_ONLY');
  assert.match(decision.willSkip.join(' '), /Vercel/);
});

test('fails closed to full deploy for shared, empty, or not-yet-managed content changes', () => {
  assert.equal(classifyDeploymentLane(['packages/shared/src/types/bug-report.ts']).lane, 'FULL_DEPLOY');
  assert.equal(classifyDeploymentLane([]).lane, 'FULL_DEPLOY');
  assert.equal(classifyDeploymentLane(['content/ui-copy/inbox.json']).lane, 'FULL_DEPLOY');
});

test('defines repeatable before/after timing and safety evidence without activating a lane', () => {
  const decision = classifyDeploymentLane(['apps/web/components/Notice.tsx']);
  const measurement = buildDeploymentLaneMeasurementPlan(decision);

  assert.equal(measurement.lane, 'WEB_ONLY');
  assert.equal(measurement.baselineLane, 'FULL_DEPLOY');
  assert.equal(measurement.sampleSizePerLane, 10);
  assert.ok(measurement.metrics.includes('TOTAL_LEAD_TIME_SECONDS'));
  assert.ok(measurement.metrics.includes('SUCCESS_RATE'));
  assert.ok(measurement.metrics.includes('ROLLBACK_SECONDS'));
  assert.match(measurement.comparisonRule, /median and p95/);
  assert.match(measurement.safetyRule, /Do not activate/);
  assert.equal(decision.mode, 'SHADOW');
});

test('rejects invalid measurement sample sizes', () => {
  const decision = classifyDeploymentLane(['apps/api/src/server.ts']);
  assert.throws(() => buildDeploymentLaneMeasurementPlan(decision, 0), RangeError);
  assert.throws(() => buildDeploymentLaneMeasurementPlan(decision, 1.5), RangeError);
});
