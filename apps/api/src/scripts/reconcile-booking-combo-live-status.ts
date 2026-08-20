import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client/index.js';
import { buildComboLiveAtBookingSql } from '../modules/customers/services/combo-recognition.service.js';

type RepairCandidate = {
  orderId: number | bigint | string;
  orderServiceId: number | bigint | string;
  userId: number | bigint | string;
  bookingAt: Date | string;
  createdAt: Date | string;
  previousUserServiceType: string;
  totalPrice: number | bigint | string | null;
};

const args = new Set(process.argv.slice(2));
const getArg = (name: string) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const apply = args.has('--apply');
const from = getArg('--from');
const to = getArg('--to');
const snapshotPath = getArg('--snapshot');

function parseDateBound(value: string | undefined, label: string, endOfDay = false): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be supplied as YYYY-MM-DD.`);
  }
  return `${value} ${endOfDay ? '23:59:59' : '00:00:00'}`;
}

function json(value: unknown): void {
  process.stdout.write(
    `${JSON.stringify(value, (_key, item) => (typeof item === 'bigint' ? Number(item) : item), 2)}\n`
  );
}

async function run() {
  const fromBound = parseDateBound(from, '--from');
  const toBound = parseDateBound(to, '--to', true);
  if (fromBound > toBound) throw new Error('--from must not be after --to.');
  if (apply && !snapshotPath) throw new Error('--apply requires an absolute --snapshot path.');
  if (apply && (!snapshotPath || !path.isAbsolute(snapshotPath))) {
    throw new Error('--snapshot must be an absolute path so the rollback artifact cannot be misplaced.');
  }

  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  const legacy = new LegacyPrismaClient({
    datasources: { db: { url: process.env.LEGACY_DATABASE_URL } },
  });

  try {
    const comboLiveAtBookingSql = buildComboLiveAtBookingSql('o');
    const candidates = await legacy.$queryRawUnsafe<RepairCandidate[]>(
      `
      SELECT
        o.id AS orderId,
        os.id AS orderServiceId,
        o.user_id AS userId,
        o.booking_date_start AS bookingAt,
        o.date_created AS createdAt,
        os.user_service_type AS previousUserServiceType,
        os.total_price AS totalPrice
      FROM \`order\` o
      JOIN order_service os ON os.order_id = o.id
      WHERE o.booking_date_start >= ?
        AND o.booking_date_start <= ?
        AND os.user_service_type = 'combo_expired'
        AND ${comboLiveAtBookingSql}
      ORDER BY o.booking_date_start, o.id, os.id
    `,
      fromBound,
      toBound
    );

    const unsafeCandidates = candidates.filter((candidate) => Number(candidate.totalPrice || 0) !== 0);
    if (unsafeCandidates.length > 0) {
      throw new Error(
        `Refusing to rewrite ${unsafeCandidates.length} non-zero-value service row(s); review them before changing a legacy segment.`
      );
    }

    const snapshot = {
      purpose: 'Repair legacy combo_expired rows that the canonical booking-time combo ledger classifies as live.',
      createdAt: new Date().toISOString(),
      scope: { from: fromBound, to: toBound, previousUserServiceType: 'combo_expired', totalPrice: 0 },
      targetUserServiceType: 'combo',
      candidates: candidates.map((candidate) => ({
        orderId: Number(candidate.orderId),
        orderServiceId: Number(candidate.orderServiceId),
        userId: Number(candidate.userId),
        bookingAt: candidate.bookingAt,
        createdAt: candidate.createdAt,
        previousUserServiceType: candidate.previousUserServiceType,
        totalPrice: Number(candidate.totalPrice || 0),
      })),
    };

    if (!apply) {
      json({ mode: 'dry-run', candidateServiceRows: candidates.length, snapshot });
      return;
    }

    const resolvedSnapshotPath = path.resolve(snapshotPath!);
    await mkdir(path.dirname(resolvedSnapshotPath), { recursive: true });
    await writeFile(resolvedSnapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });

    const updatedRows = await legacy.$transaction(async (transaction) => {
      let updated = 0;
      for (const candidate of candidates) {
        const affected = await transaction.$executeRawUnsafe(
          `UPDATE order_service os
           JOIN \`order\` o ON o.id = os.order_id
           SET os.user_service_type = 'combo'
           WHERE os.id = ?
             AND o.booking_date_start >= ?
             AND o.booking_date_start <= ?
             AND os.user_service_type = 'combo_expired'
             AND os.total_price = 0
             AND ${comboLiveAtBookingSql}`,
          Number(candidate.orderServiceId),
          fromBound,
          toBound
        );
        if (affected !== 1) {
          throw new Error(
            `Order service ${Number(candidate.orderServiceId)} changed since dry-run; no data was repaired.`
          );
        }
        updated += affected;
      }
      return updated;
    });

    json({
      mode: 'apply',
      updatedServiceRows: updatedRows,
      snapshotPath: resolvedSnapshotPath,
      targetUserServiceType: 'combo',
    });
  } finally {
    await legacy.$disconnect();
  }
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
