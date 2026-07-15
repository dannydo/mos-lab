import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient as CrmPrismaClient } from './generated/crm-client/index.js';
import { analyzeLogRecord } from './modules/omicall/analyzer.js';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  console.log('🔌 Connecting to database...');
  const crm = new CrmPrismaClient({
    datasources: {
      db: {
        url: process.env.CRM_DATABASE_URL,
      },
    },
  });

  await crm.$connect();
  console.log('✅ Connected.');

  console.log('🔍 Fetching latest OmiCall log with recordingUrl...');
  const log = await crm.crmOmicallLog.findFirst({
    where: {
      status: 'ANSWER',
      recordingUrl: { not: null }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!log) {
    console.log('❌ No answer log with recordingUrl found in database.');
    console.log('Creating a mock log for testing...');
    const mockLog = await crm.crmOmicallLog.create({
      data: {
        callUuid: 'test-call-uuid-' + Date.now(),
        direction: 'outbound',
        status: 'ANSWER',
        sourceNumber: '101',
        destinationNumber: '0987654321',
        duration: 45,
        billSec: 40,
        recordingUrl: 'https://github.com/rafaelreis-hotmart/Audio-Sample-files/raw/master/sample.wav',
        analysisStatus: 'PENDING'
      }
    });
    console.log('Mock log created:', mockLog);
    await runAnalysis(crm, mockLog);
  } else {
    console.log('Found log details:', {
      id: log.id,
      callUuid: log.callUuid,
      recordingUrl: log.recordingUrl
    });
    await runAnalysis(crm, log);
  }

  await crm.$disconnect();
}

async function runAnalysis(crm: any, log: any) {
  console.log('🤖 Triggering Gemini API analysis via analyzeLogRecord...');
  const fastifyMock = {
    prisma: {
      crm
    },
    log: console
  } as any;

  const start = Date.now();
  try {
    await analyzeLogRecord(fastifyMock, log);
    console.log(`\n✅ Analysis completed successfully (took ${Date.now() - start}ms)`);
    
    // Fetch and display updated log details
    const updated = await crm.crmOmicallLog.findUnique({
      where: { id: log.id }
    });
    console.log('Updated database record fields:');
    console.log(JSON.stringify({
      id: updated.id,
      analysisStatus: updated.analysisStatus,
      laughCount: updated.laughCount,
      laughCountAgent: updated.laughCountAgent,
      laughCountCustomer: updated.laughCountCustomer,
      laughTimestamps: updated.laughTimestamps ? JSON.parse(updated.laughTimestamps) : [],
      customerSatisfactionScore: updated.customerSatisfactionScore,
      customerSentiment: updated.customerSentiment,
      satisfactionAnalysis: updated.satisfactionAnalysis,
      happyCallStatus: updated.happyCallStatus,
      happyCallReason: updated.happyCallReason,
      transcript: updated.transcript ? updated.transcript.substring(0, 150) + '...' : null
    }, null, 2));
  } catch (err: any) {
    console.error('❌ Analysis failed:', err.message || err);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
