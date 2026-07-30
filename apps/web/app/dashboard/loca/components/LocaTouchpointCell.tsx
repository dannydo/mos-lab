'use client';

import React, { useState, useEffect } from 'react';
import { Popover, Input, Button, Tooltip, Space } from 'antd';
import { EditOutlined, FileTextOutlined, CheckOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Customer, LocaTouchpointState, SafeAny } from '@mos-lab/shared';

const { TextArea } = Input;

interface LocaTouchpointCellProps {
  customer: Customer;
  touchpointKey: string;
  label: string;
  targetDays: number;
  themeMode: 'light' | 'dark';
  onToggle: (customerId: number, touchpointKey: string, isChecked: boolean, note?: string) => Promise<void>;
}

export const LocaTouchpointCell: React.FC<LocaTouchpointCellProps> = ({
  customer,
  touchpointKey,
  label,
  targetDays,
  themeMode,
  onToggle,
}) => {
  const tpState: LocaTouchpointState | undefined = customer.touchpoints?.[touchpointKey];
  const isChecked = !!tpState?.isChecked;
  const currentNote = tpState?.note || '';

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [noteInput, setNoteInput] = useState(currentNote);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNoteInput(currentNote);
  }, [currentNote]);

  const days = customer.daysSinceLastVisit;

  // Determine if this touchpoint is ACTIVE for this customer right now
  let isActive = false;
  let isOverdue = false;

  if (days !== null && days !== undefined) {
    if (touchpointKey === '24h') {
      isActive = days === 1;
      isOverdue = days > 1 && !isChecked;
    } else if (touchpointKey === '17') {
      isActive = days >= 16 && days <= 17;
      isOverdue = days > 17 && !isChecked;
    } else if (touchpointKey === '19') {
      isActive = days >= 18 && days <= 19;
      isOverdue = days > 19 && !isChecked;
    } else if (touchpointKey === '21') {
      isActive = days >= 20 && days <= 21;
      isOverdue = days > 21 && !isChecked;
    } else if (touchpointKey === '23') {
      isActive = days >= 22 && days <= 23;
      isOverdue = days > 23 && !isChecked;
    } else if (touchpointKey === '25') {
      isActive = days >= 24 && days <= 25;
      isOverdue = days > 25 && !isChecked;
    } else if (touchpointKey === '30') {
      isActive = days >= 29 && days <= 30;
      isOverdue = days > 30 && !isChecked;
    } else if (touchpointKey === '30plus') {
      isActive = days > 30;
      isOverdue = false;
    }
  }

  const handleCellClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;

    if (!isChecked) {
      // Unchecked -> Check it and open Popover to input note
      setLoading(true);
      try {
        await onToggle(customer.id, touchpointKey, true, currentNote);
        setPopoverOpen(true);
      } finally {
        setLoading(false);
      }
    } else {
      // Already checked -> Toggle Popover note editor
      setPopoverOpen((prev) => !prev);
    }
  };

  const handleSaveNote = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLoading(true);
    try {
      await onToggle(customer.id, touchpointKey, isChecked, noteInput);
      setPopoverOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleUncheck = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await onToggle(customer.id, touchpointKey, false, '');
      setPopoverOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = tpState?.checkedAt ? dayjs(tpState.checkedAt).format('DD/MM/YYYY HH:mm') : null;
  const staffName = tpState?.checkedByStaffName || 'Staff';

  const tooltipTitle = isChecked ? (
    <div style={{ fontSize: '12px' }}>
      <div style={{ fontWeight: 600, color: '#34d399' }}>✓ Đã chạm bởi {staffName}</div>
      {formattedDate && <div style={{ opacity: 0.85 }}>Lúc: {formattedDate}</div>}
      {currentNote ? (
        <div style={{ marginTop: '4px', fontStyle: 'italic', borderTop: '1px dashed #ffffff44', paddingTop: '4px' }}>
          📝 Note: {currentNote}
        </div>
      ) : (
        <div style={{ marginTop: '2px', opacity: 0.75 }}>(Bấm để sửa/thêm ghi chú)</div>
      )}
    </div>
  ) : isOverdue ? (
    <span style={{ color: '#f87171' }}>Trễ chạm ({days} ngày chưa tới - Bấm để chạm)</span>
  ) : isActive ? (
    <span style={{ color: '#fbbf24' }}>Đang đến hạn Chạm hôm nay ({days} ngày - Bấm để chạm)</span>
  ) : (
    <span>Bấm để đánh dấu {label}</span>
  );

  const popoverContent = (
    <div style={{ width: 240 }} onClick={(e) => e.stopPropagation()}>
      <div
        style={{
          fontWeight: 600,
          marginBottom: 8,
          fontSize: '13px',
          color: themeMode === 'dark' ? '#fbbf24' : '#d97706',
        }}
      >
        📝 Ghi chú {label} ({customer.name})
      </div>
      <TextArea
        rows={3}
        value={noteInput}
        onChange={(e) => setNoteInput(e.target.value)}
        placeholder="Nhập phản hồi/ghi chú của khách..."
        size="small"
        style={{ marginBottom: 8 }}
        autoFocus
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {isChecked ? (
          <Button size="small" type="text" danger loading={loading} onClick={handleUncheck}>
            Bỏ chọn
          </Button>
        ) : (
          <Button size="small" type="text" onClick={() => setPopoverOpen(false)}>
            Hủy
          </Button>
        )}
        <Button
          size="small"
          type="primary"
          loading={loading}
          onClick={handleSaveNote}
          style={{ backgroundColor: '#D4A84B', borderColor: '#D4A84B', color: '#000' }}
        >
          Lưu Note
        </Button>
      </div>
    </div>
  );

  // Dynamic high-contrast pill styling
  const isDark = themeMode === 'dark';

  let bg = isDark ? '#1e293b' : '#f1f5f9';
  let border = isDark ? '1px solid #475569' : '1px solid #cbd5e1';
  let textColor = isDark ? '#94a3b8' : '#64748b';
  let boxShadow = 'none';

  if (isChecked) {
    bg = isDark ? '#059669' : '#10b981';
    border = '1px solid #34d399';
    textColor = '#ffffff';
    boxShadow = isDark ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none';
  } else if (isActive) {
    bg = isDark ? '#d4a84b' : '#f59e0b';
    border = isDark ? '2px solid #fbbf24' : '2px solid #d97706';
    textColor = '#000000';
    boxShadow = isDark ? '0 0 10px rgba(212, 168, 75, 0.7)' : '0 0 6px rgba(245, 158, 11, 0.5)';
  } else if (isOverdue) {
    bg = isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2';
    border = '1px dashed #ef4444';
    textColor = isDark ? '#fca5a5' : '#ef4444';
  }

  return (
    <Popover
      content={popoverContent}
      title={null}
      trigger="click"
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      placement="bottom"
    >
      <Tooltip title={popoverOpen ? '' : tooltipTitle} placement="top">
        <div
          onClick={handleCellClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '24px',
            borderRadius: '5px',
            cursor: loading ? 'wait' : 'pointer',
            transition: 'all 0.15s ease-in-out',
            background: bg,
            border: border,
            color: textColor,
            boxShadow: boxShadow,
            fontWeight: 700,
            fontSize: '12px',
            userSelect: 'none',
          }}
        >
          <Space size={2} align="center">
            {isChecked ? (
              <CheckOutlined style={{ fontSize: '12px', color: '#fff', strokeWidth: 3 }} />
            ) : isActive ? (
              <span style={{ fontSize: '10px', color: '#000', fontWeight: 900 }}>!</span>
            ) : (
              <span style={{ fontSize: '10px', opacity: 0.6 }}>•</span>
            )}

            {currentNote && (
              <FileTextOutlined
                style={{
                  color: isChecked ? '#fff' : '#D4A84B',
                  fontSize: '11px',
                }}
              />
            )}
          </Space>
        </div>
      </Tooltip>
    </Popover>
  );
};
