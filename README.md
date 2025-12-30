# FUPM — Invoice Follow-up Bot

A minimal web app that automates invoice payment follow-ups via Gmail.

## How it works

1. Sign in with Google (grants Gmail access)
2. Label any invoice thread in Gmail with "FUPM"
3. Click "Sync Gmail" in the dashboard
4. AI extracts context (recipient, amount, etc.) from the thread
5. Follow-ups are sent on your schedule until you mark it closed

## Setup

### 1. Clone and install

```bash
npm install
```

### 2. Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable the Gmail API:
   - APIs & Services → Library → Search "Gmail API" → Enable
4. Configure OAuth consent screen:
   - APIs & Services → OAuth consent screen
   - User Type: External
   - Fill in app name, support email
   - Add scopes: `gmail.modify`, `gmail.send`, `openid`, `email`, `profile`
5. Create OAuth credentials:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - (For production, add your production URL too)
6. Copy Client ID and Client Secret

### 3. Get Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Create an API key

### 4. Configure environment

```bash
cp .env.example .env.local
```

Fill in:
- `DATABASE_URL` — from Railway Postgres
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000` for local dev
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` — from step 2
- `ANTHROPIC_API_KEY` — from step 3
- `CRON_SECRET` — any random string for cron security

### 5. Set up database

Run the schema against your Railway Postgres:

```bash
npm run db:push
```

Or manually run `schema.sql`.

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Railway

1. Push to GitHub
2. Create new Railway project from repo
3. Add Postgres plugin
4. Set environment variables (same as `.env.local`)
5. Add cron job:
   - Create new Railway service
   - Set to run `curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.railway.app/api/cron`
   - Schedule: daily (e.g., `0 9 * * *` for 9am UTC)

## Tech Stack

- Next.js 14 (App Router)
- Tailwind CSS + shadcn/ui
- NextAuth.js (Google OAuth)
- Drizzle ORM + Postgres
- Google Gmail API
- Anthropic Claude API

## Tone Options

- **Professional** — Polite and business-like
- **Friendly** — Warm and personable
- **Firm** — Direct and assertive
- **Aggressive** — Very direct, emphasizes urgency
