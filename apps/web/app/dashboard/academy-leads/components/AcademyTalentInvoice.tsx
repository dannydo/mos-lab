'use client';

import React from 'react';
import { CircleCheck, Clock3, Landmark, QrCode, Trophy } from 'lucide-react';
import { Image } from 'antd';
import dayjs from 'dayjs';
import { formatVND } from '../../../../lib/format-utils';
import { AppIcon } from '../../../../components/ui';
import type { AcademyTalentAssessmentView, AcademyTalentLead } from './academy-talent-workshop.types';
import {
  ACADEMY_VIETQR_ACCOUNT,
  ACADEMY_VIETQR_ACCOUNT_NAME,
  buildAcademyVietQrUrl,
} from './academy-talent-payment-utils';
import styles from './AcademyTalentWorkshop.module.css';

export interface AcademyTalentInvoiceProps {
  lead: AcademyTalentLead;
  assessment: AcademyTalentAssessmentView;
  className?: string;
}

function paymentLabel(mode: AcademyTalentAssessmentView['draft']['paymentMode']) {
  if (mode === 'FULL') return 'Thanh toán trọn gói';
  if (mode === 'DEPOSIT') return 'Cọc giữ suất học bổng';
  return 'Đang chờ chọn phương án';
}

/**
 * The Academy payment-first document. Monetary values, scholarship expiry and
 * payment mode are all supplied by the immutable Academy quote/invoice; this
 * component only lays them out for preview and print.
 */
export function AcademyTalentInvoice({ lead, assessment, className = '' }: AcademyTalentInvoiceProps) {
  const { invoice, pricing, result } = assessment;
  const issuedAt = invoice?.issuedAt || assessment.updatedAt;
  const displayDate = issuedAt ? dayjs(issuedAt).format('DD/MM/YYYY HH:mm') : '—';
  const documentNumber = invoice?.invoiceNumber || 'BẢN XEM TRƯỚC';
  const isPaymentComplete = assessment.payment.status === 'PAID';
  const mode = isPaymentComplete ? invoice?.paymentMode || assessment.draft.paymentMode : assessment.draft.paymentMode;
  const dueNow = isPaymentComplete ? (invoice?.dueNowVnd ?? pricing?.dueNowVnd ?? null) : (pricing?.dueNowVnd ?? null);
  const depositAmount = pricing?.suggestedDepositVnd ?? assessment.draft.depositVnd ?? 0;
  const fullAmount = pricing?.finalTotalVnd ?? 0;
  const payableNow =
    mode === 'THINKING' ? 0 : Math.max(0, Math.round(dueNow ?? (mode === 'FULL' ? fullAmount : depositAmount)));
  const expiresAt = pricing?.expiresAt ? dayjs(pricing.expiresAt) : null;
  const expiryLabel = expiresAt?.isValid() ? expiresAt.format('HH:mm · DD/MM/YYYY') : 'Theo xác nhận Academy';
  const qrReference = `${documentNumber} ${mode === 'FULL' ? 'HOC PHI' : 'COC HOC BONG'}`;
  const qrSource = payableNow > 0 ? buildAcademyVietQrUrl(payableNow, qrReference) : null;

  return (
    <article
      className={`${styles.invoice} ${styles.invoicePaymentFirst} ${className}`}
      aria-label="Phiếu học phí và đăng ký Academy"
    >
      <header className={styles.invoiceHeader}>
        <div>
          <div className={styles.invoiceBrand}>
            <AppIcon icon={Trophy} /> ACADEMY
          </div>
          <p className={styles.invoiceKicker}>Phiếu học phí ưu đãi</p>
          <h2>
            Giữ suất học bổng
            <br />
            của bạn hôm nay.
          </h2>
          <p>Đánh giá Tố Chất · Khóa học được tư vấn theo kết quả buổi test</p>
        </div>
        <dl className={styles.invoiceMeta}>
          <div>
            <dt>Mã phiếu</dt>
            <dd>{documentNumber}</dd>
          </div>
          <div>
            <dt>Ngày lập</dt>
            <dd>{displayDate}</dd>
          </div>
          <div>
            <dt>Trạng thái</dt>
            <dd>{paymentLabel(mode)}</dd>
          </div>
        </dl>
      </header>

      <section className={styles.invoicePaymentFocus} aria-label="Thông tin thanh toán">
        <div className={styles.invoicePaymentFocusHead}>
          <div>
            <p className={styles.invoiceKicker}>01 / Thanh toán</p>
            <h3>Quét đúng số tiền cần thanh toán.</h3>
            <p>Cọc để giữ học bổng, hoặc thanh toán trọn gói để hoàn tất học phí.</p>
          </div>
          <div className={styles.invoicePaymentChoices} aria-label="Phương án thanh toán đã chọn">
            <div className={mode === 'DEPOSIT' ? styles.invoicePaymentChoiceActive : styles.invoicePaymentChoice}>
              {mode === 'DEPOSIT' && (
                <AppIcon icon={CircleCheck} className={styles.invoicePaymentChoiceTick} label="Đã chọn cọc học bổng" />
              )}
              <span>Cọc học bổng</span>
              <strong>{depositAmount > 0 ? formatVND(depositAmount) : 'Chưa áp dụng'}</strong>
            </div>
            <div className={mode === 'FULL' ? styles.invoicePaymentChoiceActive : styles.invoicePaymentChoice}>
              {mode === 'FULL' && (
                <AppIcon icon={CircleCheck} className={styles.invoicePaymentChoiceTick} label="Đã chọn thanh toán đủ" />
              )}
              <span>Thanh toán đủ</span>
              <strong>{fullAmount > 0 ? formatVND(fullAmount) : 'Chưa áp dụng'}</strong>
            </div>
          </div>
        </div>
        <div className={styles.invoicePaymentFocusBody}>
          <div className={styles.invoiceQrCard}>
            {qrSource ? (
              <Image
                className={styles.invoiceQrImage}
                preview={false}
                src={qrSource}
                alt={`VietQR ${paymentLabel(mode)}, ${formatVND(payableNow)}`}
              />
            ) : (
              <div className={styles.invoiceQrPlaceholder}>
                <AppIcon icon={QrCode} />
                <span>Chờ xác nhận số tiền</span>
              </div>
            )}
            <div>
              <p className={styles.invoiceKicker}>
                <AppIcon icon={QrCode} /> VietQR · Vietcombank
              </p>
              <strong className={styles.invoiceQrAmount}>
                {payableNow > 0 ? formatVND(payableNow) : 'Theo xác nhận'}
              </strong>
              <p className={styles.invoiceQrLabel}>{paymentLabel(mode)}</p>
              <p className={styles.invoiceBankAccount}>
                <AppIcon icon={Landmark} /> Vietcombank · {ACADEMY_VIETQR_ACCOUNT}
                <br />
                <b>{ACADEMY_VIETQR_ACCOUNT_NAME}</b>
              </p>
            </div>
          </div>
          <div className={styles.invoiceExpiryNotice}>
            <AppIcon icon={Clock3} />
            <span>
              <b>Khoá ưu đãi lúc {expiryLabel}</b>
              <br />
              Sau thời điểm này, hệ thống sẽ áp dụng chính sách học phí mới.
            </span>
          </div>
        </div>
      </section>

      <section className={styles.invoicePartyGrid}>
        <div>
          <h3>Học viên</h3>
          <strong>{lead.name}</strong>
          <span>{lead.phone || 'Chưa có số điện thoại'}</span>
          {lead.email && <span>{lead.email}</span>}
        </div>
        <div>
          <h3>Kết quả Tố Chất</h3>
          <strong>{result.rankLabel || 'Đang chờ đánh giá'}</strong>
          <span>
            {assessment.draft.strands5Min} sợi / 5 phút · {result.totalErrors} điểm cần tinh chỉnh
          </span>
          <span>Học bổng: {Math.round(result.scholarshipPct || 0)}%</span>
        </div>
      </section>

      <section className={styles.invoiceLineSection}>
        <h3 className={styles.invoiceContentsHeading}>02 / Những gì học viên nhận được</h3>
        <div className={styles.invoiceLineHead}>
          <span>Khóa học</span>
          <span>Giá ưu đãi</span>
          <span>Học bổng</span>
          <span>Cần thanh toán</span>
        </div>
        {(pricing?.lineItems || []).map((item) => (
          <div className={styles.invoiceLine} key={item.courseId}>
            <span>
              {item.name}
              <small>
                {item.instructor?.displayName || 'Phân bổ tự động'}
                {item.instructorSurchargeVnd > 0 && item.instructor
                  ? ` · Phí chỉ định +${item.instructor.surchargePercent}%`
                  : item.instructor
                    ? ' · Phân bổ tự động'
                    : ''}
              </small>
            </span>
            <span>{formatVND(item.promoPriceVnd)}</span>
            <span>-{formatVND(item.scholarshipVnd)}</span>
            <strong>{formatVND(item.finalPriceVnd)}</strong>
          </div>
        ))}
        {(pricing?.lineItems || [])
          .filter((item) => item.instructorSurchargeVnd > 0)
          .map((item) => (
            <div className={styles.invoiceLine} key={`instructor-${item.courseId}`}>
              <span>
                Phí chỉ định · {item.instructor?.displayName || 'Giảng viên Academy'}
                <small>{item.instructor?.description || 'Giảng viên Academy'}</small>
              </span>
              <span>—</span>
              <span>—</span>
              <strong>+{formatVND(item.instructorSurchargeVnd)}</strong>
            </div>
          ))}
        {(pricing?.addOnItems || []).map((item) => (
          <div className={styles.invoiceLine} key={`${item.kind}-${item.courseId}`}>
            <span>
              {item.kind === 'SAMPLE' ? 'Mẫu thực hành' : 'Đồ nghề'} · {item.courseName}
              <small>{item.label}</small>
            </span>
            <span>{formatVND(item.listPriceVnd)}</span>
            <span>-{formatVND(item.scholarshipVnd)}</span>
            <strong>{formatVND(item.finalPriceVnd)}</strong>
          </div>
        ))}
        {!pricing?.lineItems?.length && <div className={styles.invoiceEmptyLine}>Chưa có khóa học nào được chọn.</div>}
      </section>

      <section className={styles.invoiceTotals}>
        <div>
          <span>Tổng giá ưu đãi</span>
          <strong>{formatVND(pricing?.promoTotalVnd || 0)}</strong>
        </div>
        <div>
          <span>Học bổng được áp dụng</span>
          <strong>-{formatVND(pricing?.scholarshipVnd || 0)}</strong>
        </div>
        {(pricing?.teacherSurchargeVnd || 0) > 0 && (
          <div>
            <span>Phí chỉ định giảng viên</span>
            <strong>+{formatVND(pricing?.teacherSurchargeVnd || 0)}</strong>
          </div>
        )}
        <div className={styles.invoiceGrandTotal}>
          <span>Tổng học phí sau ưu đãi</span>
          <strong>{formatVND(pricing?.finalTotalVnd || 0)}</strong>
        </div>
      </section>

      <footer className={styles.invoiceFooter}>
        <p>
          <AppIcon icon={CircleCheck} /> Phiếu này xác nhận nội dung tư vấn, học bổng và mức học phí áp dụng tại thời
          điểm lập; không phải hóa đơn VAT hoặc biên nhận đã thu tiền.
        </p>
        <div className={styles.invoiceSignatures}>
          <span>
            Người tư vấn
            <br />
            <em>(Ký và ghi rõ họ tên)</em>
          </span>
          <span>
            Học viên
            <br />
            <em>(Ký và ghi rõ họ tên)</em>
          </span>
        </div>
      </footer>
    </article>
  );
}

export default AcademyTalentInvoice;
