'use client';

import React, { useState, useMemo } from 'react';
import { Modal, Form, Input, Select, Alert, Tag, Button, Typography, message, theme } from 'antd';
import { BookOpen, ShieldAlert, Sparkles, Send } from 'lucide-react';
import { MOS_BIBLE_BOOKS, type MosBibleBookKey } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { AppIcon } from '../ui';

const { Text } = Typography;
const { TextArea } = Input;

const FINANCIAL_AND_LEGAL_KEYWORDS = [
  'tiền',
  'lương',
  'thưởng',
  'tip',
  'bonus',
  'hoa hồng',
  'giá',
  'bảng giá',
  'chiết khấu',
  'pháp lý',
  'hợp đồng',
  'phạt',
  'chính sách nhân sự',
  'tài chính',
  'ngân sách',
  'doanh thu',
];

export interface MosBibleProposalModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MosBibleProposalModal({ open, onClose, onSuccess }: MosBibleProposalModalProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Watch fields for realtime tier classification
  const title = Form.useWatch('title', form) || '';
  const summary = Form.useWatch('summary', form) || '';
  const commandmentsText = Form.useWatch('commandmentsText', form) || '';
  const tagsText = Form.useWatch('tagsText', form) || '';

  const tier = useMemo(() => {
    const fullText = `${title} ${summary} ${commandmentsText} ${tagsText}`.toLowerCase();
    const hasFinancialOrLegal = FINANCIAL_AND_LEGAL_KEYWORDS.some((kw) => fullText.includes(kw));
    return hasFinancialOrLegal ? 'DANNY_FINAL' : 'CORE_TEAM';
  }, [title, summary, commandmentsText, tagsText]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const commandments = values.commandmentsText
        .split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean);

      const tags = (values.tagsText || '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);

      const examples = (values.examplesText || '')
        .split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean);

      const res = await apiClient.bible.createProposal({
        book: values.book,
        title: values.title.trim(),
        summary: values.summary.trim(),
        commandments,
        rationale: (values.rationale || '').trim(),
        examples,
        tags,
      });

      if (res.success) {
        message.success(
          tier === 'DANNY_FINAL'
            ? 'Đã gửi đề xuất! Đề xuất liên quan đến Tiền/Pháp lý sẽ được anh Danny Do duyệt cuối cùng.'
            : 'Đã gửi đề xuất quy trình! Core Team sẽ xem xét phê duyệt.'
        );
        form.resetFields();
        onClose();
        onSuccess?.();
      } else {
        message.error('Không thể gửi đề xuất. Vui lòng thử lại.');
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (errorMsg) {
        message.error(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={680}
      title={
        <div className="flex items-center gap-2 text-base font-semibold">
          <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-600">
            <AppIcon icon={BookOpen} size="sm" />
          </span>
          <span>Đề xuất Điều răn mới (Kinh Thánh mOS & Wings)</span>
        </div>
      }
      footer={[
        <Button key="cancel" onClick={onClose} disabled={submitting}>
          Hủy bỏ
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          icon={<AppIcon icon={Send} size="sm" />}
          onClick={handleSubmit}
          className="bg-amber-600 hover:bg-amber-500"
        >
          Nộp Đề Xuất
        </Button>,
      ]}
    >
      <div className="mb-4">
        <Alert
          type="warning"
          showIcon
          icon={<AppIcon icon={ShieldAlert} />}
          message="Cam kết trách nhiệm nội dung (Governance Policy)"
          description="Mọi quy tắc, kịch bản hoặc chính sách sau khi được phê duyệt sẽ được nạp chính thức vào Kinh Thánh mOS và trở thành chuẩn mực vận hành cho toàn bộ chuỗi Wings Lashes."
          className="text-xs"
        />
      </div>

      {/* Realtime Classification Badge */}
      <div
        className="mb-4 p-3 rounded-lg border flex items-center justify-between"
        style={{
          background: tier === 'DANNY_FINAL' ? token.colorWarningBg : token.colorSuccessBg,
          borderColor: tier === 'DANNY_FINAL' ? token.colorWarningBorder : token.colorSuccessBorder,
        }}
      >
        <div className="flex items-center gap-2">
          <AppIcon icon={Sparkles} size="sm" />
          <Text strong className="text-xs">
            {tier === 'DANNY_FINAL' ? 'Thẩm quyền phê duyệt Cấp 1:' : 'Thẩm quyền phê duyệt Cấp 2:'}
          </Text>
        </div>
        <Tag color={tier === 'DANNY_FINAL' ? 'volcano' : 'green'} className="m-0 font-medium">
          {tier === 'DANNY_FINAL'
            ? 'Anh Danny Do duyệt cuối cùng (Tiền / Pháp lý)'
            : 'Core Team phê duyệt (Quy trình / SOP)'}
        </Tag>
      </div>

      <Form form={form} layout="vertical" initialValues={{ book: 'SERVICE' }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Form.Item
            name="book"
            label="Thuộc Quyển"
            rules={[{ required: true, message: 'Vui lòng chọn Quyển nghiệp vụ' }]}
            className="sm:col-span-1"
          >
            <Select
              options={MOS_BIBLE_BOOKS.map((b) => ({
                label: b.label,
                value: b.key,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="title"
            label="Tiêu đề Điều răn"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề điều răn' }]}
            className="sm:col-span-2"
          >
            <Input placeholder="Ví dụ: Quy tắc kiểm tra khoảng cách an toàn chân mi" />
          </Form.Item>
        </div>

        <Form.Item
          name="summary"
          label="Tóm tắt một câu (Định nghĩa / Kết quả mong đợi)"
          rules={[{ required: true, message: 'Vui lòng nhập tóm tắt ngắn gọn' }]}
        >
          <Input placeholder="Ví dụ: Khoảng cách nối mi bắt buộc cách chân mi thật từ 0.5mm đến 1mm." />
        </Form.Item>

        <Form.Item
          name="commandmentsText"
          label="Các điều khoản bắt buộc (Mỗi dòng một điều)"
          rules={[{ required: true, message: 'Vui lòng nhập ít nhất một điều khoản' }]}
          extra="Nhập các bước hoặc nguyên tắc bắt buộc mà Chuyên Viên / Nhân sự phải tuân thủ."
        >
          <TextArea
            rows={3}
            placeholder="1. Tuyệt đối không cắm keo dính vào da mí mắt của khách.&#10;2. Dùng kính phóng đại kiểm tra toàn bộ mối nối trước khi hoàn tất."
          />
        </Form.Item>

        <Form.Item
          name="rationale"
          label="Chú giải (Lý do tồn tại theo 4 Chìa Khóa Văn Hóa Wings)"
          extra="Giải thích tại sao quy tắc này bảo đảm tính Vui Vẻ, Ân Cần, Chân Thành hoặc Khoa Học."
        >
          <TextArea
            rows={2}
            placeholder="Đảm bảo mi thật mọc tự nhiên không bị gãy rụng, mang lại sự êm nhẹ không cộm ngứa (Ân Cần & Khoa Học)."
          />
        </Form.Item>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Form.Item name="examplesText" label="Dụ ngôn thực tế (Mỗi dòng một ví dụ)">
            <TextArea rows={2} placeholder="Khách có mi tơ yếu thì tư vấn dáng mi Classic 0.07mm thay vì Volume dày." />
          </Form.Item>

          <Form.Item name="tagsText" label="Từ khóa tìm kiếm (Cách nhau bởi dấu phẩy)">
            <Input placeholder="khoảng cách mi, an toàn, Chân Thành, kỹ thuật" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
export default MosBibleProposalModal;
