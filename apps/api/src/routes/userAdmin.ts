import { Router, Request, Response } from 'express';
import {
  ApiResponse,
  ApiErrorResponse,
  PaginatedData,
  TenantMemberDto,
  TenantInvitationDto,
  AuditLogDto,
  PERMISSIONS,
  ResolvedTenant,
  CreateInvitationSchema,
  UpdateMembershipRolesSchema,
  UpdateMembershipStatusSchema,
  PaginationQuerySchema,
  AuditLogQuerySchema,
} from '@school/shared';
import { UserAdminService } from '../services/userAdminService.js';
import { IAuditRepository } from '../repositories/auditRepository.js';
import { IAuthRepository } from '../repositories/authRepository.js';
import {
  requireAuth,
  createTenantMembershipGuard,
  requirePermission,
} from '../middleware/authMiddleware.js';

export function createUserAdminRouter(
  userAdminService: UserAdminService,
  authRepo: IAuthRepository,
  auditRepo: IAuditRepository
): Router {
  const router = Router();
  const membershipGuard = createTenantMembershipGuard(authRepo);

  // All endpoints in this router require authentication and active tenant membership
  router.use(requireAuth);
  router.use(membershipGuard);

  /**
   * GET /api/v1/tenant/admin/users
   * Lists institutional members with bounded pagination and safe search/status filters
   */
  router.get('/users', requirePermission(PERMISSIONS.USERS_READ), async (req: Request, res: Response): Promise<void> => {
    const requestId = req.id || 'unknown';
    const tenant = req.tenant as ResolvedTenant;

    const queryParsed = PaginationQuerySchema.safeParse(req.query);
    if (!queryParsed.success) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid pagination query parameters.',
          details: queryParsed.error.flatten(),
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    try {
      const result = await userAdminService.listTenantMembers(tenant.id, queryParsed.data);
      const response: ApiResponse<PaginatedData<TenantMemberDto>> = {
        success: true,
        data: result,
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err: any) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message || 'Unable to retrieve institutional members.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(err.statusCode || 500).json(errorResponse);
    }
  });

  /**
   * GET /api/v1/tenant/admin/users/:id
   * Retrieves single member details by membership ID
   */
  router.get('/users/:id', requirePermission(PERMISSIONS.USERS_READ), async (req: Request, res: Response): Promise<void> => {
    const requestId = req.id || 'unknown';
    const tenant = req.tenant as ResolvedTenant;

    try {
      const member = await userAdminService.getTenantMember(tenant.id, req.params.id);
      if (!member) {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: 'MEMBER_NOT_FOUND',
            message: 'Institutional member not found.',
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        res.status(404).json(errorResponse);
        return;
      }

      const response: ApiResponse<TenantMemberDto> = {
        success: true,
        data: member,
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err: any) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message || 'Unable to retrieve member details.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(err.statusCode || 500).json(errorResponse);
    }
  });

  /**
   * PATCH /api/v1/tenant/admin/users/:id/roles
   * Assigns or updates tenant-scoped roles for an active membership
   */
  router.patch('/users/:id/roles', requirePermission(PERMISSIONS.ROLES_ASSIGN), async (req: Request, res: Response): Promise<void> => {
    const requestId = req.id || 'unknown';
    const tenant = req.tenant as ResolvedTenant;

    const parsed = UpdateMembershipRolesSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid role assignment payload.',
          details: parsed.error.flatten(),
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    try {
      await userAdminService.updateMembershipRoles(
        tenant.id,
        req.params.id,
        parsed.data,
        req.user!,
        {
          requestId,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
        }
      );

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'Institutional member roles successfully updated.' },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err: any) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message || 'Failed to update member roles.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(err.statusCode || 500).json(errorResponse);
    }
  });

  /**
   * PATCH /api/v1/tenant/admin/users/:id/status
   * Deactivates or reactivates a tenant membership
   */
  router.patch('/users/:id/status', requirePermission(PERMISSIONS.USERS_MANAGE), async (req: Request, res: Response): Promise<void> => {
    const requestId = req.id || 'unknown';
    const tenant = req.tenant as ResolvedTenant;

    const parsed = UpdateMembershipStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status update payload.',
          details: parsed.error.flatten(),
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    try {
      await userAdminService.updateMembershipStatus(
        tenant.id,
        req.params.id,
        parsed.data,
        req.user!,
        {
          requestId,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
        }
      );

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: {
          message: `Institutional membership status updated to ${parsed.data.status}.`,
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err: any) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message || 'Failed to update membership status.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(err.statusCode || 500).json(errorResponse);
    }
  });

  /**
   * GET /api/v1/tenant/admin/roles
   * Lists available assignable tenant-scoped roles
   */
  router.get('/roles', requirePermission(PERMISSIONS.ROLES_READ), async (req: Request, res: Response): Promise<void> => {
    const requestId = req.id || 'unknown';
    const tenant = req.tenant as ResolvedTenant;

    try {
      const roles = await authRepo.findRolesByTenant(tenant.id);
      const response: ApiResponse<Array<{ id: string; name: string; displayName: string }>> = {
        success: true,
        data: roles.map((r) => ({ id: r.id, name: r.name, displayName: r.displayName })),
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err: any) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve assignable roles.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(500).json(errorResponse);
    }
  });

  /**
   * GET /api/v1/tenant/admin/invitations
   * Lists tenant invitations
   */
  router.get('/invitations', requirePermission(PERMISSIONS.USERS_INVITE), async (req: Request, res: Response): Promise<void> => {
    const requestId = req.id || 'unknown';
    const tenant = req.tenant as ResolvedTenant;

    const queryParsed = PaginationQuerySchema.safeParse(req.query);
    const page = queryParsed.success ? queryParsed.data.page : 1;
    const limit = queryParsed.success ? queryParsed.data.limit : 20;
    const status = queryParsed.success ? (queryParsed.data.status as any) : undefined;

    try {
      const result = await userAdminService.listInvitations(tenant.id, { page, limit, status });
      const response: ApiResponse<PaginatedData<TenantInvitationDto>> = {
        success: true,
        data: result,
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err: any) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve institutional invitations.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(500).json(errorResponse);
    }
  });

  /**
   * POST /api/v1/tenant/admin/invitations
   * Creates an invitation for a new or existing user
   */
  router.post('/invitations', requirePermission(PERMISSIONS.USERS_INVITE), async (req: Request, res: Response): Promise<void> => {
    const requestId = req.id || 'unknown';
    const tenant = req.tenant as ResolvedTenant;

    const parsed = CreateInvitationSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid invitation payload.',
          details: parsed.error.flatten(),
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    try {
      const result = await userAdminService.createInvitation(
        tenant.id,
        req.user!,
        parsed.data,
        {
          tenantName: tenant.name,
          requestId,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
        }
      );

      // Return sanitized invitation DTO (rawToken is only in testing or dispatched via email)
      const response: ApiResponse<TenantInvitationDto> = {
        success: true,
        data: result.invitation,
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(201).json(response);
    } catch (err: any) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message || 'Failed to dispatch institutional invitation.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(err.statusCode || 500).json(errorResponse);
    }
  });

  /**
   * POST /api/v1/tenant/admin/invitations/:id/resend
   * Resends a pending invitation
   */
  router.post('/invitations/:id/resend', requirePermission(PERMISSIONS.USERS_INVITE), async (req: Request, res: Response): Promise<void> => {
    const requestId = req.id || 'unknown';
    const tenant = req.tenant as ResolvedTenant;

    try {
      await userAdminService.resendInvitation(
        tenant.id,
        req.params.id,
        req.user!,
        {
          tenantName: tenant.name,
          requestId,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
        }
      );

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'Invitation successfully resent.' },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err: any) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message || 'Failed to resend invitation.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(err.statusCode || 500).json(errorResponse);
    }
  });

  /**
   * POST /api/v1/tenant/admin/invitations/:id/revoke
   * Revokes a pending invitation
   */
  router.post('/invitations/:id/revoke', requirePermission(PERMISSIONS.USERS_INVITE), async (req: Request, res: Response): Promise<void> => {
    const requestId = req.id || 'unknown';
    const tenant = req.tenant as ResolvedTenant;

    try {
      await userAdminService.revokeInvitation(tenant.id, req.params.id, req.user!, {
        requestId,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      });

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'Invitation successfully revoked.' },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err: any) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message || 'Failed to revoke invitation.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(err.statusCode || 500).json(errorResponse);
    }
  });

  /**
   * GET /api/v1/tenant/admin/audit
   * Restricted, read-only audit log inspection for the current tenant
   */
  router.get('/audit', requirePermission(PERMISSIONS.AUDIT_READ), async (req: Request, res: Response): Promise<void> => {
    const requestId = req.id || 'unknown';
    const tenant = req.tenant as ResolvedTenant;

    const queryParsed = AuditLogQuerySchema.safeParse(req.query);
    if (!queryParsed.success) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid audit log query parameters.',
          details: queryParsed.error.flatten(),
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    try {
      const logs = await auditRepo.findAuditLogs({
        tenantId: tenant.id,
        page: queryParsed.data.page,
        limit: queryParsed.data.limit,
        action: queryParsed.data.action,
        entityType: queryParsed.data.entityType,
        actorId: queryParsed.data.actorId,
        outcome: queryParsed.data.outcome,
      });

      const response: ApiResponse<PaginatedData<AuditLogDto>> = {
        success: true,
        data: logs,
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    } catch (err: any) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve institutional audit logs.',
          requestId,
          timestamp: new Date().toISOString(),
        },
      };
      res.status(500).json(errorResponse);
    }
  });

  return router;
}
