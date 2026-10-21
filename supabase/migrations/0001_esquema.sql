-- Esquema inicial de la fase 1: alumnos, oposiciones configurables, marcas, accesos y avisos.
-- Cada oposición se define como datos (pruebas + baremos), no como código.

create type rol as enum ('direccion', 'preparador', 'alumno', 'recepcion');
create type tipo_prueba as enum ('fisica', 'teorica');
create type unidad as enum ('segundos', 'repeticiones', 'centimetros', 'metros', 'nota');
create type sexo as enum ('H', 'M');

-- Un perfil por usuario de Supabase Auth
create table perfiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null,
  rol rol not null default 'alumno',
  creado_en timestamptz not null default now()
);

create table oposiciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  cuerpo text,
  fecha_examen date,
  activa boolean not null default true
);

create table pruebas (
  id uuid primary key default gen_random_uuid(),
  oposicion_id uuid not null references oposiciones on delete cascade,
  nombre text not null,
  tipo tipo_prueba not null,
  unidad unidad not null,
  mayor_es_mejor boolean not null,
  orden int not null default 0,
  unique (oposicion_id, nombre)
);

-- Marca mínima (apto) y objetivo de la academia, por sexo y tramo de edad
create table baremos (
  id uuid primary key default gen_random_uuid(),
  prueba_id uuid not null references pruebas on delete cascade,
  sexo sexo,                      -- null = igual para ambos
  edad_min int not null default 0,
  edad_max int not null default 120,
  marca_minima numeric not null,
  marca_objetivo numeric,
  check (edad_min <= edad_max)
);

create table grupos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  oposicion_id uuid not null references oposiciones,
  preparador_id uuid references perfiles on delete set null
);

create table alumnos (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid unique references perfiles on delete set null,
  nombre text not null,
  apellidos text not null,
  sexo sexo not null,
  fecha_nacimiento date,
  oposicion_id uuid not null references oposiciones,
  grupo_id uuid references grupos on delete set null,
  cuota_al_dia boolean not null default true,
  codigo_acceso uuid not null unique default gen_random_uuid(),
  consentimiento_rgpd timestamptz,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table resultados (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references alumnos on delete cascade,
  prueba_id uuid not null references pruebas on delete cascade,
  fecha date not null default current_date,
  marca numeric not null,
  registrado_por uuid references perfiles on delete set null default auth.uid(),
  creado_en timestamptz not null default now()
);
create index resultados_alumno_prueba on resultados (alumno_id, prueba_id, fecha);

create table accesos (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid references alumnos on delete cascade,
  momento timestamptz not null default now(),
  permitido boolean not null,
  motivo text
);
create index accesos_momento on accesos (momento desc);

create table avisos (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid references perfiles on delete set null default auth.uid(),
  grupo_id uuid references grupos on delete cascade,   -- null = toda la academia
  texto text not null,
  creado_en timestamptz not null default now()
);

-- ---------- Funciones de ayuda para RLS ----------

create function mi_rol() returns rol
language sql stable security definer set search_path = public as $$
  select rol from perfiles where id = auth.uid()
$$;

create function es_preparador_de(p_alumno uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from alumnos a join grupos g on g.id = a.grupo_id
    where a.id = p_alumno and g.preparador_id = auth.uid()
  )
$$;

create function mi_alumno() returns uuid
language sql stable security definer set search_path = public as $$
  select id from alumnos where perfil_id = auth.uid()
$$;

-- Recepción escanea el QR: registra la entrada y devuelve si puede pasar
create function registrar_acceso(p_codigo uuid)
returns table (nombre text, permitido boolean, motivo text)
language plpgsql security definer set search_path = public as $$
declare
  a alumnos;
  v_permitido boolean;
  v_motivo text;
begin
  if mi_rol() not in ('recepcion', 'direccion') then
    raise exception 'Solo recepción o dirección pueden registrar accesos';
  end if;
  select * into a from alumnos where codigo_acceso = p_codigo;
  if not found then
    insert into accesos (alumno_id, permitido, motivo) values (null, false, 'Código desconocido');
    return query select null::text, false, 'Código desconocido'::text;
    return;
  end if;
  v_permitido := a.activo and a.cuota_al_dia;
  v_motivo := case when not a.activo then 'Alumno de baja'
                   when not a.cuota_al_dia then 'Cuota pendiente' end;
  insert into accesos (alumno_id, permitido, motivo) values (a.id, v_permitido, v_motivo);
  return query select a.nombre || ' ' || a.apellidos, v_permitido, v_motivo;
end $$;

-- Crea el perfil al registrarse un usuario (rol alumno por defecto; dirección lo cambia)
create function crear_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger al_crear_usuario after insert on auth.users
for each row execute function crear_perfil();

-- ---------- Seguridad por filas ----------

alter table perfiles enable row level security;
alter table oposiciones enable row level security;
alter table pruebas enable row level security;
alter table baremos enable row level security;
alter table grupos enable row level security;
alter table alumnos enable row level security;
alter table resultados enable row level security;
alter table accesos enable row level security;
alter table avisos enable row level security;

-- Dirección puede con todo
create policy direccion_todo on perfiles for all using (mi_rol() = 'direccion') with check (mi_rol() = 'direccion');
create policy direccion_todo on oposiciones for all using (mi_rol() = 'direccion') with check (mi_rol() = 'direccion');
create policy direccion_todo on pruebas for all using (mi_rol() = 'direccion') with check (mi_rol() = 'direccion');
create policy direccion_todo on baremos for all using (mi_rol() = 'direccion') with check (mi_rol() = 'direccion');
create policy direccion_todo on grupos for all using (mi_rol() = 'direccion') with check (mi_rol() = 'direccion');
create policy direccion_todo on alumnos for all using (mi_rol() = 'direccion') with check (mi_rol() = 'direccion');
create policy direccion_todo on resultados for all using (mi_rol() = 'direccion') with check (mi_rol() = 'direccion');
create policy direccion_todo on accesos for all using (mi_rol() = 'direccion') with check (mi_rol() = 'direccion');
create policy direccion_todo on avisos for all using (mi_rol() = 'direccion') with check (mi_rol() = 'direccion');

-- Cada usuario ve su propio perfil
create policy ver_propio on perfiles for select using (id = auth.uid());

-- Catálogo visible para cualquier usuario con sesión
create policy leer_catalogo on oposiciones for select to authenticated using (true);
create policy leer_catalogo on pruebas for select to authenticated using (true);
create policy leer_catalogo on baremos for select to authenticated using (true);
create policy leer_catalogo on grupos for select to authenticated using (true);

-- Preparadores: sus alumnos y las marcas de esos alumnos
create policy preparador_ver on alumnos for select using (mi_rol() = 'preparador' and es_preparador_de(id));
create policy preparador_ver on resultados for select using (mi_rol() = 'preparador' and es_preparador_de(alumno_id));
create policy preparador_registrar on resultados for insert with check (mi_rol() = 'preparador' and es_preparador_de(alumno_id));
create policy preparador_avisos on avisos for insert with check (
  mi_rol() = 'preparador' and grupo_id in (select id from grupos where preparador_id = auth.uid()));

-- Alumnos: solo lo suyo
create policy alumno_ver on alumnos for select using (perfil_id = auth.uid());
create policy alumno_ver on resultados for select using (alumno_id = mi_alumno());
create policy alumno_ver on accesos for select using (alumno_id = mi_alumno());

-- Avisos: dirección y preparadores ven todos; el alumno, los generales y los de su grupo
create policy leer_avisos on avisos for select using (
  mi_rol() in ('direccion', 'preparador')
  or grupo_id is null
  or grupo_id = (select grupo_id from alumnos where id = mi_alumno()));
