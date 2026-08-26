'use client';

import React from 'react';
import type { UpsertAcademyWorkshopQuestionRequest, UpsertAcademyWorkshopQuizRequest } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';

type WorkshopDetail = Awaited<ReturnType<typeof apiClient.academySales.workshops.getBySlug>>;

interface UseAcademyWorkshopQuizActionsOptions {
  workshop: WorkshopDetail | null;
  setWorkshop: React.Dispatch<React.SetStateAction<WorkshopDetail | null>>;
  setTemplateLibraryOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useAcademyWorkshopQuizActions({
  workshop,
  setWorkshop,
  setTemplateLibraryOpen,
}: UseAcademyWorkshopQuizActionsOptions) {
  const updateActiveQuiz = React.useCallback(
    (quiz: NonNullable<WorkshopDetail>['activeQuiz']) => {
      setWorkshop((current) => (current ? { ...current, activeQuiz: quiz } : current));
    },
    [setWorkshop]
  );

  const createWorkshopQuiz = React.useCallback(
    async (dto: UpsertAcademyWorkshopQuizRequest) => {
      if (!workshop) return;
      updateActiveQuiz(await apiClient.academySales.workshops.createQuiz(workshop.id, dto));
    },
    [updateActiveQuiz, workshop]
  );

  const updateWorkshopQuiz = React.useCallback(
    async (quizId: number, dto: UpsertAcademyWorkshopQuizRequest) => {
      if (!workshop) return;
      updateActiveQuiz(await apiClient.academySales.workshops.updateQuiz(workshop.id, quizId, dto));
    },
    [updateActiveQuiz, workshop]
  );

  const saveWorkshopQuestion = React.useCallback(
    async (quizId: number, questionId: number | null, dto: UpsertAcademyWorkshopQuestionRequest) => {
      if (!workshop) return;
      const question = questionId
        ? await apiClient.academySales.workshops.updateQuestion(workshop.id, quizId, questionId, dto)
        : await apiClient.academySales.workshops.addQuestion(workshop.id, quizId, dto);
      setWorkshop((current) => {
        if (!current?.activeQuiz || current.activeQuiz.id !== quizId) return current;
        const questions = current.activeQuiz.questions.some((item) => item.id === question.id)
          ? current.activeQuiz.questions.map((item) => (item.id === question.id ? question : item))
          : [...current.activeQuiz.questions, question];
        questions.sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id);
        return { ...current, activeQuiz: { ...current.activeQuiz, questions } };
      });
    },
    [setWorkshop, workshop]
  );

  const deleteWorkshopQuestion = React.useCallback(
    async (quizId: number, questionId: number) => {
      if (!workshop) return;
      updateActiveQuiz(await apiClient.academySales.workshops.deleteQuestion(workshop.id, quizId, questionId));
    },
    [updateActiveQuiz, workshop]
  );

  const completeWorkshopQuiz = React.useCallback(
    async (quizId: number) => {
      if (!workshop) return;
      updateActiveQuiz(await apiClient.academySales.workshops.gameCommand(workshop.id, quizId, { action: 'END_GAME' }));
    },
    [updateActiveQuiz, workshop]
  );

  const cloneWorkshopQuiz = React.useCallback(
    async (quizId: number) => {
      if (!workshop) return;
      updateActiveQuiz(await apiClient.academySales.workshops.cloneQuiz(workshop.id, quizId));
    },
    [updateActiveQuiz, workshop]
  );

  const saveWorkshopQuizAsTemplate = React.useCallback(
    async (quizId: number) => {
      if (!workshop) return;
      await apiClient.academySales.workshops.saveQuizAsTemplate(workshop.id, quizId);
      setTemplateLibraryOpen(true);
    },
    [setTemplateLibraryOpen, workshop]
  );

  return {
    createWorkshopQuiz,
    updateWorkshopQuiz,
    saveWorkshopQuestion,
    deleteWorkshopQuestion,
    completeWorkshopQuiz,
    cloneWorkshopQuiz,
    saveWorkshopQuizAsTemplate,
  };
}
