'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Spin,
  Row,
  Col,
  Tabs,
  Modal,
  Checkbox,
  Form,
  message,
} from 'antd';
import {
  SyncOutlined,
  PlusOutlined,
  SearchOutlined,
  DollarOutlined,
  TeamOutlined,
  HistoryOutlined,
  SettingOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

interface Deal {
  id: string;
  date: string;
  studentName: string;
  phone?: string;
  courseType: 'basic' | 'full' | 'upsell';
  source: 'marketing' | 'affiliate' | 'walk-in';
  affiliateId?: string;
  affiliateName?: string;
  revenue: number;
  actualRevenue: number;
  courseRevenue?: number;
  salesPerson: string;
  teacher: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  scholarshipPercent?: number;
  kitPrice?: number;
  samplePrice?: number;
}

interface Affiliate {
  id: string;
  name: string;
  phone: string;
  bank?: string;
  stk?: string;
}

const DEFAULT_RATES = {
  basic: { marketing: 100000, affiliate: 200000, sales: 150000, teacher: 50000 },
  full: { marketing: 500000, affiliate: 1500000, sales: 1500000, teacher: 500000 },
  upsell: { marketing: 200000, affiliate: 500000, sales: 1500000, teacher: 0 },
};

const COURSE_REVENUE = {
  basic: 1900000,
  full: 19900000,
  upsell: 18000000,
};

const SALES_BONUS_TIERS = [
  { name: 'Bronze', min: 5, max: 9, bonusPerDeal: 200000, emoji: '🥉' },
  { name: 'Silver', min: 10, max: 14, bonusPerDeal: 500000, emoji: '🥈' },
  { name: 'Gold', min: 15, max: 999, bonusPerDeal: 800000, emoji: '🥇' },
];

const AFFILIATE_BONUS_TIERS = [
  { name: 'Active', min: 3, max: 5, bonusPerDeal: 100000, emoji: '🌟' },
  { name: 'Super', min: 6, max: 999, bonusPerDeal: 300000, emoji: '🌟🌟' },
];

const DEFAULT_DEALS: Deal[] = [
  {
    id: 'd1',
    date: '2026-07-15',
    studentName: 'Lê Thuỳ Trang',
    phone: '0912345678',
    courseType: 'full',
    source: 'marketing',
    revenue: 19900000,
    actualRevenue: 19900000,
    salesPerson: 'Trần Lan',
    teacher: 'Cô Ánh',
    status: 'confirmed',
    scholarshipPercent: 0,
    kitPrice: 0,
    samplePrice: 0,
  },
  {
    id: 'd2',
    date: '2026-07-16',
    studentName: 'Phạm Minh Hằng',
    phone: '0987654321',
    courseType: 'basic',
    source: 'affiliate',
    affiliateId: 'af1',
    affiliateName: 'Nail Queen Q3',
    revenue: 1900000,
    actualRevenue: 1900000,
    salesPerson: 'Nguyễn Hồng',
    teacher: 'Cô Mai',
    status: 'pending',
    scholarshipPercent: 10,
    kitPrice: 0,
    samplePrice: 0,
  },
];

const DEFAULT_AFFILIATES: Affiliate[] = [
  { id: 'af1', name: 'Nail Queen Q3', phone: '0901234567', bank: 'Techcombank', stk: '19033452627011' },
  { id: 'af2', name: 'Spa Quỳnh Anh Q1', phone: '0907654321', bank: 'Vietcombank', stk: '0071000344567' },
];

export default function CommissionPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [enableSafetyCap, setEnableSafetyCap] = useState(true);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [currentTab, setCurrentTab] = useState('deals');

  // Modals
  const [dealModalVisible, setDealModalVisible] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [dealForm] = Form.useForm();

  const [affiliateModalVisible, setAffiliateModalVisible] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [affiliateForm] = Form.useForm();

  // Load from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDeals = localStorage.getItem('wings_comm_deals_v1');
      const savedAffiliates = localStorage.getItem('wings_comm_affiliates_v1');
      const savedRates = localStorage.getItem('wings_commission_rates');
      const savedCap = localStorage.getItem('wings_commission_enable_safety_cap');

      if (savedDeals) setDeals(JSON.parse(savedDeals));
      else setDeals(DEFAULT_DEALS);

      if (savedAffiliates) setAffiliates(JSON.parse(savedAffiliates));
      else setAffiliates(DEFAULT_AFFILIATES);

      if (savedRates) setRates(JSON.parse(savedRates));
      if (savedCap) setEnableSafetyCap(savedCap === 'true');
    }
  }, []);

  // Save to localStorage helper
  const saveDeals = (updated: Deal[]) => {
    setDeals(updated);
    localStorage.setItem('wings_comm_deals_v1', JSON.stringify(updated));
  };

  const saveAffiliates = (updated: Affiliate[]) => {
    setAffiliates(updated);
    localStorage.setItem('wings_comm_affiliates_v1', JSON.stringify(updated));
  };

  // Commission Calculations for a Single Deal
  const getDealCommission = (deal: Deal) => {
    const courseRates = rates[deal.courseType] || DEFAULT_RATES[deal.courseType];

    let marketing = 0;
    let affiliate = 0;
    let sales = courseRates.sales || 0;
    let teacher = courseRates.teacher || 0;

    if (deal.source === 'marketing') {
      marketing = courseRates.marketing;
    } else if (deal.source === 'affiliate') {
      affiliate = courseRates.affiliate;
    }

    // Apply talent scholarship discount factor
    const scholarship = deal.scholarshipPercent || 0;
    const factor = 1 - scholarship / 100;

    marketing = Math.round(marketing * factor);
    affiliate = Math.round(affiliate * factor);
    sales = Math.round(sales * factor);
    teacher = Math.round(teacher * factor);

    // Apply kit and sample upsell bonus
    const kit = deal.kitPrice || 0;
    const sample = deal.samplePrice || 0;
    const upsellBase = kit + sample;

    const salesUpsell = Math.round(upsellBase * 0.05); // 5%
    const teacherUpsell = Math.round(upsellBase * 0.05); // 5%

    sales += salesUpsell;
    teacher += teacherUpsell;

    let total = marketing + affiliate + sales + teacher;
    let isCapped = false;

    // Safety Cap 25%
    if (enableSafetyCap && deal.actualRevenue > 0) {
      const capLimit = Math.round(deal.actualRevenue * 0.25);
      if (total > capLimit) {
        const scale = capLimit / total;
        marketing = Math.round(marketing * scale);
        affiliate = Math.round(affiliate * scale);
        sales = Math.round(sales * scale);
        teacher = Math.round(teacher * scale);
        total = marketing + affiliate + sales + teacher;
        isCapped = true;
      }
    }

    return { marketing, affiliate, sales, teacher, total, isCapped };
  };

  // Deal Modal submission
  const handleSaveDeal = (values: any) => {
    const courseType = values.courseType;
    const baseRevenue = COURSE_REVENUE[courseType as keyof typeof COURSE_REVENUE] || 0;
    const kit = Number(values.kitPrice) || 0;
    const sample = Number(values.samplePrice) || 0;
    const scholarship = Number(values.scholarshipPercent) || 0;

    // Apply discount
    const courseRev = Math.round(baseRevenue * (1 - scholarship / 100));
    const actualRevenue = courseRev + kit + sample;

    const affSelected = affiliates.find((a) => a.id === values.affiliateId);

    const payload: Deal = {
      id: editingDeal ? editingDeal.id : `d-${Date.now()}`,
      date: values.date ? dayjs(values.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      studentName: values.studentName,
      phone: values.phone,
      courseType,
      source: values.source,
      affiliateId: values.affiliateId,
      affiliateName: affSelected ? affSelected.name : undefined,
      revenue: baseRevenue,
      actualRevenue,
      salesPerson: values.salesPerson,
      teacher: values.teacher,
      status: editingDeal ? editingDeal.status : 'pending',
      scholarshipPercent: scholarship,
      kitPrice: kit,
      samplePrice: sample,
    };

    let nextDeals = [...deals];
    if (editingDeal) {
      nextDeals = deals.map((d) => (d.id === editingDeal.id ? payload : d));
    } else {
      nextDeals.unshift(payload);
    }

    saveDeals(nextDeals);
    setDealModalVisible(false);
    dealForm.resetFields();
    setEditingDeal(null);
    message.success('Đã lưu thông tin Deal hoa hồng!');
  };

  const handleUpdateStatus = (id: string, status: 'pending' | 'confirmed' | 'cancelled') => {
    const updated = deals.map((d) => (d.id === id ? { ...d, status } : d));
    saveDeals(updated);
    message.success(
      `Đã chuyển trạng thái Deal sang: ${status === 'confirmed' ? 'Đã xác nhận' : status === 'cancelled' ? 'Đã huỷ' : 'Chờ duyệt'}`
    );
  };

  const handleDeleteDeal = (id: string) => {
    const updated = deals.filter((d) => d.id !== id);
    saveDeals(updated);
    message.success('Đã xoá Deal thành công');
  };

  // Affiliate Modal submission
  const handleSaveAffiliate = (values: any) => {
    const payload: Affiliate = {
      id: editingAffiliate ? editingAffiliate.id : `af-${Date.now()}`,
      ...values,
    };

    let next = [...affiliates];
    if (editingAffiliate) {
      next = affiliates.map((a) => (a.id === editingAffiliate.id ? payload : a));
    } else {
      next.unshift(payload);
    }

    saveAffiliates(next);
    setAffiliateModalVisible(false);
    affiliateForm.resetFields();
    setEditingAffiliate(null);
    message.success('Đã lưu thông tin đối tác Affiliate!');
  };

  // Monthly Report aggregate
  const getMonthlyReport = (month: string) => {
    const monthDeals = deals.filter((d) => d.date.startsWith(month) && d.status === 'confirmed');

    // Sales aggregation
    const reps = Array.from(new Set(monthDeals.map((d) => d.salesPerson)));
    const salesReport = reps.map((rep) => {
      const repDeals = monthDeals.filter((d) => d.salesPerson === rep);
      const count = repDeals.length;

      let tier = 'Chưa đạt';
      let bonusPerDeal = 0;
      let emoji = '';

      for (const t of SALES_BONUS_TIERS) {
        if (count >= t.min && count <= t.max) {
          tier = t.name;
          bonusPerDeal = t.bonusPerDeal;
          emoji = t.emoji;
          break;
        }
      }

      const totalBonus = bonusPerDeal * count;
      const baseComm = repDeals.reduce((sum, d) => sum + getDealCommission(d).sales, 0);

      return {
        name: rep,
        count,
        tier,
        emoji,
        baseComm,
        bonus: totalBonus,
        total: baseComm + totalBonus,
      };
    });

    // Affiliate aggregation
    const affs = Array.from(
      new Set(monthDeals.filter((d) => d.source === 'affiliate').map((d) => d.affiliateName || ''))
    );
    const affiliateReport = affs.map((name) => {
      const affDeals = monthDeals.filter((d) => d.affiliateName === name);
      const count = affDeals.length;

      let tier = 'Chưa đạt';
      let bonusPerDeal = 0;
      let emoji = '';

      for (const t of AFFILIATE_BONUS_TIERS) {
        if (count >= t.min && count <= t.max) {
          tier = t.name;
          bonusPerDeal = t.bonusPerDeal;
          emoji = t.emoji;
          break;
        }
      }

      const totalBonus = bonusPerDeal * count;
      const baseComm = affDeals.reduce((sum, d) => sum + getDealCommission(d).affiliate, 0);

      return {
        name,
        count,
        tier,
        emoji,
        baseComm,
        bonus: totalBonus,
        total: baseComm + totalBonus,
      };
    });

    return { salesReport, affiliateReport };
  };

  const currentMonth = dayjs().format('YYYY-MM');
  const report = getMonthlyReport(currentMonth);

  const confirmedDeals = deals.filter((d) => d.status === 'confirmed');
  const totalRevenue = confirmedDeals.reduce((sum, d) => sum + d.actualRevenue, 0);
  const totalCommission = confirmedDeals.reduce((sum, d) => sum + getDealCommission(d).total, 0);

  const dealColumns = [
    { title: 'Ngày', dataIndex: 'date', key: 'date', width: 110 },
    {
      title: 'Học viên',
      dataIndex: 'studentName',
      key: 'studentName',
      render: (text: string, record: Deal) => (
        <div>
          <span className="font-bold text-heading text-sm">{text}</span>
          {record.phone && <div className="text-[10px] text-secondary">📱 {record.phone}</div>}
        </div>
      ),
    },
    {
      title: 'Khoá học',
      dataIndex: 'courseType',
      key: 'courseType',
      render: (text: string, record: Deal) => {
        const typeMap = { basic: 'Cơ bản (1.9M)', full: 'Khoá Full (19.9M)', upsell: 'Upsell lên Full' };
        return (
          <div>
            <span className="font-medium text-heading text-xs">{typeMap[record.courseType]}</span>
            {record.scholarshipPercent ? (
              <Tag color="purple" className="block text-[9px] mt-1">
                Học bổng {record.scholarshipPercent}%
              </Tag>
            ) : null}
          </div>
        );
      },
    },
    {
      title: 'Nguồn',
      dataIndex: 'source',
      key: 'source',
      render: (text: string, record: Deal) => (
        <Tag color={text === 'marketing' ? 'blue' : text === 'affiliate' ? 'green' : 'default'}>
          {text === 'marketing' ? 'Marketing' : text === 'affiliate' ? `Affiliate: ${record.affiliateName}` : 'Walk-in'}
        </Tag>
      ),
    },
    {
      title: 'Thực thu',
      dataIndex: 'actualRevenue',
      key: 'actualRevenue',
      className: 'text-right font-bold text-emerald-500',
      render: (val: number) => `${new Intl.NumberFormat('vi-VN').format(val)} ₫`,
    },
    {
      title: 'Nhân sự',
      key: 'staff',
      render: (_: any, record: Deal) => (
        <div className="text-[11px] text-secondary">
          <div>💼 Sales: {record.salesPerson}</div>
          <div>👩‍🏫 GV: {record.teacher}</div>
        </div>
      ),
    },
    {
      title: 'Hoa hồng',
      key: 'commission',
      className: 'text-right font-bold text-purple-500',
      render: (_: any, record: Deal) => {
        const comm = getDealCommission(record);
        return (
          <div>
            <span>{new Intl.NumberFormat('vi-VN').format(comm.total)} ₫</span>
            {comm.isCapped && <span className="block text-[9px] text-amber-500 font-bold">⚠️ Cap 25%</span>}
          </div>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (text: string) => (
        <Tag color={text === 'confirmed' ? 'green' : text === 'cancelled' ? 'red' : 'orange'}>
          {text === 'confirmed' ? 'Đã xác nhận' : text === 'cancelled' ? 'Đã huỷ' : 'Chờ duyệt'}
        </Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_: any, record: Deal) => (
        <Space size="middle">
          {record.status === 'pending' && (
            <>
              <Button
                size="small"
                type="primary"
                onClick={() => handleUpdateStatus(record.id, 'confirmed')}
                style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
              >
                Duyệt
              </Button>
              <Button size="small" danger onClick={() => handleUpdateStatus(record.id, 'cancelled')}>
                Huỷ
              </Button>
            </>
          )}
          {record.status === 'cancelled' && (
            <Button size="small" onClick={() => handleUpdateStatus(record.id, 'pending')}>
              Khôi phục
            </Button>
          )}
          <Button size="small" type="text" danger onClick={() => handleDeleteDeal(record.id)}>
            Xoá
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-default pb-3">
        <div>
          <h1 className="text-xl font-bold text-heading">Hybrid Commission Tracker</h1>
          <p className="text-xs text-secondary">
            Đối soát và quản lý hoa hồng tuyển sinh học viên, chi trả thưởng đối tác affiliate
          </p>
        </div>
        <Space>
          <Checkbox
            checked={enableSafetyCap}
            onChange={(e) => {
              setEnableSafetyCap(e.target.checked);
              localStorage.setItem('wings_commission_enable_safety_cap', e.target.checked ? 'true' : 'false');
            }}
          >
            Kích hoạt Safety Cap 25%
          </Checkbox>
          <Button
            type="primary"
            style={{ backgroundColor: '#b8941f', borderColor: '#b8941f' }}
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingDeal(null);
              dealForm.resetFields();
              setDealModalVisible(true);
            }}
          >
            Thêm Deal mới
          </Button>
        </Space>
      </div>

      {/* KPI stats */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card size="small" className="border-default bg-hover">
            <span className="text-xs text-secondary font-medium block mb-1">Doanh thu chốt khoá học (Confirmed)</span>
            <span className="text-xl font-bold text-heading">
              {new Intl.NumberFormat('vi-VN').format(totalRevenue)} ₫
            </span>
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card size="small" className="border-default bg-hover">
            <span className="text-xs text-secondary font-medium block mb-1">Tổng hoa hồng chi trả</span>
            <span className="text-xl font-bold text-heading">
              {new Intl.NumberFormat('vi-VN').format(totalCommission)} ₫
            </span>
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card size="small" className="border-default bg-hover">
            <span className="text-xs text-secondary font-medium block mb-1">Tỷ lệ chi hoa hồng / doanh thu</span>
            <span className="text-xl font-bold text-heading">
              {totalRevenue > 0 ? ((totalCommission / totalRevenue) * 100).toFixed(1) : 0}%
            </span>
          </Card>
        </Col>
      </Row>

      {/* Tab Navigation */}
      <Tabs
        activeKey={currentTab}
        onChange={setCurrentTab}
        items={[
          {
            key: 'deals',
            label: (
              <span>
                <HistoryOutlined /> Deals Tracker
              </span>
            ),
            children: (
              <Table columns={dealColumns} dataSource={deals} rowKey="id" size="small" pagination={{ pageSize: 15 }} />
            ),
          },
          {
            key: 'affiliates',
            label: (
              <span>
                <TeamOutlined /> Đối tác Affiliate
              </span>
            ),
            children: (
              <div className="flex flex-col gap-4">
                <div className="text-right">
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingAffiliate(null);
                      affiliateForm.resetFields();
                      setAffiliateModalVisible(true);
                    }}
                  >
                    Thêm Đối Tác Affiliate
                  </Button>
                </div>
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={affiliates}
                  columns={[
                    {
                      title: 'Tên đối tác',
                      dataIndex: 'name',
                      key: 'name',
                      render: (text) => <span className="font-bold text-heading text-xs">{text}</span>,
                    },
                    { title: 'Số điện thoại', dataIndex: 'phone', key: 'phone' },
                    { title: 'Ngân hàng', dataIndex: 'bank', key: 'bank' },
                    { title: 'Số tài khoản', dataIndex: 'stk', key: 'stk' },
                    {
                      title: 'Số deal chốt',
                      key: 'dealCount',
                      className: 'text-center',
                      render: (_, record) =>
                        deals.filter((d) => d.affiliateId === record.id && d.status === 'confirmed').length,
                    },
                    {
                      title: 'Hành động',
                      key: 'actions',
                      render: (_, record) => (
                        <Space>
                          <Button
                            size="small"
                            onClick={() => {
                              setEditingAffiliate(record);
                              affiliateForm.setFieldsValue(record);
                              setAffiliateModalVisible(true);
                            }}
                          >
                            Sửa
                          </Button>
                          <Button
                            size="small"
                            danger
                            onClick={() => {
                              const next = affiliates.filter((a) => a.id !== record.id);
                              saveAffiliates(next);
                              message.success('Đã xoá đối tác!');
                            }}
                          >
                            Xoá
                          </Button>
                        </Space>
                      ),
                    },
                  ]}
                />
              </div>
            ),
          },
          {
            key: 'reports',
            label: (
              <span>
                <DollarOutlined /> Báo cáo Tháng ({currentMonth})
              </span>
            ),
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Card title="Thưởng doanh số Sales (Theo mốc Tier)" size="small" className="border-default">
                    <Table
                      rowKey="name"
                      size="small"
                      dataSource={report.salesReport}
                      pagination={false}
                      columns={[
                        { title: 'Sales Rep', dataIndex: 'name', key: 'name' },
                        { title: 'Số deal chốt', dataIndex: 'count', key: 'count' },
                        {
                          title: 'Phân bậc',
                          key: 'tier',
                          render: (_, r) => (
                            <span>
                              {r.emoji} {r.tier}
                            </span>
                          ),
                        },
                        {
                          title: 'Lương mềm',
                          dataIndex: 'baseComm',
                          key: 'baseComm',
                          className: 'text-right',
                          render: (val) => `${new Intl.NumberFormat('vi-VN').format(val)} đ`,
                        },
                        {
                          title: 'Thưởng mốc',
                          dataIndex: 'bonus',
                          key: 'bonus',
                          className: 'text-right',
                          render: (val) => `${new Intl.NumberFormat('vi-VN').format(val)} đ`,
                        },
                        {
                          title: 'Tổng nhận',
                          dataIndex: 'total',
                          key: 'total',
                          className: 'text-right font-bold text-purple-500',
                          render: (val) => `${new Intl.NumberFormat('vi-VN').format(val)} đ`,
                        },
                      ]}
                    />
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title="Thưởng hoa hồng Affiliate (Đối tác giới thiệu)" size="small" className="border-default">
                    <Table
                      rowKey="name"
                      size="small"
                      dataSource={report.affiliateReport}
                      pagination={false}
                      columns={[
                        { title: 'Đối tác', dataIndex: 'name', key: 'name' },
                        { title: 'Số deal chốt', dataIndex: 'count', key: 'count' },
                        {
                          title: 'Thành tích',
                          key: 'tier',
                          render: (_, r) => (
                            <span>
                              {r.emoji} {r.tier}
                            </span>
                          ),
                        },
                        {
                          title: 'Hoa hồng gốc',
                          dataIndex: 'baseComm',
                          key: 'baseComm',
                          className: 'text-right',
                          render: (val) => `${new Intl.NumberFormat('vi-VN').format(val)} đ`,
                        },
                        {
                          title: 'Thưởng thêm',
                          dataIndex: 'bonus',
                          key: 'bonus',
                          className: 'text-right',
                          render: (val) => `${new Intl.NumberFormat('vi-VN').format(val)} đ`,
                        },
                        {
                          title: 'Tổng nhận',
                          dataIndex: 'total',
                          key: 'total',
                          className: 'text-right font-bold text-emerald-500',
                          render: (val) => `${new Intl.NumberFormat('vi-VN').format(val)} đ`,
                        },
                      ]}
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />

      {/* Modal: Add/Edit Deal */}
      <Modal
        title={editingDeal ? 'Cập nhật Deal' : 'Tạo Deal Hoa Hồng mới'}
        open={dealModalVisible}
        onCancel={() => setDealModalVisible(false)}
        onOk={() => dealForm.submit()}
        okText="Lưu lại"
        cancelText="Hủy"
      >
        <Form
          form={dealForm}
          layout="vertical"
          onFinish={handleSaveDeal}
          initialValues={{
            courseType: 'full',
            source: 'marketing',
            scholarshipPercent: 0,
            kitPrice: 0,
            samplePrice: 0,
          }}
        >
          <Form.Item
            name="studentName"
            label="Tên Học Viên"
            rules={[{ required: true, message: 'Nhập tên học viên!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Số Điện Thoại">
            <Input />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="courseType" label="Khóa Học">
                <Select>
                  <Select.Option value="basic">Khóa Cơ bản (1.9M)</Select.Option>
                  <Select.Option value="full">Khóa Full Combo (19.9M)</Select.Option>
                  <Select.Option value="upsell">Upsell từ Cơ bản lên Full (+18.0M)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="source" label="Nguồn Lead">
                <Select>
                  <Select.Option value="marketing">Marketing (Reels/TikTok)</Select.Option>
                  <Select.Option value="affiliate">Affiliate (Giới thiệu)</Select.Option>
                  <Select.Option value="walk-in">Walk-in (Tự đến)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.source !== curr.source}>
            {({ getFieldValue }) =>
              getFieldValue('source') === 'affiliate' ? (
                <Form.Item
                  name="affiliateId"
                  label="Chọn đối tác Affiliate"
                  rules={[{ required: true, message: 'Vui lòng chọn đối tác!' }]}
                >
                  <Select>
                    {affiliates.map((a) => (
                      <Select.Option key={a.id} value={a.id}>
                        {a.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="scholarshipPercent" label="Học bổng (%)">
                <Input type="number" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="kitPrice" label="Tiền bán Kit (VND)">
                <Input type="number" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="samplePrice" label="Tiền gói Mẫu (VND)">
                <Input type="number" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="salesPerson"
                label="Tư Vấn Viên (Sales)"
                rules={[{ required: true, message: 'Nhập tên sales!' }]}
              >
                <Input placeholder="Tên sales..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="teacher"
                label="Giảng Viên Hướng Dẫn"
                rules={[{ required: true, message: 'Nhập tên GV!' }]}
              >
                <Input placeholder="Tên GV..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Modal: Add/Edit Affiliate */}
      <Modal
        title={editingAffiliate ? 'Cập nhật đối tác' : 'Thêm đối tác Affiliate mới'}
        open={affiliateModalVisible}
        onCancel={() => setAffiliateModalVisible(false)}
        onOk={() => affiliateForm.submit()}
        okText="Lưu lại"
        cancelText="Hủy"
      >
        <Form form={affiliateForm} layout="vertical" onFinish={handleSaveAffiliate}>
          <Form.Item name="name" label="Tên Đối Tác" rules={[{ required: true, message: 'Nhập tên đối tác!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Số Điện Thoại" rules={[{ required: true, message: 'Nhập SĐT!' }]}>
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="bank" label="Ngân hàng">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="stk" label="Số tài khoản">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
