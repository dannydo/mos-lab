import { createHash } from 'node:crypto';
import type { InboxReleaseManifest, InboxImplementationTestResult } from '@mos-lab/shared';

export function releaseDigest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function makeReleaseManifest(
  input: Omit<InboxReleaseManifest, 'version' | 'digest'>
): InboxReleaseManifest | null {
  if (!/^[a-f0-9]{40}$/.test(input.baseCommit) || !/^[a-f0-9]{64}$/.test(input.patchHash)) return null;
  const content = { version: 1 as const, ...input };
  return { ...content, digest: releaseDigest(content) };
}

export function parseReleaseEvidence(value: string | null): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function readReleaseManifest(value: string | null): InboxReleaseManifest | null {
  const raw = parseReleaseEvidence(value).releaseManifest as InboxReleaseManifest | undefined;
  if (!raw || raw.version !== 1 || !Array.isArray(raw.changedFiles) || !Array.isArray(raw.tests)) return null;
  const { digest, ...content } = raw;
  return typeof digest === 'string' && releaseDigest(content) === digest ? raw : null;
}

export function matchesReleaseManifest(
  manifest: InboxReleaseManifest,
  job: {
    id: string;
    reportId: number;
    sourceVersion: string;
    planVersion: string;
    changedFilesJson: string | null;
  },
  tests: InboxImplementationTestResult[]
): boolean {
  return (
    manifest.jobId === job.id &&
    manifest.reportId === job.reportId &&
    manifest.sourceVersion === job.sourceVersion &&
    manifest.planVersion === job.planVersion &&
    JSON.stringify(manifest.changedFiles) === job.changedFilesJson &&
    releaseDigest(manifest.tests) === releaseDigest(tests)
  );
}
