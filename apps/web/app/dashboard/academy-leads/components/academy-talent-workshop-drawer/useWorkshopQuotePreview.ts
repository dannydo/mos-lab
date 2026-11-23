'use client';

import React from 'react';
import type { AcademyTalentAssessmentQuote } from '@mos-lab/shared';
import { toAcademyTalentWorkshopPricing, toAcademyTalentWorkshopResult } from '../academy-talent-workshop.adapter';
import type { AcademyTalentDraft, AcademyTalentLead } from '../academy-talent-workshop.types';
import { normalizeDraft } from './workshop-drawer-utils';

export interface UseWorkshopQuotePreviewOptions {
  open: boolean;
  lead: AcademyTalentLead | null;
  onPreviewQuote?: (draft: AcademyTalentDraft) => Promise<AcademyTalentAssessmentQuote>;
  isIssued: boolean;
  draft: AcademyTalentDraft;
}

export function useWorkshopQuotePreview({
  open,
  lead,
  onPreviewQuote,
  isIssued,
  draft,
}: UseWorkshopQuotePreviewOptions) {
  const [previewQuote, setPreviewQuote] = React.useState<AcademyTalentAssessmentQuote | null>(null);
  const [quoteDirty, setQuoteDirty] = React.useState(false);
  const [previewError, setPreviewError] = React.useState(false);
  const previewRequestRef = React.useRef(0);

  const shouldPreviewQuote = Boolean(open && lead && onPreviewQuote && quoteDirty && !isIssued);
  // Only the dummy challenge and course choices can change a monetary quote.
  // Eye/hand observations remain part of the saved assessment, but must not
  // flicker the ladder or trigger a pricing request while an assessor rates
  // the learner's baseline ability.
  const quotePreviewFingerprint = [
    draft.strands5Min,
    draft.errors.skin,
    draft.errors.root,
    draft.errors.stickies,
    draft.errors.direction,
    draft.selectedCourseIds.join(','),
    draft.selectedSampleCourseIds.join(','),
    draft.selectedKitCourseIds.join(','),
    Object.entries(draft.selectedInstructorIdsByCourse)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([courseId, instructorId]) => `${courseId}:${instructorId}`)
      .join(','),
    draft.paymentMode,
    draft.depositVnd ?? '',
  ].join('|');

  const quotePreviewDraft = React.useMemo(
    () => normalizeDraft(draft),
    // The fingerprint intentionally omits eyeScore, handScore and note.
    [quotePreviewFingerprint]
  );

  React.useEffect(() => {
    const requestId = ++previewRequestRef.current;
    if (!shouldPreviewQuote || !onPreviewQuote) {
      setPreviewQuote(null);
      setPreviewError(false);
      return;
    }

    let retryTimer: number | null = null;
    const requestQuote = (attempt: number) => {
      void onPreviewQuote(quotePreviewDraft)
        .then((quote) => {
          if (previewRequestRef.current !== requestId) return;
          setPreviewQuote(quote);
          setPreviewError(false);
        })
        .catch(() => {
          if (previewRequestRef.current !== requestId) return;
          // A slider interaction can coincide with a short API reload or a
          // network hiccup. Retry once before showing zero-value placeholders;
          // the result itself still comes exclusively from Fastify.
          if (attempt === 0) {
            retryTimer = window.setTimeout(() => requestQuote(1), 320);
            return;
          }
          setPreviewQuote(null);
          setPreviewError(true);
        });
    };
    const timer = window.setTimeout(() => {
      requestQuote(0);
    }, 160);

    return () => {
      window.clearTimeout(timer);
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  }, [onPreviewQuote, quotePreviewDraft, shouldPreviewQuote]);

  const previewResult = React.useMemo(
    () =>
      previewQuote
        ? toAcademyTalentWorkshopResult(previewQuote, { eyeScore: draft.eyeScore, handScore: draft.handScore })
        : null,
    [draft.eyeScore, draft.handScore, previewQuote]
  );

  const previewPricing = React.useMemo(
    () => (previewQuote ? toAcademyTalentWorkshopPricing(previewQuote) : null),
    [previewQuote]
  );

  const resetQuoteState = React.useCallback((dirty: boolean) => {
    setPreviewQuote(null);
    setQuoteDirty(dirty);
    setPreviewError(false);
  }, []);

  const isPreviewPending = shouldPreviewQuote && !previewQuote && !previewError;

  return {
    previewQuote,
    setPreviewQuote,
    quoteDirty,
    setQuoteDirty,
    previewError,
    setPreviewError,
    shouldPreviewQuote,
    isPreviewPending,
    previewResult,
    previewPricing,
    resetQuoteState,
  };
}
