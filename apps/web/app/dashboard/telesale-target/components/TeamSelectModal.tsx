'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Select, Button, message, Avatar } from 'antd';
import { Users, CheckCircle2, ShieldCheck, UserCheck, AlertCircle, Loader2 } from 'lucide-react';
import { TelesaleTargetOverview, Team, Department } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { AdaptiveModal } from '../../../../components/ui';

interface TeamSelectModalProps {
  open: boolean;
  onClose: () => void;
  currentMonth: string;
  overview: TelesaleTargetOverview | null;
  onSuccess: () => void | Promise<void>;
}

export const TeamSelectModal: React.FC<TeamSelectModalProps> = ({
  open,
  onClose,
  currentMonth,
  overview,
  onSuccess,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedTeamCode, setSelectedTeamCode] = useState<string>('BK_TELESALES');

  // Flatten teams tree to easy list
  const flatTeams = useMemo(() => {
    const list: Team[] = [];
    const traverse = (items: Team[]) => {
      items.forEach((item) => {
        list.push(item);
        if (item.children && item.children.length > 0) {
          traverse(item.children);
        }
      });
    };
    traverse(teams);
    return list;
  }, [teams]);

  // Load teams when modal opens
  useEffect(() => {
    if (open) {
      const initialCode = overview?.teamCode || 'BK_TELESALES';
      setSelectedTeamCode(initialCode);
      setLoading(true);

      apiClient.teams
        .list()
        .then((res) => {
          if (res) {
            setTeams(res.teams || []);
            setDepartments(res.departments || []);
          }
        })
        .catch((err) => {
          message.error('Không thể tải danh sách Đội nhóm: ' + (err?.message || 'Lỗi kết nối'));
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, overview?.teamCode]);

  const selectedTeam = useMemo(() => {
    return flatTeams.find((t) => t.code === selectedTeamCode);
  }, [flatTeams, selectedTeamCode]);

  const handleConfirm = async () => {
    if (!selectedTeamCode) {
      message.error('Vui lòng chọn 1 Đội nhóm');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.telesaleTarget.selectTeam({
        month: currentMonth,
        teamCode: selectedTeamCode,
      });

      const teamDisplayName = selectedTeam?.name || selectedTeamCode;
      message.success(`Đã áp dụng Đội nhóm "${teamDisplayName}" cho War Room Tháng ${currentMonth}!`);
      onClose();
      await onSuccess();
    } catch (err: unknown) {
      const errMsg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as { message?: string })?.message ||
        'Không thể lưu lựa chọn Đội nhóm';
      message.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const [yearStr, monthNumStr] = currentMonth.split('-');

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2.5 text-zinc-100">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-base leading-tight">Chọn Đội Nhóm Áp Dụng Cho War Room</div>
            <div className="text-[11px] text-zinc-400 font-normal">
              Tháng {monthNumStr}/{yearStr} · Nguồn nhân sự chuẩn từ Cấu trúc Phòng ban & Đội nhóm
            </div>
          </div>
        </div>
      }
      width={580}
      footer={[
        <Button
          key="cancel"
          onClick={onClose}
          className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 rounded-xl"
        >
          Đóng
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          onClick={handleConfirm}
          className="border-0 bg-amber-500 hover:bg-amber-400 font-semibold text-black rounded-xl shadow-lg shadow-amber-500/20"
        >
          Áp dụng cho War Room
        </Button>,
      ]}
    >
      <div className="space-y-4 py-2">
        {/* Requirement Canon Alert */}
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-zinc-900 to-amber-950/20 p-3.5 text-xs text-zinc-300">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-300 m-0">Nguyên tắc nguồn nhân sự War Room:</p>
              <p className="text-zinc-400 m-0 leading-relaxed">
                Sau khi chọn, War Room lấy toàn bộ thành viên hiện tại của Team (không phụ thuộc Role cá nhân). Áp dụng
                đồng bộ cho: <strong className="text-zinc-200">KPI cá nhân</strong>,{' '}
                <strong className="text-zinc-200">Call / Pickup</strong>,{' '}
                <strong className="text-zinc-200">Book / Done</strong>,{' '}
                <strong className="text-zinc-200">TV Monitor</strong> và{' '}
                <strong className="text-zinc-200">Đóng góp cá nhân</strong>.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-amber-400 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            <span className="text-xs text-zinc-400">Đang tải danh sách Đội nhóm từ hệ thống...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Chọn Đội nhóm (Team có sẵn trong hệ thống):
              </label>
              <Select
                value={selectedTeamCode}
                onChange={(val) => setSelectedTeamCode(val)}
                className="w-full !rounded-xl"
                size="large"
                options={flatTeams.map((team) => ({
                  value: team.code,
                  label: (
                    <div className="flex items-center justify-between py-0.5">
                      <span className="font-medium text-zinc-100 flex items-center gap-2">
                        <span>{team.name}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {team.code}
                        </span>
                      </span>
                      <span className="text-xs text-zinc-400">
                        {(team.memberCount ?? 0) > 0 ? `${team.memberCount} thành viên` : 'Chưa có thành viên'}
                      </span>
                    </div>
                  ),
                }))}
              />
            </div>

            {/* Selected Team Overview Card */}
            {selectedTeam && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-sm text-zinc-100">{selectedTeam.name}</span>
                    <span className="text-xs font-mono text-zinc-400">({selectedTeam.code})</span>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {selectedTeam.memberCount ?? 0} thành viên
                  </span>
                </div>

                {selectedTeam.description && (
                  <p className="text-xs text-zinc-400 m-0">{selectedTeam.description}</p>
                )}

                {selectedTeam.department && (
                  <div className="text-xs text-zinc-400 flex items-center gap-1.5">
                    <span>Phòng ban:</span>
                    <span className="font-medium text-zinc-200">{selectedTeam.department.name}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-zinc-800/80">
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Thành viên đang áp dụng trong Team:
                  </div>

                  {selectedTeam.activeStaffIds && selectedTeam.activeStaffIds.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedTeam.activeStaffIds.map((staffId) => (
                        <div
                          key={staffId}
                          className="flex items-center gap-1.5 bg-black/40 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-300"
                        >
                          <Avatar size={20} className="bg-amber-600 text-zinc-950 font-bold text-[10px]">
                            {String(staffId).slice(-2)}
                          </Avatar>
                          <span className="font-mono text-[11px]">ID {staffId}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-amber-400/80 italic flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Team hiện chưa có thành viên gán trong Cấu trúc Phòng ban & Đội nhóm.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdaptiveModal>
  );
};
