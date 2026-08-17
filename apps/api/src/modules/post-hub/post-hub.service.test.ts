import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSocialPostDailyRewards,
  buildSocialPostLeaderboard,
  calculateSocialPostBananaPoints,
  DEFAULT_SOCIAL_POST_REWARD_CONFIG,
  getSocialPostSourceContext,
  normalizeNativeSourceUrl,
  parseSocialPostSheetDateTime,
  PostHubService,
  resolveSocialPostPeriodBounds,
} from './post-hub.service.js';

test('applies the Google Sheet point multipliers while the combined count is eligible', () => {
  assert.equal(calculateSocialPostBananaPoints(2, 10, DEFAULT_SOCIAL_POST_REWARD_CONFIG), 16);
  assert.equal(calculateSocialPostBananaPoints(1, 0, DEFAULT_SOCIAL_POST_REWARD_CONFIG), 3);
  assert.equal(calculateSocialPostBananaPoints(0, 20, DEFAULT_SOCIAL_POST_REWARD_CONFIG), 20);
});

test('applies the category caps before the standard multiplier', () => {
  assert.equal(calculateSocialPostBananaPoints(21, 0, DEFAULT_SOCIAL_POST_REWARD_CONFIG), 60);
  assert.equal(calculateSocialPostBananaPoints(0, 21, DEFAULT_SOCIAL_POST_REWARD_CONFIG), 20);
});

test('keeps the source Sheet mixed-overflow gap unresolved until a manager configures it', () => {
  assert.equal(calculateSocialPostBananaPoints(15, 6, DEFAULT_SOCIAL_POST_REWARD_CONFIG), null);
  assert.equal(
    calculateSocialPostBananaPoints(15, 6, { ...DEFAULT_SOCIAL_POST_REWARD_CONFIG, mixedOverflowPoints: 25 }),
    25
  );
});

test('sums Daily Bonus by source posting day instead of applying a cap across multiple days', () => {
  const rows = [
    ...Array.from({ length: 11 }, () => ({
      staffId: 23,
      postedAt: new Date('2026-08-10T17:00:00.000Z'), // 11/08/2026 ICT
      reviewStatus: 'APPROVED',
      contentType: 'VIDEO',
      staff: { displayName: 'Cẩm Tiên' },
    })),
    ...Array.from({ length: 11 }, () => ({
      staffId: 23,
      postedAt: new Date('2026-08-11T17:00:00.000Z'), // 12/08/2026 ICT
      reviewStatus: 'APPROVED',
      contentType: 'VIDEO',
      staff: { displayName: 'Cẩm Tiên' },
    })),
  ];

  const daily = buildSocialPostDailyRewards(rows, DEFAULT_SOCIAL_POST_REWARD_CONFIG);
  const leaderboard = buildSocialPostLeaderboard(daily);

  assert.deepEqual(
    daily.map((row) => row.bananaPoints),
    [33, 33]
  );
  assert.equal(leaderboard[0].bananaPoints, 66);
});

test('describes Facebook group posts without inventing a missing group name', () => {
  const sharedGroupPost = getSocialPostSourceContext(
    'Đăng trên hội nhóm',
    'https://www.facebook.com/share/p/1EzD3cEGQ5/?mibextid=wwXIfr'
  );
  assert.deepEqual(sharedGroupPost, {
    platform: 'FACEBOOK',
    platformLabel: 'Facebook',
    placement: 'GROUP',
    placementLabel: 'Nhóm',
    destinationLabel: 'Tên nhóm chưa có trong link nguồn',
    destinationId: null,
    destinationIdentified: false,
  });

  const directGroupComment = getSocialPostSourceContext(
    'Comment bài viết.',
    'https://www.facebook.com/groups/507743468613513/posts/123'
  );
  assert.equal(directGroupComment.destinationLabel, 'Bình luận trong Nhóm Facebook #507743468613513');
  assert.equal(directGroupComment.destinationIdentified, true);
});

test('normalizes mOS link fingerprints without changing the source URL retained for audit', () => {
  const plain = normalizeNativeSourceUrl('https://www.facebook.com/groups/507743468613513/posts/123');
  const tracked = normalizeNativeSourceUrl(
    'https://www.facebook.com/groups/507743468613513/posts/123?fbclid=tracking&mibextid=tracking'
  );

  assert.equal(plain.fingerprint, tracked.fingerprint);
  assert.equal(
    tracked.sourceUrl,
    'https://www.facebook.com/groups/507743468613513/posts/123?fbclid=tracking&mibextid=tracking'
  );
  assert.throws(() => normalizeNativeSourceUrl('https://example.com/post/1'), /Facebook hoặc TikTok/);
});

test('derives the actual platform from the source URL', () => {
  const source = getSocialPostSourceContext('Video 20s - 1 phút, tiktok, facebook', 'https://vt.tiktok.com/ZS4Tn1Ftu/');
  assert.equal(source.platformLabel, 'TikTok');
  assert.equal(source.placementLabel, 'Video');
  assert.equal(source.destinationLabel, 'Video TikTok');
});

test('resolves shared Post Hub reporting periods from the ICT anchor date with Monday-first weeks', () => {
  assert.deepEqual(resolveSocialPostPeriodBounds({ anchorDate: '2026-08-17', period: 'DAY' }), {
    dateFrom: '2026-08-17',
    dateTo: '2026-08-17',
  });
  assert.deepEqual(resolveSocialPostPeriodBounds({ anchorDate: '2026-08-17', period: 'WEEK' }), {
    dateFrom: '2026-08-17',
    dateTo: '2026-08-23',
  });
  assert.deepEqual(resolveSocialPostPeriodBounds({ anchorDate: '2026-08-17', period: 'MONTH' }), {
    dateFrom: '2026-08-01',
    dateTo: '2026-08-31',
  });
});

test('rejects invalid Sheet calendar dates instead of rolling them into a later month', () => {
  assert.throws(() => parseSocialPostSheetDateTime('31/02/2026 10:00:00', 'postedAt'), /is invalid/);
});

test('previews a Sheet import with canonical mOS author aliases without writing', async () => {
  const prisma = {
    crmStaff: {
      findMany: async () => [
        { id: 14, displayName: 'Bùi Sinh Nguyên' },
        { id: 23, displayName: 'Cẩm Tiên' },
      ],
    },
    crmSocialPostSubmission: {
      findMany: async () => [{ sourceRecordId: 1 }],
    },
  };
  const result = await PostHubService.previewGoogleSheetImport(prisma as never, {
    sourceSpreadsheetId: 'sheet-history',
    rows: [
      {
        sourceRecordId: 1,
        sourceAuthorName: 'Sinh Nguyên',
        postedAt: '14/08/2026 19:47:43',
        channel: 'Video 20s - 1 phút, tiktok, facebook',
        sourceUrl: '',
      },
      {
        sourceRecordId: 2,
        sourceAuthorName: 'Cẩm Tiên',
        postedAt: '14/08/2026 19:50:43',
        channel: 'Bình luận trong Nhóm Facebook #752262396593996',
        sourceUrl: 'https://www.facebook.com/groups/752262396593996/posts/1',
      },
    ],
    approvals: [
      {
        sourceRecordId: 1,
        sourceAuthorName: 'Sinh Nguyên',
        reviewMark: '✅',
        sourceReviewerName: 'Nguyen Bui',
      },
    ],
  });

  assert.deepEqual(result, {
    imported: 1,
    updated: 1,
    approved: 1,
    needsReview: 0,
    rejected: 0,
    pending: 1,
    unmappedAuthors: [],
    unmatchedApprovalSourceIds: [],
  });
});

test('blocks every Sheet write in the preview when a source author cannot map to exactly one mOS account', async () => {
  const prisma = {
    crmStaff: {
      findMany: async () => [{ id: 23, displayName: 'Cẩm Tiên' }],
    },
    crmSocialPostSubmission: {
      findMany: async () => {
        throw new Error('Existing rows must not be queried after an unmapped author.');
      },
    },
  };
  const result = await PostHubService.previewGoogleSheetImport(prisma as never, {
    sourceSpreadsheetId: 'sheet-history',
    rows: [
      {
        sourceRecordId: 1,
        sourceAuthorName: 'Không có tài khoản mOS',
        postedAt: '14/08/2026 19:47:43',
        channel: 'Đăng trên hội nhóm',
        sourceUrl: 'https://www.facebook.com/share/p/1',
      },
    ],
    approvals: [],
  });

  assert.deepEqual(result, {
    imported: 0,
    updated: 0,
    approved: 0,
    needsReview: 0,
    rejected: 0,
    pending: 0,
    unmappedAuthors: [{ sourceAuthorName: 'Không có tài khoản mOS', count: 1 }],
    unmatchedApprovalSourceIds: [],
  });
});

test('rejects unmatched APPROVE backlinks before attempting a Sheet import write', async () => {
  let transactionCalled = false;
  const prisma = {
    crmStaff: {
      findMany: async () => [{ id: 23, displayName: 'Cẩm Tiên' }],
    },
    crmSocialPostSubmission: {
      findMany: async () => {
        throw new Error('Existing Sheet rows must not be queried for an invalid backlink.');
      },
      upsert: () => {
        throw new Error('An invalid backlink must not prepare a write.');
      },
    },
    $transaction: async () => {
      transactionCalled = true;
    },
  };

  const result = await PostHubService.importFromGoogleSheet(prisma as never, {
    sourceSpreadsheetId: 'sheet-history',
    rows: [
      {
        sourceRecordId: 1,
        sourceAuthorName: 'Cẩm Tiên',
        postedAt: '14/08/2026 19:47:43',
        channel: 'Đăng trên hội nhóm',
        sourceUrl: 'https://www.facebook.com/share/p/1',
      },
    ],
    approvals: [
      {
        sourceRecordId: 2,
        sourceAuthorName: 'Cẩm Tiên',
        reviewMark: '✅',
      },
    ],
  });

  assert.equal(transactionCalled, false);
  assert.deepEqual(result, {
    imported: 0,
    updated: 0,
    approved: 0,
    needsReview: 0,
    rejected: 0,
    pending: 0,
    unmappedAuthors: [],
    unmatchedApprovalSourceIds: [2],
  });
});

test('imports the signed history as one atomic transaction', async () => {
  let transactionOperations = 0;
  let transactionOptions: { maxWait?: number; timeout?: number } | undefined;
  const prisma = {
    crmStaff: {
      findMany: async () => [{ id: 23, displayName: 'Cẩm Tiên' }],
    },
    crmSocialPostSubmission: {
      findMany: async () => [],
    },
    $transaction: async (
      operation: (client: { crmSocialPostSubmission: { upsert: () => Promise<void> } }) => Promise<void>,
      options: { maxWait?: number; timeout?: number }
    ) => {
      transactionOptions = options;
      await operation({
        crmSocialPostSubmission: {
          upsert: async () => {
            transactionOperations += 1;
          },
        },
      });
    },
  };

  const result = await PostHubService.importFromGoogleSheet(prisma as never, {
    sourceSpreadsheetId: 'sheet-history',
    rows: [
      {
        sourceRecordId: 1,
        sourceAuthorName: 'Cẩm Tiên',
        postedAt: '14/08/2026 19:47:43',
        channel: 'Đăng trên hội nhóm',
        sourceUrl: 'https://www.facebook.com/share/p/1',
      },
      {
        sourceRecordId: 2,
        sourceAuthorName: 'Cẩm Tiên',
        postedAt: '14/08/2026 19:48:43',
        channel: 'Video TikTok',
        sourceUrl: 'https://www.tiktok.com/@mos/video/2',
      },
    ],
    approvals: [],
  });

  assert.equal(transactionOperations, 2);
  assert.deepEqual(transactionOptions, { maxWait: 5_000, timeout: 60_000 });
  assert.equal(result.imported, 2);
  assert.equal(result.pending, 2);
});

test('keeps a poster Daily drawer on the same Monday-first period as its leaderboard', async () => {
  let capturedWhere: Record<string, unknown> | undefined;
  const prisma = {
    crmSocialPostSubmission: {
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        capturedWhere = where;
        return [
          {
            staffId: 23,
            postedAt: new Date('2026-08-16T17:00:00.000Z'),
            reviewStatus: 'APPROVED',
            contentType: 'VIDEO',
            sourceRecordId: 1,
            staff: { displayName: 'Cẩm Tiên' },
          },
        ];
      },
    },
    crmConfig: { findUnique: async () => null },
  };

  const result = await PostHubService.getPosterDailyRewards(prisma as never, 23, {
    anchorDate: '2026-08-17',
    period: 'WEEK',
  });

  assert.deepEqual(capturedWhere, {
    staffId: 23,
    postedAt: {
      gte: new Date('2026-08-16T17:00:00.000Z'),
      lte: new Date('2026-08-23T16:59:59.000Z'),
    },
  });
  assert.equal(result.dateFrom, '2026-08-17');
  assert.equal(result.dateTo, '2026-08-23');
  assert.equal(result.daily.length, 1);
});
