import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient as CrmPrismaClient } from './generated/crm-client';

dotenv.config({ path: path.join(__dirname, '../.env') });

const aiServerUrl = process.env.AI_SERVER_URL || 'http://75.119.148.205:8500';
const aiServerApiKey = process.env.AI_SERVER_API_KEY;

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

  console.log('🔍 Fetching log ID 11...');
  const log = await crm.crmOmicallLog.findUnique({
    where: { id: 11 }
  });

  if (!log) {
    console.error('❌ Log ID 11 not found.');
    process.exit(1);
  }

  console.log('Log details:', {
    id: log.id,
    callUuid: log.callUuid,
    analysisStatus: log.analysisStatus,
    recordingUrl: log.recordingUrl
  });

  console.log('📡 Calling AI server to analyze...');
  const staffExtension = log.direction === 'outbound' ? log.sourceNumber : log.destinationNumber;
  const customerPhone = log.direction === 'outbound' ? log.destinationNumber : log.sourceNumber;

  const start = Date.now();
  const response = await fetch(`${aiServerUrl}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': aiServerApiKey || '',
    },
    body: JSON.stringify({
      audio_url: log.recordingUrl,
      call_uuid: log.callUuid,
      staff_extension: staffExtension,
      customer_phone: customerPhone,
      duration_sec: log.duration,
      time_start_call: log.timeStartCall ? log.timeStartCall.toISOString() : null,
    }),
  });

  console.log(`Response status: ${response.status} (took ${Date.now() - start}ms)`);
  if (!response.ok) {
    const errText = await response.text();
    console.error('❌ AI Server error response:', errText);
    process.exit(1);
  }

  const ai = (await response.json()) as any;
  console.log('✅ AI Server parsed response:', ai);

  console.log('💾 Attempting to update database record...');
  const updated = await crm.crmOmicallLog.update({
    where: { id: log.id },
    data: {
      laughCount: ai.laugh_count,
      laughTimestamps: JSON.stringify(ai.laugh_timestamps),
      transcript: ai.transcript || null,
      happyCallStatus: 'APPROVED',
      happyCallReason: 'auto_laughter_30s',
      analysisStatus: 'DONE',
    }
  });

  console.log('🎉 Update successful! New status in DB:', updated.analysisStatus);
  await crm.$disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
