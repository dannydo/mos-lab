'use client';

import React, { useEffect, useState } from 'react';
import { Popover, Tooltip } from 'antd';
import {
  BellRing,
  CalendarCheck,
  CheckCircle2,
  Clock,
  FileText,
  HeartOff,
  Hourglass,
  MessageSquare,
  PhoneCall,
  PhoneOff,
} from 'lucide-react';
import dayjs from 'dayjs';
import { Customer, LocaTouchpointState, TouchpointStatus } from '@mos-lab/shared';
import styles from './LocaTouchpointCell.module.css';
import {
  buildDiamondAnnotatedNote,
  getTouchpointTileClassName,
  resolveLocaTouchpointDisplayStatus,
} from './touchpoint-cell/loca-touchpoint-utils';
import { LocaTouchpointTooltip } from './touchpoint-cell/LocaTouchpointTooltip';
import { LocaTouchpointPopoverContent } from './touchpoint-cell/LocaTouchpointPopoverContent';

interface LocaTouchpointCellProps {
  customer: Customer;
  touchpointKey: string;
  label: string;
  targetDays: number;
  themeMode: 'light' | 'dark';
  onToggle: (
    customerId: number,
    touchpointKey: string,
    isChecked: boolean,
    note?: string,
    status?: TouchpointStatus | null,
    hasReferredDiamond?: boolean,
    callbackDate?: string
  ) => Promise<void>;
  onOpenBooking?: (customer: Customer) => void;
}

export const LocaTouchpointCell: React.FC<LocaTouchpointCellProps> = ({
  customer,
  touchpointKey,
  label,
  targetDays,
  themeMode,
  onToggle,
  onOpenBooking,
}) => {
  const tpState: LocaTouchpointState | undefined = customer.touchpoints?.[touchpointKey];
  const isChecked = !!tpState?.isChecked;
  const rawStatus = tpState?.status || (isChecked ? 'SUCCESS' : null);
  const currentNote = tpState?.note || '';
  const initialDiamond = !!(
    (tpState as SafeAny)?.hasReferredDiamond ||
    (customer as SafeAny)?.hasReferredDiamond ||
    currentNote.includes('💎')
  );

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

  const days = customer.daysSinceLastVisit;
  const displayStatus = resolveLocaTouchpointDisplayStatus({
    days,
    touchpointKey,
    targetDays,
    isChecked,
    rawStatus,
  });

  const handleCellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;
    setPopoverOpen((prev) => !prev);
  };

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setPopoverOpen((prev) => !prev);
  };

  const handleSave = async (statusToSave?: TouchpointStatus | null, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLoading(true);
    const targetStatus = statusToSave !== undefined ? statusToSave : selectedStatus;
    const isNowChecked = targetStatus !== null;
    const finalNote = buildDiamondAnnotatedNote(noteInput, hasReferredDiamond);
    const cbDateStr = targetStatus === 'CALLBACK' ? callbackDate.format('YYYY-MM-DD') : undefined;
    try {
      await onToggle(customer.id, touchpointKey, isNowChecked, finalNote, targetStatus, hasReferredDiamond, cbDateStr);
      setPopoverOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await onToggle(customer.id, touchpointKey, false, '', null, false);
      setSelectedStatus(null);
      setNoteInput('');
      setHasReferredDiamond(false);
      setPopoverOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = tpState?.checkedAt ? dayjs(tpState.checkedAt).format('DD/MM HH:mm') : null;
  const staffName = tpState?.checkedByStaffName || 'Staff';
  const callbackDateText = customer.callbackDate
    ? dayjs(customer.callbackDate).format('DD/MM/YYYY')
    : callbackDate.format('DD/MM/YYYY');
  const isDark = themeMode === 'dark';

  const renderPillIcon = () => {
    const iconProps = { size: 18, strokeWidth: 2.25 };

    if (displayStatus === 'DONE') return <CheckCircle2 {...iconProps} className="text-emerald-400" />;
    if (displayStatus === 'BOOKED') return <CalendarCheck {...iconProps} className="text-indigo-400" />;
    if (displayStatus === 'SUCCESS') return <PhoneCall {...iconProps} className="text-emerald-400" />;
    if (displayStatus === 'CALLBACK') return <Clock {...iconProps} className="text-purple-400" />;
    if (displayStatus === 'MESSAGED') return <MessageSquare {...iconProps} className="text-cyan-400" />;
    if (displayStatus === 'FAILED') return <PhoneOff {...iconProps} className="text-rose-400" />;
    if (displayStatus === 'LOST') return <HeartOff {...iconProps} className="text-pink-400" />;
    if (displayStatus === 'DUE_TODAY') return <BellRing {...iconProps} className="text-amber-400 animate-pulse" />;
    if (displayStatus === 'OVERDUE') return <Hourglass {...iconProps} className="text-rose-400 opacity-80" />;
    return <Hourglass {...iconProps} className="text-slate-400 opacity-60" />;
  };

  return (
    <Popover
      content={
        <LocaTouchpointPopoverContent
          customer={customer}
          label={label}
          isDark={isDark}
          selectedStatus={selectedStatus}
          callbackDate={callbackDate}
          hasReferredDiamond={hasReferredDiamond}
          noteInput={noteInput}
          loading={loading}
          onSelectStatus={setSelectedStatus}
          onChangeCallbackDate={setCallbackDate}
          onToggleDiamond={() => setHasReferredDiamond((prev) => !prev)}
          onChangeNoteInput={setNoteInput}
          onSave={handleSave}
          onReset={handleReset}
          onOpenBooking={onOpenBooking}
        />
      }
      title={null}
      trigger="click"
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      placement="bottom"
    >
      <Tooltip
        title={
          popoverOpen ? (
            ''
          ) : (
            <LocaTouchpointTooltip
              displayStatus={displayStatus}
              label={label}
              days={days}
              staffName={staffName}
              formattedDate={formattedDate}
              currentNote={currentNote}
              callbackDateText={callbackDateText}
              tpState={tpState}
            />
          )
        }
        placement="top"
      >
        <div
          className={`${styles.touchpointTile} ${getTouchpointTileClassName(displayStatus, isDark)} ${
            loading ? 'cursor-wait' : 'cursor-pointer'
          }`}
          role="button"
          tabIndex={0}
          aria-label={`Cập nhật trạng thái ${label} cho ${customer.name || 'khách hàng'}`}
          onClick={handleCellClick}
          onKeyDown={handleCellKeyDown}
        >
          {/* Main Status Icon */}
          {renderPillIcon()}

          {/* Top-Right Corner Diamond Badge */}
          {hasReferredDiamond && (
            <span className={styles.diamondBadge} title="Đã tư vấn Chương Trình Kim Cương">
              💎
            </span>
          )}

          {/* Bottom-Left Corner Note Indicator */}
          {currentNote && (
            <span
              className={`${styles.noteBadge} ${
                isDark
                  ? 'text-amber-400 bg-slate-800 border border-slate-600'
                  : 'text-amber-600 bg-white border border-slate-300'
              }`}
              title={`Ghi chú: ${currentNote}`}
            >
              <FileText size={7} />
            </span>
          )}
        </div>
      </Tooltip>
    </Popover>
  );
};
