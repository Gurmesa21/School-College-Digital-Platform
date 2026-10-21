# Private School & College Digital Website Platform

> A configurable, multi-tenant digital experience platform for private schools, colleges, kindergartens, and TVET institutions.

[![Project Status: Day 2 Multi-Tenant Foundation](https://img.shields.io/badge/Status-Day%202%20Multi--Tenant%20Foundation-blue.svg)](#)
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
│       ├── src/middleware/          # Tenant resolver, error handling, request ID
│       ├── src/repositories/        # Tenant repository (Prisma & InMemory implementations)
│       ├── src/routes/              # Versioned API routes (/health, /tenant/current)
│       └── tests/                   # Vitest integration tests (25 passing tests)
├── packages/
│   ├── db/                          # Prisma ORM schema, migrations, seed script
│   │   ├── prisma/schema.prisma     # Multi-tenant schema (Tenant, TenantDomain)
│   │   ├── prisma/migrations/       # Controlled database migrations
│   │   └── prisma/seed.ts           # Idempotent development seed script
│   └── shared/                      # Shared TypeScript interfaces & Zod schemas
│       └── src/index.ts             # Hostname normalizer, DTOs, repository interfaces
├── docs/
│   └── architecture/                # Architecture Decision Records (ADRs)
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
Validate the schema, create the typed Prisma client, and apply migrations:

```bash
# Validate schema syntax
npm run prisma:validate

# Generate Prisma Client
npm run prisma:generate

# Apply migrations to local PostgreSQL database (requires valid DATABASE_URL)
npm run prisma:migrate
```

### 4. Idempotent Development Seeding
Populate the database with representative multi-tenant institutions:

```bash
npm run db:seed
```

The seed script creates the following development tenants:
* **Kindergarten:** `Little Explorers Kindergarten` (`kindergarten.localhost`)
* **Secondary School:** `Greenwood Secondary School` (`secondary.localhost`, `greenwood.localhost`)
* **TVET College:** `Summit TVET & Vocational Institute` (`tvet.localhost`)
* **Suspended Institution:** `Heritage Academy (Suspended)` (`suspended.localhost`)

*Safety Note:* The seed script is strictly forbidden from running when `NODE_ENV === 'production'`.

### 5. Running the Development Environment
Run both the API and Web services concurrently:

```bash
npm run dev
```

* **Frontend Web Application:** [http://localhost:3000](http://localhost:3000)
* **REST API Service:** [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)
* **Current Resolved Tenant Probe:** [http://secondary.localhost:4000/api/v1/tenant/current](http://secondary.localhost:4000/api/v1/tenant/current)

---

## 4. Multi-Tenant Resolution Architecture

Tenant resolution is enforced centrally in the API request pipeline (`apps/api/src/middleware/tenantResolver.ts`) in accordance with SRS Section 11.2 and `BR-001`.

```text
Incoming HTTP Request
       │
       ▼
Extract Hostname (Host or X-Forwarded-Host if TRUST_PROXY=true)
       │
       ▼
Deterministic Normalization: lowercase, strip port (:3000), strip trailing dot
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

### Key Security Guardrails
1. **Client Headers Ignored:** Headers such as `x-tenant-id` or `x-tenant-slug` are strictly ignored and cannot override server-resolved context.
2. **Loopback Dev Override Constraint:** Query parameter tenant selection (`?tenant=slug`) is allowed **only** when all of the following conditions are met:
   * `ALLOW_DEV_TENANT_OVERRIDE=true` in environment configuration.
   * `NODE_ENV` and `APP_ENV` are not `production` or `staging`.
   * The request host is loopback (`localhost`, `127.0.0.1`, `::1`).
   * The client connection IP is loopback (`127.0.0.1`, `::1`).
3. **No Silent Fallback:** If an unmapped domain requests access or if the database is unreachable, the system fails closed (returning 404 or 503) and never silently serves another tenant's records.
4. **Reverse Proxy Host Preservation:** When Next.js or a reverse proxy forwards requests to the Express API, it must preserve the original client `Host` header (e.g., `proxy_set_header Host $host;` in Nginx). If running behind a reverse proxy, set `TRUST_PROXY=true` in the API configuration to trust `X-Forwarded-Host`.

---

## 5. Operational Health: Liveness vs. Readiness

* **Liveness Probe (`GET /health` and `GET /api/v1/health`):** Mounted explicitly outside tenant resolution. Confirms the Node.js/Express event loop is responsive and healthy. Does not require tenant context or database access.
* **Readiness Probe:** Evaluates database connectivity and dependency readiness. Liveness probes intentionally avoid falsely asserting database readiness.

---

## 6. Verification and Quality Scripts

| Command | Description |
| :--- | :--- |
| `npm run build` | Builds all packages (`shared`, `db`, `api`, `web`) in dependency order |
| `npm run test` | Executes the automated Vitest test suites (25 unit and integration tests) |
| `npm run typecheck` | Runs TypeScript strict type checking across all workspaces |
| `npm run lint` | Runs linter checks across all workspaces |
| `npm run prisma:validate` | Validates the multi-tenant Prisma database schema |
| `npm run prisma:generate` | Generates the typed Prisma client |
| `npm run prisma:migrate` | Applies schema migrations to PostgreSQL |
| `npm run db:seed` | Seeds idempotent development multi-tenant records |
