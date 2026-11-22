'use client';

import { Button, Space, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Crown, Eye, Info } from 'lucide-react';
import type { CcDiamondEntry } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';
import CcAvatar from '../CcAvatar';
import { formatDiamondCurrency, getReferralRatio, isDiamondQualified } from './cc-diamond-utils';

const { Text } = Typography;

export interface BuildCcDiamondColumnsParams {
  isPastPeriod: boolean;
  isDayMode: boolean;
  ratio: number;
  periodNoun: string;
  onOpenDetail: (record: CcDiamondEntry) => void;
}

export function buildCcDiamondColumns({
  isPastPeriod,
  isDayMode,
  ratio,
  periodNoun,
  onOpenDetail,
}: BuildCcDiamondColumnsParams): ColumnsType<CcDiamondEntry> {
  const showForecast = !isPastPeriod && !isDayMode && ratio > 0 && ratio < 1;

  return [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 70,
      align: 'center' as const,
      render: (rank: number) => {
        if (rank === 1) return <AppIcon icon={Crown} size={20} className="text-amber-500 mx-auto" />;
        if (rank === 2) return <StatusTag status="gold" label="#2" />;
        if (rank === 3) return <StatusTag status="processing" label="#3" />;
        return <Text className="tabular-nums font-semibold text-slate-500">{rank}</Text>;
      },
    },
    {
      title: 'Tư Vấn Viên (CC)',
      dataIndex: 'tenCc',
      key: 'tenCc',
      width: 180,
      render: (text: string, record: CcDiamondEntry) => (
        <Space size={8} className="whitespace-nowrap">
          <CcAvatar name={text} src={record.avatar} size={32} />
          <div className="min-w-0">
            <Text className="font-semibold text-slate-800 dark:text-slate-200">{text}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: (
        <div className="flex items-center justify-end gap-1">
          <span>∑ Khách Đã Tiếp</span>
          <Tooltip title="Tổng số lượt khách tư vấn viên tiếp đón trong tháng = (Check-in + Check-out) / 2">
            <span className="inline-flex cursor-help">
              <AppIcon icon={Info} size={13} className="text-slate-400" />
            </span>
          </Tooltip>
        </div>
      ),
      dataIndex: 'tongKhach',
      key: 'tongKhach',
      width: 150,
      align: 'right' as const,
      sorter: (a, b) => a.tongKhach - b.tongKhach,
      render: (val: number) => (
        <div className="w-full text-right whitespace-nowrap">
          <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-300">
            {val.toLocaleString('vi-VN')}
          </span>
          {showForecast ? (
            <div
              className="tabular-nums text-[10px] text-slate-400 font-medium mt-0.5"
              title={`Dự kiến cả ${periodNoun}`}
            >
              🔮 ~{Math.round(val / ratio).toLocaleString('vi-VN')}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: (
        <div className="flex items-center justify-end gap-1">
          <span>Số Khách Giới Thiệu (💎)</span>
          <Tooltip title="Số khách hàng mới đăng ký giới thiệu qua tư vấn viên này">
            <span className="inline-flex cursor-help">
              <AppIcon icon={Info} size={13} className="text-slate-400" />
            </span>
          </Tooltip>
        </div>
      ),
      dataIndex: 'soKhachDiamond',
      key: 'soKhachDiamond',
      width: 185,
      align: 'right' as const,
      sorter: (a, b) => a.soKhachDiamond - b.soKhachDiamond,
      render: (val: number) => (
        <div className="w-full text-right whitespace-nowrap">
          <StatusTag
            status={val > 0 ? 'cyan' : 'default'}
            label={`💎 ${val} khách`}
            className="tabular-nums px-3 py-1 font-bold text-sm rounded-lg"
          />
          {showForecast ? (
            <div
              className="tabular-nums text-[10px] text-slate-400 font-medium mt-0.5"
              title={`Dự kiến cả ${periodNoun}`}
            >
              🔮 ~{Math.round(val / ratio)} khách
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: (
        <div className="flex items-center justify-end gap-1">
          <span>Tỷ Lệ Giới Thiệu</span>
          <Tooltip title="Tỷ lệ = (Số Khách Giới Thiệu / Tổng Khách Đã Tiếp) × 100%. Yêu cầu đạt từ ≥ 3.0% trở lên để nhận thưởng.">
            <span className="inline-flex cursor-help">
              <AppIcon icon={Info} size={13} className="text-slate-400" />
            </span>
          </Tooltip>
        </div>
      ),
      dataIndex: 'tyLeGioiThieu',
      key: 'tyLeGioiThieu',
      width: 165,
      align: 'right' as const,
      sorter: (a, b) => (a.tyLeGioiThieu || 0) - (b.tyLeGioiThieu || 0),
      render: (_val: number, record: CcDiamondEntry) => {
        const referralRatio = getReferralRatio(record);
        const isQualified = isDiamondQualified(record, referralRatio);
        const hasReferrals = record.soKhachDiamond > 0;

        if (isQualified && hasReferrals) {
          return (
            <StatusTag
              status="success"
              label={`✓ ${referralRatio}% (Đạt)`}
              className="tabular-nums px-2.5 py-0.5 font-bold text-xs rounded-md border-emerald-300"
            />
          );
        }

        if (!isQualified && hasReferrals) {
          return (
            <Tooltip title={`Chưa đạt điều kiện tối thiểu ≥ 3.0% (hiện tại: ${referralRatio}%)`}>
              <span className="inline-flex cursor-help">
                <StatusTag
                  status="error"
                  label={`⚠️ ${referralRatio}% (<3%)`}
                  className="tabular-nums px-2.5 py-0.5 font-bold text-xs rounded-md border-rose-300"
                />
              </span>
            </Tooltip>
          );
        }

        return (
          <StatusTag
            status="default"
            label={`${referralRatio}%`}
            className="tabular-nums px-2.5 py-0.5 font-normal text-xs rounded-md"
          />
        );
      },
    },
    {
      title: 'Thưởng Kim Cương (VND)',
      dataIndex: 'thuongDiamond',
      key: 'thuongDiamond',
      width: 185,
      align: 'right' as const,
      sorter: (a, b) => a.thuongDiamond - b.thuongDiamond,
      render: (val: number, record: CcDiamondEntry) => {
        if (val > 0) {
          return (
            <div className="w-full text-right whitespace-nowrap">
              <span className="tabular-nums font-bold text-base text-emerald-600 dark:text-emerald-400">
                +{formatDiamondCurrency(val)}
              </span>
              {showForecast ? (
                <div
                  className="tabular-nums text-[10px] text-emerald-400/80 font-medium mt-0.5"
                  title={`Dự kiến cả ${periodNoun}`}
                >
                  🔮 ~{formatDiamondCurrency(Math.round(val / ratio))}
                </div>
              ) : null}
            </div>
          );
        }

        if (record.potentialThuong && record.potentialThuong > 0) {
          return (
            <div className="text-right whitespace-nowrap">
              <span className="tabular-nums font-bold text-slate-400 text-sm">0 đ</span>
              <div className="text-[11px] text-rose-500 dark:text-rose-400 font-medium tabular-nums">
                (Cần ≥3% để nhận {formatDiamondCurrency(record.potentialThuong)})
              </div>
              {showForecast ? (
                <div
                  className="tabular-nums text-[10px] text-slate-400 font-medium mt-0.5"
                  title={`Dự kiến nếu đạt cả ${periodNoun}`}
                >
                  🔮 ~{formatDiamondCurrency(Math.round(record.potentialThuong / ratio))}
                </div>
              ) : null}
            </div>
          );
        }

        return <span className="tabular-nums font-semibold text-slate-400 whitespace-nowrap">0 đ</span>;
      },
    },
    {
      title: 'Chi Tiết',
      key: 'action',
      align: 'center' as const,
      width: 115,
      render: (_: unknown, record: CcDiamondEntry) => (
        <Button
          size="small"
          type="text"
          icon={<AppIcon icon={Eye} size={14} className="text-cyan-600 dark:text-cyan-400" />}
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail(record);
          }}
          className="text-cyan-600 dark:text-cyan-400 font-medium hover:bg-cyan-50 dark:hover:bg-cyan-950/40 rounded-lg"
        >
          Xem cặp
        </Button>
      ),
    },
  ];
}
