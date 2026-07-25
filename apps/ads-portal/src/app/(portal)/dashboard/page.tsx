'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Card, Table, Row, Col, Statistic, Tag, Spin, message, Alert } from 'antd';
import {
  WalletOutlined,
  CheckCircleOutlined,
  MessageOutlined,
  CreditCardOutlined,
  NotificationOutlined,
  LineChartOutlined,
  AlertOutlined,
} from '@ant-design/icons';

interface BillingTx {
  id: string;
  date: string;
  amount: string;
  status: string;
  payment_method: string;
  vat_invoice_id?: string;
  code?: string;
}

interface Campaign {
  id: string;
  name: string;
  spend: number;
  views: number;
  viewers: number;
  messages: number;
  goal: string;
  thruplays?: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [debt, setDebt] = useState({ amount: '0 ₫', status: 'success', desc: 'Tài khoản hoạt động bình thường.' });
  const [paid, setPaid] = useState({ amount: '0 ₫', invoice: 'Chưa có hóa đơn thành công' });
  const [inboxCount, setInboxCount] = useState('0 Inbox');
  const [cpaDesc, setCpaDesc] = useState('Đang tính...');
  const [paymentMethod, setPaymentMethod] = useState({ method: 'N/A', desc: 'Không có thẻ thành công' });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isAccountDisabled, setIsAccountDisabled] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Lashes Billing History
      const { data: billingData, error: billingErr } = await supabase.from('billing_history').select('*');

      if (billingErr) throw billingErr;

      if (billingData && billingData.length > 0) {
        // Evaluate debt/status
        const hasAnyPaidTx = billingData.some((tx: any) => {
          const s = tx.status.toLowerCase();
          return (s.includes('paid') || s.includes('thành công')) && !s.includes('không');
        });

        if (!hasAnyPaidTx) {
          setIsAccountDisabled(true);
          setDebt({
            amount: '1.416.711 ₫',
            status: 'error',
            desc: 'Gồm 1.287.919 ₫ gốc + 128.792 ₫ thuế nhà thầu (10%)',
          });
        } else {
          setIsAccountDisabled(false);
          setDebt({
            amount: '0 ₫',
            status: 'success',
            desc: 'Tài khoản hoạt động bình thường, không còn nợ.',
          });
        }

        // Find last successful payment
        const lastPaidTx = billingData.find((tx: any) => {
          const status = tx.status.toLowerCase();
          return (status.includes('paid') || status.includes('thành công')) && !status.includes('không');
        });

        if (lastPaidTx) {
          setPaid({
            amount: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
              Number(lastPaidTx.amount) || 0
            ),
            invoice: `Mã hóa đơn: ${lastPaidTx.vat_invoice_id || lastPaidTx.code || 'N/A'}`,
          });
          setPaymentMethod({
            method: String(lastPaidTx.payment_method || 'N/A').replace(/\s+/g, ' '),
            desc: 'Thẻ đang hoạt động',
          });
        }
      }

      // 2. Fetch Campaign Metrics
      const { data: campaignsData, error: campErr } = await supabase.from('campaign_metrics').select('*');

      if (campErr) throw campErr;

      const normCampaigns = (campaignsData || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        spend: Number(c.spend) || 0,
        views: Number(c.views) || 0,
        viewers: Number(c.viewers) || 0,
        messages: Number(c.messages) || 0,
        thruplays: Number(c.thruplays) || 0,
        goal: c.goal || (Number(c.thruplays) > 0 ? 'Video views' : 'Messages'),
      }));

      setCampaigns(normCampaigns);

      // Calculations
      let totalSpend = 0;
      let totalMessages = 0;
      normCampaigns.forEach((c) => {
        totalSpend += c.spend;
        totalMessages += c.messages;
      });

      const averageCpa = totalMessages > 0 ? Math.round(totalSpend / totalMessages) : 0;
      setInboxCount(`${totalMessages} Inbox`);
      setCpaDesc(`Chi phí trung bình: ${new Intl.NumberFormat('vi-VN').format(averageCpa)} ₫ / Inbox`);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      message.error('Lỗi khi tải dữ liệu dashboard: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const campaignColumns = [
    {
      title: 'Tên chiến dịch',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span className="font-semibold">{text}</span>,
    },
    {
      title: 'Ngân sách tiêu',
      dataIndex: 'spend',
      key: 'spend',
      render: (val: number) => `${new Intl.NumberFormat('vi-VN').format(val)} ₫`,
    },
    {
      title: 'Lượt xem',
      dataIndex: 'views',
      key: 'views',
      render: (val: number) => new Intl.NumberFormat('vi-VN').format(val),
    },
    {
      title: 'Lượt kết quả',
      key: 'results',
      render: (_: any, record: Campaign) => {
        if (record.goal === 'Messages') {
          return <Tag color="blue">{record.messages} Inbox</Tag>;
        }
        return <Tag color="default">{record.thruplays || 0} ThruPlays</Tag>;
      },
    },
    {
      title: 'Giá / Kết quả',
      key: 'cpa',
      render: (_: any, record: Campaign) => {
        if (record.goal === 'Messages' && record.messages > 0) {
          const cpa = Math.round(record.spend / record.messages);
          return <span className="font-semibold text-emerald-500">{new Intl.NumberFormat('vi-VN').format(cpa)} ₫</span>;
        }
        return <span className="text-gray-400">—</span>;
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-[400px]">
        <Spin size="large" />
        <span className="text-sm text-secondary">Đang tải dữ liệu dashboard...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Alert banner for disabled account */}
      {isAccountDisabled && (
        <Alert
          message="Tài khoản quảng cáo bị vô hiệu hóa!"
          description="Chúng tôi không thể xử lý thanh toán của bạn. Hãy tất toán số nợ 1.416.711 ₫ để kích hoạt lại chiến dịch quảng cáo."
          type="error"
          showIcon
          icon={<AlertOutlined />}
          className="shadow-sm border border-red-200"
        />
      )}

      {/* Stats Grid */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <div className="glass-card rounded-xl p-4 border border-default shadow-sm">
            <Statistic
              title={<span className="text-secondary font-medium text-xs">Dư nợ tài khoản</span>}
              value={debt.amount}
              valueStyle={{
                color: isAccountDisabled ? '#ef4444' : '#10b981',
                fontWeight: 'bold',
                fontFamily: 'monospace',
              }}
              prefix={<WalletOutlined />}
              className="tabular-nums"
            />
            <div className="text-xs text-secondary mt-2 truncate">{debt.desc}</div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="glass-card rounded-xl p-4 border border-default shadow-sm">
            <Statistic
              title={<span className="text-secondary font-medium text-xs">Thành công (Tháng này)</span>}
              value={paid.amount}
              valueStyle={{ color: '#10b981', fontWeight: 'bold', fontFamily: 'monospace' }}
              prefix={<CheckCircleOutlined />}
              className="tabular-nums"
            />
            <div className="text-xs text-secondary mt-2 truncate">{paid.invoice}</div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="glass-card rounded-xl p-4 border border-default shadow-sm">
            <Statistic
              title={<span className="text-secondary font-medium text-xs">Số Inbox Ads thu về</span>}
              value={inboxCount}
              valueStyle={{ color: '#3b82f6', fontWeight: 'bold', fontFamily: 'monospace' }}
              prefix={<MessageOutlined />}
              className="tabular-nums"
            />
            <div className="text-xs text-secondary mt-2 truncate">{cpaDesc}</div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="glass-card rounded-xl p-4 border border-default shadow-sm">
            <Statistic
              title={<span className="text-secondary font-medium text-xs">Phương thức thanh toán</span>}
              value={paymentMethod.method}
              valueStyle={{ color: '#8b5cf6', fontWeight: 'bold' }}
              prefix={<CreditCardOutlined />}
            />
            <div className="text-xs text-secondary mt-2 truncate">{paymentMethod.desc}</div>
          </div>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Campaign table */}
        <Col xs={24} lg={16}>
          <div className="glass-card rounded-xl border border-default shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-default flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-bold text-heading">
                <LineChartOutlined className="text-[#b8941f]" /> Hiệu suất Chiến dịch Quảng cáo
              </span>
            </div>
            <Table
              dataSource={campaigns}
              columns={campaignColumns}
              rowKey="id"
              pagination={false}
              className="custom-table w-full"
            />
          </div>
        </Col>

        {/* Recommendations list */}
        <Col xs={24} lg={8}>
          <div className="glass-card rounded-xl border border-default shadow-sm p-4 h-full flex flex-col gap-4">
            <span className="flex items-center gap-2 text-sm font-bold text-heading border-b border-default pb-3">
              <NotificationOutlined className="text-[#b8941f]" /> Khuyến nghị & Báo động
            </span>
            <div className="flex flex-col gap-3">
              {isAccountDisabled && (
                <div className="flex gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <span className="text-red-500 font-bold shrink-0">🚨</span>
                  <div className="text-xs text-heading leading-relaxed">
                    <strong>Tạm dừng quảng cáo:</strong> Cần tất toán nợ <strong>1.416.711 ₫</strong> của hóa đơn Meta
                    để tiếp tục kích hoạt chiến dịch tuyển sinh.
                  </div>
                </div>
              )}
              <div className="flex gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-emerald-500 font-bold shrink-0">🎯</span>
                <div className="text-xs text-heading leading-relaxed">
                  <strong>Nhân bản định dạng Reels:</strong> Định dạng tuyển sinh qua Reels mang lại CPA tin nhắn cực rẻ
                  (~13k VNĐ/inbox). Nên tiếp tục mở rộng ngân sách dạng này.
                </div>
              </div>
              <div className="flex gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-amber-500 font-bold shrink-0">📍</span>
                <div className="text-xs text-heading leading-relaxed">
                  <strong>Giới hạn bán kính địa lý:</strong> Học viên có xu hướng ngại di chuyển xa. Hãy tối ưu target
                  khu vực Quận 1 bán kính 5-10km để tăng tỷ lệ đến test tay nghề thực tế.
                </div>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}
