'use client';

import { Alert, Typography } from 'antd';
import { StatusTag } from '~/components/ui';

const { Title, Paragraph } = Typography;

interface LabPageHeaderSectionProps {
  safeDevEnabled: boolean | null;
}

export function LabPageHeaderSection({ safeDevEnabled }: LabPageHeaderSectionProps) {
  return (
    <>
      <div>
        <StatusTag status="processing" label="LOCAL-ONLY" />
        <Title level={1} className="mb-2 mt-3!">
          Payroll Adjustment Lab
        </Title>
        <Paragraph className="max-w-3xl text-base">
          Màn cùng kiểm thử case Adjustment. Dữ liệu là mô phỏng, calculator chạy từ backend local; không tạo case,
          không ghi database, không đổi payslip và không thể chi tiền.
        </Paragraph>
      </div>

      {safeDevEnabled === false ? (
        <Alert
          type="warning"
          showIcon
          message="Chế độ Safe Dev chưa được bật trên API server này"
          description="Các endpoint mô phỏng /api/safe-dev/* chỉ khả dụng khi backend đang chạy ở chế độ Safe Dev."
        />
      ) : null}

      <Alert
        type="info"
        showIcon
        message="Quy tắc đang thử"
        description="Kỳ nguồn phải LOCKED; kỳ nhận phải OPEN; snapshot của cùng một người phải khớp; kết quả chỉ là delta của kỳ hiện tại để chờ duyệt."
      />
    </>
  );
}
