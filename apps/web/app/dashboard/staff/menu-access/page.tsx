'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Checkbox, DatePicker, Form, Select, Space, Switch, message } from 'antd';
import {
  Clock,
  Eye,
  History,
  LockKeyhole,
  RefreshCw,
  SearchCheck,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import dayjs, { type Dayjs } from 'dayjs';
import {
  CV_DEFAULT_ALLOWED_MENU_KEYS,
  isSuperAdminRole,
  getMenuAccessCategoryPolicyKey,
  MENU_ACCESS_ROLE_GROUPS,
  removeVietnameseTones,
  type MenuAccessConfigurationResponse,
  type MenuAccessInspectorResponse,
  type MenuAccessPolicy,
} from '@mos-lab/shared';
import {
  AppIcon,
  DataSection,
  EntityForm,
  EntityFormDrawer,
  EntityFormField,
  FeaturePage,
  SearchField,
  StatePanel,
  StatusTag,
} from '~/components/ui';
import { apiClient } from '../../../../lib/api-client';
import styles from './menu-access.module.css';

type PolicyFormValues = {
  isRestricted: boolean;
  roleGroupIds: number[];
  departmentIds: number[];
  teamIds: number[];
  staffIds: number[];
};

type EditingTarget = {
  key: string;
  label: string;
  description: string;
  kind: 'category' | 'menu';
};

function isStoredSuperAdmin(): boolean {
  try {
    const rawUser = localStorage.getItem('mos_user');
    const user = rawUser ? JSON.parse(rawUser) : null;
    return isSuperAdminRole(user?.role);
  } catch {
    return false;
  }
}

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

function MenuAccessContent() {
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [configuration, setConfiguration] = useState<MenuAccessConfigurationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [search, setSearch] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [policyForm] = Form.useForm<PolicyFormValues>();
  const isRestricted = Form.useWatch('isRestricted', policyForm) ?? false;

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

  const fetchConfiguration = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setConfiguration(await apiClient.menuAccess.getConfiguration());
    } catch (requestError: any) {
      const nextError = requestError?.response?.data?.message || 'Không thể tải cấu hình quyền hiển thị menu.';
      setError(nextError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;
    const resolveAccess = async () => {
      let allowed = isStoredSuperAdmin();
      try {
        const response: any = await apiClient.auth.me();
        const freshUser = response?.user || response;
        if (freshUser?.role) {
          window.localStorage.setItem('mos_user', JSON.stringify(freshUser));
          allowed = isSuperAdminRole(freshUser.role);
        }
      } catch {
        // The API guard remains authoritative if a profile refresh is unavailable.
      }

      if (!isCurrent) return;
      setIsSuperAdmin(allowed);
      if (allowed) void fetchConfiguration();
      else setLoading(false);
    };
    void resolveAccess();
    return () => {
      isCurrent = false;
    };
  }, [fetchConfiguration]);

  const policyByKey = useMemo(
    () =>
      new Map(
        [...(configuration?.categoryPolicies || []), ...(configuration?.policies || [])].map((policy) => [
          policy.menuKey,
          policy,
        ])
      ),
    [configuration?.categoryPolicies, configuration?.policies]
  );
  const editingMenu = useMemo(
    () => configuration?.menus.find((menu) => menu.key === editingKey) || null,
    [configuration?.menus, editingKey]
  );
  const editingCategory = useMemo(
    () =>
      configuration?.categories.find((category) => getMenuAccessCategoryPolicyKey(category.key) === editingKey) || null,
    [configuration?.categories, editingKey]
  );
  const editingTarget = useMemo<EditingTarget | null>(() => {
    if (editingCategory) {
      return {
        key: getMenuAccessCategoryPolicyKey(editingCategory.key),
        label: editingCategory.label,
        description: editingCategory.description,
        kind: 'category',
      };
    }
    if (editingMenu) {
      return {
        key: editingMenu.key,
        label: editingMenu.label,
        description: editingMenu.description || editingMenu.path,
        kind: 'menu',
      };
    }
    return null;
  }, [editingCategory, editingMenu]);

  const categoryPolicies = useMemo(() => {
    const query = removeVietnameseTones(search);
    return (configuration?.categories || [])
      .filter((category) => {
        if (!query) return true;
        return (
          removeVietnameseTones(category.label).includes(query) ||
          removeVietnameseTones(category.description).includes(query)
        );
      })
      .map((category) => ({
        category,
        policy: policyByKey.get(getMenuAccessCategoryPolicyKey(category.key)) || {
          menuKey: getMenuAccessCategoryPolicyKey(category.key),
          isRestricted: false,
          subjects: [],
        },
      }));
  }, [configuration?.categories, policyByKey, search]);

  const menuGroups = useMemo(() => {
    const query = removeVietnameseTones(search);
    const menus = (configuration?.menus || []).filter((menu) => {
      if (!query) return true;
      return (
        removeVietnameseTones(menu.label).includes(query) ||
        removeVietnameseTones(menu.groupLabel).includes(query) ||
        removeVietnameseTones(menu.path).includes(query)
      );
    });
    return menus.reduce<Record<string, { title: string; menus: typeof menus }>>((groups, menu) => {
      const existing = groups[menu.groupKey] || { title: menu.groupLabel, menus: [] };
      existing.menus.push(menu);
      groups[menu.groupKey] = existing;
      return groups;
    }, {});
  }, [configuration?.menus, search]);

  const openPolicyEditor = (policy: MenuAccessPolicy) => {
    policyForm.setFieldsValue({
      isRestricted: policy.isRestricted,
      roleGroupIds: policy.subjects.filter((subject) => subject.type === 'ROLE').map((subject) => subject.subjectId),
      departmentIds: policy.subjects
        .filter((subject) => subject.type === 'DEPARTMENT')
        .map((subject) => subject.subjectId),
      teamIds: policy.subjects.filter((subject) => subject.type === 'TEAM').map((subject) => subject.subjectId),
      staffIds: policy.subjects.filter((subject) => subject.type === 'STAFF').map((subject) => subject.subjectId),
    });
    setEditingKey(policy.menuKey);
  };

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
      await fetchConfiguration();
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

  const closeEditor = () => {
    if (saving) return;
    policyForm.resetFields();
    setEditingKey(null);
  };

  const savePolicy = async (values: PolicyFormValues) => {
    if (!editingKey) return;
    setSaving(true);
    try {
      await apiClient.menuAccess.updatePolicy(editingKey, {
        isRestricted: values.isRestricted,
        subjects: [
          ...(values.roleGroupIds || []).map((subjectId) => ({ type: 'ROLE' as const, subjectId })),
          ...(values.departmentIds || []).map((subjectId) => ({ type: 'DEPARTMENT' as const, subjectId })),
          ...(values.teamIds || []).map((subjectId) => ({ type: 'TEAM' as const, subjectId })),
          ...(values.staffIds || []).map((subjectId) => ({ type: 'STAFF' as const, subjectId })),
        ],
      });
      message.success('Đã cập nhật quyền hiển thị menu & khóa API tương ứng.');
      window.localStorage.setItem('mos_menu_access_revision', String(Date.now()));
      window.dispatchEvent(new Event('menu-access-updated'));
      setEditingKey(null);
      await fetchConfiguration();
    } catch (requestError: any) {
      message.error(requestError?.response?.data?.message || 'Không thể lưu quyền hiển thị menu.');
    } finally {
      setSaving(false);
    }
  };

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

  if (isSuperAdmin === null || (isSuperAdmin && loading && !configuration)) {
    return <StatePanel kind="loading" title="Đang tải quyền hiển thị menu" minHeight={420} />;
  }

  if (!isSuperAdmin) {
    return (
      <StatePanel
        kind="error"
        title="Chỉ Super Admin được quản lý quyền menu"
        description="Khu vực này thay đổi phạm vi hiển thị menu và audit hệ thống, nên chỉ Super Admin có thể truy cập."
        minHeight={420}
      />
    );
  }

  return (
    <>
      <FeaturePage
        title="Trung tâm Phân quyền & Bảo mật Nhóm"
        subtitle="Quản lý tập trung phân quyền theo Nhóm Vai trò (ROLE), Department, Team, Cá nhân — khóa đồng bộ cả Sidebar lẫn API Backend và truy vết lịch sử cấp quyền theo từng thời điểm."
        icon={<AppIcon icon={Eye} size="lg" />}
        tag={<StatusTag status="warning" label="Super Admin only" />}
        headerActions={
          <Button
            icon={<AppIcon icon={RefreshCw} size="sm" />}
            loading={loading}
            onClick={() => void fetchConfiguration()}
          >
            Làm mới
          </Button>
        }
        toolbar={{
          primary: (
            <SearchField
              behavior="filter"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm danh mục, menu hoặc đường dẫn không dấu…"
            />
          ),
        }}
        className={styles.page}
      >
        <Alert
          type="info"
          showIcon
          className={styles.notice}
          message="Khóa bảo mật 2 lớp đồng bộ: Giao diện (Sidebar + Route Guard) & Fastify API"
          description="Mọi thay đổi phân quyền tại đây sẽ tự động khóa/mở cả hiển thị menu lẫn toàn bộ API endpoint tương ứng ở tầng Backend. Riêng nhóm Chuyên Viên (CV) mặc định được khóa chặt chỉ xem Báo Cáo CV, Career Path (nhánh CV cá nhân) và mOS Chat."
        />

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

        <DataSection
          title={
            <span className={styles.sectionTitle}>
              <AppIcon icon={Settings2} size="sm" />
              Danh mục menu
              <StatusTag status="default" label={`${configuration?.categories.length || 0} danh mục`} />
            </span>
          }
          state={loading ? 'loading' : error ? 'error' : categoryPolicies.length === 0 ? 'empty' : undefined}
          stateTitle={error || (categoryPolicies.length === 0 ? 'Không tìm thấy danh mục phù hợp' : undefined)}
          stateDescription={error ? 'Hãy thử tải lại danh mục quyền menu.' : 'Thử tìm bằng tên danh mục hoặc mô tả.'}
          stateExtra={error ? <Button onClick={() => void fetchConfiguration()}>Thử lại</Button> : undefined}
          stateMinHeight={220}
        >
          <div className={styles.menuRows}>
            {categoryPolicies.map(({ category, policy }) => (
              <article key={category.key} className={styles.menuRow}>
                <div className={styles.menuCopy}>
                  <strong>{category.label}</strong>
                  <span>{category.description}</span>
                  {policy.isRestricted ? (
                    <div className={styles.subjects}>
                      {policy.subjects.length ? (
                        policy.subjects.map((subject) => (
                          <StatusTag
                            key={`${subject.type}-${subject.subjectId}`}
                            status="processing"
                            label={subject.label}
                          />
                        ))
                      ) : (
                        <StatusTag status="warning" label="Không hiển thị cho ai ngoài Admin" />
                      )}
                    </div>
                  ) : (
                    <span className={styles.defaultScope}>Không giới hạn ở cấp danh mục.</span>
                  )}
                </div>
                <div className={styles.menuActions}>
                  <StatusTag
                    status={policy.isRestricted ? 'warning' : 'success'}
                    label={policy.isRestricted ? 'Giới hạn' : 'Mặc định'}
                  />
                  <Button onClick={() => openPolicyEditor(policy)} icon={<AppIcon icon={ShieldCheck} size="sm" />}>
                    Cấu hình
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </DataSection>

        <DataSection
          title={
            <span className={styles.sectionTitle}>
              <AppIcon icon={UsersRound} size="sm" />
              Mục menu riêng lẻ
              <StatusTag status="default" label={`${configuration?.menus.length || 0} mục`} />
            </span>
          }
          state={loading ? 'loading' : error ? 'error' : Object.keys(menuGroups).length === 0 ? 'empty' : undefined}
          stateTitle={error || (Object.keys(menuGroups).length === 0 ? 'Không tìm thấy menu phù hợp' : undefined)}
          stateDescription={
            error
              ? 'Hãy thử tải lại danh mục quyền menu.'
              : 'Dùng cấu hình này khi cần siết thêm một mục trong danh mục đã cấp.'
          }
          stateExtra={error ? <Button onClick={() => void fetchConfiguration()}>Thử lại</Button> : undefined}
          stateMinHeight={360}
        >
          <div className={styles.menuGroups}>
            {Object.entries(menuGroups).map(([groupKey, group]) => (
              <section key={groupKey} className={styles.menuGroup} aria-label={group.title}>
                <header className={styles.groupHeading}>
                  <span>
                    <AppIcon icon={UsersRound} size="sm" />
                    <strong>{group.title}</strong>
                  </span>
                  <span className={styles.groupCount}>{group.menus.length}</span>
                </header>
                <div className={styles.menuRows}>
                  {group.menus.map((menu) => {
                    const policy = policyByKey.get(menu.key) || {
                      menuKey: menu.key,
                      isRestricted: false,
                      subjects: [],
                    };
                    return (
                      <article key={menu.key} className={styles.menuRow}>
                        <div className={styles.menuCopy}>
                          <strong>{menu.label}</strong>
                          <span>{menu.path}</span>
                          {policy.isRestricted ? (
                            <div className={styles.subjects}>
                              {policy.subjects.length ? (
                                policy.subjects.map((subject) => (
                                  <StatusTag
                                    key={`${subject.type}-${subject.subjectId}`}
                                    status="processing"
                                    label={subject.label}
                                  />
                                ))
                              ) : (
                                <StatusTag status="warning" label="Không hiển thị cho ai ngoài Admin" />
                              )}
                            </div>
                          ) : (
                            <span className={styles.defaultScope}>Giữ nguyên quyền menu theo vai trò hệ thống.</span>
                          )}
                        </div>
                        <div className={styles.menuActions}>
                          <StatusTag
                            status={policy.isRestricted ? 'warning' : 'success'}
                            label={policy.isRestricted ? 'Giới hạn' : 'Mặc định'}
                          />
                          <Button
                            onClick={() => openPolicyEditor(policy)}
                            icon={<AppIcon icon={ShieldCheck} size="sm" />}
                          >
                            Cấu hình
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </DataSection>

        <DataSection
          title={
            <span className={styles.sectionTitle}>
              <AppIcon icon={ShieldAlert} size="sm" />
              Nhật ký chặn truy cập trái phép (403 Security Blocks)
              <StatusTag status="error" label={`${configuration?.securityBlockLogs?.length || 0} lượt chặn`} />
            </span>
          }
          state={configuration?.securityBlockLogs?.length ? undefined : 'empty'}
          stateTitle="Chưa ghi nhận lượt chặn truy cập trái phép (403)"
          stateDescription="Khi tài khoản cố tình gọi API hoặc mở trang ngoài phạm vi được cấp phép, hệ thống tự động chặn 403 và ghi log tại đây."
          stateMinHeight={140}
        >
          <div className={styles.auditList}>
            {configuration?.securityBlockLogs?.map((block) => (
              <article key={block.id} className={styles.auditRow}>
                <div>
                  <strong>
                    [{block.method || 'GET'}] {block.path || block.menuKey}
                  </strong>
                  <span>
                    Tài khoản: {block.actorLabel} ({block.actorRole || 'unknown'}) · {formatAuditTime(block.createdAt)}{' '}
                    · Lý do: {block.reason || 'Chặn truy cập API ngoài phạm vi quyền'}
                  </span>
                </div>
                <StatusTag status="error" label="403 BLOCKED" />
              </article>
            ))}
          </div>
        </DataSection>

        <DataSection
          title={
            <span className={styles.sectionTitle}>
              <AppIcon icon={LockKeyhole} size="sm" />
              Lịch sử thay đổi quyền gần nhất
            </span>
          }
          state={configuration?.recentAudits.length ? undefined : 'empty'}
          stateTitle="Chưa có thay đổi quyền menu"
          stateDescription="Mỗi lần lưu policy sẽ ghi lại người thực hiện cùng phạm vi trước và sau để phục vụ truy vết."
          stateMinHeight={160}
        >
          <div className={styles.auditList}>
            {configuration?.recentAudits.map((audit) => (
              <article key={audit.id} className={styles.auditRow}>
                <div>
                  <strong>{audit.menuLabel}</strong>
                  <span>
                    {audit.actorLabel} · {formatAuditTime(audit.createdAt)}
                  </span>
                </div>
                <div className={styles.auditChange}>
                  <StatusTag
                    status={audit.beforeIsRestricted ? 'warning' : 'default'}
                    label={audit.beforeIsRestricted ? `Giới hạn · ${audit.beforeSubjectCount}` : 'Mặc định'}
                  />
                  <span aria-hidden>→</span>
                  <StatusTag
                    status={audit.afterIsRestricted ? 'warning' : 'success'}
                    label={audit.afterIsRestricted ? `Giới hạn · ${audit.afterSubjectCount}` : 'Mặc định'}
                  />
                </div>
              </article>
            ))}
          </div>
        </DataSection>
      </FeaturePage>

      <EntityFormDrawer
        open={Boolean(editingTarget)}
        onClose={closeEditor}
        title={
          editingTarget
            ? `Quyền ${editingTarget.kind === 'category' ? 'danh mục' : 'menu'} · ${editingTarget.label}`
            : 'Quyền menu'
        }
        destroyOnHidden
        footer={
          <Space wrap>
            <Button onClick={closeEditor} disabled={saving}>
              Hủy
            </Button>
            <Button type="primary" loading={saving} onClick={() => policyForm.submit()}>
              Lưu quyền hiển thị & API
            </Button>
          </Space>
        }
      >
        <Alert
          type={isRestricted ? 'warning' : 'info'}
          showIcon
          className={styles.drawerNotice}
          message={
            isRestricted
              ? `${editingTarget?.kind === 'category' ? 'Danh mục' : 'Menu'} đang giới hạn theo tổ chức`
              : `${editingTarget?.kind === 'category' ? 'Danh mục' : 'Menu'} đang theo quyền mặc định của hệ thống`
          }
          description={
            isRestricted
              ? editingTarget?.kind === 'category'
                ? `Chỉ các đối tượng được chọn bên dưới (và Admin/Super Admin) sẽ thấy toàn bộ ${editingTarget.description}`
                : 'Chỉ các đối tượng được chọn bên dưới (và Admin/Super Admin) sẽ thấy menu này và gọi được API tương ứng.'
              : editingTarget?.kind === 'category'
                ? 'Bạn có thể bật giới hạn để áp dụng một policy cho tất cả menu trong danh mục này.'
                : 'Tất cả người đã có quyền nền theo vai trò hiện tại vẫn thấy menu. Bạn có thể bật giới hạn để áp dụng danh sách bên dưới.'
          }
        />
        <EntityForm<PolicyFormValues> form={policyForm} columns={1} onFinish={savePolicy}>
          <EntityFormField
            name="isRestricted"
            label={`Giới hạn hiển thị ${editingTarget?.kind === 'category' ? 'danh mục' : 'menu'}`}
            valuePropName="checked"
          >
            <Switch checkedChildren="Giới hạn" unCheckedChildren="Mặc định" />
          </EntityFormField>

          <EntityFormField
            name="roleGroupIds"
            label="Nhóm Vai trò (ROLE) được phép"
            extra="Chọn nhóm vai trò (CV, CC, Telesales, CS, OC/LS, QA/QC, HR, Manager) được truy cập menu & API này."
          >
            <Select
              mode="multiple"
              showSearch
              disabled={!isRestricted}
              optionFilterProp="label"
              filterOption={toneInsensitiveOptionFilter}
              placeholder="Chọn Nhóm Vai trò…"
              options={roleGroupOptions}
            />
          </EntityFormField>

          <EntityFormField
            name="departmentIds"
            label="Department được thấy"
            extra="Áp dụng cho mọi thành viên đang hoạt động trong các Team thuộc Department đó."
          >
            <Select
              mode="multiple"
              showSearch
              disabled={!isRestricted}
              optionFilterProp="label"
              filterOption={toneInsensitiveOptionFilter}
              placeholder="Chọn Department…"
              options={(configuration?.departments || []).map((department) => ({
                value: department.id,
                label: `${department.name} (${department.code})`,
              }))}
            />
          </EntityFormField>

          <EntityFormField
            name="teamIds"
            label="Team được thấy"
            extra="Thành viên của team con cũng kế thừa quyền cấp cho team cha."
          >
            <Select
              mode="multiple"
              showSearch
              disabled={!isRestricted}
              optionFilterProp="label"
              filterOption={toneInsensitiveOptionFilter}
              placeholder="Chọn Team…"
              options={(configuration?.teams || []).map((team) => ({
                value: team.id,
                label: `${team.name} (${team.code})`,
              }))}
            />
          </EntityFormField>

          <EntityFormField
            name="staffIds"
            label="Cá nhân được thấy"
            extra="Dùng cho ngoại lệ cá nhân; nên ưu tiên Nhóm Vai trò/Department/Team khi có thể."
          >
            <Select
              mode="multiple"
              showSearch
              disabled={!isRestricted}
              optionFilterProp="label"
              filterOption={toneInsensitiveOptionFilter}
              placeholder="Chọn nhân sự…"
              options={(configuration?.staff || []).map((person) => ({
                value: person.id,
                label: `${person.displayName} (@${person.username}) · ${person.role}`,
              }))}
            />
          </EntityFormField>
        </EntityForm>
      </EntityFormDrawer>
    </>
  );
}

export default function MenuAccessPage() {
  return (
    <Suspense fallback={<StatePanel kind="loading" title="Đang tải quyền hiển thị menu" minHeight={420} />}>
      <MenuAccessContent />
    </Suspense>
  );
}
