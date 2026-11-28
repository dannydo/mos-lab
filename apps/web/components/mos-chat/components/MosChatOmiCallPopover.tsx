'use client';

import React, { useMemo, useState } from 'react';
import { Button, Input, Popover, Tooltip, message as antdMessage } from 'antd';
import { PhoneCall, Plus } from 'lucide-react';
import {
  isCanonicalSuperAdminIdentity,
  isSuperAdminRole,
  type MosChatConversation,
  type MosChatStaffMember,
  type SafeAny,
} from '@mos-lab/shared';
import { useOmiCall } from '../../../context/OmiCallContext';
import { apiClient } from '../../../lib/api-client';
import { extractDialablePhones, normalizeDialablePhone, resolveDmPeerStaff } from '../utils/resolveDmOmiCallTarget';

export interface MosChatOmiCallPopoverProps {
  activeConversation: MosChatConversation | null | undefined;
  staffDirectory?: MosChatStaffMember[];
  currentUser?: SafeAny;
  isDark: boolean;
  compact?: boolean;
  testId?: string;
}

export const MosChatOmiCallPopover: React.FC<MosChatOmiCallPopoverProps> = ({
  activeConversation,
  staffDirectory,
  currentUser,
  isDark,
  compact = false,
  testId = 'mos-chat-header-omicall-btn',
}) => {
  const { makeCall, canAccessOmiCall } = useOmiCall();
  const [open, setOpen] = useState(false);
  const [customPhone, setCustomPhone] = useState('');
  const [addingExtraPhone, setAddingExtraPhone] = useState(false);
  const [newExtraPhone, setNewExtraPhone] = useState('');
  const [savingExtraPhone, setSavingExtraPhone] = useState(false);
  const [localAddedPhonesByStaffId, setLocalAddedPhonesByStaffId] = useState<Record<number, string[]>>({});

  const dmPeer = useMemo(
    () => resolveDmPeerStaff(activeConversation, staffDirectory, currentUser),
    [activeConversation, staffDirectory, currentUser]
  );

  const mergedPeerPhones = useMemo(() => {
    if (!dmPeer) return [];
    const localExtras = localAddedPhonesByStaffId[dmPeer.id] || [];
    return extractDialablePhones(dmPeer.phone, [...(dmPeer.phones || []), ...localExtras]);
  }, [dmPeer, localAddedPhonesByStaffId]);

  const canManagePeerPhones = Boolean(
    currentUser &&
    (isSuperAdminRole(currentUser.role) ||
      isCanonicalSuperAdminIdentity({ username: currentUser.username, email: currentUser.email }))
  );
  const showDmPeerSection = Boolean(dmPeer && (mergedPeerPhones.length > 0 || canManagePeerPhones));

  if (!canAccessOmiCall) {
    return null;
  }

  const dialPhone = (rawPhone: string, label: string, avatar?: string | null) => {
    const cleanPhone = normalizeDialablePhone(rawPhone);
    if (!cleanPhone) {
      antdMessage.warning('Số điện thoại không hợp lệ (cần tối thiểu 8 chữ số).');
      return;
    }
    setOpen(false);
    void makeCall(cleanPhone, label, undefined, avatar || undefined, undefined, { autoEnableAdmin: true });
  };

  const handleDialCustom = () => {
    const cleanPhone = normalizeDialablePhone(customPhone);
    if (!cleanPhone) {
      antdMessage.warning('Vui lòng nhập số điện thoại hợp lệ (tối thiểu 8 chữ số).');
      return;
    }
    const label = showDmPeerSection && dmPeer ? `${dmPeer.displayName} (${cleanPhone})` : cleanPhone;
    setCustomPhone('');
    dialPhone(cleanPhone, label, dmPeer?.avatarUrl || activeConversation?.avatar);
  };

  const handleSaveExtraPhone = async () => {
    if (!dmPeer) return;
    const cleanPhone = normalizeDialablePhone(newExtraPhone);
    if (!cleanPhone) {
      antdMessage.warning('Vui lòng nhập số điện thoại hợp lệ (tối thiểu 8 chữ số).');
      return;
    }

    const primaryDigits = dmPeer.phone ? normalizeDialablePhone(dmPeer.phone) : '';
    const existingExtras = mergedPeerPhones.filter((p) => {
      const norm = normalizeDialablePhone(p);
      return norm && norm !== primaryDigits;
    });
    const nextExtras = extractDialablePhones(null, [...existingExtras, newExtraPhone.trim()]).filter(
      (p) => normalizeDialablePhone(p) !== primaryDigits
    );

    setSavingExtraPhone(true);
    try {
      await apiClient.staff.update(dmPeer.id, { extraPhones: nextExtras });
      setLocalAddedPhonesByStaffId((prev) => ({
        ...prev,
        [dmPeer.id]: nextExtras,
      }));
      setNewExtraPhone('');
      setAddingExtraPhone(false);
      antdMessage.success(`Đã lưu thêm số ${cleanPhone} cho ${dmPeer.displayName}`);
    } catch {
      antdMessage.error('Không thể lưu số điện thoại phụ. Vui lòng thử lại.');
    } finally {
      setSavingExtraPhone(false);
    }
  };

  const peerLabel = dmPeer?.displayName || activeConversation?.name || 'OmiCall';
  const tooltipText =
    showDmPeerSection && dmPeer && mergedPeerPhones.length > 0
      ? `Gọi OmiCall tới ${peerLabel} (${mergedPeerPhones.join(' / ')})`
      : 'Gọi OmiCall tới bất kỳ số điện thoại nào';

  const popoverContent = (
    <div
      className={`w-72 space-y-3 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
      onClick={(e) => e.stopPropagation()}
    >
      {showDmPeerSection && dmPeer && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold truncate">{dmPeer.displayName}</span>
            {canManagePeerPhones && (
              <button
                type="button"
                onClick={() => setAddingExtraPhone((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500 hover:text-amber-400 cursor-pointer shrink-0"
              >
                <Plus size={12} />
                <span>Lưu thêm SĐT</span>
              </button>
            )}
          </div>

          {mergedPeerPhones.length > 0 ? (
            <div className="space-y-1.5">
              {mergedPeerPhones.map((phone, idx) => (
                <div
                  key={phone}
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border ${
                    isDark ? 'bg-slate-900/60 border-slate-700/70' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono font-semibold tabular-nums truncate">{phone}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        idx === 0
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : isDark
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {idx === 0 ? 'Chính' : 'Số phụ'}
                    </span>
                  </div>
                  <Button
                    type="primary"
                    size="small"
                    data-testid="mos-chat-omicall-number-btn"
                    icon={<PhoneCall size={12} />}
                    onClick={() => dialPhone(phone, dmPeer.displayName, dmPeer.avatarUrl || activeConversation?.avatar)}
                    style={{ background: '#f59e0b', borderColor: '#f59e0b', color: '#111827', fontWeight: 700 }}
                  >
                    Gọi
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400">Chưa có số điện thoại lưu cho {dmPeer.displayName}.</div>
          )}

          {canManagePeerPhones && addingExtraPhone && (
            <div className="flex items-center gap-1.5 pt-1">
              <Input
                size="small"
                value={newExtraPhone}
                onChange={(e) => setNewExtraPhone(e.target.value)}
                onPressEnter={() => void handleSaveExtraPhone()}
                placeholder="Nhập SĐT mới cần lưu..."
                data-testid="mos-chat-omicall-add-phone-input"
              />
              <Button
                size="small"
                type="primary"
                loading={savingExtraPhone}
                onClick={() => void handleSaveExtraPhone()}
                data-testid="mos-chat-omicall-add-phone-save"
              >
                Lưu
              </Button>
            </div>
          )}
        </div>
      )}

      <div
        className={
          showDmPeerSection
            ? `pt-2.5 border-t space-y-1.5 ${isDark ? 'border-slate-700/70' : 'border-slate-200'}`
            : 'space-y-1.5'
        }
      >
        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-500">Gọi bất kỳ SĐT nào</div>
        <div className="flex items-center gap-1.5">
          <Input
            size="small"
            value={customPhone}
            onChange={(e) => setCustomPhone(e.target.value)}
            onPressEnter={handleDialCustom}
            placeholder="Nhập / dán SĐT bất kỳ..."
            data-testid="mos-chat-omicall-custom-input"
          />
          <Button
            size="small"
            type="primary"
            icon={<PhoneCall size={12} />}
            onClick={handleDialCustom}
            data-testid="mos-chat-omicall-custom-dial-btn"
            style={{ background: '#f59e0b', borderColor: '#f59e0b', color: '#111827', fontWeight: 700 }}
          >
            Gọi
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomRight"
      zIndex={10030}
      content={popoverContent}
    >
      <Tooltip title={tooltipText}>
        <button
          type="button"
          data-testid={testId}
          aria-label="Gọi OmiCall qua số điện thoại"
          className={
            compact
              ? 'w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer transition-colors hover:bg-amber-500/15 text-amber-500'
              : 'w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer transition-colors hover:opacity-90'
          }
          style={
            compact
              ? undefined
              : {
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#f59e0b',
                }
          }
        >
          <PhoneCall size={compact ? 12 : 14} />
        </button>
      </Tooltip>
    </Popover>
  );
};
