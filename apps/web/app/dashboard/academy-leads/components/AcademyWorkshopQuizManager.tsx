'use client';

import React from 'react';
import type {
  AcademyWorkshopQuiz,
  UpsertAcademyWorkshopQuestionRequest,
  UpsertAcademyWorkshopQuizRequest,
} from '@mos-lab/shared';
import { DataSection } from '~/components/ui';
import { QuestionEditorDrawer } from './academy-workshop-quiz-manager/QuestionEditorDrawer';
import { QuizEditorModal } from './academy-workshop-quiz-manager/QuizEditorModal';
import { QuizHeaderActions } from './academy-workshop-quiz-manager/QuizHeaderActions';
import { QuizQuestionList } from './academy-workshop-quiz-manager/QuizQuestionList';
import { useAcademyWorkshopQuizManager } from './academy-workshop-quiz-manager/useAcademyWorkshopQuizManager';

export type { QuestionFormValues, QuizFormValues } from './academy-workshop-quiz-manager/quiz-manager-utils';

export interface AcademyWorkshopQuizManagerProps {
  workshopId: number;
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

export default function AcademyWorkshopQuizManager({
  workshopId,
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
  const manager = useAcademyWorkshopQuizManager({
    quiz,
    mode,
    onCreateQuiz,
    onUpdateQuiz,
    onSaveQuestion,
    onDeleteQuestion,
    onCompleteQuiz,
    onCloneQuiz,
    onSaveAsTemplate,
  });

  return (
    <>
      <DataSection
        title={manager.templateMode ? 'Nội dung mẫu' : 'Game & câu hỏi'}
        extra={
          <QuizHeaderActions
            quiz={quiz}
            templateMode={manager.templateMode}
            editable={manager.editable}
            questionExpired={manager.questionExpired}
            submitting={manager.submitting}
            hasSaveAsTemplate={Boolean(onSaveAsTemplate)}
            onOpenQuizModal={manager.openQuizModal}
            onOpenQuestionDrawer={() => manager.openQuestionDrawer()}
            onCloneQuiz={() => void manager.cloneQuiz()}
            onCompleteQuiz={() => void manager.completeQuiz()}
            onOpenLiveControl={onOpenLiveControl}
            onSaveAsTemplate={() => void manager.saveAsTemplate()}
            onOpenTemplateLibrary={onOpenTemplateLibrary}
            extraActions={extraActions}
          />
        }
      >
        <QuizQuestionList
          quiz={quiz}
          templateMode={manager.templateMode}
          editable={manager.editable}
          questionExpired={manager.questionExpired}
          submitting={manager.submitting}
          onOpenQuestionDrawer={manager.openQuestionDrawer}
          onDeleteQuestion={(questionId) => void manager.deleteQuestion(questionId)}
        />
      </DataSection>

      <QuizEditorModal
        open={manager.quizModalOpen}
        editingQuiz={manager.editingQuiz}
        templateMode={manager.templateMode}
        submitting={manager.submitting}
        form={manager.quizForm}
        onSubmit={(values) => void manager.submitQuiz(values)}
        onCancel={manager.closeQuizModal}
      />

      <QuestionEditorDrawer
        open={manager.questionDrawerOpen}
        workshopId={workshopId}
        editingQuestion={manager.editingQuestion}
        submitting={manager.submitting}
        form={manager.questionForm}
        questionType={manager.questionType}
        rewardRule={manager.rewardRule}
        correctOptionIndex={manager.correctOptionIndex}
        optionValues={manager.optionValues}
        onClose={manager.closeQuestionDrawer}
        onSubmit={(values) => void manager.submitQuestion(values)}
        onChangeQuestionType={manager.changeQuestionType}
      />
    </>
  );
}
