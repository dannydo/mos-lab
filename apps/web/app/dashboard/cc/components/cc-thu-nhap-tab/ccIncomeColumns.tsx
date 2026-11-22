'use client';

import React from 'react';
import { Button, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Eye } from 'lucide-react';
import type { CcPaystubRecord } from '@mos-lab/shared';
import { CvFeather1Badge } from '~/app/ios-app/components/ui-kit/CvFeatherLabels';
import { AppIcon } from '~/components/ui';
import { formatCompactVND, formatStoreCode, formatVND } from '~/lib/format-utils';
import CcAvatar from '../CcAvatar';
import { CcIncomeClickableCell } from './CcIncomeClickableCell';
import { ProjectedCcIncomeRecord, formatCcRankBadge, formatHoursToHoursMinutes } from './cc-thu-nhap-utils';

export interface BuildCcIncomeColumnsParams {
  isDayMode: boolean;
  isPastPeriod: boolean;
  periodNoun: string;
  getProjectedRecord: (record: CcPaystubRecord) => ProjectedCcIncomeRecord;
  onOpenDetailModal: (record: CcPaystubRecord) => void;
  onOpenWorkLogModal: (record: CcPaystubRecord) => void;
  onOpenCcXoayModal: (record: CcPaystubRecord) => void;
  onOpenComboModal: (record: CcPaystubRecord) => void;
  onOpenTipModal: (record: CcPaystubRecord) => void;
  onOpenDiamondModal: (record: CcPaystubRecord) => void;
}

export function buildCcIncomeColumns({
  isDayMode,
  isPastPeriod,
  periodNoun,
  getProjectedRecord,
  onOpenDetailModal,
  onOpenWorkLogModal,
  onOpenCcXoayModal,
  onOpenComboModal,
  onOpenTipModal,
  onOpenDiamondModal,
}: BuildCcIncomeColumnsParams): ColumnsType<CcPaystubRecord> {
  const showForecast = !isDayMode && !isPastPeriod;

  return [
    {
      title: 'Hạng / CC',
      dataIndex: 'displayName',
      key: 'displayName',
      width: 240,
      render: (name: string, record: CcPaystubRecord, index: number) => (
        <Space
          className="group cursor-pointer"
          role="button"
          tabIndex={0}
          aria-label={`Xem chi tiết thu nhập của tư vấn viên ${name}`}
          onClick={() => onOpenDetailModal(record)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenDetailModal(record);
            }
          }}
        >
          <span className="tabular-nums font-bold text-xs w-6 text-center">{formatCcRankBadge(index)}</span>
          <CcAvatar name={name} src={record.avatar} size={32} />
          <div className="min-w-0">
            <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{name}</div>
            <span className="block text-[11px] leading-4 text-slate-500 dark:text-slate-400">
              {formatStoreCode(record.store)}
            </span>
          </div>
        </Space>
      ),
    },
    {
      title: 'Lương Giờ',
      dataIndex: 'hourlyWage',
      key: 'hourlyWage',
      align: 'right' as const,
      render: (val: number, record: CcPaystubRecord) => {
        const rate = record.hourlyRate || 25000;
        const proj = getProjectedRecord(record);
        return (
          <CcIncomeClickableCell
            tone="blue"
            tooltipTitle={`Click để xem Báo cáo Chi Tiết Ca Làm Việc IN/OUT (${formatHoursToHoursMinutes(record.totalWorkHours)} @ ${rate.toLocaleString('vi-VN')}đ/h)`}
            ariaLabel={`Xem báo cáo chi tiết ca làm việc IN/OUT của ${record.displayName}`}
            formattedValue={`+${formatVND(val)}`}
            projectedValue={proj.projectedHourlyWage}
            showForecast={showForecast}
            periodNoun={periodNoun}
            subLabel={`(${formatHoursToHoursMinutes(record.totalWorkHours, true)} @ ${Math.round(rate / 1000)}k/h)`}
            onClick={() => onOpenWorkLogModal(record)}
          />
        );
      },
    },
    {
      title: 'Thưởng CC Xoay',
      dataIndex: 'ccXoayBonus',
      key: 'ccXoayBonus',
      align: 'right' as const,
      render: (val: number, record: CcPaystubRecord) => {
        const proj = getProjectedRecord(record);
        const holdBonus = record.ccXoayHoldBonus || 0;
        const tooltipTitle =
          holdBonus > 0
            ? `Thưởng gốc ${formatVND(record.rawCcXoayBonus || 0)}đ · nhận ${formatVND(val)}đ · on hold ${formatVND(holdBonus)}đ (cap 150% Daily Bonus)`
            : `Click để xem Chi Tiết Ca Check-in Xoay (${record.checkinCount} lượt check-in)`;

        return (
          <CcIncomeClickableCell
            tone="purple"
            tooltipTitle={tooltipTitle}
            ariaLabel={`Xem chi tiết ca Check-in Xoay của ${record.displayName}`}
            formattedValue={`+${formatVND(val)}`}
            projectedValue={proj.projectedCcXoayBonus}
            showForecast={showForecast}
            periodNoun={periodNoun}
            subLabel={holdBonus > 0 ? 'Đã cap 150%' : `(${record.checkinCount} lượt)`}
            onClick={() => onOpenCcXoayModal(record)}
          />
        );
      },
    },
    {
      title: 'Thưởng Combo & SP',
      dataIndex: 'comboProductBonus',
      key: 'comboProductBonus',
      align: 'right' as const,
      render: (val: number, record: CcPaystubRecord) => {
        const proj = getProjectedRecord(record);
        return (
          <CcIncomeClickableCell
            tone="emerald"
            tooltipTitle={`Click để xem Chi Tiết Đơn Hàng Combo & SP (${record.comboCount} combo / ${record.productCount} sản phẩm)`}
            ariaLabel={`Xem chi tiết đơn hàng Combo & SP của ${record.displayName}`}
            formattedValue={`+${formatVND(val)}`}
            projectedValue={proj.projectedComboProductBonus}
            showForecast={showForecast}
            periodNoun={periodNoun}
            subLabel={`(${record.comboCount} combo / ${record.productCount} SP)`}
            onClick={() => onOpenComboModal(record)}
          />
        );
      },
    },
    {
      title: 'Thưởng CC Tip (20%)',
      dataIndex: 'ccTipBonus',
      key: 'ccTipBonus',
      align: 'right' as const,
      render: (val: number, record: CcPaystubRecord) => {
        const proj = getProjectedRecord(record);
        return (
          <CcIncomeClickableCell
            tone="amber"
            tooltipTitle={`Click để xem Chi Tiết ${record.tippedVisitsCount || 0} ca Tip (Nhận 20% tiền tip)`}
            ariaLabel={`Xem chi tiết ca Tip của ${record.displayName}`}
            formattedValue={`+${formatVND(val)}`}
            projectedValue={proj.projectedCcTipBonus}
            showForecast={showForecast}
            periodNoun={periodNoun}
            subLabel={`(${record.tippedVisitsCount || 0} ca tip)`}
            onClick={() => onOpenTipModal(record)}
          />
        );
      },
    },
    {
      title: 'Thưởng Kim Cương',
      dataIndex: 'diamondBonus',
      key: 'diamondBonus',
      align: 'right' as const,
      render: (val: number | undefined, record: CcPaystubRecord) => {
        const proj = getProjectedRecord(record);
        return (
          <CcIncomeClickableCell
            tone="cyan"
            tooltipTitle={`Click để xem Chi Tiết ${record.diamondCount || 0} Khách Hàng Giới Thiệu (Thưởng 35k/khách)`}
            ariaLabel={`Xem chi tiết khách Kim Cương của ${record.displayName}`}
            formattedValue={`+${formatVND(val || 0)}`}
            projectedValue={proj.projectedDiamondBonus}
            showForecast={showForecast}
            periodNoun={periodNoun}
            subLabel={`(${record.diamondCount || 0} khách 💎)`}
            onClick={() => onOpenDiamondModal(record)}
          />
        );
      },
    },
    {
      title: 'Thưởng Nóng Minigame',
      dataIndex: 'minigameBonus',
      key: 'minigameBonus',
      align: 'right' as const,
      render: (val: number, record: CcPaystubRecord) => {
        const proj = getProjectedRecord(record);
        return (
          <div className="text-right">
            <span className="tabular-nums whitespace-nowrap font-bold text-sm text-amber-600 dark:text-amber-400">
              +{formatVND(val)}
            </span>
            {showForecast && proj.projectedMinigameBonus > 0 && (
              <div className="flex items-center justify-end gap-1 text-[11px] text-amber-500/90 font-medium tabular-nums mt-0.5">
                <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                  🔮
                </span>
                <span>~{formatCompactVND(proj.projectedMinigameBonus)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: (
        <span className="inline-flex items-center justify-end gap-1">
          <span>Đào Tạo</span>
          <CvFeather1Badge className="text-[11px] text-amber-500" />
        </span>
      ),
      dataIndex: 'trainingMentorshipBonus',
      key: 'trainingMentorshipBonus',
      align: 'right' as const,
      render: (val: number | undefined, record: CcPaystubRecord) => {
        const details = record.trainingMentorshipDetails || [];
        if (details.length === 0 && (!val || val <= 0)) {
          return <span className="text-slate-400 dark:text-slate-600">-</span>;
        }
        const totalMentor = val || 0;
        const menteeSummary = details
          .map((d) => `${d.menteeDisplayName} ${(d.actualComboRate * 100).toFixed(1)}%`)
          .join(', ');
        const tooltipText = details
          .map(
            (d) =>
              `${d.menteeDisplayName} (${d.combosSoldCount}/${d.notComboLiveOrders} Not Live = ${(d.actualComboRate * 100).toFixed(1)}%): ${
                d.isUnlocked
                  ? `Đạt chuẩn -> +${formatVND(d.mentorFixedEarned)}đ + ${Math.round(d.menteeBonusShareRate * 100)}% x ${formatVND(d.menteeTotalAdditionalIncome)}đ = +${formatVND(d.mentorTotalBonus)}đ`
                  : `Chưa đạt ${Math.round(d.minComboRateThreshold * 100)}% -> 0đ`
              }`
          )
          .join(' | ');

        return (
          <Tooltip title={tooltipText}>
            <div
              className="text-right cursor-pointer group hover:bg-amber-500/10 p-1.5 rounded-lg transition-colors border border-transparent hover:border-amber-500/30"
              role="button"
              tabIndex={0}
              aria-label={`Xem chi tiết thưởng đào tạo Chuyên Viên Tự Chủ của ${record.displayName}`}
              onClick={() => onOpenDetailModal(record)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenDetailModal(record);
                }
              }}
            >
              <div
                className={`tabular-nums whitespace-nowrap font-bold text-sm group-hover:underline underline-offset-2 ${
                  totalMentor > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-rose-500 dark:text-rose-400'
                }`}
              >
                {totalMentor > 0 ? `+${formatVND(totalMentor)}` : '0đ (<20%)'}
              </div>
              <div className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400 truncate max-w-[145px] ml-auto">
                {menteeSummary}
              </div>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Phụ Cấp Extra',
      dataIndex: 'extraSupport',
      key: 'extraSupport',
      align: 'right' as const,
      render: (val: number | undefined, record: CcPaystubRecord) => {
        if (!val || val <= 0) {
          return <span className="text-slate-400 dark:text-slate-600">-</span>;
        }
        return (
          <Tooltip title={record.extraSupportNote || 'Phụ cấp Extra đã duyệt trên hệ thống'}>
            <div className="text-right">
              <span className="tabular-nums whitespace-nowrap font-bold text-sm text-indigo-600 dark:text-indigo-400">
                +{formatVND(val)}
              </span>
              <div className="text-[11px] text-slate-500 truncate max-w-[120px]">
                {record.extraSupportNote || 'Đã duyệt'}
              </div>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Tổng Thu Nhập Tạm Tính',
      dataIndex: 'totalIncome',
      key: 'totalIncome',
      align: 'right' as const,
      render: (val: number, record: CcPaystubRecord) => {
        const proj = getProjectedRecord(record);
        return (
          <div className="text-right">
            <span className="tabular-nums whitespace-nowrap font-extrabold text-base text-amber-600 dark:text-amber-300">
              {formatVND(val)}
            </span>
            {showForecast && proj.projectedTotalIncome > 0 && (
              <Tooltip
                title={`Dự đoán tổng thu nhập về đích cuối ${periodNoun}: ~${formatVND(proj.projectedTotalIncome)}đ`}
              >
                <div className="flex items-center justify-end gap-1 text-xs text-emerald-400 font-semibold tabular-nums mt-0.5 cursor-help">
                  <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                    🔮
                  </span>
                  <span>~{formatCompactVND(proj.projectedTotalIncome)}</span>
                </div>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: 'Thao Tác',
      key: 'action',
      align: 'center' as const,
      width: 140,
      render: (_: unknown, record: CcPaystubRecord) => (
        <Button
          size="small"
          type="primary"
          icon={<AppIcon icon={Eye} size={14} />}
          onClick={() => onOpenDetailModal(record)}
          className="font-medium"
        >
          Chi Tiết
        </Button>
      ),
    },
  ];
}
