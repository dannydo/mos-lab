'use client';

import { Button, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Calendar, CheckCircle2, Eye, Package, Sparkles, User, XCircle } from 'lucide-react';
import { maskPhoneNumber, type BkDoneLeaderboardEntry } from '@mos-lab/shared';
import { CopyPhoneButton, StatusTag, TableIndexHeader } from '~/components/ui';
import BkAvatar from '../BkAvatar';
import {
  BK_DONE_LEADERBOARD_LABELS,
  formatBkDoneCurrency,
  formatStoreCode,
  resolveBkDoneRecordStatus,
  type BkDoneDetailRow,
} from './bkDoneUtils';

interface BuildBkDoneLeaderboardColumnsParams {
  selectedBookerId: string | null;
  onSelectBooker: (bookerId: string, bookerName?: string) => void;
}

/** Builds column definitions for the BK Done leaderboard table. */
export function buildBkDoneLeaderboardColumns({
  selectedBookerId,
  onSelectBooker,
}: BuildBkDoneLeaderboardColumnsParams): ColumnsType<BkDoneLeaderboardEntry> {
  return [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      align: 'center' as const,
      render: (rank: number) => {
        if (rank === 1) return <span className="text-lg leading-none">🥇</span>;
        if (rank === 2) return <span className="text-lg leading-none">🥈</span>;
        if (rank === 3) return <span className="text-lg leading-none">🥉</span>;
        return <span className="tabular-nums font-semibold text-slate-500 text-xs">#{rank}</span>;
      },
    },
    {
      title: BK_DONE_LEADERBOARD_LABELS.booker,
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name: string, record: BkDoneLeaderboardEntry) => {
        const isSelected = selectedBookerId === String(record.bookerId);
        return (
          <Space
            className="cursor-pointer group whitespace-nowrap"
            size={8}
            onClick={(e) => {
              e.stopPropagation();
              onSelectBooker(String(record.bookerId), name);
            }}
          >
            <BkAvatar name={name} src={record.avatar} size={32} />
            <div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span
                  className={`font-semibold text-xs transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'text-amber-400 underline underline-offset-2'
                      : 'text-slate-900 dark:text-slate-100 hover:text-amber-400'
                  }`}
                >
                  {name}
                </span>
                <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                  · {formatStoreCode(record.store)}
                </span>
                {isSelected && (
                  <StatusTag
                    status="gold"
                    label="Đang lọc"
                    icon={<CheckCircle2 className="w-3 h-3" />}
                    className="py-0.5 px-1.5 text-[10px] whitespace-nowrap"
                  />
                )}
              </div>
            </div>
          </Space>
        );
      },
    },
    {
      title: (
        <Tooltip title="Tổng Done = Khách Lẻ + Khách Combo Live (Tính Thưởng Hạng Milestone & xếp hạng Leaderboard)">
          <span className="cursor-help font-semibold text-xs">{BK_DONE_LEADERBOARD_LABELS.done}</span>
        </Tooltip>
      ),
      dataIndex: 'doneCount',
      key: 'doneCount',
      align: 'center' as const,
      sorter: (a: BkDoneLeaderboardEntry, b: BkDoneLeaderboardEntry) =>
        (a.singleDoneCount ?? 0) +
        (a.comboLiveDoneCount ?? 0) -
        ((b.singleDoneCount ?? 0) + (b.comboLiveDoneCount ?? 0)),
      render: (_: number, record: BkDoneLeaderboardEntry) => {
        const single = record.singleDoneCount ?? record.doneCount;
        const combo = record.comboLiveDoneCount ?? 0;
        const total = single + combo;
        return (
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <Tooltip
              title={`Khách Lẻ Done: ${single} lượt. Tổng Done (Lẻ + Combo) = ${total} lượt (xét thưởng Hạng Milestone)`}
            >
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 tabular-nums">
                <span className="text-[10px] uppercase font-semibold opacity-75">Lẻ</span>
                {single}
              </span>
            </Tooltip>
            {combo > 0 && (
              <Tooltip
                title={`Combo Live: +${combo} lượt khách dùng gói (+1.000đ/lượt chăm sóc). Tổng Done = ${total}`}
              >
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 tabular-nums">
                  <span className="text-[9px] uppercase font-semibold opacity-75">Combo</span>+{combo}
                </span>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: (
        <Tooltip title="Số khách mới lần đầu hoàn tất dịch vụ trên toàn hệ thống Wings (hoàn tất Check-in & Check-out, ghi nhận theo tháng Check-out)">
          <span className="cursor-help font-semibold text-xs">{BK_DONE_LEADERBOARD_LABELS.newCustomerDone}</span>
        </Tooltip>
      ),
      dataIndex: 'newCustomerDoneCount',
      key: 'newCustomerDoneCount',
      align: 'center' as const,
      sorter: (a: BkDoneLeaderboardEntry, b: BkDoneLeaderboardEntry) =>
        (a.newCustomerDoneCount ?? 0) - (b.newCustomerDoneCount ?? 0),
      render: (count = 0) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 tabular-nums">
          {count}
        </span>
      ),
    },
    {
      title: (
        <Tooltip title="Tỷ lệ khách mới (%): Done khách mới / Tổng Done × 100%. Nếu Tổng Done = 0, hiển thị 0%.">
          <span className="cursor-help font-semibold text-xs">{BK_DONE_LEADERBOARD_LABELS.newCustomerRate}</span>
        </Tooltip>
      ),
      dataIndex: 'newCustomerRatePercent',
      key: 'newCustomerRatePercent',
      align: 'center' as const,
      sorter: (a: BkDoneLeaderboardEntry, b: BkDoneLeaderboardEntry) =>
        (a.newCustomerRatePercent ?? 0) - (b.newCustomerRatePercent ?? 0),
      render: (rate = 0) => (
        <span className="tabular-nums font-semibold text-xs text-rose-500 dark:text-rose-400">{rate}%</span>
      ),
    },
    {
      title: (
        <Tooltip title="Số lượng gói Combo bán mới và tỷ lệ chuyển đổi từ Single sang Combo">
          <span className="cursor-help font-semibold text-xs">Bán Combo</span>
        </Tooltip>
      ),
      key: 'comboSold',
      align: 'center' as const,
      render: (_: SafeAny, record: BkDoneLeaderboardEntry) => {
        const sold = record.comboSoldCount ?? 0;
        const rev = record.comboRevenue ?? 0;
        const rate = record.singleToComboRate ?? 0;
        if (sold === 0) return <span className="text-slate-500 text-xs">-</span>;
        return (
          <Tooltip
            title={`Bán ${sold} gói combo (${formatBkDoneCurrency(rev)}). Tỷ lệ chuyển đổi Single ➔ Combo: ${rate}%`}
          >
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 tabular-nums cursor-help">
              <Sparkles className="w-3 h-3 inline text-purple-400" />
              <span>{sold} gói</span>
              <span className="text-[10px] opacity-80">({rate}%)</span>
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: BK_DONE_LEADERBOARD_LABELS.missed,
      dataIndex: 'missedCount',
      key: 'missedCount',
      align: 'center' as const,
      render: (val: number, record: BkDoneLeaderboardEntry) => (
        <span
          className="tabular-nums font-semibold text-xs text-rose-400"
          title="Số lượng khách Missed của Booker trong kỳ (đối soát tỷ lệ phạt)"
        >
          {val} <span className="text-[11px] font-normal opacity-90">({record.missedRatePercent || 0}%)</span>
        </span>
      ),
    },
    {
      title: BK_DONE_LEADERBOARD_LABELS.doneBonus,
      dataIndex: 'basicBonus',
      key: 'basicBonus',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-xs text-emerald-400">{formatBkDoneCurrency(val)}</span>
      ),
    },
    {
      title: BK_DONE_LEADERBOARD_LABELS.rankBonus,
      dataIndex: 'milestoneBonus',
      key: 'milestoneBonus',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-xs text-blue-400">
          {val > 0 ? `+${formatBkDoneCurrency(val)}` : '-'}
        </span>
      ),
    },
    {
      title: BK_DONE_LEADERBOARD_LABELS.missedBonus,
      dataIndex: 'penaltyBonus',
      key: 'penaltyBonus',
      align: 'right' as const,
      render: (val: number, record: BkDoneLeaderboardEntry) => {
        const totalDone = (record.singleDoneCount ?? 0) + (record.comboLiveDoneCount ?? 0);
        const effectiveDone = totalDone > 0 ? totalDone : record.doneCount;
        if (effectiveDone < 100) {
          return (
            <Tooltip
              title={`Chưa đạt mốc tối thiểu 100 khách Done (Lẻ + Combo = ${effectiveDone}) trong kỳ, không tính thưởng/phạt Missed`}
            >
              <span className="tabular-nums font-semibold text-xs text-slate-400 dark:text-slate-500">-</span>
            </Tooltip>
          );
        }
        return (
          <span className={`tabular-nums font-semibold text-xs ${val >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {val > 0 ? `+${formatBkDoneCurrency(val)}` : val < 0 ? formatBkDoneCurrency(val) : '-'}
          </span>
        );
      },
    },
    {
      title: BK_DONE_LEADERBOARD_LABELS.totalDoneBonus,
      dataIndex: 'totalDoneBonus',
      key: 'totalDoneBonus',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-sm text-emerald-400">{formatBkDoneCurrency(val)}</span>
      ),
    },
    {
      title: 'Chi tiết',
      key: 'action',
      align: 'center' as const,
      render: (_: SafeAny, record: BkDoneLeaderboardEntry) => {
        const isSelected = selectedBookerId === String(record.bookerId);
        return (
          <Button
            type="default"
            size="small"
            icon={<Eye className="w-3.5 h-3.5 text-amber-400" />}
            className="text-[11px] font-medium border-slate-700 hover:border-amber-400 hover:text-amber-400 px-2"
            onClick={(e) => {
              e.stopPropagation();
              onSelectBooker(String(record.bookerId), record.displayName);
            }}
          >
            {isSelected ? 'Bỏ lọc' : 'Chi tiết'}
          </Button>
        );
      },
    },
  ];
}

interface BuildBkDoneDetailColumnsParams {
  currentPage: number;
  pageSize: number;
  isMaskedRole: boolean;
  onOpenCustomer: (customerId: number) => void;
}

/** Builds column definitions for the BK Done customer order details table. */
export function buildBkDoneDetailColumns({
  currentPage,
  pageSize,
  isMaskedRole,
  onOpenCustomer,
}: BuildBkDoneDetailColumnsParams): ColumnsType<BkDoneDetailRow> {
  return [
    {
      title: <TableIndexHeader />,
      key: 'stt',
      width: 55,
      align: 'center' as const,
      render: (_: SafeAny, __: BkDoneDetailRow, index: number) => (
        <span className="tabular-nums font-semibold text-xs text-slate-500 dark:text-slate-400">
          {(currentPage - 1) * pageSize + index + 1}
        </span>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'client',
      render: (record: BkDoneDetailRow) => (
        <div
          className="cursor-pointer group whitespace-nowrap"
          role="button"
          tabIndex={0}
          aria-label={`Xem chi tiết khách hàng ${record.clientName || 'Khách hàng'}`}
          onClick={(e) => {
            e.stopPropagation();
            if (record.customerId) {
              onOpenCustomer(record.customerId);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              e.preventDefault();
              if (record.customerId) {
                onOpenCustomer(record.customerId);
              }
            }
          }}
        >
          <div className="flex items-center gap-2">
            <BkAvatar name={record.clientName || 'Khách hàng'} src={record.clientAvatar} size={28} />
            <div className="min-w-0">
              <div className="font-semibold text-xs text-sky-400 group-hover:text-amber-400 transition-colors flex items-center gap-1 whitespace-nowrap">
                <span>{record.clientName || 'Khách hàng'}</span>
                <User className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-amber-400 transition-opacity shrink-0" />
              </div>
              <div className="text-[10px] text-slate-400 tabular-nums whitespace-nowrap flex items-center gap-1">
                <span>{isMaskedRole ? maskPhoneNumber(record.clientPhone) : record.clientPhone || 'Chưa có SĐT'}</span>
                {!isMaskedRole && record.clientPhone && <CopyPhoneButton phone={record.clientPhone} size="xs" />}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Booker',
      dataIndex: 'bookerName',
      key: 'bookerName',
      render: (bName: string, record: BkDoneDetailRow) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <BkAvatar name={bName || 'Booker'} src={record.bookerAvatar} size={28} />
          <span className="font-medium text-xs text-slate-600 dark:text-slate-300">{bName || '-'}</span>
        </div>
      ),
    },
    {
      title: 'Ngày hẹn',
      dataIndex: 'orderDate',
      key: 'orderDate',
      render: (dateStr: string) => (
        <span className="tabular-nums text-xs text-slate-400 font-medium whitespace-nowrap">
          {dateStr ? dateStr.replace('T', ' ').substring(0, 16) : '-'}
        </span>
      ),
    },
    {
      title: 'Dịch vụ chính & Phân loại',
      key: 'service',
      render: (record: BkDoneDetailRow) => (
        <div>
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {record.isNewCustomer && (
              <span className="inline-flex items-center gap-1 rounded border border-pink-500/30 bg-pink-500/10 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-pink-600 dark:text-pink-300">
                <User className="w-2.5 h-2.5 shrink-0" />
                <span>Khách Mới</span>
              </span>
            )}
            {record.isComboLive ? (
              <StatusTag
                status="cyan"
                label="Combo Live"
                icon={<Package className="w-2.5 h-2.5" />}
                className="text-[10px] py-0.5 px-1.5 rounded"
              />
            ) : record.isSingle ? (
              <StatusTag
                status="success"
                label="Khách Lẻ"
                icon={<CheckCircle2 className="w-2.5 h-2.5" />}
                className="text-[10px] py-0.5 px-1.5 rounded"
              />
            ) : null}
            {record.isComboSold && (
              <StatusTag
                status="purple"
                label="Bán Combo"
                icon={<Sparkles className="w-2.5 h-2.5" />}
                className="text-[10px] py-0.5 px-1.5 rounded"
              />
            )}
          </div>
          <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {record.serviceName || 'Không có thông tin'}
          </div>
          {record.isComboLive ? (
            <div className="text-[10px] font-medium text-cyan-500 whitespace-nowrap">Combo Live (+1.000đ)</div>
          ) : (record.servicePrice || 0) > 0 ? (
            <div className="text-[10px] text-slate-400 tabular-nums">
              Giá: {formatBkDoneCurrency(record.servicePrice || 0)} | Giảm: {record.discountPercent || 0}%
            </div>
          ) : null}
          {record.comboName && (
            <div className="text-[10px] font-medium text-purple-400 whitespace-nowrap">
              Gói combo: {record.comboName}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Doanh thu Net',
      dataIndex: 'netRevenue',
      key: 'netRevenue',
      align: 'right' as const,
      render: (val: number, record: BkDoneDetailRow) =>
        val > 0 ? (
          <div className="text-right">
            <div className="tabular-nums font-semibold text-xs text-slate-600 dark:text-slate-300">
              {formatBkDoneCurrency(val)}
            </div>
            {(record.comboRevenue || 0) > 0 && (
              <div className="tabular-nums text-[10px] font-medium text-violet-400 whitespace-nowrap">
                Combo: {formatBkDoneCurrency(record.comboRevenue || 0)}
              </div>
            )}
          </div>
        ) : (
          <span className="text-slate-500 text-xs">-</span>
        ),
    },
    {
      title: 'Tiền tips',
      dataIndex: 'tipAmount',
      key: 'tipAmount',
      align: 'right' as const,
      render: (val: number) =>
        val > 0 ? (
          <span className="tabular-nums font-semibold text-xs text-amber-400">{formatBkDoneCurrency(val)}</span>
        ) : (
          <span className="text-slate-500 text-xs">-</span>
        ),
    },
    {
      title: 'Bonus Done',
      dataIndex: 'totalDoneBonus',
      key: 'totalDoneBonus',
      align: 'right' as const,
      render: (val: number) =>
        val > 0 ? (
          <span className="tabular-nums font-bold text-xs text-emerald-400">+{formatBkDoneCurrency(val)}</span>
        ) : (
          <span className="text-slate-500 text-xs">-</span>
        ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      align: 'center' as const,
      render: (_: SafeAny, record: BkDoneDetailRow) => {
        const { kind, statusType, label } = resolveBkDoneRecordStatus(record);
        const statusIcon =
          kind === 'done' ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : kind === 'future' ? (
            <Calendar className="w-3 h-3" />
          ) : (
            <XCircle className="w-3 h-3" />
          );

        return (
          <StatusTag
            status={statusType}
            label={label}
            icon={statusIcon}
            className="font-semibold text-xs py-0.5 px-2 rounded-full whitespace-nowrap"
          />
        );
      },
    },
  ];
}
