import { randomUUID } from 'node:crypto';
import type { MosBibleProposal, MosBibleProposalTier } from '@mos-lab/shared';
import type { PrismaClient as CrmPrismaClient } from '../../../generated/crm-client/index.js';

const BIBLE_PROPOSALS_CONFIG_KEY = 'MOS_BIBLE_PROPOSALS_REGISTRY';

// Keywords that strictly mandate Danny Do's final approval
const FINANCIAL_AND_LEGAL_KEYWORDS = [
  'tiền',
  'lương',
  'thưởng',
  'tip',
  'bonus',
  'hoa hồng',
  'giá',
  'bảng giá',
  'chiết khấu',
  'pháp lý',
  'hợp đồng',
  'phạt',
  'chính sách nhân sự',
  'tài chính',
  'ngân sách',
  'doanh thu',
];

/**
 * Determine whether a proposal involves financial, legal, or major policy impact
 */
export function classifyBibleProposalTier(
  title: string,
  summary: string,
  commandments: readonly string[],
  tags: readonly string[]
): MosBibleProposalTier {
  const fullText = `${title} ${summary} ${commandments.join(' ')} ${tags.join(' ')}`.toLowerCase();
  const hasFinancialOrLegal = FINANCIAL_AND_LEGAL_KEYWORDS.some((kw) => fullText.includes(kw));
  return hasFinancialOrLegal ? 'DANNY_FINAL' : 'CORE_TEAM';
}

/**
 * Read proposals from crmConfig
 */
export async function listBibleProposals(crm: CrmPrismaClient): Promise<MosBibleProposal[]> {
  const record = await crm.crmConfig.findUnique({
    where: { key: BIBLE_PROPOSALS_CONFIG_KEY },
  });
  if (!record?.value) return [];
  try {
    return JSON.parse(record.value) as MosBibleProposal[];
  } catch {
    return [];
  }
}

/**
 * Create a new proposal with automated tier classification
 */
export async function createBibleProposal(
  crm: CrmPrismaClient,
  input: {
    book: MosBibleProposal['book'];
    title: string;
    summary: string;
    commandments: string[];
    rationale: string;
    examples?: string[];
    tags: string[];
  },
  staff: { id: number; name: string; role: string }
): Promise<MosBibleProposal> {
  const tier = classifyBibleProposalTier(input.title, input.summary, input.commandments, input.tags);
  const now = new Date().toISOString();

  const newProposal: MosBibleProposal = {
    id: `prop-${randomUUID().slice(0, 8)}`,
    proposedByStaffId: staff.id,
    proposedByName: staff.name,
    proposedByRole: staff.role,
    tier,
    book: input.book,
    title: input.title.trim(),
    summary: input.summary.trim(),
    commandments: input.commandments.map((c) => c.trim()).filter(Boolean),
    rationale: input.rationale.trim(),
    examples: input.examples?.map((e) => e.trim()).filter(Boolean),
    tags: input.tags.map((t) => t.trim()).filter(Boolean),
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  };

  const existing = await listBibleProposals(crm);
  const updated = [newProposal, ...existing];

  await crm.crmConfig.upsert({
    where: { key: BIBLE_PROPOSALS_CONFIG_KEY },
    create: {
      key: BIBLE_PROPOSALS_CONFIG_KEY,
      value: JSON.stringify(updated),
    },
    update: {
      value: JSON.stringify(updated),
    },
  });

  return newProposal;
}

/**
 * Approve a proposal with strict tier verification
 */
export async function approveBibleProposal(
  crm: CrmPrismaClient,
  proposalId: string,
  reviewer: { id: number; name: string; role: string }
): Promise<{ success: boolean; proposal?: MosBibleProposal; error?: string }> {
  const proposals = await listBibleProposals(crm);
  const target = proposals.find((p) => p.id === proposalId);
  if (!target) {
    return { success: false, error: 'Không tìm thấy đề xuất này' };
  }
  if (target.status !== 'PENDING') {
    return { success: false, error: 'Đề xuất này đã được xử lý trước đó' };
  }

  // Verify authority
  const isDanny = reviewer.id === 1 || reviewer.role === 'super_admin';
  const isCoreTeam = ['admin', 'manager', 'director', 'super_admin'].includes(reviewer.role);

  if (target.tier === 'DANNY_FINAL' && !isDanny) {
    return {
      success: false,
      error:
        'Đề xuất này liên quan đến Tiền, Pháp lý hoặc Chính sách cốt lõi; bắt buộc anh Danny Do duyệt bước cuối cùng.',
    };
  }

  if (!isCoreTeam && !isDanny) {
    return {
      success: false,
      error: 'Bạn không có thẩm quyền phê duyệt Điều răn trong Kinh Thánh mOS.',
    };
  }

  const now = new Date().toISOString();
  target.status = 'APPROVED';
  target.reviewedByStaffId = reviewer.id;
  target.reviewedByName = reviewer.name;
  target.reviewedAt = now;
  target.updatedAt = now;

  await crm.crmConfig.update({
    where: { key: BIBLE_PROPOSALS_CONFIG_KEY },
    data: { value: JSON.stringify(proposals) },
  });

  return { success: true, proposal: target };
}

/**
 * Reject a proposal with reason
 */
export async function rejectBibleProposal(
  crm: CrmPrismaClient,
  proposalId: string,
  reviewer: { id: number; name: string; role: string },
  note?: string
): Promise<{ success: boolean; proposal?: MosBibleProposal; error?: string }> {
  const proposals = await listBibleProposals(crm);
  const target = proposals.find((p) => p.id === proposalId);
  if (!target) {
    return { success: false, error: 'Không tìm thấy đề xuất này' };
  }

  const now = new Date().toISOString();
  target.status = 'REJECTED';
  target.reviewedByStaffId = reviewer.id;
  target.reviewedByName = reviewer.name;
  target.reviewedAt = now;
  target.reviewNote = note?.trim();
  target.updatedAt = now;

  await crm.crmConfig.update({
    where: { key: BIBLE_PROPOSALS_CONFIG_KEY },
    data: { value: JSON.stringify(proposals) },
  });

  return { success: true, proposal: target };
}
