-- Fase 2: temario por tema (apuntes y esquemas). El texto vive en el repositorio
-- (contenido/temario); aquí solo se apunta quién revisó cada tema y qué versión.
-- Los alumnos solo ven los temas revisados en su versión actual. Se puede volver a ejecutar.

create table if not exists temario_revisiones (
  carpeta text not null check (carpeta ~ '^[a-z0-9-]+$'),
  tema int not null check (tema between 0 and 99),
  version text not null,                       -- la fecha «actualizado» del archivo revisado
  revisado_por uuid references perfiles on delete set null default auth.uid(),
  revisado_en timestamptz not null default now(),
  primary key (carpeta, tema)
);

alter table temario_revisiones enable row level security;
drop policy if exists equipo_todo on temario_revisiones;
drop policy if exists leer on temario_revisiones;
create policy equipo_todo on temario_revisiones for all
  using (mi_rol() in ('direccion', 'preparador')) with check (mi_rol() in ('direccion', 'preparador'));
create policy leer on temario_revisiones for select to authenticated using (con_ficha());
revoke all on temario_revisiones from anon;
