import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client';

const legacy = new LegacyPrismaClient({
  datasources: {
    db: {
      url: 'mysql://root:chickisslove@127.0.0.1:3306/management',
    },
  },
});

async function runForDate(dateStr: string) {
  const clientBusinessId = 1;
  const userId = 25047;
  const date = dateStr;
  const serviceGroup = 'Lashes';

  const txns = await legacy.$queryRaw<any[]>`
    SELECT id, user_service_balance_id, date_created, date_used, date_expired, normal_count, retain_count, used_staff_id, service_group
    FROM user_service_balance_transaction
    WHERE client_business_id = ${clientBusinessId}
      AND user_id = ${userId}
      AND DATE(date_created) < ${date}
      AND (normal_count + retain_count) > 0
      AND (
        (DATE(date_used) = ${date} OR DATE(date_changed) = ${date} OR DATE(date_cancelled) = ${date})
        OR (date_used IS NULL AND date_changed IS NULL AND date_cancelled IS NULL)
      )
  `;

  console.log(`\n--- Date: ${dateStr} ---`);
  console.log(`Transactions found: ${txns.length}`);

  const balanceLefts: Record<string, number> = {};
  const balanceExpiries: Record<string, Record<number, string | null>> = {};

  for (const t of txns) {
    const sg = t.service_group || 'Lashes';
    if (!balanceLefts[sg]) balanceLefts[sg] = 0;
    balanceLefts[sg]++;

    if (!balanceExpiries[sg]) balanceExpiries[sg] = {};
    balanceExpiries[sg][Number(t.user_service_balance_id)] = t.date_expired
      ? new Date(t.date_expired).toISOString().slice(0, 10)
      : null;
  }

  let type = '';
  for (const sg of Object.keys(balanceLefts)) {
    const count = balanceLefts[sg];
    if (count === 1) {
      type = 'combo_last';
    }
  }

  if (!type) {
    for (const sg of Object.keys(balanceExpiries)) {
      const expiries = balanceExpiries[sg];
      for (const bid of Object.keys(expiries)) {
        const expiry = expiries[Number(bid)];
        if (expiry && expiry < date) {
          type = 'combo_expired';
        }
      }
    }
  }

  console.log(`Calculated type: ${type}`);
  console.log('balanceLefts:', balanceLefts);
  console.log('balanceExpiries:', balanceExpiries);
}

async function main() {
  try {
    await legacy.$connect();
    await runForDate('2026-04-21');
    await runForDate('2026-06-16');
    await runForDate('2026-07-12');
  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
