'use client';

import React from 'react';
import { Alert, Button } from 'antd';
import { Printer } from 'lucide-react';
import { AdaptiveModal, AppIcon } from '~/components/ui';
import { formatVND } from '~/lib/format-utils';
import AcademyTalentInvoice from '../AcademyTalentInvoice';
import type { AcademyTalentAssessmentView, AcademyTalentLead } from '../academy-talent-workshop.types';
import styles from '../AcademyTalentWorkshop.module.css';

export interface InvoicePreviewModalProps {
  open: boolean;
  lead: AcademyTalentLead | null;
  printView: AcademyTalentAssessmentView | null;
  isBusy: boolean;
  onClose: () => void;
  onOpenPaymentFollowUp: () => void;
  onIssueAndPrint: () => void;
}

export function InvoicePreviewModal({
  open,
  lead,
  printView,
  isBusy,
  onClose,
  onOpenPaymentFollowUp,
  onIssueAndPrint,
}: InvoicePreviewModalProps) {
  return (
    <AdaptiveModal
      className={styles.invoicePreviewModal}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onClose}>
          Quay lại workshop
        </Button>,
        printView?.invoice && printView.payment.status !== 'PAID' && (
          <Button key="follow-up" onClick={onOpenPaymentFollowUp}>
            Follow-up thanh toán
          </Button>
        ),
        <Button key="print" type="primary" icon={<AppIcon icon={Printer} />} loading={isBusy} onClick={onIssueAndPrint}>
          {printView?.payment.status === 'PAID'
            ? 'In lại phiếu đã thanh toán'
            : printView?.invoice
              ? 'In phiên bản mới'
              : 'Lập phiếu & mở hộp thoại in'}
        </Button>,
      ]}
      intent="detail"
      open={open && Boolean(lead && printView)}
      title="Xem trước phiếu học phí"
      zIndex={11060}
      onCancel={onClose}
    >
      {lead && printView && (
        <>
          {!printView.invoice && (
            <Alert
              showIcon
              type="info"
              message="Bản xem trước hóa đơn"
              description="Nội dung sẽ được chốt thành phiếu chính thức khi bạn bấm “Lập phiếu & mở hộp thoại in”."
            />
          )}
          {printView.invoice && printView.payment.status !== 'PAID' && (
            <Alert
              showIcon
              type="warning"
              message="Phiếu đã in, đang chờ thanh toán"
              description={`Đã xác nhận ${formatVND(printView.payment.totalPaidVnd)}; còn ${formatVND(printView.payment.remainingVnd)}. Phiếu vẫn có thể điều chỉnh và in phiên bản mới cho đến khi thanh toán đủ.`}
            />
          )}
          {printView.payment.status === 'PAID' && (
            <Alert
              showIcon
              type="success"
              message="Đã thanh toán đủ — phiếu được khóa"
              description="Mọi khoản tiền đã được xác nhận. Bạn chỉ có thể in lại chứng từ đã chốt."
            />
          )}
          <div className={styles.invoicePreviewSheet}>
            <AcademyTalentInvoice lead={lead} assessment={printView} className={styles.invoicePreviewInvoice} />
          </div>
        </>
      )}
    </AdaptiveModal>
  );
}
