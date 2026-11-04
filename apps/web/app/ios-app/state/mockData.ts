export const KNOWN_STAFF_AVATARS: Record<string, string> = {
  '46272': 'https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png', // Thảo Ly (CV🪶)
  '25337': 'https://cdn.wingslashes.com/uploads/user/avatar/955/thumbnail/26955.jpg', // Tuyết Nhi ❤️ (🪶CV🪶)
  '49076': 'https://cdn.wingslashes.com/uploads/user/avatar/693/thumbnail/50693.png', // Phương Nhi (CV)
  '37790': 'https://cdn.wingslashes.com/uploads/user/avatar/407/thumbnail/39407.png', // Diễm Hương (CC)
  '51540': 'https://cdn.wingslashes.com/uploads/user/avatar/157/thumbnail/53157.png', // Bảo Hân CC
  '45103': 'https://cdn.wingslashes.com/uploads/user/avatar/720/thumbnail/46720.png', // Nguyễn Quang Khải
  '45656': 'https://cdn.wingslashes.com/uploads/user/avatar/781/thumbnail/47281.png', // Tâm Nguyễn Booker
  '46401': 'https://cdn.wingslashes.com/uploads/user/avatar/742/thumbnail/48001.png', // Thanh Vũ CC
};

export function resolveStaffAvatarUrl(
  dbAvatar?: string | null,
  staffId?: number | null,
  staffName?: string | null
): string | undefined {
  if (dbAvatar && typeof dbAvatar === 'string' && dbAvatar.trim().startsWith('http')) {
    if (!dbAvatar.includes('3744.jpg') && !dbAvatar.includes('719.jpg')) {
      return dbAvatar.trim();
    }
  }
  if (staffId && KNOWN_STAFF_AVATARS[String(staffId)]) {
    return KNOWN_STAFF_AVATARS[String(staffId)];
  }
  if (staffName) {
    const s = staffName.toLowerCase();
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

export interface LashHistoryPhoto {
  type: 'before' | 'cleaned' | 'after';
  label: string;
  url: string;
  sublabel?: string;
}

export interface LashHistoryStaffMember {
  role: string;
  name: string;
  avatar?: string;
  tier?: string;
}

export interface LashHistoryItem {
  id?: number;
  orderId?: number;
  date: string;
  serviceName: string;
  staffName: string;
  rating?: number;
  review?: string;
  bookingNote?: string;
  totalPrice?: number;
  photos?: LashHistoryPhoto[];
  staffMembers?: {
    bookedBy?: LashHistoryStaffMember;
    checkInBy?: LashHistoryStaffMember;
    lashedBy?: LashHistoryStaffMember;
    checkOutBy?: LashHistoryStaffMember;
  };
  attributes?: {
    style?: string;
    curl?: string;
    length?: string;
    thickness?: string;
    fanCount?: string;
    volume?: string;
    material?: string;
    color?: string;
    eyeShape?: string;
    naturalLashLength?: string;
    naturalLashThickness?: string;
    notes?: string;
  };
}

export interface ComboPackageOption {
  id: string;
  name: string;
  sessions: number;
  price: number;
  cvBonus: number;
  badge: string;
}

export interface SerumTierOption {
  id: string;
  label: string;
  price: number;
  cvBonus: number;
  desc: string;
}

export const COMBO_PACKAGES_CVL: ComboPackageOption[] = [
  {
    id: 'combo-flawless-5',
    name: 'Combo 5 lần New Flawless Mink',
    sessions: 5,
    price: 4500000,
    cvBonus: 200000,
    badge: 'Thưởng CV🪶 +200.000đ',
  },
  {
    id: 'combo-hyperlight-5',
    name: 'Combo 5 lần New HyperLight',
    sessions: 5,
    price: 3500000,
    cvBonus: 150000,
    badge: 'Thưởng CV🪶 +150.000đ',
  },
  {
    id: 'combo-classic-3',
    name: 'Combo 3 lần Classic Design',
    sessions: 3,
    price: 2500000,
    cvBonus: 100000,
    badge: 'Thưởng CV🪶 +100.000đ',
  },
  {
    id: 'combo-under-5',
    name: 'Combo 5 lần Mi Dưới (LashesUnder)',
    sessions: 5,
    price: 1500000,
    cvBonus: 50000,
    badge: 'Thưởng CV🪶 +50.000đ',
  },
];

export const SERUM_TIERS_CVL: SerumTierOption[] = [
  {
    id: 'serum-orig',
    label: 'Giá gốc 1.100.000đ',
    price: 1100000,
    cvBonus: 100000,
    desc: 'Thưởng tiền tươi CV🪶: +100.000đ/cây',
  },
  {
    id: 'serum-disc-light',
    label: 'Ưu đãi < 50% (770.000đ)',
    price: 770000,
    cvBonus: 50000,
    desc: 'Thưởng tiền tươi CV🪶: +50.000đ/cây',
  },
  {
    id: 'serum-disc-deep',
    label: 'Giảm sâu ≥ 50% (550.000đ)',
    price: 550000,
    cvBonus: 10000,
    desc: 'Thưởng tiền tươi CV🪶: +10.000đ/cây',
  },
  {
    id: 'serum-free',
    label: 'Tặng kèm Combo (0đ)',
    price: 0,
    cvBonus: 1000,
    desc: 'Thưởng tiền tươi CV🪶: +1.000đ/cây',
  },
];

export interface BookingItem {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerId: number;
  customerVisits: number;
  customerNote: string;
  timeSlot: string;
  time12h?: string;
  serviceName: string;
  serviceType?: string;
  servicePrice: number;
  serviceDuration: number; // minutes
  originalBookedServiceName?: string;
  originalBookedServicePrice?: number;
  upgradePrice?: number;
  cvRotationPoints?: number;
  cvRotationBreakdown?: string;
  bookerName?: string;
  bookerAvatar?: string;
  customerTypeIcon?: string;
  hasDiscountTag?: boolean;
  assignedStaffName?: string;
  assignedStaffId?: number;
  assignedStaffAvatar?: string;
  checkInStaffId?: number;
  checkInStaffName?: string;
  checkInStaffTier?: string;
  checkInStaffAvatar?: string;
  checkOutStaffId?: number;
  checkOutStaffName?: string;
  checkOutStaffTier?: string;
  checkOutStaffAvatar?: string;
  customerAvatar?: string;
  assignedBed?: string;
  isUnassignedQueue?: boolean;
  isNextQueueCustomer?: boolean;
  bookingAccessTag?: 'NEXT_CUSTOMER' | 'NEXT_QUEUE_CUSTOMER' | 'MY_BOOKED_CUSTOMER' | 'STORE_CUSTOMER';
  status: 'INCOMING' | 'CHECKED_IN' | 'SERVICING' | 'DONE' | 'CANCELLED';
  comboLiveStatus?: {
    isComboLive: boolean;
    remainingSessions: number;
    normalRemaining?: number;
    retainRemaining?: number;
    comboName: string;
    serviceKey?: string;
    packageKey?: string;
    retainDaysLimit?: number;
    upsellOpportunity: boolean;
  };
  underMinkComboStatus?: {
    hasUnderCombo: boolean;
    remainingSessions: number;
    normalRemaining: number;
    retainRemaining: number;
    comboName: string;
    packageKey?: string;
  };
  lashHistory?: LashHistoryItem[];
  selectedCombo?: {
    id: string;
    name: string;
    price: number;
    bonus: number;
    sessions: number;
  } | null;
  attributes?: {
    style: string;
    curl: string;
    length: string;
    thickness: string;
    material?: string;
    color?: string;
    volume?: string;
    count?: string;
    hasUnderMink?: boolean;
    underMinkServiceType?: 'Normal' | 'Retain';
    underMinkCurl?: string;
    underMinkThickness?: string;
    underMinkLength?: string;
    underMinkCount?: string;
    underMinkColor?: string;
    isOverridden?: boolean;
    overrideReason?: string;
    eyeShape?: string;
    naturalLashLength?: string;
    naturalLashThickness?: string;
    naturalLashDensity?: string;
    isNewClientDiagnosticDone?: boolean;
    lashHealth?: string;
    lashTrail?: string;
    medicalProblem?: string;
    notes?: string;
  };
  progress?: {
    beforePhotoUrl?: string;
    afterPhotoUrl?: string;
    elapsedSeconds: number;
    timerRunning: boolean;
    startedAt?: string;
    completedAt?: string;
  };
  survey?: {
    rating: number;
    emotion: 'happy' | 'satisfied' | 'neutral' | 'unhappy';
    feedbackNote?: string;
  };
  cartProducts?: Array<{
    productId: number;
    productName: string;
    price: number;
    quantity: number;
    cvBonus?: number;
  }>;
  cvRewardBreakdown?: {
    techTipPercent: number;
    checkInTipPercent: number;
    checkOutTipPercent: number;
    cvTotalTipPercent: number;
    comboBonusAmount: number;
    serumBonusAmount: number;
    totalOrderBonusForCheckoutStaff: number;
  };
  billing?: {
    subtotal: number;
    vatRate?: number;
    vatAmount?: number;
    serviceTotal: number;
    comboTotal?: number;
    productTotal: number;
    paymentMethod: 'CASH' | 'POS' | 'VIETQR';
    tipAmount: number;
    tipCvShare: number;
    tipCheckInShare?: number;
    tipCheckOutShare?: number;
    tipCcShare: number;
    grandTotal: number;
  };
}

export const INITIAL_BOOKINGS: BookingItem[] = [
  {
    id: 337001,
    orderNumber: 'BK-337001',
    customerName: 'Chị Mai Linh (Khách Mới)',
    customerPhone: '0908.112.334',
    customerId: 62105,
    customerAvatar: undefined,
    customerVisits: 1,
    customerNote:
      'Khách mới lần đầu ghé Wings! Mắt nhạy cảm nhẹ, chưa từng nối mi. Bắt buộc kiểm tra độ dài & độ dày mi thật trước khi nối.',
    timeSlot: '08:30 - 10:00',
    time12h: '08:30 am',
    serviceName: 'New Flawless Mink 770',
    serviceType: 'Normal',
    servicePrice: 770000,
    serviceDuration: 90,
    bookerName: 'Quỳnh Như',
    customerTypeIcon: '🌟',
    hasDiscountTag: false,
    assignedStaffId: 0,
    assignedStaffName: 'Chờ phân công (Đầu tua)',
    isUnassignedQueue: true,
    isNextQueueCustomer: true,
    bookingAccessTag: 'NEXT_CUSTOMER',
    assignedBed: 'Giường 01',
    status: 'INCOMING',
    comboLiveStatus: {
      isComboLive: true,
      remainingSessions: 2,
      comboName: 'Combo 5 lần New Hyperlight',
      upsellOpportunity: true,
    },
    lashHistory: [],
    attributes: {
      style: 'Natural',
      curl: 'C',
      length: '9-11 mm',
      thickness: '0.07 mm',
      naturalLashLength: '7mm',
      naturalLashThickness: '0.05-0.07mm',
      naturalLashDensity: 'Thưa (< 80 sợi/mắt)',
      eyeShape: 'Mí lót / Sụp mí (Hooded)',
      lashHealth: 'Khách mới lần đầu nối mi (Virgin Lashes)',
      lashTrail: 'Chúc xuống (Downwards)',
      isNewClientDiagnosticDone: false,
      notes: 'Khách mới lần đầu ghé, cần đo mi thật & test keo êm dịu.',
    },
  },
  {
    id: 336695,
    orderNumber: 'BK-336695',
    customerName: 'Chị Trúc',
    customerPhone: '0933.779.207',
    customerId: 25212,
    customerAvatar: 'https://cdn.wingslashes.com/uploads/user/avatar/830/thumbnail/26830.jpg',
    customerVisits: 4,
    customerNote: 'Khách thích mi tự nhiên nhẹ nhàng, mí lót nhẹ góc trong, nối êm không cay mắt.',
    timeSlot: '09:00 - 10:30',
    time12h: '09:00 am',
    serviceName: 'New Flawless Mink 770',
    serviceType: 'Normal',
    servicePrice: 770000,
    serviceDuration: 90,
    bookerName: 'Thanh Vũ',
    customerTypeIcon: '☕',
    hasDiscountTag: false,
    assignedStaffId: 46272,
    assignedStaffName: 'Thảo Ly',
    assignedBed: 'Giường 01',
    status: 'INCOMING',
    comboLiveStatus: {
      isComboLive: true,
      remainingSessions: 3,
      normalRemaining: 3,
      retainRemaining: 0,
      comboName: 'Combo 5 lần New Flawless Mink 880 (70 sợi)',
      serviceKey: 'new-flawless.mink-880',
      packageKey: '4+1-flawless-mink-880',
      retainDaysLimit: 25,
      upsellOpportunity: false,
    },
    lashHistory: [
      { date: '19/10/2026', serviceName: 'New Flawless Mink 880', staffName: 'Thảo Ly' },
      { date: '02/10/2026', serviceName: 'New Flawless Mink 880', staffName: 'Thảo Ly' },
    ],
    attributes: {
      style: 'Natural',
      curl: 'C',
      length: '10-12 mm',
      thickness: '0.10 mm',
      naturalLashLength: '8mm',
      naturalLashThickness: '0.05-0.07mm',
      naturalLashDensity: 'Vừa (80 - 120 sợi/mắt)',
      eyeShape: 'Mí lót / Sụp mí (Hooded)',
      lashHealth: 'Mi khỏe (Healthy)',
      lashTrail: 'Chúc xuống (Downwards)',
      isNewClientDiagnosticDone: true,
      notes: 'Khách thích mi tự nhiên nhẹ nhàng',
    },
  },
  {
    id: 336971,
    orderNumber: 'BK-336971',
    customerName: 'Chị Thảo',
    customerPhone: '0916.492.727',
    customerId: 51634,
    customerAvatar: undefined,
    customerVisits: 2,
    customerNote: 'Chị báo đợt trước rụng nhanh, cần khóa chân keo kỹ và tư vấn thêm dưỡng mi Yeppeum.',
    timeSlot: '10:30 - 12:00',
    time12h: '10:30 am',
    serviceName: 'New Hyperlight 770',
    serviceType: 'Normal',
    servicePrice: 770000,
    serviceDuration: 90,
    bookerName: 'Bảo Hân',
    customerTypeIcon: '🔄',
    hasDiscountTag: false,
    assignedStaffId: 46272,
    assignedStaffName: 'Thảo Ly',
    assignedBed: 'Giường 02',
    status: 'INCOMING',
    comboLiveStatus: {
      isComboLive: true,
      remainingSessions: 2,
      normalRemaining: 1,
      retainRemaining: 1,
      comboName: 'Combo 5 lần New HyperLight 770 (4X · 70 fan)',
      serviceKey: 'new-hyperlight-770',
      packageKey: '4+1-hyperlight-770',
      retainDaysLimit: 25,
      upsellOpportunity: false,
    },
    lashHistory: [{ date: '01/10/2026', serviceName: 'New Hyperlight 770', staffName: 'Thảo Ly' }],
    attributes: {
      style: 'Doll',
      curl: 'C',
      length: '10-12 mm',
      thickness: '0.05 mm',
      notes: 'Nối chắc chân mi',
    },
  },
  {
    id: 336941,
    orderNumber: 'BK-336941',
    customerName: 'Chị Thủy',
    customerPhone: '0908.356.640',
    customerId: 16817,
    customerAvatar: 'https://cdn.wingslashes.com/uploads/user/avatar/435/thumbnail/18435.png',
    customerVisits: 8,
    customerNote: '[50%] 💤 Wake Up V1: Welcome Back',
    timeSlot: '11:00 - 12:30',
    time12h: '11:00 am',
    serviceName: 'Ivylight 4L 1220',
    serviceType: 'Normal',
    servicePrice: 1220000,
    serviceDuration: 90,
    bookerName: 'Tâm Nguyễn',
    customerTypeIcon: '🙃',
    hasDiscountTag: true,
    assignedStaffId: 25337,
    assignedStaffName: 'Tuyết Nhi ❤️',
    assignedBed: 'Giường 03',
    status: 'INCOMING',
    comboLiveStatus: {
      isComboLive: true,
      remainingSessions: 4,
      normalRemaining: 4,
      retainRemaining: 0,
      comboName: 'Combo 7+3 Ivylight 4L 1220 (90 nhịp)',
      serviceKey: 'ivylight-4L-1220',
      packageKey: '7+3-ivylight-1220',
      retainDaysLimit: 25,
      upsellOpportunity: false,
    },
    lashHistory: [{ date: '20/10/2026', serviceName: 'Ivylight 4L 1220', staffName: 'Tuyết Nhi ❤️' }],
    attributes: {
      style: 'Natural',
      curl: 'LB',
      length: '10-12 mm',
      thickness: '0.07 mm',
      notes: 'Cánh tiên nâng mí tự nhiên',
    },
  },
  {
    id: 336952,
    orderNumber: 'BK-336952',
    customerName: 'Dương Thị Thanh Thủy',
    customerPhone: '0949.898.569',
    customerId: 18661,
    customerAvatar: 'https://cdn.wingslashes.com/uploads/user/avatar/279/thumbnail/20279.jpg',
    customerVisits: 5,
    customerNote: 'Khách VIP thích form mắt mèo sắc nét, đang quan tâm gói Combo 5 lần.',
    timeSlot: '12:00 - 13:30',
    time12h: '12:00 pm',
    serviceName: 'New Hyperlight 660',
    serviceType: 'Normal',
    servicePrice: 660000,
    serviceDuration: 90,
    bookerName: 'Bích Phượng',
    customerTypeIcon: '🙃',
    hasDiscountTag: true,
    assignedStaffId: 49076,
    assignedStaffName: 'Phương Nhi',
    assignedBed: 'Giường 04',
    status: 'INCOMING',
    comboLiveStatus: {
      isComboLive: false,
      remainingSessions: 0,
      comboName: 'Chưa có gói Combo Live',
      retainDaysLimit: 21,
      upsellOpportunity: true,
    },
    lashHistory: [{ date: '16/10/2026', serviceName: 'New Hyperlight 660', staffName: 'Phương Nhi' }],
    attributes: {
      style: 'Hyperlight',
      curl: 'CC',
      length: '11-13 mm',
      thickness: '0.07 mm',
      notes: 'Thích dày đậm sắc nét',
    },
  },
];

export const STAFF_QUEUE = [
  {
    id: 46272,
    name: 'Thảo Ly',
    role: 'CV🪶 · Chuyên Viên Tự Chủ',
    status: 'READY',
    bed: 'Giường 03',
    rating: 4.95,
    avatar: '👩‍🦰',
  },
  {
    id: 25337,
    name: 'Tuyết Nhi ❤️',
    role: '🪶CV🪶 · Tự Chủ Cấp Cao',
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
    role: 'Chuyên Viên Mi (CV)',
    status: 'READY',
    bed: 'Giường 05',
    rating: 4.9,
    avatar: '👧',
  },
];

export const SALON_INFO = {
  storeId: 6,
  name: 'Wings Beauty Salon Đề Thám',
  address: '112 Đề Thám, P. Cầu Ông Lãnh, Quận 1, TP.HCM',
  hotline: '0937.554.430',
  currentCc: { id: 37790, name: 'Diễm Hương', role: 'Tư Vấn Viên Quầy' },
};

/**
 * Strict CV🪶 (CVL) Customer Visibility Filter:
 * CV🪶 (1 lông) is strictly forbidden from viewing customers assigned to other Chuyên Viên.
 * CV🪶 may ONLY view:
 * 1. All customers specifically booked/assigned to this CV🪶 (`assignedStaffId === activeStaffId` or checked-in/checked-out by them).
 * 2. The 1 next upcoming unassigned customer (`INCOMING` / `CHECKED_IN` with `isUnassignedQueue` or `!assignedStaffId`) at the salon lobby so CV🪶 at the head of rotation can receive them.
 */
export function filterBookingsForCvlScope(bookings: BookingItem[], activeStaffId: number): BookingItem[] {
  let nextUnassignedIncluded = false;
  const result: BookingItem[] = [];

  for (const b of bookings) {
    const isMyBookedCustomer =
      !b.isUnassignedQueue &&
      ((b.assignedStaffId && b.assignedStaffId === activeStaffId) ||
        (b.checkInStaffId && b.checkInStaffId === activeStaffId) ||
        (b.checkOutStaffId && b.checkOutStaffId === activeStaffId));

    if (isMyBookedCustomer) {
      result.push({
        ...b,
        isNextQueueCustomer: false,
        bookingAccessTag: 'MY_BOOKED_CUSTOMER',
      });
      continue;
    }

    const isUnassignedIncoming =
      (b.status === 'INCOMING' || b.status === 'CHECKED_IN') &&
      (b.isUnassignedQueue === true || !b.assignedStaffId || b.assignedStaffId === 0);

    if (isUnassignedIncoming && !nextUnassignedIncluded) {
      nextUnassignedIncluded = true;
      result.push({
        ...b,
        isUnassignedQueue: true,
        isNextQueueCustomer: true,
        bookingAccessTag: 'NEXT_CUSTOMER',
      });
    }
  }

  return result;
}
