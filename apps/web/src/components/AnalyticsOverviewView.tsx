'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AnalyticsOverviewDto, AnalyticsPeriod } from '@school/shared';

interface AnalyticsOverviewViewProps {
  apiBaseUrl: string;
  tenantSlug: string;
  onNavigateToTab?: (tab: string) => void;
}

export default function AnalyticsOverviewView({
  apiBaseUrl,
  tenantSlug,
  onNavigateToTab,
}: AnalyticsOverviewViewProps) {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [data, setData] = useState<AnalyticsOverviewDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retentionDays, setRetentionDays] = useState<number>(90);
  const [purging, setPurging] = useState<boolean>(false);
  const [retentionMsg, setRetentionMsg] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${apiBaseUrl}/api/v1/tenant/admin/analytics/overview?period=${period}`;
      const res = await fetch(url, {
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Failed to fetch overview (${res.status})`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        throw new Error('Invalid response structure received from analytics API');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while loading analytics overview');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, period]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleExport = (format: 'json' | 'csv') => {
    const url = `${apiBaseUrl}/api/v1/tenant/admin/analytics/export?period=${period}&format=${format}`;
    window.open(url, '_blank');
  };

  const handleRetentionCleanup = async () => {
    if (!confirm(`Are you sure you want to permanently purge analytics events older than ${retentionDays} days? Immutable audit logs will remain intact.`)) {
      return;
    }

    setPurging(true);
    setRetentionMsg(null);
    try {
      const url = `${apiBaseUrl}/api/v1/tenant/admin/analytics/retention/cleanup`;
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ retentionDays }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setRetentionMsg(json.data.message);
        fetchOverview();
      } else {
        throw new Error(json.error?.message || 'Failed to execute retention cleanup');
      }
    } catch (err: any) {
      alert(`Retention cleanup failed: ${err.message}`);
    } finally {
      setPurging(false);
    }
  };

  const maxDailyViews = Math.max(
    1,
    ...(data?.dailyTrends.map((d) => Math.max(d.pageViews, d.searches, d.enquiries)) || [1])
  );

  return (
    <div className="analytics-overview-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 4px 0', color: '#1e293b' }}>
            Institutional Overview & Website Analytics
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
            Privacy-aware performance metrics, visitor engagement, and operational content inventory for <strong>{tenantSlug}</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Period selector */}
          <div style={{ display: 'inline-flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
            {(['7d', '30d', '90d'] as AnalyticsPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.875rem',
                  fontWeight: period === p ? 600 : 400,
                  backgroundColor: period === p ? '#0284c7' : '#ffffff',
                  color: period === p ? '#ffffff' : '#334155',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchOverview}
            disabled={loading}
            style={{
              padding: '6px 12px',
              fontSize: '0.875rem',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>

          <button
            type="button"
            onClick={() => handleExport('csv')}
            style={{
              padding: '6px 12px',
              fontSize: '0.875rem',
              backgroundColor: '#f8fafc',
              color: '#0f766e',
              border: '1px solid #99f6e4',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* 2. Privacy Shield Guarantee Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          color: '#166534',
          fontSize: '0.875rem',
        }}
      >
        <span style={{ fontSize: '1.25rem' }}>🛡️</span>
        <div>
          <strong>Privacy Shield Active (FR-ANL-001, NFR-PRIV-001):</strong> Zero personal identifiers, raw IP addresses,
          or personal tracking cookies are stored. Search keywords and visitor paths are aggregated anonymously.
        </div>
      </div>

      {/* 3. Error Banner */}
      {error && (
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#991b1b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <strong>Error loading analytics:</strong> {error}
          </div>
          <button
            type="button"
            onClick={fetchOverview}
            style={{
              padding: '4px 10px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. Loading State */}
      {loading && !data && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>⏳</div>
          <p style={{ margin: 0 }}>Compiling institutional analytics and content metrics...</p>
        </div>
      )}

      {/* 5. Metrics Cards & Analytics Data */}
      {data && (
        <>
          {/* KPI Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Total Page Views */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 500 }}>Total Page Views</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0284c7', margin: '4px 0' }}>
                {data.metrics.totalPageViews.toLocaleString()}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                across {data.metrics.uniquePaths} distinct public paths
              </div>
            </div>

            {/* Total Searches */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 500 }}>Public Searches</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#7c3aed', margin: '4px 0' }}>
                {data.metrics.totalSearches.toLocaleString()}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>queries via /search portal</div>
            </div>

            {/* Total Enquiries */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 500 }}>Enquiry Submissions</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#059669', margin: '4px 0' }}>
                {data.metrics.totalEnquiries.toLocaleString()}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>contact & admissions inquiries</div>
            </div>

            {/* Document Downloads */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 500 }}>Document Downloads</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ea580c', margin: '4px 0' }}>
                {data.metrics.totalDocumentDownloads.toLocaleString()}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>official institutional publications</div>
            </div>
          </div>

          {/* Daily Trends Chart & Visualization */}
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '24px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: '#1e293b' }}>
                Daily Traffic & Activity Trends ({data.period.days} Days)
              </h3>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '10px', height: '10px', backgroundColor: '#0284c7', borderRadius: '2px' }} />
                  Page Views
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '10px', height: '10px', backgroundColor: '#7c3aed', borderRadius: '2px' }} />
                  Searches
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '10px', height: '10px', backgroundColor: '#059669', borderRadius: '2px' }} />
                  Enquiries
                </span>
              </div>
            </div>

            {data.dailyTrends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8' }}>
                No activity recorded in this time window yet.
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '8px',
                  height: '160px',
                  paddingTop: '20px',
                  overflowX: 'auto',
                }}
                role="region"
                aria-label="Daily activity trends bar chart"
              >
                {data.dailyTrends.map((d) => {
                  const pvHeight = Math.max(4, Math.round((d.pageViews / maxDailyViews) * 120));
                  const srHeight = Math.max(2, Math.round((d.searches / maxDailyViews) * 120));
                  const eqHeight = Math.max(2, Math.round((d.enquiries / maxDailyViews) * 120));

                  return (
                    <div
                      key={d.date}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        flex: '1 0 32px',
                        minWidth: '32px',
                      }}
                      title={`${d.date}: ${d.pageViews} views, ${d.searches} searches, ${d.enquiries} enquiries`}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '120px' }}>
                        <div
                          style={{
                            width: '8px',
                            height: `${pvHeight}px`,
                            backgroundColor: '#0284c7',
                            borderRadius: '2px 2px 0 0',
                          }}
                        />
                        <div
                          style={{
                            width: '8px',
                            height: `${srHeight}px`,
                            backgroundColor: '#7c3aed',
                            borderRadius: '2px 2px 0 0',
                          }}
                        />
                        <div
                          style={{
                            width: '8px',
                            height: `${eqHeight}px`,
                            backgroundColor: '#059669',
                            borderRadius: '2px 2px 0 0',
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: '0.625rem',
                          color: '#64748b',
                          marginTop: '6px',
                          whiteSpace: 'nowrap',
                          transform: 'rotate(-45deg)',
                          transformOrigin: 'top left',
                          height: '24px',
                        }}
                      >
                        {d.date.slice(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Two-Column Grid: Top Pages & Top Content */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            {/* Top Visited Pages */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 16px 0', color: '#1e293b' }}>
                Most Visited Public Pages
              </h3>
              {data.topPages.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No page views recorded yet.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', textAlign: 'left' }}>
                      <th style={{ padding: '8px 0', fontWeight: 500 }}>Path</th>
                      <th style={{ padding: '8px 0', fontWeight: 500, textAlign: 'right' }}>Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topPages.map((tp, idx) => (
                      <tr key={tp.path} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '10px 0', color: '#0284c7', fontFamily: 'monospace' }}>
                          <span style={{ color: '#94a3b8', marginRight: '6px' }}>{idx + 1}.</span>
                          {tp.path}
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                          {tp.views.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Audience & Device Breakdown */}
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 16px 0', color: '#1e293b' }}>
                Audience & Device Categories
              </h3>
              {data.deviceBreakdown.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No device metrics recorded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {data.deviceBreakdown.map((dev) => (
                    <div key={dev.category}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '4px' }}>
                        <span style={{ textTransform: 'capitalize', color: '#334155', fontWeight: 500 }}>
                          {dev.category}
                        </span>
                        <span style={{ color: '#64748b' }}>
                          {dev.count} ({dev.percentage}%)
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${dev.percentage}%`,
                            height: '100%',
                            backgroundColor:
                              dev.category === 'mobile'
                                ? '#059669'
                                : dev.category === 'tablet'
                                ? '#ea580c'
                                : '#0284c7',
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                      Top Referrer Sources
                    </div>
                    {data.referrerBreakdown.length === 0 ? (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Direct / Bookmark traffic only</div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {data.referrerBreakdown.map((ref) => (
                          <span
                            key={ref.domain}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              color: '#334155',
                            }}
                          >
                            {ref.domain} ({ref.count})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Operational Content Inventory & Form Health (Strict Distinction from Visitor Analytics) */}
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '24px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 4px 0', color: '#1e293b' }}>
                Operational Content Inventory & Publishing Status
              </h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.8125rem' }}>
                Current live published records in database (inventory metric, independent of visitor traffic).
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px',
              }}
            >
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Published Pages</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginTop: '4px' }}>
                  {data.contentInventory.publishedPages}
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Academic Programmes</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginTop: '4px' }}>
                  {data.contentInventory.publishedProgrammes}
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Faculty / Staff Profiles</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginTop: '4px' }}>
                  {data.contentInventory.publishedStaff}
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Campus News Articles</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginTop: '4px' }}>
                  {data.contentInventory.publishedArticles}
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Upcoming Events</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginTop: '4px' }}>
                  {data.contentInventory.upcomingEvents}
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Active Forms</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginTop: '4px' }}>
                  {data.contentInventory.activeForms}
                </div>
              </div>
            </div>

            {/* Form Routing & Delivery Health Sub-Panel */}
            <div
              style={{
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                  Enquiry Delivery Status:
                </span>{' '}
                <span style={{ fontSize: '0.875rem', color: '#059669', marginLeft: '6px' }}>
                  ✓ {data.enquiryStatusSummary.delivered} Delivered
                </span>
                {data.enquiryStatusSummary.pendingDelivery > 0 && (
                  <span style={{ fontSize: '0.875rem', color: '#d97706', marginLeft: '12px' }}>
                    ⏳ {data.enquiryStatusSummary.pendingDelivery} Pending
                  </span>
                )}
                {data.enquiryStatusSummary.failedDelivery > 0 && (
                  <span style={{ fontSize: '0.875rem', color: '#dc2626', marginLeft: '12px' }}>
                    ⚠ {data.enquiryStatusSummary.failedDelivery} Failed
                  </span>
                )}
              </div>

              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('submissions')}
                  style={{
                    fontSize: '0.8125rem',
                    color: '#0284c7',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  View All Submissions →
                </button>
              )}
            </div>
          </div>

          {/* Data Retention & Maintenance Panel (BR-009) */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155' }}>
                Analytics Retention Policy (BR-009)
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Rolling retention window: Events older than the configured window are safely purged. Immutable security audit logs are never modified.
              </div>
              {retentionMsg && (
                <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 500, marginTop: '4px' }}>
                  ✓ {retentionMsg}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.8125rem', color: '#475569' }}>
                Window:
                <select
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(Number(e.target.value))}
                  style={{
                    marginLeft: '6px',
                    padding: '4px 8px',
                    fontSize: '0.8125rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                  }}
                >
                  <option value={30}>30 Days</option>
                  <option value={60}>60 Days</option>
                  <option value={90}>90 Days (Recommended)</option>
                  <option value={180}>180 Days</option>
                  <option value={365}>365 Days</option>
                </select>
              </label>

              <button
                type="button"
                onClick={handleRetentionCleanup}
                disabled={purging}
                style={{
                  padding: '5px 12px',
                  fontSize: '0.8125rem',
                  backgroundColor: '#ffffff',
                  color: '#b91c1c',
                  border: '1px solid #fca5a5',
                  borderRadius: '4px',
                  cursor: purging ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                }}
              >
                {purging ? 'Purging...' : 'Execute Retention Cleanup'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
