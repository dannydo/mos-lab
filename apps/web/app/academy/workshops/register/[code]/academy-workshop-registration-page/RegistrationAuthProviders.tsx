'use client';

import React from 'react';
import { Alert, Button, Divider } from 'antd';
import { MessageCircle } from 'lucide-react';
import { apiClient } from '~/lib/api-client';
import GoogleWorkshopJoinButton from '../../../components/GoogleWorkshopJoinButton';
import styles from '../AcademyWorkshopRegistration.module.css';

export interface RegistrationAuthProvidersProps {
  code: string;
  submitting: boolean;
  zaloAuthAvailable: boolean;
  googleCredential: string | null;
  zaloTicket: string | null;
  onClearGoogle: () => void;
  onClearZalo: () => void;
  onGoogleCredential: (credential: string) => Promise<void>;
}

export function RegistrationAuthProviders({
  code,
  submitting,
  zaloAuthAvailable,
  googleCredential,
  zaloTicket,
  onClearGoogle,
  onClearZalo,
  onGoogleCredential,
}: RegistrationAuthProvidersProps) {
  if (googleCredential) {
    return (
      <Alert
        className="mb-4"
        type="success"
        showIcon
        message="Google đã xác minh"
        description="Tên và email lấy từ Google. Hoàn tất số điện thoại để gửi đăng ký."
        action={
          <Button type="link" size="small" onClick={onClearGoogle}>
            Dùng form
          </Button>
        }
      />
    );
  }

  if (zaloTicket) {
    return (
      <Alert
        className="mb-4"
        type="success"
        showIcon
        message="Zalo đã xác minh"
        description="Tên lấy từ Zalo. Hoàn tất số điện thoại để Academy liên hệ và xác nhận chỗ tham dự."
        action={
          <Button type="link" size="small" onClick={onClearZalo}>
            Dùng form
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className={`rounded-[20px] border p-3.5 text-center ${styles.authOption}`}>
        <div className={`text-sm font-semibold ${styles.authOptionTitle}`}>Tiếp tục với Google</div>
        <p className={`mt-1 text-xs leading-5 ${styles.mutedText}`}>
          Tên và email của bạn được xác minh trực tiếp bởi Google.
        </p>
        <div className="mt-3 w-full">
          <GoogleWorkshopJoinButton disabled={submitting} onCredential={onGoogleCredential} />
        </div>
      </div>
      <Divider plain className="!my-4 !text-xs !text-slate-400">
        hoặc
      </Divider>
      <div className={`rounded-[20px] border p-3.5 text-center ${styles.authOption}`}>
        <div className={`text-sm font-semibold ${styles.authOptionTitle}`}>Tiếp tục với Zalo</div>
        <p className={`mt-1 text-xs leading-5 ${styles.mutedText}`}>
          Xác minh tài khoản Zalo, sau đó quay lại để hoàn tất số điện thoại.
        </p>
        <Button
          className={
            zaloAuthAvailable
              ? 'mt-3 !h-11 !rounded-full !border-0 !bg-[rgba(0,113,227,1)] !font-medium hover:!bg-[rgba(0,119,237,1)]'
              : 'mt-3 !h-11 !rounded-full !border-slate-300 !bg-slate-50 !text-slate-600 !opacity-100'
          }
          size="large"
          block
          icon={<MessageCircle size={18} aria-hidden="true" />}
          disabled={!zaloAuthAvailable || submitting}
          href={zaloAuthAvailable ? apiClient.academyWorkshopsPublic.zaloAuthorizeUrl(code) : undefined}
        >
          Tiếp tục với Zalo
        </Button>
        {!zaloAuthAvailable ? (
          <p className={`mt-2 text-xs ${styles.mutedText}`}>Zalo đang chờ API Academy được cấu hình bảo mật.</p>
        ) : null}
      </div>
      <Divider plain className="!my-5 !text-xs !text-slate-400">
        hoặc điền trực tiếp
      </Divider>
    </>
  );
}
