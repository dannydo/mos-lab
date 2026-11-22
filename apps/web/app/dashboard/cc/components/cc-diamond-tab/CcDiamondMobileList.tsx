'use client';

import React from 'react';
import { Button, Tooltip } from 'antd';
import { Crown, Eye } from 'lucide-react';
import type { CcDiamondEntry } from '@mos-lab/shared';
import { AppIcon, MobileRecordList, StandardPagination, StatusTag } from '~/components/ui';
import CcAvatar from '../CcAvatar';
import {
  formatDiamondCurrency,
  getReferralRatio,
  isDiamondQualified,
  MOBILE_DIAMOND_PAGE_SIZE,
} from './cc-diamond-utils';

interface CcDiamondMobileListProps {
  records: CcDiamondEntry[];
  totalCount: number;
  currentPage: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onOpenDetail: (record: CcDiamondEntry) => void;
}

export function CcDiamondMobileList({
  records,
  totalCount,
  currentPage,
  loading,
  onPageChange,
  onOpenDetail,
}: CcDiamondMobileListProps) {
  return (
    <div className="px-3 pb-3">
      <MobileRecordList
        records={records}
        getKey={(record) => record.ccId}
        loading={loading}
        emptyDescription="Chưa có dữ liệu Kim Cương"
        renderRecord={(record) => {
          const ratio = getReferralRatio(record);
          const isQualified = isDiamondQualified(record, ratio);
          const hasReferrals = record.soKhachDiamond > 0;
          const rankLabel = record.rank === 1 ? 'Top 1' : `#${record.rank}`;

          return (
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums ${
                    record.rank === 1
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                  aria-label={`Hạng ${rankLabel}`}
                >
                  {record.rank === 1 ? <AppIcon icon={Crown} size={14} /> : rankLabel}
                </div>
                <CcAvatar name={record.tenCc} src={record.avatar} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-slate-800 dark:text-slate-100">{record.tenCc}</div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Tư vấn viên</div>
                </div>
                <StatusTag
                  status={hasReferrals ? 'cyan' : 'default'}
                  label={`💎 ${record.soKhachDiamond} khách`}
                  className="shrink-0 whitespace-nowrap px-2 py-1 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/70">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Khách đã tiếp</div>
                  <div className="mt-1 text-base font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                    {record.tongKhach.toLocaleString('vi-VN')}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/70">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Tỷ lệ giới thiệu</div>
                  <div className="mt-1">
                    {isQualified && hasReferrals ? (
                      <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        ✓ {ratio}%
                      </span>
                    ) : hasReferrals ? (
                      <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">{ratio}%</span>
                    ) : (
                      <span className="font-semibold tabular-nums text-slate-500">{ratio}%</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                <div className="min-w-0">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Thưởng Kim Cương</div>
                  {record.thuongDiamond > 0 ? (
                    <div className="mt-0.5 whitespace-nowrap font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{formatDiamondCurrency(record.thuongDiamond)}
                    </div>
                  ) : record.potentialThuong && record.potentialThuong > 0 ? (
                    <div className="mt-0.5 whitespace-nowrap font-semibold tabular-nums text-slate-500 dark:text-slate-300">
                      0 đ <span className="text-xs font-medium text-rose-500 dark:text-rose-400">· cần ≥3%</span>
                    </div>
                  ) : (
                    <div className="mt-0.5 whitespace-nowrap font-semibold tabular-nums text-slate-500 dark:text-slate-300">
                      0 đ
                    </div>
                  )}
                </div>
                <Tooltip title="Xem chi tiết">
                  <Button
                    aria-label={`Xem chi tiết Kim Cương của ${record.tenCc}`}
                    type="text"
                    icon={<AppIcon icon={Eye} size={15} />}
                    onClick={() => onOpenDetail(record)}
                    className="h-8 w-8 shrink-0 rounded-lg text-cyan-600 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-950/40"
                  />
                </Tooltip>
              </div>
            </div>
          );
        }}
      />
      {totalCount > MOBILE_DIAMOND_PAGE_SIZE ? (
        <div className="responsive-mobile-pagination">
          <StandardPagination
            current={currentPage}
            pageSize={MOBILE_DIAMOND_PAGE_SIZE}
            total={totalCount}
            showSizeChanger={false}
            showLessItems
            onChange={onPageChange}
          />
        </div>
      ) : null}
    </div>
  );
}
