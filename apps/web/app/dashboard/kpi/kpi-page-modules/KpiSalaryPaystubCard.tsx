'use client';

import React from 'react';
import { Card, Col, Divider, Row, Typography } from 'antd';
import { DollarSign } from 'lucide-react';
import type { BookerSalary } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { buildSalaryPaystubColumns, formatKpiVnd, type SalaryBreakdownRow } from './kpi-page.utils';

const { Text } = Typography;

export interface KpiSalaryPaystubCardProps {
  salary: BookerSalary;
}

const ROW_TONE_CLASS: Record<SalaryBreakdownRow['tone'], string> = {
  default: 'text-[var(--mos-text)]',
  positive: 'text-emerald-600 dark:text-emerald-400',
  negative: 'text-rose-600 dark:text-rose-400',
};

export function KpiSalaryPaystubCard({ salary }: KpiSalaryPaystubCardProps) {
  const columns = buildSalaryPaystubColumns(salary);

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2 text-[var(--mos-text)]">
          <AppIcon icon={DollarSign} size="sm" className="text-[var(--mos-accent)]" />
          {salary.role === 'oc'
            ? 'Chi Tiết Lương & Thưởng Client Consultant (Live Paystub)'
            : 'Chi Tiết Lương & Hoa Hồng Online Consultant (Live Paystub)'}
        </span>
      }
      variant="outlined"
      className="mb-6 !border-[var(--mos-accent)]"
    >
      <Row gutter={[16, 16]}>
        {columns.map((column, colIdx) => (
          <Col key={column.key} xs={24} md={8}>
            <div
              className={
                colIdx < columns.length - 1 ? 'p-3 md:border-r md:border-[var(--mos-border-secondary)]' : 'p-3'
              }
            >
              <Text type="secondary" className="text-xs font-semibold">
                {column.title}
              </Text>
              {column.rows.map((row, rowIdx) => (
                <div
                  key={row.label}
                  className={`flex justify-between items-center gap-2 ${rowIdx === 0 ? 'mt-3' : 'mt-2'}`}
                >
                  <Text className="text-[var(--mos-text)]">{row.label}</Text>
                  <Text className={`font-semibold tabular-nums ${ROW_TONE_CLASS[row.tone]}`}>{row.value}</Text>
                </div>
              ))}
            </div>
          </Col>
        ))}
      </Row>

      <Divider className="!my-4" />

      <div className="flex justify-between items-center px-3 flex-wrap gap-2">
        <Text className="text-[15px] font-bold text-[var(--mos-text)]">∑ THU NHẬP TẠM TÍNH (LIVE SALARY):</Text>
        <Text className="tabular-nums text-[22px] font-bold text-[var(--mos-accent)]">
          {formatKpiVnd(salary.totalSalary)}
        </Text>
      </div>
    </Card>
  );
}
