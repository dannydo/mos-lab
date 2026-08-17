import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient as CrmPrismaClient } from '../generated/crm-client/index.js';
import {
  getSocialPostContentType,
  parseSocialPostSheetDateTime,
  PostHubService,
} from '../modules/post-hub/post-hub.service.js';
import type {
  ImportSocialPostApproval,
  ImportSocialPostRow,
  ImportSocialPostsDto,
  SocialPostContentType,
  SocialPostReviewStatus,
} from '@mos-lab/shared';

dotenv.config();

const GOOGLE_SHEET_ID = '1sEp8FwAE6haY2q35-snCFb50EwAMRyAMIR-27AMkEUY';
const REVIEW_MARKS = new Set<ImportSocialPostApproval['reviewMark']>(['✅', '🔁', '❌']);
const SENTINEL_VALUES = new Set(['false', 'null', 'n/a', '-', '—']);
const MYSQL_TEXT_MAX_BYTES = 65_535;
const EXPECTED_CONTENT_TYPE_COUNTS: Record<SocialPostContentType, number> = {
  VIDEO: 25,
  RECRUITMENT_POST: 696,
};

type SnapshotValue = Record<string, unknown>;
type PostHubSheetSnapshot = {
  sourceSpreadsheetId: string;
  rows: SnapshotValue[];
  approvals: SnapshotValue[];
};

type ImportArgs = {
  inputPath: string;
  expectedSha256: string;
  apply: boolean;
  resume: boolean;
};

function usage(): never {
  throw new Error(
    'Usage: pnpm post-hub:import-history -- --input /secure/path/post-hub-sheet.json --expected-sha256 <sha256> [--apply] [--resume]'
  );
}

function readOption(args: string[], name: string): string | undefined {
  const equalsPrefix = `${name}=`;
  const equals = args.find((arg) => arg.startsWith(equalsPrefix));
  if (equals) return equals.slice(equalsPrefix.length);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function parseArgs(args: string[]): ImportArgs {
  const inputPath = readOption(args, '--input');
  const expectedSha256 = readOption(args, '--expected-sha256')?.toLowerCase();
  if (!inputPath || !expectedSha256 || !/^[a-f0-9]{64}$/.test(expectedSha256)) usage();
  return {
    inputPath: resolve(inputPath),
    expectedSha256,
    apply: args.includes('--apply'),
    resume: args.includes('--resume'),
  };
}

function requireRecord(value: unknown, label: string): SnapshotValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as SnapshotValue;
}

function assertMaximumLength(value: string, label: string, maximum: number, byteLength = false) {
  const length = byteLength ? Buffer.byteLength(value, 'utf8') : value.length;
  if (length > maximum) throw new Error(`${label} exceeds the maximum length of ${maximum}.`);
}

function requireString(value: unknown, label: string, maximum?: number): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  const normalized = value.trim();
  if (maximum) assertMaximumLength(normalized, label, maximum);
  return normalized;
}

function requireStringAllowEmpty(value: unknown, label: string, maximum: number): string {
  if (typeof value !== 'string') throw new Error(`${label} must be a string.`);
  const normalized = value.trim();
  assertMaximumLength(normalized, label, maximum, maximum === MYSQL_TEXT_MAX_BYTES);
  return normalized;
}

function requirePositiveInteger(value: unknown, label: string): number {
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) throw new Error(`${label} must be a positive integer.`);
  return numberValue;
}

/** Sheets use FALSE / blank placeholders for optional reviewer cells. */
function optionalSheetString(value: unknown, label: string, maximum = MYSQL_TEXT_MAX_BYTES): string | null {
  if (value === null || value === undefined || value === false) return null;
  if (typeof value !== 'string') throw new Error(`${label} must be a string, false, null, or blank.`);
  const normalized = value.trim();
  if (!normalized || SENTINEL_VALUES.has(normalized.toLowerCase())) return null;
  assertMaximumLength(normalized, label, maximum, maximum === MYSQL_TEXT_MAX_BYTES);
  return normalized;
}

function parseSnapshot(contents: Buffer): ImportSocialPostsDto {
  let raw: unknown;
  try {
    raw = JSON.parse(contents.toString('utf8'));
  } catch {
    throw new Error('Snapshot must be valid UTF-8 JSON.');
  }

  const snapshot = requireRecord(raw, 'Snapshot') as unknown as PostHubSheetSnapshot;
  if (snapshot.sourceSpreadsheetId !== GOOGLE_SHEET_ID) {
    throw new Error(`Snapshot sourceSpreadsheetId must be ${GOOGLE_SHEET_ID}.`);
  }
  if (!Array.isArray(snapshot.rows) || !Array.isArray(snapshot.approvals)) {
    throw new Error('Snapshot rows and approvals must be arrays.');
  }

  const rowIds = new Set<number>();
  const rows: ImportSocialPostRow[] = snapshot.rows.map((value, index) => {
    const row = requireRecord(value, `rows[${index}]`);
    const sourceRecordId = requirePositiveInteger(row.sourceRecordId, `rows[${index}].sourceRecordId`);
    if (rowIds.has(sourceRecordId)) throw new Error(`Snapshot has duplicate DATA ID ${sourceRecordId}.`);
    rowIds.add(sourceRecordId);
    return {
      sourceRecordId,
      sourceAuthorName: requireString(row.sourceAuthorName, `rows[${index}].sourceAuthorName`, 100),
      postedAt: requireString(row.postedAt, `rows[${index}].postedAt`, 30),
      channel: requireString(row.channel, `rows[${index}].channel`, 150),
      sourceUrl: requireStringAllowEmpty(row.sourceUrl, `rows[${index}].sourceUrl`, MYSQL_TEXT_MAX_BYTES),
    };
  });
  for (const row of rows) {
    parseSocialPostSheetDateTime(row.postedAt, `postedAt for source record ${row.sourceRecordId}`);
  }

  const authorsBySourceId = new Map(rows.map((row) => [row.sourceRecordId, row.sourceAuthorName]));
  const approvalIds = new Set<number>();
  const approvals: ImportSocialPostApproval[] = snapshot.approvals.map((value, index) => {
    const approval = requireRecord(value, `approvals[${index}]`);
    const sourceRecordId = requirePositiveInteger(approval.sourceRecordId, `approvals[${index}].sourceRecordId`);
    if (!authorsBySourceId.has(sourceRecordId)) {
      throw new Error(`APPROVE ID ${sourceRecordId} has no backlink to 1.DATA.`);
    }
    if (approvalIds.has(sourceRecordId)) throw new Error(`Snapshot has duplicate APPROVE ID ${sourceRecordId}.`);
    approvalIds.add(sourceRecordId);
    const reviewMark = requireString(
      approval.reviewMark,
      `approvals[${index}].reviewMark`,
      8
    ) as ImportSocialPostApproval['reviewMark'];
    if (!REVIEW_MARKS.has(reviewMark))
      throw new Error(`APPROVE ID ${sourceRecordId} has unsupported review mark ${reviewMark}.`);
    const reviewedAt = optionalSheetString(approval.reviewedAt, `approvals[${index}].reviewedAt`, 30);
    if (reviewedAt) parseSocialPostSheetDateTime(reviewedAt, `reviewedAt for source record ${sourceRecordId}`);
    return {
      sourceRecordId,
      sourceAuthorName: authorsBySourceId.get(sourceRecordId)!,
      reviewMark,
      reviewerComment: optionalSheetString(approval.reviewerComment, `approvals[${index}].reviewerComment`),
      reviewedAt,
      sourceReviewerName: optionalSheetString(
        approval.sourceReviewerName,
        `approvals[${index}].sourceReviewerName`,
        100
      ),
    };
  });

  if (rows.length !== 721 || approvals.length !== 362) {
    throw new Error(
      `Unexpected Sheet snapshot size: DATA=${rows.length}, APPROVE=${approvals.length}; expected DATA=721 and APPROVE=362.`
    );
  }
  if (rowIds.size !== 721 || [...rowIds].some((sourceRecordId) => sourceRecordId < 1 || sourceRecordId > 721)) {
    throw new Error('1.DATA must contain the continuous source IDs 1–721.');
  }
  return { sourceSpreadsheetId: snapshot.sourceSpreadsheetId, rows, approvals };
}

function expectedStatusCounts(dto: ImportSocialPostsDto): Record<SocialPostReviewStatus, number> {
  const statusByMark: Record<ImportSocialPostApproval['reviewMark'], SocialPostReviewStatus> = {
    '✅': 'APPROVED',
    '🔁': 'NEEDS_REVIEW',
    '❌': 'REJECTED',
  };
  const counts: Record<SocialPostReviewStatus, number> = {
    PENDING: dto.rows.length,
    APPROVED: 0,
    NEEDS_REVIEW: 0,
    REJECTED: 0,
  };
  for (const approval of dto.approvals) {
    counts.PENDING -= 1;
    counts[statusByMark[approval.reviewMark]] += 1;
  }
  return counts;
}

function reviewStatusFromMark(reviewMark: ImportSocialPostApproval['reviewMark']): SocialPostReviewStatus {
  if (reviewMark === '✅') return 'APPROVED';
  if (reviewMark === '🔁') return 'NEEDS_REVIEW';
  return 'REJECTED';
}

type CanonicalHistoryRecord = {
  sourceRecordId: number;
  sourceAuthorName: string;
  contentType: SocialPostContentType;
  channel: string;
  sourceUrl: string;
  postedAt: string;
  reviewStatus: SocialPostReviewStatus;
  reviewerComment: string | null;
  reviewedAt: string | null;
  sourceReviewerName: string | null;
};

function expectedHistoryRecords(dto: ImportSocialPostsDto): CanonicalHistoryRecord[] {
  const approvals = new Map(dto.approvals.map((approval) => [approval.sourceRecordId, approval]));
  return [...dto.rows]
    .sort((left, right) => left.sourceRecordId - right.sourceRecordId)
    .map((row) => {
      const approval = approvals.get(row.sourceRecordId);
      return {
        sourceRecordId: row.sourceRecordId,
        sourceAuthorName: row.sourceAuthorName,
        contentType: getSocialPostContentType(row.channel),
        channel: row.channel,
        sourceUrl: row.sourceUrl,
        postedAt: parseSocialPostSheetDateTime(
          row.postedAt,
          `postedAt for source record ${row.sourceRecordId}`
        ).toISOString(),
        reviewStatus: approval ? reviewStatusFromMark(approval.reviewMark) : 'PENDING',
        reviewerComment: approval?.reviewerComment || null,
        reviewedAt: approval?.reviewedAt
          ? parseSocialPostSheetDateTime(
              approval.reviewedAt,
              `reviewedAt for source record ${row.sourceRecordId}`
            ).toISOString()
          : null,
        sourceReviewerName: approval?.sourceReviewerName || null,
      };
    });
}

function historyDigest(records: CanonicalHistoryRecord[]): string {
  return createHash('sha256').update(JSON.stringify(records)).digest('hex');
}

async function verifyStoredHistory(prisma: CrmPrismaClient, dto: ImportSocialPostsDto) {
  const stored = await prisma.crmSocialPostSubmission.findMany({
    where: { sourceSpreadsheetId: dto.sourceSpreadsheetId },
    select: {
      sourceRecordId: true,
      sourceAuthorName: true,
      contentType: true,
      channel: true,
      sourceUrl: true,
      postedAt: true,
      reviewStatus: true,
      reviewerComment: true,
      reviewedAt: true,
      sourceReviewerName: true,
    },
    orderBy: { sourceRecordId: 'asc' },
  });
  const expected = expectedStatusCounts(dto);
  const expectedRecords = expectedHistoryRecords(dto);
  const expectedContentTypeCounts = expectedRecords.reduce<Record<string, number>>((counts, record) => {
    counts[record.contentType] = (counts[record.contentType] || 0) + 1;
    return counts;
  }, {});
  const statusCounts: Record<string, number> = {};
  const contentTypeCounts: Record<string, number> = {};
  for (const row of stored) {
    statusCounts[row.reviewStatus] = (statusCounts[row.reviewStatus] || 0) + 1;
    contentTypeCounts[row.contentType] = (contentTypeCounts[row.contentType] || 0) + 1;
  }
  const sourceIds = stored.map((row) => row.sourceRecordId);
  const hasContinuousIds = sourceIds.length === 721 && sourceIds.every((id, index) => id === index + 1);
  const storedRecords: CanonicalHistoryRecord[] = stored.map((row) => {
    if (row.sourceRecordId === null) throw new Error('Stored Sheet history contains a record without sourceRecordId.');
    return {
      sourceRecordId: row.sourceRecordId,
      sourceAuthorName: row.sourceAuthorName,
      contentType: row.contentType as SocialPostContentType,
      channel: row.channel,
      sourceUrl: row.sourceUrl,
      postedAt: row.postedAt.toISOString(),
      reviewStatus: row.reviewStatus as SocialPostReviewStatus,
      reviewerComment: row.reviewerComment || null,
      reviewedAt: row.reviewedAt?.toISOString() || null,
      sourceReviewerName: row.sourceReviewerName || null,
    };
  });
  const expectedDigest = historyDigest(expectedRecords);
  const storedDigest = historyDigest(storedRecords);
  if (
    !hasContinuousIds ||
    statusCounts.APPROVED !== expected.APPROVED ||
    statusCounts.NEEDS_REVIEW !== expected.NEEDS_REVIEW ||
    statusCounts.REJECTED !== expected.REJECTED ||
    statusCounts.PENDING !== expected.PENDING ||
    contentTypeCounts.VIDEO !== expectedContentTypeCounts.VIDEO ||
    contentTypeCounts.RECRUITMENT_POST !== expectedContentTypeCounts.RECRUITMENT_POST ||
    expectedContentTypeCounts.VIDEO !== EXPECTED_CONTENT_TYPE_COUNTS.VIDEO ||
    expectedContentTypeCounts.RECRUITMENT_POST !== EXPECTED_CONTENT_TYPE_COUNTS.RECRUITMENT_POST ||
    storedDigest !== expectedDigest
  ) {
    throw new Error(
      `Stored history verification failed: ${JSON.stringify({ rows: stored.length, statusCounts, expected, contentTypeCounts, expectedContentTypeCounts, hasContinuousIds, expectedDigest, storedDigest })}`
    );
  }
  return {
    rows: stored.length,
    statusCounts,
    contentTypeCounts,
    continuousSourceIds: hasContinuousIds,
    verificationDigest: storedDigest,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const contents = await readFile(args.inputPath);
  const actualSha256 = createHash('sha256').update(contents).digest('hex');
  if (actualSha256 !== args.expectedSha256) {
    throw new Error(`Snapshot SHA-256 mismatch: expected ${args.expectedSha256}, got ${actualSha256}.`);
  }

  const dto = parseSnapshot(contents);
  const prisma = new CrmPrismaClient({ datasources: { db: { url: process.env.CRM_DATABASE_URL } } });
  try {
    await prisma.$connect();
    const preview = await PostHubService.previewGoogleSheetImport(prisma, dto);
    const expected = expectedStatusCounts(dto);
    const existingHistoryRows = await prisma.crmSocialPostSubmission.count({
      where: { sourceSpreadsheetId: dto.sourceSpreadsheetId },
    });
    const preflight = {
      sourceSpreadsheetId: dto.sourceSpreadsheetId,
      snapshotSha256: actualSha256,
      dataRows: dto.rows.length,
      approvalRows: dto.approvals.length,
      expectedStatusCounts: expected,
      expectedHistoryDigest: historyDigest(expectedHistoryRecords(dto)),
      existingHistoryRows,
      preview,
    };
    console.log(JSON.stringify({ mode: args.apply ? 'apply' : 'dry-run', preflight }, null, 2));

    if (preview.unmappedAuthors.length > 0 || preview.unmatchedApprovalSourceIds.length > 0) {
      throw new Error('Preflight failed: source authors or APPROVE backlinks are not fully mapped.');
    }
    if (!args.apply) return;
    if (existingHistoryRows > 0 && !args.resume) {
      throw new Error(
        `Refusing to overwrite ${existingHistoryRows} existing history row(s). Review them, create a backup, then rerun explicitly with --resume.`
      );
    }
    if (existingHistoryRows !== preview.updated) {
      throw new Error(
        `Existing Sheet history contains source IDs outside this snapshot (${existingHistoryRows} stored, ${preview.updated} matching).`
      );
    }

    const result = await PostHubService.importFromGoogleSheet(prisma, dto);
    if (result.unmappedAuthors.length > 0 || result.unmatchedApprovalSourceIds.length > 0) {
      throw new Error('Import stopped before completion because the source mapping changed after preflight.');
    }
    const verification = await verifyStoredHistory(prisma, dto);
    console.log(JSON.stringify({ mode: 'apply', result, verification }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
