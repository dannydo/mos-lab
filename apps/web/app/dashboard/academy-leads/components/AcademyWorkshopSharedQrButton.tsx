'use client';

import React from 'react';
import { Button, Image, Space, message } from 'antd';
import { Copy, ExternalLink, QrCode } from 'lucide-react';
import { AdaptiveModal, AppIcon, IconText } from '../../../../components/ui';

export interface AcademyWorkshopSharedQrButtonProps {
  workshopName: string;
  joinUrl: string;
  type?: 'default' | 'primary';
  label?: string;
}

export default function AcademyWorkshopSharedQrButton({
  workshopName,
  joinUrl,
  type = 'default',
  label = 'QR chung',
}: AcademyWorkshopSharedQrButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [qrDataUrl, setQrDataUrl] = React.useState('');
  const [loading, setLoading] = React.useState(false);

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
      message.success('Đã sao chép link vào lobby.');
    } catch {
      message.error('Không thể sao chép tự động. Hãy mở link rồi sao chép từ trình duyệt.');
    }
  }, [joinUrl]);

  return (
    <>
      <Button type={type} onClick={() => setOpen(true)}>
        <IconText icon={<AppIcon icon={QrCode} />}>{label}</IconText>
      </Button>
      <AdaptiveModal
        open={open}
        title={`QR chung · ${workshopName}`}
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
          <div className="mt-4 text-lg font-bold">Quét để chọn học viên</div>
          <p className="mx-auto mt-1 max-w-md text-sm opacity-65">
            Tất cả học viên dùng QR này, sau đó chọn avatar và tên của mình. Hồ sơ có SĐT sẽ được yêu cầu xác minh.
          </p>
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
