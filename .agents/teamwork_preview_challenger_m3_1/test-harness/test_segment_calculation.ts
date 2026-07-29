/**
 * Current implementation in SMSModal.tsx
 */
export function calculateSegmentsCurrent(text: string) {
  const characterCount = text.length;
  if (characterCount === 0) return { characterCount: 0, smsSegments: 0, encoding: 'GSM-7 (assumed)' };
  const smsSegments = characterCount <= 160 ? 1 : Math.ceil(characterCount / 153);
  return { characterCount, smsSegments, encoding: 'GSM-7 (assumed)' };
}

/**
 * Standard Telecommunication SMS Specification Standard (GSM 03.38 vs UCS-2)
 */

// Basic GSM-7 character set regex (excluding extensions)
const GSM_7BIT_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
// GSM-7 Extension characters (count as 2 characters in GSM-7)
const GSM_7BIT_EXT = '^{}\\[~]|€';

export function isGsm7String(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (!GSM_7BIT_BASIC.includes(char) && !GSM_7BIT_EXT.includes(char)) {
      return false; // Found Unicode / non-GSM character
    }
  }
  return true;
}

export function calculateGsm7Length(text: string): number {
  let len = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (GSM_7BIT_EXT.includes(char)) {
      len += 2; // Extension char takes 2 septets
    } else {
      len += 1;
    }
  }
  return len;
}

export function calculateSegmentsStandard(text: string) {
  const codePointsCount = Array.from(text).length;
  if (codePointsCount === 0) {
    return { characterCount: 0, smsSegments: 0, encoding: 'GSM-7' };
  }

  const isGsm = isGsm7String(text);

  if (isGsm) {
    const gsmLen = calculateGsm7Length(text);
    const smsSegments = gsmLen <= 160 ? 1 : Math.ceil(gsmLen / 153);
    return { characterCount: gsmLen, smsSegments, encoding: 'GSM-7' };
  } else {
    // UCS-2 (Unicode)
    // Single SMS: max 70 chars. Multi-part SMS: max 67 chars per segment.
    const smsSegments = codePointsCount <= 70 ? 1 : Math.ceil(codePointsCount / 67);
    return { characterCount: codePointsCount, smsSegments, encoding: 'UCS-2 (Unicode)' };
  }
}

// Empirical Test Cases
export function runSegmentCalculationTests() {
  console.log('=====================================================');
  console.log('RUNNING EMPIRICAL TEST SUITE 2: SMS SEGMENT CALCULATION');
  console.log('=====================================================\n');

  const testCases = [
    {
      name: 'Test 2.1: Empty message',
      text: '',
    },
    {
      name: 'Test 2.2: Pure English GSM-7 (160 chars - exact 1 GSM SMS boundary)',
      text: 'A'.repeat(160),
    },
    {
      name: 'Test 2.3: Pure English GSM-7 (161 chars - exact 2 GSM SMS boundary)',
      text: 'A'.repeat(161),
    },
    {
      name: 'Test 2.4: GSM-7 with extension brackets {ten_khach} (150 raw chars, 162 GSM chars)',
      // { and } count as 2 GSM chars each. 6 brackets = 12 GSM chars + 144 normal = 156 GSM chars.
      // Let's create a string with 156 GSM chars:
      text:
        'Chao {ten_khach}, chuong trinh uu dai dam mi tai tiemsalon sap het han ({han_dung}). Chi vui long dat lich truoc qua hotline {sdt_cua_hang}. ' +
        'X'.repeat(10),
    },
    {
      name: 'Test 2.5: Vietnamese accented text (Unicode UCS-2) - 65 chars (under 70 limit)',
      text: 'Chào chị Mai, chương trình ưu đãi dặm mi tại tiệm sắp hết hạn.',
    },
    {
      name: 'Test 2.6: Vietnamese accented text (Unicode UCS-2) - 75 chars (over 70 limit -> 2 SMS)',
      text: 'Chào chị Mai, gói combo Nối Mi Premium của chị sắp hết hạn vào ngày 25/08/2026.',
    },
    {
      name: 'Test 2.7: Typical full Vietnamese SMS template (175 chars UCS-2)',
      text: 'Chào Chị Mai, gói combo Nối Mi Premium của chị sắp hết hạn vào ngày 25/08/2026. Chị còn 14 ngày để sử dụng, vui lòng liên hệ hotline 0987654321 để được hỗ trợ.',
    },
    {
      name: 'Test 2.8: Single emoji in otherwise ASCII message (forcing UCS-2 encoding)',
      text: 'Chao chi Mai, cam on chi da den tiemsalon 🌸. Vui long lien he hotline 0987654321 neu can ho tro them nhe!',
    },
    {
      name: 'Test 2.9: Long Unicode message (300 chars)',
      text: 'Chào '.repeat(60),
    },
  ];

  const results: any[] = [];

  for (const tc of testCases) {
    const current = calculateSegmentsCurrent(tc.text);
    const standard = calculateSegmentsStandard(tc.text);

    const isMatch = current.smsSegments === standard.smsSegments;
    const statusTag = isMatch ? '[PASS MATCH]' : '[FAIL MISMATCH]';

    console.log(`${statusTag} ${tc.name}`);
    console.log(`       Text length (raw JS chars): ${tc.text.length}`);
    console.log(`       Current logic  : ${current.smsSegments} SMS (assumes GSM, len=${current.characterCount})`);
    console.log(
      `       Standard spec  : ${standard.smsSegments} SMS (${standard.encoding}, len=${standard.characterCount})`
    );
    if (!isMatch) {
      console.log(
        `       ⚠️  WARNING: Under-estimating by ${standard.smsSegments - current.smsSegments} SMS segment(s)! Customer/Billing will be charged for ${standard.smsSegments} SMS while UI shows ${current.smsSegments} SMS.`
      );
    }
    console.log('');

    results.push({
      test: tc.name,
      rawLen: tc.text.length,
      current,
      standard,
      isMatch,
    });
  }

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSegmentCalculationTests();
}
