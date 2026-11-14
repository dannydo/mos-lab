import { describe, expect, it } from 'vitest';
import {
  calculateCvComboTierBonus,
  calculateCvSerumTierBonus,
  computeFreshBillingLineTotals,
  resolveEffectiveServiceTotal,
  resolveServicePriceSplit,
  calculateActorTipBreakdown,
} from '../useIosBillingCheckout';
import { mergeServerBookingsWithLocalState } from '../iosBookingMerge';

describe('useIosBillingCheckout & Tier Bonus Calculations', () => {
  it('tính chính xác hoa hồng bậc gói combo (Combo Tier Bonus)', () => {
    // 0 hoặc âm -> 0đ
    expect(calculateCvComboTierBonus(0)).toBe(0);
    expect(calculateCvComboTierBonus(-100000)).toBe(0);

    // Gói dưới 2 triệu -> 50.000đ (ví dụ 1.800.000đ)
    expect(calculateCvComboTierBonus(1800000)).toBe(50000);

    // Gói từ 2 triệu đến dưới 3 triệu -> 100.000đ
    expect(calculateCvComboTierBonus(2000000)).toBe(100000);
    expect(calculateCvComboTierBonus(2990000)).toBe(100000);

    // Gói từ 3 triệu đến dưới 4 triệu -> 150.000đ
    expect(calculateCvComboTierBonus(3000000)).toBe(150000);
    expect(calculateCvComboTierBonus(3990000)).toBe(150000);

    // Gói trên 4 triệu -> 150.000đ + 50.000đ mỗi triệu vượt thêm
    // 4.000.000đ: 150.000 + 1 * 50.000 = 200.000đ
    expect(calculateCvComboTierBonus(4000000)).toBe(200000);
    // 5.500.000đ: 150.000 + 2 * 50.000 = 250.000đ
    expect(calculateCvComboTierBonus(5500000)).toBe(250000);
    // 6.700.000đ: 150.000 + 3 * 50.000 = 300.000đ
    expect(calculateCvComboTierBonus(6700000)).toBe(300000);
    // 9.430.000đ (Gộp 6.7M + 2.73M): 150.000 + 6 * 50.000 = 450.000đ
    expect(calculateCvComboTierBonus(9430000)).toBe(450000);
  });

  it('tính chính xác thưởng chốt khi khách mua 2 combo gộp tổng doanh thu', () => {
    const comboUpperPrice = 6_700_000;
    const comboUnderPrice = 2_730_000;
    const comboTotalPrice = comboUpperPrice + comboUnderPrice; // 9.430.000đ

    // Đơn lẻ từng gói:
    expect(calculateCvComboTierBonus(comboUpperPrice)).toBe(300000);
    expect(calculateCvComboTierBonus(comboUnderPrice)).toBe(100000);

    // Gộp tổng doanh thu: 9.430.000đ -> 450.000đ (+450K)
    const totalBonus = calculateCvComboTierBonus(comboTotalPrice);
    expect(totalBonus).toBe(450000);
  });

  it('resolveEffectiveServiceTotal ưu tiên comboRedemption trước selectedCombo (Case khách còn Combo Live vừa trừ lượt vừa mua gói gia hạn)', () => {
    // 1. Khách có Combo Live trừ lượt (có phụ thu nâng cấp 120.000đ) VÀ mua thêm gói gia hạn mới (todaySingleServiceWaived = false)
    expect(
      resolveEffectiveServiceTotal({
        servicePrice: 770000,
        upgradePrice: 120000,
        isComboLive: true,
        comboRedemption: { totalCustomerPayToday: 120000 },
        selectedCombo: { price: 4700000, todaySingleServiceWaived: false },
      })
    ).toBe(120000);

    // 2. Khách có Combo Live trừ lượt (0đ) VÀ mua thêm gói gia hạn mới (todaySingleServiceWaived = false) -> Vẫn phải là 0đ từ gói cũ, không thu nhầm 770.000đ lẻ!
    expect(
      resolveEffectiveServiceTotal({
        servicePrice: 770000,
        upgradePrice: 0,
        isComboLive: true,
        comboRedemption: { totalCustomerPayToday: 0 },
        selectedCombo: { price: 4700000, todaySingleServiceWaived: false },
      })
    ).toBe(0);

    // 3. Khách lẻ chưa có gói cũ, mua gói mới và chọn trừ luôn buổi 1 (todaySingleServiceWaived = true) -> 0đ
    expect(
      resolveEffectiveServiceTotal({
        servicePrice: 770000,
        isComboLive: false,
        comboRedemption: null,
        selectedCombo: { price: 4700000, todaySingleServiceWaived: true },
      })
    ).toBe(0);

    // 4. Khách lẻ chưa có gói cũ, mua gói mới nhưng chọn trả lẻ ca hôm nay để giữ nguyên số buổi (todaySingleServiceWaived = false) -> 770.000đ
    expect(
      resolveEffectiveServiceTotal({
        servicePrice: 770000,
        isComboLive: false,
        comboRedemption: null,
        selectedCombo: { price: 4700000, todaySingleServiceWaived: false },
      })
    ).toBe(770000);
  });

  it('calculateActorTipBreakdown tính đúng tỷ lệ 70/10/10 theo staffId thực tế từng khâu (1 người, 2 người, hoặc 3 người)', () => {
    // Case A: 1 CVL tự làm cả 3 khâu (In + Làm mi + Out) -> nhận đủ 90%
    const selfAll = calculateActorTipBreakdown(
      {
        assignedStaffId: 101,
        assignedStaffName: 'Thảo Ly',
        checkInStaffId: 101,
        checkInStaffName: 'Thảo Ly',
        checkOutStaffId: 101,
        checkOutStaffName: 'Thảo Ly',
      } as any,
      { staffId: 101, name: 'Thảo Ly', tier: 'CVL' },
      100000
    );
    expect(selfAll.actorEarnedPercent).toBe(90);
    expect(selfAll.actorEarnedAmount).toBe(90000);

    // Case B: CVLL (staffId 202) đón khách & tư vấn hộ (Check-in 10%), giao ca cho CV (staffId 101) làm mi (70%) và tự Check-out (10%)
    const techCv = calculateActorTipBreakdown(
      {
        assignedStaffId: 101,
        assignedStaffName: 'Thảo Ly',
        checkInStaffId: 202,
        checkInStaffName: 'Khanh Cao',
        checkOutStaffId: 101,
        checkOutStaffName: 'Thảo Ly',
      } as any,
      { staffId: 101, name: 'Thảo Ly', tier: 'CVL' },
      100000
    );
    expect(techCv.actorEarnedPercent).toBe(80); // 70% làm mi + 10% check-out
    expect(techCv.actorEarnedAmount).toBe(80000);

    const checkInCvll = calculateActorTipBreakdown(
      {
        assignedStaffId: 101,
        assignedStaffName: 'Thảo Ly',
        checkInStaffId: 202,
        checkInStaffName: 'Khanh Cao',
        checkOutStaffId: 101,
        checkOutStaffName: 'Thảo Ly',
      } as any,
      { staffId: 202, name: 'Khanh Cao', tier: 'CVLL' },
      100000
    );
    expect(checkInCvll.actorEarnedPercent).toBe(10); // 10% check-in
    expect(checkInCvll.actorEarnedAmount).toBe(10000);
  });

  it('tính chính xác hoa hồng bậc serum Yeppeum (Serum Tier Bonus)', () => {
    // 0 số lượng -> 0đ
    expect(calculateCvSerumTierBonus(390000, 0)).toBe(0);

    // Đơn giá < 550.000đ -> 10.000đ / cây
    expect(calculateCvSerumTierBonus(390000, 1)).toBe(10000);
    expect(calculateCvSerumTierBonus(390000, 3)).toBe(30000);

    // Đơn giá > 550.000đ -> 50.000đ / cây
    expect(calculateCvSerumTierBonus(650000, 1)).toBe(50000);
    expect(calculateCvSerumTierBonus(650000, 2)).toBe(100000);

    // Đơn giá >= 1.000.000đ -> 100.000đ / cây
    expect(calculateCvSerumTierBonus(1200000, 1)).toBe(100000);
    expect(calculateCvSerumTierBonus(1200000, 4)).toBe(400000);
  });

  it('tỷ lệ phân bổ tiền Tip chuẩn theo Kinh Thánh mOS (70% CV kỹ thuật, 10% đón khách, 10% tiễn khách, 20% CC)', () => {
    const tipAmount = 100000;
    const cvShare = Math.round(tipAmount * 0.7); // 70.000đ
    const checkInShare = Math.round(tipAmount * 0.1); // 10.000đ
    const checkOutShare = Math.round(tipAmount * 0.1); // 10.000đ
    const ccShare = checkInShare + checkOutShare; // 20.000đ

    expect(cvShare).toBe(70000);
    expect(checkInShare).toBe(10000);
    expect(checkOutShare).toBe(10000);
    expect(ccShare).toBe(20000);
    expect(cvShare + ccShare).toBe(90000);
    expect(cvShare + checkInShare + checkOutShare).toBe(90000);
  });

  it('resolveServicePriceSplit & resolveEffectiveServiceTotal tách chuẩn xác ca làm đôi (Mi Trên 770K + Mi Dưới 390K = 1.160.000đ)', () => {
    const split = resolveServicePriceSplit({
      servicePrice: 1160000,
      serviceName: '❖ HyperLight 770K (70 fan) + Mi Dưới',
      hasUnderMink: true,
      underMinkServiceType: 'Normal',
      hasUnderMinkCombo: false,
    });
    expect(split).toEqual({ upperServicePrice: 770000, underServicePrice: 390000 });

    // 1. Mua đủ 2 gói (Mi Trên + Mi Dưới) -> Miễn thu lẻ cả 2 (0đ)
    expect(
      resolveEffectiveServiceTotal({
        servicePrice: 1160000,
        serviceName: '❖ HyperLight 770K (70 fan) + Mi Dưới',
        hasUnderMink: true,
        underMinkServiceType: 'Normal',
        isComboLive: false,
        selectedCombo: { price: 4190000, todaySingleServiceWaived: true },
        selectedUnderCombo: { price: 1560000, todaySingleServiceWaived: true },
      })
    ).toBe(0);

    // 2. Chỉ mua gói Mi Trên (4.190.000đ), Mi Dưới làm lẻ -> Còn thu lẻ 390.000đ Mi Dưới
    expect(
      resolveEffectiveServiceTotal({
        servicePrice: 1160000,
        serviceName: '❖ HyperLight 770K (70 fan) + Mi Dưới',
        hasUnderMink: true,
        underMinkServiceType: 'Normal',
        isComboLive: false,
        selectedCombo: { price: 4190000, todaySingleServiceWaived: true },
        selectedUnderCombo: null,
      })
    ).toBe(390000);

    // 3. Chỉ mua gói Mi Dưới (1.560.000đ), Mi Trên làm lẻ -> Còn thu lẻ 770.000đ Mi Trên
    expect(
      resolveEffectiveServiceTotal({
        servicePrice: 1160000,
        serviceName: '❖ HyperLight 770K (70 fan) + Mi Dưới',
        hasUnderMink: true,
        underMinkServiceType: 'Normal',
        isComboLive: false,
        selectedCombo: null,
        selectedUnderCombo: { price: 1560000, todaySingleServiceWaived: true },
      })
    ).toBe(770000);
  });

  it('mergeServerBookingsWithLocalState không nuốt mất selectedCombo & selectedUnderCombo từ server khi local đang là null', () => {
    const localInitial: any = {
      id: 140282,
      orderNumber: 'ORD-140282',
      customerName: 'Đoan',
      status: 'SERVICING',
      servicePrice: 1160000,
      selectedCombo: null,
      selectedUnderCombo: null,
      cartProducts: [],
    };

    const serverWithSavedCombos: any = {
      ...localInitial,
      selectedCombo: { id: 'HyperLight_4X:7_tặng_3:770', name: 'Combo 7 tặng 3', price: 4190000, sessions: 10 },
      selectedUnderCombo: {
        id: 'FlawlessMink:4_tặng_1:under_390',
        name: 'Combo 4 tặng 1 · Mi Dưới',
        price: 1560000,
        sessions: 5,
      },
    };

    const merged = mergeServerBookingsWithLocalState([localInitial], [serverWithSavedCombos], 0);
    expect(merged[0].selectedCombo?.id).toBe('HyperLight_4X:7_tặng_3:770');
    expect(merged[0].selectedUnderCombo?.id).toBe('FlawlessMink:4_tặng_1:under_390');

    // Khi vừa cập nhật optimistic ở local (_localComboUpdatedAt còn tươi < 10s), poll cũ từ server không được ghi đè
    const freshLocalClear: any = {
      ...merged[0],
      selectedCombo: null,
      selectedUnderCombo: serverWithSavedCombos.selectedUnderCombo,
      _localComboUpdatedAt: Date.now(),
    };
    const staleServerPoll: any = { ...serverWithSavedCombos };
    const mergedDuringOptimistic = mergeServerBookingsWithLocalState([freshLocalClear], [staleServerPoll], 0);
    expect(mergedDuringOptimistic[0].selectedCombo).toBeNull();
    expect(mergedDuringOptimistic[0].selectedUnderCombo?.id).toBe('FlawlessMink:4_tặng_1:under_390');
  });

  it('computeFreshBillingLineTotals luôn tính lại subtotal/comboTotal/vatAmount mới kể cả khi booking đã có billing cũ từ Chờ Quầy chốt', () => {
    const totals = computeFreshBillingLineTotals({
      servicePrice: 390000,
      upgradePrice: 0,
      serviceName: 'Dặm HyperLight 390K (70 fan)',
      comboLiveStatus: {
        isComboLive: true,
        remainingSessions: 2,
        normalRemaining: 0,
        retainRemaining: 2,
        comboName: '❖ Hyperlight 660 10+6',
        retainDaysLimit: 21,
        upsellOpportunity: true,
      },
      selectedCombo: {
        id: 'HyperLight_3X:10_tặng_6:660',
        name: 'Combo 10 tặng 6 · HyperLight 3X 660',
        price: 4980000,
        bonus: 200000,
        sessions: 16,
        todayUsageMode: 'USE_OLD_COMBO',
        todaySingleServiceWaived: false,
      },
      selectedUnderCombo: null,
      comboRedemption: null,
      cartProducts: [],
      billing: {
        subtotal: 0,
        vatRate: 0.08,
        vatAmount: 0,
        serviceTotal: 0,
        comboTotal: 0,
        productTotal: 0,
        paymentMethod: 'CASH',
        tipAmount: 100000,
        tipCvShare: 70000,
        tipCcShare: 20000,
        grandTotal: 100000,
      },
    });

    expect(totals).toMatchObject({
      serviceTotal: 0,
      comboTotal: 4980000,
      productTotal: 0,
      subtotal: 4980000,
      serviceDiscountAmount: 0,
      comboDiscountAmount: 0,
      productDiscountAmount: 0,
      promotionDiscountAmount: 0,
      subtotalAfterDiscount: 4980000,
      vatRate: 0.08,
      vatAmount: 398400,
    });
  });

  it('computeFreshBillingLineTotals áp dụng discount promotion và tính lại VAT 8% sau giảm giá', () => {
    const totals = computeFreshBillingLineTotals({
      servicePrice: 500000,
      upgradePrice: 0,
      serviceName: 'HyperLight 500K',
      comboLiveStatus: undefined,
      selectedCombo: null,
      selectedUnderCombo: null,
      comboRedemption: null,
      cartProducts: [],
      appliedPromotion: {
        promotionId: 101,
        promotionKey: 'PROMO20',
        promotionType: 'percentage',
        promotionApply: 'single',
        serviceGroup: null,
        name: 'Giảm 20% dịch vụ lẻ',
        shortName: 'Giảm 20%',
        discountPercentage: 20,
        discountAmount: 0,
        exactlyAmount: 0,
        isCreditAllowed: false,
        isOldUserDisabled: false,
        isApprovalRequired: false,
        isPublic: true,
        isSystem: false,
        dateExpired: null,
        position: 1,
      },
      billing: {
        subtotal: 0,
        vatRate: 0.08,
        vatAmount: 0,
        serviceTotal: 0,
        comboTotal: 0,
        productTotal: 0,
        paymentMethod: 'CASH',
        tipAmount: 0,
        tipCvShare: 0,
        tipCcShare: 0,
        grandTotal: 0,
      },
    });

    expect(totals).toMatchObject({
      serviceTotal: 500000,
      comboTotal: 0,
      productTotal: 0,
      subtotal: 500000,
      serviceDiscountAmount: 100000,
      comboDiscountAmount: 0,
      productDiscountAmount: 0,
      promotionDiscountAmount: 100000,
      subtotalAfterDiscount: 400000,
      vatRate: 0.08,
      vatAmount: 32000,
      isFullCreditLocked: true,
    });
  });

  it('computeFreshBillingLineTotals áp dụng promotion riêng cho từng dịch vụ và sản phẩm cộng dồn VAT 8%', () => {
    const totals = computeFreshBillingLineTotals({
      servicePrice: 880000,
      upgradePrice: 0,
      serviceName: 'HyperLight 4X 880',
      comboLiveStatus: undefined,
      selectedCombo: null,
      selectedUnderCombo: null,
      comboRedemption: null,
      servicePromotion: {
        promotionId: 19,
        promotionKey: 'PROMO20',
        promotionType: 'percentage',
        promotionApply: 'single',
        serviceGroup: null,
        name: 'Giảm 20% dịch vụ',
        shortName: 'Giảm 20%',
        discountPercentage: 20,
        discountAmount: 0,
        exactlyAmount: 0,
        isCreditAllowed: false,
        isOldUserDisabled: false,
        isApprovalRequired: false,
        isPublic: true,
        isSystem: false,
        dateExpired: null,
        position: 1,
      },
      cartProducts: [
        {
          productId: 901,
          productName: 'Serum Dưỡng Mi',
          price: 500000,
          quantity: 1,
          promotionId: 25,
          appliedPromotion: {
            promotionId: 25,
            promotionKey: 'SERUM10',
            promotionType: 'percentage',
            promotionApply: 'all',
            serviceGroup: null,
            name: 'Giảm 10% sản phẩm',
            shortName: 'SP -10%',
            discountPercentage: 10,
            discountAmount: 0,
            exactlyAmount: 0,
            isCreditAllowed: true,
            isOldUserDisabled: false,
            isApprovalRequired: false,
            isPublic: true,
            isSystem: false,
            dateExpired: null,
            position: 2,
          },
        },
      ],
      appliedPromotion: null,
      billing: {
        subtotal: 0,
        vatRate: 0.08,
        vatAmount: 0,
        serviceTotal: 0,
        comboTotal: 0,
        productTotal: 0,
        paymentMethod: 'CASH',
        tipAmount: 0,
        tipCvShare: 0,
        tipCcShare: 0,
        grandTotal: 0,
      },
    });

    expect(totals).toMatchObject({
      serviceTotal: 880000,
      comboTotal: 0,
      productTotal: 500000,
      subtotal: 1380000,
      serviceDiscountAmount: 176000,
      comboDiscountAmount: 0,
      productDiscountAmount: 50000,
      productDiscounts: [50000],
      promotionDiscountAmount: 226000,
      subtotalAfterDiscount: 1154000,
      vatRate: 0.08,
      vatAmount: Math.round(1154000 * 0.08),
      hasAnyCreditRestrictedItem: true,
      isFullCreditLocked: false,
      creditEligibleSubtotal: 450000,
      creditEligiblePayableWithVat: 486000,
    });
  });
});
