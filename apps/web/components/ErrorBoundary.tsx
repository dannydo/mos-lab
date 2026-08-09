'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Result } from 'antd';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught client error:', error, errorInfo);
    if (
      typeof window !== 'undefined' &&
      (error?.name === 'ChunkLoadError' ||
        error?.message?.includes('Failed to load chunk') ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('CSS_CHUNK_LOAD_FAILED'))
    ) {
      console.warn('[ErrorBoundary] ChunkLoadError detected. Reloading page to fetch latest assets...');
      window.location.reload();
    }
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-slate-900 text-white">
          <Result
            status="error"
            title="Đã xảy ra lỗi trên trình duyệt"
            subTitle={this.state.error?.message || 'Vui lòng làm mới trang hoặc sử dụng trình duyệt Chrome cập nhật.'}
            extra={[
              <Button type="primary" key="reload" onClick={this.handleReload}>
                Tải lại trang
              </Button>,
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
