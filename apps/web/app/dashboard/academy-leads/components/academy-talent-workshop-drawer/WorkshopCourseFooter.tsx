'use client';

import React from 'react';
import { Button, Space, Tooltip } from 'antd';
import { Printer, Save } from 'lucide-react';
import { AdaptiveOverlayFooter, AppIcon } from '~/components/ui';
import { formatVND } from '~/lib/format-utils';
import type { AcademyTalentDraft, AcademyTalentPricing } from '../academy-talent-workshop.types';
import styles from '../AcademyTalentWorkshop.module.css';
import { ScholarshipFireworks, ScholarshipRewardSummary } from './ScholarshipCelebrationParts';
import type { ScholarshipCelebration } from './workshop-drawer-utils';

export interface WorkshopCourseFooterProps {
  scholarshipTargetRef: React.RefObject<HTMLDivElement | null>;
  scholarshipTargetReady: boolean;
  scholarshipCelebration: ScholarshipCelebration | null;
  selectedCourseRewardAmounts:
    | {
        scholarshipVnd: number;
        sampleVnd: number;
        kitVnd: number;
      }
    | undefined;
  rewardHeadline: string;
  effectiveRewards: {
    scholarshipPct: number;
    sampleRewardPct: number;
    kitRewardPct: number;
  };
  courseSelectionReady: boolean;
  hasSelectedCourses: boolean;
  draft: AcademyTalentDraft;
  pricing: AcademyTalentPricing | null | undefined;
  paymentChoiceDisabled: boolean;
  paymentChoiceHint: string | undefined;
  isIssued: boolean;
  hasPrintedInvoice: boolean;
  isBusy: boolean;
  onSelectDepositMode: () => void;
  onSelectFullMode: () => void;
  onSaveSelection: () => void;
  onOpenInvoicePreview: () => void;
}

export function WorkshopCourseFooter({
  scholarshipTargetRef,
  scholarshipTargetReady,
  scholarshipCelebration,
  selectedCourseRewardAmounts,
  rewardHeadline,
  effectiveRewards,
  courseSelectionReady,
  hasSelectedCourses,
  draft,
  pricing,
  paymentChoiceDisabled,
  paymentChoiceHint,
  isIssued,
  hasPrintedInvoice,
  isBusy,
  onSelectDepositMode,
  onSelectFullMode,
  onSaveSelection,
  onOpenInvoicePreview,
}: WorkshopCourseFooterProps) {
  return (
    <AdaptiveOverlayFooter className={styles.footer}>
      <div className={styles.footerSummaryWrap}>
        <div className={styles.selectionSummary} aria-label="Tóm tắt học phí Tố Chất">
          <div
            ref={scholarshipTargetRef}
            className={styles.courseScholarshipFooter}
            data-celebrating={scholarshipTargetReady && scholarshipCelebration ? 'true' : undefined}
            data-flight-pending={scholarshipTargetReady ? undefined : 'true'}
            data-has-course-selection={selectedCourseRewardAmounts ? 'true' : undefined}
          >
            {scholarshipTargetReady && (
              <ScholarshipRewardSummary
                className={`${styles.scholarshipRewardSummary} ${styles.courseScholarshipFooterSummary}`}
                headline={rewardHeadline}
                scholarshipPct={effectiveRewards.scholarshipPct}
                sampleRewardPct={effectiveRewards.sampleRewardPct}
                kitRewardPct={effectiveRewards.kitRewardPct}
                rewardAmounts={selectedCourseRewardAmounts}
                showTotalReward
              />
            )}
            {scholarshipTargetReady && <ScholarshipFireworks celebration={scholarshipCelebration} />}
          </div>
          {courseSelectionReady && (
            <div className={styles.salesDockCheckout}>
              <div className={styles.salesDockPaymentHeader}>Hình thức thanh toán</div>
              <div
                className={styles.salesDockPaymentModes}
                role="group"
                aria-label={
                  hasSelectedCourses ? 'Hình thức học phí' : 'Hình thức học phí — chọn ít nhất một khóa học để tiếp tục'
                }
              >
                <button
                  type="button"
                  aria-pressed={hasSelectedCourses && draft.paymentMode === 'DEPOSIT'}
                  disabled={paymentChoiceDisabled}
                  title={paymentChoiceHint}
                  onClick={onSelectDepositMode}
                >
                  <span>Cọc học bổng</span>
                  <strong className="tabular-nums">
                    {formatVND(draft.depositVnd ?? pricing?.suggestedDepositVnd ?? 0)}
                  </strong>
                </button>
                <button
                  type="button"
                  aria-pressed={hasSelectedCourses && draft.paymentMode === 'FULL'}
                  disabled={paymentChoiceDisabled}
                  title={paymentChoiceHint}
                  onClick={onSelectFullMode}
                >
                  <span>Đầu tư trọn gói</span>
                  <strong className="tabular-nums">{formatVND(pricing?.finalTotalVnd || 0)}</strong>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {courseSelectionReady && (
        <div className={styles.salesDockActionSection}>
          <div className={styles.salesDockPaymentHeader}>Đầu tư ngay</div>
          <Space className={styles.salesDockActions}>
            <Tooltip
              title={
                isIssued
                  ? 'Phiếu đã thanh toán đủ'
                  : hasPrintedInvoice
                    ? 'Lưu điều chỉnh trước khi in phiên bản mới'
                    : 'Lưu lựa chọn'
              }
            >
              <Button
                aria-label={isIssued ? 'Phiếu đã thanh toán đủ' : hasPrintedInvoice ? 'Lưu điều chỉnh' : 'Lưu lựa chọn'}
                icon={<AppIcon icon={Save} />}
                disabled={isIssued}
                loading={!isIssued && isBusy}
                onClick={onSaveSelection}
              >
                {isIssued ? 'Đã chốt' : hasPrintedInvoice ? 'Lưu điều chỉnh' : 'Lưu'}
              </Button>
            </Tooltip>
            <Tooltip
              title={
                isIssued
                  ? 'Xem & in lại phiếu đã thanh toán'
                  : hasPrintedInvoice
                    ? 'Xem và in phiên bản điều chỉnh'
                    : 'Xem trước hóa đơn trước khi lập và in'
              }
            >
              <Button
                aria-label={
                  isIssued
                    ? 'Xem & in lại phiếu đã thanh toán'
                    : hasPrintedInvoice
                      ? 'Xem và in phiên bản điều chỉnh'
                      : 'Xem trước hóa đơn trước khi lập và in'
                }
                type="primary"
                icon={<AppIcon icon={Printer} />}
                loading={isBusy}
                disabled={!isIssued && !draft.selectedCourseIds.length}
                onClick={onOpenInvoicePreview}
              >
                {isIssued ? 'In lại' : hasPrintedInvoice ? 'In phiên bản mới' : 'In phiếu'}
              </Button>
            </Tooltip>
          </Space>
        </div>
      )}
    </AdaptiveOverlayFooter>
  );
}
