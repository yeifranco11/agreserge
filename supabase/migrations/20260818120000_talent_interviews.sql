create table if not exists public.agreserge_talent_interviews (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null unique references public.agreserge_psychology_assessments(id) on delete cascade,
  affiliate_user_id text not null references public.agreserge_users(id) on delete cascade,
  interviewer_user_id text references public.agreserge_users(id) on delete set null,
  responses jsonb not null default '{}'::jsonb,
  automatic_analysis text,
  hr_conclusion text,
  status text not null default 'BORRADOR' check (status in ('BORRADOR','FINALIZADA')),
  interview_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agreserge_talent_interviews_affiliate_idx
  on public.agreserge_talent_interviews (affiliate_user_id, updated_at desc);
create index if not exists agreserge_talent_interviews_status_idx
  on public.agreserge_talent_interviews (status, updated_at desc);

alter table public.agreserge_talent_interviews enable row level security;
revoke all on public.agreserge_talent_interviews from public, anon, authenticated;
grant select, insert, update, delete on public.agreserge_talent_interviews to service_role;

comment on table public.agreserge_talent_interviews is
  'Entrevistas laborales posteriores al cuestionario psicológico. Acceso exclusivo de Talento Humano mediante rutas de servidor autorizadas.';
