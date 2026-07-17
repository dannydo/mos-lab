import React from 'react';
import { Card, Space, Button } from 'antd';
import { SmileOutlined } from '@ant-design/icons';

interface LaughterBadgesProps {
  laughList: SafeAny[];
  currentTime: number;
  token: SafeAny;
  themeMode: string;
  seekTo: (seconds: number) => void;
  formatTime: (secs: number) => string;
}

export const LaughterBadges: React.FC<LaughterBadgesProps> = ({
  laughList,
  currentTime,
  token,
  themeMode,
  seekTo,
  formatTime,
}) => {
  if (laughList.length === 0) return null;

  return (
    <Card
      title={<span style={{ fontWeight: 'bold' }}>Tiếng cười phát hiện ({laughList.length})</span>}
      className="mb-4 shadow-sm"
      style={{
        background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
        borderColor: token.colorBorderSecondary,
        borderRadius: '12px',
      }}
      styles={{ body: { padding: '12px' } }}
    >
      <Space wrap size="small">
        {laughList.map((laugh: SafeAny, index: number) => {
          const isActive = currentTime >= laugh.start && currentTime <= laugh.end;
          return (
            <Button
              key={index}
              size="small"
              icon={<SmileOutlined style={{ color: '#722ED1' }} />}
              onClick={() => seekTo(laugh.start)}
              style={{
                borderColor: isActive ? '#722ED1' : token.colorBorder,
                background: isActive ? 'rgba(114, 46, 209, 0.08)' : undefined,
                fontWeight: isActive ? '600' : 'normal',
                borderRadius: '20px',
              }}
            >
              {formatTime(laugh.start)} - {formatTime(laugh.end)} ({Math.round(laugh.confidence * 100)}%)
            </Button>
          );
        })}
      </Space>
    </Card>
  );
};
export default LaughterBadges;
