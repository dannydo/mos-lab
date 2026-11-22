import type {
  AcademyWorkshopQuestionType,
  AcademyWorkshopQuiz,
  AcademyWorkshopQuizQuestion,
  AcademyWorkshopRewardRule,
  UpsertAcademyWorkshopQuestionRequest,
  UpsertAcademyWorkshopQuizRequest,
} from '@mos-lab/shared';
import type { StatusType } from '~/components/ui';

export type QuizFormValues = {
  title: string;
  description?: string;
};

export type QuestionFormValues = {
  type: AcademyWorkshopQuestionType;
  prompt: string;
  imageUrl?: string;
  durationSeconds: number;
  sortOrder: number;
  rewardRule: AcademyWorkshopRewardRule;
  fastestCount: number;
  rewardLabel?: string;
  rewardQuantity: number;
  correctOptionIndex: number;
  options: Array<{ label: string }>;
};

export const QUESTION_TYPE_LABELS: Record<AcademyWorkshopQuestionType, string> = {
  SINGLE_CHOICE: 'Một đáp án',
  TRUE_FALSE: 'Đúng / Sai',
};

export const REWARD_RULE_LABELS: Record<AcademyWorkshopRewardRule, string> = {
  NONE: 'Không thưởng',
  ALL_CORRECT: 'Tất cả người trả lời đúng',
  FASTEST_N: 'Nhanh nhất',
};

export const QUIZ_STATUS_LABELS: Record<AcademyWorkshopQuiz['status'], string> = {
  DRAFT: 'Bản nháp',
  LOBBY: 'Đang chờ người chơi',
  QUESTION_OPEN: 'Đang mở câu hỏi',
  QUESTION_CLOSED: 'Đã khóa câu hỏi',
  REVEALED: 'Đang công bố đáp án',
  COMPLETED: 'Đã kết thúc',
};

export function emptyQuestion(sortOrder: number): QuestionFormValues {
  return {
    type: 'SINGLE_CHOICE',
    prompt: '',
    imageUrl: '',
    durationSeconds: 20,
    sortOrder,
    rewardRule: 'NONE',
    fastestCount: 1,
    rewardLabel: '',
    rewardQuantity: 1,
    correctOptionIndex: 0,
    options: [{ label: '' }, { label: '' }, { label: '' }, { label: '' }],
  };
}

export function questionValues(question: AcademyWorkshopQuizQuestion): QuestionFormValues {
  return {
    type: question.type,
    prompt: question.prompt,
    imageUrl: question.imageUrl || '',
    durationSeconds: question.durationSeconds,
    sortOrder: question.sortOrder,
    rewardRule: question.rewardRule,
    fastestCount: question.fastestCount,
    rewardLabel: question.rewardLabel || '',
    rewardQuantity: question.rewardQuantity,
    correctOptionIndex: Math.max(
      0,
      question.options.findIndex((option) => option.isCorrect)
    ),
    options: question.options.map((option) => ({ label: option.label })),
  };
}

export function toQuizUpsertRequest(values: QuizFormValues): UpsertAcademyWorkshopQuizRequest {
  return {
    title: values.title.trim(),
    description: values.description?.trim() || null,
    isTemplate: false,
  };
}

export function toQuestionUpsertRequest(values: QuestionFormValues): UpsertAcademyWorkshopQuestionRequest {
  return {
    type: values.type,
    prompt: values.prompt.trim(),
    imageUrl: values.imageUrl?.trim() || null,
    durationSeconds: values.durationSeconds,
    sortOrder: values.sortOrder,
    rewardRule: values.rewardRule,
    fastestCount: values.rewardRule === 'FASTEST_N' ? values.fastestCount : 1,
    rewardLabel: values.rewardRule === 'NONE' ? null : values.rewardLabel?.trim() || null,
    rewardQuantity: values.rewardRule === 'NONE' ? 1 : values.rewardQuantity,
    options: values.options.map((option, index) => ({
      label: option.label.trim(),
      isCorrect: index === values.correctOptionIndex,
      sortOrder: index + 1,
    })),
  };
}

export function mutationMessage(cause: unknown, fallback: string): string {
  const error = cause as { response?: { data?: { message?: string } }; message?: string };
  return error.response?.data?.message || error.message || fallback;
}

export function isQuestionExpired(quiz: AcademyWorkshopQuiz | null): boolean {
  return Boolean(
    quiz?.status === 'QUESTION_OPEN' && quiz.questionClosesAt && new Date(quiz.questionClosesAt).getTime() <= Date.now()
  );
}

export function getQuizStatusTagStatus(quiz: AcademyWorkshopQuiz, templateMode: boolean): StatusType {
  if (templateMode) return 'processing';
  if (quiz.status === 'DRAFT') return 'default';
  if (quiz.status === 'COMPLETED') return 'success';
  return 'processing';
}
