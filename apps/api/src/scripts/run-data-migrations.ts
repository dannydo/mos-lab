import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import mysql, { type PoolConnection, type RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './data-migrations/types.js';

dotenv.config();

// pnpm runs package scripts from apps/api; avoid import.meta because this API package emits CommonJS.
const migrationDirectory = resolve(process.cwd(), 'src', 'scripts', 'data-migrations');
const migrationIdPattern = /^\d{14}_[a-z0-9][a-z0-9_-]*$/;
const advisoryLockName = 'mos-lab:crm-data-migrations';

type LoadedMigration = DataMigration & { checksum: string; fileName: string };

const requiredString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Data migration ${label} must be a non-empty string.`);
  }
  return value;
};

async function loadMigrations(): Promise<LoadedMigration[]> {
  const files = (await readdir(migrationDirectory))
    .filter((file) => ['.ts', '.js', '.mjs'].includes(extname(file)) && file !== 'types.ts')
    .sort();

  const migrations = await Promise.all(
    files.map(async (fileName) => {
      const idFromFileName = fileName.slice(0, -extname(fileName).length);
      if (!migrationIdPattern.test(idFromFileName)) {
        throw new Error(`Invalid data migration filename: ${fileName}. Use YYYYMMDDHHmmss_short-description.ts.`);
      }

      const absolutePath = join(migrationDirectory, fileName);
      const source = await readFile(absolutePath);
      const module = (await import(pathToFileURL(absolutePath).href)) as { default?: DataMigration };
      const migration = module.default;

      if (!migration || typeof migration !== 'object') {
        throw new Error(`${fileName} must default-export a data migration.`);
      }
      if (requiredString(migration.id, `${fileName}.id`) !== idFromFileName) {
        throw new Error(`${fileName} must use the same id as its filename.`);
      }
      requiredString(migration.description, `${fileName}.description`);
      if (typeof migration.up !== 'function') {
        throw new Error(`${fileName}.up must be a function.`);
      }
      if (migration.preflight && typeof migration.preflight !== 'function') {
        throw new Error(`${fileName}.preflight must be a function when provided.`);
      }

      return {
        ...migration,
        fileName,
        checksum: createHash('sha256').update(source).digest('hex'),
      };
    })
  );

  const ids = new Set<string>();
  for (const migration of migrations) {
    if (ids.has(migration.id)) throw new Error(`Duplicate data migration id: ${migration.id}`);
    ids.add(migration.id);
  }

  return migrations;
}

async function runMigration(connection: PoolConnection, migration: LoadedMigration, commitSha?: string) {
  const [existingRows] = await connection.execute<RowDataPacket[]>(
    'SELECT checksum FROM crm_data_migrations WHERE id = ?',
    [migration.id]
  );
  const existing = existingRows[0];
  if (existing) {
    if (existing.checksum !== migration.checksum) {
      throw new Error(`Checksum mismatch for applied migration ${migration.id}; applied migrations are immutable.`);
    }
    console.log(`Skipped ${migration.id} (already applied).`);
    return;
  }

  console.log(`Preflight ${migration.id}: ${migration.description}`);
  await migration.preflight?.(connection);

  const startedAt = Date.now();
  await connection.beginTransaction();
  try {
    await migration.up(connection);
    await connection.execute(
      `INSERT INTO crm_data_migrations (id, checksum, description, commit_sha, duration_ms)
       VALUES (?, ?, ?, ?, ?)`,
      [migration.id, migration.checksum, migration.description, commitSha || null, Date.now() - startedAt]
    );
    await connection.commit();
    console.log(`Applied ${migration.id} in ${Date.now() - startedAt}ms.`);
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function main() {
  const migrations = await loadMigrations();
  const mode = process.argv.includes('--validate') ? 'validate' : process.argv.includes('--plan') ? 'plan' : 'run';
  const commitArgument = process.argv.find((argument) => argument.startsWith('--commit='));
  const commitSha = commitArgument?.slice('--commit='.length);

  if (mode === 'validate') {
    console.log(`Validated ${migrations.length} production data migration(s).`);
    return;
  }

  if (!process.env.CRM_DATABASE_URL) throw new Error('CRM_DATABASE_URL is required to plan or run data migrations.');
  const pool = mysql.createPool(process.env.CRM_DATABASE_URL);
  const connection = await pool.getConnection();
  try {
    const [lockRows] = await connection.execute<RowDataPacket[]>('SELECT GET_LOCK(?, 30) AS acquired', [
      advisoryLockName,
    ]);
    if (Number(lockRows[0]?.acquired) !== 1) throw new Error('Could not acquire the production data migration lock.');

    const [appliedRows] = await connection.execute<RowDataPacket[]>('SELECT id, checksum FROM crm_data_migrations');
    const applied = new Map(appliedRows.map((row) => [String(row.id), String(row.checksum)]));
    const pending = migrations.filter((migration) => {
      const checksum = applied.get(migration.id);
      if (checksum && checksum !== migration.checksum) {
        throw new Error(`Checksum mismatch for applied migration ${migration.id}; applied migrations are immutable.`);
      }
      return !checksum;
    });

    if (mode === 'plan') {
      console.log(
        `Data migration plan: ${pending.length} pending, ${migrations.length - pending.length} already applied.`
      );
      for (const migration of pending) console.log(`- ${migration.id}: ${migration.description}`);
      return;
    }

    for (const migration of migrations) await runMigration(connection, migration, commitSha);
    console.log('Production data migrations completed.');
  } finally {
    await connection.query('SELECT RELEASE_LOCK(?)', [advisoryLockName]).catch(() => undefined);
    connection.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
