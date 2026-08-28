'use client';

import React from 'react';
import { Alert, Button, Form, Input, InputNumber, Popconfirm, Select, Space, message, theme } from 'antd';
import dayjs from 'dayjs';
import {
  ArrowDown,
  ArrowUp,
  Clock3,
  LibraryBig,
  ListChecks,
  PencilLine,
  Plus,
  Save,
  Trash2,
  WandSparkles,
} from 'lucide-react';
import {
  ACADEMY_WORKSHOP_AGENDA_KINDS,
  type AcademyWorkshopAgendaItem,
  type AcademyWorkshopAgendaKind,
  type AcademyWorkshopAgendaTemplate,
  type AcademyWorkshopDetail,
  type CreateAcademyWorkshopAgendaItemRequest,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import {
  AppIcon,
  DataSection,
  EntityForm,
  EntityFormDrawer,
  EntityFormField,
  IconButton,
  IconText,
  StatePanel,
  StatusTag,
} from '../../../../components/ui';
import AcademyWorkshopAgendaTemplateLibrary from './AcademyWorkshopAgendaTemplateLibrary';
import { useAcademyWorkshopAgendaTemplates } from './useAcademyWorkshopAgendaTemplates';

const AGENDA_KIND_LABELS: Record<AcademyWorkshopAgendaKind, string> = {
  CONTENT: 'Nội dung',
  TALENT_TEST: 'Tố chất',
  GAME: 'Game',
  BREAK: 'Giải lao',
  SALES: 'Tư vấn',
  OTHER: 'Khác',
};

const AGENDA_STATUS_LABELS = {
  PENDING: 'Chưa bắt đầu',
  RUNNING: 'Đang chạy',
  PAUSED: 'Tạm dừng',
  COMPLETED: 'Hoàn thành',
  SKIPPED: 'Đã bỏ qua',
} as const;

type AgendaFormValues = {
  title: string;
  description?: string | null;
  kind: AcademyWorkshopAgendaKind;
  plannedDurationMinutes: number;
};

function agendaFormValues(item?: AcademyWorkshopAgendaItem): AgendaFormValues {
  return {
    title: item?.title || '',
    description: item?.description || null,
    kind: item?.kind || 'CONTENT',
    plannedDurationMinutes: Math.max(1, Math.round((item?.plannedDurationSeconds || 60 * 60) / 60)),
  };
}

function toAgendaRequest(values: AgendaFormValues): CreateAcademyWorkshopAgendaItemRequest {
  return {
    title: values.title.trim(),
    description: values.description?.trim() || null,
    kind: values.kind,
    plannedDurationSeconds: Math.round(values.plannedDurationMinutes * 60),
  };
}

function agendaStatusTone(status: AcademyWorkshopAgendaItem['status']) {
  if (status === 'COMPLETED') return 'success';
  if (status === 'RUNNING') return 'processing';
  if (status === 'PAUSED') return 'warning';
  return 'default';
}

function buildPlannedAgendaTimeRanges(startsAt: string, agenda: AcademyWorkshopAgendaItem[]): Map<number, string> {
  let cursor = dayjs(startsAt);

  return new Map(
    [...agenda]
      .sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id)
      .map((item) => {
        const durationSeconds = Math.max(0, Math.round(item.plannedDurationSeconds));
        const startsAtLabel = cursor.format('HH:mm');
        cursor = cursor.add(durationSeconds, 'second');
        return [item.id, `${startsAtLabel} – ${cursor.format('HH:mm')}`];
      })
  );
}

export default function AcademyWorkshopAgendaManager({
  workshop,
  canEdit,
  onUpdated,
  onRefresh,
}: {
  workshop: AcademyWorkshopDetail;
  canEdit: boolean;
  onUpdated: (workshop: AcademyWorkshopDetail) => void;
  onRefresh: () => Promise<void> | void;
}) {
  const { token } = theme.useToken();
  const [form] = Form.useForm<AgendaFormValues>();
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<AcademyWorkshopAgendaItem | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [templateLibraryOpen, setTemplateLibraryOpen] = React.useState(false);
  const [templateId, setTemplateId] = React.useState<number | null>(workshop.agendaTemplate?.id || null);
  const templates = useAcademyWorkshopAgendaTemplates(true);

  React.useEffect(() => setTemplateId(workshop.agendaTemplate?.id || null), [workshop.agendaTemplate?.id]);

  const structureLocked = workshop.agenda.some((item) => item.status !== 'PENDING');
  const selectedTemplate = React.useMemo(
    () => templates.data.find((template) => template.id === templateId) || workshop.agendaTemplate,
    [templateId, templates.data, workshop.agendaTemplate]
  );
  const selectedTemplateStepCount = selectedTemplate?.items.length || 0;
  const selectedTemplateMinutes = Math.round(
    (selectedTemplate?.items.reduce((total, item) => total + item.plannedDurationSeconds, 0) || 0) / 60
  );
  const isCurrentTemplate = templateId === (workshop.agendaTemplate?.id || null);
  const plannedAgendaTimeRanges = React.useMemo(
    () => buildPlannedAgendaTimeRanges(workshop.startsAt, workshop.agenda),
    [workshop.agenda, workshop.startsAt]
  );

  const openCreate = React.useCallback(() => {
    setEditingItem(null);
    form.setFieldsValue(agendaFormValues());
    setEditorOpen(true);
  }, [form]);

  const openEdit = React.useCallback(
    (item: AcademyWorkshopAgendaItem) => {
      setEditingItem(item);
      form.setFieldsValue(agendaFormValues(item));
      setEditorOpen(true);
    },
    [form]
  );

  const closeEditor = React.useCallback(() => {
    if (saving) return;
    setEditorOpen(false);
    setEditingItem(null);
    form.resetFields();
  }, [form, saving]);

  const saveItem = React.useCallback(
    async (values: AgendaFormValues) => {
      setSaving(true);
      try {
        const request = toAgendaRequest(values);
        const item = editingItem
          ? await apiClient.academySales.workshops.updateAgendaItem(workshop.id, editingItem.id, request)
          : await apiClient.academySales.workshops.createAgendaItem(workshop.id, request);
        const agenda = editingItem
          ? workshop.agenda.map((current) => (current.id === item.id ? item : current))
          : [...workshop.agenda, item];
        onUpdated({
          ...workshop,
          agenda: agenda.sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id),
        });
        closeEditor();
        message.success(editingItem ? 'Đã cập nhật mục agenda.' : 'Đã thêm mục agenda.');
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể lưu mục agenda.');
      } finally {
        setSaving(false);
      }
    },
    [closeEditor, editingItem, onUpdated, workshop]
  );

  const applyTemplate = React.useCallback(
    async (template: AcademyWorkshopAgendaTemplate | null = selectedTemplate) => {
      if (!template) return;
      setSaving(true);
      try {
        const updated = await apiClient.academySales.workshops.update(workshop.id, { agendaTemplateId: template.id });
        onUpdated(updated);
        setTemplateId(template.id);
        message.success(`Đã áp dụng mẫu “${template.title}”.`);
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể áp dụng mẫu agenda.');
        throw cause;
      } finally {
        setSaving(false);
      }
    },
    [onUpdated, selectedTemplate, workshop.id]
  );

  const deleteItem = React.useCallback(
    async (item: AcademyWorkshopAgendaItem) => {
      setSaving(true);
      try {
        await apiClient.academySales.workshops.deleteAgendaItem(workshop.id, item.id);
        await onRefresh();
        message.success('Đã xóa mục agenda.');
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể xóa mục agenda.');
      } finally {
        setSaving(false);
      }
    },
    [onRefresh, workshop.id]
  );

  const moveItem = React.useCallback(
    async (itemId: number, direction: -1 | 1) => {
      const from = workshop.agenda.findIndex((item) => item.id === itemId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= workshop.agenda.length) return;
      const next = [...workshop.agenda];
      [next[from], next[to]] = [next[to], next[from]];
      setSaving(true);
      try {
        const agenda = await apiClient.academySales.workshops.reorderAgenda(workshop.id, {
          agendaItemIds: next.map((item) => item.id),
        });
        onUpdated({ ...workshop, agenda });
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể sắp xếp agenda.');
      } finally {
        setSaving(false);
      }
    },
    [onUpdated, workshop]
  );

  return (
    <DataSection
      className="academy-workshop-agenda-section"
      title={
        <IconText
          icon={
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: token.colorPrimaryBg, color: token.colorPrimary }}
            >
              <AppIcon icon={ListChecks} size="sm" />
            </span>
          }
        >
          Agenda & timeline
        </IconText>
      }
      extra={
        canEdit && !structureLocked ? (
          <Button type="primary" onClick={openCreate} loading={saving}>
            <IconText icon={<AppIcon icon={Plus} />}>Thêm mục</IconText>
          </Button>
        ) : undefined
      }
    >
      <div className="academy-workshop-agenda-stack">
        {structureLocked ? (
          <Alert
            type="info"
            showIcon
            message="Agenda đã chạy nên cấu trúc được khóa"
            description={
              <div>
                Bạn vẫn có thể theo dõi và điều khiển timeline tại Live Control; thay đổi loại, thêm, sửa, xóa hoặc sắp
                xếp mục có thể làm sai dữ liệu thời lượng đã chốt.
                {canEdit ? (
                  <Button type="link" className="!px-0" onClick={() => setTemplateLibraryOpen(true)}>
                    Quản lý thư viện mẫu agenda
                  </Button>
                ) : null}
              </div>
            }
          />
        ) : (
          <section
            className="academy-workshop-template-panel"
            style={{ borderColor: token.colorBorderSecondary }}
            aria-label="Chọn mẫu agenda cho workshop"
          >
            <div className="academy-workshop-template-panel__header">
              <div className="academy-workshop-template-panel__title">
                <h3 className="m-0 text-sm font-semibold">Mẫu agenda</h3>
                {isCurrentTemplate && selectedTemplate ? (
                  <StatusTag status="success" label="Đang áp dụng" className="!mb-0" />
                ) : null}
              </div>
              <Button type="text" size="small" onClick={() => setTemplateLibraryOpen(true)} disabled={saving}>
                <IconText icon={<AppIcon icon={LibraryBig} />}>Thư viện mẫu</IconText>
              </Button>
            </div>

            <div className="academy-workshop-template-panel__selection">
              <div className="academy-workshop-template-panel__field">
                <label className="sr-only" htmlFor="workshop-agenda-template">
                  Chọn mẫu agenda
                </label>
                <Select
                  id="workshop-agenda-template"
                  value={templateId || undefined}
                  size="middle"
                  className="w-full"
                  loading={templates.loading}
                  disabled={!canEdit || saving || templates.loading}
                  placeholder={templates.error ? 'Không thể tải mẫu agenda' : 'Chọn một mẫu agenda'}
                  options={templates.data.map((template) => ({
                    value: template.id,
                    label: template.title,
                  }))}
                  onChange={setTemplateId}
                />
              </div>

              <div className="academy-workshop-template-panel__action">
                {!selectedTemplate ? (
                  <span
                    className="academy-workshop-template-panel__action-hint"
                    style={{ color: token.colorTextSecondary }}
                  >
                    Chọn mẫu để tiếp tục
                  </span>
                ) : isCurrentTemplate ? null : (
                  <Popconfirm
                    title="Áp dụng mẫu agenda này?"
                    description="Các mục agenda hiện tại sẽ được thay bằng bản sao từ mẫu đã chọn."
                    okText="Áp dụng"
                    cancelText="Hủy"
                    onConfirm={() => void applyTemplate()}
                    disabled={saving || !selectedTemplate}
                  >
                    <Button type="primary" size="middle" disabled={saving} loading={saving}>
                      <IconText icon={<AppIcon icon={WandSparkles} />}>Áp dụng mẫu</IconText>
                    </Button>
                  </Popconfirm>
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
                  'Chọn một mẫu từ thư viện để áp dụng cho workshop.'}
              </span>
              {selectedTemplate ? (
                <span className="academy-workshop-template-panel__metadata tabular-nums">
                  <IconText icon={<AppIcon icon={ListChecks} size="sm" />} tabular>
                    {selectedTemplateStepCount} bước
                  </IconText>
                  <IconText icon={<AppIcon icon={Clock3} size="sm" />} tabular>
                    {selectedTemplateMinutes} phút
                  </IconText>
                </span>
              ) : null}
            </div>
          </section>
        )}

        {workshop.agenda.length ? (
          <div className="academy-workshop-agenda-list">
            {workshop.agenda.map((item, index) => (
              <div key={item.id} className="academy-workshop-agenda-item">
                <div className="academy-workshop-agenda-item__content">
                  <div className="font-semibold">
                    <span className="academy-workshop-agenda-item__number mr-2 tabular-nums">{item.sortOrder}</span>
                    {item.title}
                  </div>
                  <div className="academy-workshop-agenda-item__meta">
                    <span>{AGENDA_KIND_LABELS[item.kind]}</span>
                    <span>·</span>
                    <IconText icon={<AppIcon icon={Clock3} size="sm" />} tabular>
                      {plannedAgendaTimeRanges.get(item.id) || '—'}
                    </IconText>
                    <span>·</span>
                    <span className="tabular-nums">{Math.round(item.plannedDurationSeconds / 60)} phút</span>
                    {item.description ? <span>· {item.description}</span> : null}
                  </div>
                </div>
                <div className="academy-workshop-agenda-item__controls">
                  <StatusTag status={agendaStatusTone(item.status)} label={AGENDA_STATUS_LABELS[item.status]} />
                  {canEdit && !structureLocked ? (
                    <div className="academy-workshop-agenda-item__actions">
                      <IconButton
                        label={`Đưa ${item.title} lên`}
                        icon={ArrowUp}
                        disabled={saving || index === 0}
                        onClick={() => void moveItem(item.id, -1)}
                      />
                      <IconButton
                        label={`Đưa ${item.title} xuống`}
                        icon={ArrowDown}
                        disabled={saving || index === workshop.agenda.length - 1}
                        onClick={() => void moveItem(item.id, 1)}
                      />
                      <IconButton
                        label={`Sửa ${item.title}`}
                        icon={PencilLine}
                        disabled={saving}
                        onClick={() => openEdit(item)}
                      />
                      <Popconfirm
                        title={`Xóa “${item.title}”?`}
                        description="Mục này sẽ bị xóa khỏi agenda workshop."
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => void deleteItem(item)}
                      >
                        <IconButton tone="danger" label={`Xóa ${item.title}`} icon={Trash2} disabled={saving} />
                      </Popconfirm>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <StatePanel
            kind="empty"
            surface={false}
            title="Chưa có mục agenda"
            extra={canEdit && !structureLocked ? <Button onClick={openCreate}>Thêm mục đầu tiên</Button> : undefined}
          />
        )}
      </div>

      <EntityFormDrawer
        open={editorOpen}
        title={editingItem ? 'Chỉnh sửa mục agenda' : 'Thêm mục agenda'}
        onClose={closeEditor}
        destroyOnHidden
        footer={
          <Space className="w-full justify-end" wrap>
            <Button onClick={closeEditor} disabled={saving}>
              Hủy
            </Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}>
              <IconText icon={<AppIcon icon={Save} />}>Lưu mục</IconText>
            </Button>
          </Space>
        }
      >
        <EntityForm<AgendaFormValues> form={form} columns={2} onFinish={saveItem} disabled={saving}>
          <EntityFormField
            name="title"
            label="Tên mục"
            rules={[
              { required: true, whitespace: true, message: 'Nhập tên mục agenda.' },
              { max: 180, message: 'Tên mục tối đa 180 ký tự.' },
            ]}
            fullWidth
          >
            <Input autoFocus placeholder="Ví dụ: Đón khách & check-in" />
          </EntityFormField>
          <EntityFormField name="kind" label="Nhóm vận hành" rules={[{ required: true, message: 'Chọn nhóm agenda.' }]}>
            <Select
              options={ACADEMY_WORKSHOP_AGENDA_KINDS.map((kind) => ({ value: kind, label: AGENDA_KIND_LABELS[kind] }))}
            />
          </EntityFormField>
          <EntityFormField
            name="plannedDurationMinutes"
            label="Thời lượng dự kiến (phút)"
            rules={[{ required: true, message: 'Nhập thời lượng.' }]}
          >
            <InputNumber min={1} max={480} precision={0} className="w-full" />
          </EntityFormField>
          <EntityFormField name="description" label="Ghi chú vận hành" fullWidth>
            <Input.TextArea rows={3} placeholder="Mục tiêu, chuẩn bị hoặc người phụ trách…" />
          </EntityFormField>
        </EntityForm>
      </EntityFormDrawer>

      <AcademyWorkshopAgendaTemplateLibrary
        open={templateLibraryOpen}
        activeTemplateId={workshop.agendaTemplate?.id || null}
        onClose={() => setTemplateLibraryOpen(false)}
        onApplied={applyTemplate}
        onChanged={templates.refresh}
      />
    </DataSection>
  );
}
