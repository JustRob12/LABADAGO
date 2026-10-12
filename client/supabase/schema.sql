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
  role smallint not null default 2 check (role in (0, 1, 2, 3)),
  assigned_shop_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure role check constraint allows Staff (role 3) if table already existed with older constraint
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in (0, 1, 2, 3));

comment on table public.profiles is 'Stores user profile information for LabadaGo users.';
comment on column public.profiles.role is '0 = Admin, 1 = Owner, 2 = Costumer, 3 = Staff';

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

-- Ensure profiles.assigned_shop_id exists and references laundry_shops
alter table public.profiles add column if not exists assigned_shop_id uuid references public.laundry_shops(id) on delete set null;
create index if not exists idx_profiles_assigned_shop on public.profiles(assigned_shop_id);

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
  machine_number text,
  staff_id uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure machine_number, staff_id, and payment tracking columns exist if table was created previously
alter table public.transactions add column if not exists machine_number text;
alter table public.transactions add column if not exists staff_id uuid references auth.users(id) on delete set null;
alter table public.transactions add column if not exists payment_method text check (payment_method in ('Cash', 'GCash', 'Bank Transfer'));
alter table public.transactions add column if not exists payment_proof_url text;
alter table public.transactions add column if not exists payment_reference_no text;
alter table public.transactions add column if not exists paid_at timestamp with time zone;

create index if not exists idx_transactions_customer on public.transactions(customer_id);
create index if not exists idx_transactions_shop on public.transactions(shop_id);
create index if not exists idx_transactions_status on public.transactions(status);
create index if not exists idx_transactions_payment_status on public.transactions(payment_status);
create index if not exists idx_transactions_payment_method on public.transactions(payment_method);

-- ------------------------------------------------------------------------------
-- 5. Branch Staff Table (Recruited members who can scan only)
-- ------------------------------------------------------------------------------
create table if not exists public.branch_staff (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.laundry_shops(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  assigned_by uuid references auth.users(id) on delete set null,
  role_title text default 'Counter Staff',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id)
);

create index if not exists idx_branch_staff_shop on public.branch_staff(shop_id);
create index if not exists idx_branch_staff_user on public.branch_staff(user_id);

-- ------------------------------------------------------------------------------
-- 6. Reviews and Ratings
-- ------------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.laundry_shops(id) on delete cascade not null,
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  order_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.reviews add column if not exists order_id uuid;

create index if not exists idx_reviews_shop on public.reviews(shop_id);

-- ------------------------------------------------------------------------------
-- 7. Enable Row Level Security (RLS)
-- ------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.laundry_shops enable row level security;
alter table public.shop_services enable row level security;
alter table public.transactions enable row level security;
alter table public.branch_staff enable row level security;
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
  for select using (auth.uid() = id);

create policy "Profiles updateable by user" on public.profiles
  for update using (auth.uid() = id);

create policy "Profiles insertable by user" on public.profiles
  for insert with check (auth.uid() = id);

-- Laundry Shops policies (Publicly readable so map works for everyone)
create policy "Shops are publicly viewable" on public.laundry_shops
  for select using (true);

create policy "Shops editable by owner" on public.laundry_shops
  for update using (auth.uid() = owner_id);

create policy "Shops insertable by owner" on public.laundry_shops
  for insert with check (auth.uid() = owner_id);

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

-- Transactions policies (Viewable and updateable by customer, shop owner, and assigned branch staff)
create policy "Transactions viewable by customer and shop owner" on public.transactions
  for select using (
    auth.uid() = customer_id or
    exists (
      select 1 from public.laundry_shops
      where laundry_shops.id = transactions.shop_id and laundry_shops.owner_id = auth.uid()
    ) or
    exists (
      select 1 from public.branch_staff
      where branch_staff.shop_id = transactions.shop_id and branch_staff.user_id = auth.uid()
    )
  );

create policy "Transactions insertable by authenticated users" on public.transactions
  for insert with check (true);

create policy "Transactions updateable by shop owner" on public.transactions
  for update using (
    exists (
      select 1 from public.laundry_shops
      where laundry_shops.id = transactions.shop_id and laundry_shops.owner_id = auth.uid()
    ) or
    exists (
      select 1 from public.branch_staff
      where branch_staff.shop_id = transactions.shop_id and branch_staff.user_id = auth.uid()
    )
  );

-- Branch Staff policies
drop policy if exists "Branch staff viewable by shop owner, staff, or admin" on public.branch_staff;
drop policy if exists "Branch staff editable by shop owner or admin" on public.branch_staff;

create policy "Branch staff viewable by shop owner, staff, or admin" on public.branch_staff
  for select using (
    auth.uid() = user_id or
    exists (
      select 1 from public.laundry_shops
      where laundry_shops.id = branch_staff.shop_id and laundry_shops.owner_id = auth.uid()
    ) or
    exists (
      select 1 from public.profiles where id = auth.uid() and role = 0
    )
  );

create policy "Branch staff editable by shop owner or admin" on public.branch_staff
  for all using (
    exists (
      select 1 from public.laundry_shops
      where laundry_shops.id = branch_staff.shop_id and laundry_shops.owner_id = auth.uid()
    ) or
    exists (
      select 1 from public.profiles where id = auth.uid() and role = 0
    )
  );

-- Reviews policies
create policy "Reviews viewable by all" on public.reviews
  for select using (true);

create policy "Reviews insertable by authenticated customer" on public.reviews
  for insert with check (auth.uid() = customer_id or customer_id is null);

-- ------------------------------------------------------------------------------
-- 8. Role Switching Function (Staff role is locked!)
-- ------------------------------------------------------------------------------
create or replace function public.switch_user_role(target_role smallint)
returns jsonb as $$
declare
  v_uid uuid := auth.uid();
  v_current_role smallint;
  v_is_staff boolean;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  -- Check if user is staff (Staff cannot switch roles unless removed by owner!)
  select role into v_current_role from public.profiles where id = v_uid;
  select exists(select 1 from public.branch_staff where user_id = v_uid) into v_is_staff;

  if v_current_role = 3 or v_is_staff then
    return jsonb_build_object('success', false, 'error', 'Staff role is locked. Only your branch owner can remove your staff role.');
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
-- 9. Staff Management & Review Helper Functions (RPC)
-- ------------------------------------------------------------------------------

-- Search existing LabadaGo members to recruit as staff
create or replace function public.search_labadago_members(search_term text)
returns table (
  id uuid,
  full_name text,
  email text,
  phone_number text,
  role smallint,
  assigned_shop_name text
) as $$
begin
  return query
  select
    p.id,
    p.full_name,
    p.email,
    p.phone_number,
    p.role,
    s.name as assigned_shop_name
  from public.profiles p
  left join public.branch_staff bs on bs.user_id = p.id
  left join public.laundry_shops s on s.id = bs.shop_id
  where
    p.full_name ilike '%' || search_term || '%'
    or p.email ilike '%' || search_term || '%'
    or p.phone_number ilike '%' || search_term || '%'
  limit 20;
end;
$$ language plpgsql security definer;

-- Assign member as staff of a specific branch
create or replace function public.assign_branch_staff(
  target_shop_id uuid,
  target_user_id uuid,
  p_role_title text default 'Counter Staff'
)
returns jsonb as $$
declare
  v_uid uuid := auth.uid();
  v_is_owner boolean;
begin
  select exists(
    select 1 from public.laundry_shops
    where id = target_shop_id and (owner_id = v_uid or exists(select 1 from public.profiles where id = v_uid and role = 0))
  ) into v_is_owner;

  if not v_is_owner then
    return jsonb_build_object('success', false, 'error', 'Unauthorized: Only shop owner can assign staff to this branch');
  end if;

  insert into public.branch_staff (shop_id, user_id, assigned_by, role_title)
  values (target_shop_id, target_user_id, v_uid, coalesce(p_role_title, 'Counter Staff'))
  on conflict (user_id) do update
  set shop_id = excluded.shop_id,
      assigned_by = excluded.assigned_by,
      role_title = excluded.role_title,
      created_at = timezone('utc'::text, now());

  update public.profiles
  set role = 3, assigned_shop_id = target_shop_id, updated_at = timezone('utc'::text, now())
  where id = target_user_id;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer;

-- Remove staff from a branch (reverts role to Customer)
create or replace function public.remove_branch_staff(
  target_user_id uuid,
  target_shop_id uuid
)
returns jsonb as $$
declare
  v_uid uuid := auth.uid();
  v_is_owner boolean;
begin
  select exists(
    select 1 from public.laundry_shops
    where id = target_shop_id and (owner_id = v_uid or exists(select 1 from public.profiles where id = v_uid and role = 0))
  ) into v_is_owner;

  if not v_is_owner then
    return jsonb_build_object('success', false, 'error', 'Unauthorized');
  end if;

  delete from public.branch_staff
  where user_id = target_user_id and shop_id = target_shop_id;

  update public.profiles
  set role = 2, assigned_shop_id = null, updated_at = timezone('utc'::text, now())
  where id = target_user_id;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer;

-- Submit shop review and recompute rating
create or replace function public.submit_shop_review(
  p_shop_id uuid,
  p_order_id uuid,
  p_rating smallint,
  p_comment text,
  p_customer_name text default null
)
returns jsonb as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_avg numeric(2,1);
  v_count int;
begin
  if p_customer_name is not null and p_customer_name <> '' then
    v_name := p_customer_name;
  else
    select full_name into v_name from public.profiles where id = v_uid;
    v_name := coalesce(v_name, 'Valued Customer');
  end if;

  insert into public.reviews (shop_id, customer_id, customer_name, rating, comment, order_id)
  values (p_shop_id, v_uid, v_name, p_rating, p_comment, p_order_id);

  select coalesce(round(avg(rating)::numeric, 1), 5.0), count(*)
  into v_avg, v_count
  from public.reviews
  where shop_id = p_shop_id;

  update public.laundry_shops
  set rating = v_avg, total_reviews = v_count, updated_at = timezone('utc'::text, now())
  where id = p_shop_id;

  return jsonb_build_object('success', true, 'rating', v_avg, 'total_reviews', v_count);
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------------------------
-- 8. Automated Profile Sync Trigger on Signup
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    date_of_birth,
    phone_number,
    gender,
    role,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'Customer'),
    coalesce((new.raw_user_meta_data->>'date_of_birth')::date, '2000-01-01'::date),
    coalesce(new.raw_user_meta_data->>'phone_number', ''),
    coalesce(new.raw_user_meta_data->>'gender', 'Prefer not to say'),
    coalesce((new.raw_user_meta_data->>'role')::smallint, 2), -- Default 2: Costumer
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
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

-- ==============================================================================
-- 10. Storage Bucket for Payment Receipts / Proof of Transfer
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('payment_proofs', 'payment_proofs', true)
on conflict (id) do update set public = true;

drop policy if exists "Payment proofs are publicly readable" on storage.objects;
create policy "Payment proofs are publicly readable"
  on storage.objects for select
  using (bucket_id = 'payment_proofs');

drop policy if exists "Authenticated users can upload payment proofs" on storage.objects;
create policy "Authenticated users can upload payment proofs"
  on storage.objects for insert
  with check (bucket_id = 'payment_proofs' and (auth.role() = 'authenticated' or auth.role() = 'anon'));

-- ==============================================================================
-- End of Database Schema (Clean production-ready without mock seed data)
-- ==============================================================================
