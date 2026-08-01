'use client';

import React, { useState, useEffect } from 'react';
import { Popover, Input, Button, Tooltip, Space } from 'antd';
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
} from 'lucide-react';
import dayjs from 'dayjs';
import { TouchpointStatus } from '@mos-lab/shared';

const { TextArea } = Input;

export interface CampaignTouchpointItem {
  id: number;
  key: string;
  label: string;
  daysMin?: number;
  daysMax?: number | null;
  sortOrder?: number;
}

export interface CampaignTouchpointCellProps {
  customer: any;
  touchpoint: CampaignTouchpointItem;
  themeMode: 'light' | 'dark';
  onToggle: (
    customerId: number,
    touchpointId: number,
    isChecked: boolean,
    note?: string,
    status?: TouchpointStatus | null
  ) => Promise<void>;
  onOpenBooking?: (customer: any) => void;
}

export const CampaignTouchpointCell: React.FC<CampaignTouchpointCellProps> = ({
  customer,
  touchpoint,
  themeMode,
  onToggle,
  onOpenBooking,
}) => {
  // Find log entry matching this touchpoint
  const tpLog = (customer.touchpointLogs || []).find(
    (log: any) => log.touchpointId === touchpoint.id || log.touchpointKey === touchpoint.key
  );

  const isChecked = !!tpLog?.isChecked;
  const rawStatus: TouchpointStatus | null = tpLog?.status || (isChecked ? 'SUCCESS' : null);
  const currentNote = tpLog?.note || '';

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TouchpointStatus | null>(rawStatus);
  const [noteInput, setNoteInput] = useState(currentNote);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelectedStatus(rawStatus);
    setNoteInput(currentNote);
  }, [rawStatus, currentNote]);

  const days = customer.daysInCampaign ?? customer.daysSinceLastVisit ?? customer.daysSinceAdded ?? 0;
  const tpKey = touchpoint.key;

  // Determine active & overdue system windows
  let isActive = false;
  let isOverdue = false;

  if (tpKey === '24h') {
    isActive = days === 1;
    isOverdue = days > 1 && !isChecked && !rawStatus;
  } else if (tpKey === '17' || tpKey === '17d') {
    isActive = days >= 16 && days <= 17;
    isOverdue = days > 17 && !isChecked && !rawStatus;
  } else if (tpKey === '19' || tpKey === '19d') {
    isActive = days >= 18 && days <= 19;
    isOverdue = days > 19 && !isChecked && !rawStatus;
  } else if (tpKey === '21' || tpKey === '21d') {
    isActive = days >= 20 && days <= 21;
    isOverdue = days > 21 && !isChecked && !rawStatus;
  } else if (tpKey === '23' || tpKey === '23d') {
    isActive = days >= 22 && days <= 23;
    isOverdue = days > 23 && !isChecked && !rawStatus;
  } else if (tpKey === '25' || tpKey === '25d') {
    isActive = days >= 24 && days <= 25;
    isOverdue = days > 25 && !isChecked && !rawStatus;
  } else if (tpKey === '30' || tpKey === '30d') {
    isActive = days >= 29 && days <= 30;
    isOverdue = days > 30 && !isChecked && !rawStatus;
  } else if (tpKey === '30plus' || tpKey === '30dplus') {
    isActive = days > 30;
    isOverdue = false;
  } else if (touchpoint.daysMin !== undefined) {
    const min = touchpoint.daysMin;
    const max = touchpoint.daysMax;
    if (max !== null && max !== undefined) {
      isActive = days >= min && days <= max;
      isOverdue = days > max && !isChecked && !rawStatus;
    } else {
      isActive = days >= min;
      isOverdue = false;
    }
  }

  // Priority state resolution: DB status -> System active -> Pending window -> Overdue -> Blank
  let displayStatus: TouchpointStatus | 'OVERDUE' | 'BLANK' = 'BLANK';

  if (rawStatus === 'DONE' || rawStatus === 'BOOKED') {
    displayStatus = rawStatus;
  } else if (rawStatus === 'SUCCESS' || rawStatus === 'FAILED' || rawStatus === 'LOST') {
    displayStatus = rawStatus;
  } else if (isActive) {
    displayStatus = 'DUE_TODAY';
  } else if (touchpoint.daysMin !== undefined && days < touchpoint.daysMin) {
    displayStatus = 'PENDING';
  } else if (isOverdue) {
    displayStatus = 'OVERDUE';
  }

  const customerId = customer.legacyUserId || customer.id;
  const labelText = touchpoint.label || `Chạm ${touchpoint.key}`;
  const customerName = customer.customerName || customer.name || `Khách hàng #${customerId}`;

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
    try {
      await onToggle(customerId, touchpoint.id, isNowChecked, noteInput, targetStatus);
      setPopoverOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await onToggle(customerId, touchpoint.id, false, '', null);
      setSelectedStatus(null);
      setNoteInput('');
      setPopoverOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = tpLog?.completedAt ? dayjs(tpLog.completedAt).format('DD/MM HH:mm') : null;
  const staffName = tpLog?.completedByStaffName || 'Staff';

  const renderTooltip = () => {
    if (displayStatus === 'DONE') {
      return (
        <div style={{ fontSize: '12px' }}>
          <div style={{ fontWeight: 700, color: '#34d399' }}>✅ Khách hàng đã hoàn tất dịch vụ</div>
          <div style={{ opacity: 0.9, marginTop: '2px' }}>Khách đã đến tiệm làm mi thành công sau {labelText}</div>
          {tpLog?.conversionDetails?.convertedAt && (
            <div style={{ fontSize: '11px', opacity: 0.8 }}>
              Lúc: {dayjs(tpLog.conversionDetails.convertedAt).format('DD/MM/YYYY HH:mm')}
            </div>
          )}
        </div>
      );
    }
    if (displayStatus === 'BOOKED') {
      return (
        <div style={{ fontSize: '12px' }}>
          <div style={{ fontWeight: 700, color: '#818cf8' }}>📅 Đã chuyển đổi Book (Tự động)</div>
          <div style={{ opacity: 0.9, marginTop: '2px' }}>Khách đã đặt lịch thành công sau {labelText}</div>
          {tpLog?.conversionDetails?.convertedAt && (
            <div style={{ fontSize: '11px', opacity: 0.8 }}>
              Lúc: {dayjs(tpLog.conversionDetails.convertedAt).format('DD/MM/YYYY HH:mm')}
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
      return <span style={{ color: '#fbbf24' }}>🔔 Đến hạn Chạm ({days} ngày - Bấm để chọn trạng thái)</span>;
    }
    if (displayStatus === 'PENDING') {
      return <span style={{ color: '#94a3b8' }}>⏳ Đang chờ (Touchpoint {labelText} chưa tới ngày)</span>;
    }
    if (displayStatus === 'OVERDUE') {
      return <span style={{ color: '#f87171' }}>Trễ chạm ({days} ngày chưa tới - Bấm để chọn)</span>;
    }
    return <span>Bấm để cập nhật trạng thái {labelText}</span>;
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
        ✨ Chọn trạng thái {labelText} ({customerName})
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: 10 }}>
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
          <span>Hoàn tất (Gọi thành công)</span>
        </button>

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
          <span>Fail (Cuộc gọi thất bại)</span>
        </button>

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
          <span>Đã đặt lịch (Chuyển đổi Book)</span>
        </button>

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
    if (displayStatus === 'FAILED') return <PhoneOff size={12} className="text-rose-400" />;
    if (displayStatus === 'LOST') return <HeartOff size={12} className="text-pink-400" />;
    if (displayStatus === 'DUE_TODAY') return <BellRing size={13} className="text-amber-400 animate-pulse" />;
    if (displayStatus === 'PENDING') return <Hourglass size={12} className="text-slate-400 opacity-75" />;
    return <span style={{ fontSize: '12px', opacity: 0.25, color: textColor }}>•</span>;
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
          }}
        >
          <Space size={1} align="center">
            {renderPillIcon()}
            {currentNote && (
              <FileTextOutlined
                style={{
                  color: isChecked ? '#fff' : '#D4A84B',
                  fontSize: '9px',
                }}
              />
            )}
          </Space>
        </div>
      </Tooltip>
    </Popover>
  );
};
