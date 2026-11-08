'use client';

import React, { useState, useMemo } from 'react';
import { Tag, Typography, theme, Empty, Segmented } from 'antd';
import {
  ClockCircleOutlined,
  LogoutOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { CvDisciplineStaffRecord, CvDisciplineIncident, CvDisciplineViolationType } from '@mos-lab/shared';
import { AdaptiveDrawer } from '../../../../components/ui';
import CcAvatar from '../../cc/components/CcAvatar';
import { formatStoreCode } from './CvThuNhapTab';
import { useResponsiveTier } from '../../../../hooks/useResponsiveTier';

const { Text, Title } = Typography;

interface CvDisciplineDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  staff: CvDisciplineStaffRecord | null;
  initialFilter?: CvDisciplineViolationType | 'ALL';
}

export default function CvDisciplineDetailDrawer({
  open,
  onClose,
  staff,
  initialFilter = 'ALL',
}: CvDisciplineDetailDrawerProps) {
  const { token } = theme.useToken();
  const tier = useResponsiveTier();
  const isMobile = tier === 'mobile';
  const [filterType, setFilterType] = useState<CvDisciplineViolationType | 'ALL'>(initialFilter);

  // Sync initialFilter when drawer opens
  React.useEffect(() => {
    if (open) {
      setFilterType(initialFilter);
    }
  }, [open, initialFilter]);

  const violations = useMemo(() => {
    if (!staff?.violations) return [];
    if (filterType === 'ALL') return staff.violations;
    return staff.violations.filter((v) => v.type === filterType);
  }, [staff, filterType]);

  const counts = useMemo(() => {
    if (!staff?.violations) return { all: 0, late: 0, early: 0, urgentOff: 0, other: 0 };
    let late = 0;
    let early = 0;
    let urgentOff = 0;
    let other = 0;
    staff.violations.forEach((v) => {
      if (v.isForgiven) return;
      if (v.type === 'LATE') late++;
      else if (v.type === 'EARLY') early++;
      else if (v.type === 'URGENT_OFF') urgentOff++;
      else other++;
    });
    return {
      all: staff.violations.length,
      late,
      early,
      urgentOff,
      other,
    };
  }, [staff]);

  const renderViolationIcon = (type: CvDisciplineViolationType) => {
    switch (type) {
      case 'LATE':
        return <ClockCircleOutlined className="text-amber-500" />;
      case 'EARLY':
        return <LogoutOutlined className="text-orange-500" />;
      case 'URGENT_OFF':
        return <ThunderboltOutlined className="text-rose-500" />;
      default:
        return <WarningOutlined className="text-purple-500" />;
    }
  };

  const renderViolationBadge = (type: CvDisciplineViolationType) => {
    switch (type) {
      case 'LATE':
        return (
          <Tag color="warning" className="font-semibold !rounded-full !px-2.5">
            Đi trễ
          </Tag>
        );
      case 'EARLY':
        return (
          <Tag color="orange" className="font-semibold !rounded-full !px-2.5">
            Về sớm
          </Tag>
        );
      case 'URGENT_OFF':
        return (
          <Tag color="error" className="font-semibold !rounded-full !px-2.5">
            Off gấp
          </Tag>
        );
      default:
        return (
          <Tag color="purple" className="font-semibold !rounded-full !px-2.5">
            Phạt tác phong
          </Tag>
        );
    }
  };

  return (
    <AdaptiveDrawer
      intent="detail"
      title={
        <div className="flex items-center gap-3">
          <CcAvatar name={staff?.staffName || ''} src={staff?.avatar} size={40} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-900 dark:text-slate-100">{staff?.staffName}</span>
              {staff?.isCvPlus && (
                <Tag color="gold" className="!text-[10px] !font-extrabold !px-1.5 !rounded-full">
                  CV🪶
                </Tag>
              )}
              <Tag className="!text-[10px] !font-mono !px-1.5 !rounded-full">{formatStoreCode(staff?.store)}</Tag>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Chi tiết kỷ luật & đối soát phạt chuối
            </div>
          </div>
        </div>
      }
      open={open}
      onClose={onClose}
      width={isMobile ? '100%' : 540}
    >
      <div className="space-y-4">
        {/* KPI Mini Summary Box */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-2xl border"
          style={{
            background: token.colorBgElevated,
            borderColor: token.colorBorderSecondary,
          }}
        >
          <div className="text-center p-2 rounded-xl bg-slate-500/5">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
              <ClockCircleOutlined className="text-amber-500" /> Đi trễ
            </div>
            <div className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
              {staff?.lateCount || 0} lần
            </div>
            <div className="text-[10px] text-slate-400 tabular-nums">({staff?.lateMinutes || 0} phút)</div>
          </div>

          <div className="text-center p-2 rounded-xl bg-slate-500/5">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
              <LogoutOutlined className="text-orange-500" /> Về sớm
            </div>
            <div className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
              {staff?.earlyCount || 0} lần
            </div>
            <div className="text-[10px] text-slate-400 tabular-nums">({staff?.earlyMinutes || 0} phút)</div>
          </div>

          <div className="text-center p-2 rounded-xl bg-slate-500/5">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
              <ThunderboltOutlined className="text-rose-500" /> Off gấp
            </div>
            <div className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
              {staff?.urgentOffCount || 0} lần
            </div>
            <div className="text-[10px] text-slate-400">Đơn khẩn</div>
          </div>

          <div className="text-center p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <div className="text-[11px] text-rose-500 font-semibold flex items-center justify-center gap-1">
              🍌 Phạt Chuối
            </div>
            <div className="text-sm font-extrabold tabular-nums text-rose-600 dark:text-rose-400 mt-0.5">
              -{staff?.finedBananaAmount || 0}
            </div>
            <div className="text-[10px] text-rose-500/80">Chuối phạt</div>
          </div>
        </div>

        {/* Filter Segmented Controls */}
        <div className="overflow-x-auto pb-1">
          <Segmented
            value={filterType}
            onChange={(val) => setFilterType(val as CvDisciplineViolationType | 'ALL')}
            block
            options={[
              { label: `Tất cả (${counts.all})`, value: 'ALL' },
              { label: `⏰ Trễ (${counts.late})`, value: 'LATE' },
              { label: `🚪 Sớm (${counts.early})`, value: 'EARLY' },
              { label: `⚡ Off (${counts.urgentOff})`, value: 'URGENT_OFF' },
              ...(counts.other > 0 ? [{ label: `🍌 Khác (${counts.other})`, value: 'OTHER' }] : []),
            ]}
          />
        </div>

        {/* Violations Incident List */}
        {violations.length === 0 ? (
          <div className="py-12">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span className="text-slate-500 dark:text-slate-400 text-sm">
                  Không có ghi nhận vi phạm nào trong mục này
                </span>
              }
            />
          </div>
        ) : (
          <div className="space-y-3">
            {violations.map((item: CvDisciplineIncident) => {
              const formattedDate = dayjs(item.date).format('dddd, DD/MM/YYYY');
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border transition-all hover:shadow-md"
                  style={{
                    background: token.colorBgContainer,
                    borderColor: item.isForgiven
                      ? 'rgba(16, 185, 129, 0.4)'
                      : item.isFined
                        ? 'rgba(239, 68, 68, 0.3)'
                        : token.colorBorderSecondary,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{renderViolationIcon(item.type)}</span>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                          <span>{item.title}</span>
                          {renderViolationBadge(item.type)}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 capitalize mt-0.5">
                          {formattedDate} · Salon {formatStoreCode(item.store)}
                        </div>
                      </div>
                    </div>

                    {/* Banana Fine Badge */}
                    <div className="shrink-0 text-right">
                      {item.isForgiven ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 tabular-nums">
                          <CheckCircleOutlined className="text-[11px]" />
                          <span>Đã miễn phạt (+{item.refundBananas || 0} 🍌)</span>
                        </div>
                      ) : item.isFined ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 tabular-nums">
                          <span>🍌</span>
                          <span>Đã phạt -{item.finedBananas}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-500/10 text-slate-500 dark:text-slate-400">
                          <CheckCircleOutlined className="text-[10px]" />
                          <span>0 🍌 (Không phạt)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Incident Details / Timing Breakdown */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1">
                    {item.scheduledTime && (
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span>Lịch ca làm:</span>
                        <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                          {item.scheduledTime}
                        </span>
                      </div>
                    )}
                    {item.actualTime && (
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span>Chấm công thực tế:</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                          {item.actualTime}
                        </span>
                      </div>
                    )}
                    {item.description && (
                      <div className="bg-slate-500/5 rounded-lg p-2 text-slate-600 dark:text-slate-300 mt-1">
                        {item.description}
                      </div>
                    )}
                    {item.isForgiven && item.refundDate && (
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center justify-between pt-1">
                        <span>Thời điểm hoàn trả chuối:</span>
                        <span className="font-mono">{dayjs(item.refundDate).format('HH:mm:ss DD/MM/YYYY')}</span>
                      </div>
                    )}
                    {!item.isForgiven && item.isFined && item.fineDate && (
                      <div className="text-[10px] text-rose-500/80 flex items-center justify-between pt-1">
                        <span>Thời điểm trừ chuối:</span>
                        <span className="font-mono">{dayjs(item.fineDate).format('HH:mm:ss DD/MM/YYYY')}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdaptiveDrawer>
  );
}
