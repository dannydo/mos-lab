'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Tabs, Input, Button, Tag, Spin, Empty, Avatar, theme } from 'antd';
import {
  Search,
  User,
  Calendar,
  Sparkles,
  Phone,
  Clock,
  Send,
  Plus,
  X,
  UserCheck,
  Building,
} from 'lucide-react';
import dayjs from 'dayjs';
import type { Customer, Appointment, MosChatCustomerCard, SafeAny } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { SAMPLE_CUSTOMER_CARDS } from './constants/chat-constants';

export interface MosChatCustomerPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelectCustomerCard: (card: MosChatCustomerCard, sendImmediately?: boolean) => void;
  isDark?: boolean;
  zIndex?: number;
}

export const MosChatCustomerPickerModal: React.FC<MosChatCustomerPickerModalProps> = ({
  open,
  onClose,
  onSelectCustomerCard,
  isDark = true,
  zIndex = 1400,
}) => {
  const { token } = theme.useToken();
  const [activeTab, setActiveTab] = useState<string>('customers');

  // Customer search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Appointments / Bookings states
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState<boolean>(false);
  const [bookingFilterQuery, setBookingFilterQuery] = useState<string>('');

  // Fetch initial/recent customers
  const fetchCustomers = useCallback(async (query: string) => {
    setLoadingCustomers(true);
    try {
      const trimmed = query.trim();
      const res = await apiClient.customers.list({
        search: trimmed || undefined,
        bucket: trimmed ? undefined : 'COMBO_LIVE',
        limit: 10,
        assignedStaffId: 'all',
      });
      const list = Array.isArray(res) ? res : res?.data || [];
      setCustomers(list);
    } catch {
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  // Fetch today's appointments / bookings
  const fetchAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    try {
      const todayStr = dayjs().format('YYYY-MM-DD');
      const res = await apiClient.customers.getAppointments({
        dateFrom: todayStr,
        dateTo: todayStr,
      });
      const list = res?.data || [];
      setAppointments(list);
    } catch {
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setBookingFilterQuery('');
      return;
    }
    void fetchCustomers('');
    void fetchAppointments();
  }, [open, fetchCustomers, fetchAppointments]);

  // Debounced search when user types
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      void fetchCustomers(val);
    }, 300);
  };

  const handleSelectCustomer = (c: Customer, sendImmediately = false) => {
    const tierLabel =
      c.bucket === 'COMBO_LIVE'
        ? 'VIP Combo'
        : c.bucket === 'COMBO_DEAD'
          ? 'Hết hạn Combo'
          : c.bucket === 'SINGLE'
            ? 'Khách Lẻ'
            : 'Khách hàng';

    const card: MosChatCustomerCard = {
      customerId: c.id,
      name: c.name || `Khách hàng #${c.id}`,
      meta: `${tierLabel} · ${c.totalVisits || 0} lần ghé`,
      phone: c.phone || '',
      cvName: c.assignedStaff?.displayName ? `CV phụ trách: ${c.assignedStaff.displayName}` : undefined,
    };
    onSelectCustomerCard(card, sendImmediately);
  };

  const handleSelectAppointment = (apt: Appointment, sendImmediately = false) => {
    const timeLabel = apt.bookingDateStart ? dayjs(apt.bookingDateStart).format('HH:mm') : 'Hôm nay';
    const serviceName = apt.serviceName || 'Mi Thiết Kế';
    const card: MosChatCustomerCard = {
      customerId: apt.customerId,
      name: apt.customerName || `Khách hàng #${apt.customerId}`,
      meta: `Booking ${timeLabel} · ${serviceName}`,
      phone: apt.customerPhone || '',
      cvName: apt.branchName ? `Chi nhánh ${apt.branchName}` : undefined,
    };
    onSelectCustomerCard(card, sendImmediately);
  };

  const handleSelectSample = (sample: MosChatCustomerCard, sendImmediately = false) => {
    onSelectCustomerCard(sample, sendImmediately);
  };

  const filteredAppointments = appointments.filter((apt) => {
    if (!bookingFilterQuery.trim()) return true;
    const q = bookingFilterQuery.toLowerCase().trim();
    return (
      (apt.customerName || '').toLowerCase().includes(q) ||
      (apt.customerPhone || '').includes(q) ||
      (apt.serviceName || '').toLowerCase().includes(q) ||
      (apt.branchName || '').toLowerCase().includes(q)
    );
  });

  const surfaceBg = isDark ? '#141414' : '#ffffff';
  const surfaceRaised = isDark ? '#1f1f1f' : '#f8fafc';
  const borderColor = isDark ? '#303030' : '#e2e8f0';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="min(640px, calc(100vw - 24px))"
      zIndex={zIndex}
      centered
      title={
        <div className="flex items-center gap-2.5 pb-1">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
            <User size={18} />
          </div>
          <div>
            <div className="text-[15px] font-bold" style={{ color: token.colorTextHeading }}>
              Đính kèm thẻ Khách hàng / Booking mOS
            </div>
            <div className="text-xs text-slate-400 font-normal">
              Tìm kiếm khách hàng hoặc lịch hẹn để chia sẻ nhanh vào cuộc trò chuyện
            </div>
          </div>
        </div>
      }
      styles={{
        content: {
          backgroundColor: surfaceBg,
          border: `1px solid ${borderColor}`,
          borderRadius: 16,
          padding: '16px 18px',
        },
        header: {
          backgroundColor: surfaceBg,
          borderBottom: `1px solid ${borderColor}`,
          paddingBottom: 12,
          marginBottom: 12,
        },
      }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'customers',
            label: (
              <span className="inline-flex items-center gap-1.5 font-medium">
                <User size={15} />
                Tra cứu Khách hàng
              </span>
            ),
            children: (
              <div className="space-y-3">
                <Input
                  allowClear
                  placeholder="Tìm theo tên khách, số điện thoại hoặc mã khách..."
                  prefix={<Search size={16} className="text-slate-400 mr-1" />}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="rounded-xl h-10"
                />

                <div className="min-h-[280px] max-h-[360px] overflow-y-auto pr-1 space-y-2">
                  {loadingCustomers ? (
                    <div className="h-60 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Spin />
                      <span className="text-xs">Đang tìm kiếm khách hàng...</span>
                    </div>
                  ) : customers.length === 0 ? (
                    <Empty
                      description="Không tìm thấy khách hàng phù hợp"
                      className="py-10"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  ) : (
                    customers.map((c) => {
                      const initials = (c.name || 'KH')
                        .split(' ')
                        .map((w) => w[0])
                        .filter(Boolean)
                        .slice(-2)
                        .join('')
                        .toUpperCase();
                      const isVip = c.bucket === 'COMBO_LIVE';
                      return (
                        <div
                          key={c.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl border gap-2.5 transition-all hover:border-amber-400/40"
                          style={{
                            backgroundColor: surfaceRaised,
                            borderColor,
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              size={38}
                              style={{
                                backgroundColor: isVip ? '#d4a84b' : '#3b82f6',
                                color: '#ffffff',
                                fontWeight: 700,
                              }}
                            >
                              {initials}
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm truncate" style={{ color: token.colorText }}>
                                  {c.name}
                                </span>
                                <Tag
                                  color={isVip ? 'gold' : 'blue'}
                                  className="text-[10.5px] px-1.5 py-0 rounded leading-tight"
                                >
                                  {isVip ? 'VIP Combo' : 'Khách lẻ'}
                                </Tag>
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5 flex-wrap">
                                {c.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone size={11} />
                                    {c.phone}
                                  </span>
                                )}
                                <span>{c.totalVisits || 0} lần ghé</span>
                                {c.assignedStaff?.displayName && (
                                  <span>
                                    CV: {c.assignedStaff.displayName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center ml-auto sm:ml-3">
                            <Button
                              size="small"
                              onClick={() => handleSelectCustomer(c, false)}
                              icon={<Plus size={13} />}
                              className="rounded-lg text-xs"
                            >
                              Đính kèm
                            </Button>
                            <Button
                              size="small"
                              type="primary"
                              onClick={() => handleSelectCustomer(c, true)}
                              icon={<Send size={12} />}
                              className="rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 border-none text-slate-950"
                            >
                              Gửi ngay
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ),
          },
          {
            key: 'bookings',
            label: (
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Calendar size={15} />
                Lịch hẹn hôm nay ({appointments.length})
              </span>
            ),
            children: (
              <div className="space-y-3">
                <Input
                  allowClear
                  placeholder="Lọc lịch hẹn theo tên khách, dịch vụ, chi nhánh..."
                  prefix={<Search size={16} className="text-slate-400 mr-1" />}
                  value={bookingFilterQuery}
                  onChange={(e) => setBookingFilterQuery(e.target.value)}
                  className="rounded-xl h-10"
                />

                <div className="min-h-[280px] max-h-[360px] overflow-y-auto pr-1 space-y-2">
                  {loadingAppointments ? (
                    <div className="h-60 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Spin />
                      <span className="text-xs">Đang tải lịch hẹn hôm nay...</span>
                    </div>
                  ) : filteredAppointments.length === 0 ? (
                    <Empty
                      description="Hôm nay chưa có lịch hẹn nào phù hợp"
                      className="py-10"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  ) : (
                    filteredAppointments.map((apt) => {
                      const timeStr = apt.bookingDateStart
                        ? dayjs(apt.bookingDateStart).format('HH:mm')
                        : '--:--';
                      return (
                        <div
                          key={apt.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl border gap-2.5 transition-all hover:border-amber-400/40"
                          style={{
                            backgroundColor: surfaceRaised,
                            borderColor,
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm truncate" style={{ color: token.colorText }}>
                                {apt.customerName}
                              </span>
                              <Tag color="cyan" className="text-[10.5px] px-1.5 py-0 rounded flex items-center gap-1">
                                <Clock size={10} />
                                {timeStr}
                              </Tag>
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5 flex-wrap">
                              <span>{apt.serviceName || 'Mi Thiết Kế'}</span>
                              {apt.branchName && (
                                <span className="flex items-center gap-1">
                                  <Building size={11} />
                                  {apt.branchName}
                                </span>
                              )}
                              {apt.customerPhone && (
                                <span>{apt.customerPhone}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center ml-auto sm:ml-3">
                            <Button
                              size="small"
                              onClick={() => handleSelectAppointment(apt, false)}
                              icon={<Plus size={13} />}
                              className="rounded-lg text-xs"
                            >
                              Đính kèm
                            </Button>
                            <Button
                              size="small"
                              type="primary"
                              onClick={() => handleSelectAppointment(apt, true)}
                              icon={<Send size={12} />}
                              className="rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 border-none text-slate-950"
                            >
                              Gửi ngay
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ),
          },
          {
            key: 'samples',
            label: (
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Sparkles size={15} />
                Thẻ Mẫu Nhanh
              </span>
            ),
            children: (
              <div className="space-y-2 py-1">
                <div className="text-xs text-slate-400 mb-2">
                  Các mẫu thẻ khách hàng VIP & chăm sóc định sẵn để thử nghiệm hoặc minh họa:
                </div>
                {SAMPLE_CUSTOMER_CARDS.map((sample, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border gap-2.5 transition-all hover:border-amber-400/40"
                    style={{
                      backgroundColor: surfaceRaised,
                      borderColor,
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate" style={{ color: token.colorText }}>
                        {sample.name} · <span className="text-amber-500">{sample.meta}</span>
                      </div>
                      {sample.cvName && <div className="text-xs text-slate-400 mt-0.5 truncate">{sample.cvName}</div>}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center ml-auto sm:ml-3">
                      <Button
                        size="small"
                        onClick={() => handleSelectSample(sample, false)}
                        icon={<Plus size={13} />}
                        className="rounded-lg text-xs"
                      >
                        Đính kèm
                      </Button>
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => handleSelectSample(sample, true)}
                        icon={<Send size={12} />}
                        className="rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 border-none text-slate-950"
                      >
                        Gửi ngay
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
};
