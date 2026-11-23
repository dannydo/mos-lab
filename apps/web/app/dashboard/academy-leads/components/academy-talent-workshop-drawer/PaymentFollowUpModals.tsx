'use client';

import React from 'react';
import { Alert, Button, Input, InputNumber } from 'antd';
import { CircleCheck, CircleDollarSign, Landmark, Printer } from 'lucide-react';
import type { AcademyTalentPaymentMethod } from '@mos-lab/shared';
import { AdaptiveModal, AppIcon } from '~/components/ui';
import { formatVND } from '~/lib/format-utils';
import AcademyTalentFollowUpPaymentSlip from '../AcademyTalentFollowUpPaymentSlip';
import type { AcademyTalentAssessmentView, AcademyTalentLead } from '../academy-talent-workshop.types';
import styles from '../AcademyTalentWorkshop.module.css';

export interface PaymentFollowUpModalsProps {
  lead: AcademyTalentLead | null;
  paymentView: AcademyTalentAssessmentView | null | undefined;
  paymentFollowUpOpen: boolean;
  paymentSlipOpen: boolean;
  canConfirmPayment: boolean;
  busyAction: 'save' | 'invoice' | 'payment' | 'session' | null;
  paymentMethod: AcademyTalentPaymentMethod;
  paymentAmountVnd: number | null;
  paymentReference: string;
  paymentNote: string;
  onCloseFollowUp: () => void;
  onCloseSlip: () => void;
  onChangeMethod: (method: AcademyTalentPaymentMethod) => void;
  onChangeAmount: (amount: number | null) => void;
  onChangeReference: (reference: string) => void;
  onChangeNote: (note: string) => void;
  onOpenSlipPreview: () => void;
  onRecordPayment: () => void;
  onPrintSlip: () => void;
}

export function PaymentFollowUpModals({
  lead,
  paymentView,
  paymentFollowUpOpen,
  paymentSlipOpen,
  canConfirmPayment,
  busyAction,
  paymentMethod,
  paymentAmountVnd,
  paymentReference,
  paymentNote,
  onCloseFollowUp,
  onCloseSlip,
  onChangeMethod,
  onChangeAmount,
  onChangeReference,
  onChangeNote,
  onOpenSlipPreview,
  onRecordPayment,
  onPrintSlip,
}: PaymentFollowUpModalsProps) {
  return (
    <>
      <AdaptiveModal
        className={styles.paymentFollowUpModal}
        destroyOnHidden
        footer={[
          <Button key="payment-slip" icon={<AppIcon icon={Printer} />} onClick={onOpenSlipPreview}>
            Lập phiếu thanh toán
          </Button>,
          <Button key="cancel" onClick={onCloseFollowUp}>
            Đóng
          </Button>,
          canConfirmPayment && (
            <Button key="confirm" type="primary" loading={busyAction === 'payment'} onClick={onRecordPayment}>
              Xác nhận đã nhận tiền
            </Button>
          ),
        ]}
        intent="detail"
        open={paymentFollowUpOpen && Boolean(paymentView)}
        title="Follow-up thanh toán học phí"
        zIndex={11070}
        onCancel={onCloseFollowUp}
      >
        {paymentView &&
          (() => {
            const isPaid = paymentView.payment.status === 'PAID';
            return (
              <div className={styles.paymentFollowUpPage}>
                <div className={styles.paymentFollowUpSummary}>
                  <div>
                    <span>Trạng thái</span>
                    <strong>
                      {isPaid
                        ? 'Đã thanh toán đủ'
                        : paymentView.payment.status === 'DEPOSIT_RECEIVED'
                          ? 'Đã cọc · cần follow-up'
                          : 'Đang chờ thanh toán'}
                    </strong>
                  </div>
                  <div>
                    <span>Đã nhận</span>
                    <strong className="tabular-nums">{formatVND(paymentView.payment.totalPaidVnd)}</strong>
                  </div>
                  <div>
                    <span>Còn lại</span>
                    <strong className="tabular-nums">{formatVND(paymentView.payment.remainingVnd)}</strong>
                  </div>
                </div>
                {isPaid ? (
                  <Alert type="success" showIcon message="Phiếu đã được khóa sau khi nhận đủ tiền." />
                ) : (
                  <>
                    <Alert
                      type="info"
                      showIcon
                      message={
                        paymentView.payment.status === 'DEPOSIT_RECEIVED'
                          ? 'Cần follow-up phần học phí còn lại'
                          : 'Lập phiếu trước, xác nhận tiền sau khi đối soát'
                      }
                      description={`Chọn chuyển khoản để lập QR hoặc tiền mặt để lập phiếu nộp quầy. Phần còn lại hiện là ${formatVND(paymentView.payment.remainingVnd)}.`}
                    />
                    <div
                      className={styles.paymentMethodSelection}
                      role="radiogroup"
                      aria-label="Phương thức thanh toán follow-up"
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={paymentMethod === 'BANK_TRANSFER'}
                        className={
                          paymentMethod === 'BANK_TRANSFER'
                            ? styles.paymentMethodChoiceActive
                            : styles.paymentMethodChoice
                        }
                        onClick={() => onChangeMethod('BANK_TRANSFER')}
                      >
                        <AppIcon icon={Landmark} />
                        <span>
                          Chuyển khoản<small>Lập QR cho đúng số tiền</small>
                        </span>
                        {paymentMethod === 'BANK_TRANSFER' && <AppIcon icon={CircleCheck} />}
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={paymentMethod === 'CASH'}
                        className={
                          paymentMethod === 'CASH' ? styles.paymentMethodChoiceActive : styles.paymentMethodChoice
                        }
                        onClick={() => onChangeMethod('CASH')}
                      >
                        <AppIcon icon={CircleDollarSign} />
                        <span>
                          Tiền mặt<small>Lập phiếu nộp tiền tại quầy</small>
                        </span>
                        {paymentMethod === 'CASH' && <AppIcon icon={CircleCheck} />}
                      </button>
                    </div>
                    <div className={styles.paymentFollowUpForm}>
                      <label>
                        Số tiền cần lập phiếu (VNĐ)
                        <InputNumber
                          min={1}
                          max={paymentView.payment.remainingVnd}
                          precision={0}
                          value={paymentAmountVnd}
                          onChange={(value) => onChangeAmount(typeof value === 'number' ? value : null)}
                        />
                      </label>
                      <label>
                        {paymentMethod === 'BANK_TRANSFER'
                          ? 'Mã giao dịch / nội dung chuyển khoản'
                          : 'Số phiếu thu / người nộp'}
                        <Input
                          value={paymentReference}
                          maxLength={160}
                          onChange={(event) => onChangeReference(event.target.value)}
                          placeholder={
                            paymentMethod === 'BANK_TRANSFER'
                              ? 'Ví dụ: MBVCB.123456'
                              : 'Ví dụ: PT-000123 / Nguyễn Thị A'
                          }
                        />
                      </label>
                      <label className={styles.paymentFollowUpFieldFull}>
                        Ghi chú đối soát
                        <Input.TextArea
                          value={paymentNote}
                          rows={3}
                          onChange={(event) => onChangeNote(event.target.value)}
                          placeholder={
                            paymentMethod === 'BANK_TRANSFER'
                              ? 'Ghi nhận sau khi kiểm tra sao kê'
                              : 'Ghi nhận sau khi thu ngân kiểm đếm'
                          }
                        />
                      </label>
                    </div>
                    {!canConfirmPayment && (
                      <Alert
                        type="warning"
                        showIcon
                        message="Chờ quản lý xác nhận giao dịch"
                        description="Bạn có thể lập phiếu chuyển khoản hoặc tiền mặt ở trên. Chỉ Admin hoặc Super Admin mới xác nhận khoản thu sau khi đối soát."
                      />
                    )}
                    {canConfirmPayment && (
                      <p className={styles.paymentConfirmationHint}>
                        Chỉ bấm “Xác nhận đã nhận tiền” sau khi đã đối soát{' '}
                        {paymentMethod === 'CASH' ? 'tiền mặt thực nhận' : 'sao kê ngân hàng'}.
                      </p>
                    )}
                  </>
                )}
                <section className={styles.paymentHistory}>
                  <h3>Lịch sử tiền đã xác nhận</h3>
                  {paymentView.payment.payments.length ? (
                    paymentView.payment.payments.map((payment) => (
                      <div key={payment.id} className={styles.paymentHistoryItem}>
                        <div>
                          <strong className="tabular-nums">{formatVND(payment.amountVnd)}</strong>
                          <span>
                            {payment.method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'} ·{' '}
                            {payment.reference || 'Chưa có mã giao dịch'}
                          </span>
                        </div>
                        <div>
                          <span>{new Date(payment.receivedAt).toLocaleString('vi-VN')}</span>
                          <span>{payment.confirmedBy?.displayName || 'Hệ thống'}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>Chưa có khoản tiền nào được xác nhận.</p>
                  )}
                </section>
              </div>
            );
          })()}
      </AdaptiveModal>

      <AdaptiveModal
        className={styles.paymentSlipPreviewModal}
        destroyOnHidden
        footer={[
          <Button key="back" onClick={onCloseSlip}>
            Quay lại follow-up
          </Button>,
          <Button key="print" type="primary" icon={<AppIcon icon={Printer} />} onClick={onPrintSlip}>
            In phiếu {paymentMethod === 'BANK_TRANSFER' ? 'chuyển khoản' : 'nộp tiền mặt'}
          </Button>,
        ]}
        intent="detail"
        open={paymentSlipOpen && Boolean(lead && paymentView)}
        title="Xem trước phiếu yêu cầu thanh toán"
        zIndex={11080}
        onCancel={onCloseSlip}
      >
        {lead && paymentView && (
          <div className={styles.paymentSlipPreviewSheet}>
            <AcademyTalentFollowUpPaymentSlip
              lead={lead}
              assessment={paymentView}
              amountVnd={Math.round(Number(paymentAmountVnd) || 0)}
              method={paymentMethod}
              reference={paymentReference}
            />
          </div>
        )}
      </AdaptiveModal>
    </>
  );
}
