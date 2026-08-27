'use client';

import React from 'react';
import { Button, Image, Switch, theme, message } from 'antd';
import { CheckCircle2, Copy, ExternalLink, Link2, QrCode } from 'lucide-react';
import { AdaptiveModal, AppIcon, IconButton, IconText } from '../../../../components/ui';

export interface AcademyWorkshopSharedQrButtonProps {
  workshopName: string;
  joinUrl: string;
  type?: 'default' | 'primary';
  label?: string;
  iconOnly?: boolean;
  purpose?: 'join' | 'registration';
  registrationOpen?: boolean;
  onRegistrationOpenChange?: (open: boolean) => Promise<void> | void;
}

export default function AcademyWorkshopSharedQrButton({
  workshopName,
  joinUrl,
  type = 'default',
  label = 'QR chung',
  iconOnly = false,
  purpose = 'join',
  registrationOpen,
  onRegistrationOpenChange,
}: AcademyWorkshopSharedQrButtonProps) {
  const { token } = theme.useToken();
  const [open, setOpen] = React.useState(false);
  const [qrDataUrl, setQrDataUrl] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [updatingRegistration, setUpdatingRegistration] = React.useState(false);

  React.useEffect(() => {
    if (!open || qrDataUrl || !joinUrl) return;
    let disposed = false;
    setLoading(true);
    void import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(joinUrl, { width: 720, margin: 2, errorCorrectionLevel: 'M' }))
      .then((dataUrl) => {
        if (!disposed) setQrDataUrl(dataUrl);
      })
      .catch(() => message.error('Không thể tạo QR chung.'))
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [joinUrl, open, qrDataUrl]);

  const copyLink = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      message.success(purpose === 'registration' ? 'Đã sao chép link đăng ký.' : 'Đã sao chép link vào lobby.');
    } catch {
      message.error('Không thể sao chép tự động. Hãy mở link rồi sao chép từ trình duyệt.');
    }
  }, [joinUrl]);

  const updateRegistration = React.useCallback(
    async (open: boolean) => {
      if (!onRegistrationOpenChange) return;
      setUpdatingRegistration(true);
      try {
        await onRegistrationOpenChange(open);
        message.success(open ? 'Đã mở nhận đăng ký online.' : 'Đã tạm đóng nhận đăng ký online.');
      } catch {
        message.error('Không thể cập nhật trạng thái nhận đăng ký.');
      } finally {
        setUpdatingRegistration(false);
      }
    },
    [onRegistrationOpenChange]
  );

  const isRegistrationQr = purpose === 'registration';
  const statusLabel = registrationOpen ? 'Đang nhận đăng ký' : 'Tạm ngưng nhận đăng ký';
  const statusDescription = registrationOpen
    ? 'Học viên có thể quét mã và gửi thông tin ngay.'
    : 'Học viên vẫn xem được thông tin, nhưng chưa thể gửi đăng ký.';

  return (
    <>
      {iconOnly ? (
        <IconButton
          label={`Mở ${label}`}
          icon={QrCode}
          tone={type === 'primary' ? 'primary' : 'default'}
          onClick={() => setOpen(true)}
        />
      ) : (
        <Button type={type} onClick={() => setOpen(true)}>
          <IconText icon={<AppIcon icon={QrCode} />}>{label}</IconText>
        </Button>
      )}
      <AdaptiveModal
        open={open}
        title={
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ background: token.colorPrimaryBg, color: token.colorPrimary }}
            >
              <AppIcon icon={QrCode} size={16} />
            </span>
            <span className="truncate">
              {isRegistrationQr ? 'QR đăng ký' : 'QR chung'}{' '}
              <span style={{ color: token.colorTextSecondary }}>· {workshopName}</span>
            </span>
          </span>
        }
        footer={null}
        width={560}
        onCancel={() => setOpen(false)}
        destroyOnHidden
      >
        <div className="pb-1 pt-2">
          <div
            className="rounded-3xl border p-3 sm:p-4"
            style={{ background: token.colorFillAlter, borderColor: token.colorBorderSecondary }}
          >
            <div
              className="mb-3 flex items-center justify-between px-1 text-xs font-medium"
              style={{ color: token.colorTextSecondary }}
            >
              <span className="flex items-center gap-1.5">
                <AppIcon icon={QrCode} size={14} />
                Sẵn sàng để quét
              </span>
              <span
                className="rounded-full px-2 py-1"
                style={{ background: token.colorBgContainer, color: token.colorTextTertiary }}
              >
                {isRegistrationQr ? 'Đăng ký workshop' : 'Chọn học viên'}
              </span>
            </div>
            <div
              className="flex min-h-[min(300px,calc(100vw-128px))] items-center justify-center overflow-hidden rounded-2xl p-3"
              style={{ background: token.colorBgContainer, boxShadow: token.boxShadowSecondary }}
            >
              {qrDataUrl ? (
                <Image
                  src={qrDataUrl}
                  alt={`QR chung ${workshopName}`}
                  preview={false}
                  style={{ width: 'min(100%, 300px)', height: 'auto', display: 'block' }}
                />
              ) : (
                <div
                  className="flex h-[300px] items-center justify-center text-sm"
                  style={{ color: token.colorTextSecondary }}
                >
                  {loading ? 'Đang tạo QR…' : 'Chưa có QR'}
                </div>
              )}
            </div>
          </div>

          <div className="px-1 pt-5 text-center">
            <div className="text-xl font-semibold tracking-tight" style={{ color: token.colorText }}>
              {isRegistrationQr ? 'Quét để đăng ký workshop' : 'Quét để chọn học viên'}
            </div>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-6" style={{ color: token.colorTextSecondary }}>
              {isRegistrationQr
                ? 'Học viên xem agenda, điền thông tin và được đưa vào danh sách chờ Academy xác nhận.'
                : 'Học viên có sẵn chọn avatar và tên; hồ sơ có SĐT sẽ được yêu cầu xác minh. Người chưa có trong danh sách đăng nhập Google/Gmail để tạo hồ sơ walk-in và tự check-in.'}
            </p>
          </div>

          {isRegistrationQr && registrationOpen !== undefined ? (
            <div
              className="mt-5 flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left"
              style={{ background: token.colorFillAlter, borderColor: token.colorBorderSecondary }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: registrationOpen ? token.colorSuccessBg : token.colorWarningBg,
                  color: registrationOpen ? token.colorSuccess : token.colorWarning,
                }}
              >
                <AppIcon icon={registrationOpen ? CheckCircle2 : QrCode} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold" style={{ color: token.colorText }}>
                  {statusLabel}
                </div>
                <div className="mt-0.5 text-xs leading-5" style={{ color: token.colorTextSecondary }}>
                  {statusDescription}
                </div>
              </div>
              <Switch
                checked={registrationOpen}
                loading={updatingRegistration}
                disabled={!onRegistrationOpenChange}
                aria-label="Nhận đăng ký online"
                onChange={(open) => void updateRegistration(open)}
              />
            </div>
          ) : null}

          <div
            className="mt-4 rounded-2xl border p-1.5"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
          >
            <div
              className="flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2"
              style={{ background: token.colorFillAlter }}
            >
              <AppIcon icon={Link2} size={16} style={{ color: token.colorTextSecondary }} />
              <span
                className="min-w-0 flex-1 truncate text-xs"
                title={joinUrl}
                style={{ color: token.colorTextSecondary }}
              >
                {joinUrl}
              </span>
              <Button type="text" size="small" aria-label="Sao chép link đăng ký" onClick={() => void copyLink()}>
                <IconText icon={<AppIcon icon={Copy} size={14} />}>Sao chép</IconText>
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button className="w-full sm:w-auto" onClick={() => setOpen(false)}>
              Đóng
            </Button>
            <Button
              type="primary"
              className="w-full sm:w-auto"
              onClick={() => window.open(joinUrl, '_blank', 'noopener,noreferrer')}
            >
              <IconText icon={<AppIcon icon={ExternalLink} />}>Mở trang đăng ký</IconText>
            </Button>
          </div>
        </div>
      </AdaptiveModal>
    </>
  );
}
