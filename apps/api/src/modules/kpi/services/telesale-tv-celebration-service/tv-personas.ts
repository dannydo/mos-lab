import type { TelesaleTvEdginessLevel, TelesaleTvPersonaDto } from '@mos-lab/shared';

export type CelebrationEventType = 'BOOK' | 'DONE' | 'CHECKIN' | 'COMBO' | 'TIP';

export interface CelebrationQuoteOptions {
  tipAmount?: number;
  comboPackageName?: string;
  comboPrice?: number;
  cvStaffName?: string;
  ccStaffName?: string;
  customerName?: string;
  personaKey?: string;
  edginessLevel?: TelesaleTvEdginessLevel;
  streakCount?: number;
  hourOfDay?: number;
  isMorningFirstOrder?: boolean;
  isLateNightShift?: boolean;
}

export function formatCurrencyForSpeech(amount?: number | null): string {
  if (!amount || amount <= 0) return '';
  const num = Math.round(Number(amount));
  if (num >= 1_000_000) {
    const millions = Math.floor(num / 1_000_000);
    const remainder = num % 1_000_000;
    const thousands = Math.round(remainder / 1000);
    if (thousands > 0) {
      return `${millions} triệu ${thousands} nghìn đồng`;
    }
    return `${millions} triệu đồng`;
  }
  if (num >= 1000) {
    const thousands = Math.round(num / 1000);
    return `${thousands} nghìn đồng`;
  }
  return `${num} đồng`;
}

// 5 Distinct Personas for TV Live Celebration
export const TV_CELEBRATION_PERSONAS: Record<string, TelesaleTvPersonaDto> = {
  MC_HOI_CHO: {
    key: 'MC_HOI_CHO',
    name: 'MC Hội Chợ / BLV',
    badge: '🎪 MC HỘI CHỢ GÀO THÉT',
    icon: '🎪',
    voice: 'vi-VN-NamMinhNeural',
    rate: '+15%',
    pitch: '+6Hz',
    sfxType: 'vuvuzela_cheer',
    tagline: 'Gào thét cuồng nhiệt, nhịp độ dồn dập, ăn mừng rần rần như chung kết World Cup',
  },
  DRAMA_QUEEN: {
    key: 'DRAMA_QUEEN',
    name: 'Cụ Tổ Drama',
    badge: '🎭 CỤ TỔ DRAMA XÉO XẮT',
    icon: '🎭',
    voice: 'vi-VN-HoaiMyNeural',
    rate: '+6%',
    pitch: '+14Hz',
    sfxType: 'drama_stinger',
    tagline: 'Đanh đá the thé, châm chọc sâu cay, mỉa mai lầy lội không trượt phát nào',
  },
  THAY_BOI: {
    key: 'THAY_BOI',
    name: 'Thầy Bói Phán Số',
    badge: '🔮 THẦY BÓI PHÁN SỐ',
    icon: '🔮',
    voice: 'vi-VN-NamMinhNeural',
    rate: '-8%',
    pitch: '-8Hz',
    sfxType: 'temple_bell',
    tagline: 'Trầm ma mị, bấm độn tâm linh, phán cung tài lộc nổ đùng đùng',
  },
  GEN_Z: {
    key: 'GEN_Z',
    name: 'Gen Z Chúa Tể Meme',
    badge: '📱 GEN Z CHÚA TỂ MEME',
    icon: '📱',
    voice: 'vi-VN-HoaiMyNeural',
    rate: '+10%',
    pitch: '+4Hz',
    sfxType: 'pop_ting',
    tagline: 'Tươi tắn, flex nhẹ, slay quá bà dà, 10 điểm không có nhưng, hot trend TikTok',
  },
  TONG_TAI: {
    key: 'TONG_TAI',
    name: 'Tổng Tài Sến Sẩm',
    badge: '🕶️ TỔNG TÀI SẾN SẨM',
    icon: '🕶️',
    voice: 'vi-VN-NamMinhNeural',
    rate: '+0%',
    pitch: '-4Hz',
    sfxType: 'smooth_sax',
    tagline: 'Trầm ấm quyến rũ, thả thính sến rện, con tim tan chảy',
  },
};

let lastChosenPersonaKey = '';

export function resolveCelebrationPersona(requestedKey?: string): TelesaleTvPersonaDto {
  const personas = Object.values(TV_CELEBRATION_PERSONAS);
  if (requestedKey && requestedKey !== 'RANDOM_MULTI' && TV_CELEBRATION_PERSONAS[requestedKey]) {
    lastChosenPersonaKey = requestedKey;
    return TV_CELEBRATION_PERSONAS[requestedKey];
  }

  // Pick random persona avoiding immediate repetition if possible
  const candidates = personas.filter((p) => p.key !== lastChosenPersonaKey);
  const chosen = (candidates.length > 0 ? candidates : personas)[
    Math.floor(Math.random() * (candidates.length > 0 ? candidates.length : personas.length))
  ];
  lastChosenPersonaKey = chosen.key;
  return chosen;
}
