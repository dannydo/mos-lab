import type { FastifyInstance } from 'fastify';
import type {
  FrontendIssueAgAnalysis,
  FrontendIssueAgDispatchResponse,
  FrontendIssueClusterDispatchResponse,
  FrontendIssueClusterKey,
  FrontendIssueClusterListResponse,
  FrontendIssueListQuery,
  FrontendIssueListResponse,
  FrontendIssueMetrics,
  FrontendIssuePayload,
  FrontendIssueRecord,
  FrontendIssueStatus,
  FrontendIssueSummary,
  FrontendIssueSyncResponse,
} from '@mos-lab/shared';
import { generateAgAnalysis } from './services/telemetry-analysis.js';
import {
  batchDispatchPriorityClusters,
  dispatchCluster,
  getClusters,
} from './services/telemetry-cluster-dispatch.service.js';
import { CLUSTER_METADATA, classifyIssueIntoCluster } from './services/telemetry-clusters.js';
import { agAnalyze, agDispatch, convertToBugReport } from './services/telemetry-dispatch.service.js';
import {
  getMetrics,
  listIssues,
  recordIssue,
  syncResolvedClusters,
  updateIssueStatus,
} from './services/telemetry-queries.service.js';
import { clearMemoryIssues, getMemoryRawIssues, getMemorySummaries } from './services/telemetry-store.js';

export { CLUSTER_METADATA, classifyIssueIntoCluster, generateAgAnalysis };

export class FrontendTelemetryService {
  public static recordIssue(
    payload: FrontendIssuePayload,
    fastify?: FastifyInstance
  ): Promise<{ success: boolean; issueId: string }> {
    return recordIssue(payload, fastify);
  }

  public static list(fastify: FastifyInstance, query: FrontendIssueListQuery = {}): Promise<FrontendIssueListResponse> {
    return listIssues(fastify, query);
  }

  public static syncResolvedClusters(
    fastify: FastifyInstance,
    skipMetricsFetch = false
  ): Promise<FrontendIssueSyncResponse> {
    return syncResolvedClusters(fastify, skipMetricsFetch);
  }

  public static getMetrics(fastify: FastifyInstance, skipAutoSync = false): Promise<FrontendIssueMetrics> {
    return getMetrics(fastify, skipAutoSync);
  }

  public static updateStatus(
    fastify: FastifyInstance,
    id: number,
    status: FrontendIssueStatus,
    resolutionNotes?: string,
    actorStaffId?: number
  ): Promise<FrontendIssueRecord> {
    return updateIssueStatus(fastify, id, status, resolutionNotes, actorStaffId);
  }

  public static convertToBugReport(
    fastify: FastifyInstance,
    id: number,
    actorStaffId: number
  ): Promise<{ bugReportId: number; key: string }> {
    return convertToBugReport(fastify, id, actorStaffId);
  }

  public static agAnalyze(fastify: FastifyInstance, id: number): Promise<FrontendIssueAgAnalysis> {
    return agAnalyze(fastify, id);
  }

  public static agDispatch(
    fastify: FastifyInstance,
    id: number,
    actorStaffId: number
  ): Promise<FrontendIssueAgDispatchResponse> {
    return agDispatch(fastify, id, actorStaffId);
  }

  public static getClusters(fastify: FastifyInstance): Promise<FrontendIssueClusterListResponse> {
    return getClusters(fastify);
  }

  public static dispatchCluster(
    fastify: FastifyInstance,
    clusterKey: FrontendIssueClusterKey,
    actorStaffId: number
  ): Promise<FrontendIssueClusterDispatchResponse> {
    return dispatchCluster(fastify, clusterKey, actorStaffId);
  }

  public static batchDispatchPriorityClusters(
    fastify: FastifyInstance,
    actorStaffId: number
  ): Promise<FrontendIssueClusterDispatchResponse[]> {
    return batchDispatchPriorityClusters(fastify, actorStaffId);
  }

  public static getSummaries(limit = 50): FrontendIssueSummary[] {
    return getMemorySummaries(limit);
  }

  public static getRawIssues(limit = 50): FrontendIssuePayload[] {
    return getMemoryRawIssues(limit);
  }

  public static clear(): void {
    clearMemoryIssues();
  }
}
