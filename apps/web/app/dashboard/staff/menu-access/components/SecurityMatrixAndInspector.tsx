'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, DatePicker, Select, Space, message } from 'antd';
import { Clock, History, SearchCheck, ShieldCheck } from 'lucide-react';
import type { Dayjs } from 'dayjs';
import {
  CV_DEFAULT_ALLOWED_MENU_KEYS,
  MENU_ACCESS_ROLE_GROUPS,
  removeVietnameseTones,
  type MenuAccessConfigurationResponse,
  type MenuAccessInspectorResponse,
  type MenuAccessPolicy,
} from '@mos-lab/shared';
import { AppIcon, DataSection, StatusTag } from '~/components/ui';
import { apiClient } from '../../../../../lib/api-client';
import styles from '../menu-access.module.css';

function toneInsensitiveOptionFilter(input: string, option?: { label?: React.ReactNode }) {
  return removeVietnameseTones(String(option?.label || '')).includes(removeVietnameseTones(input));
}

function formatAuditTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

export interface SecurityMatrixAndInspectorProps {
  configuration: MenuAccessConfigurationResponse | null;
  policyByKey: Map<string, MenuAccessPolicy>;
  onUpdated: () => Promise<void>;
}

export function SecurityMatrixAndInspector({ configuration, policyByKey, onUpdated }: SecurityMatrixAndInspectorProps) {
  // Quick Role Group Matrix state
  const [selectedRoleGroupId, setSelectedRoleGroupId] = useState<number>(1); // Default: 1 (CV)
  const [roleGroupAllowedKeys, setRoleGroupAllowedKeys] = useState<string[]>([...CV_DEFAULT_ALLOWED_MENU_KEYS]);
  const [savingRoleMatrix, setSavingRoleMatrix] = useState(false);

  // Point-in-Time Inspector state
  const [inspectorMode, setInspectorMode] = useState<'STAFF' | 'ROLE'>('STAFF');
  const [inspectorStaffId, setInspectorStaffId] = useState<number | undefined>();
  const [inspectorRoleGroupId, setInspectorRoleGroupId] = useState<number>(1);
  const [inspectorAt, setInspectorAt] = useState<Dayjs | null>(null);
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [inspectorResult, setInspectorResult] = useState<MenuAccessInspectorResponse | null>(null);

  const roleGroupOptions = useMemo(
    () =>
      (configuration?.roleGroups || MENU_ACCESS_ROLE_GROUPS).map((group) => ({
        value: group.id,
        label: `${group.name} (${group.code}) — ${group.description}`,
      })),
    [configuration?.roleGroups]
  );

  const selectedRoleGroupInfo = useMemo(
    () =>
      (configuration?.roleGroups || MENU_ACCESS_ROLE_GROUPS).find((group) => group.id === selectedRoleGroupId) ||
      MENU_ACCESS_ROLE_GROUPS[0],
    [configuration?.roleGroups, selectedRoleGroupId]
  );

  // Sync Role Group Matrix checkboxes whenever configuration or selectedRoleGroupId changes
  useEffect(() => {
    if (!configuration) return;
    const roleGroup = (configuration.roleGroups || MENU_ACCESS_ROLE_GROUPS).find((g) => g.id === selectedRoleGroupId);
    const isCvGroup = roleGroup?.code === 'CV';
    const allowed: string[] = [];

    for (const menu of configuration.menus) {
      const policy = policyByKey.get(menu.key);
      const hasRoleRule = Boolean(
        policy?.subjects.some((s) => s.type === 'ROLE' && s.subjectId === selectedRoleGroupId)
      );
      if (isCvGroup) {
        if (hasRoleRule || CV_DEFAULT_ALLOWED_MENU_KEYS.includes(menu.key as any)) {
          allowed.push(menu.key);
        }
      } else {
        if (!policy?.isRestricted || hasRoleRule) {
          allowed.push(menu.key);
        }
      }
    }
    setRoleGroupAllowedKeys(allowed);
  }, [configuration, policyByKey, selectedRoleGroupId]);

  const handleSaveRoleGroupMatrix = async () => {
    setSavingRoleMatrix(true);
    try {
      await apiClient.menuAccess.updateRoleGroupMatrix(selectedRoleGroupId, {
        allowedMenuKeys: roleGroupAllowedKeys,
      });
      message.success('Đã lưu phân quyền nhóm vai trò thành công (áp dụng đồng thời cho Sidebar & API).');
      window.localStorage.setItem('mos_menu_access_revision', String(Date.now()));
      window.dispatchEvent(new Event('menu-access-updated'));
      await onUpdated();
    } catch (requestError: any) {
      message.error(requestError?.response?.data?.message || 'Không thể lưu phân quyền nhóm vai trò.');
    } finally {
      setSavingRoleMatrix(false);
    }
  };

  const handleInspectPermissions = useCallback(async () => {
    setInspectorLoading(true);
    try {
      const res = await apiClient.menuAccess.inspectPermissions({
        staffId: inspectorMode === 'STAFF' ? inspectorStaffId : undefined,
        roleGroupId: inspectorMode === 'ROLE' ? inspectorRoleGroupId : undefined,
        at: inspectorAt ? inspectorAt.toISOString() : undefined,
      });
      setInspectorResult(res);
    } catch (requestError: any) {
      message.error(requestError?.response?.data?.message || 'Không thể tra cứu quyền tại thời điểm này.');
    } finally {
      setInspectorLoading(false);
    }
  }, [inspectorMode, inspectorStaffId, inspectorRoleGroupId, inspectorAt]);

  return (
    <>
      <DataSection
        title={
          <span className={styles.sectionTitle}>
            <AppIcon icon={ShieldCheck} size="sm" />
            Phân quyền nhanh theo Nhóm Vai trò (Role Group Matrix)
            <StatusTag status="processing" label={`${roleGroupAllowedKeys.length} module được bật`} />
          </span>
        }
      >
        <div className={styles.matrixCard}>
          <div className={styles.matrixHeader}>
            <div className={styles.matrixControl}>
              <label className={styles.controlLabel}>Chọn Nhóm Vai trò cần điều chỉnh:</label>
              <Select
                className={styles.roleGroupSelect}
                value={selectedRoleGroupId}
                onChange={(val) => setSelectedRoleGroupId(val)}
                options={roleGroupOptions}
              />
            </div>
            <Space wrap>
              {selectedRoleGroupInfo.code === 'CV' && (
                <Button
                  onClick={() => setRoleGroupAllowedKeys([...CV_DEFAULT_ALLOWED_MENU_KEYS])}
                  disabled={savingRoleMatrix}
                >
                  Khôi phục mặc định CV (Báo Cáo CV + Career Path)
                </Button>
              )}
              <Button
                type="primary"
                loading={savingRoleMatrix}
                onClick={() => void handleSaveRoleGroupMatrix()}
                icon={<AppIcon icon={ShieldCheck} size="sm" />}
              >
                Lưu phân quyền Nhóm {selectedRoleGroupInfo.code}
              </Button>
            </Space>
          </div>
          <div className={styles.matrixCheckboxGrid}>
            {(configuration?.menus || []).map((menu) => (
              <label key={menu.key} className={styles.matrixItem}>
                <Checkbox
                  checked={roleGroupAllowedKeys.includes(menu.key)}
                  onChange={(e) =>
                    setRoleGroupAllowedKeys((prev) =>
                      e.target.checked ? Array.from(new Set([...prev, menu.key])) : prev.filter((k) => k !== menu.key)
                    )
                  }
                />
                <div className={styles.matrixItemCopy}>
                  <strong>{menu.label}</strong>
                  <span>
                    {menu.groupLabel} · {menu.path}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </DataSection>

      <DataSection
        title={
          <span className={styles.sectionTitle}>
            <AppIcon icon={SearchCheck} size="sm" />
            Tra cứu Ai đã được quyền gì & Vào khi nào (Point-in-Time Audit Inspector)
          </span>
        }
      >
        <div className={styles.inspectorCard}>
          <div className={styles.inspectorControls}>
            <Select
              className={styles.inspectorModeSelect}
              value={inspectorMode}
              onChange={(val) => setInspectorMode(val)}
              options={[
                { value: 'STAFF', label: 'Tra cứu theo Nhân sự cụ thể' },
                { value: 'ROLE', label: 'Tra cứu theo Nhóm Vai trò' },
              ]}
            />
            {inspectorMode === 'STAFF' ? (
              <Select
                showSearch
                className={styles.inspectorSubjectSelect}
                value={inspectorStaffId}
                onChange={(val) => setInspectorStaffId(val)}
                optionFilterProp="label"
                filterOption={toneInsensitiveOptionFilter}
                placeholder="Chọn nhân viên cần kiểm tra…"
                options={(configuration?.staff || []).map((p) => ({
                  value: p.id,
                  label: `${p.displayName} (@${p.username}) · ${p.role}`,
                }))}
              />
            ) : (
              <Select
                className={styles.inspectorSubjectSelect}
                value={inspectorRoleGroupId}
                onChange={(val) => setInspectorRoleGroupId(val)}
                options={roleGroupOptions}
              />
            )}
            <DatePicker
              showTime
              className={styles.inspectorDatePicker}
              value={inspectorAt}
              onChange={(val) => setInspectorAt(val)}
              placeholder="Thời điểm tra cứu (Để trống = Hiện tại)"
              format="DD/MM/YYYY HH:mm:ss"
            />
            <Button
              type="primary"
              loading={inspectorLoading}
              onClick={() => void handleInspectPermissions()}
              icon={<AppIcon icon={History} size="sm" />}
            >
              Tra cứu quyền & Lịch sử
            </Button>
          </div>
          {inspectorResult && (
            <div className={styles.inspectorResult}>
              <div className={styles.inspectorSummaryHeader}>
                <div>
                  <strong>{inspectorResult.targetLabel}</strong>
                  <span>
                    Thời điểm đối chiếu: {formatAuditTime(inspectorResult.evaluatedAt)} · Được phép truy cập{' '}
                    <strong>{inspectorResult.allowedMenus.length}</strong> module (+ mOS Chat)
                  </span>
                </div>
                <StatusTag
                  status={inspectorResult.effectiveRoleGroup?.code === 'CV' ? 'warning' : 'processing'}
                  label={
                    inspectorResult.effectiveRoleGroup
                      ? `Nhóm: ${inspectorResult.effectiveRoleGroup.name}`
                      : `Vai trò: ${inspectorResult.effectiveRole}`
                  }
                />
              </div>
              <div className={styles.allowedPills}>
                {inspectorResult.allowedMenus.map((item) => (
                  <div key={item.key} className={styles.allowedPill}>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.path}</span>
                    </div>
                    <StatusTag status="success" label={item.grantSource} />
                  </div>
                ))}
              </div>
              {inspectorResult.auditTimeline.length > 0 && (
                <div className={styles.timelineSection}>
                  <strong className={styles.timelineHeading}>
                    <AppIcon icon={Clock} size="sm" /> Dòng thời gian cấp/thu hồi quyền & sự kiện bảo mật (
                    {inspectorResult.auditTimeline.length})
                  </strong>
                  <div className={styles.auditList}>
                    {inspectorResult.auditTimeline.map((ev) => (
                      <article key={ev.id} className={styles.auditRow}>
                        <div>
                          <strong>{ev.summary}</strong>
                          <span>
                            Thực hiện bởi: {ev.actorLabel} · {formatAuditTime(ev.timestamp)}
                            {ev.details ? ` · ${ev.details}` : ''}
                          </span>
                        </div>
                        <StatusTag
                          status={
                            ev.eventType === 'BLOCKED_403'
                              ? 'error'
                              : ev.eventType === 'POLICY_CHANGE'
                                ? 'warning'
                                : 'processing'
                          }
                          label={ev.eventType}
                        />
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DataSection>
    </>
  );
}
