import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import type { PublicNewsArticleDto } from '@school/shared';

interface NewsDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

async function fetchArticle(host: string, slug: string): Promise<PublicNewsArticleDto | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  try {
    const res = await fetch(`${apiUrl}/api/v1/tenant/public/news/${slug}`, {
      headers: {
        Host: host,
        'x-tenant-id': 'oxford',
      },
      cache: 'no-store',
    });

    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as PublicNewsArticleDto) || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: NewsDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const article = await fetchArticle(host, slug);

  if (!article) {
    return {
      title: 'Article Not Found | Institutional News',
    };
  }

  return {
    title: `${article.seoTitle || article.title} | Institutional News`,
    description: article.seoDescription || article.summary || 'Read full news article on our institutional platform.',
    alternates: {
      canonical: article.canonicalUrl || undefined,
    },
  };
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { slug } = await params;
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';

  const article = await fetchArticle(host, slug);

  if (!article) {
    notFound();
  }

  const pubDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Recent publication';

  return (
    <div className="news-detail-container" style={{ maxWidth: '840px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: '2rem', fontSize: '0.875rem' }}>
        <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          Home
        </Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>/</span>
        <Link href="/news" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          News & Stories
        </Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>/</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
          {article.title}
        </span>
      </nav>

      <article>
        {/* Article Header */}
        <header style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <time dateTime={article.publishedAt} style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {pubDate}
            </time>
            {article.authorName && (
              <>
                <span style={{ color: 'var(--text-muted)' }}>&bull;</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--accent-primary, #3b82f6)', fontWeight: 600 }}>
                  By {article.authorName}
                </span>
              </>
            )}
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.25, marginBottom: '1.25rem' }}>
            {article.title}
          </h1>

          {article.summary && (
            <p style={{ fontSize: '1.2rem', lineHeight: 1.6, color: 'var(--text-secondary, #94a3b8)', borderLeft: '3px solid var(--accent-primary, #3b82f6)', paddingLeft: '1rem', margin: 0 }}>
              {article.summary}
            </p>
          )}
        </header>

        {/* Featured Image */}
        {article.featuredMedia && (
          <figure style={{ margin: '0 0 2.5rem 0' }}>
            <div style={{ borderRadius: '10px', overflow: 'hidden', backgroundColor: '#1e293b' }}>
              <img
                src={article.featuredMedia.publicUrl}
                alt={article.featuredMedia.altText || article.title}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
            {article.featuredMedia.caption && (
              <figcaption style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
                {article.featuredMedia.caption}
              </figcaption>
            )}
          </figure>
        )}

        {/* Article Body */}
        <div
          className="article-body-content"
          style={{
            fontSize: '1.1rem',
            lineHeight: 1.8,
            color: '#e2e8f0',
            marginBottom: '3rem',
          }}
        >
          {article.body.split('\n\n').map((paragraph, idx) => (
            <p key={idx} style={{ marginBottom: '1.5rem' }}>
              {paragraph}
            </p>
          ))}
        </div>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <section aria-label="Article tags" style={{ marginBottom: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              Related Topics
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {article.tags.map((t) => (
                <Link
                  key={t}
                  href={`/news?tag=${encodeURIComponent(t)}`}
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.85rem',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    color: '#e2e8f0',
                    textDecoration: 'none',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  #{t}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Related Articles */}
        {article.relatedArticles && article.relatedArticles.length > 0 && (
          <section aria-labelledby="related-heading" style={{ marginBottom: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 id="related-heading" style={{ fontSize: '1.35rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1.25rem' }}>
              Related News & Stories
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
              {article.relatedArticles.map((rel) => (
                <div
                  key={rel.id}
                  className="card"
                  style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    <Link href={`/news/${rel.slug}`} style={{ color: '#f8fafc', textDecoration: 'none' }}>
                      {rel.title}
                    </Link>
                  </h3>
                  {rel.summary && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '0.75rem' }}>
                      {rel.summary.slice(0, 100)}...
                    </p>
                  )}
                  <Link
                    href={`/news/${rel.slug}`}
                    style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}
                  >
                    Read Story &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer Navigation */}
        <footer style={{ paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between' }}>
          <Link href="/news" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
            &larr; Back to News Gazette
          </Link>
        </footer>
      </article>
    </div>
  );
}
