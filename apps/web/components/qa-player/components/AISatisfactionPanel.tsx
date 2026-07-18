'use client';

import React from 'react';
import { Card, Typography, Rate, Tag, Divider } from 'antd';
import { RobotOutlined, SmileOutlined, MessageOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface AISatisfactionPanelProps {
  logDetails: SafeAny;
  themeMode: 'light' | 'dark';
  token: SafeAny;
}

export const AISatisfactionPanel: React.FC<AISatisfactionPanelProps> = ({ logDetails, themeMode, token }) => {
  const getSentimentDetails = (sentiment: string) => {
    switch (sentiment) {
      case 'HAPPY':
        return { emoji: '😊', label: 'Rất vui vẻ / Hài lòng cao', color: 'success', bg: 'rgba(74, 222, 128, 0.08)' };
      case 'SATISFIED':
        return { emoji: '🙂', label: 'Hài lòng / Thuận lợi', color: 'processing', bg: 'rgba(96, 165, 250, 0.08)' };
      case 'NEUTRAL':
        return { emoji: '😐', label: 'Bình thường / Trung lập', color: 'default', bg: 'rgba(156, 163, 175, 0.08)' };
      case 'FRUSTRATED':
        return { emoji: '😟', label: 'Sốt ruột / Không hài lòng', color: 'warning', bg: 'rgba(251, 191, 36, 0.08)' };
      case 'ANGRY':
        return { emoji: '😡', label: 'Tức giận / Phản đối mạnh', color: 'error', bg: 'rgba(248, 113, 113, 0.08)' };
      default:
        return { emoji: '🤖', label: 'Chưa xác định', color: 'default', bg: 'rgba(156, 163, 175, 0.08)' };
    }
  };

  const hasScore =
    logDetails?.customerSatisfactionScore !== undefined && logDetails?.customerSatisfactionScore !== null;
  const hasSentiment = !!logDetails?.customerSentiment;
  const hasAnalysis = !!logDetails?.satisfactionAnalysis;

  if (!hasScore && !hasSentiment && !hasAnalysis) {
    return null;
  }

  const sentiment = getSentimentDetails(logDetails?.customerSentiment || '');

  return (
    <Card
      className="mt-6 shadow-sm border border-slate-100 dark:border-slate-800"
      style={{
        background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
        borderRadius: '16px',
      }}
      title={
        <span className="font-bold text-base flex items-center gap-2">
          <RobotOutlined style={{ color: token.colorPrimary }} />
          Đánh giá từ Trợ lý AI (Gemini)
        </span>
      }
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        {hasScore && (
          <div>
            <div className="text-xs opacity-75 mb-1 text-slate-400 font-medium">Điểm hài lòng khách hàng</div>
            <div className="flex items-center gap-3">
              <Rate disabled value={logDetails.customerSatisfactionScore} style={{ fontSize: 20, color: '#fadb14' }} />
              <span className="text-lg font-bold text-slate-700 dark:text-slate-200">
                {logDetails.customerSatisfactionScore} / 5
              </span>
            </div>
          </div>
        )}

        {hasSentiment && (
          <div>
            <div className="text-xs opacity-75 mb-1 text-slate-400 font-medium text-left md:text-right">
              Thái độ / Cảm xúc chính
            </div>
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-dashed text-sm font-semibold"
              style={{
                backgroundColor: sentiment.bg,
                borderColor: themeMode === 'dark' ? '#333' : '#e8e8e8',
              }}
            >
              <span className="text-lg">{sentiment.emoji}</span>
              <span>{sentiment.label}</span>
            </div>
          </div>
        )}
      </div>

      {hasAnalysis && (
        <>
          <Divider className="my-3" />
          <div>
            <div className="text-xs opacity-75 mb-2 text-slate-400 font-medium flex items-center gap-1.5">
              <MessageOutlined />
              Báo cáo phân tích chi tiết
            </div>
            <Paragraph
              className="text-sm leading-relaxed mb-0 p-3.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium"
              style={{
                backgroundColor: themeMode === 'dark' ? '#141414' : '#f8fafc',
                border: themeMode === 'dark' ? '1px solid #2a2a2a' : '1px solid #f1f5f9',
              }}
            >
              {logDetails.satisfactionAnalysis}
            </Paragraph>
          </div>
        </>
      )}
    </Card>
  );
};

export default AISatisfactionPanel;
