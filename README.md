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

## Inventory (Phase 4)

- **Receive stock** (Admin → Inventory → Receive stock): enter each wholesaler bill with supplier, bill number, and per line the batch, expiry (MM/YY as printed), quantity, free quantity, MRP and purchase rate. A bill is saved atomically; the same bill number from the same supplier cannot be entered twice.
- **Selling price** = MRP of the batch being sold next, less the product's discount (set on the product's stock page). Prices cannot be hand-edited while a medicine is in stock.
- **FEFO**: sales take the earliest-expiry batch first and never batches that are expired or within `INVENTORY_MIN_SHELF_DAYS` of expiry. Checkout (Phase 5) must call `allocateFefo` / `returnSale` from `src/server/inventory/stock.ts` inside the order transaction.
- **Ledger**: every stock change is a row in `stock_movements` (append-only, enforced by a database trigger). `GET /api/admin/inventory/reconcile` (admin) verifies stored quantities against the ledger.
- Medicines still need to be verified and published in the Catalog before customers can order them.

## Cart, checkout and orders (Phase 5)

- **Pricing is server-side.** The browser only sends medicine slugs and quantities. `src/server/orders/quote.ts` prices the basket (batch MRP less discount, coupon, delivery fee, stock) and the same function runs again inside the order transaction. If the real total is higher than what the customer saw, the order is refused with "price changed" and nothing is taken.
- **Placing an order** locks the medicines, takes stock oldest-expiry-first, records which batches were used (for recalls), counts the coupon, and writes the order in one transaction. A retry with the same idempotency key returns the same order. Two buyers for the last unit: one succeeds, one is told it is out of stock.
- **Delivery rules** (Admin → Shop settings): minimum order for delivery, fee bands by bill size, normal delivery area (km), extra ₹ per km beyond it, farthest distance, store pickup, cash on delivery limit, time slots. Defaults: min ₹150; ₹30 under ₹300, ₹15 under ₹500, free from ₹500; ₹5/km after 10 km; nothing beyond 15 km.
- **Set the shop location first** (Admin → Shop settings, "Use my current location" while at the shop). Until then distances are measured from a placeholder and the page shows a warning.
- **Distance** is straight-line (haversine) from the shop to the customer's shared location, cross-checked against the pincode centre (Admin → Delivery pincodes). If they disagree by more than 8 km the larger distance is used. A pincode switched off is never delivered to. Road distance would need a paid maps API.
- **Prescription medicines**: orders with Schedule H/H1 items need a prescription (see "Prescriptions" below) and can be packed but never dispatched until a pharmacist has verified it.
- **Stock holds**: online-payment orders wait in `pending_payment` and hold stock for the configured minutes. Expired holds are released automatically whenever someone orders, and by `POST /api/internal/expire-orders` with header `x-cron-secret: $CRON_SECRET`. Call it every few minutes from a scheduler (the route returns 404 when `CRON_SECRET` is not set). Online payment is Phase 6 (Razorpay).
- **Cancelling** returns stock and the coupon use. Customers can cancel until the order is packed; staff can cancel up to dispatch.

## Prescriptions (Phase 7)

- **Customers** upload photos or PDFs at `/account/prescriptions/new` (header "Upload Rx"), or right inside checkout. JPEG, PNG, WebP or PDF, up to 5 files of 5 MB. The file type is checked from the file's own bytes, never from its name. Everything is under "My prescriptions" (`/account/prescriptions`).
- **Checkout** requires a prescription for any Schedule H/H1 item. The customer ticks the prescriptions to use (up to 5). An already-approved prescription that covers the cart verifies the order at once; a waiting one holds the order until the pharmacist decides. The server re-checks everything when the order is placed.
- **Pharmacist queue** (Admin → Prescriptions, admin and pharmacist roles only): sees the files, enters doctor, registration number, patient and the date on the prescription, and the **most units of each medicine** it may supply. Valid for the configured number of days from that date (Admin → Shop settings, default 180). Choices: Approve, Ask the customer (they reply from their account), Reject (with a reason the customer sees).
- **Quantity limits and reuse**: an approved prescription can be used again for repeat orders until its quantities run out or it expires. Every verified order draws units from it (`prescription_usage`); cancelling or expiring the order gives them back. Two simultaneous orders can never take more than the approved limit. Several prescriptions can be combined on one order.
- **Rejecting** cancels any order that depends only on that prescription, puts the stock and coupon back and refunds online payments automatically.
- **Storage is private.** Files are never in a public folder and have no public URL. They are served only through `/api/prescriptions/<id>/files/<file>` to the owner, or to a pharmacist/admin who has completed two-factor sign-in (every staff view is written to the audit log). Responses are never cached.
  - Development: files go to `~/.medneed/prescriptions` (override with `PRESCRIPTION_DIR`).
  - Production: set `PRESCRIPTION_ENC_KEY` (64 hex characters; generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Every file is encrypted with AES-256-GCM before it is stored; keep the key safe, a lost key means unreadable files. Then either mount a persistent private folder and set `PRESCRIPTION_DIR`, or use a **private** S3 bucket with `PRESCRIPTION_S3_BUCKET` (plus `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`). The S3 path is written but has not been tested against a real bucket yet; try it on staging first.
- **Records**: a prescription used by an order cannot be deleted by the customer (the pharmacy must keep it). A customer may remove one that no order used; its files are deleted and a record of the removal stays.
- Orders placed before Phase 7 have no uploaded prescription; those can still be verified on the order page as before.
- Limits: 10 uploads per hour per customer (`RX_UPLOAD_LIMIT`), 10 prescriptions waiting at a time. Customer notifications (SMS/WhatsApp/email) when a prescription is approved or rejected arrive with Phase 8.

## Fulfilment and customer messages (Phase 8)

**Who does what**
- **Pharmacy staff** (Admin > Fulfilment): *To pack* → open an order → type or scan each batch number from the pack (it must match the batch the system reserved) → *Mark order as packed*. An order with prescription medicines cannot be packed until its prescription is verified.
- **Dispatcher** (admin or pharmacist, Fulfilment > *Ready to send*): tick packed orders, pick a delivery person, *Send out*. Every order gets its own 4-digit code. *On the road* shows who has what, and lets you reassign (this also issues a new code).
- **Delivery person** (`/delivery`, phone-friendly): signs in with their mobile number (OTP) and sees only their own orders, with *Navigate* and *Call*. At the door the customer reads out the 4-digit code; entering it finishes the delivery. For cash orders they tick that they collected the money. *Could not deliver* sends the order back to the shop with a reason. Five wrong codes lock the order until the shop reassigns it.
- **Admin** (Admin > Delivery team): add delivery people by mobile number, see the cash each is holding, and press *Cash received* when they hand it in.
- **Customer**: the order page shows a progress bar that updates by itself, the delivery person's name and number, and the delivery code while the order is on the way.

Delivery people are an extra role (`delivery`). They are not staff: no admin panel, no two-step sign-in, and the API only lets them touch orders assigned to them.

**Messages.** Every order change writes a message into a queue in the same database transaction (so a message is never lost and never sent for a change that failed). A worker sends them and retries failures after 1, 5, 30 minutes, 2 and 6 hours; after that the message shows as *failed* in Admin > Customer messages, where it can be sent again. Messages never name medicines.

| Event | Email | SMS / WhatsApp |
|---|---|---|
| Order confirmed, ready for pickup, out for delivery (with code), delivered, delivery failed, cancelled, refund sent | yes | yes |
| Packed, payment timed out, prescription approved | yes | no |
| Prescription needs more information or was rejected | yes (with the pharmacist's note) | yes (no note) |

Switch channels on or off in Shop settings. A channel also needs its provider configured (see `.env.example`). To make it work:
1. **Email**: create a Resend or Brevo account, verify your sending domain, set the driver, key and `EMAIL_FROM`.
2. **Scheduled job**: call `POST /api/internal/expire-orders` with the `x-cron-secret` header every few minutes (it also retries refunds and expires unpaid orders).
3. **SMS (India)**: register on DLT with these texts as templates. The variables are `{#var#}`: *"MED NEED: Order {#var#} confirmed ({#var#}). Track: {#var#}"* and similar for the other events (the exact wording is in `src/server/notifications/templates.ts`).
4. **WhatsApp**: create one Meta-approved *utility* template per event named `mn_<event>` (for example `mn_order_confirmed`) whose body variables are, in order: customer first name, order number, then the event's extra value(s) (see `params` in `templates.ts`).

The SMS and WhatsApp senders were checked against test servers only. Try each once with your real account before relying on it.
#   M e d N e e d - Y o u r - m e d i c i n e - p a r t n e r  
 