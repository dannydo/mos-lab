'use client';

import { Button, Card, Col, Divider, Row, Select, Space } from 'antd';
import { ArrowRight, Calculator, Feather } from 'lucide-react';
import {
  calculateComboPurchaseAccounting,
  calculateComboRedemptionAccounting,
  getWingsComboCategory,
  WINGS_COMBO_CATEGORIES,
  type MatchedComboPackageOption,
  type WingsComboCategoryId,
} from '@mos-lab/shared';

interface CatalogComboAccountingSimulatorProps {
  activeSimPkg: MatchedComboPackageOption;
  simMode: 'BUY_NEW' | 'REDEEM_EXISTING';
  onChangeSimMode: (mode: 'BUY_NEW' | 'REDEEM_EXISTING') => void;
  purchaseAccounting: ReturnType<typeof calculateComboPurchaseAccounting> | null;
  redemptionAccounting: ReturnType<typeof calculateComboRedemptionAccounting> | null;
  simWalletState: 'NORMAL' | 'ONLY_REFILL_LEFT' | 'BONUS_ONLY_LEFT';
  onChangeSimWalletState: (state: 'NORMAL' | 'ONLY_REFILL_LEFT' | 'BONUS_ONLY_LEFT') => void;
  simRedeemServiceType: 'Normal' | 'Retain';
  onChangeSimRedeemServiceType: (serviceType: 'Normal' | 'Retain') => void;
  simTargetCategoryId: WingsComboCategoryId;
  onChangeSimTargetCategoryId: (categoryId: WingsComboCategoryId) => void;
  simTargetVolume: number | 'under';
  onChangeSimTargetVolume: (volume: number | 'under') => void;
  targetCategoryObj: ReturnType<typeof getWingsComboCategory>;
  isDark: boolean;
}

export function CatalogComboAccountingSimulator({
  activeSimPkg,
  simMode,
  onChangeSimMode,
  purchaseAccounting,
  redemptionAccounting,
  simWalletState,
  onChangeSimWalletState,
  simRedeemServiceType,
  onChangeSimRedeemServiceType,
  simTargetCategoryId,
  onChangeSimTargetCategoryId,
  simTargetVolume,
  onChangeSimTargetVolume,
  targetCategoryObj,
  isDark,
}: CatalogComboAccountingSimulatorProps) {
  return (
    <Card
      size="small"
      className="rounded-2xl"
      title={
        <Space>
          <Calculator className="w-4 h-4 text-indigo-500" />
          <span>Bàn Mô Phỏng Hạch Toán Kế Toán &amp; Trừ Ví Gói Tự Động ({activeSimPkg.displayName})</span>
        </Space>
      }
      extra={
        <Space>
          <Button
            size="small"
            type={simMode === 'BUY_NEW' ? 'primary' : 'default'}
            onClick={() => onChangeSimMode('BUY_NEW')}
          >
            1. Khi Khách Mua Gói Mới Tại Checkout
          </Button>
          <Button
            size="small"
            type={simMode === 'REDEEM_EXISTING' ? 'primary' : 'default'}
            onClick={() => onChangeSimMode('REDEEM_EXISTING')}
          >
            2. Khi Khách Dùng Gói Đang Có (Tính Phụ Thu)
          </Button>
        </Space>
      }
    >
      {simMode === 'BUY_NEW' && purchaseAccounting ? (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <div
              className={`p-3.5 rounded-xl border space-y-2 tabular-nums ${
                isDark ? 'bg-neutral-800/50 border-neutral-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="font-extrabold text-sm text-indigo-600">
                A. Hạch Toán Tiền Thu &amp; Doanh Thu Ca Làm Hôm Nay
              </div>
              <div className="flex justify-between text-xs">
                <span>Giá lẻ buổi nối mới hôm nay ({activeSimPkg.volumeMeta.shortLabel}):</span>
                <span className="line-through text-gray-400">
                  {purchaseAccounting.todaySingleServiceOriginalPrice.toLocaleString('vi-VN')} đ (Miễn thu lẻ)
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Tiền gói Combo khách thanh toán (Chưa VAT):</span>
                <strong className="text-sm">{purchaseAccounting.comboPrice.toLocaleString('vi-VN')} đ</strong>
              </div>
              <div className="flex justify-between text-xs">
                <span>Tổng thanh toán gồm 8% VAT:</span>
                <strong className="text-amber-600 text-sm">
                  {purchaseAccounting.comboPriceWithVat.toLocaleString('vi-VN')} đ
                </strong>
              </div>
              <Divider className="!my-2" />
              <div className="flex justify-between text-xs">
                <span>Doanh thu thực hiện ghi nhận hôm nay (Buổi 1):</span>
                <strong className="text-emerald-600">
                  {purchaseAccounting.recognizedRevenueToday.toLocaleString('vi-VN')} đ
                </strong>
              </div>
              <div className="flex justify-between text-xs">
                <span>Doanh thu chưa thực hiện giữ trong ví (Deferred Revenue):</span>
                <strong className="text-indigo-600">
                  {purchaseAccounting.deferredRevenueBalance.toLocaleString('vi-VN')} đ
                </strong>
              </div>
              <div className="flex justify-between text-xs">
                <span>
                  Thưởng tiền tươi bậc thang cho CV
                  <Feather className="w-3 h-3 text-amber-500 inline mx-0.5" /> chốt đơn:
                </span>
                <strong className="text-emerald-600">
                  +{purchaseAccounting.cvComboBonus.toLocaleString('vi-VN')} đ
                </strong>
              </div>
            </div>
          </Col>

          <Col xs={24} md={12}>
            <div
              className={`p-3.5 rounded-xl border space-y-2 tabular-nums ${
                isDark ? 'bg-neutral-800/50 border-neutral-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="font-extrabold text-sm text-emerald-600">
                B. Sổ Cái Ví Gói Khách Hàng (Tách Lượt Mua vs Lượt Tặng 0đ)
              </div>
              <div className="flex justify-between text-xs">
                <span>Tổng số lượt ban đầu của gói ({activeSimPkg.ruleName}):</span>
                <strong>
                  {purchaseAccounting.initialWallet.totalSessions} lần ({purchaseAccounting.initialWallet.paidNew} New
                  mua + {purchaseAccounting.initialWallet.paidRefill} Refill mua ·{' '}
                  {purchaseAccounting.initialWallet.bonusNew + purchaseAccounting.initialWallet.bonusRefill} Tặng 0đ)
                </strong>
              </div>
              <div className="flex justify-between text-xs">
                <span>Đã trừ ngay tại Checkout hôm nay:</span>
                <strong className="text-rose-500">-1 Lượt Nối Mới Mua (Paid New #1)</strong>
              </div>
              <Divider className="!my-2" />
              <div className="flex justify-between text-xs">
                <span>• Lượt Nối Mới Mua (Paid New) còn lại:</span>
                <strong>{purchaseAccounting.remainingWalletAfterToday.paidNew} lần</strong>
              </div>
              <div className="flex justify-between text-xs">
                <span>• Lượt Dặm Mua (Paid Refill) còn lại:</span>
                <strong>{purchaseAccounting.remainingWalletAfterToday.paidRefill} lần</strong>
              </div>
              <div className="flex justify-between text-xs">
                <span>• Lượt Tặng Kèm 0đ (Bonus New + Refill) còn lại:</span>
                <strong className="text-amber-600">
                  {purchaseAccounting.remainingWalletAfterToday.totalBonusRemaining} lần (Hạch toán 0đ khi dùng sau
                  cùng)
                </strong>
              </div>
            </div>
          </Col>
        </Row>
      ) : (
        redemptionAccounting && (
          <div className="space-y-3">
            <Row gutter={[12, 12]}>
              <Col xs={24} md={6}>
                <div className="text-xs font-bold mb-1">Trạng thái ví gói của khách:</div>
                <Select
                  className="w-full"
                  value={simWalletState}
                  onChange={onChangeSimWalletState}
                  options={[
                    { value: 'NORMAL', label: 'Ví còn đủ cả lượt New & Refill (Paid)' },
                    { value: 'ONLY_REFILL_LEFT', label: 'Ví HẾT lượt New, chỉ còn lượt Refill' },
                    { value: 'BONUS_ONLY_LEFT', label: 'Đã hết lượt Mua, đang dùng lượt Tặng (0đ)' },
                  ]}
                />
              </Col>
              <Col xs={24} md={6}>
                <div className="text-xs font-bold mb-1">Dịch vụ khách yêu cầu hôm nay:</div>
                <Select
                  className="w-full"
                  value={simRedeemServiceType}
                  onChange={onChangeSimRedeemServiceType}
                  options={[
                    { value: 'Normal', label: 'Nối Mới (Normal / Quá 25 ngày)' },
                    { value: 'Retain', label: 'Dặm Mi (Retain trong 25 ngày)' },
                  ]}
                />
              </Col>
              <Col xs={24} md={6}>
                <div className="text-xs font-bold mb-1">Dòng mi khách làm hôm nay:</div>
                <Select
                  className="w-full"
                  value={simTargetCategoryId}
                  onChange={(val) => {
                    onChangeSimTargetCategoryId(val);
                    const cat = getWingsComboCategory(val);
                    const firstVol = cat.unitPrices.find((u) => !u.isUnderLash && typeof u.volume === 'number');
                    if (firstVol) onChangeSimTargetVolume(Number(firstVol.volume));
                  }}
                  options={WINGS_COMBO_CATEGORIES.filter((c) => c.id !== 'VVIP').map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                />
              </Col>
              <Col xs={24} md={6}>
                <div className="text-xs font-bold mb-1">Mã số sợi khách làm hôm nay:</div>
                <Select
                  className="w-full"
                  value={String(simTargetVolume)}
                  onChange={(v) => onChangeSimTargetVolume(v === 'under' ? 'under' : Number(v))}
                  options={targetCategoryObj.unitPrices.map((u) => ({
                    value: String(u.volume),
                    label: u.isUnderLash ? 'Mi Dưới 390' : `Mã ${u.volume} (${u.newPrice.toLocaleString('vi-VN')}đ)`,
                  }))}
                />
              </Col>
            </Row>

            <div
              className={`p-3.5 rounded-xl border space-y-1.5 tabular-nums ${
                isDark ? 'bg-sky-950/30 border-sky-500' : 'bg-sky-50 border-sky-400'
              }`}
            >
              <div className="font-extrabold text-sm flex items-center justify-between">
                <span>Kết quả tự động trừ gói &amp; tính phụ thu:</span>
                <span className="text-base text-amber-600">
                  Khách trả thêm hôm nay: {redemptionAccounting.totalCustomerPayToday.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="text-xs">{redemptionAccounting.explanation}</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-xs">
                <div>
                  • Phụ thu quy đổi Refill <ArrowRight className="w-3 h-3 inline" /> New:{' '}
                  <strong>+{redemptionAccounting.typeConversionSurcharge.toLocaleString('vi-VN')} đ</strong>
                </div>
                <div>
                  • Phụ thu nâng cấp số sợi / dòng mi:{' '}
                  <strong>+{redemptionAccounting.upgradeVolumeSurcharge.toLocaleString('vi-VN')} đ</strong>
                </div>
                <div>
                  • Doanh thu thực hiện ghi nhận cho ca làm:{' '}
                  <strong className="text-emerald-600">
                    {redemptionAccounting.recognizedRevenueToday.toLocaleString('vi-VN')} đ
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </Card>
  );
}
