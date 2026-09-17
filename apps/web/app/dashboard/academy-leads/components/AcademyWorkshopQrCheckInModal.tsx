'use client';

import React from 'react';
import { Button, Input, message } from 'antd';
import { CheckCircle2, QrCode, ScanLine } from 'lucide-react';
import { apiClient } from '../../../../lib/api-client';
import { AdaptiveModal, AdaptiveOverlayFooter, AppIcon, IconText } from '../../../../components/ui';

export interface AcademyWorkshopQrCheckInModalProps {
  open: boolean;
  onClose: () => void;
  workshopId: number;
  onSuccess: () => void;
}

export default function AcademyWorkshopQrCheckInModal({
  open,
  onClose,
  workshopId,
  onSuccess,
}: AcademyWorkshopQrCheckInModalProps) {
  const [tokenInput, setTokenInput] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setTokenInput('');
    }
  }, [open]);

  const handleSubmit = async () => {
    const raw = tokenInput.trim();
    if (!raw) {
      message.warning('Vui lòng nhập hoặc quét mã QR token.');
      return;
    }

    let cleanToken = raw;
    if (cleanToken.includes('/join/')) {
      const parts = cleanToken.split('/join/');
      cleanToken = decodeURIComponent(parts[parts.length - 1].split('?')[0].split('#')[0]);
    }

    setSubmitting(true);
    try {
      await apiClient.academySales.workshops.scanCheckIn(workshopId, cleanToken);
      message.success('Điểm danh học viên thành công!');
      onClose();
      onSuccess();
    } catch (cause: any) {
      message.error(cause?.response?.data?.message || 'Mã QR không hợp lệ hoặc đã được sử dụng.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <AppIcon icon={QrCode} size="sm" />
          </span>
          <span className="text-base font-bold">Điểm danh qua mã QR</span>
        </div>
      }
      footer={
        <AdaptiveOverlayFooter>
          <Button onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button type="primary" loading={submitting} disabled={!tokenInput.trim()} onClick={handleSubmit}>
            <IconText icon={<AppIcon icon={CheckCircle2} />}>Xác nhận check-in</IconText>
          </Button>
        </AdaptiveOverlayFooter>
      }
      destroyOnHidden
    >
      <div className="space-y-4 pt-2">
        <p className="m-0 text-xs text-slate-500 dark:text-slate-400">
          Quét mã QR từ thẻ đeo của học viên, tin nhắn Zalo đón tiếp, hoặc dán trực tiếp đường link / token check-in vào
          ô bên dưới.
        </p>

        <div>
          <Input.TextArea
            autoFocus
            rows={3}
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder="Dán mã QR token hoặc URL check-in tại đây..."
            className="font-mono text-sm"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
            <AppIcon icon={ScanLine} size={14} className="text-emerald-500" />
            <span>Hỗ trợ máy quét mã vạch / camera</span>
          </div>
          <p className="mb-0 mt-1 leading-relaxed">
            Thiết bị quét mã vạch cắm cổng USB hoặc đầu đọc thẻ có thể quét trực tiếp khi ô nhập liệu đang được chọn
            (nhấn Enter để gửi tự động).
          </p>
        </div>
      </div>
    </AdaptiveModal>
  );
}
