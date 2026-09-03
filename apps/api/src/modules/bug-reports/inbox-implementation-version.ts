import { createHash } from 'node:crypto';

type ImplementationSource = {
  requestType: string;
  title: string;
  description: string;
  priority: string | null;
  clarificationStatus: string;
  clarificationSummary: string | null;
  businessContext: string | null;
  triageNote: string | null;
  sourcePath: string;
  comments: Array<{ id: number; body: string }>;
};

const clean = (value: unknown, limit: number) =>
  Array.from(String(value ?? ''))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return !(code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31));
    })
    .join('')
    .trim()
    .slice(0, limit);

function digest(value: unknown): string {
  return `v1:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

/**
 * Material ticket source only. Approval timestamps, status transitions, job
 * leases and agent audit records deliberately do not affect implementation
 * authority; reporter-authored material changes do.
 */
export function inboxImplementationSourceVersion(source: ImplementationSource): string {
  return digest({
    requestType: source.requestType,
    title: clean(source.title, 180),
    description: clean(source.description, 2_000),
    priority: source.priority,
    clarificationStatus: source.clarificationStatus,
    clarificationSummary: source.clarificationSummary ? clean(source.clarificationSummary, 1_200) : null,
    businessContext: source.businessContext ? clean(source.businessContext, 4_000) : null,
    // A reporter reopen is durable, material evidence held in triageNote. Include
    // it so an old plan/approval can never regain authority after re-analysis.
    triageNote: source.triageNote ? clean(source.triageNote, 2_000) : null,
    sourcePath: clean(source.sourcePath, 500),
    reporterMessages: source.comments.map((comment) => ({ id: comment.id, body: clean(comment.body, 1_200) })),
  });
}

export function inboxImplementationPlanVersion(sourceVersion: string, plan: unknown): string {
  return digest({ sourceVersion, plan });
}
