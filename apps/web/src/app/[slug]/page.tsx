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

            case 'ACCORDION':
              const accordionItems = Array.isArray(config.items) ? (config.items as any[]) : [];
              return (
                <section
                  key={sec.id}
                  className="accordion-section"
                  aria-labelledby={`accordion-heading-${sec.id}`}
                >
                  {config.title ? (
                    <h2 id={`accordion-heading-${sec.id}`}>{config.title as string}</h2>
                  ) : null}
                  {config.subtitle ? (
                    <p className="section-subtitle">{config.subtitle as string}</p>
                  ) : null}
                  <div className="accordion-list">
                    {accordionItems.map((item, idx) => (
                      <details
                        key={item.id || idx}
                        className="accordion-item"
                        open={Boolean(item.isOpenDefault)}
                      >
                        <summary className="accordion-summary">{item.title}</summary>
                        <div className="accordion-content">
                          <p>{item.content}</p>
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              );

            case 'CTA_BANNER':
              const themeClass = config.theme ? `cta-theme-${config.theme}` : 'cta-theme-primary';
              const alignClass =
                config.alignment === 'left'
                  ? 'text-left'
                  : config.alignment === 'right'
                  ? 'text-right'
                  : 'text-center';
              return (
                <section
                  key={sec.id}
                  className={`cta-banner-section ${themeClass} ${alignClass}`}
                  aria-labelledby={`cta-heading-${sec.id}`}
                >
                  <div className="cta-banner-inner">
                    <h2 id={`cta-heading-${sec.id}`}>{config.headline as string}</h2>
                    {config.subheadline ? (
                      <p className="cta-subheadline">{config.subheadline as string}</p>
                    ) : null}
                    <div className="cta-buttons">
                      {config.primaryButtonText && config.primaryButtonUrl ? (
                        <a
                          href={config.primaryButtonUrl as string}
                          className="btn btn-primary"
                          style={{ textDecoration: 'none' }}
                        >
                          {config.primaryButtonText as string}
                        </a>
                      ) : null}
                      {config.secondaryButtonText && config.secondaryButtonUrl ? (
                        <a
                          href={config.secondaryButtonUrl as string}
                          className="btn btn-outline"
                          style={{ textDecoration: 'none' }}
                        >
                          {config.secondaryButtonText as string}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </section>
              );

            case 'STATS_COUNTER':
              const statItems = Array.isArray(config.items) ? (config.items as any[]) : [];
              return (
                <section
                  key={sec.id}
                  className="stats-counter-section"
                  aria-labelledby={`stats-heading-${sec.id}`}
                >
                  {config.title ? (
                    <h2 id={`stats-heading-${sec.id}`}>{config.title as string}</h2>
                  ) : null}
                  {config.subtitle ? (
                    <p className="section-subtitle">{config.subtitle as string}</p>
                  ) : null}
                  <div className="stats-grid">
                    {statItems.map((item, idx) => (
                      <div key={idx} className="stat-card">
                        <div className="stat-value">
                          {item.value}
                          {item.suffix || ''}
                        </div>
                        <div className="stat-label">{item.label}</div>
                        {item.description ? (
                          <p className="stat-description">{item.description}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              );

            case 'TESTIMONIALS':
              const testimonialItems = Array.isArray(config.items) ? (config.items as any[]) : [];
              return (
                <section
                  key={sec.id}
                  className="testimonials-section"
                  aria-labelledby={`testimonials-heading-${sec.id}`}
                >
                  {config.title ? (
                    <h2 id={`testimonials-heading-${sec.id}`}>{config.title as string}</h2>
                  ) : null}
                  {config.subtitle ? (
                    <p className="section-subtitle">{config.subtitle as string}</p>
                  ) : null}
                  <div className="testimonials-grid">
                    {testimonialItems.map((item, idx) => (
                      <blockquote key={idx} className="testimonial-card">
                        <p className="testimonial-quote">"{item.quote}"</p>
                        <footer className="testimonial-footer">
                          <cite className="testimonial-author">{item.author}</cite>
                          {item.role ? (
                            <span className="testimonial-role">, {item.role}</span>
                          ) : null}
                          {item.organization ? (
                            <span className="testimonial-org"> — {item.organization}</span>
                          ) : null}
                        </footer>
                      </blockquote>
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
