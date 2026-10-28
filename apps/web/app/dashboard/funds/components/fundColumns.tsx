'use client';

import React from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Button, Space } from 'antd';
import { ArrowUpRight, ArrowDownRight, FileCheck } from 'lucide-react';
import type { FundProposal, FundTransaction } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';

export function getTransactionColumns(): ColumnsType<FundTransaction> {
  return [
    {
      title: 'Thời Gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (val: string) => (
        <span className="tabular-nums text-xs text-neutral-500">
          {new Date(val).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      title: 'Loại Giao Dịch',
      dataIndex: 'type',
      key: 'type',
      width: 150,
      render: (type: string) => {
        if (type === 'TOPUP') {
          return (
            <StatusTag
              status="success"
              label="Cấp Bù Quỹ"
              icon={<AppIcon icon={ArrowUpRight} size="sm" className="text-emerald-600" />}
            />
          );
        }
        if (type === 'EXPENSE') {
          return (
            <StatusTag
              status="error"
              label="Nạp Card / Chi"
              icon={<AppIcon icon={ArrowDownRight} size="sm" className="text-rose-600" />}
            />
          );
        }
        return (
          <StatusTag
            status="purple"
            label="Điều Chỉnh"
            icon={<AppIcon icon={FileCheck} size="sm" className="text-purple-600" />}
          />
        );
      },
    },
    {
      title: 'Số Tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      render: (amount: number, record: FundTransaction) => (
        <span
          className={`font-semibold tabular-nums ${
            record.type === 'TOPUP' ? 'text-emerald-600' : record.type === 'EXPENSE' ? 'text-rose-600' : 'text-purple-600'
          }`}
        >
          {record.type === 'TOPUP' ? '+' : record.type === 'EXPENSE' ? '-' : '±'}
          {amount.toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: 'Số Dư Sau Chi',
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
      width: 130,
      render: (val: number) => <span className="font-medium tabular-nums text-neutral-700">{val.toLocaleString('vi-VN')} đ</span>,
    },
    {
      title: 'Nội Dung & Thụ Hưởng',
      key: 'desc',
      render: (_: any, record: FundTransaction) => (
        <div>
          <div className="font-medium text-neutral-800">{record.description}</div>
          {record.beneficiaryStaffName && (
            <div className="text-xs text-neutral-500 mt-0.5">
              Nhận cước: <span className="font-semibold text-neutral-700">{record.beneficiaryStaffName}</span>
              {record.beneficiaryPhone && ` (${record.beneficiaryPhone})`}
              {record.telco && <span className="ml-1 text-[11px] font-mono text-neutral-500">[{record.telco}]</span>}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Người Thực Hiện',
      dataIndex: 'actorStaffName',
      key: 'actor',
      width: 160,
      render: (val: string) => <span className="text-xs font-medium text-neutral-600">{val}</span>,
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <StatusTag
          status={status === 'LOCKED' ? 'default' : 'cyan'}
          label={status === 'LOCKED' ? 'Đã khóa sổ' : 'Hoàn tất'}
        />
      ),
    },
  ];
}

interface ProposalColumnActions {
  onOpenApproval: (proposal: FundProposal) => void;
  onOpenDisburse: (proposal: FundProposal) => void;
}

export function getProposalColumns(actions: ProposalColumnActions): ColumnsType<FundProposal> {
  return [
    {
      title: 'Tiêu Đề Đề Xuất',
      key: 'title',
      render: (_: any, record: FundProposal) => (
        <div>
          <div className="font-semibold text-neutral-800">{record.title}</div>
          {record.description && <div className="text-xs text-neutral-500 mt-0.5">{record.description}</div>}
          {record.reapprovalReason && (
            <div className="text-xs text-amber-600 font-medium mt-1 bg-amber-50 p-1 rounded border border-amber-200">
              ⚠️ {record.reapprovalReason}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Số Tiền Đề Nghị',
      dataIndex: 'requestedAmount',
      key: 'requestedAmount',
      width: 140,
      render: (val: number) => <span className="font-medium tabular-nums">{val.toLocaleString('vi-VN')} đ</span>,
    },
    {
      title: 'Hạn Mức Duyệt (L1/L2)',
      dataIndex: 'approvedAmount',
      key: 'approvedAmount',
      width: 150,
      render: (val: number | null) =>
        val ? (
          <span className="font-semibold text-emerald-600 tabular-nums">{val.toLocaleString('vi-VN')} đ</span>
        ) : (
          <span className="text-neutral-400 text-xs">Chưa duyệt</span>
        ),
    },
    {
      title: 'Kế Toán Thực Chuyển',
      dataIndex: 'actualDisbursedAmount',
      key: 'actualDisbursedAmount',
      width: 160,
      render: (val: number | null, record: FundProposal) =>
        val ? (
          <div>
            <div className="font-bold text-sky-600 tabular-nums">{val.toLocaleString('vi-VN')} đ</div>
            {record.bankRefCode && (
              <div className="text-[11px] text-neutral-500">Mã: {record.bankRefCode}</div>
            )}
          </div>
        ) : (
          <span className="text-neutral-400 text-xs">Chưa giải ngân</span>
        ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      width: 170,
      render: (status: string) => {
        if (status === 'PENDING_APPROVAL') {
          return <StatusTag status="processing" label="Chờ duyệt chủ trương" />;
        }
        if (status === 'APPROVED') {
          return <StatusTag status="success" label="Đã duyệt · Chờ giải ngân" />;
        }
        if (status === 'PENDING_REAPPROVAL') {
          return <StatusTag status="warning" label="⚠️ Chờ duyệt lại (Vượt hạn)" />;
        }
        if (status === 'DISBURSED') {
          return <StatusTag status="cyan" label="Đã giải ngân" />;
        }
        if (status === 'REJECTED') {
          return <StatusTag status="error" label="Đã từ chối" />;
        }
        return <StatusTag status="default" label={status} />;
      },
    },
    {
      title: 'Thao Tác',
      key: 'actions',
      width: 180,
      render: (_: any, record: FundProposal) => (
        <Space size="small">
          {['PENDING_APPROVAL', 'PENDING_REAPPROVAL'].includes(record.status) && (
            <Button
              size="small"
              type="primary"
              onClick={() => actions.onOpenApproval(record)}
            >
              Duyệt chủ trương
            </Button>
          )}

          {record.status === 'APPROVED' && (
            <Button
              size="small"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => actions.onOpenDisburse(record)}
            >
              Giải ngân (Kế toán)
            </Button>
          )}
        </Space>
      ),
    },
  ];
}
