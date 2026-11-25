'use client';

import React from 'react';
import { Progress, theme } from 'antd';
import { ChevronRight } from 'lucide-react';
import type { CcDiamondEntry } from '@mos-lab/shared';
import { AppIcon, MobileRecordList, StandardPagination } from '~/components/ui';
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
  const { token } = theme.useToken();

  return (
    <div className="space-y-2">
      <MobileRecordList
        records={records}
        getKey={(record) => record.ccId}
        loading={loading}
        emptyDescription="Chưa có dữ liệu Kim Cương"
        className="space-y-2"
        recordClassName="!rounded-2xl !px-3.5 !py-3 !bg-white/95 dark:!bg-white/[0.045] !border !border-slate-200/80 dark:!border-white/[0.08] !shadow-xs"
        renderRecord={(record) => {
          const ratioStr = getReferralRatio(record);
          const ratioNum = Number(ratioStr) || 0;
          const isQualified = isDiamondQualified(record, ratioStr);
          const hasReferrals = record.soKhachDiamond > 0;
          const progressPct = Math.min(100, Math.max(0, Math.round((ratioNum / 3) * 100)));

          return (
            <button
              type="button"
              className="w-full min-w-0 text-left cursor-pointer active:scale-[0.99] transition-transform"
              onClick={() => onOpenDetail(record)}
            >
              {/* Top Row: Rank + Avatar + Name/Visits on Left | Hero % Giới thiệu + 💎 KH + Chevron on Right */}
              <div className="flex items-center justify-between gap-2.5 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="w-5 shrink-0 text-center text-sm font-bold tabular-nums text-amber-500">
                    {record.rank === 1 ? '🥇' : record.rank === 2 ? '🥈' : record.rank === 3 ? '🥉' : `#${record.rank}`}
                  </span>
                  <CcAvatar name={record.tenCc} src={record.avatar} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                      {record.tenCc}
                    </div>
                    <div className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                      {record.tongKhach.toLocaleString('vi-VN')} lượt tiếp
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="text-right">
                    <div
                      className={`text-[17px] font-bold leading-none tabular-nums ${
                        isQualified && hasReferrals
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : hasReferrals
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {isQualified && hasReferrals ? `✓ ${ratioStr}%` : `${ratioStr}%`}
                    </div>
                    <div className="mt-0.5 text-[10.5px] font-medium text-cyan-600 dark:text-cyan-400 tabular-nums">
                      💎 {record.soKhachDiamond} khách
                    </div>
                  </div>
                  <AppIcon icon={ChevronRight} size={16} className="text-slate-400/75 shrink-0" aria-hidden />
                </div>
              </div>

              {/* Slim 3px Progress Bar toward 3% threshold */}
              <div className="mt-2.5">
                <Progress
                  percent={progressPct}
                  size="small"
                  showInfo={false}
                  strokeColor={isQualified && hasReferrals ? token.colorSuccess : token.colorInfo}
                  className="m-0 block leading-none [&_.ant-progress-inner]:!h-[3px] [&_.ant-progress-bg]:!h-[3px]"
                />
              </div>

              {/* Bottom 2-col hairline row */}
              <dl className="mt-2.5 pt-2 border-t border-slate-200/75 dark:border-white/[0.07] grid grid-cols-2 gap-2">
                <div className="min-w-0">
                  <dt className="text-[10.5px] text-slate-500 dark:text-slate-400">Điều kiện ≥ 3%</dt>
                  <dd
                    className={`truncate text-[13px] font-bold tabular-nums ${
                      isQualified && hasReferrals
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {isQualified && hasReferrals ? 'Đạt chuẩn' : hasReferrals ? 'Chưa đạt 3%' : 'Chưa có KH'}
                  </dd>
                </div>
                <div className="min-w-0 text-right">
                  <dt className="text-[10.5px] text-slate-500 dark:text-slate-400">Thưởng Kim Cương</dt>
                  <dd
                    className={`truncate text-[13.5px] font-bold tabular-nums ${
                      record.thuongDiamond > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {record.thuongDiamond > 0 ? `+${formatDiamondCurrency(record.thuongDiamond)}` : '0 đ'}
                  </dd>
                </div>
              </dl>
            </button>
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
