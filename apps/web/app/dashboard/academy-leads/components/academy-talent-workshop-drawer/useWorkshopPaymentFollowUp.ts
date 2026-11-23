'use client';

import React from 'react';
import { message } from 'antd';
import type { AcademyTalentPaymentMethod, RecordAcademyTalentPaymentRequest } from '@mos-lab/shared';
import { formatVND } from '~/lib/format-utils';
import type { AcademyTalentAssessmentView, AcademyTalentDraft } from '../academy-talent-workshop.types';
import { normalizeDraft } from './workshop-drawer-utils';

export interface UseWorkshopPaymentFollowUpOptions {
  printView: AcademyTalentAssessmentView | null;
  displayView: AcademyTalentAssessmentView | null | undefined;
  autoOpenPaymentFollowUp: boolean;
  onRecordPayment?: (
    assessmentId: number,
    input: RecordAcademyTalentPaymentRequest
  ) => Promise<AcademyTalentAssessmentView>;
  onSaved?: (assessment: AcademyTalentAssessmentView) => void | Promise<void>;
  setView: React.Dispatch<React.SetStateAction<AcademyTalentAssessmentView | null>>;
  setDraft: React.Dispatch<React.SetStateAction<AcademyTalentDraft>>;
  setPrintView: React.Dispatch<React.SetStateAction<AcademyTalentAssessmentView | null>>;
  setQuoteDirty: React.Dispatch<React.SetStateAction<boolean>>;
  setBusyAction: React.Dispatch<React.SetStateAction<'save' | 'invoice' | 'payment' | 'session' | null>>;
}

export function useWorkshopPaymentFollowUp({
  printView,
  displayView,
  autoOpenPaymentFollowUp,
  onRecordPayment,
  onSaved,
  setView,
  setDraft,
  setPrintView,
  setQuoteDirty,
  setBusyAction,
}: UseWorkshopPaymentFollowUpOptions) {
  const [printDocument, setPrintDocument] = React.useState<'INVOICE' | 'FOLLOW_UP' | null>(null);
  const [paymentFollowUpOpen, setPaymentFollowUpOpen] = React.useState(false);
  const [paymentSlipOpen, setPaymentSlipOpen] = React.useState(false);
  const [paymentAmountVnd, setPaymentAmountVnd] = React.useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<AcademyTalentPaymentMethod>('BANK_TRANSFER');
  const [paymentReference, setPaymentReference] = React.useState('');
  const [paymentNote, setPaymentNote] = React.useState('');
  const autoOpenedPaymentFollowUpRef = React.useRef<number | null>(null);

  const openPaymentFollowUp = React.useCallback(() => {
    const paymentView = printView || displayView;
    if (!paymentView?.invoice) {
      message.info('Lập và in phiếu trước khi xác nhận tiền đã nhận.');
      return;
    }
    const dueForFirstReceipt =
      paymentView.payment.totalPaidVnd > 0
        ? paymentView.payment.remainingVnd
        : (paymentView.pricing?.dueNowVnd ?? paymentView.payment.remainingVnd);
    setPaymentAmountVnd(Math.max(0, Math.round(dueForFirstReceipt || 0)) || null);
    setPaymentMethod('BANK_TRANSFER');
    setPaymentReference('');
    setPaymentNote('');
    setPaymentFollowUpOpen(true);
  }, [displayView, printView]);

  React.useEffect(() => {
    const paymentView = printView || displayView;
    if (!autoOpenPaymentFollowUp) {
      autoOpenedPaymentFollowUpRef.current = null;
      return;
    }
    if (
      !paymentView?.invoice ||
      paymentView.payment.status === 'PAID' ||
      autoOpenedPaymentFollowUpRef.current === paymentView.id
    ) {
      return;
    }
    autoOpenedPaymentFollowUpRef.current = paymentView.id;
    openPaymentFollowUp();
  }, [autoOpenPaymentFollowUp, displayView, openPaymentFollowUp, printView]);

  const recordPayment = React.useCallback(async () => {
    const paymentView = printView || displayView;
    if (!paymentView || !onRecordPayment) return;
    const amountVnd = Math.round(Number(paymentAmountVnd) || 0);
    if (amountVnd <= 0) {
      message.warning('Nhập số tiền thực tế đã nhận.');
      return;
    }
    if (amountVnd > paymentView.payment.remainingVnd) {
      message.warning(`Số tiền không được vượt quá phần còn lại ${formatVND(paymentView.payment.remainingVnd)}.`);
      return;
    }
    setBusyAction('payment');
    try {
      const updated = await onRecordPayment(paymentView.id, {
        amountVnd,
        method: paymentMethod,
        reference: paymentReference.trim() || null,
        note: paymentNote.trim() || null,
      });
      setView(updated);
      setDraft(normalizeDraft(updated.draft));
      setPrintView(updated);
      setQuoteDirty(false);
      await onSaved?.(updated);
      if (updated.payment.status === 'PAID') {
        setPaymentFollowUpOpen(false);
        setPaymentSlipOpen(false);
        message.success('Đã xác nhận thanh toán đủ. Phiếu đã được khóa.');
      } else {
        message.success(`Đã xác nhận tiền nhận được. Còn ${formatVND(updated.payment.remainingVnd)} để follow-up.`);
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || error?.message || 'Không thể xác nhận tiền đã nhận.');
    } finally {
      setBusyAction(null);
    }
  }, [
    displayView,
    onRecordPayment,
    onSaved,
    paymentAmountVnd,
    paymentMethod,
    paymentNote,
    paymentReference,
    printView,
    setBusyAction,
    setDraft,
    setPrintView,
    setQuoteDirty,
    setView,
  ]);

  const openPaymentSlipPreview = React.useCallback(() => {
    const paymentView = printView || displayView;
    const amountVnd = Math.round(Number(paymentAmountVnd) || 0);
    if (!paymentView || amountVnd <= 0) {
      message.warning('Nhập số tiền cần lập phiếu thanh toán.');
      return;
    }
    if (amountVnd > paymentView.payment.remainingVnd) {
      message.warning(`Số tiền không được vượt quá phần còn lại ${formatVND(paymentView.payment.remainingVnd)}.`);
      return;
    }
    setPaymentSlipOpen(true);
  }, [displayView, paymentAmountVnd, printView]);

  const printPaymentSlip = React.useCallback(() => {
    setPrintDocument('FOLLOW_UP');
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  }, []);

  return {
    printDocument,
    setPrintDocument,
    paymentFollowUpOpen,
    setPaymentFollowUpOpen,
    paymentSlipOpen,
    setPaymentSlipOpen,
    paymentAmountVnd,
    setPaymentAmountVnd,
    paymentMethod,
    setPaymentMethod,
    paymentReference,
    setPaymentReference,
    paymentNote,
    setPaymentNote,
    openPaymentFollowUp,
    recordPayment,
    openPaymentSlipPreview,
    printPaymentSlip,
  };
}
