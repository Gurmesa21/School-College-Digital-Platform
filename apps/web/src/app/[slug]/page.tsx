import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import type { PublicPageDto } from '@school/shared';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function fetchPublicPage(slug: string, host: string): Promise<PublicPageDto | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  try {
    const res = await fetch(`${apiUrl}/api/v1/tenant/public/pages/${slug}`, {
      headers: {
        Host: host,
      },
      cache: 'no-store',
    });

    if (res.status === 404 || !res.ok) {
      return null;
    }

    const data = await res.json();
    if (!data.success || !data.data) {
      return null;
    }
    return data.data as PublicPageDto;
  } catch (err) {
    console.error(`[Public Page] Failed to fetch page "${slug}":`, err);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';

  const page = await fetchPublicPage(slug, host);
  if (!page) {
    return {
      title: 'Page Not Found',
    };
  }

  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || page.summary || undefined,
  };
}

export default async function PublicCmsPage({ params }: PageProps) {
  const { slug } = await params;
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';

  const page = await fetchPublicPage(slug, host);
  if (!page) {
    notFound();
  }

  return (
    <main id="main-content" className="cms-public-page">
      <nav aria-label="Breadcrumb" style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        <a href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          &larr; Return to Home
        </a>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>/</span>
        <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{page.title}</span>
      </nav>

      {page.sections && page.sections.length > 0 ? (
        page.sections.map((sec) => {
          const config = sec.config || {};
          switch (sec.sectionType) {
            case 'HERO':
              return (
                <header key={sec.id} className="hero-section" aria-label="Hero Introduction">
                  <h1>{(config.headline as string) || page.title}</h1>
                  {config.subheadline ? (
                    <p className="hero-subheadline">{config.subheadline as string}</p>
                  ) : null}
                  {config.ctaText && config.ctaLink ? (
                    <a
                      href={config.ctaLink as string}
                      className="btn btn-primary"
                      style={{ textDecoration: 'none' }}
                    >
                      {config.ctaText as string}
                    </a>
                  ) : null}
                </header>
              );

            case 'TEXT_CONTENT':
              return (
                <article
                  key={sec.id}
                  className="text-content-section"
                  style={{ textAlign: (config.alignment as any) || 'left' }}
                >
                  <p>{config.body as string}</p>
                </article>
              );

            case 'IMAGE_MEDIA':
              return (
                <figure key={sec.id} className="image-media-section">
                  <img
                    src={config.imageUrl as string}
                    alt={(config.altText as string) || 'Image'}
                    loading="lazy"
                  />
                  {config.caption ? (
                    <figcaption className="image-media-caption">
                      {config.caption as string}
                    </figcaption>
                  ) : null}
                </figure>
              );

            case 'FEATURE_GRID':
              const items = Array.isArray(config.items) ? (config.items as any[]) : [];
              return (
                <section
                  key={sec.id}
                  className="feature-grid-section"
                  aria-labelledby={`feature-heading-${sec.id}`}
                >
                  {config.title ? (
                    <h2 id={`feature-heading-${sec.id}`}>{config.title as string}</h2>
                  ) : null}
                  <div className="grid">
                    {items.map((item, idx) => (
                      <div key={idx} className="feature-card">
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              );

            default:
              return null;
          }
        })
      ) : (
        <article className="card">
          <h1>{page.title}</h1>
          {page.summary && <p style={{ color: 'var(--text-secondary)' }}>{page.summary}</p>}
        </article>
      )}
    </main>
  );
}
