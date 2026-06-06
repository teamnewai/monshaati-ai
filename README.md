# منشأتي AI — Monshaati AI

نظام التشغيل الذكي للمنشآت | AI-Powered Business Operating System

## Quick Start

### 1. Environment Variables
```bash
cp .env.example .env.local
# Fill in your values:
# NEXT_PUBLIC_SUPABASE_URL=
# NEXT_PUBLIC_SUPABASE_ANON_KEY=
# SUPABASE_SERVICE_ROLE_KEY=
# OPENAI_API_KEY=
```

### 2. Supabase Setup
1. Create project at https://supabase.com
2. Run `supabase/migrations/001_initial_schema.sql` in SQL Editor
3. Run `supabase/migrations/002_seed_sectors.sql` in SQL Editor
4. Enable Email auth in Authentication → Providers

### 3. Install & Run
```bash
npm install
npm run dev
```

### 4. Deploy to Vercel
```bash
vercel --prod
# Set environment variables in Vercel dashboard
```

## Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── ai/generate/     # POST — AI generation endpoint
│   │   ├── ai/result/       # GET  — Fetch generation results
│   │   ├── organizations/   # CRUD organizations
│   │   ├── sectors/         # GET  — Sector taxonomy
│   │   ├── export/          # POST — Log exports
│   │   └── admin/stats|orgs # Admin endpoints
│   ├── auth/login|signup|callback
│   ├── dashboard/           # Main dashboard
│   ├── onboarding/          # 3-step org creation + generation
│   ├── results/[id]/        # Full results view with all tabs
│   └── admin/               # Admin dashboard
├── components/
│   ├── ui/                  # Button, Input, Select, Card, Badge
│   ├── layout/              # Navbar, DashboardLayout
│   └── org-chart/           # OrgChartView
├── lib/
│   ├── supabase.ts          # Browser client
│   ├── supabase-server.ts   # Server client + admin client
│   ├── openai.ts            # AI generation
│   ├── export.ts            # PDF + Word export
│   └── utils.ts             # Helpers + constants
├── types/
│   └── database.ts          # All TypeScript types
├── middleware.ts             # Auth protection
└── supabase/migrations/
    ├── 001_initial_schema.sql  # Full DB schema + RLS
    └── 002_seed_sectors.sql    # Saudi/UAE sectors seed
```

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL + RLS)
- **AI**: OpenAI GPT-4o
- **Auth**: Supabase Auth
- **Deploy**: Vercel

## Features
- ✅ AI-generated org chart (hierarchical, visual)
- ✅ Job descriptions with responsibilities, requirements, competencies
- ✅ Policies & procedures library
- ✅ KPI dashboard with department grouping
- ✅ Hiring plan with phases and priorities
- ✅ PDF + Word export
- ✅ Multi-tenant architecture (Row Level Security)
- ✅ Arabic-first UI (RTL)
- ✅ Admin dashboard
- ✅ 4-region ready (KSA, UAE, US, EU)
