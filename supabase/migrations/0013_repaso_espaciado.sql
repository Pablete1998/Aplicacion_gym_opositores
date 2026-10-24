-- Fase 2: repaso diario tipo Anki con las preguntas del banco.
-- Cada pregunta que el alumno estudia es una tarjeta con su próxima fecha de repaso.
-- El cálculo de la fecha se hace en la app (src/lib/repaso.ts); aquí se guarda.
-- Se puede volver a ejecutar sin problema.

create table if not exists tarjetas (
  alumno_id uuid not null references alumnos on delete cascade,
  pregunta_id uuid not null references preguntas on delete cascade,
  estado text not null default 'aprendiendo' check (estado in ('aprendiendo', 'repaso')),
  paso int not null default 0,                 -- paso de aprendizaje (0 o 1)
  facilidad numeric(4, 2) not null default 2.5 check (facilidad between 1.3 and 5),
  intervalo numeric(6, 2) not null default 0,  -- días entre repasos
  repeticiones int not null default 0,
  lapsos int not null default 0,               -- veces que se olvidó estando ya aprendida
  toca_en timestamptz not null default now(),
  ultima_en timestamptz,
  creada_en timestamptz not null default now(),
  primary key (alumno_id, pregunta_id)
);
create index if not exists tarjetas_toca on tarjetas (alumno_id, toca_en);

-- El alumno no puede leer el banco, así que la comprobación va en una función
create or replace function de_mi_oposicion(p_pregunta uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from preguntas p join alumnos a on a.oposicion_id = p.oposicion_id
                 where p.id = p_pregunta and a.id = mi_alumno())
$$;
revoke execute on function de_mi_oposicion(uuid) from public, anon;
grant execute on function de_mi_oposicion(uuid) to authenticated;

alter table tarjetas enable row level security;
drop policy if exists alumno_propias on tarjetas;
drop policy if exists direccion_ver on tarjetas;
drop policy if exists preparador_ver on tarjetas;
-- El alumno lleva sus tarjetas, solo de preguntas de su oposición
create policy alumno_propias on tarjetas for all
  using (alumno_id = mi_alumno())
  with check (alumno_id = mi_alumno() and de_mi_oposicion(pregunta_id));
create policy direccion_ver on tarjetas for select using (mi_rol() = 'direccion');
create policy preparador_ver on tarjetas for select using (mi_rol() = 'preparador' and es_preparador_de(alumno_id));
revoke all on tarjetas from anon;

-- Las tarjetas de hoy: las que tocan (o tocarán en los próximos 20 minutos, como hace Anki)
-- y hasta p_nuevas preguntas nuevas al día, en orden de temas. Con p_tema, solo de ese tema.
create or replace function repaso_de_hoy(p_nuevas int, p_tema uuid)
returns table (pregunta_id uuid, tema text, enunciado text, opciones text[], correcta smallint, explicacion text,
               nueva boolean, estado text, paso int, facilidad numeric, intervalo numeric, repeticiones int, lapsos int, toca_en timestamptz)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_alumno alumnos;
  v_hoy int;
begin
  select * into v_alumno from alumnos where id = mi_alumno() and activo;
  if not found then raise exception 'Solo los alumnos tienen repaso'; end if;
  -- Nuevas ya empezadas hoy (hora de España)
  select count(*) into v_hoy from tarjetas tj
  where tj.alumno_id = v_alumno.id and (tj.creada_en at time zone 'Europe/Madrid')::date = (now() at time zone 'Europe/Madrid')::date;

  return query
  select q.id,
         case when t.id is null then null when t.numero is null then t.nombre else t.numero || '. ' || t.nombre end,
         q.enunciado, q.opciones, q.correcta, q.explicacion,
         false, tj.estado, tj.paso, tj.facilidad, tj.intervalo, tj.repeticiones, tj.lapsos, tj.toca_en
  from tarjetas tj
  join preguntas q on q.id = tj.pregunta_id and q.activa
  left join temas t on t.id = q.tema_id
  where tj.alumno_id = v_alumno.id and tj.toca_en <= now() + interval '20 minutes'
    and (p_tema is null or q.tema_id = p_tema)
  order by tj.toca_en;

  return query
  select q.id,
         case when t.id is null then null when t.numero is null then t.nombre else t.numero || '. ' || t.nombre end,
         q.enunciado, q.opciones, q.correcta, q.explicacion,
         true, 'aprendiendo'::text, 0, 2.5::numeric, 0::numeric, 0, 0, now()
  from preguntas q
  left join temas t on t.id = q.tema_id
  where q.oposicion_id = v_alumno.oposicion_id and q.activa
    and (p_tema is null or q.tema_id = p_tema)
    and not exists (select 1 from tarjetas tj where tj.alumno_id = v_alumno.id and tj.pregunta_id = q.id)
  order by t.numero nulls last, t.nombre nulls last, q.creado_en
  limit greatest(least(coalesce(p_nuevas, 20), 200) - v_hoy, 0);
end $$;

revoke execute on function repaso_de_hoy(int, uuid) from public, anon;
grant execute on function repaso_de_hoy(int, uuid) to authenticated;
