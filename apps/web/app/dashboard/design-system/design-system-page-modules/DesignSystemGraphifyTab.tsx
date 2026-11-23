'use client';

import React from 'react';
import { Button, Typography } from 'antd';
import { Network } from 'lucide-react';
import { AppIcon } from '~/components/ui';

const { Paragraph, Title } = Typography;

export interface DesignSystemGraphifyTabProps {
  onNavigateArchitecture: () => void;
}

export function DesignSystemGraphifyTab({ onNavigateArchitecture }: DesignSystemGraphifyTabProps) {
  return (
    <div className="py-8 pt-2 text-center">
      <div className="mb-4 flex justify-center">
        <AppIcon icon={Network} size={48} className="text-blue-500" />
      </div>
      <Title level={3}>Đồng Bộ Trực Tiếp Với Knowledge Graph (Graphify)</Title>
      <Paragraph className="mx-auto max-w-2xl text-secondary">
        Trang Design System này đã được tự động đăng ký thành Node `App Page: /dashboard/design-system` trên sơ đồ
        Knowledge Graph. Đồ thị sẽ hiển thị đầy đủ các mối liên hệ kết nối giữa các UI Components, Design Tokens và các
        trang ứng dụng khác.
      </Paragraph>
      <Button type="primary" size="large" icon={<AppIcon icon={Network} size={18} />} onClick={onNavigateArchitecture}>
        Mở Sơ Đồ Kiến Trúc Knowledge Graph Ngay
      </Button>
    </div>
  );
}
