'use client';

import React from 'react';
import { Button, Image, Space, Switch, message } from 'antd';
import { Copy, ExternalLink, QrCode } from 'lucide-react';
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
        title={`${purpose === 'registration' ? 'QR đăng ký' : 'QR chung'} · ${workshopName}`}
        footer={null}
        width={520}
        onCancel={() => setOpen(false)}
        destroyOnHidden
      >
        <div className="py-2 text-center">
          <div className="rounded-2xl border border-inherit p-4">
            {qrDataUrl ? (
              <Image src={qrDataUrl} alt={`QR chung ${workshopName}`} width={340} preview={false} />
            ) : (
              <div className="flex h-[340px] items-center justify-center text-sm opacity-60">
                {loading ? 'Đang tạo QR…' : 'Chưa có QR'}
              </div>
            )}
          </div>
          <div className="mt-4 text-lg font-bold">
            {purpose === 'registration' ? 'Quét để đăng ký workshop' : 'Quét để chọn học viên'}
          </div>
          <p className="mx-auto mt-1 max-w-md text-sm opacity-65">
            {purpose === 'registration'
              ? 'Học viên xem agenda, điền thông tin đăng ký và được đưa vào danh sách chờ Academy xác nhận.'
              : 'Học viên có sẵn chọn avatar và tên; hồ sơ có SĐT sẽ được yêu cầu xác minh. Người chưa có trong danh sách đăng nhập Google/Gmail để tạo hồ sơ walk-in và tự check-in.'}
          </p>
          {purpose === 'registration' && registrationOpen !== undefined ? (
            <div className="mx-auto mt-4 flex max-w-md items-center justify-between rounded-xl border border-inherit px-3 py-2 text-left text-sm">
              <span>Nhận đăng ký online</span>
              <Switch
                checked={registrationOpen}
                loading={updatingRegistration}
                disabled={!onRegistrationOpenChange}
                aria-label="Nhận đăng ký online"
                onChange={(open) => void updateRegistration(open)}
              />
            </div>
          ) : null}
          <div className="mt-3 break-all rounded-lg border border-inherit px-3 py-2 text-xs opacity-65">{joinUrl}</div>
          <Space wrap className="mt-4 justify-center">
            <Button onClick={() => void copyLink()}>
              <IconText icon={<AppIcon icon={Copy} />}>Sao chép link</IconText>
            </Button>
            <Button type="primary" onClick={() => window.open(joinUrl, '_blank')}>
              <IconText icon={<AppIcon icon={ExternalLink} />}>Mở thử</IconText>
            </Button>
          </Space>
        </div>
      </AdaptiveModal>
    </>
  );
}
