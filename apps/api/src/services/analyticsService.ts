import {
  SubmitAnalyticsEventSchema,
  AnalyticsQuerySchema,
  AnalyticsRetentionCleanupSchema,
  AnalyticsOverviewDto,
  AnalyticsRetentionResultDto,
  DeviceCategory,
  sanitizeAnalyticsMetadata,
  sanitizeSensitiveString,
} from '@school/shared';
import {
  IAnalyticsRepository,
  RecordAnalyticsEventData,
} from '../repositories/analyticsRepository.js';
import { IAuditRepository } from '../repositories/auditRepository.js';

export class AnalyticsService {
  constructor(
    private readonly analyticsRepository: IAnalyticsRepository,
    private readonly auditRepository?: IAuditRepository
  ) {}

  /**
   * Helper to derive coarse device category from User-Agent without storing raw agent string
   */
  private deriveDeviceCategory(userAgent?: string | null): DeviceCategory {
    if (!userAgent) return 'desktop';
    const ua = userAgent.toLowerCase();
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
    if (/mobile|iphone|ipod|android.*mobile|blackberry|phone|iemobile/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  /**
   * Helper to sanitize referrer to domain only
   */
  private sanitizeReferrer(referer?: string | null): string | null {
    if (!referer) return null;
    try {
      const u = referer.startsWith('http') ? new URL(referer) : new URL(`http://${referer}`);
      return u.hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  /**
   * Records an anonymous public analytics event (FR-ANL-001, NFR-PRIV-001)
   * Strictly non-blocking, fail-safe, and data-minimized.
   */
  async recordPublicEvent(
    tenantId: string,
    rawPayload: unknown,
    clientHints?: { userAgent?: string | null; referer?: string | null }
  ): Promise<{ success: boolean; eventId?: string }> {
    const parsed = SubmitAnalyticsEventSchema.safeParse(rawPayload);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join('; ');
      throw new Error(`INVALID_ANALYTICS_PAYLOAD: ${errors}`);
    }

    const data = parsed.data;

    // Normalize path (strip query strings and trailing slashes except root)
    let cleanPath = data.path.split('?')[0].split('#')[0];
    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
      cleanPath = cleanPath.slice(0, -1);
    }
    cleanPath = sanitizeSensitiveString(cleanPath);

    const deviceCategory = data.deviceCategory || this.deriveDeviceCategory(clientHints?.userAgent);
    const referrerDomain = data.referrerDomain || this.sanitizeReferrer(clientHints?.referer);

    const sanitizedMetadata = data.metadata
      ? (sanitizeAnalyticsMetadata(data.metadata) as Record<string, unknown>)
      : null;

    const recordData: RecordAnalyticsEventData = {
      tenantId,
      eventType: data.eventType as any,
      entityType: data.entityType ? sanitizeSensitiveString(data.entityType) : null,
      entityId: data.entityId ? sanitizeSensitiveString(data.entityId) : null,
      path: cleanPath,
      referrerDomain,
      deviceCategory,
      metadata: sanitizedMetadata,
    };

    const saved = await this.analyticsRepository.recordEvent(recordData);
    return { success: true, eventId: saved.id };
  }

  /**
   * Generates comprehensive tenant analytics overview for administrative dashboards
   */
  async getTenantOverview(
    tenantId: string,
    rawQuery: unknown,
    tenantTimezone = 'UTC'
  ): Promise<AnalyticsOverviewDto> {
    const parsed = AnalyticsQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new Error('INVALID_ANALYTICS_QUERY: Invalid date range or parameters');
    }

    const { period, startDate, endDate } = parsed.data;
    const now = new Date();
    let start: Date;
    let end: Date = now;
    let days = 30;

    if (period === '7d') {
      days = 7;
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === '90d') {
      days = 90;
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (period === 'custom' && startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        throw new Error('INVALID_DATE_RANGE: Start date must be before end date');
      }
      days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
      if (days > 365) {
        throw new Error('DATE_RANGE_EXCEEDED: Custom date range cannot exceed 365 days');
      }
    } else {
      // Default 30 days
      days = 30;
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const [overviewMetrics, contentInventory, enquiryStatusSummary] = await Promise.all([
      this.analyticsRepository.getOverview(tenantId, start, end),
      this.analyticsRepository.getContentInventory(tenantId),
      this.analyticsRepository.getEnquiryStatusSummary(tenantId),
    ]);

    return {
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        days,
        timezone: tenantTimezone,
      },
      metrics: overviewMetrics.metrics,
      dailyTrends: overviewMetrics.dailyTrends,
      topPages: overviewMetrics.topPages,
      topContent: overviewMetrics.topContent,
      deviceBreakdown: overviewMetrics.deviceBreakdown,
      referrerBreakdown: overviewMetrics.referrerBreakdown,
      contentInventory,
      enquiryStatusSummary,
    };
  }

  /**
   * Exports aggregated analytics in JSON or CSV format without sensitive personal data
   */
  async exportAnalytics(
    tenantId: string,
    rawQuery: unknown,
    format: 'json' | 'csv' = 'json'
  ): Promise<string | AnalyticsOverviewDto> {
    const overview = await this.getTenantOverview(tenantId, rawQuery);

    if (format === 'csv') {
      const header = 'Date,PageViews,Searches,Enquiries,DocumentDownloads\n';
      const rows = overview.dailyTrends
        .map((d) => `${d.date},${d.pageViews},${d.searches},${d.enquiries},${d.documentDownloads}`)
        .join('\n');
      return header + rows;
    }

    return overview;
  }

  /**
   * Purges analytics events older than the configured retention policy (BR-009)
   * Ensures security AuditLog entries are NEVER touched.
   */
  async cleanupRetention(
    tenantId: string,
    rawPayload: unknown,
    actorId?: string | null,
    actorEmail?: string | null
  ): Promise<AnalyticsRetentionResultDto> {
    const parsed = AnalyticsRetentionCleanupSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new Error('INVALID_RETENTION_PAYLOAD: Invalid retention days parameter');
    }

    const { retentionDays } = parsed.data;
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const purgedCount = await this.analyticsRepository.purgeEventsOlderThan(tenantId, cutoffDate);

    // Audit the retention cleanup administrative event to AuditLog
    if (this.auditRepository) {
      try {
        await this.auditRepository.createAuditLog({
          tenantId,
          actorId: actorId || null,
          actorEmail: actorEmail || null,
          action: 'analytics:retention_cleanup',
          entityType: 'ANALYTICS_RETENTION',
          outcome: 'SUCCESS',
          metadata: {
            retentionDays,
            cutoffDate: cutoffDate.toISOString(),
            purgedCount,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    return {
      purgedCount,
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      message: `Successfully purged ${purgedCount} analytics events older than ${retentionDays} days.`,
    };
  }
}

