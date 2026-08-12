# Production data migrations

Each production data migration is a committed TypeScript module in this folder. The deploy pipeline validates, plans, and then runs pending migrations automatically after the CRM schema sync and before the API restart.

## Create a migration

Name the file and immutable migration id with the same sortable timestamp:

```text
20260812213000_backfill_staff_timezone.ts
```

```ts
import type { DataMigration } from './types.js';

const migration: DataMigration = {
  id: '20260812213000_backfill_staff_timezone',
  description: 'Backfill timezone for staff records missing a value.',
  async preflight(connection) {
    const [rows] = await connection.query('SELECT COUNT(*) AS count FROM crm_staff WHERE timezone IS NULL');
    console.log('Rows to update:', rows[0].count);
  },
  async up(connection) {
    await connection.execute("UPDATE crm_staff SET timezone = 'Asia/Ho_Chi_Minh' WHERE timezone IS NULL");
  },
};

export default migration;
```

Rules:

- Migrations are DML only: do not create, alter, or drop tables here. Update `prisma/crm.prisma` for schema changes.
- The `id` and file contents are immutable after production. The runner stores a SHA-256 checksum and stops on edits.
- Make `up` idempotent where practical. It runs inside one transaction and is recorded in `crm_data_migrations` only after success.
- Never add exploratory, repair, seed, or legacy-database scripts to this folder. Legacy transaction tables remain read-only.
