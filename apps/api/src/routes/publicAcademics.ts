import { Router, Request, Response } from 'express';
import {
  ApiResponse,
  ResolvedTenant,
  ProgrammeQuerySchema,
  PublicProgrammeDto,
  AcademicLevelDto,
  AcademicDepartmentDto,
  CourseDto,
  PaginatedData,
} from '@school/shared';
import { AcademicService } from '../services/academicService.js';

export function createPublicAcademicsRouter(academicService: AcademicService): Router {
  const router = Router();

  /**
   * GET /api/v1/tenant/public/academics/levels
   * Public list of active academic levels for the resolved tenant
   */
  router.get('/levels', async (req: Request, res: Response): Promise<void> => {
    const tenant = req.tenant as ResolvedTenant;
    try {
      const levels = await academicService.listLevels(tenant.id, true);
      const response: ApiResponse<AcademicLevelDto[]> = {
        success: true,
        data: levels,
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

  /**
   * GET /api/v1/tenant/public/academics/departments
   * Public list of active academic departments for the resolved tenant
   */
  router.get('/departments', async (req: Request, res: Response): Promise<void> => {
    const tenant = req.tenant as ResolvedTenant;
    try {
      const departments = await academicService.listDepartments(tenant.id, true);
      const response: ApiResponse<AcademicDepartmentDto[]> = {
        success: true,
        data: departments,
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

  /**
   * GET /api/v1/tenant/public/academics/programmes
   * Public list of published, active programmes with search & filtering
   */
  router.get('/programmes', async (req: Request, res: Response): Promise<void> => {
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
      const result = await academicService.listPublicProgrammes(tenant.id, parsed.data);
      const response: ApiResponse<PaginatedData<PublicProgrammeDto>> = {
        success: true,
        data: result,
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

  /**
   * GET /api/v1/tenant/public/academics/programmes/:slug
   * Public detail of a specific programme by tenant-scoped slug
   * Fails closed (404) if draft, inactive, archived, or not found.
   */
  router.get('/programmes/:slug', async (req: Request, res: Response): Promise<void> => {
    const tenant = req.tenant as ResolvedTenant;
    const slug = req.params.slug;

    try {
      const programme = await academicService.getPublicProgrammeBySlug(tenant.id, slug);
      if (!programme) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PROGRAMME_NOT_FOUND',
            message: `Programme '${slug}' was not found or is not currently published.`,
            requestId: req.id || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const response: ApiResponse<PublicProgrammeDto> = {
        success: true,
        data: programme,
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

  /**
   * GET /api/v1/tenant/public/academics/courses
   * Public list of published courses
   */
  router.get('/courses', async (req: Request, res: Response): Promise<void> => {
    const tenant = req.tenant as ResolvedTenant;
    const levelId = req.query.levelId as string | undefined;
    const departmentId = req.query.departmentId as string | undefined;

    try {
      const courses = await academicService.listCourses(tenant.id, levelId, departmentId);
      const published = courses.filter((c) => c.status === 'PUBLISHED');
      const response: ApiResponse<CourseDto[]> = {
        success: true,
        data: published,
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

  return router;
}
