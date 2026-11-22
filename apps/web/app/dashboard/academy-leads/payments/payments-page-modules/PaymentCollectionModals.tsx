'use client';

import { Alert, Button, Input, InputNumber, Radio, Space } from 'antd';
import type { AcademyTalentPaymentManagementRow, AcademyTalentPaymentMethod } from '@mos-lab/shared';
import { AdaptiveModal } from '~/components/ui';
import { formatVND } from '~/lib/format-utils';
import AcademyTalentFollowUpPaymentSlip, {
  type AcademyTalentFollowUpPaymentSlipSnapshot,
} from '../../components/AcademyTalentFollowUpPaymentSlip';
import styles from '../../components/AcademyTalentWorkshop.module.css';
import { DEPOSIT_PRESET_VND } from '../payment-management.helpers';

export interface PaymentCollectionModalsProps {
  collecting: AcademyTalentPaymentManagementRow | null;
  collectionAmountVnd: number | null;
  onCollectionAmountChange: (value: number | null) => void;
  collectionMethod: AcademyTalentPaymentMethod;
  onCollectionMethodChange: (value: AcademyTalentPaymentMethod) => void;
  collectionReference: string;
  onCollectionReferenceChange: (value: string) => void;
  collectionNote: string;
  onCollectionNoteChange: (value: string) => void;
  requestedAmountVnd: number;
  paymentSlipOpen: boolean;
  paymentSlipSnapshot: AcademyTalentFollowUpPaymentSlipSnapshot | null;
  savingCollection: boolean;
  onCloseCollection: () => void;
  onOpenPaymentSlipPreview: () => void;
  onClosePaymentSlipPreview: () => void;
  onPrintPaymentSlip: () => void;
  onConfirmCollection: () => Promise<void>;
}

export function PaymentCollectionModals({
  collecting,
  collectionAmountVnd,
  onCollectionAmountChange,
  collectionMethod,
  onCollectionMethodChange,
  collectionReference,
  onCollectionReferenceChange,
  collectionNote,
  onCollectionNoteChange,
  requestedAmountVnd,
  paymentSlipOpen,
  paymentSlipSnapshot,
  savingCollection,
  onCloseCollection,
  onOpenPaymentSlipPreview,
  onClosePaymentSlipPreview,
  onPrintPaymentSlip,
  onConfirmCollection,
}: PaymentCollectionModalsProps) {
  return (
    <>
      <AdaptiveModal
        open={Boolean(collecting)}
        title={collecting ? `Xác nhận khoản thu · ${collecting.lead.name}` : 'Xác nhận khoản thu'}
        onCancel={onCloseCollection}
        footer={[
          <Button key="cancel" disabled={savingCollection} onClick={onCloseCollection}>
            Hủy
          </Button>,
          <Button key="payment-slip" disabled={savingCollection} onClick={onOpenPaymentSlipPreview}>
            Lập phiếu thanh toán
          </Button>,
          <Button key="confirm" type="primary" loading={savingCollection} onClick={() => void onConfirmCollection()}>
            Xác nhận đã nhận tiền
          </Button>,
        ]}
        intent="detail"
      >
        {collecting && (
          <div className="grid gap-4">
            <Alert
              type="warning"
              showIcon
              message="Chỉ xác nhận sau khi đã đối soát thực tế"
              description="Thao tác này tạo khoản thu chính thức, cập nhật doanh thu Academy và không thể dùng phiếu/QR chưa thanh toán để thay thế."
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-inherit p-3">
                <span className="text-xs opacity-60">Học phí phiếu</span>
                <strong className="mt-1 block tabular-nums">{formatVND(collecting.tuitionVnd)}</strong>
              </div>
              <div className="rounded-lg border border-inherit p-3">
                <span className="text-xs opacity-60">Đã nhận</span>
                <strong className="mt-1 block tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatVND(collecting.totalPaidVnd)}
                </strong>
              </div>
              <div className="rounded-lg border border-inherit p-3">
                <span className="text-xs opacity-60">Còn lại</span>
                <strong className="mt-1 block tabular-nums">{formatVND(collecting.remainingVnd)}</strong>
              </div>
            </div>
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Hình thức thu</span>
                <Radio.Group
                  value={collectionMethod}
                  onChange={(event) => onCollectionMethodChange(event.target.value)}
                >
                  <Radio value="BANK_TRANSFER">Chuyển khoản</Radio>
                  <Radio value="CASH">Tiền mặt</Radio>
                </Radio.Group>
              </label>
              <div className="grid gap-1 text-sm">
                <span className="font-medium">Chọn nhanh số tiền</span>
                <Space wrap>
                  <Button
                    size="small"
                    type={requestedAmountVnd === collecting.remainingVnd ? 'primary' : 'default'}
                    onClick={() => onCollectionAmountChange(collecting.remainingVnd)}
                  >
                    Thu đủ · {formatVND(collecting.remainingVnd)}
                  </Button>
                  <Button
                    size="small"
                    type={requestedAmountVnd === DEPOSIT_PRESET_VND ? 'primary' : 'default'}
                    disabled={collecting.remainingVnd < DEPOSIT_PRESET_VND}
                    onClick={() => onCollectionAmountChange(DEPOSIT_PRESET_VND)}
                  >
                    1.000.000 đ
                  </Button>
                </Space>
              </div>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Số tiền đã nhận (VNĐ)</span>
                <InputNumber
                  className="w-full tabular-nums"
                  min={1}
                  max={collecting.remainingVnd}
                  precision={0}
                  value={collectionAmountVnd}
                  formatter={(value) => `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={(value) => Number(value?.replace(/\D/g, '') || 0)}
                  onChange={(value) => onCollectionAmountChange(typeof value === 'number' ? value : null)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">
                  {collectionMethod === 'BANK_TRANSFER'
                    ? 'Mã giao dịch / nội dung chuyển khoản'
                    : 'Số phiếu thu / người nộp'}
                </span>
                <Input
                  value={collectionReference}
                  maxLength={160}
                  onChange={(event) => onCollectionReferenceChange(event.target.value)}
                  placeholder={
                    collectionMethod === 'BANK_TRANSFER' ? 'Ví dụ: MBVCB.123456' : 'Ví dụ: PT-000123 / Nguyễn Thị A'
                  }
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Ghi chú đối soát</span>
                <Input.TextArea
                  value={collectionNote}
                  rows={3}
                  onChange={(event) => onCollectionNoteChange(event.target.value)}
                  placeholder={
                    collectionMethod === 'BANK_TRANSFER'
                      ? 'Xác nhận theo sao kê ngân hàng'
                      : 'Xác nhận theo biên nhận tiền mặt'
                  }
                />
              </label>
            </div>
          </div>
        )}
      </AdaptiveModal>

      <AdaptiveModal
        className={styles.paymentSlipPreviewModal}
        destroyOnHidden
        open={paymentSlipOpen && Boolean(collecting && paymentSlipSnapshot)}
        title="Xem trước phiếu yêu cầu thanh toán"
        onCancel={onClosePaymentSlipPreview}
        intent="detail"
        footer={[
          <Button key="back" onClick={onClosePaymentSlipPreview}>
            Quay lại xác nhận thu
          </Button>,
          <Button key="print" type="primary" onClick={onPrintPaymentSlip}>
            In phiếu {collectionMethod === 'BANK_TRANSFER' ? 'chuyển khoản' : 'nộp tiền mặt'}
          </Button>,
        ]}
      >
        {collecting && paymentSlipSnapshot && (
          <div className={styles.paymentSlipPreviewSheet}>
            <AcademyTalentFollowUpPaymentSlip
              lead={collecting.lead}
              snapshot={paymentSlipSnapshot}
              amountVnd={requestedAmountVnd}
              method={collectionMethod}
              reference={collectionReference}
            />
          </div>
        )}
      </AdaptiveModal>

      {collecting && paymentSlipSnapshot && paymentSlipOpen && (
        <div className={styles.printOnly} aria-hidden="true">
          <AcademyTalentFollowUpPaymentSlip
            lead={collecting.lead}
            snapshot={paymentSlipSnapshot}
            amountVnd={requestedAmountVnd}
            method={collectionMethod}
            reference={collectionReference}
          />
        </div>
      )}
    </>
  );
}
