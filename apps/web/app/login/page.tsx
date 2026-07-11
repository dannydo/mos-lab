'use client';

import '../suppress-warnings';
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message, Divider } from 'antd';
import { UserOutlined, LockOutlined, GoogleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [mockEmail, setMockEmail] = useState('danny.do@wingslashes.com');
  const [showMockOptions, setShowMockOptions] = useState(false);
  const router = useRouter();

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('mos_token');
    if (token) {
      router.push('/dashboard/customers');
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
      if ((window as any).google) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '648958464510-tedkbs4n8dmrgfjhqegcien7r0u7ed9g.apps.googleusercontent.com',
            callback: handleGoogleLogin,
          });
          (window as any).google.accounts.id.renderButton(
            document.getElementById('google-signin-btn'),
            { theme: 'dark', size: 'large', type: 'standard', width: 350 }
          );
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

  const handleGoogleLogin = async (googleResponse: any) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/google', {
        credential: googleResponse.credential
      });

      const { token, user } = response.data;
      
      localStorage.setItem('mos_token', token);
      localStorage.setItem('mos_user', JSON.stringify(user));

      message.success(`Đăng nhập Google thành công! Chào mừng ${user.displayName}`);
      router.push('/dashboard/customers');
    } catch (error: any) {
      console.error('Google login error:', error);
      const errMsg = error.response?.data?.message || 'Đăng nhập Google thất bại.';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleMockGoogleLogin = async (emailToMock = 'danhdo@gmail.com', nameToMock = 'Danh Do') => {
    setLoading(true);
    try {
      const response = await api.post('/auth/google', {
        isMock: true,
        email: emailToMock,
        name: nameToMock
      });

      const { token, user } = response.data;
      
      localStorage.setItem('mos_token', token);
      localStorage.setItem('mos_user', JSON.stringify(user));

      message.success(`Đăng nhập Google (Mock) thành công! Chào mừng ${user.displayName}`);
      router.push('/dashboard/customers');
    } catch (error: any) {
      console.error('Mock login error:', error);
      const errMsg = error.response?.data?.message || 'Đăng nhập Mock Google thất bại.';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        username: values.username,
        password: values.password,
      });

      const { token, user } = response.data;
      
      localStorage.setItem('mos_token', token);
      localStorage.setItem('mos_user', JSON.stringify(user));

      message.success(`Đăng nhập thành công! Chào mừng ${user.displayName}`);
      router.push('/dashboard/customers');
    } catch (error: any) {
      console.error('Login error:', error);
      const errMsg = error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="flex items-center justify-center min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
        padding: '20px'
      }}
    >
      <Card 
        style={{ 
          width: 400, 
          borderRadius: 12, 
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          background: '#141414',
          border: '1px solid #2a2a2a'
        }}
      >
        <div className="text-center mb-8">
          <div 
            className="mx-auto mb-4 flex items-center justify-center"
            style={{
              width: 70,
              height: 70,
              borderRadius: '50%',
              background: '#D4A84B',
              fontSize: '28px',
              color: '#000',
              fontWeight: 'bold',
              boxShadow: '0 0 15px rgba(212, 168, 75, 0.4)'
            }}
          >
            W
          </div>
          <Title level={3} style={{ color: '#D4A84B', margin: 0 }}>WINGS LASHES</Title>
          <Text style={{ color: '#888' }}>Living Lab CRM — Telesales Portal</Text>
        </div>

        <div className="flex flex-col items-center gap-3 w-full">
          {/* Real Google GSI button */}
          <div id="google-signin-btn" style={{ minHeight: '40px', width: '100%', display: 'flex', justifyContent: 'center' }}></div>

          {/* Dev Mock login selection */}
          {process.env.NODE_ENV !== 'production' && (
            !showMockOptions ? (
              <Button
                type="default"
                icon={<GoogleOutlined />}
                onClick={() => setShowMockOptions(true)}
                block
                style={{
                  background: '#222',
                  borderColor: '#333',
                  color: '#D4A84B',
                  height: '40px',
                  fontWeight: '500'
                }}
              >
                Mock Google Sign-In Options (Dev)
              </Button>
            ) : (
              <div style={{ width: '100%', background: '#1c1c1c', padding: '12px', borderRadius: '8px', border: '1px solid #333' }}>
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px', textAlign: 'center', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                  MOCK LOGIN (LOCAL DEV ONLY)
                </div>
                <div className="flex flex-col gap-2" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Button
                    size="middle"
                    onClick={() => handleMockGoogleLogin('danny.do@wingslashes.com', 'Danny Wings')}
                    loading={loading}
                    style={{ background: '#262626', borderColor: '#434343', color: '#D4A84B', width: '100%', textAlign: 'left' }}
                  >
                    Danny Wings (danny.do@wingslashes.com)
                  </Button>
                  <Button
                    size="middle"
                    onClick={() => handleMockGoogleLogin('danhdo@gmail.com', 'Danh Do')}
                    loading={loading}
                    style={{ background: '#262626', borderColor: '#434343', color: '#D4A84B', width: '100%', textAlign: 'left' }}
                  >
                    Danh Do (danhdo@gmail.com)
                  </Button>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <Input 
                      size="middle" 
                      placeholder="Custom email..." 
                      value={mockEmail}
                      onChange={(e) => setMockEmail(e.target.value)}
                      style={{ background: '#1f1f1f', border: '1px solid #333', color: '#fff' }}
                    />
                    <Button
                      size="middle"
                      type="primary"
                      onClick={() => handleMockGoogleLogin(mockEmail, mockEmail.split('@')[0])}
                      loading={loading}
                      style={{ background: '#D4A84B', borderColor: '#D4A84B', color: '#000' }}
                    >
                      Go
                    </Button>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '4px' }}>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => setShowMockOptions(false)}
                      style={{ color: '#666', padding: 0, height: 'auto' }}
                    >
                      Hide Mock Options
                    </Button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {!showPasswordForm ? (
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Text 
              style={{ color: '#888', cursor: 'pointer', textDecoration: 'underline' }} 
              onClick={() => setShowPasswordForm(true)}
            >
              Hoặc đăng nhập bằng tài khoản & mật khẩu
            </Text>
          </div>
        ) : (
          <>
            <Divider style={{ borderColor: '#333', margin: '24px 0 16px 0', color: '#666', fontSize: '12px' }}>
              TÀI KHOẢN & MẬT KHẨU
            </Divider>

            <Form
              name="login_form"
              initialValues={{ remember: true }}
              onFinish={onFinish}
              size="large"
              layout="vertical"
            >
              <Form.Item
                name="username"
                rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}
              >
                <Input 
                  prefix={<UserOutlined style={{ color: '#888' }} />} 
                  placeholder="Tên đăng nhập" 
                  style={{
                    background: '#1f1f1f',
                    border: '1px solid #333',
                    color: '#fff'
                  }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#888' }} />}
                  placeholder="Mật khẩu"
                  style={{
                    background: '#1f1f1f',
                    border: '1px solid #333',
                    color: '#fff'
                  }}
                />
              </Form.Item>

              <Form.Item className="mt-6 mb-2">
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  block
                  style={{
                    background: '#D4A84B',
                    borderColor: '#D4A84B',
                    color: '#000',
                    fontWeight: '600',
                    height: '45px'
                  }}
                >
                  ĐĂNG NHẬP
                </Button>
              </Form.Item>
            </Form>
            
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <Text 
                style={{ color: '#888', cursor: 'pointer', textDecoration: 'underline' }} 
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
