# MedNeed: Execution Plan

Online pharmacy: medicine ordering and home delivery, with a customer storefront and an admin panel.
Doctor appointments are out of scope for now.

**Stack:** Next.js (App Router, TypeScript, Tailwind) · PostgreSQL + Prisma · Redis · S3 · Razorpay
**Approach:** One Next.js app to start (storefront at `/`, admin at `/admin`). Split into a monorepo / separate API only when needed.

Each phase ends with something runnable. Status: `[ ]` todo, `[~]` in progress, `[x]` done.

---

## Phase 0: Foundation
- [x] Next.js + TypeScript + Tailwind project, `npm run dev` works
- [ ] ESLint / Prettier, `.env.example`, folder conventions
- [ ] Docker Compose for Postgres + Redis, Prisma setup
- [ ] CI (lint, typecheck, build)

**Done when:** `npm run dev` starts the app and CI is green.

## Phase 1: Storefront UI (mock data)
- [x] Design tokens, header (search, pincode, cart), footer
- [x] Landing page: hero, upload prescription, categories, deals, trust badges, how it works, FAQ
- [x] Sign-in page (phone OTP flow UI)
- [x] Medicine catalog: search, filters (category, brand, price, Rx), sort, pagination
- [x] Product detail page: price, composition, substitutes, info tabs
- [x] Cart page

**Done when:** A visitor can browse, search, open a product, and add to cart (mock data).

## Phase 2: Auth and users
- [x] Phone OTP login (SMS provider), sessions / JWT, refresh
- [x] Roles: customer, admin, pharmacist, inventory manager (RBAC)
- [x] Profile and saved addresses
- [x] Admin login with stricter policy (2FA)
- [x] Email + password sign up / sign in (scrypt hashes, timing-equalised, rate limited)
- [x] Sign in with Google (authorization code + PKCE + nonce, id_token verified)
- [x] Admin user management: add staff, change roles, disable, reset 2FA, sign out everywhere

Notes
- Access JWT (15 min) + rotating opaque refresh token (30 days) with reuse detection. Staff checks re-read the DB, so role or status changes apply immediately.
- Staff need a verified TOTP code (or recovery code) every sign-in; 2FA enrolment is forced on first admin sign-in.
- Dev SMS driver prints the OTP on screen and in the terminal. Real SMS needs Twilio credentials (and DLT registration for India).
- Follow-ups before launch: email verification, password reset by email, email change with verification, real SMS provider and DLT templates, CAPTCHA on OTP send, Google sign-in tested with real credentials.

## Phase 3: Catalog backend and admin product management
- [x] DB schema: medicines, salts, manufacturers, categories, Rx schedule
- [x] Admin CRUD, image upload (local disk in dev, S3 in production), bulk CSV import
- [x] Storefront reads from DB; SEO (SSR, metadata, sitemap)
- [x] Search with typo tolerance; substitutes by salt

Notes
- Medicines are verified, then published. Prescription schedule is explicit; Schedule X and "never sold online" items cannot be published.
- Imported data (free dataset, 30,000 rows) is staged as "catalog only": visible with details, no price or cart, customers send a request (Admin, Catalog, Requests). Items are auto-sorted into sections by active ingredient.
- Free-dataset data is unverified test data. Before launch: replace it with the wholesaler item master or a licensed database through Import CSV, and set real prices and schedules.
- Follow-ups: test S3 upload with a real bucket, product photos, DPCO/NPPA price-ceiling warnings, four-eyes verification, salt-spelling normalisation for substitutes.

## Phase 4: Inventory
- [x] Stock per batch with expiry, FEFO allocation (src/server/inventory/stock.ts: allocateFefo, returnSale)
- [x] Admin stock in/out (purchase bills, adjustments), low-stock and near-expiry alerts, audit log, append-only ledger
- Notes: stock entered from wholesaler bills; price = batch MRP less per-product discount; sellable = not expired and >= INVENTORY_MIN_SHELF_DAYS (30) left. Phase 5 checkout must call allocateFefo/returnSale inside the order transaction.
- Follow-ups: supplier returns UI, purchase bill edit/void, barcode scan, CSV stock import, multi-location.

## Phase 5: Cart and checkout
- [x] Server-side cart, price and stock validation, coupons
- [x] Pincode serviceability, delivery slots, fees
- [x] Stock reservation with timeout
- Notes: server prices every basket (quote.ts); orders placed in one transaction with FEFO stock; delivery min order, fee bands, extra per km beyond 10 km, max 15 km; set shop location in Admin > Shop settings; schedule POST /api/internal/expire-orders with CRON_SECRET once online payment (Phase 7) is on.
- Follow-ups: prescription upload (Phase 6), online payment (Phase 7), road-distance routing, order emails/SMS.

## Phase 6: Payments and orders
- [x] Razorpay integration, webhooks, idempotency, COD
- [x] Order state machine, history, cancellation, refunds
- [x] GST invoice PDF
- [x] Admin order management

## Phase 7: Prescription workflow
- [x] Upload (private storage, encrypted at rest, files served only to the owner or verified staff; S3 optional)
- [x] Pharmacist verification queue (approve / reject / clarify)
- [x] Server-side gating of Rx-only items; audit trail
- [x] Reuse an approved prescription on later orders
- [x] Quantity limits per prescription (most units per medicine, valid for N days)
- Notes: set PRESCRIPTION_ENC_KEY before production (see README). The S3 storage path is untested against a real bucket. Customer notifications on approve/reject come in Phase 8.

## Phase 8: Fulfilment and notifications
- [x] Packing (batch-scan) and dispatch screens, delivery-partner app, delivery tracking with OTP handover
- [x] SMS / WhatsApp / email on each order state change (transactional outbox + worker, retries, admin log)
- Notes: delivery staff are a role (sign in by OTP, see only /delivery). Messages never name medicines. Channels are toggled in Shop settings and each needs a provider configured (see README/.env.example). Schedule POST /api/internal/expire-orders every few minutes (it also sends the queue and retries refunds).

## Phase 9: Admin analytics and operations
- [ ] Dashboard, reports, CSV export
- [ ] Support tools: order lookup, manual refund, notes

## Phase 10: Production hardening
- [ ] Infrastructure as code, staging + production, backups
- [ ] WAF, rate limiting, secrets, dependency scanning, penetration test
- [ ] Observability (Sentry, logs, metrics, alerts), load tests, E2E tests
- [ ] Privacy and compliance: consent, retention, licensing review

## Phase 11: Soft launch
- [ ] Launch in one pin-code zone, monitor, iterate

---

## Compliance notes (get legal review early)
- Pharmacy licence and registered pharmacist verification are required for dispensing.
- Prescription-only (Schedule H / H1 / X) items must be gated on the server.
- Health data is sensitive personal data (DPDP Act): consent, encryption, retention, deletion.
