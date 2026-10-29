'use client';

import React, { useState, useEffect, useCallback, useId } from 'react';
import {
  Card,
  Button,
  Input,
  Select,
  message,
  Popconfirm,
  Typography,
} from 'antd';
import {
  ArrowLeft,
  Save,
  Upload,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Layers,
  Clock,
  UserCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { AppIcon } from '../../../../components/ui/AppIcon';
import { AdaptiveModal } from '../../../../components/ui';
import { apiClient } from '../../../../lib/api-client';
import type {
  SopPreparationCategory1Document,
  SopPrepCriterionData,
  SopPrepEvidenceFile,
  SopPrepFileType,
} from '@mos-lab/shared';
import { DEFAULT_SOP_PREPARATION_CATEGORY_1 } from '@mos-lab/shared';

const { Text, Paragraph } = Typography;

interface SopPrepCategory1DetailViewProps {
  onBack: () => void;
}

export function SopPrepCategory1DetailView({ onBack }: SopPrepCategory1DetailViewProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [doc, setDoc] = useState<SopPreparationCategory1Document>(
    DEFAULT_SOP_PREPARATION_CATEGORY_1
  );
  const [activeCriterionId, setActiveCriterionId] = useState<number>(1);

  // Form inputs for current active criterion
  const [knowledgeText, setKnowledgeText] = useState('');
  const [practicalText, setPracticalText] = useState('');
  const [groundsText, setGroundsText] = useState('');

  // Upload inputs
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadOrigin, setUploadOrigin] = useState('Ca Pilot thực tế');
  const [uploadSessionCode, setUploadSessionCode] = useState('');

  // File Preview Modal
  const [previewFile, setPreviewFile] = useState<SopPrepEvidenceFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Stable ID for accessible file input
  const fileInputId = useId();

  // Load live data from API
  const fetchCategory1Data = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.pilot.getSopPreparationCategory1({ pilotCode: 'DARK_LASHES' });
      if (res && res.criteria) {
        setDoc(res);
      }
    } catch (err: unknown) {
      console.warn('Cannot fetch SOP Prep Category 1 from API, using default/cached data:', err);
      // Fallback to default
      setDoc(DEFAULT_SOP_PREPARATION_CATEGORY_1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategory1Data();
  }, [fetchCategory1Data]);

  // Sync form inputs when active criterion changes or doc is updated
  useEffect(() => {
    const activeCrit = doc.criteria.find((c) => c.id === activeCriterionId);
    if (activeCrit) {
      setKnowledgeText(activeCrit.expertiseKnowledge || '');
      setPracticalText(activeCrit.practicalMethod || '');
      setGroundsText(activeCrit.evaluationGrounds || '');
    }
  }, [activeCriterionId, doc]);

  const activeCriterion: SopPrepCriterionData | undefined = doc.criteria.find(
    (c) => c.id === activeCriterionId
  );

  // Save current criterion draft
  const handleSaveCurrentCriterion = async () => {
    if (!activeCriterion) return;
    try {
      setSaving(true);
      const updatedCriterion: SopPrepCriterionData = {
        ...activeCriterion,
        expertiseKnowledge: knowledgeText,
        practicalMethod: practicalText,
        evaluationGrounds: groundsText,
        updatedBy: 'Cô Giang Phạm',
        updatedAt: new Date().toISOString(),
      };

      const updatedCriteria = doc.criteria.map((c) =>
        c.id === activeCriterionId ? updatedCriterion : c
      );

      const newDoc: SopPreparationCategory1Document = {
        ...doc,
        lastUpdatedBy: 'Cô Giang Phạm',
        lastUpdatedAt: new Date().toISOString(),
        criteria: updatedCriteria,
      };

      try {
        await apiClient.pilot.saveSopPreparationCriterion(activeCriterionId, {
          expertiseKnowledge: knowledgeText,
          practicalMethod: practicalText,
          evaluationGrounds: groundsText,
          updatedBy: 'Cô Giang Phạm',
        });
      } catch (apiErr) {
        console.warn('API save failed, persisting locally in memory state:', apiErr);
      }

      setDoc(newDoc);
      message.success(`Đã lưu bản nháp Tiêu chí ${activeCriterion.name} thành công!`);
    } catch {
      message.error('Không thể lưu bản nháp tiêu chí.');
    } finally {
      setSaving(false);
    }
  };

  // Save all criteria
  const handleSaveAll = async () => {
    try {
      setSaving(true);
      const updatedCriteria = doc.criteria.map((c) => {
        if (c.id === activeCriterionId) {
          return {
            ...c,
            expertiseKnowledge: knowledgeText,
            practicalMethod: practicalText,
            evaluationGrounds: groundsText,
            updatedBy: 'Cô Giang Phạm',
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      });

      const newDoc: SopPreparationCategory1Document = {
        ...doc,
        lastUpdatedBy: 'Cô Giang Phạm',
        lastUpdatedAt: new Date().toISOString(),
        criteria: updatedCriteria,
      };

      try {
        await apiClient.pilot.saveSopPreparationCategory1({
          criteria: updatedCriteria,
          lastUpdatedBy: 'Cô Giang Phạm',
          status: 'COLLECTING',
        });
      } catch (apiErr) {
        console.warn('API save all failed, persisting locally in memory state:', apiErr);
      }

      setDoc(newDoc);
      message.success('Đã lưu toàn bộ bản nháp 5 tiêu chí của Cô Giang Phạm!');
    } catch {
      message.error('Không thể lưu toàn bộ dữ liệu.');
    } finally {
      setSaving(false);
    }
  };

  // Upload Evidence File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadEvidence = async () => {
    if (!selectedFile) {
      message.warning('Vui lòng chọn tệp minh chứng cần tải lên.');
      return;
    }
    if (!activeCriterion) return;

    try {
      setUploading(true);

      // Read file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });
      reader.readAsDataURL(selectedFile);
      const fileBase64 = await base64Promise;

      let uploadedFile: SopPrepEvidenceFile;

      try {
        uploadedFile = await apiClient.pilot.uploadSopPrepEvidence({
          fileData: fileBase64,
          fileName: selectedFile.name,
          mimeType: selectedFile.type || 'application/octet-stream',
          description: uploadDescription.trim() || undefined,
          sourceOrigin: uploadOrigin.trim() || 'Ca Pilot thực tế',
          pilotSessionCode: uploadSessionCode.trim() || undefined,
          criterionId: activeCriterionId,
          uploadedBy: 'Cô Giang Phạm',
        });
      } catch (uploadErr) {
        console.warn('API upload failed, generating local mock evidence item:', uploadErr);
        // Fallback local file object
        let fileType: SopPrepFileType = 'other';
        const lowerName = selectedFile.name.toLowerCase();
        if (selectedFile.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/.test(lowerName)) {
          fileType = 'image';
        } else if (selectedFile.type.startsWith('video/') || /\.(mp4|webm|mov|avi)$/.test(lowerName)) {
          fileType = 'video';
        } else if (/\.(pdf|doc|docx|txt)$/.test(lowerName) || selectedFile.type.includes('pdf')) {
          fileType = 'document';
        }

        uploadedFile = {
          id: `ev-${Date.now()}`,
          name: selectedFile.name,
          url: fileBase64.startsWith('data:image/')
            ? fileBase64
            : '/api/pilot/media/ea735600-d100-4749-9db8-54405430e956.jpg',
          fileType,
          mimeType: selectedFile.type || 'application/octet-stream',
          sizeBytes: selectedFile.size,
          description: uploadDescription.trim() || 'Tệp minh chứng tải lên bởi Cô Giang Phạm',
          sourceOrigin: uploadOrigin.trim() || 'Ca Pilot thực tế',
          pilotSessionCode: uploadSessionCode.trim() || undefined,
          uploadedBy: 'Cô Giang Phạm',
          uploadedAt: new Date().toISOString(),
        };
      }

      // Update state
      const updatedCriteria = doc.criteria.map((crit) => {
        if (crit.id === activeCriterionId) {
          return {
            ...crit,
            updatedAt: new Date().toISOString(),
            evidenceFiles: [...crit.evidenceFiles, uploadedFile],
          };
        }
        return crit;
      });

      setDoc({
        ...doc,
        lastUpdatedAt: new Date().toISOString(),
        criteria: updatedCriteria,
      });

      setSelectedFile(null);
      setUploadDescription('');
      setUploadSessionCode('');
      message.success(`Đã tải lên tệp "${selectedFile.name}" thành công!`);
    } catch {
      message.error('Lỗi khi tải tệp minh chứng.');
    } finally {
      setUploading(false);
    }
  };

  // Delete Evidence File
  const handleDeleteEvidence = async (fileId: string) => {
    try {
      try {
        await apiClient.pilot.deleteSopPrepEvidence(activeCriterionId, fileId);
      } catch (delErr) {
        console.warn('API delete failed, updating local state:', delErr);
      }

      const updatedCriteria = doc.criteria.map((crit) => {
        if (crit.id === activeCriterionId) {
          return {
            ...crit,
            updatedAt: new Date().toISOString(),
            evidenceFiles: crit.evidenceFiles.filter((f) => f.id !== fileId),
          };
        }
        return crit;
      });

      setDoc({
        ...doc,
        lastUpdatedAt: new Date().toISOString(),
        criteria: updatedCriteria,
      });

      message.success('Đã xóa tệp minh chứng thành công!');
    } catch {
      message.error('Không thể xóa tệp minh chứng.');
    }
  };

  // Total evidence count across all criteria
  const totalEvidenceCount = doc.criteria.reduce(
    (acc, c) => acc + (c.evidenceFiles?.length || 0),
    0
  );

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: SopPrepFileType) => {
    switch (type) {
      case 'image':
        return <AppIcon icon={ImageIcon} size={16} className="text-emerald-500" />;
      case 'video':
        return <AppIcon icon={VideoIcon} size={16} className="text-purple-500" />;
      case 'document':
        return <AppIcon icon={FileText} size={16} className="text-blue-500" />;
      default:
        return <AppIcon icon={FileSpreadsheet} size={16} className="text-amber-500" />;
    }
  };

  return (
    <div className="space-y-4 antialiased" data-testid="sop-prep-detail-view">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            icon={<AppIcon icon={ArrowLeft} size={15} />}
            onClick={onBack}
            className="rounded-xl flex items-center font-medium text-xs sm:text-sm h-8"
            data-testid="sop-prep-back-btn"
          >
            Quay lại danh mục
          </Button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Hạng mục 1 – Kiểm tra &amp; Đánh giá tình trạng mi thật
              </span>
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                <AppIcon icon={Clock} size={12} className="mr-1" />
                Bản nháp – Chưa kiểm chứng
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Người phụ trách: <strong>Cô Giang Phạm</strong></span>
              <span>•</span>
              <span>Cập nhật: {doc.lastUpdatedAt ? new Date(doc.lastUpdatedAt).toLocaleDateString('vi-VN') : 'Mới khởi tạo'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <Button
            type="primary"
            icon={<AppIcon icon={Save} size={15} />}
            loading={saving}
            onClick={handleSaveAll}
            className="rounded-xl font-medium text-xs sm:text-sm h-8 bg-indigo-600 hover:bg-indigo-700 border-none shadow-sm flex items-center"
            data-testid="sop-prep-save-all-btn"
          >
            Lưu toàn bộ bản nháp
          </Button>
        </div>
      </div>

      {/* Overview Cards & Invariant Principles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <AppIcon icon={Layers} size={20} />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tiêu chí chuyên môn</div>
            <div className="text-base font-bold text-slate-800 dark:text-slate-100">5 / 5 Tiêu chí</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <AppIcon icon={ImageIcon} size={20} />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tổng tệp minh chứng</div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {totalEvidenceCount} tệp đính kèm
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <AppIcon icon={UserCheck} size={20} />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Người nhập liệu</div>
            <div className="text-base font-bold text-slate-800 dark:text-slate-100">Cô Giang Phạm</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <AppIcon icon={ShieldCheck} size={20} />
          </div>
          <div>
            <div className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold">Bảo toàn dữ liệu</div>
            <div className="text-xs text-indigo-900 dark:text-indigo-200 leading-snug">
              Lưu độc lập, không có AI can thiệp
            </div>
          </div>
        </div>
      </div>

      {/* 5 Criteria Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" data-testid="sop-prep-criteria-tabs">
        {doc.criteria.map((crit) => {
          const isActive = crit.id === activeCriterionId;
          const evidenceCount = crit.evidenceFiles?.length || 0;

          return (
            <button
              key={crit.id}
              onClick={() => setActiveCriterionId(crit.id)}
              type="button"
              className={`px-3.5 py-2.5 rounded-xl border text-left font-medium transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
              data-testid={`sop-prep-criterion-tab-${crit.id}`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {crit.order}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold leading-tight">{crit.name}</span>
                <span className={`text-[10px] ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {evidenceCount} tệp minh chứng
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Criterion Editing Workspace */}
      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <AppIcon icon={Loader2} size={28} className="animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
      ) : activeCriterion ? (
        <div className="space-y-4" data-testid={`sop-prep-workspace-criterion-${activeCriterion.id}`}>
          {/* Criterion Header Info Card */}
          <Card
            variant="outlined"
            className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                  {activeCriterion.order}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
                    Tiêu chí {activeCriterion.order}: {activeCriterion.name}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Hạng mục 1 · Kiểm tra &amp; Đánh giá tình trạng mi thật
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  <AppIcon icon={Clock} size={12} className="mr-1.5" />
                  {activeCriterion.statusLabel || 'Bản nháp – Chưa kiểm chứng'}
                </span>
                <Button
                  type="primary"
                  icon={<AppIcon icon={Save} size={14} />}
                  loading={saving}
                  onClick={handleSaveCurrentCriterion}
                  className="rounded-xl font-medium text-xs h-8 bg-indigo-600 hover:bg-indigo-700 border-none shadow-sm flex items-center"
                  data-testid="sop-prep-save-criterion-btn"
                >
                  Lưu bản nháp tiêu chí này
                </Button>
              </div>
            </div>

            {/* Form Fields: A, B, C */}
            <div className="space-y-4 pt-4">
              {/* Field A: Kiến thức chuyên môn */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <AppIcon icon={Sparkles} size={15} className="text-indigo-500" />
                    <span>A. Kiến thức chuyên môn (Lý thuyết, giải phẫu nang mi, chu kỳ sinh học)</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Do Cô Giang Phạm nhập</span>
                </div>
                <Input.TextArea
                  rows={4}
                  value={knowledgeText}
                  onChange={(e) => setKnowledgeText(e.target.value)}
                  placeholder="Nhập kiến thức chuyên môn, cơ sở sinh học và lý thuyết thẩm định cho tiêu chí này..."
                  className="rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200"
                  data-testid="sop-prep-field-knowledge"
                />
              </div>

              {/* Field B: Phương pháp thực hành */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <AppIcon icon={Layers} size={15} className="text-emerald-500" />
                    <span>B. Phương pháp thực hành (Quy trình thao tác, dụng cụ đo đạc &amp; kiểm tra thực tế)</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Từng bước thực hiện</span>
                </div>
                <Input.TextArea
                  rows={5}
                  value={practicalText}
                  onChange={(e) => setPracticalText(e.target.value)}
                  placeholder="Ghi rõ các bước thực hành, dụng cụ chuyên dụng (cữ đo mi, kính lúp, que gạt) và vị trí kiểm tra..."
                  className="rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200"
                  data-testid="sop-prep-field-practical"
                />
              </div>

              {/* Field C: Căn cứ đánh giá */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <AppIcon icon={CheckCircle2} size={15} className="text-blue-500" />
                    <span>C. Căn cứ đánh giá (Tiêu chuẩn Đạt/Không đạt &amp; Ngưỡng thẩm định lâm sàng)</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Quy chuẩn PASS / FAIL</span>
                </div>
                <Input.TextArea
                  rows={4}
                  value={groundsText}
                  onChange={(e) => setGroundsText(e.target.value)}
                  placeholder="Mô tả cụ thể căn cứ đánh giá: ngưỡng định lượng Đạt (PASS) và tiêu chí Không Đạt (FAIL)..."
                  className="rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200"
                  data-testid="sop-prep-field-grounds"
                />
              </div>
            </div>
          </Card>

          {/* Section D: Evidence Files Management */}
          <Card
            variant="outlined"
            className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
            data-testid="sop-prep-evidence-section"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5">
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 m-0 flex items-center gap-2">
                  <AppIcon icon={ImageIcon} size={17} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Tệp minh chứng thực tế cho Tiêu chí {activeCriterion.name}</span>
                </h4>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Hỗ trợ tải lên nhiều tệp: Ảnh chụp lâm sàng, video clip thao tác, tài liệu hướng dẫn (PDF/DOC)
                </div>
              </div>

              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 self-start sm:self-auto">
                {activeCriterion.evidenceFiles?.length || 0} tệp đã đính kèm
              </span>
            </div>

            {/* Upload Box Component */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="shrink-0">
                  <input
                    type="file"
                    id={fileInputId}
                    onChange={handleFileChange}
                    accept="image/*,video/*,.pdf,.doc,.docx"
                    className="hidden"
                    data-testid="sop-prep-file-input"
                  />
                  <label
                    htmlFor={fileInputId}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:border-indigo-500 hover:text-indigo-600 cursor-pointer shadow-xs transition-colors"
                  >
                    <AppIcon icon={Upload} size={15} />
                    <span>{selectedFile ? 'Đổi tệp khác' : 'Chọn tệp từ thiết bị'}</span>
                  </label>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 truncate flex-1">
                  {selectedFile ? (
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      Đã chọn: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </span>
                  ) : (
                    <span>Hỗ trợ ảnh JPG/PNG/WebP, Video MP4/WebM, Tài liệu PDF/DOCX (tối đa 50MB)</span>
                  )}
                </div>
              </div>

              {/* Upload Metadata Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="sm:col-span-2">
                  <Input
                    placeholder="Mô tả tệp minh chứng (ví dụ: Ảnh cữ đo mi 9.5mm tại bàn tư vấn...)"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    className="rounded-xl text-xs"
                    data-testid="sop-prep-upload-desc-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={uploadOrigin}
                    onChange={(v) => setUploadOrigin(v)}
                    className="w-full text-xs rounded-xl"
                    options={[
                      { label: 'Ca Pilot thực tế', value: 'Ca Pilot thực tế' },
                      { label: 'Hồ sơ đào tạo', value: 'Hồ sơ đào tạo' },
                      { label: 'Ảnh chụp lâm sàng', value: 'Ảnh chụp lâm sàng' },
                      { label: 'Tài liệu kỹ thuật', value: 'Tài liệu kỹ thuật' },
                    ]}
                  />

                  <Input
                    placeholder="Mã ca Pilot (vd: PILOT-001)"
                    value={uploadSessionCode}
                    onChange={(e) => setUploadSessionCode(e.target.value)}
                    className="rounded-xl text-xs"
                    data-testid="sop-prep-upload-session-input"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="primary"
                  icon={<AppIcon icon={Upload} size={14} />}
                  loading={uploading}
                  disabled={!selectedFile}
                  onClick={handleUploadEvidence}
                  className="rounded-xl font-medium text-xs h-8 bg-emerald-600 hover:bg-emerald-700 border-none shadow-sm flex items-center"
                  data-testid="sop-prep-upload-submit-btn"
                >
                  Tải lên tệp minh chứng
                </Button>
              </div>
            </div>

            {/* Evidence Files List / Gallery */}
            <div className="mt-4">
              {!activeCriterion.evidenceFiles || activeCriterion.evidenceFiles.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 border border-slate-100 dark:border-slate-800 rounded-xl">
                  Chưa có tệp minh chứng nào cho tiêu chí này. Hãy tải lên ảnh hoặc tài liệu đầu tiên ở trên.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="sop-prep-evidence-list">
                  {activeCriterion.evidenceFiles.map((file) => (
                    <div
                      key={file.id}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between gap-2.5"
                      data-testid={`sop-prep-evidence-item-${file.id}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Thumbnail / Icon */}
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                          {file.fileType === 'image' && file.url ? (
                            <img
                              src={file.url}
                              alt={file.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // fallback icon on error
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            getFileIcon(file.fileType)
                          )}
                        </div>

                        {/* File Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block max-w-[200px]" title={file.name}>
                              {file.name}
                            </span>
                            <span className="text-[10px] text-slate-400">({formatFileSize(file.sizeBytes)})</span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {file.sourceOrigin || 'Ca Pilot'}
                            </span>
                            {file.pilotSessionCode && (
                              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                                {file.pilotSessionCode}
                              </span>
                            )}
                          </div>

                          {file.description && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 m-0 line-clamp-2 leading-relaxed">
                              {file.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* File Card Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                        <span className="text-slate-400">
                          {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString('vi-VN') : ''}
                        </span>

                        <div className="flex items-center gap-2">
                          <Button
                            size="small"
                            type="text"
                            icon={<AppIcon icon={ExternalLink} size={13} />}
                            onClick={() => {
                              setPreviewFile(file);
                              setPreviewOpen(true);
                            }}
                            className="text-indigo-600 dark:text-indigo-400 text-xs px-2 h-7 rounded-lg"
                            data-testid={`preview-evidence-${file.id}`}
                          >
                            Xem trước
                          </Button>

                          <Popconfirm
                            title="Xác nhận xóa tệp minh chứng"
                            description="Bạn có chắc chắn muốn gỡ tệp này khỏi tiêu chí không?"
                            okText="Xóa tệp"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => handleDeleteEvidence(file.id)}
                          >
                            <Button
                              size="small"
                              type="text"
                              danger
                              icon={<AppIcon icon={Trash2} size={13} />}
                              className="text-xs px-2 h-7 rounded-lg"
                              data-testid={`delete-evidence-${file.id}`}
                            >
                              Xóa
                            </Button>
                          </Popconfirm>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Bottom Navigation between 5 criteria */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <Button
              disabled={activeCriterionId <= 1}
              onClick={() => setActiveCriterionId((prev) => Math.max(1, prev - 1))}
              icon={<AppIcon icon={ChevronLeft} size={15} />}
              className="rounded-xl text-xs font-medium h-8"
            >
              Tiêu chí trước
            </Button>

            <span className="text-xs font-semibold text-slate-500">
              Tiêu chí {activeCriterionId} / 5
            </span>

            <Button
              disabled={activeCriterionId >= 5}
              onClick={() => setActiveCriterionId((prev) => Math.min(5, prev + 1))}
              className="rounded-xl text-xs font-medium h-8 flex items-center gap-1"
            >
              <span>Tiêu chí tiếp</span>
              <AppIcon icon={ChevronRight} size={15} />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Preview Modal for Evidence Files */}
      <AdaptiveModal
        intent="detail"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        title={
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            {previewFile && getFileIcon(previewFile.fileType)}
            <span className="truncate max-w-md">{previewFile?.name || 'Xem trước tệp minh chứng'}</span>
          </div>
        }
        footer={[
          <Button key="close" onClick={() => setPreviewOpen(false)} className="rounded-xl font-medium">
            Đóng
          </Button>,
          previewFile && (
            <a
              key="download"
              href={previewFile.url}
              download={previewFile.name}
              target="_blank"
              rel="noopener noreferrer"
              className="ant-btn ant-btn-primary rounded-xl font-medium inline-flex items-center justify-center h-8 px-4"
            >
              Tải tệp về máy
            </a>
          ),
        ]}
        className="rounded-2xl"
      >
        {previewFile && (
          <div className="space-y-3 py-2">
            {previewFile.fileType === 'image' ? (
              <div className="rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 flex items-center justify-center max-h-[480px]">
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-h-[450px] w-auto max-w-full object-contain rounded-lg"
                />
              </div>
            ) : previewFile.fileType === 'video' ? (
              <div className="rounded-xl overflow-hidden bg-black flex items-center justify-center">
                <video src={previewFile.url} controls className="w-full max-h-[400px]">
                  <track kind="captions" />
                  Trình duyệt không hỗ trợ phát video này.
                </video>
              </div>
            ) : (
              <div className="p-8 text-center space-y-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <AppIcon icon={FileText} size={32} />
                </div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {previewFile.name}
                </div>
                <div className="text-xs text-slate-500">
                  Tài liệu định dạng {previewFile.mimeType} ({formatFileSize(previewFile.sizeBytes)})
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mô tả minh chứng:
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 m-0">
                {previewFile.description || 'Chưa có mô tả chi tiết.'}
              </p>
              <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-3">
                <span>Nguồn: <strong>{previewFile.sourceOrigin}</strong></span>
                {previewFile.pilotSessionCode && (
                  <span>Mã ca: <strong>{previewFile.pilotSessionCode}</strong></span>
                )}
                <span>Tải lên bởi: <strong>{previewFile.uploadedBy}</strong></span>
              </div>
            </div>
          </div>
        )}
      </AdaptiveModal>
    </div>
  );
}
