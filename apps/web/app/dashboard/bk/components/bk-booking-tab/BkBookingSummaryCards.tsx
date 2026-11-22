'use client';

import type { ComponentProps } from 'react';
import { Card, Col, Row, Tooltip } from 'antd';
import { Calendar, CheckCircle2, Phone, Trophy, XCircle } from 'lucide-react';
import PeriodComparison from '~/components/ui/PeriodComparison';
import type { BkBookingForecast, BkBookingSummary } from './bkBookingUtils';

export interface BkBookingSummaryCardsProps {
  summary: BkBookingSummary;
  previousSummary: BkBookingSummary | null;
  comparison?: ComponentProps<typeof PeriodComparison>['comparison'];
  forecast: BkBookingForecast;
}

export function BkBookingSummaryCards({ summary, previousSummary, comparison, forecast }: BkBookingSummaryCardsProps) {
  const { isDayMode, isPastPeriod, elapsedRatioPercent, periodNoun } = forecast;

  const renderForecastSubtext = (projectedVal: number, unit = '') => {
    if (isDayMode || !projectedVal) return null;

    if (isPastPeriod) {
      return (
        <Tooltip title={`Dữ liệu ${periodNoun} đã chốt (100% thời gian)`}>
          <div className="text-xs font-medium text-slate-500 mt-2 flex items-center justify-between border-t border-slate-700/20 pt-1.5 cursor-help opacity-70">
            <span>Thực tế chốt {periodNoun}:</span>
            <span className="tabular-nums font-medium text-slate-400 whitespace-nowrap">
              {`${projectedVal.toLocaleString('vi-VN')} ${unit}`}
            </span>
          </div>
        </Tooltip>
      );
    }

    return (
      <Tooltip
        title={`Đã trôi qua ${elapsedRatioPercent.toFixed(1)}% thời gian ${periodNoun} (Ca 09:00 - 21:00 + 2h buffer checkout)`}
      >
        <div className="text-xs font-medium text-slate-400 mt-2 flex items-center justify-between border-t border-slate-700/30 pt-1.5 cursor-help">
          <span role="img" aria-label={`Dự kiến cuối ${periodNoun}`} className="shrink-0 text-sm leading-none">
            🔮
          </span>
          <span className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
            ~{`${projectedVal.toLocaleString('vi-VN')} ${unit}`}
          </span>
        </div>
      </Tooltip>
    );
  };

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6} xl={4}>
        <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">∑ Cuộc gọi</div>
          <div className="flex items-center gap-2 text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-400">
            <Phone className="w-5 h-5 shrink-0" />
            <span>{summary.totalCalls.toLocaleString('vi-VN')}</span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.totalCalls}
            previousValue={previousSummary?.totalCalls || 0}
            formatter={(value) => `${value.toLocaleString('vi-VN')} cuộc`}
          />
          {renderForecastSubtext(forecast.projectedCalls, 'cuộc')}
        </Card>
      </Col>

      <Col xs={24} sm={12} lg={6} xl={4}>
        <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">∑ Bị hủy / Missed</div>
          <div className="flex items-center gap-2 text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
            <XCircle className="w-5 h-5 shrink-0" />
            <span>{summary.missedBookings.toLocaleString('vi-VN')}</span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.missedBookings}
            previousValue={previousSummary?.missedBookings || 0}
            formatter={(value) => `${value.toLocaleString('vi-VN')} booking`}
          />
          {renderForecastSubtext(forecast.projectedMissed, 'booking')}
        </Card>
      </Col>

      <Col xs={24} sm={12} lg={6} xl={4}>
        <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">∑ Pickup</div>
          <div className="flex items-center gap-2 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{summary.totalPickups.toLocaleString('vi-VN')}</span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.totalPickups}
            previousValue={previousSummary?.totalPickups || 0}
            formatter={(value) => `${value.toLocaleString('vi-VN')} pickup`}
          />
          {renderForecastSubtext(forecast.projectedPickups, 'pickup')}
        </Card>
      </Col>

      <Col xs={24} sm={12} lg={6} xl={4}>
        <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">∑ Booking Đã Tạo</div>
          <div className="flex items-center gap-2 text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
            <Calendar className="w-5 h-5 shrink-0" />
            <span>{summary.totalBookings.toLocaleString('vi-VN')}</span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.totalBookings}
            previousValue={previousSummary?.totalBookings || 0}
            formatter={(value) => `${value.toLocaleString('vi-VN')} booking`}
          />
          {renderForecastSubtext(forecast.projectedBookings, 'booking')}
        </Card>
      </Col>

      <Col xs={24} sm={12} lg={6} xl={4}>
        <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Tooltip title="Booking được tạo trong kỳ đã chuyển sang trạng thái Done; không phải tổng lượt check-in diễn ra trong kỳ.">
            <div className="text-xs font-semibold text-slate-500 uppercase mb-1 cursor-help">
              Booking tạo trong kỳ đã Done
            </div>
          </Tooltip>
          <div className="flex items-center gap-2 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{summary.doneBookings.toLocaleString('vi-VN')}</span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.doneBookings}
            previousValue={previousSummary?.doneBookings || 0}
            formatter={(value) => `${value.toLocaleString('vi-VN')} booking`}
          />
          {renderForecastSubtext(forecast.projectedDoneBookings, 'booking')}
        </Card>
      </Col>

      <Col xs={24} sm={12} lg={6} xl={4}>
        <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">% Book → Done</div>
          <div className="flex items-center gap-2 text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            <Trophy className="w-5 h-5 shrink-0" />
            <span>{summary.conversionRate}%</span>
          </div>
          <PeriodComparison
            comparison={comparison}
            currentValue={summary.conversionRate}
            previousValue={previousSummary?.conversionRate || 0}
            formatter={(value) => `${value.toFixed(1)}%`}
          />
        </Card>
      </Col>
    </Row>
  );
}
