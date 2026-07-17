import React from 'react';
import { Card, Form, Radio, Select, Input, Button } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';

interface QAVerificationFormProps {
  happyCallStatus: string;
  setHappyCallStatus: (status: string) => void;
  happyCallReason: string;
  setHappyCallReason: (reason: string) => void;
  qaNotes: string;
  setQaNotes: (notes: string) => void;
  submitting: boolean;
  handleVerifySubmit: () => Promise<void>;
  themeMode: string;
  token: SafeAny;
}

export const QAVerificationForm: React.FC<QAVerificationFormProps> = ({
  happyCallStatus,
  setHappyCallStatus,
  happyCallReason,
  setHappyCallReason,
  qaNotes,
  setQaNotes,
  submitting,
  handleVerifySubmit,
  themeMode,
  token,
}) => {
  return (
    <Card
      title={<span style={{ fontWeight: 'bold' }}>Biểu mẫu đánh giá QA</span>}
      className="shadow-sm"
      style={{
        background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
        borderColor: token.colorBorderSecondary,
        borderRadius: '12px',
      }}
    >
      <Form layout="vertical">
        <Form.Item label={<span style={{ fontWeight: '500' }}>Trạng thái Happy Call:</span>} required>
          <Radio.Group
            value={happyCallStatus}
            onChange={(e) => setHappyCallStatus(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            className="w-full flex justify-between gap-1"
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

        {(happyCallStatus === 'APPROVED' || happyCallStatus === 'REJECTED') && (
          <Form.Item label={<span style={{ fontWeight: '500' }}>Lý do (Phân loại):</span>}>
            <Select
              value={happyCallReason}
              onChange={setHappyCallReason}
              placeholder="Chọn lý do cụ thể..."
              options={
                happyCallStatus === 'APPROVED'
                  ? [
                      { value: 'auto_180s', label: 'Cuộc gọi tự động đạt ≥ 180 giây' },
                      { value: 'auto_laughter_30s', label: 'Cuộc gọi tự động đạt ≥ 30 giây + có tiếng cười' },
                      { value: 'manual_approved', label: 'Duyệt thủ công bởi QA Manager' },
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

        <Form.Item label={<span style={{ fontWeight: '500' }}>Ghi chú thẩm định QA:</span>}>
          <Input.TextArea
            rows={3}
            value={qaNotes}
            onChange={(e) => setQaNotes(e.target.value)}
            placeholder="Nhập ghi chú phản hồi, đánh giá ngữ cảnh cuộc gọi tại đây..."
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            onClick={handleVerifySubmit}
            loading={submitting}
            style={{
              width: '100%',
              background: '#D4A84B',
              borderColor: '#D4A84B',
              color: 'black',
              fontWeight: '600',
              height: '40px',
              borderRadius: '8px',
            }}
          >
            Lưu Kết Quả Thẩm Định
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};
export default QAVerificationForm;
