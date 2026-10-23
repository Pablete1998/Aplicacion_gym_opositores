-- Rankings de toda la academia: la mejor marca de cada alumno activo en cada prueba desde una fecha
-- (null = desde siempre). Los alumnos no pueden leer las marcas de otros (RLS), así que la lista sale
-- de esta función. Se ve el nombre completo y, si lo tiene, el mote: Martín Duarte «el Martinico».
-- Se puede volver a ejecutar sin problema.

-- Mote del alumno: lo pone él mismo (en Rankings) o dirección (en su ficha)
alter table alumnos add column if not exists mote text check (char_length(mote) <= 30);

create or replace function nombre_ranking(a alumnos) returns text
language sql immutable as $$
  select a.nombre || ' ' || a.apellidos || coalesce(' «' || nullif(trim(a.mote), '') || '»', '')
$$;

create or replace function poner_mote(p_mote text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if mi_alumno() is null then raise exception 'Solo los alumnos pueden ponerse un mote'; end if;
  if char_length(trim(coalesce(p_mote, ''))) > 30 then raise exception 'El mote puede tener como mucho 30 letras'; end if;
  update alumnos set mote = nullif(trim(p_mote), '') where id = mi_alumno();
end $$;

-- El ranking del grupo (0004) también pasa a nombre completo y mote
create or replace function ranking_mi_grupo(p_desde date, p_antes date)
returns table (prueba_id uuid, alumno_id uuid, nombre text, marca numeric, marca_anterior numeric, soy_yo boolean)
language sql stable security definer set search_path = public as $$
  select r.prueba_id,
         a.id,
         nombre_ranking(a),
         case when p.mayor_es_mejor then max(r.marca) filter (where r.fecha >= p_desde)
              else min(r.marca) filter (where r.fecha >= p_desde) end,
         case when p.mayor_es_mejor then max(r.marca) filter (where r.fecha < p_desde)
              else min(r.marca) filter (where r.fecha < p_desde) end,
         a.id = yo.id
  from alumnos yo
  join alumnos a on a.grupo_id = yo.grupo_id and a.activo
  join resultados r on r.alumno_id = a.id and r.fecha >= p_antes
  join pruebas p on p.id = r.prueba_id and p.tipo = 'fisica'
  where yo.id = mi_alumno()
  group by r.prueba_id, a.id, p.mayor_es_mejor, yo.id
$$;

drop function if exists ranking_academia(date);
create function ranking_academia(p_desde date)
returns table (prueba_id uuid, alumno_id uuid, nombre text, oposicion text, grupo text, sexo sexo, marca numeric, fecha date, soy_yo boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_rol rol := mi_rol();
  v_yo uuid := mi_alumno();
begin
  if v_rol is null or v_rol not in ('direccion', 'preparador', 'alumno') then
    raise exception 'No tienes acceso a los rankings';
  end if;
  return query
  select distinct on (r.prueba_id, a.id)
         r.prueba_id,
         a.id,
         nombre_ranking(a),
         o.nombre,
         g.nombre,
         a.sexo,
         r.marca,
         r.fecha,
         coalesce(a.id = v_yo, false)
  from resultados r
  join alumnos a on a.id = r.alumno_id and a.activo
  join pruebas p on p.id = r.prueba_id
  join oposiciones o on o.id = p.oposicion_id
  left join grupos g on g.id = a.grupo_id
  where p_desde is null or r.fecha >= p_desde
  -- la mejor marca de cada uno y, si la repite, la primera vez que la hizo
  order by r.prueba_id, a.id, case when p.mayor_es_mejor then -r.marca else r.marca end, r.fecha;
end $$;

revoke execute on function ranking_academia(date), poner_mote(text) from public, anon;
grant execute on function ranking_academia(date), poner_mote(text) to authenticated;
