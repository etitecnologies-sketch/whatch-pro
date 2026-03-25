-- Tabela para armazenar as chaves de cada cliente
create table if not exists public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  -- Asaas
  asaas_token text,
  asaas_env text default 'production',
  -- NuvemFiscal
  nuvemfiscal_token text,
  nuvemfiscal_env text default 'sandbox',
  -- SEFAZ
  sefaz_certificate_pfx text, -- Base64 do certificado
  sefaz_certificate_password text,
  sefaz_cnpj text,
  sefaz_uf text,
  
  updated_at timestamp with time zone default now()
);

-- Habilitar RLS
alter table public.user_integrations enable row level security;

-- Criar política de segurança
create policy "Users can manage their own integrations"
  on public.user_integrations for all
  using (auth.uid() = user_id);

-- Dar permissão para o service_role (usado pela Edge Function)
grant all on table public.user_integrations to service_role;
