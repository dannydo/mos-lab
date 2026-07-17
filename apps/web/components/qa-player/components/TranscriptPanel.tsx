import React from 'react';
import { Card, Spin, Typography, Button } from 'antd';

const { Text, Paragraph } = Typography;

interface TranscriptPanelProps {
  logDetails: SafeAny;
  currentTime: number;
  themeMode: string;
  token: SafeAny;
  laughList: SafeAny[];
  seekTo: (seconds: number) => void;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  logDetails,
  currentTime,
  themeMode,
  token,
  laughList,
  seekTo,
}) => {
  return (
    <Card
      title={<span style={{ fontWeight: 'bold' }}>Văn bản cuộc gọi (AI Transcript)</span>}
      className="shadow-sm"
      style={{
        background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
        borderColor: token.colorBorderSecondary,
        borderRadius: '12px',
        height: laughList.length > 0 ? 'calc(100vh - 280px)' : 'calc(100vh - 195px)',
        display: 'flex',
        flexDirection: 'column',
      }}
      styles={{ body: { overflowY: 'auto', flex: 1, padding: '16px' } }}
    >
      {logDetails.analysisStatus === 'PENDING' || logDetails.analysisStatus === 'PROCESSING' ? (
        <div className="flex flex-col justify-center items-center py-20">
          <Spin size="default" />
          <Paragraph className="mt-3 text-center" style={{ color: token.colorTextDescription }}>
            AI đang xử lý nhận diện tiếng cười và dịch giọng nói. Vui lòng quay lại sau vài giây...
          </Paragraph>
        </div>
      ) : logDetails.analysisStatus === 'FAILED' ? (
        <div className="py-10 text-center">
          <Text type="danger" style={{ fontWeight: '500' }}>
            AI xử lý thất bại
          </Text>
          {logDetails.analysisError && (
            <Paragraph type="secondary" style={{ marginTop: '8px', fontSize: '13px' }}>
              Chi tiết: {logDetails.analysisError}
            </Paragraph>
          )}
        </div>
      ) : !logDetails.transcript ? (
        <div className="py-20 text-center">
          <Text type="secondary" style={{ fontStyle: 'italic' }}>
            Không có dữ liệu văn bản. Cuộc gọi có thể không có hội thoại hoặc âm thanh trống.
          </Text>
        </div>
      ) : (
        <div>
          <div style={{ lineHeight: '1.7', fontSize: '15px' }}>
            {logDetails.transcript.split('\n').map((line: string, idx: number) => {
              const match = line.match(/^\[(\d{2}):(\d{2})\]/);
              if (match) {
                const mins = parseInt(match[1], 10);
                const secs = parseInt(match[2], 10);
                const totalSecs = mins * 60 + secs;
                const content = line.replace(/^\[\d{2}:\d{2}\]/, '').trim();
                const isClose = Math.abs(currentTime - totalSecs) < 3;

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      marginBottom: '10px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: isClose ? 'rgba(212, 168, 75, 0.08)' : 'transparent',
                      transition: 'background 0.3s ease',
                    }}
                  >
                    <Button
                      size="small"
                      type="text"
                      style={{
                        padding: 0,
                        color: token.colorPrimary,
                        fontWeight: '600',
                        fontSize: '13px',
                        height: 'auto',
                      }}
                      onClick={() => seekTo(totalSecs)}
                    >
                      {match[0]}
                    </Button>
                    <div style={{ color: token.colorText }}>{content}</div>
                  </div>
                );
              }

              return (
                <Paragraph key={idx} style={{ marginBottom: '10px', color: token.colorText }}>
                  {line}
                </Paragraph>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};
export default TranscriptPanel;
