export interface BookingItem {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerId: number;
  customerVisits: number;
  customerNote: string;
  timeSlot: string;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number; // minutes
  assignedStaffName?: string;
  assignedStaffId?: number;
  assignedStaffAvatar?: string;
  customerAvatar?: string;
  assignedBed?: string;
  status: 'INCOMING' | 'CHECKED_IN' | 'SERVICING' | 'DONE' | 'CANCELLED';
  attributes?: {
    style: string;
    curl: string;
    length: string;
    thickness: string;
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
  }>;
  billing?: {
    subtotal: number;
    serviceTotal: number;
    productTotal: number;
    paymentMethod: 'CASH' | 'POS' | 'VIETQR';
    tipAmount: number;
    tipCvShare: number;
    tipCcShare: number;
    grandTotal: number;
  };
}

export const INITIAL_BOOKINGS: BookingItem[] = [
  {
    id: 101,
    orderNumber: 'BK-0915-01',
    customerName: 'Chị Mai Anh',
    customerPhone: '0903.112.334',
    customerId: 10421,
    customerVisits: 6,
    customerNote: 'Thích phong cách tự nhiên nhẹ nhàng',
    timeSlot: '09:00',
    serviceName: 'Nối mi Classic Nhật Bản',
    servicePrice: 450000,
    serviceDuration: 60,
    assignedStaffName: 'Bảo Trâm',
    assignedStaffId: 46110,
    assignedBed: 'Giường 01',
    status: 'DONE',
  },
  {
    id: 102,
    orderNumber: 'BK-0915-02',
    customerName: 'Chị Thu Thảo',
    customerPhone: '0918.445.667',
    customerId: 10552,
    customerVisits: 11,
    customerNote: 'Dặm mi định kỳ 2 tuần',
    timeSlot: '09:30',
    serviceName: 'Dặm mi Thiết kế Wings',
    servicePrice: 300000,
    serviceDuration: 45,
    assignedStaffName: 'Ngọc Lan',
    assignedStaffId: 46188,
    assignedBed: 'Giường 02',
    status: 'SERVICING',
  },
  {
    id: 103,
    orderNumber: 'BK-0915-03',
    customerName: 'Chị Quyên',
    customerPhone: '0937.554.430',
    customerId: 10735,
    customerVisits: 15,
    customerNote: 'Mắt nhạy cảm, thích tự nhiên, mi mảnh mềm. Yêu cầu CV Thảo Ly.',
    timeSlot: '10:30',
    serviceName: 'Nối mi New Flawless',
    servicePrice: 550000,
    serviceDuration: 75,
    assignedStaffName: 'Thảo Ly',
    assignedStaffId: 46272,
    assignedBed: 'Giường 03',
    status: 'INCOMING',
    attributes: {
      style: 'New Flawless',
      curl: 'C',
      length: '10-12mm',
      thickness: '0.07mm',
      notes: 'Form mắt bồ câu, mi thật khỏe nhưng nhạy cảm gel pad.',
    },
    progress: {
      elapsedSeconds: 4468, // 01:14:28
      timerRunning: false,
      beforePhotoUrl: '/assets/lash_before.jpg',
      afterPhotoUrl: '/assets/lash_after.jpg',
    },
    survey: {
      rating: 5,
      emotion: 'happy',
      feedbackNote: 'Mi làm rất êm, nhẹ mắt, không cay chút nào. Rất thích!',
    },
    cartProducts: [
      {
        productId: 36,
        productName: 'Cây dưỡng mi Yeppeum 6ml',
        price: 1100000,
        quantity: 1,
      },
    ],
    billing: {
      subtotal: 1650000,
      serviceTotal: 550000,
      productTotal: 1100000,
      paymentMethod: 'VIETQR',
      tipAmount: 50000,
      tipCvShare: 35000,
      tipCcShare: 10000,
      grandTotal: 1700000,
    },
  },
  {
    id: 104,
    orderNumber: 'BK-0915-04',
    customerName: 'Chị Kim Ngân',
    customerPhone: '0982.778.899',
    customerId: 10890,
    customerVisits: 3,
    customerNote: 'Khách nối lần đầu cho tiệc cưới cuối tuần',
    timeSlot: '11:15',
    serviceName: 'Nối mi Volume Thiết Kế',
    servicePrice: 650000,
    serviceDuration: 90,
    status: 'INCOMING',
  },
  {
    id: 105,
    orderNumber: 'BK-0915-05',
    customerName: 'Chị Bích Trâm',
    customerPhone: '0908.223.114',
    customerId: 10912,
    customerVisits: 8,
    customerNote: 'Thích dáng mắt mèo quyến rũ',
    timeSlot: '13:00',
    serviceName: 'Nối mi Sexy Cat Eye',
    servicePrice: 600000,
    serviceDuration: 80,
    status: 'INCOMING',
  },
];

export const STAFF_QUEUE = [
  { id: 46272, name: 'Thảo Ly', role: 'Chuyên Viên Mi', status: 'READY', bed: 'Giường 03', rating: 4.95, avatar: '👩‍🦰' },
  { id: 46110, name: 'Bảo Trâm', role: 'Chuyên Viên Mi', status: 'BUSY', bed: 'Giường 01', rating: 4.88, avatar: '👱‍♀️' },
  { id: 46188, name: 'Ngọc Lan', role: 'Chuyên Viên Mi', status: 'BUSY', bed: 'Giường 02', rating: 4.92, avatar: '👩' },
  {
    id: 46305,
    name: 'Ánh Tuyết',
    role: 'Chuyên Viên Mi',
    status: 'READY',
    bed: 'Giường 04',
    rating: 4.85,
    avatar: '👩‍🦱',
  },
  {
    id: 46320,
    name: 'Hồng Hạnh',
    role: 'Chuyên Viên Mi',
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
