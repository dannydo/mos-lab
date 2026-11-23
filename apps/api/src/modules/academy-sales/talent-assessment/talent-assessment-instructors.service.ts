import type { FastifyInstance } from 'fastify';
import type {
  AcademyTalentInstructorActionResponse,
  AcademyTalentInstructorSnapshot,
  ListAcademyTalentInstructorsResponse,
  UpsertAcademyTalentInstructorRequest,
} from '@mos-lab/shared';
import { AcademySalesError } from '../academy-sales.service.js';
import { normalizeInstructorConfiguration, toInstructor } from './talent-assessment-quote-and-validators.js';

export async function resolveInstructorSelections(
  fastify: FastifyInstance,
  selectedCourseIds: number[],
  selectedInstructorIdsByCourse: Record<string, number>
): Promise<Record<number, AcademyTalentInstructorSnapshot>> {
  if (!selectedCourseIds.length) return {};
  const instructors = await fastify.prisma.crm.crmAcademyInstructor.findMany({
    where: { isActive: true },
    include: { staff: { select: { avatarUrl: true } } },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  const options = instructors.map(toInstructor);
  const auto = options.find((instructor) => instructor.code === 'auto');
  if (!auto) throw new AcademySalesError('Chưa cấu hình giảng viên phân bổ tự động cho Academy.', 409);
  const byId = new Map(options.map((instructor) => [instructor.id, instructor]));
  const result: Record<number, AcademyTalentInstructorSnapshot> = {};
  for (const courseId of selectedCourseIds) {
    const instructorId = selectedInstructorIdsByCourse[String(courseId)] ?? auto.id;
    const instructor = byId.get(instructorId);
    if (!instructor) throw new AcademySalesError('Giảng viên đã chọn không còn hoạt động. Vui lòng chọn lại.', 409);
    result[courseId] = instructor;
  }
  return result;
}

export async function listInstructors(fastify: FastifyInstance): Promise<ListAcademyTalentInstructorsResponse> {
  const rows = await fastify.prisma.crm.crmAcademyInstructor.findMany({
    where: { isActive: true },
    include: { staff: { select: { avatarUrl: true } } },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  return { data: rows.map(toInstructor) };
}

/** Manager configuration includes inactive profiles; workshop pickers only use `listInstructors`. */
export async function listInstructorConfigurations(
  fastify: FastifyInstance
): Promise<ListAcademyTalentInstructorsResponse> {
  const rows = await fastify.prisma.crm.crmAcademyInstructor.findMany({
    include: { staff: { select: { avatarUrl: true } } },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  return { data: rows.map(toInstructor) };
}

async function assertInstructorConfigurationAvailable(
  fastify: FastifyInstance,
  config: ReturnType<typeof normalizeInstructorConfiguration>,
  currentId?: number
) {
  const codeTaken = await fastify.prisma.crm.crmAcademyInstructor.findFirst({
    where: currentId ? { code: config.code, NOT: { id: currentId } } : { code: config.code },
    select: { id: true },
  });
  if (codeTaken) throw new AcademySalesError('Mã giảng viên Academy đã tồn tại.', 409);
  if (config.staffId !== null) {
    const [staff, profileTaken] = await Promise.all([
      fastify.prisma.crm.crmStaff.findFirst({ where: { id: config.staffId, isActive: true }, select: { id: true } }),
      fastify.prisma.crm.crmAcademyInstructor.findFirst({
        where: currentId ? { staffId: config.staffId, NOT: { id: currentId } } : { staffId: config.staffId },
        select: { id: true },
      }),
    ]);
    if (!staff) throw new AcademySalesError('Nhân sự được chọn không còn hoạt động.', 400);
    if (profileTaken) throw new AcademySalesError('Nhân sự này đã có hồ sơ giảng viên Academy.', 409);
  }
}

export async function createInstructor(
  fastify: FastifyInstance,
  input: UpsertAcademyTalentInstructorRequest
): Promise<AcademyTalentInstructorActionResponse> {
  const config = normalizeInstructorConfiguration(input);
  if (config.code === 'auto') {
    throw new AcademySalesError('Không thể tạo thêm cấu hình phân bổ tự động.', 409);
  }
  await assertInstructorConfigurationAvailable(fastify, config);
  const row = await fastify.prisma.crm.crmAcademyInstructor.create({
    data: config,
    include: { staff: { select: { avatarUrl: true } } },
  });
  return { success: true, data: toInstructor(row), message: 'Đã thêm giảng viên Academy.' };
}

export async function updateInstructor(
  fastify: FastifyInstance,
  instructorId: number,
  input: UpsertAcademyTalentInstructorRequest
): Promise<AcademyTalentInstructorActionResponse> {
  const existing = await fastify.prisma.crm.crmAcademyInstructor.findUnique({ where: { id: instructorId } });
  if (!existing) throw new AcademySalesError('Không tìm thấy giảng viên Academy.', 404);
  const config = normalizeInstructorConfiguration(input);
  if (existing.code === 'auto' && (config.code !== 'auto' || config.surchargePercent !== 0 || !config.isActive)) {
    throw new AcademySalesError('Phân bổ tự động luôn phải hoạt động và miễn phí.', 400);
  }
  await assertInstructorConfigurationAvailable(fastify, config, existing.id);
  const row = await fastify.prisma.crm.crmAcademyInstructor.update({
    where: { id: existing.id },
    data: config,
    include: { staff: { select: { avatarUrl: true } } },
  });
  return { success: true, data: toInstructor(row), message: 'Đã cập nhật giảng viên Academy.' };
}
