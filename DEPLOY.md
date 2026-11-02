# Putting the pool online

About 30–45 minutes, once. Everything here is free except the optional domain name.

| Piece | Service | What it does |
|---|---|---|
| Code | GitHub | Stores the app's code. Vercel deploys from it. |
| Website | Vercel | Runs the site at an address like `josh-orr-pool.vercel.app`. |
| Database | Supabase | Stores players, picks, games and payments. |
| Email | Resend | Sends the one-click sign-in links. |

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

## 3. Resend (sign-in emails)

1. Sign up at https://resend.com and create an API key (**API Keys → Create**). This is `RESEND_API_KEY`.
2. To email anyone other than yourself, Resend needs a domain you own (see the domain note below).
   Under **Domains → Add domain**, follow the steps to add the DNS records it shows.
   Then `EMAIL_FROM` is something like `Josh Orr's Pool <pool@yourdomain.com>`.

## 4. Vercel (website)

1. Sign up at https://vercel.com with **Continue with GitHub**.
2. **Add New → Project**, pick `march-madness-pool`, and click **Import**.
3. Before deploying, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | from step 2 |
   | `SESSION_SECRET` | any long random text (Claude can make one) |
   | `CRON_SECRET` | another long random text |
   | `ADMIN_EMAILS` | `joshrorr@hotmail.com` |
   | `RESEND_API_KEY` | from step 3 |
   | `EMAIL_FROM` | from step 3 |
   | `APP_URL` | leave for now |

4. Click **Deploy**. When it finishes, copy the site address, set `APP_URL` to it
   (Settings → Environment Variables), then **Deployments → ⋯ → Redeploy**.

## 5. Check it

1. Open the site and sign in with joshrorr@hotmail.com. The email link should arrive within a minute.
2. You should see the **Admin** button. History works right away; the current season gets created after
   Selection Sunday (Admin → Start a new season).

## 6. Backup results sync (optional)

The site checks ESPN whenever someone visits and results are 5+ minutes old. To also check every 10 minutes when
nobody is visiting: on GitHub, open the repository → **Settings → Secrets and variables → Actions** and add
`APP_URL` and `CRON_SECRET` (same values as on Vercel).

## Domain note

A domain like `joshorrpool.com` costs about $10–15 a year (Cloudflare, Namecheap or Vercel). It gives the site a
nicer address and lets Resend send email from it. Without one, sign-in emails can only go to the address Resend
is registered with.
