import type { ComboPackageOption, SerumTierOption } from '@mos-lab/shared';

export const KNOWN_STAFF_AVATARS: Record<string, string> = {
  '3832': 'https://cdn.wingslashes.com/uploads/user/avatar/744/thumbnail/3744.jpg', // Ánh Tuyết (CV)
  '13783': 'https://cdn.wingslashes.com/uploads/user/avatar/400/thumbnail/15400.png', // Khanh Cao (CVL)
  '46272': 'https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png', // Thảo Ly (CVL)
  '25337': 'https://cdn.wingslashes.com/uploads/user/avatar/955/thumbnail/26955.jpg', // Tuyết Nhi ❤️ (CV)
  '49076': 'https://cdn.wingslashes.com/uploads/user/avatar/693/thumbnail/50693.png', // Phương Nhi (CV)
  '37790': 'https://cdn.wingslashes.com/uploads/user/avatar/407/thumbnail/39407.png', // Diễm Hương (CC)
  '51540': 'https://cdn.wingslashes.com/uploads/user/avatar/157/thumbnail/53157.png', // Bảo Hân CC
  '45103': 'https://cdn.wingslashes.com/uploads/user/avatar/720/thumbnail/46720.png', // Nguyễn Quang Khải
  '48791': 'https://cdn.wingslashes.com/uploads/user/avatar/408/thumbnail/50408.png', // Tâm Nguyễn Booker
  '45656': 'https://cdn.wingslashes.com/uploads/user/avatar/408/thumbnail/50408.png', // Tâm Nguyễn Booker
  '46401': 'https://cdn.wingslashes.com/uploads/user/avatar/742/thumbnail/48001.png', // Thanh Vũ Telesales
};

export function resolveStaffAvatarUrl(
  dbAvatar?: string | null,
  staffId?: number | null,
  staffName?: string | null
): string | undefined {
  if (dbAvatar && typeof dbAvatar === 'string') {
    const trimmed = dbAvatar.trim();
    if (trimmed.startsWith('http') || trimmed.startsWith('/api/') || trimmed.startsWith('/uploads/')) {
      return trimmed;
    }
  }
  if (staffId && KNOWN_STAFF_AVATARS[String(staffId)]) {
    return KNOWN_STAFF_AVATARS[String(staffId)];
  }
  if (staffName) {
    const s = staffName.toLowerCase();
    if (s.includes('ánh tuyết')) return KNOWN_STAFF_AVATARS['3832'];
    if (s.includes('khanh cao') || s.includes('khanh')) return KNOWN_STAFF_AVATARS['13783'];
    if (s.includes('thảo ly')) return KNOWN_STAFF_AVATARS['46272'];
    if (s.includes('tuyết nhi')) return KNOWN_STAFF_AVATARS['25337'];
    if (s.includes('phương nhi')) return KNOWN_STAFF_AVATARS['49076'];
    if (s.includes('diễm hương')) return KNOWN_STAFF_AVATARS['37790'];
    if (s.includes('bảo hân')) return KNOWN_STAFF_AVATARS['51540'];
    if (s.includes('khải')) return KNOWN_STAFF_AVATARS['45103'];
    if (s.includes('tâm')) return KNOWN_STAFF_AVATARS['45656'];
    if (s.includes('thanh vũ')) return KNOWN_STAFF_AVATARS['46401'];
  }
  return undefined;
}

export const COMBO_PACKAGES_CVL: ComboPackageOption[] = [
  {
    id: 'combo-flawless-5',
    name: 'Combo 5 lần Flawless Mink',
    sessions: 5,
    price: 4500000,
    cvBonus: 200000,
    badge: '+200K',
  },
  {
    id: 'combo-hyperlight-5',
    name: 'Combo 5 lần HyperLight',
    sessions: 5,
    price: 3500000,
    cvBonus: 150000,
    badge: '+150K',
  },
  {
    id: 'combo-classic-3',
    name: 'Combo 3 lần Classic Design',
    sessions: 3,
    price: 2500000,
    cvBonus: 100000,
    badge: '+100K',
  },
  {
    id: 'combo-under-5',
    name: 'Combo 5 lần Mi Dưới (LashesUnder)',
    sessions: 5,
    price: 1500000,
    cvBonus: 50000,
    badge: '+50K',
  },
];

export const SERUM_TIERS_CVL: SerumTierOption[] = [
  {
    id: 'serum-orig',
    label: 'Giá gốc 1.100.000đ',
    price: 1100000,
    cvBonus: 100000,
    desc: 'Thưởng CVL: +100K/cây',
  },
  {
    id: 'serum-disc-light',
    label: 'Ưu đãi < 50% (770.000đ)',
    price: 770000,
    cvBonus: 50000,
    desc: 'Thưởng CVL: +50K/cây',
  },
  {
    id: 'serum-disc-deep',
    label: 'Giảm sâu ≥ 50% (550.000đ)',
    price: 550000,
    cvBonus: 10000,
    desc: 'Thưởng CVL: +10K/cây',
  },
  {
    id: 'serum-free',
    label: 'Tặng kèm Combo (Trị giá 1.100.000đ)',
    price: 0,
    cvBonus: 1000,
    desc: 'Thưởng CVL: +1K/cây',
  },
];

export const STAFF_QUEUE = [
  {
    id: 46272,
    name: 'Thảo Ly',
    role: 'CVL · Chuyên Viên Tự Chủ',
    status: 'READY',
    bed: 'Giường 03',
    rating: 4.95,
    avatar: '👩‍🦰',
  },
  {
    id: 25337,
    name: 'Tuyết Nhi ❤️',
    role: 'Chuyên Viên Mi (CV)',
    status: 'READY',
    bed: 'Giường 01',
    rating: 4.98,
    avatar: '👱‍♀️',
  },
  {
    id: 49076,
    name: 'Phương Nhi',
    role: 'Chuyên Viên Mi (CV)',
    status: 'READY',
    bed: 'Giường 02',
    rating: 4.92,
    avatar: '👩',
  },
  {
    id: 3832,
    name: 'Ánh Tuyết',
    role: 'Chuyên Viên Mi (CV)',
    status: 'READY',
    bed: 'Giường 04',
    rating: 4.85,
    avatar: '👩‍🦱',
  },
  {
    id: 13783,
    name: 'Khanh Cao',
    role: 'CVL · Chuyên Viên Tự Chủ',
    status: 'READY',
    bed: 'Giường 01',
    rating: 4.95,
    avatar: '👧',
  },
];

export const SALON_INFO = {
  storeId: 6,
  name: 'Wings Beauty Salon Đề Thám',
  address: '159A Đề Thám, P. Cô Giang, Quận 1, TP.HCM',
  hotline: '0937.554.430',
  currentCc: { id: 37790, name: 'Diễm Hương', role: 'Tư Vấn Viên Quầy' },
};
