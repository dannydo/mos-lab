import { randomUUID } from 'node:crypto';
import type {
  MosBibleProposal,
  MosBibleProposalTier,
  MosBibleQuizQuestion,
  MosBibleQuizSubmissionResult,
} from '@mos-lab/shared';
import type { PrismaClient as CrmPrismaClient } from '../../generated/crm-client/index.js';

const BIBLE_PROPOSALS_CONFIG_KEY = 'MOS_BIBLE_PROPOSALS_REGISTRY';

// Keywords that strictly mandate Danny Do's final approval
const FINANCIAL_AND_LEGAL_KEYWORDS = [
  'tiền',
  'lương',
  'thưởng',
  'tip',
  'bonus',
  'hoa hồng',
  'giá',
  'bảng giá',
  'chiết khấu',
  'pháp lý',
  'hợp đồng',
  'phạt',
  'chính sách nhân sự',
  'tài chính',
  'ngân sách',
  'doanh thu',
];

export const INITIAL_WEEKLY_QUIZ: readonly MosBibleQuizQuestion[] = [
  {
    id: 'quiz-mos-002-sincerity',
    commandmentId: 'MOS-002',
    title: '4 Chìa Khóa Văn Hóa Wings: Vui Vẻ, Ân Cần, Chân Thành, Khoa Học',
    scenario:
      'Một khách quen ghé salon yêu cầu Chuyên Viên nối mi thật dày và dài để đi tiệc tối nay. Tuy nhiên, sau khi kiểm tra, Chuyên Viên thấy sợi mi thật của khách đang bị yếu và rụng nhiều do chu kỳ mi trước. Theo Chìa Khóa "Chân Thành" và "Khoa Học", Chuyên Viên nên ứng xử thế nào?',
    options: [
      {
        key: 'A',
        text: 'Chiều theo ý khách nối dày tối đa để khách vui vẻ đi tiệc và salon đạt doanh thu cao.',
      },
      {
        key: 'B',
        text: 'Từ chối thẳng thừng và yêu cầu khách đi về dưỡng mi mà không cần giải thích thêm.',
      },
      {
        key: 'C',
        text: 'Nói thật tình trạng mi với thái độ ân cần, giải thích rủi ro rụng mi thật theo góc nhìn khoa học, và tư vấn dáng mi nhẹ êm phù hợp nhất để vừa đẹp đi tiệc vừa bảo vệ mắt.',
      },
      {
        key: 'D',
        text: 'Nối một nửa số sợi rồi bảo khách lần sau ghé làm tiếp.',
      },
    ],
    correctKey: 'C',
    explanation:
      'Chân Thành là đặt sức khỏe mi thật và niềm tin lâu dài của khách lên trên hết. Kết hợp cùng Khoa Học để giải thích rõ ràng và tư vấn giải pháp an toàn, bảo vệ vẻ đẹp bền vững cho khách.',
    culturalKey: 'Chân Thành',
    rewardPoints: 10,
  },
  {
    id: 'quiz-tip-001-threshold',
    commandmentId: 'TIP-001',
    title: 'Quy tắc Ngưỡng Tip 20K & Xử lý tiền lẻ (Kinh Thánh mOS)',
    scenario:
      'Khách hàng hoàn tất hóa đơn 300.000đ và đưa 315.000đ, bảo nhân viên không cần thối lại 15.000đ. Theo Điều răn TIP-001 trong Kinh Thánh mOS, số tiền 15.000đ này được hệ thống xử lý như thế nào?',
    options: [
      {
        key: 'A',
        text: 'Không ghi nhận gì cả vì dưới 20.000đ.',
      },
      {
        key: 'B',
        text: 'Được tính là 1 lượt có tip và cộng vào % Tip Rate của salon.',
      },
      {
        key: 'C',
        text: 'Vẫn cộng đủ 15.000đ vào thu nhập của nhân sự (CV, CC, CS), nhưng TUYỆT ĐỐI KHÔNG tính là 1 lượt có tip (không tăng tổng lượt tip).',
      },
      {
        key: 'D',
        text: 'Chuyển toàn bộ 15.000đ vào quỹ công đoàn salon.',
      },
    ],
    correctKey: 'C',
    explanation:
      'Theo Điều răn TIP-001: Tiền lẻ dưới 20k vẫn cộng đủ vào thu nhập nhân sự nhưng không tính là lượt tip để bảo đảm tính chuẩn mực của tỷ lệ phục vụ làm hài lòng khách hàng.',
    culturalKey: 'Khoa Học',
    rewardPoints: 10,
  },
  {
    id: 'quiz-bk-001-productivity',
    commandmentId: 'BK-001',
    title: 'Năng suất tạo lịch Booker (Booked vs Done)',
    scenario:
      'Vào ngày 15/10, bạn Booker tạo một lịch hẹn cho khách đến làm dịch vụ vào ngày 20/10. Theo Điều răn BK-001, chỉ số Booked của bạn Booker này được ghi nhận vào ngày nào?',
    options: [
      {
        key: 'A',
        text: 'Ghi nhận vào ngày 20/10 khi khách đến salon.',
      },
      {
        key: 'B',
        text: 'Ghi nhận vào ngày 15/10 theo ngày tạo đơn (date_created).',
      },
      {
        key: 'C',
        text: 'Chia đôi 50% cho ngày 15/10 và 50% cho ngày 20/10.',
      },
      {
        key: 'D',
        text: 'Chỉ ghi nhận khi khách đã thanh toán xong đơn hàng.',
      },
    ],
    correctKey: 'B',
    explanation:
      'Theo Điều răn BK-001: Năng suất tạo lịch Booked của Booker được tính theo order.date_created (ngày làm ra công việc), không phụ thuộc vào ngày khách thực tế đến salon.',
    culturalKey: 'Khoa Học',
    rewardPoints: 10,
  },
];

export class BibleService {
  /**
   * Determine whether a proposal involves financial, legal, or major policy impact
   */
  static classifyTier(
    title: string,
    summary: string,
    commandments: readonly string[],
    tags: readonly string[]
  ): MosBibleProposalTier {
    const fullText = `${title} ${summary} ${commandments.join(' ')} ${tags.join(' ')}`.toLowerCase();
    const hasFinancialOrLegal = FINANCIAL_AND_LEGAL_KEYWORDS.some((kw) => fullText.includes(kw));
    return hasFinancialOrLegal ? 'DANNY_FINAL' : 'CORE_TEAM';
  }

  /**
   * Read proposals from crmConfig
   */
  static async listProposals(crm: CrmPrismaClient): Promise<MosBibleProposal[]> {
    const record = await crm.crmConfig.findUnique({
      where: { key: BIBLE_PROPOSALS_CONFIG_KEY },
    });
    if (!record?.value) return [];
    try {
      return JSON.parse(record.value) as MosBibleProposal[];
    } catch {
      return [];
    }
  }

  /**
   * Create a new proposal with automated tier classification
   */
  static async createProposal(
    crm: CrmPrismaClient,
    input: {
      book: MosBibleProposal['book'];
      title: string;
      summary: string;
      commandments: string[];
      rationale: string;
      examples?: string[];
      tags: string[];
    },
    staff: { id: number; name: string; role: string }
  ): Promise<MosBibleProposal> {
    const tier = this.classifyTier(input.title, input.summary, input.commandments, input.tags);
    const now = new Date().toISOString();

    const newProposal: MosBibleProposal = {
      id: `prop-${randomUUID().slice(0, 8)}`,
      proposedByStaffId: staff.id,
      proposedByName: staff.name,
      proposedByRole: staff.role,
      tier,
      book: input.book,
      title: input.title.trim(),
      summary: input.summary.trim(),
      commandments: input.commandments.map((c) => c.trim()).filter(Boolean),
      rationale: input.rationale.trim(),
      examples: input.examples?.map((e) => e.trim()).filter(Boolean),
      tags: input.tags.map((t) => t.trim()).filter(Boolean),
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    };

    const existing = await this.listProposals(crm);
    const updated = [newProposal, ...existing];

    await crm.crmConfig.upsert({
      where: { key: BIBLE_PROPOSALS_CONFIG_KEY },
      create: {
        key: BIBLE_PROPOSALS_CONFIG_KEY,
        value: JSON.stringify(updated),
      },
      update: {
        value: JSON.stringify(updated),
      },
    });

    return newProposal;
  }

  /**
   * Approve a proposal with strict tier verification
   */
  static async approveProposal(
    crm: CrmPrismaClient,
    proposalId: string,
    reviewer: { id: number; name: string; role: string }
  ): Promise<{ success: boolean; proposal?: MosBibleProposal; error?: string }> {
    const proposals = await this.listProposals(crm);
    const target = proposals.find((p) => p.id === proposalId);
    if (!target) {
      return { success: false, error: 'Không tìm thấy đề xuất này' };
    }
    if (target.status !== 'PENDING') {
      return { success: false, error: 'Đề xuất này đã được xử lý trước đó' };
    }

    // Verify authority
    const isDanny = reviewer.id === 1 || reviewer.role === 'super_admin';
    const isCoreTeam = ['admin', 'manager', 'director', 'super_admin'].includes(reviewer.role);

    if (target.tier === 'DANNY_FINAL' && !isDanny) {
      return {
        success: false,
        error:
          'Đề xuất này liên quan đến Tiền, Pháp lý hoặc Chính sách cốt lõi; bắt buộc anh Danny Do duyệt bước cuối cùng.',
      };
    }

    if (!isCoreTeam && !isDanny) {
      return {
        success: false,
        error: 'Bạn không có thẩm quyền phê duyệt Điều răn trong Kinh Thánh mOS.',
      };
    }

    const now = new Date().toISOString();
    target.status = 'APPROVED';
    target.reviewedByStaffId = reviewer.id;
    target.reviewedByName = reviewer.name;
    target.reviewedAt = now;
    target.updatedAt = now;

    await crm.crmConfig.update({
      where: { key: BIBLE_PROPOSALS_CONFIG_KEY },
      data: { value: JSON.stringify(proposals) },
    });

    return { success: true, proposal: target };
  }

  /**
   * Reject a proposal with reason
   */
  static async rejectProposal(
    crm: CrmPrismaClient,
    proposalId: string,
    reviewer: { id: number; name: string; role: string },
    note?: string
  ): Promise<{ success: boolean; proposal?: MosBibleProposal; error?: string }> {
    const proposals = await this.listProposals(crm);
    const target = proposals.find((p) => p.id === proposalId);
    if (!target) {
      return { success: false, error: 'Không tìm thấy đề xuất này' };
    }

    const now = new Date().toISOString();
    target.status = 'REJECTED';
    target.reviewedByStaffId = reviewer.id;
    target.reviewedByName = reviewer.name;
    target.reviewedAt = now;
    target.reviewNote = note?.trim();
    target.updatedAt = now;

    await crm.crmConfig.update({
      where: { key: BIBLE_PROPOSALS_CONFIG_KEY },
      data: { value: JSON.stringify(proposals) },
    });

    return { success: true, proposal: target };
  }

  /**
   * Return the weekly quiz question set
   */
  static getWeeklyQuiz(): readonly MosBibleQuizQuestion[] {
    return INITIAL_WEEKLY_QUIZ;
  }

  /**
   * Evaluate a quiz submission
   */
  static evaluateQuizSubmission(
    questionId: string,
    selectedKey: 'A' | 'B' | 'C' | 'D'
  ): MosBibleQuizSubmissionResult | null {
    const question = INITIAL_WEEKLY_QUIZ.find((q) => q.id === questionId);
    if (!question) return null;

    const isCorrect = question.correctKey === selectedKey;
    return {
      questionId,
      selectedKey,
      isCorrect,
      correctKey: question.correctKey,
      explanation: question.explanation,
      culturalKey: question.culturalKey,
      earnedPoints: isCorrect ? question.rewardPoints : 0,
    };
  }
}
