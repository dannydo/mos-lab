'use client';

import React from 'react';
import { Alert, Button, Form, Input, InputNumber, Popconfirm, Radio, Select, Space, message } from 'antd';
import { CirclePlus, Clock3, Gamepad2, Pencil, Play, Save, Trash2, Trophy } from 'lucide-react';
import type {
  AcademyWorkshopQuestionType,
  AcademyWorkshopQuiz,
  AcademyWorkshopQuizQuestion,
  AcademyWorkshopRewardRule,
  UpsertAcademyWorkshopQuestionRequest,
  UpsertAcademyWorkshopQuizRequest,
} from '@mos-lab/shared';
import {
  AdaptiveDrawer,
  AdaptiveModal,
  AdaptiveOverlayFooter,
  AppIcon,
  DataSection,
  EntityForm,
  EntityFormField,
  StatePanel,
  StatusTag,
} from '../../../../components/ui';

type QuizFormValues = {
  title: string;
  description?: string;
};

type QuestionFormValues = {
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

export interface AcademyWorkshopQuizManagerProps {
  quiz: AcademyWorkshopQuiz | null;
  mode?: 'WORKSHOP' | 'TEMPLATE';
  onCreateQuiz: (dto: UpsertAcademyWorkshopQuizRequest) => Promise<void>;
  onUpdateQuiz: (quizId: number, dto: UpsertAcademyWorkshopQuizRequest) => Promise<void>;
  onSaveQuestion: (
    quizId: number,
    questionId: number | null,
    dto: UpsertAcademyWorkshopQuestionRequest
  ) => Promise<void>;
  onDeleteQuestion: (quizId: number, questionId: number) => Promise<void>;
  onCompleteQuiz?: (quizId: number) => Promise<void>;
  onCloneQuiz?: (quizId: number) => Promise<void>;
  onOpenLiveControl?: () => void;
  onOpenTemplateLibrary?: () => void;
  onSaveAsTemplate?: (quizId: number) => Promise<void>;
  extraActions?: React.ReactNode;
}

const QUESTION_TYPE_LABELS: Record<AcademyWorkshopQuestionType, string> = {
  SINGLE_CHOICE: 'Một đáp án',
  TRUE_FALSE: 'Đúng / Sai',
};

const REWARD_RULE_LABELS: Record<AcademyWorkshopRewardRule, string> = {
  NONE: 'Không thưởng',
  ALL_CORRECT: 'Tất cả người trả lời đúng',
  FASTEST_N: 'Nhanh nhất',
};

const QUIZ_STATUS_LABELS: Record<AcademyWorkshopQuiz['status'], string> = {
  DRAFT: 'Bản nháp',
  LOBBY: 'Đang chờ người chơi',
  QUESTION_OPEN: 'Đang mở câu hỏi',
  QUESTION_CLOSED: 'Đã khóa câu hỏi',
  REVEALED: 'Đang công bố đáp án',
  COMPLETED: 'Đã kết thúc',
};

function emptyQuestion(sortOrder: number): QuestionFormValues {
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

function questionValues(question: AcademyWorkshopQuizQuestion): QuestionFormValues {
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

function mutationMessage(cause: unknown, fallback: string): string {
  const error = cause as { response?: { data?: { message?: string } }; message?: string };
  return error.response?.data?.message || error.message || fallback;
}

export default function AcademyWorkshopQuizManager({
  quiz,
  mode = 'WORKSHOP',
  onCreateQuiz,
  onUpdateQuiz,
  onSaveQuestion,
  onDeleteQuestion,
  onCompleteQuiz,
  onCloneQuiz,
  onOpenLiveControl,
  onOpenTemplateLibrary,
  onSaveAsTemplate,
  extraActions,
}: AcademyWorkshopQuizManagerProps) {
  const [quizForm] = Form.useForm<QuizFormValues>();
  const [questionForm] = Form.useForm<QuestionFormValues>();
  const [quizModalOpen, setQuizModalOpen] = React.useState(false);
  const [editingQuiz, setEditingQuiz] = React.useState(false);
  const [questionDrawerOpen, setQuestionDrawerOpen] = React.useState(false);
  const [editingQuestion, setEditingQuestion] = React.useState<AcademyWorkshopQuizQuestion | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const questionType = Form.useWatch('type', questionForm);
  const rewardRule = Form.useWatch('rewardRule', questionForm);
  const correctOptionIndex = Form.useWatch('correctOptionIndex', questionForm);
  const optionValues = Form.useWatch('options', questionForm) || [];
  const templateMode = mode === 'TEMPLATE';
  const editable = templateMode ? Boolean(quiz) : quiz?.status === 'DRAFT';
  const questionExpired = Boolean(
    quiz?.status === 'QUESTION_OPEN' && quiz.questionClosesAt && new Date(quiz.questionClosesAt).getTime() <= Date.now()
  );

  const openQuizModal = React.useCallback(
    (edit: boolean) => {
      setEditingQuiz(edit);
      quizForm.setFieldsValue({
        title: edit ? quiz?.title || '' : '',
        description: edit ? quiz?.description || '' : '',
      });
      setQuizModalOpen(true);
    },
    [quiz, quizForm]
  );

  const submitQuiz = React.useCallback(
    async (values: QuizFormValues) => {
      setSubmitting(true);
      try {
        const dto: UpsertAcademyWorkshopQuizRequest = {
          title: values.title.trim(),
          description: values.description?.trim() || null,
          isTemplate: false,
        };
        if (editingQuiz && quiz) await onUpdateQuiz(quiz.id, dto);
        else await onCreateQuiz(dto);
        setQuizModalOpen(false);
        quizForm.resetFields();
        message.success(
          editingQuiz
            ? templateMode
              ? 'Đã cập nhật thông tin mẫu.'
              : 'Đã cập nhật thông tin game.'
            : templateMode
              ? 'Đã tạo mẫu câu hỏi mới.'
              : 'Đã tạo bộ câu hỏi mới.'
        );
      } catch (cause) {
        message.error(mutationMessage(cause, 'Không thể lưu bộ câu hỏi.'));
      } finally {
        setSubmitting(false);
      }
    },
    [editingQuiz, onCreateQuiz, onUpdateQuiz, quiz, quizForm, templateMode]
  );

  const openQuestionDrawer = React.useCallback(
    (question?: AcademyWorkshopQuizQuestion) => {
      if (!quiz || !editable) return;
      const next = question || null;
      setEditingQuestion(next);
      questionForm.setFieldsValue(next ? questionValues(next) : emptyQuestion(quiz.questions.length + 1));
      setQuestionDrawerOpen(true);
    },
    [editable, questionForm, quiz]
  );

  const closeQuestionDrawer = React.useCallback(() => {
    setQuestionDrawerOpen(false);
    setEditingQuestion(null);
    questionForm.resetFields();
  }, [questionForm]);

  const submitQuestion = React.useCallback(
    async (values: QuestionFormValues) => {
      if (!quiz) return;
      setSubmitting(true);
      try {
        const dto: UpsertAcademyWorkshopQuestionRequest = {
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
        await onSaveQuestion(quiz.id, editingQuestion?.id || null, dto);
        message.success(editingQuestion ? 'Đã cập nhật câu hỏi.' : 'Đã thêm câu hỏi.');
        closeQuestionDrawer();
      } catch (cause) {
        message.error(mutationMessage(cause, 'Không thể lưu câu hỏi.'));
      } finally {
        setSubmitting(false);
      }
    },
    [closeQuestionDrawer, editingQuestion, onSaveQuestion, quiz]
  );

  const deleteQuestion = React.useCallback(
    async (questionId: number) => {
      if (!quiz) return;
      setSubmitting(true);
      try {
        await onDeleteQuestion(quiz.id, questionId);
        message.success('Đã xóa câu hỏi.');
      } catch (cause) {
        message.error(mutationMessage(cause, 'Không thể xóa câu hỏi.'));
      } finally {
        setSubmitting(false);
      }
    },
    [onDeleteQuestion, quiz]
  );

  const completeQuiz = React.useCallback(async () => {
    if (!quiz || !onCompleteQuiz) return;
    setSubmitting(true);
    try {
      await onCompleteQuiz(quiz.id);
      message.success('Đã chốt game. Bây giờ bạn có thể tạo bản chỉnh sửa.');
    } catch (cause) {
      message.error(mutationMessage(cause, 'Không thể chốt game.'));
    } finally {
      setSubmitting(false);
    }
  }, [onCompleteQuiz, quiz]);

  const cloneQuiz = React.useCallback(async () => {
    if (!quiz || !onCloneQuiz) return;
    setSubmitting(true);
    try {
      await onCloneQuiz(quiz.id);
      message.success('Đã tạo bản nháp mới với toàn bộ câu hỏi cũ.');
    } catch (cause) {
      message.error(mutationMessage(cause, 'Không thể tạo bản chỉnh sửa.'));
    } finally {
      setSubmitting(false);
    }
  }, [onCloneQuiz, quiz]);

  const saveAsTemplate = React.useCallback(async () => {
    if (!quiz || !onSaveAsTemplate) return;
    setSubmitting(true);
    try {
      await onSaveAsTemplate(quiz.id);
      message.success('Đã lưu game hiện tại thành một mẫu dùng chung mới.');
    } catch (cause) {
      message.error(mutationMessage(cause, 'Không thể lưu game thành mẫu.'));
    } finally {
      setSubmitting(false);
    }
  }, [onSaveAsTemplate, quiz]);

  const changeQuestionType = React.useCallback(
    (type: AcademyWorkshopQuestionType) => {
      if (type === 'TRUE_FALSE') {
        questionForm.setFieldsValue({
          type,
          correctOptionIndex: 0,
          options: [{ label: 'Đúng' }, { label: 'Sai' }],
        });
        return;
      }
      questionForm.setFieldValue('type', type);
      if ((questionForm.getFieldValue('options') || []).length < 2) {
        questionForm.setFieldsValue({ correctOptionIndex: 0, options: [{ label: '' }, { label: '' }] });
      }
    },
    [questionForm]
  );

  return (
    <>
      <DataSection
        title={templateMode ? 'Nội dung mẫu' : 'Game & câu hỏi'}
        extra={
          <Space wrap>
            {editable && quiz ? (
              <>
                <Button icon={<AppIcon icon={Pencil} />} onClick={() => openQuizModal(true)}>
                  {templateMode ? 'Sửa thông tin mẫu' : 'Sửa tên game'}
                </Button>
                <Button
                  type={templateMode ? 'default' : 'primary'}
                  icon={<AppIcon icon={CirclePlus} />}
                  onClick={() => openQuestionDrawer()}
                >
                  Thêm câu hỏi
                </Button>
              </>
            ) : null}
            {!quiz ? (
              <Button type="primary" icon={<AppIcon icon={Gamepad2} />} onClick={() => openQuizModal(false)}>
                {templateMode ? 'Tạo mẫu mới' : 'Tạo bộ câu hỏi mới'}
              </Button>
            ) : null}
            {!templateMode && quiz?.status === 'COMPLETED' ? (
              <Button
                type="primary"
                loading={submitting}
                icon={<AppIcon icon={Pencil} />}
                onClick={() => void cloneQuiz()}
              >
                Tạo bản chỉnh sửa
              </Button>
            ) : null}
            {!templateMode && quiz && !editable && quiz.status !== 'COMPLETED' ? (
              <>
                <Popconfirm
                  title="Chốt game hiện tại?"
                  description="Kết quả và phần thưởng sẽ được khóa; sau đó bạn có thể tạo một bản nháp để chỉnh sửa."
                  okText="Chốt game"
                  cancelText="Hủy"
                  onConfirm={() => void completeQuiz()}
                >
                  <Button type={questionExpired ? 'primary' : 'default'} loading={submitting}>
                    Chốt game
                  </Button>
                </Popconfirm>
                <Button icon={<AppIcon icon={Play} />} onClick={onOpenLiveControl}>
                  Mở Live Control
                </Button>
              </>
            ) : null}
            {!templateMode && quiz && onSaveAsTemplate ? (
              <Button loading={submitting} icon={<AppIcon icon={Trophy} />} onClick={() => void saveAsTemplate()}>
                Lưu thành mẫu
              </Button>
            ) : null}
            {!templateMode && onOpenTemplateLibrary ? (
              <Button icon={<AppIcon icon={Gamepad2} />} onClick={onOpenTemplateLibrary}>
                Thư viện mẫu
              </Button>
            ) : null}
            {extraActions}
          </Space>
        }
      >
        <p className="mb-4 mt-0 text-sm opacity-65">
          {templateMode
            ? 'Chỉnh sửa tên, mô tả và nội dung câu hỏi của mẫu đã chọn.'
            : 'Chuẩn bị nội dung tại Workspace; Live Control chỉ dùng để điều khiển phiên chơi.'}
        </p>
        {!quiz ? (
          <StatePanel
            kind="empty"
            title={templateMode ? 'Chưa chọn mẫu câu hỏi' : 'Workshop chưa có bộ câu hỏi'}
            description={
              templateMode
                ? 'Chọn một mẫu trong thư viện hoặc tạo mẫu mới để bắt đầu soạn nội dung.'
                : 'Tạo game dạng nháp để bắt đầu soạn câu hỏi và đáp án.'
            }
            surface={false}
          />
        ) : (
          <div className="space-y-4">
            <div
              className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border border-inherit ${templateMode ? 'p-3' : 'p-4'}`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <AppIcon icon={Gamepad2} />
                  <h3 className="m-0 truncate text-lg font-bold">{quiz.title}</h3>
                  <StatusTag
                    status={
                      templateMode
                        ? 'processing'
                        : quiz.status === 'DRAFT'
                          ? 'default'
                          : quiz.status === 'COMPLETED'
                            ? 'success'
                            : 'processing'
                    }
                    label={templateMode ? 'Mẫu dùng chung' : QUIZ_STATUS_LABELS[quiz.status]}
                  />
                </div>
                {quiz.description ? <p className="mb-0 mt-2 text-sm opacity-65">{quiz.description}</p> : null}
              </div>
              <StatusTag label={`${quiz.questions.length} câu`} className="tabular-nums" />
            </div>

            {!templateMode && !editable ? (
              <Alert
                showIcon
                type={quiz.status === 'COMPLETED' ? 'success' : 'warning'}
                message={
                  quiz.status === 'COMPLETED'
                    ? 'Game đã kết thúc và được khóa nội dung.'
                    : questionExpired
                      ? 'Câu hỏi đã hết giờ nhưng game chưa được chốt.'
                      : 'Game đang chạy nên nội dung được khóa.'
                }
                description={
                  quiz.status === 'COMPLETED'
                    ? 'Bấm “Tạo bản chỉnh sửa” để sao chép toàn bộ câu hỏi sang bản nháp mới; kết quả cũ vẫn được giữ nguyên.'
                    : questionExpired
                      ? 'Bấm “Chốt game” để khóa kết quả, sau đó tạo bản chỉnh sửa ngay tại Workspace.'
                      : 'Chốt game tại đây hoặc trong Live Control; câu hỏi hiện tại vẫn có thể xem nhưng chưa được sửa trực tiếp.'
                }
              />
            ) : null}

            {quiz.questions.length ? (
              <div className="space-y-3">
                {quiz.questions.map((question, index) => {
                  const correctAnswer = question.options.find((option) => option.isCorrect)?.label || 'Chưa xác định';
                  return (
                    <div
                      key={question.id}
                      className={`rounded-xl border border-inherit ${templateMode ? 'p-3' : 'p-4'}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="tabular-nums">Câu {index + 1}</strong>
                            <StatusTag label={QUESTION_TYPE_LABELS[question.type]} />
                            <StatusTag
                              icon={<AppIcon icon={Clock3} />}
                              label={`${question.durationSeconds} giây`}
                              className="tabular-nums"
                            />
                            {question.rewardRule !== 'NONE' ? (
                              <StatusTag
                                status="gold"
                                icon={<AppIcon icon={Trophy} />}
                                label={REWARD_RULE_LABELS[question.rewardRule]}
                              />
                            ) : null}
                          </div>
                          <div className="mt-2 text-base font-semibold">{question.prompt}</div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {question.options.map((option, optionIndex) => (
                              <div
                                key={option.id}
                                className={`rounded-lg border px-3 py-2 text-sm ${option.isCorrect ? 'border-green-500 text-green-500' : 'border-inherit'}`}
                              >
                                <span className="mr-2 font-semibold">{String.fromCharCode(65 + optionIndex)}</span>
                                {option.label}
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 text-xs opacity-65">
                            Đáp án đúng: <strong>{correctAnswer}</strong>
                          </div>
                          {question.rewardRule !== 'NONE' && question.rewardLabel ? (
                            <div className="mt-1 text-xs opacity-65">
                              Thưởng: {question.rewardLabel} ×{' '}
                              <span className="tabular-nums">{question.rewardQuantity}</span>
                            </div>
                          ) : null}
                        </div>
                        {editable ? (
                          <Space>
                            <Button
                              size="small"
                              icon={<AppIcon icon={Pencil} />}
                              onClick={() => openQuestionDrawer(question)}
                            >
                              Sửa
                            </Button>
                            <Popconfirm
                              title="Xóa câu hỏi này?"
                              description="Các lựa chọn đi kèm cũng sẽ bị xóa."
                              okText="Xóa"
                              cancelText="Hủy"
                              okButtonProps={{ danger: true }}
                              onConfirm={() => void deleteQuestion(question.id)}
                            >
                              <Button danger size="small" loading={submitting} icon={<AppIcon icon={Trash2} />}>
                                Xóa
                              </Button>
                            </Popconfirm>
                          </Space>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <StatePanel
                kind="empty"
                title="Bộ câu hỏi đang trống"
                description="Thêm câu hỏi đầu tiên; mỗi câu cần từ 2–6 lựa chọn và đúng một đáp án."
                surface={false}
                extra={
                  editable ? (
                    <Button type="primary" onClick={() => openQuestionDrawer()}>
                      Thêm câu hỏi
                    </Button>
                  ) : undefined
                }
              />
            )}
          </div>
        )}
      </DataSection>

      <AdaptiveModal
        open={quizModalOpen}
        title={
          editingQuiz
            ? templateMode
              ? 'Sửa thông tin mẫu'
              : 'Sửa thông tin game'
            : templateMode
              ? 'Tạo mẫu câu hỏi mới'
              : 'Tạo bộ câu hỏi mới'
        }
        intent="confirm"
        footer={
          <AdaptiveOverlayFooter>
            <Button
              onClick={() => {
                setQuizModalOpen(false);
                quizForm.resetFields();
              }}
            >
              Hủy
            </Button>
            <Button
              type="primary"
              icon={<AppIcon icon={editingQuiz ? Save : CirclePlus} />}
              loading={submitting}
              onClick={() => quizForm.submit()}
            >
              {editingQuiz ? 'Lưu thay đổi' : templateMode ? 'Tạo mẫu' : 'Tạo bộ câu hỏi'}
            </Button>
          </AdaptiveOverlayFooter>
        }
        onCancel={() => {
          setQuizModalOpen(false);
          quizForm.resetFields();
        }}
        destroyOnHidden
      >
        <EntityForm form={quizForm} columns={1} onFinish={(values) => void submitQuiz(values)}>
          <EntityFormField
            name="title"
            label={templateMode ? 'Tên mẫu' : 'Tên game'}
            rules={[{ required: true, message: templateMode ? 'Nhập tên mẫu.' : 'Nhập tên game.' }, { max: 180 }]}
          >
            <Input
              autoFocus
              placeholder={templateMode ? 'Ví dụ: Kiến thức nối mi căn bản' : 'Ví dụ: Academy Challenge'}
              maxLength={180}
              showCount
            />
          </EntityFormField>
          <EntityFormField name="description" label="Mô tả" fullWidth>
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="Mục tiêu hoặc ghi chú cho Host…" />
          </EntityFormField>
        </EntityForm>
      </AdaptiveModal>

      <AdaptiveDrawer
        open={questionDrawerOpen}
        title={editingQuestion ? 'Sửa câu hỏi' : 'Thêm câu hỏi'}
        intent="form"
        destroyOnClose
        onClose={closeQuestionDrawer}
        footer={
          <AdaptiveOverlayFooter>
            <Button onClick={closeQuestionDrawer}>Hủy</Button>
            <Button type="primary" loading={submitting} onClick={() => questionForm.submit()}>
              {editingQuestion ? 'Lưu thay đổi' : 'Thêm câu hỏi'}
            </Button>
          </AdaptiveOverlayFooter>
        }
      >
        <EntityForm form={questionForm} columns={2} onFinish={(values) => void submitQuestion(values)}>
          <EntityFormField name="type" label="Loại câu hỏi" rules={[{ required: true }]}>
            <Select
              options={Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
              onChange={changeQuestionType}
            />
          </EntityFormField>
          <EntityFormField name="durationSeconds" label="Thời gian trả lời" rules={[{ required: true }]}>
            <InputNumber className="w-full" min={5} max={120} addonAfter="giây" />
          </EntityFormField>
          <EntityFormField
            name="prompt"
            label="Nội dung câu hỏi"
            fullWidth
            rules={[{ required: true, message: 'Nhập nội dung câu hỏi.' }]}
          >
            <Input.TextArea rows={3} placeholder="Nhập câu hỏi hiển thị trên màn hình sân khấu…" />
          </EntityFormField>
          <EntityFormField name="imageUrl" label="Ảnh minh họa (URL)" fullWidth>
            <Input placeholder="https://…" />
          </EntityFormField>
          <EntityFormField name="sortOrder" label="Thứ tự" rules={[{ required: true }]}>
            <InputNumber className="w-full" min={1} max={999} />
          </EntityFormField>
          <EntityFormField name="rewardRule" label="Cách trao thưởng" rules={[{ required: true }]}>
            <Select options={Object.entries(REWARD_RULE_LABELS).map(([value, label]) => ({ value, label }))} />
          </EntityFormField>

          {rewardRule === 'FASTEST_N' ? (
            <EntityFormField name="fastestCount" label="Số người nhanh nhất" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={1} max={100} />
            </EntityFormField>
          ) : null}
          {rewardRule && rewardRule !== 'NONE' ? (
            <>
              <EntityFormField
                name="rewardLabel"
                label="Nội dung phần thưởng"
                rules={[{ required: true, message: 'Nhập phần thưởng.' }]}
              >
                <Input placeholder="Ví dụ: Voucher 200.000đ" />
              </EntityFormField>
              <EntityFormField name="rewardQuantity" label="Số lượng mỗi người" rules={[{ required: true }]}>
                <InputNumber className="w-full" min={1} max={100} />
              </EntityFormField>
            </>
          ) : null}

          <EntityFormField fullWidth label="Các lựa chọn và đáp án đúng" required>
            <Form.Item name="correctOptionIndex" hidden rules={[{ required: true }]}>
              <InputNumber />
            </Form.Item>
            <Form.List
              name="options"
              rules={[
                {
                  validator: async (_, options) => {
                    if (!options || options.length < 2 || options.length > 6)
                      throw new Error('Cần từ 2 đến 6 lựa chọn.');
                  },
                },
              ]}
            >
              {(fields, { add, remove }, { errors }) => (
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div key={field.key} className="flex items-start gap-2 rounded-lg border border-inherit p-2">
                      <Radio
                        className="mt-2"
                        checked={correctOptionIndex === index}
                        aria-label={`Chọn lựa chọn ${index + 1} làm đáp án đúng`}
                        onChange={() => questionForm.setFieldValue('correctOptionIndex', index)}
                      />
                      <span className="mt-2 w-5 shrink-0 font-semibold">{String.fromCharCode(65 + index)}</span>
                      <Form.Item
                        name={[field.name, 'label']}
                        className="mb-0 flex-1"
                        rules={[{ required: true, message: 'Nhập nội dung lựa chọn.' }]}
                      >
                        <Input placeholder={`Lựa chọn ${index + 1}`} />
                      </Form.Item>
                      {questionType !== 'TRUE_FALSE' ? (
                        <Button
                          danger
                          type="text"
                          aria-label={`Xóa lựa chọn ${index + 1}`}
                          disabled={fields.length <= 2}
                          icon={<AppIcon icon={Trash2} />}
                          onClick={() => {
                            remove(field.name);
                            if (correctOptionIndex === index) questionForm.setFieldValue('correctOptionIndex', 0);
                            else if ((correctOptionIndex ?? 0) > index)
                              questionForm.setFieldValue('correctOptionIndex', (correctOptionIndex ?? 0) - 1);
                          }}
                        />
                      ) : null}
                    </div>
                  ))}
                  <Form.ErrorList errors={errors} />
                  {questionType !== 'TRUE_FALSE' && optionValues.length < 6 ? (
                    <Button block type="dashed" icon={<AppIcon icon={CirclePlus} />} onClick={() => add({ label: '' })}>
                      Thêm lựa chọn
                    </Button>
                  ) : null}
                </div>
              )}
            </Form.List>
          </EntityFormField>
        </EntityForm>
      </AdaptiveDrawer>
    </>
  );
}
