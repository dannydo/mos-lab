import type { CustomTouchpoint, Touchpoint } from './types';

export interface LocaTabMeta {
  id: string;
  name: string;
  description: string;
}

export const DEFAULT_CUSTOM_TOUCHPOINTS: CustomTouchpoint[] = [
  { key: 'CUSTOM_0', daysMin: 31, daysMax: 35 },
  { key: 'CUSTOM_1', daysMin: 36, daysMax: 40 },
  { key: 'CUSTOM_2', daysMin: 41, daysMax: 45 },
];

export const TAB_KEYS: LocaTabMeta[] = [
  { id: 'NEW_LOCA', name: 'New LoCa', description: 'Khách hàng vừa mua Combo mới' },
  { id: 'LOCA_ALL', name: 'LoCa (Tất cả)', description: 'Tất cả khách hàng Combo Live' },
  { id: 'CONTACTED', name: 'Contacted', description: 'Khách hàng đã liên hệ' },
  { id: 'CALLBACK', name: 'Callback', description: 'Khách hàng hẹn gọi lại' },
  { id: 'BOOKED', name: 'Booked', description: 'Khách hàng đã book lịch' },
  { id: 'HSD_30', name: 'HSD 30', description: 'Hạn sử dụng Combo <= 30 ngày' },
  { id: 'LSD_1', name: 'LSD 1', description: 'Lần sử dụng Combo còn 1' },
  { id: 'SP', name: 'SP', description: 'Khách hàng có mua sản phẩm' },
  {
    id: 'STAFF_ACTIVITY',
    name: '📊 Báo cáo Nhân viên',
    description: 'Chi tiết công việc & hiệu suất hoạt động từng ngày/tuần/tháng',
  },
];

export const DEFAULT_RESET_TOUCHPOINTS: Touchpoint[] = [
  { key: 'now', label: 'Chạm 24h', daysMin: 1, daysMax: 1, color: 'blue' },
  { key: '17', label: 'Chạm 17', daysMin: 17, daysMax: 17, color: 'cyan' },
  { key: '19', label: 'Chạm 19', daysMin: 19, daysMax: 19, color: 'cyan' },
  { key: '21', label: 'Chạm 21', daysMin: 21, daysMax: 21, color: 'green' },
  { key: '23', label: 'Chạm 23', daysMin: 23, daysMax: 23, color: 'green' },
  { key: '25', label: 'Chạm 25', daysMin: 25, daysMax: 25, color: 'green' },
  { key: '30', label: 'Chạm 30', daysMin: 30, daysMax: 30, color: 'orange' },
  { key: '35', label: 'Chạm 35', daysMin: 35, daysMax: 35, color: 'orange' },
  { key: '40', label: 'Chạm 40', daysMin: 40, daysMax: 40, color: 'orange' },
  { key: '45', label: 'Chạm 45', daysMin: 45, daysMax: 45, color: 'red' },
  { key: '50', label: 'Chạm 50', daysMin: 50, daysMax: 50, color: 'red' },
  { key: '55', label: 'Chạm 55', daysMin: 55, daysMax: 55, color: 'red' },
  { key: '60', label: 'Chạm 60', daysMin: 60, daysMax: 60, color: 'red' },
];
