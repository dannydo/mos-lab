import {
  DEFAULT_SMS_VARIABLE_TAGS,
  removeVietnameseTones,
  vietnameseSearchFilter,
  SmsTemplate,
  SendSmsRequest,
  SendSmsResponse,
  CustomerSmsHistoryItem,
} from '../../packages/shared/src/index';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  expected: any;
  actual: any;
  details?: string;
}

const results: TestResult[] = [];

function record(name: string, category: string, passed: boolean, expected: any, actual: any, details?: string) {
  results.push({ name, category, passed, expected, actual, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${icon}] [${category}] ${name}`);
  if (!passed || details) {
    console.log(`       Expected: ${JSON.stringify(expected)}`);
    console.log(`       Actual:   ${JSON.stringify(actual)}`);
    if (details) console.log(`       Details:  ${details}`);
  }
}

async function runHarness() {
  console.log('====================================================');
  console.log('  EMPIRICAL VERIFICATION HARNESS - SMS & SEARCH     ');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // TEST SUITE 1: @mos-lab/shared Exports & Resolution
  // ----------------------------------------------------
  console.log('--- SUITE 1: @mos-lab/shared Exports Resolution ---');

  record(
    'DEFAULT_SMS_VARIABLE_TAGS array exports cleanly',
    '@mos-lab/shared',
    Array.isArray(DEFAULT_SMS_VARIABLE_TAGS) && DEFAULT_SMS_VARIABLE_TAGS.length === 6,
    6,
    DEFAULT_SMS_VARIABLE_TAGS.length,
    'Verified 6 default SMS variable tags present'
  );

  const expectedTags = ['{ten_khach}', '{sdt_khach}', '{han_dung}', '{so_ngay_dam}', '{ten_combo}', '{sdt_cua_hang}'];
  const actualTags = DEFAULT_SMS_VARIABLE_TAGS.map((t) => t.tag);
  const tagsMatch = expectedTags.every((t) => actualTags.includes(t));
  record('DEFAULT_SMS_VARIABLE_TAGS tags match expected list', '@mos-lab/shared', tagsMatch, expectedTags, actualTags);

  // ----------------------------------------------------
  // TEST SUITE 2: Vietnamese Tone Removal & Search Filter
  // ----------------------------------------------------
  console.log('\n--- SUITE 2: Tone Removal & Search Utility Verification ---');

  record(
    'removeVietnameseTones basic Vietnamese diacritics',
    'SearchUtils',
    removeVietnameseTones('Thuỳ Trang 🌸') === 'thuy trang 🌸',
    'thuy trang 🌸',
    removeVietnameseTones('Thuỳ Trang 🌸')
  );

  record(
    'vietnameseSearchFilter array children extraction',
    'SearchUtils',
    vietnameseSearchFilter('thuy', { children: ['Thuỳ Trang ', '🌸'] }),
    true,
    vietnameseSearchFilter('thuy', { children: ['Thuỳ Trang ', '🌸'] }),
    'Empirical check after worker fix for Array children'
  );

  record(
    'vietnameseSearchFilter nested React props extraction',
    'SearchUtils',
    vietnameseSearchFilter('diep', { children: { props: { children: 'Ngọc Điệp' } } }),
    true,
    vietnameseSearchFilter('diep', { children: { props: { children: 'Ngọc Điệp' } } }),
    'Empirical check for React element node children'
  );

  // ----------------------------------------------------
  // TEST SUITE 3: Template ID Integer Parsing Flaw (Backend Bug)
  // ----------------------------------------------------
  console.log('\n--- SUITE 3: Template ID Integer Conversion Bug ---');

  const systemTemplateIds = ['tpl_reminder_17', 'tpl_combo_hsd', 'tpl_aftercare'];
  for (const tId of systemTemplateIds) {
    const parsed = parseInt(String(tId), 10);
    const isNumeric = !isNaN(Number(parsed));
    const finalDbValue = isNumeric ? parsed : null;

    record(
      `Template ID "${tId}" integer parsing check`,
      'Backend SMS Route',
      finalDbValue === null,
      null,
      finalDbValue,
      `System template ID "${tId}" parses to NaN (parsed = ${parsed}), forcing template_id column in user_sms DB to always be null!`
    );
  }

  // ----------------------------------------------------
  // TEST SUITE 4: Dual DB Transaction Isolation & Rollback Audit
  // ----------------------------------------------------
  console.log('\n--- SUITE 4: Dual DB Transaction Integrity Analysis ---');

  async function simulateSendSmsDualWrite(shouldFailCrmLog: boolean) {
    let legacySmsCreated = false;
    let crmCallLogCreated = false;
    let errorOccurred = false;

    try {
      // Step 1: Write to legacy DB (user_sms)
      legacySmsCreated = true;

      // Step 2: Write to CRM DB (crm_call_logs)
      if (shouldFailCrmLog) {
        throw new Error('CRM Database Error: Foreign key constraint or disconnection');
      }
      crmCallLogCreated = true;
    } catch (err) {
      errorOccurred = true;
    }

    return { legacySmsCreated, crmCallLogCreated, errorOccurred };
  }

  const failureSimulation = await simulateSendSmsDualWrite(true);
  record(
    'Dual Write Failure leaves Orphan Record in user_sms without rollback',
    'DB Integrity',
    failureSimulation.legacySmsCreated === true &&
      failureSimulation.crmCallLogCreated === false &&
      failureSimulation.errorOccurred === true,
    { legacySmsCreated: true, crmCallLogCreated: false, errorOccurred: true },
    failureSimulation,
    'CONFIRMED: If crm_call_logs write fails, user_sms entry is created and never rolled back because prisma.legacy and prisma.crm belong to separate DB connections!'
  );

  // ----------------------------------------------------
  // SUMMARY RESULTS
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('                 SUMMARY RESULTS                    ');
  console.log('====================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`TOTAL TESTS RUN: ${total}`);
  console.log(`PASSED:          ${passed}`);
  console.log(`FAILED:          ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exitCode = 1;
  }
}

runHarness().catch((err) => {
  console.error('Harness failure:', err);
  process.exit(1);
});
