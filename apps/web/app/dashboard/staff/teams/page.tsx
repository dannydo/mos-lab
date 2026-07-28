'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Typography, Tag, Button, Input, Spin, message, Badge, Tooltip, Alert } from 'antd';
import {
  TeamOutlined,
  SearchOutlined,
  SaveOutlined,
  ReloadOutlined,
  SettingOutlined,
  UsergroupAddOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  CloseOutlined,
  CheckCircleFilled,
  FilterOutlined,
  InfoCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '../../../../context/ThemeContext';
import { apiClient } from '../../../../lib/api-client';
import { Team, TeamStaffOption, removeVietnameseTones } from '@mos-lab/shared';

const { Title, Text } = Typography;

export default function TeamsPage() {
  const { themeMode } = useTheme();
  const searchParams = useSearchParams();
  const initialSelectedCode = searchParams.get('selected') || 'CC';

  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);

  const [teams, setTeams] = useState<Team[]>([]);
  const rootTeams = useMemo(() => {
    return teams.filter((t) => !t.parentTeamId);
  }, [teams]);
  const [selectedCode, setSelectedCode] = useState<string>(initialSelectedCode);

  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [staffOptions, setStaffOptions] = useState<TeamStaffOption[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<number>>(new Set());

  // Search & Filter state for 2 columns
  const [poolSearchText, setPoolSearchText] = useState('');
  const [activeSearchText, setActiveSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Is current team an auto-fallback group (e.g. BK_OTHER)?
  const isAutoGroup = Boolean(currentTeam && (currentTeam.code === 'BK_OTHER' || currentTeam.code.endsWith('_OTHER')));

  // Set of all staff IDs assigned to specifically defined teams (non-OTHER subteams or root teams)
  const definedTeamStaffIds = useMemo(() => {
    const set = new Set<number>();
    teams.forEach((root) => {
      if (root.activeStaffIds && !root.code.endsWith('_OTHER') && root.code !== currentTeam?.code) {
        root.activeStaffIds.forEach((id) => set.add(id));
      }
      if (root.children) {
        root.children.forEach((child) => {
          if (!child.code.endsWith('_OTHER') && child.code !== currentTeam?.code && child.activeStaffIds) {
            child.activeStaffIds.forEach((id) => set.add(id));
          }
        });
      }
    });
    return set;
  }, [teams, currentTeam]);

  // Fetch all teams
  const fetchTeams = useCallback(async () => {
    setLoadingTeams(true);
    try {
      const res = await apiClient.teams.list();
      setTeams(res.teams || []);
    } catch (err) {
      console.error('Fetch teams error:', err);
      message.error('Không thể tải danh sách đội nhóm.');
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  // Fetch detail for selected team
  const fetchTeamDetail = useCallback(async (code: string) => {
    setLoadingDetail(true);
    try {
      const res = await apiClient.teams.getByCode(code);
      setCurrentTeam(res.team);
      setStaffOptions(res.allStaffOptions || []);

      const activeIds = new Set((res.allStaffOptions || []).filter((opt) => opt.isActive).map((opt) => opt.staffId));
      setSelectedStaffIds(activeIds);

      // Keep sidebar menu memberCount synchronized with actual active staff IDs in DB
      setTeams((prev) =>
        prev.map((t) => {
          if (t.code === code) return { ...t, memberCount: activeIds.size };
          if (t.children) {
            return {
              ...t,
              children: t.children.map((c) => (c.code === code ? { ...c, memberCount: activeIds.size } : c)),
            };
          }
          return t;
        })
      );
    } catch (err) {
      console.error(`Fetch team ${code} detail error:`, err);
      message.error(`Không thể tải thông tin đội ${code}.`);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    if (selectedCode) {
      fetchTeamDetail(selectedCode);
    }
  }, [selectedCode, fetchTeamDetail]);

  const handleToggleStaff = (staffId: number) => {
    if (isAutoGroup) return;
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) {
        next.delete(staffId);
      } else {
        next.add(staffId);
      }
      return next;
    });
  };

  const handleAddStaff = (staffId: number) => {
    if (isAutoGroup) return;
    setSelectedStaffIds((prev) => new Set(prev).add(staffId));
  };

  const handleRemoveStaff = (staffId: number) => {
    if (isAutoGroup) return;
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      next.delete(staffId);
      return next;
    });
  };

  // Left Column: Filtered Pool Options
  const availablePoolOptions = useMemo(() => {
    let list = staffOptions;

    // For auto group (BK_OTHER), subtract all members assigned to specifically defined teams!
    if (isAutoGroup) {
      list = list.filter((opt) => !definedTeamStaffIds.has(opt.staffId));
    } else if (roleFilter !== 'ALL') {
      list = list.filter((opt) => {
        const staffRole = (opt.role || '').toUpperCase();
        if (roleFilter === 'CC') return staffRole.includes('CC');
        if (roleFilter === 'CV') return staffRole.includes('CV') || staffRole.includes('KTV');
        if (roleFilter === 'BK') return staffRole.includes('BK') || staffRole.includes('BOOKER');
        if (roleFilter === 'OTHER') {
          return (
            !staffRole.includes('CC') &&
            !staffRole.includes('CV') &&
            !staffRole.includes('KTV') &&
            !staffRole.includes('BK')
          );
        }
        return true;
      });
    }

    // Accentless search
    if (poolSearchText.trim()) {
      const query = removeVietnameseTones(poolSearchText);
      list = list.filter(
        (opt) =>
          removeVietnameseTones(opt.displayName).includes(query) ||
          (opt.username && removeVietnameseTones(opt.username).includes(query)) ||
          String(opt.staffId).includes(query)
      );
    }

    return list;
  }, [staffOptions, roleFilter, poolSearchText, isAutoGroup, definedTeamStaffIds]);

  // Right Column: Active Members List Filtered
  const activeMembersList = useMemo(() => {
    const activeStaff = staffOptions.filter((opt) => selectedStaffIds.has(opt.staffId));
    if (!activeSearchText.trim()) return activeStaff;
    const query = removeVietnameseTones(activeSearchText);
    return activeStaff.filter(
      (opt) =>
        removeVietnameseTones(opt.displayName).includes(query) ||
        (opt.username && removeVietnameseTones(opt.username).includes(query)) ||
        String(opt.staffId).includes(query)
    );
  }, [staffOptions, selectedStaffIds, activeSearchText]);

  const handleAddAllFilteredToTeam = () => {
    if (isAutoGroup) return;
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      availablePoolOptions.forEach((opt) => next.add(opt.staffId));
      return next;
    });
    message.success(`Đã thêm ${availablePoolOptions.length} nhân sự vào đội.`);
  };

  const handleClearAllActive = () => {
    if (isAutoGroup) return;
    setSelectedStaffIds(new Set());
    message.info('Đã xóa tất cả nhân sự khỏi đội.');
  };

  const handleSaveMembers = async () => {
    if (!currentTeam || isAutoGroup) return;
    setSaving(true);
    try {
      const activeIdsArray = Array.from(selectedStaffIds);
      await apiClient.teams.updateMembers(currentTeam.id, {
        activeStaffIds: activeIdsArray,
      });
      message.success(`Đã lưu danh sách thành viên đội ${currentTeam.name} thành công!`);
      fetchTeams();
      fetchTeamDetail(currentTeam.code);
    } catch (err) {
      console.error('Save team members error:', err);
      message.error('Không thể lưu danh sách thành viên.');
    } finally {
      setSaving(false);
    }
  };

  // Flatten root teams and their children for the left menu
  const renderTeamMenuItem = (t: Team, isChild = false) => {
    const isSelected = selectedCode === t.code;
    return (
      <div
        key={t.code}
        onClick={() => setSelectedCode(t.code)}
        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${
          isChild ? 'ml-4 my-1' : 'my-1.5'
        } ${
          isSelected
            ? themeMode === 'dark'
              ? 'bg-blue-950/70 border border-blue-600/50 shadow-md'
              : 'bg-blue-50 border border-blue-200 shadow-sm'
            : themeMode === 'dark'
              ? 'hover:bg-slate-800/60 border border-transparent'
              : 'hover:bg-slate-100/80 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl flex-shrink-0">{t.icon || '👥'}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`font-semibold text-sm truncate ${
                  isSelected
                    ? themeMode === 'dark'
                      ? 'text-blue-400'
                      : 'text-blue-600'
                    : themeMode === 'dark'
                      ? 'text-slate-200'
                      : 'text-slate-700'
                }`}
              >
                {t.name}
              </span>
              <Tag color={t.color || 'default'} className="text-[10px] px-1 py-0 border-0 flex-shrink-0 font-mono">
                {t.code}
              </Tag>
            </div>
            {t.description && <p className="text-xs text-slate-400 truncate max-w-[180px] m-0">{t.description}</p>}
          </div>
        </div>
        <Badge
          count={t.memberCount ?? 0}
          overflowCount={999}
          style={{
            backgroundColor: isSelected ? t.color || '#1890ff' : themeMode === 'dark' ? '#334155' : '#cbd5e1',
            color: isSelected ? '#fff' : themeMode === 'dark' ? '#94a3b8' : '#475569',
          }}
          className="flex-shrink-0 ml-2"
        />
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title level={2} style={{ margin: 0 }}>
            <TeamOutlined className="mr-3 text-blue-500" />
            Cấu hình Đội Nhóm
          </Title>
          <Text type="secondary" className="text-sm">
            Quản lý tập trung danh sách nhân sự thuộc các đội CC, CV, BK & các nhóm trực thuộc.
          </Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            fetchTeams();
            if (selectedCode) fetchTeamDetail(selectedCode);
          }}
          loading={loadingTeams || loadingDetail}
        >
          Làm mới
        </Button>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Team Tree Navigation */}
        <div className="lg:col-span-4 space-y-3">
          <Card
            title={
              <span className="font-bold flex items-center gap-2 text-base">
                <SettingOutlined /> Danh sách Đội Nhóm
              </span>
            }
            className={`shadow-sm border ${
              themeMode === 'dark' ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200'
            }`}
            bodyStyle={{ padding: '12px' }}
          >
            {loadingTeams ? (
              <div className="flex justify-center p-8">
                <Spin tip="Đang tải đội nhóm..." />
              </div>
            ) : (
              <div className="space-y-1">
                {rootTeams.map((rootTeam) => (
                  <React.Fragment key={rootTeam.code}>
                    {renderTeamMenuItem(rootTeam)}
                    {rootTeam.children && rootTeam.children.length > 0 && (
                      <div className="border-l-2 border-slate-700/30 pl-1 my-1 space-y-1">
                        {rootTeam.children.map((childTeam) => renderTeamMenuItem(childTeam, true))}
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Panel: Selected Team Members Detail */}
        <div className="lg:col-span-8">
          <Card
            className={`shadow-sm border ${
              themeMode === 'dark' ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200'
            }`}
          >
            {loadingDetail ? (
              <div className="flex justify-center items-center p-16">
                <Spin size="large" tip="Đang tải thông tin đội..." />
              </div>
            ) : currentTeam ? (
              <div className="space-y-5">
                {/* Team Info Banner */}
                <div
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                    themeMode === 'dark' ? 'bg-slate-800/50 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{currentTeam.icon || '👥'}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <Title level={4} style={{ margin: 0 }}>
                          {currentTeam.name}
                        </Title>
                        <Tag color={currentTeam.color || 'blue'} className="px-2 py-0.5 font-bold">
                          {currentTeam.code}
                        </Tag>
                        {isAutoGroup ? (
                          <Tag color="orange" className="text-xs font-semibold">
                            Tự động (Auto Group)
                          </Tag>
                        ) : currentTeam.parentTeamId ? (
                          <Tag color="purple" className="text-xs">
                            Sub-team
                          </Tag>
                        ) : null}
                      </div>
                      <Text type="secondary" className="text-xs">
                        {currentTeam.description || 'Chưa có mô tả cho đội nhóm này.'}
                      </Text>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto bg-slate-900/20 px-3 py-1.5 rounded-lg border border-slate-700/30">
                    <span className="text-xs text-slate-400 font-medium">
                      {isAutoGroup ? 'Tự động gom (Đã trừ các đội cụ thể):' : 'Đang hoạt động:'}
                    </span>
                    <Badge
                      count={isAutoGroup ? availablePoolOptions.length : selectedStaffIds.size}
                      overflowCount={999}
                      style={{
                        backgroundColor: isAutoGroup ? '#fa8c16' : '#52c41a',
                        fontWeight: 'bold',
                      }}
                    />
                    <span className="text-xs text-slate-400 font-medium">/ {staffOptions.length} nhân sự</span>
                  </div>
                </div>

                {/* Conditional View: Auto Group Notice vs Dual List Editor */}
                {isAutoGroup ? (
                  /* Auto Group Mode Notice & Read-only View */
                  <div className="space-y-4">
                    <Alert
                      message={
                        <span className="font-bold flex items-center gap-2">
                          <InfoCircleOutlined className="text-amber-500" />
                          Nhóm Tự Động / Khác ({currentTeam.code})
                        </span>
                      }
                      description={
                        <div className="space-y-1.5 text-xs">
                          <p>
                            💡{' '}
                            <strong>
                              Nhóm {currentTeam.name} ({currentTeam.code})
                            </strong>{' '}
                            là nhóm tự động gom tất cả nhân sự/kênh chưa thuộc bất kỳ nhóm cụ thể nào.
                          </p>
                          <p className="text-amber-200/90 font-medium">
                            ✨ <strong>Quy tắc loại trừ:</strong> Hệ thống tự động{' '}
                            <strong>TRỪ RA {definedTeamStaffIds.size} nhân sự</strong> đã thuộc về các đội cụ thể
                            (Telesales, CS, Control...). Chỉ những thành viên chưa phân nhóm mới xuất hiện tại đây.
                          </p>
                        </div>
                      }
                      type="warning"
                      showIcon={false}
                      className="border-amber-500/40 bg-amber-950/30 text-amber-200 p-4 rounded-xl"
                    />

                    {/* Readonly preview of staff defaulting to Khác */}
                    <div
                      className={`p-4 rounded-xl border space-y-3 ${
                        themeMode === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50/60 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm flex items-center gap-2">
                          <UserOutlined className="text-amber-500" />
                          Danh sách nhân sự chưa phân nhóm (Mặc định thuộc nhóm Khác)
                        </span>
                        <Tag color="orange" className="font-mono m-0">
                          {availablePoolOptions.length} nhân sự
                        </Tag>
                      </div>

                      <Input
                        placeholder="Tìm kiếm nhân sự thuộc nhóm Khác (không dấu)..."
                        prefix={<SearchOutlined className="text-slate-400 text-xs" />}
                        value={poolSearchText}
                        onChange={(e) => setPoolSearchText(e.target.value)}
                        allowClear
                        size="middle"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
                        {availablePoolOptions.length === 0 ? (
                          <div className="col-span-2 text-center py-8 text-slate-400 text-xs">
                            Không tìm thấy nhân sự phù hợp
                          </div>
                        ) : (
                          availablePoolOptions.map((staff) => (
                            <div
                              key={staff.staffId}
                              className={`p-2.5 rounded-lg border flex items-center justify-between ${
                                themeMode === 'dark'
                                  ? 'bg-slate-800/40 border-slate-700/50'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                                  {staff.displayName.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-xs truncate">{staff.displayName}</div>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                    <span className="tabular-nums font-mono">#{staff.staffId}</span>
                                    {staff.username && <span className="truncate">@{staff.username}</span>}
                                  </div>
                                </div>
                              </div>
                              <Tag
                                color="default"
                                className="m-0 text-[10px] text-amber-400 border-amber-500/30 font-mono"
                              >
                                TỰ ĐỘNG
                              </Tag>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 2-Column Side-by-Side Dual List Redesign */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Column 1: Available Staff Pool (Kho Nhân Sự) */}
                    <div
                      className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-3 ${
                        themeMode === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50/60 border-slate-200'
                      }`}
                    >
                      <div className="space-y-2.5">
                        {/* Section Header */}
                        <div className="flex items-center justify-between pb-1 border-b border-slate-700/30">
                          <div className="flex items-center gap-2">
                            <UsergroupAddOutlined className="text-blue-500 text-base" />
                            <span className="font-bold text-sm">Kho Nhân Sự</span>
                            <Tag color="blue" className="m-0 text-[10px] px-1 font-mono">
                              {availablePoolOptions.length}
                            </Tag>
                          </div>
                          {availablePoolOptions.length > 0 && (
                            <Button
                              size="small"
                              type="link"
                              icon={<PlusOutlined />}
                              onClick={handleAddAllFilteredToTeam}
                              className="p-0 text-xs text-blue-400 hover:text-blue-300 font-medium"
                            >
                              Thêm tất cả kết quả
                            </Button>
                          )}
                        </div>

                        {/* Search Bar */}
                        <Input
                          placeholder="Tìm nhân sự (không dấu)..."
                          prefix={<SearchOutlined className="text-slate-400 text-xs" />}
                          value={poolSearchText}
                          onChange={(e) => setPoolSearchText(e.target.value)}
                          allowClear
                          size="middle"
                        />

                        {/* Role Filter Tabs */}
                        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                          <FilterOutlined className="text-slate-400 text-xs mr-1 flex-shrink-0" />
                          {[
                            { label: 'Tất cả', value: 'ALL' },
                            { label: 'CC', value: 'CC' },
                            { label: 'KTV/CV', value: 'CV' },
                            { label: 'Booker', value: 'BK' },
                            { label: 'Khác', value: 'OTHER' },
                          ].map((item) => (
                            <button
                              key={item.value}
                              onClick={() => setRoleFilter(item.value)}
                              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all whitespace-nowrap ${
                                roleFilter === item.value
                                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                  : themeMode === 'dark'
                                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Staff List Scroll Box */}
                      <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
                        {availablePoolOptions.length === 0 ? (
                          <div className="text-center py-10 text-slate-400 text-xs">Không tìm thấy nhân sự phù hợp</div>
                        ) : (
                          availablePoolOptions.map((staff) => {
                            const isAdded = selectedStaffIds.has(staff.staffId);
                            return (
                              <div
                                key={staff.staffId}
                                onClick={() => handleToggleStaff(staff.staffId)}
                                className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all duration-150 ${
                                  isAdded
                                    ? themeMode === 'dark'
                                      ? 'bg-blue-950/30 border-blue-600/40 opacity-80'
                                      : 'bg-blue-50/50 border-blue-200 opacity-80'
                                    : themeMode === 'dark'
                                      ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-blue-500/50'
                                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-blue-300'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold ${
                                      isAdded ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/30 text-slate-300'
                                    }`}
                                  >
                                    {staff.displayName.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-semibold text-xs truncate text-slate-200 dark:text-slate-200">
                                      {staff.displayName}
                                    </div>
                                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                      <span className="tabular-nums font-mono">#{staff.staffId}</span>
                                      {staff.username && <span className="truncate">@{staff.username}</span>}
                                    </div>
                                  </div>
                                </div>

                                {isAdded ? (
                                  <Tag color="success" className="m-0 text-[10px] px-1.5 flex items-center gap-1">
                                    <CheckCircleFilled className="text-[10px]" /> ACTIVE
                                  </Tag>
                                ) : (
                                  <Button
                                    size="small"
                                    type="text"
                                    icon={<PlusOutlined />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddStaff(staff.staffId);
                                    }}
                                    className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/50 px-1.5 h-6"
                                  >
                                    Thêm
                                  </Button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Column 2: Active Team Members (Thành Viên Đội) */}
                    <div
                      className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-3 ${
                        themeMode === 'dark' ? 'bg-blue-950/20 border-blue-900/40' : 'bg-blue-50/30 border-blue-200/60'
                      }`}
                    >
                      <div className="space-y-2.5">
                        {/* Section Header */}
                        <div className="flex items-center justify-between pb-1 border-b border-slate-700/30">
                          <div className="flex items-center gap-2">
                            <CheckCircleOutlined className="text-emerald-500 text-base" />
                            <span className="font-bold text-sm">Thành Viên Đội</span>
                            <Badge
                              count={selectedStaffIds.size}
                              overflowCount={999}
                              style={{ backgroundColor: '#52c41a', fontWeight: 'bold' }}
                            />
                          </div>
                          {selectedStaffIds.size > 0 && (
                            <Button
                              size="small"
                              type="link"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={handleClearAllActive}
                              className="p-0 text-xs font-medium"
                            >
                              Bỏ tất cả
                            </Button>
                          )}
                        </div>

                        {/* Search Bar for Active Members */}
                        <Input
                          placeholder="Tìm trong danh sách đã chọn..."
                          prefix={<SearchOutlined className="text-slate-400 text-xs" />}
                          value={activeSearchText}
                          onChange={(e) => setActiveSearchText(e.target.value)}
                          allowClear
                          size="middle"
                        />
                      </div>

                      {/* Active Staff List Scroll Box */}
                      <div className="space-y-1.5 max-h-[495px] overflow-y-auto pr-1">
                        {activeMembersList.length === 0 ? (
                          <div className="text-center py-12 text-slate-400 text-xs">
                            {selectedStaffIds.size === 0
                              ? 'Chưa có nhân sự nào được thêm vào đội'
                              : 'Không tìm thấy nhân sự phù hợp'}
                          </div>
                        ) : (
                          activeMembersList.map((staff) => (
                            <div
                              key={staff.staffId}
                              className={`p-2.5 rounded-lg border flex items-center justify-between transition-all duration-150 ${
                                themeMode === 'dark'
                                  ? 'bg-slate-800/60 border-blue-600/40 shadow-xs hover:border-blue-500'
                                  : 'bg-white border-blue-200 shadow-xs hover:border-blue-400'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                                  {staff.displayName.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-xs truncate flex items-center gap-1">
                                    <span>{staff.displayName}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                    <span className="tabular-nums font-mono">ID: #{staff.staffId}</span>
                                    {staff.username && <span className="truncate">@{staff.username}</span>}
                                  </div>
                                </div>
                              </div>

                              <Tooltip title="Bỏ khỏi đội">
                                <Button
                                  size="small"
                                  type="text"
                                  danger
                                  icon={<CloseOutlined className="text-xs" />}
                                  onClick={() => handleRemoveStaff(staff.staffId)}
                                  className="h-6 w-6 p-0 flex items-center justify-center rounded-full hover:bg-red-500/20"
                                />
                              </Tooltip>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Save Action */}
                <div className="pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-t border-slate-700/30">
                  <Text type="secondary" className="text-xs">
                    {isAutoGroup ? (
                      <span>
                        * Nhóm <strong className="text-amber-400">{currentTeam.name}</strong> gom tự động tất cả các
                        thành viên chưa phân nhóm, không cần lưu thủ công.
                      </span>
                    ) : (
                      <span>
                        * Các nhân sự được chọn (ACTIVE) sẽ được áp dụng cho tất cả báo cáo và leaderboard của đội{' '}
                        <strong className="text-blue-500">{currentTeam.name}</strong>.
                      </span>
                    )}
                  </Text>
                  {isAutoGroup ? (
                    <Button disabled size="large" className="font-semibold px-6 w-full sm:w-auto opacity-70">
                      Nhóm Tự Động (Không cần lưu)
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      size="large"
                      icon={<SaveOutlined />}
                      onClick={handleSaveMembers}
                      loading={saving}
                      className="bg-blue-600 hover:bg-blue-500 font-semibold px-6 w-full sm:w-auto"
                    >
                      Lưu cấu hình đội ({selectedStaffIds.size})
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <Alert
                message="Vui lòng chọn đội nhóm"
                description="Chọn một đội nhóm ở danh sách bên trái để cấu hình thành viên."
                type="info"
                showIcon
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
