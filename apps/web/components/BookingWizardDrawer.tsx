'use client';

import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Steps,
  Button,
  Select,
  DatePicker,
  Radio,
  Input,
  theme,
  message,
  Card,
  Avatar,
  Tag,
  Row,
  Col,
  List,
  Badge,
  Spin
} from 'antd';
import {
  UserOutlined,
  HomeOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  PhoneOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  SmileOutlined,
  InboxOutlined,
  HeartFilled
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';

const { TextArea } = Input;

interface BookingWizardDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialCustomer?: any;
}

const STORES = [
  { id: 16, name: 'Estella Place' },
  { id: 6, name: 'De Tham' },
  { id: 2, name: 'Phan Xích Long' }
];

const FALLBACK_SERVICES = [
  { id: 0, name: 'Any Lashes / Any Services', price: 0, duration: 90 }
];

const CHANNELS = [
  { key: 'FB', label: 'FB (Facebook)' },
  { key: 'ZALO', label: 'ZALO' },
  { key: 'SMS', label: 'SMS' },
  { key: 'HOTLINE', label: 'HOTLINE' },
  { key: 'WA', label: 'WA (WhatsApp)' },
  { key: 'VL', label: 'VL (Viber)' },
  { key: 'GB', label: 'GB (Google Business)' }
];

const getOffDaysText = (offDays?: string[]) => {
  if (!offDays || offDays.length === 0) return '';
  const weekdayMap: { [key: string]: string } = {
    '1': 'T2',
    '2': 'T3',
    '3': 'T4',
    '4': 'T5',
    '5': 'T6',
    '6': 'T7',
    '7': 'CN'
  };
  return 'Off: ' + offDays.map(d => weekdayMap[d]).filter(Boolean).join(', ');
};

const BookingWizardDrawer: React.FC<BookingWizardDrawerProps> = ({
  open,
  onClose,
  onSuccess,
  initialCustomer
}) => {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [selectedCV, setSelectedCV] = useState<any>(null); // Specific CV or null for "No CV"
  const [selectedCN, setSelectedCN] = useState<any>(null); // Branch/Store
  const [searchQuery, setSearchQuery] = useState('');
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  
  // Promotion & Referral states
  const [promotions, setPromotions] = useState<any[]>([]);
  const [selectedPromotion, setSelectedPromotion] = useState<any>(null);
  const [referralPhone, setReferralPhone] = useState('');
  
  // Custom lead fields for new customer
  const [isNewLead, setIsNewLead] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');

  const [selectedService, setSelectedService] = useState<any>(null);
  const [services, setServices] = useState<any[]>(FALLBACK_SERVICES);
  const [bookingDate, setBookingDate] = useState<dayjs.Dayjs>(dayjs().add(1, 'day'));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingChannel, setBookingChannel] = useState('FB');
  const [bookingNote, setBookingNote] = useState('');

  // Active Staff List from Backend
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Availability matrix state (based on database calculations)
  const [slotMatrix, setSlotMatrix] = useState<{ [time: string]: { available: number; roster: number } }>({});
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Favorite technicians state
  const [favoriteTechs, setFavoriteTechs] = useState<string[]>([]);
  const [comboBalances, setComboBalances] = useState<any[]>([]);
  const [suggestedServices, setSuggestedServices] = useState<string[]>([]);
  const [lastUsedServices, setLastUsedServices] = useState<string[]>([]);
  const [suggestedBranch, setSuggestedBranch] = useState<any>(null);

  const hasActiveLowerLashCombo = (balances: any[]) => {
    return balances.some(cb => {
      const isCountActive = (cb.normalCount || 0) + (cb.retainCount || 0) > 0;
      const isExpired = cb.dateExpired ? new Date(cb.dateExpired) < new Date() : false;
      const name = (cb.serviceName || '').toLowerCase();
      const isLower = name.includes('mi dưới') || name.includes('dưới') || name.includes('lower') || name.includes('under');
      return isCountActive && !isExpired && isLower;
    });
  };

  const hasActiveUpperLashCombo = (balances: any[]) => {
    return balances.some(cb => {
      const isCountActive = (cb.normalCount || 0) + (cb.retainCount || 0) > 0;
      const isExpired = cb.dateExpired ? new Date(cb.dateExpired) < new Date() : false;
      const name = (cb.serviceName || '').toLowerCase();
      const isUpper = name.includes('trên') || name.includes('volume') || name.includes('classic') || name.includes('lashes') || name.includes('katun') || name.includes('mi ');
      const isLower = name.includes('mi dưới') || name.includes('dưới') || name.includes('lower') || name.includes('under');
      return isCountActive && !isExpired && isUpper && !isLower;
    });
  };

  const checkAndAppendLowerLashNote = (note: string, balances: any[]) => {
    if (hasActiveLowerLashCombo(balances) && hasActiveUpperLashCombo(balances)) {
      const suffix = '(Có gói mi dưới)';
      if (!note.includes('mi dưới') && !note.includes('mi duoi')) {
        return note ? `${note.trim()} ${suffix}` : suffix;
      }
    }
    return note;
  };

  useEffect(() => {
    if (selectedCustomer?.id) {
      api.get(`/customers/${selectedCustomer.id}/detailed`)
        .then(res => {
          const bookings = res.data.bookings || [];
          const balances = res.data.comboBalances || [];
          setComboBalances(balances);

          const techCounts: { [key: string]: number } = {};
          bookings.forEach((b: any) => {
            const isCompleted = b.orderState === 'ServiceCompleted' || b.orderState === 'Completed';
            if (isCompleted && b.technicianName && b.technicianName !== 'Unknown' && b.technicianName !== 'Kỹ thuật viên') {
              const name = b.technicianName.trim();
              if (!name.includes('(Đã nghỉ)')) {
                techCounts[name] = (techCounts[name] || 0) + 1;
              }
            }
          });
          const sorted = Object.entries(techCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
          setFavoriteTechs(sorted.slice(0, 2).map(t => t.name));

          // Count services in completed bookings
          const srvCounts: { [key: string]: number } = {};
          bookings.forEach((b: any) => {
            const isCompleted = b.orderState === 'ServiceCompleted' || b.orderState === 'Completed';
            if (isCompleted && b.services) {
              b.services.forEach((sName: string) => {
                srvCounts[sName] = (srvCounts[sName] || 0) + 1;
              });
            }
          });
          const sortedSrvs = Object.entries(srvCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
          setSuggestedServices(sortedSrvs.slice(0, 1).map(s => s.name));

          // Find last completed booking services
          let lastSrvs: string[] = [];
          for (const b of bookings) {
            const isCompleted = b.orderState === 'ServiceCompleted' || b.orderState === 'Completed';
            if (isCompleted && b.services && b.services.length > 0) {
              lastSrvs = b.services;
              break;
            }
          }
          setLastUsedServices(lastSrvs);

          // Count branches in bookings
          const branchCounts: { [key: number]: number } = {};
          bookings.forEach((b: any) => {
            const isCompleted = b.orderState === 'ServiceCompleted' || b.orderState === 'Completed';
            if (isCompleted && b.storeId) {
              const sId = Number(b.storeId);
              branchCounts[sId] = (branchCounts[sId] || 0) + 1;
            }
          });
          const sortedBranches = Object.entries(branchCounts)
            .map(([id, count]) => ({ id: Number(id), count }))
            .sort((a, b) => b.count - a.count);
          if (sortedBranches.length > 0) {
            const topStoreId = sortedBranches[0].id;
            const matchedStore = STORES.find(s => s.id === topStoreId);
            if (matchedStore) {
              setSuggestedBranch(matchedStore);
              if (!selectedCN) {
                setSelectedCN(matchedStore);
              }
            }
          }
        })
        .catch(err => console.error('Failed to fetch favorite technicians:', err));
    } else {
      setFavoriteTechs([]);
      setComboBalances([]);
      setSuggestedServices([]);
      setLastUsedServices([]);
      setSuggestedBranch(null);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (open) {
      fetchStaff(bookingDate.format('YYYY-MM-DD'));
      fetchServices();
      fetchPromotions();
      resetForm();
    }
  }, [open]);

  const fetchPromotions = async () => {
    try {
      const res = await api.get('/customers/promotions');
      setPromotions(res.data || []);
    } catch (err) {
      console.error('[BookingWizard] Failed to fetch promotions:', err);
    }
  };

  // Re-fetch staff directory dynamically when selected booking date changes
  useEffect(() => {
    if (open && bookingDate) {
      fetchStaff(bookingDate.format('YYYY-MM-DD'));
    }
  }, [bookingDate, open]);

  // Fetch slot matrix from real API when entering Step 1 (merged step) or when dependencies change
  useEffect(() => {
    if (open && selectedCN && currentStep === 1) {
      fetchSlotsFromAPI();
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
    setSelectedService(services[0] || FALLBACK_SERVICES[0]);
    setBookingDate(dayjs().add(1, 'day'));
    setSelectedSlot(null);
    setBookingChannel('FB');
    setBookingNote('');
    setSelectedPromotion(null);
    setReferralPhone('');
  };

  const fetchServices = async () => {
    try {
      const res = await api.get('/customers/services');
      setServices(res.data || FALLBACK_SERVICES);
      if (res.data && res.data.length > 0) {
        setSelectedService(res.data[0]);
      }
    } catch (err) {
      console.error('[BookingWizard] Failed to fetch services:', err);
      setServices(FALLBACK_SERVICES);
    }
  };

  const fetchStaff = async (dateStr?: string) => {
    setLoadingStaff(true);
    try {
      const res = await api.get('/customers/staff', {
        params: { date: dateStr }
      });
      // Filter out specialists/KTVs
      setStaffList(res.data || []);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    } finally {
      setLoadingStaff(false);
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
      const res = await api.get('/customers', {
        params: { search: val, limit: 10 }
      });
      setCustomerList(res.data.data || []);
    } catch (err) {
      console.error('Search customers failed:', err);
    } finally {
      setSearchingCustomers(false);
    }
  };

  const fetchSlotsFromAPI = async () => {
    if (!selectedCN) {
      console.log('[BookingWizard] Cannot fetch slots: selectedCN is null');
      return;
    }
    console.log('[BookingWizard] Fetching slots for:', {
      date: bookingDate.format('YYYY-MM-DD'),
      storeName: selectedCN.name,
      technicianId: selectedCV?.id
    });
    setLoadingSlots(true);
    try {
      const res = await api.get('/customers/booking-slots', {
        params: {
          date: bookingDate.format('YYYY-MM-DD'),
          storeName: selectedCN.name,
          technicianId: selectedCV?.id || undefined
        }
      });
      console.log('[BookingWizard] Fetch slots success, data:', res.data);
      setSlotMatrix(res.data || {});
    } catch (err) {
      console.error('[BookingWizard] Failed to fetch slots:', err);
      message.error('Không thể tải ma trận trống lịch từ hệ thống');
    } finally {
      setLoadingSlots(false);
    }
  };

  const getNextAvailableDate = (baseDate: dayjs.Dayjs, cv: any) => {
    if (!cv || !cv.offDays || cv.offDays.length === 0) return baseDate;
    let target = baseDate;
    for (let i = 0; i < 14; i++) {
      const dayOfWeek = target.day();
      const dbDayStr = dayOfWeek === 0 ? '7' : String(dayOfWeek);
      if (!cv.offDays.includes(dbDayStr)) {
        return target;
      }
      target = target.add(1, 'day');
    }
    return baseDate;
  };

  const selectCVOption = (cv: any) => {
    setSelectedCV(cv);
    // Auto map branch/store if KTV belongs to a store
    if (cv && cv.notes) {
      const matchedStore = STORES.find(s => s.name === cv.notes) || STORES[0];
      setSelectedCN(matchedStore);
    }
    // Auto adjust booking date if current date is specialist's off day
    if (cv && cv.offDays && cv.offDays.length > 0) {
      const dayOfWeek = bookingDate.day();
      const dbDayStr = dayOfWeek === 0 ? '7' : String(dayOfWeek);
      if (cv.offDays.includes(dbDayStr)) {
        const adjustedDate = getNextAvailableDate(bookingDate, cv);
        setBookingDate(adjustedDate);
        message.info(`Đã tự động chuyển ngày sang ngày làm việc tiếp theo của chuyên viên: ${adjustedDate.format('DD/MM/YYYY')}`);
      }
    }
    setCurrentStep(1);
  };

  const getCalculatedPrice = () => {
    if (!selectedService) return { original: 0, discount: 0, final: 0 };
    const original = selectedService.price || 0;
    let discount = 0;
    if (selectedPromotion) {
      if (selectedPromotion.discountPercentage > 0) {
        discount = Math.round((original * selectedPromotion.discountPercentage) / 100);
      } else if (selectedPromotion.discountAmount > 0) {
        discount = selectedPromotion.discountAmount;
      }
    }
    return {
      original,
      discount,
      final: Math.max(0, original - discount)
    };
  };

  const priceInfo = getCalculatedPrice();

  const getGroupedKTVs = () => {
    const ktvs = staffList.filter(s => s.role === 'technician' || s.role === 'specialist' || s.notes?.includes('KTV'));
    const groups: { [storeName: string]: any[] } = {};

    ktvs.forEach(staff => {
      const store = staff.notes || 'Khác';
      if (!groups[store]) {
        groups[store] = [];
      }
      groups[store].push(staff);
    });

    return groups;
  };

  const getFavoriteKTVs = () => {
    const ktvs = staffList.filter(s => s.role === 'technician' || s.role === 'specialist' || s.notes?.includes('KTV'));
    return ktvs.filter(staff => favoriteTechs.includes(staff.displayName?.trim()));
  };

  const handleStepChange = (step: number) => {
    // If navigating to step 2 (Confirm step), we must validate first
    if (step === 2) {
      if (!selectedService || 
          (!isNewLead && !selectedCustomer) || 
          (isNewLead && (!leadName || !leadPhone)) ||
          !selectedSlot ||
          !selectedCN) {
        message.error('Vui lòng chọn đầy đủ Dịch vụ, Khách hàng, Chi nhánh và Khung giờ trống.');
        return;
      }

      if (isNewLead) {
        const cleanName = leadName.trim();
        const cleanPhone = leadPhone.trim();

        // Check if name looks like phone (digits, spaces, plus, hyphens, parentheses only)
        const isNamePhone = /^\+?[0-9\s\-()]{8,}$/.test(cleanName);
        if (isNamePhone) {
          message.error('Tên khách hàng không được là số điện thoại. Vui lòng kiểm tra lại!');
          return;
        }

        // Check if phone number contains letters
        const isPhoneInvalid = /[a-zA-Z\u00C0-\u1EF9]/.test(cleanPhone);
        if (isPhoneInvalid) {
          message.error('Số điện thoại không hợp lệ (không được chứa chữ cái). Vui lòng kiểm tra lại!');
          return;
        }

        // Check length of phone number
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
        referralPhone: referralPhone ? referralPhone.trim() : null
      };

      await api.post('/customers/booking', payload);
      message.success(`Đặt lịch thành công cho khách hàng ${isNewLead ? leadName : selectedCustomer.name}!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[BookingWizard] Failed to create booking:', err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi tạo lịch đặt hẹn.');
    }
  };

  // Helper to split slots into morning, afternoon, night
  const getCategorizedSlots = () => {
    const morning: string[] = [];
    const afternoon: string[] = [];
    const night: string[] = [];

    Object.keys(slotMatrix).sort().forEach(time => {
      const hour = parseInt(time.split(':')[0], 10);
      if (hour < 12) {
        morning.push(time);
      } else if (hour < 18) {
        afternoon.push(time);
      } else {
        night.push(time);
      }
    });

    return { morning, afternoon, night };
  };

  const { morning, afternoon, night } = getCategorizedSlots();

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
          padding: '24px'
        },
        header: {
          background: themeMode === 'dark' ? '#1e293b' : '#ffffff',
          borderBottom: `1px solid ${themeMode === 'dark' ? '#334155' : '#e5e7eb'}`
        }
      }}
    >
      <Steps
        current={currentStep}
        onChange={handleStepChange}
        size="small"
        style={{ marginBottom: '24px' }}
        items={[
          { title: 'Chuyên viên' },
          { title: 'Dịch vụ & KH & Khung Giờ' },
          { title: 'Xác Nhận' }
        ]}
      />

      {/* STEP 0: SELECT TECHNICIAN (CV) */}
      {currentStep === 0 && (
        <div>
          <h3 style={{ fontSize: '15px', color: '#888', marginBottom: '16px' }}>
            Bước 1: Khách hàng muốn đặt Chuyên viên nào?
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Free/Auto Specialist */}
            <Card
              hoverable
              styles={{ body: { padding: '16px' } }}
              style={{
                borderColor: selectedCV === null ? '#D4A84B' : 'transparent',
                backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff'
              }}
              onClick={() => selectCVOption(null)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Avatar size="large" icon={<SmileOutlined />} style={{ backgroundColor: '#D4A84B' }} />
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '15px', color: token.colorText }}>
                    Không chỉ định chuyên viên (Chuyên viên Tự Do)
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#888', marginTop: '2px' }}>
                    Sắp xếp ngẫu nhiên chuyên viên trống lịch tại Chi nhánh
                  </div>
                </div>
              </div>
            </Card>

            {/* Favorite Stylist Suggestion Section */}
            {favoriteTechs.length > 0 && getFavoriteKTVs().length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ 
                  fontWeight: 'bold', 
                  fontSize: '13px', 
                  color: '#db2777', 
                  marginBottom: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px' 
                }}>
                  <HeartFilled style={{ color: '#db2777' }} /> GỢI Ý CHUYÊN VIÊN ƯA THÍCH CỦA KHÁCH
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {getFavoriteKTVs().map((staff: any) => {
                    const isSelected = selectedCV?.id === staff.id;
                    return (
                      <Card
                        key={`fav-${staff.id}`}
                        hoverable
                        size="small"
                        styles={{ body: { padding: '12px 16px' } }}
                        style={{
                          borderColor: isSelected ? '#db2777' : (themeMode === 'dark' ? '#4f1a30' : '#fbcfe8'),
                          backgroundColor: isSelected 
                            ? (themeMode === 'dark' ? 'rgba(219, 39, 119, 0.15)' : 'rgba(219, 39, 119, 0.05)') 
                            : (themeMode === 'dark' ? '#1e293b' : '#ffffff'),
                          boxShadow: isSelected ? '0 0 0 1px #db2777' : 'none',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => selectCVOption(staff)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <Avatar src={staff.avatar || staff.avatarUrl || undefined} icon={<UserOutlined />} style={{ backgroundColor: '#db2777' }} />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ fontWeight: 'bold', color: token.colorText }}>{staff.displayName}</div>
                                <Tag color="magenta" style={{ margin: 0, fontSize: '10.5px' }}>Ưa thích nhất</Tag>
                              </div>
                              <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                                Chi nhánh: {staff.notes || 'Khác'}
                                {staff.offDays && staff.offDays.length > 0 && (
                                  <span style={{ color: '#ef4444', marginLeft: '8px', fontWeight: 'bold' }}>
                                    | {getOffDaysText(staff.offDays)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ marginTop: '8px', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', color: '#888' }}>
              HOẶC CHỌN CHUYÊN VIÊN YÊU CẦU
            </div>

            {loadingStaff ? (
              <div style={{ textAlign: 'center', padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <Spin />
                <div style={{ color: '#888', fontSize: '13px' }}>Đang tải danh sách chuyên viên...</div>
              </div>
            ) : (
              Object.entries(getGroupedKTVs()).map(([storeName, members]) => (
                <div key={storeName} style={{ marginBottom: '24px' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    marginBottom: '12px', 
                    paddingBottom: '6px',
                    borderBottom: `1px solid ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`
                  }}>
                    <HomeOutlined style={{ color: '#D4A84B' }} />
                    <span style={{ fontWeight: 'bold', fontSize: '13.5px', color: token.colorText }}>
                      {storeName}
                    </span>
                    <Badge 
                      count={members.length} 
                      style={{ 
                        backgroundColor: themeMode === 'dark' ? '#334155' : '#f1f5f9', 
                        color: themeMode === 'dark' ? '#cbd5e1' : '#64748b',
                        boxShadow: 'none'
                      }} 
                    />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {members.map((staff: any) => (
                      <Card
                        key={staff.id}
                        hoverable
                        size="small"
                        styles={{ body: { padding: '12px 16px' } }}
                        style={{
                          borderColor: selectedCV?.id === staff.id ? '#D4A84B' : (themeMode === 'dark' ? '#334155' : '#e2e8f0'),
                          backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
                          boxShadow: selectedCV?.id === staff.id ? '0 0 0 1px #D4A84B' : 'none',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => selectCVOption(staff)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <Avatar src={staff.avatar || staff.avatarUrl || undefined} icon={<UserOutlined />} style={{ backgroundColor: '#D4A84B' }} />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ fontWeight: 'bold', color: token.colorText }}>{staff.displayName}</div>
                                {favoriteTechs.includes(staff.displayName?.trim()) && (
                                  <Tag color="magenta" style={{ margin: 0, fontSize: '10.5px' }}>Ưa thích</Tag>
                                )}
                              </div>
                              <div style={{ fontSize: '12px', color: '#888' }}>
                                Vai trò: Chuyên viên
                                {staff.offDays && staff.offDays.length > 0 && (
                                  <span style={{ color: '#ef4444', marginLeft: '8px', fontWeight: 'bold' }}>
                                    | {getOffDaysText(staff.offDays)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* STEP 1: SERVICE & CUSTOMER & SLOT SELECT */}
      {currentStep === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Branch Check */}
          <div>
            <h4 style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
              <HomeOutlined /> CHI NHÁNH ĐẶT LỊCH (CN)
            </h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {STORES.map(s => {
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
                      background: isSelected 
                        ? '#D4A84B' 
                        : (themeMode === 'dark' ? '#1e293b' : '#f3f4f6'),
                      border: `1px solid ${isSelected ? '#D4A84B' : (themeMode === 'dark' ? '#334155' : '#e5e7eb')}`,
                      color: isSelected ? '#fff' : (themeMode === 'dark' ? '#cbd5e1' : '#4b5563'),
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{s.name}</span>
                    {suggestedBranch?.id === s.id && (
                      <Tag 
                        color={isSelected ? "magenta" : "orange"} 
                        style={{ 
                          marginLeft: '6px', 
                          marginRight: 0, 
                          fontSize: '10px', 
                          padding: '0 6px',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: 'bold'
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
                <span style={{ fontSize: '13px', color: '#888' }}>
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
                    const cust = customerList.find(c => c.id === val);
                    setSelectedCustomer(cust);
                  }}
                  notFoundContent={searchQuery ? 'Không tìm thấy khách hàng nào' : null}
                  options={customerList.map(c => ({
                    value: c.id,
                    label: `${c.name} - ${c.phone} (Mã: ${c.id})`
                  }))}
                />
                
                {selectedCustomer && (
                  <div style={{
                    marginTop: '12px',
                    padding: '10px',
                    background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fdf9f0',
                    border: '1px solid #ffe58f',
                    borderRadius: '6px'
                  }}>
                    <div style={{ fontWeight: 'bold', color: token.colorText }}>{selectedCustomer.name}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
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
            <h4 style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
              <InboxOutlined /> CHỌN DỊCH VỤ (SERVICE)
            </h4>
             <Select
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%' }}
              placeholder="Chọn hoặc tìm dịch vụ..."
              value={selectedService?.id}
              onChange={(val) => {
                const srv = services.find(s => s.id === val);
                setSelectedService(srv);
              }}
              options={services.map(s => ({
                value: s.id,
                label: s.id === 0 
                  ? `${s.name} (${s.duration} phút)`
                  : `${s.name} - ${s.price.toLocaleString('vi-VN')}đ (${s.duration} phút)`
              }))}
            />

            {/* Favorite Service Suggestion */}
            {suggestedServices.filter(sName => services.some(active => active.name.toLowerCase() === sName.toLowerCase() && active.id !== 0)).length > 0 && (
              <div style={{ marginTop: '6px', fontSize: '12px' }}>
                <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>⭐ Dòng mi khách hay đi nhất: </span>
                {suggestedServices
                  .filter(sName => services.some(active => active.name.toLowerCase() === sName.toLowerCase() && active.id !== 0))
                  .map(sName => {
                    return (
                      <span 
                        key={sName}
                        style={{ 
                          color: themeMode === 'dark' ? '#ffa940' : '#d87a16', 
                          textDecoration: 'underline', 
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          marginLeft: '4px'
                        }}
                        onClick={() => {
                          const matchedSrv = services.find(s => s.name.toLowerCase() === sName.toLowerCase());
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
            {lastUsedServices.filter(sName => services.some(active => active.name.toLowerCase() === sName.toLowerCase() && active.id !== 0)).length > 0 && (
              <div style={{ marginTop: '4px', fontSize: '12px' }}>
                <span style={{ color: '#096dd9', fontWeight: 'bold' }}>🕒 Dịch vụ khách dùng cuối cùng: </span>
                {lastUsedServices
                  .filter(sName => services.some(active => active.name.toLowerCase() === sName.toLowerCase() && active.id !== 0))
                  .map(sName => {
                    return (
                      <span 
                        key={sName}
                        style={{ 
                          color: themeMode === 'dark' ? '#177ddc' : '#096dd9', 
                          textDecoration: 'underline', 
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          marginLeft: '4px'
                        }}
                        onClick={() => {
                          const matchedSrv = services.find(s => s.name.toLowerCase() === sName.toLowerCase());
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
            {comboBalances.filter((cb: any) => (cb.normalCount || 0) + (cb.retainCount || 0) > 0).length > 0 && (
              <div style={{ marginTop: '8px', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#db2777', fontWeight: 'bold', marginBottom: '6px' }}>
                  🎁 GÓI COMBO ĐANG CHẠY (CLICK ĐỂ CHỌN NHANH DÒNG MI):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {comboBalances
                    .filter((cb: any) => (cb.normalCount || 0) + (cb.retainCount || 0) > 0)
                    .map((cb: any) => {
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
                            alignItems: 'center'
                          }}
                          onClick={() => {
                            const cleanName = cb.serviceName.split('(')[0].trim().toLowerCase();
                            const matchedSrv = services.find(s => s.name.toLowerCase().includes(cleanName) || cleanName.includes(s.name.toLowerCase()));
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
                            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                              Còn lại: {cb.normalCount || 0} mới | {cb.retainCount || 0} dặm
                            </div>
                          </div>
                          <Tag color="magenta" style={{ margin: 0, fontSize: '10px' }}>Chọn</Tag>
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
              <h4 style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                🎟️ CHỌN KHUYẾN MÃI (PROMOTION)
              </h4>
              <Select
                showSearch
                allowClear
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                style={{ width: '100%' }}
                placeholder="Chọn chương trình khuyến mãi (nếu có)..."
                value={selectedPromotion?.id}
                onChange={(val) => {
                  const promo = promotions.find(p => p.id === val);
                  setSelectedPromotion(promo || null);
                }}
                options={promotions.map(p => ({
                  value: p.id,
                  label: p.discountPercentage > 0 
                    ? `${p.name} (Giảm ${p.discountPercentage}%)`
                    : (p.discountAmount > 0 ? `${p.name} (Giảm ${p.discountAmount.toLocaleString('vi-VN')}đ)` : p.name)
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
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: themeMode === 'dark' ? '#1e293b' : '#f8fafc',
              border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`,
              fontSize: '13px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Giá gốc dịch vụ:</span>
                <span>{priceInfo.original.toLocaleString('vi-VN')}đ</span>
              </div>
              {priceInfo.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fa8c16' }}>
                  <span>Giảm giá ({selectedPromotion?.name}):</span>
                  <span>-{priceInfo.discount.toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', borderTop: `1px dashed ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`, paddingTop: '4px', marginTop: '2px' }}>
                <span style={{ color: themeMode === 'dark' ? '#fff' : '#1f2937' }}>Giá thanh toán tạm tính:</span>
                <span style={{ color: '#52c41a' }}>{priceInfo.final.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
          )}

          {/* Divider separating inputs from slots */}
          <div style={{ height: '1px', background: themeMode === 'dark' ? '#334155' : '#e5e7eb', margin: '10px 0' }} />

          {/* SLOT AVAILABILITY MATRIX */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#888' }}>Ngày đặt:</span>
                <DatePicker
                  style={{ marginLeft: '8px' }}
                  value={bookingDate}
                  onChange={(val) => {
                    if (val) setBookingDate(val);
                  }}
                  format="DD/MM/YYYY"
                  allowClear={false}
                  disabledDate={(current) => {
                    if (current && current.isBefore(dayjs().startOf('day'))) {
                      return true;
                    }
                    if (selectedCV && selectedCV.offDays && selectedCV.offDays.length > 0) {
                      const dayOfWeek = current.day(); // 0 is Sunday, 1 is Monday...
                      const dbDayStr = dayOfWeek === 0 ? '7' : String(dayOfWeek);
                      if (selectedCV.offDays.includes(dbDayStr)) {
                        return true;
                      }
                    }
                    return false;
                  }}
                />
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}>
                {bookingDate.format('dddd (DD/MM/YYYY)')}
              </div>
            </div>

            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: token.colorText, marginBottom: '12px' }}>
              BẢNG KHUNG GIỜ HOẠT ĐỘNG CHI NHÁNH ({selectedCN?.name || 'Vui lòng chọn chi nhánh'})
            </h3>

            <Spin spinning={loadingSlots}>
              <div style={{
                background: themeMode === 'dark' ? '#1e293b' : '#ffffff',
                border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e5e7eb'}`,
                borderRadius: '8px',
                padding: '20px',
                maxHeight: 'calc(100vh - 420px)',
                overflowY: 'auto'
              }}>
                {/* Slot Matrix Legend */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', fontSize: '11px', color: '#888', marginBottom: '16px' }}>
                  <span><span style={{ color: '#d4a84b' }}>🟡</span> 1-2 chỗ trống</span>
                  <span><span style={{ color: '#ef4444' }}>🔴</span> 0 chỗ trống (Hết)</span>
                  <span><span style={{ padding: '2px 4px', background: '#ef4444', color: '#fff', borderRadius: '3px', fontSize: '9px', fontWeight: 'bold' }}>-1</span> Overbook</span>
                </div>

              {/* Render Category slots */}
              {[
                { title: 'Morning (Sáng)', list: morning },
                { title: 'Afternoon (Chiều)', list: afternoon },
                { title: 'Night (Tối)', list: night }
              ].map(cat => (
                <div key={cat.title} style={{ marginBottom: '20px' }}>
                  <div style={{ fontWeight: 'bold', color: '#888', fontSize: '12px', marginBottom: '10px', textTransform: 'uppercase' }}>
                    {cat.title}
                  </div>
                  <Row gutter={[12, 12]}>
                    {cat.list.map(time => {
                      const slotInfo = slotMatrix[time] || { available: 0, roster: 0 };
                      const availableVal = slotInfo.available;
                      const isActive = selectedSlot === time;

                      // Available Badge Styles based on rules
                      let badgeStyle: React.CSSProperties = {
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '22px',
                        height: '22px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        borderRadius: '50%',
                        padding: '0 4px',
                        transition: 'all 0.2s'
                      };

                      if (availableVal > 2) {
                        badgeStyle = {
                          ...badgeStyle,
                          background: themeMode === 'dark' ? '#0f172a' : '#f3f4f6',
                          color: themeMode === 'dark' ? '#94a3b8' : '#6b7280',
                          border: `1px solid ${themeMode === 'dark' ? '#334155' : '#d9d9d9'}`
                        };
                      } else if (availableVal === 1 || availableVal === 2) {
                        badgeStyle = {
                          ...badgeStyle,
                          background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : '#fffbe6',
                          color: themeMode === 'dark' ? '#d4a84b' : '#d46b08',
                          border: `1px solid ${themeMode === 'dark' ? '#d4a84b' : '#ffe58f'}`,
                          borderRadius: '11px',
                          minWidth: '26px'
                        };
                      } else if (availableVal === 0) {
                        badgeStyle = {
                          ...badgeStyle,
                          background: themeMode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fff1f0',
                          color: '#ef4444',
                          border: `1px solid ${themeMode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : '#ffccc7'}`,
                          borderRadius: '11px',
                          minWidth: '26px'
                        };
                      } else {
                        badgeStyle = {
                          ...badgeStyle,
                          background: '#ef4444',
                          color: '#ffffff',
                          border: '1px solid #ef4444',
                          borderRadius: '11px',
                          minWidth: '26px'
                        };
                      }
                      // Determine slot frame styles matching the badge colors
                      let frameStyle: React.CSSProperties = {
                        flex: 1,
                        textAlign: 'center',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '12px',
                        padding: '5px 8px',
                        transition: 'all 0.2s'
                      };

                      if (isActive) {
                        frameStyle = {
                          ...frameStyle,
                          background: '#D4A84B',
                          border: '1px solid #D4A84B',
                          color: '#fff'
                        };
                      } else {
                        if (availableVal > 2) {
                          frameStyle = {
                            ...frameStyle,
                            background: themeMode === 'dark' ? '#1e293b' : '#ffffff',
                            border: `1px solid ${themeMode === 'dark' ? '#334155' : '#d9d9d9'}`,
                            color: themeMode === 'dark' ? '#cbd5e1' : '#1f2937'
                          };
                        } else if (availableVal === 1 || availableVal === 2) {
                          frameStyle = {
                            ...frameStyle,
                            background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.08)' : '#fffbe6',
                            border: `1px solid ${themeMode === 'dark' ? '#d4a84b' : '#ffe58f'}`,
                            color: themeMode === 'dark' ? '#d4a84b' : '#d46b08'
                          };
                        } else if (availableVal === 0) {
                          frameStyle = {
                            ...frameStyle,
                            background: themeMode === 'dark' ? 'rgba(239, 68, 68, 0.05)' : '#fff1f0',
                            border: `1px solid ${themeMode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : '#ffccc7'}`,
                            color: '#ef4444'
                          };
                        } else {
                          frameStyle = {
                            ...frameStyle,
                            background: themeMode === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fff1f0',
                            border: '1px solid #ef4444',
                            color: '#ef4444'
                          };
                        }
                      }
                      
                      return (
                        <Col span={6} key={time}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div 
                              style={frameStyle}
                              onClick={() => setSelectedSlot(time)}
                            >
                              {time}
                            </div>

                            <div style={badgeStyle}>
                              {availableVal}
                            </div>
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                </div>
              ))}
              </div>
            </Spin>
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
                <span style={{ color: '#888' }}>Chi nhánh:</span>{' '}
                <strong>{selectedCN?.name}</strong>
              </div>
              <div>
                <span style={{ color: '#888' }}>Chuyên viên:</span>{' '}
                <strong>{selectedCV ? selectedCV.displayName : 'Chuyên viên tự do'}</strong>
              </div>
              <div>
                <span style={{ color: '#888' }}>Dịch vụ:</span>{' '}
                <strong>{selectedService?.name}</strong>{' '}
                {selectedService?.id !== 0 && (
                  <span style={{ color: '#888' }}>({selectedService?.price.toLocaleString('vi-VN')}đ)</span>
                )}
              </div>
              {selectedPromotion && (
                <div>
                  <span style={{ color: '#888' }}>Khuyến mãi:</span>{' '}
                  <strong>{selectedPromotion.name}</strong>
                  {priceInfo.discount > 0 && <span style={{ color: '#fa8c16' }}> (-{priceInfo.discount.toLocaleString('vi-VN')}đ)</span>}
                </div>
              )}
              {referralPhone && (
                <div>
                  <span style={{ color: '#888' }}>Người giới thiệu:</span>{' '}
                  <strong>{referralPhone}</strong>
                </div>
              )}
              {selectedService && selectedService.id !== 0 && (
                <div>
                  <span style={{ color: '#888' }}>Giá thanh toán:</span>{' '}
                  <strong style={{ color: '#52c41a', fontSize: '14.5px' }}>{priceInfo.final.toLocaleString('vi-VN')}đ</strong>
                </div>
              )}
              <div>
                <span style={{ color: '#888' }}>Giờ hẹn:</span>{' '}
                <strong>{selectedSlot}</strong> ngày <strong>{bookingDate.format('DD/MM/YYYY')}</strong>
              </div>
            </div>
          </Card>

          {/* Select Channels */}
          <div>
            <h4 style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
              KÊNH TIẾP NHẬN ĐẶT LỊCH (BOOKING CHANNEL)
            </h4>
            <Radio.Group 
              value={bookingChannel} 
              onChange={(e) => setBookingChannel(e.target.value)}
              buttonStyle="solid"
            >
              {CHANNELS.map(ch => (
                <Radio.Button key={ch.key} value={ch.key} style={{ marginBottom: '8px', marginRight: '8px', borderRadius: '4px' }}>
                  {ch.key}
                </Radio.Button>
              ))}
            </Radio.Group>
          </div>

          {/* Booking note */}
          <div>
            <h4 style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
              GHI CHÚ ĐẶT LỊCH (BOOKING NOTE)
            </h4>
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
            <Button type="primary" style={{ flex: 2, backgroundColor: '#52c41a', borderColor: '#52c41a' }} onClick={handleCreateBooking}>
              Xác nhận Đặt Lịch
            </Button>
          </div>
        </div>
      )}

    </Drawer>
  );
};

export default BookingWizardDrawer;
