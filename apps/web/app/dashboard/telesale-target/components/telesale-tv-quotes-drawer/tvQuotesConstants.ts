import type { TelesaleTvPersonaKey, TelesaleTvQuoteEventType, TelesaleTvQuoteItem } from '@mos-lab/shared';
import type { TvPersonaOption, TvQuoteEventConfig, TvQuoteVariableTag, TvTemplateSegment } from './tvQuotesTypes';

export const EVENT_TYPE_CONFIG: Record<TelesaleTvQuoteEventType, TvQuoteEventConfig> = {
  BOOK: {
    label: 'Book Mới',
    color: 'blue',
    bgLight: 'bg-blue-50',
    bgDark: 'bg-blue-950/40',
    borderLight: 'border-blue-200',
    borderDark: 'border-blue-800',
  },
  CHECKIN: {
    label: 'Check-in Salon',
    color: 'emerald',
    bgLight: 'bg-emerald-50',
    bgDark: 'bg-emerald-950/40',
    borderLight: 'border-emerald-200',
    borderDark: 'border-emerald-800',
  },
  COMBO: {
    label: 'Chốt Combo',
    color: 'purple',
    bgLight: 'bg-purple-50',
    bgDark: 'bg-purple-950/40',
    borderLight: 'border-purple-200',
    borderDark: 'border-purple-800',
  },
  TIP: {
    label: 'Khách Có Tip',
    color: 'amber',
    bgLight: 'bg-amber-50',
    bgDark: 'bg-amber-950/40',
    borderLight: 'border-amber-200',
    borderDark: 'border-amber-800',
  },
  DONE: {
    label: 'Hoàn Tất Done',
    color: 'cyan',
    bgLight: 'bg-cyan-50',
    bgDark: 'bg-cyan-950/40',
    borderLight: 'border-cyan-200',
    borderDark: 'border-cyan-800',
  },
  STREAK: {
    label: 'Chuỗi Nổ Đơn',
    color: 'orange',
    bgLight: 'bg-orange-50',
    bgDark: 'bg-orange-950/40',
    borderLight: 'border-orange-200',
    borderDark: 'border-orange-800',
  },
  MORNING: {
    label: 'Mở Bát Sáng',
    color: 'rose',
    bgLight: 'bg-rose-50',
    bgDark: 'bg-rose-950/40',
    borderLight: 'border-rose-200',
    borderDark: 'border-rose-800',
  },
};

export const EVENT_TYPE_SELECT_OPTIONS: Array<{ label: string; value: TelesaleTvQuoteEventType }> = [
  { label: '📘 Book Mới', value: 'BOOK' },
  { label: '🚪 Check-in Salon', value: 'CHECKIN' },
  { label: '👑 Chốt Combo', value: 'COMBO' },
  { label: '💰 Khách Có Tip', value: 'TIP' },
  { label: '✅ Hoàn Tất Done', value: 'DONE' },
  { label: '🔥 Chuỗi Nổ Đơn', value: 'STREAK' },
  { label: '🌅 Mở Bát Sáng', value: 'MORNING' },
];

export const EVENT_TYPE_FILTER_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '🎯 Tất cả sự kiện', value: 'ALL' },
  ...EVENT_TYPE_SELECT_OPTIONS,
];

export const PERSONA_OPTIONS: TvPersonaOption[] = [
  {
    key: 'MC_HOI_CHO',
    label: 'MC Hội Chợ / BLV',
    icon: '🎪',
    voice: 'vi-VN-NamMinhNeural',
    rate: '+15%',
    pitch: '+6Hz',
  },
  { key: 'DRAMA_QUEEN', label: 'Cụ Tổ Drama', icon: '🎭', voice: 'vi-VN-HoaiMyNeural', rate: '+6%', pitch: '+14Hz' },
  { key: 'THAY_BOI', label: 'Thầy Bói Phán Số', icon: '🔮', voice: 'vi-VN-NamMinhNeural', rate: '-8%', pitch: '-8Hz' },
  { key: 'GEN_Z', label: 'Gen Z Chúa Tể Meme', icon: '📱', voice: 'vi-VN-HoaiMyNeural', rate: '+10%', pitch: '+4Hz' },
  { key: 'TONG_TAI', label: 'Tổng Tài Sến Sẩm', icon: '🕶️', voice: 'vi-VN-NamMinhNeural', rate: '+0%', pitch: '-4Hz' },
];

export const VARIABLE_TAGS: TvQuoteVariableTag[] = [
  { tag: '[Tên]', label: 'Tên nhân viên (VD: Thanh Vũ)', desc: 'Tên bạn telesales nổ đơn' },
  { tag: '[Gói Combo]', label: 'Gói combo (VD: Combo Siêu Sợi)', desc: 'Tên dịch vụ combo chốt được' },
  { tag: '[Giá Combo]', label: 'Giá combo (VD: trị giá 850.000đ)', desc: 'Giá trị tiền của gói combo' },
  { tag: '[Tiền Tip]', label: 'Tiền tip (VD: 50.000đ)', desc: 'Số tiền khách tip' },
  { tag: '[Chuyên Viên]', label: 'Tên Chuyên Viên (VD: Chuyên Viên Thúy Kiều)', desc: 'Chuyên Viên kỹ thuật' },
  { tag: '[Tên Khách]', label: 'Tên khách (VD: Chị Mai)', desc: 'Khách hàng liên quan' },
];

/** Resolves the voice/persona metadata for a quote, falling back to the primary MC persona. */
export function findPersonaOption(personaKey: TelesaleTvPersonaKey): TvPersonaOption {
  return PERSONA_OPTIONS.find((opt) => opt.key === personaKey) || PERSONA_OPTIONS[0];
}

/** Replaces dynamic placeholder variables with realistic demo values for TTS audio preview. */
export function buildSampleQuoteText(template: string): string {
  return template
    .replace(/\[Tên\]/g, 'Thanh Vũ')
    .replace(/\[Gói Combo\]/g, 'Combo Nâng Mi Siêu Sợi')
    .replace(/\[Giá Combo\]/g, 'trị giá 850.000 đồng')
    .replace(/\[Tiền Tip\]/g, '50.000 đồng')
    .replace(/\[Chuyên Viên\]/g, 'Chuyên Viên Thúy Kiều')
    .replace(/\[Tên Khách\]/g, 'Chị Ngọc');
}

/** Filters celebration quotes by persona, event type, and case-insensitive template substring. */
export function filterTvQuotes(
  quotes: TelesaleTvQuoteItem[],
  selectedPersona: string,
  selectedEventType: string,
  searchQuery: string
): TelesaleTvQuoteItem[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  return quotes.filter((quote) => {
    if (selectedPersona !== 'ALL' && quote.personaKey !== selectedPersona) return false;
    if (selectedEventType !== 'ALL' && quote.eventType !== selectedEventType) return false;
    if (normalizedQuery) {
      return quote.template.toLowerCase().includes(normalizedQuery);
    }
    return true;
  });
}

/** Splits a quote template into plain text and bracketed variable placeholder segments. */
export function splitTemplateVariableParts(template: string): TvTemplateSegment[] {
  return template.split(/(\[[^\]]+\])/g).map((part) => ({
    text: part,
    isVariable: part.startsWith('[') && part.endsWith(']'),
  }));
}
