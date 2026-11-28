import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';

let inventoryPool: Pool | null = null;
let cachedPoolUrl = '';

export type InventoryDbConnection = PoolConnection;

export interface InventoryDbMeta {
  name: string;
  isIsolatedTestDb: boolean;
}

function resolveInventoryDatabaseUrl(): string {
  const url = process.env.INVENTORY_DATABASE_URL?.trim() || process.env.LEGACY_DATABASE_URL?.trim() || '';
  if (!url) {
    throw new Error('Missing INVENTORY_DATABASE_URL and LEGACY_DATABASE_URL environment variables.');
  }
  return url;
}

export function getInventoryDbMeta(): InventoryDbMeta {
  const url = resolveInventoryDatabaseUrl();
  try {
    const parsed = new URL(url);
    const dbName = parsed.pathname.replace(/^\/+/, '') || 'management';
    return {
      name: dbName,
      isIsolatedTestDb: dbName === 'management_inventory_win' || dbName.endsWith('_win'),
    };
  } catch {
    return { name: 'unknown', isIsolatedTestDb: false };
  }
}

export function getInventoryPool(): Pool {
  const url = resolveInventoryDatabaseUrl();
  if (inventoryPool && cachedPoolUrl === url) {
    return inventoryPool;
  }

  if (inventoryPool) {
    void inventoryPool.end().catch(() => undefined);
  }

  cachedPoolUrl = url;
  inventoryPool = mysql.createPool({
    uri: url,
    waitForConnections: true,
    connectionLimit: 10,
    timezone: '+07:00',
    dateStrings: true,
    multipleStatements: false,
  });

  return inventoryPool;
}

export async function queryInventory<T extends RowDataPacket[]>(
  sql: string,
  params: unknown[] = [],
  conn?: PoolConnection
): Promise<T> {
  const executor = conn ?? getInventoryPool();
  const [rows] = await executor.query<T>(sql, params);
  return rows;
}

export async function executeInventory(
  sql: string,
  params: unknown[] = [],
  conn?: PoolConnection
): Promise<ResultSetHeader> {
  const executor = conn ?? getInventoryPool();
  const [result] = await executor.execute<ResultSetHeader>(sql, params as never);
  return result;
}

export async function withInventoryTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getInventoryPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function closeInventoryPool(): Promise<void> {
  if (inventoryPool) {
    const pool = inventoryPool;
    inventoryPool = null;
    cachedPoolUrl = '';
    await pool.end();
  }
}
