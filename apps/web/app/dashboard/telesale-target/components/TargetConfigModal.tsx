'use client';

import React, { useState, useEffect } from 'react';
import { Form, InputNumber, Typography, Alert, Row, Col, Divider, Button, message } from 'antd';
import { Trophy, CheckCircle2, AlertCircle } from 'lucide-react';
import { TelesaleTargetConfigDto, TelesaleTargetOverview } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { AdaptiveModal } from '../../../../components/ui';

const { Text } = Typography;

interface TargetConfigModalProps {
  open: boolean;
  onClose: () => void;
  overview: TelesaleTargetOverview | null;
  onSuccess: () => void;
}

export const TargetConfigModal: React.FC<TargetConfigModalProps> = ({ open, onClose, overview, onSuccess }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const [stageSum, setStageSum] = useState<number>(450);
  const [teamDoneTarget, setTeamDoneTarget] = useState<number>(450);

  useEffect(() => {
    if (open && overview) {
      const initialValues = {
        teamDoneTarget: overview.teamMonth.doneTarget,
        teamBookTarget: overview.teamMonth.bookTarget,
        dailyDoneTarget: overview.teamDaily.doneTarget,
        dailyBookTarget: overview.teamDaily.bookTarget,
        dailyCallPerStaff: overview.dailyAction.callTargetPerStaff,
        staffPhuong: overview.staffTargets.find((s) => s.name.includes('Phượng'))?.doneTarget || 150,
        staffKieu: overview.staffTargets.find((s) => s.name.includes('Kiều'))?.doneTarget || 100,
        staffDiep: overview.staffTargets.find((s) => s.name.includes('Điệp'))?.doneTarget || 100,
        staffVu: overview.staffTargets.find((s) => s.name.includes('Vũ'))?.doneTarget || 100,
        stage_0_30: overview.pipelineStages.find((p) => p.key === '0_30')?.doneTarget || 200,
        stage_31_60: overview.pipelineStages.find((p) => p.key === '31_60')?.doneTarget || 110,
        stage_61_120: overview.pipelineStages.find((p) => p.key === '61_120')?.doneTarget || 80,
        stage_gt_120: overview.pipelineStages.find((p) => p.key === 'gt_120')?.doneTarget || 60,
      };
      form.setFieldsValue(initialValues);
      setTeamDoneTarget(overview.teamMonth.doneTarget);
      setStageSum(
        initialValues.stage_0_30 + initialValues.stage_31_60 + initialValues.stage_61_120 + initialValues.stage_gt_120
      );
    }
  }, [open, overview, form]);

  const handleValuesChange = (_: unknown, allValues: Record<string, number | undefined>) => {
    const s0_30 = Number(allValues.stage_0_30 || 0);
    const s31_60 = Number(allValues.stage_31_60 || 0);
    const s61_120 = Number(allValues.stage_61_120 || 0);
    const sgt120 = Number(allValues.stage_gt_120 || 0);
    setStageSum(s0_30 + s31_60 + s61_120 + sgt120);
    setTeamDoneTarget(Number(allValues.teamDoneTarget || 0));
  };

  const isMatched = stageSum === teamDoneTarget;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!isMatched) {
        message.error(`Tổng 4 nhóm (${stageSum}) chưa khớp với KPI Done của Team (${teamDoneTarget})!`);
        return;
      }

      setSubmitting(true);
      const payload: TelesaleTargetConfigDto = {
        month: overview?.month || '2026-10',
        teamDoneTarget: Number(values.teamDoneTarget),
        teamBookTarget: Number(values.teamBookTarget),
        dailyDoneTarget: Number(values.dailyDoneTarget),
        dailyBookTarget: Number(values.dailyBookTarget),
        dailyCallPerStaff: Number(values.dailyCallPerStaff),
        staffTargets: [
          { legacyStaffId: 52454, name: 'Phượng', doneTarget: Number(values.staffPhuong) },
          { legacyStaffId: 52086, name: 'Kiều', doneTarget: Number(values.staffKieu) },
          { legacyStaffId: 32268, name: 'Điệp', doneTarget: Number(values.staffDiep) },
          { legacyStaffId: 52598, name: 'Vũ', doneTarget: Number(values.staffVu) },
        ],
        stageTargets: {
          '0_30': Number(values.stage_0_30),
          '31_60': Number(values.stage_31_60),
          '61_120': Number(values.stage_61_120),
          gt_120: Number(values.stage_gt_120),
        },
      };

      await apiClient.telesaleTarget.saveConfig(payload);
      message.success('Đã lưu cấu hình mục tiêu tháng thành công!');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu cấu hình';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2 text-amber-400 font-semibold text-lg">
          <Trophy className="w-5 h-5 text-amber-400" /> Cài Đặt Mục Tiêu KPI Telesales (Tháng{' '}
          {overview?.month || '10/2026'})
        </div>
      }
      footer={[
        <Button key="cancel" onClick={onClose} className="rounded-lg">
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          disabled={!isMatched}
          onClick={handleSubmit}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg border-0 shadow-lg"
        >
          Lưu Cấu Hình
        </Button>,
      ]}
      width={720}
      className="telesale-config-modal"
      centered
    >
      <Form form={form} layout="vertical" onValuesChange={handleValuesChange} className="mt-4 space-y-4">
        {/* Row 1: KPI Team & Ngày */}
        <div>
          <Text strong className="text-amber-300 uppercase tracking-wider text-xs">
            1. Mục Tiêu Team & Ngày
          </Text>
          <Row gutter={16} className="mt-2">
            <Col xs={12} sm={6}>
              <Form.Item name="teamDoneTarget" label="KPI Team Done" rules={[{ required: true, message: 'Nhập Done' }]}>
                <InputNumber min={1} className="w-full font-bold text-amber-400" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="teamBookTarget" label="KPI Team Book" rules={[{ required: true, message: 'Nhập Book' }]}>
                <InputNumber min={1} className="w-full font-bold" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="dailyDoneTarget" label="Done / Ngày">
                <InputNumber min={1} className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="dailyBookTarget" label="Book / Ngày">
                <InputNumber min={1} className="w-full" />
              </Form.Item>
            </Col>
          </Row>
        </div>

        <Divider className="my-2 border-zinc-800" />

        {/* Row 2: KPI Cá Nhân 4 Bạn */}
        <div>
          <Text strong className="text-amber-300 uppercase tracking-wider text-xs">
            2. Chỉ Tiêu Done Từng Bạn Telesales
          </Text>
          <Row gutter={16} className="mt-2">
            <Col xs={12} sm={6}>
              <Form.Item name="staffPhuong" label="Phượng (Done)">
                <InputNumber min={1} className="w-full font-semibold" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="staffKieu" label="Kiều (Done)">
                <InputNumber min={1} className="w-full font-semibold" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="staffDiep" label="Điệp (Done)">
                <InputNumber min={1} className="w-full font-semibold" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="staffVu" label="Vũ (Done)">
                <InputNumber min={1} className="w-full font-semibold" />
              </Form.Item>
            </Col>
          </Row>
        </div>

        <Divider className="my-2 border-zinc-800" />

        {/* Row 3: Mục Tiêu Done 4 Nhóm Chu Kỳ Khách Hàng */}
        <div>
          <div className="flex justify-between items-center">
            <Text strong className="text-amber-300 uppercase tracking-wider text-xs">
              3. Phân Bổ Done 4 Nhóm Khách Hàng (Bắt buộc khớp KPI Team)
            </Text>
            <span
              className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                isMatched
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                  : 'bg-rose-950 text-rose-400 border border-rose-700'
              }`}
            >
              Tổng 4 nhóm: {stageSum} / {teamDoneTarget} Done
            </span>
          </div>

          <Row gutter={16} className="mt-3">
            <Col xs={12} sm={6}>
              <Form.Item name="stage_0_30" label="0D – 30D (Chu kỳ)" rules={[{ required: true, message: 'Nhập số' }]}>
                <InputNumber min={0} className="w-full font-bold" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item
                name="stage_31_60"
                label="31D – 60D (Miss You)"
                rules={[{ required: true, message: 'Nhập số' }]}
              >
                <InputNumber min={0} className="w-full font-bold" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item
                name="stage_61_120"
                label="61D – 120D (Comeback)"
                rules={[{ required: true, message: 'Nhập số' }]}
              >
                <InputNumber min={0} className="w-full font-bold" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item
                name="stage_gt_120"
                label="> 120D (Cua lại vợ bầu)"
                rules={[{ required: true, message: 'Nhập số' }]}
              >
                <InputNumber min={0} className="w-full font-bold text-amber-400" />
              </Form.Item>
            </Col>
          </Row>

          {!isMatched ? (
            <Alert
              type="error"
              showIcon
              icon={<AlertCircle className="w-4 h-4 text-rose-400" />}
              message={`Chưa khớp mục tiêu: Tổng 4 nhóm đang là ${stageSum} Done, lệch ${Math.abs(
                stageSum - teamDoneTarget
              )} Done so với KPI Team (${teamDoneTarget} Done). Vui lòng điều chỉnh lại.`}
              className="mt-2 text-xs"
            />
          ) : (
            <Alert
              type="success"
              showIcon
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              message={`Hợp lệ: Tổng 4 nhóm (${stageSum} Done) đã khớp 100% với KPI Team (${teamDoneTarget} Done).`}
              className="mt-2 text-xs"
            />
          )}
        </div>
      </Form>
    </AdaptiveModal>
  );
};
