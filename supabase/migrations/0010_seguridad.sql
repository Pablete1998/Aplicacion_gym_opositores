-- Refuerzo de seguridad. Se puede ejecutar más de una vez.
--
-- 1) Las funciones de ayuda de las políticas solo las pueden ejecutar usuarios autenticados.
--    Hasta ahora cualquiera (incluso sin iniciar sesión) podía llamarlas; no devolvían nada útil
--    sin usuario, pero mejor cerrar la puerta.
-- 2) Un usuario con rol «alumno» que no esté vinculado a una ficha (por ejemplo, alguien que se
--    registrara por su cuenta si el registro quedara abierto en Supabase) no ve nada: ni catálogo,
--    ni avisos, ni rankings. Los accesos se crean solo desde Personal, que siempre los vincula.

-- ---------- 1) Permisos de ejecución ----------

revoke execute on function
  mi_rol(), es_preparador_de(uuid), mi_alumno(), registrar_acceso(uuid), password_cambiada(),
  hoy_es(), lleva_grupo(uuid), es_mi_sesion_abierta(uuid), nombre_ranking(alumnos), huella_factura(facturas, text)
from public, anon;

-- Las políticas se evalúan con el rol del usuario, así que necesitan poder llamarlas
grant execute on function
  mi_rol(), es_preparador_de(uuid), mi_alumno(), registrar_acceso(uuid), password_cambiada(),
  hoy_es(), lleva_grupo(uuid), es_mi_sesion_abierta(uuid)
to authenticated;

-- ---------- 2) Solo alumnos con ficha ----------

-- Verdadero para dirección, preparadores y recepción, y para los alumnos con ficha vinculada
create or replace function con_ficha() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(mi_rol() <> 'alumno', false) or exists (select 1 from alumnos where perfil_id = auth.uid())
$$;
revoke execute on function con_ficha() from public, anon;
grant execute on function con_ficha() to authenticated;

drop policy if exists leer_catalogo on oposiciones;
drop policy if exists leer_catalogo on pruebas;
drop policy if exists leer_catalogo on baremos;
drop policy if exists leer_catalogo on grupos;
create policy leer_catalogo on oposiciones for select to authenticated using (con_ficha());
create policy leer_catalogo on pruebas for select to authenticated using (con_ficha());
create policy leer_catalogo on baremos for select to authenticated using (con_ficha());
create policy leer_catalogo on grupos for select to authenticated using (con_ficha());

drop policy if exists leer_avisos on avisos;
create policy leer_avisos on avisos for select using (
  mi_rol() in ('direccion', 'preparador')
  or (con_ficha() and (grupo_id is null or grupo_id = (select grupo_id from alumnos where id = mi_alumno()))));

-- El ranking de la academia exige ficha a los alumnos
create or replace function ranking_academia(p_desde date)
returns table (prueba_id uuid, alumno_id uuid, nombre text, oposicion text, grupo text, sexo sexo, marca numeric, fecha date, soy_yo boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_rol rol := mi_rol();
  v_yo uuid := mi_alumno();
begin
  if v_rol is null or v_rol not in ('direccion', 'preparador', 'alumno') or (v_rol = 'alumno' and v_yo is null) then
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
