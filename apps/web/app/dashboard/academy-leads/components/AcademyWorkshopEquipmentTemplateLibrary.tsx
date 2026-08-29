'use client';

import React from 'react';
import { Alert, Button, Form, Input, Pagination, Popconfirm, Space, message, theme } from 'antd';
import { ArchiveRestore, Images, LibraryBig, PackageCheck, PencilLine, Save, Sparkles, Trash2 } from 'lucide-react';
import {
  type AcademyWorkshopDetail,
  type AcademyWorkshopEquipmentTemplate,
  type SaveAcademyWorkshopEquipmentTemplateRequest,
  type UpdateAcademyWorkshopEquipmentTemplateRequest,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import {
  AdaptiveDrawer,
  AppIcon,
  EntityForm,
  EntityFormDrawer,
  EntityFormField,
  IconButton,
  IconText,
  SearchField,
  StatePanel,
} from '../../../../components/ui';
import { useAcademyWorkshopEquipmentTemplates } from './useAcademyWorkshopEquipmentTemplates';

type TemplateFormValues = SaveAcademyWorkshopEquipmentTemplateRequest;
type SaveTarget = 'new' | 'existing';

function templateFormValues(template: AcademyWorkshopEquipmentTemplate | null = null): TemplateFormValues {
  return { title: template?.title || '', description: template?.description || null };
}

function formatVnd(value: number) {
  return `${Math.max(0, Math.round(Number(value) || 0)).toLocaleString('vi-VN')} đ`;
}

function templateUpdateRequest(
  template: AcademyWorkshopEquipmentTemplate,
  values: TemplateFormValues
): UpdateAcademyWorkshopEquipmentTemplateRequest {
  return {
    title: values.title.trim(),
    description: values.description?.trim() || null,
    packages: template.packages.map((equipmentPackage) => ({
      name: equipmentPackage.name,
      description: equipmentPackage.description,
      includedItems: equipmentPackage.includedItems,
      priceVnd: Math.max(0, Math.round(equipmentPackage.priceVnd)),
      isAvailable: equipmentPackage.isAvailable,
      images: equipmentPackage.images.map((image) => ({ imageUrl: image.imageUrl, altText: image.altText })),
    })),
  };
}

function TemplatePreview({ template }: { template: AcademyWorkshopEquipmentTemplate }) {
  const { token } = theme.useToken();
  const images = template.packages.flatMap((equipmentPackage) => equipmentPackage.images);
  const cover = images[0];
  if (!images.length) {
    return (
      <div
        className="flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-xl border"
        style={{
          borderColor: token.colorBorderSecondary,
          background: token.colorFillQuaternary,
          color: token.colorTextTertiary,
        }}
      >
        <span className="flex flex-col items-center gap-2 text-center text-xs font-semibold">
          <AppIcon icon={Images} />
          Chưa có ảnh mẫu
        </span>
      </div>
    );
  }
  return (
    <div
      className="relative h-24 w-36 shrink-0 overflow-hidden rounded-xl"
      style={{ background: token.colorFillQuaternary }}
    >
      <img src={cover.imageUrl} alt={cover.altText || template.title} className="h-full w-full object-cover" />
      {images.length > 1 ? (
        <span
          className="absolute bottom-1.5 right-1.5 rounded-md px-1.5 py-0.5 text-xs font-extrabold"
          style={{ background: token.colorBgElevated, color: token.colorText }}
        >
          +{images.length - 1}
        </span>
      ) : null}
    </div>
  );
}

export default function AcademyWorkshopEquipmentTemplateLibrary({
  open,
  workshop,
  canEdit,
  saveRequestId = 0,
  onClose,
  onApplied,
}: {
  open: boolean;
  workshop: AcademyWorkshopDetail;
  canEdit: boolean;
  /** Opens the compact save prompt directly from the workshop template panel. */
  saveRequestId?: number;
  onClose: () => void;
  onApplied: (workshop: AcademyWorkshopDetail) => void;
}) {
  const { token } = theme.useToken();
  const [form] = Form.useForm<TemplateFormValues>();
  const library = useAcademyWorkshopEquipmentTemplates(open);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<AcademyWorkshopEquipmentTemplate | null>(null);
  const [saveTarget, setSaveTarget] = React.useState<SaveTarget>('new');
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<number | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [applyingTemplateId, setApplyingTemplateId] = React.useState<number | null>(null);
  const [syncingTemplateId, setSyncingTemplateId] = React.useState<number | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = React.useState<number | null>(null);
  const handledSaveRequest = React.useRef(0);

  const hasWorkshopEquipment = workshop.equipmentPackages.length > 0;
  const isEditing = Boolean(editingTemplate);
  const selectedTemplate = React.useMemo(
    () => library.data.find((template) => template.id === selectedTemplateId) || null,
    [library.data, selectedTemplateId]
  );

  const closeEditor = React.useCallback(() => {
    if (saving) return;
    setEditorOpen(false);
    setEditingTemplate(null);
    setSaveTarget('new');
    setSelectedTemplateId(null);
    form.resetFields();
  }, [form, saving]);

  const openSave = React.useCallback(() => {
    if (!hasWorkshopEquipment) {
      message.warning('Thêm ít nhất một gói dụng cụ trước khi lưu mẫu.');
      return;
    }
    setEditingTemplate(null);
    setSaveTarget('new');
    setSelectedTemplateId(null);
    form.setFieldsValue(templateFormValues());
    setEditorOpen(true);
  }, [form, hasWorkshopEquipment]);

  React.useEffect(() => {
    if (!open || !saveRequestId || saveRequestId === handledSaveRequest.current) return;
    handledSaveRequest.current = saveRequestId;
    openSave();
  }, [open, openSave, saveRequestId]);

  const openRename = React.useCallback(
    (template: AcademyWorkshopEquipmentTemplate) => {
      setEditingTemplate(template);
      setSaveTarget('new');
      setSelectedTemplateId(null);
      form.setFieldsValue(templateFormValues(template));
      setEditorOpen(true);
    },
    [form]
  );

  const saveTemplate = React.useCallback(
    async (values: TemplateFormValues) => {
      setSaving(true);
      try {
        if (editingTemplate) {
          await library.updateTemplate(editingTemplate.id, templateUpdateRequest(editingTemplate, values));
          message.success('Đã cập nhật tên và ghi chú mẫu.');
        } else if (saveTarget === 'existing') {
          if (!selectedTemplate) {
            message.warning('Chọn mẫu cần cập nhật trước khi lưu.');
            return;
          }
          await library.syncTemplateFromWorkshop(workshop.id, selectedTemplate.id);
          message.success(`Đã cập nhật “${selectedTemplate.title}” bằng bộ dụng cụ đang hiển thị.`);
        } else {
          await apiClient.academySales.workshops.saveEquipmentAsTemplate(workshop.id, {
            title: values.title.trim(),
            description: values.description?.trim() || null,
          });
          await library.refresh();
          message.success('Đã lưu bộ dụng cụ đang hiển thị thành mẫu.');
        }
        setEditorOpen(false);
        setEditingTemplate(null);
        setSaveTarget('new');
        setSelectedTemplateId(null);
        form.resetFields();
      } catch (cause) {
        message.error(library.mutationMessage(cause, 'Không thể lưu mẫu bộ dụng cụ.'));
      } finally {
        setSaving(false);
      }
    },
    [editingTemplate, form, library, saveTarget, selectedTemplate, workshop.id]
  );

  const applyTemplate = React.useCallback(
    async (template: AcademyWorkshopEquipmentTemplate) => {
      setApplyingTemplateId(template.id);
      try {
        const updated = await apiClient.academySales.workshops.applyEquipmentTemplate(workshop.id, template.id);
        onApplied(updated);
        onClose();
        message.success(`Đã áp dụng mẫu “${template.title}”.`);
      } catch (cause) {
        message.error(library.mutationMessage(cause, 'Không thể áp dụng mẫu bộ dụng cụ.'));
      } finally {
        setApplyingTemplateId(null);
      }
    },
    [library, onApplied, onClose, workshop.id]
  );

  const syncTemplate = React.useCallback(
    async (template: AcademyWorkshopEquipmentTemplate) => {
      setSyncingTemplateId(template.id);
      try {
        await library.syncTemplateFromWorkshop(workshop.id, template.id);
        message.success(`Đã cập nhật “${template.title}” bằng bộ dụng cụ đang hiển thị.`);
      } catch (cause) {
        message.error(library.mutationMessage(cause, 'Không thể cập nhật nội dung mẫu.'));
      } finally {
        setSyncingTemplateId(null);
      }
    },
    [library, workshop.id]
  );

  const deleteTemplate = React.useCallback(
    async (template: AcademyWorkshopEquipmentTemplate) => {
      setDeletingTemplateId(template.id);
      try {
        await library.deleteTemplate(template.id);
        message.success(`Đã xóa mẫu “${template.title}”. Workshop đã áp dụng mẫu vẫn giữ bộ dụng cụ riêng.`);
      } catch (cause) {
        message.error(library.mutationMessage(cause, 'Không thể xóa mẫu bộ dụng cụ.'));
      } finally {
        setDeletingTemplateId(null);
      }
    },
    [library]
  );

  return (
    <>
      <AdaptiveDrawer
        open={open}
        onClose={onClose}
        intent="data"
        width="min(94vw, 1120px)"
        title={<IconText icon={<AppIcon icon={LibraryBig} />}>Thư viện mẫu bộ dụng cụ</IconText>}
        extra={
          canEdit ? (
            <Button type="primary" onClick={openSave} disabled={!hasWorkshopEquipment}>
              <IconText icon={<AppIcon icon={Save} />}>Lưu bộ hiện tại thành mẫu</IconText>
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-base font-extrabold">Mẫu bộ dụng cụ</div>
              <p className="mb-0 mt-1 text-sm opacity-65">
                Tạo mới, đổi tên, cập nhật từ workshop đang mở, áp dụng hoặc xóa — tất cả tại một chỗ.
              </p>
            </div>
            <div className="text-sm font-semibold opacity-55 tabular-nums">{library.total} mẫu</div>
          </div>
          {!hasWorkshopEquipment && canEdit ? (
            <Alert
              type="warning"
              showIcon
              message="Workshop này chưa có bộ dụng cụ để lưu thành mẫu"
              description="Thêm ít nhất một gói dụng cụ, rồi lưu mẫu ngay tại thanh công cụ của workshop."
            />
          ) : null}
          <SearchField
            behavior="filter"
            value={library.search}
            onChange={(event) => library.setSearch(event.target.value)}
            placeholder="Tìm theo tên loại workshop…"
            aria-label="Tìm mẫu bộ dụng cụ"
            allowClear
          />
          {library.loading && !library.data.length ? (
            <StatePanel kind="loading" surface={false} title="Đang tải mẫu bộ dụng cụ…" />
          ) : library.error ? (
            <StatePanel
              kind="error"
              surface={false}
              title="Không thể tải thư viện mẫu bộ dụng cụ"
              description={library.error}
              extra={<Button onClick={() => void library.refresh()}>Thử lại</Button>}
            />
          ) : library.data.length ? (
            <div className="space-y-3">
              {library.data.map((template) => {
                const isApplying = applyingTemplateId === template.id;
                const isSyncing = syncingTemplateId === template.id;
                const isDeleting = deletingTemplateId === template.id;
                return (
                  <article
                    key={template.id}
                    className="rounded-2xl border p-3 transition-shadow hover:shadow-sm"
                    style={{ borderColor: token.colorBorderSecondary, background: token.colorBgContainer }}
                  >
                    <div className="grid items-center gap-3 lg:grid-cols-[144px_minmax(0,1fr)_auto]">
                      <TemplatePreview template={template} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                            style={{ background: token.colorPrimaryBg, color: token.colorPrimary }}
                          >
                            <AppIcon icon={PackageCheck} size="sm" />
                          </span>
                          <h3 className="m-0 truncate text-base font-extrabold">{template.title}</h3>
                          <span className="shrink-0 text-xs font-semibold opacity-55">
                            {template.packages.length} gói
                          </span>
                        </div>
                        <p className="mb-0 mt-1 truncate text-sm opacity-65">
                          {template.description || 'Chưa có ghi chú cho mẫu này.'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {template.packages.slice(0, 3).map((equipmentPackage) => (
                            <span
                              key={equipmentPackage.id}
                              className="inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-xs"
                              style={{ borderColor: token.colorBorderSecondary }}
                            >
                              <span className="max-w-32 truncate font-semibold">{equipmentPackage.name}</span>
                              <span className="tabular-nums opacity-60">{formatVnd(equipmentPackage.priceVnd)}</span>
                            </span>
                          ))}
                          {template.packages.length > 3 ? (
                            <span className="px-1 py-1 text-xs opacity-55">+{template.packages.length - 3}</span>
                          ) : null}
                        </div>
                      </div>
                      {canEdit ? (
                        <div className="flex flex-wrap items-center gap-2 lg:max-w-72 lg:justify-end">
                          <Button
                            size="small"
                            icon={<AppIcon icon={PencilLine} size="sm" />}
                            disabled={isApplying || isSyncing || isDeleting}
                            onClick={() => openRename(template)}
                          >
                            Sửa
                          </Button>
                          <Popconfirm
                            title={`Cập nhật “${template.title}” bằng bộ hiện tại?`}
                            description="Tên và ghi chú giữ nguyên; các gói, giá, danh sách dụng cụ và ảnh trong mẫu sẽ được thay bằng workshop đang mở."
                            okText="Cập nhật mẫu"
                            cancelText="Hủy"
                            okButtonProps={{ loading: isSyncing }}
                            onConfirm={() => void syncTemplate(template)}
                          >
                            <Button size="small" loading={isSyncing} disabled={isApplying || isDeleting}>
                              Cập nhật
                            </Button>
                          </Popconfirm>
                          <Popconfirm
                            title={`Áp dụng mẫu “${template.title}”?`}
                            description="Các gói hiện tại sẽ được thay bằng bản sao từ mẫu. Lựa chọn đã lưu của học viên vẫn được giữ để đối soát."
                            okText="Áp dụng"
                            cancelText="Hủy"
                            okButtonProps={{ loading: isApplying }}
                            onConfirm={() => void applyTemplate(template)}
                          >
                            <Button size="small" type="primary" loading={isApplying} disabled={isSyncing || isDeleting}>
                              Áp dụng
                            </Button>
                          </Popconfirm>
                          <Popconfirm
                            title={`Xóa mẫu “${template.title}”?`}
                            description="Các workshop đã áp dụng mẫu không bị ảnh hưởng."
                            okText="Xóa mẫu"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true, loading: isDeleting }}
                            onConfirm={() => void deleteTemplate(template)}
                          >
                            <IconButton
                              label={`Xóa mẫu ${template.title}`}
                              icon={Trash2}
                              tone="danger"
                              disabled={isApplying || isSyncing || isDeleting}
                            />
                          </Popconfirm>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <StatePanel
              kind="empty"
              surface={false}
              title={library.search ? 'Không có mẫu bộ dụng cụ phù hợp' : 'Chưa có mẫu bộ dụng cụ'}
              description={
                library.search
                  ? 'Thử tên loại workshop khác.'
                  : 'Lưu bộ dụng cụ đang hiển thị để dùng lại cho các buổi cùng loại.'
              }
              extra={canEdit && hasWorkshopEquipment ? <Button onClick={openSave}>Lưu mẫu đầu tiên</Button> : undefined}
            />
          )}
          {library.total > library.pageSize ? (
            <div className="flex justify-end">
              <Pagination
                current={library.page}
                pageSize={library.pageSize}
                total={library.total}
                showSizeChanger
                pageSizeOptions={['10', '20', '50', '100']}
                showTotal={(total) => `${total} mẫu`}
                onChange={library.setPagination}
              />
            </div>
          ) : null}
        </div>
      </AdaptiveDrawer>

      <EntityFormDrawer
        open={editorOpen}
        onClose={closeEditor}
        title={
          isEditing
            ? `Chỉnh sửa thông tin: ${editingTemplate?.title}`
            : saveTarget === 'existing'
              ? 'Lưu vào mẫu có sẵn'
              : 'Lưu bộ dụng cụ đang hiển thị thành mẫu'
        }
        destroyOnHidden
        footer={
          <Space className="w-full justify-end" wrap>
            <Button onClick={closeEditor} disabled={saving}>
              Hủy
            </Button>
            {isEditing || saveTarget === 'new' ? (
              <Button type="primary" loading={saving} onClick={() => form.submit()}>
                <IconText icon={<AppIcon icon={Save} />}>{isEditing ? 'Lưu thông tin' : 'Lưu thành mẫu'}</IconText>
              </Button>
            ) : (
              <Popconfirm
                title={
                  selectedTemplate ? `Cập nhật “${selectedTemplate.title}” bằng bộ hiện tại?` : 'Chọn mẫu cần cập nhật'
                }
                description="Các gói, giá, danh sách dụng cụ và ảnh trong mẫu sẽ được thay bằng workshop đang mở. Tên và ghi chú vẫn giữ nguyên."
                okText="Cập nhật mẫu"
                cancelText="Hủy"
                okButtonProps={{ loading: saving }}
                disabled={!selectedTemplate || saving}
                onConfirm={() => form.submit()}
              >
                <Button type="primary" loading={saving} disabled={!selectedTemplate}>
                  <IconText icon={<AppIcon icon={ArchiveRestore} />}>Cập nhật mẫu</IconText>
                </Button>
              </Popconfirm>
            )}
          </Space>
        }
      >
        <div
          className="mb-4 rounded-xl border p-3"
          style={{ borderColor: token.colorBorderSecondary, background: token.colorFillQuaternary }}
        >
          <IconText icon={<AppIcon icon={Sparkles} />}>
            {isEditing
              ? 'Đổi tên hoặc ghi chú tại đây; nội dung mẫu được cập nhật từ các card bộ dụng cụ ở workshop.'
              : saveTarget === 'existing'
                ? 'Bộ dụng cụ và ảnh đang thấy sẽ thay nội dung của mẫu bạn chọn. Tên và ghi chú mẫu được giữ nguyên.'
                : 'Bộ dụng cụ và ảnh đang thấy sẽ được lưu nguyên vẹn.'}
          </IconText>
        </div>
        {!isEditing ? (
          <div className="mb-5 space-y-3">
            <div className="text-sm font-extrabold">Lưu vào</div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Nơi lưu mẫu bộ dụng cụ">
              <Button
                type={saveTarget === 'new' ? 'primary' : 'default'}
                onClick={() => {
                  setSaveTarget('new');
                  setSelectedTemplateId(null);
                }}
              >
                <IconText icon={<AppIcon icon={Save} />}>Mẫu mới</IconText>
              </Button>
              <Button
                type={saveTarget === 'existing' ? 'primary' : 'default'}
                onClick={() => setSaveTarget('existing')}
              >
                <IconText icon={<AppIcon icon={ArchiveRestore} />}>Mẫu có sẵn</IconText>
              </Button>
            </div>
            {saveTarget === 'existing' ? (
              library.loading && !library.data.length ? (
                <StatePanel kind="loading" surface={false} title="Đang tải các mẫu có sẵn…" />
              ) : library.error ? (
                <StatePanel
                  kind="error"
                  surface={false}
                  title="Không thể tải mẫu có sẵn"
                  description={library.error}
                  extra={<Button onClick={() => void library.refresh()}>Thử lại</Button>}
                />
              ) : library.data.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {library.data.map((template) => {
                    const cover = template.packages.flatMap((equipmentPackage) => equipmentPackage.images)[0];
                    const isSelected = selectedTemplateId === template.id;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        aria-pressed={isSelected}
                        className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] items-center gap-3 rounded-xl border p-2 text-left transition-colors"
                        style={{
                          borderColor: isSelected ? token.colorPrimary : token.colorBorderSecondary,
                          background: isSelected ? token.colorPrimaryBg : token.colorBgContainer,
                        }}
                        onClick={() => setSelectedTemplateId(template.id)}
                      >
                        {cover ? (
                          <img src={cover.imageUrl} alt="" className="h-14 w-[72px] rounded-lg object-cover" />
                        ) : (
                          <span
                            className="flex h-14 w-[72px] items-center justify-center rounded-lg"
                            style={{ background: token.colorFillQuaternary, color: token.colorTextTertiary }}
                          >
                            <AppIcon icon={Images} />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-extrabold">{template.title}</span>
                          <span className="mt-1 block text-xs opacity-60">{template.packages.length} gói dụng cụ</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <StatePanel
                  kind="empty"
                  surface={false}
                  title="Chưa có mẫu để cập nhật"
                  description="Hãy lưu bộ dụng cụ này thành mẫu mới trước."
                />
              )
            ) : null}
          </div>
        ) : null}
        <EntityForm<TemplateFormValues> form={form} columns={1} onFinish={saveTemplate} disabled={saving}>
          {isEditing || saveTarget === 'new' ? (
            <>
              <EntityFormField
                name="title"
                label="Tên mẫu"
                rules={[
                  { required: true, whitespace: true, message: 'Nhập tên mẫu bộ dụng cụ.' },
                  { max: 180, message: 'Tên mẫu tối đa 180 ký tự.' },
                ]}
              >
                <Input autoFocus placeholder="Ví dụ: Workshop Nối Mi Cơ Bản" />
              </EntityFormField>
              <EntityFormField name="description" label="Ghi chú (tùy chọn)">
                <Input.TextArea
                  rows={3}
                  maxLength={2000}
                  placeholder="Ví dụ: Bộ dụng cụ dành cho workshop nối mi cơ bản"
                />
              </EntityFormField>
            </>
          ) : null}
        </EntityForm>
      </EntityFormDrawer>
    </>
  );
}
