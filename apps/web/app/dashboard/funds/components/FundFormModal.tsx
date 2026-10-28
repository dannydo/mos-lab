'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Radio,
  Slider,
  Switch,
  Button,
  Tabs,
  Space,
  Row,
  Col,
  Checkbox,
  message,
  Typography,
  Card,
  Tooltip,
} from 'antd';
import {
  Sparkles,
  WalletCards,
  FileText,
  Sliders,
  Users,
  CheckCircle2,
  Plus,
  Trash2,
  ShieldCheck,
  AlertCircle,
  Wand2,
} from 'lucide-react';
import type {
  Fund,
  FundStatus,
  ToleranceMode,
  CreateFundRequest,
  UpdateFundRequest,
  CreateFundRoleInput,
  FundApprovalWorkflowConfig,
  FundApprovalStepConfig,
  Staff,
  SafeAny,
} from '@mos-lab/shared';
import apiClient from '~/lib/api-client';
import { AdaptiveModal, AppIcon } from '~/components/ui';
import { removeVietnameseTones } from '~/lib/utils/search';

const { Text, Paragraph } = Typography;

interface FundFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: (savedFund: Fund) => void;
  initialFund?: Fund | null;
}

const AVAILABLE_PERMISSIONS = [
  { value: 'VIEW', label: 'Xem sổ quỹ & giao dịch' },
  { value: 'PROPOSE', label: 'Lập phiếu đề xuất cấp vốn / chi' },
  { value: 'APPROVE', label: 'Phê duyệt chủ trương đề xuất' },
  { value: 'DISBURSE', label: 'Kế toán giải ngân thanh toán' },
  { value: 'RECONCILE', label: 'Đối soát & chốt kỳ sổ quỹ' },
  { value: 'CONFIG', label: 'Cấu hình thông tin & hạn mức' },
];

const DEFAULT_STANDARD_ROLES: CreateFundRoleInput[] = [
  {
    roleKey: 'HOLDER',
    roleName: 'Thủ Quỹ (Quản lý số dư)',
    permissions: ['VIEW', 'PROPOSE', 'RECONCILE'],
    assignedStaffIds: [],
  },
  {
    roleKey: 'DISBURSER',
    roleName: 'Kế Toán Giải Ngân',
    permissions: ['VIEW', 'DISBURSE'],
    assignedStaffIds: [],
  },
  {
    roleKey: 'APPROVER',
    roleName: 'Quản Lý Phê Duyệt',
    permissions: ['VIEW', 'APPROVE', 'CONFIG'],
    assignedStaffIds: [],
  },
];

export function generateSuggestedFundCode(name: string): string {
  if (!name.trim()) return '';
  let noTones = removeVietnameseTones(name)
    .toUpperCase()
    .replace(/[^A-Z0-9\s_-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  
  if (!noTones) return 'FUND_CUSTOM';
  if (noTones.startsWith('QUY_')) {
    noTones = noTones.substring(4);
  }
  if (!noTones.startsWith('FUND_')) {
    return `FUND_${noTones}`;
  }
  return noTones;
}

export default function FundFormModal({
  open,
  onCancel,
  onSuccess,
  initialFund,
}: FundFormModalProps) {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Dynamic roles state
  const [roles, setRoles] = useState<CreateFundRoleInput[]>(DEFAULT_STANDARD_ROLES);

  // Approval config state
  const [approvalEnabled, setApprovalEnabled] = useState(true);
  const [approvalSteps, setApprovalSteps] = useState<FundApprovalStepConfig[]>([
    {
      level: 1,
      name: 'Cấp 1 – Quản lý quỹ phê duyệt',
      approverRoleKey: 'APPROVER',
      approverStaffIds: [],
      requiredAmountAbove: 0,
      note: 'Duyệt chủ trương mọi đề xuất chi và bổ sung vốn',
    },
  ]);

  // Track if user manually touched fund code
  const [isManualCode, setIsManualCode] = useState(false);
  const [toleranceMode, setToleranceMode] = useState<ToleranceMode>('STRICT');

  const isEditMode = Boolean(initialFund);

  // Load staff options from crmStaff
  useEffect(() => {
    let isMounted = true;
    async function fetchStaff() {
      if (!open) return;
      try {
        setLoadingStaff(true);
        const data = await apiClient.staff.list();
        if (isMounted && Array.isArray(data)) {
          setStaffList(data);
        }
      } catch (err) {
        console.error('Failed to load staff list for fund roles:', err);
      } finally {
        if (isMounted) setLoadingStaff(false);
      }
    }
    fetchStaff();
    return () => {
      isMounted = false;
    };
  }, [open]);

  // Populate form on open / initialFund change
  useEffect(() => {
    if (open) {
      setActiveTab('1');
      if (initialFund) {
        setIsManualCode(true);
        setToleranceMode(initialFund.toleranceMode || 'STRICT');
        form.setFieldsValue({
          name: initialFund.name,
          code: initialFund.code,
          description: initialFund.description || '',
          status: initialFund.status || 'DRAFT',
          maxQuota: initialFund.maxQuota || 1000000,
          unitQuota: initialFund.unitQuota || 50000,
          alertThresholdPercent: initialFund.alertThresholdPercent ?? 80,
          toleranceMode: initialFund.toleranceMode || 'STRICT',
          toleranceAmount: initialFund.toleranceAmount || 0,
        });

        // Populate roles from fund
        if (Array.isArray(initialFund.roles) && initialFund.roles.length > 0) {
          const mappedRoles: CreateFundRoleInput[] = initialFund.roles.map((r) => {
            const assignedIds = (initialFund.assignments || [])
              .filter((a) => a.roleKey === r.roleKey)
              .map((a) => a.staffId);
            return {
              roleKey: r.roleKey,
              roleName: r.roleName,
              permissions: Array.isArray(r.permissions) ? r.permissions : [],
              assignedStaffIds: assignedIds,
            };
          });
          setRoles(mappedRoles);
        } else {
          setRoles(DEFAULT_STANDARD_ROLES);
        }

        // Populate approval config
        if (initialFund.approvalConfig) {
          setApprovalEnabled(initialFund.approvalConfig.enabled ?? true);
          setApprovalSteps(
            Array.isArray(initialFund.approvalConfig.steps) && initialFund.approvalConfig.steps.length > 0
              ? initialFund.approvalConfig.steps
              : [
                  {
                    level: 1,
                    name: 'Cấp 1 – Quản lý quỹ phê duyệt',
                    approverRoleKey: 'APPROVER',
                    approverStaffIds: [],
                    requiredAmountAbove: 0,
                    note: 'Duyệt chủ trương mọi đề xuất chi và bổ sung vốn',
                  },
                ]
          );
        } else {
          setApprovalEnabled(true);
          setApprovalSteps([
            {
              level: 1,
              name: 'Cấp 1 – Quản lý quỹ phê duyệt',
              approverRoleKey: 'APPROVER',
              approverStaffIds: [],
              requiredAmountAbove: 0,
              note: 'Duyệt chủ trương mọi đề xuất chi và bổ sung vốn',
            },
          ]);
        }
      } else {
        // Reset to new creation defaults
        setIsManualCode(false);
        setToleranceMode('STRICT');
        form.resetFields();
        form.setFieldsValue({
          name: '',
          code: '',
          description: '',
          status: 'DRAFT',
          maxQuota: 2000000,
          unitQuota: 50000,
          alertThresholdPercent: 80,
          toleranceMode: 'STRICT',
          toleranceAmount: 0,
        });
        setRoles(DEFAULT_STANDARD_ROLES);
        setApprovalEnabled(true);
        setApprovalSteps([
          {
            level: 1,
            name: 'Cấp 1 – Quản lý quỹ phê duyệt',
            approverRoleKey: 'APPROVER',
            approverStaffIds: [],
            requiredAmountAbove: 0,
            note: 'Duyệt chủ trương mọi đề xuất chi và bổ sung vốn',
          },
        ]);
      }
    }
  }, [open, initialFund, form]);

  // Handle auto code suggestion
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!isManualCode && !isEditMode) {
      const suggested = generateSuggestedFundCode(val);
      form.setFieldValue('code', suggested);
    }
  };

  const handleApplySuggestedCode = () => {
    const currentName = form.getFieldValue('name') || '';
    const suggested = generateSuggestedFundCode(currentName);
    form.setFieldValue('code', suggested);
    setIsManualCode(false);
    message.success('Đã áp dụng mã quỹ tự động gợi ý!');
  };

  // Staff options formatted for multi-select
  const staffOptions = useMemo(() => {
    return staffList.map((s) => ({
      label: `${s.displayName || s.username} ${s.role ? `(${s.role})` : ''}`,
      value: s.id,
    }));
  }, [staffList]);

  // Roles manipulation
  const handleAddRole = () => {
    const newIdx = roles.length + 1;
    setRoles([
      ...roles,
      {
        roleKey: `ROLE_${newIdx}`,
        roleName: `Vai trò mới #${newIdx}`,
        permissions: ['VIEW'],
        assignedStaffIds: [],
      },
    ]);
  };

  const handleRemoveRole = (index: number) => {
    if (roles.length <= 1) {
      message.warning('Quỹ cần tối thiểu ít nhất 1 vai trò phân quyền.');
      return;
    }
    const updated = roles.filter((_, idx) => idx !== index);
    setRoles(updated);
  };

  const handleUpdateRole = (index: number, patch: Partial<CreateFundRoleInput>) => {
    const updated = [...roles];
    updated[index] = { ...updated[index], ...patch };
    setRoles(updated);
  };

  const handleResetStandardRoles = () => {
    setRoles(DEFAULT_STANDARD_ROLES);
    message.info('Đã khôi phục bộ 3 vai trò mẫu chuẩn (Thủ Quỹ, Kế Toán Chi, Quản Lý Quỹ).');
  };

  // Approval step manipulation
  const handleAddApprovalStep = () => {
    const nextLevel = approvalSteps.length + 1;
    setApprovalSteps([
      ...approvalSteps,
      {
        level: nextLevel,
        name: `Cấp ${nextLevel} – Phê duyệt bổ sung`,
        approverRoleKey: roles[0]?.roleKey || 'APPROVER',
        approverStaffIds: [],
        requiredAmountAbove: nextLevel === 2 ? 1000000 : 0,
        note: `Phê duyệt cấp độ ${nextLevel}`,
      },
    ]);
  };

  const handleRemoveApprovalStep = (index: number) => {
    if (approvalSteps.length <= 1) {
      message.warning('Quy trình cần tối thiểu ít nhất 1 cấp phê duyệt.');
      return;
    }
    const filtered = approvalSteps.filter((_, idx) => idx !== index);
    const reIndexed = filtered.map((step, idx) => ({
      ...step,
      level: idx + 1,
      name: step.name.startsWith('Cấp ') ? `Cấp ${idx + 1} – ${step.name.split('–')[1]?.trim() || 'Phê duyệt'}` : step.name,
    }));
    setApprovalSteps(reIndexed);
  };

  const handleUpdateApprovalStep = (index: number, patch: Partial<FundApprovalStepConfig>) => {
    const updated = [...approvalSteps];
    updated[index] = { ...updated[index], ...patch };
    setApprovalSteps(updated);
  };

  // Submission
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const approvalConfig: FundApprovalWorkflowConfig = {
        enabled: approvalEnabled,
        steps: approvalSteps,
      };

      const payload: CreateFundRequest = {
        name: values.name.trim(),
        code: values.code.trim().toUpperCase(),
        description: values.description ? values.description.trim() : '',
        status: values.status as FundStatus,
        maxQuota: Number(values.maxQuota),
        unitQuota: Number(values.unitQuota),
        alertThresholdPercent: Number(values.alertThresholdPercent ?? 80),
        toleranceMode: values.toleranceMode as ToleranceMode,
        toleranceAmount: values.toleranceMode === 'TOLERANCE_FIXED' ? Number(values.toleranceAmount || 0) : 0,
        roles,
        approvalConfig,
      };

      let resultFund: Fund;
      if (isEditMode && initialFund) {
        const updatePayload: UpdateFundRequest = { ...payload };
        const res = await apiClient.funds.update(initialFund.id, updatePayload);
        if (!res.success || !res.data) {
          throw new Error('Cập nhật quỹ không thành công.');
        }
        resultFund = res.data;
        message.success(`Đã cập nhật cấu hình Quỹ "${resultFund.name}" thành công!`);
      } else {
        const res = await apiClient.funds.create(payload);
        if (!res.success || !res.data) {
          throw new Error('Khởi tạo quỹ không thành công.');
        }
        resultFund = res.data;
        message.success(`Đã khởi tạo Quỹ mới "${resultFund.name}" (${resultFund.code}) thành công!`);
      }

      onSuccess(resultFund);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Submit fund error:', error);
      message.error(error.message || 'Lỗi lưu thông tin Quỹ hoạt động.');
    } finally {
      setSubmitting(false);
    }
  };

  const tabItems = [
    {
      key: '1',
      label: (
        <span className="flex items-center gap-1.5 font-medium">
          <AppIcon icon={FileText} size="sm" />
          <span>Tab 1 – Thông tin</span>
        </span>
      ),
      children: (
        <div className="space-y-4 py-2">
          <Row gutter={16}>
            <Col xs={24} md={14}>
              <Form.Item
                label={<span className="font-semibold text-slate-800 dark:text-slate-200">Tên quỹ</span>}
                name="name"
                rules={[{ required: true, message: 'Vui lòng nhập tên quỹ hoạt động' }]}
              >
                <Input
                  placeholder="Ví dụ: Quỹ Nạp Card Telesale, Quỹ Marketing Sự Kiện..."
                  size="large"
                  onChange={handleNameChange}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item
                label={
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Mã quỹ (duy nhất)</span>
                    <Tooltip title="Tự động tạo mã chuẩn từ Tên quỹ">
                      <Button
                        type="link"
                        size="small"
                        icon={<AppIcon icon={Wand2} size="sm" />}
                        className="p-0 text-emerald-600 dark:text-emerald-400 font-normal"
                        onClick={handleApplySuggestedCode}
                      >
                        Gợi ý mã
                      </Button>
                    </Tooltip>
                  </div>
                }
                name="code"
                rules={[
                  { required: true, message: 'Vui lòng nhập mã định danh quỹ' },
                  {
                    pattern: /^[A-Z0-9_-]+$/,
                    message: 'Mã quỹ chỉ được chứa chữ hoa, số, dấu gạch dưới hoặc gạch nối',
                  },
                ]}
              >
                <Input
                  placeholder="Ví dụ: FUND_TELESALE"
                  size="large"
                  className="font-mono uppercase font-semibold"
                  onChange={() => setIsManualCode(true)}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={<span className="font-semibold text-slate-800 dark:text-slate-200">Mục đích sử dụng</span>}
            name="description"
          >
            <Input.TextArea
              rows={3}
              placeholder="Mô tả phạm vi sử dụng, đối tượng thụ hưởng và quy định chi tiêu của quỹ..."
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={<span className="font-semibold text-slate-800 dark:text-slate-200">Trạng thái khởi tạo</span>}
                name="status"
                rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
              >
                <Select size="large">
                  <Select.Option value="DRAFT">📝 Bản nháp (DRAFT) – Khuyến nghị</Select.Option>
                  <Select.Option value="ACTIVE">🟢 Đang hoạt động (ACTIVE)</Select.Option>
                  <Select.Option value="FROZEN">⏸️ Tạm ngưng (FROZEN)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <AppIcon icon={AlertCircle} size="sm" className="text-amber-500" />
              <span>Quy tắc khởi tạo mOS Fund Master</span>
            </div>
            <div>
              Mặc định quỹ được tạo ở trạng thái <strong>DRAFT</strong> với số dư ban đầu <strong>0đ</strong>. Quỹ ở trạng thái DRAFT chưa cho phép chi tiêu cho đến khi Admin kích hoạt và cấp vốn qua quy trình giải ngân.
            </div>
          </div>
        </div>
      ),
    },
    {
      key: '2',
      label: (
        <span className="flex items-center gap-1.5 font-medium">
          <AppIcon icon={Sliders} size="sm" />
          <span>Tab 2 – Cấu hình tài chính</span>
        </span>
      ),
      children: (
        <div className="space-y-4 py-2">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={<span className="font-semibold text-slate-800 dark:text-slate-200">Hạn mức quỹ tối đa</span>}
                name="maxQuota"
                rules={[{ required: true, message: 'Vui lòng nhập hạn mức quỹ' }]}
                extra="Số tiền tối đa quỹ được phép giữ và phân bổ trong một chu kỳ."
              >
                <InputNumber
                  className="w-full tabular-nums"
                  size="large"
                  min={10000}
                  step={100000}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0) as SafeAny}
                  addonAfter="đ"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={<span className="font-semibold text-slate-800 dark:text-slate-200">Định mức chi / giao dịch</span>}
                name="unitQuota"
                rules={[{ required: true, message: 'Vui lòng nhập định mức mỗi giao dịch' }]}
                extra="Hạn mức tiêu chuẩn tối đa cho mỗi lần chi tiêu thông thường."
              >
                <InputNumber
                  className="w-full tabular-nums"
                  size="large"
                  min={1000}
                  step={10000}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0) as SafeAny}
                  addonAfter="đ"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={
              <div className="flex items-center justify-between w-full">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Ngưỡng cảnh báo chi tiêu</span>
                <span className="text-xs text-slate-500 tabular-nums font-mono">
                  {form.getFieldValue('alertThresholdPercent') || 80}%
                </span>
              </div>
            }
            name="alertThresholdPercent"
            extra="Khi tỷ lệ giải ngân đạt đến ngưỡng này, hệ thống sẽ bật cảnh báo SẮP HẾT HẠN MỨC để đề xuất bổ sung quỹ kịp thời."
          >
            <Slider
              min={10}
              max={95}
              marks={{
                50: '50%',
                70: '70%',
                80: '80% (Chuẩn)',
                90: '90%',
              }}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={<span className="font-semibold text-slate-800 dark:text-slate-200">Chế độ kiểm soát giải ngân</span>}
                name="toleranceMode"
                rules={[{ required: true, message: 'Vui lòng chọn chế độ kiểm soát' }]}
              >
                <Radio.Group
                  className="flex flex-col gap-2.5 mt-1"
                  onChange={(e) => setToleranceMode(e.target.value)}
                >
                  <Radio value="STRICT">
                    <span className="font-medium text-slate-800 dark:text-slate-200">STRICT (Chính xác tuyệt đối)</span>
                    <div className="text-xs text-slate-500">Kế toán chỉ được giải ngân chính xác 100% số tiền đã phê duyệt.</div>
                  </Radio>
                  <Radio value="TOLERANCE_FIXED">
                    <span className="font-medium text-slate-800 dark:text-slate-200">TOLERANCE_FIXED (Dung sai tùy chỉnh)</span>
                    <div className="text-xs text-slate-500">Cho phép Kế toán giải ngân chênh lệch trong hạn mức dung sai cố định.</div>
                  </Radio>
                </Radio.Group>
              </Form.Item>
            </Col>

            {toleranceMode === 'TOLERANCE_FIXED' && (
              <Col xs={24} sm={12}>
                <Form.Item
                  label={<span className="font-semibold text-slate-800 dark:text-slate-200">Mức dung sai cho phép (±)</span>}
                  name="toleranceAmount"
                  rules={[{ required: true, message: 'Vui lòng nhập số tiền dung sai cho phép' }]}
                  extra="Số tiền tối đa cho phép giải ngân lệch mà không cần tái phê duyệt."
                >
                  <InputNumber
                    className="w-full tabular-nums"
                    size="large"
                    min={0}
                    step={10000}
                    formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0) as SafeAny}
                    addonAfter="đ"
                  />
                </Form.Item>
              </Col>
            )}
          </Row>

          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
            🔒 <strong>Bảo toàn vốn</strong>: Khởi tạo quỹ mới hoàn toàn không tự động cấp vốn. Số dư ban đầu luôn được thiết lập cố định <strong>0đ</strong>.
          </div>
        </div>
      ),
    },
    {
      key: '3',
      label: (
        <span className="flex items-center gap-1.5 font-medium">
          <AppIcon icon={Users} size="sm" />
          <span>Tab 3 – Vai trò & Nhân sự</span>
        </span>
      ),
      children: (
        <div className="space-y-4 py-2">
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <Text className="font-bold text-slate-800 dark:text-slate-200">
                Cấu hình vai trò & Gán quyền linh hoạt
              </Text>
              <div className="text-xs text-slate-500">
                Được phép tạo thêm vai trò không giới hạn và gán nhân sự từ danh sách CRM staff.
              </div>
            </div>
            <Space>
              <Button size="small" onClick={handleResetStandardRoles}>
                Mẫu chuẩn
              </Button>
              <Button
                type="primary"
                size="small"
                icon={<AppIcon icon={Plus} size="sm" />}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                onClick={handleAddRole}
              >
                Thêm vai trò
              </Button>
            </Space>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {roles.map((role, idx) => (
              <Card
                key={idx}
                size="small"
                className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
                title={
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <span>{role.roleName || `Vai trò #${idx + 1}`}</span>
                      <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {role.roleKey}
                      </span>
                    </span>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<AppIcon icon={Trash2} size="sm" />}
                      onClick={() => handleRemoveRole(idx)}
                      disabled={roles.length <= 1}
                    />
                  </div>
                }
              >
                <div className="space-y-3">
                  <Row gutter={12}>
                    <Col xs={24} sm={14}>
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Tên vai trò hiển thị:
                      </div>
                      <Input
                        value={role.roleName}
                        placeholder="Ví dụ: Thủ Quỹ, Kế Toán Giải Ngân..."
                        size="middle"
                        onChange={(e) => handleUpdateRole(idx, { roleName: e.target.value })}
                      />
                    </Col>
                    <Col xs={24} sm={10}>
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Mã vai trò (Key):
                      </div>
                      <Input
                        value={role.roleKey}
                        placeholder="HOLDER, DISBURSER..."
                        size="middle"
                        className="font-mono uppercase"
                        onChange={(e) =>
                          handleUpdateRole(idx, {
                            roleKey: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
                          })
                        }
                      />
                    </Col>
                  </Row>

                  <div>
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Phân quyền hạn thao tác:
                    </div>
                    <Checkbox.Group
                      options={AVAILABLE_PERMISSIONS}
                      value={role.permissions}
                      onChange={(checkedValues) =>
                        handleUpdateRole(idx, { permissions: checkedValues as string[] })
                      }
                      className="grid grid-cols-2 gap-2 text-xs"
                    />
                  </div>

                  <div>
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Nhân sự đảm nhiệm vai trò này (từ CRM Staff):
                    </div>
                    <Select
                      mode="multiple"
                      placeholder="Chọn nhân sự phụ trách vai trò này..."
                      className="w-full"
                      value={role.assignedStaffIds}
                      options={staffOptions}
                      loading={loadingStaff}
                      filterOption={(input, option) =>
                        removeVietnameseTones((option?.label as string) || '')
                          .toLowerCase()
                          .includes(removeVietnameseTones(input).toLowerCase())
                      }
                      onChange={(selectedValues) =>
                        handleUpdateRole(idx, { assignedStaffIds: selectedValues as number[] })
                      }
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: '4',
      label: (
        <span className="flex items-center gap-1.5 font-medium">
          <AppIcon icon={ShieldCheck} size="sm" />
          <span>Tab 4 – Quy trình phê duyệt</span>
        </span>
      ),
      children: (
        <div className="space-y-4 py-2">
          <div className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <AppIcon icon={CheckCircle2} size="sm" className="text-emerald-500" />
                <span>Quy trình phê duyệt đề xuất chi/bổ sung quỹ</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Cấu hình số cấp duyệt (1 cấp, nhiều cấp), thứ tự duyệt và điều kiện hạn mức.
              </div>
            </div>
            <Switch
              checked={approvalEnabled}
              onChange={setApprovalEnabled}
              checkedChildren="Bật"
              unCheckedChildren="Tắt"
            />
          </div>

          {approvalEnabled && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Các cấp phê duyệt tuần tự ({approvalSteps.length} cấp)
                </Text>
                <Button
                  type="dashed"
                  size="small"
                  icon={<AppIcon icon={Plus} size="sm" />}
                  onClick={handleAddApprovalStep}
                >
                  Thêm cấp duyệt
                </Button>
              </div>

              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {approvalSteps.map((step, idx) => (
                  <Card
                    key={idx}
                    size="small"
                    className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
                    title={
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
                            Cấp {step.level}
                          </span>
                          <span>{step.name}</span>
                        </span>
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<AppIcon icon={Trash2} size="sm" />}
                          onClick={() => handleRemoveApprovalStep(idx)}
                          disabled={approvalSteps.length <= 1}
                        />
                      </div>
                    }
                  >
                    <div className="space-y-3">
                      <Row gutter={12}>
                        <Col xs={24} sm={14}>
                          <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Tên bước duyệt:
                          </div>
                          <Input
                            value={step.name}
                            size="middle"
                            onChange={(e) => handleUpdateApprovalStep(idx, { name: e.target.value })}
                          />
                        </Col>
                        <Col xs={24} sm={10}>
                          <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Nhóm vai trò phê duyệt:
                          </div>
                          <Select
                            className="w-full"
                            value={step.approverRoleKey}
                            onChange={(val) => handleUpdateApprovalStep(idx, { approverRoleKey: val })}
                            options={roles.map((r) => ({
                              label: `${r.roleName} (${r.roleKey})`,
                              value: r.roleKey,
                            }))}
                          />
                        </Col>
                      </Row>

                      <Row gutter={12}>
                        <Col xs={24} sm={14}>
                          <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Hoặc chỉ định nhân sự phê duyệt cụ thể:
                          </div>
                          <Select
                            mode="multiple"
                            placeholder="Mặc định duyệt theo vai trò (hoặc chọn cụ thể)"
                            className="w-full"
                            value={step.approverStaffIds}
                            options={staffOptions}
                            onChange={(vals) => handleUpdateApprovalStep(idx, { approverStaffIds: vals })}
                          />
                        </Col>
                        <Col xs={24} sm={10}>
                          <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Điều kiện: Số tiền đề xuất từ
                          </div>
                          <InputNumber
                            className="w-full tabular-nums"
                            min={0}
                            step={500000}
                            value={step.requiredAmountAbove || 0}
                            formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(val) => Number(val?.replace(/\$\s?|(,*)/g, '') || 0)}
                            addonAfter="đ"
                            onChange={(val) => handleUpdateApprovalStep(idx, { requiredAmountAbove: Number(val || 0) })}
                          />
                        </Col>
                      </Row>

                      <div>
                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Ghi chú quy trình:
                        </div>
                        <Input
                          value={step.note || ''}
                          placeholder="Mô tả tiêu chuẩn xét duyệt của cấp này..."
                          onChange={(e) => handleUpdateApprovalStep(idx, { note: e.target.value })}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdaptiveModal
      intent="form"
      title={
        <div className="flex items-center gap-2 font-bold text-lg text-emerald-800 dark:text-emerald-400">
          <AppIcon icon={isEditMode ? WalletCards : Sparkles} size="sm" className="text-emerald-500" />
          <span>
            {isEditMode ? `Cấu Hình Quỹ: ${initialFund?.name}` : 'Thiết Lập Quỹ Hoạt Động Nội Bộ Mới'}
          </span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      width={780}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Hủy
        </Button>,
        activeTab !== '1' && (
          <Button
            key="prev"
            onClick={() => {
              const current = Number(activeTab);
              if (current > 1) setActiveTab(String(current - 1));
            }}
          >
            Quay lại
          </Button>
        ),
        activeTab !== '4' && (
          <Button
            key="next"
            onClick={() => {
              const current = Number(activeTab);
              if (current < 4) setActiveTab(String(current + 1));
            }}
          >
            Tiếp theo
          </Button>
        ),
        <Button
          key="submit"
          type="primary"
          className="bg-emerald-600 hover:bg-emerald-500 border-emerald-600 text-white font-bold"
          loading={submitting}
          onClick={handleSubmit}
        >
          {isEditMode ? 'Lưu Cấu Hình Quỹ' : 'Khởi Tạo Quỹ'}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" className="pt-1">
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Form>
    </AdaptiveModal>
  );
}
