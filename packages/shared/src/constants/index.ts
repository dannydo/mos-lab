import { BucketType } from '../types/customer';
import { UserRole } from '../types/auth';
import { CallOutcome, CallResult } from '../types/call';

export const BUCKET_DETAILS: Record<BucketType, { label: string; color: string; description: string }> = {
  COMBO_LIVE: {
    label: 'Combo Live',
    color: '#52C41A', // Green
    description: 'Khách hàng có số buổi combo > 0 và chưa hết hạn.'
  },
  COMBO_DEAD: {
    label: 'Combo Dead',
    color: '#FF4D4F', // Red
    description: 'Khách từng mua combo nhưng đã dùng hết hoặc gói dịch vụ đã hết hạn.'
  },
  SINGLE: {
    label: 'Single',
    color: '#FAAD14', // Yellow/Gold
    description: 'Khách hàng lẻ, chưa từng mua combo gói dịch vụ nào.'
  }
};

export const ROLE_PERMISSIONS: Record<UserRole, { viewKPI: boolean; viewTeamKPI: boolean; manageStaff: boolean }> = {
  telesales: {
    viewKPI: true,
    viewTeamKPI: false,
    manageStaff: false
  },
  manager: {
    viewKPI: true,
    viewTeamKPI: true,
    manageStaff: false
  },
  admin: {
    viewKPI: true,
    viewTeamKPI: true,
    manageStaff: true
  },
  oc: {
    viewKPI: true,
    viewTeamKPI: true,
    manageStaff: false
  },
  cc: {
    viewKPI: true,
    viewTeamKPI: false,
    manageStaff: false
  },
  ls: {
    viewKPI: true,
    viewTeamKPI: true,
    manageStaff: false
  }
};

export const CALL_RESULT_LABELS: Record<CallResult, string> = {
  ANSWERED: 'Có bắt máy',
  NO_ANSWER: 'Không trả lời (Gọi nhỡ)',
  BUSY: 'Máy bận',
  WRONG_NUMBER: 'Sai số',
  FAILED: 'Lỗi cuộc gọi/Không liên lạc được'
};

export const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  BOOKED: 'Đã đặt lịch hẹn mới',
  RENEWED: 'Đã mua mới/Gia hạn combo',
  CALL_BACK: 'Hẹn gọi lại sau',
  NO_NEED: 'Không có nhu cầu',
  REFUSED: 'Từ chối/Yêu cầu không gọi điện nữa',
  PENDING: 'Đang suy nghĩ/Chưa chốt'
};
