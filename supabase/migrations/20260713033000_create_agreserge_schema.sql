create table if not exists public.agreserge_users (
  id text primary key, nombre text not null, correo text not null unique,
  clave_hash text, rol text not null, tipo text, entidad_id text, area_id text,
  lider_id text, activo boolean not null default true, cargo text, telefono text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.agreserge_entities (
  id text primary key, nombre text not null, nit text, ciudad text, direccion text,
  contrato_path text, fecha_contrato date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.agreserge_areas (
  id text primary key, nombre text not null,
  entidad_id text not null references public.agreserge_entities(id) on delete cascade,
  tipo text not null, lider_id text references public.agreserge_users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.agreserge_documents (
  id text primary key,
  agremiado_id text not null references public.agreserge_users(id) on delete cascade,
  nombre text not null, categoria text, estado text not null default 'Pendiente',
  observacion text, vencimiento date, archivo_path text, archivo_nombre text,
  archivo_tipo text, archivo_tamano bigint, fecha_carga date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.agreserge_permissions (
  rol text primary key, modulos text[] not null default '{}', updated_at timestamptz not null default now()
);

create table if not exists public.agreserge_assignments (
  id text primary key, anexo integer not null, titulo text not null, tipo text not null,
  responsable_id text not null references public.agreserge_users(id) on delete restrict,
  coordinador_id text references public.agreserge_users(id) on delete set null,
  mes text not null, anio text not null, plantilla_google text, hoja_google text,
  copia_google text, fecha_limite date, fecha_carga date, archivo_path text,
  estado text not null default 'Asignado', observacion text,
  notificar_estadistica boolean not null default false,
  es_base boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.agreserge_procedures (
  id text primary key,
  agremiado_id text not null references public.agreserge_users(id) on delete cascade,
  tipo text not null, periodo text, estado text not null default 'Solicitado',
  fuente_google text, archivo_path text, generado date, observacion text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.agreserge_audit (
  id bigserial primary key,
  usuario_id text references public.agreserge_users(id) on delete set null,
  evento text not null, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('agreserge-files', 'agreserge-files', false)
on conflict (id) do nothing;

alter table public.agreserge_users enable row level security;
alter table public.agreserge_entities enable row level security;
alter table public.agreserge_areas enable row level security;
alter table public.agreserge_documents enable row level security;
alter table public.agreserge_permissions enable row level security;
alter table public.agreserge_assignments enable row level security;
alter table public.agreserge_procedures enable row level security;
alter table public.agreserge_audit enable row level security;
