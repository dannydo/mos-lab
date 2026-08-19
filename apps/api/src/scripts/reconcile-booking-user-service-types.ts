import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient as CrmPrismaClient } from '../generated/crm-client/index.js';
import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client/index.js';
import { SafeAny } from '@mos-lab/shared';
import { UserServiceTypeService } from '../modules/customers/services/user-service-type.service.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

type BookingServiceRow = {
  orderId: number;
  orderServiceId: number;
  userId: number;
  clientBusinessId: number;
  bookingDate: string;
  orderState: string;
  storedUserServiceType: string | null;
  storedServiceGroup: string | null;
  expectedServiceGroup: string;
};

type ReconciliationChange = BookingServiceRow & {
  recalculatedUserServiceType: string;
  requiresStatusChange: boolean;
  requiresServiceGroupChange: boolean;
};

const legacy = new LegacyPrismaClient();
const crm = new CrmPrismaClient();
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const snapshotArgIndex = process.argv.indexOf('--snapshot');
const snapshotPath = snapshotArgIndex >= 0 ? process.argv[snapshotArgIndex + 1] : undefined;

const fastify = {
  prisma: { legacy, crm },
  log: {
    error: (error: unknown, message?: string) => console.error(message || 'error', error),
  },
} as SafeAny;

const OPEN_MOS_BOOKING_SQL = `
  SELECT
    o.id AS orderId,
    os.id AS orderServiceId,
    o.user_id AS userId,
    COALESCE(NULLIF(o.client_business_id, 0), NULLIF(os.client_business_id, 0), 1) AS clientBusinessId,
    DATE_FORMAT(o.booking_date_start, '%Y-%m-%d') AS bookingDate,
    o.order_state AS orderState,
    os.user_service_type AS storedUserServiceType,
    os.service_group AS storedServiceGroup,
    COALESCE(NULLIF(s.service_group, ''), NULLIF(os.service_group, ''), 'LashesTop') AS expectedServiceGroup
  FROM \`order\` o
  JOIN order_service os ON os.order_id = o.id
  LEFT JOIN service s ON s.id = os.service_id
  WHERE o.order_key LIKE 'booking_%'
    AND o.order_state IN ('New', 'Confirmed')
    AND o.booking_date_start >= CURDATE()
  ORDER BY o.booking_date_start ASC, o.id ASC, os.id ASC
`;

function json(value: unknown) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function writeSnapshot(changes: ReconciliationChange[]) {
  if (!snapshotPath) {
    throw new Error('`--apply` requires `--snapshot /absolute/path/to/backup.json`.');
  }

  const resolvedPath = path.resolve(snapshotPath);
  await mkdir(path.dirname(resolvedPath), { recursive: true });
  await writeFile(
    resolvedPath,
    `${JSON.stringify(
      {
        purpose: 'Rollback snapshot for open/future MOS booking user-service-type reconciliation',
        createdAt: new Date().toISOString(),
        scope: "order_key LIKE 'booking_%', order_state IN ('New', 'Confirmed'), booking_date_start >= CURDATE()",
        changes,
      },
      null,
      2
    )}\n`,
    { encoding: 'utf8', flag: 'wx' }
  );
  return resolvedPath;
}

async function run() {
  if (apply && !snapshotPath) {
    throw new Error('Refusing to change Production without a rollback snapshot path.');
  }

  const rawRows = await legacy.$queryRawUnsafe<BookingServiceRow[]>(OPEN_MOS_BOOKING_SQL);
  const rows = rawRows.map((row) => ({
    ...row,
    orderId: Number(row.orderId),
    orderServiceId: Number(row.orderServiceId),
    userId: Number(row.userId),
    clientBusinessId: Number(row.clientBusinessId || 1),
    bookingDate: String(row.bookingDate),
    orderState: String(row.orderState),
    storedUserServiceType: row.storedUserServiceType ? String(row.storedUserServiceType) : null,
    storedServiceGroup: row.storedServiceGroup ? String(row.storedServiceGroup) : null,
    expectedServiceGroup: String(row.expectedServiceGroup || 'LashesTop'),
  }));
  if (rows.length > 500) {
    throw new Error(`Refusing to process ${rows.length} records; expected at most 500 open MOS booking services.`);
  }

  const changes: ReconciliationChange[] = [];
  for (const row of rows) {
    const recalculatedUserServiceType = await UserServiceTypeService.determineUserServiceType(
      fastify,
      Number(row.userId),
      String(row.bookingDate),
      String(row.expectedServiceGroup || 'LashesTop'),
      Number(row.clientBusinessId || 1)
    );
    const storedUserServiceType = String(row.storedUserServiceType || '');
    const storedServiceGroup = String(row.storedServiceGroup || '');
    const expectedServiceGroup = String(row.expectedServiceGroup || 'LashesTop');
    const requiresStatusChange = storedUserServiceType !== recalculatedUserServiceType;
    const requiresServiceGroupChange = storedServiceGroup !== expectedServiceGroup;

    if (requiresStatusChange || requiresServiceGroupChange) {
      changes.push({
        ...row,
        recalculatedUserServiceType,
        requiresStatusChange,
        requiresServiceGroupChange,
      });
    }
  }

  if (!apply) {
    json({
      mode: 'dry-run',
      scope: "order_key LIKE 'booking_%', order_state IN ('New', 'Confirmed'), booking_date_start >= CURDATE()",
      scannedOpenBookingServices: rows.length,
      proposedChanges: changes.length,
      statusChanges: changes.filter((change) => change.requiresStatusChange).length,
      serviceGroupRepairs: changes.filter((change) => change.requiresServiceGroupChange).length,
      changes,
    });
    return;
  }

  const savedSnapshotPath = await writeSnapshot(changes);
  const affectedRows = await legacy.$transaction(async (transaction) => {
    let total = 0;
    for (const change of changes) {
      const affected = await transaction.$executeRawUnsafe(
        `UPDATE order_service os
         JOIN \`order\` o ON o.id = os.order_id
         SET os.user_service_type = ?, os.service_group = ?
         WHERE os.id = ?
           AND o.order_key LIKE 'booking_%'
           AND o.order_state IN ('New', 'Confirmed')
           AND o.booking_date_start >= CURDATE()
           AND COALESCE(os.user_service_type, '') = ?
           AND COALESCE(os.service_group, '') = ?`,
        change.recalculatedUserServiceType,
        change.expectedServiceGroup,
        Number(change.orderServiceId),
        String(change.storedUserServiceType || ''),
        String(change.storedServiceGroup || '')
      );
      if (affected !== 1) {
        throw new Error(
          `Order service ${change.orderServiceId} changed since dry-run; rolled back without partial update.`
        );
      }
      total += affected;
    }
    return total;
  });

  json({
    mode: 'apply',
    scannedOpenBookingServices: rows.length,
    appliedChanges: affectedRows,
    snapshotPath: savedSnapshotPath,
  });
}

run()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([legacy.$disconnect(), crm.$disconnect()]);
  });
