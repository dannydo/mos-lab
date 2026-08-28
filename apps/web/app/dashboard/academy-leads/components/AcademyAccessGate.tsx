'use client';

import React from 'react';
import { Button } from 'antd';
import { apiClient } from '../../../../lib/api-client';
import { StatePanel } from '../../../../components/ui';

type AcademyAccessContextValue = {
  canAccess: boolean;
  canManage: boolean;
  scope: 'ADMIN' | 'ACADEMY_TEAM' | null;
};

const AcademyAccessContext = React.createContext<AcademyAccessContextValue>({
  canAccess: false,
  canManage: false,
  scope: null,
});

export function useAcademyAccess() {
  return React.useContext(AcademyAccessContext);
}

export default function AcademyAccessGate({ children }: { children: React.ReactNode }) {
  const [access, setAccess] = React.useState<AcademyAccessContextValue | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const requestVersionRef = React.useRef(0);

  const loadAccess = React.useCallback(async () => {
    const version = ++requestVersionRef.current;
    setAccess(null);
    setError(null);
    try {
      const response = await apiClient.academySales.getAccess();
      if (version !== requestVersionRef.current) return;
      setAccess(response.data);
    } catch (nextError: any) {
      if (version !== requestVersionRef.current) return;
      setError(nextError?.response?.data?.message || 'Không thể xác thực quyền truy cập Academy.');
    }
  }, []);

  React.useEffect(() => {
    void loadAccess();
  }, [loadAccess]);

  if (error) {
    return (
      <StatePanel
        kind="error"
        title="Không thể xác thực quyền Academy"
        description={error}
        extra={<Button onClick={() => void loadAccess()}>Thử lại</Button>}
      />
    );
  }
  if (!access) return <StatePanel kind="loading" title="Đang xác thực quyền Academy…" />;
  if (!access.canAccess) {
    return (
      <StatePanel
        kind="error"
        title="Bạn không có quyền truy cập Academy"
        description="Khu vực này chỉ dành cho Admin hoặc thành viên đang hoạt động của Department Academy."
      />
    );
  }

  return <AcademyAccessContext.Provider value={access}>{children}</AcademyAccessContext.Provider>;
}
