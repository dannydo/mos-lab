export type CallType = 'OUTBOUND' | 'INBOUND';

export type CallResult = 'ANSWERED' | 'NO_ANSWER' | 'BUSY' | 'WRONG_NUMBER' | 'FAILED';

export type CallOutcome = 
  | 'BOOKED'        // Đã book lịch hẹn mới
  | 'RENEWED'       // Đã gia hạn combo/mua thêm
  | 'CALL_BACK'     // Hẹn gọi lại sau (phải đi kèm callbackDate)
  | 'NO_NEED'       // Không có nhu cầu
  | 'REFUSED'      // Từ chối thẳng/yêu cầu không gọi nữa
  | 'PENDING';      // Chưa chốt/đang suy nghĩ

export interface CallLog {
  id: number;
  planId: number | null;
  legacyUserId: number;
  staffId: number;
  callType: CallType;
  callResult: CallResult;
  durationSec: number | null;
  note: string | null;
  outcome: CallOutcome | null;
  callbackDate: string | null; // YYYY-MM-DD
  createdAt: string;
  
  // Joined relation fields for UI
  staffName?: string;
}

export interface CreateCallRequest {
  planId?: number;
  legacyUserId: number;
  callType: CallType;
  callResult: CallResult;
  durationSec?: number;
  note?: string;
  outcome?: CallOutcome;
  callbackDate?: string;
}
