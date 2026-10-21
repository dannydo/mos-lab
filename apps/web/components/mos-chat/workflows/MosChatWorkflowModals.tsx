'use client';

import React, { useEffect, useState } from 'react';
import type {
  CreateMosChatWorkflowInstanceResponse,
  MosChatStaffMember,
  MosChatWorkflowCategory,
  MosChatWorkflowTargetHook,
  MosChatWorkflowTemplate,
  SaveThreadAsWorkflowTemplateResponse,
} from '@mos-lab/shared';
import { chatApi } from '../../../lib/api/chat.api';

export interface MosChatTriggerWorkflowModalProps {
  open: boolean;
  isDark: boolean;
  conversationId: string;
  templates: MosChatWorkflowTemplate[];
  staffDirectory: MosChatStaffMember[];
  initialTemplateCode?: string;
  onClose: () => void;
  onCreated: (res: CreateMosChatWorkflowInstanceResponse) => void;
}

export const MosChatTriggerWorkflowModal: React.FC<MosChatTriggerWorkflowModalProps> = ({
  open,
  isDark,
  conversationId,
  templates,
  staffDirectory,
  initialTemplateCode,
  onClose,
  onCreated,
}) => {
  const [selectedCode, setSelectedCode] = useState<string>(initialTemplateCode || 'WF_CASH_ADVANCE');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<string>('2000000');
  const [reason, setReason] = useState('');
  const [bankInfo, setBankInfo] = useState('');
  const [warehouse, setWarehouse] = useState('detham');
  const [inventoryText, setInventoryText] = useState(
    'Keo nối mi Dark Lashes Premium | 14\nKhay mi Lụa Thiết kế 0.07 C | 42'
  );
  const [stepActors, setStepActors] = useState<Record<number, number | ''>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open && initialTemplateCode) {
      setSelectedCode(initialTemplateCode);
    }
  }, [open, initialTemplateCode]);

  const activeTemplate = templates.find((t) => t.code === selectedCode) || templates[0] || null;

  useEffect(() => {
    if (!activeTemplate) return;
    if (activeTemplate.code === 'WF_CASH_ADVANCE') {
      setTitle('Đề xuất tạm ứng kinh phí vận hành');
    } else if (activeTemplate.code === 'WF_INVENTORY_AUDIT') {
      setTitle('Báo cáo kiểm kho & đối soát thực tế mOS Kho');
    } else {
      setTitle(activeTemplate.name);
    }
    setStepActors({});
  }, [activeTemplate]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!activeTemplate) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const formData: Record<string, unknown> = {};
      if (activeTemplate.targetSystemHook === 'CASHFLOW_ENTRY' || activeTemplate.category === 'FINANCE') {
        formData.amount = Number(String(amount).replace(/[^0-9]/g, '')) || 0;
        formData.reason = reason.trim() || title.trim();
        formData.bankInfo = bankInfo.trim();
        formData.cashFlowCategory = 'OPEX';
      } else if (activeTemplate.targetSystemHook === 'STOCK_INVENTORY' || activeTemplate.category === 'INVENTORY') {
        formData.warehouse = warehouse;
        const parsedRows = inventoryText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .map((line) => {
            const parts = line.split('|').map((p) => p.trim());
            return {
              materialName: parts[0] || 'Vật tư kho',
              actualQty: Number(parts[1] || 0),
            };
          });
        if (parsedRows.length > 0) {
          formData.inventoryItems = parsedRows;
        }
      } else {
        formData.reason = reason.trim();
      }

      const stepActorOverrides: Record<number, { actorStaffId?: number; actorName?: string }> = {};
      for (const [idxStr, staffIdVal] of Object.entries(stepActors)) {
        if (staffIdVal) {
          const staff = staffDirectory.find((s) => Number(s.id) === Number(staffIdVal));
          if (staff) {
            stepActorOverrides[Number(idxStr)] = {
              actorStaffId: staff.id,
              actorName: staff.displayName || staff.username,
            };
          }
        }
      }

      const res = await chatApi.chat.createWorkflowInstance({
        conversationId,
        templateCode: activeTemplate.code,
        title: title.trim() || activeTemplate.name,
        formData,
        stepActorOverrides,
      });
      onCreated(res);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Không thể phát thẻ quy trình.');
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10050,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 540,
          maxHeight: '88vh',
          overflowY: 'auto',
          borderRadius: 16,
          background: 'var(--mos-surface)',
          border: '1px solid var(--mos-surface-border-strong)',
          boxShadow: 'var(--mos-shadow, 0 24px 48px rgba(0,0,0,0.35))',
          padding: 20,
          color: 'var(--mos-text)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mos-accent)', textTransform: 'uppercase' }}>
              ⚡ Super Admin Operational OS
            </div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Khởi tạo Quy trình Sống trong mOS Chat</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 18,
              color: 'var(--mos-text-muted)',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
              Chọn mẫu Quy trình (Workflow Template)
            </label>
            <select
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--mos-surface-border-strong)',
                background: 'var(--mos-surface-raised)',
                color: 'var(--mos-text)',
                fontSize: 13,
              }}
            >
              {templates.map((tpl) => (
                <option key={tpl.code} value={tpl.code}>
                  {tpl.name} (v{tpl.version})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
              Tiêu đề phiếu quy trình
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--mos-surface-border-strong)',
                background: 'var(--mos-surface-raised)',
                color: 'var(--mos-text)',
                fontSize: 13,
              }}
            />
          </div>

          {activeTemplate?.targetSystemHook === 'CASHFLOW_ENTRY' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    Số tiền tạm ứng (VNĐ)
                  </label>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="tabular-nums"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--mos-surface-border-strong)',
                      background: 'var(--mos-surface-raised)',
                      color: '#10b981',
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    Tài khoản nhận (Ngân hàng / STK)
                  </label>
                  <input
                    type="text"
                    value={bankInfo}
                    onChange={(e) => setBankInfo(e.target.value)}
                    placeholder="VD: Vietcombank - 007100..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--mos-surface-border-strong)',
                      background: 'var(--mos-surface-raised)',
                      color: 'var(--mos-text)',
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Lý do / Hạng mục chi (Tự động ghi sổ CrmCashFlowEntry khi hoàn tất)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Nhập chi tiết mục đích sử dụng..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--mos-surface-border-strong)',
                    background: 'var(--mos-surface-raised)',
                    color: 'var(--mos-text)',
                    fontSize: 13,
                  }}
                />
              </div>
            </>
          )}

          {activeTemplate?.targetSystemHook === 'STOCK_INVENTORY' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Kho kiểm kê (mOS Kho)
                </label>
                <select
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--mos-surface-border-strong)',
                    background: 'var(--mos-surface-raised)',
                    color: 'var(--mos-text)',
                    fontSize: 13,
                  }}
                >
                  <option value="detham">Kho Đề Thám (detham)</option>
                  <option value="central">Kho Tổng (central)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Số liệu đếm thực tế (Mỗi dòng: Tên vật tư | Số lượng thực tế — Để trống để lấy tự động từ mOS Kho)
                </label>
                <textarea
                  rows={3}
                  value={inventoryText}
                  onChange={(e) => setInventoryText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--mos-surface-border-strong)',
                    background: 'var(--mos-surface-raised)',
                    color: 'var(--mos-text)',
                    fontSize: 12.5,
                  }}
                />
              </div>
            </>
          )}

          {/* Step Actor Assignment */}
          {activeTemplate && (
            <div
              style={{
                padding: 12,
                borderRadius: 10,
                background: 'var(--mos-surface-raised)',
                border: '1px solid var(--mos-surface-border)',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                Phân công nhân sự thực hiện từng bước (Tự động tạo Nhắc việc)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activeTemplate.steps.map((step, idx) => (
                  <div
                    key={step.id || idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 180px',
                      gap: 8,
                      alignItems: 'center',
                      fontSize: 12,
                    }}
                  >
                    <span>
                      <strong>Bước {idx + 1}:</strong> {step.title} ({step.actorRole})
                    </span>
                    <select
                      value={stepActors[idx] ?? ''}
                      onChange={(e) =>
                        setStepActors((prev) => ({
                          ...prev,
                          [idx]: e.target.value ? Number(e.target.value) : '',
                        }))
                      }
                      style={{
                        padding: '5px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--mos-surface-border-strong)',
                        background: 'var(--mos-surface)',
                        color: 'var(--mos-text)',
                        fontSize: 11.5,
                      }}
                    >
                      <option value="">Mặc định theo vai trò ({step.actorRole})</option>
                      {staffDirectory.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.displayName || s.username} ({s.role})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errorMsg && <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 600 }}>{errorMsg}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid var(--mos-surface-border-strong)',
                background: 'var(--mos-surface-raised)',
                color: 'var(--mos-text-muted)',
                fontWeight: 600,
                fontSize: 12.5,
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--mos-accent)',
                color: 'var(--mos-accent-contrast)',
                fontWeight: 700,
                fontSize: 12.5,
                cursor: 'pointer',
              }}
            >
              {submitting ? 'Đang khởi tạo...' : '⚡ Phát Thẻ Quy Trình vào Nhóm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export interface MosChatSaveThreadWorkflowModalProps {
  open: boolean;
  isDark: boolean;
  conversationId: string;
  messageId?: string | null;
  defaultName?: string;
  existingTemplates: MosChatWorkflowTemplate[];
  onClose: () => void;
  onSaved: (res: SaveThreadAsWorkflowTemplateResponse) => void;
}

export const MosChatSaveThreadWorkflowModal: React.FC<MosChatSaveThreadWorkflowModalProps> = ({
  open,
  isDark,
  conversationId,
  messageId,
  defaultName,
  existingTemplates,
  onClose,
  onSaved,
}) => {
  const [mode, setMode] = useState<'NEW_FROM_THREAD' | 'UPGRADE_EXISTING'>('NEW_FROM_THREAD');
  const [selectedExistingCode, setSelectedExistingCode] = useState<string>(
    existingTemplates[0]?.code || 'WF_CASH_ADVANCE'
  );
  const [name, setName] = useState(defaultName || 'Quy trình Phối hợp Nội bộ Mới');
  const [category, setCategory] = useState<MosChatWorkflowCategory>('OPERATIONS');
  const [targetHook, setTargetHook] = useState<MosChatWorkflowTargetHook>('NONE');
  const [upgradeInstruction, setUpgradeInstruction] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (defaultName) {
      setName(defaultName);
    }
  }, [defaultName]);

  if (!open) return null;

  const handleSave = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const targetTpl = existingTemplates.find((t) => t.code === selectedExistingCode);
      const res = await chatApi.chat.saveThreadAsWorkflowTemplate({
        conversationId,
        messageId,
        code: mode === 'UPGRADE_EXISTING' ? selectedExistingCode : undefined,
        name: mode === 'UPGRADE_EXISTING' ? targetTpl?.name || name : name,
        category,
        targetSystemHook: targetHook,
        upgradeInstruction: upgradeInstruction.trim() || undefined,
      });
      onSaved(res);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Không thể đóng gói quy trình.');
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10050,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 500,
          borderRadius: 16,
          background: 'var(--mos-surface)',
          border: '1px solid var(--mos-surface-border-strong)',
          boxShadow: 'var(--mos-shadow, 0 24px 48px rgba(0,0,0,0.35))',
          padding: 20,
          color: 'var(--mos-text)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mos-accent)', textTransform: 'uppercase' }}>
              ✨ Adaptive Workflow Builder (Super Admin)
            </div>
            <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 800 }}>
              Chuẩn hóa Ngữ cảnh Chat thành Workflow / Nâng cấp Quy trình
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 18,
              color: 'var(--mos-text-muted)',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setMode('NEW_FROM_THREAD')}
            style={{
              flex: 1,
              padding: '7px 10px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              border: `1px solid ${mode === 'NEW_FROM_THREAD' ? 'var(--mos-accent)' : 'var(--mos-surface-border-strong)'}`,
              background: mode === 'NEW_FROM_THREAD' ? 'var(--mos-focus-ring)' : 'var(--mos-surface-raised)',
              color: mode === 'NEW_FROM_THREAD' ? 'var(--mos-accent)' : 'var(--mos-text-muted)',
            }}
          >
            Đóng gói Thread này thành Workflow mới
          </button>
          <button
            type="button"
            onClick={() => setMode('UPGRADE_EXISTING')}
            style={{
              flex: 1,
              padding: '7px 10px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              border: `1px solid ${mode === 'UPGRADE_EXISTING' ? 'var(--mos-accent)' : 'var(--mos-surface-border-strong)'}`,
              background: mode === 'UPGRADE_EXISTING' ? 'var(--mos-focus-ring)' : 'var(--mos-surface-raised)',
              color: mode === 'UPGRADE_EXISTING' ? 'var(--mos-accent)' : 'var(--mos-text-muted)',
            }}
          >
            Nâng cấp Workflow đang có
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'NEW_FROM_THREAD' ? (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Tên quy trình mới (Tự động học các bước từ người tham gia trong Thread)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--mos-surface-border-strong)',
                    background: 'var(--mos-surface-raised)',
                    color: 'var(--mos-text)',
                    fontSize: 13,
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Phân loại</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MosChatWorkflowCategory)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--mos-surface-border-strong)',
                      background: 'var(--mos-surface-raised)',
                      color: 'var(--mos-text)',
                      fontSize: 12.5,
                    }}
                  >
                    <option value="OPERATIONS">Vận hành nội bộ</option>
                    <option value="FINANCE">Tài chính / Tạm ứng</option>
                    <option value="INVENTORY">Kiểm kho & Vật tư</option>
                    <option value="BRAINSTORM">Nghiên cứu & Brainstorm</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    Đồng bộ tự động khi hoàn tất
                  </label>
                  <select
                    value={targetHook}
                    onChange={(e) => setTargetHook(e.target.value as MosChatWorkflowTargetHook)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--mos-surface-border-strong)',
                      background: 'var(--mos-surface-raised)',
                      color: 'var(--mos-text)',
                      fontSize: 12.5,
                    }}
                  >
                    <option value="NONE">Chỉ lưu hồ sơ quy trình</option>
                    <option value="CASHFLOW_ENTRY">Ghi sổ Báo cáo Thu Chi</option>
                    <option value="STOCK_INVENTORY">Đồng bộ tồn mOS Kho</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                Chọn quy trình cần nâng cấp
              </label>
              <select
                value={selectedExistingCode}
                onChange={(e) => setSelectedExistingCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--mos-surface-border-strong)',
                  background: 'var(--mos-surface-raised)',
                  color: 'var(--mos-text)',
                  fontSize: 13,
                }}
              >
                {existingTemplates.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name} (v{t.version})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
              Chỉ dẫn nâng cấp / tùy chỉnh bằng ngôn ngữ tự nhiên (Tùy chọn)
            </label>
            <textarea
              rows={3}
              value={upgradeInstruction}
              onChange={(e) => setUpgradeInstruction(e.target.value)}
              placeholder='VD: "Đổi bước duyệt 2 từ CEO sang Quản lý Vận hành" hoặc "Thêm bước Kế toán trưởng kiểm tra chứng từ"...'
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--mos-surface-border-strong)',
                background: 'var(--mos-surface-raised)',
                color: 'var(--mos-text)',
                fontSize: 12.5,
              }}
            />
          </div>

          {errorMsg && <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 600 }}>{errorMsg}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid var(--mos-surface-border-strong)',
                background: 'var(--mos-surface-raised)',
                color: 'var(--mos-text-muted)',
                fontWeight: 600,
                fontSize: 12.5,
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSave}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--mos-accent)',
                color: 'var(--mos-accent-contrast)',
                fontWeight: 700,
                fontSize: 12.5,
                cursor: 'pointer',
              }}
            >
              {submitting ? 'Đang lưu...' : '✨ Lưu & Áp dụng Quy Trình'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
