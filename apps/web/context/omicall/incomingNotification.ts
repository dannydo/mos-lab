import './types';

let titleInterval: SafeAny = null;

export const triggerIncomingNotification = (phone: string) => {
  if (typeof window === 'undefined') return;

  let showCallTitle = true;
  titleInterval = setInterval(() => {
    document.title = showCallTitle ? `📞 CUỘC GỌI ĐẾN: ${phone}` : 'mos-lab — Wings Lashes CRM';
    showCallTitle = !showCallTitle;
  }, 1000);

  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification('Cuộc gọi đến OmiCall', {
        body: `Số điện thoại: ${phone}. Click vào để xem chi tiết cuộc gọi.`,
        tag: 'omicall-call',
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification('Cuộc gọi đến OmiCall', {
            body: `Số điện thoại: ${phone}`,
          });
        }
      });
    }
  }
};

export const clearIncomingNotification = () => {
  if (titleInterval) {
    clearInterval(titleInterval);
    titleInterval = null;
  }
  if (typeof window !== 'undefined') {
    document.title = 'mos-lab — Wings Lashes CRM';
  }
};
