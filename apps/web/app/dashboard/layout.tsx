'use client';

import '../suppress-warnings';
import React, { useEffect, useState, Suspense } from 'react';
import { Layout, Menu, Button, Avatar, Space, Dropdown, theme, message, Tag } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  PhoneOutlined,
  BarChartOutlined,
  LogoutOutlined,
  SunOutlined,
  MoonOutlined,
  LeftOutlined,
  RightOutlined,
  SolutionOutlined
} from '@ant-design/icons';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTheme } from '../../context/ThemeContext';

const { Header, Sider, Content } = Layout;

function SidebarMenu({ themeMode, token, userRole }: { themeMode: string; token: any; userRole?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const assignedStaffId = searchParams.get('assignedStaffId');

  const getSelectedKey = () => {
    if (pathname.includes('/dashboard/customers')) {
      return assignedStaffId === 'me' ? 'my-customers' : 'customers';
    }
    if (pathname.includes('/dashboard/appointments')) return 'my-appointments';
    if (pathname.includes('/dashboard/plans')) return 'plans';
    if (pathname.includes('/dashboard/calls')) return 'calls';
    if (pathname.includes('/dashboard/kpi')) return 'kpi';
    if (pathname.includes('/dashboard/staff')) return 'staff';
    return 'customers';
  };

  const menuItems = [];

  // Only show the "All Customers" and "Staff" tabs for admins
  if (userRole === 'admin') {
    menuItems.push(
      {
        key: 'customers',
        icon: <TeamOutlined />,
        label: 'Khách hàng',
        onClick: () => router.push('/dashboard/customers?assignedStaffId=all')
      },
      {
        key: 'staff',
        icon: <SolutionOutlined />,
        label: 'Nhân sự (HR)',
        onClick: () => router.push('/dashboard/staff')
      }
    );
  }

  // Both roles get "My Customers", "Plans", "Calls", and "KPI"
  menuItems.push(
    {
      key: 'my-customers',
      icon: <UserOutlined />,
      label: 'KH của tôi',
      onClick: () => router.push('/dashboard/customers?assignedStaffId=me')
    },
    {
      key: 'my-appointments',
      icon: <CalendarOutlined />,
      label: 'Lịch hẹn của tôi',
      onClick: () => router.push('/dashboard/appointments')
    },
    {
      key: 'plans',
      icon: <CalendarOutlined />,
      label: 'Kế hoạch gọi',
      onClick: () => router.push('/dashboard/plans')
    },
    {
      key: 'calls',
      icon: <PhoneOutlined />,
      label: 'Lịch sử cuộc gọi',
      onClick: () => router.push('/dashboard/calls')
    },
    {
      key: 'kpi',
      icon: <BarChartOutlined />,
      label: 'KPI hiệu suất',
      onClick: () => router.push('/dashboard/kpi')
    }
  );

  return (
    <Menu
      theme={themeMode === 'dark' ? 'dark' : 'light'}
      mode="inline"
      selectedKeys={[getSelectedKey()]}
      items={menuItems}
      style={{
        background: themeMode === 'dark' ? '#000000' : token.colorBgContainer,
        paddingTop: '8px',
        borderRight: 0
      }}
      className="antd-custom-menu"
    />
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { themeMode, toggleTheme } = useTheme();
  const { token } = theme.useToken();

  useEffect(() => {
    // Check authentication
    const tokenStr = localStorage.getItem('mos_token');
    const storedUser = localStorage.getItem('mos_user');
    const hasOriginal = !!localStorage.getItem('mos_original_token');

    if (!tokenStr || !storedUser) {
      localStorage.removeItem('mos_token');
      localStorage.removeItem('mos_user');
      localStorage.removeItem('mos_original_token');
      localStorage.removeItem('mos_original_user');
      router.push('/login');
    } else {
      setUser(JSON.parse(storedUser));
      setIsImpersonating(hasOriginal);
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('mos_token');
    localStorage.removeItem('mos_user');
    localStorage.removeItem('mos_original_token');
    localStorage.removeItem('mos_original_user');
    router.push('/login');
  };

  const handleExitImpersonation = () => {
    const origToken = localStorage.getItem('mos_original_token');
    const origUser = localStorage.getItem('mos_original_user');
    if (origToken && origUser) {
      localStorage.setItem('mos_token', origToken);
      localStorage.setItem('mos_user', origUser);
      localStorage.removeItem('mos_original_token');
      localStorage.removeItem('mos_original_user');
      message.success('Đã quay lại tài khoản Admin');
      window.location.href = '/dashboard/staff';
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center" style={{ background: token.colorBgLayout, color: token.colorText }}>
        Tải thông tin phiên đăng nhập...
      </div>
    );
  }

  const userMenu = {
    items: [
      {
        key: 'profile',
        label: `Tài khoản: ${user?.displayName}`,
        disabled: true
      },
      {
        key: 'role',
        label: `Vai trò: ${user?.role?.toUpperCase()}`,
        disabled: true
      },
      {
        type: 'divider' as const
      },
      {
        key: 'logout',
        danger: true,
        icon: <LogoutOutlined />,
        label: 'Đăng xuất',
        onClick: handleLogout
      }
    ]
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        style={{
          background: themeMode === 'dark' ? '#000000' : token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorderSecondary}`
        }}
      >
        <div 
          className="flex items-center justify-center"
          style={{
            height: '64px',
            background: themeMode === 'dark' ? '#000000' : token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            color: token.colorPrimary,
            fontSize: collapsed ? '16px' : '18px',
            fontWeight: 'bold',
            letterSpacing: '1px'
          }}
        >
          {collapsed ? 'WL' : 'WINGS LASHES'}
        </div>
        <Suspense fallback={null}>
          <SidebarMenu themeMode={themeMode} token={token} userRole={user?.role} />
        </Suspense>
      </Sider>

      <div className="sidebar-toggle-container">
        <Button
          onClick={() => setCollapsed(!collapsed)}
          icon={collapsed ? <RightOutlined style={{ fontSize: '10px' }} /> : <LeftOutlined style={{ fontSize: '10px' }} />}
          className="sidebar-toggle-btn"
          style={{
            position: 'absolute',
            top: '72px',
            left: collapsed ? '68px' : '188px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            background: themeMode === 'dark' ? '#141414' : '#ffffff',
            border: `1px solid ${themeMode === 'dark' ? '#303030' : '#d9d9d9'}`,
            color: '#D4A84B',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            cursor: 'pointer',
            transition: 'left 0.2s ease, opacity 0.3s ease, background 0.3s',
            zIndex: 1010,
            opacity: 0,
            pointerEvents: 'auto'
          }}
        />
      </div>
      
      <Layout style={{ background: token.colorBgLayout }}>
        <Header 
          style={{ 
            padding: '0 24px', 
            background: token.colorBgContainer, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-end',
            borderBottom: `1px solid ${token.colorBorderSecondary}`
          }}
        >
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {isImpersonating && (
              <Tag 
                color="warning" 
                style={{ 
                  marginRight: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '4px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D4A84B',
                  background: themeMode === 'dark' ? '#2b2111' : '#fffbe6'
                }}
              >
                <span style={{ color: themeMode === 'dark' ? '#ffd666' : '#d46b08', fontSize: '13px' }}>
                  Đang giả lập: <strong>{user?.displayName}</strong>
                </span>
                <Button 
                  type="primary" 
                  danger 
                  size="small" 
                  onClick={handleExitImpersonation}
                  style={{ height: '22px', display: 'flex', alignItems: 'center', fontSize: '11px', padding: '0 8px' }}
                >
                  Thoát
                </Button>
              </Tag>
            )}
            <Button 
              type="text" 
              icon={themeMode === 'dark' ? <SunOutlined style={{ color: '#FAAD14' }} /> : <MoonOutlined style={{ color: '#1890ff' }} />} 
              onClick={toggleTheme}
              style={{ 
                fontSize: '16px', 
                marginRight: '16px',
                color: token.colorText,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            />
            <Dropdown menu={userMenu} placement="bottomRight" arrow>
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Avatar src={user?.avatarUrl || undefined} icon={<UserOutlined />} style={{ backgroundColor: token.colorPrimary, color: '#000' }} />
              </div>
            </Dropdown>
          </div>
        </Header>
        
        <Content
          style={{
            margin: '24px',
            padding: '24px',
            background: token.colorBgContainer,
            borderRadius: '8px',
            minHeight: 280,
            border: `1px solid ${token.colorBorderSecondary}`,
            overflow: 'initial',
            color: token.colorText
          }}
        >
          {children}
        </Content>
      </Layout>

      <style jsx global>{`
        /* Override Ant Design dark sidebar menu hover/select colors */
        .antd-custom-menu .ant-menu-item-selected {
          background-color: #D4A84B !important;
        }
        .antd-custom-menu .ant-menu-item-selected .ant-menu-title-content,
        .antd-custom-menu .ant-menu-item-selected .anticon {
          color: #000000 !important;
        }
        
        /* Keep black color on selected item hover */
        .antd-custom-menu .ant-menu-item-selected:hover,
        .antd-custom-menu .ant-menu-item-selected:hover .ant-menu-title-content,
        .antd-custom-menu .ant-menu-item-selected:hover .anticon {
          color: #000000 !important;
          background-color: #D4A84B !important;
        }

        /* Hover styles for normal items */
        .antd-custom-menu .ant-menu-item:not(.ant-menu-item-selected):hover {
          background-color: ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : 'rgba(212, 168, 75, 0.08)'} !important;
        }
        .antd-custom-menu .ant-menu-item:not(.ant-menu-item-selected):hover .ant-menu-title-content,
        .antd-custom-menu .ant-menu-item:not(.ant-menu-item-selected):hover .anticon {
          color: #D4A84B !important;
        }

        /* Show toggle button on sidebar hover */
        .ant-layout-sider:hover + .sidebar-toggle-container .sidebar-toggle-btn,
        .sidebar-toggle-container:hover .sidebar-toggle-btn {
          opacity: 1 !important;
        }
      `}</style>
    </Layout>
  );
}
