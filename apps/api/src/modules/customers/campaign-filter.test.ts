import assert from 'node:assert/strict';
import test from 'node:test';

interface ResolveCampaignFilterOptions {
  campaignId?: number;
  campaignFilterMode?: 'ALL' | 'IN' | 'NOT_IN';
  existingAllowedUserIds: number[] | null;
  existingExcludedUserIds: number[];
  findCampaignMembers: (campaignId: number) => Promise<Array<{ legacyUserId: number }>>;
}

interface ResolveCampaignFilterResult {
  allowedUserIds: number[] | null;
  excludedUserIds: number[];
  isEarlyEmpty: boolean;
}

export async function resolveCampaignFilter({
  campaignId,
  campaignFilterMode,
  existingAllowedUserIds,
  existingExcludedUserIds,
  findCampaignMembers,
}: ResolveCampaignFilterOptions): Promise<ResolveCampaignFilterResult> {
  let allowedUserIds = existingAllowedUserIds;
  let excludedUserIds = [...existingExcludedUserIds];

  if (!campaignId || !campaignFilterMode || campaignFilterMode === 'ALL') {
    return { allowedUserIds, excludedUserIds, isEarlyEmpty: false };
  }

  const campaignMembers = await findCampaignMembers(campaignId);
  const campaignUserIds = Array.from(
    new Set(
      campaignMembers
        .map((m) => Number(m.legacyUserId))
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );

  if (campaignFilterMode === 'IN') {
    if (campaignUserIds.length === 0) {
      return { allowedUserIds: [], excludedUserIds, isEarlyEmpty: true };
    }
    if (allowedUserIds === null) {
      allowedUserIds = campaignUserIds;
    } else {
      const campaignSet = new Set(campaignUserIds);
      allowedUserIds = allowedUserIds.filter((id) => campaignSet.has(id));
      if (allowedUserIds.length === 0) {
        return { allowedUserIds: [], excludedUserIds, isEarlyEmpty: true };
      }
    }
  } else if (campaignFilterMode === 'NOT_IN') {
    if (campaignUserIds.length > 0) {
      excludedUserIds = Array.from(new Set([...excludedUserIds, ...campaignUserIds]));
      if (allowedUserIds !== null) {
        const campaignSet = new Set(campaignUserIds);
        allowedUserIds = allowedUserIds.filter((id) => !campaignSet.has(id));
        if (allowedUserIds.length === 0) {
          return { allowedUserIds: [], excludedUserIds, isEarlyEmpty: true };
        }
      }
    }
  }

  return { allowedUserIds, excludedUserIds, isEarlyEmpty: false };
}

test('resolveCampaignFilter does not modify user scopes when campaignFilterMode is ALL or undefined', async () => {
  const result = await resolveCampaignFilter({
    campaignId: 10,
    campaignFilterMode: 'ALL',
    existingAllowedUserIds: [1, 2, 3],
    existingExcludedUserIds: [9],
    findCampaignMembers: async () => [{ legacyUserId: 1 }],
  });

  assert.equal(result.isEarlyEmpty, false);
  assert.deepEqual(result.allowedUserIds, [1, 2, 3]);
  assert.deepEqual(result.excludedUserIds, [9]);
});

test('resolveCampaignFilter sets allowedUserIds to campaign members when mode is IN and no prior scope exists', async () => {
  const result = await resolveCampaignFilter({
    campaignId: 10,
    campaignFilterMode: 'IN',
    existingAllowedUserIds: null,
    existingExcludedUserIds: [],
    findCampaignMembers: async () => [{ legacyUserId: 101 }, { legacyUserId: 102 }],
  });

  assert.equal(result.isEarlyEmpty, false);
  assert.deepEqual(result.allowedUserIds, [101, 102]);
});

test('resolveCampaignFilter intersects allowedUserIds when mode is IN and prior scope exists', async () => {
  const result = await resolveCampaignFilter({
    campaignId: 10,
    campaignFilterMode: 'IN',
    existingAllowedUserIds: [101, 103, 105],
    existingExcludedUserIds: [],
    findCampaignMembers: async () => [{ legacyUserId: 101 }, { legacyUserId: 102 }],
  });

  assert.equal(result.isEarlyEmpty, false);
  assert.deepEqual(result.allowedUserIds, [101]);
});

test('resolveCampaignFilter returns isEarlyEmpty true when mode is IN and intersection is empty', async () => {
  const result = await resolveCampaignFilter({
    campaignId: 10,
    campaignFilterMode: 'IN',
    existingAllowedUserIds: [500],
    existingExcludedUserIds: [],
    findCampaignMembers: async () => [{ legacyUserId: 101 }, { legacyUserId: 102 }],
  });

  assert.equal(result.isEarlyEmpty, true);
  assert.deepEqual(result.allowedUserIds, []);
});

test('resolveCampaignFilter merges excludedUserIds when mode is NOT_IN', async () => {
  const result = await resolveCampaignFilter({
    campaignId: 10,
    campaignFilterMode: 'NOT_IN',
    existingAllowedUserIds: null,
    existingExcludedUserIds: [90],
    findCampaignMembers: async () => [{ legacyUserId: 101 }, { legacyUserId: 102 }],
  });

  assert.equal(result.isEarlyEmpty, false);
  assert.equal(result.allowedUserIds, null);
  assert.deepEqual(result.excludedUserIds, [90, 101, 102]);
});

test('resolveCampaignFilter prunes allowedUserIds when mode is NOT_IN and allowedUserIds exists', async () => {
  const result = await resolveCampaignFilter({
    campaignId: 10,
    campaignFilterMode: 'NOT_IN',
    existingAllowedUserIds: [100, 101, 102, 103],
    existingExcludedUserIds: [90],
    findCampaignMembers: async () => [{ legacyUserId: 101 }, { legacyUserId: 102 }],
  });

  assert.equal(result.isEarlyEmpty, false);
  assert.deepEqual(result.allowedUserIds, [100, 103]);
  assert.deepEqual(result.excludedUserIds, [90, 101, 102]);
});

test('resolveCampaignFilter sets isEarlyEmpty when mode is NOT_IN and all allowedUserIds are excluded', async () => {
  const result = await resolveCampaignFilter({
    campaignId: 10,
    campaignFilterMode: 'NOT_IN',
    existingAllowedUserIds: [101, 102],
    existingExcludedUserIds: [],
    findCampaignMembers: async () => [{ legacyUserId: 101 }, { legacyUserId: 102 }],
  });

  assert.equal(result.isEarlyEmpty, true);
  assert.deepEqual(result.allowedUserIds, []);
  assert.deepEqual(result.excludedUserIds, [101, 102]);
});

test('resolveCampaignFilter sanitizes non-positive and invalid IDs from campaign members', async () => {
  const result = await resolveCampaignFilter({
    campaignId: 10,
    campaignFilterMode: 'NOT_IN',
    existingAllowedUserIds: null,
    existingExcludedUserIds: [],
    findCampaignMembers: async () => [
      { legacyUserId: 101 },
      { legacyUserId: 0 },
      { legacyUserId: -5 },
      { legacyUserId: 101 }, // duplicate
    ],
  });

  assert.equal(result.isEarlyEmpty, false);
  assert.deepEqual(result.excludedUserIds, [101]);
});

