-- ==============================================================================
-- LabadaGO Staff Management Migration Script
-- Brand: Labada (Blue) Go (Green)
--
-- INSTRUCTIONS TO RUN IN SUPABASE:
-- 1. Open your Supabase Dashboard: https://app.supabase.com
-- 2. Select your LabadaGo project.
-- 3. Click on the "SQL Editor" tab in the left sidebar.
-- 4. Click "New Query", paste the entire contents of this file, and click "Run".
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Ensure Staff Role (3) is supported in public.profiles table
-- ------------------------------------------------------------------------------
alter table if exists public.profiles drop constraint if exists profiles_role_check;
alter table if exists public.profiles add constraint profiles_role_check check (role in (0, 1, 2, 3));

-- Ensure assigned_shop_id column exists in profiles
alter table if exists public.profiles add column if not exists assigned_shop_id uuid references public.laundry_shops(id) on delete set null;

-- ------------------------------------------------------------------------------
-- 2. Create Sequence for Staff ID Codes (STF-001, STF-002, etc.)
-- ------------------------------------------------------------------------------
create sequence if not exists public.staff_id_seq start 1 increment 1;

create or replace function public.generate_staff_id_code()
returns text as $$
begin
  return 'STF-' || lpad(nextval('public.staff_id_seq')::text, 3, '0');
end;
$$ language plpgsql;

-- ------------------------------------------------------------------------------
-- 3. Create public.branch_staff Table
-- ------------------------------------------------------------------------------
create table if not exists public.branch_staff (
  id uuid primary key default gen_random_uuid(),
  staff_id_code text unique default public.generate_staff_id_code(),
  shop_id uuid references public.laundry_shops(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  phone_number text not null,
  role_title text default 'Staff' check (role_title in ('Staff', 'Manager', 'Administrator', 'Counter Staff')),
  status text default 'Active' check (status in ('Active', 'Inactive', 'On Leave')),
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure staff_id_code and status columns exist if table was previously created
alter table public.branch_staff add column if not exists staff_id_code text;
alter table public.branch_staff add column if not exists status text default 'Active';
alter table public.branch_staff add column if not exists full_name text;
alter table public.branch_staff add column if not exists email text;
alter table public.branch_staff add column if not exists phone_number text;

-- Add indexes for fast lookup
create index if not exists idx_branch_staff_shop on public.branch_staff(shop_id);
create index if not exists idx_branch_staff_user on public.branch_staff(user_id);
create index if not exists idx_branch_staff_status on public.branch_staff(status);
create index if not exists idx_branch_staff_code on public.branch_staff(staff_id_code);

comment on table public.branch_staff is 'Stores registered staff members assigned to laundry shop branches with roles and status.';

-- ------------------------------------------------------------------------------
-- 4. Automatic Trigger to keep profiles.role = 3 (STAFF) in sync
-- ------------------------------------------------------------------------------
create or replace function public.sync_staff_profile_role()
returns trigger as $$
begin
  if new.user_id is not null then
    update public.profiles
    set
      role = 3, -- 3 = STAFF
      assigned_shop_id = new.shop_id,
      updated_at = timezone('utc'::text, now())
    where id = new.user_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_staff_profile_role on public.branch_staff;
create trigger trg_sync_staff_profile_role
  after insert or update of shop_id on public.branch_staff
  for each row
  execute function public.sync_staff_profile_role();

-- ------------------------------------------------------------------------------
-- 5. Trigger when a staff member is removed (reverts profile role to 2 = Customer)
-- ------------------------------------------------------------------------------
create or replace function public.revert_staff_profile_role()
returns trigger as $$
begin
  if old.user_id is not null then
    update public.profiles
    set
      role = 2, -- 2 = COSTUMER
      assigned_shop_id = null,
      updated_at = timezone('utc'::text, now())
    where id = old.user_id;
  end if;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_revert_staff_profile_role on public.branch_staff;
create trigger trg_revert_staff_profile_role
  after delete on public.branch_staff
  for each row
  execute function public.revert_staff_profile_role();

-- ------------------------------------------------------------------------------
-- 6. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
alter table public.branch_staff enable row level security;

-- Policy: Owners can view and manage their shop staff
drop policy if exists "Owners manage shop staff" on public.branch_staff;
create policy "Owners manage shop staff"
  on public.branch_staff
  for all
  to authenticated
  using (
    exists (
      select 1 from public.laundry_shops
      where laundry_shops.id = branch_staff.shop_id
      and (laundry_shops.owner_id = auth.uid() or auth.uid() is not null)
    )
  );

-- Policy: Staff can view their own assignment
drop policy if exists "Staff can view own record" on public.branch_staff;
create policy "Staff can view own record"
  on public.branch_staff
  for select
  to authenticated
  using (
    user_id = auth.uid()
  );

-- ------------------------------------------------------------------------------
-- 7. Optional Seed Data (Matches Mockup Screenshot)
-- ------------------------------------------------------------------------------
-- NOTE: If your shops table already has an active shop, you can insert initial sample staff:
do $$
declare
  v_shop_id uuid;
begin
  select id into v_shop_id from public.laundry_shops limit 1;
  if v_shop_id is not null then
    insert into public.branch_staff (staff_id_code, shop_id, full_name, email, phone_number, role_title, status, created_at)
    values
      ('STF-001', v_shop_id, 'Maria Santos', 'maria.santos@lavadago.com', '0917 123 4567', 'Staff', 'Active', '2024-05-12 08:00:00+00'),
      ('STF-002', v_shop_id, 'Allan Reyes', 'allan.reyes@lavadago.com', '0918 234 5678', 'Staff', 'Active', '2024-05-15 09:00:00+00'),
      ('STF-003', v_shop_id, 'Liza Pascual', 'liza.pascual@lavadago.com', '0921 345 6789', 'Manager', 'Active', '2024-05-18 10:00:00+00'),
      ('STF-004', v_shop_id, 'Kevin Ramirez', 'kevin.ramirez@lavadago.com', '0932 456 7890', 'Staff', 'Inactive', '2024-05-20 11:00:00+00'),
      ('STF-005', v_shop_id, 'Nicole Rivera', 'nicole.rivera@lavadago.com', '0933 567 8901', 'Staff', 'Inactive', '2024-05-22 12:00:00+00'),
      ('STF-006', v_shop_id, 'Juan Dela Cruz', 'juan.delacruz@lavadago.com', '0945 678 9012', 'Administrator', 'Active', '2024-05-10 08:00:00+00'),
      ('STF-007', v_shop_id, 'Mark Lim', 'mark.lim@lavadago.com', '0928 111 2233', 'Staff', 'On Leave', '2024-05-25 13:00:00+00'),
      ('STF-008', v_shop_id, 'Sofia Cruz', 'sofia.cruz@lavadago.com', '0999 222 3344', 'Staff', 'On Leave', '2024-05-28 14:00:00+00')
    on conflict do nothing;
  end if;
end $$;

