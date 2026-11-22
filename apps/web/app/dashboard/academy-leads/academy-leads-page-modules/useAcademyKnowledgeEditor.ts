'use client';

import React from 'react';
import { Form, message } from 'antd';
import type { UpsertAcademyCourseRequest, UpsertAcademyPlaybookRequest } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { type CourseFormValues, type KnowledgeEditor, extractApiErrorMessage } from './academy-leads-utils';

export function useAcademyKnowledgeEditor(onRefresh: () => Promise<unknown>) {
  const [knowledgeEditor, setKnowledgeEditor] = React.useState<KnowledgeEditor>(null);
  const [savingKnowledge, setSavingKnowledge] = React.useState(false);
  const [playbookForm] = Form.useForm<UpsertAcademyPlaybookRequest>();
  const [courseForm] = Form.useForm<CourseFormValues>();

  const closeKnowledgeEditor = React.useCallback(() => {
    setKnowledgeEditor(null);
  }, []);

  const openKnowledgeEditor = React.useCallback(
    (next: KnowledgeEditor) => {
      setKnowledgeEditor(next);
      if (next?.kind === 'playbook') {
        playbookForm.setFieldsValue(
          next.record || { title: '', category: '', content: '', sortOrder: 0, isActive: true }
        );
      }
      if (next?.kind === 'course') {
        courseForm.setFieldsValue(
          next.record
            ? { ...next.record, syllabusText: JSON.stringify(next.record.syllabus, null, 2) }
            : {
                code: '',
                name: '',
                listPriceVnd: 0,
                promoPriceVnd: 0,
                sortOrder: 0,
                isActive: true,
                syllabusText: '[]',
              }
        );
      }
    },
    [courseForm, playbookForm]
  );

  const savePlaybook = React.useCallback(
    async (values: UpsertAcademyPlaybookRequest) => {
      if (!knowledgeEditor || knowledgeEditor.kind !== 'playbook') return;
      setSavingKnowledge(true);
      try {
        if (knowledgeEditor.record) {
          await apiClient.academySales.updatePlaybook(knowledgeEditor.record.id, values);
        } else {
          await apiClient.academySales.createPlaybook(values);
        }
        message.success('Đã lưu playbook.');
        setKnowledgeEditor(null);
        await onRefresh();
      } catch (error) {
        message.error(extractApiErrorMessage(error, 'Không thể lưu playbook.'));
      } finally {
        setSavingKnowledge(false);
      }
    },
    [knowledgeEditor, onRefresh]
  );

  const saveCourse = React.useCallback(
    async (values: CourseFormValues) => {
      if (!knowledgeEditor || knowledgeEditor.kind !== 'course') return;
      setSavingKnowledge(true);
      try {
        let syllabus: UpsertAcademyCourseRequest['syllabus'] = [];
        try {
          syllabus = values.syllabusText ? JSON.parse(values.syllabusText) : [];
          if (!Array.isArray(syllabus)) throw new Error('invalid');
        } catch {
          message.error('Giáo trình phải là JSON array hợp lệ.');
          return;
        }
        const payload: UpsertAcademyCourseRequest = {
          ...values,
          listPriceVnd: Math.round(Number(values.listPriceVnd) || 0),
          promoPriceVnd: Math.round(Number(values.promoPriceVnd) || 0),
          syllabus,
        };
        if (knowledgeEditor.record) {
          await apiClient.academySales.updateCourse(knowledgeEditor.record.id, payload);
        } else {
          await apiClient.academySales.createCourse(payload);
        }
        message.success('Đã lưu khóa học.');
        setKnowledgeEditor(null);
        await onRefresh();
      } catch (error) {
        message.error(extractApiErrorMessage(error, 'Không thể lưu khóa học.'));
      } finally {
        setSavingKnowledge(false);
      }
    },
    [knowledgeEditor, onRefresh]
  );

  return {
    knowledgeEditor,
    savingKnowledge,
    playbookForm,
    courseForm,
    openKnowledgeEditor,
    closeKnowledgeEditor,
    savePlaybook,
    saveCourse,
  };
}
