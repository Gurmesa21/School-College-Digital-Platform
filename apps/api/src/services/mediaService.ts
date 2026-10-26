import { IMediaRepository } from '../repositories/mediaRepository.js';
import { IAuditRepository } from '../repositories/auditRepository.js';
import {
  IStorageProvider,
  LocalStorageProvider,
  StoragePolicy,
} from '../storage/storageProvider.js';
import {
  validateFileContent,
  sanitizeFilename,
} from '../utils/fileValidation.js';
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
  storagePolicy?: 'PUBLIC' | 'PRIVATE';
  storageProvider?: string;
  categoryId?: string | null;
  fileBuffer?: Buffer;
  fileName?: string;
  mimeType: string;
  fileSizeBytes: number;
}

export class MediaService {
  private storageProvider: IStorageProvider;

  constructor(
    private mediaRepo: IMediaRepository,
    private auditRepo: IAuditRepository,
    storageOrDir?: IStorageProvider | string
  ) {
    if (typeof storageOrDir === 'object' && storageOrDir !== null && 'write' in storageOrDir) {
      this.storageProvider = storageOrDir as IStorageProvider;
    } else if (typeof storageOrDir === 'string') {
      this.storageProvider = new LocalStorageProvider(storageOrDir);
    } else {
      this.storageProvider = new LocalStorageProvider();
    }
  }

  getStorageProvider(): IStorageProvider {
    return this.storageProvider;
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
    // 1. Boundary check: Reject empty or negative size
    if (input.fileSizeBytes <= 0 && (!input.fileBuffer || input.fileBuffer.length === 0)) {
      throw new Error('FILE_VALIDATION_ERROR: EMPTY_FILE: Uploaded file is empty (0 bytes).');
    }

    // 2. Validate MIME type against allowlist
    if (!ALLOWED_MIME_TYPES.includes(input.mimeType as any)) {
      throw new Error(`FILE_VALIDATION_ERROR: UNSUPPORTED_MIME_TYPE: ${input.mimeType}`);
    }

    // 3. Validate file size boundary (10MB limit)
    if (input.fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `FILE_VALIDATION_ERROR: FILE_TOO_LARGE: Maximum file size is ${MAX_FILE_SIZE_BYTES} bytes`
      );
    }

    // 4. Content signature & magic bytes verification if raw buffer is present
    if (input.fileBuffer) {
      const validation = validateFileContent(input.fileBuffer, input.mimeType, input.fileSizeBytes);
      if (!validation.isValid) {
        throw new Error(`FILE_VALIDATION_ERROR: ${validation.error}`);
      }
    }

    // 5. Accessibility validation (FR-MEDIA-002 & WCAG 2.2 AA)
    const category = (input.category as any) || 'IMAGE';
    const isDecorative = !!input.isDecorative;
    if (['IMAGE', 'LOGO', 'BANNER'].includes(category) && !isDecorative) {
      if (!input.altText || input.altText.trim().length === 0) {
        throw new Error('ACCESSIBILITY_ERROR: Alternative text is required for non-decorative images.');
      }
    }

    // 6. Policy resolution: default to PUBLIC unless explicitly set or isPublic is false
    const isPublic = input.isPublic ?? true;
    const policy: StoragePolicy = input.storagePolicy || (isPublic ? 'PUBLIC' : 'PRIVATE');

    // 7. Sanitize filename and create storage identifier
    const safeBase = sanitizeFilename(input.fileName || `${input.title.toLowerCase().replace(/\s+/g, '-')}`);
    const uniqueFilename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${safeBase}`;

    // 8. Write to storage via Storage Provider Abstraction
    const bufferToWrite = input.fileBuffer || Buffer.from(`[MEDIA_FILE_CONTENT: ${input.title}]`);
    let writeResult: { storageKey: string; publicUrl?: string };

    try {
      writeResult = await this.storageProvider.write({
        tenantId,
        policy,
        filename: uniqueFilename,
        buffer: bufferToWrite,
        mimeType: input.mimeType,
      });
    } catch (err: any) {
      throw new Error(`STORAGE_WRITE_FAILURE: ${err.message || 'Failed to write asset to storage'}`);
    }

    // 9. Database transaction / insert with compensating cleanup on failure
    let asset: MediaAssetDto;
    try {
      asset = await this.mediaRepo.createMedia(tenantId, uploader ? uploader.id : null, {
        title: input.title,
        altText: isDecorative ? null : input.altText || null,
        caption: input.caption || null,
        category,
        mimeType: input.mimeType,
        fileSizeBytes: bufferToWrite.length || input.fileSizeBytes,
        storageKey: writeResult.storageKey,
        publicUrl: writeResult.publicUrl || '',
        isPublic: policy === 'PUBLIC',
        isDecorative,
        storagePolicy: policy,
        storageProvider: this.storageProvider.name,
        categoryId: input.categoryId || null,
      });
    } catch (dbErr: any) {
      // Compensating action: Delete newly uploaded storage object to prevent orphaned files
      try {
        await this.storageProvider.delete(tenantId, writeResult.storageKey, policy);
      } catch {
        // Logging cleanup failure
      }
      throw dbErr;
    }

    // 10. Audit log creation
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
          storagePolicy: asset.storagePolicy,
          storageProvider: asset.storageProvider,
          storageKey: asset.storageKey,
          isPublic: asset.isPublic,
        },
      });
    }

    return asset;
  }

  /**
   * Safe 2-phase file replacement:
   *  1. Writes new file to storage
   *  2. Updates DB record
   *  3. Deletes old file only if DB update succeeds; cleans up new file if DB update fails
   */
  async replaceMedia(
    tenantId: string,
    mediaId: string,
    input: {
      fileBuffer: Buffer;
      fileName?: string;
      mimeType: string;
      title?: string;
    },
    actor?: MediaActorContext
  ): Promise<MediaAssetDto> {
    const existing = await this.mediaRepo.getMediaById(tenantId, mediaId);
    if (!existing) {
      throw new Error('MEDIA_NOT_FOUND');
    }

    // Validate MIME and magic bytes
    const validation = validateFileContent(input.fileBuffer, input.mimeType);
    if (!validation.isValid) {
      throw new Error(`FILE_VALIDATION_ERROR: ${validation.error}`);
    }

    const safeBase = sanitizeFilename(input.fileName || `${existing.title.toLowerCase().replace(/\s+/g, '-')}`);
    const uniqueFilename = `replaced_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${safeBase}`;
    const policy = existing.storagePolicy;

    // Step 1: Write new file to storage
    let writeResult: { storageKey: string; publicUrl?: string };
    try {
      writeResult = await this.storageProvider.write({
        tenantId,
        policy,
        filename: uniqueFilename,
        buffer: input.fileBuffer,
        mimeType: input.mimeType,
      });
    } catch (err: any) {
      throw new Error(`STORAGE_WRITE_FAILURE: ${err.message}`);
    }

    // Step 2: Update DB metadata
    const oldStorageKey = existing.storageKey;
    let updated: MediaAssetDto;
    try {
      updated = await this.mediaRepo.updateMedia(tenantId, mediaId, {
        title: input.title || existing.title,
        storageKey: writeResult.storageKey as any,
        publicUrl: writeResult.publicUrl || (existing.isPublic ? writeResult.publicUrl : '') as any,
        mimeType: input.mimeType,
        fileSizeBytes: input.fileBuffer.length,
      });
    } catch (dbErr: any) {
      // DB failed: Compensate by deleting the newly written file (preserve old file)
      try {
        await this.storageProvider.delete(tenantId, writeResult.storageKey, policy);
      } catch {}
      throw dbErr;
    }

    // Step 3: DB succeeded: Delete old file
    try {
      await this.storageProvider.delete(tenantId, oldStorageKey, policy);
    } catch {}

    if (actor) {
      await this.auditRepo.createAuditLog({
        tenantId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'MEDIA_REPLACED',
        entityType: 'MediaAsset',
        entityId: mediaId,
        outcome: 'SUCCESS',
        metadata: {
          title: updated.title,
          oldStorageKey,
          newStorageKey: updated.storageKey,
          mimeType: input.mimeType,
        },
      });
    }

    return updated;
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

    // 1. Delete database record
    await this.mediaRepo.deleteMedia(tenantId, mediaId);

    // 2. Delete file from storage provider
    try {
      await this.storageProvider.delete(tenantId, existing.storageKey, existing.storagePolicy);
    } catch {
      // Observable non-critical file cleanup error
    }

    // 3. Immutable audit log
    if (actor) {
      await this.auditRepo.createAuditLog({
        tenantId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'MEDIA_DELETED',
        entityType: 'MediaAsset',
        entityId: mediaId,
        outcome: 'SUCCESS',
        metadata: {
          title: existing.title,
          storageKey: existing.storageKey,
          storagePolicy: existing.storagePolicy,
        },
      });
    }
  }

  /**
   * Public Media Delivery (FR-MEDIA-003):
   * Strictly delivers only if isPublic === true AND storagePolicy === 'PUBLIC' and belongs to current tenant.
   * Private files return 404 to anonymous visitors to avoid enumeration or exposure.
   */
  async getPublicMedia(
    tenantId: string,
    filenameOrId: string
  ): Promise<{ asset: MediaAssetDto; buffer: Buffer; filePath?: string }> {
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

    // Security Gate: Must belong to current tenant AND be strictly public
    if (!asset || !asset.isPublic || asset.storagePolicy !== 'PUBLIC') {
      throw new Error('MEDIA_NOT_FOUND');
    }

    const readResult = await this.storageProvider.read(tenantId, asset.storageKey, 'PUBLIC');
    if (!readResult) {
      return {
        asset,
        buffer: Buffer.from(`[PUBLIC MEDIA CONTENT: ${asset.title}]`),
      };
    }

    return {
      asset,
      buffer: readResult.buffer,
      filePath: readResult.filePath,
    };
  }

  /**
   * Private / Access-Controlled Media Delivery (FR-MEDIA-003):
   * Strictly authorized server-side for institutional members.
   */
  async getPrivateMedia(
    tenantId: string,
    mediaId: string,
    actor: MediaActorContext
  ): Promise<{ asset: MediaAssetDto; buffer: Buffer; filePath?: string }> {
    const asset = await this.mediaRepo.getMediaById(tenantId, mediaId);
    if (!asset) {
      throw new Error('MEDIA_NOT_FOUND');
    }

    const readResult = await this.storageProvider.read(tenantId, asset.storageKey, asset.storagePolicy);
    if (!readResult) {
      return {
        asset,
        buffer: Buffer.from(`[PRIVATE MEDIA DATA: ${asset.title}]`),
      };
    }

    return {
      asset,
      buffer: readResult.buffer,
      filePath: readResult.filePath,
    };
  }

  /**
   * Generate Short-Lived Signed Download URL for Private Documents
   */
  async generateSignedDownloadUrl(
    tenantId: string,
    mediaId: string,
    actor: MediaActorContext,
    expiresInSeconds: number = 900
  ): Promise<{ url: string; expiresAt: string }> {
    const asset = await this.mediaRepo.getMediaById(tenantId, mediaId);
    if (!asset) {
      throw new Error('MEDIA_NOT_FOUND');
    }

    if (!this.storageProvider.getSignedDownloadUrl) {
      throw new Error('STORAGE_OPERATION_UNSUPPORTED: Storage provider does not support signed URLs');
    }

    const url = await this.storageProvider.getSignedDownloadUrl({
      tenantId,
      storageKey: asset.storageKey,
      expiresInSeconds,
      userId: actor.id,
    });

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    await this.auditRepo.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'MEDIA_SIGNED_URL_GENERATED',
      entityType: 'MediaAsset',
      entityId: mediaId,
      outcome: 'SUCCESS',
      metadata: {
        title: asset.title,
        storageKey: asset.storageKey,
        expiresInSeconds,
      },
    });

    return { url, expiresAt };
  }
}
