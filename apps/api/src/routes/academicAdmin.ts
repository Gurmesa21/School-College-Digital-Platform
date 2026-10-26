import { Router, Request, Response } from 'express';
import {
  ApiResponse,
  ApiErrorResponse,
  PaginatedData,
  PERMISSIONS,
  ResolvedTenant,
  CreateAcademicLevelSchema,
  UpdateAcademicLevelSchema,
  CreateAcademicDepartmentSchema,
  UpdateAcademicDepartmentSchema,
  CreateProgrammeSchema,
  UpdateProgrammeSchema,
  ProgrammeQuerySchema,
  CreateCourseSchema,
  UpdateCourseSchema,
  AssignCoursesToProgrammeSchema,
  AcademicLevelDto,
  AcademicDepartmentDto,
  ProgrammeDto,
  CourseDto,
} from '@school/shared';
import { AcademicService, AcademicAuditContext } from '../services/academicService.js';
import { IAuthRepository } from '../repositories/authRepository.js';
import {
  requireAuth,
  createTenantMembershipGuard,
  requirePermission,
} from '../middleware/authMiddleware.js';

export function createAcademicAdminRouter(
  academicService: AcademicService,
  authRepo: IAuthRepository
): Router {
  const router = Router();
  const membershipGuard = createTenantMembershipGuard(authRepo);

  router.use(requireAuth);
  router.use(membershipGuard);

  const getContext = (req: Request): AcademicAuditContext => ({
    actorId: req.user?.id || null,
    actorEmail: req.user?.email || null,
    ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null,
    requestId: req.id || null,
  });

  // --------------------------------------------------------------------------
  // Academic Levels
  // --------------------------------------------------------------------------
  router.get('/levels', requirePermission(PERMISSIONS.ACADEMICS_READ), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const onlyActive = req.query.active === 'true';
    try {
      const items = await academicService.listLevels(tenant.id, onlyActive);
      const response: ApiResponse<AcademicLevelDto[]> = {
        success: true,
        data: items,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      };
      res.status(200).json(response);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  router.post('/levels', requirePermission(PERMISSIONS.ACADEMICS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const user = req.user!;
    const parsed = CreateAcademicLevelSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Invalid academic level payload', details: parsed.error.format(), requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
      return;
    }
    try {
      const created = await academicService.createLevel(tenant.id, user, parsed.data, getContext(req));
      res.status(201).json({
        success: true,
        data: created,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const isConflict = err.message.startsWith('SLUG_ALREADY_EXISTS');
      res.status(isConflict ? 409 : 500).json({
        success: false,
        error: { code: isConflict ? 'SLUG_ALREADY_EXISTS' : 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  router.put('/levels/:id', requirePermission(PERMISSIONS.ACADEMICS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const user = req.user!;
    const parsed = UpdateAcademicLevelSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Invalid level update payload', details: parsed.error.format(), requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
      return;
    }
    try {
      const updated = await academicService.updateLevel(tenant.id, req.params.id, user, parsed.data, getContext(req));
      res.status(200).json({
        success: true,
        data: updated,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const isNotFound = err.message.startsWith('LEVEL_NOT_FOUND');
      const isConflict = err.message.startsWith('SLUG_ALREADY_EXISTS');
      const status = isNotFound ? 404 : isConflict ? 409 : 500;
      res.status(status).json({
        success: false,
        error: { code: isNotFound ? 'LEVEL_NOT_FOUND' : isConflict ? 'SLUG_ALREADY_EXISTS' : 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  router.delete('/levels/:id', requirePermission(PERMISSIONS.ACADEMICS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const user = req.user!;
    try {
      await academicService.deleteLevel(tenant.id, req.params.id, user, getContext(req));
      res.status(200).json({
        success: true,
        data: { id: req.params.id, deleted: true },
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const isNotFound = err.message.startsWith('LEVEL_NOT_FOUND');
      res.status(isNotFound ? 404 : 500).json({
        success: false,
        error: { code: isNotFound ? 'LEVEL_NOT_FOUND' : 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  // --------------------------------------------------------------------------
  // Academic Departments / Faculties
  // --------------------------------------------------------------------------
  router.get('/departments', requirePermission(PERMISSIONS.ACADEMICS_READ), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const onlyActive = req.query.active === 'true';
    try {
      const items = await academicService.listDepartments(tenant.id, onlyActive);
      res.status(200).json({
        success: true,
        data: items,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  router.post('/departments', requirePermission(PERMISSIONS.ACADEMICS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const user = req.user!;
    const parsed = CreateAcademicDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Invalid department payload', details: parsed.error.format(), requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
      return;
    }
    try {
      const created = await academicService.createDepartment(tenant.id, user, parsed.data, getContext(req));
      res.status(201).json({
        success: true,
        data: created,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const isConflict = err.message.startsWith('SLUG_ALREADY_EXISTS');
      const isBadParent = err.message.startsWith('PARENT_DEPARTMENT_NOT_FOUND');
      res.status(isConflict ? 409 : isBadParent ? 400 : 500).json({
        success: false,
        error: { code: isConflict ? 'SLUG_ALREADY_EXISTS' : isBadParent ? 'PARENT_DEPARTMENT_NOT_FOUND' : 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  router.put('/departments/:id', requirePermission(PERMISSIONS.ACADEMICS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const user = req.user!;
    const parsed = UpdateAcademicDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Invalid department update payload', details: parsed.error.format(), requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
      return;
    }
    try {
      const updated = await academicService.updateDepartment(tenant.id, req.params.id, user, parsed.data, getContext(req));
      res.status(200).json({
        success: true,
        data: updated,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const isNotFound = err.message.startsWith('DEPARTMENT_NOT_FOUND');
      const isConflict = err.message.startsWith('SLUG_ALREADY_EXISTS');
      const isInvalid = err.message.startsWith('INVALID_RELATION') || err.message.startsWith('PARENT_DEPARTMENT_NOT_FOUND');
      const status = isNotFound ? 404 : isConflict ? 409 : isInvalid ? 400 : 500;
      res.status(status).json({
        success: false,
        error: { code: isNotFound ? 'DEPARTMENT_NOT_FOUND' : isConflict ? 'SLUG_ALREADY_EXISTS' : isInvalid ? 'INVALID_RELATION' : 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  router.delete('/departments/:id', requirePermission(PERMISSIONS.ACADEMICS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const user = req.user!;
    try {
      await academicService.deleteDepartment(tenant.id, req.params.id, user, getContext(req));
      res.status(200).json({
        success: true,
        data: { id: req.params.id, deleted: true },
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const isNotFound = err.message.startsWith('DEPARTMENT_NOT_FOUND');
      res.status(isNotFound ? 404 : 500).json({
        success: false,
        error: { code: isNotFound ? 'DEPARTMENT_NOT_FOUND' : 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  // --------------------------------------------------------------------------
  // Programmes
  // --------------------------------------------------------------------------
  router.get('/programmes', requirePermission(PERMISSIONS.ACADEMICS_READ), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const parsed = ProgrammeQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_QUERY_PARAMS', message: 'Query validation failed', details: parsed.error.format(), requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
      return;
    }
    try {
      const result = await academicService.listProgrammes(tenant.id, parsed.data);
      res.status(200).json({
        success: true,
        data: result,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  router.get('/programmes/:id', requirePermission(PERMISSIONS.ACADEMICS_READ), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    try {
      const item = await academicService.getProgrammeById(tenant.id, req.params.id);
      if (!item) {
        res.status(404).json({
          success: false,
          error: { code: 'PROGRAMME_NOT_FOUND', message: 'Programme not found', requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
        });
        return;
      }
      res.status(200).json({
        success: true,
        data: item,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  router.post('/programmes', requirePermission(PERMISSIONS.ACADEMICS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const user = req.user!;
    const parsed = CreateProgrammeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Invalid programme payload', details: parsed.error.format(), requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
      return;
    }

    // If publishing, ensure user has ACADEMICS_PUBLISH permission
    if (parsed.data.status === 'PUBLISHED') {
      const hasPublish = req.user?.isSuperAdmin || (req.permissions || []).includes(PERMISSIONS.ACADEMICS_PUBLISH);
      if (!hasPublish) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN_PUBLISH', message: 'You lack permission to publish programmes directly', requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
        });
        return;
      }
    }

    try {
      const created = await academicService.createProgramme(tenant.id, user, parsed.data, getContext(req));
      res.status(201).json({
        success: true,
        data: created,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const isConflict = err.message.startsWith('SLUG_ALREADY_EXISTS');
      const isInvalidRel = err.message.startsWith('INVALID_LEVEL') || err.message.startsWith('INVALID_DEPARTMENT');
      const status = isConflict ? 409 : isInvalidRel ? 400 : 500;
      res.status(status).json({
        success: false,
        error: { code: isConflict ? 'SLUG_ALREADY_EXISTS' : isInvalidRel ? 'INVALID_RELATION' : 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  router.put('/programmes/:id', requirePermission(PERMISSIONS.ACADEMICS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const user = req.user!;
    const parsed = UpdateProgrammeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Invalid programme update payload', details: parsed.error.format(), requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
      return;
    }

    // If updating to PUBLISHED status, ensure user has ACADEMICS_PUBLISH permission
    if (parsed.data.status === 'PUBLISHED') {
      const hasPublish = req.user?.isSuperAdmin || (req.permissions || []).includes(PERMISSIONS.ACADEMICS_PUBLISH);
      if (!hasPublish) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN_PUBLISH', message: 'You lack permission to publish programmes', requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
        });
        return;
      }
    }

    try {
      const updated = await academicService.updateProgramme(tenant.id, req.params.id, user, parsed.data, getContext(req));
      res.status(200).json({
        success: true,
        data: updated,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const isNotFound = err.message.startsWith('PROGRAMME_NOT_FOUND');
      const isConflict = err.message.startsWith('SLUG_ALREADY_EXISTS');
      const isInvalidRel = err.message.startsWith('INVALID_LEVEL') || err.message.startsWith('INVALID_DEPARTMENT');
      const status = isNotFound ? 404 : isConflict ? 409 : isInvalidRel ? 400 : 500;
      res.status(status).json({
        success: false,
        error: { code: isNotFound ? 'PROGRAMME_NOT_FOUND' : isConflict ? 'SLUG_ALREADY_EXISTS' : isInvalidRel ? 'INVALID_RELATION' : 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  router.patch('/programmes/:id/status', requirePermission(PERMISSIONS.ACADEMICS_PUBLISH), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const user = req.user!;
    const { status } = req.body;
    if (!status || !['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Status must be DRAFT, PUBLISHED, or ARCHIVED', requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
      return;
    }

    try {
      const updated = await academicService.setProgrammeStatus(tenant.id, req.params.id, user, status, getContext(req));
      res.status(200).json({
        success: true,
        data: updated,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const isNotFound = err.message.startsWith('PROGRAMME_NOT_FOUND');
      res.status(isNotFound ? 404 : 500).json({
        success: false,
        error: { code: isNotFound ? 'PROGRAMME_NOT_FOUND' : 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  router.delete('/programmes/:id', requirePermission(PERMISSIONS.ACADEMICS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const user = req.user!;
    try {
      await academicService.deleteProgramme(tenant.id, req.params.id, user, getContext(req));
      res.status(200).json({
        success: true,
        data: { id: req.params.id, deleted: true },
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const isNotFound = err.message.startsWith('PROGRAMME_NOT_FOUND');
      res.status(isNotFound ? 404 : 500).json({
        success: false,
        error: { code: isNotFound ? 'PROGRAMME_NOT_FOUND' : 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  // --------------------------------------------------------------------------
  // Courses / Subjects & Linkages
  // --------------------------------------------------------------------------
  router.get('/courses', requirePermission(PERMISSIONS.ACADEMICS_READ), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const levelId = req.query.levelId as string | undefined;
    const departmentId = req.query.departmentId as string | undefined;
    try {
      const items = await academicService.listCourses(tenant.id, levelId, departmentId);
      res.status(200).json({
        success: true,
        data: items,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  router.post('/courses', requirePermission(PERMISSIONS.ACADEMICS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const user = req.user!;
    const parsed = CreateCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Invalid course payload', details: parsed.error.format(), requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
      return;
    }
    try {
      const created = await academicService.createCourse(tenant.id, user, parsed.data, getContext(req));
      res.status(201).json({
        success: true,
        data: created,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const isConflict = err.message.startsWith('SLUG_ALREADY_EXISTS');
      const isInvalidRel = err.message.startsWith('INVALID_LEVEL') || err.message.startsWith('INVALID_DEPARTMENT');
      const status = isConflict ? 409 : isInvalidRel ? 400 : 500;
      res.status(status).json({
        success: false,
        error: { code: isConflict ? 'SLUG_ALREADY_EXISTS' : isInvalidRel ? 'INVALID_RELATION' : 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  router.put('/courses/:id', requirePermission(PERMISSIONS.ACADEMICS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const user = req.user!;
    const parsed = UpdateCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Invalid course update payload', details: parsed.error.format(), requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
      return;
    }
    try {
      const updated = await academicService.updateCourse(tenant.id, req.params.id, user, parsed.data, getContext(req));
      res.status(200).json({
        success: true,
        data: updated,
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const isNotFound = err.message.startsWith('COURSE_NOT_FOUND');
      const isConflict = err.message.startsWith('SLUG_ALREADY_EXISTS');
      const status = isNotFound ? 404 : isConflict ? 409 : 500;
      res.status(status).json({
        success: false,
        error: { code: isNotFound ? 'COURSE_NOT_FOUND' : isConflict ? 'SLUG_ALREADY_EXISTS' : 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  router.delete('/courses/:id', requirePermission(PERMISSIONS.ACADEMICS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const user = req.user!;
    try {
      await academicService.deleteCourse(tenant.id, req.params.id, user, getContext(req));
      res.status(200).json({
        success: true,
        data: { id: req.params.id, deleted: true },
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const isNotFound = err.message.startsWith('COURSE_NOT_FOUND');
      res.status(isNotFound ? 404 : 500).json({
        success: false,
        error: { code: isNotFound ? 'COURSE_NOT_FOUND' : 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  router.post('/programmes/:id/courses', requirePermission(PERMISSIONS.ACADEMICS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const user = req.user!;
    const parsed = AssignCoursesToProgrammeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Invalid course assignment payload', details: parsed.error.format(), requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
      return;
    }
    try {
      await academicService.assignCoursesToProgramme(
        tenant.id,
        req.params.id,
        parsed.data.courseIds,
        user,
        parsed.data.isRequired,
        parsed.data.term,
        getContext(req)
      );
      res.status(200).json({
        success: true,
        data: { programmeId: req.params.id, assigned: true, courseCount: parsed.data.courseIds.length },
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const isNotFound = err.message.startsWith('PROGRAMME_NOT_FOUND') || err.message.startsWith('COURSE_NOT_FOUND');
      res.status(isNotFound ? 404 : 500).json({
        success: false,
        error: { code: isNotFound ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  router.delete('/programmes/:id/courses/:courseId', requirePermission(PERMISSIONS.ACADEMICS_WRITE), async (req: Request, res: Response) => {
    const tenant = req.tenant as ResolvedTenant;
    const user = req.user!;
    try {
      await academicService.removeCourseFromProgramme(tenant.id, req.params.id, req.params.courseId, user, getContext(req));
      res.status(200).json({
        success: true,
        data: { programmeId: req.params.id, courseId: req.params.courseId, removed: true },
        meta: { requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      const isNotFound = err.message.startsWith('PROGRAMME_NOT_FOUND');
      res.status(isNotFound ? 404 : 500).json({
        success: false,
        error: { code: isNotFound ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: err.message, requestId: req.id || 'unknown', timestamp: new Date().toISOString() },
      });
    }
  });

  return router;
}
