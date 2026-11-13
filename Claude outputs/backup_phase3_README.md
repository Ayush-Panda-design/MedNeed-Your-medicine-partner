# MedNeed

Online pharmacy platform. See [PLAN.md](./PLAN.md) for the phased roadmap.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. No database setup is needed in development: a local Postgres (PGlite) is created in `~/.medneed/pglite`.

### Sign in during development
- **Customers:** mobile OTP (the code is shown on screen and printed in the terminal), or email + password.
- **Admin panel:** http://localhost:3000/admin/login with `admin@medneed.local` / `Admin@12345`. You will be asked to set up an authenticator app (Google Authenticator, Authy, 1Password) and save recovery codes.
- **Google sign-in:** create an OAuth client in Google Cloud Console, add the redirect URI `http://localhost:3000/api/auth/google/callback`, then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`. The button appears automatically once both are set.

Copy `.env.example` to `.env.local` to configure anything.

## Catalog (Phase 3)

Medicines live in the database and reach the store only when **verified and published** (Admin → Catalog).

- **Data policy.** Do not scrape other pharmacies' listings. Load real data from a licensed provider or your own records via **Import CSV** (template and rules on the import page). Imported rows always arrive as unverified drafts.
- **Sample data.** In development an empty catalog is filled with clearly labelled *fictional* products (`data_status = sample`). They are never loaded in production.
- **Prescription rules.** Every product needs an explicit schedule (OTC, G, H, H1, X). Schedule X and "never sold online" items cannot be published.
- **Substitutes** = same salts, same strengths, same form. Keep salt spelling consistent.
- **Roles.** Admin and pharmacist manage everything; inventory managers can change price and stock of live products only.
- **Images.** JPEG/PNG/WebP up to 2 MB; local disk in dev, S3 in production (see `.env.example`). The S3 path needs testing against your bucket before launch.

### Staging a large dataset (development only)

To test the catalog at realistic size (30,000 medicines) without publishing anything:

1. Download `indian_medicine_data.csv` from the public GitHub repository *junioralive/Indian-Medicine-Dataset* (folder `DATA`). Its origin is not documented, so treat it as test data only.
2. Set `MEDNEED_DATASET` to the CSV's full path (and optionally `MEDNEED_DATASET_LIMIT`, default 30000) in `.env.local`, then start `npm run dev`. The first start loads it (about 10 to 60 seconds); later starts skip it.

**Catalog-only listings.** Imported items are shown on the store with their name, composition, manufacturer and pack, but with no price and no cart button ("status: Catalog only"). Customers tap **Request this medicine**, leave a name and mobile number, and the store calls back; requests appear in Admin → Catalog → Requests. Items that may be narcotic or psychotropic, and Schedule X items, show "Not available online" and cannot be requested. Catalog-only pages are hidden from search engines and the sitemap, and never reach the cart. To make an item orderable, verify it (which requires choosing its prescription schedule), set the real price, and publish it.

**Sections.** After loading, items are sorted into store sections by active ingredient and dosage form (`src/server/catalog/classify.ts`), the way large catalogues classify by therapeutic class. About 95% of the 30,000 are placed; combinations that fit no section, and anything with an unrecognised ingredient (oncology, anaesthesia, urology, vaccines), stay in "Uncategorised" for a person to place. Five sections were added to the original ten: Infection Care, Asthma & Breathing, Brain & Nerve Care, Eye & Ear Care, Hormones & Steroids. The admin **Sort into sections** button runs the same rules on any new drafts (for example after a CSV import). Items with possible narcotic, psychotropic or tranquilizer ingredients are marked "never sold online" until a pharmacist clears them. The store menu only shows sections that have live products.

Every row is loaded as an **unverified draft** in the hidden "Uncategorised" category, with the prescription schedule **"Rx? unconfirmed"**. The database refuses to verify or publish an item until a pharmacist chooses its schedule. The price in the file is used as both MRP and selling price and must be replaced. Before launch, replace this data with the wholesaler's item master or a licensed database, using Import CSV.

## Production checklist
Set `AUTH_SECRET`, `APP_URL`, `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (the app refuses to start without them), choose an SMS driver (`twilio`), and optionally the Google keys. Run `npm run build` then `npm start`.
