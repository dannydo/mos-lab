'use client';

import React from 'react';
import { Alert, Button, Form, Input, Pagination, Popconfirm, Space, message, theme } from 'antd';
import { LibraryBig, Save, Trash2, UtensilsCrossed, WandSparkles } from 'lucide-react';
import {
  ACADEMY_WORKSHOP_MENU_CATEGORIES,
  ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS,
  type AcademyWorkshopDetail,
  type AcademyWorkshopMenuTemplate,
  type SaveAcademyWorkshopMenuTemplateRequest,
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
import { useAcademyWorkshopMenuTemplates } from './useAcademyWorkshopMenuTemplates';

type TemplateFormValues = SaveAcademyWorkshopMenuTemplateRequest;

function templateItemCounts(template: AcademyWorkshopMenuTemplate) {
  return Object.fromEntries(
    ACADEMY_WORKSHOP_MENU_CATEGORIES.map((category) => [
      category,
      template.items.filter((item) => item.category === category).length,
    ])
  ) as Record<(typeof ACADEMY_WORKSHOP_MENU_CATEGORIES)[number], number>;
}

function templateFormValues(): TemplateFormValues {
  return { title: '', description: null };
}

export default function AcademyWorkshopMenuTemplateLibrary({
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
  /** Opens the save prompt directly from the workshop template panel. */
  saveRequestId?: number;
  onClose: () => void;
  onApplied: (workshop: AcademyWorkshopDetail) => void;
}) {
  const { token } = theme.useToken();
  const [form] = Form.useForm<TemplateFormValues>();
  const library = useAcademyWorkshopMenuTemplates(open);
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [applyingTemplateId, setApplyingTemplateId] = React.useState<number | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = React.useState<number | null>(null);
  const handledSaveRequest = React.useRef(0);

  const openSave = React.useCallback(() => {
    form.setFieldsValue(templateFormValues());
    setSaveOpen(true);
  }, [form]);

  React.useEffect(() => {
    if (!open || !saveRequestId || saveRequestId === handledSaveRequest.current) return;
    handledSaveRequest.current = saveRequestId;
    openSave();
  }, [open, openSave, saveRequestId]);

  const closeSave = React.useCallback(() => {
    if (saving) return;
    setSaveOpen(false);
    form.resetFields();
  }, [form, saving]);

  const saveTemplate = React.useCallback(
    async (values: TemplateFormValues) => {
      setSaving(true);
      try {
        await apiClient.academySales.workshops.saveMenuAsTemplate(workshop.id, {
          title: values.title.trim(),
          description: values.description?.trim() || null,
        });
        setSaveOpen(false);
        form.resetFields();
        await library.refresh();
        message.success('Đã lưu thực đơn hiện tại thành mẫu dùng chung.');
      } catch (cause) {
        message.error(library.mutationMessage(cause, 'Không thể lưu mẫu thực đơn.'));
      } finally {
        setSaving(false);
      }
    },
    [form, library, workshop.id]
  );

  const applyTemplate = React.useCallback(
    async (template: AcademyWorkshopMenuTemplate) => {
      setApplyingTemplateId(template.id);
      try {
        const updated = await apiClient.academySales.workshops.applyMenuTemplate(workshop.id, template.id);
        onApplied(updated);
        onClose();
        message.success(`Đã áp dụng mẫu “${template.title}”.`);
      } catch (cause) {
        message.error(library.mutationMessage(cause, 'Không thể áp dụng mẫu thực đơn.'));
      } finally {
        setApplyingTemplateId(null);
      }
    },
    [library, onApplied, onClose, workshop.id]
  );

  const deleteTemplate = React.useCallback(
    async (template: AcademyWorkshopMenuTemplate) => {
      setDeletingTemplateId(template.id);
      try {
        await library.deleteTemplate(template.id);
        message.success(`Đã xóa mẫu “${template.title}”. Workshop đã áp dụng mẫu vẫn giữ thực đơn riêng.`);
      } catch (cause) {
        message.error(library.mutationMessage(cause, 'Không thể xóa mẫu thực đơn.'));
      } finally {
        setDeletingTemplateId(null);
      }
    },
    [library]
  );

  const hasWorkshopMenu = workshop.menuItems.length > 0;

  return (
    <>
      <AdaptiveDrawer
        open={open}
        onClose={onClose}
        intent="data"
        width="min(94vw, 1100px)"
        title={<IconText icon={<AppIcon icon={LibraryBig} />}>Thư viện mẫu thực đơn</IconText>}
        extra={
          canEdit ? (
            <Button type="primary" onClick={openSave} disabled={!hasWorkshopMenu}>
              <IconText icon={<AppIcon icon={Save} />}>Lưu thực đơn này</IconText>
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-4">
          <Alert
            type="info"
            showIcon
            message="Mỗi mẫu là một danh sách món dùng chung"
            description="Áp dụng mẫu sẽ sao chép món vào workshop này. Sau đó bạn vẫn có thể sửa từng món mà không ảnh hưởng đến mẫu hoặc workshop khác."
          />
          {!hasWorkshopMenu && canEdit ? (
            <Alert
              type="warning"
              showIcon
              message="Workshop này chưa có món để lưu thành mẫu"
              description="Thêm ít nhất một món, rồi quay lại đây để lưu mẫu Nhà hàng Việt Thái, Việt Nhật hoặc bất kỳ đối tác nào."
            />
          ) : null}
          <SearchField
            behavior="filter"
            value={library.search}
            onChange={(event) => library.setSearch(event.target.value)}
            placeholder="Tìm mẫu thực đơn…"
            aria-label="Tìm mẫu thực đơn"
            allowClear
          />
          {library.loading && !library.data.length ? (
            <StatePanel kind="loading" surface={false} title="Đang tải mẫu thực đơn…" />
          ) : library.error ? (
            <StatePanel
              kind="error"
              surface={false}
              title="Không thể tải thư viện mẫu thực đơn"
              description={library.error}
              extra={<Button onClick={() => void library.refresh()}>Thử lại</Button>}
            />
          ) : library.data.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {library.data.map((template) => {
                const counts = templateItemCounts(template);
                const isApplying = applyingTemplateId === template.id;
                const isDeleting = deletingTemplateId === template.id;
                return (
                  <article
                    key={template.id}
                    className="rounded-2xl border p-4 transition-shadow hover:shadow-sm"
                    style={{ borderColor: token.colorBorderSecondary, background: token.colorBgContainer }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                            style={{ background: token.colorPrimaryBg, color: token.colorPrimary }}
                          >
                            <AppIcon icon={UtensilsCrossed} size="sm" />
                          </span>
                          <h3 className="m-0 truncate text-sm font-extrabold">{template.title}</h3>
                        </div>
                        {template.description ? (
                          <p className="mb-0 mt-3 text-sm leading-6 opacity-70">{template.description}</p>
                        ) : (
                          <p className="mb-0 mt-3 text-sm opacity-50">Chưa có ghi chú cho mẫu này.</p>
                        )}
                      </div>
                      {canEdit ? (
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
                            disabled={isApplying || isDeleting}
                          />
                        </Popconfirm>
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {ACADEMY_WORKSHOP_MENU_CATEGORIES.map((category) => (
                        <span
                          key={category}
                          className="inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-none"
                          style={{ borderColor: token.colorBorderSecondary, color: token.colorTextSecondary }}
                        >
                          {ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS[category]} · {counts[category]}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-end">
                      {canEdit ? (
                        <Popconfirm
                          title={`Áp dụng mẫu “${template.title}”?`}
                          description="Thực đơn hiện tại sẽ được thay bằng bản sao từ mẫu. Lựa chọn đã lưu của học viên vẫn được giữ để đối soát."
                          okText="Áp dụng"
                          cancelText="Hủy"
                          okButtonProps={{ loading: isApplying }}
                          onConfirm={() => void applyTemplate(template)}
                        >
                          <Button type="primary" loading={isApplying} disabled={isDeleting}>
                            <IconText icon={<AppIcon icon={WandSparkles} />}>Áp dụng cho workshop</IconText>
                          </Button>
                        </Popconfirm>
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
              title={library.search ? 'Không có mẫu thực đơn phù hợp' : 'Chưa có mẫu thực đơn'}
              description={
                library.search
                  ? 'Thử tên nhà hàng hoặc tên món khác.'
                  : 'Lưu thực đơn workshop hiện tại để dùng lại cho các buổi tiếp theo.'
              }
              extra={canEdit && hasWorkshopMenu ? <Button onClick={openSave}>Lưu mẫu đầu tiên</Button> : undefined}
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
        open={saveOpen}
        onClose={closeSave}
        title="Lưu thực đơn hiện tại thành mẫu"
        destroyOnHidden
        footer={
          <Space className="w-full justify-end" wrap>
            <Button onClick={closeSave} disabled={saving}>
              Hủy
            </Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}>
              <IconText icon={<AppIcon icon={Save} />}>Lưu mẫu</IconText>
            </Button>
          </Space>
        }
      >
        <EntityForm<TemplateFormValues> form={form} columns={1} onFinish={saveTemplate} disabled={saving}>
          <EntityFormField
            name="title"
            label="Tên mẫu"
            rules={[
              { required: true, whitespace: true, message: 'Nhập tên mẫu thực đơn.' },
              { max: 180, message: 'Tên mẫu tối đa 180 ký tự.' },
            ]}
          >
            <Input autoFocus placeholder="Ví dụ: Nhà hàng Việt Thái" />
          </EntityFormField>
          <EntityFormField name="description" label="Ghi chú (tùy chọn)">
            <Input.TextArea rows={3} maxLength={2000} placeholder="Ví dụ: Menu buổi workshop tháng 8" />
          </EntityFormField>
        </EntityForm>
      </EntityFormDrawer>
    </>
  );
}
