import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Segmented,
  Select,
  Tooltip,
  Typography,
  message,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { Trophy, Users, Award, ShieldAlert, Sparkles, Filter, Trash2, Plus, Info } from 'lucide-react';
import type {
  BkGame,
  BkGameCreateInput,
  BkGameMetricType,
  BkGameType,
  Staff,
  TeamListResponse,
  BkGameScoringRule,
} from '@mos-lab/shared';
import { removeVietnameseTones, BK_GAME_SCORING_RULES, BK_BOOKING_CHANNELS } from '@mos-lab/shared';
import { AdaptiveModal, AppIcon } from '~/components/ui';
import { apiClient } from '~/lib/api-client';

interface BkGameCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newGame: BkGame) => void;
}

export interface StaffProfileOption {
  staffId: number;
  crmStaffId?: number;
  displayName: string;
  avatarUrl?: string | null;
  roleKey?: string;
  roleName?: string;
  departmentCode?: string;
  departmentName?: string;
  teamCode?: string;
  teamName?: string;
  isDefaultBk?: boolean;
}

export default function BkGameCreateModal({ open, onClose, onSuccess }: BkGameCreateModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [gameType, setGameType] = useState<BkGameType>('INDIVIDUAL');
  const [allStaffList, setAllStaffList] = useState<StaffProfileOption[]>([]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [staffLoading, setStaffLoading] = useState(false);

  const watchedMetricType = (Form.useWatch('metricType', form) || 'BOOKINGS') as BkGameMetricType;
  const currentScoringRule = BK_GAME_SCORING_RULES[watchedMetricType] || BK_GAME_SCORING_RULES.BOOKINGS;

  useEffect(() => {
    if (!open) return;
    const fetchStaff = async () => {
      setStaffLoading(true);
      try {
        const [configRes, staffRes, teamsRes, rolesRes] = await Promise.all([
          apiClient.bk.getConfig().catch(() => null),
          apiClient.staff.list({ isActive: true }).catch(() => [] as Staff[]),
          apiClient.teams.list().catch(() => null as TeamListResponse | null),
          apiClient.roles.list().catch(() => [] as Array<{ key: string; name: string }>),
        ]);

        const activeBkIds = configRes?.activeBkIds || [];
        const roleNameMap = new Map<string, string>();
        ((rolesRes as Array<{ key?: string; name?: string }>) || []).forEach((r) => {
          if (r && r.key && r.name) {
            roleNameMap.set(r.key, r.name);
          }
        });

        const getRoleName = (key?: string) => {
          if (!key) return 'Nhân viên';
          if (roleNameMap.has(key)) return roleNameMap.get(key)!;
          switch (key) {
            case 'telesales':
              return 'Telesales';
            case 'cc':
              return 'Tư vấn viên (CC)';
            case 'lt':
            case 'technician':
              return 'Kỹ thuật viên';
            case 'ht':
              return 'Head Teacher';
            case 'teacher':
              return 'Giáo viên';
            case 'coca':
              return 'Combo Care';
            case 'oc':
              return 'Điều phối (OC)';
            case 'qa_qc':
              return 'QA & QC';
            case 'manager':
              return 'Quản lý';
            case 'admin':
            case 'super_admin':
              return 'Admin';
            default:
              return key;
          }
        };

        interface StaffTeamMeta {
          teamCode?: string;
          teamName?: string;
          departmentCode?: string;
          departmentName?: string;
        }
        const staffTeamMetaMap = new Map<number, StaffTeamMeta>();

        if (teamsRes && Array.isArray(teamsRes.teams)) {
          teamsRes.teams.forEach((t) => {
            const dep = t.department;
            const meta: StaffTeamMeta = {
              teamCode: t.code,
              teamName: t.name,
              departmentCode: dep?.code,
              departmentName: dep?.name,
            };
            if (Array.isArray(t.activeStaffIds)) {
              t.activeStaffIds.forEach((sid) => {
                if (sid && !staffTeamMetaMap.has(sid)) {
                  staffTeamMetaMap.set(sid, meta);
                }
              });
            }
          });
        }

        const staffMap = new Map<number, StaffProfileOption>();

        // 1. Add from crmStaff list (all active employees)
        (staffRes || []).forEach((s) => {
          const sid = s.legacyStaffId || s.id;
          const meta =
            staffTeamMetaMap.get(sid) || (s.legacyStaffId ? staffTeamMetaMap.get(s.legacyStaffId) : undefined);

          let depCode = meta?.departmentCode;
          let depName = meta?.departmentName;
          if (!depCode) {
            if (s.role === 'telesales') {
              depCode = 'GROWTH';
              depName = 'Growth & Booking';
            } else if (['cc', 'lt', 'technician', 'coca'].includes(s.role || '')) {
              depCode = 'SHOP';
              depName = 'Shop Operations';
            } else if (['teacher', 'ht'].includes(s.role || '')) {
              depCode = 'ACADEMY';
              depName = 'Academy';
            } else {
              depCode = 'BACK_OFFICE';
              depName = 'Back Office';
            }
          }

          staffMap.set(sid, {
            staffId: sid,
            crmStaffId: s.id,
            displayName: s.displayName,
            avatarUrl: s.avatarUrl,
            roleKey: s.role,
            roleName: getRoleName(s.role),
            departmentCode: depCode,
            departmentName: depName,
            teamCode: meta?.teamCode,
            teamName: meta?.teamName || getRoleName(s.role),
            isDefaultBk: activeBkIds.includes(sid),
          });
        });

        // 2. Add from BK config allStaffOptions if missing
        if (configRes && Array.isArray(configRes.allStaffOptions)) {
          configRes.allStaffOptions.forEach((bs) => {
            if (!staffMap.has(bs.staffId)) {
              staffMap.set(bs.staffId, {
                staffId: bs.staffId,
                displayName: bs.displayName || `BK #${bs.staffId}`,
                roleKey: 'telesales',
                roleName: 'Telesales',
                departmentCode: 'GROWTH',
                departmentName: 'Growth & Booking',
                teamCode: 'BK_TELESALES',
                teamName: 'Telesales',
                isDefaultBk: activeBkIds.includes(bs.staffId),
              });
            }
          });
        }

        const staffList = Array.from(staffMap.values()).sort((a, b) => {
          if (a.isDefaultBk && !b.isDefaultBk) return -1;
          if (!a.isDefaultBk && b.isDefaultBk) return 1;
          return a.displayName.localeCompare(b.displayName, 'vi');
        });

        setAllStaffList(staffList);

        // Preselect active BKs by default if participantIds is empty
        const defaultSelected = staffList.filter((s) => s.isDefaultBk).map((s) => s.staffId);
        const currentParticipants = form.getFieldValue('participantIds');
        if (!currentParticipants || currentParticipants.length === 0) {
          form.setFieldsValue({
            participantIds: defaultSelected.length > 0 ? defaultSelected : staffList.slice(0, 5).map((s) => s.staffId),
          });
        }
      } catch {
        // Fallback safely
      } finally {
        setStaffLoading(false);
      }
    };
    void fetchStaff();
  }, [open, form]);

  const handleSubmit = async (values: {
    title: string;
    description?: string;
    gameType: BkGameType;
    metricType: BkGameMetricType;
    allowedBookingChannels?: string[];
    dateRange: [Dayjs, Dayjs];
    targetScore?: number;
    entryFee?: number;
    rewardPool?: number;
    rewardDescription?: string;
    penaltyDescription?: string;
    participantIds?: number[];
    team1Name?: string;
    team1Members?: number[];
    team2Name?: string;
    team2Members?: number[];
  }) => {
    setLoading(true);
    try {
      const [start, end] = values.dateRange;
      const payload: BkGameCreateInput = {
        title: values.title,
        description: values.description,
        gameType: values.gameType,
        metricType: values.metricType,
        allowedBookingChannels: values.allowedBookingChannels,
        targetScore: values.targetScore,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        entryFee: values.entryFee || 0,
        rewardPool: values.rewardPool || 0,
        rewardDescription: values.rewardDescription,
        penaltyDescription: values.penaltyDescription,
        winnerCriteria: 'TOP_1',
      };

      if (values.gameType === 'TEAM') {
        payload.teams = [
          {
            teamName: values.team1Name || 'Team Sói Bạc',
            color: 'blue',
            staffIds: values.team1Members || [],
          },
          {
            teamName: values.team2Name || 'Team Đại Bàng',
            color: 'red',
            staffIds: values.team2Members || [],
          },
        ];
      } else {
        payload.participantIds = values.participantIds;
      }

      const res = await apiClient.bk.createGame(payload);
      message.success('Khởi tạo Game BK thành công!');
      onSuccess(res.game);
      onClose();
      form.resetFields();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo game. Vui lòng thử lại.';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // 1. Role / Department Filter Options
  const roleFilterOptions = useMemo(() => {
    if (allStaffList.length === 0) return [];

    const depCounts: Record<string, number> = {};
    const teamCounts: Record<string, number> = {};

    allStaffList.forEach((s) => {
      if (s.departmentCode) {
        depCounts[s.departmentCode] = (depCounts[s.departmentCode] || 0) + 1;
      }
      const tKey = s.teamCode || s.roleKey || 'OTHER';
      teamCounts[tKey] = (teamCounts[tKey] || 0) + 1;
    });

    const telesalesCount = (teamCounts['BK_TELESALES'] || 0) + (teamCounts['telesales'] || 0);
    const ccCount = (teamCounts['CC'] || 0) + (teamCounts['cc'] || 0);
    const cvCount = (teamCounts['CV'] || 0) + (teamCounts['technician'] || 0) + (teamCounts['lt'] || 0);
    const csCount = teamCounts['BK_CS'] || 0;
    const controlCount = teamCounts['BK_CONTROL'] || 0;
    const academyCount = (teamCounts['ACADEMY'] || 0) + (teamCounts['teacher'] || 0) + (teamCounts['ht'] || 0);
    const marketingCount = teamCounts['MARKETING_SALES'] || 0;
    const qaCount =
      (teamCounts['QA_QC'] || 0) +
      (teamCounts['QA_QC_SHOP'] || 0) +
      (teamCounts['QA_QC_TECHNICIAN'] || 0) +
      (teamCounts['QA_QC_CX'] || 0) +
      (teamCounts['qa_qc'] || 0);
    const mgmtCount = (teamCounts['admin'] || 0) + (teamCounts['manager'] || 0) + (teamCounts['super_admin'] || 0);

    return [
      {
        value: 'ALL',
        label: `Tất cả vai trò & bộ phận (${allStaffList.length})`,
      },
      {
        label: 'Theo Bộ Phận',
        options: [
          { value: 'DEP:GROWTH', label: `Growth & Booking (${depCounts['GROWTH'] || 0})` },
          { value: 'DEP:SHOP', label: `Shop Operations (${depCounts['SHOP'] || 0})` },
          { value: 'DEP:ACADEMY', label: `Academy / Đào tạo (${depCounts['ACADEMY'] || 0})` },
          { value: 'DEP:BACK_OFFICE', label: `Back Office / Quản trị (${depCounts['BACK_OFFICE'] || 0})` },
        ].filter((o) => (depCounts[o.value.replace('DEP:', '')] || 0) > 0),
      },
      {
        label: 'Theo Vai trò / Đội nhóm',
        options: [
          { value: 'TEAM:BK_TELESALES', label: `Telesales (${telesalesCount})`, count: telesalesCount },
          { value: 'TEAM:CC', label: `Client Consultant - CC (${ccCount})`, count: ccCount },
          { value: 'TEAM:CV', label: `Chuyên viên / KTV (${cvCount})`, count: cvCount },
          { value: 'TEAM:BK_CS', label: `Customer Service - CS (${csCount})`, count: csCount },
          { value: 'TEAM:BK_CONTROL', label: `Control (${controlCount})`, count: controlCount },
          { value: 'TEAM:ACADEMY', label: `Đào tạo / Giảng viên (${academyCount})`, count: academyCount },
          { value: 'TEAM:MARKETING_SALES', label: `Marketing & Sales (${marketingCount})`, count: marketingCount },
          { value: 'TEAM:QA_QC', label: `QA / QC (${qaCount})`, count: qaCount },
          { value: 'ROLE:MANAGEMENT', label: `Quản lý / Admin (${mgmtCount})`, count: mgmtCount },
        ]
          .filter((o) => o.count > 0)
          .map(({ count: _c, ...rest }) => rest),
      },
    ];
  }, [allStaffList]);

  // 2. Filtered Staff based on current Role/Department filter
  const filteredStaffList = useMemo(() => {
    if (selectedRoleFilter === 'ALL') return allStaffList;

    if (selectedRoleFilter.startsWith('DEP:')) {
      const depCode = selectedRoleFilter.replace('DEP:', '');
      return allStaffList.filter((s) => s.departmentCode === depCode);
    }

    if (selectedRoleFilter.startsWith('TEAM:')) {
      const teamCode = selectedRoleFilter.replace('TEAM:', '');
      if (teamCode === 'BK_TELESALES') {
        return allStaffList.filter((s) => s.teamCode === 'BK_TELESALES' || s.roleKey === 'telesales' || s.isDefaultBk);
      }
      if (teamCode === 'CC') {
        return allStaffList.filter((s) => s.teamCode === 'CC' || s.roleKey === 'cc');
      }
      if (teamCode === 'CV') {
        return allStaffList.filter((s) => s.teamCode === 'CV' || ['technician', 'lt'].includes(s.roleKey || ''));
      }
      if (teamCode === 'BK_CS') {
        return allStaffList.filter((s) => s.teamCode === 'BK_CS');
      }
      if (teamCode === 'BK_CONTROL') {
        return allStaffList.filter((s) => s.teamCode === 'BK_CONTROL');
      }
      if (teamCode === 'ACADEMY') {
        return allStaffList.filter((s) => s.teamCode === 'ACADEMY' || ['teacher', 'ht'].includes(s.roleKey || ''));
      }
      if (teamCode === 'MARKETING_SALES') {
        return allStaffList.filter((s) => s.teamCode === 'MARKETING_SALES');
      }
      if (teamCode === 'QA_QC') {
        return allStaffList.filter((s) => s.teamCode?.startsWith('QA_QC') || s.roleKey === 'qa_qc');
      }
      return allStaffList.filter((s) => s.teamCode === teamCode);
    }

    if (selectedRoleFilter === 'ROLE:MANAGEMENT') {
      return allStaffList.filter((s) => ['admin', 'super_admin', 'manager'].includes(s.roleKey || ''));
    }

    return allStaffList;
  }, [allStaffList, selectedRoleFilter]);

  // Form watchers for dynamic selection state
  const selectedParticipantIds = Form.useWatch('participantIds', form) || [];
  const selectedTeam1Ids = Form.useWatch('team1Members', form) || [];
  const selectedTeam2Ids = Form.useWatch('team2Members', form) || [];

  // Helper to build options preserving already selected staff outside current filter
  const buildSelectableOptions = (currentlySelected: number[]) => {
    const selectedIdsSet = new Set<number>(currentlySelected);
    const inFilterIdsSet = new Set<number>(filteredStaffList.map((s) => s.staffId));

    const combined = [...filteredStaffList];
    allStaffList.forEach((s) => {
      if (selectedIdsSet.has(s.staffId) && !inFilterIdsSet.has(s.staffId)) {
        combined.push(s);
      }
    });

    return combined.map((s) => ({
      value: s.staffId,
      label: s.displayName,
      staff: s,
    }));
  };

  const participantOptions = useMemo(
    () => buildSelectableOptions(selectedParticipantIds),
    [filteredStaffList, selectedParticipantIds, allStaffList]
  );

  const team1Options = useMemo(
    () => buildSelectableOptions(selectedTeam1Ids),
    [filteredStaffList, selectedTeam1Ids, allStaffList]
  );

  const team2Options = useMemo(
    () => buildSelectableOptions(selectedTeam2Ids),
    [filteredStaffList, selectedTeam2Ids, allStaffList]
  );

  // Quick action buttons
  const handleAddAllFiltered = (field: 'participantIds' | 'team1Members' | 'team2Members' = 'participantIds') => {
    const current = form.getFieldValue(field) || [];
    const newIds = filteredStaffList.map((s) => s.staffId);
    const merged = Array.from(new Set([...current, ...newIds]));
    form.setFieldsValue({ [field]: merged });
  };

  const handleClearField = (field: 'participantIds' | 'team1Members' | 'team2Members' = 'participantIds') => {
    form.setFieldsValue({ [field]: [] });
  };

  // Option renderer with Avatar and Role badge
  const renderOptionItem = (option: { label: string; staff?: StaffProfileOption }) => {
    const s = option.staff;
    const tagBgClass =
      s?.departmentCode === 'GROWTH'
        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
        : s?.departmentCode === 'SHOP'
          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
          : s?.departmentCode === 'ACADEMY'
            ? 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800'
            : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

    return (
      <div className="flex items-center justify-between py-1 w-full gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {s?.avatarUrl ? (
            <Avatar src={s.avatarUrl} size={22} className="flex-shrink-0" />
          ) : (
            <Avatar size={22} className="!bg-emerald-600 !text-white flex-shrink-0 text-xs leading-none">
              {(s?.displayName || option.label || 'U').slice(0, 1).toUpperCase()}
            </Avatar>
          )}
          <span className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate">{option.label}</span>
        </div>
        <span
          className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-medium border leading-none flex-shrink-0 ${tagBgClass}`}
        >
          {s?.teamName || s?.roleName || 'Nhân viên'}
        </span>
      </div>
    );
  };

  // Tone-insensitive and role-aware search filter
  const customFilterOption = (input: string, option?: { label?: unknown; staff?: StaffProfileOption }) => {
    if (!input || !option) return true;
    const rawInput = removeVietnameseTones(input.toLowerCase().trim());
    const labelStr = typeof option.label === 'string' ? option.label : '';
    const rawLabel = removeVietnameseTones(labelStr.toLowerCase());
    const rawRole = removeVietnameseTones((option.staff?.roleName || '').toLowerCase());
    const rawTeam = removeVietnameseTones((option.staff?.teamName || '').toLowerCase());
    const staffIdStr = String(option.staff?.staffId || '');
    return (
      rawLabel.includes(rawInput) ||
      rawRole.includes(rawInput) ||
      rawTeam.includes(rawInput) ||
      staffIdStr.includes(rawInput)
    );
  };

  return (
    <AdaptiveModal
      intent="form"
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2">
          <AppIcon icon={Trophy} size="md" className="text-amber-500" />
          <span className="font-semibold text-base">Khởi Tạo Game BK Mới</span>
        </div>
      }
      footer={null}
      width={680}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          gameType: 'INDIVIDUAL',
          metricType: 'BOOKINGS',
          dateRange: [dayjs().startOf('day'), dayjs().endOf('day')],
          targetScore: 50,
          entryFee: 50000,
          rewardPool: 500000,
          rewardDescription: 'Nhất nhận toàn bộ quỹ cược + 500k thưởng công ty',
          penaltyDescription: 'Bao trà sữa Phúc Long cả team',
          team1Name: 'Team Sói Bạc',
          team2Name: 'Team Đại Bàng',
        }}
        className="mt-4"
      >
        <Form.Item
          name="title"
          label={<span className="font-medium">Tên game thi đua</span>}
          rules={[{ required: true, message: 'Vui lòng nhập tên game thi đua' }]}
        >
          <Input placeholder="Ví dụ: Chiến Dịch Săn Booking Tuần 38..." size="large" />
        </Form.Item>

        <Form.Item name="gameType" label={<span className="font-medium">Thể thức thi đua</span>}>
          <Segmented
            value={gameType}
            onChange={(val) => {
              setGameType(val as BkGameType);
              form.setFieldValue('gameType', val);
            }}
            block
            options={[
              {
                label: (
                  <div className="flex items-center justify-center gap-2 py-1">
                    <AppIcon icon={Award} size="sm" />
                    <span>Cá nhân</span>
                  </div>
                ),
                value: 'INDIVIDUAL',
              },
              {
                label: (
                  <div className="flex items-center justify-center gap-2 py-1">
                    <AppIcon icon={Users} size="sm" />
                    <span>Chia đội đối đầu</span>
                  </div>
                ),
                value: 'TEAM',
              },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="dateRange"
          label={<span className="font-medium">Thời gian bắt đầu – kết thúc</span>}
          rules={[{ required: true, message: 'Vui lòng chọn thời gian bắt đầu và kết thúc' }]}
        >
          <DatePicker.RangePicker
            showTime={{ format: 'HH:mm' }}
            format="DD/MM/YYYY HH:mm"
            className="w-full"
            size="large"
          />
        </Form.Item>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="metricType"
            label={
              <div className="flex items-center gap-1.5">
                <span className="font-medium">Chỉ số tính điểm KPI</span>
                <Tooltip title="Xem chi tiết công thức và quy tắc tính điểm">
                  <span
                    tabIndex={0}
                    role="button"
                    aria-label="Hướng dẫn công thức tính điểm"
                    className="inline-flex items-center cursor-pointer text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    <AppIcon icon={Info} size="sm" />
                  </span>
                </Tooltip>
              </div>
            }
            rules={[{ required: true }]}
          >
            <Radio.Group className="grid grid-cols-2 gap-2">
              <Radio.Button value="BOOKINGS" className="text-center">
                Booking tạo
              </Radio.Button>
              <Radio.Button value="CALLS" className="text-center">
                Cuộc gọi
              </Radio.Button>
              <Radio.Button value="PICKUPS" className="text-center">
                Nghe máy
              </Radio.Button>
              <Radio.Button value="DONE" className="text-center">
                Done
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="targetScore"
            label={<span className="font-medium">Mục tiêu KPI cần đạt ({currentScoringRule.unit})</span>}
            rules={[{ required: true, message: 'Vui lòng nhập mục tiêu' }]}
          >
            <InputNumber min={1} className="w-full" size="large" placeholder="Ví dụ: 50" />
          </Form.Item>
        </div>

        {(watchedMetricType === 'BOOKINGS' || watchedMetricType === 'DONE') && (
          <Form.Item
            name="allowedBookingChannels"
            label={
              <div className="flex items-center gap-1.5">
                <span className="font-medium">Kênh tiếp nhận đặt lịch (Booking Channel)</span>
                <Tooltip title="Chọn các kênh tiếp nhận booking được ghi nhận tính điểm cho game (ví dụ: chỉ kênh GB). Để trống để tính tất cả các kênh (Facebook, Zalo, GB, Hotline...).">
                  <span
                    tabIndex={0}
                    role="button"
                    aria-label="Hướng dẫn chọn kênh tiếp nhận"
                    className="inline-flex items-center cursor-pointer text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    <AppIcon icon={Info} size="sm" />
                  </span>
                </Tooltip>
              </div>
            }
            extra={
              <span className="text-[12px] text-slate-500 dark:text-slate-400">
                🎯 <strong>Fair-play:</strong> Giới hạn kênh tiếp nhận (ví dụ: <code>GB</code>) giúp đảm bảo công bằng cho người chơi chỉ phụ trách kênh đó, không bị chênh lệch với người chơi nhận nhiều nguồn (FB, Zalo, WA). Để trống = tính tất cả kênh.
              </span>
            }
          >
            <Select
              mode="multiple"
              allowClear
              placeholder="Tất cả các kênh (mặc định) hoặc chọn: GB, FB, Zalo..."
              size="large"
              options={BK_BOOKING_CHANNELS.map((c) => ({
                value: c.value,
                label: c.label,
              }))}
            />
          </Form.Item>
        )}

        {/* Khối hiển thị trực quan công thức & quy tắc tính điểm cho chỉ số đang chọn */}
        <div
          data-testid="bk-game-scoring-guide"
          className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 text-xs space-y-2 transition-all duration-200"
        >
          <div className="flex items-center justify-between flex-wrap gap-1">
            <div className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-300">
              <AppIcon icon={Sparkles} size="sm" className="text-amber-500 shrink-0" />
              <span>Công thức tính điểm: {currentScoringRule.formula}</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-medium">
              Đơn vị: {currentScoringRule.unit}
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 !mb-0 leading-relaxed">{currentScoringRule.description}</p>
          <div className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-blue-200/60 dark:border-blue-900/40">
            <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">Nguồn trích xuất:</span>
            <span>{currentScoringRule.dataSource}</span>
          </div>
          {currentScoringRule.notes && (
            <div className="text-[11px] text-amber-700 dark:text-amber-300/90 flex items-center gap-1">
              <AppIcon icon={Info} size="sm" className="text-amber-500 shrink-0" />
              <span>{currentScoringRule.notes}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item name="entryFee" label={<span className="font-medium">Mức cược tham gia (VNĐ/người)</span>}>
            <InputNumber
              min={0}
              step={10000}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              className="w-full"
              size="large"
              placeholder="0 nếu không cược"
            />
          </Form.Item>

          <Form.Item name="rewardPool" label={<span className="font-medium">Thưởng công ty tài trợ (VNĐ)</span>}>
            <InputNumber
              min={0}
              step={50000}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              className="w-full"
              size="large"
              placeholder="Tiền thưởng thêm từ Manager"
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item name="rewardDescription" label={<span className="font-medium">Mô tả giải thưởng</span>}>
            <Input placeholder="Ví dụ: Top 1 nhận toàn bộ quỹ..." />
          </Form.Item>

          <Form.Item
            name="penaltyDescription"
            label={
              <span className="font-medium flex items-center gap-1.5 text-rose-500">
                <AppIcon icon={ShieldAlert} size="sm" />
                <span>Hình phạt vui</span>
              </span>
            }
          >
            <Input placeholder="Ví dụ: Bao trà sữa, Hát 1 bài..." />
          </Form.Item>
        </div>

        {/* Bộ lọc vai trò & bộ phận */}
        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <AppIcon icon={Filter} size="sm" className="text-emerald-600" />
              <span>1. Bộ lọc Vai trò / Bộ phận</span>
            </div>
            {gameType === 'INDIVIDUAL' && (
              <div className="flex items-center gap-1.5 text-xs">
                <Button
                  size="small"
                  type="text"
                  icon={<AppIcon icon={Plus} size="sm" />}
                  className="!text-emerald-600 hover:!bg-emerald-50 dark:hover:!bg-emerald-950/30 !px-2 !py-0 !h-6"
                  onClick={() => handleAddAllFiltered('participantIds')}
                  disabled={filteredStaffList.length === 0}
                >
                  + Thêm tất cả ({filteredStaffList.length})
                </Button>
                <Button
                  size="small"
                  type="text"
                  icon={<AppIcon icon={Trash2} size="sm" />}
                  className="!text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-950/30 !px-2 !py-0 !h-6"
                  onClick={() => handleClearField('participantIds')}
                  disabled={selectedParticipantIds.length === 0}
                >
                  Xóa hết
                </Button>
              </div>
            )}
          </div>

          <Select
            value={selectedRoleFilter}
            onChange={(val) => setSelectedRoleFilter(val)}
            options={roleFilterOptions}
            loading={staffLoading}
            className="w-full"
            placeholder="Chọn bộ phận hoặc vai trò để lọc danh sách nhân viên"
          />
        </div>

        {gameType === 'INDIVIDUAL' ? (
          <Form.Item
            name="participantIds"
            label={
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">2. Danh sách nhân viên tham gia ({selectedParticipantIds.length})</span>
                <span className="text-xs text-slate-400 font-normal">
                  Hiển thị {filteredStaffList.length} / {allStaffList.length} nhân sự
                </span>
              </div>
            }
            rules={[{ required: true, message: 'Chọn ít nhất một thành viên' }]}
          >
            <Select
              mode="multiple"
              placeholder="Tìm kiếm và chọn nhân viên thi đấu..."
              options={participantOptions}
              optionRender={(opt) => renderOptionItem(opt.data as { label: string; staff?: StaffProfileOption })}
              filterOption={customFilterOption}
              size="large"
              className="w-full"
              loading={staffLoading}
              maxTagCount="responsive"
            />
          </Form.Item>
        ) : (
          <div className="space-y-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <Typography.Text strong className="text-sm">
              Chia 2 đội thi đấu đối kháng (Team Battle)
            </Typography.Text>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20">
                <Form.Item
                  name="team1Name"
                  label={<span className="font-medium text-blue-600 dark:text-blue-400">Tên Đội 1</span>}
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Team Sói Bạc" />
                </Form.Item>
                <Form.Item
                  name="team1Members"
                  label={
                    <div className="flex items-center justify-between w-full">
                      <span>Thành viên Đội 1 ({selectedTeam1Ids.length})</span>
                      <Button
                        size="small"
                        type="link"
                        className="!p-0 !h-auto !text-xs !text-blue-600"
                        onClick={() => handleAddAllFiltered('team1Members')}
                        disabled={filteredStaffList.length === 0}
                      >
                        + Thêm nhóm ({filteredStaffList.length})
                      </Button>
                    </div>
                  }
                  rules={[{ required: true, message: 'Chọn thành viên Đội 1' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Chọn thành viên"
                    options={team1Options}
                    optionRender={(opt) => renderOptionItem(opt.data as { label: string; staff?: StaffProfileOption })}
                    filterOption={customFilterOption}
                    className="w-full"
                    maxTagCount="responsive"
                  />
                </Form.Item>
              </div>

              <div className="p-3 rounded border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20">
                <Form.Item
                  name="team2Name"
                  label={<span className="font-medium text-red-600 dark:text-red-400">Tên Đội 2</span>}
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Team Đại Bàng" />
                </Form.Item>
                <Form.Item
                  name="team2Members"
                  label={
                    <div className="flex items-center justify-between w-full">
                      <span>Thành viên Đội 2 ({selectedTeam2Ids.length})</span>
                      <Button
                        size="small"
                        type="link"
                        className="!p-0 !h-auto !text-xs !text-red-600"
                        onClick={() => handleAddAllFiltered('team2Members')}
                        disabled={filteredStaffList.length === 0}
                      >
                        + Thêm nhóm ({filteredStaffList.length})
                      </Button>
                    </div>
                  }
                  rules={[{ required: true, message: 'Chọn thành viên Đội 2' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Chọn thành viên"
                    options={team2Options}
                    optionRender={(opt) => renderOptionItem(opt.data as { label: string; staff?: StaffProfileOption })}
                    filterOption={customFilterOption}
                    className="w-full"
                    maxTagCount="responsive"
                  />
                </Form.Item>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<AppIcon icon={Sparkles} size="sm" />}
            className="!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600"
          >
            Khởi Tạo Game
          </Button>
        </div>
      </Form>
    </AdaptiveModal>
  );
}
