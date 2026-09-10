import { createHash } from 'node:crypto';
import type { NativeCcPilotHistorySnapshot } from '@mos-lab/shared';
import type { FastifyInstance } from 'fastify';
import { CcNativePilotCohortService, type PilotCohortConfig } from './cc-native-pilot-cohort.service.js';

export const CC_NATIVE_PAYROLL_PILOT_HISTORY_CONFIG_KEY = 'CC_NATIVE_PAYROLL_PILOT_HISTORY_V1';

export type HistoryWithoutHash = Omit<NativeCcPilotHistorySnapshot, 'sourceHash'>;

function stableSnapshotHash(snapshot: HistoryWithoutHash): string {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}

export function createVerifiedHistorySnapshot(snapshot: HistoryWithoutHash): NativeCcPilotHistorySnapshot {
  return { ...snapshot, sourceHash: stableSnapshotHash(snapshot) };
}

function assertMoney(value: unknown): asserts value is number {
  if (!Number.isSafeInteger(value)) throw new Error('Native CC pilot history contains an invalid whole-VND amount');
}

function parseHistorySnapshot(value: string | null | undefined): NativeCcPilotHistorySnapshot | null {
  if (!value) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('Native CC pilot history is invalid and cannot be displayed');
  }
  if (!parsed || typeof parsed !== 'object')
    throw new Error('Native CC pilot history is invalid and cannot be displayed');
  const snapshot = parsed as Partial<NativeCcPilotHistorySnapshot>;
  if (
    snapshot.version !== 'cc-native-pilot-history.v1' ||
    snapshot.source !== 'LOCAL_LEGACY_PARITY_REPLAY' ||
    typeof snapshot.verifiedAt !== 'string' ||
    !Number.isFinite(Date.parse(snapshot.verifiedAt)) ||
    typeof snapshot.sourceHash !== 'string' ||
    !/^[a-f0-9]{64}$/.test(snapshot.sourceHash) ||
    !Array.isArray(snapshot.subjects)
  ) {
    throw new Error('Native CC pilot history is invalid and cannot be displayed');
  }

  const subjects = snapshot.subjects.map((subject) => {
    if (
      !subject ||
      typeof subject !== 'object' ||
      typeof subject.subjectKey !== 'string' ||
      !subject.subjectKey.trim()
    ) {
      throw new Error('Native CC pilot history is invalid and cannot be displayed');
    }
    if (typeof subject.displayName !== 'string' || !subject.displayName.trim() || !Array.isArray(subject.months)) {
      throw new Error('Native CC pilot history is invalid and cannot be displayed');
    }
    const monthKeys = new Set<string>();
    const months = subject.months.map((month) => {
      if (
        !month ||
        typeof month !== 'object' ||
        typeof month.periodKey !== 'string' ||
        !/^\d{4}-(0[1-9]|1[0-2])$/.test(month.periodKey)
      ) {
        throw new Error('Native CC pilot history is invalid and cannot be displayed');
      }
      if (monthKeys.has(month.periodKey)) throw new Error('Native CC pilot history repeats a payroll month');
      monthKeys.add(month.periodKey);
      for (const amount of [
        month.rawXoayVnd,
        month.dailyBonusVnd,
        month.heldXoayVnd,
        month.effectiveXoayVnd,
        month.cashTipVnd,
        month.componentTotalVnd,
      ]) {
        assertMoney(amount);
      }
      if (!month.sourceCounts || typeof month.sourceCounts !== 'object') {
        throw new Error('Native CC pilot history is invalid and cannot be displayed');
      }
      for (const count of [
        month.sourceCounts.xoayLedgerRows,
        month.sourceCounts.dailyCloses,
        month.sourceCounts.cashTipRows,
      ]) {
        if (!Number.isSafeInteger(count) || count < 0) {
          throw new Error('Native CC pilot history contains an invalid source count');
        }
      }
      if (month.rawXoayVnd - month.heldXoayVnd !== month.effectiveXoayVnd) {
        throw new Error('Native CC pilot history has an inconsistent Xoay cap trace');
      }
      if (month.effectiveXoayVnd + month.dailyBonusVnd + month.cashTipVnd !== month.componentTotalVnd) {
        throw new Error('Native CC pilot history has an inconsistent monthly total');
      }
      return month;
    });
    return { subjectKey: subject.subjectKey.trim(), displayName: subject.displayName.trim(), months };
  });
  const subjectKeys = new Set(subjects.map((subject) => subject.subjectKey));
  if (subjectKeys.size !== subjects.length || !subjects.length) {
    throw new Error('Native CC pilot history repeats a subject');
  }
  const candidate: NativeCcPilotHistorySnapshot = {
    version: snapshot.version,
    source: snapshot.source,
    verifiedAt: snapshot.verifiedAt,
    sourceHash: snapshot.sourceHash,
    subjects,
  };
  const { sourceHash: _sourceHash, ...hashable } = candidate;
  if (stableSnapshotHash(hashable) !== candidate.sourceHash) {
    throw new Error('Native CC pilot history hash does not match its verified components');
  }
  return candidate;
}

function assertMatchesCohort(snapshot: NativeCcPilotHistorySnapshot, cohort: PilotCohortConfig) {
  const allowed = new Map(cohort.subjects.map((subject) => [subject.subjectKey, subject.displayName]));
  if (snapshot.subjects.length !== allowed.size) {
    throw new Error('Native CC pilot history does not match the approved pilot cohort');
  }
  for (const subject of snapshot.subjects) {
    if (allowed.get(subject.subjectKey) !== subject.displayName) {
      throw new Error('Native CC pilot history does not match the approved pilot cohort');
    }
  }
}

/**
 * The dashboard may show a local parity artifact only after it has been
 * copied as a hashed snapshot. Production never reads Legacy to render it.
 */
export class CcNativePilotHistoryService {
  static async get(fastify: FastifyInstance): Promise<NativeCcPilotHistorySnapshot | null> {
    const [cohort, record] = await Promise.all([
      CcNativePilotCohortService.getCohort(fastify),
      fastify.prisma.crm.crmConfig.findUnique({
        where: { key: CC_NATIVE_PAYROLL_PILOT_HISTORY_CONFIG_KEY },
        select: { value: true },
      }),
    ]);
    const snapshot = parseHistorySnapshot(record?.value);
    if (snapshot) assertMatchesCohort(snapshot, cohort);
    return snapshot;
  }
}

export const __test__ = { stableSnapshotHash, parseHistorySnapshot, assertMatchesCohort };
