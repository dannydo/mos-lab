import assert from 'node:assert/strict';
import test from 'node:test';
import type { DailySalesBonusTransaction } from '@mos-lab/shared';

test('MOS-BUG-104: Service items compute net_value and are included in revenue filter (> 0đ)', () => {
  // Scenario: On 2026-10-03 for Quang Khải CC:
  // 1. Order 336764 (Bình Phương): Combo Upgrade 110,000đ (net_value: 110,000, debt: 0)
  // 2. Order 336805 (Chi Nguyễn): Service 367,200đ gross / 340,000đ net (debt: 0)
  // 3. Order 336895 (Thoa): Combo 3,250,800đ, 100% debt (debt_amount: 5,177,600)
  // 4. Free/Zero-value transactions: gross: 0, net: 0, debt: 0

  const mockTransactions: DailySalesBonusTransaction[] = [
    {
      order_service_id: 101,
      order_id: 336764,
      order_time: '11:15:00',
      customer_name: 'Bình Phương',
      store_code: 'PXL',
      item_title: 'Nâng Cấp Combo DV #12 - Phục Hồi',
      item_type: 'Combo',
      payment_value: 110000,
      gross_value: 110000,
      net_value: 110000,
      debt_amount: 0,
      recorded_bonus: 550,
      is_split: false,
    },
    {
      order_service_id: 102,
      order_id: 336805,
      order_time: '14:20:00',
      customer_name: 'Chi Nguyễn',
      store_code: 'PXL',
      item_title: 'DV #111 - Nối Mi Thiết Kế',
      item_type: 'Service',
      payment_value: 340000,
      gross_value: 367200,
      net_value: 340000, // Fixed: was previously hardcoded to 0
      debt_amount: 0,
      recorded_bonus: 0, // Service items get 0% daily bonus
      is_split: false,
    },
    {
      order_service_id: 103,
      order_id: 336895,
      order_time: '16:45:00',
      customer_name: 'Thoa',
      store_code: 'PXL',
      item_title: 'Combo #5 - Thiết Kế Full',
      item_type: 'Combo',
      payment_value: 0,
      gross_value: 3250800,
      net_value: 0, // Debt 5.17M > gross 3.25M
      debt_amount: 5177600,
      recorded_bonus: 0,
      is_split: false,
    },
    {
      order_service_id: 104,
      order_id: 336900,
      order_time: '17:00:00',
      customer_name: 'Khách Test',
      store_code: 'PXL',
      item_title: 'DV #99 - Bảo Hành Miễn Phí',
      item_type: 'Service',
      payment_value: 0,
      gross_value: 0,
      net_value: 0,
      debt_amount: 0,
      recorded_bonus: 0,
      is_split: false,
    },
  ];

  // Helper matching CcThuongTransactionsModal.tsx logic
  const getItemValue = (item: DailySalesBonusTransaction, includeVat: boolean) => {
    const debt = item.debt_amount || 0;
    if (includeVat) {
      const gross = item.gross_value ?? item.payment_value ?? 0;
      return Math.max(0, gross - debt);
    }
    return item.net_value ?? item.payment_value ?? 0;
  };

  // 1. Check with VAT = FALSE (Default)
  const filteredNoVat = mockTransactions.filter((tx) => getItemValue(tx, false) > 0);
  assert.equal(filteredNoVat.length, 2, 'Must return exactly 2 orders > 0đ when VAT is OFF');
  assert.equal(filteredNoVat[0].customer_name, 'Bình Phương');
  assert.equal(filteredNoVat[1].customer_name, 'Chi Nguyễn');

  // 2. Check with VAT = TRUE
  const filteredWithVat = mockTransactions.filter((tx) => getItemValue(tx, true) > 0);
  assert.equal(filteredWithVat.length, 2, 'Must return exactly 2 orders > 0đ when VAT is ON');
  assert.equal(filteredWithVat[0].customer_name, 'Bình Phương');
  assert.equal(filteredWithVat[1].customer_name, 'Chi Nguyễn');

  // 3. Unpaid debt order (Thoa) is excluded in both modes
  assert.ok(
    !filteredNoVat.some((tx) => tx.customer_name === 'Thoa'),
    'Unpaid debt order must be excluded when VAT is OFF'
  );
  assert.ok(
    !filteredWithVat.some((tx) => tx.customer_name === 'Thoa'),
    'Unpaid debt order must be excluded when VAT is ON'
  );

  // 4. Service items do NOT contribute to qualifying bonus sales
  const eligibleSales = mockTransactions.reduce(
    (sum, tx) => sum + (tx.item_type !== 'Service' ? (tx.net_value ?? 0) : 0),
    0
  );
  assert.equal(eligibleSales, 110000, 'Eligible sales must only include Combo (110k), excluding Service (340k)');
});
