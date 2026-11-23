'use client';

import { Alert, Button, Popconfirm, Space } from 'antd';
import { Clock3, Gamepad2, Pencil, Trash2, Trophy } from 'lucide-react';
import type { AcademyWorkshopQuiz, AcademyWorkshopQuizQuestion } from '@mos-lab/shared';
import { AppIcon, StatePanel, StatusTag } from '~/components/ui';
import {
  QUESTION_TYPE_LABELS,
  QUIZ_STATUS_LABELS,
  REWARD_RULE_LABELS,
  getQuizStatusTagStatus,
} from './quiz-manager-utils';

export interface QuizQuestionListProps {
  quiz: AcademyWorkshopQuiz | null;
  templateMode: boolean;
  editable: boolean;
  questionExpired: boolean;
  submitting: boolean;
  onOpenQuestionDrawer: (question?: AcademyWorkshopQuizQuestion) => void;
  onDeleteQuestion: (questionId: number) => void;
}

export function QuizQuestionList({
  quiz,
  templateMode,
  editable,
  questionExpired,
  submitting,
  onOpenQuestionDrawer,
  onDeleteQuestion,
}: QuizQuestionListProps) {
  return (
    <>
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
                  status={getQuizStatusTagStatus(quiz, templateMode)}
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
                  <div key={question.id} className={`rounded-xl border border-inherit ${templateMode ? 'p-3' : 'p-4'}`}>
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
                            onClick={() => onOpenQuestionDrawer(question)}
                          >
                            Sửa
                          </Button>
                          <Popconfirm
                            title="Xóa câu hỏi này?"
                            description="Các lựa chọn đi kèm cũng sẽ bị xóa."
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => onDeleteQuestion(question.id)}
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
                  <Button type="primary" onClick={() => onOpenQuestionDrawer()}>
                    Thêm câu hỏi
                  </Button>
                ) : undefined
              }
            />
          )}
        </div>
      )}
    </>
  );
}
