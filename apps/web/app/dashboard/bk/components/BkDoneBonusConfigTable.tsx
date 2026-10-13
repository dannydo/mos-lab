'use client';

import { Button, Input, InputNumber, Select, Tooltip, Typography, Space } from 'antd';
import { Plus, Trash2, Sparkles, HelpCircle, Layers } from 'lucide-react';
import type { BkGameDoneBonusRule, BkGameDoneBonusConditionType } from '@mos-lab/shared';
import { DEFAULT_BK_LASH_LIFT_BONUS_RULES } from '@mos-lab/shared';
import { AppIcon, DataTable } from '~/components/ui';

interface BkDoneBonusConfigTableProps {
  value?: BkGameDoneBonusRule[] | null;
  onChange?: (rules: BkGameDoneBonusRule[]) => void;
  disabled?: boolean;
}

const CONDITION_TYPE_OPTIONS: { label: string; value: BkGameDoneBonusConditionType }[] = [
  { label: 'Nguyên giá / Chính xác', value: 'EXACT_PAY' },
  { label: 'Theo % Khuyến mãi', value: 'PROMO_PERCENT' },
  { label: 'Khoảng thực trả', value: 'AMOUNT_RANGE' },
  { label: 'Miễn phí (0đ)', value: 'FREE' },
  { label: 'Tất cả đơn Done', value: 'ANY' },
];

export default function BkDoneBonusConfigTable({
  value = [],
  onChange,
  disabled = false,
}: BkDoneBonusConfigTableProps) {
  const rules = value || [];

  const handleUpdateRule = (index: number, patch: Partial<BkGameDoneBonusRule>) => {
    const next = [...rules];
    const updated = { ...next[index], ...patch };

    // Auto-update conditionLabel if not manually customized
    if (patch.conditionType || patch.minPaid !== undefined || patch.maxPaid !== undefined || patch.promoPercent !== undefined) {
      if (updated.conditionType === 'FREE') {
        updated.conditionLabel = 'Miễn phí (Promo 100%)';
        updated.minPaid = 0;
        updated.maxPaid = 0;
      } else if (updated.conditionType === 'EXACT_PAY' && updated.minPaid !== undefined) {
        updated.conditionLabel = `Thanh toán ${updated.minPaid.toLocaleString('vi-VN')}đ (Nguyên giá)`;
        updated.maxPaid = updated.minPaid;
      } else if (updated.conditionType === 'PROMO_PERCENT') {
        const promoStr = updated.promoPercent ? `Promo ${updated.promoPercent}%` : 'Khuyến mãi';
        const paidStr = updated.minPaid ? ` (${updated.minPaid.toLocaleString('vi-VN')}đ)` : '';
        updated.conditionLabel = `Thanh toán${paidStr} (${promoStr})`;
      } else if (updated.conditionType === 'AMOUNT_RANGE') {
        const minStr = (updated.minPaid ?? 0).toLocaleString('vi-VN');
        const maxStr = (updated.maxPaid ?? 0).toLocaleString('vi-VN');
        updated.conditionLabel = `Thực trả ${minStr}đ - ${maxStr}đ`;
      } else if (updated.conditionType === 'ANY') {
        updated.conditionLabel = 'Mọi mức thanh toán';
      }
    }

    next[index] = updated;
    onChange?.(next);
  };

  const handleAddRule = () => {
    const newRule: BkGameDoneBonusRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      serviceName: 'LASH LIFT',
      conditionType: 'EXACT_PAY',
      conditionLabel: 'Thanh toán 990.000đ (Nguyên giá)',
      minPaid: 990000,
      maxPaid: 990000,
      bonusAmount: 50000,
    };
    onChange?.([...rules, newRule]);
  };

  const handleRemoveRule = (index: number) => {
    const next = rules.filter((_, i) => i !== index);
    onChange?.(next);
  };

  const handleApplyLashLiftPreset = () => {
    onChange?.([...DEFAULT_BK_LASH_LIFT_BONUS_RULES]);
  };

  const handleClearAll = () => {
    onChange?.([]);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <AppIcon icon={Layers} size="sm" className="text-emerald-500" />
          <Typography.Text className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
            Cấu hình Bonus theo từng Booking Done ({rules.length} mức)
          </Typography.Text>
          <Tooltip title="Hệ thống tự động đối soát dịch vụ và số tiền khách thực trả khi đơn Completed để tính thưởng Bonus độc lập cho nhân viên phụ trách. Mỗi đơn chỉ tính thưởng 1 lần.">
            <span className="text-slate-400 hover:text-blue-500 cursor-pointer">
              <AppIcon icon={HelpCircle} size="sm" />
            </span>
          </Tooltip>
        </div>

        <Space size="small">
          <Button
            size="small"
            icon={<AppIcon icon={Sparkles} size="sm" className="text-amber-500" />}
            onClick={handleApplyLashLiftPreset}
            disabled={disabled}
            className="text-xs font-medium"
          >
            Áp dụng mẫu LASH LIFT
          </Button>
          {rules.length > 0 && (
            <Button
              size="small"
              danger
              type="text"
              onClick={handleClearAll}
              disabled={disabled}
              className="text-xs"
            >
              Xóa tất cả
            </Button>
          )}
        </Space>
      </div>

      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-900/40">
        <DataTable
          size="small"
          pagination={false}
          dataSource={rules}
          rowKey={(record, index) => record.id || `rule-${index}`}
          locale={{
            emptyText: (
              <div className="py-6 text-center text-slate-400 text-xs">
                Chưa có cấu hình Bonus theo đơn Done. Bấm nút bên dưới hoặc chọn &quot;Áp dụng mẫu LASH LIFT&quot; để tạo.
              </div>
            ),
          }}
          columns={[
            {
              title: '#',
              width: 44,
              align: 'center',
              render: (_, __, index) => <span className="text-xs text-slate-400 tabular-nums">{index + 1}</span>,
            },
            {
              title: 'Tên dịch vụ',
              dataIndex: 'serviceName',
              width: 170,
              render: (value, _, index) => (
                <Input
                  size="small"
                  value={value}
                  placeholder="VD: LASH LIFT / Tất cả"
                  disabled={disabled}
                  onChange={(e) => handleUpdateRule(index, { serviceName: e.target.value })}
                  className="text-xs"
                />
              ),
            },
            {
              title: 'Loại điều kiện',
              dataIndex: 'conditionType',
              width: 160,
              render: (value, _, index) => (
                <Select
                  size="small"
                  value={value || 'EXACT_PAY'}
                  options={CONDITION_TYPE_OPTIONS}
                  disabled={disabled}
                  onChange={(val) => handleUpdateRule(index, { conditionType: val })}
                  className="w-full text-xs"
                />
              ),
            },
            {
              title: 'Điều kiện thanh toán / Khuyến mãi',
              dataIndex: 'conditionLabel',
              render: (_, record, index) => {
                if (record.conditionType === 'FREE') {
                  return (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Miễn phí (Thực trả 0đ)
                    </span>
                  );
                }

                if (record.conditionType === 'EXACT_PAY') {
                  return (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500 whitespace-nowrap">Thực trả đúng:</span>
                      <InputNumber
                        size="small"
                        min={0}
                        step={10000}
                        value={record.minPaid}
                        disabled={disabled}
                        formatter={(val) => (val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                        parser={(val) => Number((val || '').replace(/,/g, ''))}
                        onChange={(val) => handleUpdateRule(index, { minPaid: val ?? 0, maxPaid: val ?? 0 })}
                        className="w-32 text-xs tabular-nums"
                        placeholder="Số tiền (đ)"
                      />
                      <span className="text-xs text-slate-400">đ</span>
                    </div>
                  );
                }

                if (record.conditionType === 'PROMO_PERCENT') {
                  return (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-slate-500">Giảm:</span>
                      <InputNumber
                        size="small"
                        min={0}
                        max={100}
                        value={record.promoPercent}
                        disabled={disabled}
                        onChange={(val) => handleUpdateRule(index, { promoPercent: val ?? 0 })}
                        className="w-16 text-xs tabular-nums"
                        placeholder="%"
                      />
                      <span className="text-xs text-slate-400">%</span>
                      <span className="text-xs text-slate-500 ml-1">hoặc trả:</span>
                      <InputNumber
                        size="small"
                        min={0}
                        value={record.minPaid}
                        disabled={disabled}
                        formatter={(val) => (val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                        parser={(val) => Number((val || '').replace(/,/g, ''))}
                        onChange={(val) => handleUpdateRule(index, { minPaid: val ?? 0 })}
                        className="w-28 text-xs tabular-nums"
                        placeholder="Tối thiểu"
                      />
                      <span className="text-xs text-slate-400">-</span>
                      <InputNumber
                        size="small"
                        min={0}
                        value={record.maxPaid}
                        disabled={disabled}
                        formatter={(val) => (val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                        parser={(val) => Number((val || '').replace(/,/g, ''))}
                        onChange={(val) => handleUpdateRule(index, { maxPaid: val ?? 0 })}
                        className="w-28 text-xs tabular-nums"
                        placeholder="Tối đa"
                      />
                    </div>
                  );
                }

                if (record.conditionType === 'AMOUNT_RANGE') {
                  return (
                    <div className="flex items-center gap-1.5">
                      <InputNumber
                        size="small"
                        min={0}
                        value={record.minPaid}
                        disabled={disabled}
                        formatter={(val) => (val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                        parser={(val) => Number((val || '').replace(/,/g, ''))}
                        onChange={(val) => handleUpdateRule(index, { minPaid: val ?? 0 })}
                        className="w-28 text-xs tabular-nums"
                        placeholder="Từ (đ)"
                      />
                      <span className="text-xs text-slate-400">–</span>
                      <InputNumber
                        size="small"
                        min={0}
                        value={record.maxPaid}
                        disabled={disabled}
                        formatter={(val) => (val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                        parser={(val) => Number((val || '').replace(/,/g, ''))}
                        onChange={(val) => handleUpdateRule(index, { maxPaid: val ?? 0 })}
                        className="w-28 text-xs tabular-nums"
                        placeholder="Đến (đ)"
                      />
                    </div>
                  );
                }

                return <span className="text-xs text-slate-500 italic">Áp dụng cho mọi đơn Completed</span>;
              },
            },
            {
              title: 'Bonus / Đơn',
              dataIndex: 'bonusAmount',
              width: 140,
              align: 'right',
              render: (value, _, index) => (
                <div className="flex items-center justify-end gap-1">
                  <InputNumber
                    size="small"
                    min={0}
                    step={1000}
                    value={value}
                    disabled={disabled}
                    formatter={(val) => (val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                    parser={(val) => Number((val || '').replace(/,/g, ''))}
                    onChange={(val) => handleUpdateRule(index, { bonusAmount: val ?? 0 })}
                    className="w-28 text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums"
                  />
                  <span className="text-xs text-slate-500 font-medium">đ</span>
                </div>
              ),
            },
            {
              title: '',
              width: 44,
              align: 'center',
              render: (_, __, index) => (
                <Button
                  size="small"
                  type="text"
                  danger
                  disabled={disabled}
                  icon={<AppIcon icon={Trash2} size="action" />}
                  onClick={() => handleRemoveRule(index)}
                  className="text-slate-400 hover:text-red-500"
                />
              ),
            },
          ]}
        />
      </div>

      <div className="flex justify-between items-center pt-1">
        <Button
          size="small"
          type="dashed"
          icon={<AppIcon icon={Plus} size="sm" />}
          onClick={handleAddRule}
          disabled={disabled}
          className="text-xs font-medium"
        >
          Thêm dòng cấu hình Bonus
        </Button>

        <span className="text-[11px] text-slate-400 italic">
          💡 Lưu ý: Bonus/Done được theo dõi riêng, độc lập với quỹ giải thưởng Game BK.
        </span>
      </div>
    </div>
  );
}
