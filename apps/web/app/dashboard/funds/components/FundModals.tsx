'use client';

import React from 'react';
import { Form, Input, InputNumber, Select, Row, Col, Button } from 'antd';
import { Phone } from 'lucide-react';
import type {
  ApproveProposalRequest,
  CreateProposalRequest,
  DisburseProposalRequest,
  Fund,
  FundProposal,
  RecordExpenseRequest,
  ReconcileAndLockPeriodRequest,
  UpdateFundConfigRequest,
} from '@mos-lab/shared';
import { AdaptiveModal, AppIcon } from '~/components/ui';

interface ExpenseModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => Promise<void>;
  loading: boolean;
  form: any;
  unitQuota?: number;
}

export function ExpenseModal({ open, onCancel, onSubmit, loading, form, unitQuota = 30000 }: ExpenseModalProps) {
  return (
    <AdaptiveModal
      title="📱 Nạp Card Cho Nhân Sự Telesale"
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          name="beneficiaryStaffName"
          label="Nhân viên Telesale nhận cước"
          rules={[{ required: true, message: 'Vui lòng nhập tên nhân viên Telesale' }]}
        >
          <Input placeholder="Ví dụ: Nguyễn Văn A (Telesale Ca Sáng)" />
        </Form.Item>

        <Row gutter={12}>
          <Col span={14}>
            <Form.Item
              name="beneficiaryPhone"
              label="Số điện thoại nhận cước"
              rules={[{ required: true, message: 'Vui lòng nhập SĐT' }]}
            >
              <Input prefix={<AppIcon icon={Phone} size="sm" />} placeholder="0987654321" />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item name="telco" label="Nhà mạng" rules={[{ required: true }]}>
              <Select
                options={[
                  { label: 'Viettel', value: 'VIETTEL' },
                  { label: 'VinaPhone', value: 'VINAPHONE' },
                  { label: 'MobiFone', value: 'MOBIFONE' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="amount"
          label="Số tiền nạp (VNĐ)"
          rules={[{ required: true, message: 'Vui lòng nhập số tiền' }]}
        >
          <InputNumber
            className="w-full tabular-nums"
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => Number(value?.replace(/\$\s?|(,*)/g, '') || 0)}
            addonAfter="đ"
          />
        </Form.Item>

        <div className="flex gap-2 mb-4">
          <Button
            size="small"
            onClick={() => {
              form.setFieldValue('amount', unitQuota);
            }}
          >
            {unitQuota.toLocaleString('vi-VN')}đ (Định Mức)
          </Button>
          <Button
            size="small"
            onClick={() => {
              form.setFieldValue('amount', 50000);
            }}
          >
            50.000đ
          </Button>
          <Button
            size="small"
            onClick={() => {
              form.setFieldValue('amount', 100000);
            }}
          >
            100.000đ
          </Button>
        </div>

        <Form.Item
          name="description"
          label="Nội dung chi"
          rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}
        >
          <Input placeholder="Nạp cước Viettel 30k cho Telesale tư vấn khách hàng" />
        </Form.Item>

        <Form.Item name="receiptUrl" label="Link ảnh chứng từ / Bill SMS nạp tiền thành công (Tùy chọn)">
          <Input placeholder="https://example.com/bill-nap-card.jpg" />
        </Form.Item>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onCancel}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={loading} className="bg-emerald-600 hover:bg-emerald-700">
            Xác Nhận Nạp Tiền (Trừ Quỹ)
          </Button>
        </div>
      </Form>
    </AdaptiveModal>
  );
}

interface ProposalModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => Promise<void>;
  loading: boolean;
  form: any;
}

export function ProposalModal({ open, onCancel, onSubmit, loading, form }: ProposalModalProps) {
  return (
    <AdaptiveModal
      title="⚡ Tạo Đề Xuất Bổ Sung Vốn Quỹ"
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          name="title"
          label="Tiêu đề đề xuất"
          rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="requestedAmount"
          label="Số tiền đề xuất bổ sung (VNĐ)"
          rules={[{ required: true, message: 'Vui lòng nhập số tiền' }]}
        >
          <InputNumber
            className="w-full tabular-nums"
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => Number(value?.replace(/\$\s?|(,*)/g, '') || 0)}
            addonAfter="đ"
          />
        </Form.Item>

        <Form.Item name="description" label="Lý do / Giải trình">
          <Input.TextArea rows={3} placeholder="Bổ sung vốn để duy trì định mức nạp card cho Telesale..." />
        </Form.Item>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onCancel}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Gửi Đề Xuất Phê Duyệt
          </Button>
        </div>
      </Form>
    </AdaptiveModal>
  );
}

interface ApprovalModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => Promise<void>;
  loading: boolean;
  form: any;
  proposal: FundProposal | null;
}

export function ApprovalModal({
  open,
  onCancel,
  onSubmit,
  loading,
  form,
  proposal,
}: ApprovalModalProps) {
  return (
    <AdaptiveModal
      title="⚖️ Phê Duyệt Chủ Trương & Hạn Mức Tối Đa"
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
    >
      <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 mb-4 text-xs text-neutral-600">
        <strong>Lưu ý Kiểm Soát Nội Bộ:</strong> Cấp duyệt (Quản lý & Danny) chỉ duyệt về mặt chủ trương và hạn mức tối đa được phép chi. Kế toán giải ngân sẽ thực hiện nghiệp vụ chuyển tiền độc lập.
      </div>

      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <div className="mb-3">
          <div className="text-xs text-neutral-500">Đề xuất:</div>
          <div className="font-semibold text-neutral-800">{proposal?.title}</div>
          <div className="text-xs text-neutral-500 mt-1">
            Số tiền đề nghị: <span className="font-bold text-neutral-700 tabular-nums">{(proposal?.requestedAmount || 0).toLocaleString('vi-VN')} đ</span>
          </div>
        </div>

        <Form.Item
          name="approvedAmount"
          label="Hạn mức tối đa được duyệt chi (VNĐ)"
          rules={[{ required: true, message: 'Vui lòng nhập số tiền duyệt' }]}
        >
          <InputNumber
            className="w-full tabular-nums"
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => Number(value?.replace(/\$\s?|(,*)/g, '') || 0)}
            addonAfter="đ"
          />
        </Form.Item>

        <Form.Item name="note" label="Ghi chú phê duyệt">
          <Input.TextArea rows={2} placeholder="Đồng ý chủ trương cấp bù vốn theo định mức..." />
        </Form.Item>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            danger
            onClick={() => {
              onSubmit({ approved: false, note: 'Từ chối bởi cấp quản lý' });
            }}
          >
            Từ Chối
          </Button>
          <Button type="primary" htmlType="submit" loading={loading} className="bg-emerald-600 hover:bg-emerald-700">
            Phê Duyệt Hạn Mức
          </Button>
        </div>
      </Form>
    </AdaptiveModal>
  );
}

interface DisburseModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => Promise<void>;
  loading: boolean;
  form: any;
  proposal: FundProposal | null;
  fund: Fund | null;
}

export function DisburseModal({
  open,
  onCancel,
  onSubmit,
  loading,
  form,
  proposal,
  fund,
}: DisburseModalProps) {
  const approvedAmount = proposal?.approvedAmount || 0;
  const toleranceAmount = fund?.toleranceAmount || 0;
  const maxAllowed = approvedAmount + toleranceAmount;

  return (
    <AdaptiveModal
      title="💳 Kế Toán Xác Nhận Thực Thi Giải Ngân"
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
    >
      <div className="bg-sky-50 p-3 rounded-lg border border-sky-200 mb-4 text-xs text-sky-900">
        <strong>Hạn mức duyệt:</strong> {approvedAmount.toLocaleString('vi-VN')} đ.
        <br />
        <strong>Dung sai cho phép:</strong> +{toleranceAmount.toLocaleString('vi-VN')} đ (Tối đa: {maxAllowed.toLocaleString('vi-VN')} đ).
        <br />
        <em>Nếu thực chuyển vượt quá hạn mức + dung sai, hệ thống sẽ tự động khóa và chuyển về Chờ duyệt lại.</em>
      </div>

      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          name="actualDisbursedAmount"
          label="Số tiền thực chuyển (VNĐ)"
          rules={[{ required: true, message: 'Vui lòng nhập số tiền thực chuyển' }]}
        >
          <InputNumber
            className="w-full tabular-nums font-bold"
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => Number(value?.replace(/\$\s?|(,*)/g, '') || 0)}
            addonAfter="đ"
          />
        </Form.Item>

        <Row gutter={12}>
          <Col span={10}>
            <Form.Item
              name="paymentMethod"
              label="Kênh chuyển"
              rules={[{ required: true, message: 'Chọn kênh chuyển' }]}
            >
              <Select
                options={[
                  { label: 'Chuyển khoản VCB', value: 'VCB' },
                  { label: 'Ví MoMo', value: 'MOMO' },
                  { label: 'Tiền mặt', value: 'CASH' },
                  { label: 'Khác', value: 'OTHER' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={14}>
            <Form.Item
              name="bankRefCode"
              label="Mã GD ngân hàng / Mã chuẩn chi"
              rules={[{ required: true, message: 'Bắt buộc nhập mã GD' }]}
            >
              <Input placeholder="Ví dụ: VCB123456789" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="receiptUrl" label="Ảnh chụp bill chuyển khoản / Ủy nhiệm chi (URL)">
          <Input placeholder="https://example.com/unc-vcb.jpg" />
        </Form.Item>

        <Form.Item name="disbursementNote" label="Ghi chú giải ngân">
          <Input placeholder="Đã chuyển tiền vào tài khoản thủ quỹ..." />
        </Form.Item>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onCancel}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={loading} className="bg-sky-600 hover:bg-sky-700">
            Xác Nhận Đã Chuyển Tiền (Ghi Sổ Quỹ)
          </Button>
        </div>
      </Form>
    </AdaptiveModal>
  );
}

interface ReconcileModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => Promise<void>;
  loading: boolean;
  form: any;
  currentBalance?: number;
}

export function ReconcileModal({
  open,
  onCancel,
  onSubmit,
  loading,
  form,
  currentBalance = 0,
}: ReconcileModalProps) {
  return (
    <AdaptiveModal
      title="🔒 Đối Soát & Chốt Kỳ Sổ Quỹ (Period Lock)"
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
    >
      <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 mb-4 text-xs text-purple-950">
        <strong>Quy tắc Bất Biến Lịch Sử:</strong> Khi bấm chốt kỳ, toàn bộ giao dịch trong kỳ sẽ bị KHÓA CỨNG. Không ai được sửa, xóa hoặc chèn lùi ngày. Số dư cuối kỳ này sẽ tự động trở thành số dư đầu kỳ tiếp theo.
      </div>

      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <div className="mb-3 text-sm">
          Số dư sổ sách hệ thống: <span className="font-bold tabular-nums text-neutral-800">{currentBalance.toLocaleString('vi-VN')} đ</span>
        </div>

        <Form.Item
          name="actualBalance"
          label="Số dư thực tế kiểm kê (VNĐ)"
          rules={[{ required: true, message: 'Vui lòng nhập số dư kiểm kê thực tế' }]}
        >
          <InputNumber
            className="w-full tabular-nums font-bold"
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => Number(value?.replace(/\$\s?|(,*)/g, '') || 0)}
            addonAfter="đ"
          />
        </Form.Item>

        <Form.Item name="notes" label="Lý do / Giải trình chênh lệch (nếu có)">
          <Input.TextArea rows={3} placeholder="Khớp 100% hoặc giải trình chênh lệch..." />
        </Form.Item>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onCancel}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={loading} className="bg-purple-600 hover:bg-purple-700">
            Xác Nhận Khóa Sổ & Chuyển Kỳ Mới
          </Button>
        </div>
      </Form>
    </AdaptiveModal>
  );
}

interface ConfigModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => Promise<void>;
  loading: boolean;
  form: any;
}

export function ConfigModal({ open, onCancel, onSubmit, loading, form }: ConfigModalProps) {
  return (
    <AdaptiveModal
      title="⚙️ Cấu Hình Quỹ Hoạt Động"
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item name="maxQuota" label="Hạn mức tối đa của Quỹ (VNĐ)">
          <InputNumber className="w-full tabular-nums" addonAfter="đ" />
        </Form.Item>

        <Form.Item name="unitQuota" label="Định mức chi mỗi lần (VNĐ)">
          <InputNumber className="w-full tabular-nums" addonAfter="đ" />
        </Form.Item>

        <Form.Item name="alertThresholdPercent" label="Ngưỡng cảnh báo bổ sung (% đã sử dụng)">
          <InputNumber min={1} max={99} className="w-full tabular-nums" addonAfter="%" />
        </Form.Item>

        <Form.Item name="toleranceMode" label="Chế độ Dung Sai (Tolerance Mode)">
          <Select
            options={[
              { label: 'STRICT (Chi <= Duyệt, vượt 1 đồng cũng chặn)', value: 'STRICT' },
              { label: 'TOLERANCE_FIXED (Cho phép lệch dung sai cố định)', value: 'TOLERANCE_FIXED' },
            ]}
          />
        </Form.Item>

        <Form.Item name="toleranceAmount" label="Số tiền dung sai tối đa (VNĐ)">
          <InputNumber className="w-full tabular-nums" addonAfter="đ" />
        </Form.Item>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onCancel}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Lưu Cấu Hình
          </Button>
        </div>
      </Form>
    </AdaptiveModal>
  );
}
