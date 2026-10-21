# Private School & College Digital Website Platform

> A configurable, multi-tenant digital experience platform for private schools, colleges, kindergartens, and TVET institutions.

[![Project Status: Day 3 Auth & Tenant-Scoped RBAC](https://img.shields.io/badge/Status-Day%203%20Auth%20%26%20RBAC-blue.svg)](#)
[![Architecture: Modular Monolith](https://img.shields.io/badge/Architecture-Modular%20Monolith-green.svg)](#)
[![Vulnerabilities: 0](https://img.shields.io/badge/Vulnerabilities-0%20detected-brightgreen.svg)](#)
[![Accessibility Target: WCAG 2.2 AA](https://img.shields.io/badge/A11y%20Target-WCAG%202.2%20AA-purple.svg)](#)

---

## 1. Repository Structure

This repository is organized as an npm-workspaces monorepo:

```text
School_website/
├── apps/
│   ├── web/                         # Next.js App Router (Public SSR & Admin Portal)
│   │   ├── src/app/                 # App Router pages and layouts
│   │   └── public/                  # Static public assets
│   └── api/                         # Node.js + Express REST API (/api/v1)
│       ├── src/config/              # Zod-validated environment configuration
│       ├── src/middleware/          # Tenant resolver, session resolver, RBAC guards, CSRF
│       ├── src/repositories/        # Tenant & Auth repositories (Prisma & InMemory)
│       ├── src/routes/              # Versioned API routes (/health, /auth, /tenant, /platform)
│       ├── src/services/            # AuthService, PasswordService, TokenService, EmailService
│       └── tests/                   # Vitest automated test suites (50 passing tests)
├── packages/
│   ├── db/                          # Prisma ORM schema, migrations, seed script
│   │   ├── prisma/schema.prisma     # Identity, membership, role, permission, session schema
│   │   ├── prisma/migrations/       # Controlled database migrations (2 applied SQL migrations)
│   │   └── prisma/seed.ts           # Idempotent development seed script (tenants, roles, perms)
│   └── shared/                      # Shared TypeScript interfaces & Zod schemas
│       └── src/index.ts             # Hostname normalizer, permissions, DTOs, response envelopes
├── docs/
│   ├── architecture/                # Architecture Decision Records (ADR-001)
│   └── project-management/
│       └── reports/                 # Durable daily implementation reports & index
├── .env.example                     # Sanitized environment configuration template
├── .gitignore                       # Multi-tier exclusion rules (ignores .env*, tracks .env.example)
├── package.json                     # Root monorepo manifest and orchestration scripts
└── README.md                        # Operational runbook
```

---

## 2. Prerequisites

- **Node.js:** v24.x or later (developed and verified on `v24.18.1`)
- **npm:** v11.x or later (developed and verified on `11.16.0`)
- **PostgreSQL:** Version 16+ (local service `postgresql-x64-18` supported)
- **Git:** Installed and configured

---

## 3. Getting Started

### 1. Installation
Clone the repository and install all workspace dependencies from the project root:

```bash
npm install
```

### 2. Environment Configuration
Copy the template configuration:

```bash
cp .env.example .env.local
```

Configure your local database credentials in `DATABASE_URL` within `.env.local` or `packages/db/.env`.
*(Note: `.env*` files are strictly excluded from source control by `.gitignore`; `.env.example` remains tracked).*

### 3. Database Schema Validation & Migration
Validate the schema, create the typed Prisma client, and inspect migrations:

```bash
# Validate schema syntax
npm run prisma:validate

# Generate Prisma Client
npm run prisma:generate

# Apply migrations to local PostgreSQL database (requires valid DATABASE_URL)
npm run prisma:migrate
```

### 4. Idempotent Development Seeding
Populate the database with representative multi-tenant institutions, system permissions, and baseline roles:

```bash
npm run db:seed
```

The seed script creates the following development tenants and system roles:
* **Kindergarten:** `Little Explorers Kindergarten` (`kindergarten.localhost`)
* **Secondary School:** `Greenwood Secondary School` (`secondary.localhost`, `greenwood.localhost`)
* **TVET College:** `Summit TVET & Vocational Institute` (`tvet.localhost`)
* **Suspended Institution:** `Heritage Academy (Suspended)` (`suspended.localhost`)
* **Roles Registered:** `SUPER_ADMIN`, `TENANT_ADMIN`, `PRINCIPAL`, `ADMISSIONS_OFFICER`, `STAFF` with least-privilege permission bundles.

*Safety Note:* The seed script is strictly forbidden from running when `NODE_ENV === 'production'`.

### 5. Running the Development Environment
Run both the API and Web services concurrently:

```bash
npm run dev
```

* **Frontend Web Application:** [http://localhost:3000](http://localhost:3000)
* **REST API Service:** [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)
* **Resolved Tenant Diagnostic:** [http://secondary.localhost:4000/api/v1/tenant/current](http://secondary.localhost:4000/api/v1/tenant/current)

---

## 4. Multi-Tenant Resolution & Server-Side RBAC Architecture

### 4.1 Tenancy Resolution Flow
Tenant resolution is enforced centrally in the API request pipeline (`apps/api/src/middleware/tenantResolver.ts`) in accordance with SRS Section 11.2 and `BR-001`.

```text
Incoming HTTP Request
       │
       ▼
Extract Hostname (Host or X-Forwarded-Host if TRUST_PROXY=true)
       │
       ▼
Deterministic Normalization: lowercase, strip port (:4000), strip trailing dot
       │
       ▼
Is Loopback Host + Client IP AND ALLOW_DEV_TENANT_OVERRIDE=true AND ?tenant=<slug>?
    ├── YES ──► Lookup Tenant by Slug (Development Override)
    └── NO  ──► Query Database for Approved TenantDomain Mapping
       │
       ▼
Tenant Found?
    ├── NO  ──► Return HTTP 404 Institution Not Found (No data leaked)
    └── YES ──► Check Operational Status:
                 ├── ACTIVE    ──► Attach req.tenant and proceed (200 OK)
                 ├── SUSPENDED ──► Return HTTP 403 Institution Suspended
                 └── PENDING   ──► Return HTTP 403 Institution Inactive
```

### 4.2 Authentication & Session Lifecycle
- **Password Security:** Salted and hashed using `bcrypt` (12 rounds) with constant-time dummy comparisons to eliminate user enumeration and timing side channels.
- **Session Tokens:** 32-byte (256-bit) cryptographically random tokens (`TokenService.generateRandomToken()`).
- **Token Persistence:** Only SHA-256 hashes of session tokens are persisted to PostgreSQL (`Session.tokenHash`). Raw tokens are never logged or stored in plain text.
- **Cookie Security:** Issued over HTTP-only cookies (`school_session`) with `SameSite=Lax`, `Path=/`, and `Secure` flag enabled in production.
- **CSRF Defense:** Origin validation middleware enforces that cookie-authenticated mutating requests (POST, PUT, PATCH, DELETE) match trusted origins.
- **Revocation:** Explicit sign-out sets `revokedAt = now()` in the database and clears the client cookie. Deactivated accounts immediately invalidate active sessions.

### 4.3 Password Reset & Email Verification Workflows
- **Non-Disclosing Enumeration Protection:** `POST /api/v1/auth/password-reset/request` returns identical generic success responses regardless of whether the submitted email address exists.
- **Single-Use & Expiry:** Password reset tokens expire after 60 minutes and email verification tokens expire after 24 hours. Once used, `usedAt` is stamped and subsequent reuse attempts return 400 `INVALID_RESET_TOKEN`.
- **Session Termination:** Completing a password reset automatically revokes all existing sessions across all devices for that user.

### 4.4 Tenant-Scoped RBAC & Isolation
- **Distinct Concepts:** A `User` account is distinct from a `Membership` in a `Tenant`. Disabling a membership in Tenant A does not deactivate unrelated memberships in Tenant B.
- **Tenant Context Verification:** `requireTenantMembership` validates that `req.user` holds an `ACTIVE` membership specifically within `req.tenant.id`.
- **Cross-Tenant Attack Prevention:** A user holding administrator permissions in Tenant A is rejected with 403 `TENANT_MEMBERSHIP_REQUIRED` when attempting to access Tenant B. Host header modifications or client headers (`x-tenant-id`) cannot grant access to another tenant.
- **Least-Privilege RBAC:** `requirePermission(code)` evaluates user permissions derived from assigned roles. Operations are guarded before any business logic executes.
- **Platform Separation:** Privileged platform operations (`/api/v1/platform/*`) require `isSuperAdmin === true`. Ordinary tenant roles cannot invoke platform routes.

---

## 5. Automated Testing Suite

The platform includes 50 automated tests in Vitest executed with Supertest and isolated repository mocks:

```bash
# Run all automated tests
npm test
```

### Test Coverage Areas
1. **Health Probes (`tests/health.test.ts` - 5 tests):** Liveness probes, JSON format, error handling, port configuration validation.
2. **Tenant Resolver (`tests/tenantResolver.test.ts` - 20 tests):** Hostname normalization, IPv4/IPv6 handling, domain mapping, inactive tenant fail-closed, loopback dev override rules, production security trace, database failure 503 handling.
3. **Auth & RBAC Suite (`tests/authAndRbac.test.ts` - 25 tests):**
   - Valid credentials establish HTTP-only session.
   - Invalid credentials rejected without disclosing sensitive details.
   - Sign-out revokes session and clears cookie.
   - Expired sessions rejected.
   - Password reset tokens expire and cannot be reused.
   - Reset requests do not disclose whether account exists.
   - Email verification token validated and consumed safely.
   - Unauthenticated requests rejected.
   - Permitted tenant action succeeds.
   - Missing permission rejected with 403.
   - Cross-tenant access strictly prevented.
   - Suspended membership denied access.
   - Ordinary tenant admins cannot invoke platform operations.
   - CSRF origin validation on cookie-authenticated requests.
   - Absence of sensitive values in error responses.

---

## 6. Verification and Quality Scripts

| Command | Description |
| :--- | :--- |
| `npm run build` | Builds all packages (`shared`, `db`, `api`, `web`) in dependency order |
| `npm run test` | Executes the automated Vitest test suites (50 unit and integration tests) |
| `npm run typecheck` | Runs TypeScript strict type checking across all workspaces |
| `npm run lint` | Runs linter checks across all workspaces |
| `npm run prisma:validate` | Validates the multi-tenant Prisma database schema |
| `npm run prisma:generate` | Generates the typed Prisma client |
| `npm run prisma:migrate` | Applies schema migrations to PostgreSQL |
| `npm run db:seed` | Seeds idempotent development multi-tenant and RBAC records |

---

## 7. Project Management & Durable Implementation Reports

All daily implementation reports are tracked in Git under `docs/project-management/reports/`:
- [`docs/project-management/reports/INDEX.md`](./docs/project-management/reports/INDEX.md)
- [`docs/project-management/reports/DAY-01-IMPLEMENTATION-REPORT.md`](./docs/project-management/reports/DAY-01-IMPLEMENTATION-REPORT.md)
- [`docs/project-management/reports/DAY-02-IMPLEMENTATION-REPORT.md`](./docs/project-management/reports/DAY-02-IMPLEMENTATION-REPORT.md)
- [`docs/project-management/reports/DAY-03-IMPLEMENTATION-REPORT.md`](./docs/project-management/reports/DAY-03-IMPLEMENTATION-REPORT.md)
