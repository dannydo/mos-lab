'use client';

import React, { useState, useEffect } from 'react';
import { Space, Button, Select, Tooltip, message, Row, Col } from 'antd';
import { Phone, Calendar, User, RotateCw, Users, Loader2 } from 'lucide-react';
import {
  TelesalePipelineStageKey,
  TelesaleCustomerPoolItem,
  TelesaleCustomerPoolResponse,
  TelesalePipelineStage,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { CopyPhoneButton, AdaptiveDrawer } from '../../../../components/ui';

interface CustomerPoolDrawerProps {
  open: boolean;
  onClose: () => void;
  stage: TelesalePipelineStage | null;
  currentUserRole?: string;
  currentStaffId?: number;
  staffList?: Array<{ legacyStaffId: number; name: string }>;
}

export const CustomerPoolDrawer: React.FC<CustomerPoolDrawerProps> = ({
  open,
  onClose,
  stage,
  currentUserRole = 'admin',
  currentStaffId,
  staffList = [],
}) => {
  const [loading, setLoading] = useState(false);
  const [poolData, setPoolData] = useState<TelesaleCustomerPoolResponse | null>(null);
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('ALL');

  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'superadmin' || currentUserRole === 'manager';

  const fetchPool = async () => {
    if (!stage) return;
    setLoading(true);
    try {
      const bookerParam = !isAdmin && currentStaffId ? String(currentStaffId) : selectedStaffFilter;
      const res = await apiClient.telesaleTarget.getCustomerPool({
        stage: stage.key,
        bookerId: bookerParam !== 'ALL' ? bookerParam : undefined,
        limit: 50,
      });
      setPoolData(res);
    } catch {
      message.error('Không thể tải danh sách khách hàng trong pool');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && stage) {
      fetchPool();
    }
  }, [open, stage, selectedStaffFilter]);

  const handleMakeCall = (item: TelesaleCustomerPoolItem) => {
    message.success(`Đang kết nối cuộc gọi OmiCall đến ${item.customerName} (${item.phone})...`);
    if (typeof window !== 'undefined' && (window as any).makeOmiCall) {
      (window as any).makeOmiCall(item.phone);
    }
  };

  const getStageDotClass = (key: TelesalePipelineStageKey) => {
    switch (key) {
      case '0_30':
        return 'bg-emerald-500';
      case '31_60':
        return 'bg-blue-500';
      case '61_120':
        return 'bg-amber-500';
      case 'gt_120':
        return 'bg-pink-500';
    }
  };

  return (
    <AdaptiveDrawer
      open={open}
      onClose={onClose}
      width={780}
      title={
        stage && (
          <div className="flex items-center justify-between w-full pr-4">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${getStageDotClass(stage.key)}`} />
              <span className="font-bold text-zinc-100 text-base">
                Pool Data: {stage.label} — {stage.stageName}
              </span>
            </div>
            {stage.badge && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {stage.badge}
              </span>
            )}
          </div>
        )
      }
      className="telesale-pool-drawer"
    >
      {stage && (
        <div className="space-y-4 p-4">
          {/* Top Quick Stats */}
          <div className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-xl shadow-inner">
            <Row gutter={16} align="middle">
              <Col span={6}>
                <div className="text-zinc-400 text-xs">Mục tiêu Done</div>
                <div className="text-xl font-bold font-mono text-amber-400 tabular-nums">
                  {stage.doneTarget} <span className="text-xs text-zinc-500 font-normal">Done</span>
                </div>
              </Col>
              <Col span={6}>
                <div className="text-zinc-400 text-xs">Đã đạt tháng 10</div>
                <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                  {stage.doneActual} <span className="text-xs text-zinc-500 font-normal">Done</span>
                </div>
              </Col>
              <Col span={6}>
                <div className="text-zinc-400 text-xs">Tổng data chu kỳ</div>
                <div className="text-xl font-bold font-mono text-blue-400 tabular-nums">
                  {poolData?.total || stage.totalAssignedCount}{' '}
                  <span className="text-xs text-zinc-500 font-normal">KH</span>
                </div>
              </Col>
              <Col span={6}>
                <div className="text-zinc-400 text-xs">Tỷ lệ hoàn thành</div>
                <div className="text-xl font-bold font-mono text-zinc-100 tabular-nums">
                  {stage.doneTarget > 0 ? ((stage.doneActual / stage.doneTarget) * 100).toFixed(1) : 0}%
                </div>
              </Col>
            </Row>

            <div className="mt-3 pt-2.5 border-t border-zinc-800/80 text-xs text-zinc-400 flex items-center justify-between">
              <div>
                💡 <span className="italic">{stage.actionNote}</span>
              </div>
              <Button
                type="text"
                size="small"
                icon={<RotateCw className="w-3.5 h-3.5 text-zinc-400" />}
                onClick={fetchPool}
                className="text-zinc-400 hover:text-amber-400"
              >
                Làm mới
              </Button>
            </div>
          </div>

          {/* Admin Booker Filter */}
          {isAdmin && (
            <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800/80 px-3.5 py-2.5 rounded-lg">
              <div className="flex items-center gap-2 text-zinc-300 text-xs font-medium">
                <Users className="w-4 h-4 text-amber-400" /> Phân quyền xem data:
              </div>
              <Select
                value={selectedStaffFilter}
                onChange={setSelectedStaffFilter}
                className="w-56 custom-staff-select"
                size="small"
                options={[
                  { label: '🌟 Tất cả đã phân bổ (Team Pool)', value: 'ALL' },
                  ...(staffList && staffList.length > 0
                    ? staffList.map((s) => ({
                        label: `${s.name} (${s.legacyStaffId})`,
                        value: String(s.legacyStaffId),
                      }))
                    : [
                        { label: 'Phượng (50670)', value: '50670' },
                        { label: 'Kiều (52648)', value: '52648' },
                        { label: 'Điệp (32268)', value: '32268' },
                        { label: 'Vũ (52598)', value: '52598' },
                      ]),
                ]}
              />
            </div>
          )}

          {/* Customer Table */}
          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
            {loading ? (
              <div className="p-8 flex items-center justify-center text-amber-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/70 text-zinc-400 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Khách hàng</th>
                      <th className="py-2.5 px-3">Số điện thoại</th>
                      <th className="py-2.5 px-3">Chu kỳ ghé</th>
                      <th className="py-2.5 px-3">Nhân sự</th>
                      <th className="py-2.5 px-3 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {poolData?.items && poolData.items.length > 0 ? (
                      poolData.items.map((r) => {
                        let tagBadge = 'bg-emerald-950/80 text-emerald-400 border-emerald-800';
                        if (r.daysSinceLastVisit > 120) tagBadge = 'bg-pink-950/80 text-pink-400 border-pink-800';
                        else if (r.daysSinceLastVisit > 60)
                          tagBadge = 'bg-amber-950/80 text-amber-400 border-amber-800';
                        else if (r.daysSinceLastVisit > 30) tagBadge = 'bg-blue-950/80 text-blue-400 border-blue-800';

                        return (
                          <tr key={r.customerId} className="hover:bg-zinc-900/40 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-zinc-100 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-zinc-500" />
                                {r.customerName}
                              </div>
                              <div className="text-[11px] text-zinc-500">ID: {r.customerId}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-zinc-200">{r.phone || 'Chưa có'}</span>
                                {r.phone && <CopyPhoneButton phone={r.phone} />}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded border text-[11px] font-mono ${tagBadge}`}
                              >
                                {r.daysSinceLastVisit > 365 ? '> 1 năm' : `${r.daysSinceLastVisit} ngày trước`}
                              </span>
                              <div className="text-[11px] text-zinc-500 mt-0.5">
                                {r.lastVisitDate ? `Gần nhất: ${r.lastVisitDate}` : 'Chưa có lịch'}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="inline-block px-2 py-0.5 rounded bg-zinc-800 text-amber-300 font-medium">
                                {r.assignedStaffName}
                              </span>
                              <div className="text-[11px] text-zinc-500 mt-0.5">CN: {r.store}</div>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <Space>
                                <Tooltip title={`Gọi OmiCall cho ${r.customerName}`}>
                                  <Button
                                    type="primary"
                                    size="small"
                                    icon={<Phone className="w-3.5 h-3.5" />}
                                    onClick={() => handleMakeCall(r)}
                                    className="bg-emerald-600 hover:bg-emerald-500 border-0 flex items-center"
                                  >
                                    Gọi
                                  </Button>
                                </Tooltip>
                                <Tooltip title="Tạo lịch hẹn mới">
                                  <Button
                                    size="small"
                                    icon={<Calendar className="w-3.5 h-3.5" />}
                                    onClick={() => {
                                      window.open(`/dashboard/customers?id=${r.customerId}&action=book`, '_blank');
                                    }}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700 flex items-center"
                                  >
                                    Đặt lịch
                                  </Button>
                                </Tooltip>
                              </Space>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-zinc-500">
                          Không tìm thấy khách hàng nào trong nhóm chu kỳ này
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </AdaptiveDrawer>
  );
};
