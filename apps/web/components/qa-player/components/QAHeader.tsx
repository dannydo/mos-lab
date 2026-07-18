'use client';

import React from 'react';
import { Avatar, Tag, Space, Typography, Tooltip, Rate } from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface QAHeaderProps {
  logDetails: SafeAny;
  themeMode: 'light' | 'dark';
  token: SafeAny;
  formatTime: (secs: number) => string;
}

export const QAHeader: React.FC<QAHeaderProps> = ({ logDetails, themeMode, token, formatTime }) => {
  const getHappyCallBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Tag
            color="success"
            icon={<CheckCircleOutlined />}
            className="px-3 py-1 text-sm font-semibold rounded-full border border-emerald-500/20"
          >
            Đồng Ý
          </Tag>
        );
      case 'REJECTED':
        return (
          <Tag
            color="error"
            icon={<CloseCircleOutlined />}
            className="px-3 py-1 text-sm font-semibold rounded-full border border-rose-500/20"
          >
            Từ Chối
          </Tag>
        );
      case 'PENDING_APPROVAL':
        return (
          <Tag
            color="warning"
            icon={<ExclamationCircleOutlined />}
            className="px-3 py-1 text-sm font-semibold rounded-full border border-amber-500/20 animate-pulse"
          >
            Chờ Duyệt
          </Tag>
        );
      default:
        return (
          <Tag color="default" className="px-3 py-1 text-sm font-semibold rounded-full">
            Chưa Duyệt
          </Tag>
        );
    }
  };

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case 'HAPPY':
        return { emoji: '😊', label: 'Rất Hài Lòng', color: '#52c41a' };
      case 'SATISFIED':
        return { emoji: '🙂', label: 'Hài Lòng', color: '#73d13d' };
      case 'NEUTRAL':
        return { emoji: '😐', label: 'Bình Thường', color: '#bfbfbf' };
      case 'FRUSTRATED':
        return { emoji: '😟', label: 'Không Hài Lòng', color: '#ff7875' };
      case 'ANGRY':
        return { emoji: '😡', label: 'Tức Giận', color: '#ff4d4f' };
      default:
        return null;
    }
  };

  const sentimentInfo = logDetails?.customerSentiment ? getSentimentEmoji(logDetails.customerSentiment) : null;
  const isOutbound = logDetails?.direction === 'outbound';
  const displayStaffName = logDetails?.staffName || 'Staff - null';
  const customerName = logDetails?.customerName || 'Khách hàng';
  const phone = logDetails?.destinationNumber || 'N/A';
  const duration = logDetails?.duration || 0;
  const status = logDetails?.status || 'N/A';

  const callDate = logDetails?.createdAt
    ? new Date(logDetails.createdAt).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'N/A';

  return (
    <div
      className="p-5 rounded-2xl mb-6 shadow-sm border transition-all duration-300 ease-in-out hover:shadow-md"
      style={{
        background:
          themeMode === 'dark'
            ? 'linear-gradient(135deg, #1f1f1f, #141414)'
            : 'linear-gradient(135deg, #ffffff, #f9f9f9)',
        borderColor: themeMode === 'dark' ? '#2a2a2a' : '#e8e8e8',
      }}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Telesales Profile */}
        <div className="flex items-center gap-4">
          <Avatar
            size={56}
            src={logDetails?.staffAvatarUrl}
            icon={<UserOutlined />}
            className="border-2 border-primary/20 shadow-inner"
            style={{
              backgroundColor: themeMode === 'dark' ? '#333' : '#e6f7ff',
              color: token.colorPrimary,
            }}
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Title level={4} style={{ margin: 0 }} className="font-bold">
                {displayStaffName}
              </Title>
              <Tag color="blue" className="rounded-md font-medium text-xs">
                Telesales
              </Tag>
              {getHappyCallBadge(logDetails?.happyCallStatus)}
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs opacity-80 flex-wrap">
              <span className="flex items-center gap-1">
                <Tooltip title="Khách hàng">
                  <UserOutlined /> {customerName}
                </Tooltip>
              </span>
              <span className="flex items-center gap-1">
                <Tooltip title="Số điện thoại khách">
                  <PhoneOutlined /> <span className="font-mono">{phone}</span>
                </Tooltip>
              </span>
              <span className="flex items-center gap-1">
                <Tooltip title="Hướng cuộc gọi">
                  {isOutbound ? (
                    <span className="text-emerald-500">
                      <ArrowUpOutlined /> Outbound
                    </span>
                  ) : (
                    <span className="text-blue-500">
                      <ArrowDownOutlined /> Inbound
                    </span>
                  )}
                </Tooltip>
              </span>
            </div>
          </div>
        </div>

        {/* Call Statistics & AI Sentiment */}
        <div className="flex flex-wrap items-center gap-4 md:self-end lg:self-center">
          {/* Metadata info */}
          <div className="flex flex-col text-right gap-1 pr-4 border-r border-dashed border-slate-300 dark:border-slate-800">
            <Text className="text-xs opacity-70">
              <CalendarOutlined className="mr-1" /> {callDate}
            </Text>
            <div className="flex items-center justify-end gap-2">
              <Text className="text-xs font-semibold">
                <ClockCircleOutlined className="mr-1" /> {formatTime(duration)}
              </Text>
              <Tag
                color={status === 'ANSWER' ? 'success' : 'error'}
                className="m-0 text-[10px] uppercase font-bold py-0 px-1.5 rounded"
              >
                {status}
              </Tag>
            </div>
          </div>

          {/* AI Score */}
          {logDetails?.customerSatisfactionScore !== undefined && logDetails?.customerSatisfactionScore !== null && (
            <div className="flex flex-col justify-center">
              <span className="text-xs opacity-70 text-center md:text-left mb-0.5">
                Sự hài lòng của khách hàng (AI)
              </span>
              <div className="flex items-center gap-2">
                <Rate
                  disabled
                  value={logDetails.customerSatisfactionScore}
                  style={{ fontSize: 14, color: '#fadb14' }}
                />
                {sentimentInfo && (
                  <Tooltip title={`Cảm xúc: ${sentimentInfo.label}`}>
                    <span
                      className="text-lg px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: sentimentInfo.color + '15' }}
                    >
                      {sentimentInfo.emoji}
                    </span>
                  </Tooltip>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QAHeader;
