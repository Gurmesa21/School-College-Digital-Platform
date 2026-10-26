import { prisma, MediaCategory } from '@school/db';
import {
  MediaAssetDto,
  CreateMediaDto,
  UpdateMediaDto,
  MediaQueryDto,
  PaginatedData,
} from '@school/shared';

export interface IMediaRepository {
  listMedia(tenantId: string, query: MediaQueryDto): Promise<PaginatedData<MediaAssetDto>>;
  getMediaById(tenantId: string, mediaId: string): Promise<MediaAssetDto | null>;
  createMedia(tenantId: string, uploaderId: string | null, data: CreateMediaDto): Promise<MediaAssetDto>;
  updateMedia(tenantId: string, mediaId: string, data: UpdateMediaDto): Promise<MediaAssetDto>;
  deleteMedia(tenantId: string, mediaId: string): Promise<void>;
}

export class PrismaMediaRepository implements IMediaRepository {
  async listMedia(tenantId: string, query: MediaQueryDto): Promise<PaginatedData<MediaAssetDto>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (query.category) {
      where.category = query.category as MediaCategory;
    }
    if (query.isPublic !== undefined) {
      where.isPublic = query.isPublic;
    }
    if (query.storagePolicy) {
      where.storagePolicy = query.storagePolicy;
    }
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { altText: { contains: query.search, mode: 'insensitive' } },
        { caption: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, records] = await Promise.all([
      prisma.mediaAsset.count({ where }),
      prisma.mediaAsset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          uploader: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          taxCategory: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
    ]);

    const items: MediaAssetDto[] = records.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      uploaderId: r.uploaderId,
      title: r.title,
      altText: r.altText,
      caption: r.caption,
      category: r.category as any,
      mimeType: r.mimeType,
      fileSizeBytes: r.fileSizeBytes,
      storageKey: r.storageKey,
      publicUrl: r.publicUrl,
      isPublic: r.isPublic,
      isDecorative: r.isDecorative,
      storagePolicy: (r.storagePolicy as any) || (r.isPublic ? 'PUBLIC' : 'PRIVATE'),
      storageProvider: r.storageProvider || 'local',
      categoryId: r.categoryId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      uploader: r.uploader,
      categoryInfo: r.taxCategory,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getMediaById(tenantId: string, mediaId: string): Promise<MediaAssetDto | null> {
    const r = await prisma.mediaAsset.findFirst({
      where: { id: mediaId, tenantId },
      include: {
        uploader: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        taxCategory: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!r) return null;

    return {
      id: r.id,
      tenantId: r.tenantId,
      uploaderId: r.uploaderId,
      title: r.title,
      altText: r.altText,
      caption: r.caption,
      category: r.category as any,
      mimeType: r.mimeType,
      fileSizeBytes: r.fileSizeBytes,
      storageKey: r.storageKey,
      publicUrl: r.publicUrl,
      isPublic: r.isPublic,
      isDecorative: r.isDecorative,
      storagePolicy: (r.storagePolicy as any) || (r.isPublic ? 'PUBLIC' : 'PRIVATE'),
      storageProvider: r.storageProvider || 'local',
      categoryId: r.categoryId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      uploader: r.uploader,
      categoryInfo: r.taxCategory,
    };
  }

  async createMedia(tenantId: string, uploaderId: string | null, data: CreateMediaDto): Promise<MediaAssetDto> {
    const isPublic = data.isPublic ?? true;
    const storagePolicy = data.storagePolicy || (isPublic ? 'PUBLIC' : 'PRIVATE');
    const storageProvider = data.storageProvider || 'local';

    const r = await prisma.mediaAsset.create({
      data: {
        tenantId,
        uploaderId,
        title: data.title,
        altText: data.altText || null,
        caption: data.caption || null,
        category: (data.category as any) || MediaCategory.IMAGE,
        mimeType: data.mimeType,
        fileSizeBytes: data.fileSizeBytes,
        storageKey: data.storageKey,
        publicUrl: data.publicUrl || '',
        isPublic,
        isDecorative: data.isDecorative ?? false,
        storagePolicy,
        storageProvider,
        categoryId: data.categoryId || null,
      },
      include: {
        uploader: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        taxCategory: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return {
      id: r.id,
      tenantId: r.tenantId,
      uploaderId: r.uploaderId,
      title: r.title,
      altText: r.altText,
      caption: r.caption,
      category: r.category as any,
      mimeType: r.mimeType,
      fileSizeBytes: r.fileSizeBytes,
      storageKey: r.storageKey,
      publicUrl: r.publicUrl,
      isPublic: r.isPublic,
      isDecorative: r.isDecorative,
      storagePolicy: (r.storagePolicy as any) || (r.isPublic ? 'PUBLIC' : 'PRIVATE'),
      storageProvider: r.storageProvider || 'local',
      categoryId: r.categoryId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      uploader: r.uploader,
      categoryInfo: r.taxCategory,
    };
  }

  async updateMedia(tenantId: string, mediaId: string, data: UpdateMediaDto): Promise<MediaAssetDto> {
    const existing = await prisma.mediaAsset.findFirst({
      where: { id: mediaId, tenantId },
    });
    if (!existing) {
      throw new Error('Media asset not found for tenant');
    }

    const r = await prisma.mediaAsset.update({
      where: { id: mediaId },
      data: {
        title: data.title !== undefined ? data.title : undefined,
        altText: data.altText !== undefined ? data.altText : undefined,
        caption: data.caption !== undefined ? data.caption : undefined,
        category: data.category !== undefined ? (data.category as any) : undefined,
        isPublic: data.isPublic !== undefined ? data.isPublic : undefined,
        isDecorative: data.isDecorative !== undefined ? data.isDecorative : undefined,
        storagePolicy: data.storagePolicy !== undefined ? data.storagePolicy : undefined,
        storageProvider: data.storageProvider !== undefined ? data.storageProvider : undefined,
        storageKey: data.storageKey !== undefined ? data.storageKey : undefined,
        publicUrl: data.publicUrl !== undefined ? data.publicUrl : undefined,
        fileSizeBytes: data.fileSizeBytes !== undefined ? data.fileSizeBytes : undefined,
        mimeType: data.mimeType !== undefined ? data.mimeType : undefined,
        categoryId: data.categoryId !== undefined ? data.categoryId : undefined,
      },
      include: {
        uploader: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        taxCategory: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return {
      id: r.id,
      tenantId: r.tenantId,
      uploaderId: r.uploaderId,
      title: r.title,
      altText: r.altText,
      caption: r.caption,
      category: r.category as any,
      mimeType: r.mimeType,
      fileSizeBytes: r.fileSizeBytes,
      storageKey: r.storageKey,
      publicUrl: r.publicUrl,
      isPublic: r.isPublic,
      isDecorative: r.isDecorative,
      storagePolicy: (r.storagePolicy as any) || (r.isPublic ? 'PUBLIC' : 'PRIVATE'),
      storageProvider: r.storageProvider || 'local',
      categoryId: r.categoryId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      uploader: r.uploader,
      categoryInfo: r.taxCategory,
    };
  }

  async deleteMedia(tenantId: string, mediaId: string): Promise<void> {
    const existing = await prisma.mediaAsset.findFirst({
      where: { id: mediaId, tenantId },
    });
    if (!existing) {
      throw new Error('Media asset not found for tenant');
    }

    await prisma.mediaAsset.delete({
      where: { id: mediaId },
    });
  }
}

export class InMemoryMediaRepository implements IMediaRepository {
  private assets: Array<{
    id: string;
    tenantId: string;
    uploaderId: string | null;
    title: string;
    altText: string | null;
    caption: string | null;
    category: any;
    mimeType: string;
    fileSizeBytes: number;
    storageKey: string;
    publicUrl: string;
    isPublic: boolean;
    isDecorative: boolean;
    storagePolicy: 'PUBLIC' | 'PRIVATE';
    storageProvider: string;
    categoryId: string | null;
    createdAt: string;
    updatedAt: string;
  }> = [];

  constructor(initialAssets: any[] = []) {
    this.assets = initialAssets.map((a) => ({
      ...a,
      storagePolicy: a.storagePolicy || (a.isPublic === false ? 'PRIVATE' : 'PUBLIC'),
      storageProvider: a.storageProvider || 'local',
    }));
  }

  async listMedia(tenantId: string, query: MediaQueryDto): Promise<PaginatedData<MediaAssetDto>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));

    let filtered = this.assets.filter((a) => a.tenantId === tenantId);
    if (query.category) {
      filtered = filtered.filter((a) => a.category === query.category);
    }
    if (query.isPublic !== undefined) {
      filtered = filtered.filter((a) => a.isPublic === query.isPublic);
    }
    if (query.storagePolicy) {
      filtered = filtered.filter((a) => a.storagePolicy === query.storagePolicy);
    }
    if (query.categoryId) {
      filtered = filtered.filter((a) => a.categoryId === query.categoryId);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(s) ||
          (a.altText && a.altText.toLowerCase().includes(s)) ||
          (a.caption && a.caption.toLowerCase().includes(s))
      );
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = filtered.length;
    const skip = (page - 1) * limit;
    const paginated = filtered.slice(skip, skip + limit);

    return {
      items: paginated.map((r) => ({
        ...r,
        uploader: null,
        categoryInfo: null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getMediaById(tenantId: string, mediaId: string): Promise<MediaAssetDto | null> {
    const asset = this.assets.find((a) => a.id === mediaId && a.tenantId === tenantId);
    if (!asset) return null;
    return {
      ...asset,
      uploader: null,
      categoryInfo: null,
    };
  }

  async createMedia(tenantId: string, uploaderId: string | null, data: CreateMediaDto): Promise<MediaAssetDto> {
    const now = new Date().toISOString();
    const isPublic = data.isPublic ?? true;
    const storagePolicy = (data.storagePolicy as any) || (isPublic ? 'PUBLIC' : 'PRIVATE');
    const storageProvider = data.storageProvider || 'local';

    const asset = {
      id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      uploaderId,
      title: data.title,
      altText: data.altText || null,
      caption: data.caption || null,
      category: data.category || 'IMAGE',
      mimeType: data.mimeType,
      fileSizeBytes: data.fileSizeBytes,
      storageKey: data.storageKey,
      publicUrl: data.publicUrl || '',
      isPublic,
      isDecorative: data.isDecorative ?? false,
      storagePolicy,
      storageProvider,
      categoryId: data.categoryId || null,
      createdAt: now,
      updatedAt: now,
    };

    this.assets.push(asset);
    return {
      ...asset,
      uploader: null,
      categoryInfo: null,
    };
  }

  async updateMedia(tenantId: string, mediaId: string, data: UpdateMediaDto): Promise<MediaAssetDto> {
    const asset = this.assets.find((a) => a.id === mediaId && a.tenantId === tenantId);
    if (!asset) throw new Error('Media asset not found for tenant');

    if (data.title !== undefined) asset.title = data.title;
    if (data.altText !== undefined) asset.altText = data.altText;
    if (data.caption !== undefined) asset.caption = data.caption;
    if (data.category !== undefined) asset.category = data.category;
    if (data.isPublic !== undefined) asset.isPublic = data.isPublic;
    if (data.isDecorative !== undefined) asset.isDecorative = data.isDecorative;
    if (data.storagePolicy !== undefined) asset.storagePolicy = data.storagePolicy;
    if (data.storageProvider !== undefined) asset.storageProvider = data.storageProvider;
    if (data.storageKey !== undefined) asset.storageKey = data.storageKey;
    if (data.publicUrl !== undefined) asset.publicUrl = data.publicUrl;
    if (data.fileSizeBytes !== undefined) asset.fileSizeBytes = data.fileSizeBytes;
    if (data.mimeType !== undefined) asset.mimeType = data.mimeType;
    if (data.categoryId !== undefined) asset.categoryId = data.categoryId;
    asset.updatedAt = new Date().toISOString();

    return {
      ...asset,
      uploader: null,
      categoryInfo: null,
    };
  }

  async deleteMedia(tenantId: string, mediaId: string): Promise<void> {
    const index = this.assets.findIndex((a) => a.id === mediaId && a.tenantId === tenantId);
    if (index === -1) throw new Error('Media asset not found for tenant');
    this.assets.splice(index, 1);
  }
}
