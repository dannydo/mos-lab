'use client';

import React, { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Select, Tooltip, message } from 'antd';
import { Info, Sparkles } from 'lucide-react';
import { BkGame, BK_BOOKING_CHANNELS } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { AdaptiveModal, AppIcon } from '~/components/ui';

interface BkGameEditModalProps {
  open: boolean;
  game: BkGame | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BkGameEditModal({ open, game, onClose, onSuccess }: BkGameEditModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

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
      });
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
  }) => {
    if (!game) return;
    setLoading(true);
    try {
      await apiClient.bk.updateGame(game.id, {
        title: values.title,
        description: values.description,
        targetScore: values.targetScore,
        allowedBookingChannels: values.allowedBookingChannels,
        rewardPool: values.rewardPool,
        rewardDescription: values.rewardDescription,
        penaltyDescription: values.penaltyDescription,
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
      </Form>
    </AdaptiveModal>
  );
}
