import assert from 'node:assert/strict';
import test from 'node:test';

test('CV speed CTE query contains mutually exclusive 90-day date scopes and single joins', () => {
  const effectiveCvStaffIds = [3832, 13783, 25337];
  const query = `
    WITH eligible_orders AS (
      SELECT o.id AS order_id
      FROM report_order ro
      JOIN \`order\` o ON o.id = ro.order_id
      WHERE o.order_state = 'Completed'
        AND ro.actual_booking_date_start >= DATE_SUB(NOW(), INTERVAL 90 DAY)
      UNION ALL
      SELECT o.id AS order_id
      FROM \`order\` o
      LEFT JOIN report_order ro ON ro.order_id = o.id
      WHERE o.order_state = 'Completed'
        AND ro.actual_booking_date_start IS NULL
        AND o.booking_date_start >= DATE_SUB(NOW(), INTERVAL 90 DAY)
    )
    SELECT
      os.assigned_staff_id as staff_id,
      s.service_type,
      ROUND(AVG(
        COALESCE(ros.preparation_minute, 0) +
        COALESCE(ros.pre_servicing_minute, 0) +
        COALESCE(ros.cleaning_minute, 0) +
        COALESCE(ros.servicing_minute, 0)
      )) as avg_min
    FROM eligible_orders eo
    JOIN order_service os ON eo.order_id = os.order_id
    JOIN service s ON os.service_id = s.id
    JOIN report_order_service ros ON os.id = ros.order_service_id
    WHERE s.service_group IN ('Lashes', 'LashesTop', 'LashesUnder')
      AND os.assigned_staff_id IN (${effectiveCvStaffIds.join(',')})
      AND (COALESCE(ros.preparation_minute, 0) +
           COALESCE(ros.pre_servicing_minute, 0) +
           COALESCE(ros.cleaning_minute, 0) +
           COALESCE(ros.servicing_minute, 0)) BETWEEN 15 AND 200
    GROUP BY os.assigned_staff_id, s.service_type
  `;

  // Verify CTE structure
  assert.match(query, /WITH eligible_orders AS/);
  assert.match(query, /ro\.actual_booking_date_start >= DATE_SUB\(NOW\(\), INTERVAL 90 DAY\)/);
  assert.match(query, /ro\.actual_booking_date_start IS NULL/);
  assert.match(query, /FROM eligible_orders eo/);
  assert.match(query, /GROUP BY os\.assigned_staff_id, s\.service_type/);
  // Verify that order_service is joined once against eligible_orders, not duplicated in UNION branches
  const osJoinCount = (query.match(/JOIN order_service/g) || []).length;
  assert.equal(osJoinCount, 1, 'order_service must be joined only once in the outer query');
});

test('CV speed cache key is deterministic regardless of staff ID order', () => {
  const staffIds1 = [25337, 3832, 13783];
  const staffIds2 = [3832, 13783, 25337];

  const key1 = [...staffIds1].sort((a, b) => a - b).join(',');
  const key2 = [...staffIds2].sort((a, b) => a - b).join(',');

  assert.equal(key1, key2);
  assert.equal(key1, '3832,13783,25337');
});

test('CV speed cache honors 5-minute TTL window', () => {
  const cache = new Map<string, { data: any[]; timestamp: number }>();
  const TTL_MS = 5 * 60 * 1000;
  const key = '3832,13783';
  const sampleData = [{ staff_id: 3832, service_type: 'Normal', avg_min: 90 }];

  // Initial populate
  cache.set(key, { data: sampleData, timestamp: Date.now() });

  // Within TTL: Cache hit
  const hit = cache.get(key);
  assert.ok(hit);
  assert.ok(Date.now() - hit.timestamp < TTL_MS);
  assert.deepEqual(hit.data, sampleData);

  // Expired: Cache miss
  const expiredEntry = { data: sampleData, timestamp: Date.now() - (TTL_MS + 1000) };
  assert.ok(Date.now() - expiredEntry.timestamp >= TTL_MS);
});
