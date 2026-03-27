-- Criar tabela de espelho de usuários para facilitar a listagem no sistema
create table public.app_users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text not null,
  role text not null check (role in ('admin', 'sub-user')),
  admin_id uuid references public.app_users(id) on delete cascade,
  permissions text[] default '{}',
  avatar text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ativar RLS
alter table public.app_users enable row level security;

-- Políticas de Acesso
-- 1. Mestre vê tudo
create policy "Mestre can view all users"
  on public.app_users for select
  using ( auth.jwt() ->> 'email' = 'mestre@whatchpro.com' );

-- 2. Admin vê a si mesmo e usuários da sua cadeia (tenant)
create policy "Admins can view their tenant users"
  on public.app_users for select
  using (
    auth.uid() = id or 
    auth.uid() = admin_id or
    admin_id in (select id from public.app_users where admin_id = auth.uid())
  );

-- 3. Sub-usuário vê apenas a si mesmo e seu admin
create policy "Sub-users can view themselves"
  on public.app_users for select
  using ( auth.uid() = id or id = admin_id );

-- 4. Inserção: Autenticados podem inserir (a trigger de Auth cuida disso)
create policy "Authenticated users can insert"
  on public.app_users for insert
  with check ( auth.role() = 'authenticated' or auth.role() = 'anon' );

-- 5. Atualização: Mestre e Admins do tenant
create policy "Mestre and Admins can update"
  on public.app_users for update
  using (
    auth.jwt() ->> 'email' = 'mestre@whatchpro.com' or
    auth.uid() = id or
    auth.uid() = admin_id or
    admin_id in (select id from public.app_users where admin_id = auth.uid())
  );

-- 6. Deleção
create policy "Mestre and Admins can delete"
  on public.app_users for delete
  using (
    auth.jwt() ->> 'email' = 'mestre@whatchpro.com' or
    auth.uid() = admin_id or
    admin_id in (select id from public.app_users where admin_id = auth.uid())
  );
