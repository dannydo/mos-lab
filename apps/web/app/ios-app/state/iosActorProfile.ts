import { isCcRole } from '@mos-lab/shared';
import type {
  IosUserRole,
  BookingScopeMode,
  IosBranchConfig,
  IosSegmentCounts,
  IosStaffMonthlyStats,
  IosActiveActorProfile,
} from '@mos-lab/shared';
import { BookingItem, resolveStaffAvatarUrl } from './mockData';

export type {
  IosUserRole,
  BookingScopeMode,
  IosBranchConfig,
  IosSegmentCounts,
  IosStaffMonthlyStats,
  IosActiveActorProfile,
};

export type SegmentCounts = IosSegmentCounts;
export type StaffMonthlyStats = IosStaffMonthlyStats;
export type ActiveActorProfile = IosActiveActorProfile;

export const IOS_AVAILABLE_BRANCHES: IosBranchConfig[] = [
  {
    id: 6,
    code: 'DT',
    name: 'Chi nhánh Đề Thám',
    shortName: 'Đề Thám',
    address: '159A Đề Thám, P. Cô Giang, Q.1, TP.HCM',
    receiptName: 'CN ĐỀ THÁM',
  },
  {
    id: 16,
    code: 'EP',
    name: 'Chi nhánh Estella Place',
    shortName: 'Estella Place',
    address: 'Tầng 3 Estella Place, 88 Song Hành, An Phú, TP. Thủ Đức',
    receiptName: 'CN ESTELLA PLACE',
  },
];

export const EMPTY_LIVE_BOOKING_PLACEHOLDER: BookingItem = {
  id: 0,
  orderNumber: '',
  customerName: 'Chưa chọn khách hàng',
  customerPhone: '',
  customerId: 0,
  customerVisits: 0,
  customerNote: '',
  timeSlot: '--:--',
  serviceName: '',
  serviceType: 'Normal',
  servicePrice: 0,
  serviceDuration: 60,
  assignedStaffId: 0,
  assignedStaffName: '',
  status: 'INCOMING',
};

export function resolveActorProfile(role: IosUserRole, loggedInUser?: any): ActiveActorProfile {
  const userRole = String(loggedInUser?.role || '').toLowerCase();
  const isActualCvUser =
    userRole === 'cvl' ||
    userRole === 'cvll' ||
    userRole === 'cv' ||
    userRole === 'cv_plus' ||
    userRole === 'cv_plus_plus' ||
    userRole === 'technician';

  // Chi nhánh gốc của tài khoản người dùng đăng nhập (nếu có)
  const userAssignedStoreId = Number(loggedInUser?.clientStoreId || loggedInUser?.storeId || 0);

  if (role === 'CVLL') {
    const staffId = isActualCvUser ? Number(loggedInUser?.legacyStaffId) || 13783 : 13783;
    const name = isActualCvUser && loggedInUser?.displayName ? loggedInUser.displayName : 'Chuyên Viên 2 Lông';
    const storeId = userAssignedStoreId || 6;
    return {
      staffId,
      name,
      tier: 'CVLL',
      badgeLabel: 'CVLL · Chuyên Viên Tự Chủ Cấp Cao',
      avatar: resolveStaffAvatarUrl(loggedInUser?.avatar, staffId, name),
      storeId,
      branchCode: storeId === 16 ? 'EP' : 'DT',
      branchName: storeId === 16 ? 'Chi nhánh Estella Place' : 'Chi nhánh Đề Thám',
    };
  }
  if (role === 'CVL') {
    const isThaoLy =
      isActualCvUser &&
      (Number(loggedInUser?.legacyStaffId) === 46272 || loggedInUser?.displayName?.toLowerCase()?.includes('thảo ly'));
    const defaultStaffId = isThaoLy ? 46272 : 13783;
    const defaultName = isThaoLy ? 'Thảo Ly' : 'Khanh Cao';
    const staffId = isActualCvUser ? Number(loggedInUser?.legacyStaffId) || defaultStaffId : defaultStaffId;
    const name = isActualCvUser && loggedInUser?.displayName ? loggedInUser.displayName : defaultName;
    const storeId = userAssignedStoreId || 6; // Khanh Cao & Thảo Ly thuộc Chi nhánh Đề Thám (DT - 6)
    return {
      staffId,
      name,
      tier: 'CVL',
      badgeLabel: 'CVL · Chuyên Viên Tự Chủ',
      avatar: resolveStaffAvatarUrl(loggedInUser?.avatar, staffId, name),
      storeId,
      branchCode: storeId === 16 ? 'EP' : 'DT',
      branchName: storeId === 16 ? 'Chi nhánh Estella Place' : 'Chi nhánh Đề Thám',
    };
  }
  if (role === 'CV') {
    const staffId = isActualCvUser ? Number(loggedInUser?.legacyStaffId) || 49076 : 49076;
    const name = isActualCvUser && loggedInUser?.displayName ? loggedInUser.displayName : 'Phương Nhi';
    const storeId = userAssignedStoreId || 6;
    return {
      staffId,
      name,
      tier: 'CV',
      badgeLabel: 'CV · Chuyên Viên Kỹ Thuật',
      avatar: resolveStaffAvatarUrl(loggedInUser?.avatar, staffId, name),
      storeId,
      branchCode: storeId === 16 ? 'EP' : 'DT',
      branchName: storeId === 16 ? 'Chi nhánh Estella Place' : 'Chi nhánh Đề Thám',
    };
  }
  const isActualCcUser = isCcRole(loggedInUser?.role);
  const staffId = isActualCcUser ? Number(loggedInUser?.legacyStaffId) || 37790 : 37790;
  const name = isActualCcUser && loggedInUser?.displayName ? loggedInUser.displayName : 'Diễm Hương';
  const storeId = userAssignedStoreId || 6;
  return {
    staffId,
    name,
    tier: 'CC',
    badgeLabel: 'CC · Tư Vấn Viên',
    avatar: resolveStaffAvatarUrl(loggedInUser?.avatar, staffId, name),
    storeId,
    branchCode: storeId === 16 ? 'EP' : 'DT',
    branchName: storeId === 16 ? 'Chi nhánh Estella Place' : 'Chi nhánh Đề Thám',
  };
}
