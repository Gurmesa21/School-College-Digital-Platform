export default function HomePage() {
  return (
    <div style={{ padding: '2rem 0' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <span className="badge badge-active">Day 1 Implementation Foundation</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>SRS Baseline 1.0</span>
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
          Private School & College Digital Website Platform
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '750px' }}>
          This page represents the active development foundation for the multi-tenant digital platform.
          Core application scaffolding, workspace boundaries, and API integration services are operational.
        </p>
      </header>

      <section className="card" aria-labelledby="status-heading">
        <h2 id="status-heading" style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--accent-primary)' }}>
          Environment & System Status
        </h2>
        <div className="grid">
          <div>
            <strong>Frontend App:</strong>
            <p style={{ color: 'var(--text-secondary)' }}>Next.js 16 (App Router) on port <code>3000</code></p>
          </div>
          <div>
            <strong>REST API Backend:</strong>
            <p style={{ color: 'var(--text-secondary)' }}>
              Node.js / Express on port <code>4000</code>
            </p>
          </div>
          <div>
            <strong>Database Schema:</strong>
            <p style={{ color: 'var(--text-secondary)' }}>PostgreSQL & Prisma ORM (<code>packages/db</code>)</p>
          </div>
          <div>
            <strong>Accessibility Target:</strong>
            <p style={{ color: 'var(--text-secondary)' }}>WCAG 2.2 AA compliant tokens & semantics</p>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '2rem' }} aria-labelledby="architecture-heading">
        <h2 id="architecture-heading" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          Application Space Boundaries
        </h2>
        <div className="grid">
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Public Institutional Portal</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1rem' }}>
              Server-rendered multi-tenant public websites, academic catalogs, news, and admissions inquiries.
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Route namespace: <code>/ (Public tenant views)</code>
            </p>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Institutional Administration</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1rem' }}>
              Protected administration workspace for user administration, invitations, RBAC roles, and audit trail inspection.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Route namespace: <code>/admin</code>
              </span>
              <a href="/admin" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                Open Admin Console &rarr;
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        <p>Private School & College Digital Website Platform — Controlled 20-Day Implementation Plan</p>
      </footer>
    </div>
  );
}
