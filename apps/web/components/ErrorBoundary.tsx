'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Result } from 'antd';
import { openBugReport, recordClientError } from '../lib/bug-diagnostics';
import { handleAutoChunkReload, reportFrontendIssue } from '../lib/telemetry/frontend-observer';

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
    recordClientError(error);
    reportFrontendIssue({
      issueType: 'REACT_CRASH',
      error: {
        name: error.name || 'ReactCrash',
        message: error.message || 'React component crashed',
        stack: error.stack || null,
      },
      metadata: {
        componentStack: errorInfo.componentStack?.slice(0, 1000),
      },
    });
    if (typeof window !== 'undefined' && handleAutoChunkReload(error)) {
      return;
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
              <Button key="report" onClick={() => openBugReport(this.state.error)}>
                Báo lỗi này
              </Button>,
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
