'use client';

import React from 'react';
import { Form, Input, InputNumber, TimePicker, Typography } from 'antd';
import { ShieldAlert, Target } from 'lucide-react';
import type { BkGameDoneBonusRule, BkGameTeamBookingDoneBonusConfig, BkGameType } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import BkDoneBonusConfigTable from '../BkDoneBonusConfigTable';
import BkTeamBookingDoneBonusConfigTable from '../BkTeamBookingDoneBonusConfigTable';

interface BkGameFormatConfigSectionProps {
  gameType: BkGameType;
  teamKpiTimeWindowLabel: string;
  doneBonusRules: BkGameDoneBonusRule[];
  onDoneBonusRulesChange: (rules: BkGameDoneBonusRule[]) => void;
  teamBookingDoneBonusConfig: BkGameTeamBookingDoneBonusConfig | null;
  onTeamBookingDoneBonusConfigChange: (config: BkGameTeamBookingDoneBonusConfig | null) => void;
}

/** Renders format-specific Team KPI or entry-fee/reward inputs plus done-bonus rule tables. */
export function BkGameFormatConfigSection({
  gameType,
  teamKpiTimeWindowLabel,
  doneBonusRules,
  onDoneBonusRulesChange,
  teamBookingDoneBonusConfig,
  onTeamBookingDoneBonusConfigChange,
}: BkGameFormatConfigSectionProps) {
  return (
    <>
      {gameType === 'TEAM_KPI' && (
        <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 space-y-4 my-2">
          <div className="flex items-center gap-2">
            <AppIcon icon={Target} size="md" className="text-purple-600 dark:text-purple-400 shrink-0" />
            <div>
              <Typography.Text strong className="text-sm text-purple-900 dark:text-purple-200 block">
                Cấu hình Thể thức Team KPI (Thử thách tập thể)
              </Typography.Text>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Toàn Team Booking cùng thực hiện một KPI chung, không thi đua cá nhân hay chia đội đối đầu. Thưởng/phạt
                ghi nhận một lần cho toàn Team.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="teamKpiDailyTarget"
              label={
                <span className="font-medium text-slate-700 dark:text-slate-300">Mục tiêu KPI (Booking/ngày)</span>
              }
              rules={[{ required: true, message: 'Nhập mục tiêu KPI theo ngày' }]}
              extra="Số lượng booking tối thiểu cần đạt mỗi ngày"
            >
              <InputNumber
                min={1}
                className="w-full tabular-nums"
                size="large"
                placeholder="Ví dụ: 30"
                addonAfter="Booking/ngày"
              />
            </Form.Item>

            <Form.Item
              name="teamKpiTimeWindow"
              label={
                <span className="font-medium text-slate-700 dark:text-slate-300">Khung giờ áp dụng trong ngày</span>
              }
              rules={[{ required: true, message: 'Chọn khung giờ tính điểm' }]}
              extra="Chỉ tính các booking tạo trong khung giờ này (theo thời điểm tạo đơn)"
            >
              <TimePicker.RangePicker
                format="HH:mm"
                className="w-full tabular-nums"
                size="large"
                placeholder={['Từ 08:00', 'Đến 17:00']}
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="teamKpiRewardPerDay"
              label={
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  Mức thưởng khi Đạt KPI (+VNĐ/ngày)
                </span>
              }
              rules={[{ required: true, message: 'Nhập mức thưởng' }]}
              extra="Thưởng ghi nhận vào quỹ chung của Team khi đạt chỉ tiêu ngày"
            >
              <InputNumber
                min={0}
                step={10000}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                className="w-full tabular-nums"
                size="large"
                placeholder="Ví dụ: 50,000"
                addonAfter="VNĐ"
              />
            </Form.Item>

            <Form.Item
              name="teamKpiPenaltyPerDay"
              label={<span className="font-medium text-rose-500">Mức phạt khi Không Đạt KPI (-VNĐ/ngày)</span>}
              rules={[{ required: true, message: 'Nhập mức phạt' }]}
              extra="Phạt ghi nhận vào quỹ chung của Team khi không đạt chỉ tiêu ngày"
            >
              <InputNumber
                min={0}
                step={10000}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                className="w-full tabular-nums"
                size="large"
                placeholder="Ví dụ: 25,000"
                addonAfter="VNĐ"
              />
            </Form.Item>
          </div>
        </div>
      )}

      {gameType !== 'TEAM_KPI' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="entryFee" label={<span className="font-medium">Mức cược tham gia (VNĐ/người)</span>}>
              <InputNumber
                min={0}
                step={10000}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                className="w-full tabular-nums"
                size="large"
                placeholder="0 nếu không cược"
              />
            </Form.Item>

            <Form.Item name="rewardPool" label={<span className="font-medium">Thưởng công ty tài trợ (VNĐ)</span>}>
              <InputNumber
                min={0}
                step={50000}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                className="w-full tabular-nums"
                size="large"
                placeholder="Tiền thưởng thêm từ Manager"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="rewardDescription" label={<span className="font-medium">Mô tả giải thưởng</span>}>
              <Input placeholder="Ví dụ: Top 1 nhận toàn bộ quỹ..." />
            </Form.Item>

            <Form.Item
              name="penaltyDescription"
              label={
                <span className="font-medium flex items-center gap-1.5 text-rose-500">
                  <AppIcon icon={ShieldAlert} size="sm" />
                  <span>Hình phạt vui</span>
                </span>
              }
            >
              <Input placeholder="Ví dụ: Bao trà sữa, Hát 1 bài..." />
            </Form.Item>
          </div>
        </>
      )}

      {/* Cấu hình Thưởng Bonus / Done theo Dịch vụ */}
      <div className="my-2">
        <BkDoneBonusConfigTable value={doneBonusRules} onChange={onDoneBonusRulesChange} />
      </div>

      {/* Cấu hình Thưởng Done khách lẻ theo mốc Booking Team */}
      <div className="my-2">
        <BkTeamBookingDoneBonusConfigTable
          value={teamBookingDoneBonusConfig}
          onChange={onTeamBookingDoneBonusConfigChange}
          gameType={gameType}
          teamKpiTimeWindowLabel={teamKpiTimeWindowLabel}
        />
      </div>
    </>
  );
}
