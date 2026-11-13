-- ==============================================================================
-- LabadaGO Partner Applications Migration
-- Allows customers to submit shop details to "Partner with this website"
-- Admin reviews and approves applications to upgrade customers to Laundry Shop Owners.
-- ==============================================================================

create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references auth.users(id) on delete cascade not null,
  applicant_name text not null,
  applicant_email text not null,
  applicant_phone text not null,
  shop_name text not null,
  shop_description text,
  shop_address text not null,
  latitude double precision not null,
  longitude double precision not null,
  phone_number text not null,
  open_time text default '07:00',
  close_time text default '20:00',
  washer_count int default 6,
  dryer_count int default 6,
  max_kilo_per_load numeric(6,2) default 8.0,
  images text[] default '{}',
  services jsonb default '[]'::jsonb,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  reviewed_at timestamp with time zone,
  reviewed_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_partner_apps_applicant on public.partner_applications(applicant_id);
create index if not exists idx_partner_apps_status on public.partner_applications(status);

comment on table public.partner_applications is 'Stores customer partnership applications to register their laundry shops.';
