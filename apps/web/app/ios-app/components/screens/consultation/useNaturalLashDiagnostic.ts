'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import type { BookingItem } from '../../../state/mockData';
import {
  NATURAL_LASH_LENGTH_OPTIONS,
  NATURAL_LASH_THICKNESS_OPTIONS,
  NATURAL_EYE_SHAPES,
  computeLashRecommendation,
  resolveNaturalLashCountLabel,
} from '../NaturalLashAssessmentData';
import { parseLengthRangeOrNull, parseThicknessRangeOrNull, parseCountRangeOrNull } from './DualThumbRangeSlider';
import type { ConsultationInfoModalPayload } from './ConsultationTypes';

interface UseNaturalLashDiagnosticParams {
  booking?: BookingItem;
  selectedLength: string;
  selectedThickness: string;
  setSelectedStyle: (style: string) => void;
  setSelectedCurl: (curl: string) => void;
  setSelectedThickness: (thickness: string) => void;
  setSelectedLengths: (lengths: number[]) => void;
}

export function useNaturalLashDiagnostic({
  booking,
  selectedLength,
  selectedThickness,
  setSelectedStyle,
  setSelectedCurl,
  setSelectedThickness,
  setSelectedLengths,
}: UseNaturalLashDiagnosticParams) {
  const isNewClient = useMemo(() => {
    return (
      (booking?.customerVisits ?? 1) <= 1 ||
      Boolean(booking?.attributes?.lashHealth?.includes('Virgin')) ||
      booking?.attributes?.isNewClientDiagnosticDone === false
    );
  }, [booking?.customerVisits, booking?.attributes?.lashHealth, booking?.attributes?.isNewClientDiagnosticDone]);

  const canRestoreSavedDiagnostic = booking?.attributes?.isNewClientDiagnosticDone !== false;

  const [naturalLengthRange, setNaturalLengthRange] = useState<[number, number] | null>(() => {
    return parseLengthRangeOrNull(canRestoreSavedDiagnostic ? booking?.attributes?.naturalLashLength : undefined);
  });
  const [naturalThicknessRange, setNaturalThicknessRange] = useState<[number, number] | null>(() => {
    return parseThicknessRangeOrNull(canRestoreSavedDiagnostic ? booking?.attributes?.naturalLashThickness : undefined);
  });
  const [naturalCountRange, setNaturalCountRange] = useState<[number, number] | null>(() => {
    return parseCountRangeOrNull(
      canRestoreSavedDiagnostic
        ? booking?.attributes?.naturalLashCount || resolveNaturalLashCountLabel(booking?.attributes?.naturalLashDensity)
        : undefined
    );
  });

  const [selectedEyeShape, setSelectedEyeShape] = useState<string>(() =>
    canRestoreSavedDiagnostic ? booking?.attributes?.eyeShape || '' : ''
  );
  const [selectedLashHealth, setSelectedLashHealth] = useState<string>(() =>
    canRestoreSavedDiagnostic ? booking?.attributes?.lashHealth || '' : ''
  );
  const [selectedLashTrail, setSelectedLashTrail] = useState<string>(() =>
    canRestoreSavedDiagnostic ? booking?.attributes?.lashTrail || '' : ''
  );
  const [selectedMedicalProblem, setSelectedMedicalProblem] = useState<string>(() =>
    canRestoreSavedDiagnostic ? booking?.attributes?.medicalProblem || '' : ''
  );

  const missingNaturalLashFields = useMemo(() => {
    const missing: string[] = [];
    if (!naturalLengthRange) missing.push('Dài');
    if (!naturalThicknessRange) missing.push('Dày');
    if (!naturalCountRange) missing.push('Số sợi');
    if (!selectedLashTrail) missing.push('Hướng');
    if (!selectedEyeShape) missing.push('Dáng mắt');
    if (!selectedLashHealth) missing.push('Nang mi');
    if (!selectedMedicalProblem) missing.push('Độ nhạy cảm');
    return missing;
  }, [
    naturalLengthRange,
    naturalThicknessRange,
    naturalCountRange,
    selectedLashTrail,
    selectedEyeShape,
    selectedLashHealth,
    selectedMedicalProblem,
  ]);

  const completedNaturalLashCount = 7 - missingNaturalLashFields.length;
  const isNaturalLashComplete = missingNaturalLashFields.length === 0;
  const hasPartialNaturalLashEdits = completedNaturalLashCount > 0 && !isNaturalLashComplete;

  const [hasCheckedNaturalLash, setHasCheckedNaturalLash] = useState<boolean>(() => {
    const initialIsNew =
      (booking?.customerVisits ?? 1) <= 1 ||
      Boolean(booking?.attributes?.lashHealth?.includes('Virgin')) ||
      booking?.attributes?.isNewClientDiagnosticDone === false;
    const initialSavedComplete =
      booking?.attributes?.isNewClientDiagnosticDone === true &&
      Boolean(
        parseLengthRangeOrNull(booking?.attributes?.naturalLashLength) &&
        parseThicknessRangeOrNull(booking?.attributes?.naturalLashThickness) &&
        parseCountRangeOrNull(
          booking?.attributes?.naturalLashCount || resolveNaturalLashCountLabel(booking?.attributes?.naturalLashDensity)
        ) &&
        booking?.attributes?.lashTrail?.trim() &&
        booking?.attributes?.eyeShape?.trim() &&
        booking?.attributes?.lashHealth?.trim() &&
        booking?.attributes?.medicalProblem?.trim()
      );
    return !initialIsNew || initialSavedComplete;
  });

  const [showMandatoryLashCheckAlert, setShowMandatoryLashCheckAlert] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const confirmLashCheckBtnRef = useRef<HTMLButtonElement>(null);
  const lengthInputRef = useRef<HTMLInputElement>(null);
  const thicknessInputRef = useRef<HTMLInputElement>(null);
  const countInputRef = useRef<HTMLInputElement>(null);
  const directionFirstBtnRef = useRef<HTMLButtonElement>(null);
  const eyeShapeFirstBtnRef = useRef<HTMLButtonElement>(null);
  const lashHealthFirstBtnRef = useRef<HTMLButtonElement>(null);
  const medicalProblemFirstBtnRef = useRef<HTMLButtonElement>(null);

  const mustCheckNaturalLashFirst = isNewClient && (!hasCheckedNaturalLash || !isNaturalLashComplete);
  const mustCompleteNaturalLashBeforeProceeding = mustCheckNaturalLashFirst || hasPartialNaturalLashEdits;

  const naturalLengthLabel = useMemo(() => {
    if (!naturalLengthRange) return null;
    if (naturalLengthRange[0] === naturalLengthRange[1]) return `${naturalLengthRange[0]}`;
    return `${naturalLengthRange[0]} – ${naturalLengthRange[1]}`;
  }, [naturalLengthRange]);

  const naturalThicknessLabel = useMemo(() => {
    if (!naturalThicknessRange) return null;
    if (naturalThicknessRange[0] === naturalThicknessRange[1]) return `${naturalThicknessRange[0].toFixed(2)}`;
    return `${naturalThicknessRange[0].toFixed(2)} – ${naturalThicknessRange[1].toFixed(2)}`;
  }, [naturalThicknessRange]);

  const naturalCountLabel = useMemo(() => {
    if (!naturalCountRange) return null;
    if (naturalCountRange[0] === naturalCountRange[1]) return `${naturalCountRange[0]}`;
    return `${naturalCountRange[0]} – ${naturalCountRange[1]}`;
  }, [naturalCountRange]);

  const naturalLength = useMemo(() => {
    if (!naturalLengthRange) return undefined;
    return naturalLengthRange[0] === naturalLengthRange[1]
      ? `${naturalLengthRange[0]}mm`
      : `${naturalLengthRange[0]}-${naturalLengthRange[1]}mm`;
  }, [naturalLengthRange]);

  const naturalThickness = useMemo(() => {
    if (!naturalThicknessRange) return undefined;
    return naturalThicknessRange[0] === naturalThicknessRange[1]
      ? `${naturalThicknessRange[0].toFixed(2)}mm`
      : `${naturalThicknessRange[0].toFixed(2)}-${naturalThicknessRange[1].toFixed(2)}mm`;
  }, [naturalThicknessRange]);

  const naturalCount = useMemo(() => {
    if (!naturalCountRange) return undefined;
    return naturalCountRange[0] === naturalCountRange[1]
      ? `${naturalCountRange[0]}`
      : `${naturalCountRange[0]}-${naturalCountRange[1]}`;
  }, [naturalCountRange]);

  const naturalDensity = useMemo(() => {
    if (!naturalCountRange) return undefined;
    const maxCount = naturalCountRange[1];
    if (maxCount <= 60) return '40-60';
    if (maxCount <= 80) return '60-80';
    if (maxCount <= 100) return '80-100';
    if (maxCount <= 120) return '100-120';
    if (maxCount <= 140) return '120-140';
    return '140+';
  }, [naturalCountRange]);

  const naturalLengthSpec = useMemo(() => {
    if (!naturalLengthRange) return null;
    const maxMm = naturalLengthRange[1];
    return (
      NATURAL_LASH_LENGTH_OPTIONS.find((o) => o.valueMm === maxMm) ||
      NATURAL_LASH_LENGTH_OPTIONS.find((o) => o.id === `${maxMm}mm`) ||
      NATURAL_LASH_LENGTH_OPTIONS[2]
    );
  }, [naturalLengthRange]);

  const naturalThicknessSpec = useMemo(() => {
    if (!naturalThicknessRange) return null;
    const maxThick = naturalThicknessRange[1];
    if (maxThick <= 0.08) {
      return NATURAL_LASH_THICKNESS_OPTIONS[0];
    }
    if (maxThick <= 0.11) {
      return NATURAL_LASH_THICKNESS_OPTIONS[1];
    }
    return NATURAL_LASH_THICKNESS_OPTIONS[2];
  }, [naturalThicknessRange]);

  const recommendation = useMemo(() => {
    if (!isNaturalLashComplete || !naturalLengthSpec || !naturalThickness) return null;
    return computeLashRecommendation({
      lengthMm: naturalLengthSpec.valueMm,
      thicknessId: naturalThickness,
      directionId: selectedLashTrail,
      eyeShapeId: selectedEyeShape,
      healthId: selectedLashHealth,
      isNewClient,
    });
  }, [
    isNaturalLashComplete,
    naturalLengthSpec,
    naturalThickness,
    selectedLashTrail,
    selectedEyeShape,
    selectedLashHealth,
    isNewClient,
  ]);

  const lengthWarning = useMemo(() => {
    if (!naturalLengthSpec || !naturalLengthLabel) return null;
    const nums = selectedLength.match(/\d+/g);
    if (nums && nums.length > 0) {
      const maxChosenMm = Math.max(...nums.map(Number));
      if (maxChosenMm > naturalLengthSpec.safeMaxExtensionMm) {
        return `⚠️ Chiều dài nối ${selectedLength} dài hơn mi thật (${naturalLengthLabel}) quá +2mm (khuyên dùng tối đa ${naturalLengthSpec.safeMaxExtensionMm}mm) có thể gây nặng sụp mí và hại nang mi!`;
      }
    }
    return null;
  }, [selectedLength, naturalLengthSpec, naturalLengthLabel]);

  const thicknessWarning = useMemo(() => {
    if (!naturalThicknessRange || !naturalThicknessLabel) return null;
    if (naturalThicknessRange[1] <= 0.08 && selectedThickness.includes('0.15')) {
      return `🛑 Cảnh báo an toàn: Mi thật của khách là Mi tơ mảnh (${naturalThicknessLabel}). Nối sợi Classic 0.15mm thô nặng sẽ làm gãy rụng nang mi thật!`;
    }
    return null;
  }, [naturalThicknessRange, selectedThickness, naturalThicknessLabel]);

  const [notes, setNotes] = useState(booking?.attributes?.notes || booking?.customerNote || '');

  const [activeSubTab, setActiveSubTab] = useState<'SPECS' | 'PROFILE'>(() => {
    const initialIsNew =
      (booking?.customerVisits ?? 1) <= 1 ||
      Boolean(booking?.attributes?.lashHealth?.includes('Virgin')) ||
      booking?.attributes?.isNewClientDiagnosticDone === false;
    const savedComplete =
      booking?.attributes?.isNewClientDiagnosticDone === true &&
      Boolean(
        parseLengthRangeOrNull(booking?.attributes?.naturalLashLength) &&
        parseThicknessRangeOrNull(booking?.attributes?.naturalLashThickness) &&
        parseCountRangeOrNull(
          booking?.attributes?.naturalLashCount || resolveNaturalLashCountLabel(booking?.attributes?.naturalLashDensity)
        ) &&
        booking?.attributes?.lashTrail?.trim() &&
        booking?.attributes?.eyeShape?.trim() &&
        booking?.attributes?.lashHealth?.trim() &&
        booking?.attributes?.medicalProblem?.trim()
      );
    const initialNeedsCheck = initialIsNew && !savedComplete;
    return initialNeedsCheck ? 'PROFILE' : 'SPECS';
  });

  useEffect(() => {
    const allowRestore = booking?.attributes?.isNewClientDiagnosticDone !== false;
    setNaturalLengthRange(parseLengthRangeOrNull(allowRestore ? booking?.attributes?.naturalLashLength : undefined));
    setNaturalThicknessRange(
      parseThicknessRangeOrNull(allowRestore ? booking?.attributes?.naturalLashThickness : undefined)
    );
    setNaturalCountRange(
      parseCountRangeOrNull(
        allowRestore
          ? booking?.attributes?.naturalLashCount ||
              resolveNaturalLashCountLabel(booking?.attributes?.naturalLashDensity)
          : undefined
      )
    );
    setSelectedEyeShape(allowRestore ? booking?.attributes?.eyeShape || '' : '');
    setSelectedLashHealth(allowRestore ? booking?.attributes?.lashHealth || '' : '');
    setSelectedLashTrail(allowRestore ? booking?.attributes?.lashTrail || '' : '');
    setSelectedMedicalProblem(allowRestore ? booking?.attributes?.medicalProblem || '' : '');
    setNotes(booking?.attributes?.notes || booking?.customerNote || '');

    const clientIsNew =
      (booking?.customerVisits ?? 1) <= 1 ||
      Boolean(booking?.attributes?.lashHealth?.includes('Virgin')) ||
      booking?.attributes?.isNewClientDiagnosticDone === false;
    const savedComplete =
      booking?.attributes?.isNewClientDiagnosticDone === true &&
      Boolean(
        parseLengthRangeOrNull(booking?.attributes?.naturalLashLength) &&
        parseThicknessRangeOrNull(booking?.attributes?.naturalLashThickness) &&
        parseCountRangeOrNull(
          booking?.attributes?.naturalLashCount || resolveNaturalLashCountLabel(booking?.attributes?.naturalLashDensity)
        ) &&
        booking?.attributes?.lashTrail?.trim() &&
        booking?.attributes?.eyeShape?.trim() &&
        booking?.attributes?.lashHealth?.trim() &&
        booking?.attributes?.medicalProblem?.trim()
      );
    const needsCheck = clientIsNew && !savedComplete;
    setHasCheckedNaturalLash(!needsCheck);
    setShowMandatoryLashCheckAlert(false);
    setActiveSubTab(needsCheck ? 'PROFILE' : 'SPECS');
  }, [
    booking?.id,
    booking?.customerVisits,
    booking?.customerNote,
    booking?.attributes?.notes,
    booking?.attributes?.naturalLashLength,
    booking?.attributes?.naturalLashThickness,
    booking?.attributes?.naturalLashCount,
    booking?.attributes?.naturalLashDensity,
    booking?.attributes?.eyeShape,
    booking?.attributes?.lashHealth,
    booking?.attributes?.lashTrail,
    booking?.attributes?.medicalProblem,
    booking?.attributes?.isNewClientDiagnosticDone,
  ]);

  const triggerMandatoryLashCheckGuard = () => {
    setActiveSubTab('PROFILE');
    setShowMandatoryLashCheckAlert(true);
    requestAnimationFrame(() => {
      const firstMissingTarget: HTMLElement | null = !naturalLengthRange
        ? lengthInputRef.current
        : !naturalThicknessRange
          ? thicknessInputRef.current
          : !naturalCountRange
            ? countInputRef.current
            : !selectedLashTrail
              ? directionFirstBtnRef.current
              : !selectedEyeShape
                ? eyeShapeFirstBtnRef.current
                : !selectedLashHealth
                  ? lashHealthFirstBtnRef.current
                  : !selectedMedicalProblem
                    ? medicalProblemFirstBtnRef.current
                    : confirmLashCheckBtnRef.current;
      firstMissingTarget?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      firstMissingTarget?.focus?.({ preventScroll: true });
    });
  };

  const handleConfirmNaturalLashOnly = () => {
    if (!isNaturalLashComplete) {
      triggerMandatoryLashCheckGuard();
      return;
    }
    setHasCheckedNaturalLash(true);
    setShowMandatoryLashCheckAlert(false);

    if (recommendation) {
      setSelectedStyle(recommendation.recommendedDesign);
      setSelectedCurl(recommendation.recommendedCurl);
      setSelectedThickness(recommendation.recommendedThickness);

      const maxSafe = recommendation.maxSafeMm;
      const safeSizes = [maxSafe - 2, maxSafe - 1, maxSafe].filter((s) => s >= 7 && s <= 15);
      setSelectedLengths(safeSizes.length > 0 ? safeSizes : [maxSafe]);
    }

    setActiveSubTab('SPECS');
    requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
    });
  };

  const handleApplyRecommendation = () => {
    if (!isNaturalLashComplete || !recommendation) {
      triggerMandatoryLashCheckGuard();
      return;
    }
    setHasCheckedNaturalLash(true);
    setShowMandatoryLashCheckAlert(false);
    setSelectedStyle(recommendation.recommendedDesign);
    setSelectedCurl(recommendation.recommendedCurl);
    setSelectedThickness(recommendation.recommendedThickness);

    const maxSafe = recommendation.maxSafeMm;
    const safeSizes = [maxSafe - 2, maxSafe - 1, maxSafe].filter((s) => s >= 7 && s <= 15);
    setSelectedLengths(safeSizes.length > 0 ? safeSizes : [maxSafe]);
    setActiveSubTab('SPECS');
    requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
    });
  };

  const [isEyeCompareOpen, setIsEyeCompareOpen] = useState<boolean>(false);
  const [zoomEyeShapeId, setZoomEyeShapeId] = useState<string>(selectedEyeShape || NATURAL_EYE_SHAPES[0].id);
  const [activeInfoModal, setActiveInfoModal] = useState<ConsultationInfoModalPayload | null>(null);

  return {
    isNewClient,
    naturalLengthRange,
    setNaturalLengthRange,
    naturalThicknessRange,
    setNaturalThicknessRange,
    naturalCountRange,
    setNaturalCountRange,
    selectedEyeShape,
    setSelectedEyeShape,
    selectedLashHealth,
    setSelectedLashHealth,
    selectedLashTrail,
    setSelectedLashTrail,
    selectedMedicalProblem,
    setSelectedMedicalProblem,
    missingNaturalLashFields,
    completedNaturalLashCount,
    isNaturalLashComplete,
    hasCheckedNaturalLash,
    showMandatoryLashCheckAlert,
    mustCompleteNaturalLashBeforeProceeding,
    naturalLengthLabel,
    naturalThicknessLabel,
    naturalCountLabel,
    naturalLength,
    naturalThickness,
    naturalCount,
    naturalDensity,
    naturalLengthSpec,
    naturalThicknessSpec,
    recommendation,
    lengthWarning,
    thicknessWarning,
    notes,
    setNotes,
    activeSubTab,
    setActiveSubTab,
    scrollContainerRef,
    confirmLashCheckBtnRef,
    lengthInputRef,
    thicknessInputRef,
    countInputRef,
    directionFirstBtnRef,
    eyeShapeFirstBtnRef,
    lashHealthFirstBtnRef,
    medicalProblemFirstBtnRef,
    triggerMandatoryLashCheckGuard,
    handleConfirmNaturalLashOnly,
    handleApplyRecommendation,
    isEyeCompareOpen,
    setIsEyeCompareOpen,
    zoomEyeShapeId,
    setZoomEyeShapeId,
    activeInfoModal,
    setActiveInfoModal,
  };
}
