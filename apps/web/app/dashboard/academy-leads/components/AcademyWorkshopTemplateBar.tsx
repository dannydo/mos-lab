'use client';

import React from 'react';
import { Button, Popconfirm, Select, Space } from 'antd';
import { LibraryBig, Save, WandSparkles } from 'lucide-react';
import { AppIcon, IconText, StatusTag } from '../../../../components/ui';

export interface AcademyWorkshopTemplateOption {
  id: number;
  title: string;
  description?: string | null;
}

export interface AcademyWorkshopTemplateBarProps {
  title: string;
  ariaLabel: string;
  templates: AcademyWorkshopTemplateOption[];
  selectedTemplateId: number | null;
  isCurrentTemplate: boolean;
  selectedTemplateTitle?: string | null;
  selectedTemplateDescription?: string | null;
  canEdit: boolean;
  loading?: boolean;
  saving?: boolean;
  templateSaving?: boolean;
  error?: string | null;
  saveAsNewDisabled?: boolean;
  applyConfirmTitle?: string;
  applyConfirmDescription?: string;
  updateConfirmTitle?: string;
  updateConfirmDescription?: string;
  metadata?: React.ReactNode;
  onSelectTemplate: (templateId: number) => void;
  onOpenLibrary: () => void;
  onApplyTemplate?: () => Promise<void> | void;
  onUpdateCurrentTemplate?: () => Promise<void> | void;
  onSaveAsNewTemplate?: () => void;
  extraActions?: React.ReactNode;
}

export default function AcademyWorkshopTemplateBar({
  title,
  ariaLabel,
  templates,
  selectedTemplateId,
  isCurrentTemplate,
  selectedTemplateTitle,
  selectedTemplateDescription,
  canEdit,
  loading = false,
  saving = false,
  templateSaving = false,
  error = null,
  saveAsNewDisabled = false,
  applyConfirmTitle,
  applyConfirmDescription,
  updateConfirmTitle,
  updateConfirmDescription,
  metadata,
  onSelectTemplate,
  onOpenLibrary,
  onApplyTemplate,
  onUpdateCurrentTemplate,
  onSaveAsNewTemplate,
  extraActions,
}: AcademyWorkshopTemplateBarProps) {
  const busy = saving || templateSaving;
  const currentTitle = selectedTemplateTitle || '';

  return (
    <section
      className="academy-workshop-template-panel rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-colors"
      aria-label={ariaLabel}
    >
      <div className="academy-workshop-template-panel__header flex items-center justify-between gap-3">
        <div className="academy-workshop-template-panel__title flex items-center gap-2.5 min-w-0">
          <h3 className="m-0 text-sm font-semibold truncate text-inherit">{title}</h3>
          {isCurrentTemplate && selectedTemplateId ? (
            <StatusTag status="success" label="Đang áp dụng" className="!mb-0" />
          ) : null}
        </div>
        <Button type="text" size="small" onClick={onOpenLibrary} disabled={busy} className="shrink-0">
          <IconText icon={<AppIcon icon={LibraryBig} />}>Thư viện mẫu</IconText>
        </Button>
      </div>

      <div className="academy-workshop-template-panel__selection pt-3">
        <div className="academy-workshop-template-panel__field min-w-0">
          <Select
            value={selectedTemplateId || undefined}
            className="w-full"
            loading={loading}
            disabled={!canEdit || busy || loading}
            placeholder={error ? 'Không thể tải danh sách mẫu' : 'Chọn một mẫu từ thư viện'}
            options={templates.map((template) => ({
              value: template.id,
              label: template.title,
            }))}
            onChange={onSelectTemplate}
          />
        </div>

        <div className="academy-workshop-template-panel__action flex items-center justify-end">
          {!canEdit && !selectedTemplateId ? (
            <span className="academy-workshop-template-panel__action-hint text-xs text-slate-500 dark:text-slate-400">
              Chọn mẫu để tiếp tục
            </span>
          ) : (
            <Space wrap size={8}>
              {canEdit && isCurrentTemplate && selectedTemplateId && onUpdateCurrentTemplate ? (
                <Popconfirm
                  title={updateConfirmTitle || `Cập nhật mẫu “${currentTitle}”?`}
                  description={
                    updateConfirmDescription ||
                    'Nội dung hiện tại sẽ thay thế mẫu gốc. Các workshop khác đã dùng mẫu này vẫn giữ bản sao riêng.'
                  }
                  okText="Cập nhật mẫu"
                  cancelText="Hủy"
                  okButtonProps={{ loading: templateSaving }}
                  onConfirm={onUpdateCurrentTemplate}
                  disabled={busy}
                >
                  <Button disabled={busy} loading={templateSaving}>
                    <IconText icon={<AppIcon icon={Save} />}>Cập nhật mẫu</IconText>
                  </Button>
                </Popconfirm>
              ) : null}

              {canEdit && selectedTemplateId && !isCurrentTemplate && onApplyTemplate ? (
                <Popconfirm
                  title={applyConfirmTitle || `Áp dụng mẫu “${currentTitle}”?`}
                  description={
                    applyConfirmDescription ||
                    'Nội dung hiện tại sẽ được thay bằng bản sao từ mẫu đã chọn. Lựa chọn đã lưu của học viên vẫn được giữ.'
                  }
                  okText="Áp dụng"
                  cancelText="Hủy"
                  onConfirm={onApplyTemplate}
                  disabled={busy}
                >
                  <Button type="primary" disabled={busy} loading={saving}>
                    <IconText icon={<AppIcon icon={WandSparkles} />}>Áp dụng mẫu</IconText>
                  </Button>
                </Popconfirm>
              ) : null}

              {canEdit && onSaveAsNewTemplate ? (
                <Button onClick={onSaveAsNewTemplate} disabled={saveAsNewDisabled || busy}>
                  <IconText icon={<AppIcon icon={Save} />}>Lưu mẫu mới</IconText>
                </Button>
              ) : null}

              {extraActions}
            </Space>
          )}
        </div>
      </div>

      <div
        className={
          error
            ? 'academy-workshop-template-panel__details pt-3 flex flex-wrap items-start justify-between gap-2 text-xs text-rose-500 dark:text-rose-400'
            : 'academy-workshop-template-panel__details pt-3 flex flex-wrap items-start justify-between gap-2 text-xs text-slate-500 dark:text-slate-400'
        }
      >
        <span className="flex-1 min-w-[240px] leading-relaxed">
          {error || selectedTemplateDescription || 'Chọn một mẫu từ thư viện để áp dụng cho workshop.'}
        </span>
        {metadata ? (
          <span className="academy-workshop-template-panel__metadata tabular-nums flex items-center flex-wrap gap-2 shrink-0">
            {metadata}
          </span>
        ) : null}
      </div>
    </section>
  );
}
