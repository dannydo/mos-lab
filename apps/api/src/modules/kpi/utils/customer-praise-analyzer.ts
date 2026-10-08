/**
 * Helper phân tích cảm xúc & nhận diện lời khen khách hàng (Customer Praise Sentiment Analyzer)
 * Dành riêng cho kịch bản phát loa & vinh danh TV Monitor mos-lab
 */

const NEUTRAL_BLACKLIST = new Set([
  'ok',
  'oke',
  'okay',
  'oki',
  'okie',
  'good',
  'tam duoc',
  'tạm được',
  'binh thuong',
  'bình thường',
  'xong',
  'xong roi',
  'xong rồi',
  'da',
  'dạ',
  'ko',
  'khong',
  'không',
  'k co gi',
  'không có gì',
  'khong co gi',
  'bt',
]);

const POSITIVE_KEYWORDS = [
  'êm',
  'rat em',
  'rất êm',
  'nhẹ',
  'nhe nhang',
  'nhẹ nhàng',
  'không đau',
  'khong dau',
  'kỹ',
  'tỉ mỉ',
  'ti mi',
  'khéo',
  'kheo tay',
  'khéo tay',
  'chuyên nghiệp',
  'chuyen nghiep',
  'tuyệt vời',
  'tuyet voi',
  'tuyệt',
  'xuất sắc',
  'xuat sac',
  'ưng',
  'rat ung',
  'rất ưng',
  'ung y',
  'ưng ý',
  'hài lòng',
  'hai long',
  'đẹp',
  'rat dep',
  'rất đẹp',
  'xinh',
  'tự nhiên',
  'tu nhien',
  'thích',
  'rat thich',
  'rất thích',
  'mê',
  'nhiệt tình',
  'nhiet tinh',
  'chu đáo',
  'chu dao',
  'dễ thương',
  'de thuong',
  'vui vẻ',
  'vui ve',
  'lịch sự',
  'lich su',
  'ân cần',
  'an can',
  'thân thiện',
  'than thien',
  'tận tâm',
  'tan tam',
  'cảm ơn',
  'cam on',
  'thank',
  'thanks',
  'yêu',
  'love',
  'ủng hộ',
  'ung ho',
  'quay lại',
  'sẽ ghé',
  'se ghe',
  '10 diem',
  '10 điểm',
  '5 sao',
  '10/10',
];

const NEGATIVE_KEYWORDS = [
  'đau',
  'rát',
  'rat mat',
  'cộm',
  'com mat',
  'cay',
  'cay mat',
  'chờ lâu',
  'cho lau',
  'thất vọng',
  'that vong',
  'tệ',
  'kém',
  'kem',
  'chán',
  'chan',
  'khó chịu',
  'kho chiu',
  'chưa ưng',
  'chua ung',
  'không đều',
  'khong deu',
  'rụng',
  'rung',
  'châm chích',
  'nặng mắt',
  'nang mat',
];

export interface PraiseAnalysisResult {
  isPraise: boolean;
  cleanNote: string;
  sentimentScore: number;
}

export function analyzeCustomerPraiseNote(rawNote?: string | null): PraiseAnalysisResult {
  if (!rawNote || typeof rawNote !== 'string') {
    return { isPraise: false, cleanNote: '', sentimentScore: 0 };
  }

  const cleanNote = rawNote.trim();
  if (cleanNote.length < 5) {
    return { isPraise: false, cleanNote, sentimentScore: 0 };
  }

  const normalized = cleanNote
    .toLowerCase()
    .replace(/[.,!?;:'"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Kiểm tra blacklist các từ ngắn trung tính
  if (NEUTRAL_BLACKLIST.has(normalized)) {
    return { isPraise: false, cleanNote, sentimentScore: 0 };
  }

  // Nếu có từ ngữ tiêu cực -> tuyệt đối không tính là lời khen
  for (const neg of NEGATIVE_KEYWORDS) {
    if (normalized.includes(neg)) {
      return { isPraise: false, cleanNote, sentimentScore: -1 };
    }
  }

  // Đếm số từ khóa tích cực
  let positiveMatches = 0;
  for (const pos of POSITIVE_KEYWORDS) {
    if (normalized.includes(pos)) {
      positiveMatches++;
    }
  }

  // Điều kiện lời khen: có ít nhất 1 từ khóa tích cực và không có từ tiêu cực
  // Hoặc độ dài đủ dài (> 15 ký tự) và mang tính chia sẻ trải nghiệm
  const isPraise = positiveMatches > 0 || (cleanNote.length >= 15 && !NEUTRAL_BLACKLIST.has(normalized));

  return {
    isPraise,
    cleanNote,
    sentimentScore: positiveMatches,
  };
}
