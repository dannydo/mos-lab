export interface LashProgressState {
  currentStep?: number;
  timerRunning?: boolean;
  elapsedSeconds?: number;
  targetDurationMinutes?: number;
  startedAt?: string;
  completedAt?: string;
  beforePhotoUrl?: string;
  cleanedPhotoUrl?: string;
  afterPhotoUrl?: string;
  spongePhotoUrl?: string;
  cloudSynced?: boolean;
  cloudSyncedAt?: string;
  [key: string]: any;
}

export interface BookingItem {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerId: number;
  customerAvatar?: string;
  assignedStaffAvatar?: string;
  customerVisits?: number;
  customerNote?: string;
  timeSlot: string;
  time12h: string;
  serviceName: string;
  serviceType: string;
  servicePrice: number;
  serviceDuration: number;
  bookerName?: string;
  bookerAvatar?: string;
  customerTypeIcon: string;
  hasDiscountTag: boolean;
  assignedStaffName: string;
  assignedStaffId: number;
  isUnassignedQueue?: boolean;
  isNextQueueCustomer?: boolean;
  isBookedInAdvance?: boolean;
  isTuaAssigned?: boolean;
  bookingAccessTag?: 'MY_BOOKED_CUSTOMER' | 'NEXT_QUEUE_CUSTOMER' | 'STORE_CUSTOMER' | 'NEXT_CUSTOMER';
  checkInStaffId?: number;
  checkInStaffName?: string;
  checkInStaffTier?: string;
  checkInStaffAvatar?: string;
  checkOutStaffId?: number;
  checkOutStaffName?: string;
  checkOutStaffTier?: string;
  checkOutStaffAvatar?: string;
  assignedBed: string;
  status: 'INCOMING' | 'CHECKED_IN' | 'SERVICING' | 'DONE' | 'CANCELLED';
  diamondBalance?: number;
  comboLiveStatus?: {
    isComboLive: boolean;
    remainingSessions: number;
    normalRemaining?: number;
    retainRemaining?: number;
    comboName: string;
    serviceKey?: string;
    packageKey?: string;
    retainDaysLimit?: number;
    upsellOpportunity?: boolean;
  };
  underMinkComboStatus?: {
    hasUnderCombo: boolean;
    remainingSessions: number;
    normalRemaining: number;
    retainRemaining: number;
    comboName: string;
    packageKey?: string;
  };
  lashHistory?: Array<{ date: string; serviceName: string; staffName: string }>;
  selectedCombo?: any;
  attributes?: Record<string, any>;
  progress?: LashProgressState;
  survey?: any;
  upgradePrice?: number;
  cvRotationPoints?: number;
  cvRotationBreakdown?: any;
  cartProducts?: any[];
  cvRewardBreakdown?: any;
  billing?: any;
  [key: string]: any;
}

export const INITIAL_BOOKINGS: BookingItem[] = [
  {
    id: 336695,
    orderNumber: 'BK-336695',
    customerName: 'Chị Trúc',
    customerPhone: '0901.889.308',
    customerId: 25212,
    customerAvatar: 'https://cdn.wingslashes.com/uploads/user/avatar/744/thumbnail/3744.jpg',
    customerVisits: 14,
    customerNote: 'Khách quen nối tự nhiên, da mi nhạy cảm, không cay mắt.',
    timeSlot: '09:00 - 10:30',
    time12h: '09:00 am',
    serviceName: 'New Hyperlight 550 (4X · 70 fan)',
    serviceType: 'Normal',
    servicePrice: 550000,
    serviceDuration: 90,
    bookerName: 'Tâm Nguyễn',
    customerTypeIcon: '☕',
    hasDiscountTag: false,
    assignedStaffId: 46272,
    assignedStaffName: 'Thảo Ly',
    assignedBed: 'Giường 02',
    status: 'INCOMING',
    diamondBalance: 320,
    comboLiveStatus: {
      isComboLive: true,
      remainingSessions: 3,
      normalRemaining: 1,
      retainRemaining: 2,
      comboName: '❖ 5 lần New HyperLight 770 (4X · 70 fan)',
      serviceKey: 'new-hyperlight-770',
      packageKey: '4+1-hyperlight-770',
      retainDaysLimit: 25,
      upsellOpportunity: false,
    },
    lashHistory: [{ date: '05/10/2026', serviceName: 'HyperLight 550', staffName: 'Thảo Ly' }],
    attributes: {
      material: 'HyperLight',
      style: 'Natural',
      volume: '2X',
      count: '70 fan',
      color: 'Đen Tuyền (Jet Black)',
      curl: 'C',
      length: '10-12 mm',
      thickness: '0.07 mm',
      notes: 'Khách thích nhẹ êm, nối kỹ góc trong',
    },
  },
  {
    id: 336712,
    orderNumber: 'BK-336712',
    customerName: 'Khách Vãng Lai (Chị Hoa)',
    customerPhone: '0938.456.789',
    customerId: 51634,
    customerAvatar: undefined,
    customerVisits: 1,
    customerNote: 'Khách mới lần đầu ghé, thích kiểu mi tự nhiên nhẹ nhàng',
    timeSlot: '09:30 - 11:00',
    time12h: '09:30 am',
    serviceName: 'Chưa chọn mẫu mi (Tư vấn)',
    serviceType: 'Normal',
    servicePrice: 550000,
    serviceDuration: 90,
    bookerName: 'Tư vấn',
    customerTypeIcon: '☕',
    hasDiscountTag: false,
    assignedStaffId: 0,
    assignedStaffName: 'Chờ phân công (Đầu tua)',
    assignedBed: 'Giường 01',
    status: 'INCOMING',
    isUnassignedQueue: true,
    isNextQueueCustomer: true,
    bookingAccessTag: 'NEXT_QUEUE_CUSTOMER',
    diamondBalance: 0,
    comboLiveStatus: {
      isComboLive: false,
      remainingSessions: 0,
      comboName: 'Chưa có gói ❖ Live',
      retainDaysLimit: 21,
      upsellOpportunity: true,
    },
    attributes: {
      material: 'HyperLight',
      style: 'Natural',
      volume: '2X',
      count: '70 fan',
      color: 'Đen Tuyền (Jet Black)',
      curl: 'C',
      length: '10-12 mm',
      thickness: '0.07 mm',
      notes: 'Khách mới: cần soi dáng mắt & tư vấn chọn sợi',
    },
  },
  {
    id: 339086,
    orderNumber: 'BK-339086',
    customerName: 'Chị Tuyết',
    customerPhone: '0988.665.432',
    customerId: 26902,
    customerAvatar: undefined,
    customerVisits: 3,
    customerNote: 'Khách dặm mi dáng Cát Tiên nâng mí, đuôi dài sắc sảo.',
    timeSlot: '17:00 - 18:30',
    time12h: '05:00 pm',
    serviceName: 'Dặm New Classic 1D (70 sợi)',
    serviceType: 'Retain',
    servicePrice: 280000,
    serviceDuration: 75,
    bookerName: 'Tâm Nguyễn',
    customerTypeIcon: '🙃',
    hasDiscountTag: false,
    assignedStaffId: 13783,
    assignedStaffName: 'Khanh Cao',
    assignedBed: 'Giường 01',
    status: 'INCOMING',
    diamondBalance: 190,
    comboLiveStatus: {
      isComboLive: false,
      remainingSessions: 0,
      comboName: '',
      upsellOpportunity: true,
    },
    lashHistory: [{ date: '15/10/2026', serviceName: 'Classic 1D', staffName: 'Khanh Cao' }],
    attributes: {
      style: 'Natural',
      curl: 'CC',
      length: '11-13',
      thickness: '0.07',
      notes: 'Nhấn đuôi mắt dài',
    },
  },
];
