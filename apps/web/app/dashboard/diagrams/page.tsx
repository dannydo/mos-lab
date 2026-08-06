'use client';

import React, { useState } from 'react';
import { Card, Typography, Select, Tag, Segmented, Button, Tooltip, Alert, Space, Spin } from 'antd';
import {
  DesktopOutlined,
  BookOutlined,
  ToolOutlined,
  TrophyOutlined,
  PhoneOutlined,
  SyncOutlined,
  DeploymentUnitOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../../../components/ui';
import { MermaidViewer } from '../../../components/ui/MermaidViewer';
import { useTheme } from '../../../context/ThemeContext';

import { useSearchParams } from 'next/navigation';

const { Title, Text, Paragraph } = Typography;

const DIAGRAMS_LIBRARY = [
  {
    id: 'cs-warranty',
    title: '🎧 Quy Trình CSKH & Bảo Hành 3 Ngày Kiểu Úc (FAL Rules)',
    category: 'CSKH & Warranty',
    description:
      'Sơ đồ luồng công việc 8 bước từ Checkout -> Happy Call -> Leo thang Master Ticket -> Quy trình 2 Giai đoạn tại Shop -> Tự động chốt FAL nửa đêm.',
    chart: `
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
`,
  },
  {
    id: 'cc-gamification',
    title: '🏆 Quy Trình CC Gamification & Tính Thưởng Doanh Số Ngày',
    category: 'Sales & Bonus',
    description:
      'Sơ đồ luồng tính thưởng doanh số ngày 4 danh mục (Combo mới, Sản phẩm, Thu nợ, Nâng cấp) kèm quy tắc chia 50/50 khi CC IN != CC OUT.',
    chart: `
flowchart TD
    OrderCompleted([Đơn Hàng Hoàn Thành Tại Shop]) --> Aggregate[Gom 4 Danh Mục Doanh Số\\nCombo + Sản Phẩm + Thu Nợ + Nâng Cấp]
    Aggregate --> CheckSplit{CC IN != CC OUT?}
    CheckSplit -->|Đúng CC IN != CC OUT| Split50[Chia 50/50 Doanh Số Mỗi CC\\n50% CC IN - 50% CC OUT]
    CheckSplit -->|Sai CC IN == CC OUT| Full100[100% Doanh Số Cho CC Chủ Đơn]
    Split50 --> DailySum[Gom Doanh Số Tính Theo NGÀY Per-CC]
    Full100 --> DailySum
    DailySum --> TierCheck{Tra Bảng Daily Tier Rate?}
    TierCheck -->|< 5 Triệu| Rate05[Hưởng 0.5% Doanh Số]
    TierCheck -->|5M - 10M| Rate10[Hưởng 1.0% Doanh Số]
    TierCheck -->|10M - 15M| Rate15[Hưởng 1.5% Doanh Số]
    TierCheck -->|15M - 20M| Rate20[Hưởng 2.0% Doanh Số]
    TierCheck -->|>= 20 Triệu| Rate25[Hưởng 2.5% Doanh Số]
    Rate05 --> CalcBonus[Tính Thưởng Doanh Số Ngày Math.round]
    Rate10 --> CalcBonus
    Rate15 --> CalcBonus
    Rate20 --> CalcBonus
    Rate25 --> CalcBonus
    CalcBonus --> PaystubLive[Cập Nhật Bảng Thu Nhập Tạm Tính Live Paystub]
`,
  },
  {
    id: 'omicall-sip',
    title: '📞 Quy Trình Tổng Đài OmiCall SIP & Chẩn Đoán Gateway',
    category: 'Switchboard',
    description:
      'Sơ đồ kiểm thử kết nối SIP REGISTER / INVITE trực tiếp đến gateway OmiCall wss://sig.omicrm.com kèm chế độ Mô phỏng Fallback khi hết cước.',
    chart: `
flowchart TD
    InitCall([Khởi Tạo Cuộc Gọi Đi Trên CRM]) --> CheckMode{Chế Độ Kết Nối?}
    CheckMode -->|Mô phỏng Simulation| SimCall[Tự Động Mô Phỏng Cuộc Gọi Test\\nHiển thị Widget & Đếm Thời Gian]
    CheckMode -->|Real SIP WebSocket| ConnectGW[Gửi REGISTER / INVITE wss://sig.omicrm.com\\nExt 106 Realm quangnguyen2]
    ConnectGW --> Response{Mã Phản Hồi SIP?}
    Response -->|200 OK| CallConnected[Cuộc Gọi Kết Nối Thành Công\\nCuộc Gọi Thực Mở]
    Response -->|480 Temporarily Unavailable| Error480[Phát Hiện Khóa Trunk Viettel / Hết Cước Portal]
    Error480 --> AutoFallback[Tự Động Kích Hoạt Chế Độ Mô Phỏng Simulation\\nThông Báo Cho Booker / User]
    AutoFallback --> SimCall
`,
  },
];

function DiagramHubContent() {
  const { themeMode } = useTheme();
  const searchParams = useSearchParams();

  const isStandalone = searchParams.get('standalone') === 'true';
  const paramId = searchParams.get('id');

  const [selectedDiagramId, setSelectedDiagramId] = useState<string>(() => paramId || 'cs-warranty');

  const selectedDiagram = DIAGRAMS_LIBRARY.find((d) => d.id === selectedDiagramId) || DIAGRAMS_LIBRARY[0];

  if (isStandalone) {
    return (
      <div className="fixed inset-0 w-full h-full bg-slate-900 text-white p-0 flex flex-col overflow-hidden z-50">
        <MermaidViewer
          chart={selectedDiagram.chart}
          title={selectedDiagram.title}
          height="100vh"
          diagramId={selectedDiagram.id}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Thư Viện Sơ Đồ Quy Trình Systems (Diagram Hub)"
        subtitle="🖥️ Tối ưu hiển thị cho 2 Màn Hình 4K (Dọc & Ngang) — Phóng to/Thu nhỏ, Toàn màn hình & Cửa sổ độc lập"
      />

      {/* Control Selector Bar */}
      <Card variant="outlined" className="shadow-xs rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <DeploymentUnitOutlined className="text-xl text-sky-500" />
            <span className="font-semibold text-sm">Chọn Sơ Đồ Quy Trình:</span>
            <Select
              style={{ width: 380 }}
              value={selectedDiagramId}
              onChange={setSelectedDiagramId}
              options={DIAGRAMS_LIBRARY.map((d) => ({
                value: d.id,
                label: `${d.title}`,
              }))}
            />
          </div>

          <div className="flex items-center gap-2">
            <Tag color="purple" className="font-semibold">
              {selectedDiagram.category}
            </Tag>
            <Tag color="cyan" className="font-semibold">
              4K Multi-Monitor Supported
            </Tag>
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">📌 {selectedDiagram.description}</div>
      </Card>

      {/* Main 4K Mermaid Viewer Canvas */}
      <MermaidViewer
        chart={selectedDiagram.chart}
        title={selectedDiagram.title}
        height="750px"
        diagramId={selectedDiagram.id}
      />
    </div>
  );
}

export default function DiagramHubPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center">
          <Spin size="large" />
        </div>
      }
    >
      <DiagramHubContent />
    </React.Suspense>
  );
}
