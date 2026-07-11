'use client';

import React, { useState, useEffect } from 'react';
import { Drawer, Form, InputNumber, Row, Col, Space, Button, Typography, Divider, message, theme } from 'antd';
import api from '../../../../lib/api';

const { Title } = Typography;

interface SalaryConfigDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export default function SalaryConfigDrawer({ open, onClose, onSaveSuccess }: SalaryConfigDrawerProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load config when open becomes true
  useEffect(() => {
    if (!open) return;

    const fetchConfig = async () => {
      setLoading(true);
      try {
        const res = await api.get('/kpi/salary-config');
        const c = res.data;
        
        // Map tiers back to flat fields for AntD Form
        const fullSet0 = c.clientBonusFullSet.discount0;
        const fullSet30 = c.clientBonusFullSet.discount30;
        const fullSet50 = c.clientBonusFullSet.discount50;
        const fullSetMore = c.clientBonusFullSet.discountMore;

        const refill30 = c.clientBonusRefill.discount30;
        const refill50 = c.clientBonusRefill.discount50;
        const refillMore = c.clientBonusRefill.discountMore;

        const done100 = c.doneBonusTiers.find((t: any) => t.minCount === 100)?.bonus ?? 0;
        const done150 = c.doneBonusTiers.find((t: any) => t.minCount === 150)?.bonus ?? 0;
        const done200 = c.doneBonusTiers.find((t: any) => t.minCount === 200)?.bonus ?? 0;
        const done250 = c.doneBonusTiers.find((t: any) => t.minCount === 250)?.bonus ?? 0;
        const done300 = c.doneBonusTiers.find((t: any) => t.minCount === 300)?.bonus ?? 0;
        const done350 = c.doneBonusTiers.find((t: any) => t.minCount === 350)?.bonus ?? 0;
        const done400 = c.doneBonusTiers.find((t: any) => t.minCount === 400)?.bonus ?? 0;
        const done450 = c.doneBonusTiers.find((t: any) => t.minCount === 450)?.bonus ?? 0;
        const done500 = c.doneBonusTiers.find((t: any) => t.minCount === 500)?.bonus ?? 0;

        const missed10 = c.missedBonusTiers.find((t: any) => t.maxRate === 10)?.bonus ?? 0;
        const missed15 = c.missedBonusTiers.find((t: any) => t.maxRate === 15)?.bonus ?? 0;
        const missed20 = c.missedBonusTiers.find((t: any) => t.maxRate === 20)?.bonus ?? 0;
        const missed25 = c.missedBonusTiers.find((t: any) => t.maxRate === 25)?.bonus ?? 0;
        const missed100 = c.missedBonusTiers.find((t: any) => t.maxRate === 100)?.bonus ?? 0;

        const rev50 = parseFloat(((c.revBonusTiers.find((t: any) => t.minRev === 50000000)?.rate || 0) * 100).toFixed(4));
        const rev100 = parseFloat(((c.revBonusTiers.find((t: any) => t.minRev === 100000000)?.rate || 0) * 100).toFixed(4));
        const rev150 = parseFloat(((c.revBonusTiers.find((t: any) => t.minRev === 150000000)?.rate || 0) * 100).toFixed(4));
        const rev200 = parseFloat(((c.revBonusTiers.find((t: any) => t.minRev === 200000000)?.rate || 0) * 100).toFixed(4));
        const rev250 = parseFloat(((c.revBonusTiers.find((t: any) => t.minRev === 250000000)?.rate || 0) * 100).toFixed(4));
        const rev300 = parseFloat(((c.revBonusTiers.find((t: any) => t.minRev === 300000000)?.rate || 0) * 100).toFixed(4));

        form.setFieldsValue({
          baseSalary: c.baseSalary,
          tipsPercent: c.tipsPercent,
          fullSet0,
          fullSet30,
          fullSet50,
          fullSetMore,
          refill30,
          refill50,
          refillMore,
          done100,
          done150,
          done200,
          done250,
          done300,
          done350,
          done400,
          done450,
          done500,
          missed10,
          missed15,
          missed20,
          missed25,
          missed100,
          rev50,
          rev100,
          rev150,
          rev200,
          rev250,
          rev300
        });
      } catch (err: any) {
        console.error('Load config error:', err);
        message.error('Không thể tải thông tin cấu hình lương.');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [open, form]);

  const handleSaveConfig = async (values: any) => {
    setSaving(true);
    const payload = {
      baseSalary: values.baseSalary,
      tipsPercent: values.tipsPercent,
      clientBonusRefill: {
        discount30: values.refill30,
        discount50: values.refill50,
        discountMore: values.refillMore
      },
      clientBonusFullSet: {
        discount0: values.fullSet0,
        discount30: values.fullSet30,
        discount50: values.fullSet50,
        discountMore: values.fullSetMore
      },
      doneBonusTiers: [
        { minCount: 100, bonus: values.done100 },
        { minCount: 150, bonus: values.done150 },
        { minCount: 200, bonus: values.done200 },
        { minCount: 250, bonus: values.done250 },
        { minCount: 300, bonus: values.done300 },
        { minCount: 350, bonus: values.done350 },
        { minCount: 400, bonus: values.done400 },
        { minCount: 450, bonus: values.done450 },
        { minCount: 500, bonus: values.done500 }
      ],
      missedBonusTiers: [
        { maxRate: 10, bonus: values.missed10 },
        { maxRate: 15, bonus: values.missed15 },
        { maxRate: 20, bonus: values.missed20 },
        { maxRate: 25, bonus: values.missed25 },
        { maxRate: 100, bonus: values.missed100 }
      ],
      revBonusTiers: [
        { minRev: 50000000, rate: values.rev50 / 100 },
        { minRev: 100000000, rate: values.rev100 / 100 },
        { minRev: 150000000, rate: values.rev150 / 100 },
        { minRev: 200000000, rate: values.rev200 / 100 },
        { minRev: 250000000, rate: values.rev250 / 100 },
        { minRev: 300000000, rate: values.rev300 / 100 }
      ]
    };

    try {
      await api.post('/kpi/salary-config', payload);
      message.success('Đã lưu cấu hình công thức lương mới!');
      onSaveSuccess();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi lưu cấu hình công thức.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={<strong>Cấu Hình Công Thức Lương & Thưởng Online Consultant</strong>}
      placement="right"
      width={600}
      onClose={onClose}
      open={open}
      extra={
        <Space>
          <Button onClick={onClose}>Hủy</Button>
          <Button 
            type="primary" 
            onClick={() => form.submit()} 
            loading={saving}
            style={{ background: '#D4A84B', borderColor: '#D4A84B', color: 'black' }}
          >
            Lưu thay đổi
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSaveConfig}
        requiredMark={false}
      >
        {/* SECTION 1: BASIC INFORMATION */}
        <Title level={5} style={{ color: token.colorPrimary, marginTop: 0 }}>1. Lương Cơ Bản & Tips</Title>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Lương cứng cơ bản (Based)"
              name="baseSalary"
              rules={[{ required: true, message: 'Vui lòng nhập lương cơ bản' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                addonAfter="đ"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Phần trăm thưởng Tips"
              name="tipsPercent"
              rules={[{ required: true, message: 'Vui lòng nhập tỷ lệ Tips' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={100}
                addonAfter="%"
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '12px 0' }} />

        {/* SECTION 2: CLIENT BOOKING BONUS (FULL SET) */}
        <Title level={5} style={{ color: token.colorPrimary }}>2. Thưởng Check-in Nối Mi Mới (Full Set)</Title>
        <Row gutter={12}>
          <Col span={6}>
            <Form.Item label="Không giảm (0%)" name="fullSet0" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/(,*)/g, '')} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Giảm <= 30%" name="fullSet30" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/(,*)/g, '')} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Giảm <= 50%" name="fullSet50" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/(,*)/g, '')} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Giảm cực lớn" name="fullSetMore" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/(,*)/g, '')} />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '12px 0' }} />

        {/* SECTION 3: CLIENT BOOKING BONUS (REFILL) */}
        <Title level={5} style={{ color: token.colorPrimary }}>3. Thưởng Check-in Dặm Mi (Refill)</Title>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Giảm <= 30%" name="refill30" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/(,*)/g, '')} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Giảm <= 50%" name="refill50" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/(,*)/g, '')} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Giảm cực lớn" name="refillMore" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/(,*)/g, '')} />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '12px 0' }} />

        {/* SECTION 4: DONE COUNT TIERS */}
        <Title level={5} style={{ color: token.colorPrimary }}>4. Thưởng Mốc Đạt Khách Hoàn Thành (DONE)</Title>
        <Row gutter={[8, 8]}>
          <Col span={8}>
            <Form.Item label="Đạt >= 100" name="done100" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/(,*)/g, '')} /></Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Đạt >= 150" name="done150" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/(,*)/g, '')} /></Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Đạt >= 200" name="done200" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/(,*)/g, '')} /></Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Đạt >= 250" name="done250" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/(,*)/g, '')} /></Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Đạt >= 300" name="done300" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/(,*)/g, '')} /></Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Đạt >= 350" name="done350" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/(,*)/g, '')} /></Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Đạt >= 400" name="done400" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/(,*)/g, '')} /></Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Đạt >= 450" name="done450" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/(,*)/g, '')} /></Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Đạt >= 500" name="done500" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/(,*)/g, '')} /></Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '12px 0' }} />

        {/* SECTION 5: MISSED CALL RATES TIERS */}
        <Title level={5} style={{ color: token.colorPrimary }}>5. Thưởng/Phạt Tỷ Lệ Lỡ Hẹn (Missed Call Rate)</Title>
        <Row gutter={[8, 8]}>
          <Col span={12}>
            <Form.Item label="Tỷ lệ lỡ <= 10% (Thưởng)" name="missed10" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/(,*)/g, '')} /></Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Tỷ lệ lỡ <= 15% (Thưởng)" name="missed15" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/(,*)/g, '')} /></Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Tỷ lệ lỡ <= 20% (Hòa)" name="missed20" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/(,*)/g, '')} /></Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Tỷ lệ lỡ <= 25% (Hòa)" name="missed25" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/(,*)/g, '')} /></Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Tỷ lệ lỡ > 25% (Phạt)" name="missed100" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v!.replace(/(,*)/g, '')} /></Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '12px 0' }} />

        {/* SECTION 6: NET REVENUE RATES */}
        <Title level={5} style={{ color: token.colorPrimary }}>6. % Thưởng Doanh Thu Net (REV)</Title>
        <Row gutter={[8, 8]}>
          <Col span={8}>
            <Form.Item label="Doanh thu >= 50M" name="rev50" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} max={10} step={0.1} addonAfter="%" /></Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Doanh thu >= 100M" name="rev100" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} max={10} step={0.1} addonAfter="%" /></Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Doanh thu >= 150M" name="rev150" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} max={10} step={0.1} addonAfter="%" /></Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Doanh thu >= 200M" name="rev200" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} max={10} step={0.1} addonAfter="%" /></Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Doanh thu >= 250M" name="rev250" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} max={10} step={0.1} addonAfter="%" /></Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Doanh thu >= 300M" name="rev300" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} max={10} step={0.1} addonAfter="%" /></Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
}
