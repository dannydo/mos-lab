'use client';

import React from 'react';
import { Button, DatePicker, message } from 'antd';
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
      className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/40"
      aria-label={configuration.title}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="m-0 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
            <AppIcon icon={Clock3} size="sm" className="text-amber-500" />
            <span>{configuration.title}</span>
          </h3>
          <p className="mb-0 mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Học viên có thể chọn hoặc thay đổi {configuration.itemLabel} đến mốc này.
          </p>
        </div>
        <StatusTag
          status={configuration.deadline ? 'success' : 'default'}
          label={configuration.deadline ? 'Đã đặt riêng' : 'Theo giờ bắt đầu'}
          className="!mb-0"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <div className="w-full sm:w-72">
          <label className="sr-only" htmlFor={`workshop-${selectionType}-selection-deadline`}>
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
            placeholder="Chốt khi bắt đầu workshop"
            onChange={setDraftDeadline}
          />
        </div>

        {canEdit && deadlineHasChanged ? (
          <Button type="primary" loading={saving} disabled={deadlineIsInvalid} onClick={() => void saveDeadline()}>
            <IconText icon={<AppIcon icon={Save} />}>Lưu hạn chốt</IconText>
          </Button>
        ) : null}

        {canEdit ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400">Gợi ý mốc:</span>
            <button
              type="button"
              onClick={() => setDraftDeadline(startsAt.subtract(24, 'hour'))}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Trước 24h
            </button>
            <button
              type="button"
              onClick={() => setDraftDeadline(startsAt.subtract(12, 'hour'))}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Trước 12h
            </button>
            <button
              type="button"
              onClick={() => setDraftDeadline(startsAt.subtract(2, 'hour'))}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Trước 2h
            </button>
            {draftDeadline ? (
              <button
                type="button"
                onClick={() => setDraftDeadline(null)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:border-slate-800 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
              >
                Giờ bắt đầu
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <p
        className={`mb-0 mt-2 text-xs leading-5 ${deadlineIsInvalid ? 'text-rose-500 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}
      >
        {deadlineIsInvalid
          ? '⚠️ Hạn chốt không được sau giờ bắt đầu workshop.'
          : draftDeadline
            ? `Học viên có thể thay đổi ${configuration.itemLabel} đến ${effectiveDeadline.format('HH:mm · DD/MM/YYYY')}.`
            : `Chưa đặt riêng — học viên được thay đổi ${configuration.itemLabel} đến ${effectiveDeadline.format('HH:mm · DD/MM/YYYY')} (giờ bắt đầu workshop).`}
      </p>
    </section>
  );
}
