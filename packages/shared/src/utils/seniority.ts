/**
 * Seniority Calculation Utility (Single Source of Truth)
 * Rules:
 * - Primary seniority: calculated automatically from joinedAt to asOfDate (months/years)
 * - Additional seniority: seniorityOffset (months) for special agreements
 * - Total seniority = calculated seniority + seniorityOffset
 */

export interface SeniorityCalculation {
  calculatedMonths: number;
  offsetMonths: number;
  totalMonths: number;
  years: number;
  remainingMonths: number;
  days: number;
  displayFormatted: string;
  isDaysOnly: boolean;
}

export function calculateStaffSeniority(
  joinedAt?: string | Date | null,
  seniorityOffsetMonths?: number | null,
  asOfDate: Date = new Date()
): SeniorityCalculation {
  const offset = Number(seniorityOffsetMonths || 0);
  if (!joinedAt) {
    return {
      calculatedMonths: 0,
      offsetMonths: offset,
      totalMonths: offset,
      years: Math.floor(offset / 12),
      remainingMonths: offset % 12,
      days: 0,
      displayFormatted: offset > 0 ? `${offset} tháng` : 'Chưa thiết lập',
      isDaysOnly: false,
    };
  }

  const startDate = new Date(joinedAt);
  if (isNaN(startDate.getTime())) {
    return {
      calculatedMonths: 0,
      offsetMonths: offset,
      totalMonths: offset,
      years: Math.floor(offset / 12),
      remainingMonths: offset % 12,
      days: 0,
      displayFormatted: 'Ngày không hợp lệ',
      isDaysOnly: false,
    };
  }

  // Calculate full calendar months difference
  let monthsDiff =
    (asOfDate.getFullYear() - startDate.getFullYear()) * 12 + (asOfDate.getMonth() - startDate.getMonth());

  if (asOfDate.getDate() < startDate.getDate()) {
    monthsDiff -= 1;
  }

  const calculatedMonths = Math.max(0, monthsDiff);
  const totalMonths = calculatedMonths + offset;

  const diffTime = Math.max(0, asOfDate.getTime() - startDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (totalMonths <= 0) {
    return {
      calculatedMonths: 0,
      offsetMonths: offset,
      totalMonths: 0,
      years: 0,
      remainingMonths: 0,
      days: diffDays,
      displayFormatted: `${diffDays} ngày`,
      isDaysOnly: true,
    };
  }

  const years = Math.floor(totalMonths / 12);
  const remainingMonths = totalMonths % 12;

  const displayFormatted =
    years > 0 && remainingMonths > 0
      ? `${years} năm ${remainingMonths} tháng`
      : years > 0
        ? `${years} năm`
        : `${remainingMonths} tháng`;

  return {
    calculatedMonths,
    offsetMonths: offset,
    totalMonths,
    years,
    remainingMonths,
    days: diffDays,
    displayFormatted,
    isDaysOnly: false,
  };
}
