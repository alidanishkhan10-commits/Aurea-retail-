-- ============================================================================
-- GARMENT B2B PLATFORM — PHASE 1 DATABASE SCHEMA
-- Run this in the Supabase SQL editor (or via `supabase db push`) once your
-- project exists. Written to be idempotent-ish (safe-ish to re-run) using
-- IF NOT EXISTS guards where practical.
-- ============================================================================

-- Extensions ------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- ROLES
-- ============================================================================
-- We piggyback on Supabase auth.users. Every authenticated user gets a row in
-- `profiles` that says whether they are an admin or a retailer, and (for
-- retailers) links to the retailer record.

create type user_role as enum ('admin', 'retailer');

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'retailer',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- RETAILERS
-- ============================================================================
create table if not exists retailers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique references auth.users(id) on delete set null,
  shop_name text not null,
  owner_name text not null,
  phone_number text not null unique,
  gst_number text,
  address text,
  state text,
  city text,
  pincode text,
  credit_limit numeric(12,2) not null default 0,
  outstanding_balance numeric(12,2) not null default 0,
  discount_percent numeric(5,2) not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_retailers_phone on retailers(phone_number);
create index if not exists idx_retailers_gst on retailers(gst_number);

-- ============================================================================
-- DEVICE REGISTRATION
-- One active device per retailer unless admin explicitly authorizes more.
-- ============================================================================
create table if not exists registered_devices (
  id uuid primary key default uuid_generate_v4(),
  retailer_id uuid not null references retailers(id) on delete cascade,
  device_id text not null,          -- stable client-generated fingerprint/uuid
  device_label text,                -- e.g. "iPhone 13 - Chrome" (best-effort, for admin readability)
  is_active boolean not null default true,
  registered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  authorized_multi_device boolean not null default false, -- admin override
  unique (retailer_id, device_id)
);

create index if not exists idx_registered_devices_retailer on registered_devices(retailer_id);

-- ============================================================================
-- RETAILER APP ACTIVITY (simple counters only — no detailed analytics)
-- ============================================================================
create table if not exists retailer_app_activity (
  retailer_id uuid primary key references retailers(id) on delete cascade,
  total_opens integer not null default 0,
  opens_today integer not null default 0,
  opens_today_date date not null default current_date,
  last_open_at timestamptz
);

-- Call this from the client (via RPC) every time the retailer app opens.
-- It resets the daily counter automatically when the date rolls over.
create or replace function record_app_open(p_retailer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into retailer_app_activity (retailer_id, total_opens, opens_today, opens_today_date, last_open_at)
  values (p_retailer_id, 1, 1, current_date, now())
  on conflict (retailer_id) do update
  set
    total_opens = retailer_app_activity.total_opens + 1,
    opens_today = case
      when retailer_app_activity.opens_today_date = current_date
      then retailer_app_activity.opens_today + 1
      else 1
    end,
    opens_today_date = current_date,
    last_open_at = now();
end;
$$;

-- ============================================================================
-- PRODUCTS
-- ============================================================================
create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  sort_order integer not null default 0
);

create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category_id uuid references categories(id),
  sku text unique,
  fabric text,
  gsm integer,
  description text,
  base_price numeric(12,2) not null default 0,
  is_hidden boolean not null default false,
  is_featured boolean not null default false,
  is_best_seller boolean not null default false,
  is_new_arrival boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0
);

create table if not exists product_colours (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  hex_code text
);

-- Pieces-per-set breakdown, e.g. S=6, M=6, L=4, XL=4 (admin-editable)
create table if not exists product_size_sets (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  size_label text not null,
  pieces_per_set integer not null default 0,
  sort_order integer not null default 0
);

create table if not exists inventory (
  product_id uuid primary key references products(id) on delete cascade,
  current_stock integer not null default 0,
  reserved_stock integer not null default 0,
  low_stock_threshold integer not null default 10
);

-- ============================================================================
-- ORDERS
-- ============================================================================
create type order_status as enum (
  'order_received', 'payment_pending', 'payment_verified',
  'cutting', 'stitching', 'packing', 'dispatched', 'delivered', 'cancelled'
);

create type payment_method as enum ('pay_after_delivery', 'pay_now');
create type payment_status as enum ('pending', 'waiting_verification', 'verified', 'rejected', 'partially_paid', 'paid');

create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text not null unique,
  retailer_id uuid not null references retailers(id),
  status order_status not null default 'order_received',
  payment_method payment_method not null,
  payment_status payment_status not null default 'pending',
  subtotal numeric(12,2) not null default 0,
  gst_amount numeric(12,2) not null default 0,
  grand_total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  colour text,
  num_sets integer not null,
  total_pieces integer not null,
  unit_price numeric(12,2) not null,
  line_total numeric(12,2) not null
);

create table if not exists payment_proofs (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  storage_path text not null,
  uploaded_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  decision text check (decision in ('approved', 'rejected'))
);

-- ============================================================================
-- SETTINGS (single row, admin-editable)
-- ============================================================================
create table if not exists app_settings (
  id boolean primary key default true check (id),
  qr_code_storage_path text,
  business_name text,
  gst_number text,
  shipping_charge numeric(12,2) not null default 0,
  tax_percent numeric(5,2) not null default 0,
  terms_and_conditions text,
  privacy_policy text,
  contact_info text,
  logo_storage_path text,
  theme_gold_hex text not null default '#B8924A'
);
insert into app_settings (id) values (true) on conflict (id) do nothing;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table profiles enable row level security;
alter table retailers enable row level security;
alter table registered_devices enable row level security;
alter table retailer_app_activity enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_colours enable row level security;
alter table product_size_sets enable row level security;
alter table inventory enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payment_proofs enable row level security;
alter table app_settings enable row level security;
alter table categories enable row level security;

-- Helper: is the current JWT an admin?
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- profiles: users can read their own row; admins can read all
create policy "profiles_self_or_admin_select" on profiles
  for select using (id = auth.uid() or is_admin());

-- retailers: a retailer can only see their own record; admin sees all
create policy "retailers_self_select" on retailers
  for select using (user_id = auth.uid() or is_admin());
create policy "retailers_admin_write" on retailers
  for all using (is_admin()) with check (is_admin());

-- registered_devices: retailer can see/manage only their own device rows
create policy "devices_self_select" on registered_devices
  for select using (
    retailer_id in (select id from retailers where user_id = auth.uid())
    or is_admin()
  );
create policy "devices_admin_write" on registered_devices
  for all using (is_admin()) with check (is_admin());

-- retailer_app_activity: readable by the retailer themself (their own counters)
-- and by admin; writes only happen via the record_app_open() RPC (security
-- definer), so no direct insert/update policy is granted to retailers.
create policy "activity_self_or_admin_select" on retailer_app_activity
  for select using (
    retailer_id in (select id from retailers where user_id = auth.uid())
    or is_admin()
  );

-- products / catalog data: publicly readable to any authenticated user
-- (retailers browse the catalog); writes are admin-only.
create policy "catalog_read_all" on products for select using (not is_hidden or is_admin());
create policy "catalog_admin_write" on products for all using (is_admin()) with check (is_admin());
create policy "categories_read_all" on categories for select using (true);
create policy "categories_admin_write" on categories for all using (is_admin()) with check (is_admin());
create policy "images_read_all" on product_images for select using (true);
create policy "images_admin_write" on product_images for all using (is_admin()) with check (is_admin());
create policy "colours_read_all" on product_colours for select using (true);
create policy "colours_admin_write" on product_colours for all using (is_admin()) with check (is_admin());
create policy "sizesets_read_all" on product_size_sets for select using (true);
create policy "sizesets_admin_write" on product_size_sets for all using (is_admin()) with check (is_admin());
create policy "inventory_read_all" on inventory for select using (true);
create policy "inventory_admin_write" on inventory for all using (is_admin()) with check (is_admin());

-- orders: retailer sees only their own orders; admin sees all
create policy "orders_self_select" on orders
  for select using (
    retailer_id in (select id from retailers where user_id = auth.uid())
    or is_admin()
  );
create policy "orders_self_insert" on orders
  for insert with check (
    retailer_id in (select id from retailers where user_id = auth.uid())
  );
create policy "orders_admin_update" on orders
  for update using (is_admin());

create policy "order_items_self_select" on order_items
  for select using (
    order_id in (
      select id from orders where retailer_id in (
        select id from retailers where user_id = auth.uid()
      )
    ) or is_admin()
  );
create policy "order_items_self_insert" on order_items
  for insert with check (
    order_id in (
      select id from orders where retailer_id in (
        select id from retailers where user_id = auth.uid()
      )
    )
  );

create policy "payment_proofs_self_select" on payment_proofs
  for select using (
    order_id in (
      select id from orders where retailer_id in (
        select id from retailers where user_id = auth.uid()
      )
    ) or is_admin()
  );
create policy "payment_proofs_self_insert" on payment_proofs
  for insert with check (
    order_id in (
      select id from orders where retailer_id in (
        select id from retailers where user_id = auth.uid()
      )
    )
  );
create policy "payment_proofs_admin_update" on payment_proofs
  for update using (is_admin());

-- settings: readable by everyone logged in, writable only by admin
create policy "settings_read_all" on app_settings for select using (true);
create policy "settings_admin_write" on app_settings for update using (is_admin());
