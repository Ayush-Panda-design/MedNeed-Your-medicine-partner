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
];
