import 'dotenv/config';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { closeInventoryPool } from '../modules/inventory/services/inventory-db.js';
import {
  buildSystemInventoryCronContext,
  executeInventoryJob,
} from '../modules/inventory/services/inventory-jobs-runner.service.js';

// Ensure .env loads both from apps/api CWD and monorepo root
loadEnv({ path: path.resolve(process.cwd(), 'apps/api/.env') });
loadEnv({ path: path.resolve(process.cwd(), '.env') });

function readFlag(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(`--${name}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const jobKey = readFlag(args, 'job') || args.find((a) => !a.startsWith('--'));
  if (!jobKey) {
    console.error(
      'Usage: pnpm --filter @mos-lab/api inventory:cron -- --job=<key> [--date=YYYY-MM-DD] [--warehouseId=N] [--dry-run] [--chain] [--force]'
    );
    process.exit(1);
  }

  const timeoutMs = Number(readFlag(args, 'timeout') || 90_000);
  const timer = setTimeout(() => {
    console.error(`Inventory cron CLI timed out after ${timeoutMs}ms`);
    process.exit(1);
  }, timeoutMs);
  timer.unref();

  try {
    const ctx = buildSystemInventoryCronContext();
    const result = await executeInventoryJob(
      ctx,
      jobKey,
      {
        date: readFlag(args, 'date'),
        warehouseId: readFlag(args, 'warehouseId') ? Number(readFlag(args, 'warehouseId')) : undefined,
        warehouseItemId: readFlag(args, 'warehouseItemId') ? Number(readFlag(args, 'warehouseItemId')) : undefined,
        inventoryItemId: readFlag(args, 'itemId') ? Number(readFlag(args, 'itemId')) : undefined,
        dryRun: hasFlag(args, 'dry-run'),
        chainDownstream: hasFlag(args, 'chain'),
        forceRun: hasFlag(args, 'force'),
        simulateDay: readFlag(args, 'simulate-day') ? Number(readFlag(args, 'simulate-day')) : undefined,
        simulateHour: readFlag(args, 'simulate-hour') ? Number(readFlag(args, 'simulate-hour')) : undefined,
      },
      'cli'
    );
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.status === 'failed' ? 1 : 0;
  } finally {
    clearTimeout(timer);
    await closeInventoryPool();
  }
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
