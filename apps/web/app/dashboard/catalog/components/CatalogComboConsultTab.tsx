'use client';

import { useState, useMemo } from 'react';
import { Card, Switch, Button, Row, Col, Space, Typography, message } from 'antd';
import { Sparkles, Lock, ShieldCheck } from 'lucide-react';
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
import { CatalogComboComparePanel } from './combo-consult/CatalogComboComparePanel';
import { CatalogComboPackageGrid } from './combo-consult/CatalogComboPackageGrid';
import { CatalogComboAccountingSimulator } from './combo-consult/CatalogComboAccountingSimulator';

const { Text, Title } = Typography;

export default function CatalogComboConsultTab() {
  const { themeMode } = useTheme();
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
      <Card size="small" className="rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <Title level={5} className="!m-0">
                Bàn Tư Vấn & Bảng Giá Combo 13 Dòng Mi Chuẩn Wings (Single Source of Truth)
              </Title>
            </div>
            <Text type="secondary" className="text-xs">
              Thay thế hoàn toàn trang tra cứu rời rạc bên ngoài · Tự động kiểm tra điều kiện Gói Welcome ngày đầu & mô
              phỏng kế toán trừ gói
            </Text>
          </div>

          <Space wrap size="middle">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
                isFirstDayCustomer
                  ? isDark
                    ? 'bg-emerald-950/30 border-emerald-500'
                    : 'bg-emerald-50 border-emerald-500'
                  : isDark
                    ? 'bg-amber-950/30 border-amber-500'
                    : 'bg-amber-50 border-amber-500'
              }`}
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
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
                isDark ? 'bg-neutral-800/60 border-neutral-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="text-xs font-semibold">Hiển thị giá gồm 8% VAT:</span>
              <Switch size="small" checked={includeVat} onChange={setIncludeVat} />
            </div>
          </Space>
        </div>

        {/* 13 Lash Line Filter Pills */}
        <div className="mb-3">
          <div className="text-xs font-bold uppercase tracking-wider mb-1.5 text-neutral-500">
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
                  className={active ? 'rounded-xl font-bold' : 'rounded-xl font-medium'}
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
            <div className="text-xs font-bold uppercase tracking-wider mb-1.5 text-neutral-500">
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
                      className={`p-2.5 rounded-xl cursor-pointer transition-all ${
                        active
                          ? isDark
                            ? 'bg-amber-950/30 border-2 border-amber-500'
                            : 'bg-amber-50 border-2 border-amber-500'
                          : isDark
                            ? 'bg-neutral-800/50 border border-neutral-700'
                            : 'bg-slate-50 border border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-sm">
                          {u.isUnderLash ? 'Mi Dưới 390' : `Mã ${u.volume}`}
                        </span>
                        {meta.badge && (
                          <span className="inline-flex items-center justify-center leading-none py-1 px-2 rounded-full text-[10px] font-bold bg-amber-400 text-neutral-950">
                            {meta.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-xs mt-0.5 truncate text-neutral-500">{meta.fanLabel}</div>
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
      <CatalogComboComparePanel
        comparedPackages={comparedPackages}
        includeVat={includeVat}
        isDark={isDark}
        onClearCompare={() => setCompareIds([])}
        onToggleCompare={toggleCompare}
      />

      {/* Package Grid Display (with Unified WingsComboCard) */}
      <CatalogComboPackageGrid
        packages={packages}
        compareIds={compareIds}
        activeSimPkgId={activeSimPkg?.id}
        copiedId={copiedId}
        includeVat={includeVat}
        isDark={isDark}
        onSelectSimPkg={setSimSelectedPkgId}
        onToggleCompare={toggleCompare}
        onCopyQuote={(pkg) => {
          void handleCopyQuote(pkg);
        }}
        onZoomCard={setZoomedCard}
      />

      {/* Accounting & Redemption Simulator */}
      {activeSimPkg && (
        <CatalogComboAccountingSimulator
          activeSimPkg={activeSimPkg}
          simMode={simMode}
          onChangeSimMode={setSimMode}
          purchaseAccounting={purchaseAccounting}
          redemptionAccounting={redemptionAccounting}
          simWalletState={simWalletState}
          onChangeSimWalletState={setSimWalletState}
          simRedeemServiceType={simRedeemServiceType}
          onChangeSimRedeemServiceType={setSimRedeemServiceType}
          simTargetCategoryId={simTargetCategoryId}
          onChangeSimTargetCategoryId={setSimTargetCategoryId}
          simTargetVolume={simTargetVolume}
          onChangeSimTargetVolume={setSimTargetVolume}
          targetCategoryObj={targetCategoryObj}
          isDark={isDark}
        />
      )}

      {/* Artwork Zoom Overlay */}
      {zoomedCard && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-4"
          onClick={() => setZoomedCard(null)}
        >
          <div className="w-full max-w-xl flex items-center justify-between text-white mb-3">
            <span className="text-sm font-bold">{zoomedCard.title}</span>
            <Button size="small" onClick={() => setZoomedCard(null)}>
              Đóng ✕
            </Button>
          </div>
          <img
            src={zoomedCard.imageUrl}
            alt={zoomedCard.title}
            className="w-full max-w-xl rounded-xl object-contain max-h-[75vh]"
          />
        </div>
      )}
    </div>
  );
}
