'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Card, Form, Input, Popconfirm, Progress, Radio, Tooltip, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AlertTriangle,
  Award,
  Camera,
  CheckCircle,
  Clock,
  Edit,
  HeartHandshake,
  Package,
  Image as ImageIcon,
  Phone,
  Plus,
  RotateCw,
  Search,
  Sparkles,
  Star,
  Target,
  Trash2,
  User,
  Wallet,
} from 'lucide-react';
import dayjs from 'dayjs';
import type {
  CreatePilotSessionRequest,
  DarkLashesSessionStatus,
  PilotFollowUpStatus,
  PilotMaterial,
  PilotMetricsSummary,
  PilotSession,
  UpdatePilotSessionRequest,
} from '@mos-lab/shared';
import { apiClient, resolveMediaUrl } from '../../../lib/api-client';
import { AppIcon } from '../../../components/ui/AppIcon';
import { StatCard } from '../../../components/ui/StatCard';
import { DataTable } from '../../../components/ui/DataTable';
import { CopyPhoneButton } from '../../../components/ui/CopyPhoneButton';
import { PilotSessionDrawer } from './components/PilotSessionDrawer';
import { PilotFollowUpDrawer } from './components/PilotFollowUpDrawer';
import { PilotMaterialModal } from './components/PilotMaterialModal';
import { PilotFlowDrawer } from './components/PilotFlowDrawer';

const { Title } = Typography;

function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PilotDarkLashesPage() {
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<PilotSession[]>([]);
  const [metrics, setMetrics] = useState<PilotMetricsSummary | null>(null);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_24H' | 'PENDING_72H' | 'DONE'>('ALL');
  const [opStatusFilter, setOpStatusFilter] = useState<'ALL' | 'IN_SHOP' | 'CHECKED_OUT'>('ALL');

  // Drawers & Modals
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<PilotSession | null>(null);
  const [followUpDrawerOpen, setFollowUpDrawerOpen] = useState(false);
  const [selectedFollowUpSession, setSelectedFollowUpSession] = useState<PilotSession | null>(null);
  const [materialsCatalog, setMaterialsCatalog] = useState<PilotMaterial[]>([]);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [flowDrawerOpen, setFlowDrawerOpen] = useState(false);
  const [selectedFlowSession, setSelectedFlowSession] = useState<PilotSession | null>(null);

  const [form] = Form.useForm();
  const [followUpForm] = Form.useForm();

  const fetchPilotData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.pilot.listSessions({ pilotCode: 'DARK_LASHES' });
      setSessions(res.sessions || []);
      setMetrics(res.metrics || null);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể tải dữ liệu pilot Uốn Mi Bóng Tối.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMaterials = useCallback(async () => {
    try {
      const mats = await apiClient.pilot.listMaterials({ pilotCode: 'DARK_LASHES' });
      setMaterialsCatalog(mats || []);
    } catch (err: any) {
      console.error('Error fetching materials:', err);
    }
  }, []);

  useEffect(() => {
    fetchPilotData();
    fetchMaterials();
  }, [fetchPilotData, fetchMaterials]);

  // Open drawer for Create
  const handleOpenCreate = () => {
    setEditingSession(null);
    form.resetFields();
    form.setFieldsValue({
      pilotCode: 'DARK_LASHES',
      branchCode: 'detham',
      sessionDate: dayjs().format('YYYY-MM-DD'),
      technicianName: 'Cô Đẫm',
      revenue: 990000,
      materialCost: 50000,
      technicianCost: 150000,
      commissionAmount: 50000,
      promoAmount: 0,
      refundAmount: 0,
      followUp24hStatus: 'PENDING',
      followUp72hStatus: 'PENDING',
      source: 'Facebook',
      materials: [],
    });
    setCreateDrawerOpen(true);
  };

  // Open drawer for Edit
  const handleOpenEdit = (session: PilotSession) => {
    setEditingSession(session);
    form.resetFields();
    form.setFieldsValue({
      customerName: session.customerName,
      customerPhone: session.customerPhone,
      sessionDate: session.sessionDate,
      technicianName: session.technicianName,
      revenue: session.revenue,
      materialCost: session.materialCost,
      technicianCost: session.technicianCost,
      commissionAmount: session.commissionAmount,
      promoAmount: session.promoAmount,
      refundAmount: session.refundAmount,
      followUp24hStatus: session.followUp24hStatus,
      followUp72hStatus: session.followUp72hStatus,
      csatScore: session.csatScore,
      issues: session.issues,
      notes: session.notes,
      source: session.source,
      materials:
        session.materials?.map((m) => ({
          materialId: m.materialId,
          usageAmount: m.usageAmount,
        })) || [],
    });
    setCreateDrawerOpen(true);
  };

  // Open Fast Follow-up Drawer
  const handleOpenFollowUp = (session: PilotSession) => {
    setSelectedFollowUpSession(session);
    followUpForm.resetFields();
    followUpForm.setFieldsValue({
      followUp24hStatus: session.followUp24hStatus,
      followUp72hStatus: session.followUp72hStatus,
      csatScore: session.csatScore ?? 5,
      issues: session.issues || '',
      notes: session.notes || '',
    });
    setFollowUpDrawerOpen(true);
  };

  // Submit Create or Edit Form
  const handleSubmitSession = async () => {
    try {
      const values = await form.validateFields();
      if (editingSession) {
        await apiClient.pilot.updateSession(editingSession.id, values as UpdatePilotSessionRequest);
        message.success('Cập nhật ca dịch vụ pilot thành công!');
      } else {
        await apiClient.pilot.createSession(values as CreatePilotSessionRequest);
        message.success('Thêm mới ca dịch vụ pilot thành công!');
      }
      setCreateDrawerOpen(false);
      fetchPilotData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Lỗi khi lưu ca dịch vụ pilot.');
    }
  };

  // Submit Fast Follow-up Form
  const handleSubmitFollowUp = async () => {
    if (!selectedFollowUpSession) return;
    try {
      const values = await followUpForm.validateFields();
      await apiClient.pilot.updateSession(selectedFollowUpSession.id, values);
      message.success('Cập nhật trạng thái chăm sóc & CSAT thành công!');
      setFollowUpDrawerOpen(false);
      fetchPilotData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Lỗi khi cập nhật follow-up.');
    }
  };

  // Delete session
  const handleDeleteSession = async (id: number) => {
    try {
      await apiClient.pilot.deleteSession(id);
      message.success('Đã xóa ca pilot.');
      fetchPilotData();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể xóa ca pilot.');
    }
  };

  const handleOpenFlow = (session: PilotSession) => {
    setSelectedFlowSession(session);
    setFlowDrawerOpen(true);
  };

  const handleFlowSessionUpdated = (updated: PilotSession) => {
    setSelectedFlowSession(updated);
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    fetchPilotData();
  };

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchSearch =
        !searchText.trim() ||
        s.customerName.toLowerCase().includes(searchText.trim().toLowerCase()) ||
        s.customerPhone.includes(searchText.trim()) ||
        (s.technicianName && s.technicianName.toLowerCase().includes(searchText.trim().toLowerCase()));

      let matchStatus = true;
      if (statusFilter === 'PENDING_24H') {
        matchStatus = s.followUp24hStatus === 'PENDING';
      } else if (statusFilter === 'PENDING_72H') {
        matchStatus = s.followUp72hStatus === 'PENDING';
      } else if (statusFilter === 'DONE') {
        matchStatus = s.followUp24hStatus === 'DONE' && s.followUp72hStatus === 'DONE';
      }

      let matchOp = true;
      const op = s.status || 'BOOKED';
      if (opStatusFilter === 'IN_SHOP') {
        matchOp = op !== 'BOOKED' && op !== 'CHECKED_OUT';
      } else if (opStatusFilter === 'CHECKED_OUT') {
        matchOp = op === 'CHECKED_OUT';
      }

      return matchSearch && matchStatus && matchOp;
    });
  }, [sessions, searchText, statusFilter, opStatusFilter]);

  // Columns definition
  const columns: ColumnsType<PilotSession> = [
    {
      title: 'Ngày làm',
      dataIndex: 'sessionDate',
      key: 'sessionDate',
      width: 105,
      render: (val: string, r) => (
        <div className="flex flex-col">
          <span className="tabular-nums font-medium text-xs">{val ? dayjs(val).format('DD/MM/YYYY') : '--'}</span>
          {r.bookingTime && (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {r.bookingTime}
            </span>
          )}
        </div>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 190,
      render: (_, r) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-sm leading-tight text-slate-800 dark:text-slate-100">
            {r.customerName}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="tabular-nums">{r.customerPhone}</span>
            <CopyPhoneButton phone={r.customerPhone} size="xs" />
            {r.source && (
              <span className="inline-flex items-center text-[10px] leading-tight px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                {r.source}
              </span>
            )}
          </div>
          {r.bookingNote && (
            <div className="text-[11px] text-slate-400 truncate max-w-[170px]" title={r.bookingNote}>
              📝 {r.bookingNote}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Tiến trình (7 bước)',
      key: 'opStatus',
      width: 175,
      render: (_, r) => {
        const status = r.status || 'BOOKED';
        const labels: Record<DarkLashesSessionStatus, { text: string; color: string; badge: string }> = {
          BOOKED: {
            text: '1. Đã đặt lịch',
            color: 'blue',
            badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          },
          CHECKED_IN: {
            text: '2. Đã đến shop',
            color: 'cyan',
            badge: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
          },
          BEFORE_PHOTO: {
            text: '3. Đã chụp Before',
            color: 'purple',
            badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
          },
          SERVICE_DONE: {
            text: '4. Làm xong',
            color: 'gold',
            badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
          },
          AFTER_PHOTO: {
            text: '5. Đã chụp After',
            color: 'geekblue',
            badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
          },
          FEEDBACK_DONE: {
            text: '6. Đã feedback',
            color: 'orange',
            badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
          },
          CHECKED_OUT: {
            text: '7. Đã check-out',
            color: 'emerald',
            badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
          },
        };
        const cfg = labels[status] || labels.BOOKED;

        return (
          <div className="flex flex-col gap-1.5 items-start">
            <span
              className={`inline-flex items-center justify-center leading-none px-2 py-1 rounded-md text-xs font-semibold border ${cfg.badge}`}
            >
              {cfg.text}
            </span>
            <Button
              size="small"
              type="primary"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg h-7 px-2.5 flex items-center gap-1 shadow-sm"
              onClick={() => handleOpenFlow(r)}
            >
              <AppIcon icon={Camera} size="sm" />
              <span>Vận hành ca</span>
            </Button>
          </div>
        );
      },
    },
    {
      title: 'Ảnh Before / After',
      key: 'photos',
      width: 140,
      render: (_, r) => {
        if (!r.beforePhotoUrl && !r.afterPhotoUrl) {
          return <span className="text-slate-400 text-xs">Chưa có ảnh</span>;
        }

        return (
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => handleOpenFlow(r)}>
            {r.beforePhotoUrl ? (
              <Tooltip title="Xem ảnh Before">
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 shrink-0">
                  <img src={resolveMediaUrl(r.beforePhotoUrl)} alt="Before" className="w-full h-full object-cover" />
                </div>
              </Tooltip>
            ) : (
              <div className="w-10 h-10 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400 shrink-0">
                Tr
              </div>
            )}

            {r.afterPhotoUrl ? (
              <Tooltip title="Xem ảnh After">
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-emerald-300 dark:border-emerald-700 bg-slate-900 shrink-0">
                  <img src={resolveMediaUrl(r.afterPhotoUrl)} alt="After" className="w-full h-full object-cover" />
                </div>
              </Tooltip>
            ) : (
              <div className="w-10 h-10 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400 shrink-0">
                Sau
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Thời lượng',
      key: 'duration',
      width: 110,
      render: (_, r) => {
        if (r.totalDurationMinutes) {
          return (
            <div className="flex flex-col">
              <span className="tabular-nums font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                {r.totalDurationMinutes} phút
              </span>
              <span className="text-[10px] text-slate-400">Total Visit</span>
            </div>
          );
        }
        if (r.checkInAt) {
          return (
            <span className="inline-flex items-center text-[11px] text-cyan-600 dark:text-cyan-400 font-medium">
              Đang làm...
            </span>
          );
        }
        return <span className="text-slate-400 text-xs">--</span>;
      },
    },
    {
      title: 'Kỹ thuật viên',
      dataIndex: 'technicianName',
      key: 'technicianName',
      width: 130,
      render: (val: string) => (
        <span className="inline-flex items-center justify-center leading-none px-2 py-1 rounded-md font-medium border border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-xs">
          <AppIcon icon={User} size="sm" className="mr-1" />
          {val || 'Chưa gán'}
        </span>
      ),
    },
    {
      title: 'Doanh thu',
      dataIndex: 'revenue',
      key: 'revenue',
      width: 120,
      align: 'right',
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">{formatVND(val)}</span>
      ),
    },
    {
      title: 'Chi phí trực tiếp',
      key: 'directCost',
      width: 150,
      align: 'right',
      render: (_, r) => (
        <Tooltip
          title={
            <div className="text-xs space-y-1.5 p-1 max-w-xs">
              <div className="border-b border-slate-700 dark:border-slate-600 pb-1">
                <div className="font-semibold text-emerald-400">Vật tư tiêu hao: {formatVND(r.materialCost)}</div>
                {r.materials && r.materials.length > 0 && (
                  <div className="mt-1 pl-1 space-y-0.5 text-[11px] text-slate-300">
                    {r.materials.map((m) => (
                      <div key={m.id} className="flex justify-between gap-2">
                        <span>
                          • {m.materialName} ({m.usageAmount} {m.unit}):
                        </span>
                        <span className="tabular-nums font-medium text-slate-200">
                          {formatVND(m.calculatedCost ?? 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-0.5">
                <div>Kỹ thuật: {formatVND(r.technicianCost)}</div>
                <div>Commission: {formatVND(r.commissionAmount)}</div>
                <div>Voucher/Promo: {formatVND(r.promoAmount)}</div>
                {r.refundAmount > 0 && <div>Đền bù/Refund: {formatVND(r.refundAmount)}</div>}
              </div>
            </div>
          }
        >
          <div className="cursor-pointer">
            <span className="tabular-nums font-medium text-slate-600 dark:text-slate-300 underline decoration-dotted">
              {formatVND(r.totalDirectCost)}
            </span>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Contribution Margin',
      key: 'contribution',
      width: 160,
      align: 'right',
      render: (_, r) => {
        const marginPct = r.revenue > 0 ? Math.round((r.contributionMargin / r.revenue) * 100) : 0;
        const isPositive = r.contributionMargin > 0;
        return (
          <div className="flex flex-col items-end">
            <span
              className={`tabular-nums font-bold ${
                isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatVND(r.contributionMargin)}
            </span>
            <span className="text-[11px] tabular-nums font-medium text-slate-400">{marginPct}% doanh thu</span>
          </div>
        );
      },
    },
    {
      title: 'CSAT',
      dataIndex: 'csatScore',
      key: 'csatScore',
      width: 100,
      align: 'center',
      render: (score: number | null) => {
        if (!score) return <span className="text-slate-400 text-xs">Chưa chấm</span>;
        return (
          <div className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-2 py-0.5 rounded-full">
            <AppIcon icon={Star} size="sm" className="text-amber-500 fill-amber-500" />
            <span className="tabular-nums font-bold text-xs text-amber-700 dark:text-amber-300">{score}.0</span>
          </div>
        );
      },
    },
    {
      title: 'Follow-up 24h',
      dataIndex: 'followUp24hStatus',
      key: 'followUp24hStatus',
      width: 120,
      render: (status: PilotFollowUpStatus) => {
        if (status === 'DONE') {
          return (
            <span className="inline-flex items-center justify-center leading-none px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              <AppIcon icon={CheckCircle} size="sm" className="mr-1" /> Đã gọi 24h
            </span>
          );
        }
        if (status === 'SKIPPED') {
          return (
            <span className="text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs">Bỏ qua</span>
          );
        }
        return (
          <span className="inline-flex items-center justify-center leading-none px-2 py-1 rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-medium text-xs">
            <AppIcon icon={Clock} size="sm" className="mr-1" /> Chờ gọi 24h
          </span>
        );
      },
    },
    {
      title: 'Follow-up 72h',
      dataIndex: 'followUp72hStatus',
      key: 'followUp72hStatus',
      width: 120,
      render: (status: PilotFollowUpStatus) => {
        if (status === 'DONE') {
          return (
            <span className="inline-flex items-center justify-center leading-none px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              <AppIcon icon={CheckCircle} size="sm" className="mr-1" /> Đã gọi 72h
            </span>
          );
        }
        if (status === 'SKIPPED') {
          return (
            <span className="text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs">Bỏ qua</span>
          );
        }
        return (
          <span className="inline-flex items-center justify-center leading-none px-2 py-1 rounded-md border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-medium text-xs">
            <AppIcon icon={AlertTriangle} size="sm" className="mr-1 text-rose-500" /> Chờ gọi 72h
          </span>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      render: (_, r) => (
        <div className="flex items-center gap-1">
          <Tooltip title="Mở Flow Vận Hành 7 Bước (Chụp ảnh, Feedback, Check-out)">
            <Button
              type="text"
              size="small"
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              icon={<AppIcon icon={Camera} size="sm" />}
              onClick={() => handleOpenFlow(r)}
            />
          </Tooltip>
          <Tooltip title="Chăm sóc & Đánh giá CSAT">
            <Button
              type="text"
              size="small"
              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              icon={<AppIcon icon={HeartHandshake} size="sm" />}
              onClick={() => handleOpenFollowUp(r)}
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa ca">
            <Button
              type="text"
              size="small"
              className="text-slate-600 hover:text-slate-900 dark:text-slate-300"
              icon={<AppIcon icon={Edit} size="sm" />}
              onClick={() => handleOpenEdit(r)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa ca pilot này?"
            description="Bạn có chắc chắn muốn xóa bản ghi ca dịch vụ này không?"
            onConfirm={() => handleDeleteSession(r.id)}
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
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header Banner */}
      <div className="rounded-2xl p-6 relative overflow-hidden border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent transition-all duration-300 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <AppIcon icon={Sparkles} size="sm" className="mr-1" />
                Wings Lashes Đề Thám
              </span>
              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Pilot 30 Ngày (Mục tiêu 1 ca/ngày)
              </span>
              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                Commercial: Danny · Technical: Cô Đẫm
              </span>
            </div>
            <Title level={2} className="!mb-1 !text-slate-900 dark:!text-slate-100 tracking-tight">
              Pilot Uốn Mi Bóng Tối
            </Title>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl m-0">
              Công cụ đo lường Unit Economics và mức độ hài lòng khách hàng sau 30 ngày. Tự động tính Contribution
              Margin từng ca và điều phối follow-up 24h–72h.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              icon={<AppIcon icon={RotateCw} size="sm" className={loading ? 'animate-spin' : ''} />}
              onClick={fetchPilotData}
              className="rounded-xl font-medium"
            >
              Làm mới
            </Button>
            <Button
              icon={<AppIcon icon={Package} size="sm" />}
              onClick={() => setMaterialModalOpen(true)}
              className="rounded-xl font-medium border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              Danh mục vật tư
            </Button>
            <Button
              type="primary"
              icon={<AppIcon icon={Plus} size="sm" />}
              onClick={handleOpenCreate}
              className="rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 border-none shadow-md shadow-emerald-500/20 text-white"
            >
              Thêm ca dịch vụ mới
            </Button>
          </div>
        </div>
      </div>

      {/* Top 5 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Card 1: Target Progress */}
        <StatCard
          title="Tiến độ Pilot 30 Ngày"
          value={
            <div className="flex items-baseline gap-1.5">
              <span>{metrics?.completedSessions ?? 0}</span>
              <span className="text-xs font-medium text-slate-400">/ {metrics?.targetSessions ?? 30} ca</span>
            </div>
          }
          icon={<AppIcon icon={Target} size="md" className="text-emerald-500" />}
          subValue={
            <div className="w-full mt-1.5">
              <Progress percent={metrics?.progressPercent ?? 0} size="small" showInfo={false} />
            </div>
          }
          trendText={`Đạt ${metrics?.progressPercent ?? 0}% mục tiêu pilot`}
          trend="up"
        />

        {/* Card 2: Contribution & Unit Economics */}
        <StatCard
          title="Tổng Contribution Margin"
          value={formatVND(metrics?.totalContribution ?? 0)}
          icon={<AppIcon icon={Wallet} size="md" className="text-blue-500" />}
          subValue={
            <div className="text-xs text-slate-500 flex flex-col gap-0.5 mt-0.5">
              <span>Doanh thu: {formatVND(metrics?.totalRevenue ?? 0)}</span>
              <span>CP trực tiếp: {formatVND(metrics?.totalDirectCost ?? 0)}</span>
            </div>
          }
          trendText={`Margin TB: ${metrics?.avgContributionMarginPct ?? 0}% (${formatVND(
            metrics?.avgContributionPerSession ?? 0
          )}/ca)`}
          trend="up"
        />

        {/* Card 3: Consumables Cost Per Done */}
        <StatCard
          title="Vật tư / Done"
          value={formatVND(metrics?.avgConsumablesCostPerSession ?? 0)}
          icon={<AppIcon icon={Package} size="md" className="text-teal-500" />}
          subValue={
            <div className="text-xs text-slate-500 flex flex-col gap-0.5 mt-0.5">
              <span>Tổng CP vật tư: {formatVND(metrics?.totalConsumablesCost ?? 0)}</span>
              <span>Đo lường chi phí thực tế / ca</span>
            </div>
          }
          trendText="Mục tiêu 7 ngày: Chốt Avg Direct Cost / Done"
          trend="neutral"
        />

        {/* Card 3: Satisfaction (CSAT) */}
        <StatCard
          title="Chỉ số Hài lòng (CSAT)"
          value={
            metrics?.avgCsat && metrics.avgCsat > 0 ? (
              <div className="flex items-center gap-1.5 text-amber-500">
                <span>{metrics.avgCsat}</span>
                <span className="text-xs font-normal text-slate-400">/ 5.0 ⭐</span>
              </div>
            ) : (
              <span className="text-slate-400 text-lg">Chưa có</span>
            )
          }
          icon={<AppIcon icon={Award} size="md" className="text-amber-500" />}
          subValue={
            <div className="flex items-center gap-1 mt-1">
              <span className="text-amber-400 text-xs font-medium">
                {metrics?.avgCsat ? `${metrics.avgCsat} ⭐` : 'Chưa đánh giá'}
              </span>
            </div>
          }
          trendText={`Đã đánh giá: ${metrics?.ratedSessionsCount ?? 0} / ${metrics?.completedSessions ?? 0} ca`}
        />

        {/* Card 4: Follow-up & Care Alerts */}
        <StatCard
          title="Nhắc việc Follow-up"
          value={
            <div className="flex items-center gap-2">
              <span>{metrics?.totalPendingFollowUpCount ?? 0}</span>
              <span className="text-xs font-medium text-slate-400">ca cần chăm sóc</span>
            </div>
          }
          icon={<AppIcon icon={Phone} size="md" className="text-rose-500" />}
          subValue={
            <div className="flex items-center gap-2 text-xs mt-1">
              <span
                className={`px-1.5 py-0.5 rounded font-medium ${
                  (metrics?.pendingFollowUp24hCount ?? 0) > 0
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                    : 'text-slate-400'
                }`}
              >
                24h: {metrics?.pendingFollowUp24hCount ?? 0}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded font-medium ${
                  (metrics?.pendingFollowUp72hCount ?? 0) > 0
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200'
                    : 'text-slate-400'
                }`}
              >
                72h: {metrics?.pendingFollowUp72hCount ?? 0}
              </span>
            </div>
          }
          trendText={
            (metrics?.totalPendingFollowUpCount ?? 0) === 0
              ? 'Tất cả ca đã được chăm sóc'
              : 'Ưu tiên liên hệ khách đúng hạn'
          }
          trend={(metrics?.totalPendingFollowUpCount ?? 0) === 0 ? 'up' : 'down'}
        />
      </div>

      {/* Main Table Card */}
      <Card variant="outlined" className="rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        {/* Table Filters & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              placeholder="Tìm theo tên KH, SĐT, KTV..."
              prefix={<AppIcon icon={Search} size="sm" className="text-slate-400" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-64 rounded-xl"
              allowClear
            />
            <Radio.Group
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              buttonStyle="solid"
              className="rounded-xl"
            >
              <Radio.Button value="ALL">Tất cả ({sessions.length})</Radio.Button>
              <Radio.Button value="PENDING_24H">Chờ 24h ({metrics?.pendingFollowUp24hCount ?? 0})</Radio.Button>
              <Radio.Button value="PENDING_72H">Chờ 72h ({metrics?.pendingFollowUp72hCount ?? 0})</Radio.Button>
              <Radio.Button value="DONE">Hoàn tất chăm sóc</Radio.Button>
            </Radio.Group>

            <Radio.Group
              value={opStatusFilter}
              onChange={(e) => setOpStatusFilter(e.target.value)}
              buttonStyle="solid"
              className="rounded-xl"
            >
              <Radio.Button value="ALL">Mọi tiến trình</Radio.Button>
              <Radio.Button value="IN_SHOP">Đang tại shop</Radio.Button>
              <Radio.Button value="CHECKED_OUT">Đã check-out</Radio.Button>
            </Radio.Group>
          </div>

          <div className="text-xs text-slate-500 tabular-nums">
            Hiển thị <span className="font-semibold">{filteredSessions.length}</span> ca dịch vụ
          </div>
        </div>

        {/* Data Table */}
        <DataTable<PilotSession>
          columns={columns}
          dataSource={filteredSessions}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            pageSizeOptions: ['15', '30', '50'],
            showTotal: (total) => `Tổng cộng ${total} ca`,
          }}
          scroll={{ x: 1200 }}
          className="rounded-xl"
        />
      </Card>

      {/* Drawers & Modals */}
      <PilotSessionDrawer
        open={createDrawerOpen}
        isEditing={Boolean(editingSession)}
        form={form}
        materialsCatalog={materialsCatalog}
        onClose={() => setCreateDrawerOpen(false)}
        onSubmit={handleSubmitSession}
      />
      <PilotFollowUpDrawer
        open={followUpDrawerOpen}
        session={selectedFollowUpSession}
        form={followUpForm}
        onClose={() => setFollowUpDrawerOpen(false)}
        onSubmit={handleSubmitFollowUp}
      />
      <PilotMaterialModal
        open={materialModalOpen}
        materials={materialsCatalog}
        onClose={() => setMaterialModalOpen(false)}
        onRefresh={fetchMaterials}
      />
      <PilotFlowDrawer
        open={flowDrawerOpen}
        session={selectedFlowSession}
        onClose={() => setFlowDrawerOpen(false)}
        onSessionUpdated={handleFlowSessionUpdated}
      />
    </div>
  );
}
