-- Fase 2: banco común a todas las oposiciones (psicotécnicos, ortografía…) e imágenes en las preguntas.
-- Una pregunta o un tema sin oposición (oposicion_id nulo) es común: lo ven los alumnos de todas.
-- Las imágenes se guardan en el almacén privado «preguntas» de Supabase y la app las sirve a quien
-- tenga sesión. Se puede volver a ejecutar sin problema.

alter table temas alter column oposicion_id drop not null;
alter table preguntas alter column oposicion_id drop not null;
create unique index if not exists temas_comun_nombre on temas (nombre) where oposicion_id is null;

-- Ruta de la imagen dentro del almacén «preguntas» (por ejemplo «3f2a….png»)
alter table preguntas add column if not exists imagen text check (imagen ~ '^[0-9a-f-]{36}\.(png|jpg|webp|gif)$');

-- ---------- Almacén de imágenes ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('preguntas', 'preguntas', false, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

drop policy if exists "preguntas: equipo" on storage.objects;
drop policy if exists "preguntas: leer" on storage.objects;
create policy "preguntas: equipo" on storage.objects for all to authenticated
  using (bucket_id = 'preguntas' and public.mi_rol() in ('direccion', 'preparador'))
  with check (bucket_id = 'preguntas' and public.mi_rol() in ('direccion', 'preparador'));
create policy "preguntas: leer" on storage.objects for select to authenticated
  using (bucket_id = 'preguntas' and public.con_ficha());

-- ---------- Funciones que cambian ----------

create or replace function resumen_banco(p_oposicion uuid)
returns table (tema_id uuid, total bigint, activas bigint)
language sql stable set search_path = public as $$
  select tema_id, count(*), count(*) filter (where activa)
  from preguntas where oposicion_id is not distinct from p_oposicion
  group by tema_id
$$;

create or replace function de_mi_oposicion(p_pregunta uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from preguntas p join alumnos a on a.id = mi_alumno()
                 where p.id = p_pregunta and (p.oposicion_id = a.oposicion_id or p.oposicion_id is null))
$$;

-- Con p_comun, del banco común. Sin tema ni p_comun, solo de su oposición (el repaso de fallos, de ambos).
drop function if exists empezar_test(text, uuid, int, int);
create or replace function empezar_test(p_tipo text, p_tema uuid, p_cuantas int, p_minutos int, p_comun boolean default false)
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
    where p.activa
      and case
        when p_tema is not null then p.tema_id = p_tema and (p.oposicion_id = v_alumno.oposicion_id or p.oposicion_id is null)
        when coalesce(p_comun, false) then p.oposicion_id is null
        when p_tipo = 'fallos' then p.oposicion_id = v_alumno.oposicion_id or p.oposicion_id is null
        else p.oposicion_id = v_alumno.oposicion_id
      end
      and (p_tipo <> 'fallos' or p.id in (select u.pregunta_id from ultimas_respuestas(v_alumno.id) u where not u.acertada))
    order by random()
    limit least(greatest(coalesce(p_cuantas, 10), 1), 200)
  ) q;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'No hay preguntas para este test'; end if;
  update intentos set total = v_n where id = v_id;
  return v_id;
end $$;

drop function if exists preguntas_de_intento(uuid);
create function preguntas_de_intento(p_intento uuid)
returns table (pregunta_id uuid, orden int, tema text, enunciado text, opciones text[], imagen text, elegida smallint, correcta smallint, explicacion text)
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
         q.enunciado, q.opciones, q.imagen, r.elegida,
         case when i.terminado_en is not null or (i.tipo <> 'simulacro' and r.elegida is not null) then q.correcta end,
         case when i.terminado_en is not null or (i.tipo <> 'simulacro' and r.elegida is not null) then q.explicacion end
  from respuestas r
  join preguntas q on q.id = r.pregunta_id
  left join temas t on t.id = q.tema_id
  where r.intento_id = p_intento
  order by r.orden;
end $$;

-- Ahora también cuenta los temas del banco común (comun = verdadero)
drop function if exists mis_temas();
create function mis_temas()
returns table (tema_id uuid, numero int, tema text, comun boolean, en_banco bigint, vistas bigint, dominadas bigint, pendientes bigint)
language sql stable security definer set search_path = public as $$
  select t.id, t.numero, t.nombre, p.oposicion_id is null,
         count(p.id),
         count(u.pregunta_id),
         count(*) filter (where u.acertada),
         count(*) filter (where not u.acertada)
  from alumnos yo
  join preguntas p on (p.oposicion_id = yo.oposicion_id or p.oposicion_id is null) and p.activa
  left join temas t on t.id = p.tema_id
  left join ultimas_respuestas(yo.id) u on u.pregunta_id = p.id
  where yo.id = mi_alumno()
  group by t.id, t.numero, t.nombre, p.oposicion_id is null
  order by p.oposicion_id is null, t.numero nulls last, t.nombre nulls last
$$;

-- El repaso diario: con p_comun o con un tema común, saca las nuevas del banco común
drop function if exists repaso_de_hoy(int, uuid);
create or replace function repaso_de_hoy(p_nuevas int, p_tema uuid, p_comun boolean default false)
returns table (pregunta_id uuid, tema text, enunciado text, opciones text[], imagen text, correcta smallint, explicacion text,
               nueva boolean, estado text, paso int, facilidad numeric, intervalo numeric, repeticiones int, lapsos int, toca_en timestamptz)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_alumno alumnos;
  v_hoy int;
begin
  select * into v_alumno from alumnos where id = mi_alumno() and activo;
  if not found then raise exception 'Solo los alumnos tienen repaso'; end if;
  select count(*) into v_hoy from tarjetas tj
  where tj.alumno_id = v_alumno.id and (tj.creada_en at time zone 'Europe/Madrid')::date = (now() at time zone 'Europe/Madrid')::date;

  return query
  select q.id,
         case when t.id is null then null when t.numero is null then t.nombre else t.numero || '. ' || t.nombre end,
         q.enunciado, q.opciones, q.imagen, q.correcta, q.explicacion,
         false, tj.estado, tj.paso, tj.facilidad, tj.intervalo, tj.repeticiones, tj.lapsos, tj.toca_en
  from tarjetas tj
  join preguntas q on q.id = tj.pregunta_id and q.activa
  left join temas t on t.id = q.tema_id
  where tj.alumno_id = v_alumno.id and tj.toca_en <= now() + interval '20 minutes'
    and case when p_tema is not null then q.tema_id = p_tema
             when coalesce(p_comun, false) then q.oposicion_id is null
             else true end
  order by tj.toca_en;

  return query
  select q.id,
         case when t.id is null then null when t.numero is null then t.nombre else t.numero || '. ' || t.nombre end,
         q.enunciado, q.opciones, q.imagen, q.correcta, q.explicacion,
         true, 'aprendiendo'::text, 0, 2.5::numeric, 0::numeric, 0, 0, now()
  from preguntas q
  left join temas t on t.id = q.tema_id
  where q.activa
    and case when p_tema is not null then q.tema_id = p_tema and (q.oposicion_id = v_alumno.oposicion_id or q.oposicion_id is null)
             when coalesce(p_comun, false) then q.oposicion_id is null
             else q.oposicion_id = v_alumno.oposicion_id end
    and not exists (select 1 from tarjetas tj where tj.alumno_id = v_alumno.id and tj.pregunta_id = q.id)
  order by t.numero nulls last, t.nombre nulls last, q.creado_en
  limit greatest(least(coalesce(p_nuevas, 20), 200) - v_hoy, 0);
end $$;

revoke execute on function empezar_test(text, uuid, int, int, boolean), preguntas_de_intento(uuid), mis_temas(),
  repaso_de_hoy(int, uuid, boolean) from public, anon;
grant execute on function empezar_test(text, uuid, int, int, boolean), preguntas_de_intento(uuid), mis_temas(),
  repaso_de_hoy(int, uuid, boolean) to authenticated;
