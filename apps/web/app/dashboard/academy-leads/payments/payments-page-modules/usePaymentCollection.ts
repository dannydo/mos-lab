'use client';

import React from 'react';
import { message } from 'antd';
import type { AcademyTalentPaymentManagementRow, AcademyTalentPaymentMethod } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { formatVND } from '~/lib/format-utils';
import type { AcademyTalentFollowUpPaymentSlipSnapshot } from '../../components/AcademyTalentFollowUpPaymentSlip';
import { extractApiErrorMessage } from './payment-management-utils';

export function usePaymentCollection(onCollected: () => Promise<void>) {
  const [collecting, setCollecting] = React.useState<AcademyTalentPaymentManagementRow | null>(null);
  const [collectionAmountVnd, setCollectionAmountVnd] = React.useState<number | null>(null);
  const [collectionMethod, setCollectionMethod] = React.useState<AcademyTalentPaymentMethod>('BANK_TRANSFER');
  const [collectionReference, setCollectionReference] = React.useState('');
  const [collectionNote, setCollectionNote] = React.useState('');
  const [paymentSlipOpen, setPaymentSlipOpen] = React.useState(false);
  const [savingCollection, setSavingCollection] = React.useState(false);

  const openCollection = React.useCallback((row: AcademyTalentPaymentManagementRow) => {
    if (row.paymentStatus === 'PAID' || row.remainingVnd <= 0) {
      message.info('Phiếu này đã thu đủ học phí.');
      return;
    }
    const firstDeposit =
      row.totalPaidVnd === 0 && row.paymentMode === 'DEPOSIT'
        ? Math.min(row.remainingVnd, row.requiredDepositVnd)
        : row.remainingVnd;
    setCollectionAmountVnd(Math.max(0, Math.round(firstDeposit)) || null);
    setCollectionMethod('BANK_TRANSFER');
    setCollectionReference('');
    setCollectionNote('');
    setCollecting(row);
  }, []);

  const closeCollection = React.useCallback(() => {
    if (savingCollection) return;
    setCollecting(null);
    setPaymentSlipOpen(false);
  }, [savingCollection]);

  const requestedAmountVnd = React.useMemo(() => Math.round(Number(collectionAmountVnd) || 0), [collectionAmountVnd]);

  const paymentSlipSnapshot = React.useMemo<AcademyTalentFollowUpPaymentSlipSnapshot | null>(() => {
    if (!collecting) return null;
    return {
      invoiceNumber: collecting.invoiceNumber,
      requestSequence: collecting.paymentCount + 1,
      totalPaidVnd: collecting.totalPaidVnd,
      remainingVnd: collecting.remainingVnd,
      selectedItems: collecting.courseLabel ? [collecting.courseLabel] : [],
    };
  }, [collecting]);

  const openPaymentSlipPreview = React.useCallback(() => {
    if (!collecting) return;
    if (requestedAmountVnd <= 0) {
      message.warning('Nhập số tiền cần lập phiếu.');
      return;
    }
    if (requestedAmountVnd > collecting.remainingVnd) {
      message.warning(`Số tiền trên phiếu không được vượt quá phần còn lại ${formatVND(collecting.remainingVnd)}.`);
      return;
    }
    setPaymentSlipOpen(true);
  }, [collecting, requestedAmountVnd]);

  const printPaymentSlip = React.useCallback(() => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  }, []);

  const confirmCollection = React.useCallback(async () => {
    if (!collecting) return;
    const amountVnd = requestedAmountVnd;
    if (amountVnd <= 0) {
      message.warning('Nhập số tiền thực tế đã nhận.');
      return;
    }
    if (amountVnd > collecting.remainingVnd) {
      message.warning(`Số tiền không được vượt quá phần còn lại ${formatVND(collecting.remainingVnd)}.`);
      return;
    }
    setSavingCollection(true);
    try {
      const response = await apiClient.academySales.recordTalentAssessmentPayment(collecting.assessmentId, {
        amountVnd,
        method: collectionMethod,
        reference: collectionReference.trim() || null,
        note: collectionNote.trim() || null,
      });
      message.success(response.message || 'Đã xác nhận khoản thu học phí.');
      setPaymentSlipOpen(false);
      setCollecting(null);
      await onCollected();
    } catch (nextError: unknown) {
      message.error(extractApiErrorMessage(nextError, 'Không thể xác nhận khoản thu.'));
    } finally {
      setSavingCollection(false);
    }
  }, [collecting, collectionMethod, collectionNote, collectionReference, onCollected, requestedAmountVnd]);

  return {
    collecting,
    collectionAmountVnd,
    setCollectionAmountVnd,
    collectionMethod,
    setCollectionMethod,
    collectionReference,
    setCollectionReference,
    collectionNote,
    setCollectionNote,
    paymentSlipOpen,
    setPaymentSlipOpen,
    savingCollection,
    requestedAmountVnd,
    paymentSlipSnapshot,
    openCollection,
    closeCollection,
    openPaymentSlipPreview,
    printPaymentSlip,
    confirmCollection,
  };
}
