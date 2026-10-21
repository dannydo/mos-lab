'use client';

import React, { useRef, useState } from 'react';
import type { MosChatImageAttachment, MosChatInventoryVarianceItem, MosChatWorkflowInstance } from '@mos-lab/shared';
import { readOrCompressImagePayload } from '../utils/chat-helpers';
import { chatApi } from '../../../lib/api/chat.api';

export interface MosChatWorkflowCardProps {
  workflow: MosChatWorkflowInstance;
  isDark: boolean;
  isSuperAdmin: boolean;
  currentStaffId?: number | null;
  currentUserName?: string;
  onWorkflowUpdated: (updated: MosChatWorkflowInstance) => void;
  onOpenLightbox?: (url: string, name: string) => void;
}

export const MosChatWorkflowCard: React.FC<MosChatWorkflowCardProps> = React.memo(
  ({ workflow, isDark, isSuperAdmin, currentStaffId, currentUserName, onWorkflowUpdated, onOpenLightbox }) => {
    const [note, setNote] = useState('');
    const [attachments, setAttachments] = useState<MosChatImageAttachment[]>([]);
    const [uploading, setUploading] = useState(false);
    const [submittingAction, setSubmittingAction] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const activeStep = workflow.steps[workflow.currentStepIndex];
    const isCompleted = workflow.status === 'COMPLETED';
    const isRejected = workflow.status === 'REJECTED';
    const isInProgress = workflow.status === 'IN_PROGRESS';

    const normalizedUserName = String(currentUserName || '')
      .trim()
      .toLowerCase();
    const isAssignedStepActor =
      Boolean(
        activeStep?.actorStaffId && currentStaffId && Number(activeStep.actorStaffId) === Number(currentStaffId)
      ) ||
      Boolean(
        activeStep?.actorRole === 'REQUESTER' &&
        currentStaffId &&
        Number(workflow.initiatorStaffId) === Number(currentStaffId)
      ) ||
      Boolean(
        activeStep?.actorName && normalizedUserName && activeStep.actorName.trim().toLowerCase() === normalizedUserName
      );

    // Hide action controls for everyone except Super Admin or the assigned actor of the current step
    const canActOnCurrentStep = isInProgress && (isSuperAdmin || isAssignedStepActor);

    const amount = Number(workflow.formData?.amount || 0);
    const reason = String(workflow.formData?.reason || '');
    const bankInfo = String(workflow.formData?.bankInfo || '');
    const inventoryItems = Array.isArray(workflow.formData?.inventoryItems)
      ? (workflow.formData.inventoryItems as MosChatInventoryVarianceItem[])
      : [];

    const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      setUploading(true);
      setErrorMsg(null);
      try {
        for (const file of files) {
          const compressed = await readOrCompressImagePayload(file);
          const res = await chatApi.chat.uploadImage({
            dataBase64: compressed.dataBase64,
            mimeType: compressed.mimeType,
            fileName: file.name,
            width: compressed.width,
            height: compressed.height,
            source: 'upload',
          });
          if (res?.attachment) {
            setAttachments((prev) => [...prev, res.attachment]);
          }
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Không thể tải ảnh minh chứng.');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    const handleExecuteStep = async (action: 'ADVANCE' | 'APPROVE' | 'REJECT' | 'CONFIRM') => {
      if (action !== 'REJECT' && activeStep?.requireAttachment && attachments.length === 0) {
        setErrorMsg('Bước này bắt buộc phải đính kèm ảnh chụp màn hình chuyển khoản / minh chứng (UNC).');
        return;
      }
      setSubmittingAction(action);
      setErrorMsg(null);
      try {
        const res = await chatApi.chat.actionWorkflowInstance(workflow.id, {
          action,
          note: note.trim() || undefined,
          attachments: attachments.length > 0 ? attachments : undefined,
        });
        if (res?.workflow) {
          setNote('');
          setAttachments([]);
          onWorkflowUpdated(res.workflow);
        }
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (err instanceof Error ? err.message : 'Không thể thực hiện bước quy trình.');
        setErrorMsg(msg);
      } finally {
        setSubmittingAction(null);
      }
    };

    const borderColor = isCompleted
      ? isDark
        ? 'rgba(16, 185, 129, 0.45)'
        : '#a7f3d0'
      : isRejected
        ? isDark
          ? 'rgba(239, 68, 68, 0.45)'
          : '#fecaca'
        : isDark
          ? 'rgba(59, 130, 246, 0.45)'
          : '#bfdbfe';

    const headerBg = isCompleted
      ? isDark
        ? 'rgba(16, 185, 129, 0.14)'
        : '#ecfdf5'
      : isRejected
        ? isDark
          ? 'rgba(239, 68, 68, 0.14)'
          : '#fef2f2'
        : isDark
          ? 'rgba(59, 130, 246, 0.14)'
          : '#eff6ff';

    return (
      <div
        style={{
          marginTop: 8,
          borderRadius: 12,
          border: `1px solid ${borderColor}`,
          background: 'var(--mos-surface, #ffffff)',
          color: 'var(--mos-text)',
          overflow: 'hidden',
          maxWidth: 560,
          boxShadow: 'var(--mos-shadow, 0 2px 10px rgba(15,23,42,0.06))',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '10px 14px',
            background: headerBg,
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>
              {workflow.category === 'FINANCE' ? '💸' : workflow.category === 'INVENTORY' ? '📦' : '⚡'}
            </span>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                  color: 'var(--mos-accent)',
                }}
              >
                {workflow.templateName}
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: 'var(--mos-text)',
                }}
              >
                {workflow.title}
              </div>
            </div>
          </div>

          <span
            className="inline-flex items-center justify-center leading-none tabular-nums"
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              background: isCompleted ? '#10b981' : isRejected ? '#ef4444' : 'var(--mos-accent)',
              color: isCompleted || isRejected ? '#ffffff' : 'var(--mos-accent-contrast)',
            }}
          >
            {isCompleted
              ? '✓ ĐÃ HOÀN TẤT'
              : isRejected
                ? '✕ ĐÃ TỪ CHỐI'
                : `BƯỚC ${workflow.currentStepIndex + 1}/${workflow.steps.length}`}
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Finance Summary */}
          {amount > 0 && (
            <div
              style={{
                padding: '9px 12px',
                borderRadius: 8,
                background: 'var(--mos-surface-raised)',
                border: '1px solid var(--mos-surface-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--mos-text-muted)' }}>Số tiền yêu cầu:</span>
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: '#10b981',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {amount.toLocaleString('vi-VN')}đ
                </span>
              </div>
              {reason && (
                <div style={{ fontSize: 12, color: 'var(--mos-text)' }}>
                  <strong>Lý do:</strong> {reason}
                </div>
              )}
              {bankInfo && (
                <div style={{ fontSize: 11.5, color: 'var(--mos-text-muted)' }}>
                  <strong>TK nhận:</strong> {bankInfo}
                </div>
              )}
            </div>
          )}

          {/* Inventory Reconciliation Table */}
          {inventoryItems.length > 0 && (
            <div
              style={{
                borderRadius: 8,
                border: '1px solid var(--mos-surface-border)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '6px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  background: 'var(--mos-surface-raised)',
                  color: 'var(--mos-text)',
                  display: 'grid',
                  gridTemplateColumns: '1fr 70px 70px 80px',
                  gap: 6,
                }}
              >
                <span>Vật tư ({String(workflow.formData?.warehouse || 'Đề Thám')})</span>
                <span style={{ textAlign: 'right' }}>mOS Kho</span>
                <span style={{ textAlign: 'right' }}>Thực tế</span>
                <span style={{ textAlign: 'right' }}>Lệch</span>
              </div>
              {inventoryItems.map((item, idx) => {
                const diff = Number(item.variance || 0);
                return (
                  <div
                    key={`${item.materialName}-${idx}`}
                    className="tabular-nums"
                    style={{
                      padding: '6px 10px',
                      fontSize: 12,
                      borderTop: '1px solid var(--mos-surface-border)',
                      display: 'grid',
                      gridTemplateColumns: '1fr 70px 70px 80px',
                      gap: 6,
                      alignItems: 'center',
                      color: 'var(--mos-text)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>
                      {item.materialName} <small style={{ opacity: 0.65 }}>({item.unit})</small>
                    </span>
                    <span style={{ textAlign: 'right', opacity: 0.8 }}>{item.systemQty}</span>
                    <span style={{ textAlign: 'right', fontWeight: 700 }}>{item.actualQty}</span>
                    <span
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        color: diff === 0 ? '#10b981' : diff < 0 ? '#ef4444' : '#f59e0b',
                      }}
                    >
                      {diff > 0 ? `+${diff}` : diff === 0 ? 'Khớp' : String(diff)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step-by-Step Progress Pipeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {workflow.steps.map((step, idx) => {
              const log = workflow.stepLogs?.[idx];
              const status = log?.status || 'PENDING';
              const isCurrent = isInProgress && idx === workflow.currentStepIndex;
              const isDone = status === 'COMPLETED' || status === 'APPROVED';
              const isStepRejected = status === 'REJECTED';

              return (
                <div
                  key={step.id || idx}
                  style={{
                    padding: '7px 10px',
                    borderRadius: 8,
                    background: isCurrent ? 'var(--mos-focus-ring)' : 'var(--mos-surface-raised)',
                    border: `1px solid ${
                      isCurrent
                        ? 'var(--mos-accent)'
                        : isDone
                          ? isDark
                            ? 'rgba(16, 185, 129, 0.3)'
                            : '#bbf7d0'
                          : 'var(--mos-surface-border)'
                    }`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        className="inline-flex items-center justify-center leading-none tabular-nums"
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          fontSize: 10,
                          fontWeight: 700,
                          background: isDone
                            ? '#10b981'
                            : isStepRejected
                              ? '#ef4444'
                              : isCurrent
                                ? 'var(--mos-accent)'
                                : isDark
                                  ? '#334155'
                                  : '#cbd5e1',
                          color: isCurrent && !isDone && !isStepRejected ? 'var(--mos-accent-contrast)' : '#ffffff',
                        }}
                      >
                        {isDone ? '✓' : isStepRejected ? '✕' : idx + 1}
                      </span>
                      <span
                        style={{
                          fontSize: 12.5,
                          fontWeight: isCurrent ? 700 : 600,
                          color: 'var(--mos-text)',
                        }}
                      >
                        {step.title}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: isDone ? '#10b981' : isCurrent ? 'var(--mos-accent)' : 'var(--mos-text-muted)',
                      }}
                    >
                      {isDone
                        ? `${log?.actorName || step.actorRole}`
                        : isCurrent
                          ? `Chờ: ${step.actorName || step.actorRole}`
                          : step.actorName || step.actorRole}
                    </span>
                  </div>

                  {log?.note && (
                    <div style={{ fontSize: 11.5, color: 'var(--mos-text-muted)', paddingLeft: 24 }}>💬 {log.note}</div>
                  )}

                  {log?.attachments && log.attachments.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 24, marginTop: 2 }}>
                      {log.attachments.map((att) => (
                        <img
                          key={att.id}
                          src={att.url}
                          alt={att.name}
                          onClick={() => onOpenLightbox?.(att.url, att.name)}
                          style={{
                            width: 56,
                            height: 56,
                            objectFit: 'cover',
                            borderRadius: 6,
                            cursor: 'pointer',
                            border: '1px solid rgba(59,130,246,0.4)',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* System Synced Summary Banner */}
          {workflow.syncedSummary && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                background: isDark ? 'rgba(16, 185, 129, 0.14)' : '#ecfdf5',
                border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.35)' : '#6ee7b7'}`,
                fontSize: 12,
                color: isDark ? '#6ee7b7' : '#065f46',
                fontWeight: 600,
              }}
            >
              📊 {workflow.syncedSummary}
            </div>
          )}

          {/* Action Controls — STRICTLY VISIBLE ONLY TO SUPER ADMIN OR CURRENT STEP ACTOR */}
          {canActOnCurrentStep && activeStep && (
            <div
              style={{
                marginTop: 4,
                paddingTop: 10,
                borderTop: '1px dashed var(--mos-surface-border-strong)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={`Ghi chú cho bước "${activeStep.title}"...`}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    border: '1px solid var(--mos-surface-border-strong)',
                    background: 'var(--mos-surface-raised)',
                    color: 'var(--mos-text)',
                    outline: 'none',
                  }}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleUploadProof}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: `1px solid ${activeStep.requireAttachment ? 'var(--mos-accent)' : 'var(--mos-surface-border-strong)'}`,
                    background: 'var(--mos-surface-raised)',
                    color: 'var(--mos-text)',
                  }}
                >
                  {uploading ? 'Đang tải...' : '📎 Đính kèm ảnh/UNC'}
                </button>
              </div>

              {attachments.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {attachments.map((att) => (
                    <div key={att.id} style={{ position: 'relative' }}>
                      <img
                        src={att.url}
                        alt={att.name}
                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }}
                      />
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== att.id))}
                        style={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          fontSize: 10,
                          cursor: 'pointer',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {errorMsg && <div style={{ fontSize: 11.5, color: '#ef4444', fontWeight: 600 }}>{errorMsg}</div>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                {activeStep.stepType === 'APPROVAL' && (
                  <button
                    type="button"
                    disabled={Boolean(submittingAction)}
                    onClick={() => handleExecuteStep('REJECT')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      border: '1px solid #ef4444',
                      background: 'transparent',
                      color: '#ef4444',
                      cursor: 'pointer',
                    }}
                  >
                    Từ chối
                  </button>
                )}
                <button
                  type="button"
                  disabled={Boolean(submittingAction)}
                  onClick={() =>
                    handleExecuteStep(
                      activeStep.stepType === 'APPROVAL'
                        ? 'APPROVE'
                        : activeStep.stepType === 'CONFIRMATION'
                          ? 'CONFIRM'
                          : 'ADVANCE'
                    )
                  }
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    background: '#10b981',
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  {submittingAction
                    ? 'Đang xử lý...'
                    : activeStep.actionButtonLabel || `Xác nhận Bước ${workflow.currentStepIndex + 1}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

MosChatWorkflowCard.displayName = 'MosChatWorkflowCard';
