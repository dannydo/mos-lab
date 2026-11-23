'use client';

import React, { useEffect, useState } from 'react';
import { Card, Button, Space, Typography, Tag, Result, Spin, Tooltip } from 'antd';
import {
  FullscreenOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  ClusterOutlined,
  BgColorsOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../../context/ThemeContext';
import { apiClient } from '../../../lib/api-client';
import { PageHeader } from '../../../components/ui';
import { useRouter } from 'next/navigation';
import { isAdminOrSuperAdminRole } from '@mos-lab/shared';

const { Title, Paragraph } = Typography;

export default function ArchitecturePage() {
  const { themeMode } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isGraphLoaded, setIsGraphLoaded] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
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
    setIsGraphLoaded(true);
    setIframeKey((previousKey) => previousKey + 1);
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
    isAdminOrSuperAdminRole(user?.role) ||
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
    <div className="responsive-page responsive-workspace architecture-page space-y-4 p-2 sm:p-4">
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
            <Button icon={<BgColorsOutlined />} onClick={() => router.push('/dashboard/design-system')}>
              Xem Design System
            </Button>
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
        variant="borderless"
        className="shadow-md rounded-xl overflow-hidden [&>.ant-card-body]:!p-0"
        style={{
          background: themeMode === 'dark' ? '#141414' : '#ffffff',
          border: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}`,
        }}
      >
        {isGraphLoaded ? (
          <iframe
            ref={iframeRef}
            key={iframeKey}
            src={`/graph.html?theme=${themeMode}`}
            loading="lazy"
            title="Graphify Monorepo Knowledge Graph"
            style={{
              width: '100%',
              height: 'clamp(420px, calc(100dvh - 210px), 900px)',
              minHeight: '420px',
              border: 'none',
              display: 'block',
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16 min-h-[420px]">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <ClusterOutlined className="text-2xl" />
            </div>
            <Title level={4} className="!mb-2">
              Sơ Đồ Kiến Trúc Tương Tác (Knowledge Graph)
            </Title>
            <Paragraph className="max-w-lg text-sm text-slate-600 dark:text-slate-400 mb-6">
              Đồ thị tương tác toàn hệ thống (~3.7 MB) được tải theo yêu cầu để giữ tốc độ chuyển trang tức thì và tránh
              tiêu tốn bộ nhớ khi bạn chỉ kiểm tra nhanh.
            </Paragraph>
            <Space wrap>
              <Button type="primary" size="large" icon={<ClusterOutlined />} onClick={() => setIsGraphLoaded(true)}>
                Tải Sơ Đồ Tương Tác
              </Button>
              <Button size="large" icon={<FullscreenOutlined />} onClick={handleOpenStandalone}>
                Mở Toàn Màn Hình
              </Button>
            </Space>
          </div>
        )}
      </Card>
    </div>
  );
}
