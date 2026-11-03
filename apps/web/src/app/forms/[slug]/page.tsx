import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import DynamicPublicForm from '@/components/DynamicPublicForm';
import { getRequestHost, fetchCurrentTenant } from '@/lib/tenant';

interface FormPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: FormPageProps): Promise<Metadata> {
  const { slug } = await params;
  const host = await getRequestHost();
  const tenant = await fetchCurrentTenant(host);
  const name = tenant?.name || 'Educational Institution';
  const formattedSlug = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `${formattedSlug} | ${name}`,
    description: `Official online form submission for ${name}.`,
  };
}

export default async function PublicFormPage({ params }: FormPageProps) {
  const { slug } = await params;
  const host = await getRequestHost();
  const tenant = await fetchCurrentTenant(host);
  const tenantSlug = tenant?.slug || 'oxford';

  return (
    <main id="main-content" style={{ minHeight: '80vh', padding: '2rem 1rem' }}>
      <nav aria-label="Breadcrumb" style={{ maxWidth: '720px', margin: '0 auto 1.5rem auto', fontSize: '0.875rem' }}>
        <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          &larr; Return to Home
        </Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>/</span>
        <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Form</span>
      </nav>

      <DynamicPublicForm slug={slug} tenantSlug={tenantSlug} />
    </main>
  );
}
