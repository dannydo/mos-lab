'use client';

import React from 'react';
import { Card, Form, Radio, Select, Input, Button, Rate, Checkbox, Space, Alert } from 'antd';
import { CheckOutlined, CloseOutlined, FormOutlined, TagOutlined, StarOutlined } from '@ant-design/icons';

interface QAEvaluationFormProps {
  happyCallStatus: string;
  setHappyCallStatus: (status: string) => void;
  happyCallReason: string;
  setHappyCallReason: (reason: string) => void;
  qaNotes: string;
  setQaNotes: (notes: string) => void;
  qaScore: number;
  setQaScore: (score: number) => void;
  qaTags: string[];
  setQaTags: (tags: string[]) => void;
  qaChecklist: Record<string, boolean>;
  setQaChecklist: (checklist: Record<string, boolean>) => void;
  submitting: boolean;
  handleVerifySubmit: () => Promise<void>;
  themeMode: 'light' | 'dark';
  token: SafeAny;
  disabled?: boolean;
}

const CHECKLIST_ITEMS = [
  { key: 'greeting', label: 'Chào khách đúng chuẩn' },
  { key: 'needs_discovery', label: 'Có hỏi nhu cầu khách hàng' },
  { key: 'service_intro', label: 'Giới thiệu dịch vụ rõ ràng' },
  { key: 'handling_objections', label: 'Xử lý phản đối tốt' },
  { key: 'closing_deal', label: 'Chốt sale / đặt lịch thành công' },
  { key: 'friendly_professional', label: 'Thái độ thân thiện, chuyên nghiệp' },
  { key: 'polite_ending', label: 'Kết thúc cuộc gọi lịch sự' },
  { key: 'australian_warranty', label: 'Bảo hành kiểu Úc' },
  { key: 'diamond_program', label: 'Giới thiệu chương trình kim cương' },
];

const PRESET_TAGS = [
  { value: 'Để training', label: 'Để training' },
  { value: 'Xuất sắc', label: 'Xuất sắc' },
  { value: 'Lỗi quy trình', label: 'Lỗi quy trình' },
  { value: 'Cần coaching', label: 'Cần coaching' },
];

export const QAEvaluationForm: React.FC<QAEvaluationFormProps> = ({
  happyCallStatus,
  setHappyCallStatus,
  happyCallReason,
  setHappyCallReason,
  qaNotes,
  setQaNotes,
  qaScore,
  setQaScore,
  qaTags,
  setQaTags,
  qaChecklist,
  setQaChecklist,
  submitting,
  handleVerifySubmit,
  themeMode,
  token,
  disabled = false,
}) => {
  const handleCheckboxChange = (key: string, checked: boolean) => {
    if (disabled) return;
    setQaChecklist({
      ...qaChecklist,
      [key]: checked,
    });
  };

  return (
    <Card
      title={
        <span className="font-bold text-base flex items-center gap-2">
          <FormOutlined style={{ color: token.colorPrimary }} />
          Biểu mẫu đánh giá chất lượng QA
        </span>
      }
      className="shadow-sm border border-slate-100 dark:border-slate-800"
      style={{
        background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
        borderRadius: '16px',
      }}
    >
      {disabled && (
        <div className="mb-4">
          <Alert
            message="Không thể đánh giá"
            description="Cuộc gọi này chưa có file ghi âm hoặc dữ liệu hội thoại từ OmiCall để thực hiện thẩm định."
            type="warning"
            showIcon
          />
        </div>
      )}

      <Form layout="vertical">
        {/* Manager Score Rating */}
        <Form.Item
          label={
            <span className="font-semibold flex items-center gap-1.5">
              <StarOutlined />
              Điểm đánh giá của quản lý (1-5 sao):
            </span>
          }
        >
          <div className="flex items-center gap-3">
            <Rate
              value={qaScore || 0}
              onChange={setQaScore}
              style={{ fontSize: 24, color: '#fadb14' }}
              disabled={disabled || submitting}
            />
            {qaScore > 0 && (
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">({qaScore} sao)</span>
            )}
          </div>
        </Form.Item>

        {/* QA Criteria Checklist */}
        <Form.Item label={<span className="font-semibold">Tiêu chí thẩm định cuộc gọi:</span>} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1.5 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/35">
            {CHECKLIST_ITEMS.map((item) => (
              <Checkbox
                key={item.key}
                checked={!!qaChecklist[item.key]}
                onChange={(e) => handleCheckboxChange(item.key, e.target.checked)}
                className="text-xs font-medium py-1 text-slate-700 dark:text-slate-300"
                disabled={disabled}
              >
                {item.label}
              </Checkbox>
            ))}
          </div>
        </Form.Item>

        {/* Tags Selection */}
        <Form.Item
          label={
            <span className="font-semibold flex items-center gap-1.5">
              <TagOutlined />
              Nhãn / Phân loại góp ý:
            </span>
          }
        >
          <Select
            mode="tags"
            style={{ width: '100%' }}
            placeholder="Gõ nhãn tự do hoặc chọn nhãn có sẵn..."
            value={qaTags}
            onChange={setQaTags}
            options={PRESET_TAGS}
            className="rounded-md"
            disabled={disabled}
          />
        </Form.Item>

        {/* Happy Call Status */}
        <Form.Item label={<span className="font-semibold">Trạng thái Happy Call:</span>} required>
          <Radio.Group
            value={happyCallStatus}
            onChange={(e) => setHappyCallStatus(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            className="w-full flex gap-1"
            disabled={disabled}
          >
            <Radio.Button
              value="APPROVED"
              className="flex-1 text-center"
              style={{ borderColor: happyCallStatus === 'APPROVED' ? '#52C41A' : undefined }}
            >
              <CheckOutlined style={{ color: '#52C41A' }} /> Đồng ý
            </Radio.Button>
            <Radio.Button
              value="REJECTED"
              className="flex-1 text-center"
              style={{ borderColor: happyCallStatus === 'REJECTED' ? '#FF4D4F' : undefined }}
            >
              <CloseOutlined style={{ color: '#FF4D4F' }} /> Từ chối
            </Radio.Button>
            <Radio.Button
              value="PENDING_APPROVAL"
              className="flex-1 text-center"
              style={{ borderColor: happyCallStatus === 'PENDING_APPROVAL' ? '#FAAD14' : undefined }}
            >
              Chờ duyệt
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        {/* Conditional Happy Call Reason */}
        {(happyCallStatus === 'APPROVED' || happyCallStatus === 'REJECTED') && (
          <Form.Item label={<span className="font-semibold">Lý do cụ thể:</span>}>
            <Select
              value={happyCallReason}
              onChange={setHappyCallReason}
              placeholder="Chọn lý do phân loại..."
              className="rounded-md"
              disabled={disabled}
              options={
                happyCallStatus === 'APPROVED'
                  ? [
                      { value: 'auto_180s', label: 'Cuộc gọi tự động đạt ≥ 180 giây' },
                      { value: 'auto_laughter_30s', label: 'Cuộc gọi tự động đạt ≥ 30 giây + có tiếng cười' },
                      { value: 'manual_approved', label: 'Duyệt thủ công bởi quản lý' },
                    ]
                  : [
                      { value: 'no_show_outcome', label: 'Khách hàng không phản hồi thực chất' },
                      { value: 'wrong_number', label: 'Sai số điện thoại / Nhầm máy' },
                      { value: 'short_spam', label: 'Cuộc gọi rác / thời lượng quá ngắn' },
                      { value: 'other', label: 'Lý do khác' },
                    ]
              }
            />
          </Form.Item>
        )}

        {/* Free text Notes */}
        <Form.Item label={<span className="font-semibold">Nhận xét chi tiết của quản lý:</span>}>
          <Input.TextArea
            rows={3}
            value={qaNotes || ''}
            onChange={(e) => setQaNotes(e.target.value)}
            placeholder="Nhập ghi chú chi tiết, lời khuyên hoặc góp ý cụ thể cho telesales..."
            className="rounded-lg"
            disabled={disabled}
          />
        </Form.Item>

        {/* Submit */}
        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            onClick={handleVerifySubmit}
            loading={submitting}
            disabled={disabled}
            style={{
              width: '100%',
              background: disabled ? '#d9d9d9' : '#D4A84B',
              borderColor: disabled ? '#d9d9d9' : '#D4A84B',
              color: disabled ? 'rgba(0, 0, 0, 0.25)' : 'black',
              fontWeight: 'bold',
              height: '42px',
              borderRadius: '10px',
              boxShadow: disabled ? 'none' : '0 4px 12px rgba(212, 168, 75, 0.2)',
            }}
            className={disabled ? '' : 'hover:scale-[1.01] active:scale-[0.99] transition-all duration-150'}
          >
            Lưu Kết Quả Thẩm Định
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default QAEvaluationForm;
