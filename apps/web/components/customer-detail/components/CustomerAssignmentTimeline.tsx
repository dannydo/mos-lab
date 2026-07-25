'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Timeline, Tag, Spin, Typography, Space, Tooltip, Alert } from 'antd';
import {
  ClockCircleOutlined,
  UserOutlined,
  UserSwitchOutlined,
  DeleteOutlined,
  UndoOutlined,
  FilterOutlined,
  PushpinFilled,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiClient } from '../../../lib/api-client';
import { CustomerAssignmentTimelineItem, SafeAny } from '@mos-lab/shared';
import { useTheme } from '../../../context/ThemeContext';

const { Text } = Typography;

interface CustomerAssignmentTimelineProps {
  customerId: number;
}

export const CustomerAssignmentTimeline: React.FC<CustomerAssignmentTimelineProps> = ({ customerId }) => {
  const { themeMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [timelineItems, setTimelineItems] = useState<CustomerAssignmentTimelineItem[]>([]);

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.customers.getTimeline(customerId);
      setTimelineItems(res.data || []);
    } catch (error: SafeAny) {
      console.error('Failed to fetch assignment timeline:', error);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '30px 0' }}>
        <Spin />
        <div style={{ marginTop: 8 }} className="text-xs text-slate-400 font-medium">
          Đang tải lịch sử phân bổ...
        </div>
      </div>
    );
  }

  if (timelineItems.length === 0) {
    return (
      <Alert
        message="Chưa có lịch sử phân bổ"
        description="Khách hàng này chưa từng được phân bổ hoặc thực hiện biến động phân bổ nào."
        type="info"
        showIcon
      />
    );
  }

  const getActionTag = (item: CustomerAssignmentTimelineItem) => {
    switch (item.actionType) {
      case 'ASSIGN':
        return (
          <Tag color="green">
            <UserOutlined style={{ marginRight: 4 }} />
            Phân bổ mới
          </Tag>
        );
      case 'TRANSFER':
        return (
          <Tag color="blue">
            <UserSwitchOutlined style={{ marginRight: 4 }} />
            Chuyển Booker
          </Tag>
        );
      case 'REVOKE':
        return (
          <Tag color="volcano">
            <DeleteOutlined style={{ marginRight: 4 }} />
            Thu hồi về Pool
          </Tag>
        );
      case 'EXPIRE':
        return (
          <Tag color="red">
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            Hết hạn tự động
          </Tag>
        );
      case 'UNDO':
        return (
          <Tag color="warning">
            <UndoOutlined style={{ marginRight: 4 }} />
            Đã hoàn tác
          </Tag>
        );
      default:
        return <Tag color="default">{item.actionType}</Tag>;
    }
  };

  return (
    <div style={{ padding: '8px 4px' }}>
      <Timeline mode="left">
        {timelineItems.map((item) => {
          const formattedDate = dayjs(item.assignedAt).format('DD/MM/YYYY HH:mm');
          const formattedExpire = item.expiresAt ? dayjs(item.expiresAt).format('DD/MM/YYYY HH:mm') : null;

          return (
            <Timeline.Item
              key={item.id}
              color={
                item.actionType === 'ASSIGN'
                  ? 'green'
                  : item.actionType === 'TRANSFER'
                    ? 'blue'
                    : item.actionType === 'EXPIRE' || item.actionType === 'REVOKE'
                      ? 'red'
                      : 'orange'
              }
            >
              <div
                style={{
                  background: themeMode === 'dark' ? '#1f1f1f' : '#fafafa',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <Space>
                    {getActionTag(item)}
                    <Text strong style={{ color: themeMode === 'dark' ? '#fff' : '#141414' }}>
                      {item.staffName
                        ? `Phân bổ cho: ${item.staffName}`
                        : item.prevStaffName
                          ? `Thu hồi từ: ${item.prevStaffName}`
                          : 'Hủy phân bổ'}
                    </Text>
                    {item.isRetained && (
                      <Tag color="gold" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <PushpinFilled /> Đã giữ data
                      </Tag>
                    )}
                  </Space>
                  <Text type="secondary" style={{ fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
                    {formattedDate}
                  </Text>
                </div>

                <div style={{ marginTop: '8px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div>
                    <Text type="secondary">Người thực hiện: </Text>
                    <Text style={{ fontWeight: 600 }}>{item.assignedBy}</Text>
                  </div>

                  {item.sourceFilterSummary && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text type="secondary">
                        <FilterOutlined /> Công thức / Nguồn lọc:{' '}
                      </Text>
                      <Tag color="cyan">{item.sourceFilterSummary}</Tag>
                    </div>
                  )}

                  {formattedExpire && (
                    <div>
                      <Text type="secondary">Thời hạn: </Text>
                      <Text type="warning">
                        {item.durationDays ? `${item.durationDays} ngày` : ''} (Hết hạn: {formattedExpire})
                      </Text>
                    </div>
                  )}

                  {item.reason && (
                    <div
                      style={{
                        marginTop: 4,
                        padding: '6px 10px',
                        background: themeMode === 'dark' ? '#2b2111' : '#fffbe6',
                        borderRadius: '4px',
                        border: '1px solid #ffe58f',
                      }}
                    >
                      <Text type="danger" strong>
                        Lý do:{' '}
                      </Text>
                      <Text style={{ fontStyle: 'italic' }}>{item.reason}</Text>
                    </div>
                  )}
                </div>
              </div>
            </Timeline.Item>
          );
        })}
      </Timeline>
    </div>
  );
};
