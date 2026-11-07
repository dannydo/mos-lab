'use client';

import '../suppress-warnings';
import React, { useState, useEffect, useMemo } from 'react';
import { Form, Input, Button, Card, Typography, message, Divider, theme, Modal, Badge, Spin } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  GoogleOutlined,
  ArrowLeftOutlined,
  SearchOutlined,
  CrownOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { getDefaultRouteForRole, isCanonicalSuperAdminIdentity, isSuperAdminRole } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { useTheme } from '../../context/ThemeContext';

const { Title, Text } = Typography;

interface DevStaff {
  id: number;
  username: string;
  displayName: string;
  role: string;
  email?: string | null;
  avatarUrl?: string | null;
}

interface RoleCategory {
  key: string;
  label: string;
  icon: string;
  roles: string[];
}

const ROLE_CATEGORIES: RoleCategory[] = [
  { key: 'super_admin', label: 'Super Admin', icon: '👑', roles: ['super_admin'] },
  { key: 'admin', label: 'Admin', icon: '🛡️', roles: ['admin'] },
  { key: 'manager', label: 'Quản Lý', icon: '📊', roles: ['manager'] },
  { key: 'telesales', label: 'Telesales', icon: '📞', roles: ['telesales', 'booker'] },
  { key: 'cvl', label: 'CV🪶 (Tự Chủ)', icon: '🪶', roles: ['cvl', 'cv_plus'] },
  { key: 'cvll', label: '🪶CV🪶 (Cấp Cao)', icon: '🪶', roles: ['cvll', 'cv_plus_plus'] },
  { key: 'cv', label: 'CV Kỹ Thuật', icon: '✨', roles: ['cv', 'lt', 'technician', 'ktv'] },
  { key: 'cc', label: 'CC Sảnh', icon: '☕', roles: ['cc'] },
  { key: 'cs', label: 'CS Khách Hàng', icon: '💬', roles: ['cs'] },
  { key: 'fm', label: 'Cơ Sở (FM)', icon: '🏢', roles: ['fm'] },
  { key: 'executive', label: 'Ban Điều Hành', icon: '⭐', roles: ['boss', 'cho', 'hr'] },
  { key: 'teacher', label: 'Đào Tạo', icon: '🎓', roles: ['teacher', 'ht'] },
  {
    key: 'other',
    label: 'Khác (QA/Staff)',
    icon: '🛠️',
    roles: ['qa', 'qc', 'qa_qc', 'staff', 'office-cleaner', 'security-guard'],
  },
];

export default function LoginPage() {
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [mockEmail, setMockEmail] = useState('danny.do@wingslashes.com');
  const [showMockOptions, setShowMockOptions] = useState(false);

  // Dev directory states
  const [devStaffs, setDevStaffs] = useState<DevStaff[]>([]);
  const [loadingStaffs, setLoadingStaffs] = useState(false);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [staffSearchText, setStaffSearchText] = useState('');
  const [superAdminTarget, setSuperAdminTarget] = useState<DevStaff | null>(null);
  const [superAdminPass, setSuperAdminPass] = useState('');

  const router = useRouter();

  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  // Load Dev staff directory
  useEffect(() => {
    if (showMockOptions && devStaffs.length === 0 && process.env.NODE_ENV !== 'production') {
      setLoadingStaffs(true);
      apiClient.auth
        .getDevDirectory()
        .then((res) => {
          if (res?.staffs) {
            setDevStaffs(res.staffs);
          }
        })
        .catch((err) => {
          console.error('Failed to load dev staff directory:', err);
        })
        .finally(() => {
          setLoadingStaffs(false);
        });
    }
  }, [showMockOptions, devStaffs.length]);

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('mos_token');
    const user = localStorage.getItem('mos_user');
    if (token && user) {
      try {
        const parsed = JSON.parse(user);
        router.push(getDefaultRouteForRole(parsed?.role));
      } catch {
        router.push('/dashboard');
      }
    }
  }, [router]);

  // Load Google GIS script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if ((window as SafeAny).google) {
        try {
          (window as SafeAny).google.accounts.id.initialize({
            client_id:
              process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
              '648958464510-tedkbs4n8dmrgfjhqegcien7r0u7ed9g.apps.googleusercontent.com',
            callback: handleGoogleLogin,
          });
          (window as SafeAny).google.accounts.id.renderButton(document.getElementById('google-signin-btn'), {
            theme: 'dark',
            size: 'large',
            type: 'standard',
            width: 350,
          });
        } catch (err) {
          console.error('Google accounts initialize error:', err);
        }
      }
    };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleGoogleLogin = async (googleResponse: SafeAny) => {
    setLoading(true);
    try {
      const data = await apiClient.auth.google({
        credential: googleResponse.credential,
      });

      const { token, user, resolvedOmicallAutoInit } = data;

      localStorage.setItem('mos_token', token);
      localStorage.setItem('mos_user', JSON.stringify(user));
      localStorage.setItem('mos_omicall_auto_init', String(!!resolvedOmicallAutoInit));

      message.success(`Đăng nhập Google thành công! Chào mừng ${user.displayName}`);
      router.push(getDefaultRouteForRole(user?.role));
    } catch (error) {
      console.error('Google login error:', error);
      const errMsg = (error as SafeAny).response?.data?.message || 'Đăng nhập Google thất bại.';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleMockGoogleLogin = async (emailToMock = 'danhdo@gmail.com', nameToMock = 'Danh Do') => {
    setLoading(true);
    try {
      const data = await apiClient.auth.google({
        isMock: true,
        email: emailToMock,
        name: nameToMock,
      });

      const { token, user, resolvedOmicallAutoInit } = data;

      localStorage.setItem('mos_token', token);
      localStorage.setItem('mos_user', JSON.stringify(user));
      localStorage.setItem('mos_omicall_auto_init', String(!!resolvedOmicallAutoInit));

      message.success(`Đăng nhập Google (Mock) thành công! Chào mừng ${user.displayName}`);
      router.push(getDefaultRouteForRole(user?.role));
    } catch (error) {
      console.error('Mock login error:', error);
      const errMsg = (error as SafeAny).response?.data?.message || 'Đăng nhập Mock Google thất bại.';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const executeLogin = async (username: string, password = '') => {
    setLoading(true);
    try {
      const data = await apiClient.auth.login({
        username,
        password,
      });

      const { token, user, resolvedOmicallAutoInit } = data;

      localStorage.setItem('mos_token', token);
      localStorage.setItem('mos_user', JSON.stringify(user));
      localStorage.setItem('mos_omicall_auto_init', String(!!resolvedOmicallAutoInit));

      message.success(`Đăng nhập thành công! Chào mừng ${user.displayName}`);
      router.push(getDefaultRouteForRole(user?.role));
    } catch (error) {
      console.error('Login error:', error);
      const errMsg =
        (error as SafeAny).response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: SafeAny) => {
    await executeLogin(values.username, values.password || '');
  };

  // Helper to filter users by category
  const getUsersForCategory = (cat: RoleCategory) => {
    if (cat.key === 'super_admin') {
      return devStaffs.filter(
        (s) => isSuperAdminRole(s.role) || isCanonicalSuperAdminIdentity({ username: s.username, email: s.email })
      );
    }
    return devStaffs.filter((s) => {
      if (isCanonicalSuperAdminIdentity({ username: s.username, email: s.email })) return false;
      return cat.roles.includes(String(s.role || '').toLowerCase());
    });
  };

  const handleRoleCategoryClick = (cat: RoleCategory) => {
    const users = getUsersForCategory(cat);
    if (users.length === 0) {
      message.info(`Chưa có tài khoản nào thuộc vai trò ${cat.label}`);
      return;
    }
    if (users.length === 1) {
      const onlyUser = users[0];
      const isSuper =
        isSuperAdminRole(onlyUser.role) ||
        isCanonicalSuperAdminIdentity({ username: onlyUser.username, email: onlyUser.email });
      if (isSuper) {
        setSuperAdminTarget(onlyUser);
        setSuperAdminPass('');
      } else {
        executeLogin(onlyUser.username);
      }
      return;
    }
    // More than 1 user in role -> show users list to choose
    setSelectedCategoryKey(cat.key);
    setStaffSearchText('');
  };

  const handleUserSelect = (targetUser: DevStaff) => {
    const isSuper =
      isSuperAdminRole(targetUser.role) ||
      isCanonicalSuperAdminIdentity({ username: targetUser.username, email: targetUser.email });
    if (isSuper) {
      setSuperAdminTarget(targetUser);
      setSuperAdminPass('');
    } else {
      executeLogin(targetUser.username);
    }
  };

  const selectedCategory = useMemo(
    () => ROLE_CATEGORIES.find((c) => c.key === selectedCategoryKey),
    [selectedCategoryKey]
  );

  const filteredCategoryUsers = useMemo(() => {
    if (!selectedCategory) return [];
    const users = getUsersForCategory(selectedCategory);
    if (!staffSearchText.trim()) return users;
    const q = staffSearchText.trim().toLowerCase();
    return users.filter(
      (u) =>
        u.displayName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  }, [selectedCategory, devStaffs, staffSearchText]);

  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{
        background:
          themeMode === 'dark'
            ? 'linear-gradient(135deg, #090d16 0%, #101726 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        padding: '20px',
      }}
    >
      <Card
        style={{
          width: 450,
          maxWidth: '100%',
          borderRadius: 12,
          boxShadow: themeMode === 'dark' ? '0 8px 30px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.08)',
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <div className="text-center mb-8">
          <div
            className="mx-auto mb-4 flex items-center justify-center"
            style={{
              width: 70,
              height: 70,
              borderRadius: '50%',
              background: token.colorPrimary,
              fontSize: '28px',
              color: '#000',
              fontWeight: 'bold',
              boxShadow: '0 0 15px rgba(212, 168, 75, 0.4)',
            }}
          >
            W
          </div>
          <Title level={3} style={{ color: token.colorPrimary, margin: 0 }}>
            WINGS LASHES
          </Title>
          <Text style={{ color: token.colorTextDescription }}>Living Lab CRM — Telesales Portal</Text>
        </div>

        <div className="flex flex-col items-center gap-3 w-full" style={{ width: '100%', boxSizing: 'border-box' }}>
          {/* Real Google GSI button */}
          <div
            id="google-signin-btn"
            style={{ minHeight: '40px', width: '100%', display: 'flex', justifyContent: 'center' }}
          ></div>

          {/* Dev Mock login selection */}
          {process.env.NODE_ENV !== 'production' &&
            (!showMockOptions ? (
              <Button
                type="default"
                icon={<GoogleOutlined />}
                onClick={() => setShowMockOptions(true)}
                block
                style={{
                  background: themeMode === 'dark' ? '#141c2e' : '#f1f5f9',
                  borderColor: token.colorBorderSecondary,
                  color: token.colorPrimary,
                  height: '40px',
                  fontWeight: '500',
                }}
              >
                Mock Login Options (Dev Mode)
              </Button>
            ) : (
              <div
                style={{
                  width: '100%',
                  background: themeMode === 'dark' ? '#141c2e' : '#f8fafc',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${token.colorBorderSecondary}`,
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    color: token.colorTextDescription,
                    fontSize: '11px',
                    marginBottom: '8px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px',
                  }}
                >
                  MOCK LOGIN (LOCAL DEV ONLY)
                </div>

                {loadingStaffs ? (
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <Spin size="small" />
                    <span style={{ marginLeft: '8px', fontSize: '12px', color: token.colorTextDescription }}>
                      Đang tải danh sách nhân sự...
                    </span>
                  </div>
                ) : !selectedCategoryKey ? (
                  /* Step 1: Chọn Vai trò */
                  <div style={{ width: '100%', boxSizing: 'border-box' }}>
                    <div
                      style={{
                        fontSize: '11px',
                        color: token.colorTextDescription,
                        marginBottom: '6px',
                        textAlign: 'center',
                      }}
                    >
                      Chọn vai trò để đăng nhập hoặc xem danh sách users:
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: '6px',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      {ROLE_CATEGORIES.map((cat) => {
                        const count = getUsersForCategory(cat).length;
                        if (count === 0) return null;
                        const isSuper = cat.key === 'super_admin';
                        return (
                          <Button
                            key={cat.key}
                            size="middle"
                            onClick={() => handleRoleCategoryClick(cat)}
                            loading={loading}
                            style={{
                              background: token.colorBgContainer,
                              borderColor: isSuper ? token.colorPrimary : token.colorBorderSecondary,
                              color: isSuper ? token.colorPrimary : token.colorText,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0 8px',
                              height: '36px',
                              width: '100%',
                              minWidth: 0,
                              boxSizing: 'border-box',
                              fontWeight: isSuper ? '600' : 'normal',
                            }}
                          >
                            <span
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                minWidth: 0,
                                overflow: 'hidden',
                              }}
                            >
                              <span style={{ flexShrink: 0, fontSize: '12px' }}>{cat.icon}</span>
                              <span
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontSize: '11px',
                                }}
                              >
                                {cat.label}
                              </span>
                            </span>
                            <span
                              style={{
                                flexShrink: 0,
                                fontSize: '10px',
                                padding: '1px 5px',
                                borderRadius: '8px',
                                lineHeight: '14px',
                                background: isSuper ? token.colorPrimary : themeMode === 'dark' ? '#222f47' : '#e2e8f0',
                                color: isSuper ? '#000' : token.colorTextSecondary,
                                fontWeight: '600',
                                marginLeft: '4px',
                              }}
                            >
                              {count}
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Step 2: Chọn User trong vai trò (khi vai trò có > 1 user) */
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                      }}
                    >
                      <Button
                        type="link"
                        size="small"
                        icon={<ArrowLeftOutlined />}
                        onClick={() => {
                          setSelectedCategoryKey(null);
                          setStaffSearchText('');
                        }}
                        style={{ padding: 0, height: 'auto', color: token.colorPrimary, fontSize: '11px' }}
                      >
                        Đổi vai trò
                      </Button>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: token.colorText }}>
                        {selectedCategory?.icon} {selectedCategory?.label} ({filteredCategoryUsers.length})
                      </span>
                    </div>

                    {getUsersForCategory(selectedCategory!).length > 4 && (
                      <Input
                        size="small"
                        prefix={<SearchOutlined style={{ color: token.colorTextPlaceholder }} />}
                        placeholder="Tìm tên hoặc username..."
                        value={staffSearchText}
                        onChange={(e) => setStaffSearchText(e.target.value)}
                        style={{ marginBottom: '8px' }}
                        allowClear
                      />
                    )}

                    <div
                      style={{
                        maxHeight: '180px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        paddingRight: '2px',
                      }}
                    >
                      {filteredCategoryUsers.map((u) => {
                        const isSuper =
                          isSuperAdminRole(u.role) ||
                          isCanonicalSuperAdminIdentity({ username: u.username, email: u.email });
                        return (
                          <Button
                            key={u.id}
                            size="middle"
                            onClick={() => handleUserSelect(u)}
                            loading={loading}
                            style={{
                              background: token.colorBgContainer,
                              borderColor: isSuper ? token.colorPrimary : token.colorBorderSecondary,
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              height: 'auto',
                              minHeight: '38px',
                              width: '100%',
                              boxSizing: 'border-box',
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                              <span
                                style={{
                                  fontWeight: '500',
                                  color: token.colorText,
                                  fontSize: '12px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {isSuper && '👑 '}
                                {u.displayName}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  color: token.colorTextDescription,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                @{u.username}
                              </span>
                            </div>
                            {isSuper ? (
                              <span
                                style={{
                                  flexShrink: 0,
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(250, 173, 20, 0.15)',
                                  color: '#faad14',
                                  fontWeight: '600',
                                  marginLeft: '6px',
                                }}
                              >
                                🔒 Mật khẩu
                              </span>
                            ) : (
                              <span
                                style={{
                                  flexShrink: 0,
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(24, 144, 255, 0.15)',
                                  color: '#1890ff',
                                  marginLeft: '6px',
                                }}
                              >
                                ⚡ 1-Click
                              </span>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Nhập tự do bất kỳ username/email */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <Input
                    size="middle"
                    placeholder="Custom username/email..."
                    value={mockEmail}
                    onChange={(e) => setMockEmail(e.target.value)}
                    style={{
                      background: token.colorBgContainer,
                      borderColor: token.colorBorderSecondary,
                      color: token.colorText,
                    }}
                    onPressEnter={() => {
                      const found = devStaffs.find((s) => s.username === mockEmail || s.email === mockEmail);
                      if (found) {
                        handleUserSelect(found);
                      } else {
                        executeLogin(mockEmail);
                      }
                    }}
                  />
                  <Button
                    size="middle"
                    type="primary"
                    onClick={() => {
                      const found = devStaffs.find((s) => s.username === mockEmail || s.email === mockEmail);
                      if (found) {
                        handleUserSelect(found);
                      } else {
                        executeLogin(mockEmail);
                      }
                    }}
                    loading={loading}
                    style={{ background: token.colorPrimary, borderColor: token.colorPrimary, color: '#000' }}
                  >
                    Go
                  </Button>
                </div>
                <div style={{ textAlign: 'center', marginTop: '6px' }}>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      setShowMockOptions(false);
                      setSelectedCategoryKey(null);
                      setStaffSearchText('');
                    }}
                    style={{ color: token.colorTextDescription, padding: 0, height: 'auto', fontSize: '11px' }}
                  >
                    Ẩn tùy chọn
                  </Button>
                </div>
              </div>
            ))}
        </div>

        {!showPasswordForm ? (
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Text
              style={{ color: token.colorTextDescription, cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => setShowPasswordForm(true)}
            >
              Hoặc đăng nhập bằng tài khoản & mật khẩu
            </Text>
          </div>
        ) : (
          <>
            <Divider
              style={{
                borderColor: token.colorBorderSecondary,
                margin: '24px 0 16px 0',
                color: token.colorTextDescription,
                fontSize: '12px',
              }}
            >
              TÀI KHOẢN & MẬT KHẨU
            </Divider>

            <Form
              name="login_form"
              initialValues={{ remember: true }}
              onFinish={onFinish}
              size="large"
              layout="vertical"
            >
              <Form.Item name="username" rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}>
                <Input
                  prefix={<UserOutlined style={{ color: token.colorTextPlaceholder }} />}
                  placeholder="Tên đăng nhập"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={
                  process.env.NODE_ENV !== 'production' ? [] : [{ required: true, message: 'Vui lòng nhập mật khẩu!' }]
                }
                extra={
                  process.env.NODE_ENV !== 'production' ? (
                    <span style={{ fontSize: '11px', color: token.colorTextDescription }}>
                      Dev mode: Tài khoản thường không cần mật khẩu; Super Admin yêu cầu mật khẩu
                    </span>
                  ) : undefined
                }
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: token.colorTextPlaceholder }} />}
                  placeholder={
                    process.env.NODE_ENV !== 'production'
                      ? 'Mật khẩu (Dev: Bỏ trống nếu không phải Super Admin)'
                      : 'Mật khẩu'
                  }
                />
              </Form.Item>

              <Form.Item className="mt-6 mb-2">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  style={{
                    background: token.colorPrimary,
                    borderColor: token.colorPrimary,
                    color: '#000',
                    fontWeight: '600',
                    height: '45px',
                  }}
                >
                  ĐĂNG NHẬP
                </Button>
              </Form.Item>
            </Form>

            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <Text
                style={{ color: token.colorTextDescription, cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => setShowPasswordForm(false)}
              >
                Quay lại đăng nhập Google
              </Text>
            </div>
          </>
        )}
      </Card>

      {/* Modal xác thực Super Admin trên Local Dev */}
      <Modal
        open={!!superAdminTarget}
        onCancel={() => {
          setSuperAdminTarget(null);
          setSuperAdminPass('');
        }}
        footer={null}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>👑</span>
            <span>Xác thực Super Admin (Dev Mode)</span>
          </div>
        }
        destroyOnClose
        centered
        width={380}
      >
        <div style={{ padding: '8px 0' }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: '12px' }}>
            Đăng nhập tài khoản Super Admin: <b>{superAdminTarget?.displayName}</b> (@{superAdminTarget?.username}).
            <br />
            Tài khoản Super Admin được bảo vệ. Vui lòng nhập mật khẩu xác thực.
          </Text>
          <Input.Password
            prefix={<LockOutlined style={{ color: token.colorTextPlaceholder }} />}
            placeholder="Nhập mật khẩu xác thực"
            value={superAdminPass}
            onChange={(e) => setSuperAdminPass(e.target.value)}
            onPressEnter={() => {
              if (superAdminTarget && superAdminPass) {
                executeLogin(superAdminTarget.username, superAdminPass);
                setSuperAdminTarget(null);
                setSuperAdminPass('');
              }
            }}
            size="large"
            style={{ marginBottom: '16px' }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              type="primary"
              block
              disabled={!superAdminPass}
              onClick={() => {
                if (superAdminTarget && superAdminPass) {
                  executeLogin(superAdminTarget.username, superAdminPass);
                  setSuperAdminTarget(null);
                  setSuperAdminPass('');
                }
              }}
              loading={loading}
              style={{
                background: token.colorPrimary,
                borderColor: token.colorPrimary,
                color: '#000',
                fontWeight: 'bold',
              }}
            >
              Xác Nhận Đăng Nhập
            </Button>
            <Button
              block
              onClick={() => {
                setSuperAdminTarget(null);
                setSuperAdminPass('');
              }}
            >
              Hủy
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
