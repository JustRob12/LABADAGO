-- ==============================================================================
-- LabadaGo Migration: Shop Messages & Messenger System
-- Enables direct customer-to-shop messaging, quick inquiries, and replies
-- from Laundry Shop Owners and Branch Staff.
-- ==============================================================================

create table if not exists public.shop_messages (
  id uuid not null default gen_random_uuid(),
  shop_id uuid not null references public.laundry_shops(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null,
  customer_phone text null,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  sender_role text not null check (sender_role in ('customer', 'owner', 'staff')),
  message text not null,
  is_read boolean not null default false,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint shop_messages_pkey primary key (id)
);

create index if not exists idx_shop_messages_shop on public.shop_messages using btree (shop_id);
create index if not exists idx_shop_messages_customer on public.shop_messages using btree (customer_id);
create index if not exists idx_shop_messages_sender on public.shop_messages using btree (sender_id);
create index if not exists idx_shop_messages_created_at on public.shop_messages using btree (created_at asc);

-- Enable Row Level Security (RLS)
alter table public.shop_messages enable row level security;

-- Policies: Allow reading, inserting, and updating read receipts
drop policy if exists "Allow all select shop_messages" on public.shop_messages;
create policy "Allow all select shop_messages" on public.shop_messages
  for select using (true);

drop policy if exists "Allow all insert shop_messages" on public.shop_messages;
create policy "Allow all insert shop_messages" on public.shop_messages
  for insert with check (true);

drop policy if exists "Allow all update shop_messages" on public.shop_messages;
create policy "Allow all update shop_messages" on public.shop_messages
  for update using (true);
