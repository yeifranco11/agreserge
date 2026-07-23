alter table public.agreserge_users add column if not exists usuario text;
create unique index if not exists agreserge_users_usuario_unique
  on public.agreserge_users (lower(usuario)) where usuario is not null;

create table if not exists public.agreserge_report_periods (
  id uuid primary key default gen_random_uuid(),
  entidad_id text not null references public.agreserge_entities(id) on delete cascade,
  mes text not null,
  anio integer not null,
  fecha_limite date,
  estado text not null default 'Abierto' check (estado in ('Abierto','En revisión','Cerrado')),
  coordinador_id text references public.agreserge_users(id) on delete set null,
  drive_folder_id text,
  drive_folder_url text,
  consolidated_doc_id text,
  consolidated_doc_url text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entidad_id, mes, anio)
);

create table if not exists public.agreserge_report_obligations (
  id uuid primary key default gen_random_uuid(),
  entidad_id text not null references public.agreserge_entities(id) on delete cascade,
  numero integer not null,
  titulo text not null,
  orden integer not null,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entidad_id, numero)
);

create table if not exists public.agreserge_report_annexes (
  id uuid primary key default gen_random_uuid(),
  obligation_id uuid not null references public.agreserge_report_obligations(id) on delete cascade,
  numero integer,
  titulo text not null,
  orden integer not null,
  responsable_id text references public.agreserge_users(id) on delete set null,
  coordinador_id text references public.agreserge_users(id) on delete set null,
  template_drive_url text,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agreserge_report_submissions (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.agreserge_report_periods(id) on delete cascade,
  obligation_id uuid not null references public.agreserge_report_obligations(id) on delete cascade,
  annex_id uuid references public.agreserge_report_annexes(id) on delete cascade,
  parent_id uuid references public.agreserge_report_submissions(id) on delete cascade,
  responsable_id text references public.agreserge_users(id) on delete set null,
  delegado_por_id text references public.agreserge_users(id) on delete set null,
  titulo text not null,
  orden integer not null,
  estado text not null default 'Asignado',
  drive_folder_id text,
  drive_folder_url text,
  drive_file_id text,
  drive_file_url text,
  archivo_path text,
  archivo_nombre text,
  archivo_tipo text,
  observacion text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agreserge_report_submissions_period_idx on public.agreserge_report_submissions(period_id);
create index if not exists agreserge_report_submissions_responsable_idx on public.agreserge_report_submissions(responsable_id);
alter table public.agreserge_report_periods enable row level security;
alter table public.agreserge_report_obligations enable row level security;
alter table public.agreserge_report_annexes enable row level security;
alter table public.agreserge_report_submissions enable row level security;
