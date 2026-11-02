# Putting the pool online

About 30 minutes, once. Everything here is free.

| Piece | Service | What it does |
|---|---|---|
| Code | GitHub | Stores the app's code. Vercel deploys from it. |
| Website | Vercel | Runs the site at an address like `josh-orr-pool.vercel.app`. |
| Database | Supabase | Stores players, picks, games and payments. |

The app sends no email. You send the invite from your own Hotmail with the link from the Admin page.

## 1. GitHub

1. Sign up at https://github.com (or sign in).
2. Click **+ → New repository**. Name it `march-madness-pool`, choose **Private**, and don't add a README.
3. Copy the repository address (`https://github.com/<you>/march-madness-pool.git`) and send it to Claude.
   Claude pushes the code. The first push opens a GitHub sign-in window on this PC; approve it.

## 2. Supabase (database)

1. Sign up at https://supabase.com and click **New project**.
2. Name: `march-madness-pool`. Pick a strong database password and save it somewhere safe.
   Region: **East US (Ohio)** or the closest US region.
3. When it's ready, click **Connect** at the top. Under **Transaction pooler**, copy the URI. It looks like
   `postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-us-east-2.pooler.supabase.com:6543/postgres`.
   Replace `[YOUR-PASSWORD]` with your password. This is your `DATABASE_URL`. Keep it private.

## 3. Vercel (website)

1. Sign up at https://vercel.com with **Continue with GitHub**.
2. **Add New → Project**, pick `march-madness-pool`, and click **Import**.
3. Before deploying, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | from step 2 |
   | `ADMIN_EMAILS` | `joshrorr@hotmail.com` |
   | `ADMIN_PASSWORD` | a password only you know, for the admin screens |
   | `SESSION_SECRET` | any long random text (Claude can make one) |
   | `CRON_SECRET` | another long random text |
   | `APP_URL` | leave for now |

4. Click **Deploy**. When it finishes, copy the site address, set `APP_URL` to it
   (Settings → Environment Variables), then **Deployments → ⋯ → Redeploy**.

## 4. First sign-in (you)

1. Open the site, click **Sign in**, then **Organizer sign-in** at the bottom.
2. Enter joshrorr@hotmail.com, your full name, then your admin password.
3. **Admin** now shows the invite link with a **Copy** button. That's the link for your invite email.

## 5. Backup results sync (optional)

The site checks ESPN whenever someone visits and results are 5+ minutes old. To also check every 10 minutes when
nobody is visiting: on GitHub, open the repository → **Settings → Secrets and variables → Actions** and add
`APP_URL` and `CRON_SECRET` (same values as on Vercel).
