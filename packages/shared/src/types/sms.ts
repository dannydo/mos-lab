export interface SmsTemplate {
  id: string;
  title: string;
  content: string;
  category?: string;
  isSystem?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveSmsTemplateInput {
  id?: string;
  title: string;
  content: string;
  category?: string;
}

export interface SendSmsRequest {
  legacyUserId: number;
  toPhoneNumber: string;
  body: string;
  templateId?: string | number;
  planId?: number;
}

export interface SendSmsResponse {
  success: boolean;
  smsId: number;
  callLogId: number;
  message?: string;
}

export interface CustomerSmsHistoryItem {
  id: number;
  toPhoneNumber: string;
  body: string;
  templateId: number | string | null;
  createdStaffId: number | null;
  createdStaffName?: string;
  dateCreated: string;
}

export interface SmsVariableTagDefinition {
  tag: string;
  label: string;
  description?: string;
  exampleValue?: string;
}

export const DEFAULT_SMS_VARIABLE_TAGS: SmsVariableTagDefinition[] = [
  {
    tag: '{ten_khach}',
    label: 'Tên khách',
    description: 'Họ tên hiển thị của khách hàng',
    exampleValue: 'Chị Chị Mai',
  },
  { tag: '{sdt_khach}', label: 'SDT khách', description: 'Số điện thoại khách hàng', exampleValue: '0901234567' },
  { tag: '{han_dung}', label: 'Hạn dùng', description: 'Ngày hết hạn gói combo', exampleValue: '25/08/2026' },
  {
    tag: '{ngay_lam_near}',
    label: 'Ngày làm gần nhất',
    description: 'Ngày làm dịch vụ gần nhất',
    exampleValue: '15/07/2026',
  },
  { tag: '{so_ngay_dam}', label: 'Số ngày dặm', description: 'Số ngày thời hạn dặm mi', exampleValue: '14 ngày' },
  {
    tag: '{ten_combo}',
    label: 'Tên combo',
    description: 'Tên gói dịch vụ/combo',
    exampleValue: 'Combo Eyelash Premium',
  },
  { tag: '{sdt_cua_hang}', label: 'SDT cửa hàng', description: 'Số hotline chăm sóc tiệm', exampleValue: '0987654321' },
  {
    tag: '{url_dat_lich}',
    label: 'URL đặt lịch',
    description: 'Link đặt lịch web tự động cho khách hàng',
    exampleValue: 'https://s.wingslashes.com/Urc5SCIJ',
  },
];

export interface BookingConfirmationTemplate {
  id: string;
  type: 'no_tech' | 'has_tech' | 'late_slot' | string;
  title: string;
  content: string;
  isDefault?: boolean;
  updatedAt?: string;
}

export const DEFAULT_BOOKING_TEMPLATES: BookingConfirmationTemplate[] = [
  {
    id: 'tpl_booking_no_tech',
    type: 'no_tech',
    title: 'Lịch không book Chuyên viên',
    content: `Thông tin lịch đặt:
- Chi nhánh: {chi_nhanh}
- Ngày: {gio_hen} {thu_ngay}, {ngay_thang_nam}
- Chu kỳ: {chu_ky_ngay} ngày
Chị {ten_khach} xác nhận thông tin giúp em nhé!`,
    isDefault: true,
  },
  {
    id: 'tpl_booking_has_tech',
    type: 'has_tech',
    title: 'Lịch book Chuyên viên',
    content: `Thông tin lịch đặt:
- Chi nhánh: {chi_nhanh}
- Ngày: {gio_hen} {thu_ngay}, {ngay_thang_nam}
- Chuyên viên: {ten_chuyen_vien} (Chuyên viên được giữ 15 phút)
- Chu kỳ: {chu_ky_ngay} ngày
Chị {ten_khach} xác nhận thông tin giúp em nhé!`,
    isDefault: true,
  },
  {
    id: 'tpl_booking_late_slot',
    type: 'late_slot',
    title: 'Lịch khung cuối 20:00 giờ',
    content: `Thông tin lịch đặt:
- Chi nhánh: {chi_nhanh}
- Ngày: {gio_hen} {thu_ngay}, {ngay_thang_nam}
- Chu kỳ: {chu_ky_ngay} ngày
Dạ vì 20:00 là khung chốt ca cuối ngày, tiệm em xin phép giữ lịch và chờ chị tối đa 15 phút (đến 20:15) để đảm bảo đủ thời gian làm mi đẹp nhất. Chị {ten_khach} sắp xếp đến đúng giờ giúp em nha!
Chị {ten_khach} xác nhận thông tin giúp em nha!`,
    isDefault: true,
  },
  {
    id: 'tpl_booking_has_tech_late_slot',
    type: 'has_tech_late_slot',
    title: 'Lịch book Chuyên viên khung 20:00',
    content: `Thông tin lịch đặt:
- Chi nhánh: {chi_nhanh}
- Ngày: {gio_hen} {thu_ngay}, {ngay_thang_nam}
- Chuyên viên: {ten_chuyen_vien} (Chuyên viên được giữ 15 phút)
- Chu kỳ: {chu_ky_ngay} ngày
Dạ vì 20:00 là khung chốt ca cuối ngày, tiệm em xin phép giữ lịch và chờ chị tối đa 15 phút (đến 20:15) để đảm bảo đủ thời gian làm mi đẹp nhất. Chị {ten_khach} sắp xếp đến đúng giờ giúp em nha!
Chị {ten_khach} xác nhận thông tin giúp em nha!`,
    isDefault: true,
  },
];

export const BOOKING_TEMPLATE_TAGS = [
  { tag: '{ten_khach}', label: 'Tên KH', description: 'Tên của khách hàng' },
  { tag: '{chi_nhanh}', label: 'Chi nhánh', description: 'Chi nhánh làm dịch vụ' },
  { tag: '{gio_hen}', label: 'Giờ hẹn', description: 'Giờ hẹn đặt lịch' },
  { tag: '{thu_ngay}', label: 'Thứ', description: 'Thứ trong tuần' },
  { tag: '{ngay_thang_nam}', label: 'Ngày', description: 'Ngày tháng năm' },
  { tag: '{ten_chuyen_vien}', label: 'Chuyên viên', description: 'Tên chuyên viên' },
  { tag: '{chu_ky_ngay}', label: 'Chu kỳ', description: 'Số ngày chu kỳ' },
];
