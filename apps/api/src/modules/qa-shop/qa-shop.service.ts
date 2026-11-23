import type {
  QaActionTicket,
  QaChecklistTemplate,
  QaComplianceStats,
  QaDailyAudit,
  QaImportSheetInput,
  QaSaveAuditInput,
  QaShopBranchCode,
  SafeAny,
} from '@mos-lab/shared';
import { computeQaAnalytics } from './qa-shop-service/analytics-operations.js';
import {
  applyTicketUpdate,
  createAndRecordAudit,
  filterAndSortAudits,
  filterAndSortTickets,
  getAuditDetailById,
  getAuditsByStaffId,
  restoreAuditWithTickets,
  softDeleteAuditWithTickets,
} from './qa-shop-service/audit-and-ticket-operations.js';
import { INITIAL_AUDITS, INITIAL_TICKETS } from './qa-shop-service/initial-seed-data.js';
import { PRESET_TEMPLATES } from './qa-shop-service/preset-templates.js';
import {
  cloneTemplateInList,
  filterTemplatesByBranch,
  findTemplateByIdOrCode,
  importSheetTemplateIntoList,
  loadSyncedSheetTemplates,
  updateTemplateInList,
} from './qa-shop-service/template-operations.js';
import type {
  QaActionTicketWithDeletion,
  QaAuditFilterParams,
  QaCloneTemplateInput,
  QaTicketFilterParams,
  QaUpdateTicketInput,
} from './qa-shop-service/types.js';

export { CV_PERSONAL_QA_TEMPLATE } from './qa-shop-service/cv-personal-template.js';

export class QaShopService {
  private templates: QaChecklistTemplate[];
  private audits: QaDailyAudit[] = [...INITIAL_AUDITS];
  private tickets: QaActionTicketWithDeletion[] = [...INITIAL_TICKETS];

  constructor() {
    this.templates = loadSyncedSheetTemplates(PRESET_TEMPLATES);
  }

  // 1. Get List of Templates
  public getTemplates(branchCode?: QaShopBranchCode): QaChecklistTemplate[] {
    return filterTemplatesByBranch(this.templates, branchCode);
  }

  // 2. Get Template Detail by ID or Code
  public getTemplateByIdOrCode(idOrCode: string): QaChecklistTemplate | null {
    return findTemplateByIdOrCode(this.templates, idOrCode);
  }

  // 3. Import or Sync Template from CSDL Nội Bộ
  public importSheetTemplate(input: QaImportSheetInput): QaChecklistTemplate {
    return importSheetTemplateIntoList(this.templates, input);
  }

  // 3b. Update Template Sections and Items (CRUD Support)
  public updateTemplate(branchCode: string, sections: SafeAny[]): QaChecklistTemplate {
    return updateTemplateInList(this.templates, branchCode, sections);
  }

  // 3c. Clone / Duplicate Template from Source Branch to Target Branch
  public cloneTemplate(input: QaCloneTemplateInput): QaChecklistTemplate {
    return cloneTemplateInList(this.templates, input);
  }

  // 4. List Daily Audits (Support Soft Delete Filter)
  public getAudits(params?: QaAuditFilterParams): QaDailyAudit[] {
    return filterAndSortAudits(this.audits, params);
  }

  // 4b. Soft Delete Audit Log (For testing & clean analytics)
  public softDeleteAudit(id: string, deletedBy?: string): QaDailyAudit {
    return softDeleteAuditWithTickets(this.audits, this.tickets, id, deletedBy);
  }

  // 4c. Restore Soft-Deleted Audit Log
  public restoreAudit(id: string): QaDailyAudit {
    return restoreAuditWithTickets(this.audits, this.tickets, id);
  }

  // 5. Get Audit Detail by ID
  public getAuditById(id: string): QaDailyAudit | null {
    return getAuditDetailById(this.audits, id);
  }

  // 6. Save / Submit Daily Audit Form
  public saveAudit(input: QaSaveAuditInput): QaDailyAudit {
    const template = this.getTemplateByIdOrCode(input.templateId);
    if (!template) {
      throw new Error(`Template not found for ID or Code: ${input.templateId}`);
    }
    return createAndRecordAudit(this.audits, this.tickets, template, input);
  }

  // 6b. Get Audits for a specific staff member
  public getStaffAudits(staffId: number): QaDailyAudit[] {
    return getAuditsByStaffId(this.audits, staffId);
  }

  // 7. Get Action Tickets List
  public getTickets(params?: QaTicketFilterParams): QaActionTicket[] {
    return filterAndSortTickets(this.tickets, params);
  }

  // 8. Update Action Ticket (Resolve / Verify)
  public updateTicket(ticketId: string, updates: QaUpdateTicketInput): QaActionTicket {
    return applyTicketUpdate(this.tickets, ticketId, updates);
  }

  // 9. Get Overall Analytics & Compliance Stats (Exclude Soft-Deleted Audits)
  public getAnalytics(): QaComplianceStats {
    return computeQaAnalytics(this.audits, this.tickets);
  }
}

export const qaShopService = new QaShopService();
