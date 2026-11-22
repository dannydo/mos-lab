import type { CloneAcademyWorkshopQuizRequest, SafeAny, UpsertAcademyWorkshopQuestionRequest } from '@mos-lab/shared';
import {
  AcademySalesError,
  canManageAcademySales,
  type AcademyActor,
} from '../../academy-sales/academy-sales.service.js';

export const INTERNAL_ACTOR: AcademyActor = { id: 0, role: 'super_admin', academyAccess: true };

export const QUIZ_INCLUDE = {
  sourceTemplate: { select: { id: true, title: true } },
  questions: { include: { options: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } },
} as const;

export function buildAcademyWorkshopQuestionWindow(question: { id: number; durationSeconds: number }, openedAt: Date) {
  return {
    status: 'QUESTION_OPEN' as const,
    activeQuestionId: question.id,
    questionOpenedAt: openedAt,
    questionClosesAt: new Date(openedAt.getTime() + question.durationSeconds * 1000),
  };
}

export function positiveId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AcademySalesError(`${label} không hợp lệ.`);
  return id;
}

export function normalizeAcademyWorkshopQuestionInput(input: UpsertAcademyWorkshopQuestionRequest) {
  const prompt = String(input.prompt || '').trim();
  const durationSeconds = Math.round(Number(input.durationSeconds));
  if (!prompt || durationSeconds < 5 || durationSeconds > 120) {
    throw new AcademySalesError('Câu hỏi hoặc thời gian 5–120 giây không hợp lệ.');
  }
  if (!['SINGLE_CHOICE', 'TRUE_FALSE'].includes(input.type)) throw new AcademySalesError('Loại câu hỏi không hợp lệ.');
  if (!Array.isArray(input.options) || input.options.length < 2 || input.options.length > 6) {
    throw new AcademySalesError('Mỗi câu cần từ 2 đến 6 lựa chọn.');
  }
  if (input.type === 'TRUE_FALSE' && input.options.length !== 2) {
    throw new AcademySalesError('Câu Đúng/Sai phải có đúng 2 lựa chọn.');
  }
  const optionLabels = input.options.map((option) => String(option.label || '').trim());
  if (optionLabels.some((label) => !label)) throw new AcademySalesError('Nội dung lựa chọn không được để trống.');
  if (input.options.filter((option) => option.isCorrect).length !== 1) {
    throw new AcademySalesError('Mỗi câu phải có đúng một đáp án đúng.');
  }
  return {
    questionData: {
      type: input.type,
      prompt,
      imageUrl: String(input.imageUrl || '').trim() || null,
      durationSeconds,
      sortOrder: Math.max(0, Math.round(Number(input.sortOrder) || 0)),
      rewardRule: input.rewardRule || 'NONE',
      fastestCount: Math.min(100, Math.max(1, Math.round(Number(input.fastestCount) || 1))),
      rewardLabel: String(input.rewardLabel || '').trim() || null,
      rewardQuantity: Math.max(1, Math.round(Number(input.rewardQuantity) || 1)),
    },
    options: input.options.map((option, index) => ({
      label: optionLabels[index],
      color: String(option.color || '').trim() || null,
      isCorrect: Boolean(option.isCorrect),
      sortOrder: option.sortOrder === undefined ? index + 1 : Math.max(0, Math.round(option.sortOrder)),
    })),
  };
}

export function buildAcademyWorkshopQuizCloneData(
  source: SafeAny,
  workshopId: number,
  actorId: number,
  input: CloneAcademyWorkshopQuizRequest = {}
) {
  const requestedTitle = String(input.title || '').trim();
  const title = requestedTitle || `${String(source.title)} · Bản chỉnh sửa`;
  if (title.length > 180) throw new AcademySalesError('Tên game tối đa 180 ký tự.');
  return {
    workshopId,
    sourceTemplateId: source.isTemplate ? Number(source.id) : (source.sourceTemplateId ?? null),
    title,
    description: source.description ?? null,
    isTemplate: false,
    status: 'DRAFT',
    podiumRewardsJson: source.podiumRewardsJson ?? null,
    createdByStaffId: actorId,
    questions: {
      create: (source.questions || []).map((question: SafeAny) => ({
        type: question.type,
        prompt: question.prompt,
        imageUrl: question.imageUrl ?? null,
        durationSeconds: question.durationSeconds,
        sortOrder: question.sortOrder,
        rewardRule: question.rewardRule,
        fastestCount: question.fastestCount,
        rewardLabel: question.rewardLabel ?? null,
        rewardQuantity: question.rewardQuantity,
        options: {
          create: (question.options || []).map((option: SafeAny) => ({
            label: option.label,
            color: option.color ?? null,
            isCorrect: option.isCorrect,
            sortOrder: option.sortOrder,
          })),
        },
      })),
    },
  };
}

export function buildAcademyWorkshopQuizDraftReplacementData(
  source: SafeAny,
  workshopId: number,
  actorId: number,
  input: CloneAcademyWorkshopQuizRequest = {}
) {
  return {
    ...buildAcademyWorkshopQuizCloneData(source, workshopId, actorId, input),
    activeQuestionId: null,
    questionOpenedAt: null,
    questionClosesAt: null,
  };
}

export function manager(actor: AcademyActor) {
  return canManageAcademySales(actor);
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
