import type { RowDataPacket } from "mysql2/promise";
import type { DataMigration } from "./types.js";

const migration: DataMigration = {
  id: "20260928110000_seed_workshop_1days_course",
  description: "Seed \"Khóa WORKSHOP 1DAYS\" into crm_academy_courses table.",
  async preflight(connection) {
    const [tables] = await connection.execute<RowDataPacket[]>(
      "SHOW TABLES LIKE 'crm_academy_courses'"
    );
    if (!tables || tables.length === 0) {
      throw new Error("crm_academy_courses table does not exist.");
    }
  },
  async up(connection) {
    await connection.execute(
      `INSERT INTO crm_academy_courses (
        \`code\`,
        \`name\`,
        \`name_en\`,
        \`tag\`,
        \`description\`,
        \`market\`,
        \`list_price_vnd\`,
        \`promo_price_vnd\`,
        \`teacher_bonus_vnd\`,
        \`lesson_count\`,
        \`lash_model_count\`,
        \`sort_order\`,
        \`is_active\`,
        \`created_at\`,
        \`updated_at\`
      ) VALUES (
        "workshop_1days",
        "Khóa WORKSHOP 1DAYS",
        "Workshop 1 Day",
        "WORKSHOP",
        "Khóa học Workshop 1 ngày",
        "DOMESTIC",
        0,
        0,
        0,
        1,
        0,
        6,
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ) ON DUPLICATE KEY UPDATE
        \`name\` = VALUES(\`name\`),
        \`is_active\` = 1,
        \`updated_at\` = CURRENT_TIMESTAMP`
    );
  },
};

export default migration;
