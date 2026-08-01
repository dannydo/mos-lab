'use client';

import React, { useState, useEffect } from 'react';
import { Popover, Input, Button, Tooltip, Space } from 'antd';
import { FileTextOutlined, CheckOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { TextArea } = Input;

export interface CampaignTouchpointItem {
  id: number;
  key: string;
  label: string;
  daysMin?: number;
  daysMax?: number | null;
}

export interface CampaignTouchpointCellProps {
  customer: any;
  touchpoint: CampaignTouchpointItem;
  themeMode: 'light' | 'dark';
  onToggle: (customerId: number, touchpointId: number, isChecked: boolean, note?: string) => Promise<void>;
}

export const CampaignTouchpointCell: React.FC<CampaignTouchpointCellProps> = ({
  customer,
  touchpoint,
  themeMode,
  onToggle,
}) => {
  // Find log entry matching this touchpoint
  const tpLog = (customer.touchpointLogs || []).find(
    (log: any) => log.touchpointId === touchpoint.id || log.touchpointKey === touchpoint.key
  );

  const isChecked = !!tpLog?.isChecked;
  const currentNote = tpLog?.note || '';

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [noteInput, setNoteInput] = useState(currentNote);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNoteInput(currentNote);
  }, [currentNote]);

  const days = customer.daysInCampaign ?? customer.daysSinceLastVisit ?? customer.daysSinceAdded ?? 0;
  const tpKey = touchpoint.key;

  // Determine if this touchpoint is ACTIVE or OVERDUE for this customer
  let isActive = false;
  let isOverdue = false;

  if (tpKey === '24h') {
    isActive = days === 1;
    isOverdue = days > 1 && !isChecked;
  } else if (tpKey === '17' || tpKey === '17d') {
    isActive = days >= 16 && days <= 17;
    isOverdue = days > 17 && !isChecked;
  } else if (tpKey === '19' || tpKey === '19d') {
    isActive = days >= 18 && days <= 19;
    isOverdue = days > 19 && !isChecked;
  } else if (tpKey === '21' || tpKey === '21d') {
    isActive = days >= 20 && days <= 21;
    isOverdue = days > 21 && !isChecked;
  } else if (tpKey === '23' || tpKey === '23d') {
    isActive = days >= 22 && days <= 23;
    isOverdue = days > 23 && !isChecked;
  } else if (tpKey === '25' || tpKey === '25d') {
    isActive = days >= 24 && days <= 25;
    isOverdue = days > 25 && !isChecked;
  } else if (tpKey === '30' || tpKey === '30d') {
    isActive = days >= 29 && days <= 30;
    isOverdue = days > 30 && !isChecked;
  } else if (tpKey === '30plus' || tpKey === '30dplus') {
    isActive = days > 30;
    isOverdue = false;
  } else if (touchpoint.daysMin !== undefined) {
    const min = touchpoint.daysMin;
    const max = touchpoint.daysMax;
    if (max !== null && max !== undefined) {
      isActive = days >= min && days <= max;
      isOverdue = days > max && !isChecked;
    } else {
      isActive = days >= min;
      isOverdue = false;
    }
  }

  const customerId = customer.legacyUserId || customer.id;

  const handleCellClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;

    if (!isChecked) {
      // Unchecked -> Check it and open Popover to input note
      setLoading(true);
      try {
        await onToggle(customerId, touchpoint.id, true, currentNote);
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
      await onToggle(customerId, touchpoint.id, isChecked, noteInput);
      setPopoverOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleUncheck = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await onToggle(customerId, touchpoint.id, false, '');
      setPopoverOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = tpLog?.completedAt ? dayjs(tpLog.completedAt).format('DD/MM/YYYY HH:mm') : null;
  const staffName = tpLog?.completedByStaffName || 'Staff';
  const labelText = touchpoint.label || `Chạm ${touchpoint.key}`;
  const customerName = customer.customerName || customer.name || `Khách hàng #${customerId}`;

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
    <span style={{ color: '#f87171' }}>Trễ chạm ({days} ngày - Bấm để chạm)</span>
  ) : isActive ? (
    <span style={{ color: '#fbbf24' }}>Đang đến hạn Chạm ({days} ngày - Bấm để chạm)</span>
  ) : (
    <span>Bấm để đánh dấu {labelText}</span>
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
        📝 Ghi chú {labelText} ({customerName})
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
            width: '26px',
            height: '20px',
            borderRadius: '4px',
            cursor: loading ? 'wait' : 'pointer',
            transition: 'all 0.15s ease-in-out',
            background: bg,
            border: border,
            color: textColor,
            boxShadow: boxShadow,
            fontWeight: 700,
            fontSize: '11px',
            userSelect: 'none',
          }}
        >
          <Space size={1} align="center">
            {isChecked ? (
              <CheckOutlined style={{ fontSize: '10px', color: '#fff', strokeWidth: 3 }} />
            ) : isActive ? (
              <span style={{ fontSize: '9px', color: '#000', fontWeight: 900 }}>!</span>
            ) : (
              <span style={{ fontSize: '9px', opacity: 0.6 }}>•</span>
            )}

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
