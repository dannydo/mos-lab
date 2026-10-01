'use client';

import React from 'react';
import { Alert, Button, DatePicker, Popconfirm, Space, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { CalendarClock, CheckCircle2, FileEdit, RotateCcw, Send, XCircle } from 'lucide-react';
import type { AcademyWorkshopDetail } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { AdaptiveModal, AppIcon, IconText, StatusTag } from '../../../../components/ui';

interface AcademyWorkshopPublishControlProps {
  workshop: AcademyWorkshopDetail;
  canManage: boolean;
  onUpdated: (updated: AcademyWorkshopDetail) => void;
}

function calculateTimeRemaining(targetIso: string) {
  const diff = dayjs(targetIso).diff(dayjs(), 'second');
  if (diff <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0, formatted: '00:00:00' };
  }
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  const formatted =
    days > 0
      ? `${days} ngày ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return { expired: false, days, hours, minutes, seconds, formatted };
}

export default function AcademyWorkshopPublishControl({
  workshop,
  canManage,
  onUpdated,
}: AcademyWorkshopPublishControlProps) {
  const [scheduleModalOpen, setScheduleModalOpen] = React.useState(false);
  const [selectedScheduleDate, setSelectedScheduleDate] = React.useState<Dayjs | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Live countdown timer state (re-evaluates every second)
  const [countdown, setCountdown] = React.useState(() =>
    workshop.scheduledPublishAt ? calculateTimeRemaining(workshop.scheduledPublishAt) : null
  );

  React.useEffect(() => {
    if (!workshop.scheduledPublishAt) {
      setCountdown(null);
      return;
    }
    const updateCountdown = () => {
      const remaining = calculateTimeRemaining(workshop.scheduledPublishAt!);
      setCountdown(remaining);
      if (remaining.expired && workshop.status === 'DRAFT') {
        // Auto-refresh when countdown hits zero
        void apiClient.academySales.workshops
          .getBySlug(workshop.slug)
          .then(onUpdated)
          .catch(() => undefined);
      }
    };
    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [workshop.scheduledPublishAt, workshop.slug, workshop.status, onUpdated]);

  const handlePublishNow = async () => {
    setSubmitting(true);
    try {
      const updated = await apiClient.academySales.workshops.update(workshop.id, {
        status: 'SCHEDULED',
        publishedAt: new Date().toISOString(),
        scheduledPublishAt: null,
      });
      message.success('Đã công bố workshop thành công! Học viên có thể đăng ký ngay.');
      onUpdated(updated);
    } catch (cause: any) {
      message.error(cause?.response?.data?.message || 'Không thể công bố workshop.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!selectedScheduleDate) {
      message.warning('Vui lòng chọn thời gian hẹn giờ công bố.');
      return;
    }
    if (selectedScheduleDate.isBefore(dayjs())) {
      message.warning('Thời gian hẹn giờ phải ở tương lai.');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await apiClient.academySales.workshops.update(workshop.id, {
        scheduledPublishAt: selectedScheduleDate.toISOString(),
      });
      message.success(`Đã hẹn giờ công bố workshop vào lúc ${selectedScheduleDate.format('HH:mm DD/MM/YYYY')}.`);
      setScheduleModalOpen(false);
      setSelectedScheduleDate(null);
      onUpdated(updated);
    } catch (cause: any) {
      message.error(cause?.response?.data?.message || 'Không thể lưu lịch hẹn công bố.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSchedule = async () => {
    setSubmitting(true);
    try {
      const updated = await apiClient.academySales.workshops.update(workshop.id, {
        scheduledPublishAt: null,
      });
      message.success('Đã hủy lịch hẹn công bố.');
      onUpdated(updated);
    } catch (cause: any) {
      message.error(cause?.response?.data?.message || 'Không thể hủy lịch hẹn.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevertToDraft = async () => {
    setSubmitting(true);
    try {
      const updated = await apiClient.academySales.workshops.update(workshop.id, {
        status: 'DRAFT',
        scheduledPublishAt: null,
      });
      message.success('Đã chuyển workshop về bản nháp.');
      onUpdated(updated);
    } catch (cause: any) {
      message.error(cause?.response?.data?.message || 'Không thể chuyển về bản nháp.');
    } finally {
      setSubmitting(false);
    }
  };

  const isDraft = workshop.status === 'DRAFT';
  const isScheduled = workshop.status === 'SCHEDULED';
  const hasScheduledPublish = Boolean(workshop.scheduledPublishAt && countdown && !countdown.expired);

  if (!canManage) {
    if (isDraft) {
      return (
        <div className="mb-4">
          <Alert
            type="warning"
            showIcon
            message="Workshop đang ở trạng thái Bản nháp (DRAFT)"
            description="Học viên chưa thể đăng ký công khai. Vui lòng liên hệ Quản lý để công bố workshop."
          />
        </div>
      );
    }
    return null;
  }

  return (
    <div className="mb-4 w-full">
      {/* ── CASE 1: DRAFT with scheduled publish countdown ── */}
      {isDraft && hasScheduledPublish && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <AppIcon icon={CalendarClock} size="md" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  Đã hẹn giờ công bố tự động
                </span>
                <StatusTag
                  status="warning"
                  label={dayjs(workshop.scheduledPublishAt).format('HH:mm · DD/MM/YYYY')}
                  className="tabular-nums"
                />
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span>Tự động mở đăng ký sau:</span>
                <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {countdown?.formatted}
                </span>
              </div>
            </div>
          </div>

          <Space wrap size={8} className="shrink-0">
            <Popconfirm
              title="Công bố workshop ngay bây giờ?"
              description="Workshop sẽ chuyển sang Đã lên lịch (SCHEDULED) và mở link đăng ký lập tức."
              okText="Công bố ngay"
              cancelText="Hủy"
              onConfirm={handlePublishNow}
            >
              <Button
                type="primary"
                size="middle"
                loading={submitting}
                className="!bg-emerald-600 hover:!bg-emerald-500"
              >
                <IconText icon={<AppIcon icon={Send} size="sm" />}>Công bố ngay</IconText>
              </Button>
            </Popconfirm>
            <Button
              size="middle"
              onClick={() => {
                setSelectedScheduleDate(workshop.scheduledPublishAt ? dayjs(workshop.scheduledPublishAt) : null);
                setScheduleModalOpen(true);
              }}
            >
              Đổi giờ hẹn
            </Button>
            <Popconfirm
              title="Hủy lịch hẹn công bố?"
              description="Workshop sẽ quay lại trạng thái Bản nháp thông thường."
              okText="Hủy hẹn"
              cancelText="Không"
              onConfirm={handleCancelSchedule}
            >
              <Button size="middle" danger loading={submitting}>
                <IconText icon={<AppIcon icon={XCircle} size="sm" />}>Hủy hẹn</IconText>
              </Button>
            </Popconfirm>
          </Space>
        </div>
      )}

      {/* ── CASE 2: DRAFT without scheduled publish ── */}
      {isDraft && !hasScheduledPublish && (
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-500/20 bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400">
              <AppIcon icon={FileEdit} size="md" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                  Workshop đang là Bản nháp (DRAFT)
                </span>
                <StatusTag status="default" label="Chưa công bố" />
              </div>
              <p className="mb-0 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Khách truy cập link đăng ký sẽ thấy thông báo đóng. Bạn có thể công bố ngay hoặc hẹn giờ mở tự động.
              </p>
            </div>
          </div>

          <Space wrap size={8} className="shrink-0">
            <Popconfirm
              title="Công bố workshop ngay bây giờ?"
              description="Học viên sẽ có thể truy cập link và đăng ký tham gia ngay lập tức."
              okText="Công bố ngay"
              cancelText="Hủy"
              onConfirm={handlePublishNow}
            >
              <Button
                type="primary"
                size="middle"
                loading={submitting}
                className="!bg-emerald-600 hover:!bg-emerald-500 shadow-sm"
              >
                <IconText icon={<AppIcon icon={Send} size="sm" />}>Công bố ngay</IconText>
              </Button>
            </Popconfirm>

            <Button
              size="middle"
              onClick={() => {
                setSelectedScheduleDate(dayjs().add(1, 'day').set('hour', 9).set('minute', 0).set('second', 0));
                setScheduleModalOpen(true);
              }}
            >
              <IconText icon={<AppIcon icon={CalendarClock} size="sm" />}>Hẹn giờ công bố</IconText>
            </Button>
          </Space>
        </div>
      )}

      {/* ── CASE 3: SCHEDULED (Already published) ── */}
      {isScheduled && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <AppIcon icon={CheckCircle2} size="sm" />
            </span>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Đã công bố (Published)</span>
            {workshop.publishedAt && (
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                · lúc {dayjs(workshop.publishedAt).format('HH:mm DD/MM/YYYY')}
              </span>
            )}
          </div>

          <Space size={8}>
            <Popconfirm
              title="Thu hồi workshop về bản nháp?"
              description="Link đăng ký công khai sẽ tạm khóa không cho đăng ký mới."
              okText="Thu hồi"
              cancelText="Hủy"
              onConfirm={handleRevertToDraft}
            >
              <Button size="small" type="text" className="text-slate-500 hover:text-rose-600">
                <IconText icon={<AppIcon icon={RotateCcw} size="sm" />}>Thu hồi về Nháp</IconText>
              </Button>
            </Popconfirm>
          </Space>
        </div>
      )}

      {/* ── MODAL: SCHEDULE PUBLISH PICKER ── */}
      <AdaptiveModal
        title={
          <div className="flex items-center gap-2">
            <AppIcon icon={CalendarClock} size="md" className="text-amber-500" />
            <span>Hẹn giờ công bố workshop</span>
          </div>
        }
        open={scheduleModalOpen}
        onCancel={() => {
          if (!submitting) {
            setScheduleModalOpen(false);
            setSelectedScheduleDate(null);
          }
        }}
        onOk={handleSaveSchedule}
        confirmLoading={submitting}
        okText="Lưu lịch hẹn"
        cancelText="Đóng"
        destroyOnClose
      >
        <div className="py-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Chọn ngày và giờ mở cổng đăng ký công khai cho <strong>{workshop.name}</strong>. Khi đến đúng thời gian này,
            hệ thống sẽ tự động kích hoạt workshop và mở form đăng ký cho học viên.
          </p>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Thời gian công bố:
            </label>
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
              className="w-full"
              value={selectedScheduleDate}
              onChange={(date) => setSelectedScheduleDate(date)}
              disabledDate={(current) => current && current.isBefore(dayjs().startOf('day'))}
              placeholder="Chọn ngày và giờ"
              size="large"
            />
          </div>

          {selectedScheduleDate && selectedScheduleDate.isAfter(dayjs()) && (
            <div className="mt-3 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Khoảng thời gian còn lại: </span>
              <span className="font-mono font-bold tabular-nums">
                {calculateTimeRemaining(selectedScheduleDate.toISOString()).formatted}
              </span>
            </div>
          )}
        </div>
      </AdaptiveModal>
    </div>
  );
}
