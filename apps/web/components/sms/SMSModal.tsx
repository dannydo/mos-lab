'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal, Input, Button, Tag, Space, Select, Spin, Empty, Typography, Tooltip, message, Form } from 'antd';
import {
  MessageOutlined,
  SendOutlined,
  SaveOutlined,
  HistoryOutlined,
  ReloadOutlined,
  UserOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  CompressOutlined,
  ExpandOutlined,
  FullscreenOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Customer, SmsTemplate, CustomerSmsHistoryItem, DEFAULT_SMS_VARIABLE_TAGS } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { useTheme } from '../../context/ThemeContext';

const { TextArea } = Input;
const { Text, Title } = Typography;

export interface SMSModalProps {
  open?: boolean;
  visible?: boolean;
  onClose: () => void;
  customer: Customer | null;
  planId?: number;
  onSuccess?: () => void;
  themeMode?: 'light' | 'dark';
}

export const SMSModal: React.FC<SMSModalProps> = ({
  open,
  visible,
  onClose,
  customer,
  planId,
  onSuccess,
  themeMode: propThemeMode,
}) => {
  const isModalOpen = open ?? visible ?? false;
  const { themeMode: contextThemeMode } = useTheme();
  const themeMode = propThemeMode || contextThemeMode;

  const [user, setUser] = useState<{ id?: number; role?: string } | null>(null);
  const [history, setHistory] = useState<CustomerSmsHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (_e) {}
      }
    }
  }, []);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);
  const [selectedPhone, setSelectedPhone] = useState<string>('');
  const [messageBody, setMessageBody] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [customerBookingUrl, setCustomerBookingUrl] = useState<string>('https://s.wingslashes.com/Urc5SCIJ');

  // Modal Resizing & Width Persistence State
  const [modalWidth, setModalWidth] = useState<number>(880);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; width: number; direction: 'left' | 'right' } | null>(null);

  // Load saved modal width from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('mos_sms_modal_width');
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed >= 520 && parsed <= 1250) {
          setModalWidth(parsed);
        }
      }
    }
  }, [isModalOpen]);

  // Handle mouse drag to resize modal width dynamically
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const { x, width, direction } = dragStartRef.current;
      const deltaX = direction === 'right' ? e.clientX - x : x - e.clientX;
      const newWidth = Math.max(540, Math.min(1250, width + deltaX * 2));
      setModalWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      if (typeof window !== 'undefined') {
        localStorage.setItem('mos_sms_modal_width', String(modalWidth));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, modalWidth]);

  const handleDragStart = (e: React.MouseEvent, direction: 'left' | 'right') => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, width: modalWidth, direction };
  };

  const handleWidthChange = (w: number) => {
    setModalWidth(w);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_sms_modal_width', String(w));
    }
  };

  // Template Save Modal state
  const [saveTemplateVisible, setSaveTemplateVisible] = useState<boolean>(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState<string>('');
  const [newTemplateCategory, setNewTemplateCategory] = useState<string>('GENERAL');
  const [savingTemplate, setSavingTemplate] = useState<boolean>(false);

  // Fetch SMS templates & history when modal opens
  useEffect(() => {
    if (!isModalOpen || !customer) return;

    // Set default selected phone
    setSelectedPhone(customer.phone || '');

    // Reset fields
    setMessageBody('');
    setSelectedTemplateId(undefined);

    // Fetch Templates
    setLoadingTemplates(true);
    apiClient.sms
      .getTemplates()
      .then((tpls) => {
        setTemplates(tpls);
        if (tpls.length > 0) {
          setSelectedTemplateId(tpls[0].id);
          setMessageBody(tpls[0].content);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch SMS templates:', err);
      })
      .finally(() => setLoadingTemplates(false));

    // Fetch Customer History
    setLoadingHistory(true);
    apiClient.sms
      .getHistory(customer.id)
      .then((items) => {
        setHistory(items);
      })
      .catch((err) => {
        console.error('Failed to fetch SMS history:', err);
      })
      .finally(() => setLoadingHistory(false));

    // Fetch Customer Booking Short URL
    apiClient.sms
      .getUserUrl(customer.id)
      .then((res) => {
        if (res?.bookingUrl) {
          setCustomerBookingUrl(res.bookingUrl);
        }
      })
      .catch(() => {
        setCustomerBookingUrl('https://s.wingslashes.com/Urc5SCIJ');
      });
  }, [isModalOpen, customer]);

  const reloadHistory = () => {
    if (!customer) return;
    setLoadingHistory(true);
    apiClient.sms
      .getHistory(customer.id)
      .then((items) => setHistory(items))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  };

  // Helper for safe date formatting
  const formatSafeDate = (val: string | null | undefined, formatStr = 'DD/MM/YYYY', fallback = 'N/A'): string => {
    if (!val) return fallback;
    const d = dayjs(val);
    if (!d.isValid()) return fallback;
    const formatted = d.format(formatStr);
    return formatted === 'Invalid Date' ? fallback : formatted;
  };

  // Variable tag substitution dictionary
  const tagValues = useMemo(() => {
    if (!customer) return {};

    let expiryDateStr = 'N/A';
    if (customer.comboBalance?.expiryDate) {
      expiryDateStr = formatSafeDate(customer.comboBalance.expiryDate, 'DD/MM/YYYY', 'N/A');
    } else if (customer.newComboDetails?.purchaseDate) {
      if (dayjs(customer.newComboDetails.purchaseDate).isValid()) {
        expiryDateStr = dayjs(customer.newComboDetails.purchaseDate).add(30, 'day').format('DD/MM/YYYY');
      } else {
        expiryDateStr = 'N/A';
      }
    } else {
      expiryDateStr = '25/08/2026';
    }
    if (expiryDateStr === 'Invalid Date') {
      expiryDateStr = 'N/A';
    }

    let ngayLamNearStr = 'N/A';
    const rawLastDate = customer.lastVisit || customer.lastBookingDate;
    if (rawLastDate) {
      ngayLamNearStr = formatSafeDate(rawLastDate, 'DD/MM/YYYY', 'N/A');
    }

    const totalRemaining = customer.comboBalance
      ? (customer.comboBalance.normalCount || 0) + (customer.comboBalance.retainCount || 0)
      : 14;

    const comboNameStr =
      customer.newComboDetails?.comboName || (customer.comboBalance ? 'Gói Combo Care' : 'Combo Nối Mi Premium');

    return {
      '{ten_khach}': customer.name || 'Khách hàng',
      '{sdt_khach}': selectedPhone || customer.phone || '',
      '{han_dung}': expiryDateStr,
      '{ngay_lam_near}': ngayLamNearStr,
      '{so_ngay_dam}': `${totalRemaining} ngày`,
      '{ten_combo}': comboNameStr,
      '{sdt_cua_hang}': '0987654321',
      '{url_dat_lich}': customerBookingUrl || 'https://s.wingslashes.com/Urc5SCIJ',
    };
  }, [customer, selectedPhone, customerBookingUrl]);

  // Live preview text calculation
  const livePreview = useMemo(() => {
    let text = messageBody;
    Object.entries(tagValues).forEach(([tag, val]) => {
      text = text.replaceAll(tag, String(val));
    });
    return text;
  }, [messageBody, tagValues]);

  // Character and SMS Segment Counter (GSM-7 vs UCS-2 Unicode detection)
  const characterCount = livePreview.length;

  const isUnicode = useMemo(() => {
    return /[^\x00-\x7F]/.test(livePreview);
  }, [livePreview]);

  const maxSingleSegment = isUnicode ? 70 : 160;

  const smsSegments = useMemo(() => {
    if (characterCount === 0) return 0;
    if (isUnicode) {
      if (characterCount <= 70) return 1;
      return Math.ceil(characterCount / 67);
    } else {
      if (characterCount <= 160) return 1;
      return Math.ceil(characterCount / 153);
    }
  }, [characterCount, isUnicode]);

  // Template select change
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      setMessageBody(tpl.content);
    }
  };

  // Insert variable tag into message body
  const handleInsertTag = (tag: string) => {
    setMessageBody((prev) => `${prev} ${tag}`);
  };

  // Send SMS Handler
  const handleSendSms = async () => {
    if (!customer) return;

    if (!selectedPhone) {
      message.error('Vui lòng chọn số điện thoại khách hàng!');
      return;
    }

    if (!messageBody.trim()) {
      message.error('Vui lòng nhập nội dung tin nhắn!');
      return;
    }

    setSending(true);
    try {
      const response = await apiClient.sms.sendSms({
        legacyUserId: customer.id,
        toPhoneNumber: selectedPhone,
        body: livePreview,
        templateId: selectedTemplateId,
        planId,
      });

      if (response.success) {
        message.success('Đã gửi tin nhắn SMS thành công!');
        reloadHistory();
        onSuccess?.();
        onClose();
      } else {
        message.error(response.message || 'Gửi SMS thất bại');
      }
    } catch (err: SafeAny) {
      message.error(err?.response?.data?.message || 'Có lỗi xảy ra khi gửi SMS!');
    } finally {
      setSending(false);
    }
  };

  // Save as Template Handler (Admin only)
  const handleSaveTemplateSubmit = async () => {
    if (!newTemplateTitle.trim()) {
      message.error('Vui lòng nhập tên template mẫu!');
      return;
    }

    setSavingTemplate(true);
    try {
      const res = await apiClient.sms.saveTemplate({
        title: newTemplateTitle.trim(),
        content: messageBody,
        category: newTemplateCategory,
      });

      if (res.success) {
        message.success('Đã lưu mẫu tin nhắn SMS mới!');
        setTemplates(res.templates);
        setSelectedTemplateId(res.template.id);
        setSaveTemplateVisible(false);
        setNewTemplateTitle('');
      }
    } catch (err: SafeAny) {
      message.error(err?.response?.data?.message || 'Không thể lưu template mẫu');
    } finally {
      setSavingTemplate(false);
    }
  };

  // 1-Click Copy Live Preview Text
  const handleCopyLivePreview = () => {
    if (!livePreview || !livePreview.trim()) {
      message.warning('Không có nội dung tin nhắn để sao chép!');
      return;
    }
    navigator.clipboard.writeText(livePreview);
    message.success('Đã sao chép nội dung tin nhắn thực tế!');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <Modal
      open={isModalOpen}
      onCancel={onClose}
      width={modalWidth}
      title={
        <div className="flex justify-between items-center pr-6">
          <Space size="middle">
            <MessageOutlined style={{ color: '#D4A84B', fontSize: '18px' }} />
            <span style={{ fontWeight: 'bold' }}>Gửi tin nhắn SMS — {customer?.name || 'Khách hàng'}</span>
          </Space>

          {/* Quick Modal Width Controls */}
          <Space size={4} className="ml-auto">
            <Tooltip title="Giao diện Gọn (740px)">
              <Button
                size="small"
                type={modalWidth === 740 ? 'primary' : 'text'}
                icon={<CompressOutlined style={{ fontSize: '12px' }} />}
                onClick={() => handleWidthChange(740)}
                style={{
                  width: '24px',
                  height: '24px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: modalWidth === 740 ? '#fa8c16' : undefined,
                  borderColor: modalWidth === 740 ? '#fa8c16' : undefined,
                }}
              />
            </Tooltip>
            <Tooltip title="Giao diện Chuẩn (880px)">
              <Button
                size="small"
                type={modalWidth === 880 ? 'primary' : 'text'}
                icon={<ExpandOutlined style={{ fontSize: '12px' }} />}
                onClick={() => handleWidthChange(880)}
                style={{
                  width: '24px',
                  height: '24px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: modalWidth === 880 ? '#fa8c16' : undefined,
                  borderColor: modalWidth === 880 ? '#fa8c16' : undefined,
                }}
              />
            </Tooltip>
            <Tooltip title="Giao diện Rộng (1050px)">
              <Button
                size="small"
                type={modalWidth === 1050 ? 'primary' : 'text'}
                icon={<FullscreenOutlined style={{ fontSize: '12px' }} />}
                onClick={() => handleWidthChange(1050)}
                style={{
                  width: '24px',
                  height: '24px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: modalWidth === 1050 ? '#fa8c16' : undefined,
                  borderColor: modalWidth === 1050 ? '#fa8c16' : undefined,
                }}
              />
            </Tooltip>
          </Space>
        </div>
      }
      footer={null}
      destroyOnHidden
      styles={{
        content: {
          backgroundColor: themeMode === 'dark' ? '#141414' : '#ffffff',
          color: themeMode === 'dark' ? '#f5f5f5' : '#141414',
          borderRadius: '12px',
          position: 'relative',
          transition: isDragging ? 'none' : 'width 0.2s ease',
        },
        header: {
          backgroundColor: themeMode === 'dark' ? '#141414' : '#ffffff',
          color: themeMode === 'dark' ? '#f5f5f5' : '#141414',
          borderBottom: `1px solid ${themeMode === 'dark' ? '#262626' : '#f0f0f0'}`,
        },
      }}
    >
      {/* Corner Resizing Drag Handles (Bottom-Right & Bottom-Left) */}
      <Tooltip title="Kéo góc để điều chỉnh chiều rộng Modal">
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

      <Tooltip title="Kéo góc để điều chỉnh chiều rộng Modal">
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

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
        {/* LEFT PANE: SMS HISTORY (5 cols) */}
        <div
          className={`md:col-span-5 p-4 rounded-xl border flex flex-col justify-between ${
            themeMode === 'dark' ? 'bg-[#1a1a1a] border-[#262626]' : 'bg-slate-50 border-slate-200'
          }`}
          style={{ minHeight: '440px', maxHeight: '520px' }}
        >
          <div>
            <div className="flex justify-between items-center mb-3">
              <Space>
                <HistoryOutlined style={{ color: '#D4A84B' }} />
                <span className="font-bold text-sm">Lịch sử SMS</span>
                <Tag color="gold" style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}>
                  {history.length}
                </Tag>
              </Space>
              <Tooltip title="Tải lại lịch sử">
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined style={{ fontSize: '12px' }} />}
                  onClick={reloadHistory}
                  loading={loadingHistory}
                />
              </Tooltip>
            </div>

            {loadingHistory ? (
              <div className="flex justify-center items-center py-12">
                <Spin />
              </div>
            ) : history.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span className="text-xs text-slate-400">Chưa có lịch sử SMS</span>}
                className="my-8"
              />
            ) : (
              <div className="overflow-y-auto max-h-[420px] pr-1 space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border text-xs transition-all ${
                      themeMode === 'dark'
                        ? 'bg-[#141414] border-[#303030] hover:border-gold/50'
                        : 'bg-white border-slate-200 hover:border-amber-400'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <ClockCircleOutlined style={{ fontSize: '10px' }} />
                        <span className="tabular-nums font-semibold">
                          {dayjs(item.dateCreated).format('DD/MM/YYYY HH:mm')}
                        </span>
                      </span>
                      <Tag color="blue" style={{ fontSize: '10px', margin: 0 }}>
                        {item.createdStaffName || 'Nhân viên'}
                      </Tag>
                    </div>
                    <div className="font-semibold text-slate-300 dark:text-slate-200 mb-1 flex items-center gap-1">
                      <PhoneOutlined style={{ fontSize: '10px', color: '#D4A84B' }} />
                      <span className="tabular-nums">{item.toPhoneNumber}</span>
                    </div>
                    <div
                      className={`line-clamp-4 text-xs whitespace-pre-wrap leading-relaxed ${
                        themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      {item.body}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: SMS EDITOR & PREVIEW (7 cols) */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            {/* Phone selection */}
            <div>
              <Text className="text-xs font-bold block mb-1">Số điện thoại người nhận:</Text>
              <Input
                prefix={<PhoneOutlined style={{ color: '#D4A84B' }} />}
                value={selectedPhone}
                onChange={(e) => setSelectedPhone(e.target.value)}
                placeholder="Nhập số điện thoại..."
                className="w-full tabular-nums font-semibold"
                style={{
                  backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff',
                  borderColor: themeMode === 'dark' ? '#303030' : '#d9d9d9',
                  color: themeMode === 'dark' ? '#ffffff' : '#000000',
                }}
              />
            </div>

            {/* Template Selector */}
            <div>
              <Text className="text-xs font-bold block mb-1">Mẫu tin nhắn SMS hệ thống:</Text>
              <Select
                value={selectedTemplateId}
                onChange={handleTemplateChange}
                loading={loadingTemplates}
                placeholder="Chọn mẫu SMS sẵn có..."
                className="w-full"
                options={templates.map((t) => ({
                  value: t.id,
                  label: `${t.title} ${t.category ? `(${t.category})` : ''}`,
                }))}
              />
            </div>

            {/* Variable tag chips */}
            <div>
              <Text className="text-xs font-bold block mb-1.5">Chèn nhanh biến động (nhấp vào thẻ để chèn):</Text>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_SMS_VARIABLE_TAGS.map((item) => (
                  <Tooltip key={item.tag} title={`${item.description} (Ví dụ: ${item.exampleValue})`}>
                    <Tag
                      color="gold"
                      className="cursor-pointer hover:scale-105 transition-transform select-none font-semibold text-xs py-0.5 px-2"
                      onClick={() => handleInsertTag(item.tag)}
                    >
                      + {item.label}
                    </Tag>
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* Message Body Editor */}
            <div>
              <Text className="text-xs font-bold block mb-1">Nội dung tùy chỉnh (gốc):</Text>
              <TextArea
                rows={4}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Nhập nội dung tin nhắn hoặc chèn các thẻ biến..."
                style={{
                  fontFamily: 'monospace',
                  fontSize: '12.5px',
                  backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#f8fafc',
                  color: themeMode === 'dark' ? '#f1f5f9' : '#0f172a',
                  borderColor: themeMode === 'dark' ? '#303030' : '#cbd5e1',
                }}
              />
            </div>

            {/* Live Preview & Character Counter & Minimalist Copy Icon */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <Space size="small" align="center">
                  <Text className="text-xs font-bold">Xem trước thực tế (Live Preview):</Text>
                  <Tooltip title="Sao chép nội dung tin nhắn (1-click)">
                    <Button
                      type="text"
                      size="small"
                      shape="circle"
                      icon={<CopyOutlined style={{ color: '#D4A84B', fontSize: '13px' }} />}
                      onClick={handleCopyLivePreview}
                      className="hover:bg-amber-500/10 flex items-center justify-center transition-colors"
                      style={{ width: '22px', height: '22px' }}
                    />
                  </Tooltip>
                </Space>

                <span
                  className="text-xs font-bold tabular-nums"
                  style={{
                    color: characterCount > maxSingleSegment ? '#fa8c16' : '#52c41a',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {characterCount} / {maxSingleSegment} ký tự ({smsSegments} SMS{isUnicode ? ' - UCS-2' : ''})
                </span>
              </div>

              <div
                className={`p-3 rounded-lg border text-xs whitespace-pre-wrap leading-relaxed ${
                  themeMode === 'dark'
                    ? 'bg-amber-950/20 border-amber-500/30 text-slate-100'
                    : 'bg-amber-50 border-amber-200 text-slate-800'
                }`}
              >
                {livePreview || <span className="italic text-slate-400">Nội dung xem trước sẽ hiển thị ở đây...</span>}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              {isAdmin && (
                <Button
                  icon={<SaveOutlined />}
                  onClick={() => setSaveTemplateVisible(true)}
                  disabled={!messageBody.trim()}
                >
                  Lưu Template Mẫu
                </Button>
              )}
            </div>

            <Space>
              <Button onClick={onClose}>Hủy</Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={sending}
                onClick={handleSendSms}
                style={{
                  backgroundColor: themeMode === 'dark' ? '#D4A84B' : '#a07818',
                  borderColor: themeMode === 'dark' ? '#D4A84B' : '#a07818',
                  fontWeight: 'bold',
                }}
              >
                Gửi SMS
              </Button>
            </Space>
          </div>
        </div>
      </div>

      {/* MODAL LƯU TEMPLATE MẪU (ADMIN ONLY) */}
      <Modal
        open={saveTemplateVisible}
        onCancel={() => setSaveTemplateVisible(false)}
        title="Lưu mẫu tin nhắn SMS mới"
        onOk={handleSaveTemplateSubmit}
        confirmLoading={savingTemplate}
        okText="Lưu Mẫu"
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form layout="vertical" className="pt-2">
          <Form.Item label="Tên Mẫu Template" required>
            <Input
              value={newTemplateTitle}
              onChange={(e) => setNewTemplateTitle(e.target.value)}
              placeholder="VD: Reminder 17 - Tri ân khách cũ"
            />
          </Form.Item>

          <Form.Item label="Danh mục (Category)">
            <Select
              value={newTemplateCategory}
              onChange={(val) => setNewTemplateCategory(val)}
              options={[
                { value: 'GENERAL', label: 'Thông thường (General)' },
                { value: 'REMINDER', label: 'Nhắc nhở (Reminder)' },
                { value: 'PROMOTION', label: 'Khuyến mãi (Promotion)' },
                { value: 'AFTERCARE', label: 'Chăm sóc sau làm (Aftercare)' },
              ]}
            />
          </Form.Item>

          <div className="p-3 rounded bg-slate-50 dark:bg-slate-900 border text-xs">
            <Text type="secondary">Nội dung template sẽ lưu:</Text>
            <div className="font-mono mt-1 whitespace-pre-wrap">{messageBody}</div>
          </div>
        </Form>
      </Modal>
    </Modal>
  );
};
