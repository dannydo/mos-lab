export interface StaffOffDayResult {
  userId: number;
  weeklyOffDays: number[]; // 1 = Thứ 2, 2 = Thứ 3, ..., 7 = Chủ Nhật
  approvedOffDates: string[]; // YYYY-MM-DD (Đơn nghỉ phép đã duyệt -> Disable)
  pendingOffDates?: string[]; // YYYY-MM-DD (Đơn nghỉ phép chưa/đang duyệt 'New' -> Cảnh báo)
  rejectedOffDates?: string[]; // YYYY-MM-DD (Đơn nghỉ phép bị từ chối 'Rejected' -> Cảnh báo)
  source: 'fixed_schedule' | 'approved_request' | 'inverted_schedule' | 'none';
}

export interface StaffOffDayBatchParams {
  userIds?: number[];
  dateFrom?: string;
  dateTo?: string;
}

export interface StaffOffDayQueryResponse {
  data: Record<number, StaffOffDayResult>;
  total: number;
}
