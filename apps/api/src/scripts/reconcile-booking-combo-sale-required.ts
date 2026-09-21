import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient as CrmPrismaClient } from '../generated/crm-client/index.js';
import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client/index.js';
import { SafeAny } from '@mos-lab/shared';
import { BookingSaleClassificationService } from '../modules/customers/services/booking-sale-classification.service.js';

import { existsSync } from 'node:fs';
import { homedir } from 'node:os';

const envCandidates = [
  path.resolve(process.cwd(), 'apps/api/.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(homedir(), 'projects/mos-lab/apps/api/.env'),
  '/Users/dannydo/projects/mos-lab/apps/api/.env',
];
for (const envFile of envCandidates) {
  if (existsSync(envFile)) {
    dotenv.config({ path: envFile });
    if (process.env.LEGACY_DATABASE_URL) break;
  }
}

type MosOrderRow = {
  id: number;
  user_id: number;
  order_key: string;
  order_state: string;
  booking_date_start: Date;
  combo_sale_required: number | boolean;
  is_new: number | boolean;
};

type ReconciliationChange = {
  orderId: number;
  userId: number;
  orderKey: string;
  orderState: string;
  bookingDateStart: string;
  currentComboSaleRequired: number;
  expectedComboSaleRequired: number;
  currentIsNew: number;
  expectedIsNew: number;
  requiresComboSaleRequiredChange: boolean;
  requiresIsNewChange: boolean;
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

const MOS_BOOKINGS_SQL = `
  SELECT
    o.id,
    o.user_id,
    o.order_key,
    o.order_state,
    o.booking_date_start,
    o.combo_sale_required,
    o.is_new
  FROM \`order\` o
  WHERE o.order_key LIKE 'booking_%'
  ORDER BY o.id DESC
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
        purpose: 'Rollback snapshot for MOS booking combo_sale_required and is_new reconciliation (MOS-BUG-3)',
        createdAt: new Date().toISOString(),
        scope: "order_key LIKE 'booking_%'",
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

  const rawRows = await legacy.$queryRawUnsafe<MosOrderRow[]>(MOS_BOOKINGS_SQL);
  const rows = rawRows.map((row) => ({
    ...row,
    id: Number(row.id),
    user_id: Number(row.user_id),
    combo_sale_required: row.combo_sale_required ? 1 : 0,
    is_new: row.is_new ? 1 : 0,
  }));

  const changes: ReconciliationChange[] = [];
  for (const row of rows) {
    const classification = await BookingSaleClassificationService.determineBookingSaleClassification(
      fastify,
      row.user_id,
      row.booking_date_start,
      'LashesTop',
      1
    );

    const requiresComboSaleRequiredChange = row.combo_sale_required !== classification.comboSaleRequired;
    const requiresIsNewChange = row.is_new !== classification.isNew;

    if (requiresComboSaleRequiredChange || requiresIsNewChange) {
      changes.push({
        orderId: row.id,
        userId: row.user_id,
        orderKey: row.order_key,
        orderState: row.order_state,
        bookingDateStart: row.booking_date_start.toISOString(),
        currentComboSaleRequired: row.combo_sale_required,
        expectedComboSaleRequired: classification.comboSaleRequired,
        currentIsNew: row.is_new,
        expectedIsNew: classification.isNew,
        requiresComboSaleRequiredChange,
        requiresIsNewChange,
      });
    }
  }

  if (!apply) {
    json({
      mode: 'dry-run',
      scope: "order_key LIKE 'booking_%'",
      scannedOrders: rows.length,
      proposedChanges: changes.length,
      comboSaleRequiredChanges: changes.filter((c) => c.requiresComboSaleRequiredChange).length,
      isNewChanges: changes.filter((c) => c.requiresIsNewChange).length,
      sampleChanges: changes.slice(0, 10),
    });
    return;
  }

  const savedSnapshotPath = await writeSnapshot(changes);
  const affectedRows = await legacy.$transaction(async (transaction) => {
    let total = 0;
    for (const change of changes) {
      const affected = await transaction.$executeRawUnsafe(
        `UPDATE \`order\`
         SET combo_sale_required = ?, is_new = ?
         WHERE id = ?
           AND order_key = ?`,
        change.expectedComboSaleRequired,
        change.expectedIsNew,
        change.orderId,
        change.orderKey
      );
      if (affected !== 1) {
        throw new Error(`Order ${change.orderId} could not be updated cleanly; rolled back.`);
      }
      total += affected;
    }
    return total;
  });

  json({
    mode: 'apply',
    scannedOrders: rows.length,
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
