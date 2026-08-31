'use client';

import type { FeatureRequestContext } from '@mos-lab/shared';
import { Descriptions } from 'antd';
import { SectionCard } from '../../../../components/ui';

const AUDIENCE_LABELS: Record<FeatureRequestContext['audience'], string> = {
  SELF: 'Cá nhân người yêu cầu',
  TEAM: 'Đội / bộ phận',
  ALL_STAFF: 'Tất cả nhân viên',
  CUSTOMER: 'Khách hàng',
};

export function FeatureRequestDetails({ featureRequest }: { featureRequest: FeatureRequestContext }) {
  return (
    <SectionCard title="Nhu cầu chức năng">
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="Vì sao cần">{featureRequest.reason}</Descriptions.Item>
        <Descriptions.Item label="Người sử dụng">{AUDIENCE_LABELS[featureRequest.audience]}</Descriptions.Item>
        <Descriptions.Item label="Kết quả mong muốn">
          {featureRequest.desiredOutcome || 'Agent sẽ làm rõ trong hội thoại.'}
        </Descriptions.Item>
      </Descriptions>
    </SectionCard>
  );
}
