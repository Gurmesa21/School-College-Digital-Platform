import { prisma, CategoryType } from '@school/db';
import { CategoryDto, CreateCategoryDto } from '@school/shared';

export interface ITaxonomyRepository {
  listCategories(tenantId: string, type?: CategoryType): Promise<CategoryDto[]>;
  createCategory(tenantId: string, data: CreateCategoryDto): Promise<CategoryDto>;
  deleteCategory(tenantId: string, categoryId: string): Promise<void>;
}

export class PrismaTaxonomyRepository implements ITaxonomyRepository {
  async listCategories(tenantId: string, type?: CategoryType): Promise<CategoryDto[]> {
    const where: any = { tenantId };
    if (type) {
      where.type = type as any;
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { mediaAssets: true },
        },
      },
    });

    return categories.map((c) => ({
      id: c.id,
      tenantId: c.tenantId,
      name: c.name,
      slug: c.slug,
      type: c.type as any,
      description: c.description,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      mediaAssetsCount: c._count.mediaAssets,
    }));
  }

  async createCategory(tenantId: string, data: CreateCategoryDto): Promise<CategoryDto> {
    const existing = await prisma.category.findUnique({
      where: {
        tenantId_slug: {
          tenantId,
          slug: data.slug,
        },
      },
    });
    if (existing) {
      throw new Error('CATEGORY_SLUG_ALREADY_EXISTS');
    }

    const c = await prisma.category.create({
      data: {
        tenantId,
        name: data.name,
        slug: data.slug,
        type: (data.type as any) || CategoryType.GENERAL,
        description: data.description || null,
      },
    });

    return {
      id: c.id,
      tenantId: c.tenantId,
      name: c.name,
      slug: c.slug,
      type: c.type as any,
      description: c.description,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      mediaAssetsCount: 0,
    };
  }

  async deleteCategory(tenantId: string, categoryId: string): Promise<void> {
    const existing = await prisma.category.findFirst({
      where: { id: categoryId, tenantId },
    });
    if (!existing) {
      throw new Error('Category not found for tenant');
    }

    await prisma.category.delete({
      where: { id: categoryId },
    });
  }
}

export class InMemoryTaxonomyRepository implements ITaxonomyRepository {
  private categories: Array<{
    id: string;
    tenantId: string;
    name: string;
    slug: string;
    type: any;
    description: string | null;
    createdAt: string;
    updatedAt: string;
  }> = [];

  constructor(initialData: any[] = []) {
    this.categories = [...initialData];
  }

  async listCategories(tenantId: string, type?: CategoryType): Promise<CategoryDto[]> {
    let list = this.categories.filter((c) => c.tenantId === tenantId);
    if (type) {
      list = list.filter((c) => c.type === type);
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list.map((c) => ({
      ...c,
      mediaAssetsCount: 0,
    }));
  }

  async createCategory(tenantId: string, data: CreateCategoryDto): Promise<CategoryDto> {
    const conflict = this.categories.find((c) => c.tenantId === tenantId && c.slug === data.slug);
    if (conflict) {
      throw new Error('CATEGORY_SLUG_ALREADY_EXISTS');
    }

    const now = new Date().toISOString();
    const c = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      name: data.name,
      slug: data.slug,
      type: data.type || 'GENERAL',
      description: data.description || null,
      createdAt: now,
      updatedAt: now,
    };
    this.categories.push(c);
    return {
      ...c,
      mediaAssetsCount: 0,
    };
  }

  async deleteCategory(tenantId: string, categoryId: string): Promise<void> {
    const index = this.categories.findIndex((c) => c.id === categoryId && c.tenantId === tenantId);
    if (index === -1) {
      throw new Error('Category not found for tenant');
    }
    this.categories.splice(index, 1);
  }
}
