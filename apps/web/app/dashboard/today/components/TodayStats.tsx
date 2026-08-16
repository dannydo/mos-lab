'use client';

import React from 'react';
import { Card, Row, Col, Typography, theme } from 'antd';
import { CalendarOutlined, PieChartOutlined, BarChartOutlined } from '@ant-design/icons';
import { BookingData, ComingClientData, BranchDetail } from '../hooks/useTodayData';
import { formatVND } from '../../../../lib/format-utils';

const { Text } = Typography;

interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

const DonutChart = ({
  segments,
  total,
  themeMode,
  centerLabel,
  centerSubLabel = 'tổng',
  size = 92,
}: {
  segments: DonutSegment[];
  total: number;
  themeMode: 'light' | 'dark';
  centerLabel?: string;
  centerSubLabel?: string;
  size?: number;
}) => {
  let accumulatedPercent = 0;
  return (
    <div
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx="18"
          cy="18"
          r="15.915"
          fill="none"
          stroke={themeMode === 'dark' ? '#2d2d2d' : '#f0f0f0'}
          strokeWidth="3.4"
        />
        {segments.map((seg, idx) => {
          const percent = total > 0 ? (seg.value / total) * 100 : 0;
          if (percent === 0) return null;
          const strokeDasharray = `${percent} ${100 - percent}`;
          const strokeDashoffset = -accumulatedPercent;
          accumulatedPercent += percent;
          return (
            <circle
              key={idx}
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              stroke={seg.color}
              strokeWidth="4.0"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
          );
        })}
      </svg>
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontSize: centerLabel && centerLabel.length > 5 ? '12px' : '17px',
            fontWeight: 'bold',
            lineHeight: 1,
            color: themeMode === 'dark' ? '#ffffff' : '#141414',
          }}
        >
          {centerLabel !== undefined ? centerLabel : total}
        </span>
        {centerSubLabel && (
          <span
            style={{
              fontSize: '9px',
              opacity: 0.5,
              marginTop: '3px',
              color: '#8c8c8c',
            }}
          >
            {centerSubLabel}
          </span>
        )}
      </div>
    </div>
  );
};

const formatCenterRevenue = (val: number) => {
  const rounded = Math.round(val || 0);
  if (rounded >= 1000000) {
    return `${(rounded / 1000000).toFixed(1).replace('.0', '')}M`;
  }
  if (rounded >= 1000) {
    return `${(rounded / 1000).toFixed(0)}k`;
  }
  return String(rounded);
};

interface TodayStatsProps {
  themeMode: 'light' | 'dark';
  token: SafeAny;
  allBookings: BookingData[];
  bookingsCombo: BookingData[];
  bookingsOc: BookingData[];
  bookingsOther: BookingData[];
  bookingBranchCounts: { dt: number; pxl: number; ep: number; total: number };
  branchesData: Record<string, BranchDetail>;
  showTax: boolean;
}

export default function TodayStats({
  themeMode,
  token,
  allBookings,
  bookingsCombo,
  bookingsOc,
  bookingsOther,
  bookingBranchCounts,
  branchesData,
  showTax,
}: TodayStatsProps) {
  const getItemPrice = React.useCallback(
    (item: SafeAny) => {
      const rawPrice =
        typeof item.price === 'number' ? item.price : Number(String(item.ltv || '').replace(/[^\d]/g, '')) || 0;
      const tax = Number(item.tax || 0);
      return Math.round(showTax ? rawPrice : rawPrice - tax);
    },
    [showTax]
  );

  const comingBranchStats = React.useMemo(() => {
    let dtCount = 0,
      dtPrice = 0;
    let epCount = 0,
      epPrice = 0;
    let pxlCount = 0,
      pxlPrice = 0;

    (branchesData.detham?.coming || []).forEach((item: SafeAny) => {
      dtCount++;
      if (item.status === 'completed') {
        dtPrice += getItemPrice(item);
      }
    });
    (branchesData.estella?.coming || []).forEach((item: SafeAny) => {
      epCount++;
      if (item.status === 'completed') {
        epPrice += getItemPrice(item);
      }
    });
    (branchesData.pxl?.coming || []).forEach((item: SafeAny) => {
      pxlCount++;
      if (item.status === 'completed') {
        pxlPrice += getItemPrice(item);
      }
    });

    const totalCount = dtCount + epCount + pxlCount;
    const totalPrice = dtPrice + epPrice + pxlPrice;

    return {
      dt: { count: dtCount, price: dtPrice },
      ep: { count: epCount, price: epPrice },
      pxl: { count: pxlCount, price: pxlPrice },
      totalCount,
      totalPrice,
    };
  }, [branchesData, getItemPrice]);

  const comingStats = React.useMemo(() => {
    let comboCount = 0,
      comboPrice = 0;
    let ocCount = 0,
      ocPrice = 0;
    let otherCount = 0,
      otherPrice = 0;

    const allComing = Object.keys(branchesData).flatMap((branchKey) => branchesData[branchKey].coming || []);
    allComing.forEach((item) => {
      const price = item.status === 'completed' ? getItemPrice(item) : 0;
      if (item.category === 'combo') {
        comboCount++;
        comboPrice += price;
      } else if (item.category === 'oc') {
        ocCount++;
        ocPrice += price;
      } else {
        otherCount++;
        otherPrice += price;
      }
    });

    const totalCount = allComing.length;
    const totalPrice = comboPrice + ocPrice + otherPrice;

    return {
      combo: { count: comboCount, price: comboPrice },
      oc: { count: ocCount, price: ocPrice },
      other: { count: otherCount, price: otherPrice },
      totalCount,
      totalPrice,
    };
  }, [branchesData, getItemPrice]);

  const comingStatusStats = React.useMemo(() => {
    let doneCount = 0,
      donePrice = 0;
    let servingCount = 0,
      servingPrice = 0;
    let lateCount = 0,
      latePrice = 0;
    let pendingCount = 0,
      pendingPrice = 0;

    const allComing = Object.keys(branchesData).flatMap((branchKey) => branchesData[branchKey].coming || []);
    allComing.forEach((item) => {
      const price = item.status === 'completed' ? getItemPrice(item) : 0;
      if (item.status === 'completed') {
        doneCount++;
        donePrice += price;
      } else if (item.status === 'serving' || item.status === 'arrived') {
        servingCount++;
        servingPrice += price;
      } else if (item.status === 'late') {
        lateCount++;
        latePrice += price;
      } else {
        pendingCount++;
        pendingPrice += price;
      }
    });

    const totalCount = allComing.length;

    return {
      done: { count: doneCount, price: donePrice },
      serving: { count: servingCount, price: servingPrice },
      late: { count: lateCount, price: latePrice },
      pending: { count: pendingCount, price: pendingPrice },
      totalCount,
    };
  }, [branchesData, getItemPrice]);

  const totalRevenueData = React.useMemo(() => {
    const revLe = Object.values(branchesData).reduce((sum, b) => sum + (showTax ? b.revLe || 0 : b.netLe || 0), 0);
    const revCombo = Object.values(branchesData).reduce(
      (sum, b) => sum + (showTax ? b.revCombo || 0 : b.netCombo || 0),
      0
    );
    const revProduct = Object.values(branchesData).reduce(
      (sum, b) => sum + (showTax ? b.revProduct || 0 : b.netProduct || 0),
      0
    );
    const total = revLe + revCombo + revProduct;
    return { revLe, revCombo, revProduct, total };
  }, [branchesData, showTax]);

  const categoryRevenueData = React.useMemo(() => {
    let revCombo = 0;
    let revTele = 0;
    let revOther = 0;

    const allComing = Object.keys(branchesData).flatMap((branchKey) => branchesData[branchKey].coming || []);
    allComing.forEach((item) => {
      if (item.status === 'completed') {
        const rawPrice = item.price || 0;
        const tax = item.tax || 0;
        const price = showTax ? rawPrice : rawPrice - tax;

        if (item.category === 'combo') {
          revCombo += price;
        } else if (item.category === 'oc') {
          revTele += price;
        } else {
          revOther += price;
        }
      }
    });

    const total = revCombo + revTele + revOther;
    return { revCombo, revTele, revOther, total };
  }, [branchesData, showTax]);

  return (
    <Row gutter={[16, 16]}>
      {/* CHART 1: PHÂN TÍCH BOOKING TẠO HÔM NAY */}
      <Col xs={24} sm={24} md={24} lg={24} xl={8}>
        <Card
          size="small"
          style={{
            background: token.colorBgContainer,
            borderColor: token.colorBorderSecondary,
            height: '200px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <span style={{ fontWeight: 'bold', fontSize: '13px', color: token.colorTextSecondary }}>
              <CalendarOutlined style={{ color: '#52c41a', marginRight: '6px' }} />
              Booking Tạo Hôm Nay
            </span>
            <strong
              className="tabular-nums"
              style={{ fontSize: '15px', color: token.colorText, fontVariantNumeric: 'tabular-nums' }}
            >
              {allBookings.length}
            </strong>
          </div>

          <Row gutter={16} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            {/* Left Column: Cơ cấu nhóm */}
            <Col
              span={12}
              style={{
                display: 'flex',
                flexDirection: 'column',
                borderRight: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}`,
                paddingRight: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: token.colorTextDescription,
                  fontWeight: 500,
                  marginBottom: '8px',
                }}
              >
                Nhóm khách
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <DonutChart
                  total={allBookings.length}
                  themeMode={themeMode}
                  segments={[
                    { value: bookingsCombo.length, color: '#D4A84B', label: 'Combo' },
                    { value: bookingsOc.length, color: '#52C41A', label: 'Tele' },
                    { value: bookingsOther.length, color: '#1890FF', label: 'Khác' },
                  ]}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#D4A84B',
                        borderRadius: '50%',
                        marginRight: '4px',
                      }}
                    />
                    Combo:{' '}
                    <strong className="tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {bookingsCombo.length}
                    </strong>
                  </div>
                  <div style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#52C41A',
                        borderRadius: '50%',
                        marginRight: '4px',
                      }}
                    />
                    Tele:{' '}
                    <strong className="tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {bookingsOc.length}
                    </strong>
                  </div>
                  <div style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#1890FF',
                        borderRadius: '50%',
                        marginRight: '4px',
                      }}
                    />
                    Khác:{' '}
                    <strong className="tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {bookingsOther.length}
                    </strong>
                  </div>
                </div>
              </div>
            </Col>

            {/* Right Column: Chi nhánh */}
            <Col span={12} style={{ display: 'flex', flexDirection: 'column', paddingLeft: '8px' }}>
              <div
                style={{
                  fontSize: '12px',
                  color: token.colorTextDescription,
                  fontWeight: 500,
                  marginBottom: '8px',
                }}
              >
                Chi nhánh
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <DonutChart
                  total={allBookings.length}
                  themeMode={themeMode}
                  segments={[
                    { value: bookingBranchCounts.dt, color: '#722ED1', label: 'Đ.Thám' },
                    { value: bookingBranchCounts.ep, color: '#13C2C2', label: 'Estella' },
                    { value: bookingBranchCounts.pxl, color: '#EB2F96', label: 'PXL' },
                  ]}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#722ED1',
                        borderRadius: '50%',
                        marginRight: '4px',
                      }}
                    />
                    DT:{' '}
                    <strong className="tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {bookingBranchCounts.dt}
                    </strong>
                  </div>
                  <div style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#13C2C2',
                        borderRadius: '50%',
                        marginRight: '4px',
                      }}
                    />
                    EP:{' '}
                    <strong className="tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {bookingBranchCounts.ep}
                    </strong>
                  </div>
                  <div style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#EB2F96',
                        borderRadius: '50%',
                        marginRight: '4px',
                      }}
                    />
                    PXL:{' '}
                    <strong className="tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {bookingBranchCounts.pxl}
                    </strong>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      </Col>

      {/* CHART 2 & 3 COMBINED: PHÂN TÍCH KHÁCH ĐẾN HÔM NAY */}
      <Col xs={24} sm={24} md={24} lg={24} xl={8}>
        <Card
          size="small"
          style={{
            background: token.colorBgContainer,
            borderColor: token.colorBorderSecondary,
            height: '200px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <span style={{ fontWeight: 'bold', fontSize: '13px', color: token.colorTextSecondary }}>
              <PieChartOutlined style={{ color: '#1890ff', marginRight: '6px' }} />
              Khách Đến Hôm Nay
            </span>
            <strong
              className="tabular-nums"
              style={{ fontSize: '13px', color: token.colorText, fontVariantNumeric: 'tabular-nums' }}
              title={`Tổng cộng: ${comingStats.totalCount} khách • ${Math.round(comingStats.totalPrice || 0).toLocaleString('vi-VN')} đ`}
            >
              {comingStats.totalCount} khách • {Math.round(comingStats.totalPrice || 0).toLocaleString('vi-VN')} đ
            </strong>
          </div>

          <Row gutter={16} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            {/* Left Column: Cơ cấu khách đến */}
            <Col
              span={12}
              style={{
                display: 'flex',
                flexDirection: 'column',
                borderRight: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}`,
                paddingRight: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: token.colorTextDescription,
                  fontWeight: 500,
                  marginBottom: '8px',
                }}
              >
                Nhóm khách
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <DonutChart
                  total={comingStats.totalCount}
                  themeMode={themeMode}
                  segments={[
                    { value: comingStats.combo.count, color: '#D4A84B', label: 'Combo' },
                    { value: comingStats.oc.count, color: '#52C41A', label: 'Tele' },
                    { value: comingStats.other.count, color: '#1890FF', label: 'Khác' },
                  ]}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, overflow: 'hidden' }}>
                  <div
                    style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}
                    title={`Combo: ${comingStats.combo.count} khách • ${Math.round(comingStats.combo.price || 0).toLocaleString('vi-VN')} đ`}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#D4A84B',
                        borderRadius: '50%',
                        marginRight: '4px',
                      }}
                    />
                    Combo: <strong className="tabular-nums">{comingStats.combo.count}</strong>{' '}
                    <span style={{ fontSize: '9.5px', color: token.colorTextDescription }}>
                      ({formatCenterRevenue(comingStats.combo.price)})
                    </span>
                  </div>
                  <div
                    style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}
                    title={`Telesales: ${comingStats.oc.count} khách • ${Math.round(comingStats.oc.price || 0).toLocaleString('vi-VN')} đ`}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#52C41A',
                        borderRadius: '50%',
                        marginRight: '4px',
                      }}
                    />
                    Tele: <strong className="tabular-nums">{comingStats.oc.count}</strong>{' '}
                    <span style={{ fontSize: '9.5px', color: token.colorTextDescription }}>
                      ({formatCenterRevenue(comingStats.oc.price)})
                    </span>
                  </div>
                  <div
                    style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}
                    title={`Khác: ${comingStats.other.count} khách • ${Math.round(comingStats.other.price || 0).toLocaleString('vi-VN')} đ`}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#1890FF',
                        borderRadius: '50%',
                        marginRight: '4px',
                      }}
                    />
                    Khác: <strong className="tabular-nums">{comingStats.other.count}</strong>{' '}
                    <span style={{ fontSize: '9.5px', color: token.colorTextDescription }}>
                      ({formatCenterRevenue(comingStats.other.price)})
                    </span>
                  </div>
                </div>
              </div>
            </Col>

            {/* Right Column: Trạng thái khách đến */}
            <Col span={12} style={{ display: 'flex', flexDirection: 'column', paddingLeft: '8px' }}>
              <div
                style={{
                  fontSize: '12px',
                  color: token.colorTextDescription,
                  fontWeight: 500,
                  marginBottom: '8px',
                }}
              >
                Trạng thái
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <DonutChart
                  total={comingStatusStats.totalCount}
                  themeMode={themeMode}
                  segments={[
                    { value: comingStatusStats.done.count, color: '#52C41A', label: 'Done' },
                    { value: comingStatusStats.serving.count, color: '#13C2C2', label: 'Đang làm' },
                    { value: comingStatusStats.late.count, color: '#FF4D4F', label: 'Muộn' },
                    { value: comingStatusStats.pending.count, color: '#FAAD14', label: 'Chờ' },
                  ]}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflow: 'hidden' }}>
                  <div
                    style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
                    title={`Hoàn thành: ${comingStatusStats.done.count} khách • ${Math.round(comingStatusStats.done.price || 0).toLocaleString('vi-VN')} đ`}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#52C41A',
                        borderRadius: '50%',
                        marginRight: '4px',
                      }}
                    />
                    Done: <strong className="tabular-nums">{comingStatusStats.done.count}</strong>{' '}
                    <span style={{ fontSize: '9px', color: token.colorTextDescription }}>
                      ({formatCenterRevenue(comingStatusStats.done.price)})
                    </span>
                  </div>
                  <div
                    style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
                    title={`Đang làm: ${comingStatusStats.serving.count} khách • ${Math.round(comingStatusStats.serving.price || 0).toLocaleString('vi-VN')} đ`}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#13C2C2',
                        borderRadius: '50%',
                        marginRight: '4px',
                      }}
                    />
                    Đang làm: <strong className="tabular-nums">{comingStatusStats.serving.count}</strong>{' '}
                    <span style={{ fontSize: '9px', color: token.colorTextDescription }}>
                      ({formatCenterRevenue(comingStatusStats.serving.price)})
                    </span>
                  </div>
                  <div
                    style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
                    title={`Đến muộn: ${comingStatusStats.late.count} khách`}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#FF4D4F',
                        borderRadius: '50%',
                        marginRight: '4px',
                      }}
                    />
                    Muộn: <strong className="tabular-nums">{comingStatusStats.late.count}</strong>
                  </div>
                  <div
                    style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
                    title={`Chờ đến: ${comingStatusStats.pending.count} khách`}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#FAAD14',
                        borderRadius: '50%',
                        marginRight: '4px',
                      }}
                    />
                    Chờ: <strong className="tabular-nums">{comingStatusStats.pending.count}</strong>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      </Col>

      {/* CHART 4: REVENUE BY TYPE & BY CUSTOMER GROUP */}
      <Col xs={24} sm={24} md={24} lg={24} xl={8}>
        <Card
          size="small"
          style={{
            background: token.colorBgContainer,
            borderColor: token.colorBorderSecondary,
            height: '200px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <span style={{ fontWeight: 'bold', fontSize: '13px', color: token.colorTextSecondary }}>
              <BarChartOutlined style={{ color: '#D4A84B', marginRight: '6px' }} />
              Doanh Thu Thực Tế
            </span>
            <strong
              className="tabular-nums"
              style={{ fontSize: '14px', color: token.colorText, fontVariantNumeric: 'tabular-nums' }}
              title={`Tổng cộng: ${Math.round(totalRevenueData.total || 0).toLocaleString('vi-VN')} đ`}
            >
              {Math.round(totalRevenueData.total || 0).toLocaleString('vi-VN')} đ
            </strong>
          </div>

          <Row gutter={16} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            {/* Left Column: Nhóm sản phẩm */}
            <Col
              span={12}
              style={{
                display: 'flex',
                flexDirection: 'column',
                borderRight: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}`,
                paddingRight: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: token.colorTextDescription,
                  fontWeight: 500,
                  marginBottom: '8px',
                }}
              >
                Nhóm sản phẩm
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <DonutChart
                  total={totalRevenueData.total}
                  centerLabel={formatCenterRevenue(totalRevenueData.total)}
                  centerSubLabel="doanh thu"
                  themeMode={themeMode}
                  segments={[
                    { value: totalRevenueData.revCombo, color: '#D4A84B', label: 'Combo' },
                    { value: totalRevenueData.revLe, color: '#1890FF', label: 'Lẻ' },
                    { value: totalRevenueData.revProduct, color: '#FA8C16', label: 'Sản phẩm' },
                  ]}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, overflow: 'hidden' }}>
                  <div
                    style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}
                    title={`Combo: ${Math.round(totalRevenueData.revCombo || 0).toLocaleString('vi-VN')} đ`}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#D4A84B',
                        borderRadius: '50%',
                        marginRight: '4px',
                      }}
                    />
                    Combo: <strong className="tabular-nums">{formatCenterRevenue(totalRevenueData.revCombo)}</strong>
                  </div>
                  <div
                    style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}
                    title={`Lẻ (Single): ${Math.round(totalRevenueData.revLe || 0).toLocaleString('vi-VN')} đ`}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#1890FF',
                        borderRadius: '50%',
                        marginRight: '4px',
                      }}
                    />
                    Lẻ: <strong className="tabular-nums">{formatCenterRevenue(totalRevenueData.revLe)}</strong>
                  </div>
                  <div
                    style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}
                    title={`Sản phẩm: ${Math.round(totalRevenueData.revProduct || 0).toLocaleString('vi-VN')} đ`}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#FA8C16',
                        borderRadius: '50%',
                        marginRight: '4px',
                      }}
                    />
                    SP: <strong className="tabular-nums">{formatCenterRevenue(totalRevenueData.revProduct)}</strong>
                  </div>
                </div>
              </div>
            </Col>

            {/* Right Column: Nhóm khách */}
            <Col span={12} style={{ display: 'flex', flexDirection: 'column', paddingLeft: '8px' }}>
              <div
                style={{
                  fontSize: '12px',
                  color: token.colorTextDescription,
                  fontWeight: 500,
                  marginBottom: '8px',
                }}
              >
                Nhóm khách
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <DonutChart
                  total={categoryRevenueData.total}
                  centerLabel={formatCenterRevenue(categoryRevenueData.total)}
                  centerSubLabel="doanh thu"
                  themeMode={themeMode}
                  segments={[
                    { value: categoryRevenueData.revCombo, color: '#D4A84B', label: 'Combo' },
                    { value: categoryRevenueData.revTele, color: '#52C41A', label: 'Tele' },
                    { value: categoryRevenueData.revOther, color: '#1890FF', label: 'Khác' },
                  ]}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#D4A84B',
                        borderRadius: '50%',
                        marginRight: '4px',
                      }}
                    />
                    Combo: <strong>{formatCenterRevenue(categoryRevenueData.revCombo)}</strong>
                  </div>
                  <div style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#52C41A',
                        borderRadius: '50%',
                        marginRight: '4px',
                      }}
                    />
                    Tele: <strong>{formatCenterRevenue(categoryRevenueData.revTele)}</strong>
                  </div>
                  <div style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#1890FF',
                        borderRadius: '50%',
                        marginRight: '4px',
                      }}
                    />
                    Khác: <strong>{formatCenterRevenue(categoryRevenueData.revOther)}</strong>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      </Col>
    </Row>
  );
}
