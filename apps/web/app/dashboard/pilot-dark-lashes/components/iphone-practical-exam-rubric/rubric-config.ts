export interface PracticalRubricScores {
  stage1: number; // Thăm khám & Vệ sinh (10đ)
  stage2: number; // Dán trục & Bắt sợi mi 90° (25đ)
  stage3: number; // Canh hóa chất & Canh giờ (35đ)
  stage4: number; // Nghiệm thu Form mi & Chăm sóc (30đ)
}

export interface IphonePracticalExamRubricProps {
  onClose?: () => void;
  onApproveCert?: (finalScore: number, notes: string) => void;
  candidateName?: string;
  examinerName?: string;
  initialScores?: Partial<PracticalRubricScores>;
}

export type RubricStageKey = keyof PracticalRubricScores;
export type RubricOptionTone = 'emerald' | 'amber' | 'rose';
export type RubricOptionIcon = 'check' | 'alert' | 'x';

export interface RubricStageOption {
  value: number;
  label: string;
  tone: RubricOptionTone;
  icon: RubricOptionIcon;
  testId: string;
}

export interface RubricStageDefinition {
  key: RubricStageKey;
  headerLabel: string;
  maxScore: number;
  title: string;
  bullets: readonly string[];
  columns: 2 | 3;
  options: readonly RubricStageOption[];
}

export interface ExamRankInfo {
  label: string;
  sub: string;
  color: 'emerald' | 'blue' | 'rose';
}

export const TOTAL_PRACTICAL_EXAM_SECONDS = 70 * 60;

export const DEFAULT_LEFT_EYE_PHOTO = '/uploads/pilot-left-eye-verified.jpg';
export const DEFAULT_RIGHT_EYE_PHOTO = '/uploads/pilot-right-eye-verified.jpg';

export const DEFAULT_EXAMINER_NOTES =
  'Thao tác dán trục silicone 90° rất chuẩn, sợi mi tơi đều không bắt chéo. Thời gian hoàn thiện 64 phút, 0 lỗi kỹ thuật.';

export const QUICK_EXAMINER_TAGS: readonly string[] = [
  'Thao tác tay vững',
  'Căn trục cá heo rất đều',
  'Sợi mi tơi óng',
  'An toàn giác mạc tốt',
  'Ân cần chu đáo',
];

export const EXAM_CERT_CODE = 'WINGS-DL-2026-004-GH';
export const EXAM_INSTRUCTOR_NAME = 'Cô Giang Đàm';
export const EXAM_APPROVER_NAME = 'CEO Danny Đỗ';

export const PRACTICAL_EXAM_STAGES: readonly RubricStageDefinition[] = [
  {
    key: 'stage1',
    headerLabel: 'Chặng 1 (10 phút)',
    maxScore: 10,
    title: 'I. Thăm Khám & Chuẩn Bị Vệ Sinh',
    bullets: [
      'Test đàn hồi ẩm (Wet Elasticity Test) nhận diện mi mảnh/dày.',
      'Chọn đúng size trục silicone (S/M/L) che 50-70% chiều dài mi.',
      'Dán pad hydrogel cách bờ mi 0.5mm, tuyệt đối không cộm mắt.',
    ],
    columns: 2,
    options: [
      { value: 10, label: 'Đạt Chuẩn (10đ)', tone: 'emerald', icon: 'check', testId: 'btn-stage1-pass' },
      { value: 0, label: 'Chưa Đạt (0đ)', tone: 'rose', icon: 'x', testId: 'btn-stage1-fail' },
    ],
  },
  {
    key: 'stage2',
    headerLabel: 'Chặng 2 (15 phút)',
    maxScore: 25,
    title: 'II. Dán Trục & Bắt Sợi Mi 90° (Zero Cross)',
    bullets: [
      'Trục silicone ôm sát bờ mi không hở bọt khí.',
      '100% sợi mi vuốt thẳng góc 90°, không bắt chéo sợi con.',
      'Chân mi không bị đùn thịt, không gấp nếp.',
    ],
    columns: 3,
    options: [
      { value: 25, label: 'Chuẩn 100% (25đ)', tone: 'emerald', icon: 'check', testId: 'btn-stage2-perfect' },
      { value: 15, label: 'Lệch 2-3 sợi (15đ)', tone: 'amber', icon: 'alert', testId: 'btn-stage2-minor' },
      { value: 0, label: 'Chéo chân (0đ)', tone: 'rose', icon: 'x', testId: 'btn-stage2-fail' },
    ],
  },
  {
    key: 'stage3',
    headerLabel: 'Chặng 3 (30 phút)',
    maxScore: 35,
    title: 'III. Canh Hóa Chất & Phủ Bóng Tối',
    bullets: [
      'Step 1 (pH 9.2-9.5) bôi cách chân 0.5-1mm, không dính ngọn mi.',
      'Bấm giờ chuẩn chất mi (≤ 14p). Step 2 (pH 3.0-3.5) đúng giờ.',
      'Phủ Nano Bóng Tối tơi đều, cân bằng pH 5.5, không cay mắt.',
    ],
    columns: 3,
    options: [
      { value: 35, label: 'Chuẩn xác (35đ)', tone: 'emerald', icon: 'check', testId: 'btn-stage3-perfect' },
      { value: 20, label: 'Lem nhẹ (20đ)', tone: 'amber', icon: 'alert', testId: 'btn-stage3-minor' },
      { value: 0, label: 'Cháy/Cay (0đ)', tone: 'rose', icon: 'x', testId: 'btn-stage3-fail' },
    ],
  },
  {
    key: 'stage4',
    headerLabel: 'Chặng 4 (15 phút)',
    maxScore: 30,
    title: 'IV. Nghiệm Thu Form Mi & Hướng Dẫn',
    bullets: [
      'Góc nâng chân mi đạt 60°–75° (đo thước Lash Protractor).',
      'Độ cong 2 mắt cân xứng (sai lệch ≤ 1mm). Mi tơi bóng không sun.',
      'Dặn dò kiêng nước 4 giờ và dưỡng mi đúng văn hóa Wings.',
    ],
    columns: 3,
    options: [
      { value: 30, label: 'Hoàn hảo (30đ)', tone: 'emerald', icon: 'check', testId: 'btn-stage4-perfect' },
      { value: 15, label: 'Lệch nhẹ (15đ)', tone: 'amber', icon: 'alert', testId: 'btn-stage4-minor' },
      { value: 0, label: 'Lài đơ (0đ)', tone: 'rose', icon: 'x', testId: 'btn-stage4-fail' },
    ],
  },
];

export function buildInitialScores(initialScores?: Partial<PracticalRubricScores>): PracticalRubricScores {
  return {
    stage1: initialScores?.stage1 ?? 10,
    stage2: initialScores?.stage2 ?? 25,
    stage3: initialScores?.stage3 ?? 35,
    stage4: initialScores?.stage4 ?? 30,
  };
}

export function formatExamTimer(secs: number): string {
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function getTimerColorClass(secondsLeft: number): string {
  if (secondsLeft <= 5 * 60) {
    return 'text-rose-500 bg-rose-500/10 border-rose-500/30 animate-pulse';
  }
  if (secondsLeft <= 15 * 60) {
    return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
  }
  return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
}

export function calculateTotalScore(scores: PracticalRubricScores): number {
  return scores.stage1 + scores.stage2 + scores.stage3 + scores.stage4;
}

export function getExamRank(totalScore: number): ExamRankInfo {
  if (totalScore >= 95) {
    return {
      label: 'ĐẠT KTV CHÍNH THỨC WINGS',
      sub: 'Xếp loại Xuất Sắc · Đủ điều kiện tự chủ ca làm',
      color: 'emerald',
    };
  }
  if (totalScore >= 90) {
    return {
      label: 'ĐẠT TỐT NGHIỆP TAY NGHỀ',
      sub: 'Xếp loại Giỏi · Đạt chuẩn SOP Đề Thám',
      color: 'blue',
    };
  }
  return {
    label: 'CHƯA ĐẠT CHUẨN',
    sub: 'Cần bồi dưỡng thêm cùng Cô Giang Đàm',
    color: 'rose',
  };
}
