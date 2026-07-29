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
