import {
  calculateAcademyTalentAssessmentResult,
  calculateAcademyWorkshopAgendaRemainingSeconds,
  calculateAcademyWorkshopFeeStatus,
  formatAcademyTalentBenefitLabel,
  type AcademyTalentAssessmentQuote,
  type AcademyWorkshopAgendaItem,
  type AcademyWorkshopDesignItem,
  type AcademyWorkshopDesignItemImage,
  type AcademyWorkshopEquipmentPackage,
  type AcademyWorkshopEquipmentPackageImage,
  type AcademyWorkshopMenuItem,
  type AcademyWorkshopMenuSelection,
  type AcademyWorkshopParticipant,
  type AcademyWorkshopParticipantDesignSelection,
  type AcademyWorkshopParticipantEquipmentSelection,
  type AcademyWorkshopQuiz,
  type AcademyWorkshopSummary,
  type SafeAny,
} from '@mos-lab/shared';
import { AcademyWorkshopStorageService } from '../academy-workshop-storage.service.js';
import {
  equipmentItems,
  instructor,
  MENU_CATEGORY_ORDER,
  menuCategory,
  normalizeDifficultyLevel,
  parseJson,
  resolveAcademyWorkshopPublicOrigin,
  staff,
} from './workshop-helpers.js';

export function toAcademyWorkshopQuiz(row: SafeAny, revealAnswers = false): AcademyWorkshopQuiz | null {
  if (!row) return null;
  return {
    id: Number(row.id),
    workshopId: row.workshopId == null ? null : Number(row.workshopId),
    sourceTemplateId: row.sourceTemplateId == null ? null : Number(row.sourceTemplateId),
    sourceTemplateTitle: row.sourceTemplate?.title ?? null,
    agendaItemId: row.agendaItemId == null ? null : Number(row.agendaItemId),
    title: String(row.title),
    description: row.description ?? null,
    isTemplate: Boolean(row.isTemplate),
    status: row.status as AcademyWorkshopQuiz['status'],
    activeQuestionId: row.activeQuestionId == null ? null : Number(row.activeQuestionId),
    questionOpenedAt: row.questionOpenedAt ? new Date(row.questionOpenedAt).toISOString() : null,
    questionClosesAt: row.questionClosesAt ? new Date(row.questionClosesAt).toISOString() : null,
    podiumRewards: parseJson<Record<string, string>>(row.podiumRewardsJson, {}),
    questions: (row.questions || []).map((question: SafeAny) => ({
      id: Number(question.id),
      quizId: Number(question.quizId),
      type: question.type as AcademyWorkshopQuiz['questions'][number]['type'],
      prompt: String(question.prompt),
      imageUrl: question.imageUrl ?? null,
      durationSeconds: Number(question.durationSeconds),
      sortOrder: Number(question.sortOrder),
      rewardRule: question.rewardRule as AcademyWorkshopQuiz['questions'][number]['rewardRule'],
      fastestCount: Number(question.fastestCount),
      rewardLabel: question.rewardLabel ?? null,
      rewardQuantity: Number(question.rewardQuantity),
      options: (question.options || []).map((option: SafeAny) => ({
        id: Number(option.id),
        label: String(option.label),
        color: option.color ?? null,
        sortOrder: Number(option.sortOrder),
        ...(revealAnswers ? { isCorrect: Boolean(option.isCorrect) } : {}),
      })),
    })),
  };
}

export function toAcademyWorkshopAgendaItem(row: SafeAny, now = new Date()): AcademyWorkshopAgendaItem {
  const startedAt = row.startedAt ? new Date(row.startedAt) : null;
  const pausedAt = row.pausedAt ? new Date(row.pausedAt) : null;
  const completedAt = row.completedAt ? new Date(row.completedAt) : null;
  const elapsedSeconds = startedAt
    ? Math.max(
        0,
        Math.floor(((completedAt || pausedAt || now).getTime() - startedAt.getTime()) / 1000) -
          Math.max(0, Number(row.pausedSeconds) || 0)
      )
    : 0;
  return {
    id: Number(row.id),
    workshopId: Number(row.workshopId),
    title: String(row.title),
    description: row.description ?? null,
    kind: row.kind,
    plannedDurationSeconds: Number(row.plannedDurationSeconds),
    sortOrder: Number(row.sortOrder),
    status: row.status,
    startedAt: startedAt?.toISOString() || null,
    completedAt: completedAt?.toISOString() || null,
    pausedAt: pausedAt?.toISOString() || null,
    pausedSeconds: Math.max(0, Number(row.pausedSeconds) || 0),
    actualDurationSeconds: completedAt ? elapsedSeconds : null,
    remainingSeconds: calculateAcademyWorkshopAgendaRemainingSeconds(
      row.plannedDurationSeconds,
      startedAt,
      pausedAt,
      row.pausedSeconds,
      now
    ),
  };
}

export function menuItem(row: SafeAny): AcademyWorkshopMenuItem {
  return {
    id: Number(row.id),
    workshopId: Number(row.workshopId),
    category: menuCategory(row.category),
    name: String(row.name),
    description: row.description ?? null,
    imageUrl: row.imageUrl ?? null,
    sortOrder: Math.max(0, Number(row.sortOrder) || 0),
    isAvailable: Boolean(row.isAvailable),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export function menuSelection(row: SafeAny): AcademyWorkshopMenuSelection {
  return {
    id: Number(row.id),
    participantId: Number(row.participantId),
    menuItemId: row.menuItemId == null ? null : Number(row.menuItemId),
    category: menuCategory(row.category),
    itemName: String(row.itemName),
    selectedAt: new Date(row.selectedAt).toISOString(),
  };
}

export function equipmentPackageImage(row: SafeAny): AcademyWorkshopEquipmentPackageImage {
  return {
    id: Number(row.id),
    equipmentPackageId: Number(row.equipmentPackageId),
    imageUrl: String(row.imageUrl),
    altText: row.altText ?? null,
    sortOrder: Math.max(0, Number(row.sortOrder) || 0),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export function equipmentPackage(row: SafeAny): AcademyWorkshopEquipmentPackage {
  return {
    id: Number(row.id),
    workshopId: Number(row.workshopId),
    name: String(row.name),
    description: row.description ?? null,
    includedItems: equipmentItems(row.includedItemsJson),
    priceVnd: Math.max(0, Math.round(Number(row.priceVnd) || 0)),
    sortOrder: Math.max(0, Number(row.sortOrder) || 0),
    isAvailable: Boolean(row.isAvailable),
    isIncludedInFee: Boolean(row.isIncludedInFee),
    images: (row.images || []).map(equipmentPackageImage),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export function equipmentSelection(row: SafeAny): AcademyWorkshopParticipantEquipmentSelection | null {
  if (!row) return null;
  return {
    id: Number(row.id),
    participantId: Number(row.participantId),
    equipmentPackageId: row.equipmentPackageId == null ? null : Number(row.equipmentPackageId),
    packageName: String(row.packageName),
    packageContents: equipmentItems(row.packageContentsJson),
    priceVnd: Math.max(0, Math.round(Number(row.priceVnd) || 0)),
    selectedAt: new Date(row.selectedAt).toISOString(),
  };
}

export function designItemImage(row: SafeAny): AcademyWorkshopDesignItemImage {
  return {
    id: Number(row.id),
    designItemId: Number(row.designItemId),
    imageUrl: String(row.imageUrl),
    altText: row.altText ?? null,
    sortOrder: Math.max(0, Number(row.sortOrder) || 0),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export function designItem(row: SafeAny): AcademyWorkshopDesignItem {
  return {
    id: Number(row.id),
    workshopId: Number(row.workshopId),
    name: String(row.name),
    description: row.description ?? null,
    difficultyLevel: normalizeDifficultyLevel(row.difficultyLevel),
    priceVnd: Math.max(0, Math.round(Number(row.priceVnd) || 0)),
    sortOrder: Math.max(0, Number(row.sortOrder) || 0),
    isAvailable: Boolean(row.isAvailable),
    images: (row.images || []).map(designItemImage),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export function designSelection(row: SafeAny): AcademyWorkshopParticipantDesignSelection | null {
  if (!row) return null;
  return {
    id: Number(row.id),
    participantId: Number(row.participantId),
    designItemId: row.designItemId == null ? null : Number(row.designItemId),
    designName: String(row.designName),
    difficultyLevel: normalizeDifficultyLevel(row.difficultyLevel),
    priceVnd: Math.max(0, Math.round(Number(row.priceVnd) || 0)),
    selectedAt: new Date(row.selectedAt).toISOString(),
  };
}

export function sortMenuItems(items: AcademyWorkshopMenuItem[]) {
  return [...items].sort(
    (left, right) =>
      (MENU_CATEGORY_ORDER.get(left.category) || 0) - (MENU_CATEGORY_ORDER.get(right.category) || 0) ||
      left.sortOrder - right.sortOrder ||
      left.id - right.id
  );
}

export function academyWorkshopTalentSnapshotFromAssessment(assessment: SafeAny) {
  const quote = parseJson<AcademyTalentAssessmentQuote | null>(assessment.quoteSnapshotJson, null);
  const fallbackResult = calculateAcademyTalentAssessmentResult(assessment);
  // An assessment snapshot is calculated with the global ladder policy active
  // at save time. Recalculating here with the code defaults makes Workshop OS
  // drift from the Talent drawer whenever Academy customises that ladder.
  const result =
    quote?.result &&
    typeof quote.result.rewardLabel === 'string' &&
    Number.isFinite(Number(quote.result.scholarshipPercent))
      ? quote.result
      : fallbackResult;
  const paid = (assessment.payments || []).reduce(
    (sum: number, payment: SafeAny) => sum + Math.max(0, Math.round(Number(payment.amountVnd) || 0)),
    0
  );
  const finalPriceVnd = Math.max(0, Math.round(Number(quote?.finalPriceVnd) || 0));
  const scholarshipPercent = Math.max(0, Math.round(Number(result.scholarshipPercent) || 0));
  const sampleRewardPercent = Math.max(
    0,
    Math.round(Number(quote?.sampleRewardPercent ?? result.tier?.sampleRewardPercent) || 0)
  );
  const kitRewardPercent = Math.max(
    0,
    Math.round(Number(quote?.kitRewardPercent ?? result.tier?.kitRewardPercent) || 0)
  );
  return {
    assessmentId: Number(assessment.id),
    status: String(assessment.status),
    qualified: result.qualified,
    strands5Min: Number(assessment.strands5Min),
    totalErrors: result.totalErrors,
    eyeScore: Number(assessment.eyeScore),
    handScore: Number(assessment.handScore),
    rankLabel: result.rankLabel,
    rewardLabel: formatAcademyTalentBenefitLabel(
      { scholarshipPercent, sampleRewardPercent, kitRewardPercent },
      result.rewardLabel
    ),
    scholarshipPercent,
    sampleRewardPercent,
    kitRewardPercent,
    invoiceNumber: assessment.invoiceNumber ?? null,
    finalPriceVnd,
    totalPaidVnd: paid,
    paymentStatus: finalPriceVnd > 0 && paid >= finalPriceVnd ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
    completedAt: new Date(assessment.updatedAt).toISOString(),
  };
}

export function talent(row: SafeAny) {
  const assessment = (row.assessments || []).find((item: SafeAny) => item.status !== 'DRAFT') || row.assessments?.[0];
  return assessment ? academyWorkshopTalentSnapshotFromAssessment(assessment) : null;
}

export async function toParticipant(
  row: SafeAny,
  feeVnd: number,
  qrToken?: string
): Promise<AcademyWorkshopParticipant> {
  const appliedFeeVnd =
    row.appliedFeeVnd !== null && row.appliedFeeVnd !== undefined
      ? Math.max(0, Math.round(Number(row.appliedFeeVnd)))
      : null;
  const discountVnd = Math.max(0, Math.round(Number(row.discountVnd) || 0));
  const discountReason = row.discountReason ? String(row.discountReason).trim() : null;
  const effectiveFee = appliedFeeVnd !== null ? appliedFeeVnd : Math.max(0, feeVnd - discountVnd);

  const paid = (row.feePayments || []).reduce(
    (sum: number, payment: SafeAny) => sum + Math.round(Number(payment.amountVnd) || 0),
    0
  );
  const feeStatus = calculateAcademyWorkshopFeeStatus(effectiveFee, paid, Boolean(row.feeWaivedAt));
  const photos = await Promise.all(
    (row.photos || []).map(async (photo: SafeAny) => ({
      id: Number(photo.id),
      participantId: Number(photo.participantId),
      storagePath: String(photo.storagePath),
      signedUrl: await AcademyWorkshopStorageService.signedViewUrl(String(photo.storagePath)).catch(() => null),
      mimeType: String(photo.mimeType),
      sizeBytes: Number(photo.sizeBytes),
      caption: photo.caption ?? null,
      capturedAt: new Date(photo.capturedAt).toISOString(),
      capturedBy: staff(photo.capturedBy),
    }))
  );
  const latestTalent = talent(row);
  const bonusRows = row.instructorBonuses || [];
  const instructorBonusVnd = bonusRows.reduce(
    (sum: number, bonus: SafeAny) => sum + (bonus.status === 'VOID' ? 0 : Math.max(0, Number(bonus.amountVnd) || 0)),
    0
  );
  const bonusStatus = bonusRows.some((bonus: SafeAny) => bonus.status === 'MISSING_CONFIG')
    ? 'MISSING_CONFIG'
    : bonusRows.some((bonus: SafeAny) => bonus.status === 'EARNED')
      ? 'EARNED'
      : bonusRows.some((bonus: SafeAny) => bonus.status === 'PAID')
        ? 'PAID'
        : bonusRows.some((bonus: SafeAny) => bonus.status === 'VOID')
          ? 'VOID'
          : null;
  const lead = row.campaignLead.lead;
  return {
    id: Number(row.id),
    campaignLeadId: Number(row.campaignLeadId),
    workshopId: Number(row.workshopId),
    addedAt: new Date(row.createdAt).toISOString(),
    lead: {
      id: Number(lead.id),
      name: String(lead.name),
      phone: lead.phone ?? null,
      email: lead.email ?? null,
      avatarUrl: lead.avatarUrl ?? null,
      facebookChatLink: lead.facebookChatLink ?? null,
      status: lead.status,
      course: lead.course ?? null,
      source: String(lead.source),
    },
    infoSentAt: row.infoSentAt ? new Date(row.infoSentAt).toISOString() : null,
    infoSentBy: staff(row.infoSentBy),
    attendanceStatus: row.attendanceStatus,
    attendanceConfirmedAt: row.attendanceConfirmedAt ? new Date(row.attendanceConfirmedAt).toISOString() : null,
    attendanceConfirmedBy: staff(row.attendanceConfirmedBy),
    feeStatus,
    feePaidVnd: Math.max(0, paid),
    feeRemainingVnd: feeStatus === 'WAIVED' ? 0 : Math.max(0, effectiveFee - paid),
    appliedFeeVnd,
    discountVnd: appliedFeeVnd !== null ? Math.max(0, feeVnd - appliedFeeVnd) : discountVnd,
    discountReason,
    feeWaivedAt: row.feeWaivedAt ? new Date(row.feeWaivedAt).toISOString() : null,
    feeWaiverReason: row.feeWaiverReason ?? null,
    checkedInAt: row.checkedInAt ? new Date(row.checkedInAt).toISOString() : null,
    checkedInBy: staff(row.checkedInBy),
    photoConsentAt: row.photoConsentAt ? new Date(row.photoConsentAt).toISOString() : null,
    photoConsentVersion: row.photoConsentVersion ?? null,
    primaryInstructor: instructor(row.primaryInstructor),
    qrRedeemedAt: row.qrRedeemedAt ? new Date(row.qrRedeemedAt).toISOString() : null,
    tokenVersion: Number(row.tokenVersion),
    ...(qrToken
      ? {
          qrToken,
          qrUrl: `${resolveAcademyWorkshopPublicOrigin()}/academy/workshops/join/${encodeURIComponent(qrToken)}`,
        }
      : {}),
    photos,
    feePayments: (row.feePayments || []).map((payment: SafeAny) => ({
      id: Number(payment.id),
      participantId: Number(payment.participantId),
      amountVnd: Math.round(Number(payment.amountVnd) || 0),
      method: payment.method,
      reference: payment.reference ?? null,
      note: payment.note ?? null,
      receivedAt: new Date(payment.receivedAt).toISOString(),
      confirmedBy: staff(payment.confirmedBy),
      createdAt: new Date(payment.createdAt).toISOString(),
    })),
    menuSelections: (row.menuSelections || []).map(menuSelection),
    equipmentSelection: equipmentSelection(row.equipmentSelection),
    designSelection: designSelection(row.designSelection),
    talent: latestTalent,
    gameScore: (row.answers || []).reduce((sum: number, answer: SafeAny) => sum + Number(answer.score || 0), 0),
    gameResponseTimeMs: (row.answers || []).reduce(
      (sum: number, answer: SafeAny) => sum + Number(answer.responseTimeMs || 0),
      0
    ),
    pendingRewardCount: (row.rewards || []).filter((reward: SafeAny) => reward.status === 'PROMISED').length,
    instructorBonusVnd,
    instructorBonusStatus: bonusStatus,
  };
}

export function summarize(participants: AcademyWorkshopParticipant[]): AcademyWorkshopSummary {
  return {
    total: participants.length,
    infoSent: participants.filter((row) => row.infoSentAt).length,
    confirmed: participants.filter((row) => row.attendanceStatus === 'CONFIRMED').length,
    feeReady: participants.filter((row) => ['FREE', 'PAID', 'WAIVED'].includes(row.feeStatus)).length,
    checkedIn: participants.filter((row) => row.checkedInAt).length,
    tested: participants.filter((row) => row.talent).length,
    invoiced: participants.filter((row) => row.talent?.invoiceNumber).length,
    tuitionPaid: participants.filter((row) => row.talent?.paymentStatus === 'PAID').length,
    bonusEarned: participants.filter((row) => ['EARNED', 'PAID'].includes(row.instructorBonusStatus || '')).length,
    noShow: participants.filter((row) => !row.checkedInAt).length,
  };
}
