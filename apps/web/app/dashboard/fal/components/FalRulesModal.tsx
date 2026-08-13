'use client';

import React from 'react';
import { Alert, Button, Card, Divider, Modal, Space, Tag, Typography } from 'antd';
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  InfoCircleOutlined,
  MessageOutlined,
  SafetyCertificateOutlined,
  SwapOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';

const { Paragraph, Text, Title } = Typography;

type FalRulesModalProps = {
  open: boolean;
  onClose: () => void;
};

function RuleCard({
  icon,
  title,
  responsibility,
  origin,
  remediation,
  condition,
}: {
  icon: React.ReactNode;
  title: string;
  responsibility: string;
  origin: string;
  remediation: string;
  condition?: string;
}) {
  return (
    <Card
      size="small"
      className="h-full"
      title={
        <Space size={8}>
          {icon}
          <Text strong>{title}</Text>
        </Space>
      }
    >
      <Tag icon={<UserOutlined />} color="default" className="!mb-3">
        {responsibility}
      </Tag>
      <div className="space-y-3 text-sm">
        <div>
          <Text type="secondary" className="block text-xs uppercase tracking-wide">
            Ca gốc
          </Text>
          <Text>{origin}</Text>
        </div>
        <div>
          <Text type="secondary" className="block text-xs uppercase tracking-wide">
            Ca xử lý ≤25 phút
          </Text>
          <Text strong>{remediation}</Text>
        </div>
        {condition ? <Alert className="!mt-1" type="warning" showIcon message={condition} /> : null}
      </div>
    </Card>
  );
}

export function FalRulesModal({ open, onClose }: FalRulesModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={920}
      footer={
        <Button type="primary" icon={<CheckCircleFilled />} onClick={onClose}>
          Đã hiểu cách tính FAL
        </Button>
      }
      title={
        <Space size={10}>
          <SafetyCertificateOutlined />
          <span>FAL Playbook</span>
        </Space>
      }
    >
      <div className="space-y-5 py-1">
        <div>
          <Tag color="blue" icon={<InfoCircleOutlined />}>
            DÀNH CHO CC / CV / QUẢN LÝ
          </Tag>
          <Title level={3} className="!mb-1 !mt-3">
            Quyền lợi FAL trong 30 giây
          </Title>
          <Paragraph type="secondary" className="!mb-0">
            CC chọn Fix, Adjust hoặc Log ở Wings. MOS không tạo FAL — MOS chỉ giúp mọi người đối soát ca gốc, trách
            nhiệm và ledger đã chốt.
          </Paragraph>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <Card size="small">
            <Space align="start">
              <ToolOutlined className="mt-1" />
              <div>
                <Text strong>1. CC chọn loại issue</Text>
                <br />
                <Text type="secondary">Fix, Adjust hoặc Log</Text>
              </div>
            </Space>
          </Card>
          <Card size="small">
            <Space align="start">
              <SwapOutlined className="mt-1" />
              <div>
                <Text strong>2. Trace nối ca gốc</Text>
                <br />
                <Text type="secondary">Biết chính xác ai chịu trách nhiệm</Text>
              </div>
            </Space>
          </Card>
          <Card size="small">
            <Space align="start">
              <SafetyCertificateOutlined className="mt-1" />
              <div>
                <Text strong>3. Đối soát ledger</Text>
                <br />
                <Text type="secondary">Quyền lợi phải khớp staff_bonus</Text>
              </div>
            </Space>
          </Card>
        </div>

        <div>
          <Title level={5}>Chọn đúng loại, bảo vệ đúng người</Title>
          <div className="grid gap-3 md:grid-cols-3">
            <RuleCard
              icon={<ToolOutlined />}
              title="Fix — lỗi kỹ thuật CV"
              responsibility="CV ca gốc chịu trách nhiệm"
              origin="Thu hồi 100% ledger của CV. CC ca gốc giữ nguyên."
              remediation="CV +15 Chuối · CC tổng +5 Chuối"
            />
            <RuleCard
              icon={<SwapOutlined />}
              title="Adjust — CC nhận lỗi tư vấn"
              responsibility="CC ca gốc chịu trách nhiệm"
              origin="Thu hồi 100% ledger của CC. CV ca gốc giữ nguyên."
              remediation="CV +15 Chuối · CC tổng +5 Chuối"
            />
            <RuleCard
              icon={<MessageOutlined />}
              title="Log — khách đổi ý"
              responsibility="Không mặc định ai có lỗi"
              origin="Ca gốc giữ nguyên quyền lợi."
              remediation="Tua CV chạy ngay; tài chính chỉ tính sau khi Log được duyệt"
              condition="CC phải giải trình, Admin/Manager/OC duyệt. Chưa duyệt = 0 điểm, 0 thưởng; không chặn tua CV."
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Card
            size="small"
            title={
              <Space>
                <ClockCircleOutlined />
                <span>1–25 phút: tua đầu CV</span>
              </Space>
            }
          >
            <Text>
              CV được ưu tiên nhận <Text strong>khách kế tiếp</Text> ngay khi hoàn tất. Fix/Adjust nhận Chuối ngay; Log
              nhận Chuối sau approval.
            </Text>
          </Card>
          <Card
            size="small"
            title={
              <Space>
                <ClockCircleOutlined />
                <span>&gt;25 phút: tua cuối</span>
              </Space>
            }
          >
            <Text>
              CV về tua cuối. Quyền lợi thường của Fix/Adjust chạy ngay; Log chờ approval. Không cộng Chuối FAL chồng
              lên.
            </Text>
          </Card>
        </div>

        <Alert
          showIcon
          type="info"
          message="Cách tự kiểm tra trong 10 giây"
          description="Bấm Trace tại một ca → xem ca gốc và ca xử lý → đọc “Quyền lợi phải áp dụng” → so với ledger staff_bonus. Nếu khác rule hoặc thiếu ca gốc, báo quản lý trước khi chốt."
        />
        <Divider className="!my-0" />
        <Text type="secondary">
          Lưu ý: approval Log chỉ quyết định điểm và thưởng. Nó không trì hoãn tua đầu/tua cuối của CV.
        </Text>
      </div>
    </Modal>
  );
}
