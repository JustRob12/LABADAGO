-- ==============================================================================
-- LabadaGo Database Schema for Supabase
-- Brand: Labada (Blue) Go (Green)
--
-- Roles:
--   0 = Admin
--   1 = Owner (Laundry Shop Owner)
--   2 = Costumer (Customer) - Default for all registered users
--
-- INSTRUCTIONS TO RUN IN SUPABASE:
-- 1. Log in to your Supabase Dashboard: https://app.supabase.com
-- 2. Select your project (https://zmpvqrtpuqlptjsaefgz.supabase.co)
-- 3. Click on the "SQL Editor" tab in the left sidebar.
-- 4. Click "New query", paste the entire contents of this file, and click "Run".
-- ==============================================================================

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Profiles Table linked to Supabase auth.users
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text not null,
  date_of_birth date not null,
  phone_number text not null,
  gender text not null check (gender in ('Male', 'Female', 'Other', 'Prefer not to say')),
  role smallint not null default 2 check (role in (0, 1, 2)),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.profiles is 'Stores user profile information for LabadaGo users.';
comment on column public.profiles.role is '0 = Admin, 1 = Owner, 2 = Costumer';

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_email on public.profiles(email);

-- ------------------------------------------------------------------------------
-- 2. Laundry Shops Table (Location, hours, queue status, capacity)
-- ------------------------------------------------------------------------------
create table if not exists public.laundry_shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  description text,
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  phone_number text not null,
  open_time text default '07:00',
  close_time text default '20:00',
  queue_status text default 'Low' check (queue_status in ('Low', 'Moderate', 'Busy', 'Full', 'Closed')),
  is_open boolean default true,
  rating numeric(2,1) default 4.8,
  total_reviews int default 0,
  washer_count int default 6,
  dryer_count int default 6,
  images text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure images column exists if table was created previously
alter table public.laundry_shops add column if not exists images text[] default '{}';

create index if not exists idx_shops_owner on public.laundry_shops(owner_id);
create index if not exists idx_shops_location on public.laundry_shops(latitude, longitude);

-- ------------------------------------------------------------------------------
-- 3. Shop Services Catalog (Pricing, unit, turnaround)
-- ------------------------------------------------------------------------------
create table if not exists public.shop_services (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.laundry_shops(id) on delete cascade not null,
  service_name text not null,
  description text,
  price numeric(10,2) not null,
  unit text not null default 'kg', -- 'kg', 'load', 'piece'
  estimated_minutes int default 120,
  is_available boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_services_shop on public.shop_services(shop_id);

-- ------------------------------------------------------------------------------
-- 4. Transactions / Laundry Orders (Walk-in QR & Online)
-- ------------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  tracking_number text unique not null,
  customer_id uuid references auth.users(id) on delete set null,
  shop_id uuid references public.laundry_shops(id) on delete cascade not null,
  customer_name text not null,
  customer_phone text not null,
  service_name text not null,
  weight_kg numeric(6,2) default 5.0,
  total_amount numeric(10,2) not null,
  status text default 'Received' check (status in ('Pending', 'Received', 'Washing', 'Drying', 'Folding', 'Ready', 'Completed', 'Cancelled')),
  payment_status text default 'Unpaid' check (payment_status in ('Unpaid', 'Paid', 'Refunded')),
  is_walkin boolean default true,
  qr_data text,
  special_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_transactions_customer on public.transactions(customer_id);
create index if not exists idx_transactions_shop on public.transactions(shop_id);
create index if not exists idx_transactions_status on public.transactions(status);

-- ------------------------------------------------------------------------------
-- 5. Reviews and Ratings
-- ------------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.laundry_shops(id) on delete cascade not null,
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_reviews_shop on public.reviews(shop_id);

-- ------------------------------------------------------------------------------
-- 6. Enable Row Level Security (RLS)
-- ------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.laundry_shops enable row level security;
alter table public.shop_services enable row level security;
alter table public.transactions enable row level security;
alter table public.reviews enable row level security;

-- Drop existing policies for clean rerun
drop policy if exists "Profiles are viewable by owner or admin" on public.profiles;
drop policy if exists "Profiles updateable by user" on public.profiles;
drop policy if exists "Profiles insertable by user" on public.profiles;
drop policy if exists "Shops are publicly viewable" on public.laundry_shops;
drop policy if exists "Shops editable by owner" on public.laundry_shops;
drop policy if exists "Shops insertable by owner" on public.laundry_shops;
drop policy if exists "Services viewable by all" on public.shop_services;
drop policy if exists "Services editable by shop owner" on public.shop_services;
drop policy if exists "Transactions viewable by customer and shop owner" on public.transactions;
drop policy if exists "Transactions insertable by authenticated users" on public.transactions;
drop policy if exists "Transactions updateable by shop owner" on public.transactions;
drop policy if exists "Reviews viewable by all" on public.reviews;
drop policy if exists "Reviews insertable by authenticated customer" on public.reviews;

-- Profiles policies
create policy "Profiles are viewable by owner or admin" on public.profiles
  for select using (auth.uid() = id or (select role from public.profiles where id = auth.uid()) = 0);

create policy "Profiles updateable by user" on public.profiles
  for update using (auth.uid() = id);

create policy "Profiles insertable by user" on public.profiles
  for insert with check (auth.uid() = id);

-- Laundry Shops policies (Publicly readable so map works for everyone)
create policy "Shops are publicly viewable" on public.laundry_shops
  for select using (true);

create policy "Shops editable by owner" on public.laundry_shops
  for update using (auth.uid() = owner_id or (select role from public.profiles where id = auth.uid()) = 0);

create policy "Shops insertable by owner" on public.laundry_shops
  for insert with check (auth.uid() = owner_id or (select role from public.profiles where id = auth.uid()) in (0, 1));

-- Shop Services policies
create policy "Services viewable by all" on public.shop_services
  for select using (true);

create policy "Services editable by shop owner" on public.shop_services
  for all using (
    exists (
      select 1 from public.laundry_shops
      where laundry_shops.id = shop_services.shop_id and laundry_shops.owner_id = auth.uid()
    )
  );

-- Transactions policies
create policy "Transactions viewable by customer and shop owner" on public.transactions
  for select using (
    auth.uid() = customer_id or
    exists (
      select 1 from public.laundry_shops
      where laundry_shops.id = transactions.shop_id and laundry_shops.owner_id = auth.uid()
    ) or
    (select role from public.profiles where id = auth.uid()) = 0
  );

create policy "Transactions insertable by authenticated users" on public.transactions
  for insert with check (true);

create policy "Transactions updateable by shop owner" on public.transactions
  for update using (
    exists (
      select 1 from public.laundry_shops
      where laundry_shops.id = transactions.shop_id and laundry_shops.owner_id = auth.uid()
    ) or (select role from public.profiles where id = auth.uid()) = 0
  );

-- Reviews policies
create policy "Reviews viewable by all" on public.reviews
  for select using (true);

create policy "Reviews insertable by authenticated customer" on public.reviews
  for insert with check (auth.uid() = customer_id);

-- ------------------------------------------------------------------------------
-- 7. Role Switching Function
-- ------------------------------------------------------------------------------
create or replace function public.switch_user_role(target_role smallint)
returns jsonb as $$
declare
  v_uid uuid := auth.uid();
  v_res jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  if target_role not in (0, 1, 2) then
    return jsonb_build_object('success', false, 'error', 'Invalid role');
  end if;

  update public.profiles
  set role = target_role, updated_at = timezone('utc'::text, now())
  where id = v_uid;

  return jsonb_build_object('success', true, 'role', target_role);
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------------------------
-- 8. User creation trigger from auth.users
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
declare
  _full_name text;
  _date_of_birth date;
  _phone_number text;
  _gender text;
begin
  _full_name := coalesce(new.raw_user_meta_data->>'full_name', 'Customer');
  
  begin
    _date_of_birth := (new.raw_user_meta_data->>'date_of_birth')::date;
  exception when others then
    _date_of_birth := current_date;
  end;

  _phone_number := coalesce(new.raw_user_meta_data->>'phone_number', '');
  _gender := coalesce(new.raw_user_meta_data->>'gender', 'Prefer not to say');

  insert into public.profiles (
    id,
    email,
    full_name,
    date_of_birth,
    phone_number,
    gender,
    role
  )
  values (
    new.id,
    new.email,
    _full_name,
    _date_of_birth,
    _phone_number,
    _gender,
    2 -- Costumer role (0: Admin, 1: Owner, 2: Costumer)
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    date_of_birth = coalesce(excluded.date_of_birth, public.profiles.date_of_birth),
    phone_number = coalesce(excluded.phone_number, public.profiles.phone_number),
    gender = coalesce(excluded.gender, public.profiles.gender),
    updated_at = timezone('utc'::text, now());

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 9. Sample Seed Data (For Map visualization, walk-in QR, and Owner testing)
-- ------------------------------------------------------------------------------
insert into public.laundry_shops (
  id,
  name,
  description,
  address,
  latitude,
  longitude,
  phone_number,
  open_time,
  close_time,
  queue_status,
  is_open,
  rating,
  total_reviews,
  washer_count,
  dryer_count
)
values
(
  '11111111-1111-1111-1111-111111111111',
  'LabadaGo Express - Katipunan',
  'Premium express wash, dry, and fold service with eco-friendly detergent and fast turnaround.',
  '345 Katipunan Ave, Loyola Heights, Quezon City',
  14.6402,
  121.0744,
  '0917-111-2233',
  '07:00',
  '21:00',
  'Low',
  true,
  4.9,
  128,
  10,
  10
),
(
  '22222222-2222-2222-2222-222222222222',
  'FreshBubble Laundromat - BGC',
  'Self-service coin-op and drop-off full service. Free high-speed WiFi and coffee lounge while waiting.',
  '7th Ave cor 30th St, Bonifacio Global City, Taguig',
  14.5518,
  121.0503,
  '0917-444-5566',
  '06:00',
  '23:00',
  'Moderate',
  true,
  4.8,
  95,
  14,
  12
),
(
  '33333333-3333-3333-3333-333333333333',
  'LabadaGo Central Hub - Makati',
  'Commercial and household laundry with sanitization and steam pressing. Same-day delivery available.',
  '120 Dela Rosa St, Legazpi Village, Makati City',
  14.5562,
  121.0168,
  '0917-777-8899',
  '07:00',
  '20:00',
  'Busy',
  true,
  4.7,
  210,
  12,
  12
),
(
  '44444444-4444-4444-4444-444444444444',
  'CleanSpin Laundry Station - Taft',
  'Student-friendly prices, student discounts, and fast QR code walk-in drop off service.',
  '2400 Taft Ave, Malate, Manila',
  14.5678,
  120.9934,
  '0918-222-3344',
  '06:30',
  '22:00',
  'Low',
  true,
  4.9,
  142,
  8,
  8
)
on conflict (id) do nothing;

-- Sample services for the shops
insert into public.shop_services (shop_id, service_name, description, price, unit, estimated_minutes)
values
('11111111-1111-1111-1111-111111111111', 'Wash, Dry & Fold', 'Standard everyday clothes washing and crisp folding.', 35.00, 'kg', 90),
('11111111-1111-1111-1111-111111111111', 'Comforter / Bedding Wash', 'Heavy duvet and blanket sanitizing & drying.', 180.00, 'piece', 120),
('11111111-1111-1111-1111-111111111111', 'Pressing & Ironing', 'Steam press for formal shirts and uniform trousers.', 25.00, 'piece', 45),
('22222222-2222-2222-2222-222222222222', 'Full Service Premium Wash', 'Hypoallergenic detergent with fabric conditioner.', 40.00, 'kg', 90),
('22222222-2222-2222-2222-222222222222', 'Express Wash (Under 1 Hr)', 'Priority queue machine wash and rapid warm air dry.', 55.00, 'kg', 50),
('33333333-3333-3333-3333-333333333333', 'Wash & Fold Standard', 'Thorough wash and precision folded.', 38.00, 'kg', 90),
('44444444-4444-4444-4444-444444444444', 'Student Wash & Fold', 'Budget-friendly student package.', 30.00, 'kg', 90)
on conflict do nothing;

-- ==============================================================================
-- End of Database Schema
-- ==============================================================================
