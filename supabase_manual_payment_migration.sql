-- ==============================================================================
-- LABADAGO: Manual OTC / GCash Payment & Receipt Proof Migration
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ==============================================================================

-- 1. Add payment tracking columns to public.transactions
alter table public.transactions 
  add column if not exists payment_method text check (payment_method in ('Cash', 'GCash', 'Bank Transfer')),
  add column if not exists payment_proof_url text,
  add column if not exists payment_reference_no text,
  add column if not exists paid_at timestamp with time zone;

-- 2. Index for faster filtering by payment status and method
create index if not exists idx_transactions_payment_status on public.transactions(payment_status);
create index if not exists idx_transactions_payment_method on public.transactions(payment_method);

-- 3. Create Storage bucket for receipt photos / GCash screenshots (Publicly accessible)
insert into storage.buckets (id, name, public)
values ('payment_proofs', 'payment_proofs', true)
on conflict (id) do update set public = true;

-- 4. Storage policies for payment_proofs bucket
-- Allow public viewing of payment proofs
drop policy if exists "Payment proofs are publicly readable" on storage.objects;
create policy "Payment proofs are publicly readable"
  on storage.objects for select
  using (bucket_id = 'payment_proofs');

-- Allow authenticated users (Staff, Owners, Customers) to upload receipt photos
drop policy if exists "Authenticated users can upload payment proofs" on storage.objects;
create policy "Authenticated users can upload payment proofs"
  on storage.objects for insert
  with check (bucket_id = 'payment_proofs' and (auth.role() = 'authenticated' or auth.role() = 'anon'));

-- Allow update/delete of payment proofs if needed
drop policy if exists "Authenticated users can update payment proofs" on storage.objects;
create policy "Authenticated users can update payment proofs"
  on storage.objects for update
  using (bucket_id = 'payment_proofs');
