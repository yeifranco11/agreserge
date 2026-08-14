-- Una persona solo puede tener una reserva en toda la campaña. Para cambiarla,
-- la coordinación debe eliminar primero la reserva desde el panel interno.
drop index if exists public.agreserge_schedule_one_active_booking_idx;
create unique index if not exists agreserge_schedule_one_booking_idx
  on public.agreserge_schedule_bookings (campaign_id, user_id);

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
  if length(v_documento) < 5 then raise exception 'DOCUMENTO_INVALIDO'; end if;

  select u.* into v_user
  from public.agreserge_profiles p
  join public.agreserge_users u on u.id = p.user_id
  where regexp_replace(p.documento, '[^0-9]', '', 'g') = v_documento
    and u.entidad_id = 'hgc' and u.activo = true
  limit 1;
  if not found then raise exception 'AFILIADO_NO_ENCONTRADO'; end if;

  select s.* into v_slot from public.agreserge_schedule_slots s
  where s.id = p_slot_id and s.activo = true for update;
  if not found then raise exception 'HORARIO_NO_DISPONIBLE'; end if;

  select c.* into v_campaign from public.agreserge_schedule_campaigns c
  where c.id = v_slot.campaign_id and c.activa = true and c.entidad_id = 'hgc';
  if not found then raise exception 'AGENDA_NO_DISPONIBLE'; end if;

  if exists (
    select 1 from public.agreserge_schedule_bookings b
    where b.campaign_id = v_campaign.id and b.user_id = v_user.id
  ) then raise exception 'YA_TIENE_RESERVA'; end if;

  select count(*) into v_count from public.agreserge_schedule_bookings b
  where b.slot_id = v_slot.id and b.estado <> 'CANCELADA';
  if v_count >= v_slot.capacidad then raise exception 'CUPO_AGOTADO'; end if;

  select a.nombre into v_area from public.agreserge_areas a where a.id = v_user.area_id;
  insert into public.agreserge_schedule_bookings (
    campaign_id, slot_id, user_id, documento, nombre_completo, area
  ) values (
    v_campaign.id, v_slot.id, v_user.id, v_documento,
    upper(regexp_replace(trim(v_user.nombre), '\s+', ' ', 'g')),
    upper(coalesce(v_area, v_user.cargo, 'SIN ÁREA REGISTRADA'))
  ) returning * into v_booking;

  return jsonb_build_object(
    'id', v_booking.id, 'nombre', v_booking.nombre_completo,
    'documento', v_booking.documento, 'area', v_booking.area,
    'fecha', v_slot.fecha, 'hora', to_char(v_slot.hora, 'HH24:MI')
  );
end;
$$;

revoke all on function public.agreserge_book_psychotechnical_slot(uuid, text) from public, anon, authenticated;
grant execute on function public.agreserge_book_psychotechnical_slot(uuid, text) to service_role;

insert into public.agreserge_schedule_slots (campaign_id, fecha, hora, capacidad)
select
  'a6100000-0000-4000-8000-000000000001'::uuid,
  day_value::date,
  time_value::time,
  8
from unnest(array['2026-08-18', '2026-08-19', '2026-08-20']) as days(day_value)
cross join unnest(array['09:30', '10:30', '11:30']) as times(time_value)
on conflict (campaign_id, fecha, hora) do update set capacidad = 8, activo = true;
