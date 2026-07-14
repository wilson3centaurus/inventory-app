# SokoFlow

SokoFlow is a mobile-first inventory PWA for Zimbabwean SMEs. It is designed to feel like an installable phone app while staying in the web stack, with offline-first capture, owner and employee flows, and a dedicated self-hosted Supabase schema.

## Stack

- Next.js App Router
- Tailwind CSS v4
- PWA manifest + service worker
- Self-hosted Supabase

## Key product direction

- Secure owner and employee access
- Product, supplier, pricing, barcode, and expiry tracking
- Sales recording with automatic stock movement history
- Offline queue and sync-ready local-first behavior
- Voice stock entry
- Shona and English language support
- AI restocking suggestions
- Multi-shop dashboard, reports, backups, and credit tracking

## Local setup

1. Copy `.env.example` into `.env` and keep your self-hosted Supabase values.
2. Add `NEXT_PUBLIC_SUPABASE_SCHEMA=sokoflow_inventory`.
3. Install packages with `npm install`.
4. Start the app with `npm run dev`.

## Database

- Migration starter: `supabase/migrations/001_sokoflow_inventory.sql`
- Shared-server safety rules: `robocore-docs/SHARED_DB_RULES.md`

The migration uses its own schema and appends that schema to PostgREST safely instead of replacing the shared schema list.
