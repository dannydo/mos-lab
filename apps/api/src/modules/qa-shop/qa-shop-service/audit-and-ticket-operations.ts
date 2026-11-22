import type {
  QaActionTicket,
  QaAuditItemRecord,
  QaChecklistItem,
  QaChecklistTemplate,
  QaDailyAudit,
  QaSaveAuditInput,
} from '@mos-lab/shared';
import type {
  QaActionTicketWithDeletion,
  QaAuditFilterParams,
  QaSaveAuditWithSnapshots,
  QaTicketFilterParams,
  QaUpdateTicketInput,
} from './types.js';

function setTicketsDeletedFlag(tickets: QaActionTicketWithDeletion[], auditId: string, isDeleted: boolean): void {
  tickets.forEach((t) => {
    if (t.auditId === auditId) {
      t.isDeleted = isDeleted;
    }
  });
}

export function filterAndSortAudits(audits: QaDailyAudit[], params?: QaAuditFilterParams): QaDailyAudit[] {
  let result = [...audits];

  if (params?.onlyDeleted) {
    result = result.filter((a) => a.isDeleted === true);
  } else if (!params?.includeDeleted) {
    result = result.filter((a) => !a.isDeleted);
  }

  if (params?.branchCode && params.branchCode !== 'ALL') {
    result = result.filter((a) => a.branchCode === params.branchCode);
  }

  if (params?.dateFrom) {
    result = result.filter((a) => a.auditDate >= params.dateFrom!);
  }

  if (params?.dateTo) {
    result = result.filter((a) => a.auditDate <= params.dateTo!);
  }

  // Sort by newest audit date first
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function softDeleteAuditWithTickets(
  audits: QaDailyAudit[],
  tickets: QaActionTicketWithDeletion[],
  id: string,
  deletedBy?: string
): QaDailyAudit {
  const audit = audits.find((a) => a.id === id);
  if (!audit) {
    throw new Error(`Biên bản audit với mã ${id} không tồn tại`);
  }
  audit.isDeleted = true;
  audit.deletedAt = new Date().toISOString();
  audit.deletedBy = deletedBy || 'Admin';

  setTicketsDeletedFlag(tickets, id, true);

  return audit;
}

export function restoreAuditWithTickets(
  audits: QaDailyAudit[],
  tickets: QaActionTicketWithDeletion[],
  id: string
): QaDailyAudit {
  const audit = audits.find((a) => a.id === id);
  if (!audit) {
    throw new Error(`Biên bản audit với mã ${id} không tồn tại`);
  }
  audit.isDeleted = false;
  audit.deletedAt = undefined;
  audit.deletedBy = undefined;

  setTicketsDeletedFlag(tickets, id, false);

  return audit;
}

export function getAuditDetailById(audits: QaDailyAudit[], id: string): QaDailyAudit | null {
  return audits.find((a) => a.id === id) || null;
}

export function createAndRecordAudit(
  audits: QaDailyAudit[],
  tickets: QaActionTicketWithDeletion[],
  template: QaChecklistTemplate,
  input: QaSaveAuditInput
): QaDailyAudit {
  const auditId = `aud-${template.branchCode.toLowerCase()}-${Date.now().toString().slice(-6)}`;
  const auditCode = `AUD-${template.branchCode}-${new Date().toISOString().slice(5, 10).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`;

  let passedCount = 0;
  let failedCount = 0;
  let naCount = 0;
  let earnedPoints = 0;
  let maxPossiblePoints = 0;
  let criticalFailuresCount = 0;
  let minorFailuresCount = 0;

  const recordedItems: QaAuditItemRecord[] = [];

  // Map template items for fast lookup
  const itemMap = new Map<string, { sectionId: string; sectionTitle: string; item: QaChecklistItem }>();
  template.sections.forEach((sec) => {
    sec.items.forEach((itm) => {
      itemMap.set(itm.id, { sectionId: sec.id, sectionTitle: sec.title, item: itm });
    });
  });

  input.items.forEach((submitted) => {
    const found = itemMap.get(submitted.itemId);
    if (!found) return;

    const { sectionId, sectionTitle, item } = found;
    const weight = item.weight || 1;

    let ticketId: string | undefined;

    if (submitted.result === 'PASS') {
      passedCount++;
      earnedPoints += weight;
      maxPossiblePoints += weight;
    } else if (submitted.result === 'FAIL') {
      failedCount++;
      maxPossiblePoints += weight;
      if (item.isCritical) {
        criticalFailuresCount++;
      } else {
        minorFailuresCount++;
      }

      // Auto-generate Action Ticket for FAIL items
      const ticketCode = `ACT-${template.branchCode}-${Math.floor(1000 + Math.random() * 9000)}`;
      ticketId = `tkt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const newTicket: QaActionTicket = {
        id: ticketId,
        ticketCode,
        auditId,
        auditCode,
        branchCode: template.branchCode,
        branchName: template.branchName,
        itemId: item.id,
        itemTitle: item.title,
        sectionTitle,
        standardRequirement: item.standardRequirement,
        severity: submitted.severity || (item.isCritical ? 'HIGH' : 'MEDIUM'),
        assignedToStaffId: input.evaluatedStaffId
          ? String(input.evaluatedStaffId)
          : `mgr-${template.branchCode.toLowerCase()}`,
        assignedToStaffName: input.evaluatedStaffName || `Quản Lý Chi Nhánh ${template.branchName}`,
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10), // 2 days deadline
        status: 'OPEN',
        issueNotes: submitted.note || 'Không đạt tiêu chuẩn kiểm tra.',
        proofPhotoUrls: submitted.photoUrls || [],
        createdAt: new Date().toISOString(),
      };

      tickets.unshift(newTicket);
    } else {
      naCount++;
    }

    recordedItems.push({
      itemId: item.id,
      itemCode: item.code,
      itemTitle: item.title,
      sectionId,
      sectionTitle,
      weight,
      result: submitted.result,
      note: submitted.note,
      photoUrls: submitted.photoUrls,
      severity: submitted.severity,
      ticketId,
    });
  });

  const complianceRate = maxPossiblePoints > 0 ? Math.round((earnedPoints / maxPossiblePoints) * 1000) / 10 : 100;

  // Đánh giá kết quả kiểm định tác phong & trạm mi theo quy tắc mOS (Điều răn CAREER-QA-001)
  // 1 lỗi nghiêm trọng -> RỚT; >= 3 lỗi nhỏ -> RỚT. Nếu có đơn xin phép trước -> REMEDIATION_PENDING
  let auditEvaluationResult: 'PASSED' | 'FAILED' | 'REMEDIATION_PENDING' = 'PASSED';
  if (criticalFailuresCount >= 1 || minorFailuresCount >= 3) {
    if (input.isPreApproved) {
      auditEvaluationResult = 'REMEDIATION_PENDING';
    } else {
      auditEvaluationResult = 'FAILED';
    }
  }

  const inputWithSnapshots = input as QaSaveAuditWithSnapshots;
  const newAudit: QaDailyAudit = {
    id: auditId,
    auditCode,
    templateId: template.id,
    templateCode: template.code,
    branchCode: template.branchCode,
    branchName: template.branchName,
    auditorId: input.auditorId || 'usr-admin-01',
    auditorName: input.auditorName || 'Danny Do',
    auditDate: input.auditDate || new Date().toISOString().slice(0, 10),
    shift: input.shift || 'Sáng',
    evaluatedStaffId: input.evaluatedStaffId || null,
    evaluatedStaffName: input.evaluatedStaffName || null,
    isPreApproved: Boolean(input.isPreApproved),
    criticalFailuresCount,
    minorFailuresCount,
    auditEvaluationResult,
    overallScore: earnedPoints,
    maxScore: maxPossiblePoints,
    complianceRate,
    passedCount,
    failedCount,
    naCount,
    status: 'COMPLETED',
    notes: input.notes,
    createdAt: new Date().toISOString(),
    items: recordedItems,
    itemSnapshot: inputWithSnapshots.itemSnapshot,
    sectionsSnapshot: inputWithSnapshots.sectionsSnapshot,
  };

  audits.unshift(newAudit);
  return newAudit;
}

export function getAuditsByStaffId(audits: QaDailyAudit[], staffId: number): QaDailyAudit[] {
  return audits.filter((a) => !a.isDeleted && Number(a.evaluatedStaffId) === Number(staffId));
}

export function filterAndSortTickets(
  tickets: QaActionTicketWithDeletion[],
  params?: QaTicketFilterParams
): QaActionTicket[] {
  let result = [...tickets];

  if (params?.branchCode && params.branchCode !== 'ALL') {
    result = result.filter((t) => t.branchCode === params.branchCode);
  }

  if (params?.status && params.status !== 'ALL') {
    result = result.filter((t) => t.status === params.status);
  }

  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function applyTicketUpdate(
  tickets: QaActionTicketWithDeletion[],
  ticketId: string,
  updates: QaUpdateTicketInput
): QaActionTicket {
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) {
    throw new Error(`Action Ticket not found: ${ticketId}`);
  }

  if (updates.status) ticket.status = updates.status;
  if (updates.resolutionNotes) ticket.resolutionNotes = updates.resolutionNotes;
  if (updates.resolutionPhotoUrls) ticket.resolutionPhotoUrls = updates.resolutionPhotoUrls;
  if (updates.resolvedByStaffName) ticket.resolvedByStaffName = updates.resolvedByStaffName;

  if (updates.status === 'RESOLVED' || updates.status === 'VERIFIED') {
    ticket.resolvedAt = new Date().toISOString();
  }

  return ticket;
}
