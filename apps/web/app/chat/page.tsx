'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MosChatProvider } from '../../components/mos-chat/context/MosChatContext';
import { MosChatMobileApp } from '../../components/mos-chat/mobile/MosChatMobileApp';
import { ErrorBoundary } from '../../components/ErrorBoundary';

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem('mos_user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <ErrorBoundary fallback={null}>
      <MosChatProvider currentUser={currentUser}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    </ErrorBoundary>
  );
}
