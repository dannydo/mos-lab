'use client';

import '../../suppress-warnings';
import React, { useEffect } from 'react';
import {
  Typography,
  Card,
  theme,
  DatePicker,
  Select,
  Radio,
  Space,
  Row,
  Col,
  Table,
  Progress,
  Badge,
  Spin,
  Divider,
  Button,
  Tooltip,
  message,
} from 'antd';
import {
  PhoneOutlined,
  CalendarOutlined,
  PieChartOutlined,
  TrophyOutlined,
  UserOutlined,
  DollarOutlined,
  SettingOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import dynamic from 'next/dynamic';
import { useTheme } from '../../../context/ThemeContext';
import { useKpiData } from './hooks/useKpiData';

// Modular Sub-components
import KpiTrendsChart from './components/KpiTrendsChart';
const SalaryConfigDrawer = dynamic(() => import('./components/SalaryConfigDrawer'), { ssr: false });
const AppointmentsAuditDrawer = dynamic(() => import('./components/AppointmentsAuditDrawer'), { ssr: false });
import { getLeaderboardColumns } from './components/KpiColumns';
import { LeaderboardSummary } from './components/LeaderboardSummary';

dayjs.extend(isoWeek);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

import { BookerSalary, LeaderboardEntry } from '@mos-lab/shared';
import { getPercent } from '../../../lib/format-utils';

export default function KPIPage() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  const {
    currentUser,
    viewMode,
    setViewMode,
    referenceDate,
    setReferenceDate,
    dateRange,
    setDateRange,
    pickerOpen,
    setPickerOpen,
    selectedBookerId,
    selectedBookerName,
    selectedStaffRecord,
    appointmentsDrawerOpen,
    setAppointmentsDrawerOpen,
    selectedStaffId,
    setSelectedStaffId,
    selectedRole,
    setSelectedRole,
    loading,
    summary,
    breakdown,
    trends,
    leaderboard,
    configDrawerOpen,
    setConfigDrawerOpen,
    fetchKpiData,
    handleShowAppointments,
    getPeriodLabel,
    handleNavigate,
  } = useKpiData({
    onSuccess: (msg) => message.success(msg),
    onError: (msg) => message.error(msg),
  });

  const isAdmin = currentUser?.role === 'admin';

  const leaderboardColumns = React.useMemo(
    () =>
      getLeaderboardColumns({
        selectedRole,
        token,
        handleShowAppointments,
        getPercent,
      }),
    [selectedRole, token, handleShowAppointments]
  );

  return (
    <div>
      {/* HEADER SECTION */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div>
          <Title level={2} style={{ color: token.colorPrimary, margin: 0 }}>
            KPI & Báo Cáo Hiệu Suất
          </Title>
          <Text style={{ color: token.colorTextDescription }}>
            Giám sát tỷ lệ chuyển đổi cuộc gọi thành lịch hẹn và doanh thu thưởng commission
          </Text>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Space wrap>
            <Radio.Group
              value={viewMode}
              onChange={(e) => {
                setViewMode(e.target.value);
                setReferenceDate(dayjs());
              }}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="month">Tháng</Radio.Button>
              <Radio.Button value="week">Tuần</Radio.Button>
              <Radio.Button value="day">Ngày</Radio.Button>
            </Radio.Group>

            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Space.Compact>
                <Button icon={<LeftOutlined />} onClick={() => handleNavigate(-1)} />
                <Button
                  onClick={() => setPickerOpen(true)}
                  style={{
                    fontWeight: '600',
                    minWidth: '210px',
                    textAlign: 'center',
                    color: token.colorText,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {getPeriodLabel()} <CalendarOutlined style={{ color: token.colorPrimary }} />
                </Button>
                <Button icon={<RightOutlined />} onClick={() => handleNavigate(1)} />
              </Space.Compact>

              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  if (dates) setDateRange([dates[0]!, dates[1]!]);
                }}
                format="DD/MM/YYYY"
                open={pickerOpen}
                onOpenChange={(open) => setPickerOpen(open)}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: '100%',
                  opacity: 0,
                  pointerEvents: 'none',
                  zIndex: -1,
                }}
              />
            </div>
          </Space>

          {isAdmin && (
            <>
              <Radio.Group
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                optionType="button"
                buttonStyle="solid"
                style={{ marginRight: '8px' }}
              >
                <Radio.Button value="telesales">Online Consultant</Radio.Button>
                <Radio.Button value="oc">Client Consultant</Radio.Button>
              </Radio.Group>
              <Select
                value={selectedStaffId}
                onChange={setSelectedStaffId}
                style={{ width: 170 }}
                options={[
                  {
                    value: 'ALL',
                    label: selectedRole === 'oc' ? 'Tất cả Client Consultant' : 'Tất cả Online Consultant',
                  },
                  ...leaderboard.map((s) => ({ value: s.staffId.toString(), label: s.displayName })),
                ]}
                placeholder="Chọn nhân viên"
              />
              {selectedRole === 'telesales' && (
                <Button
                  type="primary"
                  icon={<SettingOutlined />}
                  onClick={() => setConfigDrawerOpen(true)}
                  style={{ background: '#D4A84B', borderColor: '#D4A84B', color: 'black', fontWeight: '500' }}
                >
                  Cấu hình lương
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-24" style={{ height: '300px' }}>
          <Space direction="vertical" align="center">
            <Spin size="large" />
            <Text type="secondary">Đang tải dữ liệu báo cáo...</Text>
          </Space>
        </div>
      ) : (
        <div>
          {/* STATS OVERVIEW CARDS */}
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} sm={12} md={8} lg={4} xl={4}>
              <Card
                variant="outlined"
                style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
              >
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  TỔNG KẾ HOẠCH
                </Text>
                <div style={{ fontSize: '26px', fontWeight: 'bold', margin: '8px 0', color: token.colorText }}>
                  {summary?.totalPlanned}
                </div>
                <Progress percent={100} showInfo={false} strokeColor={token.colorTextDescription} size="small" />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  Kế hoạch đã lên
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4} xl={4}>
              <Card
                variant="outlined"
                style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
              >
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  ĐÃ THỰC HIỆN
                </Text>
                <div style={{ fontSize: '26px', fontWeight: 'bold', margin: '8px 0', color: '#1890FF' }}>
                  {summary?.totalCalled}
                </div>
                <Progress
                  percent={getPercent(summary?.totalCalled || 0, summary?.totalPlanned || 0)}
                  showInfo={false}
                  strokeColor="#1890FF"
                  size="small"
                />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  Đạt: {getPercent(summary?.totalCalled || 0, summary?.totalPlanned || 0)}% kế hoạch
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4} xl={4}>
              <Card
                variant="outlined"
                style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
              >
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  BẮT MÁY
                </Text>
                <div style={{ fontSize: '26px', fontWeight: 'bold', margin: '8px 0', color: '#52C41A' }}>
                  {getPercent(summary?.totalAnswered || 0, summary?.totalCalled || 0)}%
                </div>
                <Progress
                  percent={getPercent(summary?.totalAnswered || 0, summary?.totalCalled || 0)}
                  showInfo={false}
                  strokeColor="#52C41A"
                  size="small"
                />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {summary?.totalAnswered} cuộc bắt máy
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4} xl={4}>
              <Card
                variant="outlined"
                style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
              >
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  ĐẶT LỊCH (BOOKED)
                </Text>
                <div style={{ fontSize: '26px', fontWeight: 'bold', margin: '8px 0', color: token.colorPrimary }}>
                  {getPercent(summary?.totalBooked || 0, summary?.totalAnswered || 0)}%
                </div>
                <Progress
                  percent={getPercent(summary?.totalBooked || 0, summary?.totalAnswered || 0)}
                  showInfo={false}
                  strokeColor={token.colorPrimary}
                  size="small"
                />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {summary?.totalBooked} lịch hẹn thành công
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4} xl={4}>
              <Card
                variant="outlined"
                style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
              >
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  ĐẾN TIỆM (CHECKIN)
                </Text>
                <div style={{ fontSize: '26px', fontWeight: 'bold', margin: '8px 0', color: '#722ED1' }}>
                  {getPercent(summary?.totalCheckin || 0, summary?.totalBooked || 0)}%
                </div>
                <Progress
                  percent={getPercent(summary?.totalCheckin || 0, summary?.totalBooked || 0)}
                  showInfo={false}
                  strokeColor="#722ED1"
                  size="small"
                />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {summary?.totalCheckin} khách ghé tiệm
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4} xl={4}>
              <Card variant="outlined" style={{ background: token.colorBgContainer, borderColor: '#D4A84B' }}>
                <Space>
                  <DollarOutlined style={{ color: '#D4A84B', fontSize: '15px' }} />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    THU NHẬP LIVE
                  </Text>
                </Space>
                <div style={{ fontSize: '26px', fontWeight: 'bold', margin: '8px 0', color: '#D4A84B' }}>
                  {(summary?.totalEarnings || 0).toLocaleString('vi-VN')} đ
                </div>
                <Progress percent={100} showInfo={false} strokeColor="#D4A84B" size="small" />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {selectedRole === 'oc'
                    ? 'Tổng lương & thưởng Client Consultant (CC)'
                    : 'Tổng lương & thưởng Online Consultant (OC)'}
                </Text>
              </Card>
            </Col>
          </Row>

          {/* SALARY BREAKDOWN CARD (LIVE PAYSTUB) */}
          {summary?.salary && (
            <Card
              title={
                <span style={{ color: token.colorText }}>
                  <DollarOutlined style={{ color: '#D4A84B' }} />{' '}
                  {summary.salary.role === 'oc'
                    ? 'Chi Tiết Lương & Thưởng Client Consultant (Live Paystub)'
                    : 'Chi Tiết Lương & Hoa Hồng Online Consultant (Live Paystub)'}
                </span>
              }
              variant="outlined"
              className="mb-6"
              style={{ background: token.colorBgContainer, borderColor: '#D4A84B' }}
            >
              {summary.salary.role === 'oc' ? (
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={8}>
                    <div
                      style={{ padding: '12px', borderRight: `1px solid ${token.colorBorderSecondary}` }}
                      className="md:border-r"
                    >
                      <Text type="secondary" style={{ fontSize: '12px', fontWeight: '600' }}>
                        LƯƠNG CƠ BẢN & CHIẾN DỊCH
                      </Text>
                      <div className="flex justify-between items-center mt-3">
                        <Text style={{ color: token.colorText }}>Lương cứng (Wage):</Text>
                        <Text style={{ fontWeight: '600', color: token.colorText }}>
                          {(summary.salary.baseSalary || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <Text style={{ color: token.colorText }}>Tổng số check-in:</Text>
                        <Text style={{ fontWeight: '600', color: token.colorText }}>
                          {summary.salary.checkins || 0} khách
                        </Text>
                      </div>
                    </div>
                  </Col>

                  <Col xs={24} md={8}>
                    <div
                      style={{ padding: '12px', borderRight: `1px solid ${token.colorBorderSecondary}` }}
                      className="md:border-r"
                    >
                      <Text type="secondary" style={{ fontSize: '12px', fontWeight: '600' }}>
                        THƯỞNG DOANH SỐ & PHỤC VỤ
                      </Text>
                      <div className="flex justify-between items-center mt-3">
                        <Text style={{ color: token.colorText }}>Thưởng doanh số (Sales KPI):</Text>
                        <Text style={{ fontWeight: '600', color: '#52C41A' }}>
                          +{(summary.salary.salesReward || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <Text style={{ color: token.colorText }}>Thưởng phục vụ (Servicing KPI):</Text>
                        <Text style={{ fontWeight: '600', color: '#52C41A' }}>
                          +{(summary.salary.servicingReward || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                    </div>
                  </Col>

                  <Col xs={24} md={8}>
                    <div style={{ padding: '12px' }}>
                      <Text type="secondary" style={{ fontSize: '12px', fontWeight: '600' }}>
                        THƯỞNG TĂNG TRƯỞNG & CỬA HÀNG
                      </Text>
                      <div className="flex justify-between items-center mt-3">
                        <Text style={{ color: token.colorText }}>Thưởng tăng trưởng (Growth):</Text>
                        <Text style={{ fontWeight: '600', color: '#52C41A' }}>
                          +{(summary.salary.growthReward || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <Text style={{ color: token.colorText }}>Thưởng phục vụ tiệm (Store):</Text>
                        <Text style={{ fontWeight: '600', color: '#52C41A' }}>
                          +{(summary.salary.storeServicingReward || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                    </div>
                  </Col>
                </Row>
              ) : (
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={8}>
                    <div
                      style={{
                        padding: '12px',
                        borderRight: `1px solid ${token.colorBorderSecondary}`,
                      }}
                      className="md:border-r"
                    >
                      <Text type="secondary" style={{ fontSize: '12px', fontWeight: '600' }}>
                        LƯƠNG CỨNG & HOA HỒNG GỌI
                      </Text>
                      <div className="flex justify-between items-center mt-3">
                        <Text style={{ color: token.colorText }}>Lương cứng cơ bản (Based):</Text>
                        <Text style={{ fontWeight: '600', color: token.colorText }}>
                          {summary.salary.baseSalary.toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <Text style={{ color: token.colorText }}>Thưởng check-in (Client):</Text>
                        <Text style={{ fontWeight: '600', color: token.colorText }}>
                          {(summary.salary.clientBonus || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                    </div>
                  </Col>

                  <Col xs={24} md={8}>
                    <div
                      style={{
                        padding: '12px',
                        borderRight: `1px solid ${token.colorBorderSecondary}`,
                      }}
                      className="md:border-r"
                    >
                      <Text type="secondary" style={{ fontSize: '12px', fontWeight: '600' }}>
                        THƯỞNG HIỆU SUẤT ĐẠT MỐC
                      </Text>
                      <div className="flex justify-between items-center mt-3">
                        <Text style={{ color: token.colorText }}>
                          Thưởng mốc check-in ({summary.salary.doneCount || 0} khách):
                        </Text>
                        <Text style={{ fontWeight: '600', color: '#52C41A' }}>
                          +{(summary.salary.doneBonus || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <Text style={{ color: token.colorText }}>
                          Thưởng tỷ lệ lỡ ({Math.round((summary.salary.missedRate || 0) * 100)}%):
                        </Text>
                        <Text
                          style={{
                            fontWeight: '600',
                            color: (summary.salary.missedBonus || 0) >= 0 ? '#52C41A' : '#FF4D4F',
                          }}
                        >
                          {(summary.salary.missedBonus || 0) >= 0 ? '+' : ''}
                          {(summary.salary.missedBonus || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                    </div>
                  </Col>

                  <Col xs={24} md={8}>
                    <div style={{ padding: '12px' }}>
                      <Text type="secondary" style={{ fontSize: '12px', fontWeight: '600' }}>
                        HOA HỒNG TIPS & DOANH THU
                      </Text>
                      <div className="flex justify-between items-center mt-3">
                        <Text style={{ color: token.colorText }}>
                          Thưởng Tips (7% trên {(summary.salary.totalTips || 0).toLocaleString('vi-VN')} đ):
                        </Text>
                        <Text style={{ fontWeight: '600', color: token.colorText }}>
                          {(summary.salary.tipBonus || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <Text style={{ color: token.colorText }}>
                          Thưởng doanh thu net (trên {(summary.salary.totalNetRev || 0).toLocaleString('vi-VN')} đ):
                        </Text>
                        <Text style={{ fontWeight: '600', color: token.colorText }}>
                          {(summary.salary.revBonus || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                    </div>
                  </Col>
                </Row>
              )}

              <Divider style={{ margin: '16px 0' }} />

              <div className="flex justify-between items-center px-3 flex-wrap gap-2">
                <Text style={{ fontSize: '15px', fontWeight: 'bold', color: token.colorText }}>
                  TỔNG THU NHẬP TẠM TÍNH (LIVE SALARY):
                </Text>
                <Text style={{ fontSize: '22px', fontWeight: 'bold', color: '#D4A84B' }}>
                  {summary.salary.totalSalary.toLocaleString('vi-VN')} đ
                </Text>
              </div>
            </Card>
          )}

          {/* CHARTS SECTION */}
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} lg={16}>
              <KpiTrendsChart trends={trends} />
            </Col>

            <Col xs={24} lg={8}>
              <Card
                title={
                  <span style={{ color: token.colorText }}>
                    <PieChartOutlined /> Phân bổ kết quả cuộc gọi
                  </span>
                }
                variant="outlined"
                style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary, height: '400px' }}
              >
                {!breakdown || Object.values(breakdown).reduce((a, b) => a + b, 0) === 0 ? (
                  <div className="flex justify-center items-center h-64 text-secondary">
                    Chưa có cuộc gọi được thực hiện
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 mt-2">
                    {(() => {
                      const totalLogs = Object.values(breakdown).reduce((a, b) => a + b, 0);
                      const items = [
                        { key: 'BOOKED', label: 'Đặt Lịch (Booked)', value: breakdown.BOOKED, color: '#52C41A' },
                        { key: 'CALL_BACK', label: 'Hẹn Gọi Lại', value: breakdown.CALL_BACK, color: '#FAAD14' },
                        { key: 'NO_ANSWER', label: 'Không Nhấc Máy', value: breakdown.NO_ANSWER, color: '#FF4D4F' },
                        { key: 'BUSY', label: 'Máy Bận', value: breakdown.BUSY, color: '#13C2C2' },
                        { key: 'WRONG_NUMBER', label: 'Sai Số', value: breakdown.WRONG_NUMBER, color: '#F5222D' },
                        { key: 'OTHERS', label: 'Khác', value: breakdown.OTHERS, color: '#8C8C8C' },
                      ];

                      return (
                        <>
                          <div className="w-full flex h-5 rounded-full overflow-hidden mb-4">
                            {items
                              .filter((i) => i.value > 0)
                              .map((item) => (
                                <Tooltip
                                  key={item.key}
                                  title={`${item.label}: ${item.value} (${getPercent(item.value, totalLogs)}%)`}
                                >
                                  <div
                                    style={{
                                      width: `${(item.value / totalLogs) * 100}%`,
                                      background: item.color,
                                    }}
                                    className="h-full cursor-pointer hover:opacity-80 transition-opacity"
                                  />
                                </Tooltip>
                              ))}
                          </div>

                          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                            {items.map((item) => (
                              <div key={item.key} className="flex justify-between items-center">
                                <Space>
                                  <Badge color={item.color} />
                                  <span style={{ fontSize: '13px', color: token.colorText }}>{item.label}</span>
                                </Space>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: token.colorText }}>
                                  {item.value} cuộc{' '}
                                  <Text type="secondary" style={{ fontSize: '11px' }}>
                                    ({getPercent(item.value, totalLogs)}%)
                                  </Text>
                                </span>
                              </div>
                            ))}
                          </div>

                          <Divider style={{ margin: '10px 0' }} />
                          <div className="text-center" style={{ fontSize: '12px', color: token.colorTextDescription }}>
                            Tổng số cuộc gọi đã kết nối: <strong>{totalLogs}</strong>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          {/* ADMIN LEADERBOARD SECTION */}
          {isAdmin && (
            <Card
              title={
                <span style={{ color: token.colorText }}>
                  <TrophyOutlined style={{ color: selectedRole === 'oc' ? '#722ED1' : '#D4A84B' }} /> Bảng Xếp Hạng
                  Doanh Thu Thưởng ({selectedRole === 'oc' ? 'Online Consultant Leaderboard' : 'Booker Leaderboard'})
                </span>
              }
              variant="outlined"
              style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
            >
              <Table
                dataSource={leaderboard}
                columns={leaderboardColumns}
                rowKey="staffId"
                pagination={false}
                bordered
                scroll={{ x: 'max-content' }}
                className="antd-custom-table"
                locale={{ emptyText: 'Chưa có dữ liệu thống kê nhân viên' }}
                summary={(pageData) => (
                  <LeaderboardSummary pageData={pageData} selectedRole={selectedRole} token={token} />
                )}
              />
            </Card>
          )}

          {/* MODULAR CONFIG AND AUDIT DRAWERS */}
          <SalaryConfigDrawer
            open={configDrawerOpen}
            onClose={() => setConfigDrawerOpen(false)}
            onSaveSuccess={() => {
              setConfigDrawerOpen(false);
              fetchKpiData();
            }}
          />

          <AppointmentsAuditDrawer
            open={appointmentsDrawerOpen}
            onClose={() => setAppointmentsDrawerOpen(false)}
            selectedBookerId={selectedBookerId}
            selectedBookerName={selectedBookerName}
            selectedStaffRecord={selectedStaffRecord}
            dateRange={dateRange}
            themeMode={themeMode}
          />
        </div>
      )}
    </div>
  );
}
