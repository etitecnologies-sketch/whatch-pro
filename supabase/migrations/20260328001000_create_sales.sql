create table if not exists public.sales (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  admin_id uuid not null references public.app_users(id) on delete cascade,
  client_id uuid,
  client_name text not null,
  payment_method text not null check (payment_method in ('pix', 'credit', 'debit', 'money')),
  cash_received numeric,
  change_amount numeric,
  total numeric not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.sales enable row level security;

create policy "Mestre can view all sales"
  on public.sales for select
  using ( auth.jwt() ->> 'email' = 'mestre@whatchpro.com' );

create policy "Tenant users can view sales"
  on public.sales for select
  using (
    auth.role() = 'authenticated' and
    admin_id = coalesce((select admin_id from public.app_users where id = auth.uid()), auth.uid())
  );

create policy "Tenant users can insert sales"
  on public.sales for insert
  with check (
    auth.role() = 'authenticated' and
    admin_id = coalesce((select admin_id from public.app_users where id = auth.uid()), auth.uid())
  );

create policy "Tenant users can update sales"
  on public.sales for update
  using (
    auth.role() = 'authenticated' and
    admin_id = coalesce((select admin_id from public.app_users where id = auth.uid()), auth.uid())
  );

create policy "Tenant users can delete sales"
  on public.sales for delete
  using (
    auth.role() = 'authenticated' and
    admin_id = coalesce((select admin_id from public.app_users where id = auth.uid()), auth.uid())
  );
