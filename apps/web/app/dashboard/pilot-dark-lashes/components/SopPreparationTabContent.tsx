'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Typography } from 'antd';
import {
  ClipboardList,
  UserCheck,
  Clock,
  ArrowRight,
  Info,
  Shield,
  Layers,
  Sparkles,
  FileEdit,
  FolderOpen,
} from 'lucide-react';
import { AppIcon } from '../../../../components/ui/AppIcon';
import { AdaptiveModal } from '../../../../components/ui';
import { SopPrepCategory1DetailView } from './SopPrepCategory1DetailView';
import { apiClient } from '../../../../lib/api-client';
import type { SopPreparationCategory1Document } from '@mos-lab/shared';
import { DEFAULT_SOP_PREPARATION_CATEGORY_1 } from '@mos-lab/shared';

const { Paragraph } = Typography;

export function SopPreparationTabContent() {
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [subView, setSubView] = useState<'overview' | 'cat1-detail'>('overview');
  const [doc, setDoc] = useState<SopPreparationCategory1Document>(
    DEFAULT_SOP_PREPARATION_CATEGORY_1
  );

  useEffect(() => {
    async function loadData() {
      try {
        const res = await apiClient.pilot.getSopPreparationCategory1({ pilotCode: 'DARK_LASHES' });
        if (res && res.criteria) setDoc(res);
      } catch {
        // fallback to default
      }
    }
    loadData();
  }, []);

  if (subView === 'cat1-detail') {
    return <SopPrepCategory1DetailView onBack={() => setSubView('overview')} />;
  }

  const totalEvidenceCount = doc.criteria.reduce(
    (acc, c) => acc + (c.evidenceFiles?.length || 0),
    0
  );

  return (
    <div
      className="space-y-4 antialiased"
      data-testid="sop-preparation-tab-content"
    >
      {/* Overview Banner */}
      <div className="rounded-2xl p-4 sm:p-5 border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-sky-500/5 to-transparent shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                <AppIcon icon={Layers} size={14} className="mr-1.5" />
                Giai đoạn 1 · Khởi tạo danh mục
              </span>
              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                <AppIcon icon={Clock} size={14} className="mr-1.5" />
                Chưa thu thập dữ liệu
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight m-0">
              SOP Preparation – Chuẩn bị SOP
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 m-0 max-w-3xl leading-relaxed">
              Chức năng phục vụ thu thập, kiểm chứng dữ liệu chuyên môn thực tế trước khi xây dựng SOP chính thức
              cho module Pilot Uốn Mi Bóng Tối.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-right">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Tiến độ thực hiện
              </div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Bước 1 / 1 Hạng mục
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category List */}
      <div className="grid grid-cols-1 gap-4">
        {/* Hạng mục 1 */}
        <Card
          variant="outlined"
          className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
          data-testid="sop-prep-category-1"
        >
          <div className="space-y-4">
            {/* Header of Category 1 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start sm:items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                  <AppIcon icon={ClipboardList} size={18} />
                </div>
                <div>
                  <h3
                    className="text-base font-bold text-slate-900 dark:text-slate-100 m-0"
                    data-testid="sop-prep-category-1-title"
                  >
                    Hạng mục 1 – Kiểm tra &amp; Đánh giá tình trạng mi thật
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Hạng mục chuyên môn nền tảng cho dịch vụ Pilot Uốn Mi Bóng Tối
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                  data-testid="sop-prep-category-1-status"
                >
                  <AppIcon icon={Clock} size={13} className="mr-1.5" />
                  Chưa thu thập dữ liệu ({totalEvidenceCount} tệp minh chứng)
                </span>
              </div>
            </div>

            {/* Content Details: Objective & Person in charge */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Mục tiêu */}
              <div className="md:col-span-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  <AppIcon icon={Sparkles} size={14} className="text-indigo-500" />
                  <span>Mục tiêu hạng mục</span>
                </div>
                <Paragraph
                  className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 m-0 leading-relaxed"
                  data-testid="sop-prep-category-1-objective"
                >
                  Thu thập thông tin về tình trạng mi thật của khách hàng, làm cơ sở xác định khách đủ hay không đủ điều kiện thực hiện dịch vụ Uốn Mi Bóng Tối.
                </Paragraph>
              </div>

              {/* Người phụ trách */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    <AppIcon icon={UserCheck} size={14} className="text-emerald-500" />
                    <span>Người phụ trách chuyên môn</span>
                  </div>
                  <div
                    className="text-sm font-bold text-slate-900 dark:text-slate-100"
                    data-testid="sop-prep-category-1-owner"
                  >
                    Cô Giang Phạm
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Chuyên gia cố vấn chuyên môn &amp; đào tạo
                  </div>
                </div>
              </div>
            </div>

            {/* Principles & Safeguards */}
            <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30 flex items-start gap-2.5">
              <AppIcon icon={Info} size={15} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                <span className="font-semibold">Nguyên tắc bắt buộc:</span> Chức năng mới độc lập hoàn toàn với tab SOP &amp; Đào tạo KTV. Không sao chép nội dung SOP do AI tạo; không tự tạo thông số kỹ thuật, tiêu chuẩn PASS/FAIL hay dữ liệu minh chứng giả định.
              </div>
            </div>

            {/* Action Area: Chi tiết Hạng mục 1 & Thu thập 5 tiêu chí */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <AppIcon icon={Shield} size={14} className="text-slate-400" />
                <span>Khu vực thu thập kiến thức chuyên môn, phương pháp &amp; tệp minh chứng 5 tiêu chí</span>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <Button
                  icon={<AppIcon icon={FolderOpen} size={14} />}
                  onClick={() => setDetailModalOpen(true)}
                  className="rounded-xl font-medium text-xs sm:text-sm h-8 px-3 flex items-center justify-center"
                  data-testid="sop-prep-category-1-detail-btn"
                >
                  Chi tiết Hạng mục 1
                </Button>

                <Button
                  type="primary"
                  icon={<AppIcon icon={FileEdit} size={14} />}
                  onClick={() => setSubView('cat1-detail')}
                  className="rounded-xl font-medium text-xs sm:text-sm h-8 px-3.5 bg-indigo-600 hover:bg-indigo-700 border-none shadow-sm flex items-center justify-center"
                  data-testid="sop-prep-open-workspace-btn"
                >
                  Nhập liệu &amp; Minh chứng 5 tiêu chí
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Modal for Chi tiết Hạng mục 1 Overview / Placeholder */}
      <AdaptiveModal
        intent="detail"
        title={
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <AppIcon icon={ClipboardList} size={18} className="text-indigo-600 dark:text-indigo-400" />
            <span>Chi tiết Hạng mục 1 – Kiểm tra &amp; Đánh giá tình trạng mi thật</span>
          </div>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={[
          <Button
            key="close"
            onClick={() => setDetailModalOpen(false)}
            className="rounded-xl font-medium"
          >
            Đóng
          </Button>,
          <Button
            key="workspace"
            type="primary"
            icon={<AppIcon icon={ArrowRight} size={14} />}
            onClick={() => {
              setDetailModalOpen(false);
              setSubView('cat1-detail');
            }}
            className="rounded-xl font-medium bg-indigo-600 hover:bg-indigo-700 border-none"
            data-testid="open-workspace-from-modal"
          >
            Mở Biểu Mẫu Nhập Liệu &amp; Thu Thập Minh Chứng 5 Tiêu Chí
          </Button>,
        ]}
        className="rounded-2xl"
      >
        <div className="space-y-3.5 py-2">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Mục tiêu
            </div>
            <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              Thu thập thông tin về tình trạng mi thật của khách hàng, làm cơ sở xác định khách đủ hay không đủ điều kiện thực hiện dịch vụ Uốn Mi Bóng Tối.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Người phụ trách
              </div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Cô Giang Phạm
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Trạng thái
              </div>
              <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                Chưa thu thập dữ liệu
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-900/30">
            <div className="flex items-start gap-2">
              <AppIcon icon={Info} size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
                Khu vực này đã được định vị và liên kết để phát triển chức năng biểu mẫu nhập liệu và thu thập dữ liệu lâm sàng ở bước tiếp theo theo đúng phê duyệt của Project Owner.
              </div>
            </div>
          </div>
        </div>
      </AdaptiveModal>
    </div>
  );
}
