'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDefaultRouteForRole } from '@mos-lab/shared';

export default function HomePage() {
  const router = useRouter();
  const [targetRoute, setTargetRoute] = useState('/dashboard');

  useEffect(() => {
    const token = localStorage.getItem('mos_token');
    const user = localStorage.getItem('mos_user');
    if (token && user) {
      try {
        const parsed = JSON.parse(user);
        const destination = getDefaultRouteForRole(parsed?.role);
        setTargetRoute(destination);
        router.replace(destination);
        return;
      } catch {
        router.replace('/dashboard');
        return;
      }
    }
    router.replace('/login');
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="max-w-md text-center">
        <h1 className="m-0 text-2xl font-bold">Wings Lashes CRM</h1>
        <p className="mb-5 mt-2 opacity-70">Đang chuyển hướng...</p>
        <Link href={targetRoute} className="font-semibold underline underline-offset-4">
          Mở CRM
        </Link>
      </section>
    </main>
  );
}
