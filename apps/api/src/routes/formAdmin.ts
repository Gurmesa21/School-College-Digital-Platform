import express, { Router, Request, Response, NextFunction } from 'express';
import { FormService, FormValidationError } from '../services/formService.js';
import { IAuthRepository } from '../repositories/authRepository.js';
import {
  requireAuth,
  createTenantMembershipGuard,
  requirePermission,
} from '../middleware/authMiddleware.js';
import {
  PERMISSIONS,
  CreateFormSchema,
  UpdateFormSchema,
  FormSubmissionQuerySchema,
  UpdateSubmissionStatusSchema,
} from '@school/shared';

export function createFormAdminRouter(
  formService: FormService,
  authRepository: IAuthRepository
): Router {
  const router = express.Router();
  const membershipGuard = createTenantMembershipGuard(authRepository);

  router.use(requireAuth);
  router.use(membershipGuard);

  // -----------------------------------------------------------------
  // Submissions Endpoints (Declared before /:id parameter)
  // -----------------------------------------------------------------

  // GET /api/v1/tenant/cms/forms/submissions/items (List submissions)
  router.get(
    '/submissions/items',
    requirePermission([PERMISSIONS.CMS_FORMS_READ, PERMISSIONS.ADMISSIONS_READ]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        const queryParsed = FormSubmissionQuerySchema.safeParse(req.query);
        if (!queryParsed.success) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_QUERY',
              message: 'Invalid submission query parameters',
              details: queryParsed.error.issues,
            },
          });
          return;
        }

        const data = await formService.listSubmissions(tenantId, queryParsed.data);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    }
  );

  // GET /api/v1/tenant/cms/forms/submissions/:id (Single submission detail)
  router.get(
    '/submissions/:id',
    requirePermission([PERMISSIONS.CMS_FORMS_READ, PERMISSIONS.ADMISSIONS_READ]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        const sub = await formService.getSubmissionById(tenantId, req.params.id);
        if (!sub) {
          res.status(404).json({
            success: false,
            error: {
              code: 'SUBMISSION_NOT_FOUND',
              message: 'Form submission not found',
            },
          });
          return;
        }

        res.json({ success: true, data: sub });
      } catch (err) {
        next(err);
      }
    }
  );

  // PATCH /api/v1/tenant/cms/forms/submissions/:id/status (Review & status transition)
  router.patch(
    '/submissions/:id/status',
    requirePermission([PERMISSIONS.ADMISSIONS_REVIEW, PERMISSIONS.CMS_FORMS_WRITE]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        const parsed = UpdateSubmissionStatusSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Invalid status update payload',
              details: parsed.error.issues,
            },
          });
          return;
        }

        const updated = await formService.updateSubmissionStatus(
          tenantId,
          { id: req.user!.id, email: req.user!.email },
          req.params.id,
          parsed.data
        );

        res.json({ success: true, data: updated });
      } catch (err: any) {
        if (err.message && err.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: { code: 'SUBMISSION_NOT_FOUND', message: err.message },
          });
          return;
        }
        next(err);
      }
    }
  );

  // -----------------------------------------------------------------
  // Form Definitions Endpoints
  // -----------------------------------------------------------------

  // GET /api/v1/tenant/cms/forms (List forms)
  router.get(
    '/',
    requirePermission(PERMISSIONS.CMS_FORMS_READ),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        const forms = await formService.listForms(tenantId);
        res.json({ success: true, data: forms });
      } catch (err) {
        next(err);
      }
    }
  );

  // POST /api/v1/tenant/cms/forms (Create form)
  router.post(
    '/',
    requirePermission(PERMISSIONS.CMS_FORMS_WRITE),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        const parsed = CreateFormSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Invalid form payload',
              details: parsed.error.issues,
            },
          });
          return;
        }

        const created = await formService.createForm(
          tenantId,
          { id: req.user!.id, email: req.user!.email },
          parsed.data
        );

        res.status(201).json({ success: true, data: created });
      } catch (err: any) {
        if (err.message && err.message.includes('already exists')) {
          res.status(409).json({
            success: false,
            error: { code: 'SLUG_CONFLICT', message: err.message },
          });
          return;
        }
        next(err);
      }
    }
  );

  // GET /api/v1/tenant/cms/forms/:id (Form details)
  router.get(
    '/:id',
    requirePermission(PERMISSIONS.CMS_FORMS_READ),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        const form = await formService.getFormById(tenantId, req.params.id);
        if (!form) {
          res.status(404).json({
            success: false,
            error: { code: 'FORM_NOT_FOUND', message: 'Form not found' },
          });
          return;
        }

        res.json({ success: true, data: form });
      } catch (err) {
        next(err);
      }
    }
  );

  // PUT /api/v1/tenant/cms/forms/:id (Update form)
  router.put(
    '/:id',
    requirePermission(PERMISSIONS.CMS_FORMS_WRITE),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        const parsed = UpdateFormSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Invalid form update payload',
              details: parsed.error.issues,
            },
          });
          return;
        }

        const updated = await formService.updateForm(
          tenantId,
          { id: req.user!.id, email: req.user!.email },
          req.params.id,
          parsed.data
        );

        res.json({ success: true, data: updated });
      } catch (err: any) {
        if (err.message && err.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: { code: 'FORM_NOT_FOUND', message: err.message },
          });
          return;
        }
        if (err.message && err.message.includes('already exists')) {
          res.status(409).json({
            success: false,
            error: { code: 'SLUG_CONFLICT', message: err.message },
          });
          return;
        }
        next(err);
      }
    }
  );

  // DELETE /api/v1/tenant/cms/forms/:id (Delete form)
  router.delete(
    '/:id',
    requirePermission(PERMISSIONS.CMS_FORMS_WRITE),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        await formService.deleteForm(
          tenantId,
          { id: req.user!.id, email: req.user!.email },
          req.params.id
        );

        res.json({ success: true, data: { message: 'Form deleted successfully' } });
      } catch (err: any) {
        if (err.message && err.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: { code: 'FORM_NOT_FOUND', message: err.message },
          });
          return;
        }
        next(err);
      }
    }
  );

  return router;
}
