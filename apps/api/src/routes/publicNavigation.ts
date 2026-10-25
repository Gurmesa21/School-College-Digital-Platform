import express, { Router, Request, Response, NextFunction } from 'express';
import { NavigationService } from '../services/navigationService.js';
import { NavigationLocationEnum } from '@school/shared';

export function createPublicNavigationRouter(navigationService: NavigationService): Router {
  const router = express.Router();

  // GET /api/v1/tenant/public/navigation
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenant!.id;
      const menus = await navigationService.getPublicMenus(tenantId);
      res.json({ success: true, data: menus });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/tenant/public/navigation/:location
  router.get('/:location', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenant!.id;
      const locationParse = NavigationLocationEnum.safeParse(req.params.location.toUpperCase());
      if (!locationParse.success) {
        res.status(400).json({ success: false, error: { code: 'INVALID_LOCATION', message: 'Valid locations: HEADER, FOOTER, QUICK_LINKS' } });
        return;
      }

      const menu = await navigationService.getPublicMenu(tenantId, locationParse.data);
      if (!menu) {
        res.status(404).json({ success: false, error: { code: 'MENU_NOT_FOUND', message: `Published menu for ${locationParse.data} not found` } });
        return;
      }

      res.json({ success: true, data: menu });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
