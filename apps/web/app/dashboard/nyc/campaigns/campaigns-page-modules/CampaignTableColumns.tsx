'use client';

import React from 'react';
import { Button, Popconfirm, Space, Switch, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Calendar,
  CheckCircle2,
  Copy,
  Eye,
  FolderArchive,
  Globe,
  Lock,
  PauseCircle,
  Pencil,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import dayjs from 'dayjs';
import type { Campaign, CampaignStatus } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';
import { CampaignStatusTag } from './CampaignStatusTag';
import { isCampaignVisibleInSidebar } from './campaignManagementUtils';

export interface BuildCampaignTableColumnsOptions {
  isAdmin: boolean;
  campaignVisibilityMap: Record<string, boolean>;
  onViewCampaign: (campaign: Campaign) => void;
  onEditCampaign: (campaign: Campaign) => void;
  onToggleCampaignSidebar: (campaign: Campaign, checked: boolean) => void;
  onPauseCampaign: (campaign: Campaign) => void;
  onResumeCampaign: (campaign: Campaign) => void;
  onCompleteCampaign: (campaign: Campaign) => void;
  onArchiveCampaign: (campaign: Campaign) => void;
  onUnarchiveCampaign: (campaign: Campaign) => void;
  onReopenCampaign: (campaign: Campaign) => void;
  onRestoreCampaign: (campaign: Campaign) => void;
  onCloneCampaign: (campaign: Campaign) => void;
  onDeleteCampaign: (campaign: Campaign) => void;
}

export function buildCampaignTableColumns({
  isAdmin,
  campaignVisibilityMap,
  onViewCampaign,
  onEditCampaign,
  onToggleCampaignSidebar,
  onPauseCampaign,
  onResumeCampaign,
  onCompleteCampaign,
  onArchiveCampaign,
  onUnarchiveCampaign,
  onReopenCampaign,
  onRestoreCampaign,
  onCloneCampaign,
  onDeleteCampaign,
}: BuildCampaignTableColumnsOptions): ColumnsType<Campaign> {
  return [
    {
      title: 'Tên chiến dịch',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Campaign) => (
        <div>
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-0 text-left font-bold text-amber-600 hover:underline dark:text-amber-400"
            onClick={() => onViewCampaign(record)}
          >
            {text}
          </button>
          <div className="font-mono text-xs text-slate-500">slug: {record.slug}</div>
          {record.description && <div className="mt-0.5 line-clamp-1 text-xs text-slate-400">{record.description}</div>}
        </div>
      ),
    },
    {
      title: 'Thời gian',
      key: 'dates',
      render: (_: unknown, record: Campaign) => {
        const start = record.startDate ? dayjs(record.startDate).format('DD/MM/YYYY') : 'Tùy chỉnh';
        const end = record.endDate ? dayjs(record.endDate).format('DD/MM/YYYY') : 'Không giới hạn';
        return (
          <div className="inline-flex items-center gap-1.5 text-xs tabular-nums">
            <AppIcon icon={Calendar} size={13} className="shrink-0 text-slate-400" />
            <span>
              {start} - {end}
            </span>
          </div>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: CampaignStatus) => <CampaignStatusTag status={status} />,
    },
    {
      title: 'Chế độ khai thác',
      key: 'operationMode',
      render: (_: unknown, record: Campaign) => {
        if (record.operationMode === 'SHARED_POOL') {
          return (
            <Tooltip title="Teamwork / Shared Pool: Khai thác theo Batch, Claim & Chống gọi trùng">
              <span>
                <StatusTag status="purple" icon={<AppIcon icon={Users} size={12} />} label="SHARED POOL" />
              </span>
            </Tooltip>
          );
        }
        return (
          <Tooltip title="Cá nhân: Data phân bổ riêng cho từng Booker">
            <span>
              <StatusTag status="cyan" icon={<AppIcon icon={User} size={12} />} label="CÁ NHÂN" />
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Quyền truy cập',
      key: 'access',
      render: (_: unknown, record: Campaign) => {
        const count = record.assignedStaffIds?.length || 0;
        if (count === 0) {
          return <StatusTag status="processing" icon={<AppIcon icon={Globe} size={12} />} label="Công khai (Tất cả)" />;
        }
        return (
          <Tooltip title={`Chỉ Admin và ${count} thành viên được gán mới có quyền xem`}>
            <span>
              <StatusTag
                status="purple"
                icon={<AppIcon icon={Lock} size={12} />}
                label={`Riêng tư (${count} thành viên)`}
              />
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Hiện Sidebar',
      key: 'showInSidebar',
      align: 'center' as const,
      render: (_: unknown, record: Campaign) => {
        const isShown = isCampaignVisibleInSidebar(record, campaignVisibilityMap);
        return (
          <Tooltip
            title={isShown ? 'Đang hiện link ở Sidebar (Click để ẩn)' : 'Đang ẩn link ở Sidebar (Click để hiện)'}
          >
            <Switch
              size="small"
              checked={isShown}
              aria-label={`Hiển thị chiến dịch ${record.name} ở Sidebar`}
              onChange={(checked) => onToggleCampaignSidebar(record, checked)}
              className="[&.ant-switch-checked]:bg-emerald-500"
            />
          </Tooltip>
        );
      },
    },
    {
      title: 'Tổng KH',
      key: 'totalCustomers',
      align: 'right' as const,
      render: (_: unknown, record: Campaign) => (
        <span className="font-semibold tabular-nums">{record._count?.customers ?? 0}</span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center' as const,
      width: 240,
      render: (_: unknown, record: Campaign) => (
        <Space size={4} align="center">
          <Tooltip title="Xem chi tiết chiến dịch">
            <Button
              type="primary"
              size="small"
              aria-label={`Xem chi tiết ${record.name}`}
              icon={<AppIcon icon={Eye} size={14} />}
              onClick={() => onViewCampaign(record)}
            />
          </Tooltip>
          {isAdmin && (
            <>
              {['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED'].includes(record.status) && (
                <Tooltip title="Chỉnh sửa chiến dịch">
                  <Button
                    size="small"
                    aria-label={`Chỉnh sửa ${record.name}`}
                    icon={<AppIcon icon={Pencil} size={14} />}
                    onClick={() => onEditCampaign(record)}
                  />
                </Tooltip>
              )}
              {['DRAFT', 'SCHEDULED', 'PAUSED'].includes(record.status) && (
                <Tooltip title={record.status === 'PAUSED' ? 'Tiếp tục chiến dịch' : 'Kích hoạt ngay'}>
                  <Button
                    size="small"
                    aria-label={record.status === 'PAUSED' ? `Tiếp tục ${record.name}` : `Kích hoạt ${record.name}`}
                    className="bg-emerald-600 text-white hover:bg-emerald-500"
                    icon={<AppIcon icon={PlayCircle} size={14} />}
                    onClick={() => onResumeCampaign(record)}
                  />
                </Tooltip>
              )}
              {record.status === 'ACTIVE' && (
                <Tooltip title="Tạm dừng chiến dịch">
                  <Button
                    size="small"
                    aria-label={`Tạm dừng ${record.name}`}
                    className="bg-amber-500 font-bold text-white hover:bg-amber-400"
                    icon={<AppIcon icon={PauseCircle} size={14} />}
                    onClick={() => onPauseCampaign(record)}
                  />
                </Tooltip>
              )}
              {['ACTIVE', 'PAUSED'].includes(record.status) && (
                <Popconfirm
                  title="Chốt / Hoàn thành chiến dịch?"
                  description="Khách hàng chưa booked sẽ được hoàn trả về NYC main pool."
                  onConfirm={() => onCompleteCampaign(record)}
                  okText="Chốt sổ"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title="Chốt & Hoàn thành">
                    <Button
                      size="small"
                      danger
                      aria-label={`Chốt và hoàn thành ${record.name}`}
                      icon={<AppIcon icon={CheckCircle2} size={14} />}
                    />
                  </Tooltip>
                </Popconfirm>
              )}
              {['COMPLETED', 'ENDED'].includes(record.status) && (
                <Tooltip title="Lưu trữ chiến dịch">
                  <Button
                    size="small"
                    aria-label={`Lưu trữ ${record.name}`}
                    icon={<AppIcon icon={FolderArchive} size={14} />}
                    onClick={() => onArchiveCampaign(record)}
                  />
                </Tooltip>
              )}
              {record.status === 'ARCHIVED' && (
                <Tooltip title="Bỏ lưu trữ">
                  <Button
                    size="small"
                    aria-label={`Bỏ lưu trữ ${record.name}`}
                    icon={<AppIcon icon={RotateCcw} size={14} />}
                    onClick={() => onUnarchiveCampaign(record)}
                  />
                </Tooltip>
              )}
              {['COMPLETED', 'ENDED', 'ARCHIVED'].includes(record.status) && (
                <Tooltip title="Mở lại / Gia hạn">
                  <Button
                    size="small"
                    aria-label={`Mở lại ${record.name}`}
                    className="bg-blue-600 text-white hover:bg-blue-500"
                    icon={<AppIcon icon={RefreshCw} size={14} />}
                    onClick={() => onReopenCampaign(record)}
                  />
                </Tooltip>
              )}
              {record.status === 'DELETED' && (
                <Tooltip title="Khôi phục chiến dịch">
                  <Button
                    size="small"
                    aria-label={`Khôi phục ${record.name}`}
                    className="bg-emerald-600 font-semibold text-white hover:bg-emerald-500"
                    icon={<AppIcon icon={RotateCcw} size={14} />}
                    onClick={() => onRestoreCampaign(record)}
                  />
                </Tooltip>
              )}
              <Tooltip title="Nhân bản chiến dịch">
                <Button
                  size="small"
                  aria-label={`Nhân bản ${record.name}`}
                  icon={<AppIcon icon={Copy} size={14} />}
                  onClick={() => onCloneCampaign(record)}
                />
              </Tooltip>
              <Popconfirm
                title="Xóa chiến dịch?"
                description="Bạn có chắc chắn muốn xóa chiến dịch này không?"
                onConfirm={() => onDeleteCampaign(record)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Xóa chiến dịch">
                  <Button
                    size="small"
                    danger
                    aria-label={`Xóa ${record.name}`}
                    icon={<AppIcon icon={Trash2} size={14} />}
                  />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];
}
