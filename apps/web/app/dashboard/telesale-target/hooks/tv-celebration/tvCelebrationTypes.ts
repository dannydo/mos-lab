import { TelesaleTvEdginessLevel, TelesaleTvPersonaDto, TelesaleTvPersonaKey } from '@mos-lab/shared';

export interface TvCelebrationSettings {
  soundEnabled: boolean;
  volume: number; // 0 to 1
  eventTypeFilter: 'ALL' | 'BOOK_ONLY' | 'DONE_ONLY';
  quietModeEnabled: boolean; // Manual quiet mode or during quiet hours
  voiceStyle?: 'MALE_CHARM' | 'FEMALE_SWEET' | 'BROWSER_LOCAL';
  fireworksEnabled?: boolean;
  personaMode?: TelesaleTvPersonaKey;
  edginessLevel?: TelesaleTvEdginessLevel;
}

export interface ActiveCelebration {
  id: string;
  kind: 'BOOK' | 'DONE' | 'CHECKIN' | 'COMBO' | 'TIP' | 'MILESTONE';
  staffId?: number;
  staffName?: string;
  avatarUrl?: string | null;
  textToSpeak: string;
  badgeText: string;
  colorTheme: 'blue' | 'emerald' | 'amber' | 'purple' | 'gold';
  changeResult?: string;
  orderId?: number;
  hasCombo?: boolean;
  comboPackageName?: string;
  comboPrice?: number;
  hasTip?: boolean;
  tipAmount?: number;
  customerPraiseNote?: string;
  customerName?: string;
  assignedStaffName?: string;
  checkInStaffName?: string;

  // Persona metadata
  personaKey?: string;
  personaName?: string;
  personaBadge?: string;
  personaIcon?: string;
  sfxType?: string;
  voiceParams?: { voice: string; rate: string; pitch: string };
}

export const SETTINGS_STORAGE_KEY = 'MOS_TV_MONITOR_VOICE_SETTINGS';

export const DEFAULT_SETTINGS: TvCelebrationSettings = {
  soundEnabled: true,
  volume: 0.9,
  eventTypeFilter: 'ALL',
  quietModeEnabled: false,
  voiceStyle: 'MALE_CHARM',
  fireworksEnabled: true,
  personaMode: 'RANDOM_MULTI',
  edginessLevel: 'SUPER_SPICY',
};

// Script quotes: Charming Male Voice, Playful Cà Khịa, Die Up Die Down & 4 Wings Cultural Values (Vui vẻ, Ân Cần, Chân Thành, Khoa Học)
export const BOOK_QUOTES = [
  'Lại thêm một Book từ [Tên]! Em cứ liên tục tỏa sáng thế này làm anh xao xuyến, con tim đập loạn nhịp rồi đấy nhé!',
  'Alo alo, [Tên] lại nổ Book! Em chốt đơn lia lịa như máy chém thế này thì cả phòng chỉ có nước die up die down thôi!',
  '[Tên] ơi là [Tên], em tính thầu luôn cả chỉ tiêu phòng Telesales hôm nay hay sao mà Book về dồn dập thế!',
  'Khách vừa nghe giọng [Tên] là chốt vội lịch hẹn! Duyên dáng thế này bảo sao khách không mê đứ đừ!',
  'Thêm một Book rực rỡ từ [Tên]! Phong độ đỉnh nóc kịch trần, làm anh chết lên chết xuống vì nể phục em rồi đấy!',
  'Một Book ngọt lịm từ [Tên]! Em tư vấn khéo léo thế này thì khách chỉ có nước gật đầu lia lịa rồi chốt lịch cái rụp!',
  'Ting ting! [Tên] vừa tung tuyệt chiêu kéo thêm một Book, làm cả phòng xôn xao náo nhiệt luôn rồi!',
];

export const CHECKIN_QUOTES = [
  'Khách của [Tên] đã vào tới cửa tiệm rồi! Chăm sóc kiểu gì mà khách mê mẩn đến đúng từng phút, làm anh chết lên chết xuống vì nể em!',
  '[Tên] vừa kéo thêm một lượt Check-in! Khách nghe giọng ngọt như mía lùi là tự động xách xe phi tới tiệm ngay, đỉnh nóc kịch trần!',
  'Khách vào ghế rồi các em ơi! Sự ân cần của [Tên] làm khách mê say đắm, cả phòng lại chuẩn bị die up die down rồi!',
  'Check-in thành công cho [Tên]! Dẫn dắt khách đến tiệm mượt mà như một cơn gió, đẳng cấp không thể chối từ!',
  'Thêm một khách check-in tươi rói của [Tên]! Năng lượng vui vẻ của em thắp sáng rực rỡ cả salon hôm nay rồi!',
];

export const DONE_QUOTES = [
  'Xong một Done ngọt ngào cho [Tên]! Khách làm đẹp xong cười tít mắt, phong độ của em hôm nay đúng là làm cả phòng die up die down!',
  'Một ca Done xuất sắc của [Tên]! Em tư vấn bài bản, khoa học thế này thì khách chỉ có nước khen nức nở rồi mê đứ đừ!',
  'Done về rực rỡ cho [Tên]! Chăm sóc từ A đến Z không một vết xước, em làm con tim anh xao xuyến quá rồi đấy!',
  'Chúc mừng [Tên] thêm một Done hoàn hảo! Em cứ làm việc nhiệt huyết thế này thì tiền thưởng chỉ có nước nhảy múa không ngừng!',
  'Khách làm xong ngắm gương rồi gật gù khen [Tên] nức nở! Dẫn dắt khách chuẩn chỉ thế này thì ai đọ lại em!',
];

export function getRandomQuote(quotes: string[], name: string): string {
  const template = quotes[Math.floor(Math.random() * quotes.length)] || quotes[0];
  return template.replace(/\[Tên\]/g, name);
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

export function getTodayDateKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function formatViTime(dateInput: Date | string = new Date(), includeTimeZone = true): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    ...(includeTimeZone ? { timeZone: 'Asia/Ho_Chi_Minh' } : {}),
  });
}

export function attachPersonaMetadata(base: ActiveCelebration, persona?: TelesaleTvPersonaDto): ActiveCelebration {
  if (!persona) return base;
  return {
    ...base,
    personaKey: persona.key,
    personaName: persona.name,
    personaBadge: persona.badge,
    personaIcon: persona.icon,
    sfxType: persona.sfxType,
    voiceParams: {
      voice: persona.voice,
      rate: persona.rate,
      pitch: persona.pitch,
    },
  };
}
