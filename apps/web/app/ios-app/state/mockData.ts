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
  bookerName?: string;
  customerTypeIcon?: string;
  hasDiscountTag?: boolean;
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
    id: 336695,
    orderNumber: 'BK-336695',
    customerName: 'Trúc',
    customerPhone: '0933.779.207',
    customerId: 25212,
    customerAvatar: 'https://cdn.wingslashes.com/uploads/user/avatar/830/thumbnail/26830.jpg',
    customerVisits: 1,
    customerNote: '3/10 ib nhắc lịch\n30/9 ib nhắc lịch, c dời (c nhờ nhắc sớm 1\nngày chị quên)',
    timeSlot: '09:00 - 10:30',
    time12h: '09:00 am',
    serviceName: 'New Flawless Mink 770',
    serviceType: 'Normal',
    servicePrice: 770000,
    serviceDuration: 90,
    bookerName: 'Thanh Vũ',
    customerTypeIcon: '☕',
    hasDiscountTag: false,
    assignedBed: 'Giường 01',
    status: 'INCOMING',
    attributes: {
      style: 'New Flawless Mink',
      curl: 'CC',
      length: '10-12mm',
      thickness: '0.07mm',
      notes: 'Khách thích mi tự nhiên nhẹ nhàng',
    },
  },
  {
    id: 336971,
    orderNumber: 'BK-336971',
    customerName: 'Thảo',
    customerPhone: '0916.492.727',
    customerId: 51634,
    customerAvatar: undefined,
    customerVisits: 2,
    customerNote: '4/10 ĐXN, chị báo đợt này rụng hết 80%\ntìm bạn nối chắc cho chị, CANCEL\n3/10 c book',
    timeSlot: '10:30 - 12:00',
    time12h: '10:30 am',
    serviceName: 'New Hyperlight 550',
    serviceType: 'Normal',
    servicePrice: 550000,
    serviceDuration: 90,
    bookerName: 'Bảo Hân',
    customerTypeIcon: '🔄',
    hasDiscountTag: false,
    assignedBed: 'Giường 02',
    status: 'INCOMING',
    attributes: {
      style: 'New Hyperlight',
      curl: 'C',
      length: '10-11mm',
      thickness: '0.07mm',
      notes: 'Nối chắc chân mi',
    },
  },
  {
    id: 336941,
    orderNumber: 'BK-336941',
    customerName: 'Thủy',
    customerPhone: '0908.356.640',
    customerId: 16817,
    customerAvatar: 'https://cdn.wingslashes.com/uploads/user/avatar/435/thumbnail/18435.png',
    customerVisits: 3,
    customerNote: '4/10 kbm, sms nhắc lịch\n3/10 chị book\n[50%] 💤 Wake Up V1: Wellcome Back',
    timeSlot: '11:00 - 12:30',
    time12h: '11:00 am',
    serviceName: 'New Flawless Under Mink 390',
    serviceType: 'Normal',
    servicePrice: 390000,
    serviceDuration: 90,
    bookerName: 'Tâm Nguyễn',
    customerTypeIcon: '🙃',
    hasDiscountTag: true,
    assignedBed: 'Giường 03',
    status: 'INCOMING',
    attributes: {
      style: 'New Flawless Under Mink',
      curl: 'J',
      length: '6-8mm',
      thickness: '0.07mm',
      notes: 'Mi dưới tự nhiên',
    },
  },
  {
    id: 336952,
    orderNumber: 'BK-336952',
    customerName: 'Dương Thị Thanh Thuỷ',
    customerPhone: '0949.898.569',
    customerId: 18661,
    customerAvatar: 'https://cdn.wingslashes.com/uploads/user/avatar/279/thumbnail/20279.jpg',
    customerVisits: 5,
    customerNote: '4/10 ib nhắc lịch, 14h gọi chị kêu bận k\nqua với mưa và xa quá tắt rụp\n3/10 c book',
    timeSlot: '12:00 - 13:30',
    time12h: '12:00 pm',
    serviceName: 'New Hyperlight 660',
    serviceType: 'Normal',
    servicePrice: 660000,
    serviceDuration: 90,
    bookerName: 'Bích Phượng',
    customerTypeIcon: '🙃',
    hasDiscountTag: true,
    assignedBed: 'Giường 04',
    status: 'INCOMING',
    attributes: {
      style: 'New Hyperlight 660',
      curl: 'CC',
      length: '11-13mm',
      thickness: '0.07mm',
      notes: 'Thích dày đậm sắc nét',
    },
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
