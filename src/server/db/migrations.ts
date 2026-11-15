// Plain SQL migrations, applied in order at startup and tracked in schema_migrations.
// Add new migrations to the END of the list; never edit one that has shipped.

export const migrations: { id: string; sql: string }[] = [
  {
    id: "0001_auth",
    sql: `
create table users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  email_verified boolean not null default false,
  phone text,
  phone_verified boolean not null default false,
  password_hash text,
  avatar_url text,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);
create unique index users_email_uq on users (lower(email)) where email is not null;
create unique index users_phone_uq on users (phone) where phone is not null;

create table user_roles (
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('customer', 'admin', 'pharmacist', 'inventory_manager')),
  primary key (user_id, role)
);

create table identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null,
  provider_user_id text not null,
  email text,
  created_at timestamptz not null default now(),
  unique (provider, provider_user_id)
);
create index identities_user_idx on identities (user_id);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  refresh_hash text not null unique,
  prev_refresh_hash text,
  rotated_at timestamptz,
  tfa_verified boolean not null default false,
  user_agent text,
  ip text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create index sessions_user_idx on sessions (user_id);
create index sessions_prev_idx on sessions (prev_refresh_hash);

create table otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  purpose text not null,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index otp_phone_idx on otp_codes (phone, purpose, created_at desc);

create table rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  label text not null default 'home' check (label in ('home', 'work', 'other')),
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  landmark text,
  city text not null,
  state text not null,
  pincode text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_user_idx on addresses (user_id);

create table user_totp (
  user_id uuid primary key references users(id) on delete cascade,
  secret_enc text not null,
  confirmed_at timestamptz,
  last_step integer not null default 0,
  created_at timestamptz not null default now()
);

create table totp_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz
);
create index totp_recovery_user_idx on totp_recovery_codes (user_id);

create table audit_log (
  id bigserial primary key,
  user_id uuid,
  action text not null,
  detail jsonb,
  ip text,
  created_at timestamptz not null default now()
);
create index audit_user_idx on audit_log (user_id, created_at desc);
`,
  },
  {
    id: "0002_catalog",
    sql: `
create extension if not exists pg_trgm;

create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text not null default 'pill',
  blurb text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table manufacturers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
create unique index manufacturers_name_uq on manufacturers (lower(name));

-- A salt is an active ingredient (generic name), e.g. Paracetamol.
create table salts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
create unique index salts_name_uq on salts (lower(name));

create table medicines (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  manufacturer_id uuid not null references manufacturers(id),
  category_id uuid not null references categories(id),
  form text not null,
  pack_size text not null,
  mrp numeric(10,2) not null,
  price numeric(10,2) not null,
  -- Drugs and Cosmetics Rules schedule. OTC = no prescription needed.
  schedule text not null,
  -- Narcotic / psychotropic / habit-forming / tranquilizer items that must never be sold online.
  no_online_sale boolean not null default false,
  -- draft: not visible. active: on the storefront. discontinued: kept for records, not visible.
  status text not null default 'draft',
  -- unverified: entered or imported, not yet reviewed. verified: reviewed by a pharmacist/admin.
  -- sample: fictional placeholder data for development only.
  data_status text not null default 'unverified',
  in_stock boolean not null default true,
  composition_key text not null default '',
  description text not null default '',
  uses jsonb not null default '[]'::jsonb,
  how_to_use text not null default '',
  side_effects jsonb not null default '[]'::jsonb,
  precautions jsonb not null default '[]'::jsonb,
  image_url text,
  source text not null default 'manual',
  source_ref text,
  nppa_ceiling_price numeric(10,2),
  search_text text not null default '',
  verified_by uuid references users(id) on delete set null,
  verified_at timestamptz,
  created_by uuid references users(id) on delete set null,
  updated_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint medicines_schedule_chk check (schedule in ('OTC','H','H1','X')),
  constraint medicines_status_chk check (status in ('draft','active','discontinued')),
  constraint medicines_data_status_chk check (data_status in ('unverified','verified','sample')),
  constraint medicines_mrp_chk check (mrp > 0),
  constraint medicines_price_chk check (price > 0 and price <= mrp),
  constraint medicines_ceiling_chk check (nppa_ceiling_price is null or nppa_ceiling_price > 0),
  -- Safety nets enforced by the database itself, whatever code path writes the row:
  constraint medicines_no_x_listing_chk check (not (status = 'active' and (schedule = 'X' or no_online_sale))),
  constraint medicines_review_chk check (status <> 'active' or data_status in ('verified','sample'))
);
create unique index medicines_natural_uq on medicines (lower(name), manufacturer_id, lower(pack_size));
create index medicines_listing_idx on medicines (status, category_id);
create index medicines_substitute_idx on medicines (composition_key, form) where composition_key <> '';
create index medicines_manufacturer_idx on medicines (manufacturer_id);
create index medicines_search_trgm on medicines using gin (search_text gin_trgm_ops);

create table medicine_salts (
  medicine_id uuid not null references medicines(id) on delete cascade,
  salt_id uuid not null references salts(id),
  strength text not null default '',
  position integer not null default 0,
  primary key (medicine_id, salt_id)
);
create index medicine_salts_salt_idx on medicine_salts (salt_id);

insert into categories (slug, name, icon, blurb, sort_order) values
  ('pain-relief', 'Pain Relief', 'pill', 'Fever, headache, body ache', 10),
  ('cold-cough', 'Cold & Cough', 'wind', 'Relief for cold, flu and allergies', 20),
  ('diabetes-care', 'Diabetes Care', 'droplet', 'Medicines, strips and monitors', 30),
  ('heart-care', 'Heart Care', 'heart-pulse', 'Blood pressure and cholesterol', 40),
  ('vitamins', 'Vitamins & Supplements', 'sparkles', 'Daily nutrition and immunity', 50),
  ('digestive-care', 'Digestive Care', 'stomach', 'Acidity, gas and constipation', 60),
  ('skin-care', 'Skin Care', 'sun', 'Creams, gels and sun care', 70),
  ('baby-care', 'Baby Care', 'baby', 'Gentle care for little ones', 80),
  ('womens-care', 'Women''s Care', 'flower', 'Health and wellness essentials', 90),
  ('devices', 'Health Devices', 'stethoscope', 'BP monitors, thermometers, more', 100);
`,
  },
  {
    id: "0003_unconfirmed_schedule",
    sql: `
-- Imported data (free datasets, wholesaler lists) usually has no prescription schedule.
-- "unknown" lets it be staged safely: it can never be verified or listed on the store.
alter table medicines drop constraint medicines_schedule_chk;
alter table medicines add constraint medicines_schedule_chk check (schedule in ('OTC','H','H1','X','unknown'));
alter table medicines add constraint medicines_unknown_not_active_chk check (not (status = 'active' and schedule = 'unknown'));
alter table medicines add constraint medicines_unknown_not_verified_chk check (not (data_status = 'verified' and schedule = 'unknown'));
-- Holding category for imported items until they are sorted. Hidden from the store menu.
insert into categories (slug, name, icon, blurb, sort_order, is_active) values ('uncategorised', 'Uncategorised', 'pill', 'Imported items waiting to be sorted', 999, false);
`,
  },
  {
    id: "0004_therapeutic_sections",
    sql: `
-- Sections that large catalogues have and the first ten lacked (antibiotics are the biggest group by far).
insert into categories (slug, name, icon, blurb, sort_order) values
  ('infection-care', 'Infection Care', 'shield', 'Antibiotics, antifungals, antivirals, antimalarials', 25),
  ('respiratory-care', 'Asthma & Breathing', 'wind', 'Inhalers and medicines for asthma and COPD', 28),
  ('brain-nerve', 'Brain & Nerve Care', 'brain', 'Sleep, mood, epilepsy, nerve and migraine care', 55),
  ('eye-ear', 'Eye & Ear Care', 'eye', 'Eye drops, ear drops and related care', 65),
  ('hormones-steroids', 'Hormones & Steroids', 'activity', 'Thyroid, corticosteroids and other hormones', 85)
on conflict (slug) do nothing;
`,
  },
  {
    id: "0005_catalog_listing_and_requests",
    sql: `
-- "catalog" = visible on the store with its details but not orderable. Used for items whose price,
-- schedule or stock are not confirmed: customers can ask the store to source them instead.
alter table medicines drop constraint medicines_status_chk;
alter table medicines add constraint medicines_status_chk check (status in ('draft','catalog','active','discontinued'));

create table medicine_requests (
  id uuid primary key default gen_random_uuid(),
  medicine_id uuid not null references medicines(id) on delete cascade,
  name text not null,
  phone text not null,
  quantity integer not null default 1 check (quantity between 1 and 99),
  note text not null default '',
  status text not null default 'new' check (status in ('new','contacted','fulfilled','cancelled')),
  handled_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index medicine_requests_status_idx on medicine_requests (status, created_at desc);

-- Development staging data only (the dataset loader never runs in production): list it on the store.
update medicines set status = 'catalog' where status = 'draft' and source like 'dataset:%';
`,
  },
  {
    id: "0006_inventory",
    sql: `
-- Wholesalers the pharmacy buys from.
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  gstin text not null default '',
  drug_license text not null default '',
  address text not null default '',
  notes text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index suppliers_name_uq on suppliers (lower(name));

-- One row per wholesaler purchase invoice. The same bill number from the same supplier cannot be entered twice.
create table purchases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id),
  bill_number text not null,
  bill_date date not null,
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  notes text not null default '',
  idempotency_key text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index purchases_bill_uq on purchases (supplier_id, lower(bill_number));
create unique index purchases_idem_uq on purchases (idempotency_key) where idempotency_key is not null;
create index purchases_date_idx on purchases (bill_date desc, created_at desc);

-- A batch of one medicine with its own expiry date and MRP, as printed on the wholesaler invoice.
create table stock_batches (
  id uuid primary key default gen_random_uuid(),
  medicine_id uuid not null references medicines(id) on delete restrict,
  batch_no text not null,
  expiry_date date not null,
  mrp numeric(10,2) not null check (mrp > 0),
  purchase_rate numeric(10,2) not null check (purchase_rate >= 0),
  qty_received integer not null check (qty_received > 0),
  qty_on_hand integer not null check (qty_on_hand >= 0),
  source text not null default 'purchase',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index stock_batches_uq on stock_batches (medicine_id, upper(batch_no));
-- First-expiry-first-out lookups and expiry alerts only ever look at batches that still have stock.
create index stock_batches_fefo_idx on stock_batches (medicine_id, expiry_date, created_at) where qty_on_hand > 0;
create index stock_batches_expiry_idx on stock_batches (expiry_date) where qty_on_hand > 0;

create table purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases(id) on delete restrict,
  batch_id uuid not null references stock_batches(id) on delete restrict,
  medicine_id uuid not null references medicines(id) on delete restrict,
  batch_no text not null,
  expiry_date date not null,
  qty integer not null check (qty >= 0),
  free_qty integer not null default 0 check (free_qty >= 0),
  mrp numeric(10,2) not null check (mrp > 0),
  purchase_rate numeric(10,2) not null check (purchase_rate >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  check (qty + free_qty > 0)
);
create index purchase_items_purchase_idx on purchase_items (purchase_id);
create index purchase_items_medicine_idx on purchase_items (medicine_id);

-- Append-only ledger: every change to stock is a row here. Rows can never be edited or deleted,
-- so the history always explains the current quantity.
create table stock_movements (
  id bigint generated always as identity primary key,
  batch_id uuid not null references stock_batches(id) on delete restrict,
  medicine_id uuid not null references medicines(id) on delete restrict,
  delta integer not null check (delta <> 0),
  balance_after integer not null check (balance_after >= 0),
  kind text not null check (kind in ('purchase','opening','sale','sale_return','damage','expired','correction','supplier_return')),
  ref_type text,
  ref_id text,
  note text not null default '',
  actor_id uuid,
  created_at timestamptz not null default now()
);
create index stock_movements_batch_idx on stock_movements (batch_id, id);
create index stock_movements_medicine_idx on stock_movements (medicine_id, id desc);
create index stock_movements_ref_idx on stock_movements (ref_type, ref_id) where ref_id is not null;

create function stock_movements_append_only() returns trigger language plpgsql as $fn$
begin
  raise exception 'stock_movements is append-only';
end
$fn$;
create trigger stock_movements_no_change before update or delete on stock_movements
  for each row execute function stock_movements_append_only();

-- Medicine-level stock summary and pricing inputs. stock_qty is the total on hand across batches and is
-- maintained by the inventory service in the same transaction as every ledger entry.
alter table medicines add column stock_qty integer not null default 0 check (stock_qty >= 0);
alter table medicines add column discount_percent numeric(5,2) not null default 0 check (discount_percent >= 0 and discount_percent <= 90);
alter table medicines add column reorder_level integer not null default 10 check (reorder_level >= 0);
create index medicines_stock_idx on medicines (stock_qty) where stock_qty > 0;

-- Keep today's prices: express the existing price as a discount on MRP.
update medicines set discount_percent = least(90, round(((mrp - price) / mrp) * 100, 2));

-- Fictional development products that were flagged "in stock" get an opening batch so the dev store still shows stock.
-- Real (non-sample) products are never given invented stock.
with opened as (
  insert into stock_batches (medicine_id, batch_no, expiry_date, mrp, purchase_rate, qty_received, qty_on_hand, source)
  select id, 'SAMPLE-OPENING', (now() at time zone 'Asia/Kolkata')::date + 540, mrp, round(mrp * 0.7, 2), 50, 50, 'sample'
  from medicines where in_stock and data_status = 'sample'
  returning id, medicine_id
), moved as (
  insert into stock_movements (batch_id, medicine_id, delta, balance_after, kind, note)
  select id, medicine_id, 50, 50, 'opening', 'Sample development stock' from opened
  returning medicine_id
)
update medicines set stock_qty = 50 where id in (select medicine_id from moved);

alter table medicines drop column in_stock;
`,
  },
  {
    id: "0007_orders",
    sql: `
-- Store-wide settings (one row). Validated by the application; see server/orders/settings.ts.
create table store_settings (
  id smallint primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references users(id) on delete set null
);
insert into store_settings (id, data) values (1, '{}'::jsonb);

-- Pincodes with a centre point, used to work out distance when a customer has not shared an exact location.
create table service_pincodes (
  pincode text primary key check (pincode ~ '^[1-9][0-9]{5}$'),
  area text not null default '',
  lat numeric(9,6) not null check (lat between -90 and 90),
  lng numeric(9,6) not null check (lng between -180 and 180),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table addresses add column lat numeric(9,6) check (lat is null or lat between -90 and 90);
alter table addresses add column lng numeric(9,6) check (lng is null or lng between -180 and 180);

create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text not null default '',
  kind text not null check (kind in ('percent', 'flat')),
  value numeric(10,2) not null check (value > 0),
  max_discount numeric(10,2) check (max_discount is null or max_discount > 0),
  min_order numeric(10,2) not null default 0 check (min_order >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  per_user_limit integer not null default 1 check (per_user_limit > 0),
  used_count integer not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create unique index coupons_code_uq on coupons (upper(code));

create sequence order_number_seq start 1000;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references users(id) on delete restrict,
  status text not null check (status in ('pending_payment','confirmed','packed','out_for_delivery','delivered','cancelled','expired')),
  fulfilment text not null check (fulfilment in ('delivery','pickup')),
  payment_method text not null check (payment_method in ('cod','pay_at_store','online')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded','failed')),
  customer_name text not null,
  customer_phone text not null,
  address jsonb,
  distance_km numeric(6,2),
  distance_source text check (distance_source in ('pin','pincode')),
  mrp_total numeric(12,2) not null check (mrp_total >= 0),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0),
  total numeric(12,2) not null check (total >= 0),
  coupon_code text,
  slot_date date,
  slot_window text,
  customer_note text not null default '',
  requires_prescription boolean not null default false,
  prescription_status text not null default 'not_required' check (prescription_status in ('not_required','pending','verified','rejected')),
  prescription_note text not null default '',
  expires_at timestamptz,
  idempotency_key text,
  cancel_reason text,
  cancelled_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total = subtotal - discount + delivery_fee),
  check (fulfilment <> 'delivery' or address is not null)
);
create unique index orders_idem_uq on orders (user_id, idempotency_key) where idempotency_key is not null;
create index orders_user_idx on orders (user_id, created_at desc);
create index orders_status_idx on orders (status, created_at desc);
create index orders_expiry_idx on orders (expires_at) where status = 'pending_payment';

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete restrict,
  medicine_id uuid not null references medicines(id) on delete restrict,
  slug text not null,
  name text not null,
  pack_size text not null,
  manufacturer text not null,
  schedule text not null,
  qty integer not null check (qty > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  mrp numeric(10,2) not null check (mrp >= 0),
  line_total numeric(12,2) not null check (line_total >= 0)
);
create index order_items_order_idx on order_items (order_id);
create index order_items_medicine_idx on order_items (medicine_id);

-- Which physical batches filled each line (needed for recalls and for returns).
create table order_item_batches (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_items(id) on delete restrict,
  batch_id uuid not null references stock_batches(id) on delete restrict,
  batch_no text not null,
  expiry_date date not null,
  qty integer not null check (qty > 0)
);
create index order_item_batches_item_idx on order_item_batches (order_item_id);
create index order_item_batches_batch_idx on order_item_batches (batch_id);

create table order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references orders(id) on delete restrict,
  status text not null,
  note text not null default '',
  actor_id uuid,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on order_events (order_id, id);

create table coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons(id) on delete restrict,
  user_id uuid not null references users(id) on delete cascade,
  order_id uuid not null unique references orders(id) on delete cascade,
  amount numeric(10,2) not null,
  created_at timestamptz not null default now()
);
create index coupon_redemptions_user_idx on coupon_redemptions (coupon_id, user_id);
`,
  },
  {
    id: "0008_payments",
    sql: `
-- Razorpay payments. One row per gateway order we create for a customer order.
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete restrict,
  gateway text not null default 'razorpay',
  gateway_order_id text not null unique,
  gateway_payment_id text unique,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'created' check (status in ('created','paid','failed')),
  method text,
  last_error text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index payments_order_idx on payments (order_id);

-- Every webhook delivery we have seen, so a repeated delivery is ignored.
create table payment_events (
  event_id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

create table refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete restrict,
  payment_id uuid not null references payments(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  reason text not null,
  status text not null default 'pending' check (status in ('pending','processing','processed','failed')),
  gateway_refund_id text unique,
  last_error text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index refunds_order_idx on refunds (order_id);
create index refunds_open_idx on refunds (status) where status in ('pending','failed','processing');
-- A payment is refunded in full, once.
create unique index refunds_one_per_payment on refunds (payment_id);

alter table orders add column paid_at timestamptz;
alter table orders add column invoice_number text unique;
alter table orders add column invoice_date timestamptz;

create table invoice_counters (
  fy text primary key,
  last_number integer not null default 0
);

alter table medicines add column gst_percent numeric(4,1) check (gst_percent is null or (gst_percent >= 0 and gst_percent <= 40));
alter table medicines add column hsn text;
alter table order_items add column gst_percent numeric(4,1) not null default 5;
alter table order_items add column hsn text not null default '3004';
`,
  },
  {
    id: "0009_prescriptions",
    sql: `
-- A prescription belongs to a customer and can be used on many orders until its approved quantities run out.
create table prescriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','needs_info','approved','rejected','withdrawn')),
  patient_name text not null default '',
  doctor_name text not null default '',
  doctor_reg_no text not null default '',
  prescribed_on date,
  valid_until date,
  customer_note text not null default '',
  review_note text not null default '',
  reviewed_by uuid references users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index prescriptions_user_idx on prescriptions (user_id, created_at desc);
create index prescriptions_queue_idx on prescriptions (created_at) where status in ('pending','needs_info');

-- The images / PDFs. Bytes live in private storage (never in a public folder); only the key is kept here.
create table prescription_files (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references prescriptions(id) on delete cascade,
  storage_key text not null unique,
  mime text not null,
  bytes integer not null check (bytes > 0),
  sha256 text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index prescription_files_rx_idx on prescription_files (prescription_id, position);

-- What the pharmacist approved, and the most units of each medicine the prescription may supply in total.
create table prescription_items (
  prescription_id uuid not null references prescriptions(id) on delete cascade,
  medicine_id uuid not null references medicines(id) on delete restrict,
  max_qty integer not null check (max_qty > 0 and max_qty <= 1000),
  primary key (prescription_id, medicine_id)
);

-- Which prescriptions an order was placed with.
create table order_prescriptions (
  order_id uuid not null references orders(id) on delete restrict,
  prescription_id uuid not null references prescriptions(id) on delete restrict,
  primary key (order_id, prescription_id)
);
create index order_prescriptions_rx_idx on order_prescriptions (prescription_id);

-- Units drawn from a prescription by verified orders. Removed when the order is cancelled or expires, so the quantity is available again.
create table prescription_usage (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references prescriptions(id) on delete restrict,
  medicine_id uuid not null references medicines(id) on delete restrict,
  order_id uuid not null references orders(id) on delete restrict,
  qty integer not null check (qty > 0),
  created_at timestamptz not null default now(),
  unique (prescription_id, medicine_id, order_id)
);
create index prescription_usage_order_idx on prescription_usage (order_id);

-- Who did what to a prescription, and when.
create table prescription_events (
  id bigserial primary key,
  prescription_id uuid not null references prescriptions(id) on delete cascade,
  status text not null,
  note text not null default '',
  actor_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index prescription_events_rx_idx on prescription_events (prescription_id, id);
`,
  },
  {
    id: "0010_fulfilment_notifications",
    sql: `
-- Delivery staff are a role, but not an admin-panel role: they sign in like customers (mobile OTP) and see only /delivery.
alter table user_roles drop constraint user_roles_role_check;
alter table user_roles add constraint user_roles_role_check check (role in ('customer', 'admin', 'pharmacist', 'inventory_manager', 'delivery'));

-- Packing, dispatch and handover details on the order.
alter table orders
  add column packed_at timestamptz,
  add column packed_by uuid,
  add column dispatched_at timestamptz,
  add column delivered_at timestamptz,
  add column delivery_partner_id uuid references users(id) on delete set null,
  add column delivery_code text check (delivery_code is null or delivery_code ~ '^[0-9]{4}$'),
  add column delivery_code_attempts integer not null default 0,
  add column delivery_attempts integer not null default 0,
  add column cod_collected numeric(12,2) check (cod_collected is null or cod_collected >= 0),
  add column cod_collected_at timestamptz,
  add column cod_settled_at timestamptz,
  add column cod_settled_by uuid;
update orders set delivered_at = updated_at where status = 'delivered';
create index orders_partner_idx on orders (delivery_partner_id, status) where delivery_partner_id is not null;
create index orders_cod_cash_idx on orders (delivery_partner_id) where cod_collected_at is not null and cod_settled_at is null;

-- The packer confirms each batch they pick (the batch number must match the one the system reserved).
alter table order_item_batches add column picked_at timestamptz, add column picked_by uuid;

-- Every failed delivery attempt, so repeated failures are visible.
create table delivery_attempts (
  id bigint generated always as identity primary key,
  order_id uuid not null references orders(id) on delete restrict,
  partner_id uuid references users(id) on delete set null,
  reason text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index delivery_attempts_order_idx on delivery_attempts (order_id, id);

-- Outbox for customer messages. A row is written in the same transaction as the order change, so a message is never lost
-- and never sent for a change that was rolled back. A worker sends the rows and retries failures.
create table notifications (
  id bigint generated always as identity primary key,
  user_id uuid references users(id) on delete cascade,
  order_id uuid references orders(id) on delete cascade,
  event text not null,
  channel text not null check (channel in ('email', 'sms', 'whatsapp')),
  recipient text not null,
  subject text not null default '',
  body text not null,
  html text,
  params jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'dead')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  last_error text,
  provider_id text,
  dedupe_key text not null unique,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index notifications_due_idx on notifications (next_attempt_at) where status in ('pending', 'sending');
create index notifications_order_idx on notifications (order_id, id);
create index notifications_status_idx on notifications (status, id desc);
`,
  },
  {
    id: "0011_ai",
    sql: `
-- Cache of AI responses so repeated queries (searches, product questions) are served without spending free-tier quota.
create table ai_cache (
  cache_key text primary key,
  feature text not null,
  value jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index ai_cache_expiry_idx on ai_cache (expires_at);

-- Per-key daily call counts, for spreading load across free keys and for observability.
create table ai_key_usage (
  key_id text not null,
  day date not null,
  calls integer not null default 0,
  errors integer not null default 0,
  primary key (key_id, day)
);
`,
  },
  {
    id: "0012_refills",
    sql: `
-- Opt-out flag: customers who don't want refill nudges.
alter table users add column refill_optout boolean not null default false;

-- Marks a delivered order whose items have already been considered for refill reminders, so the backfill job runs once per order.
alter table orders add column refills_done boolean not null default false;

-- A scheduled nudge to reorder a maintenance medicine. One active ('scheduled') reminder per customer+medicine.
create table refill_reminders (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  slug text not null,
  name text not null,
  order_id uuid references orders(id) on delete set null,
  interval_days integer not null,
  remind_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'notified', 'cancelled')),
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index refill_active_uq on refill_reminders (user_id, slug) where status = 'scheduled';
create index refill_due_idx on refill_reminders (remind_at) where status = 'scheduled';
create index refill_user_idx on refill_reminders (user_id);
`,
  },
  {
    id: "0013_embeddings",
    sql: `
-- Semantic-search vectors for products. Stored as a plain JSON array of floats so it works identically on
-- Postgres and the dev database with no extension; similarity is computed in the app over this bounded catalogue.
create table product_embeddings (
  medicine_id uuid primary key references medicines(id) on delete cascade,
  model text not null,
  dim integer not null,
  embedding jsonb not null,
  source_hash text not null,
  updated_at timestamptz not null default now()
);
`,
  },
  {
    id: "0014_email_tokens",
    sql: `
-- Single-use links sent by email: verify an address, or reset a forgotten password.
-- Only a SHA-256 of the token is stored, so a database leak cannot be turned into working links.
create table email_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  purpose text not null check (purpose in ('verify_email', 'reset_password')),
  token_hash text not null unique,
  email text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index email_tokens_user_idx on email_tokens (user_id, purpose, created_at desc);
`,
  },
  {
    id: "0015_carts",
    sql: `
-- The signed-in customer's cart, so it follows them across devices and survives sign-out.
-- Only slugs and quantities are stored; prices and stock are always re-read from the catalogue.
create table carts (
  user_id uuid primary key references users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
`,
  },
  {
    id: "0016_browse_speed",
    sql: `
-- Speed for a large catalogue (tens of thousands of medicines) on a small database:
-- the default listing order can be read straight from an index (no sorting of the whole table per page),
-- for the whole catalogue and per category.
create index medicines_browse_idx on medicines (((status = 'active')) desc, ((stock_qty > 0)) desc, name)
  where status in ('active','catalog');
create index medicines_browse_cat_idx on medicines (category_id, ((status = 'active')) desc, ((stock_qty > 0)) desc, name)
  where status in ('active','catalog');
-- Typo-tolerant search uses the trigram index through the %> operator; make its threshold match the app's 0.5.
do $$ begin
  execute format('alter database %I set pg_trgm.word_similarity_threshold = 0.5', current_database());
exception when others then null;
end $$;
`,
  },
];
