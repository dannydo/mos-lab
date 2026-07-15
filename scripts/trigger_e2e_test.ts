import { execSync } from 'child_process';

const WEBHOOK_URL = 'https://api.lab.masteros.app/api/omicall/webhook';
const WEBHOOK_SECRET = 'evaded07kinglSEBHS';
const TEST_CALL_UUID = `e2e-test-obama-laugh-${Date.now()}`;

async function runTest() {
  console.log('🚀 Starting OmiCall E2E Integration Test...');
  console.log(`Payload Call UUID: ${TEST_CALL_UUID}`);

  // 1. Send mock webhook request
  console.log('🔗 Sending mock webhook payload to production Fastify...');
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': WEBHOOK_SECRET
    },
    body: JSON.stringify({
      call_uuid: TEST_CALL_UUID,
      direction: 'outbound',
      status: 'ANSWER',
      source_number: '101',
      destination_number: '0987654321',
      duration: 60,
      bill_sec: 45,
      // Using public sample wav for laughter count validation
      recording_url: 'https://raw.githubusercontent.com/rafaelreis-hotmart/Audio-Sample-files/master/sample.wav',
      time_start_call: new Date().toISOString(),
      time_end_call: new Date(Date.now() + 45000).toISOString()
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Webhook request failed with status ${response.status}:`, errorText);
    process.exit(1);
  }

  const resultData = await response.json();
  console.log('✅ Webhook accepted successfully. Response:', resultData);

  // 2. Poll the database on the production VPS to track progress
  console.log('⏳ Polling production database for background processing updates...');
  let attempts = 0;
  const maxAttempts = 18; // 3 minutes total (polling every 10s)
  
  const queryDb = () => {
    try {
      const sql = `SELECT analysis_status, status, happy_call_status, laugh_count, duration, bill_sec, LEFT(transcript, 60) AS excerpt, analysis_error FROM crm_omicall_logs WHERE call_uuid = '${TEST_CALL_UUID}'`;
      const output = execSync(`ssh live-wings "echo \\"${sql}\\" | mysql -u root -pWingsLive2026Base -D mos_lab"`).toString();
      return output;
    } catch (err) {
      console.error('Failed to query remote database:', err.message);
      return null;
    }
  };

  const interval = setInterval(() => {
    attempts++;
    console.log(`\n--- [Attempt ${attempts}/${maxAttempts}] ---`);
    const output = queryDb();

    if (output) {
      console.log(output.trim());
      
      if (output.includes('DONE')) {
        console.log('\n🎉 E2E TEST SUCCESSFUL! AI Laughter Detection completed successfully.');
        clearInterval(interval);
        process.exit(0);
      } else if (output.includes('FAILED')) {
        console.error('\n❌ E2E TEST FAILED! AI processing failed or timed out.');
        clearInterval(interval);
        process.exit(1);
      } else if (output.includes('SKIPPED')) {
        console.log('\n⚠️ E2E TEST SKIPPED (Call was not answered or skipped).');
        clearInterval(interval);
        process.exit(0);
      }
    } else {
      console.log('No record found in database yet.');
    }

    if (attempts >= maxAttempts) {
      console.error('\n❌ E2E TEST TIMEOUT! Background worker did not complete in 3 minutes.');
      clearInterval(interval);
      process.exit(1);
    }
  }, 10000);
}

runTest().catch(err => {
  console.error('Fatal error during E2E test:', err);
  process.exit(1);
});
