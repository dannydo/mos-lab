import type { FundOverviewData } from './types';

export const FUND_ROLE_LABELS: Record<string, string> = {
  HOLDER: 'Thủ quỹ / Giữ quỹ',
  APPROVER_L1: 'Duyệt cấp 1',
  APPROVER_L2: 'Duyệt cấp 2',
  DISBURSER: 'Kế toán giải ngân',
};

export function getFundRoleLabel(roleKey: string): string {
  return FUND_ROLE_LABELS[roleKey] ?? 'Kiểm toán';
}

export const TX_TYPE_FILTER_OPTIONS = [
  { label: 'Tất cả GD', value: 'ALL' },
  { label: 'Cấp Bù Vốn (+)', value: 'TOPUP' },
  { label: 'Chi Phí (-)', value: 'EXPENSE' },
  { label: 'Điều Chỉnh (±)', value: 'ADJUSTMENT' },
];

export function exportFundLedgerCsv(fundOverview: FundOverviewData | null): boolean {
  if (!fundOverview || !fundOverview.recentTransactions) {
    return false;
  }

  const headers = [
    'Mã Giao Dịch',
    'Thời Gian',
    'Loại Giao Dịch',
    'Số Tiền (VNĐ)',
    'Số Dư Trước (VNĐ)',
    'Số Dư Sau (VNĐ)',
    'Người Thực Hiện',
    'Người/Đơn Vị Thụ Hưởng',
    'Nội Dung Chi Tiết',
    'Trạng Thái',
  ];

  const rows = fundOverview.recentTransactions.map((tx) => [
    `"${tx.id}"`,
    `"${new Date(tx.createdAt).toLocaleString('vi-VN')}"`,
    `"${tx.type === 'TOPUP' ? 'Cấp bù vốn' : tx.type === 'EXPENSE' ? 'Chi phí' : 'Điều chỉnh'}"`,
    tx.amount,
    tx.balanceBefore,
    tx.balanceAfter,
    `"${tx.actorStaffName || ''}"`,
    `"${tx.beneficiaryStaffName || ''}${tx.beneficiaryPhone ? ` (${tx.beneficiaryPhone})` : ''}"`,
    `"${(tx.description || '').replace(/"/g, '""')}"`,
    `"${tx.status === 'LOCKED' ? 'Đã khóa sổ' : 'Hoàn tất'}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `so-quy-${fundOverview.code}-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
