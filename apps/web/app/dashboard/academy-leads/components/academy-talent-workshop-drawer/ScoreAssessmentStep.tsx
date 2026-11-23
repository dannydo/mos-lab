'use client';

import React from 'react';
import { Alert, Button, Input, Rate } from 'antd';
import { ChevronDown, Eye, Minus, Plus, Star } from 'lucide-react';
import { ACADEMY_TALENT_STRANDS_5_MIN_MAX, ACADEMY_TALENT_STRANDS_5_MIN_MIN } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { AcademyMilestoneLadder } from '../AcademyMilestoneLadder';
import type {
  AcademyTalentDraft,
  AcademyTalentErrorKey,
  AcademyTalentMilestone,
  AcademyTalentResult,
} from '../academy-talent-workshop.types';
import styles from '../AcademyTalentWorkshop.module.css';
import { ScholarshipRewardSummary } from './ScholarshipCelebrationParts';
import { clampInteger, ERROR_CARD_CONFIGS, RATING_LABELS } from './workshop-drawer-utils';

function RatingCard({
  title,
  description,
  icon,
  tone,
  value,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  tone: 'cyan' | 'orange';
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const visibleStars = clampInteger(value, 0, 4) + 1;
  const scoreLabel = RATING_LABELS[clampInteger(value, 0, 4)];
  const caption = description.startsWith(`${value}đ:`) ? description : `${value}đ: ${scoreLabel} · ${description}`;

  return (
    <div className={`${styles.ratingCard} ${tone === 'orange' ? styles.ratingOrange : styles.ratingCyan}`}>
      <span className={styles.ratingIcon}>{icon}</span>
      <div className={styles.ratingCopy}>
        <strong>{title}</strong>
        <small>
          <b>{caption}</b>
        </small>
      </div>
      <Rate
        count={5}
        value={visibleStars}
        disabled={disabled}
        character={<AppIcon icon={Star} fill="currentColor" />}
        aria-label={`${title}: ${value} điểm (${scoreLabel}), hiển thị ${visibleStars} trên 5 sao`}
        onChange={(stars) => onChange(clampInteger(stars - 1, 0, 4))}
      />
    </div>
  );
}

function WorkshopSectionHeader({
  index,
  title,
  titleId,
  hint,
}: {
  index: string;
  title: string;
  titleId: string;
  hint?: string;
}) {
  return (
    <div className={styles.sectionTitle}>
      <span>{index}</span>
      <h3 id={titleId}>{title}</h3>
      {hint && <small className={styles.sectionHint}>{hint}</small>}
    </div>
  );
}

function ErrorCounter({
  title,
  description,
  icon,
  value,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  value: number;
  disabled: boolean;
  onChange: (delta: number) => void;
}) {
  return (
    <div className={`${styles.errorCard} ${value > 0 ? styles.errorCardHasErrors : ''}`}>
      <div className={styles.errorCopy}>
        <span className={styles.errorIcon}>{icon}</span>
        <div>
          <strong>{title}</strong>
          <small>{description}</small>
        </div>
      </div>
      <div className={styles.counterControls}>
        <Button
          aria-label={`Giảm lỗi ${title}`}
          icon={<AppIcon icon={Minus} />}
          disabled={disabled || value <= 0}
          onClick={() => onChange(-1)}
        />
        <strong className="tabular-nums" aria-label={`${value} lỗi ${title}`}>
          {value}
        </strong>
        <Button
          aria-label={`Tăng lỗi ${title}`}
          icon={<AppIcon icon={Plus} />}
          disabled={disabled}
          onClick={() => onChange(1)}
        />
      </div>
    </div>
  );
}

export interface ScoreAssessmentStepProps {
  isIssued: boolean;
  hasPrintedInvoice: boolean;
  draft: AcademyTalentDraft;
  inputDisabled: boolean;
  scoreRewardHeadline: string;
  ladderRewards: {
    scholarshipPct: number;
    sampleRewardPct: number;
    kitRewardPct: number;
  };
  milestones: AcademyTalentMilestone[];
  sliderMax: number;
  editMode: boolean;
  draftErrorTotal: number;
  result: AcademyTalentResult | null | undefined;
  scholarshipSourceRef: React.RefObject<HTMLDivElement | null>;
  onUpdateAssessmentOnlyDraft: (updater: (current: AcademyTalentDraft) => AcademyTalentDraft) => void;
  onUpdateQuoteDraft: (updater: (current: AcademyTalentDraft) => AcademyTalentDraft) => void;
  onEditTier: (tierKey: string) => void;
  onSetErrorCount: (key: AcademyTalentErrorKey, delta: number) => void;
  onChangeNote: (note: string | null) => void;
}

export function ScoreAssessmentStep({
  isIssued,
  hasPrintedInvoice,
  draft,
  inputDisabled,
  scoreRewardHeadline,
  ladderRewards,
  milestones,
  sliderMax,
  editMode,
  draftErrorTotal,
  result,
  scholarshipSourceRef,
  onUpdateAssessmentOnlyDraft,
  onUpdateQuoteDraft,
  onEditTier,
  onSetErrorCount,
  onChangeNote,
}: ScoreAssessmentStepProps) {
  return (
    <section className={`${styles.stepPanel} ${styles.scorePanel}`}>
      {isIssued ? (
        <Alert
          type="info"
          showIcon
          className={styles.lockedAlert}
          message="Phiếu đã thanh toán đủ"
          description="Nội dung và học phí đã được khóa để khớp với khoản tiền đã xác nhận. Tạo lần test mới nếu cần một báo giá khác."
        />
      ) : hasPrintedInvoice ? (
        <Alert
          type="warning"
          showIcon
          className={styles.lockedAlert}
          message="Phiếu đã in nhưng chưa thanh toán đủ"
          description="Bạn vẫn có thể điều chỉnh nội dung. Sau khi lưu, hãy in phiên bản mới để học viên nhận đúng QR và số tiền."
        />
      ) : null}

      <section className={styles.scoreSection} aria-labelledby="academy-talent-eye-hand-title">
        <WorkshopSectionHeader index="I." title="Kiểm tra cơ địa mắt & tay" titleId="academy-talent-eye-hand-title" />
        <div className={styles.ratingGrid}>
          <RatingCard
            title="Kiểm tra mắt"
            description="Đánh giá độ phù hợp của mắt và tư thế thao tác"
            icon={<AppIcon icon={Eye} />}
            tone="cyan"
            value={draft.eyeScore}
            onChange={(value) =>
              onUpdateAssessmentOnlyDraft((current) => ({ ...current, eyeScore: clampInteger(value, 0, 4) }))
            }
            disabled={inputDisabled}
          />
          <RatingCard
            title="Kiểm tra tay"
            description="Đánh giá độ ổn định, điều khiển nhíp và tay nghề nền"
            icon={
              <span aria-label="Bàn tay" role="img">
                🖐️
              </span>
            }
            tone="orange"
            value={draft.handScore}
            onChange={(value) =>
              onUpdateAssessmentOnlyDraft((current) => ({ ...current, handScore: clampInteger(value, 0, 4) }))
            }
            disabled={inputDisabled}
          />
        </div>
      </section>

      <section
        className={`${styles.scoreSection} ${styles.practiceSection}`}
        aria-labelledby="academy-talent-strands-title"
      >
        <WorkshopSectionHeader
          hint="Nhập số sợi thực tế để nhận kết quả và mức ưu đãi."
          index="II."
          title="Thử thách nối mi 5 phút trên dummy"
          titleId="academy-talent-strands-title"
        />
        <div className={styles.summitScene}>
          <ScholarshipRewardSummary
            ref={scholarshipSourceRef}
            className={`${styles.scholarshipRewardSummary} ${styles.summitRewardSummary}`}
            headline={scoreRewardHeadline}
            scholarshipPct={ladderRewards.scholarshipPct}
            sampleRewardPct={ladderRewards.sampleRewardPct}
            kitRewardPct={ladderRewards.kitRewardPct}
          />
          <AcademyMilestoneLadder
            milestones={milestones}
            sliderMax={sliderMax}
            value={draft.strands5Min}
            disabled={inputDisabled}
            onChange={(nextValue) =>
              onUpdateQuoteDraft((current) => ({
                ...current,
                strands5Min: clampInteger(
                  nextValue,
                  ACADEMY_TALENT_STRANDS_5_MIN_MIN,
                  ACADEMY_TALENT_STRANDS_5_MIN_MAX
                ),
              }))
            }
            editMode={editMode}
            onEditTier={onEditTier}
          />
        </div>
      </section>

      <details className={styles.coachingDisclosure}>
        <summary>
          <span className={styles.coachingDisclosureTitle}>
            <span>III.</span>
            <strong id="academy-talent-errors-title">Hoàn thiện tay nghề 1-1</strong>
            <small>Các lỗi cần tránh & nhận xét cho học viên</small>
          </span>
          <span className={`${styles.errorSummary} ${draftErrorTotal > 0 ? styles.errorSummaryHasErrors : ''}`}>
            <span>Cần tinh chỉnh:</span>{' '}
            <strong className="tabular-nums">{result?.totalErrors ?? draftErrorTotal} điểm</strong>
          </span>
          <span className={styles.coachingDisclosureAction} aria-hidden="true">
            <AppIcon icon={ChevronDown} />
          </span>
        </summary>
        <div className={styles.coachingDisclosureBody} aria-labelledby="academy-talent-errors-title">
          <div className={styles.errorGrid}>
            {ERROR_CARD_CONFIGS.map((item) => (
              <ErrorCounter
                key={item.key}
                title={item.title}
                description={item.description}
                icon={<AppIcon icon={item.icon} />}
                value={draft.errors[item.key]}
                disabled={inputDisabled}
                onChange={(delta) => onSetErrorCount(item.key, delta)}
              />
            ))}
          </div>
          <div className={styles.noteField}>
            <label htmlFor="academy-talent-note">Nhận xét thêm cho học viên</label>
            <Input.TextArea
              id="academy-talent-note"
              value={draft.note || ''}
              autoSize={{ minRows: 1, maxRows: 2 }}
              placeholder="Ghi lại điểm mạnh, kỹ năng cần ưu tiên hoặc lời hẹn tư vấn…"
              disabled={inputDisabled}
              onChange={(event) => onChangeNote(event.target.value || null)}
            />
          </div>
        </div>
      </details>
    </section>
  );
}
