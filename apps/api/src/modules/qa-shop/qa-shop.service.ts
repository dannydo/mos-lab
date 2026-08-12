import {
  QaChecklistTemplate,
  QaDailyAudit,
  QaActionTicket,
  QaComplianceStats,
  QaSaveAuditInput,
  QaImportSheetInput,
  QaAuditItemRecord,
  QaShopBranchCode,
  QaChecklistItem,
  QaChecklistSection,
} from '@mos-lab/shared';

type QaActionTicketWithDeletion = QaActionTicket & { isDeleted?: boolean };
type QaSaveAuditWithSnapshots = QaSaveAuditInput & Pick<QaDailyAudit, 'itemSnapshot' | 'sectionsSnapshot'>;

// Initial Preset Templates based on CSDL Nội Bộ specification
const PRESET_TEMPLATES: QaChecklistTemplate[] = [
  {
    id: 'tpl-dt-reception-daily',
    code: 'DT.Reception.DAILY.check',
    branchCode: 'DT',
    branchName: 'Đề Thám (DT)',
    title: 'DT - Lễ Tân Daily Inspection Standard',
    description: 'Bộ tiêu chuẩn kiểm tra hàng ngày khu vực Lễ Tân & Sảnh đón tại chi nhánh Đề Thám (DT).',
    updatedAt: new Date().toISOString(),
    sections: [
      {
        id: 'sec-dt-1',
        title: '1. Quầy Lễ Tân (Reception Desk & Counter)',
        description: 'Đảm bảo quầy lễ tân luôn ngăn nắp, đầy đủ công cụ làm việc và hình ảnh chuyên nghiệp.',
        order: 1,
        items: [
          {
            id: 'dt-1-1',
            code: 'DT.REC.01',
            title: 'Mặt quầy lễ tân sạch bẩn, không đồ cá nhân',
            standardRequirement: 'Mặt quầy trống 80%, không để ly nước dở, đồ ăn, túi xách cá nhân hay hồ sơ dư thừa.',
            weight: 3,
            requirePhotoOnFail: true,
            isCritical: true,
          },
          {
            id: 'dt-1-2',
            code: 'DT.REC.02',
            title: 'Thiết bị POS, Máy tính, Máy in hóa đơn sẵn sàng',
            standardRequirement: 'Máy tính khởi động sẵn màn hình CRM, POS đủ pin, máy in sẵn giấy in bill không lỗi.',
            weight: 4,
            requirePhotoOnFail: false,
            isCritical: false,
          },
          {
            id: 'dt-1-3',
            code: 'DT.REC.03',
            title: 'Menu dịch vụ & Bảng giá niêm yết ngay ngắn',
            standardRequirement: 'Menu không bị sờn góc, trầy xước; nằm đúng vị trí tiêu chuẩn bên góc phải quầy.',
            weight: 2,
            requirePhotoOnFail: false,
            isCritical: false,
          },
          {
            id: 'dt-1-4',
            code: 'DT.REC.04',
            title: 'Bình nước & Nước uống phục vụ khách đầy đủ',
            standardRequirement: 'Bình nước lọc nóng/lạnh còn nước, ly thủy tinh rửa sạch xếp úp trên khay inox sạch.',
            weight: 3,
            requirePhotoOnFail: true,
            isCritical: false,
          },
        ],
      },
      {
        id: 'sec-dt-2',
        title: '2. Sảnh Chờ & Không Gian (Waiting Area & Atmosphere)',
        description: 'Tạo không gian thư giãn, ấm cúng và thơm mát cho khách hàng ngay khi bước vào tiệm.',
        order: 2,
        items: [
          {
            id: 'dt-2-1',
            code: 'DT.WAI.01',
            title: 'Sofa & Bàn trà sạch sẽ, xếp cân đối',
            standardRequirement: 'Đệm gối sofa được đập bụi, xếp ngay ngắn; bàn trà lau sạch vệt nước ngọt/trà.',
            weight: 3,
            requirePhotoOnFail: true,
            isCritical: false,
          },
          {
            id: 'dt-2-2',
            code: 'DT.WAI.02',
            title: 'Âm thanh Nhạc nền & Tinh dầu thơm tỏa hương tốt',
            standardRequirement: 'Bật playlist nhạc thư giãn Spa volume 30-40dB; máy xông tinh dầu hoạt động tốt.',
            weight: 3,
            requirePhotoOnFail: false,
            isCritical: false,
          },
          {
            id: 'dt-2-3',
            code: 'DT.WAI.03',
            title: 'Nhiệt độ Máy lạnh duy trì 22-24°C',
            standardRequirement: 'Không khí mát mẻ, dễ chịu; cửa gió điều hòa không thổi thẳng vào mặt khách ngồi chờ.',
            weight: 3,
            requirePhotoOnFail: false,
            isCritical: false,
          },
        ],
      },
      {
        id: 'sec-dt-3',
        title: '3. Tác Phong & Đồng Phục (Staff Grooming & Attitude)',
        description: 'Lễ tân là bộ mặt thương hiệu, bắt buộc tuân thủ quy chuẩn trang phục và thái độ niềm nở.',
        order: 3,
        items: [
          {
            id: 'dt-3-1',
            code: 'DT.GRO.01',
            title: 'Đồng phục Lễ tân phẳng phiu & Bảng tên đầy đủ',
            standardRequirement:
              'Mặc đúng đồng phục thương hiệu, ủi phẳng, đeo thẻ tên bên ngực trái, mang giày đen kín mũi.',
            weight: 5,
            requirePhotoOnFail: true,
            isCritical: true,
          },
          {
            id: 'dt-3-2',
            code: 'DT.GRO.02',
            title: 'Tóc búi/kẹp gọn gàng, trang điểm tươi tắn',
            standardRequirement: 'Nữ đánh son nhẹ nhàng, tóc búi cao hoặc kẹp nửa gọn gàng; nam cắt tóc ngắn lịch sự.',
            weight: 4,
            requirePhotoOnFail: true,
            isCritical: false,
          },
          {
            id: 'dt-3-3',
            code: 'DT.GRO.03',
            title: 'Thái độ chủ động cúi chào & Nụ cười tươi khi đón khách',
            standardRequirement:
              'Đứng dậy chào khách trong vòng 3 giây khi khách bước vào cửa: "Dạ Wings Lashes xin chào chị!".',
            weight: 5,
            requirePhotoOnFail: false,
            isCritical: true,
          },
        ],
      },
      {
        id: 'sec-dt-4',
        title: '4. Vệ Sinh & Cơ Sở Vật Chất (Hygiene & Facility)',
        description: 'Đảm bảo vệ sinh môi trường cửa hàng đạt chuẩn 5 sao.',
        order: 4,
        items: [
          {
            id: 'dt-4-1',
            code: 'DT.HYG.01',
            title: 'Sàn nhà bóng sạch, không tóc rụng/vệt nước',
            standardRequirement: 'Sàn gạch/gỗ được lau khô sáng bóng, không có vệt rác hay tóc rơi trên lối đi.',
            weight: 4,
            requirePhotoOnFail: true,
            isCritical: false,
          },
          {
            id: 'dt-4-2',
            code: 'DT.HYG.02',
            title: 'Cửa kính ra vào trong suốt, lau vết vân tay',
            standardRequirement: 'Kính mặt tiền lau sạch bụi bẩn và vệt tay bám, không dán decal nham nhở.',
            weight: 3,
            requirePhotoOnFail: true,
            isCritical: false,
          },
          {
            id: 'dt-4-3',
            code: 'DT.HYG.03',
            title: 'Nhà vệ sinh khách thơm tho, đủ giấy & xà phòng',
            standardRequirement:
              'WC không có mùi hôi, bồn cầu sạch khô, đủ giấy vệ sinh dự phòng và nước rửa tay thơm.',
            weight: 5,
            requirePhotoOnFail: true,
            isCritical: true,
          },
        ],
      },
    ],
  },
  {
    id: 'tpl-ep-reception-daily',
    code: 'EP.Reception.DAILY.check',
    branchCode: 'EP',
    branchName: 'Estella Place (EP)',
    title: 'EP - Lễ Tân Daily Inspection Standard',
    description: 'Bộ tiêu chuẩn kiểm tra hàng ngày khu vực Lễ Tân & Sảnh VIP tại chi nhánh Estella Place (EP).',
    updatedAt: new Date().toISOString(),
    sections: [
      {
        id: 'sec-ep-1',
        title: '1. Quầy Lễ Tân & Check-in (EP Reception & Check-in Zone)',
        description: 'Tiêu chuẩn quầy check-in chi nhánh Estella Place cao cấp.',
        order: 1,
        items: [
          {
            id: 'ep-1-1',
            code: 'EP.REC.01',
            title: 'Bảng chào tên khách hàng VIP trên iPad/Màn hình',
            standardRequirement: 'Màn hình check-in hiển thị đúng tên lịch hẹn khách hàng VIP trong ngày.',
            weight: 4,
            requirePhotoOnFail: false,
            isCritical: false,
          },
          {
            id: 'ep-1-2',
            code: 'EP.REC.02',
            title: 'Mặt quầy đá hoa cương sáng bóng, sạch bụi',
            standardRequirement: 'Quầy đá không có vệt mồ hôi tay, lau chùi bằng dung dịch chuyên dụng 2 tiếng/lần.',
            weight: 3,
            requirePhotoOnFail: true,
            isCritical: false,
          },
          {
            id: 'ep-1-3',
            code: 'EP.REC.03',
            title: 'Khay welcome trà hoa cúc & khăn lạnh sẵn sàng',
            standardRequirement: 'Đủ 5 phần khăn lạnh ướp ướp hương sả chanh và tách trà ấm sẵn phục vụ khách.',
            weight: 4,
            requirePhotoOnFail: true,
            isCritical: true,
          },
        ],
      },
      {
        id: 'sec-ep-2',
        title: '2. Khu Vực Chờ VIP (EP Executive Lounge)',
        description: 'Không gian sảnh chờ tiêu chuẩn Resort cao cấp.',
        order: 2,
        items: [
          {
            id: 'ep-2-1',
            code: 'EP.WAI.01',
            title: 'Thang máy & Hành lang VIP sáng sạch',
            standardRequirement: 'Nút bấm thang máy lau sát khuẩn, thảm lau chân đầu sảnh xếp thẳng tắp.',
            weight: 3,
            requirePhotoOnFail: true,
            isCritical: false,
          },
          {
            id: 'ep-2-2',
            code: 'EP.WAI.02',
            title: 'Catalogue mẫu mi trưng bày nguyên vẹn',
            standardRequirement: 'Hộp mica trưng bày mẫu mi không bám bụi, đủ 12 mẫu mi chủ đạo của tiệm.',
            weight: 4,
            requirePhotoOnFail: false,
            isCritical: false,
          },
        ],
      },
      {
        id: 'sec-ep-3',
        title: '3. Tác Phong Lễ Tân EP (EP Receptionist Standards)',
        description: 'Nghiệp vụ lễ tân tiếp đón chuẩn 5 sao.',
        order: 3,
        items: [
          {
            id: 'ep-3-1',
            code: 'EP.GRO.01',
            title: 'Áo vest đồng phục EP đúng màu & Huy hiệu VIP',
            standardRequirement: 'Trang phục chuẩn Vest màu beige EP, cài huy hiệu thương hiệu vàng bên ngực trái.',
            weight: 5,
            requirePhotoOnFail: true,
            isCritical: true,
          },
          {
            id: 'ep-3-2',
            code: 'EP.GRO.02',
            title: 'Kỹ năng mở cửa & Đỡ áo khoác/Túi xách cho khách',
            standardRequirement: 'Lễ tân chủ động bước ra mở cửa kính, hỗ trợ xách túi nặng hoặc che ô khi trời mưa.',
            weight: 5,
            requirePhotoOnFail: false,
            isCritical: true,
          },
        ],
      },
      {
        id: 'sec-ep-4',
        title: '4. Vệ Sinh & An Toàn (EP Hygiene & Safety)',
        description: 'Vệ sinh phòng ốc và hệ thống chiếu sáng.',
        order: 4,
        items: [
          {
            id: 'ep-4-1',
            code: 'EP.HYG.01',
            title: 'Đèn chùm & Hệ thống chiếu sáng hoạt động 100%',
            standardRequirement: 'Không có bóng đèn bị cháy/chập chớp, ánh sáng vàng ấm áp dễ chịu.',
            weight: 3,
            requirePhotoOnFail: true,
            isCritical: false,
          },
          {
            id: 'ep-4-2',
            code: 'EP.HYG.02',
            title: 'Nhà vệ sinh nữ sạch bẩn & Tinh dầu bưởi ngát hương',
            standardRequirement: 'Gương soi lau khô sáng, sàn nệm đá không trơn trượt, nước rửa tay sang trọng.',
            weight: 5,
            requirePhotoOnFail: true,
            isCritical: true,
          },
        ],
      },
    ],
  },
];

// Initial Mock Audit Logs
const INITIAL_AUDITS: QaDailyAudit[] = [
  {
    id: 'aud-dt-20260810-01',
    auditCode: 'AUD-DT-0810-01',
    templateId: 'tpl-dt-reception-daily',
    templateCode: 'DT.Reception.DAILY.check',
    branchCode: 'DT',
    branchName: 'Đề Thám (DT)',
    auditorId: 'usr-qa-01',
    auditorName: 'Danny Do',
    auditDate: '2026-08-10',
    shift: 'Sáng',
    overallScore: 48,
    maxScore: 51,
    complianceRate: 94.1,
    passedCount: 13,
    failedCount: 1,
    naCount: 0,
    status: 'COMPLETED',
    notes: 'Khu vực Lễ tân DT duy trì rất tốt. Chỉ có lỗi sảnh chờ sofa chưa kịp đập bụi đầu ca.',
    createdAt: '2026-08-10T09:30:00.000Z',
    items: [
      {
        itemId: 'dt-1-1',
        itemCode: 'DT.REC.01',
        itemTitle: 'Mặt quầy lễ tân sạch bẩn, không đồ cá nhân',
        sectionId: 'sec-dt-1',
        sectionTitle: '1. Quầy Lễ Tân (Reception Desk & Counter)',
        weight: 3,
        result: 'PASS',
      },
      {
        itemId: 'dt-2-1',
        itemCode: 'DT.WAI.01',
        itemTitle: 'Sofa & Bàn trà sạch sẽ, xếp cân đối',
        sectionId: 'sec-dt-2',
        sectionTitle: '2. Sảnh Chờ & Không Gian (Waiting Area & Atmosphere)',
        weight: 3,
        result: 'FAIL',
        note: 'Gối sofa bị lệch góc và còn vệt bụi bám trên thành đệm.',
        photoUrls: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&auto=format&fit=crop'],
        severity: 'LOW',
        ticketId: 'tkt-001',
      },
    ],
  },
  {
    id: 'aud-ep-20260810-01',
    auditCode: 'AUD-EP-0810-01',
    templateId: 'tpl-ep-reception-daily',
    templateCode: 'EP.Reception.DAILY.check',
    branchCode: 'EP',
    branchName: 'Estella Place (EP)',
    auditorId: 'usr-qa-02',
    auditorName: 'Lê Văn Hoàng QA Leader',
    auditDate: '2026-08-10',
    shift: 'Chiều',
    overallScore: 36,
    maxScore: 36,
    complianceRate: 100.0,
    passedCount: 11,
    failedCount: 0,
    naCount: 0,
    status: 'COMPLETED',
    notes: 'Chi nhánh Estella Place đạt chuẩn xuất sắc 100% tuân thủ trong ca chiều.',
    createdAt: '2026-08-10T15:15:00.000Z',
    items: [],
  },
];

// Initial Mock Action Tickets
const INITIAL_TICKETS: QaActionTicket[] = [
  {
    id: 'tkt-001',
    ticketCode: 'ACT-DT-001',
    auditId: 'aud-dt-20260810-01',
    auditCode: 'AUD-DT-0810-01',
    branchCode: 'DT',
    branchName: 'Đề Thám (DT)',
    itemId: 'dt-2-1',
    itemTitle: 'Sofa & Bàn trà sạch sẽ, xếp cân đối',
    sectionTitle: '2. Sảnh Chờ & Không Gian',
    standardRequirement: 'Đệm gối sofa được đập bụi, xếp ngay ngắn; bàn trà lau sạch vệt nước ngọt/trà.',
    severity: 'LOW',
    assignedToStaffId: 'stf-dt-mgr',
    assignedToStaffName: 'Quản Lý Shop DT (Trần Ngọc Điệp)',
    dueDate: '2026-08-11',
    status: 'IN_PROGRESS',
    issueNotes: 'Gối sofa bị lệch góc và còn vệt bụi bám trên thành đệm.',
    proofPhotoUrls: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&auto=format&fit=crop'],
    createdAt: '2026-08-10T09:35:00.000Z',
  },
];

import fs from 'fs';
import path from 'path';

export class QaShopService {
  private templates: QaChecklistTemplate[] = [...PRESET_TEMPLATES];
  private audits: QaDailyAudit[] = [...INITIAL_AUDITS];
  private tickets: QaActionTicketWithDeletion[] = [...INITIAL_TICKETS];

  constructor() {
    this.loadSyncedSheetTemplates();
  }

  private loadSyncedSheetTemplates() {
    try {
      const candidates = [
        path.join(process.cwd(), 'src/modules/qa-shop/qa-sheet-data.json'),
        path.join(process.cwd(), 'dist/modules/qa-shop/qa-sheet-data.json'),
        path.join(process.cwd(), 'apps/api/src/modules/qa-shop/qa-sheet-data.json'),
      ];
      const jsonPath = candidates.find((p) => fs.existsSync(p));
      if (jsonPath) {
        const fileData = fs.readFileSync(jsonPath, 'utf-8');
        const parsed = JSON.parse(fileData);
        const syncedList = Object.values(parsed) as QaChecklistTemplate[];
        if (syncedList.length > 0) {
          // Prepend synced templates so they take priority
          this.templates = [...syncedList, ...PRESET_TEMPLATES];
        }
      }
    } catch (err) {
      console.error('Failed to load synced QA sheet templates:', err);
    }
  }

  // 1. Get List of Templates
  public getTemplates(branchCode?: QaShopBranchCode): QaChecklistTemplate[] {
    if (branchCode) {
      return this.templates.filter((t) => t.branchCode === branchCode);
    }
    return this.templates;
  }

  // 2. Get Template Detail by ID or Code
  public getTemplateByIdOrCode(idOrCode: string): QaChecklistTemplate | null {
    return this.templates.find((t) => t.id === idOrCode || t.code.toLowerCase() === idOrCode.toLowerCase()) || null;
  }

  // 3. Import or Sync Template from CSDL Nội Bộ
  public importSheetTemplate(input: QaImportSheetInput): QaChecklistTemplate {
    const branchCode = input.branchCode || 'DT';
    const branchName =
      branchCode === 'DT' ? 'Đề Thám (DT)' : branchCode === 'EP' ? 'Estella Place (EP)' : `Chi Nhánh ${branchCode}`;
    const code = input.templateCode || `${branchCode}.Reception.DAILY.check`;

    const existingIndex = this.templates.findIndex((t) => t.code === code);

    // Parsed or generated template structure
    const newTemplate: QaChecklistTemplate = {
      id: existingIndex >= 0 ? this.templates[existingIndex].id : `tpl-${branchCode.toLowerCase()}-sheet-imported`,
      code,
      branchCode,
      branchName,
      title: `${branchCode}`,
      description: `Bộ tiêu chuẩn kiểm tra chất lượng cửa hàng chuẩn CSDL nội bộ (${input.sheetUrlOrId})`,
      updatedAt: new Date().toISOString(),
      sections:
        existingIndex >= 0
          ? this.templates[existingIndex].sections
          : [
              {
                id: `sec-${branchCode.toLowerCase()}-sheet-1`,
                title: '1. Quầy Lễ Tân (CSDL Nội Bộ Standard)',
                order: 1,
                items: [
                  {
                    id: `${branchCode.toLowerCase()}-sht-1`,
                    code: `${branchCode}.REC.01`,
                    title: 'Mặt quầy lễ tân gọn gàng & Không đồ cá nhân',
                    standardRequirement: 'Đồng bộ từ CSDL Nội Bộ tab: ' + code,
                    weight: 4,
                    requirePhotoOnFail: true,
                    isCritical: true,
                  },
                  {
                    id: `${branchCode.toLowerCase()}-sht-2`,
                    code: `${branchCode}.REC.02`,
                    title: 'Hệ thống Máy in bill & POS thanh toán hoạt động tốt',
                    standardRequirement: 'Sẵn sàng hóa đơn thanh toán cho khách hàng.',
                    weight: 3,
                    requirePhotoOnFail: false,
                  },
                ],
              },
            ],
    };

    if (existingIndex >= 0) {
      this.templates[existingIndex] = newTemplate;
    } else {
      this.templates.push(newTemplate);
    }

    return newTemplate;
  }

  private persistTemplatesToDisk() {
    try {
      const candidates = [
        path.join(process.cwd(), 'src/modules/qa-shop/qa-sheet-data.json'),
        path.join(process.cwd(), 'apps/api/src/modules/qa-shop/qa-sheet-data.json'),
        path.join(process.cwd(), 'dist/modules/qa-shop/qa-sheet-data.json'),
      ];
      const dataMap: Record<string, QaChecklistTemplate> = {};
      this.templates.forEach((t) => {
        dataMap[t.branchCode] = t;
      });
      const jsonString = JSON.stringify(dataMap, null, 2);
      candidates.forEach((p) => {
        try {
          const dir = path.dirname(p);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(p, jsonString, 'utf-8');
        } catch {
          // A secondary output path may not exist or be writable in every deployment.
        }
      });
    } catch (err) {
      console.error('Failed to persist QA sheet templates to disk:', err);
    }
  }

  // 3b. Update Template Sections and Items (CRUD Support)
  public updateTemplate(branchCode: string, sections: SafeAny[]): QaChecklistTemplate {
    const codeUpper = branchCode.toUpperCase() as QaShopBranchCode;
    let template = this.getTemplateByIdOrCode(codeUpper);

    const branchName =
      codeUpper === 'DT'
        ? 'Đề Thám (DT)'
        : codeUpper === 'EP'
          ? 'Estella Place (EP)'
          : codeUpper === 'ACA-DT'
            ? 'Academy - Đề Thám (ACA-DT)'
            : codeUpper === 'HQ'
              ? 'Văn Phòng HQ (HQ)'
              : `Chi Nhánh ${codeUpper}`;

    if (!template) {
      template = {
        id: `tpl-${codeUpper.toLowerCase()}`,
        code: `${codeUpper}.DAILY.check`,
        branchCode: codeUpper,
        branchName,
        title: `Bộ Tiêu Chuẩn Kiểm Tra Chi Nhánh ${branchName}`,
        updatedAt: new Date().toISOString(),
        sections: [],
      };
    }

    const updatedTemplate: QaChecklistTemplate = {
      ...template,
      branchName,
      title: `Bộ Tiêu Chuẩn Kiểm Tra Chi Nhánh ${branchName}`,
      sections: sections as QaChecklistSection[],
      updatedAt: new Date().toISOString(),
    };

    const idx = this.templates.findIndex((t) => t.branchCode === codeUpper || t.id === template.id);
    if (idx >= 0) {
      this.templates[idx] = updatedTemplate;
    } else {
      this.templates.push(updatedTemplate);
    }

    this.persistTemplatesToDisk();
    return updatedTemplate;
  }

  // 3c. Clone / Duplicate Template from Source Branch to Target Branch
  public cloneTemplate(input: {
    sourceBranchCode: string;
    targetBranchCode: string;
    overwrite?: boolean;
  }): QaChecklistTemplate {
    const srcBranch = (input.sourceBranchCode || 'DT').toUpperCase() as QaShopBranchCode;
    const tgtBranch = (input.targetBranchCode || 'EP').toUpperCase() as QaShopBranchCode;

    const srcTemplate = this.getTemplateByIdOrCode(srcBranch);
    if (!srcTemplate) {
      throw new Error(`Mẫu tiêu chuẩn của chi nhánh ${srcBranch} không tồn tại`);
    }

    const tgtBranchName =
      tgtBranch === 'DT'
        ? 'Đề Thám (DT)'
        : tgtBranch === 'EP'
          ? 'Estella Place (EP)'
          : tgtBranch === 'ACA-DT'
            ? 'Academy - Đề Thám (ACA-DT)'
            : tgtBranch === 'HQ'
              ? 'Văn Phòng HQ (HQ)'
              : `Chi Nhánh ${tgtBranch}`;

    const clonedSections: QaChecklistSection[] = structuredClone(srcTemplate.sections).map((sec, secIdx: number) => ({
      ...sec,
      id: `sec-${tgtBranch.toLowerCase()}-${secIdx + 1}`,
      items: sec.items.map((itm, itmIdx: number) => ({
        ...itm,
        id: `${tgtBranch.toLowerCase()}-${secIdx + 1}-${itmIdx + 1}`,
        code: `${tgtBranch}.${itm.code ? itm.code.split('.').slice(1).join('.') : `ITEM.${itmIdx + 1}`}`,
      })),
    }));

    const updatedTemplate: QaChecklistTemplate = {
      id: `tpl-${tgtBranch.toLowerCase()}`,
      code: `${tgtBranch}.DAILY.check`,
      branchCode: tgtBranch,
      branchName: tgtBranchName,
      title: `Bộ Tiêu Chuẩn Kiểm Tra Chi Nhánh ${tgtBranchName}`,
      description: `Bộ tiêu chuẩn được sao chép và nhân bản từ chi nhánh ${srcTemplate.branchName}`,
      updatedAt: new Date().toISOString(),
      sections: clonedSections,
    };

    const idx = this.templates.findIndex((t) => t.branchCode === tgtBranch || t.id === updatedTemplate.id);
    if (idx >= 0) {
      this.templates[idx] = updatedTemplate;
    } else {
      this.templates.push(updatedTemplate);
    }

    this.persistTemplatesToDisk();
    return updatedTemplate;
  }

  // 4. List Daily Audits (Support Soft Delete Filter)
  public getAudits(params?: {
    branchCode?: string;
    dateFrom?: string;
    dateTo?: string;
    includeDeleted?: boolean;
    onlyDeleted?: boolean;
  }): QaDailyAudit[] {
    let result = [...this.audits];

    if (params?.onlyDeleted) {
      result = result.filter((a) => a.isDeleted === true);
    } else if (!params?.includeDeleted) {
      result = result.filter((a) => !a.isDeleted);
    }

    if (params?.branchCode && params.branchCode !== 'ALL') {
      result = result.filter((a) => a.branchCode === params.branchCode);
    }

    if (params?.dateFrom) {
      result = result.filter((a) => a.auditDate >= params.dateFrom!);
    }

    if (params?.dateTo) {
      result = result.filter((a) => a.auditDate <= params.dateTo!);
    }

    // Sort by newest audit date first
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // 4b. Soft Delete Audit Log (For testing & clean analytics)
  public softDeleteAudit(id: string, deletedBy?: string): QaDailyAudit {
    const audit = this.audits.find((a) => a.id === id);
    if (!audit) {
      throw new Error(`Biên bản audit với mã ${id} không tồn tại`);
    }
    audit.isDeleted = true;
    audit.deletedAt = new Date().toISOString();
    audit.deletedBy = deletedBy || 'Admin';

    // Also mark linked tickets as deleted
    this.tickets.forEach((t) => {
      if (t.auditId === id) {
        t.isDeleted = true;
      }
    });

    return audit;
  }

  // 4c. Restore Soft-Deleted Audit Log
  public restoreAudit(id: string): QaDailyAudit {
    const audit = this.audits.find((a) => a.id === id);
    if (!audit) {
      throw new Error(`Biên bản audit với mã ${id} không tồn tại`);
    }
    audit.isDeleted = false;
    audit.deletedAt = undefined;
    audit.deletedBy = undefined;

    // Restore linked tickets
    this.tickets.forEach((t) => {
      if (t.auditId === id) {
        t.isDeleted = false;
      }
    });

    return audit;
  }

  // 5. Get Audit Detail by ID
  public getAuditById(id: string): QaDailyAudit | null {
    return this.audits.find((a) => a.id === id) || null;
  }

  // 6. Save / Submit Daily Audit Form
  public saveAudit(input: QaSaveAuditInput): QaDailyAudit {
    const template = this.getTemplateByIdOrCode(input.templateId);
    if (!template) {
      throw new Error(`Template not found for ID or Code: ${input.templateId}`);
    }

    const auditId = `aud-${template.branchCode.toLowerCase()}-${Date.now().toString().slice(-6)}`;
    const auditCode = `AUD-${template.branchCode}-${new Date().toISOString().slice(5, 10).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`;

    let passedCount = 0;
    let failedCount = 0;
    let naCount = 0;
    let earnedPoints = 0;
    let maxPossiblePoints = 0;

    const recordedItems: QaAuditItemRecord[] = [];
    const generatedTickets: QaActionTicket[] = [];

    // Map template items for fast lookup
    const itemMap = new Map<string, { sectionId: string; sectionTitle: string; item: QaChecklistItem }>();
    template.sections.forEach((sec) => {
      sec.items.forEach((itm) => {
        itemMap.set(itm.id, { sectionId: sec.id, sectionTitle: sec.title, item: itm });
      });
    });

    input.items.forEach((submitted) => {
      const found = itemMap.get(submitted.itemId);
      if (!found) return;

      const { sectionId, sectionTitle, item } = found;
      const weight = item.weight || 1;

      let ticketId: string | undefined;

      if (submitted.result === 'PASS') {
        passedCount++;
        earnedPoints += weight;
        maxPossiblePoints += weight;
      } else if (submitted.result === 'FAIL') {
        failedCount++;
        maxPossiblePoints += weight;

        // Auto-generate Action Ticket for FAIL items
        const ticketCode = `ACT-${template.branchCode}-${Math.floor(1000 + Math.random() * 9000)}`;
        ticketId = `tkt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const newTicket: QaActionTicket = {
          id: ticketId,
          ticketCode,
          auditId,
          auditCode,
          branchCode: template.branchCode,
          branchName: template.branchName,
          itemId: item.id,
          itemTitle: item.title,
          sectionTitle,
          standardRequirement: item.standardRequirement,
          severity: submitted.severity || (item.isCritical ? 'HIGH' : 'MEDIUM'),
          assignedToStaffId: `mgr-${template.branchCode.toLowerCase()}`,
          assignedToStaffName: `Quản Lý Chi Nhánh ${template.branchName}`,
          dueDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10), // 2 days deadline
          status: 'OPEN',
          issueNotes: submitted.note || 'Không đạt tiêu chuẩn kiểm tra.',
          proofPhotoUrls: submitted.photoUrls || [],
          createdAt: new Date().toISOString(),
        };

        generatedTickets.push(newTicket);
        this.tickets.unshift(newTicket);
      } else {
        naCount++;
      }

      recordedItems.push({
        itemId: item.id,
        itemCode: item.code,
        itemTitle: item.title,
        sectionId,
        sectionTitle,
        weight,
        result: submitted.result,
        note: submitted.note,
        photoUrls: submitted.photoUrls,
        severity: submitted.severity,
        ticketId,
      });
    });

    const complianceRate = maxPossiblePoints > 0 ? Math.round((earnedPoints / maxPossiblePoints) * 1000) / 10 : 100;

    const inputWithSnapshots = input as QaSaveAuditWithSnapshots;
    const newAudit: QaDailyAudit = {
      id: auditId,
      auditCode,
      templateId: template.id,
      templateCode: template.code,
      branchCode: template.branchCode,
      branchName: template.branchName,
      auditorId: input.auditorId || 'usr-admin-01',
      auditorName: input.auditorName || 'Danny Do',
      auditDate: input.auditDate || new Date().toISOString().slice(0, 10),
      shift: input.shift || 'Sáng',
      overallScore: earnedPoints,
      maxScore: maxPossiblePoints,
      complianceRate,
      passedCount,
      failedCount,
      naCount,
      status: 'COMPLETED',
      notes: input.notes,
      createdAt: new Date().toISOString(),
      items: recordedItems,
      itemSnapshot: inputWithSnapshots.itemSnapshot,
      sectionsSnapshot: inputWithSnapshots.sectionsSnapshot,
    };

    this.audits.unshift(newAudit);
    return newAudit;
  }

  // 7. Get Action Tickets List
  public getTickets(params?: { branchCode?: string; status?: string }): QaActionTicket[] {
    let result = [...this.tickets];

    if (params?.branchCode && params.branchCode !== 'ALL') {
      result = result.filter((t) => t.branchCode === params.branchCode);
    }

    if (params?.status && params.status !== 'ALL') {
      result = result.filter((t) => t.status === params.status);
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // 8. Update Action Ticket (Resolve / Verify)
  public updateTicket(
    ticketId: string,
    updates: {
      status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED';
      resolutionNotes?: string;
      resolutionPhotoUrls?: string[];
      resolvedByStaffName?: string;
    }
  ): QaActionTicket {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) {
      throw new Error(`Action Ticket not found: ${ticketId}`);
    }

    if (updates.status) ticket.status = updates.status;
    if (updates.resolutionNotes) ticket.resolutionNotes = updates.resolutionNotes;
    if (updates.resolutionPhotoUrls) ticket.resolutionPhotoUrls = updates.resolutionPhotoUrls;
    if (updates.resolvedByStaffName) ticket.resolvedByStaffName = updates.resolvedByStaffName;

    if (updates.status === 'RESOLVED' || updates.status === 'VERIFIED') {
      ticket.resolvedAt = new Date().toISOString();
    }

    return ticket;
  }

  // 9. Get Overall Analytics & Compliance Stats (Exclude Soft-Deleted Audits)
  public getAnalytics(): QaComplianceStats {
    const activeAudits = this.audits.filter((a) => !a.isDeleted);
    const activeTickets = this.tickets.filter((t) => !t.isDeleted);

    const totalAudits = activeAudits.length;
    const avgCompliance =
      totalAudits > 0
        ? Math.round((activeAudits.reduce((acc, curr) => acc + curr.complianceRate, 0) / totalAudits) * 10) / 10
        : 100;

    const totalFailedItems = activeTickets.length;
    const resolvedTicketsCount = activeTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'VERIFIED').length;
    const openTicketsCount = activeTickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;

    // Branch Comparison
    const branchMap = new Map<QaShopBranchCode, { name: string; scores: number[]; fails: number }>();
    activeAudits.forEach((aud) => {
      if (!branchMap.has(aud.branchCode)) {
        branchMap.set(aud.branchCode, { name: aud.branchName, scores: [], fails: 0 });
      }
      const b = branchMap.get(aud.branchCode)!;
      b.scores.push(aud.complianceRate);
      b.fails += aud.failedCount;
    });

    const branchComparison = Array.from(branchMap.entries()).map(([code, val]) => ({
      branchCode: code,
      branchName: val.name,
      avgScore: Math.round((val.scores.reduce((a, b) => a + b, 0) / val.scores.length) * 10) / 10,
      auditCount: val.scores.length,
      failedCount: val.fails,
    }));

    return {
      averageComplianceRate: avgCompliance,
      totalAudits,
      totalFailedItems,
      resolvedTicketsCount,
      openTicketsCount,
      branchComparison,
      sectionBreakdown: [
        { sectionTitle: 'Quầy Lễ Tân', passRate: 95.2 },
        { sectionTitle: 'Sảnh Chờ & Không Gian', passRate: 91.8 },
        { sectionTitle: 'Tác Phong & Đồng Phục', passRate: 98.0 },
        { sectionTitle: 'Vệ Sinh & Cơ Sở Vật Chất', passRate: 88.5 },
      ],
    };
  }
}

export const qaShopService = new QaShopService();
