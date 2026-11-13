# Deploying MedNeed

This guide gets a **password-protected staging site** online for the client to review. The same image and steps
are used for production later; the differences are listed at the end.

## What you get

| Piece | File |
|---|---|
| Production Docker image (Node 22, non-root, health check) | `Dockerfile`, `.dockerignore` |
| Postgres + app + scheduled job on one server | `docker-compose.staging.yml` |
| Environment template | `.env.staging.example` |
| Security headers (CSP, HSTS, frame, referrer, permissions) | `next.config.ts` |
| Staging password gate + `noindex` | `src/proxy.ts` (on when `STAGING_BASIC_AUTH` is set) |
| Health check | `GET /api/health` → `{"ok":true}` when the app and database are up |
| CI: type-check, build, audit, Docker build + smoke test on real Postgres | `.github/workflows/ci.yml` |

## Option A (recommended): one Linux server with Docker

A small VPS in an Indian region (Mumbai/Bangalore) with 2 vCPU / 4 GB RAM is enough for staging.

### 1. Prepare the server

```bash
# Ubuntu 24.04
curl -fsSL https://get.docker.com | sh
sudo apt-get install -y caddy git
```

Point a DNS record (for example `staging.your-domain.in`) at the server's IP.

### 2. Get the code and fill in the environment

```bash
git clone <your-repo-url> medneed && cd medneed
cp .env.staging.example .env.staging
nano .env.staging
```

Fill in every empty value. Generate secrets on the server:

```bash
openssl rand -base64 48   # AUTH_SECRET, CRON_SECRET, POSTGRES_PASSWORD
openssl rand -hex 32      # PRESCRIPTION_ENC_KEY  (save a copy in your password manager; losing it = unreadable prescriptions)
```

Set `STAGING_BASIC_AUTH=client:<a long password>`. That is the username/password you give the client.

### 3. Start it

```bash
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build
docker compose -f docker-compose.staging.yml logs -f app     # watch migrations run, then Ctrl+C
curl http://127.0.0.1:3000/api/health                        # {"ok":true}
```

The first start creates all tables, the admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`, and (with `MEDNEED_DEMO_DATA=1`)
32 clearly fictional sample medicines. The `cron` container calls the order-expiry/retry job every 3 minutes.

### 4. HTTPS with Caddy

`/etc/caddy/Caddyfile`:

```
staging.your-domain.in {
    reverse_proxy 127.0.0.1:3000
}
```

```bash
sudo systemctl reload caddy
```

Caddy gets and renews the certificate automatically. Keep `TRUSTED_PROXY_HOPS=1` (Caddy is one proxy).
If you add Cloudflare in front of Caddy, set it to `2`.

### 5. Hand it to the client

Send them the URL plus the staging username/password. Tell them:
- it is a test site: use made-up names, addresses and prescriptions only;
- payments are Razorpay **test mode** (test card `4111 1111 1111 1111`, any future expiry, any CVV);
- the medicines are fictional sample data.

Give the client an admin login only if they need to see the admin panel: in Admin → Users create a staff account
for them (2FA is set up on first sign-in) rather than sharing yours.

### Updating

```bash
git pull
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build
```

Migrations run automatically on start.

### Backups (do this even on staging)

```bash
# daily database dump, keep 14 days  (crontab -e)
0 2 * * * cd ~/medneed && docker compose -f docker-compose.staging.yml exec -T db pg_dump -U medneed medneed | gzip > ~/backups/medneed-$(date +\%F).sql.gz && find ~/backups -name 'medneed-*.sql.gz' -mtime +14 -delete
```

Prescription and image files live in the `appdata` volume (`/data` in the container); back that up too, or move
them to S3 (below). Test a restore once before launch.

## Option B: a managed platform (Render, Railway, Fly.io, …)

1. Create a managed **Postgres 16** database; copy its connection string into `DATABASE_URL`
   (add `?sslmode=require` if the provider needs it).
2. Create a web service from this repo using the **Dockerfile**. Port `3000`. Health check path `/api/health`.
3. Add a **persistent disk** mounted at `/data` (product images and prescriptions), or configure S3 for both.
4. Set the environment variables from `.env.staging.example` (not `POSTGRES_PASSWORD`; use `DATABASE_URL`).
   Set `TRUSTED_PROXY_HOPS` to the number of proxies the platform puts in front (usually `1`; check its docs
   for how it sets `X-Forwarded-For`).
5. Add a **cron job** on the platform (every 3 minutes):
   `curl -fsS -X POST https://YOUR-SITE/api/internal/expire-orders -H "x-cron-secret: $CRON_SECRET"`

Serverless hosts (Vercel, Netlify) are **not** a fit: the app needs a persistent server for prescription files,
the scheduled job, and long-running database connections.

## Environment variables added for deployment

| Variable | Purpose |
|---|---|
| `STAGING_BASIC_AUTH` | `user:password`. Gates the whole site and sends `noindex`. Leave **unset** on the live site. Razorpay webhooks, `/api/internal/*` and `/api/health` stay reachable. |
| `MEDNEED_DEMO_DATA` | `1` loads the fictional sample medicines in production mode (only into an empty catalogue). **Never** on the live site. |
| `TRUSTED_PROXY_HOPS` | How many proxies append to `X-Forwarded-For` (default `1`). Used for rate limits; stops clients spoofing their IP. `0` = no proxy. |

Everything else is documented in `.env.example`.

## Razorpay on staging

Use **test** keys from the client's Razorpay account (Dashboard → Test mode → API keys). Add a webhook
pointing to `https://staging.your-domain.in/api/payments/razorpay/webhook` with the events listed in the
README and put its secret in `RAZORPAY_WEBHOOK_SECRET`. The staging password does not block the webhook.

## Sign-in on staging

In production mode the OTP code is **not** shown on screen. Either configure Twilio (`SMS_DRIVER=twilio`, India
needs DLT-registered templates) or let the client use **email + password** sign-up, which works with no provider.
Email/WhatsApp notifications are optional; orders work without them. **Password reset and email confirmation
need email** (`EMAIL_DRIVER=resend` or `brevo` with `EMAIL_FROM` and the API key; both have free tiers). Without it,
"Forgot password" tells the customer to call the store.

## Before launch: business details, bot check, alerts

- **Admin → Shop settings → Business and legal details:** support email, pharmacist name and registration number,
  Grievance Officer. Fill the invoice section's GSTIN and drug licence too. These appear in the footer and on the
  Contact, Privacy, Terms, Refund and Shipping pages (blank values show as highlighted "to be added").
- **Policy pages:** send `/privacy`, `/terms`, `/refunds`, `/shipping` to the client's lawyer. Edit the text in
  `src/app/(shop)/<page>/page.tsx`, then tick "A lawyer has reviewed the policy pages" in Shop settings to remove
  the "being finalised" notice. Razorpay checks these pages during live-mode KYC.
- **Bot check on OTP sign-in:** create a free Cloudflare Turnstile widget for your domain and set
  `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`. Stops bots running up your SMS bill.
- **Error alerts:** set `ALERT_WEBHOOK_URL` to a Slack or Discord incoming webhook. Every server error is also
  logged as a JSON line containing `"medneed_error"`.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request:
1. `npm ci`, type-check, production build, `npm audit` (high/critical in production packages fails the build);
2. builds the Docker image, starts it against a real Postgres 16, waits for `/api/health`, checks the main pages
   return 200 and the security headers are present.

Push the project to a GitHub repository and it runs automatically (Actions tab). Make it a required check on `main`.

## Moving from staging to the live site

Do **not** go live until the items in the README's production checklist are done (legal pages, real catalogue
and stock, licence details, live Razorpay KYC, SMS/DLT, backups tested, monitoring). Then, for production:

- remove `STAGING_BASIC_AUTH` and `MEDNEED_DEMO_DATA`;
- new, separate secrets and a separate database (never reuse staging's);
- live Razorpay keys + a live webhook;
- S3 (private bucket for prescriptions) or a backed-up persistent disk;
- error monitoring and uptime alerts on `/api/health`.
