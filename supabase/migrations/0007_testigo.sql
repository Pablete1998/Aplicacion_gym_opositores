-- Marcas de sesión con testigo: si un ejercicio del plan es una prueba oficial, el preparador que
-- lo ha visto puede validar la marca que apuntó el alumno y pasa a resultados (baremo, ranking, informes).

alter table plan_ejercicios add column prueba_id uuid references pruebas on delete set null;
alter table sesion_marcas add column resultado_id uuid references resultados on delete set null;
alter table sesion_marcas add column validada_por uuid references perfiles on delete set null;

-- Una marca validada ya no la puede cambiar ni quitar el alumno
drop policy alumno_corregir on sesion_marcas;
drop policy alumno_quitar on sesion_marcas;
create policy alumno_corregir on sesion_marcas for update
  using (es_mi_sesion_abierta(sesion_id) and resultado_id is null)
  with check (es_mi_sesion_abierta(sesion_id) and resultado_id is null);
create policy alumno_quitar on sesion_marcas for delete using (es_mi_sesion_abierta(sesion_id) and resultado_id is null);

-- El testigo valida: dirección o el preparador del alumno
create function validar_marca(p_marca uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  m sesion_marcas;
  v_alumno uuid;
  v_fecha date;
  v_prueba uuid;
  v_resultado uuid;
begin
  select * into m from sesion_marcas where id = p_marca;
  if not found then raise exception 'Marca no encontrada'; end if;
  select s.alumno_id, p.fecha, e.prueba_id into v_alumno, v_fecha, v_prueba
  from sesiones s join planes p on p.id = s.plan_id join plan_ejercicios e on e.id = m.ejercicio_id
  where s.id = m.sesion_id;
  if not (mi_rol() = 'direccion' or (mi_rol() = 'preparador' and es_preparador_de(v_alumno))) then
    raise exception 'Solo su preparador o dirección pueden validar esta marca';
  end if;
  if v_prueba is null then raise exception 'Este ejercicio no es una prueba oficial'; end if;
  if m.valor is null then raise exception 'No hay marca que validar'; end if;
  if m.resultado_id is not null then return m.resultado_id; end if;
  insert into resultados (alumno_id, prueba_id, fecha, marca, registrado_por)
  values (v_alumno, v_prueba, v_fecha, m.valor, auth.uid())
  returning id into v_resultado;
  update sesion_marcas set resultado_id = v_resultado, validada_por = auth.uid() where id = p_marca;
  return v_resultado;
end $$;

-- Deshace la validación: borra la marca oficial y la de sesión vuelve a ser solo de diario
create function anular_validacion(p_marca uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  m sesion_marcas;
  v_alumno uuid;
begin
  select * into m from sesion_marcas where id = p_marca;
  if not found then raise exception 'Marca no encontrada'; end if;
  select alumno_id into v_alumno from sesiones where id = m.sesion_id;
  if not (mi_rol() = 'direccion' or (mi_rol() = 'preparador' and es_preparador_de(v_alumno))) then
    raise exception 'Solo su preparador o dirección pueden anular esta validación';
  end if;
  update sesion_marcas set resultado_id = null, validada_por = null where id = p_marca;
  delete from resultados where id = m.resultado_id;
end $$;

revoke execute on function validar_marca(uuid), anular_validacion(uuid) from public, anon;
grant execute on function validar_marca(uuid), anular_validacion(uuid) to authenticated;
