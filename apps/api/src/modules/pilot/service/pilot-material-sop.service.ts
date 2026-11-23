import type { FastifyInstance } from 'fastify';
import type {
  PilotGlueRodStandardItem,
  PilotMaterial,
  PilotMaterialSopDocument,
  PilotSanitizationItem,
  PilotSolutionNormItem,
  SavePilotMaterialSopRequest,
} from '@mos-lab/shared';
import { MATERIAL_SOP_CONFIG_KEY, PilotServiceError } from './pilot-core.js';
import { listPilotMaterials } from './pilot-materials.service.js';

// ═══════════════════════════════════════════
// Hạng mục 3 – Định mức & Kiểm soát vật tư tiêu hao (MOS-FEAT-164)
// ═══════════════════════════════════════════

export function getDefaultPilotMaterialSop(materials: PilotMaterial[] = []): PilotMaterialSopDocument {
  const findMaterialCost = (
    nameSub: string,
    fallbackCost: number
  ): { materialId?: number; costPerUnit: number; unit: string } => {
    const found = materials.find((m) => m.name.toLowerCase().includes(nameSub.toLowerCase()));
    if (found) {
      return { materialId: found.id, costPerUnit: found.costPerUnit, unit: found.unit };
    }
    return { costPerUnit: fallbackCost, unit: 'ml' };
  };

  const s1 = findMaterialCost('Thuốc số 1', 30000);
  const s2 = findMaterialCost('Thuốc số 2', 30000);
  const keratin = findMaterialCost('Keratin', 19000);
  const tint = findMaterialCost('nhuộm mi', 16000);

  const solutionNorms: PilotSolutionNormItem[] = [
    {
      id: 'norm-solution-1',
      materialId: s1.materialId || null,
      materialName: 'Thuốc số 1 (Perming Cream - Làm mềm sợi mi)',
      unit: s1.unit,
      costPerUnit: s1.costPerUnit,
      standardDosagePerSession: 0.8,
      costPerSession: Math.round(0.8 * s1.costPerUnit),
      usageInstructions: 'Ủ mềm nang mi, canh theo chất mi 10-15 phút. Tuyệt đối không để dính da mi mắt.',
      technicalNotes: 'Kiểm tra độ giãn nở của sợi mi sau 8 phút.',
      status: 'PENDING_REVIEW',
      verifiedBy: null,
      verifiedAt: null,
    },
    {
      id: 'norm-solution-2',
      materialId: s2.materialId || null,
      materialName: 'Thuốc số 2 (Setting Cream - Định hình nếp uốn)',
      unit: s2.unit,
      costPerUnit: s2.costPerUnit,
      standardDosagePerSession: 0.8,
      costPerSession: Math.round(0.8 * s2.costPerUnit),
      usageInstructions: 'Định hình nếp uốn sau khi lau sạch thuốc số 1. Thời gian ủ 10-12 phút.',
      technicalNotes: 'Chải thẳng hướng sợi mi lên form trục silicon trước khi chấm thuốc.',
      status: 'PENDING_REVIEW',
      verifiedBy: null,
      verifiedAt: null,
    },
    {
      id: 'norm-keratin',
      materialId: keratin.materialId || null,
      materialName: 'Keratin dưỡng mi chuyên sâu',
      unit: keratin.unit,
      costPerUnit: keratin.costPerUnit,
      standardDosagePerSession: 0.5,
      costPerSession: Math.round(0.5 * keratin.costPerUnit),
      usageInstructions: 'Thoa đều từ gốc đến ngọn mi sau khi rửa sạch thuốc 2, giữ ẩm 5 phút.',
      technicalNotes: 'Tạo màng phủ bóng nano bảo vệ lớp biểu bì keratin nguyên bản.',
      status: 'PENDING_REVIEW',
      verifiedBy: null,
      verifiedAt: null,
    },
    {
      id: 'norm-lash-tint',
      materialId: tint.materialId || null,
      materialName: 'Thuốc nhuộm đen mi (Lash Tint phủ bóng tối)',
      unit: tint.unit,
      costPerUnit: tint.costPerUnit,
      standardDosagePerSession: 0.5,
      costPerSession: Math.round(0.5 * tint.costPerUnit),
      usageInstructions: 'Nhuộm đen bóng sợi mi sau bước uốn, ủ 5 phút.',
      technicalNotes: 'Lau sạch bằng bông ẩm, tránh lem vào giác mạc.',
      status: 'PENDING_REVIEW',
      verifiedBy: null,
      verifiedAt: null,
    },
  ];

  const glueRodStandards: PilotGlueRodStandardItem[] = [
    {
      id: 'std-rod-form-c',
      category: 'SILICON_ROD',
      title: 'Trục Silicon Form C (Uốn cong tự nhiên)',
      materialRef: 'Trục silicon uốn mi Form C',
      selectionCriteria: 'Phù hợp mắt tròn, mi dài trung bình (8-10mm), khách thích độ cong tròn tự nhiên.',
      standardOperation: 'Đặt trục cách chân mi 0.5mm, căn chỉnh đối xứng hai mắt, vuốt mi ôm đều thân trục.',
      technicalNotes: 'Vệ sinh vô trùng trục trước khi đặt lên mí mắt khách.',
      commonMistakesToAvoid: 'Tránh đặt trục đè lên bờ mi gây cộm khó chịu cho khách.',
      illustrationImageUrl: null,
      status: 'PENDING_REVIEW',
      verifiedBy: null,
      verifiedAt: null,
    },
    {
      id: 'std-rod-form-u',
      category: 'SILICON_ROD',
      title: 'Trục Silicon Form U (Uốn cong vút mở tròng)',
      materialRef: 'Trục silicon uốn mi Form U',
      selectionCriteria: 'Phù hợp mi dài (>10mm), mí sụp nhẹ cần mở tròng to, tạo điểm nhấn sâu cho mắt.',
      standardOperation: 'Cố định trục sát mí trên, vuốt căng mi từ gốc lên đỉnh trục theo góc 90 độ.',
      technicalNotes: 'Giữ lực căng vừa phải, không làm gập gãy nang mi.',
      commonMistakesToAvoid: 'Tránh kéo căng quá mức làm bật gốc mi hoặc tạo bóng khí dưới trục.',
      illustrationImageUrl: null,
      status: 'PENDING_REVIEW',
      verifiedBy: null,
      verifiedAt: null,
    },
    {
      id: 'std-glue-gentle',
      category: 'GLUE',
      title: 'Sáp & Keo định hình không cay niêm mạc',
      materialRef: 'Keo định hình uốn mi gốc nước / Sáp uốn',
      selectionCriteria: 'Dùng sáp uốn không mùi hoặc keo gốc nước an toàn cho giác mạc và da nhạy cảm.',
      standardOperation: 'Bôi một lớp mỏng đều lên trục silicon, gạt từng tép mi dính đều vào trục trong 30 giây.',
      technicalNotes: 'Chờ 5 giây cho keo se bề mặt trước khi vuốt gạt mi.',
      commonMistakesToAvoid: 'Tránh dùng quá nhiều keo tạo màng chắn dày làm thuốc số 1 không ngấm được vào sợi mi.',
      illustrationImageUrl: null,
      status: 'PENDING_REVIEW',
      verifiedBy: null,
      verifiedAt: null,
    },
  ];

  const sanitizationProcedures: PilotSanitizationItem[] = [
    {
      id: 'sanit-silicon-rod',
      toolName: 'Trục silicon y tế',
      classification: 'REUSABLE',
      procedure:
        '1. Rửa sạch cặn thuốc và keo dưới vòi nước bằng xà phòng y tế trung tính.\n2. Ngâm ngập trong cồn 70 độ hoặc dung dịch tiệt trùng tối thiểu 15 phút.\n3. Rửa lại nước cất, để ráo và cho vào tủ tiệt trùng tia UV 20 phút.\n4. Đóng gói vào túi vô trùng bảo quản kín riêng từng ca.',
      criticalSafetyPoint: 'Kiểm tra bề mặt trục không bị rách, ố vàng hoặc còn đọng keo cũ trước khi sử dụng.',
      checklistSteps: [
        'Rửa sạch keo và hóa chất cũ',
        'Ngâm cồn 70° tối thiểu 15 phút',
        'Sấy khô và tiệt trùng UV 20 phút',
        'Bảo quản trong hộp/túi vô trùng kín',
      ],
      status: 'PENDING_REVIEW',
      verifiedBy: null,
      verifiedAt: null,
    },
    {
      id: 'sanit-tweezers-tools',
      toolName: 'Nhíp uốn mi & Cây chải mi kim loại',
      classification: 'REUSABLE',
      procedure:
        'Lau sạch đầu dụng cụ bằng gạc tẩm cồn y tế 70 độ, ngâm dung dịch khử khuẩn và tiệt trùng bằng tủ UV trước mỗi ca làm.',
      criticalSafetyPoint: 'Đầu nhíp không bị biến dạng, không có gờ sắc nhọn gây trầy xước niêm mạc mắt khách.',
      checklistSteps: ['Lau sạch gạc cồn 70°', 'Tiệt trùng tia cực tím UV', 'Kiểm tra độ khít và êm của đầu nhíp'],
      status: 'PENDING_REVIEW',
      verifiedBy: null,
      verifiedAt: null,
    },
    {
      id: 'sanit-eyepad',
      toolName: 'Miếng dán mi dưới (Eye Pad) & Giấy giữ mi con',
      classification: 'DISPOSABLE',
      procedure:
        'Vật tư dùng một lần: Lấy mới từ bao bì vô trùng nguyên seal, dán chặn mi dưới cách bờ mi 1mm. Tháo bỏ vào thùng rác y tế ngay sau ca làm.',
      criticalSafetyPoint: 'Chỉ sử dụng 1 lần duy nhất cho 1 khách hàng. Tuyệt đối cấm tái sử dụng.',
      checklistSteps: [
        'Kiểm tra bao bì nguyên seal và hạn dùng',
        'Dán chuẩn vị trí cách bờ mi 1mm',
        'Thải bỏ ngay vào thùng rác sau khi hoàn tất',
      ],
      status: 'PENDING_REVIEW',
      verifiedBy: null,
      verifiedAt: null,
    },
    {
      id: 'sanit-microbrush',
      toolName: 'Tăm bông vi điểm (Microbrush) & Chổi chải mi nhựa',
      classification: 'DISPOSABLE',
      procedure: 'Dùng lấy thuốc và định hình tép mi. Thải bỏ ngay sau khi sử dụng cho từng bước.',
      criticalSafetyPoint: 'Không chấm ngược đầu tăm đã chạm mắt vào lọ thuốc dùng chung.',
      checklistSteps: [
        'Dùng 1 đầu tăm cho 1 lần lấy hóa chất',
        'Không nhúng lại đầu đã tiếp xúc',
        'Hủy bỏ ngay sau bước kỹ thuật',
      ],
      status: 'PENDING_REVIEW',
      verifiedBy: null,
      verifiedAt: null,
    },
  ];

  const totalNormCostPerSession = solutionNorms.reduce((sum, item) => sum + item.costPerSession, 0);

  return {
    pilotCode: 'DARK_LASHES',
    overallStatus: 'DRAFT',
    isPublished: false,
    expertReviewer: 'Cô Giang Đàm',
    projectOwner: 'Danny Do',
    approvalNote:
      'Bản dự thảo SOP Hạng mục 3 chờ Cô Giang Đàm thẩm định chuyên môn trước khi trình CEO phê duyệt Scale.',
    reviewedAt: null,
    approvedAt: null,
    updatedAt: new Date().toISOString(),
    solutionNorms,
    glueRodStandards,
    sanitizationProcedures,
    summary: {
      totalNormCostPerSession,
      totalItemsCount: solutionNorms.length + glueRodStandards.length + sanitizationProcedures.length,
      pendingReviewCount: solutionNorms.length + glueRodStandards.length + sanitizationProcedures.length,
      verifiedCount: 0,
    },
  };
}

export async function getPilotMaterialSop(
  fastify: FastifyInstance,
  pilotCode = 'DARK_LASHES'
): Promise<PilotMaterialSopDocument> {
  const materials = await listPilotMaterials(fastify, pilotCode);
  const config = await fastify.prisma.crm.crmConfig.findUnique({
    where: { key: MATERIAL_SOP_CONFIG_KEY },
  });

  if (!config || !config.value) {
    const defaultDoc = getDefaultPilotMaterialSop(materials);
    if (fastify.prisma.crm.crmConfig?.upsert) {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: MATERIAL_SOP_CONFIG_KEY },
        create: {
          key: MATERIAL_SOP_CONFIG_KEY,
          value: JSON.stringify(defaultDoc),
        },
        update: {
          value: JSON.stringify(defaultDoc),
        },
      });
    }
    return defaultDoc;
  }

  try {
    const doc = JSON.parse(config.value) as PilotMaterialSopDocument;
    // Re-link costs from live materials if available
    const matMap = new Map<number, PilotMaterial>();
    materials.forEach((m) => matMap.set(m.id, m));

    let totalCost = 0;
    let pendingCount = 0;
    let verifiedCount = 0;

    const solutionNorms = (doc.solutionNorms || []).map((norm) => {
      let costPerUnit = norm.costPerUnit;
      if (norm.materialId && matMap.has(norm.materialId)) {
        costPerUnit = matMap.get(norm.materialId)!.costPerUnit;
      }
      const costPerSession = Math.round(Number(norm.standardDosagePerSession || 0) * costPerUnit);
      totalCost += costPerSession;
      if (norm.status === 'VERIFIED') verifiedCount++;
      else pendingCount++;
      return {
        ...norm,
        costPerUnit,
        costPerSession,
      };
    });

    (doc.glueRodStandards || []).forEach((g) => {
      if (g.status === 'VERIFIED') verifiedCount++;
      else pendingCount++;
    });

    (doc.sanitizationProcedures || []).forEach((s) => {
      if (s.status === 'VERIFIED') verifiedCount++;
      else pendingCount++;
    });

    doc.solutionNorms = solutionNorms;
    doc.summary = {
      totalNormCostPerSession: totalCost,
      totalItemsCount:
        solutionNorms.length + (doc.glueRodStandards?.length || 0) + (doc.sanitizationProcedures?.length || 0),
      pendingReviewCount: pendingCount,
      verifiedCount,
    };

    return doc;
  } catch {
    return getDefaultPilotMaterialSop(materials);
  }
}

export async function savePilotMaterialSop(
  fastify: FastifyInstance,
  input: SavePilotMaterialSopRequest
): Promise<PilotMaterialSopDocument> {
  const existing = await getPilotMaterialSop(fastify, input.pilotCode || 'DARK_LASHES');

  const solutionNorms: PilotSolutionNormItem[] = (input.solutionNorms || existing.solutionNorms).map((s) => ({
    ...s,
    costPerSession: Math.round(Number(s.standardDosagePerSession || 0) * Number(s.costPerUnit || 0)),
  }));

  const glueRodStandards: PilotGlueRodStandardItem[] = input.glueRodStandards || existing.glueRodStandards;
  const sanitizationProcedures: PilotSanitizationItem[] =
    input.sanitizationProcedures || existing.sanitizationProcedures;

  let totalCost = 0;
  let pendingCount = 0;
  let verifiedCount = 0;

  solutionNorms.forEach((item) => {
    totalCost += item.costPerSession;
    if (item.status === 'VERIFIED') verifiedCount++;
    else pendingCount++;
  });

  glueRodStandards.forEach((item) => {
    if (item.status === 'VERIFIED') verifiedCount++;
    else pendingCount++;
  });

  sanitizationProcedures.forEach((item) => {
    if (item.status === 'VERIFIED') verifiedCount++;
    else pendingCount++;
  });

  // Invariant: Cannot publish without APPROVED_SCALE status
  const overallStatus = input.overallStatus || existing.overallStatus;
  const isPublished = overallStatus === 'APPROVED_SCALE' ? Boolean(input.isPublished ?? existing.isPublished) : false;

  const updatedDoc: PilotMaterialSopDocument = {
    ...existing,
    pilotCode: input.pilotCode || existing.pilotCode || 'DARK_LASHES',
    overallStatus,
    isPublished,
    expertReviewer: input.expertReviewer || existing.expertReviewer || 'Cô Giang Đàm',
    projectOwner: input.projectOwner || existing.projectOwner || 'Danny Do',
    approvalNote: input.approvalNote ?? existing.approvalNote,
    updatedAt: new Date().toISOString(),
    solutionNorms,
    glueRodStandards,
    sanitizationProcedures,
    summary: {
      totalNormCostPerSession: totalCost,
      totalItemsCount: solutionNorms.length + glueRodStandards.length + sanitizationProcedures.length,
      pendingReviewCount: pendingCount,
      verifiedCount,
    },
  };

  await fastify.prisma.crm.crmConfig.upsert({
    where: { key: MATERIAL_SOP_CONFIG_KEY },
    create: {
      key: MATERIAL_SOP_CONFIG_KEY,
      value: JSON.stringify(updatedDoc),
    },
    update: {
      value: JSON.stringify(updatedDoc),
    },
  });

  return updatedDoc;
}

export async function reviewPilotMaterialSop(
  fastify: FastifyInstance,
  input: {
    reviewerName?: string;
    decision: 'EXPERT_ENDORSE' | 'APPROVE_SCALE';
    note?: string;
  }
): Promise<PilotMaterialSopDocument> {
  const existing = await getPilotMaterialSop(fastify, 'DARK_LASHES');
  const now = new Date().toISOString();

  if (input.decision === 'EXPERT_ENDORSE') {
    const expertName = input.reviewerName || 'Cô Giang Đàm';
    const solutionNorms = existing.solutionNorms.map((s) => ({
      ...s,
      status: 'VERIFIED' as const,
      verifiedBy: expertName,
      verifiedAt: now,
    }));
    const glueRodStandards = existing.glueRodStandards.map((g) => ({
      ...g,
      status: 'VERIFIED' as const,
      verifiedBy: expertName,
      verifiedAt: now,
    }));
    const sanitizationProcedures = existing.sanitizationProcedures.map((p) => ({
      ...p,
      status: 'VERIFIED' as const,
      verifiedBy: expertName,
      verifiedAt: now,
    }));

    return savePilotMaterialSop(fastify, {
      overallStatus: 'REVIEWED_BY_EXPERT',
      expertReviewer: expertName,
      approvalNote:
        input.note ||
        `Cô Giang Đàm đã thẩm định và xác nhận toàn bộ định mức & quy chuẩn vật tư ngày ${new Date().toLocaleDateString('vi-VN')}.`,
      solutionNorms,
      glueRodStandards,
      sanitizationProcedures,
    });
  }

  if (input.decision === 'APPROVE_SCALE') {
    return savePilotMaterialSop(fastify, {
      overallStatus: 'APPROVED_SCALE',
      isPublished: true,
      approvalNote: input.note || 'CEO phê duyệt chính thức Scale dịch vụ Uốn Mi Bóng Tối trên toàn chuỗi.',
    });
  }

  throw new PilotServiceError('Quyết định thẩm định không hợp lệ.', 400);
}
