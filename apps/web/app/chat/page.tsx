'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { isCvRole } from '@mos-lab/shared';
import type { MosChatActiveSubtab } from '../../components/mos-chat/types/mos-chat-types';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { OmiCallProvider } from '../../context/OmiCallContext';
import { apiClient } from '../../lib/api-client';

const MosGoogleChatPortal = dynamic(() => import('../../components/mos-chat/MosGoogleChatPortal'), { ssr: false });
const MosChatMobileApp = dynamic(
  () => import('../../components/mos-chat/mobile/MosChatMobileApp').then((m) => m.MosChatMobileApp),
  { ssr: false }
);
const MosChatProvider = dynamic(
  () => import('../../components/mos-chat/context/MosChatContext').then((m) => m.MosChatProvider),
  { ssr: false }
);
const OmiCallWidget = dynamic(() => import('../../components/OmiCallWidget'), { ssr: false });
const CallLogModal = dynamic(() => import('../../components/CallLogModal'), { ssr: false });

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
      const token = window.localStorage.getItem('mos_token');
      if (!token) {
        window.location.replace('/login');
        return;
      }
      const stored = window.localStorage.getItem('mos_user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
      if (typeof apiClient?.auth?.me === 'function') {
        void Promise.resolve(apiClient.auth.me())
          .then((freshUser) => {
            if (freshUser?.id) {
              setCurrentUser((prev: any) => {
                const merged = { ...(prev || {}), ...freshUser };
                try {
                  window.localStorage.setItem('mos_user', JSON.stringify(merged));
                } catch {}
                return merged;
              });
            }
          })
          .catch(() => {});
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
  const threadRootMessageId = searchParams?.get('threadId') || searchParams?.get('threadRootMessageId') || undefined;
  const tab = searchParams?.get('tab') as MosChatActiveSubtab | undefined;
  const taskId = searchParams?.get('taskId') || undefined;

  const targetNavigation = useMemo(() => {
    if (!convId && !msgId && !threadRootMessageId && !tab && !taskId) return null;
    return {
      conversationId: convId,
      messageId: msgId,
      threadRootMessageId,
      openTab: tab,
      taskId: taskId,
      timestamp: Date.now(),
    };
  }, [convId, msgId, threadRootMessageId, tab, taskId]);

  if (isMobile) {
    return (
      <MosChatProvider currentUser={currentUser} initialConvId={convId} initialSubtab={tab}>
        <MosChatMobileApp standalone={true} initialNavTarget={targetNavigation} />
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
          window.location.href = isCvRole(currentUser?.role) ? '/dashboard/cv' : '/dashboard';
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
      <OmiCallProvider>
        <Suspense
          fallback={
            <div className="h-screen w-screen flex items-center justify-center bg-[var(--background)] text-[var(--mos-text-muted)]">
              Đang khởi tạo mOS Chat...
            </div>
          }
        >
          <ChatPageContent />
        </Suspense>
        <OmiCallWidget />
        <CallLogModal />
      </OmiCallProvider>
    </ErrorBoundary>
  );
}
