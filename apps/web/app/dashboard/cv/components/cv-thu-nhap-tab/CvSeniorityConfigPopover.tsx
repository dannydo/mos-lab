'use client';

import { Button, Col, InputNumber, Row, Space } from 'antd';
import { Plus, Save, Trash2 } from 'lucide-react';
import type { CvSeniorityRule } from './cvThuNhapUtils';

interface CvSeniorityConfigPopoverProps {
  seniorityRules: CvSeniorityRule[];
  configLoading: boolean;
  configSaving: boolean;
  canManagePaystub: boolean;
  popoverRefCallback: (node: HTMLDivElement | null) => void;
  onAddRule: () => void;
  onUpdateRule: (idx: number, field: keyof CvSeniorityRule, value: number) => void;
  onRemoveRule: (idx: number) => void;
  onSaveConfig: () => Promise<void>;
}

/** Resizable popover content for configuring CV seniority bonus thresholds. */
export function CvSeniorityConfigPopover({
  seniorityRules,
  configLoading,
  configSaving,
  canManagePaystub,
  popoverRefCallback,
  onAddRule,
  onUpdateRule,
  onRemoveRule,
  onSaveConfig,
}: CvSeniorityConfigPopoverProps) {
  return (
    <div ref={popoverRefCallback} className="min-w-[380px] max-w-[650px] resize-x overflow-auto pb-2 p-1 space-y-3">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
        <h5 className="m-0 text-sm font-semibold text-slate-900 dark:text-slate-100">
          Cấu hình tỷ lệ Thưởng Thâm Niên
        </h5>
        <p className="m-0 text-xs text-slate-500 dark:text-slate-400">
          Cộng thêm % tiền thưởng vào Thưởng Ca CV (Xoay)
        </p>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {configLoading ? (
          <div className="flex justify-center p-4">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : seniorityRules.length === 0 ? (
          <div className="text-center py-2 text-slate-400 text-xs">Chưa có mốc cấu hình nào.</div>
        ) : (
          seniorityRules.map((rule, idx) => (
            <Row
              key={idx}
              align="middle"
              justify="space-between"
              className="py-1 border-b border-dashed border-slate-100 dark:border-slate-800 last:border-b-0 pb-2"
            >
              <Col>
                <Space size={4}>
                  <span className="text-xs text-slate-700 dark:text-slate-300">Từ</span>
                  <InputNumber
                    min={1}
                    max={120}
                    size="small"
                    value={rule.minMonths}
                    disabled={!canManagePaystub}
                    onChange={(val) => onUpdateRule(idx, 'minMonths', val || 0)}
                    className="w-[65px]"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">tháng trở lên: Thưởng thêm</span>
                  <InputNumber
                    min={0}
                    max={100}
                    size="small"
                    value={rule.bonusPercent}
                    disabled={!canManagePaystub}
                    onChange={(val) => onUpdateRule(idx, 'bonusPercent', val || 0)}
                    className="w-[60px]"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">%</span>
                </Space>
              </Col>
              <Col>
                {canManagePaystub && (
                  <Button
                    danger
                    type="text"
                    size="small"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => onRemoveRule(idx)}
                  />
                )}
              </Col>
            </Row>
          ))
        )}
      </div>

      {canManagePaystub && (
        <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800 mt-2">
          <Button type="dashed" size="small" icon={<Plus className="w-3.5 h-3.5" />} onClick={onAddRule}>
            Thêm
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<Save className="w-3.5 h-3.5" />}
            loading={configSaving}
            onClick={() => void onSaveConfig()}
            className="bg-amber-500 hover:bg-amber-400 border-amber-500 text-slate-950 font-semibold"
          >
            Lưu
          </Button>
        </div>
      )}
    </div>
  );
}
