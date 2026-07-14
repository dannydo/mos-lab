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
  Badge,
  Spin,
  Space
} from 'antd';
import {
  UserOutlined,
  HomeOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  SmileOutlined,
  InboxOutlined,
  FormOutlined,
  LeftOutlined,
  CheckCircleOutlined,
  HeartFilled
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';

const { TextArea } = Input;

interface RescheduleBookingModalProps {
  open: boolean;
  booking: any; // Contains id, bookingDate, bookingTime, branchName, technicianName, technicianId, bookingNote
  onClose: () => void;
  onSuccess: () => void;
}

const STORES = [
  { id: 16, name: 'Estella Place' },
  { id: 6, name: 'De Tham' },
  { id: 2, name: 'Phan Xích Long' }
];

const getOffDaysText = (offDays?: string[]) => {
  if (!offDays || !offDays.length) return '';
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

export const RescheduleBookingModal: React.FC<RescheduleBookingModalProps> = ({
  open,
  booking,
  onClose,
  onSuccess
}) => {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Form Fields State
  const [selectedCN, setSelectedCN] = useState<any>(null); // Branch/Store
  const [bookingDate, setBookingDate] = useState<dayjs.Dayjs>(dayjs().add(1, 'day'));
  const [selectedCV, setSelectedCV] = useState<any>(null); // KTV
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingNote, setBookingNote] = useState('');

  // Dropdown data options
  const [staffList, setStaffList] = useState<any[]>([]);
  const [slotMatrix, setSlotMatrix] = useState<{ [time: string]: { available: number; roster: number } }>({});

  // Favorite technicians state
  const [favoriteTechs, setFavoriteTechs] = useState<string[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [comboBalances, setComboBalances] = useState<any[]>([]);
  const [suggestedServices, setSuggestedServices] = useState<string[]>([]);
  const [suggestedBranch, setSuggestedBranch] = useState<any>(null);

  const fetchServices = async () => {
    try {
      const res = await api.get('/customers/services');
      const list = res.data || [];
      setServices(list);
      
      if (booking?.services && booking.services.length > 0) {
        const currentSrvName = booking.services[0];
        const matched = list.find((s: any) => s.name.toLowerCase() === currentSrvName.toLowerCase());
        if (matched) {
          setSelectedService(matched);
        } else {
          setSelectedService({ id: 0, name: currentSrvName, price: 0, duration: 90 });
        }
      }
    } catch (err) {
      console.error('[Reschedule] Failed to fetch services:', err);
    }
  };

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
    if (open && booking?.customerId) {
      api.get(`/customers/${booking.customerId}/detailed`)
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
            }
          }
        })
        .catch(err => console.error('Failed to fetch favorite technicians in reschedule:', err));
    } else {
      setFavoriteTechs([]);
      setComboBalances([]);
      setSuggestedServices([]);
      setSuggestedBranch(null);
    }
  }, [open, booking]);

  // Initialize fields on open
  useEffect(() => {
    if (open && booking) {
      setCurrentStep(0);
      setSelectedCV(null);
      fetchServices();
      
      // Map branch name to store object
      const matchedStore = STORES.find(
        s => s.name === booking.branchName || booking.branchName?.includes(s.name)
      ) || STORES[0];
      setSelectedCN(matchedStore);

      // Set date & note & slot
      setBookingDate(booking.bookingDate ? dayjs(booking.bookingDate) : dayjs().add(1, 'day'));
      setBookingNote(booking.bookingNote || '');
      setSelectedSlot(booking.bookingTime || null);

      // Fetch staff directory
      fetchStaff(booking.bookingDate ? dayjs(booking.bookingDate).format('YYYY-MM-DD') : dayjs().add(1, 'day').format('YYYY-MM-DD'));
    }
  }, [open, booking]);

  // Fetch slot matrix from real API when dependencies change
  useEffect(() => {
    if (open && selectedCN && currentStep === 1) {
      fetchSlots();
    }
  }, [selectedCN, bookingDate, selectedCV, open, currentStep]);

  // Re-fetch staff directory when booking date changes
  useEffect(() => {
    if (open && bookingDate) {
      fetchStaff(bookingDate.format('YYYY-MM-DD'));
    }
  }, [bookingDate, open]);

  const fetchStaff = async (dateStr?: string) => {
    setLoadingStaff(true);
    try {
      const res = await api.get('/customers/staff', {
        params: { date: dateStr }
      });
      const staff = res.data || [];
      setStaffList(staff);

      // Initialize KTV selection if not yet set
      if (booking?.technicianId && !selectedCV) {
        const found = staff.find((s: any) => Number(s.id) === Number(booking.technicianId));
        if (found) {
          setSelectedCV(found);
        } else {
          setSelectedCV({ id: booking.technicianId, displayName: booking.technicianName || 'KTV cũ' });
        }
      }
    } catch (err) {
      console.error('[Reschedule] Fetch staff failed:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const fetchSlots = async () => {
    if (!selectedCN) return;
    setLoadingSlots(true);
    try {
      const res = await api.get('/customers/booking-slots', {
        params: {
          date: bookingDate.format('YYYY-MM-DD'),
          storeName: selectedCN.name,
          technicianId: selectedCV?.id || undefined
        }
      });
      setSlotMatrix(res.data || {});
    } catch (err) {
      console.error('[Reschedule] Fetch slots failed:', err);
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

  const handleReschedule = async () => {
    if (!selectedCN) {
      message.error('Vui lòng chọn chi nhánh');
      return;
    }
    if (!selectedSlot) {
      message.error('Vui lòng chọn khung giờ trống');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        storeId: selectedCN.id,
        storeName: selectedCN.name,
        technicianId: selectedCV?.id || null,
        technicianName: selectedCV?.displayName || 'Chuyên viên tự do',
        bookingDate: bookingDate.format('YYYY-MM-DD'),
        bookingTime: selectedSlot,
        bookingNote: checkAndAppendLowerLashNote(bookingNote, comboBalances),
        serviceId: selectedService?.id || null
      };

      await api.put(`/customers/booking/${booking.id}`, payload);
      message.success('Dời lịch hẹn thành công!');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[Reschedule] Submit failed:', err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi dời lịch.');
    } finally {
      setSubmitting(false);
    }
  };

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
          <FormOutlined style={{ fontSize: '18px' }} />
          <span style={{ fontWeight: 'bold', fontSize: '16px' }}>QUY TRÌNH DỜI LỊCH HẸN KHÁCH HÀNG</span>
        </div>
      }
      open={open}
      onClose={onClose}
      width={560}
      destroyOnClose
      styles={{
        body: {
          padding: '24px',
          background: themeMode === 'dark' ? '#0f172a' : '#f8fafc'
        }
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <Steps
          size="small"
          current={currentStep}
          onChange={(step) => setCurrentStep(step)}
          items={[
            { title: 'Chuyên viên' },
            { title: 'Dịch vụ & KH & Khung giờ' },
            { title: 'Xác nhận' }
          ]}
          style={{ marginBottom: '24px' }}
        />
      </div>

      {/* STEP 0: SPECIALIST SELECT */}
      {currentStep === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Card
            hoverable
            size="small"
            styles={{ body: { padding: '16px' } }}
            style={{
              borderColor: selectedCV === null ? '#D4A84B' : (themeMode === 'dark' ? '#334155' : '#e2e8f0'),
              boxShadow: selectedCV === null ? '0 0 0 1px #D4A84B' : 'none',
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
                    onClick={() => {
                      setSelectedCN(s);
                      setSelectedSlot(null);
                    }}
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
            {selectedCV && selectedCV.notes && selectedCV.notes !== selectedCN?.name && (
              <div style={{
                color: '#faad14',
                background: 'rgba(250, 173, 20, 0.08)',
                border: '1px solid #ffe58f',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                marginTop: '8px'
              }}>
                ⚠️ Chuyên viên <strong>{selectedCV.displayName}</strong> thuộc chi nhánh <strong>{selectedCV.notes}</strong>, không thuộc chi nhánh <strong>{selectedCN?.name}</strong> đang chọn.
              </div>
            )}
          </div>

          {/* Customer Details - Read-Only */}
          <Card
            title={
              <span style={{ fontSize: '13px', color: '#888' }}>
                <UserOutlined /> THÔNG TIN KHÁCH HÀNG (ĐỌC)
              </span>
            }
            styles={{ body: { padding: '16px' } }}
            style={{ backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff', borderColor: '#e5e7eb' }}
          >
            <div style={{
              padding: '10px',
              background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fdf9f0',
              border: '1px solid #ffe58f',
              borderRadius: '6px'
            }}>
              <div style={{ fontWeight: 'bold', color: token.colorText }}>{booking?.customerName || 'Khách Hàng'}</div>
              <div style={{ fontSize: '12px', color: '#888' }}>
                SĐT: {booking?.customerPhone || '-'}
              </div>
            </div>
          </Card>

          {/* Service Select - Editable */}
          <div>
            <h4 style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
              <InboxOutlined /> DỊCH VỤ ĐÃ ĐẶT (SERVICE)
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
            {suggestedServices.length > 0 && (
              <div style={{ marginTop: '6px', fontSize: '12px' }}>
                <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>⭐ Dòng mi khách hay đi nhất: </span>
                {suggestedServices.map(sName => {
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

          {/* Divider */}
          <div style={{ height: '1px', background: themeMode === 'dark' ? '#334155' : '#e5e7eb', margin: '10px 0' }} />

          {/* SLOT AVAILABILITY MATRIX */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#888' }}>Ngày hẹn mới:</span>
                <DatePicker
                  style={{ marginLeft: '8px' }}
                  value={bookingDate}
                  onChange={(val) => {
                    if (val) {
                      setBookingDate(val);
                      setSelectedSlot(null);
                    }
                  }}
                  format="DD/MM/YYYY"
                  allowClear={false}
                  disabledDate={(current) => {
                    if (current && current.isBefore(dayjs().startOf('day'))) {
                      return true;
                    }
                    if (selectedCV && selectedCV.offDays && selectedCV.offDays.length > 0) {
                      const dayOfWeek = current.day();
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
                        
                        return (
                          <Col span={6} key={time}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <div 
                                style={{
                                  flex: 1,
                                  textAlign: 'center',
                                  background: isActive 
                                    ? '#D4A84B' 
                                    : (themeMode === 'dark' ? '#1e293b' : '#ffffff'),
                                  border: `1px solid ${isActive ? '#D4A84B' : (themeMode === 'dark' ? '#334155' : '#d9d9d9')}`,
                                  color: isActive ? '#fff' : (themeMode === 'dark' ? '#cbd5e1' : '#1f2937'),
                                  padding: '5px 8px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                  fontSize: '12px',
                                  transition: 'all 0.2s'
                                }}
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

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <Button style={{ flex: 1 }} onClick={() => setCurrentStep(0)} icon={<LeftOutlined />}>
              Quay lại
            </Button>
            <Button 
              type="primary" 
              onClick={() => setCurrentStep(2)} 
              disabled={!selectedSlot || !selectedCN}
              style={{ flex: 2, backgroundColor: '#D4A84B', borderColor: '#D4A84B', color: '#000', fontWeight: 'bold' }}
            >
              Tiếp tục: Nhập Ghi chú & Xác nhận
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: CONFIRM & BOOK */}
      {currentStep === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Summary Card */}
          <Card
            title={<span style={{ color: '#D4A84B', fontWeight: 'bold' }}>TỔNG HỢP CHI TIẾT DỜI LỊCH</span>}
            style={{ backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
              <div>
                <span style={{ color: '#888' }}>Khách hàng:</span>{' '}
                <strong>{booking?.customerName}</strong> ({booking?.customerPhone || 'N/A'})
              </div>
              <div>
                <span style={{ color: '#888' }}>Chi nhánh mới:</span>{' '}
                <strong>{selectedCN?.name}</strong>
              </div>
              <div>
                <span style={{ color: '#888' }}>Chuyên viên mới:</span>{' '}
                <strong>{selectedCV ? selectedCV.displayName : 'Chuyên viên tự do'}</strong>
              </div>
              {selectedCV && selectedCV.notes && selectedCV.notes !== selectedCN?.name && (
                <div style={{
                  color: '#faad14',
                  background: 'rgba(250, 173, 20, 0.1)',
                  border: '1px solid #ffe58f',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: '500',
                  marginTop: '4px',
                  marginBottom: '4px'
                }}>
                  ⚠️ Chuyên viên <strong>{selectedCV.displayName}</strong> thuộc chi nhánh <strong>{selectedCV.notes}</strong>, không thuộc chi nhánh <strong>{selectedCN?.name}</strong> đã chọn!
                </div>
              )}
              <div>
                <span style={{ color: '#888' }}>Giờ hẹn mới:</span>{' '}
                <strong>{selectedSlot}</strong> ngày <strong>{bookingDate.format('DD/MM/YYYY')}</strong>
              </div>
              <div>
                <span style={{ color: '#888' }}>Dịch vụ / Dòng mi:</span>{' '}
                <strong>{selectedService ? selectedService.name : 'Chưa chọn'}</strong>
              </div>
            </div>
          </Card>

          {/* Reschedule note */}
          <div>
            <h4 style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
              GHI CHÚ DỜI LỊCH (RESCHEDULE NOTE)
            </h4>
            <TextArea
              rows={4}
              placeholder="Nhập lý do dời lịch hoặc các ghi chú đặc biệt khác..."
              value={bookingNote}
              onChange={(e) => setBookingNote(e.target.value)}
              style={{ borderRadius: '6px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <Button style={{ flex: 1 }} onClick={() => setCurrentStep(1)}>
              Quay lại
            </Button>
            <Button 
              type="primary" 
              loading={submitting} 
              style={{ flex: 2, backgroundColor: '#52c41a', borderColor: '#52c41a', fontWeight: 'bold' }} 
              onClick={handleReschedule}
              icon={<CheckCircleOutlined />}
            >
              Xác nhận Dời Lịch
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
};
