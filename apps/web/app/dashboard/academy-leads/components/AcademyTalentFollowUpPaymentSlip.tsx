'use client';

import React from 'react';
import { Image } from 'antd';
import dayjs from 'dayjs';
import { CircleDollarSign, Landmark, QrCode, ShieldCheck, Trophy } from 'lucide-react';
import type { AcademyTalentPaymentMethod } from '@mos-lab/shared';
import { formatVND } from '../../../../lib/format-utils';
import { AppIcon } from '../../../../components/ui';
import type { AcademyTalentAssessmentView, AcademyTalentLead } from './academy-talent-workshop.types';
import {
  ACADEMY_VIETQR_ACCOUNT,
  ACADEMY_VIETQR_ACCOUNT_NAME,
  buildAcademyVietQrUrl,
} from './academy-talent-payment-utils';
import styles from './AcademyTalentWorkshop.module.css';

export interface AcademyTalentFollowUpPaymentSlipProps {
  lead: Pick<AcademyTalentLead, 'id' | 'name' | 'phone'>;
  /** Full workshop view when this is printed from the Tố Chất workflow. */
  assessment?: AcademyTalentAssessmentView;
  /** Minimal immutable invoice context when printing from Academy payment management. */
  snapshot?: AcademyTalentFollowUpPaymentSlipSnapshot;
  amountVnd: number;
  method: AcademyTalentPaymentMethod;
  reference?: string | null;
  className?: string;
}

export interface AcademyTalentFollowUpPaymentSlipSnapshot {
  invoiceNumber: string;
  requestSequence: number;
  totalPaidVnd: number;
  remainingVnd: number;
  selectedItems: string[];
}

/**
 * A request for the outstanding amount, deliberately separate from a receipt.
 * It never writes a payment ledger row; an authorised staff member must first
 * reconcile and confirm the money in the follow-up modal.
 */
export function AcademyTalentFollowUpPaymentSlip({
  lead,
  assessment,
  snapshot,
  amountVnd,
  method,
  reference,
  className = '',
}: AcademyTalentFollowUpPaymentSlipProps) {
  const safeAmount = Math.max(0, Math.round(amountVnd));
  const invoiceNumber =
    snapshot?.invoiceNumber || assessment?.invoice?.invoiceNumber || `ACADEMY-${assessment?.id || 'PAYMENT'}`;
  const requestSequence = snapshot?.requestSequence || (assessment?.payment.payments.length || 0) + 1;
  const documentNumber = `${invoiceNumber}-FU${requestSequence}`;
  const bankReference = `${invoiceNumber} FU${requestSequence}`.slice(0, 50);
  const qrSource =
    method === 'BANK_TRANSFER' && safeAmount > 0 ? buildAcademyVietQrUrl(safeAmount, bankReference) : null;
  const issuedAt = dayjs().format('DD/MM/YYYY HH:mm');
  const totalPaidVnd = snapshot?.totalPaidVnd ?? assessment?.payment.totalPaidVnd ?? 0;
  const remainingVnd = snapshot?.remainingVnd ?? assessment?.payment.remainingVnd ?? 0;
  const remainingAfterRequest = Math.max(0, remainingVnd - safeAmount);
  const selectedItems = snapshot?.selectedItems || [
    ...(assessment?.pricing?.lineItems || []).map((item) => item.name),
    ...(assessment?.pricing?.addOnItems || []).map(
      (item) => `${item.kind === 'SAMPLE' ? 'Mẫu' : 'Đồ nghề'} · ${item.label}`
    ),
  ];
  const customReference = reference?.trim();

  return (
    <article
      className={`${styles.followUpPaymentSlip} ${className}`}
      aria-label="Phiếu yêu cầu thanh toán học phí follow-up"
    >
      <header className={styles.followUpPaymentSlipHeader}>
        <div>
          <div className={styles.followUpPaymentSlipBrand}>
            <AppIcon icon={Trophy} size={11} /> ACADEMY
          </div>
          <p>PHIẾU YÊU CẦU THANH TOÁN</p>
          <h2>{method === 'BANK_TRANSFER' ? 'Chuyển khoản học phí' : 'Nộp tiền mặt học phí'}</h2>
        </div>
        <dl>
          <div>
            <dt>Mã phiếu</dt>
            <dd>{documentNumber}</dd>
          </div>
          <div>
            <dt>Lập lúc</dt>
            <dd>{issuedAt}</dd>
          </div>
          <div>
            <dt>Phiếu gốc</dt>
            <dd>{invoiceNumber}</dd>
          </div>
        </dl>
      </header>

      <section className={styles.followUpPaymentSlipIntro}>
        <div>
          <span>Học viên</span>
          <strong>{lead.name}</strong>
          <small>{lead.phone || 'Chưa có số điện thoại'}</small>
        </div>
        <div>
          <span>Khoản cần thu</span>
          <strong>{formatVND(safeAmount)}</strong>
          <small>Còn lại sau phiếu này: {formatVND(remainingAfterRequest)}</small>
        </div>
      </section>

      <section className={styles.followUpPaymentSlipItems}>
        <h3>Nội dung follow-up</h3>
        <p>{selectedItems.length ? selectedItems.join(' · ') : 'Học phí Academy theo phiếu đã lập'}</p>
        <div>
          <span>Đã xác nhận trước đó</span>
          <strong>{formatVND(totalPaidVnd)}</strong>
        </div>
        <div>
          <span>Còn phải thanh toán</span>
          <strong>{formatVND(remainingVnd)}</strong>
        </div>
      </section>

      {method === 'BANK_TRANSFER' ? (
        <section className={styles.followUpTransferPanel}>
          <div className={styles.followUpQrPanel}>
            {qrSource ? (
              <Image
                className={styles.followUpSlipQr}
                preview={false}
                src={qrSource}
                alt={`VietQR ${formatVND(safeAmount)}`}
              />
            ) : (
              <AppIcon icon={QrCode} size={28} />
            )}
            <span>Quét QR đúng số tiền</span>
          </div>
          <div className={styles.followUpTransferDetails}>
            <p>
              <AppIcon icon={Landmark} size={12} /> Chuyển khoản Vietcombank
            </p>
            <strong>{formatVND(safeAmount)}</strong>
            <dl>
              <div>
                <dt>Chủ tài khoản</dt>
                <dd>{ACADEMY_VIETQR_ACCOUNT_NAME}</dd>
              </div>
              <div>
                <dt>Số tài khoản</dt>
                <dd>{ACADEMY_VIETQR_ACCOUNT}</dd>
              </div>
              <div>
                <dt>Nội dung</dt>
                <dd>{bankReference}</dd>
              </div>
            </dl>
          </div>
        </section>
      ) : (
        <section className={styles.followUpCashPanel}>
          <AppIcon icon={CircleDollarSign} size={34} />
          <div>
            <h3>Nộp tiền mặt tại quầy Academy</h3>
            <p>
              Vui lòng xuất trình mã phiếu này cho thu ngân và nhận biên nhận sau khi nộp đủ{' '}
              <b>{formatVND(safeAmount)}</b>.
            </p>
          </div>
          <strong>{formatVND(safeAmount)}</strong>
        </section>
      )}

      {customReference && (
        <p className={styles.followUpPaymentSlipReference}>
          Thông tin do tư vấn viên ghi: <b>{customReference}</b>
        </p>
      )}

      <footer className={styles.followUpPaymentSlipFooter}>
        <p>
          <AppIcon icon={ShieldCheck} size={12} /> Phiếu này là yêu cầu thanh toán, chưa xác nhận Academy đã nhận tiền.
          Khoản thu chỉ được ghi nhận sau khi thu ngân/quản lý đối soát.
        </p>
        <div>
          <span>
            Người lập phiếu
            <br />
            <em>(Ký, ghi rõ họ tên)</em>
          </span>
          <span>
            Người nộp
            <br />
            <em>(Ký, ghi rõ họ tên)</em>
          </span>
          <span>
            Thu ngân / Quản lý
            <br />
            <em>(Xác nhận sau đối soát)</em>
          </span>
        </div>
      </footer>
    </article>
  );
}

export default AcademyTalentFollowUpPaymentSlip;
