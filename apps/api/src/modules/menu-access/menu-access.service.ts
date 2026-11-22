import type { FastifyInstance } from 'fastify';
import type {
  MenuAccessConfigurationResponse,
  MenuAccessInspectorResponse,
  MenuAccessPolicy,
  MenuAccessSidebarResponse,
  UpdateMenuAccessPolicyRequest,
} from '@mos-lab/shared';
import {
  invalidateRuntimeCache,
  isMenuAccessSuperAdmin,
  MenuAccessError,
  resolveMenuVisibility,
  type ActorScopes,
  type MenuAccessActor,
} from './service/menu-access-core.js';
import {
  checkMenuApiAccess,
  getMenuSidebarVisibility,
  recordMenuSecurityBlock,
} from './service/menu-access-guard.service.js';
import {
  getMenuAccessConfiguration,
  updateMenuAccessPolicy,
  updateMenuRoleGroupMatrix,
} from './service/menu-access-admin.service.js';
import { inspectMenuAccessPermissions } from './service/menu-access-inspector.service.js';

export { isMenuAccessSuperAdmin, MenuAccessError, resolveMenuVisibility, type ActorScopes, type MenuAccessActor };

export class MenuAccessService {
  static invalidateRuntimeCache(): void {
    invalidateRuntimeCache();
  }

  /**
   * API-level permission check used by `requireAuth` middleware.
   * Ensures backend API routes are locked in sync with the Unified Permission Matrix.
   */
  static async checkApiAccess(
    fastify: FastifyInstance,
    actor: MenuAccessActor,
    apiPath: string,
    method = 'GET'
  ): Promise<{ allowed: boolean; moduleKey: string; message?: string }> {
    return checkMenuApiAccess(fastify, actor, apiPath, method);
  }

  /**
   * Records a throttled 403 unauthorized access attempt in `crm_menu_access_audits`
   * so Super Admin can audit who attempted to access locked resources and when.
   */
  static async recordSecurityBlock(
    fastify: FastifyInstance,
    actor: MenuAccessActor,
    details: { moduleKey: string; method: string; path: string; reason: string; ip?: string }
  ): Promise<void> {
    return recordMenuSecurityBlock(fastify, actor, details);
  }

  static async getSidebarVisibility(
    fastify: FastifyInstance,
    actor: MenuAccessActor
  ): Promise<MenuAccessSidebarResponse> {
    return getMenuSidebarVisibility(fastify, actor);
  }

  static async getConfiguration(fastify: FastifyInstance): Promise<MenuAccessConfigurationResponse> {
    return getMenuAccessConfiguration(fastify);
  }

  static async updatePolicy(
    fastify: FastifyInstance,
    actor: MenuAccessActor,
    menuKey: string,
    payload: UpdateMenuAccessPolicyRequest
  ): Promise<MenuAccessPolicy> {
    return updateMenuAccessPolicy(fastify, actor, menuKey, payload);
  }

  /**
   * Batch-updates menu access policies for a specific Role Group (`ROLE` subjectType).
   * Enables Danny to toggle which menus a Role Group can access in one click.
   */
  static async updateRoleGroupMatrix(
    fastify: FastifyInstance,
    actor: MenuAccessActor,
    roleGroupId: number,
    allowedMenuKeys: string[]
  ): Promise<MenuAccessConfigurationResponse> {
    return updateMenuRoleGroupMatrix(fastify, actor, roleGroupId, allowedMenuKeys);
  }

  /**
   * Point-in-Time Permission & Audit Inspector ("Tra cứu Ai có quyền gì & Vào khi nào").
   * Reconstructs exact effective permissions and full audit timeline for a Staff member or Role Group.
   */
  static async inspectPermissions(
    fastify: FastifyInstance,
    query: { staffId?: number; roleGroupId?: number; at?: string }
  ): Promise<MenuAccessInspectorResponse> {
    return inspectMenuAccessPermissions(fastify, query);
  }
}
