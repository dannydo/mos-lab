'use client';

import React from 'react';
import { DatePicker, Form, Input, InputNumber, Radio, Segmented, Select, Tooltip, type FormInstance } from 'antd';
import { Award, Info, Sparkles, Target, Users } from 'lucide-react';
import { BK_BOOKING_CHANNELS, type BkGameMetricType, type BkGameScoringRule, type BkGameType } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import type { BkGameCreateFormValues } from './bkGameCreateUtils';

interface BkGameCoreFieldsSectionProps {
  form: FormInstance<BkGameCreateFormValues>;
  gameType: BkGameType;
  watchedMetricType: BkGameMetricType;
  currentScoringRule: BkGameScoringRule;
  onGameTypeChange: (nextGameType: BkGameType) => void;
}

/** Renders the core game metadata, format selector, date range, KPI metric, channel filter, and scoring guide. */
export function BkGameCoreFieldsSection({
  form,
  gameType,
  watchedMetricType,
  currentScoringRule,
  onGameTypeChange,
}: BkGameCoreFieldsSectionProps) {
  return (
    <>
      <Form.Item
        name="title"
        label={<span className="font-medium">Tên game thi đua</span>}
        rules={[{ required: true, message: 'Vui lòng nhập tên game thi đua' }]}
      >
        <Input placeholder="Ví dụ: Chiến Dịch Săn Booking Tuần 38..." size="large" />
      </Form.Item>

      <Form.Item name="gameType" label={<span className="font-medium">Thể thức thi đua</span>}>
        <Segmented
          value={gameType}
          onChange={(val) => onGameTypeChange(val as BkGameType)}
          block
          options={[
            {
              label: (
                <div className="flex items-center justify-center gap-2 py-1">
                  <AppIcon icon={Award} size="sm" />
                  <span>Cá nhân</span>
                </div>
              ),
              value: 'INDIVIDUAL',
            },
            {
              label: (
                <div className="flex items-center justify-center gap-2 py-1">
                  <AppIcon icon={Users} size="sm" />
                  <span>Chia đội đối đầu</span>
                </div>
              ),
              value: 'TEAM',
            },
            {
              label: (
                <div className="flex items-center justify-center gap-2 py-1">
                  <AppIcon icon={Target} size="sm" className="text-purple-500" />
                  <span>Team KPI – Thử thách tập thể</span>
                </div>
              ),
              value: 'TEAM_KPI',
            },
          ]}
        />
      </Form.Item>

      <Form.Item
        name="dateRange"
        label={<span className="font-medium">Thời gian bắt đầu – kết thúc</span>}
        rules={[{ required: true, message: 'Vui lòng chọn thời gian bắt đầu và kết thúc' }]}
      >
        <DatePicker.RangePicker
          showTime={{ format: 'HH:mm' }}
          format="DD/MM/YYYY HH:mm"
          className="w-full"
          size="large"
        />
      </Form.Item>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Form.Item
          name="metricType"
          label={
            <div className="flex items-center gap-1.5">
              <span className="font-medium">Chỉ số tính điểm KPI</span>
              <Tooltip title="Xem chi tiết công thức và quy tắc tính điểm">
                <span
                  tabIndex={0}
                  role="button"
                  aria-label="Hướng dẫn công thức tính điểm"
                  className="inline-flex items-center cursor-pointer text-slate-400 hover:text-blue-500 transition-colors"
                >
                  <AppIcon icon={Info} size="sm" />
                </span>
              </Tooltip>
            </div>
          }
          rules={[{ required: true }]}
        >
          <Radio.Group className="grid grid-cols-2 gap-2">
            <Radio.Button value="BOOKINGS" className="text-center">
              Booking tạo
            </Radio.Button>
            <Radio.Button value="CALLS" className="text-center">
              Cuộc gọi
            </Radio.Button>
            <Radio.Button value="PICKUPS" className="text-center">
              Nghe máy
            </Radio.Button>
            <Radio.Button value="DONE" className="text-center">
              Done
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="targetScore"
          label={<span className="font-medium">Mục tiêu KPI cần đạt ({currentScoringRule.unit})</span>}
          rules={[{ required: true, message: 'Vui lòng nhập mục tiêu' }]}
        >
          <InputNumber min={1} className="w-full tabular-nums" size="large" placeholder="Ví dụ: 50" />
        </Form.Item>
      </div>

      {(watchedMetricType === 'BOOKINGS' || watchedMetricType === 'DONE' || watchedMetricType === 'COMPOSITE') && (
        <Form.Item
          label={
            <div className="flex items-center gap-1.5">
              <span className="font-medium">Kênh tiếp nhận đặt lịch (Booking Channel)</span>
              <Tooltip title="Chọn các kênh tiếp nhận booking được ghi nhận tính điểm cho game (ví dụ: chỉ kênh GB). Để trống để tính tất cả các kênh (Facebook, Zalo, GB, Hotline...).">
                <span
                  tabIndex={0}
                  role="button"
                  aria-label="Hướng dẫn chọn kênh tiếp nhận"
                  className="inline-flex items-center cursor-pointer text-slate-400 hover:text-blue-500 transition-colors"
                >
                  <AppIcon icon={Info} size="sm" />
                </span>
              </Tooltip>
            </div>
          }
          extra={
            <span className="text-[12px] text-slate-500 dark:text-slate-400">
              🎯 <strong>Fair-play:</strong> Giới hạn kênh tiếp nhận (ví dụ: <code>GB</code>) giúp đảm bảo công bằng cho
              người chơi chỉ phụ trách kênh đó, không bị chênh lệch với người chơi nhận nhiều nguồn (FB, Zalo, WA). Để
              trống = tính tất cả kênh.
            </span>
          }
        >
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[12px] text-slate-500 dark:text-slate-400">Chọn nhanh:</span>
              <button
                type="button"
                data-testid="quick-gb-btn"
                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:opacity-80 transition-opacity cursor-pointer"
                onClick={() => form.setFieldValue('allowedBookingChannels', ['GB'])}
              >
                ⚡ Chỉ tính GB (Fair-play)
              </button>
              <button
                type="button"
                data-testid="quick-all-channels-btn"
                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:opacity-80 transition-opacity cursor-pointer"
                onClick={() => form.setFieldValue('allowedBookingChannels', [])}
              >
                Tất cả kênh
              </button>
            </div>
            <Form.Item name="allowedBookingChannels" noStyle>
              <Select
                data-testid="bk-game-channel-select"
                mode="multiple"
                allowClear
                placeholder="Tất cả các kênh (mặc định) hoặc chọn: GB, FB, Zalo..."
                size="large"
                options={BK_BOOKING_CHANNELS.map((c) => ({
                  value: c.value,
                  label: c.label,
                }))}
              />
            </Form.Item>
          </div>
        </Form.Item>
      )}

      {/* Khối hiển thị trực quan công thức & quy tắc tính điểm cho chỉ số đang chọn */}
      <div
        data-testid="bk-game-scoring-guide"
        className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 text-xs space-y-2 transition-all duration-200"
      >
        <div className="flex items-center justify-between flex-wrap gap-1">
          <div className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-300">
            <AppIcon icon={Sparkles} size="sm" className="text-amber-500 shrink-0" />
            <span>Công thức tính điểm: {currentScoringRule.formula}</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-medium">
            Đơn vị: {currentScoringRule.unit}
          </span>
        </div>
        <p className="text-slate-600 dark:text-slate-300 !mb-0 leading-relaxed">{currentScoringRule.description}</p>
        <div className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-blue-200/60 dark:border-blue-900/40">
          <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">Nguồn trích xuất:</span>
          <span>{currentScoringRule.dataSource}</span>
        </div>
        {currentScoringRule.notes && (
          <div className="text-[11px] text-amber-700 dark:text-amber-300/90 flex items-center gap-1">
            <AppIcon icon={Info} size="sm" className="text-amber-500 shrink-0" />
            <span>{currentScoringRule.notes}</span>
          </div>
        )}
      </div>
    </>
  );
}
