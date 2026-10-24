-- Fase 2: los alumnos hacen tests con las preguntas del banco (0011).
-- Tres modos: práctica (corrige al momento), simulacro (con tiempo, nota al final, los fallos restan)
-- y repaso de fallos (las preguntas cuya última respuesta fue mala).
-- El alumno nunca lee las tablas directamente: todo pasa por funciones que no enseñan la respuesta
-- correcta de un simulacro hasta que lo termina. Se puede volver a ejecutar sin problema.

create table if not exists intentos (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references alumnos on delete cascade,
  oposicion_id uuid not null references oposiciones on delete cascade,
  tipo text not null check (tipo in ('practica', 'simulacro', 'fallos')),
  tema_id uuid references temas on delete set null,
  limite_segundos int check (limite_segundos > 0),
  empezado_en timestamptz not null default now(),
  terminado_en timestamptz,
  total int not null default 0,
  aciertos int,
  fallos int,
  blancos int,
  nota numeric(4, 2)
);
create index if not exists intentos_alumno on intentos (alumno_id, empezado_en desc);

create table if not exists respuestas (
  intento_id uuid not null references intentos on delete cascade,
  pregunta_id uuid not null references preguntas on delete cascade,
  orden int not null,
  elegida smallint,
  acertada boolean,
  respondido_en timestamptz,
  primary key (intento_id, pregunta_id)
);
create index if not exists respuestas_pregunta on respuestas (pregunta_id);

alter table intentos enable row level security;
alter table respuestas enable row level security;

drop policy if exists direccion_todo on intentos;
drop policy if exists preparador_ver on intentos;
drop policy if exists alumno_ver on intentos;
drop policy if exists direccion_ver on respuestas;
drop policy if exists preparador_ver on respuestas;
create policy direccion_todo on intentos for all using (mi_rol() = 'direccion') with check (mi_rol() = 'direccion');
create policy preparador_ver on intentos for select using (mi_rol() = 'preparador' and es_preparador_de(alumno_id));
create policy alumno_ver on intentos for select using (alumno_id = mi_alumno());
create policy direccion_ver on respuestas for select using (mi_rol() = 'direccion');
create policy preparador_ver on respuestas for select using (
  mi_rol() = 'preparador' and exists (select 1 from intentos i where i.id = intento_id and es_preparador_de(i.alumno_id)));
revoke all on intentos, respuestas from anon;

-- Última respuesta de un alumno a cada pregunta (sin contar simulacros a medias, que aún no se corrigen)
create or replace function ultimas_respuestas(p_alumno uuid)
returns table (pregunta_id uuid, acertada boolean)
language sql stable security definer set search_path = public as $$
  select distinct on (r.pregunta_id) r.pregunta_id, r.acertada
  from respuestas r join intentos i on i.id = r.intento_id
  where i.alumno_id = p_alumno and r.acertada is not null
    and (i.terminado_en is not null or i.tipo <> 'simulacro')
  order by r.pregunta_id, r.respondido_en desc nulls last
$$;
revoke execute on function ultimas_respuestas(uuid) from public, anon, authenticated;

create or replace function empezar_test(p_tipo text, p_tema uuid, p_cuantas int, p_minutos int)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_alumno alumnos;
  v_id uuid;
  v_n int;
begin
  select * into v_alumno from alumnos where id = mi_alumno() and activo;
  if not found then raise exception 'Solo los alumnos pueden hacer tests'; end if;
  if p_tipo is null or p_tipo not in ('practica', 'simulacro', 'fallos') then raise exception 'Tipo de test desconocido'; end if;
  insert into intentos (alumno_id, oposicion_id, tipo, tema_id, limite_segundos)
  values (v_alumno.id, v_alumno.oposicion_id, p_tipo, p_tema,
          case when p_tipo = 'simulacro' and p_minutos > 0 then least(p_minutos, 300) * 60 end)
  returning id into v_id;

  insert into respuestas (intento_id, pregunta_id, orden)
  select v_id, q.id, row_number() over ()
  from (
    select p.id from preguntas p
    where p.oposicion_id = v_alumno.oposicion_id and p.activa
      and (p_tema is null or p.tema_id = p_tema)
      and (p_tipo <> 'fallos' or p.id in (select u.pregunta_id from ultimas_respuestas(v_alumno.id) u where not u.acertada))
    order by random()
    limit least(greatest(coalesce(p_cuantas, 10), 1), 200)
  ) q;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'No hay preguntas para este test'; end if;
  update intentos set total = v_n where id = v_id;
  return v_id;
end $$;

-- Las preguntas de un test. La correcta y la explicación solo salen si ya se puede saber:
-- test terminado, o pregunta ya respondida en práctica o repaso.
create or replace function preguntas_de_intento(p_intento uuid)
returns table (pregunta_id uuid, orden int, tema text, enunciado text, opciones text[], elegida smallint, correcta smallint, explicacion text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  i intentos;
begin
  select * into i from intentos where id = p_intento;
  if not found or not coalesce(i.alumno_id = mi_alumno() or mi_rol() = 'direccion' or (mi_rol() = 'preparador' and es_preparador_de(i.alumno_id)), false) then
    raise exception 'No tienes acceso a este test';
  end if;
  return query
  select q.id, r.orden,
         case when t.id is null then null when t.numero is null then t.nombre else t.numero || '. ' || t.nombre end,
         q.enunciado, q.opciones, r.elegida,
         case when i.terminado_en is not null or (i.tipo <> 'simulacro' and r.elegida is not null) then q.correcta end,
         case when i.terminado_en is not null or (i.tipo <> 'simulacro' and r.elegida is not null) then q.explicacion end
  from respuestas r
  join preguntas q on q.id = r.pregunta_id
  left join temas t on t.id = q.tema_id
  where r.intento_id = p_intento
  order by r.orden;
end $$;

-- Guarda una respuesta (null = dejarla en blanco). En práctica y repaso devuelve la correcta al momento
-- y la respuesta ya no se puede cambiar; en simulacro no devuelve nada y se puede cambiar hasta el final.
create or replace function responder(p_intento uuid, p_pregunta uuid, p_elegida smallint)
returns table (correcta smallint, explicacion text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  i intentos;
  r respuestas;
  q preguntas;
begin
  select * into i from intentos where id = p_intento and alumno_id = mi_alumno();
  if not found then raise exception 'No tienes acceso a este test'; end if;
  if i.terminado_en is not null then raise exception 'Este test ya está terminado'; end if;
  if i.limite_segundos is not null and now() > i.empezado_en + make_interval(secs => i.limite_segundos + 60) then
    raise exception 'Se acabó el tiempo';
  end if;
  select * into r from respuestas where intento_id = p_intento and pregunta_id = p_pregunta;
  if not found then raise exception 'Esa pregunta no es de este test'; end if;
  select * into q from preguntas where id = p_pregunta;
  if p_elegida is not null and (p_elegida < 0 or p_elegida >= array_length(q.opciones, 1)) then
    raise exception 'Respuesta no válida';
  end if;
  if i.tipo <> 'simulacro' and r.elegida is not null then raise exception 'Ya respondiste esta pregunta'; end if;

  update respuestas
  set elegida = p_elegida,
      acertada = case when p_elegida is null then null else p_elegida = q.correcta end,
      respondido_en = now()
  where intento_id = p_intento and pregunta_id = p_pregunta;

  if i.tipo <> 'simulacro' and p_elegida is not null then
    return query select q.correcta, q.explicacion;
  end if;
end $$;

-- Cierra el test y pone la nota sobre 10. Cada fallo resta 1 / (respuestas posibles − 1),
-- como en los exámenes oficiales; las preguntas en blanco no suman ni restan.
-- En el simulacro, las que quedan en blanco pasan al repaso de fallos.
create or replace function terminar_test(p_intento uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  i intentos;
begin
  select * into i from intentos where id = p_intento and alumno_id = mi_alumno() for update;
  if not found then raise exception 'No tienes acceso a este test'; end if;
  if i.terminado_en is not null then return; end if;
  if i.tipo = 'simulacro' then
    update respuestas set acertada = false, respondido_en = now() where intento_id = p_intento and elegida is null;
  end if;
  update intentos set
    terminado_en = now(),
    total = c.total,
    aciertos = c.aciertos,
    fallos = c.fallos,
    blancos = c.blancos,
    nota = case when c.total > 0 then round(greatest(c.puntos, 0) * 10 / c.total, 2) end
  from (
    select count(*)::int as total,
           count(*) filter (where r.elegida is not null and r.acertada)::int as aciertos,
           count(*) filter (where r.elegida is not null and not r.acertada)::int as fallos,
           count(*) filter (where r.elegida is null)::int as blancos,
           coalesce(sum(case when r.elegida is null then 0
                             when r.acertada then 1
                             else -1.0 / greatest(array_length(q.opciones, 1) - 1, 1) end), 0) as puntos
    from respuestas r join preguntas q on q.id = r.pregunta_id
    where r.intento_id = p_intento
  ) c
  where id = p_intento;
end $$;

-- Cómo va el alumno en cada tema de su oposición: preguntas en el banco, cuántas ha visto,
-- cuántas domina (la última vez las acertó) y cuántas tiene pendientes de repaso (la última vez falló)
create or replace function mis_temas()
returns table (tema_id uuid, numero int, tema text, en_banco bigint, vistas bigint, dominadas bigint, pendientes bigint)
language sql stable security definer set search_path = public as $$
  select t.id, t.numero, t.nombre,
         count(p.id),
         count(u.pregunta_id),
         count(*) filter (where u.acertada),
         count(*) filter (where not u.acertada)
  from alumnos yo
  join preguntas p on p.oposicion_id = yo.oposicion_id and p.activa
  left join temas t on t.id = p.tema_id
  left join ultimas_respuestas(yo.id) u on u.pregunta_id = p.id
  where yo.id = mi_alumno()
  group by t.id, t.numero, t.nombre
  order by t.numero nulls last, t.nombre nulls last
$$;

revoke execute on function empezar_test(text, uuid, int, int), preguntas_de_intento(uuid), responder(uuid, uuid, smallint),
  terminar_test(uuid), mis_temas() from public, anon;
grant execute on function empezar_test(text, uuid, int, int), preguntas_de_intento(uuid), responder(uuid, uuid, smallint),
  terminar_test(uuid), mis_temas() to authenticated;
