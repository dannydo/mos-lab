'use client';

import React from 'react';
import { Alert, Button, Form, Input, InputNumber, Pagination, Popconfirm, Select, Space, message, theme } from 'antd';
import { ArrowDown, ArrowUp, Check, Clock3, LibraryBig, Plus, Save, Trash2, WandSparkles } from 'lucide-react';
import {
  ACADEMY_WORKSHOP_AGENDA_KINDS,
  type AcademyWorkshopAgendaKind,
  type AcademyWorkshopAgendaTemplate,
  type CreateAcademyWorkshopAgendaTemplateRequest,
} from '@mos-lab/shared';
import {
  AdaptiveDrawer,
  AdaptiveOverlayFooter,
  AppIcon,
  DataSection,
  IconButton,
  SearchField,
  StatePanel,
  StatusTag,
} from '../../../../components/ui';
import { useAcademyWorkshopAgendaTemplates } from './useAcademyWorkshopAgendaTemplates';

const AGENDA_KIND_LABELS: Record<AcademyWorkshopAgendaKind, string> = {
  CONTENT: 'Nội dung',
  TALENT_TEST: 'Tố chất',
  GAME: 'Game',
  BREAK: 'Giải lao',
  SALES: 'Tư vấn',
  OTHER: 'Khác',
};

type TemplateFormValues = { title: string; description?: string | null };
type DraftItem = {
  clientId: string;
  title: string;
  description?: string | null;
  kind: AcademyWorkshopAgendaKind;
  plannedDurationSeconds: number;
};

function draftId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function draftItem(item?: Partial<DraftItem>): DraftItem {
  return {
    clientId: item?.clientId || draftId(),
    title: item?.title || '',
    description: item?.description || null,
    kind: item?.kind || 'CONTENT',
    plannedDurationSeconds: item?.plannedDurationSeconds || 60 * 60,
  };
}

function templateFormValues(template: AcademyWorkshopAgendaTemplate | null): TemplateFormValues {
  return { title: template?.title || '', description: template?.description || null };
}

function getTotalMinutes(items: Array<{ plannedDurationSeconds: number }>) {
  return Math.round(items.reduce((total, item) => total + item.plannedDurationSeconds, 0) / 60);
}

export default function AcademyWorkshopAgendaTemplateLibrary({
  open,
  activeTemplateId,
  onClose,
  onApplied,
  onChanged,
}: {
  open: boolean;
  activeTemplateId: number | null;
  onClose: () => void;
  onApplied: (template: AcademyWorkshopAgendaTemplate) => Promise<void> | void;
  onChanged: () => Promise<void> | void;
}) {
  const { token } = theme.useToken();
  const [form] = Form.useForm<TemplateFormValues>();
  const library = useAcademyWorkshopAgendaTemplates(open);
  const [selectedId, setSelectedId] = React.useState<number | null>(activeTemplateId);
  const [creating, setCreating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [applying, setApplying] = React.useState(false);
  const [items, setItems] = React.useState<DraftItem[]>([]);

  const selected = React.useMemo(
    () => library.data.find((template) => template.id === selectedId) || null,
    [library.data, selectedId]
  );
  const editing = creating ? null : selected;

  React.useEffect(() => {
    if (!open || creating || library.loading) return;
    if (!library.data.length) {
      setSelectedId(null);
      return;
    }
    if (!library.data.some((template) => template.id === selectedId)) {
      setSelectedId(
        activeTemplateId && library.data.some((template) => template.id === activeTemplateId)
          ? activeTemplateId
          : library.data[0].id
      );
    }
  }, [activeTemplateId, creating, library.data, library.loading, open, selectedId]);

  React.useEffect(() => {
    if (!open) return;
    form.setFieldsValue(templateFormValues(editing));
    setItems(editing ? editing.items.map((item) => draftItem(item)) : [draftItem()]);
  }, [editing, form, open]);

  const selectTemplate = React.useCallback((templateId: number) => {
    setCreating(false);
    setSelectedId(templateId);
  }, []);

  const startCreating = React.useCallback(() => {
    setCreating(true);
    setSelectedId(null);
  }, []);

  const updateItem = React.useCallback((clientId: string, patch: Partial<DraftItem>) => {
    setItems((current) => current.map((item) => (item.clientId === clientId ? { ...item, ...patch } : item)));
  }, []);

  const moveItem = React.useCallback((index: number, direction: -1 | 1) => {
    setItems((current) => {
      const destination = index + direction;
      if (destination < 0 || destination >= current.length) return current;
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }, []);

  const removeItem = React.useCallback((clientId: string) => {
    setItems((current) => current.filter((item) => item.clientId !== clientId));
  }, []);

  const saveTemplate = React.useCallback(
    async (values: TemplateFormValues) => {
      const dto: CreateAcademyWorkshopAgendaTemplateRequest = {
        title: values.title.trim(),
        description: values.description?.trim() || null,
        items: items.map((item, index) => ({
          title: item.title.trim(),
          description: item.description?.trim() || null,
          kind: item.kind,
          plannedDurationSeconds: Math.round(item.plannedDurationSeconds),
          sortOrder: index + 1,
        })),
      };
      setSaving(true);
      try {
        const template = editing ? await library.updateTemplate(editing.id, dto) : await library.createTemplate(dto);
        setCreating(false);
        setSelectedId(template.id);
        await onChanged();
        message.success(editing ? 'Đã cập nhật mẫu agenda.' : 'Đã tạo mẫu agenda.');
      } catch (cause) {
        message.error(library.mutationMessage(cause, 'Không thể lưu mẫu agenda.'));
      } finally {
        setSaving(false);
      }
    },
    [editing, items, library, onChanged]
  );

  const deleteTemplate = React.useCallback(async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await library.deleteTemplate(selected.id);
      setSelectedId(null);
      setCreating(false);
      await onChanged();
      message.success('Đã xóa mẫu agenda. Workshop đã áp dụng mẫu vẫn giữ agenda độc lập.');
    } catch (cause) {
      message.error(library.mutationMessage(cause, 'Không thể xóa mẫu agenda.'));
    } finally {
      setSaving(false);
    }
  }, [library, onChanged, selected]);

  const applyTemplate = React.useCallback(async () => {
    if (!selected) return;
    setApplying(true);
    try {
      await onApplied(selected);
      onClose();
    } catch {
      // The workspace surface presents the mutation error consistently.
    } finally {
      setApplying(false);
    }
  }, [onApplied, onClose, selected]);

  return (
    <AdaptiveDrawer
      open={open}
      intent="data"
      width="min(94vw, 1280px)"
      title={
        <span className="inline-flex items-center gap-3">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: token.colorPrimaryBg, color: token.colorPrimary }}
          >
            <AppIcon icon={LibraryBig} />
          </span>
          <span>
            <span className="block text-sm font-semibold">Thư viện mẫu agenda</span>
            <span className="block text-xs font-normal opacity-60">Chuẩn hóa kịch bản trước khi mở workshop</span>
          </span>
        </span>
      }
      onClose={onClose}
      destroyOnClose
      footer={
        <AdaptiveOverlayFooter>
          <div className="mr-auto hidden items-center gap-2 text-xs opacity-65 sm:flex">
            <AppIcon icon={Clock3} size="sm" />
            <span className="tabular-nums">
              {items.length} bước · {getTotalMinutes(items)} phút dự kiến
            </span>
          </div>
          <Button type="primary" loading={saving} icon={<AppIcon icon={Save} />} onClick={() => form.submit()}>
            {editing ? 'Lưu thay đổi' : 'Tạo mẫu'}
          </Button>
        </AdaptiveOverlayFooter>
      }
    >
      <Alert
        className="mb-3"
        type="info"
        showIcon
        message="Mỗi workshop nhận một bản sao độc lập"
        description="Áp dụng mẫu sẽ sao chép agenda vào workshop; chỉnh sửa mẫu sau đó không làm thay đổi các workshop đã áp dụng."
      />

      <div className="grid items-start gap-3 xl:grid-cols-[288px_minmax(0,1fr)]">
        <DataSection
          className="h-fit xl:sticky xl:top-0"
          title={
            <span className="inline-flex items-center gap-2">
              <AppIcon icon={LibraryBig} size="sm" />
              Mẫu agenda
            </span>
          }
          extra={
            <Button type="primary" size="small" icon={<AppIcon icon={Plus} />} onClick={startCreating}>
              Mẫu mới
            </Button>
          }
        >
          <SearchField
            behavior="filter"
            value={library.search}
            placeholder="Tìm mẫu không dấu…"
            onChange={(event) => library.setSearch(event.target.value)}
          />
          {library.loading ? (
            <StatePanel kind="loading" title="Đang tải thư viện…" minHeight={240} surface={false} />
          ) : library.error ? (
            <StatePanel
              kind="error"
              title="Không thể tải thư viện"
              description={library.error}
              minHeight={240}
              surface={false}
              extra={<Button onClick={() => void library.refresh()}>Thử lại</Button>}
            />
          ) : library.data.length === 0 ? (
            <StatePanel
              kind="empty"
              title={library.search ? 'Không tìm thấy mẫu phù hợp' : 'Chưa có mẫu agenda'}
              description={library.search ? 'Thử một từ khóa khác.' : 'Tạo mẫu đầu tiên để dùng khi tạo workshop.'}
              minHeight={240}
              surface={false}
              extra={
                !library.search ? (
                  <Button type="primary" icon={<AppIcon icon={Plus} />} onClick={startCreating}>
                    Tạo mẫu đầu tiên
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="mt-3 space-y-2">
              {library.data.map((template) => {
                const active = !creating && selectedId === template.id;
                const totalMinutes = getTotalMinutes(template.items);
                return (
                  <button
                    key={template.id}
                    type="button"
                    className="w-full rounded-xl border p-2.5 text-left transition-colors"
                    style={{
                      borderColor: active ? token.colorPrimaryBorder : token.colorBorderSecondary,
                      background: active ? token.colorPrimaryBg : token.colorBgContainer,
                      color: token.colorText,
                      boxShadow: active ? `0 0 0 1px ${token.colorPrimaryBorder}` : 'none',
                    }}
                    aria-pressed={active}
                    onClick={() => selectTemplate(template.id)}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{template.title}</span>
                        <span className="mt-1 block line-clamp-2 text-xs leading-5 opacity-65">
                          {template.description || 'Không có mô tả'}
                        </span>
                      </span>
                      {active ? (
                        <span
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                          style={{ background: token.colorPrimary, color: token.colorTextLightSolid }}
                        >
                          <AppIcon icon={Check} size="sm" />
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-3 flex items-center gap-2 text-xs opacity-70">
                      <StatusTag label={`${template.items.length} bước`} className="!mb-0 tabular-nums" />
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <AppIcon icon={Clock3} size="sm" />
                        {totalMinutes} phút
                      </span>
                    </span>
                  </button>
                );
              })}
              <div className="flex justify-center pt-2">
                <Pagination
                  size="small"
                  current={library.page}
                  pageSize={library.pageSize}
                  total={library.total}
                  showSizeChanger
                  pageSizeOptions={['10', '20', '50', '100']}
                  showTotal={(total) => `${total} mẫu`}
                  onChange={library.setPagination}
                />
              </div>
            </div>
          )}
        </DataSection>

        <DataSection
          title={
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{ background: token.colorFillAlter, color: token.colorPrimary }}
              >
                <AppIcon icon={editing ? LibraryBig : Plus} size="sm" />
              </span>
              <span className="min-w-0">
                <span className="block truncate">{editing ? editing.title : 'Tạo mẫu agenda'}</span>
                <span className="block text-xs font-normal opacity-60">
                  {editing ? 'Chỉnh sửa cấu trúc và nội dung mẫu' : 'Thiết lập một kịch bản dùng lại'}
                </span>
              </span>
            </span>
          }
          extra={
            editing ? (
              <Space size={8} wrap>
                <Button icon={<AppIcon icon={Plus} />} onClick={startCreating}>
                  Mẫu mới
                </Button>
                <Popconfirm
                  title={`Xóa “${editing.title}”?`}
                  description="Các workshop đã áp dụng vẫn giữ agenda hiện tại."
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => void deleteTemplate()}
                >
                  <IconButton label="Xóa mẫu" icon={Trash2} tone="danger" loading={saving} />
                </Popconfirm>
                <Popconfirm
                  title="Dùng mẫu này cho workshop?"
                  description="Agenda hiện tại của workshop sẽ được thay bằng bản sao từ mẫu này."
                  okText="Dùng mẫu"
                  cancelText="Hủy"
                  onConfirm={() => void applyTemplate()}
                >
                  <Button
                    type="primary"
                    icon={<AppIcon icon={WandSparkles} />}
                    loading={applying}
                    disabled={editing.items.length === 0}
                  >
                    Áp dụng cho workshop
                  </Button>
                </Popconfirm>
              </Space>
            ) : undefined
          }
        >
          <Form<TemplateFormValues>
            className="entity-form"
            form={form}
            layout="vertical"
            onFinish={saveTemplate}
            disabled={saving}
          >
            <section>
              <div className="mb-2">
                <div className="font-semibold">Thông tin mẫu</div>
                <div className="mt-0.5 text-xs opacity-60">Tên và mục đích này giúp đội ngũ chọn đúng kịch bản.</div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Form.Item
                  name="title"
                  label="Tên mẫu"
                  rules={[
                    { required: true, whitespace: true, message: 'Nhập tên mẫu agenda.' },
                    { max: 180, message: 'Tên mẫu tối đa 180 ký tự.' },
                  ]}
                >
                  <Input placeholder="Ví dụ: Workshop khai trương" />
                </Form.Item>
                <Form.Item name="description" label="Mô tả mẫu">
                  <Input placeholder="Mục tiêu và cách dùng mẫu…" />
                </Form.Item>
              </div>
            </section>

            <section className="mt-4 border-t pt-4" style={{ borderColor: token.colorBorderSecondary }}>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-semibold">
                    Các bước agenda
                    <StatusTag label={`${items.length} bước`} className="!mb-0 tabular-nums" />
                  </div>
                  <div className="mt-1 text-xs opacity-60">Các bước được sao chép vào workshop khi áp dụng mẫu.</div>
                </div>
                <Button
                  type="dashed"
                  icon={<AppIcon icon={Plus} />}
                  onClick={() => setItems((current) => [...current, draftItem()])}
                  disabled={saving}
                >
                  Thêm bước
                </Button>
              </div>
              <div className="space-y-3">
                {items.map((item, index) => {
                  const minutes = Math.round(item.plannedDurationSeconds / 60);
                  return (
                    <div
                      key={item.clientId}
                      className="overflow-hidden rounded-xl border"
                      style={{ borderColor: token.colorBorderSecondary }}
                    >
                      <div
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                        style={{ background: token.colorFillAlter }}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg px-1 text-xs font-bold tabular-nums"
                            style={{ background: token.colorBgContainer, color: token.colorPrimary }}
                          >
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold">Bước {index + 1}</div>
                            <div className="text-xs opacity-60">{minutes} phút dự kiến</div>
                          </div>
                        </div>
                        <Space size={2} className="shrink-0">
                          <IconButton
                            label={`Đưa bước ${index + 1} lên`}
                            icon={ArrowUp}
                            disabled={saving || index === 0}
                            onClick={() => moveItem(index, -1)}
                          />
                          <IconButton
                            label={`Đưa bước ${index + 1} xuống`}
                            icon={ArrowDown}
                            disabled={saving || index === items.length - 1}
                            onClick={() => moveItem(index, 1)}
                          />
                          <IconButton
                            label={`Xóa bước ${index + 1}`}
                            icon={Trash2}
                            tone="danger"
                            disabled={saving || items.length === 1}
                            onClick={() => removeItem(item.clientId)}
                          />
                        </Space>
                      </div>
                      <div className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_150px_132px] md:items-end">
                        <div>
                          <label className="mb-1 block text-sm font-medium">Tên bước</label>
                          <Input
                            value={item.title}
                            placeholder="Tên bước"
                            disabled={saving}
                            onChange={(event) => updateItem(item.clientId, { title: event.target.value })}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium">Nhóm</label>
                          <Select
                            value={item.kind}
                            className="w-full"
                            disabled={saving}
                            options={ACADEMY_WORKSHOP_AGENDA_KINDS.map((kind) => ({
                              value: kind,
                              label: AGENDA_KIND_LABELS[kind],
                            }))}
                            onChange={(kind) => updateItem(item.clientId, { kind })}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium">Thời lượng</label>
                          <InputNumber
                            min={1}
                            max={480}
                            precision={0}
                            className="w-full"
                            value={Math.round(item.plannedDurationSeconds / 60)}
                            disabled={saving}
                            onChange={(minutes) =>
                              updateItem(item.clientId, { plannedDurationSeconds: Math.round(Number(minutes) * 60) })
                            }
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="mb-1 block text-sm font-medium">
                            Ghi chú vận hành <span className="font-normal opacity-55">(tùy chọn)</span>
                          </label>
                          <Input.TextArea
                            value={item.description || ''}
                            autoSize={{ minRows: 1, maxRows: 3 }}
                            placeholder="Ghi chú vận hành (tùy chọn)"
                            disabled={saving}
                            onChange={(event) => updateItem(item.clientId, { description: event.target.value || null })}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </Form>
        </DataSection>
      </div>
    </AdaptiveDrawer>
  );
}
