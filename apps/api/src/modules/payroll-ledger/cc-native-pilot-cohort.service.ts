import type { FastifyInstance } from 'fastify';

export const CC_NATIVE_PAYROLL_PILOT_COHORT_CONFIG_KEY = 'CC_NATIVE_PAYROLL_PILOT_COHORT';

export type PilotSubject = {
  subjectKey: string;
  legacyStaffId: number;
  displayName: string;
};

export type PilotCohortConfig = {
  version: 'cc-native-pilot.v1';
  enabled: true;
  subjects: PilotSubject[];
};

function isCanonicalSubjectKey(subjectKey: string, legacyStaffId: number): boolean {
  return subjectKey === `staff:legacy:${legacyStaffId}`;
}

function parsePilotConfig(value: string | null | undefined): PilotCohortConfig {
  if (!value) throw new Error('Native CC pilot is not configured; evidence intake remains closed');
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('Native CC pilot configuration is invalid; evidence intake remains closed');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Native CC pilot configuration is invalid; evidence intake remains closed');
  }
  const candidate = parsed as Partial<PilotCohortConfig>;
  if (candidate.version !== 'cc-native-pilot.v1' || candidate.enabled !== true || !Array.isArray(candidate.subjects)) {
    throw new Error('Native CC pilot configuration is invalid; evidence intake remains closed');
  }
  const subjectKeys = new Set<string>();
  const subjects: PilotSubject[] = [];
  for (const subject of candidate.subjects) {
    if (
      !subject ||
      typeof subject !== 'object' ||
      typeof subject.subjectKey !== 'string' ||
      !Number.isSafeInteger(subject.legacyStaffId) ||
      subject.legacyStaffId <= 0 ||
      typeof subject.displayName !== 'string' ||
      !subject.displayName.trim() ||
      !isCanonicalSubjectKey(subject.subjectKey, subject.legacyStaffId) ||
      subjectKeys.has(subject.subjectKey)
    ) {
      throw new Error('Native CC pilot configuration is invalid; evidence intake remains closed');
    }
    subjectKeys.add(subject.subjectKey);
    subjects.push({
      subjectKey: subject.subjectKey,
      legacyStaffId: subject.legacyStaffId,
      displayName: subject.displayName.trim(),
    });
  }
  if (!subjects.length) throw new Error('Native CC pilot configuration is empty; evidence intake remains closed');
  return { version: 'cc-native-pilot.v1', enabled: true, subjects };
}

/**
 * Production pilot scope is a fail-closed mOS configuration. A request must
 * name an approved canonical subject before any immutable evidence or ledger
 * event can be written. Legacy identifiers only bind people; no Legacy
 * payroll value is read or accepted through this boundary.
 */
export class CcNativePilotCohortService {
  static async getCohort(fastify: FastifyInstance): Promise<PilotCohortConfig> {
    const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: CC_NATIVE_PAYROLL_PILOT_COHORT_CONFIG_KEY },
      select: { value: true },
    });
    return parsePilotConfig(configRecord?.value);
  }

  static async requireSubject(fastify: FastifyInstance, subjectKey: unknown): Promise<PilotSubject> {
    if (typeof subjectKey !== 'string' || !subjectKey.trim()) {
      throw new Error('Native CC evidence requires a pilot subject');
    }
    const config = await this.getCohort(fastify);
    const subject = config.subjects.find((candidate) => candidate.subjectKey === subjectKey);
    if (!subject) throw new Error('This CC is outside the approved native payroll pilot cohort');
    return subject;
  }
}

export const __test__ = { parsePilotConfig };
