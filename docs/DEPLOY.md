# Deploying Book Tracker (use it on your phone)

This guide hosts the app on **Vercel** (free) with a **free hosted Postgres** database, so you
can open it on your phone anywhere — even with your computer off — and "Add to Home Screen" to
use it like an app. The app is protected by a password you set.

> **Time:** ~30–45 minutes, mostly creating free accounts and clicking. No coding required —
> the few commands are copy-paste.
>
> **Cost:** Free for personal use. Vercel's Hobby plan and the database free tier comfortably
> cover a personal library. You will not be charged unless you deliberately upgrade.

---

## What you'll need (all free)
1. A **GitHub** account — https://github.com (stores the code).
2. A **Vercel** account — https://vercel.com (sign in with GitHub; runs the app).
3. A **Postgres database** — easiest is **Vercel Postgres** (created inside Vercel). Neon
   (https://neon.tech) or Supabase (https://supabase.com) also work.

---

## Database: Postgres (already configured)
The code is set to **PostgreSQL** (`prisma/schema.prisma`), using a pooled `DATABASE_URL` at
runtime and a direct `DATABASE_URL_UNPOOLED` for creating tables. The build runs
`prisma db push` automatically, so your tables are created/updated on every deploy — no manual
database step needed.

> Your earlier local SQLite books won't copy to the cloud database (it starts fresh) — re-scan
> them on your phone, or ask for the CSV import feature.

---

## Step 1 — Put the code on GitHub
From the project folder:
```bash
git init
git add .
git commit -m "Book Tracker"
```
Then create a new repo on GitHub and follow its "push an existing repository" commands, e.g.:
```bash
git branch -M main
git remote add origin https://github.com/<you>/book-tracker.git
git push -u origin main
```
> `.gitignore` already excludes `.env` and the local database, so your password/secrets are
> not uploaded.

## Step 2 — Create the database
**Option A (simplest, in Vercel):** do Step 3 first, then in your Vercel project open the
**Storage** tab → **Create Database** → **Postgres**. Vercel sets `DATABASE_URL` automatically.

**Option B (Neon/Supabase):** create a free Postgres database, copy its **connection string**
(looks like `postgresql://user:pass@host/db?sslmode=require`). You'll paste it as
`DATABASE_URL` in Step 3.

## Step 3 — Import the project into Vercel
1. Go to https://vercel.com/new and import your GitHub repo.
2. Framework is auto-detected as **Next.js**. Leave build settings default.
3. Before deploying, add **Environment Variables** (Settings → Environment Variables):
   | Name | Value |
   |------|-------|
   | `APP_PASSWORD` | the OLD shared password — only needed once, for the one-time `/migrate` step below. Safe to leave set indefinitely (the migrate route becomes a no-op afterward), or remove it once you've migrated. |
   | `AUTH_SECRET` | a long random string (generate with `openssl rand -base64 32`) — signs every user's session cookie |
   | `ADMIN_EMAILS` | your real email (comma-separated if more than one) — whoever logs in/registers/migrates with a matching email becomes an admin |
   | `MAX_BETA_USERS` | `30` (or your preferred cap) — optional, defaults to 30 |
   | `BLOB_READ_WRITE_TOKEN` | optional — only needed for feedback screenshot uploads; see Step 5b |
   | `DATABASE_URL` | your Postgres connection string (skip if you used Vercel Postgres Option A, which sets it for you) |
4. Click **Deploy**.

## Step 4 — Tables are created automatically
No action needed — the deploy's build step runs `prisma db push`, which creates all tables in
your Neon database the first time (and keeps them in sync on later deploys).

## Step 5 — One-time account setup
The app now uses **real per-user accounts**, not a single shared password. Your existing
library (created under the old shared-password model) is owned by one bootstrapped account
that needs to be upgraded once:
1. Open your Vercel URL → `/migrate`.
2. Enter the **old shared password** (`APP_PASSWORD`), your real name, your real email
   (matching `ADMIN_EMAILS` above so you become admin), and a new personal password.
3. From then on, log in normally with that email + password at `/login`. `APP_PASSWORD` is no
   longer used for day-to-day access — it only matters if you ever need to re-run `/migrate`.

Other beta testers register their own accounts at `/register` (capped at `MAX_BETA_USERS`).

## Step 5b — (Optional) Screenshot uploads for feedback
Feedback works fine without this — screenshots are just skipped with a friendly message until
configured. To enable them: in your Vercel project, open **Storage → Create Database → Blob**,
accept the defaults. This automatically adds `BLOB_READ_WRITE_TOKEN` to your project — redeploy
and screenshot uploads start working.

## Step 6 — Use it on your phone
1. Open your Vercel URL (e.g. `https://book-tracker-you.vercel.app`) on your phone.
2. Log in with your personal email + password (after Step 5).
3. **Add to Home Screen** for an app-like icon:
   - **iPhone (Safari):** Share → *Add to Home Screen*.
   - **Android (Chrome):** menu (⋮) → *Install app* / *Add to Home Screen*.
4. Because the site is HTTPS, the **camera barcode scanner works** on your phone. 📷

---

## Updating the app later
Push changes to GitHub and Vercel redeploys automatically. If you changed the database schema,
run `npx prisma db push` against the production database again.

## Notes & limits
- **Security:** each tester has their own bcrypt-hashed password; admin access is controlled by
  the `ADMIN_EMAILS` env var, re-checked on every login. Registration is hard-capped at
  `MAX_BETA_USERS`, enforced server-side (not just hidden UI).
- **Free-tier limits:** generous for ~30 people. If you ever exceed them, Vercel/your DB will
  notify you before any charges — nothing auto-bills. Vercel Blob (screenshots) also has a free
  tier appropriate for occasional feedback uploads.
- **Multi-user / real accounts** (NextAuth + Google) is a future phase; today it's single-user
  behind one password, which is right for a personal library.
