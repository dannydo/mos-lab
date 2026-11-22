import type { PilotSession } from '@mos-lab/shared';

export interface PilotAssessmentCertSopDetailProps {
  onBack?: () => void;
  sessions?: PilotSession[];
  onOpenSessionFlow?: (session: PilotSession) => void;
}

export type AssessmentSopTabKey = 'exam' | 'csat' | 'cert';

// Model tiêu chuẩn chấm điểm thực hành
export interface PracticalExamCriterion {
  id: string;
  name: string;
  maxScore: number;
  weightPercent: number;
  isElimination: boolean; // Tiêu chí tiên quyết / loại trừ
  description: string;
  passCondition: string;
  failCondition: string;
}

// Model hồ sơ sát hạch Chuyên Viên
export interface TechnicianAssessmentRecord {
  id: string;
  technicianName: string;
  branch: string;
  examDate: string;
  trainer: string; // Cô Giang Đàm
  examiner: string; // CEO Danny Đỗ
  theoryScore: number; // Thang 100, chuẩn >= 80
  practicalScores: Record<string, number>; // Map criterion id -> score
  practicalTotalScore: number; // Tổng điểm thực hành (thang 100)
  isEliminationViolated: boolean;
  status: 'PASSED' | 'FAILED' | 'PENDING';
  examinerNotes: string;
  evidenceNote: string;
  certificateCode?: string;
  certificateIssuedAt?: string;
  certificateApproved: boolean;
}

export interface CsatMetrics {
  totalRated: number;
  avgScore: number;
  fiveStarCount: number;
  fourStarCount: number;
  threeStarCount: number;
  satisfactionRate: number;
  isTargetMet: boolean;
  ratedSessions: PilotSession[];
}

export interface PilotCustomerReviewItem {
  id: string;
  customerLabel: string;
  ratingDisplay: string;
  quote: string;
  technicianLabel: string;
  sessionMeta: string;
}

// Danh mục 5 tiêu chí chấm điểm thực hành chuẩn mực
export const PRACTICAL_CRITERIA_LIST: PracticalExamCriterion[] = [
  {
    id: 'crit-safety',
    name: 'An toàn giác mạc & Vệ sinh vô trùng',
    maxScore: 25,
    weightPercent: 25,
    isElimination: true,
    description:
      'Tiêu chuẩn tiên quyết bắt buộc. Dán đệm gel bảo vệ mắt chuẩn xác, không để hóa chất uốn/nhuộm lem vào niêm mạc mắt hay khóe mắt dù chỉ 1 giọt.',
    passCondition: 'Mắt khách không cay, không đỏ, đệm mi khô ráo, dụng cụ khử khuẩn đúng quy trình chuẩn y tế.',
    failCondition: 'Thuốc lem vào mắt gây cay đỏ hoặc dán đệm mi chạm sát giác mạc. (LOẠI TRỰC TIẾP DÙ TỔNG ĐIỂM CAO).',
  },
  {
    id: 'crit-shield',
    name: 'Kỹ thuật chọn trục & Căn nẹp mi ôm đỉnh',
    maxScore: 25,
    weightPercent: 25,
    isElimination: false,
    description:
      'Chọn đúng size trục silicon cá heo (S/M/L) theo phom mắt. Sợi mi được trải thẳng song song, không chéo chân mi, đầu ngọn ôm qua đỉnh trục ít nhất 2mm.',
    passCondition: '100% sợi mi bám dính thẳng hàng, khoảng cách chân mi đều đặn 0.5–1mm, không bị vặn xoắn.',
    failCondition: 'Sợi mi đan chéo, ngọn mi bị gập đỉnh hoặc mi quá ngắn nhưng vẫn cố ép lên trục sai kích cỡ.',
  },
  {
    id: 'crit-timing',
    name: 'Kiểm soát hóa chất & Canh thời gian ủ chuẩn',
    maxScore: 20,
    weightPercent: 20,
    isElimination: false,
    description:
      'Định lượng chuẩn thuốc số 1 & số 2. Canh bấm giờ chính xác từng giây theo chất mi (mảnh: 12-14p, thường: 15-18p, thô cứng: 18-20p). Thử độ mềm sợi mi đúng kỹ thuật.',
    passCondition: 'Thuốc thoa chuẩn vùng 2/3 thân mi, kiểm tra sợi mi đàn hồi mềm mại đúng lúc, căn giờ chuẩn xác.',
    failCondition: 'Để quá giờ làm sun ngọn mi hoặc thuốc chạm trực tiếp vào chân mi/da mi mắt.',
  },
  {
    id: 'crit-result',
    name: 'Độ cong hoàn thiện & Hiệu ứng bóng đen tự nhiên',
    maxScore: 20,
    weightPercent: 20,
    isElimination: false,
    description:
      'Thẩm định kết quả nếp cong thành phẩm sau khi phủ tinh chất bóng đen chuyên sâu. Mi cong vút đều đặn từ gốc đến ngọn, sợi mi óng ả, tơi mềm.',
    passCondition: 'Sóng mi bay đều 2 mắt, độ cong mượt mà, ánh đen bóng khỏe khoắn, không bết dính keo thừa.',
    failCondition: 'Hai bên mắt cong không đều, ngọn mi khô giòn hoặc còn sót keo định hình loang lổ.',
  },
  {
    id: 'crit-conduct',
    name: 'Tác phong Chuyên Viên & Hướng dẫn kiêng cữ 72h',
    maxScore: 10,
    weightPercent: 10,
    isElimination: false,
    description:
      'Thao tác nhẹ nhàng êm ái, tương tác chuyên nghiệp, tư vấn dặn dò khách hàng kỹ lưỡng về việc kiêng nước 4 giờ và cách chải dưỡng mi bóng tối tại nhà.',
    passCondition: 'Khách cảm thấy thư thái thoải mái trong suốt ca làm, nhận đủ hướng dẫn bảo dưỡng mi chi tiết.',
    failCondition: 'Thao tác giật giật mạnh tay, thiếu lời dặn dò kiêng cữ sau uốn.',
  },
];

// Dữ liệu ban đầu các Chuyên Viên đã tham gia sát hạch
export const INITIAL_TECHNICIAN_RECORDS: TechnicianAssessmentRecord[] = [
  {
    id: 'tech-01',
    technicianName: 'Chuyên Viên Cẩm Tiên',
    branch: 'Chi nhánh Quận 1 (Hai Bà Trưng)',
    examDate: '20/10/2026',
    trainer: 'Cô Giang Đàm (Master Trainer)',
    examiner: 'CEO Danny Đỗ',
    theoryScore: 94,
    practicalScores: {
      'crit-safety': 25,
      'crit-shield': 24,
      'crit-timing': 19,
      'crit-result': 19,
      'crit-conduct': 10,
    },
    practicalTotalScore: 97,
    isEliminationViolated: false,
    status: 'PASSED',
    examinerNotes: 'Thao tác tay cực kỳ chuẩn xác, căn trục cá heo rất đều. Mi mẫu lên phom cong chuẩn C-curl óng ả.',
    evidenceNote: 'Đã hoàn thành xuất sắc 3 ca mẫu thực tế, hình ảnh Before/After lưu trữ đầy đủ trong hồ sơ SOP.',
    certificateCode: 'WINGS-DL-2026-001',
    certificateIssuedAt: '20/10/2026',
    certificateApproved: true,
  },
  {
    id: 'tech-02',
    technicianName: 'Chuyên Viên Như Ý',
    branch: 'Chi nhánh Bình Thạnh (Võ Oanh)',
    examDate: '22/10/2026',
    trainer: 'Cô Giang Đàm (Master Trainer)',
    examiner: 'CEO Danny Đỗ',
    theoryScore: 88,
    practicalScores: {
      'crit-safety': 25,
      'crit-shield': 22,
      'crit-timing': 18,
      'crit-result': 18,
      'crit-conduct': 9,
    },
    practicalTotalScore: 92,
    isEliminationViolated: false,
    status: 'PASSED',
    examinerNotes: 'Kỹ thuật an toàn giác mạc rất vững. Căn chỉnh sợi mi gọn gàng, độ phủ bóng mi đạt chuẩn mực cao.',
    evidenceNote:
      'Ca mẫu khách uốn mi mi dày, thời gian ủ 17 phút kiểm soát đàn hồi tốt. Chờ CEO phê duyệt cấp chứng chỉ.',
    certificateCode: 'WINGS-DL-2026-002',
    certificateIssuedAt: '25/10/2026',
    certificateApproved: false, // Chờ CEO Danny ký duyệt
  },
  {
    id: 'tech-03',
    technicianName: 'Chuyên Viên Minh Thư',
    branch: 'Chi nhánh Quận 7 (Phú Mỹ Hưng)',
    examDate: '24/10/2026',
    trainer: 'Cô Giang Đàm (Master Trainer)',
    examiner: 'CEO Danny Đỗ',
    theoryScore: 82,
    practicalScores: {
      'crit-safety': 24,
      'crit-shield': 18,
      'crit-timing': 15,
      'crit-result': 14,
      'crit-conduct': 8,
    },
    practicalTotalScore: 79,
    isEliminationViolated: false,
    status: 'FAILED',
    examinerNotes:
      'Kỹ thuật căn trục silicon chưa ôm khít, ngọn mi mắt trái còn hơi lệch hướng. Cần rèn luyện thêm 2 ca mẫu.',
    evidenceNote: 'Yêu cầu Cô Giang Đàm bồi dưỡng thêm kỹ thuật vuốt keo định hình trước khi đăng ký sát hạch đợt 2.',
    certificateApproved: false,
  },
  {
    id: 'tech-04',
    technicianName: 'Chuyên Viên Thùy Trang',
    branch: 'Chi nhánh Quận 3 (Nguyễn Đình Chiểu)',
    examDate: '26/10/2026',
    trainer: 'Cô Giang Đàm (Master Trainer)',
    examiner: 'CEO Danny Đỗ',
    theoryScore: 90,
    practicalScores: {
      'crit-safety': 25,
      'crit-shield': 23,
      'crit-timing': 18,
      'crit-result': 19,
      'crit-conduct': 9,
    },
    practicalTotalScore: 94,
    isEliminationViolated: false,
    status: 'PASSED',
    examinerNotes: 'Tay nghề thuần thục, giải thích cho khách rất tận tâm. Kết quả uốn mi bóng đen mướt đẹp.',
    evidenceNote: 'Video kiểm tra thao tác xếp mi đạt yêu cầu chuẩn mực của hội đồng chuyên môn.',
    certificateCode: 'WINGS-DL-2026-003',
    certificateIssuedAt: '26/10/2026',
    certificateApproved: false, // Chờ duyệt
  },
  {
    id: 'tech-giang-ho',
    technicianName: 'Chuyên Viên Giang Hồ',
    branch: 'Chi nhánh Đề Thám (Quận 1)',
    examDate: '31/10/2026',
    trainer: 'Cô Giang Đàm (Master Trainer)',
    examiner: 'CEO Danny Đỗ',
    theoryScore: 92,
    practicalScores: {
      'crit-safety': 25,
      'crit-shield': 24,
      'crit-timing': 19,
      'crit-result': 19,
      'crit-conduct': 9,
    },
    practicalTotalScore: 96,
    isEliminationViolated: false,
    status: 'PASSED',
    examinerNotes:
      'Thao tác dán trục silicone 90° rất chuẩn, sợi mi tơi đều không bắt chéo. Thời gian hoàn thành 64 phút, 0 lỗi kỹ thuật.',
    evidenceNote:
      'Đã hoàn thành xuất sắc 4 buổi thực hành 26-30/10 tại Đề Thám. Đạt chuẩn KTV Chính Thức ngày 31/10/2026.',
    certificateCode: 'WINGS-DL-2026-004-GH',
    certificateIssuedAt: '31/10/2026',
    certificateApproved: false, // Chờ CEO Danny ký duyệt
  },
];

export const PILOT_CUSTOMER_REVIEWS: PilotCustomerReviewItem[] = [
  {
    id: 'review-18',
    customerLabel: 'Khách Nguyệt (0903***782)',
    ratingDisplay: '5.0',
    quote:
      'Mi uốn xong cong mềm tự nhiên lắm em ơi, mắt không bị cộm hay cay chút nào. Độ bóng đen nhìn mi dày hơn hẳn.',
    technicianLabel: 'Chuyên Viên: CV Cẩm Tiên',
    sessionMeta: 'Ca Pilot #18 • Ngày 27/10/2026',
  },
  {
    id: 'review-15',
    customerLabel: 'Khách Thanh Tâm (0918***445)',
    ratingDisplay: '5.0',
    quote:
      'Dịch vụ rất chu đáo. Chuyên Viên dặn kiêng nước 4 tiếng và hướng dẫn chải mi rất kỹ. Sau 3 ngày mi vẫn giữ nếp rất đẹp.',
    technicianLabel: 'Chuyên Viên: CV Như Ý',
    sessionMeta: 'Ca Pilot #15 • Ngày 25/10/2026',
  },
  {
    id: 'review-12',
    customerLabel: 'Khách Hoàng Anh (0982***119)',
    ratingDisplay: '4.5',
    quote:
      'Hài lòng với dáng mi, không bị sun ngọn. Lúc tháo đệm mắt Chuyên Viên thao tác hơi nhanh một xíu nhưng tổng thể rất ok.',
    technicianLabel: 'Chuyên Viên: CV Thùy Trang',
    sessionMeta: 'Ca Pilot #12 • Ngày 22/10/2026',
  },
  {
    id: 'review-08',
    customerLabel: 'Khách Lan Phương (0937***601)',
    ratingDisplay: '5.0',
    quote: 'Thích nhất là mi không cần chải mascara mà vẫn có màu đen nhánh tự nhiên. Rất đáng tiền trải nghiệm.',
    technicianLabel: 'Chuyên Viên: CV Cẩm Tiên',
    sessionMeta: 'Ca Pilot #08 • Ngày 18/10/2026',
  },
];

export const DEFAULT_SELECTED_TECH_ID = 'tech-02';

export const DEFAULT_EXAM_FORM_SCORES: Record<string, number> = {
  'crit-safety': 25,
  'crit-shield': 22,
  'crit-timing': 18,
  'crit-result': 18,
  'crit-conduct': 9,
};

export const DEFAULT_THEORY_INPUT_SCORE = 88;

export const DEFAULT_EXAMINER_NOTES_INPUT =
  'Kỹ thuật an toàn giác mạc rất vững. Căn chỉnh sợi mi gọn gàng, độ phủ bóng mi đạt chuẩn mực cao.';

export const DEFAULT_EVIDENCE_NOTE_INPUT = 'Ca mẫu khách uốn mi dày, thời gian ủ 17 phút kiểm soát đàn hồi tốt.';

export function calculatePracticalTotal(scores: Record<string, number>): number {
  return Object.values(scores).reduce((sum, val) => sum + (val || 0), 0);
}

export function evaluateExamPass(scores: Record<string, number>, theoryScore: number, practicalTotal: number): boolean {
  const isSafetyPass = (scores['crit-safety'] || 0) >= 20;
  const isTheoryPass = theoryScore >= 80;
  const isPracticalPass = practicalTotal >= 80;
  return isSafetyPass && isTheoryPass && isPracticalPass;
}

export function buildNextCertificateCode(records: TechnicianAssessmentRecord[], existingCode?: string): string {
  return existingCode || `WINGS-DL-2026-00${records.filter((r) => r.certificateApproved).length + 1}`;
}

export function computeCsatMetrics(sessions: PilotSession[]): CsatMetrics {
  const ratedSessions = sessions.filter(
    (s) => (s.feedbackRating && s.feedbackRating > 0) || (s.csatScore && s.csatScore > 0)
  );

  // Fallback dữ liệu từ Pilot nếu danh sách sessions chưa có nhiều feedback
  const baseCount = ratedSessions.length;
  let avgScore = 4.88;
  let fiveStarCount = 15;
  let fourStarCount = 2;
  let threeStarCount = 0;
  let totalRated = 17;

  if (baseCount >= 3) {
    totalRated = baseCount;
    const sum = ratedSessions.reduce((acc, s) => acc + (s.csatScore || s.feedbackRating || 5), 0);
    avgScore = Math.round((sum / totalRated) * 100) / 100;
    fiveStarCount = ratedSessions.filter((s) => (s.csatScore || s.feedbackRating) === 5).length;
    fourStarCount = ratedSessions.filter((s) => (s.csatScore || s.feedbackRating) === 4).length;
    threeStarCount = ratedSessions.filter((s) => (s.csatScore || s.feedbackRating || 5) <= 3).length;
  }

  const isTargetMet = avgScore >= 4.8;

  return {
    totalRated,
    avgScore,
    fiveStarCount,
    fourStarCount,
    threeStarCount,
    satisfactionRate: Math.round(((fiveStarCount + fourStarCount) / totalRated) * 100),
    isTargetMet,
    ratedSessions,
  };
}
