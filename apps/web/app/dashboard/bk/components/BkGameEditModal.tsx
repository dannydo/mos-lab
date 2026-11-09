'use client';

import React, { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Select, TimePicker, Tooltip, Typography, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { Info, Sparkles, Target } from 'lucide-react';
import { BkGame, BkGameDoneBonusRule, BK_BOOKING_CHANNELS } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { AdaptiveModal, AppIcon } from '~/components/ui';
import BkDoneBonusConfigTable from './BkDoneBonusConfigTable';

interface BkGameEditModalProps {
  open: boolean;
  game: BkGame | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BkGameEditModal({ open, game, onClose, onSuccess }: BkGameEditModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [doneBonusRules, setDoneBonusRules] = useState<BkGameDoneBonusRule[]>([]);

  useEffect(() => {
    if (open && game) {
      form.setFieldsValue({
        title: game.title,
        description: game.description || '',
        targetScore: game.targetScore || undefined,
        allowedBookingChannels: game.allowedBookingChannels || [],
        rewardPool: game.rewardPool || undefined,
        rewardDescription: game.rewardDescription || '',
        penaltyDescription: game.penaltyDescription || '',
        teamKpiDailyTarget: game.teamKpiConfig?.dailyTarget || game.targetScore || 30,
        teamKpiRewardPerDay: game.teamKpiConfig?.rewardPerDay || 50000,
        teamKpiPenaltyPerDay: game.teamKpiConfig?.penaltyPerDay || 25000,
        teamKpiTimeWindow: [
          dayjs(game.teamKpiConfig?.timeWindowStart || '08:00', 'HH:mm'),
          dayjs(game.teamKpiConfig?.timeWindowEnd || '17:00', 'HH:mm'),
        ],
      });
      let initialRules: BkGameDoneBonusRule[] = [];
      if (Array.isArray(game.doneBonusConfig)) {
        initialRules = game.doneBonusConfig;
      } else if (typeof game.doneBonusConfig === 'string') {
        try {
          initialRules = JSON.parse(game.doneBonusConfig);
        } catch {
          initialRules = [];
        }
      }
      setDoneBonusRules(initialRules);
    }
  }, [open, game, form]);

  const handleSubmit = async (values: {
    title: string;
    description?: string;
    targetScore?: number;
    allowedBookingChannels?: string[];
    rewardPool?: number;
    rewardDescription?: string;
    penaltyDescription?: string;
    teamKpiDailyTarget?: number;
    teamKpiTimeWindow?: [Dayjs, Dayjs];
    teamKpiRewardPerDay?: number;
    teamKpiPenaltyPerDay?: number;
  }) => {
    if (!game) return;
    setLoading(true);
    try {
      let teamKpiConfig = null;
      if (game.gameType === 'TEAM_KPI') {
        const tw = values.teamKpiTimeWindow;
        teamKpiConfig = {
          dailyTarget: values.teamKpiDailyTarget || values.targetScore || 30,
          rewardPerDay: values.teamKpiRewardPerDay ?? 50000,
          penaltyPerDay: values.teamKpiPenaltyPerDay ?? 25000,
          timeWindowStart: tw && tw[0] ? tw[0].format('HH:mm') : '08:00',
          timeWindowEnd: tw && tw[1] ? tw[1].format('HH:mm') : '17:00',
        };
      }

      await apiClient.bk.updateGame(game.id, {
        title: values.title,
        description: values.description,
        targetScore: game.gameType === 'TEAM_KPI' ? (values.teamKpiDailyTarget || values.targetScore) : values.targetScore,
        allowedBookingChannels: values.allowedBookingChannels,
        rewardPool: values.rewardPool,
        rewardDescription: values.rewardDescription,
        penaltyDescription: values.penaltyDescription,
        doneBonusConfig: doneBonusRules.length > 0 ? doneBonusRules : null,
        teamKpiConfig,
      });
      message.success('Cập nhật cấu hình Game BK thành công!');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Lỗi khi cập nhật Game BK';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!game) return null;

  return (
    <AdaptiveModal
      intent="form"
      open={open}
      title={
        <div className="flex items-center gap-2 text-base font-bold">
          <AppIcon icon={Sparkles} size="sm" className="text-amber-500" />
          <span>Chỉnh Sửa Game: {game.title}</span>
        </div>
      }
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText="Lưu Thay Đổi"
      cancelText="Hủy"
      width={680}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-2">
        <Form.Item
          name="title"
          label={<span className="font-medium">Tên Game</span>}
          rules={[{ required: true, message: 'Vui lòng nhập tên game' }]}
        >
          <Input placeholder="Ví dụ: [BK_LÔNG][T9] CUỘC ĐUA KỲ THÚ" size="large" />
        </Form.Item>

        <Form.Item name="description" label={<span className="font-medium">Mô tả / Thông điệp phát động</span>}>
          <Input.TextArea rows={2} placeholder="Nội dung cổ vũ tinh thần đội nhóm..." />
        </Form.Item>

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
              🎯 <strong>Fair-play:</strong> Giới hạn kênh tiếp nhận (ví dụ: <code>GB</code>) giúp đảm bảo công bằng cho người chơi chỉ phụ trách kênh đó, không bị chênh lệch với người chơi nhận nhiều nguồn (FB, Zalo, WA). Để trống = tính tất cả kênh.
            </span>
          }
        >
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[12px] text-slate-500 dark:text-slate-400">Chọn nhanh:</span>
              <button
                type="button"
                data-testid="edit-quick-gb-btn"
                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:opacity-80 transition-opacity cursor-pointer"
                onClick={() => form.setFieldValue('allowedBookingChannels', ['GB'])}
              >
                ⚡ Chỉ tính GB (Fair-play)
              </button>
              <button
                type="button"
                data-testid="edit-quick-all-channels-btn"
                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:opacity-80 transition-opacity cursor-pointer"
                onClick={() => form.setFieldValue('allowedBookingChannels', [])}
              >
                Tất cả kênh
              </button>
            </div>
            <Form.Item name="allowedBookingChannels" noStyle>
              <Select
                data-testid="edit-bk-game-channel-select"
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

        {game.gameType === 'TEAM_KPI' ? (
          <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 space-y-4 my-2">
            <div className="flex items-center gap-2">
              <AppIcon icon={Target} size="md" className="text-purple-600 dark:text-purple-400 shrink-0" />
              <div>
                <Typography.Text strong className="text-sm text-purple-900 dark:text-purple-200 block">
                  Cấu hình Thể thức Team KPI (Thử thách tập thể)
                </Typography.Text>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Toàn Team Booking cùng thực hiện một KPI chung, không thi đua cá nhân hay chia đội đối đầu. Thưởng/phạt tính một lần cho cả Team.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                name="teamKpiDailyTarget"
                label={<span className="font-medium text-slate-700 dark:text-slate-300">Mục tiêu KPI (Booking/ngày)</span>}
                rules={[{ required: true, message: 'Nhập mục tiêu KPI theo ngày' }]}
                extra="Số lượng booking tối thiểu cần đạt mỗi ngày"
              >
                <InputNumber
                  min={1}
                  className="w-full"
                  size="large"
                  placeholder="Ví dụ: 30"
                  addonAfter="Booking/ngày"
                />
              </Form.Item>

              <Form.Item
                name="teamKpiTimeWindow"
                label={<span className="font-medium text-slate-700 dark:text-slate-300">Khung giờ áp dụng trong ngày</span>}
                rules={[{ required: true, message: 'Chọn khung giờ tính điểm' }]}
                extra="Chỉ tính các booking tạo trong khung giờ này (theo thời điểm tạo đơn)"
              >
                <TimePicker.RangePicker
                  format="HH:mm"
                  className="w-full"
                  size="large"
                  placeholder={['Từ 08:00', 'Đến 17:00']}
                />
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                name="teamKpiRewardPerDay"
                label={<span className="font-medium text-emerald-600 dark:text-emerald-400">Mức thưởng khi Đạt KPI (+VNĐ/ngày)</span>}
                rules={[{ required: true, message: 'Nhập mức thưởng' }]}
                extra="Thưởng ghi nhận vào quỹ chung của Team khi đạt chỉ tiêu ngày"
              >
                <InputNumber
                  min={0}
                  step={10000}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  className="w-full"
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
                  className="w-full"
                  size="large"
                  placeholder="Ví dụ: 25,000"
                  addonAfter="VNĐ"
                />
              </Form.Item>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                name="targetScore"
                label={<span className="font-medium">Mục tiêu điểm số (Target)</span>}
                extra="Số điểm tối thiểu để đạt mốc hoặc xét thưởng"
              >
                <InputNumber min={0} className="w-full" size="large" placeholder="Ví dụ: 50" />
              </Form.Item>

              <Form.Item
                name="rewardPool"
                label={<span className="font-medium">Tổng giải thưởng (VNĐ)</span>}
                extra="Tổng quỹ thưởng trao giải"
              >
                <InputNumber
                  min={0}
                  step={50000}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  className="w-full"
                  size="large"
                  placeholder="Ví dụ: 1,000,000"
                />
              </Form.Item>
            </div>

            <Form.Item name="rewardDescription" label={<span className="font-medium">Cơ cấu giải thưởng</span>}>
              <Input.TextArea rows={2} placeholder="Chi tiết phần thưởng..." />
            </Form.Item>

            <Form.Item
              name="penaltyDescription"
              label={<span className="font-medium">Hình phạt vui cho người/đội thua</span>}
            >
              <Input.TextArea rows={2} placeholder="Hình phạt hài hước..." />
            </Form.Item>
          </>
        )}

        {/* Cấu hình Thưởng Bonus / Done theo Dịch vụ */}
        <div className="my-2">
          <BkDoneBonusConfigTable value={doneBonusRules} onChange={setDoneBonusRules} />
        </div>
      </Form>
    </AdaptiveModal>
  );
}
