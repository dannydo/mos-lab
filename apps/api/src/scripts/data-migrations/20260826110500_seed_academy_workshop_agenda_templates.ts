import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const templates = [
  {
    title: 'Happy Friday · Tố chất & chốt khóa',
    description: 'Đón khách, đánh giá tố chất, nội dung chính, game và tư vấn lộ trình.',
    items: [
      ['Đón khách & check-in', 'OTHER', 30],
      ['Kiểm tra Tố Chất', 'TALENT_TEST', 45],
      ['Nội dung workshop', 'CONTENT', 60],
      ['Game tương tác', 'GAME', 20],
      ['Tư vấn lộ trình & chốt khóa', 'SALES', 30],
    ],
  },
  {
    title: 'Khám phá tố chất',
    description: 'Tập trung vào đánh giá đầu vào, phản hồi kết quả và định hướng học tập.',
    items: [
      ['Đón khách & check-in', 'OTHER', 20],
      ['Giới thiệu hành trình Academy', 'CONTENT', 20],
      ['Kiểm tra Tố Chất', 'TALENT_TEST', 60],
      ['Đọc kết quả & định hướng', 'SALES', 30],
      ['Hỏi đáp & đăng ký lộ trình', 'SALES', 25],
    ],
  },
  {
    title: 'Masterclass kỹ năng',
    description: 'Dành cho buổi đào tạo chuyên môn với trình diễn, thực hành và phản hồi.',
    items: [
      ['Đón khách & ổn định lớp', 'OTHER', 15],
      ['Mở bài & mục tiêu buổi học', 'CONTENT', 15],
      ['Trình diễn kỹ thuật', 'CONTENT', 45],
      ['Thực hành có hướng dẫn', 'CONTENT', 75],
      ['Nghỉ giải lao', 'BREAK', 15],
      ['Nhận xét, hỏi đáp & tổng kết', 'CONTENT', 30],
    ],
  },
] as const;

const migration: DataMigration = {
  id: '20260826110500_seed_academy_workshop_agenda_templates',
  description: 'Seed editable Academy workshop agenda templates and attach existing workshops to Happy Friday.',
  async up(connection) {
    let happyFridayTemplateId: number | null = null;

    for (const template of templates) {
      const [existingRows] = await connection.execute<RowDataPacket[]>(
        'SELECT id FROM crm_academy_workshop_agenda_templates WHERE title = ? LIMIT 1',
        [template.title]
      );
      let templateId = Number(existingRows[0]?.id || 0);
      if (!templateId) {
        const [result] = await connection.execute<ResultSetHeader>(
          `INSERT INTO crm_academy_workshop_agenda_templates
            (title, description, created_at, updated_at)
           VALUES (?, ?, CURRENT_TIMESTAMP(0), CURRENT_TIMESTAMP(0))`,
          [template.title, template.description]
        );
        templateId = result.insertId;
      }

      const [itemRows] = await connection.execute<RowDataPacket[]>(
        'SELECT COUNT(*) AS count FROM crm_academy_workshop_agenda_template_items WHERE template_id = ?',
        [templateId]
      );
      if (Number(itemRows[0]?.count || 0) === 0) {
        for (const [index, item] of template.items.entries()) {
          await connection.execute(
            `INSERT INTO crm_academy_workshop_agenda_template_items
              (template_id, title, kind, planned_duration_seconds, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(0), CURRENT_TIMESTAMP(0))`,
            [templateId, item[0], item[1], item[2] * 60, index + 1]
          );
        }
      }

      if (template.title === templates[0].title) happyFridayTemplateId = templateId;
    }

    if (happyFridayTemplateId) {
      await connection.execute(
        'UPDATE crm_academy_workshops SET agenda_template_id = ? WHERE agenda_template_id IS NULL',
        [happyFridayTemplateId]
      );
    }
  },
};

export default migration;
