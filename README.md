# DemandFlow Live Analytics — Next.js App Router

A real-time, television-optimized operations and QA analytics presentation system and administrative target allocation portal, built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Apache ECharts**, **Recharts**, and **TanStack Query**.

Communicates securely with the PHP/MySQL backend of **DemandFlow Bridge CRM** through dedicated REST APIs.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Browser (Floor TV Displays / Admin Workstations)        │
└───────────────────────────┬─────────────────────────────┘
                            │ Fetch (JSON / TanStack Query)
                            ▼
┌─────────────────────────────────────────────────────────┐
│ Next.js App Router & Server Route Handlers              │
│ - Validates requests with Zod schemas                   │
│ - Enforces Admin sessions & CSRF protection             │
│ - Keeps CRM credentials private (server-side only)     │
│ - Performs resilient timeouts and fallback handling     │
└───────────────────────────┬─────────────────────────────┘
                            │ Server-to-Server HTTP REST API
                            ▼
┌─────────────────────────────────────────────────────────┐
│ DemandFlow Bridge CRM (PHP 8.x)                         │
│ - api/v1/slides_analytics.php?action=...                │
│ - api/v1/slides/slide1.php ... slide5.php               │
│ - api/v1/campaign_daily_targets.php                     │
└───────────────────────────┬─────────────────────────────┘
                            │ MySQL PDO / Prepared Queries
                            ▼
┌─────────────────────────────────────────────────────────┐
│ CRM MySQL Database                                      │
│ (users, campaigns, leads, campaign_daily_targets)       │
└─────────────────────────────────────────────────────────┘
```

> **Security Rule**: The browser never directly touches the CRM database or holds upstream CRM API credentials. All communication is routed through Next.js Route Handlers.

---

## Key Features

### 1. Full-Screen Automated Presentation (`/presentation`)
- **Slide 1: Operations Overview** — 4 Attendance KPI cards (Total, Present, Absent, Late comers), Live Campaigns Table with progress bars and daily targets, and Late Comers punch-in monitor.
- **Slide 2: Agent Productivity** — Team quota summary and auto-rotating agent points table (pages through all floor SDRs every 7 seconds).
- **Slide 3: QA Timewise Heatmap** — Apache ECharts visualization of qualified leads per QA analyst across 54 10-minute intervals (09:30 – 18:30 shift).
- **Slide 4: Agent Lead Generation Heatmap** — Apache ECharts visualization of leads generated per SDR across 10-minute shift intervals.
- **Slide 5: Comparative Analytics** — Dual-axis Recharts timeline and cumulative trajectory comparing outbound lead generation vs QA auditing & qualifications.
- **Presentation Controls**: Automated slide rotation timer, Spacebar pause/play, Arrow key navigation, 1–5 direct jump, fullscreen toggle, and live refresh status pill.

### 2. Admin Target Allocation Portal (`/admin/campaign-targets`)
- Fetches currently live campaigns from CRM.
- Displays verified monthly contract allocations.
- Allows authorized operations administrators to allocate campaign-wise daily targets for any selected date.
- Enforces the non-decrementing calculation formula:
  $$\text{Daily Remaining} = \max(0, \text{Allocated Daily Target} - \text{Eligible Qualified Leads})$$
- Single-row and batch saving with instant cache invalidation replicating targets immediately to Slide 1.

### 3. Additional Admin Modules
- `/admin` — High-level operations overview dashboard.
- `/admin/target-history` — Historical target allocations and completion audit trail.
- `/admin/presentation-settings` — Custom rotation intervals (15s–60s), enabled slides sequence, and display scale profiles.
- `/(auth)/login` — Administrative session login with HTTP-only cookies.

---

## Environment Variables (`.env.local`)

```env
# Upstream CRM REST API base URL (server-side only)
CRM_API_BASE_URL=http://localhost/demandflowbridge/api/v1

# Optional CRM Bearer token (server-side only)
CRM_API_TOKEN=

# Admin Authorization Secret
ADMIN_AUTH_TOKEN=df_admin_secret_token_2026

# Branding and polling intervals
NEXT_PUBLIC_APP_NAME=DemandFlow Live Analytics
NEXT_PUBLIC_REFRESH_INTERVAL=30000

# High-fidelity spec fallback for local testing when CRM is offline
CRM_FALLBACK_DEMO_MODE=true
```

---

## Getting Started

### Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the portal.
- Presentation: [http://localhost:3000/presentation](http://localhost:3000/presentation)
- Admin Targets: [http://localhost:3000/admin/campaign-targets](http://localhost:3000/admin/campaign-targets)
- Admin Login: [http://localhost:3000/login](http://localhost:3000/login) (`admin@demandflow.io` / `DemandFlow2026!`)

### Production Build
```bash
npm run build
npm start
```

---

## Upstream CRM PHP Endpoints Mapped

1. `GET & POST /api/v1/campaign_daily_targets.php` — Daily target allocation & live campaigns query.
2. `GET /api/v1/slides/slide1.php` (or `?action=slide1`) — Attendance KPIs, campaigns table, late comers.
3. `GET /api/v1/slides/slide2.php` (or `?action=slide2`) — Agent points target and pagination.
4. `GET /api/v1/slides/slide3.php` (or `?action=slide3`) — QA 10-minute heatmap.
5. `GET /api/v1/slides/slide4.php` (or `?action=slide4`) — Agent 10-minute heatmap.
6. `GET /api/v1/slides/slide5.php` (or `?action=slide5`) — Comparative timeline analytics.
7. `GET /api/v1/slides_analytics.php?action=all` — Single payload fetching all 5 slides.
