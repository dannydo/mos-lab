'use client';

import '../suppress-warnings';
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message, Divider, theme } from 'antd';
import { UserOutlined, LockOutlined, GoogleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../lib/api-client';
import { useTheme } from '../../context/ThemeContext';

const { Title, Text } = Typography;

export default function LoginPage() {
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [mockEmail, setMockEmail] = useState('danny.do@wingslashes.com');
  const [showMockOptions, setShowMockOptions] = useState(false);
  const router = useRouter();

  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('mos_token');
    const user = localStorage.getItem('mos_user');
    if (token && user) {
      router.push('/dashboard');
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
      router.push('/dashboard');
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
      router.push('/dashboard');
    } catch (error) {
      console.error('Mock login error:', error);
      const errMsg = (error as SafeAny).response?.data?.message || 'Đăng nhập Mock Google thất bại.';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: SafeAny) => {
    setLoading(true);
    try {
      const data = await apiClient.auth.login({
        username: values.username,
        password: values.password,
      });

      const { token, user, resolvedOmicallAutoInit } = data;

      localStorage.setItem('mos_token', token);
      localStorage.setItem('mos_user', JSON.stringify(user));
      localStorage.setItem('mos_omicall_auto_init', String(!!resolvedOmicallAutoInit));

      message.success(`Đăng nhập thành công! Chào mừng ${user.displayName}`);
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      const errMsg =
        (error as SafeAny).response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

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
          width: 400,
          borderRadius: 12,
          boxShadow: themeMode === 'dark' ? '0 8px 30px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.08)',
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
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

        <div className="flex flex-col items-center gap-3 w-full">
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
                Mock Google Sign-In Options (Dev)
              </Button>
            ) : (
              <div
                style={{
                  width: '100%',
                  background: themeMode === 'dark' ? '#141c2e' : '#f8fafc',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${token.colorBorderSecondary}`,
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
                <div className="flex flex-col gap-2" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Button
                    size="middle"
                    onClick={() => handleMockGoogleLogin('danny.do@wingslashes.com', 'Danny Wings')}
                    loading={loading}
                    style={{
                      background: token.colorBgContainer,
                      borderColor: token.colorBorderSecondary,
                      color: token.colorPrimary,
                      width: '100%',
                      textAlign: 'left',
                    }}
                  >
                    Danny Wings (danny.do@wingslashes.com)
                  </Button>
                  <Button
                    size="middle"
                    onClick={() => handleMockGoogleLogin('danhdo@gmail.com', 'Danh Do')}
                    loading={loading}
                    style={{
                      background: token.colorBgContainer,
                      borderColor: token.colorBorderSecondary,
                      color: token.colorPrimary,
                      width: '100%',
                      textAlign: 'left',
                    }}
                  >
                    Danh Do (danhdo@gmail.com)
                  </Button>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <Input
                      size="middle"
                      placeholder="Custom email..."
                      value={mockEmail}
                      onChange={(e) => setMockEmail(e.target.value)}
                      style={{
                        background: token.colorBgContainer,
                        borderColor: token.colorBorderSecondary,
                        color: token.colorText,
                      }}
                    />
                    <Button
                      size="middle"
                      type="primary"
                      onClick={() => handleMockGoogleLogin(mockEmail, mockEmail.split('@')[0])}
                      loading={loading}
                      style={{ background: token.colorPrimary, borderColor: token.colorPrimary, color: '#000' }}
                    >
                      Go
                    </Button>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '4px' }}>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => setShowMockOptions(false)}
                      style={{ color: token.colorTextDescription, padding: 0, height: 'auto' }}
                    >
                      Ẩn tùy chọn
                    </Button>
                  </div>
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

              <Form.Item name="password" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}>
                <Input.Password
                  prefix={<LockOutlined style={{ color: token.colorTextPlaceholder }} />}
                  placeholder="Mật khẩu"
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
    </div>
  );
}
