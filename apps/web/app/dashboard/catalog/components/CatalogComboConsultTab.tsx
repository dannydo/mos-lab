'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  Tag,
  Switch,
  Button,
  Select,
  Row,
  Col,
  Space,
  Typography,
  Modal,
  Divider,
  Alert,
  message,
  theme as antdTheme,
} from 'antd';
import {
  Sparkles,
  Scale,
  Copy,
  Check,
  Calculator,
  Lock,
  ShieldCheck,
  Calendar,
  Gift,
  Wallet,
  ZoomIn,
  ArrowRight,
} from 'lucide-react';
import {
  WINGS_COMBO_CATEGORIES,
  WingsComboCategoryId,
  MatchedComboPackageOption,
  getWingsComboCategory,
  getVolumeFiberMeta,
  checkWelcomeComboEligibility,
  getComboPackagesForCategoryAndVolume,
  calculateComboPurchaseAccounting,
  calculateComboRedemptionAccounting,
  formatComboConsultationQuote,
} from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';

const { Text, Title } = Typography;

export default function CatalogComboConsultTab() {
  const { themeMode } = useTheme();
  const { token } = antdTheme.useToken();
  const isDark = themeMode === 'dark';

  const [selectedCategoryId, setSelectedCategoryId] = useState<WingsComboCategoryId>('FlawlessMink');
  const [selectedVolume, setSelectedVolume] = useState<number | 'under'>(770);
  const [includeVat, setIncludeVat] = useState<boolean>(false);
  const [isFirstDayCustomer, setIsFirstDayCustomer] = useState<boolean>(true);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [zoomedCard, setZoomedCard] = useState<{ title: string; imageUrl: string } | null>(null);

  // Accounting & Redemption Simulator State
  const [simMode, setSimMode] = useState<'BUY_NEW' | 'REDEEM_EXISTING'>('BUY_NEW');
  const [simSelectedPkgId, setSimSelectedPkgId] = useState<string>('');
  const [simRedeemServiceType, setSimRedeemServiceType] = useState<'Normal' | 'Retain'>('Normal');
  const [simTargetCategoryId, setSimTargetCategoryId] = useState<WingsComboCategoryId>('FlawlessMink');
  const [simTargetVolume, setSimTargetVolume] = useState<number | 'under'>(880);
  const [simWalletState, setSimWalletState] = useState<'NORMAL' | 'ONLY_REFILL_LEFT' | 'BONUS_ONLY_LEFT'>('NORMAL');

  const currentCategory = useMemo(() => getWingsComboCategory(selectedCategoryId), [selectedCategoryId]);

  const effectiveVolume = useMemo<number | 'under'>(() => {
    if (currentCategory.id === 'VVIP') return selectedVolume;
    const exists = currentCategory.unitPrices.some((u) =>
      selectedVolume === 'under' ? u.isUnderLash || u.volume === 'under' : Number(u.volume) === Number(selectedVolume)
    );
    if (exists) return selectedVolume;
    const firstNormal = currentCategory.unitPrices.find((u) => !u.isUnderLash && typeof u.volume === 'number');
    return firstNormal ? Number(firstNormal.volume) : 770;
  }, [currentCategory, selectedVolume]);

  const welcomeEligibility = useMemo(
    () =>
      checkWelcomeComboEligibility({
        customerVisits: isFirstDayCustomer ? 1 : 3,
        lashHistoryDates: isFirstDayCustomer ? [] : ['2026-10-15'],
      }),
    [isFirstDayCustomer]
  );

  const packages = useMemo(
    () =>
      getComboPackagesForCategoryAndVolume({
        categoryId: selectedCategoryId,
        volume: effectiveVolume,
        welcomeEligibility,
        includeVvipPass: selectedCategoryId !== 'VVIP',
      }),
    [selectedCategoryId, effectiveVolume, welcomeEligibility]
  );

  const activeSimPkg: MatchedComboPackageOption = useMemo(() => {
    const found = packages.find((p) => p.id === simSelectedPkgId && !p.isLocked);
    if (found) return found;
    return (
      packages.find((p) => !p.isLocked && p.ruleName === '4 tặng 1') || packages.find((p) => !p.isLocked) || packages[0]
    );
  }, [packages, simSelectedPkgId]);

  const purchaseAccounting = useMemo(
    () => (activeSimPkg ? calculateComboPurchaseAccounting(activeSimPkg) : null),
    [activeSimPkg]
  );

  const redemptionAccounting = useMemo(() => {
    if (!activeSimPkg) return null;
    const paidNew = simWalletState === 'NORMAL' ? Math.max(1, activeSimPkg.comboNewCount) : 0;
    const paidRefill =
      simWalletState === 'NORMAL' || simWalletState === 'ONLY_REFILL_LEFT'
        ? Math.max(1, activeSimPkg.comboRefillCount || 2)
        : 0;
    const bonusNew =
      simWalletState === 'BONUS_ONLY_LEFT' ? Math.max(1, activeSimPkg.bonusNewCount || 1) : activeSimPkg.bonusNewCount;
    const bonusRefill =
      simWalletState === 'BONUS_ONLY_LEFT'
        ? Math.max(1, activeSimPkg.bonusRefillCount || 1)
        : activeSimPkg.bonusRefillCount;

    return calculateComboRedemptionAccounting({
      comboName: activeSimPkg.displayName,
      baseCategoryId: activeSimPkg.categoryId,
      baseVolume: activeSimPkg.volume,
      targetCategoryId: simTargetCategoryId,
      targetVolume: simTargetVolume,
      requestedServiceType: simRedeemServiceType,
      daysSinceLastVisit: simRedeemServiceType === 'Retain' ? 18 : 28,
      paidNewRemaining: paidNew,
      paidRefillRemaining: paidRefill,
      bonusNewRemaining: bonusNew,
      bonusRefillRemaining: bonusRefill,
    });
  }, [activeSimPkg, simWalletState, simTargetCategoryId, simTargetVolume, simRedeemServiceType]);

  const comparedPackages = useMemo(() => {
    const list: MatchedComboPackageOption[] = [];
    for (const cid of compareIds) {
      const [catId, , volSlug] = cid.split(':');
      const vol = volSlug === 'under_390' ? 'under' : Number(volSlug) || effectiveVolume;
      const catPkgs = getComboPackagesForCategoryAndVolume({
        categoryId: catId || selectedCategoryId,
        volume: vol,
        welcomeEligibility,
        includeVvipPass: true,
      });
      const found = catPkgs.find((p) => p.id === cid);
      if (found) list.push(found);
    }
    return list;
  }, [compareIds, selectedCategoryId, effectiveVolume, welcomeEligibility]);

  const toggleCompare = (pkgId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(pkgId)) return prev.filter((id) => id !== pkgId);
      if (prev.length >= 3) {
        void message.info('Bàn cân hỗ trợ so sánh tối đa 3 gói cùng lúc.');
        return [...prev.slice(1), pkgId];
      }
      return [...prev, pkgId];
    });
  };

  const handleCopyQuote = async (pkg: MatchedComboPackageOption) => {
    const text = formatComboConsultationQuote(pkg, includeVat);
    try {
      await navigator.clipboard.writeText(text);
      void message.success(`Đã copy báo giá "${pkg.displayName}" để gửi Zalo/Messenger!`);
    } catch {
      // ignore
    }
    setCopiedId(pkg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const targetCategoryObj = useMemo(() => getWingsComboCategory(simTargetCategoryId), [simTargetCategoryId]);

  return (
    <div className="space-y-4">
      {/* Top Control & Filter Bar */}
      <Card
        size="small"
        style={{
          background: isDark ? token.colorBgContainer : '#ffffff',
          borderColor: token.colorBorderSecondary,
          borderRadius: 16,
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <Title level={5} style={{ margin: 0 }}>
                Bàn Tư Vấn & Bảng Giá Combo 13 Dòng Mi Chuẩn Wings (Single Source of Truth)
              </Title>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Thay thế hoàn toàn trang tra cứu rời rạc bên ngoài · Tự động kiểm tra điều kiện Gói Welcome ngày đầu & mô
              phỏng kế toán trừ gói
            </Text>
          </div>

          <Space wrap size="middle">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
              style={{
                background: isFirstDayCustomer
                  ? isDark
                    ? 'rgba(16, 185, 129, 0.12)'
                    : '#ecfdf5'
                  : isDark
                    ? 'rgba(245, 158, 11, 0.12)'
                    : '#fffbeb',
                borderColor: isFirstDayCustomer ? '#10b981' : '#f59e0b',
              }}
            >
              {isFirstDayCustomer ? (
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              ) : (
                <Lock className="w-4 h-4 text-amber-500" />
              )}
              <span className="text-xs font-semibold">
                {isFirstDayCustomer ? 'Khách ngày đầu tiên (Mở 2 tặng 1)' : 'Đã qua ngày đầu (Khóa 2 tặng 1)'}
              </span>
              <Switch size="small" checked={isFirstDayCustomer} onChange={setIsFirstDayCustomer} />
            </div>

            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
              style={{
                background: isDark ? token.colorFillQuaternary : '#f8fafc',
                borderColor: token.colorBorderSecondary,
              }}
            >
              <span className="text-xs font-semibold">Hiển thị giá gồm 8% VAT:</span>
              <Switch size="small" checked={includeVat} onChange={setIncludeVat} />
            </div>
          </Space>
        </div>

        {/* 13 Lash Line Filter Pills */}
        <div className="mb-3">
          <div
            className="text-xs font-bold uppercase tracking-wider mb-1.5"
            style={{ color: token.colorTextSecondary }}
          >
            1. Chọn Dòng Mi (13 Dòng Chuẩn):
          </div>
          <div className="flex flex-wrap gap-1.5">
            {WINGS_COMBO_CATEGORIES.map((cat) => {
              const active = cat.id === selectedCategoryId;
              return (
                <Button
                  key={cat.id}
                  type={active ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  style={{
                    borderRadius: 10,
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {cat.name}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Volume / Fiber SKU Selector */}
        {currentCategory.unitPrices.length > 0 && (
          <div>
            <div
              className="text-xs font-bold uppercase tracking-wider mb-1.5"
              style={{ color: token.colorTextSecondary }}
            >
              2. Chọn Mã Số Sợi / Trụ ({currentCategory.name} · {currentCategory.segment}):
            </div>
            <Row gutter={[8, 8]}>
              {currentCategory.unitPrices.map((u) => {
                const volKey: number | 'under' = u.isUnderLash ? 'under' : Number(u.volume);
                const active = effectiveVolume === volKey;
                const meta = getVolumeFiberMeta(currentCategory.id, volKey);
                return (
                  <Col xs={12} sm={8} md={4} key={String(u.volume)}>
                    <div
                      onClick={() => {
                        setSelectedVolume(volKey);
                        setSimTargetCategoryId(currentCategory.id);
                        setSimTargetVolume(volKey);
                      }}
                      className="p-2.5 rounded-xl border cursor-pointer transition-all"
                      style={{
                        background: active
                          ? isDark
                            ? 'rgba(245, 158, 11, 0.16)'
                            : '#fffbeb'
                          : isDark
                            ? token.colorFillQuaternary
                            : '#f8fafc',
                        borderColor: active ? '#f59e0b' : token.colorBorderSecondary,
                        borderWidth: active ? 2 : 1,
                      }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-sm">
                          {u.isUnderLash ? 'Mi Dưới 390' : `Mã ${u.volume}`}
                        </span>
                        {meta.badge && (
                          <Tag color="gold" style={{ margin: 0, fontSize: 10, fontWeight: 700 }}>
                            {meta.badge}
                          </Tag>
                        )}
                      </div>
                      <div className="text-xs mt-0.5 truncate" style={{ color: token.colorTextSecondary }}>
                        {meta.fanLabel}
                      </div>
                      <div className="text-xs font-bold text-emerald-600 mt-1 tabular-nums">
                        New: {u.newPrice.toLocaleString('vi-VN')}đ
                        {u.refillPrice ? ` · Dặm: ${u.refillPrice.toLocaleString('vi-VN')}đ` : ''}
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </div>
        )}
      </Card>

      {/* Side-by-Side Comparison Panel (when 1-3 packages are selected) */}
      {comparedPackages.length > 0 && (
        <Card
          size="small"
          title={
            <Space>
              <Scale className="w-4 h-4 text-amber-500" />
              <span>Bàn Cân So Sánh Trực Tiếp ({comparedPackages.length}/3 Gói Combo)</span>
            </Space>
          }
          extra={
            <Button size="small" type="link" danger onClick={() => setCompareIds([])}>
              Xóa tất cả so sánh
            </Button>
          }
          style={{
            borderRadius: 16,
            borderColor: '#f59e0b',
          }}
        >
          <Row gutter={[12, 12]}>
            {comparedPackages.map((cp) => {
              const displayPrice = includeVat ? cp.comboPriceWithVat : cp.comboPrice;
              const acc = calculateComboPurchaseAccounting(cp);
              return (
                <Col xs={24} md={8} key={cp.id}>
                  <div
                    className="p-3 rounded-xl border h-full flex flex-col justify-between space-y-2"
                    style={{
                      background: isDark ? token.colorFillQuaternary : '#fffbeb',
                      borderColor: token.colorBorderSecondary,
                    }}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-extrabold text-sm">{cp.displayName}</span>
                        <Button size="small" type="text" onClick={() => toggleCompare(cp.id)}>
                          ✕
                        </Button>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: token.colorTextSecondary }}>
                        {cp.readableContent} · HSD {cp.validityMonths} tháng
                      </div>
                    </div>
                    <div
                      className="space-y-1 text-xs pt-2 border-t tabular-nums"
                      style={{ borderColor: token.colorBorderSecondary }}
                    >
                      <div className="flex justify-between">
                        <span>Giá gói ({includeVat ? 'Gồm VAT' : 'Chưa VAT'}):</span>
                        <strong className="text-amber-600 text-sm">{displayPrice.toLocaleString('vi-VN')} đ</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Giá lẻ tổng {cp.totalSessions} lần:</span>
                        <span className="line-through">{cp.retailTotal.toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tiết kiệm cho khách:</span>
                        <strong className="text-emerald-600">
                          -{cp.savingsAmount.toLocaleString('vi-VN')} đ (+{cp.discountPct}%)
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Đơn giá bình quân:</span>
                        <strong>~{cp.avgPerSessionPrice.toLocaleString('vi-VN')} đ/lần</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Sau khi trừ buổi 1 hôm nay:</span>
                        <strong className="text-indigo-600">
                          Còn {acc.remainingWalletAfterToday.totalRemaining}/{cp.totalSessions} lần (
                          {acc.remainingWalletAfterToday.totalPaidRemaining} Mua +{' '}
                          {acc.remainingWalletAfterToday.totalBonusRemaining} Tặng 0đ)
                        </strong>
                      </div>
                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        </Card>
      )}

      {/* Package Cards Grid */}
      <Row gutter={[12, 12]}>
        {packages.map((pkg) => {
          const isCompared = compareIds.includes(pkg.id);
          const isSimSelected = activeSimPkg?.id === pkg.id;
          const displayPrice = includeVat ? pkg.comboPriceWithVat : pkg.comboPrice;
          const acc = calculateComboPurchaseAccounting(pkg);

          return (
            <Col xs={24} md={12} xl={8} key={pkg.id}>
              <Card
                size="small"
                hoverable={!pkg.isLocked}
                style={{
                  borderRadius: 16,
                  height: '100%',
                  opacity: pkg.isLocked ? 0.72 : 1,
                  borderColor: isSimSelected ? '#f59e0b' : token.colorBorderSecondary,
                  borderWidth: isSimSelected ? 2 : 1,
                }}
              >
                <div className="flex flex-col justify-between h-full space-y-3">
                  <div className="space-y-2.5">
                    {/* Top Row with Artwork & Price */}
                    <div className="flex gap-3">
                      {pkg.cardPreviewUrl && (
                        <div
                          onClick={() =>
                            setZoomedCard({
                              title: pkg.displayName,
                              imageUrl: pkg.cardImageUrl || pkg.cardPreviewUrl,
                            })
                          }
                          className="relative w-20 h-24 rounded-xl overflow-hidden bg-neutral-900 shrink-0 border cursor-pointer"
                          style={{ borderColor: token.colorBorderSecondary }}
                        >
                          <img src={pkg.cardPreviewUrl} alt={pkg.displayName} className="w-full h-full object-cover" />
                          <span className="absolute bottom-1 right-1 bg-black/70 text-white p-1 rounded-md">
                            <ZoomIn className="w-3 h-3" />
                          </span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <Space size={4} wrap>
                              <span className="font-black text-base">{pkg.ruleName}</span>
                              {pkg.isWelcomePackage && (
                                <Tag color={pkg.isLocked ? 'error' : 'gold'} style={{ margin: 0, fontWeight: 700 }}>
                                  {pkg.isLocked ? '🔒 Welcome · Chỉ ngày đầu' : '🌟 Welcome · Ngày đầu'}
                                </Tag>
                              )}
                              <Tag color="success" style={{ margin: 0, fontWeight: 700 }}>
                                +{pkg.discountPct}%
                              </Tag>
                            </Space>
                            <div className="text-xs mt-0.5 font-medium" style={{ color: token.colorTextSecondary }}>
                              {pkg.categoryName} · {pkg.volumeMeta.detailLabel}
                            </div>
                          </div>
                        </div>

                        <div className="mt-1.5 flex items-baseline justify-between tabular-nums">
                          <div>
                            <span className="text-lg font-black text-amber-500">
                              {displayPrice.toLocaleString('vi-VN')} đ
                            </span>
                            <span className="text-xs line-through ml-1.5" style={{ color: token.colorTextTertiary }}>
                              {pkg.retailTotal.toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                          <Tag color="green" style={{ margin: 0, fontWeight: 700 }}>
                            CV🪶 +{pkg.cvBonus.toLocaleString('vi-VN')}đ
                          </Tag>
                        </div>
                      </div>
                    </div>

                    {/* Readable Content & Validity */}
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <Tag color="blue" style={{ margin: 0 }}>
                        <Gift className="w-3 h-3 inline mr-1" />
                        {pkg.readableContent}
                      </Tag>
                      <Tag style={{ margin: 0 }}>
                        <Calendar className="w-3 h-3 inline mr-1" />
                        HSD: {pkg.validityMonths} tháng
                      </Tag>
                      <Tag color="purple" style={{ margin: 0 }} className="tabular-nums">
                        TB ~{pkg.avgPerSessionPrice.toLocaleString('vi-VN')}đ/buổi
                      </Tag>
                    </div>

                    {/* Accounting Summary Box */}
                    <div
                      className="p-2.5 rounded-xl border text-xs space-y-1 tabular-nums"
                      style={{
                        background: isDark ? token.colorFillQuaternary : '#f8fafc',
                        borderColor: token.colorBorderSecondary,
                      }}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>Hạch toán khi mua tại Checkout:</span>
                        <span className="text-emerald-600">Trừ luôn buổi 1 hôm nay (0đ lẻ)</span>
                      </div>
                      <div className="flex justify-between" style={{ color: token.colorTextSecondary }}>
                        <span>• Số dư ví còn sau hôm nay:</span>
                        <strong>
                          {acc.remainingWalletAfterToday.totalRemaining}/{pkg.totalSessions} lần (
                          {acc.remainingWalletAfterToday.totalPaidRemaining} Mua +{' '}
                          {acc.remainingWalletAfterToday.totalBonusRemaining} Tặng 0đ)
                        </strong>
                      </div>
                      <div className="flex justify-between" style={{ color: token.colorTextSecondary }}>
                        <span>• Doanh thu thực hiện hôm nay / Giữ ví:</span>
                        <strong>
                          {acc.recognizedRevenueToday.toLocaleString('vi-VN')}đ /{' '}
                          {acc.deferredRevenueBalance.toLocaleString('vi-VN')}đ
                        </strong>
                      </div>
                    </div>

                    {pkg.isLocked && pkg.lockReason && (
                      <Alert
                        type="warning"
                        showIcon
                        message={pkg.lockReason}
                        style={{ fontSize: 11, padding: '6px 10px' }}
                      />
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="small"
                      type={isCompared ? 'primary' : 'default'}
                      icon={<Scale className="w-3.5 h-3.5" />}
                      onClick={() => toggleCompare(pkg.id)}
                    >
                      {isCompared ? 'Đang so sánh' : 'So sánh'}
                    </Button>
                    <Button
                      size="small"
                      icon={copiedId === pkg.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      onClick={() => void handleCopyQuote(pkg)}
                    >
                      {copiedId === pkg.id ? 'Đã copy' : 'Copy báo giá Zalo'}
                    </Button>
                    <Button
                      size="small"
                      type={isSimSelected ? 'primary' : 'dashed'}
                      disabled={pkg.isLocked}
                      className="flex-1"
                      onClick={() => setSimSelectedPkgId(pkg.id)}
                    >
                      Mô phỏng kế toán
                    </Button>
                  </div>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Interactive Accounting & Wallet Deduction Simulator */}
      {activeSimPkg && (
        <Card
          size="small"
          style={{
            borderRadius: 16,
            borderColor: token.colorBorderSecondary,
          }}
          title={
            <Space>
              <Calculator className="w-4 h-4 text-indigo-500" />
              <span>Bàn Mô Phỏng Hạch Toán Kế Toán & Trừ Ví Gói Tự Động ({activeSimPkg.displayName})</span>
            </Space>
          }
          extra={
            <Space>
              <Button
                size="small"
                type={simMode === 'BUY_NEW' ? 'primary' : 'default'}
                onClick={() => setSimMode('BUY_NEW')}
              >
                1. Khi Khách Mua Gói Mới Tại Checkout
              </Button>
              <Button
                size="small"
                type={simMode === 'REDEEM_EXISTING' ? 'primary' : 'default'}
                onClick={() => setSimMode('REDEEM_EXISTING')}
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
                  className="p-3.5 rounded-xl border space-y-2 tabular-nums"
                  style={{
                    background: isDark ? token.colorFillQuaternary : '#f8fafc',
                    borderColor: token.colorBorderSecondary,
                  }}
                >
                  <div className="font-extrabold text-sm text-indigo-600">
                    A. Hạch Toán Tiền Thu & Doanh Thu Ca Làm Hôm Nay
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
                  <Divider style={{ margin: '8px 0' }} />
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
                    <span>Thưởng tiền tươi bậc thang cho CV🪶 chốt đơn:</span>
                    <strong className="text-emerald-600">
                      +{purchaseAccounting.cvComboBonus.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                </div>
              </Col>

              <Col xs={24} md={12}>
                <div
                  className="p-3.5 rounded-xl border space-y-2 tabular-nums"
                  style={{
                    background: isDark ? token.colorFillQuaternary : '#f8fafc',
                    borderColor: token.colorBorderSecondary,
                  }}
                >
                  <div className="font-extrabold text-sm text-emerald-600">
                    B. Sổ Cái Ví Gói Khách Hàng (Tách Lượt Mua vs Lượt Tặng 0đ)
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Tổng số lượt ban đầu của gói ({activeSimPkg.ruleName}):</span>
                    <strong>
                      {purchaseAccounting.initialWallet.totalSessions} lần ({purchaseAccounting.initialWallet.paidNew}{' '}
                      New mua + {purchaseAccounting.initialWallet.paidRefill} Refill mua ·{' '}
                      {purchaseAccounting.initialWallet.bonusNew + purchaseAccounting.initialWallet.bonusRefill} Tặng
                      0đ)
                    </strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Đã trừ ngay tại Checkout hôm nay:</span>
                    <strong className="text-rose-500">-1 Lượt Nối Mới Mua (Paid New #1)</strong>
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
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
                      style={{ width: '100%' }}
                      value={simWalletState}
                      onChange={setSimWalletState}
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
                      style={{ width: '100%' }}
                      value={simRedeemServiceType}
                      onChange={setSimRedeemServiceType}
                      options={[
                        { value: 'Normal', label: 'Nối Mới (Normal / Quá 25 ngày)' },
                        { value: 'Retain', label: 'Dặm Mi (Retain trong 25 ngày)' },
                      ]}
                    />
                  </Col>
                  <Col xs={24} md={6}>
                    <div className="text-xs font-bold mb-1">Dòng mi khách làm hôm nay:</div>
                    <Select
                      style={{ width: '100%' }}
                      value={simTargetCategoryId}
                      onChange={(val) => {
                        setSimTargetCategoryId(val);
                        const cat = getWingsComboCategory(val);
                        const firstVol = cat.unitPrices.find((u) => !u.isUnderLash && typeof u.volume === 'number');
                        if (firstVol) setSimTargetVolume(Number(firstVol.volume));
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
                      style={{ width: '100%' }}
                      value={String(simTargetVolume)}
                      onChange={(v) => setSimTargetVolume(v === 'under' ? 'under' : Number(v))}
                      options={targetCategoryObj.unitPrices.map((u) => ({
                        value: String(u.volume),
                        label: u.isUnderLash
                          ? 'Mi Dưới 390'
                          : `Mã ${u.volume} (${u.newPrice.toLocaleString('vi-VN')}đ)`,
                      }))}
                    />
                  </Col>
                </Row>

                <div
                  className="p-3.5 rounded-xl border space-y-1.5 tabular-nums"
                  style={{
                    background: isDark ? token.colorFillQuaternary : '#f0f9ff',
                    borderColor: '#38bdf8',
                  }}
                >
                  <div className="font-extrabold text-sm flex items-center justify-between">
                    <span>Kết quả tự động trừ gói & tính phụ thu:</span>
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
      )}

      {/* Artwork Zoom Modal */}
      <Modal
        open={Boolean(zoomedCard)}
        title={zoomedCard?.title}
        footer={null}
        onCancel={() => setZoomedCard(null)}
        width={560}
        centered
      >
        {zoomedCard && (
          <img
            src={zoomedCard.imageUrl}
            alt={zoomedCard.title}
            className="w-full rounded-xl object-contain max-h-[75vh]"
          />
        )}
      </Modal>
    </div>
  );
}
