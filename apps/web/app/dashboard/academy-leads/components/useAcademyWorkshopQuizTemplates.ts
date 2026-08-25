'use client';

import React from 'react';
import type {
  AcademyWorkshopQuiz,
  UpsertAcademyWorkshopQuestionRequest,
  UpsertAcademyWorkshopQuizRequest,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';

const TEMPLATE_LIBRARY_PAGINATION_KEY = 'academy-workshop:quiz-template-library:pagination';

function storedPagination(): { page: number; pageSize: number } {
  if (typeof window === 'undefined') return { page: 1, pageSize: 10 };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TEMPLATE_LIBRARY_PAGINATION_KEY) || '{}') as {
      page?: number;
      pageSize?: number;
    };
    const page = Math.max(1, Math.round(Number(parsed.page) || 1));
    const pageSize = [10, 20, 50, 100].includes(Number(parsed.pageSize)) ? Number(parsed.pageSize) : 10;
    return { page, pageSize };
  } catch {
    return { page: 1, pageSize: 10 };
  }
}

export function useAcademyWorkshopQuizTemplates(enabled: boolean) {
  const [data, setData] = React.useState<AcademyWorkshopQuiz[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearchValue] = React.useState('');
  const deferredSearch = React.useDeferredValue(search);
  const initialPagination = React.useMemo(() => storedPagination(), []);
  const [page, setPage] = React.useState(initialPagination.page);
  const [pageSize, setPageSize] = React.useState(initialPagination.pageSize);
  const requestVersion = React.useRef(0);

  const refresh = React.useCallback(async () => {
    if (!enabled) return;
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const response = await apiClient.academySales.workshops.listQuizTemplates({
        page,
        limit: pageSize,
        search: deferredSearch.trim() || undefined,
      });
      if (version !== requestVersion.current) return;
      setData(response.data);
      setTotal(response.total);
      setError(null);
    } catch (cause) {
      if (version !== requestVersion.current) return;
      const apiError = cause as { response?: { data?: { message?: string } } };
      setError(apiError.response?.data?.message || 'Không thể tải thư viện mẫu câu hỏi.');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [deferredSearch, enabled, page, pageSize]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    window.localStorage.setItem(TEMPLATE_LIBRARY_PAGINATION_KEY, JSON.stringify({ page, pageSize }));
  }, [page, pageSize]);

  const setSearch = React.useCallback((value: string) => {
    setSearchValue(value);
    setPage(1);
  }, []);

  const setPagination = React.useCallback(
    (nextPage: number, nextPageSize: number) => {
      setPageSize(nextPageSize);
      setPage(nextPageSize === pageSize ? nextPage : 1);
    },
    [pageSize]
  );

  const upsertRow = React.useCallback(
    (quiz: AcademyWorkshopQuiz) => {
      setData((rows) => {
        const next = rows.some((row) => row.id === quiz.id)
          ? rows.map((row) => (row.id === quiz.id ? quiz : row))
          : [quiz, ...rows];
        return next.slice(0, pageSize);
      });
    },
    [pageSize]
  );

  const createTemplate = React.useCallback(
    async (dto: UpsertAcademyWorkshopQuizRequest) => {
      const quiz = await apiClient.academySales.workshops.createQuizTemplate(dto);
      upsertRow(quiz);
      setTotal((count) => count + 1);
      return quiz;
    },
    [upsertRow]
  );

  const updateTemplate = React.useCallback(
    async (templateId: number, dto: UpsertAcademyWorkshopQuizRequest) => {
      const quiz = await apiClient.academySales.workshops.updateQuizTemplate(templateId, dto);
      upsertRow(quiz);
      return quiz;
    },
    [upsertRow]
  );

  const saveQuestion = React.useCallback(
    async (templateId: number, questionId: number | null, dto: UpsertAcademyWorkshopQuestionRequest) => {
      const question = questionId
        ? await apiClient.academySales.workshops.updateTemplateQuestion(templateId, questionId, dto)
        : await apiClient.academySales.workshops.addTemplateQuestion(templateId, dto);
      setData((rows) =>
        rows.map((row) => {
          if (row.id !== templateId) return row;
          const questions = row.questions.some((item) => item.id === question.id)
            ? row.questions.map((item) => (item.id === question.id ? question : item))
            : [...row.questions, question];
          questions.sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id);
          return { ...row, questions };
        })
      );
      return question;
    },
    []
  );

  const deleteQuestion = React.useCallback(
    async (templateId: number, questionId: number) => {
      const quiz = await apiClient.academySales.workshops.deleteTemplateQuestion(templateId, questionId);
      upsertRow(quiz);
      return quiz;
    },
    [upsertRow]
  );

  const deleteTemplate = React.useCallback(async (templateId: number) => {
    await apiClient.academySales.workshops.deleteQuizTemplate(templateId);
    setData((rows) => rows.filter((row) => row.id !== templateId));
    setTotal((count) => Math.max(0, count - 1));
  }, []);

  return {
    data,
    total,
    loading,
    error,
    refresh,
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    setPagination,
    createTemplate,
    updateTemplate,
    saveQuestion,
    deleteQuestion,
    deleteTemplate,
    upsertRow,
  };
}
