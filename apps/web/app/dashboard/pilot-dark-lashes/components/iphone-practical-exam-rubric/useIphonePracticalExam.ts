'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { message } from 'antd';
import {
  TOTAL_PRACTICAL_EXAM_SECONDS,
  DEFAULT_LEFT_EYE_PHOTO,
  DEFAULT_RIGHT_EYE_PHOTO,
  DEFAULT_EXAMINER_NOTES,
  buildInitialScores,
  calculateTotalScore,
  getExamRank,
  getTimerColorClass,
  type PracticalRubricScores,
  type RubricStageKey,
} from './rubric-config';

interface UseIphonePracticalExamParams {
  candidateName: string;
  initialScores?: Partial<PracticalRubricScores>;
  onApproveCert?: (finalScore: number, notes: string) => void;
}

export function useIphonePracticalExam({ candidateName, initialScores, onApproveCert }: UseIphonePracticalExamParams) {
  const [secondsLeft, setSecondsLeft] = useState<number>(TOTAL_PRACTICAL_EXAM_SECONDS);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [scores, setScores] = useState<PracticalRubricScores>(() => buildInitialScores(initialScores));
  const [leftEyePhoto, setLeftEyePhoto] = useState<string | null>(DEFAULT_LEFT_EYE_PHOTO);
  const [rightEyePhoto, setRightEyePhoto] = useState<string | null>(DEFAULT_RIGHT_EYE_PHOTO);
  const [examinerNotes, setExaminerNotes] = useState<string>(DEFAULT_EXAMINER_NOTES);
  const [signModalOpen, setSignModalOpen] = useState<boolean>(false);
  const [isSigned, setIsSigned] = useState<boolean>(false);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            message.warning('⏱️ Đã hết thời gian thi thực hành 70 phút!');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  const timerColorClass = useMemo(() => getTimerColorClass(secondsLeft), [secondsLeft]);
  const totalScore = useMemo(() => calculateTotalScore(scores), [scores]);
  const rank = useMemo(() => getExamRank(totalScore), [totalScore]);

  const toggleTimer = () => setTimerRunning((prev) => !prev);

  const resetTimer = () => {
    setTimerRunning(false);
    setSecondsLeft(TOTAL_PRACTICAL_EXAM_SECONDS);
  };

  const setStageScore = (stageKey: RubricStageKey, value: number) => {
    setScores((prev) => ({ ...prev, [stageKey]: value }));
  };

  const captureLeftEyePhoto = () => {
    setLeftEyePhoto('/uploads/left-verified.jpg');
    message.success('Đã ghi nhận ảnh macro mắt trái!');
  };

  const captureRightEyePhoto = () => {
    setRightEyePhoto('/uploads/right-verified.jpg');
    message.success('Đã ghi nhận ảnh macro mắt phải!');
  };

  const appendQuickTag = (tag: string) => {
    setExaminerNotes((prev) => (prev ? `${prev} · ${tag}` : tag));
  };

  const handleApprove = () => {
    setIsSigned(true);
    setSignModalOpen(false);
    message.success(`Đã ký duyệt và cấp chứng chỉ mOS thành công cho ${candidateName}!`);
    if (onApproveCert) {
      onApproveCert(totalScore, examinerNotes);
    }
  };

  return {
    secondsLeft,
    timerRunning,
    timerColorClass,
    toggleTimer,
    resetTimer,
    scores,
    setStageScore,
    totalScore,
    rank,
    leftEyePhoto,
    rightEyePhoto,
    captureLeftEyePhoto,
    captureRightEyePhoto,
    examinerNotes,
    setExaminerNotes,
    appendQuickTag,
    signModalOpen,
    setSignModalOpen,
    isSigned,
    handleApprove,
  };
}
