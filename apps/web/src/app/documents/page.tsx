import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getRequestHost, fetchCurrentTenant, getCanonicalUrl } from '@/lib/tenant';
import type { MediaAssetDto } from '@school/shared';
import { truncateWords } from '@/lib/formatters';

export async function generateMetadata(): Promise<Metadata> {
  const host = await getRequestHost();
  const tenant = await fetchCurrentTenant(host);
  const name = tenant?.name || 'Institutional Platform';
  const canonicalUrl = getCanonicalUrl(tenant, '/documents', host);
  const title = `Official Documents & Downloads | ${name}`;
  const description = `Download official institutional prospectuses, policy handbooks, and documents for ${name}.`;
  const ogImageUrl = `/api/og?title=${encodeURIComponent('Official Documents & Downloads')}&subtitle=${encodeURIComponent(name)}&type=document`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

async function fetchPublicDocuments(host: string): Promise<MediaAssetDto[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  try {
    const res = await fetch(`${apiUrl}/api/v1/tenant/public/media?category=DOCUMENT`, {
      headers: {
        Host: host,
        'x-forwarded-host': host,
      },
      cache: 'no-store',
    });

    if (!res.ok) return [];
    const json = await res.json();
    return (json.data?.items || []) as MediaAssetDto[];
  } catch {
    return [];
  }
}

export default async function PublicDocumentsPage() {
  const host = await getRequestHost();
  const tenant = await fetchCurrentTenant(host);
  const documents = await fetchPublicDocuments(host);

  const institutionName = tenant?.name || 'Our Institution';

  return (
    <div className="documents-page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          &larr; Return to Home
        </Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>/</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Official Documents & Resources</span>
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
          Institutional Repository
        </span>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.75rem' }}>
          Official Documents & Prospectuses
        </h1>
        <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '1.1rem', maxWidth: '750px' }}>
          Access verified institutional publications, curriculum prospectuses, policy handbooks, and printable guides for {institutionName}.
        </p>
      </header>

      {/* Documents Grid */}
      {documents.length > 0 ? (
        <section
          aria-label="Official Documents and Downloads"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
            marginBottom: '3rem',
          }}
        >
          <h2 className="sr-only">Available Documents</h2>
          {documents.map((doc) => {
            const fileSizeMb = doc.fileSizeBytes
              ? (doc.fileSizeBytes / (1024 * 1024)).toFixed(2)
              : null;

            return (
              <article
                key={doc.id}
                className="card"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '2rem' }}>📄</span>
                    <div>
                      <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                        {doc.mimeType || 'PDF / Document'}
                      </span>
                      {fileSizeMb && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                          {fileSizeMb} MB
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
                    {doc.title}
                  </h3>

                  {doc.caption && (
                    <p className="line-clamp-2" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                      {truncateWords(doc.caption, 130)}
                    </p>
                  )}
                </div>

                <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <a
                    href={`/api/v1/tenant/public/media/${doc.id}/file`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ textDecoration: 'none' }}
                    aria-label={`Download File - ${doc.title}`}
                  >
                    Download File<span className="sr-only">: {doc.title}</span> &darr;
                  </a>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>📁</span>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#f8fafc' }}>
            No Public Documents Currently Published
          </p>
          <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 1.5rem auto', fontSize: '0.95rem' }}>
            Official publications, prospectuses, and downloadable forms for {institutionName} will appear here when released.
          </p>
          <Link href="/contact" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
            Contact Admissions & Enquiries
          </Link>
        </div>
      )}
    </div>
  );
}

