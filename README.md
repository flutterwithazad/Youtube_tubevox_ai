# TubeVox — Local Development Setup

A YouTube comment scraping SaaS built as a pnpm monorepo with React + Vite frontends, an Express API server, and Supabase for auth, database, and edge functions.

---

## What's inside

| Service | Directory | Default Port | Description |
|---|---|---|---|
| API Server | `artifacts/api-server` | `8080` | Express backend — credits, admin, etc. |
| Dashboard | `artifacts/dashboard` | `3000` | User-facing scraping app |
| Admin Panel | `artifacts/admin` | `3001` | Admin management interface |
| Landing Page | `artifacts/tubevox-landing` | `3002` | Marketing page |

---

## Prerequisites

Make sure these are installed on your machine before starting:

- **Node.js** v20 or higher — https://nodejs.org
- **pnpm** v9 or higher — install with `npm install -g pnpm`
- **Supabase CLI** — install with `npm install -g supabase`
- A **Supabase project** — create one free at https://supabase.com

---

## 1. Clone the repository

```bash
git clone <your-repo-url>
cd tubevox
```

---

## 2. Install dependencies

```bash
pnpm install
```

This installs dependencies for all packages in the monorepo at once.

---

## 3. Set up environment variables

Copy the example file and fill it in:

```bash
cp .env.example .env
```

Open `.env` and fill in the values:

```env
# From your Supabase project → Settings → API
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Make this a long random string — used to sign admin JWTs
ADMIN_JWT_SECRET=replace-with-something-long-and-random

# Points the Dashboard and Admin frontends at your local API server
API_SERVER_URL=http://localhost:8080
```

Where to find the Supabase keys:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Settings → API**
4. Copy `URL`, `anon public` key, and `service_role` key

> The `service_role` key has full database access — never expose it to the browser or commit it to git.

---

## 4. Set up the database

Link your local Supabase CLI to your cloud project:

```bash
supabase login
supabase link --project-ref your-project-ref
```

Push the database schema (tables, RLS policies, RPC functions):

```bash
supabase db push
```

> If you don't have the Supabase CLI set up locally, you can also paste the contents of `supabase/migrations/` into the **SQL Editor** in your Supabase dashboard.

---

## 5. Deploy the edge function

The scraping engine runs as a Supabase edge function:

```bash
supabase functions deploy fetch-comments --project-ref your-project-ref
```

To deploy with your access token directly:

```bash
SUPABASE_ACCESS_TOKEN=your-access-token supabase functions deploy fetch-comments --project-ref your-project-ref --no-verify-jwt
```

Your access token is at: https://supabase.com/dashboard/account/tokens

---

## 6. Run everything locally

Each service needs to run in its own terminal. Open four terminal windows:

**Terminal 1 — API Server:**
```bash
PORT=8080 pnpm --filter @workspace/api-server run dev
```

**Terminal 2 — Dashboard:**
```bash
PORT=3000 BASE_PATH=/dashboard/ pnpm --filter @workspace/dashboard run dev
```

**Terminal 3 — Admin Panel:**
```bash
PORT=3001 BASE_PATH=/admin/ pnpm --filter @workspace/admin run dev
```

**Terminal 4 — Landing Page (optional):**
```bash
PORT=3002 pnpm --filter @workspace/tubevox-landing run dev
```

Then open in your browser:

| URL | What you see |
|---|---|
| http://localhost:3000/dashboard/ | User dashboard |
| http://localhost:3001/admin/ | Admin panel |
| http://localhost:3002 | Landing page |

---

## 7. Create your first admin account

1. Sign up via the dashboard at http://localhost:3000/dashboard/
2. Open your Supabase SQL Editor and run:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your@email.com';
```

3. Log in to the admin panel at http://localhost:3001/admin/ using the credentials:
   - Email: `admin@yourdomain.com`
   - Password: `Admin@123456`

   (Change these in the admin panel after first login.)

---

## 8. Add a YouTube API key

The scraper needs at least one YouTube Data API v3 key:

1. Go to https://console.cloud.google.com
2. Create a project → Enable **YouTube Data API v3**
3. Create an API key under **Credentials**
4. In the admin panel, go to **API Keys** and add the key

Each key has a daily quota of 10,000 units. The system rotates through keys automatically when one runs out.

---

## Troubleshooting

**`pnpm install` fails**
Make sure you are using pnpm, not npm or yarn. The `preinstall` script will reject other package managers.

**Dashboard shows blank page**
Make sure the API server is running on port 8080. The Vite dev server proxies `/api/*` requests there.

**"Unauthorized" error from the edge function**
Double-check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your `.env` match the values from your Supabase project settings.

**"insufficient_credits" on first scrape**
New accounts start with 0 credits. Log in to the admin panel, go to a user's profile, and grant credits manually.

**Edge function not found**
Run the deploy command from Step 5. Edge functions must be deployed separately — they are not part of `pnpm install`.

---

## Project structure

```
tubevox/
├── artifacts/
│   ├── api-server/          # Express API — credits, admin auth, YouTube key management
│   ├── dashboard/           # React + Vite — user-facing scraping UI
│   ├── admin/               # React + Vite — admin panel
│   └── tubevox-landing/   # React + Vite — marketing landing page
├── supabase/
│   ├── functions/
│   │   └── fetch-comments/  # Deno edge function — YouTube scraping engine
│   └── migrations/          # SQL schema files
├── lib/                     # Shared TypeScript utilities
├── .env.example             # Environment variable template
└── pnpm-workspace.yaml      # Monorepo workspace config
```

---

## Tech stack

- **Frontend:** React 18, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Express.js, TypeScript, tsx
- **Database & Auth:** Supabase (PostgreSQL + Auth + Edge Functions)
- **Scraping engine:** Deno (Supabase Edge Function) + YouTube Data API v3
- **Package manager:** pnpm workspaces
