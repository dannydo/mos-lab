'use client';

import React from 'react';
import { Card, Avatar, Typography, Tag, Space, Button, Divider, Row, Col, theme } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  IdcardOutlined,
  EditOutlined,
  TrophyOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { CopyPhoneButton } from './ui';
import { resolveMediaUrl } from '../lib/api';

const { Title, Text } = Typography;

export interface UserProfileData {
  id: string | number;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  role: 'admin' | 'manager' | 'telesales' | 'consultant' | 'technician' | string;
  department?: string;
  status: 'active' | 'inactive' | 'busy';
  joinDate?: string;
  stats?: {
    totalBookings?: number;
    totalCompleted?: number;
    revenueFormatted?: string;
    level?: number;
    rating?: number;
  };
}

export interface UserProfileProps {
  user: UserProfileData;
  onEdit?: (user: UserProfileData) => void;
  onRefresh?: () => void;
  className?: string;
  compact?: boolean;
}

const roleColors: Record<string, { color: string; label: string }> = {
  admin: { color: 'magenta', label: 'Quản trị viên' },
  manager: { color: 'purple', label: 'Quản lý cửa hàng' },
  telesales: { color: 'blue', label: 'Telesales / Booker' },
  consultant: { color: 'cyan', label: 'Tư vấn viên (CC)' },
  technician: { color: 'gold', label: 'Kỹ thuật viên (CV)' },
};

export function UserProfile({ user, onEdit, onRefresh, className = '', compact = false }: UserProfileProps) {
  const { token } = theme.useToken();

  const roleMeta = roleColors[user.role.toLowerCase()] || { color: 'geekblue', label: user.role };

  return (
    <Card
      className={`user-profile-card shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl ${className}`}
      style={{ background: token.colorBgContainer }}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Avatar & Main Identity */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar
              size={compact ? 56 : 72}
              src={resolveMediaUrl(user.avatarUrl)}
              icon={!user.avatarUrl && <UserOutlined />}
              style={{
                backgroundColor: token.colorPrimary,
                fontSize: compact ? 24 : 32,
                border: `2px solid ${token.colorBorderSecondary}`,
              }}
            />
            <span
              className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                user.status === 'active' ? 'bg-emerald-500' : user.status === 'busy' ? 'bg-amber-500' : 'bg-slate-400'
              }`}
              title={`Trạng thái: ${user.status}`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Title level={compact ? 4 : 3} style={{ margin: 0, color: token.colorText }}>
                {user.name}
              </Title>
              <Tag color={roleMeta.color} className="inline-flex items-center gap-1 font-medium">
                <SafetyCertificateOutlined />
                {roleMeta.label}
              </Tag>
              {user.department && <Tag className="text-xs text-slate-500">{user.department}</Tag>}
            </div>

            <Space size={14} className="mt-1 flex-wrap text-sm" style={{ color: token.colorTextDescription }}>
              <span className="inline-flex items-center gap-1">
                <IdcardOutlined />
                <Text copyable={{ text: user.username }} style={{ color: token.colorTextDescription }}>
                  @{user.username}
                </Text>
              </span>
              {user.email && (
                <span className="inline-flex items-center gap-1">
                  <MailOutlined />
                  <span>{user.email}</span>
                </span>
              )}
              {user.phone && (
                <span className="inline-flex items-center gap-1">
                  <PhoneOutlined />
                  <span>{user.phone}</span>
                  <CopyPhoneButton phone={user.phone} size="xs" />
                </span>
              )}
              {user.joinDate && (
                <span className="inline-flex items-center gap-1">
                  <CalendarOutlined />
                  <span>Gia nhập: {user.joinDate}</span>
                </span>
              )}
            </Space>
          </div>
        </div>

        {/* Action Buttons */}
        {onEdit && (
          <Space>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => onEdit(user)}
              className="rounded-xl shadow-sm"
            >
              Chỉnh sửa
            </Button>
          </Space>
        )}
      </div>

      {/* KPI Stats Grid */}
      {user.stats && (
        <>
          <Divider style={{ margin: '18px 0 14px 0' }} />
          <Row gutter={[16, 12]} className="text-center">
            {user.stats.level !== undefined && (
              <Col xs={12} sm={6}>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <Text style={{ color: token.colorTextDescription }} className="text-xs block">
                    Cấp độ (Level)
                  </Text>
                  <span className="text-lg font-bold text-amber-500 inline-flex items-center gap-1 tabular-nums">
                    <TrophyOutlined /> Lv.{user.stats.level}
                  </span>
                </div>
              </Col>
            )}

            {user.stats.totalBookings !== undefined && (
              <Col xs={12} sm={6}>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <Text style={{ color: token.colorTextDescription }} className="text-xs block">
                    Đã đặt lịch
                  </Text>
                  <span className="text-lg font-bold text-blue-500 tabular-nums">{user.stats.totalBookings}</span>
                </div>
              </Col>
            )}

            {user.stats.totalCompleted !== undefined && (
              <Col xs={12} sm={6}>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <Text style={{ color: token.colorTextDescription }} className="text-xs block">
                    Đã hoàn tất
                  </Text>
                  <span className="text-lg font-bold text-emerald-500 tabular-nums">{user.stats.totalCompleted}</span>
                </div>
              </Col>
            )}

            {user.stats.revenueFormatted && (
              <Col xs={12} sm={6}>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <Text style={{ color: token.colorTextDescription }} className="text-xs block">
                    Doanh thu tích lũy
                  </Text>
                  <span className="text-lg font-bold text-violet-500 tabular-nums">{user.stats.revenueFormatted}</span>
                </div>
              </Col>
            )}
          </Row>
        </>
      )}
    </Card>
  );
}

export default React.memo(UserProfile);
