create table if not exists public.agreserge_schedule_campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titulo text not null,
  descripcion text,
  entidad_id text not null references public.agreserge_entities(id) on delete restrict,
  ubicacion text,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agreserge_schedule_slots (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.agreserge_schedule_campaigns(id) on delete cascade,
  fecha date not null,
  hora time not null,
  capacidad integer not null default 8 check (capacidad between 1 and 100),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (campaign_id, fecha, hora)
);

create table if not exists public.agreserge_schedule_bookings (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.agreserge_schedule_campaigns(id) on delete cascade,
  slot_id uuid not null references public.agreserge_schedule_slots(id) on delete restrict,
  user_id text not null references public.agreserge_users(id) on delete restrict,
  documento text not null,
  nombre_completo text not null,
  area text,
  estado text not null default 'CONFIRMADA' check (estado in ('CONFIRMADA', 'CANCELADA', 'ASISTIÓ', 'NO ASISTIÓ')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists agreserge_schedule_one_active_booking_idx
  on public.agreserge_schedule_bookings (campaign_id, user_id)
  where estado <> 'CANCELADA';
create index if not exists agreserge_schedule_bookings_slot_idx
  on public.agreserge_schedule_bookings (slot_id, estado);

alter table public.agreserge_schedule_campaigns enable row level security;
alter table public.agreserge_schedule_slots enable row level security;
alter table public.agreserge_schedule_bookings enable row level security;

revoke all on public.agreserge_schedule_campaigns from anon, authenticated;
revoke all on public.agreserge_schedule_slots from anon, authenticated;
revoke all on public.agreserge_schedule_bookings from anon, authenticated;
grant select, insert, update, delete on public.agreserge_schedule_campaigns to service_role;
grant select, insert, update, delete on public.agreserge_schedule_slots to service_role;
grant select, insert, update, delete on public.agreserge_schedule_bookings to service_role;

create or replace function public.agreserge_book_psychotechnical_slot(
  p_slot_id uuid,
  p_documento text
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_documento text := regexp_replace(coalesce(p_documento, ''), '[^0-9]', '', 'g');
  v_slot public.agreserge_schedule_slots%rowtype;
  v_campaign public.agreserge_schedule_campaigns%rowtype;
  v_user public.agreserge_users%rowtype;
  v_area text;
  v_count integer;
  v_booking public.agreserge_schedule_bookings%rowtype;
begin
  if length(v_documento) < 5 then
    raise exception 'DOCUMENTO_INVALIDO';
  end if;

  select u.* into v_user
  from public.agreserge_profiles p
  join public.agreserge_users u on u.id = p.user_id
  where regexp_replace(p.documento, '[^0-9]', '', 'g') = v_documento
    and u.entidad_id = 'hgc'
    and u.activo = true
  limit 1;

  if not found then
    raise exception 'AFILIADO_NO_ENCONTRADO';
  end if;

  select s.* into v_slot
  from public.agreserge_schedule_slots s
  where s.id = p_slot_id and s.activo = true
  for update;

  if not found then
    raise exception 'HORARIO_NO_DISPONIBLE';
  end if;

  select c.* into v_campaign
  from public.agreserge_schedule_campaigns c
  where c.id = v_slot.campaign_id and c.activa = true and c.entidad_id = 'hgc';

  if not found then
    raise exception 'AGENDA_NO_DISPONIBLE';
  end if;

  if exists (
    select 1 from public.agreserge_schedule_bookings b
    where b.campaign_id = v_campaign.id and b.user_id = v_user.id and b.estado <> 'CANCELADA'
  ) then
    raise exception 'YA_TIENE_RESERVA';
  end if;

  select count(*) into v_count
  from public.agreserge_schedule_bookings b
  where b.slot_id = v_slot.id and b.estado <> 'CANCELADA';

  if v_count >= v_slot.capacidad then
    raise exception 'CUPO_AGOTADO';
  end if;

  select a.nombre into v_area
  from public.agreserge_areas a
  where a.id = v_user.area_id;

  insert into public.agreserge_schedule_bookings (
    campaign_id, slot_id, user_id, documento, nombre_completo, area
  ) values (
    v_campaign.id,
    v_slot.id,
    v_user.id,
    v_documento,
    upper(regexp_replace(trim(v_user.nombre), '\s+', ' ', 'g')),
    upper(coalesce(v_area, v_user.cargo, 'SIN ÁREA REGISTRADA'))
  ) returning * into v_booking;

  return jsonb_build_object(
    'id', v_booking.id,
    'nombre', v_booking.nombre_completo,
    'documento', v_booking.documento,
    'area', v_booking.area,
    'fecha', v_slot.fecha,
    'hora', to_char(v_slot.hora, 'HH24:MI')
  );
end;
$$;

revoke all on function public.agreserge_book_psychotechnical_slot(uuid, text) from public, anon, authenticated;
grant execute on function public.agreserge_book_psychotechnical_slot(uuid, text) to service_role;

insert into public.agreserge_schedule_campaigns (
  id, slug, titulo, descripcion, entidad_id, ubicacion, activa
) values (
  'a6100000-0000-4000-8000-000000000001',
  'pruebas-psicotecnicas-hgc-agosto-2026',
  'Pruebas psicotécnicas',
  'Agenda institucional para afiliados partícipes del Hospital Gonzalo Contreras E.S.E.',
  'hgc',
  'Hospital Gonzalo Contreras E.S.E.',
  true
) on conflict (slug) do update set
  titulo = excluded.titulo,
  descripcion = excluded.descripcion,
  entidad_id = excluded.entidad_id,
  ubicacion = excluded.ubicacion,
  activa = true,
  updated_at = now();

insert into public.agreserge_schedule_slots (campaign_id, fecha, hora, capacidad)
select
  'a6100000-0000-4000-8000-000000000001'::uuid,
  day_value::date,
  time_value::time,
  8
from unnest(array['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13']) as days(day_value)
cross join unnest(array['09:30', '10:30', '11:30']) as times(time_value)
on conflict (campaign_id, fecha, hora) do update set capacidad = 8, activo = true;
