import {
  type ImportSocialPostsDto,
  type ImportSocialPostsResult,
  removeVietnameseTones,
  type SocialPostReviewStatus,
} from '@mos-lab/shared';
import { parseSocialPostSheetDateTime } from './date-period.js';
import { getSocialPostContentType } from './source-url.js';
import {
  type CrmClient,
  type PreparedSocialPostImport,
  type PreparedSocialPostImportRow,
  REVIEW_MARK_TO_STATUS,
  SOURCE_ACCOUNT_ALIASES,
} from './types.js';

function canonicalSourceName(value: string): string {
  const normalized = removeVietnameseTones(value);
  return SOURCE_ACCOUNT_ALIASES[normalized] || normalized;
}

/**
 * Normalizes a source snapshot once for both dry-run and apply. Keeping this
 * preparation inside the service prevents the release importer from getting a
 * different account-mapping or approval-status interpretation than the API.
 */
async function prepareGoogleSheetImport(
  prisma: CrmClient,
  dto: ImportSocialPostsDto
): Promise<PreparedSocialPostImport> {
  const sourceSpreadsheetId = String(dto.sourceSpreadsheetId || '').trim();
  if (!sourceSpreadsheetId) throw new Error('sourceSpreadsheetId is required');

  const rowsBySourceId = new Map<number, (typeof dto.rows)[number]>();
  for (const row of dto.rows) {
    if (!Number.isInteger(row.sourceRecordId) || row.sourceRecordId <= 0) {
      throw new Error(`Invalid sourceRecordId "${row.sourceRecordId}"`);
    }
    if (rowsBySourceId.has(row.sourceRecordId)) {
      throw new Error(`Duplicate sourceRecordId "${row.sourceRecordId}"`);
    }
    if (
      typeof row.sourceAuthorName !== 'string' ||
      typeof row.postedAt !== 'string' ||
      typeof row.channel !== 'string' ||
      typeof row.sourceUrl !== 'string' ||
      !row.sourceAuthorName.trim() ||
      !row.postedAt.trim() ||
      !row.channel.trim()
    ) {
      throw new Error(`Source record ${row.sourceRecordId} is missing a valid author, postedAt, channel, or sourceUrl`);
    }
    if (
      row.sourceAuthorName.trim().length > 100 ||
      row.channel.trim().length > 150 ||
      Buffer.byteLength(row.sourceUrl.trim(), 'utf8') > 65_535
    ) {
      throw new Error(`Source record ${row.sourceRecordId} exceeds a stored field limit`);
    }
    rowsBySourceId.set(row.sourceRecordId, row);
  }

  const approvalsBySourceId = new Map<number, (typeof dto.approvals)[number]>();
  for (const approval of dto.approvals) {
    if (!rowsBySourceId.has(approval.sourceRecordId)) continue;
    if (approvalsBySourceId.has(approval.sourceRecordId)) {
      throw new Error(`Duplicate approval for sourceRecordId "${approval.sourceRecordId}"`);
    }
    if (!REVIEW_MARK_TO_STATUS[approval.reviewMark]) {
      throw new Error(`Unsupported review mark "${approval.reviewMark}" for sourceRecordId ${approval.sourceRecordId}`);
    }
    approvalsBySourceId.set(approval.sourceRecordId, approval);
  }

  const staff = await prisma.crmStaff.findMany({
    select: { id: true, displayName: true },
  });
  const staffByCanonicalName = new Map<string, Array<{ id: number; displayName: string }>>();
  for (const member of staff) {
    const key = removeVietnameseTones(member.displayName);
    const candidates = staffByCanonicalName.get(key) || [];
    candidates.push(member);
    staffByCanonicalName.set(key, candidates);
  }

  const unmappedAuthors = new Map<string, number>();
  const importRows: PreparedSocialPostImportRow[] = [...rowsBySourceId.values()]
    .sort((left, right) => left.sourceRecordId - right.sourceRecordId)
    .flatMap((row) => {
      const staffCandidates = staffByCanonicalName.get(canonicalSourceName(row.sourceAuthorName)) || [];
      if (staffCandidates.length !== 1) {
        unmappedAuthors.set(row.sourceAuthorName, (unmappedAuthors.get(row.sourceAuthorName) || 0) + 1);
        return [];
      }
      const staffMember = staffCandidates[0];
      const approval = approvalsBySourceId.get(row.sourceRecordId);
      const reviewerCandidates = approval?.sourceReviewerName
        ? staffByCanonicalName.get(canonicalSourceName(approval.sourceReviewerName)) || []
        : [];
      const reviewer = reviewerCandidates.length === 1 ? reviewerCandidates[0] : undefined;

      return [
        {
          sourceRecordId: row.sourceRecordId,
          staffId: staffMember.id,
          sourceAuthorName: row.sourceAuthorName.trim(),
          contentType: getSocialPostContentType(row.channel),
          channel: row.channel.trim(),
          sourceUrl: row.sourceUrl.trim(),
          postedAt: parseSocialPostSheetDateTime(row.postedAt, `postedAt for source record ${row.sourceRecordId}`),
          reviewStatus: approval ? REVIEW_MARK_TO_STATUS[approval.reviewMark] : 'PENDING',
          reviewerComment: approval?.reviewerComment?.trim() || null,
          reviewedAt: approval?.reviewedAt?.trim()
            ? parseSocialPostSheetDateTime(approval.reviewedAt, `reviewedAt for source record ${row.sourceRecordId}`)
            : null,
          reviewedByStaffId: reviewer?.id || null,
          sourceReviewerName: approval?.sourceReviewerName?.trim() || null,
        },
      ];
    });

  return {
    sourceSpreadsheetId,
    importRows,
    unmappedAuthors: [...unmappedAuthors.entries()].map(([sourceAuthorName, count]) => ({ sourceAuthorName, count })),
    unmatchedApprovalSourceIds: dto.approvals
      .map((approval) => approval.sourceRecordId)
      .filter((sourceRecordId) => !rowsBySourceId.has(sourceRecordId)),
  };
}

async function findExistingSheetSourceIds(prisma: CrmClient, prepared: PreparedSocialPostImport): Promise<Set<number>> {
  if (
    prepared.unmappedAuthors.length > 0 ||
    prepared.unmatchedApprovalSourceIds.length > 0 ||
    prepared.importRows.length === 0
  )
    return new Set();
  const existing = await prisma.crmSocialPostSubmission.findMany({
    where: {
      sourceSpreadsheetId: prepared.sourceSpreadsheetId,
      sourceRecordId: { in: prepared.importRows.map((row) => row.sourceRecordId) },
    },
    select: { sourceRecordId: true },
  });
  return new Set(
    existing
      .map((row) => row.sourceRecordId)
      .filter((sourceRecordId): sourceRecordId is number => sourceRecordId !== null)
  );
}

function toImportResult(prepared: PreparedSocialPostImport, existingSourceIds: Set<number>): ImportSocialPostsResult {
  if (prepared.unmappedAuthors.length > 0 || prepared.unmatchedApprovalSourceIds.length > 0) {
    return {
      imported: 0,
      updated: 0,
      approved: 0,
      needsReview: 0,
      rejected: 0,
      pending: 0,
      unmappedAuthors: prepared.unmappedAuthors,
      unmatchedApprovalSourceIds: prepared.unmatchedApprovalSourceIds,
    };
  }

  const countFor = (status: SocialPostReviewStatus) =>
    prepared.importRows.filter((row) => row.reviewStatus === status).length;
  return {
    imported: prepared.importRows.filter((row) => !existingSourceIds.has(row.sourceRecordId)).length,
    updated: prepared.importRows.filter((row) => existingSourceIds.has(row.sourceRecordId)).length,
    approved: countFor('APPROVED'),
    needsReview: countFor('NEEDS_REVIEW'),
    rejected: countFor('REJECTED'),
    pending: countFor('PENDING'),
    unmappedAuthors: prepared.unmappedAuthors,
    unmatchedApprovalSourceIds: prepared.unmatchedApprovalSourceIds,
  };
}

export async function previewGoogleSheetImport(
  prisma: CrmClient,
  dto: ImportSocialPostsDto
): Promise<ImportSocialPostsResult> {
  const prepared = await prepareGoogleSheetImport(prisma, dto);
  const existingSourceIds = await findExistingSheetSourceIds(prisma, prepared);
  return toImportResult(prepared, existingSourceIds);
}

export async function importFromGoogleSheet(
  prisma: CrmClient,
  dto: ImportSocialPostsDto
): Promise<ImportSocialPostsResult> {
  const prepared = await prepareGoogleSheetImport(prisma, dto);
  const existingSourceIds = await findExistingSheetSourceIds(prisma, prepared);
  const result = toImportResult(prepared, existingSourceIds);
  if (result.unmappedAuthors.length > 0 || result.unmatchedApprovalSourceIds.length > 0) return result;

  await prisma.$transaction(
    async (tx) => {
      for (const row of prepared.importRows) {
        await tx.crmSocialPostSubmission.upsert({
          where: {
            sourceSpreadsheetId_sourceRecordId: {
              sourceSpreadsheetId: prepared.sourceSpreadsheetId,
              sourceRecordId: row.sourceRecordId,
            },
          },
          create: {
            sourceSpreadsheetId: prepared.sourceSpreadsheetId,
            ...row,
          },
          update: {
            ...row,
            importedAt: new Date(),
          },
        });
      }
    },
    { maxWait: 5_000, timeout: 60_000 }
  );
  return result;
}
