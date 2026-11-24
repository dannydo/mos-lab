'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Button, Spin } from 'antd';
import { Clock, Delete, PhoneCall, Search, Trash2, User, X } from 'lucide-react';
import type { Customer, SafeAny } from '@mos-lab/shared';
import { AdaptiveModal } from '~/components/ui';
import { useOmiCall } from '~/context/OmiCallContext';
import { apiClient } from '~/lib/api-client';
import {
  clearRecentMosChatDials,
  formatDisplayPhone,
  isValidDialablePhone,
  MOS_CHAT_OPEN_OMICALL_DIALER_EVENT,
  normalizeVietnamDialPhone,
  readRecentMosChatDials,
  saveRecentMosChatDial,
  type MosChatOmiCallDialerPrefill,
  type RecentMosChatDial,
} from '../utils/omicall-dial-helpers';

export interface MosChatOmiCallDialerModalProps {
  isDark: boolean;
  currentUser?: SafeAny;
  open?: boolean;
  initialPrefill?: MosChatOmiCallDialerPrefill | null;
  onClose?: () => void;
  zIndex?: number;
}

interface SelectedDialCustomer {
  id?: number;
  name: string;
  phone: string;
  avatar?: string | null;
}

const DIALPAD_KEYS: ReadonlyArray<{ digit: string; letters: string }> = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: '' },
  { digit: '0', letters: '+' },
  { digit: '#', letters: '' },
];

export const MosChatOmiCallDialerModal: React.FC<MosChatOmiCallDialerModalProps> = ({
  isDark,
  currentUser,
  open: controlledOpen,
  initialPrefill,
  onClose,
  zIndex = 2100,
}) => {
  const {
    canAccessOmiCall,
    isAdmin,
    adminOmiCallEnabled,
    isRegistered,
    isSimulated,
    omicallReady,
    sipConfig,
    callState,
    makeCall,
  } = useOmiCall();

  const [internalOpen, setInternalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedDialCustomer | null>(null);
  const [matchedCustomers, setMatchedCustomers] = useState<Customer[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [recentDials, setRecentDials] = useState<RecentMosChatDial[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchSeqRef = useRef(0);

  const userKey = currentUser?.id ?? currentUser?.username ?? null;
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const applyPrefill = useCallback((prefill?: MosChatOmiCallDialerPrefill | null) => {
    const rawPhone = prefill?.phone ? normalizeVietnamDialPhone(prefill.phone) || prefill.phone.trim() : '';
    setInputValue(rawPhone);
    if (prefill?.name && rawPhone) {
      setSelectedCustomer({
        id: prefill.customerId,
        name: prefill.name,
        phone: rawPhone,
        avatar: prefill.avatar ?? null,
      });
    } else {
      setSelectedCustomer(null);
    }
    setMatchedCustomers([]);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOpenEvent = (event: Event) => {
      const detail = (event as CustomEvent<MosChatOmiCallDialerPrefill>).detail;
      applyPrefill(detail);
      setRecentDials(readRecentMosChatDials(userKey));
      setInternalOpen(true);
    };
    window.addEventListener(MOS_CHAT_OPEN_OMICALL_DIALER_EVENT, handleOpenEvent);
    return () => window.removeEventListener(MOS_CHAT_OPEN_OMICALL_DIALER_EVENT, handleOpenEvent);
  }, [applyPrefill, userKey]);

  useEffect(() => {
    if (isOpen) {
      setRecentDials(readRecentMosChatDials(userKey));
      if (initialPrefill) {
        applyPrefill(initialPrefill);
      }
      const focusTimer = setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
      return () => clearTimeout(focusTimer);
    }
    return undefined;
  }, [isOpen, initialPrefill, applyPrefill, userKey]);

  useEffect(() => {
    if (!isOpen || !canAccessOmiCall) return;
    const trimmed = inputValue.trim();
    if (trimmed.length < 3) {
      searchSeqRef.current += 1;
      setMatchedCustomers([]);
      setSearchingCustomers(false);
      return;
    }

    const reqSeq = ++searchSeqRef.current;
    setSearchingCustomers(true);
    const timer = setTimeout(() => {
      void Promise.resolve(
        apiClient.customers.list({
          search: trimmed,
          limit: 5,
          assignedStaffId: 'all',
        })
      )
        .then((res: SafeAny) => {
          if (searchSeqRef.current !== reqSeq) return;
          const list: Customer[] = Array.isArray(res) ? res : res?.data || [];
          setMatchedCustomers(list.slice(0, 5));
        })
        .catch(() => {
          if (searchSeqRef.current !== reqSeq) return;
          setMatchedCustomers([]);
        })
        .finally(() => {
          if (searchSeqRef.current === reqSeq) {
            setSearchingCustomers(false);
          }
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [inputValue, isOpen, canAccessOmiCall]);

  const handleClose = useCallback(() => {
    setInternalOpen(false);
    setInputValue('');
    setSelectedCustomer(null);
    setMatchedCustomers([]);
    onClose?.();
  }, [onClose]);

  const dialNumber = useMemo(() => {
    const candidate = selectedCustomer?.phone || inputValue;
    return normalizeVietnamDialPhone(candidate);
  }, [selectedCustomer, inputValue]);

  const canDial = callState === 'idle' && isValidDialablePhone(dialNumber);

  const handleTriggerDial = useCallback(
    async (override?: { phone: string; name?: string; customerId?: number; avatar?: string | null }) => {
      if (callState !== 'idle') return;
      const rawTarget = override?.phone || dialNumber;
      if (!isValidDialablePhone(rawTarget)) return;

      const normalizedPhone = normalizeVietnamDialPhone(rawTarget);
      let resolvedName = override?.name;
      let resolvedCustomerId = override?.customerId;
      let resolvedAvatar = override?.avatar ?? null;

      if (!resolvedName) {
        if (selectedCustomer && normalizeVietnamDialPhone(selectedCustomer.phone) === normalizedPhone) {
          resolvedName = selectedCustomer.name;
          resolvedCustomerId = selectedCustomer.id;
          resolvedAvatar = selectedCustomer.avatar ?? null;
        } else {
          const exactMatch = matchedCustomers.find(
            (c) => c.phone && normalizeVietnamDialPhone(c.phone) === normalizedPhone
          );
          if (exactMatch) {
            resolvedName = exactMatch.name || undefined;
            resolvedCustomerId = exactMatch.id;
            resolvedAvatar = exactMatch.avatar ?? null;
          }
        }
      }

      const nextRecents = saveRecentMosChatDial(userKey, {
        phone: normalizedPhone,
        name: resolvedName,
        customerId: resolvedCustomerId,
        avatar: resolvedAvatar,
      });
      setRecentDials(nextRecents);

      await makeCall(
        normalizedPhone,
        resolvedName || 'Khách hàng',
        resolvedCustomerId,
        resolvedAvatar || undefined,
        undefined,
        { autoEnableAdmin: true }
      );
      handleClose();
    },
    [callState, dialNumber, selectedCustomer, matchedCustomers, userKey, makeCall, handleClose]
  );

  if (!canAccessOmiCall) {
    return null;
  }

  const sipStatus = (() => {
    if (isRegistered && !isSimulated) {
      return {
        dotClass: 'bg-emerald-500',
        text: sipConfig?.sipUser ? `Tổng đài SIP sẵn sàng · Ext ${sipConfig.sipUser}` : 'Tổng đài SIP sẵn sàng',
        toneClass: isDark
          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
          : 'bg-emerald-50 border-emerald-200 text-emerald-700',
      };
    }
    if (isSimulated) {
      return {
        dotClass: 'bg-amber-500',
        text: 'Chế độ Mô phỏng (Test)',
        toneClass: isDark
          ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
          : 'bg-amber-50 border-amber-200 text-amber-700',
      };
    }
    if (omicallReady && !isRegistered) {
      return {
        dotClass: 'bg-sky-500 animate-pulse',
        text: 'Đang kết nối tổng đài...',
        toneClass: isDark ? 'bg-sky-500/10 border-sky-500/25 text-sky-300' : 'bg-sky-50 border-sky-200 text-sky-700',
      };
    }
    if (isAdmin && !adminOmiCallEnabled) {
      return {
        dotClass: 'bg-amber-400',
        text: 'Sẽ tự động bật OmiCall khi gọi',
        toneClass: isDark
          ? 'bg-slate-800/80 border-slate-700 text-slate-300'
          : 'bg-slate-100 border-slate-200 text-slate-700',
      };
    }
    return {
      dotClass: 'bg-slate-400',
      text: 'Tổng đài sẽ kết nối khi gọi',
      toneClass: isDark
        ? 'bg-slate-800/80 border-slate-700 text-slate-300'
        : 'bg-slate-100 border-slate-200 text-slate-700',
    };
  })();

  const handlePressKey = (digit: string) => {
    setSelectedCustomer(null);
    setInputValue((prev) => `${prev}${digit}`);
  };

  const handleBackspace = () => {
    setSelectedCustomer(null);
    setInputValue((prev) => prev.slice(0, -1));
  };

  const cardSurface = isDark
    ? 'bg-slate-900/75 border-slate-700/80 text-slate-100'
    : 'bg-slate-50 border-slate-200 text-slate-900';

  return (
    <AdaptiveModal
      open={isOpen}
      onCancel={handleClose}
      footer={null}
      centered
      destroyOnHidden
      intent="form"
      zIndex={zIndex}
      width={400}
      wrapClassName={isDark ? 'dark-theme' : 'light-theme'}
      title={
        <div className="flex items-center gap-2 text-sm font-bold">
          <span
            className={`w-7 h-7 rounded-lg inline-flex items-center justify-center ${
              isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-700'
            }`}
          >
            <PhoneCall size={15} />
          </span>
          <span>Gọi số điện thoại qua OmiCall</span>
        </div>
      }
    >
      <div className="space-y-3 pt-1">
        {/* Status strip */}
        {callState !== 'idle' ? (
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${
              isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span>Đang có cuộc gọi diễn ra. Vui lòng hoàn tất cuộc gọi hiện tại trước khi quay số mới.</span>
          </div>
        ) : (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${sipStatus.toneClass}`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${sipStatus.dotClass}`} />
            <span className="truncate">{sipStatus.text}</span>
          </div>
        )}

        {/* Phone / Customer search input */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${cardSurface}`}>
          <Search size={15} className="shrink-0 opacity-60" />
          <input
            ref={inputRef}
            type="tel"
            inputMode="tel"
            value={inputValue}
            onChange={(e) => {
              setSelectedCustomer(null);
              setInputValue(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canDial) {
                e.preventDefault();
                void handleTriggerDial();
              }
            }}
            placeholder="Nhập số điện thoại hoặc tên khách hàng..."
            aria-label="Nhập số điện thoại hoặc tên khách hàng"
            className="w-full bg-transparent border-0 outline-none text-base font-mono font-semibold tabular-nums"
          />
          {inputValue && (
            <button
              type="button"
              aria-label="Xoá số đã nhập"
              onClick={() => {
                setInputValue('');
                setSelectedCustomer(null);
                setMatchedCustomers([]);
              }}
              className="w-6 h-6 rounded-full inline-flex items-center justify-center opacity-60 hover:opacity-100 cursor-pointer shrink-0"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Selected customer chip */}
        {selectedCustomer && (
          <div
            className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs ${
              isDark
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Avatar size={26} src={selectedCustomer.avatar || undefined} icon={<User size={13} />} />
              <div className="min-w-0">
                <div className="font-bold truncate">{selectedCustomer.name}</div>
                <div className="font-mono text-[11px] opacity-80 tabular-nums">
                  {formatDisplayPhone(selectedCustomer.phone)}
                </div>
              </div>
            </div>
            <button
              type="button"
              aria-label="Bỏ chọn khách hàng"
              onClick={() => setSelectedCustomer(null)}
              className="p-1 rounded-md opacity-70 hover:opacity-100 cursor-pointer shrink-0"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Matched CRM customers */}
        {(searchingCustomers || matchedCustomers.length > 0) && (
          <div className={`rounded-xl border p-2 space-y-1 max-h-40 overflow-y-auto ${cardSurface}`}>
            <div className="flex items-center justify-between px-1 text-[11px] font-semibold opacity-70">
              <span>Khách hàng CRM phù hợp</span>
              {searchingCustomers && <Spin size="small" />}
            </div>
            {matchedCustomers.map((customer) => {
              const dialable = isValidDialablePhone(customer.phone);
              return (
                <div
                  key={customer.id}
                  className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-slate-800/80' : 'hover:bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!customer.phone) return;
                      const normalized = normalizeVietnamDialPhone(customer.phone);
                      setInputValue(normalized);
                      setSelectedCustomer({
                        id: customer.id,
                        name: customer.name || 'Khách hàng',
                        phone: normalized,
                        avatar: customer.avatar || null,
                      });
                    }}
                    className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer bg-transparent border-0 p-0"
                  >
                    <Avatar size={26} src={customer.avatar || undefined} icon={<User size={13} />} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate">{customer.name || `KH #${customer.id}`}</div>
                      <div className="text-[11px] opacity-75 font-mono tabular-nums truncate">
                        {customer.phone || 'Chưa có SĐT'}
                      </div>
                    </div>
                  </button>
                  {dialable && customer.phone && (
                    <Button
                      size="small"
                      type="primary"
                      disabled={callState !== 'idle'}
                      icon={<PhoneCall size={12} />}
                      onClick={() =>
                        void handleTriggerDial({
                          phone: customer.phone!,
                          name: customer.name || 'Khách hàng',
                          customerId: customer.id,
                          avatar: customer.avatar || null,
                        })
                      }
                      style={{ background: '#10b981', borderColor: '#10b981' }}
                    >
                      Gọi
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 3x4 Interactive Dialpad */}
        <div className="grid grid-cols-3 gap-2">
          {DIALPAD_KEYS.map((item) => (
            <button
              key={item.digit}
              type="button"
              onClick={() => handlePressKey(item.digit)}
              aria-label={`Phím ${item.digit}`}
              className={`h-12 rounded-xl border flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer select-none ${
                isDark
                  ? 'bg-slate-800/70 border-slate-700/80 text-slate-100 hover:bg-slate-700/80'
                  : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-100 shadow-2xs'
              }`}
            >
              <span className="text-base font-bold leading-none tabular-nums">{item.digit}</span>
              {item.letters && (
                <span className="text-[9px] tracking-widest opacity-55 mt-0.5 font-semibold">{item.letters}</span>
              )}
            </button>
          ))}
        </div>

        {/* Action Row: Call CTA + Backspace */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            type="primary"
            size="large"
            block
            data-testid="mos-chat-omicall-dial-submit-btn"
            disabled={!canDial}
            icon={<PhoneCall size={16} />}
            onClick={() => void handleTriggerDial()}
            style={canDial ? { background: '#10b981', borderColor: '#10b981', fontWeight: 700 } : { fontWeight: 700 }}
          >
            Gọi qua OmiCall
          </Button>
          <button
            type="button"
            aria-label="Xoá 1 ký tự"
            onClick={handleBackspace}
            disabled={!inputValue}
            className={`h-10 w-11 shrink-0 rounded-xl border inline-flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isDark
                ? 'bg-slate-800/70 border-slate-700/80 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Delete size={16} />
          </button>
        </div>

        {/* Recent Dials */}
        {recentDials.length > 0 && !inputValue.trim() && (
          <div className={`rounded-xl border p-2.5 space-y-1.5 ${cardSurface}`}>
            <div className="flex items-center justify-between text-[11px] font-semibold opacity-75">
              <span className="inline-flex items-center gap-1">
                <Clock size={12} />
                Gọi gần đây
              </span>
              <button
                type="button"
                onClick={() => {
                  clearRecentMosChatDials(userKey);
                  setRecentDials([]);
                }}
                className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer bg-transparent border-0 p-0"
              >
                <Trash2 size={11} />
                Xoá lịch sử
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentDials.map((recent) => (
                <button
                  key={recent.phone}
                  type="button"
                  disabled={callState !== 'idle'}
                  onClick={() =>
                    void handleTriggerDial({
                      phone: recent.phone,
                      name: recent.name,
                      customerId: recent.customerId,
                      avatar: recent.avatar ?? null,
                    })
                  }
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-colors disabled:opacity-50 ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:border-emerald-500/50'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-emerald-400'
                  }`}
                >
                  <PhoneCall size={11} className="text-emerald-500 shrink-0" />
                  <span className="font-mono tabular-nums font-medium">{formatDisplayPhone(recent.phone)}</span>
                  {recent.name && <span className="opacity-70 truncate max-w-[110px]">· {recent.name}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdaptiveModal>
  );
};
