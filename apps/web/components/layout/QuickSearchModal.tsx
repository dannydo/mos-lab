'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Input, Spin, Tag, Empty, Button, Space, Typography } from 'antd';
import { Search, Phone, User, Calendar, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../lib/api-client';
import { useOmiCall } from '../../context/OmiCallContext';
import { useTheme } from '../../context/ThemeContext';
import type { Customer } from '@mos-lab/shared';

const { Text } = Typography;

interface QuickSearchModalProps {
  open: boolean;
  onClose: () => void;
  onOpenCustomerDetail?: (customer: Customer) => void;
}

export default function QuickSearchModal({ open, onClose, onOpenCustomerDetail }: QuickSearchModalProps) {
  const router = useRouter();
  const { themeMode } = useTheme();
  const { makeCall } = useOmiCall();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Customer[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback((searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.customers.list({
          search: trimmed,
          limit: 6,
          assignedStaffId: 'all',
        });
        const items = Array.isArray(res) ? res : res?.data || [];
        setResults(items);
      } catch (err) {
        console.error('Quick search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    handleSearch(val);
  };

  const handleCall = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!customer.phone) return;
    makeCall(customer.phone, customer.name || 'Khách hàng', customer.id);
    onClose();
  };

  const handleSelectCustomer = (customer: Customer) => {
    if (onOpenCustomerDetail) {
      onOpenCustomerDetail(customer);
    } else {
      router.push(`/dashboard/customers?search=${encodeURIComponent(customer.phone || customer.name || '')}`);
    }
    onClose();
  };

  const handleViewAll = () => {
    if (query.trim()) {
      router.push(`/dashboard/customers?search=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setLoading(false);
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Search className="w-4 h-4 text-amber-500" />
          <span>Tìm kiếm nhanh Khách hàng / SĐT</span>
        </div>
      }
      width="min(92vw, 420px)"
      centered
      destroyOnClose
      styles={{
        content: {
          padding: '16px',
          borderRadius: '16px',
        },
      }}
    >
      <div className="space-y-3 pt-2">
        <Input
          autoFocus
          placeholder="Nhập tên hoặc số điện thoại..."
          value={query}
          onChange={handleChange}
          onPressEnter={handleViewAll}
          prefix={<Search className="w-4 h-4 text-slate-400 mr-1" />}
          allowClear
          className="h-11 rounded-lg text-base"
        />

        <div className="min-h-[160px] max-h-[320px] overflow-y-auto mobile-scroll-container space-y-2">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Spin size="default" />
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              {results.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelectCustomer(c)}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:border-amber-400 cursor-pointer transition-all flex items-center justify-between gap-3 active:scale-[0.98]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm truncate">{c.name || 'Khách chưa có tên'}</span>
                      {c.bucket && (
                        <Tag color="cyan" className="text-[10px] px-1 py-0 leading-none">
                          {c.bucket}
                        </Tag>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                      {c.phone || 'Chưa có SĐT'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {c.phone && (
                      <Button
                        type="primary"
                        size="small"
                        icon={<Phone className="w-3.5 h-3.5" />}
                        className="bg-emerald-600 hover:bg-emerald-500 rounded-lg h-8 px-2.5 text-xs flex items-center gap-1"
                        onClick={(e) => handleCall(c, e)}
                      >
                        Gọi
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {results.length >= 6 && (
                <Button block type="link" onClick={handleViewAll} className="text-amber-500 text-xs text-center pt-2">
                  {`Xem thêm kết quả tìm kiếm cho "${query}" →`}
                </Button>
              )}
            </div>
          ) : query.trim().length > 1 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span className="text-xs text-slate-400">Không tìm thấy khách hàng nào</span>}
              className="py-4 my-0"
            />
          ) : (
            <div className="text-center py-8 text-xs text-slate-400">
              Gõ số điện thoại hoặc tên khách để tìm kiếm ngay
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
