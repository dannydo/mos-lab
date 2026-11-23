import type {
  FollowUpMilestone,
  IncidentType,
  SafetyAttachment,
  SafetyControlPoint,
  SafetyStageRule,
  SensitiveReactionCase,
} from './safety-risk-types';

export const DEFAULT_EXPERT_APPROVAL_NOTE =
  'Đã thẩm định 3 phần: Quy tắc bảo vệ niêm mạc, Quy trình nhận diện phản ứng & Biểu mẫu biên bản sự cố. Đủ điều kiện đưa vào hồ sơ trình CEO phê duyệt Scale-up.';

export const INCIDENT_TYPE_LABEL_MAP: Record<IncidentType, string> = {
  STINGING_MILD: 'Cay mắt nhẹ',
  IRRITATION_MODERATE: 'Kích ứng đỏ bờ mi',
  ALLERGIC_SEVERE: 'Phản ứng dị ứng cấp',
  TECHNICAL_OTHER: 'Sự cố kỹ thuật khác',
};

export function buildIncidentCode(nextIndex: number): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const seq = nextIndex.toString().padStart(3, '0');
  return `INC-${year}${month}${day}-${seq}`;
}

export function splitLinesToArray(value: string | string[]): string[] {
  return typeof value === 'string' ? value.split('\n').filter(Boolean) : value;
}

// -------------------------------------------------------------
// INITIAL DEFAULT DATA (THEO THỰC NGHIỆM PILOT 17 CA CÔ GIANG ĐÀM)
// -------------------------------------------------------------
export const INITIAL_STAGE_RULES: SafetyStageRule[] = [
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
    warningNote:
      'Nếu mép pad cộm vào mắt khiến khách chớp nhiều, lập tức bóc dán lại nhẹ nhàng, không để khách chịu đựng.',
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
    warningNote:
      'Dặn dò khách không dụi mắt trong 24 giờ đầu và kiêng nước trực tiếp lên mắt trong vòng 6 giờ sau dịch vụ.',
  },
];

export const INITIAL_SAFETY_CONTROL_POINTS: SafetyControlPoint[] = [
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

export const INITIAL_SAFETY_ATTACHMENTS: SafetyAttachment[] = [
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

export const INITIAL_SENSITIVE_CASES: SensitiveReactionCase[] = [
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

export interface EscalationProtocolStep {
  stepLabel: string;
  labelColorClass: string;
  title: string;
  description: string;
}

export const ESCALATION_PROTOCOL_STEPS: EscalationProtocolStep[] = [
  {
    stepLabel: 'Bước 1: Lệnh Dừng',
    labelColorClass: 'text-rose-600',
    title: 'Dừng dịch vụ lập tức',
    description: 'KTV hô lệnh dừng ca, gạt bỏ toàn bộ trục silicon và hóa chất. Tuyệt đối không để khách dụi mắt.',
  },
  {
    stepLabel: 'Bước 2: Rửa Trôi',
    labelColorClass: 'text-amber-600',
    title: 'Rửa NaCl 0.9% 10-15 phút',
    description: 'Dùng nước muối sinh lý đẳng trương xả nhẹ từ khóe ra đuôi mắt để hòa tan và đẩy sạch tàn dư thuốc.',
  },
  {
    stepLabel: 'Bước 3: Báo Cáo',
    labelColorClass: 'text-blue-600',
    title: 'Báo Quản Lý & Chuyên Gia',
    description: 'Thông báo ngay Quản lý Đề Thám và Cô Giang Đàm để chuẩn bị phương án chăm sóc và hồ sơ y tế.',
  },
  {
    stepLabel: 'Bước 4: Chuyển Tuyến',
    labelColorClass: 'text-emerald-600',
    title: 'Chuyển BV Mắt TP.HCM',
    description:
      'Xe đưa khách tới BV Mắt (280 Điện Biên Phủ, Q.3). Nhân sự Wings đi cùng chi trả viện phí và chăm sóc.',
  },
];

export interface FollowUpMilestoneMeta {
  milestone: FollowUpMilestone;
  field: 'followUp24h' | 'followUp48h' | 'followUp72h';
  title: string;
  doneBadge: string;
  actionLabel: string;
  defaultCondition: string;
}

export const FOLLOW_UP_MILESTONE_META: FollowUpMilestoneMeta[] = [
  {
    milestone: '24h',
    field: 'followUp24h',
    title: 'Sau 24 giờ',
    doneBadge: 'Đã cập nhật',
    actionLabel: '+ Ghi nhận tình trạng 24h',
    defaultCondition: 'Liên hệ khách: mắt đã hết the cay, thị lực bình thường.',
  },
  {
    milestone: '48h',
    field: 'followUp48h',
    title: 'Sau 48 giờ',
    doneBadge: 'Đã cập nhật',
    actionLabel: '+ Ghi nhận tình trạng 48h',
    defaultCondition: 'Khách xác nhận mắt khỏe, mi cong bóng đẹp tự nhiên.',
  },
  {
    milestone: '72h',
    field: 'followUp72h',
    title: 'Sau 72 giờ',
    doneBadge: 'Hoàn tất',
    actionLabel: '+ Kết luận & Đóng ca 72h',
    defaultCondition: 'Đóng ca theo dõi an toàn: Khách hoàn toàn bình phục.',
  },
];
