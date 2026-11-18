import { isCcRole } from '@mos-lab/shared';
import { resolveAssignedSalonStoreId } from '@mos-lab/shared';
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
  // Chi nhánh gốc của tài khoản người dùng đăng nhập (nếu có)
  const userAssignedStoreId = Number(loggedInUser?.clientStoreId || loggedInUser?.storeId || 0);
  const userAvatar = loggedInUser?.avatarUrl || loggedInUser?.avatar;
  const parsedLegacyStaffId = Number(loggedInUser?.legacyStaffId) || 0;
  const hasAuthUser = Boolean(
    loggedInUser && (loggedInUser.displayName || loggedInUser.username || parsedLegacyStaffId > 0)
  );
  const authName = loggedInUser?.displayName || loggedInUser?.username;
  const authStaffId = parsedLegacyStaffId || (Number(loggedInUser?.id) > 0 ? Number(loggedInUser.id) : 0);
  const authAvatar = hasAuthUser
    ? resolveStaffAvatarUrl(userAvatar, authStaffId || undefined, authName)
    : undefined;
  const storeId = resolveAssignedSalonStoreId(userAssignedStoreId);
  const branchCode = storeId === 16 ? 'EP' : 'DT';
  const branchName = storeId === 16 ? 'Chi nhánh Estella Place' : 'Chi nhánh Đề Thám';

  if (role === 'CVLL') {
    const staffId = hasAuthUser ? authStaffId || 13783 : 13783;
    const name = hasAuthUser && authName ? authName : 'Chuyên Viên 2 Lông';
    const avatar = hasAuthUser ? authAvatar : resolveStaffAvatarUrl(undefined, 13783, 'Chuyên Viên 2 Lông');
    return {
      staffId,
      name,
      tier: 'CVLL',
      badgeLabel: 'CVLL · Chuyên Viên Tự Chủ Cấp Cao',
      avatar,
      storeId,
      branchCode,
      branchName,
    };
  }

  if (role === 'CVL') {
    const isThaoLy =
      hasAuthUser &&
      (authStaffId === 46272 || authName?.toLowerCase()?.includes('thảo ly'));
    const defaultStaffId = isThaoLy ? 46272 : 13783;
    const defaultName = isThaoLy ? 'Thảo Ly' : 'Khanh Cao';
    const staffId = hasAuthUser ? authStaffId || defaultStaffId : defaultStaffId;
    const name = hasAuthUser && authName ? authName : defaultName;
    const avatar = hasAuthUser ? authAvatar : resolveStaffAvatarUrl(undefined, defaultStaffId, defaultName);
    return {
      staffId,
      name,
      tier: 'CVL',
      badgeLabel: 'CVL · Chuyên Viên Tự Chủ',
      avatar,
      storeId,
      branchCode,
      branchName,
    };
  }

  if (role === 'CV') {
    const staffId = hasAuthUser ? authStaffId || 49076 : 49076;
    const name = hasAuthUser && authName ? authName : 'Phương Nhi';
    const avatar = hasAuthUser ? authAvatar : resolveStaffAvatarUrl(undefined, 49076, 'Phương Nhi');
    return {
      staffId,
      name,
      tier: 'CV',
      badgeLabel: 'CV · Chuyên Viên Kỹ Thuật',
      avatar,
      storeId,
      branchCode,
      branchName,
    };
  }

  if (role === 'STORE') {
    const staffId = hasAuthUser ? authStaffId || 1 : 1;
    const name = hasAuthUser && authName ? authName : 'Quản Lý Cửa Hàng';
    const avatar = hasAuthUser ? authAvatar : undefined;
    return {
      staffId,
      name,
      tier: 'ADMIN',
      badgeLabel: 'STORE · Quản Lý Cửa Hàng',
      avatar,
      storeId,
      branchCode,
      branchName,
    };
  }

  if (role === 'INVENTORY') {
    const staffId = hasAuthUser ? authStaffId || 1 : 1;
    const name = hasAuthUser && authName ? authName : 'Quản Lý Kho';
    const avatar = hasAuthUser ? authAvatar : undefined;
    return {
      staffId,
      name,
      tier: 'ADMIN',
      badgeLabel: 'KHO · Quản Lý Kho',
      avatar,
      storeId,
      branchCode,
      branchName,
    };
  }

  // Default: CC (Client Consultant)
  const staffId = hasAuthUser ? authStaffId || 37790 : 37790;
  const name = hasAuthUser && authName ? authName : 'Diễm Hương';
  const avatar = hasAuthUser ? authAvatar : resolveStaffAvatarUrl(undefined, 37790, 'Diễm Hương');
  return {
    staffId,
    name,
    tier: 'CC',
    badgeLabel: 'CC · Tư Vấn Viên',
    avatar,
    storeId,
    branchCode,
    branchName,
  };
}
