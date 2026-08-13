import React, { useState, useMemo } from 'react';
import { Card, Table, Tag, Input, Space, Button, Typography, theme, Tooltip, Progress, Alert } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  SettingOutlined,
  CompressOutlined,
  ExpandOutlined,
  WarningOutlined,
  FireOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { CcXoayRecord, removeVietnameseTones, calculateWheelBonusCap } from '@mos-lab/shared';
import { useTableConfig } from '../../../../hooks/useTableConfig';
import { TableConfigDrawer } from '../../../../components/TableConfigDrawer';
import CcAvatar from './CcAvatar';

interface CcXoayTabProps {
  data: CcXoayRecord[];
  loading?: boolean;
  total?: number;
  onRefresh?: () => void;
}

function CcXoayTabComponent({ data, loading, onRefresh }: CcXoayTabProps) {
  const { token } = theme.useToken();
  const [searchText, setSearchText] = useState('');
  const [isCompact, setIsCompact] = useState(false);

  // Compute staff-level Wheel Bonus Cap map
  const staffCapMap = useMemo(() => {
    const map = new Map<string, { dailyBonus: number; wheelBonus: number }>();
    data.forEach((item) => {
      const name = item.consultantName || 'Unknown';
      if (!map.has(name)) {
        map.set(name, { dailyBonus: item.monthlyDailyBonus || 0, wheelBonus: item.monthlyWheelBonus || 0 });
      } else {
        const cur = map.get(name)!;
        if (item.monthlyDailyBonus && item.monthlyDailyBonus > cur.dailyBonus) {
          cur.dailyBonus = item.monthlyDailyBonus;
        }
        if (item.monthlyWheelBonus && item.monthlyWheelBonus > cur.wheelBonus) {
          cur.wheelBonus = item.monthlyWheelBonus;
        }
      }
    });

    const resultMap = new Map<
      string,
      {
        capStatus: 'NORMAL' | 'WARNING' | 'HARDCAPPED';
        wheelCapPercent: number;
        maxWheelBonusAllowed: number;
        effectiveWheelBonus: number;
      }
    >();

    map.forEach((val, name) => {
      // Fallback demo values if backend data not fully populated
      const dBonus = val.dailyBonus || 1000000;
      const wBonus = val.wheelBonus || 0;
      const res = calculateWheelBonusCap(dBonus, wBonus);
      resultMap.set(name, {
        capStatus: res.capStatus,
        wheelCapPercent: res.wheelCapPercent,
        maxWheelBonusAllowed: res.maxWheelBonusAllowed,
        effectiveWheelBonus: res.effectiveWheelBonus,
      });
    });

    return resultMap;
  }, [data]);

  // Capped & Warning Summary Stats for Header Banner
  const capSummary = useMemo(() => {
    let cappedCount = 0;
    let warningCount = 0;
    const cappedNames: string[] = [];
    const warningNames: string[] = [];

    staffCapMap.forEach((val, name) => {
      if (val.capStatus === 'HARDCAPPED') {
        cappedCount++;
        cappedNames.push(name);
      } else if (val.capStatus === 'WARNING') {
        warningCount++;
        warningNames.push(name);
      }
    });

    return { cappedCount, warningCount, cappedNames, warningNames };
  }, [staffCapMap]);

  const filteredData = useMemo(() => {
    if (!searchText) return data;
    const q = removeVietnameseTones(searchText);
    return data.filter((item) => {
      return (
        (item.clientName && removeVietnameseTones(item.clientName).includes(q)) ||
        (item.serviceName && removeVietnameseTones(item.serviceName).includes(q)) ||
        (item.consultantName && removeVietnameseTones(item.consultantName).includes(q)) ||
        (item.store && removeVietnameseTones(item.store).includes(q))
      );
    });
  }, [data, searchText]);

  const staticColumns = useMemo(
    () => [
      {
        title: 'Check-in',
        dataIndex: 'checkin',
        key: 'checkin',
        width: 150,
        render: (val: string) => <span className="tabular-nums text-xs text-slate-600 dark:text-slate-400">{val}</span>,
      },
      {
        title: 'Khách Hàng',
        dataIndex: 'clientName',
        key: 'clientName',
        width: 140,
        render: (val: string) => <span className="font-semibold text-slate-700 dark:text-slate-200">{val}</span>,
      },
      {
        title: 'Chi Nhánh',
        dataIndex: 'store',
        key: 'store',
        width: 90,
        render: (val: string) => {
          const storeCode =
            val === 'ESTELLA-PLACE' || val === 'ESTELLA' ? 'EP' : val === 'DE-THAM' || val === 'Đề Thám' ? 'DT' : val;
          return (
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
              · {storeCode}
            </span>
          );
        },
      },
      {
        title: 'Tên Dịch Vụ / Bộ Mi',
        dataIndex: 'serviceName',
        key: 'serviceName',
        width: 220,
        render: (val: string) => <span className="font-medium text-amber-800 dark:text-amber-400">{val}</span>,
      },
      {
        title: 'Loại',
        dataIndex: 'serviceType',
        key: 'serviceType',
        width: 90,
        render: (val: string) =>
          val === 'Normal' ? (
            <span className="text-xs text-slate-600 dark:text-slate-400">Normal</span>
          ) : (
            <Tag className="m-0 text-[11px] font-semibold text-amber-800 bg-amber-100 border-amber-300 dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-700">
              {val}
            </Tag>
          ),
      },
      {
        title: 'CC Tư Vấn',
        dataIndex: 'consultantName',
        key: 'consultantName',
        width: 160,
        render: (val: string, record: CcXoayRecord) => (
          <Space size={6}>
            <CcAvatar name={val} src={record.avatar} size={24} />
            <span className="font-semibold text-xs">{val}</span>
          </Space>
        ),
      },
      {
        title: 'Level CC',
        dataIndex: 'consultantLevel',
        key: 'consultantLevel',
        width: 80,
        align: 'right' as const,
        render: (val: number) => (
          <span className="tabular-nums font-semibold text-xs text-slate-600 dark:text-slate-300">{val}</span>
        ),
      },
      {
        title: 'CC Bonus (đ)',
        dataIndex: 'consultantBonus',
        key: 'consultantBonus',
        width: 165,
        align: 'right' as const,
        render: (val: number, record: CcXoayRecord) => {
          const capInfo = staffCapMap.get(record.consultantName || '') || {
            capStatus: record.capStatus || 'NORMAL',
            wheelCapPercent: record.wheelCapPercent || 0,
            maxWheelBonusAllowed: record.maxWheelBonusAllowed || 0,
            effectiveWheelBonus: val,
          };

          const isHardcapped = capInfo.capStatus === 'HARDCAPPED';
          const isWarning = capInfo.capStatus === 'WARNING';
          const percent = capInfo.wheelCapPercent || 0;
          const maxAllowed = capInfo.maxWheelBonusAllowed || 0;

          if (isHardcapped) {
            return (
              <Tooltip
                title={
                  <div>
                    <div className="font-bold text-rose-300">⛔ ĐÃ ĐẠT TRẦN THƯỞNG VÒNG XOAY (1.5X)</div>
                    <div className="text-xs mt-1">
                      Tổng thưởng Vòng xoay đã đạt trần tối đa:{' '}
                      <strong className="text-emerald-300">{maxAllowed.toLocaleString('vi-VN')} đ</strong> (1.5x CC
                      Daily Bonus). Phần tiền vượt quá bị khống chế theo quy định.
                    </div>
                  </div>
                }
              >
                <div className="w-full text-right cursor-help">
                  <div className="tabular-nums font-bold text-rose-500 text-xs">
                    +{Math.round(val || 0).toLocaleString('vi-VN')} đ
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <Tag color="error" className="m-0 text-[10px] font-bold py-0 px-1 border-rose-500/40 animate-pulse">
                      ⛔ HARDCAP 1.5X
                    </Tag>
                  </div>
                  <Progress percent={100} size="small" strokeColor="#ff4d4f" showInfo={false} className="m-0 mt-0.5" />
                </div>
              </Tooltip>
            );
          }

          if (isWarning) {
            return (
              <Tooltip
                title={
                  <div>
                    <div className="font-bold text-amber-300">⚠️ CẢNH BÁO: SẮP CHẠM TRẦN THƯỞNG (1.5X)</div>
                    <div className="text-xs mt-1">
                      Đã sử dụng <strong className="text-amber-300">{percent}%</strong> hạn mức thưởng Vòng xoay tháng
                      (Tối đa: <strong>{maxAllowed.toLocaleString('vi-VN')} đ</strong>). Hãy nâng cao CC Daily Bonus để
                      mở rộng trần!
                    </div>
                  </div>
                }
              >
                <div className="w-full text-right cursor-help">
                  <div className="tabular-nums font-bold text-amber-400 text-xs">
                    +{Math.round(val || 0).toLocaleString('vi-VN')} đ
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <Tag color="warning" className="m-0 text-[10px] font-bold py-0 px-1 border-amber-500/40">
                      ⚠️ SẮP CHẠM TRẦN ({percent}%)
                    </Tag>
                  </div>
                  <Progress
                    percent={percent}
                    size="small"
                    strokeColor="#faad14"
                    showInfo={false}
                    className="m-0 mt-0.5"
                  />
                </div>
              </Tooltip>
            );
          }

          return (
            <Tooltip title={`Tiến độ sử dụng hạn mức Vòng xoay tháng: ${percent}% (Trần 1.5x Daily Bonus)`}>
              <div className="w-full text-right">
                <span className="tabular-nums font-bold text-emerald-400 text-xs">
                  +{Math.round(val || 0).toLocaleString('vi-VN')} đ
                </span>
                {percent > 0 && (
                  <Progress
                    percent={percent}
                    size="small"
                    strokeColor="#52c41a"
                    showInfo={false}
                    className="m-0 mt-0.5"
                  />
                )}
              </div>
            </Tooltip>
          );
        },
      },
      {
        title: 'Points Accu',
        dataIndex: 'pointsAccu',
        key: 'pointsAccu',
        width: 110,
        align: 'right' as const,
        render: (val: number) => (
          <span className="tabular-nums font-semibold text-blue-400 text-xs">{val.toLocaleString('vi-VN')}</span>
        ),
      },
      {
        title: 'Điểm CC',
        dataIndex: 'consultantPoints',
        key: 'consultantPoints',
        width: 90,
        align: 'right' as const,
        render: (val: number) => <span className="tabular-nums font-bold text-cyan-400 text-xs">+{val} pts</span>,
      },
      {
        title: 'CC In',
        dataIndex: 'ccInName',
        key: 'ccInName',
        width: 140,
        render: (val: string, r: CcXoayRecord) => {
          if (!val) return <span className="text-slate-500 text-xs">-</span>;
          const isSame = !r.ccOutName || r.ccInName === r.ccOutName;
          if (isSame) {
            return (
              <Space size={4} className="text-xs text-slate-600 dark:text-slate-300">
                <CcAvatar name={val} size={20} />
                <span>{val}</span>
                <span className="text-emerald-400 font-bold text-[10px]" title="CC In/Out đồng nhất">
                  ✓
                </span>
              </Space>
            );
          }
          return (
            <Tag color="orange" className="m-0 text-[11px] font-medium border-orange-500/30">
              In: {val}
            </Tag>
          );
        },
      },
      {
        title: 'CC Out',
        dataIndex: 'ccOutName',
        key: 'ccOutName',
        width: 140,
        render: (val: string, r: CcXoayRecord) => {
          if (!val) return <span className="text-slate-500 text-xs">-</span>;
          const isSame = !r.ccInName || r.ccInName === r.ccOutName;
          if (isSame) {
            return <span className="text-slate-500 text-xs italic">Đồng nhất</span>;
          }
          return (
            <Tag color="purple" className="m-0 text-[11px] font-medium border-purple-500/30">
              Out: {val}
            </Tag>
          );
        },
      },
      {
        title: 'Class',
        dataIndex: 'class',
        key: 'class',
        width: 130,
        render: (val: string, r: CcXoayRecord) => (
          <span className="text-xs text-slate-600 dark:text-slate-300">
            {val} <span className="text-slate-500 text-[10px]">({r.classPts}p)</span>
          </span>
        ),
      },
      {
        title: 'Fan',
        dataIndex: 'fan',
        key: 'fan',
        width: 80,
        render: (val: string, r: CcXoayRecord) => (
          <span className="tabular-nums text-xs text-slate-400">
            {val} <span className="text-slate-500 text-[10px]">({r.fanPts}p)</span>
          </span>
        ),
      },
      {
        title: 'Type',
        dataIndex: 'type',
        key: 'type',
        width: 90,
        render: (val: string, r: CcXoayRecord) => (
          <span className="text-xs text-slate-400">
            {val} <span className="text-slate-500 text-[10px]">({r.typePts}p)</span>
          </span>
        ),
      },
      {
        title: 'Số Sợi',
        dataIndex: 'lashCount',
        key: 'lashCount',
        width: 95,
        align: 'right' as const,
        render: (val: number, r: CcXoayRecord) => (
          <span className="tabular-nums text-xs text-slate-600 dark:text-slate-300">
            {val}s <span className="text-slate-500 text-[10px]">({r.lashPts}p)</span>
          </span>
        ),
      },
      {
        title: 'Dáng Mi',
        dataIndex: 'design',
        key: 'design',
        width: 100,
        render: (val: string, r: CcXoayRecord) => (
          <span className="text-xs text-slate-400">
            {val} <span className="text-slate-500 text-[10px]">({r.designPts}p)</span>
          </span>
        ),
      },
      {
        title: 'Màu Mi',
        dataIndex: 'color',
        key: 'color',
        width: 90,
        render: (val: string, r: CcXoayRecord) => (
          <span className="text-xs text-slate-400">
            {val} <span className="text-slate-500 text-[10px]">({r.colorPts}p)</span>
          </span>
        ),
      },
      {
        title: 'FAL Rule',
        dataIndex: 'falRule',
        key: 'falRule',
        width: 80,
        render: (val?: string, record?: CcXoayRecord) => {
          if (!val) return <span className="text-xs text-slate-500">-</span>;
          const fal = record?.fal;
          return (
            <Tooltip
              title={
                fal
                  ? `${fal.caseRole === 'ORIGIN' ? 'Ca gốc' : 'Ca xử lý'} · ${fal.totalMinutes ?? '?'} phút · ${fal.compensationMode}${fal.decisionStatus ? ` · ${fal.decisionStatus}` : ''}`
                  : val
              }
            >
              <Tag
                color={
                  fal?.compensationMode === 'BLOCKED'
                    ? 'default'
                    : val === 'Fix'
                      ? 'error'
                      : val === 'Adjust'
                        ? 'warning'
                        : 'blue'
                }
                className="font-semibold text-[10px] m-0 py-0 px-1"
              >
                {val}
                {fal?.compensationMode === 'BLOCKED' ? ' · Chờ' : ''}
              </Tag>
            </Tooltip>
          );
        },
      },
    ],
    []
  );

  const {
    loading: configLoading,
    columns: configuredColumns,
    rawConfig,
    configVisible,
    openConfig,
    closeConfig,
    saveConfig,
    resetConfig,
  } = useTableConfig('cc_xoay_table', staticColumns);

  return (
    <Card
      title={
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base m-0" style={{ color: token.colorText }}>
              Bảng Dữ Liệu Báo Cáo CC Xoay
            </h3>
          </div>

          <Space wrap>
            <Input
              aria-label="Tìm kiếm khách hàng, dịch vụ, CC"
              prefix={<SearchOutlined />}
              placeholder="Tìm khách hàng, dịch vụ, CC..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 220 }}
              allowClear
            />
            <Tooltip title={isCompact ? 'Chuyển Chế Độ Xem Chuẩn' : 'Chuyển Chế Độ Xem Gọn (Compact)'}>
              <Button
                aria-label={isCompact ? 'Chuyển Chế Độ Xem Chuẩn' : 'Chuyển Chế Độ Xem Gọn'}
                icon={isCompact ? <ExpandOutlined /> : <CompressOutlined />}
                onClick={() => setIsCompact(!isCompact)}
                className={isCompact ? 'text-amber-500 border-amber-500/50' : ''}
              />
            </Tooltip>
            {onRefresh && (
              <Tooltip title="Làm mới dữ liệu">
                <Button aria-label="Làm mới dữ liệu" icon={<ReloadOutlined />} onClick={onRefresh} />
              </Tooltip>
            )}
            <Tooltip title="Cấu hình cột">
              <Button aria-label="Cấu hình cột" icon={<SettingOutlined />} onClick={openConfig} />
            </Tooltip>
          </Space>
        </div>
      }
      variant="outlined"
      style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
      styles={{ body: { padding: 0 } }}
      className="full-bleed-card shadow-sm rounded-xl"
    >
      {capSummary.cappedCount > 0 || capSummary.warningCount > 0 ? (
        <div className="p-3 border-b border-amber-500/20 bg-amber-500/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <FireOutlined className="text-amber-500 text-sm" />
            <span className="font-semibold text-amber-800 dark:text-amber-300">
              ⚠️ Quản Lý Hạn Mức Vòng Xoay (Trần 1.5x CC Daily Bonus Tháng):
            </span>
            {capSummary.cappedCount > 0 && (
              <Tag color="error" className="m-0 font-bold">
                ⛔ {capSummary.cappedCount} CC ĐẠT TRẦN ({capSummary.cappedNames.join(', ')})
              </Tag>
            )}
            {capSummary.warningCount > 0 && (
              <Tag color="warning" className="m-0 font-bold">
                ⚠️ {capSummary.warningCount} CC SẮP CHẠM TRẦN ({capSummary.warningNames.join(', ')})
              </Tag>
            )}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
            *Thưởng Vòng xoay tối đa = 1.5 × CC Daily Bonus tháng
          </span>
        </div>
      ) : null}

      <Table
        dataSource={filteredData}
        columns={configuredColumns}
        rowKey={(record) => `${record.serviceId}-${record.consultantId || ''}-${record.checkin}`}
        loading={loading || configLoading}
        size="small"
        bordered
        scroll={{ x: 2300 }}
        pagination={{
          defaultPageSize: 50,
          pageSizeOptions: ['20', '50', '100', '200'],
          showSizeChanger: true,
          showTotal: (totalCount) => `Tổng cộng ${totalCount} bản ghi lượt dịch vụ`,
        }}
        className={isCompact ? 'antd-custom-table compact-table' : 'antd-custom-table'}
        locale={{ emptyText: 'Không có dữ liệu CC Xoay trong khoảng thời gian này' }}
      />

      <TableConfigDrawer
        visible={configVisible}
        onClose={closeConfig}
        title="Cấu hình cột Báo Cáo CC Xoay"
        columns={rawConfig}
        onSave={saveConfig}
        onReset={resetConfig}
      />
    </Card>
  );
}

export default React.memo(CcXoayTabComponent);
