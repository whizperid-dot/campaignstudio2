# Developer Setup Guide

This guide gets you from a fresh clone of the repository to a fully running local development environment in under 15 minutes.

---

## Prerequisites

- Node.js 18 or 20 installed ([download here](https://nodejs.org))
- A free [Supabase](https://supabase.com) account (database hosting)

---

## Step 1 — Clone the Repository

```bash
git clone <your-repo-url>
cd <repo-folder>
```

---

## Step 2 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **New project**.
3. Fill in a project name (e.g. `campaign-decisioning-studio`), choose a region close to you, and set a database password. Save the password somewhere safe.
4. Wait about 1–2 minutes for the project to finish provisioning.

---

## Step 3 — Run the Database Setup SQL

1. In your Supabase project, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open the file `database_setup.sql` from the root of this repository.
4. Copy the entire contents and paste it into the SQL editor.
5. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).

You should see a success message. This creates all 7 tables, sets up security policies, indexes, and seeds demo data (1 issuer, 5 VIF subscriptions, 2 sample campaigns).

> The script is safe to run multiple times. All inserts use `ON CONFLICT DO NOTHING`.

---

## Step 4 — Get Your Supabase Credentials

1. In the Supabase dashboard, click **Project Settings** (gear icon in the left sidebar).
2. Click **API** under the Configuration section.
3. Copy two values:
   - **Project URL** — looks like `https://xxxxxxxxxxx.supabase.co`
   - **anon public** key — a long JWT string under "Project API keys"

---

## Step 5 — Create the `.env` File

In the root of the repository, create a file named `.env` with the following content:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
```

Replace the placeholder values with the credentials you copied in Step 4.

> The `.env` file is intentionally excluded from version control (listed in `.gitignore`). Every developer creates their own.

---

## Step 6 — Install Dependencies

```bash
npm install
```

---

## Step 7 — Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Demo Login Credentials

Use these credentials to log in to the application:

| Field    | Value                       |
|----------|-----------------------------|
| Email    | hardi@nusantarabank.co.id   |
| Password | visanusantara               |

---

## What Is Seeded

The `database_setup.sql` file seeds the following demo data:

| Data                  | Details                                                    |
|-----------------------|------------------------------------------------------------|
| Issuer                | Nusantara Bank (Tier 2, Indonesia)                         |
| VIF Subscriptions     | 5 packages — VIF XB (active), 4 others (inactive)         |
| Campaign 1            | "Test" — status: completed, 23,705 audience, IDR 6.1B budget |
| Campaign 2            | "Travel Campaign" — status: simulated, 18,544 audience, IDR 960M budget |

---

## Project Structure (Quick Reference)

```
app/                    Next.js pages (App Router)
  dashboard/            Main dashboard
  campaigns/            Campaign list, create, edit, view
  vif-subscriptions/    VIF package management
  login/                Login page
components/
  campaign/             Campaign wizard steps and simulation dashboard
  dashboard/            Dashboard widgets
  layout/               App shell and sidebar
  ui/                   Shared UI components (shadcn/ui)
lib/
  supabase.ts           Supabase client singleton
  auth.ts               Authentication helpers
  simulation.ts         Campaign simulation logic
database_setup.sql      Complete database schema + seed data (run this once)
```

---

## Troubleshooting

**Login fails immediately**
- Make sure you ran `database_setup.sql` in Step 3. If the issuers table is empty the login will always fail.

**"Invalid API key" or network errors**
- Double-check your `.env` file. The variable names must be exactly `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Make sure there are no extra spaces or quotes around the values.

**Tables not found errors**
- Re-run `database_setup.sql` in the Supabase SQL Editor. Check the output for any error messages.

**Port 3000 already in use**
- Stop any other running Next.js processes, or run `npm run dev -- -p 3001` to use a different port.
