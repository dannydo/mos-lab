import type { FastifyInstance } from 'fastify';
import type {
  AcademyTalentAssessmentActionResponse,
  AcademyTalentInstructorActionResponse,
  AcademyTalentPaymentTraceResponse,
  CreateAcademyTalentAssessmentRequest,
  ListAcademyTalentAssessmentsResponse,
  ListAcademyTalentInstructorsResponse,
  ListAcademyTalentPaymentManagementParams,
  ListAcademyTalentPaymentManagementResponse,
  PreviewAcademyTalentAssessmentQuoteRequest,
  PreviewAcademyTalentAssessmentQuoteResponse,
  RecordAcademyTalentPaymentRequest,
  UpdateAcademyTalentAssessmentRequest,
  UpsertAcademyTalentInstructorRequest,
} from '@mos-lab/shared';
import type { AcademyActor } from './academy-sales.service.js';
import { printTalentInvoice, recordTalentPayment } from './talent-assessment/talent-assessment-billing.service.js';
import {
  createInstructor,
  listInstructorConfigurations,
  listInstructors,
  updateInstructor,
} from './talent-assessment/talent-assessment-instructors.service.js';
import { getPaymentTrace, listPaymentManagement } from './talent-assessment/talent-assessment-payment-audit.service.js';
import {
  SCORE_KEYS,
  assertValidAcademyTalentCourseSelection,
  buildAcademyTalentQuote,
  calculateAcademyTalentPaymentStatus,
} from './talent-assessment/talent-assessment-quote-and-validators.js';
import {
  createTalentAssessment,
  listAssessmentsForLead,
  previewTalentQuote,
  updateTalentAssessment,
} from './talent-assessment/talent-assessment-workflow.service.js';

export { assertValidAcademyTalentCourseSelection, buildAcademyTalentQuote, calculateAcademyTalentPaymentStatus };

export class AcademyTalentAssessmentService {
  static listPaymentManagement(
    fastify: FastifyInstance,
    actor: AcademyActor,
    params: ListAcademyTalentPaymentManagementParams
  ): Promise<ListAcademyTalentPaymentManagementResponse> {
    return listPaymentManagement(fastify, actor, params);
  }

  static getPaymentTrace(
    fastify: FastifyInstance,
    actor: AcademyActor,
    assessmentId: number
  ): Promise<AcademyTalentPaymentTraceResponse> {
    return getPaymentTrace(fastify, actor, assessmentId);
  }

  static listInstructors(fastify: FastifyInstance): Promise<ListAcademyTalentInstructorsResponse> {
    return listInstructors(fastify);
  }

  static listInstructorConfigurations(fastify: FastifyInstance): Promise<ListAcademyTalentInstructorsResponse> {
    return listInstructorConfigurations(fastify);
  }

  static createInstructor(
    fastify: FastifyInstance,
    input: UpsertAcademyTalentInstructorRequest
  ): Promise<AcademyTalentInstructorActionResponse> {
    return createInstructor(fastify, input);
  }

  static updateInstructor(
    fastify: FastifyInstance,
    instructorId: number,
    input: UpsertAcademyTalentInstructorRequest
  ): Promise<AcademyTalentInstructorActionResponse> {
    return updateInstructor(fastify, instructorId, input);
  }

  static listForLead(
    fastify: FastifyInstance,
    actor: AcademyActor,
    leadId: number
  ): Promise<ListAcademyTalentAssessmentsResponse> {
    return listAssessmentsForLead(fastify, actor, leadId);
  }

  static previewQuote(
    fastify: FastifyInstance,
    actor: AcademyActor,
    leadId: number,
    input: PreviewAcademyTalentAssessmentQuoteRequest = {}
  ): Promise<PreviewAcademyTalentAssessmentQuoteResponse> {
    return previewTalentQuote(fastify, actor, leadId, input);
  }

  static create(
    fastify: FastifyInstance,
    actor: AcademyActor,
    leadId: number,
    input: CreateAcademyTalentAssessmentRequest = {}
  ): Promise<AcademyTalentAssessmentActionResponse> {
    return createTalentAssessment(fastify, actor, leadId, input);
  }

  static update(
    fastify: FastifyInstance,
    actor: AcademyActor,
    assessmentId: number,
    input: UpdateAcademyTalentAssessmentRequest
  ): Promise<AcademyTalentAssessmentActionResponse> {
    return updateTalentAssessment(fastify, actor, assessmentId, input);
  }

  static printInvoice(
    fastify: FastifyInstance,
    actor: AcademyActor,
    assessmentId: number
  ): Promise<AcademyTalentAssessmentActionResponse> {
    return printTalentInvoice(fastify, actor, assessmentId);
  }

  static recordPayment(
    fastify: FastifyInstance,
    actor: AcademyActor,
    assessmentId: number,
    input: RecordAcademyTalentPaymentRequest
  ): Promise<AcademyTalentAssessmentActionResponse> {
    return recordTalentPayment(fastify, actor, assessmentId, input);
  }
}

// Keep score field names visible to coverage-oriented unit tests and future
// form validation changes without allowing callers to mutate the list.
export const ACADEMY_TALENT_SCORE_FIELDS = SCORE_KEYS;
