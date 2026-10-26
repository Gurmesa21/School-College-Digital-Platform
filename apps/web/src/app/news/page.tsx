import React from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import type { PublicNewsArticleDto } from '@school/shared';

export const metadata: Metadata = {
  title: 'News & Stories | Institutional Digital Platform',
  description: 'Explore latest campus news, academic breakthroughs, student achievements, and institutional announcements.',
};

interface NewsPageProps {
  searchParams: Promise<{
    tag?: string;
    year?: string;
    month?: string;
    search?: string;
  }>;
}

interface ArchiveItem {
  year: number;
  month: number;
  count: number;
}

async function fetchNews(
  host: string,
  tag?: string,
  year?: string,
  month?: string,
  search?: string
): Promise<PublicNewsArticleDto[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const query = new URLSearchParams();
  if (tag) query.set('tag', tag);
  if (year) query.set('year', year);
  if (month) query.set('month', month);
  if (search) query.set('search', search);
  query.set('limit', '50');

  try {
    const res = await fetch(`${apiUrl}/api/v1/tenant/public/news?${query.toString()}`, {
      headers: {
        Host: host,
        'x-tenant-id': 'oxford',
      },
      cache: 'no-store',
    });

    if (!res.ok) return [];
    const json = await res.json();
    return (json.data?.items || []) as PublicNewsArticleDto[];
  } catch {
    return [];
  }
}

async function fetchArchiveSummary(host: string): Promise<ArchiveItem[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  try {
    const res = await fetch(`${apiUrl}/api/v1/tenant/public/news/archive`, {
      headers: {
        Host: host,
        'x-tenant-id': 'oxford',
      },
      cache: 'no-store',
    });

    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []) as ArchiveItem[];
  } catch {
    return [];
  }
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default async function PublicNewsPage({ searchParams }: NewsPageProps) {
  const params = await searchParams;
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';

  const [articles, archiveSummary] = await Promise.all([
    fetchNews(host, params.tag, params.year, params.month, params.search),
    fetchArchiveSummary(host),
  ]);

  const hasFilter = Boolean(params.tag || params.year || params.month || params.search);

  // Extract all distinct tags from articles
  const availableTags = Array.from(
    new Set(articles.flatMap((a) => a.tags || []))
  );

  return (
    <div className="news-page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          &larr; Return to Home
        </Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>/</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>News & Stories</span>
      </nav>

      {/* Header Section */}
      <header style={{ marginBottom: '2.5rem' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            color: 'var(--accent-primary, #3b82f6)',
            marginBottom: '0.75rem',
          }}
        >
          Campus Gazette & Editorial Stories
        </span>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.75rem' }}>
          Institutional News & Announcements
        </h1>
        <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '1.1rem', maxWidth: '750px' }}>
          Explore featured accomplishments, investigative student research, faculty appointments, and campus community developments.
        </p>
      </header>

      {/* Filters & Archive Navigation Bar */}
      <section
        aria-label="Filter news articles"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem',
          backgroundColor: 'rgba(30, 41, 59, 0.5)',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
          marginBottom: '2rem',
        }}
      >
        {/* Search Input */}
        <form method="GET" style={{ display: 'flex', gap: '0.5rem', flex: '1 1 250px' }}>
          {params.tag && <input type="hidden" name="tag" value={params.tag} />}
          {params.year && <input type="hidden" name="year" value={params.year} />}
          {params.month && <input type="hidden" name="month" value={params.month} />}
          <input
            type="search"
            name="search"
            placeholder="Search news stories..."
            defaultValue={params.search || ''}
            className="input"
            style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
          />
          <button type="submit" className="btn btn-secondary btn-sm">
            Search
          </button>
        </form>

        {/* Tags filter buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tags:</span>
          <Link
            href="/news"
            style={{
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              textDecoration: 'none',
              backgroundColor: !params.tag ? 'var(--accent-primary, #3b82f6)' : 'rgba(255,255,255,0.08)',
              color: '#ffffff',
            }}
          >
            All
          </Link>
          {availableTags.map((tag) => (
            <Link
              key={tag}
              href={`/news?tag=${encodeURIComponent(tag)}`}
              style={{
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                textDecoration: 'none',
                backgroundColor: params.tag === tag ? 'var(--accent-primary, #3b82f6)' : 'rgba(255,255,255,0.08)',
                color: '#ffffff',
              }}
            >
              #{tag}
            </Link>
          ))}
        </div>

        {/* Archive Timeline Dropdown */}
        {archiveSummary.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Archive:</span>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {archiveSummary.slice(0, 5).map((arch) => {
                const label = `${MONTH_NAMES[arch.month - 1]} ${arch.year}`;
                const isActive = params.year === String(arch.year) && params.month === String(arch.month);
                return (
                  <Link
                    key={`${arch.year}-${arch.month}`}
                    href={`/news?year=${arch.year}&month=${arch.month}`}
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      textDecoration: 'none',
                      backgroundColor: isActive ? 'var(--accent-primary, #3b82f6)' : 'rgba(255,255,255,0.05)',
                      color: isActive ? '#ffffff' : 'var(--text-secondary)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {label} ({arch.count})
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Clear active filter button */}
      {hasFilter && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Filtering active stories</span>
          <Link href="/news" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
            Reset Filters &times;
          </Link>
        </div>
      )}

      {/* News Articles Grid */}
      {articles.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>📰</span>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#f8fafc' }}>
            No Articles Found
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
            There are no news articles matching the selected filters. Check back soon for institutional publications.
          </p>
          {hasFilter && (
            <Link href="/news" className="btn btn-primary btn-sm">
              View All Published Articles
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {articles.map((article) => {
            const pubDate = article.publishedAt
              ? new Date(article.publishedAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : 'Recent';

            return (
              <article
                key={article.id}
                className="card news-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  padding: 0,
                  backgroundColor: 'rgba(30, 41, 59, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
              >
                {/* Featured Image */}
                {article.featuredMedia && (
                  <div style={{ width: '100%', height: '180px', overflow: 'hidden', backgroundColor: '#1e293b' }}>
                    <img
                      src={article.featuredMedia.publicUrl}
                      alt={article.featuredMedia.altText || article.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}

                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* Metadata Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <time dateTime={article.publishedAt}>{pubDate}</time>
                    {article.authorName && <span>By {article.authorName}</span>}
                  </div>

                  {/* Title */}
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem', lineHeight: 1.35 }}>
                    <Link
                      href={`/news/${article.slug}`}
                      style={{ color: '#f8fafc', textDecoration: 'none' }}
                    >
                      {article.title}
                    </Link>
                  </h2>

                  {/* Summary */}
                  {article.summary && (
                    <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem', flex: 1 }}>
                      {article.summary}
                    </p>
                  )}

                  {/* Tags */}
                  {article.tags && article.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem' }}>
                      {article.tags.map((t) => (
                        <span
                          key={t}
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Read More Link */}
                  <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <Link
                      href={`/news/${article.slug}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--accent-primary, #3b82f6)',
                        textDecoration: 'none',
                      }}
                    >
                      Read Full Story &rarr;
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
