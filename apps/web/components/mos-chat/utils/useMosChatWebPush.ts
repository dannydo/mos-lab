'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { message as antdMessage } from 'antd';
import type { SafeAny } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface UseMosChatWebPushOptions {
  enabled: boolean;
  onSelectConversationFromPush?: (conversationId: string, messageId?: string) => void;
}

export function useMosChatWebPush({ enabled, onSelectConversationFromPush }: UseMosChatWebPushOptions) {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isStandalonePwa, setIsStandalonePwa] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [subscribedCount, setSubscribedCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [testCountdown, setTestCountdown] = useState<number>(0);

  const vapidPublicKeyRef = useRef<string>('');
  const onSelectConvRef = useRef(onSelectConversationFromPush);
  onSelectConvRef.current = onSelectConversationFromPush;

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return;

    const ua = window.navigator.userAgent || '';
    const iosDetected =
      /iPad|iPhone|iPod/.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    const standaloneDetected =
      window.matchMedia?.('(display-mode: standalone)')?.matches || Boolean((window.navigator as SafeAny).standalone);

    setIsIos(iosDetected);
    setIsStandalonePwa(standaloneDetected);

    const pushSupported = 'serviceWorker' in window.navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(pushSupported);

    if ('Notification' in window) {
      setPermission(window.Notification.permission);
    }

    let cancelled = false;

    const initPushState = async () => {
      try {
        const cfg = await apiClient.chat.getPushConfig();
        if (cancelled) return;
        if (cfg?.vapidPublicKey) {
          vapidPublicKeyRef.current = cfg.vapidPublicKey;
        }
        if (typeof cfg?.subscribedCount === 'number') {
          setSubscribedCount(cfg.subscribedCount);
        }

        if (!pushSupported) return;

        const reg = await window.navigator.serviceWorker.register('/sw.js');
        let existingSub = await reg.pushManager.getSubscription();
        if (cancelled) return;

        // Self-healing: if subscription key does not match server key, renew it
        if (existingSub && cfg?.vapidPublicKey && existingSub.options?.applicationServerKey) {
          try {
            const currentKeyBytes = new Uint8Array(existingSub.options.applicationServerKey);
            const expectedKeyBytes = urlBase64ToUint8Array(cfg.vapidPublicKey);
            let matches = currentKeyBytes.length === expectedKeyBytes.length;
            if (matches) {
              for (let i = 0; i < currentKeyBytes.length; i++) {
                if (currentKeyBytes[i] !== expectedKeyBytes[i]) {
                  matches = false;
                  break;
                }
              }
            }
            if (!matches) {
              await existingSub.unsubscribe().catch(() => {});
              existingSub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(cfg.vapidPublicKey),
              });
            }
          } catch {
            // ignore renewal error
          }
        }

        // Auto-subscribe if notification permission is already granted but no subscription exists
        if (!existingSub && window.Notification.permission === 'granted' && cfg?.vapidPublicKey) {
          try {
            existingSub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(cfg.vapidPublicKey),
            });
          } catch {
            // ignore background auto-subscribe error
          }
        }

        if (existingSub) {
          setIsSubscribed(true);
          const subJson = existingSub.toJSON();
          if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
            const syncRes = await apiClient.chat
              .subscribePush({
                subscription: {
                  endpoint: subJson.endpoint,
                  expirationTime: subJson.expirationTime ?? null,
                  keys: {
                    p256dh: subJson.keys.p256dh,
                    auth: subJson.keys.auth,
                  },
                  userAgent: ua.slice(0, 180),
                },
              })
              .catch(() => null);
            if (!cancelled && syncRes && typeof syncRes.subscribedCount === 'number') {
              setSubscribedCount(syncRes.subscribedCount);
            }
          }
        } else {
          setIsSubscribed(false);
        }
      } catch {
        // ignore background init errors
      }
    };

    void initPushState();

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'MOS_PUSH_NOTIFICATION_CLICK') {
        const convId = event.data?.data?.conversationId;
        const msgId = event.data?.data?.messageId;
        if (convId && onSelectConvRef.current) {
          onSelectConvRef.current(String(convId), msgId ? String(msgId) : undefined);
        }
        if (convId && typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('mos-chat:open', {
              detail: {
                conversationId: String(convId),
                messageId: msgId ? String(msgId) : undefined,
              },
            })
          );
        }
      }
    };

    if ('serviceWorker' in window.navigator) {
      window.navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      cancelled = true;
      if ('serviceWorker' in window.navigator) {
        window.navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [enabled]);

  const enablePushNotifications = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    if (!('serviceWorker' in window.navigator) || !('PushManager' in window) || !('Notification' in window)) {
      antdMessage.warning(
        'Trên iPhone, hãy bấm "Chia sẻ → Thêm vào MH chính" rồi mở icon mOS để bật chuông báo khi khóa máy.'
      );
      return false;
    }

    setIsLoading(true);
    try {
      const perm = await window.Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        antdMessage.warning('Bạn cần cho phép quyền Thông báo (Allow Notifications) để nhận cuộc gọi khi khóa máy.');
        return false;
      }

      if (!vapidPublicKeyRef.current) {
        const cfg = await apiClient.chat.getPushConfig();
        vapidPublicKeyRef.current = cfg.vapidPublicKey;
      }

      const reg = await window.navigator.serviceWorker.register('/sw.js');
      await window.navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKeyRef.current),
        });
      }

      const subJson = sub.toJSON();
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        throw new Error('Không lấy được khóa mã hóa Push Subscription từ trình duyệt.');
      }

      const res = await apiClient.chat.subscribePush({
        subscription: {
          endpoint: subJson.endpoint,
          expirationTime: subJson.expirationTime ?? null,
          keys: {
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth,
          },
          userAgent: (window.navigator.userAgent || '').slice(0, 180),
        },
      });

      setIsSubscribed(true);
      setSubscribedCount(res.subscribedCount);
      antdMessage.success('Đã bật thông báo cuộc gọi khi khóa màn hình!');
      return true;
    } catch (err: SafeAny) {
      antdMessage.error(err?.response?.data?.message || err?.message || 'Không thể bật thông báo đẩy.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disablePushNotifications = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined' || !('serviceWorker' in window.navigator)) return;
    setIsLoading(true);
    try {
      const reg = await window.navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe().catch(() => {});
        const res = await apiClient.chat.unsubscribePush({ endpoint }).catch(() => null);
        if (res && typeof res.subscribedCount === 'number') {
          setSubscribedCount(res.subscribedCount);
        }
      }
      setIsSubscribed(false);
      antdMessage.info('Đã tắt thông báo cuộc gọi trên thiết bị này.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendDelayedTestPush = useCallback(
    async (delaySec = 4): Promise<void> => {
      if (testCountdown > 0) return;
      setTestCountdown(delaySec);

      for (let remaining = delaySec; remaining > 0; remaining--) {
        setTestCountdown(remaining);
        await new Promise((r) => setTimeout(r, 1000));
      }
      setTestCountdown(0);

      try {
        const res = await apiClient.chat.sendTestPush();
        if (res.sent > 0) {
          antdMessage.success('Đã bắn thông báo cuộc gọi thử nghiệm tới thiết bị của bạn!');
        } else {
          antdMessage.warning('Chưa có thiết bị nào đăng ký nhận thông báo. Hãy bật thông báo trước.');
        }
      } catch {
        antdMessage.error('Không thể gửi thông báo thử nghiệm.');
      }
    },
    [testCountdown]
  );

  const sendTestCallPushNow = useCallback(
    async (targetConversationId?: string): Promise<boolean> => {
      try {
        const res = await apiClient.chat.sendTestPush({
          title: '📞 Cuộc gọi thử nghiệm từ mOS Chat',
          body: 'Thông báo cuộc gọi khi khóa màn hình iPhone đã hoạt động hoàn hảo!',
          conversationId: targetConversationId,
        });
        if (res.sent > 0) {
          antdMessage.success('Đã bắn chuông thông báo cuộc gọi đến thiết bị của bạn!');
          return true;
        } else {
          antdMessage.warning('Chưa có thiết bị nào đăng ký nhận thông báo. Hãy bấm "Bật ngay" trước.');
          return false;
        }
      } catch {
        antdMessage.error('Không thể gửi thông báo thử nghiệm.');
        return false;
      }
    },
    []
  );

  const needsIosHomeScreen = isIos && !isStandalonePwa && !isSupported;

  return {
    isSupported,
    isIos,
    isStandalonePwa,
    needsIosHomeScreen,
    permission,
    isSubscribed,
    subscribedCount,
    isLoading,
    testCountdown,
    enablePushNotifications,
    disablePushNotifications,
    sendDelayedTestPush,
    sendTestCallPushNow,
  };
}
