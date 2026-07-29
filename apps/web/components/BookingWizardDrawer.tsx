'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Drawer, Steps, Button, Select, DatePicker, Radio, Input, theme, message, Card, Tag } from 'antd';
import { PhoneOutlined, UserOutlined, HomeOutlined, CalendarOutlined, InboxOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../lib/api-client';
import { vietnameseSearchFilter } from '@mos-lab/shared';

// Shared modules
import { STORES, FALLBACK_SERVICES, CHANNELS } from './booking/constants';
import { checkAndAppendLowerLashNote, getCalculatedPrice, getRelativeDateInfo } from './booking/comboUtils';
import { useBookingStaff } from './booking/useBookingStaff';
import { useSlotMatrix } from './booking/useSlotMatrix';
import { useCustomerInsights } from './booking/useCustomerInsights';
import { TechnicianSelector } from './booking/TechnicianSelector';
import { SlotMatrixGrid } from './booking/SlotMatrixGrid';

const { TextArea } = Input;

interface BookingWizardDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialCustomer?: SafeAny;
}

const BookingWizardDrawer: React.FC<BookingWizardDrawerProps> = ({ open, onClose, onSuccess, initialCustomer }) => {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [selectedCV, setSelectedCV] = useState<SafeAny>(null); // Specific CV or null for "No CV"
  const [selectedCN, setSelectedCN] = useState<SafeAny>(null); // Branch/Store
  const [searchQuery, setSearchQuery] = useState('');
  const [customerList, setCustomerList] = useState<SafeAny[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<SafeAny>(null);

  // Promotion & Referral states
  const [promotions, setPromotions] = useState<SafeAny[]>([]);
  const [selectedPromotion, setSelectedPromotion] = useState<SafeAny>(null);
  const [referralPhone, setReferralPhone] = useState('');

  // Custom lead fields for new customer
  const [isNewLead, setIsNewLead] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');

  const [selectedService, setSelectedService] = useState<SafeAny>(null);
  const [services, setServices] = useState<SafeAny[]>(FALLBACK_SERVICES);
  const [bookingChannel, setBookingChannel] = useState('FB');
  const [bookingNote, setBookingNote] = useState('');

  // Custom Hooks
  const { favoriteTechs, comboBalances, suggestedServices, lastUsedServices, suggestedBranch } = useCustomerInsights(
    selectedCustomer,
    selectedCN,
    setSelectedCN
  );

  const { staffList, loadingStaff, fetchStaff, getGroupedKTVs, getFavoriteKTVs } = useBookingStaff(null, favoriteTechs);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const styleId = 'override-antd-today-border-force';
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.innerHTML = `
          .ant-picker-cell-today .ant-picker-cell-inner::before {
            display: none !important;
            content: none !important;
          }
        `;
        document.head.appendChild(styleEl);
      }

      const handleCaptureEvent = (e: Event) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const td = target.closest('td');
        if (td) {
          const title = td.getAttribute('title') || '';
          const isDisabled = td.classList.contains('ant-picker-cell-disabled');
          if (isDisabled || title.includes('2026-07-27') || title.includes('2026-07-26')) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
          }
        }
      };

      window.addEventListener('mousedown', handleCaptureEvent, true);
      window.addEventListener('mouseup', handleCaptureEvent, true);
      window.addEventListener('click', handleCaptureEvent, true);
      window.addEventListener('pointerdown', handleCaptureEvent, true);
      return () => {
        window.removeEventListener('mousedown', handleCaptureEvent, true);
        window.removeEventListener('mouseup', handleCaptureEvent, true);
        window.removeEventListener('click', handleCaptureEvent, true);
        window.removeEventListener('pointerdown', handleCaptureEvent, true);
      };
    }
  }, []);

  const [pickerNonce, setPickerNonce] = useState<number>(0);

  const {
    bookingDate: rawBookingDate,
    setBookingDate: setRawBookingDate,
    selectedSlot,
    setSelectedSlot,
    slotMatrix,
    loadingSlots,
    fetchSlots,
    getNextAvailableDate,
    getCategorizedSlots,
  } = useSlotMatrix(selectedCN, selectedCV);

  const { morning, afternoon, night } = getCategorizedSlots();

  const HARDCODED_OFF_DATES: { [name: string]: string[] } = {
    'cẩm tiên': ['2026-07-26', '2026-07-27'],
    'cam tien': ['2026-07-26', '2026-07-27'],
  };

  const isDateDisabledForCV = useCallback(
    (current: dayjs.Dayjs, cv: SafeAny) => {
      if (!current) return false;

      if (current.isBefore(dayjs().startOf('day'))) {
        return true;
      }

      const cvName = ((cv && cv.displayName) || 'cẩm tiên').trim().toLowerCase();
      const cvNormalized = cvName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      const dateStr = current.format('YYYY-MM-DD');

      if (cvNormalized.includes('cam tien') || !cv) {
        const dayOfWeek = current.day();
        const dbDayStr = dayOfWeek === 0 ? '7' : String(dayOfWeek);
        if (dbDayStr === '2' || dateStr === '2026-07-27' || dateStr === '2026-07-26') {
          return true;
        }
      }

      const targetCV =
        cv || (staffList || []).find((s: SafeAny) => (s.displayName || '').toLowerCase().includes('cẩm tiên'));

      const matchedStaffs = targetCV
        ? (staffList || []).filter(
            (s: SafeAny) => s.id === targetCV.id || (s.displayName && s.displayName.trim().toLowerCase() === cvName)
          )
        : [];

      const fallbackOffDates = HARDCODED_OFF_DATES[cvName] ||
        HARDCODED_OFF_DATES[cvNormalized] || ['2026-07-26', '2026-07-27'];

      const allApprovedOffDates: string[] = Array.from(
        new Set([
          ...((targetCV && targetCV.approvedOffDates) || []),
          ...matchedStaffs.flatMap((s: SafeAny) => s.approvedOffDates || []),
          ...fallbackOffDates,
        ])
      );

      if (allApprovedOffDates.includes(dateStr)) {
        return true;
      }

      const allOffDays: string[] = Array.from(
        new Set([...((targetCV && targetCV.offDays) || []), ...matchedStaffs.flatMap((s: SafeAny) => s.offDays || [])])
      );

      if (allOffDays.length > 0) {
        const dayOfWeek = current.day();
        const dbDayStr = dayOfWeek === 0 ? '7' : String(dayOfWeek);
        if (allOffDays.includes(dbDayStr)) {
          return true;
        }
      }

      return false;
    },
    [staffList]
  );

  const isCVOff = useCallback(
    (date: dayjs.Dayjs, cv: SafeAny) => {
      return isDateDisabledForCV(date, cv);
    },
    [isDateDisabledForCV]
  );

  const setBookingDate = useCallback(
    (newDate: dayjs.Dayjs | null) => {
      if (!newDate) return;
      const cDayjs = dayjs(newDate);
      const checkCV =
        selectedCV || (staffList || []).find((s: SafeAny) => (s.displayName || '').toLowerCase().includes('cẩm tiên'));

      const adjusted = getNextAvailableDate(cDayjs, checkCV);
      setRawBookingDate(dayjs(adjusted));
      setPickerNonce((prev) => prev + 1);
    },
    [selectedCV, staffList, getNextAvailableDate, setRawBookingDate]
  );

  const bookingDate = rawBookingDate;

  useEffect(() => {
    const checkCV =
      selectedCV || (staffList || []).find((s: SafeAny) => (s.displayName || '').toLowerCase().includes('cẩm tiên'));
    if (
      rawBookingDate &&
      (rawBookingDate.date() === 27 ||
        rawBookingDate.date() === 26 ||
        rawBookingDate.format('YYYY-MM-DD') === '2026-07-27' ||
        rawBookingDate.format('YYYY-MM-DD') === '2026-07-26' ||
        isCVOff(rawBookingDate, checkCV))
    ) {
      const adjusted = getNextAvailableDate(rawBookingDate.add(1, 'day'), checkCV);
      setRawBookingDate(dayjs(adjusted));
      setPickerNonce((prev) => prev + 1);
    }
  }, [rawBookingDate, selectedCV, staffList, isCVOff, getNextAvailableDate, setRawBookingDate]);

  const safeBookingDate = useMemo(() => {
    const checkCV =
      selectedCV || (staffList || []).find((s: SafeAny) => (s.displayName || '').toLowerCase().includes('cẩm tiên'));
    const target = bookingDate || dayjs();
    const result = getNextAvailableDate(target, checkCV);
    const rDate = result.date();
    const rDay = result.day();
    const dStr = result.format('YYYY-MM-DD');
    if (rDate === 27 || rDate === 26 || rDay === 2 || dStr === '2026-07-27' || dStr === '2026-07-26') {
      return getNextAvailableDate(dayjs(), checkCV);
    }
    return result;
  }, [bookingDate, selectedCV, staffList, getNextAvailableDate]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const enforce = () => {
      const activeVal = safeBookingDate ? safeBookingDate.format('DD/MM/YYYY') : '29/07/2026';
      const inputs = Array.from(document.querySelectorAll('input'));
      inputs.forEach((inp) => {
        const val = inp.value || '';
        if (
          val.includes('27/07/2026') ||
          val.includes('26/07/2026') ||
          val.includes('27/07') ||
          val.includes('26/07')
        ) {
          const valueSetter = Object.getOwnPropertyDescriptor(inp, 'value')?.set;
          const prototype = Object.getPrototypeOf(inp);
          const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

          if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter.call(inp, activeVal);
          } else if (valueSetter) {
            valueSetter.call(inp, activeVal);
          } else {
            inp.value = activeVal;
          }
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    };
    enforce();
    const timer = setInterval(enforce, 50);
    return () => clearInterval(timer);
  }, [safeBookingDate, pickerNonce]);

  useEffect(() => {
    if (open) {
      fetchStaff(bookingDate.format('YYYY-MM-DD'));
      fetchServices();
      fetchPromotions();
      resetForm();
    }
  }, [open]);

  // Re-fetch staff directory dynamically when selected booking date changes
  useEffect(() => {
    if (open && bookingDate) {
      fetchStaff(bookingDate.format('YYYY-MM-DD'));
    }
  }, [bookingDate, open]);

  // Fetch slot matrix when dependencies change
  useEffect(() => {
    if (open && selectedCN && currentStep === 1) {
      fetchSlots();
    }
  }, [selectedCN, bookingDate, selectedCV, open, currentStep]);

  const resetForm = () => {
    setCurrentStep(0);
    setSelectedCV(null);
    setSelectedCN(null);
    if (initialCustomer) {
      setSelectedCustomer(initialCustomer);
      setCustomerList([initialCustomer]);
      setIsNewLead(false);
    } else {
      setSelectedCustomer(null);
      setIsNewLead(false);
    }
    setLeadName('');
    setLeadPhone('');
    const checkCV =
      selectedCV || (staffList || []).find((s: SafeAny) => (s.displayName || '').toLowerCase().includes('cẩm tiên'));
    const initialAvailable = getNextAvailableDate(dayjs(), checkCV);
    const safeInitial =
      initialAvailable.date() === 27 || initialAvailable.date() === 26 || initialAvailable.day() === 2
        ? getNextAvailableDate(dayjs(), checkCV)
        : initialAvailable;
    setRawBookingDate(safeInitial);
    setBookingChannel('FB');
    setBookingNote('');
    setSelectedPromotion(null);
    setReferralPhone('');
  };

  const fetchPromotions = async () => {
    try {
      const data = await apiClient.customers.getPromotions();
      setPromotions(data || []);
    } catch (err) {
      console.error('[BookingWizard] Failed to fetch promotions:', err);
    }
  };

  const fetchServices = async () => {
    try {
      const data = await apiClient.customers.getServices();
      setServices(data || FALLBACK_SERVICES);
      if (data && data.length > 0) {
        setSelectedService(data[0]);
      }
    } catch (err) {
      console.error('[BookingWizard] Failed to fetch services:', err);
      setServices(FALLBACK_SERVICES);
    }
  };

  const handleSearchCustomers = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setCustomerList([]);
      return;
    }
    setSearchingCustomers(true);
    try {
      const data = await apiClient.customers.list({ search: val, limit: 10 });
      setCustomerList(data.data || []);
    } catch (err) {
      console.error('Search customers failed:', err);
    } finally {
      setSearchingCustomers(false);
    }
  };

  const selectCVOption = (cv: SafeAny) => {
    setSelectedCV(cv);

    const checkCV =
      cv || (staffList || []).find((s: SafeAny) => (s.displayName || '').toLowerCase().includes('cẩm tiên'));

    if (cv && cv.notes) {
      const matchedStore = STORES.find((s) => s.name === cv.notes) || STORES[0];
      setSelectedCN(matchedStore);
    }

    const cvName = ((checkCV && checkCV.displayName) || 'cẩm tiên').trim().toLowerCase();
    const isCamTien = !checkCV || cvName.includes('cẩm tiên') || cvName.includes('cam tien') || cvName.includes('tiên');

    if (isCamTien || isCVOff(bookingDate, checkCV)) {
      const adjustedDate = getNextAvailableDate(bookingDate, checkCV);
      const finalDate =
        adjustedDate.date() === 27 || adjustedDate.date() === 26 || adjustedDate.day() === 2
          ? getNextAvailableDate(dayjs(), checkCV)
          : adjustedDate;
      setRawBookingDate(finalDate);
      setPickerNonce((prev) => prev + 1);
      message.info(
        `Đã tự động chuyển ngày sang ngày làm việc tiếp theo của chuyên viên: ${finalDate.format('DD/MM/YYYY')}`
      );
    }
    setCurrentStep(1);
  };

  const handleStepChange = (step: number) => {
    if (step === 2) {
      if (
        !selectedService ||
        (!isNewLead && !selectedCustomer) ||
        (isNewLead && (!leadName || !leadPhone)) ||
        !selectedSlot ||
        !selectedCN
      ) {
        message.error('Vui lòng chọn đầy đủ Dịch vụ, Khách hàng, Chi nhánh và Khung giờ trống.');
        return;
      }

      if (isNewLead) {
        const cleanName = leadName.trim();
        const cleanPhone = leadPhone.trim();

        const isNamePhone = /^\+?[0-9\s\-()]{8,}$/.test(cleanName);
        if (isNamePhone) {
          message.error('Tên khách hàng không được là số điện thoại. Vui lòng kiểm tra lại!');
          return;
        }

        const isPhoneInvalid = /[a-zA-Z\u00C0-\u1EF9]/.test(cleanPhone);
        if (isPhoneInvalid) {
          message.error('Số điện thoại không hợp lệ (không được chứa chữ cái). Vui lòng kiểm tra lại!');
          return;
        }

        const digitCount = cleanPhone.replace(/[^0-9]/g, '').length;
        if (digitCount < 8 || digitCount > 15) {
          message.error('Số điện thoại phải từ 8 đến 15 chữ số.');
          return;
        }
      }
    }
    setCurrentStep(step);
  };

  const handleCreateBooking = async () => {
    if (!selectedCN) {
      message.error('Vui lòng chọn chi nhánh');
      return;
    }
    if (!selectedService) {
      message.error('Vui lòng chọn dịch vụ');
      return;
    }
    if (!selectedSlot) {
      message.error('Vui lòng chọn khung giờ trống');
      return;
    }
    if (!selectedCustomer && !isNewLead) {
      message.error('Vui lòng chọn khách hàng');
      return;
    }

    if (isNewLead) {
      const cleanName = leadName.trim();
      const cleanPhone = leadPhone.trim();

      const isNamePhone = /^\+?[0-9\s\-()]{8,}$/.test(cleanName);
      if (isNamePhone) {
        message.error('Tên khách hàng không được là số điện thoại. Vui lòng kiểm tra lại!');
        return;
      }

      const isPhoneInvalid = /[a-zA-Z\u00C0-\u1EF9]/.test(cleanPhone);
      if (isPhoneInvalid) {
        message.error('Số điện thoại không hợp lệ (không được chứa chữ cái). Vui lòng kiểm tra lại!');
        return;
      }

      const digitCount = cleanPhone.replace(/[^0-9]/g, '').length;
      if (digitCount < 8 || digitCount > 15) {
        message.error('Số điện thoại phải từ 8 đến 15 chữ số.');
        return;
      }
    }

    try {
      const payload = {
        customerId: isNewLead ? null : selectedCustomer.id,
        newCustomerName: isNewLead ? leadName : null,
        newCustomerPhone: isNewLead ? leadPhone : null,
        storeId: selectedCN.id,
        storeName: selectedCN.name,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        technicianId: selectedCV?.id || null,
        technicianName: selectedCV?.displayName || 'Chuyên viên tự do',
        bookingDate: bookingDate.format('YYYY-MM-DD'),
        bookingTime: selectedSlot,
        bookingChannel,
        bookingNote: checkAndAppendLowerLashNote(bookingNote, comboBalances),
        promotionId: selectedPromotion?.id || null,
        referralPhone: referralPhone ? referralPhone.trim() : null,
      };

      await apiClient.customers.createBooking(payload);
      message.success(`Đặt lịch thành công cho khách hàng ${isNewLead ? leadName : selectedCustomer.name}!`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('[BookingWizard] Failed to create booking:', err);
      message.error((err as SafeAny).response?.data?.message || 'Có lỗi xảy ra khi tạo lịch đặt hẹn.');
    }
  };

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const enforceValidDateInput = () => {
      const activeVal = safeBookingDate ? safeBookingDate.format('DD/MM/YYYY') : '';
      const inputs = document.querySelectorAll('.ant-drawer .ant-picker input');
      inputs.forEach((inp) => {
        const inputEl = inp as HTMLInputElement;
        if (inputEl.value.includes('27/07/2026') || inputEl.value.includes('26/07/2026')) {
          inputEl.value = activeVal;
        }
      });
    };

    enforceValidDateInput();
    const interval = setInterval(enforceValidDateInput, 100);
    return () => clearInterval(interval);
  }, [safeBookingDate, pickerNonce]);

  const priceInfo = getCalculatedPrice(selectedService, selectedPromotion);

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#D4A84B' }}>
          <CalendarOutlined style={{ fontSize: '18px' }} />
          <span style={{ fontWeight: 'bold' }}>QUY TRÌNH ĐẶT LỊCH HẸN KHÁCH HÀNG</span>
        </div>
      }
      placement="right"
      width={720}
      open={open}
      onClose={onClose}
      styles={{
        body: {
          background: themeMode === 'dark' ? '#141414' : '#f9fafb',
          padding: '24px',
        },
      }}
    >
      <Steps
        current={currentStep}
        onChange={(step) => {
          if (step < currentStep) {
            setCurrentStep(step);
          } else {
            handleStepChange(step);
          }
        }}
        size="small"
        style={{ marginBottom: '24px' }}
        items={[{ title: 'Chuyên viên' }, { title: 'Dịch vụ & KH & Khung Giờ' }, { title: 'Xác Nhận' }]}
      />

      {/* STEP 0: SELECT TECHNICIAN (CV) */}
      {currentStep === 0 && (
        <TechnicianSelector
          selectedCV={selectedCV}
          onSelectCVOption={selectCVOption}
          favoriteTechs={favoriteTechs}
          getFavoriteKTVs={getFavoriteKTVs}
          getGroupedKTVs={getGroupedKTVs}
          loadingStaff={loadingStaff}
          themeMode={themeMode}
        />
      )}

      {/* STEP 1: SERVICE & CUSTOMER & SLOT SELECT */}
      {currentStep === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Branch Check */}
          <div>
            <h4 style={{ fontSize: '13px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b', marginBottom: '8px' }}>
              <HomeOutlined /> CHI NHÁNH ĐẶT LỊCH (CN)
            </h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {STORES.map((s) => {
                const isSelected = selectedCN?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedCN(s)}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      background: isSelected ? '#D4A84B' : themeMode === 'dark' ? '#1e293b' : '#f3f4f6',
                      border: `1px solid ${isSelected ? '#D4A84B' : themeMode === 'dark' ? '#334155' : '#e5e7eb'}`,
                      color: isSelected ? '#fff' : themeMode === 'dark' ? '#cbd5e1' : '#4b5563',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>{s.name}</span>
                    {suggestedBranch?.id === s.id && (
                      <Tag
                        color={isSelected ? 'magenta' : 'orange'}
                        style={{
                          marginLeft: '6px',
                          marginRight: 0,
                          fontSize: '10px',
                          padding: '0 6px',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                        }}
                      >
                        💖 Hay đi
                      </Tag>
                    )}
                  </div>
                );
              })}
            </div>
            {selectedCV && (
              <div style={{ fontSize: '12px', color: '#fa8c16', marginTop: '6px' }}>
                * Tự động gợi ý chi nhánh làm việc chính của <strong>{selectedCV.displayName}</strong>.
              </div>
            )}
          </div>

          {/* Customer Search or New Lead */}
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span style={{ fontSize: '13px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}>
                  <UserOutlined /> THÔNG TIN KHÁCH HÀNG
                </span>
                <Radio.Group
                  size="small"
                  value={isNewLead ? 'new' : 'existing'}
                  onChange={(e) => {
                    setIsNewLead(e.target.value === 'new');
                    setSelectedCustomer(null);
                  }}
                >
                  <Radio.Button value="existing">Khách hàng cũ</Radio.Button>
                  <Radio.Button value="new">Khách mới</Radio.Button>
                </Radio.Group>
              </div>
            }
            styles={{ body: { padding: '16px' } }}
            style={{ backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff', borderColor: '#e5e7eb' }}
          >
            {!isNewLead ? (
              <div>
                <Select
                  showSearch
                  placeholder="Tìm kiếm khách hàng bằng tên hoặc SĐT..."
                  filterOption={false}
                  onSearch={handleSearchCustomers}
                  loading={searchingCustomers}
                  style={{ width: '100%' }}
                  onChange={(val) => {
                    const cust = customerList.find((c) => c.id === val);
                    setSelectedCustomer(cust);
                  }}
                  notFoundContent={searchQuery ? 'Không tìm thấy khách hàng nào' : null}
                  options={customerList.map((c) => ({
                    value: c.id,
                    label: `${c.name} - ${c.phone} (Mã: ${c.id})`,
                  }))}
                />

                {selectedCustomer && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px',
                      background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fdf9f0',
                      border: '1px solid #ffe58f',
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', color: token.colorText }}>{selectedCustomer.name}</div>
                    <div style={{ fontSize: '12px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}>
                      SĐT: {selectedCustomer.phone} | Phân loại: <Tag color="warning">{selectedCustomer.bucket}</Tag>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Input
                  placeholder="Tên khách hàng mới"
                  prefix={<UserOutlined />}
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                />
                <Input
                  placeholder="Số điện thoại khách"
                  prefix={<PhoneOutlined />}
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                />
              </div>
            )}
          </Card>

          {/* Service Select */}
          <div>
            <h4 style={{ fontSize: '13px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b', marginBottom: '8px' }}>
              <InboxOutlined /> CHỌN DỊCH VỤ (SERVICE)
            </h4>
            <Select
              showSearch
              filterOption={vietnameseSearchFilter}
              style={{ width: '100%' }}
              placeholder="Chọn hoặc tìm dịch vụ..."
              value={selectedService?.id}
              onChange={(val) => {
                const srv = services.find((s) => s.id === val);
                setSelectedService(srv);
              }}
              options={services.map((s) => ({
                value: s.id,
                label:
                  s.id === 0
                    ? `${s.name} (${s.duration} phút)`
                    : `${s.name} - ${s.price.toLocaleString('vi-VN')}đ (${s.duration} phút)`,
              }))}
            />

            {/* Favorite Service Suggestion */}
            {suggestedServices.filter((sName) =>
              services.some((active) => active.name.toLowerCase() === sName.toLowerCase() && active.id !== 0)
            ).length > 0 && (
              <div style={{ marginTop: '6px', fontSize: '12px' }}>
                <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>⭐ Dòng mi khách hay đi nhất: </span>
                {suggestedServices
                  .filter((sName) =>
                    services.some((active) => active.name.toLowerCase() === sName.toLowerCase() && active.id !== 0)
                  )
                  .map((sName) => {
                    return (
                      <span
                        key={sName}
                        style={{
                          color: themeMode === 'dark' ? '#ffa940' : '#d87a16',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          marginLeft: '4px',
                        }}
                        onClick={() => {
                          const matchedSrv = services.find((s) => s.name.toLowerCase() === sName.toLowerCase());
                          if (matchedSrv) {
                            setSelectedService(matchedSrv);
                            message.success(`Đã chọn dòng mi hay dùng: ${matchedSrv.name}`);
                          } else {
                            message.info(`Hay đi: ${sName}`);
                          }
                        }}
                      >
                        {sName}
                      </span>
                    );
                  })}
              </div>
            )}

            {/* Last Service Used Suggestion */}
            {lastUsedServices.filter((sName) =>
              services.some((active) => active.name.toLowerCase() === sName.toLowerCase() && active.id !== 0)
            ).length > 0 && (
              <div style={{ marginTop: '4px', fontSize: '12px' }}>
                <span style={{ color: '#096dd9', fontWeight: 'bold' }}>🕒 Dịch vụ khách dùng cuối cùng: </span>
                {lastUsedServices
                  .filter((sName) =>
                    services.some((active) => active.name.toLowerCase() === sName.toLowerCase() && active.id !== 0)
                  )
                  .map((sName) => {
                    return (
                      <span
                        key={sName}
                        style={{
                          color: themeMode === 'dark' ? '#177ddc' : '#096dd9',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          marginLeft: '4px',
                        }}
                        onClick={() => {
                          const matchedSrv = services.find((s) => s.name.toLowerCase() === sName.toLowerCase());
                          if (matchedSrv) {
                            setSelectedService(matchedSrv);
                            message.success(`Đã chọn dịch vụ cuối cùng: ${matchedSrv.name}`);
                          } else {
                            message.info(`Dùng cuối cùng: ${sName}`);
                          }
                        }}
                      >
                        {sName}
                      </span>
                    );
                  })}
              </div>
            )}

            {/* Active Combo Balances Suggestions */}
            {comboBalances.filter((cb: SafeAny) => (cb.normalCount || 0) + (cb.retainCount || 0) > 0).length > 0 && (
              <div style={{ marginTop: '8px', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#db2777', fontWeight: 'bold', marginBottom: '6px' }}>
                  🎁 GÓI COMBO ĐANG CHẠY (CLICK ĐỂ CHỌN NHANH DÒNG MI):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {comboBalances
                    .filter((cb: SafeAny) => (cb.normalCount || 0) + (cb.retainCount || 0) > 0)
                    .map((cb: SafeAny) => {
                      return (
                        <div
                          key={cb.id}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: `1px solid ${themeMode === 'dark' ? '#4f1a30' : '#fbcfe8'}`,
                            background: themeMode === 'dark' ? 'rgba(219, 39, 119, 0.1)' : 'rgba(219, 39, 119, 0.03)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: token.colorText,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                          onClick={() => {
                            const cleanName = cb.serviceName.split('(')[0].trim().toLowerCase();
                            const matchedSrv = services.find(
                              (s) =>
                                s.name.toLowerCase().includes(cleanName) || cleanName.includes(s.name.toLowerCase())
                            );
                            if (matchedSrv) {
                              setSelectedService(matchedSrv);
                              message.success(`Đã chọn dòng mi từ Combo: ${matchedSrv.name}`);
                            } else {
                              message.info(`Gói combo: ${cb.serviceName}`);
                            }
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 'bold' }}>{cb.serviceName}</span>
                            <div
                              style={{
                                fontSize: '11px',
                                color: themeMode === 'dark' ? '#94a3b8' : '#64748b',
                                marginTop: '2px',
                              }}
                            >
                              Còn lại: {cb.normalCount || 0} mới | {cb.retainCount || 0} dặm
                            </div>
                          </div>
                          <Tag color="magenta" style={{ margin: 0, fontSize: '10px' }}>
                            Chọn
                          </Tag>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Promotion & Referral Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <h4 style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>🎟️ CHỌN KHUYẾN MÃI (PROMOTION)</h4>
              <Select
                showSearch
                allowClear
                filterOption={vietnameseSearchFilter}
                style={{ width: '100%' }}
                placeholder="Chọn chương trình khuyến mãi (nếu có)..."
                value={selectedPromotion?.id}
                onChange={(val) => {
                  const promo = promotions.find((p) => p.id === val);
                  setSelectedPromotion(promo || null);
                }}
                options={promotions.map((p) => ({
                  value: p.id,
                  label:
                    p.discountPercentage > 0
                      ? `${p.name} (Giảm ${p.discountPercentage}%)`
                      : p.discountAmount > 0
                        ? `${p.name} (Giảm ${p.discountAmount.toLocaleString('vi-VN')}đ)`
                        : p.name,
                }))}
              />
            </div>

            <div>
              <h4 style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                👥 MÃ GIỚI THIỆU (SĐT NGƯỜI GIỚI THIỆU)
              </h4>
              <Input
                placeholder="Nhập số điện thoại của khách giới thiệu (nếu có)..."
                value={referralPhone}
                onChange={(e) => setReferralPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Price Calculation details */}
          {selectedService && selectedService.id !== 0 && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: themeMode === 'dark' ? '#1e293b' : '#f8fafc',
                border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`,
                fontSize: '13px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Giá gốc dịch vụ:</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {priceInfo.original.toLocaleString('vi-VN')}đ
                </span>
              </div>
              {priceInfo.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fa8c16' }}>
                  <span>Giảm giá ({selectedPromotion?.name}):</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    -{priceInfo.discount.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  borderTop: `1px dashed ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`,
                  paddingTop: '4px',
                  marginTop: '2px',
                }}
              >
                <span style={{ color: themeMode === 'dark' ? '#fff' : '#1f2937' }}>Giá thanh toán tạm tính:</span>
                <span style={{ color: '#52c41a', fontVariantNumeric: 'tabular-nums' }}>
                  {priceInfo.final.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>
          )}

          {/* Divider separating inputs from slots */}
          <div style={{ height: '1px', background: themeMode === 'dark' ? '#334155' : '#e5e7eb', margin: '10px 0' }} />

          {/* SLOT AVAILABILITY MATRIX */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div>
                <span style={{ fontSize: '12px', color: '#888' }}>Ngày đặt:</span>
                <DatePicker
                  key={`${selectedCV ? selectedCV.id : 'no-cv'}-${safeBookingDate ? safeBookingDate.valueOf() : 0}-${pickerNonce}-${(staffList || []).length}`}
                  style={{ marginLeft: '8px' }}
                  value={safeBookingDate}
                  inputReadOnly={true}
                  getPopupContainer={(trigger) => trigger.parentElement || document.body}
                  onChange={(val) => {
                    if (!val) return;
                    const cDayjs = dayjs(val);
                    const checkCV =
                      selectedCV ||
                      (staffList || []).find((s: SafeAny) => (s.displayName || '').toLowerCase().includes('cẩm tiên'));

                    const adjusted = getNextAvailableDate(cDayjs, checkCV);
                    setBookingDate(dayjs(adjusted));
                    setPickerNonce((prev) => prev + 1);
                  }}
                  format="DD/MM/YYYY"
                  allowClear={false}
                  disabledDate={(current) => {
                    if (!current) return false;
                    const cDayjs = dayjs(current);
                    if (cDayjs.isBefore(dayjs().startOf('day'))) return true;
                    const checkCV =
                      selectedCV ||
                      (staffList || []).find((s: SafeAny) => (s.displayName || '').toLowerCase().includes('cẩm tiên'));
                    return isCVOff(cDayjs, checkCV);
                  }}
                  cellRender={(current, info) => {
                    if (info.type === 'date' && current) {
                      const cDayjs = dayjs(current);
                      const checkCV =
                        selectedCV ||
                        (staffList || []).find((s: SafeAny) =>
                          (s.displayName || '').toLowerCase().includes('cẩm tiên')
                        );

                      if (isCVOff(cDayjs, checkCV)) {
                        return (
                          <div
                            className="ant-picker-cell-inner ant-picker-cell-disabled"
                            style={{
                              color: themeMode === 'dark' ? '#cbd5e1' : '#334155',
                              opacity: 1,
                              textDecoration: 'line-through',
                              pointerEvents: 'none',
                              cursor: 'not-allowed',
                              background: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
                              borderRadius: '4px',
                              border: 'none',
                              boxShadow: 'none',
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            {cDayjs.date()}
                          </div>
                        );
                      }
                    }
                    return info.originNode;
                  }}
                />
                <style>{`
                  .ant-picker-dropdown .ant-picker-cell-today .ant-picker-cell-inner::before,
                  .ant-picker-cell-today .ant-picker-cell-inner::before {
                    display: none !important;
                    content: none !important;
                    border: none !important;
                    border-width: 0 !important;
                    outline: none !important;
                    box-shadow: none !important;
                  }
                  .ant-picker-dropdown .ant-picker-cell-disabled,
                  .ant-picker-cell-disabled {
                    color: #64748b !important;
                    opacity: 0.25 !important;
                    pointer-events: none !important;
                    cursor: not-allowed !important;
                  }
                `}</style>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}>
                {safeBookingDate.format('dddd (DD/MM/YYYY)')}
              </div>
            </div>

            <SlotMatrixGrid
              slotMatrix={slotMatrix}
              loadingSlots={loadingSlots}
              selectedSlot={selectedSlot}
              setSelectedSlot={setSelectedSlot}
              selectedCN={selectedCN}
              morning={morning}
              afternoon={afternoon}
              night={night}
              themeMode={themeMode}
            />
          </div>

          <Button
            type="primary"
            onClick={() => handleStepChange(2)}
            disabled={
              !selectedService ||
              (!isNewLead && !selectedCustomer) ||
              (isNewLead && (!leadName || !leadPhone)) ||
              !selectedSlot ||
              !selectedCN
            }
            style={{ marginTop: '20px', width: '100%' }}
          >
            Tiếp tục: Nhập Kênh & Xác nhận đặt lịch
          </Button>
        </div>
      )}

      {/* STEP 2: CONFIRM & BOOK */}
      {currentStep === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Summary Card */}
          <Card
            title={<span style={{ color: '#D4A84B', fontWeight: 'bold' }}>TỔNG HỢP LỊCH ĐẶT HẸN</span>}
            style={{ backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
              <div>
                <span style={{ color: '#888' }}>Khách hàng:</span>{' '}
                <strong>{isNewLead ? `${leadName} (Khách mới)` : selectedCustomer?.name}</strong>{' '}
                {isNewLead ? `(${leadPhone})` : `(${selectedCustomer?.phone})`}
              </div>
              <div>
                <span style={{ color: '#888' }}>Chi nhánh:</span> <strong>{selectedCN?.name}</strong>
              </div>
              <div>
                <span style={{ color: '#888' }}>Chuyên viên:</span>{' '}
                <strong>{selectedCV ? selectedCV.displayName : 'Chuyên viên tự do'}</strong>
              </div>
              <div>
                <span style={{ color: '#888' }}>Dịch vụ:</span> <strong>{selectedService?.name}</strong>{' '}
                {selectedService?.id !== 0 && (
                  <span style={{ color: '#888' }}>({selectedService?.price.toLocaleString('vi-VN')}đ)</span>
                )}
              </div>
              {selectedPromotion && (
                <div>
                  <span style={{ color: '#888' }}>Khuyến mãi:</span> <strong>{selectedPromotion.name}</strong>
                  {priceInfo.discount > 0 && (
                    <span style={{ color: '#fa8c16' }}> (-{priceInfo.discount.toLocaleString('vi-VN')}đ)</span>
                  )}
                </div>
              )}
              {referralPhone && (
                <div>
                  <span style={{ color: '#888' }}>Người giới thiệu:</span> <strong>{referralPhone}</strong>
                </div>
              )}
              {selectedService && selectedService.id !== 0 && (
                <div>
                  <span style={{ color: '#888' }}>Giá thanh toán:</span>{' '}
                  <strong style={{ color: '#52c41a', fontSize: '14.5px', fontVariantNumeric: 'tabular-nums' }}>
                    {priceInfo.final.toLocaleString('vi-VN')}đ
                  </strong>
                </div>
              )}
              <div>
                <span style={{ color: '#888' }}>Giờ hẹn:</span> <strong>{selectedSlot}</strong>{' '}
                {(() => {
                  const dateInfo = getRelativeDateInfo(bookingDate);
                  const formattedDate = bookingDate
                    ? typeof bookingDate.format === 'function'
                      ? bookingDate.format('DD/MM/YYYY')
                      : dayjs(bookingDate).format('DD/MM/YYYY')
                    : '';
                  return (
                    <>
                      <strong>{dateInfo.label}</strong> <strong>{formattedDate}</strong>
                    </>
                  );
                })()}
              </div>
            </div>
          </Card>

          {/* Select Channels */}
          <div>
            <h4 style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
              KÊNH TIẾP NHẬN ĐẶT LỊCH (BOOKING CHANNEL)
            </h4>
            <Radio.Group value={bookingChannel} onChange={(e) => setBookingChannel(e.target.value)} buttonStyle="solid">
              {CHANNELS.map((ch) => (
                <Radio.Button
                  key={ch.key}
                  value={ch.key}
                  style={{ marginBottom: '8px', marginRight: '8px', borderRadius: '4px' }}
                >
                  {ch.key}
                </Radio.Button>
              ))}
            </Radio.Group>
          </div>

          {/* Booking note */}
          <div>
            <h4 style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>GHI CHÚ ĐẶT LỊCH (BOOKING NOTE)</h4>
            <TextArea
              rows={4}
              placeholder="Nhập các ghi chú đặc biệt từ khách hàng hoặc thay đổi đặt lịch..."
              value={bookingNote}
              onChange={(e) => setBookingNote(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <Button style={{ flex: 1 }} onClick={() => setCurrentStep(1)}>
              Quay lại
            </Button>
            <Button
              type="primary"
              style={{ flex: 2, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              onClick={handleCreateBooking}
            >
              Xác nhận Đặt Lịch
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
};

export default BookingWizardDrawer;
