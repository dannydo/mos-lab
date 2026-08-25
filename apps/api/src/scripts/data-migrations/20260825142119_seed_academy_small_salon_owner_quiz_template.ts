import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const templateTitle = 'Nỗi khổ cô chủ tiệm mi nhỏ';
const templateDescription =
  '5 câu rất dễ hiểu: cô vắng là tiệm rối, không rõ tiền, mất khách, mất nhân viên và sợ mở thêm tiệm.';

const questions = [
  {
    prompt: 'Bạn nghỉ 1 ngày, tiệm có chạy không?',
    options: [
      'Không. Khách nhắn, khách tới, nhân viên hỏi gì cũng chờ bạn',
      'Có. Mọi thứ tự chạy',
      'Khách tự quay lại',
      'Tiền tự vào tài khoản',
    ],
  },
  {
    prompt: 'Cuối ngày, điều nào làm bạn lo nhất?',
    options: [
      'Không biết hôm nay lời hay lỗ, khách nào sắp mất',
      'Mọi số đều rõ',
      'Khách tự hẹn lại',
      'Nhân viên tự báo cáo',
    ],
  },
  {
    prompt: 'Khách làm xong rồi không quay lại, thường vì sao?',
    options: [
      'Không ai nhớ để hỏi thăm và nhắc lịch khách',
      'Vì tiệm chăm khách quá kỹ',
      'Vì khách được tặng quà',
      'Vì có CRM nhắc khách',
    ],
  },
  {
    prompt: 'Nhân viên hay chán, hay nghỉ, vì sao?',
    options: [
      'Làm tốt hay không cũng vậy: không có mục tiêu, thưởng rõ',
      'Có đường học và lên nghề',
      'Được ghi nhận đúng lúc',
      'Biết mình cần làm gì',
    ],
  },
  {
    prompt: 'Bạn muốn mở thêm tiệm nhưng sợ điều gì nhất?',
    options: [
      'Mở thêm rồi bạn vẫn phải có mặt ở cả hai tiệm mới chạy',
      'Việc gì cũng xem được trên app',
      'Nhân viên làm cùng một cách',
      'Có sẵn người đào tạo',
    ],
  },
] as const;

const migration: DataMigration = {
  id: '20260825142119_seed_academy_small_salon_owner_quiz_template',
  description: 'Add the five-question Academy template for small eyelash salon owners.',
  async preflight(connection) {
    const [existingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id
       FROM crm_academy_workshop_quizzes
       WHERE workshop_id IS NULL
         AND is_template = 1
         AND title = ?
       LIMIT 1`,
      [templateTitle]
    );

    if (existingRows.length > 0) {
      throw new Error(`Quiz template already exists: ${templateTitle}`);
    }
  },
  async up(connection) {
    const [templateResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO crm_academy_workshop_quizzes
        (workshop_id, title, description, is_template, status, created_at, updated_at)
       VALUES (NULL, ?, ?, 1, 'DRAFT', CURRENT_TIMESTAMP(0), CURRENT_TIMESTAMP(0))`,
      [templateTitle, templateDescription]
    );
    const templateId = templateResult.insertId;

    for (const [questionIndex, question] of questions.entries()) {
      const [questionResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO crm_academy_workshop_quiz_questions
          (quiz_id, type, prompt, duration_seconds, sort_order, reward_rule, fastest_count, reward_quantity, created_at, updated_at)
         VALUES (?, 'SINGLE_CHOICE', ?, 20, ?, 'NONE', 1, 1, CURRENT_TIMESTAMP(0), CURRENT_TIMESTAMP(0))`,
        [templateId, question.prompt, questionIndex + 1]
      );

      for (const [optionIndex, label] of question.options.entries()) {
        await connection.execute(
          `INSERT INTO crm_academy_workshop_quiz_options
            (question_id, label, is_correct, sort_order)
           VALUES (?, ?, ?, ?)`,
          [questionResult.insertId, label, optionIndex === 0 ? 1 : 0, optionIndex + 1]
        );
      }
    }
  },
};

export default migration;
