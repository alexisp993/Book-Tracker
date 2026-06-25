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

## One required code change: SQLite → Postgres
Local development uses SQLite (a file). Vercel's servers can't keep a file, so production uses
Postgres. The schema was written to be Postgres-compatible, so this is a **one-line change**.

In `prisma/schema.prisma`, change:
```prisma
datasource db {
  provider = "sqlite"        // ← change this
  url      = env("DATABASE_URL")
}
```
to:
```prisma
datasource db {
  provider = "postgresql"    // ← to this
  url      = env("DATABASE_URL")
}
```
> Ask Claude to do this for you when you're ready — and to point your **local** `.env`
> `DATABASE_URL` at the same Postgres database so local and cloud match. (Your current local
> SQLite books won't copy over automatically — you can re-scan them, or ask for the CSV
> import feature.)

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
   | `APP_PASSWORD` | a strong password you'll type to log in |
   | `AUTH_SECRET` | a long random string (generate with `openssl rand -base64 32`) |
   | `DATABASE_URL` | your Postgres connection string (skip if you used Vercel Postgres Option A, which sets it for you) |
4. Click **Deploy**.

## Step 4 — Create the database tables
The database is empty until you create the tables from the schema. With your **production**
`DATABASE_URL` set locally in `.env` (temporarily), run:
```bash
npx prisma db push
```
This creates all tables in the Postgres database. (Re-run it whenever the schema changes.)
> No `prisma db seed` needed in production — your library starts empty and fills as you add books.

## Step 5 — Use it on your phone
1. Open your Vercel URL (e.g. `https://book-tracker-you.vercel.app`) on your phone.
2. Log in with `APP_PASSWORD`.
3. **Add to Home Screen** for an app-like icon:
   - **iPhone (Safari):** Share → *Add to Home Screen*.
   - **Android (Chrome):** menu (⋮) → *Install app* / *Add to Home Screen*.
4. Because the site is HTTPS, the **camera barcode scanner works** on your phone. 📷

---

## Updating the app later
Push changes to GitHub and Vercel redeploys automatically. If you changed the database schema,
run `npx prisma db push` against the production database again.

## Notes & limits
- **Security:** access is gated by the single `APP_PASSWORD`. Keep it private. To rotate, change
  `APP_PASSWORD` (and optionally `AUTH_SECRET`, which logs everyone out) in Vercel and redeploy.
- **Free-tier limits:** generous for one person. If you ever exceed them, Vercel/your DB will
  notify you before any charges — nothing auto-bills.
- **Multi-user / real accounts** (NextAuth + Google) is a future phase; today it's single-user
  behind one password, which is right for a personal library.
