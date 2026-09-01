const originalWarn = console.warn;
console.warn = (...args: SafeAny[]) => {
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    (args[0].includes('antd v5 support React is 16 ~ 18') ||
      args[0].includes('antd: compatible') ||
      args[0].includes('bordered') ||
      args[0].includes('is not connected to any Form element') ||
      args[0].includes('form field element') ||
      args[0].includes('A form field element should have an id or name attribute') ||
      args[0].includes('addonAfter') ||
      args[0].includes('addonBefore') ||
      args[0].includes('Space.Compact') ||
      args[0].includes('Static function can not consume context') ||
      args[0].includes('antd: message') ||
      args[0].includes('bodyStyle') ||
      args[0].includes('index` parameter of `rowKey` function is deprecated') ||
      args[0].includes('`tip` only work in nest') ||
      args[0].includes('There may be circular references') ||
      args[0].includes('circular references') ||
      args[0].includes('Peer connection closed') ||
      args[0].includes('Peer connection undefined') ||
      args[0].includes('SessionDescriptionHandler') ||
      args[0].includes('registering a cleanup function after unmount'))
  ) {
    return;
  }
  originalWarn(...args);
};

const originalError = console.error;
console.error = (...args: SafeAny[]) => {
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    (args[0].includes('antd v5 support React is 16 ~ 18') ||
      args[0].includes('antd: compatible') ||
      args[0].includes('Encountered two children with the same key') ||
      args[0].includes('Keys should be unique so that components maintain their identity') ||
      args[0].includes('bordered') ||
      args[0].includes('is not connected to any Form element') ||
      args[0].includes('form field element') ||
      args[0].includes('A form field element should have an id or name attribute') ||
      args[0].includes('addonAfter') ||
      args[0].includes('addonBefore') ||
      args[0].includes('Space.Compact') ||
      args[0].includes('Static function can not consume context') ||
      args[0].includes('antd: message') ||
      args[0].includes('bodyStyle') ||
      args[0].includes('index` parameter of `rowKey` function is deprecated') ||
      args[0].includes('`tip` only work in nest') ||
      args[0].includes('There may be circular references') ||
      args[0].includes('circular references') ||
      args[0].includes('Peer connection closed') ||
      args[0].includes('Peer connection undefined') ||
      args[0].includes('SessionDescriptionHandler') ||
      args[0].includes('registering a cleanup function after unmount') ||
      args[0].includes('hydration-mismatch') ||
      args[0].includes('Hydration failed') ||
      args[0].includes('Text content did not match') ||
      args[0].includes('zIndexPopupBase') ||
      args[0].includes('SelectLike') ||
      args[0].includes('Fetch online staff error') ||
      args[0].includes('Fetch daily calls count error') ||
      args[0].includes("server rendered HTML didn't match"))
  ) {
    return;
  }
  originalError(...args);
};

// Lightweight polyfills & global error suppression for OmiCall WebRTC & older browsers
if (typeof window !== 'undefined') {
  try {
    const style = document.createElement('style');
    style.setAttribute('data-suppress-overlay', 'true');
    style.innerHTML = `
      nextjs-portal, #next-dev-overlay, [data-nextjs-toast] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
    if (document.head) {
      document.head.appendChild(style);
    }
  } catch {
    // Ignore
  }

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = typeof reason === 'string' ? reason : reason?.message || String(reason || '');
    if (
      msg.includes('Peer connection closed') ||
      msg.includes('Peer connection undefined') ||
      msg.includes('SessionDescriptionHandler')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || event.error?.message || String(event.error || '');
    if (
      msg.includes('Peer connection closed') ||
      msg.includes('Peer connection undefined') ||
      msg.includes('SessionDescriptionHandler')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
  if (!(Array.prototype as SafeAny).at) {
    (Array.prototype as SafeAny).at = function (this: SafeAny[], n: number) {
      n = Math.trunc(n) || 0;
      if (n < 0) n += this.length;
      if (n < 0 || n >= this.length) return undefined;
      return this[n];
    };
  }

  if (!(Object as SafeAny).hasOwn) {
    (Object as SafeAny).hasOwn = function (object: object, property: PropertyKey) {
      return Object.prototype.hasOwnProperty.call(object, property);
    };
  }

  if (typeof (window as SafeAny).structuredClone !== 'function') {
    (window as SafeAny).structuredClone = function <T>(obj: T): T {
      try {
        return JSON.parse(JSON.stringify(obj));
      } catch (_) {
        return obj;
      }
    };
  }

  if (!(String.prototype as SafeAny).replaceAll) {
    (String.prototype as SafeAny).replaceAll = function (this: string, str: string | RegExp, newSubstr: string) {
      if (str instanceof RegExp) {
        return this.replace(str, newSubstr);
      }
      return this.split(str).join(newSubstr);
    };
  }

  if (typeof (Promise as SafeAny).any !== 'function') {
    (Promise as SafeAny).any = function <T>(promises: Iterable<T | PromiseLike<T>>): Promise<T> {
      return new Promise((resolve, reject) => {
        const arr = Array.from(promises);
        const errors: SafeAny[] = [];
        let rejectedCount = 0;
        if (arr.length === 0) {
          reject(new Error('All promises were rejected'));
          return;
        }
        arr.forEach((p, idx) => {
          Promise.resolve(p).then(resolve, (err) => {
            errors[idx] = err;
            rejectedCount++;
            if (rejectedCount === arr.length) {
              reject(errors);
            }
          });
        });
      });
    };
  }

  if (typeof (window as SafeAny).ResizeObserver !== 'function') {
    (window as SafeAny).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  if (typeof (window as SafeAny).IntersectionObserver !== 'function') {
    (window as SafeAny).IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  if (typeof (window as SafeAny).requestIdleCallback !== 'function') {
    (window as SafeAny).requestIdleCallback = function (
      cb: (info: { didTimeout: boolean; timeRemaining: () => number }) => void
    ) {
      return setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 1);
    };
    (window as SafeAny).cancelIdleCallback = function (id: number) {
      clearTimeout(id);
    };
  }
}
