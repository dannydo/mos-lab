import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type mysql from 'mysql2/promise';
import { fetchPromotionsByIds, invalidatePromotionsByIdsCache } from './ios-promotions.service.js';

function makePromoRow(id: number, name: string) {
  return {
    id,
    promotion_key: `PROMO_${id}`,
    promotion_type: 'normal',
    promotion_apply: 'service',
    service_group: null,
    discount_percentage: 20,
    discount_amount: 0,
    exactly_amount: 0,
    is_old_user_disabled: 0,
    is_approval_required: 0,
    is_public: 1,
    is_system: 0,
    is_credit_allowed: 1,
    is_disabled: 0,
    date_expired: null,
    position: 1,
    promotion_name: name,
    promotion_short_name: name,
  };
}

describe('fetchPromotionsByIds TTL cache', () => {
  it('returns cached results on repeated calls within TTL and refetches after invalidation', async () => {
    let queryCount = 0;
    const mockPool = {
      query: async () => {
        queryCount += 1;
        return [[makePromoRow(101, `Promo v${queryCount}`)], []];
      },
    } as unknown as mysql.Pool;

    const first = await fetchPromotionsByIds(mockPool, [101]);
    const second = await fetchPromotionsByIds(mockPool, [101]);

    assert.equal(queryCount, 1);
    assert.equal(first.get(101)?.name, 'Promo v1');
    assert.equal(second.get(101)?.name, 'Promo v1');

    invalidatePromotionsByIdsCache([101], mockPool);
    const third = await fetchPromotionsByIds(mockPool, [101]);

    assert.equal(queryCount, 2);
    assert.equal(third.get(101)?.name, 'Promo v2');
  });

  it('does not cache transient SQL errors', async () => {
    let attempts = 0;
    const mockPool = {
      query: async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error('temporary mysql error');
        }
        return [[makePromoRow(202, 'Recovered Promo')], []];
      },
    } as unknown as mysql.Pool;

    const failed = await fetchPromotionsByIds(mockPool, [202]);
    assert.equal(failed.size, 0);

    const recovered = await fetchPromotionsByIds(mockPool, [202]);
    assert.equal(attempts, 2);
    assert.equal(recovered.get(202)?.name, 'Recovered Promo');
  });
});
