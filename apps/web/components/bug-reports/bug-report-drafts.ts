import type { BugReportExpertDetails } from '@mos-lab/shared';

export type RequestDraftView = 'bug' | 'feature';

export interface RequestDraft {
  description: string;
  files: File[];
  processingImages: boolean;
  expertDetails: BugReportExpertDetails;
}

export type RequestDrafts = Record<RequestDraftView, RequestDraft>;

export function emptyRequestDraft(): RequestDraft {
  return {
    description: '',
    files: [],
    processingImages: false,
    expertDetails: {
      reproductionSteps: null,
      expectedResult: null,
      actualResult: null,
      impact: null,
      environment: null,
      workaround: null,
      relatedTicket: null,
    },
  };
}

export function createRequestDrafts(): RequestDrafts {
  return {
    bug: emptyRequestDraft(),
    feature: emptyRequestDraft(),
  };
}

export function updateRequestDraft(
  drafts: RequestDrafts,
  view: RequestDraftView,
  update: Partial<RequestDraft> | ((current: RequestDraft) => Partial<RequestDraft>)
): RequestDrafts {
  const currentDraft = drafts[view];
  const patch = typeof update === 'function' ? update(currentDraft) : update;
  return {
    ...drafts,
    [view]: { ...currentDraft, ...patch },
  };
}

/** Carries a live intake to a manually corrected type without overwriting that type's saved draft. */
export function carryRequestDraft(drafts: RequestDrafts, from: RequestDraftView, to: RequestDraftView): RequestDrafts {
  if (from === to || drafts[to].description || drafts[to].files.length) return drafts;
  return updateRequestDraft(drafts, to, { description: drafts[from].description, files: drafts[from].files });
}
