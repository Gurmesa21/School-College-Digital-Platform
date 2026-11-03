import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { fetchCurrentTenant, formatInstitutionType } from '@/lib/tenant';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
    const tenant = await fetchCurrentTenant(host);

    const titleParam = searchParams.get('title');
    const subtitleParam = searchParams.get('subtitle');
    const typeParam = searchParams.get('type');

    const institutionName = tenant?.name || 'Academic Institution';
    const institutionType = formatInstitutionType(tenant?.institutionType);
    const displayTitle = (titleParam || institutionName).slice(0, 80);
    const displaySubtitle = (subtitleParam || (titleParam ? institutionName : institutionType)).slice(0, 120);
    const badgeType = (typeParam || 'PORTAL').toUpperCase();

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#0f172a',
            backgroundImage: 'radial-gradient(circle at 25px 25px, #1e293b 2%, transparent 0%), radial-gradient(circle at 75px 75px, #1e293b 2%, transparent 0%)',
            backgroundSize: '100px 100px',
            padding: '60px 80px',
            fontFamily: 'sans-serif',
            color: '#ffffff',
          }}
        >
          {/* Top Bar / Branding */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                }}
              >
                🎓
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: '#93c5fd',
                  }}
                >
                  {institutionName}
                </span>
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>
                  {institutionType}
                </span>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '9999px',
                padding: '8px 20px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#38bdf8',
                letterSpacing: '0.05em',
              }}
            >
              {badgeType}
            </div>
          </div>

          {/* Center Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxWidth: '1000px',
            }}
          >
            <h1
              style={{
                fontSize: displayTitle.length > 50 ? '46px' : '56px',
                fontWeight: 800,
                lineHeight: 1.15,
                color: '#f8fafc',
                margin: 0,
              }}
            >
              {displayTitle}
            </h1>
            <p
              style={{
                fontSize: '22px',
                color: '#cbd5e1',
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              {displaySubtitle}
            </p>
          </div>

          {/* Bottom Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid #334155',
              paddingTop: '24px',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', color: '#64748b' }}>Canonical Source:</span>
              <span style={{ fontSize: '16px', color: '#38bdf8', fontWeight: 600 }}>
                {tenant?.primaryDomain || tenant?.matchedHostname || host}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#22c55e',
                }}
              />
              <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>
                Verified Institutional Portal
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('[OpenGraph Image Generation] Error:', error);
    return new Response('Failed to generate OpenGraph image', { status: 500 });
  }
}

