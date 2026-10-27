'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Radio,
  Select,
  Tabs,
  Tooltip,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  FileText,
  Sparkles,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Save,
  Check,
  UserCheck,
  Award,
  Image as ImageIcon,
  Info,
  HelpCircle,
} from 'lucide-react';
import type {
  PilotMaterial,
  PilotMaterialSopDocument,
  PilotSolutionNormItem,
  PilotGlueRodStandardItem,
  PilotSanitizationItem,
  SavePilotMaterialSopRequest,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { AppIcon } from '../../../../components/ui/AppIcon';
import { AdaptiveModal } from '../../../../components/ui/AdaptiveOverlay';
import { DataTable } from '../../../../components/ui/DataTable';
import { StatusTag } from '../../../../components/ui/StatusTag';

const { TextArea } = Input;

function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

interface PilotMaterialSopModalProps {
  open: boolean;
  onClose: () => void;
  materialsCatalog?: PilotMaterial[];
  onRefreshMaterials?: () => void;
}

export function PilotMaterialSopModal({
  open,
  onClose,
  materialsCatalog = [],
  onRefreshMaterials,
}: PilotMaterialSopModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [activeTab, setActiveTab] = useState<'solutions' | 'glue-rods' | 'sanitization' | 'draft'>('solutions');
  const [doc, setDoc] = useState<PilotMaterialSopDocument | null>(null);

  // Sub-modal states
  const [normEditModalOpen, setNormEditModalOpen] = useState(false);
  const [editingNorm, setEditingNorm] = useState<PilotSolutionNormItem | null>(null);
  const [normForm] = Form.useForm();

  const [glueRodModalOpen, setGlueRodModalOpen] = useState(false);
  const [editingGlueRod, setEditingGlueRod] = useState<PilotGlueRodStandardItem | null>(null);
  const [glueRodForm] = Form.useForm();

  const [sanitModalOpen, setSanitModalOpen] = useState(false);
  const [editingSanit, setEditingSanit] = useState<PilotSanitizationItem | null>(null);
  const [sanitForm] = Form.useForm();

  const [endorseModalOpen, setEndorseModalOpen] = useState(false);
  const [endorseForm] = Form.useForm();

  // Fetch document
  const fetchDoc = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.pilot.getMaterialSop({ pilotCode: 'DARK_LASHES' });
      setDoc(res);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể tải tài liệu SOP Hạng mục 3.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchDoc();
    }
  }, [open, fetchDoc]);

  // Handle Save Full Draft
  const handleSaveDraft = async () => {
    if (!doc) return;
    try {
      setSaving(true);
      const payload: SavePilotMaterialSopRequest = {
        pilotCode: doc.pilotCode,
        overallStatus: doc.overallStatus,
        isPublished: doc.isPublished,
        expertReviewer: doc.expertReviewer,
        projectOwner: doc.projectOwner,
        approvalNote: doc.approvalNote,
        solutionNorms: doc.solutionNorms,
        glueRodStandards: doc.glueRodStandards,
        sanitizationProcedures: doc.sanitizationProcedures,
      };
      const updated = await apiClient.pilot.saveMaterialSop(payload);
      setDoc(updated);
      message.success('Đã lưu bản dự thảo SOP Hạng mục 3 thành công!');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi khi lưu dự thảo.');
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // Phần 1: Xử lý Định mức Thuốc & Dung dịch
  // ═══════════════════════════════════════════════════════════

  const handleOpenEditNorm = (norm: PilotSolutionNormItem) => {
    setEditingNorm(norm);
    normForm.resetFields();
    normForm.setFieldsValue({
      materialName: norm.materialName,
      materialId: norm.materialId,
      unit: norm.unit,
      costPerUnit: norm.costPerUnit,
      standardDosagePerSession: norm.standardDosagePerSession,
      usageInstructions: norm.usageInstructions,
      technicalNotes: norm.technicalNotes,
      status: norm.status,
    });
    setNormEditModalOpen(true);
  };

  const handleOpenAddNorm = () => {
    setEditingNorm(null);
    normForm.resetFields();
    normForm.setFieldsValue({
      unit: 'ml',
      costPerUnit: 30000,
      standardDosagePerSession: 0.8,
      status: 'PENDING_REVIEW',
    });
    setNormEditModalOpen(true);
  };

  const handleSaveNorm = async () => {
    try {
      const values = await normForm.validateFields();
      if (!doc) return;

      const costPerUnit = Number(values.costPerUnit || 0);
      const standardDosage = Number(values.standardDosagePerSession || 0);
      const costPerSession = Math.round(costPerUnit * standardDosage);

      let updatedNorms: PilotSolutionNormItem[];

      if (editingNorm) {
        updatedNorms = doc.solutionNorms.map((n) =>
          n.id === editingNorm.id
            ? {
                ...n,
                ...values,
                costPerUnit,
                standardDosagePerSession: standardDosage,
                costPerSession,
              }
            : n
        );
      } else {
        const newNorm: PilotSolutionNormItem = {
          id: `norm-${Date.now()}`,
          materialId: values.materialId || null,
          materialName: values.materialName,
          unit: values.unit,
          costPerUnit,
          standardDosagePerSession: standardDosage,
          costPerSession,
          usageInstructions: values.usageInstructions || '',
          technicalNotes: values.technicalNotes || '',
          status: 'PENDING_REVIEW',
          verifiedBy: null,
          verifiedAt: null,
        };
        updatedNorms = [...doc.solutionNorms, newNorm];
      }

      const updated = await apiClient.pilot.saveMaterialSop({
        solutionNorms: updatedNorms,
      });
      setDoc(updated);
      setNormEditModalOpen(false);
      message.success('Đã cập nhật định mức thuốc uốn & dung dịch!');
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Lỗi khi lưu định mức.');
    }
  };

  const handleDeleteNorm = async (id: string) => {
    if (!doc) return;
    try {
      const updatedNorms = doc.solutionNorms.filter((n) => n.id !== id);
      const updated = await apiClient.pilot.saveMaterialSop({
        solutionNorms: updatedNorms,
      });
      setDoc(updated);
      message.success('Đã xóa định mức khỏi danh mục.');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể xóa định mức.');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // Phần 2: Xử lý Quy chuẩn Keo định hình & Trục silicon
  // ═══════════════════════════════════════════════════════════

  const handleOpenEditGlueRod = (item: PilotGlueRodStandardItem) => {
    setEditingGlueRod(item);
    glueRodForm.resetFields();
    glueRodForm.setFieldsValue({
      category: item.category,
      title: item.title,
      materialRef: item.materialRef,
      selectionCriteria: item.selectionCriteria,
      standardOperation: item.standardOperation,
      technicalNotes: item.technicalNotes,
      commonMistakesToAvoid: item.commonMistakesToAvoid,
      illustrationImageUrl: item.illustrationImageUrl,
      status: item.status,
    });
    setGlueRodModalOpen(true);
  };

  const handleOpenAddGlueRod = () => {
    setEditingGlueRod(null);
    glueRodForm.resetFields();
    glueRodForm.setFieldsValue({
      category: 'SILICON_ROD',
      status: 'PENDING_REVIEW',
    });
    setGlueRodModalOpen(true);
  };

  const handleSaveGlueRod = async () => {
    try {
      const values = await glueRodForm.validateFields();
      if (!doc) return;

      let updatedList: PilotGlueRodStandardItem[];
      if (editingGlueRod) {
        updatedList = doc.glueRodStandards.map((g) =>
          g.id === editingGlueRod.id ? { ...g, ...values } : g
        );
      } else {
        const newItem: PilotGlueRodStandardItem = {
          id: `std-${Date.now()}`,
          category: values.category,
          title: values.title,
          materialRef: values.materialRef || '',
          selectionCriteria: values.selectionCriteria || '',
          standardOperation: values.standardOperation || '',
          technicalNotes: values.technicalNotes || '',
          commonMistakesToAvoid: values.commonMistakesToAvoid || '',
          illustrationImageUrl: values.illustrationImageUrl || null,
          status: 'PENDING_REVIEW',
          verifiedBy: null,
          verifiedAt: null,
        };
        updatedList = [...doc.glueRodStandards, newItem];
      }

      const updated = await apiClient.pilot.saveMaterialSop({
        glueRodStandards: updatedList,
      });
      setDoc(updated);
      setGlueRodModalOpen(false);
      message.success('Đã lưu quy chuẩn keo & trục silicon!');
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Lỗi khi lưu quy chuẩn.');
    }
  };

  const handleDeleteGlueRod = async (id: string) => {
    if (!doc) return;
    try {
      const updatedList = doc.glueRodStandards.filter((g) => g.id !== id);
      const updated = await apiClient.pilot.saveMaterialSop({
        glueRodStandards: updatedList,
      });
      setDoc(updated);
      message.success('Đã xóa quy chuẩn.');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể xóa quy chuẩn.');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // Phần 3: Xử lý Quy trình Khử khuẩn & Vệ sinh dụng cụ
  // ═══════════════════════════════════════════════════════════

  const handleOpenEditSanit = (item: PilotSanitizationItem) => {
    setEditingSanit(item);
    sanitForm.resetFields();
    sanitForm.setFieldsValue({
      toolName: item.toolName,
      classification: item.classification,
      procedure: item.procedure,
      criticalSafetyPoint: item.criticalSafetyPoint,
      checklistStepsText: (item.checklistSteps || []).join('\n'),
      status: item.status,
    });
    setSanitModalOpen(true);
  };

  const handleOpenAddSanit = () => {
    setEditingSanit(null);
    sanitForm.resetFields();
    sanitForm.setFieldsValue({
      classification: 'REUSABLE',
      status: 'PENDING_REVIEW',
      checklistStepsText: 'Bước 1: Rửa xà phòng\nBước 2: Ngâm cồn 70° đủ 15p\nBước 3: Tiệt trùng UV\nBước 4: Bảo quản kín',
    });
    setSanitModalOpen(true);
  };

  const handleSaveSanit = async () => {
    try {
      const values = await sanitForm.validateFields();
      if (!doc) return;

      const checklistSteps = (values.checklistStepsText || '')
        .split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean);

      let updatedList: PilotSanitizationItem[];
      if (editingSanit) {
        updatedList = doc.sanitizationProcedures.map((p) =>
          p.id === editingSanit.id
            ? {
                ...p,
                toolName: values.toolName,
                classification: values.classification,
                procedure: values.procedure,
                criticalSafetyPoint: values.criticalSafetyPoint,
                checklistSteps,
              }
            : p
        );
      } else {
        const newItem: PilotSanitizationItem = {
          id: `sanit-${Date.now()}`,
          toolName: values.toolName,
          classification: values.classification,
          procedure: values.procedure || '',
          criticalSafetyPoint: values.criticalSafetyPoint || '',
          checklistSteps,
          status: 'PENDING_REVIEW',
          verifiedBy: null,
          verifiedAt: null,
        };
        updatedList = [...doc.sanitizationProcedures, newItem];
      }

      const updated = await apiClient.pilot.saveMaterialSop({
        sanitizationProcedures: updatedList,
      });
      setDoc(updated);
      setSanitModalOpen(false);
      message.success('Đã lưu quy trình vệ sinh & khử khuẩn!');
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Lỗi khi lưu quy trình khử khuẩn.');
    }
  };

  const handleDeleteSanit = async (id: string) => {
    if (!doc) return;
    try {
      const updatedList = doc.sanitizationProcedures.filter((p) => p.id !== id);
      const updated = await apiClient.pilot.saveMaterialSop({
        sanitizationProcedures: updatedList,
      });
      setDoc(updated);
      message.success('Đã xóa quy trình.');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể xóa quy trình.');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // Phần 4: Thẩm định chuyên môn & Trình duyệt Scale
  // ═══════════════════════════════════════════════════════════

  const handleOpenEndorse = () => {
    endorseForm.resetFields();
    endorseForm.setFieldsValue({
      reviewerName: doc?.expertReviewer || 'Cô Giang Đàm',
      note: 'Tôi đã rà soát và xác nhận toàn bộ định mức thuốc uốn, quy chuẩn keo/trục và checklist khử khuẩn đáp ứng tiêu chuẩn an toàn y tế và kỹ thuật uốn mi bóng tối.',
    });
    setEndorseModalOpen(true);
  };

  const handleConfirmEndorse = async () => {
    try {
      setReviewing(true);
      const values = await endorseForm.validateFields();
      const updated = await apiClient.pilot.reviewMaterialSop({
        decision: 'EXPERT_ENDORSE',
        reviewerName: values.reviewerName,
        note: values.note,
      });
      setDoc(updated);
      setEndorseModalOpen(false);
      message.success('Cô Giang Đàm đã xác nhận thẩm định chuyên môn thành công!');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi khi xác nhận thẩm định.');
    } finally {
      setReviewing(false);
    }
  };

  // Columns for Part 1: Solution Norms
  const solutionColumns: ColumnsType<PilotSolutionNormItem> = [
    {
      title: 'Tên vật tư / Dung dịch',
      key: 'name',
      render: (_, r) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <AppIcon icon={Sparkles} size="sm" className="text-emerald-500" />
            <span>{r.materialName}</span>
          </div>
          {r.usageInstructions && (
            <div className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
              📖 {r.usageInstructions}
            </div>
          )}
          {r.technicalNotes && (
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              ⚠️ {r.technicalNotes}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Đơn vị tính',
      dataIndex: 'unit',
      key: 'unit',
      width: 90,
      align: 'center',
      render: (val: string) => <StatusTag status="cyan" label={val} />,
    },
    {
      title: 'Đơn giá gốc',
      dataIndex: 'costPerUnit',
      key: 'costPerUnit',
      width: 120,
      align: 'right',
      render: (val: number, r) => (
        <div className="text-right">
          <span className="tabular-nums font-medium text-xs">{formatVND(val)}</span>
          <span className="text-[10px] text-slate-400 block">/{r.unit}</span>
        </div>
      ),
    },
    {
      title: 'Định lượng / Ca',
      dataIndex: 'standardDosagePerSession',
      key: 'standardDosagePerSession',
      width: 120,
      align: 'center',
      render: (val: number, r) => (
        <span className="tabular-nums font-bold text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-500/20">
          {val} {r.unit}
        </span>
      ),
    },
    {
      title: 'Chi phí định mức / Ca',
      dataIndex: 'costPerSession',
      key: 'costPerSession',
      width: 150,
      align: 'right',
      render: (val: number) => (
        <div className="flex flex-col items-end">
          <span className="tabular-nums font-bold text-sm text-emerald-600 dark:text-emerald-400">
            {formatVND(val)}
          </span>
          <span className="text-[10px] text-slate-400">tự động tính</span>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      align: 'center',
      render: (status: string, r) =>
        status === 'VERIFIED' ? (
          <Tooltip title={`Đã thẩm định bởi ${r.verifiedBy || 'Cô Giang Đàm'}`}>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <AppIcon icon={CheckCircle2} size={12} /> Đã thẩm định
            </span>
          </Tooltip>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <AppIcon icon={Clock} size={12} /> Chờ thẩm định
          </span>
        ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 90,
      align: 'center',
      render: (_, r) => (
        <div className="flex items-center justify-center gap-1">
          <Tooltip title="Chỉnh sửa định lượng & ghi chú">
            <Button
              type="text"
              size="small"
              icon={<AppIcon icon={Edit2} size="sm" />}
              onClick={() => handleOpenEditNorm(r)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa định mức này?"
            description="Bạn có chắc chắn muốn xóa thuốc/dung dịch này khỏi định mức ca?"
            onConfirm={() => handleDeleteNorm(r.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger icon={<AppIcon icon={Trash2} size="sm" />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <AdaptiveModal
        intent="detail"
        open={open}
        onCancel={onClose}
        width={1040}
        footer={[
          <Button key="close" onClick={onClose} className="rounded-xl">
            Đóng
          </Button>,
          <Button
            key="save"
            icon={<AppIcon icon={Save} size="sm" />}
            loading={saving}
            onClick={handleSaveDraft}
            className="rounded-xl border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
          >
            Lưu dự thảo
          </Button>,
          doc?.overallStatus !== 'REVIEWED_BY_EXPERT' && (
            <Button
              key="endorse"
              type="primary"
              icon={<AppIcon icon={UserCheck} size="sm" />}
              onClick={handleOpenEndorse}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-sm"
            >
              Cô Giang Đàm Thẩm Định
            </Button>
          ),
        ]}
        title={
          <div className="flex items-center justify-between pr-8 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <AppIcon icon={FileText} size={20} />
              </div>
              <div>
                <div className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Hạng Mục 3 – Định Mức &amp; Kiểm Soát Vật Tư Tiêu Hao</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                    SOP &amp; Đào tạo KTV
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Chuẩn hóa định mức thuốc uốn, quy chuẩn keo &amp; trục silicon, quy trình khử khuẩn trình CEO phê duyệt Scale
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {doc?.overallStatus === 'REVIEWED_BY_EXPERT' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  <AppIcon icon={CheckCircle2} size={14} className="text-emerald-600" />
                  Đã thẩm định chuyên môn (Cô Giang Đàm)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  <AppIcon icon={Clock} size={14} className="text-amber-600" />
                  Bản dự thảo · Chờ thẩm định
                </span>
              )}
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                {doc?.isPublished ? 'Đã ban hành' : 'Chưa ban hành Scale'}
              </span>
            </div>
          </div>
        }
      >
        <div className="space-y-4 pt-1">
          {/* Top Quick Stats Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card variant="outlined" className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Tổng Chi Phí Định Mức / Ca
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatVND(doc?.summary.totalNormCostPerSession || 0)}
                </span>
                <span className="text-xs text-slate-400">/ca</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Tiết kiệm tối ưu từ 4 loại dung dịch chuẩn
              </span>
            </Card>

            <Card variant="outlined" className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Chuyên Môn Thẩm Định
              </span>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {doc?.expertReviewer || 'Cô Giang Đàm'}
                </span>
              </div>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium mt-1 block">
                Lead Technical &amp; Master Trainer
              </span>
            </Card>

            <Card variant="outlined" className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Tiến Độ Thẩm Định
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-slate-100">
                  {doc?.summary.verifiedCount || 0} / {doc?.summary.totalItemsCount || 0}
                </span>
                <span className="text-xs font-semibold text-emerald-600">
                  {doc?.summary.totalItemsCount ? Math.round(((doc.summary.verifiedCount || 0) / doc.summary.totalItemsCount) * 100) : 0}%
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {doc?.summary.pendingReviewCount || 0} hạng mục đang chờ duyệt
              </span>
            </Card>

            <Card variant="outlined" className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Quy Chế Scale
              </span>
              <div className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                Trình CEO phê duyệt
              </div>
              <span className="text-[10px] text-rose-500 dark:text-rose-400 font-medium mt-1 block">
                ⚠️ Không tự ý ban hành khi chưa duyệt
              </span>
            </Card>
          </div>

          {/* Navigation Tabs 3 Phần + Bản Dự Thảo */}
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as any)}
            className="sop-material-tabs"
            items={[
              {
                key: 'solutions',
                label: (
                  <span className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm" data-testid="sop-tab-solutions">
                    <AppIcon icon={Sparkles} size={15} />
                    <span>Phần 1 – Định Mức Thuốc &amp; Dung Dịch</span>
                  </span>
                ),
                children: (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex-wrap">
                      <div className="flex items-center gap-2">
                        <AppIcon icon={Info} size={16} className="text-emerald-600 shrink-0" />
                        <span>
                          <strong>Nguyên tắc:</strong> Đơn giá lấy trực tiếp từ danh mục vật tư hiện tại. Cô Giang Đàm
                          nhập định lượng tiêu chuẩn mỗi ca để hệ thống tự động tính chi phí và đóng gói giáo trình kỹ thuật.
                        </span>
                      </div>
                      <Button
                        type="primary"
                        size="small"
                        icon={<AppIcon icon={Plus} size="sm" />}
                        onClick={handleOpenAddNorm}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shrink-0 shadow-sm"
                      >
                        Thêm định mức dung dịch
                      </Button>
                    </div>

                    <DataTable<PilotSolutionNormItem>
                      columns={solutionColumns}
                      dataSource={doc?.solutionNorms || []}
                      rowKey="id"
                      pagination={false}
                      loading={loading}
                      size="middle"
                      className="border rounded-xl border-slate-200 dark:border-slate-800"
                    />
                  </div>
                ),
              },
              {
                key: 'glue-rods',
                label: (
                  <span className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm" data-testid="sop-tab-glue-rods">
                    <AppIcon icon={Layers} size={15} />
                    <span>Phần 2 – Quy Chuẩn Keo &amp; Trục Silicon</span>
                  </span>
                ),
                children: (
                  <div className="space-y-3.5 pt-2">
                    <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300 flex-wrap">
                      <div className="flex items-center gap-2">
                        <AppIcon icon={Info} size={16} className="text-blue-600 shrink-0" />
                        <span>
                          Hướng dẫn lựa chọn loại trục silicon và keo uốn phù hợp với từng dáng mắt, quy chuẩn thao tác căng mi và các lỗi kỹ thuật cần triệt tiêu.
                        </span>
                      </div>
                      <Button
                        type="primary"
                        size="small"
                        icon={<AppIcon icon={Plus} size="sm" />}
                        onClick={handleOpenAddGlueRod}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shrink-0 shadow-sm"
                      >
                        Thêm quy chuẩn mới
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {(doc?.glueRodStandards || []).map((item) => (
                        <Card
                          key={item.id}
                          variant="outlined"
                          className="rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-full mb-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                  {item.category === 'SILICON_ROD' ? 'Trục Silicon' : item.category === 'GLUE' ? 'Keo & Sáp Định Hình' : 'Quy chuẩn khác'}
                                </span>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 m-0">
                                  {item.title}
                                </h3>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<AppIcon icon={Edit2} size="sm" />}
                                  onClick={() => handleOpenEditGlueRod(item)}
                                />
                                <Popconfirm
                                  title="Xóa quy chuẩn này?"
                                  onConfirm={() => handleDeleteGlueRod(item.id)}
                                  okText="Xóa"
                                  cancelText="Hủy"
                                  okButtonProps={{ danger: true }}
                                >
                                  <Button type="text" size="small" danger icon={<AppIcon icon={Trash2} size="sm" />} />
                                </Popconfirm>
                              </div>
                            </div>

                            {/* Section 1: Tiêu chí lựa chọn */}
                            <div className="text-xs space-y-1">
                              <span className="font-semibold text-slate-600 dark:text-slate-300 block">
                                🎯 Tiêu chí lựa chọn:
                              </span>
                              <p className="text-slate-600 dark:text-slate-400 leading-relaxed m-0 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                {item.selectionCriteria}
                              </p>
                            </div>

                            {/* Section 2: Tiêu chuẩn thao tác */}
                            <div className="text-xs space-y-1">
                              <span className="font-semibold text-slate-600 dark:text-slate-300 block">
                                📐 Tiêu chuẩn thao tác chuẩn:
                              </span>
                              <p className="text-slate-600 dark:text-slate-400 leading-relaxed m-0">
                                {item.standardOperation}
                              </p>
                            </div>

                            {/* Section 3: Lưu ý kỹ thuật & Lỗi cần tránh */}
                            <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-500/20 text-xs space-y-1 text-amber-900 dark:text-amber-200">
                              <div className="font-semibold flex items-center gap-1">
                                <AppIcon icon={AlertTriangle} size={13} className="text-amber-600" />
                                <span>Lưu ý &amp; Lỗi cần tránh:</span>
                              </div>
                              <p className="m-0 leading-relaxed text-[11.5px]">
                                {item.commonMistakesToAvoid}
                              </p>
                              {item.technicalNotes && (
                                <p className="m-0 leading-relaxed text-[11px] text-amber-700 dark:text-amber-300 italic pt-1 border-t border-amber-200/40">
                                  Ghi chú: {item.technicalNotes}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">
                              Vật tư: <strong>{item.materialRef || 'Chuẩn chung'}</strong>
                            </span>
                            {item.status === 'VERIFIED' ? (
                              <StatusTag status="success" label="Đã thẩm định" />
                            ) : (
                              <StatusTag status="warning" label="Chờ thẩm định" />
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                key: 'sanitization',
                label: (
                  <span className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm" data-testid="sop-tab-sanitization">
                    <AppIcon icon={ShieldCheck} size={15} />
                    <span>Phần 3 – Khử Khuẩn &amp; Vệ Sinh Dụng Cụ</span>
                  </span>
                ),
                children: (
                  <div className="space-y-3.5 pt-2">
                    <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-500/20 text-xs text-purple-800 dark:text-purple-300 flex-wrap">
                      <div className="flex items-center gap-2">
                        <AppIcon icon={ShieldCheck} size={16} className="text-purple-600 shrink-0" />
                        <span>
                          Phân loại rõ ràng 2 nhóm: <strong>Dụng cụ tái sử dụng (REUSABLE)</strong> (ngâm cồn 70°, sấy tiệt trùng UV, bảo quản kín) và <strong>Vật tư dùng 1 lần (DISPOSABLE)</strong> (hủy ngay sau ca).
                        </span>
                      </div>
                      <Button
                        type="primary"
                        size="small"
                        icon={<AppIcon icon={Plus} size="sm" />}
                        onClick={handleOpenAddSanit}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shrink-0 shadow-sm"
                      >
                        Thêm quy trình khử khuẩn
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {(doc?.sanitizationProcedures || []).map((proc) => {
                        const isReusable = proc.classification === 'REUSABLE';
                        return (
                          <Card
                            key={proc.id}
                            variant="outlined"
                            className={`rounded-2xl border ${
                              isReusable
                                ? 'border-teal-500/20 bg-gradient-to-br from-teal-50/10 via-transparent to-transparent'
                                : 'border-rose-500/20 bg-gradient-to-br from-rose-50/10 via-transparent to-transparent'
                            } hover:shadow-md transition-all flex flex-col justify-between`}
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span
                                    className={`inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-full mb-1 border ${
                                      isReusable
                                        ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20'
                                        : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                                    }`}
                                  >
                                    {isReusable ? '♻️ Dụng cụ tái sử dụng' : '🚫 Vật tư dùng 1 lần (Hủy sau ca)'}
                                  </span>
                                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 m-0">
                                    {proc.toolName}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<AppIcon icon={Edit2} size="sm" />}
                                    onClick={() => handleOpenEditSanit(proc)}
                                  />
                                  <Popconfirm
                                    title="Xóa quy trình này?"
                                    onConfirm={() => handleDeleteSanit(proc.id)}
                                    okText="Xóa"
                                    cancelText="Hủy"
                                    okButtonProps={{ danger: true }}
                                  >
                                    <Button type="text" size="small" danger icon={<AppIcon icon={Trash2} size="sm" />} />
                                  </Popconfirm>
                                </div>
                              </div>

                              {/* Quy trình chi tiết */}
                              <div className="text-xs space-y-1">
                                <span className="font-semibold text-slate-600 dark:text-slate-300 block">
                                  🧪 Quy trình khử khuẩn &amp; bảo quản:
                                </span>
                                <div className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-[11.5px]">
                                  {proc.procedure}
                                </div>
                              </div>

                              {/* Điểm kiểm soát an toàn */}
                              <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-500/20 text-xs space-y-0.5 text-rose-900 dark:text-rose-200">
                                <span className="font-semibold flex items-center gap-1">
                                  <AppIcon icon={AlertTriangle} size={13} className="text-rose-600" />
                                  <span>Điểm kiểm soát an toàn (CSAP):</span>
                                </span>
                                <p className="m-0 text-[11.5px] leading-snug">
                                  {proc.criticalSafetyPoint}
                                </p>
                              </div>

                              {/* Checklist thực hiện */}
                              {proc.checklistSteps && proc.checklistSteps.length > 0 && (
                                <div className="text-xs space-y-1 pt-1">
                                  <span className="font-semibold text-slate-600 dark:text-slate-300 block">
                                    📋 Checklist từng ca:
                                  </span>
                                  <ul className="m-0 p-0 list-none space-y-1">
                                    {proc.checklistSteps.map((step, idx) => (
                                      <li key={idx} className="flex items-center gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-400">
                                        <AppIcon icon={CheckCircle2} size={13} className="text-emerald-500 shrink-0" />
                                        <span>{step}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">
                                {isReusable ? 'Chu kỳ: Sau mỗi ca làm' : 'Chu kỳ: Hủy bỏ 100%'}
                              </span>
                              {proc.status === 'VERIFIED' ? (
                                <StatusTag status="success" label="Đã thẩm định" />
                              ) : (
                                <StatusTag status="warning" label="Chờ thẩm định" />
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ),
              },
              {
                key: 'draft',
                label: (
                  <span className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm" data-testid="sop-tab-draft">
                    <AppIcon icon={Award} size={15} />
                    <span>Bản Dự Thảo Trình CEO &amp; Thẩm Định</span>
                  </span>
                ),
                children: (
                  <div className="space-y-4 pt-2">
                    {/* Official Scale Proposal Sheet */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                      <div className="text-center border-b border-slate-100 dark:border-slate-800 pb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-1">
                          Hệ Thống mOS · Wings Beauty Studio
                        </span>
                        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 m-0">
                          BẢN DỰ THẢO ĐỊNH MỨC &amp; KIỂM SOÁT VẬT TƯ TIÊU HAO (HẠNG MỤC 3)
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl mx-auto">
                          Hồ sơ chuẩn hóa quy trình vận hành SOP, giáo trình đào tạo Chuyên Viên Kỹ Thuật và cơ cấu chi phí vật tư phục vụ phê duyệt Scale dịch vụ Uốn Mi Bóng Tối
                        </p>
                      </div>

                      {/* Thông tin hồ sơ */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                        <div>
                          <span className="text-slate-400 block">Dịch vụ:</span>
                          <strong className="text-slate-800 dark:text-slate-200">Uốn Mi Bóng Tối (Dark Lashes)</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Người lập hồ sơ:</span>
                          <strong className="text-slate-800 dark:text-slate-200">{doc?.projectOwner || 'Danny Do'} (Project Owner)</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Xác nhận chuyên môn:</span>
                          <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{doc?.expertReviewer || 'Cô Giang Đàm'}</strong>
                        </div>
                      </div>

                      {/* Tóm tắt bảng định mức chi phí */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 m-0">
                          1. Tổng hợp Định mức Chi phí Vật tư / 1 Ca Dịch Vụ
                        </h4>
                        <div className="overflow-x-auto border rounded-xl border-slate-200 dark:border-slate-800">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                                <th className="p-2.5">Tên vật tư / Dung dịch</th>
                                <th className="p-2.5 text-center">Định lượng đề xuất</th>
                                <th className="p-2.5 text-right">Đơn giá</th>
                                <th className="p-2.5 text-right">Chi phí / Ca</th>
                                <th className="p-2.5 text-center">Trạng thái thẩm định</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {(doc?.solutionNorms || []).map((norm) => (
                                <tr key={norm.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                  <td className="p-2.5 font-medium">{norm.materialName}</td>
                                  <td className="p-2.5 text-center tabular-nums">
                                    {norm.standardDosagePerSession} {norm.unit}
                                  </td>
                                  <td className="p-2.5 text-right tabular-nums text-slate-500">
                                    {formatVND(norm.costPerUnit)}/{norm.unit}
                                  </td>
                                  <td className="p-2.5 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatVND(norm.costPerSession)}
                                  </td>
                                  <td className="p-2.5 text-center">
                                    {norm.status === 'VERIFIED' ? (
                                      <StatusTag status="success" label="Đã thẩm định" />
                                    ) : (
                                      <StatusTag status="warning" label="Chờ thẩm định" />
                                    )}
                                  </td>
                                </tr>
                              ))}
                              <tr className="bg-emerald-50/40 dark:bg-emerald-950/20 font-bold text-slate-900 dark:text-slate-100">
                                <td colSpan={3} className="p-2.5 text-right uppercase text-[11px]">
                                  Tổng chi phí thuốc uốn &amp; dung dịch chuẩn / ca:
                                </td>
                                <td className="p-2.5 text-right tabular-nums text-base text-emerald-600 dark:text-emerald-400">
                                  {formatVND(doc?.summary.totalNormCostPerSession || 0)}
                                </td>
                                <td className="p-2.5 text-center">
                                  {doc?.summary.pendingReviewCount === 0 ? (
                                    <StatusTag status="success" label="100% Hoàn tất" />
                                  ) : (
                                    <StatusTag status="warning" label="Còn chờ duyệt" />
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Khối Thẩm định & Ký xác nhận chuyên môn */}
                      <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-500/20 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <AppIcon icon={UserCheck} size={18} className="text-purple-600" />
                            <h4 className="text-sm font-bold text-purple-900 dark:text-purple-200 m-0">
                              Xác Nhận Thẩm Định Chuyên Môn – Cô Giang Đàm
                            </h4>
                          </div>

                          {doc?.overallStatus === 'REVIEWED_BY_EXPERT' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-sm">
                              <AppIcon icon={Check} size={14} /> ĐÃ HOÀN TẤT THẨM ĐỊNH CHUYÊN MÔN
                            </span>
                          ) : (
                            <Button
                              type="primary"
                              icon={<AppIcon icon={UserCheck} size="sm" />}
                              onClick={handleOpenEndorse}
                              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-sm"
                            >
                              Cô Giang Đàm Xác Nhận Thẩm Định
                            </Button>
                          )}
                        </div>

                        <p className="text-xs text-purple-900 dark:text-purple-300 leading-relaxed m-0">
                          {doc?.approvalNote ||
                            'Bản dự thảo đang chờ Cô Giang Đàm thẩm định các thông số kỹ thuật, định lượng hóa chất và quy trình vệ sinh an toàn y tế.'}
                        </p>

                        {doc?.reviewedAt && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Thời gian xác nhận: <strong>{new Date(doc.reviewedAt).toLocaleString('vi-VN')}</strong>
                          </div>
                        )}
                      </div>

                      {/* Quy định cấm tự động ban hành */}
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                        <AppIcon icon={AlertTriangle} size={18} className="text-amber-600 shrink-0" />
                        <span>
                          <strong>Nguyên tắc bất biến:</strong> Tài liệu Hạng mục 3 chỉ có giá trị ban hành khi được
                          CEO phê duyệt chính thức Scale. Tuyệt đối không tự động ban hành SOP hoặc áp đặt định mức lên hệ thống vận hành khi chưa có quyết định từ Ban Giám Đốc.
                        </span>
                      </div>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </AdaptiveModal>

      {/* Sub-Modal: Add / Edit Solution Norm (Phần 1) */}
      <AdaptiveModal
        intent="form"
        open={normEditModalOpen}
        onCancel={() => setNormEditModalOpen(false)}
        onOk={handleSaveNorm}
        okText={editingNorm ? 'Lưu định mức' : 'Thêm vào định mức'}
        cancelText="Hủy"
        title={editingNorm ? 'Chỉnh sửa Định mức Thuốc & Dung dịch' : 'Thêm Dung dịch vào Định mức'}
        width={540}
      >
        <Form form={normForm} layout="vertical" className="pt-2">
          <Form.Item
            name="materialName"
            label={<span className="text-xs font-semibold">Tên vật tư / Dung dịch uốn mi</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên dung dịch.' }]}
          >
            <Input placeholder="Ví dụ: Thuốc số 1 (Perming Cream)" className="rounded-lg" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="unit"
              label={<span className="text-xs font-semibold">Đơn vị tính</span>}
              rules={[{ required: true, message: 'Nhập đơn vị tính.' }]}
            >
              <Input placeholder="ml, g, giọt, gói..." className="rounded-lg" />
            </Form.Item>

            <Form.Item
              name="costPerUnit"
              label={<span className="text-xs font-semibold">Đơn giá gốc / 1 đơn vị (đ)</span>}
              rules={[{ required: true, message: 'Nhập đơn giá gốc.' }]}
            >
              <InputNumber<number>
                className="w-full rounded-lg tabular-nums"
                min={0}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0)}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="standardDosagePerSession"
            label={<span className="text-xs font-semibold">Định lượng tiêu chuẩn đề xuất cho mỗi ca</span>}
            rules={[{ required: true, message: 'Nhập định lượng tiêu chuẩn mỗi ca.' }]}
            extra="Cô Giang Đàm trực tiếp nhập định lượng tiêu chuẩn để kiểm soát chi phí từng ca."
          >
            <InputNumber<number>
              className="w-full rounded-lg tabular-nums font-bold text-emerald-600"
              min={0.01}
              step={0.1}
            />
          </Form.Item>

          <Form.Item
            name="usageInstructions"
            label={<span className="text-xs font-semibold">Hướng dẫn &amp; Cách thức sử dụng</span>}
          >
            <TextArea rows={2} placeholder="Thời gian ủ, cách phết thuốc, lưu ý vị trí..." className="rounded-lg" />
          </Form.Item>

          <Form.Item
            name="technicalNotes"
            label={<span className="text-xs font-semibold">Lưu ý kỹ thuật an toàn</span>}
          >
            <Input placeholder="Lưu ý về nang mi, nồng độ, tránh cay mắt..." className="rounded-lg" />
          </Form.Item>
        </Form>
      </AdaptiveModal>

      {/* Sub-Modal: Add / Edit Glue & Rod Standard (Phần 2) */}
      <AdaptiveModal
        intent="form"
        open={glueRodModalOpen}
        onCancel={() => setGlueRodModalOpen(false)}
        onOk={handleSaveGlueRod}
        okText={editingGlueRod ? 'Lưu quy chuẩn' : 'Thêm mới'}
        cancelText="Hủy"
        title={editingGlueRod ? 'Chỉnh sửa Quy chuẩn Keo & Trục Silicon' : 'Thêm Quy chuẩn Keo & Trục Silicon'}
        width={580}
      >
        <Form form={glueRodForm} layout="vertical" className="pt-2">
          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="category"
              label={<span className="text-xs font-semibold">Phân loại</span>}
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: 'SILICON_ROD', label: 'Trục Silicon' },
                  { value: 'GLUE', label: 'Keo & Sáp định hình' },
                  { value: 'OTHER', label: 'Khác' },
                ]}
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item
              name="materialRef"
              label={<span className="text-xs font-semibold">Vật tư áp dụng</span>}
            >
              <Input placeholder="Trục Form C, Sáp uốn..." className="rounded-lg" />
            </Form.Item>
          </div>

          <Form.Item
            name="title"
            label={<span className="text-xs font-semibold">Tên tiêu chuẩn / Quy cách</span>}
            rules={[{ required: true, message: 'Nhập tên quy chuẩn.' }]}
          >
            <Input placeholder="Ví dụ: Trục Silicon Form C (Uốn cong tự nhiên)" className="rounded-lg" />
          </Form.Item>

          <Form.Item
            name="selectionCriteria"
            label={<span className="text-xs font-semibold">Hướng dẫn lựa chọn &amp; Sử dụng</span>}
            rules={[{ required: true, message: 'Nhập tiêu chí lựa chọn.' }]}
          >
            <TextArea rows={2} placeholder="Phù hợp dáng mắt nào, độ dài mi tối thiểu..." className="rounded-lg" />
          </Form.Item>

          <Form.Item
            name="standardOperation"
            label={<span className="text-xs font-semibold">Tiêu chuẩn thao tác kỹ thuật</span>}
            rules={[{ required: true, message: 'Nhập tiêu chuẩn thao tác.' }]}
          >
            <TextArea rows={2} placeholder="Cách đặt trục cách chân mi bao nhiêu mm, hướng vuốt căng mi..." className="rounded-lg" />
          </Form.Item>

          <Form.Item
            name="commonMistakesToAvoid"
            label={<span className="text-xs font-semibold">Lưu ý kỹ thuật &amp; Các lỗi cần tránh</span>}
            rules={[{ required: true, message: 'Nhập các lỗi cần tránh.' }]}
          >
            <TextArea rows={2} placeholder="Tránh bóng khí dưới trục, tránh dính keo chân mi, không kéo quá căng..." className="rounded-lg" />
          </Form.Item>

          <Form.Item
            name="illustrationImageUrl"
            label={<span className="text-xs font-semibold">URL Ảnh minh họa (Tùy chọn)</span>}
          >
            <Input placeholder="https://example.com/rod-illustration.png" className="rounded-lg" />
          </Form.Item>
        </Form>
      </AdaptiveModal>

      {/* Sub-Modal: Add / Edit Sanitization Procedure (Phần 3) */}
      <AdaptiveModal
        intent="form"
        open={sanitModalOpen}
        onCancel={() => setSanitModalOpen(false)}
        onOk={handleSaveSanit}
        okText={editingSanit ? 'Lưu quy trình' : 'Thêm mới'}
        cancelText="Hủy"
        title={editingSanit ? 'Chỉnh sửa Quy trình Khử khuẩn' : 'Thêm Quy trình Khử khuẩn & Vệ sinh'}
        width={580}
      >
        <Form form={sanitForm} layout="vertical" className="pt-2">
          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="toolName"
              label={<span className="text-xs font-semibold">Tên dụng cụ / Vật tư</span>}
              rules={[{ required: true, message: 'Nhập tên dụng cụ.' }]}
            >
              <Input placeholder="Trục silicon, nhíp uốn, eye pad..." className="rounded-lg" />
            </Form.Item>

            <Form.Item
              name="classification"
              label={<span className="text-xs font-semibold">Phân loại an toàn</span>}
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: 'REUSABLE', label: '♻️ Tái sử dụng (Khử khuẩn nghiêm ngặt)' },
                  { value: 'DISPOSABLE', label: '🚫 Dùng 1 lần (Hủy sau ca)' },
                ]}
                className="rounded-lg"
              />
            </Form.Item>
          </div>

          <Form.Item
            name="procedure"
            label={<span className="text-xs font-semibold">Quy trình vệ sinh, khử khuẩn &amp; bảo quản</span>}
            rules={[{ required: true, message: 'Nhập quy trình vệ sinh.' }]}
          >
            <TextArea rows={3} placeholder="Ngâm cồn 70°, sấy UV, bảo quản kín trong túi vô trùng..." className="rounded-lg" />
          </Form.Item>

          <Form.Item
            name="criticalSafetyPoint"
            label={<span className="text-xs font-semibold">Điểm kiểm soát an toàn (CSAP)</span>}
            rules={[{ required: true, message: 'Nhập điểm kiểm soát an toàn.' }]}
          >
            <Input placeholder="Kiểm tra không gờ sắc nhọn, không rách trục, kiểm tra vô trùng..." className="rounded-lg" />
          </Form.Item>

          <Form.Item
            name="checklistStepsText"
            label={<span className="text-xs font-semibold">Checklist thực hiện từng ca (Mỗi dòng 1 bước)</span>}
            extra="Nhập mỗi bước checklist trên một dòng để hiển thị dạng checklist kiểm tra."
          >
            <TextArea rows={3} placeholder="Bước 1: Rửa xà phòng y tế&#10;Bước 2: Ngâm cồn 70 độ 15p&#10;Bước 3: Hấp tiệt trùng UV&#10;Bước 4: Bảo quản kín" className="rounded-lg" />
          </Form.Item>
        </Form>
      </AdaptiveModal>

      {/* Modal: Xác nhận thẩm định Cô Giang Đàm */}
      <AdaptiveModal
        intent="confirm"
        open={endorseModalOpen}
        onCancel={() => setEndorseModalOpen(false)}
        onOk={handleConfirmEndorse}
        confirmLoading={reviewing}
        okText="Ký Xác Nhận Thẩm Định"
        cancelText="Hủy"
        okButtonProps={{ className: 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold' }}
        title="Xác Nhận Thẩm Định Chuyên Môn (Cô Giang Đàm)"
        width={500}
      >
        <Form form={endorseForm} layout="vertical" className="pt-2">
          <Form.Item
            name="reviewerName"
            label={<span className="text-xs font-semibold">Người xác nhận thẩm định</span>}
            rules={[{ required: true }]}
          >
            <Input readOnly className="rounded-lg bg-slate-50 dark:bg-slate-900 font-semibold text-emerald-600" />
          </Form.Item>

          <Form.Item
            name="note"
            label={<span className="text-xs font-semibold">Ghi chú &amp; Ý kiến chuyên môn</span>}
            rules={[{ required: true, message: 'Vui lòng nhập ý kiến thẩm định.' }]}
          >
            <TextArea rows={4} className="rounded-lg" />
          </Form.Item>

          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
            ✅ Sau khi xác nhận, toàn bộ các mục định mức, quy chuẩn keo/trục và quy trình khử khuẩn sẽ chuyển sang trạng thái <strong>Đã thẩm định</strong> để hoàn tất hồ sơ trình CEO duyệt Scale.
          </div>
        </Form>
      </AdaptiveModal>
    </>
  );
}

export default PilotMaterialSopModal;
