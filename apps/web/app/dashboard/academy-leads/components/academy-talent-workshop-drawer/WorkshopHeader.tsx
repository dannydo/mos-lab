'use client';

import React from 'react';
import { Button, Select, Tooltip } from 'antd';
import { Plus, Save, Trophy, UserRound } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import type {
  AcademyTalentAssessmentSession,
  AcademyTalentAssessmentView,
  AcademyTalentLead,
} from '../academy-talent-workshop.types';
import styles from '../AcademyTalentWorkshop.module.css';

function AcademyLearnerAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => setImageFailed(false), [avatarUrl]);

  if (avatarUrl && !imageFailed) {
    return (
      <img
        alt={`Ảnh đại diện ${name}`}
        className={styles.learnerAvatar}
        src={avatarUrl}
        onError={() => setImageFailed(true)}
      />
    );
  }

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return (
    <span aria-label={`Chưa có ảnh đại diện của ${name}`} className={styles.learnerAvatar}>
      {initials || <AppIcon icon={UserRound} />}
    </span>
  );
}

export interface WorkshopHeaderProps {
  workshopTitle: string;
  step: 1 | 2;
  canOpenCourseStep: boolean;
  lead: AcademyTalentLead | null;
  orderedSessions: AcademyTalentAssessmentSession[];
  displayView: AcademyTalentAssessmentView | null | undefined;
  isBusy: boolean;
  isIssued: boolean;
  isNewSession: boolean;
  nextSessionNumber: number;
  busyAction: 'save' | 'invoice' | 'payment' | 'session' | null;
  canSelectSession: boolean;
  canStartNewSession: boolean;
  onReturnToScoreStep: () => void;
  onOpenCourseStep: () => void;
  onSelectSession: (assessmentId: number) => void;
  onStartNewSession: () => void;
  onSaveAssessment: () => void;
}

export function WorkshopHeader({
  workshopTitle,
  step,
  canOpenCourseStep,
  lead,
  orderedSessions,
  displayView,
  isBusy,
  isIssued,
  isNewSession,
  nextSessionNumber,
  busyAction,
  canSelectSession,
  canStartNewSession,
  onReturnToScoreStep,
  onOpenCourseStep,
  onSelectSession,
  onStartNewSession,
  onSaveAssessment,
}: WorkshopHeaderProps) {
  return (
    <header className={styles.topbar}>
      <div className={styles.titleBlock}>
        <div className={styles.workshopTitle}>
          <AppIcon icon={Trophy} /> <span>{workshopTitle}</span>
        </div>
        <div className={styles.stepPills} aria-label="Các bước workshop">
          <button
            type="button"
            className={`${styles.stepPill} ${step === 1 ? styles.stepPillActive : ''}`}
            onClick={onReturnToScoreStep}
          >
            <span>1</span> Chấm điểm năng khiếu
          </button>
          <button
            type="button"
            className={`${styles.stepPill} ${step === 2 ? styles.stepPillActive : ''}`}
            onClick={onOpenCourseStep}
            disabled={!canOpenCourseStep}
          >
            <span>2</span> Chọn khóa học phù hợp
          </button>
        </div>
      </div>
      <div className={styles.learnerHeader}>
        <div className={styles.learnerIdentity}>
          <AcademyLearnerAvatar name={lead?.name || 'Học viên'} avatarUrl={lead?.avatarUrl} />
          <div className={styles.learnerDetails}>
            <span>Học viên</span>
            <strong>{lead?.name || 'Chưa chọn học viên'}</strong>
          </div>
        </div>
        <div className={styles.headerDivider} aria-hidden="true" />
        <div className={styles.sessionMeta}>
          <span>Lần test</span>
          <div className={styles.sessionControls}>
            {orderedSessions.length > 4 && canSelectSession ? (
              <Select
                size="small"
                className={styles.sessionSelect}
                aria-label="Chọn lần test"
                value={displayView?.id}
                disabled={isBusy}
                options={orderedSessions.map((session) => ({
                  value: session.id,
                  label: String(session.sessionNumber),
                }))}
                onChange={(value) => onSelectSession(Number(value))}
              />
            ) : orderedSessions.length > 1 && canSelectSession ? (
              <div className={styles.sessionNumberList} aria-label="Chọn lần test">
                {orderedSessions.map((session) => (
                  <Button
                    key={session.id}
                    aria-label={`Chọn lần test ${session.sessionNumber}`}
                    className={`${styles.sessionNumberButton} ${session.id === displayView?.id ? styles.sessionNumberButtonActive : ''}`}
                    disabled={isBusy}
                    size="small"
                    type="text"
                    onClick={() => onSelectSession(session.id)}
                  >
                    {session.sessionNumber}
                  </Button>
                ))}
              </div>
            ) : (
              <strong className={styles.sessionNumberStatic}>{displayView?.sessionNumber || 1}</strong>
            )}
            {canStartNewSession && (
              <Tooltip title="Tạo lần test mới">
                <Button
                  aria-label="Tạo lần test mới"
                  className={styles.newSessionButton}
                  size="small"
                  type="text"
                  icon={<AppIcon icon={Plus} />}
                  disabled={isBusy}
                  onClick={onStartNewSession}
                />
              </Tooltip>
            )}
            {!isIssued && (
              <Tooltip title="Lưu chấm điểm">
                <Button
                  aria-label="Lưu chấm điểm"
                  className={styles.headerSaveButton}
                  disabled={isBusy}
                  icon={<AppIcon icon={Save} />}
                  loading={busyAction === 'save'}
                  size="small"
                  type="text"
                  onClick={onSaveAssessment}
                />
              </Tooltip>
            )}
          </div>
        </div>
        {isNewSession && <span className={styles.unsavedSession}>#{nextSessionNumber} chưa lưu</span>}
      </div>
    </header>
  );
}
