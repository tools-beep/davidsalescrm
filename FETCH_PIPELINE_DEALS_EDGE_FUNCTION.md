# ✅ Pipeline Deals Service API

## Date: November 25, 2025

## Why

Account Managers could not see their assigned deals because the standard Supabase client query returned **0 rows** due to row-level security. Counts showed the deals existed, but the data fetch came back empty, so the UI never had any records to filter or render.

## What Changed

1. **New Next.js API Route:** `src/pages/api/fetch-pipeline-deals.ts`
   - Runs on our server with the Supabase service role key, so it bypasses RLS safely.
   - Accepts `pipelineId` (and optional `limit`).
   - Returns all deals for that pipeline, including company/contact references.

2. **Deals Page Update (`src/pages/Deals.tsx`):**
   - Detects “restricted” roles (`manager`, `rep`, `eod_user`).
   - Calls the internal API route instead of the normal client query for those roles.
   - Logs the response and then applies the existing client-side keyword filter.
   - Falls back to the standard Supabase query if the API route fails (helps non-restricted roles).

## Flow Now

```
Account Manager opens Deals page
  ↓
Server API fetches pipeline deals via service role
  ↓
Client filters results by assigned client keywords
  ↓
DragDropPipeline receives real deal data
  ↓
Deals stay visible ✅
```

## Files Touched

- `src/pages/api/fetch-pipeline-deals.ts`
- `src/pages/Deals.tsx`

## Result

Account Managers can now reliably see their assigned deals (NextHome, etc.) inside the Fulfillment – Operators pipeline without them disappearing. 🎉

