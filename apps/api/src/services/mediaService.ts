import fs from 'fs';
import path from 'path';
import { IMediaRepository } from '../repositories/mediaRepository.js';
import { IAuditRepository } from '../repositories/auditRepository.js';
import {
  MediaAssetDto,
  CreateMediaDto,
  UpdateMediaDto,
  MediaQueryDto,
  PaginatedData,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from '@school/shared';

export interface MediaActorContext {
  id: string;
  email: string;
}

export interface UploadFileInput {
  title: string;
  altText?: string | null;
  caption?: string | null;
  category?: string;
  isPublic?: boolean;
  isDecorative?: boolean;
  categoryId?: string | null;
  fileBuffer?: Buffer;
  fileName?: string;
  mimeType: string;
  fileSizeBytes: number;
}

export class MediaService {
  private baseStorageDir: string;

  constructor(
    private mediaRepo: IMediaRepository,
    private auditRepo: IAuditRepository,
    storageDir?: string
  ) {
    this.baseStorageDir = storageDir || path.resolve(process.cwd(), 'uploads');
  }

  getStoragePath(tenantId: string, filename: string): string {
    return path.join(this.baseStorageDir, 'tenants', tenantId, 'media', filename);
  }

  async listMedia(tenantId: string, query: MediaQueryDto): Promise<PaginatedData<MediaAssetDto>> {
    return this.mediaRepo.listMedia(tenantId, query);
  }

  async getMediaById(tenantId: string, mediaId: string): Promise<MediaAssetDto | null> {
    return this.mediaRepo.getMediaById(tenantId, mediaId);
  }

  async uploadMedia(
    tenantId: string,
    uploader: MediaActorContext | null,
    input: UploadFileInput
  ): Promise<MediaAssetDto> {
    // 1. Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(input.mimeType as any)) {
      throw new Error(`UNSUPPORTED_MIME_TYPE: ${input.mimeType}`);
    }

    // 2. Validate file size
    if (input.fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new Error(`FILE_TOO_LARGE: Maximum file size is ${MAX_FILE_SIZE_BYTES} bytes`);
    }

    // 3. Accessibility validation (FR-MEDIA-002 & WCAG 2.2 AA)
    const category = (input.category as any) || 'IMAGE';
    const isDecorative = !!input.isDecorative;
    if (['IMAGE', 'LOGO', 'BANNER'].includes(category) && !isDecorative) {
      if (!input.altText || input.altText.trim().length === 0) {
        throw new Error('ACCESSIBILITY_ERROR: Alternative text is required for non-decorative images.');
      }
    }

    // 4. Determine storage key and save file buffer if provided
    const safeBaseName = (input.fileName || 'file')
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .toLowerCase();
    const storageFilename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${safeBaseName}`;
    const storageKey = `tenants/${tenantId}/media/${storageFilename}`;
    const fullPath = this.getStoragePath(tenantId, storageFilename);

    if (input.fileBuffer) {
      const parentDir = path.dirname(fullPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(fullPath, input.fileBuffer);
    }

    const isPublic = input.isPublic ?? true;
    const publicUrl = isPublic ? `/api/v1/tenant/public/media/${storageFilename}` : '';

    const asset = await this.mediaRepo.createMedia(tenantId, uploader ? uploader.id : null, {
      title: input.title,
      altText: isDecorative ? null : input.altText || null,
      caption: input.caption || null,
      category,
      mimeType: input.mimeType,
      fileSizeBytes: input.fileSizeBytes,
      storageKey,
      publicUrl,
      isPublic,
      isDecorative,
      categoryId: input.categoryId || null,
    });

    if (uploader) {
      await this.auditRepo.createAuditLog({
        tenantId,
        actorId: uploader.id,
        actorEmail: uploader.email,
        action: 'MEDIA_UPLOADED',
        entityType: 'MediaAsset',
        entityId: asset.id,
        outcome: 'SUCCESS',
        metadata: {
          title: asset.title,
          category: asset.category,
          mimeType: asset.mimeType,
          isPublic: asset.isPublic,
        },
      });
    }

    return asset;
  }

  async updateMedia(
    tenantId: string,
    mediaId: string,
    data: UpdateMediaDto,
    actor?: MediaActorContext
  ): Promise<MediaAssetDto> {
    const existing = await this.mediaRepo.getMediaById(tenantId, mediaId);
    if (!existing) {
      throw new Error('MEDIA_NOT_FOUND');
    }

    // Accessibility check if modifying altText or isDecorative
    const effectiveCategory = data.category || existing.category;
    const effectiveDecorative = data.isDecorative !== undefined ? data.isDecorative : existing.isDecorative;
    if (['IMAGE', 'LOGO', 'BANNER'].includes(effectiveCategory) && !effectiveDecorative) {
      const effectiveAlt = data.altText !== undefined ? data.altText : existing.altText;
      if (!effectiveAlt || effectiveAlt.trim().length === 0) {
        throw new Error('ACCESSIBILITY_ERROR: Alternative text is required for non-decorative images.');
      }
    }

    const updated = await this.mediaRepo.updateMedia(tenantId, mediaId, data);

    if (actor) {
      await this.auditRepo.createAuditLog({
        tenantId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'MEDIA_UPDATED',
        entityType: 'MediaAsset',
        entityId: mediaId,
        outcome: 'SUCCESS',
        metadata: { updates: data },
      });
    }

    return updated;
  }

  async deleteMedia(
    tenantId: string,
    mediaId: string,
    actor?: MediaActorContext
  ): Promise<void> {
    const existing = await this.mediaRepo.getMediaById(tenantId, mediaId);
    if (!existing) {
      throw new Error('MEDIA_NOT_FOUND');
    }

    await this.mediaRepo.deleteMedia(tenantId, mediaId);

    // Remove underlying file from disk if present
    const storageParts = existing.storageKey.split('/');
    const filename = storageParts[storageParts.length - 1];
    const fullPath = this.getStoragePath(tenantId, filename);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch {
        // Non-critical file cleanup error
      }
    }

    if (actor) {
      await this.auditRepo.createAuditLog({
        tenantId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'MEDIA_DELETED',
        entityType: 'MediaAsset',
        entityId: mediaId,
        outcome: 'SUCCESS',
        metadata: { title: existing.title, storageKey: existing.storageKey },
      });
    }
  }

  /**
   * Public Media Delivery (FR-MEDIA-003):
   * Strictly delivers only if isPublic === true and belongs to current tenant.
   * Private files return 404 to anonymous visitors to avoid enumeration or exposure.
   */
  async getPublicMedia(tenantId: string, filenameOrId: string): Promise<{ asset: MediaAssetDto; filePath?: string }> {
    // Lookup either by id or storageKey
    let asset = await this.mediaRepo.getMediaById(tenantId, filenameOrId);
    if (!asset) {
      const queryResult = await this.mediaRepo.listMedia(tenantId, { page: 1, limit: 100 });
      asset =
        queryResult.items.find(
          (a) =>
            a.storageKey.endsWith(filenameOrId) ||
            a.publicUrl.endsWith(filenameOrId) ||
            a.id === filenameOrId
        ) || null;
    }

    if (!asset || !asset.isPublic) {
      throw new Error('MEDIA_NOT_FOUND');
    }

    const storageParts = asset.storageKey.split('/');
    const filename = storageParts[storageParts.length - 1];
    const filePath = this.getStoragePath(tenantId, filename);

    return { asset, filePath: fs.existsSync(filePath) ? filePath : undefined };
  }

  /**
   * Private / Access-Controlled Media Delivery (FR-MEDIA-003):
   * Strictly authorized server-side for institutional members.
   */
  async getPrivateMedia(
    tenantId: string,
    mediaId: string,
    actor: MediaActorContext
  ): Promise<{ asset: MediaAssetDto; filePath?: string }> {
    const asset = await this.mediaRepo.getMediaById(tenantId, mediaId);
    if (!asset) {
      throw new Error('MEDIA_NOT_FOUND');
    }

    const storageParts = asset.storageKey.split('/');
    const filename = storageParts[storageParts.length - 1];
    const filePath = this.getStoragePath(tenantId, filename);

    return { asset, filePath: fs.existsSync(filePath) ? filePath : undefined };
  }
}
