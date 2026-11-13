'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X, Sparkles } from 'lucide-react';
import type {
  ComboTodayUsageMode,
  ExistingComboSnapshotForExpiry,
  MatchedComboPackageOption,
  WelcomeComboEligibilityResult,
  WingsComboCategoryId,
} from '@mos-lab/shared';
import { CvFeather1Badge } from '../../ui-kit/CvFeatherLabels';
import { ComboCatalogConsultModal } from '../ComboCatalogConsultModal';
import { LashCurlZoomModal } from '../LashCurlZoomModal';
import { LashMaterialConfiguratorModal } from '../LashMaterialConfiguratorModal';
import { LashDesignZoomModal } from '../LashDesignZoomModal';
import { EyeShapeCompareModal } from '../EyeShapeCompareModal';
import { LashConsultationInfoModal, type InfoModalType } from '../LashConsultationInfoModal';
import type { LashMaterialSpec } from '../LashMaterialConstraintMatrix';
import type {
  ConsultationInfoModalPayload,
  PendingOverrideState,
  PendingUpgradeConfirmationState,
} from './ConsultationTypes';

interface ConsultationModalsClusterProps {
  isDark: boolean;
  isSuperAdmin: boolean;
  isCurlZoomOpen: boolean;
  setIsCurlZoomOpen: (open: boolean) => void;
  zoomCurlId: string;
  selectedCurl: string;
  setSelectedCurl: (curlId: string) => void;
  currentMaterialSpec: LashMaterialSpec;
  isConfiguratorOpen: boolean;
  setIsConfiguratorOpen: (open: boolean) => void;
  materialCatalog: LashMaterialSpec[];
  setMaterialCatalog: (catalog: LashMaterialSpec[]) => void;
  selectedMaterial: string;
  isCompareDesignsOpen: boolean;
  setIsCompareDesignsOpen: (open: boolean) => void;
  zoomDesignId: string;
  selectedStyle: string;
  setSelectedStyle: (designId: string) => void;
  isEyeCompareOpen: boolean;
  setIsEyeCompareOpen: (open: boolean) => void;
  selectedEyeShape: string;
  setSelectedEyeShape: (eyeId: string) => void;
  zoomEyeShapeId: string;
  infoModalKey: InfoModalType;
  setInfoModalKey: (key: InfoModalType) => void;
  pendingOverride: PendingOverrideState | null;
  setPendingOverride: (state: PendingOverrideState | null) => void;
  selectedOverrideReasonDraft: string;
  setSelectedOverrideReasonDraft: (reason: string) => void;
  activeInfoModal: ConsultationInfoModalPayload | null;
  setActiveInfoModal: (modal: ConsultationInfoModalPayload | null) => void;
  pendingUpgradeConfirmation: PendingUpgradeConfirmationState | null;
  setPendingUpgradeConfirmation: (state: PendingUpgradeConfirmationState | null) => void;
  isComboCatalogModalOpen: boolean;
  setIsComboCatalogModalOpen: (open: boolean) => void;
  comboCatalogTarget: 'upper' | 'under';
  autoMatchedCombo: { categoryId: WingsComboCategoryId; volume: number | 'under' };
  welcomeEligibility: WelcomeComboEligibilityResult;
  customerName: string;
  customerPhone: string;
  customerAvatar?: string;
  selectedNewComboPkg: MatchedComboPackageOption | null;
  setSelectedNewComboPkg: (pkg: MatchedComboPackageOption | null) => void;
  selectedUnderComboPkg: MatchedComboPackageOption | null;
  setSelectedUnderComboPkg: (pkg: MatchedComboPackageOption | null) => void;
  todaySingleServicePrice: number;
  existingUpperExpirySnapshot?: ExistingComboSnapshotForExpiry | null;
  existingUnderExpirySnapshot?: ExistingComboSnapshotForExpiry | null;
  upperTodayUsageMode?: ComboTodayUsageMode;
  underTodayUsageMode?: ComboTodayUsageMode;
  todayServiceType?: 'Normal' | 'Retain';
  underServiceType?: 'Normal' | 'Retain';
  handleSelectComboPackage: (pkg: MatchedComboPackageOption) => void;
  setHasUnderMink: React.Dispatch<React.SetStateAction<boolean>>;
}

export function ConsultationModalsCluster({
  isDark,
  isSuperAdmin,
  isCurlZoomOpen,
  setIsCurlZoomOpen,
  zoomCurlId,
  selectedCurl,
  setSelectedCurl,
  currentMaterialSpec,
  isConfiguratorOpen,
  setIsConfiguratorOpen,
  materialCatalog,
  setMaterialCatalog,
  selectedMaterial,
  isCompareDesignsOpen,
  setIsCompareDesignsOpen,
  zoomDesignId,
  selectedStyle,
  setSelectedStyle,
  isEyeCompareOpen,
  setIsEyeCompareOpen,
  selectedEyeShape,
  setSelectedEyeShape,
  zoomEyeShapeId,
  infoModalKey,
  setInfoModalKey,
  pendingOverride,
  setPendingOverride,
  selectedOverrideReasonDraft,
  setSelectedOverrideReasonDraft,
  activeInfoModal,
  setActiveInfoModal,
  pendingUpgradeConfirmation,
  setPendingUpgradeConfirmation,
  isComboCatalogModalOpen,
  setIsComboCatalogModalOpen,
  comboCatalogTarget,
  autoMatchedCombo,
  welcomeEligibility,
  customerName,
  customerPhone,
  customerAvatar,
  selectedNewComboPkg,
  setSelectedNewComboPkg,
  selectedUnderComboPkg,
  setSelectedUnderComboPkg,
  todaySingleServicePrice,
  existingUpperExpirySnapshot,
  existingUnderExpirySnapshot,
  upperTodayUsageMode,
  underTodayUsageMode,
  todayServiceType,
  underServiceType,
  handleSelectComboPackage,
  setHasUnderMink,
}: ConsultationModalsClusterProps) {
  return (
    <>
      <LashCurlZoomModal
        isOpen={isCurlZoomOpen}
        initialCurlId={zoomCurlId || selectedCurl}
        allowedCurls={currentMaterialSpec.allowedCurls}
        materialName={currentMaterialSpec.shortLabel}
        lockedCurlReason={currentMaterialSpec.lockedCurlReason}
        onClose={() => setIsCurlZoomOpen(false)}
        onSelectCurl={(curlId) => {
          if (currentMaterialSpec.allowedCurls.includes(curlId)) {
            setSelectedCurl(curlId);
          }
        }}
      />

      {isSuperAdmin && (
        <LashMaterialConfiguratorModal
          open={isConfiguratorOpen}
          catalog={materialCatalog}
          initialMaterialId={selectedMaterial}
          onClose={() => setIsConfiguratorOpen(false)}
          onCatalogChange={(nextCatalog) => {
            setMaterialCatalog(nextCatalog);
          }}
        />
      )}

      <LashDesignZoomModal
        isOpen={isCompareDesignsOpen}
        initialDesignId={zoomDesignId || selectedStyle}
        allowedDesigns={currentMaterialSpec.allowedDesigns}
        materialName={currentMaterialSpec.shortLabel}
        lockedDesignReasons={currentMaterialSpec.lockedDesignReasons}
        onClose={() => setIsCompareDesignsOpen(false)}
        onSelectDesign={(designId) => {
          setSelectedStyle(designId);
        }}
      />

      <EyeShapeCompareModal
        open={isEyeCompareOpen}
        selectedEyeShapeId={selectedEyeShape}
        initialEyeShapeId={zoomEyeShapeId}
        onClose={() => setIsEyeCompareOpen(false)}
        onSelectEyeShape={(eyeId) => {
          setSelectedEyeShape(eyeId);
        }}
      />

      <LashConsultationInfoModal
        type={infoModalKey}
        material={currentMaterialSpec}
        onClose={() => setInfoModalKey(null)}
      />

      {/* Modal Cảnh Báo Xác Nhận Khi CVL Override Chu Kỳ 25 Ngày Hoặc Khác Gói Combo */}
      {pendingOverride && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-[360px] rounded-3xl p-4 shadow-2xl border-2 border-rose-500 space-y-3 animate-in fade-in zoom-in-95 duration-150 ${
              isDark ? 'bg-[#1C1C1E] text-white' : 'bg-white text-neutral-900'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                  isDark ? 'bg-rose-950/80 text-rose-400' : 'bg-rose-100 text-rose-600'
                }`}
              >
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className={`text-[13px] font-black leading-tight ${isDark ? 'text-rose-300' : 'text-rose-950'}`}>
                  {pendingOverride.title}
                </div>
                <div
                  className={`text-[11px] font-medium mt-1 leading-relaxed ${
                    isDark ? 'text-neutral-300' : 'text-neutral-600'
                  }`}
                >
                  {pendingOverride.message}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div
                className={`text-[10.5px] font-extrabold uppercase tracking-wide flex items-center gap-1 ${
                  isDark ? 'text-neutral-300' : 'text-neutral-800'
                }`}
              >
                <span>Chọn lý do</span>
                <CvFeather1Badge />
                <span>Override (Bắt buộc ghi nhận):</span>
              </div>
              <div className="space-y-1.5">
                {pendingOverride.reasons.map((reason) => {
                  const active = selectedOverrideReasonDraft === reason;
                  return (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setSelectedOverrideReasonDraft(reason)}
                      className={`w-full p-2.5 rounded-xl border text-left text-[11px] font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        active
                          ? isDark
                            ? 'bg-rose-950/50 border-rose-500 text-rose-200 ring-1 ring-rose-500'
                            : 'bg-rose-50 border-rose-500 text-rose-950 ring-1 ring-rose-500'
                          : isDark
                            ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      <span className="leading-snug">{reason}</span>
                      {active && <CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingOverride(null)}
                className={`py-2.5 px-3 rounded-xl font-extrabold text-[12px] cursor-pointer transition-all ${
                  isDark
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                }`}
              >
                Hủy · Giữ chuẩn
              </button>
              <button
                type="button"
                onClick={() => pendingOverride.onConfirm(selectedOverrideReasonDraft || pendingOverride.defaultReason)}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[12px] shadow-md cursor-pointer transition-all"
              >
                ⚠️ Xác nhận Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS-Style Minimalist Info Modal Sheet */}
      {activeInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[var(--mos-surface)] text-[var(--mos-text)] rounded-2xl w-full max-w-sm p-4 border border-[var(--mos-surface-border)] shadow-2xl space-y-3 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Info className={`w-4 h-4 ${isDark ? 'text-[#FFB400]' : 'text-amber-600'}`} />
                <h4 className="text-[13px] font-black uppercase text-[var(--mos-text)] tracking-wide">{activeInfoModal.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveInfoModal(null)}
                className="w-7 h-7 rounded-full bg-[var(--mos-surface-muted)] hover:opacity-80 flex items-center justify-center text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] border border-[var(--mos-surface-border)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeInfoModal.badge && (
              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${isDark ? 'bg-[#FFB400]/20 text-[#FFB400] border-[#FFB400]/30' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
                {activeInfoModal.badge}
              </span>
            )}

            <p className="text-[12px] text-[var(--mos-text-muted)] leading-relaxed font-medium">{activeInfoModal.content}</p>

            {activeInfoModal.advice && (
              <div className={`rounded-xl p-2.5 border text-[11px] leading-relaxed font-medium ${isDark ? 'bg-[var(--mos-surface-muted)] border-amber-400/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-950'}`}>
                💡 <strong>Quy chuẩn Wings:</strong> {activeInfoModal.advice}
              </div>
            )}

            <button
              type="button"
              onClick={() => setActiveInfoModal(null)}
              className="w-full py-2.5 rounded-xl bg-[var(--mos-accent)] hover:opacity-90 text-[var(--mos-accent-contrast)] font-extrabold text-[12px] transition-colors cursor-pointer shadow-xs"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Nâng Cấp Dịch Vụ Từ Combo */}
      {pendingUpgradeConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[var(--mos-surface)] text-[var(--mos-text)] rounded-3xl w-full max-w-[390px] p-4 border border-emerald-500/50 shadow-2xl space-y-3.5 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border ${isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                  <Sparkles className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className={`text-[14px] font-black uppercase tracking-wide ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    Xác Nhận Nâng Cấp Dịch Vụ
                  </h4>
                  <span className="text-[11px] text-[var(--mos-text-muted)] font-medium">Từ Gói Combo Đang Sử Dụng</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingUpgradeConfirmation(null)}
                className="w-7 h-7 rounded-full bg-[var(--mos-surface-muted)] hover:opacity-80 flex items-center justify-center text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] border border-[var(--mos-surface-border)] transition-colors cursor-pointer shrink-0 mt-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="bg-[var(--mos-surface-raised)] rounded-xl p-2.5 border border-[var(--mos-surface-border)] space-y-1">
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="text-[var(--mos-text-muted)] font-bold uppercase tracking-wider">1. Gói Combo gốc</span>
                  <span className="text-[var(--mos-text-muted)] tabular-nums font-semibold">
                    {pendingUpgradeConfirmation.serviceType === 'Normal' ? '✦ Suất Nối Mới' : '↻ Suất Dặm'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-black text-[var(--mos-text)] leading-snug">
                    {pendingUpgradeConfirmation.comboName}
                  </span>
                  <span className="text-[12.5px] font-bold text-[var(--mos-text-muted)] tabular-nums shrink-0">
                    {pendingUpgradeConfirmation.comboBasePrice.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              <div className={`bg-gradient-to-r from-amber-500/10 to-amber-500/5 rounded-xl p-2.5 border space-y-1 ${isDark ? 'border-amber-500/40' : 'border-amber-300'}`}>
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className={`font-bold uppercase tracking-wider flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                    <Sparkles className={`w-3 h-3 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    <span>2. Nâng cấp hôm nay</span>
                  </span>
                  {pendingUpgradeConfirmation.targetSpecs && (
                    <span className={`font-bold tabular-nums ${isDark ? 'text-amber-300/80' : 'text-amber-700'}`}>
                      {pendingUpgradeConfirmation.targetSpecs}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[13px] font-black leading-snug ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>
                    {pendingUpgradeConfirmation.targetName}
                  </span>
                  <span className={`text-[13px] font-black tabular-nums shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                    {pendingUpgradeConfirmation.targetPrice.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              <div className="bg-[var(--mos-surface-raised)] rounded-xl p-3 border border-[var(--mos-surface-border)] space-y-2 text-[11.5px]">
                <div className="flex items-center justify-between text-[var(--mos-text-muted)]">
                  <span>Phạm vi áp dụng:</span>
                  <span className="font-bold text-[var(--mos-text)] text-[11px] px-2 py-0.5 rounded-full bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)]">
                    {pendingUpgradeConfirmation.upgradeScope === 'ALL'
                      ? `Toàn bộ gói (${pendingUpgradeConfirmation.comboNormalRemaining} Mới · ${pendingUpgradeConfirmation.comboRetainRemaining} Dặm)`
                      : pendingUpgradeConfirmation.serviceType === 'Normal'
                        ? 'Chỉ 1 ca Nối Mới hôm nay (✦ 1)'
                        : 'Chỉ 1 ca Dặm hôm nay (↻ 1)'}
                  </span>
                </div>

                {pendingUpgradeConfirmation.upgradeScope === 'SINGLE' ? (
                  <div className="flex items-center justify-between text-[var(--mos-text-muted)] pt-1 border-t border-[var(--mos-surface-border)]">
                    <span>Cách tính chênh lệch:</span>
                    <span className="font-mono text-[11px] text-[var(--mos-text-muted)] tabular-nums">
                      {pendingUpgradeConfirmation.targetPrice.toLocaleString('vi-VN')} -{' '}
                      {pendingUpgradeConfirmation.comboBasePrice.toLocaleString('vi-VN')}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1 pt-1 border-t border-[var(--mos-surface-border)] text-[11px]">
                    <div className="flex items-center justify-between text-[var(--mos-text-muted)]">
                      <span>
                        Nối Mới ({pendingUpgradeConfirmation.comboNormalRemaining} ca × +
                        {pendingUpgradeConfirmation.normalDiff.toLocaleString('vi-VN')} đ):
                      </span>
                      <span className="font-bold text-[var(--mos-text)] tabular-nums">
                        +
                        {(
                          pendingUpgradeConfirmation.normalDiff * pendingUpgradeConfirmation.comboNormalRemaining
                        ).toLocaleString('vi-VN')}{' '}
                        đ
                      </span>
                    </div>
                    {pendingUpgradeConfirmation.comboRetainRemaining > 0 && (
                      <div className="flex items-center justify-between text-[var(--mos-text-muted)]">
                        <span>
                          Dặm ({pendingUpgradeConfirmation.comboRetainRemaining} ca × +
                          {pendingUpgradeConfirmation.retainDiff.toLocaleString('vi-VN')} đ):
                        </span>
                        <span className="font-bold text-[var(--mos-text)] tabular-nums">
                          +
                          {(
                            pendingUpgradeConfirmation.retainDiff * pendingUpgradeConfirmation.comboRetainRemaining
                          ).toLocaleString('vi-VN')}{' '}
                          đ
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-[var(--mos-surface-border)] flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-extrabold text-[var(--mos-text)] text-[12.5px]">Phụ thu thanh toán:</span>
                    <span className="text-[10px] text-[var(--mos-text-muted)]">
                      (Trừ 1 suất {pendingUpgradeConfirmation.serviceType === 'Normal' ? 'Mới' : 'Dặm'} trong gói)
                    </span>
                  </div>
                  <span className={`text-[17px] font-black tabular-nums tracking-tight ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    +{pendingUpgradeConfirmation.totalAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            </div>

            <div className={`rounded-xl p-2.5 border text-[11px] leading-snug ${isDark ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-200/90' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
              ℹ️ Khoản phụ thu này sẽ được tự động cộng vào hóa đơn tại quầy Thu Ngân khi khách làm xong và Checkout.
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setPendingUpgradeConfirmation(null)}
                className="py-2.5 px-3 rounded-xl bg-[var(--mos-surface-muted)] hover:opacity-80 text-[var(--mos-text)] border border-[var(--mos-surface-border)] font-bold text-[12px] cursor-pointer transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={pendingUpgradeConfirmation.onConfirm}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:brightness-105 text-white font-extrabold text-[12px] shadow-lg shadow-emerald-900/30 cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Xác nhận</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ComboCatalogConsultModal
        open={isComboCatalogModalOpen}
        onClose={() => setIsComboCatalogModalOpen(false)}
        initialCategoryId={comboCatalogTarget === 'under' ? 'FlawlessMink' : autoMatchedCombo.categoryId}
        initialVolume={comboCatalogTarget === 'under' ? 'under' : autoMatchedCombo.volume}
        welcomeEligibility={welcomeEligibility}
        customerName={customerName}
        customerPhone={customerPhone}
        customerAvatar={customerAvatar}
        selectedPackageId={comboCatalogTarget === 'under' ? selectedUnderComboPkg?.id : selectedNewComboPkg?.id}
        initialSelectedUpperPkg={selectedNewComboPkg}
        initialSelectedUnderPkg={selectedUnderComboPkg}
        todaySingleServicePrice={todaySingleServicePrice}
        existingUpperExpirySnapshot={existingUpperExpirySnapshot}
        existingUnderExpirySnapshot={existingUnderExpirySnapshot}
        upperTodayUsageMode={upperTodayUsageMode}
        underTodayUsageMode={underTodayUsageMode}
        todayServiceType={todayServiceType}
        underServiceType={underServiceType}
        onSelectPackage={handleSelectComboPackage}
        onApplyPackages={({ upperPkg, underPkg }) => {
          setSelectedNewComboPkg(upperPkg);
          setSelectedUnderComboPkg(underPkg);
          if (underPkg) {
            setHasUnderMink(true);
          }
        }}
      />
    </>
  );
}
