# Supabase Migration Checklist

This project is moving from:

```text
Vercel frontend -> Railway NestJS backend -> Railway MySQL
```

to:

```text
Vercel frontend -> Supabase Auth/Postgres/RLS/Edge Functions
```

## Credentials

Do not commit real credentials. Keep these in local/Vercel/Supabase secret storage.

Frontend `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Supabase Edge Function secrets:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Temporary migration-only Railway MySQL values:

```env
RAILWAY_DB_HOST=
RAILWAY_DB_PORT=
RAILWAY_DB_USERNAME=
RAILWAY_DB_PASSWORD=
RAILWAY_DB_NAME=
```

## Current Code Added

- `frontend/src/lib/supabase.ts`: browser Supabase client.
- `frontend/src/lib/supabase-auth.ts`: Supabase Auth adapter that returns the old `AuthUser` shape.
- `backend/supabase/migrations/202608030001_initial_sales_dashboard.sql`: first Postgres schema/RLS migration.
- `backend/supabase/functions/ai`: Edge Function replacing the old Railway chat/proposal review endpoints.

## Migration Order

1. Add Supabase frontend env vars to `frontend/.env.local`.
2. Link the local Supabase project from `backend/`.
3. Apply the initial migration to Supabase.
4. Create/import Supabase Auth users.
5. Populate `profiles` rows for all users.
6. Migrate Railway MySQL data into matching Supabase tables.
7. Deploy the `ai` Edge Function and set OpenAI secrets.
8. Replace frontend `api.*` calls module by module.
9. Remove `NEXT_PUBLIC_API_URL` after the last old API call is gone.
10. Deploy Vercel.
11. Freeze Railway writes and run final data sync.
12. Shut down Railway backend and database after verification.

## Commands

Run these from `backend/` after Supabase CLI is authenticated and linked:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase secrets set OPENAI_API_KEY=...
supabase functions deploy ai
```

Use `pgloader` for MySQL-to-Postgres data migration:

```bash
pgloader mysql://USER:PASSWORD@RAILWAY_HOST:PORT/DB_NAME postgresql://postgres:SUPABASE_PASSWORD@SUPABASE_HOST:5432/postgres
```

## Remaining Frontend API Replacement

Search for old API calls:

```bash
rg "api\\.(get|post|put|patch|delete)|NEXT_PUBLIC_API_URL" frontend/src
```

Replace simple CRUD calls with:

```ts
supabase.from('table_name').select()
supabase.from('table_name').insert(payload).select()
supabase.from('table_name').update(payload).eq('id', id).select()
supabase.from('table_name').delete().eq('id', id)
```

Replace AI calls with:

```ts
supabase.functions.invoke('ai', {
  body: { action: 'message', message, context },
})
```

## Data Verification

Compare row counts before cutover:

```sql
select count(*) from profiles;
select count(*) from rep;
select count(*) from proposal;
select count(*) from lead;
select count(*) from job;
select count(*) from activity_log;
```

Then verify app flows:

- Login/logout
- Dashboard
- Proposal board
- Leads
- Team/users
- Assignments
- Notifications
- LinkedIn pages
- Freelancer pages
- Chat/proposal review
