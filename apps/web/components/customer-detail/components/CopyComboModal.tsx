'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Tag, Space, message, Tooltip } from 'antd';
import {
  CopyOutlined,
  SaveOutlined,
  ReloadOutlined,
  MessageOutlined,
  CompressOutlined,
  ExpandOutlined,
  FullscreenOutlined,
} from '@ant-design/icons';
import { AdaptiveModal } from '../../ui';

const { TextArea } = Input;

const DEFAULT_TEMPLATE = `Dạ Wings Lashes xin thông tin lại gói combo của chị {ten_khach}:
📌 Gói dịch vụ: {ten_combo}
• Nối mới (New): {noi_moi}
• Dặm mi (Refill): {dam_mi}
• Hạn sử dụng: {han_dung}
• Tư vấn viên: {cc_phu_trach}
Dạ chị nhớ ghé Wings làm dịch vụ đúng hạn nhé! 💖`;

interface CopyComboModalProps {
  open: boolean;
  onClose: () => void;
  customerName: string;
  combo: SafeAny;
  comboInfo: {
    totalNew: number;
    totalRefill: number;
  };
  themeMode: 'light' | 'dark';
}

export const CopyComboModal: React.FC<CopyComboModalProps> = ({
  open,
  onClose,
  customerName,
  combo,
  comboInfo,
  themeMode,
}) => {
  const [template, setTemplate] = useState<string>(DEFAULT_TEMPLATE);
  const [previewText, setPreviewText] = useState<string>('');
  const [modalWidth, setModalWidth] = useState<number>(600);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; width: number; direction: 'left' | 'right' } | null>(null);

  const [textareaHeight, setTextareaHeight] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load saved template, modal width & textarea height from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTemplate = localStorage.getItem('mos_combo_copy_template');
      if (savedTemplate) {
        setTemplate(savedTemplate);
      }
      const savedWidth = localStorage.getItem('customer_copy_combo_modal_width');
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed >= 480 && parsed <= 1200) {
          setModalWidth(parsed);
        }
      }
      const savedHeight = localStorage.getItem('mos_combo_copy_textarea_height');
      if (savedHeight) {
        const parsedH = parseInt(savedHeight, 10);
        if (!isNaN(parsedH) && parsedH >= 60 && parsedH <= 600) {
          setTextareaHeight(parsedH);
        }
      }
    }
  }, [open]);

  // Track and save textarea height resizing in localStorage
  useEffect(() => {
    if (!open) return;

    const rawRef = textareaRef.current as SafeAny;
    const el: HTMLElement | null =
      rawRef?.resizableTextArea?.textArea ||
      rawRef?.input ||
      rawRef?.nativeElement ||
      (rawRef instanceof HTMLElement ? rawRef : null);

    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const borderBoxHeight = Math.round(entry.borderBoxSize?.[0]?.blockSize || entry.contentRect.height);
        if (borderBoxHeight >= 60 && borderBoxHeight <= 600) {
          setTextareaHeight(borderBoxHeight);
          if (typeof window !== 'undefined') {
            localStorage.setItem('mos_combo_copy_textarea_height', String(borderBoxHeight));
          }
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  // Handle mouse drag to resize modal width dynamically
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const { x, width, direction } = dragStartRef.current;
      const deltaX = direction === 'right' ? e.clientX - x : x - e.clientX;
      const newWidth = Math.max(480, Math.min(1150, width + deltaX * 2));
      setModalWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      if (typeof window !== 'undefined') {
        localStorage.setItem('customer_copy_combo_modal_width', String(modalWidth));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, modalWidth]);

  // Quick width selection handler
  const handleWidthChange = (w: number) => {
    setModalWidth(w);
    if (typeof window !== 'undefined') {
      localStorage.setItem('customer_copy_combo_modal_width', String(w));
    }
  };

  // Compute actual values to replace tags
  const getReplacedValues = () => {
    if (!combo) return {};
    const comboName = `${combo.serviceName || ''} ${combo.packageKey ? `(${combo.packageKey})` : ''}`.trim();
    const expiryStr = combo.dateExpired ? new Date(combo.dateExpired).toLocaleDateString('vi-VN') : 'Không thời hạn';
    const newStr = `${combo.normalCount || 0}/${comboInfo?.totalNew || 0} buổi`;
    const refillStr = `${combo.retainCount || 0}/${comboInfo?.totalRefill || 0} buổi`;
    const ccStr = combo.creatorStaffName || 'Wings Lashes';
    const nameStr = customerName || 'Khách hàng';

    return {
      '{ten_khach}': nameStr,
      '{ten_combo}': comboName,
      '{noi_moi}': newStr,
      '{dam_mi}': refillStr,
      '{han_dung}': expiryStr,
      '{cc_phu_trach}': ccStr,
    };
  };

  // Update live preview when template or combo data changes
  useEffect(() => {
    if (!open) return;
    const values = getReplacedValues();
    let text = template;
    Object.entries(values).forEach(([tag, val]) => {
      text = text.replaceAll(tag, String(val));
    });
    setPreviewText(text);
  }, [template, combo, customerName, open]);

  // Insert variable tag into current template
  const handleInsertTag = (tag: string) => {
    setTemplate((prev) => `${prev} ${tag}`);
  };

  // Save template as default to localStorage
  const handleSaveDefault = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_combo_copy_template', template);
      message.success('Đã lưu mẫu tin nhắn mặc định!');
    }
  };

  // Reset template back to standard default
  const handleResetDefault = () => {
    setTemplate(DEFAULT_TEMPLATE);
    setTextareaHeight(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mos_combo_copy_template');
      localStorage.removeItem('mos_combo_copy_textarea_height');
    }
    message.info('Đã khôi phục mẫu tin nhắn mặc định.');
  };

  // Copy final preview text to clipboard
  const handleCopyText = () => {
    if (!previewText) return;
    navigator.clipboard.writeText(previewText);
    message.success('Đã sao chép thông tin gói Combo vào bộ nhớ tạm!');
    onClose();
  };

  const availableTags = [
    { label: 'Tên KH', tag: '{ten_khach}', color: 'orange' },
    { label: 'Tên Combo', tag: '{ten_combo}', color: 'blue' },
    { label: 'Nối mới', tag: '{noi_moi}', color: 'gold' },
    { label: 'Dặm mi', tag: '{dam_mi}', color: 'cyan' },
    { label: 'Hạn dùng', tag: '{han_dung}', color: 'red' },
    { label: 'Tư vấn viên', tag: '{cc_phu_trach}', color: 'purple' },
  ];

  const handleDragStart = (e: React.MouseEvent, direction: 'left' | 'right') => {
    e.preventDefault();
    dragStartRef.current = {
      x: e.clientX,
      width: modalWidth,
      direction,
    };
    setIsDragging(true);
  };

  return (
    <AdaptiveModal
      intent="form"
      className="customer-copy-combo-overlay"
      open={open}
      onCancel={onClose}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '28px' }}>
          <Space size="middle">
            <MessageOutlined style={{ color: '#fa8c16' }} />
            <span>Sao chép thông tin Gói Combo gửi Khách hàng</span>
          </Space>
          <Space size={4}>
            <Tooltip title="Kích thước Vừa (520px)">
              <Button
                size="small"
                type={modalWidth === 520 ? 'primary' : 'text'}
                icon={<CompressOutlined style={{ fontSize: '13px' }} />}
                onClick={() => handleWidthChange(520)}
                style={{
                  width: '26px',
                  height: '26px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: modalWidth === 520 ? '#fa8c16' : undefined,
                  borderColor: modalWidth === 520 ? '#fa8c16' : undefined,
                }}
              />
            </Tooltip>
            <Tooltip title="Kích thước Rộng (700px)">
              <Button
                size="small"
                type={modalWidth === 700 ? 'primary' : 'text'}
                icon={<ExpandOutlined style={{ fontSize: '13px' }} />}
                onClick={() => handleWidthChange(700)}
                style={{
                  width: '26px',
                  height: '26px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: modalWidth === 700 ? '#fa8c16' : undefined,
                  borderColor: modalWidth === 700 ? '#fa8c16' : undefined,
                }}
              />
            </Tooltip>
            <Tooltip title="Kích thước Lớn (900px)">
              <Button
                size="small"
                type={modalWidth === 900 ? 'primary' : 'text'}
                icon={<FullscreenOutlined style={{ fontSize: '13px' }} />}
                onClick={() => handleWidthChange(900)}
                style={{
                  width: '26px',
                  height: '26px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: modalWidth === 900 ? '#fa8c16' : undefined,
                  borderColor: modalWidth === 900 ? '#fa8c16' : undefined,
                }}
              />
            </Tooltip>
          </Space>
        </div>
      }
      footer={[
        <Tooltip key="reset" title="Khôi phục mẫu mặc định">
          <Button icon={<ReloadOutlined />} onClick={handleResetDefault} style={{ float: 'left' }} />
        </Tooltip>,
        <Tooltip key="save" title="Lưu mẫu làm mặc định">
          <Button icon={<SaveOutlined />} onClick={handleSaveDefault} />
        </Tooltip>,
        <Tooltip key="copy" title="Sao chép tin nhắn (1-click)">
          <Button
            type="primary"
            icon={<CopyOutlined />}
            onClick={handleCopyText}
            style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
          />
        </Tooltip>,
      ]}
      width={modalWidth}
      styles={{
        content: {
          backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
          color: themeMode === 'dark' ? '#f1f5f9' : '#1e293b',
          position: 'relative',
          transition: isDragging ? 'none' : 'width 0.2s ease',
        },
        header: {
          backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
          color: themeMode === 'dark' ? '#f1f5f9' : '#1e293b',
        },
      }}
    >
      {/* Corner Resizing Drag Handles (Bottom-Right & Bottom-Left) */}
      <Tooltip title="Kéo góc để điều chỉnh kích thước Modal">
        <div
          onMouseDown={(e) => handleDragStart(e, 'right')}
          style={{
            position: 'absolute',
            right: '4px',
            bottom: '4px',
            width: '16px',
            height: '16px',
            cursor: 'nwse-resize',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.6,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M9 1L1 9M9 5L5 9M9 9H9.01"
              stroke={themeMode === 'dark' ? '#94a3b8' : '#64748b'}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </Tooltip>

      <Tooltip title="Kéo góc để điều chỉnh kích thước Modal">
        <div
          onMouseDown={(e) => handleDragStart(e, 'left')}
          style={{
            position: 'absolute',
            left: '4px',
            bottom: '4px',
            width: '16px',
            height: '16px',
            cursor: 'nesw-resize',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.6,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M1 1L9 9M1 5L5 9M1 9H1.01"
              stroke={themeMode === 'dark' ? '#94a3b8' : '#64748b'}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </Tooltip>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '8px' }}>
        {/* Variable Tags insertion row */}
        <div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 'bold',
              marginBottom: '6px',
              color: themeMode === 'dark' ? '#cbd5e1' : '#4b5563',
            }}
          >
            Chèn nhanh thẻ biến (nhấp để chèn):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {availableTags.map((item) => (
              <Tooltip key={item.tag} title={`Chèn ${item.tag} vào nội dung mẫu`}>
                <Tag
                  color={item.color}
                  onClick={() => handleInsertTag(item.tag)}
                  style={{
                    cursor: 'pointer',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                  }}
                >
                  + {item.label}
                </Tag>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Template Edit Area */}
        <div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 'bold',
              marginBottom: '6px',
              color: themeMode === 'dark' ? '#cbd5e1' : '#4b5563',
            }}
          >
            Mẫu tin nhắn tùy chỉnh:
          </div>
          <TextArea
            ref={textareaRef as SafeAny}
            rows={5}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            style={{
              fontFamily: 'monospace',
              fontSize: '12.5px',
              height: textareaHeight ? `${textareaHeight}px` : undefined,
              minHeight: '80px',
              maxHeight: '500px',
              resize: 'vertical',
              backgroundColor: themeMode === 'dark' ? '#0f172a' : '#f8fafc',
              color: themeMode === 'dark' ? '#f1f5f9' : '#0f172a',
              borderColor: themeMode === 'dark' ? '#334155' : '#cbd5e1',
            }}
          />
        </div>

        {/* Live Preview Box */}
        <div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 'bold',
              marginBottom: '6px',
              color: themeMode === 'dark' ? '#cbd5e1' : '#4b5563',
            }}
          >
            Xem trước tin nhắn sẽ gửi cho {customerName || 'khách'}:
          </div>
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: themeMode === 'dark' ? 'rgba(250, 140, 22, 0.08)' : '#fffbe6',
              border: `1px solid ${themeMode === 'dark' ? 'rgba(250, 140, 22, 0.25)' : '#ffe58f'}`,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '13px',
              lineHeight: '1.5',
              color: themeMode === 'dark' ? '#f8fafc' : '#1e293b',
            }}
          >
            {previewText}
          </div>
        </div>
      </div>
    </AdaptiveModal>
  );
};
