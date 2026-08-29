'use client';

import React from 'react';
import { Button, Form, Input, Popconfirm, Select, Space, message, theme } from 'antd';
import { Gamepad2, LibraryBig, Save, WandSparkles } from 'lucide-react';
import type { AcademyWorkshopQuiz } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import {
  AppIcon,
  DataSection,
  EntityForm,
  EntityFormDrawer,
  EntityFormField,
  IconText,
  StatusTag,
} from '../../../../components/ui';
import { useAcademyWorkshopQuizTemplates } from './useAcademyWorkshopQuizTemplates';

type SaveTemplateValues = {
  title: string;
};

function mutationMessage(cause: unknown, fallback: string): string {
  const error = cause as { response?: { data?: { message?: string } }; message?: string };
  return error.response?.data?.message || error.message || fallback;
}

export interface AcademyWorkshopQuizTemplatePanelProps {
  workshopId: number;
  quiz: AcademyWorkshopQuiz | null;
  canEdit: boolean;
  onApplied: (quiz: AcademyWorkshopQuiz) => void;
  onOpenLibrary: () => void;
}

/**
 * Gives games the same local template workflow as agenda, menu and equipment.
 * A game copied from a template retains its source so a draft can refresh that
 * template without changing any other workshop's independent copy.
 */
export default function AcademyWorkshopQuizTemplatePanel({
  workshopId,
  quiz,
  canEdit,
  onApplied,
  onOpenLibrary,
}: AcademyWorkshopQuizTemplatePanelProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm<SaveTemplateValues>();
  const [templateId, setTemplateId] = React.useState<number | null>(quiz?.sourceTemplateId || null);
  const [saving, setSaving] = React.useState(false);
  const [templateSaving, setTemplateSaving] = React.useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = React.useState(false);
  const templates = useAcademyWorkshopQuizTemplates(true);

  React.useEffect(() => setTemplateId(quiz?.sourceTemplateId || null), [quiz?.sourceTemplateId]);

  const missingSourceTemplate =
    quiz?.sourceTemplateId && !templates.data.some((template) => template.id === quiz.sourceTemplateId)
      ? { id: quiz.sourceTemplateId, title: quiz.sourceTemplateTitle || 'Mẫu game đang áp dụng' }
      : null;
  const selectableTemplates = missingSourceTemplate ? [missingSourceTemplate, ...templates.data] : templates.data;
  const selectedTemplate = templates.data.find((template) => template.id === templateId) || null;
  const selectedTemplateTitle =
    selectedTemplate?.title || (templateId === missingSourceTemplate?.id ? missingSourceTemplate.title : null);
  const isCurrentTemplate = Boolean(quiz?.sourceTemplateId && templateId === quiz.sourceTemplateId);
  const selectedQuestionCount =
    selectedTemplate?.questions.length || (isCurrentTemplate ? quiz?.questions.length || 0 : 0);
  const canReplaceGame = !quiz || quiz.status === 'DRAFT' || quiz.status === 'COMPLETED';

  const applyTemplate = React.useCallback(async () => {
    if (!templateId || !selectedTemplateTitle) return;
    setSaving(true);
    try {
      const applied = await apiClient.academySales.workshops.applyQuizTemplate(workshopId, templateId);
      onApplied(applied);
      setTemplateId(templateId);
      message.success(`Đã áp dụng mẫu “${selectedTemplateTitle}”.`);
    } catch (cause) {
      message.error(mutationMessage(cause, 'Không thể áp dụng mẫu game.'));
    } finally {
      setSaving(false);
    }
  }, [onApplied, selectedTemplateTitle, templateId, workshopId]);

  const updateCurrentTemplate = React.useCallback(async () => {
    if (!quiz || !isCurrentTemplate || !selectedTemplateTitle) return;
    setTemplateSaving(true);
    try {
      const updated = await apiClient.academySales.workshops.refreshQuizTemplateFromWorkshop(workshopId, quiz.id);
      templates.upsertRow(updated);
      message.success(`Đã cập nhật “${selectedTemplateTitle}” bằng game nháp hiện tại.`);
    } catch (cause) {
      message.error(mutationMessage(cause, 'Không thể cập nhật mẫu game.'));
    } finally {
      setTemplateSaving(false);
    }
  }, [isCurrentTemplate, quiz, selectedTemplateTitle, templates, workshopId]);

  const openSaveTemplate = React.useCallback(() => {
    if (!quiz) return;
    form.setFieldsValue({ title: `${quiz.title} · Mẫu`.slice(0, 180) });
    setSaveTemplateOpen(true);
  }, [form, quiz]);

  const closeSaveTemplate = React.useCallback(() => {
    if (saving) return;
    setSaveTemplateOpen(false);
    form.resetFields();
  }, [form, saving]);

  const saveAsNewTemplate = React.useCallback(
    async (values: SaveTemplateValues) => {
      if (!quiz) return;
      setSaving(true);
      try {
        const created = await apiClient.academySales.workshops.saveQuizAsTemplate(workshopId, quiz.id, {
          title: values.title.trim(),
        });
        templates.upsertRow(created);
        setTemplateId(created.id);
        setSaveTemplateOpen(false);
        form.resetFields();
        message.success(`Đã lưu “${created.title}” thành mẫu mới.`);
      } catch (cause) {
        message.error(mutationMessage(cause, 'Không thể lưu game thành mẫu.'));
      } finally {
        setSaving(false);
      }
    },
    [form, quiz, templates, workshopId]
  );

  return (
    <>
      <DataSection title={<IconText icon={<AppIcon icon={Gamepad2} />}>Mẫu game &amp; câu hỏi</IconText>}>
        <section
          className="academy-workshop-template-panel"
          style={{ borderColor: token.colorBorderSecondary }}
          aria-label="Chọn mẫu game và bộ câu hỏi cho workshop"
        >
          <div className="academy-workshop-template-panel__header">
            <div className="academy-workshop-template-panel__title">
              <h3 className="m-0 text-sm font-semibold">Mẫu game &amp; câu hỏi</h3>
              {isCurrentTemplate && selectedTemplateTitle ? (
                <StatusTag status="success" label="Đang áp dụng" className="!mb-0" />
              ) : null}
            </div>
            <Button type="text" size="small" onClick={onOpenLibrary} disabled={saving || templateSaving}>
              <IconText icon={<AppIcon icon={LibraryBig} />}>Thư viện mẫu</IconText>
            </Button>
          </div>

          <div className="academy-workshop-template-panel__selection">
            <div className="academy-workshop-template-panel__field">
              <label className="sr-only" htmlFor="workshop-quiz-template">
                Chọn mẫu game và bộ câu hỏi
              </label>
              <Select
                id="workshop-quiz-template"
                value={templateId || undefined}
                className="w-full"
                loading={templates.loading}
                disabled={!canEdit || saving || templateSaving || templates.loading}
                placeholder={templates.error ? 'Không thể tải mẫu game' : 'Chọn một mẫu game & câu hỏi'}
                options={selectableTemplates.map((template) => ({ value: template.id, label: template.title }))}
                onChange={setTemplateId}
              />
            </div>
            <div className="academy-workshop-template-panel__action">
              {!canEdit && !selectedTemplateTitle ? (
                <span
                  className="academy-workshop-template-panel__action-hint"
                  style={{ color: token.colorTextSecondary }}
                >
                  Chọn mẫu để tiếp tục
                </span>
              ) : (
                <Space wrap size={8}>
                  {canEdit && quiz?.status === 'DRAFT' && isCurrentTemplate && selectedTemplateTitle ? (
                    <Popconfirm
                      title={`Cập nhật mẫu “${selectedTemplateTitle}”?`}
                      description="Câu hỏi, đáp án và cấu hình phần thưởng của game nháp hiện tại sẽ thay thế nội dung mẫu. Các workshop khác vẫn giữ bản sao riêng."
                      okText="Cập nhật mẫu"
                      cancelText="Hủy"
                      okButtonProps={{ loading: templateSaving }}
                      onConfirm={() => void updateCurrentTemplate()}
                      disabled={saving || templateSaving}
                    >
                      <Button disabled={saving || templateSaving} loading={templateSaving}>
                        <IconText icon={<AppIcon icon={Save} />}>Cập nhật mẫu</IconText>
                      </Button>
                    </Popconfirm>
                  ) : null}
                  {canEdit && templateId && selectedTemplateTitle && !isCurrentTemplate ? (
                    <Popconfirm
                      title="Áp dụng mẫu game này?"
                      description="Game nháp hiện tại sẽ được thay bằng một bản sao độc lập của mẫu. Game đang chạy cần được chốt trước khi thay mẫu."
                      okText="Áp dụng"
                      cancelText="Hủy"
                      onConfirm={() => void applyTemplate()}
                      disabled={saving || templateSaving || !canReplaceGame}
                    >
                      <Button type="primary" disabled={saving || templateSaving || !canReplaceGame} loading={saving}>
                        <IconText icon={<AppIcon icon={WandSparkles} />}>Áp dụng mẫu</IconText>
                      </Button>
                    </Popconfirm>
                  ) : null}
                  {canEdit ? (
                    <Button onClick={openSaveTemplate} disabled={!quiz?.questions.length || saving || templateSaving}>
                      <IconText icon={<AppIcon icon={Save} />}>Lưu mẫu mới</IconText>
                    </Button>
                  ) : null}
                </Space>
              )}
            </div>
          </div>

          <div
            className="academy-workshop-template-panel__details"
            style={{ color: templates.error ? token.colorError : token.colorTextSecondary }}
            role={templates.error ? 'alert' : undefined}
          >
            <span>
              {templates.error ||
                selectedTemplate?.description ||
                (isCurrentTemplate
                  ? 'Game hiện tại được liên kết với mẫu này; bạn có thể cập nhật lại mẫu khi game còn ở bản nháp.'
                  : 'Chọn một mẫu từ thư viện để áp dụng cho workshop.')}
            </span>
            {selectedTemplateTitle ? (
              <span className="academy-workshop-template-panel__metadata tabular-nums">
                <IconText icon={<AppIcon icon={Gamepad2} size="sm" />} tabular>
                  {selectedQuestionCount} câu hỏi
                </IconText>
              </span>
            ) : null}
          </div>
        </section>
      </DataSection>

      <EntityFormDrawer
        open={saveTemplateOpen}
        title="Lưu game thành mẫu mới"
        onClose={closeSaveTemplate}
        destroyOnHidden
        footer={
          <Space className="w-full justify-end" wrap>
            <Button onClick={closeSaveTemplate} disabled={saving}>
              Hủy
            </Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}>
              <IconText icon={<AppIcon icon={Save} />}>Lưu mẫu</IconText>
            </Button>
          </Space>
        }
      >
        <p className="mb-4 mt-0 text-sm opacity-65">
          Mẫu mới sẽ sao chép toàn bộ câu hỏi, đáp án và cấu hình phần thưởng của game hiện tại.
        </p>
        <EntityForm<SaveTemplateValues> form={form} columns={1} onFinish={saveAsNewTemplate} disabled={saving}>
          <EntityFormField
            name="title"
            label="Tên mẫu"
            rules={[
              { required: true, whitespace: true, message: 'Nhập tên mẫu.' },
              { max: 180, message: 'Tên mẫu tối đa 180 ký tự.' },
            ]}
          >
            <Input autoFocus maxLength={180} showCount placeholder="Ví dụ: Quiz kiến thức nối mi cơ bản" />
          </EntityFormField>
        </EntityForm>
      </EntityFormDrawer>
    </>
  );
}
