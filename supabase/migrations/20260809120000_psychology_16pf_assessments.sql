create table if not exists public.agreserge_psychology_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.agreserge_users(id) on delete cascade,
  documento text not null,
  nombre_completo text not null,
  entidad_id text references public.agreserge_entities(id) on delete set null,
  entidad_nombre text,
  area_id text references public.agreserge_areas(id) on delete set null,
  area_nombre text,
  instrument_version text not null default 'Cuestionario descriptivo 163 reactivos v1',
  status text not null default 'EN_PROGRESO' check (status in ('EN_PROGRESO','COMPLETADO','REVISADO')),
  responses jsonb not null default '[]'::jsonb,
  response_summary jsonb not null default '{}'::jsonb,
  professional_observations text,
  professional_conclusion text,
  reviewed_by text references public.agreserge_users(id) on delete set null,
  reviewed_at timestamptz,
  consent_at timestamptz,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, instrument_version)
);

create index if not exists agreserge_psychology_status_idx
  on public.agreserge_psychology_assessments (status, completed_at desc);
create index if not exists agreserge_psychology_entity_area_idx
  on public.agreserge_psychology_assessments (entidad_id, area_id);
create index if not exists agreserge_psychology_document_idx
  on public.agreserge_psychology_assessments (documento);

alter table public.agreserge_psychology_assessments enable row level security;
revoke all on public.agreserge_psychology_assessments from public, anon, authenticated;
grant select, insert, update, delete on public.agreserge_psychology_assessments to service_role;

comment on table public.agreserge_psychology_assessments is
  'Respuestas sensibles del cuestionario descriptivo de personalidad. Acceso exclusivo mediante rutas de servidor autorizadas.';
