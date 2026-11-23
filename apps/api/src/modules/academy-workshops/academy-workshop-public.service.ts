import type { FastifyInstance } from 'fastify';
import type {
  JoinAcademyWorkshopWithGoogleRequest,
  RegisterAcademyWorkshopResponse,
  RegisterAcademyWorkshopWithGoogleRequest,
  RegisterAcademyWorkshopWithZaloRequest,
  SelectAcademyWorkshopParticipantRequest,
} from '@mos-lab/shared';
import type { GoogleIdentity } from '../auth/google-identity.service.js';
import type { ZaloSocialIdentity } from '../auth/zalo-social-identity.service.js';
import {
  findExistingWorkshopRegistration,
  getWorkshopPublicRegistrationInfo,
  registerForWorkshop,
} from './public/workshop-public-registration.service.js';
import {
  getWorkshopSharedJoinInfo,
  joinWorkshopWithGoogle,
  selectWorkshopParticipant,
} from './public/workshop-public-lobby.service.js';
import type {
  ExternalWorkshopRegistrationIdentity,
  WorkshopRegistrationInput,
} from './public/workshop-public-helpers.js';

export {
  assertAcademyWorkshopLobbyOpen,
  buildPublicEquipment,
  buildPublicMenu,
  getAcademyWorkshopPublicRegistrationPhase,
  normalizeAcademyWorkshopPhone,
  validateEquipmentSelection,
  validateMenuSelections,
} from './public/workshop-public-helpers.js';

export class AcademyWorkshopPublicJoinService {
  static findExistingRegistration(
    fastify: FastifyInstance,
    rawRegistrationCode: unknown,
    identity: ExternalWorkshopRegistrationIdentity
  ): Promise<RegisterAcademyWorkshopResponse | null> {
    return findExistingWorkshopRegistration(fastify, rawRegistrationCode, identity);
  }

  static sharedJoinInfo(fastify: FastifyInstance, rawDisplayCode: unknown) {
    return getWorkshopSharedJoinInfo(fastify, rawDisplayCode);
  }

  static registrationInfo(fastify: FastifyInstance, rawRegistrationCode: unknown) {
    return getWorkshopPublicRegistrationInfo(fastify, rawRegistrationCode);
  }

  static register(
    fastify: FastifyInstance,
    rawRegistrationCode: unknown,
    input: WorkshopRegistrationInput,
    externalIdentity?: ExternalWorkshopRegistrationIdentity
  ): Promise<RegisterAcademyWorkshopResponse> {
    return registerForWorkshop(fastify, rawRegistrationCode, input, externalIdentity);
  }

  static registerWithGoogle(
    fastify: FastifyInstance,
    rawRegistrationCode: unknown,
    input: RegisterAcademyWorkshopWithGoogleRequest,
    identity: GoogleIdentity
  ): Promise<RegisterAcademyWorkshopResponse> {
    return this.register(fastify, rawRegistrationCode, input, { ...identity, provider: 'GOOGLE' });
  }

  static findExistingRegistrationWithGoogle(
    fastify: FastifyInstance,
    rawRegistrationCode: unknown,
    identity: GoogleIdentity
  ) {
    return this.findExistingRegistration(fastify, rawRegistrationCode, { ...identity, provider: 'GOOGLE' });
  }

  static registerWithZalo(
    fastify: FastifyInstance,
    rawRegistrationCode: unknown,
    input: RegisterAcademyWorkshopWithZaloRequest,
    identity: ZaloSocialIdentity
  ): Promise<RegisterAcademyWorkshopResponse> {
    return this.register(fastify, rawRegistrationCode, input, { ...identity, provider: 'ZALO' });
  }

  static findExistingRegistrationWithZalo(
    fastify: FastifyInstance,
    rawRegistrationCode: unknown,
    identity: ZaloSocialIdentity
  ) {
    return this.findExistingRegistration(fastify, rawRegistrationCode, { ...identity, provider: 'ZALO' });
  }

  static selectParticipant(fastify: FastifyInstance, input: SelectAcademyWorkshopParticipantRequest) {
    return selectWorkshopParticipant(fastify, input);
  }

  static joinWithGoogle(
    fastify: FastifyInstance,
    input: JoinAcademyWorkshopWithGoogleRequest,
    identity: GoogleIdentity
  ) {
    return joinWorkshopWithGoogle(fastify, input, identity);
  }
}
