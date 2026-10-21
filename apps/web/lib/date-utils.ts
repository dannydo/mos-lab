import dayjs from 'dayjs';

/**
 * An toàn định dạng khoảng cách thời gian tương đối bằng tiếng Việt, không bao giờ ném lỗi (never throws).
 * Khắc phục triệt để lỗi runtime "d.fromNow is not a function" khi dayjs plugin relativeTime không khả dụng
 * trên các chunk hoặc execution path khác nhau của trình duyệt.
 *
 * @param dateInput - Chuỗi ISO, timestamp, Date, hoặc dayjs object
 * @returns Chuỗi thời gian tương đối tiếng Việt tự nhiên (VD: "vừa xong", "5 phút trước", "sau 2 giờ", v.v.)
 */
export function formatRelativeTime(
  dateInput?: string | number | Date | dayjs.Dayjs | null
): string {
  if (!dateInput) return '';

  try {
    const d = dayjs(dateInput);
    if (!d.isValid()) return '';

    const now = dayjs();
    const diffSec = d.diff(now, 'second');
    const isPast = diffSec < 0;
    const absSec = Math.abs(diffSec);

    // Dưới 45 giây
    if (absSec < 45) {
      return isPast ? 'vừa xong' : 'ngay bây giờ';
    }

    // Dưới 60 phút
    const absMin = Math.round(absSec / 60);
    if (absMin < 60) {
      return isPast ? `${absMin} phút trước` : `sau ${absMin} phút`;
    }

    // Dưới 24 giờ
    const absHours = Math.round(absMin / 60);
    if (absHours < 24) {
      return isPast ? `${absHours} giờ trước` : `sau ${absHours} giờ`;
    }

    // Dưới 30 ngày
    const absDays = Math.round(absHours / 24);
    if (absDays < 30) {
      return isPast ? `${absDays} ngày trước` : `sau ${absDays} ngày`;
    }

    // Dưới 12 tháng (365 ngày)
    const absMonths = Math.round(absDays / 30);
    if (absMonths < 12) {
      return isPast ? `${absMonths} tháng trước` : `sau ${absMonths} tháng`;
    }

    // Từ 1 năm trở lên
    const absYears = Math.max(1, Math.round(absDays / 365));
    return isPast ? `${absYears} năm trước` : `sau ${absYears} năm`;
  } catch {
    return '';
  }
}
