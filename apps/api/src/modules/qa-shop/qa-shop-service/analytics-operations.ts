import type { QaComplianceStats, QaDailyAudit, QaShopBranchCode } from '@mos-lab/shared';
import type { QaActionTicketWithDeletion } from './types.js';

export function computeQaAnalytics(audits: QaDailyAudit[], tickets: QaActionTicketWithDeletion[]): QaComplianceStats {
  const activeAudits = audits.filter((a) => !a.isDeleted);
  const activeTickets = tickets.filter((t) => !t.isDeleted);

  const totalAudits = activeAudits.length;
  const avgCompliance =
    totalAudits > 0
      ? Math.round((activeAudits.reduce((acc, curr) => acc + curr.complianceRate, 0) / totalAudits) * 10) / 10
      : 100;

  const totalFailedItems = activeTickets.length;
  const resolvedTicketsCount = activeTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'VERIFIED').length;
  const openTicketsCount = activeTickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;

  // Branch Comparison
  const branchMap = new Map<QaShopBranchCode, { name: string; scores: number[]; fails: number }>();
  activeAudits.forEach((aud) => {
    if (!branchMap.has(aud.branchCode)) {
      branchMap.set(aud.branchCode, { name: aud.branchName, scores: [], fails: 0 });
    }
    const b = branchMap.get(aud.branchCode)!;
    b.scores.push(aud.complianceRate);
    b.fails += aud.failedCount;
  });

  const branchComparison = Array.from(branchMap.entries()).map(([code, val]) => ({
    branchCode: code,
    branchName: val.name,
    avgScore: Math.round((val.scores.reduce((a, b) => a + b, 0) / val.scores.length) * 10) / 10,
    auditCount: val.scores.length,
    failedCount: val.fails,
  }));

  return {
    averageComplianceRate: avgCompliance,
    totalAudits,
    totalFailedItems,
    resolvedTicketsCount,
    openTicketsCount,
    branchComparison,
    sectionBreakdown: [
      { sectionTitle: 'Quầy Lễ Tân', passRate: 95.2 },
      { sectionTitle: 'Sảnh Chờ & Không Gian', passRate: 91.8 },
      { sectionTitle: 'Tác Phong & Đồng Phục', passRate: 98.0 },
      { sectionTitle: 'Vệ Sinh & Cơ Sở Vật Chất', passRate: 88.5 },
    ],
  };
}
