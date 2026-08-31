export type RequestDraftView = 'bug' | 'feature';

export interface RequestDraft {
  description: string;
  files: File[];
  processingImages: boolean;
}

export type RequestDrafts = Record<RequestDraftView, RequestDraft>;

export function emptyRequestDraft(): RequestDraft {
  return { description: '', files: [], processingImages: false };
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
