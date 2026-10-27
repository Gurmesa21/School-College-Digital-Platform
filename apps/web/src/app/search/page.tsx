'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import type { SearchResponseData, SearchResultItemDto, SearchResultType } from '@school/shared';

const CONTENT_TYPES: Array<{ key: string; label: string }> = [
  { key: 'ALL', label: 'All Content' },
  { key: 'PROGRAMME', label: 'Programmes' },
  { key: 'STAFF', label: 'Staff' },
  { key: 'NEWS', label: 'News' },
  { key: 'EVENT', label: 'Events' },
  { key: 'PAGE', label: 'Pages' },
  { key: 'DOCUMENT', label: 'Documents' },
  { key: 'FORM', label: 'Forms' },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get('q') || '';
  const initialType = searchParams.get('type') || 'ALL';
  const initialSort = searchParams.get('sort') || 'relevance';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [queryInput, setQueryInput] = useState(initialQuery);
  const [activeType, setActiveType] = useState(initialType);
  const [activeSort, setActiveSort] = useState(initialSort);
  const [currentPage, setCurrentPage] = useState(initialPage);

  const [data, setData] = useState<SearchResponseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeSearch = useCallback(
    async (q: string, type: string, sort: string, page: number) => {
      const trimmed = q.trim();
      if (!trimmed) {
        setData(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const params = new URLSearchParams({
          q: trimmed,
          type,
          sort,
          page: String(page),
          limit: '10',
        });

        // Determine tenant identifier for development/demo fallback
        const host = typeof window !== 'undefined' ? window.location.host : 'oxford.localhost';
        const tenantSlug = host.includes('secondary') ? 'greenwood-secondary-school' : 'oxford';

        const res = await fetch(`${apiUrl}/api/v1/tenant/public/search?${params.toString()}`, {
          headers: {
            'x-tenant-id': tenantSlug,
            Accept: 'application/json',
          },
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(errJson?.error?.message || `Search failed with status ${res.status}`);
        }

        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        } else {
          throw new Error(json.error?.message || 'Invalid search response structure');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while communicating with the search service.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Synchronize URL query params
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'ALL';
    const sort = searchParams.get('sort') || 'relevance';
    const page = parseInt(searchParams.get('page') || '1', 10);

    setQueryInput(q);
    setActiveType(type);
    setActiveSort(sort);
    setCurrentPage(page);

    if (q) {
      executeSearch(q, type, sort, page);
    } else {
      setData(null);
      setError(null);
    }
  }, [searchParams, executeSearch]);

  const updateSearchUrl = (q: string, type: string, sort: string, page: number) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (type && type !== 'ALL') params.set('type', type);
    if (sort && sort !== 'relevance') params.set('sort', sort);
    if (page > 1) params.set('page', String(page));

    router.push(`/search?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim()) return;
    updateSearchUrl(queryInput, activeType, activeSort, 1);
  };

  const handleTypeChange = (type: string) => {
    setActiveType(type);
    updateSearchUrl(queryInput, type, activeSort, 1);
  };

  const handleSortChange = (sort: string) => {
    setActiveSort(sort);
    updateSearchUrl(queryInput, activeType, sort, 1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    updateSearchUrl(queryInput, activeType, activeSort, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getTypeBadgeClass = (type: SearchResultType) => {
    switch (type) {
      case 'PROGRAMME':
        return 'badge-programme';
      case 'STAFF':
        return 'badge-staff';
      case 'NEWS':
        return 'badge-news';
      case 'EVENT':
        return 'badge-event';
      case 'PAGE':
        return 'badge-page';
      case 'DOCUMENT':
        return 'badge-document';
      case 'FORM':
        return 'badge-form';
      case 'ANNOUNCEMENT':
        return 'badge-announcement';
      default:
        return 'badge-default';
    }
  };

  return (
    <div className="container search-page-container">
      {/* Header Banner */}
      <header className="search-header-section">
        <h1 className="search-page-title">Institutional Search</h1>
        <p className="search-page-subtitle">
          Explore published academic programmes, faculty directory, campus news, events, and resources.
        </p>

        {/* Search Input Control */}
        <form onSubmit={handleSearchSubmit} className="search-input-form" role="search">
          <div className="search-input-wrapper">
            <span className="search-input-icon" aria-hidden="true">🔍</span>
            <input
              id="search-query-input"
              type="search"
              role="searchbox"
              className="search-main-input"
              placeholder="Search by keywords, subject, faculty name, or topic..."
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              aria-label="Search institutional website"
              autoFocus
            />
            {queryInput && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => {
                  setQueryInput('');
                  setData(null);
                  router.push('/search');
                }}
                aria-label="Clear search input"
              >
                &times;
              </button>
            )}
            <button type="submit" id="search-submit-btn" className="btn btn-primary search-submit-btn">
              Search
            </button>
          </div>
        </form>
      </header>

      {/* Filter and Controls Toolbar */}
      {queryInput.trim() && (
        <section className="search-toolbar" aria-label="Search Filters and Sorting">
          {/* Content Type Filter Pills */}
          <div className="search-type-filters" role="tablist" aria-label="Filter by Content Type">
            {CONTENT_TYPES.map((ct) => {
              const count =
                data?.facets?.totalByContentType && ct.key !== 'ALL'
                  ? data.facets.totalByContentType[ct.key as SearchResultType]
                  : null;
              const isActive = activeType === ct.key;

              return (
                <button
                  key={ct.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  id={`filter-tab-${ct.key.toLowerCase()}`}
                  className={`search-filter-pill ${isActive ? 'is-active' : ''}`}
                  onClick={() => handleTypeChange(ct.key)}
                >
                  {ct.label}
                  {count !== null && count !== undefined && (
                    <span className="pill-count-badge">({count})</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sort Control */}
          <div className="search-sort-wrapper">
            <label htmlFor="search-sort-select" className="search-sort-label">
              Sort by:
            </label>
            <select
              id="search-sort-select"
              className="search-sort-select"
              value={activeSort}
              onChange={(e) => handleSortChange(e.target.value)}
              aria-label="Sort search results"
            >
              <option value="relevance">Relevance</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Title (A &rarr; Z)</option>
            </select>
          </div>
        </section>
      )}

      {/* Status Announcement for Screen Readers */}
      <div className="sr-only" role="status" aria-live="polite">
        {loading
          ? 'Searching records, please wait...'
          : data
          ? `${data.total} results found for query ${data.query}`
          : ''}
      </div>

      {/* Main Results Container */}
      <main className="search-results-area">
        {/* Loading State */}
        {loading && (
          <div className="search-loading-state" aria-busy="true">
            <div className="search-spinner" aria-hidden="true"></div>
            <p className="search-loading-text">Searching institutional publications...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="search-error-card" role="alert">
            <h2 className="search-error-title">Search Error</h2>
            <p className="search-error-message">{error}</p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => executeSearch(queryInput, activeType, activeSort, currentPage)}
            >
              Retry Search
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && data && data.items.length === 0 && (
          <div className="search-empty-state" id="search-empty-state">
            <span className="search-empty-icon" aria-hidden="true">🔍</span>
            <h2 className="search-empty-title">No matching records found</h2>
            <p className="search-empty-text">
              We couldn&apos;t find any published records matching &ldquo;<strong>{data.query}</strong>&rdquo;
              {activeType !== 'ALL' && ` in the ${activeType.toLowerCase()} category`}.
            </p>
            <div className="search-empty-tips">
              <p>Suggestions:</p>
              <ul>
                <li>Double-check spelling or try broader keywords.</li>
                {activeType !== 'ALL' && (
                  <li>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => handleTypeChange('ALL')}
                    >
                      Search across all categories
                    </button>
                  </li>
                )}
                <li>Browse popular directories below:</li>
              </ul>
            </div>
            <div className="search-quick-links">
              <Link href="/academics" className="btn btn-secondary btn-sm">
                Academic Catalog
              </Link>
              <Link href="/staff" className="btn btn-secondary btn-sm">
                Staff Directory
              </Link>
              <Link href="/news" className="btn btn-secondary btn-sm">
                News &amp; Events
              </Link>
            </div>
          </div>
        )}

        {/* Results List */}
        {!loading && !error && data && data.items.length > 0 && (
          <div className="search-results-list" id="search-results-list">
            <div className="search-results-summary">
              Showing <strong>{data.items.length}</strong> of <strong>{data.total}</strong> published results for &ldquo;<strong>{data.query}</strong>&rdquo;
            </div>

            {data.items.map((item) => (
              <article key={`${item.type}-${item.id}`} className="search-result-card">
                <div className="result-card-header">
                  <span className={`result-type-badge ${getTypeBadgeClass(item.type)}`}>
                    {item.type}
                  </span>
                  {item.publishedAt && (
                    <time className="result-date" dateTime={item.publishedAt}>
                      {new Date(item.publishedAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </time>
                  )}
                </div>

                <h2 className="result-title">
                  <Link href={item.url} className="result-title-link">
                    {item.title}
                  </Link>
                </h2>

                {item.summary && <p className="result-summary">{item.summary}</p>}

                {/* Metadata Row */}
                {item.metadata && (
                  <div className="result-metadata-row">
                    {item.metadata.departmentName && (
                      <span className="metadata-tag">
                        🏛️ {item.metadata.departmentName}
                      </span>
                    )}
                    {item.metadata.levelName && (
                      <span className="metadata-tag">
                        🎓 {item.metadata.levelName}
                      </span>
                    )}
                    {item.metadata.roleTitle && (
                      <span className="metadata-tag">
                        💼 {item.metadata.roleTitle}
                      </span>
                    )}
                    {item.metadata.eventLocation && (
                      <span className="metadata-tag">
                        📍 {item.metadata.eventLocation}
                      </span>
                    )}
                    {item.metadata.publicEmail && (
                      <span className="metadata-tag">
                        ✉️ {item.metadata.publicEmail}
                      </span>
                    )}
                    {item.metadata.displayTuition && item.metadata.tuitionFee && (
                      <span className="metadata-tag tuition-tag">
                        💵 Tuition: {item.metadata.tuitionCurrency} {item.metadata.tuitionFee.toLocaleString()}{' '}
                        {item.metadata.tuitionPeriod ? `(${item.metadata.tuitionPeriod})` : ''}
                      </span>
                    )}
                    {item.metadata.fileSizeBytes && (
                      <span className="metadata-tag">
                        📄 {(item.metadata.fileSizeBytes / 1024 / 1024).toFixed(2)} MB
                      </span>
                    )}
                    {item.metadata.tags && item.metadata.tags.length > 0 && (
                      <div className="metadata-tags-list">
                        {item.metadata.tags.map((tag) => (
                          <span key={tag} className="result-tag-pill">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="result-card-footer">
                  <Link href={item.url} className="result-action-link">
                    View Details &rarr;
                  </Link>
                </div>
              </article>
            ))}

            {/* Pagination Controls */}
            {data.totalPages > 1 && (
              <nav className="search-pagination" aria-label="Search results pagination">
                <button
                  type="button"
                  id="search-pagination-prev"
                  className="btn btn-secondary btn-sm"
                  disabled={data.page <= 1}
                  onClick={() => handlePageChange(data.page - 1)}
                  aria-label="Previous Page"
                >
                  &larr; Previous
                </button>
                <span className="pagination-indicator">
                  Page <strong>{data.page}</strong> of <strong>{data.totalPages}</strong>
                </span>
                <button
                  type="button"
                  id="search-pagination-next"
                  className="btn btn-secondary btn-sm"
                  disabled={data.page >= data.totalPages}
                  onClick={() => handlePageChange(data.page + 1)}
                  aria-label="Next Page"
                >
                  Next &rarr;
                </button>
              </nav>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container search-page-container">
          <div className="search-loading-state" aria-busy="true">
            <div className="search-spinner" aria-hidden="true"></div>
            <p className="search-loading-text">Loading Institutional Search...</p>
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
