'use client';

import React from 'react';
import type { AcademyTalentMilestone } from './academy-talent-workshop.types';
import styles from './AcademyTalentWorkshop.module.css';

type AcademyLadderCheckpoint = {
  score: number;
  position: number;
};

type AcademyLadderTier = 'entry' | 'kha' | 'trienVong' | 'vuotTroi' | 'thienBam' | 'thienThan';

const LADDER_TIERS: AcademyLadderTier[] = ['entry', 'kha', 'trienVong', 'vuotTroi', 'thienBam', 'thienThan'];

const DEFAULT_BUBBLE_HEIGHTS = [20, 29, 38, 47, 57, 67];

function clampLadderValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Reserve one visual column per milestone. This intentionally decouples
 * physical placement from the numerical gaps between 1 / 3 / 5 / 10 / 20 / 35.
 */
function createCheckpoints(milestones: AcademyTalentMilestone[], sliderMax: number): AcademyLadderCheckpoint[] {
  const visibleMilestones = milestones
    .filter((milestone) => milestone.strands > 0 && milestone.strands <= sliderMax)
    .sort((left, right) => left.strands - right.strands);

  const checkpoints: AcademyLadderCheckpoint[] = [{ score: 0, position: 0 }];

  visibleMilestones.forEach((milestone, index) => {
    checkpoints.push({
      score: milestone.strands,
      position: ((index + 0.5) / Math.max(visibleMilestones.length, 1)) * 100,
    });
  });

  const lastCheckpoint = checkpoints[checkpoints.length - 1];
  if (lastCheckpoint.score < sliderMax) checkpoints.push({ score: sliderMax, position: 100 });
  return checkpoints;
}

function positionForScore(score: number, checkpoints: AcademyLadderCheckpoint[]) {
  const safeScore = Math.max(0, Math.round(score));
  const nextIndex = checkpoints.findIndex((checkpoint) => checkpoint.score >= safeScore);
  if (nextIndex === -1) return checkpoints[checkpoints.length - 1]?.position || 0;
  if (nextIndex === 0) return checkpoints[0].position;

  const previous = checkpoints[nextIndex - 1];
  const next = checkpoints[nextIndex];
  return (
    previous.position +
    ((safeScore - previous.score) / (next.score - previous.score)) * (next.position - previous.position)
  );
}

function scoreForPosition(position: number, checkpoints: AcademyLadderCheckpoint[]) {
  const safePosition = Math.max(0, Math.min(100, position));
  const nextIndex = checkpoints.findIndex((checkpoint) => checkpoint.position >= safePosition);
  if (nextIndex === -1) return checkpoints[checkpoints.length - 1]?.score || 0;
  if (nextIndex === 0) return checkpoints[0].score;

  const previous = checkpoints[nextIndex - 1];
  const next = checkpoints[nextIndex];
  return Math.round(
    previous.score +
      ((safePosition - previous.position) / (next.position - previous.position)) * (next.score - previous.score)
  );
}

function tierForIndex(index: number): AcademyLadderTier {
  return LADDER_TIERS[index % LADDER_TIERS.length] || 'entry';
}

export function AcademyMilestoneLadder({
  milestones,
  sliderMax,
  value,
  disabled,
  onChange,
  editMode = false,
  onEditTier,
}: {
  milestones: AcademyTalentMilestone[];
  sliderMax: number;
  value: number;
  disabled: boolean;
  onChange: (nextValue: number) => void;
  editMode?: boolean;
  onEditTier?: (tierKey: string) => void;
}) {
  const railRef = React.useRef<HTMLDivElement>(null);
  const activePointerId = React.useRef<number | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const checkpoints = React.useMemo(() => createCheckpoints(milestones, sliderMax), [milestones, sliderMax]);
  const normalizedValue = clampLadderValue(value, 0, sliderMax);
  const progress = positionForScore(normalizedValue, checkpoints);

  const setFromPointer = React.useCallback(
    (clientX: number) => {
      const bounds = railRef.current?.getBoundingClientRect();
      if (!bounds?.width) return;

      const maxPosition = checkpoints[checkpoints.length - 1]?.position || 100;
      const pointerPosition = Math.max(0, Math.min(maxPosition, ((clientX - bounds.left) / bounds.width) * 100));
      const nextValue = clampLadderValue(scoreForPosition(pointerPosition, checkpoints), 0, sliderMax);
      if (nextValue !== normalizedValue) onChange(nextValue);
    },
    [checkpoints, normalizedValue, onChange, sliderMax]
  );

  const completePointer = React.useCallback(
    (pointerId: number, clientX?: number) => {
      if (activePointerId.current !== pointerId) return;
      if (typeof clientX === 'number') setFromPointer(clientX);
      activePointerId.current = null;
      setIsDragging(false);
    },
    [setFromPointer]
  );

  React.useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (activePointerId.current !== event.pointerId) return;
      event.preventDefault();
      setFromPointer(event.clientX);
    };
    const onPointerUp = (event: PointerEvent) => completePointer(event.pointerId, event.clientX);
    const onPointerCancel = (event: PointerEvent) => completePointer(event.pointerId);
    const resetDrag = () => {
      activePointerId.current = null;
      setIsDragging(false);
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('blur', resetDrag);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('blur', resetDrag);
    };
  }, [completePointer, setFromPointer]);

  return (
    <div
      className={`${styles.summitLadder} ${isDragging ? styles.summitLadderDragging : ''}`}
      style={{ '--academy-ladder-columns': String(Math.max(milestones.length, 1)) } as React.CSSProperties}
    >
      <div
        ref={railRef}
        className={styles.summitRail}
        style={{ '--academy-talent-progress': `${progress}%` } as React.CSSProperties}
      >
        <span className={`${styles.summitCurrent} tabular-nums`} style={{ left: `${progress}%` }} aria-hidden="true">
          <span className={styles.summitNodeValue}>{normalizedValue}</span>
        </span>
      </div>

      <div className={`${styles.summitStops} ${editMode ? styles.summitStopsEditable : ''}`} aria-hidden={!editMode}>
        {milestones.map((milestone, index) => {
          const active = normalizedValue >= milestone.strands;
          return (
            <div
              className={`${styles.summitStop} ${active ? styles.summitStopActive : ''}`}
              data-ladder-tier={tierForIndex(index)}
              key={milestone.key}
              style={
                {
                  '--academy-ladder-stem': `${milestone.bubbleHeightPercent ?? DEFAULT_BUBBLE_HEIGHTS[index] ?? 20}%`,
                } as React.CSSProperties
              }
            >
              <button
                type="button"
                className={styles.summitRewardBubble}
                aria-label={editMode ? `Chỉnh sửa mốc ${milestone.title}` : undefined}
                disabled={!editMode}
                tabIndex={editMode ? 0 : -1}
                onClick={() => onEditTier?.(milestone.key)}
              >
                <small>{milestone.title}</small>
                <strong className="tabular-nums">{Math.round(milestone.scholarshipPct)}%</strong>
              </button>
              <span className={`${styles.summitStopNode} tabular-nums`}>
                <span className={styles.summitNodeValue}>{milestone.strands}</span>
              </span>
            </div>
          );
        })}
      </div>

      <input
        aria-label={`Số sợi nối mi trong 5 phút, từ 0 đến ${sliderMax}`}
        aria-valuetext={`${normalizedValue} sợi / 5 phút`}
        className={styles.summitRange}
        disabled={disabled}
        max={sliderMax}
        min={0}
        step={1}
        type="range"
        value={normalizedValue}
        onChange={(event) => {
          if (activePointerId.current !== null) return;
          onChange(clampLadderValue(Number(event.target.value), 0, sliderMax));
        }}
        onPointerDown={(event) => {
          if (disabled) return;
          activePointerId.current = event.pointerId;
          event.currentTarget.setPointerCapture?.(event.pointerId);
          setIsDragging(true);
          event.preventDefault();
          setFromPointer(event.clientX);
        }}
        onPointerUp={(event) => {
          completePointer(event.pointerId, event.clientX);
          event.currentTarget.releasePointerCapture?.(event.pointerId);
        }}
        onPointerCancel={(event) => completePointer(event.pointerId)}
        onLostPointerCapture={(event) => completePointer(event.pointerId)}
      />

      <div className={styles.summitMobileLegend} aria-label="Các mốc quyền lợi theo số sợi đạt được">
        {milestones.map((milestone) =>
          editMode ? (
            <button
              key={milestone.key}
              type="button"
              aria-label={`Chỉnh sửa mốc ${milestone.title}`}
              onClick={() => onEditTier?.(milestone.key)}
            >
              <b className="tabular-nums">{milestone.strands}</b>
              <small>
                {milestone.title} · {Math.round(milestone.scholarshipPct)}%
              </small>
            </button>
          ) : (
            <span key={milestone.key}>
              <b className="tabular-nums">{milestone.strands}</b>
              <small>
                {milestone.title} · {Math.round(milestone.scholarshipPct)}%
              </small>
            </span>
          )
        )}
      </div>
    </div>
  );
}
