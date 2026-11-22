'use client';

import React from 'react';
import { Button, Card, Typography } from 'antd';
import { Lock } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import type { FundOverviewData } from './types';

const { Title, Paragraph } = Typography;

export interface FundPeriodsTabProps {
  fundOverview: FundOverviewData | null;
  isActive: boolean;
  onOpenReconcile: () => void;
}

export function FundPeriodsTab({ fundOverview, isActive, onOpenReconcile }: FundPeriodsTabProps) {
  return (
    <div className="space-y-4 py-2">
      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Title level={5} className="!m-0 !font-bold flex items-center gap-2">
            <AppIcon icon={Lock} size="sm" className="text-purple-600" />
            <span>Kiểm Kê Số Dư & Khóa Sổ Kỳ Kế Toán</span>
          </Title>
          <Paragraph type="secondary" className="text-xs !mb-0 mt-1">
            Đối soát số dư kiểm kê thực tế tại két/tài khoản với số dư sổ sách hệ thống. Nếu có chênh lệch, hệ thống tự
            động sinh bút toán điều chỉnh và chuyển số dư sang kỳ mới.
          </Paragraph>
        </div>

        {isActive && (
          <Button
            type="primary"
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold"
            icon={<AppIcon icon={Lock} size="sm" />}
            onClick={onOpenReconcile}
          >
            Đối Soát & Chốt Kỳ
          </Button>
        )}
      </div>

      {fundOverview?.currentPeriod && (
        <Card title="Kỳ Kế Toán Đang Vận Hành" className="shadow-sm border-slate-200 dark:border-slate-800">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Tên kỳ:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {fundOverview.currentPeriod.periodName}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Thời gian kỳ:</span>
              <span className="tabular-nums text-slate-700 dark:text-slate-300">
                {new Date(fundOverview.currentPeriod.startDate).toLocaleDateString('vi-VN')} –{' '}
                {new Date(fundOverview.currentPeriod.endDate).toLocaleDateString('vi-VN')}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Số dư đầu kỳ:</span>
              <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                {Number(fundOverview.currentPeriod.openingBalance).toLocaleString('vi-VN')} đ
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Tổng thu:</span>
              <span className="font-semibold tabular-nums text-emerald-600">
                +{Number(fundOverview.currentPeriod.totalIncome).toLocaleString('vi-VN')} đ
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Tổng chi:</span>
              <span className="font-semibold tabular-nums text-rose-600">
                -{Number(fundOverview.currentPeriod.totalExpense).toLocaleString('vi-VN')} đ
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-medium">Số dư hệ thống hiện tại:</span>
              <span className="font-bold tabular-nums text-base text-slate-900 dark:text-white">
                {Number(fundOverview.currentBalance).toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
