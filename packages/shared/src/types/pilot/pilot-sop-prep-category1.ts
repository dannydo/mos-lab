// ═══════════════════════════════════════════
// SOP Preparation - Category 1: Clinical Data Collection & 5 Criteria Evidence (MOS-FEAT-176)
// ═══════════════════════════════════════════

export type SopPrepFileType = 'image' | 'video' | 'document' | 'other';

export interface SopPrepEvidenceFile {
  id: string;
  name: string;
  url: string;
  fileType: SopPrepFileType;
  mimeType: string;
  sizeBytes: number;
  description: string;
  sourceOrigin: string; // Nguồn gốc (e.g. Ca Pilot thực tế, Tài liệu đào tạo...)
  pilotSessionCode?: string; // Mã ca Pilot (e.g. PILOT-001)
  uploadedBy: string;
  uploadedAt: string;
}

export interface SopPrepCriterionData {
  id: number;
  criterionKey: string;
  name: string;
  order: number;
  expertiseKnowledge: string; // A. Kiến thức chuyên môn
  practicalMethod: string; // B. Phương pháp thực hành
  evaluationGrounds: string; // C. Căn cứ đánh giá
  status: 'DRAFT_UNVERIFIED' | 'VERIFIED' | 'APPROVED';
  statusLabel: string;
  updatedBy: string;
  updatedAt: string;
  evidenceFiles: SopPrepEvidenceFile[];
}

export interface SopPreparationCategory1Document {
  categoryNumber: 1;
  categoryTitle: string;
  objective: string;
  owner: string;
  status: 'NOT_COLLECTED' | 'COLLECTING' | 'DRAFT_COMPLETED';
  statusLabel: string;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
  criteria: SopPrepCriterionData[];
}

export interface SaveSopPrepCategory1Request {
  pilotCode?: string;
  status?: 'NOT_COLLECTED' | 'COLLECTING' | 'DRAFT_COMPLETED';
  statusLabel?: string;
  lastUpdatedBy?: string;
  criteria?: SopPrepCriterionData[];
}

export interface SaveSopPrepCriterionRequest {
  pilotCode?: string;
  expertiseKnowledge?: string;
  practicalMethod?: string;
  evaluationGrounds?: string;
  status?: 'DRAFT_UNVERIFIED' | 'VERIFIED' | 'APPROVED';
  updatedBy?: string;
  evidenceFiles?: SopPrepEvidenceFile[];
}

export interface UploadSopPrepEvidenceRequest {
  fileData: string; // base64
  fileName: string;
  mimeType: string;
  description?: string;
  sourceOrigin?: string;
  pilotSessionCode?: string;
  criterionId: number;
  uploadedBy?: string;
}

export const DEFAULT_SOP_PREPARATION_CATEGORY_1: SopPreparationCategory1Document = {
  categoryNumber: 1,
  categoryTitle: 'Hạng mục 1 – Kiểm tra & Đánh giá tình trạng mi thật',
  objective:
    'Thu thập thông tin về tình trạng mi thật của khách hàng, làm cơ sở xác định khách đủ hay không đủ điều kiện thực hiện dịch vụ Uốn Mi Bóng Tối.',
  owner: 'Cô Giang Phạm',
  status: 'COLLECTING',
  statusLabel: 'Bản nháp – Chưa kiểm chứng',
  lastUpdatedBy: 'Cô Giang Phạm',
  lastUpdatedAt: '2026-10-28T09:00:00.000Z',
  criteria: [
    {
      id: 1,
      criterionKey: 'length',
      name: 'Độ dài mi',
      order: 1,
      expertiseKnowledge:
        'Chiều dài sợi mi quyết định trực tiếp diện tích tiếp xúc với bề mặt trục silicon uốn mi. Cấu trúc sinh học sợi mi phát triển qua 3 chu kỳ: Anagen (tăng trưởng), Catagen (thoái triển) và Telogen (nghỉ). Sợi mi đạt chuẩn uốn bóng tối cần đạt chiều dài tối thiểu để ôm trọn đường cong đỉnh của trục, chịu được lực căng kéo của sáp bắt mi mà không bị tuột sợi hoặc bật ngọn.',
      practicalMethod:
        '1. Đặt cữ thước đo mi chuyên dụng (hoặc cạnh trục silicon uốn cỡ S/M) vuông góc với bờ mi tại điểm trung tâm mắt và hai bên khóe/đuôi mắt.\n2. Quan sát độ vươn của sợi mi: ngọn mi phải vượt qua điểm cong đỉnh của trục uốn tối thiểu 2mm khi miết mi lên trục.\n3. Đánh giá tính đồng đều chiều dài giữa các phân vùng mắt (đầu mắt - thân giữa - đuôi mắt).',
      evaluationGrounds:
        '• ĐẠT (PASS): Chiều dài mi đo được ≥ 8.0mm tại vùng trung tâm mí mắt; sợi mi ôm qua ít nhất 2/3 bề mặt trục silicon cỡ S/M, không bật ngọn.\n• KHÔNG ĐẠT (FAIL): Chiều dài sợi mi < 8.0mm, mi quá ngắn hoặc bị cắt tỉa, chỉ dính được phần chân mi, nguy cơ tuột sợi và lem hóa chất vào giác mạc.',
      status: 'DRAFT_UNVERIFIED',
      statusLabel: 'Bản nháp – Chưa kiểm chứng',
      updatedBy: 'Cô Giang Phạm',
      updatedAt: '2026-10-28T09:00:00.000Z',
      evidenceFiles: [
        {
          id: 'ev-length-01',
          name: 'minh-chung-do-dai-mi-pilot-01.jpg',
          url: '/api/pilot/media/ea735600-d100-4749-9db8-54405430e956.jpg',
          fileType: 'image',
          mimeType: 'image/jpeg',
          sizeBytes: 245120,
          description: 'Ảnh thước đo mi hiển thị sợi mi khách hàng đạt 9.5mm tại ca Pilot 01.',
          sourceOrigin: 'Ca Pilot thực tế',
          pilotSessionCode: 'PILOT-001',
          uploadedBy: 'Cô Giang Phạm',
          uploadedAt: '2026-10-28T09:15:00.000Z',
        },
      ],
    },
    {
      id: 2,
      criterionKey: 'thickness',
      name: 'Độ dày sợi mi',
      order: 2,
      expertiseKnowledge:
        'Độ dày sợi mi phản ánh mật độ keratin bó sợi và đường kính thân mi (dao động từ 0.05mm đến 0.15mm+). Cấu trúc vỏ sợi mi (Cortex) chứa các bó protein keratin liên kết disunfua; sợi mi càng dày thì lớp biểu bì (Cuticle) càng xếp khít, đòi hỏi thời gian làm mềm bằng Thuốc uốn số 1 dài hơn để hoạt chất thẩm thấu đồng nhất.',
      practicalMethod:
        '1. Soi cấu trúc sợi mi dưới kính lúp chuyên dụng phóng đại ≥ 5x kèm ánh sáng chuẩn trắng.\n2. Dùng nhíp gắp đầu nhọn kẹp nhẹ thân sợi mi, cảm nhận độ cứng vững và độ thô ráp.\n3. Phân loại đường kính vào 3 nhóm chuẩn: Mi mảnh (0.05 - 0.07mm), Mi trung bình (0.10 - 0.12mm), Mi sợi dày cứng/thô (0.15mm+).',
      evaluationGrounds:
        '• ĐẠT (PASS): Sợi mi có đường kính từ 0.07mm trở lên, thân mi cứng cáp đồng đều, lớp biểu bì nguyên vẹn, đáp ứng tốt với phác đồ ủ thuốc 12-16 phút.\n• KHÔNG ĐẠT (FAIL): Mi tơ quá mỏng manh (< 0.05mm) không đủ lực nâng form hoặc sợi mi teo nhỏ bất thường do thiếu dưỡng chất.',
      status: 'DRAFT_UNVERIFIED',
      statusLabel: 'Bản nháp – Chưa kiểm chứng',
      updatedBy: 'Cô Giang Phạm',
      updatedAt: '2026-10-28T09:00:00.000Z',
      evidenceFiles: [
        {
          id: 'ev-thickness-01',
          name: 'soi-do-day-soi-mi-pilot-03.jpg',
          url: '/api/pilot/media/1f7ce362-702c-497b-b169-50008332e018.jpg',
          fileType: 'image',
          mimeType: 'image/jpeg',
          sizeBytes: 312400,
          description: 'Hình ảnh soi sợi mi trung bình 0.10mm có độ đanh chắc lý tưởng.',
          sourceOrigin: 'Ca Pilot thực tế',
          pilotSessionCode: 'PILOT-003',
          uploadedBy: 'Cô Giang Phạm',
          uploadedAt: '2026-10-28T09:20:00.000Z',
        },
      ],
    },
    {
      id: 3,
      criterionKey: 'density',
      name: 'Mật độ mi',
      order: 3,
      expertiseKnowledge:
        'Mật độ mi là tổng số lượng sợi mi phân bổ trên bờ mi trên (thông thường từ 90 đến 150 sợi phân bổ trên 2-3 tầng mi tự nhiên). Mật độ đồng đều từ khóe mắt đến đuôi mắt là điều kiện tiên quyết để tạo hiệu ứng "bóng tối" sâu thẳm, liền mạch sau khi phủ sắc tố đen tuyền Deep Black Tint.',
      practicalMethod:
        '1. Dùng cọ chải mi tơi xốp, nâng nhẹ mí trên của khách lên góc 15 độ để lộ rõ hàng chân mi.\n2. Rà soát dọc bờ mi theo 3 khu vực: 1/3 đầu mắt, 1/3 giữa mắt, 1/3 đuôi mắt.\n3. Kiểm tra các khoảng hở (gap), sẹo bờ mi hoặc vùng thưa thớt cục bộ.',
      evaluationGrounds:
        '• ĐẠT (PASS): Mật độ phân bổ tương đối đồng đều (≥ 80 sợi trên một mí trên), không có khoảng trống bờ mi lớn hơn 3mm liên tục.\n• KHÔNG ĐẠT (FAIL): Mi quá thưa thớt cục bộ, rụng từng mảng (Alopecia), bờ mi có khoảng trống trơ trụi khiến hiệu ứng uốn không đạt thẩm mỹ.',
      status: 'DRAFT_UNVERIFIED',
      statusLabel: 'Bản nháp – Chưa kiểm chứng',
      updatedBy: 'Cô Giang Phạm',
      updatedAt: '2026-10-28T09:00:00.000Z',
      evidenceFiles: [
        {
          id: 'ev-density-01',
          name: 'mat-do-mi-deu-pilot-05.jpg',
          url: '/api/pilot/media/0d7a30c5-22ec-48e2-bafe-10085da19bdb.jpg',
          fileType: 'image',
          mimeType: 'image/jpeg',
          sizeBytes: 288700,
          description: 'Ảnh chụp cận bờ mi 2 tầng đều đặn, mật độ trên 110 sợi.',
          sourceOrigin: 'Ca Pilot thực tế',
          pilotSessionCode: 'PILOT-005',
          uploadedBy: 'Cô Giang Phạm',
          uploadedAt: '2026-10-28T09:25:00.000Z',
        },
      ],
    },
    {
      id: 4,
      criterionKey: 'condition',
      name: 'Tình trạng sợi mi',
      order: 4,
      expertiseKnowledge:
        'Tình trạng sợi mi thể hiện sức khỏe sinh học của thân mi và nang lông bờ mi. Sợi mi từng qua nối mi sai kỹ thuật hoặc uốn cháy quéo thường bị tổn thương lớp biểu bì Cuticle, sợi mi bị xốp rỗng, mất độ ẩm và giòn gãy. Việc uốn hóa chất lên sợi mi đang hư tổn nghiêm trọng có thể gây đứt rụng vĩnh viễn.',
      practicalMethod:
        '1. Quan sát ngọn mi dưới đèn kính lúp xem có hiện tượng quéo sun, chẻ đôi, hoặc gãy gập góc hay không.\n2. Dùng que gạt vuốt nhẹ kiểm tra độ bám của chân mi vào nang lông, đảm bảo không rụng bất thường.\n3. Kiểm tra vùng da bờ mi, đảm bảo hoàn toàn sạch sẽ, không viêm đỏ (Blepharitis), không có gàu hay bã nhờn nang mi.',
      evaluationGrounds:
        '• ĐẠT (PASS): Thân mi nguyên bản khỏe mạnh, bóng mượt tự nhiên, ngọn mi nhọn thon, bờ mi sạch khỏe không kích ứng.\n• KHÔNG ĐẠT (FAIL): Mi bị cháy quéo ngọn do uốn sai trước đó, mi khô giòn dễ gãy, hoặc phát hiện dấu hiệu viêm bờ mi, mắt đỏ.',
      status: 'DRAFT_UNVERIFIED',
      statusLabel: 'Bản nháp – Chưa kiểm chứng',
      updatedBy: 'Cô Giang Phạm',
      updatedAt: '2026-10-28T09:00:00.000Z',
      evidenceFiles: [
        {
          id: 'ev-condition-01',
          name: 'kiem-tra-tinh-trang-soi-mi-pilot-02.jpg',
          url: '/api/pilot/media/85a596d9-d6ca-426c-8990-131677ddeb09.jpg',
          fileType: 'image',
          mimeType: 'image/jpeg',
          sizeBytes: 310500,
          description: 'Ảnh chụp sợi mi bóng khỏe tự nhiên, biểu bì khép chặt chưa qua hóa chất.',
          sourceOrigin: 'Ca Pilot thực tế',
          pilotSessionCode: 'PILOT-002',
          uploadedBy: 'Cô Giang Phạm',
          uploadedAt: '2026-10-28T09:30:00.000Z',
        },
      ],
    },
    {
      id: 5,
      criterionKey: 'form_capability',
      name: 'Khả năng tạo form',
      order: 5,
      expertiseKnowledge:
        'Khả năng tạo form là độ đàn hồi (Elasticity) và sức căng hồi phục của sợi mi khi bị uốn cong theo bề mặt trục silicon. Sợi mi có liên kết disunfua bền vững sẽ ôm sát đường cong trục và giữ nếp sóng nảy bền lâu sau khi được khóa bằng Thuốc định hình số 2 và nuôi dưỡng bằng Keratin thủy phân.',
      practicalMethod:
        '1. Dùng que gạt gạt nhẹ một nhóm sợi mi áp sát vào bề mặt trục silicon cỡ M.\n2. Thả que gạt và quan sát lực nảy đàn hồi tự nhiên của sợi mi xem có ôm giữ đường cong hay bật thẳng ra.\n3. Kiểm tra độ bám dính khi miết nhẹ cùng sáp bắt mi không cồn.',
      evaluationGrounds:
        '• ĐẠT (PASS): Sợi mi có độ đàn hồi cao, ôm khít êm ái vào đường cong trục silicon, không bị bật gốc hay bung ngọn.\n• KHÔNG ĐẠT (FAIL): Sợi mi quá giòn đứt gãy ngay khi miết cong, hoặc sợi mi nhũn nhẽo mất hoàn toàn sức căng nảy (over-processed).',
      status: 'DRAFT_UNVERIFIED',
      statusLabel: 'Bản nháp – Chưa kiểm chứng',
      updatedBy: 'Cô Giang Phạm',
      updatedAt: '2026-10-28T09:00:00.000Z',
      evidenceFiles: [
        {
          id: 'ev-form-01',
          name: 'thu-kha-nang-tao-form-truc-m-pilot-04.jpg',
          url: '/api/pilot/media/32f48e47-b02a-4b0b-9ecc-cc843d018385.jpg',
          fileType: 'image',
          mimeType: 'image/jpeg',
          sizeBytes: 295400,
          description: 'Ảnh miết mi êm ái ôm sát trục silicon uốn mi cỡ M, độ nảy đàn hồi xuất sắc.',
          sourceOrigin: 'Ca Pilot thực tế',
          pilotSessionCode: 'PILOT-004',
          uploadedBy: 'Cô Giang Phạm',
          uploadedAt: '2026-10-28T09:35:00.000Z',
        },
      ],
    },
  ],
};
