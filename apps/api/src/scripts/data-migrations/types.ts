import type { PoolConnection } from 'mysql2/promise';

export type DataMigration = {
  /** Immutable, sortable identifier: YYYYMMDDHHmmss_short-description */
  id: string;
  description: string;
  /** Read-only safety checks. Throwing here stops the deploy before writes begin. */
  preflight?: (connection: PoolConnection) => Promise<void>;
  /** DML only. The runner wraps this in a transaction and records it atomically. */
  up: (connection: PoolConnection) => Promise<void>;
};
