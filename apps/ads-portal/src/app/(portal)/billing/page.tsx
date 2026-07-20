'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Card, Table, Button, Input, Select, Tag, Space, Spin, Row, Col, Alert, Checkbox, Modal, message } from 'antd';
import {
  SyncOutlined,
  SearchOutlined,
  CopyOutlined,
  AuditOutlined,
  CreditCardOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

interface Transaction {
  transaction_id: string;
  date: string;
  status: string;
  payment_method: string;
  amount: string; // e.g. "1,416,711 ₫"
  vat_invoice_id?: string;
  code?: string;
}

export default function BillingPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [cardFilter, setCardFilter] = useState<string>('ALL');
  const [monthFilter, setMonthFilter] = useState<string>('ALL');

  // Multi select
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Memo proposal state
  const [memoVisible, setMemoVisible] = useState(false);
  const [recipientCard, setRecipientCard] = useState('');
  const [memoText, setMemoText] = useState('');

  const loadBillingData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('billing_history').select('*').order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err: any) {
      console.error(err);
      message.error('Lỗi khi tải lịch sử giao dịch: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, []);

  // Filter computations
  const getFilteredData = () => {
    return transactions.filter((tx) => {
      // Search
      const searchStr = `${tx.transaction_id} ${tx.vat_invoice_id || ''} ${tx.payment_method}`.toLowerCase();
      if (searchText && !searchStr.includes(searchText.toLowerCase())) return false;

      // Status
      if (statusFilter !== 'ALL') {
        const isFailed = tx.status.toLowerCase().includes('failed') || tx.status.toLowerCase().includes('không');
        if (statusFilter === 'Paid' && isFailed) return false;
        if (statusFilter === 'Failed' && !isFailed) return false;
      }

      // Card
      if (cardFilter !== 'ALL' && tx.payment_method !== cardFilter) return false;

      // Month
      if (monthFilter !== 'ALL') {
        const txMonth = dayjs(tx.date).format('YYYY-MM');
        if (txMonth !== monthFilter) return false;
      }

      return true;
    });
  };

  const filtered = getFilteredData();

  // Metrics calculations
  const totalPaid = filtered
    .filter((tx) => !(tx.status.toLowerCase().includes('failed') || tx.status.toLowerCase().includes('không')))
    .reduce((sum, tx) => {
      const amountNum = parseInt(tx.amount.replace(/[^0-9]/g, '')) || 0;
      return sum + amountNum;
    }, 0);

  const vatCount = filtered.filter((tx) => tx.vat_invoice_id).length;
  const failedCount = filtered.filter(
    (tx) => tx.status.toLowerCase().includes('failed') || tx.status.toLowerCase().includes('không')
  ).length;

  // Distinct Month lists
  const months = Array.from(new Set(transactions.map((tx) => dayjs(tx.date).format('YYYY-MM'))))
    .sort()
    .reverse();
  // Distinct Cards
  const cards = Array.from(new Set(transactions.map((tx) => tx.payment_method))).sort();

  // Generate Memo Proposal
  const handleOpenMemo = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Vui lòng chọn ít nhất một giao dịch thành công để đối soát đề xuất!');
      return;
    }

    const selectedTxs = transactions.filter((tx) => selectedRowKeys.includes(tx.transaction_id));
    const paidTxs = selectedTxs.filter(
      (tx) => !(tx.status.toLowerCase().includes('failed') || tx.status.toLowerCase().includes('không'))
    );

    if (paidTxs.length === 0) {
      message.warning(
        'Chỉ đối soát trên các giao dịch thanh toán thành công (Paid)! Giao dịch Failed đã được loại bỏ.'
      );
      return;
    }

    // Default card from paid transactions
    const cardDetect = paidTxs[0]?.payment_method || 'Visa ···· 6431';
    setRecipientCard(cardDetect);
    setMemoVisible(true);
  };

  useEffect(() => {
    if (!memoVisible) return;

    const selectedTxs = transactions.filter((tx) => selectedRowKeys.includes(tx.transaction_id));
    const paidTxs = selectedTxs.filter(
      (tx) => !(tx.status.toLowerCase().includes('failed') || tx.status.toLowerCase().includes('không'))
    );

    let sumAmount = 0;
    let detailsText = '';

    paidTxs.forEach((tx, idx) => {
      const rawAmount = parseInt(tx.amount.replace(/[^0-9]/g, '')) || 0;
      sumAmount += rawAmount;

      const invoice = tx.vat_invoice_id ? `HĐ: ${tx.vat_invoice_id}` : `Mã Ref: ${tx.code || 'N/A'}`;
      detailsText += `   + Giao dịch ${idx + 1} (${dayjs(tx.date).format('DD/MM/YYYY')}): ${new Intl.NumberFormat('vi-VN').format(rawAmount)} ₫ | ID: ${tx.transaction_id} | ${invoice}\n`;
    });

    const vatAmount = Math.round(sumAmount * 0.1);
    const totalRequestAmount = sumAmount + vatAmount;
    const curDateStr = dayjs().format('DD/MM/YYYY');

    const memo = `ĐỀ NGHỊ THANH TOÁN CHI PHÍ QUẢNG CÁO FACEBOOK ADS
Ngày lập: ${curDateStr}
----------------------------------------------------------

Kính gửi: Ban Giám Đốc, Bộ phận Kế toán & Thủ quỹ (Bùi Sinh Nguyên)
Bộ phận đề xuất: Vận hành Marketing Wings Lashes

Hôm nay, bộ phận Vận hành xin đề nghị thanh toán/hoàn trả dư nợ quảng cáo Facebook Ads. Chi tiết tài khoản và giao dịch đối soát cụ thể như sau:

1. THÔNG TIN TÀI KHOẢN QUẢNG CÁO
   - Tên tài khoản quảng cáo: Wings Lashes (ID: 646164975411124)
   - Đơn vị đăng ký: CÔNG TY TNHH WINGS' LIFE
   - Mã số thuế: 03-1700632-1
   - Địa chỉ đăng ký: 159A Đường Đề Thám, Phường Phạm Ngũ Lão, Quận 1, TP. Hồ Chí Minh

2. THÔNG TIN THÈ THANH TOÁN (VISA THƯỜNG TRỰC)
   - Thẻ Visa liên kết tài khoản quảng cáo: ${recipientCard}

3. CHI TIẾT CÁC GIAO GIAO DỊCH ĐÃ ĐỐI SOÁT THÀNH CÔNG (PAID)
${detailsText || '   (Chưa chọn hoặc không có giao dịch Paid hợp lệ trong danh sách chọn.)\n'}
4. TỔNG HỢP CHI PHÍ ĐỀ XUẤT THANH TOÁN (TÁCH BIỆT THUẾ NHÀ THẦU)
   a) Dư nợ gốc chưa thuế (Meta Net Spend):   ${new Intl.NumberFormat('vi-VN').format(sumAmount)} ₫
   b) Thuế nhà thầu nước ngoài (Meta 10% VAT):  ${new Intl.NumberFormat('vi-VN').format(vatAmount)} ₫ (Ước tính)
   --------------------------------------------------------
   TỔNG CỘNG CẦN CHUYỂN KHOẢN NẠP THÈ:        ${new Intl.NumberFormat('vi-VN').format(totalRequestAmount)} ₫

*Giao dịch "Không thành công (Failed)" trong lịch sử là lệnh quét tự động (Auto-retry) của hệ thống Meta khi thẻ hết tiền hoặc bị khóa, không phát sinh trừ tiền thực tế và đã được loại bỏ khỏi bảng đối soát này.*

Kính trình Ban Giám đốc phê duyệt chuyển tiền vào thẻ Visa thụ hưởng để đảm bảo tài khoản quảng cáo hoạt động ổn định liên tục.

Phê duyệt đề xuất:
- Trưởng bộ phận: Vận hành Wings Lashes
- Kế toán/Thủ quỹ: Bùi Sinh Nguyên (Đối soát chi phí hợp lệ)
- Ban Giám Đốc: Danny Do (Duyệt chi thanh toán)`;

    setMemoText(memo);
  }, [memoVisible, recipientCard, selectedRowKeys]);

  const handleCopyMemo = () => {
    navigator.clipboard.writeText(memoText);
    message.success('Đã sao chép nội dung Tờ trình Đề nghị thanh toán! 📋');
  };

  const columns = [
    {
      title: 'Ngày giao dịch',
      dataIndex: 'date',
      key: 'date',
      render: (text: string) => dayjs(text).format('DD/MM/YYYY'),
    },
    {
      title: 'Transaction ID',
      dataIndex: 'transaction_id',
      key: 'transaction_id',
      render: (text: string) => <code className="text-[11px]">{text}</code>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (text: string) => {
        const isFailed = text.toLowerCase().includes('failed') || text.toLowerCase().includes('không');
        return <Tag color={isFailed ? 'red' : 'green'}>{isFailed ? 'Failed' : 'Paid'}</Tag>;
      },
    },
    {
      title: 'Phương thức thanh toán',
      dataIndex: 'payment_method',
      key: 'payment_method',
      render: (text: string) => <span>💳 {text}</span>,
    },
    {
      title: 'Mã Ref hóa đơn VAT',
      dataIndex: 'vat_invoice_id',
      key: 'vat_invoice_id',
      render: (text?: string) =>
        text ? <code className="text-blue-500 font-bold">{text}</code> : <span className="text-gray-400">—</span>,
    },
    { title: 'Số tiền', dataIndex: 'amount', key: 'amount', className: 'text-right font-semibold text-heading' },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-default pb-3">
        <div>
          <h1 className="text-xl font-bold text-heading">Facebook Ads Billing Reconciliation</h1>
          <p className="text-xs text-secondary">
            Đối soát hóa đơn thanh toán Meta, loại bỏ giao dịch Failed và lập tớ trình thanh toán
          </p>
        </div>
        <Button icon={<SyncOutlined spin={loading} />} onClick={loadBillingData}>
          Làm mới
        </Button>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card size="small" className="border-emerald-200 bg-emerald-500/5">
            <span className="text-xs text-emerald-500 font-bold block mb-1">Tổng tiền đã chi trả (Paid)</span>
            <span className="text-xl font-bold text-emerald-500">
              {new Intl.NumberFormat('vi-VN').format(totalPaid)} ₫
            </span>
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card size="small" className="border-blue-200 bg-blue-500/5">
            <span className="text-xs text-blue-500 font-bold block mb-1">Hóa đơn VAT Meta</span>
            <span className="text-xl font-bold text-blue-500">{vatCount} hóa đơn</span>
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card size="small" className="border-red-200 bg-red-500/5">
            <span className="text-xs text-red-500 font-bold block mb-1">Số lần Meta quét nợ thất bại</span>
            <span className="text-xl font-bold text-red-500">{failedCount} lần (Không trừ tiền)</span>
          </Card>
        </Col>
      </Row>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-container p-3 rounded-lg border border-default">
        <div className="flex flex-wrap gap-2.5 items-center w-full sm:w-auto">
          <Input
            placeholder="Tìm mã giao dịch, hóa đơn..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full sm:w-[240px]"
            allowClear
          />
          <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 140 }}>
            <Select.Option value="ALL">Tất cả trạng thái</Select.Option>
            <Select.Option value="Paid">Chỉ giao dịch Paid</Select.Option>
            <Select.Option value="Failed">Chỉ giao dịch Failed</Select.Option>
          </Select>
          <Select value={cardFilter} onChange={setCardFilter} style={{ width: 140 }}>
            <Select.Option value="ALL">Tất cả các thẻ</Select.Option>
            {cards.map((c) => (
              <Select.Option key={c} value={c}>
                {c}
              </Select.Option>
            ))}
          </Select>
          <Select value={monthFilter} onChange={setMonthFilter} style={{ width: 140 }}>
            <Select.Option value="ALL">Tất cả các tháng</Select.Option>
            {months.map((m) => (
              <Select.Option key={m} value={m}>
                {m}
              </Select.Option>
            ))}
          </Select>
        </div>

        <div>
          <Button
            type="primary"
            style={{ backgroundColor: '#b8941f', borderColor: '#b8941f' }}
            icon={<AuditOutlined />}
            onClick={handleOpenMemo}
          >
            Lập Tờ trình Thanh toán
          </Button>
        </div>
      </div>

      {/* Warning regarding failed retries */}
      <Alert
        message="Lưu ý quan trọng cho Kế toán"
        description="Các giao dịch 'Failed' là do Meta tự động chia nhỏ nợ và thử quét thẻ Visa nhiều lần khi thẻ hết hạn/khóa. Các giao dịch này không phát sinh trừ tiền thực tế, kế toán tuyệt đối KHÔNG hạch toán để tránh sai sót số liệu."
        type="warning"
        showIcon
      />

      {/* Main Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spin size="large" />
        </div>
      ) : (
        <Table
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          columns={columns}
          dataSource={filtered.map((tx) => ({ ...tx, key: tx.transaction_id }))}
          pagination={{ pageSize: 20 }}
          size="small"
        />
      )}

      {/* Memo Generation Drawer Modal */}
      <Modal
        title="Tờ trình Đề nghị thanh toán chi phí Facebook Ads"
        open={memoVisible}
        onCancel={() => setMemoVisible(false)}
        width={750}
        footer={[
          <Button key="close" onClick={() => setMemoVisible(false)}>
            Đóng
          </Button>,
          <Button
            key="copy"
            type="primary"
            icon={<CopyOutlined />}
            style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
            onClick={handleCopyMemo}
          >
            Sao chép Tờ trình
          </Button>,
        ]}
      >
        <div className="flex flex-col gap-4">
          <div>
            <span className="text-xs text-secondary font-medium block mb-1">Thẻ Visa nạp tiền (Thụ hưởng)</span>
            <Input value={recipientCard} onChange={(e) => setRecipientCard(e.target.value)} />
          </div>
          <div>
            <span className="text-xs text-secondary font-medium block mb-1">Nội dung văn bản đề xuất thanh toán</span>
            <Input.TextArea
              rows={18}
              value={memoText}
              readOnly
              className="font-mono text-xs p-3 bg-hover border border-default text-heading rounded-lg"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
