'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  Row,
  Select,
  Spin,
  Switch,
  Tag,
  theme,
  Typography,
  message,
} from 'antd';
import { HeartHandshake, MessageCircle, Save, UserPlus } from 'lucide-react';
import dayjs from 'dayjs';
import { CreateCustomerInput, CustomerCreationOptionsResponse, vietnameseSearchFilter } from '@mos-lab/shared';
import { apiClient } from '../lib/api-client';
import { AdaptiveModal } from './ui/AdaptiveOverlay';

type CreateCustomerModalProps = {
  open: boolean;
  onClose: () => void;
  /** A saved customer can be selected immediately if the booking flow continues. */
  onCreated?: (customer: { id: number; name: string; phone: string }) => void;
};

const genderOptions = [
  { value: 202, label: 'Nữ' },
  { value: 203, label: 'Nam' },
];

const isForeignPhone = (phone: string | undefined): boolean => {
  const normalized = (phone || '').replace(/[\s.()-]/g, '').trim();
  return Boolean(normalized) && !/^(0|\+?84)[35789]\d{8}$/.test(normalized);
};

export default function CreateCustomerModal({ open, onClose, onCreated }: CreateCustomerModalProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm<CreateCustomerInput>();
  const [options, setOptions] = useState<CustomerCreationOptionsResponse>({ campaigns: [], advertises: [] });
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const selectedCampaignId = Form.useWatch('campaignId', form);
  const phone = Form.useWatch('phone', form);

  useEffect(() => {
    if (!open) return;

    form.resetFields();
    setSubmitError(null);
    setOptionsLoading(true);
    apiClient.customers
      .getCreationOptions()
      .then(setOptions)
      .catch(() => {
        // Sources are optional; users can still create a customer if legacy
        // campaign metadata is temporarily unavailable.
        setOptions({ campaigns: [], advertises: [] });
      })
      .finally(() => setOptionsLoading(false));
  }, [form, open]);

  useEffect(() => {
    if (!open || !phone || form.isFieldTouched('isForeign')) return;
    form.setFieldValue('isForeign', isForeignPhone(phone));
  }, [form, open, phone]);

  const advertises = useMemo(
    () =>
      selectedCampaignId
        ? options.advertises.filter((advertise) => advertise.campaignId === selectedCampaignId)
        : options.advertises,
    [options.advertises, selectedCampaignId]
  );

  const handleSubmit = async () => {
    setSubmitError(null);
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const response = await apiClient.customers.create({
        ...values,
        dateOfBirth: values.dateOfBirth ? dayjs(values.dateOfBirth).format('YYYY-MM-DD') : null,
      });

      message.success(response.message);
      window.dispatchEvent(new CustomEvent('mos-customer-updated'));
      window.dispatchEvent(new CustomEvent('mos-data-updated', { detail: { type: 'customer' } }));
      onCreated?.(response.customer);
      onClose();
    } catch (error) {
      if ((error as { errorFields?: unknown[] })?.errorFields) return;
      const apiMessage =
        (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message ||
        (error as Error)?.message;
      const friendlyMessage = apiMessage || 'Không thể thêm khách hàng. Vui lòng thử lại.';
      setSubmitError(friendlyMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdaptiveModal
      intent="form"
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2" style={{ color: token.colorPrimary }}>
          <UserPlus size={19} aria-hidden="true" />
          <span>Thêm khách hàng</span>
        </div>
      }
      zIndex={1050}
      destroyOnClose
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={submitting}>
            Đóng
          </Button>
          <Button
            type="primary"
            icon={<Save size={16} aria-hidden="true" />}
            loading={submitting}
            onClick={handleSubmit}
          >
            Lưu khách, chưa đặt lịch
          </Button>
        </div>
      }
      styles={{ body: { background: token.colorBgContainer, paddingTop: 16 } }}
    >
      <Alert
        type="info"
        showIcon
        message="Lưu khách độc lập"
        description="Sau khi lưu, hệ thống không tạo lịch hẹn. Bạn có thể tiếp tục đặt lịch ngay hoặc đóng luồng này."
        style={{ marginBottom: 16 }}
      />

      {submitError && (
        <Alert
          type="error"
          showIcon
          closable
          message="Chưa thể thêm khách"
          description={submitError}
          onClose={() => setSubmitError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical" requiredMark="optional">
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Tên khách hàng"
              name="name"
              rules={[{ required: true, message: 'Vui lòng nhập tên khách hàng.' }]}
            >
              <Input autoFocus placeholder="Ví dụ: Nguyễn Thị An" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Số điện thoại"
              name="phone"
              rules={[
                { required: true, message: 'Vui lòng nhập số điện thoại.' },
                { pattern: /^\+?[0-9\s.()-]{8,20}$/, message: 'Số điện thoại không hợp lệ.' },
              ]}
            >
              <Input inputMode="tel" placeholder="Ví dụ: 0901234567" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label={
            <span className="inline-flex items-center gap-1">
              <HeartHandshake size={15} aria-hidden="true" />
              Ai giới thiệu khách này?
              <Tag color="gold" style={{ marginInlineStart: 4 }}>
                Ưu tiên
              </Tag>
            </span>
          }
          name="referrerPhone"
          extra="Nhập SĐT của khách giới thiệu để lưu đúng quan hệ referral từ đầu."
        >
          <Input inputMode="tel" placeholder="SĐT người giới thiệu (nếu có)" />
        </Form.Item>

        <Divider orientation="left" plain>
          Thông tin hồ sơ <Typography.Text type="secondary">(tùy chọn)</Typography.Text>
        </Divider>

        <Row gutter={12}>
          <Col xs={24} md={8}>
            <Form.Item label="Giới tính" name="genderAttributeId">
              <Select
                allowClear
                placeholder="Chưa chọn"
                options={genderOptions}
                getPopupContainer={(node) => node.parentElement || document.body}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Ngày sinh" name="dateOfBirth">
              <DatePicker className="w-full" format="DD/MM/YYYY" placeholder="Chọn ngày sinh" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Ngôn ngữ" name="languageId">
              <Select
                allowClear
                placeholder="Mặc định Tiếng Việt"
                options={[
                  { value: 1, label: 'Tiếng Việt' },
                  { value: 2, label: 'English' },
                ]}
                getPopupContainer={(node) => node.parentElement || document.body}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Khách nước ngoài"
          name="isForeign"
          valuePropName="checked"
          extra="Hệ thống tự nhận diện theo SĐT; bạn có thể bật hoặc tắt để xác nhận lại."
        >
          <Switch aria-label="Khách nước ngoài" />
        </Form.Item>

        <Divider orientation="left" plain>
          <span className="inline-flex items-center gap-1">
            <MessageCircle size={15} aria-hidden="true" /> Facebook / Messenger{' '}
            <Typography.Text type="secondary">(tùy chọn)</Typography.Text>
          </span>
        </Divider>

        <Form.Item label="Tên Facebook" name="socialProfileName">
          <Input placeholder="Tên hiển thị trên Facebook" />
        </Form.Item>
        <Form.Item label="Link Facebook" name="socialProfileLink">
          <Input type="url" placeholder="https://facebook.com/..." />
        </Form.Item>
        <Form.Item label="Link Messenger" name="socialMessageLink">
          <Input type="url" placeholder="https://m.me/..." />
        </Form.Item>

        <Divider orientation="left" plain>
          Nguồn khách <Typography.Text type="secondary">(tùy chọn)</Typography.Text>
        </Divider>

        <Spin spinning={optionsLoading} size="small">
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item label="Campaign" name="campaignId">
                <Select
                  showSearch
                  allowClear
                  placeholder="Chọn campaign"
                  optionFilterProp="label"
                  filterOption={vietnameseSearchFilter}
                  options={options.campaigns.map((campaign) => ({ value: campaign.id, label: campaign.name }))}
                  onChange={() => form.setFieldValue('advertiseId', undefined)}
                  getPopupContainer={(node) => node.parentElement || document.body}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Quảng cáo" name="advertiseId">
                <Select
                  showSearch
                  allowClear
                  placeholder={selectedCampaignId ? 'Chọn quảng cáo thuộc campaign' : 'Chọn quảng cáo'}
                  optionFilterProp="label"
                  filterOption={vietnameseSearchFilter}
                  options={advertises.map((advertise) => ({ value: advertise.id, label: advertise.name }))}
                  getPopupContainer={(node) => node.parentElement || document.body}
                />
              </Form.Item>
            </Col>
          </Row>
        </Spin>

        <Typography.Paragraph type="secondary" className="mb-0 text-xs">
          Các trường này theo form khách hàng của Wings Lashes legacy. Ngoài tên và SĐT, mọi trường đều có thể để trống.
        </Typography.Paragraph>
      </Form>
    </AdaptiveModal>
  );
}
