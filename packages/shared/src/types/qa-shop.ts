export type QaShopBranchCode = 'DT' | 'EP' | 'ACA-DT' | 'HQ' | string;

export interface QaShopBranch {
  code: QaShopBranchCode;
  name: string;
  address?: string;
}

export type QaAuditResult = 'PASS' | 'FAIL' | 'NA';
export type QaSeverity = 'LOW' | 'MEDIUM' | 'MID' | 'HIGH' | 'CRITICAL';
export type QaTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED';

export interface QaChecklistItem {
  id: string;
  code: string;
  title: string;
  description?: string;
  standardRequirement: string;
  weight: number; // e.g. 1 to 5
  requirePhotoOnFail?: boolean;
  isCritical?: boolean;
}

export interface QaChecklistSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  items: QaChecklistItem[];
}

export interface QaChecklistTemplate {
  id: string;
  code: string; // e.g. 'DT.Reception.DAILY.check' or 'EP.Reception.DAILY.check'
  branchCode: QaShopBranchCode;
  branchName: string;
  title: string;
  description?: string;
  updatedAt: string;
  sections: QaChecklistSection[];
}

export interface QaAuditItemRecord {
  itemId: string;
  itemCode: string;
  itemTitle: string;
  sectionId: string;
  sectionTitle: string;
  weight: number;
  result: QaAuditResult;
  note?: string;
  photoUrls?: string[];
  severity?: QaSeverity;
  ticketId?: string;
}

export interface QaDailyAudit {
  id: string;
  auditCode: string;
  templateId: string;
  templateCode: string;
  branchCode: QaShopBranchCode;
  branchName: string;
  auditorId: string;
  auditorName: string;
  auditDate: string; // YYYY-MM-DD
  shift: 'Sáng' | 'Chiều' | 'Tối' | 'Toàn ngày';
  overallScore: number; // Earned weight points
  maxScore: number; // Total possible weight points
  complianceRate: number; // Percentage 0 - 100
  passedCount: number;
  failedCount: number;
  naCount: number;
  status: 'DRAFT' | 'COMPLETED';
  notes?: string;
  createdAt: string;
  items: QaAuditItemRecord[];
  itemSnapshot?: Record<string, any>;
  sectionsSnapshot?: QaChecklistSection[];
  requireAllPhotos?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface QaActionTicket {
  id: string;
  ticketCode: string;
  auditId: string;
  auditCode: string;
  branchCode: QaShopBranchCode;
  branchName: string;
  itemId: string;
  itemTitle: string;
  sectionTitle: string;
  standardRequirement: string;
  severity: QaSeverity;
  assignedToStaffId: string;
  assignedToStaffName: string;
  dueDate: string; // YYYY-MM-DD
  status: QaTicketStatus;
  issueNotes: string;
  proofPhotoUrls: string[];
  resolutionNotes?: string;
  resolutionPhotoUrls?: string[];
  resolvedAt?: string;
  resolvedByStaffName?: string;
  createdAt: string;
}

export interface QaComplianceStats {
  averageComplianceRate: number;
  totalAudits: number;
  totalFailedItems: number;
  resolvedTicketsCount: number;
  openTicketsCount: number;
  branchComparison: {
    branchCode: QaShopBranchCode;
    branchName: string;
    avgScore: number;
    auditCount: number;
    failedCount: number;
  }[];
  sectionBreakdown: {
    sectionTitle: string;
    passRate: number;
  }[];
}

export interface QaImportSheetInput {
  sheetUrlOrId: string;
  branchCode: QaShopBranchCode;
  templateCode?: string;
}

export interface QaSaveAuditInput {
  templateId: string;
  branchCode: QaShopBranchCode;
  auditorId: string;
  auditorName: string;
  auditDate: string;
  shift: 'Sáng' | 'Chiều' | 'Tối' | 'Toàn ngày';
  notes?: string;
  items: {
    itemId: string;
    result: QaAuditResult;
    note?: string;
    photoUrls?: string[];
    severity?: QaSeverity;
  }[];
}
