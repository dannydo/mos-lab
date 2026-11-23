import type { QaActionTicket, QaDailyAudit, QaSaveAuditInput } from '@mos-lab/shared';

export type QaActionTicketWithDeletion = QaActionTicket & { isDeleted?: boolean };

export type QaSaveAuditWithSnapshots = QaSaveAuditInput & Pick<QaDailyAudit, 'itemSnapshot' | 'sectionsSnapshot'>;

export interface QaAuditFilterParams {
  branchCode?: string;
  dateFrom?: string;
  dateTo?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
}

export interface QaTicketFilterParams {
  branchCode?: string;
  status?: string;
}

export interface QaUpdateTicketInput {
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED';
  resolutionNotes?: string;
  resolutionPhotoUrls?: string[];
  resolvedByStaffName?: string;
}

export interface QaCloneTemplateInput {
  sourceBranchCode: string;
  targetBranchCode: string;
  overwrite?: boolean;
}
