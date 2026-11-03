import { ImageResponse } from 'next/og';
import { getRequestHost, fetchCurrentTenant, formatInstitutionType } from '@/lib/tenant';

export const runtime = 'edge';
export const alt = 'Institutional Portal';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  const host = await getRequestHost();
  const tenant = await fetchCurrentTenant(host);

  const institutionName = tenant?.name || 'Academic Institution';
  const institutionType = formatInstitutionType(tenant?.institutionType);

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
            }}
          >
            OFFICIAL WEBSITE
          </div>
        </div>

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
              fontSize: '56px',
              fontWeight: 800,
              lineHeight: 1.15,
              color: '#f8fafc',
              margin: 0,
            }}
          >
            {institutionName}
          </h1>
          <p
            style={{
              fontSize: '24px',
              color: '#cbd5e1',
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {institutionType} — Excellence in Education and Holistic Development
          </p>
        </div>

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
            <span style={{ fontSize: '16px', color: '#64748b' }}>Domain:</span>
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
              Official Institutional Portal
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

