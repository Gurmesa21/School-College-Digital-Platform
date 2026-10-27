import {
  SearchQueryDto,
  SearchQuerySchema,
  SearchResponseData,
} from '@school/shared';
import { ISearchRepository } from '../repositories/searchRepository.js';
import { IAuditRepository } from '../repositories/auditRepository.js';

export interface SearchAuditContext {
  actorId?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

export class SearchService {
  constructor(
    private readonly searchRepository: ISearchRepository,
    private readonly auditRepository?: IAuditRepository
  ) {}

  async search(
    tenantId: string,
    rawQuery: unknown,
    context?: SearchAuditContext
  ): Promise<SearchResponseData> {
    // 1. Strict Server-Side Validation & Normalization via Zod
    const parsed = SearchQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      const errorMsg = parsed.error.errors.map((e) => e.message).join('; ');
      throw new Error(`INVALID_SEARCH_QUERY: ${errorMsg}`);
    }

    const query: SearchQueryDto = parsed.data;

    // 2. Execute Tenant-Scoped Search
    const result = await this.searchRepository.search(tenantId, query);

    // 3. Privacy-Aware Baseline Search Telemetry (FR-ANL-001, SRS line 554)
    // Minimizes personal data, never records individual sensitive details
    if (this.auditRepository) {
      try {
        await this.auditRepository.createAuditLog({
          tenantId,
          actorId: context?.actorId || null,
          actorEmail: context?.actorEmail || null,
          actorType: context?.actorId ? 'USER' : 'ANONYMOUS',
          action: 'search:query',
          entityType: 'SEARCH',
          entityId: null,
          outcome: 'SUCCESS',
          requestId: context?.requestId || null,
          ipAddress: context?.ipAddress || null,
          userAgent: context?.userAgent || null,
          metadata: {
            type: query.type,
            resultsCount: result.total,
            page: query.page,
          },
        });
      } catch {
        // Non-blocking telemetry failure should never degrade public search response
      }
    }

    return result;
  }
}
