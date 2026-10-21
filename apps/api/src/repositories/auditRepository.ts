import { AuditLog, AuditOutcome, prisma } from '@school/db';
import { AuditLogDto, PaginatedData } from '@school/shared';

export interface CreateAuditLogData {
  tenantId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  actorType?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  outcome?: AuditOutcome;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface QueryAuditLogsParams {
  tenantId?: string | null;
  page: number;
  limit: number;
  action?: string;
  entityType?: string;
  actorId?: string;
  outcome?: AuditOutcome;
}

export interface IAuditRepository {
  createAuditLog(data: CreateAuditLogData): Promise<AuditLogDto>;
  findAuditLogs(params: QueryAuditLogsParams): Promise<PaginatedData<AuditLogDto>>;
}

/**
 * Sanitizes metadata to ensure credentials, tokens, and secrets are strictly redacted
 */
export function sanitizeAuditMetadata(
  metadata?: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const SENSITIVE_KEYS = [
    'password',
    'passwordhash',
    'token',
    'tokenhash',
    'secret',
    'authorization',
    'cookie',
    'sessiontoken',
    'resettoken',
  ];

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
      cleaned[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      cleaned[key] = sanitizeAuditMetadata(value as Record<string, unknown>);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Production Prisma Implementation of IAuditRepository
 */
export class PrismaAuditRepository implements IAuditRepository {
  async createAuditLog(data: CreateAuditLogData): Promise<AuditLogDto> {
    const sanitizedMetadata = sanitizeAuditMetadata(data.metadata);

    const record = await prisma.auditLog.create({
      data: {
        tenantId: data.tenantId ?? null,
        actorId: data.actorId ?? null,
        actorEmail: data.actorEmail ?? null,
        actorType: data.actorType ?? 'USER',
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId ?? null,
        outcome: data.outcome ?? 'SUCCESS',
        requestId: data.requestId ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        metadata: sanitizedMetadata as any,
      },
    });

    return {
      id: record.id,
      tenantId: record.tenantId,
      actorId: record.actorId,
      actorEmail: record.actorEmail,
      actorType: record.actorType,
      action: record.action,
      entityType: record.entityType,
      entityId: record.entityId,
      outcome: record.outcome as AuditOutcome,
      requestId: record.requestId,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      metadata: (record.metadata as Record<string, unknown>) ?? null,
      createdAt: record.createdAt.toISOString(),
    };
  }

  async findAuditLogs(params: QueryAuditLogsParams): Promise<PaginatedData<AuditLogDto>> {
    const { tenantId, page, limit, action, entityType, actorId, outcome } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (tenantId !== undefined) {
      where.tenantId = tenantId;
    }
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (actorId) where.actorId = actorId;
    if (outcome) where.outcome = outcome;

    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items: items.map((r) => ({
        id: r.id,
        tenantId: r.tenantId,
        actorId: r.actorId,
        actorEmail: r.actorEmail,
        actorType: r.actorType,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        outcome: r.outcome as AuditOutcome,
        requestId: r.requestId,
        ipAddress: r.ipAddress,
        userAgent: r.userAgent,
        metadata: (r.metadata as Record<string, unknown>) ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

/**
 * In-Memory Audit Repository for Unit & Integration Testing
 */
export class InMemoryAuditRepository implements IAuditRepository {
  private logs: AuditLogDto[] = [];
  private idCounter = 1;

  async createAuditLog(data: CreateAuditLogData): Promise<AuditLogDto> {
    const id = `audit_${this.idCounter++}_${Date.now()}`;
    const sanitizedMetadata = sanitizeAuditMetadata(data.metadata);

    const log: AuditLogDto = {
      id,
      tenantId: data.tenantId ?? null,
      actorId: data.actorId ?? null,
      actorEmail: data.actorEmail ?? null,
      actorType: data.actorType ?? 'USER',
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId ?? null,
      outcome: data.outcome ?? 'SUCCESS',
      requestId: data.requestId ?? null,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      metadata: sanitizedMetadata,
      createdAt: new Date().toISOString(),
    };

    this.logs.unshift(log); // prepend so it stays sorted desc by default
    return log;
  }

  async findAuditLogs(params: QueryAuditLogsParams): Promise<PaginatedData<AuditLogDto>> {
    const { tenantId, page, limit, action, entityType, actorId, outcome } = params;

    let filtered = this.logs;

    if (tenantId !== undefined) {
      filtered = filtered.filter((l) => l.tenantId === tenantId);
    }
    if (action) {
      filtered = filtered.filter((l) => l.action === action);
    }
    if (entityType) {
      filtered = filtered.filter((l) => l.entityType === entityType);
    }
    if (actorId) {
      filtered = filtered.filter((l) => l.actorId === actorId);
    }
    if (outcome) {
      filtered = filtered.filter((l) => l.outcome === outcome);
    }

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
