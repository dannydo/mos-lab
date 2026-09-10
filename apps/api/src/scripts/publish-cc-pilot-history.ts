import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import {
  CC_NATIVE_PAYROLL_PILOT_HISTORY_CONFIG_KEY,
  __test__,
} from '../modules/payroll-ledger/cc-native-pilot-history.service.js';
import { __test__ as cohortTest } from '../modules/payroll-ledger/cc-native-pilot-cohort.service.js';

dotenv.config();

async function readSnapshot(): Promise<string> {
  const raw = await readFile('/dev/stdin', 'utf8');
  if (!raw.trim()) throw new Error('A verified native CC pilot history snapshot is required on standard input');
  if (!__test__.parseHistorySnapshot(raw)) throw new Error('Native CC pilot history snapshot is invalid');
  return raw;
}

async function main() {
  const rawSnapshot = await readSnapshot();
  if (!process.env.CRM_DATABASE_URL) throw new Error('CRM_DATABASE_URL is required to publish native CC pilot history');
  const pool = mysql.createPool(process.env.CRM_DATABASE_URL);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [cohortRows] = await connection.execute<RowDataPacket[]>(
      'SELECT value FROM crm_config WHERE `key` = ? LIMIT 1',
      ['CC_NATIVE_PAYROLL_PILOT_COHORT']
    );
    const cohort = cohortTest.parsePilotConfig(cohortRows[0]?.value);
    const snapshot = __test__.parseHistorySnapshot(rawSnapshot);
    if (!snapshot) throw new Error('Native CC pilot history snapshot is invalid');
    __test__.assertMatchesCohort(snapshot, cohort);

    const [existingRows] = await connection.execute<RowDataPacket[]>(
      'SELECT value FROM crm_config WHERE `key` = ? LIMIT 1',
      [CC_NATIVE_PAYROLL_PILOT_HISTORY_CONFIG_KEY]
    );
    if (existingRows[0]?.value) {
      const existing = __test__.parseHistorySnapshot(existingRows[0].value);
      if (existing?.sourceHash !== snapshot.sourceHash) {
        throw new Error('A different native CC pilot history is already published; refusing to overwrite it');
      }
      await connection.rollback();
      process.stdout.write('Native CC pilot history was already published with the same verified hash.\n');
      return;
    }

    await connection.execute('INSERT INTO crm_config (`key`, `value`, `updated_at`) VALUES (?, ?, CURRENT_TIMESTAMP)', [
      CC_NATIVE_PAYROLL_PILOT_HISTORY_CONFIG_KEY,
      rawSnapshot,
    ]);
    await connection.commit();
    process.stdout.write('Published verified native CC pilot history.\n');
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
