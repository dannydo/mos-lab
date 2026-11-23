export type QuizOptionKey = 'A' | 'B' | 'C' | 'D';

export interface QuizQuestion {
  id: number;
  question: string;
  options: { key: QuizOptionKey; text: string }[];
  correctKey: QuizOptionKey;
  explanation: string;
}

export interface Essay19Answers {
  caseA: string;
  caseB: string;
  caseC: string;
  caseD: string;
}

export interface EssayScores {
  q18: number;
  q19: number;
  q20: number;
}

export interface Essay19CaseConfig {
  key: keyof Essay19Answers;
  label: string;
}

export interface LashLiftTheoryExamModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitScore?: (finalScore: number, answersSummary: string) => void;
  candidateName?: string;
  examinerName?: string;
}

// 30 phút = 1800 giây
export const TOTAL_THEORY_EXAM_SECONDS = 30 * 60;

export const THEORY_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'Mục tiêu chính của kỹ thuật uốn mi là gì?',
    options: [
      { key: 'A', text: 'Làm mi thật dài ra vĩnh viễn' },
      { key: 'B', text: 'Tạo độ cong cho mi thật trong một khoảng thời gian' },
      { key: 'C', text: 'Làm tăng số lượng nang mi' },
      { key: 'D', text: 'Thay thế hoàn toàn mascara' },
    ],
    correctKey: 'B',
    explanation:
      'Uốn mi tác động vào liên kết lưu huỳnh (disulfide bonds) ở lớp vỏ cortex của sợi mi thật để định hình độ cong tạm thời trong chu kỳ sinh trưởng của mi (6-8 tuần).',
  },
  {
    id: 2,
    question: 'Trước khi thực hiện, bước nào cần ưu tiên hàng đầu?',
    options: [
      { key: 'A', text: 'Bôi thuốc uốn ngay để tiết kiệm thời gian' },
      { key: 'B', text: 'Kiểm tra tình trạng mắt, mi và hỏi tiền sử dị ứng/nhạy cảm' },
      { key: 'C', text: 'Chọn trục lớn nhất cho mọi khách' },
      { key: 'D', text: 'Nhuộm mi trước khi kiểm tra' },
    ],
    correctKey: 'B',
    explanation:
      'Thăm khám mi và kiểm tra tiền sử dị ứng là bước tiên quyết bắt buộc để đảm bảo an toàn giác mạc và phát hiện các chống chỉ định.',
  },
  {
    id: 3,
    question: 'Trường hợp nào nên hoãn dịch vụ và đánh giá thêm?',
    options: [
      { key: 'A', text: 'Mi khỏe, mắt không kích ứng' },
      { key: 'B', text: 'Khách đã hiểu quy trình' },
      { key: 'C', text: 'Mắt đang đỏ, đau, viêm hoặc có dấu hiệu nhiễm trùng' },
      { key: 'D', text: 'Khách muốn độ cong tự nhiên' },
    ],
    correctKey: 'C',
    explanation:
      'Tuyệt đối không thực hiện dịch vụ hóa chất khi mắt khách có dấu hiệu viêm bờ mi, đau đỏ hoặc tổn thương niêm mạc.',
  },
  {
    id: 4,
    question: 'Vì sao cần làm sạch mi trước khi uốn?',
    options: [
      { key: 'A', text: 'Để thuốc mạnh hơn' },
      { key: 'B', text: 'Loại bỏ dầu, bụi và cặn có thể ảnh hưởng độ bám, độ đồng đều' },
      { key: 'C', text: 'Để mi thật rụng nhanh hơn' },
      { key: 'D', text: 'Không có lý do, chỉ là bước hình thức' },
    ],
    correctKey: 'B',
    explanation:
      'Bã nhờn và cặn mỹ phẩm tạo màng chắn ngăn thuốc uốn thẩm thấu đều, khiến mi uốn xong không đạt độ cong hoặc cong loang lổ.',
  },
  {
    id: 5,
    question: 'Trục nên được chọn chủ yếu dựa trên yếu tố nào?',
    options: [
      { key: 'A', text: 'Chỉ dựa vào màu sắc của trục' },
      { key: 'B', text: 'Độ dài mi, dáng mắt, độ cong mong muốn và khả năng tạo độ cong an toàn' },
      { key: 'C', text: 'Chọn loại nhỏ nhất để cong nhiều nhất' },
      { key: 'D', text: 'Dùng chung một cỡ cho mọi khách' },
    ],
    correctKey: 'B',
    explanation:
      'Kích thước trục silicon phải tương thích với chiều dài sợi mi thật (phủ 50-70% độ cong) và độ sâu hốc mắt của khách.',
  },
  {
    id: 6,
    question: 'Nguyên tắc chung đúng nhất khi đặt mi lên trục là gì?',
    options: [
      { key: 'A', text: 'Mi tách đều, cùng hướng, không gập hoặc chồng chéo' },
      { key: 'B', text: 'Mi bắt chéo để tăng độ dày' },
      { key: 'C', text: 'Chỉ cần dán phần ngọn mi' },
      { key: 'D', text: 'Kéo căng mi tối đa để tạo cong' },
    ],
    correctKey: 'A',
    explanation:
      'Kỹ thuật Zero Cross: Các sợi mi phải được trải song song vuông góc 90° với bờ mi, chân mi áp sát đỉnh trục không bị vặn xoắn.',
  },
  {
    id: 7,
    question: 'Khi cố định mi lên trục, điều quan trọng nhất là gì?',
    options: [
      { key: 'A', text: 'Các sợi mi nằm tách tương đối, hướng đều, không bắt chéo hoặc gập' },
      { key: 'B', text: 'Kéo căng tối đa mọi sợi mi' },
      { key: 'C', text: 'Để mi dính thành từng cụm' },
      { key: 'D', text: 'Để keo tràn vào mắt' },
    ],
    correctKey: 'A',
    explanation:
      'Cố định mi bằng keo định hình chuyên dụng sao cho sợi mi giữ nguyên trật tự tự nhiên, không bị chèn ép gập khúc.',
  },
  {
    id: 8,
    question: 'Thuốc uốn và thuốc định hình có vai trò gì trong phản ứng hóa sinh?',
    options: [
      { key: 'A', text: 'Cả hai chỉ có tác dụng làm sạch' },
      {
        key: 'B',
        text: 'Thuốc uốn làm thay đổi liên kết cấu trúc sợi mi; bước định hình giúp ổn định hình dạng mới theo trục',
      },
      { key: 'C', text: 'Thuốc định hình làm mi mọc nhanh hơn' },
      { key: 'D', text: 'Có thể đổi thứ tự tùy ý' },
    ],
    correctKey: 'B',
    explanation:
      'Thuốc số 1 (kiềm, pH 9.2-9.5) mở biểu bì và bẻ gãy liên kết disulfide; Thuốc số 2 (acid trung hòa, pH 3.0-3.5) hàn gắn liên kết ở vị trí cong mới.',
  },
  {
    id: 9,
    question: 'Thời gian lưu thuốc nên được quyết định như thế nào?',
    options: [
      { key: 'A', text: 'Luôn cố định 15 phút cho mọi sản phẩm' },
      { key: 'B', text: 'Theo video trên mạng bất kể nhãn thuốc' },
      { key: 'C', text: 'Theo hướng dẫn nhà sản xuất, tình trạng sợi mi và quy trình đã được đào tạo' },
      { key: 'D', text: 'Càng lâu càng cong đẹp' },
    ],
    correctKey: 'C',
    explanation:
      'Canh thời gian chuẩn xác theo độ đàn hồi và cấu trúc mi (mi tơ mảnh: 10-12p; mi thường: 12-14p; mi dày thô cứng: 14-16p).',
  },
  {
    id: 10,
    question: 'Vì sao không nên để thuốc tiếp xúc với da/mắt hoặc lan vào niêm mạc?',
    options: [
      { key: 'A', text: 'Có thể gây kích ứng hoặc tổn thương hóa chất' },
      { key: 'B', text: 'Chỉ làm giảm mùi hương' },
      { key: 'C', text: 'Không ảnh hưởng nếu nhắm mắt' },
      { key: 'D', text: 'Giúp thuốc phát huy tốt hơn' },
    ],
    correctKey: 'A',
    explanation:
      'Thuốc uốn có tính kiềm cao, nếu lem vào niêm mạc hoặc giác mạc có thể gây bỏng hóa chất, viêm kết mạc hoặc trợt biểu mô giác mạc.',
  },
  {
    id: 11,
    question: 'Nếu khách báo nóng rát, đau hoặc chảy nước mắt bất thường trong khi làm, cần làm gì?',
    options: [
      { key: 'A', text: 'Tiếp tục đủ thời gian mới xử lý' },
      { key: 'B', text: 'Thêm thuốc để cân bằng' },
      {
        key: 'C',
        text: 'Dừng quy trình, lau sạch sản phẩm nhẹ nhàng, an toàn và đánh giá tình trạng; tìm trợ giúp y tế khi cần',
      },
      { key: 'D', text: 'Che mắt và bỏ qua' },
    ],
    correctKey: 'C',
    explanation:
      'An toàn là trên hết: Lập tức dừng thao tác, dùng tăm bông gạt sạch thuốc, rửa nhẹ bằng nước muối sinh lý 0.9% và kiểm tra giác mạc.',
  },
  {
    id: 12,
    question: 'Dấu hiệu nào cho thấy mi có nguy cơ bị xử lý quá mức (over-processed)?',
    options: [
      { key: 'A', text: 'Mi mềm, đàn hồi tự nhiên' },
      { key: 'B', text: 'Mi khô xơ, quăn gập, mất đàn hồi hoặc có dấu hiệu gãy' },
      { key: 'C', text: 'Mi được chải tách đều' },
      { key: 'D', text: 'Trục vừa vặn' },
    ],
    correctKey: 'B',
    explanation:
      'Khi ủ quá thời gian hoặc quẹt thuốc lên ngọn mi, protein keratin bị phá hủy khiến ngọn mi bị sun xoăn, giòn và đứt gãy.',
  },
  {
    id: 13,
    question: 'Vệ sinh dụng cụ và tay có ý nghĩa gì đối với an toàn dịch vụ?',
    options: [
      { key: 'A', text: 'Chỉ để khu vực làm đẹp mắt hơn' },
      { key: 'B', text: 'Giảm nguy cơ lây nhiễm chéo và bảo vệ khách lẫn kỹ thuật viên' },
      { key: 'C', text: 'Không cần nếu chỉ làm một khách' },
      { key: 'D', text: 'Chỉ cần vệ sinh cuối ngày' },
    ],
    correctKey: 'B',
    explanation:
      'Khử khuẩn nhíp, que gạt và sát khuẩn tay theo chuẩn y tế phòng ngừa lây nhiễm vi khuẩn gây viêm bờ mi hoặc đau mắt đỏ.',
  },
  {
    id: 14,
    question: 'Sau khi uốn mi, lời dặn nào phù hợp nhất với khách hàng?',
    options: [
      { key: 'A', text: 'Chà xát mi mạnh để giữ cong' },
      {
        key: 'B',
        text: 'Tuân thủ hướng dẫn chăm sóc của hệ sản phẩm; tránh tác động mạnh và theo dõi dấu hiệu kích ứng',
      },
      { key: 'C', text: 'Tự bôi hóa chất uốn lại tại nhà' },
      { key: 'D', text: 'Giật mi nếu thấy không đều' },
    ],
    correctKey: 'B',
    explanation:
      'Dặn khách kiêng nước tối thiểu 4 giờ đầu để liên kết định hình ổn định hoàn toàn, chải dưỡng keratin bóng tối hàng ngày.',
  },
  {
    id: 15,
    question: 'Nếu kết quả uốn không đều, cách xử lý chuyên nghiệp nhất là gì?',
    options: [
      { key: 'A', text: 'Lập tức bôi thuốc lần nữa lên toàn bộ mi' },
      {
        key: 'B',
        text: 'Xác định nguyên nhân, đánh giá độ khỏe của mi và chỉ điều chỉnh khi đủ điều kiện, theo hướng dẫn sản phẩm và đào tạo',
      },
      { key: 'C', text: 'Dùng nhiệt cao để ép cong' },
      { key: 'D', text: 'Che khuyết điểm, không nói với khách' },
    ],
    correctKey: 'B',
    explanation:
      'Không bao giờ uốn chồng thuốc ngay lập tức vì sẽ làm cháy sợi mi. Phải đánh giá sức khỏe nang mi và chỉ chỉnh sửa khi đủ điều kiện dưỡng.',
  },
  {
    id: 16,
    question: 'Cách lựa chọn trục uốn đúng nhất có thể áp dụng cho toàn bộ khách hàng?',
    options: [
      { key: 'A', text: 'Trục càng to mi uốn càng đẹp' },
      { key: 'B', text: 'Chọn trục sao cho độ dài mi che phủ 50-70% độ cong của trục' },
      { key: 'C', text: 'Trục càng nhỏ độ cong càng đẹp' },
      { key: 'D', text: 'Trục nào cũng được, miễn mi dính lên trục là được' },
    ],
    correctKey: 'B',
    explanation:
      'Độ phủ lý tưởng 50-70% giúp mi cong vuốt mượt mà theo sống trục cá heo; nếu dưới 50% mi bị lài đơ, nếu vượt quá 100% ngọn mi bị cụp quéo.',
  },
  {
    id: 17,
    question: 'Nên nhuộm mi trước hay sau khi bôi cân bằng pH?',
    options: [
      { key: 'A', text: 'Nhuộm mi trước rồi mới dùng cân bằng pH' },
      { key: 'B', text: 'Cân bằng pH trước sau đó mới nhuộm' },
      { key: 'C', text: 'Dưỡng keratin trước rồi mới bôi cân bằng pH' },
      { key: 'D', text: 'Nhuộm trước hay cân bằng pH trước đều được' },
    ],
    correctKey: 'A',
    explanation:
      'Nhuộm phủ màu bóng đen trong môi trường biểu bì đang mở, sau đó bôi dưỡng cân bằng pH (5.5) để khép chặt lớp cutin khóa màu và dưỡng chất bên trong.',
  },
];

export const INITIAL_MCQ_ANSWERS: Record<number, QuizOptionKey> = {
  1: 'B',
  2: 'B',
  3: 'C',
  4: 'B',
  5: 'B',
  6: 'A',
  7: 'A',
  8: 'B',
  9: 'C',
  10: 'A',
  11: 'C',
  12: 'B',
  13: 'B',
  14: 'B',
  15: 'B',
  16: 'B',
  17: 'A',
};

export const INITIAL_ESSAY_18 =
  'Quy trình 7 bước an toàn Wings:\n1. Thăm khám kiểm tra mi & tiền sử dị ứng\n2. Vệ sinh tẩy dầu mi và dán pad hydrogel\n3. Chọn size trục silicone phù hợp độ dài mi (S/M/L) và dán ôm bờ mi\n4. Bắt sợi mi 90 độ lên trục (Zero Cross)\n5. Bôi thuốc uốn số 1 canh thời gian theo chất mi (10-14 phút)\n6. Lau sạch và bôi thuốc định hình số 2 (8-10 phút)\n7. Nhuộm phủ bóng Nano, cân bằng pH và khóa biểu bì bằng tinh chất Keratin, dặn dò chăm sóc 24h.';

export const INITIAL_ESSAY_19: Essay19Answers = {
  caseA:
    'Lý do: Bôi thuốc uốn lem lên chóp ngọn mi hoặc ủ quá giờ làm cháy keratin. Phòng ngừa: Chỉ bôi thuốc 2/3 thân mi, cách ngọn ít nhất 1.5mm.',
  caseB:
    'Lý do: Thuốc số 1 chưa đủ độ mềm hóa hoặc thuốc số 2 bị lau quá sớm. Phòng ngừa: Kiểm tra độ dẻo đàn hồi trước khi lau thuốc 1, bấm giờ đúng chuẩn thuốc 2.',
  caseC:
    'Lý do: Khi chải vuốt keo định hình sợi mi bị bắt chéo đè lên nhau. Phòng ngừa: Dùng que gạt rẽ từng sợi mi thẳng góc 90 độ song song tuyệt đối trước khi bôi hóa chất.',
  caseD:
    'Lý do: Chiều dài mi dưới 5mm không thể ôm đỉnh trục. Phòng ngừa: Kiểm tra đo mi từ đầu, hoãn dịch vụ hoặc tư vấn dưỡng mi 3 tuần trước khi uốn.',
};

export const INITIAL_ESSAY_20 =
  'Thứ tự xử lý khẩn:\n1. Dừng ngay thao tác, trấn an khách hàng.\n2. Dùng tăm bông khô thấm hút sạch hóa chất xung quanh mí mắt.\n3. Rửa nhẹ bằng dung dịch nước muối sinh lý NaCl 0.9% vô trùng; tuyệt đối không tự ý nhỏ hóa chất trung hòa vào mắt.\n4. Đánh giá thị lực và niêm mạc mắt.\n5. Dấu hiệu cần chuyển viện khám khẩn cấp: Đau nhức dữ dội kéo dài quá 15 phút, mắt đỏ rực phù nề, chảy nước mắt liên tục không ngớt, hoặc khách nhìn mờ/giảm thị lực.';

export const INITIAL_ESSAY_SCORES: EssayScores = {
  q18: 10, // max 10
  q19: 12, // max 12
  q20: 10, // max 10
};

export const ESSAY_19_CASES: Essay19CaseConfig[] = [
  { key: 'caseA', label: 'A. Mới làm xong đẹp, sau 1 ngày ngọn mi bị sun quéo:' },
  { key: 'caseB', label: 'B. Sau khi lau thuốc số 2 và gỡ trục, có nhiều sợi không cong:' },
  { key: 'caseC', label: 'C. Hướng ngọn mi sau khi uốn bị nghiêng xéo chồng lên nhau:' },
  { key: 'caseD', label: 'D. Mi quá ngắn khi uốn không chải lên trục được:' },
];

export function formatTheoryExamTimer(secs: number): string {
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function clampEssayScore(rawValue: string | number, max: number): number {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(max, Math.max(0, parsed));
}
