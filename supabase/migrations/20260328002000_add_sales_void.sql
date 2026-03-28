alter table public.sales
  add column if not exists status text not null default 'completed' check (status in ('completed', 'voided'));

alter table public.sales
  add column if not exists voided_at timestamp with time zone;

alter table public.sales
  add column if not exists void_reason text;
