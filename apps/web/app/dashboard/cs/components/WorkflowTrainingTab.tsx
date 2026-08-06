'use client';

import React from 'react';
import { Card, Typography, Tag, Row, Col, Divider, Table, Alert, Space } from 'antd';
import {
  PhoneOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ToolOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  UsergroupAddOutlined,
  SmileOutlined,
  SyncOutlined,
  ShopOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../../../context/ThemeContext';
import { MermaidViewer } from '../../../../components/ui/MermaidViewer';

const { Title, Text, Paragraph } = Typography;

const csMermaidChart = `
flowchart TD
    Start([1. Khách Hàng Checkout Hoàn Thành Service]) --> TaskGen[2. Hệ Thống Tự Tạo Happy Call Task\\nPhân Phân Bổ CSKH Round-Robin]
    TaskGen --> CallQueue[3. CSKH Tiến Hành Gọi Điện Happy Call\\nTrạng thái: PENDING -> CALLING]
    CallQueue --> CallResult{Kết Quả\\nCuộc Gọi?}
    CallResult -->|Max 3 lần không nghe| MsgFallback[Chuyển Sang MESSAGED / Nhắn Zalo/SMS]
    CallResult -->|Sai số| Unreachable[Đánh dấu UNREACHABLE]
    CallResult -->|Đã liên lạc được| Survey[4. CSKH Thực Hiện Khảo Sát 8 Hạng Mục]
    Survey --> RatingCheck{Đánh Giá\\nSao?}
    RatingCheck -->|Hài lòng 4 - 5 sao| TaskComplete[Hoàn Tất Happy Call Task]
    RatingCheck -->|Không hài lòng <= 3 sao| IssueCheck[5. Bóc Tách Vấn Đề Lỗi]
    IssueCheck --> SubtaskGen[6. Tự Động Tạo Master Ticket & Các Sub-task]
    SubtaskGen --> DeptCheck{Phân Loại\\nBộ Phận?}
    DeptCheck -->|CC / BK / CSKH / Quản Lý| NonCVFlow[Trưởng Bộ Phận Nộp Hành Động Cải Thiện]
    NonCVFlow --> SubtaskDone1[Sub-task RESOLVED]
    DeptCheck -->|Bộ phận CV Kỹ thuật Mi| CheckWarranty{Kiểm Tra Hạn\\nBảo Hành 3 Ngày\\n<= 72h Checkout?}
    CheckWarranty -->|Có <= 72h| TagWarranty[Đánh dấu 🛡️ Bảo Hành 3 Ngày Kiểu Úc 0đ]
    CheckWarranty -->|Không > 72h| TagNoWarranty[Đánh dấu ⚠️ Quá Hạn Bảo Hành 3 Ngày]
    TagWarranty --> Stage1[GIAI ĐOẠN 1: CSKH Đặt Lịch Hẹn Đón Khách Đến Shop\\nStatus: APPOINTMENT_SCHEDULED]
    TagNoWarranty --> Stage1
    Stage1 --> CustomerArrives[Khách Hàng Đến Tiệm Theo Lịch Hẹn]
    CustomerArrives --> Stage2[GIAI ĐOẠN 2: Trưởng KTV Soi Mi Tại Shop\\n- Nhập Kết Quả Soi Mi Trực Tiếp\\n- Phân Công KTV Tay Nghề Cao Làm Lại]
    Stage2 --> POSService[Tạo Đơn Dịch Vụ Bảo Hành Trên App POS Tiệm\\nFix / Adjust / Log / Replace]
    POSService --> SubtaskDone2[Sub-task CV RESOLVED]
    SubtaskDone1 --> CheckAllSubtasks{Tất Cả Sub-tasks\\nĐã RESOLVED?}
    SubtaskDone2 --> CheckAllSubtasks
    CheckAllSubtasks -->|Chưa| WaitSubtasks[Chờ Bộ Phận Khác]
    CheckAllSubtasks -->|Đã hoàn tất| MasterResolve[7. CSKH Gọi Lại Chốt Với Khách\\nĐóng Master Ticket]
    MasterResolve --> MidnightCron[8. CRONJOB NỬA ĐÊM 02:00 AM ICT\\nOrderRegenerationService.php Quét Đơn POS]
    MidnightCron --> FALCalc{Tự Động Tính\\nFAL Rules?}
    FALCalc -->|Dịch vụ FIX <=25p| PunishCV[Trừ Thưởng KTV Cũ + Cộng Banana KTV Mới]
    FALCalc -->|Dịch vụ ADJUST| PunishCC[Trừ Thưởng CC Cũ + Không Trừ KTV]
    FALCalc -->|Dịch vụ LOG| AwardLog[Cộng Banana KTV Tháo Mi + Không Trừ Cũ]
    FALCalc -->|Dịch vụ REPLACE| PunishCVReplace[Trừ Thưởng KTV Cũ]
`;

export default function WorkflowTrainingTab() {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const steps = [
    {
      num: '01',
      title: 'Khách Checkout Hoàn Thành',
      desc: 'Khách hàng thanh toán hoàn tất đơn hàng tại Tiệm (order_state = Completed).',
      icon: <CheckCircleOutlined className="text-emerald-500 text-xl" />,
      tag: 'Tự động',
      tagColor: 'green',
    },
    {
      num: '02',
      title: 'Tự Động Tạo Happy Call Task',
      desc: 'Mỗi sáng 08:30, hệ thống quét đơn hôm trước và phân bổ CSKH Round-Robin.',
      icon: <SyncOutlined spin className="text-blue-500 text-xl" />,
      tag: 'Tự động 08:30 AM',
      tagColor: 'blue',
    },
    {
      num: '03',
      title: 'Gọi Điện CSKH Happy Call',
      desc: 'CSKH gọi điện khảo sát trải nghiệm. Tối đa 3 cuộc gọi trước khi nhắn tin Zalo/SMS.',
      icon: <PhoneOutlined className="text-cyan-500 text-xl" />,
      tag: 'CSKH Phụ Trách',
      tagColor: 'cyan',
    },
    {
      num: '04',
      title: 'Khảo Sát 8 Hạng Mục & Checklist Lỗi',
      desc: 'Nhập điểm 1-5 sao. Nếu Kỹ Thuật (CV) <= 3 sao, chọn Checklist 6 Lỗi Kỹ Thuật.',
      icon: <SmileOutlined className="text-amber-500 text-xl" />,
      tag: 'Khảo Sát',
      tagColor: 'gold',
    },
    {
      num: '05',
      title: 'Tự Động Tạo Master Ticket',
      desc: 'Điểm <= 3 sao tự động tạo Master Ticket (URGENT SLA 4h khi <= 2 sao, HIGH SLA 24h khi 3 sao).',
      icon: <ExclamationCircleOutlined className="text-rose-500 text-xl" />,
      tag: 'SLA 4h / 24h',
      tagColor: 'red',
    },
    {
      num: '06',
      title: 'Quy Trình CV 2 Giai Đoạn Tại Shop',
      desc: 'GĐ1: CSKH hẹn khách đến Shop -> GĐ2: Trưởng KTV soi mi trực tiếp & gán KTV làm lại tại tiệm.',
      icon: <ShopOutlined className="text-purple-500 text-xl" />,
      tag: '2 Giai Đoạn',
      tagColor: 'purple',
    },
    {
      num: '07',
      title: 'Chốt Với Khách & Đóng Ticket',
      desc: 'Khi các Sub-task hoàn tất, CSKH gọi điện xác nhận lại sự hài lòng và đóng Master Ticket.',
      icon: <SafetyCertificateOutlined className="text-emerald-500 text-xl" />,
      tag: 'Đóng Ticket',
      tagColor: 'emerald',
    },
    {
      num: '08',
      title: 'Cronjob Nửa Đêm Tính FAL (02:00 AM)',
      desc: 'Script Legacy tự động tính thưởng/phạt KTV & CC cũ dựa trên đơn bảo hành tại Tiệm.',
      icon: <ToolOutlined className="text-orange-500 text-xl" />,
      tag: 'Legacy Auto-FAL',
      tagColor: 'orange',
    },
  ];

  const falColumns = [
    {
      title: 'Phương Án Bảo Hành 0đ',
      dataIndex: 'type',
      key: 'type',
      render: (text: string, record: any) => (
        <span className="font-bold">
          {record.icon} {text}
        </span>
      ),
    },
    {
      title: 'Mô Tả Nghiệp Vụ Tại Tiệm',
      dataIndex: 'desc',
      key: 'desc',
    },
    {
      title: 'Điểm Thưởng KTV Mới',
      dataIndex: 'banana',
      key: 'banana',
      render: (text: string) => (
        <Tag color="gold" className="font-semibold">
          {text}
        </Tag>
      ),
    },
    {
      title: 'Quy Tắc Trừ Phạt Ca Cũ (_punishBonus)',
      dataIndex: 'punish',
      key: 'punish',
      render: (text: string, record: any) => (
        <Tag color={record.color} className="font-semibold">
          {text}
        </Tag>
      ),
    },
  ];

  const falData = [
    {
      key: '1',
      icon: '🛠️',
      type: 'FIX (Sửa Mi)',
      desc: 'Sửa lỗi cộm, cay, dính keo rải rác',
      banana: 'Có Banana khi <= 25p ( >25p: Không có Banana, chỉ tính lương giờ)',
      punish: 'Phạt thu hồi thưởng KTV (CV) ca cũ',
      color: 'volcano',
    },
    {
      key: '2',
      icon: '📐',
      type: 'ADJUST (Chỉnh Dáng)',
      desc: 'Thay đổi độ cong, chiều dài hoặc dáng mi theo ý khách',
      banana: 'Có Banana khi <= 25p ( >25p: Không có Banana, chỉ tính lương giờ)',
      punish: 'Phạt thu hồi thưởng CC tư vấn cũ (KHÔNG phạt KTV)',
      color: 'orange',
    },
    {
      key: '3',
      icon: '📋',
      type: 'LOG (Tháo Mi / Kiểm Tra)',
      desc: 'Tháo mi cũ hỏng, kiểm tra mắt hoặc tư vấn kỹ thuật',
      banana: 'Luôn có Banana (bất kể thời lượng ngắn/dài)',
      punish: 'Không phạt bất kỳ ai (0đ phạt)',
      color: 'blue',
    },
    {
      key: '4',
      icon: '🔄',
      type: 'REPLACE (Nối Mới 100%)',
      desc: 'Tháo toàn bộ mi cũ và nối lại bộ mi mới hoàn toàn 0đ',
      banana: 'Tính thưởng Full theo bộ mi mới',
      punish: 'Phạt thu hồi thưởng KTV (CV) ca cũ',
      color: 'red',
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Banner Header */}
      <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <BookOutlined className="text-2xl text-sky-200" />
            <Tag color="cyan" className="font-bold uppercase tracking-wider text-xs border-0 bg-white/20 text-white">
              Tài liệu Đào Tạo & Vận Hành Chuẩn
            </Tag>
          </div>
          <Title level={2} className="!text-white !mb-1 font-extrabold tracking-tight">
            🎧 Sơ Đồ Quy Trình CSKH & Bảo Hành 3 Ngày Kiểu Úc (MOS-LAB CRM)
          </Title>
          <Paragraph className="!text-sky-100 max-w-3xl text-sm mb-0">
            Hệ thống quản trị trải nghiệm khách hàng sau dịch vụ, leo thang sự cố thông minh, phân công xử lý 2 Giai
            đoạn tại Shop và tự động hóa quy tắc FAL thu hồi thưởng kế toán theo đúng Legacy Business Rules.
          </Paragraph>
        </div>
      </div>

      {/* Interactive Mermaid Flowchart Canvas */}
      <MermaidViewer
        chart={csMermaidChart}
        title="Sơ Đồ Luồng Dữ Liệu CSKH & Bảo Hành 3 Ngày Kiểu Úc (FAL Rules)"
        height="620px"
      />

      {/* SLA Alert Note */}
      <Alert
        message="📌 Nguyên Tắc Vàng Trong Đào Tạo CSKH"
        description="Khách hàng không hài lòng trong vòng 72 Giờ (3 Ngày) kể từ lúc Checkout luôn được áp dụng Quyền Lợi Bảo Hành 3 Ngày (Kiểu Úc 0đ) — Sửa mi hoặc Nối bộ mới hoàn toàn miễn phí tại Shop với KTV tay nghề cao!"
        type="info"
        showIcon
        icon={<SafetyCertificateOutlined className="text-xl" />}
        className="border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40"
      />

      {/* 8-Step Pipeline Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Title level={4} className="!mb-0">
            🚀 8 Bước Trong Quy Trình Vận Hành CSKH
          </Title>
          <Text type="secondary" className="text-xs">
            Tự động hóa 100% từ Checkout đến Chốt Sổ Nửa Đêm
          </Text>
        </div>

        <Row gutter={[16, 16]}>
          {steps.map((s) => (
            <Col xs={24} sm={12} md={6} key={s.num}>
              <Card
                hoverable
                className={`h-full border transition-all duration-200 hover:shadow-md ${
                  isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
                }`}
                bodyStyle={{ padding: '16px' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-black text-slate-300 dark:text-slate-600">{s.num}</span>
                  <Tag color={s.tagColor} className="font-semibold text-[11px] border-0">
                    {s.tag}
                  </Tag>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {s.icon}
                  <Text className="font-bold text-sm text-slate-800 dark:text-slate-100">{s.title}</Text>
                </div>
                <Text type="secondary" className="text-xs leading-relaxed block">
                  {s.desc}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      <Divider />

      {/* 2-Stage Customer Inspection Flow */}
      <Card className={`border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <Title level={4} className="!text-purple-600 dark:!text-purple-400 mb-2">
          🏪 Quy Trình Xử Lý Kỹ Thuật Mi (Bộ Phận CV) — 2 GIAI ĐOẠN TẠI SHOP
        </Title>
        <Paragraph type="secondary" className="text-sm mb-4">
          Quy trình chuẩn nhằm kiểm tra thực hư tình trạng mi mắt trực tiếp tại cửa hàng trước khi thực hiện dịch vụ bảo
          hành 0đ:
        </Paragraph>

        <Row gutter={[20, 20]}>
          <Col xs={24} md={12}>
            <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 h-full space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sky-700 dark:text-sky-300 text-base">
                  GIAI ĐOẠN 1: CSKH Đặt Lịch Hẹn Đón Khách
                </span>
                <Tag color="cyan" className="font-bold">
                  CSKH Phụ Trách
                </Tag>
              </div>
              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-2 list-disc pl-4">
                <li>CSKH gọi điện lắng nghe phản hồi của khách hàng (chưa vội chốt Fix/Adjust/Log).</li>
                <li>
                  Mở Sub-task CV $\rightarrow$ Bấm <strong>&quot;📅 GĐ1: Đặt Lịch Hẹn Đến Shop 0đ&quot;</strong>.
                </li>
                <li>
                  Chọn <strong>Chi nhánh Store</strong> (Đề Thám, Phan Xóm Lầu, Nguyễn Trãi, Thảo Điền) &amp;{' '}
                  <strong>Ngày/Giờ hẹn đón khách</strong>.
                </li>
                <li>
                  Sub-task đổi trạng thái sang <strong>APPOINTMENT_SCHEDULED</strong> (Đã Hẹn Đến Shop).
                </li>
              </ul>
            </div>
          </Col>

          <Col xs={24} md={12}>
            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 h-full space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-purple-700 dark:text-purple-300 text-base">
                  GIAI ĐOẠN 2: Trưởng CV Soi Mi &amp; Phân Công Tại Tiệm
                </span>
                <Tag color="purple" className="font-bold">
                  Trưởng CV Store
                </Tag>
              </div>
              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-2 list-disc pl-4">
                <li>Khi khách đến tiệm theo lịch hẹn, Trưởng CV trực tiếp soi mi dưới kính hiển vi/đèn soi.</li>
                <li>
                  Mở Sub-task CV $\rightarrow$ Bấm{' '}
                  <strong>&quot;🔍 GĐ2: Soi Mi Tại Shop &amp; Chốt Bảo Hành&quot;</strong>.
                </li>
                <li>
                  Nhập <strong>Kết quả soi mi thực tế</strong> (VD: <em>Chân mi bết keo ca cũ, rụng rải rác 30%...</em>
                  ).
                </li>
                <li>
                  Phân công <strong>CV Mới Tay Nghề Cao</strong> (Tự động loại trừ CV làm hỏng ca cũ).
                </li>
                <li>
                  Tạo đơn dịch vụ bảo hành trên App POS Tiệm $\rightarrow$ <strong>Sub-task RESOLVED</strong>.
                </li>
              </ul>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Legacy FAL Rules Cheatsheet */}
      <div>
        <Title level={4} className="mb-3">
          📊 Bảng Quy Tắc Phạt / Thưởng Thu Hồi Kế Toán FAL (Legacy System)
        </Title>
        <Paragraph type="secondary" className="text-xs mb-3">
          Tự động chốt nửa đêm (02:00 AM ICT) bởi script <code>OrderRegenerationService.php</code> dựa trên đơn hàng bảo
          hành thực hiện tại Tiệm:
        </Paragraph>
        <Table
          columns={falColumns}
          dataSource={falData}
          pagination={false}
          size="middle"
          bordered
          className="shadow-sm rounded-xl overflow-hidden"
        />

        {/* Detailed >25min Q&A Callout */}
        <div className="mt-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs space-y-2">
          <div className="font-extrabold text-amber-800 dark:text-amber-200 text-sm flex items-center gap-1.5">
            💡 GIẢI ĐÁP NGHIỆP VỤ: KHI THỜI LƯỢNG SỬA MI / CHỈNH DÁNG TRÊN 25 PHÚT (&gt; 25 PHÚT)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-800/80 space-y-1">
              <span className="font-bold text-amber-700 dark:text-amber-400 block text-xs">
                💅 Chuyên Viên (CV Mới &amp; CV Cũ):
              </span>
              <div>
                • <strong>CV Mới làm FIX / ADJUST &gt; 25p</strong>: KHÔNG được cộng điểm Banana thưởng khắc phục nhanh
                (coi như ca xử lý bình thường). Vẫn được tính Lương Giờ làm việc.
              </div>
              <div>
                • <strong>CV Mới làm REPLACE</strong>: Tháo làm lại bộ mới 100% $\rightarrow$ Được tính tiền thưởng full
                theo bộ mi mới.
              </div>
              <div>
                • <strong>CV Cũ ca lỗi (FIX / REPLACE)</strong>: Vẫn BỊ PHẠT thu hồi tiền thưởng ca cũ{' '}
                <code>_punishBonus</code> (bất kể CV mới sửa trong bao lâu).
              </div>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-800/80 space-y-1">
              <span className="font-bold text-amber-700 dark:text-amber-400 block text-xs">
                👔 Tư Vấn Viên (CC Mới &amp; CC Cũ):
              </span>
              <div>
                • <strong>CC Mới đón khách bảo hành 0đ</strong>: Ghi nhận ca Check-in / Check-out, tính Lương Giờ làm
                việc và cộng điểm đánh giá thái độ CSKH.
              </div>
              <div>
                • <strong>CC Cũ ca tư vấn sai (ADJUST)</strong>: Vẫn BỊ PHẠT thu hồi tiền thưởng ca cũ{' '}
                <code>_punishBonus</code> (bất kể KTV sửa trong bao lâu).
              </div>
              <div>
                • <strong>Thưởng Doanh Số</strong>: CC không nhận thưởng % doanh số đơn 0đ nhưng giữ mốc Level CC tích
                lũy tháng.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role Responsibilities */}
      <Card className={`border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
        <Title level={4} className="mb-4">
          👥 Ma Trận Vai Trò & Trách Nhiệm Nhân Sự (RACI Matrix)
        </Title>
        <Row gutter={[16, 16]} className="text-xs">
          <Col xs={24} sm={12} md={6}>
            <div className="p-3 bg-sky-50 dark:bg-sky-950/30 rounded-lg border border-sky-200 dark:border-sky-800 space-y-1">
              <span className="font-bold text-sky-700 dark:text-sky-400 block text-sm">🎧 CSKH / Telesales</span>
              <div>• Gọi Happy Call đúng mốc 08:30 AM</div>
              <div>• Khảo sát đủ 8 hạng mục & Checklist lỗi</div>
              <div>• Đặt Lịch Hẹn Đón Khách Đến Shop (GĐ1)</div>
              <div>• Xác nhận hài lòng & Đóng Ticket</div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800 space-y-1">
              <span className="font-bold text-purple-700 dark:text-purple-400 block text-sm">
                👁️ Trưởng KTV Store (CV)
              </span>
              <div>• Tiếp đón khách hàng theo lịch hẹn GĐ1</div>
              <div>• Soi mi trực tiếp dưới đèn tại Tiệm (GĐ2)</div>
              <div>• Gán KTV Senior làm lại bộ mi 0đ</div>
              <div>• Đảm bảo thời lượng sửa mi &lt;= 25 phút</div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-1">
              <span className="font-bold text-emerald-700 dark:text-emerald-400 block text-sm">👔 CC & Booker</span>
              <div>• Phối hợp thông tin lịch hẹn của khách</div>
              <div>• Xếp lịch tái khám / dặm mi cho khách</div>
              <div>• Đảm bảo thái độ phục vụ chu đáo</div>
              <div>• Rút kinh nghiệm khi bị trừ thưởng Adjust</div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-800 space-y-1">
              <span className="font-bold text-rose-700 dark:text-rose-400 block text-sm">👑 Quản Lý (Management)</span>
              <div>• Giám sát SLA các Ticket Khẩn cấp (&lt;= 4h)</div>
              <div>• Duyệt bảo hành quá hạn &gt; 3 ngày (nếu có)</div>
              <div>• Theo dõi Bảng Xếp Hạng Chất Lượng</div>
              <div>• Đào tạo nâng cao tay nghề KTV bị phạt Fix</div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
