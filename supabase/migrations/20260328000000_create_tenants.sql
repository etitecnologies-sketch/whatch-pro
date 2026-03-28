create table public.tenants (
  id uuid references auth.users(id) on delete cascade primary key,
  company_type text not null check (company_type in ('supermercado','borracharia','oficina','vendas','provedor','todos')),
  features text[] not null default '{}',
  name text not null,
  legal_name text,
  document text,
  ie text,
  phone text,
  email text,
  cep text,
  address text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tenants enable row level security;

create policy "Mestre can view all tenants"
  on public.tenants for select
  using ( auth.jwt() ->> 'email' = 'mestre@whatchpro.com' );

create policy "Tenant members can view their tenant"
  on public.tenants for select
  using (
    auth.uid() = id or
    (auth.jwt() -> 'user_metadata' ->> 'adminId') = id::text
  );

create policy "Mestre and tenant admin can update tenant"
  on public.tenants for update
  using (
    auth.jwt() ->> 'email' = 'mestre@whatchpro.com' or
    auth.uid() = id
  )
  with check (
    auth.jwt() ->> 'email' = 'mestre@whatchpro.com' or
    auth.uid() = id
  );

create policy "No public insert"
  on public.tenants for insert
  with check (false);
