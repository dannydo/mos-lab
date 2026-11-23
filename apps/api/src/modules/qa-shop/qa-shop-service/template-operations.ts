import fs from 'fs';
import path from 'path';
import type {
  QaChecklistSection,
  QaChecklistTemplate,
  QaImportSheetInput,
  QaShopBranchCode,
  SafeAny,
} from '@mos-lab/shared';
import { CV_PERSONAL_QA_TEMPLATE } from './cv-personal-template.js';
import type { QaCloneTemplateInput } from './types.js';

function resolveQaBranchName(branchCode: QaShopBranchCode, includeExtendedBranches: boolean): string {
  if (branchCode === 'DT') return 'Đề Thám (DT)';
  if (branchCode === 'EP') return 'Estella Place (EP)';
  if (includeExtendedBranches) {
    if (branchCode === 'ACA-DT') return 'Academy - Đề Thám (ACA-DT)';
    if (branchCode === 'HQ') return 'Văn Phòng HQ (HQ)';
  }
  return `Chi Nhánh ${branchCode}`;
}

function upsertTemplateInList(
  templates: QaChecklistTemplate[],
  updatedTemplate: QaChecklistTemplate,
  branchCode: QaShopBranchCode,
  matchId: string
): void {
  const idx = templates.findIndex((t) => t.branchCode === branchCode || t.id === matchId);
  if (idx >= 0) {
    templates[idx] = updatedTemplate;
  } else {
    templates.push(updatedTemplate);
  }
}

export function loadSyncedSheetTemplates(presetTemplates: QaChecklistTemplate[]): QaChecklistTemplate[] {
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
        const combined = [...syncedList, ...presetTemplates];
        const map = new Map<string, QaChecklistTemplate>();
        combined.forEach((t) => {
          if (!map.has(t.code)) {
            map.set(t.code, t);
          }
        });
        return Array.from(map.values());
      }
    }
  } catch (err) {
    console.error('Failed to load synced QA sheet templates:', err);
  }
  return [...presetTemplates];
}

export function persistTemplatesToDisk(templates: QaChecklistTemplate[]): void {
  try {
    const candidates = [
      path.join(process.cwd(), 'src/modules/qa-shop/qa-sheet-data.json'),
      path.join(process.cwd(), 'apps/api/src/modules/qa-shop/qa-sheet-data.json'),
      path.join(process.cwd(), 'dist/modules/qa-shop/qa-sheet-data.json'),
    ];
    const dataMap: Record<string, QaChecklistTemplate> = {};
    templates.forEach((t) => {
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

export function filterTemplatesByBranch(
  templates: QaChecklistTemplate[],
  branchCode?: QaShopBranchCode
): QaChecklistTemplate[] {
  if (branchCode && branchCode !== 'ALL') {
    return templates.filter(
      (t) => t.branchCode === branchCode || t.branchCode === 'ALL' || t.code === 'CV.Personal.Grooming.Station.check'
    );
  }
  return templates;
}

export function findTemplateByIdOrCode(templates: QaChecklistTemplate[], idOrCode: string): QaChecklistTemplate | null {
  return (
    templates.find((t) => t.id === idOrCode || t.code.toLowerCase() === idOrCode.toLowerCase()) ||
    (idOrCode === 'CV.Personal.Grooming.Station.check' || idOrCode === 'tpl-cv-personal-grooming-station'
      ? CV_PERSONAL_QA_TEMPLATE
      : null)
  );
}

export function importSheetTemplateIntoList(
  templates: QaChecklistTemplate[],
  input: QaImportSheetInput
): QaChecklistTemplate {
  const branchCode = input.branchCode || 'DT';
  const branchName = resolveQaBranchName(branchCode, false);
  const code = input.templateCode || `${branchCode}.Reception.DAILY.check`;

  const existingIndex = templates.findIndex((t) => t.code === code);

  // Parsed or generated template structure
  const newTemplate: QaChecklistTemplate = {
    id: existingIndex >= 0 ? templates[existingIndex].id : `tpl-${branchCode.toLowerCase()}-sheet-imported`,
    code,
    branchCode,
    branchName,
    title: `${branchCode}`,
    description: `Bộ tiêu chuẩn kiểm tra chất lượng cửa hàng chuẩn CSDL nội bộ (${input.sheetUrlOrId})`,
    updatedAt: new Date().toISOString(),
    sections:
      existingIndex >= 0
        ? templates[existingIndex].sections
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
    templates[existingIndex] = newTemplate;
  } else {
    templates.push(newTemplate);
  }

  return newTemplate;
}

export function updateTemplateInList(
  templates: QaChecklistTemplate[],
  branchCode: string,
  sections: SafeAny[]
): QaChecklistTemplate {
  const codeUpper = branchCode.toUpperCase() as QaShopBranchCode;
  let template = findTemplateByIdOrCode(templates, codeUpper);
  const branchName = resolveQaBranchName(codeUpper, true);

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

  upsertTemplateInList(templates, updatedTemplate, codeUpper, template.id);
  persistTemplatesToDisk(templates);
  return updatedTemplate;
}

export function cloneTemplateInList(
  templates: QaChecklistTemplate[],
  input: QaCloneTemplateInput
): QaChecklistTemplate {
  const srcBranch = (input.sourceBranchCode || 'DT').toUpperCase() as QaShopBranchCode;
  const tgtBranch = (input.targetBranchCode || 'EP').toUpperCase() as QaShopBranchCode;

  const srcTemplate = findTemplateByIdOrCode(templates, srcBranch);
  if (!srcTemplate) {
    throw new Error(`Mẫu tiêu chuẩn của chi nhánh ${srcBranch} không tồn tại`);
  }

  const tgtBranchName = resolveQaBranchName(tgtBranch, true);

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

  upsertTemplateInList(templates, updatedTemplate, tgtBranch, updatedTemplate.id);
  persistTemplatesToDisk(templates);
  return updatedTemplate;
}
