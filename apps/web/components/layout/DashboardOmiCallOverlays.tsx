'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useOmiCall } from '../../context/OmiCallContext';

const OmiCallWidget = dynamic(() => import('../OmiCallWidget'), { ssr: false });
const CallLogModal = dynamic(() => import('../CallLogModal'), { ssr: false });

/**
 * Mounts OmiCall SIP widget & call-log modal chunks only when OmiCall UI or logging is active.
 */
export function DashboardOmiCallOverlays() {
  const {
    canAccessOmiCall,
    isAdmin,
    adminOmiCallEnabled,
    callState,
    isRegistered,
    omicallReady,
    floatingLauncherVisible,
    isCallLogModalOpen,
  } = useOmiCall();

  const [hasOpenedCallLog, setHasOpenedCallLog] = useState(isCallLogModalOpen);

  useEffect(() => {
    if (isCallLogModalOpen) {
      setHasOpenedCallLog(true);
    }
  }, [isCallLogModalOpen]);

  const shouldMountWidget =
    canAccessOmiCall &&
    (!isAdmin || adminOmiCallEnabled || callState !== 'idle') &&
    (callState !== 'idle' || isRegistered || omicallReady || floatingLauncherVisible);

  const shouldMountCallLog = isCallLogModalOpen || hasOpenedCallLog;

  return (
    <>
      {shouldMountWidget && <OmiCallWidget />}
      {shouldMountCallLog && <CallLogModal />}
    </>
  );
}
