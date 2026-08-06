// ===== HAPPY CALL STATUS =====
export type HappyCallStatus = 'PENDING' | 'CALLING' | 'COMPLETED' | 'NO_ANSWER' | 'MESSAGED' | 'UNREACHABLE';

// ===== HAPPY CALL TASK =====
export interface HappyCallTask {
  id: number;
  orderId: number;
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerAvatar?: string | null;
  assignedCsStaffId: number | null;
  assignedCsStaffName: string;
  status: HappyCallStatus;
  attemptCount: number;
  scheduledDate: string;
  completedAt: string | null;
  createdAt: string;
  checkoutDate: string | null;
  technicianName: string | null;
  technicianId: number | null;
  ccInName: string | null;
  ccInStaffId: number | null;
  ccOutName: string | null;
  ccOutStaffId: number | null;
  bookerName: string | null;
  bookerStaffId: number | null;
  serviceName: string;
}

// ===== SURVEY RATING =====
export interface SurveyRating {
  id: number;
  happyCallTaskId: number;
  orderId: number;
  customerId: number;
  overallRating: number;
  technicianQualityRating: number | null;
  staffAttitudeRating: number | null;
  facilityRating: number | null;
  valueForMoneyRating: number | null;
  checkInExperienceRating: number | null;
  checkOutExperienceRating: number | null;
  bookingExperienceRating: number | null;
  customerNote: string | null;
  csNote: string | null;
  technicianId: number | null;
  ccInStaffId: number | null;
  ccOutStaffId: number | null;
  bookerStaffId: number | null;
  createdAt: string;
}

// ===== TECHNICAL ISSUE & WARRANTY TYPES =====
export type TechnicalIssueTag =
  'EYE_STINGING' | 'FAST_SHEDDING' | 'EYELID_POKING' | 'GLUE_CLUMPING' | 'WRONG_STYLE' | 'SERVICE_PAINFUL_TOO_LONG';

export type WarrantyType = 'FIX_25M_FREE' | 'ADJUST_FREE' | 'LOG_FREE' | 'REPLACE_FULL_FREE' | 'PAID_OUT_OF_WARRANTY';

export interface CreateSurveyRatingDto {
  overallRating: number;
  technicianQualityRating?: number | null;
  staffAttitudeRating?: number | null;
  facilityRating?: number | null;
  valueForMoneyRating?: number | null;
  checkInExperienceRating?: number | null;
  checkOutExperienceRating?: number | null;
  bookingExperienceRating?: number | null;
  customerNote?: string;
  csNote?: string;
  technicalIssueTags?: TechnicalIssueTag[];
}

// ===== TICKET SYSTEM =====
export type CsTicketType =
  | 'TECHNICIAN_QUALITY'
  | 'STAFF_ATTITUDE'
  | 'FACILITY_ISSUE'
  | 'PRICING_COMPLAINT'
  | 'IMPROVEMENT_SUGGESTION'
  | 'STAFF_COMPLIMENT';

export type CsTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type CsTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'PENDING_RESPONSE' | 'RESOLVED' | 'CLOSED';
export type CsTicketDepartment = 'CV' | 'CC' | 'BK' | 'FACILITY' | 'SECURITY' | 'MANAGEMENT';

export interface CsTicketComment {
  id: number;
  ticketId: number;
  staffId: number;
  staffName: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface CsTicketSubtask {
  id: number;
  ticketId: number;
  department: string;
  assignedStaffId: number | null;
  assignedStaffName?: string | null;
  status: 'PENDING' | 'APPOINTMENT_SCHEDULED' | 'RESOLVED';
  issueSummary?: string | null;
  resolutionNote?: string | null;
  actionPlan?: string | null;
  technicalIssueTags?: TechnicalIssueTag[];
  warrantyType?: WarrantyType;
  isWithin3DayWarranty?: boolean;
  previousTechnicianId?: number | null;
  previousTechnicianName?: string | null;
  replacementTechnicianId?: number | null;
  replacementTechnicianName?: string | null;
  warrantyAppointmentDate?: string | null;
  nextFalOrderServiceId?: number | null;
  inspectionStoreName?: string | null;
  inspectionAppointmentDate?: string | null;
  inspectionResultNote?: string | null;
  resolvedAt?: string | null;
  resolvedByStaffId?: number | null;
  resolvedByStaffName?: string | null;
  createdAt: string;
}

export interface CsTicket {
  id: number;
  ticketCode: string;
  surveyRatingId: number | null;
  happyCallTaskId: number | null;
  orderId: number | null;
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerAvatar?: string | null;
  type: CsTicketType;
  priority: CsTicketPriority;
  status: CsTicketStatus;
  department: string;
  departments?: string[];
  subtasks?: CsTicketSubtask[];
  completedSubtasksCount?: number;
  totalSubtasksCount?: number;
  relatedStaffId: number | null;
  relatedStaffName: string | null;
  assignedCsStaffId: number;
  assignedCsStaffName: string;
  description: string;
  slaDueDate: string;
  isOverdue: boolean;
  resolutionNote: string | null;
  actionPlan: string | null;
  resolvedAt: string | null;
  resolvedByStaffId: number | null;
  resolvedByStaffName: string | null;
  createdAt: string;
  updatedAt: string;
  comments?: CsTicketComment[];
}

export interface CreateCsTicketDto {
  orderId?: number;
  customerId: number;
  type: CsTicketType;
  priority?: CsTicketPriority;
  department: CsTicketDepartment;
  relatedStaffId?: number;
  description: string;
}

export interface UpdateCsTicketDto {
  status?: CsTicketStatus;
  priority?: CsTicketPriority;
  department?: CsTicketDepartment;
  relatedStaffId?: number;
  assignedCsStaffId?: number;
}

export interface ResolveCsTicketDto {
  resolutionNote: string;
  actionPlan: string;
}

export interface CreateTicketCommentDto {
  content: string;
  isInternal?: boolean;
}

// ===== CS CAMPAIGN =====
export type CsCampaignTarget = 'CV_QUALITY' | 'BK_QUALITY' | 'CC_QUALITY' | 'FACILITY_SECURITY' | 'COMPREHENSIVE';

export type CsCampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export interface CsCampaign {
  id: number;
  name: string;
  description: string | null;
  target: CsCampaignTarget;
  status: CsCampaignStatus;
  dateFrom: string;
  dateTo: string;
  filterBucket: string | null;
  sampleSize: number | null;
  totalCustomers: number;
  completedCalls: number;
  pendingCalls: number;
  avgRating: number | null;
  createdByStaffId: number;
  createdByStaffName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCsCampaignDto {
  name: string;
  description?: string;
  target: CsCampaignTarget;
  dateFrom: string;
  dateTo: string;
  filterBucket?: string;
  sampleSize?: number;
}

export interface UpdateCsCampaignDto {
  name?: string;
  description?: string;
  status?: CsCampaignStatus;
}

export interface CsCampaignTask {
  id: number;
  campaignId: number;
  orderId: number;
  customerId: number;
  customerName: string;
  customerPhone: string;
  assignedCsStaffId: number | null;
  assignedCsStaffName: string;
  status: HappyCallStatus;
  attemptCount: number;
  surveyRatingId: number | null;
  completedAt: string | null;
  createdAt: string;
}

// ===== DASHBOARD =====
export interface CsDashboardStats {
  happyCall: {
    total: number;
    completed: number;
    completionRate: number;
    noAnswer: number;
  };
  ratings: {
    overallAverage: number;
    technicianAverage: number;
    staffAttitudeAverage: number;
    facilityAverage: number;
  };
  tickets: {
    total: number;
    open: number;
    resolved: number;
    slaBreached: number;
  };
  satisfactionBreakdown: {
    rating: number;
    count: number;
  }[];
}

export interface CsStaffRanking {
  staffId: number;
  staffName: string;
  department: string;
  averageRating: number;
  ratingCount: number;
}

export interface CsRatingTrend {
  date: string;
  averageRating: number;
  count: number;
}

// ===== LIST PARAMS =====
export interface ListHappyCallsParams {
  status?: HappyCallStatus;
  assignedCsStaffId?: number;
  scheduledDate?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ListCsTicketsParams {
  status?: CsTicketStatus;
  priority?: CsTicketPriority;
  department?: CsTicketDepartment;
  type?: CsTicketType;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ListCsCampaignsParams {
  status?: CsCampaignStatus;
  page?: number;
  pageSize?: number;
}

export interface DepartmentHandlerConfig {
  [department: string]: number; // department -> staffId
}

export interface CsDashboardParams {
  dateFrom?: string;
  dateTo?: string;
}
