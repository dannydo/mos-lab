'use client';

import React from 'react';
import { Button, Popconfirm, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AlertTriangle,
  Camera,
  CheckCircle,
  Clock,
  Edit,
  HeartHandshake,
  Image as ImageIcon,
  Phone,
  Sparkles,
  Star,
  Trash2,
  User,
} from 'lucide-react';
import dayjs from 'dayjs';
import type {
  DarkLashesSessionStatus,
  PilotFollowUpStatus,
  PilotSession,
} from '@mos-lab/shared';
import { resolveMediaUrl } from '../../../../lib/api-client';
import { AppIcon } from '../../../../components/ui/AppIcon';
import { CopyPhoneButton } from '../../../../components/ui/CopyPhoneButton';

export function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export const OP_STATUS_CONFIG: Record<DarkLashesSessionStatus, { text: string; badge: string }> = {
  BOOKED: { text: '1. Đã đặt lịch', badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  CHECKED_IN: { text: '2. Đã đến shop', badge: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' },
  ASSESSED: { text: '3. Đã đánh giá đạt', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' },
  INELIGIBLE: { text: 'Không đủ điều kiện', badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20' },
  BEFORE_PHOTO: { text: '4. Đã chụp Before', badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  SERVICE_DONE: { text: '5. Làm xong', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
  AFTER_PHOTO: { text: '6. Đã chụp After', badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
  FEEDBACK_DONE: { text: '7. Đã feedback', badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  CHECKED_OUT: { text: '8. Đã check-out', badge: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20' },
};

export function renderFollowUpBadge(status: PilotFollowUpStatus, hours: '24h' | '72h') {
  if (status === 'DONE') {
    return (
      <span className="inline-flex items-center justify-center leading-none px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
        <AppIcon icon={CheckCircle} size="sm" className="mr-1" /> Đã gọi {hours}
      </span>
    );
  }
  if (status === 'SKIPPED') {
    return <span className="text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs">Bỏ qua</span>;
  }
  const is24 = hours === '24h';
  return (
    <span
      className={`inline-flex items-center justify-center leading-none px-2 py-1 rounded-md border text-xs font-medium ${
        is24
          ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
          : 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
      }`}
    >
      <AppIcon icon={is24 ? Clock : AlertTriangle} size="sm" className={`mr-1 ${is24 ? '' : 'text-rose-500'}`} /> Chờ gọi {hours}
    </span>
  );
}

interface CreatePilotColumnsParams {
  handleOpenFlow: (session: PilotSession) => void;
  handleOpenFollowUp: (session: PilotSession) => void;
  handleOpenEdit: (session: PilotSession) => void;
  handleDeleteSession: (id: number) => void;
}

export function createPilotColumns({
  handleOpenFlow,
  handleOpenFollowUp,
  handleOpenEdit,
  handleDeleteSession,
}: CreatePilotColumnsParams): ColumnsType<PilotSession> {
  return [
    {
      title: 'Ngày làm',
      dataIndex: 'sessionDate',
      key: 'sessionDate',
      width: 105,
      render: (val: string, r) => (
        <div className="flex flex-col">
          <span className="tabular-nums font-medium text-xs">{val ? dayjs(val).format('DD/MM/YYYY') : '--'}</span>
          {r.bookingTime && (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {r.bookingTime}
            </span>
          )}
        </div>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 170,
      render: (_, r) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-slate-800 dark:text-slate-100 text-xs">{r.customerName}</span>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <AppIcon icon={Phone} size="sm" />
            <span className="tabular-nums font-mono">{r.customerPhone}</span>
            <CopyPhoneButton phone={r.customerPhone} />
          </div>
          {r.bookingNote && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 italic truncate max-w-[150px]">
              &ldquo;{r.bookingNote}&rdquo;
            </span>
          )}
        </div>
      ),
    },
    {
      title: 'Chuyên Viên',
      dataIndex: 'technicianName',
      key: 'technicianName',
      width: 120,
      render: (val: string) => (
        <div className="flex items-center gap-1 text-xs">
          <AppIcon icon={User} size="sm" className="text-slate-400" />
          <span>{val || <span className="text-slate-400 italic">Chưa gán</span>}</span>
        </div>
      ),
    },
    {
      title: 'Tiến độ 8 bước',
      dataIndex: 'status',
      key: 'status',
      width: 175,
      render: (status: DarkLashesSessionStatus, r) => {
        const config = OP_STATUS_CONFIG[status] || {
          text: status || '1. Đã đặt lịch',
          badge: 'bg-slate-100 text-slate-600 border-slate-200',
        };
        const isIneligible = status === 'INELIGIBLE' || r.assessmentStatus === 'FAIL';
        return (
          <div className="flex flex-col gap-1 items-start">
            <span
              className={`inline-flex items-center justify-center leading-none text-xs px-2 py-1 rounded-md border font-medium ${
                isIneligible ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20' : config.badge
              }`}
            >
              {isIneligible ? 'Không đủ điều kiện' : config.text}
            </span>
            <Button
              size="small"
              type="primary"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg h-7 px-2.5 flex items-center gap-1 shadow-xs"
              onClick={() => handleOpenFlow(r)}
            >
              <AppIcon icon={Camera} size="sm" />
              <span>Vận hành ca</span>
            </Button>
          </div>
        );
      },
    },
    {
      title: 'Ảnh ca',
      key: 'photos',
      width: 140,
      render: (_, r) => {
        if (!r.beforePhotoUrl && !r.afterPhotoUrl) return <span className="text-slate-400 text-xs">Chưa có ảnh</span>;
        return (
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => handleOpenFlow(r)}>
            {r.beforePhotoUrl ? (
              <Tooltip title="Xem ảnh Before">
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 shrink-0">
                  <img src={resolveMediaUrl(r.beforePhotoUrl)} alt="Before" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                </div>
              </Tooltip>
            ) : (
              <div className="w-10 h-10 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                <AppIcon icon={ImageIcon} size="sm" />
              </div>
            )}
            {r.afterPhotoUrl ? (
              <Tooltip title="Xem ảnh After">
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-emerald-500/40 bg-slate-900 shrink-0">
                  <img src={resolveMediaUrl(r.afterPhotoUrl)} alt="After" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                </div>
              </Tooltip>
            ) : (
              <div className="w-10 h-10 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                <span className="text-[10px] text-slate-400">After</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Thời gian',
      dataIndex: 'totalDurationMinutes',
      key: 'totalDurationMinutes',
      width: 95,
      render: (val: number | null) => (
        <span className="tabular-nums text-xs font-medium">
          {val ? `${val} phút` : <span className="text-slate-400 italic">--</span>}
        </span>
      ),
    },
    {
      title: 'Đánh giá AI',
      dataIndex: 'aiAssessment',
      key: 'aiAssessment',
      width: 145,
      render: (val, r) => {
        if (!val) {
          return (
            <button
              type="button"
              onClick={() => handleOpenFlow(r)}
              className="inline-flex items-center gap-1 text-[11px] text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
            >
              <AppIcon icon={Sparkles} size={12} />
              <span>Chưa phân tích</span>
            </button>
          );
        }
        const badgeColors: Record<string, string> = {
          PASS: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          CAUTION: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          NOT_SUITABLE: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        };
        const badgeLabels: Record<string, string> = {
          PASS: 'Đủ chuẩn',
          CAUTION: 'Cần cẩn trọng',
          NOT_SUITABLE: 'Không phù hợp',
        };
        const badgeClass = badgeColors[val.suitability] || badgeColors.PASS;
        const badgeLabel = badgeLabels[val.suitability] || val.suitability;
        return (
          <div className="flex flex-col gap-0.5 items-start">
            <span className={`inline-flex items-center leading-none text-[10.5px] px-1.5 py-0.5 rounded border font-semibold ${badgeClass}`}>
              <AppIcon icon={Sparkles} size={11} className="mr-1" />
              {badgeLabel}
            </span>
            {val.recommendation?.recommendedRodSize && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Trục: <strong>{val.recommendation.recommendedRodSize}</strong>
                {val.recommendation.solution1DurationMinutes && (
                  <span> · Ủ: {val.recommendation.solution1DurationMinutes}p</span>
                )}
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: 'Doanh thu',
      dataIndex: 'revenue',
      key: 'revenue',
      width: 105,
      render: (val: number) => <span className="tabular-nums font-semibold text-xs">{formatVND(val)}</span>,
    },
    {
      title: 'Vật tư',
      dataIndex: 'materialCost',
      key: 'materialCost',
      width: 95,
      render: (val: number) => (
        <span className="tabular-nums text-xs text-slate-600 dark:text-slate-400">{formatVND(val)}</span>
      ),
    },
    {
      title: 'Lợi nhuận',
      dataIndex: 'contributionMargin',
      key: 'contributionMargin',
      width: 110,
      render: (val: number) => (
        <span
          className={`tabular-nums font-bold text-xs ${
            val > 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : val < 0
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-500'
          }`}
        >
          {formatVND(val)}
        </span>
      ),
    },
    {
      title: 'Đánh giá',
      key: 'feedback',
      width: 120,
      render: (_, r) => {
        const rating = r.feedbackRating || r.csatScore;
        if (!rating && !r.feedbackNote) return <span className="text-slate-400 text-xs">Chưa có</span>;
        return (
          <div className="flex flex-col">
            {rating ? (
              <div className="flex items-center gap-0.5 text-amber-500 text-xs font-semibold">
                <AppIcon icon={Star} size="sm" className="fill-amber-400 text-amber-400" />
                <span className="tabular-nums">{rating}/5</span>
              </div>
            ) : null}
            {r.feedbackNote && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[110px]" title={r.feedbackNote}>
                &ldquo;{r.feedbackNote}&rdquo;
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: 'Follow-up 24h',
      dataIndex: 'followUp24hStatus',
      key: 'followUp24hStatus',
      width: 120,
      render: (status: PilotFollowUpStatus) => renderFollowUpBadge(status, '24h'),
    },
    {
      title: 'Follow-up 72h',
      dataIndex: 'followUp72hStatus',
      key: 'followUp72hStatus',
      width: 120,
      render: (status: PilotFollowUpStatus) => renderFollowUpBadge(status, '72h'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_, r) => (
        <div className="flex items-center gap-1">
          <Tooltip title="Mở Flow Vận Hành 7 Bước (Chụp ảnh, Feedback, Check-out)">
            <Button
              type="text"
              size="small"
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              icon={<AppIcon icon={Camera} size="sm" />}
              onClick={() => handleOpenFlow(r)}
            />
          </Tooltip>
          <Tooltip title="Chăm sóc & Đánh giá CSAT">
            <Button
              type="text"
              size="small"
              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              icon={<AppIcon icon={HeartHandshake} size="sm" />}
              onClick={() => handleOpenFollowUp(r)}
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa ca">
            <Button
              type="text"
              size="small"
              className="text-slate-600 hover:text-slate-900 dark:text-slate-300"
              icon={<AppIcon icon={Edit} size="sm" />}
              onClick={() => handleOpenEdit(r)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa ca pilot này?"
            description="Bạn có chắc chắn muốn xóa bản ghi ca dịch vụ này không?"
            onConfirm={() => handleDeleteSession(r.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger icon={<AppIcon icon={Trash2} size="sm" />} />
          </Popconfirm>
        </div>
      ),
    },
  ];
}
