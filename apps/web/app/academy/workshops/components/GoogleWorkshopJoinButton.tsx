'use client';

import React from 'react';

const GOOGLE_GSI_SCRIPT_ID = 'google-identity-services';
const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '648958464510-tedkbs4n8dmrgfjhqegcien7r0u7ed9g.apps.googleusercontent.com';

type GoogleCredentialResponse = { credential?: string };
type GoogleAccountsApi = {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }): void;
  renderButton(
    element: HTMLElement,
    config: {
      type: 'standard';
      theme: 'outline';
      size: 'large';
      shape: 'pill';
      text: 'continue_with';
      logo_alignment: 'center';
      locale: 'vi';
      width: number;
    }
  ): void;
};

type GoogleWindow = Window & {
  google?: { accounts?: { id?: GoogleAccountsApi } };
};

export interface GoogleWorkshopJoinButtonProps {
  disabled?: boolean;
  onCredential: (credential: string) => void | Promise<void>;
}

export default function GoogleWorkshopJoinButton({ disabled = false, onCredential }: GoogleWorkshopJoinButtonProps) {
  const buttonRef = React.useRef<HTMLDivElement>(null);
  const callbackRef = React.useRef(onCredential);
  const [error, setError] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  React.useEffect(() => {
    let disposed = false;

    const renderGoogleButton = () => {
      if (disposed || !buttonRef.current) return;
      const googleApi = (window as GoogleWindow).google?.accounts?.id;
      if (!googleApi) {
        setError('Không thể tải đăng nhập Google. Vui lòng thử lại.');
        return;
      }
      try {
        googleApi.initialize({
          client_id: GOOGLE_CLIENT_ID,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: (response) => {
            const credential = String(response.credential || '').trim();
            if (!credential) {
              setError('Google không trả về thông tin đăng nhập.');
              return;
            }
            setError(null);
            void callbackRef.current(credential);
          },
        });
        buttonRef.current.replaceChildren();
        googleApi.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'center',
          locale: 'vi',
          width: Math.min(320, Math.max(240, Math.floor(buttonRef.current.clientWidth || 320))),
        });
        setReady(true);
      } catch {
        setError('Không thể khởi tạo đăng nhập Google.');
      }
    };

    const existing = document.getElementById(GOOGLE_GSI_SCRIPT_ID) as HTMLScriptElement | null;
    if ((window as GoogleWindow).google?.accounts?.id) {
      renderGoogleButton();
    } else if (existing) {
      existing.addEventListener('load', renderGoogleButton, { once: true });
      existing.addEventListener('error', () => setError('Không thể tải đăng nhập Google.'), { once: true });
    } else {
      const script = document.createElement('script');
      script.id = GOOGLE_GSI_SCRIPT_ID;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', renderGoogleButton, { once: true });
      script.addEventListener('error', () => setError('Không thể tải đăng nhập Google.'), { once: true });
      document.head.appendChild(script);
    }

    return () => {
      disposed = true;
      existing?.removeEventListener('load', renderGoogleButton);
    };
  }, []);

  return (
    <div>
      <div className={`relative flex min-h-11 justify-center ${disabled ? 'pointer-events-none opacity-55' : ''}`}>
        {!ready && !error ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/55">
            Đang tải đăng nhập Google…
          </div>
        ) : null}
        <div ref={buttonRef} className="w-full" aria-label="Đăng nhập Google để tham gia workshop" />
      </div>
      {error ? <div className="mt-2 text-center text-sm text-rose-300">{error}</div> : null}
    </div>
  );
}
