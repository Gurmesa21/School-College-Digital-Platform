import { Router, Request, Response } from 'express';
import { ApiResponse, ResolvedTenant } from '@school/shared';

export const tenantRouter = Router();

/**
 * Returns the currently resolved tenant context
 */
tenantRouter.get('/current', (req: Request, res: Response) => {
  // At this point, tenantResolver has verified and attached req.tenant
  const tenant = req.tenant as ResolvedTenant;

  const response: ApiResponse<ResolvedTenant> = {
    success: true,
    data: tenant,
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString(),
      resolutionMethod: tenant.resolutionMethod,
    },
  };

  res.status(200).json(response);
});
