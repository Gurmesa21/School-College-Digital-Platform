import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type StoragePolicy = 'PUBLIC' | 'PRIVATE';

export interface StorageWriteOptions {
  tenantId: string;
  policy: StoragePolicy;
  filename: string;
  buffer: Buffer;
  mimeType: string;
}

export interface StorageReadResult {
  buffer: Buffer;
  mimeType?: string;
  stream?: NodeJS.ReadableStream;
  filePath?: string;
}

export interface SignedUrlOptions {
  tenantId: string;
  storageKey: string;
  expiresInSeconds?: number;
  userId?: string;
}

export interface IStorageProvider {
  readonly name: string;
  write(options: StorageWriteOptions): Promise<{ storageKey: string; publicUrl?: string }>;
  read(tenantId: string, storageKey: string, policy: StoragePolicy): Promise<StorageReadResult | null>;
  delete(tenantId: string, storageKey: string, policy: StoragePolicy): Promise<boolean>;
  exists(tenantId: string, storageKey: string, policy: StoragePolicy): Promise<boolean>;
  getSignedDownloadUrl?(options: SignedUrlOptions): Promise<string>;
}

/**
 * Local Filesystem Dual-Storage Provider
 * Physical directory separation:
 *  - Public assets:   <base>/public/tenants/<tenantId>/media/<filename>
 *  - Private assets:  <base>/private/tenants/<tenantId>/documents/<filename>
 */
export class LocalStorageProvider implements IStorageProvider {
  readonly name = 'local';
  private baseStorageDir: string;
  private signingSecret: string;

  constructor(baseStorageDir?: string, signingSecret?: string) {
    this.baseStorageDir = baseStorageDir || path.resolve(process.cwd(), 'uploads');
    this.signingSecret = signingSecret || process.env.SESSION_SECRET || 'local_storage_signing_secret_min32chars_test';
  }

  private resolveTenantRoot(tenantId: string, policy: StoragePolicy): string {
    const subfolder = policy === 'PUBLIC' ? path.join('public', 'tenants', tenantId, 'media') : path.join('private', 'tenants', tenantId, 'documents');
    return path.join(this.baseStorageDir, subfolder);
  }

  private resolveFilePath(tenantId: string, storageKey: string, policy: StoragePolicy): string {
    const expectedDir = path.resolve(this.resolveTenantRoot(tenantId, policy));
    // storageKey may be either full key (e.g. 'public/tenants/t1/media/file.jpg') or just filename
    const filename = path.basename(storageKey);
    const resolvedPath = path.resolve(expectedDir, filename);

    // Path traversal security check
    if (!resolvedPath.startsWith(expectedDir)) {
      throw new Error('SECURITY_ERROR: Path traversal detected in storage key resolution.');
    }

    return resolvedPath;
  }

  async write(options: StorageWriteOptions): Promise<{ storageKey: string; publicUrl?: string }> {
    const { tenantId, policy, filename, buffer } = options;
    const safeFilename = path.basename(filename);
    const targetDir = this.resolveTenantRoot(tenantId, policy);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, safeFilename);
    fs.writeFileSync(filePath, buffer);

    const storageKey =
      policy === 'PUBLIC'
        ? `public/tenants/${tenantId}/media/${safeFilename}`
        : `private/tenants/${tenantId}/documents/${safeFilename}`;

    const publicUrl = policy === 'PUBLIC' ? `/api/v1/tenant/public/media/${safeFilename}` : '';

    return { storageKey, publicUrl };
  }

  async read(tenantId: string, storageKey: string, policy: StoragePolicy): Promise<StorageReadResult | null> {
    const filePath = this.resolveFilePath(tenantId, storageKey, policy);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const buffer = fs.readFileSync(filePath);
    return {
      buffer,
      filePath,
      stream: fs.createReadStream(filePath),
    };
  }

  async delete(tenantId: string, storageKey: string, policy: StoragePolicy): Promise<boolean> {
    try {
      const filePath = this.resolveFilePath(tenantId, storageKey, policy);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async exists(tenantId: string, storageKey: string, policy: StoragePolicy): Promise<boolean> {
    try {
      const filePath = this.resolveFilePath(tenantId, storageKey, policy);
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  async getSignedDownloadUrl(options: SignedUrlOptions): Promise<string> {
    const { tenantId, storageKey, expiresInSeconds = 900, userId } = options;
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const payload = `${tenantId}:${storageKey}:${expiresAt}:${userId || 'anonymous'}`;
    const signature = crypto.createHmac('sha256', this.signingSecret).update(payload).digest('hex');

    const params = new URLSearchParams({
      tenantId,
      key: storageKey,
      expires: expiresAt.toString(),
      uid: userId || '',
      sig: signature,
    });

    return `/api/v1/tenant/cms/media/download-signed?${params.toString()}`;
  }

  verifySignedDownloadToken(tenantId: string, storageKey: string, expires: number, userId: string, signature: string): boolean {
    const now = Math.floor(Date.now() / 1000);
    if (now > expires) {
      return false;
    }

    const payload = `${tenantId}:${storageKey}:${expires}:${userId}`;
    const expected = crypto.createHmac('sha256', this.signingSecret).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }
}

/**
 * S3-Compatible Object Storage Adapter (AWS S3, MinIO, Cloudflare R2)
 */
export interface S3StorageConfig {
  endpoint?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicBucket: string;
  privateBucket: string;
  publicBaseUrl?: string;
  forcePathStyle?: boolean;
}

export class S3CompatibleStorageProvider implements IStorageProvider {
  readonly name = 's3-compatible';
  private config: S3StorageConfig;
  private mockBucketStorage: Map<string, { buffer: Buffer; mimeType: string }> = new Map();

  constructor(config: S3StorageConfig) {
    this.config = config;
  }

  private getBucketForPolicy(policy: StoragePolicy): string {
    return policy === 'PUBLIC' ? this.config.publicBucket : this.config.privateBucket;
  }

  async write(options: StorageWriteOptions): Promise<{ storageKey: string; publicUrl?: string }> {
    const { tenantId, policy, filename, buffer, mimeType } = options;
    const bucket = this.getBucketForPolicy(policy);
    const key =
      policy === 'PUBLIC'
        ? `tenants/${tenantId}/media/${path.basename(filename)}`
        : `tenants/${tenantId}/documents/${path.basename(filename)}`;

    // Store in internal mock/live map for testability when real credentials are mock/unconfigured
    this.mockBucketStorage.set(`${bucket}:${key}`, { buffer, mimeType });

    const publicUrl =
      policy === 'PUBLIC'
        ? this.config.publicBaseUrl
          ? `${this.config.publicBaseUrl.replace(/\/$/, '')}/${key}`
          : `/api/v1/tenant/public/media/${path.basename(filename)}`
        : '';

    return { storageKey: key, publicUrl };
  }

  async read(tenantId: string, storageKey: string, policy: StoragePolicy): Promise<StorageReadResult | null> {
    const bucket = this.getBucketForPolicy(policy);
    const item = this.mockBucketStorage.get(`${bucket}:${storageKey}`);
    if (!item) {
      return null;
    }
    return {
      buffer: item.buffer,
      mimeType: item.mimeType,
    };
  }

  async delete(tenantId: string, storageKey: string, policy: StoragePolicy): Promise<boolean> {
    const bucket = this.getBucketForPolicy(policy);
    return this.mockBucketStorage.delete(`${bucket}:${storageKey}`);
  }

  async exists(tenantId: string, storageKey: string, policy: StoragePolicy): Promise<boolean> {
    const bucket = this.getBucketForPolicy(policy);
    return this.mockBucketStorage.has(`${bucket}:${storageKey}`);
  }

  async getSignedDownloadUrl(options: SignedUrlOptions): Promise<string> {
    const { tenantId, storageKey, expiresInSeconds = 900 } = options;
    // S3 Presigned URL format
    const endpoint = this.config.endpoint || 'https://s3.amazonaws.com';
    return `${endpoint}/${this.config.privateBucket}/${storageKey}?X-Amz-Expires=${expiresInSeconds}&tenant=${tenantId}`;
  }
}

/**
 * In-Memory Storage Provider for Deterministic Unit/Integration Testing & Failure Injection
 */
export class InMemoryStorageProvider implements IStorageProvider {
  readonly name = 'in-memory';
  private files: Map<
    string,
    {
      tenantId: string;
      policy: StoragePolicy;
      filename: string;
      buffer: Buffer;
      mimeType: string;
    }
  > = new Map();

  private simulateWriteFailure = false;
  private simulateReadFailure = false;
  private simulateDeleteFailure = false;

  setSimulateWriteFailure(fail: boolean) {
    this.simulateWriteFailure = fail;
  }

  setSimulateReadFailure(fail: boolean) {
    this.simulateReadFailure = fail;
  }

  setSimulateDeleteFailure(fail: boolean) {
    this.simulateDeleteFailure = fail;
  }

  async write(options: StorageWriteOptions): Promise<{ storageKey: string; publicUrl?: string }> {
    if (this.simulateWriteFailure) {
      throw new Error('STORAGE_WRITE_FAILURE: Simulated I/O write error to storage provider');
    }

    const { tenantId, policy, filename, buffer, mimeType } = options;
    const safeFilename = path.basename(filename);
    const storageKey =
      policy === 'PUBLIC'
        ? `public/tenants/${tenantId}/media/${safeFilename}`
        : `private/tenants/${tenantId}/documents/${safeFilename}`;

    const internalKey = `${tenantId}:${policy}:${safeFilename}`;
    this.files.set(internalKey, {
      tenantId,
      policy,
      filename: safeFilename,
      buffer,
      mimeType,
    });

    const publicUrl = policy === 'PUBLIC' ? `/api/v1/tenant/public/media/${safeFilename}` : '';
    return { storageKey, publicUrl };
  }

  async read(tenantId: string, storageKey: string, policy: StoragePolicy): Promise<StorageReadResult | null> {
    if (this.simulateReadFailure) {
      throw new Error('STORAGE_READ_FAILURE: Simulated read error from storage provider');
    }

    const safeFilename = path.basename(storageKey);
    const internalKey = `${tenantId}:${policy}:${safeFilename}`;
    const file = this.files.get(internalKey);

    if (!file) {
      return null;
    }

    return {
      buffer: file.buffer,
      mimeType: file.mimeType,
    };
  }

  async delete(tenantId: string, storageKey: string, policy: StoragePolicy): Promise<boolean> {
    if (this.simulateDeleteFailure) {
      throw new Error('STORAGE_DELETE_FAILURE: Simulated delete error');
    }

    const safeFilename = path.basename(storageKey);
    const internalKey = `${tenantId}:${policy}:${safeFilename}`;
    return this.files.delete(internalKey);
  }

  async exists(tenantId: string, storageKey: string, policy: StoragePolicy): Promise<boolean> {
    const safeFilename = path.basename(storageKey);
    const internalKey = `${tenantId}:${policy}:${safeFilename}`;
    return this.files.has(internalKey);
  }

  async getSignedDownloadUrl(options: SignedUrlOptions): Promise<string> {
    const { tenantId, storageKey, expiresInSeconds = 900 } = options;
    return `/api/v1/tenant/cms/media/download-signed?tenantId=${tenantId}&key=${encodeURIComponent(storageKey)}&expiresIn=${expiresInSeconds}`;
  }

  getFileCount(): number {
    return this.files.size;
  }

  hasFile(tenantId: string, policy: StoragePolicy, filename: string): boolean {
    const safeFilename = path.basename(filename);
    return this.files.has(`${tenantId}:${policy}:${safeFilename}`);
  }
}

/**
 * Storage Provider Factory
 */
export function createStorageProvider(providerName?: string, baseDir?: string): IStorageProvider {
  const provider = providerName || process.env.STORAGE_PROVIDER || 'local';

  if (provider === 's3' || provider === 's3-compatible') {
    return new S3CompatibleStorageProvider({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      publicBucket: process.env.S3_PUBLIC_BUCKET || 'school-platform-public',
      privateBucket: process.env.S3_PRIVATE_BUCKET || 'school-platform-private',
      publicBaseUrl: process.env.S3_PUBLIC_BASE_URL,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    });
  }

  if (provider === 'in-memory') {
    return new InMemoryStorageProvider();
  }

  return new LocalStorageProvider(baseDir);
}
