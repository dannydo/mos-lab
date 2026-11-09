/* eslint-disable no-restricted-globals */
// mOS Lab Service Worker — Web Push Notifications for Voice Calls & Urgent Buzz (iOS PWA & Desktop)

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {
    title: '📞 Thông báo từ mOS Chat',
    body: 'Bạn có cuộc gọi hoặc tin nhắn khẩn cấp mới',
    icon: '/apple-touch-icon.png',
    badge: '/icon-192.png',
    tag: 'mos-chat-push',
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 150, 300, 150, 300],
    data: {
      type: 'VOICE_CALL_INCOMING',
      url: '/chat',
    },
  };

  try {
    const parsed = event.data.json();
    if (parsed && typeof parsed === 'object') {
      payload = {
        ...payload,
        ...parsed,
        data: {
          ...payload.data,
          ...(parsed.data || {}),
        },
      };
    }
  } catch {
    try {
      payload.body = event.data.text() || payload.body;
    } catch {
      // ignore
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/apple-touch-icon.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || 'mos-chat-push',
    renotify: payload.renotify !== false,
    requireInteraction: payload.requireInteraction !== false,
    vibrate: Array.isArray(payload.vibrate) ? payload.vibrate : [300, 150, 300],
    data: payload.data || { url: '/chat' },
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = data.url || '/chat';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          try {
            client.postMessage({
              type: 'MOS_PUSH_NOTIFICATION_CLICK',
              data,
            });
          } catch {
            // ignore
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
