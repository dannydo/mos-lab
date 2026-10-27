'use client';

import React, { useState, useMemo } from 'react';
import { Card, Button, Tooltip, Form, Input, Select, message } from 'antd';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  Eye,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Clock,
  Info,
  Calendar,
  User,
  Plus,
  FileText,
  Paperclip,
  Download,
  Stethoscope,
  PhoneCall,
  Printer,
  Sparkles,
  ExternalLink,
  ChevronRight,
  RotateCcw,
  BookOpen,
  Edit2,
  type LucideIcon,
} from 'lucide-react';
import type { PilotSession } from '@mos-lab/shared';
import { AppIcon } from '../../../../components/ui/AppIcon';
import { AdaptiveModal } from '../../../../components/ui/AdaptiveOverlay';

const { TextArea } = Input;

export interface PilotSafetyRiskSopDetailProps {
  onBack?: () => void;
  sessions?: PilotSession[];
  onOpenSessionFlow?: (session: PilotSession) => void;
}

// -------------------------------------------------------------
// PHẦN 1 DATA TYPES: QUY TẮC BẢO VỆ NIÊM MẠC MẮT
// -------------------------------------------------------------
export interface SafetyStageRule {
  id: string;
  stage: 'BEFORE' | 'DURING' | 'AFTER';
  stageName: string;
  stageTiming: string;
  title: string;
  description: string;
  actions: string[];
  warningNote?: string;
}

export interface SafetyControlPoint {
  id: string;
  code: string;
  name: string;
  standard: string;
  tolerance: string;
  inspectionTool: string;
  checked?: boolean;
}

export interface SafetyAttachment {
  id: string;
  name: string;
  category: string;
  format: string;
  uploadDate: string;
  uploadedBy: string;
  description: string;
  url?: string;
}

// -------------------------------------------------------------
// PHẦN 2 DATA TYPES: NHẬN DIỆN & XỬ LÝ PHẢN ỨNG NHẠY CẢM
// -------------------------------------------------------------
export interface SensitiveReactionCase {
  id: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  severityLabel: string;
  severityColor: string;
  name: string;
  recognitionSigns: string[];
  preventionMeasures: string[];
  clinicalTreatment: string[];
  escalationRequired: boolean;
  expertConfirmed: boolean;
}

// -------------------------------------------------------------
// PHẦN 3 DATA TYPES: BIÊN BẢN SỰ CỐ & CHĂM SÓC BỔ SUNG
// -------------------------------------------------------------
export interface IncidentReport {
  id: string;
  code: string;
  incidentTime: string;
  sessionId?: number;
  sessionCode?: string;
  customerName: string;
  customerPhone: string;
  technicianName: string;
  incidentType: 'STINGING_MILD' | 'IRRITATION_MODERATE' | 'ALLERGIC_SEVERE' | 'TECHNICAL_OTHER';
  incidentTypeLabel: string;
  description: string;
  immediateAction: string;
  status: 'INVESTIGATING' | 'STABILIZED' | 'RESOLVED' | 'TRANSFERRED_MEDICAL';
  followUp24h?: {
    recordedAt: string;
    condition: string;
    note: string;
  };
  followUp48h?: {
    recordedAt: string;
    condition: string;
    note: string;
  };
  followUp72h?: {
    recordedAt: string;
    condition: string;
    note: string;
  };
  compensationNote?: string;
}

// -------------------------------------------------------------
// INITIAL DEFAULT DATA (THEO THỰC NGHIỆM PILOT 17 CA CÔ GIANG ĐÀM)
// -------------------------------------------------------------
const INITIAL_STAGE_RULES: SafetyStageRule[] = [
  {
    id: 'stage-before',
    stage: 'BEFORE',
    stageName: 'Trước dịch vụ (Tiền thao tác)',
    stageTiming: '10–15 phút đầu',
    title: 'Thẩm định an toàn bờ mi, làm sạch & cô lập niêm mạc',
    description:
      'Tuyệt đối không thực hiện dịch vụ nếu phát hiện mắt có dấu hiệu đỏ ngầu, viêm bờ mi, chắp lẹo hoặc khách vừa phẫu thuật mắt trong vòng 6 tháng.',
    actions: [
      'Khảo sát tiền sử dị ứng mỹ phẩm, tiền sử đeo kính áp tròng (yêu cầu tháo lens trước khi thao tác).',
      'Vệ sinh toàn bộ vùng mắt bằng bọt rửa mi sinh học dịu nhẹ (Tear-Free Lash Cleanser) có độ pH trung tính 6.8–7.2.',
      'Dán miếng đệm Hydrogel cô lập trọn vẹn hàng mi dưới, mép đệm cách gờ mí dưới tối thiểu 0.5mm, không chạm kết mạc.',
      'Căn chỉnh trục silicon cách gốc mi trên từ 0.8mm đến 1.0mm; không dán đè lên tuyến bã nhờn Meibomius.',
    ],
    warningNote: 'Nếu mép pad cộm vào mắt khiến khách chớp nhiều, lập tức bóc dán lại nhẹ nhàng, không để khách chịu đựng.',
  },
  {
    id: 'stage-during',
    stage: 'DURING',
    stageName: 'Trong dịch vụ (Trong thao tác)',
    stageTiming: '35–45 phút cốt lõi',
    title: 'Kiểm soát vùng thoa thuốc & khoảng cách an toàn giác mạc',
    description:
      'Thuốc uốn số 1 và số 2 chỉ được phép tiếp xúc với 1/3 thân giữa sợi mi, cách gốc chân mi ít nhất 1.0mm.',
    actions: [
      'Dùng cọ vi sợi bôi thuốc số 1 chuẩn xác lên thân mi; tuyệt đối không để thuốc lem vào ngọn mi hoặc tràn vào gốc mi.',
      'Cứ 3–5 phút quan sát phản ứng mí mắt của khách; nếu thấy mi mắt chớp giật nhẹ phải nhẹ nhàng hỏi thăm cảm giác.',
      'Dùng tăm bông khô vô trùng thường trực chặn viền dưới của trục silicon, thấm hút tức thì mọi giọt thuốc dư.',
      'Bật quạt thổi gió lạnh mini nhẹ nhàng phía trên đầu khách để tản hơi thuốc uốn, không để đọng cay mắt.',
    ],
    warningNote: 'Nghiêm cấm để thuốc uốn số 1 dính vào tròng đen hoặc niêm mạc mắt dù chỉ một vi điểm cực nhỏ.',
  },
  {
    id: 'stage-after',
    stage: 'AFTER',
    stageName: 'Sau dịch vụ (Hậu thao tác)',
    stageTiming: '10–15 phút hoàn tất',
    title: 'Làm sạch triệt để tàn dư, phủ dưỡng & bảo vệ giác mạc',
    description:
      'Toàn bộ hóa chất còn lưu lại trên trục và sợi mi phải được trung hòa và làm sạch tinh khiết trước khi khách mở mắt.',
    actions: [
      'Dùng tăm bông thấm dung dịch nước muối sinh lý NaCl 0.9% hoặc nước cất tinh khiết lau sạch 100% tàn dư thuốc.',
      'Phủ tinh chất dưỡng bóng Keratin và Collagen tự nhiên nuôi dưỡng nang lông và phục hồi lớp biểu bì mi bóng mượt.',
      'Tháo trục silicon và miếng pad hydrogel theo phương nghiêng 30 độ về phía đuôi mắt, thao tác êm ái không kéo căng da mí.',
      'Nhỏ 1–2 giọt nước mắt nhân tạo vô trùng (hoặc Natri Clorid 0.9%) làm dịu kết mạc mắt và hướng dẫn khách mở mắt từ từ.',
    ],
    warningNote: 'Dặn dò khách không dụi mắt trong 24 giờ đầu và kiêng nước trực tiếp lên mắt trong vòng 6 giờ sau dịch vụ.',
  },
];

const INITIAL_SAFETY_CONTROL_POINTS: SafetyControlPoint[] = [
  {
    id: 'scp-1',
    code: 'SCP-01',
    name: 'Khoảng cách an toàn gốc mi',
    standard: 'Trục silicon đặt cách chân mi trên ≥ 0.8mm',
    tolerance: '0.8mm – 1.0mm',
    inspectionTool: 'Cữ thước đo mi kỹ thuật hoặc cọ căn trục',
    checked: true,
  },
  {
    id: 'scp-2',
    code: 'SCP-02',
    name: 'Đệm cách ly mi dưới',
    standard: 'Miếng dán Hydrogel che kín 100% mi dưới, không cộm tròng đen',
    tolerance: 'Mép pad cách bờ mi dưới 0.5mm',
    inspectionTool: 'Đèn lúp quan sát góc nghiêng',
    checked: true,
  },
  {
    id: 'scp-3',
    code: 'SCP-03',
    name: 'Vùng thoa thuốc uốn',
    standard: 'Chỉ thoa 1/3 thân giữa mi, cách gốc mi ≥ 1.0mm, cách ngọn mi 1.0mm',
    tolerance: 'Không tràn chân mi',
    inspectionTool: 'Cọ vi sợi Microbrush vô trùng',
    checked: true,
  },
  {
    id: 'scp-4',
    code: 'SCP-04',
    name: 'Thời gian ủ thuốc số 1',
    standard: 'Căn chỉnh nghiêm ngặt theo độ dày sợi mi (10 đến 15 phút)',
    tolerance: '± 30 giây tối đa',
    inspectionTool: 'Đồng hồ hẹn giờ Tabular Timer',
    checked: true,
  },
  {
    id: 'scp-5',
    code: 'SCP-05',
    name: 'Khử khuẩn bộ dụng cụ',
    standard: 'Nhíp định hình và que gạt tiệt trùng cồn 70° và sấy tia cực tím UV',
    tolerance: '100% vô trùng trước ca',
    inspectionTool: 'Tủ sấy UV & dung dịch cồn y tế',
    checked: true,
  },
  {
    id: 'scp-6',
    code: 'SCP-06',
    name: 'Dung dịch rửa trung hòa',
    standard: 'Nước muối sinh lý NaCl 0.9% vô trùng & nước mắt nhân tạo',
    tolerance: 'Hạn mở nắp ≤ 15 ngày',
    inspectionTool: 'Kiểm tra tem niêm phong lọ',
    checked: true,
  },
];

const INITIAL_SAFETY_ATTACHMENTS: SafetyAttachment[] = [
  {
    id: 'att-1',
    name: 'So-do-khoang-cach-an-toan-giac-mac-v1.pdf',
    category: 'Sơ đồ kỹ thuật',
    format: 'PDF',
    uploadDate: '2026-10-15',
    uploadedBy: 'Cô Giang Đàm',
    description: 'Sơ đồ giải phẫu bờ mi và khoảng cách căn chỉnh trục silicon ≥ 0.8mm chuẩn an toàn.',
  },
  {
    id: 'att-2',
    name: 'Quy-chuan-dan-pad-hydrogel-cach-ly.png',
    category: 'Hình ảnh hướng dẫn',
    format: 'PNG',
    uploadDate: '2026-10-18',
    uploadedBy: 'Cô Đẫm (KTV)',
    description: 'Ảnh chụp cận cảnh thao tác dán đệm hydrogel cách bờ mi dưới 0.5mm tại 17 ca Pilot Đề Thám.',
  },
  {
    id: 'att-3',
    name: 'Huong-dan-vo-trung-va-kiem-soat-nhiem-khuan.docx',
    category: 'Quy chuẩn vệ sinh',
    format: 'DOCX',
    uploadDate: '2026-10-20',
    uploadedBy: 'Cô Giang Đàm',
    description: 'Quy trình tiệt trùng nhíp uốn, lược chải mi và khay đựng vật tư theo tiêu chuẩn y tế Wings.',
  },
];

const INITIAL_SENSITIVE_CASES: SensitiveReactionCase[] = [
  {
    id: 'case-mild',
    severity: 'MILD',
    severityLabel: 'Mức độ Nhẹ (Cấp 1)',
    severityColor: 'amber',
    name: 'Cay mắt & Chảy nước mắt phản xạ',
    recognitionSigns: [
      'Mí mắt khách hàng chớp giật nhẹ, co mi không tự chủ.',
      'Khóe mắt hoặc đuôi mắt ứa nước mắt phản xạ ra ngoài.',
      'Khách phản ánh cảm giác the the mát nhẹ hoặc hơi cay cay thoáng qua.',
    ],
    preventionMeasures: [
      'Nhắc nhở khách nhắm êm mắt trong suốt ca, không hé mở mắt nói chuyện.',
      'Kiểm tra lại miếng pad hydrogel xem có bị hở mép mí làm lọt hơi thuốc vào không.',
      'Sử dụng quạt tản gió mini trên đỉnh đầu để tản hơi thuốc uốn đi xa.',
    ],
    clinicalTreatment: [
      'Ngừng thao tác bôi thuốc ngay lập tức.',
      'Dùng que tăm bông khô vô trùng chậm nhẹ nhàng nước mắt ở khóe và đuôi mắt, không lau quẹt mạnh.',
      'Bật quạt gió làm mát dịu trong 30–45 giây cho hơi the tan hết.',
      'Hỏi thăm cảm giác của khách: Chỉ tiếp tục khi mắt khách hoàn toàn êm ái.',
    ],
    escalationRequired: false,
    expertConfirmed: true,
  },
  {
    id: 'case-moderate',
    severity: 'MODERATE',
    severityLabel: 'Mức độ Trung bình (Cấp 2)',
    severityColor: 'orange',
    name: 'Kích ứng đỏ kết mạc / Nóng rát bờ mi',
    recognitionSigns: [
      'Lòng trắng mắt xuất hiện các tia máu cương tụ đỏ quanh rìa giác mạc.',
      'Khách kêu cảm giác rát nhẹ hoặc châm chích dọc theo bờ mi.',
      'Vùng da mi mắt ửng đỏ nhẹ hơn bình thường sau khi tháo trục.',
    ],
    preventionMeasures: [
      'Tuyệt đối không bôi thuốc vượt quá 1/3 thân giữa mi, cách chân mi ít nhất 1.0mm.',
      'Chọn trục silicon vừa vặn cung mắt, không dùng trục quá nhỏ ép gập mi.',
      'Giảm 2–3 phút thời gian ủ đối với mắt có cơ địa nhạy cảm hoặc mạch máu nổi rõ.',
    ],
    clinicalTreatment: [
      'LẬP TỨC gạt sạch và tháo bỏ toàn bộ thuốc uốn khỏi sợi mi bằng tăm bông sạch.',
      'Rửa mắt nhẹ nhàng bằng dung dịch nước muối sinh lý NaCl 0.9% đẳng trương vô trùng.',
      'Đắp miếng gạc vô trùng thấm nước mát êm dịu lên mi mắt trong 5–10 phút.',
      'Nhỏ 2 giọt nước mắt nhân tạo bôi trơn giác mạc; tặng lọ nước mắt nhân tạo mang về dưỡng mắt.',
      'Ghi nhận biên bản theo dõi và điện thoại thăm khám sau 24 giờ.',
    ],
    escalationRequired: false,
    expertConfirmed: true,
  },
  {
    id: 'case-severe',
    severity: 'SEVERE',
    severityLabel: 'Mức độ Nghiêm trọng (Cấp 3 - Cấp cứu)',
    severityColor: 'rose',
    name: 'Phản ứng dị ứng cấp tính / Hóa chất tiếp xúc giác mạc',
    recognitionSigns: [
      'Khách đau nhói dữ dội, mi mắt co quắp chặt không mở ra được.',
      'Kết mạc mắt đỏ rực toàn phần, giác mạc bị mờ đục hoặc phù nề mọng nước.',
      'Sưng húp bờ mi mắt, ngứa rát bùng phát dữ dội hoặc xuất hiện bọng nước.',
    ],
    preventionMeasures: [
      'Khảo sát tiền sử dị ứng nghiêm ngặt ở bước thẩm định; kiên quyết từ chối ca nếu nghi ngờ.',
      'Không bao giờ thao tác khi khách cựa quậy hoặc không giữ yên tư thế đầu.',
      'Luôn có tăm bông khô và nước rửa vô trùng sẵn sàng trên bàn làm việc.',
    ],
    clinicalTreatment: [
      'PHÁT LỆNH "STOP" – DỪNG TOÀN BỘ QUY TRÌNH DỊCH VỤ NGAY TỨC THÌ!',
      'Rửa mắt liên tục bằng nước muối sinh lý NaCl 0.9% từ khóe mắt ra đuôi mắt trong tối thiểu 10–15 phút.',
      'Tuyệt đối không cho khách dùng tay dụi mắt hoặc xoa ấn lên nhãn cầu.',
      'BÁO CÁO KHẨN CẤP cho Quản lý chi nhánh Đề Thám và Chuyên gia Cô Giang Đàm.',
      'KÍCH HOẠT QUY TRÌNH CHUYỂN TUYẾN Y TẾ: Điều động xe đưa khách đến Bệnh viện Mắt TP.HCM (280 Điện Biên Phủ, Q.3) hoặc cơ sở y tế chuyên khoa mắt gần nhất.',
      'Cử nhân sự Wings đi cùng khách, hỗ trợ 100% chi phí thăm khám, thuốc men và chăm sóc sau điều trị.',
    ],
    escalationRequired: true,
    expertConfirmed: true,
  },
];

export function PilotSafetyRiskSopDetail({
  onBack,
  sessions = [],
  onOpenSessionFlow,
}: PilotSafetyRiskSopDetailProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'part1' | 'part2' | 'part3' | 'draft'>('overview');

  // Thẩm định chuyên môn state
  const [isExpertApproved, setIsExpertApproved] = useState<boolean>(false);
  const [approvalDate, setApprovalDate] = useState<string>('2026-10-27');
  const [expertNote, setExpertNote] = useState<string>(
    'Đã thẩm định 3 phần: Quy tắc bảo vệ niêm mạc, Quy trình nhận diện phản ứng & Biểu mẫu biên bản sự cố. Đủ điều kiện đưa vào hồ sơ trình CEO phê duyệt Scale-up.'
  );

  // Dữ liệu Phần 1
  const [stageRules, setStageRules] = useState<SafetyStageRule[]>(INITIAL_STAGE_RULES);
  const [controlPoints, setControlPoints] = useState<SafetyControlPoint[]>(INITIAL_SAFETY_CONTROL_POINTS);
  const [attachments, setAttachments] = useState<SafetyAttachment[]>(INITIAL_SAFETY_ATTACHMENTS);

  // Dữ liệu Phần 2
  const [sensitiveCases, setSensitiveCases] = useState<SensitiveReactionCase[]>(INITIAL_SENSITIVE_CASES);

  // Dữ liệu Phần 3 (Theo nguyên tắc Pilot: Ban đầu 0 ca sự cố!)
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);

  // Modals state
  const [isAddIncidentModalOpen, setIsAddIncidentModalOpen] = useState(false);
  const [isAddAttachmentModalOpen, setIsAddAttachmentModalOpen] = useState(false);
  const [isEditStageModalOpen, setIsEditStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<SafetyStageRule | null>(null);
  const [isEditCaseModalOpen, setIsEditCaseModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<SensitiveReactionCase | null>(null);
  const [selectedIncidentDetail, setSelectedIncidentDetail] = useState<IncidentReport | null>(null);

  // Forms
  const [incidentForm] = Form.useForm();
  const [attachmentForm] = Form.useForm();
  const [stageForm] = Form.useForm();
  const [caseForm] = Form.useForm();

  // Thống kê an toàn Pilot
  const pilotStats = useMemo(() => {
    const totalPilotSessions = sessions.length > 0 ? sessions.length : 17;
    const zeroIncidents = incidents.length === 0;
    const safetyRate = totalPilotSessions > 0 ? ((totalPilotSessions - incidents.length) / totalPilotSessions) * 100 : 100;
    return {
      totalPilotSessions,
      incidentsCount: incidents.length,
      safetyRate: safetyRate.toFixed(1),
      zeroIncidents,
    };
  }, [sessions, incidents]);

  // Handler: Toggle kiểm tra Control Point (SCP)
  const handleToggleControlPoint = (id: string) => {
    setControlPoints((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  // Handler: Thêm biên bản sự cố mới (khi có phát sinh thực tế)
  const handleCreateIncident = (values: any) => {
    const newCode = `INC-${new Date().getFullYear().toString().slice(2)}${(new Date().getMonth() + 1)
      .toString()
      .padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${(incidents.length + 1)
      .toString()
      .padStart(3, '0')}`;

    const newIncident: IncidentReport = {
      id: `inc-${Date.now()}`,
      code: newCode,
      incidentTime: values.incidentTime || new Date().toLocaleString('vi-VN'),
      sessionId: values.sessionId ? Number(values.sessionId) : undefined,
      sessionCode: values.sessionId ? `Ca #${values.sessionId}` : undefined,
      customerName: values.customerName,
      customerPhone: values.customerPhone || 'Không cung cấp',
      technicianName: values.technicianName || 'Cô Đẫm (KTV)',
      incidentType: values.incidentType,
      incidentTypeLabel:
        values.incidentType === 'STINGING_MILD'
          ? 'Cay mắt nhẹ'
          : values.incidentType === 'IRRITATION_MODERATE'
            ? 'Kích ứng đỏ bờ mi'
            : values.incidentType === 'ALLERGIC_SEVERE'
              ? 'Phản ứng dị ứng cấp'
              : 'Sự cố kỹ thuật khác',
      description: values.description,
      immediateAction: values.immediateAction,
      status: values.status || 'INVESTIGATING',
      followUp24h: values.followUp24h
        ? {
            recordedAt: new Date().toLocaleDateString('vi-VN'),
            condition: values.followUp24h,
            note: 'Ghi nhận sau 24h',
          }
        : undefined,
      compensationNote: values.compensationNote,
    };

    setIncidents([newIncident, ...incidents]);
    message.success(`Đã lập biên bản sự cố ${newCode} thành công.`);
    setIsAddIncidentModalOpen(false);
    incidentForm.resetFields();
  };

  // Handler: Cập nhật chăm sóc sau 24h/48h/72h
  const handleUpdateFollowUp = (incidentId: string, milestone: '24h' | '48h' | '72h', text: string) => {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== incidentId) return inc;
        const nowStr = new Date().toLocaleDateString('vi-VN');
        if (milestone === '24h') {
          return { ...inc, followUp24h: { recordedAt: nowStr, condition: text, note: 'Khách phản hồi êm mắt' } };
        }
        if (milestone === '48h') {
          return { ...inc, followUp48h: { recordedAt: nowStr, condition: text, note: 'Mắt ổn định hoàn toàn' } };
        }
        return {
          ...inc,
          followUp72h: { recordedAt: nowStr, condition: text, note: 'Đóng ca chăm sóc' },
          status: 'RESOLVED',
        };
      })
    );
    message.success(`Đã cập nhật theo dõi sau ${milestone} cho biên bản sự cố.`);
  };

  // Handler: Thêm tài liệu hướng dẫn
  const handleAddAttachment = (values: any) => {
    const newAtt: SafetyAttachment = {
      id: `att-${Date.now()}`,
      name: values.name,
      category: values.category || 'Tài liệu SOP',
      format: values.format || 'PDF',
      uploadDate: new Date().toISOString().split('T')[0],
      uploadedBy: values.uploadedBy || 'Cô Giang Đàm',
      description: values.description || '',
    };
    setAttachments([newAtt, ...attachments]);
    message.success('Đã đính kèm tài liệu hướng dẫn thành công.');
    setIsAddAttachmentModalOpen(false);
    attachmentForm.resetFields();
  };

  // Handler: Chỉnh sửa Quy tắc bảo vệ niêm mạc (Phần 1)
  const handleSaveStageRule = (values: any) => {
    if (!editingStage) return;
    setStageRules((prev) =>
      prev.map((st) =>
        st.id === editingStage.id
          ? {
              ...st,
              title: values.title,
              description: values.description,
              actions: typeof values.actions === 'string' ? values.actions.split('\n').filter(Boolean) : values.actions,
              warningNote: values.warningNote,
            }
          : st
      )
    );
    message.success(`Đã cập nhật quy tắc cho ${editingStage.stageName}.`);
    setIsEditStageModalOpen(false);
    setEditingStage(null);
  };

  // Handler: Chỉnh sửa tình huống nhạy cảm (Phần 2)
  const handleSaveSensitiveCase = (values: any) => {
    if (!editingCase) return;
    setSensitiveCases((prev) =>
      prev.map((c) =>
        c.id === editingCase.id
          ? {
              ...c,
              name: values.name,
              recognitionSigns:
                typeof values.recognitionSigns === 'string'
                  ? values.recognitionSigns.split('\n').filter(Boolean)
                  : values.recognitionSigns,
              preventionMeasures:
                typeof values.preventionMeasures === 'string'
                  ? values.preventionMeasures.split('\n').filter(Boolean)
                  : values.preventionMeasures,
              clinicalTreatment:
                typeof values.clinicalTreatment === 'string'
                  ? values.clinicalTreatment.split('\n').filter(Boolean)
                  : values.clinicalTreatment,
              expertConfirmed: true,
            }
          : c
      )
    );
    message.success(`Đã cập nhật tình huống ${editingCase.name}.`);
    setIsEditCaseModalOpen(false);
    setEditingCase(null);
  };

  // Handler: In / Xuất bản dự thảo
  const handlePrintSop = () => {
    window.print();
  };

  return (
    <div className="space-y-5 antialiased" data-testid="pilot-safety-risk-sop-detail">
      {/* ═══════════════════════════════════════════════════════════
          HEADER BAR: BACK BUTTON & BREADCRUMB
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              data-testid="sop-safety-back-button"
            >
              <AppIcon icon={ArrowLeft} size={14} />
              <span>Quay lại Khung đào tạo</span>
            </button>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>SOP &amp; Đào tạo KTV</span>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="font-semibold text-rose-600 dark:text-rose-400">Hạng mục 4: Quản trị an toàn &amp; Xử lý sự cố</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="small"
            icon={<AppIcon icon={Printer} size={13} />}
            onClick={handlePrintSop}
            className="text-xs"
          >
            In / Xuất Dự Thảo SOP
          </Button>
          <Button
            size="small"
            type={isExpertApproved ? 'default' : 'primary'}
            danger={!isExpertApproved}
            icon={<AppIcon icon={isExpertApproved ? CheckCircle2 : ShieldCheck} size={13} />}
            onClick={() => {
              setIsExpertApproved(!isExpertApproved);
              message.info(
                !isExpertApproved
                  ? 'Đã chuyển sang trạng thái: ĐÃ THẨM ĐỊNH CHUYÊN MÔN BỞI CÔ GIANG ĐÀM'
                  : 'Đã chuyển về trạng thái: CHỜ CÔ GIANG ĐÀM THẨM ĐỊNH'
              );
            }}
            data-testid="toggle-approval-btn"
            className="text-xs font-medium"
          >
            {isExpertApproved ? 'Đã thẩm định chuyên môn' : 'Xác nhận thẩm định chuyên môn'}
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          HEADER BANNER & SCALE APPROVAL STATUS
          ═══════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl p-5 sm:p-6 border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-transparent relative overflow-hidden shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2 max-w-4xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                <AppIcon icon={ShieldCheck} size={13} className="mr-1.5" />
                Hạng mục 4 · SOP Quản Trị An Toàn, Rủi Ro &amp; Xử Lý Sự Cố
              </span>
              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                Phiên bản SOP v1.0
              </span>
              <span
                className={`inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  isExpertApproved
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                }`}
                data-testid="expert-approval-status-badge"
              >
                <AppIcon
                  icon={isExpertApproved ? CheckCircle2 : Clock}
                  size={13}
                  className={`mr-1.5 ${isExpertApproved ? 'text-emerald-500' : 'text-amber-500'}`}
                />
                {isExpertApproved
                  ? 'Đã được Cô Giang Đàm thẩm định chuyên môn'
                  : 'Chờ Cô Giang Đàm thẩm định chuyên môn'}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight m-0">
              SOP Quản Trị An Toàn Giác Mạc, Phòng Ngừa Rủi Ro &amp; Xử Lý Sự Cố
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed m-0">
              Hệ thống tiêu chuẩn an toàn y tế nghiêm ngặt dành cho{' '}
              <strong className="text-slate-800 dark:text-slate-100">Chuyên Viên Kỹ Thuật</strong> thực hiện dịch vụ
              Uốn Mi Bóng Tối tại Wings. Quy chuẩn hóa quy tắc bảo vệ niêm mạc mắt trước - trong - sau dịch vụ, nhận diện
              tức thời 3 cấp độ phản ứng nhạy cảm và quy chế lập biên bản xử lý sự cố. Tài liệu tổng hợp thành hồ sơ dự
              thảo để Chuyên gia Cô Giang Đàm thẩm định trước khi trình CEO phê duyệt Scale-up toàn chuỗi.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shrink-0 space-y-1.5 min-w-[240px]">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Hồ sơ thẩm định Scale
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Chuyên gia phê duyệt:</span>
              <strong className="text-slate-800 dark:text-slate-200">Cô Giang Đàm</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Thực nghiệm Pilot:</span>
              <strong className="text-slate-800 dark:text-slate-200">
                Cô Đẫm ({pilotStats.totalPilotSessions} ca - 100% an toàn)
              </strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Trạng thái hồ sơ:</span>
              <span
                className={`font-semibold ${
                  isExpertApproved ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {isExpertApproved ? 'Đã thẩm định' : 'Chờ thẩm định'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Quy chế áp dụng:</span>
              <span className="text-slate-700 dark:text-slate-300 text-[11px]">Không tự ban hành SOP</span>
            </div>
          </div>
        </div>

        {/* 3 Thẻ Trụ Cột Nổi Bật */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div
            onClick={() => setActiveTab('part1')}
            className="p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 space-y-1.5 cursor-pointer hover:border-emerald-500/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <AppIcon icon={Eye} size={14} className="text-emerald-500" />
                <span>Phần 1: Bảo vệ niêm mạc mắt</span>
              </div>
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 m-0">
                3 Giai đoạn
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 leading-normal">
              Quy tắc trước - trong - sau dịch vụ, khoảng cách cữ trục ≥ 0.8mm và 6 Điểm kiểm soát an toàn (SCP).
            </p>
          </div>

          <div
            onClick={() => setActiveTab('part2')}
            className="p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 space-y-1.5 cursor-pointer hover:border-amber-500/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <AppIcon icon={AlertTriangle} size={14} className="text-amber-500" />
                <span>Phần 2: Nhận diện &amp; Xử lý rủi ro</span>
              </div>
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 m-0">
                3 Cấp độ
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 leading-normal">
              Nhận diện sớm cay mắt, kích ứng đỏ bờ mi và quy trình khẩn cấp chuyển tuyến y tế chuyên khoa mắt.
            </p>
          </div>

          <div
            onClick={() => setActiveTab('part3')}
            className="p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 space-y-1.5 cursor-pointer hover:border-rose-500/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <AppIcon icon={ShieldAlert} size={14} className="text-rose-500" />
                <span>Phần 3: Biên bản sự cố &amp; Chăm sóc</span>
              </div>
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 m-0">
                0 Sự cố Pilot
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 leading-normal">
              17 ca Pilot Đề Thám an toàn 100%. Biểu mẫu ghi nhận sự cố sẵn sàng và lộ trình chăm sóc 24h - 48h - 72h.
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          NAVIGATION TABS
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          data-testid="tab-safety-overview"
        >
          Toàn cảnh Hạng mục 4
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('part1')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'part1'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          data-testid="tab-safety-part1"
        >
          <AppIcon icon={Eye} size={13} />
          <span>Phần 1: Bảo vệ niêm mạc mắt</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('part2')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'part2'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          data-testid="tab-safety-part2"
        >
          <AppIcon icon={AlertTriangle} size={13} />
          <span>Phần 2: Nhận diện &amp; Xử lý rủi ro</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('part3')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'part3'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          data-testid="tab-safety-part3"
        >
          <AppIcon icon={ShieldAlert} size={13} />
          <span>Phần 3: Biên bản sự cố &amp; Chăm sóc</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('draft')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'draft'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          data-testid="tab-safety-draft"
        >
          <AppIcon icon={BookOpen} size={13} />
          <span>Dự thảo SOP Trình Scale</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB CONTENT: OVERVIEW
          ═══════════════════════════════════════════════════════════ */}
      {(activeTab === 'overview' || activeTab === 'part1') && (
        <section className="space-y-4" data-testid="safety-part-1-section">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                Phần 1 – Quy chuẩn thao tác
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
                Quy Tắc Bảo Vệ Niêm Mạc Mắt Trước, Trong và Sau Dịch Vụ
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="small"
                icon={<AppIcon icon={Plus} size={12} />}
                onClick={() => setIsAddAttachmentModalOpen(true)}
                className="text-xs"
              >
                Đính kèm tài liệu SOP
              </Button>
            </div>
          </div>

          {/* 3 Giai đoạn Bảo Vệ Niêm Mạc Mắt */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {stageRules.map((st) => (
              <Card
                key={st.id}
                variant="outlined"
                className="rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      {st.stageName}
                    </span>
                    <span className="text-[11px] text-slate-500 tabular-nums">{st.stageTiming}</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0 leading-snug">
                    {st.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed m-0">
                    {st.description}
                  </p>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                      Thao tác bắt buộc:
                    </span>
                    <ul className="m-0 p-0 list-none space-y-1.5">
                      {st.actions.map((act, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span className="leading-tight">{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {st.warningNote && (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                      <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-600" />
                      <span>{st.warningNote}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStage(st);
                      stageForm.setFieldsValue({
                        title: st.title,
                        description: st.description,
                        actions: st.actions.join('\n'),
                        warningNote: st.warningNote,
                      });
                      setIsEditStageModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer bg-transparent border-0"
                  >
                    <Edit2 size={12} />
                    <span>Chỉnh sửa quy tắc</span>
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {/* Checklist 6 Điểm kiểm soát an toàn (SCP) */}
          <Card
            variant="outlined"
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-800">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Checklist Tiêu Chuẩn Thực Hành KTV
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                  6 Điểm Kiểm Soát An Toàn Giác Mạc Bắt Buộc (Safety Control Points - SCP)
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Chuyên Viên Kỹ Thuật phải kiểm tra và xác nhận đủ 6/6 điểm trước khi kết thúc ca
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {controlPoints.map((scp) => (
                <div
                  key={scp.id}
                  onClick={() => handleToggleControlPoint(scp.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                    scp.checked
                      ? 'bg-white dark:bg-slate-800/80 border-emerald-500/40 shadow-xs'
                      : 'bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                  data-testid={`scp-item-${scp.code}`}
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      scp.checked ? 'bg-emerald-500 text-white' : 'border border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {scp.checked && <CheckCircle2 size={13} />}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        {scp.code} · {scp.name}
                      </span>
                      <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 m-0 tabular-nums">
                        {scp.tolerance}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium m-0 leading-snug">
                      {scp.standard}
                    </p>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <span>Dụng cụ kiểm soát:</span>
                      <span className="text-slate-600 dark:text-slate-400 font-medium">{scp.inspectionTool}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Tài Liệu Hướng Dẫn & Minh Chứng Đính Kèm */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip size={15} className="text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                  Tài Liệu Hướng Dẫn &amp; Hình Ảnh Minh Họa Kỹ Thuật Đính Kèm ({attachments.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAttachmentModalOpen(true)}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer bg-transparent border-0"
              >
                + Thêm tài liệu mới
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-2 bg-slate-50/50 dark:bg-slate-800/30"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 m-0">
                        {att.format}
                      </span>
                      <span className="text-[11px] text-slate-400 tabular-nums">{att.uploadDate}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 m-0 truncate" title={att.name}>
                      {att.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 m-0 line-clamp-2">{att.description}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 truncate">Bởi: {att.uploadedBy}</span>
                    <button
                      type="button"
                      onClick={() => message.info(`Tải xuống tài liệu ${att.name}`)}
                      className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1 cursor-pointer bg-transparent border-0"
                    >
                      <Download size={11} />
                      <span>Xem / Tải</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB CONTENT: PART 2 – NHẬN DIỆN & XỬ LÝ PHẢN ỨNG NHẠY CẢM
          ═══════════════════════════════════════════════════════════ */}
      {(activeTab === 'overview' || activeTab === 'part2') && (
        <section className="space-y-4 pt-2" data-testid="safety-part-2-section">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                Phần 2 – Lâm sàng &amp; Khẩn cấp
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
                Nhận Diện Sớm &amp; Xử Lý Phản Ứng Nhạy Cảm (Do Cô Giang Đàm Xác Nhận)
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              Phân định rõ thẩm quyền Chuyên viên vs Quy chế chuyển viện y tế
            </span>
          </div>

          {/* 3 Cấp độ Phản ứng nhạy cảm */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {sensitiveCases.map((cs) => {
              const isSevere = cs.severity === 'SEVERE';
              const isModerate = cs.severity === 'MODERATE';
              return (
                <Card
                  key={cs.id}
                  variant="outlined"
                  className={`rounded-2xl border transition-all flex flex-col justify-between ${
                    isSevere
                      ? 'border-rose-500/40 bg-rose-500/[0.02] ring-1 ring-rose-500/20'
                      : isModerate
                        ? 'border-amber-500/40 bg-amber-500/[0.02]'
                        : 'border-slate-200 dark:border-slate-800'
                  }`}
                  data-testid={`sensitive-case-card-${cs.severity.toLowerCase()}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-[10.5px] font-semibold border ${
                          isSevere
                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                            : isModerate
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {cs.severityLabel}
                      </span>
                      {cs.expertConfirmed && (
                        <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 m-0">
                          Cô Giang Đàm đã duyệt
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0 flex items-center gap-1.5">
                      {isSevere ? (
                        <AlertOctagon size={15} className="text-rose-500 shrink-0" />
                      ) : isModerate ? (
                        <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                      ) : (
                        <Eye size={15} className="text-emerald-500 shrink-0" />
                      )}
                      <span>{cs.name}</span>
                    </h3>

                    {/* Dấu hiệu nhận biết */}
                    <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                        Dấu hiệu nhận diện:
                      </span>
                      <ul className="m-0 p-0 list-none space-y-1">
                        {cs.recognitionSigns.map((sign, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <span className="text-rose-500 font-bold shrink-0">•</span>
                            <span className="leading-tight">{sign}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Biện pháp phòng ngừa */}
                    <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                        Phòng ngừa trước thao tác:
                      </span>
                      <ul className="m-0 p-0 list-none space-y-1">
                        {cs.preventionMeasures.map((prevItem, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <CheckCircle2 size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span className="leading-tight">{prevItem}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Hướng xử lý chuyên môn */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                        Hướng xử lý chuyên môn tức thì:
                      </span>
                      <div
                        className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                          isSevere
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-900 dark:text-rose-200'
                            : isModerate
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200'
                        }`}
                      >
                        {cs.clinicalTreatment.map((treat, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 leading-snug">
                            <span className="font-bold shrink-0">{idx + 1}.</span>
                            <span>{treat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    {cs.escalationRequired ? (
                      <span className="text-[10.5px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertOctagon size={12} />
                        Bắt buộc chuyển y tế
                      </span>
                    ) : (
                      <span className="text-[10.5px] text-slate-400">Xử lý tại chi nhánh</span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCase(cs);
                        caseForm.setFieldsValue({
                          name: cs.name,
                          recognitionSigns: cs.recognitionSigns.join('\n'),
                          preventionMeasures: cs.preventionMeasures.join('\n'),
                          clinicalTreatment: cs.clinicalTreatment.join('\n'),
                        });
                        setIsEditCaseModalOpen(true);
                      }}
                      className="text-xs text-slate-500 hover:text-amber-600 cursor-pointer bg-transparent border-0"
                    >
                      <Edit2 size={12} className="inline mr-1" />
                      Chỉnh sửa
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Quy Trình Khẩn Cấp: Dừng Dịch Vụ & Chuyển Cơ Sở Y Tế (Escalation Protocol) */}
          <div className="p-4 rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-rose-500/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  <AppIcon icon={Stethoscope} size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                    Quy Trình Khẩn Cấp: Dừng Dịch Vụ &amp; Chuyển Cơ Sở Y Tế (Escalation Protocol)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 m-0">
                    Áp dụng khi khách có biểu hiện phản ứng cấp độ 3 hoặc rát giác mạc không thuyên giảm sau 10 phút
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 m-0 flex items-center gap-1">
                  <PhoneCall size={12} />
                  Hotline Y Tế: 1900 8198
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10.5px] font-bold text-rose-600 uppercase">Bước 1: Lệnh Dừng</span>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 m-0">Dừng dịch vụ lập tức</h4>
                <p className="text-[11px] text-slate-500 m-0 leading-normal">
                  KTV hô lệnh dừng ca, gạt bỏ toàn bộ trục silicon và hóa chất. Tuyệt đối không để khách dụi mắt.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10.5px] font-bold text-amber-600 uppercase">Bước 2: Rửa Trôi</span>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 m-0">Rửa NaCl 0.9% 10-15 phút</h4>
                <p className="text-[11px] text-slate-500 m-0 leading-normal">
                  Dùng nước muối sinh lý đẳng trương xả nhẹ từ khóe ra đuôi mắt để hòa tan và đẩy sạch tàn dư thuốc.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10.5px] font-bold text-blue-600 uppercase">Bước 3: Báo Cáo</span>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 m-0">Báo Quản Lý &amp; Chuyên Gia</h4>
                <p className="text-[11px] text-slate-500 m-0 leading-normal">
                  Thông báo ngay Quản lý Đề Thám và Cô Giang Đàm để chuẩn bị phương án chăm sóc và hồ sơ y tế.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10.5px] font-bold text-emerald-600 uppercase">Bước 4: Chuyển Tuyến</span>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 m-0">Chuyển BV Mắt TP.HCM</h4>
                <p className="text-[11px] text-slate-500 m-0 leading-normal">
                  Xe đưa khách tới BV Mắt (280 Điện Biên Phủ, Q.3). Nhân sự Wings đi cùng chi trả viện phí và chăm sóc.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB CONTENT: PART 3 – BIÊN BẢN SỰ CỐ & CHĂM SÓC BỔ SUNG
          ═══════════════════════════════════════════════════════════ */}
      {(activeTab === 'overview' || activeTab === 'part3') && (
        <section className="space-y-4 pt-2" data-testid="safety-part-3-section">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                Phần 3 – Quản trị rủi ro &amp; Chăm sóc
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
                Biên Bản Ghi Nhận Sự Cố &amp; Quy Trình Chăm Sóc Bổ Sung Sau 24h – 48h – 72h
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="primary"
                danger
                icon={<AppIcon icon={Plus} size={13} />}
                onClick={() => {
                  incidentForm.resetFields();
                  incidentForm.setFieldsValue({
                    incidentTime: new Date().toLocaleString('vi-VN'),
                    technicianName: 'Cô Đẫm (KTV)',
                    incidentType: 'STINGING_MILD',
                    status: 'INVESTIGATING',
                  });
                  setIsAddIncidentModalOpen(true);
                }}
                className="text-xs font-medium"
                data-testid="create-incident-btn"
              >
                Tạo Biên Bản Sự Cố Mới
              </Button>
            </div>
          </div>

          {/* Banner Khẳng Định Nguyên Tắc Pilot: 0 Sự Cố Thực Nghiệm */}
          <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <AppIcon icon={ShieldCheck} size={18} />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200 m-0">
                    Nguyên Tắc Thực Nghiệm Pilot: Tỷ Lệ An Toàn Giác Mạc Tuyệt Đối 100%
                  </h4>
                  <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 m-0">
                    Đã đối soát 17 ca
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 m-0 leading-relaxed">
                  Trong toàn bộ 17 ca thực nghiệm Pilot tại chi nhánh Đề Thám do Cô Đẫm phụ trách, hệ thống{' '}
                  <strong className="text-emerald-700 dark:text-emerald-300">
                    chưa ghi nhận bất kỳ trường hợp cay mắt, kích ứng đỏ hay sự cố kỹ thuật nào
                  </strong>
                  . Tuân thủ nguyên tắc mos-lab: không tự tạo dữ liệu sự cố giả mạo; biểu mẫu được chuẩn hóa sẵn sàng tiếp nhận khi có phát sinh.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0 text-right">
              <div>
                <span className="text-[11px] text-slate-500 block">Sự cố phát sinh</span>
                <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  0 ca
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Tỷ lệ an toàn</span>
                <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  100%
                </span>
              </div>
            </div>
          </div>

          {/* Danh Sách Biên Bản Sự Cố / Empty State */}
          {incidents.length === 0 ? (
            <div
              className="p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3 bg-white/40 dark:bg-slate-900/40"
              data-testid="incidents-empty-state"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <AppIcon icon={CheckCircle2} size={24} />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 m-0">
                  Chưa Ghi Nhận Sự Cố Kỹ Thuật Nào
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0 leading-relaxed">
                  Tất cả các ca uốn mi bóng tối trong giai đoạn Pilot đều tuân thủ nghiêm ngặt cữ trục ≥ 0.8mm và đệm
                  hydrogel, không có ca nào phải dừng dịch vụ hoặc chuyển y tế.
                </p>
              </div>
              <Button
                type="dashed"
                size="small"
                icon={<AppIcon icon={Plus} size={12} />}
                onClick={() => {
                  incidentForm.resetFields();
                  incidentForm.setFieldsValue({
                    incidentTime: new Date().toLocaleString('vi-VN'),
                    technicianName: 'Cô Đẫm (KTV)',
                    incidentType: 'STINGING_MILD',
                    status: 'INVESTIGATING',
                  });
                  setIsAddIncidentModalOpen(true);
                }}
                className="text-xs"
              >
                Thử nghiệm lập biên bản sự cố giả định phục vụ đào tạo
              </Button>
            </div>
          ) : (
            <div className="space-y-3" data-testid="incidents-list">
              {incidents.map((inc) => (
                <Card
                  key={inc.id}
                  variant="outlined"
                  className="rounded-2xl border border-rose-500/30 hover:shadow-md transition-all p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 m-0">
                          {inc.code}
                        </span>
                        <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 m-0">
                          {inc.incidentTypeLabel}
                        </span>
                        <span className="text-xs text-slate-500 tabular-nums">{inc.incidentTime}</span>
                        {inc.sessionCode && (
                          <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 m-0">
                            {inc.sessionCode}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                        Khách hàng: {inc.customerName} ({inc.customerPhone}) · KTV phụ trách: {inc.technicianName}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold border m-0 ${
                          inc.status === 'RESOLVED'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : inc.status === 'TRANSFERRED_MEDICAL'
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {inc.status === 'RESOLVED'
                          ? 'Đã xử lý & Ổn định'
                          : inc.status === 'TRANSFERRED_MEDICAL'
                            ? 'Đã chuyển y tế'
                            : 'Đang theo dõi chăm sóc'}
                      </span>
                      <Button
                        size="small"
                        onClick={() => setSelectedIncidentDetail(inc)}
                        className="text-xs"
                      >
                        Chi tiết biên bản
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 block">Tình trạng phát sinh:</span>
                      <p className="text-slate-700 dark:text-slate-300 m-0 leading-relaxed">{inc.description}</p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 block">Phương án xử lý tại chỗ:</span>
                      <p className="text-slate-700 dark:text-slate-300 m-0 leading-relaxed">{inc.immediateAction}</p>
                    </div>
                  </div>

                  {/* Lộ Trình Theo Dõi & Chăm Sóc Bổ Sung (24h - 48h - 72h) */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                      Tiến độ theo dõi &amp; Chăm sóc sau sự cố:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* 24h */}
                      <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Sau 24 giờ</span>
                          {inc.followUp24h ? (
                            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 m-0">Đã cập nhật</span>
                          ) : (
                            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 m-0">Chờ theo dõi</span>
                          )}
                        </div>
                        {inc.followUp24h ? (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 m-0">
                            {inc.followUp24h.condition} ({inc.followUp24h.recordedAt})
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateFollowUp(inc.id, '24h', 'Liên hệ khách: mắt đã hết the cay, thị lực bình thường.')
                            }
                            className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer bg-transparent border-0 p-0"
                          >
                            + Ghi nhận tình trạng 24h
                          </button>
                        )}
                      </div>

                      {/* 48h */}
                      <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Sau 48 giờ</span>
                          {inc.followUp48h ? (
                            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 m-0">Đã cập nhật</span>
                          ) : (
                            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 m-0">Chờ theo dõi</span>
                          )}
                        </div>
                        {inc.followUp48h ? (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 m-0">
                            {inc.followUp48h.condition} ({inc.followUp48h.recordedAt})
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateFollowUp(inc.id, '48h', 'Khách xác nhận mắt khỏe, mi cong bóng đẹp tự nhiên.')
                            }
                            className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer bg-transparent border-0 p-0"
                          >
                            + Ghi nhận tình trạng 48h
                          </button>
                        )}
                      </div>

                      {/* 72h */}
                      <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Sau 72 giờ</span>
                          {inc.followUp72h ? (
                            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 m-0">Hoàn tất</span>
                          ) : (
                            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 m-0">Chờ theo dõi</span>
                          )}
                        </div>
                        {inc.followUp72h ? (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 m-0">
                            {inc.followUp72h.condition} ({inc.followUp72h.recordedAt})
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateFollowUp(inc.id, '72h', 'Đóng ca theo dõi an toàn: Khách hoàn toàn bình phục.')
                            }
                            className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer bg-transparent border-0 p-0"
                          >
                            + Kết luận &amp; Đóng ca 72h
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB CONTENT: DRAFT SOP & SCALE SUBMISSION
          ═══════════════════════════════════════════════════════════ */}
      {(activeTab === 'overview' || activeTab === 'draft') && (
        <section className="space-y-4 pt-2" data-testid="safety-draft-sop-section">
          <div className="p-5 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-slate-500/5 to-transparent space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-500/20">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                  Tài liệu pháp quy nội bộ · Bản dự thảo
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
                  Dự Thảo SOP Hạng Mục 4 – Quản Trị An Toàn, Rủi Ro &amp; Xử Lý Sự Cố
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold border m-0 ${
                    isExpertApproved
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  }`}
                >
                  {isExpertApproved ? 'ĐÃ THẨM ĐỊNH CHUYÊN MÔN' : 'CHỜ THẨM ĐỊNH'}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <p className="m-0">
                <strong>1. Căn cứ ban hành:</strong> Căn cứ dữ liệu thực nghiệm 17 ca Pilot Uốn Mi Bóng Tối tại chi nhánh
                Đề Thám (chuyên viên Cô Đẫm thực hiện), không phát sinh bất kỳ ca kích ứng hay rủi ro giác mạc nào.
              </p>
              <p className="m-0">
                <strong>2. Chuyên môn y tế:</strong> Nội dung bảo vệ niêm mạc mắt và hướng dẫn xử lý phản ứng nhạy cảm do{' '}
                <strong>Cô Giang Đàm</strong> trực tiếp biên soạn và xác nhận tính an toàn sinh học.
              </p>
              <p className="m-0">
                <strong>3. Quy chế phê duyệt:</strong> Bản dự thảo này được tổng hợp để Project Owner và Cô Giang Đàm
                thẩm định chuyên môn trước khi trình CEO Wings phê duyệt mở rộng quy mô (Scale-up) toàn chuỗi.
              </p>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 font-semibold text-xs flex items-center gap-2">
                <AppIcon icon={AlertTriangle} size={15} className="text-amber-600 shrink-0" />
                <span>Tuyệt đối không tự động ban hành SOP ra toàn hệ thống khi chưa có chữ ký phê duyệt của CEO.</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-500 block">Ý kiến thẩm định của Cô Giang Đàm:</span>
                <p className="text-slate-800 dark:text-slate-200 font-medium m-0 italic">
                  &ldquo;{expertNote}&rdquo;
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="small"
                  onClick={handlePrintSop}
                  icon={<AppIcon icon={Printer} size={13} />}
                >
                  In tài liệu
                </Button>
                <Button
                  type="primary"
                  size="small"
                  onClick={() => {
                    setIsExpertApproved(true);
                    message.success('Đã xác nhận thẩm định chuyên môn của Cô Giang Đàm!');
                  }}
                  disabled={isExpertApproved}
                >
                  {isExpertApproved ? 'Đã hoàn tất thẩm định' : 'Thẩm định & Ký số'}
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL 1: TẠO BIÊN BẢN SỰ CỐ MỚI
          ═══════════════════════════════════════════════════════════ */}
      <AdaptiveModal
        open={isAddIncidentModalOpen}
        onCancel={() => setIsAddIncidentModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-rose-600 font-bold">
            <AppIcon icon={ShieldAlert} size={18} />
            <span>Biểu Mẫu Ghi Nhận Sự Cố &amp; Kế Hoạch Chăm Sóc Bổ Sung</span>
          </div>
        }
        footer={null}
        intent="form"
        destroyOnHidden
      >
        <Form
          form={incidentForm}
          layout="vertical"
          onFinish={handleCreateIncident}
          className="space-y-3 pt-2"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Form.Item
              name="incidentTime"
              label="Thời gian phát sinh"
              rules={[{ required: true, message: 'Vui lòng nhập thời gian' }]}
            >
              <Input placeholder="VD: 27/10/2026 14:30" />
            </Form.Item>

            <Form.Item
              name="technicianName"
              label="Chuyên Viên Kỹ Thuật phụ trách"
              rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập KTV' }]}
            >
              <Input placeholder="Cô Đẫm (KTV)" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Form.Item
              name="customerName"
              label="Họ tên Khách hàng"
              rules={[{ required: true, message: 'Vui lòng nhập họ tên khách' }]}
            >
              <Input placeholder="VD: Chị Minh Anh" />
            </Form.Item>

            <Form.Item name="customerPhone" label="Số điện thoại khách">
              <Input placeholder="VD: 0987 654 321" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Form.Item
              name="incidentType"
              label="Phân loại sự cố"
              rules={[{ required: true, message: 'Vui lòng chọn loại sự cố' }]}
            >
              <Select
                options={[
                  { value: 'STINGING_MILD', label: 'Cấp 1 – Cay mắt & chảy nước mắt nhẹ' },
                  { value: 'IRRITATION_MODERATE', label: 'Cấp 2 – Kích ứng đỏ bờ mi / rát nhẹ' },
                  { value: 'ALLERGIC_SEVERE', label: 'Cấp 3 – Phản ứng dị ứng cấp (Chuyển y tế)' },
                  { value: 'TECHNICAL_OTHER', label: 'Sự cố kỹ thuật uốn mi khác' },
                ]}
              />
            </Form.Item>

            <Form.Item name="sessionId" label="Ca dịch vụ liên kết (Nếu có)">
              <Select
                allowClear
                placeholder="Chọn ca Pilot liên kết"
                options={[
                  ...sessions.map((s) => ({
                    value: s.id,
                    label: `Ca #${s.id} - ${s.customerName} (${s.sessionDate})`,
                  })),
                  { value: 999, label: 'Ca dịch vụ mới ngoài danh sách Pilot' },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="description"
            label="Mô tả chi tiết tình trạng phát sinh"
            rules={[{ required: true, message: 'Vui lòng mô tả chi tiết biểu hiện của mắt' }]}
          >
            <TextArea
              rows={3}
              placeholder="VD: Khách có biểu hiện chớp mắt liên tục ở phút thứ 12 của bước ủ thuốc số 1, khóe mắt chảy nước mắt nhẹ..."
            />
          </Form.Item>

          <Form.Item
            name="immediateAction"
            label="Phương án xử lý tại chỗ đã thực hiện"
            rules={[{ required: true, message: 'Vui lòng nhập phương án xử lý đã áp dụng' }]}
          >
            <TextArea
              rows={2}
              placeholder="VD: Gạt sạch thuốc ở góc khóe mắt, dùng tăm bông khô thấm hút, nhỏ 2 giọt nước muối sinh lý NaCl 0.9% và bật quạt gió 30s..."
            />
          </Form.Item>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Form.Item name="status" label="Trạng thái xử lý ban đầu">
              <Select
                options={[
                  { value: 'INVESTIGATING', label: 'Đang theo dõi tại chi nhánh' },
                  { value: 'STABILIZED', label: 'Đã ổn định sau khi sơ cứu' },
                  { value: 'TRANSFERRED_MEDICAL', label: 'Chuyển viện mắt chuyên khoa' },
                ]}
              />
            </Form.Item>

            <Form.Item name="followUp24h" label="Kế hoạch chăm sóc sau 24h">
              <Input placeholder="VD: Điện thoại hỏi thăm tình trạng mắt và độ cong mi" />
            </Form.Item>
          </div>

          <Form.Item name="compensationNote" label="Ghi chú bồi hoàn / voucher chăm sóc bổ sung">
            <Input placeholder="VD: Tặng lọ nước mắt nhân tạo và voucher dưỡng mi miễn phí" />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button onClick={() => setIsAddIncidentModalOpen(false)}>Hủy bỏ</Button>
            <Button type="primary" danger htmlType="submit">
              Lưu Biên Bản Sự Cố
            </Button>
          </div>
        </Form>
      </AdaptiveModal>

      {/* ═══════════════════════════════════════════════════════════
          MODAL 2: ĐÍNH KÈM TÀI LIỆU SOP
          ═══════════════════════════════════════════════════════════ */}
      <AdaptiveModal
        open={isAddAttachmentModalOpen}
        onCancel={() => setIsAddAttachmentModalOpen(false)}
        title="Đính Kèm Tài Liệu Hướng Dẫn / Hình Ảnh SOP An Toàn"
        footer={null}
        intent="form"
        destroyOnHidden
      >
        <Form
          form={attachmentForm}
          layout="vertical"
          onFinish={handleAddAttachment}
          className="space-y-3 pt-2"
        >
          <Form.Item
            name="name"
            label="Tên tài liệu / Tệp hình ảnh"
            rules={[{ required: true, message: 'Vui lòng nhập tên tệp' }]}
          >
            <Input placeholder="VD: So-do-khoang-cach-dem-hydrogel-v1.png" />
          </Form.Item>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Form.Item name="category" label="Phân loại tài liệu">
              <Select
                options={[
                  { value: 'Sơ đồ kỹ thuật', label: 'Sơ đồ kỹ thuật' },
                  { value: 'Hình ảnh hướng dẫn', label: 'Hình ảnh hướng dẫn' },
                  { value: 'Quy chuẩn vệ sinh', label: 'Quy chuẩn vệ sinh' },
                  { value: 'Y văn / Khuyến cáo y tế', label: 'Y văn / Khuyến cáo y tế' },
                ]}
              />
            </Form.Item>

            <Form.Item name="format" label="Định dạng">
              <Select
                options={[
                  { value: 'PDF', label: 'PDF Document' },
                  { value: 'PNG', label: 'PNG Image' },
                  { value: 'DOCX', label: 'Word Document' },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item name="uploadedBy" label="Người đính kèm / Chuyên gia">
            <Input placeholder="Cô Giang Đàm" />
          </Form.Item>

          <Form.Item name="description" label="Ghi chú mô tả nội dung tài liệu">
            <TextArea rows={2} placeholder="Mô tả tóm tắt mục đích sử dụng trong đào tạo KTV..." />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button onClick={() => setIsAddAttachmentModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Đính Kèm Tài Liệu
            </Button>
          </div>
        </Form>
      </AdaptiveModal>

      {/* ═══════════════════════════════════════════════════════════
          MODAL 3: CHỈNH SỬA QUY TẮC GIAI ĐOẠN (PHẦN 1)
          ═══════════════════════════════════════════════════════════ */}
      <AdaptiveModal
        open={isEditStageModalOpen}
        onCancel={() => {
          setIsEditStageModalOpen(false);
          setEditingStage(null);
        }}
        title={`Chỉnh Sửa Quy Tắc Bảo Vệ Niêm Mạc (${editingStage?.stageName})`}
        footer={null}
        intent="form"
        destroyOnHidden
      >
        <Form
          form={stageForm}
          layout="vertical"
          onFinish={handleSaveStageRule}
          className="space-y-3 pt-2"
        >
          <Form.Item
            name="title"
            label="Tiêu đề quy tắc"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả nguyên lý an toàn"
            rules={[{ required: true, message: 'Vui lòng nhập mô tả' }]}
          >
            <TextArea rows={2} />
          </Form.Item>

          <Form.Item
            name="actions"
            label="Các thao tác bắt buộc (Mỗi dòng một thao tác)"
            rules={[{ required: true, message: 'Vui lòng nhập các thao tác' }]}
          >
            <TextArea rows={4} placeholder="Nhập mỗi dòng một thao tác bắt buộc..." />
          </Form.Item>

          <Form.Item name="warningNote" label="Cảnh báo đặc biệt (Lưu ý an toàn)">
            <Input />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button onClick={() => setIsEditStageModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Lưu Quy Tắc
            </Button>
          </div>
        </Form>
      </AdaptiveModal>

      {/* ═══════════════════════════════════════════════════════════
          MODAL 4: CHỈNH SỬA TÌNH HUỐNG NHẠY CẢM (PHẦN 2)
          ═══════════════════════════════════════════════════════════ */}
      <AdaptiveModal
        open={isEditCaseModalOpen}
        onCancel={() => {
          setIsEditCaseModalOpen(false);
          setEditingCase(null);
        }}
        title={`Chỉnh Sửa Chuyên Môn Tình Huống (${editingCase?.name})`}
        footer={null}
        intent="form"
        destroyOnHidden
      >
        <Form
          form={caseForm}
          layout="vertical"
          onFinish={handleSaveSensitiveCase}
          className="space-y-3 pt-2"
        >
          <Form.Item
            name="name"
            label="Tên tình huống nhạy cảm"
            rules={[{ required: true, message: 'Vui lòng nhập tên tình huống' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="recognitionSigns"
            label="Dấu hiệu nhận biết (Mỗi dòng một dấu hiệu)"
            rules={[{ required: true, message: 'Vui lòng nhập dấu hiệu' }]}
          >
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="preventionMeasures"
            label="Biện pháp phòng ngừa (Mỗi dòng một biện pháp)"
            rules={[{ required: true, message: 'Vui lòng nhập biện pháp phòng ngừa' }]}
          >
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="clinicalTreatment"
            label="Hướng xử lý chuyên môn tức thì (Mỗi dòng một bước)"
            rules={[{ required: true, message: 'Vui lòng nhập hướng xử lý' }]}
          >
            <TextArea rows={4} />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button onClick={() => setIsEditCaseModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Lưu Chuyên Môn
            </Button>
          </div>
        </Form>
      </AdaptiveModal>

      {/* ═══════════════════════════════════════════════════════════
          MODAL 5: XEM CHI TIẾT BIÊN BẢN SỰ CỐ
          ═══════════════════════════════════════════════════════════ */}
      <AdaptiveModal
        open={Boolean(selectedIncidentDetail)}
        onCancel={() => setSelectedIncidentDetail(null)}
        title={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
              {selectedIncidentDetail?.code}
            </span>
            <span>Chi Tiết Biên Bản Sự Cố An Toàn Giác Mạc</span>
          </div>
        }
        footer={null}
        intent="detail"
      >
        {selectedIncidentDetail && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <div>
                <span className="text-slate-500 block">Khách hàng:</span>
                <strong className="text-sm">{selectedIncidentDetail.customerName}</strong>
                <div className="text-slate-400">{selectedIncidentDetail.customerPhone}</div>
              </div>
              <div>
                <span className="text-slate-500 block">Chuyên Viên Kỹ Thuật phụ trách:</span>
                <strong className="text-sm">{selectedIncidentDetail.technicianName}</strong>
                <div className="text-slate-400">Thời gian: {selectedIncidentDetail.incidentTime}</div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">Mô tả tình trạng:</span>
              <p className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 m-0 leading-relaxed">
                {selectedIncidentDetail.description}
              </p>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">Xử lý tại chỗ:</span>
              <p className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 m-0 leading-relaxed">
                {selectedIncidentDetail.immediateAction}
              </p>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">Lịch sử theo dõi sau sự cố:</span>
              <div className="space-y-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                  <strong>24h:</strong> {selectedIncidentDetail.followUp24h?.condition || 'Chưa ghi nhận'}
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-800 dark:text-blue-300">
                  <strong>48h:</strong> {selectedIncidentDetail.followUp48h?.condition || 'Chưa ghi nhận'}
                </div>
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-800 dark:text-purple-300">
                  <strong>72h:</strong> {selectedIncidentDetail.followUp72h?.condition || 'Chưa ghi nhận'}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button onClick={() => setSelectedIncidentDetail(null)}>Đóng</Button>
            </div>
          </div>
        )}
      </AdaptiveModal>
    </div>
  );
}

export default PilotSafetyRiskSopDetail;
