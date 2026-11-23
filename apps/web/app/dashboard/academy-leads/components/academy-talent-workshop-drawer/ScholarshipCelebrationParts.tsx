'use client';

import React from 'react';
import { formatVND } from '~/lib/format-utils';
import styles from '../AcademyTalentWorkshop.module.css';
import {
  SCHOLARSHIP_FIREWORKS,
  type ScholarshipCelebration,
  type ScholarshipRewardFlight,
} from './workshop-drawer-utils';

export function ResultStat({
  label,
  value,
  tone,
  rewardVnd,
}: {
  label: string;
  value: string;
  tone: 'gold' | 'cyan' | 'amber';
  rewardVnd?: number;
}) {
  return (
    <div
      className={`${styles.resultStat} ${styles[`resultStat${tone[0].toUpperCase()}${tone.slice(1)}`]}`}
      data-has-amount={rewardVnd !== undefined ? 'true' : undefined}
    >
      <span>{label}</span>
      <strong className="tabular-nums">{value}</strong>
      {rewardVnd !== undefined && (
        <small className={`${styles.resultStatAmount} tabular-nums`}>Giá trị {formatVND(rewardVnd)}</small>
      )}
    </div>
  );
}

export const ScholarshipRewardSummary = React.forwardRef<
  HTMLDivElement,
  {
    className: string;
    headline: string;
    scholarshipPct: number;
    sampleRewardPct: number;
    kitRewardPct: number;
    showTotalReward?: boolean;
    rewardAmounts?: {
      scholarshipVnd: number;
      sampleVnd: number;
      kitVnd: number;
    };
  }
>(function ScholarshipRewardSummary(
  { className, headline, scholarshipPct, sampleRewardPct, kitRewardPct, rewardAmounts, showTotalReward = false },
  ref
) {
  const totalRewardVnd =
    (rewardAmounts?.scholarshipVnd ?? 0) + (rewardAmounts?.sampleVnd ?? 0) + (rewardAmounts?.kitVnd ?? 0);

  return (
    <div ref={ref} className={className} data-has-total-reward={showTotalReward ? 'true' : undefined}>
      <h3 aria-live="polite">{headline}</h3>
      <div className={styles.resultStats}>
        <ResultStat
          label="Học bổng"
          value={`${scholarshipPct}%`}
          tone="gold"
          rewardVnd={rewardAmounts?.scholarshipVnd}
        />
        <ResultStat label="Ưu đãi mẫu" value={`${sampleRewardPct}%`} tone="cyan" rewardVnd={rewardAmounts?.sampleVnd} />
        <ResultStat label="Đồ nghề" value={`${kitRewardPct}%`} tone="amber" rewardVnd={rewardAmounts?.kitVnd} />
        {showTotalReward && <ResultStat label="Tổng thưởng" value={formatVND(totalRewardVnd)} tone="gold" />}
      </div>
    </div>
  );
});

ScholarshipRewardSummary.displayName = 'ScholarshipRewardSummary';

export function ScholarshipRewardFlightOverlay({ flight }: { flight: ScholarshipRewardFlight }) {
  const flightRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const element = flightRef.current;
    if (!element) return;
    element.style.setProperty('--scholarship-flight-x', `${flight.deltaX}px`);
    element.style.setProperty('--scholarship-flight-y', `${flight.deltaY}px`);
    element.style.setProperty('--scholarship-flight-x-18', `${flight.deltaX * 0.18}px`);
    element.style.setProperty('--scholarship-flight-y-18', `${flight.deltaY * 0.18}px`);
    element.style.setProperty('--scholarship-flight-x-82', `${flight.deltaX * 0.82}px`);
    element.style.setProperty('--scholarship-flight-y-82', `${flight.deltaY * 0.82}px`);
    element.style.setProperty('--scholarship-flight-scale', String(flight.scale));
    element.style.setProperty('--scholarship-flight-overshoot-scale', String(flight.scale * 1.08));
    element.style.left = `${flight.fromX}px`;
    element.style.top = `${flight.fromY}px`;
    element.style.width = `${flight.width}px`;
  }, [flight]);

  return (
    <div ref={flightRef} aria-hidden="true" className={styles.scholarshipRewardFlight} key={flight.id}>
      <ScholarshipRewardSummary
        className={`${styles.scholarshipRewardSummary} ${styles.scholarshipRewardFlightSummary}`}
        headline={flight.headline}
        scholarshipPct={flight.scholarshipPct}
        sampleRewardPct={flight.sampleRewardPct}
        kitRewardPct={flight.kitRewardPct}
      />
    </div>
  );
}

function FireworkBurst({ burst }: { burst: (typeof SCHOLARSHIP_FIREWORKS)[number] }) {
  const burstRef = React.useRef<HTMLSpanElement>(null);

  React.useLayoutEffect(() => {
    const element = burstRef.current;
    if (!element) return;
    element.style.setProperty('--scholarship-firework-color', burst.color);
    element.style.setProperty('--scholarship-firework-delay', burst.delay);
    element.style.left = burst.left;
    element.style.top = burst.top;
  }, [burst]);

  return <span ref={burstRef} className={styles.scholarshipFireworkBurst} />;
}

export function ScholarshipFireworks({ celebration }: { celebration: ScholarshipCelebration | null }) {
  if (!celebration || celebration.intensity === 0) return null;
  const burstCount = celebration.intensity === 1 ? 3 : celebration.intensity === 2 ? 5 : SCHOLARSHIP_FIREWORKS.length;

  return (
    <div aria-hidden="true" className={styles.scholarshipFireworks} key={celebration.id}>
      {SCHOLARSHIP_FIREWORKS.slice(0, burstCount).map((burst, index) => (
        <FireworkBurst key={`${celebration.id}-${index}`} burst={burst} />
      ))}
    </div>
  );
}
