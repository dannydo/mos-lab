import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { InboxIdeReleaseService } from '../apps/api/src/modules/bug-reports/inbox-ide-release.service.js';
import { InboxImplementationService } from '../apps/api/src/modules/bug-reports/inbox-implementation.service.js';

async function main() {
  const [reportArg, commitSha, acceptArg] = process.argv.slice(2);
  const reportId = Number(reportArg);
  if (!Number.isSafeInteger(reportId) || reportId <= 0 || !/^[a-f0-9]{40}$/.test(commitSha || '')) {
    throw new Error('Dùng: pnpm tsx scripts/record-direct-inbox-hotfix.ts <ticket-id> <full-commit-sha> [--accept]');
  }
  const require = createRequire(resolve('apps/api/package.json'));
  const env = require('dotenv').parse(readFileSync('apps/api/.env', 'utf8')) as Record<string, string>;
  const { PrismaClient } =
    require('./src/generated/crm-client/index.js') as typeof import('../apps/api/src/generated/crm-client/index.js');
  const crm = new PrismaClient({ datasources: { db: { url: env.CRM_DATABASE_URL } } });
  try {
    const pm2 = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8', timeout: 5_000 })) as Array<{
      name?: string;
      pm2_env?: { DEPLOY_COMMIT?: string };
    }>;
    const marker = pm2.find((entry) => entry.name === 'mos-lab-api')?.pm2_env?.DEPLOY_COMMIT;
    if (!/^[a-f0-9]{40}$/.test(marker || '')) throw new Error('Không đọc được DEPLOY_COMMIT đáng tin cậy từ PM2.');
    process.env.DEPLOY_COMMIT = marker;
    const report = await crm.crmBugReport.findUnique({ where: { id: reportId }, select: { reporterStaffId: true } });
    if (!report) throw new Error('Không tìm thấy ticket.');
    const fastify = { prisma: { crm } } as never;
    await InboxIdeReleaseService.recordDirectTechnicalHotfix(fastify, reportId, report.reporterStaffId, commitSha);
    await InboxIdeReleaseService.recordDirectTechnicalHotfix(fastify, reportId, report.reporterStaffId, commitSha);
    const checkpoint = await crm.crmBugReport.findUnique({
      where: { id: reportId },
      select: { status: true, implementationActiveJobId: true, resolvedAt: true },
    });
    if (checkpoint?.status !== 'FIXED' || checkpoint.implementationActiveJobId || !checkpoint.resolvedAt)
      throw new Error('Checkpoint hotfix chưa đạt trạng thái chờ người báo nghiệm thu.');
    if (acceptArg === '--accept') {
      await InboxImplementationService.reviewReporterAcceptance(fastify, reportId, report.reporterStaffId, {
        decision: 'APPROVE',
        note: 'Danny đã nghiệm thu trực tiếp hotfix kỹ thuật MOS Inbox sau khi kiểm chứng checkpoint IDE và retry.',
      });
    } else if (acceptArg) {
      throw new Error('Tham số cuối chỉ có thể là --accept.');
    }
    console.log(
      JSON.stringify({ reportId, checkpoint: acceptArg === '--accept' ? 'CLOSED' : 'AWAITING_REPORTER_ACCEPTANCE' })
    );
  } finally {
    await crm.$disconnect();
  }
}

void main();
