'use client';

import React from 'react';
import { Row, Col, Card, Statistic, theme } from 'antd';
import {
  ClockCircleOutlined,
  ThunderboltOutlined,
  GiftOutlined,
  DollarOutlined,
  TrophyOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { CcPaystubResponse, ReportPeriodComparison, SafeAny } from '@mos-lab/shared';
import CcPeriodComparison from '~/app/dashboard/cc/components/CcPeriodComparison';
import { formatCompactVND } from '~/lib/format-utils';

export type CcIncomeSummary = CcPaystubResponse['summary'] & {
  totalDiamondBonus: number;
  comparison?: ReportPeriodComparison & {
    totalHourlyWage?: number;
    totalCcXoayBonus?: number;
    totalComboProductBonus?: number;
    totalMinigameBonus?: number;
    totalDiamondBonus?: number;
    totalCcTipBonus?: number;
    grandTotalIncome?: number;
    [key: string]: SafeAny;
  };
};

export interface CcIncomeSummaryCardsProps {
  summary: CcIncomeSummary;
  projectedSummary: SafeAny;
  renderForecastSubtext: (forecastVal: number) => React.ReactNode;
  isDark?: boolean;
}

export default function CcIncomeSummaryCards({
  summary,
  projectedSummary,
  renderForecastSubtext,
  isDark,
}: CcIncomeSummaryCardsProps) {
  const { token } = theme.useToken();

  return (
    <Row gutter={[16, 16]} className="cc-income-summary-row mb-4">
      <Col xs={12} sm={8} lg={4}>
        <Card
          size="small"
          variant="outlined"
          style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        >
          <Statistic
            title="∑ Lương Giờ"
            value={summary.totalHourlyWage}
            suffix="đ"
            precision={0}
            valueStyle={{
              fontSize: '15px',
              color: isDark ? '#60a5fa' : '#1890ff',
              fontVariantNumeric: 'tabular-nums',
            }}
            prefix={<ClockCircleOutlined />}
          />
          {renderForecastSubtext(projectedSummary.projectedHourlyWage)}
          <CcPeriodComparison
            compact
            comparison={summary.comparison}
            currentValue={summary.totalHourlyWage}
            previousValue={summary.comparison?.totalHourlyWage || 0}
            formatter={formatCompactVND}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card
          size="small"
          variant="outlined"
          style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        >
          <Statistic
            title="Thưởng Xoay"
            value={summary.totalCcXoayBonus}
            suffix="đ"
            precision={0}
            valueStyle={{
              fontSize: '15px',
              color: isDark ? '#c084fc' : '#722ed1',
              fontVariantNumeric: 'tabular-nums',
            }}
            prefix={<ThunderboltOutlined />}
          />
          {renderForecastSubtext(projectedSummary.projectedCcXoayBonus)}
          <CcPeriodComparison
            compact
            comparison={summary.comparison}
            currentValue={summary.totalCcXoayBonus}
            previousValue={summary.comparison?.totalCcXoayBonus || 0}
            formatter={formatCompactVND}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card
          size="small"
          variant="outlined"
          style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        >
          <Statistic
            title="∑ Thưởng Combo & SP"
            value={summary.totalComboProductBonus}
            suffix="đ"
            precision={0}
            valueStyle={{
              fontSize: '15px',
              color: isDark ? '#4ade80' : '#52c41a',
              fontVariantNumeric: 'tabular-nums',
            }}
            prefix={<GiftOutlined />}
          />
          {renderForecastSubtext(projectedSummary.projectedComboProductBonus)}
          <CcPeriodComparison
            compact
            comparison={summary.comparison}
            currentValue={summary.totalComboProductBonus}
            previousValue={summary.comparison?.totalComboProductBonus || 0}
            formatter={formatCompactVND}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card
          size="small"
          variant="outlined"
          style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        >
          <Statistic
            title="Thưởng Tip"
            value={summary.totalCcTipBonus}
            suffix="đ"
            precision={0}
            valueStyle={{
              fontSize: '15px',
              color: token.colorPrimary,
              fontVariantNumeric: 'tabular-nums',
            }}
            prefix={<DollarOutlined />}
          />
          {renderForecastSubtext(projectedSummary.projectedCcTipBonus)}
          <CcPeriodComparison
            compact
            comparison={summary.comparison}
            currentValue={summary.totalCcTipBonus}
            previousValue={summary.comparison?.totalCcTipBonus || 0}
            formatter={formatCompactVND}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card
          size="small"
          variant="outlined"
          style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        >
          <Statistic
            title="∑ Thưởng Minigame"
            value={summary.totalMinigameBonus}
            suffix="đ"
            precision={0}
            valueStyle={{
              fontSize: '15px',
              color: isDark ? '#fde047' : '#d97706',
              fontVariantNumeric: 'tabular-nums',
            }}
            prefix={<TrophyOutlined />}
          />
          {renderForecastSubtext(projectedSummary.projectedMinigameBonus)}
          <CcPeriodComparison
            compact
            comparison={summary.comparison}
            currentValue={summary.totalMinigameBonus}
            previousValue={summary.comparison?.totalMinigameBonus || 0}
            formatter={formatCompactVND}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card
          size="small"
          variant="outlined"
          style={{ background: token.colorBgContainer, borderColor: token.colorPrimary }}
        >
          <Statistic
            title="Thu Nhập"
            value={summary.grandTotalIncome}
            suffix="đ"
            precision={0}
            valueStyle={{
              fontSize: '15px',
              color: token.colorPrimary,
              fontWeight: 'bold',
              fontVariantNumeric: 'tabular-nums',
            }}
            prefix={<WalletOutlined />}
          />
          {renderForecastSubtext(projectedSummary.projectedTotalIncome)}
          <CcPeriodComparison
            compact
            comparison={summary.comparison}
            currentValue={summary.grandTotalIncome}
            previousValue={summary.comparison?.grandTotalIncome || 0}
            formatter={formatCompactVND}
          />
        </Card>
      </Col>
    </Row>
  );
}
