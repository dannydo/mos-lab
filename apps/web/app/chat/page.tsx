'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { ErrorBoundary } from '../../components/ErrorBoundary';

const MosGoogleChatPortal = dynamic(() => import('../../components/mos-chat/MosGoogleChatPortal'), { ssr: false });
const MosChatMobileApp = dynamic(
  () => import('../../components/mos-chat/mobile/MosChatMobileApp').then((m) => m.MosChatMobileApp),
  { ssr: false }
);
const MosChatProvider = dynamic(
  () => import('../../components/mos-chat/context/MosChatContext').then((m) => m.MosChatProvider),
  { ssr: false }
);

function ChatPageContent() {
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

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

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const convId =
    searchParams?.get('chatConvId') || searchParams?.get('conversationId') || searchParams?.get('convId') || undefined;
  const msgId =
    searchParams?.get('chatMsgId') || searchParams?.get('messageId') || searchParams?.get('msgId') || undefined;
  const tab = searchParams?.get('tab') as 'chat' | 'tasks' | 'pinned' | undefined;
  const taskId = searchParams?.get('taskId') || undefined;

  const targetNavigation = useMemo(() => {
    if (!convId && !msgId && !tab && !taskId) return null;
    return {
      conversationId: convId,
      messageId: msgId,
      openTab: tab,
      taskId: taskId,
      timestamp: Date.now(),
    };
  }, [convId, msgId, tab, taskId]);

  if (isMobile) {
    return (
      <MosChatProvider currentUser={currentUser}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );
  }

  return (
    <MosGoogleChatPortal
      open={true}
      standalone={true}
      currentUser={currentUser}
      onClose={() => {
        if (typeof window !== 'undefined' && window.opener) {
          window.close();
        } else if (typeof window !== 'undefined') {
          window.location.href = '/dashboard';
        }
      }}
      onToggle={() => {}}
      targetNavigation={targetNavigation}
    />
  );
}

export default function ChatPage() {
  return (
    <ErrorBoundary fallback={<div className="p-8 text-center text-slate-400">Không thể tải mOS Chat</div>}>
      <Suspense
        fallback={
          <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-400">
            Đang khởi tạo mOS Chat...
          </div>
        }
      >
        <ChatPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}
