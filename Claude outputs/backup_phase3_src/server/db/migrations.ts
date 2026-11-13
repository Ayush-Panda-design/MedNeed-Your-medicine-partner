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
];
