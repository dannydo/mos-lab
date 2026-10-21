'use client';

import React from 'react';
import { Button } from 'antd';
import {
  TelesaleCompetencyMatrixRow,
  TELESALE_TIER_CONFIG,
} from '@mos-lab/shared';
import { DataTable, StatusTag, StatusType } from '../../../../components/ui';

interface TelesaleTeamMatrixTabProps {
  teamMatrix: TelesaleCompetencyMatrixRow[];
  loading: boolean;
  onSelectStaff: (staffId: number) => void;
}

export const TelesaleTeamMatrixTab: React.FC<TelesaleTeamMatrixTabProps> = ({
  teamMatrix,
  loading,
  onSelectStaff,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-base text-slate-900 dark:text-zinc-100">
            Bảng Tổng Hợp Khung Năng Lực Đội Telesales
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Sắp xếp theo thứ tự tổng điểm năng lực tháng từ cao xuống thấp
          </p>
        </div>
      </div>

      <DataTable<TelesaleCompetencyMatrixRow>
        dataSource={teamMatrix}
        rowKey="staffId"
        loading={loading}
        pagination={false}
        columns={[
          {
            title: 'Họ và tên',
            key: 'staffName',
            render: (_, r) => (
              <div>
                <div className="font-semibold text-slate-900 dark:text-zinc-100">{r.staffName}</div>
                <div className="text-xs text-slate-500 dark:text-zinc-400">
                  Mã NV: #{r.staffId} · Thâm niên: <span className="tabular-nums">{r.tenureMonths}</span> tháng
                </div>
              </div>
            ),
          },
          {
            title: 'Cấp bậc',
            key: 'currentTier',
            render: (_, r) => {
              const cfg = TELESALE_TIER_CONFIG[r.currentTier];
              const statusType: StatusType =
                r.currentTier === 'SENIOR'
                  ? 'purple'
                  : r.currentTier === 'MID_LEVEL'
                  ? 'gold'
                  : r.currentTier === 'JUNIOR'
                  ? 'cyan'
                  : 'default';
              return (
                <StatusTag status={statusType} label={cfg?.label || r.currentTier} />
              );
            },
          },
          {
            title: 'A. Hiệu suất (40%)',
            dataIndex: 'scoreA',
            key: 'scoreA',
            render: (v) => <span className="font-semibold tabular-nums text-blue-600 dark:text-blue-400">{v}đ</span>,
          },
          {
            title: 'B. 9 Kỹ năng (25%)',
            dataIndex: 'scoreB',
            key: 'scoreB',
            render: (v) => <span className="font-semibold tabular-nums text-purple-600 dark:text-purple-400">{v}đ</span>,
          },
          {
            title: 'C. Chất lượng (20%)',
            dataIndex: 'scoreC',
            key: 'scoreC',
            render: (v) => <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{v}đ</span>,
          },
          {
            title: 'D. Thái độ (15%)',
            dataIndex: 'scoreD',
            key: 'scoreD',
            render: (v) => <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">{v}đ</span>,
          },
          {
            title: 'Tổng điểm',
            dataIndex: 'totalScore',
            key: 'totalScore',
            render: (v, r) => (
              <div>
                <span className="font-bold text-base tabular-nums text-slate-900 dark:text-zinc-100">{v}</span>
                <span className="text-xs text-slate-400 dark:text-zinc-500">/100</span>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Chuẩn: <span className="tabular-nums">{TELESALE_TIER_CONFIG[r.currentTier]?.passingScore}</span>đ ({r.isPassed ? '✓ Đạt' : '✗ Trượt'})
                </div>
              </div>
            ),
          },
          {
            title: 'Rule Engine',
            key: 'ruleEngineStatus',
            render: (_, r) => {
              if (r.ruleEngineStatus === 'PROMOTION_READY') {
                return (
                  <StatusTag status="success" label="ĐỦ ĐIỀU KIỆN THĂNG BẬC" />
                );
              }
              if (r.ruleEngineStatus === 'DEMOTION_FLAGGED') {
                return (
                  <StatusTag status="error" label={`CẢNH BÁO GIÁNG BẬC (${r.consecutiveFailMonths}T)`} />
                );
              }
              if (r.ruleEngineStatus === 'WARNING_M1') {
                return (
                  <StatusTag status="warning" label="Cảnh báo T1 (Trượt)" />
                );
              }
              return (
                <StatusTag status="processing" label={`Duy trì (${r.consecutivePassMonths}T đạt)`} />
              );
            },
          },
          {
            title: 'Thao tác',
            key: 'action',
            render: (_, r) => (
              <Button
                size="small"
                type="link"
                onClick={() => onSelectStaff(r.staffId)}
                className="text-amber-600 hover:text-amber-700 dark:text-amber-400 p-0 font-medium"
              >
                Chấm điểm chi tiết →
              </Button>
            ),
          },
        ]}
      />
    </div>
  );
};
