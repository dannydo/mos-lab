'use client';

import React from 'react';
import { Form, message } from 'antd';
import type {
  AcademyWorkshopQuestionType,
  AcademyWorkshopQuiz,
  AcademyWorkshopQuizQuestion,
  UpsertAcademyWorkshopQuestionRequest,
  UpsertAcademyWorkshopQuizRequest,
} from '@mos-lab/shared';
import {
  emptyQuestion,
  isQuestionExpired,
  mutationMessage,
  questionValues,
  toQuestionUpsertRequest,
  toQuizUpsertRequest,
  type QuestionFormValues,
  type QuizFormValues,
} from './quiz-manager-utils';

export interface UseAcademyWorkshopQuizManagerParams {
  quiz: AcademyWorkshopQuiz | null;
  mode: 'WORKSHOP' | 'TEMPLATE';
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
  onSaveAsTemplate?: (quizId: number) => Promise<void>;
}

export function useAcademyWorkshopQuizManager({
  quiz,
  mode,
  onCreateQuiz,
  onUpdateQuiz,
  onSaveQuestion,
  onDeleteQuestion,
  onCompleteQuiz,
  onCloneQuiz,
  onSaveAsTemplate,
}: UseAcademyWorkshopQuizManagerParams) {
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
  const questionExpired = isQuestionExpired(quiz);

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

  const closeQuizModal = React.useCallback(() => {
    setQuizModalOpen(false);
    quizForm.resetFields();
  }, [quizForm]);

  const submitQuiz = React.useCallback(
    async (values: QuizFormValues) => {
      setSubmitting(true);
      try {
        const dto = toQuizUpsertRequest(values);
        if (editingQuiz && quiz) await onUpdateQuiz(quiz.id, dto);
        else await onCreateQuiz(dto);
        closeQuizModal();
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
    [closeQuizModal, editingQuiz, onCreateQuiz, onUpdateQuiz, quiz, templateMode]
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
        const dto = toQuestionUpsertRequest(values);
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

  return {
    quizForm,
    questionForm,
    quizModalOpen,
    editingQuiz,
    questionDrawerOpen,
    editingQuestion,
    submitting,
    questionType,
    rewardRule,
    correctOptionIndex,
    optionValues,
    templateMode,
    editable,
    questionExpired,
    openQuizModal,
    closeQuizModal,
    submitQuiz,
    openQuestionDrawer,
    closeQuestionDrawer,
    submitQuestion,
    deleteQuestion,
    completeQuiz,
    cloneQuiz,
    saveAsTemplate,
    changeQuestionType,
  };
}
