'use client';

import React, { useState, useEffect } from 'react';
import { Form, Select, Input, Button, message, Spin, Tag, Avatar } from 'antd';
import {
  EditOutlined,
  UserOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  LockOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  GiftOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { BookingPromotionOptionsResponse, SafeAny, vietnameseSearchFilter } from '@mos-lab/shared';
import { apiClient } from '../lib/api-client';
import { useTheme } from '../context/ThemeContext';
import { getStoreFullAddress, STORES } from './booking/constants';
import { AdaptiveModal } from './ui/AdaptiveOverlay';

interface UpdateBookingModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  booking: SafeAny;
}

const getVietnameseDayOfWeek = (d: dayjs.Dayjs): string => {
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return days[d.day()] || '';
};

export const UpdateBookingModal: React.FC<UpdateBookingModalProps> = ({ visible, onClose, onSuccess, booking }) => {
  const { themeMode } = useTheme();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [staffList, setStaffList] = useState<SafeAny[]>([]);
  const [serviceList, setServiceList] = useState<SafeAny[]>([]);
  const [promotionOptions, setPromotionOptions] = useState<BookingPromotionOptionsResponse | null>(null);
  const selectedServiceId = Form.useWatch('serviceId', form);

  useEffect(() => {
    if (visible && booking) {
      setLoadingOptions(true);
      Promise.all([
        apiClient.customers.getStaff().catch(() => []),
        apiClient.customers.getServices().catch(() => []),
        apiClient.customers.getBookingPromotionOptions(Number(booking.id)).catch(() => null),
      ])
        .then(([staffData, serviceData, promotionData]) => {
          const rawServices = serviceData || [];
          let currentServicesList = [...rawServices];
          setStaffList(staffData || []);
          setPromotionOptions(promotionData);

          // Pre-fill initial values
          const bookingServiceName =
            booking.serviceName || (booking as any).user_service_name || (booking as any).service || '';
          const bookingServiceId = booking.serviceId || (booking as any).user_service_id || (booking as any).service_id;

          let matchedService = currentServicesList.find((s: SafeAny) => {
            if (
              bookingServiceId &&
              (Number(s.id) === Number(bookingServiceId) || String(s.id) === String(bookingServiceId))
            )
              return true;
            if (
              s.name &&
              bookingServiceName &&
              String(s.name).toLowerCase().trim() === String(bookingServiceName).toLowerCase().trim()
            )
              return true;
            if (
              Array.isArray(booking.services) &&
              (booking.services.includes(s.name) || booking.services.includes(s.serviceName))
            )
              return true;
            return false;
          });

          // Fallback if appointment has a service name/ID that is not in serviceData catalog
          if (!matchedService && (bookingServiceName || bookingServiceId)) {
            const fallbackService = {
              id: bookingServiceId || `srv_fb_${Date.now()}`,
              name: bookingServiceName || `Dịch vụ #${bookingServiceId}`,
              price: booking.servicePrice || booking.totalPrice || 0,
              duration: 90,
            };
            currentServicesList = [fallbackService, ...currentServicesList];
            matchedService = fallbackService;
          }

          setServiceList(currentServicesList);

          const matchedStaff = (staffData || []).find((st: SafeAny) => {
            if (booking.technicianId && Number(st.id) === Number(booking.technicianId)) return true;
            if (
              booking.technicianName &&
              booking.technicianName !== 'Kỹ thuật viên' &&
              booking.technicianName !== 'Chuyên viên' &&
              st.displayName &&
              st.displayName.toLowerCase().trim() === String(booking.technicianName).toLowerCase().trim()
            )
              return true;
            return false;
          });

          form.setFieldsValue({
            technicianId: matchedStaff ? matchedStaff.id : booking.technicianId || null,
            serviceId: matchedService ? matchedService.id : null,
            bookingNote: booking.bookingNote || '',
            promotionSelection:
              promotionData?.mode === 'CUSTOM_CAMPAIGN' && promotionData.selectedCampaignPromotionId
                ? `CUSTOM_CAMPAIGN:${promotionData.selectedCampaignPromotionId}`
                : promotionData?.selectedPromotionId
                  ? `STANDARD:${promotionData.selectedPromotionId}`
                  : undefined,
          });
        })
        .finally(() => setLoadingOptions(false));
    }
  }, [visible, booking, form]);

  if (!booking) return null;

  const isDark = themeMode === 'dark';
  const rawBookingDateStr = booking.bookingDateStart || booking.bookingDate || booking.date;
  const bookingDateObj = rawBookingDateStr ? dayjs(rawBookingDateStr) : dayjs();
  const formattedDateStr = bookingDateObj.format('DD/MM/YYYY');
  const formattedTimeStr = bookingDateObj.format('HH:mm');
  const dayOfWeekStr = getVietnameseDayOfWeek(bookingDateObj);

  // Find store address
  const storeId = Number(booking.storeId || (booking as any).client_store_id || (booking as any).clientStoreId || 16);
  const storeInfo = STORES.find((s) => s.id === storeId) || { name: booking.branchName || 'Estella Place' };
  const fullBranchAddress = getStoreFullAddress(storeInfo);

  const handleServiceChange = (serviceId: number | string | undefined) => {
    const selectedPromotion = (promotionOptions?.promotions || []).find(
      (promotion) => form.getFieldValue('promotionSelection') === `${promotion.source}:${promotion.id}`
    );
    if (
      selectedPromotion?.promotionType === 'FIXED_FINAL_PRICE' &&
      !(selectedPromotion.eligibleServiceIds || []).includes(Number(serviceId))
    ) {
      form.setFieldValue('promotionSelection', undefined);
    }
  };

  const visiblePromotionOptions = (promotionOptions?.promotions || []).filter(
    (promotion) =>
      promotion.promotionType !== 'FIXED_FINAL_PRICE' ||
      Boolean(selectedServiceId && (promotion.eligibleServiceIds || []).includes(Number(selectedServiceId)))
  );

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      let finalServiceId: number | null = null;
      if (values.serviceId !== undefined && values.serviceId !== null && values.serviceId !== '') {
        const p = Number(values.serviceId);
        if (!isNaN(p) && p >= 0) {
          finalServiceId = p;
        }
      }

      const promotionSelection = typeof values.promotionSelection === 'string' ? values.promotionSelection : null;
      const selectedPromotionId = promotionSelection?.startsWith('STANDARD:')
        ? Number(promotionSelection.replace('STANDARD:', ''))
        : null;
      const selectedCampaignPromotionId = promotionSelection?.startsWith('CUSTOM_CAMPAIGN:')
        ? Number(promotionSelection.replace('CUSTOM_CAMPAIGN:', ''))
        : null;
      const validPromotionId =
        selectedPromotionId !== null && Number.isInteger(selectedPromotionId) && selectedPromotionId > 0
          ? selectedPromotionId
          : null;
      const validCampaignPromotionId =
        selectedCampaignPromotionId !== null &&
        Number.isInteger(selectedCampaignPromotionId) &&
        selectedCampaignPromotionId > 0
          ? selectedCampaignPromotionId
          : null;

      const payload = {
        storeId,
        technicianId: values.technicianId ? Number(values.technicianId) : null,
        bookingDate: bookingDateObj.format('YYYY-MM-DD'),
        bookingTime: formattedTimeStr,
        bookingNote: values.bookingNote || '',
        serviceId: finalServiceId,
        ...(promotionOptions
          ? {
              promotionId: validPromotionId,
              campaignPromotionId: validCampaignPromotionId,
            }
          : {}),
        reasonCategory: 'Cập nhật thông tin đơn hàng',
        reasonNote: 'Cập nhật KTV/Dịch vụ/Ưu đãi/Ghi chú từ CRM',
      };

      await apiClient.customers.updateBooking(booking.id, payload);
      message.success('Cập nhật thông tin lịch hẹn thành công!');
      onSuccess();
      onClose();
    } catch (err: SafeAny) {
      console.error('[UpdateBookingModal] Error submitting update:', err);
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi cập nhật lịch hẹn';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdaptiveModal
      intent="form"
      className="booking-update-modal"
      open={visible}
      onCancel={onClose}
      footer={null}
      aria-label="Modal Cập nhật thông tin lịch hẹn"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 600 }}>
          <EditOutlined style={{ color: '#1890ff' }} />
          <span>Cập Nhật Thông Tin Lịch Hẹn</span>
          <Tag color="blue" style={{ borderRadius: '4px', fontWeight: 600, margin: 0 }} className="tabular-nums">
            #{booking.orderKey || booking.id}
          </Tag>
        </div>
      }
      destroyOnClose
      style={{ top: 24 }}
      styles={{
        content: {
          background: isDark ? '#141414' : '#ffffff',
          color: isDark ? '#e0e0e0' : '#262626',
          borderRadius: '14px',
          border: `1px solid ${isDark ? '#303030' : '#e8e8e8'}`,
          boxShadow: isDark ? '0 12px 32px rgba(0, 0, 0, 0.6)' : '0 12px 32px rgba(0, 0, 0, 0.1)',
        },
        header: {
          background: isDark ? '#141414' : '#ffffff',
          borderBottom: `1px solid ${isDark ? '#262626' : '#f0f0f0'}`,
          paddingBottom: '12px',
        },
      }}
    >
      <Spin spinning={loadingOptions}>
        <div style={{ marginTop: '16px' }}>
          {/* Locked Information Card with Premium Accent */}
          <div
            style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(250, 173, 20, 0.08) 0%, rgba(20, 20, 20, 0.95) 100%)'
                : 'linear-gradient(135deg, #fffbe6 0%, #fafafa 100%)',
              borderRadius: '10px',
              padding: '14px 16px',
              border: `1px solid ${isDark ? 'rgba(250, 173, 20, 0.25)' : '#ffe58f'}`,
              borderLeft: '4px solid #faad14',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: isDark ? '#faad14' : '#d48806',
                  letterSpacing: '0.3px',
                }}
              >
                <LockOutlined style={{ marginRight: '6px' }} />
                THÔNG TIN CỐ ĐỊNH (KHÔNG THỂ SỬA TẠI ĐÂY)
              </span>
              <Tag color="gold" style={{ margin: 0, fontSize: '11px', borderRadius: '4px', fontWeight: 600 }}>
                Khóa thời gian & chi nhánh
              </Tag>
            </div>

            <div
              className="booking-update-locked-grid"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}
            >
              <div>
                <span
                  style={{
                    color: isDark ? '#94a3b8' : '#64748b',
                    display: 'block',
                    fontSize: '11px',
                    marginBottom: '2px',
                  }}
                >
                  <CalendarOutlined style={{ marginRight: '4px' }} />
                  Ngày & Giờ hẹn
                </span>
                <strong style={{ color: isDark ? '#4ade80' : '#16a34a', fontSize: '13.5px' }} className="tabular-nums">
                  {formattedTimeStr} - {dayOfWeekStr}, {formattedDateStr}
                </strong>
              </div>

              <div>
                <span
                  style={{
                    color: isDark ? '#94a3b8' : '#64748b',
                    display: 'block',
                    fontSize: '11px',
                    marginBottom: '2px',
                  }}
                >
                  <EnvironmentOutlined style={{ marginRight: '4px' }} />
                  Chi nhánh
                </span>
                <strong style={{ color: isDark ? '#f1f5f9' : '#1e293b', fontSize: '13px', lineHeight: 1.3 }}>
                  {fullBranchAddress}
                </strong>
              </div>
            </div>

            <div
              style={{
                marginTop: '10px',
                fontSize: '11.5px',
                color: isDark ? '#94a3b8' : '#64748b',
                fontStyle: 'italic',
                borderTop: `1px dashed ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                paddingTop: '8px',
              }}
            >
              💡 Cần dời thời gian hoặc đổi chi nhánh? Vui lòng sử dụng tính năng <strong>&quot;Đổi lịch&quot;</strong>.
            </div>
          </div>

          {/* Form for editable parameters */}
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            {/* 1. Technician / KTV Selection */}
            <Form.Item
              name="technicianId"
              label={
                <span style={{ fontWeight: 600, color: isDark ? '#e2e8f0' : '#1e293b' }}>
                  <UserOutlined style={{ marginRight: '6px', color: '#1890ff' }} />
                  Chuyên viên (KTV / Technician)
                </span>
              }
            >
              <Select
                placeholder="-- Chọn Chuyên viên làm dịch vụ --"
                allowClear
                size="large"
                style={{ width: '100%' }}
                showSearch
                aria-label="Chọn Chuyên viên làm dịch vụ"
                optionFilterProp="filterText"
                getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
              >
                {staffList.map((st: SafeAny) => {
                  const labelName = st.displayName || st.name;
                  const storeLabel = st.notes ? `(${st.notes})` : '';
                  const filterText = `${labelName} ${storeLabel}`;
                  return (
                    <Select.Option key={st.id} value={st.id} filterText={filterText}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Avatar size="small" icon={<UserOutlined />} src={st.avatar} />
                          <span style={{ fontWeight: 500 }}>{labelName}</span>
                        </div>
                        {st.notes && <Tag style={{ margin: 0, fontSize: '11px', borderRadius: '4px' }}>{st.notes}</Tag>}
                      </div>
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>

            {/* 2. Service Selection */}
            <Form.Item
              name="serviceId"
              label={
                <span style={{ fontWeight: 600, color: isDark ? '#e2e8f0' : '#1e293b' }}>
                  <AppstoreOutlined style={{ marginRight: '6px', color: '#52c41a' }} />
                  Dịch vụ thực hiện (Service)
                </span>
              }
            >
              <Select
                placeholder="-- Chọn Dịch vụ --"
                allowClear
                size="large"
                style={{ width: '100%' }}
                showSearch
                aria-label="Chọn Dịch vụ thực hiện"
                optionFilterProp="filterText"
                onChange={handleServiceChange}
                getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
              >
                {serviceList.map((sv: SafeAny) => {
                  const sName = sv.name || sv.serviceName;
                  const sPrice = sv.price ? `${Number(sv.price).toLocaleString('vi-VN')}đ` : '';
                  const filterText = `${sName} ${sPrice}`;
                  return (
                    <Select.Option key={sv.id} value={sv.id} filterText={filterText}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 500 }}>{sName}</span>
                        {sv.price ? (
                          <Tag
                            color="green"
                            className="tabular-nums"
                            style={{ margin: 0, fontSize: '11px', borderRadius: '4px' }}
                          >
                            {sPrice}
                          </Tag>
                        ) : null}
                      </div>
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>

            {/* 3. Promotion selection. Custom-campaign bookings are intentionally scoped by the API. */}
            <Form.Item
              name="promotionSelection"
              label={
                <span style={{ fontWeight: 600, color: isDark ? '#e2e8f0' : '#1e293b' }}>
                  <GiftOutlined style={{ marginRight: '6px', color: '#a855f7' }} />
                  Khuyến mãi (Promotion)
                </span>
              }
              extra={
                promotionOptions?.mode === 'CUSTOM_CAMPAIGN' && promotionOptions.campaign
                  ? `Lịch này thuộc custom campaign “${promotionOptions.campaign.name}”; chỉ được chọn ưu đãi của campaign này.`
                  : 'Chọn ưu đãi đang áp dụng cho lịch hẹn, hoặc bỏ chọn để không áp dụng khuyến mãi.'
              }
            >
              <Select
                placeholder={
                  promotionOptions?.mode === 'CUSTOM_CAMPAIGN'
                    ? '-- Chọn ưu đãi của campaign --'
                    : '-- Chọn chương trình khuyến mãi --'
                }
                allowClear
                size="large"
                style={{ width: '100%' }}
                showSearch
                disabled={!promotionOptions}
                aria-label="Chọn chương trình khuyến mãi"
                filterOption={vietnameseSearchFilter}
                getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                options={visiblePromotionOptions.map((promotion) => ({
                  value: `${promotion.source}:${promotion.id}`,
                  label:
                    promotion.source === 'CUSTOM_CAMPAIGN'
                      ? `🎯 ${promotion.label} — ${promotion.name}${
                          promotion.promotionType === 'FIXED_FINAL_PRICE' &&
                          promotion.eligibleServiceCategoryLabels?.length
                            ? ` · ${promotion.eligibleServiceCategoryLabels.join(', ')}`
                            : ''
                        }`
                      : promotion.label === promotion.name
                        ? promotion.name
                        : `${promotion.name} (${promotion.label})`,
                }))}
              />
            </Form.Item>

            {/* 4. Booking Note */}
            <Form.Item
              name="bookingNote"
              label={
                <span style={{ fontWeight: 600, color: isDark ? '#e2e8f0' : '#1e293b' }}>
                  <FileTextOutlined style={{ marginRight: '6px', color: '#faad14' }} />
                  Ghi chú đơn hàng (Booking Note)
                </span>
              }
            >
              <Input.TextArea
                rows={3}
                placeholder="Nhập ghi chú hoặc yêu cầu đặc biệt của khách hàng..."
                maxLength={500}
                showCount
                aria-label="Nhập ghi chú đơn hàng"
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>

            {/* Modal Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: `1px solid ${isDark ? '#262626' : '#f0f0f0'}`,
              }}
            >
              <Button onClick={onClose} size="large" style={{ borderRadius: '8px' }}>
                Hủy bỏ
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                size="large"
                icon={<EditOutlined />}
                style={{
                  borderRadius: '8px',
                  backgroundColor: '#1890ff',
                  borderColor: '#1890ff',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
                }}
              >
                Lưu Cập Nhật
              </Button>
            </div>
          </Form>
        </div>
      </Spin>
    </AdaptiveModal>
  );
};
