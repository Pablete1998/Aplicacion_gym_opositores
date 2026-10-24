-- Fase 2: banco de preguntas tipo test por oposición y tema.
-- Dirección y preparadores dan de alta las preguntas (una a una o pegadas desde Excel).
-- Los alumnos aún no leen esta tabla: cuando puedan hacer tests, les llegarán las preguntas por
-- una función que no enseña la respuesta correcta hasta que contesten.
-- Se puede volver a ejecutar sin problema.

create table if not exists temas (
  id uuid primary key default gen_random_uuid(),
  oposicion_id uuid not null references oposiciones on delete cascade,
  numero int,
  nombre text not null check (char_length(trim(nombre)) between 1 and 200),
  creado_en timestamptz not null default now(),
  unique (oposicion_id, nombre)
);

create table if not exists preguntas (
  id uuid primary key default gen_random_uuid(),
  oposicion_id uuid not null references oposiciones on delete cascade,
  tema_id uuid references temas on delete set null,
  enunciado text not null check (char_length(trim(enunciado)) between 1 and 2000),
  -- De 2 a 4 respuestas; la correcta es su posición empezando en 0 (A = 0, B = 1…)
  opciones text[] not null check (array_length(opciones, 1) between 2 and 4),
  correcta smallint not null check (correcta >= 0 and correcta < array_length(opciones, 1)),
  explicacion text check (char_length(explicacion) <= 2000),
  activa boolean not null default true,
  creado_por uuid references perfiles on delete set null default auth.uid(),
  creado_en timestamptz not null default now()
);
create index if not exists preguntas_oposicion_tema on preguntas (oposicion_id, tema_id);

alter table temas enable row level security;
alter table preguntas enable row level security;

-- Dirección y preparadores pueden con todo el banco
drop policy if exists equipo_todo on temas;
drop policy if exists equipo_todo on preguntas;
create policy equipo_todo on temas for all
  using (mi_rol() in ('direccion', 'preparador')) with check (mi_rol() in ('direccion', 'preparador'));
create policy equipo_todo on preguntas for all
  using (mi_rol() in ('direccion', 'preparador')) with check (mi_rol() in ('direccion', 'preparador'));

-- Los temas (solo el índice, sin preguntas) los ve cualquier usuario con ficha
drop policy if exists leer_temas on temas;
create policy leer_temas on temas for select to authenticated using (con_ficha());

revoke all on temas, preguntas from anon;

-- Cuántas preguntas hay en cada tema de una oposición (tema null = sin tema).
-- Se ejecuta con los permisos de quien la llama, así que solo cuenta lo que esa persona puede ver.
create or replace function resumen_banco(p_oposicion uuid)
returns table (tema_id uuid, total bigint, activas bigint)
language sql stable set search_path = public as $$
  select tema_id, count(*), count(*) filter (where activa)
  from preguntas where oposicion_id = p_oposicion
  group by tema_id
$$;
revoke execute on function resumen_banco(uuid) from public, anon;
grant execute on function resumen_banco(uuid) to authenticated;
