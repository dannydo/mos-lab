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
  CheckCircleOutlined,
  CloseCircleOutlined,
  RollbackOutlined,
  GiftOutlined,
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
    const action = item.actionType?.toUpperCase();
    switch (action) {
      case 'OFFERED':
        return (
          <Tag color="cyan">
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            Chờ xác nhận
          </Tag>
        );
      case 'ACCEPT':
      case 'ACCEPT_ALLOCATION':
      case 'ACCEPTED':
        return (
          <Tag color="green">
            <CheckCircleOutlined style={{ marginRight: 4 }} />
            Chấp nhận
          </Tag>
        );
      case 'DECLINE':
      case 'DECLINE_ALLOCATION':
      case 'DECLINED':
        return (
          <Tag color="red">
            <CloseCircleOutlined style={{ marginRight: 4 }} />
            Từ chối
          </Tag>
        );
      case 'RECALL':
      case 'RECALL_ALLOCATION':
      case 'RECALLED':
        return (
          <Tag color="volcano">
            <RollbackOutlined style={{ marginRight: 4 }} />
            Thu hồi phân bổ
          </Tag>
        );
      case 'EXPIRE':
      case 'EXPIRED':
        return (
          <Tag color="orange">
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            Hết hạn tự động
          </Tag>
        );
      case 'RANDOM_SELECT':
      case 'RANDOM_SELECTED':
        return (
          <Tag color="purple">
            <FilterOutlined style={{ marginRight: 4 }} />
            Chọn ngẫu nhiên
          </Tag>
        );
      case 'ASSIGN':
        return (
          <Tag color="blue">
            <UserOutlined style={{ marginRight: 4 }} />
            Phân bổ mới
          </Tag>
        );
      case 'TRANSFER':
      case 'TRANSFERRED':
        return (
          <Tag color="blue">
            <UserSwitchOutlined style={{ marginRight: 4 }} />
            Chuyển Booker
          </Tag>
        );
      case 'REVOKE':
      case 'RETURNED_TO_POOL':
        return (
          <Tag color="volcano">
            <DeleteOutlined style={{ marginRight: 4 }} />
            Thu hồi về Pool
          </Tag>
        );
      case 'CAMPAIGN_RETURNED_TO_POOL':
        return (
          <Tag color="magenta">
            <GiftOutlined style={{ marginRight: 4 }} />
            Chiến dịch trả về Pool
          </Tag>
        );
      case 'UNDO':
      case 'UNDO_REVERSED':
        return (
          <Tag color="warning">
            <UndoOutlined style={{ marginRight: 4 }} />
            Đã hoàn tác
          </Tag>
        );
      case 'RETENTION_CHANGED':
        return (
          <Tag color="gold">
            <PushpinFilled style={{ marginRight: 4 }} />
            Thay đổi giữ data
          </Tag>
        );
      case 'STAFF_MERGED':
        return (
          <Tag color="geekblue">
            <UserSwitchOutlined style={{ marginRight: 4 }} />
            Gộp nhân sự
          </Tag>
        );
      default:
        return <Tag color="default">{item.actionType}</Tag>;
    }
  };

  const getTimelineColor = (actionType: string) => {
    const action = actionType?.toUpperCase();
    switch (action) {
      case 'ACCEPT':
      case 'ACCEPT_ALLOCATION':
      case 'ACCEPTED':
        return 'green';
      case 'DECLINE':
      case 'DECLINE_ALLOCATION':
      case 'DECLINED':
        return 'red';
      case 'RECALL':
      case 'RECALL_ALLOCATION':
      case 'RECALLED':
      case 'REVOKE':
      case 'RETURNED_TO_POOL':
        return 'volcano';
      case 'CAMPAIGN_RETURNED_TO_POOL':
        return 'magenta';
      case 'EXPIRE':
      case 'EXPIRED':
        return 'orange';
      case 'RANDOM_SELECT':
      case 'RANDOM_SELECTED':
        return 'purple';
      case 'ASSIGN':
        return 'green';
      case 'TRANSFER':
      case 'TRANSFERRED':
        return 'blue';
      case 'UNDO':
      case 'UNDO_REVERSED':
        return 'gold';
      case 'RETENTION_CHANGED':
        return 'gold';
      case 'STAFF_MERGED':
        return 'geekblue';
      default:
        return 'blue';
    }
  };

  const getActionTitle = (item: CustomerAssignmentTimelineItem) => {
    const action = item.actionType?.toUpperCase();
    switch (action) {
      case 'OFFERED':
        return item.staffName ? `Đề nghị phân bổ cho: ${item.staffName}` : 'Đề nghị phân bổ chờ xác nhận';
      case 'ACCEPT':
      case 'ACCEPT_ALLOCATION':
      case 'ACCEPTED':
        return item.staffName ? `${item.staffName} đã chấp nhận nhận data` : 'Đã chấp nhận nhận data';
      case 'DECLINE':
      case 'DECLINE_ALLOCATION':
      case 'DECLINED':
        return item.prevStaffName || item.staffName
          ? `${item.prevStaffName || item.staffName} từ chối nhận data`
          : 'Từ chối nhận data';
      case 'RECALL':
      case 'RECALL_ALLOCATION':
      case 'RECALLED':
        return item.prevStaffName ? `Thu hồi data từ ${item.prevStaffName}` : 'Thu hồi đợt phân bổ';
      case 'EXPIRE':
      case 'EXPIRED':
        return item.prevStaffName ? `Hết hạn phân bổ của ${item.prevStaffName}` : 'Hết hạn phân bổ';
      case 'RANDOM_SELECT':
      case 'RANDOM_SELECTED':
        return 'Được chọn ngẫu nhiên trong đợt lọc';
      case 'ASSIGN':
        return item.staffName ? `Phân bổ cho: ${item.staffName}` : 'Phân bổ mới';
      case 'TRANSFER':
      case 'TRANSFERRED':
        return item.staffName ? `Chuyển sang cho: ${item.staffName}` : 'Chuyển Booker';
      case 'REVOKE':
      case 'RETURNED_TO_POOL':
        return item.prevStaffName ? `Thu hồi từ: ${item.prevStaffName}` : 'Thu hồi về Pool';
      case 'CAMPAIGN_RETURNED_TO_POOL':
        return item.prevStaffName
          ? `Chiến dịch trả data của ${item.prevStaffName} về Pool`
          : 'Chiến dịch trả data về Pool';
      case 'UNDO':
      case 'UNDO_REVERSED':
        return 'Đã hoàn tác đợt phân bổ';
      case 'RETENTION_CHANGED':
        return item.isRetained ? 'Đánh dấu giữ data' : 'Bỏ trạng thái giữ data';
      case 'STAFF_MERGED':
        return item.staffName ? `Gộp quyền sở hữu sang: ${item.staffName}` : 'Gộp quyền sở hữu nhân sự';
      default:
        return item.staffName
          ? `Phân bổ cho: ${item.staffName}`
          : item.prevStaffName
            ? `Thu hồi từ: ${item.prevStaffName}`
            : 'Hủy phân bổ';
    }
  };

  const items = timelineItems.map((item) => {
    const formattedDate = dayjs(item.assignedAt).format('DD/MM/YYYY HH:mm');
    const formattedExpire = item.expiresAt ? dayjs(item.expiresAt).format('DD/MM/YYYY HH:mm') : null;
    const campaignName = (item as SafeAny).campaignName;

    return {
      key: item.id,
      color: getTimelineColor(item.actionType),
      children: (
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
                {getActionTitle(item)}
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

            {(campaignName || item.sourceFilterSummary) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text type="secondary">Chiến dịch / Nguồn lọc: </Text>
                {campaignName && (
                  <Tag color="gold">
                    <GiftOutlined style={{ marginRight: 4 }} />
                    {campaignName}
                  </Tag>
                )}
                {item.sourceFilterSummary && (
                  <Tag color="cyan">
                    <FilterOutlined style={{ marginRight: 4 }} />
                    {item.sourceFilterSummary}
                  </Tag>
                )}
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
      ),
    };
  });

  return (
    <div style={{ padding: '8px 4px' }}>
      <Timeline mode="left" items={items} />
    </div>
  );
};
