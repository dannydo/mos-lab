import { randomUUID } from 'node:crypto';
import type {
  MosBibleProposal,
  MosBibleProposalTier,
  MosBibleQuizQuestion,
  MosBibleQuizSubmissionResult,
  MosBibleSpeedQuizProfile,
  MosBibleSpeedQuizAnswerItem,
  MosBibleSpeedQuizResult,
} from '@mos-lab/shared';
import type { PrismaClient as CrmPrismaClient } from '../../generated/crm-client/index.js';

const BIBLE_PROPOSALS_CONFIG_KEY = 'MOS_BIBLE_PROPOSALS_REGISTRY';
const BIBLE_BANANA_VAULT_CONFIG_KEY = 'MOS_BIBLE_BANANA_VAULT';

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

export const EXPANDED_BIBLE_QUIZ_POOL: readonly MosBibleQuizQuestion[] = [
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
  {
    id: 'quiz-cv-001-respect-naming',
    commandmentId: 'CV-001',
    title: 'Kỷ luật Ngôn từ & Văn hóa Tôn trọng Nghệ Nhân Wings',
    scenario:
      'Trong giao tiếp nội bộ và trên giao diện mOS, danh xưng nào sau đây là CHUẨN MỰC để gọi đội ngũ kỹ thuật nối mi tại Wings?',
    options: [
      {
        key: 'A',
        text: 'Thợ mi hoặc thợ kỹ thuật.',
      },
      {
        key: 'B',
        text: 'Thợ cứng hoặc tay nghề thợ.',
      },
      {
        key: 'C',
        text: 'Chuyên Viên (CV), Chuyên Viên Tự Chủ (CV+), Nghệ Nhân Mi hoặc Thiên Thần.',
      },
      {
        key: 'D',
        text: 'Nhân viên bậc 1 và bậc 2.',
      },
    ],
    correctKey: 'C',
    explanation:
      'Tại Wings, việc gọi là "thợ" bị xem là thiếu tôn trọng. Toàn bộ đội ngũ là Nghệ nhân, Chuyên Viên và Thiên Thần chăm sóc khách hàng.',
    culturalKey: 'Ân Cần',
    rewardPoints: 10,
  },
  {
    id: 'quiz-mos-002-cheerfulness',
    commandmentId: 'MOS-002',
    title: 'Chìa Khóa "VUI VẺ" trong 4 Chìa Khóa Văn Hóa Wings',
    scenario:
      'Theo định nghĩa của Kinh Thánh Wings, tại sao "Vui Vẻ" là chìa khóa đứng đầu tiên trong 4 chìa khóa văn hóa?',
    options: [
      {
        key: 'A',
        text: 'Vì vui vẻ giúp salon ồn ào và náo nhiệt hơn.',
      },
      {
        key: 'B',
        text: 'Vì Vui Vẻ là khởi nguồn: phải thật sự vui vẻ từ bên trong thì mới có thể ân cần được; nụ cười và năng lượng tích cực là nền tảng.',
      },
      {
        key: 'C',
        text: 'Vì vui vẻ là để chiều lòng quản lý ca làm việc.',
      },
      {
        key: 'D',
        text: 'Vì khách hàng chỉ thích nói chuyện phiếm.',
      },
    ],
    correctKey: 'B',
    explanation:
      'VUI VẺ là khởi nguồn. Không có niềm vui tự nhiên bên trong thì mọi hành vi ân cần đều trở nên gượng gạo và giả tạo.',
    culturalKey: 'Vui Vẻ',
    rewardPoints: 10,
  },
  {
    id: 'quiz-mos-002-caring',
    commandmentId: 'MOS-002',
    title: 'Chìa Khóa "ÂN CẦN" trong 4 Chìa Khóa Văn Hóa Wings',
    scenario: 'Hành động nào sau đây thể hiện đúng tinh thần "ÂN CẦN" tinh tế tại Wings Lashes?',
    options: [
      {
        key: 'A',
        text: 'Hỏi han dồn dập ngay cả khi khách đang muốn chợp mắt nghỉ ngơi.',
      },
      {
        key: 'B',
        text: 'Tinh tế quan sát chỉnh gối nằm, đắp chăn ấm nhẹ nhàng cho khách và điều chỉnh ánh đèn dịu mắt.',
      },
      {
        key: 'C',
        text: 'Liên tục giới thiệu các gói dịch vụ đắt tiền nhất trong suốt buổi làm.',
      },
      {
        key: 'D',
        text: 'Làm thật nhanh để khách ra về sớm.',
      },
    ],
    correctKey: 'B',
    explanation:
      'ÂN CẦN là tinh tế chăm chút từng nhu cầu nhỏ nhất của khách hàng một cách tự nhiên, tạo cảm giác được nâng niu và tôn trọng.',
    culturalKey: 'Ân Cần',
    rewardPoints: 10,
  },
  {
    id: 'quiz-mos-002-science',
    commandmentId: 'MOS-002',
    title: 'Chìa Khóa "KHOA HỌC" trong 4 Chìa Khóa Văn Hóa Wings',
    scenario:
      'Một salon làm việc rất vui vẻ, ân cần nhưng lượng khách quay lại sụt giảm. Theo Chìa Khóa "KHOA HỌC", đội ngũ quản lý nên làm gì?',
    options: [
      {
        key: 'A',
        text: 'Tiếp tục vui vẻ và tin rằng mọi thứ rồi sẽ tự tốt lên.',
      },
      {
        key: 'B',
        text: 'Xem xét số liệu thực tế trên mOS: tỷ lệ rụng mi, thời gian dặm mi, conversion, và tỷ lệ quay lại để tìm ra nguyên nhân cốt lõi và cải tiến kỹ thuật.',
      },
      {
        key: 'C',
        text: 'Đổ lỗi cho mùa thấp điểm và không cần đo lường gì thêm.',
      },
      {
        key: 'D',
        text: 'Tăng chi phí quảng cáo để bù đắp số khách không quay lại.',
      },
    ],
    correctKey: 'B',
    explanation:
      'KHOA HỌC là thước đo thực tế chứng minh tổ chức đi đúng hướng. Không tự huyễn hoặc theo cảm xúc, luôn dựa trên dữ liệu chuẩn xác của mOS.',
    culturalKey: 'Khoa Học',
    rewardPoints: 10,
  },
  {
    id: 'quiz-cs-001-golden-hour',
    commandmentId: 'CS-001',
    title: 'Thời điểm Vàng Chăm sóc Khách hàng sau dịch vụ nối mi',
    scenario:
      'Sau khi khách hoàn thành dịch vụ nối mi tại salon, thời điểm vàng để Chuyên Viên CS nhắn tin/gọi điện hỏi thăm độ êm và tình trạng mi là khi nào?',
    options: [
      {
        key: 'A',
        text: 'Ngay sau khi khách bước chân ra khỏi cửa salon 5 phút.',
      },
      {
        key: 'B',
        text: 'Sau 1 tháng khi mi đã rụng gần hết.',
      },
      {
        key: 'C',
        text: 'Trong vòng 24 đến 48 giờ sau dịch vụ, khi khách đã trải nghiệm sinh hoạt và rửa mặt với bộ mi mới.',
      },
      {
        key: 'D',
        text: 'Chỉ hỏi thăm khi khách chủ động nhắn tin phàn nàn.',
      },
    ],
    correctKey: 'C',
    explanation:
      '24 - 48 giờ là thời điểm vàng để nắm bắt kịp thời cảm nhận của khách, hướng dẫn cách dưỡng mi và hỗ trợ chỉnh dặm nếu có sợi chưa quen mắt.',
    culturalKey: 'Ân Cần',
    rewardPoints: 10,
  },
  {
    id: 'quiz-cc-001-split-rule',
    commandmentId: 'CC-001',
    title: 'Quy tắc Thưởng CC Tip 20% khi CC In khác CC Out',
    scenario:
      'Đơn hàng có 100.000đ tiền tip từ khách. Bạn CC In tiếp đón và bạn CC Out thanh toán là 2 người khác nhau. Hệ thống mOS chia khoản 20% Thưởng CC Tip (20.000đ) như thế nào?',
    options: [
      {
        key: 'A',
        text: 'Toàn bộ 20.000đ thuộc về CC In vì có công đón tiếp ban đầu.',
      },
      {
        key: 'B',
        text: 'Toàn bộ 20.000đ thuộc về CC Out vì có công thanh toán chốt tiền.',
      },
      {
        key: 'C',
        text: 'Tự động chia đôi 50/50: Mỗi bạn CC nhận 10.000đ (10% tip share).',
      },
      {
        key: 'D',
        text: 'Hủy khoản thưởng CC vì không cùng 1 người phụ trách.',
      },
    ],
    correctKey: 'C',
    explanation:
      'Theo Kinh Thánh mOS: Khi CC In khác CC Out, khoản thưởng CC Tip 20% bắt buộc chia 50/50 để bảo đảm công bằng và tinh thần phối hợp đồng đội.',
    culturalKey: 'Khoa Học',
    rewardPoints: 10,
  },
  {
    id: 'quiz-drawer-001-ui-rule',
    commandmentId: 'UI-007',
    title: 'Quy chuẩn Đóng Drawer trong hệ thống mOS (UI Invariant)',
    scenario:
      'Theo quy chuẩn giao diện mOS UI-007, nút đóng [✕] của tất cả Drawer trong hệ thống bắt buộc phải đặt ở vị trí nào?',
    options: [
      {
        key: 'A',
        text: 'Ở góc trên bên trái, đứng trước tiêu đề Drawer.',
      },
      {
        key: 'B',
        text: 'Ở góc trên bên phải (closable: { placement: "end" }), tiêu đề luôn neo ở góc trên bên trái.',
      },
      {
        key: 'C',
        text: 'Ở thanh footer dưới cùng bên trái.',
      },
      {
        key: 'D',
        text: 'Không cần nút đóng, chỉ bấm ra ngoài để thoát.',
      },
    ],
    correctKey: 'B',
    explanation:
      'UI Invariant mOS quy định nút đóng [✕] bắt buộc nằm ở góc trên bên phải (placement: end) để đồng bộ trải nghiệm thị giác của người dùng.',
    culturalKey: 'Khoa Học',
    rewardPoints: 10,
  },
  {
    id: 'quiz-sec-001-privacy',
    commandmentId: 'SEC-001',
    title: 'Bảo mật Dữ liệu Khách hàng & Tôn trọng Quyền riêng tư',
    scenario:
      'Một người quen nhờ bạn tra số điện thoại và lịch sử dịch vụ của một khách hàng VIP trên mOS. Bạn nên xử lý thế nào?',
    options: [
      {
        key: 'A',
        text: 'Chụp màn hình gửi ngay vì là bạn bè thân thiết.',
      },
      {
        key: 'B',
        text: 'Từ chối dứt khoát vì dữ liệu khách hàng là tài sản bảo mật tối cao của salon và quyền riêng tư của khách.',
      },
      {
        key: 'C',
        text: 'Thu phí dịch vụ tra cứu rồi cung cấp thông tin.',
      },
      {
        key: 'D',
        text: 'Đọc số điện thoại qua miệng nhưng không gửi tin nhắn.',
      },
    ],
    correctKey: 'B',
    explanation:
      'Dữ liệu khách hàng tại Wings được bảo mật nghiêm ngặt. Nghiêm cấm mọi hành vi rò rỉ, tra cứu ngoài mục đích phục vụ khách tại salon.',
    culturalKey: 'Chân Thành',
    rewardPoints: 10,
  },
  {
    id: 'quiz-retry-001-complaint',
    commandmentId: 'MOS-002',
    title: 'Xử lý Khách chưa hài lòng với Tinh thần Ân Cần & Chân Thành',
    scenario:
      'Khách nhắn tin phản ánh mi bị vướng sau 1 ngày làm dịch vụ. Phản hồi chuẩn mực của Chuyên Viên CS là gì?',
    options: [
      {
        key: 'A',
        text: 'Giải thích là do khách rửa mặt sai cách và không hỗ trợ gì thêm.',
      },
      {
        key: 'B',
        text: 'Lắng nghe với thái độ ân cần, chân thành xin lỗi vì sự bất tiện của khách, và mời khách ghé salon để Chuyên Viên kiểm tra chỉnh sửa miễn phí ngay.',
      },
      {
        key: 'C',
        text: 'Bỏ qua tin nhắn đợi khách tự hết khó chịu.',
      },
      {
        key: 'D',
        text: 'Đổ lỗi cho Chuyên Viên làm ca hôm đó.',
      },
    ],
    correctKey: 'B',
    explanation:
      'Khách phản ánh là cơ hội để thể hiện sự ân cần và chân thành vượt trội. Luôn đón nhận với nụ cười và hành động giải quyết thực chất.',
    culturalKey: 'Ân Cần',
    rewardPoints: 10,
  },
];

export const INITIAL_WEEKLY_QUIZ: readonly MosBibleQuizQuestion[] = EXPANDED_BIBLE_QUIZ_POOL.slice(0, 3);

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
    const question = EXPANDED_BIBLE_QUIZ_POOL.find((q) => q.id === questionId);
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

  /**
   * Get today string in Asia/Ho_Chi_Minh timezone (YYYY-MM-DD)
   */
  static getTodayDateStr(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  }

  /**
   * Get Speed Quiz & Banana Vault Profile for a staff member
   */
  static async getSpeedQuizProfile(crm: CrmPrismaClient, staffId: number): Promise<MosBibleSpeedQuizProfile> {
    const today = this.getTodayDateStr();
    const record = await crm.crmConfig.findUnique({
      where: { key: BIBLE_BANANA_VAULT_CONFIG_KEY },
    });

    let vault: Record<
      number,
      {
        date: string;
        attemptsToday: number;
        purchasedAttemptsToday?: number;
        purchasedRunsAvailable?: number;
        bananasToday: number;
        totalBananas: number;
        streakBest: number;
      }
    > = {};
    if (record?.value) {
      try {
        vault = JSON.parse(record.value);
      } catch {
        vault = {};
      }
    }

    const staffData = vault[staffId];
    if (!staffData || staffData.date !== today) {
      // New day or first time
      const totalBananas = staffData?.totalBananas || 0;
      return {
        staffId,
        date: today,
        attemptsToday: 0,
        maxAttemptsPerDay: 3,
        purchasedAttemptsToday: 0,
        maxPurchasedAttemptsPerDay: 3,
        purchasedRunsAvailable: 0,
        bananasToday: 0,
        maxBananasPerDay: 6,
        totalBananas,
        canPlayToday: true,
        canPurchaseAttempt: false,
        streakBest: staffData?.streakBest || 0,
      };
    }

    const attemptsToday = staffData.attemptsToday || 0;
    const purchasedAttemptsToday = staffData.purchasedAttemptsToday || 0;
    const purchasedRunsAvailable = staffData.purchasedRunsAvailable || 0;
    const totalBananas = staffData.totalBananas || 0;

    const canPlayToday = attemptsToday < 3 || purchasedRunsAvailable > 0;
    const canPurchaseAttempt =
      attemptsToday >= 3 && purchasedAttemptsToday < 3 && totalBananas >= 1 && purchasedRunsAvailable === 0;

    return {
      staffId,
      date: today,
      attemptsToday,
      maxAttemptsPerDay: 3,
      purchasedAttemptsToday,
      maxPurchasedAttemptsPerDay: 3,
      purchasedRunsAvailable,
      bananasToday: staffData.bananasToday || 0,
      maxBananasPerDay: 6,
      totalBananas,
      canPlayToday,
      canPurchaseAttempt,
      streakBest: staffData.streakBest || 0,
    };
  }

  /**
   * Buy an additional Speed Quiz attempt using 1 Banana
   */
  static async buySpeedQuizAttempt(
    crm: CrmPrismaClient,
    staffId: number
  ): Promise<{ success: boolean; profile?: MosBibleSpeedQuizProfile; error?: string }> {
    const today = this.getTodayDateStr();
    const profile = await this.getSpeedQuizProfile(crm, staffId);

    if (profile.attemptsToday < 3) {
      return {
        success: false,
        error: 'Bạn vẫn còn lượt chơi miễn phí trong ngày, chưa cần dùng Chuối để mua thêm lượt.',
      };
    }

    if (profile.purchasedAttemptsToday >= 3) {
      return {
        success: false,
        error: 'Bạn đã đạt giới hạn mua tối đa 3 lượt chơi trong ngày hôm nay.',
      };
    }

    if (profile.totalBananas < 1) {
      return {
        success: false,
        error: 'Ví của bạn không đủ Chuối để mua thêm lượt (cần tối thiểu 1 🍌).',
      };
    }

    if (profile.purchasedRunsAvailable > 0) {
      return {
        success: false,
        error: 'Bạn đang có lượt mua chưa chơi. Hãy hoàn tất lượt này trước khi mua tiếp nhé!',
      };
    }

    const record = await crm.crmConfig.findUnique({
      where: { key: BIBLE_BANANA_VAULT_CONFIG_KEY },
    });
    let vault: Record<
      number,
      {
        date: string;
        attemptsToday: number;
        purchasedAttemptsToday?: number;
        purchasedRunsAvailable?: number;
        bananasToday: number;
        totalBananas: number;
        streakBest: number;
      }
    > = {};
    if (record?.value) {
      try {
        vault = JSON.parse(record.value);
      } catch {
        vault = {};
      }
    }

    const staffData = vault[staffId] || {
      date: today,
      attemptsToday: profile.attemptsToday,
      purchasedAttemptsToday: 0,
      purchasedRunsAvailable: 0,
      bananasToday: profile.bananasToday,
      totalBananas: profile.totalBananas,
      streakBest: profile.streakBest,
    };

    staffData.date = today;
    staffData.totalBananas = Math.max(0, staffData.totalBananas - 1);
    staffData.purchasedAttemptsToday = (staffData.purchasedAttemptsToday || 0) + 1;
    staffData.purchasedRunsAvailable = (staffData.purchasedRunsAvailable || 0) + 1;

    vault[staffId] = staffData;

    await crm.crmConfig.upsert({
      where: { key: BIBLE_BANANA_VAULT_CONFIG_KEY },
      create: {
        key: BIBLE_BANANA_VAULT_CONFIG_KEY,
        value: JSON.stringify(vault),
      },
      update: {
        value: JSON.stringify(vault),
      },
    });

    const updatedProfile = await this.getSpeedQuizProfile(crm, staffId);
    return { success: true, profile: updatedProfile };
  }

  /**
   * Get random questions for a Speed Quiz run (Default 5 questions per run)
   */
  static getSpeedQuizQuestions(count = 5): readonly MosBibleQuizQuestion[] {
    const shuffled = [...EXPANDED_BIBLE_QUIZ_POOL].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  /**
   * Submit a Speed Quiz run and evaluate streak / bananas
   * Rule: 3 continuous correct = 1 Banana, 5 continuous correct = 2 Bananas
   */
  static async submitSpeedQuizRun(
    crm: CrmPrismaClient,
    staffId: number,
    answers: MosBibleSpeedQuizAnswerItem[]
  ): Promise<{ success: boolean; data?: MosBibleSpeedQuizResult; error?: string }> {
    const profile = await this.getSpeedQuizProfile(crm, staffId);

    const isFreeRun = profile.attemptsToday < 3;
    const isPurchasedRun = !isFreeRun && profile.purchasedRunsAvailable > 0;

    if (!isFreeRun && !isPurchasedRun) {
      if (profile.purchasedAttemptsToday >= 3) {
        return {
          success: false,
          error:
            'Bạn đã hoàn tất tối đa 3 lượt miễn phí và 3 lượt mua trong ngày hôm nay. Hẹn gặp lại vào ngày mai nhé!',
        };
      }
      return {
        success: false,
        error: 'Bạn đã hoàn tất tối đa 3 lượt miễn phí hôm nay. Bạn có thể dùng 1 🍌 để mua thêm lượt chơi!',
      };
    }

    let currentStreak = 0;
    let correctCount = 0;

    for (const answer of answers) {
      const q = EXPANDED_BIBLE_QUIZ_POOL.find((item) => item.id === answer.questionId);
      if (!q) continue;

      // Allow 10s + 2s network/render grace period (12000ms)
      const inTime = answer.durationMs <= 12000;
      const isCorrect = q.correctKey === answer.selectedKey;

      if (isCorrect && inTime) {
        currentStreak += 1;
        correctCount += 1;
      } else {
        // Sudden death! Streak terminates
        break;
      }
    }

    const bananasEarned = currentStreak >= 5 ? 2 : currentStreak >= 3 ? 1 : 0;
    const actualBananasAwarded = isFreeRun
      ? Math.min(bananasEarned, Math.max(0, 6 - profile.bananasToday))
      : bananasEarned;

    const today = this.getTodayDateStr();
    const record = await crm.crmConfig.findUnique({
      where: { key: BIBLE_BANANA_VAULT_CONFIG_KEY },
    });
    let vault: Record<
      number,
      {
        date: string;
        attemptsToday: number;
        purchasedAttemptsToday?: number;
        purchasedRunsAvailable?: number;
        bananasToday: number;
        totalBananas: number;
        streakBest: number;
      }
    > = {};
    if (record?.value) {
      try {
        vault = JSON.parse(record.value);
      } catch {
        vault = {};
      }
    }

    const staffData = vault[staffId] || {
      date: today,
      attemptsToday: 0,
      purchasedAttemptsToday: 0,
      purchasedRunsAvailable: 0,
      bananasToday: 0,
      totalBananas: 0,
      streakBest: 0,
    };

    staffData.date = today;
    if (isFreeRun) {
      staffData.attemptsToday = (staffData.attemptsToday || 0) + 1;
    } else {
      staffData.purchasedRunsAvailable = Math.max(0, (staffData.purchasedRunsAvailable || 1) - 1);
    }

    staffData.bananasToday = (staffData.bananasToday || 0) + actualBananasAwarded;
    staffData.totalBananas = (staffData.totalBananas || 0) + actualBananasAwarded;
    staffData.streakBest = Math.max(staffData.streakBest || 0, currentStreak);

    vault[staffId] = staffData;

    await crm.crmConfig.upsert({
      where: { key: BIBLE_BANANA_VAULT_CONFIG_KEY },
      create: {
        key: BIBLE_BANANA_VAULT_CONFIG_KEY,
        value: JSON.stringify(vault),
      },
      update: {
        value: JSON.stringify(vault),
      },
    });

    const updatedProfile = await this.getSpeedQuizProfile(crm, staffId);

    let message: string;
    if (isPurchasedRun) {
      if (currentStreak >= 5) {
        message = '🏆 Đỉnh cao tuyệt đối! Bạn đúng liên tục 5 câu, nhận trọn vẹn 2 🍌 (Lãi ròng +1 Chuối)!';
      } else if (currentStreak >= 3) {
        message = `🍌 Rất tốt! Bạn đạt chuỗi ${currentStreak} câu đúng, nhận 1 🍌 (Hoàn vốn 1 Chuối đã mua)!`;
      } else {
        message = `Tiếc quá! Chuỗi đúng ${currentStreak} câu (chưa đạt mốc 3 câu). Bạn không nhận được Chuối cho lượt mua này. Hãy cố gắng lần sau nhé!`;
      }
    } else {
      if (currentStreak >= 5) {
        message = `🏆 Đỉnh cao tuyệt đối! Bạn đã trả lời đúng liên tục 5 câu hỏi và rinh trọn vẹn +${actualBananasAwarded} Chuối 🍌!`;
      } else if (currentStreak >= 3) {
        message = `🍌 Xuất sắc! Bạn đã vượt mốc 3 câu đúng liên tục và nhận được +${actualBananasAwarded} Chuối 🍌!`;
      } else {
        message = `Cố gắng hơn ở lượt sau nhé! Bạn đạt chuỗi ${currentStreak} câu đúng (cần từ 3 câu liên tục để nhận 1 Chuối 🍌).`;
      }
    }

    return {
      success: true,
      data: {
        streak: currentStreak,
        correctCount,
        totalAnswered: answers.length,
        bananasEarned: actualBananasAwarded,
        profile: updatedProfile,
        message,
      },
    };
  }
}
