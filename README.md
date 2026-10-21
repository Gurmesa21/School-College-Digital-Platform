# Private School & College Digital Website Platform

> A configurable, multi-tenant digital experience platform for private schools, colleges, kindergartens, and TVET institutions.

[![Project Status: Day 1 Foundation](https://img.shields.io/badge/Status-Day%201%20Foundation-blue.svg)](#)
[![Architecture: Modular Monolith](https://img.shields.io/badge/Architecture-Modular%20Monolith-green.svg)](#)
[![Accessibility Target: WCAG 2.2 AA](https://img.shields.io/badge/A11y%20Target-WCAG%202.2%20AA-purple.svg)](#)

---

## 1. Repository Structure

This repository is organized as an npm-workspaces monorepo:

```text
School_website/
├── apps/
│   ├── web/                    # Next.js App Router (Public SSR & Admin Portal)
│   │   ├── src/app/            # App Router pages and layouts
│   │   └── public/             # Static public assets
│   └── api/                    # Node.js + Express REST API (/api/v1)
│       ├── src/config/         # Zod-validated environment configuration
│       ├── src/middleware/     # Error handling, request correlation ID
│       ├── src/routes/         # Versioned API routes & health probes
│       └── tests/              # Vitest API integration tests
├── packages/
│   ├── db/                     # Prisma ORM schema & client
│   │   └── prisma/             # Multi-tenant schema (Tenant, TenantDomain)
│   └── shared/                 # Shared TypeScript interfaces & Zod schemas
├── docs/
│   └── architecture/           # Architecture Decision Records (ADRs)
├── .env.example                # Sanitized environment configuration template
├── .gitignore                  # Git exclusion rules
├── package.json                # Root monorepo manifest and orchestration scripts
└── README.md                   # Operational guide
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

### 3. Database Schema Validation & Client Generation
Validate the Prisma schema and generate the database client:

```bash
npm run prisma:validate
npm run prisma:generate
```

### 4. Running the Development Environment
Run both the API and Web services concurrently:

```bash
npm run dev
```

* **Frontend Web Application:** [http://localhost:3000](http://localhost:3000)
* **REST API Service:** [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)

---

## 4. Verification and Quality Scripts

| Command | Description |
| :--- | :--- |
| `npm run build` | Builds all packages (`shared`, `db`, `api`, `web`) in dependency order |
| `npm run test` | Executes the automated test suites across all workspaces |
| `npm run typecheck` | Runs TypeScript strict type checking without emitting files |
| `npm run lint` | Runs linter checks across all workspaces |
| `npm run prisma:validate` | Validates the multi-tenant Prisma database schema |
| `npm run prisma:generate` | Generates the typed Prisma client |

---

## 5. Security and Data Integrity Principles

1. **Server-Side Tenant Resolution:** Requests are resolved strictly on the server from verified hostname mappings (`FR-TEN-003`). Client headers cannot override server context.
2. **Relationship-Specific Retention:** Audit logs and enquiries are immutable and non-cascading (`Restrict` policy).
3. **WCAG 2.2 AA Compliance:** All interface components provide visible focus indicators, programmatic labels, and contrast validation.
