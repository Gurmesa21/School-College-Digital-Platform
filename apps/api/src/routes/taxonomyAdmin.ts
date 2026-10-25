import express, { Router, Request, Response, NextFunction } from 'express';
import { ITaxonomyRepository } from '../repositories/taxonomyRepository.js';
import { IAuthRepository } from '../repositories/authRepository.js';
import { IAuditRepository } from '../repositories/auditRepository.js';
import {
  requireAuth,
  createTenantMembershipGuard,
  requirePermission,
} from '../middleware/authMiddleware.js';
import {
  PERMISSIONS,
  CreateCategorySchema,
  CategoryTypeEnum,
} from '@school/shared';

export function createTaxonomyAdminRouter(
  taxonomyRepo: ITaxonomyRepository,
  authRepo: IAuthRepository,
  auditRepo: IAuditRepository
): Router {
  const router = express.Router();
  const membershipGuard = createTenantMembershipGuard(authRepo);

  router.use(requireAuth);
  router.use(membershipGuard);

  // GET /api/v1/tenant/cms/taxonomy/categories
  router.get(
    '/categories',
    requirePermission(PERMISSIONS.TAXONOMY_READ),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        const type = req.query.type
          ? CategoryTypeEnum.safeParse(req.query.type).success
            ? (req.query.type as any)
            : undefined
          : undefined;

        const categories = await taxonomyRepo.listCategories(tenantId, type);
        res.json({ success: true, data: categories });
      } catch (err) {
        next(err);
      }
    }
  );

  // POST /api/v1/tenant/cms/taxonomy/categories
  router.post(
    '/categories',
    requirePermission(PERMISSIONS.TAXONOMY_WRITE),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        const parsed = CreateCategorySchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid category payload',
              details: parsed.error.issues,
            },
          });
          return;
        }

        const category = await taxonomyRepo.createCategory(tenantId, parsed.data);

        await auditRepo.createAuditLog({
          tenantId,
          actorId: req.user!.id,
          actorEmail: req.user!.email,
          action: 'CATEGORY_CREATED',
          entityType: 'Category',
          entityId: category.id,
          outcome: 'SUCCESS',
          metadata: { name: category.name, slug: category.slug, type: category.type },
        });

        res.status(201).json({ success: true, data: category });
      } catch (err: any) {
        if (err.message && err.message.includes('CATEGORY_SLUG_ALREADY_EXISTS')) {
          res.status(409).json({
            success: false,
            error: {
              code: 'CATEGORY_SLUG_ALREADY_EXISTS',
              message: 'A category with this slug already exists for this institution',
            },
          });
          return;
        }
        next(err);
      }
    }
  );

  // DELETE /api/v1/tenant/cms/taxonomy/categories/:id
  router.delete(
    '/categories/:id',
    requirePermission(PERMISSIONS.TAXONOMY_WRITE),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        await taxonomyRepo.deleteCategory(tenantId, req.params.id);

        await auditRepo.createAuditLog({
          tenantId,
          actorId: req.user!.id,
          actorEmail: req.user!.email,
          action: 'CATEGORY_DELETED',
          entityType: 'Category',
          entityId: req.params.id,
          outcome: 'SUCCESS',
          metadata: { categoryId: req.params.id },
        });

        res.json({ success: true, message: 'Category deleted successfully' });
      } catch (err: any) {
        if (err.message && err.message.includes('not found')) {
          res.status(404).json({ success: false, error: { code: 'CATEGORY_NOT_FOUND', message: err.message } });
          return;
        }
        next(err);
      }
    }
  );

  return router;
}
