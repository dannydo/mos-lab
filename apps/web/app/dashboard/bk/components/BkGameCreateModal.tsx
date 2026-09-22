'use client';

import React, { useEffect, useState } from 'react';
import { Button, DatePicker, Form, Input, InputNumber, Radio, Segmented, Select, Typography, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { Trophy, Users, Award, ShieldAlert, Sparkles } from 'lucide-react';
import type { BkGame, BkGameCreateInput, BkGameMetricType, BkGameType } from '@mos-lab/shared';
import { AdaptiveModal, AppIcon } from '~/components/ui';
import { apiClient } from '~/lib/api-client';

interface BkGameCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newGame: BkGame) => void;
}

interface StaffOption {
  value: number;
  label: string;
}

export default function BkGameCreateModal({ open, onClose, onSuccess }: BkGameCreateModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [gameType, setGameType] = useState<BkGameType>('INDIVIDUAL');
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);

  useEffect(() => {
    if (!open) return;
    // Load active Telesales staff
    const fetchStaff = async () => {
      try {
        const configRes = await apiClient.bk.getConfig();
        const activeIds = configRes.activeBkIds || [];
        const opts = (configRes.allStaffOptions || [])
          .filter((s) => activeIds.includes(s.staffId))
          .map((s) => ({
            value: s.staffId,
            label: s.displayName || `BK #${s.staffId}`,
          }));
        setStaffOptions(opts);
        form.setFieldsValue({
          participantIds: opts.map((o) => o.value),
        });
      } catch {
        // Fallback
      }
    };
    void fetchStaff();
  }, [open, form]);

  const handleSubmit = async (values: {
    title: string;
    description?: string;
    gameType: BkGameType;
    metricType: BkGameMetricType;
    dateRange: [Dayjs, Dayjs];
    targetScore?: number;
    entryFee?: number;
    rewardPool?: number;
    rewardDescription?: string;
    penaltyDescription?: string;
    participantIds?: number[];
    team1Name?: string;
    team1Members?: number[];
    team2Name?: string;
    team2Members?: number[];
  }) => {
    setLoading(true);
    try {
      const [start, end] = values.dateRange;
      const payload: BkGameCreateInput = {
        title: values.title,
        description: values.description,
        gameType: values.gameType,
        metricType: values.metricType,
        targetScore: values.targetScore,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        entryFee: values.entryFee || 0,
        rewardPool: values.rewardPool || 0,
        rewardDescription: values.rewardDescription,
        penaltyDescription: values.penaltyDescription,
        winnerCriteria: 'TOP_1',
      };

      if (values.gameType === 'TEAM') {
        payload.teams = [
          {
            teamName: values.team1Name || 'Team Sói Bạc',
            color: 'blue',
            staffIds: values.team1Members || [],
          },
          {
            teamName: values.team2Name || 'Team Đại Bàng',
            color: 'red',
            staffIds: values.team2Members || [],
          },
        ];
      } else {
        payload.participantIds = values.participantIds;
      }

      const res = await apiClient.bk.createGame(payload);
      message.success('Khởi tạo Game BK thành công!');
      onSuccess(res.game);
      onClose();
      form.resetFields();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo game. Vui lòng thử lại.';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdaptiveModal
      intent="form"
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2">
          <AppIcon icon={Trophy} size="md" className="text-amber-500" />
          <span className="font-semibold text-base">Khởi Tạo Game BK Mới</span>
        </div>
      }
      footer={null}
      width={680}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          gameType: 'INDIVIDUAL',
          metricType: 'BOOKINGS',
          dateRange: [dayjs().startOf('day'), dayjs().endOf('day')],
          targetScore: 50,
          entryFee: 50000,
          rewardPool: 500000,
          rewardDescription: 'Nhất nhận toàn bộ quỹ cược + 500k thưởng công ty',
          penaltyDescription: 'Bao trà sữa Phúc Long cả team',
          team1Name: 'Team Sói Bạc',
          team2Name: 'Team Đại Bàng',
        }}
        className="mt-4"
      >
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
            onChange={(val) => {
              setGameType(val as BkGameType);
              form.setFieldValue('gameType', val);
            }}
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
            label={<span className="font-medium">Chỉ số tính điểm KPI</span>}
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
            label={<span className="font-medium">Mục tiêu KPI cần đạt</span>}
            rules={[{ required: true, message: 'Vui lòng nhập mục tiêu' }]}
          >
            <InputNumber min={1} className="w-full" size="large" placeholder="Ví dụ: 50" />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item name="entryFee" label={<span className="font-medium">Mức cược tham gia (VNĐ/người)</span>}>
            <InputNumber
              min={0}
              step={10000}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              className="w-full"
              size="large"
              placeholder="0 nếu không cược"
            />
          </Form.Item>

          <Form.Item name="rewardPool" label={<span className="font-medium">Thưởng công ty tài trợ (VNĐ)</span>}>
            <InputNumber
              min={0}
              step={50000}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              className="w-full"
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

        {gameType === 'INDIVIDUAL' ? (
          <Form.Item
            name="participantIds"
            label={<span className="font-medium">Danh sách thành viên tham gia</span>}
            rules={[{ required: true, message: 'Chọn ít nhất một thành viên' }]}
          >
            <Select
              mode="multiple"
              placeholder="Chọn các thành viên thi đấu"
              options={staffOptions}
              size="large"
              className="w-full"
            />
          </Form.Item>
        ) : (
          <div className="space-y-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <Typography.Text strong className="text-sm">
              Chia 2 đội thi đấu đối kháng (Team Battle)
            </Typography.Text>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20">
                <Form.Item
                  name="team1Name"
                  label={<span className="font-medium text-blue-600 dark:text-blue-400">Tên Đội 1</span>}
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Team Sói Bạc" />
                </Form.Item>
                <Form.Item
                  name="team1Members"
                  label="Thành viên Đội 1"
                  rules={[{ required: true, message: 'Chọn thành viên Đội 1' }]}
                >
                  <Select mode="multiple" placeholder="Chọn thành viên" options={staffOptions} className="w-full" />
                </Form.Item>
              </div>

              <div className="p-3 rounded border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20">
                <Form.Item
                  name="team2Name"
                  label={<span className="font-medium text-red-600 dark:text-red-400">Tên Đội 2</span>}
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Team Đại Bàng" />
                </Form.Item>
                <Form.Item
                  name="team2Members"
                  label="Thành viên Đội 2"
                  rules={[{ required: true, message: 'Chọn thành viên Đội 2' }]}
                >
                  <Select mode="multiple" placeholder="Chọn thành viên" options={staffOptions} className="w-full" />
                </Form.Item>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<AppIcon icon={Sparkles} size="sm" />}
            className="!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600"
          >
            Khởi Tạo Game
          </Button>
        </div>
      </Form>
    </AdaptiveModal>
  );
}
