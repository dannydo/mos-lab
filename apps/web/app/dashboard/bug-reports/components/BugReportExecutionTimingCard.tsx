'use client';

import { useState } from 'react';
import type { InboxTicketExecutionTiming } from '@mos-lab/shared';
import { Badge, Button, Tooltip } from 'antd';
import { Bot, ChevronDown, ChevronUp, Clock, Hourglass, Info, Server, UserCheck } from 'lucide-react';
import { AppIcon, SectionCard, StatusTag } from '../../../../components/ui';
import { formatDate, formatDurationSeconds, INBOX_TIMING_BUCKET_TONES } from '../bug-report-presenters';

interface BugReportExecutionTimingCardProps {
  timing?: InboxTicketExecutionTiming | null;
}

const barWidth = (pct: number) => ({ width: `${Math.max(0, Math.min(100, pct))}%` });

export function BugReportExecutionTimingCard({ timing }: BugReportExecutionTimingCardProps) {
  const [showAllIntervals, setShowAllIntervals] = useState(false);

  if (!timing) {
    return null;
  }

  const {
    totalAiActiveSeconds,
    totalUserDannyWaitSeconds,
    totalSystemWaitSeconds,
    endToEndSeconds,
    intervals = [],
    hasIncompleteData,
  } = timing;

  // Percentage calculations
  const totalTrackedSeconds = totalAiActiveSeconds + totalUserDannyWaitSeconds + totalSystemWaitSeconds;
  const aiPct = totalTrackedSeconds > 0 ? Math.round((totalAiActiveSeconds / totalTrackedSeconds) * 100) : 0;
  const userPct = totalTrackedSeconds > 0 ? Math.round((totalUserDannyWaitSeconds / totalTrackedSeconds) * 100) : 0;
  const sysPct = Math.max(0, 100 - aiPct - userPct);

  const displayedIntervals = showAllIntervals ? intervals : intervals.slice(0, 5);

  return (
    <SectionCard
      title={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <AppIcon icon={Clock} size="sm" className="text-blue-500" />
            <span>Đo lường thời gian thực hiện (UI-008)</span>
          </div>
          {hasIncompleteData && (
            <Tooltip title="Dữ liệu lịch sử hoặc job không có mốc kết thúc chính xác được suy diễn an toàn và đánh dấu ước tính để không thổi phồng thời gian Agent.">
              <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                <AppIcon icon={Info} size="sm" />
                Dữ liệu ước tính
              </span>
            </Tooltip>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* KPI 4-Card Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* AI Active */}
          <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
              <AppIcon icon={Bot} size="sm" />
              <span>Agent thực hiện</span>
            </div>
            <div className="text-lg font-bold tabular-nums text-blue-700 dark:text-blue-300">
              {formatDurationSeconds(totalAiActiveSeconds)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{aiPct}% thời gian xử lý</div>
          </div>

          {/* User/Danny Wait */}
          <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
              <AppIcon icon={UserCheck} size="sm" />
              <span>Chờ con người</span>
            </div>
            <div className="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-300">
              {formatDurationSeconds(totalUserDannyWaitSeconds)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {userPct}% (Danny & Người báo)
            </div>
          </div>

          {/* System Queue Wait */}
          <div className="p-3 rounded-lg border border-slate-500/20 bg-slate-500/5 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <AppIcon icon={Server} size="sm" />
              <span>Hàng đợi hệ thống</span>
            </div>
            <div className="text-lg font-bold tabular-nums text-slate-700 dark:text-slate-300">
              {formatDurationSeconds(totalSystemWaitSeconds)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{sysPct}% (Queue lease)</div>
          </div>

          {/* End to End */}
          <div className="p-3 rounded-lg border border-purple-500/20 bg-purple-500/5 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-medium">
              <AppIcon icon={Hourglass} size="sm" />
              <span>Tổng End-to-End</span>
            </div>
            <div className="text-lg font-bold tabular-nums text-purple-700 dark:text-purple-300">
              {formatDurationSeconds(endToEndSeconds)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Từ lúc tạo đến hoàn tất</div>
          </div>
        </div>

        {/* Visual Progress Breakdown Bar */}
        {totalTrackedSeconds > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="text-xs text-slate-500 dark:text-slate-400 flex justify-between">
              <span>Phân bổ thời gian</span>
              <span className="tabular-nums">Tổng theo dõi: {formatDurationSeconds(totalTrackedSeconds)}</span>
            </div>
            <div className="w-full h-2.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex">
              {aiPct > 0 && (
                <div
                  style={barWidth(aiPct)}
                  className="bg-blue-500 transition-all duration-300"
                  title={`Agent: ${aiPct}%`}
                />
              )}
              {userPct > 0 && (
                <div
                  style={barWidth(userPct)}
                  className="bg-amber-500 transition-all duration-300"
                  title={`Chờ con người: ${userPct}%`}
                />
              )}
              {sysPct > 0 && (
                <div
                  style={barWidth(sysPct)}
                  className="bg-slate-400 dark:bg-slate-500 transition-all duration-300"
                  title={`Hàng đợi: ${sysPct}%`}
                />
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Agent ({aiPct}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Chờ con người ({userPct}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 inline-block" /> Hàng đợi ({sysPct}
                %)
              </span>
            </div>
          </div>
        )}

        {/* Chronological Intervals Breakdown */}
        {intervals.length > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Chi tiết từng giai đoạn ({intervals.length} chặng)</span>
              {intervals.length > 5 && (
                <Button
                  type="link"
                  size="small"
                  className="p-0 h-auto text-xs"
                  onClick={() => setShowAllIntervals(!showAllIntervals)}
                  icon={<AppIcon icon={showAllIntervals ? ChevronUp : ChevronDown} size="sm" />}
                >
                  {showAllIntervals ? 'Thu gọn' : `Xem thêm ${intervals.length - 5} chặng`}
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {displayedIntervals.map((interval) => {
                const bucketColor =
                  interval.bucket === 'AI_ACTIVE'
                    ? 'border-l-blue-500'
                    : interval.bucket === 'USER_DANNY_WAIT'
                      ? 'border-l-amber-500'
                      : 'border-l-slate-400';

                return (
                  <div
                    key={interval.id}
                    className={`p-2.5 rounded-r-lg border-y border-r border-l-4 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 ${bucketColor} flex items-center justify-between gap-3 text-xs`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{interval.label}</span>
                        <StatusTag
                          status={INBOX_TIMING_BUCKET_TONES[interval.bucket]}
                          label={
                            interval.bucket === 'AI_ACTIVE'
                              ? 'Agent'
                              : interval.bucket === 'USER_DANNY_WAIT'
                                ? 'Chờ duyệt'
                                : 'Hàng đợi'
                          }
                        />
                        {interval.isEstimated && (
                          <span className="inline-flex items-center rounded px-1 text-[10px] leading-tight font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            Ước tính
                          </span>
                        )}
                        {interval.isOngoing && <Badge status="processing" text="Đang chạy" className="text-xs" />}
                        {interval.outcome === 'FAILED' && (
                          <span className="inline-flex items-center rounded px-1 text-[10px] leading-tight font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-300 dark:border-red-700">
                            Thất bại
                          </span>
                        )}
                        {interval.outcome === 'EXPIRED' && (
                          <span className="inline-flex items-center rounded px-1 text-[10px] leading-tight font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                            Hết hạn lease
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {formatDate(interval.startedAt)}
                        {interval.endedAt ? ` → ${formatDate(interval.endedAt)}` : ' (đang tiếp tục)'}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200 text-sm">
                        {formatDurationSeconds(interval.durationSeconds)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
