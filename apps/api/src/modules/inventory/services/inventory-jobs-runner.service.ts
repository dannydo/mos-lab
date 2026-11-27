import type { FastifyInstance } from 'fastify';
import {
  evaluateLegacyInventoryPermissions,
  INVENTORY_JOB_DEFINITIONS,
  INVENTORY_JOB_KEYS,
  type InventoryJobHistoryEntryDto,
  type InventoryJobKey,
  type InventoryJobRunRequest,
  type InventoryJobRunResultDto,
  type InventoryJobsStatusResponse,
  type InventoryJobTriggerSource,
} from '@mos-lab/shared';
import type { InventoryAuthContext } from './inventory-auth.service.js';
import { getInventoryDbMeta } from './inventory-db.js';
import {
  runProcessEndOfMonthJob,
  runProcessStockCheckingJob,
  runPushWarehouseOrderJob,
} from './inventory-job-automation.service.js';
import {
  formatYmd,
  runReportItemForecastJob,
  runReportWarehouseItemJob,
  runReportWarehouseItemStateJob,
  runReportWarehouseJob,
} from './inventory-job-reports.service.js';
import { inventorySseBroker } from './inventory-sse.service.js';

const MAX_HISTORY = 50;
const runningJobs = new Set<InventoryJobKey>();
const jobHistory: InventoryJobHistoryEntryDto[] = [];

export function isValidInventoryJobKey(value: string): value is InventoryJobKey {
  return (INVENTORY_JOB_KEYS as readonly string[]).includes(value);
}

function recordHistory(
  ctx: InventoryAuthContext,
  triggerSource: InventoryJobTriggerSource,
  result: InventoryJobRunResultDto
): void {
  const entry: InventoryJobHistoryEntryDto = {
    runId: `${result.jobKey}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    triggeredBy: ctx.auth.displayName || ctx.auth.username || 'System',
    triggerSource,
    result,
  };
  jobHistory.unshift(entry);
  if (jobHistory.length > MAX_HISTORY) {
    jobHistory.length = MAX_HISTORY;
  }
}

async function runSingleJob(
  ctx: InventoryAuthContext,
  jobKey: InventoryJobKey,
  req: InventoryJobRunRequest
): Promise<InventoryJobRunResultDto> {
  switch (jobKey) {
    case 'report-warehouse-item-state':
      return runReportWarehouseItemStateJob(req);
    case 'report-warehouse-item':
      return runReportWarehouseItemJob(req);
    case 'report-warehouse':
      return runReportWarehouseJob(req);
    case 'report-item-forecast':
      return runReportItemForecastJob(req);
    case 'process-end-of-month':
      return runProcessEndOfMonthJob(ctx, req);
    case 'process-stock-checking':
      return runProcessStockCheckingJob(ctx, req);
    case 'push-warehouse-order':
      return runPushWarehouseOrderJob(req);
  }
}

export async function executeInventoryJob(
  ctx: InventoryAuthContext,
  jobKey: string,
  req: InventoryJobRunRequest = {},
  triggerSource: InventoryJobTriggerSource = 'manual'
): Promise<InventoryJobRunResultDto> {
  if (!isValidInventoryJobKey(jobKey)) {
    throw Object.assign(new Error(`Invalid inventory job key: ${jobKey}`), { statusCode: 400 });
  }
  if (runningJobs.has(jobKey)) {
    throw Object.assign(new Error(`Job "${jobKey}" đang chạy, vui lòng đợi hoàn tất.`), { statusCode: 409 });
  }

  runningJobs.add(jobKey);
  const startedAt = new Date();
  try {
    const primary = await runSingleJob(ctx, jobKey, req);
    if (req.chainDownstream) {
      const chained: InventoryJobRunResultDto[] = [];
      if (jobKey === 'report-warehouse-item-state') {
        chained.push(await runReportWarehouseItemJob(req));
        chained.push(await runReportWarehouseJob(req));
      } else if (jobKey === 'report-warehouse-item') {
        chained.push(await runReportWarehouseJob(req));
      }
      if (chained.length > 0) {
        primary.chainedResults = chained;
      }
    }
    recordHistory(ctx, triggerSource, primary);
    if (!primary.dryRun) {
      inventorySseBroker.publish('job-completed', {
        jobKey: primary.jobKey,
        status: primary.status,
        targetDate: primary.targetDate,
        warehouseId: primary.warehouseId,
      });
    }
    return primary;
  } catch (err: unknown) {
    const finishedAt = new Date();
    const def = INVENTORY_JOB_DEFINITIONS.find((d) => d.key === jobKey)!;
    const message = err instanceof Error ? err.message : 'Inventory job failed';
    const failedResult: InventoryJobRunResultDto = {
      jobKey,
      legacyScript: def.legacyScript,
      dryRun: Boolean(req.dryRun),
      status: 'failed',
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      targetDate: req.date || formatYmd(startedAt),
      warehouseId: req.warehouseId || null,
      summary: `Lỗi chạy job: ${message}`,
      metrics: {},
      error: message,
    };
    recordHistory(ctx, triggerSource, failedResult);
    throw err;
  } finally {
    runningJobs.delete(jobKey);
  }
}

export function getInventoryJobsStatus(): InventoryJobsStatusResponse {
  return {
    success: true,
    cronEnabled: process.env.INVENTORY_CRON_ENABLED === 'true',
    database: getInventoryDbMeta(),
    runningJobKeys: [...runningJobs],
    jobs: [...INVENTORY_JOB_DEFINITIONS],
    history: [...jobHistory],
  };
}

export function buildSystemInventoryCronContext(): InventoryAuthContext {
  return {
    auth: { id: 0, legacyStaffId: 86, role: 'super_admin', displayName: 'Inventory Cron' },
    crmStaffId: 0,
    actorLegacyUserId: 86,
    effectiveUserId: 86,
    effectiveGroupId: 7,
    clientId: 11,
    clientBusinessId: 1,
    clientStoreId: null,
    allowedStoreIds: [],
    isClientConsultant: false,
    previewRole: 'admin',
    previewStoreId: null,
    permissions: evaluateLegacyInventoryPermissions(7, null),
  };
}

function getHoChiMinhParts(now = new Date()): { ymd: string; hhmm: string; dayOfWeek: number } {
  const vn = new Date(now.getTime() + (now.getTimezoneOffset() + 420) * 60_000);
  const ymd = formatYmd(vn);
  const hh = String(vn.getHours()).padStart(2, '0');
  const mm = String(vn.getMinutes()).padStart(2, '0');
  return { ymd, hhmm: `${hh}:${mm}`, dayOfWeek: vn.getDay() };
}

export function startInventoryCronScheduler(server: FastifyInstance): void {
  if (process.env.INVENTORY_CRON_ENABLED !== 'true') {
    server.log.info('Inventory cron scheduler disabled (opt-in via INVENTORY_CRON_ENABLED=true).');
    return;
  }

  const sysCtx = buildSystemInventoryCronContext();
  let lastTickKey = '';
  const tick = async () => {
    const { ymd, hhmm, dayOfWeek } = getHoChiMinhParts();
    const tickKey = `${ymd} ${hhmm}`;
    if (tickKey === lastTickKey) return;
    lastTickKey = tickKey;

    const trigger = (jobKey: InventoryJobKey, req: InventoryJobRunRequest = { dryRun: false }) =>
      executeInventoryJob(sysCtx, jobKey, req, 'cron').catch((error) =>
        server.log.error({ error, jobKey }, 'Scheduled inventory cron job failed')
      );

    if (hhmm === '00:05') await trigger('report-warehouse-item-state', { dryRun: false, chainDownstream: true });
    if (hhmm === '01:30') await trigger('report-item-forecast', { dryRun: false });
    if (hhmm === '00:00' || hhmm === '08:30') await trigger('process-end-of-month', { dryRun: false });
    if (hhmm === '08:00') await trigger('push-warehouse-order', { dryRun: false });
    if (hhmm === '02:00' && dayOfWeek === 1) await trigger('process-stock-checking', { dryRun: false });
  };

  const timer = setInterval(() => {
    void tick();
  }, 60_000);
  timer.unref();

  server.addHook('onClose', async () => {
    clearInterval(timer);
  });
  server.log.info('Inventory cron scheduler started (UTC+7 minute tick).');
}
