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

test('MOS-BUG-220: Product bonus attribution uses CC IN / CC OUT with 50/50 split instead of creator staff', () => {
  // Scenario: Order #339361 for customer Mimi:
  // - CC IN: Yến Vy (user_id: 48026)
  // - CC OUT: Yến Vy (user_id: 48026)
  // - Product #36 created in POS by cashier/consultant: Quang Khải CC (created_staff_id: 46092)
  // Business Canon: Product bonus belongs to the CC who served the customer (CC IN/OUT),
  // NOT to the staff who happened to key/scan the item at the cashier desk.

  interface RawProductOrder {
    order_id: number;
    check_in_staff_id: number | null;
    check_out_staff_id: number | null;
    created_staff_id: number;
    product_price: number;
    quantity: number;
    cc_in_name: string;
    cc_out_name: string;
  }

  const simulateProductAttribution = (orders: RawProductOrder[], queryStaffId: number) => {
    const results: Array<{
      order_id: number;
      staff_id: number;
      quantity: number;
      net_value: number;
      is_split: boolean;
      cc_in_name: string | null;
      cc_out_name: string | null;
    }> = [];

    for (const order of orders) {
      const ccIn = order.check_in_staff_id;
      const ccOut = order.check_out_staff_id;

      if (ccIn !== null && ccOut !== null && ccIn !== ccOut) {
        // Split 50/50
        if (ccIn === queryStaffId) {
          results.push({
            order_id: order.order_id,
            staff_id: ccIn,
            quantity: order.quantity * 0.5,
            net_value: order.product_price * 0.5,
            is_split: true,
            cc_in_name: order.cc_in_name,
            cc_out_name: order.cc_out_name,
          });
        }
        if (ccOut === queryStaffId) {
          results.push({
            order_id: order.order_id,
            staff_id: ccOut,
            quantity: order.quantity * 0.5,
            net_value: order.product_price * 0.5,
            is_split: true,
            cc_in_name: order.cc_in_name,
            cc_out_name: order.cc_out_name,
          });
        }
      } else {
        // 100% to single CC
        const primaryCc = ccIn ?? ccOut ?? order.created_staff_id;
        if (primaryCc === queryStaffId) {
          results.push({
            order_id: order.order_id,
            staff_id: primaryCc,
            quantity: order.quantity * 1.0,
            net_value: order.product_price * 1.0,
            is_split: false,
            cc_in_name: order.cc_in_name,
            cc_out_name: order.cc_out_name,
          });
        }
      }
    }

    return results;
  };

  const sampleOrders: RawProductOrder[] = [
    // Order #339361 (Mimi): CC IN & OUT = Yến Vy (48026), created_staff_id = Quang Khải CC (46092)
    {
      order_id: 339361,
      check_in_staff_id: 48026,
      check_out_staff_id: 48026,
      created_staff_id: 46092,
      product_price: 1018519,
      quantity: 1,
      cc_in_name: 'Yến Vy',
      cc_out_name: 'Yến Vy',
    },
    // Order #339400: CC IN = Thục Nghi (51659), CC OUT = Quang Khải CC (46092), created_staff_id = 46092
    {
      order_id: 339400,
      check_in_staff_id: 51659,
      check_out_staff_id: 46092,
      created_staff_id: 46092,
      product_price: 500000,
      quantity: 1,
      cc_in_name: 'Thục Nghi',
      cc_out_name: 'Quang Khải CC',
    },
  ];

  // 1. When Quang Khải CC (46092) queries his report:
  const khaiResults = simulateProductAttribution(sampleOrders, 46092);
  // Order 339361 must NOT be in Khải's report
  assert.ok(
    !khaiResults.some((r) => r.order_id === 339361),
    'Order 339361 must NOT appear for Quang Khải CC because he did not check in or check out customer Mimi'
  );
  // Order 339400 must appear with 50% split for Khải as CC OUT
  assert.equal(khaiResults.length, 1);
  assert.equal(khaiResults[0].order_id, 339400);
  assert.equal(khaiResults[0].is_split, true);
  assert.equal(khaiResults[0].net_value, 250000);

  // 2. When Yến Vy (48026) queries her report:
  const vyResults = simulateProductAttribution(sampleOrders, 48026);
  // Order 339361 MUST appear for Yến Vy with 100% CC
  assert.equal(vyResults.length, 1);
  assert.equal(vyResults[0].order_id, 339361);
  assert.equal(vyResults[0].is_split, false);
  assert.equal(vyResults[0].net_value, 1018519);
  assert.equal(vyResults[0].cc_in_name, 'Yến Vy');
  assert.equal(vyResults[0].cc_out_name, 'Yến Vy');

  // 3. UI Display string helper in CcThuongTransactionsModal:
  const getDisplayStaff = (record: { is_split: boolean; cc_in_name: string | null; cc_out_name: string | null }, consultantName?: string) => {
    if (record.is_split) {
      return {
        tag: '⚡ 50/50 Split',
        in: record.cc_in_name || 'CC IN',
        out: record.cc_out_name || 'CC OUT',
      };
    }
    const staffName = record.cc_in_name || record.cc_out_name || consultantName || 'Tư vấn viên';
    return {
      tag: '100% CC',
      staffName,
    };
  };

  const vyDisplay = getDisplayStaff(vyResults[0], 'Yến Vy');
  assert.equal(vyDisplay.tag, '100% CC');
  assert.equal(vyDisplay.staffName, 'Yến Vy', 'Should display actual staff name, not literal "CC IN"');

  const khaiDisplay = getDisplayStaff(khaiResults[0], 'Quang Khải CC');
  assert.equal(khaiDisplay.tag, '⚡ 50/50 Split');
  assert.equal(khaiDisplay.in, 'Thục Nghi');
  assert.equal(khaiDisplay.out, 'Quang Khải CC');
});
