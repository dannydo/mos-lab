import dayjs from 'dayjs';
import type { MosChatConversation, MosChatCustomerCard, MosChatStaffMember, MosChatTaskItem } from '@mos-lab/shared';

export const AI_COPILOT_CONV_ID = 'dm-wings-ai-copilot';
export const AI_COPILOT_GROUP_ACCESS_KEY = 'mos_chat_ai_copilot_allowed_groups_v1';
export const STAFF_DIRECTORY_CACHE_KEY = 'mos_chat_staff_directory_v1';

export const AI_QUICK_PROMPTS = [
  {
    label: 'Giải thích nhóm khách (Buckets)',
    prompt: 'Giải thích các nhóm khách hàng COMBO_LIVE, NOT_COMBO_LIVE, COMBO_DEAD và SINGLE trong hệ thống mOS.',
  },
  {
    label: 'Lọc khách NYC 60 chi tiêu > 1tr',
    prompt:
      'Lọc giúp tôi các khách hàng NYC 60 (31 đến 60 ngày chưa ghé) có tổng chi tiêu trên 1 triệu đồng để gọi nhắc dặm mi.',
  },
  {
    label: 'Khách hàng được giao cho tôi',
    prompt: 'Lọc danh sách khách hàng đang được phân bổ cho riêng tôi.',
  },
  {
    label: 'Tư vấn quy trình CSKH dặm mi',
    prompt: 'Tư vấn quy trình và thời điểm gọi chăm sóc khách hàng dặm mi chuẩn để tối ưu tỷ lệ quay lại.',
  },
] as const;

export interface SpaceDepartmentOrTeamGroup {
  key: string;
  category: 'department' | 'team';
  label: string;
  shortLabel: string;
  color: string;
  defaultSlug: string;
  defaultSubtitle: string;
}

export const SPACE_DEPARTMENT_AND_TEAM_GROUPS: SpaceDepartmentOrTeamGroup[] = [
  // 4 Core Departments (Bộ phận)
  {
    key: 'DEPT_SHOP',
    category: 'department',
    label: '🏢 Shop Operations',
    shortLabel: 'Shop Ops',
    color: '#d4a72c',
    defaultSlug: 'shop-operations',
    defaultSubtitle: 'Không gian vận hành cửa hàng · Tư Vấn CC · Chuyên Viên Mi · QA/QC',
  },
  {
    key: 'DEPT_GROWTH',
    category: 'department',
    label: '📈 Growth & Booking',
    shortLabel: 'Growth & Booking',
    color: '#fa8c16',
    defaultSlug: 'growth-booking',
    defaultSubtitle: 'Không gian điều phối lịch hẹn · Telesales · Booker · CS & Control',
  },
  {
    key: 'DEPT_ACADEMY',
    category: 'department',
    label: '🎓 Academy & Marketing',
    shortLabel: 'Academy',
    color: '#a855f7',
    defaultSlug: 'academy-marketing',
    defaultSubtitle: 'Không gian đào tạo Academy · Giảng Viên · Marketing & Sales',
  },
  {
    key: 'DEPT_BACK_OFFICE',
    category: 'department',
    label: '🛡️ Back Office & Quản Trị',
    shortLabel: 'Back Office',
    color: '#3b82f6',
    defaultSlug: 'back-office-quan-tri',
    defaultSubtitle: 'Không gian điều hành Ban Quản Trị · Quản lý · Nội bộ',
  },
  // Specialized Teams / Roles (Nhóm chuyên môn)
  {
    key: 'TEAM_CORE',
    category: 'team',
    label: '⭐ Core Team',
    shortLabel: 'Core Team',
    color: '#722ed1',
    defaultSlug: 'core-team',
    defaultSubtitle: 'Không gian phối hợp Ban Điều Hành & Đội Ngũ Cốt Lõi',
  },
  {
    key: 'TEAM_ADMIN_MANAGER',
    category: 'team',
    label: '👑 Ban Quản Trị & Manager',
    shortLabel: 'Admin / Manager',
    color: '#d4a84b',
    defaultSlug: 'ban-quan-tri-manager',
    defaultSubtitle: 'Không gian trao đổi Ban Giám Đốc, Admin và Quản lý',
  },
  {
    key: 'TEAM_CC',
    category: 'team',
    label: '💬 Tư Vấn Viên (CC)',
    shortLabel: 'Tư vấn CC',
    color: '#10b981',
    defaultSlug: 'tu-van-cc',
    defaultSubtitle: 'Không gian phối hợp đội ngũ Tư Vấn Viên Client Consultant',
  },
  {
    key: 'TEAM_CV',
    category: 'team',
    label: '✨ Chuyên Viên Mi (CV)',
    shortLabel: 'Chuyên Viên Mi',
    color: '#14b8a6',
    defaultSlug: 'chuyen-vien-mi-cv',
    defaultSubtitle: 'Không gian trao đổi đội ngũ Chuyên Viên Kỹ Thuật & Nghệ Nhân Mi',
  },
  {
    key: 'TEAM_TELESALES',
    category: 'team',
    label: '📞 Telesales & Booker',
    shortLabel: 'Telesales / Booker',
    color: '#0ea5e9',
    defaultSlug: 'telesales-booker',
    defaultSubtitle: 'Không gian chiến dịch gọi chăm sóc khách & đặt lịch Booker',
  },
  {
    key: 'TEAM_CS_CONTROL',
    category: 'team',
    label: '🎧 CS & Control',
    shortLabel: 'CS & Control',
    color: '#f59e0b',
    defaultSlug: 'cs-control',
    defaultSubtitle: 'Không gian chăm sóc khách hàng CS & Điều phối Control',
  },
  {
    key: 'TEAM_ACADEMY',
    category: 'team',
    label: '🎓 Giảng Viên Academy',
    shortLabel: 'Giảng viên',
    color: '#8b5cf6',
    defaultSlug: 'giang-vien-academy',
    defaultSubtitle: 'Không gian chuyên môn đội ngũ Giảng Viên & Đào tạo',
  },
  {
    key: 'TEAM_QA_QC',
    category: 'team',
    label: '🏅 QA / QC',
    shortLabel: 'QA / QC',
    color: '#ec4899',
    defaultSlug: 'qa-qc-chat-luong',
    defaultSubtitle: 'Không gian kiểm soát chất lượng dịch vụ & trải nghiệm khách hàng',
  },
  {
    key: 'TEAM_INTERNAL',
    category: 'team',
    label: '🏠 Vận Hành / Nội Bộ',
    shortLabel: 'Vận hành',
    color: '#64748b',
    defaultSlug: 'van-hanh-noi-bo',
    defaultSubtitle: 'Không gian phối hợp vận hành nội bộ & hậu cần',
  },
];

export const getInitialStaffDirectory = (): MosChatStaffMember[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STAFF_DIRECTORY_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: MosChatStaffMember) => ({ ...item, isOnline: false }));
      }
    }
  } catch {
    // ignore parse error
  }
  return [];
};

export const FALLBACK_CONVERSATIONS: MosChatConversation[] = [
  {
    id: 'space-cc',
    type: 'space',
    name: 'tư-vấn-cc-ca-hôm-nay',
    subtitle: 'Phối hợp đón khách giữa Telesales Booker · Tư Vấn CC · Chuyên Viên Mi',
    roleTag: '12',
    color: '#10b981',
    memberCount: 12,
    unreadCount: 2,
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg-seed-1',
        conversationId: 'space-cc',
        senderId: 'staff-tn',
        senderName: 'Tuyết Nhi',
        senderRole: 'Telesales',
        senderAvatar: 'TN',
        roleColor: '#0ea5e9',
        text: 'Chị Nguyễn Bích Ngọc (VIP Diamond) vừa báo sẽ tới sớm lúc 15:15 hôm nay để nối mi Anime Thiết Kế.',
        timeLabel: '14:42',
        createdAt: new Date().toISOString(),
        pinned: true,
        reactions: { '❤️': 3, '🔥': 2 },
        customerCard: {
          name: 'Chị Nguyễn Bích Ngọc',
          meta: 'VIP Diamond · 15:15 hôm nay',
          cvName: 'Chuyên Viên Minh Thư (CV+)',
        },
        thread: [
          {
            id: 'th-seed-2',
            senderId: 'staff-mt',
            senderName: 'Chuyên Viên Minh Thư',
            senderRole: 'Chuyên Viên Tự Chủ (CV+)',
            senderAvatar: 'MT',
            text: 'Giường VIP 02 đã khử khuẩn sẵn sàng đón khách.',
            timeLabel: '14:44',
            createdAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'msg-seed-3',
        conversationId: 'space-cc',
        senderId: 'staff-mt',
        senderName: 'Chuyên Viên Minh Thư',
        senderRole: 'Chuyên Viên Tự Chủ (CV+)',
        senderAvatar: 'MT',
        roleColor: '#14b8a6',
        text: 'Em vừa xong ca trước, khay dụng cụ mi thiết kế đã khử khuẩn đầy đủ.',
        timeLabel: '14:46',
        createdAt: new Date().toISOString(),
        reactions: { '🎉': 4 },
        thread: [],
      },
    ],
  },
  {
    id: 'space-telesales',
    type: 'space',
    name: 'telesales-booker',
    subtitle: 'Chiến dịch gọi chăm sóc khách Combo Live & Khách cũ quay lại',
    roleTag: '8',
    color: '#f59e0b',
    memberCount: 8,
    unreadCount: 0,
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg-seed-tele-1',
        conversationId: 'space-telesales',
        senderId: 'staff-tn',
        senderName: 'Tuyết Nhi',
        senderRole: 'Telesales',
        senderAvatar: 'TN',
        roleColor: '#0ea5e9',
        text: 'Ca chiều còn 3 khung 16:30 của Chuyên Viên Kỹ Thuật, ưu tiên gọi tệp khách gần hạn dặm mi.',
        timeLabel: '14:15',
        createdAt: new Date().toISOString(),
        reactions: { '🔥': 5 },
        thread: [],
      },
    ],
  },
  {
    id: 'space-cv',
    type: 'space',
    name: 'chuyên-viên-mi-tầng-1',
    subtitle: 'Kênh điều phối tua và chuẩn bị dụng cụ của đội ngũ Chuyên Viên Mi',
    roleTag: '15',
    color: '#14b8a6',
    memberCount: 15,
    unreadCount: 0,
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg-seed-cv-1',
        conversationId: 'space-cv',
        senderId: 'staff-mt',
        senderName: 'Chuyên Viên Minh Thư',
        senderRole: 'Chuyên Viên Tự Chủ (CV+)',
        senderAvatar: 'MT',
        roleColor: '#14b8a6',
        text: 'Nhờ kho bổ sung thêm 5 khay mi cong C 0.07 dài 11mm lên tủ Chuyên Viên tầng 1 trước 16:00.',
        timeLabel: '13:50',
        createdAt: new Date().toISOString(),
        reactions: { '👍': 3 },
        thread: [],
      },
    ],
  },
];

export const FALLBACK_TASKS: MosChatTaskItem[] = [];

export const SAMPLE_CUSTOMER_CARDS: MosChatCustomerCard[] = [
  {
    name: 'Chị Nguyễn Bích Ngọc',
    meta: 'VIP Diamond · 15:15 hôm nay',
    cvName: 'Chuyên Viên Minh Thư (CV+)',
  },
  {
    name: 'Chị Trần Bảo Trân',
    meta: 'Khách Mới · 16:15 Mi Thiết Kế',
    cvName: 'Chuyên Viên Thanh Tâm (CV)',
  },
  {
    name: 'Chị Lê Hoàng Yến',
    meta: 'Cần xác nhận · 17:30 hôm nay',
    cvName: 'Chuyên Viên Ngọc Ánh (CV+)',
  },
];

export interface ReminderPreset {
  id: string;
  label: string;
  seconds: number;
  getSeconds: () => number;
}

export const REMINDER_PRESETS: ReminderPreset[] = [
  { id: 'none', label: 'Không hẹn giờ', seconds: 0, getSeconds: () => 0 },
  { id: '15m', label: '15 phút', seconds: 900, getSeconds: () => 900 },
  { id: '30m', label: '30 phút', seconds: 1800, getSeconds: () => 1800 },
  { id: '1h', label: '1 giờ', seconds: 3600, getSeconds: () => 3600 },
  {
    id: '1730',
    label: '17:30 hôm nay',
    seconds: 7200,
    getSeconds: () => {
      const now = dayjs();
      let target = now.hour(17).minute(30).second(0);
      if (target.isBefore(now)) {
        target = target.add(1, 'day');
      }
      return Math.max(60, target.diff(now, 'second'));
    },
  },
  {
    id: '0900',
    label: '09:00 sáng mai',
    seconds: 86400,
    getSeconds: () => {
      const now = dayjs();
      const target = now.add(1, 'day').hour(9).minute(0).second(0);
      return Math.max(60, target.diff(now, 'second'));
    },
  },
];

export interface DeadlinePreset {
  id: string;
  label: string;
  getDate: () => dayjs.Dayjs | null;
}

export const DEADLINE_PRESETS: DeadlinePreset[] = [
  {
    id: 'today-1730',
    label: '17:30 hôm nay',
    getDate: () => {
      const now = dayjs();
      let target = now.hour(17).minute(30).second(0);
      if (target.isBefore(now)) target = target.add(1, 'day');
      return target;
    },
  },
  {
    id: 'today-2200',
    label: '22:00 hôm nay',
    getDate: () => {
      const now = dayjs();
      let target = now.hour(22).minute(0).second(0);
      if (target.isBefore(now)) target = target.add(1, 'day');
      return target;
    },
  },
  {
    id: 'tomorrow-1200',
    label: '12:00 trưa mai',
    getDate: () => dayjs().add(1, 'day').hour(12).minute(0).second(0),
  },
  {
    id: 'tomorrow-1730',
    label: '17:30 chiều mai',
    getDate: () => dayjs().add(1, 'day').hour(17).minute(30).second(0),
  },
  {
    id: 'in-2-days',
    label: 'Trong 2 ngày',
    getDate: () => dayjs().add(2, 'day').hour(17).minute(30).second(0),
  },
  {
    id: 'none',
    label: 'Không đặt hạn',
    getDate: () => null,
  },
];

export const GOOGLE_CHAT_QUICK_EMOJIS = ['🪽', '💎', '❤️', '👍', '✅'] as const;

export const WINGS_SIGNATURE_EMOJIS = [
  '🪽',
  '🪶',
  '🥚',
  '🐣',
  '🐥',
  '🐔',
  '🍗',
  '👼',
  '🍌',
  '💎',
  '👀',
  '🔮',
  '💃',
  '💰',
  '©️',
  '👍',
  '✅',
  '🟢',
  '⚫',
] as const;

export const GOOGLE_CHAT_REACTION_EMOJIS = [
  '❤️',
  '🔥',
  '😂',
  '🎉',
  '👏',
  '🙏',
  '💯',
  '🚀',
  '😍',
  '🥰',
  '😎',
  '🤩',
  '🤝',
  '💪',
  '✨',
  '🌸',
  '👑',
  '🫡',
] as const;

export interface SpacePaletteColor {
  color: string;
  name: string;
}

export const GOOGLE_CHAT_SPACE_PALETTE: SpacePaletteColor[] = [
  { color: '#1a73e8', name: 'Google Blue' },
  { color: '#10b981', name: 'Emerald' },
  { color: '#8b5cf6', name: 'Purple' },
  { color: '#ec4899', name: 'Rose Pink' },
  { color: '#f59e0b', name: 'Amber Gold' },
  { color: '#ef4444', name: 'Crimson' },
  { color: '#06b6d4', name: 'Cyan' },
  { color: '#14b8a6', name: 'Teal Mint' },
  { color: '#6366f1', name: 'Violet' },
  { color: '#64748b', name: 'Slate' },
];

export interface SpaceEmojiCategory {
  id: string;
  label: string;
  icon: string;
  emojis: string[];
}

export const GOOGLE_CHAT_SPACE_EMOJI_CATEGORIES: SpaceEmojiCategory[] = [
  {
    id: 'popular',
    label: 'Đề xuất & Phổ biến',
    icon: '⭐',
    emojis: [
      '🚀',
      '💬',
      '🎯',
      '💎',
      '🔥',
      '🏆',
      '📦',
      '🛠️',
      '📊',
      '📢',
      '💡',
      '📝',
      '🤖',
      '🛡️',
      '⚙️',
      '📂',
      '📌',
      '🔔',
      '✨',
      '👑',
    ],
  },
  {
    id: 'projects',
    label: 'Dự án & Mục tiêu',
    icon: '🚀',
    emojis: [
      '🚀',
      '🎯',
      '⚡',
      '💡',
      '🔥',
      '📈',
      '📊',
      '🏆',
      '🎖️',
      '🥇',
      '💎',
      '🔑',
      '🧭',
      '🏁',
      '⭐',
      '🌟',
      '💥',
      '☀️',
    ],
  },
  {
    id: 'operations',
    label: 'Vận hành & Kỹ thuật',
    icon: '🛠️',
    emojis: [
      '🛠️',
      '📦',
      '⚙️',
      '🛡️',
      '🤖',
      '💻',
      '🔒',
      '📋',
      '📝',
      '📂',
      '🏷️',
      '⏰',
      '⏳',
      '🔍',
      '🚨',
      '🧹',
      '🔌',
      '📡',
    ],
  },
  {
    id: 'wings',
    label: 'Wings & Sắc đẹp',
    icon: '🪽',
    emojis: [
      '🪽',
      '🌸',
      '💄',
      '💅',
      '👑',
      '☕',
      '🥑',
      '🧘',
      '💆‍♀️',
      '✨',
      '💖',
      '🥰',
      '🕊️',
      '🌿',
      '🍀',
      '🍓',
      '🎀',
      '🎉',
    ],
  },
  {
    id: 'teams',
    label: 'Đội ngũ & Phối hợp',
    icon: '👥',
    emojis: [
      '👥',
      '🤝',
      '🏢',
      '🎓',
      '📞',
      '🎧',
      '🏅',
      '🏠',
      '💬',
      '🗣️',
      '💌',
      '📬',
      '❤️',
      '👏',
      '🙌',
      '🫡',
      '💪',
      '🥳',
    ],
  },
];

export const isSpaceEmoji = (val?: string | null): boolean => {
  if (!val || typeof val !== 'string') return false;
  const s = val.trim();
  if (!s || s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) return false;
  // If length is short and contains non-ascii or emoji characters
  const hasEmojiChar = /\p{Extended_Pictographic}/u.test(s);
  return hasEmojiChar || (s.length <= 4 && !/^[A-Za-z0-9]{1,4}$/.test(s));
};
