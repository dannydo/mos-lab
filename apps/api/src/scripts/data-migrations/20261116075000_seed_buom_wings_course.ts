import type { RowDataPacket } from "mysql2/promise";
import type { DataMigration } from "./types.js";

const migration: DataMigration = {
  id: "20261116075000_seed_buom_wings_course",
  description: "Seed Khóa Bướm (buom_wings) into crm_academy_courses table.",
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
        \`kit_name\`,
        \`kit_price_vnd\`,
        \`sample_price_vnd\`,
        \`lesson_count\`,
        \`lash_model_count\`,
        \`sort_order\`,
        \`is_active\`,
        \`created_at\`,
        \`updated_at\`
      ) VALUES (
        "buom_wings",
        "Khóa Bướm - Tiêu chuẩn, Thiết Kế và Quy Trình Wings",
        "Butterfly - Wings Standard, Design & Workflow",
        "CHUẨN BƯỚM",
        "Dành cho học viên đã có tay nghề nối mi, thi đạt bậc Thiên Thần Bóng Tối. Học tiêu chuẩn, thiết kế & quy trình làm việc tại Wings. Nguyên vật liệu Wings cung cấp; học viên tự mang theo mẫu và đồ nghề.",
        "DOMESTIC",
        5000000,
        5000000,
        0,
        NULL,
        0,
        0,
        0,
        0,
        7,
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ) ON DUPLICATE KEY UPDATE
        \`name\` = VALUES(\`name\`),
        \`name_en\` = VALUES(\`name_en\`),
        \`tag\` = VALUES(\`tag\`),
        \`description\` = VALUES(\`description\`),
        \`market\` = VALUES(\`market\`),
        \`list_price_vnd\` = VALUES(\`list_price_vnd\`),
        \`promo_price_vnd\` = VALUES(\`promo_price_vnd\`),
        \`teacher_bonus_vnd\` = VALUES(\`teacher_bonus_vnd\`),
        \`kit_name\` = VALUES(\`kit_name\`),
        \`kit_price_vnd\` = VALUES(\`kit_price_vnd\`),
        \`sample_price_vnd\` = VALUES(\`sample_price_vnd\`),
        \`lesson_count\` = VALUES(\`lesson_count\`),
        \`lash_model_count\` = VALUES(\`lash_model_count\`),
        \`sort_order\` = VALUES(\`sort_order\`),
        \`is_active\` = 1,
        \`updated_at\` = CURRENT_TIMESTAMP`
    );
  },
};

export default migration;
