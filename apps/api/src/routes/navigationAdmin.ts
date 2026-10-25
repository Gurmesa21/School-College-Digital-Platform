import express, { Router, Request, Response, NextFunction } from 'express';
import { NavigationService } from '../services/navigationService.js';
import { IAuthRepository } from '../repositories/authRepository.js';
import {
  requireAuth,
  createTenantMembershipGuard,
  requirePermission,
} from '../middleware/authMiddleware.js';
import {
  PERMISSIONS,
  NavigationLocationEnum,
  CreateMenuItemSchema,
  UpdateMenuItemSchema,
  ReorderMenuItemsSchema,
} from '@school/shared';

export function createNavigationAdminRouter(
  navigationService: NavigationService,
  authRepository: IAuthRepository
): Router {
  const router = express.Router();
  const membershipGuard = createTenantMembershipGuard(authRepository);

  // Protect all admin navigation endpoints with auth & tenant checks
  router.use(requireAuth);
  router.use(membershipGuard);

  // GET /api/v1/tenant/cms/navigation
  router.get(
    '/',
    requirePermission(PERMISSIONS.CMS_NAVIGATION_READ),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        const menus = await navigationService.getMenus(tenantId);
        res.json({ success: true, data: menus });
      } catch (err) {
        next(err);
      }
    }
  );

  // GET /api/v1/tenant/cms/navigation/:location
  router.get(
    '/:location',
    requirePermission(PERMISSIONS.CMS_NAVIGATION_READ),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        const locationParse = NavigationLocationEnum.safeParse(req.params.location.toUpperCase());
        if (!locationParse.success) {
          res.status(400).json({ success: false, error: { code: 'INVALID_LOCATION', message: 'Valid locations: HEADER, FOOTER, QUICK_LINKS' } });
          return;
        }

        const menu = await navigationService.getMenuByLocation(tenantId, locationParse.data);
        if (!menu) {
          res.status(404).json({ success: false, error: { code: 'MENU_NOT_FOUND', message: `Navigation menu for ${locationParse.data} not found` } });
          return;
        }

        res.json({ success: true, data: menu });
      } catch (err) {
        next(err);
      }
    }
  );

  // PUT /api/v1/tenant/cms/navigation/:location (Upsert menu title & status)
  router.put(
    '/:location',
    requirePermission(PERMISSIONS.CMS_NAVIGATION_WRITE),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        const locationParse = NavigationLocationEnum.safeParse(req.params.location.toUpperCase());
        if (!locationParse.success) {
          res.status(400).json({ success: false, error: { code: 'INVALID_LOCATION', message: 'Valid locations: HEADER, FOOTER, QUICK_LINKS' } });
          return;
        }

        const { title, isPublished } = req.body;
        if (!title || typeof title !== 'string') {
          res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Title is required' } });
          return;
        }

        const menu = await navigationService.upsertMenu(
          tenantId,
          locationParse.data,
          title,
          isPublished !== undefined ? !!isPublished : true,
          { id: req.user!.id, email: req.user!.email }
        );

        res.json({ success: true, data: menu });
      } catch (err) {
        next(err);
      }
    }
  );

  // POST /api/v1/tenant/cms/navigation/:location/items (Add menu item)
  router.post(
    '/:location/items',
    requirePermission(PERMISSIONS.CMS_NAVIGATION_WRITE),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        const locationParse = NavigationLocationEnum.safeParse(req.params.location.toUpperCase());
        if (!locationParse.success) {
          res.status(400).json({ success: false, error: { code: 'INVALID_LOCATION', message: 'Valid locations: HEADER, FOOTER, QUICK_LINKS' } });
          return;
        }

        const parsed = CreateMenuItemSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid menu item payload', details: parsed.error.issues } });
          return;
        }

        // Find or create menu for this location
        let menu = await navigationService.getMenuByLocation(tenantId, locationParse.data);
        if (!menu) {
          menu = await navigationService.upsertMenu(tenantId, locationParse.data, `${locationParse.data} Menu`);
        }

        const item = await navigationService.addMenuItem(
          tenantId,
          menu.id,
          parsed.data,
          { id: req.user!.id, email: req.user!.email }
        );

        res.status(201).json({ success: true, data: item });
      } catch (err) {
        next(err);
      }
    }
  );

  // PUT /api/v1/tenant/cms/navigation/items/:itemId (Update item)
  router.put(
    '/items/:itemId',
    requirePermission(PERMISSIONS.CMS_NAVIGATION_WRITE),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        const { itemId } = req.params;

        const parsed = UpdateMenuItemSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid update payload', details: parsed.error.issues } });
          return;
        }

        const updated = await navigationService.updateMenuItem(
          tenantId,
          itemId,
          parsed.data,
          { id: req.user!.id, email: req.user!.email }
        );

        res.json({ success: true, data: updated });
      } catch (err: any) {
        if (err.message && err.message.includes('not found')) {
          res.status(404).json({ success: false, error: { code: 'ITEM_NOT_FOUND', message: err.message } });
          return;
        }
        next(err);
      }
    }
  );

  // DELETE /api/v1/tenant/cms/navigation/items/:itemId (Delete item)
  router.delete(
    '/items/:itemId',
    requirePermission(PERMISSIONS.CMS_NAVIGATION_WRITE),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        const { itemId } = req.params;

        await navigationService.deleteMenuItem(
          tenantId,
          itemId,
          { id: req.user!.id, email: req.user!.email }
        );

        res.json({ success: true, message: 'Menu item deleted successfully' });
      } catch (err: any) {
        if (err.message && err.message.includes('not found')) {
          res.status(404).json({ success: false, error: { code: 'ITEM_NOT_FOUND', message: err.message } });
          return;
        }
        next(err);
      }
    }
  );

  // POST /api/v1/tenant/cms/navigation/:location/reorder (Reorder items)
  router.post(
    '/:location/reorder',
    requirePermission(PERMISSIONS.CMS_NAVIGATION_WRITE),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenant!.id;
        const locationParse = NavigationLocationEnum.safeParse(req.params.location.toUpperCase());
        if (!locationParse.success) {
          res.status(400).json({ success: false, error: { code: 'INVALID_LOCATION', message: 'Valid locations: HEADER, FOOTER, QUICK_LINKS' } });
          return;
        }

        const parsed = ReorderMenuItemsSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid reorder payload', details: parsed.error.issues } });
          return;
        }

        const menu = await navigationService.getMenuByLocation(tenantId, locationParse.data);
        if (!menu) {
          res.status(404).json({ success: false, error: { code: 'MENU_NOT_FOUND', message: 'Menu not found' } });
          return;
        }

        await navigationService.reorderMenuItems(
          tenantId,
          menu.id,
          parsed.data.items,
          { id: req.user!.id, email: req.user!.email }
        );

        res.json({ success: true, message: 'Menu items reordered successfully' });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
