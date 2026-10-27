import express, { Router, Request, Response, NextFunction } from 'express';
import { FormService, FormValidationError } from '../services/formService.js';
import { PublicSubmitFormSchema } from '@school/shared';

export function createPublicFormsRouter(formService: FormService): Router {
  const router = express.Router();

  /**
   * GET /api/v1/tenant/public/forms/:slug
   * Retrieve published form schema for dynamic client-side rendering
   */
  router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenant!.id;
      const slug = req.params.slug;

      const form = await formService.getPublicFormBySlug(tenantId, slug);
      if (!form) {
        res.status(404).json({
          success: false,
          error: {
            code: 'FORM_NOT_FOUND',
            message: `Form "${slug}" not found or is closed to submissions.`,
          },
        });
        return;
      }

      res.json({ success: true, data: form });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/v1/tenant/public/forms/:slug/submit
   * Process and validate public form submission with honeypot anti-spam and notification dispatch
   */
  router.post('/:slug/submit', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenant!.id;
      const slug = req.params.slug;

      const parsed = PublicSubmitFormSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'Invalid form submission structure',
            details: parsed.error.issues,
          },
        });
        return;
      }

      const clientIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const idempotencyKey =
        (req.headers['x-idempotency-key'] as string)?.trim() || parsed.data.idempotencyKey;

      const result = await formService.submitPublicForm(
        tenantId,
        slug,
        { ...parsed.data, idempotencyKey },
        {
          ip: clientIp,
          userAgent,
          tenantName: req.tenant?.name,
          contactEmail: req.tenant?.contactEmail || undefined,
        }
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      if (err instanceof FormValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: err.code,
            message: err.message,
            details: err.details,
          },
        });
        return;
      }
      if (err.message && err.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: {
            code: 'FORM_NOT_FOUND',
            message: err.message,
          },
        });
        return;
      }
      if (err.message && err.message.includes('Routing configuration error')) {
        res.status(422).json({
          success: false,
          error: {
            code: 'ROUTING_CONFIG_ERROR',
            message: err.message,
          },
        });
        return;
      }
      next(err);
    }
  });

  return router;
}
