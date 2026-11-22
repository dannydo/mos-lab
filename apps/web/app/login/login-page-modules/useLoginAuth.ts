'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import type { LoginResponse, SafeAny } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import {
  clearAuthStorageKeys,
  GOOGLE_GIS_CLIENT_ID,
  isLocalDevLoginEnabled,
  persistLoginSession,
  resolvePostLoginRoute,
} from './loginConstants';

export interface UseLoginAuthOptions {
  onSwitchAccountEnableMock?: () => void;
}

export interface PasswordLoginFormValues {
  username: string;
  password?: string;
}

export function useLoginAuth({ onSwitchAccountEnableMock }: UseLoginAuthOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const onSwitchRef = useRef(onSwitchAccountEnableMock);
  onSwitchRef.current = onSwitchAccountEnableMock;

  const completeAuthFlow = useCallback(
    async (
      requestFn: () => Promise<LoginResponse>,
      successLabel: string,
      fallbackErrorMsg: string,
      logLabel: string
    ) => {
      setLoading(true);
      let navigating = false;
      try {
        const data = await requestFn();
        persistLoginSession(data);
        message.success(`${successLabel} Chào mừng ${data.user.displayName}`);
        navigating = true;
        window.location.replace(await resolvePostLoginRoute(data.user));
      } catch (error) {
        console.error(logLabel, error);
        const errMsg = (error as SafeAny).response?.data?.message || fallbackErrorMsg;
        message.error(errMsg);
      } finally {
        if (!navigating) {
          setLoading(false);
        }
      }
    },
    []
  );

  const handleGoogleLogin = useCallback(
    async (googleResponse: SafeAny) => {
      await completeAuthFlow(
        () => apiClient.auth.google({ credential: googleResponse.credential }),
        'Đăng nhập Google thành công!',
        'Đăng nhập Google thất bại.',
        'Google login error:'
      );
    },
    [completeAuthFlow]
  );

  const handleMockGoogleLogin = useCallback(
    async (emailToMock = 'danhdo@gmail.com', nameToMock = 'Danh Do') => {
      await completeAuthFlow(
        () => apiClient.auth.google({ isMock: true, email: emailToMock, name: nameToMock }),
        'Đăng nhập Google (Mock) thành công!',
        'Đăng nhập Mock Google thất bại.',
        'Mock login error:'
      );
    },
    [completeAuthFlow]
  );

  const executeLogin = useCallback(
    async (username: string, password = '') => {
      await completeAuthFlow(
        () => apiClient.auth.login({ username, password }),
        'Đăng nhập thành công!',
        'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.',
        'Login error:'
      );
    },
    [completeAuthFlow]
  );

  const onFinish = useCallback(
    async (values: PasswordLoginFormValues) => {
      await executeLogin(values.username, values.password || '');
    },
    [executeLogin]
  );

  const handleGoogleLoginRef = useRef(handleGoogleLogin);
  handleGoogleLoginRef.current = handleGoogleLogin;

  // Check if already logged in or switching accounts
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('switch') === '1') {
      clearAuthStorageKeys();
      if (isLocalDevLoginEnabled) {
        onSwitchRef.current?.();
      }
      return;
    }

    const token = localStorage.getItem('mos_token');
    const user = localStorage.getItem('mos_user');
    if (token && user) {
      let parsed: SafeAny = null;
      try {
        parsed = JSON.parse(user);
      } catch {
        parsed = null;
      }
      void resolvePostLoginRoute(parsed).then((route) => window.location.replace(route));
    }
  }, []);

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
            client_id: GOOGLE_GIS_CLIENT_ID,
            callback: (resp: SafeAny) => handleGoogleLoginRef.current(resp),
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

  return {
    loading,
    showPasswordForm,
    setShowPasswordForm,
    handleGoogleLogin,
    handleMockGoogleLogin,
    executeLogin,
    onFinish,
  };
}
