'use client';

import React, { useState, useEffect } from 'react';
import { Popover, Input, Button, Tooltip, Space, DatePicker } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import {
  PhoneCall,
  PhoneOff,
  HeartOff,
  CalendarCheck,
  CheckCircle2,
  BellRing,
  Hourglass,
  RotateCcw,
  MessageSquare,
  Clock,
} from 'lucide-react';
import dayjs from 'dayjs';
import { Customer, LocaTouchpointState, TouchpointStatus, LASH_TOUCHUP_SYSTEM_CONFIG } from '@mos-lab/shared';

const { TextArea } = Input;

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

  // Determine active & overdue system windows
  let isActive = false;
  let isOverdue = false;

  if (days !== null && days !== undefined) {
    if (touchpointKey === '24h') {
      isActive = days === 1;
      isOverdue = days > 1 && !isChecked && !rawStatus;
    } else if (touchpointKey === '17') {
      isActive = days >= 16 && days <= 17;
      isOverdue = days > 17 && !isChecked && !rawStatus;
    } else if (touchpointKey === '19') {
      isActive = days >= 18 && days <= 19;
      isOverdue = days > 19 && !isChecked && !rawStatus;
    } else if (touchpointKey === String(LASH_TOUCHUP_SYSTEM_CONFIG.SINGLE_CUSTOMER_MAX_DAYS)) {
      isActive = days >= 20 && days <= LASH_TOUCHUP_SYSTEM_CONFIG.SINGLE_CUSTOMER_MAX_DAYS;
      isOverdue = days > LASH_TOUCHUP_SYSTEM_CONFIG.SINGLE_CUSTOMER_MAX_DAYS && !isChecked && !rawStatus;
    } else if (touchpointKey === '23') {
      isActive = days >= 22 && days <= 23;
      isOverdue = days > 23 && !isChecked && !rawStatus;
    } else if (touchpointKey === String(LASH_TOUCHUP_SYSTEM_CONFIG.COMBO_CUSTOMER_MAX_DAYS)) {
      isActive = days >= 24 && days <= LASH_TOUCHUP_SYSTEM_CONFIG.COMBO_CUSTOMER_MAX_DAYS;
      isOverdue = days > LASH_TOUCHUP_SYSTEM_CONFIG.COMBO_CUSTOMER_MAX_DAYS && !isChecked && !rawStatus;
    } else if (touchpointKey === '30') {
      isActive = days >= 29 && days <= 30;
      isOverdue = days > 30 && !isChecked && !rawStatus;
    } else if (touchpointKey === '30plus') {
      isActive = days > 30;
      isOverdue = false;
    }
  }

  // Resolve display state priority: DB status -> System active -> Pending window -> Overdue -> Blank
  let displayStatus: TouchpointStatus | 'OVERDUE' | 'BLANK' = 'BLANK';

  if (rawStatus) {
    displayStatus = rawStatus;
  } else if (isActive) {
    displayStatus = 'DUE_TODAY';
  } else if (days !== null && days !== undefined && days < targetDays) {
    displayStatus = 'PENDING';
  } else if (isOverdue) {
    displayStatus = 'OVERDUE';
  }

  const handleCellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;
    setPopoverOpen((prev) => !prev);
  };

  const handleSelectStatus = (status: TouchpointStatus | null) => {
    setSelectedStatus(status);
  };

  const handleSave = async (statusToSave?: TouchpointStatus | null, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLoading(true);
    const targetStatus = statusToSave !== undefined ? statusToSave : selectedStatus;
    const isNowChecked = targetStatus !== null;
    let finalNote = noteInput.trim();
    if (hasReferredDiamond && !finalNote.includes('💎')) {
      finalNote = finalNote ? `${finalNote} [Đã tư vấn CT Kim Cương 💎]` : '[Đã tư vấn CT Kim Cương 💎]';
    } else if (!hasReferredDiamond && finalNote.includes(' [Đã tư vấn CT Kim Cương 💎]')) {
      finalNote = finalNote.replace(' [Đã tư vấn CT Kim Cương 💎]', '');
    } else if (!hasReferredDiamond && finalNote.includes('[Đã tư vấn CT Kim Cương 💎]')) {
      finalNote = finalNote.replace('[Đã tư vấn CT Kim Cương 💎]', '');
    }
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

  // Tooltip content
  const renderTooltip = () => {
    if (displayStatus === 'DONE') {
      return (
        <div style={{ fontSize: '12px' }}>
          <div style={{ fontWeight: 700, color: '#34d399' }}>✅ Khách hàng đã hoàn tất dịch vụ</div>
          <div style={{ opacity: 0.9, marginTop: '2px' }}>Khách đã đến tiệm làm mi thành công sau {label}</div>
          {tpState?.conversionDetails?.convertedAt && (
            <div style={{ fontSize: '11px', opacity: 0.8 }}>
              Lúc: {dayjs(tpState.conversionDetails.convertedAt).format('DD/MM/YYYY HH:mm')}
            </div>
          )}
        </div>
      );
    }
    if (displayStatus === 'BOOKED') {
      return (
        <div style={{ fontSize: '12px' }}>
          <div style={{ fontWeight: 700, color: '#818cf8' }}>📅 Đã chuyển đổi Book (Tự động)</div>
          <div style={{ opacity: 0.9, marginTop: '2px' }}>Khách đã đặt lịch thành công sau {label}</div>
          {tpState?.conversionDetails?.convertedAt && (
            <div style={{ fontSize: '11px', opacity: 0.8 }}>
              Lúc: {dayjs(tpState.conversionDetails.convertedAt).format('DD/MM/YYYY HH:mm')}
            </div>
          )}
        </div>
      );
    }
    if (displayStatus === 'SUCCESS') {
      return (
        <div style={{ fontSize: '12px' }}>
          <div style={{ fontWeight: 700, color: '#34d399' }}>📞✓ Cuộc gọi thành công (Bởi {staffName})</div>
          {formattedDate && <div style={{ opacity: 0.85 }}>Thực hiện lúc: {formattedDate}</div>}
          {currentNote ? (
            <div
              style={{ marginTop: '4px', fontStyle: 'italic', borderTop: '1px dashed #ffffff44', paddingTop: '4px' }}
            >
              📝 Note: {currentNote}
            </div>
          ) : (
            <div style={{ marginTop: '2px', opacity: 0.75 }}>(Bấm để thay đổi trạng thái/ghi chú)</div>
          )}
        </div>
      );
    }
    if (displayStatus === 'MESSAGED') {
      return (
        <div style={{ fontSize: '12px' }}>
          <div style={{ fontWeight: 700, color: '#22d3ee' }}>💬✓ Nhắn tin thành công (Bởi {staffName})</div>
          {formattedDate && <div style={{ opacity: 0.85 }}>Thực hiện lúc: {formattedDate}</div>}
          {currentNote ? (
            <div
              style={{ marginTop: '4px', fontStyle: 'italic', borderTop: '1px dashed #ffffff44', paddingTop: '4px' }}
            >
              📝 Note: {currentNote}
            </div>
          ) : (
            <div style={{ marginTop: '2px', opacity: 0.75 }}>(Bấm để thay đổi trạng thái/ghi chú)</div>
          )}
        </div>
      );
    }
    if (displayStatus === 'FAILED') {
      return (
        <div style={{ fontSize: '12px' }}>
          <div style={{ fontWeight: 700, color: '#f87171' }}>📞❌ Cuộc gọi thất bại / không liên lạc được</div>
          {formattedDate && (
            <div style={{ opacity: 0.85 }}>
              Bởi: {staffName} ({formattedDate})
            </div>
          )}
          {currentNote && <div style={{ marginTop: '4px', fontStyle: 'italic' }}>📝 Note: {currentNote}</div>}
        </div>
      );
    }
    if (displayStatus === 'CALLBACK') {
      const formattedCbDate = customer.callbackDate
        ? dayjs(customer.callbackDate).format('DD/MM/YYYY')
        : callbackDate.format('DD/MM/YYYY');
      return (
        <div style={{ fontSize: '12px' }}>
          <div style={{ fontWeight: 700, color: '#c084fc' }}>🕒 Hẹn gọi lại: {formattedCbDate} (Daily Plan)</div>
          {formattedDate && (
            <div style={{ opacity: 0.85 }}>
              Bởi {staffName} ({formattedDate})
            </div>
          )}
          {currentNote ? (
            <div
              style={{ marginTop: '4px', fontStyle: 'italic', borderTop: '1px dashed #ffffff44', paddingTop: '4px' }}
            >
              📝 Note: {currentNote}
            </div>
          ) : (
            <div style={{ marginTop: '2px', opacity: 0.75 }}>(Bấm để thay đổi trạng thái/ngày hẹn)</div>
          )}
        </div>
      );
    }
    if (displayStatus === 'LOST') {
      return (
        <div style={{ fontSize: '12px' }}>
          <div style={{ fontWeight: 700, color: '#f43f5e' }}>💔 Không thuộc về nhau (Khách từ chối/hủy)</div>
          {formattedDate && (
            <div style={{ opacity: 0.85 }}>
              Bởi: {staffName} ({formattedDate})
            </div>
          )}
          {currentNote && <div style={{ marginTop: '4px', fontStyle: 'italic' }}>📝 Note: {currentNote}</div>}
        </div>
      );
    }
    if (displayStatus === 'DUE_TODAY') {
      return <span style={{ color: '#fbbf24' }}>🔔 Đến hạn Chạm hôm nay ({days} ngày - Bấm để chọn trạng thái)</span>;
    }
    if (displayStatus === 'PENDING') {
      return <span style={{ color: '#94a3b8' }}>⏳ Đang chờ (Touchpoint {label} chưa tới ngày)</span>;
    }
    if (displayStatus === 'OVERDUE') {
      return <span style={{ color: '#f87171' }}>Trễ chạm ({days} ngày chưa tới - Bấm để chọn)</span>;
    }
    return <span>Bấm để cập nhật trạng thái {label}</span>;
  };

  const isDark = themeMode === 'dark';

  const popoverContent = (
    <div style={{ width: 260 }} onClick={(e) => e.stopPropagation()}>
      <div
        style={{
          fontWeight: 700,
          marginBottom: 10,
          fontSize: '13px',
          color: isDark ? '#fbbf24' : '#d97706',
        }}
      >
        ✨ Chọn trạng thái {label} ({customer.name})
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: 10 }}>
        {/* 1. Gọi thành công */}
        <button
          type="button"
          onClick={() => handleSelectStatus('SUCCESS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            border:
              selectedStatus === 'SUCCESS' ? '2px solid #10b981' : isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            background:
              selectedStatus === 'SUCCESS' ? (isDark ? '#064e3b' : '#ecfdf5') : isDark ? '#1e293b' : '#f8fafc',
            color: selectedStatus === 'SUCCESS' ? (isDark ? '#34d399' : '#047857') : isDark ? '#e2e8f0' : '#1e293b',
            transition: 'all 0.15s ease',
          }}
        >
          <PhoneCall size={14} className="text-emerald-500" />
          <span>Gọi thành công</span>
        </button>

        {/* 2. Gọi thất bại */}
        <button
          type="button"
          onClick={() => handleSelectStatus('FAILED')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            border:
              selectedStatus === 'FAILED' ? '2px solid #ef4444' : isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            background: selectedStatus === 'FAILED' ? (isDark ? '#7f1d1d' : '#fef2f2') : isDark ? '#1e293b' : '#f8fafc',
            color: selectedStatus === 'FAILED' ? (isDark ? '#fca5a5' : '#b91c1c') : isDark ? '#e2e8f0' : '#1e293b',
            transition: 'all 0.15s ease',
          }}
        >
          <PhoneOff size={14} className="text-rose-500" />
          <span>Gọi thất bại</span>
        </button>

        {/* 3. Nhắn tin thành công */}
        <button
          type="button"
          onClick={() => handleSelectStatus('MESSAGED')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            border:
              selectedStatus === 'MESSAGED' ? '2px solid #06b6d4' : isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            background:
              selectedStatus === 'MESSAGED' ? (isDark ? '#164e63' : '#ecfeff') : isDark ? '#1e293b' : '#f8fafc',
            color: selectedStatus === 'MESSAGED' ? (isDark ? '#67e8f9' : '#0891b2') : isDark ? '#e2e8f0' : '#1e293b',
            transition: 'all 0.15s ease',
          }}
        >
          <MessageSquare size={14} className="text-cyan-500" />
          <span>Nhắn tin thành công</span>
        </button>

        {/* 4. Hẹn gọi lại */}
        <button
          type="button"
          onClick={() => handleSelectStatus('CALLBACK')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            border:
              selectedStatus === 'CALLBACK' ? '2px solid #a855f7' : isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            background:
              selectedStatus === 'CALLBACK' ? (isDark ? '#581c87' : '#f3e8ff') : isDark ? '#1e293b' : '#f8fafc',
            color: selectedStatus === 'CALLBACK' ? (isDark ? '#c084fc' : '#7e22ce') : isDark ? '#e2e8f0' : '#1e293b',
            transition: 'all 0.15s ease',
          }}
        >
          <Clock size={14} className="text-purple-500" />
          <span>Hẹn gọi lại (Lên lịch gọi)</span>
        </button>

        {/* 5. Đã đặt lịch */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleSave('BOOKED', e);
            if (onOpenBooking) {
              onOpenBooking(customer);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            border:
              selectedStatus === 'BOOKED' ? '2px solid #6366f1' : isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            background: selectedStatus === 'BOOKED' ? (isDark ? '#312e81' : '#e0e7ff') : isDark ? '#1e293b' : '#f8fafc',
            color: selectedStatus === 'BOOKED' ? (isDark ? '#a5b4fc' : '#4338ca') : isDark ? '#e2e8f0' : '#1e293b',
            transition: 'all 0.15s ease',
          }}
        >
          <CalendarCheck size={14} className="text-indigo-500" />
          <span>Đã đặt lịch</span>
        </button>

        {/* 6. Không thuộc về nhau */}
        <button
          type="button"
          onClick={() => handleSelectStatus('LOST')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            border:
              selectedStatus === 'LOST' ? '2px solid #f43f5e' : isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            background: selectedStatus === 'LOST' ? (isDark ? '#881337' : '#fff1f2') : isDark ? '#1e293b' : '#f8fafc',
            color: selectedStatus === 'LOST' ? (isDark ? '#fda4af' : '#be123c') : isDark ? '#e2e8f0' : '#1e293b',
            transition: 'all 0.15s ease',
          }}
        >
          <HeartOff size={14} className="text-pink-500" />
          <span>Không thuộc về nhau</span>
        </button>
      </div>

      {/* DatePicker expandable section for CALLBACK status */}
      {selectedStatus === 'CALLBACK' && (
        <div
          style={{
            padding: '8px',
            borderRadius: '6px',
            marginBottom: '10px',
            background: isDark ? 'rgba(168, 85, 247, 0.12)' : '#faf5ff',
            border: isDark ? '1px solid #581c87' : '1px solid #e9d5ff',
          }}
        >
          <div
            style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#c084fc' : '#7e22ce', marginBottom: '6px' }}
          >
            📅 Chọn ngày hẹn gọi lại (Tự lên Daily Plan):
          </div>
          <DatePicker
            value={callbackDate}
            onChange={(date) => date && setCallbackDate(date)}
            format="DD/MM/YYYY"
            style={{ width: '100%', marginBottom: '6px' }}
            size="small"
            allowClear={false}
          />
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <Button
              size="small"
              style={{ fontSize: '10px', padding: '0 6px', height: '22px' }}
              onClick={() => setCallbackDate(dayjs())}
            >
              Hôm nay
            </Button>
            <Button
              size="small"
              style={{ fontSize: '10px', padding: '0 6px', height: '22px' }}
              onClick={() => setCallbackDate(dayjs().add(1, 'day'))}
            >
              Ngày mai
            </Button>
            <Button
              size="small"
              style={{ fontSize: '10px', padding: '0 6px', height: '22px' }}
              onClick={() => setCallbackDate(dayjs().add(3, 'day'))}
            >
              3 ngày
            </Button>
            <Button
              size="small"
              style={{ fontSize: '10px', padding: '0 6px', height: '22px' }}
              onClick={() => setCallbackDate(dayjs().add(7, 'day'))}
            >
              7 ngày
            </Button>
          </div>
        </div>
      )}

      {/* Diamond Referral Toggle Button */}
      <div
        onClick={() => setHasReferredDiamond(!hasReferredDiamond)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          border: hasReferredDiamond ? '1.5px solid #06b6d4' : isDark ? '1px dashed #334155' : '1px dashed #cbd5e1',
          background: hasReferredDiamond
            ? isDark
              ? 'rgba(6,182,212,0.15)'
              : '#ecfeff'
            : isDark
              ? '#0f172a'
              : '#f8fafc',
          color: hasReferredDiamond ? (isDark ? '#22d3ee' : '#0891b2') : isDark ? '#94a3b8' : '#64748b',
          transition: 'all 0.2s ease',
          marginBottom: '8px',
        }}
        className="user-select-none hover:opacity-90"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px' }}>💎</span>
          <span>Đã tư vấn CT Kim Cương</span>
        </div>
        <input
          type="checkbox"
          checked={hasReferredDiamond}
          onChange={() => {}}
          style={{ accentColor: '#0891b2', cursor: 'pointer' }}
        />
      </div>

      <TextArea
        rows={2}
        value={noteInput}
        onChange={(e) => setNoteInput(e.target.value)}
        placeholder="Nhập ghi chú (không bắt buộc)..."
        size="small"
        style={{ marginBottom: 10 }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button size="small" type="text" danger loading={loading} onClick={handleReset} icon={<RotateCcw size={12} />}>
          Trở về mặc định
        </Button>
        <Button
          size="small"
          type="primary"
          loading={loading}
          onClick={(e) => handleSave(selectedStatus, e)}
          style={{ backgroundColor: '#D4A84B', borderColor: '#D4A84B', color: '#000', fontWeight: 600 }}
        >
          Lưu
        </Button>
      </div>
    </div>
  );

  // Modern Glassmorphic Pill styling with state glow
  let bg = 'transparent';
  let border = 'none';
  let textColor = isDark ? '#64748b' : '#94a3b8';
  let boxShadow = 'none';

  if (displayStatus === 'DONE') {
    bg = isDark ? 'rgba(5, 150, 105, 0.35)' : 'rgba(16, 185, 129, 0.2)';
    border = '1px solid #34d399';
    textColor = '#6ee7b7';
    boxShadow = '0 0 10px rgba(5, 150, 105, 0.6)';
  } else if (displayStatus === 'BOOKED') {
    bg = isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.18)';
    border = '1px solid #818cf8';
    textColor = '#a5b4fc';
    boxShadow = '0 0 10px rgba(99, 102, 241, 0.5)';
  } else if (displayStatus === 'SUCCESS') {
    bg = isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.15)';
    border = '1px solid #10b981';
    textColor = '#34d399';
    boxShadow = '0 0 8px rgba(16, 185, 129, 0.4)';
  } else if (displayStatus === 'CALLBACK') {
    bg = isDark ? 'rgba(168, 85, 247, 0.25)' : 'rgba(168, 85, 247, 0.15)';
    border = '1px solid #a855f7';
    textColor = '#c084fc';
    boxShadow = '0 0 8px rgba(168, 85, 247, 0.4)';
  } else if (displayStatus === 'MESSAGED') {
    bg = isDark ? 'rgba(6, 182, 212, 0.25)' : 'rgba(6, 182, 212, 0.15)';
    border = '1px solid #06b6d4';
    textColor = '#22d3ee';
    boxShadow = '0 0 8px rgba(6, 182, 212, 0.4)';
  } else if (displayStatus === 'FAILED') {
    bg = isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.15)';
    border = '1px solid #ef4444';
    textColor = '#fca5a5';
    boxShadow = '0 0 8px rgba(239, 68, 68, 0.4)';
  } else if (displayStatus === 'LOST') {
    bg = isDark ? 'rgba(244, 63, 94, 0.25)' : 'rgba(244, 63, 94, 0.15)';
    border = '1px solid #f43f5e';
    textColor = '#fda4af';
    boxShadow = '0 0 8px rgba(244, 63, 94, 0.35)';
  } else if (displayStatus === 'DUE_TODAY') {
    bg = isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.18)';
    border = '1.5px solid #f59e0b';
    textColor = '#fbbf24';
    boxShadow = '0 0 12px rgba(245, 158, 11, 0.6)';
  } else if (displayStatus === 'PENDING') {
    bg = isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(241, 245, 249, 0.6)';
    border = '1px solid rgba(148, 163, 184, 0.25)';
    textColor = '#94a3b8';
  } else if (displayStatus === 'OVERDUE') {
    bg = isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2';
    border = '1px dashed #ef4444';
    textColor = isDark ? '#fca5a5' : '#ef4444';
  }

  const renderPillIcon = () => {
    if (displayStatus === 'DONE') return <CheckCircle2 size={13} className="text-emerald-400" />;
    if (displayStatus === 'BOOKED') return <CalendarCheck size={13} className="text-indigo-400" />;
    if (displayStatus === 'SUCCESS') return <PhoneCall size={12} className="text-emerald-400" />;
    if (displayStatus === 'CALLBACK') return <Clock size={12} className="text-purple-400" />;
    if (displayStatus === 'MESSAGED') return <MessageSquare size={12} className="text-cyan-400" />;
    if (displayStatus === 'FAILED') return <PhoneOff size={12} className="text-rose-400" />;
    if (displayStatus === 'LOST') return <HeartOff size={12} className="text-pink-400" />;
    if (displayStatus === 'DUE_TODAY') return <BellRing size={13} className="text-amber-400 animate-pulse" />;
    if (displayStatus === 'OVERDUE') return <Hourglass size={12} className="text-rose-400 opacity-80" />;
    return <Hourglass size={12} className="text-slate-400 opacity-60" />;
  };

  return (
    <Popover
      content={popoverContent}
      title={null}
      trigger="click"
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      placement="bottom"
    >
      <Tooltip title={popoverOpen ? '' : renderTooltip()} placement="top">
        <div
          onClick={handleCellClick}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '24px',
            borderRadius: '6px',
            cursor: loading ? 'wait' : 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            background: bg,
            border: border,
            color: textColor,
            boxShadow: boxShadow,
            userSelect: 'none',
            overflow: 'visible',
          }}
        >
          {/* Main Status Icon */}
          {renderPillIcon()}

          {/* Top-Right Corner Diamond Badge */}
          {hasReferredDiamond && (
            <span
              style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                fontSize: '11px',
                lineHeight: 1,
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
                zIndex: 2,
              }}
              title="Đã tư vấn Chương Trình Kim Cương"
            >
              💎
            </span>
          )}

          {/* Bottom-Left Corner Note Indicator */}
          {currentNote && (
            <span
              style={{
                position: 'absolute',
                bottom: '-4px',
                left: '-4px',
                fontSize: '9px',
                lineHeight: 1,
                color: isDark ? '#fbbf24' : '#d97706',
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                borderRadius: '50%',
                width: '12px',
                height: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                zIndex: 2,
              }}
              title={`Ghi chú: ${currentNote}`}
            >
              <FileTextOutlined style={{ fontSize: '8px', color: isDark ? '#fbbf24' : '#d97706' }} />
            </span>
          )}
        </div>
      </Tooltip>
    </Popover>
  );
};
