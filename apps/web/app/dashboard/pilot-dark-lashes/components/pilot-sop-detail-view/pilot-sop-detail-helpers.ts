import type { PilotSopStepDetail, PilotSopStepEmpiricalStat } from '@mos-lab/shared';

export interface PilotSopDetailViewProps {
  onBack?: () => void;
  onOpenSopModal?: () => void;
  onViewSessionId?: (sessionId: number) => void;
}

/**
 * Từ điển thuật ngữ kỹ thuật dành cho người mới và Chuyên Viên
 * Diễn giải thuật ngữ chuyên môn thành ngôn ngữ đời thường, dễ hiểu, trực quan.
 */
export interface GlossaryItem {
  term: string;
  simpleExplain: string;
  contextStep: string;
  badge?: string;
}

export interface PilotRealStepMedia {
  photoUrl: string;
  label: string;
  sessionNote: string;
}

export type InstructionLevel = 'MANDATORY' | 'TECH_TIP' | 'SAFETY_ALERT';

export interface TaggedInstruction {
  text: string;
  level: InstructionLevel;
  highlightText?: string;
}

export interface PreviewMediaState {
  open: boolean;
  title: string;
  imageUrl: string;
  note?: string;
}

export interface SopTimeStatsSummary {
  totalTargetMinutes: number;
  totalEmpiricalAvgSeconds: number;
  stepsWithStats: number;
}

export const EMPTY_PREVIEW_MEDIA: PreviewMediaState = {
  open: false,
  title: '',
  imageUrl: '',
  note: '',
};

export const TECHNICAL_GLOSSARY_7_STEPS: GlossaryItem[] = [
  {
    term: 'Liên kết Disunfua (Cầu nối S-S)',
    simpleExplain:
      'Cầu nối protein tự nhiên bên trong sợi mi quyết định mi thẳng hay cong. Thuốc số 1 tạm thời tháo lỏng liên kết để uốn theo trục, sau đó thuốc số 2 khóa chặt lại tạo nếp cong bền lâu.',
    contextStep: 'Bước 2 & Bước 3',
    badge: 'Cơ chế cốt lõi',
  },
  {
    term: 'Làm mềm (Softening)',
    simpleExplain:
      'Quá trình dùng thuốc uốn số 1 mở lớp biểu bì ngoài và đưa sợi mi về trạng thái mềm dẻo như sợi bún nguội, giúp mi dễ dàng ôm sát mặt cong trục silicon.',
    contextStep: 'Bước 2',
    badge: 'Kỹ thuật chính',
  },
  {
    term: 'Setting Cream (Thuốc khóa form số 2)',
    simpleExplain:
      'Kem định hình giúp tái tạo và khóa cứng toàn bộ liên kết bên trong sợi mi theo hình dáng trục cong, đảm bảo mi không bị nhả thẳng sau khi hoàn thành.',
    contextStep: 'Bước 3',
    badge: 'Khóa độ cong',
  },
  {
    term: 'Cân bằng pH (pH 5.5 - 6.0)',
    simpleExplain:
      'Trung hòa lượng kiềm còn sót lại của thuốc uốn, đưa sợi mi về môi trường axit nhẹ sinh lý tự nhiên. Thao tác này giúp các lớp vảy mi khép chặt, mi không bị khô cháy giòn.',
    contextStep: 'Bước 4',
    badge: 'Bảo vệ sợi mi',
  },
  {
    term: 'Màu bóng tối (Deep Black Lash Tint)',
    simpleExplain:
      'Thuốc nhuộm đen tuyền chuyên dụng thẩm thấu vào vỏ mi, biến các ngọn mi nâu hoặc vàng nhạt thành màu đen sâu thăm thẳm, tạo hiệu ứng mắt sâu cuốn hút.',
    contextStep: 'Bước 5',
    badge: 'Đặc trưng Bóng Tối',
  },
  {
    term: 'Keratin thủy phân & Glossy Serum',
    simpleExplain:
      'Tinh chất đạm protein siêu nhỏ thấm sâu vào lõi mi nuôi dưỡng, tạo một màng bảo vệ bóng loáng phản chiếu ánh sáng óng ả suốt nhiều tuần.',
    contextStep: 'Bước 6',
    badge: 'Phục hồi & Dưỡng',
  },
  {
    term: 'Trục Silicon Uốn Mi (Lash Pads)',
    simpleExplain:
      'Miếng đệm silicon mềm mại ôm khít mí mắt trên. Có nhiều kích cỡ (S/M/L) và dáng cong (Cá Heo, Tròn) để tạo độ cong tự nhiên hoặc cong vút tùy dáng mắt khách.',
    contextStep: 'Bước 2 & Bước 3',
    badge: 'Dụng cụ định hình',
  },
  {
    term: 'Sáp bắt mi (Lash Balm Glue)',
    simpleExplain:
      'Sáp dán định hình mi gốc nước không chứa cồn, giữ từng sợi mi bám dính chắc chắn trên trục uốn mà không làm khô cứng mi, dễ lau sạch bằng nước muối.',
    contextStep: 'Bước 1 & Bước 2',
    badge: 'Keo dán êm dịu',
  },
  {
    term: 'Eye Pad Gel (Miếng dán mi dưới)',
    simpleExplain:
      'Miếng dán y tế chứa gel dưỡng ẩm đặt dưới mi dưới, giúp cách ly hoàn toàn mi dưới không bị dính thuốc uốn và bảo vệ da mắt khỏi bị kích ứng.',
    contextStep: 'Bước 1',
    badge: 'An toàn giác mạc',
  },
  {
    term: 'Cây chải mi kim loại (Lash Lift Tool)',
    simpleExplain:
      'Cây que gạt kim loại đầu nhọn siêu mảnh chuyên dụng để miết phẳng, căng đều và tách riêng từng sợi mi song song trên trục, không để mi bắt chéo nhau.',
    contextStep: 'Bước 2 & Bước 3',
    badge: 'Định hình sợi mi',
  },
];

/**
 * Minh chứng hình ảnh thực tế từ các ca Pilot đã hoàn thành
 */
export const PILOT_REAL_STEP_MEDIA: Record<number, PilotRealStepMedia> = {
  1: {
    photoUrl: '/api/pilot/media/ea735600-d100-4749-9db8-54405430e956.jpg',
    label: 'Ảnh soi cấu trúc mi & dán Eye Pad (Ca Pilot #10)',
    sessionNote: 'Kiểm tra chất mi và cách ly mi dưới bằng Eye Pad Gel chuẩn cách bờ mi 1mm.',
  },
  2: {
    photoUrl: '/api/pilot/media/32f48e47-b02a-4b0b-9ecc-cc843d018385.jpg',
    label: 'Ảnh bắt mi ôm trục silicon & thoa thuốc làm mềm (Ca Pilot #14)',
    sessionNote: 'Sợi mi ôm sát trục cá heo R3, gạt thuốc số 1 cách chân mi 1.5mm an toàn.',
  },
  5: {
    photoUrl: '/api/pilot/media/0d7a30c5-22ec-48e2-bafe-10085da19bdb.jpg',
    label: 'Ảnh phủ màu đen sâu Deep Black Tint (Ca Pilot #12)',
    sessionNote: 'Nhuộm phủ kín 100% sợi mi tạo hiệu ứng đen tuyền đặc trưng của Uốn Mi Bóng Tối.',
  },
  7: {
    photoUrl: '/api/pilot/media/1f7ce362-702c-497b-b169-50008332e018.jpg',
    label: 'Ảnh hoàn thiện After chuẩn nghiệm thu (Ca Pilot #18 - Khách Nguyệt)',
    sessionNote: 'Mi cong vút đều tơi xốp, màu đen sâu bóng bẩy, khách hàng chấm 5/5 sao CSAT.',
  },
};

export function formatSecondsToDisplay(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds <= 0) {
    return '--:--';
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}p ${s < 10 ? '0' : ''}${s}s`;
}

/**
 * Helper phân loại cấp độ hướng dẫn: Bắt buộc, Lưu ý kỹ thuật, Cảnh báo an toàn
 */
export function tagInstruction(text: string): TaggedInstruction {
  const lower = text.toLowerCase();
  if (
    lower.includes('ngăn thuốc') ||
    lower.includes('kết mạc') ||
    lower.includes('giác mạc') ||
    lower.includes('cay xót') ||
    lower.includes('cách ly') ||
    lower.includes('không cử động mí') ||
    lower.includes('không lem')
  ) {
    return {
      text,
      level: 'SAFETY_ALERT',
      highlightText: 'CẢNH BÁO AN TOÀN',
    };
  }

  if (
    lower.includes('soi cấu trúc') ||
    lower.includes('chọn trục') ||
    lower.includes('căn chỉnh') ||
    lower.includes('miết nhẹ') ||
    lower.includes('thẩm thấu') ||
    lower.includes('bấm giờ') ||
    lower.includes('tỷ lệ chuẩn') ||
    lower.includes('quan sát')
  ) {
    return {
      text,
      level: 'TECH_TIP',
      highlightText: 'LƯU Ý KỸ THUẬT',
    };
  }

  return {
    text,
    level: 'MANDATORY',
    highlightText: 'BẮT BUỘC',
  };
}

export function summarizeSopTimeStats(
  steps: PilotSopStepDetail[],
  stats: Record<number, PilotSopStepEmpiricalStat>
): SopTimeStatsSummary {
  let targetMin = 0;
  let empiricalSecSum = 0;
  let countedSteps = 0;

  for (const step of steps) {
    targetMin += step.targetMinutes;
    const st = stats[step.stepOrder];
    if (st && st.avgDurationSeconds > 0) {
      empiricalSecSum += st.avgDurationSeconds;
      countedSteps++;
    }
  }

  return {
    totalTargetMinutes: targetMin,
    totalEmpiricalAvgSeconds: empiricalSecSum,
    stepsWithStats: countedSteps,
  };
}

export function filterSopSteps(
  steps: PilotSopStepDetail[],
  selectedStepOrder: number | 'all',
  filterQuery: string
): PilotSopStepDetail[] {
  let list = steps;
  if (selectedStepOrder !== 'all') {
    list = list.filter((s) => s.stepOrder === selectedStepOrder);
  }
  if (filterQuery.trim()) {
    const q = filterQuery.toLowerCase().trim();
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.purpose.toLowerCase().includes(q) ||
        s.materials.some((m) => m.name.toLowerCase().includes(q)) ||
        s.commonErrors.some((e) => e.error.toLowerCase().includes(q) || e.remedy.toLowerCase().includes(q))
    );
  }
  return list;
}
