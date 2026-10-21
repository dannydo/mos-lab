'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Button,
  DatePicker,
  Select,
  Progress,
  Tabs,
  message,
} from 'antd';
import {
  Trophy,
  Award,
  Users,
  RotateCw,
  Save,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import {
  TelesaleTier,
  TELESALE_TIER_CONFIG,
  TelesaleSkillKey,
  TelesaleCompetencyEvaluation,
  TelesaleCompetencyMatrixRow,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { StatusTag, StatusType } from '../../../components/ui';
import { TelesaleTeamMatrixTab } from './components/TelesaleTeamMatrixTab';
import { TelesalePillarsDetail } from './components/TelesalePillarsDetail';
import { TelesaleLadderModal } from './components/TelesaleLadderModal';
import { TelesaleActionModal } from './components/TelesaleActionModal';

export default function TelesaleCompetencyPage() {
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs('2026-10'));
  const monthStr = useMemo(() => selectedMonth.format('YYYY-MM'), [selectedMonth]);

  const [loading, setLoading] = useState<boolean>(false);
  const [matrixLoading, setMatrixLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const [teamMatrix, setTeamMatrix] = useState<TelesaleCompetencyMatrixRow[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [evaluation, setEvaluation] = useState<TelesaleCompetencyEvaluation | null>(null);

  // Form local state for Pillar B (9 Skills)
  const [skillRatings, setSkillRatings] = useState<Record<TelesaleSkillKey, { score: number; notes: string }>>({
    KN01: { score: 4, notes: '' },
    KN02: { score: 4, notes: '' },
    KN03: { score: 4, notes: '' },
    KN04: { score: 4, notes: '' },
    KN05: { score: 4, notes: '' },
    KN06: { score: 4, notes: '' },
    KN07: { score: 4, notes: '' },
    KN08: { score: 4, notes: '' },
    KN09: { score: 4, notes: '' },
  });

  // Pillar C state
  const [pillarCScore, setPillarCScore] = useState<number>(18);
  const [pillarCNotes, setPillarCNotes] = useState<string>('');

  // Pillar D state
  const [pillarDScore, setPillarDScore] = useState<number>(14);
  const [evidenceUrl, setEvidenceUrl] = useState<string>('');
  const [evidenceNotes, setEvidenceNotes] = useState<string>('');

  // Modals
  const [isLadderModalOpen, setIsLadderModalOpen] = useState<boolean>(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState<boolean>(false);
  const [actionType, setActionType] = useState<'PROMOTED' | 'DEMOTED'>('PROMOTED');
  const [targetTier, setTargetTier] = useState<TelesaleTier>('JUNIOR');
  const [actionReason, setActionReason] = useState<string>('');

  // Active view tab
  const [activeTab, setActiveTab] = useState<string>('evaluation');

  // Load Team Matrix
  const fetchTeamMatrix = useCallback(async () => {
    setMatrixLoading(true);
    try {
      const data = await apiClient.telesaleCompetency.getTeamMatrix(monthStr);
      setTeamMatrix(data || []);
      if (!selectedStaffId && data && data.length > 0) {
        setSelectedStaffId(data[0].staffId);
      }
    } catch (err: any) {
      message.error(err?.message || 'Không thể tải ma trận năng lực đội ngũ');
    } finally {
      setMatrixLoading(false);
    }
  }, [monthStr, selectedStaffId]);

  // Load Single Staff Evaluation
  const fetchEvaluation = useCallback(async (staffId: number) => {
    setLoading(true);
    try {
      const data = await apiClient.telesaleCompetency.getEvaluation(staffId, monthStr);
      setEvaluation(data);

      if (data.pillarB?.skills) {
        const nextSkills: any = {};
        for (const [k, v] of Object.entries(data.pillarB.skills)) {
          nextSkills[k] = { score: (v as any).score || 4, notes: (v as any).notes || '' };
        }
        setSkillRatings(nextSkills);
      }

      setPillarCScore(data.pillarC?.managerQualityScore !== undefined ? data.pillarC.managerQualityScore : 18);
      setPillarCNotes(data.pillarC?.notes || '');

      setPillarDScore(data.pillarD?.managerAttitudeScore !== undefined ? data.pillarD.managerAttitudeScore : 14);
      setEvidenceUrl(data.pillarD?.mandatoryEvidenceUrl || '');
      setEvidenceNotes(data.pillarD?.evidenceNotes || '');
    } catch (err: any) {
      message.error(err?.message || 'Không thể tải hồ sơ đánh giá của nhân viên');
    } finally {
      setLoading(false);
    }
  }, [monthStr]);

  useEffect(() => {
    fetchTeamMatrix();
  }, [fetchTeamMatrix]);

  useEffect(() => {
    if (selectedStaffId) {
      fetchEvaluation(selectedStaffId);
    }
  }, [selectedStaffId, fetchEvaluation]);

  // Save Evaluation
  const handleSaveEvaluation = async () => {
    if (!selectedStaffId) return;

    if (pillarDScore < 14 && !evidenceUrl.trim() && !evidenceNotes.trim()) {
      message.warning('Trụ cột D (Kỷ luật & Thái độ): Bắt buộc đính kèm Minh chứng (Link ảnh hoặc Ghi chú sự vụ) khi đánh giá dưới 14 điểm!');
      return;
    }

    setSaving(true);
    try {
      await apiClient.telesaleCompetency.saveEvaluation({
        staffId: selectedStaffId,
        month: monthStr,
        pillarB: {
          skills: skillRatings,
        },
        pillarC: {
          managerQualityScore: pillarCScore,
          notes: pillarCNotes,
        },
        pillarD: {
          managerAttitudeScore: pillarDScore,
          mandatoryEvidenceUrl: evidenceUrl,
          evidenceNotes: evidenceNotes,
        },
      });

      message.success('Đã lưu kết quả đánh giá năng lực thành công!');
      await fetchEvaluation(selectedStaffId);
      await fetchTeamMatrix();
    } catch (err: any) {
      message.error(err?.message || 'Lỗi lưu kết quả đánh giá');
    } finally {
      setSaving(false);
    }
  };

  // Execute Action (Thăng Bậc / Giáng Bậc)
  const handleExecuteAction = async () => {
    if (!selectedStaffId) return;
    setSaving(true);
    try {
      const res = await apiClient.telesaleCompetency.executeAction({
        staffId: selectedStaffId,
        action: actionType,
        toTier: targetTier,
        reason: actionReason,
        effectiveMonth: monthStr,
      });

      message.success(res.message || 'Thao tác thăng/giáng bậc thành công!');
      setIsActionModalOpen(false);
      await fetchEvaluation(selectedStaffId);
      await fetchTeamMatrix();
    } catch (err: any) {
      message.error(err?.message || 'Lỗi thực hiện thăng/giáng bậc');
    } finally {
      setSaving(false);
    }
  };

  const openPromotionModal = (nextTier: TelesaleTier) => {
    setActionType('PROMOTED');
    setTargetTier(nextTier);
    setActionReason(`Đạt thâm niên và duy trì điểm chuẩn ${evaluation?.consecutivePassMonths || 2} tháng liên tiếp`);
    setIsActionModalOpen(true);
  };

  const openDemotionModal = (demoteTier: TelesaleTier) => {
    setActionType('DEMOTED');
    setTargetTier(demoteTier);
    setActionReason(`Không đạt điểm chuẩn cấp bậc hiện tại trong ${evaluation?.consecutiveFailMonths || 2} tháng liên tiếp`);
    setIsActionModalOpen(true);
  };

  const currentTierConfig = evaluation ? TELESALE_TIER_CONFIG[evaluation.currentTier] : TELESALE_TIER_CONFIG.JUNIOR;
  const currentTierStatus: StatusType =
    evaluation?.currentTier === 'SENIOR'
      ? 'purple'
      : evaluation?.currentTier === 'MID_LEVEL'
      ? 'gold'
      : evaluation?.currentTier === 'JUNIOR'
      ? 'cyan'
      : 'default';

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-600/10 via-rose-600/10 to-indigo-600/10 p-5 rounded-2xl border border-amber-500/20 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center justify-center p-2 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
              <Trophy className="w-5 h-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
              Khung Năng Lực Telesale / Booking
            </h1>
            <StatusTag status="warning" label="WINGS LASHES" />
          </div>
          <p className="text-xs md:text-sm text-slate-600 dark:text-zinc-400">
            Hệ thống 4 trụ cột đánh giá toàn diện, tự động tính KPI và Rule Engine theo dõi thăng/giáng bậc tự động.
          </p>
        </div>

        {/* Month Picker & Staff Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <DatePicker
            picker="month"
            value={selectedMonth}
            onChange={(d) => d && setSelectedMonth(d)}
            allowClear={false}
            className="w-32 rounded-lg"
          />

          <Select
            value={selectedStaffId || undefined}
            onChange={(val) => setSelectedStaffId(val)}
            loading={matrixLoading}
            className="w-48"
            placeholder="Chọn tư vấn viên"
            options={teamMatrix.map((item) => ({
              value: item.staffId,
              label: `${item.staffName} (${item.currentTier})`,
            }))}
          />

          <Button
            icon={<RotateCw className="w-3.5 h-3.5" />}
            onClick={() => {
              if (selectedStaffId) fetchEvaluation(selectedStaffId);
              fetchTeamMatrix();
            }}
            loading={loading || matrixLoading}
          >
            Làm mới
          </Button>

          <Button
            type="primary"
            icon={<BookOpen className="w-3.5 h-3.5" />}
            onClick={() => setIsLadderModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Quy Chuẩn Thăng Bậc
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        items={[
          {
            key: 'evaluation',
            label: (
              <span className="flex items-center gap-1.5 font-medium">
                <Award className="w-4 h-4 text-amber-500" />
                Hồ Sơ Đánh Giá Cá Nhân
              </span>
            ),
          },
          {
            key: 'team-matrix',
            label: (
              <span className="flex items-center gap-1.5 font-medium">
                <Users className="w-4 h-4 text-indigo-500" />
                Ma Trận Năng Lực Toàn Đội ({teamMatrix.length})
              </span>
            ),
          },
        ]}
      />

      {activeTab === 'team-matrix' ? (
        <TelesaleTeamMatrixTab
          teamMatrix={teamMatrix}
          loading={matrixLoading}
          onSelectStaff={(staffId) => {
            setSelectedStaffId(staffId);
            setActiveTab('evaluation');
          }}
        />
      ) : evaluation ? (
        <div className="space-y-6">
          {/* Profile & Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs md:col-span-1 bg-white dark:bg-zinc-950">
              <div className="flex flex-col items-center text-center p-2">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center font-bold text-xl shadow-lg mb-3">
                  {evaluation.staffName?.charAt(0) || 'T'}
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100">{evaluation.staffName}</h2>
                <div className="text-xs text-slate-500 dark:text-zinc-400 mb-2">ID: #{evaluation.staffId}</div>

                <StatusTag status={currentTierStatus} label={currentTierConfig.label} />

                <div className="w-full text-xs text-slate-600 dark:text-zinc-400 space-y-1.5 pt-3 border-t border-slate-100 dark:border-zinc-800 text-left mt-3">
                  <div className="flex justify-between">
                    <span>Thâm niên:</span>
                    <span className="font-semibold tabular-nums">{evaluation.tenureMonths} tháng</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Điểm chuẩn bậc:</span>
                    <span className="font-semibold tabular-nums">{evaluation.passingScore} điểm</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Chuỗi đạt chuẩn:</span>
                    <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {evaluation.consecutivePassMonths} tháng liên tiếp
                    </span>
                  </div>
                  {evaluation.consecutiveFailMonths > 0 && (
                    <div className="flex justify-between text-rose-500">
                      <span>Chuỗi trượt chuẩn:</span>
                      <span className="font-semibold tabular-nums">
                        {evaluation.consecutiveFailMonths} tháng liên tiếp
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card className="rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs md:col-span-3 bg-white dark:bg-zinc-950">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="text-xs text-slate-500 dark:text-zinc-400 font-medium uppercase tracking-wider">
                    Tổng Điểm Năng Lực Tháng {monthStr}
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl font-extrabold text-slate-900 dark:text-zinc-100 tabular-nums">
                      {evaluation.totalScore}
                    </span>
                    <span className="text-sm text-slate-400 dark:text-zinc-500 font-medium">/ 100 điểm</span>
                    <StatusTag
                      status={evaluation.isPassed ? 'success' : 'error'}
                      label={evaluation.isPassed ? `ĐẠT CHUẨN (≥ ${evaluation.passingScore}đ)` : `TRƯỢT CHUẨN (< ${evaluation.passingScore}đ)`}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {evaluation.ruleEngineStatus === 'PROMOTION_READY' && evaluation.recommendedTier && (
                    <Button
                      type="primary"
                      icon={<ArrowUpRight className="w-4 h-4" />}
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => openPromotionModal(evaluation.recommendedTier!)}
                    >
                      Phê Duyệt Thăng Bậc ({TELESALE_TIER_CONFIG[evaluation.recommendedTier].label})
                    </Button>
                  )}

                  {evaluation.ruleEngineStatus === 'DEMOTION_FLAGGED' && evaluation.recommendedTier && (
                    <Button
                      danger
                      icon={<ArrowDownRight className="w-4 h-4" />}
                      onClick={() => openDemotionModal(evaluation.recommendedTier!)}
                    >
                      Xem Xét Giáng Bậc ({TELESALE_TIER_CONFIG[evaluation.recommendedTier].label})
                    </Button>
                  )}

                  <Button
                    type="primary"
                    icon={<Save className="w-4 h-4" />}
                    onClick={handleSaveEvaluation}
                    loading={saving}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    Lưu Đánh Giá
                  </Button>
                </div>
              </div>

              <div className="mb-4">
                <Progress
                  percent={Math.min(100, Math.round(evaluation.totalScore))}
                  status={evaluation.isPassed ? 'active' : 'exception'}
                  strokeWidth={10}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
                  <div className="text-[11px] text-blue-700 dark:text-blue-300 font-semibold">A. Hiệu suất (40%)</div>
                  <div className="text-xl font-bold text-blue-900 dark:text-blue-100 tabular-nums mt-0.5">
                    {evaluation.pillarA?.cappedScore || 0}
                    <span className="text-xs text-blue-500 font-normal"> /40đ</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">Hệ thống tự động tính</div>
                </div>

                <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40">
                  <div className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold">B. 9 Kỹ năng (25%)</div>
                  <div className="text-xl font-bold text-purple-900 dark:text-purple-100 tabular-nums mt-0.5">
                    {evaluation.pillarB?.totalScore || 0}
                    <span className="text-xs text-purple-500 font-normal"> /25đ</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">TB: {evaluation.pillarB?.averageSkillScore || 0}/5 sao</div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">C. Chất lượng (20%)</div>
                  <div className="text-xl font-bold text-emerald-900 dark:text-emerald-100 tabular-nums mt-0.5">
                    {evaluation.pillarC?.totalScore || 0}
                    <span className="text-xs text-emerald-500 font-normal"> /20đ</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">Kiểm toán lỗi CRM & gọi</div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                  <div className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">D. Thái độ (15%)</div>
                  <div className="text-xl font-bold text-amber-900 dark:text-amber-100 tabular-nums mt-0.5">
                    {evaluation.pillarD?.totalScore || 0}
                    <span className="text-xs text-amber-500 font-normal"> /15đ</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">Kỷ luật & minh chứng</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Pillars Detail Component */}
          <TelesalePillarsDetail
            evaluation={evaluation}
            skillRatings={skillRatings}
            onSkillChange={(key, score, notes) => {
              setSkillRatings((prev) => ({
                ...prev,
                [key]: { score, notes: notes !== undefined ? notes : prev[key]?.notes || '' },
              }));
            }}
            pillarCScore={pillarCScore}
            onPillarCScoreChange={setPillarCScore}
            pillarCNotes={pillarCNotes}
            onPillarCNotesChange={setPillarCNotes}
            pillarDScore={pillarDScore}
            onPillarDScoreChange={setPillarDScore}
            evidenceUrl={evidenceUrl}
            onEvidenceUrlChange={setEvidenceUrl}
            evidenceNotes={evidenceNotes}
            onEvidenceNotesChange={setEvidenceNotes}
          />
        </div>
      ) : (
        <Card className="rounded-2xl text-center py-12">
          <p className="text-slate-500 dark:text-zinc-400">Đang tải dữ liệu hoặc chưa chọn tư vấn viên...</p>
        </Card>
      )}

      {/* Ladder Guide Modal */}
      <TelesaleLadderModal
        open={isLadderModalOpen}
        onClose={() => setIsLadderModalOpen(false)}
      />

      {/* Action Approval Modal */}
      <TelesaleActionModal
        open={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        onConfirm={handleExecuteAction}
        actionType={actionType}
        targetTier={targetTier}
        onTargetTierChange={setTargetTier}
        actionReason={actionReason}
        onActionReasonChange={setActionReason}
        staffName={evaluation?.staffName}
        currentTier={evaluation?.currentTier}
        saving={saving}
      />
    </div>
  );
}
