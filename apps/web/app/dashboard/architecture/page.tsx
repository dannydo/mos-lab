'use client';

import React, { useEffect, useState } from 'react';
import { Card, Button, Space, Typography, Tag, Result, Spin, Tooltip } from 'antd';
import { FullscreenOutlined, ReloadOutlined, SafetyCertificateOutlined, ClusterOutlined } from '@ant-design/icons';
import { useTheme } from '../../../context/ThemeContext';
import { apiClient } from '../../../lib/api-client';
import { PageHeader } from '../../../components/ui';

export default function ArchitecturePage() {
  const { themeMode } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(Date.now());
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  // Sync global themeMode with iframe via postMessage
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'SET_THEME', theme: themeMode }, '*');
    }
  }, [themeMode]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await apiClient.auth.me();
        let rawUser = (res as any)?.user || res;
        if ((!rawUser || !rawUser.role) && typeof window !== 'undefined') {
          const stored = localStorage.getItem('mos_user');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              rawUser = parsed.user || parsed || rawUser;
            } catch (_) {}
          }
        }
        setUser(rawUser);
      } catch (err) {
        console.error('Auth check error:', err);
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('mos_user');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              setUser(parsed.user || parsed);
            } catch (_) {}
          }
        }
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const handleRefresh = () => {
    setIframeKey(Date.now());
  };

  const handleOpenStandalone = () => {
    window.open('/graph.html', '_blank');
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Spin size="large" tip="Đang xác thực quyền Admin..." />
      </div>
    );
  }

  const roleStr = (user?.role || '').toLowerCase();
  const usernameStr = (user?.username || '').toLowerCase();
  const emailStr = (user?.email || '').toLowerCase();
  const isAdmin =
    roleStr === 'admin' ||
    usernameStr === 'admin' ||
    usernameStr === 'danhdo@gmail.com' ||
    emailStr === 'danhdo@gmail.com';

  // Admin Access Control Check
  if (!user || !isAdmin) {
    return (
      <div style={{ padding: '24px' }}>
        <Result
          status="403"
          title="Chỉ Dành Cho Quản Trị Viên (Admin)"
          subTitle={`Tài khoản hiện tại (${user?.displayName || user?.username || 'khách'}) chưa có quyền Admin để xem Sơ đồ Kiến trúc AI (Graphify).`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2 sm:p-4">
      {/* Header */}
      <PageHeader
        title={
          <Space align="center" size="middle">
            <ClusterOutlined className="text-xl text-blue-500" />
            <span>Sơ Đồ Kiến Trúc Knowledge Graph (Graphify)</span>
            <Tag color="blue" icon={<SafetyCertificateOutlined />}>
              Admin Only
            </Tag>
          </Space>
        }
        subtitle="Trực quan hóa đồ thị liên kết giữa API Fastify, Schema Prisma CSDL, React Components & Shared DTOs"
        extra={
          <Space>
            <Tooltip title="Tải lại iframe sơ đồ kiến trúc">
              <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                Làm mới
              </Button>
            </Tooltip>
            <Tooltip title="Mở sơ đồ toàn màn hình trong tab mới">
              <Button type="primary" icon={<FullscreenOutlined />} onClick={handleOpenStandalone}>
                Mở Toàn Màn Hình
              </Button>
            </Tooltip>
          </Space>
        }
      />

      {/* Main Graph Container */}
      <Card
        bordered={false}
        className="shadow-md rounded-xl overflow-hidden"
        style={{
          background: themeMode === 'dark' ? '#141414' : '#ffffff',
          border: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}`,
        }}
        bodyStyle={{ padding: 0 }}
      >
        <iframe
          ref={iframeRef}
          key={iframeKey}
          src={`/graph.html?theme=${themeMode}`}
          title="Graphify Monorepo Knowledge Graph"
          style={{
            width: '100%',
            height: 'calc(100vh - 210px)',
            minHeight: '650px',
            border: 'none',
            display: 'block',
          }}
        />
      </Card>
    </div>
  );
}
