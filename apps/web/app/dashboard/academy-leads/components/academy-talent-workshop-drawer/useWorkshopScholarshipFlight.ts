'use client';

import React from 'react';
import type { ScholarshipCelebration, ScholarshipRewardFlight } from './workshop-drawer-utils';

export interface UseWorkshopScholarshipFlightOptions {
  step: 1 | 2;
  setStep: React.Dispatch<React.SetStateAction<1 | 2>>;
  canOpenCourseStep: boolean;
  scoreRewardHeadline: string;
  ladderRewards: {
    scholarshipPct: number;
    sampleRewardPct: number;
    kitRewardPct: number;
  };
  scholarshipCelebrationIntensity: 0 | 1 | 2 | 3;
}

export function useWorkshopScholarshipFlight({
  step,
  setStep,
  canOpenCourseStep,
  scoreRewardHeadline,
  ladderRewards,
  scholarshipCelebrationIntensity,
}: UseWorkshopScholarshipFlightOptions) {
  const [scholarshipRewardFlight, setScholarshipRewardFlight] = React.useState<ScholarshipRewardFlight | null>(null);
  const [scholarshipCelebration, setScholarshipCelebration] = React.useState<ScholarshipCelebration | null>(null);
  const [scholarshipTargetReady, setScholarshipTargetReady] = React.useState(true);
  const [courseSelectionReady, setCourseSelectionReady] = React.useState(true);
  const scholarshipSourceRef = React.useRef<HTMLDivElement>(null);
  const scholarshipTargetRef = React.useRef<HTMLDivElement>(null);
  const scholarshipTransitionTimerRef = React.useRef<number | null>(null);
  const courseSelectionTimerRef = React.useRef<number | null>(null);
  const scholarshipTransitionIdRef = React.useRef(0);

  const clearTransitionTimers = React.useCallback(() => {
    if (scholarshipTransitionTimerRef.current !== null) {
      window.clearTimeout(scholarshipTransitionTimerRef.current);
      scholarshipTransitionTimerRef.current = null;
    }
    if (courseSelectionTimerRef.current !== null) {
      window.clearTimeout(courseSelectionTimerRef.current);
      courseSelectionTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => clearTransitionTimers, [clearTransitionTimers]);

  const resetScholarshipTransition = React.useCallback(() => {
    clearTransitionTimers();
    setScholarshipRewardFlight(null);
    setScholarshipCelebration(null);
    setScholarshipTargetReady(true);
    setCourseSelectionReady(true);
  }, [clearTransitionTimers]);

  const completeScholarshipTransfer = React.useCallback(() => {
    scholarshipTransitionTimerRef.current = null;
    setScholarshipRewardFlight(null);
    setScholarshipTargetReady(true);
    setScholarshipCelebration({
      id: ++scholarshipTransitionIdRef.current,
      intensity: scholarshipCelebrationIntensity,
    });
    courseSelectionTimerRef.current = window.setTimeout(
      () => {
        courseSelectionTimerRef.current = null;
        setCourseSelectionReady(true);
      },
      scholarshipCelebrationIntensity > 0 ? 1180 : 620
    );
  }, [scholarshipCelebrationIntensity]);

  const openCourseStepWithScholarshipTransfer = React.useCallback(() => {
    if (!canOpenCourseStep || step === 2) return;

    const source = scholarshipSourceRef.current?.getBoundingClientRect() || null;
    clearTransitionTimers();
    setScholarshipRewardFlight(null);
    setScholarshipCelebration(null);
    setScholarshipTargetReady(false);
    setCourseSelectionReady(false);
    setStep(2);

    // The footer is mounted with the next step. On a large canvas it can take
    // more than two frames to receive its final geometry, so wait briefly for
    // a real destination instead of silently skipping the flight.
    const launchFlight = (attempt = 0) => {
      const target = scholarshipTargetRef.current?.getBoundingClientRect() || null;
      if (!source || !target) {
        if (source && attempt < 8) {
          window.requestAnimationFrame(() => launchFlight(attempt + 1));
          return;
        }
        completeScholarshipTransfer();
        return;
      }

      const fromWidth = Math.max(source.width, 1);
      const targetWidth = Math.max(target.width, 1);
      const id = ++scholarshipTransitionIdRef.current;
      setScholarshipRewardFlight({
        id,
        // Transfer the same live ladder result that the evaluator just saw.
        // The footer still renders the server quote after landing, including
        // its expiry rules and selected-course VND amounts.
        headline: scoreRewardHeadline,
        fromX: source.left + source.width / 2,
        fromY: source.top + source.height / 2,
        width: source.width,
        deltaX: target.left + target.width / 2 - (source.left + source.width / 2),
        deltaY: target.top + target.height / 2 - (source.top + source.height / 2),
        scale: Math.min(1.35, Math.max(0.45, targetWidth / fromWidth)),
        scholarshipPct: ladderRewards.scholarshipPct,
        sampleRewardPct: ladderRewards.sampleRewardPct,
        kitRewardPct: ladderRewards.kitRewardPct,
      });
      scholarshipTransitionTimerRef.current = window.setTimeout(completeScholarshipTransfer, 760);
    };

    window.requestAnimationFrame(() => launchFlight());
  }, [
    canOpenCourseStep,
    clearTransitionTimers,
    completeScholarshipTransfer,
    ladderRewards,
    scoreRewardHeadline,
    setStep,
    step,
  ]);

  const returnToScoreStep = React.useCallback(() => {
    resetScholarshipTransition();
    setStep(1);
  }, [resetScholarshipTransition, setStep]);

  return {
    scholarshipRewardFlight,
    scholarshipCelebration,
    scholarshipTargetReady,
    courseSelectionReady,
    scholarshipSourceRef,
    scholarshipTargetRef,
    resetScholarshipTransition,
    openCourseStepWithScholarshipTransfer,
    returnToScoreStep,
  };
}
