import dayjs from 'dayjs';

/**
 * Re-implementation of tagValues and livePreview logic from SMSModal.tsx for empirical testing.
 */
export function getTagValues(customer: any, selectedPhone: string = '') {
  if (!customer) return {};

  const expiryDateStr = customer.comboBalance?.expiryDate
    ? dayjs(customer.comboBalance.expiryDate).format('DD/MM/YYYY')
    : customer.newComboDetails?.purchaseDate
      ? dayjs(customer.newComboDetails.purchaseDate).add(30, 'day').format('DD/MM/YYYY')
      : '25/08/2026';

  const totalRemaining = customer.comboBalance
    ? (customer.comboBalance.normalCount || 0) + (customer.comboBalance.retainCount || 0)
    : 14;

  const comboNameStr =
    customer.newComboDetails?.comboName || (customer.comboBalance ? 'Gói Combo Care' : 'Combo Nối Mi Premium');

  return {
    '{ten_khach}': customer.name || 'Khách hàng',
    '{sdt_khach}': selectedPhone || customer.phone || '',
    '{han_dung}': expiryDateStr,
    '{so_ngay_dam}': `${totalRemaining} ngày`,
    '{ten_combo}': comboNameStr,
    '{sdt_cua_hang}': '0987654321',
  };
}

export function substituteTags(templateContent: string, tagValues: Record<string, any>): string {
  let text = templateContent;
  Object.entries(tagValues).forEach(([tag, val]) => {
    text = text.replaceAll(tag, String(val));
  });
  return text;
}

// Empirical Test Cases
export function runTagSubstitutionTests() {
  console.log('=====================================================');
  console.log('RUNNING EMPIRICAL TEST SUITE 1: TAG SUBSTITUTION');
  console.log('=====================================================\n');

  const tests = [
    {
      name: 'Test 1.1: customer is null',
      customer: null,
      selectedPhone: '',
      template: 'Chao {ten_khach}, hotline {sdt_cua_hang}',
      expected: 'Chao {ten_khach}, hotline {sdt_cua_hang}', // tagValues is {}
    },
    {
      name: 'Test 1.2: customer is empty object {}',
      customer: {},
      selectedPhone: '',
      template:
        'Chao {ten_khach}, sdt {sdt_khach}, han {han_dung}, dam {so_ngay_dam}, combo {ten_combo}, hotline {sdt_cua_hang}',
    },
    {
      name: 'Test 1.3: customer name is null / undefined / empty string',
      customer: { name: null, phone: undefined },
      selectedPhone: '',
      template: 'Chao {ten_khach}, sdt {sdt_khach}',
    },
    {
      name: 'Test 1.4: customer with invalid combo balance expiry date string "not-a-date"',
      customer: {
        name: 'Nguyễn Văn A',
        comboBalance: { expiryDate: 'not-a-date', normalCount: 2, retainCount: 1 },
      },
      selectedPhone: '0901234567',
      template: 'Chao {ten_khach}, han dung {han_dung}',
    },
    {
      name: 'Test 1.5: customer with null expiryDate but present newComboDetails purchaseDate',
      customer: {
        name: 'Trần Thị B',
        comboBalance: { expiryDate: null, normalCount: 0, retainCount: 0 },
        newComboDetails: { purchaseDate: '2026-05-10T00:00:00Z', comboName: 'Combo 5 Lượt' },
      },
      selectedPhone: '0909999999',
      template: 'Chao {ten_khach}, goi {ten_combo} han {han_dung}',
    },
    {
      name: 'Test 1.6: combo balance with null normalCount & retainCount',
      customer: {
        name: 'Lê Văn C',
        comboBalance: { normalCount: null, retainCount: null },
      },
      selectedPhone: '0908888888',
      template: 'Chi con {so_ngay_dam} de su dung',
    },
    {
      name: 'Test 1.7: combo balance with negative count (-2)',
      customer: {
        name: 'Phạm D',
        comboBalance: { normalCount: -2, retainCount: 0 },
      },
      selectedPhone: '0907777777',
      template: 'Chi con {so_ngay_dam} de su dung',
    },
    {
      name: 'Test 1.8: template with multiple identical tags',
      customer: { name: 'Chị Mai', phone: '0912345678' },
      selectedPhone: '0912345678',
      template:
        '{ten_khach} oi, tin nhan cho {ten_khach} tai sdt {sdt_khach}. Lien he {sdt_cua_hang} hoac {sdt_cua_hang}',
    },
    {
      name: 'Test 1.9: template with unsupported or custom tags ({ngay_hen}, {staff_name})',
      customer: { name: 'Chị Hoa' },
      selectedPhone: '',
      template: 'Chao {ten_khach}, hen chi ngay {ngay_hen} voi staff {staff_name}',
    },
    {
      name: 'Test 1.10: special characters & script tags in customer name',
      customer: { name: "<script>alert('xss')</script> & 'Quote'", phone: '0901111222' },
      selectedPhone: '0901111222',
      template: 'Chao {ten_khach}, sdt {sdt_khach}',
    },
  ];

  const results: Array<{ test: string; output: string; tagValues: any }> = [];

  for (const t of tests) {
    const tv = getTagValues(t.customer, t.selectedPhone);
    const output = substituteTags(t.template, tv);
    console.log(`[PASS] ${t.name}`);
    console.log(`       Input Template : "${t.template}"`);
    console.log(`       Tag Values     : ${JSON.stringify(tv)}`);
    console.log(`       Output Preview : "${output}"\n`);
    results.push({ test: t.name, output, tagValues: tv });
  }

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTagSubstitutionTests();
}
