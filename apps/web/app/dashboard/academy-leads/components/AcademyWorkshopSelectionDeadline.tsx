'use client';

import React from 'react';
import { Button, DatePicker, Space, message, theme } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Clock3, Save } from 'lucide-react';
import type { AcademyWorkshopDetail } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { AppIcon, IconText, StatusTag } from '../../../../components/ui';

type SelectionType = 'menu' | 'equipment';

export default function AcademyWorkshopSelectionDeadline({
  workshop,
  canEdit,
  onUpdated,
  selectionType,
}: {
  workshop: AcademyWorkshopDetail;
  canEdit: boolean;
  onUpdated: (workshop: AcademyWorkshopDetail) => void;
  selectionType: SelectionType;
}) {
  const { token } = theme.useToken();
  const configuration =
    selectionType === 'menu'
      ? {
          title: 'Hạn chốt thực đơn',
          itemLabel: 'thực đơn',
          inputLabel: 'Chọn hạn cuối chọn/thay đổi món',
          deadline: workshop.menuSelectionDeadline,
          request: (deadline: string | null) => ({ menuSelectionDeadline: deadline }),
        }
      : {
          title: 'Hạn chốt bộ dụng cụ',
          itemLabel: 'bộ dụng cụ',
          inputLabel: 'Chọn hạn cuối chọn/thay đổi dụng cụ',
          deadline: workshop.equipmentSelectionDeadline,
          request: (deadline: string | null) => ({ equipmentSelectionDeadline: deadline }),
        };
  const [draftDeadline, setDraftDeadline] = React.useState<Dayjs | null>(
    configuration.deadline ? dayjs(configuration.deadline) : null
  );
  const [saving, setSaving] = React.useState(false);
  const startsAt = React.useMemo(() => dayjs(workshop.startsAt), [workshop.startsAt]);
  const deadlineIsInvalid = Boolean(draftDeadline && draftDeadline.isAfter(startsAt));
  const deadlineHasChanged =
    (draftDeadline?.valueOf() || null) !== (configuration.deadline ? dayjs(configuration.deadline).valueOf() : null);
  const effectiveDeadline = draftDeadline || startsAt;

  React.useEffect(() => {
    setDraftDeadline(configuration.deadline ? dayjs(configuration.deadline) : null);
  }, [configuration.deadline]);

  const saveDeadline = async () => {
    if (deadlineIsInvalid) {
      message.error('Hạn chốt phải trước hoặc đúng giờ bắt đầu workshop.');
      return;
    }
    setSaving(true);
    try {
      const updated = await apiClient.academySales.workshops.update(
        workshop.id,
        configuration.request(draftDeadline?.toISOString() || null)
      );
      onUpdated(updated);
      message.success(
        draftDeadline
          ? `Đã cập nhật hạn chốt ${configuration.itemLabel}.`
          : `Đã chốt ${configuration.itemLabel} vào giờ bắt đầu workshop.`
      );
    } catch (cause: any) {
      message.error(cause?.response?.data?.message || 'Không thể cập nhật hạn chốt lựa chọn.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="rounded-xl border p-3"
      style={{ borderColor: token.colorBorderSecondary, background: token.colorFillQuaternary }}
      aria-label={configuration.title}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-sm font-semibold">
            <IconText icon={<AppIcon icon={Clock3} size="sm" />}>{configuration.title}</IconText>
          </h3>
          <p className="mb-0 mt-1 text-xs leading-5 opacity-65">
            Học viên có thể chọn hoặc thay đổi {configuration.itemLabel} đến mốc này.
          </p>
        </div>
        <StatusTag
          status={configuration.deadline ? 'success' : 'default'}
          label={configuration.deadline ? 'Đã đặt' : 'Theo giờ bắt đầu'}
          className="!mb-0"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[240px] flex-1">
          <label className="mb-1 block text-xs font-medium" htmlFor={`workshop-${selectionType}-selection-deadline`}>
            {configuration.inputLabel}
          </label>
          <DatePicker
            id={`workshop-${selectionType}-selection-deadline`}
            className="w-full"
            allowClear
            showTime
            format="DD/MM/YYYY HH:mm"
            value={draftDeadline}
            status={deadlineIsInvalid ? 'error' : undefined}
            disabled={!canEdit || saving}
            placeholder="Để trống: chốt khi workshop bắt đầu"
            onChange={setDraftDeadline}
          />
        </div>
        {canEdit ? (
          <Button
            type="primary"
            loading={saving}
            disabled={!deadlineHasChanged || deadlineIsInvalid}
            onClick={() => void saveDeadline()}
          >
            <IconText icon={<AppIcon icon={Save} />}>Lưu hạn chốt</IconText>
          </Button>
        ) : null}
      </div>

      <p
        className="mb-0 mt-2 text-xs leading-5"
        style={{ color: deadlineIsInvalid ? token.colorError : token.colorTextSecondary }}
      >
        {deadlineIsInvalid
          ? 'Hạn chốt không được sau giờ bắt đầu workshop.'
          : draftDeadline
            ? `Học viên có thể thay đổi ${configuration.itemLabel} đến ${effectiveDeadline.format('HH:mm · DD/MM/YYYY')}.`
            : `Chưa đặt riêng — học viên được thay đổi ${configuration.itemLabel} đến ${effectiveDeadline.format('HH:mm · DD/MM/YYYY')} (giờ bắt đầu workshop).`}
      </p>
    </section>
  );
}
