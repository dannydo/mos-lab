/**
 * A conservative deployment decision.  This is intentionally pure so the
 * Worker, API and Inbox can explain the same decision without trusting a
 * ticket title or a client-side guess.
 */
export const DEPLOYMENT_LANES = ['WEB_ONLY', 'API_WORKER_ONLY', 'UI_COPY_CONTENT_ONLY', 'FULL_DEPLOY'] as const;
export type DeploymentLane = (typeof DEPLOYMENT_LANES)[number];

export interface DeploymentLaneDecision {
  lane: DeploymentLane;
  /** Fast lanes start in shadow mode until their provider-specific rollback is proven. */
  mode: 'SHADOW';
  reason: string;
  changedFiles: string[];
  willRun: string[];
  willSkip: string[];
  rollback: string;
}

export const DEPLOYMENT_MEASUREMENT_METRICS = [
  'TOTAL_LEAD_TIME_SECONDS',
  'VERIFICATION_SECONDS',
  'VERCEL_BUILD_PUBLISH_SECONDS',
  'VPS_DEPLOY_RESTART_SECONDS',
  'HEALTH_CHECK_SECONDS',
  'SUCCESS_RATE',
  'ROLLBACK_SECONDS',
] as const;
export type DeploymentMeasurementMetric = (typeof DEPLOYMENT_MEASUREMENT_METRICS)[number];

export interface DeploymentLaneMeasurementPlan {
  lane: DeploymentLane;
  baselineLane: 'FULL_DEPLOY';
  sampleSizePerLane: number;
  metrics: DeploymentMeasurementMetric[];
  comparisonRule: string;
  safetyRule: string;
}

const WEB_PREFIX = 'apps/web/';
const API_PREFIX = 'apps/api/';
const WORKER_FILE = 'scripts/request-classifier-worker.ts';

function normalizedFiles(files: readonly string[]): string[] {
  return [...new Set(files.map((file) => file.trim()).filter(Boolean))].sort();
}

export function classifyDeploymentLane(files: readonly string[]): DeploymentLaneDecision {
  const changedFiles = normalizedFiles(files);
  const full = (reason: string): DeploymentLaneDecision => ({
    lane: 'FULL_DEPLOY',
    mode: 'SHADOW',
    reason,
    changedFiles,
    willRun: ['Full verification', 'Vercel web publish', 'VPS API deployment', 'release health check'],
    willSkip: [],
    rollback: 'Use the verified web and VPS release rollback procedures together.',
  });

  if (!changedFiles.length) return full('Không có source diff để phân loại an toàn.');

  if (changedFiles.every((file) => file.startsWith(WEB_PREFIX))) {
    return {
      lane: 'WEB_ONLY',
      mode: 'SHADOW',
      reason:
        'Tất cả tệp thay đổi thuộc runtime web; không có API, worker, shared contract, schema hay cấu hình deploy.',
      changedFiles,
      willRun: ['Web verification', 'Vercel web publish', 'web health check'],
      willSkip: ['VPS API deployment', 'API restart', 'worker restart'],
      rollback: 'Restore the previously verified Vercel deployment.',
    };
  }

  if (changedFiles.every((file) => file.startsWith(API_PREFIX) || file === WORKER_FILE)) {
    return {
      lane: 'API_WORKER_ONLY',
      mode: 'SHADOW',
      reason: 'Tất cả tệp thay đổi thuộc API hoặc worker đã đăng ký; không có web runtime hay shared contract.',
      changedFiles,
      willRun: ['API/worker verification', 'VPS API/worker deployment', 'API health check'],
      willSkip: ['Vercel web build and publish'],
      rollback: 'Restore the previously verified backend release and restart only affected processes.',
    };
  }

  if (changedFiles.every((file) => file.startsWith('content/ui-copy/'))) {
    return full(
      'UI Copy runtime chưa có version, preview và rollback đã kiểm chứng; content source vẫn phải fail closed sang Full deploy.'
    );
  }

  return full('Thay đổi chạm shared, cấu hình, dependency, schema hoặc nhiều runtime; cần Full deploy để an toàn.');
}

/**
 * Defines the before/after evidence required before a shadow lane may become an
 * active release path. It deliberately contains no deployment side effects.
 */
export function buildDeploymentLaneMeasurementPlan(
  decision: DeploymentLaneDecision,
  sampleSizePerLane = 10
): DeploymentLaneMeasurementPlan {
  if (!Number.isInteger(sampleSizePerLane) || sampleSizePerLane < 1) {
    throw new RangeError('sampleSizePerLane must be a positive integer.');
  }

  return {
    lane: decision.lane,
    baselineLane: 'FULL_DEPLOY',
    sampleSizePerLane,
    metrics: [...DEPLOYMENT_MEASUREMENT_METRICS],
    comparisonRule:
      'Compare median and p95 total lead time against equivalent FULL_DEPLOY releases, using the same start and healthy-release timestamps.',
    safetyRule:
      'Do not activate a fast lane unless success rate is no worse than baseline and rollback has been rehearsed with a recorded duration.',
  };
}
