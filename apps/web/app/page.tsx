'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { resolveRoleLandingRoute } from '../lib/resolve-landing-route';

export default function HomePage() {
  const router = useRouter();
  const [targetRoute, setTargetRoute] = useState('/dashboard');

  useEffect(() => {
    const token = localStorage.getItem('mos_token');
    const user = localStorage.getItem('mos_user');
    if (!token || !user) {
      router.replace('/login');
      return;
    }
    let parsed: { role?: string | null; teamCodes?: string[] | null } | null = null;
    try {
      parsed = JSON.parse(user);
    } catch {
      parsed = null;
    }
    let cancelled = false;
    void resolveRoleLandingRoute(parsed).then((destination) => {
      if (cancelled) return;
      setTargetRoute(destination);
      router.replace(destination);
    });
    return () => {
      cancelled = true;
    };
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
