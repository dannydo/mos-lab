'use client';

import type { CSSProperties } from 'react';
import { Tooltip, theme } from 'antd';
import type { BugReportSummary } from '@mos-lab/shared';
import {
  BUG_REPORT_WORKFLOW_STEPS,
  effectiveBugReportAgentProgress,
  getBugReportWorkflowStage,
} from './bug-report-workflow';
import styles from './BugReportWorkflowProgress.module.css';

interface BugReportWorkflowProgressProps {
  report: Pick<BugReportSummary, 'key' | 'status' | 'clarification' | 'agentProgress'>;
  compact?: boolean;
}

/** Shared status route for the Inbox, mobile queue, and reporter feedback panel. */
export function BugReportWorkflowProgress({ report, compact = false }: BugReportWorkflowProgressProps) {
  const { token } = theme.useToken();
  const agentProgress = effectiveBugReportAgentProgress(report);
  const workflow = getBugReportWorkflowStage({ ...report, agentProgress });
  const colorByTone = {
    warning: token.colorWarning,
    primary: token.colorPrimary,
    info: token.colorInfo,
    success: token.colorSuccess,
    muted: token.colorTextSecondary,
  };
  const workflowColor = colorByTone[workflow.tone];
  const isStopped = workflow.position === null;
  const positionLabel = isStopped ? 'Dừng' : `Chặng ${workflow.position}/5`;
  const route = BUG_REPORT_WORKFLOW_STEPS.join(' → ');
  const ariaLabel = `${report.key}: ${positionLabel}, ${workflow.label}. ${workflow.detail}. Lộ trình ${route}.`;

  return (
    <Tooltip title={`Lộ trình: ${route}. ${workflow.label} · ${workflow.detail}`}>
      <div
        className={`${styles.root}${compact ? ` ${styles.compact}` : ''}${isStopped ? ` ${styles.stopped}` : ''}`}
        role="img"
        aria-label={ariaLabel}
        style={{ '--bug-ticket-workflow-color': workflowColor } as CSSProperties}
      >
        {compact ? (
          <>
            <WorkflowTrack position={workflow.position} />
            <div className={styles.compactSummary}>
              <span className={styles.position}>{positionLabel}</span>
              <span className={styles.label}>{workflow.label}</span>
            </div>
          </>
        ) : (
          <>
            <div className={styles.summary}>
              <span className={styles.position}>{positionLabel}</span>
              <span className={styles.label}>{workflow.label}</span>
            </div>
            <WorkflowTrack position={workflow.position} />
            <span className={styles.detail}>{workflow.detail}</span>
          </>
        )}
      </div>
    </Tooltip>
  );
}

function WorkflowTrack({ position }: { position: number | null }) {
  return (
    <div className={styles.track} aria-hidden="true">
      {BUG_REPORT_WORKFLOW_STEPS.map((step, index) => {
        const stepNumber = index + 1;
        const isComplete = position !== null && stepNumber < position;
        const isActive = stepNumber === position;
        return (
          <span
            className={`${styles.segment}${isComplete ? ` ${styles.segmentComplete}` : ''}${
              isActive ? ` ${styles.segmentActive}` : ''
            }`}
            key={step}
          />
        );
      })}
    </div>
  );
}
