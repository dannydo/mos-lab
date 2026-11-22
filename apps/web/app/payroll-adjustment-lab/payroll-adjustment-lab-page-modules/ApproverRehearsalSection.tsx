'use client';

import { Alert, Button, Card, Segmented, Space, Typography } from 'antd';
import type {
  PayrollAdjustmentLabApprovalCheckResponse,
  PayrollAdjustmentLabApproverGroupResponse,
} from '@mos-lab/shared';
import { StatusTag } from '~/components/ui';

const { Text } = Typography;

interface ApproverRehearsalSectionProps {
  approverGroup: PayrollAdjustmentLabApproverGroupResponse['group'] | null;
  requesterStaffId: number | null;
  approverStaffId: number | null;
  approvalResult: PayrollAdjustmentLabApprovalCheckResponse | null;
  approvalLoading: boolean;
  onRequesterChange: (staffId: number) => void;
  onApproverChange: (staffId: number) => void;
  onRunApprovalCheck: () => void;
}

export function ApproverRehearsalSection({
  approverGroup,
  requesterStaffId,
  approverStaffId,
  approvalResult,
  approvalLoading,
  onRequesterChange,
  onApproverChange,
  onRunApprovalCheck,
}: ApproverRehearsalSectionProps) {
  return (
    <>
      <Card size="small" title="Nhóm duyệt Adjustment">
        {approverGroup ? (
          <Space direction="vertical" size={8} className="w-full">
            <Text strong>{approverGroup.name}</Text>
            <Space wrap>
              {approverGroup.members.map((member) => (
                <StatusTag key={member.displayName} status="purple" label={member.displayName} />
              ))}
            </Space>
            <Text type="secondary">
              Người tạo case không thể tự duyệt. Nhóm này chỉ duyệt hoặc từ chối; chưa có quyền post tiền.
            </Text>
          </Space>
        ) : (
          <Text type="secondary">Đang tải nhóm duyệt local…</Text>
        )}
      </Card>

      <Card size="small" title="Thử quyền duyệt local">
        {approverGroup && requesterStaffId !== null && approverStaffId !== null ? (
          <Space direction="vertical" size={12} className="w-full">
            <Text type="secondary">Đây là rehearsal quyền hạn: không tạo draft, audit hoặc payout.</Text>
            <div>
              <Text strong>Người tạo draft mô phỏng</Text>
              <Segmented<number>
                className="mt-2 w-full"
                options={approverGroup.members.map((member) => ({
                  label: member.displayName,
                  value: member.staffId,
                }))}
                value={requesterStaffId}
                onChange={onRequesterChange}
              />
            </div>
            <div>
              <Text strong>Người duyệt thử</Text>
              <Segmented<number>
                className="mt-2 w-full"
                options={[
                  ...approverGroup.members.map((member) => ({ label: member.displayName, value: member.staffId })),
                  { label: 'Người ngoài nhóm', value: 0 },
                ]}
                value={approverStaffId}
                onChange={onApproverChange}
              />
            </div>
            <Button type="default" loading={approvalLoading} onClick={onRunApprovalCheck}>
              Kiểm tra quyền duyệt local
            </Button>
            {approvalResult ? (
              <Alert type={approvalResult.allowed ? 'success' : 'warning'} showIcon message={approvalResult.reason} />
            ) : null}
          </Space>
        ) : (
          <Text type="secondary">Đang tải thành viên local…</Text>
        )}
      </Card>
    </>
  );
}
