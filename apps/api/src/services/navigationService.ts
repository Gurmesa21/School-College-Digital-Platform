import { INavigationRepository } from '../repositories/navigationRepository.js';
import { IAuditRepository } from '../repositories/auditRepository.js';
import {
  NavigationLocation,
  NavigationMenuDto,
  NavigationMenuItemDto,
  PublicNavigationDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
} from '@school/shared';

export interface NavigationActorContext {
  id: string;
  email: string;
}

export class NavigationService {
  constructor(
    private navigationRepo: INavigationRepository,
    private auditRepo: IAuditRepository
  ) {}

  async getMenus(tenantId: string): Promise<NavigationMenuDto[]> {
    return this.navigationRepo.getMenus(tenantId);
  }

  async getMenuByLocation(tenantId: string, location: NavigationLocation): Promise<NavigationMenuDto | null> {
    return this.navigationRepo.getMenuByLocation(tenantId, location);
  }

  async getPublicMenu(tenantId: string, location: NavigationLocation): Promise<PublicNavigationDto | null> {
    return this.navigationRepo.getPublicMenu(tenantId, location);
  }

  async getPublicMenus(tenantId: string): Promise<PublicNavigationDto[]> {
    return this.navigationRepo.getPublicMenus(tenantId);
  }

  async upsertMenu(
    tenantId: string,
    location: NavigationLocation,
    title: string,
    isPublished = true,
    actor?: NavigationActorContext
  ): Promise<NavigationMenuDto> {
    const menu = await this.navigationRepo.upsertMenu(tenantId, location, title, isPublished);

    if (actor) {
      await this.auditRepo.createAuditLog({
        tenantId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'NAVIGATION_MENU_UPSERTED',
        entityType: 'NavigationMenu',
        entityId: menu.id,
        outcome: 'SUCCESS',
        metadata: { location, title, isPublished },
      });
    }

    return menu;
  }

  async addMenuItem(
    tenantId: string,
    menuId: string,
    data: CreateMenuItemDto,
    actor?: NavigationActorContext
  ): Promise<NavigationMenuItemDto> {
    const item = await this.navigationRepo.addMenuItem(tenantId, menuId, data);

    if (actor) {
      await this.auditRepo.createAuditLog({
        tenantId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'NAVIGATION_ITEM_CREATED',
        entityType: 'NavigationMenuItem',
        entityId: item.id,
        outcome: 'SUCCESS',
        metadata: { menuId, label: item.label, url: item.url },
      });
    }

    return item;
  }

  async updateMenuItem(
    tenantId: string,
    itemId: string,
    data: UpdateMenuItemDto,
    actor?: NavigationActorContext
  ): Promise<NavigationMenuItemDto> {
    const item = await this.navigationRepo.updateMenuItem(tenantId, itemId, data);

    if (actor) {
      await this.auditRepo.createAuditLog({
        tenantId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'NAVIGATION_ITEM_UPDATED',
        entityType: 'NavigationMenuItem',
        entityId: item.id,
        outcome: 'SUCCESS',
        metadata: { itemId, updates: data },
      });
    }

    return item;
  }

  async deleteMenuItem(
    tenantId: string,
    itemId: string,
    actor?: NavigationActorContext
  ): Promise<void> {
    await this.navigationRepo.deleteMenuItem(tenantId, itemId);

    if (actor) {
      await this.auditRepo.createAuditLog({
        tenantId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'NAVIGATION_ITEM_DELETED',
        entityType: 'NavigationMenuItem',
        entityId: itemId,
        outcome: 'SUCCESS',
        metadata: { itemId },
      });
    }
  }

  async reorderMenuItems(
    tenantId: string,
    menuId: string,
    items: Array<{ id: string; order: number; parentId?: string | null }>,
    actor?: NavigationActorContext
  ): Promise<void> {
    await this.navigationRepo.reorderMenuItems(tenantId, menuId, items);

    if (actor) {
      await this.auditRepo.createAuditLog({
        tenantId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'NAVIGATION_ITEMS_REORDERED',
        entityType: 'NavigationMenu',
        entityId: menuId,
        outcome: 'SUCCESS',
        metadata: { count: items.length },
      });
    }
  }
}
