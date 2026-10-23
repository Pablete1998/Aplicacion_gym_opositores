-- Rankings de toda la academia: la mejor marca de cada alumno activo en cada prueba desde una fecha
-- (null = desde siempre). Los alumnos no pueden leer las marcas de otros (RLS), así que la lista sale
-- de esta función, que a ellos les da solo el nombre con la inicial del apellido.
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
         case when v_rol = 'alumno' then a.nombre || ' ' || left(a.apellidos, 1) || '.' else a.nombre || ' ' || a.apellidos end,
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

revoke execute on function ranking_academia(date) from public, anon;
grant execute on function ranking_academia(date) to authenticated;
