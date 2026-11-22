export type PeriodStatus = 'LOCKED' | 'OPEN' | 'REVIEWING';
export type Eligibility = 'READY' | 'PENDING_LOG_APPROVAL';
export type BlockedScenario = 'SOURCE_REVIEWING' | 'TARGET_REVIEWING' | 'PENDING_LOG_APPROVAL';
export type CaseDecision = 'APPROVE' | 'REJECT';
export type CustomTargetStatus = 'OPEN' | 'REVIEWING';

export const BLOCKED_SCENARIO_COPY: Record<BlockedScenario, { label: string; detail: string }> = {
  SOURCE_REVIEWING: {
    label: 'Nguồn REVIEWING',
    detail: 'Nguồn chưa LOCKED nên chưa có snapshot bất biến để tham chiếu.',
  },
  TARGET_REVIEWING: {
    label: 'Kỳ nhận REVIEWING',
    detail: 'Kỳ nhận chưa OPEN nên không thể nhận Adjustment.',
  },
  PENDING_LOG_APPROVAL: {
    label: 'Log chờ duyệt',
    detail: 'Log chưa được duyệt nên chưa đủ điều kiện tài chính để tạo Adjustment.',
  },
};
