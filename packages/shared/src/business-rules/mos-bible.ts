import type { MosBibleBook, MosBibleBookKey, MosBibleCommandment } from '../types/mos-bible.js';
import { removeVietnameseTones } from '../utils/search.js';
import { MOS_BIBLE_CUSTOMER_AND_COMBO_COMMANDMENTS } from './mos-bible/customer-and-combo.js';
import { MOS_BIBLE_GOVERNANCE_AND_BOOKING_COMMANDMENTS } from './mos-bible/governance-and-booking.js';
import { MOS_BIBLE_PEOPLE_CATALOG_AND_STORE_COMMANDMENTS } from './mos-bible/people-catalog-and-store.js';
import { MOS_BIBLE_REWARDS_AND_PAYROLL_COMMANDMENTS } from './mos-bible/rewards-and-payroll.js';
import { MOS_BIBLE_SYSTEM_AND_CAREER_COMMANDMENTS } from './mos-bible/system-and-career.js';

export const MOS_BIBLE_BOOKS: readonly MosBibleBook[] = [
  {
    key: 'GOVERNANCE',
    label: 'Quyển Khải mOS',
    description: 'Cách một chân lý nghiệp vụ được định nghĩa, thi hành và sửa đổi.',
  },
  {
    key: 'BOOKING',
    label: 'Quyển Đặt Lịch',
    description: 'Năng suất Booker, lịch hẹn, Missed và vòng đời đơn.',
  },
  {
    key: 'SERVICE',
    label: 'Quyển Phụng Vụ',
    description: 'Check-in, thực hiện dịch vụ, doanh thu và vận hành salon.',
  },
  {
    key: 'REWARDS',
    label: 'Quyển Chuối & Thưởng',
    description: 'Điểm, thưởng, tip, FAL và cách chia trách nhiệm.',
  },
  {
    key: 'CUSTOMER',
    label: 'Quyển Chăm Khách',
    description: 'Combo, mốc chăm sóc, phân bổ và vòng đời khách hàng.',
  },
  {
    key: 'PEOPLE',
    label: 'Quyển Giáo Dân',
    description: 'Vai trò, lịch làm việc, ngày nghỉ và nhận diện nhân sự.',
  },
  {
    key: 'CATALOG',
    label: 'Quyển Vật Phẩm',
    description: 'Dịch vụ, sản phẩm, giá, tồn kho và quyền sửa Catalog.',
  },
  {
    key: 'SYSTEM',
    label: 'Quyển Nghi Lễ',
    description: 'Các chuẩn trải nghiệm dùng chung trên toàn hệ thống.',
  },
] as const;

/**
 * Kinh Thánh mOS is the human-readable business-rule registry used by the
 * contextual help UI. Executable calculations still live in their canonical
 * backend/shared services; each commandment points back to those sources.
 */
export const MOS_BIBLE_COMMANDMENTS: readonly MosBibleCommandment[] = [
  ...MOS_BIBLE_GOVERNANCE_AND_BOOKING_COMMANDMENTS,
  ...MOS_BIBLE_REWARDS_AND_PAYROLL_COMMANDMENTS,
  ...MOS_BIBLE_CUSTOMER_AND_COMBO_COMMANDMENTS,
  ...MOS_BIBLE_PEOPLE_CATALOG_AND_STORE_COMMANDMENTS,
  ...MOS_BIBLE_SYSTEM_AND_CAREER_COMMANDMENTS,
];

export function getMosBibleBook(bookKey: MosBibleBookKey): MosBibleBook {
  const book = MOS_BIBLE_BOOKS.find((candidate) => candidate.key === bookKey);
  if (!book) throw new Error(`Unknown mOS Bible book: ${bookKey}`);
  return book;
}

export function normalizeMosBiblePathname(pathname: string): string {
  const cleanPath = pathname.split(/[?#]/, 1)[0] || '/dashboard';
  if (cleanPath === '/') return cleanPath;
  return cleanPath.replace(/\/+$/, '');
}

export function isMosBibleCommandmentRelevant(commandment: MosBibleCommandment, pathname: string): boolean {
  const normalizedPath = normalizeMosBiblePathname(pathname);
  return commandment.routeScopes.some((scope) => {
    const normalizedScope = normalizeMosBiblePathname(scope);
    return normalizedPath === normalizedScope || normalizedPath.startsWith(`${normalizedScope}/`);
  });
}

export function getMosBibleCommandmentsForPath(pathname: string): readonly MosBibleCommandment[] {
  return MOS_BIBLE_COMMANDMENTS.filter(
    (commandment) => commandment.status === 'ACTIVE' && isMosBibleCommandmentRelevant(commandment, pathname)
  );
}

export function filterMosBibleCommandments(
  commandments: readonly MosBibleCommandment[],
  searchText: string,
  book: MosBibleBookKey | 'ALL' = 'ALL'
): readonly MosBibleCommandment[] {
  const normalizedQuery = removeVietnameseTones(searchText);

  return commandments.filter((commandment) => {
    if (book !== 'ALL' && commandment.book !== book) return false;
    if (!normalizedQuery) return true;

    const searchableText = [
      commandment.id,
      getMosBibleBook(commandment.book).label,
      commandment.title,
      commandment.summary,
      commandment.rationale,
      ...commandment.commandments,
      ...(commandment.examples ?? []),
      ...(commandment.exceptions ?? []),
      ...commandment.tags,
      ...commandment.sources.flatMap((source) => [source.label, source.reference]),
    ].join(' ');

    return removeVietnameseTones(searchableText).includes(normalizedQuery);
  });
}
