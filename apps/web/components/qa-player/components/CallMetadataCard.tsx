import React from 'react';
import { Card, Divider, Row, Col, Typography, Tag } from 'antd';
import { SmileOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface CallMetadataCardProps {
  logDetails: SafeAny;
  themeMode: string;
  token: SafeAny;
  formatTime: (secs: number) => string;
}

export const CallMetadataCard: React.FC<CallMetadataCardProps> = ({ logDetails, themeMode, token, formatTime }) => {
  return (
    <Card
      className="mb-4 shadow-sm"
      style={{
        background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
        borderColor: token.colorBorderSecondary,
        borderRadius: '12px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Call UUID:
          </Text>
          <div style={{ wordBreak: 'break-all', fontWeight: '500' }}>{logDetails.callUuid}</div>
        </div>
        <Divider style={{ margin: '8px 0' }} />
        <Row gutter={12}>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Telesales:
            </Text>
            <div style={{ fontWeight: '600' }}>{logDetails.staff?.displayName || `Staff - ${logDetails.staffId}`}</div>
          </Col>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Khách hàng:
            </Text>
            <div style={{ fontWeight: '600', color: token.colorPrimary }}>{logDetails.destinationNumber}</div>
          </Col>
        </Row>
        <Divider style={{ margin: '8px 0' }} />
        <Row gutter={12}>
          <Col span={8}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Thời lượng:
            </Text>
            <div>{formatTime(logDetails.duration)}</div>
          </Col>
          <Col span={8}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Tính cước:
            </Text>
            <div>{formatTime(logDetails.billSec)}</div>
          </Col>
          <Col span={8}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Kết quả:
            </Text>
            <div>
              <Tag color={logDetails.status === 'ANSWER' ? 'success' : 'error'}>{logDetails.status}</Tag>
            </div>
          </Col>
        </Row>
        <Divider style={{ margin: '8px 0' }} />
        <Row gutter={12}>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Ngày gọi:
            </Text>
            <div>{new Date(logDetails.createdAt).toLocaleString('vi-VN')}</div>
          </Col>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Tiếng cười phát hiện:
            </Text>
            <div>
              <Tag color={logDetails.laughCount > 0 ? 'purple' : 'default'} style={{ fontWeight: 'bold' }}>
                <SmileOutlined /> {logDetails.laughCount || 0} lần
              </Tag>
            </div>
          </Col>
        </Row>
      </div>
    </Card>
  );
};
export default CallMetadataCard;
