'use client';

import React from 'react';
import { Result, Spin } from 'antd';
import { useParams } from 'next/navigation';
import type { AcademyWorkshopPublicSession } from '@mos-lab/shared';
import { apiClient } from '../../../../../lib/api-client';
import AcademyWorkshopPlayer from '../../components/AcademyWorkshopPlayer';

export default function AcademyWorkshopStudentPage() {
  const params = useParams<{ token: string }>();
  const rawToken = decodeURIComponent(String(params.token || ''));
  const [session, setSession] = React.useState<AcademyWorkshopPublicSession | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!rawToken) return;
    const key = `academy-workshop-session:${rawToken}`;
    let disposed = false;
    const start = async () => {
      setLoading(true);
      try {
        const cached = window.localStorage.getItem(key);
        let nextSession: AcademyWorkshopPublicSession | null = cached ? JSON.parse(cached) : null;
        if (!nextSession || new Date(nextSession.expiresAt) <= new Date()) {
          nextSession = await apiClient.academyWorkshopsPublic.redeemQr({ qrToken: rawToken });
          window.localStorage.setItem(key, JSON.stringify(nextSession));
        }
        if (!disposed) setSession(nextSession);
      } catch (cause: any) {
        if (!disposed) {
          setError(
            cause?.code === 'ECONNABORTED'
              ? 'Không thể kết nối máy chủ workshop. Hãy kiểm tra Wi-Fi rồi thử lại.'
              : cause?.response?.data?.message || 'QR workshop không hợp lệ hoặc session đã hết hạn.'
          );
        }
      } finally {
        if (!disposed) setLoading(false);
      }
    };
    void start();
    return () => {
      disposed = true;
    };
  }, [rawToken]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#071a2c] text-white">
        <Spin size="large" />
        <span className="ml-3">Đang vào workshop…</span>
      </main>
    );
  }
  if (error || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#071a2c] p-6">
        <Result status="warning" title="Không thể vào workshop" subTitle={error || 'Session không hợp lệ.'} />
      </main>
    );
  }
  return <AcademyWorkshopPlayer session={session} />;
}
