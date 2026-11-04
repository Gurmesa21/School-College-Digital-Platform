import {
  SearchQueryDto,
  SearchQuerySchema,
  SearchResponseData,
} from '@school/shared';
import { ISearchRepository } from '../repositories/searchRepository.js';
import { IAuditRepository } from '../repositories/auditRepository.js';
import type { AnalyticsService } from './analyticsService.js';

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
    private readonly auditRepository?: IAuditRepository,
    private readonly analyticsService?: AnalyticsService
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

    // 3. Privacy-Aware Baseline Search Analytics (FR-ANL-001, SRS line 554)
    // Recorded into dedicated privacy-aware AnalyticsEvent store (Day 17)
    if (this.analyticsService) {
      try {
        await this.analyticsService.recordPublicEvent(
          tenantId,
          {
            eventType: 'SEARCH',
            entityType: 'SEARCH',
            entityId: query.type,
            path: '/search',
            metadata: {
              type: query.type,
              resultsCount: result.total,
              page: query.page,
            },
          },
          {
            userAgent: context?.userAgent,
          }
        );
      } catch {
        // Non-blocking telemetry failure should never degrade public search response
      }
    } else if (this.auditRepository) {
      // Legacy fallback if analytics service is not injected
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
        // Non-blocking
      }
    }

    return result;
  }
}

