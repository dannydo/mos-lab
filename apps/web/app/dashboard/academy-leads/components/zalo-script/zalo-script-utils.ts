export const ZALO_SCRIPT_VARIABLE_TAGS = [
  { tag: '{{ten_hoc_vien}}', label: 'Tên học viên' },
  { tag: '{{ten_workshop}}', label: 'Tên Workshop' },
  { tag: '{{thoi_gian}}', label: 'Ngày & Giờ' },
  { tag: '{{gio_bat_dau}}', label: 'Giờ bắt đầu' },
  { tag: '{{gio_don_khach}}', label: 'Giờ đón khách' },
  { tag: '{{dia_diem}}', label: 'Địa điểm' },
  { tag: '{{suat_an}}', label: 'Suất ăn đã chọn' },
  { tag: '{{dung_cu}}', label: 'Cốp đồ nghề' },
  { tag: '{{qr_link}}', label: 'Link check-in QR' },
  { tag: '{{sdt}}', label: 'Số điện thoại' },
];

export function interpolateZaloTemplate(content: string, variables: Record<string, string>): string {
  if (!content) return '';
  return content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}|\{\s*([a-zA-Z0-9_]+)\s*\}/g, (match, p1, p2) => {
    const key = p1 || p2;
    return variables[key] !== undefined ? variables[key] : match;
  });
}
