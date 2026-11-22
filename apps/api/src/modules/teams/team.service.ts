import { FastifyInstance } from 'fastify';
import type { TeamListResponse, UpsertTeamRequest } from '@mos-lab/shared';
import { TeamConfigurationError, normalizeStaffAvatarUrl, normalizeTeamCode } from './service/team-formatters.js';
import {
  getActiveStaffIds as resolveActiveStaffIds,
  getActiveStaffIdsWithFallback as resolveActiveStaffIdsWithFallback,
  getActiveTeamCodesForStaff as resolveActiveTeamCodesForStaff,
  isActiveCrmStaffMember as checkActiveCrmStaffMember,
  isActiveCrmStaffMemberInDepartment as checkActiveCrmStaffMemberInDepartment,
} from './service/team-membership.service.js';
import { ensureLegacyStaffProfile as ensureLegacyProfile } from './service/team-legacy-profiles.js';
import {
  deleteTeam as removeTeam,
  getTeamDetailByCode as fetchTeamDetailByCode,
  listTeams as fetchTeams,
  updateTeamMembers as saveTeamMembers,
  upsertTeam as saveTeam,
} from './service/team-crud.service.js';

export { TeamConfigurationError, normalizeStaffAvatarUrl, normalizeTeamCode };

export class TeamService {
  static async getActiveStaffIds(fastify: FastifyInstance, teamCode: string): Promise<number[] | null> {
    return resolveActiveStaffIds(fastify, teamCode);
  }

  static async getActiveStaffIdsWithFallback(
    fastify: FastifyInstance,
    teamCode: string,
    fallbackConfigKey: string
  ): Promise<number[]> {
    return resolveActiveStaffIdsWithFallback(fastify, teamCode, fallbackConfigKey, (f, tc) =>
      this.getActiveStaffIds(f, tc)
    );
  }

  static async isActiveCrmStaffMember(
    fastify: FastifyInstance,
    teamCode: string,
    crmStaffId: number,
    fallbackConfigKey: string
  ): Promise<boolean> {
    return checkActiveCrmStaffMember(fastify, teamCode, crmStaffId, fallbackConfigKey, (f, tc, key) =>
      this.getActiveStaffIdsWithFallback(f, tc, key)
    );
  }

  static async isActiveCrmStaffMemberInDepartment(
    fastify: FastifyInstance,
    departmentCode: string,
    crmStaffId: number
  ): Promise<boolean> {
    return checkActiveCrmStaffMemberInDepartment(fastify, departmentCode, crmStaffId);
  }

  static async getActiveTeamCodesForStaff(
    fastify: FastifyInstance,
    crmStaffId: number,
    legacyStaffId?: number | null
  ): Promise<string[]> {
    return resolveActiveTeamCodesForStaff(fastify, crmStaffId, legacyStaffId);
  }

  static async listTeams(fastify: FastifyInstance): Promise<TeamListResponse> {
    return fetchTeams(fastify);
  }

  static async getTeamDetailByCode(fastify: FastifyInstance, code: string) {
    return fetchTeamDetailByCode(fastify, code);
  }

  static async ensureLegacyStaffProfile(fastify: FastifyInstance, legacyStaffId: number): Promise<boolean> {
    return ensureLegacyProfile(fastify, legacyStaffId);
  }

  static async updateTeamMembers(fastify: FastifyInstance, teamId: number, activeStaffIds: number[]): Promise<void> {
    return saveTeamMembers(fastify, teamId, activeStaffIds, (f, lid) => this.ensureLegacyStaffProfile(f, lid));
  }

  static async upsertTeam(fastify: FastifyInstance, data: UpsertTeamRequest, id?: number) {
    return saveTeam(fastify, data, id);
  }

  static async deleteTeam(fastify: FastifyInstance, id: number): Promise<{ code: string }> {
    return removeTeam(fastify, id);
  }
}
