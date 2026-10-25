import { prisma, NavigationLocation } from '@school/db';
import {
  NavigationMenuDto,
  NavigationMenuItemDto,
  PublicNavigationDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
} from '@school/shared';

export interface INavigationRepository {
  getMenus(tenantId: string): Promise<NavigationMenuDto[]>;
  getMenuByLocation(tenantId: string, location: NavigationLocation): Promise<NavigationMenuDto | null>;
  getPublicMenu(tenantId: string, location: NavigationLocation): Promise<PublicNavigationDto | null>;
  getPublicMenus(tenantId: string): Promise<PublicNavigationDto[]>;
  upsertMenu(tenantId: string, location: NavigationLocation, title: string, isPublished?: boolean): Promise<NavigationMenuDto>;
  addMenuItem(tenantId: string, menuId: string, data: CreateMenuItemDto): Promise<NavigationMenuItemDto>;
  updateMenuItem(tenantId: string, itemId: string, data: UpdateMenuItemDto): Promise<NavigationMenuItemDto>;
  deleteMenuItem(tenantId: string, itemId: string): Promise<void>;
  reorderMenuItems(tenantId: string, menuId: string, items: Array<{ id: string; order: number; parentId?: string | null }>): Promise<void>;
}

function buildItemHierarchy(rawItems: any[]): NavigationMenuItemDto[] {
  const itemMap = new Map<string, NavigationMenuItemDto>();
  const rootItems: NavigationMenuItemDto[] = [];

  for (const item of rawItems) {
    itemMap.set(item.id, {
      id: item.id,
      menuId: item.menuId,
      parentId: item.parentId,
      label: item.label,
      url: item.url,
      target: item.target,
      order: item.order,
      isVisible: item.isVisible,
      pageId: item.pageId,
      children: [],
      createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
      updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt,
    });
  }

  for (const item of rawItems) {
    const node = itemMap.get(item.id)!;
    if (item.parentId && itemMap.has(item.parentId)) {
      itemMap.get(item.parentId)!.children!.push(node);
    } else {
      rootItems.push(node);
    }
  }

  rootItems.sort((a, b) => a.order - b.order);
  for (const node of itemMap.values()) {
    if (node.children) {
      node.children.sort((a, b) => a.order - b.order);
    }
  }

  return rootItems;
}

export class PrismaNavigationRepository implements INavigationRepository {
  async getMenus(tenantId: string): Promise<NavigationMenuDto[]> {
    const menus = await prisma.navigationMenu.findMany({
      where: { tenantId },
      include: {
        items: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { location: 'asc' },
    });

    return menus.map((m) => ({
      id: m.id,
      tenantId: m.tenantId,
      location: m.location as any,
      title: m.title,
      isPublished: m.isPublished,
      items: buildItemHierarchy(m.items),
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));
  }

  async getMenuByLocation(tenantId: string, location: NavigationLocation): Promise<NavigationMenuDto | null> {
    const m = await prisma.navigationMenu.findUnique({
      where: {
        tenantId_location: {
          tenantId,
          location: location as any,
        },
      },
      include: {
        items: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!m) return null;

    return {
      id: m.id,
      tenantId: m.tenantId,
      location: m.location as any,
      title: m.title,
      isPublished: m.isPublished,
      items: buildItemHierarchy(m.items),
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    };
  }

  async getPublicMenu(tenantId: string, location: NavigationLocation): Promise<PublicNavigationDto | null> {
    const m = await prisma.navigationMenu.findFirst({
      where: {
        tenantId,
        location: location as any,
        isPublished: true,
      },
      include: {
        items: {
          where: { isVisible: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!m) return null;

    const hierarchical = buildItemHierarchy(m.items);

    return {
      location: m.location as any,
      title: m.title,
      items: hierarchical.map((item) => ({
        id: item.id,
        label: item.label,
        url: item.url,
        target: item.target,
        order: item.order,
        children: item.children?.map((c) => ({
          id: c.id,
          label: c.label,
          url: c.url,
          target: c.target,
          order: c.order,
        })),
      })),
    };
  }

  async getPublicMenus(tenantId: string): Promise<PublicNavigationDto[]> {
    const menus = await prisma.navigationMenu.findMany({
      where: {
        tenantId,
        isPublished: true,
      },
      include: {
        items: {
          where: { isVisible: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { location: 'asc' },
    });

    return menus.map((m) => {
      const hierarchical = buildItemHierarchy(m.items);
      return {
        location: m.location as any,
        title: m.title,
        items: hierarchical.map((item) => ({
          id: item.id,
          label: item.label,
          url: item.url,
          target: item.target,
          order: item.order,
          children: item.children?.map((c) => ({
            id: c.id,
            label: c.label,
            url: c.url,
            target: c.target,
            order: c.order,
          })),
        })),
      };
    });
  }

  async upsertMenu(tenantId: string, location: NavigationLocation, title: string, isPublished = true): Promise<NavigationMenuDto> {
    const m = await prisma.navigationMenu.upsert({
      where: {
        tenantId_location: {
          tenantId,
          location: location as any,
        },
      },
      update: { title, isPublished },
      create: { tenantId, location: location as any, title, isPublished },
      include: { items: { orderBy: { order: 'asc' } } },
    });

    return {
      id: m.id,
      tenantId: m.tenantId,
      location: m.location as any,
      title: m.title,
      isPublished: m.isPublished,
      items: buildItemHierarchy(m.items),
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    };
  }

  async addMenuItem(tenantId: string, menuId: string, data: CreateMenuItemDto): Promise<NavigationMenuItemDto> {
    // Verify menu belongs to tenant
    const menu = await prisma.navigationMenu.findFirst({
      where: { id: menuId, tenantId },
    });
    if (!menu) {
      throw new Error('Menu not found for tenant');
    }

    const item = await prisma.navigationMenuItem.create({
      data: {
        menuId,
        parentId: data.parentId || null,
        label: data.label,
        url: data.url,
        target: data.target || '_self',
        order: data.order ?? 0,
        isVisible: data.isVisible ?? true,
        pageId: data.pageId || null,
      },
    });

    return {
      id: item.id,
      menuId: item.menuId,
      parentId: item.parentId,
      label: item.label,
      url: item.url,
      target: item.target,
      order: item.order,
      isVisible: item.isVisible,
      pageId: item.pageId,
      children: [],
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  async updateMenuItem(tenantId: string, itemId: string, data: UpdateMenuItemDto): Promise<NavigationMenuItemDto> {
    const existing = await prisma.navigationMenuItem.findFirst({
      where: {
        id: itemId,
        menu: { tenantId },
      },
    });
    if (!existing) {
      throw new Error('Menu item not found for tenant');
    }

    const updated = await prisma.navigationMenuItem.update({
      where: { id: itemId },
      data: {
        label: data.label !== undefined ? data.label : undefined,
        url: data.url !== undefined ? data.url : undefined,
        target: data.target !== undefined ? data.target : undefined,
        order: data.order !== undefined ? data.order : undefined,
        isVisible: data.isVisible !== undefined ? data.isVisible : undefined,
        pageId: data.pageId !== undefined ? data.pageId : undefined,
        parentId: data.parentId !== undefined ? data.parentId : undefined,
      },
    });

    return {
      id: updated.id,
      menuId: updated.menuId,
      parentId: updated.parentId,
      label: updated.label,
      url: updated.url,
      target: updated.target,
      order: updated.order,
      isVisible: updated.isVisible,
      pageId: updated.pageId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deleteMenuItem(tenantId: string, itemId: string): Promise<void> {
    const existing = await prisma.navigationMenuItem.findFirst({
      where: {
        id: itemId,
        menu: { tenantId },
      },
    });
    if (!existing) {
      throw new Error('Menu item not found for tenant');
    }

    await prisma.navigationMenuItem.delete({
      where: { id: itemId },
    });
  }

  async reorderMenuItems(tenantId: string, menuId: string, items: Array<{ id: string; order: number; parentId?: string | null }>): Promise<void> {
    const menu = await prisma.navigationMenu.findFirst({
      where: { id: menuId, tenantId },
    });
    if (!menu) {
      throw new Error('Menu not found for tenant');
    }

    await prisma.$transaction(
      items.map((item) =>
        prisma.navigationMenuItem.updateMany({
          where: { id: item.id, menuId },
          data: {
            order: item.order,
            parentId: item.parentId !== undefined ? item.parentId : undefined,
          },
        })
      )
    );
  }
}

export class InMemoryNavigationRepository implements INavigationRepository {
  private menus: Array<{
    id: string;
    tenantId: string;
    location: NavigationLocation;
    title: string;
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
  }> = [];

  private items: Array<{
    id: string;
    menuId: string;
    parentId: string | null;
    label: string;
    url: string;
    target: string;
    order: number;
    isVisible: boolean;
    pageId: string | null;
    createdAt: string;
    updatedAt: string;
  }> = [];

  constructor(initialData?: { menus: any[]; items: any[] }) {
    if (initialData) {
      this.menus = [...initialData.menus];
      this.items = [...initialData.items];
    }
  }

  async getMenus(tenantId: string): Promise<NavigationMenuDto[]> {
    const tenantMenus = this.menus.filter((m) => m.tenantId === tenantId);
    return tenantMenus.map((m) => {
      const menuItems = this.items.filter((i) => i.menuId === m.id);
      return {
        ...m,
        items: buildItemHierarchy(menuItems),
      };
    });
  }

  async getMenuByLocation(tenantId: string, location: NavigationLocation): Promise<NavigationMenuDto | null> {
    const m = this.menus.find((menu) => menu.tenantId === tenantId && menu.location === location);
    if (!m) return null;
    const menuItems = this.items.filter((i) => i.menuId === m.id);
    return {
      ...m,
      items: buildItemHierarchy(menuItems),
    };
  }

  async getPublicMenu(tenantId: string, location: NavigationLocation): Promise<PublicNavigationDto | null> {
    const m = this.menus.find((menu) => menu.tenantId === tenantId && menu.location === location && menu.isPublished);
    if (!m) return null;
    const menuItems = this.items.filter((i) => i.menuId === m.id && i.isVisible);
    const hierarchical = buildItemHierarchy(menuItems);
    return {
      location: m.location,
      title: m.title,
      items: hierarchical.map((item) => ({
        id: item.id,
        label: item.label,
        url: item.url,
        target: item.target,
        order: item.order,
        children: item.children?.map((c) => ({
          id: c.id,
          label: c.label,
          url: c.url,
          target: c.target,
          order: c.order,
        })),
      })),
    };
  }

  async getPublicMenus(tenantId: string): Promise<PublicNavigationDto[]> {
    const publishedMenus = this.menus.filter((m) => m.tenantId === tenantId && m.isPublished);
    return publishedMenus.map((m) => {
      const menuItems = this.items.filter((i) => i.menuId === m.id && i.isVisible);
      const hierarchical = buildItemHierarchy(menuItems);
      return {
        location: m.location,
        title: m.title,
        items: hierarchical.map((item) => ({
          id: item.id,
          label: item.label,
          url: item.url,
          target: item.target,
          order: item.order,
          children: item.children?.map((c) => ({
            id: c.id,
            label: c.label,
            url: c.url,
            target: c.target,
            order: c.order,
          })),
        })),
      };
    });
  }

  async upsertMenu(tenantId: string, location: NavigationLocation, title: string, isPublished = true): Promise<NavigationMenuDto> {
    let menu = this.menus.find((m) => m.tenantId === tenantId && m.location === location);
    const now = new Date().toISOString();
    if (menu) {
      menu.title = title;
      menu.isPublished = isPublished;
      menu.updatedAt = now;
    } else {
      menu = {
        id: `nav_menu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tenantId,
        location,
        title,
        isPublished,
        createdAt: now,
        updatedAt: now,
      };
      this.menus.push(menu);
    }

    const menuItems = this.items.filter((i) => i.menuId === menu!.id);
    return {
      ...menu,
      items: buildItemHierarchy(menuItems),
    };
  }

  async addMenuItem(tenantId: string, menuId: string, data: CreateMenuItemDto): Promise<NavigationMenuItemDto> {
    const menu = this.menus.find((m) => m.id === menuId && m.tenantId === tenantId);
    if (!menu) throw new Error('Menu not found for tenant');

    const now = new Date().toISOString();
    const item = {
      id: `nav_item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      menuId,
      parentId: data.parentId || null,
      label: data.label,
      url: data.url,
      target: data.target || '_self',
      order: data.order ?? 0,
      isVisible: data.isVisible ?? true,
      pageId: data.pageId || null,
      createdAt: now,
      updatedAt: now,
    };
    this.items.push(item);
    return { ...item, children: [] };
  }

  async updateMenuItem(tenantId: string, itemId: string, data: UpdateMenuItemDto): Promise<NavigationMenuItemDto> {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) throw new Error('Menu item not found');

    const menu = this.menus.find((m) => m.id === item.menuId && m.tenantId === tenantId);
    if (!menu) throw new Error('Menu item not found for tenant');

    if (data.label !== undefined) item.label = data.label;
    if (data.url !== undefined) item.url = data.url;
    if (data.target !== undefined) item.target = data.target;
    if (data.order !== undefined) item.order = data.order;
    if (data.isVisible !== undefined) item.isVisible = data.isVisible;
    if (data.pageId !== undefined) item.pageId = data.pageId;
    if (data.parentId !== undefined) item.parentId = data.parentId;
    item.updatedAt = new Date().toISOString();

    return { ...item };
  }

  async deleteMenuItem(tenantId: string, itemId: string): Promise<void> {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) throw new Error('Menu item not found');

    const menu = this.menus.find((m) => m.id === item.menuId && m.tenantId === tenantId);
    if (!menu) throw new Error('Menu item not found for tenant');

    this.items = this.items.filter((i) => i.id !== itemId && i.parentId !== itemId);
  }

  async reorderMenuItems(tenantId: string, menuId: string, items: Array<{ id: string; order: number; parentId?: string | null }>): Promise<void> {
    const menu = this.menus.find((m) => m.id === menuId && m.tenantId === tenantId);
    if (!menu) throw new Error('Menu not found for tenant');

    for (const update of items) {
      const item = this.items.find((i) => i.id === update.id && i.menuId === menuId);
      if (item) {
        item.order = update.order;
        if (update.parentId !== undefined) {
          item.parentId = update.parentId;
        }
      }
    }
  }
}
