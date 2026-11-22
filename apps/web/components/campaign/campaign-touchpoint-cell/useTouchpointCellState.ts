import { useEffect, useState } from 'react';
import type React from 'react';
import dayjs from 'dayjs';
import type { TouchpointStatus } from '@mos-lab/shared';
import type { CampaignTouchpointItem, TouchpointDisplayStatus } from './touchpoint-cell-types';
import {
  findTouchpointLog,
  formatTouchpointNoteWithDiamond,
  hasTouchpointDiamondReferral,
  resolveTouchpointDisplayStatus,
} from './touchpoint-cell-utils';

export interface UseTouchpointCellStateParams {
  customer: any;
  touchpoint: CampaignTouchpointItem;
  onToggle: (
    customerId: number,
    touchpointId: number,
    isChecked: boolean,
    note?: string,
    status?: TouchpointStatus | null,
    callbackDate?: string
  ) => Promise<void>;
  onOpenBooking?: (customer: any) => void;
}

export interface UseTouchpointCellStateResult {
  tpLog: any;
  currentNote: string;
  days: number;
  displayStatus: TouchpointDisplayStatus;
  labelText: string;
  customerName: string;
  formattedDate: string | null;
  staffName: string;
  popoverOpen: boolean;
  setPopoverOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedStatus: TouchpointStatus | null;
  noteInput: string;
  setNoteInput: React.Dispatch<React.SetStateAction<string>>;
  hasReferredDiamond: boolean;
  toggleDiamondReferral: () => void;
  callbackDate: dayjs.Dayjs;
  setCallbackDate: React.Dispatch<React.SetStateAction<dayjs.Dayjs>>;
  loading: boolean;
  handleCellClick: (e: React.MouseEvent) => void;
  handleSelectStatus: (status: TouchpointStatus | null) => void;
  handleSave: (statusToSave?: TouchpointStatus | null, e?: React.MouseEvent) => Promise<void>;
  handleBookedAction: (e: React.MouseEvent) => void;
  handleReset: (e: React.MouseEvent) => Promise<void>;
}

export function useTouchpointCellState({
  customer,
  touchpoint,
  onToggle,
  onOpenBooking,
}: UseTouchpointCellStateParams): UseTouchpointCellStateResult {
  const tpLog = findTouchpointLog(customer, touchpoint);
  const isChecked = !!tpLog?.isChecked;
  const rawStatus: TouchpointStatus | null = tpLog?.status || (isChecked ? 'SUCCESS' : null);
  const currentNote: string = tpLog?.note || '';
  const initialDiamond = hasTouchpointDiamondReferral(tpLog, customer, currentNote);

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TouchpointStatus | null>(rawStatus);
  const [noteInput, setNoteInput] = useState(currentNote);
  const [hasReferredDiamond, setHasReferredDiamond] = useState<boolean>(initialDiamond);
  const [callbackDate, setCallbackDate] = useState<dayjs.Dayjs>(dayjs().add(1, 'day'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelectedStatus(rawStatus);
    setNoteInput(currentNote);
    setHasReferredDiamond(initialDiamond);
    if (customer.callbackDate) {
      setCallbackDate(dayjs(customer.callbackDate));
    }
  }, [rawStatus, currentNote, initialDiamond, customer.callbackDate]);

  const days = customer.daysInCampaign ?? customer.daysSinceAdded ?? 0;
  const displayStatus = resolveTouchpointDisplayStatus(touchpoint, days, isChecked, rawStatus);
  const customerId = customer.legacyUserId || customer.id;
  const labelText = touchpoint.label || `Chạm ${touchpoint.key}`;
  const customerName = customer.customerName || customer.name || `Khách hàng #${customerId}`;
  const formattedDate = tpLog?.completedAt ? dayjs(tpLog.completedAt).format('DD/MM HH:mm') : null;
  const staffName = tpLog?.completedByStaffName || 'Staff';

  const handleCellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;
    setPopoverOpen((prev) => !prev);
  };

  const handleSelectStatus = (status: TouchpointStatus | null) => {
    setSelectedStatus(status);
  };

  const toggleDiamondReferral = () => {
    setHasReferredDiamond((prev) => !prev);
  };

  const handleSave = async (statusToSave?: TouchpointStatus | null, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLoading(true);
    const targetStatus = statusToSave !== undefined ? statusToSave : selectedStatus;
    const isNowChecked = targetStatus !== null;
    const finalNote = formatTouchpointNoteWithDiamond(noteInput, hasReferredDiamond);
    const cbDateStr = targetStatus === 'CALLBACK' ? callbackDate.format('YYYY-MM-DD') : undefined;
    try {
      await onToggle(customerId, touchpoint.id, isNowChecked, finalNote, targetStatus, cbDateStr);
      setPopoverOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleBookedAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    void handleSave('BOOKED', e);
    if (onOpenBooking) {
      onOpenBooking(customer);
    }
  };

  const handleReset = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await onToggle(customerId, touchpoint.id, false, '', null);
      setSelectedStatus(null);
      setNoteInput('');
      setHasReferredDiamond(false);
      setPopoverOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    tpLog,
    currentNote,
    days,
    displayStatus,
    labelText,
    customerName,
    formattedDate,
    staffName,
    popoverOpen,
    setPopoverOpen,
    selectedStatus,
    noteInput,
    setNoteInput,
    hasReferredDiamond,
    toggleDiamondReferral,
    callbackDate,
    setCallbackDate,
    loading,
    handleCellClick,
    handleSelectStatus,
    handleSave,
    handleBookedAction,
    handleReset,
  };
}
